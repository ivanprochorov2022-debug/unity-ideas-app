
import React, { useState, useEffect, useRef } from 'react';
import { X, Dices, RefreshCw, CheckCircle, Wand2, Sparkles, Box, Square, Gauge, ChevronDown, ChevronUp, Heart, Clock } from 'lucide-react';
import { GameIdea, Genre, Difficulty, WizardOptions } from '../types';
import { generateRandomIdea } from '../services/geminiService';

interface RandomizerModalProps {
  onClose: () => void;
  onAccept: (idea: GameIdea, options: WizardOptions) => void;
  onSaveToFavorites: (idea: GameIdea) => void;
}

const SAMPLE_TITLES = ["Cyber Ninja", "Space Potato", "Dungeon Tycoon", "Neon Racer", "Zombie Farm", "Quantum Chess"];
const SAMPLE_GENRES = Object.values(Genre);
const SAMPLE_DIFFICULTIES = Object.values(Difficulty);

export const RandomizerModal: React.FC<RandomizerModalProps> = ({ onClose, onAccept, onSaveToFavorites }) => {
  const [loading, setLoading] = useState(true);
  const [generatedIdea, setGeneratedIdea] = useState<GameIdea | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer State
  const [elapsedTime, setElapsedTime] = useState(0);

  // Local state to track if current idea is favorited
  const [isFavorited, setIsFavorited] = useState(false);

  // Animation States
  const [displayTitle, setDisplayTitle] = useState(SAMPLE_TITLES[0]);
  const [displayGenre, setDisplayGenre] = useState(SAMPLE_GENRES[0]);
  const [displayDiff, setDisplayDiff] = useState(SAMPLE_DIFFICULTIES[0]);

  // Settings
  const [dimension, setDimension] = useState<'2D' | '3D'>('2D');
  const [lockedDifficulty, setLockedDifficulty] = useState<Difficulty | null>(null);

  // Dropdown State
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // STRICT MODE GUARD
  const hasSpun = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDiffOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedTime(0); // Reset on start
      const startTime = Date.now();
      interval = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 1000);
      }, 100); // Update every 100ms for smoothness
    }
    return () => clearInterval(interval);
  }, [loading]);

  const spin = async () => {
    setLoading(true);
    setGeneratedIdea(null);
    setError(null);
    setIsFavorited(false); // Reset favorite state on new spin

    // Start Animation Loop
    const interval = setInterval(() => {
        setDisplayTitle(SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)]);
        setDisplayGenre(SAMPLE_GENRES[Math.floor(Math.random() * SAMPLE_GENRES.length)]);
        setDisplayDiff(SAMPLE_DIFFICULTIES[Math.floor(Math.random() * SAMPLE_DIFFICULTIES.length)]);
    }, 100);

    try {
        // Pass the locked difficulty if set
        const idea = await generateRandomIdea(lockedDifficulty || undefined);
        setGeneratedIdea(idea);
        
    } catch (e) {
        setError("AI не ответил. Возможно, кончились лимиты ключа.");
    } finally {
        clearInterval(interval);
        setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (!hasSpun.current) {
        hasSpun.current = true;
        spin();
    }
  }, []);

  const handleAccept = () => {
    if (!generatedIdea) return;
    const options: WizardOptions = {
        dimension: dimension,
        style: dimension === '3D' ? 'Casual Mobile 3D' : 'Standard 2D',
        platform: 'WebGL (Desktop & Mobile)',
        timeframe: 'Game Jam (48h)'
    };
    onAccept(generatedIdea, options);
  };

  const handleFavoriteClick = () => {
      if (!generatedIdea) return;
      onSaveToFavorites(generatedIdea);
      setIsFavorited(!isFavorited); // Toggle local visual state
  };

  // Helper for Dropdown list colors
  const getDifficultyColor = (diff: Difficulty | null) => {
      switch(diff) {
          case Difficulty.EASY: return 'text-emerald-400';
          case Difficulty.MEDIUM: return 'text-amber-400';
          case Difficulty.HARD: return 'text-rose-400';
          default: return 'text-[#F2F3F5]';
      }
  };

  // Helper for Dropdown hover background
  const getDifficultyBg = (diff: Difficulty | null) => {
      switch(diff) {
          case Difficulty.EASY: return 'bg-emerald-500/10 hover:bg-emerald-500/20';
          case Difficulty.MEDIUM: return 'bg-amber-500/10 hover:bg-amber-500/20';
          case Difficulty.HARD: return 'bg-rose-500/10 hover:bg-rose-500/20';
          default: return 'bg-[#1E1F22] hover:bg-[#2B2D31]';
      }
  };

  // Helper for the Result Badge (Central Display)
  const getBadgeStyle = (diff: string | null | undefined) => {
      switch(diff) {
          case Difficulty.EASY: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          case Difficulty.MEDIUM: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          case Difficulty.HARD: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
          default: return 'bg-[#1E1F22] text-[#949BA4] border-[#2B2D31]';
      }
  };

  // Determine which difficulty text to show currently
  const currentDiffText = loading ? displayDiff : generatedIdea?.difficulty;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-[#1E1F22] rounded-3xl shadow-2xl max-w-lg w-full p-1 overflow-hidden border border-[#5865F2]/30">
        
        {/* Animated Gradient Border */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/20 via-transparent to-[#9C4DCC]/20 pointer-events-none" />

        <div className="relative bg-[#2B2D31] rounded-[22px] p-6 sm:p-8 flex flex-col items-center text-center h-full">
            
            <button onClick={onClose} className="absolute top-4 right-4 text-[#949BA4] hover:text-white transition-colors z-30">
                <X size={24} />
            </button>

            <div className="mb-4 relative">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5865F2] to-[#9C4DCC] flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Dices size={40} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                 </div>
                 {loading && <div className="absolute inset-0 rounded-full animate-ping bg-[#5865F2] opacity-30"></div>}
            </div>

            <h2 className="text-2xl font-bold text-[#F2F3F5] mb-1">
                {loading ? "Генерация Идеи..." : "Твой Челлендж!"}
            </h2>
            
            {/* TIMER & STATUS */}
            <div className="h-6 mb-4 flex items-center justify-center gap-2">
                {loading ? (
                    <>
                        <p className="text-[#949BA4] text-sm">AI перебирает варианты</p>
                        <div className="bg-[#1E1F22] px-2 py-0.5 rounded-md border border-[#26272D] flex items-center gap-1.5">
                            <Clock size={12} className="text-[#5865F2] animate-pulse"/>
                            <span className="font-mono text-xs text-[#F2F3F5] font-bold min-w-[36px] text-right">
                                {elapsedTime.toFixed(1)}s
                            </span>
                        </div>
                    </>
                ) : (
                    <p className="text-[#949BA4] text-sm">Уникальная идея создана</p>
                )}
            </div>

            {/* SLOT MACHINE DISPLAY */}
            <div className="w-full bg-[#111214] rounded-2xl p-6 border border-[#26272D] mb-6 shadow-inner relative overflow-hidden group min-h-[160px] flex flex-col pt-8">
                
                {loading && (
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" style={{ backgroundSize: '200% 200%' }}></div>
                )}
                
                {/* FAVORITE BUTTON (Top Right of Slot Machine) */}
                {!loading && generatedIdea && (
                    <button
                        onClick={handleFavoriteClick}
                        className="absolute top-3 right-3 p-2 rounded-full bg-[#1E1F22]/80 hover:bg-[#2B2D31] text-[#949BA4] hover:text-[#FA777C] transition-all z-20 shadow-md backdrop-blur-sm group"
                        title={isFavorited ? "Убрать из избранного" : "Сохранить в избранное"}
                    >
                        <Heart className={isFavorited ? "fill-[#FA777C] text-[#FA777C]" : ""} size={20} />
                    </button>
                )}

                {/* Genre & Diff Badges */}
                <div className="flex justify-center gap-3 mb-4 relative z-10">
                    <div className="px-3 py-1 rounded-md bg-[#5865F2]/10 text-[#5865F2] text-xs font-bold uppercase tracking-wider border border-[#5865F2]/20 min-w-[80px]">
                        {loading ? displayGenre : generatedIdea?.genre}
                    </div>
                    {/* FIXED: DYNAMIC COLOR BADGE */}
                    <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border min-w-[80px] ${getBadgeStyle(currentDiffText)}`}>
                        {currentDiffText}
                    </div>
                </div>

                {/* Title */}
                <h3 className={`text-xl md:text-2xl font-black text-white mb-3 transition-opacity relative z-10 ${loading ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
                    {loading ? displayTitle : generatedIdea?.title}
                </h3>

                {/* Description - Scrollable Area */}
                <div className={`relative z-10 w-full overflow-y-auto custom-scrollbar max-h-[120px] px-1 ${loading ? 'opacity-40 overflow-hidden' : ''}`}>
                    <p className="text-[#B5BAC1] text-sm leading-relaxed">
                        {loading ? "Analyzing game mechanics and mixing genres..." : generatedIdea?.description}
                    </p>
                </div>

                {!loading && generatedIdea && (
                    <div className="mt-4 pt-4 border-t border-[#26272D] relative z-10">
                         <p className="text-xs text-[#5865F2] font-bold">Цель: <span className="text-[#949BA4] font-normal">{generatedIdea.objective}</span></p>
                    </div>
                )}
            </div>

            {error && <p className="text-[#DA373C] text-sm mb-4 bg-[#DA373C]/10 p-2 rounded-lg border border-[#DA373C]/20">{error}</p>}

            {/* ACTION BUTTONS */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={spin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2B2D31] hover:bg-[#35373C] text-[#949BA4] hover:text-white font-bold transition-all border border-[#26272D]"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    {loading ? "Думаю..." : "Другую"}
                </button>
                
                <button 
                    onClick={handleAccept}
                    disabled={loading || !generatedIdea}
                    className="relative overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white font-bold shadow-lg hover:shadow-[#5865F2]/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none"
                >
                    <Sparkles size={18} />
                    Принять Вызов
                </button>
            </div>

            {/* SETTINGS SECTION (FILTERS) */}
            <div className="w-full pt-4 border-t border-[#26272D] animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Dimension Toggle */}
                    <div className="bg-[#111214] p-1.5 rounded-xl border border-[#26272D] flex gap-1">
                        <button 
                            onClick={() => setDimension('2D')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${dimension === '2D' ? 'bg-[#404249] text-white shadow-sm' : 'text-[#949BA4] hover:text-[#dbdee1]'}`}
                        >
                            <Square size={14} /> 2D
                        </button>
                        <button 
                            onClick={() => setDimension('3D')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${dimension === '3D' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-[#949BA4] hover:text-[#dbdee1]'}`}
                        >
                            <Box size={14} /> 3D
                        </button>
                    </div>

                    {/* Custom Styled Difficulty Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDiffOpen(!isDiffOpen)}
                            className="w-full bg-[#111214] border border-[#26272D] hover:border-[#404249] rounded-xl p-3 flex justify-between items-center transition-all text-xs font-bold group"
                        >
                            <div className="flex items-center gap-2">
                                <Gauge size={16} className="text-[#949BA4]"/>
                                <span className={getDifficultyColor(lockedDifficulty)}>
                                    {lockedDifficulty || "Сложность: Случайно"}
                                </span>
                            </div>
                            {isDiffOpen ? <ChevronUp size={16} className="text-[#949BA4]"/> : <ChevronDown size={16} className="text-[#949BA4] group-hover:text-white"/>}
                        </button>

                        {isDiffOpen && (
                            <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#111214] border border-[#26272D] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={() => { setLockedDifficulty(null); setIsDiffOpen(false); }}
                                    className="w-full text-left p-2.5 rounded-lg hover:bg-[#2B2D31] text-xs font-bold text-[#F2F3F5] flex items-center gap-2 transition-colors"
                                >
                                    <Dices size={14} className="text-[#949BA4]"/> Случайно
                                </button>
                                <div className="h-px bg-[#26272D] my-1 opacity-50"></div>
                                {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((diff) => (
                                    <button
                                        key={diff}
                                        onClick={() => { setLockedDifficulty(diff); setIsDiffOpen(false); }}
                                        className={`w-full text-left p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors mb-0.5 ${getDifficultyBg(diff)}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${diff === Difficulty.EASY ? 'bg-emerald-500' : diff === Difficulty.MEDIUM ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                        <span className={diff === Difficulty.EASY ? 'text-emerald-300' : diff === Difficulty.MEDIUM ? 'text-amber-300' : 'text-rose-300'}>{diff}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
                <p className="text-[10px] text-[#949BA4]/60 mt-3">
                    Настройки применятся к следующей генерации (кнопка "Другую")
                </p>
            </div>

        </div>
      </div>
    </div>
  );
};
