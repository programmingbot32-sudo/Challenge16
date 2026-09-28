import type { Competition, AccessCode, Participant, ParticipantAnswer, ManualCertificate, CompetitionTeam, QuestionBankDomain, BankQuestion } from '../types/index.ts';

export const INITIAL_ACCESS_CODES: AccessCode[] = [
  {
    id: 'code-trial-library',
    code: 'مكتبة المعلمين',
    teacherDisplayName: 'مكتبة المعلمين',
    school: 'مكتبة المعلمين',
    maxCompetitions: 999999, // مفتوح بدون عدد محدد
    usedCount: 0,
    expiresAt: '2099-12-31',
    isActive: true,
    isTrial: true,
    isUnlimited: true,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'code-demo',
    code: 'TCHR-DEMO',
    teacherDisplayName: 'مكتبة المعلمين (تجريبي)',
    school: 'منصة تَنافُسْ التعليمية',
    maxCompetitions: 999999,
    usedCount: 0,
    expiresAt: '2099-12-31',
    isActive: true,
    isTrial: true,
    isUnlimited: true,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'code-t68999',
    code: 'T68999',
    teacherDisplayName: 'أ. فهد بن عبدالعزيز السبيعي',
    school: 'ثانوية الأمير نايف بالرياض',
    maxCompetitions: 10,
    usedCount: 2,
    expiresAt: '2026-12-31',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'code-t57899',
    code: 'T57899',
    teacherDisplayName: 'أ. نورة بنت سالم الحربي',
    school: 'متوسطة دار الحنان بجدة',
    maxCompetitions: 5,
    usedCount: 1,
    expiresAt: '2026-11-30',
    isActive: true,
    createdAt: '2026-09-10T10:00:00Z'
  },
  {
    id: 'code-1',
    code: 'TCHR-7F2K9X',
    teacherDisplayName: 'أ. فهد بن عبدالعزيز السبيعي',
    school: 'ثانوية الأمير نايف بالرياض',
    maxCompetitions: 10,
    usedCount: 2,
    expiresAt: '2026-12-31',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z'
  },
  {
    id: 'code-2',
    code: 'TCHR-9M3L8Q',
    teacherDisplayName: 'أ. نورة بنت سالم الحربي',
    school: 'متوسطة دار الحنان بجدة',
    maxCompetitions: 5,
    usedCount: 1,
    expiresAt: '2026-11-30',
    isActive: true,
    createdAt: '2026-09-10T10:00:00Z'
  },
  {
    id: 'code-3',
    code: 'TCHR-NEW-2026',
    teacherDisplayName: '',
    school: '',
    maxCompetitions: 5,
    usedCount: 0,
    expiresAt: '2027-01-01',
    isActive: true,
    createdAt: '2026-09-15T12:00:00Z'
  },
  {
    id: 'code-4',
    code: 'TCHR-EXPIRED',
    teacherDisplayName: 'أ. محمد بن خالد الشريف',
    school: 'مدارس الأندلس الأهلية',
    maxCompetitions: 3,
    usedCount: 3,
    expiresAt: '2026-08-01',
    isActive: false,
    createdAt: '2026-07-01T09:00:00Z'
  }
];

export const INITIAL_COMPETITIONS: Competition[] = [
  {
    id: 'comp-question-bank',
    webSlug: 'question-bank-assessment',
    name: 'بنك الأسئلة والتقييم الذاتي المعرفي',
    description: 'اختبر حصيلتك العلمية وقيم مستواك فورياً في مجالات متعددة (علوم، رياضيات، جغرافيا، تقنية، لغة عربية، أو اختبار شامل) بأسئلة عشوائية متجددة دون الحاجة لاسم أو شهادة.',
    source: 'platform',
    teacherDisplayName: 'بنك الأسئلة والتقويم الذاتي',
    schoolName: 'المركز الوطني للتقويم والتميز المعرفي',
    questionType: 'manual',
    participationType: 'individual',
    competitionType: 'open',
    examDurationMinutes: 10,
    startTime: '2026-01-01T00:00',
    endTime: '2030-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 0,
    rewardType: 'تقييم تشخيصي فوري بدون شهادة',
    certificateEnabled: false,
    isQuestionBank: true,
    status: 'active',
    antiCheatEnabled: false,
    showLeaderboardToStudents: false,
    createdAt: '2026-09-01T00:00',
    questions: []
  },
  {
    id: 'comp-math-geniuses',
    webSlug: 'math-geniuses-challenge',
    name: 'تحدي العباقرة في الرياضيات',
    description: 'اختبر سرعتك في التفكير وحل المسائل المنطقية الممتعة.',
    source: 'platform',
    teacherDisplayName: 'لجنة الرياضيات الوطنية',
    schoolName: 'المركز الوطني لتطوير المناهج',
    questionType: 'manual',
    participationType: 'individual',
    competitionType: 'open',
    examDurationMinutes: 15,
    startTime: '2026-09-01T00:00',
    endTime: '2026-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 5,
    rewardType: 'وسام العباقرة + شهادة شكر وتقدير',
    certificateEnabled: true,
    status: 'active',
    antiCheatEnabled: true,
    showLeaderboardToStudents: true,
    createdAt: '2026-09-15T07:00',
    questions: [
      {
        id: 'mq1',
        text: 'ما حاصل ضرب 12 × 15 ذهنياً بأسرع طريقة؟',
        options: ['160', '175', '180', '190'],
        correctIndex: 2,
        duration: 25,
        explanation: '12 × 10 = 120، و 12 × 5 = 60، المجموع = 180.',
        category: 'الرياضيات'
      },
      {
        id: 'mq2',
        text: 'إذا كان مجموع أعمار 3 طلاب 45 عاماً، فكم سيكون مجموع أعمارهم جميعاً بعد 5 سنوات؟',
        options: ['50 عاماً', '55 عاماً', '60 عاماً', '65 عاماً'],
        correctIndex: 2,
        duration: 30,
        explanation: 'كل طالب يزيد 5 سنوات (3 طلاب × 5 سنوات = 15 سنة إضافة). 45 + 15 = 60 عاماً.',
        category: 'الرياضيات'
      },
      {
        id: 'mq3',
        text: 'مثلث قائم الزاوية طول ضلعيه القائمين 6 سم و 8 سم، كم يكون طول وتره؟',
        options: ['9 سم', '10 سم', '12 سم', '14 سم'],
        correctIndex: 1,
        duration: 30,
        explanation: 'وفق نظرية فيثاغورس: مربع الوتر = 36 + 64 = 100، وجذره التربيعي هو 10 سم.',
        category: 'الرياضيات'
      },
      {
        id: 'mq4',
        text: 'ما هو العدد الأولي الوحيد الذي يكون عدداً زوجياً؟',
        options: ['العدد 0', 'العدد 1', 'العدد 2', 'العدد 4'],
        correctIndex: 2,
        duration: 20,
        explanation: 'العدد 2 هو العدد الزوجي الوحيد الذي لا يقبل القسمة إلا على نفسه والواحد الصحيح.',
        category: 'الرياضيات'
      },
      {
        id: 'mq5',
        text: 'إذا كان سعر سلعة 200 ريال وحصلت على خصم 15%، فكم المبلغ المدفوع بعد الخصم؟',
        options: ['160 ريال', '170 ريال', '175 ريال', '180 ريال'],
        correctIndex: 1,
        duration: 25,
        explanation: 'قيمة الخصم = 200 × 0.15 = 30 ريال. المبلغ المدفوع = 200 - 30 = 170 ريال.',
        category: 'الرياضيات'
      }
    ]
  },
  {
    id: 'comp-science-journey',
    webSlug: 'journey-into-science',
    name: 'رحلة في عالم العلوم',
    description: 'أسئلة شيقة تجمع بين التجربة والاكتشاف والمعرفة.',
    source: 'platform',
    teacherDisplayName: 'مختبر العلوم الاستكشافي',
    schoolName: 'الإدارة العامة لرعاية الموهوبين',
    questionType: 'manual',
    participationType: 'individual',
    competitionType: 'open',
    examDurationMinutes: 12,
    startTime: '2026-09-01T00:00',
    endTime: '2026-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 3,
    rewardType: 'شارة المكتشف الصغير + شهادة تميز وتفوق',
    certificateEnabled: true,
    status: 'active',
    antiCheatEnabled: true,
    showLeaderboardToStudents: true,
    createdAt: '2026-09-16T08:30',
    questions: [
      {
        id: 'sq1',
        text: 'ما هو الكوكب الذي يُعرف بـ "الكوكب الأحمر" بسبب وفرة أكسيد الحديد على سطحه؟',
        options: ['الزهرة', 'المريخ', 'المشتري', 'عطارد'],
        correctIndex: 1,
        duration: 25,
        explanation: 'المريخ يتميز بلونه الصدأ الأحمر نتيجة وجود كميات هائلة من أكسيد الحديد في تربته وصخوره.',
        category: 'العلوم'
      },
      {
        id: 'sq2',
        text: 'أي من الغازات التالية يُشكل النسبة الكبرى في الغلاف الجوي لكوكب الأرض بنسبة تقارب 78%؟',
        options: ['الأكسجين (O2)', 'النيتروجين (N2)', 'ثاني أكسيد الكربون (CO2)', 'الأرجون (Ar)'],
        correctIndex: 1,
        duration: 25,
        explanation: 'يشكل غاز النيتروجين النسبة العظمى من الغلاف الجوي يليه الأكسجين بحوالي 21%.',
        category: 'العلوم'
      },
      {
        id: 'sq3',
        text: 'ما هي العضية الخلوية المسؤولة عن إنتاج الطاقة (ATP) في الخلايا الحية؟',
        options: ['الميتوكوندريا', 'الريبوسوم', 'جهاز جولجي', 'الغشاء البلازمي'],
        correctIndex: 0,
        duration: 25,
        explanation: 'تعتبر الميتوكوندريا محطة توليد الطاقة في الخلية من خلال التنفس الخلوي.',
        category: 'العلوم'
      },
      {
        id: 'sq4',
        text: 'ما هي أصغر وحدة بنائية للمادة تحتفظ بجميع خصائصها الكيميائية؟',
        options: ['الخلية', 'الذرة', 'الجزيء', 'الإلكترون'],
        correctIndex: 1,
        duration: 20,
        explanation: 'الذرة هي أصغر جزء من العنصر يحتفظ بالخواص الكيميائية لذلك العنصر.',
        category: 'العلوم'
      }
    ]
  },
  {
    id: 'comp-arabic-champions',
    webSlug: 'arabic-eloquence-challenge',
    name: 'فرسان اللغة والبيان',
    description: 'جولة ممتعة في أسرار البلاغة والقواعد وروائع الأدب العربي.',
    source: 'platform',
    teacherDisplayName: 'مجمع اللغة العربية والآداب',
    schoolName: 'مركز التميز اللغوي',
    questionType: 'manual',
    participationType: 'individual',
    competitionType: 'open',
    examDurationMinutes: 10,
    startTime: '2026-09-01T00:00',
    endTime: '2026-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 3,
    rewardType: 'وسام الفصاحة + شهادة شكر وتقدير',
    certificateEnabled: true,
    status: 'active',
    antiCheatEnabled: true,
    showLeaderboardToStudents: true,
    createdAt: '2026-09-17T08:00',
    questions: [
      {
        id: 'aq1',
        text: 'ما هو إعراب كلمة "العلمُ" في جملة: "العلمُ نورٌ يضيءُ الدروب"؟',
        options: ['فاعل مرفوع', 'مبتدأ مرفوع بالضمة', 'خبر مرفوع', 'مفعول به منصوب'],
        correctIndex: 1,
        duration: 25,
        explanation: 'الاسم المعرف في بداية الجملة الاسمية يُعرب مبتدأ مرفوع وعلامة رفعه الضمة الظاهرة.',
        category: 'اللغة العربية'
      },
      {
        id: 'aq2',
        text: 'أي من الكلمات التالية كُتبت همزتها همزة وصل صحيحة؟',
        options: ['إستقبال', 'استخراج', 'أستماع', 'إنتصار'],
        correctIndex: 1,
        duration: 25,
        explanation: 'مصدر الفعل السداسي "استخرج" همزته همزة وصل بدون كتابة الهمزة (استخراج).',
        category: 'اللغة العربية'
      },
      {
        id: 'aq3',
        text: 'ما هو ضد كلمة "الشجاعة" في المعاجم اللغوية العربية؟',
        options: ['الحكمة', 'الجبن', 'التردد', 'الخوف المؤقت'],
        correctIndex: 1,
        duration: 20,
        explanation: 'الجبن هو نقيض الشجاعة والإقدام في المعاجم.',
        category: 'اللغة العربية'
      }
    ]
  },
  {
    id: 'comp-tech-innovators',
    webSlug: 'tech-ai-innovators',
    name: 'رواد التقنية والذكاء الاصطناعي',
    description: 'تحدٍ تفاعلي في المفاهيم الرقمية والبرمجة والذكاء الاصطناعي.',
    source: 'platform',
    teacherDisplayName: 'هيئة الذكاء الاصطناعي والتقنية',
    schoolName: 'أكاديمية المستقبل الرقمي',
    questionType: 'manual',
    participationType: 'individual',
    competitionType: 'open',
    examDurationMinutes: 20,
    startTime: '2026-09-01T00:00',
    endTime: '2026-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 5,
    rewardType: 'درع الابتكار الرقمي + شهادة إتمام التحدي',
    certificateEnabled: true,
    status: 'active',
    antiCheatEnabled: true,
    showLeaderboardToStudents: true,
    createdAt: '2026-09-18T06:00',
    questions: [
      {
        id: 'tq1',
        text: 'ما هي الوحدة الأساسية المسؤولة عن معالجة الحسابات والأوامر في الحاسوب؟',
        options: ['وحدة المعالجة المركزية (CPU)', 'الذاكرة العشوائية (RAM)', 'القرص الصلب (SSD)', 'مزود الطاقة (PSU)'],
        correctIndex: 0,
        duration: 25,
        explanation: 'CPU هو العقل المدبر والمسؤول عن تنفيذ التعليمات البرمجية.',
        category: 'التقنية'
      },
      {
        id: 'tq2',
        text: 'ما هي لغة البرمجة الأكثر انتشاراً واستخداماً في تطبيقات الذكاء الاصطناعي وتعلم الآلة؟',
        options: ['بايثون (Python)', 'إتش تي إم إل (HTML)', 'سي شارب (C#)', 'باسكال (Pascal)'],
        correctIndex: 0,
        duration: 25,
        explanation: 'بايثون هي الأكثر استخداماً بفضل مكتبات مثل TensorFlow وPyTorch وسهولة التراكيب البرمجية.',
        category: 'التقنية'
      },
      {
        id: 'tq3',
        text: 'ما المقصود بالحوسبة السحابية (Cloud Computing)؟',
        options: ['تخزين البيانات في الهواء', 'تقديم خدمات الحوسبة والتخزين عبر الإنترنت', 'أجهزة كمبيوتر تعمل بالطاقة الشمسية', 'نوع من الشاشات الذكية'],
        correctIndex: 1,
        duration: 25,
        explanation: 'الحوسبة السحابية توفر خوادم وتخزين وتطبيقات عبر شبكة الإنترنت عند الطلب.',
        category: 'التقنية'
      }
    ]
  },
  {
    id: 'comp-team-olympiad',
    webSlug: 'team-olympiad-challenge',
    name: 'أولمبياد الفرق للعلوم والابتكار',
    description: 'تنافس جماعي مميز بين فرق المدارس والنوادي العلمية لتبادل الأفكار وحل التحديات الكبرى.',
    source: 'platform',
    teacherDisplayName: 'لجنة الأولمبياد للفرق العلمية',
    schoolName: 'منصة تَنافُسْ التعليمية',
    questionType: 'manual',
    participationType: 'team',
    competitionType: 'open',
    examDurationMinutes: 15,
    startTime: '2026-09-01T00:00',
    endTime: '2026-12-31T23:59',
    singleAttempt: false,
    hideAnswersUntilEnd: false,
    questionDuration: 30,
    winnersCount: 3,
    rewardType: 'درع التميز الجماعي + شهادة تفوق لكل عضو متفوق',
    certificateEnabled: true,
    status: 'active',
    antiCheatEnabled: true,
    showLeaderboardToStudents: true,
    createdAt: '2026-09-20T08:00',
    questions: [
      {
        id: 'tmo1',
        text: 'ما هو العنصر الأكثر وفرة في الكون بأسره ويشكل نحو 75% من كتلته؟',
        options: ['الهيدروجين (H)', 'الهيليوم (He)', 'الأكسجين (O)', 'الكربون (C)'],
        correctIndex: 0,
        duration: 25,
        explanation: 'الهيدروجين هو العنصر الأبسط والأكثر وفرة في الكون.',
        category: 'العلوم'
      },
      {
        id: 'tmo2',
        text: 'إذا كانت سرعة الضوء تقارب 300,000 كم/ث، فكم يستغرق ضوء الشمس ليصل إلى الأرض تقريباً؟',
        options: ['8 ثوانٍ', '8 دقائق', '8 ساعات', '8 أيام'],
        correctIndex: 1,
        duration: 25,
        explanation: 'المسافة بين الأرض والشمس حوالي 150 مليون كم، ويقطعها الضوء في نحو 8 دقائق و20 ثانية.',
        category: 'العلوم'
      },
      {
        id: 'tmo3',
        text: 'ما هو متوسط الأعداد: 12، 18، 24، 30، 36؟',
        options: ['20', '24', '26', '28'],
        correctIndex: 1,
        duration: 25,
        explanation: 'مجموع الأعداد = 120، وبقسمته على عددها (5) ينتج 24 (وهو أيضاً العدد الأوسط في متتابعة حسابية متماثلة).',
        category: 'الرياضيات'
      },
      {
        id: 'tmo4',
        text: 'ما هي لغة البرمجة التي تُعتبر حجر الأساس لتطوير واجهات وتفاعلات صفحات الويب الحديثة؟',
        options: ['جافاسكربت (JavaScript)', 'سي بلس بلس (C++)', 'فورتران (Fortran)', 'روبي (Ruby)'],
        correctIndex: 0,
        duration: 20,
        explanation: 'جافاسكربت هي اللغة الرسمية المعيارية للتشغيل داخل متصفحات الويب.',
        category: 'التقنية'
      },
      {
        id: 'tmo5',
        text: 'ما هو الجهاز الذي يُستخدم لقياس الضغط الجوي؟',
        options: ['البارومتر (Barometer)', 'الثرمومتر (Thermometer)', 'الأنيمومتر (Anemometer)', 'الهيدرومتر (Hydrometer)'],
        correctIndex: 0,
        duration: 25,
        explanation: 'البارومتر هو الجهاز المخصص لقياس الضغط الجوي.',
        category: 'العلوم'
      }
    ]
  }
];

export const INITIAL_TEAMS: CompetitionTeam[] = [
  {
    id: 'team-seed-01',
    competitionId: 'comp-team-olympiad',
    name: 'صقور المستقبل',
    code: '2048',
    leaderName: 'سعود بن طارق القحطاني',
    school: 'ثانوية الأمير نايف بالرياض',
    maxMembers: 4,
    minMembers: 2,
    allowPublicJoin: true,
    status: 'ready',
    createdAt: '2026-09-21T10:00:00Z',
    members: [
      {
        id: 'm-1',
        name: 'سعود بن طارق القحطاني',
        school: 'ثانوية الأمير نايف بالرياض',
        isLeader: true,
        joinedAt: '2026-09-21T10:00:00Z'
      },
      {
        id: 'm-2',
        name: 'ريان بن إبراهيم الدوسري',
        school: 'ثانوية الأمير نايف بالرياض',
        isLeader: false,
        joinedAt: '2026-09-21T10:05:00Z'
      },
      {
        id: 'm-3',
        name: 'شهد بنت خالد العتيبي',
        school: 'ثانوية الأمير نايف بالرياض',
        isLeader: false,
        joinedAt: '2026-09-21T10:10:00Z'
      }
    ]
  },
  {
    id: 'team-seed-02',
    competitionId: 'comp-team-olympiad',
    name: 'رواد الإبداع والتميز',
    code: '7711',
    leaderName: 'عبدالملك بن سلمان المطيري',
    school: 'ثانوية الموهوبين بالشرقية',
    maxMembers: 4,
    minMembers: 2,
    allowPublicJoin: true,
    status: 'ready',
    createdAt: '2026-09-21T11:00:00Z',
    members: [
      {
        id: 'm-4',
        name: 'عبدالملك بن سلمان المطيري',
        school: 'ثانوية الموهوبين بالشرقية',
        isLeader: true,
        joinedAt: '2026-09-21T11:00:00Z'
      },
      {
        id: 'm-5',
        name: 'معاذ بن يوسف الزهراني',
        school: 'ثانوية الموهوبين بالشرقية',
        isLeader: false,
        joinedAt: '2026-09-21T11:04:00Z'
      }
    ]
  },
  {
    id: 'team-seed-03',
    competitionId: 'comp-team-olympiad',
    name: 'نوابغ التحدي',
    code: '4590',
    leaderName: 'أحمد بن طلال الغامدي',
    school: 'مدارس الفلاح بجدة',
    maxMembers: 3,
    minMembers: 2,
    allowPublicJoin: true,
    status: 'forming',
    createdAt: '2026-09-21T11:30:00Z',
    members: [
      {
        id: 'm-6',
        name: 'أحمد بن طلال الغامدي',
        school: 'مدارس الفلاح بجدة',
        isLeader: true,
        joinedAt: '2026-09-21T11:30:00Z'
      }
    ]
  }
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'part-1',
    competitionId: 'comp-platform-01',
    name: 'سعود بن طارق القحطاني',
    school: 'ثانوية الأمير نايف بالرياض',
    sessionToken: 'sess-token-01',
    joinedAt: '2026-09-18T08:10:00',
    score: 500,
    correctAnswers: 5,
    totalQuestions: 5,
    totalTimeSeconds: 38.4,
    rank: 1,
    submittedAt: '2026-09-18T08:14:20'
  },
  {
    id: 'part-2',
    competitionId: 'comp-platform-01',
    name: 'ريان بن إبراهيم الدوسري',
    school: 'ثانوية الرواد النموذجية',
    sessionToken: 'sess-token-02',
    joinedAt: '2026-09-18T09:20:00',
    score: 480,
    correctAnswers: 5,
    totalQuestions: 5,
    totalTimeSeconds: 46.2,
    rank: 2,
    submittedAt: '2026-09-18T09:24:10'
  },
  {
    id: 'part-3',
    competitionId: 'comp-platform-01',
    name: 'شهد بنت خالد العتيبي',
    school: 'مدارس المنهل الحديثة',
    sessionToken: 'sess-token-03',
    joinedAt: '2026-09-18T10:05:00',
    score: 390,
    correctAnswers: 4,
    totalQuestions: 5,
    totalTimeSeconds: 41.5,
    rank: 3,
    submittedAt: '2026-09-18T10:08:45'
  },
  {
    id: 'part-4',
    competitionId: 'comp-platform-02',
    name: 'عبدالملك بن سلمان المطيري',
    school: 'ثانوية الموهوبين بالشرقية',
    teamName: 'فريق فرسان الرؤية',
    sessionToken: 'sess-token-04',
    joinedAt: '2026-09-18T09:00:00',
    score: 300,
    correctAnswers: 3,
    totalQuestions: 3,
    totalTimeSeconds: 32.1,
    rank: 1,
    submittedAt: '2026-09-18T09:03:20'
  },
  {
    id: 'part-5',
    competitionId: 'comp-platform-02',
    name: 'معاذ بن يوسف الزهراني',
    school: 'ثانوية الموهوبين بالشرقية',
    teamName: 'فريق فرسان الرؤية',
    sessionToken: 'sess-token-05',
    joinedAt: '2026-09-18T09:05:00',
    score: 300,
    correctAnswers: 3,
    totalQuestions: 3,
    totalTimeSeconds: 36.4,
    rank: 2,
    submittedAt: '2026-09-18T09:08:35'
  },
  {
    id: 'part-6',
    competitionId: 'comp-platform-02',
    name: 'أحمد بن طلال الغامدي',
    school: 'مدارس الفلاح بجدة',
    teamName: 'فريق نخبة المستقبل',
    sessionToken: 'sess-token-06',
    joinedAt: '2026-09-18T10:30:00',
    score: 200,
    correctAnswers: 2,
    totalQuestions: 3,
    totalTimeSeconds: 45.0,
    rank: 3,
    submittedAt: '2026-09-18T10:34:00'
  },
  {
    id: 'part-7',
    competitionId: 'comp-teacher-01',
    name: 'عمر بن سلطان السبيعي',
    school: 'ثانوية الأمير نايف بالرياض',
    sessionToken: 'sess-token-07',
    joinedAt: '2026-09-18T11:00:00',
    score: 300,
    correctAnswers: 3,
    totalQuestions: 3,
    totalTimeSeconds: 26.8,
    rank: 1,
    submittedAt: '2026-09-18T11:03:10'
  }
];

export const INITIAL_ANSWERS: ParticipantAnswer[] = [
  { participantId: 'part-1', questionId: 'q1', selectedIndex: 0, isCorrect: true, timeTaken: 6.2, answeredAt: '2026-09-18T08:10:40' },
  { participantId: 'part-1', questionId: 'q2', selectedIndex: 1, isCorrect: true, timeTaken: 7.1, answeredAt: '2026-09-18T08:11:30' },
  { participantId: 'part-1', questionId: 'q3', selectedIndex: 1, isCorrect: true, timeTaken: 8.5, answeredAt: '2026-09-18T08:12:25' },
  { participantId: 'part-1', questionId: 'q4', selectedIndex: 0, isCorrect: true, timeTaken: 7.9, answeredAt: '2026-09-18T08:13:15' },
  { participantId: 'part-1', questionId: 'q5', selectedIndex: 1, isCorrect: true, timeTaken: 8.7, answeredAt: '2026-09-18T08:14:15' }
];

export const INITIAL_MANUAL_CERTIFICATES: ManualCertificate[] = [
  {
    id: 'cert-man-01',
    studentName: 'فيصل بن عبدالله المنصور',
    titleOrReason: 'تكريم للتفوق المتميز والجهود النوعية في مشروع العلوم والابتكار',
    teacherName: 'أ. فهد بن عبدالعزيز السبيعي',
    schoolName: 'ثانوية الأمير نايف بالرياض',
    date: '2026-09-18'
  }
];

export const INITIAL_BANK_DOMAINS: QuestionBankDomain[] = [
  {
    id: 'domain-science',
    name: 'العلوم والطبيعة',
    description: 'فيزياء، كيمياء، أحياء، فلك، وعلوم الأرض والاستكشاف العلمي',
    icon: 'Atom',
    color: 'teal',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 30,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'domain-math',
    name: 'الرياضيات والمنطق',
    description: 'حساب ذهني، جبر، هندسة رياضية، وألغاز التفكير المنطقي',
    icon: 'Calculator',
    color: 'emerald',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 35,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'domain-geography',
    name: 'الجغرافيا وعالمنا',
    description: 'عواصم الدول، التضاريس والبحار، المعالم العالمية، والمناخ',
    icon: 'Globe2',
    color: 'blue',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 25,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'domain-arabic',
    name: 'اللغة العربية والبيان',
    description: 'قواعد النحو، البلاغة، معاني المفردات، والإملاء القرآني',
    icon: 'BookOpen',
    color: 'purple',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 25,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'domain-tech',
    name: 'التقنية والذكاء الاصطناعي',
    description: 'لغات البرمجة، خوارزميات الذكاء الاصطناعي، الأمن السيبراني، والسحابة',
    icon: 'Cpu',
    color: 'cyan',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 30,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'domain-history',
    name: 'التاريخ والحضارات',
    description: 'تاريخ المملكة، الحضارة الإسلامية، وأبرز محطات التاريخ العالمي',
    icon: 'Landmark',
    color: 'amber',
    defaultQuestionCount: 5,
    defaultTimePerQuestion: 25,
    createdAt: '2026-09-01T00:00:00Z'
  }
];

export const INITIAL_BANK_QUESTIONS: BankQuestion[] = [
  // --- 1. العلوم والطبيعة ---
  {
    id: 'bq-sci-1',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'ما هو العنصر الكيميائي الأكثر وفرة في الغلاف الجوي لكوكب الأرض؟',
    options: ['النيتروجين (حوالي 78%)', 'الأكسجين', 'ثاني أكسيد الكربون', 'الهيدروجين'],
    correctIndex: 0,
    duration: 25,
    explanation: 'يشكل غاز النيتروجين النسبة الأكبر من الهواء الجوي بحوالي 78% يليه الأكسجين بنسبة 21%.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-sci-2',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'ما هي عضية الخلية المسؤولة عن إنتاج الطاقة (ATP) في الخلايا الحية؟',
    options: ['الميتوكوندريا (Mitochondria)', 'الريبوسومات', 'جهاز جولجي', 'الغشاء البلازمي'],
    correctIndex: 0,
    duration: 30,
    explanation: 'تُعرف الميتوكوندريا بـ "محطة توليد الطاقة" في الخلية وتنتج جزيئات ATP عبر التنفس الخلوي.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-sci-3',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'كم تبلغ سرعة الضوء التقريبية في الفراغ؟',
    options: ['300,000 كيلومتر في الثانية', '150,000 كيلومتر في الثانية', '3,000 كيلومتر في الثانية', '30,000 كيلومتر في الساعة'],
    correctIndex: 0,
    duration: 25,
    explanation: 'تبلغ سرعة الضوء في الفراغ قرابة 299,792 كم/ثانية وتعتبر أقصى سرعة كونية لنقل الإشارات.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-sci-4',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'أي من الكواكب التالية يتميز بوجود أكبر نظام حلقات ملحوظ في المجموعة الشمسية؟',
    options: ['زحل', 'المشتري', 'نبتون', 'المريخ'],
    correctIndex: 0,
    duration: 20,
    explanation: 'كوكب زحل يمتلك أضخم وأجمل نظام حلقات يتكون من مليارات الجزيئات الجليدية والصخرية.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-sci-5',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'ما هو الرقم الهيدروجيني (pH) للماء النقي المقطر عند درجة حرارة 25 مئوية؟',
    options: ['7 (متعادل)', '0 (شديد الحموضة)', '14 (شديد القاعدية)', '5'],
    correctIndex: 0,
    duration: 25,
    explanation: 'الماء النقي متعادل كيميائياً وقيمة الـ pH له تساوي تماماً 7.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-sci-6',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'ما هو قانون نيوتن الأول للحركة المعروف أيضاً باسم قانون القصور الذاتي؟',
    options: [
      'الجسم الساكن يبقى ساكناً والمتحرك يبقى متحركاً ما لم تؤثر عليه قوة محصلة',
      'القوة تساوي الكتلة مضروبة في التسارع',
      'لكل فعل رد فعل مساوٍ له في المقدار ومعاكس في الاتجاه',
      'طاقة الحركة تتناسب طردياً مع مربع الكتلة'
    ],
    correctIndex: 0,
    duration: 35,
    explanation: 'ينص قانون نيوتن الأول على ميل الأجسام لمقاومة تغيير حالتها الحركية (القصور الذاتي).',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- 2. الرياضيات والمنطق ---
  {
    id: 'bq-math-1',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'ما حاصل ضرب: 15 × 16 بالحساب الذهني السريع؟',
    options: ['240', '225', '260', '256'],
    correctIndex: 0,
    duration: 30,
    explanation: '15 × 16 = 15 × (10 + 6) = 150 + 90 = 240 (أو 15 × 4 × 4 = 60 × 4 = 240).',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-math-2',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'ما هي قيمة الزاوية الداخلية للخلية في الشكل السداسي المنتظم؟',
    options: ['120 درجة', '108 درجات', '90 درجة', '135 درجة'],
    correctIndex: 0,
    duration: 30,
    explanation: 'مجموع زوايا السداسي = (6 - 2) × 180 = 720 درجة. الزاوية الواحدة = 720 ÷ 6 = 120 درجة.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-math-3',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'إذا كان عمر الأب 40 عاماً وعمر ابنه 10 أعوام، بعد كم سنة يصبح عمر الأب ضعف عمر ابنه؟',
    options: ['بعد 20 سنة', 'بعد 15 سنة', 'بعد 25 سنة', 'بعد 30 سنة'],
    correctIndex: 0,
    duration: 35,
    explanation: 'بعد 20 سنة: الأب 60 والابن 30، و 60 = 2 × 30.',
    difficulty: 'متقدم',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-math-4',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'ما هو العدد الأولي الذي يقع بين العددين 25 و 30؟',
    options: ['العدد 29', 'العدد 27', 'العدد 26', 'لا يوجد عدد أولي'],
    correctIndex: 0,
    duration: 25,
    explanation: '29 عدد أولي لا يقبل القسمة إلا على 1 ونفسه (بينما 27 يقبل على 3 و 9).',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-math-5',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'إذا كانت مساحة مربع 144 سم²، فكم يبلغ محيطه بالسنتيمترات؟',
    options: ['48 سم', '36 سم', '52 سم', '24 سم'],
    correctIndex: 0,
    duration: 30,
    explanation: 'طول ضلع المربع = جذر 144 = 12 سم. المحيط = 12 × 4 = 48 سم.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-math-6',
    domainId: 'domain-math',
    domainName: 'الرياضيات والمنطق',
    text: 'حل المعادلة: 3س + 9 = 30، ما هي قيمة س؟',
    options: ['س = 7', 'س = 6', 'س = 8', 'س = 9'],
    correctIndex: 0,
    duration: 25,
    explanation: '3س = 30 - 9 = 21، إذن س = 21 ÷ 3 = 7.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- 3. الجغرافيا وعالمنا ---
  {
    id: 'bq-geo-1',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'ما هي عاصمة اليابان؟',
    options: ['طوكيو', 'كيوتو', 'أوساكا', 'هيروشيما'],
    correctIndex: 0,
    duration: 20,
    explanation: 'طوكيو هي عاصمة اليابان والمركز الاقتصادي والسياسي الأكبر في البلاد.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-geo-2',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'ما هو أطول نهر في العالم؟',
    options: ['نهر النيل (أو الأمازون وفق القياسات الحديثة)', 'نهر المسيسيبي', 'نهر الدانوب', 'نهر الفولغا'],
    correctIndex: 0,
    duration: 25,
    explanation: 'يعتبر نهر النيل في قارة إفريقيا أطول نهر تقليدياً بطول يتجاوز 6650 كم.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-geo-3',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'ما هي أكبر قارة في العالم من حيث المساحة وعدد السكان؟',
    options: ['قارة آسيا', 'قارة إفريقيا', 'قارة أوروبا', 'قارة أمريكا الشمالية'],
    correctIndex: 0,
    duration: 20,
    explanation: 'تغطي قارة آسيا حوالي 30% من مساحة يابسة الأرض وتضم أكثر من نصف سكان الكوكب.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-geo-4',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'أي مضيق مائي يفصل بين قارة آسيا وقارة إفريقيا ويصل البحر الأحمر بخليج عدن؟',
    options: ['مضيق باب المندب', 'مضيق هرمز', 'مضيق جبل طارق', 'مضيق البوسفور'],
    correctIndex: 0,
    duration: 25,
    explanation: 'مضيق باب المندب ممر مائي استراتيجي يصل البحر الأحمر ببحر العرب وخليج عدن.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-geo-5',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'ما هي أعلى قمة جبلية على وجه كوكب الأرض فوق مستوى سطح البحر؟',
    options: ['قمة إفرست (Everest) في جبال الهيمالايا', 'جبل كليمنجارو', 'جبل توبقال', 'جبل مون بلان'],
    correctIndex: 0,
    duration: 20,
    explanation: 'يبلغ ارتفاع قمة إفرست في سلسلة الهيمالايا حوالي 8,848.86 متراً.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-geo-6',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'أي من المسطحات المائية التالية يعتبر أكبر بحر داخلي مغلق في العالم؟',
    options: ['بحر قزوين', 'البحر الميت', 'البحر الأسود', 'بحر البلطيق'],
    correctIndex: 0,
    duration: 25,
    explanation: 'بحر قزوين هو أكبر مسطح مائي حبيس ومغلق في العالم بمساحة تقارب 371 ألف كم².',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- 4. اللغة العربية والبيان ---
  {
    id: 'bq-ar-1',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'ما إعراب كلمة "المجتهدون" في جملة: "كرّم المعلمُ المجتهدينَ"؟',
    options: ['مفعول به منصوب وعلامة نصبه الياء', 'فاعل مرفوع بالواو', 'نعت مجرور بالياء', 'خبر مرفوع بالضمة'],
    correctIndex: 0,
    duration: 25,
    explanation: 'المجتهدين مفعول به منصوب، وعلامة نصبه الياء لأنه جمع مذكر سالم.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-ar-2',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'ما هو جمع كلمة "عندليب" في معجم لسان العرب؟',
    options: ['عنادل وعناديل', 'عنادليب', 'عندلبات', 'أعندال'],
    correctIndex: 0,
    duration: 25,
    explanation: 'تجمع عندليب على عنادل أو عناديل وفق أوزان جموع التكسير في الصرف العربي.',
    difficulty: 'متقدم',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-ar-3',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'أي من الحروف التالية يعتبر من حروف الجزم التي تجزم فعلاً مضارعاً واحداً؟',
    options: ['لمْ', 'لنْ', 'أنْ', 'كيْ'],
    correctIndex: 0,
    duration: 20,
    explanation: '(لم) حرف نفي وجزم وقلب، يجزم الفعل المضارع، بينما (لن وأن وكي) من أدوات النصب.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-ar-4',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'ما هو المحسن البديعي بين كلمتي: (يوم) و (يومئذ) أو (فأما اليتيم فلا تقهر وأما السائل فلا تنهر)؟',
    options: ['جناس غير تام (ناقص)', 'طباق إيجاب', 'سجع ومقابلة فقط', 'تورية'],
    correctIndex: 0,
    duration: 30,
    explanation: 'بين (تقهر) و (تنهر) جناس ناقص لاختلاف أحد حروف الكلمتين.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-ar-5',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'ما أصل كتابة الألف اللينة في نهاية الفعل الماضي الثلاثي: (دعا)؟',
    options: ['أصلها واو (يدعو)', 'أصلها ياء (يدعي)', 'أصلها همزة', 'زائدة للتأنيث'],
    correctIndex: 0,
    duration: 25,
    explanation: 'تُكتب الألف اللينة ممدودة قائمة (ا) في الفعل الثلاثي إذا كان أصلها واواً: دعا يدعو.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- 5. التقنية والذكاء الاصطناعي ---
  {
    id: 'bq-tech-1',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ماذا يرمز اختصار (AI) في علوم الحاسب؟',
    options: ['الذكاء الاصطناعي (Artificial Intelligence)', 'الواجهة الآلية', 'تكامل التطبيقات', 'الخوارزمية الذاتية'],
    correctIndex: 0,
    duration: 20,
    explanation: 'AI يرمز لـ Artificial Intelligence وهو محاكاة القدرات الذهنية البشرية بواسطة الأنظمة الحاسوبية.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-tech-2',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هو نوع التعلم الآلي الذي يتعلم فيه النموذج من خلال المكافأة والعقاب والتجربة الذاتية؟',
    options: ['التعلم التعزيزي (Reinforcement Learning)', 'التعلم الإشرافي', 'التعلم غير الإشرافي', 'التعلم الخطي'],
    correctIndex: 0,
    duration: 30,
    explanation: 'التعلم التعزيزي يتيح للوكيل الذكي اتخاذ قرارات متتابعة لتعظيم المكافآت التراكمية في البيئة.',
    difficulty: 'متوسط',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-tech-3',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هي وحدة قياس سرعة معالجة الأوامر في المعالجات الحديثة؟',
    options: ['الجيجاهيرتز (GHz)', 'الجيجابايت (GB)', 'الميغابت (Mbps)', 'النانومتر (nm)'],
    correctIndex: 0,
    duration: 25,
    explanation: 'الجيجاهيرتز (GHz) يعبر عن مليارات دورات التردد الساعة في الثانية الواحدة لوحدة المعالجة.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-tech-4',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هو مبدأ الأمان السيبراني الأساسي الذي يتطلب التحقق من خطوتين قبل الدخول للحساب؟',
    options: ['المصادقة الثنائية (2FA)', 'التشفير الأحادي', 'جدار الحماية المفتوح', 'المفتاح العشوائي'],
    correctIndex: 0,
    duration: 25,
    explanation: 'المصادقة الثنائية (Two-Factor Authentication) تضيف طبقة حماية ثانية بجانب كلمة المرور.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-tech-5',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هي معمارية الشبكات العصبية التي أحدثت ثورة نماذج اللغات الكبيرة (LLMs) عام 2017؟',
    options: ['معمارية المحوّلات (Transformers)', 'الشبكات التلافيفية البسيطة (CNN)', 'المدرك الحسي الفردي', 'خوارزمية الشجرة'],
    correctIndex: 0,
    duration: 30,
    explanation: 'طرحت ورقة Attention Is All You Need معمارية المحولات (Transformer) التي بنيت عليها GPT وGemini.',
    difficulty: 'متقدم',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- 6. التاريخ والحضارات ---
  {
    id: 'bq-hist-1',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'في أي عام تأسست الدولة السعودية الأولى على يد الإمام محمد بن سعود في الدرعية؟',
    options: ['1139 هـ / 1727 م (يوم التأسيس 22 فبراير)', '1351 هـ / 1932 م', '1240 هـ / 1824 م', '1319 هـ / 1902 م'],
    correctIndex: 0,
    duration: 25,
    explanation: 'تأسست الدولة السعودية الأولى عام 1139هـ (1727م) وهو اليوم الذي تحتفي به المملكة كيوم للتأسيس.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-hist-2',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'من هو الخليفة الراشد الذي تم في عهده جمع القرآن الكريم في مصحف واحد وإرساله للأمصار؟',
    options: ['الخليفة عثمان بن عفان رضي الله عنه', 'الخليفة أبو بكر الصديق رضي الله عنه', 'الخليفة عمر بن الخطاب رضي الله عنه', 'الخليفة علي بن أبي طالب رضي الله عنه'],
    correctIndex: 0,
    duration: 25,
    explanation: 'قام عثمان بن عفان رضي الله عنه بنسخ المصحف الإمام وتوحيد قراءة المسلمين عليه وإرساله للأمصار.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-hist-3',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'ما هي المعركة التاريخية الشهيرة التي وقعت في رمضان في العام الثاني للهجرة؟',
    options: ['غزوة بدر الكبرى', 'غزوة أحد', 'غزوة الخندق (الأحزاب)', 'فتح مكة'],
    correctIndex: 0,
    duration: 20,
    explanation: 'غزوة بدر الكبرى (يوم الفرقان) وقعت في 17 رمضان من العام 2 هجرياً.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-hist-4',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'من هو العالم المسلم الملقب بـ "أبو الكيمياء" ومؤسس المنهج التجريبي في الكيمياء؟',
    options: ['جابر بن حيان', 'ابن سينا', 'الخوارزمي', 'الحسن بن الهيثم'],
    correctIndex: 0,
    duration: 25,
    explanation: 'جابر بن حيان هو رائد الكيمياء التجريبية ومخترع العديد من أدوات التقطير والبلورة.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'bq-hist-5',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'في أي عهد تم استرداد الرياض وانطلاق ملحمة توحيد المملكة العربية السعودية الحديثة عام 1319 هـ (1902 م)؟',
    options: ['الملك عبدالعزيز بن عبدالرحمن آل سعود -رحمه الله-', 'الإمام تركي بن عبدالله', 'الملك سعود بن عبدالعزيز', 'الملك فيصل بن عبدالعزيز'],
    correctIndex: 0,
    duration: 25,
    explanation: 'استرد الملك عبدالعزيز بن عبدالرحمن آل سعود -طيب الله ثراه- الرياض عام 1902م ليبدأ توحيد الوطن.',
    difficulty: 'سهل',
    createdAt: '2026-09-01T00:00:00Z'
  },

  // --- إضافات جديدة لتوسيع بنك الأسئلة ---
  {
    id: 'bq-sci-7',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'ما هو الهرمون المسؤول عن تنظيم مستوى السكر في الدم وتقليل نسبة الجلوكوز؟',
    options: ['الأنسولين (Insulin)', 'الأدرينالين', 'الثايروكسين', 'الكورتيزول'],
    correctIndex: 0,
    duration: 25,
    explanation: 'يفرز خلايا بيتا في البنكرياس هرمون الأنسولين لتمكين الخلايا من امتصاص الجلوكوز.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-sci-8',
    domainId: 'domain-science',
    domainName: 'العلوم والطبيعة',
    text: 'أي من العناصر التالية يعتبر أكثر العناصر وفرة في القشرة الأرضية؟',
    options: ['الأكسجين (Oxygen)', 'السيليكون', 'الألومنيوم', 'الحديد'],
    correctIndex: 0,
    duration: 25,
    explanation: 'يشكل الأكسجين حوالي 46.6% من كتلة القشرة الأرضية يليه السيليكون بنسبة 27.7%.',
    difficulty: 'متوسط',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-math-7',
    domainId: 'domain-math',
    domainName: 'الرياضيات والتفكير المنطقي',
    text: 'ما هو القاسم المشترك الأكبر (ق.م.أ) للعددين 24 و 36؟',
    options: ['12', '6', '18', '24'],
    correctIndex: 0,
    duration: 30,
    explanation: 'العوامل المشتركة هي 1، 2، 3، 4، 6، 12، وأكبرها هو 12.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-math-8',
    domainId: 'domain-math',
    domainName: 'الرياضيات والتفكير المنطقي',
    text: 'مثلث أطوال أضلاعه 6 سم، 8 سم، 10 سم. ما هي مساحته؟',
    options: ['24 سم²', '48 سم²', '30 سم²', '40 سم²'],
    correctIndex: 0,
    duration: 30,
    explanation: 'المثلث قائم الزاوية لأن (6²+8²=10²)، ومساحته = ½ × القاعدة × الارتفاع = ½ × 6 × 8 = 24 سم².',
    difficulty: 'متوسط',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-geo-7',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'ما هي عاصمة جمهورية مصر العربية وأكبر مدنها سكاناً؟',
    options: ['القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان'],
    correctIndex: 0,
    duration: 20,
    explanation: 'القاهرة هي عاصمة مصر وأكبر مركز حضري في إفريقيا والعالم العربي.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-geo-8',
    domainId: 'domain-geography',
    domainName: 'الجغرافيا وعالمنا',
    text: 'أي دولة تعتبر الأكثر احتواءً على جزر في العالم (أكثر من 267 ألف جزيرة)؟',
    options: ['السويد', 'إندونيسيا', 'الفلبين', 'اليابان'],
    correctIndex: 0,
    duration: 25,
    explanation: 'تمتلك السويد أكبر عدد من الجزر في العالم ويصل عددها لنحو 267,570 جزيرة.',
    difficulty: 'متقدم',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-ar-6',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'ما معنى كلمة "السؤدد" في قول الشاعر: (وإذا المروءةُ والسُّؤْدُدُ)؟',
    options: ['الشرف والمجد والشرف العظيم', 'السرعة والنشاط', 'الحزن والأسى', 'الهدوء والسكينة'],
    correctIndex: 0,
    duration: 25,
    explanation: 'السُّؤْدُدُ في معاجم اللغة تعني الشرف والسيادة والمجد.',
    difficulty: 'متوسط',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-ar-7',
    domainId: 'domain-arabic',
    domainName: 'اللغة العربية والبيان',
    text: 'أي من الأسماء التالية يُعد من "الأسماء الخمسة" المرفوعة بالواو؟',
    options: ['أبوك', 'الأبوان', 'آباء', 'أبوات'],
    correctIndex: 0,
    duration: 20,
    explanation: 'الأسماء الخمسة هي (أبوك، أخوك، حموك، فوك، ذو مال) وترفع بالواو وتُنصب بالألف وتُجر بالياء.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-tech-6',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هي لغة البرمجة التي تُعتبر الأكثر استخداماً وشعبية في مجال تطبيقات الذكاء الاصطناعي وتنقيب البيانات؟',
    options: ['باثون (Python)', 'سي بلس بلس (C++)', 'إتش تي إم إبل (HTML)', 'ف Visual Basic'],
    correctIndex: 0,
    duration: 20,
    explanation: 'تتميز بايثون بوجود مكتبات عملاقة مثل PyTorch وTensorFlow وNumPy المتخصصة بالذكاء الاصطناعي.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-tech-7',
    domainId: 'domain-tech',
    domainName: 'التقنية والذكاء الاصطناعي',
    text: 'ما هو بروتوكول نقل النص الفائق المشفر الآمن المستخدم لتصفح المواقع على الإنترنت؟',
    options: ['HTTPS', 'FTP', 'SMTP', 'DHCP'],
    correctIndex: 0,
    duration: 20,
    explanation: 'HTTPS هو النسخة المشفرة الآمنة لبروتوكول HTTP لحماية نقل البيانات عبر الإنترنت.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-hist-6',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'ما هي المدينة التاريخية التي كانت عاصمة الدولة العباسية واشتهرت بدار الحكمة؟',
    options: ['بغداد', 'دمشق', 'القاهرة', 'قرطبة'],
    correctIndex: 0,
    duration: 20,
    explanation: 'أسس الخليفة أبو جعفر المنصور مدينة بغداد لتكون عاصمة للعلوم والترجمة والنهضة العلمية.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  },
  {
    id: 'bq-hist-7',
    domainId: 'domain-history',
    domainName: 'التاريخ والحضارات',
    text: 'من هو العالم المسلم الملقب بـ "الشيخ الرئيس" ومؤلف كتاب "القانون في الطب"؟',
    options: ['ابن سينا', 'الرازي', 'ابن النفيس', 'ابن زهر'],
    correctIndex: 0,
    duration: 25,
    explanation: 'ألف ابن سينا كتاب "القانون في الطب" الذي كان المرجع الأساسي لجامعات أوروبا لمئات السنين.',
    difficulty: 'سهل',
    createdAt: '2026-09-25T00:00:00Z'
  }
];
