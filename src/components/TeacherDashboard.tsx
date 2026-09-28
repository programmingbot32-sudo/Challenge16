import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Users, 
  Award, 
  FileSpreadsheet, 
  Printer, 
  School, 
  CheckCircle2, 
  LogOut,
  Eye,
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import { Competition, AccessCode, ParticipantResult, TeamResult, ManualCertificate, CompetitionTeam, TeamMember } from '../types';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';
import { CompetitionBuilderModal } from './CompetitionBuilderModal';
import { CertificateModal } from './CertificateModal';
import { ConfirmModal } from './ConfirmModal';
import { PlatformRedirectButton } from './PlatformRedirectButton';

interface TeacherDashboardProps {
  currentTeacher: AccessCode;
  onLogout: () => void;
  onOpenStudentView: (competitionId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentTeacher,
  onLogout,
  onOpenStudentView,
}) => {
  const [activeTab, setActiveTab] = useState<'my_competitions' | 'certificates' | 'results' | 'analytics'>('my_competitions');
  
  const [myCompetitions, setMyCompetitions] = useState<Competition[]>([]);
  const [selectedCompForResults, setSelectedCompForResults] = useState<string>('');
  const [resultsList, setResultsList] = useState<ParticipantResult[]>([]);
  const [teamResultsList, setTeamResultsList] = useState<TeamResult[]>([]);
  const [registeredTeams, setRegisteredTeams] = useState<CompetitionTeam[]>([]);

  const [manualStudentName, setManualStudentName] = useState('');
  const [manualReason, setManualReason] = useState('تكريم للتفوق والتميز الدراسي المستمر');
  const [manualCertificates, setManualCertificates] = useState<ManualCertificate[]>([]);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);

  const [certModalData, setCertModalData] = useState<{
    isOpen: boolean;
    studentName: string;
    teacherName: string;
    schoolName: string;
    competitionTitle: string;
    score?: number;
    rank?: number;
    isManual?: boolean;
    reason?: string;
  }>({
    isOpen: false,
    studentName: '',
    teacherName: '',
    schoolName: '',
    competitionTitle: ''
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualFormError, setManualFormError] = useState<string | null>(null);

  // Confirmation Modal state
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

  const loadData = () => {
    const list = StorageService.getTeacherCompetitions(currentTeacher.code);
    setMyCompetitions(list);
    if (!selectedCompForResults && list.length > 0) {
      setSelectedCompForResults(list[0].id);
    }
    setManualCertificates(StorageService.getManualCertificates().filter(c => c.teacherName === currentTeacher.teacherDisplayName));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage_update', loadData);

    // Support direct deep-linking from Telegram or external links
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new') {
        setIsBuilderOpen(true);
      }
      const targetTab = params.get('tab');
      if (targetTab === 'certs' || targetTab === 'certificates') {
        setActiveTab('certificates');
      } else if (targetTab === 'results') {
        setActiveTab('results');
      } else if (targetTab === 'analytics') {
        setActiveTab('analytics');
      }
    } catch {}

    return () => window.removeEventListener('storage_update', loadData);
  }, [currentTeacher.code]);

  useEffect(() => {
    if (selectedCompForResults) {
      StorageService.fetchParticipants(selectedCompForResults).then(() => {
        const results = StorageService.getCompetitionResults(selectedCompForResults);
        setResultsList(results);
        const teamResults = StorageService.getTeamResults(selectedCompForResults);
        setTeamResultsList(teamResults);
      });
      const results = StorageService.getCompetitionResults(selectedCompForResults);
      setResultsList(results);
      const teamResults = StorageService.getTeamResults(selectedCompForResults);
      setTeamResultsList(teamResults);
      const teams = StorageService.getTeams(selectedCompForResults);
      setRegisteredTeams(teams);
    } else {
      setResultsList([]);
      setTeamResultsList([]);
      setRegisteredTeams([]);
    }
  }, [selectedCompForResults, myCompetitions]);

  const handleCopySlugLink = (webSlug: string) => {
    const url = `${window.location.origin}/?quiz=${webSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(webSlug);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteComp = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف المسابقة',
      message: `هل أنت متأكد من حذف مسابقة "${name}"؟ سيتم حذف جميع أسئلتها ونتائجها.`,
      confirmLabel: 'حذف المسابقة',
      variant: 'danger',
      onConfirm: () => {
        StorageService.deleteCompetition(id);
        loadData();
      }
    });
  };

  const handleSaveCompetition = (comp: Competition) => {
    StorageService.saveCompetition(comp);
    setIsBuilderOpen(false);
    setEditingComp(null);
    loadData();
  };

  const handleCreateManualCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);
    if (!manualStudentName.trim()) {
      setManualFormError('يرجى كتابة اسم الطالب لتوليد الشهادة.');
      return;
    }

    const newCert: ManualCertificate = {
      id: `cert-${Date.now()}`,
      studentName: manualStudentName.trim(),
      titleOrReason: manualReason.trim(),
      teacherName: currentTeacher.teacherDisplayName,
      schoolName: currentTeacher.school,
      date: new Date().toLocaleDateString('ar-SA')
    };

    StorageService.saveManualCertificate(newCert);
    setManualCertificates(prev => [newCert, ...prev]);

    setCertModalData({
      isOpen: true,
      studentName: newCert.studentName,
      teacherName: newCert.teacherName,
      schoolName: newCert.schoolName,
      competitionTitle: newCert.titleOrReason,
      isManual: true,
      reason: newCert.titleOrReason
    });

    setManualStudentName('');
  };

  const selectedCompObj = myCompetitions.find(c => c.id === selectedCompForResults);

  const allTeacherResults = myCompetitions.flatMap(c => StorageService.getCompetitionResults(c.id));
  const totalParticipants = allTeacherResults.length;
  const avgScore = totalParticipants > 0 ? Math.round(allTeacherResults.reduce((sum, r) => {
    const p = r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : (r.score <= 100 ? r.score : 100);
    return sum + p;
  }, 0) / totalParticipants) : 0;
  const topScore = totalParticipants > 0 ? Math.max(...allTeacherResults.map(r => {
    return r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : (r.score <= 100 ? r.score : 100);
  })) : 0;
  const totalCertificatesIssued = allTeacherResults.length + manualCertificates.length;

  const excellentCount = allTeacherResults.filter(r => (r.correctAnswers / (r.totalQuestions || 1)) >= 0.85).length;
  const veryGoodCount = allTeacherResults.filter(r => {
    const ratio = r.correctAnswers / (r.totalQuestions || 1);
    return ratio >= 0.70 && ratio < 0.85;
  }).length;
  const goodCount = allTeacherResults.filter(r => {
    const ratio = r.correctAnswers / (r.totalQuestions || 1);
    return ratio >= 0.50 && ratio < 0.70;
  }).length;
  const needsImprovementCount = allTeacherResults.filter(r => (r.correctAnswers / (r.totalQuestions || 1)) < 0.50).length;

  const isTrialAccount = currentTeacher.isTrial || currentTeacher.code.toUpperCase() === 'TCHR-DEMO' || currentTeacher.teacherDisplayName === 'مكتبة المعلمين';

  return (
    <div className="teacher-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" dir="rtl">
      <div className="dashboard-hero bg-gradient-to-r from-[#0C2340] via-[#0F2D52] to-[#009BB0] rounded-[2.5rem] p-7 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-[#009BB0]/30">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-white/10 text-cyan-200 border border-white/20">
                مساحة المعلم
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-black/20 text-cyan-100 border border-white/10">
                رمزك: {currentTeacher.code}
              </span>
              {isTrialAccount && (
                <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-400 text-slate-950 border border-amber-300 shadow-xs">
                  ✨ كود التجربة المفتوح (مكتبة المعلمين)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{currentTeacher.teacherDisplayName || 'مكتبة المعلمين'}</h1>
            <p className="text-xs sm:text-sm text-cyan-100/80 mt-1 flex items-center gap-2.5 font-medium">
              <School className="w-4 h-4 text-[#00C2E8]" />
              <span>{isTrialAccount ? 'بدون معلم (حساب تجريبي متاح للجميع)' : (currentTeacher.school || 'المملكة العربية السعودية')}</span>
              <span>•</span>
              <span>
                {isTrialAccount ? 'صلاحية مفتوحة (غير محدودة للمسابقات)' : `${myCompetitions.length} من ${currentTeacher.maxCompetitions} مسابقات مستخدمة`}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <PlatformRedirectButton variant="nav" className="bg-white/10 text-white border-white/20 hover:bg-white/20" />

            <button
              onClick={() => {
                setEditingComp(null);
                setIsBuilderOpen(true);
              }}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-lg shadow-[#009BB0]/30 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء مسابقة جديدة</span>
            </button>

            <button
              onClick={onLogout}
              title="تسجيل الخروج"
              className="p-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-cyan-100 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('my_competitions')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'my_competitions'
              ? 'bg-[#00A3C4] text-white shadow-md shadow-[#00A3C4]/25'
              : 'text-[#4A607A] dark:text-[#94A3B8] hover:bg-[#F0F6FB] dark:hover:bg-[#0F223D]'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#D49226]" />
          <span>المسابقات ({myCompetitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'bg-[#00A3C4] text-white shadow-md shadow-[#00A3C4]/25'
              : 'text-[#4A607A] dark:text-[#94A3B8] hover:bg-[#F0F6FB] dark:hover:bg-[#0F223D]'
          }`}
        >
          <Award className="w-4 h-4 text-[#D49226]" />
          <span>الشهادات</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'bg-[#00A3C4] text-white shadow-md shadow-[#00A3C4]/25'
              : 'text-[#4A607A] dark:text-[#94A3B8] hover:bg-[#F0F6FB] dark:hover:bg-[#0F223D]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#00C2E8]" />
          <span>النتائج</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-[#00A3C4] text-white shadow-md shadow-[#00A3C4]/25'
              : 'text-[#4A607A] dark:text-[#94A3B8] hover:bg-[#F0F6FB] dark:hover:bg-[#0F223D]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#00C2E8]" />
          <span>التحليلات</span>
        </button>
      </div>

      {activeTab === 'my_competitions' && (
        <div className="space-y-4">
          {myCompetitions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 rounded-3xl flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">لم تقم بإنشاء مسابقات بعد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ابدأ بإنشاء أول مسابقة لطلابك يدوياً أو عبر التوليد الآلي.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingComp(null);
                  setIsBuilderOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] dark:text-[#0B1120] text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء مسابقة الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCompetitions.map((comp) => {
                const resultsCount = StorageService.getCompetitionResults(comp.id).length;
                return (
                  <div
                    key={comp.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          comp.participationType === 'team'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {comp.participationType === 'team' ? 'فرق جماعية' : 'فردية'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {comp.questionType === 'ai' ? 'توليد آلي' : 'يدوي'}
                        </span>
                        {comp.visibility === 'private' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>خاصة</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>عامة</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {comp.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {comp.description || 'لا يوجد وصف إضافي.'}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{comp.questions.length} أسئلة</span>
                        <span>{comp.questionDuration}ث/سؤال</span>
                        <span>{resultsCount} مشارك</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleCopySlugLink(comp.webSlug)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          copiedId === comp.webSlug
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {copiedId === comp.webSlug ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم نسخ رابط الطلاب!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>نسخ رابط مشاركة الطلاب</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenStudentView(comp.webSlug)}
                          title="معاينة شاشة الطالب"
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>معاينة</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCompForResults(comp.id);
                            setActiveTab('results');
                          }}
                          title="عرض نتائج الطلاب"
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50/50 dark:bg-cyan-950/40 hover:bg-cyan-50 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>النتائج</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingComp(comp);
                            setIsBuilderOpen(true);
                          }}
                          title="تعديل المسابقة"
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteComp(comp.id, comp.name)}
                          title="حذف المسابقة"
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">توليد شهادة تقدير فورية</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">أدخل اسم الطالب واطبع شهادته فوراً</p>
                </div>
              </div>

              <form onSubmit={handleCreateManualCertificate} className="space-y-3 pt-2">
                {manualFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800">
                    {manualFormError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الطالب/ة المكرم *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualStudentName}
                    onChange={(e) => setManualStudentName(e.target.value)}
                    placeholder="مثال: فيصل بن عبدالله المنصور"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مناسبة التكريم أو عنوان التميز
                  </label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="مثال: تكريم للتفوق في مادة الرياضيات"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-cyan-500"
                  />
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                  <div>• اسم المعلم: <b>{currentTeacher.teacherDisplayName}</b></div>
                  <div>• الصرح التعليمي: <b>{currentTeacher.school}</b></div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>توليد ومعاينة الشهادة للطباعة</span>
                </button>
              </form>
            </div>

            {manualCertificates.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  شهادات يدوية سابقة ({manualCertificates.length})
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {manualCertificates.map(cert => (
                    <div
                      key={cert.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{cert.studentName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{cert.titleOrReason}</div>
                      </div>
                      <button
                        onClick={() => {
                          setCertModalData({
                            isOpen: true,
                            studentName: cert.studentName,
                            teacherName: cert.teacherName,
                            schoolName: cert.schoolName,
                            competitionTitle: cert.titleOrReason,
                            isManual: true,
                            reason: cert.titleOrReason
                          });
                        }}
                        className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-600 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        معاينة وطباعة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">شهادات الطلاب من نتائج المسابقات</h3>
              </div>

              {myCompetitions.length > 0 && (
                <select
                  value={selectedCompForResults}
                  onChange={(e) => setSelectedCompForResults(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-cyan-500"
                >
                  {myCompetitions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {resultsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                لا توجد مشاركات مسجلة حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {resultsList.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                        {selectedCompObj?.competitionType === 'open' ? '🎯' : `#${res.rank}`}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">{res.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {res.school || 'المدرسة'} • النتيجة: {res.totalQuestions > 0 ? Math.round((res.correctAnswers / res.totalQuestions) * 100) : res.score}% ({res.correctAnswers}/{res.totalQuestions} صحيحة)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const pct = res.totalQuestions > 0 ? Math.round((res.correctAnswers / res.totalQuestions) * 100) : res.score;
                        setCertModalData({
                          isOpen: true,
                          studentName: res.name,
                          teacherName: currentTeacher.teacherDisplayName,
                          schoolName: res.school || currentTeacher.school,
                          competitionTitle: selectedCompObj?.name || 'مسابقة التميز',
                          score: pct,
                          rank: selectedCompObj?.competitionType === 'open' ? undefined : res.rank,
                          isManual: false
                        });
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>طباعة الشهادة</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل نتائج وترتيب الطلاب</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">متابعة، تصدير ملف إكسل، وطباعة التقرير</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {myCompetitions.length > 0 && (
                <select
                  value={selectedCompForResults}
                  onChange={(e) => setSelectedCompForResults(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-cyan-500"
                >
                  {myCompetitions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              {selectedCompObj && (
                <>
                  <button
                    onClick={() => ExportService.exportToCSV(resultsList, selectedCompObj.name)}
                    disabled={resultsList.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>تصدير درجات الطلاب (CSV)</span>
                  </button>

                  {selectedCompObj.participationType === 'team' && teamResultsList.length > 0 && (
                    <button
                      onClick={() => ExportService.exportTeamsToCSV(teamResultsList, selectedCompObj.name)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      <span>تصدير نتائج الفرق (CSV)</span>
                    </button>
                  )}

                  <button
                    onClick={() => ExportService.printReport(resultsList, selectedCompObj, teamResultsList)}
                    disabled={resultsList.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-cyan-500 dark:text-slate-950 text-white hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة التقرير</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {resultsList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 text-cyan-900 dark:text-cyan-200">
                <div className="text-xs text-cyan-700 dark:text-cyan-400">إجمالي المشاركين</div>
                <div className="text-2xl font-black mt-1">{resultsList.length}</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                <div className="text-xs text-amber-700 dark:text-amber-400">أعلى نسبة محققة</div>
                <div className="text-2xl font-black mt-1">
                  {resultsList.length > 0
                    ? Math.max(...resultsList.map(r => r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : (r.score <= 100 ? r.score : 100)))
                    : 0}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 text-sky-900 dark:text-sky-200">
                <div className="text-xs text-sky-700 dark:text-sky-400">متوسط النسب</div>
                <div className="text-2xl font-black mt-1">
                  {resultsList.length > 0
                    ? Math.round(resultsList.reduce((s, r) => s + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : (r.score <= 100 ? r.score : 100)), 0) / resultsList.length)
                    : 0}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <div className="text-xs text-slate-500 dark:text-slate-400">أسرع وقت حل</div>
                <div className="text-2xl font-black mt-1">{resultsList[0]?.totalTimeSeconds || 0}ث</div>
              </div>
            </div>
          )}

          {selectedCompObj?.participationType === 'team' && (
            <div className="space-y-4 pt-2">
              {/* Registered Teams Lobby Status */}
              {registeredTeams.length > 0 && (
                <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-sky-900 dark:text-sky-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      <span>الفرق المسجلة في القاعة ({registeredTeams.length} فرق)</span>
                    </h4>
                    <span className="text-[11px] text-sky-700 dark:text-sky-400 font-bold">
                      {registeredTeams.filter(t => t.status === 'ready').length} مكتمل وجاهز
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {registeredTeams.map(t => (
                      <div key={t.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 dark:text-white">{t.name}</span>
                          <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded text-[11px]">
                            {t.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>القائد: {t.leaderName}</span>
                          <span className={`font-bold ${
                            t.status === 'disqualified' 
                              ? 'text-rose-600' 
                              : t.members.length >= (t.minMembers || 2) 
                              ? 'text-emerald-600' 
                              : 'text-amber-600'
                          }`}>
                            {t.status === 'disqualified' ? 'مستبعد' : `${t.members.length}/${t.maxMembers || 4} أعضاء`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          الأعضاء: {t.members.map((m: TeamMember) => m.name).join('، ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Rankings */}
              {teamResultsList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>ترتيب الفرق الجماعية (حسب مجموع الدرجات ومتوسط الوقت)</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-3">الترتيب</th>
                          <th className="p-3">اسم الفريق</th>
                          <th className="p-3">المدرسة</th>
                          <th className="p-3">عدد الأعضاء</th>
                          <th className="p-3">متوسط النسبة</th>
                          <th className="p-3">متوسط الوقت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {teamResultsList.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">#{t.rank}</td>
                            <td className="p-3 font-bold text-sky-700 dark:text-sky-400">{t.teamName}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{t.school}</td>
                            <td className="p-3 text-slate-700 dark:text-slate-200">{t.membersCount} طلاب</td>
                            <td className="p-3 font-black text-emerald-700 dark:text-emerald-400 font-mono">{Math.round(t.averageScore)}%</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{t.averageTime}ث</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {resultsList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              لا توجد نتائج مسجلة حتى الآن. شارك رابط المسابقة مع طلابك للبدء.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">{selectedCompObj?.competitionType === 'open' ? 'النمط' : 'الترتيب'}</th>
                    <th className="p-3">اسم المتسابق</th>
                    <th className="p-3">المدرسة</th>
                    {selectedCompObj?.participationType === 'team' && <th className="p-3">الفريق</th>}
                    <th className="p-3">النسبة المئوية</th>
                    <th className="p-3">الإجابات الصحيحة</th>
                    <th className="p-3">الوقت المستغرق</th>
                    <th className="p-3 text-center">الشهادة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resultsList.map((res) => {
                    const pct = res.totalQuestions > 0 ? Math.round((res.correctAnswers / res.totalQuestions) * 100) : res.score;
                    return (
                      <tr key={res.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-black text-slate-900 dark:text-white">
                          {selectedCompObj?.competitionType === 'open' ? (
                            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                              تدريب
                            </span>
                          ) : (
                            `#${res.rank}`
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{res.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{res.school}</td>
                        {selectedCompObj?.participationType === 'team' && (
                          <td className="p-3 font-semibold text-sky-700 dark:text-sky-400">{res.teamName || '-'}</td>
                        )}
                        <td className="p-3 font-black text-emerald-700 dark:text-emerald-400 text-sm font-mono">{pct}%</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{res.correctAnswers} من {res.totalQuestions}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{res.totalTimeSeconds.toFixed(1)} ث</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setCertModalData({
                                isOpen: true,
                                studentName: res.name,
                                teacherName: currentTeacher.teacherDisplayName,
                                schoolName: res.school || currentTeacher.school,
                                competitionTitle: selectedCompObj?.name || 'المسابقة',
                                score: pct,
                                rank: selectedCompObj?.competitionType === 'open' ? undefined : res.rank,
                                isManual: false
                              });
                            }}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          عرض الشهادة
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي مشاركات الطلاب</span>
                <div className="w-9 h-9 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {totalParticipants}
              </div>
              <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>عبر {myCompetitions.length} مسابقة مفعّلة</span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">متوسط النسبة العام</span>
                <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3 font-mono">
                {avgScore}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أعلى نسبة محققة</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-3 font-mono">
                {topScore}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الشهادات الصادرة</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-3">
                {totalCertificatesIssued}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>شهادات شكر وتقدير فورية</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>توزيع مستويات أداء الطلاب</span>
              </h3>

              {totalParticipants === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  لا توجد بيانات كافية لعرض التوزيع حتى الآن.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>متميز (85% فما فوق)</span>
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {excellentCount} طلاب ({Math.round((excellentCount / totalParticipants) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(excellentCount / totalParticipants) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                        <span>جيد جداً (70% - 84%)</span>
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {veryGoodCount} طلاب ({Math.round((veryGoodCount / totalParticipants) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(veryGoodCount / totalParticipants) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        <span>جيد (50% - 69%)</span>
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {goodCount} طلاب ({Math.round((goodCount / totalParticipants) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(goodCount / totalParticipants) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span>بحاجة لمتابعة ودعم (أقل من 50%)</span>
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {needsImprovementCount} طلاب ({Math.round((needsImprovementCount / totalParticipants) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(needsImprovementCount / totalParticipants) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>لوحة الشرف لأفضل المتسابقين</span>
              </h3>

              {allTeacherResults.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  لا توجد نتائج مسجلة حتى الآن.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {allTeacherResults.slice(0, 3).map((student, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div 
                        key={student.id + idx}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{medals[idx]}</span>
                          <div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{student.school}</div>
                          </div>
                        </div>
                        <div className="text-left font-mono">
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {student.totalQuestions > 0 ? Math.round((student.correctAnswers / student.totalQuestions) * 100) : (student.score <= 100 ? student.score : 100)}%
                          </div>
                          <div className="text-[10px] text-slate-400">{student.totalTimeSeconds.toFixed(1)}ث</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>معدل المشاركة حسب المسابقة</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">عنوان المسابقة</th>
                    <th className="p-3">نوع المسابقة</th>
                    <th className="p-3">عدد الأسئلة</th>
                    <th className="p-3">المشاركون</th>
                    <th className="p-3">متوسط النسبة</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myCompetitions.map(comp => {
                    const compResults = StorageService.getCompetitionResults(comp.id);
                    const compAvg = compResults.length > 0 
                      ? Math.round(compResults.reduce((s, r) => {
                          const p = r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : (r.score <= 100 ? r.score : 100);
                          return s + p;
                        }, 0) / compResults.length) 
                      : 0;
                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{comp.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {comp.competitionType === 'live' ? 'مباشرة' : comp.competitionType === 'windowed' ? 'فترة محددة' : 'مفتوحة'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{comp.questions.length} سؤال</td>
                        <td className="p-3 font-bold text-cyan-600 dark:text-cyan-400">{compResults.length} طالب</td>
                        <td className="p-3 font-black text-slate-800 dark:text-slate-200 font-mono">{compAvg}%</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            متاحة للطلاب
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <CompetitionBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingComp(null);
        }}
        onSave={handleSaveCompetition}
        currentTeacher={currentTeacher}
        isAdmin={false}
        editingCompetition={editingComp}
      />

      <CertificateModal
        isOpen={certModalData.isOpen}
        onClose={() => setCertModalData(prev => ({ ...prev, isOpen: false }))}
        studentName={certModalData.studentName}
        teacherName={certModalData.teacherName}
        schoolName={certModalData.schoolName}
        competitionTitle={certModalData.competitionTitle}
        score={certModalData.score}
        rank={certModalData.rank}
        isManual={certModalData.isManual}
        reason={certModalData.reason}
      />

      {/* Confirmation Modal */}
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
    </div>
  );
};
