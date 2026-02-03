import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GameIdea, WizardOptions, ChatMessage, ArtPrompts, SavedGameContext, Genre, Difficulty, TodoItem, CodeFile } from '../types';
import { MENTOR_SYSTEM_INSTRUCTION } from '../data/mentorInstruction';
import { parseCodeFromResponse } from '../utils/codeParser';
import { GAME_IDEAS } from '../data';

// --- CONFIGURATION ---
const MODEL_NAME = 'gemini-flash-latest'; // The most generous free tier model currently
const MIN_DELAY_BETWEEN_REQUESTS = 4000; // 4 seconds minimum gap between ANY requests globally

// --- GLOBAL STATE ---
let _cachedKeys: string[] | null = null;
let _currentKeyIndex = 0;
let _lastRequestTime = 0; // Timestamp of the last finished request

// --- KEY MANAGEMENT ---

// Fisher-Yates shuffle to distribute load across keys on reload
const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const getApiKeys = (): string[] => {
  if (_cachedKeys !== null) return _cachedKeys;

  const env = (import.meta as any).env || {};
  const keys: string[] = [];

  // 1. Explicit VITE_KEY scan
  for (let i = 1; i <= 50; i++) {
     const key = env[`VITE_KEY_${i}`];
     if (key) keys.push(key);
  }

  // 2. Fallbacks
  if (env.VITE_API_KEY) keys.push(env.VITE_API_KEY);
  if (env.VITE_GEMINI_API_KEY) keys.push(env.VITE_GEMINI_API_KEY);
  
  // 3. Process env (if available)
  try {
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          keys.push(process.env.API_KEY);
      }
  } catch(e) {}

  // Deduplicate and filter
  const uniqueKeys = [...new Set(keys)].filter(k => k && k.length > 20);
  
  // Randomize order on startup!
  _cachedKeys = shuffleArray(uniqueKeys);

  if (_cachedKeys.length > 0) {
      console.log(`🔑 [Gemini] Loaded ${_cachedKeys.length} keys (Randomized order).`);
  } else {
      console.warn("⚠️ [Gemini] No keys found.");
  }

  return _cachedKeys;
};

const getClient = (): GoogleGenAI => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error("No API Keys configured");
    return new GoogleGenAI({ apiKey: keys[_currentKeyIndex] });
};

const rotateKey = () => {
    const keys = getApiKeys();
    if (keys.length <= 1) return;
    const prev = _currentKeyIndex;
    _currentKeyIndex = (_currentKeyIndex + 1) % keys.length;
    console.log(`🔄 [Gemini] Rotate Key: #${prev + 1} -> #${_currentKeyIndex + 1}`);
};

// --- ROBUST RETRY LOGIC ---

async function withRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>, maxRetries = 3): Promise<T> {
  const keys = getApiKeys();
  
  // 1. GLOBAL THROTTLE
  // Ensure we never fire requests faster than allowed, regardless of where they come from.
  const now = Date.now();
  const timeSinceLast = now - _lastRequestTime;
  
  if (timeSinceLast < MIN_DELAY_BETWEEN_REQUESTS) {
      const waitTime = MIN_DELAY_BETWEEN_REQUESTS - timeSinceLast;
      // console.log(`⏳ Throttling request for ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ai = getClient();
    
    try {
      const result = await operation(ai);
      
      // Update global timestamp on success
      _lastRequestTime = Date.now();
      return result;

    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      const status = error.status;

      // Detect Rate Limits
      const isRateLimit = 
        status === 429 || 
        status === 503 || 
        msg.includes('resource_exhausted') || 
        msg.includes('too many requests') ||
        msg.includes('overloaded');

      if (!isRateLimit) {
        // If it's a logic error (400, 401, etc), fail immediately.
        console.error("❌ API Error (Non-retriable):", msg);
        throw error;
      }

      // If we are out of retries, fail.
      if (attempt === maxRetries) {
        console.error("💀 Max retries reached. Quota exhausted.");
        throw new Error("Слишком много запросов. Подождите минуту или смените ключ.");
      }

      console.warn(`⚠️ Rate Limit (Attempt ${attempt + 1}/${maxRetries}). Rotating & Waiting...`);
      
      // Rotate Key immediately
      rotateKey();

      // Exponential Backoff + Jitter
      // Attempt 0: ~2s + jitter
      // Attempt 1: ~4s + jitter
      // Attempt 2: ~8s + jitter
      const baseDelay = 2000 * Math.pow(2, attempt); 
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reset throttle timer so we don't double-wait at the top of the loop
      _lastRequestTime = Date.now() - MIN_DELAY_BETWEEN_REQUESTS; 
    }
  }

  throw new Error("Unexpected error in retry loop");
}


// --- STYLE HELPERS ---
const getStyleSuffix = (style: string): string => {
  const s = style.toLowerCase();
  if (s.includes('standard') || s.includes('ordinary')) return `Style: Standard 2D Game Art, high quality digital painting, clean smooth edges, vivid colors, casual game sprite, high resolution, no pixel art, no 3D effect.`;
  if (s.includes('casual') || s.includes('mobile 3d')) return `Style: Casual Mobile 3D, glossy render, cute 3d, clay material, soft lighting, octane render, 4k.`;
  if (s.includes('pixel')) return `Style: Pixel Art, 16-bit, sharp outlines, limited palette, retro aesthetic, pixel perfect, clean edges.`;
  if (s.includes('vector') || s.includes('2d')) return `Style: Vector Art, Adobe Illustrator, flat design, cel shading, clean thick outlines, solid colors, svg style.`;
  if (s.includes('low poly')) return `Style: Low Poly 3D, flat shading, sharp edges, PS1 aesthetic, minimalistic geometry.`;
  return `Style: ${style}, high quality game asset.`;
};


// --- GDD GENERATION ---
export const getGameImplementationDetails = async (idea: GameIdea, options: WizardOptions): Promise<string> => {
  const prompt = `
    Ты - Lead Game Designer.
    Задача: Составить подробный GDD для игры "${idea.title}" (${idea.genre}).
    
    ПАРАМЕТРЫ:
    - РЕЖИМ: ${options.dimension}
    - Стиль: ${options.style}
    - ПЛАТФОРМА: Яндекс Игры (WebGL)
    
    Суть: ${idea.description}
    
    СТРУКТУРА:
    1. Концепция.
    2. Геймплей.
    3. **АРТ-БИБЛИЯ**:
       Для каждого ассета (Герой, Враг, Фон) опиши:
       - Вид.
       - MUST HAVE.
       - MUST NOT HAVE (Если простая форма, ПИШИ "NO FACE, NO EYES").
    4. Техническая реализация (Unity 2021.3 LTS).
    5. **Интеграция Yandex Games**:
       - Реклама (Interstitial/Rewarded).
       - Лидерборд (Очки/Рекорды).
       - Сохранения (Yandex Saves).

    Markdown формат.
  `;

  try {
    const response = await withRetry((ai) => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    })) as GenerateContentResponse;
    return response.text || "Ошибка генерации.";
  } catch (e: any) {
    const msg = e.message || JSON.stringify(e);
    if (msg.includes('location')) return "⛔ **Ошибка доступа (Geo-block):** Включите VPN.";
    return "Ошибка API: " + msg;
  }
};

// --- HELPER TO CLEAN JSON ---
const cleanJsonOutput = (text: string): string => {
  if (!text) return "[]";
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned;
};

// --- TODO LIST GENERATION ---
export const getGameTasks = async (gdd: string, title: string): Promise<TodoItem[]> => {
  const prompt = `
    Ты - Senior Project Manager.
    Задача: Создать УНИКАЛЬНЫЙ чеклист разработки именно для игры "${title}".
    
    ОСНОВЫВАЯСЬ НА ЭТОМ GDD:
    ${gdd.substring(0, 5000)}...

    Создай 12-15 КОНКРЕТНЫХ шагов.
    НЕ ПИШИ общие фразы ("Создать игрока"). 
    ПИШИ КОНКРЕТНО ("Игрок: Реализовать управление карточной колодой" или "Физика: Настроить отскок гоблина").
    
    ⚠️ ОБЯЗАТЕЛЬНО:
    ПОСЛЕДНИЕ 2-3 ШАГА ДОЛЖНЫ БЫТЬ ПРО ЯНДЕКС ИГРЫ:
    - Интеграция SDK (PluginYG).
    - Настройка Рекламы (Rewarded/Interstitial).
    - Билд WebGL и загрузка в консоль.

    Язык: РУССКИЙ.

    ФОРМАТ ОБЯЗАТЕЛЕН (JSON ARRAY):
    [
      { "id": "1", "text": "Проект: Создать 2D проект в Unity Hub", "completed": false },
      { "id": "2", "text": "Гоблин: Настроить Rigidbody2D и коллайдер", "completed": false },
      ...
      { "id": "14", "text": "Яндекс: Импортировать PluginYG и добавить префаб", "completed": false },
      { "id": "15", "text": "Релиз: Сделать билд WebGL и загрузить архив", "completed": false }
    ]
    
    ТОЛЬКО ВАЛИДНЫЙ JSON МАССИВ. БЕЗ MARKDOWN.
  `;

  try {
    const response = await withRetry((ai) => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    })) as GenerateContentResponse;

    const rawText = response.text || "[]";
    const cleanedText = cleanJsonOutput(rawText);
    
    let data;
    try {
        data = JSON.parse(cleanedText);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        const arrayMatch = rawText.match(/\[\s*{[\s\S]*}\s*\]/);
        if (arrayMatch) {
            data = JSON.parse(arrayMatch[0]);
        } else {
            throw new Error("Invalid JSON structure");
        }
    }

    return data.map((item: any, idx: number) => ({
      id: item.id ? String(item.id) : `task-${idx}`,
      text: item.text || "Задача без названия",
      completed: false
    }));

  } catch (e) {
    console.warn("Failed to generate tasks, using fallback.");
    return [
      { id: '1', text: "Старт: Создать проект в Unity Hub", completed: false },
      { id: '2', text: "Сцена: Настроить камеру и фон", completed: false },
      { id: '3', text: "Игрок: Добавить главного героя", completed: false },
      { id: '4', text: "Механика: Реализовать базовое управление", completed: false },
      { id: '5', text: "Яндекс: Подключить SDK и Рекламу", completed: false },
      { id: '6', text: "Ошибка AI: Не удалось сгенерировать детальный план", completed: false }
    ];
  }
};

// --- RANDOM IDEA GENERATION ---
export const generateRandomIdea = async (lockedDifficulty?: Difficulty): Promise<GameIdea> => {
  
  // --- EXTENDED ARCHETYPES SYSTEM ---
  // Expanded to cover ALL genres from the user's list (Racing, Horror, RPG, etc.)
  
  const ARCHETYPES = [
      { 
          id: 'CASUAL_RELAX', 
          weight: 0.2, 
          themes: ['Coffee Shop', 'Pet Salon', 'Farm', 'Fishing', 'Truck Driver', 'Organizing Room', 'Pizza Chef', 'Makeover'],
          mechanics: ['Drag and Drop', 'Clicking', 'Time Management', 'Decorating', 'Simple Sorting'],
          desc: "Relaxing, cozy, simple. Genre: Симулятор, Кликер/Idle, Казуальная (Аркада)."
      },
      { 
          id: 'CLASSIC_ARCADE_PUZZLE', 
          weight: 0.15, 
          themes: ['Neon Balls', 'Falling Bricks', 'Snakes', 'Bubbles', 'Match-3 Candy', 'Card Solitaire', 'Mahjong', 'Hidden Object'],
          mechanics: ['Matching Colors', 'Physics Bouncing', 'Grid Logic', 'Finding Pairs', 'Stacking'],
          desc: "Classic puzzle or arcade logic. Genre: Три в ряд, Шарики, Головоломка, Карточная, Настольная."
      },
      { 
          id: 'ACTION_DRIVE_SHOOT', 
          weight: 0.15, 
          themes: ['Racing Cars', 'Drift', 'Zombie Shooter', 'Space Battle', 'Tank War', 'Sniper', 'Ninja Parkour'],
          mechanics: ['Driving Physics', 'Shooting', 'Dodging', 'High Speed', 'Precision Aiming'],
          desc: "Adrenaline, speed, or combat. Genre: Гонки, Экшн, Спорт, Боевики, Шутер."
      },
      { 
          id: 'MIDCORE_RPG_STRATEGY', 
          weight: 0.15, 
          themes: ['Fantasy Kingdom', 'Tower Defense', 'Dungeon Crawler', 'Space Colony', 'Gladiator Arena', 'Evolution', 'Idle RPG'],
          mechanics: ['Upgrading Stats', 'Building Base', 'Turn-Based Combat', 'Resource Management', 'Unit Control'],
          desc: "Deeper mechanics, progression. Genre: РПГ, Стратегия, Мидкорные."
      },
      { 
          id: 'HORROR_MYSTERY', 
          weight: 0.1, 
          themes: ['Haunted House', 'Night Shift', 'Backrooms', 'Escape Room', 'Detective Story', 'Scary Forest'],
          mechanics: ['Flashlight', 'Hidden Keys', 'Jumpscares', 'Reading Notes', 'Running Away'],
          desc: "Scary or mysterious. Genre: Хоррор, Приключения, Новелла."
      },
      { 
          id: 'IO_COMPETITIVE', 
          weight: 0.1, 
          themes: ['Worms', 'Black Holes', 'Tanks', 'Cells', 'Paper IO', 'Battle Royale (Mini)'],
          mechanics: ['Eat to Grow', 'Last Man Standing', 'Multiplayer (Fake/Bot)'],
          desc: "Competitive arena style. Genre: IO, Аркада, Для двоих."
      },
      { 
          id: 'QUIZ_TRIVIA', 
          weight: 0.05, 
          themes: ['Geography', 'Flags', 'Math Speed', 'Guess the Logo', 'History', 'Movie Quotes'],
          mechanics: ['4 Options', 'True/False', 'Typing Answer'],
          desc: "Intellectual. Genre: Викторина, Обучающие."
      },
       { 
          id: 'ABSURD_FUN', 
          weight: 0.1, 
          themes: ['Goose Chaos', 'Ragdoll Physics', 'Food Fighting', 'Screaming Goat', 'Chair Racing'],
          mechanics: ['Broken Physics', 'Funny Controls', 'Chaos'],
          desc: "Just for fun/memes. Genre: Аркада, Симулятор."
      }
  ];

  // Weighted Random Selection
  const totalWeight = ARCHETYPES.reduce((acc, a) => acc + a.weight, 0);
  let randomVal = Math.random() * totalWeight;
  let selectedArchetype = ARCHETYPES[0];
  
  for (const archetype of ARCHETYPES) {
      if (randomVal < archetype.weight) {
          selectedArchetype = archetype;
          break;
      }
      randomVal -= archetype.weight;
  }

  const randomTheme = selectedArchetype.themes[Math.floor(Math.random() * selectedArchetype.themes.length)];
  const randomMechanic = selectedArchetype.mechanics[Math.floor(Math.random() * selectedArchetype.mechanics.length)];

  const difficultyPrompt = lockedDifficulty 
    ? `CONSTRAINT: Difficulty MUST be "${lockedDifficulty}".`
    : `Difficulty: Random (Easy, Medium or Hard).`;

  const prompt = `
    Generate a UNIQUE game idea for a Game Jam.
    
    FORCE ARCHETYPE: ${selectedArchetype.id} (${selectedArchetype.desc})
    SEED THEME: ${randomTheme}
    SEED MECHANIC: ${randomMechanic}
    
    ALLOWED GENRES (Choose one that fits best):
    - Аркада, Головоломка, Стратегия, Кликер/Idle, Экшн, Симулятор
    - Гонки, РПГ, Хоррор, Спорт, Карточная, Викторина
    - Новелла, IO, Три в ряд
    
    INSTRUCTIONS:
    1. If Archetype is HORROR, Genre MUST be "Хоррор" or "Приключения".
    2. If Archetype is RACING, Genre MUST be "Гонки".
    3. If Archetype is RPG, Genre MUST be "РПГ".
    4. If Archetype is PUZZLE/MATCH-3, Genre MUST be "Три в ряд", "Шарики" or "Головоломка".
    5. Be creative! Title must be in Russian.
    
    ${difficultyPrompt}
    
    OUTPUT FORMAT: JSON ONLY.
    {
      "title": "Title in Russian",
      "description": "Short gameplay description (2-3 sentences)",
      "objective": "One sentence goal",
      "genre": "Exact string from Allowed Genres list above",
      "difficulty": "One from: Легко, Средне, Сложно"
    }
    Language: Russian.
  `;

  try {
    const response = await withRetry((ai) => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    })) as GenerateContentResponse;
    
    const cleanedText = cleanJsonOutput(response.text || "{}");
    const data = JSON.parse(cleanedText);
    
    // Fallback if AI invents a genre not in our list, defaults to Arcade
    const validGenres = Object.values(Genre);
    const safeGenre = validGenres.includes(data.genre) ? data.genre : Genre.ARCADE;

    return {
        id: Date.now(),
        title: data.title || "Random Game",
        description: data.description || "No description generated.",
        objective: data.objective || "Just play.",
        genre: safeGenre,
        difficulty: Object.values(Difficulty).includes(data.difficulty) ? data.difficulty : Difficulty.MEDIUM,
        isRandomized: true
    };
  } catch (e) {
    console.error("Random Gen Error", e);
    throw new Error("Failed to generate random idea");
  }
};

// --- ART GENERATION ---
export const getArtPrompts = async (idea: GameIdea, style: string, gddContext: string): Promise<ArtPrompts> => {
  const styleSuffix = getStyleSuffix(style);
  const prompt = `
    Role: Senior Art Director.
    Task: Create 4 ULTRA-DETAILED AI prompts (JSON) for "${idea.title}".
    SOURCE MATERIAL: ${gddContext} 
    RULES: Start with SUBJECT. If GDD says "NO FACE", add "featureless, blank, no eyes". End with style: "${styleSuffix}". Background: "Isolated on white".
    Output JSON: character, enemy, environment, ui.
  `;
  try {
    const response = await withRetry((ai) => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    })) as GenerateContentResponse;
    const cleanedText = cleanJsonOutput(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e) {
    return { character: "Error", enemy: "Error", environment: "Error", ui: "Error" };
  }
};

// --- MENTOR CHAT ---
export const sendMentorMessage = async (
  gameContext: SavedGameContext,
  userMessage: string,
  isNextStep: boolean,
  userImageBase64?: string,
  gameTitle?: string
): Promise<{ text: string; files: CodeFile[] }> => {
  
  const actualTitle = gameTitle || GAME_IDEAS.find(g => g.id === gameContext.id)?.title || "MyGame";
  const isFirstStep = gameContext.chatHistory.length === 0;

  let contextBlock = "";
  
  if (isFirstStep) {
      contextBlock = `
      === СТАРТ НОВОГО ПРОЕКТА ===
      ИГРА: "${actualTitle}"
      РЕЖИМ: ${gameContext.wizardOptions.dimension}
      
      СЕЙЧАС МЫ ТОЛЬКО НАЧИНАЕМ. ЗАБУДЬ ПРО ГЕЙМПЛЕЙ, ПЕРСОНАЖЕЙ И КОД.
      ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА СЕЙЧАС — ПОМОЧЬ МНЕ СОЗДАТЬ ПУСТОЙ ПРОЕКТ В UNITY HUB.
      НИ ШАГУ ДАЛЬШЕ.
      `;
  } else {
      const historyText = gameContext.chatHistory.slice(-15).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      contextBlock = `
        === КОНТЕКСТ ПРОЕКТА ===
        ИГРА: "${actualTitle}" (${gameContext.wizardOptions.dimension})
        СТАТУС: ${gameContext.status}
        GDD (Кратко): ${gameContext.gdd.slice(0, 500)}...
        
        === ПОСЛЕДНИЕ СКРИПТЫ ===
        ${gameContext.codeFiles.map(f => `[${f.name}]:\n${f.content.slice(0, 300)}...`).join('\n')}
    
        === ИСТОРИЯ ЧАТА ===
        ${historyText}
      `;
  }

  let taskBlock = "";

  if (isNextStep || isFirstStep) { 
    const styleSuffix = getStyleSuffix(gameContext.wizardOptions.style);
    
    if (isFirstStep) {
         taskBlock = `
         === ЗАДАЧА (ПЕРВЫЙ ЗАПУСК) ===
         Пользователь нажал "В РАБОТУ".
         ТЫ ОБЯЗАН ВЫПОЛНИТЬ ПРАВИЛО №6 (PROJECT SETUP).
         
         🔴 КРИТИЧЕСКИ ВАЖНО (ИМЯ ПРОЕКТА):
         Название игры: "${actualTitle}".
         
         Ты должен сгенерировать имя для Unity проекта (Project Name).
         ПРАВИЛА ФОРМИРОВАНИЯ ИМЕНИ:
         1. Если в названии ЕСТЬ английский текст в скобках (например "Название (English Name)"), ИСПОЛЬЗУЙ ТОЛЬКО ТО, ЧТО В СКОБКАХ. Не переводи заново!
            Пример: "Кулинарный Прыжок (Culinary Leap)" -> ДОЛЖНО БЫТЬ "CulinaryLeap", А НЕ "CulinaryJump".
         2. Если английского текста нет, переведи название на английский язык.
         3. Убери все пробелы. Используй стиль PascalCase (слитное написание с большой буквы).
         
         ТВОИ ШАГИ:
         1. Приветствие. Скажи: "Привет! 🔥 Я Юни, твой личный наставник! Начинаем делать игру ${actualTitle}!"
         2. Инструкция: Открыть Unity Hub -> New Project -> 2021.3.45f2 -> Шаблон ${gameContext.wizardOptions.dimension}.
         3. Инструкция: В поле "Project Name" напиши строго: [ТВОЙ_РЕЗУЛЬТАТ_ПО_ПРАВИЛАМ_ВЫШЕ].
         4. Инструкция: Создать проект и ждать открытия.
         5. Инструкция: Layout 2 by 3.
         6. Инструкция: Build Settings -> WebGL.
         
         НИКАКОГО КОДА. НИКАКИХ СЦЕН. ТОЛЬКО СОЗДАНИЕ ПУСТОГО ПРОЕКТА.
         `;
    } else {
        taskBlock = `
        === ЗАДАЧА (СЛЕДУЮЩИЙ ШАГ) ===
        Пользователь нажал "Следующий шаг" (или галочку).
        Это значит, что предыдущий шаг ВЫПОЛНЕН УСПЕШНО.
        
        ТВОЯ ЦЕЛЬ:
        1. Проанализируй историю чата. Какой был последний шаг?
        2. Определи СЛЕДУЮЩИЙ логический шаг разработки игры "${actualTitle}".
        3. Выдай инструкцию по этому новому шагу.
        
        ВАЖНО:
        - Если предыдущий шаг был "Создание проекта", то сейчас создаем структуру папок (Scripts, Sprites, Scenes).
        - Если папки есть, создаем ГГ (Главного Героя) - спрайт и физику.
        - И так далее.
        
        ФОРМАТ:
        Используй ШАБЛОН ОТВЕТА из Системной Инструкции.
        Стиль: ${styleSuffix}.
        `;
    }
  } else {
      taskBlock = `
      === ВОПРОС ПОЛЬЗОВАТЕЛЯ ===
      Пользователь задал вопрос или прислал скриншот.
      ТВОЯ ЗАДАЧА: Ответить на вопрос, помочь исправить ошибку или объяснить непонятное.
      Не переходи к новому шагу, пока пользователь не попросит или не нажмет кнопку.
      
      Сообщение пользователя: "${userMessage}"
      `;
  }

  const prompt = `
    ${MENTOR_SYSTEM_INSTRUCTION}
    
    ${contextBlock}
    
    ${taskBlock}
  `;

  const parts: any[] = [{ text: prompt }];

  if (userImageBase64) {
      const matches = userImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
          parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
      }
  }

  try {
    const response = await withRetry((ai) => ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
    })) as GenerateContentResponse;

    const rawText = response.text || "Ошибка: Пустой ответ от ментора.";
    return parseCodeFromResponse(rawText);

  } catch (e: any) {
    console.error("Mentor Chat Error:", e);
    return { text: "⚠️ Ошибка связи с Ментором: " + (e.message || "Unknown error"), files: [] };
  }
};