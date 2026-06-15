import React from "react";
import { Sparkles, Route as RotateCcw } from "lucide-react";
import { AVAILABLE_EMOJIS } from "../data";

interface EmojiFilterProps {
  selectedEmojis: string[];
  onChange: (emojis: string[]) => void;
}

export const EmojiFilter: React.FC<EmojiFilterProps> = ({ selectedEmojis, onChange }) => {
  const toggleEmoji = (char: string) => {
    if (selectedEmojis.includes(char)) {
      onChange(selectedEmojis.filter((e) => e !== char));
    } else {
      // Limit to max 3 emoji combinations as per design
      if (selectedEmojis.length >= 3) {
        onChange([...selectedEmojis.slice(1), char]);
      } else {
        onChange([...selectedEmojis, char]);
      }
    }
  };

  const handleReset = () => {
    onChange([]);
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-3xl text-left space-y-4 shadow-xl backdrop-blur-md">
      <div className="flex justify-between items-center sm:gap-2">
        <h4 className="text-xs font-sans font-black text-zinc-450 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-500" /> Настрій за емодзі
        </h4>
        {selectedEmojis.length > 0 && (
          <button
            onClick={handleReset}
            className="text-[11px] text-orange-500 hover:text-orange-400 cursor-pointer font-sans transition-colors underline"
          >
            Очистити
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {AVAILABLE_EMOJIS.map((emoji) => {
          const isSelected = selectedEmojis.includes(emoji.char);
          return (
            <button
              key={emoji.char}
              onClick={() => toggleEmoji(emoji.char)}
              title={emoji.label}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-center relative ${
                isSelected
                  ? "bg-orange-500/10 border-orange-500 text-zinc-100 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-[1.02]"
                  : "bg-zinc-800/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-350"
              }`}
            >
              <span className="text-2xl mb-1 filter drop-shadow">{emoji.char}</span>
              <span className="text-[10px] truncate max-w-full font-sans font-medium">{emoji.label}</span>
              {isSelected && (
                <span className="absolute top-1 right-1.5 text-[8px] bg-orange-500 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                  {selectedEmojis.indexOf(emoji.char) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedEmojis.length > 0 ? (
        <p className="text-[11px] text-zinc-400 align-middle leading-relaxed font-sans italic">
          Поєднано: <strong className="text-orange-500 text-sm font-semibold">{selectedEmojis.join(" + ")}</strong> (Шукаємо фільми, які відповідають цим емоціям)
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500 font-sans">
          Оберіть від 1 до 3 смайликів вище для унікального набору почуттів!
        </p>
      )}
    </div>
  );
};
