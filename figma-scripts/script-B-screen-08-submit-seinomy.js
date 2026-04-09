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
  frame.name = "08 · Submit to Seinomy";
  frame.resize(1440, 900);
  rect(frame, 0, 0, 1440, 900, C.bg);
  figma.currentPage.appendChild(frame);

  topbar(frame, "إرسال الفواتير");
  sidebarApp(frame, "إرسال الفواتير");

  // ── CENTERED CARD ─────────────────────────────────────────────────────────
  const cardX = 292, cardW = 600;
  const card = rect(frame, cardX, 80, cardW, 720, C.white, 16);
  card.strokes = [{ type: "SOLID", color: C.gray200 }];
  card.strokeWeight = 1;

  // ── SEINOMY STATUS BADGE ──────────────────────────────────────────────────
  const statusBg = rect(frame, cardX + 120, 112, 360, 44, { r: 0.94, g: 0.996, b: 0.972 }, 22);
  statusBg.strokes = [{ type: "SOLID", color: C.green }];
  statusBg.strokeWeight = 1;
  const dot = figma.createEllipse();
  dot.resize(10, 10); dot.x = cardX + 140; dot.y = 129;
  dot.fills = [{ type: "SOLID", color: C.green }];
  frame.appendChild(dot);
  txt(frame, "متصل بسينومي — جاهز للإرسال", cardX + 160, 124, 13, C.green, "SemiBold");

  // ── HEADING ───────────────────────────────────────────────────────────────
  txt(frame, "إرسال الفواتير إلى سينومي", cardX + cardW - 32, 174, 20, C.gray900, "Bold");
  rect(frame, cardX + 20, 208, cardW - 40, 1, C.gray200);

  // ── THREE FILTER DROPDOWNS ────────────────────────────────────────────────
  // Labels row
  txt(frame, "الفرع", cardX + cardW - 50, 228, 12, C.gray700, "Medium");
  txt(frame, "الشهر", cardX + cardW - 230, 228, 12, C.gray700, "Medium");
  txt(frame, "السنة", cardX + cardW - 400, 228, 12, C.gray700, "Medium");

  // Dropdown boxes — full-width split into 3
  const dropW = (cardW - 60) / 3;  // ~180px each

  const d1 = rect(frame, cardX + 20, 248, dropW, 40, C.white, 8);
  d1.strokes = [{ type: "SOLID", color: C.gray200 }]; d1.strokeWeight = 1;
  txt(frame, "فرع الرياض  ▾", cardX + 32, 260, 13, C.gray900);

  const d2 = rect(frame, cardX + 40 + dropW, 248, dropW, 40, C.white, 8);
  d2.strokes = [{ type: "SOLID", color: C.gray200 }]; d2.strokeWeight = 1;
  txt(frame, "يناير  ▾", cardX + 52 + dropW, 260, 13, C.gray900);

  const d3 = rect(frame, cardX + 60 + dropW * 2, 248, dropW, 40, C.white, 8);
  d3.strokes = [{ type: "SOLID", color: C.gray200 }]; d3.strokeWeight = 1;
  txt(frame, "2026  ▾", cardX + 72 + dropW * 2, 260, 13, C.gray900);

  // ── SUMMARY BOX ───────────────────────────────────────────────────────────
  const sumBox = rect(frame, cardX + 20, 312, cardW - 40, 220, C.gray100, 12);
  txt(frame, "ملخص الإرسال", cardX + cardW - 50, 330, 13, C.gray700, "SemiBold");
  rect(frame, cardX + 20, 354, cardW - 40, 1, C.gray200);

  const summaryRows = [
    ["الفرع المختار:",  "فرع الرياض"],
    ["الفترة:",         "يناير 2026"],
    ["الفواتير المعلقة:", "31 فاتورة"],
    ["الإجمالي:",       "45,000.00 ر.س"],
  ];
  summaryRows.forEach(([label, val], i) => {
    const rowY = 366 + i * 40;
    txt(frame, label, cardX + cardW - 50, rowY, 13, C.gray600);
    txt(frame, val, cardX + 36, rowY, 13, C.gray900, "SemiBold");
    if (i < summaryRows.length - 1) {
      rect(frame, cardX + 20, rowY + 28, cardW - 40, 1, C.gray200);
    }
  });

  // ── WARNING NOTICE ────────────────────────────────────────────────────────
  const warnBox = rect(frame, cardX + 20, 552, cardW - 40, 56, { r: 0.99, g: 0.96, b: 0.88 }, 8);
  warnBox.strokes = [{ type: "SOLID", color: C.yellow }];
  warnBox.strokeWeight = 1;
  txt(frame, "تنبيه: الإرسال لا يمكن التراجع عنه بعد اكتماله.", cardX + cardW - 50, 568, 12, C.yellowDark, "SemiBold");
  txt(frame, "تأكد من صحة البيانات قبل الضغط على إرسال.", cardX + cardW - 50, 586, 11, C.yellowDark);

  // ── SUBMIT BUTTON ─────────────────────────────────────────────────────────
  const submitBtn = rect(frame, cardX + 20, 628, cardW - 40, 52, C.yellow, 12);
  txt(frame, "إرسال الفواتير إلى سينومي", cardX + 186, 646, 15, C.white, "Bold");

  // ── FOOTER LINK ───────────────────────────────────────────────────────────
  txt(frame, "← عرض تقرير الإرسالات السابقة", cardX + cardW - 50, 698, 13, C.yellowDark, "Medium");

  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("08 · Submit to Seinomy — تم ✓");
})();
