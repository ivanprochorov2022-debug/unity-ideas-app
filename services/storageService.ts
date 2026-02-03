
import { UserProgress, SavedGameContext, GameStatus, GameIdea } from '../types';

const PROGRESS_KEY = 'unityIdeasProgress';
const GAME_KEY_PREFIX = 'unity_game_';
const CUSTOM_IDEAS_KEY = 'unity_custom_ideas';

export const storageService = {
  // --- Global Progress (Index) ---
  getUserProgress: (): UserProgress => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      return saved ? JSON.parse(saved) : { favorites: [], gameStatuses: {} };
    } catch (e) {
      console.error("Storage Error:", e);
      return { favorites: [], gameStatuses: {} };
    }
  },

  saveUserProgress: (progress: UserProgress) => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error("Storage Write Error:", e);
    }
  },

  // --- Individual Game Data ---
  getGameData: (id: number): SavedGameContext | null => {
    try {
      const saved = localStorage.getItem(`${GAME_KEY_PREFIX}${id}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  },

  saveGameData: (data: SavedGameContext) => {
    try {
      localStorage.setItem(`${GAME_KEY_PREFIX}${data.id}`, JSON.stringify(data));
    } catch (e) {
      console.error("Game Save Error:", e);
    }
  },

  // --- Custom Ideas ---
  getCustomIdeas: (): GameIdea[] => {
    try {
      const saved = localStorage.getItem(CUSTOM_IDEAS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Custom Ideas Load Error:", e);
      return [];
    }
  },

  saveCustomIdea: (idea: GameIdea): GameIdea[] => {
    const current = storageService.getCustomIdeas();
    // Prevent duplicates if idea already exists
    if (current.some(i => i.id === idea.id)) return current;
    
    const updated = [idea, ...current]; // Add new ideas to the top
    localStorage.setItem(CUSTOM_IDEAS_KEY, JSON.stringify(updated));
    return updated;
  },

  removeCustomIdeaFromList: (id: number): GameIdea[] => {
     const current = storageService.getCustomIdeas();
     const updated = current.filter(i => i.id !== id);
     localStorage.setItem(CUSTOM_IDEAS_KEY, JSON.stringify(updated));
     return updated;
  },

  // --- Atomic Operations ---
  
  // Completely removes a game and updates the index
  deleteGame: (id: number): UserProgress => {
    // 1. Remove the detailed game data file
    localStorage.removeItem(`${GAME_KEY_PREFIX}${id}`);

    // 2. Get the current progress index
    const current = storageService.getUserProgress();

    // 3. Update statuses: remove the status for the deleted game
    const newStatuses = { ...current.gameStatuses };
    delete newStatuses[id];

    // 4. Update favorites: remove the game from favorites as well
    const newFavorites = current.favorites.filter(favId => favId !== id);

    // 5. Assemble the new progress object
    const newProgress = { 
        ...current, 
        gameStatuses: newStatuses,
        favorites: newFavorites
    };
    
    // 6. Save the updated index
    storageService.saveUserProgress(newProgress);
    
    // 7. Return it to update the UI
    return newProgress;
  },

  updateStatus: (id: number, status: GameStatus): UserProgress => {
    const current = storageService.getUserProgress();
    // Only update if changed to avoid redundant writes
    if (current.gameStatuses[id] === status) return current;

    const newProgress = {
      ...current,
      gameStatuses: { ...current.gameStatuses, [id]: status }
    };
    storageService.saveUserProgress(newProgress);
    return newProgress;
  },

  toggleFavorite: (id: number): UserProgress => {
    const current = storageService.getUserProgress();
    const isFav = current.favorites.includes(id);
    const newFavs = isFav 
      ? current.favorites.filter(f => f !== id) 
      : [...current.favorites, id];
    
    const newProgress = { ...current, favorites: newFavs };
    storageService.saveUserProgress(newProgress);
    return newProgress;
  }
};
