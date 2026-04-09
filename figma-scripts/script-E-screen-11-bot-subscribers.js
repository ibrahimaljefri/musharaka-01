(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "SemiBold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const C = {
    yellow:      { r: 0.918, g: 0.706, b: 0.031 },
    yellowDark:  { r: 0.706, g: 0.325, b: 0.035 },
    yellowLight: { r: 1,     g: 0.988, b: 0.878 },
    white:       { r: 1,     g: 1,     b: 1     },
    bg:          { r: 0.957, g: 0.965, b: 0.980 },
    gray900:     { r: 0.067, g: 0.094, b: 0.153 },
    gray700:     { r: 0.216, g: 0.322, b: 0.373 },
    gray600:     { r: 0.294, g: 0.333, b: 0.388 },
    gray500:     { r: 0.420, g: 0.447, b: 0.502 },
    gray400:     { r: 0.612, g: 0.639, b: 0.686 },
    gray200:     { r: 0.898, g: 0.910, b: 0.929 },
    gray100:     { r: 0.953, g: 0.957, b: 0.965 },
    green:       { r: 0.063, g: 0.725, b: 0.506 },
    red:         { r: 0.937, g: 0.267, b: 0.267 },
    purple:      { r: 0.545, g: 0.361, b: 0.965 },
    blue:        { r: 0.231, g: 0.510, b: 0.965 },
  };

  function rect(parent, x, y, w, h, color, radius = 0) {
    const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(w, h);
    r.fills = [{ type: "SOLID", color }];
    if (radius) r.cornerRadius = radius;
    parent.appendChild(r);
    return r;
  }

  function txt(parent, content, x, y, size, color, style = "Regular", align = "LEFT") {
    const t = figma.createText();
    t.fontName = { family: "Inter", style };
    t.characters = content;
    t.fontSize = size;
    t.fills = [{ type: "SOLID", color }];
    t.textAlignHorizontal = align;
    t.x = x; t.y = y;
    parent.appendChild(t);
    return t;
  }

  function badge(parent, label, x, y, bg, textColor, w = 80, h = 24) {
    const g = figma.createFrame();
    g.resize(w, h); g.x = x; g.y = y;
    g.fills = [{ type: "SOLID", color: bg }];
    g.cornerRadius = 12;
    g.layoutMode = "NONE";
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.characters = label;
    t.fontSize = 11;
    t.fills = [{ type: "SOLID", color: textColor }];
    t.x = w / 2 - t.width / 2;
    t.y = (h - 14) / 2;
    g.appendChild(t);
    parent.appendChild(g);
    return g;
  }

  function sidebarApp(frame, activeLabel, isAdmin = false) {
    const SB_W = 256, FH = 900;
    const sb = rect(frame, 1440 - SB_W, 0, SB_W, FH, C.white);
    sb.strokes = [{ type: "SOLID", color: C.gray200 }];
    sb.strokeWeight = 1;
    txt(frame, "مشاركة", 1440 - SB_W + 20, 18, 18, C.yellowDark, "Bold");
    txt(frame, "نظام إدارة المبيعات", 1440 - SB_W + 20, 40, 11, C.gray400);
    rect(frame, 1440 - SB_W, 56, SB_W, 1, C.gray200);

    const navItems = isAdmin
      ? [["إدارة المستأجرين", 72], ["إدارة المستخدمين", 116], ["مشتركو الروبوت", 160]]
      : [["لوحة التحكم", 72], ["إضافة مبيعات", 116], ["استيراد Excel", 160],
         ["التقارير", 204], ["الفروع", 248], ["إرسال الفواتير", 292], ["تقرير الإرسالات", 336]];

    for (const [label, yPos] of navItems) {
      const isActive = label === activeLabel;
      if (isActive) {
        const bg = rect(frame, 1440 - SB_W + 8, yPos, SB_W - 16, 36, C.yellowLight, 8);
        bg.strokes = [{ type: "SOLID", color: C.yellow }];
        bg.strokeWeight = 1;
        txt(frame, label, 1440 - SB_W + 20, yPos + 10, 13, C.yellowDark, "SemiBold");
      } else {
        txt(frame, label, 1440 - SB_W + 20, yPos + 10, 13, C.gray600);
      }
    }

    if (isAdmin) {
      const badgeBg = rect(frame, 1440 - SB_W + 12, 820, 120, 28, C.yellowLight, 8);
      badgeBg.strokes = [{ type: "SOLID", color: C.yellow }];
      badgeBg.strokeWeight = 1;
      txt(frame, "مشرف عام", 1440 - SB_W + 20, 828, 11, C.yellowDark, "SemiBold");
    }

    rect(frame, 1440 - SB_W, 848, SB_W, 1, C.gray200);
    txt(frame, "تسجيل الخروج", 1440 - SB_W + 20, 862, 13, C.red);
  }

  function topbar(frame, title) {
    rect(frame, 0, 0, 1184, 56, C.white);
    rect(frame, 0, 55, 1184, 1, C.gray200);
    txt(frame, title, 1080, 16, 16, C.gray900, "SemiBold");
    txt(frame, "أهلاً، إبراهيم", 20, 18, 13, C.gray600);
    const adminBadge = rect(frame, 400, 14, 120, 28, C.yellowLight, 14);
    adminBadge.strokes = [{ type: "SOLID", color: C.yellow }]; adminBadge.strokeWeight = 1;
    txt(frame, "مشرف عام", 414, 22, 11, C.yellowDark, "SemiBold");
    const dot = figma.createEllipse();
    dot.resize(10, 10); dot.x = 240; dot.y = 23;
    dot.fills = [{ type: "SOLID", color: C.green }];
    frame.appendChild(dot);
    txt(frame, "متصل بسينومي", 254, 20, 11, C.gray400);
  }

  // ── FRAME ────────────────────────────────────────────────────────────────
  const frame = figma.createFrame();
  frame.name = "11 · Admin Bot Subscribers";
  frame.resize(1440, 900);
  rect(frame, 0, 0, 1440, 900, C.bg);
  figma.currentPage.appendChild(frame);

  topbar(frame, "مشتركو الروبوت");
  sidebarApp(frame, "مشتركو الروبوت", true);

  // ── TOOLBAR ───────────────────────────────────────────────────────────────
  const addBtn = rect(frame, 20, 72, 168, 36, C.yellow, 8);
  txt(frame, "+ إضافة مشترك", 32, 82, 12, C.white, "SemiBold");

  // Platform filter
  txt(frame, "المنصة", 900, 80, 12, C.gray600, "Medium");
  const platFilter = rect(frame, 740, 72, 150, 36, C.white, 8);
  platFilter.strokes = [{ type: "SOLID", color: C.gray200 }]; platFilter.strokeWeight = 1;
  txt(frame, "الكل  ▾", 754, 82, 12, C.gray700);

  // Tenant filter
  txt(frame, "المستأجر", 1070, 80, 12, C.gray600, "Medium");
  const tenantFilter = rect(frame, 900, 72, 160, 36, C.white, 8);
  tenantFilter.strokes = [{ type: "SOLID", color: C.gray200 }]; tenantFilter.strokeWeight = 1;
  txt(frame, "جميع المستأجرين  ▾", 912, 82, 12, C.gray700);

  // ── TABLE CARD ────────────────────────────────────────────────────────────
  const tableCard = rect(frame, 20, 120, 1144, 680, C.white, 12);
  tableCard.strokes = [{ type: "SOLID", color: C.gray200 }]; tableCard.strokeWeight = 1;

  rect(frame, 20, 120, 1144, 48, C.gray100, 0);
  rect(frame, 20, 167, 1144, 1, C.gray200);

  const headers = [
    ["المنصة",         1060],
    ["معرّف المحادثة", 860],
    ["اسم المتصل",     680],
    ["الفرع",          540],
    ["المستأجر",       380],
    ["الحالة",         220],
    ["الإجراءات",       60],
  ];
  headers.forEach(([h, x]) => txt(frame, h, x, 138, 12, C.gray600, "SemiBold"));

  // ── SUBSCRIBER ROWS ───────────────────────────────────────────────────────
  const subscribers = [
    {
      platform: "تيليجرام",
      platformBg:   { r: 0.88, g: 0.93, b: 0.99 },
      platformText: C.blue,
      chatId: "123456789",
      name: "أحمد محمد",
      branch: "BR-001",
      tenant: "شركة الرياض",
      active: true,
    },
    {
      platform: "واتساب",
      platformBg:   { r: 0.88, g: 0.99, b: 0.92 },
      platformText: C.green,
      chatId: "+966501234567",
      name: "سارة العتيبي",
      branch: "BR-002",
      tenant: "شركة الرياض",
      active: true,
    },
    {
      platform: "تيليجرام",
      platformBg:   { r: 0.88, g: 0.93, b: 0.99 },
      platformText: C.blue,
      chatId: "987654321",
      name: "محمد الزهراني",
      branch: "JD-001",
      tenant: "مجموعة جدة",
      active: false,
    },
    {
      platform: "واتساب",
      platformBg:   { r: 0.88, g: 0.99, b: 0.92 },
      platformText: C.green,
      chatId: "+966509876543",
      name: "نورة الحربي",
      branch: "DM-001",
      tenant: "فروع الشمال",
      active: true,
    },
    {
      platform: "تيليجرام",
      platformBg:   { r: 0.88, g: 0.93, b: 0.99 },
      platformText: C.blue,
      chatId: "111222333",
      name: "خالد السلمي",
      branch: "BR-003",
      tenant: "شركة الرياض",
      active: false,
    },
  ];

  subscribers.forEach((s, i) => {
    const rowY = 176 + i * 72;
    const rowBg = i % 2 === 1 ? { r: 0.99, g: 0.995, b: 1.0 } : C.white;
    rect(frame, 20, rowY, 1144, 70, rowBg, 0);

    // Platform badge
    badge(frame, s.platform, 1030, rowY + 22, s.platformBg, s.platformText, 96, 26);

    // Chat ID
    txt(frame, s.chatId, 860, rowY + 26, 12, C.gray700);

    // Subscriber name
    txt(frame, s.name, 680, rowY + 26, 13, C.gray900, "SemiBold");

    // Branch badge
    const branchBadge = rect(frame, 516, rowY + 22, 80, 26, C.yellowLight, 13);
    branchBadge.strokes = [{ type: "SOLID", color: C.yellow }]; branchBadge.strokeWeight = 1;
    txt(frame, s.branch, 528, rowY + 28, 10, C.yellowDark, "SemiBold");

    // Tenant name
    txt(frame, s.tenant, 370, rowY + 26, 12, C.gray700);

    // Toggle switch
    const toggleW = 44, toggleH = 24;
    const toggleBg = rect(frame, 208, rowY + 23, toggleW, toggleH, s.active ? C.green : C.gray200, 12);
    const toggleDot = figma.createEllipse();
    toggleDot.resize(18, 18);
    toggleDot.x = s.active ? (208 + toggleW - 22) : 210;
    toggleDot.y = rowY + 26;
    toggleDot.fills = [{ type: "SOLID", color: C.white }];
    frame.appendChild(toggleDot);
    txt(frame, s.active ? "مفعّل" : "معطّل", 158, rowY + 27, 10, s.active ? C.green : C.gray400, "Medium");

    // Action icons
    const editBox = rect(frame, 96, rowY + 21, 32, 32, C.gray100, 8);
    editBox.strokes = [{ type: "SOLID", color: C.gray200 }]; editBox.strokeWeight = 1;
    txt(frame, "✏", 102, rowY + 26, 12, C.gray600);

    const delBox = rect(frame, 56, rowY + 21, 32, 32, { r: 0.99, g: 0.93, b: 0.93 }, 8);
    delBox.strokes = [{ type: "SOLID", color: C.red }]; delBox.strokeWeight = 1;
    txt(frame, "✕", 62, rowY + 26, 12, C.red);

    if (i < subscribers.length - 1) rect(frame, 20, rowY + 70, 1144, 1, C.gray100);
  });

  // ── STATS SUMMARY CARDS ───────────────────────────────────────────────────
  const statsY = 176 + subscribers.length * 72 + 20;
  rect(frame, 20, statsY, 1144, 1, C.gray200);

  const statsData = [
    ["إجمالي المشتركين", "5", C.blue,   { r: 0.88, g: 0.93, b: 0.99 }],
    ["مفعّلون",          "3", C.green,  { r: 0.88, g: 0.99, b: 0.92 }],
    ["معطّلون",          "2", C.red,    { r: 0.99, g: 0.93, b: 0.93 }],
    ["تيليجرام",         "3", C.blue,   { r: 0.88, g: 0.93, b: 0.99 }],
    ["واتساب",           "2", C.green,  { r: 0.88, g: 0.99, b: 0.92 }],
  ];

  statsData.forEach(([label, val, textColor, bgColor], i) => {
    const sx = 36 + i * 220, sy = statsY + 16;
    const sc = rect(frame, sx, sy, 200, 56, bgColor, 10);
    txt(frame, label, sx + 188, sy + 10, 11, textColor, "Medium");
    txt(frame, val, sx + 188, sy + 28, 22, textColor, "Bold");
  });

  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("11 · Bot Subscribers — تم ✓");
})();
