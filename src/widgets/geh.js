/* ==========================================================================
   InternaSnack — Gastroenterohepatologi & HBV Clinical Assistant Widgets
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { escapeHtml, clampNum } = R.utils;
  const {
    vizMotionState, isReducedMotionPreferred, hasRafSupport, vizPlayIconSvg,
    scheduleVizFrame, cancelVizFrame, cancelVizTween, stopVizWalkthrough,
    cancelAllVizAnimations, animateVizTo, toggleVizWalkthrough,
    buildSmoothSvgPath, sampleSmoothCurveY, renderVizLegend, setSvgAttrs,
    syncSliderAndPill, syncVizPresets, formatVizReadoutHtml, updateVizReadout,
    swapVizSvgFrame, renderVizArrowDefs, renderCardioTabRow,
    renderCardioSliderBlock, renderCardioWidgetCard, renderPulmoSliderOnly,
    renderCalcGaugeSvg, updateCalcGauge, syncCalcWeightPair, updateCalcReadoutTone,
    renderCalcCheckItem, renderCalcWeightSlider
  } = R.viz;

const gehVizState = {
  // geh-1-1: Manometri Esofagus
  esophPattern: "type2", // "type1", "type2", "type3", "des", "gerd_la"
  esophPhase: 45, // 0..100% swallow
  esophGerdGrade: "la_b", // "la_a", "la_b", "la_c", "la_d"

  // geh-1-2: Forrest Klasifikasi SCBA
  forrestClass: "IIa", // "Ia", "Ib", "IIa", "IIb", "IIc", "III"
  forrestHpRegimen: "quad", // "quad", "triple"

  // geh-1-3: Varises & HVPG
  hvpgMmHg: 14, // 6..22 mmHg (rAF key: gehHvpg)
  varicealIntervention: "combined", // "vasoactive", "evl", "tips", "combined"

  // geh-1-4: SCBB Oakland
  lgibMode: "oakland", // "oakland", "etiology", "algorithm"
  lgibOaklandHb: 9.5,
  lgibOaklandSbp: 105,
  lgibOaklandHr: 98,
  lgibOaklandAge: 68,
  lgibOaklandDre: true,
  lgibOaklandPrior: false,

  // geh-2-1: Malabsorpsi Vili Usus
  villiMode: "celiac_marsh", // "celiac_marsh", "whipple", "giardia", "dxylose"
  celiacStage: "marsh3b", // "marsh0", "marsh1", "marsh2", "marsh3a", "marsh3b", "marsh3c"

  // geh-2-2: IBD & Truelove-Witts
  ibdDisease: "uc", // "uc", "cd", "truelove"
  trueloveStools: 5,
  truelovePulse: 96,
  trueloveTemp: 37.6,
  trueloveHb: 10.8,
  trueloveEsr: 28,

  // geh-2-3: Rome IV IBS
  ibsBristolType: 6, // 1..7
  ibsPainDefecation: true,
  ibsFreqChange: true,
  ibsFormChange: true,
  ibsAlarmRedFlags: false,

  // geh-2-4: Polip & KKR
  polypStage: "kras_inter", // "normal", "apc_early", "kras_inter", "tp53_carcinoma", "lynch_msi"

  // geh-3-1: R-Value & ALF
  rValPreset: "dili_hepatocellular",
  rValAlt: 850,
  rValAltUln: 40,
  rValAlp: 180,
  rValAlpUln: 120,
  rValBili: 4.8,
  rValInr: 1.4,
  rValCr: 1.1,
  rValPh: 7.36,

  // geh-3-2: 5 Fase HBV Kronik
  hbvPhase: 2, // 1..5 (rAF key: gehHbv)
  hbvAntiviral: "tdf", // "tdf", "taf", "entecavir"

  // geh-3-3: DAA HCV
  hcvCirrhosis: "compensated", // "none", "compensated", "decompensated", "ckd"
  hcvRegimen: "sof_vel", // "sof_vel", "gle_pib"

  // geh-3-4: FIB-4 & Maddrey
  fib4MaddreyMode: "fib4", // "fib4", "maddrey"
  fib4Age: 52,
  fib4Ast: 78,
  fib4Alt: 64,
  fib4Plt: 145,
  maddreyPtPatient: 24,
  maddreyPtControl: 12,
  maddreyBili: 14.5,

  // geh-4-1: Asites & SBP
  ascitesPreset: "cirrhosis_portal",
  ascitesAlbSerum: 3.1,
  ascitesAlbFluid: 1.2,
  ascitesProtTotal: 1.8,
  ascitesPmn: 380,
  ascitesLvpLiters: 6.0,

  // geh-4-2: Ensefalopati Hepatikum
  heStage: 2, // 0..4 (rAF key: gehHe)
  hePrecipitant: "scba", // "scba", "hypokalemia", "infection", "constipation"

  // geh-4-3: KSH CT 3-Fase & BCLC
  hccPhasePercent: 35, // 0..100% (rAF key: gehHcc)
  hccBclcStage: "bclc_A", // "bclc_0", "bclc_A", "bclc_B", "bclc_C", "bclc_D"

  // geh-5-1: Pankreatitis & TG18
  pancTgMode: "pancreatitis", // "pancreatitis", "cholangitis"
  bisapBun: 28,
  bisapMental: false,
  bisapSirs: true,
  bisapAge: 64,
  bisapEffusion: true,
  tg18Grade: "grade2", // "grade1", "grade2", "grade3"

  // Extra 1: Blatchford
  gbsPreset: "mod_risk_gbs",
  gbsSex: "male",
  gbsBun: 24,
  gbsHb: 10.4,
  gbsSbp: 102,
  gbsHr: 104,
  gbsMelena: true,
  gbsSyncope: false,
  gbsLiverHx: true,
  gbsHeartHx: false,

  // Extra 2: Child-Pugh & MELD-Na
  cpMeldPreset: "child_b_eval",
  cpBili: 2.8,
  cpAlb: 2.9,
  cpInr: 1.9,
  cpAscites: "mild",
  cpHe: "grade1_2",
  meldCr: 1.6,
  meldNa: 131,
  meldDialysis: false
};

// =========================================================================
// 4 rAF MOTION SPEC BLOCKS
// =========================================================================
function getGehVizMotionSpec(key) {
  if (key === "gehEsoph") {
    return {
      min: 0, max: 100, start: 0, end: 100, duration: 6400,
      get: function() { return gehVizState.esophPhase; },
      apply: function(v) { updateGehEsophagealMotilityViz(null, v, null, false); }
    };
  }
  if (key === "gehHvpg") {
    return {
      min: 6, max: 22, start: 6, end: 22, duration: 6800,
      get: function() { return gehVizState.hvpgMmHg; },
      apply: function(v) { updateGehVaricealPortalViz(v, null, false); }
    };
  }
  if (key === "gehHbv") {
    return {
      min: 1, max: 5, start: 1, end: 5, duration: 7200,
      get: function() { return gehVizState.hbvPhase; },
      apply: function(v) { updateGehHbvPhasesViz(v, false); }
    };
  }
  if (key === "gehHe") {
    return {
      min: 0, max: 4, start: 0, end: 4, duration: 6400,
      get: function() { return gehVizState.heStage; },
      apply: function(v) { updateGehHeWesthavenViz(v, null, false); }
    };
  }
  if (key === "gehHcc") {
    return {
      min: 0, max: 100, start: 0, end: 100, duration: 6000,
      get: function() { return gehVizState.hccPhasePercent; },
      apply: function(v) { updateGehHccBclcViz(v, null, false); }
    };
  }
  return null;
}

// =========================================================================
// W1. MANOMETRI ESOFAGUS, GERD LA A-D & DISFAGIA (geh-1-1)
// =========================================================================
var GEH_ESOPH_DATA = {
  type1: {
    label: "Akalasia I (Klasik)",
    tone: "warning",
    irp: "26 mmHg (>15)",
    peristalsis: "100% Gagal (Aperistalsis murni)",
    panPress: "0% Deglutisi (Tanpa Tekanan)",
    eckardt: "6 (Derajat II Sedang)",
    rx: "Pneumatic Dilation (PD) atau POEM / Laparoscopic Heller",
    c1Label: "Manometri Chicago v4.0",
    c1Body: "IRP tinggi (>15 mmHg) dengan relaksasi LES inkomplit; dilatasi korpus esofagus tanpa pembentukan tekanan pan-esofagus.",
    c2Label: "Tata Laksana Pilihan",
    c2Body: "Respon baik terhadap Dilatasi Pneumatik (PD) balon 30-35 mm atau POEM (Peroral Endoscopic Myotomy) / Miotomi Heller Laparoskopik."
  },
  type2: {
    label: "Akalasia II (Kompresi)",
    tone: "danger",
    irp: "34 mmHg (>15)",
    peristalsis: "Pan-esophageal Pressurization",
    panPress: ">=20% Deglutisi Kompresi",
    eckardt: "8 (Derajat III Berat)",
    rx: "PD atau POEM (Respon Paling Unggul >90-95%!)",
    c1Label: "Manometri Chicago v4.0",
    c1Body: "IRP median tinggi (>15 mmHg) disertai kompresi pan-esofagus (pan-esophageal pressurization) serentak pada >=20% deglutisi.",
    c2Label: "Tata Laksana Pilihan",
    c2Body: "Subtipe dengan <strong>prognosis terapi terbaik (>90-95% keberhasilan)</strong> terhadap dilatasi pneumatik maupun POEM/Heller."
  },
  type3: {
    label: "Akalasia III (Spastik)",
    tone: "danger",
    irp: "28 mmHg (>15)",
    peristalsis: "Spasme Prematur (DL <4.5s)",
    panPress: "Kontraksi Spastik >=20%",
    eckardt: "9 (Derajat III Nyeri Dada)",
    rx: "POEM Terpilih (Miotomi Panjang Seluruh Spasme)",
    c1Label: "Manometri Chicago v4.0",
    c1Body: "IRP tinggi disertai kontraksi prematur/spastik esofagus distal (Distal Latency <4.5 detik) pada >=20% deglutisi. Sering disertai nyeri dada hebat.",
    c2Label: "Tata Laksana Pilihan",
    c2Body: "Respon dilatasi balon sangat buruk. <strong>POEM adalah modalitas lini pertama</strong> karena memungkinkan miotomi proksimal panjang."
  },
  des: {
    label: "Spasme Esofagus Difus",
    tone: "warning",
    irp: "11 mmHg (Normal <15)",
    peristalsis: "Prematur Distal Latency <4.5s",
    panPress: "Gelombang Multi-puncak Berulang",
    eckardt: "5 (Nyeri Dada Non-kardiak)",
    rx: "CCB (Diltiazem) / Nitrat / TCA / Injeksi Botoks",
    c1Label: "Manometri Chicago v4.0",
    c1Body: "IRP normal (<15 mmHg, LES relaksasi normal), namun terdapat kontraksi prematur distal (DL <4.5 detik) pada >=20% deglutisi.",
    c2Label: "Barium & Tata Laksana",
    c2Body: "Barium swallow menunjukkan <em>corkscrew esophagus</em>. Lini 1: CCB (Diltiazem), nitrat sublingual, atau antidepresan trisiklik dosis rendah."
  },
  gerd_la: {
    label: "GERD LA A-D & Disfagia",
    tone: "info",
    irp: "8 mmHg (Hipotensif)",
    peristalsis: "Ineffective Esophageal Motility",
    panPress: "Refluks Asam Asenden",
    eckardt: "LA Stage Dependent",
    rx: "PPI Dosis Ganda x 8 Minggu + Evaluasi Fundoplikasi",
    c1Label: "Klasifikasi Los Angeles",
    c1Body: "LA A: mucosal break <=5 mm; LA B: >5 mm diskrit; LA C: menyambung <75% sirkumferensi; LA D: menyambung >=75% lumen.",
    c2Label: "Jebakan Klinis Disfagia",
    c2Body: "Disfagia pada GERD adalah <strong>Tanda Bahaya (Alarm Sign)</strong>: wajib endoskopi segera untuk singkirkan striktur peptik atau Adenokarsinoma!"
  }
};

function buildGehEsophagealMotilitySvg(patternKey, phaseVal, gerdGrade) {
  var p = GEH_ESOPH_DATA[patternKey] || GEH_ESOPH_DATA.type2;
  var phase = clampNum(phaseVal, 0, 100, 45);
  var bolusY = 32 + (phase / 100) * 148;
  var lesColor = patternKey === "gerd_la" ? "var(--accent-primary)" : "var(--accent-coral)";
  var lesWidth = patternKey.indexOf("type") === 0 ? 6 : (patternKey === "des" ? 14 : 24);

  var wavePath = "";
  if (patternKey === "des") {
    wavePath = '<path d="M104,70 Q88,90 104,110 T104,150" fill="none" stroke="var(--accent-coral)" stroke-width="4" stroke-dasharray="3,3" />' +
               '<path d="M136,70 Q152,90 136,110 T136,150" fill="none" stroke="var(--accent-coral)" stroke-width="4" stroke-dasharray="3,3" />';
  } else if (patternKey === "type2") {
    wavePath = '<rect x="100" y="65" width="40" height="95" rx="11" fill="var(--accent-coral)" fill-opacity="0.25" stroke="var(--accent-coral)" stroke-width="1.5" stroke-dasharray="4,2" />' +
               '<text x="120" y="116" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">PAN-ESOPHAGEAL PRESS</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Simulator Manometri Esofagus">' +
    // Left anatomy panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">ANATOMI & BOLUS ESOFAGUS</text>' +
    // Esophagus tubes
    '<path d="M105,32 L105,65 Q92,110 105,160 L115,182 L115,198" fill="none" stroke="var(--border-subtle)" stroke-width="5" />' +
    '<path d="M135,32 L135,65 Q148,110 135,160 L125,182 L125,198" fill="none" stroke="var(--border-subtle)" stroke-width="5" />' +
    // Stomach fundus
    '<path d="M115,192 C80,192 60,205 60,208 C60,210 160,210 160,208 C160,205 130,192 125,192" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="2" />' +
    // Bird beak narrowing
    (patternKey.indexOf("type") === 0 ? '<path d="M106,160 L118,180 L134,160 Z" fill="var(--accent-coral)" fill-opacity="0.3" stroke="var(--accent-coral)" stroke-width="1" />' : '') +
    wavePath +
    // Food Bolus moving
    '<circle cx="120" cy="' + bolusY.toFixed(1) + '" r="8.5" fill="var(--accent-primary)" stroke="var(--bg-surface)" stroke-width="2" />' +
    '<text x="120" y="' + (bolusY + 3.2).toFixed(1) + '" text-anchor="middle" font-size="7.5" font-weight="800" fill="#ffffff">B</text>' +
    // LES indicator
    '<rect x="' + (120 - lesWidth/2).toFixed(1) + '" y="174" width="' + lesWidth + '" height="8" rx="2" fill="' + lesColor + '" />' +
    '<text x="32" y="181" font-size="8.2" font-weight="700" fill="var(--text-muted)">LES Zona (IRP)</text>' +
    '<text x="218" y="181" text-anchor="end" font-size="8.2" font-weight="800" fill="' + lesColor + '">' + p.irp.split(" ")[0] + '</text>' +

    // Right metric panel (x=240..462)
    '<rect x="242" y="14" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="30" font-size="8.5" font-weight="800" fill="var(--text-muted)">CHICAGO CLASSIFICATION V4.0</text>' +
    '<text x="254" y="47" font-size="11" font-weight="800" fill="var(--accent-primary)">IRP: ' + p.irp + '</text>' +
    '<text x="254" y="63" font-size="8" font-weight="600" fill="var(--text-secondary)">Peristalsis: ' + p.peristalsis + '</text>' +

    '<rect x="242" y="80" width="218" height="58" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="96" font-size="8.5" font-weight="800" fill="var(--text-muted)">SEVERITAS & TEKANAN PAN-ESOFAGUS</text>' +
    '<text x="254" y="113" font-size="10.5" font-weight="800" fill="' + (p.tone === "danger" ? "var(--accent-coral)" : "var(--accent-secondary)") + '">Eckardt: ' + p.eckardt + '</text>' +
    '<text x="254" y="128" font-size="8" font-weight="600" fill="var(--text-secondary)">Kompresi: ' + p.panPress + '</text>' +

    '<rect x="242" y="144" width="218" height="68" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="160" font-size="8.5" font-weight="800" fill="var(--accent-primary)">REKOMENDASI TATALAKSANA</text>' +
    '<text x="254" y="177" font-size="8.6" font-weight="700" fill="var(--text-primary)">' + p.rx + '</text>' +
    '<text x="254" y="196" font-size="7.6" font-weight="600" fill="var(--text-muted)">Bird-beak di barium swallow; singkirkan pseudoakalasia!</text>' +
  '</svg>';
}

function renderGehEsophagealMotilityWidget() {
  var key = GEH_ESOPH_DATA[gehVizState.esophPattern] ? gehVizState.esophPattern : "type2";
  var phase = clampNum(gehVizState.esophPhase, 0, 100, 45);
  var p = GEH_ESOPH_DATA[key];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-esoph-tabs", Object.entries(GEH_ESOPH_DATA).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateGehEsophagealMotilityViz('" + e[0] + "', null, null, true)" };
    }), key) +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "gehEsoph",
    label: "Simulasi Perjalanan Bolus Menelan (UES -> Korpus -> LES):",
    pillText: Math.round(phase) + "% Transit",
    min: 0, max: 100, step: 1, value: phase,
    trackBg: "linear-gradient(90deg, rgba(14,165,233,0.35), rgba(239,68,68,0.35))",
    oninput: "window.InternaApp.updateGehEsophagealMotilityViz(null, this.value, null, true)",
    presets: [
      { label: "UES (15%)", val: 15, active: phase >= 10 && phase <= 25 },
      { label: "Korpus Mid (50%)", val: 50, active: phase > 25 && phase <= 70 },
      { label: "LES Distal (88%)", val: 88, active: phase > 70 }
    ]
  });

  return renderCardioWidgetCard({
    key: "gehEsoph",
    title: "Simulator Manometri Esofagus (Akalasia I–III), GERD LA & Disfagia",
    tag: "Esofagologi & Motilitas • KKI 4 / 3B",
    controlsTop: controlsTop,
    svgHtml: buildGehEsophagealMotilitySvg(key, phase, gehVizState.esophGerdGrade),
    controlsBottom: controlsBottom,
    info: {
      tone: p.tone,
      rKey: "esoph-" + key,
      title: "Pola " + p.label + " — IRP " + p.irp,
      c1Label: p.c1Label,
      c1Body: p.c1Body,
      c2Label: p.c2Label,
      c2Body: p.c2Body
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada kecurigaan akalasia, wajib lakukan endoskopi untuk menyingkirkan <strong>Pseudoakalasia</strong> (infiltrasi Adenokarsinoma gastroesophageal junction yang meniru gambaran <em>bird’s beak</em>)! POEM merupakan terapi terpilih pada akalasia tipe III karena memungkinkan diseksi miotomi proksimal yang lebih panjang dibanding Heller laparoskopik.</p>'
  });
}

function updateGehEsophagealMotilityViz(patternIn, phaseIn, gerdGradeIn, fromUser) {
  if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
  if (GEH_ESOPH_DATA[patternIn]) gehVizState.esophPattern = patternIn;
  if (phaseIn !== null && phaseIn !== undefined) gehVizState.esophPhase = clampNum(phaseIn, 0, 100, 45);
  if (gerdGradeIn) gehVizState.esophGerdGrade = gerdGradeIn;

  var key = gehVizState.esophPattern;
  var phase = gehVizState.esophPhase;
  var p = GEH_ESOPH_DATA[key];

  syncVizPresets("viz-geh-esoph-tabs", Object.keys(GEH_ESOPH_DATA).map(function(k) { return k === key; }));
  syncSliderAndPill("viz-gehEsoph-slider", "viz-gehEsoph-pill", phase, Math.round(phase) + "% Transit");
  syncVizPresets("viz-gehEsoph-presets", [phase >= 10 && phase <= 25, phase > 25 && phase <= 70, phase > 70]);
  swapVizSvgFrame("viz-gehEsoph-frame", buildGehEsophagealMotilitySvg(key, phase, gehVizState.esophGerdGrade));
  updateVizReadout("viz-gehEsoph-readout", p.tone, formatVizReadoutHtml(
    "Pola " + p.label + " — IRP " + p.irp, p.c1Label, p.c1Body, p.c2Label, p.c2Body,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pseudoakalasia akibat karsinoma GEJ harus disingkirkan sebelum miotomi/dilatasi. POEM adalah lini 1 mutlak pada tipe III (spastik).</p>'
  ), "esoph-" + key);
}

// =========================================================================
// W2. ATLAS ENDOSKOPI FORREST SCBA & ERADIKASI H. PYLORI (geh-1-2)
// =========================================================================
var GEH_FORREST_DATA = {
  Ia: {
    label: "Forrest Ia",
    desc: "Perdarahan Menyemprot (Spurting)",
    rebleed: "90% (Ekstrem)",
    endoRx: "Dual Hemostasis Wajib (Epinefrin + Klip/Termal)",
    tone: "danger",
    ppi: "Bolus 80 mg IV + Infus 8 mg/jam x 72 jam",
    disposition: "Rawat ICU / HCU Cito Endoskopi",
    c1Label: "Morfologi & Risiko",
    c1Body: "Jet perdarahan arterial aktif menyemprot dari dasar ulkus. Risiko perdarahan ulang tanpa hemostasis mencapai 90% dengan mortalitas tinggi.",
    c2Label: "Hemostasis Kombinasi",
    c2Body: "Wajib hemostasis kombinasi: injeksi epinefrin (1:10.000) untuk vasokonstriksi + koagulasi termal bipolar / pemasangan hemoklip mekanik."
  },
  Ib: {
    label: "Forrest Ib",
    desc: "Perdarahan Merembes (Oozing)",
    rebleed: "60–80% (Sangat Tinggi)",
    endoRx: "Dual Hemostasis Wajib",
    tone: "danger",
    ppi: "Bolus 80 mg IV + Infus 8 mg/jam x 72 jam",
    disposition: "Rawat Inap Intensif Endoskopi",
    c1Label: "Morfologi & Risiko",
    c1Body: "Darah merah segar mengalir merembes terus-menerus menggenangi kawah ulkus tanpa pancaran arterial tajam.",
    c2Label: "Hemostasis Kombinasi",
    c2Body: "Intervensi endoskopi mutlak diperlukan; kombinasikan modalitas mekanik (hemoklip) dengan injeksi sklerosan/epinefrin."
  },
  IIa: {
    label: "Forrest IIa",
    desc: "Pembuluh Darah Tampak (Visible Vessel)",
    rebleed: "40–50% (Tinggi)",
    endoRx: "Hemostasis Endoskopi Wajib (Klip / Termal)",
    tone: "warning",
    ppi: "Bolus 80 mg IV + Infus 8 mg/jam x 72 jam",
    disposition: "Rawat Bangsal Monitor Ketat",
    c1Label: "Morfologi & Risiko",
    c1Body: "Tonjolan pembuluh darah eritematosa/kebiruan tampak di dasar ulkus tanpa perdarahan aktif saat diperiksa.",
    c2Label: "Tatalaksana Endoskopi",
    c2Body: "Wajib hemostasis endoskopi mekanik atau termal. Tanpa terapi endoskopi, separuh pasien akan mengalami perdarahan ulang masif."
  },
  IIb: {
    label: "Forrest IIb",
    desc: "Bekuan Darah Melekat (Adherent Clot)",
    rebleed: "20–30% (Sedang)",
    endoRx: "Irigasi Hati-hati; Klip bila Ada Visible Vessel",
    tone: "warning",
    ppi: "PPI IV Dosis Tinggi -> Switch Oral",
    disposition: "Rawat Inap Bangsal",
    c1Label: "Morfologi & Risiko",
    c1Body: "Bekuan darah hitam/merah tua melekat resisten pada kawah ulkus yang tidak terlepas dengan bilasan air ringan.",
    c2Label: "Strategi Endoskopi",
    c2Body: "Bila bekuan dapat diirigasi lepas dengan aman dan mengekspos pembuluh darah di bawahnya, lakukan hemostasis kombinasi."
  },
  IIc: {
    label: "Forrest IIc",
    desc: "Bintik Pigmen Datar (Flat Spot)",
    rebleed: "7–10% (Rendah)",
    endoRx: "Tidak Perlu Hemostasis Endoskopi",
    tone: "info",
    ppi: "PPI Oral Dosis Standar (Omeprazole 2x20 mg)",
    disposition: "Rawat Bangsal Singkat / Rawat Jalan",
    c1Label: "Morfologi & Risiko",
    c1Body: "Bintik hitam hematin datar pada dasar ulkus yang mencerminkan dasar pembuluh darah yang sudah mengalami trombosis stabil.",
    c2Label: "Manajemen Farmakologi",
    c2Body: "Tidak ada indikasi tindakan hemostasis endoskopi. Cukup terapi PPI oral dan evaluasi eradikasi H. pylori."
  },
  III: {
    label: "Forrest III",
    desc: "Dasar Ulkus Bersih (Clean Base)",
    rebleed: "<3–5% (Sangat Rendah)",
    endoRx: "Tanpa Tindakan Endoskopi (PPI Oral)",
    tone: "info",
    ppi: "PPI Oral 1x/hari x 4–8 Minggu",
    disposition: "Aman Rawat Jalan (Bila Kondisi Stabil)",
    c1Label: "Morfologi & Risiko",
    c1Body: "Ulkus dengan dasar putih/kekuningan bersih tertutup fibrin tanpa stigmata perdarahan baru.",
    c2Label: "Strategi Rawat",
    c2Body: "Risiko rebleeding sangat minimal (<3%). Pasien aman dipulangkan untuk rawat jalan dengan terapi PPI oral dan investigasi etiologi."
  }
};

function buildGehForrestUgibSvg(fClass, hpRegimen) {
  var d = GEH_FORREST_DATA[fClass] || GEH_FORREST_DATA.IIa;
  var isQuad = hpRegimen !== "triple";

  // Endoscopic crater visuals
  var craterVisual = "";
  if (fClass === "Ia") {
    craterVisual = '<circle cx="120" cy="112" r="30" fill="#7f1d1d" />' +
      '<circle cx="120" cy="112" r="10" fill="#ef4444" />' +
      '<path d="M120,112 Q145,75 168,52" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" />' +
      '<circle cx="170" cy="50" r="3" fill="#ef4444" />' +
      '<circle cx="155" cy="62" r="2" fill="#ef4444" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ef4444">SPURTING ARTERIAL</text>';
  } else if (fClass === "Ib") {
    craterVisual = '<circle cx="120" cy="112" r="32" fill="#991b1b" />' +
      '<path d="M102,100 C110,125 130,125 138,100" fill="#ef4444" opacity="0.8" />' +
      '<path d="M108,118 Q120,135 132,118" fill="none" stroke="#ef4444" stroke-width="3" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ef4444">OOZING BLEED</text>';
  } else if (fClass === "IIa") {
    craterVisual = '<circle cx="120" cy="112" r="30" fill="#fef3c7" stroke="#b45309" stroke-width="2" />' +
      '<circle cx="120" cy="112" r="9" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">VISIBLE VESSEL</text>';
  } else if (fClass === "IIb") {
    craterVisual = '<circle cx="120" cy="112" r="30" fill="#fef3c7" stroke="#b45309" stroke-width="2" />' +
      '<ellipse cx="120" cy="112" rx="18" ry="14" fill="#3f1a1a" stroke="#1f0a0a" stroke-width="1.5" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">ADHERENT CLOT</text>';
  } else if (fClass === "IIc") {
    craterVisual = '<circle cx="120" cy="112" r="30" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.5" />' +
      '<circle cx="116" cy="110" r="4.5" fill="#1c1917" />' +
      '<circle cx="125" cy="115" r="3.5" fill="#292524" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-primary)">FLAT PIGMENT SPOT</text>';
  } else {
    craterVisual = '<circle cx="120" cy="112" r="32" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />' +
      '<circle cx="120" cy="112" r="26" fill="#f8fafc" />' +
      '<text x="120" y="160" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-primary)">CLEAN BASE ULCER</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Atlas Forrest Endoskopi SCBA">' +
    // Left endoscopic lumen circle (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">TAMPILAN ENDOSKOPI ULKUS</text>' +
    // Circular endoscopic field
    '<circle cx="120" cy="112" r="64" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="3" />' +
    craterVisual +
    '<text x="32" y="200" font-size="8.2" font-weight="700" fill="var(--text-muted)">Klasifikasi: </text>' +
    '<text x="88" y="200" font-size="8.5" font-weight="800" fill="' + (d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.label + ' (' + d.desc.split(" ")[0] + ')</text>' +

    // Right metric panel (x=240..462)
    '<rect x="242" y="14" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="30" font-size="8.5" font-weight="800" fill="var(--text-muted)">RISIKO PERDARAHAN ULANG (REBLEED)</text>' +
    '<text x="254" y="48" font-size="12" font-weight="800" fill="' + (d.tone === "danger" ? "var(--accent-coral)" : (d.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)")) + '">' + d.rebleed + '</text>' +
    '<text x="254" y="64" font-size="8.2" font-weight="600" fill="var(--text-secondary)">' + d.disposition + '</text>' +

    '<rect x="242" y="80" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="96" font-size="8.5" font-weight="800" fill="var(--text-muted)">HEMOSTASIS & INFUS PPI 72 JAM</text>' +
    '<text x="254" y="112" font-size="8.8" font-weight="700" fill="var(--text-primary)">' + d.endoRx + '</text>' +
    '<text x="254" y="128" font-size="7.8" font-weight="600" fill="var(--accent-primary)">' + d.ppi + '</text>' +

    '<rect x="242" y="146" width="218" height="66" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="162" font-size="8.5" font-weight="800" fill="var(--accent-primary)">ERADIKASI H. PYLORI (' + (isQuad ? "KUADRUPEL BISMUT" : "TRIPEL KLARITROMISIN") + ')</text>' +
    '<text x="254" y="178" font-size="8" font-weight="700" fill="var(--text-primary)">' + (isQuad ? "PPI 2x + Bismut 4x120 + Metro 3x500 + Tetra 4x500 x 14H" : "PPI 2x + Klaritromisin 2x500 + Amoksisilin 2x1000 x 14H") + '</text>' +
    '<text x="254" y="196" font-size="7.5" font-weight="600" fill="var(--text-muted)">Konfirmasi UBT minimal 4 mg pasca-AB & 2 mg bebas PPI!</text>' +
  '</svg>';
}

function renderGehForrestUgibWidget() {
  var c = GEH_FORREST_DATA[gehVizState.forrestClass] ? gehVizState.forrestClass : "IIa";
  var hp = gehVizState.forrestHpRegimen === "triple" ? "triple" : "quad";
  var d = GEH_FORREST_DATA[c];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-forrest-tabs", Object.keys(GEH_FORREST_DATA).map(function(k) {
      return { key: k, label: k, onclick: "window.InternaApp.updateGehForrestUgibViz('" + k + "', null, true)" };
    }), c) +
    '<div class="viz-subtabs" id="viz-geh-hp-tabs">' +
      '<button type="button" class="viz-pill-btn ' + (hp === "quad" ? "active" : "") + '" onclick="window.InternaApp.updateGehForrestUgibViz(null, \'quad\', true)">Kuadrupel Bismut (Lini 1)</button>' +
      '<button type="button" class="viz-pill-btn ' + (hp === "triple" ? "active" : "") + '" onclick="window.InternaApp.updateGehForrestUgibViz(null, \'triple\', true)">Tripel Klaritromisin</button>' +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehForrest",
    title: "Atlas Endoskopi Forrest Ulkus Peptikum & Paduan H. pylori",
    tag: "Perdarahan SCBA • KKI 4",
    controlsTop: controlsTop,
    svgHtml: buildGehForrestUgibSvg(c, hp),
    info: {
      tone: d.tone,
      rKey: "forrest-" + c + "-" + hp,
      title: "Klasifikasi " + d.label + " — " + d.desc,
      c1Label: d.c1Label,
      c1Body: d.c1Body,
      c2Label: d.c2Label,
      c2Body: d.c2Body
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Forrest <strong>Ia, Ib, dan IIa</strong> WAJIB hemostasis endoskopi kombinasi (Dual therapy: epinefrin + klip/koagulasi termal) PLUS infus PPI dosis tinggi (80 mg bolus lanjut 8 mg/jam x 72 jam) untuk mempertahankan pH lambung &gt;6 agar bekuan darah stabil. Forrest IIc &amp; III TIDAK perlu hemostasis endoskopi.</p>'
  });
}

function updateGehForrestUgibViz(classIn, hpRegimenIn, fromUser) {
  if (classIn && GEH_FORREST_DATA[classIn]) gehVizState.forrestClass = classIn;
  if (hpRegimenIn === "quad" || hpRegimenIn === "triple") gehVizState.forrestHpRegimen = hpRegimenIn;

  var c = gehVizState.forrestClass;
  var hp = gehVizState.forrestHpRegimen;
  var d = GEH_FORREST_DATA[c];

  syncVizPresets("viz-geh-forrest-tabs", Object.keys(GEH_FORREST_DATA).map(function(k) { return k === c; }));
  syncVizPresets("viz-geh-hp-tabs", [hp === "quad", hp === "triple"]);
  swapVizSvgFrame("viz-gehForrest-frame", buildGehForrestUgibSvg(c, hp));
  updateVizReadout("viz-gehForrest-readout", d.tone, formatVizReadoutHtml(
    "Klasifikasi " + d.label + " — " + d.desc, d.c1Label, d.c1Body, d.c2Label, d.c2Body,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Forrest Ia–IIa wajib hemostasis endoskopi kombinasi; Forrest IIc–III cukup PPI oral tanpa intervensi endoskopi.</p>'
  ), "forrest-" + c + "-" + hp);
}

// =========================================================================
// W3. SIMULATOR HIPERTENSI PORTA HVPG & VARISES BAVENO VII (geh-1-3)
// rAF Key: gehHvpg (6 -> 22 mmHg)
// =========================================================================
function evaluateGehVariceal(hvpgVal) {
  var h = clampNum(hvpgVal, 6, 22, 14);
  if (h < 10) {
    return {
      zone: "Subklinis (<10 mmHg)",
      tone: "info",
      color: "var(--accent-primary)",
      ruptureRisk: "0% (Varises Belum Terbentuk)",
      mortality6w: "<2%",
      action: "Skrining Baveno VII Non-invasif (FibroScan <20 kPa & Trombosit >150k)",
      rxNote: "Belum tergolong CSPH. Tidak memerlukan NSBB atau ligasi profilaksis."
    };
  }
  if (h < 12) {
    return {
      zone: "CSPH Awal (10–11 mmHg)",
      tone: "warning",
      color: "var(--accent-secondary)",
      ruptureRisk: "10–20% (Varises Kecil)",
      mortality6w: "5–10%",
      action: "Profilaksis Primer: NSBB (Karvedilol) / EVL",
      rxNote: "CSPH >=10 mmHg: pembentukan kolateral varises aktif."
    };
  }
  if (h < 20) {
    return {
      zone: "Risiko Tinggi Ruptur (12–19 mmHg)",
      tone: "danger",
      color: "var(--accent-coral)",
      ruptureRisk: "40–60% (Varises Besar)",
      mortality6w: "15–20%",
      action: "Terlipressin + Seftriakson + Hb 7-8 + EVL <12j",
      rxNote: "Ambang ruptur >=12 mmHg: Terlipressin 2 mg IV segera!"
    };
  }
  return {
    zone: "Kritis / Early TIPS (>=20 mmHg)",
    tone: "danger",
    color: "#b91c1c",
    ruptureRisk: ">80% (Masif Berulang)",
    mortality6w: ">35–50%",
    action: "Preemptive Early TIPS (<72 Jam) + Rawat ICU",
    rxNote: "HVPG >=20 mmHg: kandidat mutlak Early Preemptive TIPS."
  };
}

function buildGehVaricealPortalSvg(hvpgVal, intervention) {
  var h = Math.round(clampNum(hvpgVal, 6, 22, 14) * 10) / 10;
  var ev = evaluateGehVariceal(h);
  var varicealWidth = 2 + ((h - 6) / 16) * 7.5;
  var needleX = 250 + ((h - 6) / 16) * 196;

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator Hipertensi Porta HVPG">' +
    // Left anatomy panel (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SISTEM VENA PORTA & VARISES</text>' +
    // Liver silhouette
    '<path d="M40,55 C40,40 100,38 120,55 C120,75 90,85 40,80 Z" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="2" />' +
    '<text x="68" y="62" font-size="8" font-weight="700" fill="var(--text-muted)">Hepar</text>' +
    // Portal vein trunk
    '<path d="M85,82 L85,145 L135,175" fill="none" stroke="var(--accent-primary)" stroke-width="5" />' +
    '<text x="94" y="120" font-size="7.5" font-weight="700" fill="var(--accent-primary)">V. Porta</text>' +
    // Left gastric vein feeding esophageal plexus
    '<path d="M85,115 C115,110 145,90 155,50" fill="none" stroke="var(--accent-coral)" stroke-width="' + varicealWidth.toFixed(1) + '" stroke-linecap="round" />' +
    '<text x="160" y="65" font-size="7.5" font-weight="800" fill="var(--accent-coral)">Varises Esofagus</text>' +
    // Rupture burst if >= 16 mmHg
    (h >= 16 ? '<circle cx="155" cy="50" r="8" fill="#ef4444" fill-opacity="0.35" />' +
               '<path d="M155,50 L170,40 M155,50 L172,55 M155,50 L165,30" stroke="#ef4444" stroke-width="2" />' +
               '<text x="120" y="196" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ef4444">RUPTUR BERDARAH AKTIF!</text>' : '') +

    // Right manometer & Baveno VII panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">HVPG MANOMETER (TARGET <12 mmHg)</text>' +
    // Gauge bar 6..22 mmHg
    '<rect x="250" y="36" width="196" height="12" rx="11" fill="var(--bg-surface-subtle)" />' +
    '<rect x="250" y="36" width="49" height="12" rx="11" fill="var(--accent-primary)" opacity="0.3" />' +
    '<rect x="299" y="36" width="25" height="12" fill="var(--accent-secondary)" opacity="0.4" />' +
    '<rect x="324" y="36" width="98" height="12" rx="11" fill="var(--accent-coral)" opacity="0.5" />' +
    // Needle
    '<circle cx="' + needleX.toFixed(1) + '" cy="42" r="7" fill="var(--bg-surface)" stroke="' + ev.color + '" stroke-width="2.5" />' +
    '<text x="254" y="65" font-size="10.2" font-weight="800" fill="' + ev.color + '">HVPG: ' + h + ' mmHg (' + ev.zone.split(" ")[0] + ')</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">RISIKO RUPTUR & MORTALITAS 6-MINGGU</text>' +
    '<text x="254" y="117" font-size="8.6" font-weight="800" fill="' + ev.color + '">Ruptur: ' + ev.ruptureRisk + ' | Mort: ' + ev.mortality6w + '</text>' +
    '<text x="254" y="134" font-size="7.4" font-weight="600" fill="var(--text-secondary)">' + ev.rxNote + '</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PROTOKOL BAVENO VII AKUT</text>' +
    '<text x="254" y="186" font-size="7.6" font-weight="700" fill="var(--text-primary)">' + ev.action + '</text>' +
    '<text x="254" y="202" font-size="7.2" font-weight="600" fill="var(--text-muted)">Transfusi restriktif Hb 7-8 g/dL; cegah rebound HVPG!</text>' +
  '</svg>';
}

function renderGehVaricealPortalWidget() {
  var h = Math.round(clampNum(gehVizState.hvpgMmHg, 6, 22, 14) * 10) / 10;
  var ev = evaluateGehVariceal(h);

  var controlsBottom = renderCardioSliderBlock({
    key: "gehHvpg",
    label: "Titasi Tekanan Gradien Vena Hepatika (HVPG):",
    pillText: h + " mmHg",
    min: 6, max: 22, step: 0.1, value: h,
    trackBg: "linear-gradient(90deg, rgba(14,165,233,0.35), rgba(245,158,11,0.35), rgba(239,68,68,0.45))",
    oninput: "window.InternaApp.updateGehVaricealPortalViz(this.value, null, true)",
    presets: [
      { label: "Subklinis (8 mmHg)", val: 8, active: h < 10 },
      { label: "CSPH Varises (11 mmHg)", val: 11, active: h >= 10 && h < 12 },
      { label: "Ruptur Berdarah (16 mmHg)", val: 16, active: h >= 12 && h < 20 },
      { label: "Kritis / TIPS (21 mmHg)", val: 21, active: h >= 20 }
    ]
  });

  return renderCardioWidgetCard({
    key: "gehHvpg",
    title: "Simulator Hemodinamik Hipertensi Porta (HVPG) & Konsensus Baveno VII",
    tag: "Hipertensi Porta • KKI 4",
    svgHtml: buildGehVaricealPortalSvg(h, gehVizState.varicealIntervention),
    controlsBottom: controlsBottom,
    info: {
      tone: ev.tone,
      rKey: "hvpg-" + h,
      title: "HVPG " + h + " mmHg — " + ev.zone,
      c1Label: "Status Hemodinamik & Ruptur",
      c1Body: "Risiko ruptur varises: <strong>" + ev.ruptureRisk + "</strong> | Estimasi mortalitas 6-minggu: <strong>" + ev.mortality6w + "</strong>. " + ev.rxNote,
      c2Label: "Rekomendasi Baveno VII",
      c2Body: ev.action
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Target transfusi PRC pada perdarahan variseal akut bersifat <strong>Restriktif (Hb 7–8 g/dL)</strong>! Transfusi berlebihan (liberal Hb &gt;9 g/dL) justru memicu <em>rebound portal hypertension</em> dan perdarahan ulang fatal. Early preemptive TIPS (&lt;72 jam) diindikasikan pada Child-Pugh C (&lt;14 poin) atau Child-Pugh B dengan perdarahan aktif saat endoskopi.</p>'
  });
}

function updateGehVaricealPortalViz(hvpgIn, interventionIn, fromUser) {
  if (fromUser && hvpgIn !== null && hvpgIn !== undefined) cancelAllVizAnimations();
  if (hvpgIn !== null && hvpgIn !== undefined) gehVizState.hvpgMmHg = Math.round(clampNum(hvpgIn, 6, 22, 14) * 10) / 10;
  if (interventionIn) gehVizState.varicealIntervention = interventionIn;

  var h = gehVizState.hvpgMmHg;
  var ev = evaluateGehVariceal(h);

  syncSliderAndPill("viz-gehHvpg-slider", "viz-gehHvpg-pill", h, h + " mmHg");
  syncVizPresets("viz-gehHvpg-presets", [h < 10, h >= 10 && h < 12, h >= 12 && h < 20, h >= 20]);
  swapVizSvgFrame("viz-gehHvpg-frame", buildGehVaricealPortalSvg(h, gehVizState.varicealIntervention));
  updateVizReadout("viz-gehHvpg-readout", ev.tone, formatVizReadoutHtml(
    "HVPG " + h + " mmHg — " + ev.zone,
    "Status Hemodinamik & Ruptur",
    "Risiko ruptur varises: <strong>" + ev.ruptureRisk + "</strong> | Mortalitas 6-minggu: <strong>" + ev.mortality6w + "</strong>.",
    "Rekomendasi Baveno VII",
    ev.action,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Transfusi restriktif target Hb 7–8 g/dL mencegah lonjakan HVPG. Early TIPS &lt;72 jam bila Child C / B+aktif berdarah.</p>'
  ), "hvpg-" + h);
}

// =========================================================================
// W4. SIMULATOR SCBB AKUT, SKOR OAKLAND & CTA VS KOLONOSKOPI (geh-1-4)
// =========================================================================
function calcOaklandScore(age, dreBleed, priorLgib, hr, sbp, hb) {
  var score = 0;
  // Age
  if (age >= 70) score += 2;
  else if (age >= 40) score += 1;
  // DRE findings
  if (dreBleed) score += 1;
  // Prior LGIB
  if (priorLgib) score += 1;
  // HR
  if (hr >= 100) score += 2;
  else if (hr >= 90) score += 1;
  // SBP
  if (sbp < 90) score += 5;
  else if (sbp < 120) score += 3;
  else if (sbp < 130) score += 2;
  // Hb
  if (hb < 9) score += 13;
  else if (hb < 11) score += 8;
  else if (hb < 13) score += 4;
  return score;
}

function buildGehLgibOaklandSvg(mode, scoreVal, scoreLabel) {
  var s = clampNum(scoreVal, 0, 35, 12);
  var isOutpatient = s <= 8;

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Simulator SCBB Akut & Skor Oakland">' +
    // Left panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">ALGORITMA KLINIS SCBB AKUT</text>' +
    // Flowchart boxes
    '<rect x="32" y="44" width="186" height="34" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="58" font-size="8.5" font-weight="800" fill="var(--text-primary)">Hematochezia Akut Masif</text>' +
    '<text x="42" y="70" font-size="7.5" font-weight="600" fill="var(--text-muted)">Resusitasi & Pasang Akses IV Kaliber Besar</text>' +

    '<rect x="32" y="86" width="186" height="38" rx="11" fill="var(--bg-surface)" stroke="' + (isOutpatient ? "var(--accent-primary)" : "var(--accent-coral)") + '" stroke-width="1.5" />' +
    '<text x="42" y="100" font-size="8.5" font-weight="800" fill="' + (isOutpatient ? "var(--accent-primary)" : "var(--accent-coral)") + '">Hemodinamik: ' + (isOutpatient ? "Stabil (Skor <=8)" : "Instabil / Berisiko (>8)") + '</text>' +
    '<text x="42" y="114" font-size="7.5" font-weight="600" fill="var(--text-muted)">' + (isOutpatient ? "Pertimbangkan Safe Outpatient Discharge" : "Wajib Rawat Inap & Monitor Cito") + '</text>' +

    '<rect x="32" y="132" width="186" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="146" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">CTA vs Kolonoskopi Elektif</text>' +
    '<text x="42" y="159" font-size="7.2" font-weight="600" fill="var(--text-primary)">CTA Cito bila perdarahan >=0.3 mL/menit</text>' +
    '<text x="42" y="169" font-size="7" font-weight="600" fill="var(--text-muted)">Kolonoskopi dalam 24–48j pasca-bowel prep</text>' +

    '<text x="32" y="198" font-size="8" font-weight="700" fill="var(--text-muted)">Etiologi tersering: Divertikulosis &gt; Iskemik &gt; Angiodisplasia</text>' +

    // Right Oakland Card (x=240..462)
    '<rect x="242" y="14" width="218" height="68" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="30" font-size="8.5" font-weight="800" fill="var(--text-muted)">SKOR OAKLAND SCBB (CUT-OFF <=8)</text>' +
    '<text x="254" y="50" font-size="14" font-weight="800" fill="' + (isOutpatient ? "var(--accent-primary)" : "var(--accent-coral)") + '">Skor: ' + s + ' poin</text>' +
    '<text x="254" y="68" font-size="8.5" font-weight="700" fill="' + (isOutpatient ? "var(--accent-primary)" : "var(--accent-coral)") + '">' + (isOutpatient ? "AMAN RAWAT JALAN (Safe Discharge)" : "RISIKO TINGGI: WAJIB RAWAT INAP") + '</text>' +

    '<rect x="242" y="90" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="106" font-size="8.5" font-weight="800" fill="var(--text-muted)">PERAN CT-ANGIOGRAFI ABDOMEN (CTA)</text>' +
    '<text x="254" y="122" font-size="8.5" font-weight="700" fill="var(--text-primary)">Modalitas Lini 1 pada Syok / Instabil</text>' +
    '<text x="254" y="138" font-size="7.5" font-weight="600" fill="var(--text-muted)">Mendeteksi ekstravasasi laju >=0.3 mL/menit -> Embolisasi!</text>' +

    '<rect x="242" y="158" width="218" height="54" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="174" font-size="8.5" font-weight="800" fill="var(--accent-primary)">KOLITIS ISKEMIK & WATERSHED</text>' +
    '<text x="254" y="190" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Area rentan: Titik Griffiths &amp; Titik Sudeck.</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Nyeri kram perut bawah mendadak diikuti hematochezia.</text>' +
  '</svg>';
}

function renderGehLgibOaklandWidget() {
  var s = calcOaklandScore(
    gehVizState.lgibOaklandAge,
    gehVizState.lgibOaklandDre,
    gehVizState.lgibOaklandPrior,
    gehVizState.lgibOaklandHr,
    gehVizState.lgibOaklandSbp,
    gehVizState.lgibOaklandHb
  );
  var isOut = s <= 8;

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-lgib-tabs", [
      { key: "safe_case", label: "Kasus Aman (Skor 5)", onclick: "window.InternaApp.updateGehLgibOaklandViz('safe', true)" },
      { key: "mod_case", label: "Kasus Sedang (Skor 14)", onclick: "window.InternaApp.updateGehLgibOaklandViz('mod', true)" },
      { key: "severe_case", label: "Syok Instabil (Skor 26)", onclick: "window.InternaApp.updateGehLgibOaklandViz('severe', true)" }
    ], isOut ? "safe_case" : (s > 20 ? "severe_case" : "mod_case")) +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehLgib",
    title: "Simulator Algoritma SCBB Akut, Skor Oakland & Indikasi CTA",
    tag: "Perdarahan SCBB • KKI 4",
    controlsTop: controlsTop,
    svgHtml: buildGehLgibOaklandSvg(gehVizState.lgibMode, s, isOut ? "Safe Discharge" : "Inpatient"),
    info: {
      tone: isOut ? "info" : "danger",
      rKey: "lgib-" + s,
      title: "Skor Oakland " + s + " Poin — " + (isOut ? "Layak Rawat Jalan" : "Wajib Rawat Inap & Investigasi Segera"),
      c1Label: "Interpretasi Skor Oakland",
      c1Body: isOut
        ? "Skor &le;8 memprediksi &gt;95% aman untuk dipulangkan dari IGD untuk evaluasi elektif rawat jalan tanpa peningkatan morbiditas."
        : "Skor &gt;8 menandakan risiko tinggi kebutuhan transfusi darah, intervensi hemostatik darurat, atau perdarahan ulang. Wajib rawat inap!",
      c2Label: "CTA vs Kolonoskopi",
      c2Body: "Bila hemodinamik tidak stabil dengan perdarahan masif, <strong>singkirkan SCBA deras via NGT/EGD</strong> lalu segera lakukan <strong>CT-Angiografi Abdomen Cito</strong> untuk pemetaan embolisasi transkateter."
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Sebanyak 10–15% kasus hematochezia masif dengan hemodinamik tidak stabil berasal dari <strong>Perdarahan SCBA deras</strong>! Bila pasien syok dengan hematochezia, lakukan aspirasi NGT atau EGD cito sebelum menyatakan perdarahan berasal dari kolon. Pada kolitis iskemik, kolonoskopi total dikontraindikasikan saat fase akut karena risiko perforasi.</p>'
  });
}

function updateGehLgibOaklandViz(presetIn, fromUser) {
  if (presetIn === "safe") {
    gehVizState.lgibOaklandAge = 45;
    gehVizState.lgibOaklandDre = false;
    gehVizState.lgibOaklandPrior = false;
    gehVizState.lgibOaklandHr = 76;
    gehVizState.lgibOaklandSbp = 135;
    gehVizState.lgibOaklandHb = 13.8;
  } else if (presetIn === "mod") {
    gehVizState.lgibOaklandAge = 68;
    gehVizState.lgibOaklandDre = true;
    gehVizState.lgibOaklandPrior = true;
    gehVizState.lgibOaklandHr = 96;
    gehVizState.lgibOaklandSbp = 118;
    gehVizState.lgibOaklandHb = 10.4;
  } else if (presetIn === "severe") {
    gehVizState.lgibOaklandAge = 74;
    gehVizState.lgibOaklandDre = true;
    gehVizState.lgibOaklandPrior = true;
    gehVizState.lgibOaklandHr = 116;
    gehVizState.lgibOaklandSbp = 84;
    gehVizState.lgibOaklandHb = 7.6;
  }

  var s = calcOaklandScore(
    gehVizState.lgibOaklandAge,
    gehVizState.lgibOaklandDre,
    gehVizState.lgibOaklandPrior,
    gehVizState.lgibOaklandHr,
    gehVizState.lgibOaklandSbp,
    gehVizState.lgibOaklandHb
  );
  var isOut = s <= 8;

  syncVizPresets("viz-geh-lgib-tabs", [presetIn === "safe", presetIn === "mod", presetIn === "severe"]);
  swapVizSvgFrame("viz-gehLgib-frame", buildGehLgibOaklandSvg(gehVizState.lgibMode, s, isOut ? "Safe Discharge" : "Inpatient"));
  updateVizReadout("viz-gehLgib-readout", isOut ? "info" : "danger", formatVizReadoutHtml(
    "Skor Oakland " + s + " Poin — " + (isOut ? "Layak Rawat Jalan" : "Wajib Rawat Inap & Investigasi Segera"),
    "Interpretasi Skor Oakland",
    isOut ? "Skor &le;8 aman rawat jalan." : "Skor &gt;8 wajib rawat inap.",
    "CTA vs Kolonoskopi",
    "Instabil / syok -> CTA cito; stabil -> kolonoskopi elektif.",
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> 10–15% hematochezia masif bersumber dari SCBA masif! Kolitis iskemik menyerang daerah watershed fleksura lienalis.</p>'
  ), "lgib-" + s);
}

// =========================================================================
// W5. ATLAS HISTOPATOLOGI VILI USUS & UJI D-XYLOSE (geh-2-1)
// =========================================================================
var GEH_VILLI_DATA = {
  celiac_marsh: {
    label: "Penyakit Celiac (Marsh 0-3c)",
    tone: "danger",
    pathology: "Atrofi Vili + Limfositosis Intraepitel (IEL)",
    dxylose: "Urin 5 Jam Rendah (<4.0 g) = Malabsorpsi Mukosa",
    serology: "Anti-tTG IgA + Total IgA Serum (Lini 1)",
    rx: "Gluten-Free Diet (Bebas Gandum, Rye, Barley)",
    c1Label: "Morfologi Histopatologi",
    c1Body: "Marsh 1: infiltratif IEL &gt;25/100 enterosit; Marsh 2: hiperplasia kriptus; Marsh 3a–3c: pemendekan vili hingga atrofi total (mukosa datar).",
    c2Label: "Serologi & D-Xylose",
    c2Body: "Anti-tTG IgA memiliki sensitivitas &amp; spesifisitas &gt;95%. Uji D-Xylose abnormal membuktikan kerusakan mukosa usus halus."
  },
  whipple: {
    label: "Penyakit Whipple",
    tone: "warning",
    pathology: "Makrofag Berbusa PAS (+) Tahan Diastase",
    dxylose: "Urin Rendah (<4.0 g) akibat Infiltrasi Lamina",
    serology: "PCR Tropheryma whipplei Jaringan / Darah",
    rx: "Seftriakson 2g IV x 2 Minggu -> Kotrimoksazol 1 Tahun",
    c1Label: "Morfologi Histopatologi",
    c1Body: "Lamina propria terinfiltrasi padat oleh makrofag berbusa (foamy) yang sarat basil <em>Tropheryma whipplei</em> PAS positif tahan diastase, BTA negatif.",
    c2Label: "Klinis & Tatalaksana",
    c2Body: "Trias: Malabsorpsi kronik + artritis migratory seronegatif + demam/limfadenopati. Wajib antibiotik menembus BBB selama 1 tahun penuh!"
  },
  giardia: {
    label: "Giardiasis Duodenalis",
    tone: "info",
    pathology: "Trofozoit Pir Berflagel di Brush Border (Vili Utuh)",
    dxylose: "Normal / Menurun Ringan",
    serology: "Antigen Feses Giardia EIA / Mikroskopis Kista",
    rx: "Metronidazol 3x500 mg x 5–7 Hari (atau Tinidazol)",
    c1Label: "Morfologi Histopatologi",
    c1Body: "Arsitektur vili umumnya normal tanpa invasi jaringan. Tampak trofozoit bentuk buah pir dengan dua inti (gambaran mata/kacamata) menempel di mikrovili.",
    c2Label: "Patofisiologi & Terapi",
    c2Body: "Menyebabkan malabsorpsi lemak ringan dan defisiensi laktase sekunder. Terapi kuratif dengan Metronidazol atau Tinidazol dosis tunggal 2 g."
  },
  dxylose: {
    label: "Uji D-Xylose (Mukosa vs Pankreas)",
    tone: "info",
    pathology: "D-Xylose Diserap Pasif Tanpa Butuh Enzim Pankreas",
    dxylose: "Ekskresi Urin 5 Jam: Normal >=4.0 g | Abnormal <4.0 g",
    serology: "Fecal Elastase-1 (<200 ug/g = Insufisiensi Pankreas)",
    rx: "Enzim Pankreas (PERT) vs Terapi Penyakit Mukosa",
    c1Label: "Fisiologi Uji D-Xylose",
    c1Body: "D-Xylose adalah monosakarida yang diserap langsung oleh mukosa duodenum/jejunum proksimal yang utuh tanpa perlu hidrolisis enzim pankreas.",
    c2Label: "Interpretasi Pemilahan",
    c2Body: "D-Xylose urin &lt;4.0 g = <strong>Penyakit Mukosa Usus</strong> (Celiac/Whipple). D-Xylose normal (&ge;4.0 g) dengan steatorea = <strong>Maldigesti Pankreas</strong>."
  }
};

function buildGehMalabsorptionVilliSvg(modeKey, stageKey) {
  var d = GEH_VILLI_DATA[modeKey] || GEH_VILLI_DATA.celiac_marsh;

  var villiPath = "";
  if (modeKey === "celiac_marsh") {
    // Blunted/flat villi
    villiPath = '<path d="M40,160 Q60,140 80,160 Q100,140 120,160 Q140,140 160,160 Q180,140 200,160 L200,185 L40,185 Z" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.5" />' +
      '<circle cx="80" cy="148" r="3.5" fill="var(--accent-coral)" />' +
      '<circle cx="120" cy="148" r="3.5" fill="var(--accent-coral)" />' +
      '<text x="120" y="125" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">ATROFI VILI MARSH 3c (FLAT)</text>' +
      '<text x="120" y="137" text-anchor="middle" font-size="7.5" font-weight="600" fill="var(--text-muted)">Infiltrat IEL padat &gt;25/100 enterosit</text>';
  } else if (modeKey === "whipple") {
    // Tall villi with PAS+ macrophages
    villiPath = '<path d="M40,175 Q60,70 80,175 Q100,70 120,175 Q140,70 160,175 Q180,70 200,175 L200,185 L40,185 Z" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="2" />' +
      '<ellipse cx="70" cy="120" rx="6" ry="10" fill="#ec4899" fill-opacity="0.8" />' +
      '<ellipse cx="110" cy="120" rx="6" ry="10" fill="#ec4899" fill-opacity="0.8" />' +
      '<ellipse cx="150" cy="120" rx="6" ry="10" fill="#ec4899" fill-opacity="0.8" />' +
      '<text x="120" y="60" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ec4899">MAKROFAG FOAMY PAS (+)</text>' +
      '<text x="120" y="196" text-anchor="middle" font-size="7.5" font-weight="600" fill="var(--text-muted)">Tropheryma whipplei tahan diastase</text>';
  } else if (modeKey === "giardia") {
    // Normal villi with pear trophozoites on brush border
    villiPath = '<path d="M40,175 Q60,65 80,175 Q100,65 120,175 Q140,65 160,175 Q180,65 200,175 L200,185 L40,185 Z" fill="var(--bg-surface)" stroke="var(--accent-primary)" stroke-width="2" />' +
      // Pear trophozoites
      '<ellipse cx="62" cy="75" rx="5" ry="7" fill="var(--accent-primary)" />' +
      '<circle cx="60" cy="73" r="1.2" fill="#ffffff" /><circle cx="64" cy="73" r="1.2" fill="#ffffff" />' +
      '<ellipse cx="102" cy="75" rx="5" ry="7" fill="var(--accent-primary)" />' +
      '<circle cx="100" cy="73" r="1.2" fill="#ffffff" /><circle cx="104" cy="73" r="1.2" fill="#ffffff" />' +
      '<text x="120" y="55" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-primary)">TROFOZOIT GIARDIA (VILI UTUH)</text>';
  } else {
    // D-Xylose absorption diagram
    villiPath = '<rect x="45" y="65" width="150" height="90" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="120" y="85" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-primary)">ABSORPSI D-XYLOSE</text>' +
      '<text x="120" y="105" text-anchor="middle" font-size="8" font-weight="600" fill="var(--text-secondary)">Mukosa Rusak -> Urin &lt;4.0 g</text>' +
      '<text x="120" y="122" text-anchor="middle" font-size="8" font-weight="600" fill="var(--accent-secondary)">Pankreas Eksokrin -> Urin &ge;4.0 g</text>' +
      '<text x="120" y="142" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">Uji D-Xylose urin 5 jam</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Atlas Histopatologi Vili Usus">' +
    // Left microscopy panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">MIKROSKOPI MUKOSA USUS HALUS</text>' +
    villiPath +

    // Right metric panel (x=240..462)
    '<rect x="242" y="14" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="30" font-size="8.5" font-weight="800" fill="var(--text-muted)">HISTOPATOLOGI & SEROLOGI</text>' +
    '<text x="254" y="47" font-size="9.5" font-weight="800" fill="var(--text-primary)">' + d.pathology + '</text>' +
    '<text x="254" y="63" font-size="7.8" font-weight="600" fill="var(--accent-primary)">' + d.serology + '</text>' +

    '<rect x="242" y="80" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="96" font-size="8.5" font-weight="800" fill="var(--text-muted)">UJI D-XYLOSE & BIOKIMIA</text>' +
    '<text x="254" y="113" font-size="8.5" font-weight="700" fill="var(--accent-secondary)">' + d.dxylose + '</text>' +
    '<text x="254" y="129" font-size="7.6" font-weight="600" fill="var(--text-muted)">Membedakan kelainan mukosa vs maldigesti luminal</text>' +

    '<rect x="242" y="146" width="218" height="66" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="162" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PANDUAN TERAPI SPESIFIK</text>' +
    '<text x="254" y="179" font-size="8.4" font-weight="700" fill="var(--text-primary)">' + d.rx + '</text>' +
    '<text x="254" y="198" font-size="7.5" font-weight="600" fill="var(--text-muted)">Defisiensi IgA selektif: pakai Anti-DGP IgG!</text>' +
  '</svg>';
}

function renderGehMalabsorptionVilliWidget() {
  var mode = GEH_VILLI_DATA[gehVizState.villiMode] ? gehVizState.villiMode : "celiac_marsh";
  var d = GEH_VILLI_DATA[mode];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-villi-tabs", Object.entries(GEH_VILLI_DATA).map(function(e) {
      return { key: e[0], label: e[1].label.split(" ")[0] + " " + (e[1].label.split(" ")[1] || ""), onclick: "window.InternaApp.updateGehMalabsorptionVilliViz('" + e[0] + "', null, true)" };
    }), mode) +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehVilli",
    title: "Atlas Histopatologi Vili Usus (Marsh Celiac, Whipple, Giardia) & D-Xylose",
    tag: "Malabsorpsi & Usus Halus • KKI 3B / 4",
    controlsTop: controlsTop,
    svgHtml: buildGehMalabsorptionVilliSvg(mode, gehVizState.celiacStage),
    info: {
      tone: d.tone,
      rKey: "villi-" + mode,
      title: "Profil " + d.label,
      c1Label: d.c1Label,
      c1Body: d.c1Body,
      c2Label: d.c2Label,
      c2Body: d.c2Body
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Uji <strong>Anti-tTG IgA</strong> wajib disertai pengukuran <strong>Total Serum IgA</strong> karena 2–3% pasien Celiac mengalami defisiensi IgA selektif (yang menimbulkan hasil anti-tTG IgA negatif palsu!). Bila defisiensi IgA, gunakan antibodi <strong>Anti-DGP IgG (Deamidated Gliadin Peptide)</strong>.</p>'
  });
}

function updateGehMalabsorptionVilliViz(modeIn, stageIn, fromUser) {
  if (modeIn && GEH_VILLI_DATA[modeIn]) gehVizState.villiMode = modeIn;
  if (stageIn) gehVizState.celiacStage = stageIn;

  var mode = gehVizState.villiMode;
  var d = GEH_VILLI_DATA[mode];

  syncVizPresets("viz-geh-villi-tabs", Object.keys(GEH_VILLI_DATA).map(function(k) { return k === mode; }));
  swapVizSvgFrame("viz-gehVilli-frame", buildGehMalabsorptionVilliSvg(mode, gehVizState.celiacStage));
  updateVizReadout("viz-gehVilli-readout", d.tone, formatVizReadoutHtml(
    "Profil " + d.label, d.c1Label, d.c1Body, d.c2Label, d.c2Body,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Cek Total IgA serum saat uji Anti-tTG IgA. D-Xylose normal (&ge;4g) membedakan insufisiensi eksokrin pankreas dari enteropati mukosa.</p>'
  ), "villi-" + mode);
}

// =========================================================================
// W6. ATLAS PERBANDINGAN KOLITIS ULSERATIF VS PENYAKIT CROHN & TRUELOVE (geh-2-2)
// =========================================================================
var GEH_IBD_DATA = {
  uc: {
    label: "Kolitis Ulseratif (UC)",
    tone: "danger",
    distribution: "Kontinu dari Rektum Proksimal (Terbatas di Kolon)",
    depth: "Mukosa & Submukosa Superfisial",
    histo: "Abses Kriptus Neutrofilik, Distorsi Kriptus",
    serology: "p-ANCA Positif (60–70%), ASCA Negatif",
    smoking: "Merokok Bersifat 'Protektif' (Sering Flare Saat Stop)",
    c1Label: "Anatomi & Histopatologi",
    c1Body: "Inflamasi kontinu mulai dari rektum (proktitis) menyebar ke kolon tanpa skip lesions. Terbatas di mukosa superfisial; histopatologi menunjukkan <strong>abses kriptus</strong>.",
    c2Label: "Komplikasi Akut & Kanker",
    c2Body: "Risiko <strong>Megakolon Toksik</strong> (diameter kolon transversal &gt;6 cm). Risiko kanker kolorektal meningkat setelah 8–10 tahun onset (wajib kolonoskopi surveilans berkala)."
  },
  cd: {
    label: "Penyakit Crohn (CD)",
    tone: "warning",
    distribution: "Seluruh GI (Mulut-Anus), Skip Lesions, Ileum Terminal",
    depth: "Transmural (Seluruh Lapisan Dinding Usus)",
    histo: "Granuloma Non-Kaseosa (30%), Fissuring Ulcers",
    serology: "ASCA Positif (60–70%), p-ANCA Negatif",
    smoking: "Merokok Memperburuk Penyakit & Memicu Relaps!",
    c1Label: "Anatomi & Histopatologi",
    c1Body: "Inflamasi transmural segmental (skip lesions) sering melibatkan ileum terminalis dan sekum. Membentuk ulkus aftosa diskrit, gambaran <em>cobblestone</em>, dan <em>creeping fat</em>.",
    c2Label: "Komplikasi Struktural",
    c2Body: "Karena bersifat transmural, komplikasi khas mencakup <strong>striktur/obstruksi usus, fistula enterokutan/enterovesikal, dan abses intraabdomen</strong>."
  },
  truelove: {
    label: "Derajat Truelove-Witts (UC)",
    tone: "danger",
    distribution: "Klasifikasi Berat Serangan Akut Kolitis Ulseratif",
    depth: "Mild vs Moderate vs Severe Serangan",
    histo: "Kriteria: Frekuensi BAB Darah + Suhu + Nadi + Hb + LED",
    serology: "Monitoring Toksisitas Sistemik & Megakolon",
    smoking: "Panduan Rawat Inap Metilprednisolon IV 60 mg/Hari",
    c1Label: "Kriteria Severe Truelove-Witts",
    c1Body: "BAB berdarah &ge;6x/hari DITAMBAH minimal 1 tanda toksisitas sistemik: Suhu &gt;37.8°C, HR &gt;90 bpm, Hb &lt;10.5 g/dL, atau LED &gt;30 mm/jam (CRP naik).",
    c2Label: "Protokol Terapi Severe",
    c2Body: "Wajib rawat inap: <strong>Metilprednisolon IV 60 mg/hari</strong>, hidrasi, puasa parsial. Evaluasi respons hari ke-3–5 (Kriteria Oxford); bila gagal, beri rescue therapy (Infliximab / Siklosporin)."
  }
};

function buildGehIbdComparisonSvg(diseaseKey, trueloveStools, systemicCount) {
  var d = GEH_IBD_DATA[diseaseKey] || GEH_IBD_DATA.uc;
  var isUc = diseaseKey === "uc";
  var isCd = diseaseKey === "cd";

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Atlas Perbandingan IBD UC vs Crohn">' +
    // Left bowel comparison panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">DISTRIBUSI ANATOMI & DINDING USUS</text>' +
    // Colonic diagram
    '<path d="M50,175 L50,85 Q50,60 75,60 L145,60 Q170,60 170,85 L170,175" fill="none" stroke="var(--border-subtle)" stroke-width="14" stroke-linecap="round" />' +
    (isUc ? '<path d="M170,175 L170,105" fill="none" stroke="var(--accent-coral)" stroke-width="14" stroke-linecap="round" />' +
            '<text x="120" y="140" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">KONTINU MUKOSA DARI REKTUM</text>' : '') +
    (isCd ? '<path d="M50,140 L50,110" fill="none" stroke="var(--accent-secondary)" stroke-width="14" stroke-linecap="round" />' +
            '<path d="M110,60 L135,60" fill="none" stroke="var(--accent-secondary)" stroke-width="14" stroke-linecap="round" />' +
            '<path d="M170,170 L170,150" fill="none" stroke="var(--accent-secondary)" stroke-width="14" stroke-linecap="round" />' +
            '<text x="120" y="140" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">SKIP LESIONS TRANSMURAL</text>' : '') +
    (!isUc && !isCd ? '<text x="120" y="140" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">TRUELOVE-WITTS SEVERE</text>' : '') +
    '<text x="32" y="196" font-size="8" font-weight="700" fill="var(--text-muted)">' + (isUc ? "UC: Rektum menyebar kontinu, mukosa saja" : (isCd ? "CD: Seluruh GI, transmural, fistula" : "Severe UC: Steroid IV 60 mg")) + '</text>' +

    // Right comparison panel (x=240..462)
    '<rect x="242" y="14" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="30" font-size="8.5" font-weight="800" fill="var(--text-muted)">DISTRIBUSI & KEDALAMAN DINDING</text>' +
    '<text x="254" y="47" font-size="9" font-weight="800" fill="var(--accent-primary)">' + d.distribution.split(",")[0] + '</text>' +
    '<text x="254" y="63" font-size="8" font-weight="600" fill="var(--text-secondary)">Kedalaman: ' + d.depth + '</text>' +

    '<rect x="242" y="80" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="96" font-size="8.5" font-weight="800" fill="var(--text-muted)">HISTOPATOLOGI & SEROLOGI (p-ANCA / ASCA)</text>' +
    '<text x="254" y="113" font-size="8.8" font-weight="700" fill="var(--text-primary)">' + d.histo.split(",")[0] + '</text>' +
    '<text x="254" y="129" font-size="7.8" font-weight="700" fill="var(--accent-secondary)">' + d.serology + '</text>' +

    '<rect x="242" y="146" width="218" height="66" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="162" font-size="8.5" font-weight="800" fill="var(--accent-primary)">EFEK MEROKOK & KOMPLIKASI AKUT</text>' +
    '<text x="254" y="179" font-size="8" font-weight="700" fill="' + (isCd ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.smoking + '</text>' +
    '<text x="254" y="198" font-size="7.5" font-weight="600" fill="var(--text-muted)">KONTRAINDIKASI Kolonoskopi total pada fase akut!</text>' +
  '</svg>';
}

function renderGehIbdComparisonWidget() {
  var key = GEH_IBD_DATA[gehVizState.ibdDisease] ? gehVizState.ibdDisease : "uc";
  var d = GEH_IBD_DATA[key];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-ibd-tabs", Object.entries(GEH_IBD_DATA).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateGehIbdComparisonViz('" + e[0] + "', true)" };
    }), key) +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehIbd",
    title: "Atlas Perbandingan Kolitis Ulseratif vs Crohn & Kriteria Truelove-Witts",
    tag: "Inflammatory Bowel Disease • KKI 3A",
    controlsTop: controlsTop,
    svgHtml: buildGehIbdComparisonSvg(key, gehVizState.trueloveStools, 2),
    info: {
      tone: d.tone,
      rKey: "ibd-" + key,
      title: "Profil " + d.label,
      c1Label: d.c1Label,
      c1Body: d.c1Body,
      c2Label: d.c2Label,
      c2Body: d.c2Body
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada kolitis ulseratif serangan berat akut (Truelove-Witts Severe) atau megakolon toksik, <strong>KONTRAINDIKASI MUTLAK melakukan Kolonoskopi Total atau Barium Enema</strong> karena risiko tinggi perforasi usus! Evaluasi cukup dengan foto polos abdomen serial (pantau diameter kolon transversal &gt;6 cm) dan sigmoidoskopi fleksibel tanpa persiapan usus agresif.</p>'
  });
}

function updateGehIbdComparisonViz(diseaseIn, fromUser) {
  if (diseaseIn && GEH_IBD_DATA[diseaseIn]) gehVizState.ibdDisease = diseaseIn;
  var key = gehVizState.ibdDisease;
  var d = GEH_IBD_DATA[key];

  syncVizPresets("viz-geh-ibd-tabs", Object.keys(GEH_IBD_DATA).map(function(k) { return k === key; }));
  swapVizSvgFrame("viz-gehIbd-frame", buildGehIbdComparisonSvg(key, gehVizState.trueloveStools, 2));
  updateVizReadout("viz-gehIbd-readout", d.tone, formatVizReadoutHtml(
    "Profil " + d.label, d.c1Label, d.c1Body, d.c2Label, d.c2Body,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Hindari kolonoskopi total pada megakolon toksik (>6 cm). Steroid IV 60 mg/hari adalah lini 1 Truelove Severe.</p>'
  ), "ibd-" + key);
}

// =========================================================================
// W7. SIMULATOR KRITERIA ROME IV, BRISTOL STOOL & KALPROTEKTIN (geh-2-3)
// =========================================================================
var GEH_BRISTOL_DATA = {
  1: { type: 1, name: "Tipe 1: Bongkahan Keras Terpisah (Kacang)", subtype: "IBS-C", transit: "Sangat Lambat (>72j)", tone: "warning" },
  2: { type: 2, name: "Tipe 2: Sosis Bergumpal Keras", subtype: "IBS-C", transit: "Lambat (48–72j)", tone: "warning" },
  3: { type: 3, name: "Tipe 3: Sosis dengan Retakan Permukaan", subtype: "Normal / IBS-M", transit: "Normal (36–48j)", tone: "info" },
  4: { type: 4, name: "Tipe 4: Sosis / Ular Halus & Lembut", subtype: "Normal Optimal", transit: "Optimal (24–36j)", tone: "info" },
  5: { type: 5, name: "Tipe 5: Gumpalan Lunak Tepi Tegas", subtype: "Normal / IBS-M", transit: "Cepat (18–24j)", tone: "info" },
  6: { type: 6, name: "Tipe 6: Potongan Lembek Tepi Kasar Bergerigi", subtype: "IBS-D", transit: "Sangat Cepat (12–18j)", tone: "warning" },
  7: { type: 7, name: "Tipe 7: Cair Seluruhnya Tanpa Gumpalan Padat", subtype: "IBS-D", transit: "Eksplosif (<12j)", tone: "danger" }
};

function buildGehRomeIbsSvg(bristolNum, alarmActive) {
  var b = GEH_BRISTOL_DATA[bristolNum] || GEH_BRISTOL_DATA[4];

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator Kriteria Rome IV & Bristol Stool">' +
    // Left Bristol Stool Graphic Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">BRISTOL STOOL FORM SCALE (BSFS)</text>' +
    // Stool shape visual
    '<rect x="32" y="44" width="186" height="58" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    (bristolNum <= 2 ? '<circle cx="65" cy="72" r="8" fill="#78350f" /><circle cx="95" cy="74" r="9" fill="#78350f" /><circle cx="125" cy="70" r="7" fill="#78350f" /><circle cx="155" cy="73" r="8" fill="#78350f" />' : '') +
    (bristolNum >= 3 && bristolNum <= 5 ? '<rect x="55" y="65" width="140" height="16" rx="8" fill="#92400e" stroke="#78350f" stroke-width="1.5" />' : '') +
    (bristolNum >= 6 ? '<ellipse cx="125" cy="73" rx="68" ry="12" fill="#b45309" opacity="0.8" /><ellipse cx="125" cy="76" rx="55" ry="6" fill="#f59e0b" opacity="0.6" />' : '') +
    '<text x="125" y="120" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-primary)">Tipe ' + b.type + ' (' + b.subtype + ')</text>' +
    '<text x="125" y="136" text-anchor="middle" font-size="7.8" font-weight="600" fill="var(--text-muted)">Transit: ' + b.transit + '</text>' +

    // Alarm signs banner if active
    (alarmActive ? '<rect x="32" y="152" width="186" height="48" rx="11" fill="var(--accent-coral)" fill-opacity="0.2" stroke="var(--accent-coral)" stroke-width="1.5" />' +
                   '<text x="125" y="170" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">ALARM SIGNS (+) -> KOLONOSKOPI!</text>' +
                   '<text x="125" y="186" text-anchor="middle" font-size="7.2" font-weight="600" fill="var(--text-primary)">Usia &ge;50, BB turun, anemia, melena, nocturnal</text>' :
                   '<rect x="32" y="152" width="186" height="48" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
                   '<text x="125" y="172" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--accent-primary)">Tanpa Tanda Bahaya (Alarm Signs -)</text>' +
                   '<text x="125" y="186" text-anchor="middle" font-size="7.2" font-weight="600" fill="var(--text-muted)">Aman tatalaksana fungsional lini 1 di Faskes 1</text>') +

    // Right Rome IV & Calprotectin Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">KRITERIA ROME IV (IBS)</text>' +
    '<text x="254" y="44" font-size="8.5" font-weight="700" fill="var(--accent-primary)">Nyeri Perut &ge;1x/minggu x 3 Bulan Terakhir</text>' +
    '<text x="254" y="58" font-size="7.6" font-weight="600" fill="var(--text-secondary)">&bull; Terkait Defekasi | &bull; Perubahan Frekuensi</text>' +
    '<text x="254" y="70" font-size="7.6" font-weight="600" fill="var(--text-secondary)">&bull; Perubahan Bentuk Feses (Bristol 1-7)</text>' +

    '<rect x="242" y="84" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="98" font-size="8.5" font-weight="800" fill="var(--text-muted)">KALPROTEKTIN FEKAL (<50 vs >150 ug/g)</text>' +
    '<rect x="254" y="106" width="194" height="10" rx="10" fill="var(--bg-surface-subtle)" />' +
    '<rect x="254" y="106" width="70" height="10" rx="10" fill="var(--accent-primary)" opacity="0.7" />' +
    '<rect x="324" y="106" width="55" height="10" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="379" y="106" width="69" height="10" rx="10" fill="var(--accent-coral)" opacity="0.7" />' +
    '<text x="254" y="130" font-size="8" font-weight="700" fill="var(--accent-primary)">&lt;50: IBS Murni</text>' +
    '<text x="350" y="130" font-size="8" font-weight="700" fill="var(--accent-secondary)">50-150: Abu-abu</text>' +
    '<text x="448" y="130" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">&gt;150: IBD</text>' +
    '<text x="254" y="143" font-size="7.4" font-weight="600" fill="var(--text-muted)">NPV &gt;95% menyingkirkan inflamasi IBD aktif.</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">MANAJEMEN LINIK 1 (GUT-BRAIN)</text>' +
    '<text x="254" y="186" font-size="8.2" font-weight="700" fill="var(--text-primary)">Diet Rendah FODMAP + Antispasmodik</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">TCA dosis rendah (Amitriptilin 10-25mg) untuk modulasi nyeri.</text>' +
  '</svg>';
}

function renderGehRomeIbsWidget() {
  var bNum = clampNum(gehVizState.ibsBristolType, 1, 7, 6);
  var b = GEH_BRISTOL_DATA[bNum];
  var alarm = Boolean(gehVizState.ibsAlarmRedFlags);

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-bristol-tabs", Object.keys(GEH_BRISTOL_DATA).map(function(k) {
      return { key: k, label: "Tipe " + k, onclick: "window.InternaApp.updateGehRomeIbsViz(" + k + ", null, true)" };
    }), String(bNum)) +
    '<button type="button" id="viz-geh-ibs-alarm-btn" class="viz-pill-btn ' + (alarm ? "active" : "") + '" onclick="window.InternaApp.updateGehRomeIbsViz(null, ' + (!alarm) + ', true)">' +
      'Tanda Bahaya (Alarm Signs)' +
    '</button>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehRome",
    title: "Simulator Kriteria Rome IV, Bristol Stool Form Scale & Kalprotektin",
    tag: "Gangguan Fungsional Usus • KKI 4",
    controlsTop: controlsTop,
    svgHtml: buildGehRomeIbsSvg(bNum, alarm),
    info: {
      tone: alarm ? "danger" : b.tone,
      rKey: "rome-" + bNum + "-" + alarm,
      title: b.name + " (" + b.subtype + ")",
      c1Label: "Kriteria Rome IV & Subtipe",
      c1Body: "Nyeri perut kronik terkait defekasi, perubahan frekuensi dan konsistensi tinja. Subtipe saat ini sesuai <strong>" + b.subtype + "</strong>.",
      c2Label: "Peran Kalprotektin & Alarm Signs",
      c2Body: alarm
        ? "<strong>PERHATIAN ALARM SIGNS:</strong> Adanya penurunan berat badan, anemia, perdarahan rektal, atau onset usia &ge;50 th membatalkan diagnosis IBS; <strong>WAJIB KOLONOSKOPI SEGERA</strong>!"
        : "Kalprotektin fekal &lt;50 ug/g menyingkirkan IBD (&gt;95% NPV) tanpa perlu kolonoskopi invasif pada pasien muda tanpa tanda bahaya."
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Diagnosis IBS adalah diagnosis eksklusi yang ditegakkan berdasarkan Kriteria <strong>Rome IV</strong> HANYA jika tidak ada <em>Red Flag Signs</em> (usia &ge;50 th, BB turun tanpa sebab, perdarahan per rektum, anemia defisiensi besi, demam, diare malam hari, atau riwayat keluarga KKR/IBD). Bila ada &ge;1 red flag, lakukan kolonoskopi elektif!</p>'
  });
}

function updateGehRomeIbsViz(typeIn, alarmIn, fromUser) {
  if (typeIn !== null && typeIn !== undefined) gehVizState.ibsBristolType = clampNum(typeIn, 1, 7, 6);
  if (typeof alarmIn === "boolean") gehVizState.ibsAlarmRedFlags = alarmIn;

  var bNum = gehVizState.ibsBristolType;
  var b = GEH_BRISTOL_DATA[bNum];
  var alarm = gehVizState.ibsAlarmRedFlags;

  syncVizPresets("viz-geh-bristol-tabs", Object.keys(GEH_BRISTOL_DATA).map(function(k) { return Number(k) === bNum; }));
  var alarmBtn = document.getElementById("viz-geh-ibs-alarm-btn");
  if (alarmBtn) alarmBtn.classList.toggle("active", alarm);

  swapVizSvgFrame("viz-gehRome-frame", buildGehRomeIbsSvg(bNum, alarm));
  updateVizReadout("viz-gehRome-readout", alarm ? "danger" : b.tone, formatVizReadoutHtml(
    b.name + " (" + b.subtype + ")",
    "Kriteria Rome IV & Subtipe",
    "Subtipe saat ini sesuai <strong>" + b.subtype + "</strong>. " + (alarm ? "Alarm signs positif!" : "Tanpa alarm signs."),
    "Peran Kalprotektin & Alarm Signs",
    alarm ? "Wajib kolonoskopi segera untuk menyingkirkan keganasan / IBD!" : "Kalprotektin fekal <50 ug/g mendukung diagnosis fungsional.",
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Red flags (usia &ge;50, anemia, perdarahan GI, nocturnal diarrhea) mewajibkan kolonoskopi!</p>'
  ), "rome-" + bNum + "-" + alarm);
}

// =========================================================================
// W8. ATLAS SEKUEN ADENOMA-KARSINOMA, LYNCH & STAGING KKR (geh-2-4)
// =========================================================================
var GEH_POLYP_DATA = {
  normal: {
    label: "Epitel Normal",
    gene: "Gen Wild-type Utuh",
    histo: "Kriptus Tubuler Teratur, Membran Basal Utuh",
    surv: "Skrining Populasi Rata-rata Mulai Usia 45 Tahun",
    tone: "info"
  },
  apc_early: {
    label: "Adenoma Dini (Mutasi APC)",
    gene: "Hilangnya APC (5q21) -> Akumulasi Beta-Katenin",
    histo: "Displasia Derajat Rendah, Proliferasi Kriptus",
    surv: "1–2 Polip Tubuler <10 mm: Kolonoskopi Ulang 7–10 Tahun",
    tone: "info"
  },
  kras_inter: {
    label: "Adenoma Lanjut (Mutasi KRAS)",
    gene: "Mutasi Onkogen KRAS (12p12) -> Hilangnya 18q (SMAD4)",
    histo: "Adenoma Tubulovilosa / Vilosa, Displasia Tinggi",
    surv: ">=3 Polip / Ukuran >=10 mm: Kolonoskopi Ulang 3 Tahun",
    tone: "warning"
  },
  tp53_carcinoma: {
    label: "Karsinoma Invasif (Mutasi TP53)",
    gene: "Inaktivasi TP53 (17p13) -> Overekspresi COX-2",
    histo: "Invasi Menembus Muscularis Mucosae & Submukosa",
    surv: "Reseksi Bedah Onkologi: Kemoterapi FOLFOX / CAPOX",
    tone: "danger"
  },
  lynch_msi: {
    label: "Sindrom Lynch (Defisiensi MMR)",
    gene: "Defisiensi Enzim MMR (MLH1/MSH2) -> MSI-H",
    histo: "Kolon Kanan Dominan, Infiltrasi Limfositik Padat",
    surv: "Surveilans Tiap 1–2 Tahun: Mulai Usia 20–25 Tahun",
    tone: "danger"
  }
};

function buildGehColorectalPolypSvg(stageKey) {
  var p = GEH_POLYP_DATA[stageKey] || GEH_POLYP_DATA.kras_inter;

  var polypVisual = "";
  if (stageKey === "normal") {
    polypVisual = '<rect x="35" y="130" width="180" height="30" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="125" y="150" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-primary)">Mukosa Epitel Kolon Normal</text>';
  } else if (stageKey === "apc_early") {
    polypVisual = '<rect x="35" y="145" width="180" height="15" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<circle cx="125" cy="120" r="16" fill="var(--accent-primary)" fill-opacity="0.5" stroke="var(--accent-primary)" stroke-width="1.5" />' +
      '<text x="125" y="100" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">Polip Adenoma Tubuler Kecil</text>';
  } else if (stageKey === "kras_inter") {
    polypVisual = '<rect x="35" y="145" width="180" height="15" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<path d="M100,145 Q125,75 150,145 Z" fill="var(--accent-secondary)" fill-opacity="0.5" stroke="var(--accent-secondary)" stroke-width="2" />' +
      '<text x="125" y="90" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-secondary)">Adenoma Vilosa / High Grade</text>';
  } else if (stageKey === "tp53_carcinoma") {
    polypVisual = '<rect x="35" y="145" width="180" height="15" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<path d="M90,165 L105,80 L145,80 L160,165 Z" fill="var(--accent-coral)" fill-opacity="0.6" stroke="var(--accent-coral)" stroke-width="2" />' +
      '<text x="125" y="72" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">Adenokarsinoma Invasif Submukosa</text>';
  } else {
    polypVisual = '<rect x="35" y="145" width="180" height="15" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<circle cx="95" cy="115" r="18" fill="#a855f7" fill-opacity="0.5" stroke="#a855f7" stroke-width="2" />' +
      '<circle cx="155" cy="120" r="14" fill="#a855f7" fill-opacity="0.5" stroke="#a855f7" stroke-width="2" />' +
      '<text x="125" y="80" text-anchor="middle" font-size="8" font-weight="800" fill="#a855f7">Sindrom Lynch / MSI-H Kolon Kanan</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Atlas Sekuens Polip Adenoma-Karsinoma">' +
    // Left anatomy panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">MORFOLOGI POLIP & HISTOPATOLOGI</text>' +
    polypVisual +
    '<text x="32" y="196" font-size="8" font-weight="700" fill="var(--text-muted)">' + p.label + '</text>' +

    // Right genetic panel (x=240..462)
    '<rect x="242" y="14" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">JALUR MUTASI GENETIK (VOGELSTEIN)</text>' +
    '<text x="254" y="46" font-size="8.8" font-weight="800" fill="var(--accent-primary)">' + p.gene.split("->")[0] + '</text>' +
    '<text x="254" y="62" font-size="7.6" font-weight="600" fill="var(--text-secondary)">' + (p.gene.split("->")[1] || p.histo) + '</text>' +

    '<rect x="242" y="80" width="218" height="60" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="96" font-size="8.5" font-weight="800" fill="var(--text-muted)">SURVEILANS PASCA-POLIPEKTOMI</text>' +
    '<text x="254" y="113" font-size="8.4" font-weight="700" fill="var(--accent-secondary)">' + p.surv.split(":")[0] + '</text>' +
    '<text x="254" y="129" font-size="7.6" font-weight="600" fill="var(--text-muted)">' + (p.surv.split(":")[1] || "Interval panduan US MSTF / ESGE") + '</text>' +

    '<rect x="242" y="146" width="218" height="66" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="162" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PERAN BIOMARKER & KANKER SINKRONUS</text>' +
    '<text x="254" y="179" font-size="8.2" font-weight="700" fill="var(--text-primary)">CEA untuk Evaluasi Terapi, Bukan Skrining!</text>' +
    '<text x="254" y="198" font-size="7.5" font-weight="600" fill="var(--text-muted)">Lynch: skrining karsinoma endometrium pada wanita!</text>' +
  '</svg>';
}

function renderGehColorectalPolypWidget() {
  var stage = GEH_POLYP_DATA[gehVizState.polypStage] ? gehVizState.polypStage : "kras_inter";
  var p = GEH_POLYP_DATA[stage];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-polyp-tabs", Object.entries(GEH_POLYP_DATA).map(function(e) {
      return { key: e[0], label: e[1].label.split(" ")[0] + " " + (e[1].label.split(" ")[1] || ""), onclick: "window.InternaApp.updateGehColorectalPolypViz('" + e[0] + "', true)" };
    }), stage) +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehPolyp",
    title: "Atlas Sekuens Adenoma-Karsinoma (APC-KRAS-TP53), Lynch & Surveilans",
    tag: "Onkologi Gastrointestinal • KKI 3B / 2",
    controlsTop: controlsTop,
    svgHtml: buildGehColorectalPolypSvg(stage),
    info: {
      tone: p.tone,
      rKey: "polyp-" + stage,
      title: "Tahapan: " + p.label,
      c1Label: "Kaskade Molekuler",
      c1Body: p.gene + ". Polip vilosa memiliki risiko transformasi maligna 3x lipat dibanding tubuler murni.",
      c2Label: "Interval Surveilans Pasca-Polipektomi",
      c2Body: p.surv
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Kadar <strong>CEA serum</strong> TIDAK boleh digunakan untuk skrining awal kanker kolorektal karena rendahnya sensitivitas pada stadium dini. CEA digunakan khusus untuk memantau kekambuhan dan respons terapi bedah/kemoterapi. Pada Sindrom Lynch (mutasi gen MMR MLH1/MSH2), kolonoskopi wajib dimulai sejak usia 20–25 tahun setiap 1–2 tahun.</p>'
  });
}

function updateGehColorectalPolypViz(stageIn, fromUser) {
  if (stageIn && GEH_POLYP_DATA[stageIn]) gehVizState.polypStage = stageIn;
  var stage = gehVizState.polypStage;
  var p = GEH_POLYP_DATA[stage];

  syncVizPresets("viz-geh-polyp-tabs", Object.keys(GEH_POLYP_DATA).map(function(k) { return k === stage; }));
  swapVizSvgFrame("viz-gehPolyp-frame", buildGehColorectalPolypSvg(stage));
  updateVizReadout("viz-gehPolyp-readout", p.tone, formatVizReadoutHtml(
    "Tahapan: " + p.label,
    "Kaskade Molekuler",
    p.gene,
    "Interval Surveilans Pasca-Polipektomi",
    p.surv,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> CEA bukan alat skrining! Polip vilosa &gt;10 mm disurveilans ulang tiap 3 tahun.</p>'
  ), "polyp-" + stage);
}

// =========================================================================
// W9. KALKULATOR R-VALUE CEDERA HATI, NOMOGRAM & KING'S COLLEGE ALF (geh-3-1)
// =========================================================================
function buildGehRvalueAlfSvg(rVal, patternKey, isHysLaw, isKch) {
  var r = clampNum(rVal, 0.1, 25, 7.2);
  var needleX = 35 + clampNum(r / 10, 0, 1) * 165;
  var color = r >= 5 ? "var(--accent-coral)" : (r <= 2 ? "var(--accent-primary)" : "var(--accent-secondary)");

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Kalkulator R-Value Pola Cedera Hati">' +
    // Left R-Value Gauge (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SKALA R-VALUE CEDERA HATI (DILI)</text>' +
    // R-Value Bar
    '<rect x="35" y="46" width="175" height="14" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<rect x="35" y="46" width="35" height="14" rx="7" fill="var(--accent-primary)" opacity="0.6" />' +
    '<rect x="70" y="46" width="52" height="14" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="122" y="46" width="88" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    // Needle
    '<circle cx="' + needleX.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + color + '" stroke-width="2.5" />' +
    '<text x="35" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">Kolestatik &le;2</text>' +
    '<text x="96" y="74" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">Campuran 2–5</text>' +
    '<text x="210" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">Hepatoseluler &ge;5</text>' +
    '<text x="35" y="98" font-size="11" font-weight="800" fill="' + color + '">R = ' + r.toFixed(2) + ' (' + patternKey + ')</text>' +

    // Hy's Law Box
    '<rect x="35" y="112" width="175" height="42" rx="11" fill="' + (isHysLaw ? "var(--accent-coral)" : "var(--bg-surface)") + '" fill-opacity="' + (isHysLaw ? "0.2" : "1") + '" stroke="' + (isHysLaw ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isHysLaw ? "2" : "1") + '" />' +
    '<text x="45" y="126" font-size="8.5" font-weight="800" fill="' + (isHysLaw ? "var(--accent-coral)" : "var(--text-primary)") + '">Hukum Hy (Hy\'s Law)</text>' +
    '<text x="45" y="140" font-size="7.4" font-weight="700" fill="' + (isHysLaw ? "var(--accent-coral)" : "var(--text-muted)") + '">' + (isHysLaw ? "POSITIF (Mortalitas DILI 10–50%!)" : "Negatif (Bilirubin &lt;2x / ALP naik)") + '</text>' +

    '<text x="32" y="180" font-size="7.8" font-weight="600" fill="var(--text-muted)">R = (ALT / ALT ULN) / (ALP / ALP ULN)</text>' +
    '<text x="32" y="196" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Hepatoseluler: Parasetamol, INH, Viral Akut</text>' +

    // Right Nomogram & King's College Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">NOMOGRAM RUMACK-MATTHEW</text>' +
    '<text x="254" y="44" font-size="8.5" font-weight="700" fill="var(--text-primary)">Garis Terapi: 150 ug/mL pada Jam ke-4</text>' +
    '<text x="254" y="58" font-size="7.6" font-weight="600" fill="var(--accent-primary)">N-Asetilsistein (NAC) IV &lt;8–10 jam optimal</text>' +
    '<text x="254" y="70" font-size="7.2" font-weight="600" fill="var(--text-muted)">Tetap berikan NAC walau datang &gt;24 jam bila ALF!</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="' + (isKch ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isKch ? "2" : "1") + '" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="' + (isKch ? "var(--accent-coral)" : "var(--text-muted)") + '">KING\'S COLLEGE ALF CRITERIA</text>' +
    '<text x="254" y="117" font-size="8.2" font-weight="700" fill="' + (isKch ? "var(--accent-coral)" : "var(--text-primary)") + '">' + (isKch ? "KRITERIA POSITIF: INDIKASI TRANSPLANTASI!" : "pH &ge;7.30 / INR &le;6.5 (Mendukung Terapi Medis)") + '</text>' +
    '<text x="254" y="134" font-size="7.4" font-weight="600" fill="var(--text-muted)">Parasetamol: pH &lt;7.30 ATAU (INR &gt;6.5 + Cr &gt;3.4 + HE III/IV)</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">TRIAGE & TINDAKAN EMERGENSI</text>' +
    '<text x="254" y="186" font-size="8.2" font-weight="700" fill="var(--text-primary)">' + (isKch ? "Aktivasi Tim Transplantasi Hepar Segera!" : "Lanjutkan Protokol NAC + ICU Monitoring") + '</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Koreksi koagulopati hanya jika perdarahan aktif/invasif.</text>' +
  '</svg>';
}

function calcGehRvalueAlf(presetKey) {
  var altEl = document.getElementById("geh-rval-alt");
  var altUlnEl = document.getElementById("geh-rval-alt-uln");
  var alpEl = document.getElementById("geh-rval-alp");
  var alpUlnEl = document.getElementById("geh-rval-alp-uln");
  var biliEl = document.getElementById("geh-rval-bili");
  var inrEl = document.getElementById("geh-rval-inr");
  var crEl = document.getElementById("geh-rval-cr");
  var phEl = document.getElementById("geh-rval-ph");

  var PRESETS = {
    dili_hepatocellular: { alt: 960, altUln: 40, alp: 160, alpUln: 120, bili: 5.4, inr: 1.3, cr: 1.0, ph: 7.38 },
    dili_cholestatic: { alt: 110, altUln: 40, alp: 540, alpUln: 120, bili: 6.8, inr: 1.2, cr: 0.9, ph: 7.41 },
    dili_mixed: { alt: 280, altUln: 40, alp: 280, alpUln: 120, bili: 3.5, inr: 1.2, cr: 1.1, ph: 7.39 },
    kch_paracetamol_alf: { alt: 4200, altUln: 40, alp: 180, alpUln: 120, bili: 12.5, inr: 6.8, cr: 3.8, ph: 7.24 }
  };

  if (presetKey && PRESETS[presetKey]) {
    gehVizState.rValPreset = presetKey;
    var pr = PRESETS[presetKey];
    if (altEl) altEl.value = pr.alt;
    if (altUlnEl) altUlnEl.value = pr.altUln;
    if (alpEl) alpEl.value = pr.alp;
    if (alpUlnEl) alpUlnEl.value = pr.alpUln;
    if (biliEl) biliEl.value = pr.bili;
    if (inrEl) inrEl.value = pr.inr;
    if (crEl) crEl.value = pr.cr;
    if (phEl) phEl.value = pr.ph;
  }
  syncVizPresets("viz-geh-rval-presets", Object.keys(PRESETS).map(function(k) { return k === gehVizState.rValPreset; }));

  var alt = clampNum(altEl ? altEl.value : 960, 10, 15000, 960);
  var altUln = clampNum(altUlnEl ? altUlnEl.value : 40, 10, 100, 40);
  var alp = clampNum(alpEl ? alpEl.value : 160, 10, 3000, 160);
  var alpUln = clampNum(alpUlnEl ? alpUlnEl.value : 120, 20, 300, 120);
  var bili = clampNum(biliEl ? biliEl.value : 5.4, 0.2, 50, 5.4);
  var inr = clampNum(inrEl ? inrEl.value : 1.3, 0.8, 15, 1.3);
  var cr = clampNum(crEl ? crEl.value : 1.0, 0.3, 15, 1.0);
  var ph = clampNum(phEl ? phEl.value : 7.38, 6.8, 7.7, 7.38);

  var r = (alt / altUln) / (alp / alpUln);
  var isHysLaw = (alt >= 3 * altUln) && (bili >= 2.0) && (alp < 2 * alpUln);
  var isKchParacetamol = (ph < 7.30) || (inr > 6.5 && cr > 3.4);

  var patternLabel = "Campuran";
  var tone = "warning";

  if (r >= 5.0) {
    patternLabel = "Hepatoseluler";
    tone = "danger";
  } else if (r <= 2.0) {
    patternLabel = "Kolestatik";
    tone = "info";
  }

  swapVizSvgFrame("viz-gehRval-frame", buildGehRvalueAlfSvg(r, patternLabel, isHysLaw, isKchParacetamol));
  var res = document.getElementById("widget-geh-rval-result");
  if (!res) return;

  var kchHtml = isKchParacetamol
    ? '<span class="text-[var(--accent-coral)] font-bold">KRITERIA KING\'S COLLEGE (+) -> INDIKASI TRANSPLANTASI HEPAR CITO!</span>'
    : '<span class="text-[var(--accent-primary)]">Kriteria King\'s College Belum Terpenuhi (Lanjutkan Resusitasi & NAC).</span>';

  updateCalcReadoutTone(
    res,
    isKchParacetamol ? "danger" : tone,
    "rval-" + r.toFixed(2) + "-" + isHysLaw,
    '<p class="font-bold text-[var(--text-primary)]">R-Value = ' + r.toFixed(2) + ' &rarr; POLA ' + patternLabel.toUpperCase() + '</p>' +
    '<div class="viz-readout-grid mt-1">' +
      '<p>&bull; <strong>Formula R:</strong> (ALT ' + alt + ' / ' + altUln + ') / (ALP ' + alp + ' / ' + alpUln + ') = <strong>' + r.toFixed(2) + '</strong> (' + (r >= 5 ? "Kerusakan Hepatosit Primer" : (r <= 2 ? "Cedera Kanalikuli/Obstruksi" : "Cedera Campuran")) + ').</p>' +
      '<p>&bull; <strong>Hukum Hy (Hy\'s Law):</strong> ' + (isHysLaw ? '<span class="text-[var(--accent-coral)] font-bold">POSITIF (Mortalitas DILI 10–50%!)</span>' : 'Negatif') + ' | <strong>King\'s College:</strong> ' + kchHtml + '</p>' +
    '</div>' +
    '<p class="mt-1">Overdosis parasetamol: berikan <strong>N-Asetilsistein (NAC)</strong> IV bila kadar darah di atas garis nomogram Rumack-Matthew (150 ug/mL pada jam ke-4).</p>'
  );
}

function renderGehRvalueAlfWidget() {
  var presetButtons = [
    { key: "dili_hepatocellular", label: "Hepatoseluler (R>=5)" },
    { key: "dili_cholestatic", label: "Kolestatik (R<=2)" },
    { key: "dili_mixed", label: "Campuran (R 2–5)" },
    { key: "kch_paracetamol_alf", label: "ALF Parasetamol (KCH+)" }
  ];

  return '<div class="viz-widget" id="viz-calc-geh-rval-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator R-Value Pola Cedera Hati, Hy\'s Law & King\'s College ALF</span>' +
      '<span class="viz-tag">Hepatologi & DILI • KKI 4 / 3B</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-geh-rval-presets">' +
      presetButtons.map(function(b) {
        return '<button type="button" class="viz-pill-btn ' + (gehVizState.rValPreset === b.key ? "active" : "") + '" onclick="window.InternaApp.calcGehRvalueAlf(\'' + b.key + '\')">' + b.label + '</button>';
      }).join("") +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-alt">ALT (SGPT)</label><input type="number" id="geh-rval-alt" value="960" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-alt-uln">ALT ULN</label><input type="number" id="geh-rval-alt-uln" value="40" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-alp">ALP (Fosfatase)</label><input type="number" id="geh-rval-alp" value="160" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-alp-uln">ALP ULN</label><input type="number" id="geh-rval-alp-uln" value="120" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-bili">Total Bilirubin</label><input type="number" id="geh-rval-bili" step="0.1" value="5.4" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-inr">INR</label><input type="number" id="geh-rval-inr" step="0.1" value="1.3" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-cr">Kreatinin</label><input type="number" id="geh-rval-cr" step="0.1" value="1.0" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-rval-ph">pH Arteri</label><input type="number" id="geh-rval-ph" step="0.01" value="7.38" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehRvalueAlf()" /></div>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-gehRval-frame">' +
      buildGehRvalueAlfSvg(7.20, "Hepatoseluler", true, false) +
    '</div>' +
    '<div id="widget-geh-rval-result" class="viz-readout" data-tone="danger" data-last-key="rval-init">' +
      '<p class="font-bold text-[var(--text-primary)]">R-Value = 7.20 &rarr; POLA HEPATOSELULER (R &ge; 5.0)</p>' +
      '<p class="mt-1">Pola cedera hepatoseluler sesuai intoksikasi parasetamol, hepatitis virus akut, atau DILI isoniazid. Klik preset di atas untuk melihat pola kolestatik (amoksisilin-klavulanat) atau kriteria King\'s College ALF.</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// W10. SIMULATOR 5 FASE HEPATITIS B KRONIK (EASL/PPHI) & AMBANG TERAPI (geh-3-2)
// rAF Key: gehHbv (Fase 1 -> 5)
// =========================================================================
var GEH_HBV_DATA = {
  1: {
    phase: 1,
    name: "Fase 1: Infeksi Kronik HBeAg-Positif",
    subname: "Dulu: Imunotoleran (Immune Tolerant)",
    hbsag: "Positif Tinggi",
    hbeag: "Positif (+)",
    dna: "Sangat Tinggi (>10^7 IU/mL)",
    alt: "Normal Persisten (<ULN)",
    fibrosis: "Minimal / Tidak Ada",
    action: "OBSERVASI & MONITORING (ALT tiap 3–6 Bulan)",
    tone: "info"
  },
  2: {
    phase: 2,
    name: "Fase 2: Hepatitis B Kronik HBeAg-Positif",
    subname: "Imunoaktif / Immune Clearance",
    hbsag: "Positif",
    hbeag: "Positif (+)",
    dna: "Tinggi (>10^4–10^7 IU/mL)",
    alt: "Meningkat Fluktuatif (>ULN)",
    fibrosis: "Nekroinflamasi Sedang-Berat",
    action: "TERAPI ANTIVIRAL MUTLAK (TDF/TAF/ETV)",
    tone: "danger"
  },
  3: {
    phase: 3,
    name: "Fase 3: Infeksi Kronik HBeAg-Negatif",
    subname: "Dulu: Inactive Carrier / Imunokontrol",
    hbsag: "Positif Rendah",
    hbeag: "Negatif (-) / Anti-HBe (+)",
    dna: "Rendah (<2.000 IU/mL / Tak Terdeteksi)",
    alt: "Normal Persisten (<ULN)",
    fibrosis: "Fibrosis Minimal / Regresi",
    action: "OBSERVASI (Monitor ALT & USG Tiap 6–12 Bulan)",
    tone: "info"
  },
  4: {
    phase: 4,
    name: "Fase 4: Hepatitis B Kronik HBeAg-Negatif",
    subname: "Reaktivasi / Mutasi Precore (G1896A) & BCP",
    hbsag: "Positif Fluktuatif",
    hbeag: "Negatif (-) / Anti-HBe (+)",
    dna: "Tinggi (>2.000 IU/mL)",
    alt: "Meningkat / Berfluktuasi (>ULN)",
    fibrosis: "Fibrosis Progresif / Sirosis Cepat",
    action: "ANTIVIRAL JANGKA PANJANG (TDF/TAF/ETV)",
    tone: "danger"
  },
  5: {
    phase: 5,
    name: "Fase 5: Fase HBsAg-Negatif",
    subname: "Occult HBV / 'Sembuh Fungsional'",
    hbsag: "Negatif (-) / Anti-HBc (+)",
    hbeag: "Negatif (-)",
    dna: "Darah Negatif (cccDNA Dorman di Hepar)",
    alt: "Normal",
    fibrosis: "Risiko Rendah KSH",
    action: "PROFILAKSIS ANTIVIRAL BILA IMUNOSUPRESI / RITUXIMAB!",
    tone: "info"
  }
};

function buildGehHbvPhasesSvg(phaseNum, antiviralKey) {
  var p = GEH_HBV_DATA[phaseNum] || GEH_HBV_DATA[2];

  var dnaHeight = phaseNum === 1 ? 75 : (phaseNum === 2 ? 60 : (phaseNum === 3 ? 12 : (phaseNum === 4 ? 48 : 4)));
  var altHeight = (phaseNum === 2 || phaseNum === 4) ? 68 : 16;
  var altColor = (phaseNum === 2 || phaseNum === 4) ? "var(--accent-coral)" : "var(--accent-primary)";

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator 5 Fase HBV Kronik">' +
    // Left Serology Dynamics Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SEROLOGI & DNA VIRUS FASE ' + p.phase + '</text>' +

    // HBV DNA Bar
    '<rect x="36" y="' + (155 - dnaHeight) + '" width="40" height="' + dnaHeight + '" rx="8" fill="var(--accent-primary)" opacity="0.8" />' +
    '<text x="38" y="170" font-size="7.5" font-weight="800" fill="var(--text-primary)">HBV DNA</text>' +
    '<text x="38" y="180" font-size="7" font-weight="600" fill="var(--accent-primary)">' + (phaseNum === 1 ? "&gt;10^7" : (phaseNum === 2 ? "&gt;10^4" : (phaseNum === 3 ? "&lt;2k" : (phaseNum === 4 ? "&gt;2k" : "Neg")))) + '</text>' +

    // ALT Bar
    '<rect x="96" y="' + (155 - altHeight) + '" width="40" height="' + altHeight + '" rx="8" fill="' + altColor + '" opacity="0.8" />' +
    '<text x="98" y="170" font-size="7.5" font-weight="800" fill="var(--text-primary)">ALT</text>' +
    '<text x="98" y="180" font-size="7" font-weight="600" fill="' + altColor + '">' + (altHeight > 30 ? "&gt;ULN &uarr;" : "Normal") + '</text>' +

    // HBeAg Badge
    '<rect x="156" y="85" width="58" height="30" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="185" y="98" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">HBeAg</text>' +
    '<text x="185" y="110" text-anchor="middle" font-size="8.5" font-weight="800" fill="' + (p.hbeag.indexOf("Positif") === 0 ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + (p.hbeag.indexOf("Positif") === 0 ? "POSITIF" : "NEGATIF") + '</text>' +

    // HBsAg Status text
    '<text x="32" y="202" font-size="8" font-weight="700" fill="var(--text-muted)">HBsAg: </text>' +
    '<text x="68" y="202" font-size="8.2" font-weight="800" fill="' + (p.hbsag.indexOf("Positif") === 0 ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + p.hbsag + '</text>' +

    // Right Therapy & Guideline Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">FASE EASL / PPHI 2021</text>' +
    '<text x="254" y="44" font-size="8.8" font-weight="800" fill="' + (p.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + p.name + '</text>' +
    '<text x="254" y="58" font-size="7.8" font-weight="600" fill="var(--text-secondary)">' + p.subname + '</text>' +
    '<text x="254" y="70" font-size="7.5" font-weight="600" fill="var(--text-muted)">Fibrosis: ' + p.fibrosis + '</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">INDIKASI TERAPI ANTIVIRAL ORAL</text>' +
    '<text x="254" y="117" font-size="8.8" font-weight="800" fill="' + (p.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + p.action + '</text>' +
    '<text x="254" y="134" font-size="7.5" font-weight="600" fill="var(--text-secondary)">Sirosis Hepatis DNA (+) = Wajib Antiviral Seumur Hidup!</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PILIHAN LINI 1 DENGAN BARIER TINGGI</text>' +
    '<text x="254" y="186" font-size="8" font-weight="700" fill="var(--text-primary)">TDF 300 mg / TAF 25 mg (Usia &gt;60/Ginjal) / ETV 0.5 mg</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Jangan beri Lamivudin (resistensi tinggi &gt;70% dalam 5 th)!</text>' +
  '</svg>';
}

function renderGehHbvPhasesWidget() {
  var phase = clampNum(gehVizState.hbvPhase, 1, 5, 2);
  var phaseIdx = Math.round(phase);
  var p = GEH_HBV_DATA[phaseIdx] || GEH_HBV_DATA[2];

  var controlsBottom = renderCardioSliderBlock({
    key: "gehHbv",
    label: "Simulasi 5 Fase Perjalanan Hepatitis B Kronik (EASL/PPHI):",
    pillText: "Fase " + phaseIdx + ": " + p.name.split(":")[1].split("(")[0].trim(),
    min: 1, max: 5, step: 0.05, value: phase,
    trackBg: "linear-gradient(90deg, rgba(14,165,233,0.35), rgba(239,68,68,0.45), rgba(14,165,233,0.35), rgba(239,68,68,0.45), rgba(14,165,233,0.35))",
    oninput: "window.InternaApp.updateGehHbvPhasesViz(this.value, true)",
    presets: [
      { label: "Fase 1: Toleran", val: 1, active: phaseIdx === 1 },
      { label: "Fase 2: Imunoaktif", val: 2, active: phaseIdx === 2 },
      { label: "Fase 3: Inaktif", val: 3, active: phaseIdx === 3 },
      { label: "Fase 4: Reaktivasi", val: 4, active: phaseIdx === 4 },
      { label: "Fase 5: Sembuh Fungsional", val: 5, active: phaseIdx === 5 }
    ]
  });

  return renderCardioWidgetCard({
    key: "gehHbv",
    title: "Simulator 5 Fase Hepatitis B Kronik (EASL/PPHI) & Ambang Terapi",
    tag: "Hepatitis Virus • KKI 4",
    svgHtml: buildGehHbvPhasesSvg(phaseIdx, gehVizState.hbvAntiviral),
    controlsBottom: controlsBottom,
    info: {
      tone: p.tone,
      rKey: "hbv-" + phaseIdx,
      title: p.name + " (" + p.subname + ")",
      c1Label: "Status Replikasi & Kerusakan Hepatosit",
      c1Body: "HBsAg " + p.hbsag + " | HBeAg " + p.hbeag + " | DNA " + p.dna + " | ALT " + p.alt + ".",
      c2Label: "Indikasi Terapi Antiviral",
      c2Body: p.action
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada <strong>Fase 4 (HBeAg-negatif)</strong>, replikasi virus tetap tinggi (&gt;2.000 IU/mL) disertai kenaikan ALT karena adanya mutasi gen <em>Precore</em> (G1896A) atau <em>Basal Core Promoter</em> (A1762T/G1764A) yang menghentikan sekresi HBeAg! Fase ini WAJIB diterapi antiviral oral jangka panjang karena risiko sirosis dan KSH sangat tinggi.</p>'
  });
}

function updateGehHbvPhasesViz(phaseIn, fromUser) {
  if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
  if (phaseIn !== null && phaseIn !== undefined) gehVizState.hbvPhase = clampNum(phaseIn, 1, 5, 2);

  var phase = gehVizState.hbvPhase;
  var phaseIdx = Math.round(phase);
  var p = GEH_HBV_DATA[phaseIdx] || GEH_HBV_DATA[2];

  syncSliderAndPill("viz-gehHbv-slider", "viz-gehHbv-pill", phase, "Fase " + phaseIdx);
  syncVizPresets("viz-gehHbv-presets", [phaseIdx === 1, phaseIdx === 2, phaseIdx === 3, phaseIdx === 4, phaseIdx === 5]);
  swapVizSvgFrame("viz-gehHbv-frame", buildGehHbvPhasesSvg(phaseIdx, gehVizState.hbvAntiviral));
  updateVizReadout("viz-gehHbv-readout", p.tone, formatVizReadoutHtml(
    p.name + " (" + p.subname + ")",
    "Status Replikasi & Kerusakan Hepatosit",
    "HBsAg " + p.hbsag + " | HBeAg " + p.hbeag + " | DNA " + p.dna + " | ALT " + p.alt + ".",
    "Indikasi Terapi Antiviral",
    p.action,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Mutasi Precore G1896A membuat HBeAg negatif tapi HBV DNA tetap tinggi (Fase 4 -> Wajib Antiviral!).</p>'
  ), "hbv-" + phaseIdx);
}

// =========================================================================
// W11. SIMULATOR DAA HCV PAN-GENOTIPIK, STATUS SIROSIS & SVR12 (geh-3-3)
// =========================================================================
var GEH_HCV_DATA = {
  none: {
    status: "Tanpa Sirosis (Treatment Naive)",
    sofVelDur: "12 Minggu (Tanpa Ribavirin)",
    glePibDur: "8 Minggu (Tanpa Ribavirin)",
    proteaseSafe: true,
    tone: "info",
    svr12: "99% SVR12 Tercapai"
  },
  compensated: {
    status: "Sirosis Terkompensasi (Child-Pugh A)",
    sofVelDur: "12 Minggu (Tanpa Ribavirin)",
    glePibDur: "8 Minggu (AASLD 2023 Update)",
    proteaseSafe: true,
    tone: "info",
    svr12: "97–99% SVR12"
  },
  decompensated: {
    status: "Sirosis Dekompensasi (Child-Pugh B / C)",
    sofVelDur: "12 Minggu + Ribavirin (Atau 24 Mg Tanpa RBV)",
    glePibDur: "KONTRAINDIKASI MUTLAK! (Toksisitas Inhibitor Protease)",
    proteaseSafe: false,
    tone: "danger",
    svr12: "90–94% SVR12"
  },
  ckd: {
    status: "Gagal Ginjal Berat / Dialisis (eGFR <30)",
    sofVelDur: "12 Minggu (Sofosbuvir aman pada eGFR rendah sesuai pedoman terbaru)",
    glePibDur: "8 Minggu (Lini 1 Ideal Ekskresi Bilier/Feses)",
    proteaseSafe: true,
    tone: "warning",
    svr12: "98% SVR12"
  }
};

function buildGehHcvDaaSvg(cirrhosisKey, regimenKey) {
  var d = GEH_HCV_DATA[cirrhosisKey] || GEH_HCV_DATA.compensated;
  var isDecomp = cirrhosisKey === "decompensated";

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Simulator Paduan DAA Pan-genotipik HCV">' +
    // Left target panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">TARGET MOLEKULER DAA HCV</text>' +
    // DAA Target Boxes
    '<rect x="32" y="44" width="186" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="58" font-size="8.5" font-weight="800" fill="var(--accent-primary)">NS5B Polymerase: Sofosbuvir</text>' +
    '<text x="42" y="72" font-size="7.5" font-weight="600" fill="var(--text-muted)">Nukleotida barier resistensi sangat tinggi</text>' +

    '<rect x="32" y="92" width="186" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="106" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">NS5A Complex: Velpatasvir / Pibrentasvir</text>' +
    '<text x="42" y="120" font-size="7.5" font-weight="600" fill="var(--text-muted)">Inhibisi replikasi virus & perakitan partikel</text>' +

    '<rect x="32" y="140" width="186" height="52" rx="11" fill="' + (isDecomp ? "var(--accent-coral)" : "var(--bg-surface)") + '" fill-opacity="' + (isDecomp ? "0.2" : "1") + '" stroke="' + (isDecomp ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isDecomp ? "2" : "1") + '" />' +
    '<text x="42" y="154" font-size="8.5" font-weight="800" fill="' + (isDecomp ? "var(--accent-coral)" : "var(--text-primary)") + '">NS3/4A Protease: Glecaprevir</text>' +
    '<text x="42" y="168" font-size="7.4" font-weight="700" fill="' + (isDecomp ? "var(--accent-coral)" : "var(--text-muted)") + '">' + (isDecomp ? "KONTRAINDIKASI PADA CHILD-PUGH B/C!" : "Dibersihkan via bilier; aman pada CKD") + '</text>' +
    '<text x="42" y="182" font-size="7" font-weight="600" fill="var(--text-muted)">Risiko hepatotoksisitas berat bila sirosis dekompensasi</text>' +

    // Right Regimen & SVR12 panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">STATUS KLINIS PASIEN</text>' +
    '<text x="254" y="45" font-size="9" font-weight="800" fill="' + (d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.status + '</text>' +
    '<text x="254" y="62" font-size="8" font-weight="700" fill="var(--accent-primary)">Tingkat Kesembuhan: ' + d.svr12 + '</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">SOF/VEL (SOFOSBUVIR + VELPATASVIR)</text>' +
    '<text x="254" y="117" font-size="8.5" font-weight="700" fill="var(--text-primary)">' + d.sofVelDur + '</text>' +
    '<text x="254" y="134" font-size="7.4" font-weight="600" fill="var(--text-muted)">Aman pada semua Child-Pugh; hati-hati interaksi PPI!</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">GLE/PIB (GLECAPREVIR + PIBRENTASVIR)</text>' +
    '<text x="254" y="186" font-size="8" font-weight="700" fill="' + (isDecomp ? "var(--accent-coral)" : "var(--text-primary)") + '">' + d.glePibDur + '</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Skrining KSH pasca-SVR tetap wajib bila F3–F4!</text>' +
  '</svg>';
}

function renderGehHcvDaaWidget() {
  var key = GEH_HCV_DATA[gehVizState.hcvCirrhosis] ? gehVizState.hcvCirrhosis : "compensated";
  var d = GEH_HCV_DATA[key];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-hcv-tabs", [
      { key: "none", label: "Tanpa Sirosis", onclick: "window.InternaApp.updateGehHcvDaaViz('none', null, true)" },
      { key: "compensated", label: "Sirosis Child A", onclick: "window.InternaApp.updateGehHcvDaaViz('compensated', null, true)" },
      { key: "decompensated", label: "Dekompensasi Child B/C", onclick: "window.InternaApp.updateGehHcvDaaViz('decompensated', null, true)" },
      { key: "ckd", label: "CKD / Dialisis", onclick: "window.InternaApp.updateGehHcvDaaViz('ckd', null, true)" }
    ], key) +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehHcv",
    title: "Simulator Pemilihan Regimen DAA Pan-genotipik HCV & SVR12",
    tag: "Hepatitis Virus • KKI 4",
    controlsTop: controlsTop,
    svgHtml: buildGehHcvDaaSvg(key, gehVizState.hcvRegimen),
    info: {
      tone: d.tone,
      rKey: "hcv-" + key,
      title: "Status: " + d.status,
      c1Label: "Regimen SOF/VEL vs GLE/PIB",
      c1Body: "SOF/VEL: <strong>" + d.sofVelDur + "</strong> | GLE/PIB: <strong>" + d.glePibDur + "</strong>.",
      c2Label: "Perhatian & Keselamatan",
      c2Body: key === "decompensated"
        ? "<strong>KONTRAINDIKASI MUTLAK:</strong> Obat golongan <em>Protease Inhibitor</em> (Glecaprevir, Grazoprevir, Voxilaprevir) DILARANG pada sirosis dekompensasi karena risiko gagal hati toksik!"
        : "Sebelum memulai DAA, wajib periksa serologi HBsAg & anti-HBc untuk mencegah <em>HBV reactivation</em> pasca klirens HCV."
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Regimen berbasis Protease Inhibitor (seperti Glecaprevir dalam GLE/PIB) adalah <strong>KONTRAINDIKASI MUTLAK pada Sirosis Dekompensasi (Child-Pugh B/C)</strong>! Pilih <strong>Sofosbuvir + Velpatasvir selama 12 minggu ditambah Ribavirin</strong>. Pasca tercapainya SVR12, pasien dengan riwayat sirosis (F4) atau fibrosis lanjut (F3) TETAP WAJIB surveilans KSH USG tiap 6 bulan seumur hidup!</p>'
  });
}

function updateGehHcvDaaViz(cirrhosisIn, regimenIn, fromUser) {
  if (cirrhosisIn && GEH_HCV_DATA[cirrhosisIn]) gehVizState.hcvCirrhosis = cirrhosisIn;
  if (regimenIn) gehVizState.hcvRegimen = regimenIn;

  var key = gehVizState.hcvCirrhosis;
  var d = GEH_HCV_DATA[key];

  syncVizPresets("viz-geh-hcv-tabs", ["none", "compensated", "decompensated", "ckd"].map(function(k) { return k === key; }));
  swapVizSvgFrame("viz-gehHcv-frame", buildGehHcvDaaSvg(key, gehVizState.hcvRegimen));
  updateVizReadout("viz-gehHcv-readout", d.tone, formatVizReadoutHtml(
    "Status: " + d.status,
    "Regimen SOF/VEL vs GLE/PIB",
    "SOF/VEL: <strong>" + d.sofVelDur + "</strong> | GLE/PIB: <strong>" + d.glePibDur + "</strong>.",
    "Perhatian & Keselamatan",
    key === "decompensated" ? "Protease inhibitor KONTRAINDIKASI MUTLAK pada Child B/C!" : "Cek koinfeksi HBV sebelum DAA.",
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Protease inhibitor kontraindikasi pada Child B/C. Surveilans KSH USG tiap 6 bulan tetap wajib jika ada sirosis!</p>'
  ), "hcv-" + key);
}

// =========================================================================
// W12. KALKULATOR TERINTEGRASI FIB-4 (MASLD) & MADDREY MDF ALKOHOLIK (geh-3-4)
// =========================================================================
function buildGehFib4MaddreySvg(modeKey, fib4Val, mdfVal) {
  var isMaddrey = modeKey === "maddrey";
  var fib = clampNum(fib4Val, 0.2, 15, 2.1);
  var mdf = clampNum(mdfVal, 0, 150, 42);

  var needleFib = 35 + clampNum((fib - 0.5) / 4.0, 0, 1) * 165;
  var colorFib = fib < 1.30 ? "var(--accent-primary)" : (fib > 2.67 ? "var(--accent-coral)" : "var(--accent-secondary)");

  var needleMdf = 254 + clampNum(mdf / 80, 0, 1) * 190;
  var colorMdf = mdf >= 32 ? "var(--accent-coral)" : "var(--accent-primary)";

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Kalkulator FIB-4 & Maddrey">' +
    // Left FIB-4 MASLD Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="' + (!isMaddrey ? "var(--accent-primary)" : "var(--border-subtle)") + '" stroke-width="' + (!isMaddrey ? "2" : "1") + '" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SKOR FIB-4 (FIBROSIS MASLD)</text>' +
    // FIB-4 Bar
    '<rect x="35" y="46" width="175" height="14" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<rect x="35" y="46" width="45" height="14" rx="7" fill="var(--accent-primary)" opacity="0.6" />' +
    '<rect x="80" y="46" width="55" height="14" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="135" y="46" width="75" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    '<circle cx="' + needleFib.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + colorFib + '" stroke-width="2.5" />' +

    '<text x="35" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">&lt;1.30 Rendah</text>' +
    '<text x="107" y="74" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">1.30–2.67</text>' +
    '<text x="210" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">&gt;2.67 Tinggi</text>' +

    '<text x="35" y="98" font-size="11" font-weight="800" fill="' + colorFib + '">FIB-4 = ' + fib.toFixed(2) + '</text>' +
    '<text x="35" y="114" font-size="7.8" font-weight="700" fill="var(--text-primary)">' + (fib < 1.30 ? "F0–F1: Risiko Rendah (NPV >90%)" : (fib > 2.67 ? "F3–F4: Risiko Tinggi Sirosis!" : "Indeterminate (Perlu FibroScan)")) + '</text>' +

    '<rect x="35" y="130" width="175" height="58" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="45" y="146" font-size="8" font-weight="800" fill="var(--accent-primary)">ALUR FASKES PRIMER (EASL)</text>' +
    '<text x="45" y="160" font-size="7.4" font-weight="600" fill="var(--text-secondary)">&bull; &lt;1.30: Pola hidup sehat di FKTP</text>' +
    '<text x="45" y="174" font-size="7.4" font-weight="600" fill="var(--text-secondary)">&bull; &gt;2.67: Rujuk Sp.PD skrining varises</text>' +

    // Right Maddrey Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="198" rx="8" fill="var(--bg-surface)" stroke="' + (isMaddrey ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isMaddrey ? "2" : "1") + '" />' +
    '<text x="254" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">MADDREY mDF (HEPATITIS ALKOHOLIK)</text>' +
    // Maddrey Bar
    '<rect x="254" y="46" width="190" height="14" rx="7" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="254" y="46" width="80" height="14" rx="7" fill="var(--accent-primary)" opacity="0.6" />' +
    '<rect x="334" y="46" width="110" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    '<circle cx="' + needleMdf.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + colorMdf + '" stroke-width="2.5" />' +

    '<text x="254" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">&lt;32 Mild/Mod</text>' +
    '<text x="444" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">&ge;32 SEVERE (Steroid!)</text>' +

    '<text x="254" y="98" font-size="11" font-weight="800" fill="' + colorMdf + '">mDF = ' + mdf.toFixed(1) + '</text>' +
    '<text x="254" y="114" font-size="8.2" font-weight="700" fill="' + colorMdf + '">' + (mdf >= 32 ? "SEVERE: Prednisolon 40 mg/Hari x 28H" : "Mild/Mod: Terapi Suportif & Stop Alkohol") + '</text>' +

    '<rect x="254" y="130" width="190" height="68" rx="11" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="264" y="146" font-size="8" font-weight="800" fill="var(--accent-coral)">RESPONS STEROID (SKOR LILLE H-7)</text>' +
    '<text x="264" y="160" font-size="7.4" font-weight="600" fill="var(--text-primary)">Evaluasi pada hari ke-7 terapi steroid</text>' +
    '<text x="264" y="174" font-size="7.4" font-weight="700" fill="var(--accent-coral)">Lille &gt;0.45: HENTIKAN STEROID!</text>' +
    '<text x="264" y="188" font-size="7.2" font-weight="600" fill="var(--text-muted)">Non-responder: steroid berisiko infeksi fatal.</text>' +
  '</svg>';
}

function calcGehFib4Maddrey(presetKey) {
  var ageEl = document.getElementById("geh-fib-age");
  var astEl = document.getElementById("geh-fib-ast");
  var altEl = document.getElementById("geh-fib-alt");
  var pltEl = document.getElementById("geh-fib-plt");
  var ptPtEl = document.getElementById("geh-mdf-pt-pt");
  var ptCtrlEl = document.getElementById("geh-mdf-pt-ctrl");
  var biliEl = document.getElementById("geh-mdf-bili");

  var PRESETS = {
    masld_low: { age: 45, ast: 28, alt: 36, plt: 240, ptPt: 13, ptCtrl: 12, bili: 1.1 },
    masld_high: { age: 58, ast: 95, alt: 62, plt: 110, ptPt: 16, ptCtrl: 12, bili: 2.4 },
    maddrey_mild: { age: 48, ast: 160, alt: 72, plt: 180, ptPt: 16, ptCtrl: 12, bili: 5.5 },
    maddrey_severe: { age: 52, ast: 240, alt: 95, plt: 130, ptPt: 24, ptCtrl: 12, bili: 18.2 }
  };

  if (presetKey && PRESETS[presetKey]) {
    gehVizState.fib4MaddreyMode = (presetKey.indexOf("masld") === 0) ? "fib4" : "maddrey";
    var pr = PRESETS[presetKey];
    if (ageEl) ageEl.value = pr.age;
    if (astEl) astEl.value = pr.ast;
    if (altEl) altEl.value = pr.alt;
    if (pltEl) pltEl.value = pr.plt;
    if (ptPtEl) ptPtEl.value = pr.ptPt;
    if (ptCtrlEl) ptCtrlEl.value = pr.ptCtrl;
    if (biliEl) biliEl.value = pr.bili;
  }
  syncVizPresets("viz-geh-fib4-presets", Object.keys(PRESETS).map(function(k) { return k === presetKey; }));

  var age = clampNum(ageEl ? ageEl.value : 52, 18, 90, 52);
  var ast = clampNum(astEl ? astEl.value : 78, 10, 800, 78);
  var alt = clampNum(altEl ? altEl.value : 64, 10, 800, 64);
  var plt = clampNum(pltEl ? pltEl.value : 145, 10, 800, 145);
  var ptPt = clampNum(ptPtEl ? ptPtEl.value : 24, 9, 80, 24);
  var ptCtrl = clampNum(ptCtrlEl ? ptCtrlEl.value : 12, 9, 20, 12);
  var bili = clampNum(biliEl ? biliEl.value : 14.5, 0.2, 50, 14.5);

  var fib4 = (age * ast) / (plt * Math.sqrt(alt));
  var mdf = 4.6 * (ptPt - ptCtrl) + bili;
  var isMaddreyMode = gehVizState.fib4MaddreyMode === "maddrey";

  swapVizSvgFrame("viz-gehFib4-frame", buildGehFib4MaddreySvg(gehVizState.fib4MaddreyMode, fib4, mdf));

  if (!isMaddreyMode) {
    var fibTone = fib4 < 1.30 ? "info" : (fib4 > 2.67 ? "danger" : "warning");
    var resFib = document.getElementById("widget-geh-fib4-result");
    if (!resFib) return;
    updateCalcReadoutTone(
      resFib,
      fibTone,
      "fib4-" + fib4.toFixed(2),
      '<p class="font-bold text-[var(--text-primary)]">FIB-4 Score = ' + fib4.toFixed(2) + ' &rarr; ' + (fib4 < 1.30 ? "F0–F1 (Risiko Rendah Fibrosis Lanjut)" : (fib4 > 2.67 ? "F3–F4 (Risiko Tinggi Fibrosis Lanjut / Sirosis)" : "Zona Abu-abu (Indeterminate)")) + '</p>' +
      '<div class="viz-readout-grid mt-1">' +
        '<p>&bull; <strong>Formula FIB-4:</strong> (Usia ' + age + ' &times; AST ' + ast + ') / (Plt ' + plt + ' &times; &radic;ALT ' + alt + ') = <strong>' + fib4.toFixed(2) + '</strong>.</p>' +
        '<p>&bull; <strong>Rekomendasi EASL/AASLD:</strong> ' + (fib4 < 1.30 ? "Manajemen gaya hidup di Faskes Primer; evaluasi ulang 2–3 tahun." : (fib4 > 2.67 ? "Wajib rujuk Sp.PD/Gastroenterologi untuk skrining varises & KSH!" : "Periksa second-line: Transient Elastography (FibroScan / VCTE).")) + '</p>' +
      '</div>'
    );
  } else {
    var mdfTone = mdf >= 32 ? "danger" : "info";
    var resMdf = document.getElementById("widget-geh-fib4-result");
    if (!resMdf) return;
    updateCalcReadoutTone(
      resMdf,
      mdfTone,
      "mdf-" + mdf.toFixed(1),
      '<p class="font-bold text-[var(--text-primary)]">Maddrey Discriminant Function (mDF) = ' + mdf.toFixed(1) + ' &rarr; ' + (mdf >= 32 ? "HEPATITIS ALKOHOLIK BERAT (SEVERE)" : "HEPATITIS ALKOHOLIK RINGAN–SEDANG") + '</p>' +
      '<div class="viz-readout-grid mt-1">' +
        '<p>&bull; <strong>Formula mDF:</strong> 4.6 &times; (PT ' + ptPt + ' - Kontrol ' + ptCtrl + ') + Bili ' + bili + ' = <strong>' + mdf.toFixed(1) + '</strong>.</p>' +
        '<p>&bull; <strong>Panduan Terapi:</strong> ' + (mdf >= 32 ? "<strong>INDIKASI PREDNISOLON 40 mg/hari</strong> x 28 hari (atau Metilprednisolon 32 mg IV). Evaluasi respons pada hari ke-7 menggunakan <strong>Skor Lille</strong> (stop steroid bila Lille &gt;0.45)!" : "Terapi suportif nutrisi & stop total konsumsi alkohol. Tidak ada indikasi kortikosteroid.") + '</p>' +
      '</div>'
    );
  }
}

function renderGehFib4MaddreyWidget() {
  var presetButtons = [
    { key: "masld_low", label: "FIB-4 Rendah (<1.30)" },
    { key: "masld_high", label: "FIB-4 Tinggi (>2.67)" },
    { key: "maddrey_mild", label: "Maddrey <32 (Ringan)" },
    { key: "maddrey_severe", label: "Maddrey >=32 (Steroid!)" }
  ];

  return '<div class="viz-widget" id="viz-calc-geh-fib4-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator Terintegrasi Skor FIB-4 (MASLD) & Maddrey mDF (Alkoholik)</span>' +
      '<span class="viz-tag">Hepatologi Klinis • KKI 4 / 3B</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-geh-fib4-presets">' +
      presetButtons.map(function(b) {
        return '<button type="button" class="viz-pill-btn ' + (gehVizState.fib4MaddreyMode === (b.key.indexOf("masld") === 0 ? "fib4" : "maddrey") ? "active" : "") + '" onclick="window.InternaApp.calcGehFib4Maddrey(\'' + b.key + '\')">' + b.label + '</button>';
      }).join("") +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-fib-age">Usia (Tahun)</label><input type="number" id="geh-fib-age" value="52" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-fib-ast">AST (SGOT)</label><input type="number" id="geh-fib-ast" value="78" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-fib-alt">ALT (SGPT)</label><input type="number" id="geh-fib-alt" value="64" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-fib-plt">Trombosit (10^9/L)</label><input type="number" id="geh-fib-plt" value="145" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-mdf-pt-pt">PT Pasien (Detik)</label><input type="number" id="geh-mdf-pt-pt" step="0.5" value="24" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-mdf-pt-ctrl">PT Kontrol (Detik)</label><input type="number" id="geh-mdf-pt-ctrl" step="0.5" value="12" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-mdf-bili">Total Bilirubin (mg/dL)</label><input type="number" id="geh-mdf-bili" step="0.5" value="14.5" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehFib4Maddrey()" /></div>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-gehFib4-frame">' +
      buildGehFib4MaddreySvg("maddrey", 2.1, 69.7) +
    '</div>' +
    '<div id="widget-geh-fib4-result" class="viz-readout" data-tone="danger" data-last-key="fib-init">' +
      '<p class="font-bold text-[var(--text-primary)]">Maddrey mDF = 69.7 &rarr; SEVERE ALCOHOLIC HEPATITIS (mDF &ge; 32)</p>' +
      '<p class="mt-1">Mortalitas 30 hari mencapai 30–50%. <strong>Indikasi Prednisolon oral 40 mg/hari x 28 hari</strong>. Evaluasi skor Lille hari ke-7 untuk memutuskan kelanjutan steroid!</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// W13. SIMULATOR DIAGNOSTIK CAIRAN ASITES (SAAG), PROTOKOL SBP & ALBUMIN (geh-4-1)
// =========================================================================
function buildGehAscitesSaagSvg(salbVal, aalbVal, aprotVal, pmnVal, lvpVal) {
  var salb = clampNum(salbVal, 1.0, 6.0, 3.2);
  var aalb = clampNum(aalbVal, 0.1, 5.5, 1.1);
  var aprot = clampNum(aprotVal, 0.2, 8.0, 1.8);
  var pmn = clampNum(pmnVal, 0, 5000, 80);
  var lvp = clampNum(lvpVal, 0, 15, 6.0);

  var saag = salb - aalb;
  var isHighSaag = saag >= 1.1;
  var isHighProt = aprot >= 2.5;
  var isSbp = pmn >= 250;

  var qColor = isHighSaag ? (isHighProt ? "var(--accent-primary)" : "var(--accent-secondary)") : (isHighProt ? "var(--accent-coral)" : "var(--accent-primary)");

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Simulator Diagnostik Asites SAAG & SBP">' +
    // Left 2x2 Matrix Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">MATRIKS SAAG & PROTEIN ASITES</text>' +

    // 4 Quadrant boxes
    '<rect x="35" y="46" width="85" height="48" rx="10" fill="' + (isHighSaag && !isHighProt ? "var(--accent-secondary)" : "var(--bg-surface)") + '" fill-opacity="' + (isHighSaag && !isHighProt ? "0.3" : "1") + '" stroke="' + (isHighSaag && !isHighProt ? "var(--accent-secondary)" : "var(--border-subtle)") + '" stroke-width="' + (isHighSaag && !isHighProt ? "2" : "1") + '" />' +
    '<text x="42" y="60" font-size="7.5" font-weight="800" fill="var(--text-primary)">SIROSIS HEPATIS</text>' +
    '<text x="42" y="72" font-size="6.8" font-weight="600" fill="var(--text-muted)">SAAG &ge;1.1 | Prot &lt;2.5</text>' +

    '<rect x="125" y="46" width="85" height="48" rx="10" fill="' + (isHighSaag && isHighProt ? "var(--accent-primary)" : "var(--bg-surface)") + '" fill-opacity="' + (isHighSaag && isHighProt ? "0.3" : "1") + '" stroke="' + (isHighSaag && isHighProt ? "var(--accent-primary)" : "var(--border-subtle)") + '" stroke-width="' + (isHighSaag && isHighProt ? "2" : "1") + '" />' +
    '<text x="132" y="60" font-size="7.5" font-weight="800" fill="var(--text-primary)">GAGAL JANTUNG</text>' +
    '<text x="132" y="72" font-size="6.8" font-weight="600" fill="var(--text-muted)">SAAG &ge;1.1 | Prot &ge;2.5</text>' +

    '<rect x="35" y="100" width="85" height="48" rx="10" fill="' + (!isHighSaag && !isHighProt ? "var(--accent-primary)" : "var(--bg-surface)") + '" fill-opacity="' + (!isHighSaag && !isHighProt ? "0.3" : "1") + '" stroke="' + (!isHighSaag && !isHighProt ? "var(--accent-primary)" : "var(--border-subtle)") + '" stroke-width="' + (!isHighSaag && !isHighProt ? "2" : "1") + '" />' +
    '<text x="42" y="114" font-size="7.5" font-weight="800" fill="var(--text-primary)">SINDROM NEFROTIK</text>' +
    '<text x="42" y="126" font-size="6.8" font-weight="600" fill="var(--text-muted)">SAAG &lt;1.1 | Prot &lt;2.5</text>' +

    '<rect x="125" y="100" width="85" height="48" rx="10" fill="' + (!isHighSaag && isHighProt ? "var(--accent-coral)" : "var(--bg-surface)") + '" fill-opacity="' + (!isHighSaag && isHighProt ? "0.3" : "1") + '" stroke="' + (!isHighSaag && isHighProt ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (!isHighSaag && isHighProt ? "2" : "1") + '" />' +
    '<text x="132" y="114" font-size="7.5" font-weight="800" fill="var(--accent-coral)">TB / KARSINOMA</text>' +
    '<text x="132" y="126" font-size="6.8" font-weight="600" fill="var(--text-muted)">SAAG &lt;1.1 | Prot &ge;2.5</text>' +

    '<text x="35" y="170" font-size="11" font-weight="800" fill="' + qColor + '">SAAG: ' + saag.toFixed(2) + ' g/dL</text>' +
    '<text x="35" y="186" font-size="8" font-weight="700" fill="var(--text-primary)">Prot Asites: ' + aprot.toFixed(1) + ' g/dL</text>' +
    '<text x="35" y="200" font-size="7.4" font-weight="600" fill="var(--text-muted)">' + (isHighSaag ? "Hipertensi Porta Positif (Starling)" : "Tekanan Portal Normal") + '</text>' +

    // Right SBP & Albumin Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="' + (isSbp ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isSbp ? "2" : "1") + '" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">SPONTANEOUS BACTERIAL PERITONITIS</text>' +
    '<text x="254" y="45" font-size="11" font-weight="800" fill="' + (isSbp ? "var(--accent-coral)" : "var(--accent-primary)") + '">PMN: ' + pmn + ' sel/mm3 (' + (isSbp ? "SBP AKTIF >=250" : "Normal <250") + ')</text>' +
    '<text x="254" y="62" font-size="7.6" font-weight="600" fill="var(--text-secondary)">' + (isSbp ? "Seftriakson 2g IV + Albumin H1 1.5g/kg & H3 1g/kg" : "Tidak ada indikasi antibiotik SBP") + '</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">PARASENTESIS EVAKUASI LUAS (LVP)</text>' +
    '<text x="254" y="117" font-size="9" font-weight="700" fill="var(--accent-secondary)">Volume LVP: ' + lvp.toFixed(1) + ' Liter Asites</text>' +
    '<text x="254" y="134" font-size="7.8" font-weight="700" fill="' + (lvp > 5 ? "var(--accent-coral)" : "var(--text-primary)") + '">' + (lvp > 5 ? "Substitusi Albumin: " + (lvp * 8).toFixed(0) + " g (" + (lvp * 40).toFixed(0) + " mL 20%)" : "LVP &le;5L: Tidak wajib albumin rutin") + '</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PENCEGAHAN PPCD & HRS</text>' +
    '<text x="254" y="186" font-size="8.2" font-weight="700" fill="var(--text-primary)">Albumin Mencegah Post-Paracentesis Dysfunction</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Penurunan risiko Sindrom Hepatorenal hingga 60%!</text>' +
  '</svg>';
}

function calcGehAscitesSaag(presetKey) {
  var sAlbEl = document.getElementById("geh-saag-salb");
  var aAlbEl = document.getElementById("geh-saag-aalb");
  var aProtEl = document.getElementById("geh-saag-aprot");
  var pmnEl = document.getElementById("geh-saag-pmn");
  var lvpEl = document.getElementById("geh-saag-lvp");

  var PRESETS = {
    cirrhosis_portal: { salb: 3.2, aalb: 1.1, aprot: 1.8, pmn: 80, lvp: 6.0 },
    cardiac_ascites: { salb: 3.6, aalb: 1.8, aprot: 3.4, pmn: 60, lvp: 3.0 },
    peritoneal_tb: { salb: 3.4, aalb: 2.8, aprot: 4.2, pmn: 140, lvp: 2.5 },
    sbp_active: { salb: 2.9, aalb: 0.9, aprot: 1.4, pmn: 560, lvp: 0.0 }
  };

  if (presetKey && PRESETS[presetKey]) {
    gehVizState.ascitesPreset = presetKey;
    var pr = PRESETS[presetKey];
    if (sAlbEl) sAlbEl.value = pr.salb;
    if (aAlbEl) aAlbEl.value = pr.aalb;
    if (aProtEl) aProtEl.value = pr.aprot;
    if (pmnEl) pmnEl.value = pr.pmn;
    if (lvpEl) lvpEl.value = pr.lvp;
  }
  syncVizPresets("viz-geh-ascites-presets", Object.keys(PRESETS).map(function(k) { return k === gehVizState.ascitesPreset; }));

  var salb = clampNum(sAlbEl ? sAlbEl.value : 3.2, 1.0, 6.0, 3.2);
  var aalb = clampNum(aAlbEl ? aAlbEl.value : 1.1, 0.1, 5.5, 1.1);
  var aprot = clampNum(aProtEl ? aProtEl.value : 1.8, 0.2, 8.0, 1.8);
  var pmn = clampNum(pmnEl ? pmnEl.value : 80, 0, 5000, 80);
  var lvp = clampNum(lvpEl ? lvpEl.value : 6.0, 0, 15, 6.0);

  var saag = salb - aalb;
  var isHighSaag = saag >= 1.1;
  var isHighProt = aprot >= 2.5;
  var isSbp = pmn >= 250;

  var diagLabel = "";
  var tone = "info";

  if (isHighSaag) {
    if (!isHighProt) {
      diagLabel = "HIPERTENSI PORTA SINUSOIDAL (Sirosis Hepatis)";
      tone = "warning";
    } else {
      diagLabel = "HIPERTENSI PORTA POST-SINUSOIDAL (Gagal Jantung / Budd-Chiari)";
      tone = "info";
    }
  } else {
    if (isHighProt) {
      diagLabel = "NON-PORTAL HYPERTENSION (TB Peritoneal / Karsinomatosis)";
      tone = "danger";
    } else {
      diagLabel = "SINDROM NEFROTIK (Hipoalbuminemia Berat)";
      tone = "info";
    }
  }

  if (isSbp) {
    diagLabel += " + SBP AKTIF (PMN &ge;250)";
    tone = "danger";
  }

  swapVizSvgFrame("viz-gehAscites-frame", buildGehAscitesSaagSvg(salb, aalb, aprot, pmn, lvp));
  var res = document.getElementById("widget-geh-ascites-result");
  if (!res) return;

  var sbpDosingHtml = isSbp
    ? '<span class="text-[var(--accent-coral)] font-bold">SEFTRIAKSON 2g IV/24j + ALBUMIN IV: 1.5 g/kg Hari-1 & 1.0 g/kg Hari-3</span> (Cegah Sindrom Hepatorenal!)'
    : 'Bukan SBP (PMN &lt;250 sel/mm3).';

  var lvpDosingHtml = lvp > 5.0
    ? '<strong>LVP &gt;5L (' + lvp + 'L):</strong> Wajib infus Albumin 20/25% sebanyak <strong>' + (lvp * 8).toFixed(0) + ' gram (' + (lvp * 40).toFixed(0) + ' mL Albumin 20%)</strong> untuk mencegah PPCD!'
    : 'LVP &le;5 Liter: Tidak wajib infus albumin rutin (cukup monitor hemodinamik).';

  updateCalcReadoutTone(
    res,
    tone,
    "saag-" + saag.toFixed(2) + "-" + isSbp + "-" + lvp,
    '<p class="font-bold text-[var(--text-primary)]">' + diagLabel + '</p>' +
    '<div class="viz-readout-grid mt-1">' +
      '<p>&bull; <strong>Analisis Gradien SAAG:</strong> Alb Serum (' + salb + ') - Alb Asites (' + aalb + ') = <strong>' + saag.toFixed(2) + ' g/dL</strong> (' + (isHighSaag ? "Gradien Tinggi &ge;1.1: Hipertensi Porta" : "Gradien Rendah &lt;1.1: Kausa Peritoneal") + '). Protein Asites: <strong>' + aprot + ' g/dL</strong>.</p>' +
      '<p>&bull; <strong>Protokol SBP &amp; Albumin:</strong> PMN = <strong>' + pmn + ' sel/mm3</strong> &rarr; ' + sbpDosingHtml + '</p>' +
    '</div>' +
    '<p class="mt-1">&bull; <strong>Parasentesis Evakuasi Luas:</strong> ' + lvpDosingHtml + '</p>'
  );
}

function renderGehAscitesSaagWidget() {
  var presetButtons = [
    { key: "cirrhosis_portal", label: "Sirosis (SAAG>=1.1, Prot<2.5)" },
    { key: "cardiac_ascites", label: "Gagal Jantung (Prot>=2.5)" },
    { key: "peritoneal_tb", label: "TB Peritoneal (SAAG<1.1)" },
    { key: "sbp_active", label: "SBP Akut (PMN>=250)" }
  ];

  return '<div class="viz-widget" id="viz-calc-geh-saag-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Simulator Diagnostik Cairan Asites (SAAG >=1.1), SBP & Dosis Albumin</span>' +
      '<span class="viz-tag">Komplikasi Sirosis • KKI 4</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-geh-ascites-presets">' +
      presetButtons.map(function(b) {
        return '<button type="button" class="viz-pill-btn ' + (gehVizState.ascitesPreset === b.key ? "active" : "") + '" onclick="window.InternaApp.calcGehAscitesSaag(\'' + b.key + '\')">' + b.label + '</button>';
      }).join("") +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-saag-salb">Alb Serum</label><input type="number" id="geh-saag-salb" step="0.1" value="3.2" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehAscitesSaag()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-saag-aalb">Alb Asites</label><input type="number" id="geh-saag-aalb" step="0.1" value="1.1" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehAscitesSaag()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-saag-aprot">Prot Asites</label><input type="number" id="geh-saag-aprot" step="0.1" value="1.8" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehAscitesSaag()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-saag-pmn">PMN (/mm3)</label><input type="number" id="geh-saag-pmn" step="10" value="80" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehAscitesSaag()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-saag-lvp">Volume LVP (L)</label><input type="number" id="geh-saag-lvp" step="0.5" value="6.0" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehAscitesSaag()" /></div>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-gehAscites-frame">' +
      buildGehAscitesSaagSvg(3.2, 1.1, 1.8, 80, 6.0) +
    '</div>' +
    '<div id="widget-geh-ascites-result" class="viz-readout" data-tone="warning" data-last-key="saag-init">' +
      '<p class="font-bold text-[var(--text-primary)]">HIPERTENSI PORTA SINUSOIDAL (Sirosis Hepatis) — SAAG 2.10 g/dL</p>' +
      '<p class="mt-1">SAAG &ge;1.1 g/dL membuktikan adanya hipertensi porta. Karena protein asites &lt;2.5 g/dL, etiologi adalah sirosis hepatis. LVP 6L memerlukan penggantian 48g albumin human untuk mencegah disfungsi sirkulasi pasca-parasentesis (PPCD).</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// W14. SIMULATOR ENSEFALOPATI WEST HAVEN, PENCETUS & LAKTULOSA (geh-4-2)
// rAF Key: gehHe (West Haven 0 -> 4)
// =========================================================================
var GEH_HE_DATA = {
  0: {
    stage: 0,
    name: "Derajat 0 (Minimal / Covert HE)",
    gcs: "GCS 15 (Kompos Mentis Penuh)",
    asterixis: "Negatif (-)",
    eeg: "Irama Alfa Normal (8–13 Hz)",
    features: "Pemeriksaan neurologis standar normal, namun tes psikometri / CRT / Stroop terganggu.",
    tone: "info"
  },
  1: {
    stage: 1,
    name: "Derajat I (Inversi Tidur & Euforia)",
    gcs: "GCS 14–15 (Alert / Ringan)",
    asterixis: "Minimal / Sukar Dibangkitkan",
    eeg: "Irama Gelombang Alfa Melambat",
    features: "Gangguan pola tidur (mengantuk siang hari, terjaga malam), euforia / cemas, rentang atensi memendek.",
    tone: "warning"
  },
  2: {
    stage: 2,
    name: "Derajat II (Letargi & Asteriksis)",
    gcs: "GCS 12–14 (Letargis)",
    asterixis: "POSITIF NYATA (Flapping Tremor)",
    eeg: "Gelombang Trifasik Khas Muncul",
    features: "Disorientasi waktu, perilaku tidak pantas, letargi nyata, asteriksis jelas saat dorsofleksi tangan.",
    tone: "danger"
  },
  3: {
    stage: 3,
    name: "Derajat III (Somnolen / Stupor)",
    gcs: "GCS 8–11 (Stupor / Bicara Inkoheren)",
    asterixis: "Positif jika Pasien Mampu Kooperatif",
    eeg: "Aktivitas Delta & Theta Lambat",
    features: "Somnolen berat, masih bangun terhadap rangsang suara/nyeri, disorientasi tempat dan waktu berat, hiperrefleksia.",
    tone: "danger"
  },
  4: {
    stage: 4,
    name: "Derajat IV (Koma Hepatikum)",
    gcs: "GCS 3–7 (Koma Tidak Responsif)",
    asterixis: "Negatif (Flaksiditas / Deserebrasi)",
    eeg: "Gelombang Delta Difus / Supresi",
    features: "Koma dalam, tidak merespons rangsang nyeri, refleks patologis bilateral, risiko tinggi edema serebri fatal.",
    tone: "danger"
  }
};

function buildGehHeWesthavenSvg(stageNum, precipitant) {
  var d = GEH_HE_DATA[stageNum] || GEH_HE_DATA[2];

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator Derajat Ensefalopati West Haven">' +
    // Left Brain-Liver-Gut Axis Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">POROS USUS-HEPAR-OTAK (AMONIA)</text>' +

    // Gut Ammonia Generator
    '<rect x="35" y="44" width="180" height="32" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="45" y="58" font-size="8.5" font-weight="800" fill="var(--accent-coral)">Usus: Produksi NH3 Masif</text>' +
    '<text x="45" y="70" font-size="7.5" font-weight="600" fill="var(--text-muted)">Darah SCBA / Konstipasi / Bakteri Urease</text>' +

    // Liver Shunt Bypass
    '<rect x="35" y="82" width="180" height="32" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="45" y="96" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">Hepar: Shunt Porta-Sistemik</text>' +
    '<text x="45" y="108" font-size="7.5" font-weight="600" fill="var(--text-muted)">Gagal Detoksifikasi Siklus Urea</text>' +

    // Brain Astrocytes
    '<rect x="35" y="120" width="180" height="42" rx="11" fill="var(--bg-surface)" stroke="' + (stageNum >= 2 ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (stageNum >= 2 ? "2" : "1") + '" />' +
    '<text x="45" y="134" font-size="8.5" font-weight="800" fill="' + (stageNum >= 2 ? "var(--accent-coral)" : "var(--text-primary)") + '">Otak: Edema Astrosit (Glutamin)</text>' +
    '<text x="45" y="146" font-size="7.5" font-weight="600" fill="var(--text-secondary)">Asteriksis: ' + d.asterixis + '</text>' +
    '<text x="45" y="157" font-size="7" font-weight="600" fill="var(--text-muted)">' + d.eeg + '</text>' +

    '<text x="32" y="185" font-size="8" font-weight="700" fill="var(--text-muted)">Status Klinis: </text>' +
    '<text x="96" y="185" font-size="8.2" font-weight="800" fill="' + (d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.gcs + '</text>' +
    '<text x="32" y="202" font-size="7.5" font-weight="600" fill="var(--text-muted)">' + d.features.substring(0, 48) + '...</text>' +

    // Right Protocol & HEPATICS Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">DERAJAT WEST HAVEN</text>' +
    '<text x="254" y="45" font-size="9.5" font-weight="800" fill="' + (d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.name + '</text>' +
    '<text x="254" y="62" font-size="7.8" font-weight="600" fill="var(--text-secondary)">EEG: ' + d.eeg + '</text>' +
    '<text x="254" y="73" font-size="7.4" font-weight="600" fill="var(--text-muted)">Jangan monitor amonia darah serial!</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">PENCETUS (HEPATICS MNEMONIC)</text>' +
    '<text x="254" y="117" font-size="7.6" font-weight="700" fill="var(--text-primary)">SCBA / Hipokalemia / Infeksi SBP / Konstipasi</text>' +
    '<text x="254" y="134" font-size="7.4" font-weight="600" fill="var(--accent-coral)">Koreksi hipokalemia (mencegah amoniogenesis ginjal!)</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">FARMAKOTERAPI: LAKTULOSA + RIFAXIMIN</text>' +
    '<text x="254" y="186" font-size="8.2" font-weight="700" fill="var(--text-primary)">Laktulosa 20–30 mL q2h (target 2–3x BAB lunak)</text>' +
    '<text x="254" y="202" font-size="7.5" font-weight="600" fill="var(--text-muted)">Rifaximin 550 mg 2x/hari oral sebagai lini 1 tambahan.</text>' +
  '</svg>';
}

function renderGehHeWesthavenWidget() {
  var stage = clampNum(gehVizState.heStage, 0, 4, 2);
  var stageIdx = Math.round(stage);
  var d = GEH_HE_DATA[stageIdx] || GEH_HE_DATA[2];

  var controlsBottom = renderCardioSliderBlock({
    key: "gehHe",
    label: "Titrasi Derajat West Haven Ensefalopati Hepatikum (0–IV):",
    pillText: d.name.split("(")[0].trim(),
    min: 0, max: 4, step: 0.05, value: stage,
    trackBg: "linear-gradient(90deg, rgba(14,165,233,0.35), rgba(245,158,11,0.35), rgba(239,68,68,0.45), var(--accent-coral))",
    oninput: "window.InternaApp.updateGehHeWesthavenViz(this.value, null, true)",
    presets: [
      { label: "Derajat 0: Minimal", val: 0, active: stageIdx === 0 },
      { label: "Derajat I: Tidur", val: 1, active: stageIdx === 1 },
      { label: "Derajat II: Asteriksis", val: 2, active: stageIdx === 2 },
      { label: "Derajat III: Stupor", val: 3, active: stageIdx === 3 },
      { label: "Derajat IV: Koma", val: 4, active: stageIdx === 4 }
    ]
  });

  return renderCardioWidgetCard({
    key: "gehHe",
    title: "Simulator Ensefalopati Hepatikum West Haven & Terapi Laktulosa",
    tag: "Komplikasi Sirosis • KKI 4",
    svgHtml: buildGehHeWesthavenSvg(stageIdx, gehVizState.hePrecipitant),
    controlsBottom: controlsBottom,
    info: {
      tone: d.tone,
      rKey: "he-" + stageIdx,
      title: d.name,
      c1Label: "Temuan Klinis & Neurologis",
      c1Body: d.gcs + " | Asteriksis: <strong>" + d.asterixis + "</strong> | EEG: " + d.eeg + ". " + d.features,
      c2Label: "Tata Laksana Lini 1",
      c2Body: "Titrasi <strong>Laktulosa 20–30 mL tiap 2 jam</strong> hingga BAB, lalu pertahankan 2–3x BAB lunak per hari (<em>ammonia trapping</em> menjadi NH4+ tak terserap). Tambahkan <strong>Rifaximin 550 mg 2x/hari</strong>."
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Kadar <strong>amonia serum serial TIDAK berkorelasi dengan derajat klinis</strong> ensefalopati dan tidak boleh dijadikan patokan keberhasilan terapi (monitoring murni klinis!). Hipokalemia dan alkalosis metabolik mempermudah konversi ion NH4+ menjadi gas bebas NH3 yang menembus sawar darah otak, sehingga <strong>koreksi kalium</strong> adalah langkah emergensi wajib!</p>'
  });
}

function updateGehHeWesthavenViz(stageIn, precipIn, fromUser) {
  if (fromUser && stageIn !== null && stageIn !== undefined) cancelAllVizAnimations();
  if (stageIn !== null && stageIn !== undefined) gehVizState.heStage = clampNum(stageIn, 0, 4, 2);
  if (precipIn) gehVizState.hePrecipitant = precipIn;

  var stage = gehVizState.heStage;
  var stageIdx = Math.round(stage);
  var d = GEH_HE_DATA[stageIdx] || GEH_HE_DATA[2];

  syncSliderAndPill("viz-gehHe-slider", "viz-gehHe-pill", stage, d.name.split("(")[0].trim());
  syncVizPresets("viz-gehHe-presets", [stageIdx === 0, stageIdx === 1, stageIdx === 2, stageIdx === 3, stageIdx === 4]);
  swapVizSvgFrame("viz-gehHe-frame", buildGehHeWesthavenSvg(stageIdx, gehVizState.hePrecipitant));
  updateVizReadout("viz-gehHe-readout", d.tone, formatVizReadoutHtml(
    d.name,
    "Temuan Klinis & Neurologis",
    d.gcs + " | Asteriksis: <strong>" + d.asterixis + "</strong> | " + d.features,
    "Tata Laksana Lini 1",
    "Laktulosa titrasi 2–3x BAB lunak + Rifaximin 550 mg 2x/hari.",
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Jangan periksa amonia serial! Koreksi hipokalemia wajib untuk mencegah translokasi amonia ke SSP.</p>'
  ), "he-" + stageIdx);
}

// =========================================================================
// W15. SIMULATOR DINAMIKA KONTRAS CT KSH (WASH-IN/OUT) & BCLC 2022 (geh-4-3)
// rAF Key: gehHcc (0 -> 100% Kontras)
// =========================================================================
var GEH_BCLC_DATA = {
  bclc_0: {
    stage: "BCLC 0 (Very Early)",
    tumor: "Nodul Soliter <2 cm",
    ps: "ECOG 0",
    cp: "Child-Pugh A",
    rx: "Reseksi Bedah atau Ablasi Termal (RFA / MWA)",
    intent: "Kuratif (Harapan Hidup 5-Thn >70–80%)",
    tone: "info"
  },
  bclc_A: {
    stage: "BCLC A (Early)",
    tumor: "Soliter atau <=3 Nodul (<=3 cm)",
    ps: "ECOG 0",
    cp: "Child-Pugh A–B",
    rx: "Transplantasi (Kriteria Milan) / Reseksi / RFA",
    intent: "Kuratif (5-Thn Survival 60–70%)",
    tone: "info"
  },
  bclc_B: {
    stage: "BCLC B (Intermediate)",
    tumor: "Multinodular Luas, Tanpa Invasi Vaskular",
    ps: "ECOG 0",
    cp: "Child-Pugh Terkompensasi",
    rx: "TACE (Chemoembolization) / TARE (Y-90)",
    intent: "Paliatif / Downstaging (>2.5 Thn)",
    tone: "warning"
  },
  bclc_C: {
    stage: "BCLC C (Advanced)",
    tumor: "Invasi V. Porta / Metastasis Ekstrahepatik",
    ps: "ECOG 1–2",
    cp: "Child-Pugh A–B",
    rx: "Atezolizumab + Bevacizumab / Lenvatinib / Sorafenib",
    intent: "Sistemik Paliatif (19–24 Bulan)",
    tone: "danger"
  },
  bclc_D: {
    stage: "BCLC D (Terminal)",
    tumor: "Dekompensasi Berat (Child-Pugh C)",
    ps: "ECOG 3–4",
    cp: "Child-Pugh C",
    rx: "Best Supportive Care (BSC) / Paliatif",
    intent: "Paliatif Akhir Hayat (<3 Bulan)",
    tone: "danger"
  }
};

function buildGehHccBclcSvg(phasePct, bclcKey) {
  var pct = clampNum(phasePct, 0, 100, 35);
  var b = GEH_BCLC_DATA[bclcKey] || GEH_BCLC_DATA.bclc_A;

  var tumorFill = "#475569";
  var tumorStroke = "#64748b";
  var phaseName = "Pre-Kontras (0%)";

  if (pct < 20) {
    phaseName = "Fase Pre-Kontras";
    tumorFill = "#475569";
    tumorStroke = "#64748b";
  } else if (pct < 55) {
    phaseName = "Fase Arteri: WASH-IN (APHE)";
    tumorFill = "#ef4444";
    tumorStroke = "#f59e0b";
  } else if (pct < 85) {
    phaseName = "Fase Vena Porta: WASH-OUT";
    tumorFill = "#1e293b";
    tumorStroke = "#334155";
  } else {
    phaseName = "Fase Delayed: ENHANCING CAPSULE";
    tumorFill = "#1e293b";
    tumorStroke = "#38bdf8";
  }

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator CT 3-Fase KSH & BCLC 2022">' +
    // Left Dynamic CT Simulation (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="#0f172a" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="#94a3b8">SIMULASI DYNAMIC CT ABDOMEN</text>' +

    // Liver parenchyma cross section
    '<path d="M40,165 C35,75 140,55 195,95 C205,155 160,185 40,165 Z" fill="#334155" stroke="#475569" stroke-width="2" />' +
    '<text x="65" y="95" font-size="8" font-weight="700" fill="#94a3b8">Parenkim Hepar</text>' +

    // Central HCC Tumor Nodule
    '<circle cx="130" cy="125" r="24" fill="' + tumorFill + '" stroke="' + tumorStroke + '" stroke-width="3.5" />' +
    (pct >= 85 ? '<circle cx="130" cy="125" r="27" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3,2" />' : '') +

    // Phase label inside CT
    '<rect x="30" y="180" width="190" height="26" rx="8" fill="#1e293b" opacity="0.9" />' +
    '<text x="125" y="196" text-anchor="middle" font-size="8.2" font-weight="800" fill="' + (pct >= 20 && pct < 55 ? "#ef4444" : (pct >= 55 ? "#38bdf8" : "#f8fafc")) + '">' + phaseName + '</text>' +

    // Right BCLC 2022 Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">STAGING BCLC 2022 UPDATE</text>' +
    '<text x="254" y="45" font-size="9" font-weight="800" fill="' + (b.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + b.stage + '</text>' +
    '<text x="254" y="60" font-size="7.6" font-weight="600" fill="var(--text-secondary)">Karakteristik: ' + b.tumor + '</text>' +
    '<text x="254" y="72" font-size="7.4" font-weight="600" fill="var(--text-muted)">PS: ' + b.ps + ' | ' + b.cp + '</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">ALOKASI TERAPI TERPILIH</text>' +
    '<text x="254" y="117" font-size="8.2" font-weight="700" fill="var(--text-primary)">' + b.rx + '</text>' +
    '<text x="254" y="134" font-size="7.6" font-weight="600" fill="var(--accent-primary)">Tujuan: ' + b.intent + '</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-coral)">KRITERIA NON-INVASIF (LI-RADS 5)</text>' +
    '<text x="254" y="186" font-size="8" font-weight="700" fill="var(--text-primary)">APHE + Wash-out pada Sirosis &ge;1 cm = KSH!</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">HINDARI biopsi rutin (risiko needle tract seeding)!</text>' +
  '</svg>';
}

function renderGehHccBclcWidget() {
  var pct = clampNum(gehVizState.hccPhasePercent, 0, 100, 35);
  var stageKey = GEH_BCLC_DATA[gehVizState.hccBclcStage] ? gehVizState.hccBclcStage : "bclc_A";
  var b = GEH_BCLC_DATA[stageKey];

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-bclc-tabs", Object.keys(GEH_BCLC_DATA).map(function(k) {
      return { key: k, label: k.replace("_", " ").toUpperCase(), onclick: "window.InternaApp.updateGehHccBclcViz(null, '" + k + "', true)" };
    }), stageKey) +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "gehHcc",
    label: "Simulasi Dinamika Fase Kontras CT 4-Fase (Pre -> APHE -> Washout -> Kapsul):",
    pillText: pct + "% Fase",
    min: 0, max: 100, step: 1, value: pct,
    trackBg: "linear-gradient(90deg, #475569, #ef4444 35%, #1e293b 70%, #38bdf8 100%)",
    oninput: "window.InternaApp.updateGehHccBclcViz(this.value, null, true)",
    presets: [
      { label: "Pre-Kontras (0%)", val: 0, active: pct < 20 },
      { label: "Arteri APHE (35%)", val: 35, active: pct >= 20 && pct < 55 },
      { label: "Vena Wash-out (70%)", val: 70, active: pct >= 55 && pct < 85 },
      { label: "Delayed Kapsul (100%)", val: 100, active: pct >= 85 }
    ]
  });

  return renderCardioWidgetCard({
    key: "gehHcc",
    title: "Simulator Dinamika Kontras CT KSH (Wash-in/Wash-out) & BCLC 2022",
    tag: "Onkologi Hepatologi • KKI 3B / 2",
    controlsTop: controlsTop,
    svgHtml: buildGehHccBclcSvg(pct, stageKey),
    controlsBottom: controlsBottom,
    info: {
      tone: b.tone,
      rKey: "hcc-" + stageKey + "-" + pct,
      title: b.stage + " — " + b.tumor,
      c1Label: "Karakteristik Pencitraan Vaskular KSH",
      c1Body: "Kombinasi <strong>Arterial Phase Hyperenhancement (APHE / Wash-in)</strong> diikuti <strong>Portal Venous Wash-out</strong> dan kapsul fibrotik pada sirosis berukuran &ge;1 cm bersifat diagnostik KSH (LI-RADS 5) tanpa perlu biopsi jaringan.",
      c2Label: "Panduan Terapi BCLC 2022",
      c2Body: "Rekomendasi: <strong>" + b.rx + "</strong>. " + b.intent
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada nodul hati &ge;1 cm pada pasien sirosis dengan gambaran APHE + Wash-out khas KSH, <strong>Biopsi Hepar RUTIN DIHINDARI</strong> karena risiko tinggi penyebaran sel kanker di jalur jarum suntik (<em>tumor needle tract seeding</em> ~2–3%)! Lini 1 sistemik BCLC C saat ini adalah <strong>Atezolizumab (anti-PD-L1) + Bevacizumab (anti-VEGF)</strong>, menggeser Sorafenib.</p>'
  });
}

function updateGehHccBclcViz(phaseIn, stageIn, fromUser) {
  if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
  if (phaseIn !== null && phaseIn !== undefined) gehVizState.hccPhasePercent = clampNum(phaseIn, 0, 100, 35);
  if (stageIn && GEH_BCLC_DATA[stageIn]) gehVizState.hccBclcStage = stageIn;

  var pct = gehVizState.hccPhasePercent;
  var pctRounded = Math.round(pct);
  var stageKey = gehVizState.hccBclcStage;
  var b = GEH_BCLC_DATA[stageKey];

  syncSliderAndPill("viz-gehHcc-slider", "viz-gehHcc-pill", pct, pctRounded + "% Fase");
  syncVizPresets("viz-gehHcc-presets", [pct < 20, pct >= 20 && pct < 55, pct >= 55 && pct < 85, pct >= 85]);
  syncVizPresets("viz-geh-bclc-tabs", Object.keys(GEH_BCLC_DATA).map(function(k) { return k === stageKey; }));

  swapVizSvgFrame("viz-gehHcc-frame", buildGehHccBclcSvg(pct, stageKey));
  updateVizReadout("viz-gehHcc-readout", b.tone, formatVizReadoutHtml(
    b.stage + " — " + b.tumor,
    "Karakteristik Pencitraan Vaskular KSH",
    "APHE (Wash-in) & Portal Wash-out diagnostik KSH tanpa biopsi.",
    "Panduan Terapi BCLC 2022",
    "Rekomendasi: <strong>" + b.rx + "</strong>. " + b.intent,
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Hindari biopsi nodul KSH khas (risiko tumor seeding). Lini 1 BCLC C: Atezolizumab + Bevacizumab.</p>'
  ), "hcc-" + stageKey + "-" + pct);
}

// =========================================================================
// W16. SIMULATOR PANKREATITIS ATLANTA & BISAP VS KOLANGITIS TG18 (geh-5-1)
// =========================================================================
function calcBisapScore(bun, mental, sirs, age, effusion) {
  var score = 0;
  if (bun > 25) score += 1;
  if (mental) score += 1;
  if (sirs) score += 1;
  if (age > 60) score += 1;
  if (effusion) score += 1;
  return score;
}

function buildGehPancreatitisTg18Svg(modeKey, bisapScore, tg18Grade) {
  var isPanc = modeKey === "pancreatitis";

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator Pankreatitis vs Kolangitis Akut">' +
    // Left anatomy panel (x=18..234)
    '<rect x="20" y="14" width="210" height="202" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">ANATOMI PANKREATOBILIER</text>' +

    // Gallbladder & Common Bile Duct (CBD)
    '<path d="M70,55 Q50,75 75,85 L95,95 L115,145" fill="none" stroke="var(--accent-primary)" stroke-width="6" />' +
    '<circle cx="65" cy="55" r="14" fill="var(--accent-primary)" opacity="0.3" stroke="var(--accent-primary)" stroke-width="2" />' +
    '<text x="50" y="58" font-size="7.5" font-weight="700" fill="var(--accent-primary)">V. Fellea</text>' +

    // Pancreatic Duct
    '<path d="M115,145 L175,145" fill="none" stroke="var(--accent-secondary)" stroke-width="5" />' +
    '<text x="145" y="138" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">D. Pancreaticus</text>' +

    // Impacted Stone at Ampulla of Vater
    '<circle cx="115" cy="145" r="6" fill="#1c1917" stroke="#fbbf24" stroke-width="2" />' +
    '<text x="115" y="162" text-anchor="middle" font-size="7.5" font-weight="800" fill="#fbbf24">Batu di Ampula Vater</text>' +

    // Pathology highlight
    (isPanc ? '<rect x="35" y="172" width="180" height="34" rx="10" fill="var(--accent-coral)" fill-opacity="0.2" stroke="var(--accent-coral)" stroke-width="1.5" />' +
              '<text x="125" y="186" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">AUTODIGESTI ENZIM PANKREAS</text>' +
              '<text x="125" y="198" text-anchor="middle" font-size="7.4" font-weight="600" fill="var(--text-primary)">Lipase &ge;3x ULN + Nyeri Tembus Punggung</text>' :
              '<rect x="35" y="172" width="180" height="34" rx="10" fill="var(--accent-secondary)" fill-opacity="0.2" stroke="var(--accent-secondary)" stroke-width="1.5" />' +
              '<text x="125" y="186" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">KOLANGITIS BAKTERIAL ASENDEN</text>' +
              '<text x="125" y="198" text-anchor="middle" font-size="7.4" font-weight="600" fill="var(--text-primary)">Duktus Tersumbat -> Tekanan Bilier &uarr;</text>') +

    // Right scoring & guideline panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    (isPanc ? '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">SKOR BISAP PANKREATITIS (0–5)</text>' +
              '<text x="254" y="46" font-size="12" font-weight="800" fill="' + (bisapScore >= 3 ? "var(--accent-coral)" : "var(--accent-primary)") + '">BISAP: ' + bisapScore + ' Poin (' + (bisapScore >= 3 ? "Mortalitas &gt;15%" : "Mortalitas &lt;2%") + ')</text>' +
              '<text x="254" y="62" font-size="7.6" font-weight="600" fill="var(--text-secondary)">BUN &gt;25, Impaired mental, SIRS, Age &gt;60, Pleural</text>' :
              '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">PEDOMAN TOKYO TG18 KOLANGITIS</text>' +
              '<text x="254" y="46" font-size="10.5" font-weight="800" fill="var(--accent-coral)">Trias Charcot vs Pentad Reynolds</text>' +
              '<text x="254" y="62" font-size="7.6" font-weight="600" fill="var(--text-secondary)">Pentad: Charcot + Syok Hipotensi + Penurunan Kesadaran</text>') +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">KLASIFIKASI KEPARAHAN & RESUSITASI</text>' +
    (isPanc ? '<text x="254" y="117" font-size="8.5" font-weight="700" fill="var(--text-primary)">Revised Atlanta: Mild vs Mod vs Severe</text>' +
              '<text x="254" y="132" font-size="7.6" font-weight="600" fill="var(--accent-primary)">Resusitasi Ringer Laktat 200–250 mL/jam awal</text>' :
              '<text x="254" y="117" font-size="8.5" font-weight="700" fill="var(--accent-coral)">Grade III TG18: Disfungsi Organ</text>' +
              '<text x="254" y="132" font-size="7.6" font-weight="600" fill="var(--accent-coral)">INDIKASI DEKOMPRESI BILIER CITO (ERCP)!</text>') +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">PANDUAN TERAPI UTAMA</text>' +
    (isPanc ? '<text x="254" y="186" font-size="8" font-weight="700" fill="var(--text-primary)">Nutrisi Enteral Dini Oral / NGT</text>' +
              '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">JANGAN beri antibiotik profilaksis pada nekrosis steril!</text>' :
              '<text x="254" y="186" font-size="8" font-weight="700" fill="var(--text-primary)">ERCP Sphincterotomy + Stent Bilier</text>' +
              '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Bakteremia gram negatif masif; drainase sebelum terlambat!</text>') +
  '</svg>';
}

function renderGehPancreatitisTg18Widget() {
  var isPanc = gehVizState.pancTgMode !== "cholangitis";
  var bScore = calcBisapScore(
    gehVizState.bisapBun,
    gehVizState.bisapMental,
    gehVizState.bisapSirs,
    gehVizState.bisapAge,
    gehVizState.bisapEffusion
  );

  var controlsTop = '<div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">' +
    renderCardioTabRow("viz-geh-panc-tabs", [
      { key: "pancreatitis", label: "Pankreatitis Akut (Atlanta & BISAP)", onclick: "window.InternaApp.updateGehPancreatitisTg18Viz('pancreatitis', true)" },
      { key: "cholangitis", label: "Kolangitis Akut (Tokyo TG18)", onclick: "window.InternaApp.updateGehPancreatitisTg18Viz('cholangitis', true)" }
    ], isPanc ? "pancreatitis" : "cholangitis") +
  '</div>';

  return renderCardioWidgetCard({
    key: "gehPanc",
    title: "Simulator Pankreatitis Akut (Atlanta & BISAP) vs Kolangitis (TG18)",
    tag: "Pankreatobilier • KKI 4 / 3B",
    controlsTop: controlsTop,
    svgHtml: buildGehPancreatitisTg18Svg(gehVizState.pancTgMode, bScore, gehVizState.tg18Grade),
    info: {
      tone: isPanc ? (bScore >= 3 ? "danger" : "info") : "danger",
      rKey: "panc-" + gehVizState.pancTgMode + "-" + bScore,
      title: isPanc ? "Pankreatitis Akut — Skor BISAP " + bScore + " Poin" : "Kolangitis Akut — Tokyo Guidelines (TG18)",
      c1Label: isPanc ? "Kriteria Atlanta & BISAP" : "Trias Charcot & Pentad Reynolds",
      c1Body: isPanc
        ? "Diagnosis perlu 2 dari 3: nyeri khas tembus punggung, amilase/lipase &ge;3x ULN, CT khas. Skor BISAP &ge;3 menandakan risiko mortalitas tinggi (&gt;15%)."
        : "Trias Charcot (demam, nyeri RUQ, ikterus). Bila bertambah syok hipotensi dan penurunan kesadaran menjadi <strong>Pentad Reynolds</strong> (mortalitas 50%, dekompresi cito!).",
      c2Label: "Prinsip Tata Laksana",
      c2Body: isPanc
        ? "Resusitasi cairan kristaloid <strong>Ringer Laktat 200–250 mL/jam</strong> dengan target Ht &lt;44% dan BUN normal. Mulai nutrisi enteral dini begitu mual mereda."
        : "<strong>Dekompresi Bilier Emergensi Cito (ERCP Sphincterotomy / PTBD)</strong> bersama antibiotik spektrum luas (Ampisilin-Sulbaktam atau Seftriakson + Metronidazol)."
    },
    readoutFooter: '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Antibiotik profilaksis rutin <strong>TIDAK diindikasikan</strong> pada pankreatitis akut nekrotikans steril (hanya diberikan bila terbukti nekrosis terinfeksi via FNA/gas di CT). Pada kolangitis akut obstruktif berat, antibiotik saja TIDAK CUKUP; pasien akan meninggal karena syok sepsis bilier bila tidak dilakukan <strong>Dekompresi Bilier Segera (ERCP/PTBD)</strong>!</p>'
  });
}

function updateGehPancreatitisTg18Viz(modeIn, fromUser) {
  if (modeIn === "pancreatitis" || modeIn === "cholangitis") gehVizState.pancTgMode = modeIn;
  var isPanc = gehVizState.pancTgMode !== "cholangitis";
  var bScore = calcBisapScore(
    gehVizState.bisapBun,
    gehVizState.bisapMental,
    gehVizState.bisapSirs,
    gehVizState.bisapAge,
    gehVizState.bisapEffusion
  );

  syncVizPresets("viz-geh-panc-tabs", [isPanc, !isPanc]);
  swapVizSvgFrame("viz-gehPanc-frame", buildGehPancreatitisTg18Svg(gehVizState.pancTgMode, bScore, gehVizState.tg18Grade));
  updateVizReadout("viz-gehPanc-readout", isPanc ? (bScore >= 3 ? "danger" : "info") : "danger", formatVizReadoutHtml(
    isPanc ? "Pankreatitis Akut — Skor BISAP " + bScore + " Poin" : "Kolangitis Akut — Tokyo Guidelines (TG18)",
    isPanc ? "Kriteria Atlanta & BISAP" : "Trias Charcot & Pentad Reynolds",
    isPanc ? "BISAP &ge;3 memprediksi mortalitas >15%." : "Pentad Reynolds (Charcot + Syok + Penurunan Kesadaran).",
    "Prinsip Tata Laksana",
    isPanc ? "Resusitasi Ringer Laktat 200–250 mL/jam + nutrisi enteral dini." : "Dekompresi bilier cito (ERCP sphincterotomy)!",
    '<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Hindari antibiotik profilaksis pada nekrosis pankreas steril. Kolangitis berat wajib dekompresi bilier cito!</p>'
  ), "panc-" + gehVizState.pancTgMode + "-" + bScore);
}

// =========================================================================
// W17. KALKULATOR SKOR GLASGOW-BLATCHFORD & AMBANG TRANSFUSI (Extra 1: geh-1-3)
// =========================================================================
function buildGehBlatchfordSvg(scoreVal, isLowRisk, heartCad) {
  var s = clampNum(scoreVal, 0, 23, 5);
  var needleX = 35 + clampNum(s / 23, 0, 1) * 165;
  var color = isLowRisk ? "var(--accent-primary)" : (s >= 6 ? "var(--accent-coral)" : "var(--accent-secondary)");

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Skor Glasgow-Blatchford">' +
    // Left GBS Gauge (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SKOR GLASGOW-BLATCHFORD (GBS)</text>' +
    // Bar
    '<rect x="35" y="46" width="175" height="14" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<rect x="35" y="46" width="22" height="14" rx="7" fill="var(--accent-primary)" opacity="0.7" />' +
    '<rect x="57" y="46" width="45" height="14" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="102" y="46" width="108" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    '<circle cx="' + needleX.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + color + '" stroke-width="2.5" />' +

    '<text x="35" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">0–1 Aman</text>' +
    '<text x="80" y="74" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">2–5 Bangsal</text>' +
    '<text x="210" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">&ge;6 Kritis</text>' +

    '<text x="35" y="98" font-size="14" font-weight="800" fill="' + color + '">Skor GBS: ' + s + ' Poin</text>' +
    '<text x="35" y="116" font-size="8.5" font-weight="700" fill="' + color + '">' + (isLowRisk ? "AMAN RAWAT JALAN (OUTPATIENT)" : (s >= 6 ? "RISIKO TINGGI INTERVENSI CITO" : "RAWAT INAP & ENDOSKOPI <24 JAM")) + '</text>' +

    '<rect x="35" y="130" width="175" height="58" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="45" y="146" font-size="8" font-weight="800" fill="var(--accent-primary)">PREDIKSI KLINIS GBS</text>' +
    '<text x="45" y="160" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Skor &ge;6: &gt;50% butuh transfusi/klip</text>' +
    '<text x="45" y="174" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Skor 0–1: mortalitas &lt;0.5% (Aman)</text>' +

    // Right Transfusion Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="66" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="28" font-size="8.5" font-weight="800" fill="var(--text-muted)">STRATEGI TRANSFUSI PRC SCBA</text>' +
    '<text x="254" y="44" font-size="9" font-weight="800" fill="' + (heartCad ? "var(--accent-secondary)" : "var(--accent-primary)") + '">' + (heartCad ? "Target Liberal: Hb >9.0 g/dL" : "Target Restriktif: Hb 7.0–8.0 g/dL") + '</text>' +
    '<text x="254" y="60" font-size="7.5" font-weight="600" fill="var(--text-muted)">' + (heartCad ? "Diindikasikan khusus pada CAD / PJK akut aktif" : "Villanueva trial: menurunkan mortalitas variseal") + '</text>' +

    '<rect x="242" y="86" width="218" height="64" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="100" font-size="8.5" font-weight="800" fill="var(--text-muted)">PEMANTAUAN HEMODINAMIK</text>' +
    '<text x="254" y="117" font-size="8.2" font-weight="700" fill="var(--text-primary)">Transfusi berlebih memicu lonjakan HVPG</text>' +
    '<text x="254" y="134" font-size="7.4" font-weight="600" fill="var(--accent-coral)">Rebound bleeding varises bila Hb &gt;9–10 g/dL!</text>' +

    '<rect x="242" y="156" width="218" height="60" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="170" font-size="8.5" font-weight="800" fill="var(--accent-primary)">TIMING ENDOSKOPI SCBA</text>' +
    '<text x="254" y="186" font-size="8.2" font-weight="700" fill="var(--text-primary)">Endoskopi diagnostik &le;24 jam pasca stabil</text>' +
    '<text x="254" y="202" font-size="7.4" font-weight="600" fill="var(--text-muted)">Variseal: &le;12 jam pasca Terlipressin dimulai.</text>' +
  '</svg>';
}

function calcGehBlatchford(presetKey) {
  var sexEl = document.getElementById("geh-gbs-sex");
  var bunEl = document.getElementById("geh-gbs-bun");
  var hbEl = document.getElementById("geh-gbs-hb");
  var sbpEl = document.getElementById("geh-gbs-sbp");
  var hrEl = document.getElementById("geh-gbs-hr");
  var melenaEl = document.getElementById("geh-gbs-melena");
  var syncopeEl = document.getElementById("geh-gbs-syncope");
  var liverEl = document.getElementById("geh-gbs-liver");
  var heartEl = document.getElementById("geh-gbs-heart");

  var PRESETS = {
    low_risk_gbs: { sex: "male", bun: 14, hb: 14.2, sbp: 125, hr: 76, melena: false, syncope: false, liver: false, heart: false },
    mod_risk_gbs: { sex: "male", bun: 19, hb: 12.4, sbp: 115, hr: 94, melena: false, syncope: false, liver: false, heart: false },
    high_risk_variceal: { sex: "male", bun: 34, hb: 8.6, sbp: 94, hr: 112, melena: true, syncope: false, liver: true, heart: false },
    cad_acute_bleeding: { sex: "male", bun: 26, hb: 8.8, sbp: 104, hr: 92, melena: true, syncope: false, liver: false, heart: true }
  };

  if (presetKey && PRESETS[presetKey]) {
    gehVizState.gbsPreset = presetKey;
    var pr = PRESETS[presetKey];
    if (sexEl) sexEl.value = pr.sex;
    if (bunEl) bunEl.value = pr.bun;
    if (hbEl) hbEl.value = pr.hb;
    if (sbpEl) sbpEl.value = pr.sbp;
    if (hrEl) hrEl.value = pr.hr;
    if (melenaEl) melenaEl.checked = pr.melena;
    if (syncopeEl) syncopeEl.checked = pr.syncope;
    if (liverEl) liverEl.checked = pr.liver;
    if (heartEl) heartEl.checked = pr.heart;
  }
  syncVizPresets("viz-geh-gbs-presets", Object.keys(PRESETS).map(function(k) { return k === gehVizState.gbsPreset; }));

  var sex = sexEl ? sexEl.value : "male";
  var bun = clampNum(bunEl ? bunEl.value : 24, 5, 120, 24);
  var hb = clampNum(hbEl ? hbEl.value : 11.2, 3, 20, 11.2);
  var sbp = clampNum(sbpEl ? sbpEl.value : 115, 60, 220, 115);
  var hr = clampNum(hrEl ? hrEl.value : 94, 40, 180, 94);
  var melena = melenaEl ? melenaEl.checked : false;
  var syncope = syncopeEl ? syncopeEl.checked : false;
  var liver = liverEl ? liverEl.checked : false;
  var heart = heartEl ? heartEl.checked : false;

  var score = 0;

  // BUN (mg/dL)
  if (bun >= 70) score += 6;
  else if (bun >= 28) score += 4;
  else if (bun >= 22.4) score += 3;
  else if (bun >= 18.2) score += 2;

  // Hemoglobin
  if (sex === "male") {
    if (hb < 10) score += 6;
    else if (hb < 12) score += 3;
    else if (hb < 13) score += 1;
  } else {
    if (hb < 10) score += 6;
    else if (hb < 12) score += 1;
  }

  // SBP
  if (sbp < 90) score += 3;
  else if (sbp < 100) score += 2;
  else if (sbp < 110) score += 1;

  // HR
  if (hr >= 100) score += 1;

  // Markers
  if (melena) score += 1;
  if (syncope) score += 2;
  if (liver) score += 2;
  if (heart) score += 2;

  var isLowRisk = score <= 1;
  var tone = isLowRisk ? "info" : (score >= 6 ? "danger" : "warning");

  swapVizSvgFrame("viz-gehGbs-frame", buildGehBlatchfordSvg(score, isLowRisk, heart));
  var res = document.getElementById("widget-geh-gbs-result");
  if (!res) return;

  var transfTarget = heart
    ? "<strong>CAD / PJK Aktif:</strong> Target Transfusi PRC Liberal <strong>Hb &gt;9.0 g/dL</strong> (mencegah iskemia miokardium!)."
    : "<strong>Target Transfusi Restriktif:</strong> Pertahankan <strong>Hb 7.0–8.0 g/dL</strong> (Villanueva Trial: menurunkan mortalitas 6-minggu & mencegah lonjakan tekanan porta).";

  updateCalcReadoutTone(
    res,
    tone,
    "gbs-" + score + "-" + heart,
    '<p class="font-bold text-[var(--text-primary)]">Glasgow-Blatchford Bleeding Score (GBS) = ' + score + ' Poin &rarr; ' + (isLowRisk ? "AMAN RAWAT JALAN (OUTPATIENT)" : "WAJIB RAWAT INAP & ENDOSKOPI DALAM 24 JAM") + '</p>' +
    '<div class="viz-readout-grid mt-1">' +
      '<p>&bull; <strong>Interpretasi Klinis:</strong> ' + (isLowRisk ? "Skor 0–1 memiliki risiko mortalitas &lt;0.5% dan kebutuhan intervensi hemostatik &lt;1%. Pasien aman dipulangkan dari IGD." : "Skor &ge;2 memerlukan rawat inap. Skor &ge;6 memprediksi &gt;50% membutuhkan transfusi darah atau hemostasis endoskopi.") + '</p>' +
      '<p>&bull; <strong>Strategi Transfusi:</strong> ' + transfTarget + '</p>' +
    '</div>'
  );
}

function renderGehBlatchfordCalcWidget() {
  var presetButtons = [
    { key: "low_risk_gbs", label: "Skor 0 (Aman Pulang)" },
    { key: "mod_risk_gbs", label: "Skor 3 (Rawat Inap)" },
    { key: "high_risk_variceal", label: "Skor 16 (Varises Masif)" },
    { key: "cad_acute_bleeding", label: "SCBA + PJK (Hb >9)" }
  ];

  return '<div class="viz-widget" id="viz-calc-geh-gbs-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator Skor Glasgow-Blatchford (GBS) & Ambang Transfusi SCBA</span>' +
      '<span class="viz-tag">Perdarahan SCBA • KKI 4</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-geh-gbs-presets">' +
      presetButtons.map(function(b) {
        return '<button type="button" class="viz-pill-btn ' + (gehVizState.gbsPreset === b.key ? "active" : "") + '" onclick="window.InternaApp.calcGehBlatchford(\'' + b.key + '\')">' + b.label + '</button>';
      }).join("") +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-gbs-sex">Jenis Kelamin</label><select id="geh-gbs-sex" class="viz-calc-input w-full" onchange="window.InternaApp.calcGehBlatchford()"><option value="male" selected>Pria</option><option value="female">Wanita</option></select></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-gbs-bun">BUN (mg/dL)</label><input type="number" id="geh-gbs-bun" value="19" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehBlatchford()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-gbs-hb">Hemoglobin (g/dL)</label><input type="number" id="geh-gbs-hb" step="0.1" value="12.4" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehBlatchford()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-gbs-sbp">TDS Sistolik</label><input type="number" id="geh-gbs-sbp" value="115" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehBlatchford()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-gbs-hr">Nadi (bpm)</label><input type="number" id="geh-gbs-hr" value="94" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehBlatchford()" /></div>' +
    '</div>' +
    '<div class="flex flex-wrap gap-3 mb-2.5 text-xs text-[var(--text-secondary)]">' +
      '<label class="flex items-center gap-1.5"><input type="checkbox" id="geh-gbs-melena" onchange="window.InternaApp.calcGehBlatchford()" /> Ada Melena (+1)</label>' +
      '<label class="flex items-center gap-1.5"><input type="checkbox" id="geh-gbs-syncope" onchange="window.InternaApp.calcGehBlatchford()" /> Ada Sinkop (+2)</label>' +
      '<label class="flex items-center gap-1.5"><input type="checkbox" id="geh-gbs-liver" onchange="window.InternaApp.calcGehBlatchford()" /> Riwayat Penyakit Hepar (+2)</label>' +
      '<label class="flex items-center gap-1.5"><input type="checkbox" id="geh-gbs-heart" onchange="window.InternaApp.calcGehBlatchford()" /> Gagal Jantung / CAD (+2)</label>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-gehGbs-frame">' +
      buildGehBlatchfordSvg(3, false, false) +
    '</div>' +
    '<div id="widget-geh-gbs-result" class="viz-readout" data-tone="warning" data-last-key="gbs-init">' +
      '<p class="font-bold text-[var(--text-primary)]">Glasgow-Blatchford Bleeding Score (GBS) = 3 Poin &rarr; WAJIB RAWAT INAP &amp; ENDOSKOPI</p>' +
      '<p class="mt-1">Skor &ge;2 memerlukan rawat inap dan endoskopi dalam 24 jam. Ambang transfusi PRC restriktif menargetkan Hb 7–8 g/dL untuk mencegah lonjakan tekanan porta.</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// W18. KALKULATOR CHILD-PUGH & MELD-NA SIROSIS (Extra 2: geh-4-1)
// =========================================================================
function buildGehChildMeldSvg(cpClass, cpScore, meldNa, mort90) {
  var cp = clampNum(cpScore, 5, 15, 8);
  var meld = clampNum(meldNa, 6, 45, 16);

  var needleCp = 35 + clampNum((cp - 5) / 10, 0, 1) * 165;
  var colorCp = cp <= 6 ? "var(--accent-primary)" : (cp >= 10 ? "var(--accent-coral)" : "var(--accent-secondary)");

  var needleMeld = 254 + clampNum((meld - 6) / 36, 0, 1) * 190;
  var colorMeld = meld < 10 ? "var(--accent-primary)" : (meld >= 25 ? "var(--accent-coral)" : "var(--accent-secondary)");

  return '<svg class="viz-svg" viewBox="0 0 480 225" role="img" aria-label="Skor Child-Pugh & MELD-Na">' +
    // Left Child-Pugh Panel (x=18..234)
    '<rect x="20" y="14" width="210" height="198" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">SKOR CHILD-TURCOTTE-PUGH (CTP)</text>' +
    // CP Bar
    '<rect x="35" y="46" width="175" height="14" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<rect x="35" y="46" width="35" height="14" rx="7" fill="var(--accent-primary)" opacity="0.6" />' +
    '<rect x="70" y="46" width="52" height="14" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="122" y="46" width="88" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    '<circle cx="' + needleCp.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + colorCp + '" stroke-width="2.5" />' +

    '<text x="35" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">Kelas A (5-6)</text>' +
    '<text x="96" y="74" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">Kelas B (7-9)</text>' +
    '<text x="210" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">Kelas C (10-15)</text>' +

    '<text x="35" y="98" font-size="12" font-weight="800" fill="' + colorCp + '">Child-Pugh Kelas ' + cpClass + ' (' + cp + ' Poin)</text>' +
    '<text x="35" y="114" font-size="7.8" font-weight="700" fill="var(--text-primary)">' + (cp <= 6 ? "Kompensata (Mortalitas Operasi ~10%)" : (cp >= 10 ? "Dekompensasi Berat (Mort Bedah >70%)" : "Disfungsi Signifikan (Mort Bedah ~30%)")) + '</text>' +

    '<rect x="35" y="130" width="175" height="58" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="45" y="146" font-size="8" font-weight="800" fill="var(--accent-primary)">5 PARAMETER CHILD-PUGH</text>' +
    '<text x="45" y="160" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Bilirubin, Albumin, INR,</text>' +
    '<text x="45" y="174" font-size="7.4" font-weight="600" fill="var(--text-secondary)">Derajat Asites, dan Ensefalopati (HE)</text>' +

    // Right MELD-Na Panel (x=240..462)
    '<rect x="242" y="14" width="218" height="198" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="254" y="32" font-size="9.5" font-weight="800" fill="var(--text-muted)">MELD-NA & MORTALITAS 90-HARI</text>' +
    // MELD Bar
    '<rect x="254" y="46" width="190" height="14" rx="7" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="254" y="46" width="50" height="14" rx="7" fill="var(--accent-primary)" opacity="0.6" />' +
    '<rect x="304" y="46" width="55" height="14" fill="var(--accent-secondary)" opacity="0.6" />' +
    '<rect x="359" y="46" width="85" height="14" rx="7" fill="var(--accent-coral)" opacity="0.6" />' +
    '<circle cx="' + needleMeld.toFixed(1) + '" cy="53" r="6.5" fill="var(--bg-surface)" stroke="' + colorMeld + '" stroke-width="2.5" />' +

    '<text x="254" y="74" font-size="7.5" font-weight="700" fill="var(--accent-primary)">&le;9 (2%)</text>' +
    '<text x="330" y="74" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">10–19 (6%)</text>' +
    '<text x="444" y="74" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">&ge;30 (>50%)</text>' +

    '<text x="254" y="98" font-size="12" font-weight="800" fill="' + colorMeld + '">MELD-Na = ' + meld + ' Poin</text>' +
    '<text x="254" y="114" font-size="8.2" font-weight="700" fill="' + colorMeld + '">Mortalitas 90-Hari: ' + mort90 + '</text>' +

    '<rect x="254" y="130" width="190" height="68" rx="11" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="264" y="146" font-size="8" font-weight="800" fill="var(--accent-primary)">ALOKASI TRANSPLANTASI HEPAR</text>' +
    '<text x="264" y="160" font-size="7.4" font-weight="600" fill="var(--text-primary)">Ambang Listing Donor: MELD &ge;15</text>' +
    '<text x="264" y="174" font-size="7.4" font-weight="700" fill="var(--accent-coral)">Koreksi Hiponatremia Na &lt;130</text>' +
    '<text x="264" y="188" font-size="7.2" font-weight="600" fill="var(--text-muted)">UNOS mengutamakan pasien MELD tertinggi.</text>' +
  '</svg>';
}

function calcGehChildMeld(presetKey) {
  var biliEl = document.getElementById("geh-cpm-bili");
  var albEl = document.getElementById("geh-cpm-alb");
  var inrEl = document.getElementById("geh-cpm-inr");
  var ascitesEl = document.getElementById("geh-cpm-ascites");
  var heEl = document.getElementById("geh-cpm-he");
  var crEl = document.getElementById("geh-cpm-cr");
  var naEl = document.getElementById("geh-cpm-na");
  var dialEl = document.getElementById("geh-cpm-dial");

  var PRESETS = {
    child_a_comp: { bili: 1.2, alb: 3.8, inr: 1.1, ascites: "none", he: "none", cr: 0.9, na: 138, dial: false },
    child_b_eval: { bili: 2.8, alb: 2.9, inr: 1.9, ascites: "mild", he: "grade1_2", cr: 1.4, na: 133, dial: false },
    child_c_decomp: { bili: 5.2, alb: 2.2, inr: 2.6, ascites: "severe", he: "grade3_4", cr: 2.2, na: 128, dial: false },
    hrs_critical_meld: { bili: 8.4, alb: 2.0, inr: 3.1, ascites: "severe", he: "grade3_4", cr: 3.8, na: 124, dial: true }
  };

  if (presetKey && PRESETS[presetKey]) {
    gehVizState.cpMeldPreset = presetKey;
    var pr = PRESETS[presetKey];
    if (biliEl) biliEl.value = pr.bili;
    if (albEl) albEl.value = pr.alb;
    if (inrEl) inrEl.value = pr.inr;
    if (ascitesEl) ascitesEl.value = pr.ascites;
    if (heEl) heEl.value = pr.he;
    if (crEl) crEl.value = pr.cr;
    if (naEl) naEl.value = pr.na;
    if (dialEl) dialEl.checked = pr.dial;
  }
  syncVizPresets("viz-geh-cpm-presets", Object.keys(PRESETS).map(function(k) { return k === gehVizState.cpMeldPreset; }));

  var bili = clampNum(biliEl ? biliEl.value : 2.8, 0.1, 40, 2.8);
  var alb = clampNum(albEl ? albEl.value : 2.9, 1.0, 6.0, 2.9);
  var inr = clampNum(inrEl ? inrEl.value : 1.9, 0.8, 10, 1.9);
  var asc = ascitesEl ? ascitesEl.value : "mild";
  var he = heEl ? heEl.value : "grade1_2";
  var cr = clampNum(crEl ? crEl.value : 1.4, 0.4, 15, 1.4);
  var na = clampNum(naEl ? naEl.value : 133, 110, 150, 133);
  var dial = dialEl ? dialEl.checked : false;

  var cpScore = 0;
  // Bilirubin
  if (bili > 3.0) cpScore += 3;
  else if (bili >= 2.0) cpScore += 2;
  else cpScore += 1;
  // Albumin
  if (alb < 2.8) cpScore += 3;
  else if (alb <= 3.5) cpScore += 2;
  else cpScore += 1;
  // INR
  if (inr > 2.3) cpScore += 3;
  else if (inr >= 1.7) cpScore += 2;
  else cpScore += 1;
  // Ascites
  if (asc === "severe") cpScore += 3;
  else if (asc === "mild") cpScore += 2;
  else cpScore += 1;
  // Encephalopathy
  if (he === "grade3_4") cpScore += 3;
  else if (he === "grade1_2") cpScore += 2;
  else cpScore += 1;

  var cpClass = "A";
  var cpTone = "info";
  var cpSurv = "Harapan Hidup 1-Thn 100%, 2-Thn 85% (Mortalitas Operasi Rendah ~10%)";

  if (cpScore >= 10) {
    cpClass = "C";
    cpTone = "danger";
    cpSurv = "Harapan Hidup 1-Thn 45%, 2-Thn 35% (Mortalitas Operasi Elektif >70–80%!)";
  } else if (cpScore >= 7) {
    cpClass = "B";
    cpTone = "warning";
    cpSurv = "Harapan Hidup 1-Thn 80%, 2-Thn 60% (Pertimbangkan Evaluasi Transplantasi)";
  }

  // MELD-Na calculation
  var effCr = dial ? 4.0 : clampNum(cr, 1.0, 4.0, 1.4);
  var effBili = clampNum(bili, 1.0, 40, 2.8);
  var effInr = clampNum(inr, 1.0, 10, 1.9);

  var meldRaw = 9.57 * Math.log(effCr) + 3.78 * Math.log(effBili) + 11.2 * Math.log(effInr) + 6.43;
  var meldBase = Math.min(40, Math.round(meldRaw));

  var meldNa = meldBase;
  if (meldBase > 11) {
    var effNa = clampNum(na, 125, 137, 133);
    meldNa = Math.min(40, Math.round(meldBase + 1.32 * (137 - effNa) - 0.033 * meldBase * (137 - effNa)));
  }

  var mort90 = "<2%";
  if (meldNa >= 40) mort90 = "71.3% (Prioritas Tertinggi Donor)";
  else if (meldNa >= 30) mort90 = "52.6%";
  else if (meldNa >= 20) mort90 = "19.6%";
  else if (meldNa >= 10) mort90 = "6.0%";

  swapVizSvgFrame("viz-gehCpm-frame", buildGehChildMeldSvg(cpClass, cpScore, meldNa, mort90));
  var res = document.getElementById("widget-geh-cpm-result");
  if (!res) return;

  updateCalcReadoutTone(
    res,
    cpTone,
    "cpm-" + cpScore + "-" + meldNa,
    '<p class="font-bold text-[var(--text-primary)]">Child-Pugh Kelas ' + cpClass + ' (' + cpScore + ' Poin) &bull; MELD-Na = ' + meldNa + ' Poin</p>' +
    '<div class="viz-readout-grid mt-1">' +
      '<p>&bull; <strong>Child-Pugh ' + cpClass + ':</strong> ' + cpSurv + '</p>' +
      '<p>&bull; <strong>MELD-Na ' + meldNa + ':</strong> Prediksi <strong>Mortalitas 90-Hari = ' + mort90 + '</strong>. Natrium serum ' + na + ' mmol/L (' + (na < 130 ? '<span class="text-[var(--accent-coral)] font-bold">Hiponatremia Dilusional Memperburuk Prognosis!</span>' : 'Normal') + ').</p>' +
    '</div>' +
    '<p class="mt-1">Child-Pugh C (&ge;10 poin) atau MELD-Na &ge;15 adalah ambang indikasi rujukan evaluasi <strong>Transplantasi Hepar (Liver Transplantation)</strong>.</p>'
  );
}

function renderGehChildMeldCalcWidget() {
  var presetButtons = [
    { key: "child_a_comp", label: "Child A (Kompensata)" },
    { key: "child_b_eval", label: "Child B (Evaluasi Tx)" },
    { key: "child_c_decomp", label: "Child C (Dekompensasi)" },
    { key: "hrs_critical_meld", label: "Child C + AKI / Dialisis" }
  ];

  return '<div class="viz-widget" id="viz-calc-geh-cpm-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator Terintegrasi Skor Child-Pugh & MELD-Na Sirosis</span>' +
      '<span class="viz-tag">Sirosis Hepatis • KKI 4</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-geh-cpm-presets">' +
      presetButtons.map(function(b) {
        return '<button type="button" class="viz-pill-btn ' + (gehVizState.cpMeldPreset === b.key ? "active" : "") + '" onclick="window.InternaApp.calcGehChildMeld(\'' + b.key + '\')">' + b.label + '</button>';
      }).join("") +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-bili">Total Bilirubin (mg/dL)</label><input type="number" id="geh-cpm-bili" step="0.1" value="2.8" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehChildMeld()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-alb">Albumin (g/dL)</label><input type="number" id="geh-cpm-alb" step="0.1" value="2.9" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehChildMeld()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-inr">INR</label><input type="number" id="geh-cpm-inr" step="0.1" value="1.9" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehChildMeld()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-cr">Kreatinin (mg/dL)</label><input type="number" id="geh-cpm-cr" step="0.1" value="1.4" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehChildMeld()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-na">Natrium Serum (mmol/L)</label><input type="number" id="geh-cpm-na" value="133" class="viz-calc-input w-full" oninput="window.InternaApp.calcGehChildMeld()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-ascites">Derajat Asites</label><select id="geh-cpm-ascites" class="viz-calc-input w-full" onchange="window.InternaApp.calcGehChildMeld()"><option value="none">Tidak Ada</option><option value="mild" selected>Ringan / Respons Diuretik</option><option value="severe">Sedang-Berat / Refrakter</option></select></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="geh-cpm-he">Ensefalopati (HE)</label><select id="geh-cpm-he" class="viz-calc-input w-full" onchange="window.InternaApp.calcGehChildMeld()"><option value="none">Tidak Ada</option><option value="grade1_2" selected>Derajat I–II</option><option value="grade3_4">Derajat III–IV</option></select></div>' +
      '<div style="min-width:0; padding-bottom:0.4rem;"><label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><input type="checkbox" id="geh-cpm-dial" onchange="window.InternaApp.calcGehChildMeld()" /> Dialisis &ge;2x / 7 Hari</label></div>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-gehCpm-frame">' +
      buildGehChildMeldSvg("B", 8, 16, "6.0%") +
    '</div>' +
    '<div id="widget-geh-cpm-result" class="viz-readout" data-tone="warning" data-last-key="cpm-init">' +
      '<p class="font-bold text-[var(--text-primary)]">Child-Pugh Kelas B (8 Poin) &bull; MELD-Na = 16 Poin</p>' +
      '<p class="mt-1">Disfungsi hati bermakna dengan harapan hidup 1 tahun ~80%. MELD-Na &ge;15 merupakan ambang batas untuk memulai evaluasi transplantasi hati ke pusat rujukan tersier.</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// INTEGRATED WIDGETS: ANTIBIOTIC HELPER (TROPIK) & HBV ASSISTANT (GEH)

// 2. GEH-HBV-CLINICAL-CALC (HBV Clinical Assistant PPHI 2026 — Fixed & Interna Snack Styled)
// -------------------------------------------------------------------------
var gehHbvCalcState = {
  activeTab: "assessment", // "assessment" | "therapy" | "monitoring"
  preset: "preg_mtct",
  age: 30,
  sex: "female",
  chronic: "yes",
  hbeag: "positive",
  liver: "none",
  dna: 850000,
  ast: 28,
  astUln: 40,
  alt: 26,
  altUln: 35, // Fixed: default ULN 35 so ALT > ULN never silently fails!
  plt: 220,
  vcte: 5.6,
  pregnant: "yes",
  gestWeek: 30,
  currentDrug: "none",
  maternalIndication: "no",
  renal: "no",
  crcl: 95,
  lam: "no",
  risks: [] // ["hcc","hiv","immuno","extra","family","hdv"]
};

function evalGehHbvClinical() {
  var s = gehHbvCalcState;
  var apri = (s.ast >= 0 && s.astUln > 0 && s.plt > 0) ? ((s.ast / s.astUln) / s.plt) * 100 : null;
  var fib4 = (s.age > 0 && s.ast >= 0 && s.alt > 0 && s.plt > 0) ? (s.age * s.ast) / (s.plt * Math.sqrt(s.alt)) : null;
  var fibrosis = (apri !== null && apri >= 0.5) || (fib4 !== null && fib4 >= 1.3) || (s.vcte > 0 && s.vcte >= 7) || s.liver !== "none";
  var cirrhosis = (apri !== null && apri >= 1.0) || (fib4 !== null && fib4 >= 2.67) || (s.vcte > 0 && s.vcte >= 11) || s.liver !== "none";
  var hasRisk = function(k) { return s.risks.indexOf(k) >= 0; };
  var highRisk = hasRisk("hcc") || hasRisk("hiv") || hasRisk("immuno") || hasRisk("extra") || hasRisk("hdv");
  var altHigh = s.alt > 0 && s.altUln > 0 && s.alt > s.altUln;
  var familyFlag = hasRisk("family") && s.dna > 2000;
  var preg = s.pregnant === "yes";
  var mtct = preg && ((s.dna >= 200000) || (s.dna === 0 && s.hbeag === "positive"));
  var treat = fibrosis || highRisk || familyFlag || (s.dna > 2000 && (altHigh || s.age > 30)) || (s.dna > 0 && altHigh) || (preg && s.maternalIndication === "yes");
  var switchNeeded = preg && (s.currentDrug === "etv" || s.currentDrug === "adefovir" || s.currentDrug === "pegifn");
  var indicated = treat || mtct || switchNeeded;
  var renalIssue = s.renal === "yes" || (s.crcl > 0 && s.crcl < 50);
  var lamRes = s.lam === "yes";

  // Renal-aware & Lamivudine-aware drug selection (fixing gaps in original HTML!)
  var drugs = [];
  if (indicated) {
    if (preg) {
      drugs.push({ name: "Tenofovir Disoproxil Fumarate (TDF)", dose: s.crcl >= 50 ? "300 mg/24 jam" : (s.crcl >= 30 ? "300 mg/48 jam" : "300 mg/72-96 jam"), note: "Rekam keamanan kehamilan luas (PPHI 2026 / WHO 2024 / EASL 2025)." });
      if (!renalIssue || s.crcl >= 15) {
        drugs.push({ name: "Tenofovir Alafenamide (TAF)", dose: "25 mg/hari (bila CrCl >=15)", note: "Lini 1 alternatif pada kehamilan menurut PPHI 2026 dengan profil ginjal/tulang unggul." });
      }
    } else if (s.liver === "decompensated") {
      if (!lamRes) {
        var etvDek = s.crcl >= 50 ? "1 mg/hari" : (s.crcl >= 30 ? "0.5 mg/hari" : (s.crcl >= 10 ? "0.3 mg/hari" : "0.1 mg/hari"));
        drugs.push({ name: "Entecavir (Dosis Dekompensata)", dose: etvDek, note: "Minum saat perut kosong. Dosis ditingkatkan 1 mg/hari pada sirosis dekompensata." });
      }
      if (!renalIssue || s.crcl >= 15) {
        drugs.push({ name: "Tenofovir Alafenamide (TAF)", dose: "25 mg/hari", note: lamRes ? "PILIHAN UTAMA: aman pada riwayat resistensi lamivudin & lebih aman untuk ginjal." : "Alternatif lini 1 aman ginjal/tulang." });
      }
    } else {
      if (renalIssue || lamRes) {
        if (s.crcl >= 15 || s.crcl === 0) {
          drugs.push({ name: "Tenofovir Alafenamide (TAF) — PRIORITAS", dose: "25 mg/hari", note: (lamRes ? "Wajib pilih golongan Tenofovir karena riwayat resistensi lamivudin (resistensi silang ETV). " : "") + (renalIssue ? "Aman hingga CrCl >=15 mL/mnt tanpa penyesuaian dosis." : "") });
        }
        if (!lamRes) {
          var etvDose = s.crcl >= 50 ? "0.5 mg/hari" : (s.crcl >= 30 ? "0.25 mg/hari" : (s.crcl >= 10 ? "0.15 mg/hari" : "0.05 mg/hari"));
          drugs.push({ name: "Entecavir (ETV) — Sesuai CrCl", dose: etvDose, note: "Alternatif aman ginjal bila disesuaikan CrCl." });
        }
      } else {
        drugs.push({ name: "Tenofovir Alafenamide (TAF)", dose: "25 mg/hari", note: "Lini 1 barier resistensi tinggi & profil ginjal/tulang baik." });
        drugs.push({ name: "Entecavir (ETV)", dose: "0.5 mg/hari", note: "Saat perut kosong (2 jam sebelum/sesudah makan)." });
        drugs.push({ name: "Tenofovir Disoproxil Fumarate (TDF)", dose: "300 mg/hari", note: "Lini 1; pantau fungsi ginjal & fosfat serum berkala." });
      }
    }
  }

  var hccSurv = cirrhosis || hasRisk("hcc") || hasRisk("family") || hasRisk("hdv") || (s.age > 50 && indicated);
  return { apri: apri, fib4: fib4, fibrosis: fibrosis, cirrhosis: cirrhosis, altHigh: altHigh, preg: preg, mtct: mtct, treat: treat, switchNeeded: switchNeeded, indicated: indicated, renalIssue: renalIssue, lamRes: lamRes, drugs: drugs, hccSurv: hccSurv };
}

function renderGehHbvClinicalBody() {
  var s = gehHbvCalcState;
  var r = evalGehHbvClinical();
  var presets = '<div class="viz-presets mb-2">' +
    '<button type="button" class="viz-pill-btn ' + (s.preset === "preg_mtct" ? "active" : "") + '" onclick="window.InternaApp.applyGehHbvCalcPreset(\'preg_mtct\')">Contoh Kehamilan (MTCT)</button>' +
    '<button type="button" class="viz-pill-btn ' + (s.preset === "cirr_ckd_lam" ? "active" : "") + '" onclick="window.InternaApp.applyGehHbvCalcPreset(\'cirr_ckd_lam\')">Sirosis + CKD + Resistensi Lamivudin</button>' +
    '<button type="button" class="viz-pill-btn ' + (s.preset === "inactive" ? "active" : "") + '" onclick="window.InternaApp.applyGehHbvCalcPreset(\'inactive\')">Karier Inaktif (Observasi)</button>' +
  '</div>';

  var tabs = '<div class="viz-subtabs mb-2.5">' +
    [
      { k: "assessment", l: "1. Penilaian & APRI/FIB-4" },
      { k: "therapy", l: "2. Terapi, Kehamilan & Bayi" },
      { k: "monitoring", l: "3. Monitoring & Surveilans KSH" }
    ].map(function(t) {
      return '<button type="button" class="viz-pill-btn ' + (s.activeTab === t.k ? "active" : "") + '" onclick="window.InternaApp.setGehHbvCalcTab(\'' + t.k + '\')">' + t.l + '</button>';
    }).join("") +
  '</div>';

  if (s.activeTab === "assessment") {
    return presets + tabs +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5" style="align-items:end;">' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-age">Usia (th)</label><input type="number" id="hbv-c-age" value="' + s.age + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-hbeag">HBeAg</label><select id="hbv-c-hbeag" class="viz-calc-input w-full" onchange="window.InternaApp.updateGehHbvClinicalCalc()"><option value="positive" ' + (s.hbeag === "positive" ? "selected" : "") + '>Positif</option><option value="negative" ' + (s.hbeag === "negative" ? "selected" : "") + '>Negatif</option><option value="unknown" ' + (s.hbeag === "unknown" ? "selected" : "") + '>Belum ada</option></select></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-liver">Status Hati</label><select id="hbv-c-liver" class="viz-calc-input w-full" onchange="window.InternaApp.updateGehHbvClinicalCalc()"><option value="none" ' + (s.liver === "none" ? "selected" : "") + '>Non-Sirosis</option><option value="compensated" ' + (s.liver === "compensated" ? "selected" : "") + '>Sirosis Kompensata</option><option value="decompensated" ' + (s.liver === "decompensated" ? "selected" : "") + '>Sirosis Dekompensata</option></select></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-dna">DNA VHB (IU/mL)</label><input type="number" id="hbv-c-dna" value="' + s.dna + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-ast">AST (U/L)</label><input type="number" id="hbv-c-ast" value="' + s.ast + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-alt">ALT (ULN ' + s.altUln + ')</label><input type="number" id="hbv-c-alt" value="' + s.alt + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-plt">Trombosit (x10^3)</label><input type="number" id="hbv-c-plt" value="' + s.plt + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-crcl">CrCl (mL/mnt)</label><input type="number" id="hbv-c-crcl" value="' + s.crcl + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5" style="align-items:end;">' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-preg">Kehamilan</label><select id="hbv-c-preg" class="viz-calc-input w-full" onchange="window.InternaApp.updateGehHbvClinicalCalc()"><option value="no" ' + (s.pregnant === "no" ? "selected" : "") + '>Tidak hamil</option><option value="yes" ' + (s.pregnant === "yes" ? "selected" : "") + '>Sedang hamil</option><option value="planning" ' + (s.pregnant === "planning" ? "selected" : "") + '>Rencana hamil</option></select></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-week">Usia Hamil (mgg)</label><input type="number" id="hbv-c-week" value="' + s.gestWeek + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateGehHbvClinicalCalc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hbv-c-lam">Riwayat Lamivudin</label><select id="hbv-c-lam" class="viz-calc-input w-full" onchange="window.InternaApp.updateGehHbvClinicalCalc()"><option value="no" ' + (s.lam === "no" ? "selected" : "") + '>Tidak</option><option value="yes" ' + (s.lam === "yes" ? "selected" : "") + '>Ya / Resisten</option></select></div>' +
      '</div>' +
      '<div class="viz-calc-checklist mb-2.5">' +
        renderCalcCheckItem("hbv-rk-hiv", "window.InternaApp.updateGehHbvClinicalCalc()", "Koinfeksi HIV", { checked: s.risks.indexOf("hiv") >= 0 }) +
        renderCalcCheckItem("hbv-rk-immuno", "window.InternaApp.updateGehHbvClinicalCalc()", "Imunosupresi / Rituximab / DAA HCV", { checked: s.risks.indexOf("immuno") >= 0 }) +
        renderCalcCheckItem("hbv-rk-family", "window.InternaApp.updateGehHbvClinicalCalc()", "Riwayat Keluarga KSH / Sirosis", { checked: s.risks.indexOf("family") >= 0 }) +
        renderCalcCheckItem("hbv-rk-renal", "window.InternaApp.updateGehHbvClinicalCalc()", "Risiko Ginjal / Osteopenia", { checked: s.renal === "yes" }) +
      '</div>' +
      '<div class="viz-readout" data-tone="' + (r.cirrhosis ? "danger" : (r.indicated ? "warning" : "info")) + '">' +
        '<p class="font-bold text-[var(--text-primary)]">' + (r.indicated ? "TERAPI / PROFILAKSIS DIREKOMENDASIKAN" : "MONITORING AKTIF (Belum Ada Indikasi Terapi)") + '</p>' +
        '<p class="mt-1"><strong>APRI:</strong> ' + (r.apri !== null ? r.apri.toFixed(2) : "—") + (r.apri >= 1.0 ? " (Sirosis)" : (r.apri >= 0.5 ? " (Fibrosis >=F2)" : " (Normal)")) + ' &bull; <strong>FIB-4:</strong> ' + (r.fib4 !== null ? r.fib4.toFixed(2) : "—") + (r.fib4 >= 2.67 ? " (Sirosis)" : (r.fib4 >= 1.3 ? " (Fibrosis)" : " (Rendah)")) + '</p>' +
        '<p class="mt-1">' + (r.mtct ? "<strong>MTCT Kehamilan:</strong> DNA VHB >=200.000 IU/mL (atau HBeAg+) -> mulai Tenofovir paling lambat minggu ke-28!" : (r.cirrhosis ? "Sirosis merupakan indikasi mutlak antiviral jangka panjang." : "Evaluasi DNA VHB, ALT, & skor fibrosis berkala.")) + '</p>' +
      '</div>';
  }

  if (s.activeTab === "therapy") {
    var drugHtml = r.drugs.length
      ? r.drugs.map(function(dr) {
          return '<div style="padding:8px 10px;border:1px solid var(--border-subtle);border-radius:8px;margin-bottom:6px;background:var(--bg-surface);">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;"><span>' + escapeHtml(dr.name) + '</span><span style="color:var(--accent-primary);">' + escapeHtml(dr.dose) + '</span></div>' +
            '<p style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + escapeHtml(dr.note) + '</p>' +
          '</div>';
        }).join("")
      : '<p class="text-xs text-[var(--text-muted)] mb-2">Belum ada indikasi antiviral pada pasien ini; lanjutkan pemantauan ALT & DNA VHB tiap 3–6 bulan.</p>';

    return presets + tabs + drugHtml +
      '<div class="viz-readout" data-tone="' + (r.preg ? "warning" : "info") + '">' +
        '<p class="font-bold text-[var(--text-primary)]">Jalur Kehamilan &amp; Profilaksis Bayi (PPHI 2026 / WHO 2024)</p>' +
        '<p class="mt-1">&bull; <strong>Ibu Hamil:</strong> Jika ada indikasi maternal -> mulai Tenofovir segera tanpa menunggu minggu 28 & teruskan postpartum. Jika hanya profilaksis MTCT (DNA >=200.000) -> mulai paling lambat minggu ke-28; menyusui aman dengan TDF/TAF; sesar bukan indikasi mencegah HBV.</p>' +
        '<p class="mt-1">&bull; <strong>Bayi Lahir:</strong> Wajib <strong>Vaksin HepB + HBIG (&le;12 jam)</strong> di lokasi suntikan berbeda, lanjut vaksin seri lengkap (2, 3, 4 bln), cek PVST (HBsAg & anti-HBs) usia 9–12 bulan.</p>' +
      '</div>';
  }

  // tab === "monitoring"
  return presets + tabs +
    '<div class="viz-readout" data-tone="' + (r.hccSurv ? "danger" : "info") + '">' +
      '<p class="font-bold text-[var(--text-primary)]">Rencana Monitoring &amp; Surveilans KSH</p>' +
      '<p class="mt-1">&bull; <strong>Follow-up Lab:</strong> ' + (r.indicated ? "ALT, DNA VHB, dan fungsi ginjal (CrCl/fosfat bila TDF) tiap 3–6 bulan hingga supresi, lalu tiap 6–12 bulan; HBsAg tahunan." : "ALT & DNA VHB tiap 3–6 bulan pada tahun pertama; HBsAg tiap 12 bulan.") + '</p>' +
      '<p class="mt-1">&bull; <strong>Surveilans KSH:</strong> ' + (r.hccSurv ? "<strong>WAJIB USG Abdomen + AFP / PIVKA-II tiap 6 bulan!</strong> (Indikasi terpenuhi: sirosis / riwayat keluarga KSH / koinfeksi / usia >50 th)." : "Risiko KSH belum tinggi; evaluasi ulang berkala.") + '</p>' +
      '<p class="mt-1 text-[11px] opacity-80">Rujukan: Konsensus Nasional PPHI 2026, WHO Hepatitis B Guidelines 2024, EASL 2025, CDC Perinatal HBV.</p>' +
    '</div>';
}

function renderGehHbvSummarySvg() {
  var r = evalGehHbvClinical();
  var txCol = r.indicated ? "#dc2626" : (r.consider ? "#d97706" : "#059669");
  var txTxt = r.indicated ? "TERAPI SEGERA" : (r.consider ? "PERTIMBANGKAN" : "PEMANTAUAN");
  var hccCol = r.hccSurv ? "#d97706" : "#059669";
  var hccTxt = r.hccSurv ? "USG+AFP / 6 BLN" : "RISIKO STANDAR";
  var pregCol = r.preg ? "#0284c7" : "#64748b";
  var pregTxt = r.preg ? "MTCT + HBIG <12J" : "NON-GRAVIDA";
  return '<svg class="viz-svg" viewBox="0 0 640 54" style="width:100%;height:auto;display:block;margin-bottom:8px;">' +
    '<rect x="2" y="2" width="204" height="50" rx="10" fill="var(--bg-surface)" stroke="' + txCol + '"/>' +
    '<text x="16" y="21" font-size="10" fill="var(--text-muted)">INDIKASI ANTIVIRAL</text>' +
    '<text x="16" y="39" font-size="12" font-weight="700" fill="' + txCol + '">' + txTxt + '</text>' +
    '<rect x="218" y="2" width="204" height="50" rx="10" fill="var(--bg-surface)" stroke="' + hccCol + '"/>' +
    '<text x="232" y="21" font-size="10" fill="var(--text-muted)">SURVEILANS KSH</text>' +
    '<text x="232" y="39" font-size="12" font-weight="700" fill="' + hccCol + '">' + hccTxt + '</text>' +
    '<rect x="434" y="2" width="204" height="50" rx="10" fill="var(--bg-surface)" stroke="' + pregCol + '"/>' +
    '<text x="448" y="21" font-size="10" fill="var(--text-muted)">JALUR PERINATAL</text>' +
    '<text x="448" y="39" font-size="12" font-weight="700" fill="' + pregCol + '">' + pregTxt + '</text>' +
  '</svg>';
}

function renderGehHbvClinicalCalcWidget() {
  return '<div class="viz-widget" id="viz-geh-hbv-calc-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Asisten Klinis Hepatitis B Kronik, Kehamilan (MTCT) &amp; Dosis Ginjal</span>' +
      '<span class="viz-tag">PPHI 2026 &bull; KKI 4</span>' +
    '</div>' +
    '<div id="viz-geh-hbv-calc-svg">' + renderGehHbvSummarySvg() + '</div>' +
    '<div id="viz-geh-hbv-calc-body">' + renderGehHbvClinicalBody() + '</div>' +
  '</div>';
}

function refreshGehHbvCalcWidget() {
  var svgEl = document.getElementById("viz-geh-hbv-calc-svg");
  if (svgEl) svgEl.innerHTML = renderGehHbvSummarySvg();
  var el = document.getElementById("viz-geh-hbv-calc-body");
  if (el) el.innerHTML = renderGehHbvClinicalBody();
}

function setGehHbvCalcTab(t) { gehHbvCalcState.activeTab = t; refreshGehHbvCalcWidget(); }

function applyGehHbvCalcPreset(key) {
  gehHbvCalcState.preset = key;
  if (key === "preg_mtct") {
    Object.assign(gehHbvCalcState, { age: 30, sex: "female", hbeag: "positive", liver: "none", dna: 850000, ast: 28, astUln: 40, alt: 26, altUln: 35, plt: 220, vcte: 5.6, pregnant: "yes", gestWeek: 30, currentDrug: "none", maternalIndication: "no", renal: "no", crcl: 95, lam: "no", risks: [] });
  } else if (key === "cirr_ckd_lam") {
    Object.assign(gehHbvCalcState, { age: 58, sex: "male", hbeag: "negative", liver: "compensated", dna: 45000, ast: 68, astUln: 40, alt: 74, altUln: 40, plt: 98, vcte: 14.2, pregnant: "no", gestWeek: 0, currentDrug: "none", maternalIndication: "no", renal: "yes", crcl: 34, lam: "yes", risks: ["family"] });
  } else {
    Object.assign(gehHbvCalcState, { age: 29, sex: "female", hbeag: "negative", liver: "none", dna: 420, ast: 22, astUln: 40, alt: 21, altUln: 35, plt: 245, vcte: 4.8, pregnant: "no", gestWeek: 0, currentDrug: "none", maternalIndication: "no", renal: "no", crcl: 105, lam: "no", risks: [] });
  }
  refreshGehHbvCalcWidget();
}

function updateGehHbvClinicalCalc() {
  var g = function(id) { return document.getElementById(id); };
  if (g("hbv-c-age")) gehHbvCalcState.age = Number(g("hbv-c-age").value) || 30;
  if (g("hbv-c-hbeag")) gehHbvCalcState.hbeag = g("hbv-c-hbeag").value;
  if (g("hbv-c-liver")) gehHbvCalcState.liver = g("hbv-c-liver").value;
  if (g("hbv-c-dna")) gehHbvCalcState.dna = Number(g("hbv-c-dna").value) || 0;
  if (g("hbv-c-ast")) gehHbvCalcState.ast = Number(g("hbv-c-ast").value) || 0;
  if (g("hbv-c-alt")) gehHbvCalcState.alt = Number(g("hbv-c-alt").value) || 0;
  if (g("hbv-c-plt")) gehHbvCalcState.plt = Number(g("hbv-c-plt").value) || 150;
  if (g("hbv-c-crcl")) gehHbvCalcState.crcl = Number(g("hbv-c-crcl").value) || 90;
  if (g("hbv-c-preg")) gehHbvCalcState.pregnant = g("hbv-c-preg").value;
  if (g("hbv-c-week")) gehHbvCalcState.gestWeek = Number(g("hbv-c-week").value) || 28;
  if (g("hbv-c-lam")) gehHbvCalcState.lam = g("hbv-c-lam").value;
  var rks = [];
  if (g("hbv-rk-hiv") && g("hbv-rk-hiv").checked) rks.push("hiv");
  if (g("hbv-rk-immuno") && g("hbv-rk-immuno").checked) rks.push("immuno");
  if (g("hbv-rk-family") && g("hbv-rk-family").checked) rks.push("family");
  gehHbvCalcState.risks = rks;
  if (g("hbv-rk-renal")) gehHbvCalcState.renal = g("hbv-rk-renal").checked ? "yes" : "no";
  refreshGehHbvCalcWidget();
}

// =========================================================================
// GEH MODULE WIDGET DISPATCHER
// =========================================================================
function renderGehModuleWidget(type) {
  if (type === "geh-esophageal-motility-viz") return renderGehEsophagealMotilityWidget();
  if (type === "geh-forrest-ugib-viz") return renderGehForrestUgibWidget();
  if (type === "geh-variceal-portal-viz") return renderGehVaricealPortalWidget();
  if (type === "geh-lgib-oakland-viz") return renderGehLgibOaklandWidget();
  if (type === "geh-malabsorption-villi-viz") return renderGehMalabsorptionVilliWidget();
  if (type === "geh-ibd-comparison-viz") return renderGehIbdComparisonWidget();
  if (type === "geh-rome-ibs-viz") return renderGehRomeIbsWidget();
  if (type === "geh-colorectal-polyp-viz") return renderGehColorectalPolypWidget();
  if (type === "geh-rvalue-alf-calc") return renderGehRvalueAlfWidget();
  if (type === "geh-hbv-phases-viz") return renderGehHbvPhasesWidget();
  if (type === "geh-hcv-daa-viz") return renderGehHcvDaaWidget();
  if (type === "geh-fib4-maddrey-calc") return renderGehFib4MaddreyWidget();
  if (type === "geh-ascites-saag-viz") return renderGehAscitesSaagWidget();
  if (type === "geh-he-westhaven-viz") return renderGehHeWesthavenWidget();
  if (type === "geh-hcc-bclc-viz") return renderGehHccBclcWidget();
  if (type === "geh-pancreatitis-tg18-viz") return renderGehPancreatitisTg18Widget();
  if (type === "geh-blatchford-calc") return renderGehBlatchfordCalcWidget();
  if (type === "geh-child-meld-calc") return renderGehChildMeldCalcWidget();
  if (type === "geh-hbv-clinical-calc") return renderGehHbvClinicalCalcWidget();
  return "";
}




  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("geh-")) return null;
    return renderGehModuleWidget(type) || null;
  });
  R.registerMotionProvider(getGehVizMotionSpec);

  Object.assign(R.handlers, { getGehVizMotionSpec, renderGehEsophagealMotilityWidget, updateGehEsophagealMotilityViz, renderGehForrestUgibWidget, updateGehForrestUgibViz, renderGehVaricealPortalWidget, updateGehVaricealPortalViz, renderGehLgibOaklandWidget, updateGehLgibOaklandViz, renderGehMalabsorptionVilliWidget, updateGehMalabsorptionVilliViz, renderGehIbdComparisonWidget, updateGehIbdComparisonViz, renderGehRomeIbsWidget, updateGehRomeIbsViz, renderGehColorectalPolypWidget, updateGehColorectalPolypViz, calcGehRvalueAlf, renderGehRvalueAlfWidget, renderGehHbvPhasesWidget, updateGehHbvPhasesViz, renderGehHcvDaaWidget, updateGehHcvDaaViz, calcGehFib4Maddrey, renderGehFib4MaddreyWidget, calcGehAscitesSaag, renderGehAscitesSaagWidget, renderGehHeWesthavenWidget, updateGehHeWesthavenViz, renderGehHccBclcWidget, updateGehHccBclcViz, renderGehPancreatitisTg18Widget, updateGehPancreatitisTg18Viz, calcGehBlatchford, renderGehBlatchfordCalcWidget, calcGehChildMeld, renderGehChildMeldCalcWidget, renderGehHbvClinicalCalcWidget, setGehHbvCalcTab, applyGehHbvCalcPreset, updateGehHbvClinicalCalc, renderGehModuleWidget });
})(window);
