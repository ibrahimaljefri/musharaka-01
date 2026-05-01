/**
 * Musharaka SMS — Full Marketing Landing Page
 * Run this in Figma via: Plugins → Scripter (by Tom Lowry) → Paste → Play
 *
 * Creates a "Landing Page" page with a complete RTL Arabic marketing home page:
 *   1.  Navbar
 *   2.  Hero (with live dashboard mockup)
 *   3.  Features (4 cards)
 *   4.  How It Works (3 steps)
 *   5.  Pricing (3 plans — Basic / Pro / Enterprise)
 *   6.  Bot Showcase (WhatsApp/Telegram chat mockup)
 *   7.  Stats Banner (500+ branches, 10k+ invoices, 99.9% uptime, 24/7 support)
 *   8.  Testimonials (3 client cards)
 *   9.  CTA Banner
 *  10.  Footer
 */
(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // ── Find or create the "Landing Page" page ─────────────────────────────────
  let page = figma.root.children.find(p => p.name === "Landing Page");
  if (!page) {
    page = figma.createPage();
    page.name = "Landing Page";
  }
  await figma.setCurrentPageAsync(page);

  // ── Color tokens ───────────────────────────────────────────────────────────
  const C = {
    yellow:      { r: 0.918, g: 0.706, b: 0.031 },
    yellowDark:  { r: 0.706, g: 0.325, b: 0.035 },
    yellowLight: { r: 1,     g: 0.988, b: 0.878 },
    white:       { r: 1,     g: 1,     b: 1     },
    dark:        { r: 0.067, g: 0.094, b: 0.153 },
    dark2:       { r: 0.10,  g: 0.13,  b: 0.20  },
    darkFoot:    { r: 0.13,  g: 0.16,  b: 0.22  },
    gray900:     { r: 0.067, g: 0.094, b: 0.153 },
    gray700:     { r: 0.22,  g: 0.27,  b: 0.34  },
    gray600:     { r: 0.294, g: 0.333, b: 0.388 },
    gray500:     { r: 0.42,  g: 0.45,  b: 0.50  },
    gray400:     { r: 0.612, g: 0.639, b: 0.686 },
    gray300:     { r: 0.75,  g: 0.76,  b: 0.78  },
    gray200:     { r: 0.898, g: 0.910, b: 0.929 },
    gray100:     { r: 0.953, g: 0.957, b: 0.965 },
    green:       { r: 0.063, g: 0.725, b: 0.506 },
    greenLight:  { r: 0.9,   g: 0.99,  b: 0.95  },
    red:         { r: 0.937, g: 0.267, b: 0.267 },
    purple:      { r: 0.545, g: 0.361, b: 0.965 },
    purpleLight: { r: 0.95,  g: 0.92,  b: 0.99  },
    blue:        { r: 0.231, g: 0.510, b: 0.965 },
    blueLight:   { r: 0.88,  g: 0.93,  b: 0.99  },
    cyan:        { r: 0.024, g: 0.714, b: 0.831 },
    cyanLight:   { r: 0.88,  g: 0.97,  b: 0.99  },
    footerText:  { r: 0.55,  g: 0.58,  b: 0.65  },
    chatGray:    { r: 0.18,  g: 0.22,  b: 0.30  },
  };

  const FW = 1440;

  // ── Primitive helpers ──────────────────────────────────────────────────────
  function R(parent, x, y, w, h, color, radius = 0) {
    const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(w, h);
    r.fills = [{ type: "SOLID", color }];
    if (radius) r.cornerRadius = radius;
    parent.appendChild(r);
    return r;
  }

  function T(parent, content, x, y, size, color, style = "Regular", align = "LEFT") {
    const t = figma.createText();
    t.fontName = { family: "Inter", style };
    t.characters = String(content);
    t.fontSize = size;
    t.fills = [{ type: "SOLID", color }];
    t.textAlignHorizontal = align;
    t.x = x; t.y = y;
    parent.appendChild(t);
    return t;
  }

  function Card(parent, x, y, w, h, bg, radius = 16, border = null, sw = 1.5) {
    const c = R(parent, x, y, w, h, bg, radius);
    if (border) { c.strokes = [{ type: "SOLID", color: border }]; c.strokeWeight = sw; }
    return c;
  }

  function FilledBtn(parent, label, x, y, w, h, bg, textColor, radius = 10) {
    R(parent, x, y, w, h, bg, radius);
    const t = T(parent, label, x, y, 14, textColor, "Semi Bold", "CENTER");
    t.resize(w, h); t.textAlignVertical = "CENTER";
  }

  function StrokeBtn(parent, label, x, y, w, h, borderColor, textColor, radius = 10) {
    const b = R(parent, x, y, w, h, C.white, radius);
    b.strokes = [{ type: "SOLID", color: borderColor }]; b.strokeWeight = 1.5;
    const t = T(parent, label, x, y, 14, textColor, "Semi Bold", "CENTER");
    t.resize(w, h); t.textAlignVertical = "CENTER";
  }

  // ── FRAME (1440 × 3200) ────────────────────────────────────────────────────
  const frame = figma.createFrame();
  frame.name = "00 · Landing Page — الصفحة الرئيسية";
  frame.resize(FW, 3200);
  frame.fills = [{ type: "SOLID", color: C.white }];
  page.appendChild(frame);

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — NAVBAR  (y=0, h=72)
  // ════════════════════════════════════════════════════════════════════════════
  R(frame, 0, 0, FW, 72, C.white);
  R(frame, 0, 71, FW, 1, C.gray200);

  // Logo — right side (RTL)
  T(frame, "مشاركة", FW - 200, 12, 26, C.yellowDark, "Bold");
  T(frame, "نظام إدارة المبيعات", FW - 200, 42, 11, C.gray400);

  // Nav links — center
  ["الميزات", "الأسعار", "كيف يعمل؟", "تواصل معنا"].forEach((lbl, i) =>
    T(frame, lbl, 580 + i * 130, 26, 14, C.gray700, "Medium")
  );

  // CTA buttons — left
  StrokeBtn(frame, "تسجيل الدخول", 120, 18, 130, 36, C.gray200, C.gray700);
  FilledBtn(frame, "ابدأ مجاناً",   20,  18, 92,  36, C.yellow, C.white);

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — HERO  (y=72, h=580)
  // ════════════════════════════════════════════════════════════════════════════
  R(frame, 0, 72, FW, 580, C.yellowLight);

  // Headline — right side (RTL)
  T(frame, "نظام إدارة مبيعات",                                     FW - 680, 140, 44, C.gray900, "Bold");
  T(frame, "الفروع والفواتير",                                       FW - 680, 196, 44, C.yellowDark, "Bold");
  T(frame, "ربط سلس بين فروعك ومنصة سينومي للفواتير الإلكترونية.", FW - 680, 260, 16, C.gray600);
  T(frame, "إدارة المبيعات اليومية، التقارير، والإرسالات في مكان واحد.", FW - 680, 284, 16, C.gray600);

  FilledBtn(frame, "ابدأ تجربة مجانية — 14 يوماً", FW - 680, 330, 292, 50, C.yellow, C.white, 12);
  StrokeBtn(frame, "شاهد العرض التوضيحي ▶",         FW - 378, 330, 232, 50, C.yellowDark, C.yellowDark, 12);
  T(frame, "✓ لا يُطلب بطاقة ائتمانية   ✓ إلغاء في أي وقت   ✓ دعم عربي كامل", FW - 680, 400, 13, C.gray500);

  // Dashboard mockup — left side
  const dash = Card(frame, 60, 100, 620, 444, C.white, 16);
  dash.effects = [{ type: "DROP_SHADOW", color: { r:0, g:0, b:0, a:0.12 }, offset: { x:0, y:12 }, radius: 40, spread: -4, visible: true, blendMode: "NORMAL" }];

  R(frame, 60, 100, 620, 48, C.white, 0);
  R(frame, 60, 147, 620, 1, C.gray100);
  T(frame, "مشاركة — لوحة التحكم", 600, 116, 12, C.gray600, "Semi Bold");
  const gDot = figma.createEllipse();
  gDot.resize(8, 8); gDot.x = 120; gDot.y = 120;
  gDot.fills = [{ type: "SOLID", color: C.green }]; frame.appendChild(gDot);
  T(frame, "متصل", 132, 117, 10, C.green);

  // KPI mini-cards inside mockup
  [
    ["إجمالي المبيعات", "125,450 ر.س",  C.greenLight,   C.green],
    ["مبيعات الشهر",    "38,500 ر.س",   { r:.99,g:.92,b:.95 }, C.red],
    ["الفواتير المُرسلة","156",            C.purpleLight,  C.purple],
    ["أيام مفقودة",     "3 أيام",         C.cyanLight,    C.cyan],
  ].forEach(([label, val, bg, accent], i) => {
    const kx = 76 + i * 150, ky = 160;
    Card(frame, kx, ky, 136, 72, bg, 10);
    T(frame, label, kx + 4, ky + 8,  9,  C.gray600);
    T(frame, val,   kx + 4, ky + 34, 12, accent, "Bold");
  });

  // Mini sales table
  R(frame, 76, 244, 588, 1, C.gray200);
  T(frame, "آخر المبيعات", 596, 252, 11, C.gray600, "Semi Bold");
  [
    ["فرع الرياض — يومي",  "2026-04-09", "4,500 ر.س",  C.green],
    ["فرع جدة — شهري",    "2026-04-08", "31,200 ر.س", C.green],
    ["فرع الدمام — يومي",  "2026-04-08", "2,800 ر.س",  C.green],
    ["فرع مكة — فترة",    "2026-04-01", "18,000 ر.س", { r:.9, g:.6, b:.1 }],
  ].forEach(([name, date, amount, amtColor], i) => {
    const ry = 268 + i * 40;
    R(frame, 76, ry, 588, 38, i % 2 === 0 ? C.white : C.gray100, 0);
    T(frame, name,   600, ry + 10, 11, C.gray900);
    T(frame, date,   420, ry + 10, 10, C.gray400);
    T(frame, amount, 84,  ry + 10, 11, amtColor, "Semi Bold");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — FEATURES  (y=652, h=480)
  // ════════════════════════════════════════════════════════════════════════════
  const S3 = 652;
  R(frame, 0, S3, FW, 480, C.white);
  T(frame, "لماذا تختار مشاركة؟", FW/2 - 140, S3 + 44, 30, C.gray900, "Bold", "CENTER");
  T(frame, "كل الأدوات التي تحتاجها لتشارك البيانات، في منصة عربية واحدة", FW/2 - 300, S3 + 88, 15, C.gray600, "Regular", "CENTER");

  [
    { icon:"📊", title:"إدارة مبيعات متعددة الفروع", desc:"أضف مبيعات يومية، شهرية، أو بفترات مخصصة لجميع فروعك.\nاستورد بيانات Excel بضغطة واحدة.",  bg:C.greenLight,  accent:C.green },
    { icon:"🔄", title:"تكامل تلقائي مع سينومي",     desc:"إرسال الفواتير مباشرةً إلى سينومي للفواتير الإلكترونية.\nتتبع كل إرسال وتنبيهات الأيام المفقودة.", bg:C.blueLight,   accent:C.blue },
    { icon:"🤖", title:"بوت واتساب وتيليجرام",       desc:"مندوبو الفروع يرسلون مبيعاتهم برسالة واحدة\nويستلمون تأكيداً فورياً بتفاصيل الفرع والعقد.",    bg:C.purpleLight, accent:C.purple },
    { icon:"📈", title:"تقارير وتحليلات فورية",      desc:"لوحة تحكم بإجمالي المبيعات، الفواتير المعلقة،\nالأيام المفقودة، ومؤشرات الأداء الرئيسية.",  bg:C.yellowLight, accent:C.yellowDark },
  ].forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const fx = col === 0 ? FW - 700 : FW - 1370;
    const fy = S3 + 140 + row * 188;
    Card(frame, fx, fy, 640, 164, C.white, 14, C.gray200);
    R(frame, fx, fy + 18, 4, 60, f.accent, 2);           // accent bar
    R(frame, fx + 564, fy + 18, 56, 56, f.bg, 12);       // icon box
    T(frame, f.icon, fx + 574, fy + 26, 26, { r:0, g:0, b:0 });
    T(frame, f.title, fx + 540, fy + 20, 15, C.gray900, "Semi Bold");
    const dt = T(frame, f.desc, fx + 540, fy + 52, 12, C.gray600);
    dt.resize(520, 80); dt.textAutoResize = "HEIGHT";
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4 — HOW IT WORKS  (y=1132, h=320)
  // ════════════════════════════════════════════════════════════════════════════
  const S4 = 1132;
  R(frame, 0, S4, FW, 320, C.gray100);
  T(frame, "كيف يعمل النظام؟",    FW/2 - 90,  S4 + 40, 28, C.gray900, "Bold",    "CENTER");
  T(frame, "ثلاث خطوات بسيطة للبدء", FW/2 - 100, S4 + 80, 14, C.gray500, "Regular", "CENTER");

  [
    { num:"1", icon:"📝", title:"أضف مبيعاتك",      desc:"أدخل مبيعات الفرع يومياً\nأو استورد ملف Excel دفعةً واحدة",   sx: FW - 300 },
    { num:"2", icon:"📋", title:"راجع الفواتير",    desc:"تحقق من السجلات والتقارير\nقبل الإرسال وتتبع الأيام المفقودة", sx: FW - 700 },
    { num:"3", icon:"🚀", title:"أرسل إلى سينومي", desc:"أرسل الفواتير بضغطة واحدة\nوتابع حالة الإرسال لحظياً",         sx: FW - 1100 },
  ].forEach((s, i) => {
    const nc = figma.createEllipse();
    nc.resize(40, 40); nc.x = s.sx + 100; nc.y = S4 + 100;
    nc.fills = [{ type: "SOLID", color: C.yellow }]; frame.appendChild(nc);
    const nt = T(frame, s.num, s.sx + 100, S4 + 100, 20, C.white, "Bold", "CENTER");
    nt.resize(40, 40); nt.textAlignVertical = "CENTER";

    Card(frame, s.sx - 120, S4 + 152, 260, 148, C.white, 14, C.gray200);
    T(frame, s.icon,  s.sx + 88,  S4 + 164, 28, { r:0, g:0, b:0 });
    T(frame, s.title, s.sx + 58,  S4 + 172, 15, C.gray900, "Semi Bold");
    const dt = T(frame, s.desc, s.sx + 58, S4 + 198, 12, C.gray600);
    dt.resize(210, 56); dt.textAutoResize = "HEIGHT";

    if (i < 2) T(frame, "←", s.sx - 155, S4 + 216, 28, C.gray300, "Bold");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5 — PRICING  (y=1452, h=540)
  // ════════════════════════════════════════════════════════════════════════════
  const S5 = 1452;
  R(frame, 0, S5, FW, 540, C.white);
  T(frame, "خطط الاشتراك",                                   FW/2 - 80,  S5 + 40, 30, C.gray900, "Bold",    "CENTER");
  T(frame, "ابدأ مجاناً لمدة 14 يوماً — لا يُطلب بطاقة ائتمانية", FW/2 - 230, S5 + 82, 14, C.gray500, "Regular", "CENTER");

  [
    {
      name:"أساسي",   price:"299",   period:"ر.س / شهر",
      badge:null,           highlight:false, border:C.gray200,
      features:["3 فروع", "إدخال يومي وشهري", "تقارير أساسية", "دعم بالبريد الإلكتروني"],
      btnLabel:"ابدأ بالخطة الأساسية", btnBg:C.gray100, btnText:C.gray700,
    },
    {
      name:"احترافي", price:"599",   period:"ر.س / شهر",
      badge:"⭐ موصى به", highlight:true,  border:C.yellow,
      features:["10 فروع", "جميع أنواع الإدخال", "استيراد Excel", "بوت واتساب وتيليجرام", "تقارير متقدمة", "دعم ذو أولوية"],
      btnLabel:"ابدأ الآن", btnBg:C.yellow, btnText:C.white,
    },
    {
      name:"مؤسسي",  price:"تواصل", period:"معنا",
      badge:null,           highlight:false, border:C.gray200,
      features:["فروع غير محدودة", "API مخصصة", "تدريب مخصص", "مدير حساب مخصص", "اتفاقية SLA مضمونة"],
      btnLabel:"تواصل مع فريق المبيعات", btnBg:C.gray100, btnText:C.gray700,
    },
  ].forEach((p, i) => {
    const px = 160 + i * 380, py = S5 + 120, pw = 340, ph = 388;

    if (p.badge) {
      R(frame, px + pw/2 - 70, py - 18, 140, 32, C.yellow, 16);
      const bt = T(frame, p.badge, px + pw/2 - 70, py - 18, 12, C.white, "Semi Bold", "CENTER");
      bt.resize(140, 32); bt.textAlignVertical = "CENTER";
    }

    Card(frame, px, py, pw, ph, C.white, 16, p.border, p.highlight ? 2 : 1);
    T(frame, p.name,   px + pw - 28, py + 24, 18, C.gray900,                          "Bold");
    T(frame, p.price,  px + pw - 28, py + 58, 32, p.highlight ? C.yellowDark : C.gray900, "Bold");
    T(frame, p.period, px + pw - 28, py + 98, 13, C.gray500);
    R(frame, px + 20, py + 124, pw - 40, 1, C.gray200);
    p.features.forEach((feat, fi) =>
      T(frame, "✓  " + feat, px + pw - 24, py + 140 + fi * 28, 13, C.gray700)
    );

    const bY = py + ph - 56;
    R(frame, px + 20, bY, pw - 40, 40, p.btnBg, 10);
    const bl = T(frame, p.btnLabel, px + 20, bY, 13, p.btnText, "Semi Bold", "CENTER");
    bl.resize(pw - 40, 40); bl.textAlignVertical = "CENTER";
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 6 — BOT SHOWCASE  (y=1992, h=440)
  // ════════════════════════════════════════════════════════════════════════════
  const S6 = 1992;
  R(frame, 0, S6, FW, 440, C.dark);

  // Text — right side
  T(frame, "بوت واتساب وتيليجرام",  FW - 720, S6 + 44,  30, C.white,  "Bold");
  T(frame, "لمندوبي الفروع",         FW - 720, S6 + 86,  30, C.yellow, "Bold");
  T(frame, "مندوبو المبيعات يرسلون مبيعاتهم برسالة واحدة",              FW - 720, S6 + 146, 15, C.footerText);
  T(frame, "ويستلمون تأكيداً فورياً بجميع تفاصيل الفرع والعقد.",        FW - 720, S6 + 170, 15, C.footerText);
  T(frame, "✓ تيليجرام   ✓ واتساب (Twilio / Meta API)",                 FW - 720, S6 + 200, 13, C.gray400);
  FilledBtn(frame, "اطلب تفعيل البوت ←",  FW - 720, S6 + 248, 228, 48, C.yellow, C.white, 12);
  StrokeBtn(frame, "اعرف المزيد",          FW - 482, S6 + 248, 130, 48, C.gray400, C.white, 12);

  // Chat mockup — left side
  Card(frame, 100, S6 + 36, 460, 372, C.dark2, 20);
  R(frame, 100, S6 + 36, 460, 62, { r:.08, g:.10, b:.16 }, 0);

  const av = figma.createEllipse();
  av.resize(36, 36); av.x = 500; av.y = S6 + 48;
  av.fills = [{ type: "SOLID", color: C.green }]; frame.appendChild(av);
  T(frame, "م",                     507, S6 + 57, 16, C.white, "Bold");
  T(frame, "مشاركة — بوت المبيعات", 420, S6 + 50, 13, C.white, "Semi Bold");
  T(frame, "● متصل الآن",           420, S6 + 70, 11, C.green);

  // User message bubble
  R(frame, 290, S6 + 120, 252, 44, C.yellow, 18);
  T(frame, "مبيعات اليوم 4500", 420, S6 + 132, 13, C.white, "Semi Bold");
  T(frame, "✓✓ 10:32",          298, S6 + 136, 10, { r:.9, g:.8, b:.3 });

  // Bot reply bubble
  R(frame, 110, S6 + 180, 330, 200, C.chatGray, 18);
  let ly = S6 + 188;
  [
    ["✅ تم تسجيل المبيعات بنجاح", C.green,              "Semi Bold"],
    ["",                            C.white,              "Regular"],
    ["🏢 شركة الرياض للتجارة",     C.white,              "Regular"],
    ["📋 رقم العقد: CNT-2024-001", { r:.7, g:.7, b:.8 }, "Regular"],
    ["🏪 فرع الرياض (BR-001)",     C.white,              "Regular"],
    ["📅 التاريخ: 2026-04-09",     { r:.7, g:.7, b:.8 }, "Regular"],
    ["💰 المبلغ: 4,500.00 ر.س",   { r:.4, g:.9, b:.6 }, "Semi Bold"],
  ].forEach(([line, color, style]) => {
    if (line) T(frame, line, 408, ly, 11, color, style);
    ly += line ? 24 : 6;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 7 — STATS BANNER  (y=2432, h=160)
  // ════════════════════════════════════════════════════════════════════════════
  const S7 = 2432;
  R(frame, 0, S7, FW, 160, C.yellowLight);

  [
    ["500+",    "فرع نشط"],
    ["10,000+", "فاتورة مُرسلة شهرياً"],
    ["99.9%",   "وقت التشغيل"],
    ["24/7",    "دعم عربي"],
  ].forEach(([val, label], i) => {
    const sx = FW - 200 - i * 340;
    T(frame, val,   sx, S7 + 40, 36, C.yellowDark, "Bold");
    T(frame, label, sx, S7 + 88, 14, C.gray600);
    if (i < 3) R(frame, sx - 36, S7 + 40, 1, 72, { r:.85, g:.65, b:.02 });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 8 — TESTIMONIALS  (y=2592, h=360)
  // ════════════════════════════════════════════════════════════════════════════
  const S8 = 2592;
  R(frame, 0, S8, FW, 360, C.white);
  T(frame, "ماذا يقول عملاؤنا", FW/2 - 100, S8 + 40, 28, C.gray900, "Bold", "CENTER");

  [
    { text:"وفّر علينا النظام ساعات من العمل اليدوي في إرسال الفواتير لسينومي.\nواجهة عربية كاملة وسهلة الاستخدام.", author:"أحمد الزهراني", role:"مدير مبيعات — شركة الرياض" },
    { text:"استيراد Excel والبوت جعلا إدخال مبيعات 8 فروع أمراً\nفي دقائق بدلاً من ساعات.", author:"سارة العتيبي", role:"مشرفة عمليات — مجموعة جدة" },
    { text:"التقارير الفورية والتنبيهات عن الأيام المفقودة\nساعدتنا على ضمان اكتمال الفواتير كل شهر.", author:"محمد الغامدي", role:"مدير تقنية — فروع الشمال" },
  ].forEach((test, i) => {
    const tx = FW - 180 - i * 420;
    Card(frame, tx - 360, S8 + 92, 388, 228, C.white, 14, C.gray200);
    T(frame, "★★★★★",    tx - 30, S8 + 108, 14, C.yellow);
    T(frame, "❝",         tx - 18, S8 + 136, 20, C.yellow, "Bold");
    const qt = T(frame, test.text, tx - 18, S8 + 168, 13, C.gray700);
    qt.resize(352, 80); qt.textAutoResize = "HEIGHT";
    R(frame, tx - 342, S8 + 268, 352, 1, C.gray100);
    T(frame, test.author, tx - 18, S8 + 282, 13, C.gray900, "Semi Bold");
    T(frame, test.role,   tx - 18, S8 + 302, 11, C.gray400);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 9 — CTA BANNER  (y=2952, h=160)
  // ════════════════════════════════════════════════════════════════════════════
  const S9 = 2952;
  R(frame, 0, S9, FW, 160, C.yellow);
  T(frame, "جاهز للبدء؟ جرّب مشاركة مجاناً لمدة 14 يوماً",          FW/2 - 340, S9 + 36, 22, C.white, "Bold",    "CENTER");
  T(frame, "لا يُطلب بطاقة ائتمانية  •  إلغاء في أي وقت  •  دعم عربي كامل", FW/2 - 260, S9 + 72, 14, { r:1,g:.95,b:.7 }, "Regular", "CENTER");
  R(frame, FW/2 - 100, S9 + 108, 200, 40, C.white, 10);
  const ctaT = T(frame, "ابدأ الآن مجاناً", FW/2 - 100, S9 + 108, 14, C.yellowDark, "Semi Bold", "CENTER");
  ctaT.resize(200, 40); ctaT.textAlignVertical = "CENTER";

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 10 — FOOTER  (y=3112, h=88)
  // ════════════════════════════════════════════════════════════════════════════
  const SF = 3112;
  R(frame, 0, SF, FW, 88, C.darkFoot);
  T(frame, "مشاركة",                 FW - 200, SF + 18, 18, C.yellow,      "Bold");
  T(frame, "نظام إدارة المبيعات",    FW - 200, SF + 44, 11, C.footerText);
  ["الميزات","الأسعار","تواصل معنا","سياسة الخصوصية","شروط الاستخدام"].forEach((lnk, i) =>
    T(frame, lnk, 900 - i * 140, SF + 30, 12, C.footerText)
  );
  T(frame, "© 2026 مشاركة — جميع الحقوق محفوظة  •  مصنوع بـ ♥ في المملكة العربية السعودية", 200, SF + 58, 11, { r:.4,g:.4,b:.5 });

  // ── Zoom to frame ─────────────────────────────────────────────────────────
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("✅ Landing Page — 10 أقسام كاملة — تم الإنشاء بنجاح!");
})();
