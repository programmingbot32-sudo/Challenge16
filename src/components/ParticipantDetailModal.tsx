import React from 'react';
import { X, Award, CheckCircle2, XCircle, Clock, Calendar, School, Trophy, Printer } from 'lucide-react';
import { ParticipantResult, Competition } from '../types';

interface ParticipantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ParticipantResult | null;
  competition?: Competition;
  onOpenCertificate: (participant: ParticipantResult) => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  isOpen,
  onClose,
  participant,
  competition,
  onOpenCertificate,
}) => {
  if (!isOpen || !participant) return null;

  const questions = competition?.questions || [];
  const answers = participant.answers || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F172A]/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4] shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <span>{participant.name}</span>
                {participant.rank && (
                  <span className="text-xs bg-[#06B6D4]/15 text-[#06B6D4] px-2.5 py-0.5 rounded-full font-black border border-[#06B6D4]/30">
                    المركز #{participant.rank}
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                تفاصيل أداء المتسابق في «{participant.competitionName || competition?.name || 'المسابقة'}»
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenCertificate(participant)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06B6D4] hover:bg-[#0284C7] text-white text-xs font-black shadow-sm cursor-pointer transition-all"
            >
              <Award className="w-4 h-4" />
              <span>إصدار شهادة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white rounded-xl hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick summary cards */}
        {(() => {
          const totalQ = participant.totalQuestions || questions.length || 1;
          const pct = Math.round((participant.correctAnswers / totalQ) * 100);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-bold block">النسبة المئوية</span>
                <span className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9] mt-1 block font-mono">
                  {pct}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-bold block">الإجابات الصحيحة</span>
                <span className="text-xl sm:text-2xl font-black text-[#1f7349] dark:text-[#6ee7b7] mt-1 block">
                  {participant.correctAnswers} / {totalQ}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-bold block">الوقت المستغرق</span>
                <span className="text-xl sm:text-2xl font-black text-[#06B6D4] mt-1 block">
                  {participant.totalTimeSeconds.toFixed(1)} ث
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-bold block">المدرسة / الجهة</span>
                <span className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mt-1.5 block truncate" title={participant.school}>
                  {participant.school || 'غير محدد'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Questions & Answers breakdown */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] mb-3">
            سجل إجابات المتسابق على الأسئلة ({answers.length || questions.length})
          </h3>

          {questions.length > 0 ? (
            questions.map((q, idx) => {
              const ans = answers.find(a => a.questionId === q.id);
              const isCorrect = ans ? ans.isCorrect : false;
              const hasAnswered = !!ans;
              const selectedOption = ans !== undefined && q.options[ans.selectedIndex] !== undefined 
                ? q.options[ans.selectedIndex] 
                : 'لم يتم الإجابة';
              const correctOption = q.options[q.correctIndex] || 'غير محدد';

              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    !hasAnswered
                      ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                      : isCorrect
                      ? 'bg-[#edf7f1]/70 dark:bg-[#1a3324]/40 border-[#a3e6b9]/60 dark:border-[#2d5c3f]'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[#0F172A] dark:text-[#F1F5F9]">
                          س {idx + 1}
                        </span>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">{q.text}</p>
                      </div>

                      <div className="text-xs space-y-1 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748B] dark:text-[#94A3B8]">إجابة الطالب:</span>
                          <span className={`font-bold ${isCorrect ? 'text-[#1f7349] dark:text-[#6ee7b7]' : 'text-rose-700 dark:text-rose-400'}`}>
                            {selectedOption}
                          </span>
                        </div>

                        {!isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-[#64748B] dark:text-[#94A3B8]">الإجابة الصحيحة:</span>
                            <span className="font-bold text-[#1f7349] dark:text-[#6ee7b7]">
                              {correctOption}
                            </span>
                          </div>
                        )}

                        {q.explanation && (
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                            💡 التوضيح: {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-black text-[#1f7349] dark:text-[#6ee7b7]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>صحيحة</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400">
                          <XCircle className="w-4 h-4" />
                          <span>خاطئة</span>
                        </span>
                      )}

                      {ans && (
                        <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{ans.timeTaken.toFixed(1)} ث</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-6 text-sm text-[#64748B] dark:text-[#94A3B8]">
              تفاصيل أسئلة المسابقة غير متوفرة حالياً
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              تاريخ الإرسال: {participant.submittedAt ? new Date(participant.submittedAt).toLocaleString('ar-SA') : 'مكتمل'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[slate-200]/40 cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
