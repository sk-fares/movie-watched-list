import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

// ─── GET /api/franchise/[id] ────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const franchiseId = params.id;

    const franchise = await prisma.franchise.findFirst({
      where: {
        id: franchiseId,
        userId,
      },
      include: {
        entries: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      );
    }

    const totalEntries = franchise.entries.length;
    const watchedCount = franchise.entries.filter((e) => e.watched).length;
    const progressPercentage =
      totalEntries > 0 ? Math.round((watchedCount / totalEntries) * 100) : 0;
    const nextUnwatched = franchise.entries.find((e) => !e.watched) || null;
    const isCompleted = totalEntries > 0 && watchedCount === totalEntries;

    return NextResponse.json({
      success: true,
      franchise: {
        id: franchise.id,
        tmdbCollectionId: franchise.tmdbCollectionId,
        name: franchise.name,
        overview: franchise.overview,
        posterPath: franchise.posterPath,
        backdropPath: franchise.backdropPath,
        userId: franchise.userId,
        createdAt: franchise.createdAt.toISOString(),
        updatedAt: franchise.updatedAt.toISOString(),
        totalEntries,
        watchedCount,
        progressPercentage,
        isCompleted,
        nextUnwatched: nextUnwatched
          ? {
              id: nextUnwatched.id,
              sequenceNumber: nextUnwatched.sequenceNumber,
              tmdbId: nextUnwatched.tmdbId,
              title: nextUnwatched.title,
              releaseDate: nextUnwatched.releaseDate,
              posterPath: nextUnwatched.posterPath,
            }
          : null,
        entries: franchise.entries.map((entry) => ({
          id: entry.id,
          franchiseId: entry.franchiseId,
          sequenceNumber: entry.sequenceNumber,
          contentType: entry.contentType,
          tmdbId: entry.tmdbId,
          title: entry.title,
          releaseDate: entry.releaseDate,
          posterPath: entry.posterPath,
          watched: entry.watched,
          watchedDate: entry.watchedDate ? entry.watchedDate.toISOString() : null,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    console.error(`GET /api/franchise/${params.id} error:`, error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT / PATCH /api/franchise/[id] ───────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const franchiseId = params.id;

    // Verify ownership
    const franchise = await prisma.franchise.findFirst({
      where: { id: franchiseId, userId },
      include: { entries: true },
    });

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action = "toggle_watched", entryId, watched, entries, entry, name, overview, posterPath, backdropPath } = body;

    // 1. Toggle watched status for a single entry
    if (action === "toggle_watched" || entryId !== undefined) {
      if (!entryId) {
        return NextResponse.json(
          { error: "entryId is required to toggle watched status" },
          { status: 400 }
        );
      }

      const targetEntry = franchise.entries.find((e) => e.id === entryId);
      if (!targetEntry) {
        return NextResponse.json(
          { error: "Entry not found in this franchise" },
          { status: 404 }
        );
      }

      const newWatchedState = watched !== undefined ? Boolean(watched) : !targetEntry.watched;
      const watchedDate = newWatchedState ? new Date() : null;

      // Update franchise entry
      const updatedEntry = await prisma.franchiseEntry.update({
        where: { id: entryId },
        data: {
          watched: newWatchedState,
          watchedDate,
        },
      });

      // Synchronize with watched items history
      if (newWatchedState) {
        // Find highest chronoPosition to increment
        const maxChrono = await prisma.watchedItem.aggregate({
          where: { userId },
          _max: { chronoPosition: true },
        });
        const nextChrono = (maxChrono._max.chronoPosition ?? 0) + 1;

        await prisma.watchedItem.upsert({
          where: {
            userId_contentType_tmdbId: {
              userId,
              contentType: targetEntry.contentType,
              tmdbId: targetEntry.tmdbId,
            },
          },
          update: {
            title: targetEntry.title,
            posterPath: targetEntry.posterPath,
            releaseDate: targetEntry.releaseDate,
            watchedDate: new Date(),
            franchiseId: franchise.id,
            franchiseSeq: targetEntry.sequenceNumber,
          },
          create: {
            userId,
            contentType: targetEntry.contentType,
            tmdbId: targetEntry.tmdbId,
            title: targetEntry.title,
            posterPath: targetEntry.posterPath,
            releaseDate: targetEntry.releaseDate,
            watchedDate: new Date(),
            chronoPosition: nextChrono,
            franchiseId: franchise.id,
            franchiseSeq: targetEntry.sequenceNumber,
          },
        });
      } else {
        // If unmarking as watched, remove from watched items history
        await prisma.watchedItem.deleteMany({
          where: {
            userId,
            contentType: targetEntry.contentType,
            tmdbId: targetEntry.tmdbId,
          },
        });
      }

      // Update franchise timestamp
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `Marked "${targetEntry.title}" as ${newWatchedState ? "watched" : "unwatched"}.`,
        entry: updatedEntry,
      });
    }

    // 2. Reorder entries
    if (action === "reorder" && Array.isArray(entries)) {
      // entries: Array<{ id: string, sequenceNumber: number }>
      await prisma.$transaction(
        entries.map((item) =>
          prisma.franchiseEntry.update({
            where: { id: item.id },
            data: { sequenceNumber: item.sequenceNumber },
          })
        )
      );

      await prisma.franchise.update({
        where: { id: franchiseId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Franchise sequence reordered successfully.",
      });
    }

    // 3. Add a new entry to the franchise
    if (action === "add_entry" && entry) {
      const maxSeq = franchise.entries.reduce(
        (max, e) => Math.max(max, e.sequenceNumber),
        0
      );
      const newSeq = entry.sequenceNumber ?? maxSeq + 1;

      const createdEntry = await prisma.franchiseEntry.create({
        data: {
          franchiseId,
          userId,
          sequenceNumber: newSeq,
          contentType: entry.contentType || "movie",
          tmdbId: Number(entry.tmdbId),
          title: entry.title,
          releaseDate: entry.releaseDate || null,
          posterPath: entry.posterPath || null,
          watched: Boolean(entry.watched),
          watchedDate: entry.watched ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Added "${createdEntry.title}" to ${franchise.name}.`,
        entry: createdEntry,
      });
    }

    // 4. Delete an entry from the franchise
    if (action === "delete_entry" && body.targetEntryId) {
      await prisma.franchiseEntry.delete({
        where: { id: body.targetEntryId },
      });

      return NextResponse.json({
        success: true,
        message: "Entry removed from franchise.",
      });
    }

    // 5. Update franchise metadata (name, overview, posters)
    if (action === "update_metadata" || name !== undefined) {
      const updated = await prisma.franchise.update({
        where: { id: franchiseId },
        data: {
          name: name ? name.trim() : franchise.name,
          overview: overview !== undefined ? overview : franchise.overview,
          posterPath: posterPath !== undefined ? posterPath : franchise.posterPath,
          backdropPath: backdropPath !== undefined ? backdropPath : franchise.backdropPath,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Franchise details updated.",
        franchise: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error(`PUT /api/franchise/${params.id} error:`, error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/franchise/[id] ─────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);
    const franchiseId = params.id;

    // Verify ownership
    const franchise = await prisma.franchise.findFirst({
      where: { id: franchiseId, userId },
    });

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found or unauthorized" },
        { status: 404 }
      );
    }

    // Cascade deletion of franchise entries handled by schema onDelete: Cascade
    await prisma.franchise.delete({
      where: { id: franchiseId },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted franchise "${franchise.name}".`,
    });
  } catch (error: any) {
    console.error(`DELETE /api/franchise/${params.id} error:`, error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
