export interface Movie {
  id: string;
  title: string;
  originalTitle: string;
  year: number;
  genres: string[];
  duration: number; // in minutes
  rating: number; // e.g. 8.6
  description: string;
  tags: string[]; // Ukrainian descriptive tags
  emojis: string[]; // mood emojis associated with movie
  streaming: ("Netflix" | "Megogo" | "Sweet.tv" | "Apple TV")[];
  hasUkDub: boolean;
  isUkrainian: boolean;
  isHiddenGem: boolean;
  triggers: ("violence" | "tragic-ending" | "animal-death")[]; // for anti-preferences
  posterUrl: string;
}

export interface RoomSession {
  id: string; // 4-char code
  createdBy: string; // username/client ID
  users: { id: string; name: string }[];
  movies: string[]; // list of movie IDs to swipe
  swipes: {
    [userId: string]: {
      [movieId: string]: "like" | "dislike";
    };
  };
  matches: string[]; // movie IDs that matched
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  recommendedMovies?: Movie[];
}

export interface MovieChallenge {
  id: string;
  title: string;
  description: string;
  badgeCode: string; // e.g., 'cineaste', 'patriot'
  icon: string; // Lucide icon name
  requirements: {
    count: number;
    genre?: string;
    isUkrainian?: boolean;
    hasUkDub?: boolean;
    isGem?: boolean;
  };
  progress: number;
  completed: boolean;
}
