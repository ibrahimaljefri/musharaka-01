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
      const badgeBg = rect(frame, 1440 - SB_W + 12, 820, 110, 28, C.yellowLight, 8);
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
    const dot = figma.createEllipse();
    dot.resize(10, 10); dot.x = 120; dot.y = 23;
    dot.fills = [{ type: "SOLID", color: C.green }];
    frame.appendChild(dot);
    txt(frame, "متصل بسينومي", 134, 20, 11, C.gray400);
  }

  // ── FRAME ────────────────────────────────────────────────────────────────
  const frame = figma.createFrame();
  frame.name = "07 · Create Branch";
  frame.resize(1440, 900);
  rect(frame, 0, 0, 1440, 900, C.bg);
  figma.currentPage.appendChild(frame);

  topbar(frame, "إضافة فرع جديد");
  sidebarApp(frame, "الفروع");

  // ── BACK LINK ─────────────────────────────────────────────────────────────
  txt(frame, "← العودة إلى الفروع", 20, 72, 13, C.yellowDark, "Medium");

  // ── FORM CARD ─────────────────────────────────────────────────────────────
  const formCard = rect(frame, 20, 104, 780, 760, C.white, 12);
  formCard.strokes = [{ type: "SOLID", color: C.gray200 }];
  formCard.strokeWeight = 1;

  txt(frame, "بيانات الفرع", 740, 120, 16, C.gray900, "SemiBold");
  rect(frame, 20, 148, 780, 1, C.gray100);

  const fields = [
    ["كود الفرع *",         170],
    ["اسم الفرع *",         254],
    ["اسم العلامة التجارية", 338],
    ["رقم العقد",            422],
    ["الموقع",               506],
    ["التوكن",               590],
  ];

  for (const [label, y] of fields) {
    txt(frame, label, 760, y, 13, C.gray700, "Medium");
    const box = rect(frame, 40, y + 20, 740, 40, C.white, 8);
    box.strokes = [{ type: "SOLID", color: C.gray200 }];
    box.strokeWeight = 1;
  }

  // ── PLACEHOLDER TEXT IN FIRST TWO FIELDS ─────────────────────────────────
  txt(frame, "مثال: BR-001", 60, 182, 12, C.gray400);
  txt(frame, "مثال: فرع الرياض الرئيسي", 60, 266, 12, C.gray400);

  // ── ACTION BUTTONS ────────────────────────────────────────────────────────
  const saveBtn = rect(frame, 40, 680, 740, 44, C.yellow, 10);
  txt(frame, "حفظ الفرع", 350, 692, 14, C.white, "SemiBold");

  const cancelBtn = rect(frame, 40, 736, 740, 40, C.white, 10);
  cancelBtn.strokes = [{ type: "SOLID", color: C.gray200 }];
  cancelBtn.strokeWeight = 1;
  txt(frame, "إلغاء", 378, 748, 13, C.gray600, "Medium");

  // ── TIPS PANEL ────────────────────────────────────────────────────────────
  const tipsCard = rect(frame, 820, 104, 344, 300, C.yellowLight, 12);
  tipsCard.strokes = [{ type: "SOLID", color: C.yellow }];
  tipsCard.strokeWeight = 1;

  txt(frame, "نصائح مفيدة", 1100, 122, 14, C.yellowDark, "SemiBold");
  rect(frame, 820, 148, 344, 1, C.yellow);

  const tips = [
    "الكود يجب أن يكون فريداً لكل فرع",
    "التوكن يُستخدم للتكامل مع سينومي",
    "رقم العقد يظهر في تقارير الإرسال",
  ];
  tips.forEach((tip, i) => {
    txt(frame, "• " + tip, 1140, 164 + i * 44, 12, C.yellowDark);
  });

  // ── FIELD REQUIREMENTS LEGEND ─────────────────────────────────────────────
  const legendCard = rect(frame, 820, 424, 344, 100, C.white, 12);
  legendCard.strokes = [{ type: "SOLID", color: C.gray200 }];
  legendCard.strokeWeight = 1;
  txt(frame, "الحقول الإلزامية", 1090, 440, 13, C.gray700, "SemiBold");
  txt(frame, "الحقول المُعلَّمة بـ * إلزامية ولا يمكن ترك الفرع", 1100, 462, 11, C.gray600);
  txt(frame, "بدون كود الفرع واسمه.", 1100, 478, 11, C.gray600);

  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("07 · Create Branch — تم ✓");
})();
