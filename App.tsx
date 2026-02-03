
import React, { useState, useMemo, useEffect } from 'react';
import { GAME_IDEAS } from './data';
import { GameIdea, Genre, Difficulty, GameStatus, UserProgress, WizardOptions, SavedGameContext } from './types';
import { IdeaCard } from './components/IdeaCard';
import { Modal } from './components/Modal';
import { CreateIdeaModal } from './components/CreateIdeaModal';
import { RandomizerModal } from './components/RandomizerModal';
import { storageService } from './services/storageService';
import { Gamepad2, Filter, Search, Heart, Briefcase, CheckCircle, Trash2, Trophy, Plus, User, Sparkles, Dices, BookOpen, Rocket } from 'lucide-react';

// Modern Soft Confirmation Modal
const ConfirmationModal = ({ onConfirm, onCancel, ideaTitle, isCustom }: { onConfirm: () => void, onCancel: () => void, ideaTitle: string, isCustom: boolean }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-[#313338] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-[#2b2d31] mb-4 shadow-inner">
          <Trash2 className="w-8 h-8 text-[#DA373C]" />
        </div>
        <h3 className="text-xl font-bold text-[#F2F3F5] mb-2">{isCustom ? "Удалить идею?" : "Сбросить проект?"}</h3>
        <p className="text-[#949BA4] mb-6 text-sm leading-relaxed">
          {isCustom 
            ? <>Идея <strong className="text-[#F2F3F5]">"{ideaTitle}"</strong> будет удалена из вашего списка навсегда, так как она хранится только в избранном.</>
            : <>Проект <strong className="text-[#F2F3F5]">"{ideaTitle}"</strong> будет удален навсегда вместе с чатом и кодом.</>
          }
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-[#2b2d31] hover:bg-[#404249] text-[#F2F3F5] font-medium transition-colors text-sm">
            Отмена
          </button>
          <button onClick={onConfirm} className="px-6 py-2.5 rounded-xl bg-[#DA373C] hover:bg-[#A1282C] text-white font-medium transition-colors text-sm shadow-lg shadow-red-900/20">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SEPARATOR HEADER COMPONENT ---
const SectionHeader = ({ title, icon: Icon, colorClass, subtitle }: { title: string, icon: any, colorClass: string, subtitle?: string }) => (
  <div className="w-full flex items-center gap-4 mb-6 mt-2 animate-in fade-in slide-in-from-left-2 duration-500">
      <div className={`p-2 rounded-xl bg-[#1E1F22] border border-[#26272D] shadow-sm ${colorClass}`}>
         <Icon size={20} />
      </div>
      <div className="flex-grow h-px bg-[#26272D]"></div>
      <div className="px-4 py-1.5 rounded-full bg-[#1E1F22] border border-[#26272D] text-[#dbdee1] font-bold text-sm uppercase tracking-wider shadow-sm flex items-center gap-2">
         {title}
         {subtitle && <span className="text-[10px] text-[#949BA4] bg-[#2B2D31] px-1.5 py-0.5 rounded-md ml-1">{subtitle}</span>}
      </div>
      <div className="flex-grow h-px bg-[#26272D]"></div>
  </div>
);

const App: React.FC = () => {
  const [selectedIdea, setSelectedIdea] = useState<GameIdea | null>(null);
  const [filterGenre, setFilterGenre] = useState<Genre | 'All'>('All');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeView, setActiveView] = useState<'all' | 'custom' | 'favorites' | 'in-progress' | 'completed'>('all');

  // Custom Ideas State
  const [customIdeas, setCustomIdeas] = useState<GameIdea[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);

  const [userProgress, setUserProgress] = useState<UserProgress>(() => storageService.getUserProgress());
  
  // Состояние для управления новым окном подтверждения
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  useEffect(() => {
    setCustomIdeas(storageService.getCustomIdeas());
  }, []);

  const allIdeas = useMemo(() => {
    // SORT ORDER: Standard Games (Data.ts) FIRST, then Custom Ideas.
    return [...GAME_IDEAS, ...customIdeas];
  }, [customIdeas]);

  // REFACTORED TOGGLE FAVORITE LOGIC
  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const isFav = userProgress.favorites.includes(id);

    if (isFav) {
        // --- REMOVING FROM FAVORITES ---
        // Check if it's a Custom or Randomized idea AND not active (in-progress/completed)
        // If it is Custom/Random and just in "Liked" state (planned/generated), removing heart should DELETE it.
        const isCustomOrRandom = customIdeas.some(i => i.id === id);
        const status = userProgress.gameStatuses[id];
        const isActive = status === 'in-progress' || status === 'completed';

        if (isCustomOrRandom && !isActive) {
            // It's a custom idea in the "holding pen" (Favorites). Un-liking deletes it.
            setConfirmingDelete(id);
        } else {
            // Standard behavior for built-in games OR active projects (just un-heart)
            const newProgress = storageService.toggleFavorite(id);
            setUserProgress(newProgress);
        }
    } else {
        // --- ADDING TO FAVORITES ---
        const newProgress = storageService.toggleFavorite(id);
        setUserProgress(newProgress);
    }
  };

  // NEW: Force remove favorite (used when GDD is generated and idea moves to 'Custom')
  const handleForceUnfavorite = (id: number) => {
    if (userProgress.favorites.includes(id)) {
        const newProgress = storageService.toggleFavorite(id);
        setUserProgress(newProgress);
    }
  };

  const handleUpdateStatus = (id: number, status: GameStatus) => {
    const newProgress = storageService.updateStatus(id, status);
    setUserProgress(newProgress);
  };
  
  const requestDeleteConfirmation = (id: number) => {
    setConfirmingDelete(id);
  };
  
  const executeDelete = () => {
    if (confirmingDelete === null) return;
    
    // 1. Delete progress
    const newProgress = storageService.deleteGame(confirmingDelete);
    setUserProgress(newProgress);
    
    // 2. Delete if it's a custom idea
    if (customIdeas.some(i => i.id === confirmingDelete)) {
        const updatedCustom = storageService.removeCustomIdeaFromList(confirmingDelete);
        setCustomIdeas(updatedCustom);
    }

    setConfirmingDelete(null);

    if (selectedIdea && selectedIdea.id === confirmingDelete) {
        setSelectedIdea(null);
    }
  };
  
  const cancelDelete = () => {
    setConfirmingDelete(null);
  };
  
  const ideaToConfirm = useMemo(() => {
    if (confirmingDelete === null) return null;
    return allIdeas.find(idea => idea.id === confirmingDelete);
  }, [confirmingDelete, allIdeas]);

  const isConfirmingCustom = useMemo(() => {
      if (!ideaToConfirm) return false;
      return customIdeas.some(c => c.id === ideaToConfirm.id);
  }, [ideaToConfirm, customIdeas]);

  const handleCreateIdea = (newIdea: GameIdea, initialOptions: WizardOptions) => {
    // 1. Save the basic idea definition to custom ideas list
    const updated = storageService.saveCustomIdea(newIdea);
    setCustomIdeas(updated);

    // 2. Initialize the GameContext immediately with the selected WizardOptions.
    // This ensures that when the user opens the card, the "Settings" are already pre-filled.
    const initialContext: SavedGameContext = {
        id: newIdea.id,
        lastUpdated: Date.now(),
        status: 'planned',
        wizardOptions: initialOptions, 
        gdd: '',
        chatHistory: [],
        codeFiles: [],
        artPrompts: null
    };
    storageService.saveGameData(initialContext);

    setIsCreateModalOpen(false);
    setIsRandomizerOpen(false); // Close randomizer if that's where we came from

    // Optional: Auto open the new idea
    setSelectedIdea(newIdea);
  };

  const handleSaveToFavorites = (idea: GameIdea) => {
    // 1. Save to custom ideas (if not exists)
    const updatedIdeas = storageService.saveCustomIdea(idea);
    setCustomIdeas(updatedIdeas);
    
    // 2. Toggle favorite
    const updatedProgress = storageService.toggleFavorite(idea.id);
    setUserProgress(updatedProgress);
  };

  // --- FILTERING LOGIC ---
  const filteredIdeas = useMemo(() => {
    return allIdeas.filter(idea => {
      const isCustom = customIdeas.some(c => c.id === idea.id);
      const status = userProgress.gameStatuses[idea.id] || 'planned';
      const isFavorite = userProgress.favorites.includes(idea.id);

      // --- STRICT PIPELINE VIEW LOGIC ---
      
      if (activeView === 'all') {
         // TAB: ALL IDEAS
         if (status === 'completed') return false;
      } 
      else if (activeView === 'custom') {
         // TAB: СВОИ (CUSTOM)
         // Pipeline Stage 2: Workspace
         // 1. Must be a Custom Idea.
         // 2. Must NOT be Active ('in-progress', 'completed').
         // 3. LOGIC: 
         //    - Show if GDD is Generated (status === 'generated').
         //    - OR Show if it was manually created (NOT a favorite, status 'planned').
         //    - HIDE if it is just a favorite with no GDD (It belongs in Favorites tab).
         
         if (!isCustom) return false;
         if (status === 'in-progress' || status === 'completed') return false;

         if (isFavorite && status !== 'generated') return false; 
      } 
      else if (activeView === 'favorites') {
         // TAB: ИЗБРАННОЕ (FAVORITES)
         // Pipeline Stage 1: Staging Area
         // 1. Must be Favorited.
         // 2. LOGIC:
         //    - Show ONLY if status is 'planned'.
         //    - If status is 'generated', it moved to 'Custom'.
         //    - If status is 'in-progress', it moved to 'In Progress'.
         
         if (!isFavorite) return false;
         if (status !== 'planned') return false;
      } 
      else if (activeView === 'in-progress') {
         // TAB: В РАБОТЕ (IN PROGRESS)
         // Pipeline Stage 3: Active Development
         if (status !== 'in-progress') return false;
      }
      else if (activeView === 'completed') {
         // TAB: COMPLETED
         if (status !== 'completed') return false;
      }

      // --- STANDARD FILTERS ---
      const matchGenre = filterGenre === 'All' || idea.genre === filterGenre;
      const matchDiff = filterDifficulty === 'All' || idea.difficulty === filterDifficulty;
      const matchSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idea.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchGenre && matchDiff && matchSearch;
    });
  }, [filterGenre, filterDifficulty, searchQuery, activeView, userProgress, allIdeas, customIdeas]);

  // --- SPLIT LOGIC FOR 'ALL' VIEW ---
  const { standardIdeas, userCustomIdeas } = useMemo(() => {
      const std: GameIdea[] = [];
      const cst: GameIdea[] = [];
      
      filteredIdeas.forEach(idea => {
         const isCustom = customIdeas.some(c => c.id === idea.id);
         if (isCustom) cst.push(idea);
         else std.push(idea);
      });
      
      return { standardIdeas: std, userCustomIdeas: cst };
  }, [filteredIdeas, customIdeas]);


  return (
    <div className="min-h-screen bg-[#313338] text-[#dbdee1] font-sans selection:bg-[#5865F2] selection:text-white">
      {/* Navbar with subtle transparency and blur */}
      <header className="sticky top-0 z-40 bg-[#313338]/95 backdrop-blur-md border-b border-[#26272D] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5865F2] p-2 rounded-2xl shadow-lg shadow-indigo-500/20 transform transition-transform hover:scale-105">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#F2F3F5] hidden sm:block tracking-tight">
              Unity WebGL Ideas
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             
              {/* RANDOMIZER BUTTON */}
              <button 
                onClick={() => setIsRandomizerOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#5865F2] to-[#9C4DCC] text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 font-bold text-sm"
              >
                 <Dices size={18} className="animate-pulse" />
                 <span className="hidden sm:inline">Мне повезет!</span>
              </button>

              <div className="h-6 w-px bg-[#404249] hidden sm:block"></div>

              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mask-gradient-r">
                  <div className="flex items-center gap-1 bg-[#1E1F22] p-1.5 rounded-2xl">
                      <button 
                        onClick={() => setActiveView('all')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeView === 'all' ? 'bg-[#404249] text-[#F2F3F5] shadow-sm' : 'text-[#949BA4] hover:text-[#dbdee1]'}`}
                      >
                          Все идеи
                      </button>
                      <button 
                        onClick={() => setActiveView('custom')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeView === 'custom' ? 'bg-[#5865F2] text-white shadow-md' : 'text-[#949BA4] hover:text-[#5865F2]'}`}
                      >
                          <Sparkles size={14} className={activeView === 'custom' ? "text-white" : ""}/> 
                          <span className="hidden sm:inline">Свои</span>
                      </button>
                      <div className="w-px h-4 bg-[#404249] mx-1"></div>
                      <button 
                        onClick={() => setActiveView('in-progress')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeView === 'in-progress' ? 'bg-[#404249] text-[#F0B232] shadow-sm' : 'text-[#949BA4] hover:text-[#F0B232]'}`}
                      >
                          <Briefcase size={14}/> <span className="hidden sm:inline">В работе</span>
                      </button>
                      <button 
                        onClick={() => setActiveView('completed')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeView === 'completed' ? 'bg-[#404249] text-[#23A559] shadow-sm' : 'text-[#949BA4] hover:text-[#23A559]'}`}
                      >
                          <Trophy size={14}/> <span className="hidden sm:inline">Готово</span>
                      </button>
                      <button 
                        onClick={() => setActiveView('favorites')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeView === 'favorites' ? 'bg-[#404249] text-[#FA777C] shadow-sm' : 'text-[#949BA4] hover:text-[#FA777C]'}`}
                      >
                          <Heart size={14} className={activeView === 'favorites' ? "fill-current" : ""}/>
                          {userProgress.favorites.length > 0 && (
                            <span className="bg-[#2B2D31] text-[#dbdee1] px-1.5 py-0.5 rounded-md text-[10px] font-bold">{userProgress.favorites.length}</span>
                          )}
                      </button>
                  </div>
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeView === 'all' && (
            <div className="mb-12 text-center relative">
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#F2F3F5] mb-6 tracking-tight drop-shadow-sm">
                Создай свою <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#9C4DCC]">Игру Мечты</span>
            </h2>
            <p className="text-[#949BA4] max-w-2xl mx-auto text-lg leading-relaxed">
                Выбери идею, нажми "Взять в работу", и <span className="text-[#5865F2] font-semibold">AI Ментор</span> проведет тебя через каждый шаг.
            </p>
            </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-8 p-1.5 rounded-2xl bg-[#1E1F22] shadow-inner max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#949BA4]" />
                    <input
                    type="text"
                    placeholder="Найти идею..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-none rounded-xl text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:bg-[#2B2D31] transition-colors"
                    />
                </div>

                <div className="flex gap-2">
                    <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value as Genre | 'All')}
                    className="px-4 py-3 bg-[#2B2D31] hover:bg-[#35373C] border-none rounded-xl text-sm text-[#dbdee1] font-medium focus:outline-none focus:ring-2 focus:ring-[#5865F2] cursor-pointer transition-colors pr-10"
                    >
                    <option value="All">Все жанры</option>
                    {Object.values(Genre).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'All')}
                    className="px-4 py-3 bg-[#2B2D31] hover:bg-[#35373C] border-none rounded-xl text-sm text-[#dbdee1] font-medium focus:outline-none focus:ring-2 focus:ring-[#5865F2] cursor-pointer transition-colors pr-10"
                    >
                    <option value="All">Любая сложность</option>
                    {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    {/* NEW CREATE BUTTON - VISIBLE ONLY IN CUSTOM VIEW */}
                    {activeView === 'custom' && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                        >
                            <Plus size={18} />
                            <span className="hidden md:inline">Создать</span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* --- MAIN GRID CONTENT --- */}
        {activeView === 'all' ? (
             <div className="space-y-12">
                 
                 {/* 1. STANDARD SECTION */}
                 {standardIdeas.length > 0 && (
                     <div>
                         <SectionHeader 
                             title="Обучающие" 
                             subtitle="База"
                             icon={BookOpen} 
                             colorClass="text-[#5865F2]"
                         />
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {standardIdeas.map(idea => (
                                <IdeaCard 
                                    key={idea.id} 
                                    idea={idea} 
                                    isCustom={false}
                                    isFavorite={userProgress.favorites.includes(idea.id)}
                                    status={userProgress.gameStatuses[idea.id] || 'planned'}
                                    onSelect={setSelectedIdea} 
                                    onToggleFavorite={toggleFavorite}
                                    onReset={(e, id) => requestDeleteConfirmation(id)}
                                />
                            ))}
                         </div>
                     </div>
                 )}

                 {/* 2. CUSTOM SECTION */}
                 {/* Show this header if we have custom games, OR if we had standard games (so we need a separator for the empty custom area) */}
                 {(userCustomIdeas.length > 0 || (customIdeas.length > 0 && standardIdeas.length > 0)) && (
                     <div>
                         <SectionHeader 
                             title="Свои Проекты" 
                             subtitle="Песочница"
                             icon={Rocket} 
                             colorClass="text-[#9C4DCC]"
                         />
                         
                         {userCustomIdeas.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userCustomIdeas.map(idea => (
                                    <IdeaCard 
                                        key={idea.id} 
                                        idea={idea} 
                                        isCustom={true}
                                        isFavorite={userProgress.favorites.includes(idea.id)}
                                        status={userProgress.gameStatuses[idea.id] || 'planned'}
                                        onSelect={setSelectedIdea} 
                                        onToggleFavorite={toggleFavorite}
                                        onReset={(e, id) => requestDeleteConfirmation(id)}
                                    />
                                ))}
                            </div>
                         ) : (
                             <div className="text-center py-10 bg-[#2B2D31] rounded-2xl border border-dashed border-[#404249] flex flex-col items-center">
                                 <p className="text-[#949BA4] text-sm mb-4">Ваши проекты, соответствующие фильтрам, появятся здесь.</p>
                                 <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="px-4 py-2 bg-[#1E1F22] hover:bg-[#35373C] text-[#F2F3F5] rounded-lg text-sm font-medium transition-all"
                                 >
                                    + Создать новый
                                 </button>
                             </div>
                         )}
                     </div>
                 )}
             </div>
        ) : (
            /* NON-SPLIT VIEW (Favorites, In-Progress, Custom Tab, Completed) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIdeas.map((idea) => {
                    const isCustom = customIdeas.some(c => c.id === idea.id);
                    return (
                        <IdeaCard 
                            key={idea.id} 
                            idea={idea} 
                            isCustom={isCustom}
                            isFavorite={userProgress.favorites.includes(idea.id)}
                            status={userProgress.gameStatuses[idea.id] || 'planned'}
                            onSelect={setSelectedIdea} 
                            onToggleFavorite={toggleFavorite}
                            onReset={(e, id) => requestDeleteConfirmation(id)}
                        />
                    );
                })}
            </div>
        )}
        
        {/* EMPTY STATE (ONLY IF EVERYTHING IS EMPTY) */}
        {filteredIdeas.length === 0 && (
          <div className="text-center py-32 bg-[#2B2D31] rounded-3xl mt-6">
            <div className="inline-block p-6 rounded-full bg-[#1E1F22] mb-6 shadow-inner">
              <Filter className="w-12 h-12 text-[#949BA4]" />
            </div>
            <h3 className="text-2xl font-bold text-[#F2F3F5] mb-2">
                {activeView === 'custom' ? "У вас пока нет своих идей" : "Ничего не найдено"}
            </h3>
            <p className="text-[#949BA4] mt-2 max-w-md mx-auto">
                {activeView === 'custom' 
                    ? "Создайте свою первую игру или измените фильтры. Игры, над которыми началась работа, перемещены во вкладку 'В работе'." 
                    : activeView === 'favorites'
                    ? "У вас нет избранных идей. Идеи, для которых создан план (GDD), перемещены в 'Свои'."
                    : "Попробуйте изменить фильтры или сбросить поиск."}
            </p>
            
            {activeView === 'custom' ? (
                 <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-6 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all inline-flex items-center gap-2"
                >
                    <Plus size={18} /> Создать первую идею
                </button>
            ) : activeView !== 'favorites' && (
                <button 
                    onClick={() => {setSearchQuery(''); setFilterGenre('All'); setFilterDifficulty('All');}}
                    className="mt-6 text-[#5865F2] hover:text-[#4752C4] font-semibold transition-colors"
                >
                    Сбросить фильтры
                </button>
            )}
          </div>
        )}
      </main>

      <Modal 
        idea={selectedIdea} 
        onClose={() => setSelectedIdea(null)} 
        onUpdateStatus={handleUpdateStatus}
        onRequestDelete={requestDeleteConfirmation}
        onUnfavorite={handleForceUnfavorite}
      />

      {isCreateModalOpen && (
        <CreateIdeaModal 
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateIdea}
        />
      )}

      {isRandomizerOpen && (
        <RandomizerModal
            onClose={() => setIsRandomizerOpen(false)}
            onAccept={handleCreateIdea}
            onSaveToFavorites={handleSaveToFavorites}
        />
      )}

      {/* Рендерим новое модальное окно, если есть ID для удаления */}
      {ideaToConfirm && (
        <ConfirmationModal 
          ideaTitle={ideaToConfirm.title}
          isCustom={isConfirmingCustom}
          onConfirm={executeDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};

export default App;
