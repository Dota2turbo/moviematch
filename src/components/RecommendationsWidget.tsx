import React, { useState, useMemo } from "react";
import { Sparkles, Compass, ThumbsUp, HelpCircle, RefreshCw, Film, PlayCircle, Star, Hash } from "lucide-react";
import { Movie } from "../types";

interface RecommendationsWidgetProps {
  likedMovies: Movie[];
  allMovies: Movie[];
  onAddToWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
}

export const RecommendationsWidget: React.FC<RecommendationsWidgetProps> = ({
  likedMovies,
  allMovies,
  onAddToWatchlist,
  watchlistIds
}) => {
  const [aiRecommendations, setAiRecommendations] = useState<Movie[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");

  // 1. ANALYZE USER PROFILE (GENRES & KEYWORDS)
  const userProfile = useMemo(() => {
    if (likedMovies.length === 0) return null;

    const genreCounts: { [key: string]: number } = {};
    const tagCounts: { [key: string]: number } = {};

    likedMovies.forEach((m) => {
      m.genres.forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
      m.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    // Sort genres & tags by popularity
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre, count]) => ({
        genre,
        count,
        percent: Math.round((count / likedMovies.length) * 100)
      }));

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);

    return { topGenres, topTags };
  }, [likedMovies]);

  // 2. GENERATE ALGORITHMIC RECOMMENDATIONS FROM THE OFFLINE POOL
  const algorithmicRecommendations = useMemo(() => {
    if (likedMovies.length === 0) return [];

    const likedIds = new Set(likedMovies.map((m) => m.id));
    const userLikedGenres = new Set(likedMovies.flatMap((m) => m.genres));
    const userLikedTags = new Set(likedMovies.flatMap((m) => m.tags));

    return allMovies
      .filter((m) => !likedIds.has(m.id))
      .map((m) => {
        let score = 0;
        // Core scoring logic:
        // +3 points for each matching liked genre
        m.genres.forEach((g) => {
          if (userLikedGenres.has(g)) score += 3;
        });
        // +2 points for each matching tag
        m.tags.forEach((t) => {
          if (userLikedTags.has(t)) score += 2;
        });
        // Scale with IMDb ratings
        score += m.rating * 0.5;

        return { movie: m, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.movie);
  }, [likedMovies, allMovies]);

  // 3. GENERATE DEEP SMART AI RECOMMENDATION VIA CHAT SERVICE
  const handleTriggerAiRecommendation = async () => {
    if (likedMovies.length === 0) return;
    setIsAiLoading(true);
    setAiExplanation("");

    try {
      const likesSummary = likedMovies.map((m) => `'${m.title}' (${m.genres.join(", ")})`).join(", ");
      const promptText = `Проаналізуй мої залайкані фільми: ${likesSummary}. Згенеруй рівно 2 нових унікальних фільми як персональні рекомендації, яких немає в цьому списку. Поверни відповідь у форматі JSON з оцінками, жанрами та посиланнями на стрімінги Netflix/Megogo за системною інструкцією. Додай також коротке пояснення чому саме ці фільми мені сподобаються в полі 'text'.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommendedMovies && data.recommendedMovies.length > 0) {
          setAiRecommendations(data.recommendedMovies);
        }
        if (data.text) {
          setAiExplanation(data.text);
        }
      }
    } catch (err) {
      console.warn("AI recommendation request error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left space-y-5 shadow-2xl relative overflow-hidden">
      {/* Decorative pulse element */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400 fill-orange-400 animate-pulse" />
          <h4 className="text-xs font-sans font-black text-zinc-400 uppercase tracking-widest">
            Персональні Рекомендації
          </h4>
        </div>
        {likedMovies.length > 0 && (
          <button
            onClick={handleTriggerAiRecommendation}
            disabled={isAiLoading}
            className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider hover:bg-orange-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isAiLoading ? "animate-spin" : ""}`} /> {isAiLoading ? "Аналіз..." : "ШІ-Аналізатор"}
          </button>
        )}
      </div>

      {likedMovies.length === 0 ? (
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 text-center space-y-3">
          <Compass className="w-10 h-10 text-zinc-500 mx-auto animate-bounce" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold font-sans text-zinc-300">
              Ваш профіль інтересів пустий
            </h5>
            <p className="text-[11px] text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
              Свайпайте фільми вправо ❤ на головному екрані, щоб навчити наш алгоритм вашим унікальним смакам!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Realtime Analysis of Loved Films */}
          {userProfile && (
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4.5 space-y-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">
                📊 Аналіз ваших вподобань:
              </p>
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {userProfile.topGenres.map((g) => (
                    <span
                      key={g.genre}
                      className="text-[10px] font-sans font-bold bg-orange-500/10 border border-orange-500/25 rounded-full px-2.5 py-0.5 text-orange-400 flex items-center gap-1"
                    >
                      {g.genre} <span className="text-[9px] text-zinc-450">{g.percent}%</span>
                    </span>
                  ))}
                </div>

                {userProfile.topTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[9.5px] text-zinc-500 font-mono">Теми:</span>
                    {userProfile.topTags.map((tag) => (
                      <span key={tag} className="text-[9.5px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-800 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Recommendations Carousel */}
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1">
              🎯 Підібрано на основі історії лайків:
            </p>

            <div className="space-y-2">
              {algorithmicRecommendations.map((movie) => {
                const isSaved = watchlistIds.includes(movie.id);
                return (
                  <div
                    key={movie.id}
                    className="bg-zinc-950/25 border border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 group hover:border-zinc-700/60 duration-200 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-10 h-10 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-sans font-extrabold text-zinc-100 truncate group-hover:text-orange-400 transition-colors">
                          {movie.title}
                        </p>
                        <p className="text-[9.5px] text-zinc-450 font-mono truncate">
                          ★ {movie.rating.toFixed(1)} • {movie.genres[0]} • {movie.year}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddToWatchlist(movie)}
                      disabled={isSaved}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold border transition-all cursor-pointer ${
                        isSaved
                          ? "bg-zinc-800/60 border-zinc-800 text-zinc-500 cursor-not-allowed"
                          : "bg-orange-500 hover:bg-orange-400 text-black border-orange-500 active:scale-95 text-center"
                      }`}
                    >
                      {isSaved ? "Збережено" : "+ Watchlist"}
                    </button>
                  </div>
                );
              })}

              {algorithmicRecommendations.length === 0 && (
                <p className="text-xs text-zinc-500 py-3 italic font-sans text-center">
                  Немає пропозицій. Будь ласка, залайкайте більше фільмів.
                </p>
              )}
            </div>
          </div>

          {/* AI Recommended Content Block (if present) */}
          {aiRecommendations.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-2.5">
              <div className="flex gap-1.5 items-center">
                <Sparkles className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <p className="text-[10px] text-orange-400 uppercase tracking-widest font-mono font-black">
                  🧙‍♂️ Розумний ШІ-Підбір:
                </p>
              </div>

              {aiExplanation && (
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans italic bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                  {aiExplanation}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2">
                {aiRecommendations.map((movie) => {
                  const isSaved = watchlistIds.includes(movie.id);
                  return (
                    <div
                      key={movie.id}
                      className="bg-orange-950/10 border border-orange-500/10 p-3 rounded-2xl flex justify-between items-start gap-4"
                    >
                      <div className="flex gap-2.5 items-center min-w-0">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-12 h-12 object-cover rounded-xl border border-orange-500/20 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 text-left">
                          <h5 className="text-xs font-sans font-black text-white truncate">
                            {movie.title}
                          </h5>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">
                            {movie.genres.join(" / ")} • {movie.year} • ★ {movie.rating}
                          </p>
                          <p className="text-[10.5px] text-zinc-350 leading-snug line-clamp-2 mt-1 font-sans">
                            {movie.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onAddToWatchlist(movie)}
                        disabled={isSaved}
                        className={`px-2 py-1.5 rounded-lg text-[9.5px] font-sans font-bold flex-shrink-0 border transition-all cursor-pointer ${
                          isSaved
                            ? "bg-zinc-800/50 border-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-orange-500 hover:bg-orange-400 text-black border-orange-500"
                        }`}
                      >
                        {isSaved ? "Додано" : "+ Стягнути"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
