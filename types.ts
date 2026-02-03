export enum Difficulty {
  EASY = 'Легко',
  MEDIUM = 'Средне',
  HARD = 'Сложно'
}

export enum Genre {
  ARCADE = 'Аркада',
  PUZZLE = 'Головоломка',
  STRATEGY = 'Стратегия',
  IDLE = 'Кликер/Idle',
  ACTION = 'Экшн',
  SIMULATION = 'Симулятор',
  RACING = 'Гонки',
  RPG = 'РПГ',
  HORROR = 'Хоррор',
  SPORT = 'Спорт',
  CARD = 'Карточная',
  QUIZ = 'Викторина',
  NOVEL = 'Новелла',
  IO = 'IO',
  MATCH3 = 'Три в ряд'
}

export interface GameIdea {
  id: number;
  title: string;
  description: string;
  objective: string;
  difficulty: Difficulty;
  genre: Genre;
  isRandomized?: boolean; // New flag to track if idea came from "I'm Feeling Lucky"
}

export type GameStatus = 'planned' | 'generated' | 'in-progress' | 'completed';

export interface UserProgress {
  favorites: number[];
  gameStatuses: Record<number, GameStatus>; 
}

export interface WizardOptions {
  style: string;
  platform: string;
  timeframe: string;
  dimension: '2D' | '3D';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64
}

export interface CodeVersion {
  version: number;
  content: string;
  timestamp: number;
}

export interface CodeFile {
  name: string;
  language: string;
  content: string; // Always holds the latest content for easy access
  versions: CodeVersion[]; // History of changes
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SavedGameContext {
  id: number;
  lastUpdated: number;
  status: GameStatus;
  wizardOptions: WizardOptions;
  gdd: string;
  chatHistory: ChatMessage[];
  codeFiles: CodeFile[];
  artPrompts: ArtPrompts | null;
  todoList?: TodoItem[]; 
}

export interface ArtPrompts {
  character: string;
  enemy: string;
  environment: string;
  ui: string;
}