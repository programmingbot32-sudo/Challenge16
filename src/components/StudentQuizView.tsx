import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Trophy, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Award, 
  RotateCcw, 
  Sparkles, 
  ChevronLeft, 
  ChevronDown,
  School, 
  User, 
  Users, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  Share2, 
  Clock,
  BookOpen,
  Globe,
  Lock,
  CalendarClock,
  Volume2,
  VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Competition, Participant, ParticipantResult, CompetitionTeam, Question } from '../types';
import { StorageService } from '../services/storageService';
import { CertificateModal } from './CertificateModal';
import { TeamLobbyView } from './TeamLobbyView';
import { QuestionBankView } from './QuestionBankView';
import { formatArabicDateTime, getTimeRemainingText } from '../services/dateUtils';
import { SoundService } from '../services/soundService';

interface StudentQuizViewProps {
  initialCompetitionIdOrSlug?: string;
  onBackToHome: () => void;
}

export const StudentQuizView: React.FC<StudentQuizViewProps> = ({
  initialCompetitionIdOrSlug,
  onBackToHome,
}) => {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stage, setStage] = useState<'welcome' | 'quiz' | 'completed'>('welcome');

  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [activeTeam, setActiveTeam] = useState<CompetitionTeam | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);

  const urlTeamCode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('teamCode') || '';
    } catch {
      return '';
    }
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeExpiredAlert, setTimeExpiredAlert] = useState(false);
  const [antiCheatWarnings, setAntiCheatWarnings] = useState(0);
  const [showWarningAlert, setShowWarningAlert] = useState(false);
  const isCurrentlyAwayRef = useRef<boolean>(false);

  const isActualCompetition = Boolean(
    competition &&
    !competition.isQuestionBank &&
    competition.id !== 'comp-question-bank' &&
    competition.competitionType !== 'open'
  );

  const [finalResult, setFinalResult] = useState<ParticipantResult | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => SoundService.isSoundMuted());
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  const toggleSound = () => {
    const next = SoundService.toggleMute();
    setIsSoundMuted(next);
  };

  const [priorAttempt, setPriorAttempt] = useState<ParticipantResult | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [syncTick, setSyncTick] = useState<number>(0);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setSyncTick(v => v + 1);
    };
    window.addEventListener('storage_update', handleStorageUpdate);
    return () => window.removeEventListener('storage_update', handleStorageUpdate);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const compTimingStatus = useMemo<'active' | 'upcoming' | 'ended'>(() => {
    if (!competition) return 'active';
    return StorageService.getCompetitionStatus(competition);
  }, [competition, nowTime]);

  const upcomingCountdown = useMemo(() => {
    if (!competition || compTimingStatus !== 'upcoming') return null;
    const start = competition.startTime ? new Date(competition.startTime).getTime() : 0;
    const diffMs = Math.max(0, start - nowTime);
    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, totalSec };
  }, [competition, compTimingStatus, nowTime]);

  const allCompetitionResults = useMemo(() => {
    if (!competition) return [];
    return StorageService.getCompetitionResults(competition.id);
  }, [competition, stage, syncTick]);

  const topResults = useMemo(() => {
    return allCompetitionResults.slice(0, 10);
  }, [allCompetitionResults]);

  const actualRank = useMemo(() => {
    if (!competition || !finalResult) return 1;
    if (competition.competitionType === 'open') return undefined;
    const found = allCompetitionResults.find(r => r.id === finalResult.id);
    return found?.rank || 1;
  }, [competition, finalResult, allCompetitionResults]);

  const isRankVisible = useMemo(() => {
    if (!competition) return false;
    if (competition.competitionType === 'open') return false;
    return compTimingStatus === 'ended';
  }, [competition, compTimingStatus]);

  const isRankPending = useMemo(() => {
    if (!competition) return false;
    if (competition.competitionType === 'open') return false;
    return compTimingStatus !== 'ended';
  }, [competition, compTimingStatus]);

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
  const transitionTimeoutRef = useRef<any>(null);
  const isAnsweredRef = useRef(false);
  const participantRef = useRef<Participant | null>(null);
  const currentIndexRef = useRef(0);
  const competitionRef = useRef<Competition | null>(null);

  useEffect(() => {
    participantRef.current = participant;
  }, [participant]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    competitionRef.current = competition;
  }, [competition]);

  useEffect(() => {
    const updateTargetCompetition = () => {
      const all = StorageService.getCompetitions();
      let target: Competition | null = null;
      if (initialCompetitionIdOrSlug) {
        target = StorageService.getCompetitionById(initialCompetitionIdOrSlug) || null;
      } else {
        target = all.find((c) => c.status === 'active' && c.visibility !== 'private') || all.find(c => c.visibility !== 'private') || all[0] || null;
      }
      setCompetition(target);

      if (target) {
        // Fetch latest participants from server for accurate live leaderboard
        StorageService.fetchParticipants(target.id).then(() => {
          setSyncTick(v => v + 1);
        });

        const check = StorageService.hasStudentParticipated(target.id);
        if (check.participated && check.participant) {
          setPriorAttempt(check.participant);
          try { sessionStorage.removeItem('tanafas_active_quiz_' + target.id); } catch {}
        } else {
          // Safe session recovery on page refresh
          try {
            const rawActive = sessionStorage.getItem('tanafas_active_quiz_' + target.id);
            if (rawActive) {
              const activeData = JSON.parse(rawActive);
              if (activeData.participant && activeData.participant.id) {
                const answers = StorageService.getAnswers().filter(a => a.participantId === activeData.participant.id);
                const nextIdx = answers.length;
                if (nextIdx < target.questions.length) {
                  setParticipant(activeData.participant);
                  participantRef.current = activeData.participant;
                  setStudentName(activeData.studentName || activeData.participant.name);
                  setSchoolName(activeData.schoolName || activeData.participant.school);
                  setCurrentIndex(nextIdx);
                  currentIndexRef.current = nextIdx;
                  setStage('quiz');
                } else {
                  // All questions were already answered, finalize directly
                  const res = StorageService.finalizeParticipant(activeData.participant.id, target.questions.length);
                  setFinalResult(res);
                  setStage('completed');
                  sessionStorage.removeItem('tanafas_active_quiz_' + target.id);
                }
              }
            }
          } catch (e) {
            console.warn('Could not restore in-progress session:', e);
          }
        }
      }
    };

    updateTargetCompetition();
    window.addEventListener('storage_update', updateTargetCompetition);
    return () => window.removeEventListener('storage_update', updateTargetCompetition);
  }, [initialCompetitionIdOrSlug]);

  const finishQuizForCheating = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const comp = competitionRef.current;
    const part = participantRef.current;
    if (!comp || !part) return;

    const disqReason = 'تم إنهاء الاختبار وتصفير النتيجة واستبعادك لمخالفة تعليمات النزاهة وتكرار مغادرة شاشة المسابقة لمرتين.';

    try {
      const res = StorageService.disqualifyParticipant(part.id, comp.questions.length, disqReason);
      setFinalResult(res);
      setStage('completed');
      try {
        SoundService.playWrong();
      } catch {}
    } catch (err) {
      console.error('Error finalizing cheating participant:', err);
      const answers = StorageService.getAnswers().filter(a => a.participantId === part.id);
      const fallbackRes: ParticipantResult = {
        ...part,
        correctAnswers: 0,
        totalQuestions: comp.questions.length,
        score: 0,
        totalTimeSeconds: 0,
        submittedAt: new Date().toISOString(),
        competitionName: comp.name,
        answers,
        isDisqualified: true,
        disqualifiedReason: disqReason
      };
      setFinalResult(fallbackRes);
      setStage('completed');
    } finally {
      try {
        sessionStorage.removeItem('tanafas_active_quiz_' + comp.id);
        sessionStorage.removeItem(`tanafas_q_deadline_${comp.id}_${currentIndexRef.current}`);
      } catch {}
    }
  }, []);

  const finishQuizForCheatingRef = useRef(finishQuizForCheating);
  useEffect(() => {
    finishQuizForCheatingRef.current = finishQuizForCheating;
  }, [finishQuizForCheating]);

  const finishQuiz = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const comp = competitionRef.current;
    const part = participantRef.current;
    if (!comp || !part) return;

    try {
      const res = StorageService.finalizeParticipant(part.id, comp.questions.length);
      setFinalResult(res);
      setStage('completed');
      StorageService.fetchParticipants(comp.id).catch(() => {});
      try {
        SoundService.playFinish();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err) {
      console.error('Error finalizing participant:', err);
      // Fallback safe participant calculation so student is never trapped
      const answers = StorageService.getAnswers().filter(a => a.participantId === part.id);
      const correctCount = answers.filter(a => a.isCorrect).length;
      const totalTime = answers.reduce((acc, a) => acc + (a.timeTaken || 0), 0);
      const calculatedScore = Math.round((correctCount / Math.max(1, comp.questions.length)) * 100);
      const fallbackRes: ParticipantResult = {
        ...part,
        correctAnswers: correctCount,
        totalQuestions: comp.questions.length,
        score: calculatedScore,
        totalTimeSeconds: Number(totalTime.toFixed(1)),
        submittedAt: new Date().toISOString(),
        competitionName: comp.name,
        answers
      };
      setFinalResult(fallbackRes);
      setStage('completed');
    } finally {
      try {
        sessionStorage.removeItem('tanafas_active_quiz_' + comp.id);
      } catch {}
    }
  }, []);

  const triggerNextQuestion = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const comp = competitionRef.current;
    if (!comp) return;

    const currIdx = currentIndexRef.current;
    if (currIdx + 1 < comp.questions.length) {
      if (isActualCompetition) {
        try {
          sessionStorage.removeItem(`tanafas_q_deadline_${comp.id}_${currIdx}`);
        } catch {}
      }
      const nextIdx = currIdx + 1;
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      setIsAnswered(false);
      isAnsweredRef.current = false;
      setSelectedOption(null);
      setTimeExpiredAlert(false);
    } else {
      finishQuiz();
    }
  }, [finishQuiz]);

  const handleTimeExpired = useCallback(() => {
    if (isAnsweredRef.current) return;
    isAnsweredRef.current = true;
    setIsAnswered(true);
    setTimeExpiredAlert(true);

    const comp = competitionRef.current;
    const hideFeedback = Boolean(comp?.hideAnswersUntilEnd || (comp?.competitionType && comp?.competitionType !== 'open'));
    if (!hideFeedback) {
      SoundService.playIncorrect();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let part = participantRef.current;
    const currIdx = currentIndexRef.current;

    if (comp) {
      if (!part) {
        part = StorageService.registerParticipant({
          competitionId: comp.id,
          name: studentName.trim() || 'مشارك',
          school: schoolName.trim() || comp.schoolName || 'المملكة العربية السعودية',
        });
        participantRef.current = part;
        setParticipant(part);
      }

      const currentQ = comp.questions[currIdx];
      if (currentQ && part) {
        const duration = currentQ.duration || comp.questionDuration || 30;
        StorageService.saveAnswer({
          participantId: part.id,
          questionId: currentQ.id,
          selectedIndex: -1,
          isCorrect: false,
          timeTaken: duration,
        });
      }
    }

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Automatically transition to next question after 1.2 seconds so student can read notice
    transitionTimeoutRef.current = setTimeout(() => {
      triggerNextQuestion();
    }, 1200);
  }, [studentName, schoolName, triggerNextQuestion]);

  const handleSelectAnswer = useCallback((optIndex: number) => {
    if (isAnsweredRef.current || !competitionRef.current || !participantRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isAnsweredRef.current = true;
    setIsAnswered(true);
    setSelectedOption(optIndex);
    setTimeExpiredAlert(false);

    const comp = competitionRef.current;
    const part = participantRef.current;
    const currIdx = currentIndexRef.current;
    const currentQ = comp.questions[currIdx];

    if (currentQ) {
      const timeTaken = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
      const isCorrect = optIndex === currentQ.correctIndex;
      const hideFeedback = Boolean(comp.hideAnswersUntilEnd || (comp.competitionType && comp.competitionType !== 'open'));

      if (hideFeedback) {
        // In competitions where answers should not be revealed until the end, play neutral selection chime
        SoundService.playSelect();
      } else if (isCorrect) {
        SoundService.playCorrect();
      } else {
        SoundService.playIncorrect();
      }

      StorageService.saveAnswer({
        participantId: part.id,
        questionId: currentQ.id,
        selectedIndex: optIndex,
        isCorrect,
        timeTaken,
      });
    }

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      triggerNextQuestion();
    }, 1200);
  }, [triggerNextQuestion]);

  // Keep a stable ref for handleTimeExpired to avoid re-triggering the timer effect
  const handleTimeExpiredRef = useRef(handleTimeExpired);
  useEffect(() => {
    handleTimeExpiredRef.current = handleTimeExpired;
  }, [handleTimeExpired]);

  // Anti-Cheat: Tab Switch & Window Blur Detection (Only for actual timed/live competitions)
  useEffect(() => {
    if (stage !== 'quiz' || !isActualCompetition) return;

    const compId = competition?.id || 'comp';

    const handleLeaving = () => {
      if (isCurrentlyAwayRef.current) return;
      isCurrentlyAwayRef.current = true;

      const rawCount = Number(sessionStorage.getItem('tanafas_violations_' + compId)) || 0;
      const nextCount = rawCount + 1;
      sessionStorage.setItem('tanafas_violations_' + compId, String(nextCount));
      setAntiCheatWarnings(nextCount);

      if (nextCount === 1) {
        setShowWarningAlert(true);
        try {
          SoundService.playWrong();
        } catch {}
      } else if (nextCount >= 2) {
        setShowWarningAlert(false);
        finishQuizForCheatingRef.current();
      }
    };

    const handleReturning = () => {
      isCurrentlyAwayRef.current = false;
      // Immediately calculate deducted elapsed time
      if (competition) {
        const deadlineKey = `tanafas_q_deadline_${competition.id}_${currentIndexRef.current}`;
        const stored = sessionStorage.getItem(deadlineKey);
        if (stored) {
          const remMs = Number(stored) - Date.now();
          const remSec = Math.max(0, Math.ceil(remMs / 1000));
          setTimeLeft(remSec);
          if (remSec <= 0) {
            handleTimeExpiredRef.current();
          }
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleLeaving();
      } else {
        handleReturning();
      }
    };

    const onWindowBlur = () => {
      handleLeaving();
    };

    const onWindowFocus = () => {
      handleReturning();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [stage, isActualCompetition, competition?.id]);

  // If the scheduled competition end time arrives during the quiz, cleanly finalize and record the answers
  useEffect(() => {
    if (stage === 'quiz' && compTimingStatus === 'ended') {
      finishQuiz();
    }
  }, [stage, compTimingStatus, finishQuiz]);

  // Helper: compute intelligent question duration from question, competition setting or distributed total exam duration
  const getEffectiveQuestionDuration = useCallback((comp: Competition, q?: Question): number => {
    if (q && typeof q.duration === 'number' && q.duration > 0) return q.duration;
    if (typeof comp.questionDuration === 'number' && comp.questionDuration > 0) return comp.questionDuration;
    if (comp.examDurationMinutes && comp.examDurationMinutes > 0 && comp.questions && comp.questions.length > 0) {
      const calc = Math.floor((comp.examDurationMinutes * 60) / comp.questions.length);
      if (calc >= 10) return calc;
    }
    return 30;
  }, []);

  useEffect(() => {
    if (stage !== 'quiz' || !competition) return;

    const currentQ = competition.questions[currentIndex];
    const duration = getEffectiveQuestionDuration(competition, currentQ);

    let deadline = Date.now() + duration * 1000;
    const deadlineKey = `tanafas_q_deadline_${competition.id}_${currentIndex}`;

    if (isActualCompetition) {
      const stored = sessionStorage.getItem(deadlineKey);
      if (stored) {
        deadline = Number(stored);
      } else {
        sessionStorage.setItem(deadlineKey, String(deadline));
      }

      const initialRemaining = Math.ceil((deadline - Date.now()) / 1000);
      if (initialRemaining <= 0) {
        setTimeLeft(0);
        handleTimeExpiredRef.current();
        return;
      }
      setTimeLeft(initialRemaining);
    } else {
      setTimeLeft(duration);
    }

    setIsAnswered(false);
    isAnsweredRef.current = false;
    setSelectedOption(null);
    setTimeExpiredAlert(false);
    questionStartTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      const remainingMs = deadline - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (isActualCompetition) {
          try {
            sessionStorage.removeItem(deadlineKey);
          } catch {}
        }
        handleTimeExpiredRef.current();
      }
    }, 200);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Note: transitionTimeoutRef is intentionally NOT cleared here,
      // allowing the smooth transition to next question to complete.
    };
  }, [stage, currentIndex, competition?.id, isActualCompetition]);

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!competition) return;

    const currentStatus = StorageService.getCompetitionStatus(competition);
    if (currentStatus === 'upcoming') {
      setAttemptError('المسابقة لم تبدأ بعد، يرجى الانتظار حتى الموعد المحدد.');
      return;
    }
    if (currentStatus === 'ended') {
      setAttemptError('عفواً، لقد انتهت فترة المسابقة المحددة ولم يعد بالإمكان المشاركة.');
      return;
    }

    const trimmed = studentName.trim();
    if (!trimmed) return;

    if (competition.singleAttempt) {
      const check = StorageService.hasStudentParticipated(competition.id, trimmed);
      if (check.participated) {
        setAttemptError('عفواً، هذه المسابقة تسمح بمحاولة واحدة فقط لكل مشارك.');
        return;
      }
    }

    const newPart = StorageService.registerParticipant({
      competitionId: competition.id,
      name: trimmed,
      school: schoolName.trim() || competition.schoolName || 'المملكة العربية السعودية',
      teamName: competition.participationType === 'team' ? teamName.trim() : undefined,
    });

    participantRef.current = newPart;
    currentIndexRef.current = 0;
    setParticipant(newPart);
    setCurrentIndex(0);
    setStage('quiz');

    try {
      sessionStorage.removeItem('tanafas_violations_' + competition.id);
      for (let i = 0; i < (competition.questions?.length || 50); i++) {
        sessionStorage.removeItem(`tanafas_q_deadline_${competition.id}_${i}`);
      }
    } catch {}
    setAntiCheatWarnings(0);
    setShowWarningAlert(false);

    try {
      sessionStorage.setItem('tanafas_active_quiz_' + competition.id, JSON.stringify({
        participant: newPart,
        studentName: trimmed,
        schoolName: schoolName.trim()
      }));
    } catch {}
  };

  const handleTeamStart = (team: CompetitionTeam, participantName: string) => {
    if (!competition) return;
    const latestTeam = StorageService.getTeamByCode(competition.id, team.code);
    const member = latestTeam?.members.find(m => m.name.trim().toLowerCase() === participantName.trim().toLowerCase());
    if (!latestTeam || !member) {
      setAttemptError('تعذر التحقق من عضويتك في الفريق. يرجى العودة إلى قاعة الفريق والانضمام مجدداً.');
      return;
    }
    const status = StorageService.getCompetitionStatus(competition);
    if (status !== 'active' || latestTeam.status === 'disqualified' || latestTeam.members.length < (latestTeam.minMembers || 2)) {
      setAttemptError('الفريق غير مؤهل لبدء المسابقة حالياً.');
      return;
    }
    if (competition.singleAttempt && StorageService.hasStudentParticipated(competition.id, participantName).participated) {
      setAttemptError('عفواً، هذه المسابقة تسمح بمحاولة واحدة فقط لكل مشارك.');
      return;
    }
    const isLeader = latestTeam.leaderId === member.id;
    const newPart = StorageService.registerParticipant({
      competitionId: competition.id,
      name: participantName.trim(),
      school: latestTeam.school || competition.schoolName || 'المملكة العربية السعودية',
      teamId: latestTeam.id,
      teamName: latestTeam.name,
      teamCode: latestTeam.code,
      memberId: member.id,
      isTeamLeader: isLeader
    });

    participantRef.current = newPart;
    currentIndexRef.current = 0;
    setParticipant(newPart);
    setStudentName(participantName);
    setTeamName(latestTeam.name);
    setActiveTeam(latestTeam);
    setCurrentIndex(0);
    setStage('quiz');

    try {
      sessionStorage.removeItem('tanafas_violations_' + competition.id);
      for (let i = 0; i < (competition.questions?.length || 50); i++) {
        sessionStorage.removeItem(`tanafas_q_deadline_${competition.id}_${i}`);
      }
    } catch {}
    setAntiCheatWarnings(0);
    setShowWarningAlert(false);

    try {
      sessionStorage.setItem('tanafas_active_quiz_' + competition.id, JSON.stringify({
        participant: newPart,
        studentName: participantName,
        schoolName: latestTeam.school || competition.schoolName,
        teamName: latestTeam.name,
        teamCode: latestTeam.code,
        competitionId: competition.id
      }));
    } catch {}
  };

  const handleCopyLink = () => {
    const slugOrId = competition?.webSlug || competition?.id || initialCompetitionIdOrSlug || '';
    const url = slugOrId ? `${window.location.origin}/?quiz=${encodeURIComponent(slugOrId)}` : window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (competition?.isQuestionBank || initialCompetitionIdOrSlug === 'comp-question-bank' || initialCompetitionIdOrSlug === 'question-bank-assessment') {
    return <QuestionBankView onBackToHome={onBackToHome} />;
  }

  if (!competition) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 text-center shadow-sm" dir="rtl">
        <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F1F5F9]">المسابقة المطلوبة غير متاحة حالياً</h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 mb-5">عد للصفحة الرئيسية لتصفح المسابقات المتاحة.</p>
        <button
          onClick={onBackToHome}
          className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  const currentQ = competition.questions[currentIndex];
  const duration = getEffectiveQuestionDuration(competition, currentQ);
  const progressPercent = Math.min(100, (timeLeft / duration) * 100);

  const formatRemainingDisplay = (seconds: number) => {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s} د`;
    }
    return `${seconds} ثانية`;
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8" dir="rtl">
      
      {/* 1. WELCOME STAGE */}
      {stage === 'welcome' && (
        <div className="bg-white dark:bg-[#142238] rounded-3xl sm:rounded-[2.25rem] border-2 border-slate-200/90 dark:border-slate-700/80 p-5 sm:p-10 shadow-lg text-right space-y-6 sm:space-y-7 animate-in fade-in">
          
          {/* Navigation & Share */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#5A6E85] hover:text-[#009BB0] dark:text-[#94A3B8] dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
              <span>العودة للمسابقات</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#5A6E85] dark:text-[#94A3B8] hover:text-[#009BB0] dark:hover:text-white px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-[#F0F7FB] dark:hover:bg-[#142238] cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'تم النسخ' : 'مشاركة المسابقة'}</span>
            </button>
          </div>

          {/* Title Area */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {competition.visibility === 'private' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-xs sm:text-sm font-black">
                  <Lock className="w-3.5 h-3.5" />
                  <span>مسابقة خاصة (دخول مباشر بالرابط)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#edf7f1] dark:bg-[#1a3324] border border-[#c5e6d3] dark:border-[#274f38] text-[#1f7349] dark:text-[#6ee7b7] text-xs sm:text-sm font-bold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>متاحة للجميع</span>
                </span>
              )}

              {competition.competitionType === 'open' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#22D3EE] text-xs sm:text-sm font-black">
                  <Sparkles className="w-3.5 h-3.5 text-[#009BB0]" />
                  <span>مسابقة تدريب مفتوح (بدون ترتيب)</span>
                </span>
              ) : compTimingStatus === 'upcoming' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-[#D98218]/40 dark:border-[#D98218]/60 text-[#D98218] dark:text-[#FBBF24] text-xs sm:text-sm font-black">
                  <CalendarClock className="w-3.5 h-3.5 text-[#D98218]" />
                  <span>مسابقة مجدولة — تبدأ قريباً</span>
                </span>
              ) : compTimingStatus === 'ended' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-black">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>انتهت فترة المسابقة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#22D3EE] text-xs sm:text-sm font-black">
                  <Clock className="w-3.5 h-3.5 text-[#009BB0]" />
                  <span>جارية الآن ومتاحة للمشاركة</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9] tracking-tight">
              {competition.name}
            </h1>
            
            <p className="text-base sm:text-lg text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed max-w-2xl font-medium">
              {competition.description || 'اختبر مهاراتك ومعلوماتك، ونافس زملاءك لتحقيق أفضل توقيت وشهادة تقدير فورية.'}
            </p>
          </div>

          {/* Clean 3-Metric Strip - Large clear typography */}
          <div className="grid grid-cols-3 gap-3 p-5 bg-[#F0F7FB] dark:bg-[#0B1321] rounded-3xl border border-teal-100 dark:border-slate-800 text-center">
            <div>
              <div className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] font-bold">عدد الأسئلة</div>
              <div className="text-lg sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1">
                {competition.questions.length} سؤال
              </div>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-800">
              <div className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] font-bold">وقت كل سؤال</div>
              <div className="text-lg sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1">
                {competition.questionDuration || 30} ثانية
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] font-bold">المشرف أو الجهة</div>
              <div className="text-base sm:text-xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1 truncate px-1">
                {competition.teacherDisplayName || competition.schoolName || 'إدارة المنصة'}
              </div>
            </div>
          </div>

          {/* UPCOMING COMPETITION STATE: NOT STARTED YET */}
          {compTimingStatus === 'upcoming' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F0F7FB] dark:bg-[#0B1321] border-2 border-[#D98218]/40 dark:border-[#D98218]/60 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 border border-[#D98218]/40 dark:border-[#D98218]/70 flex items-center justify-center shrink-0 text-[#D98218] dark:text-[#FBBF24] shadow-xs">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                    موعد انطلاق المسابقة لم يحن بعد
                  </h2>
                  <p className="text-sm sm:text-base text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed font-medium">
                    هذه المسابقة محددة بجدول زمني، ولا يمكن للمشاركين الدخول للاختبار قبل الموعد. ستفتح إمكانية البدء تلقائياً فور وصول وقت الانطلاق.
                  </p>
                </div>
              </div>

              {/* Schedule Info Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold">
                <div className="flex items-center gap-2 text-[#102B4C] dark:text-[#F1F5F9]">
                  <span className="text-[#5A6E85]">⏰ موعد البدء:</span>
                  <span className="text-[#009BB0] dark:text-[#22D3EE]">{formatArabicDateTime(competition.startTime) || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#102B4C] dark:text-[#F1F5F9]">
                  <span className="text-[#5A6E85]">⌛ موعد الانتهاء:</span>
                  <span className="text-[#009BB0] dark:text-[#22D3EE]">{formatArabicDateTime(competition.endTime) || 'حسب مدة الاختبار'}</span>
                </div>
              </div>

              {/* Live Countdown Display */}
              {upcomingCountdown && (
                <div className="space-y-3 text-center">
                  <div className="text-xs sm:text-sm font-black text-[#5A6E85] dark:text-[#94A3B8]">
                    الوقت المتبقي حتى فتح قاعة المسابقة:
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto" dir="ltr">
                    <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] font-mono">
                        {String(upcomingCountdown.days).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-bold text-[#5A6E85] dark:text-[#94A3B8] mt-0.5">يوم</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] font-mono">
                        {String(upcomingCountdown.hours).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-bold text-[#5A6E85] dark:text-[#94A3B8] mt-0.5">ساعة</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] font-mono">
                        {String(upcomingCountdown.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-bold text-[#5A6E85] dark:text-[#94A3B8] mt-0.5">دقيقة</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-[#D98218]/40 dark:border-[#D98218]/60 shadow-xs bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="text-2xl sm:text-3xl font-black text-[#D98218] dark:text-[#FBBF24] font-mono animate-pulse">
                        {String(upcomingCountdown.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-bold text-[#D98218] dark:text-[#FBBF24] mt-0.5">ثانية</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#D98218] shrink-0" />
                <span>💡 نصيحة: احتفظ بهذه الصفحة أو احفظ الرابط؛ بمجرد وصول العد التنازلي للصفر، ستفتح المسابقة مباشرة دون الحاجة لتحديث الصفحة.</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] text-[#009BB0] dark:text-[#94A3B8] font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#F0F7FB] dark:hover:bg-[#142238] cursor-pointer transition-colors"
                >
                  <Share2 className="w-4 h-4 text-[#009BB0]" />
                  <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط المسابقة للمشاركة'}</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-[#009BB0] hover:bg-[#008496] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span>تصفح المسابقات المتاحة الآن</span>
                </button>
              </div>

              {/* In upcoming state for team competitions: allow forming teams before start! */}
              {competition.participationType === 'team' && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <TeamLobbyView
                    competition={competition}
                    nowTime={nowTime}
                    initialTeamCode={urlTeamCode}
                    onTeamReadyToStart={handleTeamStart}
                    onBack={onBackToHome}
                  />
                </div>
              )}
            </div>
          )}

          {/* ENDED COMPETITION STATE: TIME EXPIRED */}
          {compTimingStatus === 'ended' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F0F7FB] dark:bg-[#0B1321] border-2 border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-900 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-300 shadow-xs">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                    عفواً، لقد انتهت فترة هذه المسابقة
                  </h2>
                  <p className="text-sm sm:text-base text-[#5A6E85] dark:text-[#94A3B8] leading-relaxed font-medium">
                    انتهت الفترة الزمنية المحددة لاستقبال إجابات المشاركين لهذه المسابقة بتاريخ {formatArabicDateTime(competition.endTime)}. تم إغلاق قاعة الاختبار ورصد النتائج النهائية.
                  </p>
                </div>
              </div>

              {/* If prior attempt exists for this student */}
              {priorAttempt && (
                <div className="p-5 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-black text-[#1f7349] dark:text-[#6ee7b7]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>أنت مسجل بالفعل كمشارك باسم: {priorAttempt.name} (النتيجة: {priorAttempt.totalQuestions > 0 ? Math.round((priorAttempt.correctAnswers / priorAttempt.totalQuestions) * 100) : (priorAttempt.score <= 100 ? priorAttempt.score : 100)}%)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFinalResult(priorAttempt);
                      setStage('completed');
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Award className="w-4 h-4 text-[#00B4D8]" />
                    <span>استعراض نتيجتي وشهادة التقدير الرسمية</span>
                  </button>
                </div>
              )}

              {/* Top 5 Participants Preview / Honor Board - Only for Ranked / Timed Competitions */}
              {competition.competitionType !== 'open' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-[#102B4C] dark:text-[#F1F5F9] flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#009BB0]" />
                      <span>لوحة شرف الأوائل والترتيب النهائي للمسابقة</span>
                    </span>
                    <span className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">
                      {allCompetitionResults.length} مشاركين
                    </span>
                  </div>

                  {topResults.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238] overflow-hidden text-xs sm:text-sm">
                      {topResults.map((res, idx) => {
                        const pct = res.totalQuestions > 0
                          ? Math.round((res.correctAnswers / res.totalQuestions) * 100)
                          : (res.score <= 100 ? res.score : 100);
                        return (
                          <div key={res.id || idx} className="p-3 sm:p-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-[#F0F7FB] dark:bg-[#0B1321] flex items-center justify-center font-black text-xs text-[#009BB0] dark:text-[#00B4D8]">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </span>
                              <div>
                                <div className="font-black text-[#102B4C] dark:text-[#F1F5F9]">{res.name}</div>
                                <div className="text-[11px] text-[#5A6E85] dark:text-[#94A3B8]">{res.school}</div>
                              </div>
                            </div>
                            <div className="text-left font-black text-[#1f7349] dark:text-[#6ee7b7]">
                              <div>{pct}%</div>
                              <div className="text-[10px] text-[#5A6E85] dark:text-[#94A3B8] font-normal">{res.totalTimeSeconds?.toFixed(0)} ثانية</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-center text-xs text-[#5A6E85] dark:text-[#94A3B8]">
                      لا توجد مشاركات مسجلة في هذه المسابقة بعد.
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onBackToHome}
                className="w-full py-4 bg-[#102B4C] hover:bg-[#1A3B63] text-white font-black text-base rounded-2xl cursor-pointer transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>العودة لتصفح المسابقات المتاحة</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ACTIVE COMPETITION STATE: REGISTRATION FORM */}
          {compTimingStatus === 'active' && (
            <>
              {/* Optional Active Window Banner */}
              {competition.competitionType !== 'open' && competition.endTime && (
                <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs sm:text-sm text-teal-950 dark:text-teal-200 font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#009BB0] shrink-0" />
                    <span>المسابقة جارية ومتاحة الآن — تنتهي في: {formatArabicDateTime(competition.endTime)}</span>
                  </div>
                  <span className="font-mono text-[#009BB0] dark:text-[#22D3EE] text-xs">
                    (متبقي {getTimeRemainingText(new Date(competition.endTime).getTime(), nowTime)})
                  </span>
                </div>
              )}

              {/* Quick Notice */}
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 text-sm sm:text-base text-[#102B4C] dark:text-[#F1F5F9] font-bold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#009BB0] shrink-0" />
                <span>أدخل اسمك للبدء، وسيُحفظ إنجازك وتُصدر شهادتك فور إنهاء التحدي.</span>
              </div>

              {attemptError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{attemptError}</span>
                </div>
              )}

              {/* Entry Form */}
              {priorAttempt && competition.singleAttempt ? (
                <div className="p-6 bg-[#F0F7FB] dark:bg-[#0B1321] border border-slate-200 dark:border-slate-800 rounded-3xl text-right space-y-4">
                  <div className="flex items-center gap-2 text-[#102B4C] dark:text-[#F1F5F9] font-black text-sm sm:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>أنت مسجل بالفعل كمشارك سابق باسم: {priorAttempt.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFinalResult(priorAttempt);
                      setStage('completed');
                    }}
                    className="w-full py-4 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-base rounded-2xl cursor-pointer transition-colors shadow-md"
                  >
                    استعراض النتيجة والشهادة
                  </button>
                </div>
              ) : competition.participationType === 'team' ? (
                <div className="pt-2">
                  <TeamLobbyView
                    competition={competition}
                    nowTime={nowTime}
                    initialTeamCode={urlTeamCode}
                    onTeamReadyToStart={handleTeamStart}
                    onBack={onBackToHome}
                  />
                </div>
              ) : (
                <form onSubmit={handleStartQuiz} className="space-y-5 pt-2">
                  <div>
                    <label className="block text-sm sm:text-base font-black text-[#102B4C] dark:text-[#F1F5F9] mb-2">
                      الاسم الكامل للمشارك *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="مثال: يوسف بن خالد العتيبي"
                        className="w-full h-14 pr-12 pl-4 bg-[#F0F7FB] dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-[#102B4C] dark:text-[#F1F5F9] placeholder:text-[#5A6E85]/60 focus:outline-none focus:border-[#009BB0] focus:ring-2 focus:ring-[#009BB0]/20"
                      />
                      <User className="w-5 h-5 text-[#5A6E85] absolute right-4 top-4.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-14 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-[#009BB0]/20 cursor-pointer transition-all flex items-center justify-center gap-3"
                  >
                    <span>ابدأ الاختبار الآن</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </form>
              )}
            </>
          )}

        </div>
      )}

      {/* 2. QUIZ QUESTION STAGE */}
      {stage === 'quiz' && currentQ && (
        <div className="space-y-5">
          
          {/* Status Header */}
          <div className="bg-white dark:bg-[#142238] rounded-3xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-black text-[#009BB0] dark:text-[#00B4D8] bg-[#F0F7FB] dark:bg-[#0B1321] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                السؤال {currentIndex + 1} من {competition.questions.length}
              </span>
              <span className="text-sm sm:text-base text-[#5A6E85] dark:text-[#94A3B8] hidden sm:inline font-bold">
                {studentName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[#5A6E85] hover:text-[#009BB0] dark:hover:text-white cursor-pointer transition-colors"
                title={isSoundMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم الصوت'}
                aria-label="تبديل الصوت"
              >
                {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#009BB0]" />}
              </button>
              <Timer className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-600 animate-pulse' : 'text-[#5A6E85]'}`} />
              <span className={`font-mono text-base sm:text-lg font-black ${timeLeft <= 5 ? 'text-rose-600' : 'text-[#102B4C] dark:text-white'}`}>
                {formatRemainingDisplay(timeLeft)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-rose-500' : 'bg-[#009BB0]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {showWarningAlert && (
            <div className="fixed inset-0 z-50 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
              <div className="bg-white dark:bg-[#1E293B] border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">
                    ⚠️ تحذير أمان صارم (مخالفة {antiCheatWarnings} من 2)
                  </h3>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                    تم رصد مغادرة شاشة المسابقة أو فتح تبويب/تطبيق آخر!
                  </p>
                  <div className="text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-800 font-medium leading-relaxed">
                    ⛔ تنبيه حاسم: تكرار الخروج لمرة ثانية سيؤدي فوراً إلى إنهاء الاختبار وإلغاء ترتيبك منعاً للغش وضماناً لتكافؤ الفرص! الوقت يستمر في الحساب أثناء الغياب.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWarningAlert(false)}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm cursor-pointer transition-colors shadow-md"
                >
                  فهمت، والعودة للاختبار فوراً
                </button>
              </div>
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white dark:bg-[#142238] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-12 shadow-xl space-y-8 select-none">
            <h2 className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] leading-relaxed">
              {currentQ.text}
            </h2>

            {/* Time Expired Notice */}
            {timeExpiredAlert && (
              <div className="p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 rounded-2xl flex items-center justify-between text-rose-900 dark:text-rose-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <Timer className="w-6 h-6 text-rose-600 shrink-0 animate-pulse" />
                  <div>
                    <p className="font-black text-sm sm:text-base">انتهى الوقت المحدد لهذا السؤال!</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                      لم يتم تسجيل إجابة — جاري الانتقال للسؤال التالي تلقائياً...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerNextQuestion}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <span>التالي الآن</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Answer Options - Large & Clear Fonts */}
            <div className="space-y-4">
              {currentQ.options.map((optionText, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const hideFeedback = Boolean(competition.hideAnswersUntilEnd || (competition.competitionType && competition.competitionType !== 'open'));
                let btnStyle =
                  'bg-[#F0F7FB] hover:bg-teal-50/60 dark:bg-[#0B1321] dark:hover:bg-[#142238] border-slate-200 dark:border-slate-700 text-[#102B4C] dark:text-[#F1F5F9]';

                if (isAnswered) {
                  if (hideFeedback) {
                    if (isSelected) {
                      btnStyle =
                        'bg-teal-50 dark:bg-teal-950/40 border-[#009BB0] text-[#009BB0] dark:text-[#00B4D8] ring-2 ring-[#009BB0]/20';
                    }
                  } else {
                    if (isSelected) {
                      btnStyle =
                        optIdx === currentQ.correctIndex
                          ? 'bg-teal-50 dark:bg-teal-950/40 border-[#009BB0] text-[#009BB0] dark:text-[#00B4D8]'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-900 dark:text-rose-200';
                    } else if (optIdx === currentQ.correctIndex) {
                      btnStyle =
                        'bg-teal-50/80 dark:bg-teal-950/30 border-[#009BB0] text-[#009BB0] dark:text-[#00B4D8]';
                    }
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswered}
                    onClick={() => handleSelectAnswer(optIdx)}
                    className={`w-full p-5 sm:p-6 rounded-2xl border-2 text-right font-bold text-base sm:text-lg transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-slate-700 text-[#009BB0] dark:text-[#00B4D8] font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs">
                        {['أ', 'ب', 'ج', 'د'][optIdx] || optIdx + 1}
                      </span>
                      <span className="font-bold leading-relaxed">{optionText}</span>
                    </div>

                    {isAnswered && isSelected && (
                      hideFeedback ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 dark:text-teal-300">
                          <Check className="w-5 h-5 text-[#009BB0]" />
                          <span>تم التسجيل</span>
                        </span>
                      ) : optIdx === currentQ.correctIndex ? (
                        <CheckCircle2 className="w-6 h-6 text-[#009BB0] shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && currentQ.explanation && !Boolean(competition.hideAnswersUntilEnd || (competition.competitionType && competition.competitionType !== 'open')) && (
              <div className="p-5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl text-sm sm:text-base text-[#102B4C] dark:text-[#F1F5F9] space-y-1.5">
                <div className="font-black flex items-center gap-2 text-[#009BB0] dark:text-[#00B4D8]">
                  <Sparkles className="w-4 h-4" />
                  <span>معلومة توضيحية:</span>
                </div>
                <p className="text-[#5A6E85] dark:text-[#CBD5E1] leading-relaxed font-medium">{currentQ.explanation}</p>
              </div>
            )}

            {/* Transition Action Bar */}
            {isAnswered && (
              <div className="p-4 bg-[#F0F7FB] dark:bg-[#0B1321] rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#5A6E85] dark:text-[#94A3B8]">
                  {timeExpiredAlert ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-black">
                      <Timer className="w-4 h-4 animate-spin shrink-0" />
                      <span>انتهى الوقت — جاري الانتقال للسؤال التالي...</span>
                    </span>
                  ) : (
                    <span className="text-teal-700 dark:text-teal-300 flex items-center gap-1.5 font-black">
                      <Check className="w-4 h-4 text-[#009BB0] shrink-0" />
                      <span>تم تسجيل الإجابة بنجاح!</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={triggerNextQuestion}
                  className="px-5 py-2.5 bg-[#009BB0] hover:bg-[#008496] text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-md shadow-[#009BB0]/15 transition-transform active:scale-95 shrink-0"
                >
                  <span>{currentIndex + 1 < competition.questions.length ? 'السؤال التالي' : 'إنهاء وعرض النتيجة'}</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 3. COMPLETION STAGE */}
      {stage === 'completed' && finalResult && (() => {
        const finalPercentage = finalResult.totalQuestions > 0 
          ? Math.round((finalResult.correctAnswers / finalResult.totalQuestions) * 100) 
          : 0;
        const isEligibleForCert = finalPercentage >= 70;

        return (
          <div className="bg-white dark:bg-[#142238] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-6 sm:p-12 text-center shadow-xl space-y-8 animate-in fade-in">
            
            {finalResult.isDisqualified ? (
              <div className="p-6 sm:p-8 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto shadow-md">
                  <XCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400">
                    تم إنهاء المسابقة لعدم الالتزام بقواعد النزاهة
                  </h2>
                  <p className="text-sm sm:text-base text-rose-900 dark:text-rose-200 max-w-xl mx-auto font-bold leading-relaxed">
                    {finalResult.disqualifiedReason || 'تم رصد تكرار مغادرة شاشة المسابقة أو فتح تطبيقات وتبويبات أخرى لمرتين أثناء الاختبار. لضمان العدالة وتكافؤ الفرص بين كافة المستخدمين والمشاركين، تم إنهاء الاختبار وحجب الشهادة.'}
                  </p>
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900 font-medium">
                  تم حفظ إجاباتك حتى لحظة المخالفة الثانية، وتم إيقاف المحاولة وإلغاء الاستحقاق للشهادة والمراكز الأولى.
                </div>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#009BB0] dark:text-[#00B4D8] flex items-center justify-center mx-auto shadow-md">
                  <Trophy className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-black text-[#009BB0] dark:text-[#00B4D8] tracking-wide">
                    اكتمل التحدي بنجاح!
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-[#102B4C] dark:text-[#F1F5F9]">
                    مبارك يا {finalResult.name}!
                  </h1>
                  {finalResult.teamName && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#102B4C] dark:text-[#F1F5F9] text-xs sm:text-sm font-bold mt-1">
                      <Users className="w-4 h-4 text-[#009BB0]" />
                      <span>عضو في فريق: <strong className="font-black text-[#102B4C] dark:text-white">{finalResult.teamName}</strong> (كود: {finalResult.teamCode || '-'})</span>
                      {finalResult.isTeamLeader && <span className="bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-black">👑 قائد الفريق</span>}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Results Metric Strip - 4 Clean Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-[#F0F7FB] dark:bg-[#0B1321] rounded-3xl border border-teal-100 dark:border-slate-800 text-center">
              <div>
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">النسبة المحققة</div>
                <div className="text-2xl sm:text-3xl font-black text-[#009BB0] dark:text-[#00B4D8] mt-1 font-mono">
                  {finalPercentage}%
                </div>
              </div>

              {/* Metric 2: Open training = Accuracy Pct | Scheduled & Ended = Rank | Scheduled & Active = Pending announcement */}
              {competition.competitionType === 'open' ? (
                <div className="border-r sm:border-x border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">نسبة الدقة</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#009BB0] dark:text-[#22D3EE] mt-1 font-mono">
                    {finalPercentage}%
                  </div>
                </div>
              ) : isRankVisible ? (
                <div className="border-r sm:border-x border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الترتيب النهائي</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#009BB0] dark:text-[#22D3EE] mt-1">
                    #{actualRank}
                  </div>
                </div>
              ) : (
                <div className="border-r sm:border-x border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center">
                  <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الترتيب النهائي</div>
                  <div className="mt-1 text-[11px] sm:text-xs font-bold text-[#D98218] dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    يُعلن بعد الختام
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الإجابات الصحيحة</div>
                <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1">
                  {finalResult.correctAnswers} / {finalResult.totalQuestions}
                </div>
              </div>
              <div className="border-r border-slate-200 dark:border-slate-700">
                <div className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-bold">الوقت المستغرق</div>
                <div className="text-2xl sm:text-3xl font-black text-[#102B4C] dark:text-[#F1F5F9] mt-1">
                  {finalResult.totalTimeSeconds.toFixed(0)} ثانية
                </div>
              </div>
            </div>

            {/* Informative Guidance Banner */}
            {isRankPending && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-950 dark:text-amber-200 font-bold flex items-start gap-3 text-right">
                <Clock className="w-5 h-5 text-[#D98218] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-black">تم تسجيل إجاباتك بنجاح • إعلان الترتيب بعد ختام المسابقة</p>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/90 font-normal leading-relaxed">
                    نظراً لأن المسابقة ما زالت نشطة لاستقبال باقي المستخدمين والمشاركين حتى {formatArabicDateTime(competition.endTime) || 'موعد الإغلاق'}، فإن الترتيب النهائي ولوحة الشرف ستُعتمد وتُعلن رسمياً لجميع المشاركين فور انتهاء موعد المسابقة لضمان العدالة وتكافؤ الفرص.
                  </p>
                </div>
              </div>
            )}

            {competition.competitionType === 'open' && (
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs sm:text-sm text-[#102B4C] dark:text-[#F1F5F9] font-bold flex items-center gap-3 text-right">
                <Sparkles className="w-5 h-5 text-[#009BB0] shrink-0" />
                <p className="text-xs text-[#5A6E85] dark:text-[#94A3B8] font-normal leading-relaxed">
                  هذا التحدي مخصص للتدريب المفتوح وتنمية المهارات الذاتية؛ يتم احتساب نتيجتك وإصدار شهادتك دون ترتيب تنافسي بين المستخدمين.
                </p>
              </div>
            )}

            {/* Official Certificate Banner - RESTRICTED ONLY TO HIGH ACHIEVERS (>= 70%) AND NOT DISQUALIFIED */}
            {!finalResult.isDisqualified && competition.certificateEnabled && (
              isEligibleForCert ? (
                <div className="p-7 bg-teal-50/50 dark:bg-[#142238] rounded-3xl border-2 border-[#009BB0]/40 dark:border-teal-700/80 space-y-4">
                  <div className="flex items-center justify-center gap-2.5 text-[#102B4C] dark:text-[#F1F5F9] font-black text-base sm:text-lg">
                    <Award className="w-6 h-6 text-[#009BB0]" />
                    <span>مبارك! حققت نسبة تفوق باهرة ({finalPercentage}%) واستحققت شهادة التميز والتقدير</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8]">
                    {competition.competitionType === 'open'
                      ? 'شهادتك جاهزة الآن متضمنة اسمك ونسبتك المحققة برعاية إدارة المنصة.'
                      : isRankVisible
                      ? `شهادتك جاهزة الآن متضمنة اسمك ونسبتك وترتيبك النهائي (المركز #${actualRank}) برعاية إدارة المنصة.`
                      : 'شهادتك جاهزة الآن متضمنة اسمك ونسبتك المحققة برعاية إدارة المنصة.'}
                  </p>
                  <button
                    onClick={() => setIsCertModalOpen(true)}
                    className="w-full sm:w-auto px-8 py-4 bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-[#009BB0]/20 cursor-pointer transition-all flex items-center justify-center gap-2.5 mx-auto"
                  >
                    <Award className="w-5 h-5 text-[#00B4D8]" />
                    <span>عرض وتحميل شهادة الشكر والتقدير ({finalPercentage}%)</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-[#F0F7FB] dark:bg-[#0B1321] rounded-3xl border border-teal-100 dark:border-slate-800 text-center space-y-2">
                  <div className="text-sm font-black text-[#009BB0] dark:text-[#00B4D8] flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D98218]" />
                    <span>الشهادات مخصصة للمتفوقين فقط</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5A6E85] dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                    {competition.competitionType === 'open'
                      ? `تُمنح شهادة التميز والتفوق للمشاركين الحاصلين على نسبة 70% فما فوق (نسبتك الحالية: ${finalPercentage}%). يمكنك إعادة المحاولة في أي وقت لرفع مستواك والحصول على الشهادة!`
                      : isRankVisible
                      ? `تُمنح شهادة التميز والتفوق حصرياً للمشاركين الحاصلين على نسبة 70% فما فوق (نسبتك الحالية: ${finalPercentage}% • ترتيبك النهائي: #${actualRank}). استمر في التدرب والمحاولة في المسابقات القادمة!`
                      : `تُمنح شهادة التميز والتفوق للمشاركين الحاصلين على نسبة 70% فما فوق (نسبتك الحالية: ${finalPercentage}% • سيُعلن الترتيب بعد ختام المسابقة).`}
                  </p>
                </div>
              )
            )}

            {/* Answer Review Section */}
            {(!competition.hideAnswersUntilEnd || compTimingStatus === 'ended') ? (
              <div className="text-right border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-[#F0F7FB] dark:bg-[#0B1321]">
                <button
                  type="button"
                  onClick={() => setShowAnswerReview(prev => !prev)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between font-black text-sm sm:text-base text-[#102B4C] dark:text-[#F1F5F9] hover:bg-teal-50/50 dark:hover:bg-[#142238] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-[#009BB0]" />
                    <span>مراجعة تفاصيل الأسئلة والحلول النموذجية</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">
                    <span>{showAnswerReview ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAnswerReview ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {showAnswerReview && (
                  <div className="p-4 sm:p-6 space-y-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#142238]">
                    {competition.questions.map((q, qIdx) => {
                      const ans = finalResult.answers?.find(a => a.questionId === q.id);
                      const selectedIdx = ans?.selectedIndex;
                      const isCorrect = ans?.isCorrect ?? false;
                      return (
                        <div
                          key={q.id || qIdx}
                          className={`p-4 sm:p-5 rounded-2xl border ${
                            isCorrect
                              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
                          } space-y-3`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-[#F0F7FB] dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs shrink-0 text-[#009BB0] dark:text-[#00B4D8]">
                                {qIdx + 1}
                              </span>
                              <h4 className="font-black text-sm sm:text-base text-[#102B4C] dark:text-[#F1F5F9] leading-relaxed">
                                {q.text}
                              </h4>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                              }`}
                            >
                              {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              <span>{isCorrect ? 'صحيحة' : 'غير صحيحة'}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold pt-1">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700">
                              <span className="text-[#5A6E85] dark:text-[#94A3B8] ml-1">إجابتك:</span>
                              <span className={isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                {selectedIdx !== undefined && selectedIdx >= 0 ? q.options[selectedIdx] : 'لم تتم الإجابة (انتهى الوقت)'}
                              </span>
                            </div>
                            {!isCorrect && (
                              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                                <span className="text-emerald-900/70 dark:text-emerald-400/80 ml-1">الإجابة النموذجية:</span>
                                <span className="font-black">{q.options[q.correctIndex]}</span>
                              </div>
                            )}
                          </div>

                          {q.explanation && (
                            <div className="p-3 rounded-xl bg-[#F0F7FB] dark:bg-[#0B1321] border border-slate-200 dark:border-slate-700 text-xs text-[#5A6E85] dark:text-[#94A3B8] flex items-start gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-[#D98218] shrink-0 mt-0.5" />
                              <p className="leading-relaxed"><strong>توضيح:</strong> {q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-[#D98218] shrink-0" />
                <span>حُجبت الإجابات النموذجية مؤقتاً بأمر من منسق المسابقة لحين انتهاء التوقيت العام للمسابقة لضمان تكافؤ الفرص.</span>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onBackToHome}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[#5A6E85] dark:text-[#94A3B8] hover:bg-[#F0F7FB] dark:hover:bg-[#142238] font-black text-sm cursor-pointer transition-colors"
              >
                العودة للمسابقات
              </button>
              {!competition.singleAttempt && (
                <button
                  onClick={() => {
                    setStage('welcome');
                    setStudentName('');
                  }}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#009BB0] hover:bg-[#008496] text-white font-black text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة المحاولة</span>
                </button>
              )}
            </div>

          </div>
        );
      })()}

      {competition && finalResult && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          studentName={finalResult.name}
          teacherName={competition.teacherDisplayName}
          schoolName={finalResult.school || competition.schoolName}
          competitionTitle={competition.name}
          score={finalResult.totalQuestions > 0 ? Math.round((finalResult.correctAnswers / finalResult.totalQuestions) * 100) : 0}
          rank={isRankVisible ? actualRank : undefined}
          teamName={finalResult.teamName || activeTeam?.name || undefined}
          isManual={false}
        />
      )}

    </div>
  );
};
