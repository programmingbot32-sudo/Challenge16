export type CompetitionSource = 'platform' | 'teacher';
export type QuestionType = 'manual' | 'ai';
export type ParticipationType = 'individual' | 'team';
export type CompetitionStatus = 'active' | 'upcoming' | 'ended';
export type CompetitionType = 'live' | 'windowed' | 'open';

export interface Question {
  id: string;
  competitionId?: string;
  text: string;
  options: string[];
  correctIndex: number;
  orderIndex?: number;
  duration: number;
  explanation?: string;
  category?: string;
}

export interface AccessCode {
  id: string;
  code: string;
  teacherDisplayName: string;
  school: string;
  maxCompetitions: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  isTrial?: boolean;
  isUnlimited?: boolean;
}

export type CompetitionVisibility = 'public' | 'private';

export interface Competition {
  id: string;
  webSlug: string;
  name: string;
  description: string;
  source: CompetitionSource;
  teacherCodeId?: string;
  teacherDisplayName: string;
  schoolName: string;
  questionType: QuestionType;
  participationType: ParticipationType;
  competitionType: CompetitionType;
  visibility?: CompetitionVisibility; // 'public': تظهر للجميع وبوت تليجرام | 'private': برابط مباشر فقط
  examDurationMinutes?: number;
  startTime: string;
  endTime: string;
  singleAttempt?: boolean;
  hideAnswersUntilEnd?: boolean;
  questionDuration: number;
  winnersCount: number;
  rewardType: string;
  certificateEnabled: boolean;
  status: CompetitionStatus;
  questions: Question[];
  createdAt: string;
  url?: string; // الرابط الكامل المباشر للمسابقة
  baseUrl?: string; // النطاق الأساسي
  isQuestionBank?: boolean; // بنك أسئلة وتقييم ذاتي فوري بدون اسم أو شهادة
  antiCheatEnabled?: boolean;
  showLeaderboardToStudents?: boolean;
  autoBroadcastTelegram?: boolean; // نشر إعلان المسابقة تلقائياً في تليجرام عند الإنشاء
  autoNotifyStartTelegram?: boolean; // إرسال تنبيه عند انطلاق المسابقة في تليجرام
  autoBroadcastResultsTelegram?: boolean; // نشر الفائزين تلقائياً في تليجرام بعد انتهاء المسابقة
  targetTelegramGroups?: string[]; // تحديد جروبات مخصصة لهذه المسابقة (إذا لم تحدد يتم الإرسال لجميع الجروبات)
  notifiedStartTelegram?: boolean; // تم إرسال تنبيه انطلاق المسابقة
  notifiedResultsTelegram?: boolean; // تم إرسال لوحة الفائزين النهائية
  notifiedPublishTelegram?: boolean; // تم إرسال إعلان المسابقة عند النشر
}

export interface TelegramGroupItem {
  id: string; // Chat ID e.g. -1001234567890
  name: string; // اسم الجروب أو المدرسة
  category?: string; // التصنيف مثل: مرحلة ثانوية، مرحلة متوسطة، نادي موهبة، عام
  type?: string; // supergroup, group, channel
  username?: string;
  memberCount?: number;
  addedAt?: string;
}

export interface QuestionBankDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  defaultQuestionCount: number;
  defaultTimePerQuestion: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BankQuestion {
  id: string;
  domainId: string;
  domainName?: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  duration: number;
  difficulty?: 'سهل' | 'متوسط' | 'متقدم';
  createdAt: string;
}

export interface TelegramBotSettings {
  botToken: string;
  botUsername?: string;
  botFirstName?: string;
  isConnected: boolean;
  autoBroadcastNew: boolean; // إرسال المسابقات الجديدة تلقائياً للجروبات
  autoBroadcastResults: boolean; // إرسال النتائج واللوحة تلقائياً للجروبات
  targetGroups: string[]; // قائمة معرفات الجروبات أو القنوات
  groupsList?: TelegramGroupItem[]; // تفاصيل الجروبات بالأسماء والتصنيفات
  welcomeMessage?: string;
  platformBaseUrl?: string; // رابط المنصة الأساسي المستخدم في أزرار تليجرام
}

export interface Participant {
  id: string;
  competitionId: string;
  name: string;
  school: string;
  teamId?: string;
  teamName?: string;
  teamCode?: string;
  memberId?: string;
  isTeamLeader?: boolean;
  sessionToken: string;
  joinedAt: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  rank?: number;
  submittedAt?: string;
  isDisqualified?: boolean;
  disqualifiedReason?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  school?: string;
  isLeader: boolean;
  isVirtual?: boolean;
  joinedAt: string;
}

export interface CompetitionTeam {
  id: string;
  competitionId: string;
  name: string;
  code: string; // 4-digit code e.g. "4829"
  leaderName: string;
  leaderId?: string;
  school?: string;
  members: TeamMember[];
  maxMembers: number; // e.g. 4
  minMembers: number; // e.g. 2 or 3
  allowPublicJoin: boolean; // عرض الفريق للعامة إذا لم يكتمل
  status: 'forming' | 'ready' | 'locked' | 'disqualified';
  createdAt: string;
}

export interface ParticipantAnswer {
  id?: string;
  participantId: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeTaken: number;
  answeredAt: string;
}

export interface ParticipantResult extends Participant {
  competitionName?: string;
  answers?: ParticipantAnswer[];
}

export interface TeamResult {
  id: string;
  competitionId: string;
  teamName: string;
  school: string;
  membersCount: number;
  totalScore: number;
  averageScore: number;
  totalTimeSeconds: number;
  averageTime: number;
  rank?: number;
  members: Participant[];
}

export interface ManualCertificate {
  id: string;
  studentName: string;
  titleOrReason: string;
  teacherName: string;
  schoolName: string;
  date: string;
}
