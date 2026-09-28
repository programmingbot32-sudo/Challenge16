import React, { useState, useEffect } from 'react';
import { Navbar, ActivePage } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { StudentQuizView } from './components/StudentQuizView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminPanel } from './components/AdminPanel';
import { TeacherAccessModal } from './components/TeacherAccessModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AccessCode, Competition } from './types';
import { StorageService } from './services/storageService';
import { Shield, Award, Trophy, Lock, ExternalLink } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [currentTeacher, setCurrentTeacher] = useState<AccessCode | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedQuizSlug, setSelectedQuizSlug] = useState<string | undefined>(undefined);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('tanafas_dark_mode') === 'true';
  });

  useEffect(() => {
    const handleOpenTeacher = () => setIsTeacherModalOpen(true);
    window.addEventListener('open_teacher_login', handleOpenTeacher);
    return () => window.removeEventListener('open_teacher_login', handleOpenTeacher);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tanafas_dark_mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const loadData = () => {
    setCompetitions(StorageService.getCompetitions());
    const teacher = StorageService.getLoggedTeacher();
    if (teacher) {
      setCurrentTeacher(teacher);
    }
  };

  useEffect(() => {
    loadData();
    // Pull latest data from MongoDB database asynchronously
    StorageService.fetchFromDatabase().then(updated => {
      if (updated) {
        loadData();
      }
    });

    window.addEventListener('storage_update', loadData);

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const hasAdminParam = params.get('portal') === 'admin' || params.get('admin') === 'true' || params.get('admin') === '1' || window.location.hash === '#admin';
      const quizParam = params.get('quiz') || params.get('comp');
      const teacherCode = params.get('teacher') || params.get('teacherCode') || params.get('code');
      const hasTeacherPortal = params.get('portal') === 'teacher' || params.get('teacher') === 'true' || window.location.hash === '#teacher';

      if (hasAdminParam) {
        setActivePage('admin_panel');
      } else if (teacherCode && teacherCode !== 'true') {
        handleLoginAsTeacherCode(teacherCode);
      } else if (hasTeacherPortal) {
        const logged = StorageService.getLoggedTeacher();
        if (logged) {
          setCurrentTeacher(logged);
          setActivePage('teacher_dashboard');
        } else {
          setIsTeacherModalOpen(true);
        }
      } else if (quizParam) {
        setSelectedQuizSlug(quizParam);
        setActivePage('student_quiz');
      } else {
        setActivePage('home');
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('storage_update', loadData);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Secret Admin Shortcut: Alt + A or Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isA = e.key === 'a' || e.key === 'A' || e.key === 'ش';
      if ((e.altKey && isA) || (e.ctrlKey && e.shiftKey && isA)) {
        e.preventDefault();
        handleOpenAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCompetition = (slugOrId: string) => {
    setSelectedQuizSlug(slugOrId);
    setActivePage('student_quiz');
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    url.searchParams.delete('admin');
    url.searchParams.set('quiz', slugOrId);
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTeacherLoginSuccess = (teacher: AccessCode) => {
    StorageService.setLoggedTeacher(teacher.code);
    setCurrentTeacher(teacher);
    setActivePage('teacher_dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginAsTeacherCode = (code: string) => {
    let result = StorageService.verifyAccessCode(code);
    if (result.valid && result.codeObj) {
      handleTeacherLoginSuccess(result.codeObj);
      return;
    }
    // Attempt database sync then re-verify
    StorageService.fetchFromDatabase().then(() => {
      result = StorageService.verifyAccessCode(code);
      if (result.valid && result.codeObj) {
        handleTeacherLoginSuccess(result.codeObj);
      } else {
        setIsTeacherModalOpen(true);
      }
    });
  };

  const handleTeacherLogout = () => {
    StorageService.setLoggedTeacher(null);
    setCurrentTeacher(null);
    setActivePage('home');
  };

  const handleOpenAdmin = () => {
    if (StorageService.isAdminAuthenticated()) {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'admin');
      window.history.pushState({}, '', url.toString());
      setActivePage('admin_panel');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminModalOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('portal', 'admin');
    window.history.pushState({}, '', url.toString());
    setActivePage('admin_panel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToPublicHome = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    url.searchParams.delete('admin');
    url.searchParams.delete('quiz');
    url.searchParams.delete('comp');
    window.history.pushState({}, '', url.pathname);
    setSelectedQuizSlug(undefined);
    setActivePage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F0F7FB] dark:bg-[#0B1321] text-[#102B4C] dark:text-[#F1F5F9] flex flex-col font-sans bg-grid-pattern transition-colors" dir="rtl">
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'home') handleBackToPublicHome();
          else setActivePage(page);
        }}
        currentTeacher={currentTeacher}
        onOpenTeacherLogin={() => setIsTeacherModalOpen(true)}
        onLogoutTeacher={handleTeacherLogout}
        onOpenAdmin={handleOpenAdmin}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-7 sm:py-9">
        {activePage === 'home' && (
          <HomeView
            competitions={competitions}
            currentTeacher={currentTeacher}
            onOpenCompetition={handleOpenCompetition}
            onTeacherLoginSuccess={handleTeacherLoginSuccess}
            onGoToTeacherDashboard={() => setActivePage('teacher_dashboard')}
          />
        )}

        {activePage === 'student_quiz' && (
          <StudentQuizView
            initialCompetitionIdOrSlug={selectedQuizSlug}
            onBackToHome={handleBackToPublicHome}
          />
        )}

        {activePage === 'teacher_dashboard' && (
          currentTeacher ? (
            <TeacherDashboard
              currentTeacher={currentTeacher}
              onLogout={handleTeacherLogout}
              onOpenStudentView={handleOpenCompetition}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-white dark:bg-[#142238] rounded-3xl border border-slate-200 dark:border-slate-700/80 p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-teal-50 dark:bg-teal-950/60 text-[#009BB0] dark:text-[#00B4D8] rounded-2xl flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-[#102B4C] dark:text-[#F1F5F9]">يلزم إدخال كود المعلم</h2>
              <p className="text-sm text-[#5A6E85] dark:text-[#94A3B8]">
                يرجى إدخال رمز المعلم الخاص بك للوصول للوحة وإصدار الشهادات.
              </p>
              <button
                onClick={() => {
                  setActivePage('home');
                  window.dispatchEvent(new CustomEvent('switch_home_tab', { detail: 'teacher' }));
                }}
                className="w-full py-3.5 bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white rounded-2xl text-sm font-bold shadow-md shadow-[#009BB0]/20 cursor-pointer transition-colors"
              >
                إدخال كود المعلم في الصفحة الرئيسية
              </button>
            </div>
          )
        )}

        {activePage === 'admin_panel' && (
          <AdminPanel
            onBackToHome={handleBackToPublicHome}
            onLoginAsTeacher={handleLoginAsTeacherCode}
          />
        )}
      </main>

      <footer className="bg-[#102B4C] dark:bg-[#08111D] text-[#F1F5F9] border-t border-[#1C3B61] dark:border-slate-900 py-10 mt-auto" dir="rtl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3 font-black text-[#F1F5F9]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#009BB0] text-white shadow-sm">
              <Trophy className="size-5" />
            </span>
            <span className="text-xl tracking-tight">تَنافُسْ</span>
          </div>

          <a
            href="https://sabir511-platform.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer group"
            title="الانتقال إلى منصة العلوم والتقنية للجميع"
          >
            <img
              src="/platform-logo.png"
              alt="منصة العلوم والتقنية للجميع"
              className="size-6 rounded-full object-contain bg-white/10 p-0.5"
            />
            <span>منصة العلوم والتقنية للجميع</span>
            <ExternalLink className="size-3.5 text-[#00B4D8] group-hover:scale-110 transition-transform" />
          </a>

          <div className="flex items-center gap-4 text-sm font-bold">
            <button
              onClick={() => setIsTeacherModalOpen(true)}
              className="text-[#00B4D8] hover:text-[#22D3EE] transition-colors cursor-pointer"
            >
              دخول مساحة المعلم
            </button>

            {/* Discreet administration access - hidden from public eye */}
            <button
              onClick={handleOpenAdmin}
              className="text-slate-400 hover:text-white transition-opacity opacity-40 hover:opacity-100 cursor-pointer p-1.5 rounded-lg"
              title="إدارة النظام (Alt+A)"
              aria-label="إدارة النظام"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      <TeacherAccessModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSuccess={handleTeacherLoginSuccess}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />
    </div>
  );
}
