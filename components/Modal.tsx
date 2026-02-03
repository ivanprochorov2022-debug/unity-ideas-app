
import React, { useEffect, useState, useRef } from 'react';
import { GameIdea, WizardOptions, ChatMessage, ArtPrompts, SavedGameContext, GameStatus, CodeFile, TodoItem } from '../types';
import { X, Bot, Loader2, Code, Image as ImageIcon, MessageSquare, FileText, Download, Send, Play, Trash2, Save, Paperclip, CheckCircle, ArrowRight, Wand2, Copy, ZoomIn, ZoomOut, Type, Trophy, AlertCircle, ChevronDown, Box, Square, CheckSquare, ListTodo, History, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getGameImplementationDetails, getArtPrompts, sendMentorMessage, getGameTasks } from '../services/geminiService';
import { linkifyUnityDocs } from '../utils/unityHelpers';
import { storageService } from '../services/storageService';

interface ModalProps {
  idea: GameIdea | null;
  onClose: () => void;
  onUpdateStatus: (id: number, status: GameStatus) => void;
  onRequestDelete: (id: number) => void;
  onUnfavorite: (id: number) => void;
}

type Tab = 'gdd' | 'code' | 'art' | 'chat';

// --- DESCRIPTIONS DATA ---
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

// --- TOOLTIP COMPONENT ---
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

// --- CUSTOM SELECT COMPONENT ---
interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  descriptions: Record<string, string>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, descriptions }) => {
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
            {/* No tooltip in closed state as requested */}
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


export const Modal: React.FC<ModalProps> = ({ idea, onClose, onUpdateStatus, onRequestDelete, onUnfavorite }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('gdd');
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Data State
  const [gameData, setGameData] = useState<SavedGameContext | null>(null);

  // Chat UI State
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatFontSize, setChatFontSize] = useState(16);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Ref for the latest message to control intelligent scrolling
  const lastMessageRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Code Viewer State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<number | null>(null); // Null means latest

  // --- LIFECYCLE: Load Data ---
  useEffect(() => {
    if (idea) {
      const saved = storageService.getGameData(idea.id);
      if (saved) {
        // --- MIGRATION LOGIC FOR OLD SAVES ---
        const fixedWizardOptions = { ...saved.wizardOptions };
        let hasChanges = false;

        // Fix missing dimension (Default to 2D unless style says 3D)
        if (!fixedWizardOptions.dimension) {
            const styleLower = fixedWizardOptions.style.toLowerCase();
            if (styleLower.includes('3d') && !styleLower.includes('casual mobile 3d')) {
                 fixedWizardOptions.dimension = fixedWizardOptions.style.includes('Low Poly') ? '3D' : '2D';
            } else {
                 fixedWizardOptions.dimension = '2D';
            }
            hasChanges = true;
        }

        if (fixedWizardOptions.platform === 'WebGL') {
            fixedWizardOptions.platform = 'WebGL (Desktop & Mobile)';
            hasChanges = true;
        }
        if (fixedWizardOptions.timeframe === 'Game Jam') {
            fixedWizardOptions.timeframe = 'Game Jam (48h)';
            hasChanges = true;
        }
        
        // Migration for Versions: Ensure all code files have a versions array
        const fixedCodeFiles = saved.codeFiles.map(f => {
            if (!f.versions) {
                hasChanges = true;
                return {
                    ...f,
                    versions: [{ version: 1, content: f.content, timestamp: saved.lastUpdated }]
                };
            }
            return f;
        });

        const dataToSet = hasChanges 
            ? { ...saved, wizardOptions: fixedWizardOptions, codeFiles: fixedCodeFiles } 
            : saved;

        setGameData(dataToSet);
        
        if (saved.status === 'in-progress' || saved.status === 'completed') {
          setActiveTab('chat');
        } else if (saved.status === 'generated') {
          setActiveTab('gdd');
        }
      } else {
        // --- NEW GAME DEFAULT STATE ---
        setGameData({
          id: idea.id,
          lastUpdated: Date.now(),
          status: 'planned',
          wizardOptions: { 
            dimension: '2D', // Default
            style: 'Standard 2D', // NEW DEFAULT PRIORITY
            platform: 'WebGL (Desktop & Mobile)', 
            timeframe: 'Game Jam (48h)' 
          }, 
          gdd: '',
          chatHistory: [],
          codeFiles: [],
          artPrompts: null,
          todoList: []
        });
        setActiveTab('gdd');
      }
    }
  }, [idea]);

  // --- SAVE ON CHANGE ---
  useEffect(() => {
    if (gameData && idea) {
      storageService.saveGameData(gameData);
      // We only update the parent status, not the whole state, to avoid full re-renders
      onUpdateStatus(idea.id, gameData.status);
    }
  }, [gameData, idea]); 

  // --- SMART SCROLL CHAT ---
  useEffect(() => {
    if (activeTab === 'chat' && gameData?.chatHistory?.length) {
      const lastMsg = gameData.chatHistory[gameData.chatHistory.length - 1];

      // Small delay to ensure DOM render before scrolling
      setTimeout(() => {
          if (lastMsg.role === 'user') {
              // If user sent a message, scroll to BOTTOM to see it
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          } else {
              // If Model (Mentor) sent a message, scroll to the TOP of that message
              // This is crucial for long "Next Step" generations so user starts reading from the top
              lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 50);
    }
  }, [gameData?.chatHistory, activeTab]);

  // Reset version view when changing file
  useEffect(() => {
    setActiveVersion(null);
  }, [selectedFile]);


  // --- HANDLERS ---

  const handleGenerateGDD = async () => {
    if (!idea || !gameData) return;
    setLoading(true);
    
    // 1. Generate Text GDD
    const content = await getGameImplementationDetails(idea, gameData.wizardOptions);
    const linkedContent = linkifyUnityDocs(content);
    
    // Update State Phase 1 (Show text immediately)
    setGameData(prev => prev ? ({
      ...prev,
      gdd: linkedContent,
      status: 'generated',
      lastUpdated: Date.now()
    }) : null);
    
    // Auto-remove from favorites since it's now a project
    onUnfavorite(idea.id);

    setLoading(false);

    // 2. Generate ToDo List (Silent background process)
    if (!gameData.todoList || gameData.todoList.length === 0) {
        setTasksLoading(true);
        const tasks = await getGameTasks(content, idea.title);
        setGameData(prev => prev ? ({
            ...prev,
            todoList: tasks,
            lastUpdated: Date.now()
        }) : null);
        setTasksLoading(false);
    }
  };

  const handleToggleTodo = (id: string) => {
      if (!gameData?.todoList) return;
      
      const newTodoList = gameData.todoList.map(t => 
          t.id === id ? { ...t, completed: !t.completed } : t
      );
      
      setGameData({
          ...gameData,
          todoList: newTodoList,
          lastUpdated: Date.now()
      });
  };

  const handleResetGDD = () => {
    if (!idea) return;
    onRequestDelete(idea.id);
  };

  const handleDownloadGDD = () => {
    if (!gameData?.gdd || !idea) return;
    const blob = new Blob([gameData.gdd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Replace potentially unsafe characters for filename with underscore
    const safeTitle = idea.title.replace(/[\\/]/g, '_');
    a.download = `${safeTitle}_DisDoc.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartDevelopment = async () => {
    if (!gameData || !idea) return;
    setLoading(true);
    const newStatus = 'in-progress';
    
    // UPDATED PROMPT: Strict instructions to trigger 'Step 1' logic in service
    const startPrompt = `START_PROJECT_SETUP_NOW`;

    const response = await sendMentorMessage(
        {...gameData, status: newStatus}, 
        startPrompt, 
        false, // Treat as user message to trigger internal first-step logic
        undefined,
        idea.title // PASS TITLE HERE
    );
    setGameData(prev => prev ? ({
      ...prev,
      status: newStatus,
      chatHistory: [{ role: 'model', text: response.text }],
      codeFiles: mergeCodeFiles(prev.codeFiles, response.files),
      lastUpdated: Date.now()
    }) : null);
    setLoading(false);
  };

  const handleFinishProject = () => {
    if (!gameData || !idea) return;
    const newStatus = 'completed';
    
    // Update local state
    setGameData(prev => prev ? ({
        ...prev,
        status: newStatus,
        lastUpdated: Date.now()
    }) : null);

    // Notify parent to update index
    onUpdateStatus(idea.id, newStatus);
  };

  const handleSendMessage = async (isNextStep: boolean = false) => {
    if (!gameData || !idea) return;
    if (!isNextStep && !chatInput.trim() && !chatImage) return;

    const userText = isNextStep ? "Следующий шаг" : chatInput;
    const userImg = chatImage;

    if (!isNextStep) {
      const userMsg: ChatMessage = { role: 'user', text: userText, image: userImg || undefined };
      setGameData(prev => prev ? ({ ...prev, chatHistory: [...prev.chatHistory, userMsg] }) : null);
    }

    setChatInput('');
    setChatImage(null);
    setLoading(true);

    const response = await sendMentorMessage(
      gameData, 
      chatInput, 
      isNextStep, 
      userImg || undefined,
      idea.title // PASS TITLE HERE
    );

    setGameData(prev => prev ? ({
      ...prev,
      chatHistory: [...(isNextStep ? prev.chatHistory : prev.chatHistory), { role: 'model', text: response.text }],
      codeFiles: mergeCodeFiles(prev.codeFiles, response.files),
      lastUpdated: Date.now()
    }) : null);

    setLoading(false);
  };

  // --- ART GENERATION HANDLER ---
  const handleArtGen = async () => {
    if (!gameData || !idea) return;
    setLoading(true);
    try {
      const prompts = await getArtPrompts(idea, gameData.wizardOptions.style, gameData.gdd);
      setGameData(prev => prev ? ({
        ...prev,
        artPrompts: prompts,
        lastUpdated: Date.now()
      }) : null);
    } catch (e) {
      console.error("Error generating art prompts:", e);
    } finally {
      setLoading(false);
    }
  };

  const mergeCodeFiles = (existing: CodeFile[], newFiles: CodeFile[]): CodeFile[] => {
    const updated = [...existing];
    
    newFiles.forEach(nf => {
      const index = updated.findIndex(f => f.name === nf.name);
      
      if (index >= 0) {
        // FILE EXISTS: UPDATE AND ADD VERSION
        const existingFile = updated[index];
        const prevVersions = existingFile.versions || [];
        
        // Calculate new version number
        const nextVerNum = prevVersions.length + 1;
        
        // Create new version entry
        const newVersionEntry = {
            version: nextVerNum,
            content: nf.content,
            timestamp: Date.now()
        };

        updated[index] = {
            ...existingFile,
            content: nf.content, // Latest content always at top level
            versions: [...prevVersions, newVersionEntry]
        };

      } else {
        // NEW FILE
        // Parser already initializes versions array with v1, so just push it
        updated.push(nf);
      }
    });
    return updated;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- PASTE HANDLER ---
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                e.preventDefault(); // Stop image being pasted as random text
                const reader = new FileReader();
                reader.onloadend = () => setChatImage(reader.result as string);
                reader.readAsDataURL(file);
                return; // Stop after first image found
            }
        }
    }
  };

  // --- RENDER HELPERS ---
  const markdownComponents = {
     h1: ({node, ...props}: any) => <h1 className="text-[1.5em] font-bold text-[#F2F3F5] mt-6 mb-4 border-b border-[#3F4148] pb-3" {...props} />,
     h2: ({node, ...props}: any) => <h2 className="text-[1.25em] font-bold text-[#dbdee1] mt-6 mb-3" {...props} />,
     h3: ({node, ...props}: any) => <h3 className="text-[1.1em] font-bold text-[#dbdee1] mt-4 mb-2" {...props} />,
     ul: ({node, ...props}: any) => <ul className="list-disc pl-6 space-y-2 my-3 text-[#B5BAC1]" {...props} />,
     ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 space-y-2 my-3 text-[#B5BAC1]" {...props} />,
     li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
     p: ({node, ...props}: any) => <p className="mb-4 leading-relaxed text-[#B5BAC1]" {...props} />,
     strong: ({node, ...props}: any) => <strong className="font-bold text-[#5865F2]" {...props} />,
     blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-[#5865F2] pl-4 py-2 my-4 bg-[#2f3136] rounded-r-lg italic text-[#949BA4]" {...props} />,
     code: ({node, className, children, ...props}: any) => {
        const match = /language-(\w+)/.exec(className || '')
        return !className ? (
          <code className="bg-[#1E1F22] text-[#F0B232] px-1.5 py-0.5 rounded-md font-mono text-[0.9em] break-words whitespace-pre-wrap" {...props}>{children}</code>
        ) : (
          <div className="my-4 rounded-xl overflow-hidden shadow-md bg-[#2B2D31] max-w-full">
             <div className="bg-[#1E1F22] px-4 py-2 text-xs text-[#949BA4] font-mono border-b border-[#26272D] flex justify-between items-center">
                <span className="font-semibold uppercase tracking-wider">{match?.[1] || 'code'}</span>
             </div>
             <pre className="bg-[#2B2D31] p-4 overflow-x-auto whitespace-pre-wrap break-words text-[0.9em] text-[#dbdee1] custom-scrollbar max-w-full"><code className={className} {...props}>{children}</code></pre>
          </div>
        )
     },
     a: ({node, ...props}: any) => {
        const href = props.href || '';
        if (href === '#code-view') {
           const filename = props.children?.[0]; 
           return (
             <button 
                onClick={() => { setActiveTab('code'); if (filename) setSelectedFile(String(filename)); }}
                className="text-[#5865F2] hover:text-[#4752c4] underline decoration-2 font-mono bg-[#1E1F22] px-2 py-0.5 rounded-md mx-1 inline-flex items-center gap-1 hover:bg-[#26272D] transition-colors"
             >
               <FileText size={12}/> {props.children}
             </button>
           );
        }
        return <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#00A8FC] hover:underline font-medium"/>;
     }
  };


  if (!idea || !gameData) return null;

  const showMentorHint = gameData.status === 'in-progress' && activeTab !== 'chat';
  
  // Logic to detect if the project is complete based on the hidden tag
  const lastMessage = gameData.chatHistory[gameData.chatHistory.length - 1];
  const isProjectReadyToFinish = lastMessage?.role === 'model' && lastMessage.text.includes('[PROJECT_COMPLETE]');
  
  // Logic for Next Step availability
  const canGoNext = !loading && !isProjectReadyToFinish && gameData.chatHistory.length > 0 && gameData.chatHistory[gameData.chatHistory.length - 1].role === 'model';
  
  // Calculate Progress
  const completedTasks = gameData.todoList?.filter(t => t.completed).length || 0;
  const totalTasks = gameData.todoList?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Code View Helpers
  const currentFileObj = selectedFile ? gameData.codeFiles.find(f => f.name === selectedFile) : null;
  const displayedContent = currentFileObj 
    ? (activeVersion 
        ? currentFileObj.versions.find(v => v.version === activeVersion)?.content || "Error: Version not found"
        : currentFileObj.content)
    : "";
  
  // Versions list (safe fallback)
  const versionsList = currentFileObj?.versions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#313338] w-full max-w-7xl h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] border border-[#26272D]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#26272D] bg-[#2B2D31]/50 backdrop-blur-md">
          <div className="flex items-center gap-6 overflow-hidden">
             <div className="flex flex-col min-w-0">
                <h2 className="text-xl font-bold text-[#F2F3F5] truncate">{idea.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        gameData.status === 'in-progress' ? 'bg-[#404249] text-[#F0B232]' :
                        gameData.status === 'completed' ? 'bg-[#2D4D3D] text-[#86EFAC]' :
                        'bg-[#1E1F22] text-[#949BA4]'
                    }`}>
                        {gameData.status === 'in-progress' ? 'В РАЗРАБОТКЕ' : 
                        gameData.status === 'completed' ? 'ЗАВЕРШЕНО' : 
                        gameData.status === 'generated' ? 'ПЛАН ГОТОВ' : 'ПЛАНИРОВАНИЕ'}
                    </span>
                    {/* Display Dimension Badge in Header */}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/20">
                        {gameData.wizardOptions.dimension}
                    </span>
                </div>
             </div>

             {/* TABS */}
             <div className="flex gap-1 bg-[#1E1F22] p-1.5 rounded-xl ml-4 hidden sm:flex">
                <button 
                    onClick={() => setActiveTab('gdd')} 
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'gdd' ? 'bg-[#404249] text-[#F2F3F5] shadow-md' : 'text-[#949BA4] hover:text-[#dbdee1] hover:bg-[#35373c]'}`}
                >
                    План
                </button>
                <button 
                    onClick={() => setActiveTab('chat')} 
                    disabled={gameData.status === 'planned'}
                    className={`
                        relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 
                        ${activeTab === 'chat' 
                            ? 'bg-[#404249] text-[#F2F3F5] shadow-md' 
                            : 'text-[#949BA4] hover:text-[#dbdee1] hover:bg-[#35373c] disabled:opacity-30 disabled:hover:bg-transparent'
                        }
                        ${showMentorHint 
                            ? 'text-[#5865F2]' 
                            : ''
                        }
                    `}
                >
                    <MessageSquare size={16}/> Ментор
                    {showMentorHint && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DA373C] rounded-full animate-pulse ring-2 ring-[#313338]"></span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('code')} 
                    disabled={gameData.codeFiles.length === 0}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-[#404249] text-[#F2F3F5] shadow-md' : 'text-[#949BA4] hover:text-[#dbdee1] hover:bg-[#35373C] disabled:opacity-30 disabled:hover:bg-transparent'}`}
                >
                    <Code size={16}/> Код ({gameData.codeFiles.length})
                </button>
                <button 
                    onClick={() => setActiveTab('art')} 
                    disabled={gameData.status === 'planned'}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'art' ? 'bg-[#404249] text-[#F2F3F5] shadow-md' : 'text-[#949BA4] hover:text-[#dbdee1] hover:bg-[#35373c] disabled:opacity-30 disabled:hover:bg-transparent'}`}
                >
                    <ImageIcon size={16}/> Арт
                </button>
             </div>

             {activeTab === 'chat' && (
                 <div className="flex justify-end gap-3 items-center ml-auto px-2 py-0.5 rounded-md hidden sm:flex"> {/* Added ml-auto and specific padding for visual balance */}
                     <span className="text-xs text-[#949BA4] mr-2 flex items-center gap-1 font-medium"><Type size={12}/> Размер текста:</span>
                     <button onClick={() => setChatFontSize(Math.max(12, chatFontSize - 2))} className="p-1.5 hover:bg-[#404249] rounded-lg text-[#949BA4] transition-colors">
                         <ZoomOut size={16}/>
                     </button>
                     <span className="text-xs text-[#F2F3F5] w-6 text-center font-mono">{chatFontSize}px</span>
                     <button onClick={() => setChatFontSize(Math.min(24, chatFontSize + 2))} className="p-1.5 hover:bg-[#404249] rounded-lg text-[#949BA4] transition-colors">
                         <ZoomIn size={16}/>
                     </button>
                 </div>
             )}

          </div>
          <button onClick={onClose} className="p-2 text-[#949BA4] hover:text-[#dbdee1] hover:bg-[#404249] rounded-full transition-colors"><X size={24} /></button>
        </div>

        {/* MOBILE TABS (Visible only on small screens) */}
        <div className="sm:hidden flex justify-between gap-1 bg-[#1E1F22] p-2 border-b border-[#26272D]">
            {['gdd', 'chat', 'code', 'art'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)} 
                    disabled={tab !== 'gdd' && gameData.status === 'planned' || (tab === 'code' && gameData.codeFiles.length === 0)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all ${activeTab === tab ? 'bg-[#404249] text-[#F2F3F5]' : 'text-[#949BA4] disabled:opacity-30'}`}
                >
                    {tab === 'gdd' ? 'План' : tab}
                </button>
            ))}
        </div>

        {/* BODY */}
        <div className="flex-grow overflow-hidden relative bg-[#313338] flex">
          
          {/* TAB: GDD / WIZARD / TASKS */}
          {activeTab === 'gdd' && (
            <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#313338]">
              {gameData.gdd ? (
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
                    
                    {/* LEFT COLUMN: GDD Text */}
                    <div className="flex-1 min-w-0">
                        {/* COMPACT ACTION BAR */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-5 bg-[#2B2D31] p-2 rounded-lg border border-[#26272D] shadow-sm gap-4 sticky top-0 z-20">
                            <div className="text-xs text-[#949BA4] font-medium ml-2 hidden md:block">
                                План готов.
                            </div>
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto md:overflow-visible no-scrollbar">
                                <button 
                                    onClick={handleDownloadGDD} 
                                    type="button"
                                    className="flex flex-row flex-1 md:flex-none justify-center items-center gap-2 px-3 py-1.5 text-[#949BA4] hover:text-[#F2F3F5] hover:bg-[#404249] rounded-lg transition-colors cursor-pointer text-xs font-medium whitespace-nowrap"
                                >
                                    <Download size={14}/> Скачать
                                </button>
                                <button 
                                    onClick={handleResetGDD} 
                                    type="button"
                                    className="flex flex-row flex-1 md:flex-none justify-center items-center gap-2 px-3 py-1.5 text-[#FA777C] hover:bg-[#4D2D31] rounded-lg transition-colors cursor-pointer text-xs font-medium whitespace-nowrap"
                                >
                                    <Trash2 size={14}/> Сбросить
                                </button>
                                {gameData.status === 'generated' && (
                                    <button 
                                        onClick={handleStartDevelopment} 
                                        disabled={loading}
                                        className="flex flex-row flex-1 md:flex-none justify-center items-center gap-2 px-4 py-1.5 bg-[#23A559] hover:bg-[#1E8C4B] text-white text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] whitespace-nowrap"
                                    >
                                        {loading ? <Loader2 size={14} className="animate-spin"/> : <Play size={14} />} 
                                        {loading ? "Инициализация..." : "В РАБОТУ"}
                                    </button>
                                )}
                                {gameData.status === 'in-progress' && (
                                    <div className="text-[#86EFAC] font-bold text-xs flex items-center gap-2 bg-[#2D4D3D] px-3 py-1.5 rounded-lg whitespace-nowrap">
                                        <CheckCircle size={14}/> В Работе
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="leading-relaxed text-[#B5BAC1]">
                            <ReactMarkdown components={markdownComponents}>{gameData.gdd}</ReactMarkdown>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: TASKS (TODO LIST) */}
                    <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
                        <div className="bg-[#2B2D31] rounded-xl border border-[#26272D] shadow-lg sticky top-2 flex flex-col max-h-[calc(100vh-200px)]">
                            {/* Todo Header */}
                            <div className="p-4 border-b border-[#1E1F22]">
                                <div className="flex items-center gap-2 mb-3 text-[#F2F3F5]">
                                    <ListTodo size={20} className="text-[#5865F2]"/>
                                    <h3 className="font-bold">Чек-лист</h3>
                                    {tasksLoading && <Loader2 size={14} className="animate-spin text-[#949BA4] ml-auto" />}
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-[#1E1F22] h-2.5 rounded-full overflow-hidden mb-1">
                                    <div 
                                        className="h-full bg-[#23A559] transition-all duration-500 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-[#949BA4] font-mono font-bold uppercase tracking-wider">
                                    <span>Прогресс</span>
                                    <span>{progressPercent}%</span>
                                </div>
                            </div>

                            {/* Todo List Items */}
                            <div className="overflow-y-auto custom-scrollbar p-2 space-y-1 flex-grow">
                                {gameData.todoList && gameData.todoList.length > 0 ? (
                                    gameData.todoList.map((task) => (
                                        <div 
                                            key={task.id}
                                            onClick={() => handleToggleTodo(task.id)}
                                            className={`
                                                group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent
                                                ${task.completed 
                                                    ? 'bg-[#1E1F22] opacity-60 hover:opacity-80' 
                                                    : 'hover:bg-[#35373C] hover:border-[#1E1F22]'
                                                }
                                            `}
                                        >
                                            <div className={`mt-0.5 transition-colors ${task.completed ? 'text-[#23A559]' : 'text-[#949BA4] group-hover:text-[#dbdee1]'}`}>
                                                {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <span className={`text-sm leading-snug transition-all select-none ${task.completed ? 'text-[#949BA4] line-through decoration-2 decoration-[#1E1F22]' : 'text-[#dbdee1]'}`}>
                                                {(() => {
                                                    const colonIndex = task.text.indexOf(':');
                                                    if (colonIndex !== -1 && !task.completed) {
                                                        const header = task.text.substring(0, colonIndex + 1);
                                                        const body = task.text.substring(colonIndex + 1);
                                                        return (
                                                            <>
                                                                <span className="font-bold text-[#5865F2] group-hover:text-[#7983F5] transition-colors">{header}</span>
                                                                <span className="text-[#dbdee1] group-hover:text-white transition-colors">{body}</span>
                                                            </>
                                                        );
                                                    }
                                                    return task.text;
                                                })()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    tasksLoading ? (
                                        <div className="p-8 text-center text-[#949BA4] text-xs">
                                            <Loader2 size={24} className="animate-spin mx-auto mb-2 opacity-50"/>
                                            Создаю список задач...
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-[#949BA4] text-xs opacity-60">
                                            Задачи появятся здесь
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto mt-6 p-8 bg-[#2B2D31] rounded-3xl shadow-2xl border border-[#26272D]">
                   <h2 className="text-2xl font-bold text-[#F2F3F5] mb-6 text-center">Настройка Игры</h2>
                   <div className="space-y-5">
                      {/* ... Wizard Options ... */}
                      {/* (Wizard content unchanged for brevity, as it was in original Modal) */}
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Режим (Физика и Камера)</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             type="button"
                             onClick={() => setGameData({...gameData, wizardOptions: {...gameData.wizardOptions, dimension: '2D'}})}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                gameData.wizardOptions.dimension === '2D' 
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
                             onClick={() => setGameData({...gameData, wizardOptions: {...gameData.wizardOptions, dimension: '3D'}})}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                gameData.wizardOptions.dimension === '3D' 
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
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Стиль (Визуал и AI Промпты)</label>
                        <CustomSelect 
                            value={gameData.wizardOptions.style}
                            onChange={(val) => setGameData({...gameData, wizardOptions: {...gameData.wizardOptions, style: val}})}
                            options={["Standard 2D", "Casual Mobile 3D", "Pixel Art (2D)", "Vector (2D)", "Low Poly (3D)"]}
                            descriptions={STYLE_DESCRIPTIONS}
                        />
                      </div>
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Платформа</label>
                        <CustomSelect 
                            value={gameData.wizardOptions.platform}
                            onChange={(val) => setGameData({...gameData, wizardOptions: {...gameData.wizardOptions, platform: val}})}
                            options={["WebGL (Desktop & Mobile)", "WebGL (Desktop)"]}
                            descriptions={PLATFORM_DESCRIPTIONS}
                        />
                      </div>
                      <div>
                        <label className="text-[#949BA4] text-xs font-bold uppercase tracking-wider mb-2 block">Время</label>
                        <CustomSelect 
                            value={gameData.wizardOptions.timeframe}
                            onChange={(val) => setGameData({...gameData, wizardOptions: {...gameData.wizardOptions, timeframe: val}})}
                            options={["Game Jam (48h)", "1 Неделя", "1 Месяц"]}
                            descriptions={TIMEFRAME_DESCRIPTIONS}
                        />
                      </div>

                      <button 
                        onClick={handleGenerateGDD}
                        disabled={loading}
                        className="w-full mt-6 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg transform active:scale-95"
                      >
                         {loading ? <Loader2 className="animate-spin"/> : <Wand2 size={20}/>}
                         Создать План
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CHAT (MENTOR) */}
          {activeTab === 'chat' && (
            <div className="w-full h-full flex flex-col bg-[#313338]">
                <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[#313338]">
                    {gameData.chatHistory.map((msg, i) => (
                        <div 
                            key={i} 
                            ref={i === gameData.chatHistory.length - 1 ? lastMessageRef : null}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} scroll-mt-4`}
                        >
                            {msg.role === 'model' && (
                                <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex-shrink-0 flex items-center justify-center mr-4 mt-1 shadow-lg text-white">
                                    <Bot size={22}/>
                                </div>
                            )}
                            <div 
                                className={`max-w-[90%] md:max-w-[92%] rounded-2xl px-5 py-4 shadow-sm transition-all break-words overflow-hidden ${
                                    msg.role === 'user' 
                                    ? 'bg-[#5865F2] text-white rounded-br-md' 
                                    : 'bg-[#2B2D31] text-[#dbdee1] rounded-tl-md border border-[#26272D]'
                                }`}
                                style={{ fontSize: `${chatFontSize}px` }}
                            >
                                {msg.image && (
                                    <img src={msg.image} alt="User upload" className="max-w-full rounded-xl mb-3 max-h-60 object-contain bg-black/20" />
                                )}
                                <div className="leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>{msg.text.replace('[PROJECT_COMPLETE]', '')}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                             <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex-shrink-0 flex items-center justify-center mr-4 mt-1 animate-pulse shadow-lg text-white">
                                <Bot size={22}/>
                             </div>
                             <div className="bg-[#2B2D31] rounded-2xl rounded-tl-md px-5 py-4 flex items-center gap-3 shadow-sm border border-[#26272D]">
                                <Loader2 className="w-5 h-5 animate-spin text-[#5865F2]"/>
                                <span className="text-[#949BA4] text-sm font-medium">Юни формирует инструкцию...</span>
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 md:p-6 bg-[#2B2D31] border-t border-[#26272D]">
                     {/* ... Chat Buttons ... */}
                     {!loading && isProjectReadyToFinish && gameData.status !== 'completed' && (
                         <button 
                            onClick={handleFinishProject}
                            className="w-full mb-4 bg-gradient-to-r from-[#F0B232] to-[#FA777C] hover:from-[#E5A82E] hover:to-[#E56B70] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] text-lg tracking-wide animate-pulse"
                        >
                            <Trophy size={24} className="text-white" />
                            ЗАВЕРШИТЬ ПРОЕКТ! 🏆
                        </button>
                    )}
                    <div className="flex gap-3 items-end">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3.5 bg-[#1E1F22] text-[#949BA4] rounded-xl hover:text-[#F2F3F5] hover:bg-[#404249] transition-all"
                        >
                            <Paperclip size={20}/>
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                        />
                        <div className="flex-grow bg-[#1E1F22] rounded-xl border-none flex flex-col focus-within:ring-2 focus-within:ring-[#5865F2] transition-all shadow-inner">
                             {chatImage && (
                                 <div className="p-2 border-b border-[#2B2D31] flex justify-between items-center">
                                     <span className="text-xs text-[#949BA4] font-medium ml-2">Изображение прикреплено</span>
                                     <button onClick={() => setChatImage(null)}><X size={16} className="text-[#949BA4] hover:text-[#FA777C] transition-colors"/></button>
                                 </div>
                             )}
                             <textarea 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onPaste={handlePaste}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(false);
                                    }
                                }}
                                placeholder="Задай вопрос Юни или отправь скриншот..."
                                className="w-full bg-transparent p-3.5 text-[#F2F3F5] focus:outline-none resize-none h-14 max-h-32 placeholder-[#949BA4]"
                             />
                        </div>
                        <button 
                            onClick={() => handleSendMessage(false)}
                            disabled={loading || (!chatInput.trim() && !chatImage)}
                            className="p-3.5 bg-[#5865F2] text-white rounded-xl hover:bg-[#4752C4] disabled:opacity-50 disabled:hover:bg-[#5865F2] shadow-md transition-all active:scale-95"
                        >
                            <Send size={20}/>
                        </button>
                        {canGoNext && (
                            <button 
                                onClick={() => handleSendMessage(true)}
                                className="p-3.5 bg-[#23A559] text-white rounded-xl hover:bg-[#1E8C4B] shadow-md transition-all active:scale-95"
                                title="Перейти к следующему шагу"
                            >
                                <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
          )}

          {/* TAB: CODE (UPDATED WITH VERSIONS) */}
          {activeTab === 'code' && (
             <div className="w-full h-full flex bg-[#1E1E1E]">
                {/* Sidebar */}
                <div className="w-64 bg-[#2B2D31] border-r border-[#1E1F22] flex flex-col flex-shrink-0">
                    <div className="p-4 text-xs font-bold text-[#949BA4] uppercase tracking-wider bg-[#26272D]">Файлы проекта</div>
                    <div className="flex-grow overflow-y-auto">
                        {gameData.codeFiles.map((file, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedFile(file.name)}
                                className={`w-full text-left px-5 py-3 text-sm flex flex-col gap-1 truncate border-b border-[#26272D] transition-colors ${selectedFile === file.name ? 'bg-[#35373C] text-[#F2F3F5] border-l-4 border-l-[#5865F2]' : 'text-[#949BA4] hover:bg-[#2F3136] hover:text-[#dbdee1] border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex items-center gap-2 font-medium">
                                    <span className="text-[#5865F2]">#</span> {file.name}
                                </div>
                                {file.versions && file.versions.length > 1 && (
                                    <div className="flex items-center gap-1 text-[10px] text-[#949BA4] opacity-70">
                                        <History size={10} />
                                        <span>v{file.versions.length}</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Editor Area */}
                <div className="flex-grow flex flex-col h-full overflow-hidden bg-[#1E1E1E] min-w-0">
                    {selectedFile ? (
                        <>
                            {/* FILE HEADER & VERSIONS BAR */}
                            <div className="bg-[#2B2D31] border-b border-[#1E1F22] shadow-sm flex flex-col">
                                {/* Top Row: Title & Actions */}
                                <div className="h-12 flex items-center justify-between px-6 border-b border-[#1E1F22]/50">
                                    <span className="text-sm text-[#F2F3F5] font-mono font-semibold flex items-center gap-2">
                                        {selectedFile}
                                        {activeVersion && (
                                            <span className="text-xs bg-[#F0B232]/20 text-[#F0B232] px-2 py-0.5 rounded-full font-sans">
                                                Просмотр версии {activeVersion}
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                if (displayedContent) navigator.clipboard.writeText(displayedContent);
                                            }}
                                            className="text-[#949BA4] hover:text-white p-1.5 rounded-lg hover:bg-[#404249] transition-colors flex items-center gap-2 text-xs font-medium" 
                                            title="Копировать текущую версию"
                                        >
                                            <Copy size={14}/> Копировать
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Row: Version Tabs (Horizontal Scroll) */}
                                {versionsList.length > 0 && (
                                    <div className="flex items-center px-4 py-2 gap-2 overflow-x-auto no-scrollbar bg-[#232428]">
                                        <span className="text-[10px] uppercase font-bold text-[#949BA4] tracking-wider mr-2 flex-shrink-0 flex items-center gap-1">
                                            <History size={12}/> История:
                                        </span>
                                        {versionsList.map((v) => {
                                            const isActive = activeVersion === v.version || (activeVersion === null && v.version === versionsList.length);
                                            const isLatest = v.version === versionsList.length;
                                            
                                            return (
                                                <button
                                                    key={v.version}
                                                    onClick={() => setActiveVersion(isLatest ? null : v.version)}
                                                    className={`
                                                        relative flex-shrink-0 px-3 py-1 text-xs rounded-md border transition-all flex items-center gap-2 group
                                                        ${isActive 
                                                            ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2] font-bold shadow-sm' 
                                                            : 'bg-[#1E1F22] border-[#2B2D31] text-[#949BA4] hover:bg-[#35373C] hover:text-[#dbdee1]'
                                                        }
                                                    `}
                                                >
                                                    <span>v{v.version}</span>
                                                    {isLatest && <span className="w-1.5 h-1.5 rounded-full bg-[#23A559]" title="Latest"></span>}
                                                    
                                                    {/* Tooltip for Time */}
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                                        {new Date(v.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* CONTENT AREA */}
                            <div className="flex-grow overflow-auto p-6 custom-scrollbar relative">
                                <pre className="font-mono text-sm text-[#dbdee1] leading-relaxed tab-size-4">
                                    {displayedContent}
                                </pre>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[#949BA4] bg-[#1E1E1E]">
                            <Code size={48} className="mb-4 opacity-20"/>
                            <p>Выберите файл из списка слева</p>
                        </div>
                    )}
                </div>
             </div>
          )}

          {/* TAB: ART */}
          {activeTab === 'art' && (
             <div className="w-full h-full overflow-y-auto p-8 bg-[#313338]">
                 {!gameData.artPrompts ? (
                     <div className="text-center mt-20">
                         <div className="inline-block p-6 rounded-full bg-[#2B2D31] shadow-xl mb-6 border border-[#26272D]">
                            <Wand2 className="w-16 h-16 text-[#5865F2]"/>
                         </div>
                         <h3 className="text-2xl text-[#F2F3F5] font-bold mb-2">Генерация Арта</h3>
                         <p className="text-[#949BA4] mb-8">Создайте AI-промпты для стиля <span className="text-[#F2F3F5] font-medium">{gameData.wizardOptions.style}</span></p>
                         <button onClick={handleArtGen} disabled={loading} className="bg-[#5865F2] px-8 py-4 rounded-2xl text-white font-bold hover:bg-[#4752C4] shadow-lg transition-all transform hover:scale-105 active:scale-95">
                             {loading ? "Генерация..." : "Создать Промпты"}
                         </button>
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                        {Object.entries(gameData.artPrompts).map(([key, prompt]) => (
                            <div key={key} className="bg-[#2B2D31] p-6 rounded-2xl border border-[#26272D] shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex justify-between mb-3 items-center">
                                    <h4 className="font-bold text-[#F2F3F5] capitalize text-lg">{key}</h4>
                                    <button onClick={() => navigator.clipboard.writeText(prompt as string)} className="text-xs bg-[#1E1F22] px-3 py-1.5 rounded-lg text-[#949BA4] hover:text-white hover:bg-[#404249] transition-colors font-medium">Копировать</button>
                                </div>
                                <p className="text-sm text-[#B5BAC1] font-mono bg-[#1E1F22] p-4 rounded-xl border border-transparent leading-relaxed">{prompt as string}</p>
                            </div>
                        ))}
                     </div>
                 )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
