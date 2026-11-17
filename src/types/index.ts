export interface ContentItem {
  id: string;
  tmdbId: number;
  contentType: "movie" | "tvshow" | "season" | "episode";
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genres: string | null;
  runtime?: number | null;
}

export interface WatchlistItemType extends ContentItem {
  addedAt: string;
  priority: number;
  notes: string | null;
}

export interface WatchedItemType extends ContentItem {
  watchedDate: string;
  chronoPosition: number;
  franchiseId?: string | null;
  franchiseSeq?: number | null;
  userRating?: number | null;
  notes: string | null;
}

export interface FranchiseType {
  id: string;
  name: string;
  tmdbCollectionId: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  entries: FranchiseEntryType[];
}

export interface FranchiseEntryType {
  id: string;
  tmdbId: number;
  title: string;
  sequenceNumber: number;
  releaseDate: string | null;
  posterPath: string | null;
  watched: boolean;
  watchedDate: string | null;
  contentType: string;
}

export interface DashboardStats {
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  totalWatchlistItems: number;
  totalWatchTime: number;
  recentlyWatched: WatchedItemType[];
  recentlyAdded: WatchlistItemType[];
  favoriteGenres: { name: string; count: number }[];
}

export interface UserSession {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}
