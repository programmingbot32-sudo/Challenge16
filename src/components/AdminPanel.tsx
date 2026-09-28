import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  CheckCircle2, 
  Users, 
  Trophy, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Copy, 
  Check, 
  Search,
  LogOut,
  Shield,
  Award,
  BarChart3,
  Calendar,
  Clock,
  ExternalLink,
  Download,
  Filter,
  Eye,
  FileText,
  School,
  Lock,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  MessageCircle,
  Database,
  ArrowUpDown,
  Printer,
  Send,
  Globe,
  Bot,
  Power,
  Bell
} from 'lucide-react';
import { AccessCode, Competition, Participant, ParticipantResult, Question } from '../types';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';
import { TelegramService } from '../services/telegramService';
import { CompetitionBuilderModal } from './CompetitionBuilderModal';
import { ParticipantDetailModal } from './ParticipantDetailModal';
import { CertificateModal } from './CertificateModal';
import { AdminLoginModal } from './AdminLoginModal';
import { AdminTelegramSettings } from './AdminTelegramSettings';
import { AdminQuestionBank } from './AdminQuestionBank';
import { ConfirmModal } from './ConfirmModal';
import { TelegramQuickBroadcastModal } from './TelegramQuickBroadcastModal';

interface AdminPanelProps {
  onBackToHome: () => void;
  onLoginAsTeacher?: (code: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToHome, onLoginAsTeacher }) => {
  // Authentication check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return StorageService.isAdminAuthenticated();
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'leaderboard' | 'competitions' | 'question_bank' | 'access_codes' | 'telegram' | 'settings'>('analytics');

  // Core Data
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answersCount, setAnswersCount] = useState(0);

  // Filter & Search states
  const [searchCode, setSearchCode] = useState('');
  const [searchParticipant, setSearchParticipant] = useState('');
  const [selectedCompFilter, setSelectedCompFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'individual' | 'team'>('all');
  const [sortParticipantBy, setSortParticipantBy] = useState<'score' | 'time' | 'date'>('score');
  const [compSourceFilter, setCompSourceFilter] = useState<'all' | 'platform' | 'teacher'>('all');
  const [compVisibilityFilter, setCompVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [compStatusFilter, setCompStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [searchComp, setSearchComp] = useState('');

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);

  const [selectedParticipantForDetail, setSelectedParticipantForDetail] = useState<ParticipantResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [certModalData, setCertModalData] = useState<{
    isOpen: boolean;
    studentName: string;
    teacherName: string;
    schoolName: string;
    competitionTitle: string;
    score?: number;
    rank?: number;
  }>({
    isOpen: false,
    studentName: '',
    teacherName: '',
    schoolName: '',
    competitionTitle: ''
  });

  const [quickBroadcastModal, setQuickBroadcastModal] = useState<{
    isOpen: boolean;
    comp: Competition | null;
    type: 'announcement' | 'start' | 'results';
  }>({
    isOpen: false,
    comp: null,
    type: 'announcement'
  });

  // Access code generator form
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeSchool, setNewCodeSchool] = useState('');
  const [newCodeMaxComp, setNewCodeMaxComp] = useState(5);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Accessible Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Settings tab form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passChangeMsg, setPassChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // MongoDB & Database State
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    engine: string;
    database: string;
    error: string | null;
  } | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  const loadData = () => {
    setAccessCodes(StorageService.getAccessCodes());
    setCompetitions(StorageService.getCompetitions());
    setParticipants(StorageService.getParticipants());
    setAnswersCount(StorageService.getAnswers().length);
    setIsAuthenticated(StorageService.isAdminAuthenticated());
    StorageService.getDatabaseStatus().then(status => setDbStatus(status)).catch(() => {});
  };

  const handleSyncWithDb = async () => {
    setIsSyncingDb(true);
    try {
      await StorageService.fetchFromDatabase();
      loadData();
      const status = await StorageService.getDatabaseStatus();
      setDbStatus(status);
      showNotification('تمت مزامنة البيانات مع خادم وقاعدة بيانات MongoDB بنجاح!');
    } catch {
      showNotification('تعذر الاتصال بخادم قاعدة البيانات');
    } finally {
      setIsSyncingDb(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage_update', loadData);
    return () => window.removeEventListener('storage_update', loadData);
  }, []);

  const showNotification = (text: string) => {
    setActionNotice(text);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleAdminLogout = () => {
    StorageService.setAdminSession(false);
    setIsAuthenticated(false);
    onBackToHome();
  };

  const handleGenerateCode = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate simple teacher code: T + 5 random digits (e.g. T68999, T57899)
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const generatedCode = `T${randomDigits}`;

    const newObj: AccessCode = {
      id: `code-${Date.now()}`,
      code: generatedCode,
      teacherDisplayName: newCodeName.trim(),
      school: newCodeSchool.trim() || 'المملكة العربية السعودية',
      maxCompetitions: Number(newCodeMaxComp) || 5,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString()
    };

    StorageService.saveAccessCode(newObj);
    setNewCodeName('');
    setNewCodeSchool('');
    loadData();
    showNotification(`تم توليد الرمز ${generatedCode} بنجاح`);
  };

  const handleToggleCode = (id: string) => {
    StorageService.toggleCodeStatus(id);
    loadData();
    showNotification('تم تحديث حالة الرمز');
  };

  const handleDeleteCode = (id: string, code: string) => {
    if (id === 'code-trial-library' || code === 'مكتبة المعلمين') {
      showNotification('لا يمكن حذف كود التجربة (مكتبة المعلمين). يمكنك تعطيله أو تفعيله.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'حذف رمز اعتماد المعلم',
      message: `هل أنت متأكد من حذف الرمز ${code}؟ لن يتمكن المعلم من استخدامه بعد الآن.`,
      confirmLabel: 'حذف الرمز',
      variant: 'danger',
      onConfirm: () => {
        StorageService.deleteAccessCode(id);
        loadData();
        showNotification(`تم حذف الرمز ${code}`);
      }
    });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showNotification('تم نسخ الرمز إلى الحافظة');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyTeacherInvite = (code: AccessCode) => {
    const inviteMessage = `مرحباً أستاذ(ة) ${code.teacherDisplayName || 'الكريم(ة)'}،\nيسرنا تزويدكم برمز اعتمادكم في منصة تَنافُسْ للمسابقات التعليمية:\n🔑 الرمز: ${code.code}\n🏫 المدرسة: ${code.school}\n📊 حد المسابقات: ${code.maxCompetitions} مسابقة\nرابط الدخول: ${window.location.origin}`;
    navigator.clipboard.writeText(inviteMessage);
    showNotification('تم نسخ رسالة الدعوة الخاصة بالمعلم');
  };

  const handleDeleteComp = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف المسابقة نهائياً',
      message: `هل أنت متأكد من حذف مسابقة "${name}"؟ سيتم حذف جميع أسئلتها وإجاباتها نهائياً.`,
      confirmLabel: 'حذف المسابقة',
      variant: 'danger',
      onConfirm: () => {
        StorageService.deleteCompetition(id);
        loadData();
        showNotification(`تم حذف مسابقة "${name}"`);
      }
    });
  };

  const handleDeleteParticipant = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف مشاركة الطالب',
      message: `هل تريد حذف مشاركة الطالب "${name}"؟ سيتاح له إعادة الاختبار.`,
      confirmLabel: 'حذف المشاركة',
      variant: 'warning',
      onConfirm: () => {
        StorageService.deleteParticipant(id);
        loadData();
        showNotification(`تم حذف مشاركة الطالب "${name}"`);
      }
    });
  };

  const handleClearCompParticipants = (comp: Competition) => {
    setConfirmModal({
      isOpen: true,
      title: 'تصفير نتائج المسابقة',
      message: `تحذير: هل تريد مسح جميع نتائج ومشاركات مسابقة "${comp.name}" وتصفيرها بالكامل؟`,
      confirmLabel: 'تصفير النتائج',
      variant: 'danger',
      onConfirm: () => {
        StorageService.clearCompetitionParticipants(comp.id);
        loadData();
        showNotification(`تم تصفير مشاركات مسابقة "${comp.name}"`);
      }
    });
  };

  const handleSavePlatformComp = async (comp: Competition) => {
    const isNew = !editingComp;
    StorageService.saveCompetition(comp);
    setIsBuilderOpen(false);
    setEditingComp(null);
    loadData();
    showNotification('تم حفظ المسابقة بنجاح');
    if (isNew && comp.autoBroadcastTelegram) {
      try {
        const res = await TelegramService.broadcastCompetition(comp);
        if (res.success) {
          showNotification(`تم نشر إعلان المسابقة تلقائياً في تليجرام (${res.sentCount} جروب)`);
        }
      } catch (e: any) {
        console.warn('Auto broadcast error:', e.message);
      }
    }
  };

  const handleQuickBroadcastComp = (comp: Competition) => {
    setQuickBroadcastModal({
      isOpen: true,
      comp,
      type: 'announcement'
    });
  };

  const handleQuickBroadcastStart = (comp: Competition) => {
    setQuickBroadcastModal({
      isOpen: true,
      comp,
      type: 'start'
    });
  };

  const handleQuickBroadcastResults = (comp: Competition) => {
    setQuickBroadcastModal({
      isOpen: true,
      comp,
      type: 'results'
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeMsg(null);

    if (newPass !== confirmPass) {
      setPassChangeMsg({ text: 'كلمة المرور الجديدة غير متطابقة مع التأكيد.', isError: true });
      return;
    }

    try {
      const res = await StorageService.changeAdminPasswordAsync(currentPass, newPass);
      if (res.success) {
        setPassChangeMsg({ text: res.message, isError: false });
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setPassChangeMsg({ text: res.message, isError: true });
      }
    } catch {
      setPassChangeMsg({ text: 'حدث خطأ أثناء الاتصال بالخادم.', isError: true });
    }
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportAllPlatformData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tanafas_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    showNotification('تم تصدير النسخة الاحتياطية بنجاح');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageService.importPlatformData(content);
        if (success) {
          loadData();
          showNotification('تم استيراد النسخة الاحتياطية بنجاح.');
        } else {
          showNotification('فشل استيراد النسخة الاحتياطية. تأكد من صحة الملف.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetFactory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'استعادة ضبط المصنع الشامل',
      message: 'تحذير شديد: هل أنت متأكد من إعادة ضبط المنصة بالكامل وحذف كافة المسابقات والمشاركات واستعادة الإعدادات الافتراضية؟',
      confirmLabel: 'نعم، إعادة الضبط بالكامل',
      variant: 'danger',
      onConfirm: () => {
        StorageService.resetAllData();
        loadData();
        showNotification('تمت إعادة ضبط المصنع للمنصة بنجاح.');
        setTimeout(() => onBackToHome(), 1200);
      }
    });
  };

  // Enriched participants with competition details & rank calculation
  const allEnrichedParticipants: ParticipantResult[] = participants.map((p) => {
    const comp = competitions.find(c => c.id === p.competitionId);
    const answers = StorageService.getAnswers().filter(a => a.participantId === p.id);
    return {
      ...p,
      competitionName: comp?.name || 'مسابقة غير محددة',
      answers
    };
  });

  // Calculate Leaderboard rankings within filtered view
  const filteredParticipants = allEnrichedParticipants.filter((p) => {
    const matchesComp = selectedCompFilter === 'all' || p.competitionId === selectedCompFilter;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchParticipant.toLowerCase()) ||
      p.school.toLowerCase().includes(searchParticipant.toLowerCase()) ||
      (p.teamName && p.teamName.toLowerCase().includes(searchParticipant.toLowerCase()));
    const matchesType = selectedTypeFilter === 'all' 
      ? true 
      : selectedTypeFilter === 'team' 
      ? !!p.teamName 
      : !p.teamName;
    return matchesComp && matchesSearch && matchesType;
  }).sort((a, b) => {
    // Put disqualified participants at the bottom
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    if (sortParticipantBy === 'score') {
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalTimeSeconds !== b.totalTimeSeconds) return a.totalTimeSeconds - b.totalTimeSeconds;
      return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
    } else if (sortParticipantBy === 'time') {
      return a.totalTimeSeconds - b.totalTimeSeconds;
    } else {
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    }
  }).map((p, idx) => ({
    ...p,
    rank: p.isDisqualified ? undefined : idx + 1
  }));

  // Filtered competitions list
  const filteredCompetitions = competitions.filter((comp) => {
    const matchesSource = compSourceFilter === 'all' || comp.source === compSourceFilter;
    const matchesStatus = compStatusFilter === 'all' || comp.status === compStatusFilter;
    const matchesVisibility = compVisibilityFilter === 'all' || (comp.visibility || 'public') === compVisibilityFilter;
    const matchesSearch = 
      comp.name.toLowerCase().includes(searchComp.toLowerCase()) ||
      comp.schoolName.toLowerCase().includes(searchComp.toLowerCase()) ||
      comp.teacherDisplayName.toLowerCase().includes(searchComp.toLowerCase());
    return matchesSource && matchesStatus && matchesVisibility && matchesSearch;
  });

  // Filtered codes
  const filteredCodes = accessCodes.filter(c => 
    c.code.toLowerCase().includes(searchCode.toLowerCase()) ||
    c.teacherDisplayName.toLowerCase().includes(searchCode.toLowerCase()) ||
    c.school.toLowerCase().includes(searchCode.toLowerCase())
  );

  // Statistics Calculations
  const totalCompletedParticipants = participants.filter(p => !!p.submittedAt).length;
  const completionRate = participants.length > 0 
    ? Math.round((totalCompletedParticipants / participants.length) * 100) 
    : 100;
  const avgScore = participants.length > 0
    ? Math.round(participants.reduce((acc, p) => {
        const pPct = p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : (p.score <= 100 ? p.score : 100);
        return acc + pPct;
      }, 0) / participants.length)
    : 0;
  const allAnswers = StorageService.getAnswers();
  const correctAnswersTotal = allAnswers.filter(a => a.isCorrect).length;
  const overallAccuracy = allAnswers.length > 0 
    ? Math.round((correctAnswersTotal / allAnswers.length) * 100) 
    : 0;
  const activeCompetitionsCount = competitions.filter(c => c.status === 'active').length;

  // School performance breakdown
  const schoolStatsMap = new Map<string, { count: number; totalScore: number; avg: number }>();
  participants.forEach(p => {
    const s = p.school || 'أخرى';
    const pPct = p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : (p.score <= 100 ? p.score : 100);
    const cur = schoolStatsMap.get(s) || { count: 0, totalScore: 0, avg: 0 };
    cur.count += 1;
    cur.totalScore += pPct;
    cur.avg = Math.round(cur.totalScore / cur.count);
    schoolStatsMap.set(s, cur);
  });
  const topSchools = Array.from(schoolStatsMap.entries())
    .map(([school, data]) => ({ school, ...data }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  // Most popular competitions
  const compPopularity = competitions.map(c => {
    const partsCount = participants.filter(p => p.competitionId === c.id).length;
    return {
      comp: c,
      participantsCount: partsCount
    };
  }).sort((a, b) => b.participantsCount - a.participantsCount).slice(0, 5);

  // If not authenticated, render the secure admin lock gate!
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-[#142238] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 sm:p-10 text-center shadow-xl space-y-6" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 flex items-center justify-center text-[#009BB0] dark:text-[#00B4D8] mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
            منطقة الإدارة المركزية محمية
          </h2>
          <p className="text-sm text-[#5A6E85] dark:text-[#94A3B8] mt-2">
            هذه المنطقة مخصصة لإدارة منصة تَنافُسْ فقط وتتطلب إثبات هوية المشرف للمتابعة.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full h-13 bg-[#009BB0] hover:bg-[#008496] text-white rounded-2xl text-base font-black flex items-center justify-center gap-2 shadow-lg shadow-[#009BB0]/20 cursor-pointer transition-all active:scale-98"
          >
            <Shield className="w-5 h-5" />
            <span>تسجيل دخول المشرف العام</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full h-12 bg-[#F0F7FB] dark:bg-[#0B1321] hover:bg-teal-50/50 dark:hover:bg-[#142238] border border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9] rounded-2xl text-sm font-bold cursor-pointer transition-colors"
          >
            العودة للمنصة العامة
          </button>
        </div>

        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={() => {
            setIsLoginModalOpen(false);
            setIsAuthenticated(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-200" dir="rtl">
      
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl bg-[#102B4C] text-white shadow-2xl border border-slate-700 flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Admin Master Header */}
      <div className="bg-[#102B4C] dark:bg-[#070D18] rounded-[2.5rem] p-7 sm:p-10 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-[#009BB0]/20 text-[#00B4D8] border border-[#009BB0]/30 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>لوحة التحكم الشاملة • الإدارة المركزية</span>
            </span>
            <span className="text-xs bg-[#10B981] text-white font-bold px-3 py-1 rounded-full border border-emerald-400/40">
              متصل بأمان
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">إدارة منصة تَنافُسْ التعليمية</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            نظام التحكم الموحد: الإحصائيات العامة، سجل المشاركين، نتائج الاختبارات، المسابقات وتراخيص المعلمين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => {
              setEditingComp(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-[#009BB0] hover:bg-[#008496] rounded-2xl text-xs sm:text-sm font-black text-white shadow-md shadow-[#009BB0]/25 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مسابقة</span>
          </button>

          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-4 py-3 bg-white/15 hover:bg-white/25 rounded-2xl text-xs sm:text-sm font-black text-white cursor-pointer transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>معاينة المنصة</span>
          </button>

          <button
            onClick={handleAdminLogout}
            title="تسجيل خروج وقفل اللوحة"
            className="flex items-center gap-2 px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 rounded-2xl text-xs sm:text-sm font-black cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>قفل اللوحة</span>
          </button>
        </div>
      </div>

      {/* Key Metric Overview Cards (5 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-[#142238] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-[#5A6E85] dark:text-[#94A3B8] text-xs sm:text-sm font-bold">
            <span>المشاركون</span>
            <Users className="w-5 h-5 text-[#009BB0] dark:text-[#00B4D8]" />
          </div>
          <div className="text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2">{participants.length}</div>
          <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-bold">
            نسبة الإكمال: {completionRate}%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-[#5A6E85] dark:text-[#94A3B8] text-xs sm:text-sm font-bold">
            <span>المسابقات</span>
            <Trophy className="w-5 h-5 text-[#009BB0] dark:text-[#22D3EE]" />
          </div>
          <div className="text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2">{competitions.length}</div>
          <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-bold">
            {activeCompetitionsCount} مسابقة نشطة الآن
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-[#5A6E85] dark:text-[#94A3B8] text-xs sm:text-sm font-bold">
            <span>رموز المعلمين</span>
            <KeyRound className="w-5 h-5 text-[#00B4D8]" />
          </div>
          <div className="text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2">{accessCodes.length}</div>
          <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-bold">
            النشط: {accessCodes.filter(c => c.isActive).length} رمز
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-[#5A6E85] dark:text-[#94A3B8] text-xs sm:text-sm font-bold">
            <span>سجل الإجابات</span>
            <CheckCircle2 className="w-5 h-5 text-[#10B981] dark:text-[#34D399]" />
          </div>
          <div className="text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2">{answersCount}</div>
          <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-bold">
            دقة الإجابات: {overallAccuracy}%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#142238] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#5A6E85] dark:text-[#94A3B8] text-xs sm:text-sm font-bold">
            <span>متوسط النسبة العام</span>
            <Award className="w-5 h-5 text-[#D98218] dark:text-[#FBBF24]" />
          </div>
          <div className="text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-2 font-mono">{avgScore}%</div>
          <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] mt-1 font-bold">
            معدل إنجاز الطلاب عبر المنصة
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-inherit" />
          <span>لوحة التحليلات والإحصائيات</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-inherit" />
          <span>المشاركون والترتيب ({filteredParticipants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('competitions')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'competitions'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-inherit" />
          <span>إدارة المسابقات ({competitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('question_bank')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'question_bank'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-inherit" />
          <span>بنك الأسئلة والمجالات</span>
        </button>

        <button
          onClick={() => setActiveTab('access_codes')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'access_codes'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4 text-inherit" />
          <span>رموز المعلمين ({accessCodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'telegram'
              ? 'bg-[#102B4C] text-white shadow-md shadow-[#102B4C]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4 text-inherit" />
          <span>بوت تليجرام ونشر المسابقات</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
              : 'text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-inherit" />
          <span>إعدادات النظام والأمان</span>
        </button>
      </div>

      {/* TAB 1: Analytics & Deep Insights */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Top Schools */}
            <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <School className="w-5 h-5 text-[#06B6D4]" />
                  <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">أكثر المدارس تفوقاً</h3>
                </div>
                <span className="text-xs text-[#64748B] font-bold">حسب النسبة</span>
              </div>

              <div className="space-y-3">
                {topSchools.map((s, idx) => (
                  <div key={s.school} className="flex items-center justify-between p-3 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#0EA5E9] text-white text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate max-w-[160px]">
                          {s.school}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {s.count} مشارك • متوسط {s.avg}%
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-[#1f7349] dark:text-[#6ee7b7] font-mono">
                      {s.avg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Popular Competitions */}
            <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-[#0EA5E9]" />
                  <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">المسابقات الأكثر إقبالاً</h3>
                </div>
                <span className="text-xs text-[#64748B] font-bold">حسب الطلاب</span>
              </div>

              <div className="space-y-3">
                {compPopularity.map((item, idx) => (
                  <div key={item.comp.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#06B6D4] text-white text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate max-w-[160px]">
                          {item.comp.name}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {item.comp.questions.length} أسئلة • {item.comp.participationType === 'team' ? 'فرق' : 'فردي'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[slate-200]/80 dark:bg-[slate-700] text-[#0EA5E9] dark:text-[slate-200]">
                      {item.participantsCount} مشارك
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Health & Anti-Cheat metrics */}
            <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-[#1f7349]" />
                  <h3 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">سلامة ونزاهة الاختبارات</h3>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span>حماية قفل التبويب ومنع الخروج</span>
                    <span className="text-[#1f7349] font-black">مفعلة تلقائياً</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    ترصد الخروج من شاشة الاختبار وتسجل محاولات التبديل
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span>حماية التخمين (Rate Limiting)</span>
                    <span className="text-[#1f7349] font-black">نشطة (5 محاولات)</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    تجميد مؤقت لمدة دقيقتين عند تكرار إدخال الرموز الخاطئة
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span>نظام التقييم الفوري</span>
                    <span className="text-[#1f7349] font-black">نسبة مئوية دقيقة</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    احتساب دقيق مع أجزاء الثانية لكسر التعادل بالسرعة
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: Participants & Comprehensive Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Controls & Filter Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                سجل المشاركين وقوائم الترتيب العامة
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                استعراض ومراقبة جميع نتائج الطلاب عبر كل المسابقات مع خيارات التصدير والطباعة
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => ExportService.exportToCSV(filteredParticipants, 'كشف_المشاركين_والترتيب')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[slate-200]/40 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-[#06B6D4]" />
                <span>تصدير Excel (CSV)</span>
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[slate-200]/40 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 text-[#06B6D4]" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={searchParticipant}
                onChange={(e) => setSearchParticipant(e.target.value)}
                placeholder="ابحث باسم الطالب، المدرسة، الفريق..."
                className="w-full h-11 pr-10 pl-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3.5" />
            </div>

            {/* Competition filter */}
            <div>
              <select
                value={selectedCompFilter}
                onChange={(e) => setSelectedCompFilter(e.target.value)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="all">كل المسابقات ({competitions.length})</option>
                {competitions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Participation type filter */}
            <div>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="all">جميع أنواع المشاركة (فردي + فرق)</option>
                <option value="individual">مشاركات فردية فقط</option>
                <option value="team">مشاركات فرق فقط</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <select
                value={sortParticipantBy}
                onChange={(e) => setSortParticipantBy(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="score">ترتيب حسب: النسبة المئوية (الأعلى أولاً)</option>
                <option value="time">ترتيب حسب: الأسرع وقتاً</option>
                <option value="date">ترتيب حسب: الأحدث مشاركة</option>
              </select>
            </div>
          </div>

          {/* Table of Participants & Leaderboard */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-[#F0F9FF] dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-black">
                <tr>
                  <th className="p-3.5 text-center">الترتيب</th>
                  <th className="p-3.5">اسم المتسابق</th>
                  <th className="p-3.5">المسابقة</th>
                  <th className="p-3.5">المدرسة / الفريق</th>
                  <th className="p-3.5 text-center">النسبة المئوية</th>
                  <th className="p-3.5 text-center">الإجابات</th>
                  <th className="p-3.5 text-center">الوقت</th>
                  <th className="p-3.5 text-center">تاريخ الإرسال</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[slate-200]/60 dark:divide-[slate-700]">
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p) => {
                    const pPct = p.totalQuestions && p.totalQuestions > 0
                      ? Math.round((p.correctAnswers / p.totalQuestions) * 100)
                      : (p.score <= 100 ? p.score : 100);
                    return (
                    <tr key={p.id} className="hover:bg-[#F0F9FF]/60 dark:hover:bg-[#1E293B]/50 transition-colors">
                      
                      {/* Rank badge */}
                      <td className="p-3.5 text-center font-black">
                        {p.isDisqualified ? (
                          <span className="text-rose-500 font-bold text-xs bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                            مستبعد
                          </span>
                        ) : p.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black">
                            🥇 1
                          </span>
                        ) : p.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-black">
                            🥈 2
                          </span>
                        ) : p.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-black">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-[#64748B] font-mono font-bold">#{p.rank}</span>
                        )}
                      </td>

                      {/* Participant Name */}
                      <td className="p-3.5 font-black text-[#0F172A] dark:text-[#F1F5F9]">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.isDisqualified && (
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full font-bold">
                              مخالفة نزاهة
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Competition Name */}
                      <td className="p-3.5 font-bold text-[#64748B] dark:text-[#94A3B8] truncate max-w-[180px]">
                        {p.competitionName}
                      </td>

                      {/* School & Team */}
                      <td className="p-3.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        <div className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{p.school || 'غير محدد'}</div>
                        {p.teamName && (
                          <span className="inline-block mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-md bg-[slate-200] dark:bg-[slate-700] text-[#0EA5E9] dark:text-[slate-200]">
                            {p.teamName}
                          </span>
                        )}
                      </td>

                      {/* Score / Percentage */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="text-sm sm:text-base font-black text-[#1f7349] dark:text-[#6ee7b7]">
                          {pPct}%
                        </span>
                      </td>

                      {/* Answers */}
                      <td className="p-3.5 text-center font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                        {p.correctAnswers} / {p.totalQuestions || 5}
                      </td>

                      {/* Time */}
                      <td className="p-3.5 text-center font-mono text-xs text-[#64748B]">
                        {p.totalTimeSeconds.toFixed(1)} ث
                      </td>

                      {/* Submission Date */}
                      <td className="p-3.5 text-center text-xs text-[#64748B] whitespace-nowrap">
                        {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('ar-SA') : 'قيد التقدم'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedParticipantForDetail(p);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#06B6D4] hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B] cursor-pointer"
                            title="معاينة إجابات الطالب بالتفصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              const comp = competitions.find(c => c.id === p.competitionId);
                              setCertModalData({
                                isOpen: true,
                                studentName: p.name,
                                teacherName: comp?.teacherDisplayName || 'إدارة منصة تَنافُسْ',
                                schoolName: p.school || comp?.schoolName || 'المملكة العربية السعودية',
                                competitionTitle: comp?.name || p.competitionName || 'المسابقة التعليمية',
                                score: pPct,
                                rank: p.rank
                              });
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#1f7349] hover:bg-[#edf7f1] cursor-pointer"
                            title="إصدار وطباعة شهادة تقديرية"
                          >
                            <Award className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteParticipant(p.id, p.name)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 cursor-pointer"
                            title="حذف المحاولة (إتاحة إعادة الاختبار)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#64748B]">
                      لا توجد مشاركات مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: All Competitions Management */}
      {activeTab === 'competitions' && (
        <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                إدارة مسابقات المنصة والمدير ({filteredCompetitions.length})
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                التحكم بمسابقات المدير الرسمية، مسابقات المعلمين، خيارات الظهور العام والخاص، والبث في تليجرام
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setEditingComp(null);
                  setIsBuilderOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء مسابقة جديدة ➕</span>
              </button>
            </div>
          </div>

          {/* Filtering toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchComp}
                onChange={(e) => setSearchComp(e.target.value)}
                placeholder="ابحث باسم المسابقة أو المدرسة..."
                className="w-full h-11 pr-10 pl-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3.5" />
            </div>

            <div>
              <select
                value={compSourceFilter}
                onChange={(e) => setCompSourceFilter(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="all">كل المصادر (المدير + المعلمون)</option>
                <option value="platform">🛡️ مسابقات المدير الرسمية فقط</option>
                <option value="teacher">👨‍🏫 مسابقات المعلمين والمدارس فقط</option>
              </select>
            </div>

            <div>
              <select
                value={compVisibilityFilter}
                onChange={(e) => setCompVisibilityFilter(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="all">كل درجات الظهور (عامة + خاصة)</option>
                <option value="public">🌐 عامة (تظهر للكل وببوت تليجرام)</option>
                <option value="private">🔒 خاصة (مخفية - بالرابط فقط)</option>
              </select>
            </div>

            <div>
              <select
                value={compStatusFilter}
                onChange={(e) => setCompStatusFilter(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">النشطة حالياً</option>
                <option value="upcoming">القادمة قريباً</option>
                <option value="ended">المنتهية</option>
              </select>
            </div>
          </div>

          {/* Competitions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCompetitions.map((comp) => {
              const compPartsCount = participants.filter(p => p.competitionId === comp.id).length;
              return (
                <div
                  key={comp.id}
                  className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-[#F0F9FF] dark:bg-[#1E293B] flex flex-col justify-between space-y-4 hover:border-[#06B6D4]/50 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {comp.isQuestionBank || comp.id === 'comp-question-bank' ? (
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center gap-1">
                            <span>📚 بنك الأسئلة والتقويم الذاتي (خدمة عامة)</span>
                          </span>
                        ) : (
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            comp.source === 'platform'
                              ? 'bg-[#1f7349]/15 text-[#1f7349] dark:bg-[#1f7349]/30 dark:text-emerald-300 border border-[#1f7349]/30 flex items-center gap-1'
                              : 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30'
                          }`}>
                            {comp.source === 'platform' ? '🛡️ مسابقة رسمية للمنصة' : `مسابقة معلم (${comp.teacherDisplayName})`}
                          </span>
                        )}

                        {comp.visibility === 'private' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>خاصة (برابط)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>عامة</span>
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                        comp.status === 'active'
                          ? 'bg-[#edf7f1] text-[#1f7349]'
                          : comp.status === 'upcoming'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {comp.status === 'active' ? 'نشطة' : comp.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] mt-3">{comp.name}</h4>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] line-clamp-2 mt-1.5">{comp.description}</p>
                    
                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-3 font-bold space-y-1 bg-white/60 dark:bg-black/20 p-3 rounded-xl">
                      <div>المدرسة: {comp.schoolName}</div>
                      <div>الأسئلة: {comp.questions.length} سؤال • المشاركة: {comp.participationType === 'team' ? 'فرق' : 'فردية'}</div>
                      <div className="text-[#06B6D4] font-black">المشاركون الفعليون: {compPartsCount} طالب</div>
                      {comp.targetTelegramGroups && comp.targetTelegramGroups.length > 0 ? (
                        <div className="text-[11px] font-black text-sky-600 dark:text-sky-400 flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span>🎯 تليجرام:</span>
                          <span>مستهدفة لـ {comp.targetTelegramGroups.length} جروب محدد</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span>🌐 تليجرام:</span>
                          <span>كافة الجروبات المسجلة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telegram quick broadcast buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                    <button
                      onClick={() => handleQuickBroadcastComp(comp)}
                      className="py-1.5 px-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="إرسال إعلان المسابقة لجروبات تليجرام"
                    >
                      <Send className="w-3 h-3" />
                      <span>الإعلان</span>
                    </button>

                    <button
                      onClick={() => handleQuickBroadcastStart(comp)}
                      className="py-1.5 px-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="إرسال تنبيه انطلاق المسابقة الآن لجروبات تليجرام"
                    >
                      <Bell className="w-3 h-3" />
                      <span>تنبيه البدء</span>
                    </button>

                    <button
                      onClick={() => handleQuickBroadcastResults(comp)}
                      className="py-1.5 px-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="إرسال لوحة الشرف والمتصدرين لجروبات تليجرام"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>النتائج</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}${window.location.pathname}?quiz=${comp.webSlug || comp.id}`;
                        navigator.clipboard.writeText(link);
                        showNotification('تم نسخ رابط المسابقة المباشر للطلاب');
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#06B6D4] hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingComp(comp);
                          setIsBuilderOpen(true);
                        }}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#1E293B] cursor-pointer"
                        title="تعديل المسابقة"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleClearCompParticipants(comp)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 hover:bg-white cursor-pointer"
                        title="تصفير نتائج ومشاركات هذه المسابقة"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteComp(comp.id, comp.name)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-white cursor-pointer"
                        title="حذف المسابقة نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: Question Bank Management */}
      {activeTab === 'question_bank' && (
        <AdminQuestionBank />
      )}

      {/* TAB 4: Access Codes Management */}
      {activeTab === 'access_codes' && (
        <div className="space-y-8">
          
          {/* Trial Code Hero Control Card: كود التجربة - مكتبة المعلمين */}
          {(() => {
            const trialCode = accessCodes.find(c => c.id === 'code-trial-library' || c.code === 'مكتبة المعلمين' || c.isTrial);
            const isTrialActive = trialCode ? trialCode.isActive : true;

            return (
              <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-[#009BB0]/40 dark:border-teal-500/30 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/90 dark:from-[#132B4A]/90 dark:via-[#10243E] dark:to-[#0C1D33] p-7 sm:p-9 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  
                  {/* Info Column */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="size-14 sm:size-16 rounded-2xl bg-[#009BB0] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#009BB0]/25">
                      <Sparkles className="size-7 sm:size-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-xl sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                          كود التجربة المفتوح — مكتبة المعلمين
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                          isTrialActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-[#34D399] border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                        }`}>
                          <span className={`size-2 rounded-full ${isTrialActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>{isTrialActive ? 'مفعل ومتاح للاستخدام' : 'معطل ومغلق حالياً'}</span>
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-50 dark:bg-cyan-950/50 text-[#009BB0] dark:text-[#00B4D8] border border-cyan-200 dark:border-cyan-800">
                          مفتوح بدون عدد محدد (∞)
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-[#5A6E85] dark:text-[#94A3B8]">
                          بدون معلم (مباشر)
                        </span>
                      </div>

                      <p className="text-sm sm:text-base text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed max-w-3xl">
                        كود تجربة حر باسم <strong className="text-[#102B4C] dark:text-white">«مكتبة المعلمين»</strong> بدون معلم معين، يمكن لجميع الزوار والمعلمين استخدامه لإنشاء وتجربة المسابقات التعليمية بحرية كاملة.
                      </p>

                      <div className="pt-1 text-xs sm:text-sm font-bold">
                        {isTrialActive ? (
                          <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>الكود نشط الآن: يمكن الدخول به عبر زر مساحة المعلم مباشرة بدون طلب إدخال اسم.</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900">
                            <Lock className="size-4 shrink-0" />
                            <span>تنبيه التعطيل: عند محاولة استخدامه يظهر الإشعار: «التجربة المفتوحة متوقفة حاليا تواصل مع المسئول للحصول على كود تفعيل المعلم».</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 sm:gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = trialCode?.id || 'code-trial-library';
                        handleToggleCode(targetId);
                      }}
                      className={`px-6 py-3.5 rounded-2xl text-sm sm:text-base font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2.5 ${
                        isTrialActive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
                          : 'bg-[#009BB0] hover:bg-[#008496] text-white shadow-[#009BB0]/25'
                      }`}
                    >
                      <Power className="size-5" />
                      <span>{isTrialActive ? 'تعطيل كود التجربة' : 'تشغيل وتفعيل كود التجربة'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('مكتبة المعلمين')}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] text-xs sm:text-sm font-bold text-[#102B4C] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        title="نسخ اسم كود التجربة"
                      >
                        {copiedCode === 'مكتبة المعلمين' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-[#009BB0]" />}
                        <span>نسخ الكود</span>
                      </button>

                      {onLoginAsTeacher && (
                        <button
                          type="button"
                          onClick={() => onLoginAsTeacher('مكتبة المعلمين')}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-xs sm:text-sm font-black text-[#009BB0] dark:text-[#00B4D8] hover:bg-teal-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                        >
                          معاينة كمعلم
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Generator Form */}
          <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-7 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4]">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">توليد رمز جديد</h3>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">إصدار ترخيص دخول لمعلم جديد</p>
              </div>
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1.5">
                  اسم المعلم / المعلمة
                </label>
                <input
                  type="text"
                  required
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="مثال: أ. محمد بن سالم القحطاني"
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1.5">
                  المدرسة / الجهة التعليمية
                </label>
                <input
                  type="text"
                  required
                  value={newCodeSchool}
                  onChange={(e) => setNewCodeSchool(e.target.value)}
                  placeholder="مثال: ثانوية الرياض النموذجية"
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1.5">
                  الحد الأقصى للمسابقات المسموحة
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newCodeMaxComp}
                  onChange={(e) => setNewCodeMaxComp(Number(e.target.value))}
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full h-13 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-base font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-5 h-5" />
                <span>إصدار الرمز الآن</span>
              </button>
            </form>
          </div>

          {/* List of Codes */}
          <div className="lg:col-span-8 bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-7 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">سجل رموز المعلمين ({filteredCodes.length})</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">متابعة التراخيص، الاستهلاك، والتفعيل</p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="ابحث برمز أو اسم..."
                  className="pr-10 pl-4 py-2 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] w-52 sm:w-64"
                />
                <Search className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3" />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#F0F9FF] dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-black">
                  <tr>
                    <th className="p-4">الرمز</th>
                    <th className="p-4">اسم المعلم</th>
                    <th className="p-4">المدرسة</th>
                    <th className="p-4">الاستخدام</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[slate-200]/60 dark:divide-[slate-700]">
                  {filteredCodes.map((code) => {
                    const isCodeTrial = code.id === 'code-trial-library' || code.code === 'مكتبة المعلمين' || code.isTrial;

                    return (
                      <tr key={code.id} className={`hover:bg-[#F0F9FF]/60 dark:hover:bg-[#1E293B]/50 ${isCodeTrial ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}>
                        <td className="p-4 font-mono font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                          <div className="flex items-center gap-2">
                            <span>{code.code}</span>
                            <button
                              onClick={() => handleCopy(code.code)}
                              className="text-[#64748B] hover:text-[#0EA5E9] dark:hover:text-white p-1 cursor-pointer"
                              title="نسخ الرمز"
                            >
                              {copiedCode === code.code ? (
                                <Check className="w-4 h-4 text-[#1f7349]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            {isCodeTrial && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-[#009BB0] dark:bg-teal-900/60 dark:text-[#00B4D8]">
                                كود التجربة
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-black text-[#0F172A] dark:text-[#F1F5F9]">
                          {code.teacherDisplayName || <span className="text-[#64748B] font-normal">غير محدد</span>}
                          {isCodeTrial && (
                            <span className="text-xs font-normal text-[#5A6E85] dark:text-[#94A3B8] block">
                              (بدون معلم - مفتوح)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[#64748B] dark:text-[#94A3B8] font-medium">{code.school}</td>
                        <td className="p-4 text-[#0F172A] dark:text-[#F1F5F9] font-bold">
                          {isCodeTrial ? (
                            <span className="text-[#009BB0] dark:text-[#00B4D8] font-black">
                              غير محدود (∞)
                            </span>
                          ) : (
                            `${code.usedCount} / ${code.maxCompetitions}`
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-black px-3 py-1 rounded-full ${
                            code.isActive
                              ? 'bg-[#edf7f1] dark:bg-[#1a3324] text-[#1f7349] dark:text-[#6ee7b7] border border-[#a3e6b9]/40'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {code.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleCopyTeacherInvite(code)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[#06B6D4] hover:bg-white dark:hover:bg-[#1E293B] cursor-pointer"
                              title="نسخ رسالة الدعوة والترحيب"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {onLoginAsTeacher && (
                              <button
                                onClick={() => onLoginAsTeacher(code.code)}
                                className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#06B6D4] hover:bg-[slate-200]/40 cursor-pointer transition-colors"
                              >
                                معاينة كمعلم
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleCode(code.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                                code.isActive
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                                  : 'bg-[#edf7f1] dark:bg-[#1a3324] text-[#1f7349] dark:text-[#6ee7b7] hover:bg-[#d5f0e1]'
                              }`}
                            >
                              {code.isActive ? 'تعطيل' : 'تفعيل'}
                            </button>

                            {!isCodeTrial ? (
                              <button
                                onClick={() => handleDeleteCode(code.id, code.code)}
                                className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="حذف الرمز"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span
                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                                title="كود تجربة النظام الأساسي لا يمكن حذفه، يمكنك تعطيله بدلاً من ذلك"
                              >
                                <Lock className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB: Question Bank Management */}
      {activeTab === 'question_bank' && (
        <AdminQuestionBank />
      )}

      {/* TAB 4: Telegram Bot Settings */}
      {activeTab === 'telegram' && (
        <AdminTelegramSettings
          competitions={competitions}
          onNotify={showNotification}
        />
      )}

      {/* TAB 5: Platform & Security Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Change Admin Password */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-7 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">أمان حساب المشرف العام</h3>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">تغيير كلمة المرور الرئيسية للوحة التحكم</p>
              </div>
            </div>

            {passChangeMsg && (
              <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
                passChangeMsg.isError 
                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {passChangeMsg.isError ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{passChangeMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية..."
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="أدخل كلمة مرور جديدة قوية..."
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور للتأكيد..."
                  className="w-full h-12 px-4 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-13 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>حفظ وتحديث كلمة المرور</span>
              </button>
            </form>
          </div>

          {/* Backup & Factory Reset */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-7 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4]">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">النسخ الاحتياطي والبيانات</h3>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">حفظ واستعادة كافة محتويات المنصة</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">تصدير نسخة احتياطية كاملة</div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">حفظ المسابقات، الأسئلة، المشاركين، والشهادات كملف JSON</p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-xs font-black hover:bg-[#0284C7] cursor-pointer"
                >
                  تحميل JSON
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">استيراد نسخة احتياطية</div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">استعادة محتويات المنصة من ملف JSON محفوظ</p>
                </div>
                <label className="px-4 py-2.5 rounded-xl bg-[#06B6D4] text-white text-xs font-black hover:bg-[#0284C7] cursor-pointer inline-block">
                  <span>رفع ملف</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-rose-800 dark:text-rose-300">إعادة ضبط المصنع</div>
                  <p className="text-xs text-rose-600 dark:text-rose-400">مسح البيانات المخصصة والعودة للبيانات الافتراضية</p>
                </div>
                <button
                  onClick={handleResetFactory}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                >
                  إعادة ضبط
                </button>
              </div>
            </div>
          </div>

          {/* MongoDB Database Architecture & Live Status Card */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-7 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">قاعدة البيانات السحابية (MongoDB Architecture)</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                      dbStatus?.connected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span>{dbStatus?.connected ? 'متصل بقاعدة MongoDB' : 'مستودع الخادم النشط'}</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                    بنية بيانات متقدمة تدعم التوسع العالي، الفهارس الذكية، ومزامنة النتائج الفورية لآلاف المتسابقين
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncWithDb}
                disabled={isSyncingDb}
                className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#0284C7] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingDb ? 'animate-spin' : ''}`} />
                <span>{isSyncingDb ? 'جارِ المزامنة...' : 'مزامنة مع السيرفر الآن'}</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">المحرك الحالي</div>
                <div className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  {dbStatus?.engine || 'MongoDB'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">High Availability</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">قاعدة البيانات</div>
                <div className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9] truncate">
                  {dbStatus?.database || 'tanafas'}
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Collections: 4</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">إجمالي المسابقات</div>
                <div className="text-base font-black text-[#06B6D4]">
                  {competitions.length} مسابقة
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">مفهرسة بالمعرّف والـ slug</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">سجلات المتسابقين</div>
                <div className="text-base font-black text-[#0EA5E9] dark:text-[#94A3B8]">
                  {participants.length} مشارك
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">ترتيب فوري Fast Ranking</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Builder Modal */}
      {isBuilderOpen && (
        <CompetitionBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingComp(null);
          }}
          onSave={handleSavePlatformComp}
          editingCompetition={editingComp}
          currentTeacher={null}
          isAdmin={true}
        />
      )}

      {/* Participant Detail Inspector Modal */}
      <ParticipantDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedParticipantForDetail(null);
        }}
        participant={selectedParticipantForDetail}
        competition={competitions.find(c => c.id === selectedParticipantForDetail?.competitionId)}
        onOpenCertificate={(p) => {
          const comp = competitions.find(c => c.id === p.competitionId);
          const pPct = p.totalQuestions && p.totalQuestions > 0
            ? Math.round((p.correctAnswers / p.totalQuestions) * 100)
            : (p.score <= 100 ? p.score : 100);
          setIsDetailModalOpen(false);
          setCertModalData({
            isOpen: true,
            studentName: p.name,
            teacherName: comp?.teacherDisplayName || 'إدارة منصة تَنافُسْ',
            schoolName: p.school || comp?.schoolName || 'المملكة العربية السعودية',
            competitionTitle: comp?.name || p.competitionName || 'المسابقة التعليمية',
            score: pPct,
            rank: p.rank
          });
        }}
      />

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={certModalData.isOpen}
        onClose={() => setCertModalData(prev => ({ ...prev, isOpen: false }))}
        studentName={certModalData.studentName}
        teacherName={certModalData.teacherName}
        schoolName={certModalData.schoolName}
        competitionTitle={certModalData.competitionTitle}
        score={certModalData.score}
        rank={certModalData.rank}
      />

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Telegram Quick Broadcast Modal */}
      <TelegramQuickBroadcastModal
        isOpen={quickBroadcastModal.isOpen}
        onClose={() => setQuickBroadcastModal(prev => ({ ...prev, isOpen: false }))}
        competition={quickBroadcastModal.comp}
        initialType={quickBroadcastModal.type}
        onNotify={showNotification}
        onCompetitionUpdated={() => {
          loadData();
        }}
      />
    </div>
  );
};
