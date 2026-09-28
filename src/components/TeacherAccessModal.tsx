import React, { useState, useEffect } from 'react';
import { KeyRound, AlertCircle, X, ArrowLeft, CheckCircle2, User, School, GraduationCap } from 'lucide-react';
import { AccessCode } from '../types';
import { StorageService } from '../services/storageService';

interface TeacherAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacher: AccessCode) => void;
}

export const TeacherAccessModal: React.FC<TeacherAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [codeStr, setCodeStr] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const [step, setStep] = useState<'code' | 'profile'>('code');
  const [validatedCodeObj, setValidatedCodeObj] = useState<AccessCode | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [school, setSchool] = useState('');

  useEffect(() => {
    const rateState = StorageService.getRateLimitState();
    const now = Date.now();
    if (rateState.lockedUntil > now) {
      setIsLocked(true);
      setLockCountdown(Math.ceil((rateState.lockedUntil - now) / 1000));
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any = null;
    if (isLocked && lockCountdown > 0) {
      timer = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLocked, lockCountdown]);

  if (!isOpen) return null;

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = codeStr.trim();
    if (!clean) {
      setErrorMsg('أدخل رمز الوصول الخاص بك للمتابعة.');
      return;
    }

    const res = StorageService.verifyAccessCode(clean);

    if (res.isLocked) {
      setIsLocked(true);
      setLockCountdown(res.remainingSeconds || 120);
      setErrorMsg(res.message);
      return;
    }

    if (!res.valid || !res.codeObj) {
      setErrorMsg(res.message || 'رمز الدخول غير صالح.');
      return;
    }

    if (res.needsProfileSetup) {
      setValidatedCodeObj(res.codeObj);
      setStep('profile');
    } else {
      onSuccess(res.codeObj);
      onClose();
      setCodeStr('');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('يرجى كتابة اسم المعلم الكريم.');
      return;
    }

    if (!validatedCodeObj) return;

    const updated = StorageService.updateTeacherProfile(
      validatedCodeObj.code,
      displayName,
      school.trim() || 'المملكة العربية السعودية'
    );

    if (updated) {
      onSuccess(updated);
      onClose();
      setCodeStr('');
      setStep('code');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0C2340]/70 backdrop-blur-sm flex items-center justify-center p-4 transition-all" dir="rtl">
      <div className="bg-white dark:bg-[#0F223D] border border-slate-200 dark:border-[#1E3A5F] rounded-[2.5rem] max-w-md w-full p-7 sm:p-10 shadow-2xl relative animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 p-2.5 text-[#4A607A] hover:text-[#0C2340] dark:hover:text-white rounded-2xl hover:bg-[#E6F7FA] dark:hover:bg-[#132B4A] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'code' ? (
          <div className="space-y-7">
            
            {/* Header Icon + Title */}
            <div className="text-right space-y-2.5">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-[#E6F7FA] dark:bg-[#132B4A] border border-[#00A3C4]/30 text-[#00A3C4] dark:text-[#00C2E8]">
                <GraduationCap className="size-7" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-[#F1F5F9]">
                دخول مساحة المعلم
              </h2>
              <p className="text-sm sm:text-base text-[#4A607A] dark:text-[#94A3B8]">
                أدخل رمز الوصول الخاص بك لإدارة المسابقات والشهادات.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={codeStr}
                  onChange={(e) => {
                    setCodeStr(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  aria-label="رمز دخول المعلم"
                  className="w-full h-14 px-4 bg-[#F0F6FB] dark:bg-[#081426] border border-slate-200 dark:border-[#1E3A5F] rounded-2xl font-mono text-center text-base sm:text-lg font-bold tracking-widest text-[#0C2340] dark:text-[#F1F5F9] focus:outline-none focus:border-[#00A3C4] focus:ring-2 focus:ring-[#00A3C4]/20 transition-all disabled:opacity-50"
                />
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm text-rose-800 dark:text-rose-300 flex items-start gap-2.5 font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isLocked && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm text-[#D49226] dark:text-[#FBBF24] text-center font-bold">
                  تم التجميد المؤقت: متبقي {lockCountdown} ثانية.
                </div>
              )}

              <button
                type="submit"
                disabled={isLocked}
                className="w-full h-14 bg-[#00A3C4] hover:bg-[#008EA8] dark:bg-[#00C2E8] dark:hover:bg-[#00A3C4] dark:text-[#081426] text-white rounded-2xl text-base font-black shadow-lg shadow-[#00A3C4]/25 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
              >
                <span>متابعة</span>
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Trial Experience Option: مكتبة المعلمين */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setCodeStr('مكتبة المعلمين');
                    const res = StorageService.verifyAccessCode('مكتبة المعلمين');
                    if (res.isLocked) {
                      setIsLocked(true);
                      setLockCountdown(res.remainingSeconds || 120);
                      setErrorMsg(res.message);
                      return;
                    }
                    if (!res.valid || !res.codeObj) {
                      setErrorMsg(res.message || 'التجربة المفتوحة متوقفة حاليا تواصل مع المسئول للحصول على كود تفعيل المعلم');
                      return;
                    }
                    onSuccess(res.codeObj);
                    onClose();
                    setCodeStr('');
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 border border-[#009BB0]/30 text-[#009BB0] dark:text-[#00B4D8] text-sm font-black flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#009BB0] text-white text-xs font-black shadow-sm">
                      مجاني
                    </span>
                    <span>كود التجربة المفتوح: مكتبة المعلمين</span>
                  </div>
                  <span className="text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8] group-hover:text-[#009BB0] dark:group-hover:text-[#00B4D8] flex items-center gap-1">
                    <span>تجربة مباشرة</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </form>

          </div>
        ) : (
          <div className="space-y-7">
            <div className="text-right space-y-2.5">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] dark:text-[#34D399]">
                <CheckCircle2 className="size-7" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0C2340] dark:text-[#F1F5F9]">
                إعداد الملف الشخصي
              </h2>
              <p className="text-sm sm:text-base text-[#4A607A] dark:text-[#94A3B8]">
                سجل اسمك ليظهر على المسابقات والشهادات الممنوحة للطلاب.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="block text-sm sm:text-base font-black text-[#0C2340] dark:text-[#F1F5F9] mb-2">
                  اسم المعلم *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="أ. فهد بن عبدالعزيز السبيعي"
                    className="w-full h-14 pr-12 pl-4 bg-[#F0F6FB] dark:bg-[#081426] border border-slate-200 dark:border-[#1E3A5F] rounded-2xl text-base font-bold text-[#0C2340] dark:text-[#F1F5F9] focus:outline-none focus:border-[#00A3C4]"
                  />
                  <User className="w-5 h-5 text-[#4A607A] absolute right-4 top-4.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-black text-[#0C2340] dark:text-[#F1F5F9] mb-2">
                  المدرسة / الجهة التعليمية
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="ثانوية الأمير نايف بالرياض"
                    className="w-full h-14 pr-12 pl-4 bg-[#F0F6FB] dark:bg-[#081426] border border-slate-200 dark:border-[#1E3A5F] rounded-2xl text-base font-bold text-[#0C2340] dark:text-[#F1F5F9] focus:outline-none focus:border-[#00A3C4]"
                  />
                  <School className="w-5 h-5 text-[#4A607A] absolute right-4 top-4.5" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-rose-600 font-bold">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full h-14 bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] dark:text-[#0B1120] text-white rounded-2xl text-base font-black shadow-lg shadow-[#0EA5E9]/20 cursor-pointer transition-all flex items-center justify-center gap-2.5"
              >
                <span>حفظ والبدء</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
