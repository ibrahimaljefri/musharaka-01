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
    txt(frame, title, 1100, 16, 16, C.gray900, "SemiBold");
    txt(frame, "أهلاً، إبراهيم", 20, 18, 13, C.gray600);
    // Admin super-badge in topbar
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
  frame.name = "10 · Admin Tenants";
  frame.resize(1440, 900);
  rect(frame, 0, 0, 1440, 900, C.bg);
  figma.currentPage.appendChild(frame);

  topbar(frame, "إدارة المستأجرين");
  sidebarApp(frame, "إدارة المستأجرين", true);

  // ── ADD BUTTON ────────────────────────────────────────────────────────────
  const addBtn = rect(frame, 20, 72, 168, 36, C.yellow, 8);
  txt(frame, "+ إضافة مستأجر", 32, 82, 12, C.white, "SemiBold");

  // ── SEARCH BOX ────────────────────────────────────────────────────────────
  const searchBox = rect(frame, 800, 72, 280, 36, C.white, 8);
  searchBox.strokes = [{ type: "SOLID", color: C.gray200 }]; searchBox.strokeWeight = 1;
  txt(frame, "بحث عن مستأجر...", 816, 82, 12, C.gray400);

  // ── TABLE CARD ────────────────────────────────────────────────────────────
  const tableCard = rect(frame, 20, 120, 1144, 740, C.white, 12);
  tableCard.strokes = [{ type: "SOLID", color: C.gray200 }]; tableCard.strokeWeight = 1;

  // Table header row
  rect(frame, 20, 120, 1144, 48, C.gray100, 0);
  rect(frame, 20, 167, 1144, 1, C.gray200);

  const headers = [
    ["الاسم / الرابط",   1060],
    ["الخطة",             840],
    ["الحالة",            680],
    ["المستخدمون",        530],
    ["تاريخ الانتهاء",   350],
    ["الإجراءات",          80],
  ];
  headers.forEach(([h, x]) => txt(frame, h, x, 138, 12, C.gray600, "SemiBold"));

  // ── TENANT ROWS ───────────────────────────────────────────────────────────
  const tenants = [
    {
      name: "شركة الرياض للتجارة",
      slug: "riyadh-trading",
      plan: "احترافي",
      planBg:   { r: 0.93, g: 0.91, b: 0.99 },
      planText: C.purple,
      status: "نشط",
      statusBg:   { r: 0.94, g: 0.996, b: 0.972 },
      statusText: C.green,
      users: "3",
      expires: "2027-01-01",
    },
    {
      name: "مجموعة جدة",
      slug: "jeddah-group",
      plan: "أساسي",
      planBg:   C.gray100,
      planText: C.gray600,
      status: "نشط",
      statusBg:   { r: 0.94, g: 0.996, b: 0.972 },
      statusText: C.green,
      users: "1",
      expires: "2026-06-30",
    },
    {
      name: "فروع الشمال",
      slug: "north-branches",
      plan: "مؤسسي",
      planBg:   { r: 0.88, g: 0.93, b: 0.99 },
      planText: C.blue,
      status: "موقوف",
      statusBg:   { r: 0.99, g: 0.93, b: 0.93 },
      statusText: C.red,
      users: "5",
      expires: "2026-12-31",
    },
    {
      name: "التجارة الحديثة",
      slug: "modern-trade",
      plan: "أساسي",
      planBg:   C.gray100,
      planText: C.gray600,
      status: "منتهي",
      statusBg:   { r: 0.99, g: 0.96, b: 0.88 },
      statusText: { r: 0.76, g: 0.40, b: 0.10 },
      users: "2",
      expires: "2025-12-31",
    },
    {
      name: "مؤسسة الخليج التجارية",
      slug: "gulf-commerce",
      plan: "مؤسسي",
      planBg:   { r: 0.88, g: 0.93, b: 0.99 },
      planText: C.blue,
      status: "نشط",
      statusBg:   { r: 0.94, g: 0.996, b: 0.972 },
      statusText: C.green,
      users: "8",
      expires: "2027-06-01",
    },
  ];

  tenants.forEach((t, i) => {
    const rowY = 176 + i * 64;
    const rowBg = i % 2 === 1 ? { r: 0.99, g: 0.995, b: 1.0 } : C.white;
    rect(frame, 20, rowY, 1144, 62, rowBg, 0);

    // Name + slug
    txt(frame, t.name, 1060, rowY + 10, 13, C.gray900, "SemiBold");
    txt(frame, t.slug, 1060, rowY + 30, 11, C.gray400);

    // Plan badge
    badge(frame, t.plan, 820, rowY + 18, t.planBg, t.planText, 84, 26);

    // Status badge
    badge(frame, t.status, 655, rowY + 18, t.statusBg, t.statusText, 72, 26);

    // Users count
    txt(frame, t.users + " مستخدمين", 490, rowY + 22, 13, C.gray900);

    // Expiry date — highlight red if past today (2026-04-09)
    const isExpired = t.expires < "2026-04-09";
    txt(frame, t.expires, 340, rowY + 22, 12, isExpired ? C.red : C.gray600, isExpired ? "SemiBold" : "Regular");

    // Action icons
    const editBox = rect(frame, 118, rowY + 17, 32, 32, C.gray100, 8);
    editBox.strokes = [{ type: "SOLID", color: C.gray200 }]; editBox.strokeWeight = 1;
    txt(frame, "✏", 124, rowY + 22, 12, C.gray600);

    const viewBox = rect(frame, 78, rowY + 17, 32, 32, { r: 0.88, g: 0.93, b: 0.99 }, 8);
    viewBox.strokes = [{ type: "SOLID", color: C.blue }]; viewBox.strokeWeight = 1;
    txt(frame, "◉", 83, rowY + 22, 12, C.blue);

    const delBox = rect(frame, 38, rowY + 17, 32, 32, { r: 0.99, g: 0.93, b: 0.93 }, 8);
    delBox.strokes = [{ type: "SOLID", color: C.red }]; delBox.strokeWeight = 1;
    txt(frame, "✕", 44, rowY + 22, 12, C.red);

    if (i < tenants.length - 1) rect(frame, 20, rowY + 62, 1144, 1, C.gray100);
  });

  // ── TABLE FOOTER — PAGINATION ─────────────────────────────────────────────
  const paginY = 176 + tenants.length * 64 + 16;
  rect(frame, 20, paginY, 1144, 1, C.gray200);
  txt(frame, "عرض 1–5 من 12 مستأجر", 1060, paginY + 16, 12, C.gray500);
  // Prev / Next buttons
  const prevBtn = rect(frame, 100, paginY + 10, 80, 30, C.white, 8);
  prevBtn.strokes = [{ type: "SOLID", color: C.gray200 }]; prevBtn.strokeWeight = 1;
  txt(frame, "السابق", 116, paginY + 17, 12, C.gray600);
  const nextBtn = rect(frame, 28, paginY + 10, 64, 30, C.yellow, 8);
  txt(frame, "التالي", 40, paginY + 17, 12, C.white, "SemiBold");

  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("10 · Admin Tenants — تم ✓");
})();
