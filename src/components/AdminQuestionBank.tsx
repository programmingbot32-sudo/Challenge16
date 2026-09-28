import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Brain,
  Check,
  RefreshCw,
  Search,
  Atom,
  Calculator,
  Globe2,
  BookOpen,
  Cpu,
  Landmark,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Filter,
  HelpCircle,
  Zap,
  Target
} from 'lucide-react';
import { QuestionBankDomain, BankQuestion } from '../types';
import { StorageService } from '../services/storageService';
import { ConfirmModal } from './ConfirmModal';

const AVAILABLE_ICONS = [
  { id: 'Atom', label: 'العلوم والطبيعة', icon: Atom },
  { id: 'Calculator', label: 'الرياضيات والمنطق', icon: Calculator },
  { id: 'Globe2', label: 'الجغرافيا وعالمنا', icon: Globe2 },
  { id: 'BookOpen', label: 'اللغة العربية والبيان', icon: BookOpen },
  { id: 'Cpu', label: 'التقنية والذكاء الاصطناعي', icon: Cpu },
  { id: 'Landmark', label: 'التاريخ والحضارات', icon: Landmark }
];

export const AdminQuestionBank: React.FC = () => {
  const [domains, setDomains] = useState<QuestionBankDomain[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals state
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<QuestionBankDomain | null>(null);
  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);

  // New Domain Form
  const [domainName, setDomainName] = useState('');
  const [domainDescription, setDomainDescription] = useState('');
  const [domainIcon, setDomainIcon] = useState('Atom');
  const [domainDefaultCount, setDomainDefaultCount] = useState(5);
  const [domainDefaultTime, setDomainDefaultTime] = useState(30);

  // Manual Question Form
  const [qDomainId, setQDomainId] = useState('');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qDuration, setQDuration] = useState(30);
  const [qExplanation, setQExplanation] = useState('');
  const [qDifficulty, setQDifficulty] = useState<'سهل' | 'متوسط' | 'متقدم'>('متوسط');

  // Automatic Question Generator Form
  const [aiDomainId, setAiDomainId] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'سهل' | 'متوسط' | 'متقدم'>('متوسط');
  const [aiCount, setAiCount] = useState(5);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadData = () => {
    const dList = StorageService.getBankDomains();
    const qList = StorageService.getBankQuestions();
    setDomains(dList);
    setQuestions(qList);
    if (!qDomainId && dList.length > 0) setQDomainId(dList[0].id);
    if (!aiDomainId && dList.length > 0) setAiDomainId(dList[0].id);
  };

  useEffect(() => {
    loadData();
    StorageService.fetchBankFromDatabase().then(changed => {
      if (changed) loadData();
    });
  }, []);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchDomain = selectedDomainFilter === 'all' || q.domainId === selectedDomainFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery = !query || 
        q.text.toLowerCase().includes(query) ||
        (q.explanation && q.explanation.toLowerCase().includes(query)) ||
        q.options.some(opt => opt.toLowerCase().includes(query));
      return matchDomain && matchQuery;
    });
  }, [questions, selectedDomainFilter, searchQuery]);

  // Open Edit Domain
  const handleOpenEditDomain = (domain: QuestionBankDomain) => {
    setEditingDomain(domain);
    setDomainName(domain.name);
    setDomainDescription(domain.description);
    setDomainIcon(domain.icon || 'Atom');
    setDomainDefaultCount(domain.defaultQuestionCount || 5);
    setDomainDefaultTime(domain.defaultTimePerQuestion || 30);
    setIsAddDomainModalOpen(true);
  };

  // Save / Update Domain
  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;

    const domainPayload: QuestionBankDomain = {
      id: editingDomain ? editingDomain.id : `domain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: domainName.trim(),
      description: domainDescription.trim(),
      icon: domainIcon,
      defaultQuestionCount: Number(domainDefaultCount) || 5,
      defaultTimePerQuestion: Number(domainDefaultTime) || 30,
      createdAt: editingDomain ? editingDomain.createdAt : new Date().toISOString()
    };

    StorageService.saveBankDomain(domainPayload);
    loadData();
    setIsAddDomainModalOpen(false);
    setEditingDomain(null);
    setDomainName('');
    setDomainDescription('');
    showNotification(editingDomain ? 'تم تحديث بيانات المجال بنجاح' : 'تمت إضافة المجال الجديد بنجاح');
  };

  // Delete Domain
  const handleDeleteDomain = (domain: QuestionBankDomain) => {
    const qCount = questions.filter(q => q.domainId === domain.id).length;
    setConfirmModal({
      isOpen: true,
      title: `حذف مجال: ${domain.name}`,
      message: `هل أنت متأكد من حذف هذا المجال؟ سيتم أيضاً حذف جميع الأسئلة المرتبطة به (${qCount} سؤال).`,
      confirmLabel: 'نعم، احذف المجال والأسئلة',
      variant: 'danger',
      onConfirm: () => {
        StorageService.deleteBankDomain(domain.id);
        loadData();
        showNotification(`تم حذف مجال "${domain.name}" بنجاح`);
      }
    });
  };

  // Empty Domain (delete questions only)
  const handleEmptyDomain = (domain: QuestionBankDomain) => {
    const qCount = questions.filter(q => q.domainId === domain.id).length;
    if (qCount === 0) {
      showNotification('المجال فارغ بالفعل.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `تفريغ أسئلة مجال: ${domain.name}`,
      message: `هل أنت متأكد من تفريغ وحذف جميع الأسئلة في هذا المجال (${qCount} سؤال) مع الإبقاء على اسم المجال؟`,
      confirmLabel: 'تفريغ كافة الأسئلة',
      variant: 'warning',
      onConfirm: () => {
        StorageService.emptyBankDomain(domain.id);
        loadData();
        showNotification(`تم تفريغ أسئلة مجال "${domain.name}" بنجاح`);
      }
    });
  };

  // Delete single question
  const handleDeleteQuestion = (q: BankQuestion) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف سؤال من البنك',
      message: `هل تريد بالتأكيد حذف السؤال: "${q.text.slice(0, 70)}..."؟`,
      confirmLabel: 'حذف السؤال',
      variant: 'danger',
      onConfirm: () => {
        StorageService.deleteBankQuestion(q.id);
        loadData();
        showNotification('تم حذف السؤال من بنك الأسئلة.');
      }
    });
  };

  // Save manual question
  const handleSaveManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || qOptions.some(o => !o.trim())) {
      alert('يرجى ملء نص السؤال وكافة الخيارات الأربعة.');
      return;
    }

    const domainObj = domains.find(d => d.id === qDomainId);

    const newQ: BankQuestion = {
      id: `bq_man_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      domainId: qDomainId || (domains[0]?.id || 'domain-general'),
      domainName: domainObj?.name || 'عام',
      text: qText.trim(),
      options: qOptions.map(o => o.trim()),
      correctIndex: qCorrectIndex,
      duration: Number(qDuration) || 30,
      explanation: qExplanation.trim() || 'إجابة صحيحة وفق معايير بنك الأسئلة',
      difficulty: qDifficulty,
      createdAt: new Date().toISOString()
    };

    StorageService.saveBankQuestion(newQ);
    loadData();
    setIsAddManualModalOpen(false);
    setQText('');
    setQOptions(['', '', '', '']);
    setQExplanation('');
    showNotification('تمت إضافة السؤال الجديد إلى بنك الأسئلة بنجاح.');
  };

  // Generate Questions automatically into domain
  const handleGenerateAIQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    const domainObj = domains.find(d => d.id === aiDomainId);
    if (!domainObj) {
      setAiGenError('يرجى تحديد المجال المستهدف.');
      return;
    }

    setIsGeneratingAI(true);
    setAiGenError(null);

    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim() || domainObj.name,
          category: domainObj.name,
          difficulty: aiDifficulty,
          count: aiCount,
          audience: 'students'
        })
      });

      if (!response.ok) {
        throw new Error('فشل توليد الأسئلة من الخادم. يرجى المحاولة لاحقاً.');
      }

      const generatedList = await response.json();
      if (!Array.isArray(generatedList) || generatedList.length === 0) {
        throw new Error('لم يتم استرجاع أي أسئلة مولدة.');
      }

      const mappedBankQuestions: BankQuestion[] = generatedList.map((item, idx) => ({
        id: `bq_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        domainId: domainObj.id,
        domainName: domainObj.name,
        text: item.text,
        options: item.options || [],
        correctIndex: item.correct_index ?? 0,
        duration: item.duration || domainObj.defaultTimePerQuestion || 30,
        explanation: item.explanation || '',
        difficulty: aiDifficulty,
        createdAt: new Date().toISOString()
      }));

      StorageService.saveBatchBankQuestions(mappedBankQuestions);
      loadData();
      setIsAIGenModalOpen(false);
      setAiTopic('');
      showNotification(`تم بنجاح توليد وحفظ ${mappedBankQuestions.length} أسئلة جديدة في مجال "${domainObj.name}"!`);
    } catch (err: any) {
      setAiGenError(err.message || 'حدث خطأ أثناء الاتصال بمحرك التوليد الآلي.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in" dir="rtl">
      
      {actionNotice && (
        <div className="fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl bg-[#102B4C] text-white shadow-2xl border border-slate-700 flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          <span>{actionNotice}</span>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="bg-white dark:bg-[#142238] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
              إدارة بنك الأسئلة والمجالات المعرفية
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] mt-1.5 font-medium">
            أنشئ مجالات معرفية، وأضف بنوك أسئلة يدوياً أو بالتوليد الآلي، مع إمكانية تنظيم وتحديث وتفريغ الأسئلة في أي وقت.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setEditingDomain(null);
              setDomainName('');
              setDomainDescription('');
              setDomainIcon('Atom');
              setDomainDefaultCount(5);
              setDomainDefaultTime(30);
              setIsAddDomainModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#102B4C] hover:bg-[#1A3B63] text-white rounded-2xl text-xs sm:text-sm font-black cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مجال</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAiGenError(null);
              setIsAIGenModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#009BB0] hover:bg-[#008496] text-white rounded-2xl text-xs sm:text-sm font-black cursor-pointer shadow-md shadow-[#009BB0]/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>توليد آلي للأسئلة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQText('');
              setQOptions(['', '', '', '']);
              setQExplanation('');
              setIsAddManualModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs sm:text-sm font-black cursor-pointer transition-colors"
          >
            <Edit3 className="w-4 h-4 text-[#009BB0]" />
            <span>إضافة سؤال يدوي</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">المجالات الأساسية</div>
          <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1.5">
            {domains.length} مجالات
          </div>
          <div className="text-[11px] text-[#009BB0] dark:text-[#22D3EE] font-bold mt-1">
            متاحة لتقييم الطلاب
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">إجمالي أسئلة البنك</div>
          <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1.5">
            {questions.length} سؤال
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            جاهزة للسحب العشوائي
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">متوسط الأسئلة بالمجال</div>
          <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1.5">
            {domains.length > 0 ? (questions.length / domains.length).toFixed(1) : 0}
          </div>
          <div className="text-[11px] text-[#5A6E85] dark:text-[#94A3B8] font-bold mt-1">
            سؤال لكل مجال
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">المسابقة المربوطة</div>
          <div className="text-sm sm:text-base font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2 truncate">
            بنك الأسئلة والتقييم
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
            مثبتة أول المسابقات
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#009BB0]" />
            <span>قائمة المجالات المعرفية الحالية ({domains.length}):</span>
          </h3>
          <span className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">
            يمكنك تخصيص الوقت والأسئلة وتفريغ أو حذف أي مجال
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((domain) => {
            const domainQCount = questions.filter(q => q.domainId === domain.id).length;
            const iconObj = AVAILABLE_ICONS.find(i => i.id === domain.icon) || AVAILABLE_ICONS[0];
            const IconComp = iconObj.icon;

            return (
              <div
                key={domain.id}
                className="bg-white dark:bg-[#142238] rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#009BB0]/60 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center">
                      <IconComp className="w-6 h-6" />
                    </div>

                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-black text-[#102B4C] dark:text-[#F1F5F9]">
                      {domainQCount} أسئلة
                    </span>
                  </div>

                  <h4 className="text-lg font-black text-[#102B4C] dark:text-[#F1F5F9] mt-3">
                    {domain.name}
                  </h4>
                  <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 leading-relaxed line-clamp-2">
                    {domain.description || 'لا يوجد وصف مضاف لهذا المجال.'}
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">
                    <span>الوقت المقترح: {domain.defaultTimePerQuestion}ث</span>
                    <span>سحب افتراضي: {domain.defaultQuestionCount} أسئلة</span>
                  </div>
                </div>

                {/* Domain Actions */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAiDomainId(domain.id);
                      setAiTopic(domain.name);
                      setAiGenError(null);
                      setIsAIGenModalOpen(true);
                    }}
                    title="توليد أسئلة آلياً لهذا المجال"
                    className="py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-[#009BB0] dark:text-[#22D3EE] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توليد آلي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditDomain(domain)}
                    title="تعديل المجال"
                    className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#102B4C] dark:text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEmptyDomain(domain)}
                    title="تفريغ كافة أسئلة هذا المجال"
                    className="py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تفريغ</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteDomain(domain)}
                    className="w-full py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المجال نهائياً</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-[#142238] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#009BB0]" />
              <span>مستعرض بنك الأسئلة ({filteredQuestions.length} سؤال معروض)</span>
            </h3>
            <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-medium">
              تصفح الأسئلة المخزنة في البنك أو ابحث واحذف أي سؤال بسهولة.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6E85]" />
              <input
                type="text"
                placeholder="بحث في نص السؤال أو الخيارات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] focus:outline-none focus:border-[#009BB0]"
              />
            </div>

            {/* Domain Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5A6E85]" />
              <select
                value={selectedDomainFilter}
                onChange={(e) => setSelectedDomainFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] focus:outline-none focus:border-[#009BB0]"
              >
                <option value="all">جميع المجالات ({questions.length})</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({questions.filter(q => q.domainId === d.id).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Questions Cards List */}
        {filteredQuestions.length > 0 ? (
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const domain = domains.find(d => d.id === q.domainId);

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#0B1321]/50 space-y-3 hover:border-[#009BB0]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-[#009BB0] dark:text-[#22D3EE] text-[11px] font-black">
                          {domain ? domain.name : 'عام'}
                        </span>
                        {q.difficulty && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[#5A6E85] dark:text-[#94A3B8] text-[11px] font-bold">
                            {q.difficulty}
                          </span>
                        )}
                        <span className="text-[11px] text-[#5A6E85] dark:text-[#94A3B8] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{q.duration || 30}ث</span>
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-[#102B4C] dark:text-[#F1F5F9] leading-relaxed">
                        {idx + 1}. {q.text}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="حذف هذا السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-bold pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correctIndex;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-black'
                              : 'bg-white dark:bg-[#142238] border-slate-200 dark:border-slate-700 text-[#5A6E85] dark:text-[#94A3B8]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                              isCorrect ? 'bg-emerald-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              {optIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-medium bg-white dark:bg-[#142238] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                      <span className="font-bold text-[#009BB0]">💡 الشرح: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-base font-bold text-[#102B4C] dark:text-[#F1F5F9]">
              لا توجد أسئلة مطابقة للبحث أو المجال المختار
            </div>
            <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8]">
              يمكنك توليد أسئلة جديدة آلياً بنقرة واحدة أو إضافة أسئلة يدوياً.
            </p>
          </div>
        )}
      </div>

      {isAddDomainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#142238] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-2xl text-right space-y-6">
            <h3 className="text-xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
              {editingDomain ? 'تعديل بيانات المجال' : 'إضافة مجال معرفي جديد'}
            </h3>

            <form onSubmit={handleSaveDomain} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  اسم المجال *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الجغرافيا وعالمنا"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] focus:outline-none focus:border-[#009BB0]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  وصف مختصر للمجال
                </label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لموضوعات هذا المجال..."
                  value={domainDescription}
                  onChange={(e) => setDomainDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] focus:outline-none focus:border-[#009BB0]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  الأيقونة الرمزية:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDomainIcon(item.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          domainIcon === item.id
                            ? 'bg-[#009BB0] text-white border-[#009BB0]'
                            : 'bg-slate-50 dark:bg-[#0B1321] border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    عدد الأسئلة الافتراضي:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={domainDefaultCount}
                    onChange={(e) => setDomainDefaultCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    وقت السؤال (بالثواني):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={domainDefaultTime}
                    onChange={(e) => setDomainDefaultTime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm rounded-xl cursor-pointer shadow-md"
                >
                  حفظ المجال
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDomainModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-[#5A6E85] font-bold text-sm rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#142238] w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-2xl text-right space-y-5 my-8">
            <h3 className="text-xl font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#009BB0]" />
              <span>إضافة سؤال يدوي لبنك الأسئلة</span>
            </h3>

            <form onSubmit={handleSaveManualQuestion} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  المجال المعرفي *
                </label>
                <select
                  value={qDomainId}
                  onChange={(e) => setQDomainId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  نص السؤال *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="اكتب نص السؤال هنا بدقة..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                />
              </div>

              {/* 4 Options with Radio to select correct */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9]">
                  الخيارات الأربعة (حدد الدائرة أمام الإجابة الصحيحة) *:
                </label>
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIndex === idx}
                      onChange={() => setQCorrectIndex(idx)}
                      className="w-5 h-5 text-[#009BB0] accent-[#009BB0] cursor-pointer"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`الخيار ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...qOptions];
                        newOpts[idx] = e.target.value;
                        setQOptions(newOpts);
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] ${
                        qCorrectIndex === idx ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    الوقت بالثواني:
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    value={qDuration}
                    onChange={(e) => setQDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    مستوى الصعوبة:
                  </label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  >
                    <option value="سهل">سهل</option>
                    <option value="متوسط">متوسط</option>
                    <option value="متقدم">متقدم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  الشرح والتوضيح التربوي للإجابة:
                </label>
                <textarea
                  rows={2}
                  placeholder="توضيح موجز يظهر للمشارك بعد الإجابة لشرح سبب صحة الخيار..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm rounded-xl cursor-pointer shadow-md"
                >
                  حفظ في بنك الأسئلة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddManualModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-[#5A6E85] font-bold text-sm rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAIGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#142238] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-2xl text-right space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#009BB0] dark:text-[#22D3EE] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                  التوليد الآلي للأسئلة
                </h3>
                <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8]">
                  توليد دفعة أسئلة تربوية متقنة وإضافتها تلقائياً للمجال المختار
                </p>
              </div>
            </div>

            {aiGenError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm text-rose-800 dark:text-rose-200 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiGenError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateAIQuestions} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  المجال المستهدف *
                </label>
                <select
                  value={aiDomainId}
                  onChange={(e) => setAiDomainId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1.5">
                  الموضوع أو المحور المحدد (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: التضاريس والجبال، أو قوانين الجبر، أو الذكاء الاصطناعي..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    مستوى الصعوبة:
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  >
                    <option value="سهل">سهل</option>
                    <option value="متوسط">متوسط</option>
                    <option value="متقدم">متقدم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#102B4C] dark:text-[#F1F5F9] mb-1">
                    عدد الأسئلة المطلوبة:
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9]"
                  >
                    <option value={5}>5 أسئلة</option>
                    <option value={10}>10 أسئلة</option>
                    <option value={15}>15 سؤالاً</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isGeneratingAI}
                  className={`flex-1 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                    isGeneratingAI ? 'bg-slate-400 cursor-wait' : 'bg-[#009BB0] hover:bg-[#008496]'
                  }`}
                >
                  {isGeneratingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التوليد الآلي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>توليد وإضافة لبنك الأسئلة</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => setIsAIGenModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-[#5A6E85] font-bold text-sm rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
