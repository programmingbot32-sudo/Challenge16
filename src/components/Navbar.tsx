import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  LogOut,
  Moon,
  Sun,
  Trophy,
  UserCheck,
  Shield,
  BookOpen
} from 'lucide-react';
import { AccessCode } from '../types';
import { StorageService } from '../services/storageService';

export type ActivePage = 'home' | 'student_quiz' | 'teacher_dashboard' | 'admin_panel';

interface NavbarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  currentTeacher: AccessCode | null;
  onOpenTeacherLogin: () => void;
  onLogoutTeacher: () => void;
  onOpenAdmin?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  currentTeacher,
  onOpenTeacherLogin,
  onLogoutTeacher,
  onOpenAdmin,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => setIsAdminAuth(StorageService.isAdminAuthenticated());
    checkAuth();
    window.addEventListener('storage_update', checkAuth);
    return () => window.removeEventListener('storage_update', checkAuth);
  }, []);

  const scrollToCompetitions = () => {
    if (activePage !== 'home') {
      setActivePage('home');
      setTimeout(() => {
        document.getElementById('competitions')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('competitions')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0B1120]/95 transition-colors" dir="rtl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        
        {/* Brand Logo */}
        <button
          onClick={() => setActivePage('home')}
          className="group flex items-center gap-3 text-right cursor-pointer"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#009BB0] text-white shadow-md shadow-[#009BB0]/25 transition-transform group-hover:scale-105">
            <Trophy className="h-6 w-6" />
          </span>
          <div>
            <span className="block text-2xl font-black tracking-tight text-[#102B4C] dark:text-[#F1F5F9]">
              تَنافُسْ
            </span>
          </div>
        </button>

        {/* Center Nav Links - Larger, clear fonts */}
        <nav className="hidden md:flex items-center gap-7 text-sm sm:text-base font-bold text-[#5A6E85] dark:text-[#94A3B8]">
          <button
            onClick={() => setActivePage('home')}
            className={`transition-colors hover:text-[#009BB0] dark:hover:text-[#00B4D8] cursor-pointer ${
              activePage === 'home' ? 'text-[#009BB0] dark:text-[#00B4D8] font-black' : ''
            }`}
          >
            الصفحة الرئيسية
          </button>

          <button
            onClick={scrollToCompetitions}
            className="transition-colors hover:text-[#009BB0] dark:hover:text-[#00B4D8] cursor-pointer"
          >
            المسابقات
          </button>

          <button
            onClick={() => {
              if (currentTeacher) {
                setActivePage('teacher_dashboard');
              } else {
                onOpenTeacherLogin();
              }
            }}
            className={`transition-colors hover:text-[#009BB0] dark:hover:text-[#00B4D8] cursor-pointer ${
              activePage === 'teacher_dashboard' ? 'text-[#009BB0] dark:text-[#00B4D8] font-black' : ''
            }`}
          >
            مساحة المعلم
          </button>

          {isAdminAuth && (
            <button
              onClick={() => {
                if (onOpenAdmin) onOpenAdmin();
                else setActivePage('admin_panel');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                activePage === 'admin_panel'
                  ? 'bg-[#009BB0] text-white border-[#009BB0]'
                  : 'bg-teal-50 dark:bg-slate-800 border-teal-200 dark:border-slate-700 text-[#009BB0] dark:text-[#00B4D8] hover:bg-teal-100 dark:hover:bg-slate-700'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>لوحة الإدارة</span>
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              aria-label="تبديل الوضع الليلي"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6E85] hover:bg-teal-50 dark:text-[#94A3B8] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="h-5 w-5 text-[#D98218]" /> : <Moon className="h-5 w-5" />}
            </button>
          )}

          {isAdminAuth && (
            <button
              onClick={() => {
                if (onOpenAdmin) onOpenAdmin();
                else setActivePage('admin_panel');
              }}
              title="لوحة الإدارة"
              className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-teal-200 bg-teal-50 text-[#009BB0] dark:border-slate-700 dark:bg-slate-800 dark:text-[#00B4D8] transition-all cursor-pointer"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}

          {currentTeacher ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <UserCheck className="h-4 w-4" />
                {currentTeacher.teacherDisplayName || 'المعلم'}
              </span>
              <button
                onClick={() => setActivePage('teacher_dashboard')}
                className="rounded-xl bg-[#009BB0] hover:bg-[#008496] px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
              >
                لوحتي
              </button>
              <button
                onClick={onLogoutTeacher}
                aria-label="تسجيل الخروج"
                className="p-1.5 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenTeacherLogin}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#009BB0] hover:bg-[#008496] dark:bg-[#00B4D8] dark:hover:bg-[#009BB0] dark:text-[#0B1321] text-white px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#009BB0]/20 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>دخول المعلم</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
