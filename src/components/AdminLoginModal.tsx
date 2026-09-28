import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, X, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password.trim()) {
      setErrorMsg('يرجى إدخال كلمة مرور المشرف العام.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await StorageService.verifyAdminPasswordAsync(password, remember);
      if (result.valid) {
        setPassword('');
        setErrorMsg(null);
        onSuccess();
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('حدث خطأ في الاتصال بالخادم، يرجى المحاولة ثانية.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#0F223D] border border-slate-200 dark:border-[#1E3A5F] rounded-[2.5rem] max-w-md w-full p-7 sm:p-9 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 p-2.5 text-[#4A607A] hover:text-[#0C2340] dark:hover:text-white rounded-2xl hover:bg-[#E6F7FA] dark:hover:bg-[#132B4A] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-3xl bg-[#E6F7FA] dark:bg-[#132B4A] border border-[#00A3C4]/30 flex items-center justify-center text-[#00A3C4] dark:text-[#00C2E8] mx-auto shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-[#0C2340] dark:text-[#F1F5F9]">
            بوابة الإدارة المركزية
          </h2>
          <p className="text-xs sm:text-sm text-[#4A607A] dark:text-[#94A3B8]">
            منطقة مخصصة لمشرفي منصة تَنافُسْ فقط
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-black text-[#0C2340] dark:text-[#F1F5F9] mb-2">
              كلمة مرور المشرف العام
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="أدخل كلمة مرور الإدارة..."
                autoFocus
                className="w-full h-13 pr-11 pl-11 bg-[#F0F6FB] dark:bg-[#081426] border border-slate-200 dark:border-[#1E3A5F] rounded-2xl text-sm sm:text-base font-bold text-[#0C2340] dark:text-[#F1F5F9] focus:outline-none focus:border-[#00A3C4] transition-colors text-left font-mono"
              />
              <Lock className="w-5 h-5 text-[#4A607A] absolute right-3.5 top-4 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-4 text-[#4A607A] hover:text-[#0C2340] dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#4A607A] dark:text-[#94A3B8]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-300 text-[#00A3C4] focus:ring-[#00A3C4]"
              />
              <span>تذكر الجلسة على هذا المتصفح</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full h-13 bg-[#00A3C4] hover:bg-[#008EA8] dark:bg-[#00C2E8] dark:hover:bg-[#00A3C4] dark:text-[#081426] disabled:opacity-70 text-white rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-lg shadow-[#00A3C4]/25 cursor-pointer transition-all active:scale-98"
            >
              <span>{isVerifying ? 'جارٍ التحقق...' : 'تسجيل الدخول للوحة التحكم'}</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#1E3A5F] text-center">
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-bold text-[#4A607A] hover:text-[#00A3C4] dark:hover:text-[#00C2E8] cursor-pointer"
          >
            إلغاء والعودة للمنصة العامة
          </button>
        </div>
      </div>
    </div>
  );
};
