/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  User, 
  MapPin, 
  BookOpen, 
  RefreshCw,
  Terminal,
  ChevronRight,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateScenario, chatWithAI, generateImage, GameState } from './services/gemini';
import { cn } from './services/utils';

type View = 'start' | 'loading' | 'game';

const ROLES = [
  { 
    id: 'scientist', 
    name: 'Çılgın Bilim İnsanı', 
    icon: '🧪', 
    desc: 'Laboratuvar kazaları ve kuantum sıçramaları.', 
    color: 'emerald',
    fact: 'Kuantum dolanıklık, iki parçacığın aralarındaki mesafe ne olursa olsun birbirlerini anında etkilemesi durumudur. Einstein buna "uzaktan ürkütücü eylem" demiştir.'
  },
  { 
    id: 'historian', 
    name: 'Zaman Gezgini Tarihçi', 
    icon: '📜', 
    desc: 'Geçmişin tozlu sayfalarında bir macera.', 
    color: 'amber',
    fact: 'Antik Mısırlılar, antibiyotiklerin keşfinden binlerce yıl önce enfeksiyonları tedavi etmek için küflü ekmek kullanıyorlardı.'
  },
  { 
    id: 'explorer', 
    name: 'Galaktik Kaşif', 
    icon: '🚀', 
    desc: 'Bilinmeyen gezegenler ve uzaylı medeniyetler.', 
    color: 'indigo',
    fact: 'Venüs gezegeninde bir gün, bir yıldan daha uzun sürer. Kendi ekseni etrafında o kadar yavaş döner ki güneşin doğuşu 117 dünya günü sürer.'
  },
  { 
    id: 'detective', 
    name: 'Siber Dedektif', 
    icon: '🔍', 
    desc: 'Neon ışıklı sokaklarda gizemli vakalar.', 
    color: 'fuchsia',
    fact: 'Dünyanın ilk bilgisayar programcısı bir kadındı: Ada Lovelace. 1843 yılında Charles Babbage\'ın Analitik Makinesi için bir algoritma yazmıştı.'
  },
];

export default function App() {
  const [view, setView] = useState<View>('start');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [educationalFact, setEducationalFact] = useState<string | null>(null);
  const [showRoleFact, setShowRoleFact] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    if (view === 'game') {
      inputRef.current?.focus();
    }
  }, [view]);

  const activeRole = ROLES.find(r => r.id === selectedRoleId);
  const roleColor = activeRole?.color || 'orange';

  const colorMap: Record<string, { text: string; bg: string; border: string; shadow: string; gradient: string; glow: string }> = {
    emerald: { 
      text: 'text-emerald-400', 
      bg: 'bg-emerald-500', 
      border: 'border-emerald-500/30', 
      shadow: 'shadow-emerald-500/20',
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      glow: 'bg-emerald-500/10'
    },
    amber: { 
      text: 'text-amber-400', 
      bg: 'bg-amber-500', 
      border: 'border-amber-500/30', 
      shadow: 'shadow-amber-500/20',
      gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
      glow: 'bg-amber-500/10'
    },
    indigo: { 
      text: 'text-indigo-400', 
      bg: 'bg-indigo-500', 
      border: 'border-indigo-500/30', 
      shadow: 'shadow-indigo-500/20',
      gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
      glow: 'bg-indigo-500/10'
    },
    fuchsia: { 
      text: 'text-fuchsia-400', 
      bg: 'bg-fuchsia-500', 
      border: 'border-fuchsia-500/30', 
      shadow: 'shadow-fuchsia-500/20',
      gradient: 'from-fuchsia-500/20 via-fuchsia-500/5 to-transparent',
      glow: 'bg-fuchsia-500/10'
    },
    orange: { 
      text: 'text-orange-400', 
      bg: 'bg-orange-500', 
      border: 'border-orange-500/30', 
      shadow: 'shadow-orange-500/20',
      gradient: 'from-orange-500/20 via-orange-500/5 to-transparent',
      glow: 'bg-orange-500/10'
    },
  };

  const activeColors = colorMap[roleColor];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameState?.history]);

  const handleStartGame = async (roleId: string) => {
    console.log('handleStartGame called with roleId:', roleId);
    if (isStartingRef.current) {
      console.log('Already starting, ignoring click');
      return;
    }
    isStartingRef.current = true;
    console.log('Starting game for role:', roleId);
    
    setSelectedRoleId(roleId);
    setView('loading');
    
    // Give UI time to render loading state
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      console.log('Generating scenario...');
      const role = ROLES.find(r => r.id === roleId)?.name || roleId;
      const scenario = await generateScenario(role);
      
      console.log('Generating initial image...');
      const initialImageUrl = await generateImage(scenario.imagePrompt);
      
      console.log('Setting game state...');
      setGameState({
        role,
        location: scenario.location,
        inventory: [],
        history: [{ 
          role: 'model', 
          text: `${scenario.description}\n\n**${scenario.firstMessage}**`,
          imageUrl: initialImageUrl
        }]
      });
      setEducationalFact(scenario.educationalFact);
      setView('game');
    } catch (error) {
      console.error("Oyun başlatılamadı:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
      setError({ 
        message: "Oyun başlatılırken bir sorun oluştu.", 
        details: errorMessage 
      });
      setSelectedRoleId(null);
      setView('start');
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !gameState) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...gameState.history, { role: 'user' as const, text: userMessage }];
    setGameState({ ...gameState, history: updatedHistory });

    try {
      const aiResponse = await chatWithAI({ ...gameState, history: updatedHistory }, userMessage);
      
      let imageUrl: string | undefined;
      if (aiResponse.imagePrompt) {
        imageUrl = await generateImage(aiResponse.imagePrompt);
      }

      setGameState(prev => prev ? ({
        ...prev,
        history: [...prev.history, { role: 'model', text: aiResponse.text, imageUrl }]
      }) : null);
    } catch (error) {
      console.error("Mesaj gönderilemedi:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
      setError({ 
        message: "Yanıt alınırken bir sorun oluştu.", 
        details: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  useEffect(() => {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "" || apiKey === "null") {
      setIsApiKeyMissing(true);
    }
  }, []);

  return (
    <div className="h-[100dvh] bg-[#050505] text-zinc-100 font-sans selection:bg-white/20 overflow-hidden flex flex-col">
      {isApiKeyMissing && (
        <div className="bg-rose-600 text-white text-xs py-2 px-4 text-center z-[200] font-bold animate-pulse">
          ⚠️ Gemini API Anahtarı Eksik! Lütfen Ayarlar (Settings) &gt; Secrets kısmından GEMINI_API_KEY ekleyin.
        </div>
      )}
      {/* Error Modal */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif italic font-bold mb-4">{error.message}</h3>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                {error.details || "Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin."}
                {error.details?.includes("GEMINI_API_KEY") && (
                  <span className="block mt-4 p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-orange-400">
                    İpucu: Sol alt köşedeki çark simgesine (Settings) tıklayıp 'Secrets' sekmesinden anahtarınızı ekleyebilirsiniz.
                  </span>
                )}
              </p>
              <button
                onClick={() => setError(null)}
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Anladım
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <AnimatePresence>
          <motion.div 
            key={view === 'start' ? 'start-bg' : `game-bg-${roleColor}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            {/* Animated Blobs */}
            <motion.div 
              animate={{ 
                x: [0, 50, -30, 0],
                y: [0, -40, 60, 0],
                scale: [1, 1.2, 0.9, 1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={cn(
                "absolute top-[-10%] left-[-10%] w-[70%] h-[70%] blur-[120px] rounded-full opacity-20",
                view === 'start' ? "bg-orange-600" : activeColors.bg
              )} 
            />
            <motion.div 
              animate={{ 
                x: [0, -60, 40, 0],
                y: [0, 50, -30, 0],
                scale: [1, 0.8, 1.1, 1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className={cn(
                "absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] blur-[120px] rounded-full opacity-20",
                view === 'start' ? "bg-blue-600" : activeColors.bg
              )} 
            />
            {view !== 'start' && (
              <motion.div 
                animate={{ 
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 10, repeat: Infinity }}
                className={cn("absolute inset-0 bg-gradient-to-b", activeColors.gradient)} 
              />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-2xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500",
              view === 'start' ? "bg-orange-500 shadow-orange-500/40" : `${activeColors.bg} ${activeColors.shadow.replace('/20', '/40')}`
            )}
          >
            <Sparkles className={cn("w-4 h-4 sm:w-6 sm:h-6", view === 'start' ? "text-black" : "text-white")} />
          </motion.div>
          <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase italic font-serif">
            Chronos: <span className={cn("transition-colors duration-500", view === 'start' ? "text-orange-500" : activeColors.text)}>Bilgi Avcısı</span>
          </h1>
        </div>
        
        {view === 'game' && gameState && (
          <div className="flex items-center gap-2 sm:gap-6 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <div className={cn("flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 rounded-full border transition-colors duration-500", activeColors.border)}>
              <User className={cn("w-3 h-3", activeColors.text)} />
              <span className="text-white">{gameState.role}</span>
            </div>
            <div className="flex items-center gap-2 hidden sm:flex px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="text-white">{gameState.location}</span>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onTap={() => {
                setView('start');
                setSelectedRoleId(null);
                setGameState(null);
              }}
              className="hover:text-white transition-colors flex items-center gap-2 group p-2"
            >
              <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">YENİLE</span>
            </motion.button>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-start sm:justify-center p-6 max-w-5xl mx-auto w-full overflow-y-auto scrollbar-hide"
            >
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-4 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] uppercase tracking-[0.4em] font-mono mb-6"
                >
                  Dinamik Rol Yapma Deneyimi
                </motion.div>
                <h2 className="text-5xl sm:text-8xl font-serif italic font-bold mb-8 leading-[0.9] tracking-tighter">
                  Kendi Hikayeni <br /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-amber-500 animate-gradient-x">
                    İnşa Et.
                  </span>
                </h2>
                <p className="text-zinc-400 max-w-xl mx-auto text-base leading-relaxed font-light">
                  Bir rol seç, AI ile etkileşime geç ve bilinmeyenin derinliklerine dal. Her seçim yeni bir bilgi, her diyalog yeni bir macera.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pb-12">
                {ROLES.map((role) => (
                  <motion.div
                    key={role.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onPointerDown={() => {
                      if (window.navigator.vibrate) {
                        window.navigator.vibrate(10);
                      }
                    }}
                    onClick={() => {
                      handleStartGame(role.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStartGame(role.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group relative p-8 bg-white/5 border border-white/10 rounded-[2rem] text-left transition-all duration-500 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 touch-manipulation",
                      role.color === 'emerald' && "hover:border-emerald-500/50 hover:bg-emerald-500/5",
                      role.color === 'amber' && "hover:border-amber-500/50 hover:bg-amber-500/5",
                      role.color === 'indigo' && "hover:border-indigo-500/50 hover:bg-indigo-500/5",
                      role.color === 'fuchsia' && "hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0 right-0 p-6 text-6xl opacity-10 group-hover:opacity-30 transition-all duration-500 group-hover:scale-125 group-hover:rotate-12",
                      role.color === 'emerald' && "text-emerald-500",
                      role.color === 'amber' && "text-amber-500",
                      role.color === 'indigo' && "text-indigo-500",
                      role.color === 'fuchsia' && "text-fuchsia-500"
                    )}>
                      {role.icon}
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500",
                          role.color === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                          role.color === 'amber' && "bg-amber-500/20 text-amber-400",
                          role.color === 'indigo' && "bg-indigo-500/20 text-indigo-400",
                          role.color === 'fuchsia' && "bg-fuchsia-500/20 text-fuchsia-400"
                        )}>
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <motion.button
                          onTap={(e) => {
                            e.stopPropagation();
                            setShowRoleFact(showRoleFact === role.id ? null : role.id);
                          }}
                          className={cn(
                            "p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/info",
                            showRoleFact === role.id && "bg-white/20 border-white/30"
                          )}
                        >
                          <Info className={cn(
                            "w-4 h-4 transition-colors",
                            showRoleFact === role.id ? "text-white" : "text-zinc-500 group-hover/info:text-zinc-300"
                          )} />
                        </motion.button>
                      </div>
                      <h3 className="text-2xl font-bold mb-2 group-hover:tracking-tight transition-all">{role.name}</h3>
                      
                      <AnimatePresence mode="wait">
                        {showRoleFact === role.id ? (
                          <motion.div
                            key="fact"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={cn(
                              "text-sm leading-relaxed p-3 rounded-xl bg-white/5 border border-white/10 italic",
                              role.color === 'emerald' && "text-emerald-300",
                              role.color === 'amber' && "text-amber-300",
                              role.color === 'indigo' && "text-indigo-300",
                              role.color === 'fuchsia' && "text-fuchsia-300"
                            )}
                          >
                            <span className="font-bold uppercase text-[10px] block mb-1 opacity-50 tracking-widest">Biliyor muydun?</span>
                            {role.fact}
                          </motion.div>
                        ) : (
                          <motion.p 
                            key="desc"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm text-zinc-500 leading-relaxed max-w-[80%]"
                          >
                            {role.desc}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className={cn(
                      "mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-all",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-[-10px] sm:group-hover:translate-x-0",
                      role.color === 'emerald' && "text-emerald-400",
                      role.color === 'amber' && "text-amber-400",
                      role.color === 'indigo' && "text-indigo-400",
                      role.color === 'fuchsia' && "text-fuchsia-400"
                    )}>
                      <span>Maceraya Başla</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center p-6"
            >
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-12">
                <div className={cn("absolute inset-0 border-4 rounded-full opacity-20", activeColors.border.replace('/30', ''))} />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className={cn("absolute inset-0 border-t-4 rounded-full", activeColors.bg.replace('bg-', 'border-'))}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Terminal className={cn("w-10 h-10 animate-pulse", activeColors.text)} />
                </div>
              </div>
              <h3 className="text-3xl font-serif italic mb-3">Evren Hazırlanıyor...</h3>
              <p className="text-zinc-500 text-sm font-mono uppercase tracking-[0.3em] animate-pulse">Senaryo oluşturuluyor</p>
            </motion.div>
          )}

          {view === 'game' && gameState && (
            <motion.div 
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col h-full max-w-6xl mx-auto w-full overflow-hidden"
            >
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 scrollbar-hide">
                {gameState.history.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3 sm:gap-6 max-w-[90%] sm:max-w-[80%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-2xl transition-all duration-500",
                      msg.role === 'user' 
                        ? `${activeColors.bg} ${activeColors.border} ${activeColors.shadow.replace('/20', '/40')}` 
                        : "bg-white/5 border-white/10 shadow-blue-500/10"
                    )}>
                      {msg.role === 'user' 
                        ? <User className="w-4 h-4 sm:w-5 sm:h-5 text-black" /> 
                        : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      }
                    </div>
                    <div className="flex flex-col gap-2">
                      {msg.role === 'model' && (
                        <div className={cn("text-[8px] font-mono uppercase tracking-[0.3em] font-black opacity-40 ml-2", activeColors.text)}>
                          {gameState.role} // SİSTEM_YANITI
                        </div>
                      )}
                      <div className={cn(
                        "p-6 rounded-[2rem] text-base leading-relaxed shadow-2xl transition-all duration-500 border relative overflow-hidden",
                        msg.role === 'user' 
                          ? "bg-white/95 text-black font-medium border-white" 
                          : "bg-white/5 border-white/10 text-zinc-200 backdrop-blur-xl"
                      )}>
                        {msg.role === 'model' && (
                          <div className={cn("absolute top-0 left-0 w-1 h-full", activeColors.bg)} />
                        )}
                        <div className={cn(
                          "prose prose-sm max-w-none relative z-10",
                          msg.role === 'user' ? "prose-invert brightness-0" : "prose-invert"
                        )}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                        {msg.imageUrl && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
                          >
                            <img 
                              src={msg.imageUrl} 
                              alt="Scene" 
                              className="w-full h-auto object-cover max-h-[300px] sm:max-h-[400px]"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex gap-6 mr-auto max-w-[80%]">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                    </div>
                    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex gap-2 items-center backdrop-blur-xl">
                      <span className={cn("w-2 h-2 rounded-full animate-bounce", activeColors.bg)} />
                      <span className={cn("w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]", activeColors.bg)} />
                      <span className={cn("w-2 h-2 rounded-full animate-bounce [animation-delay:0.4s]", activeColors.bg)} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Sidebar / Info Panel (Desktop) */}
              <div className="absolute right-8 top-8 w-72 hidden 2xl:block space-y-6">
                {educationalFact && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-6 rounded-3xl border backdrop-blur-2xl shadow-2xl relative overflow-hidden group",
                      activeColors.glow,
                      activeColors.border
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", activeColors.gradient)} />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn("p-2 rounded-xl", activeColors.bg, "bg-opacity-20")}>
                          <Info className={cn("w-4 h-4", activeColors.text)} />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-black opacity-60">Bilgi Köşesi</span>
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed italic font-medium">
                        "{educationalFact}"
                      </p>
                    </div>
                  </motion.div>
                )}
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl relative overflow-hidden group">
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 bg-gradient-to-br", activeColors.gradient)} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 text-zinc-400">
                      <BookOpen className={cn("w-4 h-4 transition-colors duration-500", activeColors.text)} />
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-black opacity-60">Envanter</span>
                    </div>
                    <div className="text-xs text-zinc-600 italic font-mono">BOŞ_ENVANTER</div>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 sm:p-8 border-t border-white/10 bg-black/60 backdrop-blur-2xl">
                <form 
                  onSubmit={handleSendMessage}
                  className="relative max-w-4xl mx-auto flex items-center gap-4"
                >
                  <div className="flex-1 relative group">
                    <input 
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ne yapmak istersin? (örn: Etrafa bak...)"
                      enterKeyHint="send"
                      autoComplete="off"
                      className={cn(
                        "w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-base focus:outline-none transition-all duration-500",
                        roleColor === 'emerald' && "focus:border-emerald-500/50 focus:bg-emerald-500/5",
                        roleColor === 'amber' && "focus:border-amber-500/50 focus:bg-amber-500/5",
                        roleColor === 'indigo' && "focus:border-indigo-500/50 focus:bg-indigo-500/5",
                        roleColor === 'fuchsia' && "focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5",
                        roleColor === 'orange' && "focus:border-orange-500/50 focus:bg-orange-500/5"
                      )}
                      disabled={isLoading}
                    />
                    <div className={cn(
                      "absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 pointer-events-none blur-xl transition-opacity duration-500 -z-10",
                      activeColors.bg.replace('bg-', 'bg-opacity-10 bg-')
                    )} />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-black transition-all duration-500 shadow-2xl disabled:opacity-50",
                      activeColors.bg,
                      activeColors.shadow.replace('/20', '/40')
                    )}
                  >
                    <Send className="w-6 h-6" />
                  </motion.button>
                </form>
                <div className="mt-4 text-center">
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.4em] font-bold">AI_ENGINE_ACTIVE // MULTIVERSE_SYNCED</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
