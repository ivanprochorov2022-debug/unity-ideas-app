
import React, { useState, useRef, useEffect } from 'react';
import { GameIdea, Genre, Difficulty, WizardOptions } from '../types';
import { X, Upload, Plus, Box, Square, AlertCircle, ChevronDown } from 'lucide-react';

interface CreateIdeaModalProps {
  onClose: () => void;
  onCreate: (idea: GameIdea, options: WizardOptions) => void;
}

// --- DUPLICATED CONSTANTS & COMPONENTS FOR CONSISTENCY ---
// Ideally these would be in a shared file, but for this structure we keep them self-contained.

const STYLE_DESCRIPTIONS: Record<string, string> = {
  "Standard 2D": "Классический, качественный 2D арт (как Cut the Rope, PVZ). Чистая цифровая рисовка, гладкие края, без пикселей и без 3D эффектов. Идеальный стандарт.",
  "Casual Mobile 3D": "Сочный, 'леденцовый' стиль (как Match Arena, Homescapes). Персонажи и объекты выглядят как 3D-игрушки с мягким светом и глянцем, но используются как 2D спрайты.",
  "Pixel Art (2D)": "Классический ретро-стиль с четкими пикселями. Идеально подходит для ностальгических платформеров, рогаликов и инди-игр.",
  "Vector (2D)": "Чистая, масштабируемая графика с четкими линиями и плоскими цветами (Flat Art). Современный, минималистичный и аккуратный вид.",
  "Low Poly (3D)": "Угловатые 3D модели с малым количеством полигонов. Стильный минимализм, который отлично работает в WebGL и дает высокую производительность."
};

const PLATFORM_DESCRIPTIONS: Record<string, string> = {
  "WebGL (Desktop & Mobile)": "Игра будет работать и на ПК, и на телефонах. Ментор поможет настроить адаптивное управление (мышь + тачскрин).",
  "WebGL (Desktop)": "Оптимизация только под ПК. Можно использовать клавиатуру и мышь без ограничений. Проще в разработке, но меньше аудитория."
};

const TIMEFRAME_DESCRIPTIONS: Record<string, string> = {
  "Game Jam (48h)": "Экстремальный режим. Фокус на одной главной механике (Core Loop). Минимум контента, максимум фана. Идеально для прототипа.",
  "1 Неделя": "Сбалансированный темп. Хватит времени на меню, звуки, простой UI и 3-5 уровней. Хорошо для первого законченного проекта.",
  "1 Месяц": "Серьезный подход. Полноценная игра с сюжетом, сложными системами, сохранениями и полировкой графики."
};

const InfoTooltip = ({ text, position = 'top' }: { text: string, position?: 'top' | 'left' }) => (
  <div className="group relative flex items-center justify-center p-1 rounded-full transition-colors ml-2 cursor-help" onClick={(e) => e.stopPropagation()}>
    <AlertCircle size={18} className="text-[#949BA4] group-hover:text-[#5865F2] transition-colors" />
    <div className={`absolute ${position === 'left' ? 'right-full mr-3 top-1/2 -translate-y-1/2' : 'bottom-full mb-3 left-1/2 -translate-x-1/2'} w-64 p-3 bg-[#111214] text-xs text-[#dbdee1] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] shadow-2xl border border-[#26272D] leading-relaxed text-center`}>
      {text}
      {position === 'top' && <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#111214]"></div>}
      {position === 'left' && <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-[#111214]"></div>}
    </div>
  </div>
);

const CustomSelect: React.FC<{
  value: string;
  options: string[];
  onChange: (val: string) => void;
  descriptions: Record<string, string>;
}> = ({ value, options, onChange, descriptions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full bg-[#1E1F22] hover:bg-[#26272D] border border-transparent ${isOpen ? 'border-[#5865F2] ring-2 ring-[#5865F2]/20' : ''} rounded-xl p-3.5 text-[#F2F3F5] cursor-pointer transition-all flex justify-between items-center group`}
      >
        <span className="font-medium truncate mr-2">{value}</span>
        <div className="flex items-center">
            <ChevronDown size={18} className={`text-[#949BA4] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#F2F3F5]' : ''}`} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#2B2D31] border border-[#1E1F22] rounded-xl shadow-2xl z-[60] animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden">
          {options.map((opt) => (
            <div 
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`p-3.5 flex justify-between items-center cursor-pointer transition-colors border-b border-[#1E1F22]/50 last:border-none ${opt === value ? 'bg-[#404249] text-white' : 'text-[#dbdee1] hover:bg-[#35373C]'}`}
            >
              <span className="text-sm font-medium">{opt}</span>
              {descriptions[opt] && (
                 <div onClick={(e) => e.stopPropagation()}> 
                   <InfoTooltip text={descriptions[opt]} position="left" />
                 </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export const CreateIdeaModal: React.FC<CreateIdeaModalProps> = ({ onClose, onCreate }) => {
  // Basic Info
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>(Genre.ARCADE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Options
  const [dimension, setDimension] = useState<'2D' | '3D'>('2D');
  const [style, setStyle] = useState('Standard 2D'); // NEW DEFAULT PRIORITY
  const [platform, setPlatform] = useState('WebGL (Desktop & Mobile)');
  const [timeframe, setTimeframe] = useState('Game Jam (48h)');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDescription(prev => prev ? prev + '\n\n' + text : text);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const newIdea: GameIdea = {
      id: Date.now(),
      title,
      genre,
      difficulty,
      description,
      objective: objective || "Сделать эту игру!" 
    };

    const options: WizardOptions = {
        dimension,
        style,
        platform,
        timeframe
    };
    
    onCreate(newIdea, options);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-[#313338] rounded-2xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#26272D] bg-[#2B2D31]">
                <h3 className="text-xl font-bold text-[#F2F3F5]">Добавить свою идею</h3>
                <button onClick={onClose} className="text-[#949BA4] hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
                
                {/* --- BASIC INFO SECTION --- */}
                <div className="space-y-5 mb-8">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">Название игры</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Например: Super Mega RPG"
                            className="w-full bg-[#1E1F22] text-[#F2F3F5] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#5865F2] placeholder-[#4f5258]"
                            required
                        />
                    </div>

                    {/* Genre & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">Жанр</label>
                            <div className="relative">
                                <select 
                                    value={genre}
                                    onChange={e => setGenre(e.target.value as Genre)}
                                    className="w-full bg-[#1E1F22] text-[#F2F3F5] rounded-xl p-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#5865F2] cursor-pointer"
                                >
                                    {Object.values(Genre).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">Сложность</label>
                            <div className="relative">
                                <select 
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                                    className="w-full bg-[#1E1F22] text-[#F2F3F5] rounded-xl p-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#5865F2] cursor-pointer"
                                >
                                    {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-[#949BA4] uppercase tracking-wider">Описание идеи</label>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs flex items-center gap-1.5 text-[#5865F2] hover:text-[#4752c4] bg-[#5865F2]/10 px-2 py-1 rounded-md transition-colors font-medium"
                            >
                                <Upload size={12} /> Загрузить из .txt
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                accept=".txt"
                                onChange={handleFileChange}
                            />
                        </div>
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Опиши геймплей, механики и особенности..."
                            className="w-full h-24 bg-[#1E1F22] text-[#F2F3F5] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#5865F2] resize-none leading-relaxed placeholder-[#4f5258]"
                            required
                        />
                    </div>

                    {/* Objective */}
                    <div>
                        <label className="block text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">Цель игры (кратко)</label>
                        <input 
                            type="text" 
                            value={objective}
                            onChange={e => setObjective(e.target.value)}
                            placeholder="Например: Победить босса или набрать 1000 очков"
                            className="w-full bg-[#1E1F22] text-[#F2F3F5] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#5865F2] placeholder-[#4f5258]"
                        />
                    </div>
                </div>

                {/* --- TECHNICAL SETTINGS SECTION --- */}
                <div className="pt-6 border-t border-[#26272D] space-y-6">
                    <h4 className="text-[#F2F3F5] font-bold text-lg mb-4 flex items-center gap-2">
                        Настройка Игры
                    </h4>

                     {/* DIMENSION SELECTOR */}
                     <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Режим (Физика и Камера)</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             type="button"
                             onClick={() => setDimension('2D')}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                dimension === '2D' 
                                ? 'bg-[#5865F2]/10 border-[#5865F2] text-[#F2F3F5]' 
                                : 'bg-[#1E1F22] border-transparent text-[#949BA4] hover:bg-[#26272D]'
                             }`}
                           >
                              <Square size={24} className="mb-1" />
                              <span className="text-sm font-bold">2D</span>
                              <span className="text-[10px] opacity-60">Спрайты, Rigidbody2D</span>
                           </button>

                           <button 
                             type="button"
                             onClick={() => setDimension('3D')}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                dimension === '3D' 
                                ? 'bg-[#5865F2]/10 border-[#5865F2] text-[#F2F3F5]' 
                                : 'bg-[#1E1F22] border-transparent text-[#949BA4] hover:bg-[#26272D]'
                             }`}
                           >
                              <Box size={24} className="mb-1" />
                              <span className="text-sm font-bold">3D</span>
                              <span className="text-[10px] opacity-60">Меши, Collider, Свет</span>
                           </button>
                        </div>
                      </div>

                      {/* STYLE SELECT */}
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Стиль (Визуал и AI Промпты)</label>
                        <CustomSelect 
                            value={style}
                            onChange={setStyle}
                            options={["Standard 2D", "Casual Mobile 3D", "Pixel Art (2D)", "Vector (2D)", "Low Poly (3D)"]}
                            descriptions={STYLE_DESCRIPTIONS}
                        />
                      </div>

                      {/* PLATFORM SELECT */}
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Платформа</label>
                        <CustomSelect 
                            value={platform}
                            onChange={setPlatform}
                            options={["WebGL (Desktop & Mobile)", "WebGL (Desktop)"]}
                            descriptions={PLATFORM_DESCRIPTIONS}
                        />
                      </div>

                      {/* TIMEFRAME SELECT */}
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Время</label>
                        <CustomSelect 
                            value={timeframe}
                            onChange={setTimeframe}
                            options={["Game Jam (48h)", "1 Неделя", "1 Месяц"]}
                            descriptions={TIMEFRAME_DESCRIPTIONS}
                        />
                      </div>
                </div>

                <div className="pt-8">
                    <button 
                        type="submit" 
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 active:scale-[0.98]"
                    >
                        <Plus size={20} /> Создать Идею
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
