import React, { useState } from 'react';
import { 
  Send, 
  X, 
  Zap, 
  Trophy, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Eye, 
  Sparkles,
  Bot
} from 'lucide-react';
import { Competition, TelegramBotSettings } from '../types';
import { TelegramService } from '../services/telegramService';
import { TelegramGroupSelector } from './TelegramGroupSelector';
import { formatArabicDateTime } from '../services/dateUtils';

interface TelegramBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition;
  onSuccessNotice?: (msg: string) => void;
}

export const TelegramBroadcastModal: React.FC<TelegramBroadcastModalProps> = ({
  isOpen,
  onClose,
  competition,
  onSuccessNotice
}) => {
  const [settings] = useState<TelegramBotSettings>(() => TelegramService.getSettings());
  
  // Available groups
  const groups = settings.groupsList && settings.groupsList.length > 0 
    ? settings.groupsList 
    : settings.targetGroups.map(id => ({ id, name: `جروب (${id.slice(-6)})`, category: 'عام' }));

  // Pre-select competition's custom groups if defined, otherwise all
  const [sendToAll, setSendToAll] = useState<boolean>(() => {
    return !(competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0);
  });

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() => {
    if (competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0) {
      return competition.targetTelegramGroups;
    }
    return groups.map(g => g.id);
  });

  const [actionType, setActionType] = useState<'announcement' | 'start' | 'results'>('announcement');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [resultFeedback, setResultFeedback] = useState<{
    success: boolean;
    sentCount: number;
    errors: string[];
    sentGroupsNames?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const isOpenTraining = competition.competitionType === 'open';

  // Compute final targeted groups
  const targetedGroupIds = sendToAll ? groups.map(g => g.id) : selectedGroupIds;

  const handleBroadcast = async () => {
    if (!settings.botToken) {
      alert('لم يتم تهيئة رمز البوت (Bot Token) بعد في إعدادات تليجرام.');
      return;
    }

    if (targetedGroupIds.length === 0) {
      alert('يرجى تحديد جروب واحد على الأقل للإرسال إليه.');
      return;
    }

    setIsBroadcasting(true);
    setResultFeedback(null);

    let res: { success: boolean; sentCount: number; errors: string[] };

    if (actionType === 'announcement') {
      res = await TelegramService.broadcastCompetition(competition, targetedGroupIds);
    } else if (actionType === 'start') {
      res = await TelegramService.broadcastCompetitionStart(competition, targetedGroupIds);
    } else {
      res = await TelegramService.broadcastLeaderboard(competition, targetedGroupIds);
    }

    setIsBroadcasting(false);

    const sentGroupsNames = groups
      .filter(g => targetedGroupIds.includes(g.id))
      .map(g => g.name || g.id);

    setResultFeedback({
      success: res.success,
      sentCount: res.sentCount,
      errors: res.errors || [],
      sentGroupsNames
    });

    if (res.success && onSuccessNotice) {
      onSuccessNotice(`تم بنجاح إرسال البث إلى ${res.sentCount} جروب تليجرام!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-[#0F223D] border border-slate-200 dark:border-[#1E3A5F] rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-[#4A607A] hover:text-[#0C2340] dark:hover:text-white rounded-2xl hover:bg-[#E6F7FA] dark:hover:bg-[#132B4A] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-[#229ED9]/25 shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                بث المسابقة في جروبات تليجرام
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30">
                بث مخصص
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#64748B] dark:text-[#94A3B8]">
              المسابقة: <span className="text-[#0EA5E9] font-black">{competition.name}</span>
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-6 py-4 flex-1 pr-1 pl-1">
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
              نوع الإشعار أو الرسالة المطلوب بثها:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setActionType('announcement')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  actionType === 'announcement'
                    ? 'bg-[#229ED9]/10 border-[#229ED9] ring-2 ring-[#229ED9]/20 shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-[#142238] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="p-2 rounded-xl bg-[#229ED9] text-white shrink-0 mt-0.5">
                  <Send className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    📢 إعلان المسابقة
                  </div>
                  <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    بطاقة المسابقة ورابط المشاركة المباشر
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionType('start')}
                disabled={isOpenTraining}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  isOpenTraining 
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : actionType === 'start'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-[#142238] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    🚀 تنبيه انطلاق المسابقة
                  </div>
                  <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    إشعار بدء استقبال الإجابات فوراً
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionType('results')}
                disabled={isOpenTraining}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  isOpenTraining 
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : actionType === 'results'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-[#142238] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="p-2 rounded-xl bg-[#06B6D4] text-white shrink-0 mt-0.5">
                  <Trophy className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    🏆 لوحة الشرف والفائزين
                  </div>
                  <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    أسماء المتصدرين والمراكز الأولى
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#142238] border border-slate-200 dark:border-slate-700 space-y-4">
            <TelegramGroupSelector
              groups={groups}
              selectedGroupIds={selectedGroupIds}
              onChange={setSelectedGroupIds}
              sendToAll={sendToAll}
              onSendToAllChange={setSendToAll}
              title="تحديد الجروبات المستهدفة لهذا الإرسال"
              subtitle="يمكنك إرسال المسابقة لجميع الجروبات أو اختيار جروبات ومدارس محددة بالاسم"
              compact={true}
            />
          </div>

          {resultFeedback && (
            <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold space-y-2 ${
              resultFeedback.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {resultFeedback.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>
                  {resultFeedback.success
                    ? `تم بنجاح إرسال الرسالة إلى ${resultFeedback.sentCount} جروب تليجرام!`
                    : `حدث خطأ أثناء الإرسال: ${resultFeedback.errors.join(' | ')}`}
                </span>
              </div>

              {resultFeedback.sentGroupsNames && resultFeedback.sentGroupsNames.length > 0 && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 pr-7">
                  تم التوصيل إلى: {resultFeedback.sentGroupsNames.join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
            الهدف: <span className="font-black text-[#0F172A] dark:text-[#F1F5F9]">{targetedGroupIds.length} جروب محدد</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={isBroadcasting || targetedGroupIds.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc2] text-white text-xs sm:text-sm font-black shadow-md shadow-[#229ED9]/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isBroadcasting ? 'animate-spin' : ''}`} />
              <span>
                {isBroadcasting
                  ? 'جاري الإرسال للبوت...'
                  : `إرسال وتعميم الآن (${targetedGroupIds.length} جروب)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
