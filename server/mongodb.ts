import { MongoClient } from 'mongodb';
import type { Db, Collection } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { INITIAL_COMPETITIONS, INITIAL_ACCESS_CODES, INITIAL_MANUAL_CERTIFICATES, INITIAL_BANK_DOMAINS, INITIAL_BANK_QUESTIONS } from '../src/data/mockData.ts';

export interface DBCompetition {
  id: string;
  webSlug?: string;
  name: string;
  description?: string;
  schoolName?: string;
  questions?: any[];
  examDurationMinutes?: number;
  passingPercentage?: number;
  rewardType?: string;
  certificateEnabled?: boolean;
  shuffleQuestions?: boolean;
  antiCheatEnabled?: boolean;
  hideAnswersUntilEnd?: boolean;
  singleAttempt?: boolean;
  status?: 'active' | 'upcoming' | 'ended';
  competitionType?: string;
  participationType?: 'individual' | 'team';
  visibility?: 'public' | 'private';
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface DBParticipant {
  id: string;
  competitionId: string;
  studentName: string;
  school: string;
  score: number;
  totalScore: number;
  percentage?: number;
  correctAnswers: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  answers: any[];
  submittedAt: string;
  rank?: number;
  teamId?: string;
  teamName?: string;
  teamCode?: string;
  isTeamLeader?: boolean;
  isDisqualified?: boolean;
  disqualifiedReason?: string;
}

export interface DBTeam {
  id: string;
  competitionId: string;
  teamName: string;
  teamCode: string;
  school: string;
  leaderName: string;
  members: Array<{
    studentName: string;
    school: string;
    isLeader: boolean;
    joinedAt: string;
    completed?: boolean;
    score?: number;
    timeSeconds?: number;
  }>;
  maxMembers: number;
  isLocked: boolean;
  createdAt: string;
}

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;
  private connectionError: string | null = null;

  // Fallback persistent storage path when MongoDB URI is not provided
  private fallbackFilePath = path.join(process.cwd(), 'data', 'tanafas_db.json');
  private fallbackData: {
    competitions: DBCompetition[];
    participants: DBParticipant[];
    teams: DBTeam[];
    botSettings: any;
    adminPasscode?: string;
    accessCodes: any[];
    manualCerts: any[];
    bankDomains: any[];
    bankQuestions: any[];
  } = {
    competitions: [],
    participants: [],
    teams: [],
    botSettings: {},
    adminPasscode: 'admin@tanafas2026',
    accessCodes: [],
    manualCerts: [],
    bankDomains: [],
    bankQuestions: []
  };

  constructor() {
    this.initFallbackStore();
  }

  private initFallbackStore() {
    try {
      const dataDir = path.dirname(this.fallbackFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.fallbackFilePath)) {
        const raw = fs.readFileSync(this.fallbackFilePath, 'utf8');
        const parsed = JSON.parse(raw);

        // Ensure comp-question-bank is present in competitions
        let comps = Array.isArray(parsed.competitions) ? parsed.competitions : (INITIAL_COMPETITIONS as DBCompetition[]);
        const hasBankComp = comps.some((c: any) => c.id === 'comp-question-bank');
        if (!hasBankComp) {
          const bankComp = (INITIAL_COMPETITIONS as DBCompetition[]).find(c => c.id === 'comp-question-bank');
          if (bankComp) {
            comps = [bankComp, ...comps];
          }
        }

        const domainMap = new Map<string, any>();
        (INITIAL_BANK_DOMAINS as any[]).forEach(d => domainMap.set(d.id, d));
        if (Array.isArray(parsed.bankDomains)) {
          parsed.bankDomains.forEach((d: any) => domainMap.set(d.id, d));
        }

        const qMap = new Map<string, any>();
        (INITIAL_BANK_QUESTIONS as any[]).forEach(q => qMap.set(q.id, q));
        if (Array.isArray(parsed.bankQuestions)) {
          parsed.bankQuestions.forEach((q: any) => qMap.set(q.id, q));
        }

        this.fallbackData = {
          ...this.fallbackData,
          ...parsed,
          competitions: comps,
          botSettings: parsed.botSettings || {},
          adminPasscode: parsed.adminPasscode || 'admin@tanafas2026',
          accessCodes: Array.isArray(parsed.accessCodes) && parsed.accessCodes.length > 0 ? parsed.accessCodes : (INITIAL_ACCESS_CODES as any[]),
          manualCerts: Array.isArray(parsed.manualCerts) ? parsed.manualCerts : (INITIAL_MANUAL_CERTIFICATES as any[]),
          bankDomains: Array.from(domainMap.values()),
          bankQuestions: Array.from(qMap.values())
        };
        this.saveFallbackStore();
      } else {
        // Pre-seed with default competitions, access codes, and question bank
        this.fallbackData.competitions = INITIAL_COMPETITIONS as DBCompetition[];
        this.fallbackData.accessCodes = INITIAL_ACCESS_CODES as any[];
        this.fallbackData.manualCerts = INITIAL_MANUAL_CERTIFICATES as any[];
        this.fallbackData.bankDomains = INITIAL_BANK_DOMAINS as any[];
        this.fallbackData.bankQuestions = INITIAL_BANK_QUESTIONS as any[];
        this.fallbackData.adminPasscode = 'admin@tanafas2026';
        this.saveFallbackStore();
      }
    } catch (e: any) {
      console.warn('⚠️ Could not load local fallback storage, using in-memory store:', e.message);
      this.fallbackData.competitions = INITIAL_COMPETITIONS as DBCompetition[];
      this.fallbackData.accessCodes = INITIAL_ACCESS_CODES as any[];
      this.fallbackData.manualCerts = INITIAL_MANUAL_CERTIFICATES as any[];
      this.fallbackData.bankDomains = INITIAL_BANK_DOMAINS as any[];
      this.fallbackData.bankQuestions = INITIAL_BANK_QUESTIONS as any[];
      this.fallbackData.adminPasscode = 'admin@tanafas2026';
    }
  }

  private saveFallbackStore() {
    try {
      fs.writeFileSync(this.fallbackFilePath, JSON.stringify(this.fallbackData, null, 2), 'utf8');
    } catch (e: any) {
      console.error('Failed to save fallback data file:', e.message);
    }
  }

  public async init(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'tanafas';

    if (!uri) {
      console.log('ℹ️ MONGODB_URI is not set. Operating in high-speed local persistent mode (data/tanafas_db.json).');
      return;
    }

    try {
      console.log(`🔌 Attempting to connect to MongoDB (${uri.replace(/:([^:@]{1,})@/, ':****@')})...`);
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
        maxPoolSize: 15,
        minPoolSize: 1
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      this.isConnected = true;
      this.connectionError = null;
      console.log(`✅ Successfully connected to MongoDB database: "${dbName}"`);

      // Create indexes for maximum speed and data integrity
      await this.ensureIndexes();

      // Seed if empty
      await this.seedInitialDataIfEmpty();
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message || 'Unknown MongoDB connection error';
      console.warn(`⚠️ MongoDB connection error: ${this.connectionError}. Gracefully falling back to local persistent store.`);
    }
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;
    try {
      const compColl = this.db.collection('competitions');
      await compColl.createIndex({ id: 1 }, { unique: true });
      await compColl.createIndex({ webSlug: 1 });
      await compColl.createIndex({ status: 1, visibility: 1 });

      const partColl = this.db.collection('participants');
      await partColl.createIndex({ id: 1 }, { unique: true });
      await partColl.createIndex({ competitionId: 1, score: -1, totalTimeSeconds: 1 });
      await partColl.createIndex({ competitionId: 1, studentName: 1 });

      const teamColl = this.db.collection('teams');
      await teamColl.createIndex({ id: 1 }, { unique: true });
      await teamColl.createIndex({ competitionId: 1, teamCode: 1 });
      
      console.log('⚡ MongoDB performance indexes successfully verified.');
    } catch (err: any) {
      console.warn('Notice: Error verifying some MongoDB indexes:', err.message);
    }
  }

  private async seedInitialDataIfEmpty(): Promise<void> {
    if (!this.db) return;
    try {
      const count = await this.db.collection('competitions').countDocuments();
      if (count === 0 && INITIAL_COMPETITIONS && INITIAL_COMPETITIONS.length > 0) {
        console.log(`🌱 Seeding ${INITIAL_COMPETITIONS.length} default competitions to MongoDB...`);
        const docs = INITIAL_COMPETITIONS.map(c => ({
          ...c,
          createdAt: c.createdAt || new Date().toISOString()
        }));
        await this.db.collection('competitions').insertMany(docs);
        console.log('✅ MongoDB initial seeding completed.');
      }
    } catch (e: any) {
      console.warn('Could not seed initial data:', e.message);
    }
  }

  public async getStatus() {
    let compsCount = this.fallbackData.competitions.length;
    let partsCount = this.fallbackData.participants.length;
    let teamsCount = this.fallbackData.teams.length;

    if (this.isConnected && this.db) {
      try {
        compsCount = await this.db.collection('competitions').countDocuments();
        partsCount = await this.db.collection('participants').countDocuments();
        teamsCount = await this.db.collection('teams').countDocuments();
      } catch (e: any) {
        console.warn('Could not count documents:', e.message);
      }
    }

    return {
      connected: this.isConnected,
      engine: this.isConnected ? 'MongoDB' : 'LocalPersistentFile',
      database: this.isConnected ? (this.db?.databaseName || 'tanafas') : 'data/tanafas_db.json',
      error: this.connectionError,
      competitionsCount: compsCount,
      participantsCount: partsCount,
      teamsCount: teamsCount
    };
  }

  // ================= COMPETITIONS =================
  public async getCompetitions(filter?: { visibility?: string; status?: string }): Promise<DBCompetition[]> {
    if (this.isConnected && this.db) {
      try {
        const query: any = {};
        if (filter?.visibility) query.visibility = filter.visibility;
        if (filter?.status) query.status = filter.status;
        const list = await this.db.collection<DBCompetition>('competitions').find(query).sort({ createdAt: -1 }).toArray();
        return list.map(({ _id, ...rest }: any) => rest);
      } catch (e: any) {
        console.warn('⚠️ MongoDB getCompetitions error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    let result = [...this.fallbackData.competitions];
    if (filter?.visibility) {
      result = result.filter(c => c.visibility === filter.visibility);
    }
    if (filter?.status) {
      result = result.filter(c => c.status === filter.status);
    }
    return result;
  }

  public async getCompetitionByIdOrSlug(idOrSlug: string): Promise<DBCompetition | null> {
    if (!idOrSlug) return null;
    const clean = String(idOrSlug).trim().toLowerCase();

    if (this.isConnected && this.db) {
      try {
        const comp = await this.db.collection<DBCompetition>('competitions').findOne({
          $or: [{ id: idOrSlug }, { webSlug: clean }, { webSlug: idOrSlug }]
        });
        if (comp) {
          const { _id, ...rest }: any = comp;
          return rest;
        }
        return null;
      } catch (e: any) {
        console.warn('⚠️ MongoDB getCompetitionByIdOrSlug error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const found = this.fallbackData.competitions.find(
      c => c.id === idOrSlug || c.webSlug?.toLowerCase() === clean || c.webSlug === idOrSlug
    );
    return found || null;
  }

  public async saveCompetition(competition: DBCompetition): Promise<DBCompetition> {
    if (!competition.id) {
      competition.id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!competition.webSlug) {
      competition.webSlug = competition.id;
    }
    if (!competition.createdAt) {
      competition.createdAt = new Date().toISOString();
    }
    competition.updatedAt = new Date().toISOString();

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = competition as any;
        await this.db.collection('competitions').updateOne(
          { id: competition.id },
          { $set: cleanDoc },
          { upsert: true }
        );
        return competition;
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveCompetition error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const idx = this.fallbackData.competitions.findIndex(c => c.id === competition.id);
    if (idx >= 0) {
      this.fallbackData.competitions[idx] = competition;
    } else {
      this.fallbackData.competitions.unshift(competition);
    }
    this.saveFallbackStore();
    return competition;
  }

  public async saveBatchCompetitions(competitions: DBCompetition[]): Promise<number> {
    if (!Array.isArray(competitions) || competitions.length === 0) return 0;

    let saved = 0;
    for (const comp of competitions) {
      if (comp && comp.id && comp.name) {
        await this.saveCompetition(comp);
        saved++;
      }
    }
    return saved;
  }

  public async deleteCompetition(id: string): Promise<boolean> {
    if (this.isConnected && this.db) {
      try {
        const comp = await this.db.collection('competitions').findOne({
          $or: [{ id }, { webSlug: id }]
        });
        const targetId = comp?.id || id;
        const res = await this.db.collection('competitions').deleteOne({
          $or: [{ id: targetId }, { webSlug: targetId }]
        });
        await this.db.collection('participants').deleteMany({
          $or: [{ competitionId: targetId }, { competitionId: id }]
        });
        await this.db.collection('teams').deleteMany({
          $or: [{ competitionId: targetId }, { competitionId: id }]
        });
        return res.deletedCount > 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteCompetition error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = this.fallbackData.competitions.length;
    this.fallbackData.competitions = this.fallbackData.competitions.filter(c => c.id !== id && c.webSlug !== id);
    this.fallbackData.participants = this.fallbackData.participants.filter(p => p.competitionId !== id);
    this.fallbackData.teams = this.fallbackData.teams.filter(t => t.competitionId !== id);
    this.saveFallbackStore();
    return this.fallbackData.competitions.length < initialLen;
  }

  // ================= PARTICIPANTS & LEADERBOARD =================
  public async saveParticipantResult(result: DBParticipant): Promise<DBParticipant> {
    if (!result.id) {
      result.id = `part_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!result.submittedAt) {
      result.submittedAt = new Date().toISOString();
    }

    const resolvedName = result.studentName || (result as any).name || 'طالب مشارك';
    result.studentName = resolvedName;
    (result as any).name = resolvedName;

    // If participant is disqualified for anti-cheat, ensure score, correctAnswers and percentage are strictly zeroed out
    if (result.isDisqualified) {
      result.score = 0;
      result.correctAnswers = 0;
      result.percentage = 0;
    } else if (result.percentage === undefined) {
      if (result.totalQuestions && result.totalQuestions > 0) {
        result.percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
      } else {
        result.percentage = Math.min(100, Math.round(result.score || 0));
      }
    }

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = result as any;
        await this.db.collection('participants').updateOne(
          { id: result.id },
          { $set: cleanDoc },
          { upsert: true }
        );
        return result;
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveParticipantResult error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const idx = this.fallbackData.participants.findIndex(p => p.id === result.id);
    if (idx >= 0) {
      this.fallbackData.participants[idx] = result;
    } else {
      this.fallbackData.participants.push(result);
    }
    this.saveFallbackStore();
    return result;
  }

  public async deleteParticipant(id: string): Promise<boolean> {
    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('participants').deleteOne({ id });
        return res.deletedCount > 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteParticipant error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = this.fallbackData.participants.length;
    this.fallbackData.participants = this.fallbackData.participants.filter(p => p.id !== id);
    this.saveFallbackStore();
    return this.fallbackData.participants.length < initialLen;
  }

  public async clearCompetitionParticipants(competitionId: string): Promise<number> {
    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('participants').deleteMany({ competitionId });
        await this.db.collection('teams').deleteMany({ competitionId });
        return res.deletedCount;
      } catch (e: any) {
        console.warn('⚠️ MongoDB clearCompetitionParticipants error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = this.fallbackData.participants.length;
    this.fallbackData.participants = this.fallbackData.participants.filter(p => p.competitionId !== competitionId);
    this.fallbackData.teams = this.fallbackData.teams.filter(t => t.competitionId !== competitionId);
    this.saveFallbackStore();
    return initialLen - this.fallbackData.participants.length;
  }

  public async getParticipants(competitionId?: string): Promise<DBParticipant[]> {
    let resolvedCompId = competitionId;
    if (competitionId) {
      const comp = await this.getCompetitionByIdOrSlug(competitionId);
      if (comp) {
        resolvedCompId = comp.id;
      }
    }

    if (this.isConnected && this.db) {
      try {
        const query = resolvedCompId ? {
          $or: [
            { competitionId: resolvedCompId },
            ...(competitionId && competitionId !== resolvedCompId ? [{ competitionId }] : [])
          ]
        } : {};
        const list = await this.db.collection<DBParticipant>('participants').find(query).toArray();
        return list.map(({ _id, ...rest }: any) => ({
          ...rest,
          name: rest.name || rest.studentName || 'طالب مشارك',
          studentName: rest.studentName || rest.name || 'طالب مشارك'
        }));
      } catch (e: any) {
        console.warn('⚠️ MongoDB getParticipants error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    let list = this.fallbackData.participants;
    if (resolvedCompId) {
      list = list.filter(p => p.competitionId === resolvedCompId || (competitionId && p.competitionId === competitionId));
    }
    return list.map(p => ({
      ...p,
      name: (p as any).name || p.studentName || 'طالب مشارك',
      studentName: p.studentName || (p as any).name || 'طالب مشارك'
    }));
  }

  public async getLeaderboard(competitionId: string, limit: number = 50): Promise<DBParticipant[]> {
    let participants = await this.getParticipants(competitionId);

    // Sort by percentage/score descending, then totalTimeSeconds ascending (fastest wins tie)
    participants.sort((a, b) => {
      const aPct = a.percentage ?? (a.totalQuestions ? (a.correctAnswers / a.totalQuestions) * 100 : a.score);
      const bPct = b.percentage ?? (b.totalQuestions ? (b.correctAnswers / b.totalQuestions) * 100 : b.score);
      if (bPct !== aPct) return bPct - aPct;
      return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
    });

    return participants.slice(0, limit).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  }

  // ================= TEAMS =================
  public async getTeams(competitionId?: string): Promise<DBTeam[]> {
    if (this.isConnected && this.db) {
      try {
        const query = competitionId ? { competitionId } : {};
        const list = await this.db.collection<DBTeam>('teams').find(query).toArray();
        return list.map(({ _id, ...rest }: any) => rest);
      } catch (e: any) {
        console.warn('⚠️ MongoDB getTeams error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    if (competitionId) {
      return this.fallbackData.teams.filter(t => t.competitionId === competitionId);
    }
    return [...this.fallbackData.teams];
  }

  public async getTeamByCode(competitionId: string, code: string): Promise<DBTeam | null> {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;

    if (this.isConnected && this.db) {
      try {
        const team = await this.db.collection<DBTeam>('teams').findOne({
          competitionId,
          teamCode: cleanCode
        });
        if (team) {
          const { _id, ...rest }: any = team;
          return rest;
        }
        return null;
      } catch (e: any) {
        console.warn('⚠️ MongoDB getTeamByCode error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const found = this.fallbackData.teams.find(
      t => t.competitionId === competitionId && t.teamCode?.toUpperCase() === cleanCode
    );
    return found || null;
  }

  public async saveTeam(team: DBTeam): Promise<DBTeam> {
    if (!team.id) {
      team.id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!team.createdAt) {
      team.createdAt = new Date().toISOString();
    }
    if (team.teamCode) {
      team.teamCode = String(team.teamCode).toUpperCase();
    }

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = team as any;
        await this.db.collection('teams').updateOne(
          { id: team.id },
          { $set: cleanDoc },
          { upsert: true }
        );
        return team;
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveTeam error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const idx = this.fallbackData.teams.findIndex(t => t.id === team.id || (t.competitionId === team.competitionId && t.teamCode === team.teamCode));
    if (idx >= 0) {
      this.fallbackData.teams[idx] = team;
    } else {
      this.fallbackData.teams.push(team);
    }
    this.saveFallbackStore();
    return team;
  }

  public async deleteTeam(competitionId: string, teamCode: string): Promise<boolean> {
    const cleanCode = String(teamCode || '').trim().toUpperCase();
    if (!cleanCode) return false;

    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('teams').deleteOne({
          competitionId,
          teamCode: cleanCode
        });
        return res.deletedCount > 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteTeam error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = this.fallbackData.teams.length;
    this.fallbackData.teams = this.fallbackData.teams.filter(
      t => !(t.competitionId === competitionId && t.teamCode?.toUpperCase() === cleanCode)
    );
    this.saveFallbackStore();
    return this.fallbackData.teams.length < initialLen;
  }

  public async saveBatchTeams(teams: DBTeam[]): Promise<number> {
    if (!Array.isArray(teams) || teams.length === 0) return 0;
    let saved = 0;
    for (const team of teams) {
      if (team && team.competitionId && (team.teamName || (team as any).name)) {
        if (!team.teamName && (team as any).name) {
          team.teamName = (team as any).name;
        }
        await this.saveTeam(team);
        saved++;
      }
    }
    return saved;
  }

  // ================= BOT SETTINGS =================
  public async getBotSettings(): Promise<any> {
    if (this.isConnected && this.db) {
      try {
        const doc = await this.db.collection('settings').findOne({ key: 'telegram_bot' });
        if (doc && doc.value) {
          return doc.value;
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getBotSettings error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    return this.fallbackData.botSettings || null;
  }

  public async saveBotSettings(settings: any): Promise<void> {
    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = settings as any;
        await this.db.collection('settings').updateOne(
          { key: 'telegram_bot' },
          { $set: { key: 'telegram_bot', value: cleanDoc, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveBotSettings error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    this.fallbackData.botSettings = settings;
    this.saveFallbackStore();
  }

  // ================= ADMIN PASSCODE =================
  public async getAdminPasscode(): Promise<string> {
    if (this.isConnected && this.db) {
      try {
        const doc = await this.db.collection('settings').findOne({ key: 'admin_passcode' });
        if (doc && doc.value) {
          return String(doc.value).trim();
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getAdminPasscode error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    return (this.fallbackData.adminPasscode || 'admin@tanafas2026').trim();
  }

  public async setAdminPasscode(passcode: string): Promise<boolean> {
    const clean = String(passcode || '').trim();
    if (!clean) return false;

    if (this.isConnected && this.db) {
      try {
        await this.db.collection('settings').updateOne(
          { key: 'admin_passcode' },
          { $set: { key: 'admin_passcode', value: clean, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB setAdminPasscode error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    this.fallbackData.adminPasscode = clean;
    this.saveFallbackStore();
    return true;
  }

  // ================= ACCESS CODES =================
  public async getAccessCodes(): Promise<any[]> {
    if (this.isConnected && this.db) {
      try {
        const list = await this.db.collection('access_codes').find({}).toArray();
        if (list.length > 0) {
          return list.map(({ _id, ...rest }) => rest);
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getAccessCodes error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    return [...(this.fallbackData.accessCodes || INITIAL_ACCESS_CODES)];
  }

  public async saveAccessCode(code: any): Promise<any> {
    if (!code || !code.code) return code;
    code.code = String(code.code).trim().toUpperCase();
    if (!code.id) {
      code.id = `code_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!code.createdAt) {
      code.createdAt = new Date().toISOString();
    }

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = code as any;
        await this.db.collection('access_codes').updateOne(
          { id: code.id },
          { $set: cleanDoc },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveAccessCode error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const list = this.fallbackData.accessCodes || [];
    const idx = list.findIndex((c: any) => c.id === code.id || c.code?.toUpperCase() === code.code.toUpperCase());
    if (idx >= 0) {
      list[idx] = code;
    } else {
      list.unshift(code);
    }
    this.fallbackData.accessCodes = list;
    this.saveFallbackStore();
    return code;
  }

  public async saveBatchAccessCodes(codes: any[]): Promise<number> {
    if (!Array.isArray(codes) || codes.length === 0) return 0;
    let saved = 0;
    for (const code of codes) {
      if (code && code.code) {
        await this.saveAccessCode(code);
        saved++;
      }
    }
    return saved;
  }

  public async deleteAccessCode(id: string): Promise<boolean> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return false;

    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('access_codes').deleteOne({
          $or: [{ id: cleanId }, { code: cleanId }, { code: cleanId.toUpperCase() }]
        });
        return res.deletedCount > 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteAccessCode error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    const initialLen = (this.fallbackData.accessCodes || []).length;
    this.fallbackData.accessCodes = (this.fallbackData.accessCodes || []).filter(
      (c: any) => c.id !== cleanId && c.code?.toUpperCase() !== cleanId.toUpperCase()
    );
    this.saveFallbackStore();
    return (this.fallbackData.accessCodes || []).length < initialLen;
  }

  // ================= MANUAL CERTIFICATES =================
  public async getManualCertificates(): Promise<any[]> {
    if (this.isConnected && this.db) {
      try {
        const list = await this.db.collection('manual_certificates').find({}).toArray();
        if (list.length > 0) {
          return list.map(({ _id, ...rest }) => rest);
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getManualCertificates error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    return [...(this.fallbackData.manualCerts || INITIAL_MANUAL_CERTIFICATES)];
  }

  public async saveManualCertificate(cert: any): Promise<any> {
    if (!cert) return cert;
    if (!cert.id) {
      cert.id = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!cert.issueDate) {
      cert.issueDate = new Date().toISOString();
    }

    if (this.isConnected && this.db) {
      try {
        await this.db.collection('manual_certificates').updateOne(
          { id: cert.id },
          { $set: cert },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveManualCertificate error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const list = this.fallbackData.manualCerts || [];
    const idx = list.findIndex((c: any) => c.id === cert.id);
    if (idx >= 0) {
      list[idx] = cert;
    } else {
      list.unshift(cert);
    }
    this.fallbackData.manualCerts = list;
    this.saveFallbackStore();
    return cert;
  }

  // ================= QUESTION BANK: DOMAINS =================
  public async getBankDomains(): Promise<any[]> {
    if (this.isConnected && this.db) {
      try {
        const list = await this.db.collection('bank_domains').find({}).toArray();
        if (list.length > 0) {
          return list.map(({ _id, ...rest }) => rest);
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getBankDomains error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }
    return [...(this.fallbackData.bankDomains || INITIAL_BANK_DOMAINS)];
  }

  public async saveBankDomain(domain: any): Promise<any> {
    if (!domain || !domain.name) return domain;
    if (!domain.id) {
      domain.id = `domain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }
    if (!domain.createdAt) {
      domain.createdAt = new Date().toISOString();
    }
    domain.updatedAt = new Date().toISOString();

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = domain as any;
        await this.db.collection('bank_domains').updateOne(
          { id: domain.id },
          { $set: cleanDoc },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveBankDomain error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const list = this.fallbackData.bankDomains || [];
    const idx = list.findIndex((d: any) => d.id === domain.id);
    if (idx >= 0) {
      list[idx] = domain;
    } else {
      list.push(domain);
    }
    this.fallbackData.bankDomains = list;
    this.saveFallbackStore();
    return domain;
  }

  public async deleteBankDomain(id: string): Promise<boolean> {
    if (this.isConnected && this.db) {
      try {
        await this.db.collection('bank_domains').deleteOne({ id });
        await this.db.collection('bank_questions').deleteMany({ domainId: id });
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteBankDomain error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = (this.fallbackData.bankDomains || []).length;
    this.fallbackData.bankDomains = (this.fallbackData.bankDomains || []).filter((d: any) => d.id !== id);
    this.fallbackData.bankQuestions = (this.fallbackData.bankQuestions || []).filter((q: any) => q.domainId !== id);
    this.saveFallbackStore();
    return (this.fallbackData.bankDomains || []).length < initialLen;
  }

  public async emptyBankDomain(domainId: string): Promise<number> {
    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('bank_questions').deleteMany({ domainId });
        return res.deletedCount || 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB emptyBankDomain error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = (this.fallbackData.bankQuestions || []).length;
    this.fallbackData.bankQuestions = (this.fallbackData.bankQuestions || []).filter((q: any) => q.domainId !== domainId);
    const deletedCount = initialLen - (this.fallbackData.bankQuestions || []).length;
    this.saveFallbackStore();
    return deletedCount;
  }

  // ================= QUESTION BANK: QUESTIONS =================
  public async getBankQuestions(domainId?: string): Promise<any[]> {
    if (this.isConnected && this.db) {
      try {
        const query = domainId && domainId !== 'all' ? { domainId } : {};
        const list = await this.db.collection('bank_questions').find(query).toArray();
        if (list.length > 0) {
          return list.map(({ _id, ...rest }) => rest);
        }
      } catch (e: any) {
        console.warn('⚠️ MongoDB getBankQuestions error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    let list = this.fallbackData.bankQuestions || INITIAL_BANK_QUESTIONS;
    if (domainId && domainId !== 'all') {
      list = list.filter((q: any) => q.domainId === domainId);
    }
    return [...list];
  }

  public async saveBankQuestion(question: any): Promise<any> {
    if (!question || !question.text) return question;
    if (!question.id) {
      question.id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (!question.createdAt) {
      question.createdAt = new Date().toISOString();
    }

    if (this.isConnected && this.db) {
      try {
        const { _id, ...cleanDoc } = question as any;
        await this.db.collection('bank_questions').updateOne(
          { id: question.id },
          { $set: cleanDoc },
          { upsert: true }
        );
      } catch (e: any) {
        console.warn('⚠️ MongoDB saveBankQuestion error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const list = this.fallbackData.bankQuestions || [];
    const idx = list.findIndex((q: any) => q.id === question.id);
    if (idx >= 0) {
      list[idx] = question;
    } else {
      list.unshift(question);
    }
    this.fallbackData.bankQuestions = list;
    this.saveFallbackStore();
    return question;
  }

  public async saveBatchBankQuestions(questions: any[]): Promise<number> {
    if (!Array.isArray(questions) || questions.length === 0) return 0;
    let count = 0;
    for (const q of questions) {
      if (q && q.text) {
        await this.saveBankQuestion(q);
        count++;
      }
    }
    return count;
  }

  public async deleteBankQuestion(id: string): Promise<boolean> {
    if (this.isConnected && this.db) {
      try {
        const res = await this.db.collection('bank_questions').deleteOne({ id });
        return res.deletedCount > 0;
      } catch (e: any) {
        console.warn('⚠️ MongoDB deleteBankQuestion error, falling back to local store:', e.message);
        this.isConnected = false;
      }
    }

    const initialLen = (this.fallbackData.bankQuestions || []).length;
    this.fallbackData.bankQuestions = (this.fallbackData.bankQuestions || []).filter((q: any) => q.id !== id);
    this.saveFallbackStore();
    return (this.fallbackData.bankQuestions || []).length < initialLen;
  }
}

export const dbManager = new DatabaseManager();
