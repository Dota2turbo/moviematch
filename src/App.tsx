import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  X,
  Sparkles,
  Dices,
  Layers,
  Check,
  ExternalLink,
  Users,
  Award,
  SlidersHorizontal,
  Trash2,
  Tv,
  Eye,
  Info,
  Bookmark,
  ChevronDown,
  Filter
} from "lucide-react";

import { MovieCard } from "./components/MovieCard";
import { EmojiFilter } from "./components/EmojiFilter";
import { DuetWidget } from "./components/DuetWidget";
import { AiConcierge } from "./components/AiConcierge";
import { ChallengeBadge } from "./components/ChallengeBadge";
import { RecommendationsWidget } from "./components/RecommendationsWidget";

import { INITIAL_MOVIES, INITIAL_CHALLENGES } from "./data";
import { Movie, ChatMessage, RoomSession, MovieChallenge } from "./types";

export default function App() {
  // Generate random stable user ID
  const [myUserId] = useState(() => {
    let uid = localStorage.getItem("moviematch_uid");
    if (!uid) {
      uid = "u_" + Math.random().toString(36).substring(4);
      localStorage.setItem("moviematch_uid", uid);
    }
    return uid;
  });

  // Movie collections
  const [moviesDb, setMoviesDb] = useState<Movie[]>(() => {
    const localDb = localStorage.getItem("moviematch_custom_db");
    if (localDb) {
      try { return JSON.parse(localDb); } catch (e) {}
    }
    return INITIAL_MOVIES;
  });

  // Client-side swipe history lists
  const [likedMovies, setLikedMovies] = useState<Movie[]>(() => {
    const localLikes = localStorage.getItem("moviematch_likes");
    return localLikes ? JSON.parse(localLikes) : [];
  });

  const [swipedMovieIds, setSwipedMovieIds] = useState<string[]>(() => {
    const localSwiped = localStorage.getItem("moviematch_swiped");
    return localSwiped ? JSON.parse(localSwiped) : [];
  });

  // Active UI filters
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<"all" | "short" | "standard" | "epic" | "relax">("all");
  const [antiTriggers, setAntiTriggers] = useState<("violence" | "tragic-ending" | "animal-death")[]>([]);
  const [onlyUkrainian, setOnlyUkrainian] = useState(false);
  const [onlyWithDub, setOnlyWithDub] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [releaseEra, setReleaseEra] = useState<string>("all");
  const [streamingPlatform, setStreamingPlatform] = useState<string>("all");

  // Gamification Challenges
  const [challenges, setChallenges] = useState<MovieChallenge[]>(INITIAL_CHALLENGES);

  // Active Multi-user Duet Room
  const [activeRoom, setActiveRoom] = useState<RoomSession | null>(null);

  // AI Assistant active dialog state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Tinder active card pointer index
  const [currentDeckIndex, setCurrentDeckIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  // Independent Watchlist ("Подивитись пізніше") with persistency
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    const localWatchlist = localStorage.getItem("moviematch_watchlist");
    return localWatchlist ? JSON.parse(localWatchlist) : [];
  });
  const [watchlistGenreFilter, setWatchlistGenreFilter] = useState<string>("all");
  const [activePlaylistTab, setActivePlaylistTab] = useState<"likes" | "watchlist">("likes");

  // Active overlay modes
  const [matchModalMovie, setMatchModalMovie] = useState<Movie | null>(null);
  const [rouletteMovie, setRouletteMovie] = useState<Movie | null>(null);
  const [isSpinningRoulette, setIsSpinningRoulette] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto-sync databases to local storage
  useEffect(() => {
    localStorage.setItem("moviematch_custom_db", JSON.stringify(moviesDb));
  }, [moviesDb]);

  useEffect(() => {
    localStorage.setItem("moviematch_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("moviematch_likes", JSON.stringify(likedMovies));
  }, [likedMovies]);

  useEffect(() => {
    localStorage.setItem("moviematch_swiped", JSON.stringify(swipedMovieIds));
  }, [swipedMovieIds]);

  // Recalculate challenges completions
  useEffect(() => {
    const updated = challenges.map((chal) => {
      let count = 0;
      if (chal.id === "challenge-patriot") {
        count = likedMovies.filter((m) => m.isUkrainian).length;
      } else if (chal.id === "challenge-cineaste") {
        count = likedMovies.filter((m) => m.rating >= 8.2).length;
      } else if (chal.id === "challenge-goldhunter") {
        count = likedMovies.filter((m) => m.isHiddenGem).length;
      }
      return {
        ...chal,
        progress: count,
        completed: count >= chal.requirements.count,
      };
    });
    setChallenges(updated);
  }, [likedMovies]);

  // Handle live room status to detect incoming mutual matches
  useEffect(() => {
    if (!activeRoom) return;

    // Look for new shared matches in room.matches that we have liked myself
    const myLikes = likedMovies.map((m) => m.id);
    const matchedMovieId = activeRoom.matches.find((mid) => myLikes.includes(mid));
    
    if (matchedMovieId && (!matchModalMovie || matchModalMovie.id !== matchedMovieId)) {
      const matchDetails = moviesDb.find((m) => m.id === matchedMovieId);
      if (matchDetails) {
        setMatchModalMovie(matchDetails);
      }
    }
  }, [activeRoom?.matches, likedMovies, moviesDb]);

  // Append new AI custom formulated movies
  const handleAppendMovies = (newMovies: Movie[]) => {
    // Avoid duplicates
    const filteredNew = newMovies.filter(
      (newM) => !moviesDb.some((existing) => existing.id === newM.id)
    );
    if (filteredNew.length > 0) {
      setMoviesDb((prev) => [...prev, ...filteredNew]);
      showNotification(`✨ AI додав ${filteredNew.length} нових фільмів до свайп-кола!`);
      // Focus tinder immediately to show these cards
      setCurrentDeckIndex(0);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Compute deck matching current active UI filter constraints (excluding swiped history)
  const matchingMoviesWithFilters = moviesDb.filter((movie) => {
    // 1. Emoji mood filter matches: if anything selected, must overlap
    if (selectedEmojis.length > 0) {
      const match = movie.emojis.some((char) => selectedEmojis.includes(char));
      if (!match) return false;
    }

    // 2. Duration categories
    if (durationFilter === "short" && movie.duration > 45) return false;
    if (durationFilter === "standard" && (movie.duration < 90 || movie.duration > 125)) return false;
    if (durationFilter === "epic" && movie.duration < 140) return false;
    if (durationFilter === "relax" && movie.rating < 8.0) return false; // Relax maps to top rated

    // 3. Anti Preferences: Exclude matching triggers
    const triggerInUse = movie.triggers.some((tr) => antiTriggers.includes(tr));
    if (triggerInUse) return false;

    // 4. Local Ukrainian metrics
    if (onlyUkrainian && !movie.isUkrainian) return false;
    if (onlyWithDub && !movie.hasUkDub) return false;

    // 4.1. Genre Cocktail selection
    if (selectedGenres.length > 0) {
      const hasGenre = movie.genres.some((g) => selectedGenres.includes(g));
      if (!hasGenre) return false;
    }

    // 4.2. Minimum Rating threshold
    if (movie.rating < minRating) return false;

    // 4.3. Release Era cohort
    if (releaseEra === "2020s" && movie.year < 2020) return false;
    if (releaseEra === "2010s" && (movie.year < 2010 || movie.year >= 2020)) return false;
    if (releaseEra === "2000s" && (movie.year < 2000 || movie.year >= 2010)) return false;
    if (releaseEra === "retro" && movie.year >= 2000) return false;

    // 4.4. Streaming platform
    if (streamingPlatform !== "all" && !movie.streaming.includes(streamingPlatform)) return false;

    return true;
  });

  // Calculate activeDeckMovies from matchingMoviesWithFilters by excluding swiped unless inside an activeRoom
  const activeDeckMovies = matchingMoviesWithFilters.filter((movie) => {
    if (!activeRoom && swipedMovieIds.includes(movie.id)) {
      return false;
    }
    return true;
  });

  // Safeguard card rendering:
  // If we are not in a room, swiped movies are removed, so the first card is always index 0.
  // If we are inside an active room, cards are not removed, so we follow currentDeckIndex (wrapped using modulo to prevent overflow).
  const activeCardIndex = activeDeckMovies.length > 0 
    ? (!activeRoom 
        ? 0 
        : currentDeckIndex % activeDeckMovies.length
      )
    : 0;

  const topMovie = activeDeckMovies[activeCardIndex];

  // Endless swiping recycler effect when pool exhausts but overall has matches with current filters
  useEffect(() => {
    if (!activeRoom && matchingMoviesWithFilters.length > 0 && activeDeckMovies.length === 0) {
      const matchingIds = matchingMoviesWithFilters.map((m) => m.id);
      setSwipedMovieIds((prev) => prev.filter((id) => !matchingIds.includes(id)));
      setCurrentDeckIndex(0);
      showNotification("🔄 Починаємо коло спочатку (безкінечний свайп)!");
    }
  }, [matchingMoviesWithFilters.length, activeDeckMovies.length, activeRoom]);

  // Core swipe callback handling
  const handleSwipe = async (direction: "left" | "right") => {
    if (!topMovie) return;

    setSwipeDirection(direction);

    // 1. Record Swipe locally
    const updatedSwipes = [...swipedMovieIds, topMovie.id];
    setSwipedMovieIds(updatedSwipes);

    if (direction === "right") {
      if (!likedMovies.some((m) => m.id === topMovie.id)) {
        setLikedMovies((prev) => [topMovie, ...prev]);
      }
    }

    // 2. Synchronize swipe state if active inside Couple Match Room session
    if (activeRoom) {
      try {
        const res = await fetch("/api/room/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: activeRoom.id,
            userId: myUserId,
            movieId: topMovie.id,
            vote: direction === "right" ? "like" : "dislike",
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setActiveRoom(data.room);
        }
      } catch (err) {
        console.warn("Couple Swipe error:", err);
      }
    }

    // Advance stack index
    setCurrentDeckIndex((prev) => prev + 1);
  };

  // Movie roulette trigger ("Мені пощастить")
  const triggerRoulette = () => {
    if (activeDeckMovies.length === 0) {
      showNotification("❌ Спершу пом'якшіть фільтри — наразі черга пуста!");
      return;
    }
    
    setIsSpinningRoulette(true);
    let duration = 1200;
    
    // Simulate quick randomized flicking sequence
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * activeDeckMovies.length);
      const picked = activeDeckMovies[randomIndex];
      setRouletteMovie(picked);
      setIsSpinningRoulette(false);
    }, duration);
  };

  // Clean filters reset helper
  const handleResetAllFilters = () => {
    setSelectedEmojis([]);
    setDurationFilter("all");
    setAntiTriggers([]);
    setOnlyUkrainian(false);
    setOnlyWithDub(false);
    setSelectedGenres([]);
    setMinRating(0);
    setReleaseEra("all");
    setStreamingPlatform("all");
    setSwipedMovieIds([]);
    setCurrentDeckIndex(0);
    setSwipeDirection(null);
    setWatchlist([]);
    setWatchlistGenreFilter("all");
    setActivePlaylistTab("likes");
    showNotification("🧹 Усі налаштування фільтрів, історію та список 'Подивитись пізніше' очищено!");
  };

  const handleRemoveLikedMovie = (id: string) => {
    setLikedMovies(likedMovies.filter((m) => m.id !== id));
    setSwipedMovieIds(swipedMovieIds.filter((mid) => mid !== id));
  };

  const handleAddToWatchlist = (movie: Movie) => {
    if (watchlist.some((m) => m.id === movie.id)) {
      showNotification(`💡 '${movie.title}' вже у списку 'Подивитись пізніше'!`);
      return;
    }
    setWatchlist((prev) => [movie, ...prev]);
    showNotification(`⏳ Фільм '${movie.title}' додано до 'Подивитись пізніше'!`);
  };

  const handleRemoveFromWatchlist = (movieId: string) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
    showNotification(`🧹 Фільм видалено зі списку 'Подивитись пізніше'.`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-orange-500 selection:text-black">
      {/* Toast Alert pop */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900/95 text-zinc-100 border border-orange-500/30 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.15)] flex items-center gap-2 backdrop-blur"
          >
            <Sparkles className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-xs font-semibold">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary header branding */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              <span className="text-xl">🍿</span>
            </div>
            <div>
              <h1 className="text-xl font-black font-sans tracking-tighter uppercase text-white">
                MovieMatch
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Tinder для кіно
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            {activeRoom ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-sans font-medium">
                <Users className="w-3.5 h-3.5 animate-pulse" /> Дует активовано: {activeRoom.id}
              </span>
            ) : (
              <div className="hidden md:flex bg-zinc-800/50 border border-zinc-700 px-3 py-1 rounded-full items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Duo Mode</span>
                <span className="text-zinc-550 font-mono text-[10px] uppercase">Disconnected</span>
              </div>
            )}
            <button
              onClick={handleResetAllFilters}
              className="text-xs text-zinc-400 hover:text-white font-bold font-sans border border-zinc-850 hover:border-zinc-700 bg-zinc-900/40 transition-all px-4 py-2 rounded-full cursor-pointer"
            >
              Скинути сесію
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Control Column (Filters + Challenges) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main filters box */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl text-left space-y-5 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
              <h3 className="text-xs font-sans font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-orange-500" /> Розумна Фільтрація
              </h3>
              <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md font-black">
                {activeDeckMovies.length} ДОСТУПНО
              </span>
            </div>

            {/* Duration select */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Скільки у вас часу?
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-sans">
                {[
                  { id: "all", label: "Будь-який" },
                  { id: "short", label: "«Тільки вечеря» (<40м)" },
                  { id: "standard", label: "«Стандарт» (90-120м)" },
                  { id: "relax", label: "«Доки не засну» (Топ)" },
                  { id: "epic", label: "«Епік» (2+ год)" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDurationFilter(item.id as any);
                      setCurrentDeckIndex(0);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      durationFilter === item.id
                        ? "bg-orange-950/20 border-orange-500/40 text-orange-400 font-bold"
                        : "bg-zinc-800/30 border-zinc-800/85 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti preferences */}
            <div className="space-y-2.5">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Анти-налаштування (Виключити теми):
              </label>
              <div className="flex flex-col gap-1.5 text-xs text-zinc-300 font-sans">
                {[
                  { id: "violence", label: "Без насильства та брутальності" },
                  { id: "tragic-ending", label: "Без сумних/трагічних фіналів" },
                  { id: "animal-death", label: "Без смерті домашніх тварин" }
                ].map((item) => {
                  const isChecked = antiTriggers.includes(item.id as any);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border border-dashed transition-all cursor-pointer ${
                        isChecked
                          ? "bg-orange-950/10 border-orange-500/30 text-orange-400"
                          : "bg-zinc-800/10 border-zinc-800/50 hover:border-zinc-700 text-zinc-450"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAntiTriggers([...antiTriggers, item.id as any]);
                          } else {
                            setAntiTriggers(antiTriggers.filter((t) => t !== item.id));
                          }
                          setCurrentDeckIndex(0);
                        }}
                        className="rounded border-zinc-700 text-orange-500 focus:ring-orange-550/30"
                      />
                      <span className="text-[11px] leading-tight font-medium">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* National Localization metrics */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-800/65">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Локалізація (Україна):
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/10 border border-zinc-800 cursor-pointer text-zinc-300">
                  <span className="flex items-center gap-1.5 font-sans font-medium text-[11px]">
                    🇺🇦 Лише українські фільми / серіали
                  </span>
                  <input
                    type="checkbox"
                    checked={onlyUkrainian}
                    onChange={(e) => {
                      setOnlyUkrainian(e.target.checked);
                      setCurrentDeckIndex(0);
                    }}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-520"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/10 border border-zinc-800 cursor-pointer text-zinc-300">
                  <span className="flex items-center gap-1.5 font-sans font-medium text-[11px]">
                    🗣️ Тільки з українським дубляжем
                  </span>
                  <input
                    type="checkbox"
                    checked={onlyWithDub}
                    onChange={(e) => {
                      setOnlyWithDub(e.target.checked);
                      setCurrentDeckIndex(0);
                    }}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-520"
                  />
                </label>
              </div>
            </div>

            {/* Genre Cocktail Tags */}
            <div className="space-y-2 pt-3 border-t border-zinc-800/65">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Жанровий Коктейль:
              </label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Комедія", "Драма", "Трилер", "Пригоди", "Екшн", "Наукова фантастика", "Анімація", "Фентезі", "Детектив", "Серіал"].map((genre) => {
                  const isGenreSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => {
                        if (isGenreSelected) {
                          setSelectedGenres(selectedGenres.filter((g) => g !== genre));
                        } else {
                          setSelectedGenres([...selectedGenres, genre]);
                        }
                        setCurrentDeckIndex(0);
                      }}
                      className={`text-[10px] font-sans font-bold px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                        isGenreSelected
                          ? "bg-orange-500 text-black border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.25)]"
                          : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* IMDb Rating Threshold */}
            <div className="space-y-2 pt-3 border-t border-zinc-800/65">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Мінімальний Рейтинг IMDb:
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-sans">
                {[
                  { val: 0, label: "Всі" },
                  { val: 7.5, label: "★ 7.5+" },
                  { val: 8.0, label: "★ 8.0+" },
                  { val: 8.5, label: "★ 8.5+" }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => {
                      setMinRating(opt.val);
                      setCurrentDeckIndex(0);
                    }}
                    className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                      minRating === opt.val
                        ? "bg-orange-950/20 border-orange-500/40 text-orange-400"
                        : "bg-zinc-800/30 border-zinc-800/80 hover:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Streaming Platform filter */}
            <div className="space-y-2 pt-3 border-t border-zinc-800/65">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Стрімінгові Платформи:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-sans">
                {[
                  { id: "all", label: "Будь-який" },
                  { id: "Netflix", label: "Netflix" },
                  { id: "Megogo", label: "Megogo" },
                  { id: "Sweet.tv", label: "Sweet.tv" },
                  { id: "Apple TV", label: "Apple TV" }
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setStreamingPlatform(platform.id);
                      setCurrentDeckIndex(0);
                    }}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      streamingPlatform === platform.id
                        ? "bg-orange-950/20 border-orange-500/40 text-orange-400"
                        : "bg-zinc-800/30 border-zinc-800/80 hover:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Release Era filter */}
            <div className="space-y-2 pt-3 border-t border-zinc-800/65">
              <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-black">
                Оберіть Епоху Кіно:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-sans">
                {[
                  { id: "all", label: "Будь-який рік" },
                  { id: "2020s", label: "Новинки (2020-ті)" },
                  { id: "2010s", label: "Золотий вік (2010-ті)" },
                  { id: "2000s", label: "Міленіум (2000-ні)" },
                  { id: "retro", label: "Ретро-спадщина" }
                ].map((era) => (
                  <button
                    key={era.id}
                    onClick={() => {
                      setReleaseEra(era.id);
                      setCurrentDeckIndex(0);
                    }}
                    className={`px-2.5 py-2.5 rounded-xl text-left border transition-all cursor-pointer font-bold ${
                      releaseEra === era.id
                        ? "bg-orange-950/20 border-orange-500/40 text-orange-400"
                        : "bg-zinc-800/30 border-zinc-800/80 hover:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {era.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <EmojiFilter selectedEmojis={selectedEmojis} onChange={(e) => { setSelectedEmojis(e); setCurrentDeckIndex(0); }} />

          <ChallengeBadge challenges={challenges} likes={likedMovies} />
        </div>

        {/* Center UI Column (Tinder cards matching active constraints) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-6">
          
          <div className="text-center w-full max-w-[380px] space-y-1">
            <h2 className="text-xs font-mono uppercase font-black text-zinc-450 tracking-widest flex items-center justify-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-500" /> Простір збігів
            </h2>
            <p className="text-[11px] text-zinc-500 font-sans leading-none">
              Свайпайте вліво або вправо, або тягніть картку мишкою
            </p>
          </div>

          {/* Cards Frame Stack */}
          <div className="relative w-full h-[520px] max-w-[380px] flex items-center justify-center">
            {activeDeckMovies.length > 0 && activeCardIndex < activeDeckMovies.length ? (
              <>
                {/* Background stacked card for depth effect */}
                {activeDeckMovies.length > 1 && (
                  <MovieCard
                    key={activeDeckMovies[!activeRoom ? 1 : (activeCardIndex + 1) % activeDeckMovies.length].id}
                    movie={activeDeckMovies[!activeRoom ? 1 : (activeCardIndex + 1) % activeDeckMovies.length]}
                    index={1}
                    onSwipe={() => {}}
                  />
                )}

                {/* Active Top Card wrapped in AnimatePresence */}
                <AnimatePresence mode="popLayout" custom={swipeDirection}>
                  <MovieCard
                    key={activeDeckMovies[activeCardIndex].id}
                    movie={activeDeckMovies[activeCardIndex]}
                    index={0}
                    onSwipe={handleSwipe}
                    customDirection={swipeDirection}
                  />
                </AnimatePresence>
              </>
            ) : (
              // Empty stack placeholder state
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full rounded-[2.5rem] border border-dashed border-zinc-800 bg-zinc-900/10 flex flex-col items-center justify-center p-6 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-800/30 flex items-center justify-center text-zinc-400 text-2xl animate-pulse">
                  🍿
                </div>
                <div className="space-y-1">
                  <h4 className="font-sans font-bold text-base text-zinc-200">
                    Черга матчів пуста!
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-[280px] mx-auto leading-relaxed font-sans">
                    Спробуйте скинути деякі фільтри ліворуч, або надішліть приватний запит нашому **ШІ-Консьєржу** праворуч для миттєвого створення нової унікальної підбірки!
                  </p>
                </div>
                <button
                  onClick={handleResetAllFilters}
                  className="bg-orange-500 hover:bg-orange-400 text-black font-sans font-bold px-5 py-2.5 rounded-full text-xs transition-colors cursor-pointer active:scale-95 duration-100"
                >
                  Очистити фільтри
                </button>
              </motion.div>
            )}
          </div>

          {/* Core Action buttons buttons */}
          <div className="flex items-center gap-4 py-2 z-10 select-none">
            <button
              onClick={() => handleSwipe("left")}
              disabled={activeDeckMovies.length === 0 || activeCardIndex >= activeDeckMovies.length}
              className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-full text-red-500 hover:text-red-400 hover:scale-110 duration-200 transition-all cursor-pointer shadow-lg hover:shadow-red-500/5 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
              title="Пропустити"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Movie Roulette Мені Пощастить Button */}
            <button
              onClick={triggerRoulette}
              disabled={isSpinningRoulette || activeDeckMovies.length === 0}
              className="bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-500 border border-orange-500/30 p-4 rounded-full text-black hover:text-white hover:scale-115 duration-200 transition-all cursor-pointer shadow-xl hover:shadow-orange-500/20 disabled:opacity-50"
              title="Мені пощастить! (Рулетка фільмів)"
            >
              <Dices className={`w-7 h-7 ${isSpinningRoulette ? "animate-spin" : "animate-bounce"}`} />
            </button>

            <button
              onClick={() => topMovie && handleAddToWatchlist(topMovie)}
              disabled={activeDeckMovies.length === 0 || activeCardIndex >= activeDeckMovies.length}
              className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-full text-amber-400 hover:text-amber-300 hover:scale-110 duration-200 transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
              title="Подивитись пізніше (Watchlist)"
            >
              <Bookmark className="w-6 h-6" />
            </button>

            <button
              onClick={() => handleSwipe("right")}
              disabled={activeDeckMovies.length === 0 || activeCardIndex >= activeDeckMovies.length}
              className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-full text-emerald-400 hover:text-emerald-300 hover:scale-110 duration-200 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/5 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
              title="Хочу подивитись"
            >
              <Heart className="w-6 h-6 fill-emerald-400 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Right Column (AI Copilot + Playlist Match History) */}
        <div className="lg:col-span-4 space-y-6">
          <AiConcierge
            onAppendMovies={handleAppendMovies}
            activeChatHistory={chatHistory}
            onSetChatHistory={setChatHistory}
          />

          <DuetWidget
            myUserId={myUserId}
            onRoomChange={setActiveRoom}
            activeRoom={activeRoom}
            filteredMoviesList={activeDeckMovies}
            allMovies={moviesDb}
          />

          <RecommendationsWidget
            likedMovies={likedMovies}
            allMovies={moviesDb}
            onAddToWatchlist={handleAddToWatchlist}
            watchlistIds={watchlist.map((m) => m.id)}
          />

          {/* Liked Playlists & Saved Watchlists - Dual Tab container */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl text-left space-y-4 shadow-xl backdrop-blur-md">
            {/* Header Tabs */}
            <div className="flex border-b border-zinc-800 pb-2 justify-between items-center gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setActivePlaylistTab("likes")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePlaylistTab === "likes"
                      ? "text-orange-400 bg-orange-500/10 border border-orange-500/20"
                      : "text-zinc-450 hover:text-zinc-200"
                  }`}
                >
                  ❤ Лайки ({likedMovies.length})
                </button>
                <button
                  onClick={() => setActivePlaylistTab("watchlist")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePlaylistTab === "watchlist"
                      ? "text-amber-400 bg-amber-505/10 border border-amber-500/20"
                      : "text-zinc-450 hover:text-zinc-200"
                  }`}
                >
                  ⏳ Окремо ({watchlist.length})
                </button>
              </div>

              {activePlaylistTab === "likes" && likedMovies.length > 0 && (
                <button
                  onClick={() => {
                    setLikedMovies([]);
                    showNotification("🧹 Плейлист очищено!");
                  }}
                  className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors font-mono uppercase tracking-wider cursor-pointer"
                >
                  Очистити
                </button>
              )}

              {activePlaylistTab === "watchlist" && watchlist.length > 0 && (
                <button
                  onClick={() => {
                    setWatchlist([]);
                    showNotification("🧹 Список Подивитись пізніше очищено!");
                  }}
                  className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors font-mono uppercase tracking-wider cursor-pointer"
                >
                  Очистити
                </button>
              )}
            </div>

            {/* TAB CONTENT: 1. LIKES PLAYLIST */}
            {activePlaylistTab === "likes" && (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {likedMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="bg-zinc-800/30 border border-zinc-800/60 rounded-2xl p-2.5 flex gap-2.5 items-center justify-between group transition-all"
                  >
                    <div className="flex gap-2.5 items-center min-w-0">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-10 h-10 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-sans font-bold text-zinc-100 truncate">
                          {movie.title}
                        </p>
                        <p className="text-[9.5px] text-zinc-400 font-mono truncate">
                          {movie.originalTitle} ({movie.year})
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <a
                        href={`https://www.google.com/search?q=дивитися+${encodeURIComponent(movie.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 px-1.5 text-[9.5px] border border-zinc-700/60 hover:border-orange-500/30 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-0.5 font-bold"
                      >
                        <Tv className="w-3 h-3 text-orange-500" /> Стрім
                      </a>
                      <button
                        onClick={() => handleRemoveLikedMovie(movie.id)}
                        className="p-1 border border-zinc-800 hover:border-red-500/20 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {likedMovies.length === 0 && (
                  <p className="text-xs text-zinc-500 leading-relaxed py-4 font-sans italic text-center">
                    У вас ще немає залайканих фільмів. Свайпайте картки вправо ❤ для наповнення списку!
                  </p>
                )}
              </div>
            )}

            {/* TAB CONTENT: 2. WATCHLIST (ПОДИВИТИСЬ ПІЗНІШЕ) WITH GENRE FILTRATION */}
            {activePlaylistTab === "watchlist" && (
              <div className="space-y-3">
                {/* Genre filtration filter */}
                <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-850 gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono font-extrabold flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-amber-500" /> Сортування/Жанр:
                  </span>
                  <select
                    value={watchlistGenreFilter}
                    onChange={(e) => setWatchlistGenreFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-[10.5px] font-sans font-bold text-zinc-100 rounded-lg px-2 py-1 select-none focus:outline-none cursor-pointer"
                  >
                    <option value="all">Усі збережені</option>
                    {["Комедія", "Драма", "Трилер", "Пригоди", "Екшн", "Наукова фантастика", "Анімація", "Фентезі", "Детектив", "Романтика"].map((genreOption) => (
                      <option key={genreOption} value={genreOption}>{genreOption}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {watchlist
                    .filter((movie) => watchlistGenreFilter === "all" || movie.genres.includes(watchlistGenreFilter))
                    .map((movie) => (
                      <div
                        key={movie.id}
                        className="bg-zinc-800/30 border border-zinc-800/60 rounded-2xl p-2.5 flex gap-2.5 items-center justify-between group transition-all"
                      >
                        <div className="flex gap-2.5 items-center min-w-0">
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-10 h-10 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-sans font-bold text-zinc-100 truncate">
                              {movie.title}
                            </p>
                            <p className="text-[9.5px] text-zinc-400 font-mono truncate">
                              ★ {movie.rating} • {movie.genres.join(", ")}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          <a
                            href={`https://www.google.com/search?q=дивитися+${encodeURIComponent(movie.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 px-1.5 text-[9.5px] border border-zinc-750 hover:border-amber-550/30 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-0.5 font-bold"
                          >
                            <Tv className="w-3 h-3 text-amber-500" /> Стрім
                          </a>
                          <button
                            onClick={() => handleRemoveFromWatchlist(movie.id)}
                            className="p-1 border border-zinc-800 hover:border-red-500/20 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Видалити зі списку пізніше"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                  {watchlist.filter((movie) => watchlistGenreFilter === "all" || movie.genres.includes(watchlistGenreFilter)).length === 0 && (
                    <p className="text-xs text-zinc-500 leading-relaxed py-6 font-sans italic text-center">
                      {watchlist.length === 0 
                        ? "У вас немає збережених фільмів 'на пізніше'. Натисніть кнопку ⏳ під карткою або у рекомендаціях, щоб додати!" 
                        : `Немає фільмів з обраним жанром '${watchlistGenreFilter}'.`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-2">
          <p className="text-xs text-zinc-500 font-sans">
            MovieMatch © {new Date().getFullYear()} — Твій найкращий порадник у світі великого кіно. Створено з повагою до українського кінематографа.
          </p>
          <p className="text-[10px] text-zinc-650 font-mono">
            *Сервіс інтегровано з Megogo, Sweet.tv, Netflix та Apple TV. Всі посилання ведуть на ліцензійні платформи.
          </p>
        </div>
      </footer>

      {/* DYNAMIC OVERLAYS MODALS */}
      
      {/* 1. INTERACTIVE ROULETTE WIN MODAL */}
      <AnimatePresence>
        {rouletteMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 max-w-[420px] w-full rounded-3xl overflow-hidden shadow-2xl text-left"
            >
              {/* Media banner */}
              <div className="relative h-[220px]">
                <img
                  src={rouletteMovie.posterUrl}
                  alt={rouletteMovie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 z-10">
                  <span className="bg-orange-550 text-black text-[10px] font-sans font-black uppercase px-2 py-0.5 rounded shadow">
                    🎲 РЕЗУЛЬТАТ РУЛЕТКИ
                  </span>
                  <h3 className="text-2xl font-bold font-sans text-zinc-50 mt-1 leading-tight">
                    {rouletteMovie.title}
                  </h3>
                  <p className="text-xs text-zinc-350 font-mono">
                    {rouletteMovie.originalTitle} • {rouletteMovie.year}
                  </p>
                </div>
              </div>

              {/* Info summary */}
              <div className="p-5 space-y-4 font-sans text-xs">
                <p className="text-zinc-300 leading-relaxed font-light">
                  {rouletteMovie.description}
                </p>

                <div className="flex justify-between items-center text-[11px] text-zinc-400 py-2 border-y border-zinc-800">
                  <span>Рейтинг: ★ <strong className="text-orange-500 font-mono">{rouletteMovie.rating}</strong></span>
                  <span>Тривалість: {rouletteMovie.duration} хв</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!likedMovies.some((m) => m.id === rouletteMovie.id)) {
                        setLikedMovies([rouletteMovie, ...likedMovies]);
                      }
                      setRouletteMovie(null);
                      showNotification(`❤ '${rouletteMovie.title}' додано до плейлиста!`);
                    }}
                    className="flex-1 bg-gradient-to-tr from-orange-600 to-orange-500 text-black cursor-pointer px-4 py-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1 shadow transition-all active:scale-95"
                  >
                    <Heart className="w-4 h-4 fill-black" /> Додати в Плейлист
                  </button>
                  <button
                    onClick={() => setRouletteMovie(null)}
                    className="bg-zinc-805 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs px-4 rounded-xl cursor-pointer"
                  >
                    Закрити
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SHARED DUET MATCH CELEBRATION MODAL */}
      <AnimatePresence>
        {matchModalMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 50 }}
              className="bg-gradient-to-b from-orange-950/20 to-zinc-900 border-2 border-orange-500/50 max-w-[450px] w-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.3)] text-center p-6 space-y-5"
            >
              <div className="space-y-1">
                <div className="text-4xl animate-bounce">💖</div>
                <h3 className="text-2xl font-black font-sans uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500">
                  Ідеальний Match!
                </h3>
                <p className="text-xs text-orange-200 font-sans">
                  Ви обоє обрали один і той самий фільм для сьогоднішнього вечора!
                </p>
              </div>

              {/* Show matching movie poster details */}
              <div className="relative h-[240px] rounded-2xl overflow-hidden border border-orange-500/25 shadow-lg">
                <img
                  src={matchModalMovie.posterUrl}
                  alt={matchModalMovie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />
                <div className="absolute bottom-3 left-4 right-4 text-left">
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {matchModalMovie.title}
                  </h4>
                  <p className="text-[10px] text-zinc-300 uppercase font-mono">
                    {matchModalMovie.originalTitle} • {matchModalMovie.year}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed max-w-[340px] mx-auto text-left font-light">
                {matchModalMovie.description}
              </p>

              {/* Actions platform links */}
              <div className="space-y-3">
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest font-black">
                  🎥 Знайдено на стрімінгових платформах:
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {matchModalMovie.streaming.map((platform) => (
                    <a
                      key={platform}
                      href={`https://www.google.com/search?q=дивитися+${encodeURIComponent(matchModalMovie.title)}+на+${encodeURIComponent(platform)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl font-bold hover:border-orange-505/50 duration-150 flex items-center gap-1.5"
                    >
                      <Tv className="w-3.5 h-3.5 text-orange-500" /> {platform} <ExternalLink className="w-3 h-3 text-zinc-550" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setMatchModalMovie(null);
                    // Purge room matches after review
                    if (activeRoom) {
                      activeRoom.matches = activeRoom.matches.filter((m) => m !== matchModalMovie.id);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-black cursor-pointer py-3 rounded-2xl text-xs font-bold transition-transform active:scale-95 shadow-lg"
                >
                  Чудово, плануємо перегляд!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
