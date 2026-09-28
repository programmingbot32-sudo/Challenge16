import React, { useMemo } from 'react';
import { 
  Award, 
  Printer, 
  X, 
  Download,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { ExportService, CertificateData } from '../services/exportService';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  teacherName?: string;
  schoolName?: string;
  competitionTitle: string;
  score?: number;
  rank?: number;
  isManual?: boolean;
  reason?: string;
  dateStr?: string;
  teamName?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  studentName,
  teacherName,
  schoolName,
  competitionTitle,
  score,
  rank,
  isManual = false,
  reason,
  dateStr,
  teamName,
}) => {
  if (!isOpen) return null;

  const displayDate = dateStr || new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const cleanTeacher = teacherName && teacherName.trim() && teacherName !== 'معلم المنصة' ? teacherName.trim() : '';
  const cleanSchool = schoolName && schoolName.trim() && schoolName !== 'المملكة العربية السعودية' ? schoolName.trim() : (schoolName?.trim() || '');

  const certData: CertificateData = useMemo(() => ({
    studentName,
    teacherName: cleanTeacher,
    schoolName: cleanSchool,
    competitionTitle,
    score,
    rank,
    isManual,
    reason,
    dateStr: displayDate,
    teamName,
  }), [studentName, cleanTeacher, cleanSchool, competitionTitle, score, rank, isManual, reason, displayDate, teamName]);

  const handlePrint = () => {
    ExportService.printCertificateHTML(certData);
  };

  const handleDownloadImage = () => {
    ExportService.downloadCertificateImage(certData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0C2340]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-[#0C2340] border border-[#00A3C4]/30 rounded-[2.5rem] max-w-4xl w-full p-4 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E3A5F] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#E6F7FA] border border-[#00A3C4]/30 flex items-center justify-center text-[#00A3C4] shadow-sm shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#F1F5F9] flex items-center gap-2">
                <span>شهادة شكر وتقدير</span>
                <span className="text-[11px] bg-[#00A3C4]/20 text-[#00C2E8] px-2.5 py-0.5 rounded-full border border-[#00A3C4]/30 font-bold">
                  مكتبة المعلمين
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8] hidden sm:block">
                تصميم منظم وأنيق مجهز للطباعة والحفظ بجودة فائقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="hidden sm:flex items-center gap-1.5 bg-[#132B4A] hover:bg-[#1A3B63] text-[#00C2E8] border border-[#00A3C4]/30 font-black text-xs px-3.5 py-2 rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-[#00C2E8]" />
              <span>حفظ صورة PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#00A3C4] hover:bg-[#008EA8] text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-[#00A3C4]/25 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>طباعة / حفظ PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#132B4A] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Card View - Perfectly Organized HTML Layout */}
        <div className="bg-[#FAF8F2] rounded-2xl p-6 sm:p-10 border-4 border-[#C5A059] shadow-2xl relative text-slate-900 select-none overflow-hidden">
          
          {/* Inner Golden Dashed Frame */}
          <div className="absolute inset-2 sm:inset-3 border border-[#D4AF37]/60 border-dashed rounded-xl pointer-events-none" />

          {/* Corner Decorative Elements */}
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#C5A059] pointer-events-none" />
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#C5A059] pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#C5A059] pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#C5A059] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-between text-center space-y-4 sm:space-y-5">
            
            {/* 1. Header Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FFFDF5] border border-[#D4AF37]/60 text-[#8C6D1F] px-4 py-1 rounded-full text-xs font-black tracking-wide shadow-xs">
              <BookOpen className="w-3.5 h-3.5 text-[#B48A28]" />
              <span>مكتبة المعلمين  •  منصة تَنافُسْ</span>
            </div>

            {/* 2. Main Title */}
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-[#0C2340] font-serif tracking-tight">
                شَهَادَةُ شُكْرٍ وَتَقْدِيـرٍ
              </h1>
              <div className="w-24 sm:w-32 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mt-2" />
            </div>

            {/* 3. Intro Phrase */}
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              تَسُرُّنا الإشادة بالتميز والإبداع، ومَنْح هذه الشهادة لـ:
            </p>

            {/* 4. Student Name */}
            <div className="py-1">
              <span className="text-2xl sm:text-4xl font-black text-[#0C2340] font-serif tracking-wide border-b-2 border-[#D4AF37] pb-1 px-8 sm:px-12 inline-block">
                {studentName || 'اسم المشارك'}
              </span>
              {cleanSchool && (
                <div className="text-xs text-slate-500 font-bold mt-1.5 flex items-center justify-center gap-1">
                  <span>🏫</span>
                  <span>{cleanSchool}</span>
                </div>
              )}
            </div>

            {/* 5. Concise Reason / Competition */}
            <div className="max-w-xl mx-auto text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              {isManual ? (
                <>تقديراً للمشاركة الفاعلة والجهد المتميز في <strong className="text-[#0C2340] font-bold">{reason || competitionTitle}</strong>.</>
              ) : (
                <>
                  تقديراً للتفوق والأداء الرائع في مسابقة:
                  <div className="text-sm sm:text-base font-bold text-[#0C2340] mt-1">{competitionTitle}</div>
                </>
              )}
            </div>

            {/* 6. Score & Rank Badges */}
            {!isManual && (score !== undefined || rank !== undefined || teamName) && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {score !== undefined && (
                  <div className="bg-[#FFFDF5] border border-[#D4AF37]/50 text-[#8C6D1F] px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
                    النتيجة: {score}%
                  </div>
                )}
                {rank && (
                  <div className="bg-[#FFFDF5] border border-[#D4AF37]/50 text-[#8C6D1F] px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
                    المركز: #{rank}
                  </div>
                )}
                {teamName && (
                  <div className="bg-[#FFFDF5] border border-[#D4AF37]/50 text-[#8C6D1F] px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
                    الفريق: {teamName}
                  </div>
                )}
              </div>
            )}

            {/* 7. Footer Signatures & Emblem */}
            <div className="w-full pt-4 sm:pt-5 border-t border-[#D4AF37]/30 flex items-center justify-between px-2 sm:px-6">
              
              {/* Teacher Signature */}
              <div className="text-right space-y-0.5 min-w-[90px] sm:min-w-[120px]">
                <div className="text-[11px] text-slate-500 font-bold">
                  {cleanTeacher ? 'المعلم' : 'الإشراف العام'}
                </div>
                <div className="text-xs sm:text-sm font-black text-[#0C2340]">
                  {cleanTeacher || 'منصة تَنافُسْ'}
                </div>
              </div>

              {/* Gold Emblem in Center */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#D4AF37] bg-[#FFFBF0] flex flex-col items-center justify-center text-[#8C6D1F] shadow-xs">
                <Sparkles className="w-4 h-4 text-[#B48A28]" />
                <span className="text-[8px] font-black leading-tight mt-0.5 text-center">
                  مكتبة<br/>المعلمين
                </span>
              </div>

              {/* Date */}
              <div className="text-left space-y-0.5 min-w-[90px] sm:min-w-[120px]">
                <div className="text-[11px] text-slate-500 font-bold">التاريخ</div>
                <div className="text-xs sm:text-sm font-black text-[#0C2340]">
                  {displayDate}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Action Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-[#1E3A5F]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#132B4A] text-[#94A3B8] hover:text-white font-bold text-sm cursor-pointer transition-colors"
          >
            إغلاق
          </button>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#132B4A] hover:bg-[#1A3B63] text-[#00C2E8] border border-[#00A3C4]/30 font-black text-xs sm:text-sm cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-[#00C2E8]" />
              <span>تحميل صورة PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A3C4] hover:bg-[#008EA8] text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>طباعة الشهادة (PDF)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
