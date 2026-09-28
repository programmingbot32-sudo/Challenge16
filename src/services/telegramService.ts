import { TelegramBotSettings, Competition, TelegramGroupItem } from '../types';
import { StorageService } from './storageService';

export const TelegramService = {
  getSettings(): TelegramBotSettings {
    return StorageService.getTelegramSettings();
  },

  getGroupsList(): TelegramGroupItem[] {
    const settings = this.getSettings();
    const fromSettings = settings.groupsList || [];
    const map = new Map<string, TelegramGroupItem>();

    fromSettings.forEach(g => {
      if (g && g.id) {
        map.set(g.id, {
          ...g,
          name: g.name || `جروب (${g.id.slice(-6)})`,
          category: g.category || 'عام'
        });
      }
    });

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
  },

  async fetchSettingsFromServer(): Promise<TelegramBotSettings | null> {
    try {
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/settings', {
        headers: {
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const current = StorageService.getTelegramSettings();

        // Server is authoritative for groups and targetGroups
        const serverGroupsList: TelegramGroupItem[] = Array.isArray(data.groupsList)
          ? data.groupsList.map((g: any) => ({
              id: String(g.id || '').trim(),
              name: String(g.name || `جروب (${String(g.id).slice(-6)})`).trim(),
              category: String(g.category || 'عام').trim(),
              type: g.type || 'group',
              memberCount: g.memberCount,
              addedAt: g.addedAt || new Date().toISOString()
            }))
          : (current.groupsList || []);

        const serverTargetGroups = Array.isArray(data.targetGroups)
          ? data.targetGroups.map((s: any) => String(s).trim()).filter(Boolean)
          : (current.targetGroups || []);

        const cleanToken = data.botToken && !data.botToken.startsWith('•••') ? data.botToken : current.botToken;

        const merged: TelegramBotSettings = {
          ...current,
          ...data,
          targetGroups: serverTargetGroups,
          groupsList: serverGroupsList,
          botToken: cleanToken,
          webhookUrl: data.webhookUrl !== undefined ? data.webhookUrl : current.webhookUrl
        };
        StorageService.saveTelegramSettings(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Could not fetch telegram settings from server:', e);
    }
    return null;
  },

  async saveSettings(settings: TelegramBotSettings): Promise<{ success: boolean; error?: string }> {
    return await StorageService.saveTelegramSettingsAsync(settings);
  },

  async setWebhook(webhookUrl: string, token?: string): Promise<{ success: boolean; result?: any; webhookUrl?: string; error?: string; message?: string }> {
    try {
      const cleanUrl = webhookUrl.trim();
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          webhookUrl: cleanUrl,
          token: token && !token.startsWith('•••') ? token.trim() : undefined,
          adminToken: adminToken || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'فشل تسجيل الويب هوك مع سيرفرات تليجرام' };
      }
      // Update local storage
      const current = this.getSettings();
      StorageService.saveTelegramSettings({ ...current, webhookUrl: cleanUrl });
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم لتسجيل الويب هوك.' };
    }
  },

  async getWebhookInfo(): Promise<{ success: boolean; info?: any; configuredWebhookUrl?: string; pollingActive?: boolean; error?: string }> {
    try {
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/webhook-info', {
        headers: {
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'تعذر جلب معلومات الويب هوك.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم.' };
    }
  },

  async deleteWebhook(): Promise<{ success: boolean; result?: any; error?: string; message?: string }> {
    try {
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/delete-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          adminToken: adminToken || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'تعذر إلغاء الويب هوك.' };
      }
      // Update local storage
      const current = this.getSettings();
      StorageService.saveTelegramSettings({ ...current, webhookUrl: '' });
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم لإلغاء الويب هوك.' };
    }
  },

  async testConnection(token: string): Promise<{ success: boolean; bot?: { username: string; first_name: string }; error?: string }> {
    try {
      const cleanToken = token.trim();
      if (!cleanToken) {
        return { success: false, error: 'الرجاء إدخال رمز البوت (Bot Token).' };
      }

      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({ token: cleanToken })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || 'فشل الاتصال ببوت تليجرام. تحقق من صحة الرمز.' };
      }

      const data = await res.json();
      return {
        success: true,
        bot: data.bot
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ في الشبكة أثناء الاتصال بالخادم.' };
    }
  },

  async sendTestMessage(token: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({ token, chatId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'تعذر إرسال الرسالة. تأكد من إضافة البوت كمشرف في الجروب.' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم.' };
    }
  },

  async getChatInfo(token: string, chatId: string): Promise<{ success: boolean; chat?: { id: string; title: string; type: string; username?: string; memberCount?: number }; error?: string }> {
    try {
      const cleanToken = token.trim();
      const cleanChatId = chatId.trim();
      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/get-chat-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({ token: cleanToken, chatId: cleanChatId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'تعذر جلب معلومات الجروب.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم.' };
    }
  },

  async broadcastCompetition(competition: Competition, targetGroups?: string[]): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
    try {
      const settings = this.getSettings();
      const groups = (targetGroups && targetGroups.length > 0)
        ? targetGroups
        : (competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0)
        ? competition.targetTelegramGroups
        : settings.targetGroups;
      
      if (!settings.botToken) {
        return { success: false, sentCount: 0, errors: ['لم يتم ضبط رمز البوت (Bot Token) في إعدادات المنصة.'] };
      }
      if (!groups || groups.length === 0) {
        return { success: false, sentCount: 0, errors: ['لم يتم تحديد أي جروبات تليجرام للإرسال إليها.'] };
      }

      const currentOrigin = window.location.origin;
      const competitionUrl = `${currentOrigin}/?quiz=${encodeURIComponent(competition.webSlug || competition.id)}`;

      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/broadcast-competition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          token: settings.botToken,
          groups,
          competition: {
            id: competition.id,
            webSlug: competition.webSlug,
            name: competition.name,
            description: competition.description,
            schoolName: competition.schoolName,
            questionsCount: competition.questions.length,
            duration: competition.examDurationMinutes || 15,
            url: competitionUrl,
            rewardType: competition.rewardType,
            competitionType: competition.competitionType,
            startTime: competition.startTime,
            endTime: competition.endTime,
            targetTelegramGroups: competition.targetTelegramGroups,
            status: StorageService.getCompetitionStatus(competition)
          }
        })
      });

      const data = await res.json();
      return {
        success: data.success ?? false,
        sentCount: data.sentCount ?? 0,
        errors: data.errors || []
      };
    } catch (err: any) {
      return { success: false, sentCount: 0, errors: [err.message || 'خطأ في الاتصال بالخادم'] };
    }
  },

  async broadcastLeaderboard(competition: Competition, targetGroups?: string[]): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
    try {
      const settings = this.getSettings();
      const groups = (targetGroups && targetGroups.length > 0)
        ? targetGroups
        : (competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0)
        ? competition.targetTelegramGroups
        : settings.targetGroups;
      
      if (!settings.botToken) {
        return { success: false, sentCount: 0, errors: ['لم يتم ضبط رمز البوت في إعدادات المنصة.'] };
      }
      if (!groups || groups.length === 0) {
        return { success: false, sentCount: 0, errors: ['لم يتم تحديد أي جروبات تليجرام للإرسال إليها.'] };
      }

      const results = StorageService.getCompetitionResults(competition.id).slice(0, 5);
      const currentOrigin = window.location.origin;
      const competitionUrl = `${currentOrigin}/?quiz=${encodeURIComponent(competition.webSlug || competition.id)}`;

      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/broadcast-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          token: settings.botToken,
          groups,
          competitionName: competition.name,
          competitionUrl,
          competitionType: competition.competitionType,
          targetTelegramGroups: competition.targetTelegramGroups,
          leaderboard: results.map((r, idx) => ({
            rank: idx + 1,
            name: r.name,
            school: r.school,
            percentage: r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : 0,
            timeSeconds: r.totalTimeSeconds
          }))
        })
      });

      const data = await res.json();
      return {
        success: data.success ?? false,
        sentCount: data.sentCount ?? 0,
        errors: data.errors || []
      };
    } catch (err: any) {
      return { success: false, sentCount: 0, errors: [err.message || 'خطأ في الاتصال بالخادم'] };
    }
  },

  async broadcastCompetitionStart(competition: Competition, targetGroups?: string[]): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
    try {
      const settings = this.getSettings();
      const groups = (targetGroups && targetGroups.length > 0)
        ? targetGroups
        : (competition.targetTelegramGroups && competition.targetTelegramGroups.length > 0)
        ? competition.targetTelegramGroups
        : settings.targetGroups;
      
      if (!settings.botToken) {
        return { success: false, sentCount: 0, errors: ['لم يتم ضبط رمز البوت (Bot Token) في إعدادات المنصة.'] };
      }
      if (!groups || groups.length === 0) {
        return { success: false, sentCount: 0, errors: ['لم يتم تحديد أي جروبات تليجرام للإرسال إليها.'] };
      }

      const currentOrigin = window.location.origin;
      const competitionUrl = `${currentOrigin}/?quiz=${encodeURIComponent(competition.webSlug || competition.id)}`;

      const adminToken = StorageService.getAdminToken();
      const res = await fetch('/api/telegram/broadcast-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({
          token: settings.botToken,
          groups,
          competition: {
            id: competition.id,
            webSlug: competition.webSlug,
            name: competition.name,
            description: competition.description,
            schoolName: competition.schoolName,
            questionsCount: competition.questions.length,
            duration: competition.examDurationMinutes || 15,
            url: competitionUrl,
            rewardType: competition.rewardType,
            competitionType: competition.competitionType,
            startTime: competition.startTime,
            endTime: competition.endTime,
            targetTelegramGroups: competition.targetTelegramGroups,
            status: StorageService.getCompetitionStatus(competition)
          }
        })
      });

      const data = await res.json();
      return {
        success: data.success ?? false,
        sentCount: data.sentCount ?? 0,
        errors: data.errors || []
      };
    } catch (err: any) {
      return { success: false, sentCount: 0, errors: [err.message || 'خطأ في الاتصال بالخادم'] };
    }
  }
};
