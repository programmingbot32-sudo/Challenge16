import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Atom,
  Calculator,
  Globe2,
  BookOpen,
  Cpu,
  Landmark,
  Clock,
  Timer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Volume2,
  VolumeX,
  ChevronLeft,
  Brain,
  HelpCircle,
  Play,
  Check,
  Shuffle,
  BarChart2,
  Award,
  Zap,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuestionBankDomain, BankQuestion, Question } from '../types';
import { StorageService } from '../services/storageService';
import { SoundService } from '../services/soundService';

interface QuestionBankViewProps {
  onBackToHome: () => void;
}

// Icon mapper for domains
const getDomainIcon = (iconName: string) => {
  switch (iconName) {
    case 'Atom':
      return Atom;
    case 'Calculator':
      return Calculator;
    case 'Globe2':
      return Globe2;
    case 'BookOpen':
      return BookOpen;
    case 'Cpu':
      return Cpu;
    case 'Landmark':
      return Landmark;
    default:
      return Brain;
  }
};

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({ onBackToHome }) => {
  const [stage, setStage] = useState<'domain_select' | 'quiz' | 'completed'>('domain_select');
  const [domains, setDomains] = useState<QuestionBankDomain[]>([]);
  const [allBankQuestions, setAllBankQuestions] = useState<BankQuestion[]>([]);
  
  // Selection state
  const [selectedDomainId, setSelectedDomainId] = useState<string | 'all'>('all');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState<number>(30);
  const [nickname, setNickname] = useState<string>('');

  // Active quiz state
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => SoundService.isSoundMuted());

  // Result state
  const [answersLog, setAnswersLog] = useState<Array<{
    question: Question;
    selectedIndex: number;
    isCorrect: boolean;
    timeTaken: number;
  }>>([]);
  const [totalQuizTimeSeconds, setTotalQuizTimeSeconds] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const transitionTimeoutRef = useRef<any>(null);

  // Load domains & bank questions
  const loadBankData = () => {
    const dList = StorageService.getBankDomains();
    const qList = StorageService.getBankQuestions();
    setDomains(dList);
    setAllBankQuestions(qList);
  };

  useEffect(() => {
    loadBankData();
    StorageService.fetchBankFromDatabase().then(changed => {
      if (changed) loadBankData();
    });

    const handleUpdate = () => loadBankData();
    window.addEventListener('storage_update', handleUpdate);
    return () => window.removeEventListener('storage_update', handleUpdate);
  }, []);

  const toggleSound = () => {
    const next = SoundService.toggleMute();
    setIsSoundMuted(next);
  };

  // Get question count available for selected domain
  const availableCountForSelection = useMemo(() => {
    if (selectedDomainId === 'all') {
      return allBankQuestions.length;
    }
    return allBankQuestions.filter(q => q.domainId === selectedDomainId).length;
  }, [selectedDomainId, allBankQuestions]);

  // Selected domain object
  const currentDomainObj = useMemo(() => {
    if (selectedDomainId === 'all') return null;
    return domains.find(d => d.id === selectedDomainId) || null;
  }, [selectedDomainId, domains]);

  // Update default time when domain changes
  const handleDomainSelect = (domainId: string | 'all') => {
    setSelectedDomainId(domainId);
    if (domainId !== 'all') {
      const d = domains.find(x => x.id === domainId);
      if (d) {
        setQuestionTimeSeconds(d.defaultTimePerQuestion || 30);
        if (d.defaultQuestionCount) {
          setQuestionCount(Math.min(d.defaultQuestionCount, allBankQuestions.filter(q => q.domainId === domainId).length || 5));
        }
      }
    }
  };

  // Start the assessment with random questions
  const handleStartAssessment = () => {
    const countToPick = Math.max(1, questionCount);
    const sampled = StorageService.getRandomBankQuestions(selectedDomainId, countToPick);

    if (sampled.length === 0) {
      alert('لا توجد أسئلة كافية في هذا المجال حالياً. يرجى اختيار مجال آخر أو اختيار "جميع المجالات".');
      return;
    }

    // Apply custom duration if user modified and fairly shuffle options so the correct answer isn't always in the first position
    const configured = sampled.map(q => {
      const correctText = q.options[q.correctIndex] ?? q.options[0];
      const shuffledOptions = [...q.options];
      // Fisher-Yates shuffle
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      const newCorrectIndex = shuffledOptions.indexOf(correctText);

      return {
        ...q,
        options: shuffledOptions,
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
        duration: questionTimeSeconds || q.duration || 30
      };
    });

    setQuizQuestions(configured);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswersLog([]);
    setTimeLeft(configured[0]?.duration || 30);
    questionStartTimeRef.current = Date.now();
    setStage('quiz');
  };

  // Finish quiz handler
  const handleFinishQuiz = (finalLogs: typeof answersLog) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setAnswersLog(finalLogs);
    const totalTime = finalLogs.reduce((acc, curr) => acc + curr.timeTaken, 0);
    setTotalQuizTimeSeconds(totalTime);
    setStage('completed');

    try {
      SoundService.playFinish();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  // Handle Answer Option click
  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.max(1, (Date.now() - questionStartTimeRef.current) / 1000);
    const currentQ = quizQuestions[currentIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      SoundService.playCorrect();
    } else {
      SoundService.playWrong();
    }

    const updatedLogs = [
      ...answersLog,
      {
        question: currentQ,
        selectedIndex: optionIndex,
        isCorrect,
        timeTaken: timeSpent
      }
    ];

    // Smooth transition to next question
    transitionTimeoutRef.current = setTimeout(() => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < quizQuestions.length) {
        setCurrentIndex(nextIdx);
        setSelectedOption(null);
        setIsAnswered(false);
        setAnswersLog(updatedLogs);
        const nextQ = quizQuestions[nextIdx];
        setTimeLeft(nextQ.duration || questionTimeSeconds || 30);
        questionStartTimeRef.current = Date.now();
      } else {
        handleFinishQuiz(updatedLogs);
      }
    }, 1300);
  };

  // Timer countdown hook for active question
  useEffect(() => {
    if (stage !== 'quiz' || isAnswered || quizQuestions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        if (prev === 6) {
          SoundService.playCountdownTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, currentIndex, isAnswered, quizQuestions]);

  const handleTimeExpired = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(-1);
    SoundService.playTimeWarning();

    const currentQ = quizQuestions[currentIndex];
    const timeSpent = currentQ.duration || 30;

    const updatedLogs = [
      ...answersLog,
      {
        question: currentQ,
        selectedIndex: -1,
        isCorrect: false,
        timeTaken: timeSpent
      }
    ];

    transitionTimeoutRef.current = setTimeout(() => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < quizQuestions.length) {
        setCurrentIndex(nextIdx);
        setSelectedOption(null);
        setIsAnswered(false);
        setAnswersLog(updatedLogs);
        const nextQ = quizQuestions[nextIdx];
        setTimeLeft(nextQ.duration || questionTimeSeconds || 30);
        questionStartTimeRef.current = Date.now();
      } else {
        handleFinishQuiz(updatedLogs);
      }
    }, 1400);
  };

  // Performance calculations
  const totalCorrect = answersLog.filter(a => a.isCorrect).length;
  const scorePercentage = answersLog.length > 0 ? Math.round((totalCorrect / answersLog.length) * 100) : 0;

  const masteryLevel = useMemo(() => {
    if (scorePercentage >= 90) return { title: 'متميز وخبير معرفي', desc: 'أداء استثنائي وإتقان كامل للمفاهيم!', color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700' };
    if (scorePercentage >= 75) return { title: 'متقدم ومتمكن', desc: 'استيعاب قوي وحصيلة ممتازة مع دقة عالية.', color: 'text-teal-600 dark:text-teal-400', badgeBg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700' };
    if (scorePercentage >= 50) return { title: 'مستوى واعد وجيد', desc: 'أساس معرفي جيد يحتاج لمزيد من التدريب والممارسة.', color: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700' };
    return { title: 'في طور التعلم والتدريب', desc: 'فرصة رائعة لتطوير مهاراتك من خلال مراجعة الشروحات أدناه.', color: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700' };
  }, [scorePercentage]);

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8" dir="rtl">
      
      {/* 1. STAGE: DOMAIN SELECTION & CONFIGURATION */}
      {stage === 'domain_select' && (
        <div className="bg-white dark:bg-[#142238] rounded-3xl sm:rounded-[2.25rem] border-2 border-slate-200/90 dark:border-slate-700/80 p-5 sm:p-9 shadow-lg text-right space-y-7 animate-in fade-in">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#5A6E85] hover:text-[#009BB0] dark:text-[#94A3B8] dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
              <span>العودة للمسابقات</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#22D3EE] text-xs sm:text-sm font-black">
              <Zap className="w-4 h-4 text-[#009BB0]" />
              <span>تقييم فوري بدون تسجيل أو شهادة</span>
            </span>
          </div>

          {/* Title Area */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#D98218]" />
              <span>بنك الأسئلة والتقويم الذاتي الذكي</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9] tracking-tight">
              اختر المجال المعرفي لبدء التحدي والتقييم
            </h1>
            
            <p className="text-base sm:text-lg text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed max-w-2xl font-medium">
              اختر أحد المجالات أو اختر "جميع المجالات" لاختبار شامل. سيتم سحب أسئلة عشوائية متجددة فورياً من البنك لتقييم مستواك وتقديم مراجعة تعليمية شاملة.
            </p>
          </div>

          {/* Domains Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-lg font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#009BB0]" />
                <span>المجال المطلوب اختباره:</span>
              </label>
              <span className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] font-bold">
                إجمالي الأسئلة المتاحة: {allBankQuestions.length} سؤال
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Option: All Domains (Comprehensive) */}
              <button
                type="button"
                onClick={() => handleDomainSelect('all')}
                className={`relative text-right p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDomainId === 'all'
                    ? 'border-[#009BB0] bg-teal-50/70 dark:bg-teal-950/40 shadow-md ring-2 ring-[#009BB0]/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] hover:border-[#009BB0]/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {selectedDomainId === 'all' && (
                  <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#009BB0] text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-lg text-[#102B4C] dark:text-[#F1F5F9]">
                    جميع المجالات (شامل ومتنوع)
                  </h3>
                  <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 leading-relaxed">
                    سحب عشوائي منوع يشمل العلوم والرياضيات والجغرافيا واللغة والتاريخ والتقنية.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-between">
                  <span>اختبار شامل</span>
                  <span>{allBankQuestions.length} سؤال متاح</span>
                </div>
              </button>

              {/* Dynamic Domains */}
              {domains.map((domain) => {
                const isSelected = selectedDomainId === domain.id;
                const IconComponent = getDomainIcon(domain.icon);
                const qCount = allBankQuestions.filter(q => q.domainId === domain.id).length;

                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => handleDomainSelect(domain.id)}
                    className={`relative text-right p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#009BB0] bg-teal-50/70 dark:bg-teal-950/40 shadow-md ring-2 ring-[#009BB0]/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] hover:border-[#009BB0]/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#009BB0] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-teal-100/70 dark:bg-teal-900/40 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center mb-3">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-lg text-[#102B4C] dark:text-[#F1F5F9]">
                        {domain.name}
                      </h3>
                      <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 leading-relaxed">
                        {domain.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8] flex items-center justify-between">
                      <span>وقت السؤال: {domain.defaultTimePerQuestion}ث</span>
                      <span className="text-[#009BB0] dark:text-[#22D3EE] font-black">{qCount} سؤال</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assessment Parameters: Count & Time & Optional Name */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#F0F7FB] dark:bg-[#0B1321] border border-teal-100 dark:border-slate-800 space-y-5">
            <h3 className="font-black text-base sm:text-lg text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
              <Timer className="w-5 h-5 text-[#009BB0]" />
              <span>إعدادات التقييم المخصص:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Question Count Selector */}
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-2">
                  عدد أسئلة التقييم:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => {
                    const disabled = availableCountForSelection < num && availableCountForSelection > 0;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                          questionCount === num
                            ? 'bg-[#009BB0] text-white border-[#009BB0]'
                            : 'bg-white dark:bg-[#142238] border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9] hover:bg-slate-50'
                        } ${disabled ? 'opacity-50' : ''}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                {availableCountForSelection > 0 && availableCountForSelection < questionCount && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-bold">
                    * سيتم سحب الأسئلة المتاحة ({availableCountForSelection} سؤال).
                  </p>
                )}
              </div>

              {/* Time Per Question Selector */}
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-2">
                  وقت الإجابة لكل سؤال:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 30, 45, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setQuestionTimeSeconds(sec)}
                      className={`py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                        questionTimeSeconds === sec
                          ? 'bg-[#009BB0] text-white border-[#009BB0]'
                          : 'bg-white dark:bg-[#142238] border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9] hover:bg-slate-50'
                      }`}
                    >
                      {sec}ث
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Nickname / Anonymous */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-2">
                  الاسم المستعار (اختياري تماماً):
                </label>
                <input
                  type="text"
                  placeholder="مشارك مجهول (اختياري)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] focus:outline-none focus:border-[#009BB0]"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={availableCountForSelection === 0}
              className={`w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center gap-3 transition-all duration-200 shadow-md cursor-pointer ${
                availableCountForSelection === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white shadow-[#009BB0]/25'
              }`}
            >
              <Shuffle className="w-5 h-5" />
              <span>انطلاق التقييم الذاتي (سحب أسئلة عشوائية من البنك)</span>
            </button>
          </div>

        </div>
      )}

      {/* 2. STAGE: ACTIVE QUIZ */}
      {stage === 'quiz' && quizQuestions.length > 0 && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Top Status Bar */}
          <div className="bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center font-black text-sm">
                {currentIndex + 1}
              </span>
              <div>
                <div className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">
                  السؤال {currentIndex + 1} من {quizQuestions.length}
                </div>
                <div className="text-sm font-black text-[#102B4C] dark:text-[#F1F5F9]">
                  {quizQuestions[currentIndex]?.category || (currentDomainObj?.name || 'تقييم شامل')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#5A6E85] dark:text-[#94A3B8] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isSoundMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم الصوت'}
              >
                {isSoundMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-[#009BB0]" />}
              </button>

              {/* Countdown Timer */}
              <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono font-black text-base border ${
                timeLeft <= 5
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#22D3EE]'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{String(timeLeft).padStart(2, '0')}ث</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#009BB0] to-[#22D3EE] transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white dark:bg-[#142238] rounded-3xl border-2 border-slate-200/90 dark:border-slate-700/80 p-6 sm:p-9 shadow-lg text-right space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9] leading-relaxed">
              {quizQuestions[currentIndex]?.text}
            </h2>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              {quizQuestions[currentIndex]?.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === quizQuestions[currentIndex].correctIndex;

                let btnStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] text-[#102B4C] dark:text-[#F1F5F9] hover:border-[#009BB0]/60 hover:bg-slate-50 dark:hover:bg-slate-800/60';
                
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-black ring-2 ring-emerald-500/30';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold';
                  } else {
                    btnStyle = 'border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-right text-base sm:text-lg font-bold flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                        isAnswered && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isAnswered && isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#5A6E85] dark:text-[#94A3B8]'
                      }`}>
                        {idx === 0 ? 'أ' : idx === 1 ? 'ب' : idx === 2 ? 'ج' : 'د'}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box on answer */}
            {isAnswered && quizQuestions[currentIndex]?.explanation && (
              <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm sm:text-base text-[#102B4C] dark:text-[#F1F5F9] font-medium leading-relaxed animate-in fade-in flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-[#009BB0] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#009BB0] dark:text-[#22D3EE]">الشرح والتوضيح: </span>
                  {quizQuestions[currentIndex].explanation}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. STAGE: COMPLETED ASSESSMENT & DETAILED DIAGNOSTIC */}
      {stage === 'completed' && (
        <div className="bg-white dark:bg-[#142238] rounded-3xl sm:rounded-[2.25rem] border-2 border-slate-200/90 dark:border-slate-700/80 p-6 sm:p-10 shadow-lg text-right space-y-8 animate-in fade-in">
          
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#22D3EE] text-xs sm:text-sm font-black">
              <Zap className="w-4 h-4" />
              <span>اكتمل التقييم الذاتي المعرفي</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
              تقرير التقييم والتشخيص المعرفي
            </h1>

            <p className="text-sm sm:text-base text-[#5A6E85] dark:text-[#94A3B8] font-medium">
              تم رصد نتائج إجاباتك الفورية من بنك الأسئلة بهدف التطوير والتقييم الذاتي.
            </p>
          </div>

          {/* Big Score & Mastery Summary Card */}
          <div className={`p-6 sm:p-8 rounded-3xl border-2 text-center space-y-4 ${masteryLevel.badgeBg}`}>
            <div className="text-xs sm:text-sm font-black text-[#5A6E85] dark:text-[#94A3B8]">
              النتيجة الإجمالية
            </div>
            
            <div className="text-5xl sm:text-6xl font-black font-mono text-[#102B4C] dark:text-[#F1F5F9]">
              {scorePercentage}%
            </div>

            <div className={`text-xl sm:text-2xl font-black ${masteryLevel.color}`}>
              {masteryLevel.title}
            </div>

            <p className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] font-medium max-w-md mx-auto">
              {masteryLevel.desc}
            </p>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-3 pt-3 max-w-lg mx-auto">
              <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الإجابات الصحيحة</div>
                <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {totalCorrect} من {answersLog.length}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">المجال المعرفي</div>
                <div className="text-sm sm:text-base font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1 truncate">
                  {currentDomainObj ? currentDomainObj.name : 'شامل ومتنوع'}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الزمن الكلي</div>
                <div className="text-lg sm:text-xl font-black text-[#009BB0] dark:text-[#22D3EE] mt-1 font-mono">
                  {Math.round(totalQuizTimeSeconds)} ثانية
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleStartAssessment}
              className="w-full py-4 px-6 rounded-2xl bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>إعادة التحدي بأسئلة عشوائية جديدة</span>
            </button>

            <button
              type="button"
              onClick={() => setStage('domain_select')}
              className="w-full py-4 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#009BB0] bg-white dark:bg-[#142238] text-[#102B4C] dark:text-[#F1F5F9] font-black text-base flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Shuffle className="w-5 h-5 text-[#009BB0]" />
              <span>تغيير المجال المعرفي والإعدادات</span>
            </button>
          </div>

          {/* Comprehensive Questions Review List */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#009BB0]" />
              <span>مراجعة الإجابات والشروحات التعليمية:</span>
            </h3>

            <div className="space-y-3.5">
              {answersLog.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border-2 text-right space-y-3 ${
                      item.isCorrect
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 ${
                          item.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <h4 className="font-black text-base sm:text-lg text-[#102B4C] dark:text-[#F1F5F9]">
                          {item.question.text}
                        </h4>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      }`}>
                        {item.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                      </span>
                    </div>

                    {/* Answers Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-bold pt-1">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700">
                        <span className="text-[#5A6E85] dark:text-[#94A3B8]">إجابتك: </span>
                        <span className={item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.selectedIndex >= 0 ? item.question.options[item.selectedIndex] : 'لم تتم الإجابة (انتهى الوقت)'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700">
                        <span className="text-[#5A6E85] dark:text-[#94A3B8]">الإجابة النموذجية: </span>
                        <span className="text-emerald-600 font-black">
                          {item.question.options[item.question.correctIndex]}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    {item.question.explanation && (
                      <div className="text-xs sm:text-sm font-medium text-[#5A6E85] dark:text-[#94A3B8] bg-white/70 dark:bg-[#142238]/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                        <span className="font-bold text-[#009BB0] dark:text-[#22D3EE]">💡 توضيح: </span>
                        {item.question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Back Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full py-4 rounded-2xl bg-[#102B4C] hover:bg-[#1A3B63] text-white font-black text-base flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
            >
              <span>العودة للصفحة الرئيسية للمسابقات</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
