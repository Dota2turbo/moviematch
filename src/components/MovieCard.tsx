import React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "motion/react";
import { Heart, X, Award, Eye, Clock, ShieldAlert } from "lucide-react";
import { Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
  onSwipe: (dir: "left" | "right") => void;
  index: number;
  customDirection?: "left" | "right" | null;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSwipe,
  index,
  customDirection
}) => {
  // Motion Values for performance drag tracking
  const x = useMotionValue(0);
  
  // Custom transforms for rotation & opacity indicators
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 0.9]);
  const skipOpacity = useTransform(x, [-100, 0], [0.9, 0]);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const swipeThreshold = 120;
    if (info.offset.x > swipeThreshold) {
      onSwipe("right");
    } else if (info.offset.x < -swipeThreshold) {
      onSwipe("left");
    } else {
      // Safely snap back
      x.set(0);
    }
  };

  // Safe color coding for streaming platforms in UA
  const getPlatformStyle = (p: string) => {
    switch (p) {
      case "Netflix":
        return "bg-red-950/80 border-red-500/35 text-red-400";
      case "Megogo":
        return "bg-emerald-950/80 border-emerald-500/35 text-emerald-400";
      case "Sweet.tv":
        return "bg-amber-950/80 border-amber-500/35 text-amber-400";
      case "Apple TV":
        return "bg-slate-800/80 border-slate-500/35 text-slate-300";
      default:
        return "bg-slate-900/80 border-slate-700/35 text-slate-400";
    }
  };

  const isInteractive = index === 0;

  // Set visual variants for card introduction & exit swipes
  const cardVariants = {
    enter: {
      scale: 0.92,
      y: 12,
      opacity: 0
    },
    center: {
      scale: 1,
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.25,
        ease: "easeOut"
      }
    },
    exit: (customDir: "left" | "right" | null) => {
      const dir = customDir || (x.get() > 0 ? "right" : "left");
      return {
        x: dir === "left" ? -450 : 450,
        opacity: 0,
        scale: 0.9,
        rotate: dir === "left" ? -25 : 25,
        transition: {
          duration: 0.35,
          ease: "easeInOut"
        }
      };
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      custom={customDirection}
      initial="enter"
      animate={isInteractive ? "center" : { scale: 0.95, y: 12, opacity: 0.6 }}
      exit="exit"
      drag={isInteractive ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={isInteractive ? handleDragEnd : undefined}
      style={isInteractive ? { x, rotate, zIndex: 10 - index } : { zIndex: 10 - index }}
      whileDrag={isInteractive ? { scale: 1.02 } : undefined}
      id={`movie-card-${movie.id}`}
      className="absolute w-full h-[520px] max-w-[380px] select-none rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing transform"
    >
      {/* Swipe indicator overlays */}
      {isInteractive && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute inset-0 bg-emerald-950/85 z-20 pointer-events-none flex flex-col items-center justify-center transition-all"
          >
            <div className="border-4 border-emerald-400 text-emerald-400 font-sans font-bold text-3xl px-6 py-2 rounded-xl rotate-12 flex items-center gap-2">
              <Heart className="w-8 h-8 fill-emerald-400" /> ХОЧУ
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: skipOpacity }}
            className="absolute inset-0 bg-red-950/85 z-20 pointer-events-none flex flex-col items-center justify-center transition-all"
          >
            <div className="border-4 border-red-500 text-red-500 font-sans font-bold text-3xl px-6 py-2 rounded-xl -rotate-12 flex items-center gap-2">
              <X className="w-8 h-8" /> ПРОПУСТИТИ
            </div>
          </motion.div>
        </>
      )}

      {/* Movie image header */}
      <div className="relative w-full h-[260px] bg-zinc-950 overflow-hidden">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 transform hover:scale-105"
          draggable="false"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/40" />

        {/* Badges top absolute */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="flex gap-1">
            {movie.isUkrainian && (
              <span className="bg-yellow-400 text-zinc-950 font-sans font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                🇺🇦 НАШЕ КІНО
              </span>
            )}
            {movie.isHiddenGem && (
              <span className="bg-orange-500 text-black font-sans font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-0.5 uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 fill-black" /> СКАРБНИЦЯ
              </span>
            )}
          </div>

          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-orange-500 font-mono text-xs font-bold border border-orange-500/20 shadow-md">
            ★ {movie.rating.toFixed(1)}
          </div>
        </div>

        {/* Core titles overlaid on image bottom */}
        <div className="absolute bottom-3 left-4 right-4 z-10 text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            {movie.emojis.map((emoji, i) => (
              <span key={i} className="text-xl inline-block transform hover:scale-110 duration-150" title="Настрій">
                {emoji}
              </span>
            ))}
          </div>
          <h3 className="font-sans font-black text-2xl text-white leading-tight tracking-tight mt-1 drop-shadow">
            {movie.title}
          </h3>
          <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest drop-shadow-sm font-bold">
            {movie.originalTitle} • {movie.year}
          </p>
        </div>
      </div>

      {/* Info Content Section */}
      <div className="flex-1 p-5 flex flex-col justify-between text-left relative">
        <div className="space-y-3 overflow-y-auto max-h-[190px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Meta details bar */}
          <div className="flex justify-between items-center text-xs text-zinc-400 py-1 border-b border-zinc-800/60">
            <span className="flex items-center gap-1 font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-orange-500" /> {movie.duration} хв
            </span>
            <span className="text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md font-bold text-[11px]">
              {movie.genres.join(" / ")}
            </span>
          </div>

          {/* Synopsis */}
          <p className="font-sans text-xs text-zinc-300 leading-relaxed font-light">
            {movie.description}
          </p>

          {/* Triggers indicator */}
          {movie.triggers.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-500 font-sans pt-1 font-bold">
              <span className="bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Увага</span>
              <span>{movie.triggers.map((t) => (t === "violence" ? "Брутальність" : t === "tragic-ending" ? "Сумна розв'язка" : "Смерть тварин")).join(", ")}</span>
            </div>
          )}

          {/* Deep Tags list */}
          <div className="flex flex-wrap gap-1 pt-1">
            {movie.tags.map((tag, i) => (
              <span key={i} className="bg-zinc-800/40 border border-zinc-800 text-[10px] text-zinc-400 px-2 py-0.5 rounded-full font-mono font-bold">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Streaming links */}
        <div className="pt-3 border-t border-zinc-800/80 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-450 uppercase tracking-wider font-extrabold flex items-center gap-1.5 font-sans">
              Де дивитись в Україні:
            </span>
            {movie.hasUkDub && (
              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider">
                🇺🇦 Дубляж
              </span>
            )}
          </div>

          <div className="flex gap-1 flex-wrap">
            {movie.streaming.map((platform) => (
              <a
                key={platform}
                href={`https://www.google.com/search?q=дивитися+${encodeURIComponent(movie.title)}+на+${encodeURIComponent(platform)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[10px] font-sans font-bold border px-2 py-0.5 rounded-md transition-colors ${getPlatformStyle(platform)}`}
                title={`Шукати фільм на ${platform}`}
              >
                {platform}
              </a>
            ))}
            {movie.streaming.length === 0 && (
              <span className="text-[10px] text-zinc-550 font-sans italic">Очікується на стрімінгах</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
