import React, { useState, useEffect } from 'react';
import { 
  X,
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Trophy,
  Clock, 
  Users, 
  Layers, 
  HelpCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Calendar,
  Lock,
  Eye,
  Zap,
  ShieldAlert,
  Globe,
  Link as LinkIcon,
  Send,
  Timer
} from 'lucide-react';
import { Competition, Question, AccessCode, ParticipationType, CompetitionType, CompetitionVisibility, TelegramGroupItem } from '../types';
import { AIService } from '../services/aiService';
import { TelegramService } from '../services/telegramService';
import { TelegramGroupSelector } from './TelegramGroupSelector';

interface CompetitionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (competition: Competition) => void;
  currentTeacher: AccessCode | null;
  isAdmin?: boolean;
  editingCompetition?: Competition | null;
}

export const CompetitionBuilderModal: React.FC<CompetitionBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentTeacher,
  isAdmin = false,
  editingCompetition = null,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [participationType, setParticipationType] = useState<ParticipationType>('individual');
  const [competitionType, setCompetitionType] = useState<CompetitionType>('live');
  const [visibility, setVisibility] = useState<CompetitionVisibility>('public');
  const [compSource, setCompSource] = useState<'platform' | 'teacher'>('platform');
  const [customSupervisor, setCustomSupervisor] = useState('');
  const [questionDuration, setQuestionDuration] = useState(30);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [singleAttempt, setSingleAttempt] = useState(true);
  const [hideAnswersUntilEnd, setHideAnswersUntilEnd] = useState(true);
  const [rewardType, setRewardType] = useState('وسام التميز والتفوق');
  const [autoBroadcastTelegram, setAutoBroadcastTelegram] = useState(true);
  const [autoNotifyStartTelegram, setAutoNotifyStartTelegram] = useState(true);
  const [autoBroadcastResultsTelegram, setAutoBroadcastResultsTelegram] = useState(true);
  const [targetTelegramGroups, setTargetTelegramGroups] = useState<string[]>([]);
  const [sendToAllTelegramGroups, setSendToAllTelegramGroups] = useState<boolean>(true);
  const [availableTelegramGroups, setAvailableTelegramGroups] = useState<TelegramGroupItem[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);

  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('علوم');
  const [aiCount, setAiCount] = useState(5);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const [errors, setErrors] = useState<string[]>([]);

  const formatLocalISO = (d: Date) => {
    const pad = (n: number) => n < 10 ? `0${n}` : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toISOTimestamp = (val: string): string => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString();
  };

  useEffect(() => {
    if (editingCompetition) {
      setName(editingCompetition.name);
      setDescription(editingCompetition.description || '');
      setParticipationType(editingCompetition.participationType);
      setCompetitionType(editingCompetition.competitionType || 'live');
      setVisibility(editingCompetition.visibility || 'public');
      setCompSource(editingCompetition.source || (isAdmin ? 'platform' : 'teacher'));
      setCustomSupervisor(editingCompetition.teacherDisplayName || editingCompetition.schoolName || (currentTeacher?.teacherDisplayName || currentTeacher?.school || ''));
      setQuestionDuration(editingCompetition.questionDuration || 30);
      setStartTime(editingCompetition.startTime ? formatLocalISO(new Date(editingCompetition.startTime)) : formatLocalISO(new Date()));
      setEndTime(editingCompetition.endTime ? formatLocalISO(new Date(editingCompetition.endTime)) : formatLocalISO(new Date(Date.now() + 86400000)));
      setSingleAttempt(editingCompetition.singleAttempt ?? true);
      setHideAnswersUntilEnd(editingCompetition.hideAnswersUntilEnd ?? true);
      setRewardType(editingCompetition.rewardType || 'وسام التميز والتفوق');
      setAutoBroadcastTelegram(editingCompetition.autoBroadcastTelegram ?? true);
      setAutoNotifyStartTelegram(editingCompetition.autoNotifyStartTelegram ?? true);
      setAutoBroadcastResultsTelegram(editingCompetition.autoBroadcastResultsTelegram ?? true);
      const existingGroups = Array.isArray(editingCompetition.targetTelegramGroups) ? editingCompetition.targetTelegramGroups : [];
      setTargetTelegramGroups(existingGroups);
      setSendToAllTelegramGroups(existingGroups.length === 0);
      setQuestions(editingCompetition.questions || []);
    } else {
      setName('');
      setDescription('');
      setParticipationType('individual');
      setCompetitionType('live');
      setVisibility('public');
      setCompSource(isAdmin ? 'platform' : 'teacher');
      setCustomSupervisor(currentTeacher?.teacherDisplayName || currentTeacher?.school || '');
      setQuestionDuration(30);

      const now = new Date();
      const defaultStart = new Date(now.getTime() + 10 * 60000);
      const defaultEnd = new Date(now.getTime() + 2 * 3600000);

      setStartTime(formatLocalISO(defaultStart));
      setEndTime(formatLocalISO(defaultEnd));
      setSingleAttempt(true);
      setHideAnswersUntilEnd(true);
      setRewardType('وسام التميز والتفوق');
      setAutoBroadcastTelegram(true);
      setAutoNotifyStartTelegram(true);
      setAutoBroadcastResultsTelegram(true);
      setTargetTelegramGroups([]);
      setSendToAllTelegramGroups(true);
      setQuestions([]);
    }
    if (isOpen && isAdmin) {
      const groups = TelegramService.getGroupsList();
      setAvailableTelegramGroups(groups);
      TelegramService.fetchSettingsFromServer().then(remote => {
        if (remote) {
          setAvailableTelegramGroups(TelegramService.getGroupsList());
        }
      });
    }
    setStep(1);
    setErrors([]);
  }, [editingCompetition, isOpen, isAdmin, currentTeacher]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: CompetitionType) => {
    setCompetitionType(newType);
    if (newType === 'live') {
      setSingleAttempt(true);
      setHideAnswersUntilEnd(true);
      const start = new Date(startTime ? new Date(startTime).getTime() : Date.now());
      const totalDurMs = Math.max(2 * 60000, ((questions.length || 5) * (questionDuration || 30)) * 1000);
      const end = new Date(start.getTime() + totalDurMs);
      setEndTime(formatLocalISO(end));
    } else if (newType === 'windowed') {
      setSingleAttempt(true);
      setHideAnswersUntilEnd(true);
    } else if (newType === 'open') {
      setSingleAttempt(false);
      setHideAnswersUntilEnd(false);
      setAutoNotifyStartTelegram(false);
      setAutoBroadcastResultsTelegram(false);
    }
  };

  const handleAddManualQuestion = () => {
    const defaultQDuration = questionDuration > 0 ? questionDuration : 30;
    const newQ: Question = {
      id: `q_manual_${Date.now()}_${questions.length + 1}`,
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      duration: defaultQDuration,
      category: aiCategory || 'عام'
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: keyof Question, value: any) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = text;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const handleGenerateAiQuestions = async () => {
    setAiNotice(null);
    if (!aiTopic.trim()) {
      setAiNotice({ text: 'يرجى كتابة موضوع الأسئلة المطلوبة أولاً.', isError: true });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const generated = await AIService.generateQuestions({
        topic: aiTopic.trim(),
        category: aiCategory,
        difficulty: 'متوسط',
        count: aiCount,
        audience: 'students'
      });

      if (generated && generated.length > 0) {
        const defaultQDuration = questionDuration > 0 ? questionDuration : 30;
        const mapped = generated.map(g => ({
          ...g,
          duration: defaultQDuration
        }));
        setQuestions(prev => [...prev, ...mapped]);
        setAiTopic('');
        setAiNotice({ text: `تم توليد ${generated.length} أسئلة بنجاح وإضافتها للقائمة.`, isError: false });
      } else {
        setAiNotice({ text: 'لم يتم استرجاع أسئلة، يرجى تجربة صياغة عنوان آخر.', isError: true });
      }
    } catch {
      setAiNotice({ text: 'حدث خطأ أثناء الاتصال بمحرك التوليد.', isError: true });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const validateStep1 = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('يرجى كتابة عنوان المسابقة.');

    if (isAdmin && compSource === 'teacher') {
      if (!customSupervisor.trim()) errs.push('يرجى كتابة اسم المعلم المشرف أو الجهة التعليمية.');
    }

    if (competitionType !== 'open') {
      if (!startTime) errs.push('حدد موعد بدء المسابقة.');
      if (!endTime) errs.push('حدد موعد نهاية المسابقة.');
      if (startTime && endTime && new Date(endTime).getTime() <= new Date(startTime).getTime()) {
        errs.push('تاريخ ووقت النهاية يجب أن يكون بعد تاريخ البداية.');
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: string[] = [];
    if (questions.length === 0) {
      errs.push('يجب إضافة سؤال واحد على الأقل للمسابقة.');
    }

    questions.forEach((q, idx) => {
      if (!q.text.trim()) {
        errs.push(`السؤال رقم (${idx + 1}) لا يحتوي على نص.`);
      }
      const emptyOpts = q.options.filter(o => !o.trim());
      if (emptyOpts.length > 0) {
        errs.push(`السؤال رقم (${idx + 1}) يحتوي خيارات فارغة.`);
      }
    });

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmitFinal = () => {
    if (!validateStep1() || !validateStep2()) return;

    const compId = editingCompetition ? editingCompetition.id : `comp_${Date.now()}`;
    const slug = (editingCompetition && editingCompetition.webSlug)
      ? editingCompetition.webSlug
      : `${name.trim().replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;

    const isOpenTraining = competitionType === 'open';

    const finalStart = isOpenTraining ? '' : toISOTimestamp(startTime || new Date().toISOString());
    const finalEnd = isOpenTraining ? '' : toISOTimestamp(endTime || new Date(Date.now() + 86400000).toISOString());
    const effectiveQuestionDuration = questions[0]?.duration || questionDuration || 30;
    const totalCalculatedMinutes = Math.max(2, Math.ceil(((questions.length || 5) * effectiveQuestionDuration) / 60));

    const finalSupervisor = (isAdmin && compSource === 'platform')
      ? 'الإدارة العامة للمنصة'
      : (customSupervisor.trim() || currentTeacher?.teacherDisplayName || currentTeacher?.school || (isAdmin ? 'إدارة المنصة' : 'المعلم المشرف'));

    const finalSchoolName = (isAdmin && compSource === 'platform')
      ? 'منصة تَنافُسْ التعليمية'
      : finalSupervisor;

    const newComp: Competition = {
      id: compId,
      webSlug: slug,
      name: name.trim(),
      description: description.trim(),
      source: isAdmin ? compSource : 'teacher',
      teacherCodeId: currentTeacher?.code,
      teacherDisplayName: finalSupervisor,
      schoolName: finalSchoolName,
      questionType: 'manual',
      participationType,
      competitionType,
      visibility,
      examDurationMinutes: totalCalculatedMinutes,
      startTime: finalStart,
      endTime: finalEnd,
      singleAttempt: isOpenTraining ? false : singleAttempt,
      hideAnswersUntilEnd: isOpenTraining ? false : hideAnswersUntilEnd,
      questionDuration: effectiveQuestionDuration,
      winnersCount: isOpenTraining ? 0 : 3,
      rewardType: rewardType.trim() || (isOpenTraining ? 'شهادة إتمام وتفوق فورية' : 'وسام التميز والتفوق'),
      url: `${window.location.origin}/?quiz=${encodeURIComponent(slug)}`,
      baseUrl: window.location.origin,
      autoBroadcastTelegram: isAdmin ? autoBroadcastTelegram : false,
      autoNotifyStartTelegram: (isAdmin && !isOpenTraining) ? autoNotifyStartTelegram : false,
      autoBroadcastResultsTelegram: (isAdmin && !isOpenTraining) ? autoBroadcastResultsTelegram : false,
      targetTelegramGroups: (isAdmin && !sendToAllTelegramGroups && targetTelegramGroups.length > 0)
        ? targetTelegramGroups
        : undefined,
      antiCheatEnabled: isOpenTraining ? false : true,
      certificateEnabled: true,
      status: 'active',
      questions,
      createdAt: editingCompetition ? editingCompetition.createdAt : new Date().toISOString()
    };

    onSave(newComp);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-[2.5rem] max-w-4xl w-full p-6 sm:p-9 shadow-2xl relative my-auto animate-in fade-in zoom-in-95">
        
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#06B6D4] flex items-center justify-center font-bold">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {editingCompetition ? 'تعديل بيانات المسابقة' : 'إنشاء مسابقة جديدة'}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                خطوات واضحة لتنظيم مسابقة مدرسية احترافية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-[#64748B] hover:text-[#0EA5E9] dark:hover:text-white rounded-2xl hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-around mb-8 border-b border-slate-200 dark:border-slate-700 pb-4 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              step === 1 ? 'bg-[#0EA5E9] text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B]'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#06B6D4] text-white flex items-center justify-center text-xs font-black">1</span>
            <span>الأنماط والتوقيت</span>
          </button>

          <button
            onClick={() => { if (validateStep1()) setStep(2); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              step === 2 ? 'bg-[#0EA5E9] text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B]'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#06B6D4] text-white flex items-center justify-center text-xs font-black">2</span>
            <span>الأسئلة ({questions.length})</span>
          </button>

          <button
            onClick={() => { if (validateStep1() && validateStep2()) setStep(3); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              step === 3 ? 'bg-[#0EA5E9] text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B]'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#06B6D4] text-white flex items-center justify-center text-xs font-black">3</span>
            <span>المراجعة والنشر</span>
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>يرجى استكمال البيانات التالية:</span>
            </div>
            {errors.map((e, idx) => (
              <div key={idx}>• {e}</div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  عنوان المسابقة *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أولمبياد الرياضيات والعلوم 2026"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  وصف المسابقة
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً موجزاً للمسابقة..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-cyan-500"
                />
              </div>

              {/* Visibility: Public vs Private */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    خصوصية ونطاق ظهور المسابقة *
                  </label>
                  <span className="text-[11px] font-bold text-[#06B6D4] dark:text-[#22D3EE]">
                    {visibility === 'public' ? 'عامة: تظهر بالصفحة وبوت تليجرام' : 'خاصة: برابط مباشر فقط'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>مسابقة عامة (متاحة للجميع)</span>
                      </div>
                      {visibility === 'public' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      تظهر في قائمة المسابقات على الصفحة الرئيسية ويمكن للطلاب استعراضها عبر بوت تليجرام.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>مسابقة خاصة (برابط فقط)</span>
                      </div>
                      {visibility === 'private' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      لا تظهر في الصفحة الرئيسية ولا في البوت، ويمكن الوصول إليها والمشاركة فيها فقط برابط مباشر.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  نوع المسابقة ونمط التوقيت
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('live')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      competitionType === 'live'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-rose-600" />
                      <span>1. مسابقة مباشرة</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">تزامن حي في وقت محدد</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('windowed')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      competitionType === 'windowed'
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-400 text-teal-900 dark:text-teal-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-600" />
                      <span>2. فترة محددة</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">متاحة خلال نطاق زمني</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('open')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      competitionType === 'open'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>3. تدريب مفتوح</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">متاحة دائماً للتدريب</p>
                  </button>
                </div>
              </div>

              {competitionType !== 'open' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      موعد الانطلاق والبدء *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (competitionType === 'live') {
                          const start = new Date(e.target.value).getTime();
                          const totalDurMs = Math.max(2 * 60000, ((questions.length || 5) * (questionDuration || 30)) * 1000);
                          const end = new Date(start + totalDurMs);
                          setEndTime(formatLocalISO(end));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      موعد النهاية وإغلاق التسليم *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Admin: Competition Authority / Source */}
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    🛡️ جهة اعتماد المسابقة ومصدرها
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCompSource('platform')}
                      className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                        compSource === 'platform'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">🛡️ مسابقة رسمية باسم إدارة المنصة</div>
                      <div className="text-[11px] opacity-80 mt-0.5">تظهر عامة برعاية المنصة والشهادات تصدر رسمياً للطلاب</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompSource('teacher')}
                      className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                        compSource === 'teacher'
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">🏫 مسابقة مخصصة (مدرسة / معلم)</div>
                      <div className="text-[11px] opacity-80 mt-0.5">مسابقة مخصصة لمدرسة أو معلم ومجموعة محددة</div>
                    </button>
                  </div>

                  {/* Single input field for Teacher / School if custom competition */}
                  {compSource === 'teacher' && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 animate-in fade-in">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        اسم المعلم المشرف أو الجهة التعليمية *
                      </label>
                      <input
                        type="text"
                        required
                        value={customSupervisor}
                        onChange={(e) => setCustomSupervisor(e.target.value)}
                        placeholder="مثال: أ. فهد السبيعي / ثانوية الملك فهد"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-sky-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Participation Type */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  نمط المشاركة
                </label>
                <select
                  value={participationType}
                  onChange={(e) => setParticipationType(e.target.value as ParticipationType)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="individual">مشاركة فردية (كل طالب بشكل مستقل)</option>
                  <option value="team">مشاركة فرق جماعية (احتساب مجموع درجات الفريق)</option>
                </select>
              </div>

              {/* Question Duration Setting */}
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-sky-950 dark:text-sky-200">
                    ⏱️ وقت الإجابة لكل سؤال (مؤقت السؤال المعتمد)
                  </label>
                  <span className="text-[11px] text-sky-700 dark:text-sky-400 font-bold">
                    الحالي: {questionDuration >= 60 ? `${Math.floor(questionDuration / 60)} دقيقة ${questionDuration % 60 ? `و ${questionDuration % 60} ث` : ''}` : `${questionDuration} ثانية`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '20 ثانية', val: 20 },
                    { label: '30 ثانية', val: 30 },
                    { label: '45 ثانية', val: 45 },
                    { label: '60 ثانية (دقيقة)', val: 60 },
                    { label: '90 ثانية', val: 90 },
                    { label: '120 ثانية (دقيقتان)', val: 120 }
                  ].map((preset) => {
                    const isSelected = questionDuration === preset.val;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setQuestionDuration(preset.val);
                          setQuestions(prev => prev.map(q => ({ ...q, duration: preset.val })));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">تحديد وقت مخصص بالثواني:</span>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={questionDuration}
                    onChange={(e) => {
                      const val = Math.max(10, Number(e.target.value));
                      setQuestionDuration(val);
                      setQuestions(prev => prev.map(q => ({ ...q, duration: val })));
                    }}
                    className="w-24 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-500">ثانية</span>
                </div>
              </div>

              {/* Reward selection and custom input */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-amber-950 dark:text-amber-200">
                    🏆 تحديد الجائزة أو المكافأة التقديرية *
                  </label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                    تظهر في إعلان المسابقة والشهادات
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'وسام التميز والتفوق',
                    'شهادة شكر وتقدير رقمية',
                    'درع المركز الأول',
                    'ميدالية التفوق الذهبية',
                    'شهادة تفوق وتميز'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRewardType(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        rewardType === preset
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  placeholder="أو اكتب مكافأة مخصصة (مثال: وسام التميز والتفوق)..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-amber-500"
                />
              </div>

              {/* Telegram Auto Broadcast Settings - Exclusively available for Admin competitions */}
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-sky-200/70 dark:border-sky-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-sky-900 dark:text-sky-300">
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>
                      {competitionType === 'open' 
                        ? 'إعدادات نشر التدريب المفتوح عبر بوت تليجرام' 
                        : 'إعدادات النشر التلقائي عبر بوت تليجرام'}
                    </span>
                  </div>

                  {competitionType === 'open' ? (
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-sky-300 transition-colors">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-1">
                          <div>📢 نشر رابط التدريب المفتوح في تليجرام</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            بث بطاقة التدريب التفاعلي ورابط المشاركة في جروبات تليجرام للطلاب للممارسة الذاتية في أي وقت
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoBroadcastTelegram}
                          onChange={(e) => setAutoBroadcastTelegram(e.target.checked)}
                          className="w-4 h-4 accent-[#0EA5E9] cursor-pointer shrink-0 mr-3"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 p-2 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-medium">
                        * ملاحظة: التدريب المفتوح مخصص للتعلم الذاتي المستمر، لذا لا يتضمن تنبيه انطلاق أو إعلان أوائل وفائزين.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-sky-300 transition-colors">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-1">
                          <div>📢 نشر إعلان المسابقة تلقائياً في تليجرام عند الإنشاء</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            بث بطاقة التحدي ورابط المشاركة فوراً في الجروبات المستهدفة
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoBroadcastTelegram}
                          onChange={(e) => setAutoBroadcastTelegram(e.target.checked)}
                          className="w-4 h-4 accent-[#0EA5E9] cursor-pointer shrink-0 mr-3"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-sky-300 transition-colors">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-1">
                          <div>🔔 إرسال رسالة تنبيه عند بدء وانطلاق المسابقة</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            بث إشعار انطلاق التحدي في جروبات تليجرام فور حلول وقت بدء المسابقة
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoNotifyStartTelegram}
                          onChange={(e) => setAutoNotifyStartTelegram(e.target.checked)}
                          className="w-4 h-4 accent-[#0EA5E9] cursor-pointer shrink-0 mr-3"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-sky-300 transition-colors">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-1">
                          <div>🏆 نشر الفائزين ولوحة الشرف تلقائياً في تليجرام بعد انتهاء المسابقة</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            إرسال رسالة التهنئة الرسمية ولوحة الشرف فور انتهاء وقت المسابقة
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoBroadcastResultsTelegram}
                          onChange={(e) => setAutoBroadcastResultsTelegram(e.target.checked)}
                          className="w-4 h-4 accent-[#0EA5E9] cursor-pointer shrink-0 mr-3"
                        />
                      </label>
                    </div>
                  )}

                  {/* Target Groups Selector (when broadcast is enabled) */}
                  {(autoBroadcastTelegram || autoNotifyStartTelegram || autoBroadcastResultsTelegram) && (
                    <div className="pt-3 border-t border-sky-200/80 dark:border-sky-800/60 mt-2">
                      <TelegramGroupSelector
                        groups={availableTelegramGroups}
                        selectedGroupIds={targetTelegramGroups}
                        onChange={setTargetTelegramGroups}
                        sendToAll={sendToAllTelegramGroups}
                        onSendToAllChange={setSendToAllTelegramGroups}
                        title="تحديد الجروبات المستهدفة للبث"
                        subtitle="اختر الجروبات والقنوات المدرسية التي تريد إرسال هذه المسابقة وتنبيهاتها إليها"
                        compact={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="px-6 py-3 bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] dark:text-[#0B1120] text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>الانتقال لإضافة الأسئلة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent p-5 rounded-2xl border border-cyan-300/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-900 dark:text-cyan-300">
                <Wand2 className="w-4 h-4 text-cyan-600" />
                <span>التوليد الآلي للأسئلة</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="موضوع الأسئلة (مثال: قوانين نيوتن والفيزياء)..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateAiQuestions}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAi ? 'جارٍ التوليد...' : 'توليد الأسئلة آلياً'}</span>
                </button>
              </div>

              {aiNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold border ${
                  aiNotice.isError 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {aiNotice.text}
                </div>
              )}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 dark:text-white">
                  قائمة الأسئلة الحالية ({questions.length} أسئلة)
                </h3>
                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة سؤال يدوي</span>
                </button>
              </div>

              {questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">سؤال {qIdx + 1}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                        <Timer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>الوقت:</span>
                        <input
                          type="number"
                          min={10}
                          max={600}
                          value={q.duration || questionDuration || 30}
                          onChange={(e) => handleQuestionChange(qIdx, 'duration', Math.max(10, Number(e.target.value)))}
                          className="w-12 text-center bg-transparent border-b border-sky-400 font-mono text-xs font-bold text-sky-700 dark:text-sky-300 focus:outline-none"
                        />
                        <span>ث</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                    placeholder="اكتب نص السؤال هنا..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => handleQuestionChange(qIdx, 'correctIndex', optIdx)}
                          className="w-4 h-4 text-cyan-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                          placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][optIdx]}`}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                    placeholder="الشرح التعليمي القصير (اختياري)..."
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-700 dark:text-slate-300"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                العودة للخطوة الأولى
              </button>

              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
                className="px-6 py-3 bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] dark:text-[#0B1120] text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>الانتقال للمراجعة والنشر</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">ملخص بيانات المسابقة</span>
                <span className="text-xs font-mono font-bold text-slate-500">{questions.length} سؤال</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white">{name}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">{description || 'لا يوجد وصف'}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">نوع المسابقة</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {competitionType === 'live' ? 'مباشرة' : competitionType === 'windowed' ? 'فترة محددة' : 'تدريب مفتوح'}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">نمط المشاركة</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {participationType === 'team' ? 'فرق جماعية' : 'فردية'}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">وقت كل سؤال</div>
                  <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                    {questionDuration} ثانية
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">المشرف / الجهة</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate" title={compSource === 'platform' ? 'الإدارة العامة للمنصة' : (customSupervisor || 'المعلم المشرف')}>
                    {compSource === 'platform' ? 'إدارة المنصة' : (customSupervisor || 'المعلم المشرف')}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500">الجائزة / المكافأة</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate" title={rewardType}>
                    {rewardType || 'وسام التميز'}
                  </div>
                </div>

                {competitionType === 'open' ? (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 sm:col-span-3">
                    <div className="text-[10px] text-slate-500">نشر رابط التدريب المفتوح بتليجرام</div>
                    <div className={`font-bold mt-0.5 ${autoBroadcastTelegram ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>
                      {autoBroadcastTelegram ? 'مفعل للبث في جروبات تليجرام المحددة' : 'معطل'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500">نشر الإعلان بتليجرام</div>
                      <div className={`font-bold mt-0.5 ${autoBroadcastTelegram ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>
                        {autoBroadcastTelegram ? 'مفعل تلقائياً' : 'معطل'}
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500">تنبيه بدء المسابقة</div>
                      <div className={`font-bold mt-0.5 ${autoNotifyStartTelegram ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        {autoNotifyStartTelegram ? 'مفعل عند الانطلاق' : 'معطل'}
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500">نشر الفائزين بتليجرام</div>
                      <div className={`font-bold mt-0.5 ${autoBroadcastResultsTelegram ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {autoBroadcastResultsTelegram ? 'مفعل بعد الختام' : 'معطل'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                تعديل الأسئلة
              </button>

              <button
                type="button"
                onClick={handleSubmitFinal}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ ونشر المسابقة الآن</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
