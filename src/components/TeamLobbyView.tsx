import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Key, 
  Share2, 
  Check, 
  Copy, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  Crown, 
  ArrowLeft, 
  Sparkles,
  MessageCircle,
  Send,
  Building,
  UserCheck
} from 'lucide-react';
import { Competition, CompetitionTeam } from '../types';
import { StorageService } from '../services/storageService';

interface TeamLobbyViewProps {
  competition: Competition;
  nowTime: number;
  initialTeamCode?: string;
  onTeamReadyToStart: (team: CompetitionTeam, participantName: string) => void;
  onBack: () => void;
}

export const TeamLobbyView: React.FC<TeamLobbyViewProps> = ({
  competition,
  nowTime,
  initialTeamCode,
  onTeamReadyToStart,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>(initialTeamCode ? 'join' : 'join');
  
  // Create Form State
  const [leaderName, setLeaderName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamSchool, setTeamSchool] = useState(competition.schoolName || '');
  const [allowPublic, setAllowPublic] = useState(true);

  // Join Form State
  const [joinCode, setJoinCode] = useState(initialTeamCode || '');
  const [joinParticipantName, setJoinParticipantName] = useState('');
  const [joinSchool, setJoinSchool] = useState('');

  // Active Team Lobby State
  const [currentTeam, setCurrentTeam] = useState<CompetitionTeam | null>(null);
  const [currentMemberName, setCurrentMemberName] = useState<string>('');
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Available teams in the competition
  const [availableTeams, setAvailableTeams] = useState<CompetitionTeam[]>([]);

  // Refresh and sync teams
  const refreshTeams = () => {
    const result = StorageService.checkAndPruneTeams(competition.id, competition.startTime, competition.competitionType);
    setAvailableTeams(result.teams);

    if (currentTeam) {
      const updated = result.teams.find(t => t.id === currentTeam.id || t.code === currentTeam.code);
      if (updated) {
        // Check if member is still in the team
        const isStillMember = updated.members.some(m => m.id === currentMemberId);
        if (isStillMember) {
          setCurrentTeam(updated);
        } else {
          setCurrentTeam(null);
          setCurrentMemberName('');
          setCurrentMemberId('');
          StorageService.clearUserTeamSession(competition.id);
        }
      } else {
        // Team was deleted / pruned
        setCurrentTeam(null);
        setCurrentMemberName('');
        setCurrentMemberId('');
        StorageService.clearUserTeamSession(competition.id);
      }
    }
  };

  // Restore saved team session on initial load or competition change
  useEffect(() => {
    const session = StorageService.getUserTeamSession(competition.id);
    if (session && session.teamCode && session.memberName && session.memberId) {
      const teams = StorageService.getTeams(competition.id);
      const match = teams.find(t => t.code === session.teamCode);
      if (match) {
        const isMember = match.members.some(m => m.id === session.memberId);
        if (isMember) {
          setCurrentTeam(match);
          setCurrentMemberName(session.memberName);
          setCurrentMemberId(session.memberId);
        } else {
          StorageService.clearUserTeamSession(competition.id);
        }
      } else {
        StorageService.clearUserTeamSession(competition.id);
      }
    }
  }, [competition.id]);

  useEffect(() => {
    refreshTeams();
    const interval = setInterval(refreshTeams, 2000);
    const handleStorage = () => refreshTeams();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('storage_update', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('storage_update', handleStorage);
    };
  }, [competition.id, currentMemberId]);

  // Open teams looking for members
  const openIncompleteTeams = useMemo(() => {
    return availableTeams.filter(t => 
      t.allowPublicJoin && 
      t.members.length < (t.maxMembers || 4) && 
      t.status !== 'disqualified'
    );
  }, [availableTeams]);

  // Cutoff calculation (5 minutes before startTime for scheduled competitions)
  const cutoffInfo = useMemo(() => {
    if (competition.competitionType === 'open') return null;
    if (!competition.startTime) return null;

    const startMs = new Date(competition.startTime).getTime();
    if (isNaN(startMs)) return null;

    const cutoffMs = startMs - 5 * 60 * 1000;
    const isPastStart = nowTime >= startMs;
    const isBeforeCutoff = nowTime < cutoffMs;
    const isInFreezeWindow = nowTime >= cutoffMs && !isPastStart;
    const isRegistrationLocked = nowTime >= cutoffMs;

    const diffToCutoff = cutoffMs - nowTime;
    const minutesRemaining = Math.max(0, Math.ceil(diffToCutoff / 60000));

    return {
      cutoffMs,
      startMs,
      isBeforeCutoff,
      isInFreezeWindow,
      isPastStart,
      isRegistrationLocked,
      minutesRemaining,
      formattedCutoff: new Date(cutoffMs).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      formattedStart: new Date(startMs).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };
  }, [competition.competitionType, competition.startTime, nowTime]);

  // Handle Team Creation
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!leaderName.trim()) {
      setErrorMessage('يرجى إدخال اسمك الكامل.');
      return;
    }
    if (!newTeamName.trim()) {
      setErrorMessage('يرجى كتابة اسم الفريق.');
      return;
    }

    if (cutoffInfo?.isRegistrationLocked) {
      setErrorMessage(
        cutoffInfo.isPastStart
          ? 'عفواً، لقد انطلقت المسابقة بالفعل وتم إغلاق استقبال وتعديل الفرق.'
          : 'عفواً، تم إغلاق استقبال وتعديل الفرق لدخول مهلة الـ 5 دقائق المحددة قبل انطلاق المسابقة.'
      );
      return;
    }

    const res = StorageService.createTeam({
      competitionId: competition.id,
      name: newTeamName.trim(),
      leaderName: leaderName.trim(),
      school: teamSchool.trim() || competition.schoolName,
      allowPublicJoin: allowPublic,
      minMembers: 2,
      maxMembers: 4
    });

    if (res.success && res.team) {
      setCurrentTeam(res.team);
      setCurrentMemberName(leaderName.trim());
      setCurrentMemberId(res.team.leaderId || res.team.members[0].id);
      StorageService.saveUserTeamSession(competition.id, {
        teamCode: res.team.code,
        memberName: leaderName.trim(),
        memberId: res.team.leaderId || res.team.members[0].id,
        teamId: res.team.id
      });
      refreshTeams();
    } else {
      setErrorMessage(res.error || 'فشل إنشاء الفريق، يرجى المحاولة مرة أخرى.');
    }
  };

  // Handle Leaving Team
  const handleLeaveTeam = () => {
    if (!currentTeam || !currentMemberName) {
      setCurrentTeam(null);
      StorageService.clearUserTeamSession(competition.id);
      return;
    }

    const res = StorageService.leaveTeam(competition.id, currentTeam.code, currentMemberId);
    if (res.success) {
      setCurrentTeam(null);
      setCurrentMemberName('');
      setCurrentMemberId('');
      StorageService.clearUserTeamSession(competition.id);
      refreshTeams();
    } else {
      setErrorMessage(res.error || 'تعذر مغادرة الفريق.');
    }
  };

  // Handle Leader Removing Member
  const handleRemoveMember = (memberNameToRemove: string) => {
    if (!currentTeam) return;
    const target = currentTeam.members.find(m => m.name === memberNameToRemove);
    if (!target) return;
    const res = StorageService.removeTeamMember(competition.id, currentTeam.code, target.id, currentMemberId);
    if (res.success && res.updatedTeam) {
      setCurrentTeam(res.updatedTeam);
      refreshTeams();
    } else {
      setErrorMessage(res.error || 'تعذر استبعاد العضو.');
    }
  };

  // Handle Toggle Public Join
  const handleTogglePublicJoin = () => {
    if (!currentTeam) return;
    const res = StorageService.toggleTeamPublicJoin(competition.id, currentTeam.code, currentMemberId);
    if (res.success && res.team) {
      setCurrentTeam(res.team);
      refreshTeams();
    }
  };

  // Handle Team Joining
  const handleJoinTeam = (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const targetCode = overrideCode || joinCode;
    const cleanCode = targetCode.trim();

    if (!/^\d{4}$/.test(cleanCode)) {
      setErrorMessage('يرجى إدخال كود فريق صحيح مكون من 4 أرقام.');
      return;
    }
    if (!joinParticipantName.trim()) {
      setErrorMessage('يرجى إدخال اسمك الكامل للإنضمام.');
      return;
    }

    if (cutoffInfo?.isRegistrationLocked) {
      setErrorMessage(
        cutoffInfo.isPastStart
          ? 'عفواً، لقد انطلقت المسابقة بالفعل وتم إغلاق وقفل تشكيلة الفرق نهائياً.'
          : 'عفواً، تم إغلاق الانضمام للفرق لدخول مهلة الـ 5 دقائق المحددة قبل انطلاق المسابقة.'
      );
      return;
    }

    const res = StorageService.joinTeam(competition.id, cleanCode, {
      name: joinParticipantName.trim(),
      school: joinSchool.trim() || competition.schoolName
    });

    if (res.success && res.team) {
      setCurrentTeam(res.team);
      setCurrentMemberName(joinParticipantName.trim());
      const member = res.team.members.find(m => m.name.trim().toLowerCase() === joinParticipantName.trim().toLowerCase());
      if (!member) {
        setErrorMessage('تعذر تثبيت هوية العضو، يرجى إعادة الانضمام.');
        return;
      }
      setCurrentMemberId(member.id);
      StorageService.saveUserTeamSession(competition.id, {
        teamCode: cleanCode,
        memberName: joinParticipantName.trim(),
        memberId: member.id,
        teamId: res.team.id
      });
      refreshTeams();
    } else {
      setErrorMessage(res.error || 'فشل الانضمام للفريق.');
    }
  };

  // Share link generator
  const shareLink = useMemo(() => {
    if (!currentTeam) return '';
    const origin = window.location.origin;
    const slug = competition.webSlug || competition.id;
    return `${origin}/?quiz=${encodeURIComponent(slug)}&teamCode=${currentTeam.code}`;
  }, [currentTeam, competition]);

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleCopyCode = () => {
    if (!currentTeam) return;
    navigator.clipboard.writeText(currentTeam.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const shareViaWhatsApp = () => {
    if (!currentTeam) return;
    const text = `انضم لفريقي "${currentTeam.name}" في مسابقة "${competition.name}" عبر منصة تَنافُسْ!\nكود الفريق المكون من 4 أرقام: ${currentTeam.code}\nالرابط المباشر:\n${shareLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
    }
  };

  const shareViaTelegram = () => {
    if (!currentTeam) return;
    const text = `انضم لفريقي "${currentTeam.name}" في مسابقة "${competition.name}" عبر منصة تَنافُسْ!\nكود الفريق: ${currentTeam.code}\nرابط الانضمام:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      navigator.clipboard.writeText(`${text}\n${shareLink}`).catch(() => {});
    }
  };

  if (currentTeam) {
    const isLeader = currentTeam.leaderId === currentMemberId;
    const isDisqualified = currentTeam.status === 'disqualified';
    const isFull = currentTeam.members.length >= (currentTeam.maxMembers || 4);
    const hasMin = currentTeam.members.length >= (currentTeam.minMembers || 2);
    const isWaitingForStartTime = competition.competitionType !== 'open' && Boolean(competition.startTime) && nowTime < new Date(competition.startTime).getTime();
    const canStartCompetition = !isDisqualified && hasMin && !isWaitingForStartTime;

    return (
      <div className="space-y-5 animate-in fade-in" dir="rtl">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">قاعة انتظار الفريق</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                  <UserCheck className="w-3 h-3" />
                  <span>أنت مسجل كـ {currentMemberName}</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-[#F1F5F9] tracking-tight">{currentTeam.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLeader && (
              <button
                type="button"
                onClick={handleTogglePublicJoin}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  currentTeam.allowPublicJoin 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                }`}
                title="تحديد إمكانية ظهور الفريق في قائمة الفرق المفتوحة للجميع"
              >
                {currentTeam.allowPublicJoin ? '🔓 متاح للانضمام العام' : '🔒 خاص بالكود فقط'}
              </button>
            )}

            <button
              type="button"
              onClick={handleLeaveTeam}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 cursor-pointer transition-colors"
            >
              {isLeader ? 'مغادرة / حل الفريق' : 'مغادرة الفريق'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 font-bold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="underline cursor-pointer">إغلاق</button>
          </div>
        )}

        {/* Sleek Horizontal Code & Share Hero */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/60 dark:from-[#1E293B] dark:via-[#1E293B] dark:to-[#1E293B] rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="text-center sm:text-right">
              <div className="text-[11px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                كود الانضمام المباشر (4 أرقام)
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                شارك الكود مع زملائك للانضمام فوراً
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-[#0F172A] dark:text-white px-4 py-1.5 bg-white dark:bg-[#1c1612] rounded-xl border border-amber-300/80 dark:border-amber-700/80 shadow-2xs select-all">
                {currentTeam.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-transform active:scale-95"
                title="نسخ كود الفريق"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span className="text-xs">{copiedCode ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F0F9FF] dark:hover:bg-[#1E293B] text-[#0EA5E9] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ الرابط'}</span>
            </button>

            <button
              type="button"
              onClick={shareViaWhatsApp}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>

            <button
              type="button"
              onClick={shareViaTelegram}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>تليجرام</span>
            </button>
          </div>
        </div>

        {/* Qualification & Timing Status Banner */}
        {isDisqualified ? (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-rose-900 dark:text-rose-200 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black">⛔ تم استبعاد الفريق لعدم اكتمال النصاب (عضوان على الأقل) قبل مهلة الـ 5 دقائق.</div>
            </div>
          </div>
        ) : cutoffInfo?.isInFreezeWindow ? (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black">🔒 الفريق مؤهل وجاهز وتم تثبيت التشكيلة</div>
              <div className="font-normal text-[11px] text-emerald-800 dark:text-emerald-300">
                يستعد الفريق للانطلاق تلقائياً فور حلول وقت المسابقة ({cutoffInfo.formattedStart}).
              </div>
            </div>
          </div>
        ) : hasMin ? (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black">✅ الفريق مستوفٍ للشروط ومؤهل رسمياً ({currentTeam.members.length} أعضاء).</div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black">⚠️ قيد التشكيل: يلزم انضمام عضو آخر على الأقل للتأهيل</div>
              <div className="font-normal text-[11px] text-amber-800 dark:text-amber-300">
                {competition.competitionType !== 'open' && cutoffInfo
                  ? `يجب اكتمال النصاب قبل مهلة الـ 5 دقائق (${cutoffInfo.formattedCutoff}). شارك كود الفريق مع زملائك للانضمام.`
                  : 'يلزم انضمام زميل آخر على الأقل حتى يصبح الفريق مؤهلاً ويبدأ الاختبار.'}
              </div>
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span>أعضاء الفريق ({currentTeam.members.length} من {currentTeam.maxMembers || 4})</span>
            </span>
            <span className="text-[#64748B] dark:text-[#94A3B8] text-xs font-medium">
              {isFull ? 'الفريق كامل' : `متبقي ${(currentTeam.maxMembers || 4) - currentTeam.members.length} مقاعد`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentTeam.members.map((member, idx) => (
              <div
                key={member.id || idx}
                className="p-3 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    member.isLeader 
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300' 
                      : 'bg-white dark:bg-[#332820] text-[#64748B] dark:text-[#94A3B8]'
                  }`}>
                    {member.isLeader ? <Crown className="w-3.5 h-3.5 text-amber-600" /> : idx + 1}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {member.name.trim().toLowerCase() === currentMemberName.trim().toLowerCase() && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                          أنت
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {member.isLeader ? 'رئيس ومؤسس الفريق' : 'عضو مشارك'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-[#94A3B8] font-mono">
                    {new Date(member.joinedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {isLeader && !member.isLeader && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.name)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="استبعاد هذا العضو من الفريق"
                    >
                      استبعاد
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enter Quiz Button */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <button
            type="button"
            disabled={!canStartCompetition}
            onClick={() => onTeamReadyToStart(currentTeam, currentMemberName)}
            className={`w-full py-3.5 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all ${
              canStartCompetition
                ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isWaitingForStartTime ? (
              <span>⏳ في انتظار موعد انطلاق المسابقة ({cutoffInfo?.formattedStart || 'قريباً'})...</span>
            ) : (
              <span>دخول المسابقة كفريق ({currentTeam.code})</span>
            )}
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isWaitingForStartTime && (
            <p className="text-center text-[11px] text-amber-800 dark:text-amber-300 font-bold">
              * فريقك مؤهل وجاهز! سيتم تفعيل زر الدخول تلقائياً فور حلول وقت انطلاق المسابقة.
            </p>
          )}

          {!hasMin && !isWaitingForStartTime && (
            <p className="text-center text-[11px] text-amber-800 dark:text-amber-300 font-bold">
              * يلزم انضمام عضو آخر على الأقل لتفعيل زر الدخول للمسابقة.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in" dir="rtl">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">نظام التنافس الجماعي والفرق</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">انضم لفريق زميلك بالكود أو شكّل فريقك الخاص</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          رجوع
        </button>
      </div>

      {/* 5-Min Cutoff Notice if active */}
      {cutoffInfo && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold border ${
          cutoffInfo.isRegistrationLocked
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <Clock className="w-4 h-4 shrink-0" />
          {cutoffInfo.isInFreezeWindow ? (
            <span>⛔ تم إغلاق استقبال وتعديل الفرق لدخول مهلة الـ 5 دقائق قبل انطلاق المسابقة ({cutoffInfo.formattedStart}). الفرق المؤهلة تستعد للبدء الآن.</span>
          ) : cutoffInfo.isPastStart ? (
            <span>🔒 المسابقة انطلقت بالفعل! تم إغلاق التسجيل وتثبيت الفرق نهائياً.</span>
          ) : (
            <span>⏰ تكوين الفرق متاح الآن — يتوقف الاستقبال وتثبيت الفرق قبل الانطلاق بـ 5 دقائق (الساعة {cutoffInfo.formattedCutoff}).</span>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs sm:text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modern Segmented Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-[#F0F9FF] dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => { setActiveTab('join'); setErrorMessage(null); }}
          className={`py-2.5 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'join'
              ? 'bg-[#0EA5E9] text-white shadow-xs'
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>الانضمام لفريق (كود 4 أرقام)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('create'); setErrorMessage(null); }}
          className={`py-2.5 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-[#0EA5E9] text-white shadow-xs'
              : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>تكوين فريق جديد</span>
        </button>
      </div>

      {/* TAB 1: JOIN TEAM */}
      {activeTab === 'join' && (
        <div className="space-y-4">
          <form onSubmit={(e) => handleJoinTeam(e)} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  كود الفريق (4 أرقام) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={joinCode}
                    disabled={cutoffInfo?.isRegistrationLocked}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="مثال: 4829"
                    className="w-full h-12 pr-10 pl-3 text-center font-mono text-xl font-black tracking-widest bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <Key className="w-4 h-4 text-[#64748B] absolute right-3.5 top-4" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  اسمك الكامل للمشاركة *
                </label>
                <input
                  type="text"
                  required
                  value={joinParticipantName}
                  disabled={cutoffInfo?.isRegistrationLocked}
                  onChange={(e) => setJoinParticipantName(e.target.value)}
                  placeholder="مثال: عبد الرحمن محمد"
                  className="w-full h-12 px-3.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cutoffInfo?.isRegistrationLocked}
              className={`w-full h-12 font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                cutoffInfo?.isRegistrationLocked
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white cursor-pointer'
              }`}
            >
              <span>{cutoffInfo?.isRegistrationLocked ? 'تم إغلاق الانضمام للفرق' : 'انضمام لهذا الفريق'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>

          {/* Open Incomplete Teams */}
          {openIncompleteTeams.length > 0 && !cutoffInfo?.isRegistrationLocked && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center justify-between">
                <span>فرق متاحة للانضمام المباشر:</span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">مفتوحة للجميع</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {openIncompleteTeams.map(t => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">{t.name}</div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        القائد: {t.leaderName} • {t.members.length}/{t.maxMembers || 4} أعضاء
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setJoinCode(t.code);
                        if (joinParticipantName.trim()) {
                          handleJoinTeam(undefined, t.code);
                        } else {
                          setErrorMessage('يرجى كتابة اسمك الكامل أولاً ثم الضغط على انضمام.');
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      انضمام ({t.code})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE TEAM */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateTeam} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                اسمك الكامل (رئيس الفريق) *
              </label>
              <input
                type="text"
                required
                value={leaderName}
                disabled={cutoffInfo?.isRegistrationLocked}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="مثال: خالد عبد العزيز"
                className="w-full h-12 px-3.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                اسم الفريق *
              </label>
              <input
                type="text"
                required
                value={newTeamName}
                disabled={cutoffInfo?.isRegistrationLocked}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="مثال: رواد التميز والابتكار"
                className="w-full h-12 px-3.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
            <div>
              <label className="block text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                المدرسة أو الجهة
              </label>
              <input
                type="text"
                value={teamSchool}
                disabled={cutoffInfo?.isRegistrationLocked}
                onChange={(e) => setTeamSchool(e.target.value)}
                placeholder="اسم مدرستك أو جهتك"
                className="w-full h-12 px-3.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Allow Public Join Toggle */}
            <div className="p-2.5 bg-[#F0F9FF] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between mt-auto">
              <div>
                <div className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  إتاحة الفريق للعامة
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  السماح للآخرين بالانضمام إذا شغر مكان
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowPublic}
                disabled={cutoffInfo?.isRegistrationLocked}
                onChange={(e) => setAllowPublic(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200">
            💡 سيتم إصدار <strong>كود خاص من 4 أرقام</strong> ورابط دعوة مباشر لفريقك لمشاركته مع زملائك.
          </div>

          <button
            type="submit"
            disabled={cutoffInfo?.isRegistrationLocked}
            className={`w-full h-12 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
              cutoffInfo?.isRegistrationLocked
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white cursor-pointer'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{cutoffInfo?.isRegistrationLocked ? 'تم إغلاق إنشاء الفرق' : 'تكوين الفريق واستلام الكود'}</span>
          </button>
        </form>
      )}

    </div>
  );
};
