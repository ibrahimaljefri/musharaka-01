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

    rect(frame, 1440 - SB_W, 848, SB_W, 1, C.gray200);
    txt(frame, "تسجيل الخروج", 1440 - SB_W + 20, 862, 13, C.red);
  }

  function topbar(frame, title) {
    rect(frame, 0, 0, 1184, 56, C.white);
    rect(frame, 0, 55, 1184, 1, C.gray200);
    txt(frame, title, 1100, 16, 16, C.gray900, "SemiBold");
    txt(frame, "أهلاً، إبراهيم", 20, 18, 13, C.gray600);
    const dot = figma.createEllipse();
    dot.resize(10, 10); dot.x = 120; dot.y = 23;
    dot.fills = [{ type: "SOLID", color: C.green }];
    frame.appendChild(dot);
    txt(frame, "متصل بسينومي", 134, 20, 11, C.gray400);
  }

  // ── FRAME ────────────────────────────────────────────────────────────────
  const frame = figma.createFrame();
  frame.name = "09 · Submissions Report";
  frame.resize(1440, 900);
  rect(frame, 0, 0, 1440, 900, C.bg);
  figma.currentPage.appendChild(frame);

  topbar(frame, "تقرير الإرسالات");
  sidebarApp(frame, "تقرير الإرسالات");

  // ── TOOLBAR ROW ───────────────────────────────────────────────────────────
  const addBtn = rect(frame, 20, 72, 180, 36, C.yellow, 8);
  txt(frame, "+ إضافة إرسال جديد", 36, 82, 12, C.white, "SemiBold");

  // Filter: Branch
  txt(frame, "الفرع", 910, 80, 12, C.gray600, "Medium");
  const f1 = rect(frame, 740, 72, 160, 36, C.white, 8);
  f1.strokes = [{ type: "SOLID", color: C.gray200 }]; f1.strokeWeight = 1;
  txt(frame, "جميع الفروع  ▾", 752, 82, 12, C.gray700);

  // Filter: Period
  txt(frame, "الفترة", 1080, 80, 12, C.gray600, "Medium");
  const f2 = rect(frame, 920, 72, 150, 36, C.white, 8);
  f2.strokes = [{ type: "SOLID", color: C.gray200 }]; f2.strokeWeight = 1;
  txt(frame, "يناير 2026  ▾", 932, 82, 12, C.gray700);

  // ── CARD 1 — EXPANDED ────────────────────────────────────────────────────
  const c1 = rect(frame, 20, 128, 1144, 332, C.white, 12);
  c1.strokes = [{ type: "SOLID", color: C.gray200 }]; c1.strokeWeight = 1;

  // Card header bg
  rect(frame, 20, 128, 1144, 56, C.gray100, 0);
  rect(frame, 20, 183, 1144, 1, C.gray200);

  // Chevron (expanded)
  txt(frame, "^", 44, 148, 12, C.gray400, "Bold");

  // Branch code badge
  const bb = rect(frame, 1100, 148, 52, 22, C.yellowLight, 11);
  bb.strokes = [{ type: "SOLID", color: C.yellow }]; bb.strokeWeight = 1;
  txt(frame, "BR-001", 1104, 153, 10, C.yellowDark, "SemiBold");

  txt(frame, "فرع الرياض", 1020, 146, 14, C.gray900, "SemiBold");
  txt(frame, "يناير 2026", 840, 150, 13, C.gray600);
  txt(frame, "31 فاتورة", 680, 150, 13, C.gray600);
  txt(frame, "45,000 ر.س", 520, 150, 14, C.gray900, "SemiBold");
  badge(frame, "مُرسل", 390, 148, { r: 0.94, g: 0.996, b: 0.972 }, C.green, 64, 22);

  // ── DAILY BREAKDOWN TABLE ─────────────────────────────────────────────────
  // Column headers
  const tCols = ["التاريخ", "عدد الفواتير", "الإجمالي (ر.س)"];
  const tX    = [1060, 680, 400];
  tCols.forEach((col, i) => txt(frame, col, tX[i], 198, 11, C.gray500, "SemiBold"));
  rect(frame, 40, 214, 1104, 1, C.gray200);

  const rows = [
    ["2026-01-01", "1", "1,500.00"],
    ["2026-01-02", "1", "1,452.00"],
    ["2026-01-03", "1", "1,452.00"],
    ["2026-01-04", "1", "1,800.00"],
  ];
  rows.forEach(([d, c, a], i) => {
    const rowY = 222 + i * 32;
    const rowBg = i % 2 === 1 ? C.gray100 : C.white;
    rect(frame, 40, rowY, 1104, 30, rowBg, 0);
    txt(frame, d, tX[0], rowY + 8, 12, C.gray900);
    txt(frame, c, tX[1], rowY + 8, 12, C.gray900);
    txt(frame, a, tX[2], rowY + 8, 12, C.gray900, "SemiBold");
  });
  rect(frame, 40, 350, 1104, 1, C.gray200);

  // ── NO MISSING DAYS BANNER ────────────────────────────────────────────────
  const missingBox = rect(frame, 40, 362, 1104, 80, { r: 0.94, g: 0.996, b: 0.972 }, 8);
  txt(frame, "لا توجد أيام مفقودة — تم تغطية جميع أيام الشهر بنجاح", 540, 396, 13, C.green, "SemiBold");

  // ── CARD 2 — COLLAPSED ────────────────────────────────────────────────────
  const c2 = rect(frame, 20, 480, 1144, 60, C.white, 12);
  c2.strokes = [{ type: "SOLID", color: C.gray200 }]; c2.strokeWeight = 1;

  txt(frame, "v", 44, 498, 12, C.gray400, "Bold");
  txt(frame, "فرع جدة", 1020, 498, 14, C.gray900, "SemiBold");
  txt(frame, "ديسمبر 2025", 830, 502, 13, C.gray600);
  txt(frame, "28 فاتورة", 670, 502, 13, C.gray600);
  txt(frame, "38,500 ر.س", 510, 502, 14, C.gray900, "SemiBold");
  badge(frame, "مُرسل", 390, 499, { r: 0.94, g: 0.996, b: 0.972 }, C.green, 64, 22);

  // ── CARD 3 — COLLAPSED (with missing days warning) ────────────────────────
  const c3 = rect(frame, 20, 560, 1144, 60, C.white, 12);
  c3.strokes = [{ type: "SOLID", color: C.gray200 }]; c3.strokeWeight = 1;

  txt(frame, "v", 44, 578, 12, C.gray400, "Bold");
  txt(frame, "فرع الدمام", 1010, 578, 14, C.gray900, "SemiBold");
  txt(frame, "نوفمبر 2025", 830, 582, 13, C.gray600);
  txt(frame, "22 فاتورة", 670, 582, 13, C.gray600);
  txt(frame, "29,800 ر.س", 510, 582, 14, C.gray900, "SemiBold");
  badge(frame, "ناقص", 390, 579, { r: 0.99, g: 0.96, b: 0.88 }, C.yellowDark, 64, 22);

  // ── SUMMARY FOOTER ────────────────────────────────────────────────────────
  const footerCard = rect(frame, 20, 640, 1144, 72, C.white, 12);
  footerCard.strokes = [{ type: "SOLID", color: C.gray200 }]; footerCard.strokeWeight = 1;
  txt(frame, "الإجمالي الكلي للإرسالات:", 1060, 658, 13, C.gray600, "Medium");
  txt(frame, "113,300.00 ر.س", 860, 658, 16, C.gray900, "Bold");
  txt(frame, "إجمالي الفواتير: 81 فاتورة في 3 فروع", 1060, 682, 12, C.gray400);

  const exportBtn = rect(frame, 36, 656, 160, 36, C.gray100, 8);
  exportBtn.strokes = [{ type: "SOLID", color: C.gray200 }]; exportBtn.strokeWeight = 1;
  txt(frame, "تصدير Excel", 56, 666, 12, C.gray700, "Medium");

  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("09 · Submissions Report — تم ✓");
})();
