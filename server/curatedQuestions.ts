export interface GeneratedQuestionItem {
  text: string;
  options: string[];
  correct_index: number;
  duration: number;
  explanation: string;
}

function shuffleOptions(item: GeneratedQuestionItem): GeneratedQuestionItem {
  const correctText = item.options[item.correct_index] ?? item.options[0];
  const shuffled = [...item.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newIndex = shuffled.indexOf(correctText);
  return {
    ...item,
    options: shuffled,
    correct_index: newIndex >= 0 ? newIndex : 0
  };
}

export function generateCuratedQuestions(
  topic: string,
  category: string,
  difficulty: string,
  count: number,
  audience: string
): GeneratedQuestionItem[] {
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedTopic = (topic || '').toLowerCase();
  const isTeachers = audience === 'teachers';

  const pool: GeneratedQuestionItem[] = [];

  if (isTeachers || normalizedTopic.includes('رخصة') || normalizedTopic.includes('معلم') || normalizedCategory.includes('معلم')) {
    pool.push(
      {
        text: 'وفق هرم بلوم للأهداف التعليمية، أي المستويات التالية يمثل أعلى درجات التفكير المعرفي؟',
        options: ['الابتكار والإنشاء (Creation)', 'التطبيق (Application)', 'التذكر (Remembering)', 'الفهم والاستيعاب (Understanding)'],
        correct_index: 0,
        duration: 35,
        explanation: 'في هرم بلوم المعدل، يمثل الابتكار (Creating) قمة الهرم المعرفي، يليه التقويم ثم التحليل.'
      },
      {
        text: 'أي من أساليب التقويم التالية يُجرى أثناء العملية التعليمية بهدف تقديم تغذية راجعة فورية لتعديل مسار التعلم؟',
        options: ['التقويم التكويني (البنائي)', 'التقويم الختامي (النهائي)', 'التقويم القبلي (التشخيصي)', 'التقويم المعياري الخارجي'],
        correct_index: 0,
        duration: 30,
        explanation: 'التقويم التكويني أو البنائي يرافق العملية التعليمية لمراقبة تقدم الطلاب وتعديل استراتيجيات التدريس فورياً.'
      },
      {
        text: 'ما هي الاستراتيجية التعليمية التي تعتمد على تقسيم الطلاب لمجموعات صغيرة غير متجانسة لتحقيق هدف مشترك؟',
        options: ['التعلم التعاوني (Cooperative Learning)', 'المحاضرة المباشرة', 'التعلم الفردي المبرمج', 'التدريس الإلقائي'],
        correct_index: 0,
        duration: 30,
        explanation: 'التعلم التعاوني يعزز مهارات التواصل والعمل الجماعي والمسؤولية الفردية المشتركة.'
      },
      {
        text: 'وفق نظرية الذكاءات المتعددة لهوارد جاردنر، الطالب الذي يتعلم بأفضل صورة عبر الرسوم البيانية والخرائط الذهنية يتميز بذكاء:',
        options: ['بصري - مكاني (Spatial)', 'لغوي - لفظي', 'حركي - بدني', 'منطقي - رياضي'],
        correct_index: 0,
        duration: 30,
        explanation: 'الذكاء البصري المكاني يركز على معالجة الصور والألوان والتمثيل الفراغي والمخططات.'
      },
      {
        text: 'ما هو المفهوم الذي يُعبر عن الفارق بين ما يستطيع المتعلم إنجازه بمفرده وما يستطيع إنجازه بتوجيه من المعلم؟',
        options: ['منطقة النمو الوشيك (ZPD)', 'مرحلة العمليات المجردة', 'مرحلة الاستيعاب الحسي', 'التوازن المعرفي'],
        correct_index: 0,
        duration: 35,
        explanation: 'منطقة النمو الوشيك (Zone of Proximal Development) وضعها العالم فيجوتسكي لتحديد إمكانات التعلم المدعوم.'
      }
    );
  } else if (normalizedCategory.includes('رياضيات') || normalizedTopic.includes('رياضيات') || normalizedTopic.includes('حساب') || normalizedTopic.includes('جبر')) {
    pool.push(
      {
        text: 'ما ناتج العملية الحسابية: (18 × 3) - (48 ÷ 6)؟',
        options: ['46', '48', '52', '42'],
        correct_index: 0,
        duration: 30,
        explanation: '(18 × 3 = 54) و (48 ÷ 6 = 8). العملية: 54 - 8 = 46.'
      },
      {
        text: 'مستطيل محيطه 36 سم وطوله 11 سم، ما هو عرضه؟',
        options: ['7 سم', '8 سم', '9 سم', '6 سم'],
        correct_index: 0,
        duration: 35,
        explanation: 'نصف المحيط = 36 ÷ 2 = 18 سم. العرض = 18 - 11 = 7 سم.'
      },
      {
        text: 'ما هو أصغر عدد أولي فردي من الأعداد الصحيحة؟',
        options: ['3', '1', '2', '5'],
        correct_index: 0,
        duration: 25,
        explanation: 'العدد 2 هو أصغر عدد أولي زوجي، بينما العدد 3 هو أصغر عدد أولي فردي (العدد 1 ليس أولياً).'
      },
      {
        text: 'إذا كانت قيمة س + 7 = 19، فما قيمة 2س؟',
        options: ['24', '12', '26', '14'],
        correct_index: 0,
        duration: 30,
        explanation: 'س = 19 - 7 = 12. إذاً 2س = 2 × 12 = 24.'
      },
      {
        text: 'ما هو قياس زوايا المثلث متطابق الأضلاع بالدرجات؟',
        options: ['60 درجة لكل زاوية', '90 درجة', '45 درجة', '120 درجة'],
        correct_index: 0,
        duration: 25,
        explanation: 'مجموع زوايا المثلث 180 درجة، وبما أن الأضلاع متطابقة فالزوايا متساوية: 180 ÷ 3 = 60 درجة.'
      }
    );
  } else if (normalizedCategory.includes('علوم') || normalizedTopic.includes('علوم') || normalizedTopic.includes('فضاء') || normalizedTopic.includes('فيزياء') || normalizedTopic.includes('كيمياء')) {
    pool.push(
      {
        text: 'ما هو العضو المسؤول عن ضخ الدم إلى جميع أنحاء جسم الإنسان؟',
        options: ['القلب', 'الرئتان', 'الكبد', 'الكلى'],
        correct_index: 0,
        duration: 25,
        explanation: 'القلب هو العضلة الحيوية المركزية التي تضخ الدم المحمل بالأكسجين والمغذيات لخلايا الجسم.'
      },
      {
        text: 'أي الكواكب التالية يُعد أقرب الكواكب إلى الشمس في النظام الشمسي؟',
        options: ['عطارد (Mercury)', 'الزهرة (Venus)', 'المريخ (Mars)', 'الأرض (Earth)'],
        correct_index: 0,
        duration: 25,
        explanation: 'عطارد هو الكوكب الأقرب للشمس ويتميز بتفاوت درجات الحرارة الحاد بين ليله ونهاره.'
      },
      {
        text: 'ما الغاز الذي تستهلكه النباتات خلال عملية البناء الضوئي وتنتج الأكسجين بدلاً منه؟',
        options: ['ثاني أكسيد الكربون (CO2)', 'النيتروجين (N2)', 'الهيليوم (He)', 'الهيدروجين (H2)'],
        correct_index: 0,
        duration: 25,
        explanation: 'تمتص النباتات ثاني أكسيد الكربون والماء بوجود ضوء الشمس لتصنع السكر وتطلق الأكسجين.'
      },
      {
        text: 'ما هي وحدة قياس القوة في النظام الدولي للوحدات (SI)؟',
        options: ['النيوتن (Newton)', 'الجول (Joule)', 'الواط (Watt)', 'الباسكال (Pascal)'],
        correct_index: 0,
        duration: 30,
        explanation: 'النيوتن هو وحدة قياس القوة، وسُمي تكريماً للعالم إسحاق نيوتن واضع قوانين الحركة.'
      },
      {
        text: 'ما هي أصغر وحدة بنائية حية في جميع الكائنات الحية؟',
        options: ['الخلية (Cell)', 'الجزيء (Molecule)', 'الذرة (Atom)', 'النسيج (Tissue)'],
        correct_index: 0,
        duration: 25,
        explanation: 'الخلية هي الوحدة الأساسية الوظيفية والتركيبية في بناء جميع الكائنات الحية.'
      }
    );
  } else if (normalizedCategory.includes('لغة') || normalizedTopic.includes('عرب') || normalizedTopic.includes('نحو') || normalizedTopic.includes('بلاغة')) {
    pool.push(
      {
        text: 'ما هي علامة رفع الاسم المفرد وجمع التكسير الأصلية في اللغة العربية؟',
        options: ['الضمة الظاهرة', 'الفتحة', 'الألف', 'الواو'],
        correct_index: 0,
        duration: 25,
        explanation: 'الضمة هي علامة الرفع الأصلية للاسم المفرد وجمع التكسير وجمع المؤنث السالم.'
      },
      {
        text: 'ما نوع الأسلوب في قوله تعالى: {فَهَلْ إِلَىٰ خُرُوجٍ مِّن سَبِيلٍ}؟',
        options: ['استفهام غرضه التمني والرجاء', 'أمر غرضه الوجوب', 'نهي غرضه التحذير', 'نداء غرضه التنبيه'],
        correct_index: 0,
        duration: 30,
        explanation: 'الاستفهام هنا خرج عن معناه الحقيقي ليفيد التمني وطلب المستحيل.'
      },
      {
        text: 'ما إعراب الكلمة المخطوطة في: (أقبلَ الفائزُ مُبتسماً)؟',
        options: ['حال منصوبة وعلامة نصبها الفتحة', 'مفعول به منصوب', 'تمييز منصوب', 'نعت مرفوع'],
        correct_index: 0,
        duration: 25,
        explanation: 'كلمة (مبتسماً) تبين هيئة الفاعل عند وقوع الفعل، لذا تُعرب حالاً منصوبة.'
      },
      {
        text: 'كم عدد أحرف الإدغام في أحكام التجويد للنون الساكنة والتنوين؟',
        options: ['6 أحرف (مجموعة في كلمة يرملون)', '4 أحرف', '3 أحرف', '8 أحرف'],
        correct_index: 0,
        duration: 25,
        explanation: 'أحرف الإدغام ستة جُمعت في كلمة (يَرْمَلُون): الياء، الراء، الميم، اللام، الواو، النون.'
      }
    );
  } else if (normalizedCategory.includes('تقني') || normalizedTopic.includes('ذكاء') || normalizedTopic.includes('برمج') || normalizedTopic.includes('حاسب') || normalizedTopic.includes('سيبران')) {
    pool.push(
      {
        text: 'ما هو البروتوكول المشفر الآمن المستخدم لتصفح صفحات الويب عبر الإنترنت؟',
        options: ['HTTPS', 'FTP', 'Telnet', 'HTTP'],
        correct_index: 0,
        duration: 25,
        explanation: 'يستخدم HTTPS طبقة تشفير SSL/TLS لحماية بيانات التصفح وكلمات المرور من الاعتراض.'
      },
      {
        text: 'ما هو المفهوم الذي يُعبر عن شبكة من الأجهزة الفيزيائية المترابطة التي تجمع البيانات وتتبادلها عبر الإنترنت؟',
        options: ['إنترنت الأشياء (IoT)', 'الحوسبة السحابية', 'البلوكشين (Blockchain)', 'الواقع المعزز (AR)'],
        correct_index: 0,
        duration: 25,
        explanation: 'إنترنت الأشياء (Internet of Things) يربط الحساسات والأجهزة الذكية بشبكة الإنترنت.'
      },
      {
        text: 'أي من لغات البرمجة التالية تُعد الأكثر انتشاراً واعتماداً في تطبيقات الذكاء الاصطناعي وعلوم البيانات؟',
        options: ['بايثون (Python)', 'HTML', 'CSS', 'Assembly'],
        correct_index: 0,
        duration: 25,
        explanation: 'تتميز بايثون بمكتباتها الضخمة مثل PyTorch و TensorFlow و Scikit-learn وسهولة تركيبها النحوي.'
      },
      {
        text: 'ما هي الطريقة الفعالة لحماية الحسابات الإلكترونية من الاختراق حتى عند تسرب كلمة المرور؟',
        options: ['تفعيل التحقق بخطوتين (2FA / MFA)', 'استخدام كلمة مرور قصيرة', 'مشاركة كلمة المرور مع الأصدقاء', 'حفظ الكلمة في مذكرة غير مشفرة'],
        correct_index: 0,
        duration: 25,
        explanation: 'التحقق بخطوتين يتطلب رمزاً إضافياً من الهاتف أو تطبيق التوثيق، مما يمنع الدخول حتى لو عُرفت الكلمة.'
      }
    );
  } else {
    pool.push(
      {
        text: `في إطار موضوع (${topic || 'الثقافة العامة'})، ما هي الركيزة الأساسية للوصول إلى أعلى درجات الإتقان؟`,
        options: ['الممارسة المستمرة والتغذية الراجعة', 'الاعتماد على الحظ فقط', 'الاستعجال وعدم التخطيط', 'إلغاء التقييم الذاتي'],
        correct_index: 0,
        duration: 30,
        explanation: 'التدريب المنتظم المقترن بالتقويم المستمر هو الأساس العلمي لتطوير أي مهارة أو معرفة.'
      },
      {
        text: `أي المهارات التالية تُعد الأكثر أهمية في عصر المعرفة الرقمية عند دراسة (${topic || 'المجال التفاعلي'})؟`,
        options: ['التفكير النقدي وحل المشكلات', 'الحفظ الآلي دون فهم', 'تجنب البحث والتقصي', 'تجاهل المصادر الموثوقة'],
        correct_index: 0,
        duration: 30,
        explanation: 'التفكير النقدي يتيح تحليل المعلومات وتمييز الحقائق وبناء حلول مبتكرة للمشكلات.'
      },
      {
        text: 'ما هي عاصمة المملكة العربية السعودية والمركز الاقتصادي والإداري الأول فيها؟',
        options: ['مدينة الرياض', 'مدينة جدة', 'مدينة الدمام', 'المدينة المنورة'],
        correct_index: 0,
        duration: 25,
        explanation: 'الرياض هي عاصمة المملكة العربية السعودية وحاضنتها الإدارية والاقتصادية الكبرى.'
      },
      {
        text: 'ما هو العنصر الكيميائي الأكثر وفرة في الغلاف الجوي لكوكب الأرض بنسبة تقارب 78%؟',
        options: ['غاز النيتروجين', 'غاز الأكسجين', 'غاز الهيدروجين', 'غاز ثاني أكسيد الكربون'],
        correct_index: 0,
        duration: 25,
        explanation: 'يشكل غاز النيتروجين نحو 78% من الغلاف الجوي للأرض، يليه الأكسجين بنسبة نحو 21%.'
      }
    );
  }

  // Shuffle options and pick requested count
  const shuffledItems = pool.map(item => shuffleOptions(item));
  const result: GeneratedQuestionItem[] = [];
  for (let i = 0; i < Math.min(count, shuffledItems.length); i++) {
    result.push(shuffledItems[i]);
  }

  // If requested count is greater than available in pool, duplicate and vary
  while (result.length < count && pool.length > 0) {
    const randomPick = { ...pool[Math.floor(Math.random() * pool.length)] };
    randomPick.text = `${randomPick.text} [سؤال إضافي]`;
    result.push(shuffleOptions(randomPick));
  }

  return result.slice(0, count);
}
