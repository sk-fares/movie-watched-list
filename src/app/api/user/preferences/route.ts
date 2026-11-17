import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        preferences: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("GET /api/user/preferences error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    const body = await req.json();
    const { name, theme, favoriteGenres, defaultContentType, enableNotifications } = body;

    // Update User profile
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }

    // Upsert User Preferences
    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        theme: theme || undefined,
        favoriteGenres: favoriteGenres
          ? typeof favoriteGenres === "string"
            ? favoriteGenres
            : JSON.stringify(favoriteGenres)
          : undefined,
        defaultContentType: defaultContentType || undefined,
        enableNotifications:
          enableNotifications !== undefined ? Boolean(enableNotifications) : undefined,
      },
      create: {
        userId,
        theme: theme || "dark",
        favoriteGenres: favoriteGenres
          ? typeof favoriteGenres === "string"
            ? favoriteGenres
            : JSON.stringify(favoriteGenres)
          : null,
        defaultContentType: defaultContentType || "all",
        enableNotifications:
          enableNotifications !== undefined ? Boolean(enableNotifications) : true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error: any) {
    console.error("PUT /api/user/preferences error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
