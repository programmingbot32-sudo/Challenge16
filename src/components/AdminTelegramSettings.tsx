import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Trophy, 
  MessageSquare, 
  ShieldCheck, 
  HelpCircle,
  Copy,
  Check,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Globe,
  Edit2,
  Search,
  Filter,
  Users
} from 'lucide-react';
import { Competition, TelegramBotSettings, TelegramGroupItem } from '../types';
import { TelegramService } from '../services/telegramService';
import { StorageService } from '../services/storageService';
import { formatArabicDateTime } from '../services/dateUtils';
import { TelegramGroupSelector } from './TelegramGroupSelector';

interface AdminTelegramSettingsProps {
  competitions: Competition[];
  onNotify: (msg: string) => void;
}

export const AdminTelegramSettings: React.FC<AdminTelegramSettingsProps> = ({
  competitions,
  onNotify
}) => {
  const [settings, setSettings] = useState<TelegramBotSettings>(() => TelegramService.getSettings());
  const [tokenInput, setTokenInput] = useState(() => settings.botToken || '');
  const [platformUrlInput, setPlatformUrlInput] = useState(() => settings.platformBaseUrl || window.location.origin);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>(
    settings.isConnected ? 'success' : 'idle'
  );
  const [statusMessage, setStatusMessage] = useState('');

  // Group management state
  const [newGroupId, setNewGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('المرحلة الثانوية');
  const [isFetchingChatInfo, setIsFetchingChatInfo] = useState(false);
  const [testingGroupIndex, setTestingGroupIndex] = useState<number | null>(null);

  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupCategory, setEditingGroupCategory] = useState('');

  // Group list filtering
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('all');

  // Manual broadcast state & group selection
  const [selectedCompId, setSelectedCompId] = useState<string>(() => competitions[0]?.id || '');
  const [sendToAllInHub, setSendToAllInHub] = useState(true);
  const [selectedHubGroupIds, setSelectedHubGroupIds] = useState<string[]>([]);
  const [isBroadcastingComp, setIsBroadcastingComp] = useState(false);
  const [isBroadcastingStart, setIsBroadcastingStart] = useState(false);
  const [isBroadcastingResults, setIsBroadcastingResults] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Webhook setup state
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Compute unified groups list
  const groupsList: TelegramGroupItem[] = useMemo(() => {
    const fromSettings = settings.groupsList || [];
    const map = new Map<string, TelegramGroupItem>();
    
    // Add items from groupsList
    fromSettings.forEach(g => {
      if (g && g.id) {
        map.set(g.id, g);
      }
    });

    // Ensure all targetGroups have an entry
    (settings.targetGroups || []).forEach(id => {
      if (id && !map.has(id)) {
        map.set(id, {
          id,
          name: `جروب (${id.slice(-6)})`,
          category: 'عام'
        });
      }
    });

    return Array.from(map.values());
  }, [settings.groupsList, settings.targetGroups]);

  // Sync selectedHubGroupIds initially
  useEffect(() => {
    if (selectedHubGroupIds.length === 0 && groupsList.length > 0) {
      setSelectedHubGroupIds(groupsList.map(g => g.id));
    }
  }, [groupsList]);

  // Keep state in sync with any storage updates across app tabs or modals
  useEffect(() => {
    const handleStorageUpdate = () => {
      const fresh = TelegramService.getSettings();
      setSettings(prev => {
        // Smart merge
        const map = new Map<string, TelegramGroupItem>();
        (prev.groupsList || []).forEach(g => {
          if (g && g.id) map.set(g.id, g);
        });
        (fresh.groupsList || []).forEach(g => {
          if (g && g.id) {
            const cur = map.get(g.id);
            if (!cur || (!cur.name || cur.name.startsWith('جروب (')) && (g.name && !g.name.startsWith('جروب ('))) {
              map.set(g.id, { ...cur, ...g });
            } else if (!cur) {
              map.set(g.id, g);
            }
          }
        });
        return {
          ...prev,
          ...fresh,
          groupsList: Array.from(map.values())
        };
      });
    };
    window.addEventListener('storage_update', handleStorageUpdate);
    return () => window.removeEventListener('storage_update', handleStorageUpdate);
  }, []);

  useEffect(() => {
    // Sync active public competitions to server so bot webhook can serve students immediately
    fetch('/api/competitions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitions })
    }).catch(err => console.warn('Could not sync competitions to server:', err));

    // Pull authoritative telegram settings from server so it's consistent across any browser
    TelegramService.fetchSettingsFromServer().then(remote => {
      if (remote) {
        const cleanGroups = Array.isArray(remote.targetGroups)
          ? remote.targetGroups.filter(g => g && !g.includes('1234567890'))
          : [];

        setSettings(prev => {
          const map = new Map<string, TelegramGroupItem>();
          (prev.groupsList || []).forEach(g => {
            if (g && g.id) map.set(g.id, g);
          });
          (remote.groupsList || []).forEach(g => {
            if (g && g.id) {
              const cur = map.get(g.id);
              if (!cur || (!cur.name || cur.name.startsWith('جروب (')) && (g.name && !g.name.startsWith('جروب ('))) {
                map.set(g.id, { ...cur, ...g });
              } else if (!cur) {
                map.set(g.id, g);
              }
            }
          });
          return {
            ...prev,
            ...remote,
            targetGroups: cleanGroups.length > 0 ? cleanGroups : prev.targetGroups,
            groupsList: Array.from(map.values())
          };
        });

        if (remote.botToken && !remote.botToken.startsWith('•••')) {
          setTokenInput(remote.botToken);
        }
        if (remote.platformBaseUrl) {
          setPlatformUrlInput(remote.platformBaseUrl);
        }
        if (remote.isConnected) {
          setConnectionStatus('success');
          setStatusMessage(`تم التحقق والاتصال بنجاح بالبوت: @${remote.botUsername || ''} (${remote.botFirstName || ''})`);
        }
      }
    });
  }, [competitions]);

  const handleSavePlatformUrl = async () => {
    const cleanUrl = platformUrlInput.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      onNotify('يرجى كتابة رابط المنصة.');
      return;
    }
    const updated: TelegramBotSettings = {
      ...settings,
      platformBaseUrl: cleanUrl
    };
    setSettings(updated);
    await TelegramService.saveSettings(updated);
    onNotify('تم حفظ رابط المنصة الأساسي بنجاح');
  };

  const handleTestAndSaveToken = async () => {
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setConnectionStatus('error');
      setStatusMessage('يرجى إدخال رمز البوت (Bot Token).');
      return;
    }

    setIsCheckingToken(true);
    setConnectionStatus('idle');
    setStatusMessage('');

    const res = await TelegramService.testConnection(cleanToken);
    setIsCheckingToken(false);

    if (res.success && res.bot) {
      const updated: TelegramBotSettings = {
        ...settings,
        botToken: cleanToken,
        botUsername: res.bot.username,
        botFirstName: res.bot.first_name,
        isConnected: true
      };
      setSettings(updated);
      TelegramService.saveSettings(updated);
      setConnectionStatus('success');
      setStatusMessage(`تم التحقق والاتصال بنجاح بالبوت: @${res.bot.username} (${res.bot.first_name})`);
      onNotify('تم ربط بوت تليجرام بنجاح');
    } else {
      setConnectionStatus('error');
      setStatusMessage(res.error || 'فشل الاتصال بالبوت. تأكد من صحة الرمز من @BotFather.');
    }
  };

  const handleToggleSetting = (field: keyof TelegramBotSettings) => {
    const updated = {
      ...settings,
      [field]: !settings[field]
    };
    setSettings(updated);
    TelegramService.saveSettings(updated);
    onNotify('تم حفظ الإعدادات');
  };

  // Auto fetch group name from Telegram API
  const handleAutoFetchChatInfo = async () => {
    const cleanId = newGroupId.trim();
    if (!cleanId) {
      onNotify('يرجى إدخال معرف الجروب (Chat ID) أولاً.');
      return;
    }
    if (!settings.botToken) {
      onNotify('يرجى ربط وحفظ رمز البوت أولاً.');
      return;
    }

    setIsFetchingChatInfo(true);
    const res = await TelegramService.getChatInfo(settings.botToken, cleanId);
    setIsFetchingChatInfo(false);

    if (res.success && res.chat) {
      setNewGroupName(res.chat.title);
      onNotify(`تم جلب اسم الجروب بنجاح: "${res.chat.title}"`);
    } else {
      onNotify(res.error || 'تعذر جلب الاسم. تأكد من إضافة البوت كمشرف في الجروب.');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newGroupId.trim();
    if (!cleanId) return;

    if (settings.targetGroups.includes(cleanId)) {
      onNotify('تنبيه: هذا المعرف مضاف مسبقاً في القائمة.');
      return;
    }

    let groupName = newGroupName.trim();
    // If name was omitted, try to auto-fetch directly from Telegram Bot API
    if (!groupName && settings.botToken) {
      try {
        setIsFetchingChatInfo(true);
        const res = await TelegramService.getChatInfo(settings.botToken, cleanId);
        if (res.success && res.chat?.title) {
          groupName = res.chat.title;
        }
      } catch {} finally {
        setIsFetchingChatInfo(false);
      }
    }
    if (!groupName) {
      groupName = `جروب (${cleanId.slice(-6)})`;
    }

    const groupCategory = newGroupCategory.trim() || 'عام';

    const updatedTargetGroups = [...settings.targetGroups, cleanId];
    const updatedGroupsList: TelegramGroupItem[] = [
      ...(settings.groupsList || []).filter(g => g.id !== cleanId),
      {
        id: cleanId,
        name: groupName,
        category: groupCategory,
        addedAt: new Date().toISOString()
      }
    ];

    const updated: TelegramBotSettings = {
      ...settings,
      targetGroups: updatedTargetGroups,
      groupsList: updatedGroupsList
    };

    setSettings(updated);
    setNewGroupId('');
    setNewGroupName('');
    const res = await TelegramService.saveSettings(updated);
    if (res.success) {
      onNotify(`تمت إضافة وحفظ "${groupName}" بنجاح!`);
    } else {
      onNotify(`تمت الإضافة بنجاح (${groupName})`);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    const updatedTargetGroups = settings.targetGroups.filter(id => id !== groupId);
    const updatedGroupsList = (settings.groupsList || []).filter(g => g.id !== groupId);
    const updated: TelegramBotSettings = {
      ...settings,
      targetGroups: updatedTargetGroups,
      groupsList: updatedGroupsList
    };
    setSettings(updated);
    await TelegramService.saveSettings(updated);
    onNotify('تم حذف الجروب من القائمة');
  };

  const handleStartEditGroup = (group: TelegramGroupItem) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
    setEditingGroupCategory(group.category || 'عام');
  };

  const handleSaveEditGroup = async (groupId: string) => {
    const cleanName = editingGroupName.trim();
    const cleanCat = editingGroupCategory.trim() || 'عام';
    const updatedGroupsList = groupsList.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          name: cleanName || g.name,
          category: cleanCat
        };
      }
      return g;
    });

    const updated: TelegramBotSettings = {
      ...settings,
      groupsList: updatedGroupsList
    };
    setSettings(updated);
    setEditingGroupId(null);
    const res = await TelegramService.saveSettings(updated);
    if (res.success) {
      onNotify(`تم حفظ التعديلات بنجاح: "${cleanName || 'الجروب'}"`);
    } else {
      onNotify('تم تحديث بيانات الجروب بنجاح');
    }
  };

  const handleTestGroupMessage = async (groupId: string, index: number) => {
    if (!settings.botToken) {
      onNotify('يرجى حفظ رمز البوت أولاً.');
      return;
    }

    setTestingGroupIndex(index);
    const res = await TelegramService.sendTestMessage(settings.botToken, groupId);
    setTestingGroupIndex(null);

    if (res.success) {
      onNotify(`تم إرسال رسالة تجريبية بنجاح إلى الجروب (${groupId})`);
    } else {
      onNotify(`فشل إرسال الرسالة إلى ${groupId}: ${res.error || 'تأكد من وجود البوت وترقيته لمشرف'}`);
    }
  };

  // Determine final broadcast groups
  const finalBroadcastGroups = useMemo(() => {
    if (sendToAllInHub) {
      return groupsList.map(g => g.id);
    }
    return selectedHubGroupIds;
  }, [sendToAllInHub, groupsList, selectedHubGroupIds]);

  const handleBroadcastCurrentComp = async () => {
    const targetComp = competitions.find(c => c.id === selectedCompId);
    if (!targetComp) {
      onNotify('يرجى اختيار مسابقة للإرسال.');
      return;
    }
    const cleanGroups = finalBroadcastGroups.filter(g => g && !g.includes('1234567890'));
    if (cleanGroups.length === 0) {
      onNotify('يرجى تحديد جروب واحد على الأقل للإرسال.');
      return;
    }

    setIsBroadcastingComp(true);
    setBroadcastFeedback(null);

    const res = await TelegramService.broadcastCompetition(targetComp, cleanGroups);
    setIsBroadcastingComp(false);

    if (res.success) {
      setBroadcastFeedback({
        type: 'success',
        text: `تم بنجاح إرسال المسابقة إلى ${res.sentCount} جروب تليجرام محدد مع زر المشاركة المباشر!`
      });
      onNotify('تم نشر المسابقة في تليجرام');
    } else {
      setBroadcastFeedback({
        type: 'error',
        text: `حدث خطأ أثناء الإرسال: ${res.errors.join(' | ')}`
      });
    }
  };

  const handleBroadcastCurrentStart = async () => {
    const targetComp = competitions.find(c => c.id === selectedCompId);
    if (!targetComp) {
      onNotify('يرجى اختيار مسابقة لإرسال تنبيه انطلاقها.');
      return;
    }
    if (targetComp.competitionType === 'open') {
      onNotify('التدريب المفتوح متاح دائماً ولا يتطلب تنبيه انطلاق.');
      return;
    }
    const cleanGroups = finalBroadcastGroups.filter(g => g && !g.includes('1234567890'));
    if (cleanGroups.length === 0) {
      onNotify('يرجى تحديد جروب واحد على الأقل للإرسال.');
      return;
    }

    setIsBroadcastingStart(true);
    setBroadcastFeedback(null);

    const res = await TelegramService.broadcastCompetitionStart(targetComp, cleanGroups);
    setIsBroadcastingStart(false);

    if (res.success) {
      setBroadcastFeedback({
        type: 'success',
        text: `تم بنجاح إرسال تنبيه الانطلاق إلى ${res.sentCount} جروب تليجرام محدد مع زر المشاركة المباشر!`
      });
      onNotify('تم إرسال تنبيه انطلاق المسابقة في تليجرام');
    } else {
      setBroadcastFeedback({
        type: 'error',
        text: `حدث خطأ: ${res.errors.join(' | ')}`
      });
    }
  };

  const handleBroadcastCurrentResults = async () => {
    const targetComp = competitions.find(c => c.id === selectedCompId);
    if (!targetComp) {
      onNotify('يرجى اختيار مسابقة لعرض نتائجها.');
      return;
    }
    const cleanGroups = finalBroadcastGroups.filter(g => g && !g.includes('1234567890'));
    if (cleanGroups.length === 0) {
      onNotify('يرجى تحديد جروب واحد على الأقل للإرسال.');
      return;
    }

    setIsBroadcastingResults(true);
    setBroadcastFeedback(null);

    const res = await TelegramService.broadcastLeaderboard(targetComp, cleanGroups);
    setIsBroadcastingResults(false);

    if (res.success) {
      setBroadcastFeedback({
        type: 'success',
        text: `تم بنجاح نشر لوحة الشرف والمتصدرين إلى ${res.sentCount} جروب تليجرام محدد!`
      });
      onNotify('تم نشر لوحة الشرف في تليجرام');
    } else {
      setBroadcastFeedback({
        type: 'error',
        text: `حدث خطأ: ${res.errors.join(' | ')}`
      });
    }
  };

  const handleSetupWebhook = async () => {
    if (!settings.botToken) {
      onNotify('يرجى حفظ رمز البوت أولاً.');
      return;
    }

    setIsSettingWebhook(true);
    setWebhookFeedback(null);

    try {
      const webhookUrl = `${window.location.origin}/api/telegram/webhook`;
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          token: settings.botToken,
          webhookUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setWebhookFeedback('تم تفعيل Webhook بنجاح! البوت الآن يستقبل أوامر الطلاب والجروبات مباشرة.');
        onNotify('تم تفعيل استقبال رسائل البوت');
      } else {
        setWebhookFeedback(`فشل تفعيل Webhook: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (e: any) {
      setWebhookFeedback(`خطأ بالاتصال: ${e.message}`);
    } finally {
      setIsSettingWebhook(false);
    }
  };

  // Filter groups in management card
  const filteredManagementGroups = useMemo(() => {
    return groupsList.filter(g => {
      const matchesSearch = 
        (g.name && g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())) ||
        (g.id && g.id.toLowerCase().includes(groupSearchQuery.toLowerCase())) ||
        (g.category && g.category.toLowerCase().includes(groupSearchQuery.toLowerCase()));

      const matchesCat = 
        groupCategoryFilter === 'all' || 
        g.category === groupCategoryFilter ||
        (!g.category && groupCategoryFilter === 'عام');

      return matchesSearch && matchesCat;
    });
  }, [groupsList, groupSearchQuery, groupCategoryFilter]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    groupsList.forEach(g => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [groupsList]);

  const selectedComp = competitions.find(c => c.id === selectedCompId) || competitions[0];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#229ED9]/10 via-[#F0F9FF] to-[#229ED9]/10 dark:from-[#229ED9]/20 dark:via-[#1E293B] dark:to-[#229ED9]/20 border border-[#229ED9]/30 rounded-[2.5rem] p-7 sm:p-9 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#229ED9] text-white shadow-xs">
                <Send className="w-5 h-5" />
              </span>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30">
                التكامل الذكي مع تليجرام • Telegram Bot
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
              إدارة بوت تليجرام وبث المسابقات
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-2xl leading-relaxed">
              ربط المنصة ببوت تليجرام رسمي لإرسال المسابقات لجروبات محددة بالاسم أو لجميع الجروبات، بث لوحة المتصدرين، وتوزيع المسابقات على المدارس والفصول بمنتهى الدقة والمرونة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSetupWebhook}
              disabled={isSettingWebhook || !settings.botToken}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#229ED9] hover:bg-[#1a8bc2] text-white text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isSettingWebhook ? 'animate-spin' : ''}`} />
              <span>{isSettingWebhook ? 'جاري التفعيل...' : 'تفعيل استقبال أوامر الطلاب (Webhook)'}</span>
            </button>
          </div>
        </div>

        {webhookFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs sm:text-sm font-bold text-sky-800 dark:text-sky-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
            <span>{webhookFeedback}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Token & Automation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Bot Token & Connection */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#229ED9]">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">رمز اتصال البوت (Bot Token)</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">الحصول عليه من @BotFather في تليجرام</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                Telegram Bot Token
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="w-full h-12 px-4 rounded-xl font-mono text-xs bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleTestAndSaveToken}
                  disabled={isCheckingToken || !tokenInput.trim()}
                  className="w-full h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingToken ? 'animate-spin' : ''}`} />
                  <span>{isCheckingToken ? 'جاري فحص الاتصال بالخادم...' : 'فحص والاتصال بالبوت'}</span>
                </button>
              </div>

              {/* Status indicator */}
              {statusMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                  connectionStatus === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Connected Bot details */}
              {settings.isConnected && settings.botUsername && (
                <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">اسم البوت:</span>
                    <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">{settings.botFirstName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">اسم المستخدم:</span>
                    <a
                      href={`https://t.me/${settings.botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-[#229ED9] hover:underline flex items-center gap-1"
                      dir="ltr"
                    >
                      @{settings.botUsername}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700">
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">الحالة:</span>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>متصل وجاهز</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Automatic Posting Toggles & Platform URL */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4]">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">خيارات البوت والأتمتة</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">تحديد مهام النشر التلقائي ورابط المنصة</p>
              </div>
            </div>

            {/* Platform URL Config */}
            <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#0EA5E9]" />
                  <span>رابط المنصة الأساسي (لأزرار تليجرام)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPlatformUrlInput(window.location.origin)}
                  className="text-[11px] font-bold text-[#0EA5E9] hover:underline cursor-pointer"
                >
                  استخدام رابط الصفحة الحالي
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={platformUrlInput}
                  onChange={(e) => setPlatformUrlInput(e.target.value)}
                  placeholder="https://sabir511.onrender.com"
                  className="flex-1 h-10 px-3 rounded-xl text-xs font-mono bg-white dark:bg-black/30 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleSavePlatformUrl}
                  className="px-4 h-10 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-black cursor-pointer shadow-xs transition-colors"
                >
                  حفظ الرابط
                </button>
              </div>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                هذا الرابط يُستخدم في إنشاء أزرار "ابدأ التحدي الآن" في جميع رسائل تليجرام لفتح المسابقة مباشرة.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Toggle 1: Auto broadcast new competitions */}
              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    إرسال المسابقات بالجروبات تلقائياً
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    يقوم البوت بإرسال المسابقة فور إنشائها متضمنة الوصف وزر المشاركة المباشر للطلاب
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting('autoBroadcastNew')}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.autoBroadcastNew ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md block transition-transform ${
                    settings.autoBroadcastNew ? 'translate-x-1' : 'translate-x-6'
                  }`} />
                </button>
              </div>

              {/* Toggle 2: Auto broadcast leaderboard / results */}
              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    عرض النتائج ولوحة الشرف بالجروب
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    يقوم البوت بنشر أسماء المتصدرين والمراكز الثلاثة الأولى ودرجاتهم في الجروبات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting('autoBroadcastResults')}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.autoBroadcastResults ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md block transition-transform ${
                    settings.autoBroadcastResults ? 'translate-x-1' : 'translate-x-6'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Bot Commands and Features Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span>أوامر ومميزات بوت تليجرام للمستخدمين</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              واجهة تفاعلية حديثة بأزرار تحكم سريعة بدون إطالة أو أوصاف مكررة:
            </p>
            <div className="space-y-2 text-xs font-mono bg-[#F0F9FF] dark:bg-[#1E293B] p-3 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/start</span>
                <span className="font-sans text-[11px] text-[#64748B]">القائمة الرئيسية التفاعلية بأزرار التحكم</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/competitions</span>
                <span className="font-sans text-[11px] text-[#64748B]">قائمة المسابقات بتنسيق نقي وأزرار مباشرة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/random</span>
                <span className="font-sans text-[11px] text-[#64748B]">تحدي عشوائي فوري للمستخدمين</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/training</span>
                <span className="font-sans text-[11px] text-[#64748B]">بنك الأسئلة والتدريب الذاتي المفتوح</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/rules</span>
                <span className="font-sans text-[11px] text-[#64748B]">قواعد وإرشادات التنافس للمستخدمين</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/admin</span>
                <span className="font-sans text-[11px] text-[#64748B]">لوحة تحكم المشرفين الخاصة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">winners</span>
                <span className="font-sans text-[11px] text-[#64748B]">إعلان لوحة الشرف والميداليات</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#229ED9] font-bold">/id</span>
                <span className="font-sans text-[11px] text-[#64748B]">معرف الجروب والتسجيل التلقائي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Groups & Broadcast Hub (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 3: Target Groups Manager (With Names & Categories) */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#06B6D4]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">
                    إدارة الجروبات والقنوات المدرسية ({groupsList.length})
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    إضافة الجروبات بأسماء وتصنيفات واضحة لسهولة الاختيار والاستهداف
                  </p>
                </div>
              </div>
            </div>

            {/* Add Group Form */}
            <form onSubmit={handleAddGroup} className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#142238] border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#0EA5E9]" />
                <span>إضافة جروب أو قناة مدرسية جديدة</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Chat ID Input with auto-fetch button */}
                <div className="sm:col-span-6 relative">
                  <input
                    type="text"
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    placeholder="معرف الجروب: -1002345678901 أو @channel"
                    className="w-full h-11 pr-3 pl-20 rounded-xl text-xs font-mono bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAutoFetchChatInfo}
                    disabled={isFetchingChatInfo || !newGroupId.trim()}
                    className="absolute left-1.5 top-1.5 h-8 px-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 border border-sky-200 text-[10px] font-black text-[#0284C7] dark:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                    title="جلب اسم الجروب الحقيقي تلقائياً من تليجرام"
                  >
                    <Zap className={`w-3 h-3 ${isFetchingChatInfo ? 'animate-spin' : ''}`} />
                    <span>{isFetchingChatInfo ? 'جلب...' : 'جلب الاسم'}</span>
                  </button>
                </div>

                {/* Group Friendly Name Input */}
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="اسم الجروب (مثلاً: ثانوية الرياض - شعبة 1)"
                    className="w-full h-11 px-3 rounded-xl text-xs font-bold bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                  />
                </div>

                {/* Category Selection */}
                <div className="sm:col-span-8">
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl text-xs font-bold bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                  >
                    <option value="المرحلة الثانوية">المرحلة الثانوية</option>
                    <option value="المرحلة المتوسطة">المرحلة المتوسطة</option>
                    <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
                    <option value="نادي موهبة والتفوق">نادي موهبة والتفوق</option>
                    <option value="قناة عامة للمدرسة">قناة عامة للمدرسة</option>
                    <option value="أولياء الأمور والمعلمون">أولياء الأمور والمعلمون</option>
                    <option value="عام">عام</option>
                  </select>
                </div>

                {/* Submit button */}
                <div className="sm:col-span-4">
                  <button
                    type="submit"
                    disabled={!newGroupId.trim()}
                    className="w-full h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ وإضافة الجروب</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Guide on how to get Group ID */}
            <div className="p-3.5 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/20 text-xs text-[#0F172A] dark:text-[#F1F5F9] space-y-1">
              <div className="font-black flex items-center gap-1.5 text-[#229ED9]">
                <HelpCircle className="w-4 h-4" />
                <span>كيف تحصل على معرف الجروب (Chat ID)؟</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                أضف البوت إلى الجروب كـ <strong>مشرف (Admin)</strong>، ثم أرسل الأمر <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono font-bold text-[#229ED9]">/id</code> داخل الجروب وسيرد البوت فوراً بالمعرف الرقمي الخاص به.
              </p>
            </div>

            {/* Search & Category Filter for Groups List */}
            {groupsList.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="ابحث بين الجروبات بالاسم أو المعرف..."
                    className="w-full h-10 pr-9 pl-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
                  />
                  <Search className="w-4 h-4 text-[#64748B] absolute right-3 top-3 pointer-events-none" />
                </div>

                {uniqueCategories.length > 0 && (
                  <select
                    value={groupCategoryFilter}
                    onChange={(e) => setGroupCategoryFilter(e.target.value)}
                    className="h-10 px-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9] shrink-0"
                  >
                    <option value="all">كل التصنيفات ({groupsList.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* List of active groups with Edit/Delete */}
            <div className="space-y-2.5 pt-1 max-h-72 overflow-y-auto pr-0.5">
              {filteredManagementGroups.length > 0 ? (
                filteredManagementGroups.map((group, index) => {
                  const isEditing = editingGroupId === group.id;

                  return (
                    <div
                      key={group.id}
                      className="p-3.5 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      {isEditing ? (
                        /* Editing Mode */
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            placeholder="اسم الجروب الجديد"
                            className="flex-1 h-9 px-3 rounded-lg text-xs font-bold bg-white dark:bg-[#0B1321] border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#229ED9]"
                          />
                          <select
                            value={editingGroupCategory}
                            onChange={(e) => setEditingGroupCategory(e.target.value)}
                            className="h-9 px-2 rounded-lg text-xs font-bold bg-white dark:bg-[#0B1321] border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#229ED9]"
                          >
                            <option value="المرحلة الثانوية">المرحلة الثانوية</option>
                            <option value="المرحلة المتوسطة">المرحلة المتوسطة</option>
                            <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
                            <option value="نادي موهبة والتفوق">نادي موهبة والتفوق</option>
                            <option value="قناة عامة للمدرسة">قناة عامة للمدرسة</option>
                            <option value="عام">عام</option>
                          </select>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveEditGroup(group.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 cursor-pointer"
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGroupId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal View Mode */
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#229ED9] shrink-0"></span>
                              <span className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] truncate">
                                {group.name || `جروب (${group.id.slice(-6)})`}
                              </span>
                              {group.category && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-[#0284C7] dark:bg-sky-950 dark:text-sky-300 shrink-0">
                                  {group.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              <span className="font-mono" dir="ltr">{group.id}</span>
                              {group.memberCount && <span>👥 {group.memberCount} عضو</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditGroup(group)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0EA5E9] hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="تعديل اسم أو تصنيف الجروب"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestGroupMessage(group.id, index)}
                              disabled={testingGroupIndex === index}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-[#229ED9] hover:bg-[#229ED9]/10 cursor-pointer transition-colors flex items-center gap-1"
                              title="إرسال رسالة تجريبية"
                            >
                              <Send className={`w-3 h-3 ${testingGroupIndex === index ? 'animate-bounce' : ''}`} />
                              <span>{testingGroupIndex === index ? 'إرسال...' : 'تجربة'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveGroup(group.id)}
                              className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="حذف الجروب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-[#F0F9FF] dark:bg-[#1E293B] rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  {groupsList.length === 0
                    ? 'لم يتم إضافة أي جروبات بعد. أضف معرف الجروب أعلاه ليتمكن البوت من النشر.'
                    : 'لا توجد جروبات مطابقة لمعايير البحث الحالية.'}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Broadcast Hub (With Group Targeting Selector) */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-600">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F1F5F9]">مركز البث الفوري للمسابقات والنتائج</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">إرسال المسابقة المختارة لجروبات محددة بالاسم أو للجميع</p>
              </div>
            </div>

            {/* Select Competition */}
            <div>
              <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1.5">
                اختر المسابقة للبث:
              </label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#229ED9]"
              >
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.visibility === 'private' ? '🔒 خاصة برابط' : '🌐 عامة'}) - {comp.questions.length} أسئلة
                  </option>
                ))}
              </select>
            </div>

            {/* Embedded Group Selector for Broadcast Hub */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#142238] border border-slate-200 dark:border-slate-700 space-y-3">
              <TelegramGroupSelector
                groups={groupsList}
                selectedGroupIds={selectedHubGroupIds}
                onChange={setSelectedHubGroupIds}
                sendToAll={sendToAllInHub}
                onSendToAllChange={setSendToAllInHub}
                title="الجروبات المستهدفة للبث الحالي"
                subtitle="حدد ما إذا كنت تريد النشر لجميع الجروبات أو اختيار جروبات محددة بالاسم"
                compact={true}
              />
            </div>

            {/* Preview Card of Telegram Message */}
            {selectedComp && (
              <div className="p-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-bold flex items-center justify-between">
                  <span>معاينة شكل رسالة البوت في الجروب:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#229ED9]/15 text-[#229ED9] font-mono">
                    Telegram Message
                  </span>
                </div>

                <div className="bg-white dark:bg-black/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs space-y-2 leading-relaxed">
                  <div className="font-black text-sm text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>جاهز للتحدي والتنافس؟ {selectedComp.name}</span>
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    ⚡ {selectedComp.questions.length} أسئلة حماسية • ⏱️ {selectedComp.questionDuration || 30} ثانية لكل سؤال • 🏆 {selectedComp.rewardType || 'شهادة تميز رقمية فورية'}
                  </div>

                  {/* Scheduled times if timed */}
                  {selectedComp.competitionType !== 'open' && (selectedComp.startTime || selectedComp.endTime) ? (
                    <div className="p-2.5 rounded-lg bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-bold">
                      <div className="text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                        <span>⏰ موعد البدء:</span>
                        <span className="text-[#06B6D4]">{formatArabicDateTime(selectedComp.startTime) || 'متاح فوراً'}</span>
                      </div>
                      <div className="text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                        <span>⌛ موعد الانتهاء:</span>
                        <span className="text-[#06B6D4]">{formatArabicDateTime(selectedComp.endTime) || 'حسب المدة'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#1f7349] dark:text-[#6ee7b7] font-bold">
                      🌐 مسابقة مفتوحة ومتاحة في أي وقت يناسبك!
                    </div>
                  )}

                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] border-t border-b border-dashed border-slate-200 dark:border-slate-700 py-1.5">
                    {selectedComp.description || 'أرنا سرعتك وذكاءك وكن في صدارة الأوائل! 🥇🔥'}
                  </div>
                  <div className="pt-1">
                    <div className="w-full py-2 bg-[#229ED9] text-white text-center rounded-lg font-black text-xs shadow-xs">
                      {selectedComp.status === 'upcoming' 
                        ? '⏳ استعراض موعد وتفاصيل المسابقة (زر تفاعلي)'
                        : selectedComp.status === 'ended'
                        ? '📊 استعراض لوحة شرف الأبطال والنتائج (زر تفاعلي)'
                        : '🚀 انضم للتحدي وأظهر مهاراتك الآن! (زر تفاعلي)'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Broadcast Action Buttons with count indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBroadcastCurrentComp}
                disabled={isBroadcastingComp || !settings.botToken || finalBroadcastGroups.length === 0}
                className="py-3.5 px-3 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc2] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isBroadcastingComp ? 'animate-spin' : ''}`} />
                <span>
                  {isBroadcastingComp ? 'جاري النشر...' : `📢 نشر إعلان (${finalBroadcastGroups.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleBroadcastCurrentStart}
                disabled={isBroadcastingStart || !settings.botToken || finalBroadcastGroups.length === 0 || selectedComp?.competitionType === 'open'}
                className="py-3.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isBroadcastingStart ? 'animate-spin' : ''}`} />
                <span>
                  {isBroadcastingStart ? 'جاري الإرسال...' : `🚀 تنبيه انطلاق (${finalBroadcastGroups.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleBroadcastCurrentResults}
                disabled={isBroadcastingResults || !settings.botToken || finalBroadcastGroups.length === 0 || selectedComp?.competitionType === 'open'}
                className="py-3.5 px-3 rounded-xl bg-[#06B6D4] hover:bg-[#0284C7] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <Trophy className={`w-4 h-4 ${isBroadcastingResults ? 'animate-bounce' : ''}`} />
                <span>
                  {selectedComp?.competitionType === 'open' 
                    ? '🎯 تدريب بدون لوحة' 
                    : isBroadcastingResults 
                    ? 'جاري النشر...' 
                    : `🏆 لوحة الشرف (${finalBroadcastGroups.length})`}
                </span>
              </button>
            </div>

            {/* Feedback message */}
            {broadcastFeedback && (
              <div className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
                broadcastFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {broadcastFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{broadcastFeedback.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

