
import React, { useState, useEffect, useCallback } from 'react';
import { CHILDREN, ChildId, Transaction, TransactionType, StudyCategory, WithdrawCategory, AppSettings, DEFAULT_SETTINGS } from './types';
import { getEncouragementMessage } from './services/geminiService';
import { processInterest, calculateBalance, getStudyCategoryLabel, getWithdrawCategoryLabel } from './services/logicService';
import { StatsChart } from './components/StatsChart';
import { 
  PiggyBank, 
  Tv, 
  BookOpen, 
  History, 
  Trash2, 
  Trophy,
  Settings,
  UserCircle2,
  TrendingUp,
  PenTool,
  PlaySquare,
  X,
  Lock,
  LogOut,
  Gamepad2,
  MonitorPlay,
  Cloud,
  CheckCircle2,
  Key,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// --- Helper Components ---

// Fix: Added formatTime helper function to convert minutes into a readable time string (e.g., 90 -> 1시간 30분)
const formatTime = (minutes: number) => {
  const absMins = Math.abs(minutes);
  if (absMins < 60) return `${absMins}분`;
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children?: React.ReactNode 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 flex justify-between items-center bg-white z-10 border-b border-slate-50">
          <h3 className="text-xl font-display font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 pt-2 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
};

const NumberKeypad = ({ onValueChange }: { onValueChange: (val: number) => void }) => {
  const [value, setValue] = useState<string>('');

  const handlePress = (num: number) => {
    if (value.length > 3) return; 
    const newValue = value + num.toString();
    setValue(newValue);
    onValueChange(parseInt(newValue, 10));
  };

  const handleBackspace = () => {
    const newValue = value.slice(0, -1);
    setValue(newValue);
    onValueChange(newValue ? parseInt(newValue, 10) : 0);
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          onClick={() => handlePress(num)}
          className="h-14 rounded-xl bg-slate-100 text-xl font-bold text-slate-700 active:bg-slate-200 active:scale-95 transition-all shadow-sm"
        >
          {num}
        </button>
      ))}
      <div className="col-span-1"></div>
      <button
        onClick={() => handlePress(0)}
        className="h-14 rounded-xl bg-slate-100 text-xl font-bold text-slate-700 active:bg-slate-200 active:scale-95 transition-all shadow-sm"
      >
        0
      </button>
      <button
        onClick={handleBackspace}
        className="h-14 rounded-xl bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 active:scale-95 transition-all shadow-sm"
      >
        <Trash2 size={24} />
      </button>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [activeChildId, setActiveChildId] = useState<ChildId>('seoa');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null means checking
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('deposit');
  const [step, setStep] = useState<'category-select' | 'amount-input'>('category-select');
  
  const [selectedStudyType, setSelectedStudyType] = useState<StudyCategory>('workbook');
  const [selectedWithdrawType, setSelectedWithdrawType] = useState<WithdrawCategory>('youtube_game');
  
  // Input States
  const [inputAmount, setInputAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiToast, setAiToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');

  // Parent/Auth States
  const [isParentMode, setIsParentMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const activeChild = CHILDREN[activeChildId];

  // Fix: Added theme object to dynamically style the dashboard based on the active child's color
  const theme = {
    bg: activeChildId === 'seoa' ? 'bg-gradient-to-br from-rose-400 to-rose-500' : 'bg-gradient-to-br from-sky-400 to-sky-500',
    text: activeChildId === 'seoa' ? 'text-rose-600' : 'text-sky-600',
    lightBg: activeChildId === 'seoa' ? 'bg-rose-50' : 'bg-sky-50',
  };

  // --- Persistence & API Key Check ---

  useEffect(() => {
    const init = async () => {
      // Load data
      const savedTx = localStorage.getItem('timeBankTransactions');
      const savedSettings = localStorage.getItem('timeBankSettings');
      if (savedTx) { try { setTransactions(JSON.parse(savedTx)); } catch (e) { console.error(e); } }
      if (savedSettings) { try { setSettings(JSON.parse(savedSettings)); } catch (e) { console.error(e); } }

      // Check API Key
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keySelected);
      } else {
        setHasApiKey(true); // Default to true if outside studio environment
      }
    };
    init();
  }, []);

  useEffect(() => {
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
        localStorage.setItem('timeBankTransactions', JSON.stringify(transactions));
        localStorage.setItem('timeBankSettings', JSON.stringify(settings));
        setSyncStatus('synced');
    }, 800);
    return () => clearTimeout(timer);
  }, [transactions, settings]);

  // --- Interest Logic ---
  useEffect(() => {
    if (transactions.length === 0) return;
    let newInterestTx: Transaction[] = [];
    (['seoa', 'seou'] as ChildId[]).forEach(id => {
       const interestTx = processInterest(transactions, id, settings);
       if (interestTx.length > 0) newInterestTx = [...newInterestTx, ...interestTx];
    });
    if (newInterestTx.length > 0) {
      setTransactions(prev => [...prev, ...newInterestTx]);
      setAiToast(`와우! TV를 참아서 이자가 ${newInterestTx.length}건 쌓였어요! 🎉`);
      setTimeout(() => setAiToast(null), 5000);
    }
  }, [transactions.length, settings]);

  // --- Handlers ---

  const currentBalance = calculateBalance(transactions, activeChildId);

  const handleTransaction = async () => {
    if (inputAmount <= 0) return;
    if (modalType === 'withdraw' && inputAmount > currentBalance) {
      alert("저축된 시간이 부족해요! 공부를 더 해서 시간을 모아보세요. 💪");
      return;
    }

    setIsProcessing(true);
    
    try {
      const aiMessage = await getEncouragementMessage(activeChild.name, inputAmount, modalType);
      
      let finalAmount = inputAmount;
      let multiplier = 1;

      if (modalType === 'deposit') {
        multiplier = settings.multipliers[selectedStudyType];
        finalAmount = Math.floor(inputAmount * multiplier);
      } else if (modalType === 'withdraw') {
        multiplier = settings.withdrawMultipliers[selectedWithdrawType];
        finalAmount = Math.floor(inputAmount * multiplier);
        if (finalAmount > currentBalance) {
            alert(`차감 배수가 적용되어 시간이 부족해요! (${finalAmount}분 필요)`);
            setIsProcessing(false);
            return;
        }
      }

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        childId: activeChildId,
        type: modalType,
        amount: finalAmount,
        baseAmount: inputAmount,
        multiplier: multiplier,
        timestamp: Date.now(),
        aiMessage: aiMessage,
        note: modalType === 'deposit' ? getStudyCategoryLabel(selectedStudyType) : getWithdrawCategoryLabel(selectedWithdrawType)
      };

      setTransactions(prev => [newTransaction, ...prev]);
      setAiToast(aiMessage);
      setTimeout(() => setAiToast(null), 5000);

    } catch (error: any) {
      console.error(error);
      if (error.message === "API_KEY_ISSUE") {
        alert("구글 클라우드 API 키 설정에 문제가 발생했습니다. 키를 다시 선택해 주세요.");
        handleOpenApiKeySelection();
      }
    } finally {
      setIsProcessing(false);
      setIsModalOpen(false);
      setInputAmount(0);
      setStep('category-select'); 
    }
  };

  const handleOpenApiKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasApiKey(true); // Proceed assuming success per guidelines
        setAiToast("API 키가 성공적으로 설정되었습니다!");
        setTimeout(() => setAiToast(null), 3000);
    } else {
        alert("API 키를 선택할 수 없는 환경입니다.");
    }
  };

  const openModal = (type: TransactionType) => {
    setModalType(type);
    setInputAmount(0);
    setStep('category-select');
    setIsModalOpen(true);
  };

  // Fix: Added renderStudyCategorySelection to provide UI for selecting study types
  const renderStudyCategorySelection = () => (
    <div className="space-y-3">
      {[
        { id: 'workbook', label: '문제집 풀기', icon: <PenTool size={20} />, color: 'bg-blue-50 text-blue-600' },
        { id: 'book', label: '책 읽기', icon: <BookOpen size={20} />, color: 'bg-emerald-50 text-emerald-600' },
        { id: 'video', label: '영상 공부', icon: <PlaySquare size={20} />, color: 'bg-purple-50 text-purple-600' },
      ].map((cat) => (
        <button
          key={cat.id}
          onClick={() => { setSelectedStudyType(cat.id as StudyCategory); setStep('amount-input'); }}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>{cat.icon}</div>
            <span className="font-bold text-slate-700">{cat.label}</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
        </button>
      ))}
    </div>
  );

  // Fix: Added renderWithdrawCategorySelection to provide UI for selecting usage types
  const renderWithdrawCategorySelection = () => (
    <div className="space-y-3">
      {[
        { id: 'youtube_game', label: '유튜브/게임', icon: <Gamepad2 size={20} />, color: 'bg-orange-50 text-orange-600' },
        { id: 'tv_watch', label: 'TV 시청', icon: <MonitorPlay size={20} />, color: 'bg-red-50 text-red-600' },
      ].map((cat) => (
        <button
          key={cat.id}
          onClick={() => { setSelectedWithdrawType(cat.id as WithdrawCategory); setStep('amount-input'); }}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>{cat.icon}</div>
            <span className="font-bold text-slate-700">{cat.label}</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
        </button>
      ))}
    </div>
  );

  // --- Sub-renderers ---

  const Onboarding = () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
      <div className="w-24 h-24 bg-yellow-100 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner animate-bounce">
         <PiggyBank size={48} className="text-yellow-500" fill="currentColor" />
      </div>
      <h1 className="text-3xl font-display font-bold text-slate-800 mb-4">반가워요!<br/>시간 저금통입니다</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        아이들의 공부 시간을 Gemini AI와 함께<br/>
        즐겁게 관리해 보세요. 시작하려면<br/>
        <strong>구글 클라우드 API 키</strong> 설정이 필요합니다.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <button 
          onClick={handleOpenApiKeySelection}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Key size={20} />
          API 키 설정하기
        </button>
        
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors py-2"
        >
          <AlertCircle size={14} />
          결제 및 요금 안내 확인하기 <ExternalLink size={12} />
        </a>
      </div>

      <div className="mt-12 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-[11px] text-slate-400">
         <p className="font-bold text-slate-500 mb-1">💡 도움말</p>
         <ul className="list-disc list-inside space-y-1">
           <li>유료(Paid) 구글 클라우드 프로젝트의 키가 필요합니다.</li>
           <li>키 설정 후 Gemini AI가 아이들을 칭찬해줍니다!</li>
         </ul>
      </div>
    </div>
  );

  const ParentDashboard = () => {
    const getStats = (childId: ChildId) => {
      const txs = transactions.filter(t => t.childId === childId);
      const earned = txs.filter(t => t.type === 'deposit' || t.type === 'interest').reduce((acc, t) => acc + t.amount, 0);
      const spent = txs.filter(t => t.type === 'withdraw').reduce((acc, t) => acc + t.amount, 0);
      return { earned, spent, balance: earned - spent };
    };

    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserCircle2 className="text-indigo-500" /> 부모님 대시보드
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {syncStatus === 'syncing' ? <Cloud size={12} className="animate-pulse text-indigo-500" /> : <CheckCircle2 size={12} className="text-green-500" />}
                <span>{syncStatus === 'syncing' ? '저장 중' : '동기화됨'}</span>
            </div>
        </div>
        
        {(['seoa', 'seou'] as ChildId[]).map(id => {
            const stat = getStats(id);
            const isSeoa = id === 'seoa';
            return (
                <div key={id} className={`bg-white rounded-3xl p-6 shadow-sm border border-${isSeoa ? 'rose' : 'sky'}-100 relative overflow-hidden`}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{CHILDREN[id].avatarEmoji}</span>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{CHILDREN[id].name}</h3>
                                <span className={`text-[10px] bg-${isSeoa ? 'rose' : 'sky'}-100 text-${isSeoa ? 'rose' : 'sky'}-600 px-2 py-0.5 rounded-full font-bold uppercase`}>{id}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 mb-1">적립</p>
                                <p className="font-bold text-green-600">{formatTime(stat.earned)}</p>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl">
                                <p className="text-[10px] text-slate-400 mb-1">사용</p>
                                <p className="font-bold text-red-500">{formatTime(stat.spent)}</p>
                            </div>
                            <div className={`p-2 bg-${isSeoa ? 'rose' : 'sky'}-50 rounded-xl border border-${isSeoa ? 'rose' : 'sky'}-100`}>
                                <p className={`text-[10px] text-${isSeoa ? 'rose' : 'sky'}-400 mb-1`}>잔액</p>
                                <p className={`font-bold text-${isSeoa ? 'rose' : 'sky'}-600`}>{formatTime(stat.balance)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    );
  };

  if (hasApiKey === null) return <div className="min-h-screen bg-slate-50" />;
  if (hasApiKey === false) return <Onboarding />;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans border-x border-slate-200">
      
      {/* Header */}
      <header className="px-6 py-5 bg-white/90 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
            <PiggyBank className="text-yellow-500" fill="currentColor" /> 시간 저금통
          </h1>
          <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
             {isParentMode ? '👨‍👩‍👧‍👦 관리자 모드' : '공부하고 TV 시간을 모아요!'}
          </p>
        </div>
        <div className="flex gap-2">
          {isParentMode ? (
             <>
               <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-slate-50 rounded-full text-slate-600 border border-slate-100 shadow-sm"><Settings size={20} /></button>
               <button onClick={() => setIsParentMode(false)} className="p-2 bg-slate-50 rounded-full text-slate-600 border border-slate-100 shadow-sm"><LogOut size={20} /></button>
             </>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-600 shadow-sm">
              <UserCircle2 size={16} /> 부모님
            </button>
          )}
        </div>
      </header>

      {/* Child Selector */}
      {!isParentMode && (
        <div className="p-4 flex gap-3">
          {Object.values(CHILDREN).map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveChildId(child.id)}
              className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-3xl transition-all border-2 ${
                activeChildId === child.id ? `border-${child.themeColor}-500 bg-${child.themeColor}-50 shadow-md scale-[1.03]` : 'border-white bg-white opacity-60'
              }`}
            >
              <span className="text-3xl">{child.avatarEmoji}</span>
              <span className={`font-bold text-sm ${activeChildId === child.id ? `text-${child.themeColor}-700` : 'text-slate-600'}`}>{child.name}</span>
            </button>
          ))}
        </div>
      )}

      {isParentMode ? <ParentDashboard /> : (
          <div className="px-4 space-y-4">
            <div className={`relative overflow-hidden rounded-3xl p-7 text-white shadow-xl transition-all duration-500 ${theme.bg}`}>
                <div className="relative z-10 text-center">
                    <p className="opacity-90 font-medium mb-1">{activeChild.name}의 모은 시간</p>
                    <div className="text-6xl font-display font-bold tracking-tight mb-3 drop-shadow-md">{formatTime(currentBalance)}</div>
                    <div className="inline-flex items-center gap-1.5 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md border border-white/30">
                        <Trophy size={14} className="text-yellow-300" />
                        <span>{currentBalance >= 120 ? '훌륭해요!' : '더 모아볼까요?'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => openModal('deposit')} className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all">
                    <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3"><BookOpen className="text-green-600" size={28} /></div>
                    <span className="font-bold text-slate-700">공부 기록</span>
                </button>
                <button onClick={() => openModal('withdraw')} className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3"><Tv className="text-red-600" size={28} /></div>
                    <span className="font-bold text-slate-700">TV 보기</span>
                </button>
            </div>

            <StatsChart transactions={transactions.filter(t => t.childId === activeChildId)} />

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
                <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2 border-b border-slate-50 pb-3"><History size={18} className="text-slate-400" /> 최근 활동</h3>
                <div className="space-y-4">
                    {transactions.filter(t => t.childId === activeChildId).slice(0, 10).map(t => (
                        <div key={t.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-green-50 text-green-600' : t.type === 'interest' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                                    {t.type === 'deposit' ? <BookOpen size={16} /> : t.type === 'interest' ? <TrendingUp size={16} /> : <Tv size={16} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-xs">{t.note}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            <div className={`font-display font-bold text-base ${t.type === 'withdraw' ? 'text-red-500' : 'text-green-500'}`}>
                                {t.type === 'withdraw' ? '-' : '+'}{t.amount}분
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
      )}

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalType === 'deposit' ? '📚 공부 시간 기록' : '📺 TV 시청 시간'}>
        {step === 'category-select' ? (
           modalType === 'deposit' ? renderStudyCategorySelection() : renderWithdrawCategorySelection()
        ) : (
          <div className="flex flex-col items-center">
            <div className="text-center mb-6">
                <div className="text-5xl font-bold text-slate-800 font-display mb-2">{inputAmount}분</div>
                {inputAmount > 0 && <p className="text-xs text-slate-400">= 실제 {Math.floor(inputAmount * (modalType === 'deposit' ? settings.multipliers[selectedStudyType] : settings.withdrawMultipliers[selectedWithdrawType]))}분 {modalType === 'deposit' ? '적립' : '차감'}</p>}
            </div>
            <div className="w-full">
              <button disabled={inputAmount === 0 || isProcessing} onClick={handleTransaction} className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${inputAmount === 0 ? 'bg-slate-300' : modalType === 'deposit' ? 'bg-green-500' : 'bg-red-500'}`}>
                {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : '기록하기'}
              </button>
              <NumberKeypad onValueChange={setInputAmount} />
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="부모님 로그인">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="text-blue-500" size={32} /></div>
          <p className="text-slate-600 mb-8 font-medium">대시보드 확인 및 설정을 위해<br/>보호자 인증이 필요합니다.</p>
          <button onClick={() => { setIsParentMode(true); setShowLoginModal(false); }} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Google 계정으로 계속하기</button>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
             <button onClick={handleOpenApiKeySelection} className="text-xs text-indigo-500 font-bold flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <Key size={14} /> API 키 재설정 (오류 발생 시)
             </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="배수 설정 관리">
        <div className="space-y-6 pb-4">
          <div>
            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-green-500" /> 적립 및 차감 배수</h4>
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {[ 
                {k:'workbook', l:'문제집(적립)', c:'green', t:'multipliers'}, 
                {k:'book', l:'책 읽기(적립)', c:'emerald', t:'multipliers'}, 
                {k:'youtube_game', l:'유튜브/게임(차감)', c:'red', t:'withdrawMultipliers'} 
              ].map(item => (
                <div key={item.k} className="flex items-center justify-between gap-4">
                  <span className="text-slate-600 text-sm font-bold">{item.l}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={// @ts-ignore
                    settings[item.t][item.k]} onChange={(e) => setSettings({...settings, [item.t]: {...settings[item.t as keyof AppSettings] as object, [item.k]: parseFloat(e.target.value) || 1}})} className="w-20 p-2 rounded-xl border border-slate-200 text-center font-bold bg-white outline-none" />
                    <span className="text-[10px] font-bold text-slate-400">배</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
             <p className="text-[10px] text-slate-400 mb-3">※ 배수 설정은 소수점 첫째 자리까지 입력 가능합니다.</p>
             <button onClick={() => { setSettings(DEFAULT_SETTINGS); alert("초기화되었습니다."); }} className="w-full py-4 text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-2xl hover:text-red-500 hover:bg-red-50">설정 초기값으로 복구</button>
          </div>
        </div>
      </Modal>

      {aiToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-sm px-0 animate-in slide-in-from-top-6 fade-in duration-500">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white px-6 py-5 rounded-[2rem] shadow-2xl flex items-start gap-4 border border-white/10 ring-1 ring-white/20">
             <div className="text-3xl animate-bounce">🤖</div>
             <div className="flex-1">
               <p className="font-bold text-yellow-400 text-[10px] mb-1 uppercase tracking-widest">AI Guardian</p>
               <p className="text-sm leading-relaxed font-medium">{aiToast}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
