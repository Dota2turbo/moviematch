import React from "react";
import { Award, Compass, Heart, CheckCircle2, Trophy, Star } from "lucide-react";
import { MovieChallenge, Movie } from "../types";

interface ChallengeBadgeProps {
  challenges: MovieChallenge[];
  likes: Movie[];
}

export const ChallengeBadge: React.FC<ChallengeBadgeProps> = ({ challenges, likes }) => {
  // Helper to map icon string to actual Lucide component
  const renderIcon = (iconName: string, completed: boolean) => {
    const cls = `w-5 h-5 ${completed ? "text-yellow-400 stroke-[2]" : "text-slate-400"}`;
    switch (iconName) {
      case "Heart":
        return <Heart className={cls} />;
      case "Award":
        return <Award className={cls} />;
      case "Compass":
        return <Compass className={cls} />;
      default:
        return <Award className={cls} />;
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl text-left space-y-4 shadow-xl backdrop-blur-md">
      <div className="flex justify-between items-center sm:gap-2">
        <h4 className="text-xs font-sans font-black text-zinc-450 uppercase tracking-widest flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-orange-500 animate-bounce" /> Кіно-Челенджі та Беджі
        </h4>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          <span className="text-xs font-mono font-bold text-zinc-350">
            {challenges.filter((c) => c.completed).length}/{challenges.length}
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {challenges.map((challenge) => {
          // Dynamically compute progress based on current user Likes
          let itemsMatching = 0;
          if (challenge.requirements.isUkrainian) {
            itemsMatching = likes.filter((m) => m.isUkrainian).length;
          } else if (challenge.requirements.genre) {
            // Genre is Blockbuster/etc
            itemsMatching = likes.filter((m) => m.genres.includes("Будапешт") || m.rating >= 8.2).length;
          } else if (challenge.requirements.isGem) {
            itemsMatching = likes.filter((m) => m.isHiddenGem).length;
          }

          const target = challenge.requirements.count;
          const percentage = Math.min(Math.round((itemsMatching / target) * 100), 100);
          const completed = percentage >= 100;

          return (
            <div
              key={challenge.id}
              className={`p-3 rounded-xl border transition-all duration-300 ${
                completed
                  ? "bg-orange-950/10 border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.06)]"
                  : "bg-zinc-800/20 border-zinc-800/70"
              }`}
            >
              <div className="flex gap-3 items-start">
                <div
                  className={`p-2 rounded-lg ${
                    completed ? "bg-orange-500/20" : "bg-zinc-800"
                  } flex-shrink-0`}
                >
                  {renderIcon(challenge.icon, completed)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-center gap-1">
                    <p className={`text-xs font-sans font-bold truncate ${completed ? "text-orange-400" : "text-zinc-200"}`}>
                      {challenge.title}
                    </p>
                    {completed && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                    {challenge.description}
                  </p>

                  {/* Progress panel */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>Прогрес: {percentage}%</span>
                      <span>
                        {itemsMatching} / {target}
                      </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ${
                          completed ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-zinc-700"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
