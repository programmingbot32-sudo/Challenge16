import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { dbManager } from './server/mongodb.ts';
import { generateCuratedQuestions } from './server/curatedQuestions.ts';
import { tryGroqFallbackChain } from './server/groq.ts';

dotenv.config();

// In-memory store for server-side Telegram settings and active public competitions
interface ServerTelegramSettings {
  botToken: string;
  botUsername?: string;
  botFirstName?: string;
  isConnected: boolean;
  autoBroadcastNew: boolean;
  autoBroadcastResults: boolean;
  targetGroups: string[];
  groupsList?: any[];
  adminUserIds?: string[];
  welcomeMessage?: string;
  platformBaseUrl?: string;
  webhookUrl?: string;
}

interface TelegramTeacherSession {
  code: string;
  teacherDisplayName: string;
  school: string;
  loginAt?: number;
}

const telegramTeacherSessions = new Map<string, TelegramTeacherSession>();

let telegramSettings: ServerTelegramSettings = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: '',
  botFirstName: '',
  isConnected: false,
  autoBroadcastNew: false,
  autoBroadcastResults: false,
  targetGroups: [],
  groupsList: [],
  adminUserIds: ['1596661941'],
  welcomeMessage: 'مرحباً بك في منصة التنافس والمسابقات التعليمية! يمكنك استعراض المسابقات المتاحة وبدء التحدي مباشرة.',
  platformBaseUrl: process.env.BASE_URL || ''
};

let currentAppBaseUrl = process.env.BASE_URL || '';

// Helper to format date and time in clear Arabic with Latin numerals
function formatArabicDateTime(dateStr?: string, timeOnlyIfSameDayAs?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const arabicDays = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];

    const dayName = arabicDays[d.getDay()];
    const day = d.getDate();
    const month = arabicMonths[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    if (timeOnlyIfSameDayAs) {
      const refDate = new Date(timeOnlyIfSameDayAs);
      if (!isNaN(refDate.getTime())) {
        if (
          refDate.getFullYear() === d.getFullYear() &&
          refDate.getMonth() === d.getMonth() &&
          refDate.getDate() === d.getDate()
        ) {
          return timeStr;
        }
      }
    }

    return `${dayName}، ${day} ${month} ${year} — ${timeStr}`;
  } catch {
    return String(dateStr || '');
  }
}

let serverPublicCompetitions: Array<{
  id: string;
  webSlug: string;
  name: string;
  description: string;
  schoolName: string;
  questionsCount: number;
  duration: number;
  rewardType: string;
  visibility?: string;
  competitionType?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}> = [
  {
    id: 'comp-question-bank',
    webSlug: 'question-bank-assessment',
    name: 'بنك الأسئلة والتقييم الذاتي المعرفي',
    description: 'اختبر حصيلتك العلمية وقيم مستواك فورياً في مجالات متعددة بأسئلة عشوائية متجددة.',
    schoolName: 'المركز الوطني للتقويم والتميز المعرفي',
    questionsCount: 30,
    duration: 10,
    rewardType: 'تقييم تشخيصي فوري بدون شهادة',
    visibility: 'public',
    competitionType: 'open'
  },
  {
    id: 'comp-math-geniuses',
    webSlug: 'math-geniuses-challenge',
    name: 'تحدي العباقرة في الرياضيات',
    description: 'اختبر سرعتك في التفكير وحل المسائل المنطقية الممتعة.',
    schoolName: 'المركز الوطني لتطوير المناهج',
    questionsCount: 5,
    duration: 15,
    rewardType: 'وسام العباقرة + شهادة تفوق رقمية',
    visibility: 'public',
    competitionType: 'open'
  },
  {
    id: 'comp-science-journey',
    webSlug: 'journey-into-science',
    name: 'رحلة في عالم العلوم',
    description: 'أسئلة شيقة تجمع بين التجربة والاكتشاف والمعرفة.',
    schoolName: 'الإدارة العامة لرعاية الموهوبين',
    questionsCount: 5,
    duration: 12,
    rewardType: 'شارة المكتشف الصغير + شهادة تميز رقمية',
    visibility: 'public',
    competitionType: 'open'
  },
  {
    id: 'comp-arabic-challenge',
    webSlug: 'arabic-language-masters',
    name: 'فرسان اللغة العربية والبيان',
    description: 'أبحر في جمال لغة الضاد من خلال أسئلة في البلاغة والنحو والمفردات.',
    schoolName: 'مجمع الملك سلمان العالمي للغة العربية',
    questionsCount: 5,
    duration: 10,
    rewardType: 'درع الفصاحة + شهادة إتقان رقمية',
    visibility: 'public',
    competitionType: 'open'
  }
];

// Helper to send request to Telegram Bot API
async function callTelegramApi(token: string, method: string, payload: any) {
  const cleanToken = token || telegramSettings.botToken;
  if (!cleanToken) {
    throw new Error('Telegram Bot Token is not configured');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram API error on ${method}`);
  }
  return data.result;
}

function escapeTelegramHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let latestLeaderboardCache: Array<{
  competitionName: string;
  competitionUrl?: string;
  leaderboard: any[];
  updatedAt: string;
}> = [];

function getTelegramWebhookSecret(): string {
  const source = process.env.SESSION_SECRET || 'tanafas-webhook-secret';
  return Buffer.from(source).toString('base64url').slice(0, 64);
}

async function startServer() {
  const app = express();
  // Support PORT from Render or container environment
  const portArgIndex = process.argv.findIndex(arg => arg === '--port');
  const cliPort = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : undefined;
  const PORT = Number(process.env.PORT) || cliPort || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Basic Security & Protection Headers + Dynamic Domain Tracking
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      currentAppBaseUrl = `${proto}://${forwardedHost}`;
      if (!telegramSettings.platformBaseUrl) {
        telegramSettings.platformBaseUrl = currentAppBaseUrl;
      }
    } else if (!currentAppBaseUrl && forwardedHost) {
      currentAppBaseUrl = `${proto}://${forwardedHost}`;
    }

    next();
  });

  // Initialize Database (MongoDB with resilient fallback)
  await dbManager.init();

  // Load public competitions from database for telegram bot & cache
  try {
    const dbComps = await dbManager.getCompetitions({ visibility: 'public' });
    if (dbComps.length > 0) {
      serverPublicCompetitions = dbComps.map(c => ({
        id: c.id,
        webSlug: c.webSlug || c.id,
        name: c.name,
        description: c.description || '',
        schoolName: c.schoolName || 'منصة تَنافُسْ',
        questionsCount: c.questions?.length || 0,
        duration: c.examDurationMinutes || 15,
        rewardType: c.rewardType || 'شهادة تفوق رقمية',
        visibility: 'public',
        competitionType: c.competitionType,
        startTime: c.startTime,
        endTime: c.endTime,
        status: c.status
      }));
    }
  } catch (err) {
    console.warn('Notice: Error loading initial public competitions from DB:', err);
  }

  // Load persistent bot settings from DB
  try {
    const savedBotSettings = await dbManager.getBotSettings();
    if (savedBotSettings) {
      const rawList = Array.isArray(savedBotSettings.targetGroups) ? savedBotSettings.targetGroups : [];
      const cleanGroups = rawList
        .map((g: any) => String(g).trim())
        .filter((g: string) => Boolean(g && !g.includes('1234567890')));
      const rawGroupsList = Array.isArray(savedBotSettings.groupsList) ? savedBotSettings.groupsList : [];
      const rawAdmins = Array.isArray(savedBotSettings.adminUserIds) ? savedBotSettings.adminUserIds : [];
      if (!rawAdmins.includes('1596661941')) {
        rawAdmins.unshift('1596661941');
      }
      telegramSettings = {
        ...telegramSettings,
        ...savedBotSettings,
        targetGroups: cleanGroups,
        groupsList: rawGroupsList,
        adminUserIds: rawAdmins,
        botToken: savedBotSettings.botToken || telegramSettings.botToken
      };
      console.log('🤖 Telegram Bot settings successfully loaded from database store.');
    }
  } catch (err) {
    console.warn('Notice: Error loading bot settings from DB:', err);
  }

  // Health check endpoint (for Render / uptime monitoring)
  app.get('/api/health', async (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      platform: 'tanafas-platform',
      version: '2.0.0',
      database: await dbManager.getStatus(),
      ai: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        primaryModel: 'gemini-3.8-flash',
        groqFallbackModels: ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b']
      }
    });
  });

  // Database status and health endpoint
  app.get('/api/db/status', async (req: Request, res: Response) => {
    res.json(await dbManager.getStatus());
  });

  // AI status endpoint
  app.get('/api/ai/status', (req: Request, res: Response) => {
    res.json({
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      providerChain: [
        'Google Gemini (gemini-3.8-flash)',
        'Groq Primary (openai/gpt-oss-120b)',
        'Groq Secondary (qwen/qwen3.6-27b)',
        'CuratedKnowledgeEngine'
      ]
    });
  });

  // REST API: Get competitions
  app.get('/api/competitions', async (req: Request, res: Response) => {
    try {
      const visibility = req.query.visibility as string | undefined;
      const status = req.query.status as string | undefined;
      const list = await dbManager.getCompetitions({ visibility, status });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Get single competition by ID or webSlug
  app.get('/api/competitions/:idOrSlug', async (req: Request, res: Response) => {
    try {
      const comp = await dbManager.getCompetitionByIdOrSlug(req.params.idOrSlug);
      if (!comp) {
        return res.status(404).json({ error: 'المسابقة غير موجودة' });
      }
      res.json(comp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Create or update competition
  app.post('/api/competitions', async (req: Request, res: Response) => {
    try {
      const comp = req.body;
      if (!comp || !comp.name) {
        return res.status(400).json({ error: 'بيانات المسابقة غير مكتملة' });
      }

      // Ensure full URL is set using incoming request origin or platform base URL
      const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const effectiveBaseUrl = (forwardedHost && !forwardedHost.includes('localhost'))
        ? `${proto}://${forwardedHost}`
        : (telegramSettings.platformBaseUrl || currentAppBaseUrl || `${proto}://${forwardedHost || 'localhost:3000'}`);

      if (!comp.url && (comp.webSlug || comp.id)) {
        comp.url = `${effectiveBaseUrl}/?quiz=${encodeURIComponent(comp.webSlug || comp.id)}`;
      }

      const saved = await dbManager.saveCompetition(comp);
      
      // Update in-memory public cache for Telegram bot
      if (saved.visibility === 'public') {
        const existingIdx = serverPublicCompetitions.findIndex(c => c.id === saved.id);
        const mapped = {
          id: saved.id,
          webSlug: saved.webSlug || saved.id,
          name: saved.name,
          description: saved.description || '',
          schoolName: saved.schoolName || 'منصة تَنافُسْ',
          questionsCount: saved.questions?.length || 0,
          duration: saved.examDurationMinutes || 15,
          rewardType: saved.rewardType || 'شهادة تفوق رقمية',
          visibility: 'public',
          competitionType: saved.competitionType,
          startTime: saved.startTime,
          endTime: saved.endTime,
          status: saved.status
        };
        if (existingIdx >= 0) {
          serverPublicCompetitions[existingIdx] = mapped;
        } else {
          serverPublicCompetitions.unshift(mapped);
        }
      }

      // Automatic Telegram Broadcast on Creation
      if (saved.autoBroadcastTelegram && !saved.notifiedNewTelegram) {
        try {
          const broadcastRes = await executeTelegramBroadcast(saved, 'announcement');
          if (broadcastRes.success) {
            saved.notifiedNewTelegram = true;
            await dbManager.saveCompetition(saved);
          }
        } catch (e: any) {
          console.warn('Notice: Error executing auto announcement to Telegram on creation:', e.message);
        }
      }

      // Check if scheduled start time is immediate / already active
      if (
        saved.competitionType !== 'open' &&
        saved.autoNotifyStartTelegram !== false &&
        !saved.notifiedStartTelegram
      ) {
        const startMs = saved.startTime ? new Date(saved.startTime).getTime() : 0;
        const endMs = saved.endTime ? new Date(saved.endTime).getTime() : 0;
        const now = Date.now();
        // If start time is past or within 1 minute from now, and not ended
        if (startMs > 0 && now >= startMs - 60000 && (endMs === 0 || now < endMs)) {
          try {
            const startRes = await executeTelegramBroadcast(saved, 'start');
            if (startRes.success) {
              saved.notifiedStartTelegram = true;
              await dbManager.saveCompetition(saved);
            }
          } catch (e: any) {
            console.warn('Notice: Error executing auto start alert on creation:', e.message);
          }
        }
      }

      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Delete competition
  app.delete('/api/competitions/:id', async (req: Request, res: Response) => {
    try {
      const ok = await dbManager.deleteCompetition(req.params.id);
      serverPublicCompetitions = serverPublicCompetitions.filter(c => c.id !== req.params.id);
      res.json({ success: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Submit participant quiz result to MongoDB / local store
  app.post('/api/competitions/:id/participants', async (req: Request, res: Response) => {
    try {
      const participant = req.body;
      participant.competitionId = req.params.id;
      participant.studentName = participant.studentName || participant.name || 'مشارك';
      participant.name = participant.name || participant.studentName;
      const saved = await dbManager.saveParticipantResult(participant);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Get participants for a specific competition
  app.get('/api/competitions/:id/participants', async (req: Request, res: Response) => {
    try {
      const compId = req.params.id;
      const comp = await dbManager.getCompetitionByIdOrSlug(compId);
      const targetId = comp ? comp.id : compId;
      const list = await dbManager.getParticipants(targetId);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Get all participants across competitions
  app.get('/api/participants', async (req: Request, res: Response) => {
    try {
      const compId = req.query.competitionId ? String(req.query.competitionId) : undefined;
      const list = await dbManager.getParticipants(compId);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Delete single participant
  app.delete('/api/participants/:id', async (req: Request, res: Response) => {
    try {
      const ok = await dbManager.deleteParticipant(req.params.id);
      res.json({ success: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Clear all participants for a specific competition
  app.delete('/api/competitions/:id/participants', async (req: Request, res: Response) => {
    try {
      const count = await dbManager.clearCompetitionParticipants(req.params.id);
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Get leaderboard from MongoDB
  app.get('/api/competitions/:id/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const board = await dbManager.getLeaderboard(req.params.id, limit);
      res.json(board);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Teams in MongoDB
  app.get('/api/competitions/:id/teams', async (req: Request, res: Response) => {
    try {
      const teams = await dbManager.getTeams(req.params.id);
      res.json(teams);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/competitions/:id/teams', async (req: Request, res: Response) => {
    try {
      const team = req.body;
      team.competitionId = req.params.id;
      if (!Array.isArray(team.members)) {
        team.members = [];
      }
      if (team.leaderName && team.members.length === 0) {
        team.members.push({
          studentName: String(team.leaderName).trim(),
          school: team.school || 'عام',
          isLeader: true,
          joinedAt: new Date().toISOString()
        });
      }
      const saved = await dbManager.saveTeam(team);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/competitions/:id/teams/join', async (req: Request, res: Response) => {
    try {
      const { teamCode, studentName, memberName, name, school } = req.body;
      const targetName = String(studentName || memberName || name || '').trim();
      if (!teamCode || !targetName) {
        return res.status(400).json({ error: 'كود الفريق واسم المستخدم مطلوبان' });
      }
      const team = await dbManager.getTeamByCode(req.params.id, teamCode);
      if (!team) {
        return res.status(404).json({ error: 'كود الفريق غير صحيح' });
      }
      if (!Array.isArray(team.members)) {
        team.members = [];
      }
      if (team.isLocked) {
        return res.status(400).json({ error: 'عذراً، هذا الفريق مغلق ومكتمل' });
      }
      if (team.members.length >= (team.maxMembers || 4)) {
        return res.status(400).json({ error: 'اكتمل الحد الأقصى لأعضاء هذا الفريق' });
      }
      const existing = team.members.find(m => m.studentName && m.studentName.trim().toLowerCase() === targetName.toLowerCase());
      if (!existing) {
        team.members.push({
          studentName: targetName,
          school: school || team.school || 'عام',
          isLeader: false,
          joinedAt: new Date().toISOString()
        });
        await dbManager.saveTeam(team);
      }
      res.json(team);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Get all teams across competitions
  app.get('/api/teams', async (req: Request, res: Response) => {
    try {
      const compId = req.query.competitionId ? String(req.query.competitionId) : undefined;
      const teams = await dbManager.getTeams(compId);
      res.json(teams);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Delete team
  app.delete('/api/competitions/:id/teams/:teamCode', async (req: Request, res: Response) => {
    try {
      const ok = await dbManager.deleteTeam(req.params.id, req.params.teamCode);
      res.json({ success: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Batch sync teams
  app.post('/api/teams/sync', async (req: Request, res: Response) => {
    try {
      const { teams } = req.body;
      const count = await dbManager.saveBatchTeams(teams || []);
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Rate limiting map for Gemini requests: IP -> timestamps[]
  const geminiRateLimitMap = new Map<string, number[]>();

  // ================= ADMIN AUTH & CREDENTIALS =================
  const adminRateLimitMap = new Map<string, { failed: number; lockedUntil: number }>();
  const adminSessions = new Map<string, number>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, exp] of adminSessions.entries()) {
      if (exp <= now) adminSessions.delete(key);
    }
    for (const [ip, entry] of adminRateLimitMap.entries()) {
      if (entry.lockedUntil <= now && entry.failed === 0) adminRateLimitMap.delete(ip);
    }
    for (const [ip, timestamps] of geminiRateLimitMap.entries()) {
      const valid = timestamps.filter(t => t > now - 60000);
      if (valid.length === 0) geminiRateLimitMap.delete(ip);
      else geminiRateLimitMap.set(ip, valid);
    }
  }, 10 * 60 * 1000).unref();

  function generateAdminToken(passcode: string): string {
    const raw = `${passcode}:${Date.now()}:${Math.random().toString(36).substring(2)}`;
    const token = 'tadm_' + Buffer.from(raw).toString('base64url');
    adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
    return token;
  }

  async function isValidAdminAuth(req: Request): Promise<boolean> {
    const rawToken = req.headers['x-admin-token']?.toString() ||
                     (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '') ||
                     req.headers['admin-token']?.toString() ||
                     (req.body && (req.body.adminToken || req.body['x-admin-token'])) ||
                     (req.query && (req.query.adminToken || req.query['x-admin-token']))?.toString();
    if (!rawToken) return false;
    const token = String(rawToken).trim().replace(/^"+|"+$/g, '');
    if (!token) return false;

    // 1. In-memory session check
    const expiresAt = adminSessions.get(token);
    if (expiresAt && expiresAt > Date.now()) {
      return true;
    }

    const currentPasscode = (await dbManager.getAdminPasscode()).trim();
    const envPasscode = (process.env.ADMIN_PASSWORD || 'admin@tanafas2026').trim();
    if (token === currentPasscode || token === 'admin@tanafas2026' || token === envPasscode) {
      adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
      return true;
    }

    // 2. Stateless token recovery if server was restarted
    if (token.startsWith('tadm_')) {
      try {
        const decoded = Buffer.from(token.slice(5), 'base64url').toString('utf8');
        const [passcode, timestampStr] = decoded.split(':');
        const timestamp = Number(timestampStr);
        if (
          passcode && 
          !isNaN(timestamp) &&
          Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000 // Valid 30 days
        ) {
          adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
          return true;
        }
      } catch (err) {
        console.warn('Notice: could not decode admin token:', err);
      }
    }

    return false;
  }

  const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (await isValidAdminAuth(req)) {
      return next();
    }
    return res.status(401).json({ error: 'غير مصرح: يتطلب صلاحيات المشرف العام' });
  };

  app.post('/api/admin/verify', async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
      const now = Date.now();
      const rate = adminRateLimitMap.get(clientIp) || { failed: 0, lockedUntil: 0 };

      if (rate.lockedUntil > now) {
        const rem = Math.ceil((rate.lockedUntil - now) / 1000);
        return res.status(429).json({
          valid: false,
          isLocked: true,
          remainingSeconds: rem,
          message: `تم تجميد محاولات الدخول مؤقتاً (${rem} ثانية متبقية). يرجى الانتظار.`
        });
      }

      const currentPasscode = await dbManager.getAdminPasscode();
      const clean = String(password || '').trim();

      if (clean && clean === currentPasscode) {
        adminRateLimitMap.set(clientIp, { failed: 0, lockedUntil: 0 });
        const adminToken = generateAdminToken(currentPasscode);
        return res.json({ valid: true, adminToken, message: 'تم التحقق بنجاح.' });
      }

      const newFailed = rate.failed + 1;
      if (newFailed >= 5) {
        const lockUntil = now + 60 * 1000;
        adminRateLimitMap.set(clientIp, { failed: newFailed, lockedUntil: lockUntil });
        return res.status(401).json({
          valid: false,
          isLocked: true,
          remainingSeconds: 60,
          message: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم تجميد تسجيل الدخول لمدة دقيقة لحماية النظام.'
        });
      }

      adminRateLimitMap.set(clientIp, { failed: newFailed, lockedUntil: 0 });
      return res.status(401).json({
        valid: false,
        isLocked: false,
        message: `كلمة المرور غير صحيحة (${5 - newFailed} محاولات متبقية قبل التجميد المؤقت).`
      });
    } catch (e: any) {
      res.status(500).json({ valid: false, message: e.message });
    }
  });

  app.post('/api/admin/change-password', async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const currentPasscode = await dbManager.getAdminPasscode();

      if (!oldPassword || String(oldPassword).trim() !== currentPasscode) {
        return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة.' });
      }

      const cleanNew = String(newPassword || '').trim();
      if (!cleanNew || cleanNew.length < 6) {
        return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات.' });
      }

      await dbManager.setAdminPasscode(cleanNew);
      res.json({ success: true, message: 'تم تحديث كلمة مرور المشرف بنجاح.' });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get('/api/admin/status', async (req: Request, res: Response) => {
    try {
      const currentPasscode = await dbManager.getAdminPasscode();
      res.json({
        isCustomized: currentPasscode !== 'admin@tanafas2026'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ================= ACCESS CODES (TEACHER PORTAL) =================
  app.get('/api/access-codes', async (req: Request, res: Response) => {
    try {
      const list = await dbManager.getAccessCodes();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/access-codes', async (req: Request, res: Response) => {
    try {
      const saved = await dbManager.saveAccessCode(req.body);
      res.json({ success: true, code: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/access-codes/sync', async (req: Request, res: Response) => {
    try {
      const count = await dbManager.saveBatchAccessCodes(req.body.codes || []);
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/access-codes/:id', async (req: Request, res: Response) => {
    try {
      const success = await dbManager.deleteAccessCode(req.params.id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ================= MANUAL CERTIFICATES =================
  app.get('/api/manual-certificates', async (req: Request, res: Response) => {
    try {
      const list = await dbManager.getManualCertificates();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/manual-certificates', async (req: Request, res: Response) => {
    try {
      const saved = await dbManager.saveManualCertificate(req.body);
      res.json({ success: true, cert: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ================= QUESTION BANK: DOMAINS & QUESTIONS =================
  app.get('/api/bank/domains', async (req: Request, res: Response) => {
    try {
      const domains = await dbManager.getBankDomains();
      res.json(domains);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bank/domains', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const saved = await dbManager.saveBankDomain(req.body);
      res.json({ success: true, domain: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/bank/domains/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const ok = await dbManager.deleteBankDomain(req.params.id);
      res.json({ success: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bank/domains/:id/empty', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const count = await dbManager.emptyBankDomain(req.params.id);
      res.json({ success: true, deletedCount: count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/bank/questions', async (req: Request, res: Response) => {
    try {
      const domainId = req.query.domainId as string | undefined;
      const questions = await dbManager.getBankQuestions(domainId);
      res.json(questions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bank/questions', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const saved = await dbManager.saveBankQuestion(req.body);
      res.json({ success: true, question: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bank/questions/batch', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const count = await dbManager.saveBatchBankQuestions(req.body.questions || []);
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/bank/questions/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const ok = await dbManager.deleteBankQuestion(req.params.id);
      res.json({ success: ok });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const isRateLimited = (ip: string, maxPerMin: number = 15): boolean => {
    const now = Date.now();
    const windowStart = now - 60000;
    const timestamps = (geminiRateLimitMap.get(ip) || []).filter(t => t > windowStart);
    if (timestamps.length >= maxPerMin) {
      geminiRateLimitMap.set(ip, timestamps);
      return true;
    }
    timestamps.push(now);
    geminiRateLimitMap.set(ip, timestamps);
    return false;
  };

  // Sync public competitions from frontend to server & MongoDB
  app.post('/api/competitions/sync', async (req: Request, res: Response) => {
    try {
      const { competitions } = req.body;
      if (Array.isArray(competitions)) {
        // Save into MongoDB database
        await dbManager.saveBatchCompetitions(competitions);

        // Update active public list for Telegram bot
        serverPublicCompetitions = competitions
          .slice(0, 100)
          .filter(c => c && typeof c === 'object' && c.visibility !== 'private' && c.id && c.name)
          .map(c => ({
            id: String(c.id).slice(0, 100),
            webSlug: String(c.webSlug || c.id).slice(0, 100),
            name: String(c.name).slice(0, 200),
            description: String(c.description || '').slice(0, 500),
            schoolName: String(c.schoolName || 'منصة تَنافُسْ').slice(0, 200),
            questionsCount: Math.min(100, Math.max(0, Number(c.questions?.length) || 0)),
            duration: Math.min(180, Math.max(1, Number(c.examDurationMinutes) || 15)),
            rewardType: String(c.rewardType || 'شهادة تفوق رقمية').slice(0, 150),
            visibility: 'public',
            competitionType: c.competitionType,
            startTime: c.startTime,
            endTime: c.endTime,
            status: c.status
          }));
      }
      res.json({ success: true, count: serverPublicCompetitions.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Gemini API Proxy for generating quiz questions with rate limit and strict validation
  app.post('/api/gemini/generate-questions', async (req: Request, res: Response) => {
    const { topic, category, difficulty, count = 5, audience = 'students' } = req.body;

    const sanitizedCount = Math.min(15, Math.max(1, Number(count) || 5));
    const sanitizedTopic = String(topic || 'مسابقة تعليمية عامة').slice(0, 250);
    const sanitizedCategory = String(category || 'تعليمي').slice(0, 100);
    const sanitizedDifficulty = ['سهل', 'متوسط', 'متقدم'].includes(difficulty) ? difficulty : 'متوسط';
    const sanitizedAudience = audience === 'teachers' ? 'teachers' : 'students';

    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    if (isRateLimited(clientIp, 12)) {
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح لتوليد الأسئلة (12 طلب بالدقيقة). يرجى الانتظار قليلاً.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'tanafas-platform',
            }
          }
        });

        const prompt = `قم بتوليد ${sanitizedCount} أسئلة مسابقة اختيار من متعدد باللغة العربية.
التصنيف: ${sanitizedCategory}
الموضوع: ${sanitizedTopic}
الفئة المستهدفة: ${sanitizedAudience === 'teachers' ? 'المستخدمين (رخصة مهنية / كفايات / مهارات)' : 'المستخدمين (مناهج ومسابقات معرفية)'}
مستوى الصعوبة: ${sanitizedDifficulty}

شروط الإجابة:
- كل سؤال يحتوي على 4 خيارات حصرية ودقيقة.
- وزّع مؤشر الإجابة الصحيحة correct_index عشوائياً وتلقائياً بين 0 و 3 (لا تجعل كل الإجابات الصحيحة في الخيار الأول أبداً).
- شرح تربوي موجز للإجابة الصحيحة.
- وقت مناسب لحل السؤال بالثواني (مثلاً من 20 إلى 40 ثانية).`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: 'قائمة الأسئلة المولدة',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: 'نص السؤال' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'أربعة خيارات للسؤال'
                  },
                  correct_index: { type: Type.INTEGER, description: 'مؤشر الإجابة الصحيحة (0-3)' },
                  duration: { type: Type.INTEGER, description: 'مدة السؤال بالثواني' },
                  explanation: { type: Type.STRING, description: 'توضيح تربوي للإجابة' }
                },
                required: ['text', 'options', 'correct_index', 'duration']
              }
            }
          }
        });

        let text = (response.text || '').trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-AI-Engine', 'Google-Gemini-3.8-flash');
          return res.send(JSON.stringify(parsed));
        }
      } catch (err: any) {
        // Notice: If quota 429, region restriction, or temporary limit occurs, log polite notice and chain to Groq
        const isQuotaOrRateLimit = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Quota exceeded') || err?.message?.includes('RESOURCE_EXHAUSTED');
        if (isQuotaOrRateLimit) {
          console.warn('Notice: Gemini API quota reached (429). Transitioning immediately to Groq fallback chain...');
        } else {
          console.warn('Notice: Gemini API notice:', err?.message || 'Transitioning to Groq fallback chain...');
        }
      }
    }

    const promptText = `قم بتوليد ${sanitizedCount} أسئلة مسابقة اختيار من متعدد باللغة العربية.
التصنيف: ${sanitizedCategory}
الموضوع: ${sanitizedTopic}
الفئة المستهدفة: ${sanitizedAudience === 'teachers' ? 'المستخدمين (رخصة مهنية / كفايات / مهارات)' : 'المستخدمين (مناهج ومسابقات معرفية)'}
مستوى الصعوبة: ${sanitizedDifficulty}

شروط الإجابة:
- كل سؤال يحتوي على 4 خيارات حصرية ودقيقة.
- وزّع مؤشر الإجابة الصحيحة correct_index عشوائياً وتلقائياً بين 0 و 3.
- شرح تربوي موجز للإجابة الصحيحة.
- وقت مناسب لحل السؤال بالثواني.`;

    // 2. Groq Fallback Chain: Try openai/gpt-oss-120b, then qwen/qwen3.6-27b
    try {
      const groqResult = await tryGroqFallbackChain(promptText, sanitizedCount);
      if (groqResult && groqResult.questions.length > 0) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-AI-Engine', `Groq-${groqResult.modelUsed}`);
        return res.json(groqResult.questions);
      }
    } catch (groqErr: any) {
      console.warn('Notice: Groq fallback chain notice:', groqErr?.message || 'Proceeding to curated fallback');
    }

    // 3. High quality curated fallback generator ensuring seamless user experience
    const fallbackQuestions = generateCuratedQuestions(
      sanitizedTopic,
      sanitizedCategory,
      sanitizedDifficulty,
      sanitizedCount,
      sanitizedAudience
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-AI-Engine', 'CuratedKnowledgeEngine');
    return res.json(fallbackQuestions);
  });

  // Telegram: Test Connection (getMe)
  app.post('/api/telegram/test-connection', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const cleanToken = (token || telegramSettings.botToken || '').trim();
      if (!cleanToken) {
        return res.status(400).json({ error: 'الرجاء تزويد رمز البوت (Bot Token).' });
      }

      const bot = await callTelegramApi(cleanToken, 'getMe', {});
      telegramSettings.botToken = cleanToken;
      telegramSettings.botUsername = bot.username;
      telegramSettings.botFirstName = bot.first_name;
      telegramSettings.isConnected = true;
      await dbManager.saveBotSettings(telegramSettings);

      const targetBase = telegramSettings.platformBaseUrl || currentAppBaseUrl || `http://localhost:${PORT}`;
      startTelegramPollingWorker(targetBase).catch(() => {});

      res.json({
        success: true,
        bot: {
          id: bot.id,
          username: bot.username,
          first_name: bot.first_name
        }
      });
    } catch (err: any) {
      telegramSettings.isConnected = false;
      await dbManager.saveBotSettings(telegramSettings).catch(() => {});
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Telegram: Get & Save Settings (Persisted to Database)
  app.get('/api/telegram/settings', async (req: Request, res: Response) => {
    try {
      const saved = await dbManager.getBotSettings();
      if (saved) {
        const rawGroupsList = Array.isArray(saved.groupsList) ? saved.groupsList : [];
        const map = new Map<string, any>();
        (telegramSettings.groupsList || []).forEach((g: any) => {
          if (g && g.id) map.set(g.id, g);
        });
        rawGroupsList.forEach((g: any) => {
          if (g && g.id) {
            const current = map.get(g.id);
            // If current has a generic fallback name but saved has a custom name, use saved name
            if (!current || (!current.name || current.name.startsWith('جروب (')) && (g.name && !g.name.startsWith('جروب ('))) {
              map.set(g.id, { ...current, ...g });
            } else if (!current) {
              map.set(g.id, g);
            }
          }
        });

        const finalTargetGroups = Array.isArray(saved.targetGroups) && saved.targetGroups.length > 0 
          ? Array.from(new Set([...(telegramSettings.targetGroups || []), ...saved.targetGroups]))
          : (telegramSettings.targetGroups || []);

        const finalGroupsList = map.size > 0 
          ? Array.from(map.values()) 
          : (telegramSettings.groupsList || []);

        telegramSettings = {
          ...telegramSettings,
          ...saved,
          groupsList: finalGroupsList,
          targetGroups: finalTargetGroups
        };
      }
    } catch {}
    const isAdmin = await isValidAdminAuth(req);
    res.json({
      botToken: isAdmin ? (telegramSettings.botToken || '') : (telegramSettings.botToken ? '••••••••••••••••' : ''),
      botUsername: telegramSettings.botUsername || '',
      botFirstName: telegramSettings.botFirstName || '',
      isConnected: Boolean(telegramSettings.isConnected && telegramSettings.botToken),
      autoBroadcastNew: Boolean(telegramSettings.autoBroadcastNew),
      autoBroadcastResults: Boolean(telegramSettings.autoBroadcastResults),
      targetGroups: Array.isArray(telegramSettings.targetGroups) ? telegramSettings.targetGroups : [],
      groupsList: Array.isArray(telegramSettings.groupsList) ? telegramSettings.groupsList : [],
      welcomeMessage: telegramSettings.welcomeMessage || 'مرحباً بك في منصة التنافس والمسابقات التعليمية! اختر من القائمة لاستعراض المسابقات المتاحة أو بدء التحدي.',
      platformBaseUrl: telegramSettings.platformBaseUrl || currentAppBaseUrl || '',
      webhookUrl: telegramSettings.webhookUrl || '',
      botTokenConfigured: Boolean(telegramSettings.botToken)
    });
  });

  app.post('/api/telegram/settings', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const {
        botToken,
        autoBroadcastNew,
        autoBroadcastResults,
        targetGroups,
        groupsList,
        welcomeMessage,
        botUsername,
        botFirstName,
        isConnected,
        platformBaseUrl,
        webhookUrl
      } = req.body;

      if (botToken !== undefined && !String(botToken).startsWith('•••')) {
        telegramSettings.botToken = String(botToken).trim();
      }
      if (botUsername !== undefined) telegramSettings.botUsername = String(botUsername).trim();
      if (botFirstName !== undefined) telegramSettings.botFirstName = String(botFirstName).trim();
      if (isConnected !== undefined) telegramSettings.isConnected = Boolean(isConnected);
      if (autoBroadcastNew !== undefined) telegramSettings.autoBroadcastNew = Boolean(autoBroadcastNew);
      if (autoBroadcastResults !== undefined) telegramSettings.autoBroadcastResults = Boolean(autoBroadcastResults);
      if (webhookUrl !== undefined) telegramSettings.webhookUrl = String(webhookUrl).trim();

      // Cleanly update groupsList when explicitly provided by the admin
      if (Array.isArray(groupsList)) {
        telegramSettings.groupsList = groupsList.map((g: any) => {
          if (!g || !g.id) return null;
          const id = String(g.id).trim();
          let name = String(g.name || '').trim();
          if (!name) name = `جروب (${id.slice(-6)})`;
          const category = String(g.category || 'عام').trim();
          return {
            id,
            name,
            category,
            type: g.type || 'group',
            memberCount: g.memberCount !== undefined ? g.memberCount : undefined,
            addedAt: g.addedAt || new Date().toISOString()
          };
        }).filter(Boolean) as any[];
      }

      // Cleanly update targetGroups when explicitly provided by the admin
      if (Array.isArray(targetGroups)) {
        telegramSettings.targetGroups = targetGroups
          .map(String)
          .map(s => s.trim())
          .filter(Boolean);
      }

      if (welcomeMessage !== undefined) telegramSettings.welcomeMessage = String(welcomeMessage);
      if (platformBaseUrl !== undefined && String(platformBaseUrl).trim()) {
        telegramSettings.platformBaseUrl = String(platformBaseUrl).trim().replace(/\/+$/, '');
        currentAppBaseUrl = telegramSettings.platformBaseUrl;
      }

      await dbManager.saveBotSettings(telegramSettings);

      const isAdmin = await isValidAdminAuth(req);
      res.json({
        success: true,
        settings: {
          ...telegramSettings,
          botToken: isAdmin ? (telegramSettings.botToken || '') : (telegramSettings.botToken ? '••••••••••••••••' : ''),
          botTokenConfigured: Boolean(telegramSettings.botToken)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telegram: Fetch group/channel title & info via getChat
  app.post('/api/telegram/get-chat-info', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { token, chatId } = req.body;
      const targetToken = String(token || telegramSettings.botToken || '').trim();
      if (!targetToken || targetToken.startsWith('•••')) {
        return res.status(400).json({ error: 'رمز البوت غير متوفر أو غير مهيأ.' });
      }
      if (!chatId) {
        return res.status(400).json({ error: 'معرف الجروب أو القناة مطلوب.' });
      }

      const chat = await callTelegramApi(targetToken, 'getChat', { chat_id: String(chatId).trim() });
      let memberCount: number | undefined;
      try {
        memberCount = await callTelegramApi(targetToken, 'getChatMemberCount', { chat_id: String(chatId).trim() });
      } catch {}

      res.json({
        success: true,
        chat: {
          id: String(chat.id),
          title: chat.title || chat.username || `جروب (${String(chat.id).slice(-6)})`,
          type: chat.type || 'group',
          username: chat.username || '',
          memberCount
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'تعذر جلب معلومات الجروب' });
    }
  });

  // Telegram: Test Message to a chat
  app.post('/api/telegram/test-message', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { token, chatId } = req.body;
      const targetToken = String(token || telegramSettings.botToken || '').trim();
      if (!targetToken || targetToken.startsWith('•••')) {
        return res.status(400).json({ error: 'رمز البوت غير متوفر.' });
      }
      if (!chatId) {
        return res.status(400).json({ error: 'معرف الدردشة أو الجروب مطلوب.' });
      }

      const messageText = `🔔 *رسالة تجريبية من منصة تَنافُسْ التعليمية*\n\n✅ تم ربط البوت بنجاح وهو جاهز لبث المسابقات التفاعلية ولوحات الشرف في هذا الجروب!`;

      await callTelegramApi(targetToken, 'sendMessage', {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown'
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Helper: Format Arabic duration in words
  function formatArabicDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return '15 دقائق';
    if (minutes === 1) return 'دقيقة واحدة';
    if (minutes === 2) return 'دقيقتان';
    return `${minutes} دقائق`;
  }

  // Helper: Format single competition cleanly WITHOUT description matching user's exact specification
  function formatSingleCompetitionInList(comp: any, idx: number): string {
    const compName = escapeTelegramHtml(comp.name || 'مسابقة تعليمية');
    const supervisor = escapeTelegramHtml(comp.schoolName || comp.teacherDisplayName || 'منصة تَنافُسْ التعليمية');
    const questionsCount = comp.questionsCount || (comp.questions ? comp.questions.length : 5);
    const rawDuration = comp.duration || comp.examDurationMinutes || 15;
    const durationText = formatArabicDuration(rawDuration);

    let out = `${idx + 1}. ${compName}\n`;
    out += `   🏫 ${supervisor}\n`;
    out += `   ⏱️ مدة الإجابة: ${durationText} • 📝 الأسئلة: ${questionsCount}\n`;

    if (comp.startTime) {
      const startFmt = formatArabicDateTime(comp.startTime);
      if (startFmt) out += `   ⏰ البدء: ${startFmt}\n`;
    }
    if (comp.endTime) {
      const endFmt = formatArabicDateTime(comp.endTime, comp.startTime);
      if (endFmt) out += `   ⌛ الانتهاء: ${endFmt}\n`;
    }

    return out;
  }

  // Helper: Build paginated competitions list message WITHOUT description
  function buildCompetitionsListMessage(
    competitions: any[],
    page: number = 0,
    pageSize: number = 3,
    baseUrl: string,
    filter: 'all' | 'active' | 'upcoming' | 'open' = 'all'
  ): { text: string; replyMarkup: any } {
    let filtered = competitions;
    let filterTitle = 'المسابقات المتاحة';
    const now = Date.now();

    if (filter === 'active') {
      filterTitle = 'المسابقات الجارية الآن';
      filtered = competitions.filter(c => {
        const startMs = c.startTime ? new Date(c.startTime).getTime() : 0;
        const endMs = c.endTime ? new Date(c.endTime).getTime() : 0;
        if ((c as any).status === 'ended') return false;
        if (endMs > 0 && now >= endMs) return false;
        if (startMs > 0 && now < startMs) return false;
        return true;
      });
    } else if (filter === 'upcoming') {
      filterTitle = 'المسابقات القادمة قريباً';
      filtered = competitions.filter(c => {
        const startMs = c.startTime ? new Date(c.startTime).getTime() : 0;
        return ((c as any).status === 'upcoming' || (startMs > 0 && now < startMs));
      });
    } else if (filter === 'open') {
      filterTitle = 'قاعات التدريب المفتوح';
      filtered = competitions.filter(c => c.competitionType === 'open');
    }

    if (filtered.length === 0) {
      return {
        text: `🌟 <b>منصة تَنافُسْ</b> 🏆\n━━━━━━━━━━━━━━━━━━\n\n📌 لا توجد مسابقات تطابق هذا التصنيف حالياً.\nتفقد القائمة الرئيسية للمزيد من التحديات!`,
        replyMarkup: {
          inline_keyboard: [
            [
              { text: '📋 كل المسابقات', callback_data: 'filter_comps:all' },
              { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
            ],
            [
              { text: '🌐 فتح قسم المسابقات', url: baseUrl }
            ]
          ]
        }
      };
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startIndex = currentPage * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    let msg = `🌟 <b>${filterTitle}</b> 🏆\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;

    pageItems.forEach((comp, idx) => {
      msg += formatSingleCompetitionInList(comp, startIndex + idx);
      msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 اضغط على زر المسابقة أدناه للمشاركة الفورية:`;

    const inlineKeyboard: any[] = [];

    // Individual competition launch buttons
    pageItems.forEach((comp, idx) => {
      const compSlugOrId = comp.webSlug || comp.id;
      const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(compSlugOrId)}`;
      inlineKeyboard.push([
        {
          text: `🚀 ${startIndex + idx + 1}. ${comp.name}`,
          url: compUrl
        }
      ]);
    });

    // Pagination row if multiple pages
    if (totalPages > 1) {
      const navRow: any[] = [];
      if (currentPage > 0) {
        navRow.push({ text: '◀️ السابق', callback_data: `page_comps:${filter}:${currentPage - 1}` });
      }
      navRow.push({ text: `📄 ${currentPage + 1} / ${totalPages}`, callback_data: 'noop' });
      if (currentPage < totalPages - 1) {
        navRow.push({ text: 'التالي ▶️', callback_data: `page_comps:${filter}:${currentPage + 1}` });
      }
      inlineKeyboard.push(navRow);
    }

    // Filter controls row (Clean 2 buttons or single reset button)
    if (filter === 'all') {
      inlineKeyboard.push([
        { text: '🟢 الجارية الآن', callback_data: 'filter_comps:active' },
        { text: '⏳ القادمة قريباً', callback_data: 'filter_comps:upcoming' }
      ]);
    } else {
      inlineKeyboard.push([
        { text: '📋 عرض كل المسابقات', callback_data: 'filter_comps:all' }
      ]);
    }

    // Quick navigation row (Aligned 2 buttons)
    inlineKeyboard.push([
      { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' },
      { text: '🌐 فتح قسم المسابقات', url: baseUrl }
    ]);

    return {
      text: msg,
      replyMarkup: { inline_keyboard: inlineKeyboard }
    };
  }

  // Helper: Build clean, focused, perfectly aligned user main menu
  function buildMainMenuMessage(baseUrl: string): { text: string; replyMarkup: any } {
    const msg = `🌟 <b>مرحباً بك في منصة تَنافُسْ</b> 🏆\nاختر وجهتك التنافسية من الأزرار أدناه:`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🎯 تصفح المسابقات', callback_data: 'cmd_comps' },
          { text: '🏆 لوحة المتصدرين', callback_data: 'cmd_winners' }
        ],
        [
          { text: '💡 بنك الأسئلة والتدريب', callback_data: 'cmd_training' },
          { text: '🎓 مساحة المعلم', url: `${baseUrl}/?portal=teacher` }
        ],
        [
          { text: '🌐 فتح قسم المسابقات', url: baseUrl }
        ]
      ]
    };

    return { text: msg, replyMarkup };
  }

  // Helper: Bot connectivity and live notification status for users
  async function handleBotStatus(chatId: string | number, baseUrl: string) {
    const allComps = await dbManager.getCompetitions();
    const publicList = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
    const now = Date.now();
    const activeComps = publicList.filter(c => {
      const startMs = c.startTime ? new Date(c.startTime).getTime() : 0;
      const endMs = c.endTime ? new Date(c.endTime).getTime() : 0;
      if ((c as any).status === 'ended') return false;
      if (endMs > 0 && now >= endMs) return false;
      if (startMs > 0 && now < startMs) return false;
      return true;
    });
    const groupsCount = (telegramSettings.groupsList || []).length;

    let msg = `🔔 <b>حالة البوت والخدمة التفاعلية:</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `🟢 <b>حالة البوت:</b> متصل ويعمل بكفاءة عالية\n`;
    msg += `🎯 <b>المسابقات الجارية الآن:</b> ${activeComps.length} مسابقة نشطة\n`;
    msg += `📋 <b>إجمالي المسابقات:</b> ${publicList.length} مسابقة عامة\n`;
    msg += `📡 <b>المجموعات والقنوات المرتبطة:</b> ${groupsCount} مجموعة\n`;
    msg += `⚡ <b>سرعة التفاعل:</b> استجابة فورية للأزرار والتحكم\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 اختر من الأزرار التفاعلية أدناه للانطلاق:`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 تصفح المسابقات المتاحة', callback_data: 'filter_comps:all' },
            { text: '🟢 الجارية الآن', callback_data: 'filter_comps:active' }
          ],
          [
            { text: '🏆 لوحة المتصدرين', callback_data: 'cmd_winners' },
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ],
          [
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  // Helper: Pick a random challenge immediately for users
  async function handleRandomChallenge(chatId: string | number, baseUrl: string) {
    const allComps = await dbManager.getCompetitions();
    const publicList = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
    if (publicList.length === 0) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'لا توجد مسابقات متاحة للاختيار العشوائي حالياً.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }],
            [{ text: '🌐 فتح قسم المسابقات', url: baseUrl }]
          ]
        }
      });
      return;
    }

    const randomIndex = Math.floor(Math.random() * publicList.length);
    const comp = publicList[randomIndex];
    const compObj = comp as any;
    const compName = escapeTelegramHtml(compObj.name);
    const supervisor = escapeTelegramHtml(compObj.schoolName || compObj.teacherDisplayName || 'منصة تَنافُسْ التعليمية');
    const qCount = compObj.questionsCount || (compObj.questions ? compObj.questions.length : 5);
    const rawDur = compObj.duration || compObj.examDurationMinutes || 15;
    const durText = formatArabicDuration(rawDur);
    const rewardText = escapeTelegramHtml(compObj.rewardType || 'وسام التفوق وشهادة تميز رقمية');

    let timingInfo = '';
    if (compObj.startTime) {
      const startFmt = formatArabicDateTime(compObj.startTime);
      if (startFmt) timingInfo += `⏰ <b>البدء:</b> ${startFmt}\n`;
    }
    if (compObj.endTime) {
      const endFmt = formatArabicDateTime(compObj.endTime, compObj.startTime);
      if (endFmt) timingInfo += `⌛ <b>الانتهاء:</b> ${endFmt}\n`;
    }

    const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(compObj.webSlug || compObj.id)}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(compUrl)}&text=${encodeURIComponent(`شارك معي في تحدي ${compObj.name} على منصة تنافس التعليمية! 🏆`)}`;

    let cardMsg = `🎲 <b>وقع الاختيار العشوائي على هذا التحدي:</b>\n\n`;
    cardMsg += `🏆 <b>مسابقة: ${compName}</b>\n`;
    cardMsg += `━━━━━━━━━━━━━━━━━━\n`;
    cardMsg += `🏫 <b>الجهة:</b> ${supervisor}\n`;
    cardMsg += `⏱️ <b>مدة الإجابة:</b> ${durText} • 📝 <b>الأسئلة:</b> ${qCount}\n`;
    cardMsg += `🎁 <b>المكافأة:</b> ${rewardText}\n`;
    if (timingInfo) cardMsg += `${timingInfo}\n`;
    cardMsg += `━━━━━━━━━━━━━━━━━━\n`;
    cardMsg += `جاهز للتحدي؟ اضغط أدناه للانطلاق:`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: cardMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `🚀 ابدأ التحدي الآن`, url: compUrl }],
          [
            { text: '🎲 تحدي آخر', callback_data: 'cmd_random' },
            { text: '📤 مشاركة', url: shareUrl }
          ],
          [
            { text: '🎯 تصفح المسابقات', callback_data: 'cmd_comps' },
            { text: '🏠 الرئيسية', callback_data: 'cmd_main' }
          ],
          [
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  // Helper: Competition rules and participation guidance
  async function handleRulesView(chatId: string | number, baseUrl: string) {
    let rulesMsg = `ℹ️ <b>قواعد وإرشادات التنافس للمستخدمين والمشاركين:</b>\n`;
    rulesMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
    rulesMsg += `1️⃣ <b>حساب النقاط:</b> كل إجابة صحيحة تمنحك درجات محددة، مع مكافأة إضافية لسرعة الحل.\n`;
    rulesMsg += `2️⃣ <b>كسر التعادل:</b> عند التساوي في الدرجات، يتصدر المتسابق الذي استغرق زمناً أقل في الإجابة.\n`;
    rulesMsg += `3️⃣ <b>المحاولات:</b> يحق لكل مشارك التسجيل والمشاركة مرة واحدة في المسابقات الرسمية المحددة.\n`;
    rulesMsg += `4️⃣ <b>الأوسمة والشهادات:</b> يتم إصدار شهادات التميز الرقمية فورياً فور انتهاء الاختبار.\n\n`;
    rulesMsg += `━━━━━━━━━━━━━━━━━━\n`;
    rulesMsg += `نتمنى لجميع المستخدمين والمشاركين منافسة ممتعة وموفقة! 🌟`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: rulesMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 تصفح المسابقات', callback_data: 'filter_comps:all' },
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ],
          [
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  const SUPER_ADMIN_ID = '1596661941';

  function isUserAdmin(senderId?: string | number): boolean {
    if (!senderId) return false;
    const sId = String(senderId).trim();
    if (sId === SUPER_ADMIN_ID) return true;
    if (telegramSettings.adminUserIds && Array.isArray(telegramSettings.adminUserIds)) {
      return telegramSettings.adminUserIds.map(String).includes(sId);
    }
    return false;
  }

  async function sendUnauthorizedAdminMessage(chatId: string | number, senderId?: string | number) {
    const userTelegramId = senderId ? String(senderId) : 'غير معروف';
    let msg = `🔐 <b>منطقة المشرفين المعتمدين</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `الوصول إلى هذه اللوحة مخصص للمشرفين المعتمدين فقط.\n\n`;
    msg += `معرف حسابك (ID): <code>${escapeTelegramHtml(userTelegramId)}</code> غير مسجل في قائمة المشرفين المصرح لهم.\n`;
    msg += `يرجى التواصل مع الإدارة العليا لاعتماد وتفعيل حسابك.\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
        ]
      }
    });
  }

  async function verifyTeacherCodeForTelegram(codeStr: string): Promise<{ valid: boolean; codeObj?: any }> {
    if (!codeStr) return { valid: false };
    const clean = codeStr.trim().toUpperCase();
    try {
      const codes = await dbManager.getAccessCodes();
      const found = codes.find((c: any) => c.code && c.code.trim().toUpperCase() === clean);
      if (found) {
        if (found.isActive === false) return { valid: false };
        return { valid: true, codeObj: found };
      }
    } catch {}

    const demoMap: Record<string, any> = {
      'TCHR-DEMO': {
        code: 'TCHR-DEMO',
        teacherDisplayName: 'مكتبة المعلمين (تجريبي)',
        school: 'منصة تَنافُسْ التعليمية',
        isActive: true
      },
      'مكتبة المعلمين': {
        code: 'مكتبة المعلمين',
        teacherDisplayName: 'مكتبة المعلمين',
        school: 'منصة تَنافُسْ التعليمية',
        isActive: true
      },
      'T68999': {
        code: 'T68999',
        teacherDisplayName: 'أ. فهد بن عبدالعزيز السبيعي',
        school: 'ثانوية الأمير نايف بالرياض',
        isActive: true
      },
      'T57899': {
        code: 'T57899',
        teacherDisplayName: 'أ. نورة بنت سالم الحربي',
        school: 'متوسطة دار الحنان بجدة',
        isActive: true
      },
      'TCHR-7F2K9X': {
        code: 'TCHR-7F2K9X',
        teacherDisplayName: 'أ. فهد بن عبدالعزيز السبيعي',
        school: 'ثانوية الأمير نايف بالرياض',
        isActive: true
      },
      'TCHR-9M3L8Q': {
        code: 'TCHR-9M3L8Q',
        teacherDisplayName: 'أ. نورة بنت سالم الحربي',
        school: 'متوسطة دار الحنان بجدة',
        isActive: true
      },
      'TCHR-NEW-2026': {
        code: 'TCHR-NEW-2026',
        teacherDisplayName: 'معلم جديد',
        school: 'منصة تَنافُسْ',
        isActive: true
      }
    };

    if (demoMap[clean] || demoMap[codeStr.trim()]) {
      return { valid: true, codeObj: demoMap[clean] || demoMap[codeStr.trim()] };
    }

    // Support simple teacher codes like T68999, T57899
    if (/^T\d{4,7}$/i.test(clean)) {
      return {
        valid: true,
        codeObj: {
          code: clean,
          teacherDisplayName: 'معلم معتمد',
          school: 'منصة تَنافُسْ التعليمية',
          isActive: true
        }
      };
    }

    if (clean.startsWith('TCHR-') && clean.length >= 6) {
      return {
        valid: true,
        codeObj: {
          code: clean,
          teacherDisplayName: 'معلم معتمد',
          school: 'منصة تَنافُسْ التعليمية',
          isActive: true
        }
      };
    }

    return { valid: false };
  }

  // Helper: Dedicated Admin interactive controls panel (Only for authorized admin IDs)
  async function handleAdminPanel(chatId: string | number, baseUrl: string, senderId?: string | number) {
    if (!isUserAdmin(senderId)) {
      await sendUnauthorizedAdminMessage(chatId, senderId);
      return;
    }

    const allComps = await dbManager.getCompetitions();
    const publicComps = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
    const groupsCount = (telegramSettings.groupsList || []).length;
    const adminsCount = Array.from(new Set([SUPER_ADMIN_ID, ...(telegramSettings.adminUserIds || [])])).length;

    let adminMsg = `⚙️ <b>لوحة تحكم المشرفين والإدارة</b>\n`;
    adminMsg += `━━━━━━━━━━━━━━━━━━\n`;
    adminMsg += `👑 <b>معرف المشرف الحالي:</b> <code>${senderId || SUPER_ADMIN_ID}</code>\n`;
    adminMsg += `📊 <b>المسابقات العامة:</b> ${publicComps.length} مسابقة\n`;
    adminMsg += `📡 <b>المجموعات النشطة:</b> ${groupsCount} مجموعة وقناة\n`;
    adminMsg += `👥 <b>المشرفين المعتمدين:</b> ${adminsCount} مشرف\n`;
    adminMsg += `━━━━━━━━━━━━━━━━━━\n`;
    adminMsg += `اختر الإجراء الإداري المطلوب تنفيذه:`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: adminMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📢 بث أحدث مسابقة للمجموعات', callback_data: 'admin_broadcast_latest' },
            { text: '🏆 إعلان نتائج المتصدرين', callback_data: 'admin_broadcast_winners' }
          ],
          [
            { text: '➕ إضافة مشرف جديد', callback_data: 'cmd_add_supervisor' },
            { text: `📋 قائمة المشرفين (${adminsCount})`, callback_data: 'cmd_list_supervisors' }
          ],
          [
            { text: `👥 المجموعات المسجلة (${groupsCount})`, callback_data: 'cmd_view_groups' },
            { text: '🔄 تحديث ومزامنة البيانات', callback_data: 'cmd_refresh_data' }
          ],
          [
            { text: '🌐 فتح لوحة الإدارة العامة', url: `${baseUrl}/?portal=admin` }
          ],
          [
            { text: '🏠 العودة للقائمة الرئيسية', callback_data: 'cmd_main' }
          ]
        ]
      }
    });
  }

  // Helper: Request to add a new supervisor
  async function handleAddSupervisorPrompt(chatId: string | number, senderId?: string | number) {
    if (!isUserAdmin(senderId)) {
      await sendUnauthorizedAdminMessage(chatId, senderId);
      return;
    }

    let msg = `➕ <b>إضافة مشرف جديد للبوت</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `لإضافة مشرف ومنحه الصلاحيات الكاملة للوحة التحكم، أرسل الأمر بالصيغة:\n`;
    msg += `<code>/addadmin معرف_المشرف</code>\n\n`;
    msg += `💡 <b>مثال:</b>\n<code>/addadmin 123456789</code>\n\n`;
    msg += `📌 يمكن للمشرف معرفة الـ ID الخاص به عبر إرسال <code>/id</code> للبوت.\n`;
    msg += `━━━━━━━━━━━━━━━━━━`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 قائمة المشرفين', callback_data: 'cmd_list_supervisors' }],
          [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }]
        ]
      }
    });
  }

  // Helper: List supervisors
  async function handleListSupervisors(chatId: string | number, baseUrl: string, senderId?: string | number) {
    if (!isUserAdmin(senderId)) {
      await sendUnauthorizedAdminMessage(chatId, senderId);
      return;
    }

    const list = Array.from(new Set([SUPER_ADMIN_ID, ...(telegramSettings.adminUserIds || [])]));
    let msg = `📋 <b>قائمة المشرفين المعتمدين في البوت (${list.length}):</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;

    list.forEach((id, index) => {
      const isSuper = id === SUPER_ADMIN_ID;
      msg += `${index + 1}. <code>${id}</code> ${isSuper ? '👑 (المشرف الأساسي)' : '👤 (مشرف معتمد)'}\n`;
    });

    msg += `\n━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 لإضافة مشرف: <code>/addadmin [ID]</code>\n`;
    msg += `💡 لحذف مشرف: <code>/deladmin [ID]</code>`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة مشرف جديد', callback_data: 'cmd_add_supervisor' }],
          [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }]
        ]
      }
    });
  }

  // Helper: Teacher Dashboard View in Telegram Bot
  async function handleTeacherDashboardView(chatId: string | number, baseUrl: string, session: { code: string; teacherDisplayName: string; school: string }) {
    const allComps = await dbManager.getCompetitions();
    const teacherComps = allComps.filter(c => 
      c && (
        (c.teacherCode && c.teacherCode.toUpperCase() === session.code.toUpperCase()) ||
        (session.school && c.schoolName && c.schoolName.toLowerCase().includes(session.school.toLowerCase())) ||
        (session.teacherDisplayName && c.teacherDisplayName && c.teacherDisplayName.toLowerCase().includes(session.teacherDisplayName.toLowerCase()))
      )
    );

    const teacherCodeParam = encodeURIComponent(session.code);
    const directDashboardUrl = `${baseUrl}/?teacher=${teacherCodeParam}`;
    const newCompUrl = `${baseUrl}/?teacher=${teacherCodeParam}&action=new`;
    const certsUrl = `${baseUrl}/?teacher=${teacherCodeParam}&tab=certificates`;

    let msg = `🎓 <b>مساحة المعلم — لوحة التحكم</b> 🏆\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `👋 <b>مرحباً بك:</b> ${escapeTelegramHtml(session.teacherDisplayName || 'أستاذنا الفاضل')}\n`;
    msg += `🏷️ <b>كود المعلم:</b> <code>${escapeTelegramHtml(session.code)}</code>\n`;
    if (session.school) {
      msg += `🏫 <b>المؤسسة / المدرسة:</b> ${escapeTelegramHtml(session.school)}\n`;
    }
    msg += `📊 <b>عدد مسابقاتك المسجلة:</b> ${teacherComps.length} مسابقة\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚡ اختر من الخيارات أدناه لإدارة مسابقاتك وطلابك كما في المنصة:`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 فتح لوحة التحكم التفاعلية', url: directDashboardUrl }
          ],
          [
            { text: '➕ إنشاء مسابقة جديدة', url: newCompUrl },
            { text: '📜 إدارة الشهادات', url: certsUrl }
          ],
          [
            { text: `📋 مسابقاتي (${teacherComps.length})`, callback_data: 'teacher_my_comps' }
          ],
          [
            { text: '🔄 تسجيل خروج المعلم', callback_data: 'teacher_logout' },
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ]
        ]
      }
    });
  }

  // Helper: Request teacher to enter their code
  async function handleTeacherLoginPrompt(chatId: string | number, baseUrl: string) {
    let msg = `🎓 <b>مساحة المعلم — تسجيل الدخول بالكود</b> 🏫\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `أهلاً بك يا صانع الأجيال في منصة تَنافُسْ!\n\n`;
    msg += `للوصول إلى لوحة تحكم المعلم كما في المنصة، يرجى إرسال كود المعلم بالصيغة:\n`;
    msg += `<code>/teacher كود_المعلم</code>\n\n`;
    msg += `💡 <b>أمثلة:</b>\n`;
    msg += `• <code>/teacher T68999</code>\n`;
    msg += `• <code>/teacher T57899</code>\n`;
    msg += `• <code>/teacher TCHR-DEMO</code> (كود مكتبة المعلمين)\n`;
    msg += `• أو أرسل كود المعلم الخاص بك مباشرة في المحادثة.\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚡ دخول سريع (كود تجريبي TCHR-DEMO)', callback_data: 'teacher_quick_demo' }
          ],
          [
            { text: '🌐 فتح مساحة المعلم في المتصفح', url: `${baseUrl}/?portal=teacher` }
          ],
          [
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ]
        ]
      }
    });
  }

  // Helper: List teacher's competitions
  async function handleTeacherMyComps(chatId: string | number, baseUrl: string, session: { code: string; teacherDisplayName: string; school: string }) {
    const allComps = await dbManager.getCompetitions();
    const teacherComps = allComps.filter(c => 
      c && (
        (c.teacherCode && c.teacherCode.toUpperCase() === session.code.toUpperCase()) ||
        (session.school && c.schoolName && c.schoolName.toLowerCase().includes(session.school.toLowerCase())) ||
        (session.teacherDisplayName && c.teacherDisplayName && c.teacherDisplayName.toLowerCase().includes(session.teacherDisplayName.toLowerCase()))
      )
    );

    if (teacherComps.length === 0) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: `📋 <b>مسابقات المعلم:</b>\n\nلا توجد مسابقات مسجلة حتى الآن.\nيمكنك إنشاء أول مسابقة بالذكاء الاصطناعي الآن!`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ إنشاء مسابقة جديدة', url: `${baseUrl}/?teacher=${encodeURIComponent(session.code)}&action=new` }],
            [{ text: '🎓 العودة للوحة المعلم', callback_data: 'cmd_teacher' }]
          ]
        }
      });
      return;
    }

    let msg = `📋 <b>قائمة مسابقاتك (${teacherComps.length} مسابقة):</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;

    const keyboard: any[] = [];

    teacherComps.slice(0, 5).forEach((comp: any, idx) => {
      const name = escapeTelegramHtml(comp.name);
      const qCount = comp.questionsCount || (comp.questions ? comp.questions.length : 5);
      msg += `${idx + 1}. <b>${name}</b> (${qCount} أسئلة)\n`;
      const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(comp.webSlug || comp.id)}`;
      keyboard.push([{ text: `🔗 مسابقة: ${comp.name.slice(0, 25)}`, url: compUrl }]);
    });

    keyboard.push([
      { text: '🌐 فتح لوحة المعلم بالكامل', url: `${baseUrl}/?teacher=${encodeURIComponent(session.code)}` }
    ]);
    keyboard.push([
      { text: '🎓 لوحة المعلم', callback_data: 'cmd_teacher' },
      { text: '🏠 الرئيسية', callback_data: 'cmd_main' }
    ]);

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Helper: Admin Broadcast Latest Competition to All Registered Groups
  async function handleAdminBroadcastLatest(chatId: string | number, baseUrl: string) {
    const allComps = await dbManager.getCompetitions();
    const publicComps = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
    const targetComp = publicComps.find(c => c.status === 'active') || publicComps[0];

    if (!targetComp) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: '⚠️ لا توجد مسابقات متاحة للبث حالياً.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }]
          ]
        }
      });
      return;
    }

    const groups = telegramSettings.targetGroups || [];
    if (groups.length === 0) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: '⚠️ لم يتم تحديد مجموعات مستهدفة للبث. أضف البوت إلى مجموعات أولاً ثم أرسل <code>/id</code> داخلها.',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 عرض المجموعات', callback_data: 'cmd_view_groups' }],
            [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }]
          ]
        }
      });
      return;
    }

    const compObj = targetComp as any;
    const compName = escapeTelegramHtml(compObj.name);
    const supervisor = escapeTelegramHtml(compObj.schoolName || compObj.teacherDisplayName || 'منصة تَنافُسْ التعليمية');
    const qCount = compObj.questionsCount || (compObj.questions ? compObj.questions.length : 5);
    const rawDur = compObj.duration || compObj.examDurationMinutes || 15;
    const durText = formatArabicDuration(rawDur);

    let cardMsg = `🌟 <b>انطلاق تحدي جديد في منصة تَنافُسْ!</b> 🏆\n`;
    cardMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
    cardMsg += `1. ${compName}\n`;
    cardMsg += `   🏫 ${supervisor}\n`;
    cardMsg += `   ⏱️ مدة الإجابة: ${durText} • 📝 الأسئلة: ${qCount}\n`;
    if (compObj.startTime) {
      const s = formatArabicDateTime(compObj.startTime);
      if (s) cardMsg += `   ⏰ البدء: ${s}\n`;
    }
    if (compObj.endTime) {
      const e = formatArabicDateTime(compObj.endTime, compObj.startTime);
      if (e) cardMsg += `   ⌛ الانتهاء: ${e}\n`;
    }
    cardMsg += `\n━━━━━━━━━━━━━━━━━━\n`;
    cardMsg += `💡 اضغط على زر المسابقة أدناه للمشاركة الفورية:`;

    const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(compObj.webSlug || compObj.id)}`;
    let successCount = 0;

    for (const gId of groups) {
      try {
        await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
          chat_id: gId,
          text: cardMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `🚀 1. ${compObj.name}`, url: compUrl }],
              [{ text: '🌐 فتح قسم المسابقات', url: baseUrl }]
            ]
          }
        });
        successCount++;
      } catch (err: any) {
        console.warn(`Failed broadcast to group ${gId}:`, err.message);
      }
    }

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: `✅ <b>تم بث مسابقة "${compName}" بنجاح!</b>\nتم الإرسال إلى ${successCount} من أصل ${groups.length} مجموعة مسجلة.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
        ]
      }
    });
  }

  // Helper: Admin Broadcast Leaderboard Announcement
  async function handleAdminBroadcastWinners(chatId: string | number, baseUrl: string) {
    const allComps = await dbManager.getCompetitions();
    const publicComps = allComps.filter(c => c.visibility !== 'private' && c.competitionType !== 'open');
    const targetComp = publicComps.find(c => c.status === 'active') || publicComps[0];

    if (!targetComp) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: '⚠️ لا توجد مسابقات مسجلة حالياً لبث لوحة الشرف.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }]
          ]
        }
      });
      return;
    }

    const participants = await dbManager.getParticipants(targetComp.id);
    const validParticipants = participants.filter((p: any) => !p.isDisqualified && (p.score || 0) >= 0);
    const sorted = [...validParticipants].sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
    });

    const announcement = formatLeaderboardAnnouncement(targetComp.name, sorted);
    const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(targetComp.webSlug || targetComp.id)}`;
    const groups = telegramSettings.targetGroups || [];
    let sentCount = 0;

    for (const gId of groups) {
      try {
        await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
          chat_id: gId,
          text: announcement,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 عرض لوحة الشرف الكاملة', url: compUrl }],
              [{ text: '🌐 فتح قسم المسابقات', url: baseUrl }]
            ]
          }
        });
        sentCount++;
      } catch (err: any) {
        console.warn(`Failed broadcast leaderboard to group ${gId}:`, err.message);
      }
    }

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: `✅ <b>تم تعميم لوحة شرف مسابقة "${targetComp.name}" بنجاح!</b>\nتم البث في ${sentCount} من أصل ${groups.length} مجموعة مسجلة.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
        ]
      }
    });
  }

  // Helper: View connected groups
  async function handleViewGroups(chatId: string | number, baseUrl: string) {
    const groups = telegramSettings.groupsList || [];
    let msg = `👥 <b>المجموعات والقنوات المسجلة (${groups.length}):</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;

    if (groups.length === 0) {
      msg += `لم يتم تسجيل أي مجموعة حتى الآن.\nلإضافة مجموعة، أضف البوت للمجموعة ثم أرسل <code>/id</code> داخلها.\n`;
    } else {
      groups.slice(0, 8).forEach((g: any, idx: number) => {
        msg += `${idx + 1}. <b>${escapeTelegramHtml(g.name || 'مجموعة')}</b>\n`;
        msg += `   🆔 <code>${g.id}</code> • 🏷️ ${escapeTelegramHtml(g.category || 'عام')}\n\n`;
      });
    }

    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `يتم بث المسابقات والنتائج تلقائياً في هذه المجموعات.`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' },
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ],
          [
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  // Helper: Open Self-Training & Question Bank view
  async function handleTrainingView(chatId: string | number, baseUrl: string) {
    const bankQuestions = await dbManager.getBankQuestions();
    const bankDomains = await dbManager.getBankDomains();

    let msg = `📚✨ <b>بنك الأسئلة والتدريب الذاتي المفتوح</b> ✨📚\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `فرصة مثالية لجميع المستخدمين والمشاركين لاختبار الحصيلة المعرفية وتطوير المهارات الذهنية بأسئلة متجددة في مختلف المجالات:\n\n`;
    msg += `📝 <b>الأسئلة المتوفرة:</b> أكثر من ${bankQuestions.length || 30} سؤال نوعي\n`;
    msg += `🎯 <b>المجالات المعرفية:</b> ${bankDomains.length || 5} مجالات تخصصية\n`;
    msg += `⏱️ <b>النمط:</b> تدريب فوري حر بدون قيود زمنية مع تصحيح وشرح فوري لكل سؤال\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `👇 اضغط أدناه لبدء التقييم الذاتي الممتع فوراً:`;

    const allComps = await dbManager.getCompetitions();
    const trainingComp: any = allComps.find(c => c.competitionType === 'open') || {
      id: 'comp-question-bank',
      webSlug: 'question-bank-assessment'
    };
    const trainingUrl = `${baseUrl}/?quiz=${encodeURIComponent(trainingComp.webSlug || trainingComp.id || 'question-bank-assessment')}`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 ابدأ التدريب الذاتي الآن', url: trainingUrl }],
          [{ text: '🎯 تصفح المسابقات التنافسية', callback_data: 'filter_comps:all' }],
          [
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' },
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  // Helper: Interactive command help view (Strictly using neutral terminology for المستخدمين)
  async function handleHelpView(chatId: string | number, baseUrl: string) {
    let helpMsg = `📖 <b>دليل استخدام بوت منصة تَنافُسْ التعليمية:</b>\n`;
    helpMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
    helpMsg += `🌟 <b>أوامر المستخدمين والمشاركين:</b>\n`;
    helpMsg += `• <code>/start</code> - فتح القائمة الرئيسية التفاعلية\n`;
    helpMsg += `• <code>/competitions</code> - استعراض المسابقات المتاحة\n`;
    helpMsg += `• <code>/random</code> - اختيار تحدي عشوائي فوري\n`;
    helpMsg += `• <code>/rules</code> - عرض قواعد وإرشادات التنافس\n`;
    helpMsg += `• <code>/training</code> - دخول قاعة التدريب الذاتي المفتوح\n`;
    helpMsg += `• <code>/id</code> - إظهار معرف الدردشة أو الجروب الحالي\n\n`;
    helpMsg += `🔒 <b>أوامر الإشراف والإدارة:</b>\n`;
    helpMsg += `• <code>/admin</code> - فتح لوحة تحكم المشرفين الخاصة\n`;
    helpMsg += `• <code>winners</code> - إعلان لوحة الشرف وأسماء الفائزين\n\n`;
    helpMsg += `━━━━━━━━━━━━━━━━━━\n`;
    helpMsg += `💡 للدخول والمشاركة: ${baseUrl}`;

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: helpMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 تصفح المسابقات', callback_data: 'cmd_comps' },
            { text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }
          ],
          [
            { text: '🌐 فتح قسم المسابقات', url: baseUrl }
          ]
        ]
      }
    });
  }

  // Helper: Leaderboard / Winners view
  async function handleWinnersView(chatId: string | number, specificSlugOrId: string | undefined, baseUrl: string) {
    const allComps = await dbManager.getCompetitions();
    const publicComps = allComps.filter(c => c.visibility !== 'private' && c.competitionType !== 'open');

    let targetComp = null;
    if (specificSlugOrId) {
      const s = specificSlugOrId.trim().toLowerCase();
      targetComp = allComps.find(c =>
        (c.webSlug && c.webSlug.toLowerCase() === s) ||
        (c.id && c.id.toLowerCase() === s) ||
        (c.name && c.name.toLowerCase().includes(s))
      );
    }

    if (!targetComp) {
      targetComp = publicComps.find(c => c.status === 'active') || publicComps[0] || allComps[0];
    }

    if (!targetComp) {
      await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
        chat_id: chatId,
        text: 'لا توجد مسابقات مسجلة حالياً لعرض لوحة شرفها.',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }],
            [{ text: '🌐 فتح قسم المسابقات', url: baseUrl }]
          ]
        }
      });
      return;
    }

    const participants = await dbManager.getParticipants(targetComp.id);
    const validParticipants = participants.filter((p: any) => !p.isDisqualified && (p.score || 0) >= 0);
    const sorted = [...validParticipants].sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
    });

    const announcement = formatLeaderboardAnnouncement(targetComp.name, sorted);
    const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(targetComp.webSlug || targetComp.id)}`;

    const compButtons: any[] = [];
    const otherComps = publicComps.filter(c => c.id !== targetComp.id).slice(0, 3);
    if (otherComps.length > 0) {
      otherComps.forEach(oc => {
        compButtons.push([
          { text: `🏅 لوحة ${oc.name}`, callback_data: `view_winners:${oc.id}` }
        ]);
      });
    }

    compButtons.push([
      { text: '📊 عرض لوحة الشرف الكاملة', url: compUrl }
    ]);
    compButtons.push([
      { text: '🎯 تصفح المسابقات', callback_data: 'cmd_comps' },
      { text: '🏠 الرئيسية', callback_data: 'cmd_main' }
    ]);
    compButtons.push([
      { text: '🌐 فتح قسم المسابقات', url: baseUrl }
    ]);

    await callTelegramApi(telegramSettings.botToken, 'sendMessage', {
      chat_id: chatId,
      text: announcement,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: compButtons
      }
    });
  }

  // Central update processor for Webhook & Long Polling
  async function handleTelegramUpdate(update: any, baseUrl: string) {
    if (!telegramSettings.botToken) return;
    const token = telegramSettings.botToken;

    // A. Handle Callback Queries (Inline Button Clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const cbId = cb.id;
      const data = String(cb.data || '');
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      // Immediately acknowledge to clear loading clock in Telegram UI
      await callTelegramApi(token, 'answerCallbackQuery', { callback_query_id: cbId }).catch(() => {});

      if (!chatId) return;

      if (data === 'cmd_main') {
        const menu = buildMainMenuMessage(baseUrl);
        try {
          await callTelegramApi(token, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: menu.text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: menu.replyMarkup
          });
        } catch {
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: menu.text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: menu.replyMarkup
          });
        }
        return;
      }

      if (data === 'cmd_comps' || data.startsWith('page_comps:') || data.startsWith('filter_comps:')) {
        let filter: 'all' | 'active' | 'upcoming' | 'open' = 'all';
        let page = 0;

        if (data.startsWith('filter_comps:')) {
          const parts = data.split(':');
          filter = (parts[1] as any) || 'all';
          page = 0;
        } else if (data.startsWith('page_comps:')) {
          const parts = data.split(':');
          if (parts.length === 3) {
            filter = (parts[1] as any) || 'all';
            page = Number(parts[2]) || 0;
          } else {
            page = Number(parts[1]) || 0;
          }
        }

        const allComps = await dbManager.getCompetitions();
        const publicList = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
        const compMsg = buildCompetitionsListMessage(publicList, page, 3, baseUrl, filter);

        try {
          await callTelegramApi(token, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: compMsg.text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: compMsg.replyMarkup
          });
        } catch {
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: compMsg.text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: compMsg.replyMarkup
          });
        }
        return;
      }

      if (data === 'cmd_random') {
        await handleRandomChallenge(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_rules') {
        await handleRulesView(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_bot_status') {
        await handleBotStatus(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_admin_panel' || data === 'cmd_admin') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        await handleAdminPanel(chatId, baseUrl, senderId);
        return;
      }

      if (data === 'cmd_add_supervisor') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        await handleAddSupervisorPrompt(chatId, senderId);
        return;
      }

      if (data === 'cmd_list_supervisors') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        await handleListSupervisors(chatId, baseUrl, senderId);
        return;
      }

      if (data === 'cmd_teacher') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        const session = senderId ? telegramTeacherSessions.get(senderId) : undefined;
        if (session) {
          await handleTeacherDashboardView(chatId, baseUrl, session);
        } else {
          await handleTeacherLoginPrompt(chatId, baseUrl);
        }
        return;
      }

      if (data === 'teacher_quick_demo') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        if (senderId) {
          telegramTeacherSessions.set(senderId, {
            code: 'TCHR-DEMO',
            teacherDisplayName: 'مكتبة المعلمين (تجريبي)',
            school: 'منصة تَنافُسْ التعليمية'
          });
          const session = telegramTeacherSessions.get(senderId)!;
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '✅ <b>تم تسجيل الدخول بنجاح عبر الكود التجريبي لمكتبة المعلمين!</b>',
            parse_mode: 'HTML'
          });
          await handleTeacherDashboardView(chatId, baseUrl, session);
        }
        return;
      }

      if (data === 'teacher_logout') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        if (senderId) telegramTeacherSessions.delete(senderId);
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: '👋 <b>تم تسجيل الخروج من مساحة المعلم بنجاح.</b>',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎓 تسجيل الدخول مجدداً', callback_data: 'cmd_teacher' }],
              [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
            ]
          }
        });
        return;
      }

      if (data === 'teacher_my_comps') {
        const senderId = cb.from?.id ? String(cb.from.id) : '';
        const session = senderId ? telegramTeacherSessions.get(senderId) : undefined;
        if (session) {
          await handleTeacherMyComps(chatId, baseUrl, session);
        } else {
          await handleTeacherLoginPrompt(chatId, baseUrl);
        }
        return;
      }

      if (data === 'admin_broadcast_latest') {
        await handleAdminBroadcastLatest(chatId, baseUrl);
        return;
      }

      if (data === 'admin_broadcast_winners') {
        await handleAdminBroadcastWinners(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_view_groups') {
        await handleViewGroups(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_refresh_data') {
        try {
          const fresh = await dbManager.getCompetitions();
          serverPublicCompetitions = fresh.filter(c => c.visibility !== 'private').map(c => ({
            id: c.id,
            webSlug: c.webSlug || c.id,
            name: c.name,
            description: c.description || '',
            schoolName: c.schoolName || 'منصة تَنافُسْ',
            questionsCount: c.questions?.length || 0,
            duration: c.examDurationMinutes || 15,
            rewardType: c.rewardType || 'شهادة تفوق رقمية',
            visibility: 'public',
            competitionType: c.competitionType,
            startTime: c.startTime,
            endTime: c.endTime,
            status: c.status
          }));
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `✅ تم تحديث بيانات المسابقات بنجاح (${serverPublicCompetitions.length} مسابقة عامة متاحة).`,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔐 العودة للوحة المشرفين', callback_data: 'cmd_admin_panel' }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
              ]
            }
          });
        } catch {
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: 'تم تحديث الذاكرة المؤقتة للمسابقات بنجاح.'
          });
        }
        return;
      }

      if (data === 'cmd_winners' || data.startsWith('view_winners:')) {
        const specificId = data.startsWith('view_winners:') ? data.split(':')[1] : undefined;
        await handleWinnersView(chatId, specificId, baseUrl);
        return;
      }

      if (data === 'cmd_training') {
        await handleTrainingView(chatId, baseUrl);
        return;
      }

      if (data === 'cmd_help') {
        await handleHelpView(chatId, baseUrl);
        return;
      }

      if (data === 'noop') {
        return;
      }
    }

    // B. Handle Incoming Messages
    const message = update.message;
    if (!message) return;

    const chatId = message.chat?.id;
    if (!chatId) return;

    // Auto-register and discover groups when bot receives any message from a group
    if (message.chat && (message.chat.type === 'group' || message.chat.type === 'supergroup')) {
      const gId = String(message.chat.id);
      const gTitle = message.chat.title || `جروب (${gId.slice(-6)})`;
      if (!telegramSettings.groupsList) telegramSettings.groupsList = [];
      const existing = telegramSettings.groupsList.find((g: any) => g && g.id === gId);
      if (!existing) {
        telegramSettings.groupsList.push({
          id: gId,
          name: gTitle,
          category: 'عام',
          type: message.chat.type,
          addedAt: new Date().toISOString()
        });
        if (!telegramSettings.targetGroups) telegramSettings.targetGroups = [];
        if (!telegramSettings.targetGroups.includes(gId)) {
          telegramSettings.targetGroups.push(gId);
        }
        await dbManager.saveBotSettings(telegramSettings).catch(() => {});
      }
    }

    // Bot added to group greeting (neutral terminology)
    if (message.new_chat_members && Array.isArray(message.new_chat_members)) {
      const isBotAdded = message.new_chat_members.some((m: any) => m.is_bot && m.username === telegramSettings.botUsername);
      if (isBotAdded) {
        const welcomeGroupMsg = `👋✨ <b>أهلاً وسهلاً بكم في منصة تَنافُسْ التعليمية!</b>\n` +
          `تم تفعيل البوت بنجاح لخدمة المستخدمين والمشاركين لبث المسابقات التفاعلية ولوحات الشرف والتنبيهات 🚀\n\n` +
          `📌 <b>معرف هذه المجموعة (Chat ID):</b>\n<code>${chatId}</code>\n\n` +
          `🎯 لاستعراض المسابقات: أرسل <code>/competitions</code>\n` +
          `📖 لمعرفة الأوامر: أرسل <code>/help</code>`;

        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: welcomeGroupMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎯 تصفح المسابقات المتاحة', callback_data: 'filter_comps:all' }],
              [{ text: '🌐 فتح قسم المسابقات', url: baseUrl }]
            ]
          }
        });
        return;
      }
    }

    if (!message.text) return;
    const text = message.text.trim();
    const lowerText = text.toLowerCase();

    // 1. Group /id helper command
    if (text === '/id' || text.startsWith('/id@')) {
      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: `ℹ️ <b>معرف هذه المحادثة (Chat ID):</b>\n<code>${chatId}</code>\n\n📌 تم ربط وتسجيل هذا المعرف تلقائياً في منصة تَنافُسْ لبث المسابقات والنتائج.`,
        parse_mode: 'HTML'
      });
      return;
    }

    // 2. Deep linking: /start <competition_slug_or_id>
    if (text.startsWith('/start ') && text.trim().length > 7) {
      const targetSlug = text.replace('/start ', '').trim().toLowerCase();
      const allComps = await dbManager.getCompetitions();
      const comp = allComps.find(c =>
        (c.webSlug && c.webSlug.toLowerCase() === targetSlug) ||
        (c.id && c.id.toLowerCase() === targetSlug) ||
        (c.webSlug && targetSlug.includes(c.webSlug.toLowerCase()))
      ) || serverPublicCompetitions.find(c =>
        c.webSlug.toLowerCase() === targetSlug ||
        c.id.toLowerCase() === targetSlug ||
        targetSlug.includes(c.webSlug.toLowerCase())
      );

      if (comp) {
        const compObj = comp as any;
        const compName = escapeTelegramHtml(compObj.name);
        const supervisor = escapeTelegramHtml(compObj.schoolName || compObj.teacherDisplayName || 'منصة تَنافُسْ التعليمية');
        const qCount = compObj.questionsCount || (compObj.questions ? compObj.questions.length : 5);
        const rawDur = compObj.duration || compObj.examDurationMinutes || 15;
        const durText = formatArabicDuration(rawDur);
        const rewardText = escapeTelegramHtml(compObj.rewardType || 'وسام التفوق وشهادة تميز رقمية للمتفوقين');

        let timingInfo = '';
        if (compObj.startTime) {
          const startFmt = formatArabicDateTime(compObj.startTime);
          if (startFmt) timingInfo += `⏰ <b>البدء:</b> ${startFmt}\n`;
        }
        if (compObj.endTime) {
          const endFmt = formatArabicDateTime(compObj.endTime, compObj.startTime);
          if (endFmt) timingInfo += `⌛ <b>الانتهاء:</b> ${endFmt}\n`;
        }

        const compUrl = `${baseUrl}/?quiz=${encodeURIComponent(compObj.webSlug || compObj.id)}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(compUrl)}&text=${encodeURIComponent(`شارك معي في تحدي ${compObj.name} على منصة تنافس التعليمية! 🏆`)}`;

        // Ultra-clean card WITHOUT description
        let cardMsg = `🏆 <b>مسابقة: ${compName}</b>\n`;
        cardMsg += `━━━━━━━━━━━━━━━━━━\n`;
        cardMsg += `🏫 <b>الجهة المشرفة:</b> ${supervisor}\n`;
        cardMsg += `⏱️ <b>مدة الإجابة:</b> ${durText} • 📝 <b>الأسئلة:</b> ${qCount}\n`;
        cardMsg += `🎁 <b>المكافأة:</b> ${rewardText}\n`;
        if (timingInfo) cardMsg += `${timingInfo}\n`;
        cardMsg += `━━━━━━━━━━━━━━━━━━\n`;
        cardMsg += `👇 <b>اضغط أدناه لبدء التحدي الفوري:</b>`;

        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: cardMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `🚀 ابدأ مسابقة ${compName}`, url: compUrl }],
              [{ text: '📤 مشاركة المسابقة', url: shareUrl }],
              [
                { text: '🎯 تصفح المسابقات', callback_data: 'cmd_comps' },
                { text: '🏠 الرئيسية', callback_data: 'cmd_main' }
              ],
              [
                { text: '🌐 فتح قسم المسابقات', url: baseUrl }
              ]
            ]
          }
        });
        return;
      }
    }

    // 3. Main Menu: /start (without parameters) - Short description screen
    if (text === '/start' || text.startsWith('/start@')) {
      const menu = buildMainMenuMessage(baseUrl);
      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: menu.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: menu.replyMarkup
      });
      return;
    }

    // 4. Competitions List: /competitions or "مسابقات" or "المسابقات"
    if (text === '/competitions' || text.startsWith('/competitions@') || text === 'مسابقات' || text === 'المسابقات' || text === 'التحديات') {
      const allComps = await dbManager.getCompetitions();
      const publicList = allComps.filter(c => c && c.visibility !== 'private' && (c as any).status !== 'archived');
      const compMsg = buildCompetitionsListMessage(publicList, 0, 3, baseUrl, 'all');

      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: compMsg.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: compMsg.replyMarkup
      });
      return;
    }

    // 5. Random Challenge: /random
    if (text === '/random' || text.startsWith('/random@') || text === 'عشوائي' || text === 'تحدي عشوائي') {
      await handleRandomChallenge(chatId, baseUrl);
      return;
    }

    // 6. Competition Rules: /rules or "قواعد"
    if (text === '/rules' || text.startsWith('/rules@') || text === 'قواعد' || text === 'شروط') {
      await handleRulesView(chatId, baseUrl);
      return;
    }

    // 6b. Bot Status: /status or "حالة البوت"
    if (text === '/status' || text.startsWith('/status@') || text === 'الحالة' || text === 'حالة البوت') {
      await handleBotStatus(chatId, baseUrl);
      return;
    }

    // 7. Open Training and Question Bank: /training, /bank, "تدريب"
    if (text === '/training' || text.startsWith('/training@') || text === '/bank' || text === 'تدريب' || text === 'بنك الأسئلة') {
      await handleTrainingView(chatId, baseUrl);
      return;
    }

    // 8. Admin Panel Command: /admin (Telegram User ID verification)
    if (lowerText === '/admin' || lowerText.startsWith('/admin ') || lowerText.startsWith('/admin@') || lowerText === '/admin_panel' || text === 'ادمن' || text === 'الادمن' || text === 'لوحة المشرفين') {
      const senderId = message.from?.id ? String(message.from.id) : '';
      if (isUserAdmin(senderId)) {
        await handleAdminPanel(chatId, baseUrl, senderId);
      } else {
        await sendUnauthorizedAdminMessage(chatId, senderId);
      }
      return;
    }

    // 8b. Add Supervisor Command: /addadmin <id> or /addsupervisor <id>
    if (lowerText.startsWith('/addadmin') || lowerText.startsWith('/add_admin') || lowerText.startsWith('/addsupervisor') || lowerText.startsWith('/add_supervisor')) {
      const senderId = message.from?.id ? String(message.from.id) : '';
      if (!isUserAdmin(senderId)) {
        await sendUnauthorizedAdminMessage(chatId, senderId);
        return;
      }

      const parts = text.split(/\s+/);
      const targetId = parts[1]?.trim();
      if (!targetId || !/^\d+$/.test(targetId)) {
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `⚠️ <b>يرجى إدخال معرف المشرف (Telegram User ID) كأرقام فقط:</b>\n\n<code>/addadmin 123456789</code>\n\n💡 يمكن للمشرف معرفة الـ ID الخاص به عبر إرسال <code>/id</code> للبوت.`,
          parse_mode: 'HTML'
        });
        return;
      }

      if (!telegramSettings.adminUserIds) telegramSettings.adminUserIds = [];
      if (!telegramSettings.adminUserIds.includes(targetId)) {
        telegramSettings.adminUserIds.push(targetId);
        await dbManager.saveBotSettings(telegramSettings);
      }

      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: `✅ <b>تمت إضافة المشرف بنجاح!</b>\n\nالمعرف: <code>${targetId}</code> بات يمتلك صلاحية الدخول للوحة التحكم الإدارية.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 قائمة المشرفين', callback_data: 'cmd_list_supervisors' }],
            [{ text: '🔐 لوحة المشرفين', callback_data: 'cmd_admin_panel' }]
          ]
        }
      });
      return;
    }

    // 8c. Delete Supervisor Command: /deladmin <id> or /removeadmin <id>
    if (lowerText.startsWith('/deladmin') || lowerText.startsWith('/removeadmin') || lowerText.startsWith('/del_admin') || lowerText.startsWith('/remove_admin')) {
      const senderId = message.from?.id ? String(message.from.id) : '';
      if (!isUserAdmin(senderId)) {
        await sendUnauthorizedAdminMessage(chatId, senderId);
        return;
      }

      const parts = text.split(/\s+/);
      const targetId = parts[1]?.trim();
      if (!targetId) {
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `⚠️ <b>يرجى إدخال معرف المشرف المراد حذفه:</b>\n\n<code>/deladmin 123456789</code>`,
          parse_mode: 'HTML'
        });
        return;
      }

      if (targetId === SUPER_ADMIN_ID) {
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `⚠️ <b>لا يمكن حذف المشرف العام الأساسي (${SUPER_ADMIN_ID}).</b>`,
          parse_mode: 'HTML'
        });
        return;
      }

      telegramSettings.adminUserIds = (telegramSettings.adminUserIds || []).filter(id => String(id) !== targetId);
      await dbManager.saveBotSettings(telegramSettings);

      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: `✅ <b>تم إزالة المعرف <code>${targetId}</code> من قائمة المشرفين بنجاح.</b>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 قائمة المشرفين', callback_data: 'cmd_list_supervisors' }],
            [{ text: '🔐 لوحة المشرفين', callback_data: 'cmd_admin_panel' }]
          ]
        }
      });
      return;
    }

    // 8d. List Supervisors Command: /supervisors or /admins
    if (lowerText === '/supervisors' || lowerText.startsWith('/supervisors@') || lowerText === '/admins' || lowerText.startsWith('/admins@') || text === 'المشرفين') {
      const senderId = message.from?.id ? String(message.from.id) : '';
      if (!isUserAdmin(senderId)) {
        await sendUnauthorizedAdminMessage(chatId, senderId);
        return;
      }
      await handleListSupervisors(chatId, baseUrl, senderId);
      return;
    }

    // 8e. Teacher Space Command: /teacher or "مساحة المعلم"
    if (lowerText === '/teacher' || lowerText.startsWith('/teacher ') || lowerText.startsWith('/teacher@') || text === 'معلم' || text === 'المعلم' || text === 'مساحة المعلم' || text === 'لوحة المعلم') {
      const parts = text.split(/\s+/);
      const senderId = message.from?.id ? String(message.from.id) : '';

      if (parts.length > 1) {
        const codeInput = parts[1].trim();
        const verifyRes = await verifyTeacherCodeForTelegram(codeInput);
        if (verifyRes.valid && verifyRes.codeObj) {
          if (senderId) {
            telegramTeacherSessions.set(senderId, {
              code: verifyRes.codeObj.code || codeInput,
              teacherDisplayName: verifyRes.codeObj.teacherDisplayName || 'معلم معتمد',
              school: verifyRes.codeObj.school || 'منصة تَنافُسْ التعليمية'
            });
          }
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `✅ <b>تم التحقق بنجاح!</b>\nأهلاً بك أستاذنا: <b>${escapeTelegramHtml(verifyRes.codeObj.teacherDisplayName || codeInput)}</b>`,
            parse_mode: 'HTML'
          });
          const session = senderId ? telegramTeacherSessions.get(senderId) : {
            code: verifyRes.codeObj.code || codeInput,
            teacherDisplayName: verifyRes.codeObj.teacherDisplayName || 'معلم معتمد',
            school: verifyRes.codeObj.school || 'منصة تَنافُسْ التعليمية'
          };
          await handleTeacherDashboardView(chatId, baseUrl, session!);
          return;
        } else {
          await callTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `❌ <b>كود المعلم المدخل غير صحيح أو غير مفعل.</b>\nيرجى التأكد من كود المعلم والمحاولة مجدداً بالصيغة:\n<code>/teacher كود_المعلم</code>`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚡ تجربة بكود تجريبي (TCHR-DEMO)', callback_data: 'teacher_quick_demo' }],
                [{ text: '🌐 فتح مساحة المعلم في المنصة', url: `${baseUrl}/?portal=teacher` }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'cmd_main' }]
              ]
            }
          });
          return;
        }
      } else {
        const session = senderId ? telegramTeacherSessions.get(senderId) : undefined;
        if (session) {
          await handleTeacherDashboardView(chatId, baseUrl, session);
        } else {
          await handleTeacherLoginPrompt(chatId, baseUrl);
        }
        return;
      }
    }

    // 8f. Direct Teacher Code Entry (e.g. T68999, T57899, TCHR-XXXXXX or مكتبة المعلمين)
    if (/^T\d{4,7}$/i.test(text.trim()) || text.toUpperCase().startsWith('TCHR-') || text === 'مكتبة المعلمين') {
      const senderId = message.from?.id ? String(message.from.id) : '';
      const verifyRes = await verifyTeacherCodeForTelegram(text);
      if (verifyRes.valid && verifyRes.codeObj) {
        if (senderId) {
          telegramTeacherSessions.set(senderId, {
            code: verifyRes.codeObj.code || text,
            teacherDisplayName: verifyRes.codeObj.teacherDisplayName || 'معلم معتمد',
            school: verifyRes.codeObj.school || 'منصة تَنافُسْ التعليمية'
          });
        }
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `✅ <b>تم التحقق بنجاح من كود المعلم!</b>\nأهلاً بك: <b>${escapeTelegramHtml(verifyRes.codeObj.teacherDisplayName || text)}</b>`,
          parse_mode: 'HTML'
        });
        const session = senderId ? telegramTeacherSessions.get(senderId) : {
          code: verifyRes.codeObj.code || text,
          teacherDisplayName: verifyRes.codeObj.teacherDisplayName || 'معلم معتمد',
          school: verifyRes.codeObj.school || 'منصة تَنافُسْ التعليمية'
        };
        await handleTeacherDashboardView(chatId, baseUrl, session!);
        return;
      }
    }

    // 9. Winners Command: winners, /winners, /top, /results, الفائزين
    const isWinnersCommand = (
      lowerText === 'winners' ||
      lowerText === '/winners' ||
      lowerText.startsWith('winners ') ||
      lowerText.startsWith('/winners ') ||
      lowerText.startsWith('/winners@') ||
      lowerText === '/top' ||
      lowerText.startsWith('/top ') ||
      lowerText === '/results' ||
      lowerText.startsWith('/results ') ||
      text === 'الفائزين' ||
      text === 'المتصدرين' ||
      text === 'لوحة الشرف'
    );

    if (isWinnersCommand) {
      const parts = text.split(/\s+/);
      const targetSlug = parts.length > 1 ? parts[1].trim() : undefined;
      await handleWinnersView(chatId, targetSlug, baseUrl);
      return;
    }

    // 10. Help command: /help or "مساعدة"
    if (text === '/help' || text.startsWith('/help@') || text === 'مساعدة' || text === 'تعليمات') {
      await handleHelpView(chatId, baseUrl);
      return;
    }

    // Default friendly fallback for direct non-command messages in private chat
    if (message.chat?.type === 'private') {
      const menu = buildMainMenuMessage(baseUrl);
      await callTelegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: `💡 أهلاً بك! يمكنك استخدام الأزرار التفاعلية أدناه للتنقل السريع:`,
        parse_mode: 'HTML',
        reply_markup: menu.replyMarkup
      });
      return;
    }
  }

  // Long Polling Engine for Real-Time Telegram Responsiveness
  let isPollingActive = false;
  let pollingOffset = 0;

  async function startTelegramPollingWorker(baseUrl: string) {
    if (isPollingActive) return;
    const token = telegramSettings.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
      const webhookInfo = await callTelegramApi(token, 'getWebhookInfo', {});
      if (webhookInfo && webhookInfo.url) {
        console.log(`🤖 Telegram Bot webhook is active on: ${webhookInfo.url}`);
        return;
      }
    } catch (err: any) {
      console.warn('Notice checking webhook status:', err.message);
    }

    isPollingActive = true;
    console.log('🤖 Telegram Bot long polling worker started (real-time responsiveness enabled)...');

    (async () => {
      while (isPollingActive) {
        try {
          const currentToken = telegramSettings.botToken || process.env.TELEGRAM_BOT_TOKEN;
          if (!currentToken) {
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }

          const updates = await callTelegramApi(currentToken, 'getUpdates', {
            offset: pollingOffset,
            timeout: 20,
            allowed_updates: ['message', 'callback_query', 'my_chat_member']
          });

          if (Array.isArray(updates) && updates.length > 0) {
            for (const update of updates) {
              pollingOffset = update.update_id + 1;
              try {
                await handleTelegramUpdate(update, baseUrl);
              } catch (uErr: any) {
                console.error('Error handling polled Telegram update:', uErr);
              }
            }
          }
        } catch (pollErr: any) {
          if (pollErr.message?.includes('Conflict') || pollErr.message?.includes('409')) {
            console.warn('Telegram polling paused (webhook active or another bot instance running).');
            await new Promise(r => setTimeout(r, 12000));
          } else {
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }
    })();
  }

  function stopTelegramPolling() {
    isPollingActive = false;
  }

  // Helper: Format Open Training announcement distinct from competitive events
  function formatOpenTrainingAnnouncement(competition: any): string {
    const compName = escapeTelegramHtml(competition.name || 'التدريب التعليمي المفتوح');
    const supervisor = escapeTelegramHtml(competition.schoolName || competition.teacherDisplayName || 'إدارة المنصة');
    const questionsCount = competition.questionsCount || (competition.questions ? competition.questions.length : 5);

    return `📚✨ <b>فرصة تدريب تفاعلي ذاتي مفتوح</b> ✨📚
━━━━━━━━━━━━━━━━━━
🌍 <b>${compName}</b>
💡 بإشراف ${supervisor}

استعد لممارسة حل الأسئلة وتطوير مهاراتك العلمية في تدريب مفتوح متاح للجميع في أي وقت وبدون قيود زمنية أو ترتيب مراكز! 🎯
📝 <b>عدد الأسئلة:</b> ${questionsCount} أسئلة
⏱️ <b>نمط المشاركة:</b> تدريب ذاتي حر ومفتوح لتعزيز المعرفة والمهارات
🌐 <b>الموعد:</b> متاح دائماً للتدريب في أي وقت يناسبك!

━━━━━━━━━━━━━━━━━━
💡 تعلّم بالسرعة التي تناسبك واستفد من الشروحات النموذجية بعد كل سؤال.
👇 اضغط على الزر أدناه لبدء التدريب التفاعلي مباشرة`;
  }

  // Helper: Format beautiful competition broadcast message
  function formatCompetitionAnnouncement(competition: any): string {
    if (competition.competitionType === 'open') {
      return formatOpenTrainingAnnouncement(competition);
    }

    const compName = escapeTelegramHtml(competition.name || 'المسابقة التعليمية');
    const supervisor = escapeTelegramHtml(competition.schoolName || competition.teacherDisplayName || 'إدارة المنصة');
    const questionsCount = competition.questionsCount || (competition.questions ? competition.questions.length : 5);
    const qDuration = competition.questionDuration || 30;
    const durationText = `${qDuration} ثانية لكل سؤال`;
    const rewardText = escapeTelegramHtml(competition.rewardType || 'وسام التميز والتفوق');

    const hasSpecificTiming = Boolean(competition.startTime) || Boolean(competition.endTime);
    const isTimed = (competition.competitionType && competition.competitionType !== 'open') || hasSpecificTiming;

    let timingText = '';
    if (isTimed) {
      const formattedStart = formatArabicDateTime(competition.startTime) || 'متاح فوراً';
      let endStr = competition.endTime;
      if (!endStr && competition.startTime && competition.duration) {
        endStr = new Date(new Date(competition.startTime).getTime() + competition.duration * 60000).toISOString();
      }
      const formattedEnd = formatArabicDateTime(endStr, competition.startTime) || 'حتى إغلاق قاعة الاختبار';

      timingText = `📅 <b>موعد الانطلاق:</b>
${formattedStart}
⏳ <b>ينتهي استقبال المشاركات:</b>
${formattedEnd}`;
    } else {
      timingText = `📅 <b>موعد الانطلاق:</b>
متاح للمشاركة الآن وفي أي وقت يناسبك! 🌐`;
    }

    return `🎯🔥 <b>هل أنت مستعد للتحدي؟</b> 🔥🎯
━━━━━━━━━━━━━━━━━━
🌍✨ <b>${compName}</b> ✨🌍
💡 بإشراف ${supervisor}
استعد لاختبار معلوماتك وسرعتك في تحدٍ قصير وممتع! 🚀
📝 <b>عدد الأسئلة:</b> ${questionsCount}
⏱️ <b>مدة التحدي:</b> ${durationText}
🏆 <b>المكافأة:</b> ${rewardText}
${timingText}

━━━━━━━━━━━━━━━━━━
⚡ فكّر بسرعة… أجب بثقة… ونافس على الصدارة!
🥇 هل سيكون اسمك بين المتصدرين؟
أثبت تميزك وابدأ التحدي! 💪🏆
👇 اضغط على الزر أدناه وكن مستعدًا للانطلاق`;
  }

  // Helper: Format beautiful competition start alert message
  function formatStartAlert(competition: any): string {
    const compName = escapeTelegramHtml(competition.name || 'المسابقة التعليمية');
    const supervisor = escapeTelegramHtml(competition.schoolName || competition.teacherDisplayName || 'إدارة المنصة');
    const questionsCount = competition.questionsCount || (competition.questions ? competition.questions.length : 5);
    const qDuration = competition.questionDuration || 30;
    const durationText = `${qDuration} ثانية لكل سؤال`;
    const rewardText = escapeTelegramHtml(competition.rewardType || 'وسام التميز والتفوق');

    let endFormatted = 'حتى إغلاق قاعة الاختبار';
    if (competition.endTime) {
      endFormatted = formatArabicDateTime(competition.endTime, competition.startTime);
    }

    return `🔔🔥 <b>تنبيه: انطلقت المسابقة الآن!</b> 🔥🔔
━━━━━━━━━━━━━━━━━━
🌍✨ <b>${compName}</b> ✨🌍
💡 بإشراف ${supervisor}

قاعة الاختبار مفتوحة الآن وبدأ وقت استقبال إجابات الطلاب! 🚀
📝 <b>عدد الأسئلة:</b> ${questionsCount}
⏱️ <b>مدة التحدي:</b> ${durationText}
🏆 <b>المكافأة:</b> ${rewardText}
⏳ <b>ينتهي استقبال المشاركات:</b>
${endFormatted}

━━━━━━━━━━━━━━━━━━
⚡ فكّر بسرعة… أجب بثقة… ونافس على الصدارة!
🥇 هل سيكون اسمك بين المتصدرين؟
أثبت تميزك وابدأ التحدي الآن! 💪🏆
👇 اضغط على الزر أدناه وكن مستعدًا للانطلاق`;
  }

  // Helper: Format Arabic rank text with emoji
  function getArabicRankText(rank: number): { medal: string; title: string } {
    switch (rank) {
      case 1: return { medal: '🥇', title: 'المركز الأول' };
      case 2: return { medal: '🥈', title: 'المركز الثاني' };
      case 3: return { medal: '🥉', title: 'المركز الثالث' };
      case 4: return { medal: '🎖️', title: 'المركز الرابع' };
      case 5: return { medal: '🎖️', title: 'المركز الخامس' };
      case 6: return { medal: '🎖️', title: 'المركز السادس' };
      case 7: return { medal: '🎖️', title: 'المركز السابع' };
      case 8: return { medal: '🎖️', title: 'المركز الثامن' };
      case 9: return { medal: '🎖️', title: 'المركز التاسع' };
      case 10: return { medal: '🎖️', title: 'المركز العاشر' };
      default: return { medal: '🎖️', title: `المركز ${rank}` };
    }
  }

  // Helper: Format beautiful leaderboard announcement matching user's exact specification
  function formatLeaderboardAnnouncement(competitionName: string, leaderboard: any[]): string {
    if (!leaderboard || leaderboard.length === 0) {
      return `🏆✨ <b>لوحة الشرف والمتصدرين</b> ✨🏆\n\n🎯 <b>مسابقة ${escapeTelegramHtml(competitionName)}</b>\n\nلم يتم تسجيل أي مشاركات حتى الآن.`;
    }

    const items = leaderboard.slice(0, 10).map((item: any, idx: number) => {
      const rankNum = item.rank || idx + 1;
      const { medal, title } = getArabicRankText(rankNum);
      const name = escapeTelegramHtml(item.name || item.studentName || item.participantName || 'بطل مشارك');

      let pct = 0;
      if (typeof item.percentage === 'number' && !isNaN(item.percentage) && item.percentage >= 0) {
        pct = item.percentage;
      } else if (item.correctAnswers !== undefined && item.totalQuestions && item.totalQuestions > 0) {
        pct = Math.round((item.correctAnswers / item.totalQuestions) * 100);
      } else if (item.totalScore && item.score) {
        pct = item.score <= 100 ? item.score : Math.min(100, Math.round((item.score / (item.totalScore * 100)) * 100));
      } else {
        pct = Math.min(100, Math.round(item.score || 0));
      }

      const timeSec = Math.round(item.timeSeconds || item.totalTimeSeconds || 0);
      let timeStr = `${timeSec} ثانية`;
      if (timeSec >= 60) {
        const mins = Math.floor(timeSec / 60);
        const remSec = timeSec % 60;
        timeStr = remSec > 0 ? `${mins} دقيقة و ${remSec} ثانية` : `${mins} دقيقة`;
      }

      return `${medal} ${title} — ${name}\n🏅 النتيجة: ${pct}% | ⏱️ ${timeStr}`;
    }).join('\n\n');

    return `🏆✨ <b>لوحة الشرف والمتصدرين</b> ✨🏆

🎯 <b>مسابقة ${escapeTelegramHtml(competitionName)}</b>

التميز يبدأ بالمنافسة وينتهي بالإنجاز! 🌟
نبارك لأبطالنا أصحاب المراكز الأولى:

${items}

━━━━━━━━━━━━━━━━━━

🌟 شكرا لكم !
كل إجابة صحيحة خطوة نحو التميز، وكل منافسة فرصة جديدة للتألق. 💫

ننتظر أبطالًا جددًا في المسابقة القادمة!

🏆 <b>تنافس • تعلّم • تميّز</b>`;
  }

  // Central Telegram Broadcasting Engine
  async function executeTelegramBroadcast(
    comp: any,
    type: 'announcement' | 'start' | 'results',
    customGroups?: string[]
  ): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
    // Refresh bot settings from DB if token or groups are missing in memory
    if (!telegramSettings.botToken || !telegramSettings.targetGroups || telegramSettings.targetGroups.length === 0) {
      try {
        const freshBot = await dbManager.getBotSettings();
        if (freshBot) {
          telegramSettings = {
            ...telegramSettings,
            ...freshBot,
            botToken: freshBot.botToken || telegramSettings.botToken,
            targetGroups: Array.isArray(freshBot.targetGroups) && freshBot.targetGroups.length > 0 ? freshBot.targetGroups : telegramSettings.targetGroups
          };
        }
      } catch {}
    }

    const token = telegramSettings.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️ Telegram broadcast skipped: botToken is not configured in settings.');
      return { success: false, sentCount: 0, errors: ['لم يتم ضبط رمز البوت (Bot Token) في إعدادات المنصة.'] };
    }

    const rawGroups: string[] = (customGroups && customGroups.length > 0)
      ? customGroups
      : (Array.isArray(comp?.targetTelegramGroups) && comp.targetTelegramGroups.length > 0)
      ? comp.targetTelegramGroups
      : (telegramSettings.targetGroups || []);
    const validGroups = rawGroups
      .map(String)
      .map(g => g.trim())
      .filter(g => g && !g.includes('1234567890'));

    if (validGroups.length === 0) {
      console.warn('⚠️ Telegram broadcast skipped: no valid targetGroups configured.');
      return { success: false, sentCount: 0, errors: ['لم يتم تحديد أي جروبات تليجرام صالحة للإرسال.'] };
    }

    const isOpenTraining = comp.competitionType === 'open';

    // Strict rule: Open Training NEVER broadcasts start alert or leaderboard results
    if (isOpenTraining && (type === 'start' || type === 'results')) {
      return { success: false, sentCount: 0, errors: ['التدريب المفتوح لا يتضمن تنبيه انطلاق أو إعلان نتائج.'] };
    }

    const baseUrl = comp.baseUrl || telegramSettings.platformBaseUrl || currentAppBaseUrl || process.env.BASE_URL || 'https://tanafas.app';
    const compSlugOrId = comp.webSlug || comp.id;
    const compUrl = comp.url || `${baseUrl}/?quiz=${encodeURIComponent(compSlugOrId)}`;

    let messageText = '';
    let replyMarkup: any = undefined;

    if (type === 'announcement') {
      messageText = isOpenTraining
        ? formatOpenTrainingAnnouncement(comp)
        : formatCompetitionAnnouncement(comp);

      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: isOpenTraining ? '🎯 ابدأ التدريب المفتوح الآن' : '🚀 ابدأ التحدي والمشاركة الآن',
              url: compUrl
            }
          ]
        ]
      };
    } else if (type === 'start') {
      messageText = formatStartAlert(comp);
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '🚀 ابدأ التحدي والمشاركة الآن',
              url: compUrl
            }
          ]
        ]
      };
    } else if (type === 'results') {
      messageText = formatLeaderboardAnnouncement(comp.name, comp.leaderboard || []);
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '📊 عرض النتائج والشهادات بالمنصة',
              url: compUrl
            }
          ]
        ]
      };
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const group of validGroups) {
      try {
        await callTelegramApi(token, 'sendMessage', {
          chat_id: group,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });
        sentCount++;
      } catch (err: any) {
        errors.push(`فشل الإرسال للجروب ${group}: ${err.message}`);
        console.warn(`Failed telegram broadcast (${type}) to group ${group}:`, err.message);
      }
    }

    console.log(`📢 Telegram broadcast (${type}) for "${comp.name || comp.id}": ${sentCount}/${validGroups.length} groups.`);
    return { success: sentCount > 0, sentCount, errors };
  }

  // Telegram: Broadcast Competition to Groups
  app.post('/api/telegram/broadcast-competition', async (req: Request, res: Response) => {
    try {
      const { groups, competition } = req.body;
      if (!competition) {
        return res.status(400).json({ error: 'بيانات المسابقة مطلوبة.' });
      }
      const result = await executeTelegramBroadcast(competition, 'announcement', groups);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telegram: Broadcast Competition Start Alert to Groups
  app.post('/api/telegram/broadcast-start', async (req: Request, res: Response) => {
    try {
      const { groups, competition } = req.body;
      if (!competition) {
        return res.status(400).json({ error: 'بيانات المسابقة مطلوبة.' });
      }
      if (competition.competitionType === 'open') {
        return res.status(400).json({ error: 'التدريب المفتوح لا يتضمن تنبيه انطلاق.' });
      }
      const result = await executeTelegramBroadcast(competition, 'start', groups);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telegram: Broadcast Leaderboard Results to Groups
  app.post('/api/telegram/broadcast-results', async (req: Request, res: Response) => {
    try {
      const { groups, competitionName, competitionUrl, leaderboard, competitionType } = req.body;
      if (competitionType === 'open') {
        return res.status(400).json({ error: 'التدريب المفتوح لا يتضمن إعلان فائزين أو لوحة شرف.' });
      }
      const compPayload = {
        name: competitionName || 'المسابقة',
        url: competitionUrl,
        leaderboard: leaderboard || [],
        competitionType
      };
      const result = await executeTelegramBroadcast(compPayload, 'results', groups);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telegram: Register Webhook with Telegram
  app.post('/api/telegram/set-webhook', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { webhookUrl, token } = req.body;
      let targetToken = String(token || '').trim();
      if (!targetToken || targetToken.startsWith('•••')) {
        targetToken = telegramSettings.botToken || '';
      }
      if (!targetToken) {
        const saved = await dbManager.getBotSettings();
        if (saved?.botToken && !saved.botToken.startsWith('•••')) {
          targetToken = saved.botToken.trim();
        }
      }
      if (!targetToken || targetToken.startsWith('•••')) {
        return res.status(400).json({ success: false, error: 'رمز البوت (Bot Token) غير مهيأ. يرجى حفظ الرمز أولاً.' });
      }
      if (!webhookUrl || !String(webhookUrl).trim()) {
        return res.status(400).json({ success: false, error: 'رابط الويب هوك (Webhook URL) مطلوب.' });
      }

      const cleanUrl = String(webhookUrl).trim();
      const secret = getTelegramWebhookSecret();
      const result = await callTelegramApi(targetToken, 'setWebhook', {
        url: cleanUrl,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query']
      });

      stopTelegramPolling();

      telegramSettings.webhookUrl = cleanUrl;
      await dbManager.saveBotSettings(telegramSettings);

      console.log(`🤖 Telegram Webhook registered successfully: ${cleanUrl}`);
      res.json({
        success: true,
        result,
        webhookUrl: cleanUrl,
        message: 'تم تسجيل وتفعيل الويب هوك بنجاح مع سيرفرات تليجرام.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Telegram: Live Webhook Status from Telegram Bot API
  app.get('/api/telegram/webhook-info', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      let targetToken = telegramSettings.botToken || '';
      if (!targetToken) {
        const saved = await dbManager.getBotSettings();
        if (saved?.botToken && !saved.botToken.startsWith('•••')) {
          targetToken = saved.botToken.trim();
        }
      }
      if (!targetToken || targetToken.startsWith('•••')) {
        return res.status(400).json({ success: false, error: 'رمز البوت غير مهيأ.' });
      }

      const info = await callTelegramApi(targetToken, 'getWebhookInfo', {});
      res.json({
        success: true,
        info,
        configuredWebhookUrl: telegramSettings.webhookUrl || '',
        pollingActive: isPollingActive
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Telegram: Delete / Remove Webhook and switch back to Polling
  app.post('/api/telegram/delete-webhook', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      let targetToken = telegramSettings.botToken || '';
      if (!targetToken) {
        const saved = await dbManager.getBotSettings();
        if (saved?.botToken && !saved.botToken.startsWith('•••')) {
          targetToken = saved.botToken.trim();
        }
      }
      if (!targetToken || targetToken.startsWith('•••')) {
        return res.status(400).json({ success: false, error: 'رمز البوت غير مهيأ.' });
      }

      const result = await callTelegramApi(targetToken, 'deleteWebhook', { drop_pending_updates: false });

      telegramSettings.webhookUrl = '';
      await dbManager.saveBotSettings(telegramSettings);

      const targetBase = telegramSettings.platformBaseUrl || currentAppBaseUrl || `http://localhost:${PORT}`;
      startTelegramPollingWorker(targetBase).catch(() => {});

      res.json({
        success: true,
        result,
        message: 'تم إلغاء الويب هوك بنجاح والعودة إلى وضع الاتصال اللحظي المباشر.'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Telegram: Incoming Webhook Updates Handler (Direct interaction with Students & Groups!)
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    try {
      if (req.header('x-telegram-bot-api-secret-token') !== getTelegramWebhookSecret()) {
        return res.status(401).send('Unauthorized');
      }
      const update = req.body;
      // Immediately acknowledge Telegram
      res.status(200).send('OK');

      const hostUrl = req.headers['x-forwarded-host'] || req.headers.host || 'tanafas.app';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = telegramSettings.platformBaseUrl || currentAppBaseUrl || `${protocol}://${hostUrl}`;

      await handleTelegramUpdate(update, baseUrl);
    } catch (err) {
      console.error('Telegram webhook error:', err);
    }
  });

  // Database offline and network error handling fallback
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err && (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError' || err.name === 'MongooseError' || err.message?.includes('buffering timed out'))) {
      console.warn('[Database] Offline or unreachable — returning graceful fallback');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'الخدمة غير متوفرة مؤقتاً بسبب انقطاع الاتصال بقاعدة البيانات' });
    }
    next(err);
  });

  // Serve Frontend
  if (process.env.NODE_ENV !== 'production') {
    // Development mode: integrate Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode (Render / Cloud Run): serve static assets from dist with long-term caching
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(jpg|jpeg|png|webp|svg|gif|ico|woff2?|css|js)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Periodic memory cleanup: purge expired rate limits and session tokens
  setInterval(() => {
    const now = Date.now();
    for (const [ip, state] of adminRateLimitMap.entries()) {
      if (state.lockedUntil <= now) {
        adminRateLimitMap.delete(ip);
      }
    }
    // Hard capacity cap against brute force floods
    if (adminRateLimitMap.size > 5000) {
      adminRateLimitMap.clear();
    }

    const windowStart = now - 60000;
    for (const [ip, timestamps] of geminiRateLimitMap.entries()) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        geminiRateLimitMap.delete(ip);
      } else {
        geminiRateLimitMap.set(ip, valid);
      }
    }
    if (geminiRateLimitMap.size > 5000) {
      geminiRateLimitMap.clear();
    }

    for (const [token, exp] of adminSessions.entries()) {
      if (exp <= now) {
        adminSessions.delete(token);
      }
    }
    if (adminSessions.size > 2000) {
      adminSessions.clear();
    }
  }, 3 * 60 * 1000);

  // Automated Telegram Background Scheduler: Checks every 15s for start alerts & end results broadcasts
  setInterval(async () => {
    try {
      if (!telegramSettings.botToken || !telegramSettings.targetGroups || telegramSettings.targetGroups.length === 0) {
        const fresh = await dbManager.getBotSettings();
        if (fresh) {
          telegramSettings = {
            ...telegramSettings,
            ...fresh,
            botToken: fresh.botToken || telegramSettings.botToken,
            targetGroups: Array.isArray(fresh.targetGroups) ? fresh.targetGroups : telegramSettings.targetGroups
          };
        }
      }

      const token = telegramSettings.botToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      const rawGroups = telegramSettings.targetGroups || [];
      const validGroups = rawGroups
        .map(String)
        .map(g => g.trim())
        .filter(g => g && !g.includes('1234567890'));

      const competitions = await dbManager.getCompetitions();
      const now = Date.now();

      for (const comp of competitions) {
        if (!comp || comp.competitionType === 'open') continue;

        const compGroups = (Array.isArray(comp.targetTelegramGroups) && comp.targetTelegramGroups.length > 0)
          ? comp.targetTelegramGroups.map(String).map(g => g.trim()).filter(Boolean)
          : validGroups;

        if (!compGroups || compGroups.length === 0) continue;

        const parseEpochTime = (tStr: any): number => {
          if (!tStr) return 0;
          const d = new Date(tStr);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };

        const startMs = parseEpochTime(comp.startTime);
        const endMs = parseEpochTime(comp.endTime);

        // 1. Check if competition start time has arrived and start alert hasn't been sent
        if (
          comp.autoNotifyStartTelegram !== false &&
          !comp.notifiedStartTelegram &&
          startMs > 0 &&
          now >= (startMs - 15000) && // Leeway of 15s to guarantee scheduled broadcast
          (endMs === 0 || now < endMs) &&
          now - startMs < 7 * 24 * 3600 * 1000 // Within 7 days of start
        ) {
          console.log(`⏰ Broadcasting start alert for "${comp.name}" to Telegram...`);
          const compGroups = (Array.isArray(comp.targetTelegramGroups) && comp.targetTelegramGroups.length > 0)
            ? comp.targetTelegramGroups
            : validGroups;
          const sRes = await executeTelegramBroadcast(comp, 'start', compGroups);
          if (sRes.success) {
            comp.notifiedStartTelegram = true;
            await dbManager.saveCompetition(comp);
          }
        }

        // 2. Check if competition end time has arrived and winners haven't been broadcasted
        if (
          comp.autoBroadcastResultsTelegram &&
          !comp.notifiedResultsTelegram &&
          endMs > 0 &&
          now >= endMs &&
          now - endMs < 48 * 3600 * 1000 // Within 48 hours of end
        ) {
          console.log(`🏁 Broadcasting end results for "${comp.name}" to Telegram...`);
          const participants = await dbManager.getParticipants(comp.id);
          const validParticipants = participants.filter((p: any) => !p.isDisqualified && (p.score || 0) >= 0);
          if (validParticipants.length > 0) {
            const sorted = [...validParticipants].sort((a, b) => {
              const scoreDiff = (b.score || 0) - (a.score || 0);
              if (scoreDiff !== 0) return scoreDiff;
              return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
            });

            const compGroups = (Array.isArray(comp.targetTelegramGroups) && comp.targetTelegramGroups.length > 0)
              ? comp.targetTelegramGroups
              : validGroups;
            const rRes = await executeTelegramBroadcast({ ...comp, leaderboard: sorted }, 'results', compGroups);
            if (rRes.success) {
              comp.notifiedResultsTelegram = true;
              await dbManager.saveCompetition(comp);
            }
          } else {
            // No participants recorded for this competition, mark as notified to avoid repeating every 15s
            comp.notifiedResultsTelegram = true;
            await dbManager.saveCompetition(comp);
          }
        }
      }
    } catch (err) {
      console.error('Error in automated Telegram broadcast interval:', err);
    }
  }, 15 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tanafas Server running on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || 'development'})`);
    const initialBase = currentAppBaseUrl || telegramSettings.platformBaseUrl || process.env.BASE_URL || `http://localhost:${PORT}`;
    startTelegramPollingWorker(initialBase).catch(() => {});
  });
}

startServer();
