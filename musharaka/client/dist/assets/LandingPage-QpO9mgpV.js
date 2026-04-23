import{j as e,U as j}from"./index-BoWWuRo5.js";import{r as p,L as o}from"./vendor-react-qpffwk7a.js";import"./vendor-supabase-DScyxbht.js";import"./vendor-ui-CV0m3Mkw.js";const t={gold:"#F59E0B",bg:"#080E1A",goldGlass:"rgba(245,158,11,0.12)",goldBorder:"rgba(245,158,11,0.35)",text:"#F8FAFC",textSec:"rgba(255,255,255,0.6)"},v=[{icon:"🏢",title:"إدارة مبيعات متعددة الفروع",desc:"تحكم كامل في مبيعات جميع فروعك من لوحة واحدة — بصلاحيات دقيقة لكل مستخدم.",tint:"rgba(245,158,11,0.18)"},{icon:"🔗",title:"تكامل كامل مع المنصات",desc:"أرسل الفواتير إلى منصات الدفع بنقرة واحدة — متزامن، مؤرشف، وآمن.",tint:"rgba(16,185,129,0.18)"},{icon:"💬",title:"بوت واتساب و تيليجرام",desc:"استلم وأرسل المبيعات عبر المحادثة — البوت يفهم اللغة العربية بطلاقة.",tint:"rgba(139,92,246,0.18)"},{icon:"📊",title:"استيراد Excel بضغطة",desc:"ارفع ملفات Excel الجاهزة من أنظمة POS الخاصة بك — استيراد ذكي بدون أخطاء.",tint:"rgba(59,130,246,0.18)"},{icon:"📈",title:"تقارير ولوحة تحكم",desc:"رسوم بيانية حية، تقارير يومية/شهرية، وتنبيهات لحظية لكل فرع.",tint:"rgba(236,72,153,0.18)"},{icon:"👥",title:"إدارة المستخدمين",desc:"أنشئ حسابات لمشرفي الفروع والمحاسبين — كل صلاحية في مكانها.",tint:"rgba(245,158,11,0.18)"}],y=[{value:500,suffix:"+",label:"فرع نشط"},{value:1e4,suffix:"+",label:"فاتورة شهرياً"},{value:99.9,suffix:"%",label:"وقت التشغيل",decimals:1},{value:24,suffix:"/7",label:"دعم عربي"}],w=[{num:"01",title:"مشاركه مبيعات بكل سلاسه",desc:"يدوياً، أو عبر استيراد Excel، أو مباشرة من البوت — المرونة الكاملة.",icon:"📝"},{num:"02",title:"راجع الفواتير",desc:"تحقق من كل فاتورة، عدّل إن احتجت، وأكد الأرقام قبل الإرسال.",icon:"✓"},{num:"03",title:"أرسل الدفعة",desc:"بنقرة واحدة تُرسل الدفعة كاملة إلى المنصة وتُؤرشف لديك.",icon:"🚀"}],k=[{name:"أساسي",annual:999,monthly:83,branches:"3 فروع",users:"1 مستخدم",features:["إدارة 3 فروع","مستخدم واحد","تكامل أساسي مع المنصات","بوت واتساب/تيليجرام","استيراد Excel","تقارير شهرية","دعم عبر البريد"],cta:"ابدأ الآن",highlight:!1},{name:"متوسط",annual:1999,monthly:167,branches:"8 فروع",users:"1 مستخدم",features:["إدارة 8 فروع","مستخدم واحد","تكامل كامل مع المنصات","بوت متقدم مع الذكاء الاصطناعي","استيراد Excel ذكي","تقارير يومية + لوحة تحكم حية","دعم ذو أولوية عبر واتساب","تصدير PDF للفواتير"],cta:"الخطة الأكثر طلباً",highlight:!0,badge:"⭐ الأكثر طلباً"},{name:"متقدم",annual:3999,monthly:333,branches:"15 فرع",users:"1 مستخدم",features:["إدارة 15 فرع","مستخدم واحد","جميع ميزات الخطة المتوسطة","تحليلات AI للمبيعات","تقارير مخصصة","API خاص بالدمج","مدير حساب مخصص","دعم 24/7 هاتفي"],cta:"تواصل معنا",highlight:!1}];function N(n={}){const i=p.useRef(null),[l,d]=p.useState(!1);return p.useEffect(()=>{const a=i.current;if(!a)return;const r=new IntersectionObserver(([s])=>{s.isIntersecting&&(d(!0),r.disconnect())},{threshold:n.threshold??.15});return r.observe(a),()=>r.disconnect()},[n.threshold]),[i,l]}function F({target:n,suffix:i="",decimals:l=0,start:d}){const[a,r]=p.useState(0);p.useEffect(()=>{if(!d)return;const g=1800,c=performance.now();let x;const b=m=>{const f=m-c,h=Math.min(f/g,1),u=1-Math.pow(1-h,3);r(n*u),h<1?x=requestAnimationFrame(b):r(n)};return x=requestAnimationFrame(b),()=>cancelAnimationFrame(x)},[n,d]);const s=l>0?a.toFixed(l):Math.floor(a).toLocaleString("en-US");return e.jsxs("span",{className:"lp-counter",children:[s,i]})}function z({open:n,onClose:i}){return n?e.jsx("div",{onClick:i,style:{position:"fixed",inset:0,background:"rgba(4,8,16,0.75)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp .25s ease"},children:e.jsxs("div",{onClick:l=>l.stopPropagation(),style:{background:"linear-gradient(180deg,#0F1626 0%, #0A1220 100%)",border:`1px solid ${t.goldBorder}`,borderRadius:20,maxWidth:440,width:"100%",padding:32,boxShadow:"0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(245,158,11,0.15)"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:24},children:[e.jsx("h3",{style:{margin:0,fontSize:22,color:t.gold,fontWeight:800},children:"تواصل معنا"}),e.jsx("button",{onClick:i,style:{background:"transparent",border:"none",color:t.textSec,fontSize:24,cursor:"pointer",lineHeight:1},children:"×"})]}),e.jsx("p",{style:{color:t.textSec,fontSize:15,lineHeight:1.7,marginBottom:24},children:"فريق عروة جاهز للرد عليك خلال دقائق. اختر القناة التي تفضلها:"}),e.jsxs("a",{href:"https://wa.me/966500000000",target:"_blank",rel:"noreferrer",style:{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderRadius:14,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.35)",color:t.text,textDecoration:"none",marginBottom:12,fontWeight:600},children:[e.jsx("span",{style:{fontSize:24},children:"💬"}),e.jsxs("div",{children:[e.jsx("div",{children:"واتساب"}),e.jsx("div",{style:{fontSize:13,color:t.textSec,fontWeight:400},children:"+966 50 000 0000"})]})]}),e.jsxs("a",{href:"mailto:info@urwah.sa",style:{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderRadius:14,background:t.goldGlass,border:`1px solid ${t.goldBorder}`,color:t.text,textDecoration:"none",fontWeight:600},children:[e.jsx("span",{style:{fontSize:24},children:"✉️"}),e.jsxs("div",{children:[e.jsx("div",{children:"البريد الإلكتروني"}),e.jsx("div",{style:{fontSize:13,color:t.textSec,fontWeight:400},children:"info@urwah.sa"})]})]})]})}):null}function I(){const[n,i]=p.useState(!1),[l,d]=N({threshold:.3});return p.useEffect(()=>{const a=[];return document.querySelectorAll(".lp-reveal").forEach((s,g)=>{const c=new IntersectionObserver(([x])=>{x.isIntersecting&&(setTimeout(()=>s.classList.add("lp-visible"),g%6*100),c.disconnect())},{threshold:.12});c.observe(s),a.push(c)}),()=>a.forEach(s=>s.disconnect())},[]),e.jsxs("div",{dir:"rtl",lang:"ar",style:{background:t.bg,color:t.text,fontFamily:"'Cairo', 'Tajawal', system-ui, sans-serif",minHeight:"100vh",overflowX:"hidden"},children:[e.jsx(B,{}),e.jsx("div",{className:"lp-announce",children:e.jsxs("div",{className:"lp-announce-track",children:[e.jsx("span",{children:"🚀 عروة — نظام إدارة المبيعات الاحترافي  |  متاح الآن للمستأجرين في المملكة العربية السعودية  • "}),e.jsx("span",{children:"🚀 عروة — نظام إدارة المبيعات الاحترافي  |  متاح الآن للمستأجرين في المملكة العربية السعودية  • "}),e.jsx("span",{children:"🚀 عروة — نظام إدارة المبيعات الاحترافي  |  متاح الآن للمستأجرين في المملكة العربية السعودية  • "})]})}),e.jsx("nav",{className:"lp-nav",children:e.jsxs("div",{className:"lp-nav-inner",children:[e.jsx("div",{className:"lp-nav-brand",children:e.jsx("span",{children:"عروة"})}),e.jsxs("div",{className:"lp-nav-links",children:[e.jsx("a",{href:"#features",children:"الميزات"}),e.jsx("a",{href:"#pricing",children:"الأسعار"}),e.jsx("a",{href:"#how",children:"كيف يعمل؟"})]}),e.jsxs("div",{className:"lp-nav-cta",children:[e.jsx(o,{to:"/login",className:"lp-btn lp-btn-ghost",children:"تسجيل الدخول"}),e.jsx(o,{to:"/register",className:"lp-btn lp-btn-primary",children:"ابدأ الآن"})]})]})}),e.jsxs("section",{className:"lp-hero",children:[e.jsxs("div",{className:"lp-hero-bg",children:[e.jsx("div",{className:"lp-orb lp-orb-1"}),e.jsx("div",{className:"lp-orb lp-orb-2"}),e.jsx("div",{className:"lp-orb lp-orb-3"}),e.jsx("div",{className:"lp-dotgrid"})]}),e.jsxs("div",{className:"lp-hero-content",children:[e.jsx("div",{className:"lp-hero-logo",children:e.jsxs("div",{style:{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"20px 32px",borderRadius:24,background:"linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)",backdropFilter:"blur(20px) saturate(130%)",WebkitBackdropFilter:"blur(20px) saturate(130%)",boxShadow:"0 8px 40px rgba(0,0,0,0.55), 0 0 80px rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.22)"},children:[e.jsx("div",{style:{position:"absolute",top:0,left:"12%",right:"12%",height:1,background:"linear-gradient(90deg,transparent,rgba(245,158,11,0.65),rgba(251,191,36,0.45),rgba(245,158,11,0.65),transparent)"}}),e.jsx("div",{style:{position:"absolute",inset:0,borderRadius:24,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.10)"}}),e.jsx("div",{style:{position:"absolute",inset:-1,borderRadius:25,boxShadow:"0 0 60px rgba(245,158,11,0.20), 0 0 120px rgba(245,158,11,0.08)",pointerEvents:"none"}}),e.jsx(j,{width:210,id:"hero-ul",variant:"full",glow:!0})]})}),e.jsxs("div",{className:"lp-hero-badge",children:[e.jsx("span",{className:"lp-dot"})," جاهز للإطلاق في المملكة العربية السعودية"]}),e.jsxs("h1",{className:"lp-hero-title",children:[e.jsx("span",{className:"lp-gradient-gold",children:"نظام إدارة مبيعات"}),e.jsx("br",{}),e.jsx("span",{children:"الفروع الاحترافي"})]}),e.jsx("p",{className:"lp-hero-sub",children:"ربط سلس بين فروعك والمنصات — إدارة المبيعات اليومية، التقارير، والإرسالات في مكان واحد."}),e.jsxs("div",{className:"lp-hero-ctas",children:[e.jsxs(o,{to:"/register",className:"lp-btn lp-btn-primary lp-btn-lg",children:["ابدأ تجربة مجانية",e.jsx("span",{className:"lp-arrow",children:"←"})]}),e.jsx("a",{href:"#how",className:"lp-btn lp-btn-ghost lp-btn-lg",children:"شاهد كيف يعمل ▶"})]}),e.jsx("div",{className:"lp-hero-trust",children:e.jsx("span",{children:"✓ دعم عربي كامل"})})]}),e.jsx("div",{className:"lp-scroll-arrow",children:e.jsx("span",{children:"↓"})})]}),e.jsx("section",{className:"lp-stats",ref:l,children:e.jsx("div",{className:"lp-container",children:e.jsx("div",{className:"lp-stats-grid",children:y.map(a=>e.jsxs("div",{className:"lp-stat",children:[e.jsx("div",{className:"lp-stat-value",children:e.jsx(F,{target:a.value,suffix:a.suffix,decimals:a.decimals,start:d})}),e.jsx("div",{className:"lp-stat-label",children:a.label})]},a.label))})})}),e.jsx("section",{className:"lp-preview-section",children:e.jsxs("div",{className:"lp-container",children:[e.jsxs("div",{className:"lp-section-head",style:{textAlign:"center",maxWidth:720,margin:"0 auto 56px"},children:[e.jsx("div",{className:"lp-eyebrow",children:"معاينة المنصة"}),e.jsxs("h2",{className:"lp-section-title",children:["لوحة تحكم احترافية",e.jsx("br",{}),e.jsx("span",{className:"lp-gradient-gold",children:"بتصميم عربي أصيل"})]}),e.jsx("p",{className:"lp-section-sub",children:"كل ما تحتاجه لإدارة مبيعات فروعك في مكان واحد — بيانات لحظية، تقارير فورية، وإرسال تلقائي للمنصات."})]}),e.jsxs("div",{style:{maxWidth:860,margin:"0 auto",position:"relative",borderRadius:16,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.70), 0 0 120px rgba(245,158,11,0.08)",border:"1px solid rgba(255,255,255,0.10)"},children:[e.jsx("div",{style:{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 40% at 50% 0%,rgba(245,158,11,0.06) 0%,transparent 70%)"}}),e.jsxs("div",{style:{background:"rgba(15,22,40,0.95)",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.08)"},children:[e.jsx("div",{style:{display:"flex",gap:6},children:["#FF5F57","#FFBD2E","#28CA41"].map(a=>e.jsx("div",{style:{width:12,height:12,borderRadius:"50%",background:a}},a))}),e.jsx("div",{style:{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:6,padding:"4px 12px",fontSize:12,color:"rgba(255,255,255,0.40)",fontFamily:"monospace",border:"1px solid rgba(255,255,255,0.08)"},children:"apps.stepup2you.com/dashboard"})]}),e.jsxs("div",{style:{background:"#080E1A",padding:20},dir:"rtl",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:20},children:[e.jsx("span",{style:{fontSize:16,fontWeight:700,color:"#fff",fontFamily:"inherit"},children:"مشاركة — لوحة التحكم"}),e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.30)",color:"#10b981"},children:[e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:"#10b981",display:"inline-block"}}),"متصل بالمنصة"]})]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20},children:[{label:"إجمالي المبيعات",value:"ر.س 125,450",color:"#34d399",bg:"rgba(6,78,59,0.35)"},{label:"مبيعات الشهر",value:"ر.س 38,500",color:"#f87171",bg:"rgba(127,29,29,0.35)"},{label:"الفواتير المرسلة",value:"156",color:"#c084fc",bg:"rgba(88,28,135,0.35)"},{label:"أيام مفقودة",value:"3 أيام",color:"#2dd4bf",bg:"rgba(19,78,74,0.35)"}].map(a=>e.jsxs("div",{style:{borderRadius:10,padding:"14px 16px",background:a.bg,border:"1px solid rgba(255,255,255,0.08)"},children:[e.jsx("div",{style:{fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:8},children:a.label}),e.jsx("div",{style:{fontSize:"clamp(16px,2vw,24px)",fontWeight:900,color:a.color},children:a.value})]},a.label))}),e.jsx("div",{style:{fontSize:11,color:"rgba(255,255,255,0.40)",marginBottom:10},children:"آخر المبيعات"}),[{branch:"فرع الرياض – يومي",date:"2026-04-09",amount:"ر.س 4,500"},{branch:"فرع جدة – شهري",date:"2026-04-08",amount:"ر.س 31,200"},{branch:"فرع الدمام – يومي",date:"2026-04-08",amount:"ر.س 2,800"},{branch:"فرع مكة – فترة",date:"2026-04-01",amount:"ر.س 18,000"}].map((a,r,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 4px",borderBottom:r<s.length-1?"1px solid rgba(255,255,255,0.05)":"none"},children:[e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#fff"},children:a.branch}),e.jsx("span",{style:{fontSize:12,color:"rgba(255,255,255,0.40)"},children:a.date}),e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#FBBF24"},children:a.amount})]},a.branch))]})]})]})}),e.jsx("section",{className:"lp-section",id:"features",children:e.jsxs("div",{className:"lp-container",children:[e.jsxs("div",{className:"lp-section-head",children:[e.jsx("div",{className:"lp-eyebrow",children:"الميزات"}),e.jsxs("h2",{className:"lp-section-title",children:["كل ما تحتاجه ",e.jsx("span",{className:"lp-gradient-gold",children:"لإدارة مبيعاتك"})]}),e.jsx("p",{className:"lp-section-sub",children:"ست قدرات أساسية تم تصميمها من الصفر لسوق التجزئة السعودي، وللتكامل الكامل مع منظومات الدفع."})]}),e.jsx("div",{className:"lp-features-grid",children:v.map((a,r)=>e.jsxs("article",{className:"lp-feature lp-reveal",style:{"--delay":`${r*80}ms`},children:[e.jsx("div",{className:"lp-feature-icon",style:{background:a.tint},children:e.jsx("span",{children:a.icon})}),e.jsx("h3",{children:a.title}),e.jsx("p",{children:a.desc}),e.jsx("div",{className:"lp-feature-shine"})]},a.title))})]})}),e.jsx("section",{className:"lp-section lp-section-alt",id:"how",children:e.jsxs("div",{className:"lp-container",children:[e.jsxs("div",{className:"lp-section-head",children:[e.jsx("div",{className:"lp-eyebrow",children:"كيف يعمل"}),e.jsxs("h2",{className:"lp-section-title",children:["من المبيعات الخام ",e.jsx("span",{className:"lp-gradient-gold",children:"إلى الإرسال"})," في ثلاث خطوات"]})]}),e.jsxs("div",{className:"lp-steps",children:[e.jsx("div",{className:"lp-steps-line"}),w.map(a=>e.jsxs("div",{className:"lp-step lp-reveal",children:[e.jsx("div",{className:"lp-step-num",children:a.num}),e.jsx("div",{className:"lp-step-icon",children:a.icon}),e.jsx("h3",{children:a.title}),e.jsx("p",{children:a.desc})]},a.num))]})]})}),e.jsx("section",{className:"lp-section lp-section-alt",id:"pricing",children:e.jsxs("div",{className:"lp-container",children:[e.jsxs("div",{className:"lp-section-head",children:[e.jsx("div",{className:"lp-eyebrow",children:"الأسعار"}),e.jsxs("h2",{className:"lp-section-title",children:["اختر الخطة ",e.jsx("span",{className:"lp-gradient-gold",children:"المناسبة لك"})]}),e.jsx("p",{className:"lp-section-sub",children:"أسعار سنوية شفافة. فروع ومستخدمين إضافيين متاحين حسب الحاجة."})]}),e.jsx("div",{className:"lp-pricing-grid",children:k.map(a=>e.jsxs("div",{className:`lp-price-card lp-reveal ${a.highlight?"lp-price-highlight":""}`,children:[a.badge&&e.jsx("div",{className:"lp-price-badge",children:a.badge}),e.jsx("div",{className:"lp-price-name",children:a.name}),e.jsxs("div",{className:"lp-price-amount",children:[e.jsx("span",{className:"lp-price-num",children:a.annual.toLocaleString("en-US")}),e.jsx("span",{className:"lp-price-cur",children:"ر.س"})]}),e.jsxs("div",{className:"lp-price-period",children:["سنوياً  ·  ما يعادل ",a.monthly," ر.س/شهر"]}),e.jsxs("div",{className:"lp-price-quota",children:[e.jsxs("span",{children:["🏢 ",a.branches]}),e.jsxs("span",{children:["👤 ",a.users]})]}),e.jsx("ul",{className:"lp-price-feats",children:a.features.map(r=>e.jsxs("li",{children:[e.jsx("span",{className:"lp-check",children:"✓"}),r]},r))}),e.jsx(o,{to:"/register",className:`lp-btn ${a.highlight?"lp-btn-primary":"lp-btn-ghost"} lp-btn-block`,children:a.cta})]},a.name))}),e.jsxs("div",{className:"lp-extras",children:[e.jsx("span",{style:{color:"rgba(255,255,255,0.55)",fontSize:14},children:"فروع ومستخدمين إضافيين متاحين —"}),e.jsx("span",{className:"lp-extra-val",style:{fontSize:14,marginRight:6},children:"تواصل معنا للاستفسار"})]})]})}),e.jsx("section",{className:"lp-section",children:e.jsx("div",{className:"lp-container",children:e.jsxs("div",{className:"lp-cta",children:[e.jsx("div",{className:"lp-cta-glow"}),e.jsxs("h2",{children:["جاهز للبدء؟ ",e.jsx("span",{className:"lp-gradient-gold",children:"انضم إلى عروة اليوم"})]}),e.jsx("p",{children:"جرّب النظام مجاناً — بدون بطاقة ائتمانية، وبدون التزامات. ستشعر بالفرق من اليوم الأول."}),e.jsxs("div",{className:"lp-cta-btns",children:[e.jsx(o,{to:"/register",className:"lp-btn lp-btn-primary lp-btn-lg",children:"ابدأ التجربة المجانية"}),e.jsx("button",{onClick:()=>i(!0),className:"lp-btn lp-btn-ghost lp-btn-lg",children:"تحدث مع المبيعات"})]}),e.jsxs("div",{className:"lp-cta-trust",children:[e.jsx("span",{children:"🔒 بيانات مشفّرة"}),e.jsx("span",{children:"🇸🇦 مستضاف في المملكة"}),e.jsx("span",{children:"⚡ إعداد خلال 5 دقائق"})]})]})})}),e.jsx("footer",{className:"lp-footer",children:e.jsxs("div",{className:"lp-container",children:[e.jsxs("div",{className:"lp-footer-grid",children:[e.jsxs("div",{className:"lp-footer-brand",children:[e.jsx("div",{className:"lp-nav-brand",children:e.jsx("span",{children:"عروة"})}),e.jsx("p",{children:"نظام إدارة المبيعات الاحترافي لإدارة فروعك وفواتيرك."})]}),e.jsxs("div",{children:[e.jsx("h4",{children:"المنتج"}),e.jsx("a",{href:"#features",children:"الميزات"}),e.jsx("a",{href:"#pricing",children:"الأسعار"}),e.jsx("a",{href:"#how",children:"كيف يعمل؟"})]}),e.jsxs("div",{children:[e.jsx("h4",{children:"الشركة"}),e.jsx("button",{onClick:()=>i(!0),className:"lp-footer-link-btn",children:"تواصل معنا"}),e.jsx("a",{href:"#",children:"عن عروة"}),e.jsx("a",{href:"#",children:"الخصوصية"})]}),e.jsxs("div",{children:[e.jsx("h4",{children:"حسابي"}),e.jsx(o,{to:"/login",children:"تسجيل الدخول"}),e.jsx(o,{to:"/register",children:"إنشاء حساب"})]})]}),e.jsxs("div",{className:"lp-footer-bar",children:[e.jsx("span",{children:"© 2026 عروة — جميع الحقوق محفوظة"}),e.jsx("span",{children:"صُنع بعناية في المملكة العربية السعودية 🇸🇦"})]})]})}),e.jsx(z,{open:n,onClose:()=>i(!1)})]})}function B(){return e.jsx("style",{children:`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');

      .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

      @keyframes floatOrb {
        0%,100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-30px) scale(1.05); }
      }
      @keyframes shimmerGold {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      @keyframes marqueeRTL {
        0% { transform: translateX(0); }
        100% { transform: translateX(50%); }
      }
      @keyframes bounceArrow {
        0%,100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(8px); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(32px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes counterPulse {
        0%,100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes pulseDot {
        0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
        50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
      }
      @keyframes msgIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Announce banner */
      .lp-announce {
        position: fixed; top: 0; left: 0; right: 0;
        height: 36px;
        background: linear-gradient(90deg, #D97706, #F59E0B, #FBBF24, #F59E0B, #D97706);
        background-size: 200% 100%;
        animation: shimmerGold 6s linear infinite;
        overflow: hidden;
        z-index: 1000;
        border-bottom: 1px solid rgba(0,0,0,0.2);
      }
      .lp-announce-track {
        display: flex; gap: 0;
        white-space: nowrap;
        animation: marqueeRTL 30s linear infinite;
        height: 36px;
        align-items: center;
        color: #0A1220;
        font-weight: 800;
        font-size: 13px;
      }
      .lp-announce-track span { padding: 0 28px; }

      /* Nav */
      .lp-nav {
        position: sticky; top: 36px; z-index: 900;
        background: rgba(8,14,26,0.72);
        backdrop-filter: blur(20px) saturate(150%);
        -webkit-backdrop-filter: blur(20px) saturate(150%);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .lp-nav-inner {
        max-width: 1200px; margin: 0 auto;
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 24px;
        gap: 24px;
      }
      .lp-nav-brand {
        display: flex; align-items: center; gap: 12px;
        font-weight: 900; font-size: 22px;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .lp-nav-links {
        display: flex; gap: 30px;
      }
      .lp-nav-links a {
        color: rgba(255,255,255,0.72);
        text-decoration: none;
        font-size: 15px; font-weight: 600;
        transition: color .2s;
        position: relative;
      }
      .lp-nav-links a::after {
        content: ''; position: absolute; bottom: -6px; right: 0;
        width: 0; height: 2px; background: #F59E0B;
        transition: width .25s;
      }
      .lp-nav-links a:hover { color: #FBBF24; }
      .lp-nav-links a:hover::after { width: 100%; }
      .lp-nav-cta { display: flex; gap: 10px; align-items: center; }

      @media (max-width: 900px) {
        .lp-nav-links { display: none; }
      }

      /* Buttons */
      .lp-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 11px 22px; border-radius: 12px;
        font-weight: 700; font-size: 15px;
        text-decoration: none; cursor: pointer;
        border: 1px solid transparent;
        transition: transform .2s, box-shadow .25s, background .2s, border-color .2s;
        font-family: inherit;
      }
      .lp-btn-lg { padding: 15px 30px; font-size: 17px; border-radius: 14px; }
      .lp-btn-block { width: 100%; justify-content: center; }
      .lp-btn-primary {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: #0A1220;
        box-shadow: 0 10px 30px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .lp-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 40px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
      }
      .lp-btn-ghost {
        background: rgba(255,255,255,0.04);
        color: #F8FAFC;
        border-color: rgba(245,158,11,0.35);
      }
      .lp-btn-ghost:hover {
        background: rgba(245,158,11,0.1);
        border-color: #F59E0B;
      }
      .lp-arrow { display: inline-block; transition: transform .25s; }
      .lp-btn-primary:hover .lp-arrow { transform: translateX(-4px); }

      /* Hero */
      .lp-hero {
        position: relative;
        min-height: calc(100vh - 36px);
        display: flex; align-items: center; justify-content: center;
        padding: 100px 24px 80px;
        overflow: hidden;
      }
      .lp-hero-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at top, #0F1A2E 0%, #080E1A 60%);
      }
      .lp-orb {
        position: absolute; border-radius: 50%;
        filter: blur(90px); opacity: 0.55;
        animation: floatOrb 12s ease-in-out infinite;
      }
      .lp-orb-1 {
        width: 500px; height: 500px;
        background: radial-gradient(circle, #F59E0B 0%, transparent 70%);
        top: -120px; right: -100px;
      }
      .lp-orb-2 {
        width: 420px; height: 420px;
        background: radial-gradient(circle, #8B5CF6 0%, transparent 70%);
        bottom: -80px; left: -80px;
        animation-delay: -4s;
      }
      .lp-orb-3 {
        width: 320px; height: 320px;
        background: radial-gradient(circle, #FBBF24 0%, transparent 70%);
        top: 40%; left: 30%;
        animation-delay: -7s;
        opacity: 0.3;
      }
      .lp-dotgrid {
        position: absolute; inset: 0;
        background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
        background-size: 28px 28px;
        mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
      }
      .lp-hero-content {
        position: relative; z-index: 1;
        text-align: center; max-width: 880px;
        animation: fadeUp .8s ease both;
      }
      .lp-hero-logo { margin-bottom: 32px; }
      .lp-hero-badge {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 8px 18px; border-radius: 999px;
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.35);
        color: #10B981;
        font-size: 13px; font-weight: 700;
        margin-bottom: 28px;
      }
      .lp-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #10B981;
        animation: pulseDot 2s ease-in-out infinite;
      }
      .lp-hero-title {
        font-size: clamp(40px, 7vw, 78px);
        font-weight: 900; line-height: 1.1;
        margin: 0 0 24px;
        letter-spacing: -0.02em;
      }
      .lp-gradient-gold {
        background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 40%, #D97706 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .lp-hero-sub {
        font-size: clamp(16px, 2vw, 20px);
        color: rgba(255,255,255,0.7);
        max-width: 640px; margin: 0 auto 40px;
        line-height: 1.7;
      }
      .lp-hero-ctas {
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 32px;
      }
      .lp-hero-trust {
        display: flex; gap: 22px; justify-content: center;
        flex-wrap: wrap;
        color: rgba(255,255,255,0.5);
        font-size: 14px;
      }
      .lp-scroll-arrow {
        position: absolute; bottom: 28px; left: 50%;
        transform: translateX(-50%);
        color: rgba(245,158,11,0.7); font-size: 24px;
        animation: bounceArrow 1.8s ease-in-out infinite;
      }

      /* Stats */
      .lp-stats {
        padding: 70px 0;
        background:
          linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.05) 50%, transparent 100%),
          #080E1A;
        border-top: 1px solid rgba(245,158,11,0.1);
        border-bottom: 1px solid rgba(245,158,11,0.1);
      }
      .lp-stats-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
      }
      @media (max-width: 720px) { .lp-stats-grid { grid-template-columns: repeat(2, 1fr); } }
      .lp-stat { text-align: center; }
      .lp-stat-value {
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 900;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        margin-bottom: 4px;
        font-family: 'Cairo', sans-serif;
      }
      .lp-stat-label {
        color: rgba(255,255,255,0.55);
        font-size: 14px; font-weight: 600;
        letter-spacing: 0.02em;
      }

      /* Platform Preview */
      .lp-preview-section { padding: 100px 0 80px; position: relative; }

      /* Sections */
      .lp-section { padding: 110px 0; position: relative; }
      .lp-section-alt {
        background:
          linear-gradient(180deg, transparent 0%, #0A1220 50%, transparent 100%);
      }
      .lp-section-head { text-align: center; max-width: 720px; margin: 0 auto 64px; }
      .lp-eyebrow {
        display: inline-block;
        padding: 5px 14px; border-radius: 999px;
        background: rgba(245,158,11,0.1);
        border: 1px solid rgba(245,158,11,0.3);
        color: #FBBF24;
        font-size: 12px; font-weight: 800;
        letter-spacing: 0.08em;
        margin-bottom: 18px;
        text-transform: uppercase;
      }
      .lp-section-title {
        font-size: clamp(30px, 4.5vw, 50px);
        font-weight: 900; line-height: 1.2;
        margin: 0 0 16px;
        letter-spacing: -0.02em;
      }
      .lp-section-sub {
        color: rgba(255,255,255,0.6);
        font-size: 17px; line-height: 1.7;
        margin: 0;
      }

      /* Reveal */
      .lp-reveal {
        opacity: 0; transform: translateY(32px);
        transition: opacity .7s ease, transform .7s ease;
      }
      .lp-visible { opacity: 1; transform: translateY(0); }

      /* Features */
      .lp-features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      @media (max-width: 980px) { .lp-features-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 620px) { .lp-features-grid { grid-template-columns: 1fr; } }
      .lp-feature {
        position: relative;
        padding: 32px 28px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        overflow: hidden;
        transition: transform .35s, border-color .35s, box-shadow .35s;
      }
      .lp-feature:hover {
        transform: translateY(-4px);
        border-color: rgba(245,158,11,0.4);
        box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.15);
      }
      .lp-feature-icon {
        width: 56px; height: 56px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
        border: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 22px;
      }
      .lp-feature h3 {
        font-size: 19px; font-weight: 800;
        margin: 0 0 10px; color: #F8FAFC;
      }
      .lp-feature p {
        color: rgba(255,255,255,0.58);
        font-size: 14.5px; line-height: 1.75; margin: 0;
      }
      .lp-feature-shine {
        position: absolute; top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: linear-gradient(115deg, transparent 40%, rgba(245,158,11,0.08) 50%, transparent 60%);
        opacity: 0; transition: opacity .5s;
        pointer-events: none;
      }
      .lp-feature:hover .lp-feature-shine { opacity: 1; }

      /* Steps */
      .lp-steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 28px;
        position: relative;
      }
      .lp-steps-line {
        position: absolute; top: 36px;
        left: 15%; right: 15%; height: 2px;
        background: linear-gradient(90deg, transparent, #F59E0B 20%, #F59E0B 80%, transparent);
        opacity: 0.5;
      }
      @media (max-width: 820px) {
        .lp-steps { grid-template-columns: 1fr; }
        .lp-steps-line { display: none; }
      }
      .lp-step {
        text-align: center;
        padding: 24px 20px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        position: relative;
        backdrop-filter: blur(10px);
      }
      .lp-step-num {
        display: inline-block;
        font-family: 'Cairo', sans-serif;
        font-size: 13px; font-weight: 900;
        color: #0A1220;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        padding: 4px 12px; border-radius: 999px;
        margin-bottom: 14px;
      }
      .lp-step-icon {
        font-size: 40px; margin-bottom: 14px;
      }
      .lp-step h3 {
        font-size: 20px; font-weight: 800;
        margin: 0 0 10px;
      }
      .lp-step p {
        color: rgba(255,255,255,0.6);
        font-size: 14.5px; line-height: 1.7; margin: 0;
      }

      /* Bot */
      .lp-bot-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 48px; align-items: center;
      }
      @media (max-width: 900px) { .lp-bot-grid { grid-template-columns: 1fr; } }
      .lp-bot-badges {
        display: flex; flex-wrap: wrap; gap: 10px;
        margin-bottom: 28px;
      }
      .lp-badge-green, .lp-badge-blue, .lp-badge-gold {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 7px 14px; border-radius: 10px;
        font-size: 13px; font-weight: 700;
      }
      .lp-badge-green { background: rgba(16,185,129,0.14); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
      .lp-badge-blue { background: rgba(59,130,246,0.14); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); }
      .lp-badge-gold { background: rgba(245,158,11,0.14); color: #FBBF24; border: 1px solid rgba(245,158,11,0.3); }

      .lp-phone-frame {
        max-width: 340px; margin: 0 auto;
        background: #0F1A2E;
        border: 8px solid #1A2438;
        border-radius: 40px;
        padding: 20px 14px 18px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.15);
        position: relative;
      }
      .lp-phone-notch {
        position: absolute; top: 8px; left: 50%;
        transform: translateX(-50%);
        width: 100px; height: 18px;
        background: #1A2438; border-radius: 0 0 14px 14px;
      }
      .lp-phone-header {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 6px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 14px;
      }
      .lp-phone-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; color: #0A1220; font-size: 18px;
      }
      .lp-phone-body {
        display: flex; flex-direction: column; gap: 10px;
        padding: 6px 4px;
        max-height: 360px; overflow: hidden;
      }
      .lp-msg {
        padding: 9px 13px; border-radius: 14px;
        font-size: 13.5px; line-height: 1.65;
        max-width: 85%;
        animation: msgIn .45s ease both;
      }
      .lp-msg-bot {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        border-top-right-radius: 4px;
        align-self: flex-start;
      }
      .lp-msg-user {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: #0A1220; font-weight: 700;
        border-top-left-radius: 4px;
        align-self: flex-end;
      }
      .lp-msg-success {
        background: rgba(16,185,129,0.12) !important;
        border: 1px solid rgba(16,185,129,0.4) !important;
        color: #10B981;
      }
      .lp-msg:nth-child(1) { animation-delay: 0s; }
      .lp-msg:nth-child(2) { animation-delay: .4s; }
      .lp-msg:nth-child(3) { animation-delay: .9s; }
      .lp-msg:nth-child(4) { animation-delay: 1.4s; }
      .lp-msg:nth-child(5) { animation-delay: 1.9s; }

      /* Pricing */
      .lp-pricing-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 20px; align-items: stretch;
      }
      @media (max-width: 900px) { .lp-pricing-grid { grid-template-columns: 1fr; } }
      .lp-price-card {
        position: relative;
        padding: 36px 30px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.09);
        display: flex; flex-direction: column;
        transition: transform .3s, border-color .3s;
      }
      .lp-price-card:hover { transform: translateY(-4px); border-color: rgba(245,158,11,0.3); }
      .lp-price-highlight {
        border-color: #F59E0B;
        background:
          linear-gradient(180deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
        box-shadow: 0 20px 60px rgba(245,158,11,0.2), 0 0 0 1px rgba(245,158,11,0.4);
        transform: scale(1.03);
      }
      .lp-price-badge {
        position: absolute; top: -14px; left: 50%;
        transform: translateX(-50%);
        padding: 6px 16px; border-radius: 999px;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        color: #0A1220; font-size: 12.5px; font-weight: 900;
        white-space: nowrap;
        box-shadow: 0 8px 20px rgba(245,158,11,0.35);
      }
      .lp-price-name {
        font-size: 18px; font-weight: 800;
        color: rgba(255,255,255,0.85); margin-bottom: 10px;
      }
      .lp-price-amount {
        display: flex; align-items: baseline; gap: 6px;
        margin-bottom: 6px;
      }
      .lp-price-num {
        font-size: 48px; font-weight: 900;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        letter-spacing: -0.02em;
        font-family: 'Cairo', sans-serif;
      }
      .lp-price-cur { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.7); }
      .lp-price-period { color: rgba(255,255,255,0.5); font-size: 13.5px; margin-bottom: 20px; }
      .lp-price-quota {
        display: flex; gap: 14px;
        padding: 12px 0;
        border-top: 1px solid rgba(255,255,255,0.06);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 20px;
        font-size: 14px; color: rgba(255,255,255,0.75);
        font-weight: 600;
      }
      .lp-price-feats {
        list-style: none; padding: 0; margin: 0 0 24px;
        flex: 1;
      }
      .lp-price-feats li {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 7px 0;
        color: rgba(255,255,255,0.72);
        font-size: 14.5px;
      }
      .lp-check {
        color: #10B981;
        font-weight: 900;
        flex-shrink: 0;
      }
      .lp-extras {
        display: flex; justify-content: center;
        align-items: center;
        margin-top: 40px;
        gap: 24px; flex-wrap: wrap;
      }
      .lp-extra {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 22px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
      }
      .lp-extra-label { color: rgba(255,255,255,0.55); font-size: 14px; }
      .lp-extra-val { color: #FBBF24; font-weight: 800; font-size: 15px; }
      .lp-extra-sep {
        width: 1px; height: 30px;
        background: rgba(255,255,255,0.1);
      }

      /* Testimonials */
      .lp-testi-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
      }
      @media (max-width: 900px) { .lp-testi-grid { grid-template-columns: 1fr; } }
      .lp-testi {
        position: relative;
        padding: 32px 28px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        margin: 0;
      }
      .lp-testi-quote {
        font-size: 64px; line-height: 0.6;
        color: rgba(245,158,11,0.3);
        font-family: Georgia, serif;
        margin-bottom: 14px;
      }
      .lp-testi blockquote {
        margin: 0 0 22px;
        color: rgba(255,255,255,0.82);
        font-size: 15.5px; line-height: 1.85;
        font-weight: 500;
      }
      .lp-testi figcaption {
        display: flex; align-items: center; gap: 12px;
        padding-top: 18px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }
      .lp-testi-avatar {
        width: 44px; height: 44px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 18px; color: #0A1220;
      }
      .lp-testi-name { font-weight: 800; font-size: 15px; }
      .lp-testi-role { font-size: 12.5px; color: rgba(255,255,255,0.5); margin-top: 2px; }

      /* CTA */
      .lp-cta {
        position: relative;
        padding: 70px 40px;
        border-radius: 28px;
        background:
          radial-gradient(ellipse at top, rgba(245,158,11,0.12), transparent 60%),
          linear-gradient(180deg, #0F1A2E, #0A1220);
        border: 1px solid rgba(245,158,11,0.3);
        text-align: center;
        overflow: hidden;
      }
      .lp-cta::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent 30%, rgba(245,158,11,0.1) 50%, transparent 70%);
        background-size: 200% 200%;
        animation: shimmerGold 8s linear infinite;
        pointer-events: none;
      }
      .lp-cta-glow {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 500px; height: 500px;
        background: radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 65%);
        filter: blur(80px);
        pointer-events: none;
      }
      .lp-cta h2 {
        position: relative; z-index: 1;
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 900;
        margin: 0 0 16px;
      }
      .lp-cta p {
        position: relative; z-index: 1;
        color: rgba(255,255,255,0.7);
        font-size: 17px; line-height: 1.7;
        max-width: 560px; margin: 0 auto 30px;
      }
      .lp-cta-btns {
        position: relative; z-index: 1;
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 26px;
      }
      .lp-cta-trust {
        position: relative; z-index: 1;
        display: flex; gap: 22px; justify-content: center;
        flex-wrap: wrap;
        color: rgba(255,255,255,0.5);
        font-size: 13.5px;
      }

      /* Footer */
      .lp-footer {
        padding: 60px 0 30px;
        border-top: 1px solid rgba(255,255,255,0.06);
        background: #050810;
      }
      .lp-footer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 40px;
        padding-bottom: 40px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      @media (max-width: 820px) { .lp-footer-grid { grid-template-columns: 1fr 1fr; gap: 30px; } }
      .lp-footer-brand p {
        color: rgba(255,255,255,0.5);
        font-size: 14px; line-height: 1.7;
        margin: 16px 0 0;
        max-width: 320px;
      }
      .lp-footer h4 {
        color: #F8FAFC;
        font-size: 14px; font-weight: 800;
        margin: 0 0 14px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .lp-footer a, .lp-footer-link-btn {
        display: block;
        color: rgba(255,255,255,0.55);
        text-decoration: none;
        font-size: 14.5px; padding: 6px 0;
        transition: color .2s;
        background: none; border: none;
        font-family: inherit; cursor: pointer;
        text-align: right;
      }
      .lp-footer a:hover, .lp-footer-link-btn:hover { color: #FBBF24; }
      .lp-footer-bar {
        display: flex; justify-content: space-between;
        padding-top: 28px;
        color: rgba(255,255,255,0.4);
        font-size: 13px;
        flex-wrap: wrap; gap: 12px;
      }
    `})}export{I as default};
