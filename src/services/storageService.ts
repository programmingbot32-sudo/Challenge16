import { 
  Competition, 
  AccessCode, 
  Participant, 
  ParticipantAnswer, 
  ParticipantResult, 
  TeamResult, 
  ManualCertificate,
  TelegramBotSettings,
  CompetitionTeam,
  TeamMember,
  QuestionBankDomain,
  BankQuestion,
  Question
} from '../types';
import {
  INITIAL_ACCESS_CODES,
  INITIAL_COMPETITIONS,
  INITIAL_PARTICIPANTS,
  INITIAL_ANSWERS,
  INITIAL_MANUAL_CERTIFICATES,
  INITIAL_TEAMS,
  INITIAL_BANK_DOMAINS,
  INITIAL_BANK_QUESTIONS
} from '../data/mockData';

const KEYS = {
  ACCESS_CODES: 'platform_access_codes_v2',
  DELETED_ACCESS_CODES: 'platform_deleted_codes_v2',
  COMPETITIONS: 'platform_competitions_v4',
  DELETED_COMPETITIONS: 'platform_deleted_comp_ids_v2',
  PARTICIPANTS: 'platform_participants_v3',
  ANSWERS: 'platform_answers_v3',
  MANUAL_CERTS: 'platform_manual_certs_v2',
  LOGGED_TEACHER_CODE: 'platform_logged_teacher_code',
  RATE_LIMIT: 'platform_rate_limit_state',
  STUDENT_ATTEMPTS: 'platform_student_attempts_v3',
  ADMIN_PASSCODE: 'platform_admin_passcode_v2',
  ADMIN_SESSION: 'platform_admin_session_v2',
  ADMIN_RATE_LIMIT: 'platform_admin_rate_limit_v1',
  TELEGRAM_SETTINGS: 'platform_telegram_settings_v1',
  TEAMS: 'platform_competition_teams_v1',
  BANK_DOMAINS: 'platform_bank_domains_v1',
  BANK_QUESTIONS: 'platform_bank_questions_v1'
};

export const DEFAULT_ADMIN_PASSCODE = 'admin@tanafas2026';

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('storage_update'));
  } catch (err) {
    console.error(`Error writing to ${key}:`, err);
  }
}

export function syncCompetitionsToServer(competitions?: Competition[]): void {
  try {
    const list = (competitions || StorageService.getCompetitions()).filter(c => c.visibility !== 'private');
    fetch('/api/competitions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitions: list })
    }).catch(err => console.warn('Could not sync competitions to server:', err));
  } catch (e) {
    console.warn('Sync competitions error:', e);
  }
}

export const StorageService = {
  getDeletedAccessCodeIds(): string[] {
    return getStored<string[]>(KEYS.DELETED_ACCESS_CODES, []);
  },

  getAccessCodes(): AccessCode[] {
    const deletedIds = new Set(this.getDeletedAccessCodeIds().map(s => s.toUpperCase()));
    let list = getStored<AccessCode[]>(KEYS.ACCESS_CODES, INITIAL_ACCESS_CODES);
    
    // Filter out deleted codes
    if (deletedIds.size > 0) {
      list = list.filter(c => !deletedIds.has(c.id.toUpperCase()) && !deletedIds.has(c.code.toUpperCase()));
    }

    const hasTrial = list.some(c => c.id === 'code-trial-library' || c.code === 'مكتبة المعلمين' || c.isTrial);
    const trialDeleted = deletedIds.has('code-trial-library'.toUpperCase()) || deletedIds.has('مكتبة المعلمين'.toUpperCase());
    if (!hasTrial && !trialDeleted) {
      const trial: AccessCode = INITIAL_ACCESS_CODES.find(c => c.id === 'code-trial-library') || {
        id: 'code-trial-library',
        code: 'مكتبة المعلمين',
        teacherDisplayName: 'مكتبة المعلمين',
        school: 'مكتبة المعلمين',
        maxCompetitions: 999999,
        usedCount: 0,
        expiresAt: '2099-12-31',
        isActive: true,
        isTrial: true,
        isUnlimited: true,
        createdAt: '2026-09-01T00:00:00Z'
      };
      list.unshift(trial);
      setStored(KEYS.ACCESS_CODES, list);
    }
    return list;
  },

  getTrialCode(): AccessCode {
    const list = this.getAccessCodes();
    const trial = list.find(c => c.id === 'code-trial-library' || c.code === 'مكتبة المعلمين' || c.isTrial);
    if (trial) return trial;
    const fallback: AccessCode = {
      id: 'code-trial-library',
      code: 'مكتبة المعلمين',
      teacherDisplayName: 'مكتبة المعلمين',
      school: 'مكتبة المعلمين',
      maxCompetitions: 999999,
      usedCount: 0,
      expiresAt: '2099-12-31',
      isActive: true,
      isTrial: true,
      isUnlimited: true,
      createdAt: '2026-09-01T00:00:00Z'
    };
    this.saveAccessCode(fallback);
    return fallback;
  },

  setTrialCodeActive(isActive: boolean): AccessCode {
    const trial = this.getTrialCode();
    trial.isActive = isActive;
    this.saveAccessCode(trial);
    return trial;
  },

  saveAccessCode(code: AccessCode): void {
    const cleanCodeStr = (code.code || '').trim().toUpperCase();
    const readyCode: AccessCode = {
      ...code,
      code: cleanCodeStr
    };

    // Remove from deleted list if it was previously deleted
    const currentDeleted = this.getDeletedAccessCodeIds().filter(
      id => id.toUpperCase() !== readyCode.id.toUpperCase() && id.toUpperCase() !== cleanCodeStr
    );
    setStored(KEYS.DELETED_ACCESS_CODES, currentDeleted);

    const list = this.getAccessCodes().filter(
      c => c.id !== readyCode.id && c.code.toUpperCase() !== cleanCodeStr
    );
    list.unshift(readyCode);
    setStored(KEYS.ACCESS_CODES, list);

    const adminToken = this.getAdminToken();
    fetch('/api/access-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      },
      body: JSON.stringify(readyCode)
    }).catch(err => console.warn('Could not sync access code to server:', err));
  },

  toggleCodeStatus(id: string): void {
    const list = this.getAccessCodes();
    const target = list.find(c => c.id === id);
    if (target) {
      target.isActive = !target.isActive;
      this.saveAccessCode(target);
    }
  },

  getRateLimitState(): { failedAttempts: number; lockedUntil: number } {
    return getStored<{ failedAttempts: number; lockedUntil: number }>(KEYS.RATE_LIMIT, {
      failedAttempts: 0,
      lockedUntil: 0
    });
  },

  recordFailedAttempt(): { isLocked: boolean; remainingLockSeconds: number } {
    const state = this.getRateLimitState();
    const now = Date.now();
    state.failedAttempts += 1;
    if (state.failedAttempts >= 5) {
      state.lockedUntil = now + 120 * 1000;
      setStored(KEYS.RATE_LIMIT, state);
      return { isLocked: true, remainingLockSeconds: 120 };
    }
    setStored(KEYS.RATE_LIMIT, state);
    return { isLocked: false, remainingLockSeconds: 0 };
  },

  resetRateLimit(): void {
    setStored(KEYS.RATE_LIMIT, { failedAttempts: 0, lockedUntil: 0 });
  },

  verifyAccessCode(rawCode: string): { 
    valid: boolean; 
    codeObj?: AccessCode; 
    isLocked?: boolean; 
    remainingSeconds?: number;
    needsProfileSetup?: boolean;
    message: string 
  } {
    const cleanRaw = rawCode.trim();
    const cleanCode = cleanRaw.toUpperCase();
    const now = Date.now();
    const rateState = this.getRateLimitState();

    if (rateState.lockedUntil > now) {
      const remainingSeconds = Math.ceil((rateState.lockedUntil - now) / 1000);
      return {
        valid: false,
        isLocked: true,
        remainingSeconds,
        message: `تم تجميد المحاولات مؤقتاً لحماية النظام (${remainingSeconds} ثانية متبقية). يرجى الانتظار.`
      };
    }

    const list = this.getAccessCodes();
    const isTrialQuery = 
      cleanCode === 'TCHR-DEMO' ||
      cleanCode === 'DEMO' ||
      cleanCode === 'مكتبة المعلمين' || 
      cleanCode === 'مكتبة-المعلمين' || 
      cleanCode === 'مكتبة' ||
      cleanCode === 'المكتبة' ||
      cleanCode === 'TEACHER-LIBRARY' ||
      cleanCode === 'TRIAL' ||
      cleanCode === 'TRIAL-TL';

    let found = list.find(c => c.code.toUpperCase() === cleanCode);
    if (!found && isTrialQuery) {
      found = list.find(c => c.id === 'code-trial-library' || c.code === 'مكتبة المعلمين' || c.isTrial);
    }

    if (!found) {
      const failInfo = this.recordFailedAttempt();
      if (failInfo.isLocked) {
        return {
          valid: false,
          isLocked: true,
          remainingSeconds: failInfo.remainingLockSeconds,
          message: 'تجاوزت الحد المسموح من المحاولات الخاطئة (5 محاولات). تم تجميد الإدخال لمدة دقيقتين لمنع التخمين.'
        };
      }
      return {
        valid: false,
        message: `رمز الدخول غير صحيح. تحقق من الرمز وحاول مجدداً (${5 - rateState.failedAttempts - 1} محاولات متبقية).`
      };
    }

    const isTrial = found.id === 'code-trial-library' || found.code === 'مكتبة المعلمين' || Boolean(found.isTrial);

    // Special handling for trial code (مكتبة المعلمين)
    if (isTrial) {
      if (!found.isActive) {
        return {
          valid: false,
          message: 'التجربة المفتوحة متوقفة حاليا تواصل مع المسئول للحصول على كود تفعيل المعلم'
        };
      }

      this.resetRateLimit();
      return {
        valid: true,
        codeObj: found,
        needsProfileSetup: false, // بدون معلم: الدخول مباشرة باسم مكتبة المعلمين
        message: 'تم تفعيل كود التجربة (مكتبة المعلمين) بنجاح.'
      };
    }

    if (!found.isActive) {
      return {
        valid: false,
        message: 'هذا الرمز تم تعطيله أو إيقافه من قِبل إدارة المنصة.'
      };
    }

    if (new Date(found.expiresAt).getTime() < now) {
      return {
        valid: false,
        message: 'رمز الدخول منتهي الصلاحية.'
      };
    }

    if (found.usedCount >= found.maxCompetitions) {
      return {
        valid: false,
        message: `تم استنفاذ الحد الأقصى للمسابقات المسموح بها لهذا الرمز (${found.maxCompetitions} مسابقة).`
      };
    }

    this.resetRateLimit();

    const needsProfileSetup = !found.teacherDisplayName || found.teacherDisplayName.trim().length === 0;

    return {
      valid: true,
      codeObj: found,
      needsProfileSetup,
      message: 'رمز صالح ومؤكد.'
    };
  },

  updateTeacherProfile(codeStr: string, teacherDisplayName: string, school: string): AccessCode | null {
    const list = this.getAccessCodes();
    const target = list.find(c => c.code.toUpperCase() === codeStr.trim().toUpperCase());
    if (target) {
      target.teacherDisplayName = teacherDisplayName.trim();
      target.school = school.trim();
      this.saveAccessCode(target);
      return target;
    }
    return null;
  },

  getLoggedTeacher(): AccessCode | null {
    const codeStr = localStorage.getItem(KEYS.LOGGED_TEACHER_CODE);
    if (!codeStr) return null;
    const codes = this.getAccessCodes();
    const found = codes.find(c => c.code.toUpperCase() === codeStr.toUpperCase() && c.isActive);
    return found || null;
  },

  setLoggedTeacher(codeStr: string | null): void {
    if (codeStr) {
      localStorage.setItem(KEYS.LOGGED_TEACHER_CODE, codeStr.trim().toUpperCase());
    } else {
      localStorage.removeItem(KEYS.LOGGED_TEACHER_CODE);
    }
    window.dispatchEvent(new Event('storage_update'));
  },

  getCompetitionStatus(comp: Partial<Competition>): 'active' | 'upcoming' | 'ended' {
    if (comp.competitionType === 'open') {
      return 'active';
    }

    const now = Date.now();
    const start = comp.startTime ? new Date(comp.startTime).getTime() : 0;
    let end = comp.endTime ? new Date(comp.endTime).getTime() : 0;

    if (comp.competitionType === 'live') {
      const durationMs = (comp.examDurationMinutes || 20) * 60 * 1000;
      if (!end || isNaN(end) || end <= start) {
        end = start + durationMs;
      }
    }

    if (start && now < start) {
      return 'upcoming';
    }
    if (end && now >= end) {
      return 'ended';
    }
    return 'active';
  },

  getDeletedCompetitionIds(): string[] {
    return getStored<string[]>(KEYS.DELETED_COMPETITIONS, []);
  },

  getCompetitions(): Competition[] {
    const deletedIds = new Set(this.getDeletedCompetitionIds());
    let raw = getStored<Competition[]>(KEYS.COMPETITIONS, INITIAL_COMPETITIONS);
    
    // Filter out any explicitly deleted competitions
    if (deletedIds.size > 0) {
      raw = raw.filter(c => !deletedIds.has(c.id));
    }

    // Ensure comp-question-bank is always present and pinned as the very first competition (unless explicitly deleted)
    const bankComp = INITIAL_COMPETITIONS.find(c => c.id === 'comp-question-bank');
    if (bankComp && !deletedIds.has('comp-question-bank')) {
      const existingBankIdx = raw.findIndex(c => c.id === 'comp-question-bank');
      if (existingBankIdx === -1) {
        raw = [bankComp, ...raw];
      } else if (existingBankIdx > 0) {
        const item = raw.splice(existingBankIdx, 1)[0];
        raw = [item, ...raw];
      }
    }

    return raw.map(comp => {
      const competitionType = comp.competitionType || (comp.endTime && new Date(comp.endTime).getTime() - new Date(comp.startTime).getTime() < 3600000 ? 'live' : 'windowed');
      const singleAttempt = comp.isQuestionBank ? false : (comp.singleAttempt ?? (competitionType !== 'open'));
      const hideAnswersUntilEnd = comp.isQuestionBank ? false : (comp.hideAnswersUntilEnd ?? (competitionType !== 'open'));
      const status = this.getCompetitionStatus({ ...comp, competitionType });
      return {
        ...comp,
        competitionType,
        singleAttempt,
        hideAnswersUntilEnd,
        status
      };
    });
  },

  getCompetitionById(idOrSlug: string): Competition | undefined {
    const list = this.getCompetitions();
    const rawClean = idOrSlug.trim().toLowerCase();
    let decodedClean = rawClean;
    try {
      decodedClean = decodeURIComponent(rawClean).trim().toLowerCase();
    } catch {}
    return list.find(c => {
      const cId = c.id.toLowerCase();
      const cSlug = (c.webSlug || '').toLowerCase();
      return cId === rawClean || cId === decodedClean || cSlug === rawClean || cSlug === decodedClean;
    });
  },

  getTeacherCompetitions(teacherCodeStr: string): Competition[] {
    const clean = teacherCodeStr.trim().toUpperCase();
    return this.getCompetitions().filter(c => c.source === 'teacher' && c.teacherCodeId?.toUpperCase() === clean);
  },

  getPlatformCompetitions(): Competition[] {
    return this.getCompetitions().filter(c => c.source === 'platform');
  },

  saveCompetition(comp: Competition): void {
    // 1. If competition was previously marked as deleted, remove it from deleted list
    const currentDeleted = this.getDeletedCompetitionIds().filter(id => id !== comp.id);
    setStored(KEYS.DELETED_COMPETITIONS, currentDeleted);

    const list = this.getCompetitions().filter(c => c.id !== comp.id);
    const updatedStatus = this.getCompetitionStatus(comp);
    const slug = comp.webSlug || comp.id;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const compUrl = comp.url || (origin ? `${origin}/?quiz=${encodeURIComponent(slug)}` : '');

    const readyComp: Competition = {
      ...comp,
      status: updatedStatus,
      url: compUrl,
      baseUrl: origin || comp.baseUrl
    };
    
    list.unshift(readyComp);
    if (readyComp.source === 'teacher' && readyComp.teacherCodeId) {
      const codes = this.getAccessCodes();
      const codeTarget = codes.find(c => c.code.toUpperCase() === readyComp.teacherCodeId?.toUpperCase());
      if (codeTarget) {
        codeTarget.usedCount += 1;
        setStored(KEYS.ACCESS_CODES, codes);
      }
    }
    setStored(KEYS.COMPETITIONS, list);
    
    // Asynchronously save to MongoDB database
    try {
      fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readyComp)
      }).catch(err => console.warn('Could not save competition to database:', err));
    } catch (e) {
      console.warn('API error:', e);
    }
  },

  deleteCompetition(id: string): void {
    // 1. Mark in deleted IDs blacklist to prevent any resurrection
    const currentDeleted = this.getDeletedCompetitionIds();
    if (!currentDeleted.includes(id)) {
      currentDeleted.push(id);
      setStored(KEYS.DELETED_COMPETITIONS, currentDeleted);
    }

    // 2. Remove from local stored competitions
    const list = this.getCompetitions().filter(c => c.id !== id);
    setStored(KEYS.COMPETITIONS, list);

    // 3. Remove any participant answers & registrations locally
    this.clearCompetitionParticipants(id);

    // 4. Asynchronously delete from server & MongoDB database
    try {
      fetch(`/api/competitions/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(err => console.warn('Could not delete competition from database:', err));
    } catch (e) {
      console.warn('API error:', e);
    }
  },

  getParticipants(): Participant[] {
    return getStored<Participant[]>(KEYS.PARTICIPANTS, INITIAL_PARTICIPANTS);
  },

  async fetchParticipants(competitionId?: string): Promise<Participant[]> {
    try {
      const url = competitionId
        ? `/api/competitions/${encodeURIComponent(competitionId)}/participants`
        : '/api/participants';
      const res = await fetch(url);
      if (res.ok) {
        const remoteList: any[] = await res.json();
        if (Array.isArray(remoteList)) {
          const current = this.getParticipants();
          const map = new Map<string, Participant>();
          current.forEach(p => map.set(p.id, p));

          let changed = false;
          remoteList.forEach(r => {
            const mapped: Participant = {
              id: r.id,
              competitionId: r.competitionId,
              name: r.name || r.studentName || 'طالب مشارك',
              school: r.school || '',
              teamId: r.teamId,
              teamName: r.teamName,
              teamCode: r.teamCode,
              memberId: r.memberId,
              isTeamLeader: r.isTeamLeader,
              sessionToken: r.sessionToken || `remote_${r.id}`,
              joinedAt: r.joinedAt || r.submittedAt || new Date().toISOString(),
              score: Number(r.score) || 0,
              correctAnswers: Number(r.correctAnswers) || 0,
              totalQuestions: Number(r.totalQuestions) || 0,
              totalTimeSeconds: Number(r.totalTimeSeconds) || 0,
              rank: r.rank,
              submittedAt: r.submittedAt
            };

            const existing = map.get(mapped.id);
            if (!existing) {
              map.set(mapped.id, mapped);
              changed = true;
            } else if (!existing.submittedAt && mapped.submittedAt) {
              map.set(mapped.id, mapped);
              changed = true;
            }
          });

          if (changed) {
            const merged = Array.from(map.values());
            setStored(KEYS.PARTICIPANTS, merged);
            window.dispatchEvent(new Event('storage_update'));
          }
          return Array.from(map.values()).filter(p => !competitionId || p.competitionId === competitionId);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch participants from server:', e);
    }
    return this.getParticipants().filter(p => !competitionId || p.competitionId === competitionId);
  },

  getAnswers(): ParticipantAnswer[] {
    return getStored<ParticipantAnswer[]>(KEYS.ANSWERS, INITIAL_ANSWERS);
  },

  registerParticipant(params: {
    competitionId: string;
    name: string;
    school: string;
    teamId?: string;
    teamName?: string;
    teamCode?: string;
    memberId?: string;
    isTeamLeader?: boolean;
  }): Participant {
    const participants = this.getParticipants();
    const existing = participants.find(p =>
      p.competitionId === params.competitionId &&
      p.memberId && params.memberId && p.memberId === params.memberId &&
      !p.submittedAt
    );
    if (existing) return existing;

    const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newParticipant: Participant = {
      id: `part_${Date.now()}`,
      competitionId: params.competitionId,
      name: params.name.trim(),
      school: params.school.trim(),
      teamId: params.teamId,
      teamName: params.teamName ? params.teamName.trim() : undefined,
      teamCode: params.teamCode ? params.teamCode.trim() : undefined,
      memberId: params.memberId,
      isTeamLeader: params.isTeamLeader ?? false,
      sessionToken: token,
      joinedAt: new Date().toISOString(),
      score: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      totalTimeSeconds: 0
    };
    participants.unshift(newParticipant);
    setStored(KEYS.PARTICIPANTS, participants);
    return newParticipant;
  },

  saveAnswer(answerData: {
    participantId: string;
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
    timeTaken: number;
  }): boolean {
    const participant = this.getParticipants().find(p => p.id === answerData.participantId);
    if (!participant || participant.submittedAt) return false;
    const competition = this.getCompetitionById(participant.competitionId);
    const question = competition?.questions.find(q => q.id === answerData.questionId);
    if (!competition || !question) return false;
    if (this.getCompetitionStatus(competition) === 'ended') return false;
    if (!Number.isInteger(answerData.selectedIndex) ||
        answerData.selectedIndex < -1 ||
        answerData.selectedIndex >= question.options.length) return false;
    if (!Number.isFinite(answerData.timeTaken) || answerData.timeTaken < 0) return false;

    const answers = this.getAnswers();
    const existingIndex = answers.findIndex(
      a => a.participantId === answerData.participantId && a.questionId === answerData.questionId
    );
    if (existingIndex >= 0) {
      return false;
    }

    const newAnswer: ParticipantAnswer = {
      id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      participantId: answerData.participantId,
      questionId: answerData.questionId,
      selectedIndex: answerData.selectedIndex,
      isCorrect: answerData.selectedIndex >= 0 && answerData.selectedIndex === question.correctIndex,
      timeTaken: Math.min(answerData.timeTaken, Math.max(question.duration || 30, 1)),
      answeredAt: new Date().toISOString()
    };
    answers.push(newAnswer);
    setStored(KEYS.ANSWERS, answers);
    return true;
  },

  finalizeParticipant(
    participantId: string, 
    totalQuestions: number,
    disqualificationOptions?: { isDisqualified?: boolean; disqualifiedReason?: string }
  ): ParticipantResult {
    const participants = this.getParticipants();
    const rawAnswers = this.getAnswers().filter(a => a.participantId === participantId);
    
    // Deduplicate answers by questionId to prevent duplicate score calculations
    const uniqueMap = new Map<string, ParticipantAnswer>();
    rawAnswers.forEach(a => {
      if (!uniqueMap.has(a.questionId)) {
        uniqueMap.set(a.questionId, a);
      }
    });
    const answers = Array.from(uniqueMap.values());
    
    let targetIdx = participants.findIndex(p => p.id === participantId);
    if (targetIdx === -1) {
      throw new Error('لم يتم العثور على محاولة المشاركة الحالية.');
    }

    const isDisq = Boolean(disqualificationOptions?.isDisqualified);
    const disqReason = disqualificationOptions?.disqualifiedReason || 
      'تم استبعاد المشارك وتصفير النتيجة لمخالفة تعليمات النزاهة وتكرار مغادرة شاشة المسابقة لمرتين.';

    if (participants[targetIdx].submittedAt && !isDisq) {
      const submitted = participants[targetIdx];
      const comp = this.getCompetitionById(submitted.competitionId);
      return {
        ...submitted,
        competitionName: comp?.name,
        answers
      };
    }

    const correctCount = isDisq ? 0 : answers.filter(a => a.isCorrect).length;
    const totalTime = answers.reduce((acc, a) => acc + (a.timeTaken || 0), 0);
    const calculatedScore = isDisq ? 0 : Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

    const updated: Participant = {
      ...participants[targetIdx],
      correctAnswers: correctCount,
      totalQuestions: Math.max(1, totalQuestions),
      score: calculatedScore,
      totalTimeSeconds: Number(totalTime.toFixed(1)),
      submittedAt: new Date().toISOString(),
      isDisqualified: isDisq ? true : undefined,
      disqualifiedReason: isDisq ? disqReason : undefined
    };

    participants[targetIdx] = updated;
    setStored(KEYS.PARTICIPANTS, participants);
    window.dispatchEvent(new Event('storage_update'));

    if (updated.competitionId) {
      this.recordStudentAttempt(updated.competitionId, updated.id, updated.name);

      // Asynchronously sync participant result to MongoDB database
      try {
        fetch(`/api/competitions/${updated.competitionId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updated.id,
            name: updated.name,
            studentName: updated.name,
            school: updated.school,
            score: updated.score,
            totalScore: totalQuestions * 100,
            percentage: isDisq ? 0 : (totalQuestions > 0 ? Math.round((updated.correctAnswers / totalQuestions) * 100) : 0),
            correctAnswers: updated.correctAnswers,
            totalQuestions,
            totalTimeSeconds: updated.totalTimeSeconds,
            answers,
            submittedAt: updated.submittedAt,
            teamId: updated.teamId,
            teamName: updated.teamName,
            teamCode: updated.teamCode,
            isTeamLeader: updated.isTeamLeader,
            isDisqualified: isDisq,
            disqualifiedReason: isDisq ? disqReason : undefined
          })
        }).catch(err => console.warn('Could not sync participant to database:', err));
      } catch (e) {
        console.warn('API error:', e);
      }
    }

    const comp = updated.competitionId ? this.getCompetitionById(updated.competitionId) : undefined;
    return {
      ...updated,
      competitionName: comp?.name,
      answers,
      isDisqualified: isDisq,
      disqualifiedReason: isDisq ? disqReason : undefined
    };
  },

  disqualifyParticipant(
    participantId: string, 
    totalQuestions: number, 
    reason: string = 'تم استبعاد المشارك وتصفير النتيجة لمخالفة تعليمات النزاهة وتكرار مغادرة شاشة المسابقة لمرتين.'
  ): ParticipantResult {
    return this.finalizeParticipant(participantId, totalQuestions, {
      isDisqualified: true,
      disqualifiedReason: reason
    });
  },

  hasStudentParticipated(competitionId: string, studentName?: string): {
    participated: boolean;
    participant?: ParticipantResult;
  } {
    const compResults = this.getCompetitionResults(competitionId);
    
    if (studentName && studentName.trim()) {
      const cleanName = studentName.trim().toLowerCase();
      const byName = compResults.find(p => p.name.trim().toLowerCase() === cleanName);
      if (byName) {
        return { participated: true, participant: byName };
      }
      try {
        const storedMap = getStored<Record<string, { participantId: string; name: string; date: string }[]>>(
          KEYS.STUDENT_ATTEMPTS, 
          {}
        );
        const list = storedMap[competitionId] || [];
        const found = list.find(item => item.name.trim().toLowerCase() === cleanName);
        if (found) {
          const targetPart = compResults.find(p => p.id === found.participantId);
          if (targetPart) {
            return { participated: true, participant: targetPart };
          }
        }
      } catch {}
      return { participated: false };
    }

    try {
      const storedMap = getStored<Record<string, { participantId: string; name: string; date: string }[]>>(
        KEYS.STUDENT_ATTEMPTS, 
        {}
      );
      const list = storedMap[competitionId] || [];
      if (list.length > 0) {
        const lastAttempt = list[list.length - 1];
        const targetPart = compResults.find(p => p.id === lastAttempt.participantId);
        if (targetPart) {
          return { participated: true, participant: targetPart };
        }
      }
    } catch {}

    return { participated: false };
  },

  recordStudentAttempt(competitionId: string, participantId: string, studentName: string): void {
    try {
      const storedMap = getStored<Record<string, { participantId: string; name: string; date: string }[]>>(
        KEYS.STUDENT_ATTEMPTS, 
        {}
      );
      if (!storedMap[competitionId]) {
        storedMap[competitionId] = [];
      }
      storedMap[competitionId].push({
        participantId,
        name: studentName.trim(),
        date: new Date().toISOString()
      });
      setStored(KEYS.STUDENT_ATTEMPTS, storedMap);
    } catch (err) {
      console.error('Error recording attempt:', err);
    }
  },

  getCompetitionResults(competitionId: string): ParticipantResult[] {
    const participants = this.getParticipants().filter(p => p.competitionId === competitionId && p.submittedAt && !p.isDisqualified);
    const comp = this.getCompetitionById(competitionId);
    const allAnswers = this.getAnswers();

    const sorted = [...participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalTimeSeconds !== b.totalTimeSeconds) return a.totalTimeSeconds - b.totalTimeSeconds;
      return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
    });

    return sorted.map((p, index) => ({
      ...p,
      rank: index + 1,
      competitionName: comp?.name,
      answers: allAnswers.filter(a => a.participantId === p.id)
    }));
  },

  getTeamResults(competitionId: string): TeamResult[] {
    const participants = this.getCompetitionResults(competitionId).filter(p => !!p.teamName);
    const teamMap = new Map<string, Participant[]>();

    participants.forEach(p => {
      const team = p.teamName!;
      const key = p.teamId || `${p.competitionId}:${team.trim().toLocaleLowerCase()}`;
      if (!teamMap.has(key)) teamMap.set(key, []);
      teamMap.get(key)!.push(p);
    });

    const teams: TeamResult[] = [];
    teamMap.forEach((members) => {
      const teamName = members[0]?.teamName || 'فريق غير محدد';
      const totalScore = members.reduce((sum, m) => sum + m.score, 0);
      const totalTime = members.reduce((sum, m) => sum + m.totalTimeSeconds, 0);
      const membersCount = Math.max(1, members.length);
      const school = members[0]?.school || 'غير محدد';

      teams.push({
        id: members[0]?.teamId || `team_${encodeURIComponent(teamName)}`,
        competitionId,
        teamName,
        school,
        membersCount: members.length,
        totalScore,
        averageScore: Number((totalScore / membersCount).toFixed(1)),
        totalTimeSeconds: Number(totalTime.toFixed(1)),
        averageTime: Number((totalTime / membersCount).toFixed(1)),
        members
      });
    });

    teams.sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.averageTime - b.averageTime;
    });

    return teams.map((t, idx) => ({ ...t, rank: idx + 1 }));
  },

  // -------------------------------------------------------------
  // نظام الفرق المطور (تكوين، انضمام، كود 4 أرقام، إغلاق وقفل تلقائي، محاكاة)
  // -------------------------------------------------------------
  getTeams(competitionId?: string): CompetitionTeam[] {
    const list = getStored<CompetitionTeam[]>(KEYS.TEAMS, INITIAL_TEAMS);
    const normalized = list.map(team => {
      if (team.leaderId) return team;
      const leader = team.members.find(member =>
        member.isLeader || member.name.trim().toLowerCase() === team.leaderName.trim().toLowerCase()
      );
      return leader ? { ...team, leaderId: leader.id } : team;
    });
    if (competitionId) {
      return normalized.filter(t => t.competitionId === competitionId);
    }
    return normalized;
  },

  isTeamModificationLocked(competitionId: string): { locked: boolean; reason?: string } {
    const comp = this.getCompetitionById(competitionId);
    if (!comp) return { locked: false };

    const status = this.getCompetitionStatus(comp);
    if (status === 'ended') {
      return { locked: true, reason: 'عفواً، لقد انتهت المسابقة ولم يعد بالإمكان تعديل أو تكوين الفرق.' };
    }

    if (comp.competitionType !== 'open' && comp.startTime) {
      const startMs = new Date(comp.startTime).getTime();
      if (!isNaN(startMs)) {
        const now = Date.now();
        // 5 minutes before scheduled start time OR during the competition
        if (now >= startMs - 5 * 60 * 1000) {
          if (now < startMs) {
            return {
              locked: true,
              reason: 'عفواً، تم إغلاق استقبال وتعديل الفرق لدخول مهلة الـ 5 دقائق المحددة قبل انطلاق المسابقة لتثبيت الفرق المؤهلة.'
            };
          } else {
            return {
              locked: true,
              reason: 'عفواً، لقد انطلقت المسابقة بالفعل وتم إغلاق وقفل تشكيلة الفرق نهائياً لضمان عدالة المنافسة.'
            };
          }
        }
      }
    }

    return { locked: false };
  },

  createTeam(params: {
    competitionId: string;
    name: string;
    leaderName: string;
    school?: string;
    allowPublicJoin?: boolean;
    maxMembers?: number;
    minMembers?: number;
  }): { success: boolean; team?: CompetitionTeam; error?: string } {
    const lockCheck = this.isTeamModificationLocked(params.competitionId);
    if (lockCheck.locked) {
      return { success: false, error: lockCheck.reason };
    }

    const trimmedName = params.name.trim();
    const trimmedLeader = params.leaderName.trim();

    if (!trimmedName) {
      return { success: false, error: 'يرجى كتابة اسم الفريق.' };
    }
    if (!trimmedLeader) {
      return { success: false, error: 'يرجى كتابة اسم قائد الفريق.' };
    }

    const teams = this.getTeams();
    const compTeams = teams.filter(t => t.competitionId === params.competitionId);

    // Prevent duplicate team names in the same competition
    const nameExists = compTeams.some(t => t.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) {
      return { success: false, error: 'يوجد فريق آخر مسجل بنفس هذا الاسم، يرجى اختيار اسم مختلف ومميز.' };
    }

    // Generate unique 4-digit code (1000 - 9999)
    let code = '';
    const existingCodes = new Set(compTeams.map(t => t.code));
    for (let attempts = 0; attempts < 50; attempts++) {
      const candidate = Math.floor(1000 + Math.random() * 9000).toString();
      if (!existingCodes.has(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const leaderMember: TeamMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedLeader,
      school: params.school?.trim(),
      isLeader: true,
      joinedAt: new Date().toISOString()
    };

    const newTeam: CompetitionTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      competitionId: params.competitionId,
      name: trimmedName,
      code,
      leaderName: trimmedLeader,
      leaderId: leaderMember.id,
      school: params.school?.trim(),
      members: [leaderMember],
      maxMembers: params.maxMembers || 4,
      minMembers: params.minMembers || 2,
      allowPublicJoin: params.allowPublicJoin ?? true,
      status: 'forming',
      createdAt: new Date().toISOString()
    };

    teams.unshift(newTeam);
    setStored(KEYS.TEAMS, teams);

    // Asynchronously sync team to MongoDB / server
    try {
      fetch(`/api/competitions/${encodeURIComponent(params.competitionId)}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      }).catch(err => console.warn('Could not sync team to server:', err));
    } catch {}

    return { success: true, team: newTeam };
  },

  leaveTeam(competitionId: string, teamCode: string, memberId: string): {
    success: boolean;
    teamDeleted?: boolean;
    updatedTeam?: CompetitionTeam;
    error?: string;
  } {
    const lockCheck = this.isTeamModificationLocked(competitionId);
    if (lockCheck.locked) {
      return { success: false, error: lockCheck.reason };
    }

    const cleanCode = teamCode.trim();
    const cleanMemberId = memberId.trim();
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.competitionId === competitionId && t.code === cleanCode);

    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على الفريق.' };
    }

    const team = teams[idx];
    const memberIndex = team.members.findIndex(m => m.id === cleanMemberId);

    if (memberIndex === -1) {
      return { success: false, error: 'هذا العضو غير مسجل في الفريق.' };
    }

    const wasLeader = team.members[memberIndex].isLeader;
    team.members.splice(memberIndex, 1);

    // If no members left, delete the team
    if (team.members.length === 0) {
      teams.splice(idx, 1);
      setStored(KEYS.TEAMS, teams);
      try {
        fetch(`/api/competitions/${encodeURIComponent(competitionId)}/teams/${encodeURIComponent(cleanCode)}`, {
          method: 'DELETE'
        }).catch(err => console.warn('Could not delete team on server:', err));
      } catch {}
      return { success: true, teamDeleted: true };
    }

    // If leader left, promote next member as leader
    if (wasLeader && team.members.length > 0) {
      team.members.forEach(member => { member.isLeader = false; });
      team.members[0].isLeader = true;
      team.leaderName = team.members[0].name;
      team.leaderId = team.members[0].id;
    }

    // Update status based on minMembers requirement
    if (team.members.length < (team.minMembers || 2)) {
      team.status = 'forming';
    }

    teams[idx] = team;
    setStored(KEYS.TEAMS, teams);

    try {
      fetch(`/api/competitions/${encodeURIComponent(competitionId)}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      }).catch(err => console.warn('Could not sync updated team to server:', err));
    } catch {}

    return { success: true, updatedTeam: team };
  },

  removeTeamMember(competitionId: string, teamCode: string, memberIdToRemove: string, requesterLeaderId: string): {
    success: boolean;
    updatedTeam?: CompetitionTeam;
    error?: string;
  } {
    const lockCheck = this.isTeamModificationLocked(competitionId);
    if (lockCheck.locked) {
      return { success: false, error: lockCheck.reason };
    }

    const cleanCode = teamCode.trim();
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.competitionId === competitionId && t.code === cleanCode);

    if (idx === -1) {
      return { success: false, error: 'لم يتم العثور على الفريق.' };
    }

    const team = teams[idx];
    if (team.leaderId !== requesterLeaderId) {
      return { success: false, error: 'فقط قائد الفريق يملك صلاحية استبعاد الأعضاء.' };
    }

    const targetIdx = team.members.findIndex(m => m.id === memberIdToRemove);
    if (targetIdx === -1) {
      return { success: false, error: 'العضو غير موجود في الفريق.' };
    }

    if (team.members[targetIdx].isLeader) {
      return { success: false, error: 'لا يمكن استبعاد قائد الفريق مباشرة.' };
    }

    team.members.splice(targetIdx, 1);
    if (team.members.length < (team.minMembers || 2)) {
      team.status = 'forming';
    }

    teams[idx] = team;
    setStored(KEYS.TEAMS, teams);
    return { success: true, updatedTeam: team };
  },

  deleteTeam(competitionId: string, teamCode: string): { success: boolean; error?: string } {
    const lockCheck = this.isTeamModificationLocked(competitionId);
    if (lockCheck.locked) return { success: false, error: lockCheck.reason };
    const cleanCode = teamCode.trim();
    const teams = this.getTeams();
    const remaining = teams.filter(t => !(t.competitionId === competitionId && t.code === cleanCode));
    setStored(KEYS.TEAMS, remaining);
    try {
      fetch(`/api/competitions/${encodeURIComponent(competitionId)}/teams/${encodeURIComponent(cleanCode)}`, {
        method: 'DELETE'
      }).catch(err => console.warn('Could not delete team on server:', err));
    } catch {}
    return { success: true };
  },

  toggleTeamPublicJoin(competitionId: string, teamCode: string, requesterLeaderId: string): { success: boolean; team?: CompetitionTeam; error?: string } {
    const lockCheck = this.isTeamModificationLocked(competitionId);
    if (lockCheck.locked) return { success: false, error: lockCheck.reason };
    const cleanCode = teamCode.trim();
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.competitionId === competitionId && t.code === cleanCode);
    if (idx !== -1) {
      if (teams[idx].leaderId !== requesterLeaderId) return { success: false, error: 'فقط قائد الفريق يملك هذه الصلاحية.' };
      teams[idx].allowPublicJoin = !teams[idx].allowPublicJoin;
      setStored(KEYS.TEAMS, teams);
      return { success: true, team: teams[idx] };
    }
    return { success: false };
  },

  getTeamByCode(competitionId: string, code: string): CompetitionTeam | undefined {
    const cleanCode = code.trim();
    const teams = this.getTeams(competitionId);
    return teams.find(t => t.code === cleanCode);
  },

  joinTeam(competitionId: string, code: string, memberData: { name: string; school?: string }): {
    success: boolean;
    team?: CompetitionTeam;
    error?: string;
  } {
    const lockCheck = this.isTeamModificationLocked(competitionId);
    if (lockCheck.locked) {
      return { success: false, error: lockCheck.reason };
    }

    const cleanCode = code.trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      return { success: false, error: 'كود الفريق يجب أن يتكون من 4 أرقام فقط.' };
    }

    const teams = this.getTeams();
    const targetIdx = teams.findIndex(t => t.competitionId === competitionId && t.code === cleanCode);

    if (targetIdx === -1) {
      return { success: false, error: 'لم يتم العثور على فريق بهذا الكود في هذه المسابقة.' };
    }

    const team = teams[targetIdx];
    if (team.status === 'disqualified') {
      return { success: false, error: 'عفواً، تم استبعاد هذا الفريق لعدم اكتمال نصاب أعضائه قبل المهلة المحددة (أقل من عضوين).' };
    }

    const max = team.maxMembers || 4;
    if (team.members.length >= max) {
      return { success: false, error: `عفواً، اكتمل عدد أعضاء الفريق بالكامل (${max}/${max}).` };
    }

    const cleanMemberName = memberData.name.trim().toLowerCase();
    const alreadyMember = team.members.some(m => m.name.trim().toLowerCase() === cleanMemberName);
    if (alreadyMember) {
      return { success: false, error: 'هذا الاسم مسجل بالفعل في الفريق. استخدم اسماً مميزاً.' };
    }

    const newMember: TeamMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: memberData.name.trim(),
      school: memberData.school?.trim() || team.school,
      isLeader: false,
      joinedAt: new Date().toISOString()
    };

    team.members.push(newMember);

    // If reached min or max capacity, status is ready
    if (team.members.length >= (team.minMembers || 2)) {
      team.status = 'ready';
    }

    teams[targetIdx] = team;
    setStored(KEYS.TEAMS, teams);

    try {
      fetch(`/api/competitions/${encodeURIComponent(competitionId)}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      }).catch(err => console.warn('Could not sync joined team to server:', err));
    } catch {}

    return { success: true, team };
  },

  // -------------------------------------------------------------
  // إدارة جلسة فريق المستخدم النشطة (حفظ الحالة واستعادتها عبر الجلسات)
  // -------------------------------------------------------------
  saveUserTeamSession(competitionId: string, sessionData: { teamCode: string; memberName: string; memberId: string; teamId?: string }): void {
    try {
      localStorage.setItem(`tanafus_user_team_${competitionId}`, JSON.stringify({
        ...sessionData,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Failed to save user team session:', e);
    }
  },

  getUserTeamSession(competitionId: string): { teamCode: string; memberName: string; memberId: string; teamId?: string } | null {
    try {
      const raw = localStorage.getItem(`tanafus_user_team_${competitionId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.teamCode && parsed.memberName && parsed.memberId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearUserTeamSession(competitionId: string): void {
    try {
      localStorage.removeItem(`tanafus_user_team_${competitionId}`);
    } catch (e) {
      console.warn('Failed to clear user team session:', e);
    }
  },

  checkAndPruneTeams(competitionId: string, startTime?: string, competitionType?: string): {
    teams: CompetitionTeam[];
    disqualifiedCount: number;
    readyCount: number;
  } {
    const teams = this.getTeams();
    let disqualifiedCount = 0;
    let readyCount = 0;

    if (competitionType === 'open' || !startTime) {
      let modified = false;
      teams.forEach(t => {
        if (t.competitionId === competitionId) {
          const minRequired = t.minMembers || 2;
          if (t.members.length >= minRequired) {
            if (t.status === 'forming') {
              t.status = 'ready';
              modified = true;
            }
            readyCount++;
          }
        }
      });
      if (modified) setStored(KEYS.TEAMS, teams);
      return {
        teams: teams.filter(t => t.competitionId === competitionId),
        disqualifiedCount: 0,
        readyCount
      };
    }

    const startMs = new Date(startTime).getTime();
    if (isNaN(startMs)) {
      return { teams: teams.filter(t => t.competitionId === competitionId), disqualifiedCount: 0, readyCount: 0 };
    }

    const now = Date.now();
    const diffMs = startMs - now;

    // قبل موعد المسابقة بـ 5 دقائق (300,000 مللي ثانية) أو بعد أن بدأت المسابقة:
    // يتم تطبيق قاعدة القفل التلقائي والاستبعاد للفرق غير المكتملة
    if (diffMs <= 5 * 60 * 1000) {
      let modified = false;
      teams.forEach(t => {
        if (t.competitionId === competitionId) {
          const minRequired = t.minMembers || 2;
          if (t.members.length < minRequired) {
            if (t.status !== 'disqualified') {
              t.status = 'disqualified';
              disqualifiedCount++;
              modified = true;
            }
          } else {
            // Team is qualified and roster is locked!
            if (t.status !== 'locked' && t.status !== 'ready') {
              t.status = 'locked';
              modified = true;
            }
            readyCount++;
          }
        }
      });
      if (modified) {
        setStored(KEYS.TEAMS, teams);
      }
    } else {
      // Prior to 5-min cutoff: update forming vs ready dynamically
      let modified = false;
      teams.forEach(t => {
        if (t.competitionId === competitionId && t.status !== 'disqualified') {
          const minRequired = t.minMembers || 2;
          if (t.members.length >= minRequired && t.status !== 'ready') {
            t.status = 'ready';
            readyCount++;
            modified = true;
          } else if (t.members.length < minRequired && t.status !== 'forming') {
            t.status = 'forming';
            modified = true;
          }
        }
      });
      if (modified) {
        setStored(KEYS.TEAMS, teams);
      }
    }

    return {
      teams: teams.filter(t => t.competitionId === competitionId),
      disqualifiedCount,
      readyCount
    };
  },

  getManualCertificates(): ManualCertificate[] {
    return getStored<ManualCertificate[]>(KEYS.MANUAL_CERTS, INITIAL_MANUAL_CERTIFICATES);
  },

  saveManualCertificate(cert: ManualCertificate): void {
    const list = this.getManualCertificates();
    list.unshift(cert);
    setStored(KEYS.MANUAL_CERTS, list);

    fetch('/api/manual-certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cert)
    }).catch(err => console.warn('Could not sync manual cert to server:', err));
  },

  deleteAccessCode(id: string): void {
    const target = this.getAccessCodes().find(c => c.id === id || c.code.toUpperCase() === id.toUpperCase());
    const currentDeleted = this.getDeletedAccessCodeIds();
    
    if (target) {
      if (!currentDeleted.includes(target.id)) currentDeleted.push(target.id);
      if (!currentDeleted.includes(target.code)) currentDeleted.push(target.code);
    } else {
      if (!currentDeleted.includes(id)) currentDeleted.push(id);
    }
    setStored(KEYS.DELETED_ACCESS_CODES, currentDeleted);

    const list = this.getAccessCodes().filter(c => c.id !== id && c.code.toUpperCase() !== id.toUpperCase());
    setStored(KEYS.ACCESS_CODES, list);

    const adminToken = this.getAdminToken();
    fetch(`/api/access-codes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      }
    }).catch(err => console.warn('Could not delete access code on server:', err));
  },

  deleteParticipant(id: string): void {
    const participants = this.getParticipants().filter(p => p.id !== id);
    setStored(KEYS.PARTICIPANTS, participants);
    // Also remove their answers
    const answers = this.getAnswers().filter(a => a.participantId !== id);
    setStored(KEYS.ANSWERS, answers);

    fetch(`/api/participants/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Could not delete participant on server:', err));
  },

  clearCompetitionParticipants(competitionId: string): void {
    const partIds = this.getParticipants().filter(p => p.competitionId === competitionId).map(p => p.id);
    const participants = this.getParticipants().filter(p => p.competitionId !== competitionId);
    setStored(KEYS.PARTICIPANTS, participants);
    const answers = this.getAnswers().filter(a => !partIds.includes(a.participantId));
    setStored(KEYS.ANSWERS, answers);

    fetch(`/api/competitions/${encodeURIComponent(competitionId)}/participants`, {
      method: 'DELETE'
    }).catch(err => console.warn('Could not clear competition participants on server:', err));
  },

  // Admin Portal Authentication & Session Token
  getAdminToken(): string | null {
    const token = (
      sessionStorage.getItem('tanafas_admin_token') ||
      localStorage.getItem('tanafas_admin_token') ||
      localStorage.getItem(KEYS.ADMIN_PASSCODE)
    );
    if (token) return token.trim();
    if (this.isAdminAuthenticated()) {
      return DEFAULT_ADMIN_PASSCODE;
    }
    return DEFAULT_ADMIN_PASSCODE;
  },

  setAdminToken(token: string | null): void {
    if (token) {
      sessionStorage.setItem('tanafas_admin_token', token);
      localStorage.setItem('tanafas_admin_token', token);
    } else {
      sessionStorage.removeItem('tanafas_admin_token');
      localStorage.removeItem('tanafas_admin_token');
    }
  },

  getAdminPassword(): string {
    return localStorage.getItem(KEYS.ADMIN_PASSCODE) || DEFAULT_ADMIN_PASSCODE;
  },

  isAdminAuthenticated(): boolean {
    const session = sessionStorage.getItem(KEYS.ADMIN_SESSION) || localStorage.getItem(KEYS.ADMIN_SESSION);
    return session === 'authenticated_admin_active';
  },

  getAdminRateLimitState(): { failedAttempts: number; lockedUntil: number } {
    return getStored<{ failedAttempts: number; lockedUntil: number }>(KEYS.ADMIN_RATE_LIMIT, {
      failedAttempts: 0,
      lockedUntil: 0
    });
  },

  verifyAdminPassword(password: string, remember: boolean = false): {
    valid: boolean;
    isLocked?: boolean;
    remainingSeconds?: number;
    message: string;
  } {
    const now = Date.now();
    const rateState = this.getAdminRateLimitState();

    if (rateState.lockedUntil > now) {
      const remainingSeconds = Math.ceil((rateState.lockedUntil - now) / 1000);
      return {
        valid: false,
        isLocked: true,
        remainingSeconds,
        message: `تم تجميد محاولات الدخول مؤقتاً (${remainingSeconds} ثانية متبقية). يرجى الانتظار.`
      };
    }

    const clean = password.trim();
    const configured = this.getAdminPassword();

    if (clean && clean === configured) {
      setStored(KEYS.ADMIN_RATE_LIMIT, { failedAttempts: 0, lockedUntil: 0 });
      if (remember) {
        localStorage.setItem(KEYS.ADMIN_SESSION, 'authenticated_admin_active');
      }
      sessionStorage.setItem(KEYS.ADMIN_SESSION, 'authenticated_admin_active');
      return { valid: true, message: 'تم التحقق بنجاح.' };
    }

    // Failed attempt
    const newFailed = rateState.failedAttempts + 1;
    if (newFailed >= 5) {
      const lockUntil = now + 60 * 1000;
      setStored(KEYS.ADMIN_RATE_LIMIT, { failedAttempts: newFailed, lockedUntil: lockUntil });
      return {
        valid: false,
        isLocked: true,
        remainingSeconds: 60,
        message: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم تجميد تسجيل الدخول لمدة دقيقة لحماية النظام.'
      };
    }

    setStored(KEYS.ADMIN_RATE_LIMIT, { failedAttempts: newFailed, lockedUntil: 0 });
    return {
      valid: false,
      isLocked: false,
      message: `كلمة المرور غير صحيحة (${5 - newFailed} محاولات متبقية قبل التجميد المؤقت).`
    };
  },

  setAdminSession(authenticated: boolean): void {
    if (authenticated) {
      sessionStorage.setItem(KEYS.ADMIN_SESSION, 'authenticated_admin_active');
    } else {
      sessionStorage.removeItem(KEYS.ADMIN_SESSION);
      localStorage.removeItem(KEYS.ADMIN_SESSION);
      this.setAdminToken(null);
    }
    window.dispatchEvent(new Event('storage_update'));
  },

  changeAdminPassword(oldPass: string, newPass: string): { success: boolean; message: string } {
    const current = this.getAdminPassword();
    if (!current || oldPass.trim() !== current) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
    }
    if (!newPass.trim() || newPass.trim().length < 6) {
      return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات.' };
    }
    localStorage.setItem(KEYS.ADMIN_PASSCODE, newPass.trim());
    return { success: true, message: 'تم تحديث كلمة مرور المشرف بنجاح.' };
  },

  async verifyAdminPasswordAsync(password: string, remember: boolean = false): Promise<{
    valid: boolean;
    isLocked?: boolean;
    remainingSeconds?: number;
    message: string;
  }> {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        if (remember) {
          localStorage.setItem(KEYS.ADMIN_SESSION, 'authenticated_admin_active');
        }
        sessionStorage.setItem(KEYS.ADMIN_SESSION, 'authenticated_admin_active');
        if (data.adminToken) {
          this.setAdminToken(data.adminToken);
        }
        return { valid: true, message: data.message || 'تم التحقق بنجاح.' };
      }
      return {
        valid: false,
        isLocked: data.isLocked,
        remainingSeconds: data.remainingSeconds,
        message: data.message || 'كلمة المرور غير صحيحة.'
      };
    } catch {
      return this.verifyAdminPassword(password, remember);
    }
  },

  async changeAdminPasswordAsync(oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    try {
      const adminToken = this.getAdminToken();
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify({ oldPassword: oldPass.trim(), newPassword: newPass.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'تم تحديث كلمة مرور المشرف بنجاح.' };
      }
      return { success: false, message: data.message || 'فشل تحديث كلمة المرور.' };
    } catch {
      return this.changeAdminPassword(oldPass, newPass);
    }
  },

  getTelegramSettings(): TelegramBotSettings {
    const defaultSettings: TelegramBotSettings = {
      botToken: '',
      botUsername: '',
      botFirstName: '',
      isConnected: false,
      autoBroadcastNew: false,
      autoBroadcastResults: false,
      targetGroups: [],
      groupsList: [],
      welcomeMessage: 'مرحباً بك في منصة التنافس والمسابقات التعليمية! اختر من القائمة لاستعراض المسابقات المتاحة أو بدء التحدي.'
    };
    const saved = getStored<TelegramBotSettings>(KEYS.TELEGRAM_SETTINGS, defaultSettings);
    const targetGroups = Array.isArray(saved.targetGroups) ? saved.targetGroups : [];
    const groupsList = Array.isArray(saved.groupsList) ? [...saved.groupsList] : [];

    // Ensure all targetGroups have an entry in groupsList
    targetGroups.forEach((id, idx) => {
      if (!groupsList.some(g => g.id === id)) {
        groupsList.push({
          id,
          name: `جروب (${id.slice(-6)})`,
          category: 'عام'
        });
      }
    });

    return {
      ...defaultSettings,
      ...saved,
      targetGroups,
      groupsList
    };
  },

  saveTelegramSettings(settings: TelegramBotSettings): void {
    setStored(KEYS.TELEGRAM_SETTINGS, settings);
    const adminToken = this.getAdminToken();
    fetch('/api/telegram/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      },
      body: JSON.stringify(settings)
    }).catch(err => console.warn('Could not sync Telegram settings to server:', err));
  },

  async saveTelegramSettingsAsync(settings: TelegramBotSettings): Promise<{ success: boolean; error?: string }> {
    setStored(KEYS.TELEGRAM_SETTINGS, settings);
    try {
      const adminToken = this.getAdminToken();
      const res = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const current = this.getTelegramSettings();
          const cleanToken = data.settings.botToken && !data.settings.botToken.startsWith('•••')
            ? data.settings.botToken
            : current.botToken;
          setStored(KEYS.TELEGRAM_SETTINGS, {
            ...current,
            ...data.settings,
            botToken: cleanToken
          });
        }
        return { success: true };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'فشل حفظ الإعدادات على الخادم' };
    } catch (e: any) {
      console.warn('Network error saving telegram settings:', e);
      return { success: true }; // Saved locally at least
    }
  },

  exportAllPlatformData(): string {
    const data = {
      exportDate: new Date().toISOString(),
      accessCodes: this.getAccessCodes(),
      competitions: this.getCompetitions(),
      participants: this.getParticipants(),
      answers: this.getAnswers(),
      manualCerts: this.getManualCertificates(),
      teams: this.getTeams()
    };
    return JSON.stringify(data, null, 2);
  },

  importPlatformData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.accessCodes)) setStored(KEYS.ACCESS_CODES, data.accessCodes);
      if (Array.isArray(data.competitions)) setStored(KEYS.COMPETITIONS, data.competitions);
      if (Array.isArray(data.participants)) setStored(KEYS.PARTICIPANTS, data.participants);
      if (Array.isArray(data.answers)) setStored(KEYS.ANSWERS, data.answers);
      if (Array.isArray(data.manualCerts)) setStored(KEYS.MANUAL_CERTS, data.manualCerts);
      if (Array.isArray(data.teams)) setStored(KEYS.TEAMS, data.teams);
      window.dispatchEvent(new Event('storage_update'));
      syncCompetitionsToServer();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  resetAllData(): void {
    localStorage.removeItem(KEYS.ACCESS_CODES);
    localStorage.removeItem(KEYS.COMPETITIONS);
    localStorage.removeItem(KEYS.PARTICIPANTS);
    localStorage.removeItem(KEYS.ANSWERS);
    localStorage.removeItem(KEYS.MANUAL_CERTS);
    localStorage.removeItem(KEYS.TEAMS);
    localStorage.removeItem(KEYS.LOGGED_TEACHER_CODE);
    localStorage.removeItem(KEYS.RATE_LIMIT);
    localStorage.removeItem(KEYS.ADMIN_PASSCODE);
    localStorage.removeItem(KEYS.ADMIN_SESSION);
    sessionStorage.removeItem(KEYS.ADMIN_SESSION);
    window.dispatchEvent(new Event('storage_update'));
    syncCompetitionsToServer([]);
  },

  async fetchFromDatabase(): Promise<boolean> {
    let updatedAny = false;
    try {
      // 1. Competitions - Server is authoritative
      const res = await fetch('/api/competitions');
      if (res.ok) {
        const remoteComps = await res.json();
        if (Array.isArray(remoteComps)) {
          const deletedIds = new Set(this.getDeletedCompetitionIds());
          // Filter out deleted IDs from remote comps just in case
          let activeRemote = remoteComps.filter((c: Competition) => !deletedIds.has(c.id));
          
          // Ensure comp-question-bank is present unless deleted
          const bankComp = INITIAL_COMPETITIONS.find(c => c.id === 'comp-question-bank');
          if (bankComp && !deletedIds.has('comp-question-bank') && !activeRemote.some(c => c.id === 'comp-question-bank')) {
            activeRemote = [bankComp, ...activeRemote];
          }

          setStored(KEYS.COMPETITIONS, activeRemote);
          updatedAny = true;
        }
      }
    } catch (e) {
      console.warn('Could not pull competitions from database:', e);
    }

    try {
      // 2. Access Codes - Merge remote and local active codes
      const codesRes = await fetch('/api/access-codes');
      if (codesRes.ok) {
        const remoteCodes = await codesRes.json();
        if (Array.isArray(remoteCodes)) {
          const deletedIds = new Set(this.getDeletedAccessCodeIds().map(s => s.toUpperCase()));
          const localCodes = this.getAccessCodes();
          const map = new Map<string, AccessCode>();

          // Add valid remote codes
          remoteCodes.forEach((c: AccessCode) => {
            if (c && c.code && !deletedIds.has(c.id.toUpperCase()) && !deletedIds.has(c.code.toUpperCase())) {
              map.set(c.code.toUpperCase(), c);
            }
          });

          // Preserve any newly created local codes not yet on remote
          const unsyncedCodes: AccessCode[] = [];
          localCodes.forEach(local => {
            const key = local.code.toUpperCase();
            if (!deletedIds.has(local.id.toUpperCase()) && !deletedIds.has(key)) {
              if (!map.has(key)) {
                map.set(key, local);
                unsyncedCodes.push(local);
              }
            }
          });

          const merged = Array.from(map.values());
          setStored(KEYS.ACCESS_CODES, merged);
          updatedAny = true;

          // Push any unsynced local codes to server
          if (unsyncedCodes.length > 0) {
            fetch('/api/access-codes/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ codes: unsyncedCodes })
            }).catch(err => console.warn('Could not sync local codes to server:', err));
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch access codes from server:', e);
    }

    try {
      // 3. Manual Certificates
      const certsRes = await fetch('/api/manual-certificates');
      if (certsRes.ok) {
        const remoteCerts = await certsRes.json();
        if (Array.isArray(remoteCerts)) {
          setStored(KEYS.MANUAL_CERTS, remoteCerts);
          updatedAny = true;
        }
      }
    } catch {}

    try {
      // 4. Telegram Settings
      const adminToken = this.getAdminToken();
      const teleRes = await fetch('/api/telegram/settings', {
        headers: {
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        }
      });
      if (teleRes.ok) {
        const remoteTele = await teleRes.json();
        if (remoteTele) {
          const current = this.getTelegramSettings();
          const cleanGroups = Array.isArray(remoteTele.targetGroups)
            ? remoteTele.targetGroups.filter((g: string) => g && !g.includes('1234567890'))
            : current.targetGroups;
          
          // Merge groupsList smartly: preserve any custom names already in current
          const groupMap = new Map<string, any>();
          (current.groupsList || []).forEach(g => {
            if (g && g.id) groupMap.set(g.id, g);
          });
          if (Array.isArray(remoteTele.groupsList)) {
            remoteTele.groupsList.forEach((rg: any) => {
              if (!rg || !rg.id) return;
              const cur = groupMap.get(rg.id);
              // Only overwrite if remote has a real custom name or cur doesn't exist
              if (!cur) {
                groupMap.set(rg.id, rg);
              } else if ((!cur.name || cur.name.startsWith('جروب (')) && (rg.name && !rg.name.startsWith('جروب ('))) {
                groupMap.set(rg.id, { ...cur, ...rg });
              }
            });
          }

          const cleanToken = remoteTele.botToken && !remoteTele.botToken.startsWith('•••')
            ? remoteTele.botToken
            : current.botToken;

          setStored(KEYS.TELEGRAM_SETTINGS, {
            ...current,
            ...remoteTele,
            targetGroups: cleanGroups,
            groupsList: Array.from(groupMap.values()),
            botToken: cleanToken
          });
          updatedAny = true;
        }
      }
    } catch {}

    try {
      // 5. Participants (Central shared persistence across all devices)
      const partsRes = await fetch('/api/participants');
      if (partsRes.ok) {
        const remoteParts = await partsRes.json();
        if (Array.isArray(remoteParts)) {
          const mappedList: Participant[] = remoteParts.map((r: any) => ({
            id: r.id,
            competitionId: r.competitionId,
            name: r.name || r.studentName || 'طالب مشارك',
            school: r.school || '',
            teamId: r.teamId,
            teamName: r.teamName,
            teamCode: r.teamCode,
            memberId: r.memberId,
            isTeamLeader: r.isTeamLeader,
            sessionToken: r.sessionToken || `remote_${r.id}`,
            joinedAt: r.joinedAt || r.submittedAt || new Date().toISOString(),
            score: Number(r.score) || 0,
            correctAnswers: Number(r.correctAnswers) || 0,
            totalQuestions: Number(r.totalQuestions) || 0,
            totalTimeSeconds: Number(r.totalTimeSeconds) || 0,
            rank: r.rank,
            submittedAt: r.submittedAt
          }));
          setStored(KEYS.PARTICIPANTS, mappedList);
          updatedAny = true;
        }
      }
    } catch (e) {
      console.warn('Could not pull participants from database:', e);
    }

    try {
      // 6. Teams (Central shared persistence across all devices)
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const remoteTeams = await teamsRes.json();
        if (Array.isArray(remoteTeams) && remoteTeams.length > 0) {
          const localTeams = this.getTeams();
          const teamMap = new Map<string, CompetitionTeam>();
          localTeams.forEach(t => teamMap.set(`${t.competitionId}_${t.code}`, t));
          remoteTeams.forEach((rt: any) => {
            if (rt && rt.competitionId && (rt.code || rt.teamCode)) {
              const code = String(rt.code || rt.teamCode);
              const key = `${rt.competitionId}_${code}`;
              const mapped: CompetitionTeam = {
                id: rt.id,
                competitionId: rt.competitionId,
                name: rt.name || rt.teamName,
                code,
                leaderName: rt.leaderName || (rt.members?.[0]?.studentName || 'قائد الفريق'),
                leaderId: rt.leaderId,
                school: rt.school,
                members: Array.isArray(rt.members) ? rt.members.map((m: any, mIdx: number) => ({
                  id: m.id || `m_${mIdx}_${Date.now()}`,
                  name: m.name || m.studentName,
                  school: m.school,
                  isLeader: Boolean(m.isLeader),
                  joinedAt: m.joinedAt || new Date().toISOString()
                })) : [],
                maxMembers: Number(rt.maxMembers) || 4,
                minMembers: Number(rt.minMembers) || 2,
                allowPublicJoin: rt.allowPublicJoin ?? true,
                status: rt.status || 'forming',
                createdAt: rt.createdAt || new Date().toISOString()
              };
              teamMap.set(key, mapped);
            }
          });
          setStored(KEYS.TEAMS, Array.from(teamMap.values()));
          updatedAny = true;
        }
      }
    } catch (e) {
      console.warn('Could not pull teams from server:', e);
    }

    try {
      const bankUpdated = await this.fetchBankFromDatabase();
      if (bankUpdated) updatedAny = true;
    } catch {}

    if (updatedAny) {
      window.dispatchEvent(new Event('storage_update'));
    }
    return updatedAny;
  },

  async getDatabaseStatus(): Promise<{
    connected: boolean;
    engine: string;
    database: string;
    error: string | null;
    competitionsCount?: number;
    participantsCount?: number;
    teamsCount?: number;
  }> {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      connected: false,
      engine: 'LocalStore',
      database: 'localStorage',
      error: 'Cannot reach server database API'
    };
  },

  // ================= QUESTION BANK: DOMAINS & QUESTIONS =================
  getBankDomains(): QuestionBankDomain[] {
    const list = getStored<QuestionBankDomain[]>(KEYS.BANK_DOMAINS, INITIAL_BANK_DOMAINS);
    if (!list || list.length === 0) {
      setStored(KEYS.BANK_DOMAINS, INITIAL_BANK_DOMAINS);
      return INITIAL_BANK_DOMAINS;
    }
    return list;
  },

  saveBankDomain(domain: QuestionBankDomain): void {
    const list = this.getBankDomains();
    const idx = list.findIndex(d => d.id === domain.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...domain, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...domain, createdAt: domain.createdAt || new Date().toISOString() });
    }
    setStored(KEYS.BANK_DOMAINS, list);

    const adminToken = this.getAdminToken();
    fetch('/api/bank/domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      },
      body: JSON.stringify(domain)
    }).catch(err => console.warn('Could not sync bank domain to server:', err));
  },

  deleteBankDomain(domainId: string): void {
    const list = this.getBankDomains().filter(d => d.id !== domainId);
    setStored(KEYS.BANK_DOMAINS, list);
    // Also delete all questions in that domain
    const questions = this.getBankQuestions().filter(q => q.domainId !== domainId);
    setStored(KEYS.BANK_QUESTIONS, questions);

    const adminToken = this.getAdminToken();
    fetch(`/api/bank/domains/${encodeURIComponent(domainId)}`, {
      method: 'DELETE',
      headers: adminToken ? { 'X-Admin-Token': adminToken } : {}
    }).catch(err => console.warn('Could not delete bank domain on server:', err));
  },

  emptyBankDomain(domainId: string): void {
    const questions = this.getBankQuestions().filter(q => q.domainId !== domainId);
    setStored(KEYS.BANK_QUESTIONS, questions);

    const adminToken = this.getAdminToken();
    fetch(`/api/bank/domains/${encodeURIComponent(domainId)}/empty`, {
      method: 'POST',
      headers: adminToken ? { 'X-Admin-Token': adminToken } : {}
    }).catch(err => console.warn('Could not empty bank domain on server:', err));
  },

  getBankQuestions(domainId?: string): BankQuestion[] {
    const local = getStored<BankQuestion[]>(KEYS.BANK_QUESTIONS, INITIAL_BANK_QUESTIONS);
    if (domainId && domainId !== 'all') {
      return (local || []).filter(q => q.domainId === domainId);
    }
    return local || [];
  },

  saveBankQuestion(q: BankQuestion): void {
    const all = this.getBankQuestions();
    const idx = all.findIndex(item => item.id === q.id);
    if (idx >= 0) {
      all[idx] = q;
    } else {
      all.unshift(q);
    }
    setStored(KEYS.BANK_QUESTIONS, all);

    const adminToken = this.getAdminToken();
    fetch('/api/bank/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      },
      body: JSON.stringify(q)
    }).catch(err => console.warn('Could not sync bank question to server:', err));
  },

  saveBatchBankQuestions(questions: BankQuestion[]): void {
    if (!questions || questions.length === 0) return;
    const all = this.getBankQuestions();
    const map = new Map<string, BankQuestion>();
    all.forEach(q => map.set(q.id, q));
    questions.forEach(q => map.set(q.id, q));
    const merged = Array.from(map.values());
    setStored(KEYS.BANK_QUESTIONS, merged);

    const adminToken = this.getAdminToken();
    fetch('/api/bank/questions/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
      },
      body: JSON.stringify({ questions })
    }).catch(err => console.warn('Could not batch sync bank questions to server:', err));
  },

  deleteBankQuestion(id: string): void {
    const all = this.getBankQuestions().filter(q => q.id !== id);
    setStored(KEYS.BANK_QUESTIONS, all);

    const adminToken = this.getAdminToken();
    fetch(`/api/bank/questions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminToken ? { 'X-Admin-Token': adminToken } : {}
    }).catch(err => console.warn('Could not delete bank question on server:', err));
  },

  getRandomBankQuestions(domainId: string | 'all', count: number): Question[] {
    const pool = this.getBankQuestions(domainId);
    if (pool.length === 0) {
      return [];
    }

    // Shuffle pool with Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    // Map to standard Question format and shuffle options so answers are randomly distributed
    return selected.map((bq, idx) => {
      const correctText = bq.options[bq.correctIndex] ?? bq.options[0];
      const shuffledOptions = [...bq.options];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      const newCorrectIndex = shuffledOptions.indexOf(correctText);

      return {
        id: `q-bank-eval-${bq.id}-${Date.now()}-${idx}`,
        competitionId: 'comp-question-bank',
        text: bq.text,
        options: shuffledOptions,
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
        duration: bq.duration || 30,
        explanation: bq.explanation || 'إجابة نموذجية ضمن بنك الأسئلة المركزي',
        category: bq.domainName || 'تقييم شامل'
      };
    });
  },

  async fetchBankFromDatabase(): Promise<boolean> {
    try {
      const [resDomains, resQuestions] = await Promise.all([
        fetch('/api/bank/domains').then(r => r.ok ? r.json() : null),
        fetch('/api/bank/questions').then(r => r.ok ? r.json() : null)
      ]);

      let changed = false;
      if (Array.isArray(resDomains)) {
        setStored(KEYS.BANK_DOMAINS, resDomains);
        changed = true;
      }

      if (Array.isArray(resQuestions)) {
        setStored(KEYS.BANK_QUESTIONS, resQuestions);
        changed = true;
      }

      if (changed) {
        window.dispatchEvent(new Event('storage_update'));
      }
      return changed;
    } catch {
      return false;
    }
  }
};
