import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Compass,
  GraduationCap,
  Laptop,
  Search,
  Sparkles,
  Trophy,
  Users,
  ExternalLink,
  Layers,
  Zap
} from 'lucide-react';
import { Competition, AccessCode } from '../types';
import { StorageService } from '../services/storageService';

interface HomeViewProps {
  competitions: Competition[];
  currentTeacher: AccessCode | null;
  onOpenCompetition: (competitionIdOrSlug: string) => void;
  onTeacherLoginSuccess: (teacher: AccessCode) => void;
  onGoToTeacherDashboard: () => void;
}

const CATEGORIES = ['الكل', 'الرياضيات', 'العلوم', 'اللغة العربية', 'التقنية'];

// Helper to determine subject icon & tone matching the reference design
const getSubjectTheme = (competition: Competition) => {
  if (competition.isQuestionBank || competition.id === 'comp-question-bank') {
    return {
      subject: 'بنك الأسئلة الشامل',
      level: 'متعدد المجالات',
      icon: Layers,
      color: 'text-[#009BB0] dark:text-[#22D3EE]',
      bg: 'bg-teal-100/70 dark:bg-teal-900/40',
      defaultParticipants: 580,
      defaultQuestions: 30,
      defaultDuration: 10
    };
  }

  const text = `${competition.name} ${competition.description || ''} ${competition.questions?.map(q => q.category || '').join(' ') || ''}`.toLowerCase();
  
  if (text.includes('رياض') || text.includes('حساب') || text.includes('أرقام')) {
    return {
      subject: 'الرياضيات',
      level: 'متوسط',
      icon: Sparkles,
      color: 'text-[#059669] dark:text-[#34D399]',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      defaultParticipants: 284,
      defaultQuestions: 20,
      defaultDuration: 15
    };
  }
  if (text.includes('علوم') || text.includes('فيزياء') || text.includes('أحياء') || text.includes('كيمياء') || text.includes('تجرب')) {
    return {
      subject: 'العلوم',
      level: 'سهل',
      icon: Trophy,
      color: 'text-[#009BB0] dark:text-[#00B4D8]',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      defaultParticipants: 192,
      defaultQuestions: 15,
      defaultDuration: 12
    };
  }
  if (text.includes('عرب') || text.includes('لغة') || text.includes('بيان') || text.includes('شعر')) {
    return {
      subject: 'اللغة العربية',
      level: 'متوسط',
      icon: BookOpen,
      color: 'text-[#1E3A5F] dark:text-[#93C5FD]',
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      defaultParticipants: 310,
      defaultQuestions: 15,
      defaultDuration: 10
    };
  }
  if (text.includes('برمج') || text.includes('تقن') || text.includes('ذكاء') || text.includes('حاسب')) {
    return {
      subject: 'التقنية',
      level: 'متقدم',
      icon: Laptop,
      color: 'text-[#102B4C] dark:text-[#38BDF8]',
      bg: 'bg-teal-50/70 dark:bg-slate-800/60',
      defaultParticipants: 415,
      defaultQuestions: 20,
      defaultDuration: 20
    };
  }
  return {
    subject: 'ثقافة عامة',
    level: 'عام',
    icon: Compass,
    color: 'text-[#D98218] dark:text-[#FBBF24]',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    defaultParticipants: 250,
    defaultQuestions: 15,
    defaultDuration: 15
  };
};

export const HomeView: React.FC<HomeViewProps> = ({
  competitions,
  currentTeacher,
  onOpenCompetition,
  onTeacherLoginSuccess,
  onGoToTeacherDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const toggleCardExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((competition) => {
      // Exclude private competitions from public homepage listing
      if (competition.visibility === 'private') {
        return false;
      }

      const query = searchQuery.trim().toLowerCase();
      const haystack = `${competition.name} ${competition.webSlug} ${competition.schoolName} ${competition.description}`.toLowerCase();
      
      const categoryMatch =
        selectedCategory === 'الكل' ||
        (selectedCategory === 'الرياضيات' && (haystack.includes('رياض') || haystack.includes('حساب'))) ||
        (selectedCategory === 'العلوم' && (haystack.includes('علوم') || haystack.includes('فيزياء') || haystack.includes('أحياء'))) ||
        (selectedCategory === 'اللغة العربية' && haystack.includes('عرب')) ||
        (selectedCategory === 'التقنية' && (haystack.includes('تقن') || haystack.includes('برمج') || haystack.includes('ذكاء')));

      return categoryMatch && (!query || haystack.includes(query));
    });
  }, [competitions, searchQuery, selectedCategory]);

  const scrollToCompetitions = () => {
    document.getElementById('competitions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenTeacherArea = () => {
    if (currentTeacher) {
      onGoToTeacherDashboard();
    } else {
      // Trigger modal in App
      const event = new CustomEvent('open_teacher_login');
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="space-y-16 lg:space-y-24 pb-12" dir="rtl">
      
      <section className="relative pt-4 sm:pt-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          
          <div className="space-y-6 sm:space-y-8">
            <a
              href="https://sabir511-platform.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full border border-[#009BB0]/30 bg-[#009BB0]/10 dark:border-teal-800/60 dark:bg-teal-950/40 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#009BB0] dark:text-[#00B4D8] hover:bg-[#009BB0]/20 transition-all cursor-pointer group"
              title="زيارة منصة العلوم والتقنية للجميع"
            >
              <img
                src="/platform-logo.png"
                alt="شعار منصة العلوم والتقنية للجميع"
                className="size-4.5 rounded-full object-contain bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-700"
              />
              <span>منصة العلوم والتقنية للجميع — موسم جديد من التحديات التعليمية</span>
              <ExternalLink className="size-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>

            <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-black leading-[1.2] tracking-tight text-[#102B4C] dark:text-[#F1F5F9]">
              المعرفة تصنع <span className="text-[#009BB0] dark:text-[#00B4D8]">الفارق</span>
            </h1>

            <p className="max-w-xl text-base sm:text-xl leading-relaxed text-[#5A6E85] dark:text-[#94A3B8] font-medium">
              بعطائكم نصنع الإنجاز، وبإبداعكم نبني المستقبل — مسابقات واختبارات تعليمية تجمع المتعة بالمعرفة
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={scrollToCompetitions}
                className="inline-flex items-center gap-3 rounded-2xl bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white px-7 py-4 text-base sm:text-lg font-black shadow-lg shadow-[#009BB0]/25 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <span>فتح قسم المسابقات</span>
                <ArrowLeft className="h-5 w-5" />
              </button>

              <button
                onClick={handleOpenTeacherArea}
                className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] px-6 py-4 text-base font-bold text-[#102B4C] dark:text-[#F1F5F9] hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <GraduationCap className="h-5 w-5 text-[#009BB0] dark:text-[#00B4D8]" />
                <span>مساحة المعلم</span>
              </button>
            </div>

          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-[#009BB0]/30 dark:border-slate-700 bg-white dark:bg-[#142238] p-3 sm:p-3.5 shadow-2xl shadow-[#009BB0]/10 dark:shadow-black/40">
                <img
                  src="/tanafas-achievement-recolored.jpg"
                  alt="تَنافُسْ - كأس الإنجاز والمعرفة"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  width="800"
                  height="800"
                  className="w-full h-auto rounded-[2rem] object-cover"
                />

                {/* Platform Logo Badge at bottom of image */}
                <a
                  href="https://sabir511-platform.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-6 right-6 left-6 rounded-2xl bg-white/95 dark:bg-[#142238]/95 backdrop-blur-md p-3.5 sm:p-4 border border-slate-200/90 dark:border-slate-700 shadow-xl flex items-center justify-between gap-3 hover:scale-[1.02] transition-all cursor-pointer group"
                  title="الانتقال إلى منصة العلوم والتقنية للجميع"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/platform-logo.png"
                      alt="شعار منصة العلوم والتقنية للجميع"
                      className="size-11 sm:size-12 rounded-2xl object-contain bg-white dark:bg-slate-900 p-1 border border-teal-200/80 dark:border-teal-700/80 shadow-sm"
                    />
                    <div>
                      <p className="text-sm sm:text-base font-black text-[#102B4C] dark:text-[#F1F5F9] group-hover:text-[#009BB0] dark:group-hover:text-[#00B4D8] transition-colors">
                        منصة العلوم والتقنية للجميع
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#009BB0] dark:text-[#00B4D8] border border-[#009BB0]/30 group-hover:bg-[#009BB0] group-hover:text-white transition-colors shrink-0">
                    <span>فتح قسم المسابقات</span>
                    <ExternalLink className="size-3.5" />
                  </span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section id="competitions" className="space-y-8 scroll-mt-24">
        <div className="space-y-2">
          <p className="text-sm sm:text-base font-bold text-[#009BB0] dark:text-[#00B4D8]">
            المسابقات الحالية
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
            اختر تحديك القادم
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-3.5 h-5 w-5 text-[#5A6E85]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مسابقة بالاسم أو الموضوع..."
              className="w-full h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] pr-12 pl-4 text-base font-medium text-[#102B4C] dark:text-[#F1F5F9] placeholder:text-[#5A6E85]/60 outline-none transition focus:border-[#009BB0] focus:ring-2 focus:ring-[#009BB0]/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-2xl px-5 py-3 text-sm sm:text-base font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/20'
                      : 'bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-[#5A6E85] dark:text-[#94A3B8] hover:bg-teal-50/50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

        </div>

        {filteredCompetitions.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompetitions.map((competition) => {
              const theme = getSubjectTheme(competition);
              const ThemeIcon = theme.icon;
              const questionsCount = competition.questions?.length || theme.defaultQuestions;
              const durationMinutes = competition.examDurationMinutes || theme.defaultDuration;
              const mockParticipants = theme.defaultParticipants || (300 + (competition.name.length * 9) % 150);
              const isExpanded = expandedCardId === competition.id;
              const compStatus = StorageService.getCompetitionStatus(competition);

              return (
                <article
                  key={competition.id}
                  className={`group relative flex flex-col justify-between rounded-[2.25rem] border-2 transition-all duration-300 overflow-hidden p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(16,43,76,0.06)] hover:shadow-[0_16px_36px_-6px_rgba(0,155,176,0.18)] ${
                    competition.isQuestionBank
                      ? 'border-[#009BB0] ring-2 ring-[#009BB0]/25 bg-gradient-to-b from-teal-50/50 via-white to-white dark:from-teal-950/20 dark:via-[#142238] dark:to-[#142238]'
                      : 'border-slate-200/90 hover:border-[#009BB0] dark:border-slate-700/80 dark:hover:border-[#009BB0] bg-white dark:bg-[#142238]'
                  }`}
                >
                  {/* Subtle Blueprint Top Accent Line */}
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent ${
                    competition.isQuestionBank ? 'via-[#009BB0]' : 'via-[#009BB0]/30'
                  } to-transparent group-hover:via-[#009BB0] transition-colors`} />

                  <div>
                    {/* Top Row: Icon on Right, Status Pill on Left (in RTL) */}
                    <div className="flex items-start justify-between">
                      {/* Icon Square */}
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme.bg}`}>
                        <ThemeIcon className={`h-7 w-7 ${theme.color}`} />
                      </div>

                      {/* Status Pills */}
                      <div className="flex flex-col items-end gap-1.5">
                        {competition.isQuestionBank ? (
                          <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-3.5 py-1 text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-xs">
                            <Zap className="w-3.5 h-3.5 text-[#D98218]" />
                            <span>تقييم فوري بدون تسجيل</span>
                          </span>
                        ) : competition.competitionType === 'open' ? (
                          <span className="rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-3.5 py-1 text-xs sm:text-sm font-bold text-[#009BB0] dark:text-[#22D3EE] flex items-center gap-1">
                            🎯 تدريب مفتوح
                          </span>
                        ) : compStatus === 'upcoming' ? (
                          <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 border border-[#D98218]/40 dark:border-[#D98218]/60 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#D98218] dark:text-[#FBBF24] flex items-center gap-1">
                            <span>⏳</span>
                            <span>تبدأ قريباً</span>
                          </span>
                        ) : compStatus === 'ended' ? (
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#5A6E85] dark:text-[#94A3B8]">
                            ⛔ انتهت المسابقة
                          </span>
                        ) : (
                          <span className="rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#009BB0] dark:text-[#22D3EE] flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#009BB0] animate-pulse" />
                            <span>تنافس نشط</span>
                          </span>
                        )}

                        {competition.participationType === 'team' && (
                          <span className="rounded-full bg-[#102B4C]/5 dark:bg-[#102B4C]/40 border border-[#102B4C]/15 dark:border-[#102B4C]/50 px-3 py-1 text-xs font-bold text-[#102B4C] dark:text-[#38BDF8] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#009BB0]" />
                            <span>مسابقة فرق</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Center Area: Category/Level & Title */}
                    <div className="text-center mt-4 space-y-2">
                      <p className="text-sm sm:text-base font-bold text-[#009BB0] dark:text-[#00B4D8]">
                        {theme.subject} · {theme.level}
                      </p>
                      
                      <h3 className="text-2xl sm:text-[1.75rem] font-black text-[#102B4C] dark:text-[#F1F5F9] leading-snug tracking-tight">
                        {competition.name}
                      </h3>

                      {/* Description toggle & expandable area */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => toggleCardExpand(competition.id, e)}
                          className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#5A6E85] hover:text-[#009BB0] dark:hover:text-[#00B4D8] transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'إخفاء التفاصيل' : 'تفاصيل المسابقة'}</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#009BB0] dark:text-[#00B4D8]' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 p-4 rounded-2xl bg-[#F0F7FB] dark:bg-[#0B1321] border border-teal-100 dark:border-slate-700 text-sm sm:text-base font-medium text-[#5A6E85] dark:text-[#94A3B8] text-center leading-relaxed"
                          >
                            <p>{competition.description || 'اختبر معلوماتك ونافس لتحقيق أفضل نتيجة وشهادة تقدير فورية.'}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Bottom Area: Divider + Stats Row + Action Button */}
                  <div className="mt-6">
                    {/* Horizontal Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-700/80 my-4" />

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold text-[#5A6E85] dark:text-[#94A3B8] px-1">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-[#009BB0] dark:text-[#00B4D8]" />
                        <span className="text-[#102B4C] dark:text-[#F1F5F9]">{competition.isQuestionBank ? '30+ سؤال' : `${questionsCount} سؤال`}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-[#009BB0] dark:text-[#00B4D8]" />
                        <span className="text-[#102B4C] dark:text-[#F1F5F9]">{competition.isQuestionBank ? 'توقيت مخصص' : `${durationMinutes} دقيقة`}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-[#009BB0] dark:text-[#00B4D8]" />
                        <span className="text-[#102B4C] dark:text-[#F1F5F9]">{mockParticipants}</span>
                      </span>
                    </div>

                    {/* Action Button - Centered Text with Left Arrow */}
                    <button
                      onClick={() => onOpenCompetition(competition.webSlug || competition.id)}
                      className={`w-full relative flex items-center justify-center rounded-2xl py-4 px-6 text-base sm:text-lg font-black transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer mt-5 group ${
                        competition.isQuestionBank
                          ? 'bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] text-white dark:text-[#0B1321] shadow-lg shadow-[#009BB0]/30 ring-2 ring-[#009BB0]/40'
                          : compStatus === 'upcoming'
                          ? 'bg-[#D98218] hover:bg-[#BF6E0F] text-white shadow-[#D98218]/25'
                          : compStatus === 'ended'
                          ? 'bg-[#102B4C] hover:bg-[#1A3B63] text-white shadow-[#102B4C]/20'
                          : 'bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white shadow-md shadow-[#009BB0]/25'
                      }`}
                    >
                      <span className="text-center font-black">
                        {competition.isQuestionBank
                          ? '🎯 اختر المجال وابدأ التقييم الفوري'
                          : compStatus === 'upcoming' 
                          ? 'استعراض الموعد والتفاصيل' 
                          : compStatus === 'ended' 
                          ? 'استعراض النتائج والتفاصيل' 
                          : 'ابدأ المسابقة'}
                      </span>
                      <ChevronLeft className="absolute left-5 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    </button>
                  </div>

                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#142238] p-12 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-[#5A6E85]" />
            <p className="text-lg font-bold text-[#102B4C] dark:text-[#F1F5F9]">لم نجد مسابقة مطابقة لبحثك</p>
            <p className="mt-1 text-base text-[#5A6E85] dark:text-[#94A3B8]">جرّب تصنيفاً آخر أو امسح كلمة البحث.</p>
          </div>
        )}

      </section>

      <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#142238]/95 p-8 sm:p-12 space-y-10 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <p className="text-sm sm:text-base font-bold text-[#009BB0] dark:text-[#00B4D8]">
              لوحة الإنجاز
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
              كل مشاركة تصنع فرقًا
            </h2>
            <p className="text-base sm:text-lg text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed">
              تابع تقدمك، طوّر ترتيبك، واحصل على شهادة شكر وتقدير برعاية إدارة المنصة فور إتمام التحدي.
            </p>
          </div>

          <button
            onClick={scrollToCompetitions}
            className="inline-flex items-center gap-2.5 rounded-2xl border border-[#009BB0]/40 dark:border-slate-700 bg-white dark:bg-[#0B1321] px-6 py-4 text-base font-bold text-[#009BB0] dark:text-[#00B4D8] hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Trophy className="h-5 w-5 text-[#009BB0] dark:text-[#00B4D8]" />
            <span>ابدأ تحديك الآن</span>
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'أكمل التحدي',
              desc: 'أجب بهدوء وتركيز وحقق أفضل نتيجة ممكنة قبل انتهاء الوقت.',
            },
            {
              step: '02',
              title: 'تابع ترتيبك',
              desc: 'قارن تقدمك بالمشاركين واكتشف مستوى تميزك بين زملائك.',
            },
            {
              step: '03',
              title: 'استلم شهادتك',
              desc: 'وثّق إنجازك فوراً وشارك شهادتك الرسمية بكل فخر واعتزاز.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-[#F0F7FB] dark:bg-[#0B1321] p-7 transition-shadow hover:shadow-md space-y-3"
            >
              <span className="font-mono text-sm font-black text-[#009BB0] dark:text-[#00B4D8]">
                {item.step}
              </span>
              <h3 className="text-xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                {item.title}
              </h3>
              <p className="text-base leading-relaxed text-[#5A6E85] dark:text-[#94A3B8]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

    </div>
  );
};
