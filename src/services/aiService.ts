import { Question } from '../types';

export interface GenerateQuestionsParams {
  topic: string;
  category: string;
  difficulty: 'سهل' | 'متوسط' | 'متقدم';
  count: number;
  audience: 'teachers' | 'students';
}

function shuffleQuestion<T extends { options: string[]; correctIndex: number }>(q: T): T {
  const correctText = q.options[q.correctIndex] ?? q.options[0];
  const shuffled = [...q.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newIndex = shuffled.indexOf(correctText);
  return {
    ...q,
    options: shuffled,
    correctIndex: newIndex >= 0 ? newIndex : 0
  };
}

export const AIService = {
  async generateQuestions(params: GenerateQuestionsParams): Promise<Question[]> {
    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item, idx) => shuffleQuestion({
            id: `q-auto-${Date.now()}-${idx}`,
            text: item.text,
            options: item.options || [],
            correctIndex: item.correct_index ?? 0,
            duration: item.duration || 30,
            explanation: item.explanation || '',
            category: params.category || 'عام'
          }));
        }
      }
    } catch {}

    return this.getCuratedQuestions(params).map(q => shuffleQuestion(q));
  },

  getCuratedQuestions(params: GenerateQuestionsParams): Question[] {
    const cat = params.category || '';
    const topicLower = (params.topic || '').toLowerCase();

    if (cat.includes('رياضيات') || topicLower.includes('حساب') || topicLower.includes('رياضيات') || topicLower.includes('هندسة')) {
      const mathPool: Question[] = [
        {
          id: `q-math-1-${Date.now()}`,
          text: 'ما هو ناتج العملية الحسابية: (15 × 4) + (36 ÷ 6)؟',
          options: ['66', '64', '60', '72'],
          correctIndex: 0,
          duration: 35,
          explanation: '(15 × 4 = 60) و (36 ÷ 6 = 6). 60 + 6 = 66.',
          category: 'الرياضيات'
        },
        {
          id: `q-math-2-${Date.now()}`,
          text: 'ما هو محيط مستطيل طوله 8 أمتار وعرضه 5 أمتار؟',
          options: ['26 متراً', '40 متراً', '13 متراً', '30 متراً'],
          correctIndex: 0,
          duration: 30,
          explanation: 'محيط المستطيل = 2 × (الطول + العرض) = 2 × (8 + 5) = 2 × 13 = 26 متراً.',
          category: 'الرياضيات'
        },
        {
          id: `q-math-3-${Date.now()}`,
          text: 'ما هو العدد الأولي الزوجي الوحيد بين جميع الأعداد الصحيحة؟',
          options: ['العدد 2', 'العدد 4', 'العدد 0', 'العدد 6'],
          correctIndex: 0,
          duration: 25,
          explanation: 'العدد 2 هو العدد الزوجي الوحيد الذي لا يقبل القسمة إلا على نفسه والواحد.',
          category: 'الرياضيات'
        },
        {
          id: `q-math-4-${Date.now()}`,
          text: 'إذا كان ثمن 4 دفاتر 24 ريالاً، فما هو ثمن 7 دفاتر من نفس النوع؟',
          options: ['42 ريالاً', '38 ريالاً', '48 ريالاً', '35 ريالاً'],
          correctIndex: 0,
          duration: 30,
          explanation: 'ثمن الدفتر الواحد = 24 ÷ 4 = 6 ريالات. ثمن 7 دفاتر = 7 × 6 = 42 ريالاً.',
          category: 'الرياضيات'
        },
        {
          id: `q-math-5-${Date.now()}`,
          text: 'كم عدد أضلاع الشكل الثماني المنتظم؟',
          options: ['8 أضلاع', '6 أضلاع', '10 أضلاع', '12 ضلعاً'],
          correctIndex: 0,
          duration: 20,
          explanation: 'الشكل الثماني يتكون من ثمانية أضلاع وثماني زوايا داخلية متساوية.',
          category: 'الرياضيات'
        }
      ];
      return mathPool.slice(0, params.count);
    }

    if (cat.includes('حاسب') || cat.includes('ذكاء') || topicLower.includes('تقنية') || topicLower.includes('برمجة') || topicLower.includes('ذكاء')) {
      const techPool: Question[] = [
        {
          id: `q-tech-1-${Date.now()}`,
          text: 'ما هي لغة البرمجة الأكثر انتشاراً عالمياً في بناء نماذج الذكاء الاصطناعي وتعلم الآلة؟',
          options: ['بايثون (Python)', 'إتش تي إم إل (HTML)', 'باسكال (Pascal)', 'سي إف بي'],
          correctIndex: 0,
          duration: 25,
          explanation: 'بايثون تتميز ببساطة تركيبها ووفرة أطر العمل المتقدمة مثل PyTorch وTensorFlow.',
          category: 'التقنية والذكاء الاصطناعي'
        },
        {
          id: `q-tech-2-${Date.now()}`,
          text: 'أي من المكونات التالية يعتبر مسؤولاً عن تشغيل الرسوميات وعمليات تدريب الشبكات العصبية بكفاءة عالية؟',
          options: ['وحدة معالجة الرسوميات (GPU)', 'القرص المدمج (CD-ROM)', 'لوحة المفاتيح', 'مزود الطاقة (Power Supply)'],
          correctIndex: 0,
          duration: 30,
          explanation: 'تتميز معالجات الـ GPU بقدرتها الهائلة على الحوسبة المتوازية الضرورية لمعالجة المصفوفات العصبية.',
          category: 'التقنية والذكاء الاصطناعي'
        },
        {
          id: `q-tech-3-${Date.now()}`,
          text: 'ماذا يطلق على نوع الحسابات التي تحفظ البيانات على خوادم بعيدة عبر الإنترنت وتتيح الوصول إليها من أي جهاز؟',
          options: ['الحوسبة السحابية (Cloud Computing)', 'الحوسبة المغناطيسية', 'التخزين الموضعي الصامت', 'المعالجة التماثلية'],
          correctIndex: 0,
          duration: 25,
          explanation: 'الحوسبة السحابية توفر مرونة الوصول للبيانات والبرمجيات عبر الشبكة العنكبوتية.',
          category: 'التقنية والذكاء الاصطناعي'
        },
        {
          id: `q-tech-4-${Date.now()}`,
          text: 'ما هو البروتوكول المشفر والآمن لنقل صفحات الويب وتأمين حركة المرور بين المتصفح والخادم؟',
          options: ['HTTPS', 'FTP', 'SMTP', 'POP3'],
          correctIndex: 0,
          duration: 20,
          explanation: 'البروتوكول HTTPS يعتمد تقنية التشفير SSL/TLS لحماية خصوصية بيانات المستخدم.',
          category: 'التقنية والذكاء الاصطناعي'
        },
        {
          id: `q-tech-5-${Date.now()}`,
          text: 'ما المصطلح الذي يعبر عن تدريب الحاسب على إدراك الصور والتعرف على الوجوه والكائنات؟',
          options: ['الرؤية الحاسوبية (Computer Vision)', 'التوليد الصوتي البسيط', 'هندسة الكابلات', 'الضغط الرقمي'],
          correctIndex: 0,
          duration: 25,
          explanation: 'الرؤية الحاسوبية مجال ذكاء اصطناعي يهتم باستخلاص المعلومات وفهم الصور والفيديوهات الرقمية.',
          category: 'التقنية والذكاء الاصطناعي'
        }
      ];
      return techPool.slice(0, params.count);
    }

    if (cat.includes('عربي') || topicLower.includes('لغة') || topicLower.includes('نحو') || topicLower.includes('إملاء')) {
      const arabicPool: Question[] = [
        {
          id: `q-ar-1-${Date.now()}`,
          text: 'أي من الكلمات التالية كتبت فيها همزة الوصل كتابة صحيحة قياسية؟',
          options: ['استكشاف', 'إستكشاف', 'أستكشاف', 'استِكشافْ'],
          correctIndex: 0,
          duration: 25,
          explanation: 'مصدر الفعل السداسي يبدأ دائماً بهمزة وصل دون كتابة رأس العين.',
          category: 'اللغة العربية'
        },
        {
          id: `q-ar-2-${Date.now()}`,
          text: 'ما هي علامة رفع الفاعل إذا كان جمع مذكر سالماً؟',
          options: ['الواو', 'الضمة المقدرة', 'الألف', 'ثبوت النون'],
          correctIndex: 0,
          duration: 20,
          explanation: 'يرفع جمع المذكر السالم بالواو نيابة عن الضمة، مثل: فاز المتسابقون.',
          category: 'اللغة العربية'
        },
        {
          id: `q-ar-3-${Date.now()}`,
          text: 'ما هو جمع كلمة "مضمار" في المعجم العربي؟',
          options: ['مضامير', 'مضمارات', 'أضمار', 'مضامر'],
          correctIndex: 0,
          duration: 20,
          explanation: 'تجمع مضمار على مضامير وفق صيغ منتهى الجموع.',
          category: 'اللغة العربية'
        },
        {
          id: `q-ar-4-${Date.now()}`,
          text: 'أي من الجمل التالية تشتمل على أسلوب تعجب قياسي سليم؟',
          options: ['ما أجملَ التفوقَ العلمي!', 'هل التفوق جميل؟', 'حبذا التفوق العلمي', 'التفوق ما أجمله فقط'],
          correctIndex: 0,
          duration: 25,
          explanation: 'صيغة (ما أفعلَ كذا!) هي الصيغة القياسية الأولى للتعجب في البلاغة والنحو.',
          category: 'اللغة العربية'
        },
        {
          id: `q-ar-5-${Date.now()}`,
          text: 'ما نوع المشتق في كلمة "مُعَلِّم"؟',
          options: ['اسم فاعل من فعل غير ثلاثي', 'اسم مفعول', 'صيغة مبالغة', 'اسم آلة'],
          correctIndex: 0,
          duration: 25,
          explanation: 'معلِّم مشتق من الفعل الرباعي (علَّم - يعلِّم - معلِّم) بضم أوله وكسر ما قبل آخره.',
          category: 'اللغة العربية'
        }
      ];
      return arabicPool.slice(0, params.count);
    }

    if (cat.includes('تاريخ') || cat.includes('وطني') || topicLower.includes('سعودي') || topicLower.includes('وطن')) {
      const nationalPool: Question[] = [
        {
          id: `q-nat-1-${Date.now()}`,
          text: 'في أي عام أعلن الملك عبدالعزيز بن عبدالرحمن آل سعود -رحمه الله- توحيد المملكة العربية السعودية؟',
          options: ['1351 هـ / 1932 م', '1344 هـ / 1925 م', '1360 هـ / 1941 م', '1338 هـ / 1919 م'],
          correctIndex: 0,
          duration: 20,
          explanation: 'صدر المرسوم الملكي بتوحيد أرجاء الوطن تحت اسم المملكة العربية السعودية في 23 سبتمبر 1932 م.',
          category: 'الثقافة الوطنية'
        },
        {
          id: `q-nat-2-${Date.now()}`,
          text: 'ما هو اليوم الذي تحتفي فيه المملكة سنوياً بذكرى تأسيس الدولة السعودية الأولى على يد الإمام محمد بن سعود؟',
          options: ['يوم التأسيس (22 فبراير)', 'اليوم الوطني (23 سبتمبر)', 'يوم العَلم (11 مارس)', 'يوم البيعة'],
          correctIndex: 0,
          duration: 20,
          explanation: 'يوم 22 فبراير يوافق ذكرى تأسيس الدولة السعودية الأولى في الدرعية عام 1727 م.',
          category: 'الثقافة الوطنية'
        },
        {
          id: `q-nat-3-${Date.now()}`,
          text: 'ما هي المدينة التاريخية المسجلة في اليونسكو والتي تحتضن حي الطريف التاريخي عاصمة الدولة الأولى؟',
          options: ['الدرعية', 'العلا', 'جدة التاريخية', 'الأحساء'],
          correctIndex: 0,
          duration: 25,
          explanation: 'حي الطريف بالدرعية مهد انطلاق الدولة السعودية الأولى وأحد أعرق المواقع التراثية المسجلة عالمياً.',
          category: 'الثقافة الوطنية'
        },
        {
          id: `q-nat-4-${Date.now()}`,
          text: 'ما هو المشروع البيئي الوطني الطموح الذي أطلقته القيادة الرشيدة لزراعة 10 مليارات شجرة في المملكة؟',
          options: ['مبادرة السعودية الخضراء', 'مشروع نيوم الزراعي', 'مشروع أمالا', 'مبادرة حصاد المياه'],
          correctIndex: 0,
          duration: 25,
          explanation: 'تهدف مبادرة السعودية الخضراء إلى مكافحة التصحر وزراعة مليارات الأشجار وتخفيض الانبعاثات الكربونية.',
          category: 'الثقافة الوطنية'
        },
        {
          id: `q-nat-5-${Date.now()}`,
          text: 'أي من المناطق التالية في المملكة العربية السعودية تحتضن مشروع "نيوم" وموقع "ذا لاين" المستقبلي؟',
          options: ['منطقة تبوك (شمال غرب المملكة)', 'منطقة عسير', 'منطقة نجران', 'المنطقة الشرقية'],
          correctIndex: 0,
          duration: 20,
          explanation: 'يقع مشروع نيوم شمال غرب المملكة في منطقة تبوك على ساحل البحر الأحمر.',
          category: 'الثقافة الوطنية'
        }
      ];
      return nationalPool.slice(0, params.count);
    }

    const defaultPool: Question[] = [
      {
        id: `q-gen-1-${Date.now()}`,
        text: 'ما هي الوحدة البنائية الأساسية لجميع الكائنات الحية على وجه الأرض؟',
        options: ['الخلية', 'الذرة', 'النسيج', 'العضو'],
        correctIndex: 0,
        duration: 25,
        explanation: 'الخلية هي أصغر وحدة حية قادرة على القيام بجميع الوظائف الحيوية الأساسية.',
        category: 'العلوم العامة'
      },
      {
        id: `q-gen-2-${Date.now()}`,
        text: 'ما هو أسرع شيء في الكون وفق النظرية النسبية الخاصة للفيزياء؟',
        options: ['سرعة الضوء في الفراغ (300 ألف كم/ث)', 'سرعة الصوت في الماء', 'سرعة الرياح الشمسية', 'حركة الصواريخ'],
        correctIndex: 0,
        duration: 25,
        explanation: 'تبلغ سرعة الضوء حوالي 299,792 كيلومتر في الثانية وهي الحد الأقصى الكوني لانتقال المعلومات.',
        category: 'الفيزياء'
      },
      {
        id: `q-gen-3-${Date.now()}`,
        text: 'أي من الكواكب التالية يعتبر الأكبر حجماً وكتلة في مجموعتنا الشمسية؟',
        options: ['المشتري', 'زحل', 'الأرض', 'أورانوس'],
        correctIndex: 0,
        duration: 20,
        explanation: 'المشتري كوكب غازي عملاق تفوق كتلته مجموع كتل كافة كواكب المجموعة الشمسية مجتمعة.',
        category: 'علوم الفضاء'
      },
      {
        id: `q-gen-4-${Date.now()}`,
        text: 'ما هي المادة النقية التي تتكون من نوع واحد فقط من الذرات ولا يمكن تجزئتها كيميائياً؟',
        options: ['العنصر', 'المركب', 'المخلوط', 'المحلول'],
        correctIndex: 0,
        duration: 25,
        explanation: 'العنصر الكيميائي يتألف من ذرات متطابقة في العدد الذري مثل الذهب والأكسجين.',
        category: 'الكيمياء'
      },
      {
        id: `q-gen-5-${Date.now()}`,
        text: 'ما هي وسيلة تحويل الطاقة الحركية للرياح إلى طاقة كهربائية متجددة؟',
        options: ['توربينات الرياح', 'الخلايا الشمسية', 'المفاعلات الحرارية', 'المكابس الهيدروليكية'],
        correctIndex: 0,
        duration: 25,
        explanation: 'توربينات الرياح تحول طاقة الرياح الميكانيكية عبر المولدات إلى طاقة كهربائية نظيفة.',
        category: 'الطاقة المستدامة'
      }
    ];

    return defaultPool.slice(0, Math.min(params.count, defaultPool.length));
  }
};
