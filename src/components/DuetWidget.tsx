import React, { useState, useEffect } from "react";
import { Users, LogOut, ChevronRight, UserPlus, Zap, MessageCircle, ExternalLink, Tv, Users2 } from "lucide-react";
import { RoomSession, Movie } from "../types";

interface DuetWidgetProps {
  myUserId: string;
  onRoomChange: (room: RoomSession | null) => void;
  activeRoom: RoomSession | null;
  filteredMoviesList: Movie[];
  allMovies: Movie[];
}

export const DuetWidget: React.FC<DuetWidgetProps> = ({
  myUserId,
  onRoomChange,
  activeRoom,
  filteredMoviesList,
  allMovies
}) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("moviematch_username") || "";
  });
  const [inputCode, setInputCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      setErrorText("Будь ласка, вкажіть ваше ім'я, щоб створити кімнату!");
      return;
    }
    setErrorText("");
    setIsCreating(true);

    try {
      localStorage.setItem("moviematch_username", userName.trim());
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: myUserId,
          creatorName: userName.trim(),
          movies: allMovies.map(m => m.id)
        })
      });
      const data = await res.json();
      if (res.ok) {
        onRoomChange(data.room);
      } else {
        setErrorText(data.error || "Помилка при створенні кімнати");
      }
    } catch (err) {
      setErrorText("Не вдалося підключитися до сервера");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      setErrorText("Будь ласка, вкажіть ваше ім'я, щоб увійти!");
      return;
    }
    if (!inputCode.trim()) {
      setErrorText("Будь ласка, вкажіть Код Кімнати!");
      return;
    }
    setErrorText("");
    setIsJoining(true);

    try {
      localStorage.setItem("moviematch_username", userName.trim());
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: inputCode.toUpperCase().trim(),
          userId: myUserId,
          userName: userName.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        onRoomChange(data.room);
      } else {
        setErrorText(data.error || "Невірний код кімнати");
      }
    } catch (err) {
      setErrorText("Помилка з'єднання з сервером");
    } finally {
      setIsJoining(false);
    }
  };

  const handleExitRoom = () => {
    onRoomChange(null);
    setInputCode("");
    setErrorText("");
  };

  // Poll room status when active to catch joint swipes & matches
  useEffect(() => {
    if (!activeRoom) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${activeRoom.id}/status`);
        if (res.ok) {
          const data = await res.json();
          onRoomChange(data.room);
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRoom?.id, onRoomChange]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2">
        <Users2 className="w-5 h-5 text-orange-500" />
        <h4 className="text-xs font-sans font-black text-zinc-400 uppercase tracking-widest">
          Режим Компанії & Спільні Свайпи
        </h4>
      </div>

      {!activeRoom ? (
        <div className="space-y-3.5">
          <p className="text-xs text-zinc-450 leading-relaxed font-sans">
            Створіть закриту кімнату, надішліть код друзям, коханим або колегам. Свайпайте разом — і додаток миттєво покаже ті фільми, які **сподобались усім учасникам**!
          </p>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-black">Ваш нікнейм</label>
            <input
              type="text"
              placeholder="Введіть ваше ім'я..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700/60 focus:border-orange-500/50 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="bg-orange-500 hover:bg-orange-400 text-black cursor-pointer px-4 py-2.5 rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 duration-100 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-black animate-pulse" /> {isCreating ? "Створення..." : "Нова Кімната"}
            </button>

            <button
              onClick={() => setErrorText(errorText ? "" : "Вкажіть 4-значний Код Кімнати нижче та натисніть стрілку увійти:")}
              className="bg-zinc-805 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 cursor-pointer px-4 py-2.5 rounded-xl text-xs font-sans font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Ввести Код
            </button>
          </div>

          <div className="space-y-2 pt-1.5 border-t border-zinc-800/60">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Введіть 4-значний код запрошення..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                maxLength={4}
                className="flex-1 bg-zinc-805/55 border border-zinc-750 focus:border-orange-500/40 focus:outline-none rounded-xl px-3 py-2 text-center text-xs font-mono font-bold tracking-widest text-zinc-100 placeholder-zinc-650 placeholder:tracking-normal"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className="bg-zinc-800 hover:bg-orange-500/15 hover:border-orange-500/50 text-zinc-200 border border-zinc-700/50 px-4 rounded-xl text-xs font-sans font-semibold transition-all flex items-center cursor-pointer justify-center disabled:opacity-50"
              >
                {isJoining ? "Вхід..." : <ChevronRight className="w-4 h-4 text-orange-500" />}
              </button>
            </div>
          </div>

          {errorText && (
            <p className="text-[10px] text-orange-400 font-sans leading-relaxed">{errorText}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Active room status banner */}
          <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[9.5px] text-zinc-500 uppercase tracking-widest font-mono font-black">
                Код кімнати компанії
              </p>
              <p className="text-xl font-mono font-black text-orange-500 tracking-widest mt-0.5">
                {activeRoom.id}
              </p>
            </div>
            <button
              onClick={handleExitRoom}
              className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 font-sans border border-zinc-800 hover:border-red-500/20 bg-zinc-900/60 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500" /> Вийти
            </button>
          </div>

          {/* Connected attendees & Swipe counters */}
          <div className="space-y-2">
            <p className="text-[9.5px] text-zinc-500 uppercase tracking-widest font-mono font-black block">
              Склад кімнати ({activeRoom.users.length}):
            </p>
            
            <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
              {activeRoom.users.map((user) => {
                const isMe = user.id === myUserId;
                const swipesCount = activeRoom.swipes?.[user.id] ? Object.keys(activeRoom.swipes[user.id]).length : 0;
                return (
                  <div
                    key={user.id}
                    className="flex justify-between items-center bg-zinc-950/20 border border-zinc-850 p-2.5 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isMe ? "bg-orange-500" : "bg-teal-400"} animate-pulse`} />
                      <span className="font-sans font-bold text-zinc-200">
                        {user.name} {isMe && <span className="text-[9.5px] text-orange-500">(ви)</span>}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-zinc-400 bg-zinc-900 p-1 px-2 border border-zinc-800 rounded-md font-bold">
                      {swipesCount} свайпів
                    </span>
                  </div>
                );
              })}
            </div>

            {activeRoom.users.length < 2 && (
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 text-[10.5px] text-zinc-400 leading-relaxed font-sans mt-1">
                📢 Кімнату активовано! Поділіться кодом запрошення <strong className="text-orange-500 font-mono font-black tracking-widest text-xs bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800">{activeRoom.id}</strong> для синхронного перегляду!
              </div>
            )}
          </div>

          {/* Collaborative Matches List - strictly where EVERY participant swiped "like" */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <p className="text-[9.5px] text-orange-500 uppercase tracking-widest font-mono font-black flex items-center gap-1.5">
              👑 Спільні збіги ({activeRoom.matches.length})
            </p>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {activeRoom.matches.map((mid) => {
                // Find matching movie from moviesDb pool
                const matchedMovie = allMovies.find((m) => m.id === mid);
                if (!matchedMovie) return null;

                return (
                  <div
                    key={mid}
                    className="bg-orange-950/15 border border-orange-500/20 p-2.5 rounded-xl flex gap-2.5 items-center justify-between"
                  >
                    <div className="flex gap-2 min-w-0 items-center">
                      <img
                        src={matchedMovie.posterUrl}
                        alt={matchedMovie.title}
                        className="w-9 h-9 object-cover rounded-lg border border-orange-500/25 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-sans font-bold text-white truncate">
                          {matchedMovie.title}
                        </p>
                        <p className="text-[9.5px] text-orange-400 font-mono truncate">
                          ★ {matchedMovie.rating.toFixed(1)} • {matchedMovie.genres[0]} • {matchedMovie.year}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/search?q=дивитися+${encodeURIComponent(matchedMovie.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 px-1.5 bg-orange-500 text-black rounded-lg gap-0.5 text-[9.5px] font-sans font-black flex items-center flex-shrink-0 cursor-pointer active:scale-95 duration-100"
                    >
                      <Tv className="w-3 h-3 fill-black text-black" /> Стрім <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                );
              })}

              {activeRoom.matches.length === 0 && (
                <p className="text-[11px] text-zinc-500 py-3 italic font-sans text-center">
                  Спільних збігів ще немає. Свайпайте вправо на картки фільмів, які вам до душі, і чекайте інтерес від компанії!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
