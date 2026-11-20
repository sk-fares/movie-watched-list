import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const CURATED_FRANCHISE_PRESETS = [
  {
    name: "Mission: Impossible",
    tmdbCollectionId: 87359,
    category: "Action & Spy",
    parts: [
      { tmdbId: 954, title: "Mission: Impossible", releaseDate: "1996-05-22" },
      { tmdbId: 955, title: "Mission: Impossible II", releaseDate: "2000-05-24" },
      { tmdbId: 956, title: "Mission: Impossible III", releaseDate: "2006-05-03" },
      { tmdbId: 56292, title: "Mission: Impossible – Ghost Protocol", releaseDate: "2011-12-07" },
      { tmdbId: 177677, title: "Mission: Impossible – Rogue Nation", releaseDate: "2015-07-23" },
      { tmdbId: 353081, title: "Mission: Impossible – Fallout", releaseDate: "2018-07-13" },
      { tmdbId: 575264, title: "Mission: Impossible – Dead Reckoning Part One", releaseDate: "2023-07-08" },
      { tmdbId: 575265, title: "Mission: Impossible – The Final Reckoning", releaseDate: "2025-05-21" },
    ],
  },
  {
    name: "Resident Evil",
    tmdbCollectionId: 268,
    category: "Live-Action & Animated",
    parts: [
      { tmdbId: 107, title: "Resident Evil", releaseDate: "2002-03-15", sub: "Live-Action" },
      { tmdbId: 108, title: "Resident Evil: Apocalypse", releaseDate: "2004-09-10", sub: "Live-Action" },
      { tmdbId: 109, title: "Resident Evil: Extinction", releaseDate: "2007-09-20", sub: "Live-Action" },
      { tmdbId: 13576, title: "Resident Evil: Degeneration", releaseDate: "2008-10-18", sub: "CGI Animated" },
      { tmdbId: 35791, title: "Resident Evil: Afterlife", releaseDate: "2010-09-09", sub: "Live-Action" },
      { tmdbId: 72545, title: "Resident Evil: Damnation", releaseDate: "2012-09-15", sub: "CGI Animated" },
      { tmdbId: 6479, title: "Resident Evil: Retribution", releaseDate: "2012-09-12", sub: "Live-Action" },
      { tmdbId: 173756, title: "Resident Evil: The Final Chapter", releaseDate: "2016-12-23", sub: "Live-Action" },
      { tmdbId: 433356, title: "Resident Evil: Vendetta", releaseDate: "2017-05-27", sub: "CGI Animated" },
      { tmdbId: 460458, title: "Resident Evil: Welcome to Raccoon City", releaseDate: "2021-11-24", sub: "Reboot" },
      { tmdbId: 1083862, title: "Resident Evil: Death Island", releaseDate: "2023-07-07", sub: "CGI Animated" },
      { tmdbId: 124905, title: "Resident Evil (Zach Cregger reboot)", releaseDate: "2026-10-01", sub: "Reboot" },
    ],
  },
  {
    name: "Fast & Furious",
    tmdbCollectionId: 9485,
    category: "Action & Racing",
    parts: [
      { tmdbId: 9799, title: "The Fast and the Furious", releaseDate: "2001-06-22" },
      { tmdbId: 584, title: "2 Fast 2 Furious", releaseDate: "2003-06-05" },
      { tmdbId: 9615, title: "The Fast and the Furious: Tokyo Drift", releaseDate: "2006-06-03" },
      { tmdbId: 13804, title: "Fast & Furious", releaseDate: "2009-04-02" },
      { tmdbId: 51497, title: "Fast Five", releaseDate: "2011-04-20" },
      { tmdbId: 82992, title: "Fast & Furious 6", releaseDate: "2013-05-21" },
      { tmdbId: 168259, title: "Furious 7", releaseDate: "2015-04-01" },
      { tmdbId: 337339, title: "The Fate of the Furious", releaseDate: "2017-04-12" },
      { tmdbId: 384018, title: "Fast & Furious Presents: Hobbs & Shaw", releaseDate: "2019-07-31" },
      { tmdbId: 385128, title: "F9: The Fast Saga", releaseDate: "2021-05-19" },
      { tmdbId: 385687, title: "Fast X", releaseDate: "2023-05-17" },
    ],
  },
];

async function syncMovieSeriesScript() {
  console.log("=================================================");
  console.log("🎬 RUNNING MOVIE SERIES SEQUENCE DETECTOR SCRIPT");
  console.log("=================================================\n");

  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  if (users.length === 0) {
    console.log("No users found in database.");
    return;
  }

  for (const user of users) {
    console.log(`Processing User: ${user.name || user.email} (${user.id})`);

    // Fetch user's watched movies
    const watched = await prisma.watchedItem.findMany({
      where: { userId: user.id, contentType: "movie" },
      select: { tmdbId: true, title: true, releaseDate: true, watchedDate: true },
    });
    console.log(`User has watched ${watched.length} movies.\n`);

    const watchedMap = new Map(watched.map((w) => [w.tmdbId, w]));

    // Check curated presets
    for (const preset of CURATED_FRANCHISE_PRESETS) {
      // Find existing franchise by tmdbCollectionId or name
      let franchise = await prisma.franchise.findFirst({
        where: {
          userId: user.id,
          OR: [
            preset.tmdbCollectionId ? { tmdbCollectionId: preset.tmdbCollectionId } : {},
            { name: { contains: preset.name, mode: "insensitive" } },
          ],
        },
        include: { entries: true },
      });

      const sortedParts = [...preset.parts].sort((a, b) =>
        (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999")
      );

      const watchedParts = sortedParts.filter((p) => watchedMap.has(p.tmdbId));

      console.log(`📌 Franchise: ${preset.name} (${preset.category})`);
      console.log(`   Progress: ${watchedParts.length} of ${sortedParts.length} films watched`);

      if (watchedParts.length > 0 || franchise) {
        if (!franchise) {
          franchise = await prisma.franchise.create({
            data: {
              userId: user.id,
              name: preset.name,
              tmdbCollectionId: preset.tmdbCollectionId || null,
            },
            include: { entries: true },
          });
        }

        // Upsert entries in sequence order
        for (let i = 0; i < sortedParts.length; i++) {
          const part = sortedParts[i];
          const seq = i + 1;
          const isWatched = watchedMap.has(part.tmdbId);
          const wItem = watchedMap.get(part.tmdbId);

          await prisma.franchiseEntry.upsert({
            where: {
              franchiseId_sequenceNumber: {
                franchiseId: franchise.id,
                sequenceNumber: seq,
              },
            },
            update: {
              title: part.title,
              releaseDate: part.releaseDate,
              watched: isWatched,
              watchedDate: isWatched ? wItem?.watchedDate : null,
            },
            create: {
              franchiseId: franchise.id,
              sequenceNumber: seq,
              tmdbId: part.tmdbId,
              title: part.title,
              releaseDate: part.releaseDate,
              watched: isWatched,
              watchedDate: isWatched ? wItem?.watchedDate : null,
              userId: user.id,
            },
          });
        }
      }

      // Print sequential listing
      sortedParts.forEach((part, index) => {
        const isWatched = watchedMap.has(part.tmdbId);
        const icon = isWatched ? "✅ [WATCHED]" : "⏳ [UNWATCHED]";
        const year = part.releaseDate ? `(${part.releaseDate.slice(0, 4)})` : "";
        console.log(`   ${icon} #${index + 1} ${part.title} ${year}`);
      });
      console.log("");
    }

    // Now display all user franchises with their sequences
    const allFranchises = await prisma.franchise.findMany({
      where: { userId: user.id },
      include: {
        entries: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    console.log("=================================================");
    console.log(`📚 ALL SEQUENCED MOVIE SERIES IN USER'S VAULT (${allFranchises.length}):`);
    console.log("=================================================");

    for (const f of allFranchises) {
      const watchedCount = f.entries.filter((e) => e.watched).length;
      if (watchedCount > 0) {
        console.log(`\n▶ [${f.name}] (${f.entries.length} Films • ${watchedCount} Watched)`);
        for (const e of f.entries) {
          const status = e.watched ? "✅ WATCHED" : "⚪ Unwatched";
          const yr = e.releaseDate ? `(${e.releaseDate.slice(0, 4)})` : "";
          console.log(`    #${e.sequenceNumber} ${e.title} ${yr} — ${status}`);
        }
      }
    }
  }

  console.log("\n✨ Movie series sequence detection and sync complete!");
}

syncMovieSeriesScript()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
