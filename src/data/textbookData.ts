export interface ChapterLesson {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  lessonNumber: number;
  lessonTitle: string;
  bookPage: number;
  pdfPage: number; // PDF page = bookPage + 1
  summary: string;
  keyFormulas: string[];
  linkedPresetId?: string;
  linked3DMode?: 'cross-section' | 'revolution' | 'space-lines' | 'orthographic';
}

export interface GeometryPreset {
  id: string;
  title: string;
  chapterRef: string;
  bookPage: number;
  description: string;
  steps: string[];
  points: { id: string; label: string; x: number; y: number; locked?: boolean }[];
  segments: { id: string; p1: string; p2: string; style?: 'solid' | 'dashed' | 'accent'; label?: string }[];
  circles: { id: string; center: string; radiusPoint?: string; fixedRadius?: number; style?: 'compass' | 'solid' }[];
  polygons?: { id: string; vertices: string[]; fill?: string }[];
}

export interface TheoremEntry {
  id: string;
  chapter: number;
  title: string;
  category: 'قضیه' | 'عکس قضیه' | 'قضیه دوشرطی' | 'برهان خلف' | 'مثال نقض' | 'فرمول';
  bookPage: number;
  assumption: string; // فرض
  conclusion: string; // حکم
  proofSteps: string[];
  counterExample?: string;
}

export const TEXTBOOK_PDF_URL = '/assets/aistudio/______2044bb79.pdf';

export const TEXTBOOK_LESSONS: ChapterLesson[] = [
  {
    id: 'ch1-l1',
    chapterNumber: 1,
    chapterTitle: 'فصل ۱: ترسیم‌های هندسی و استدلال',
    lessonNumber: 1,
    lessonTitle: 'درس اول: ترسیم‌های هندسی (خط‌کش و پرگار، نیمساز و عمودمنصف)',
    bookPage: 10,
    pdfPage: 11,
    summary:
      'آشنایی با مکان هندسی نقاط هم‌فاصله، ترسیم مثلث با سه ضلع، خواص و ترسیم نیمساز زاویه، عمودمنصف پاره‌خط، خط عمود و خط موازی تنها با خط‌کش و پرگار.',
    keyFormulas: [
      'شرط تشکیل مثلث: |R₁ - R₂| < d < R₁ + R₂',
      'خاصیت نیمساز: هر نقطه روی نیمساز زاویه از دو ضلع آن به یک فاصله است',
      'خاصیت عمودمنصف: هر نقطه روی عمودمنصف پاره‌خط از دو سر آن به یک فاصله است (WA = WB)',
    ],
    linkedPresetId: 'preset-perp-bisector',
  },
  {
    id: 'ch1-l2',
    chapterNumber: 1,
    chapterTitle: 'فصل ۱: ترسیم‌های هندسی و استدلال',
    lessonNumber: 2,
    lessonTitle: 'درس دوم: استدلال (استقرا، استنتاج، برهان خلف و مثال نقض)',
    bookPage: 17,
    pdfPage: 18,
    summary:
      'تفاوت استدلال استقرایی و استنتاجی، اثبات همرسی عمودمنصف‌ها، ارتفاع‌ها و نیمسازهای مثلث، قضیه ضلع و زاویه نابرابر، عکس قضیه، قضایای دوشرطی، برهان خلف و مثال نقض.',
    keyFormulas: [
      'قضیه ۱ (دوشرطی): در هر مثلث AB > AC ⇔ ∠C > ∠B',
      'نامساوی مثلثی: در هر مثلث AB + AC > BC',
      'مجموع زوایای داخلی چهارضلعی محدب = ۳۶۰°',
    ],
    linkedPresetId: 'preset-concurrency',
  },
  {
    id: 'ch2-l1',
    chapterNumber: 2,
    chapterTitle: 'فصل ۲: قضیه تالس، تشابه و کاربردهای آن',
    lessonNumber: 1,
    lessonTitle: 'درس اول: نسبت و تناسب در هندسه و واسطه هندسی',
    bookPage: 30,
    pdfPage: 31,
    summary:
      'ویژگی‌های تناسب (طرفین‌وسطین، ترکیب و تفضیل نسبت در صورت و مخرج)، نسبت مساحت دو مثلث هم‌ارتفاع یا هم‌قاعده و تعریف واسطه (میانگین) هندسی.',
    keyFormulas: [
      'در هر مثلث: a · hₐ = b · h_b = c · h_c = 2S',
      'واسطه هندسی: a/b = b/c ⇔ b² = a·c',
      'نسبت مساحت مثلث‌های هم‌ارتفاع: S₁ / S₂ = b₁ / b₂',
    ],
    linkedPresetId: 'preset-equal-area-parallel',
  },
  {
    id: 'ch2-l2',
    chapterNumber: 2,
    chapterTitle: 'فصل ۲: قضیه تالس، تشابه و کاربردهای آن',
    lessonNumber: 2,
    lessonTitle: 'درس دوم: قضیه تالس، تعمیم و عکس قضیه تالس',
    bookPage: 34,
    pdfPage: 35,
    summary:
      'اثبات قضیه تالس با مساحت‌ها، تعمیم قضیه تالس در مثلث، عکس قضیه تالس با برهان خلف و کاربرد در محاسبه ارتفاع‌های غیرقابل دسترس.',
    keyFormulas: [
      'قضیه تالس: DE || BC ⇒ AD / DB = AE / EC',
      'تعمیم قضیه تالس: DE || BC ⇒ AD / AB = AE / AC = DE / BC',
    ],
    linkedPresetId: 'preset-thales',
  },
  {
    id: 'ch2-l3',
    chapterNumber: 2,
    chapterTitle: 'فصل ۲: قضیه تالس، تشابه و کاربردهای آن',
    lessonNumber: 3,
    lessonTitle: 'درس سوم: تشابه مثلث‌ها و روابط طولی در مثلث قائم‌الزاویه',
    bookPage: 38,
    pdfPage: 39,
    summary:
      'قضیه اساسی تشابه، سه حالت تشابه مثلث‌ها (دو زاویه، دو ضلع و زاویه بین، سه ضلع متناسب) و اثبات قضیه فیثاغورس و روابط طولی.',
    keyFormulas: [
      'AB² = BC · BH  ،  AC² = BC · CH',
      'AH² = BH · CH  ،  AH · BC = AB · AC',
      'قضیه فیثاغورس: AB² + AC² = BC²',
    ],
    linkedPresetId: 'preset-right-metric',
  },
  {
    id: 'ch2-l4',
    chapterNumber: 2,
    chapterTitle: 'فصل ۲: قضیه تالس، تشابه و کاربردهای آن',
    lessonNumber: 4,
    lessonTitle: 'درس چهارم: کاربردهایی از قضیه تالس و تشابه مثلث‌ها',
    bookPage: 45,
    pdfPage: 46,
    summary:
      'نسبت اجزای فرعی (ارتفاع‌ها، میانه‌ها، نیمسازها) و محیط‌های دو شکل متشابه برابر با k و نسبت مساحت‌های آن‌ها برابر با k².',
    keyFormulas: [
      'P′ / P = h′ / h = m′ / m = d′ / d = k',
      'S′ / S = k² (مربع نسبت تشابه)',
    ],
    linkedPresetId: 'preset-thales',
  },
  {
    id: 'ch3-l1',
    chapterNumber: 3,
    chapterTitle: 'فصل ۳: چندضلعی‌ها',
    lessonNumber: 1,
    lessonTitle: 'درس اول: چندضلعی‌ها و ویژگی‌های چهارضلعی‌های مهم',
    bookPage: 54,
    pdfPage: 55,
    summary:
      'تعریف چندضلعی محدب و مقعر، تعداد قطرهای nضلعی، قضایای متوازی‌الاضلاع، مستطیل، لوزی، مربع، میانه وارد بر وتر و ذوزنقه متساوی‌الساقین.',
    keyFormulas: [
      'تعداد قطرهای هر nضلعی: n(n - 3) / 2',
      'میانه وارد بر وتر در مثلث قائم‌الزاویه: AM = BC / 2',
      'در هر مثلث قائم‌الزاویه ضلع روبه‌رو به زاویه ۳۰° نصف وتر است',
    ],
    linkedPresetId: 'preset-parallelogram',
  },
  {
    id: 'ch3-l2',
    chapterNumber: 3,
    chapterTitle: 'فصل ۳: چندضلعی‌ها',
    lessonNumber: 2,
    lessonTitle: 'درس دوم: مساحت، همرسی میانه‌ها و فرمول پیک (نقاط شبکه‌ای)',
    bookPage: 65,
    pdfPage: 66,
    summary:
      'مساحت چهارضلعی‌های با قطرهای عمود برهم، تقسیم مثلث به ۶ مثلث هم‌مساحت توسط میانه‌ها (نسبت ۲ به ۱)، قضیه ویویانی و فرمول پیک برای چندضلعی‌های شبکه‌ای.',
    keyFormulas: [
      'مساحت چهارضلعی با قطرهای عمود بر هم: S = ½ · AC · BD',
      'همرسی میانه‌ها در G: AG = (2/3)AM  و  GM = (1/3)AM',
      'فرمول پیک (Pick’s Theorem): S = (b / 2) + i - 1',
    ],
    linkedPresetId: 'preset-centroid',
  },
  {
    id: 'ch4-l1',
    chapterNumber: 4,
    chapterTitle: 'فصل ۴: تجسم فضایی',
    lessonNumber: 1,
    lessonTitle: 'درس اول: خط، نقطه و صفحه در فضا، خطوط متنافر و تعامد',
    bookPage: 78,
    pdfPage: 79,
    summary:
      'حالت‌های مختلف دو خط در فضا (موازی، متقاطع، متنافر)، خط و صفحه، دو صفحه و شرایط تعامد خط بر صفحه و دو صفحه بر هم.',
    keyFormulas: [
      'دو خط در فضا: موازی (هم‌صفحه)، متقاطع (هم‌صفحه) یا متنافر (غیرهم‌صفحه)',
      'شرط تعامد خط بر صفحه: عمود بودن بر دو خط متقاطع از صفحه در محل تقاطع',
    ],
    linked3DMode: 'space-lines',
  },
  {
    id: 'ch4-l2',
    chapterNumber: 4,
    chapterTitle: 'فصل ۴: تجسم فضایی',
    lessonNumber: 2,
    lessonTitle: 'درس دوم: تفکر تجسمی، نماهای سه‌گانه، برش و دوران حول محور',
    bookPage: 87,
    pdfPage: 88,
    summary:
      'ترسیم نمای روبه‌رو، بالا و چپ اجسام مکعبی، بررسی سطح مقطع حاصل از برش مخروط، استوانه، مکعب و کره با صفحه، و احجام حاصل از دوران حول محور.',
    keyFormulas: [
      'مقاطع مخروطی: دایره، بیضی، سهمی و هذلولی',
      'برش کره به شعاع R در فاصله d از مرکز: دایره‌ای به شعاع r = √(R² - d²)',
      'دوران مستطیل حول ضلع → استوانه | دوران مثلث قائم‌الزاویه حول ضلع قائمه → مخروط',
    ],
    linked3DMode: 'cross-section',
  },
];

export const GEOMETRY_PRESETS: GeometryPreset[] = [
  {
    id: 'preset-perp-bisector',
    title: 'ترسیم عمودمنصف پاره‌خط AB با خط‌کش و پرگار (فصل ۱ ص ۱۴)',
    chapterRef: 'فصل ۱ — درس اول',
    bookPage: 14,
    description:
      'دهانه پرگار را بیش از نصف طول AB باز کرده و دو کمان به مراکز A و B می‌زنیم تا یکدیگر را در نقاط U و V قطع کنند. خط UV عمودمنصف AB است.',
    steps: [
      '۱. پاره‌خط AB را در صفحه مشخص می‌کنیم.',
      '۲. دهانه پرگار را به شعاع یکسان (بیش از نصف AB) باز کرده و به مرکز A کمانی می‌زنیم.',
      '۳. با همان شعاع به مرکز B کمان دومی می‌زنیم تا کمان اول را در U و V قطع کند.',
      '۴. چون AU = BU و AV = BV، خط گذرنده از U و V عمودمنصف پاره‌خط AB است (و از وسط M می‌گذرد).',
    ],
    points: [
      { id: 'A', label: 'A', x: 240, y: 260 },
      { id: 'B', label: 'B', x: 520, y: 260 },
      { id: 'U', label: 'U', x: 380, y: 115 },
      { id: 'V', label: 'V', x: 380, y: 405 },
      { id: 'M', label: 'M', x: 380, y: 260 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid', label: 'AB' },
      { id: 's-uv', p1: 'U', p2: 'V', style: 'accent', label: 'عمودمنصف' },
      { id: 's-au', p1: 'A', p2: 'U', style: 'dashed' },
      { id: 's-bu', p1: 'B', p2: 'U', style: 'dashed' },
      { id: 's-av', p1: 'A', p2: 'V', style: 'dashed' },
      { id: 's-bv', p1: 'B', p2: 'V', style: 'dashed' },
    ],
    circles: [
      { id: 'c-a', center: 'A', radiusPoint: 'U', style: 'compass' },
      { id: 'c-b', center: 'B', radiusPoint: 'U', style: 'compass' },
    ],
  },
  {
    id: 'preset-angle-bisector',
    title: 'ترسیم نیمساز زاویه xOy با پرگار (فصل ۱ ص ۱۲)',
    chapterRef: 'فصل ۱ — درس اول',
    bookPage: 12,
    description:
      'کمانی به مرکز O می‌زنیم تا دو ضلع زاویه را در A و B قطع کند (OA=OB). سپس از A و B دو کمان هم‌شعاع می‌زنیم تا در W متقاطع شوند. نیم‌خط OW نیمساز است.',
    steps: [
      '۱. به مرکز رأس O کمانی می‌زنیم تا اضلاع زاویه را در A و B قطع کند (OA = OB).',
      '۲. به مراکز A و B با شعاع مساوی دو کمان می‌زنیم تا در نقطه W متقاطع شوند (AW = BW).',
      '۳. دو مثلث OAW و OBW به حالت (ض‌ض‌ض) هم‌نهشت‌اند؛ پس ∠AOW = ∠BOW و OW نیمساز است.',
    ],
    points: [
      { id: 'O', label: 'O', x: 180, y: 360 },
      { id: 'X', label: 'x', x: 460, y: 120 },
      { id: 'Y', label: 'y', x: 540, y: 360 },
      { id: 'A', label: 'A', x: 302, y: 255 },
      { id: 'B', label: 'B', x: 341, y: 360 },
      { id: 'W', label: 'W', x: 445, y: 268 },
    ],
    segments: [
      { id: 's-ox', p1: 'O', p2: 'X', style: 'solid' },
      { id: 's-oy', p1: 'O', p2: 'Y', style: 'solid' },
      { id: 's-ow', p1: 'O', p2: 'W', style: 'accent', label: 'نیمساز OW' },
      { id: 's-aw', p1: 'A', p2: 'W', style: 'dashed' },
      { id: 's-bw', p1: 'B', p2: 'W', style: 'dashed' },
    ],
    circles: [
      { id: 'c-o', center: 'O', radiusPoint: 'B', style: 'compass' },
      { id: 'c-a', center: 'A', radiusPoint: 'W', style: 'compass' },
      { id: 'c-b', center: 'B', radiusPoint: 'W', style: 'compass' },
    ],
  },
  {
    id: 'preset-concurrency',
    title: 'همرسی عمودمنصف‌ها و دایره محیطی مثلث (فصل ۱ ص ۱۹)',
    chapterRef: 'فصل ۱ — درس دوم',
    bookPage: 19,
    description:
      'برخورد عمودمنصف‌های دو ضلع AB و AC در نقطه O باعث می‌شود OA = OB = OC؛ پس O روی عمودمنصف ضلع سوم نیز قرار دارد.',
    steps: [
      '۱. نقطه O روی عمودمنصف AB است ⇒ OA = OB.',
      '۲. نقطه O روی عمودمنصف AC است ⇒ OA = OC.',
      '۳. از (۱) و (۲) نتیجه می‌گیریم OB = OC؛ بنابراین O روی عمودمنصف BC نیز قرار دارد.',
    ],
    points: [
      { id: 'A', label: 'A', x: 360, y: 120 },
      { id: 'B', label: 'B', x: 200, y: 360 },
      { id: 'C', label: 'C', x: 540, y: 360 },
      { id: 'O', label: 'O', x: 370, y: 268 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid' },
      { id: 's-ca', p1: 'C', p2: 'A', style: 'solid' },
      { id: 's-oa', p1: 'O', p2: 'A', style: 'dashed', label: 'R' },
      { id: 's-ob', p1: 'O', p2: 'B', style: 'dashed', label: 'R' },
      { id: 's-oc', p1: 'O', p2: 'C', style: 'dashed', label: 'R' },
    ],
    circles: [{ id: 'c-circum', center: 'O', radiusPoint: 'A', style: 'solid' }],
    polygons: [{ id: 'poly-abc', vertices: ['A', 'B', 'C'], fill: 'rgba(2, 132, 199, 0.07)' }],
  },
  {
    id: 'preset-thales',
    title: 'قضیه تالس و تعمیم آن در مثلث ABC (فصل ۲ ص ۳۴–۳۵)',
    chapterRef: 'فصل ۲ — درس دوم',
    bookPage: 34,
    description:
      'خط DE موازی ضلع BC رسم شده است. با جابه‌جایی رئوس مشاهده کنید که نسبت AD/DB = AE/EC و AD/AB = DE/BC برقرار است.',
    steps: [
      '۱. مثلث‌های DAE و DEC هم‌ارتفاع‌اند ⇒ S(DAE)/S(DEC) = AE/EC.',
      '۲. مثلث‌های DAE و DBE هم‌ارتفاع‌اند ⇒ S(DAE)/S(DBE) = AD/DB.',
      '۳. چون DE || BC، دو مثلث DBE و DEC هم‌مساحت‌اند؛ پس AD/DB = AE/EC.',
    ],
    points: [
      { id: 'A', label: 'A', x: 370, y: 100 },
      { id: 'B', label: 'B', x: 190, y: 380 },
      { id: 'C', label: 'C', x: 570, y: 380 },
      { id: 'D', label: 'D', x: 298, y: 212 },
      { id: 'E', label: 'E', x: 450, y: 212 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid', label: 'BC' },
      { id: 's-ca', p1: 'C', p2: 'A', style: 'solid' },
      { id: 's-de', p1: 'D', p2: 'E', style: 'accent', label: 'DE || BC' },
      { id: 's-be', p1: 'B', p2: 'E', style: 'dashed' },
      { id: 's-cd', p1: 'C', p2: 'D', style: 'dashed' },
    ],
    circles: [],
    polygons: [{ id: 'poly-ade', vertices: ['A', 'D', 'E'], fill: 'rgba(217, 119, 6, 0.10)' }],
  },
  {
    id: 'preset-right-metric',
    title: 'روابط طولی و فیثاغورس در مثلث قائم‌الزاویه (فصل ۲ ص ۴۲)',
    chapterRef: 'فصل ۲ — درس سوم',
    bookPage: 42,
    description:
      'در مثلث قائم‌الزاویه ABC (∠A=90°)، ارتفاع AH وارد بر وتر، مثلث را به دو مثلث متشابه ABH و ACH تفکیک می‌کند.',
    steps: [
      '۱. ΔABH ~ ΔABC ⇒ AB² = BC · BH',
      '۲. ΔACH ~ ΔABC ⇒ AC² = BC · CH',
      '۳. ΔABH ~ ΔACH ⇒ AH² = BH · CH',
      '۴. از جمع (۱) و (۲): AB² + AC² = BC(BH + CH) = BC² (قضیه فیثاغورس).',
    ],
    points: [
      { id: 'A', label: 'A (90°)', x: 312, y: 146 },
      { id: 'B', label: 'B', x: 180, y: 344 },
      { id: 'C', label: 'C', x: 580, y: 344 },
      { id: 'H', label: 'H', x: 312, y: 344 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid', label: 'c' },
      { id: 's-ac', p1: 'A', p2: 'C', style: 'solid', label: 'b' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid', label: 'a (وتر)' },
      { id: 's-ah', p1: 'A', p2: 'H', style: 'accent', label: 'h' },
    ],
    circles: [],
    polygons: [{ id: 'poly-abc', vertices: ['A', 'B', 'C'], fill: 'rgba(2, 132, 199, 0.06)' }],
  },
  {
    id: 'preset-centroid',
    title: 'همرسی سه میانه و تقسیم مثلث به ۶ مثلث هم‌مساحت (فصل ۳ ص ۶۷)',
    chapterRef: 'فصل ۳ — درس دوم',
    bookPage: 67,
    description:
      'سه میانه AM، BN و CP در نقطه G همرس‌اند به طوری که AG = 2GM و مثلث را به ۶ مثلث با مساحت‌های مساوی تقسیم می‌کنند.',
    steps: [
      '۱. نقاط M، N و P وسط‌های اضلاع BC، AC و AB هستند.',
      '۲. سه میانه در نقطه G (مرکز ثقل) همرس‌اند و فاصله G تا هر رأس ۲ برابر فاصله آن تا وسط ضلع است.',
      '۳. مساحت هر ۶ مثلث کوچک درون شکل دقیقاً برابر با ⅙ مساحت کل مثلث ABC است.',
    ],
    points: [
      { id: 'A', label: 'A', x: 360, y: 100 },
      { id: 'B', label: 'B', x: 180, y: 380 },
      { id: 'C', label: 'C', x: 570, y: 380 },
      { id: 'M', label: 'M', x: 375, y: 380 },
      { id: 'N', label: 'N', x: 465, y: 240 },
      { id: 'P', label: 'P', x: 270, y: 240 },
      { id: 'G', label: 'G', x: 370, y: 286.7 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid' },
      { id: 's-ca', p1: 'C', p2: 'A', style: 'solid' },
      { id: 's-am', p1: 'A', p2: 'M', style: 'accent', label: 'میانه AM' },
      { id: 's-bn', p1: 'B', p2: 'N', style: 'accent', label: 'میانه BN' },
      { id: 's-cp', p1: 'C', p2: 'P', style: 'accent', label: 'میانه CP' },
    ],
    circles: [],
    polygons: [{ id: 'poly-abc', vertices: ['A', 'B', 'C'], fill: 'rgba(5, 150, 105, 0.06)' }],
  },
  {
    id: 'preset-equal-area-parallel',
    title: 'مسئله مرز مشترک دو کشاورز با حفظ مساحت (فصل ۳ ص ۶۸)',
    chapterRef: 'فصل ۳ — درس دوم',
    bookPage: 68,
    description:
      'تبدیل مرز شکسته ABC بین دو مزرعه به یک خط راست AF بدون تغییر مساحت زمین‌های دو کشاورز به کمک خط موازی.',
    steps: [
      '۱. دو رأس A و C را با خط چین به هم وصل می‌کنیم.',
      '۲. از نقطه B خطی موازی AC رسم می‌کنیم تا مرز پایین را در F قطع کند.',
      '۳. چون BF || AC، مثلث‌های ABC و AFC دارای قاعده مشترک AC و ارتفاع برابرند ⇒ S(ABC) = S(AFC).',
      '۴. با حذف مثلث مشترک AOC از طرفین، S(AOB) = S(FOC)؛ پس مرز مستقیم AF مساحت دو مزرعه را حفظ می‌کند.',
    ],
    points: [
      { id: 'A', label: 'A', x: 410, y: 110 },
      { id: 'B', label: 'B', x: 320, y: 250 },
      { id: 'C', label: 'C', x: 420, y: 380 },
      { id: 'F', label: 'F', x: 328, y: 380 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid', label: 'مرز قدیم' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid' },
      { id: 's-ac', p1: 'A', p2: 'C', style: 'dashed', label: 'AC' },
      { id: 's-bf', p1: 'B', p2: 'F', style: 'dashed', label: 'BF || AC' },
      { id: 's-af', p1: 'A', p2: 'F', style: 'accent', label: 'مرز جدید AF' },
    ],
    circles: [],
    polygons: [
      { id: 'poly-abc', vertices: ['A', 'B', 'C'], fill: 'rgba(2, 132, 199, 0.08)' },
      { id: 'poly-afc', vertices: ['A', 'F', 'C'], fill: 'rgba(217, 119, 6, 0.08)' },
    ],
  },
  {
    id: 'preset-parallelogram',
    title: 'ویژگی‌های متوازی‌الاضلاع و منصف بودن قطرها (فصل ۳ ص ۵۸)',
    chapterRef: 'فصل ۳ — درس اول',
    bookPage: 58,
    description:
      'در هر متوازی‌الاضلاع ABCD، اضلاع روبه‌رو موازی و مساوی‌اند و دو قطر AC و BD در نقطه O یکدیگر را نصف می‌کنند.',
    steps: [
      '۱. ضلع‌های مقابل دو به دو موازی و مساوی‌اند: AB = CD و AD = BC.',
      '۲. مثلث‌های AOB و COD به حالت (ز‌ض‌ز) هم‌نهشت‌اند.',
      '۳. در نتیجه OA = OC و OB = OD (قطرها منصف یکدیگرند).',
    ],
    points: [
      { id: 'A', label: 'A', x: 250, y: 150 },
      { id: 'B', label: 'B', x: 550, y: 150 },
      { id: 'C', label: 'C', x: 490, y: 350 },
      { id: 'D', label: 'D', x: 190, y: 350 },
      { id: 'O', label: 'O', x: 370, y: 250 },
    ],
    segments: [
      { id: 's-ab', p1: 'A', p2: 'B', style: 'solid' },
      { id: 's-bc', p1: 'B', p2: 'C', style: 'solid' },
      { id: 's-cd', p1: 'C', p2: 'D', style: 'solid' },
      { id: 's-da', p1: 'D', p2: 'A', style: 'solid' },
      { id: 's-ac', p1: 'A', p2: 'C', style: 'accent', label: 'قطر AC' },
      { id: 's-bd', p1: 'B', p2: 'D', style: 'accent', label: 'قطر BD' },
    ],
    circles: [],
    polygons: [{ id: 'poly-abcd', vertices: ['A', 'B', 'C', 'D'], fill: 'rgba(2, 132, 199, 0.06)' }],
  },
];

export const TEXTBOOK_THEOREMS: TheoremEntry[] = [
  {
    id: 'thm-bisector',
    chapter: 1,
    title: 'قضیه دوشرطی نیمساز زاویه',
    category: 'قضیه دوشرطی',
    bookPage: 12,
    assumption: 'نقطه A روی نیمساز زاویه xOy قرار دارد (و بالعکس: فاصله A از دو ضلع زاویه یکسان است).',
    conclusion: 'فاصله نقطه A از دو ضلع زاویه Ox و Oy با هم برابر است (AH = AH′).',
    proofSteps: [
      'از نقطه A دو عمود AH و AH′ بر نیم‌خط‌های Ox و Oy رسم می‌کنیم.',
      'دو مثلث قائم‌الزاویه OAH و OAH′ دارای وتر مشترک OA و زاویه تند برابر (O₁ = O₂) هستند.',
      'به حالت (و‌ز) دو مثلث هم‌نهشت‌اند؛ بنابراین AH = AH′.',
      'در عکس قضیه نیز به حالت هم‌نهشتی (و‌ض) تساوی زوایا و قرار گرفتن A روی نیمساز نتیجه می‌شود.',
    ],
  },
  {
    id: 'thm-perp-bisector',
    chapter: 1,
    title: 'قضیه دوشرطی عمودمنصف پاره‌خط',
    category: 'قضیه دوشرطی',
    bookPage: 13,
    assumption: 'نقطه W روی عمودمنصف پاره‌خط AB قرار دارد ⇔ WA = WB.',
    conclusion: 'هر نقطه روی عمودمنصف یک پاره‌خط از دو سر آن به یک فاصله است و هر نقطه هم‌فاصله از دو سر پاره‌خط روی عمودمنصف آن قرار دارد.',
    proofSteps: [
      'فرض کنیم M وسط AB باشد. اگر W روی عمودمنصف باشد، دو مثلث WMA و WMB به حالت (ض‌ز‌ض) هم‌نهشت‌اند ⇒ WA = WB.',
      'برعکس اگر WA = WB باشد، W را به وسط M وصل می‌کنیم؛ دو مثلث WMA و WMB به حالت (ض‌ض‌ض) هم‌نهشت‌اند و زاویه M قائمه می‌شود.',
    ],
  },
  {
    id: 'thm-unequal-sides',
    chapter: 1,
    title: 'قضیه ۱ و عکس آن: رابطه ضلع و زاویه نابرابر در مثلث',
    category: 'قضیه دوشرطی',
    bookPage: 21,
    assumption: 'در مثلث ABC دو ضلع نابرابرند: AB > AC (و در عکس قضیه: ∠C > ∠B).',
    conclusion: 'زاویه روبه‌رو به ضلع بزرگ‌تر، بزرگ‌تر است از زاویه روبه‌رو به ضلع کوچک‌تر: AB > AC ⇔ ∠C > ∠B.',
    proofSteps: [
      'اثبات قضیه ۱ (مستقیم): روی ضلع بزرگ‌تر AB نقطه D را چنان جدا می‌کنیم که AD = AC. مثلث ADC متساوی‌الساقین است پس ∠C₁ = ∠D₁.',
      'زاویه D₁ زاویه خارجی مثلث DBC است، پس ∠D₁ > ∠B. همچنین ∠C > ∠C₁ = ∠D₁؛ در نتیجه ∠C > ∠B.',
      'اثبات عکس قضیه ۱ (با برهان خلف ص ۲۴): فرض می‌کنیم حکم نادرست باشد، یعنی BC ≤ AC.',
      'حالت اول: اگر BC < AC باشد، طبق قضیه ۱ باید ∠A < ∠B باشد که با فرض ∠A > ∠B تناقض دارد.',
      'حالت دوم: اگر BC = AC باشد، مثلث متساوی‌الساقین شده و ∠A = ∠B که باز با فرض تناقض دارد. پس حکم درست است.',
    ],
  },
  {
    id: 'thm-unique-perp',
    chapter: 1,
    title: 'یکتا بودن خط عمود از نقطه خارج خط (برهان خلف)',
    category: 'برهان خلف',
    bookPage: 24,
    assumption: 'نقطه A غیرواقع بر خط d وجود دارد.',
    conclusion: 'از نقطه A نمی‌توان بیش از یک عمود بر خط d رسم کرد.',
    proofSteps: [
      'با برهان خلف فرض می‌کنیم حکم نادرست باشد؛ یعنی از نقطه A دو خط عمود AB و AC بر خط d رسم کرده‌ایم.',
      'در این صورت در مثلث ABC دو زاویه قائمه (∠B = 90° و ∠C = 90°) داریم.',
      'پس مجموع زوایای داخلی مثلث ABC بزرگ‌تر از ۱۸۰° می‌شود (۹۰° + ۹۰° + ∠A > ۱۸۰°) که غیرممکن است.',
    ],
  },
  {
    id: 'thm-counterexamples',
    chapter: 1,
    title: 'مثال‌های نقض مهم کتاب (فصل ۱ ص ۲۵–۲۶)',
    category: 'مثال نقض',
    bookPage: 25,
    assumption: 'بررسی درستی یا نادرستی حکم‌های کلی با ارائه یک مثال نقض.',
    conclusion: 'ارائه حتی یک مثال نقض برای رد کردن یک حکم کلی کافی است، اما نبود مثال نقض جایگزین اثبات نمی‌شود.',
    proofSteps: [
      'حکم الف: «همه اعداد صحیح مثبت‌اند» ← مثال نقض: عدد صحیح (-۲) یا صفر.',
      'حکم ب: «هر چهارضلعی که چهار ضلع برابر داشته باشد مربع است» ← مثال نقض: لوزی با زوایای غیرقائمه (مثلاً ۶۰° و ۱۲۰°).',
      'حکم ت: «به ازای هر عدد طبیعی n، عبارت n² + n + 41 عددی اول است» ← مثال نقض: به ازای n = 40 یا n = 41 داریم 41² + 41 + 41 = 41 × 43 که مرکب است.',
      'حکم کاردرکلاس ص ۲۶: «هر دو مثلث هم‌مساحت، هم‌نهشت‌اند» ← مثال نقض: مثلثی با قاعده ۶ و ارتفاع ۴ (مساحت ۱۲) و مثلثی با قاعده ۸ و ارتفاع ۳ (مساحت ۱۲).',
    ],
    counterExample: 'برای n = 41: عبارت 41² + 41 + 41 = 41(41 + 1 + 1) = 41 × 43 بر ۴۱ بخش‌پذیر است و اول نیست.',
  },
  {
    id: 'thm-thales',
    chapter: 2,
    title: 'قضیه تالس و تعمیم آن',
    category: 'قضیه',
    bookPage: 34,
    assumption: 'در مثلث ABC خط DE موازی ضلع BC است (DE || BC).',
    conclusion: 'AD / DB = AE / EC  و  AD / AB = AE / AC = DE / BC.',
    proofSteps: [
      'دو مثلث DAE و DBE دارای ارتفاع مشترک از رأس E هستند ⇒ S(DAE)/S(DBE) = AD/DB.',
      'دو مثلث DAE و DEC دارای ارتفاع مشترک از رأس D هستند ⇒ S(DAE)/S(DEC) = AE/EC.',
      'چون DE || BC، مثلث‌های DBE و DEC دارای قاعده مشترک DE و ارتفاع برابرند ⇒ S(DBE) = S(DEC).',
      'از تساوی کسرها نتیجه می‌شود: AD / DB = AE / EC.',
    ],
  },
  {
    id: 'thm-picks-irrational',
    chapter: 3,
    title: 'عدم وجود مثلث متساوی‌الاضلاع شبکه‌ای (فصل ۳ ص ۷۶)',
    category: 'برهان خلف',
    bookPage: 76,
    assumption: 'فرض کنیم یک مثلث متساوی‌الاضلاع وجود دارد که هر سه رأس آن روی نقاط شبکه‌ای (مختصات صحیح) قرار دارند.',
    conclusion: 'هیچ مثلث متساوی‌الاضلاعی وجود ندارد که مختصات تمام رأس‌های آن اعداد صحیح باشند.',
    proofSteps: [
      'طبق فرمول پیک S = b/2 + i - 1، مساحت هر چندضلعی شبکه‌ای عددی گویا است.',
      'اگر طول ضلع مثلث متساوی‌الاضلاع m باشد، چون رئوس صحیح‌اند طبق فیثاغورس m² = Δx² + Δy² عددی طبیعی و صحیح است.',
      'اما فرمول مساحت مثلث متساوی‌الاضلاع S = (m² · √3) / 4 است که به دلیل وجود √3 عددی گنگ (اصم) است.',
      'برابری یک عدد گویا و یک عدد گنگ تناقض است؛ پس چنین مثلثی روی شبکه صحیح وجود ندارد.',
    ],
  },
];

export const QUADRILATERAL_MATRIX = [
  {
    property: 'مساوی بودن اندازه ضلع‌ها',
    parallelogram: 'هر دو ضلع مقابل',
    rectangle: 'هر دو ضلع مقابل',
    rhombus: 'هر چهار ضلع برابر',
    square: 'هر چهار ضلع برابر',
    trapezoid: 'لزوماً برابر نیستند',
    isoscelesTrapezoid: 'دو ساق برابرند',
  },
  {
    property: 'موازی بودن ضلع‌ها',
    parallelogram: 'هر دو ضلع مقابل',
    rectangle: 'هر دو ضلع مقابل',
    rhombus: 'هر دو ضلع مقابل',
    square: 'هر دو ضلع مقابل',
    trapezoid: 'فقط دو قاعده موازی‌اند',
    isoscelesTrapezoid: 'فقط دو قاعده موازی‌اند',
  },
  {
    property: 'عمود بودن ضلع‌ها',
    parallelogram: 'فقط اگر مستطیل/مربع باشد',
    rectangle: 'همه ضلع‌های مجاور عمودند',
    rhombus: 'فقط اگر مربع باشد',
    square: 'همه ضلع‌های مجاور عمودند',
    trapezoid: 'فقط در ذوزنقه قائم‌الزاویه',
    isoscelesTrapezoid: 'کلاً وجود ندارد',
  },
  {
    property: 'زاویه‌های با اندازه‌های برابر',
    parallelogram: 'هر دو زاویه مقابل',
    rectangle: 'هر چهار زاویه قائمه (۹۰°)',
    rhombus: 'هر دو زاویه مقابل',
    square: 'هر چهار زاویه قائمه (۹۰°)',
    trapezoid: 'لزوماً ندارد',
    isoscelesTrapezoid: 'زاویه‌های مجاور به هر قاعده',
  },
  {
    property: 'زاویه‌های مکمل (۱۸۰°)',
    parallelogram: 'هر دو زاویه مجاور',
    rectangle: 'هر دو زاویه مجاور و مقابل',
    rhombus: 'هر دو زاویه مجاور',
    square: 'هر دو زاویه مجاور و مقابل',
    trapezoid: 'زاویه‌های مجاور به هر ساق',
    isoscelesTrapezoid: 'زاویه‌های مجاور به هر ساق و روبه‌رو',
  },
  {
    property: 'وضعیت قطرها نسبت به هم',
    parallelogram: 'منصف یکدیگرند',
    rectangle: 'مساوی و منصف یکدیگرند',
    rhombus: 'عمودمنصف هم و نیمساز زوایا',
    square: 'مساوی، عمودمنصف هم و نیمساز',
    trapezoid: 'لزوماً ویژگی خاصی ندارند',
    isoscelesTrapezoid: 'اندازه‌های مساوی دارند',
  },
];
