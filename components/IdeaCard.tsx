import React from 'react';
import { GameIdea, Difficulty, Genre, GameStatus } from '../types';
import { Terminal, Gamepad2, Brain, Zap, DollarSign, Activity, Heart, CheckCircle, Clock, CircleDashed, Trash2, Sparkles, Dices, FileText, Car, Sword, Ghost, Trophy, Layers, HelpCircle, BookOpen, Globe, LayoutGrid } from 'lucide-react';

interface IdeaCardProps {
  idea: GameIdea;
  isFavorite: boolean;
  isCustom?: boolean;
  status: GameStatus;
  onSelect: (idea: GameIdea) => void;
  onToggleFavorite: (e: React.MouseEvent, id: number) => void;
  onReset: (e: React.MouseEvent, id: number) => void;
}

const getGenreIcon = (genre: Genre) => {
  switch (genre) {
    case Genre.ARCADE: return <Gamepad2 className="w-4 h-4" />;
    case Genre.PUZZLE: return <Brain className="w-4 h-4" />;
    case Genre.STRATEGY: return <Terminal className="w-4 h-4" />;
    case Genre.IDLE: return <DollarSign className="w-4 h-4" />;
    case Genre.ACTION: return <Zap className="w-4 h-4" />;
    case Genre.SIMULATION: return <Activity className="w-4 h-4" />;
    
    // New Genres
    case Genre.RACING: return <Car className="w-4 h-4" />;
    case Genre.RPG: return <Sword className="w-4 h-4" />;
    case Genre.HORROR: return <Ghost className="w-4 h-4" />;
    case Genre.SPORT: return <Trophy className="w-4 h-4" />;
    case Genre.CARD: return <Layers className="w-4 h-4" />;
    case Genre.QUIZ: return <HelpCircle className="w-4 h-4" />;
    case Genre.NOVEL: return <BookOpen className="w-4 h-4" />;
    case Genre.IO: return <Globe className="w-4 h-4" />;
    case Genre.MATCH3: return <LayoutGrid className="w-4 h-4" />;

    default: return <Gamepad2 className="w-4 h-4" />;
  }
};

// Colors for the left border accent
const getDifficultyBorderColor = (diff: Difficulty) => {
  switch (diff) {
    case Difficulty.EASY: return 'border-l-[#23A559]'; // Discord Green
    case Difficulty.MEDIUM: return 'border-l-[#F0B232]'; // Discord Yellow
    case Difficulty.HARD: return 'border-l-[#DA373C]'; // Discord Red
    default: return 'border-l-[#5865F2]';
  }
};

// Pastel colors for the text badges inside
const getDifficultyBadgeStyle = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.EASY: return 'text-emerald-300 bg-emerald-500/10'; 
      case Difficulty.MEDIUM: return 'text-amber-300 bg-amber-500/10'; 
      case Difficulty.HARD: return 'text-rose-300 bg-rose-500/10'; 
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea, isFavorite, isCustom, status, onSelect, onToggleFavorite, onReset }) => {
  // Show delete button if there is progress OR if it is a custom idea (so users can delete their own ideas)
  const hasProgress = status === 'in-progress' || status === 'generated' || status === 'completed';
  const showDelete = hasProgress || isCustom;

  // Logic to show/hide Favorite button
  // We only show the heart for Custom ideas or Randomized ideas.
  // Standard (Basic) ideas cannot be favorited/deleted.
  const showFavorite = isCustom || idea.isRandomized;

  // Render Status Logic
  let statusIcon = <CircleDashed className="w-3.5 h-3.5" />;
  let statusText = 'В планах';
  let statusClass = 'bg-gray-500/10 text-gray-400';

  // --- STATUS LOGIC ---
  if (status === 'generated') {
      // GDD is Ready, but not started yet.
      // Even if favorite, this takes precedence as it's a "state".
      statusIcon = <FileText className="w-3.5 h-3.5" />; 
      statusText = 'План Готов';
      statusClass = 'bg-[#5865F2]/10 text-[#5865F2]';

  } else if (isFavorite && status === 'planned') {
      // Favorite and just planned (Saved Random/Standard)
      statusIcon = <Heart className="w-3.5 h-3.5 fill-current" />;
      statusText = 'Нравится';
      statusClass = 'bg-[#FA777C]/10 text-[#FA777C]';

  } else if (status === 'in-progress') {
      // Active Development
      statusIcon = <Clock className="w-3.5 h-3.5" />;
      statusText = 'В работе';
      statusClass = 'bg-amber-500/10 text-amber-300';

  } else if (status === 'completed') {
      // Finished
      statusIcon = <CheckCircle className="w-3.5 h-3.5" />;
      statusText = 'Готово';
      statusClass = 'bg-emerald-500/10 text-emerald-300';
  }

  return (
    <div 
      className={`group relative bg-[#2B2D31] rounded-r-xl rounded-l-md p-6 pl-5 transition-all duration-300 cursor-pointer flex flex-col h-full min-h-[320px] overflow-hidden border-l-[6px] shadow-md
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 hover:bg-[#2f3136]
        ${getDifficultyBorderColor(idea.difficulty)}
      `}
      onClick={() => onSelect(idea)}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-2 flex-wrap max-w-[75%]">
           <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getDifficultyBadgeStyle(idea.difficulty)}`}>
            {idea.difficulty}
          </div>
          
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${statusClass}`}>
              {statusIcon}
              <span>{statusText}</span>
          </div>

          {isCustom && !idea.isRandomized && (
             <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/20">
                <Sparkles className="w-3 h-3" />
                <span>Своя</span>
             </div>
          )}
          {idea.isRandomized && (
             <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#9C4DCC]/20 text-[#D8B4FE] border border-[#9C4DCC]/20">
                <Dices className="w-3 h-3" />
                <span>Рандом</span>
             </div>
          )}
        </div>
       
        {/* Buttons Container */}
        <div className="flex gap-1 relative z-50">
            {showDelete && (
                <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReset(e, idea.id);
                    }}
                    title={isCustom ? "Удалить идею навсегда" : "Сбросить прогресс и удалить план"}
                    className="p-1.5 rounded-md text-[#949BA4] hover:text-[#DA373C] hover:bg-[#1E1F22] transition-all z-50 cursor-pointer opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="w-5 h-5 pointer-events-none" />
                </button>
            )}
            
            {showFavorite && (
                <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(e, idea.id);
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer z-50 ${isFavorite ? 'text-[#FA777C] bg-[#3B2B2F]' : 'text-[#949BA4] hover:text-[#FA777C] hover:bg-[#1E1F22]'}`}
                    title={isFavorite ? "Убрать из избранного (Удалить)" : "Добавить в избранное"}
                >
                    <Heart className={`w-5 h-5 pointer-events-none ${isFavorite ? 'fill-current' : ''}`} />
                </button>
            )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3 text-[#949BA4] text-xs font-semibold uppercase tracking-widest relative z-0">
        {getGenreIcon(idea.genre)}
        <span>{idea.genre}</span>
      </div>

      <h3 className="text-lg font-bold text-[#F2F3F5] mb-3 group-hover:text-[#5865F2] transition-colors relative z-0 leading-tight line-clamp-2">
        {idea.title}
      </h3>
      
      <p className="text-[#B5BAC1] text-sm mb-6 flex-grow relative z-0 leading-relaxed font-normal line-clamp-4 overflow-hidden text-ellipsis">
        {idea.description}
      </p>
      
      <div className="mt-auto pt-4 border-t border-[#1E1F22]/50 relative z-0">
        <p className="text-xs text-[#5865F2] font-semibold">
          Цель: <span className="text-[#949BA4] font-medium ml-1">{idea.objective}</span>
        </p>
      </div>
    </div>
  );
};