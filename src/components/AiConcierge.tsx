import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, Loader2, Plus, ShieldAlert } from "lucide-react";
import { ChatMessage, Movie as MovieType } from "../types";

interface AiConciergeProps {
  onAppendMovies: (movies: MovieType[]) => void;
  activeChatHistory: ChatMessage[];
  onSetChatHistory: (history: ChatMessage[]) => void;
}

export const AiConcierge: React.FC<AiConciergeProps> = ({
  onAppendMovies,
  activeChatHistory,
  onSetChatHistory
}) => {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString("uk-UA", { hour: "numeric", minute: "2-digit" })
    };

    onSetChatHistory([...activeChatHistory, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: activeChatHistory.slice(-6) // Send recent message history to stay within tokens and preserve context
        })
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: "ai",
          text: data.text,
          timestamp: new Date().toLocaleTimeString("uk-UA", { hour: "numeric", minute: "2-digit" }),
          recommendedMovies: data.recommendedMovies
        };
        onSetChatHistory([...activeChatHistory, userMessage, aiMessage]);
      } else {
        throw new Error(data.error || "Невідома помилка під час запиту");
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: "ai",
        text: `🤔 Ой! На жаль, у мене виникла помилка підключення. Перевірте підключення до мережі або секретні ключі: ${error.message}`,
        timestamp: new Date().toLocaleTimeString("uk-UA", { hour: "numeric", minute: "2-digit" })
      };
      onSetChatHistory([...activeChatHistory, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportMovies = (movies: MovieType[], msgId: string) => {
    onAppendMovies(movies);
    // Mark imported in state text
    onSetChatHistory(
      activeChatHistory.map((msg) => {
        if (msg.id === msgId) {
          return { ...msg, imported: true } as any;
        }
        return msg;
      })
    );
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 flex flex-col h-[480px] shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h4 className="text-xs font-sans font-black text-zinc-450 uppercase tracking-widest flex items-center gap-1.5">
            ШІ-Консьєрж <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
          </h4>
        </div>
        <span className="text-[10px] bg-orange-500/10 text-orange-400 font-mono px-2 py-0.5 rounded border border-orange-500/20 uppercase font-bold tracking-wider">
          Online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3 scrollbar-thin scrollbar-thumb-zinc-800 custom-chat-box">
        {activeChatHistory.length === 0 && (
          <div className="text-center py-6 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto border border-orange-500/20 text-orange-500 text-lg">
              🤖
            </div>
            <p className="text-xs text-zinc-355 font-sans leading-relaxed">
              Привіт! Я твій особистий кіно-консьєрж. Напиши мені, що ти хочеш подивитися!
            </p>
            <p className="text-[10px] text-zinc-500 font-sans italic leading-tight">
              Наприклад: "Хочу щось схоже на 'Початок', але романтичніше в космосі" або "Порадь вечірню затишну комедію без темних кінцівок"
            </p>
          </div>
        )}

        {activeChatHistory.map((message) => {
          const isAi = message.sender === "ai";
          const hasRecs = message.recommendedMovies && message.recommendedMovies.length > 0;
          const isImported = (message as any).imported;

          return (
            <div
              key={message.id}
              className={`flex flex-col max-w-[85%] ${isAi ? "self-start align-left text-left" : "self-end ml-auto text-right"}`}
            >
              <div
                className={`p-3 rounded-2xl text-xs font-sans leading-relaxed shadow-sm ${
                  isAi
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-tl-none text-left"
                    : "bg-orange-600 text-black font-semibold rounded-tr-none text-left"
                }`}
              >
                {message.text}

                {/* Recommendations */}
                {hasRecs && (
                  <div className="mt-3 space-y-2 pt-2.5 border-t border-zinc-700/60">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                      💡 Персональні збіги від ШІ:
                    </p>
                    <div className="space-y-1.5">
                      {message.recommendedMovies?.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-[11px] bg-zinc-900/60 border border-zinc-800 px-2 py-1.5 rounded-lg text-zinc-200"
                        >
                          <div>
                            <span className="font-semibold text-zinc-50 text-[11px] block">{m.title}</span>
                            <span className="text-[9.5px] text-zinc-450 block font-mono">{m.originalTitle} ({m.year})</span>
                          </div>
                          <span className="text-orange-500 font-bold font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded-sm">
                            ★{m.rating.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleImportMovies(message.recommendedMovies!, message.id)}
                      disabled={isImported}
                      className={`w-full mt-2 py-1.5 rounded-lg text-[10px] font-sans font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        isImported
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                          : "bg-orange-500 hover:bg-orange-400 text-black border border-orange-500/20 active:scale-95 duration-150"
                      }`}
                    >
                      {isImported ? (
                        <>✓ Додано до свайп-дек!</>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Додати фільми до Tinder-дев'ятки
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-zinc-550 mt-0.5 px-1 font-mono">{message.timestamp}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 self-start bg-zinc-800/40 border border-zinc-800/40 p-3 rounded-2xl rounded-tl-none max-w-[70%] text-zinc-400 text-xs text-left">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
            <span className="font-sans">Консьєрж підбирає фільми...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Form */}
      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 pt-2 border-t border-zinc-800/50">
        <input
          type="text"
          placeholder="Напишіть настрій чи сюжет тут..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-zinc-800/40 border border-zinc-800 focus:border-orange-500/50 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black cursor-pointer p-2 rounded-xl transition-all font-sans"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
