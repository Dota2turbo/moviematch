import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory memory database for DUET (Couple Match) rooms
interface Room {
  id: string;
  users: { id: string; name: string }[];
  movies: any[]; // List of movies currently being swiped
  swipes: {
    [userId: string]: {
      [movieId: string]: "like" | "dislike";
    };
  };
  matches: string[]; // movieId
}

const rooms: { [code: string]: Room } = {};

// Helper to generate a room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Lazy-initialized Gemini Client
let googleAi: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!googleAi) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not set. All AI features will operate in simulated smart mode.");
      return null;
    }
    googleAi = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return googleAi;
}

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// 1. Health & Configuration status Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    aiAvailable: !!process.env.GEMINI_API_KEY,
    currentTime: new Date().toISOString()
  });
});

// 2. AI Concierge / Чат-бот
app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message query" });
  }

  const client = getGeminiClient();

  if (!client) {
    // Elegant fallback simulation if no key is supplied
    setTimeout(() => {
      const query = message.toLowerCase();
      let matchedCategory = "Комедія";
      let matchedDesc = "Я вивчив ваш запит і радий підібрати фільми!";
      let simulatedMovies = [];

      if (query.includes("кос") || query.includes("фантаст") || query.includes("час")) {
        matchedCategory = "Наукова фантастика";
        simulatedMovies = [
          {
            id: "ai-sim-1",
            title: "Інтерстеллар",
            originalTitle: "Interstellar",
            year: 2014,
            genres: ["Наукова фантастика", "Драма"],
            duration: 169,
            rating: 8.7,
            description: "Шедевр про подорожі крізь кротові нори в глибокому космосі задля порятунку людства.",
            tags: ["Космос", "Час", "Гравітація"],
            emojis: ["🧬", "🧠", "😭"],
            streaming: ["Netflix", "Apple TV"],
            hasUkDub: true,
            isUkrainian: false,
            isHiddenGem: false,
            triggers: [],
            posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500"
          },
          {
            id: "ai-sim-2",
            title: "Зв'язок",
            originalTitle: "Coherence",
            year: 2013,
            genres: ["Трилер", "Наукова фантастика"],
            duration: 89,
            rating: 7.2,
            description: "Квантова заплутаність та паралельні виміри на звичайній домашній вечірці друзів.",
            tags: ["Паралельні світи", "Пазл"],
            emojis: ["🧠", "😱", "🧬"],
            streaming: ["Apple TV"],
            hasUkDub: false,
            isUkrainian: false,
            isHiddenGem: true,
            triggers: [],
            posterUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500"
          }
        ];
        matchedDesc = "Ось кілька епічних науково-фантастичних шедеврів про космос і подорожі в часі:";
      } else if (query.includes("романт") || query.includes("любов") || query.includes("кохан")) {
        matchedCategory = "Романтика";
        simulatedMovies = [
          {
            id: "ai-sim-3",
            title: "Ла-Ла Ленд",
            originalTitle: "La La Land",
            year: 2016,
            genres: ["Романтика", "Драма", "Мюзикл"],
            duration: 128,
            rating: 8.0,
            description: "Неймовірно красивий візуальний мюзикл про любов, амбіції та гіркуватий успіх у Лос-Анджелесі.",
            tags: ["Кохання", "Музика", "Голлівуд"],
            emojis: ["❤️", "😭", "😂"],
            streaming: ["Netflix", "Apple TV"],
            hasUkDub: true,
            isUkrainian: false,
            isHiddenGem: false,
            triggers: [],
            posterUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500"
          }
        ];
        matchedDesc = "Для романтичного настрою я обрав прекрасну романтичну мелодраму:";
      } else if (query.includes("укр") || query.includes("солов") || query.includes("карпат")) {
        matchedCategory = "Українське кіно";
        simulatedMovies = [
          {
            id: "ai-sim-4",
            title: "Люксембург, Люксембург",
            originalTitle: "Luxembourg, Luxembourg",
            year: 2022,
            genres: ["Комедія", "Драма"],
            duration: 110,
            rating: 7.9,
            description: "Енергійна українська трагікомедія про зустріч із батьком та колоритні пригоди.",
            tags: ["Українське", "Для гарного настрою", "Гумор"],
            emojis: ["😂", "😭", "🍿"],
            streaming: ["Netflix", "Sweet.tv", "Megogo"],
            hasUkDub: true,
            isUkrainian: true,
            isHiddenGem: false,
            triggers: [],
            posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500"
          }
        ];
        matchedDesc = "Звичайно! Раджу зануритися у чудовий світ сучасного українського кінематографа:";
      } else {
        // Default general selection
        simulatedMovies = [
          {
            id: "ai-sim-5",
            title: "Готель «Гранд Будапешт»",
            originalTitle: "The Grand Budapest Hotel",
            year: 2014,
            genres: ["Комедія", "Драма"],
            duration: 100,
            rating: 8.1,
            description: "Калейдоскопічна та шалено весела стрічка Уеса Андерсона про легендарні пригоди консьєржа.",
            tags: ["Прекрасний візуал", "Гумор", "Пригоди"],
            emojis: ["😂", "🍿", "🧠"],
            streaming: ["Apple TV"],
            hasUkDub: true,
            isUkrainian: false,
            isHiddenGem: false,
            triggers: [],
            posterUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500"
          }
        ];
        matchedDesc = "Ось унікальне кіно з витонченим гумором та захоплюючим візуалом під ваш настрій:";
      }

      res.json({
        text: `🤖 (Режим симуляції) ${matchedDesc} Спробуйте додати реальний API-ключ у налаштуваннях для повної ШІ-генерації на базі мільйонів фільмів!`,
        recommendedMovies: simulatedMovies
      });
    }, 800);
    return;
  }

  try {
    const formattedHistory = history.map((h: any) => ({
      role: h.sender === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...formattedHistory,
        { text: message }
      ],
      config: {
        systemInstruction: `Ти — екстраординарний кіно-консьєрж платформи MovieMatch в Україні (типу \"Tinder для кіно\"). Твоє завдання — розмовляти виключно солов'їною українською мовою з клієнтом, давати дружні, професійні та дотепні поради без сухого канцеляриту.
Обов'язково поверни відповідь у форматі JSON із двома полями:
1. \"text\" (string): дружня розгорнута відповідь українською мовою з поясненням твого вибору.
2. \"recommendedMovies\" (array): список від 1 до 4 запропонованих фільмів, які ідеально підходять під опис користувача.

Для кожного фільму у масиві \"recommendedMovies\" заповни такі обов'язкові поля:
- \"id\" (string) — унікальний стрінговий ID (наприклад, \"ai-gen-interstellar\")
- \"title\" (string) — назва фільму УКРАЇНСЬКОЮ мовою
- \"originalTitle\" (string) — оригінальна назва англійською чи мовою оригіналу
- \"year\" (number) — рік випуску
- \"genres\" (array of strings) — наприклад [\"Фантастика\", \"Драма\"]
- \"duration\" (number) — тривалість у хвилинах
- \"rating\" (number) — орієнтовний рейтинг IMDb (наприклад, 8.4)
- \"description\" (string) — короткий захоплюючий синопсис УКРАЇНСЬКОЮ мовою
- \"tags\" (array of strings) — 3-4 ключові теги українською
- \"emojis\" (array of strings) — 2-3 смайлики настрою (наприклад, [\"🍿\", \"🧠\", \"🧬\"])
- \"streaming\" (array) — платформи де потенційно є фільм в Україні, вибери лише з: [\"Netflix\", \"Megogo\", \"Sweet.tv\", \"Apple TV\"]
- \"hasUkDub\" (boolean) — чи є високоякісний український дубляж (для більшості відомих стрічок ставимо true)
- \"isUkrainian\" (boolean) — чи це питомо український фільм (true/false)
- \"isHiddenGem\" (boolean) — чи це маловідомий шедевр із високою оцінкою (true/false)
- \"triggers\" (array) — тригери, якщо є якісь болючі теми з переліку: [\"violence\", \"tragic-ending\", \"animal-death\"]
- \"posterUrl\" (string) — URL зображення. Будь ласка, вкажи гарний релевантний лінк з Unsplash на тему фільму. Наприклад, для космосу: \"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500\", для релаксу: \"https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500\", для міського детективу чи неону: \"https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=500\", для лісу: \"https://images.unsplash.com/photo-1448375240586-882707db888b?w=500\", або загальний кінотеатр \"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500\".`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "Кіноманське привітання та опис підбірки українською",
            },
            recommendedMovies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  originalTitle: { type: Type.STRING },
                  year: { type: Type.INTEGER },
                  genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                  duration: { type: Type.INTEGER },
                  rating: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  emojis: { type: Type.ARRAY, items: { type: Type.STRING } },
                  streaming: { type: Type.ARRAY, items: { type: Type.STRING } },
                  hasUkDub: { type: Type.BOOLEAN },
                  isUkrainian: { type: Type.BOOLEAN },
                  isHiddenGem: { type: Type.BOOLEAN },
                  triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  posterUrl: { type: Type.STRING },
                },
                required: [
                  "id",
                  "title",
                  "originalTitle",
                  "year",
                  "genres",
                  "duration",
                  "rating",
                  "description",
                  "tags",
                  "emojis",
                  "streaming",
                  "hasUkDub",
                  "isUkrainian",
                  "isHiddenGem",
                  "triggers",
                  "posterUrl"
                ]
              }
            }
          },
          required: ["text", "recommendedMovies"]
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini call error:", error);
    res.status(500).json({
      error: "Не вдалося отримати ШІ-відповідь",
      details: error.message
    });
  }
});

// 3. DUET MODE: Create a Room
app.post("/api/room/create", (req, res) => {
  const { creatorId, creatorName, movies } = req.body;
  if (!creatorId || !creatorName) {
    return res.status(400).json({ error: "Missing creator details" });
  }

  const roomCode = generateRoomCode();
  rooms[roomCode] = {
    id: roomCode,
    users: [{ id: creatorId, name: creatorName }],
    movies: movies || [],
    swipes: {
      [creatorId]: {}
    },
    matches: []
  };

  res.json({
    roomCode,
    room: rooms[roomCode]
  });
});

// 4. DUET MODE: Join a Room
app.post("/api/room/join", (req, res) => {
  const { code, userId, userName } = req.body;
  if (!code || !userId || !userName) {
    return res.status(400).json({ error: "Missing joining metadata" });
  }

  const formattedCode = code.toUpperCase().trim();
  const room = rooms[formattedCode];

  if (!room) {
    return res.status(404).json({ error: "Кімнату не знайдено! Перевірте правильність коду." });
  }

  // Check if user is already in room, else add
  const userExists = room.users.some(u => u.id === userId);
  if (!userExists) {
    room.users.push({ id: userId, name: userName });
    room.swipes[userId] = {};
  }

  res.json({
    roomCode: formattedCode,
    room
  });
});

// 5. DUET MODE: Room Status Polling
app.get("/api/room/:code/status", (req, res) => {
  const { code } = req.params;
  const formattedCode = code.toUpperCase().trim();
  const room = rooms[formattedCode];

  if (!room) {
    return res.status(404).json({ error: "Кімнату не знайдено" });
  }

  res.json({
    room
  });
});

// 6. DUET MODE: Log Swipe and check for matches
app.post("/api/room/swipe", (req, res) => {
  const { code, userId, movieId, vote } = req.body; // vote: 'like' | 'dislike'
  if (!code || !userId || !movieId || !vote) {
    return res.status(400).json({ error: "Missing swipe inputs" });
  }

  const formattedCode = code.toUpperCase().trim();
  const room = rooms[formattedCode];

  if (!room) {
    return res.status(404).json({ error: "Кімнату не знайдено" });
  }

  // Register swipe
  if (!room.swipes[userId]) {
    room.swipes[userId] = {};
  }
  room.swipes[userId][movieId] = vote;

  // Check if match occurred
  // A match occurs if:
  // 1. Current vote is 'like'
  // 2. There are more than 1 user in the room
  // 3. ALL other users in the room have swiped 'like' on this exact movieId
  if (vote === "like" && room.users.length > 1) {
    const isMatched = room.users.every(user => {
      return room.swipes[user.id] && room.swipes[user.id][movieId] === "like";
    });

    if (isMatched && !room.matches.includes(movieId)) {
      room.matches.push(movieId);
    }
  }

  res.json({
    success: true,
    matches: room.matches,
    room
  });
});


// -----------------------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// -----------------------------------------------------------------------------
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Started Vite development middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static assets from dist folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MovieMatch server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Failed to bootstrap MovieMatch server:", err);
});
