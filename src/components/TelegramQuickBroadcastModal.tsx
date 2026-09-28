import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bell, 
  Trophy, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar,
  Sparkles,
  Users,
  Eye,
  Check
} from 'lucide-react';
import { Competition, TelegramGroupItem } from '../types';
import { TelegramService } from '../services/telegramService';
import { StorageService } from '../services/storageService';
import { formatArabicDateTime } from '../services/dateUtils';
import { TelegramGroupSelector } from './TelegramGroupSelector';

interface TelegramQuickBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition | null;
  initialType?: 'announcement' | 'start' | 'results';
  onNotify: (msg: string) => void;
  onCompetitionUpdated?: (updatedComp: Competition) => void;
}

export const TelegramQuickBroadcastModal: React.FC<TelegramQuickBroadcastModalProps> = ({
  isOpen,
  onClose,
  competition,
  initialType = 'announcement',
  onNotify,
  onCompetitionUpdated
}) => {
  const [broadcastType, setBroadcastType] = useState<'announcement' | 'start' | 'results'>(initialType);
  const [groupsList, setGroupsList] = useState<TelegramGroupItem[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveAsDefaultTarget, setSaveAsDefaultTarget] = useState(true);

  useEffect(() => {
    if (isOpen && competition) {
      setBroadcastType(initialType);
      setFeedback(null);
      setIsSending(false);

      const allGroups = TelegramService.getGroupsList();
      setGroupsList(allGroups);

      TelegramService.fetchSettingsFromServer().then(remote => {
        if (remote) {
          const fresh = TelegramService.getGroupsList();
          setGroupsList(fresh);
        }
      });

      // Pre-select target groups from competition or default to all
      const compGroups = Array.isArray(competition.targetTelegramGroups) && competition.targetTelegramGroups.length > 0
        ? competition.targetTelegramGroups
        : [];

      if (compGroups.length > 0) {
        setSelectedGroupIds(compGroups);
        setSendToAll(false);
      } else {
        setSelectedGroupIds(allGroups.map(g => g.id));
        setSendToAll(true);
      }
    }
  }, [isOpen, competition, initialType]);

  if (!isOpen || !competition) return null;

  const isOpenTraining = competition.competitionType === 'open';

  // Calculate final groups array
  const effectiveGroupIds = sendToAll
    ? groupsList.map(g => g.id)
    : selectedGroupIds;

  const cleanTargetGroups = effectiveGroupIds.filter(id => id && !id.includes('1234567890'));

  const handleExecuteBroadcast = async () => {
    if (cleanTargetGroups.length === 0) {
      setFeedback({ type: 'error', message: 'يرجى تحديد جروب واحد على الأقل للإرسال إليه.' });
      return;
    }

    const settings = TelegramService.getSettings();
    if (!settings.botToken) {
      setFeedback({ type: 'error', message: 'لم يتم ضبط رمز البوت (Bot Token) في إعدادات المنصة بعد.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      let res: { success: boolean; sentCount: number; errors: string[] };

      if (broadcastType === 'announcement') {
        res = await TelegramService.broadcastCompetition(competition, cleanTargetGroups);
      } else if (broadcastType === 'start') {
        res = await TelegramService.broadcastCompetitionStart(competition, cleanTargetGroups);
      } else {
        res = await TelegramService.broadcastLeaderboard(competition, cleanTargetGroups);
      }

      setIsSending(false);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `تم بنجاح إرسال البث إلى ${res.sentCount} جروب تليجرام محدد بنجاح!`
        });

        // Optionally update competition target groups
        if (saveAsDefaultTarget && onCompetitionUpdated) {
          const updated: Competition = {
            ...competition,
            targetTelegramGroups: sendToAll ? undefined : selectedGroupIds
          };
          StorageService.saveCompetition(updated);
          onCompetitionUpdated(updated);
        }

        onNotify(`تم إرسال بث تليجرام إلى ${res.sentCount} جروب`);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setFeedback({
          type: 'error',
          message: res.errors.length > 0 ? res.errors.join(' | ') : 'تعذر إرسال البث لجروبات تليجرام.'
        });
      }
    } catch (err: any) {
      setIsSending(false);
      setFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0EA5E9] flex items-center justify-center font-bold shadow-xs">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                بث فوري إلى جروبات تليجرام
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                حدد نوع البث واختر الجروبات المستهدفة بالاسم أو أرسل للجميع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#64748B] hover:text-[#0EA5E9] dark:hover:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Competition Quick Badge */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0284C7] dark:bg-sky-950 dark:text-sky-300">
                {competition.competitionType === 'open' ? 'تدريب مفتوح' : competition.competitionType === 'windowed' ? 'فترة محددة' : 'مباشرة (Live)'}
              </span>
              <h4 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {competition.name}
              </h4>
            </div>
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-3">
              <span>📝 {competition.questions.length} أسئلة</span>
              <span>•</span>
              <span>⏱️ {competition.questionDuration || 30} ثانية للسؤال</span>
              <span>•</span>
              <span>🏆 {competition.rewardType || 'شهادة تميز'}</span>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">المستهدفون الافتراضيون:</span>
            <span className="text-xs font-black text-sky-600 dark:text-sky-400">
              {competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0
                ? `${competition.targetTelegramGroups.length} جروب مخصص`
                : `جميع الجروبات (${groupsList.length})`}
            </span>
          </div>
        </div>

        {/* Broadcast Type Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
            اختر نوع الرسالة والإشعار للبث:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setBroadcastType('announcement')}
              className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                broadcastType === 'announcement'
                  ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0EA5E9] text-sky-950 dark:text-sky-200 ring-2 ring-[#0EA5E9]/25 shadow-xs'
                  : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300'
              }`}
            >
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900 text-[#0284C7] dark:text-sky-300 shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black">📢 إعلان المسابقة</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">بطاقة التحدي ورابط البدء المباشر</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isOpenTraining}
              onClick={() => setBroadcastType('start')}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                isOpenTraining
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : broadcastType === 'start'
                  ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-500 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/25 shadow-xs cursor-pointer'
                  : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300 cursor-pointer'
              }`}
            >
              <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black">🔔 تنبيه انطلاق المسابقة</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">إشعار حماسي ببدء التحدي الآن</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isOpenTraining}
              onClick={() => setBroadcastType('results')}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                isOpenTraining
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : broadcastType === 'results'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/25 shadow-xs cursor-pointer'
                  : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300 cursor-pointer'
              }`}
            >
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black">🏆 لوحة الشرف والنتائج</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">أسماء الفائزين والمراكز الأولى</div>
              </div>
            </button>
          </div>
        </div>

        {/* Group Selector Component */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#142238] border border-slate-200 dark:border-slate-700">
          <TelegramGroupSelector
            groups={groupsList}
            selectedGroupIds={selectedGroupIds}
            onChange={setSelectedGroupIds}
            sendToAll={sendToAll}
            onSendToAllChange={setSendToAll}
            title="تحديد الجروبات المستهدفة للبث الحالي"
            subtitle="حدد الجروبات أو المدارس التي تريد إرسال هذا الإشعار إليها"
            compact={true}
          />
        </div>

        {/* Save as default preference checkbox */}
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsDefaultTarget}
            onChange={(e) => setSaveAsDefaultTarget(e.target.checked)}
            className="w-4 h-4 accent-[#0EA5E9] rounded cursor-pointer"
          />
          <span>اعتماد هذه الجروبات كإعداد افتراضي دائم لهذه المسابقة</span>
        </label>

        {/* Feedback message */}
        {feedback && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleExecuteBroadcast}
            disabled={isSending || cleanTargetGroups.length === 0}
            className="px-6 py-3.5 rounded-2xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-sky-500/25 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري البث والإرسال عبر تليجرام...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  إرسال البث الآن إلى ({cleanTargetGroups.length}) {cleanTargetGroups.length === 1 ? 'جروب' : 'جروبات'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
