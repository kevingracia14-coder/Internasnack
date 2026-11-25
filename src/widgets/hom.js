/* ==========================================================================
   InternaSnack — Hematologi & Onkologi Medik Interactive Widgets (Apple HIG)
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { escapeHtml, clampNum } = R.utils;
  const {
    vizPlayIconSvg,
    buildSmoothSvgPath,
    renderVizLegend,
    syncSliderAndPill,
    syncVizPresets,
    formatVizReadoutHtml,
    updateVizReadout,
    swapVizSvgFrame,
    renderCardioTabRow,
    renderCardioSliderBlock,
    renderCardioWidgetCard,
    renderCalcGaugeSvg,
    updateCalcGauge,
    updateCalcReadoutTone,
    renderCalcCheckItem
  } = R.viz;

  var homVizState = {
    // 1. hom-1-1: Iron Panel & Hepcidin
    ironProfile: "adb", // "normal", "adb", "acd", "mixed", "thal_trait"

    // 6. hom-2-1: AIHA Thermodynamics & DAT (rAF key: homAiha)
    aihaTemp: 37, // 4..37 C
    aihaType: "warm", // "warm", "cold"

    // 7. hom-2-2: Non-Immune Hemolysis Smear Atlas
    smearMode: "g6pd", // "g6pd", "maha", "hs", "pnh"

    // 10. hom-3-3: Lymphoma Ann Arbor / Lugano & IPI
    lymphMode: "staging", // "staging", "ipi"
    lymphNodes: "above_below", // "single", "same_side", "above_below", "extranodal"
    lymphBSymptoms: true,
    ipiAge60: true,
    ipiStage34: true,
    ipiLdh: true,
    ipiEcog2: false,
    ipiExtra2: false,

    // 11. hom-3-4: Myeloma SPEP & SLiM-CRAB
    myelomaStage: "active_mm", // "normal", "mgus", "smm", "active_mm", "waldenstrom"

    // 13. hom-4-2: ISTH Overt DIC Calculator
    dicPlt: 45, // x10^3/uL
    dicDdimer: "strong", // "none", "mod", "strong"
    dicPtProlong: 4.5, // seconds above ULN
    dicFib: 85, // mg/dL

    // 14. hom-4-3: TRALI vs TACO & Wells DVT
    transfusionTab: "trali_taco", // "trali_taco", "wells_dvt"
    transfusionDx: "trali", // "trali", "taco", "ahtr"

    // 15. hom-5-1: Tumor Lysis Syndrome (rAF key: homTls)
    tlsHour: 24, // 0..72 h
    tlsProphylaxis: "none" // "none", "allopurinol", "rasburicase"
  };

  function getHomVizMotionSpec(key) {
    if (key === "homAiha") {
      return {
        min: 4,
        max: 37,
        start: 4,
        end: 37,
        duration: 6400,
        get: function () { return homVizState.aihaTemp; },
        apply: function (v) { updateHomAihaCoombsViz(v, null, false); }
      };
    }
    if (key === "homTls") {
      return {
        min: 0,
        max: 72,
        start: 0,
        end: 72,
        duration: 6800,
        get: function () { return homVizState.tlsHour; },
        apply: function (v) { updateHomTlsViz(v, null, false); }
      };
    }
    return null;
  }

  // =========================================================================
  // W1. SIMULATOR PANEL BESI, AKSIS HEPSIDIN & sTfR (hom-1-1)
  // =========================================================================
  var HOM_IRON_PROFILES = {
    normal: {
      label: "Normal",
      ferritin: 110, fe: 95, tibc: 310, tsat: 31, hepcidin: 35, stfr: 20,
      tone: "info",
      title: "Homeostasis Besi Normal (Cadangan & Eritropoiesis Seimbang)",
      c1Label: "Profil Laboratorium",
      c1Body: "Feritin 30–300 ng/mL, Saturasi Transferin (TSAT) 20–45%, TIBC normal, Hepsidin fisiologis menjaga blokade ferroportin tetap seimbang.",
      c2Label: "Interpretasi Klinis",
      c2Body: "Tidak ada tanda deplesi besi absolut maupun sekuestrasi makrofag akibat sitokin inflamasi (IL-6)."
    },
    adb: {
      label: "ADB Murni",
      ferritin: 8, fe: 22, tibc: 445, tsat: 5, hepcidin: 4, stfr: 92,
      tone: "danger",
      title: "Anemia Defisiensi Besi (ADB) — Deplesi Cadangan Absolut",
      c1Label: "Ciri Khas Panel Besi",
      c1Body: "<strong>Feritin sangat rendah (&lt;15–30 ng/mL)</strong>, Fe serum rendah, <strong>TIBC meningkat (&gt;400 &mu;g/dL)</strong>, TSAT &lt;15–20%, Hepsidin tersupresi sangat rendah, dan <strong>sTfR meningkat tajam</strong>.",
      c2Label: "Tindakan Wajib SpPD",
      c2Body: "Cari sumber perdarahan kronik (endoskopi saluran cerna pada pria/pascamenopause), berikan besi elemental oral 100–200 mg/hari selang sehari atau besi IV (rumus Ganzoni) bila intoleran/malabsorpsi."
    },
    acd: {
      label: "ACD / Inflamasi",
      ferritin: 420, fe: 28, tibc: 195, tsat: 14, hepcidin: 94, stfr: 22,
      tone: "warning",
      title: "Anemia Penyakit Kronik (ACD) — Sekuestrasi Besi Imbas Hepsidin",
      c1Label: "Mekanisme Hepsidin",
      c1Body: "Sitokin inflamasi (<strong>IL-6</strong>) memicu ekspresi <strong>Hepsidin hepatik tinggi</strong> &rarr; degradasi ferroportin makrofag & enterosit &rarr; besi terperangkap di cadangan: <strong>Feritin normal/tinggi (&gt;100)</strong>, <strong>TIBC menurun</strong>, Fe serum rendah, <strong>sTfR normal</strong>.",
      c2Label: "Board Pitfall",
      c2Body: "Pemberian suplemen besi oral saja pada ACD murni tidak efektif karena blokade ferroportin di mukosa usus. Prioritaskan kendali penyakit inflamasi/infeksi/keganasan dasar!"
    },
    mixed: {
      label: "Kombinasi ADB+ACD",
      ferritin: 55, fe: 20, tibc: 265, tsat: 8, hepcidin: 48, stfr: 78,
      tone: "warning",
      title: "Kombinasi ADB + Anemia Penyakit Kronik (Inflamasi Aktif)",
      c1Label: "Jebakan Diagnostik Feritin",
      c1Body: "Pada inflamasi kronik, feritin merupakan reaktan fase akut sehingga dapat tampak normal (30–100 ng/mL) meski pasien mengalami defisiensi besi sejati! Gunakan <strong>sTfR meningkat</strong> dan <strong>Indeks sTfR/log Feritin &gt;2</strong>.",
      c2Label: "Tatalaksana",
      c2Body: "Koreksi besi tetap diperlukan (sering membutuhkan <strong>besi intravena</strong> untuk mem-bypass hambatan hepsidin intestinal bila CRP tinggi/CKD)."
    },
    thal_trait: {
      label: "Talasemia Trait",
      ferritin: 165, fe: 118, tibc: 290, tsat: 41, hepcidin: 38, stfr: 35,
      tone: "info",
      title: "Talasemia Minor / Trait — Mikrositosis Non-Defisiensi Besi",
      c1Label: "Pembeda Kunci ADB",
      c1Body: "MCV sangat rendah (disproporsional dengan Hb ringan), hitung eritrosit tinggi (<strong>Indeks Mentzer MCV/RBC &lt;13</strong>), namun <strong>Feritin, Fe serum, dan TSAT normal/tinggi</strong>.",
      c2Label: "Board Pitfall",
      c2Body: "Jangan berikan preparat besi jangka panjang pada pembawa sifat talasemia tanpa bukti defisiensi besi (risiko kelebihan beban besi); konfirmasi dengan elektroforesis Hb (HbA2 &gt;3,5%)."
    }
  };

  function buildHomIronPanelSvg(profileKey) {
    var p = HOM_IRON_PROFILES[profileKey] || HOM_IRON_PROFILES.adb;
    var bars = [
      { label: "Feritin (Cadangan)", valText: p.ferritin + " ng/mL", pct: clampNum(p.ferritin / 450, 0.04, 1, 0.1), color: p.ferritin < 30 ? "var(--accent-coral)" : (p.ferritin > 300 ? "var(--accent-secondary)" : "var(--accent-primary)") },
      { label: "Fe Serum (Sirkulasi)", valText: p.fe + " ug/dL", pct: clampNum(p.fe / 160, 0.06, 1, 0.2), color: p.fe < 50 ? "var(--accent-coral)" : "var(--accent-primary)" },
      { label: "TIBC (Kapasitas Ikat)", valText: p.tibc + " ug/dL", pct: clampNum(p.tibc / 500, 0.1, 1, 0.5), color: p.tibc > 390 ? "var(--accent-coral)" : (p.tibc < 240 ? "var(--accent-secondary)" : "var(--accent-primary)") },
      { label: "Saturasi Transferin", valText: p.tsat + "%", pct: clampNum(p.tsat / 50, 0.06, 1, 0.2), color: p.tsat < 16 ? "var(--accent-coral)" : "var(--accent-primary)" },
      { label: "Hepsidin (Blokade)", valText: p.hepcidin + " ng/mL", pct: clampNum(p.hepcidin / 100, 0.04, 1, 0.3), color: p.hepcidin > 70 ? "var(--accent-secondary)" : "var(--viz-purple)" },
      { label: "sTfR (Kebutuhan Sel)", valText: p.stfr + " nmol/L", pct: clampNum(p.stfr / 100, 0.08, 1, 0.2), color: p.stfr > 50 ? "var(--accent-coral)" : "var(--viz-green)" }
    ];

    var rowsHtml = bars.map(function (b, i) {
      var y = 26 + i * 33;
      var w = (b.pct * 225).toFixed(1);
      return '<text x="18" y="' + (y + 13) + '" font-size="9.5" font-weight="700" fill="var(--text-primary)">' + b.label + '</text>' +
        '<rect x="165" y="' + (y + 2) + '" width="225" height="13" rx="6.5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="0.8" />' +
        '<rect x="165" y="' + (y + 2) + '" width="' + w + '" height="13" rx="6.5" fill="' + b.color + '" fill-opacity="0.86" class="viz-smooth-bar" />' +
        '<text x="462" y="' + (y + 13) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="' + b.color + '" style="font-variant-numeric:tabular-nums;">' + b.valText + '</text>';
    }).join("");

    var sTfRIndex = (p.stfr / Math.max(0.5, Math.log10(Math.max(2, p.ferritin)))).toFixed(1);
    return '<svg class="viz-svg" viewBox="0 0 480 250" role="img" aria-label="Simulator Panel Besi & Hepsidin">' +
      '<text x="18" y="16" font-size="9.2" font-weight="800" letter-spacing="0.04em" fill="var(--text-muted)">PROFIL METABOLISME BESI: ' + p.label.toUpperCase() + '</text>' +
      '<text x="462" y="16" text-anchor="end" font-size="9" font-weight="700" fill="var(--text-muted)">Indeks sTfR/log Feritin: ' + sTfRIndex + '</text>' +
      rowsHtml +
      '<rect x="18" y="223" width="444" height="20" rx="7" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="240" y="236" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-secondary)">Aturan Kunci: Feritin &lt;30 = Defisiensi Absolut | Inflamasi + sTfR/log Feritin &gt;2 = Kombinasi ADB+ACD</text>' +
      '</svg>';
  }

  function renderHomIronPanelWidget() {
    var cur = homVizState.ironProfile;
    var p = HOM_IRON_PROFILES[cur] || HOM_IRON_PROFILES.adb;
    var tabs = Object.keys(HOM_IRON_PROFILES).map(function (k) {
      return {
        key: k,
        label: HOM_IRON_PROFILES[k].label,
        onclick: "window.InternaApp.updateHomIronPanelViz('" + k + "')"
      };
    });
    return renderCardioWidgetCard({
      key: "homIronPanel",
      title: "Simulator Panel Besi, Aksis Hepsidin & Rasio sTfR",
      tag: "ANEMIA MIKROSITIK",
      controlsTop: renderCardioTabRow("viz-homIronPanel-tabs", tabs, cur),
      svgHtml: buildHomIronPanelSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "Defisiensi / Deplesi Berat" },
        { color: "var(--accent-secondary)", label: "Sekuestrasi Inflamasi (Hepsidin)" },
        { color: "var(--accent-primary)", label: "Rentang Fisiologis" }
      ]),
      info: {
        tone: p.tone,
        rKey: "iron_" + cur,
        title: p.title,
        c1Label: p.c1Label,
        c1Body: p.c1Body,
        c2Label: p.c2Label,
        c2Body: p.c2Body
      },
      readoutFooter: ""
    });
  }

  function updateHomIronPanelViz(profileKey) {
    if (HOM_IRON_PROFILES[profileKey]) homVizState.ironProfile = profileKey;
    var cur = homVizState.ironProfile;
    var p = HOM_IRON_PROFILES[cur];
    var tabsEl = document.getElementById("viz-homIronPanel-tabs");
    if (tabsEl) {
      var keys = Object.keys(HOM_IRON_PROFILES);
      syncVizPresets("viz-homIronPanel-tabs", keys.map(function (k) { return k === cur; }));
    }
    swapVizSvgFrame("viz-homIronPanel-frame", buildHomIronPanelSvg(cur));
    updateVizReadout("viz-homIronPanel-readout", p.tone, formatVizReadoutHtml(p.title, p.c1Label, p.c1Body, p.c2Label, p.c2Body, ""), "iron_" + cur);
  }

  // =========================================================================
  // W2. SIMULATOR TERMODINAMIKA AIHA & UJI COOMBS DAT (hom-2-1, rAF: homAiha)
  // =========================================================================
  function buildHomAihaSvg(temp, aihaType) {
    var t = clampNum(temp, 4, 37, 37);
    var isWarm = aihaType === "warm";
    // Activity curve: Warm peaks near 37 C; Cold peaks < 22 C (especially 4 C)
    var activity = isWarm
      ? clampNum((t - 15) / 22, 0.08, 1, 0.9)
      : clampNum((34 - t) / 30, 0.06, 1, 0.9);
    var toneColor = activity >= 0.65 ? "var(--accent-coral)" : (activity >= 0.35 ? "var(--accent-secondary)" : "var(--accent-primary)");
    var tx = (40 + ((t - 4) / 33) * 400).toFixed(1);
    var hemolysisSite = isWarm ? "Ekstravaskular (Makrofag Limpa)" : "Aktivasi Komplemen C3b/MAC (Hepar & Intravaskular)";
    var datPattern = isWarm ? "DAT: Anti-IgG (+) kuat +/- C3d" : "DAT: Anti-C3d (+) kuat, Anti-IgG (-)";
    var abBadge = isWarm ? "Autoantibodi IgG (37 C)" : "Aglutinin Dingin IgM (<30 C)";

    var rbcOpacity = (0.35 + activity * 0.65).toFixed(2);
    var clumpingOffset = isWarm ? 0 : Math.round(activity * 14);

    return '<svg class="viz-svg" viewBox="0 0 480 220" role="img" aria-label="Simulator Termodinamika AIHA">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">AKTIVITAS HEMOLISIS vs SUHU TUBUH</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + toneColor + '">' + t.toFixed(0) + ' &deg;C &bull; Aktivitas ' + Math.round(activity * 100) + '%</text>' +
      // Temperature axis bar
      '<rect x="40" y="28" width="400" height="12" rx="6" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<rect x="40" y="28" width="140" height="12" rx="6" fill="var(--viz-blue)" fill-opacity="0.22" />' +
      '<rect x="290" y="28" width="150" height="12" rx="6" fill="var(--accent-coral)" fill-opacity="0.22" />' +
      '<circle cx="' + tx + '" cy="34" r="8" fill="var(--bg-surface)" stroke="' + toneColor + '" stroke-width="3" />' +
      '<text x="40" y="54" font-size="8.2" font-weight="700" fill="var(--viz-blue)">4 &deg;C (Akral Dingin)</text>' +
      '<text x="240" y="54" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">20–25 &deg;C (Suhu Ruang)</text>' +
      '<text x="440" y="54" text-anchor="end" font-size="8.2" font-weight="700" fill="var(--accent-coral)">37 &deg;C (Suhu Inti)</text>' +
      // Left box: Antibody & RBC interaction
      '<rect x="20" y="68" width="215" height="136" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="127" y="85" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">' + abBadge + '</text>' +
      // RBC Circles (agglomerating in cold active, spherocytes in warm active)
      '<circle cx="' + (98 + clumpingOffset) + '" cy="130" r="' + (isWarm && activity > 0.5 ? 16 : 20) + '" fill="var(--accent-coral)" fill-opacity="' + rbcOpacity + '" stroke="var(--accent-coral)" stroke-width="2" />' +
      '<circle cx="' + (156 - clumpingOffset) + '" cy="130" r="' + (isWarm && activity > 0.5 ? 16 : 20) + '" fill="var(--accent-coral)" fill-opacity="' + rbcOpacity + '" stroke="var(--accent-coral)" stroke-width="2" />' +
      '<text x="127" y="172" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-secondary)">' + (isWarm ? (activity > 0.5 ? "Opsonisasi Fc &rarr; Sferosit di Limpa" : "Ikatan IgG minimal di suhu dingin") : (activity > 0.5 ? "Pentamer IgM mengaglutinasi eritrosit!" : "IgM terlepas saat dihangatkan 37 &deg;C")) + '</text>' +
      '<text x="127" y="191" text-anchor="middle" font-size="8" font-weight="700" fill="' + toneColor + '">' + datPattern + '</text>' +
      // Right box: Mechanism & Management
      '<rect x="245" y="68" width="215" height="136" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="88" font-size="8.8" font-weight="800" fill="var(--text-muted)">LOKASI DESTRUKSI</text>' +
      '<text x="260" y="103" font-size="9.2" font-weight="700" fill="var(--text-primary)">' + (isWarm ? "Ekstravaskular (Makrofag Limpa)" : "Komplemen C3b/MAC (Hepar &amp; Intravask.)") + '</text>' +
      '<text x="260" y="128" font-size="8.8" font-weight="800" fill="var(--text-muted)">TERAPI LINI PERTAMA</text>' +
      '<text x="260" y="143" font-size="9.2" font-weight="700" fill="var(--accent-primary)">' + (isWarm ? "Prednison 1 mg/kg +/- Rituximab" : "Hindari Dingin + Rituximab / Sutimlimab") + '</text>' +
      '<text x="260" y="168" font-size="8.8" font-weight="800" fill="var(--text-muted)">JEBAKAN KLINIS</text>' +
      '<text x="260" y="183" font-size="8.6" font-weight="700" fill="var(--accent-coral)">' + (isWarm ? "Hati-hati: Sferosit mirip HS!" : "Steroid &amp; Splenektomi TIDAK EFEKTIF!") + '</text>' +
      '</svg>';
  }

  function getHomAihaInfo(temp, aihaType) {
    var t = clampNum(temp, 4, 37, 37);
    if (aihaType === "warm") {
      return {
        tone: t >= 30 ? "danger" : "info",
        rKey: "aiha_warm_" + (t >= 30 ? "hi" : "lo"),
        title: "Warm AIHA (IgG) — Optimal pada Suhu Tubuh Inti (37 &deg;C)",
        c1Label: "Patofisiologi & Serologi",
        c1Body: "Autoantibodi <strong>IgG</strong> mengopsonisasi eritrosit pada 37 &deg;C lalu difagosit parsial makrofag limpa (membentuk <strong>sferosit</strong>, MCHC naik). <strong>DAT positif Anti-IgG</strong>. Etiologi sekunder tersering: SLE, CLL, obat (metildopa).",
        c2Label: "Manajemen Klinis",
        c2Body: "Lini 1: <strong>Kortikosteroid</strong> (Prednison 1 mg/kgBB/hari). Bila refrakter/dependen steroid &rarr; <strong>Rituximab</strong> (anti-CD20) atau splenektomi. Bila anemia mengancam nyawa, transfusi <em>least-incompatible PRC</em> perlahan."
      };
    }
    return {
      tone: t <= 22 ? "danger" : "info",
      rKey: "aiha_cold_" + (t <= 22 ? "hi" : "lo"),
      title: "Cold Agglutinin Disease (IgM) — Aktif pada Suhu Dingin (<30 &deg;C)",
      c1Label: "Patofisiologi & Serologi",
      c1Body: "Antibodi <strong>IgM pentamer</strong> mengikat eritrosit di kapiler akral dingin (akrosianosis, fenomena Raynaud) dan memfiksasi komplemen <strong>C3d</strong>. Saat darah kembali ke 37 &deg;C, IgM lepas namun C3d menetap &rarr; <strong>DAT positif Anti-C3d saja</strong>.",
      c2Label: "Manajemen & Larangan",
      c2Body: "Wajib <strong>penghindaran paparan dingin &amp; gunakan blood warmer</strong> saat transfusi. Terapi medis: <strong>Rituximab (&plusmn;Bendamustin)</strong> atau Sutimlimab (anti-C1s). <strong>Kortikosteroid &amp; splenektomi tidak efektif</strong> pada Cold AIHA!"
    };
  }

  function renderHomAihaCoombsWidget() {
    var t = homVizState.aihaTemp;
    var type = homVizState.aihaType;
    var info = getHomAihaInfo(t, type);
    var controlsTop = renderCardioTabRow("viz-homAiha-tabs", [
      { key: "warm", label: "Warm AIHA (IgG, 37 C)", onclick: "window.InternaApp.updateHomAihaCoombsViz(null, 'warm', true)" },
      { key: "cold", label: "Cold AIHA (IgM/C3d, 4 C)", onclick: "window.InternaApp.updateHomAihaCoombsViz(null, 'cold', true)" }
    ], type);
    var controlsBottom = renderCardioSliderBlock({
      key: "homAiha",
      label: "Suhu Lingkungan / Darah (&deg;C)",
      pillText: t.toFixed(0) + " &deg;C",
      min: 4,
      max: 37,
      step: 1,
      value: t,
      trackBg: "linear-gradient(90deg, var(--viz-blue) 0%, var(--accent-secondary) 55%, var(--accent-coral) 100%)",
      oninput: "window.InternaApp.updateHomAihaCoombsViz(this.value, null, true)",
      presets: [
        { val: 4, label: "4 C (Akral Dingin)", active: Math.round(t) === 4 },
        { val: 22, label: "22 C (Ruang)", active: Math.round(t) === 22 },
        { val: 37, label: "37 C (Suhu Inti)", active: Math.round(t) === 37 }
      ]
    });

    return renderCardioWidgetCard({
      key: "homAiha",
      title: "Simulator Termodinamika AIHA & Uji Coombs Langsung (DAT)",
      tag: "HEMOLITIK IMUN",
      controlsTop: controlsTop,
      svgHtml: buildHomAihaSvg(t, type),
      controlsBottom: controlsBottom,
      info: info,
      readoutFooter: ""
    });
  }

  function updateHomAihaCoombsViz(tempVal, typeVal, cancelAnim) {
    if (cancelAnim !== false && R.viz && typeof R.viz.stopVizWalkthrough === "function") {
      R.viz.stopVizWalkthrough("homAiha");
    }
    if (tempVal !== null && tempVal !== undefined) homVizState.aihaTemp = clampNum(tempVal, 4, 37, 37);
    if (typeVal === "warm" || typeVal === "cold") {
      homVizState.aihaType = typeVal;
      if (tempVal === null || tempVal === undefined) {
        homVizState.aihaTemp = typeVal === "warm" ? 37 : 4;
      }
    }
    var t = homVizState.aihaTemp;
    var type = homVizState.aihaType;
    syncVizPresets("viz-homAiha-tabs", [type === "warm", type === "cold"]);
    syncSliderAndPill("viz-homAiha-slider", "viz-homAiha-pill", t, t.toFixed(0) + " °C");
    syncVizPresets("viz-homAiha-presets", [Math.round(t) === 4, Math.round(t) === 22, Math.round(t) === 37]);
    swapVizSvgFrame("viz-homAiha-frame", buildHomAihaSvg(t, type));
    var info = getHomAihaInfo(t, type);
    updateVizReadout("viz-homAiha-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""), info.rKey);
  }

  // =========================================================================
  // W3. ATLAS MIKROSKOP MORFOLOGI HEMOLISIS NON-IMUN (hom-2-2)
  // =========================================================================
  var HOM_SMEAR_DATA = {
    g6pd: {
      label: "Defisiensi G6PD",
      cellName: "Bite Cells & Heinz Bodies",
      testName: "Pewarnaan Supravital (Kristal Violet) & Uji Enzim G6PD Pasca-Krisis",
      tone: "warning",
      title: "Defisiensi G6PD — Kerusakan Oksidatif Hemoglobin (X-Linked)",
      c1Label: "Temuan Mikroskop Khas",
      c1Body: "Stres oksidatif (primakuin, dapson, kotrimoksazol, infeksi, fava) mendenaturasi Hb menjadi presipitat <strong>Heinz bodies</strong>. Makrofag limpa menggigit keluar presipitat tersebut sehingga terbentuk <strong>Bite cells (degmacytes)</strong> &amp; <em>Blister cells</em>.",
      c2Label: "Board Pitfall Diagnostik",
      c2Body: "<strong>Jangan periksa enzim G6PD saat krisis hemolisis akut!</strong> Retikulosit muda memiliki kadar enzim G6PD tinggi sehingga memicu <em>negatif palsu</em>; ulangi uji kuantitatif 2–3 bulan setelah fase akut mereda."
    },
    maha: {
      label: "MAHA (TTP/HUS/DIC)",
      cellName: "Schistocytes (Helmet Cells)",
      testName: "Apusan Darah Tepi (Skistosit >1%) + LDH, Retikulosit, ADAMTS13",
      tone: "danger",
      title: "Anemia Hemolitik Mikroangiopati (MAHA) — Fragmentasi Mekanik",
      c1Label: "Temuan Mikroskop Khas",
      c1Body: "Eritrosit terbelah saat melewati jaring fibrin mikrotrombus di arteriol/kapiler membentuk fragmen segitiga/bulan sabit tajam (<strong>Schistocytes / Helmet cells &gt;1%</strong>) disertai trombositopenia berat.",
      c2Label: "Kegawatdaruratan Terkait",
      c2Body: "Wajib segera singkirkan <strong>TTP (PLASMIC score &rarr; Plasma Exchange cito!)</strong>, HUS, DIC, sindrom HELLP, atau hipertensi maligna."
    },
    hs: {
      label: "Sferositosis Herediter",
      cellName: "Spherocytes (Tanpa Central Pallor)",
      testName: "EMA Binding Flow Cytometry / Uji Fragilitas Osmotik (MCHC >36 g/dL)",
      tone: "info",
      title: "Sferositosis Herediter — Defek Protein Sitoskeleton Membran (Ankirin/Spektrin)",
      c1Label: "Temuan Mikroskop Khas",
      c1Body: "Hilangnya area pucat sentral eritrosit (<em>central pallor</em>), ukuran tampak lebih kecil dan hiperkromik bulat sempurna (<strong>Sferosit</strong>) akibat hilangnya luas permukaan membran &rarr; <strong>MCHC meningkat (&gt;35–36 g/dL)</strong>.",
      c2Label: "Pembeda dengan Warm AIHA",
      c2Body: "Keduanya memiliki sferosit pada apusan darah, tetapi <strong>Sferositosis Herediter memiliki Uji Coombs (DAT) NEGATIF</strong>, riwayat keluarga/splenomegali sejak muda, dan batu empedu pigmen."
    },
    pnh: {
      label: "PNH (CD55/CD59-)",
      cellName: "Klon Defisien GPI (Hemolisis Komplemen)",
      testName: "Flow Cytometry FLAER / CD55 & CD59 (Baku Emas)",
      tone: "danger",
      title: "Paroxysmal Nocturnal Hemoglobinuria (PNH) — Mutasi Somatik PIGA",
      c1Label: "Mekanisme & Trias Klinis",
      c1Body: "Defisiensi protein jangkar GPI (<strong>CD55 &amp; CD59</strong>) membuat membran sel rentan lisis komplemen (MAC). Trias klasik: <strong>Hemoglobinuria pagi hari</strong>, <strong>trombosis vena atipikal (Budd-Chiari/porta)</strong>, dan pansitopenia.",
      c2Label: "Diagnostik & Terapi Target",
      c2Body: "Konfirmasi baku emas dengan <strong>Flow Cytometry (FLAER / CD55 / CD59)</strong>, bukan lagi Ham test. Terapi spesifik penghambat komplemen C5: <strong>Eculizumab / Ravulizumab</strong>."
    }
  };

  function buildHomSmearSvg(mode) {
    var d = HOM_SMEAR_DATA[mode] || HOM_SMEAR_DATA.g6pd;
    var cellGraphic = "";
    if (mode === "g6pd") {
      // Bite cells + Heinz body dots
      cellGraphic =
        '<path d="M105,115 A34,34 0 1,1 142,88 A16,16 0 0,0 124,110 A16,16 0 0,0 105,115 Z" fill="var(--accent-coral)" fill-opacity="0.24" stroke="var(--accent-coral)" stroke-width="2.6" />' +
        '<circle cx="92" cy="96" r="4.5" fill="var(--viz-purple)" />' +
        '<circle cx="110" cy="128" r="4" fill="var(--viz-purple)" />' +
        '<circle cx="205" cy="118" r="30" fill="var(--accent-coral)" fill-opacity="0.22" stroke="var(--accent-coral)" stroke-width="2.4" />' +
        '<circle cx="205" cy="118" r="11" fill="var(--bg-surface)" fill-opacity="0.85" />' +
        '<circle cx="222" cy="98" r="5" fill="var(--viz-purple)" />' +
        '<circle cx="187" cy="133" r="4.5" fill="var(--viz-purple)" />' +
        '<text x="155" y="168" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--viz-purple)">Bite Cell + Presipitat Heinz Bodies</text>';
    } else if (mode === "maha") {
      // Schistocyte triangles/crescents
      cellGraphic =
        '<path d="M88,125 L125,84 L132,138 Z" fill="var(--accent-coral)" fill-opacity="0.28" stroke="var(--accent-coral)" stroke-width="2.5" stroke-linejoin="round" />' +
        '<path d="M168,90 A28,28 0 0,1 215,126 L186,120 Z" fill="var(--accent-coral)" fill-opacity="0.28" stroke="var(--accent-coral)" stroke-width="2.5" stroke-linejoin="round" />' +
        '<path d="M132,142 L162,135 L154,158 Z" fill="var(--accent-coral)" fill-opacity="0.28" stroke="var(--accent-coral)" stroke-width="2.2" />' +
        '<line x1="78" y1="110" x2="225" y2="118" stroke="var(--text-muted)" stroke-width="1.4" stroke-dasharray="4,3" />' +
        '<text x="155" y="172" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--accent-coral)">Fragmen Eritrosit Terpotong Benang Fibrin</text>';
    } else if (mode === "hs") {
      // Spherocytes (small, dense, no central pallor)
      cellGraphic =
        '<circle cx="105" cy="110" r="22" fill="var(--accent-coral)" fill-opacity="0.48" stroke="var(--accent-coral)" stroke-width="2.6" />' +
        '<circle cx="158" cy="122" r="20" fill="var(--accent-coral)" fill-opacity="0.48" stroke="var(--accent-coral)" stroke-width="2.6" />' +
        '<circle cx="205" cy="100" r="21" fill="var(--accent-coral)" fill-opacity="0.48" stroke="var(--accent-coral)" stroke-width="2.6" />' +
        '<text x="155" y="168" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--accent-coral)">Mikrosferosit Padat (Tanpa Central Pallor)</text>';
    } else {
      // PNH flow cytometry quadrant visual
      cellGraphic =
        '<rect x="75" y="70" width="160" height="86" rx="8" fill="var(--bg-surface)" stroke="var(--border-strong)" />' +
        '<line x1="155" y1="70" x2="155" y2="156" stroke="var(--border-subtle)" stroke-dasharray="3,3" />' +
        '<line x1="75" y1="113" x2="235" y2="113" stroke="var(--border-subtle)" stroke-dasharray="3,3" />' +
        '<circle cx="195" cy="92" r="14" fill="var(--accent-primary)" fill-opacity="0.25" stroke="var(--accent-primary)" stroke-width="1.8" />' +
        '<text x="195" y="95" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-primary)">Normal</text>' +
        '<circle cx="112" cy="134" r="16" fill="var(--accent-coral)" fill-opacity="0.3" stroke="var(--accent-coral)" stroke-width="2" />' +
        '<text x="112" y="137" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">PNH (-/-)</text>' +
        '<text x="155" y="172" text-anchor="middle" font-size="8.4" font-weight="700" fill="var(--accent-coral)">Klon CD55/CD59 Negatif pada FLAER</text>';
    }

    return '<svg class="viz-svg" viewBox="0 0 480 205" role="img" aria-label="Atlas Morfologi Hemolisis Non-Imun">' +
      '<circle cx="155" cy="112" r="76" fill="var(--bg-surface-subtle)" stroke="var(--border-strong)" stroke-width="2" />' +
      '<text x="155" y="24" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-muted)">LENSA MIKROSKOP / FLOW CYTOMETRY</text>' +
      cellGraphic +
      '<rect x="255" y="34" width="208" height="152" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="270" y="56" font-size="8.6" font-weight="800" fill="var(--text-muted)">ENTITAS KLINIS</text>' +
      '<text x="270" y="72" font-size="11" font-weight="800" fill="var(--text-primary)">' + d.label + '</text>' +
      '<text x="270" y="96" font-size="8.6" font-weight="800" fill="var(--text-muted)">MORFOLOGI / PENANDA</text>' +
      '<text x="270" y="112" font-size="9.5" font-weight="700" fill="var(--accent-coral)">' + d.cellName + '</text>' +
      '<text x="270" y="136" font-size="8.6" font-weight="800" fill="var(--text-muted)">PEMERIKSAAN KONFIRMASI</text>' +
      '<text x="270" y="152" font-size="8.6" font-weight="700" fill="var(--accent-primary)">' + (mode === "pnh" ? "Flow Cytometry FLAER / CD55 / CD59" : (mode === "g6pd" ? "Kuantitatif G6PD (setelah akut)" : (mode === "maha" ? "Apusan (>1% skistosit) + ADAMTS13" : "EMA Binding &amp; Fragilitas Osmotik"))) + '</text>' +
      '<text x="270" y="172" font-size="8" font-weight="600" fill="var(--text-secondary)">Uji Coombs (DAT): NEGATIF</text>' +
      '</svg>';
  }

  function renderHomG6pdMahaSmearWidget() {
    var mode = homVizState.smearMode;
    var d = HOM_SMEAR_DATA[mode] || HOM_SMEAR_DATA.g6pd;
    var tabs = Object.keys(HOM_SMEAR_DATA).map(function (k) {
      return {
        key: k,
        label: HOM_SMEAR_DATA[k].label,
        onclick: "window.InternaApp.updateHomG6pdMahaViz('" + k + "')"
      };
    });
    return renderCardioWidgetCard({
      key: "homSmear",
      title: "Atlas Mikroskop Morfologi Eritrosit Hemolitik Non-Imun",
      tag: "ATLAS MORFOLOGI",
      controlsTop: renderCardioTabRow("viz-homSmear-tabs", tabs, mode),
      svgHtml: buildHomSmearSvg(mode),
      info: {
        tone: d.tone,
        rKey: "smear_" + mode,
        title: d.title,
        c1Label: d.c1Label,
        c1Body: d.c1Body,
        c2Label: d.c2Label,
        c2Body: d.c2Body
      },
      readoutFooter: ""
    });
  }

  function updateHomG6pdMahaViz(mode) {
    if (HOM_SMEAR_DATA[mode]) homVizState.smearMode = mode;
    var cur = homVizState.smearMode;
    var d = HOM_SMEAR_DATA[cur];
    syncVizPresets("viz-homSmear-tabs", Object.keys(HOM_SMEAR_DATA).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-homSmear-frame", buildHomSmearSvg(cur));
    updateVizReadout("viz-homSmear-readout", d.tone, formatVizReadoutHtml(d.title, d.c1Label, d.c1Body, d.c2Label, d.c2Body, ""), "smear_" + cur);
  }

  // =========================================================================
  // W4. SIMULATOR STAGING ANN ARBOR / LUGANO & SKOR IPI LIMFOMA (hom-3-3)
  // =========================================================================
  function getHomLymphStageMeta() {
    var n = homVizState.lymphNodes;
    var b = homVizState.lymphBSymptoms;
    var st = n === "single" ? "I" : (n === "same_side" ? "II" : (n === "above_below" ? "III" : "IV"));
    var full = "Stadium " + st + (b ? "B" : "A");
    var ipi = (homVizState.ipiAge60 ? 1 : 0) + (homVizState.ipiStage34 ? 1 : 0) + (homVizState.ipiLdh ? 1 : 0) + (homVizState.ipiEcog2 ? 1 : 0) + (homVizState.ipiExtra2 ? 1 : 0);
    return { st: st, full: full, ipi: ipi, b: b };
  }

  function buildHomLymphomaSvg() {
    var meta = getHomLymphStageMeta();
    var n = homVizState.lymphNodes;
    var above1 = n === "single" || n === "same_side" || n === "above_below" || n === "extranodal";
    var above2 = n === "same_side" || n === "above_below" || n === "extranodal";
    var below = n === "above_below" || n === "extranodal";
    var organ = n === "extranodal";
    var stColor = meta.st === "IV" || meta.st === "III" ? "var(--accent-coral)" : (meta.st === "II" ? "var(--accent-secondary)" : "var(--accent-primary)");

    return '<svg class="viz-svg" viewBox="0 0 480 215" role="img" aria-label="Staging Ann Arbor Lugano Limfoma">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PETA ANATOMI STADIUM ANN ARBOR / LUGANO</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="11" font-weight="800" fill="' + stColor + '">' + meta.full + ' &bull; IPI Skor ' + meta.ipi + '/5</text>' +
      // Silhouette diagram
      '<rect x="25" y="28" width="190" height="172" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      // Head/neck/torso outline
      '<circle cx="120" cy="52" r="14" fill="none" stroke="var(--text-muted)" stroke-width="1.6" />' +
      '<rect x="90" y="70" width="60" height="106" rx="14" fill="none" stroke="var(--text-muted)" stroke-width="1.6" />' +
      // Diaphragm line
      '<line x1="72" y1="120" x2="168" y2="120" stroke="var(--accent-primary)" stroke-width="1.8" stroke-dasharray="5,3" />' +
      '<text x="172" y="123" font-size="7.5" font-weight="700" fill="var(--accent-primary)">Diafragma</text>' +
      // Lymph node clusters
      '<circle cx="105" cy="76" r="7" fill="' + (above1 ? "var(--accent-coral)" : "var(--border-strong)") + '" />' +
      '<circle cx="136" cy="94" r="7" fill="' + (above2 ? "var(--accent-coral)" : "var(--border-strong)") + '" />' +
      '<circle cx="110" cy="144" r="7" fill="' + (below ? "var(--accent-coral)" : "var(--border-strong)") + '" />' +
      '<rect x="128" y="128" width="16" height="14" rx="4" fill="' + (organ ? "var(--viz-purple)" : "var(--border-strong)") + '" />' +
      '<text x="120" y="191" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-secondary)">Merah: KGB terlibat | Ungu: Ekstranodal difus</text>' +
      // Right panel: Stage & IPI breakdown
      '<rect x="230" y="28" width="230" height="172" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="245" y="49" font-size="9" font-weight="800" fill="var(--text-muted)">KLASIFIKASI LUGANO</text>' +
      '<text x="245" y="68" font-size="13" font-weight="800" fill="' + stColor + '">' + meta.full + '</text>' +
      '<text x="245" y="84" font-size="8.3" font-weight="600" fill="var(--text-secondary)">' + (meta.b ? "Gejala B (+): Demam &gt;38 C, Keringat, BB &darr;" : "Tanpa Gejala B (Asimtomatik konstitusional)") + '</text>' +
      '<line x1="245" y1="98" x2="445" y2="98" stroke="var(--border-subtle)" />' +
      '<text x="245" y="116" font-size="9" font-weight="800" fill="var(--text-muted)">SKOR IPI (DLBCL)</text>' +
      '<text x="245" y="134" font-size="12" font-weight="800" fill="' + (meta.ipi >= 4 ? "var(--accent-coral)" : (meta.ipi >= 2 ? "var(--accent-secondary)" : "var(--accent-primary)")) + '">' + meta.ipi + ' / 5 (' + (meta.ipi <= 1 ? "Risiko Rendah" : (meta.ipi === 2 ? "Menengah-Rendah" : (meta.ipi === 3 ? "Menengah-Tinggi" : "Risiko Tinggi"))) + ')</text>' +
      '<text x="245" y="156" font-size="8.2" font-weight="700" fill="var(--text-primary)">Regimen Baku Emas DLBCL: R-CHOP</text>' +
      '<text x="245" y="172" font-size="8.2" font-weight="700" fill="var(--accent-coral)">Wajib cek HBsAg &amp; Anti-HBc sebelum Rituximab!</text>' +
      '<text x="245" y="188" font-size="8" font-weight="600" fill="var(--text-muted)">HL Klasik: Reed-Sternberg CD15+/CD30+ (ABVD)</text>' +
      '</svg>';
  }

  function getHomLymphInfo() {
    var meta = getHomLymphStageMeta();
    var tone = (meta.st === "III" || meta.st === "IV" || meta.ipi >= 3) ? "danger" : (meta.st === "II" ? "warning" : "info");
    return {
      tone: tone,
      rKey: "lymph_" + meta.full + "_" + meta.ipi,
      title: "Limfoma " + meta.full + " &bull; Skor IPI = " + meta.ipi + " (" + (meta.ipi <= 1 ? "Low Risk" : (meta.ipi <= 3 ? "Intermediate Risk" : "High Risk")) + ")",
      c1Label: "Interpretasi Staging Lugano",
      c1Body: meta.st === "I" ? "Keterlibatan 1 regio KGB atau 1 organ ekstralimfatik terlokalisasi (IE)." : (meta.st === "II" ? "Keterlibatan &ge;2 regio KGB pada <strong>sisi diafragma yang sama</strong>." : (meta.st === "III" ? "Keterlibatan regio KGB di <strong>kedua sisi diafragma</strong> (atas &amp; bawah, atau melibatkan limpa)." : "Keterlibatan difus/diseminata organ ekstralimfatik (hepar, sumsum tulang, paru, tulang).")),
      c2Label: "Kewajiban Klinis Pra-Terapi",
      c2Body: "Diagnosis pasti membutuhkan <strong>biopsi eksisi KGB utuh</strong> (bukan FNAB). Sebelum memberikan <strong>Rituximab</strong> (R-CHOP), wajib skrining HBsAg &amp; Anti-HBc serta profilaksis reaktivasi Hepatitis B."
    };
  }

  function renderHomLymphomaStagingWidget() {
    var meta = getHomLymphStageMeta();
    var info = getHomLymphInfo();
    var controlsTop = '<div class="space-y-2 mb-2">' +
      renderCardioTabRow("viz-homLymph-nodes", [
        { key: "single", label: "I (1 Regio KGB)", onclick: "window.InternaApp.updateHomLymphomaViz('single', null)" },
        { key: "same_side", label: "II (>=2 Regio Sesisi)", onclick: "window.InternaApp.updateHomLymphomaViz('same_side', null)" },
        { key: "above_below", label: "III (Atas & Bawah Diafragma)", onclick: "window.InternaApp.updateHomLymphomaViz('above_below', null)" },
        { key: "extranodal", label: "IV (Ekstranodal / BM)", onclick: "window.InternaApp.updateHomLymphomaViz('extranodal', null)" }
      ], homVizState.lymphNodes) +
      '<div class="viz-calc-grid">' +
        renderCalcCheckItem("hom-lymph-b", "window.InternaApp.updateHomLymphomaViz(null, 'toggle')", "<strong>Gejala B</strong> (Demam &gt;38 C, Keringat Malam, BB &darr; &gt;10%)", { checked: homVizState.lymphBSymptoms, fullWidth: true }) +
        renderCalcCheckItem("hom-ipi-age", "window.InternaApp.updateHomLymphomaViz(null, 'toggle')", "<strong>A</strong> — Usia &gt; 60 Tahun (+1)", { checked: homVizState.ipiAge60 }) +
        renderCalcCheckItem("hom-ipi-ldh", "window.InternaApp.updateHomLymphomaViz(null, 'toggle')", "<strong>L</strong> — LDH Serum Meningkat (+1)", { checked: homVizState.ipiLdh }) +
        renderCalcCheckItem("hom-ipi-ecog", "window.InternaApp.updateHomLymphomaViz(null, 'toggle')", "<strong>P</strong> — Status ECOG &ge; 2 (+1)", { checked: homVizState.ipiEcog2 }) +
        renderCalcCheckItem("hom-ipi-extra", "window.InternaApp.updateHomLymphomaViz(null, 'toggle')", "<strong>E</strong> — Situs Ekstranodal &gt; 1 (+1)", { checked: homVizState.ipiExtra2 }) +
      '</div></div>';

    return renderCardioWidgetCard({
      key: "homLymph",
      title: "Simulator Staging Ann Arbor / Lugano & Skor IPI Limfoma",
      tag: "ONKOLOGI LIMFOID",
      controlsTop: controlsTop,
      svgHtml: buildHomLymphomaSvg(),
      info: info,
      readoutFooter: ""
    });
  }

  function updateHomLymphomaViz(nodeStage, toggleFlag) {
    if (nodeStage) {
      homVizState.lymphNodes = nodeStage;
      homVizState.ipiStage34 = (nodeStage === "above_below" || nodeStage === "extranodal");
    }
    if (toggleFlag === "toggle") {
      var bEl = document.getElementById("hom-lymph-b");
      var aEl = document.getElementById("hom-ipi-age");
      var lEl = document.getElementById("hom-ipi-ldh");
      var eEl = document.getElementById("hom-ipi-ecog");
      var xEl = document.getElementById("hom-ipi-extra");
      if (bEl) homVizState.lymphBSymptoms = bEl.checked;
      if (aEl) homVizState.ipiAge60 = aEl.checked;
      if (lEl) homVizState.ipiLdh = lEl.checked;
      if (eEl) homVizState.ipiEcog2 = eEl.checked;
      if (xEl) homVizState.ipiExtra2 = xEl.checked;
    }
    syncVizPresets("viz-homLymph-nodes", ["single", "same_side", "above_below", "extranodal"].map(function (k) { return k === homVizState.lymphNodes; }));
    swapVizSvgFrame("viz-homLymph-frame", buildHomLymphomaSvg());
    var info = getHomLymphInfo();
    updateVizReadout("viz-homLymph-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""), info.rKey);
  }

  // =========================================================================
  // W5. SIMULATOR KURVA SPEP (M-SPIKE) & EVALUATOR SLIM-CRAB (hom-3-4)
  // =========================================================================
  var HOM_MYELOMA_STAGES = {
    normal: {
      label: "Normal",
      mSpikeH: 22, broad: true, mProt: "0 g/dL", bmPlasma: "<2%", tone: "info",
      title: "Elektroforesis Protein Serum (SPEP) Normal",
      c1Label: "Pola Densitometri",
      c1Body: "Puncak Albumin tertinggi di kiri, diikuti &alpha;1, &alpha;2, &beta;, dan zona &gamma;-globulin berbentuk kurva landai lebar (<em>polyclonal</em>).",
      c2Label: "Klinis",
      c2Body: "Tidak ada paraprotein monoklonal."
    },
    mgus: {
      label: "MGUS",
      mSpikeH: 52, broad: false, mProt: "<3,0 g/dL", bmPlasma: "<10%", tone: "info",
      title: "Monoclonal Gammopathy of Undetermined Significance (MGUS)",
      c1Label: "Kriteria Diagnostik IMWG",
      c1Body: "<strong>Protein M &lt; 3,0 g/dL</strong>, sel plasma sumsum tulang <strong>&lt; 10%</strong>, dan <strong>TIDAK ada</strong> kerusakan organ SLiM-CRAB.",
      c2Label: "Manajemen",
      c2Body: "Risiko progresi ~1% per tahun menjadi MM/amiloidosis. Cukup observasi &amp; pemantauan berkala tanpa kemoterapi."
    },
    smm: {
      label: "Smoldering MM",
      mSpikeH: 88, broad: false, mProt: ">=3,0 g/dL", bmPlasma: "10–59%", tone: "warning",
      title: "Smoldering Multiple Myeloma (SMM) — Fase Asimtomatik Risiko Lanjut",
      c1Label: "Kriteria Diagnostik IMWG",
      c1Body: "Protein M serum <strong>&ge; 3,0 g/dL</strong> (atau urin &ge;500 mg/24j) dan/atau sel plasma BM <strong>10–59%</strong>, namun <strong>TANPA SLiM-CRAB</strong> maupun amiloidosis.",
      c2Label: "Board Pitfall",
      c2Body: "Jika sel plasma BM mencapai <strong>&ge;60%</strong> atau rasio sFLC &ge;100 atau &gt;1 lesi MRI fokal, status berubah menjadi Active MM!"
    },
    active_mm: {
      label: "Active MM (SLiM-CRAB)",
      mSpikeH: 122, broad: false, mProt: "Spike Tajam IgG/IgA", bmPlasma: ">=10% + SLiM-CRAB", tone: "danger",
      title: "Mieloma Multipel Aktif — Indikasi Terapi Sistemik Segera",
      c1Label: "Kriteria SLiM-CRAB",
      c1Body: "Sel plasma klonal BM &ge;10% + &ge;1: <strong>C</strong>alcium &gt;11, <strong>R</strong>enal Cr &gt;2 / eGFR &lt;40, <strong>A</strong>nemia Hb &lt;10, <strong>B</strong>one lesi litik (&ge;1), atau biomarker <strong>SLiM</strong> (&ge;60% BM, FLC ratio &ge;100, &gt;1 lesi MRI).",
      c2Label: "Terapi & Jebakan Urin",
      c2Body: "Induksi <strong>VRd (&plusmn;Daratumumab)</strong> + ASCT + Zoledronat. Ingat: <strong>dipstik urin negatif palsu</strong> terhadap protein Bence-Jones (harus periksa sFLC / IFE urin)!"
    },
    waldenstrom: {
      label: "Waldenström (IgM)",
      mSpikeH: 108, broad: false, mProt: "IgM Monoklonal", bmPlasma: "Limfoplasmasitik", tone: "danger",
      title: "Makroglobulinemia Waldenström — Sindrom Hiperviskositas (MYD88 L265P)",
      c1Label: "Pembeda Utama dengan MM",
      c1Body: "Paraprotein <strong>IgM monoklonal</strong> besar memicu <strong>hiperviskositas darah</strong> (perdarahan mukosa, gangguan visus, <em>sausage-link retinal veins</em>, nyeri kepala) dan mutasi <strong>MYD88 L265P</strong> (&gt;90%), namun <strong>tanpa lesi tulang litik</strong>.",
      c2Label: "Penanganan Darurat",
      c2Body: "Sindrom hiperviskositas adalah indikasi <strong>Plasmapheresis CITO</strong> sebelum memulai rituximab/kemoterapi atau BTK inhibitor."
    }
  };

  function buildHomMyelomaSvg(stageKey) {
    var s = HOM_MYELOMA_STAGES[stageKey] || HOM_MYELOMA_STAGES.active_mm;
    var baseY = 165;
    var spikeY = baseY - s.mSpikeH;
    var gammaPath = s.broad
      ? "M 285,165 C 315,165 330,140 355,140 C 380,140 395,165 430,165"
      : "M 285,165 L 332,162 L 348," + spikeY + " L 364,162 L 430,165";
    var fullPath = "M 35,165 L 62,162 L 88,42 L 114,162 L 142,148 L 166,162 L 194,142 L 220,162 L 252,135 L 285,165 " + gammaPath.slice(11);
    var spikeColor = s.tone === "danger" ? "var(--accent-coral)" : (s.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)");

    return '<svg class="viz-svg" viewBox="0 0 480 210" role="img" aria-label="Kurva SPEP Mieloma Multipel">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">DENSITOMETRI ELEKTROFORESIS PROTEIN SERUM (SPEP)</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + spikeColor + '">' + s.mProt + ' &bull; BM: ' + s.bmPlasma + '</text>' +
      '<rect x="20" y="25" width="440" height="158" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<line x1="35" y1="165" x2="445" y2="165" stroke="var(--border-strong)" stroke-width="1.2" />' +
      '<path d="' + fullPath + '" fill="none" stroke="var(--accent-primary)" stroke-width="2.6" stroke-linejoin="round" />' +
      (!s.broad ? '<path d="M 332,162 L 348,' + spikeY + ' L 364,162 Z" fill="' + spikeColor + '" fill-opacity="0.28" stroke="' + spikeColor + '" stroke-width="2.2" />' : '') +
      (!s.broad ? '<text x="348" y="' + (spikeY - 8) + '" text-anchor="middle" font-size="9.5" font-weight="800" fill="' + spikeColor + '">M-SPIKE</text>' : '<text x="355" y="128" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">Poliklonal Normal</text>') +
      '<text x="88" y="178" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">Albumin</text>' +
      '<text x="154" y="178" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">&alpha;1</text>' +
      '<text x="207" y="178" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">&alpha;2</text>' +
      '<text x="252" y="178" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">&beta;</text>' +
      '<text x="355" y="178" text-anchor="middle" font-size="8.5" font-weight="800" fill="' + spikeColor + '">&gamma; (Gamma)</text>' +
      '<text x="240" y="199" text-anchor="middle" font-size="8.4" font-weight="700" fill="var(--text-secondary)">Gunakan IFE + sFLC untuk mengonfirmasi jenis rantai berat/ringan (kappa vs lambda)</text>' +
      '</svg>';
  }

  function renderHomMyelomaSlimcrabWidget() {
    var cur = homVizState.myelomaStage;
    var s = HOM_MYELOMA_STAGES[cur] || HOM_MYELOMA_STAGES.active_mm;
    var tabs = Object.keys(HOM_MYELOMA_STAGES).map(function (k) {
      return {
        key: k,
        label: HOM_MYELOMA_STAGES[k].label,
        onclick: "window.InternaApp.updateHomMyelomaViz('" + k + "')"
      };
    });
    return renderCardioWidgetCard({
      key: "homMyeloma",
      title: "Simulator Kurva SPEP (M-Spike) & Evaluator Kriteria SLiM-CRAB",
      tag: "DISKRASIA SEL PLASMA",
      controlsTop: renderCardioTabRow("viz-homMyeloma-tabs", tabs, cur),
      svgHtml: buildHomMyelomaSvg(cur),
      info: {
        tone: s.tone,
        rKey: "mm_" + cur,
        title: s.title,
        c1Label: s.c1Label,
        c1Body: s.c1Body,
        c2Label: s.c2Label,
        c2Body: s.c2Body
      },
      readoutFooter: ""
    });
  }

  function updateHomMyelomaViz(stageKey) {
    if (HOM_MYELOMA_STAGES[stageKey]) homVizState.myelomaStage = stageKey;
    var cur = homVizState.myelomaStage;
    var s = HOM_MYELOMA_STAGES[cur];
    syncVizPresets("viz-homMyeloma-tabs", Object.keys(HOM_MYELOMA_STAGES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-homMyeloma-frame", buildHomMyelomaSvg(cur));
    updateVizReadout("viz-homMyeloma-readout", s.tone, formatVizReadoutHtml(s.title, s.c1Label, s.c1Body, s.c2Label, s.c2Body, ""), "mm_" + cur);
  }

  // =========================================================================
  // W6. KALKULATOR SKOR ISTH OVERT DIC & PEMBEDA SIROSIS (hom-4-2)
  // =========================================================================
  function calcHomDicIsth() {
    var pltEl = document.getElementById("hom-dic-plt");
    var ddEl = document.getElementById("hom-dic-ddimer");
    var ptEl = document.getElementById("hom-dic-pt");
    var fibEl = document.getElementById("hom-dic-fib");

    var plt = clampNum(pltEl ? pltEl.value : homVizState.dicPlt, 0, 500, 45);
    var dd = ddEl ? ddEl.value : homVizState.dicDdimer;
    var pt = clampNum(ptEl ? ptEl.value : homVizState.dicPtProlong, 0, 30, 4.5);
    var fib = clampNum(fibEl ? fibEl.value : homVizState.dicFib, 10, 600, 85);

    homVizState.dicPlt = plt;
    homVizState.dicDdimer = dd;
    homVizState.dicPtProlong = pt;
    homVizState.dicFib = fib;

    var sPlt = plt < 50 ? 2 : (plt < 100 ? 1 : 0);
    var sDd = dd === "strong" ? 3 : (dd === "mod" ? 2 : 0);
    var sPt = pt >= 6 ? 2 : (pt >= 3 ? 1 : 0);
    var sFib = fib < 100 ? 1 : 0;
    var total = sPlt + sDd + sPt + sFib;
    var isOvert = total >= 5;

    var toneColor = isOvert ? "var(--accent-coral)" : (total >= 3 ? "var(--accent-secondary)" : "var(--accent-primary)");
    updateCalcGauge("calc-hom-dic", total / 8, "Skor ISTH: " + total + " / 8 (" + (isOvert ? "OVERT DIC" : "Non-Overt") + ")", toneColor);

    var pill = document.getElementById("hom-dic-score-pill");
    if (pill) pill.textContent = "Skor " + total + " / 8";

    var res = document.getElementById("widget-hom-dic-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        isOvert ? "danger" : (total >= 3 ? "warning" : "info"),
        "dic_" + total + "_" + sFib,
        '<p class="font-bold text-[var(--text-primary)]">Skor ISTH = ' + total + ' / 8 Poin (' + (isOvert ? "Memenuhi Kriteria Overt DIC &ge;5" : "Belum Overt DIC (&lt;5) — Ulangi Evaluasi Serial 12–24 Jam") + ')</p>' +
        '<div class="viz-readout-grid mt-1">' +
          '<p><strong>Rincian Poin:</strong> Trombosit (+' + sPlt + '), D-Dimer/FDP (+' + sDd + '), Pemanjangan PT (+' + sPt + '), Fibrinogen (+' + sFib + ').</p>' +
          '<p><strong>Pembeda Sirosis Hati:</strong> Pada DIC murni, kadar <strong>Faktor VIII turun</strong> akibat konsumsi koagulopati; pada Sirosis Hati, <strong>Faktor VIII normal/tinggi</strong> (diproduksi endotel)!</p>' +
        '</div>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Terapi Suportif DIC:</strong> Atasi etiologi dasar (sepsis/IUFD/APL) + <strong>Kriopresipitat</strong> bila fibrinogen &lt;100–150 mg/dL, <strong>FFP</strong> bila PT/aPTT memanjang dengan perdarahan aktif, <strong>TC</strong> bila trombosit &lt;20.000/&mu;L (&lt;50.000/&mu;L bila berdarah).</p>'
      );
    }
  }

  function renderHomDicIsthWidget() {
    return '<div class="viz-widget" id="viz-calc-hom-dic-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Kalkulator Skor ISTH Overt DIC &amp; Pembeda Koagulopati Sirosis</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="hom-dic-score-pill">Skor 7 / 8</span><span class="viz-tag">KOAGULOPATI</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-dic-plt">Trombosit (&times;10&sup3;/&mu;L)</label><input type="number" id="hom-dic-plt" value="45" min="0" max="500" class="viz-calc-input" oninput="window.InternaApp.calcHomDicIsth()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-dic-ddimer">Peningkatan D-Dimer</label><select id="hom-dic-ddimer" class="viz-calc-input" onchange="window.InternaApp.calcHomDicIsth()"><option value="none">Normal (0)</option><option value="mod">Moderat (+2)</option><option value="strong" selected>Sangat Tinggi (+3)</option></select></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-dic-pt">Pemanjangan PT (detik)</label><input type="number" id="hom-dic-pt" step="0.5" value="4.5" min="0" max="30" class="viz-calc-input" oninput="window.InternaApp.calcHomDicIsth()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-dic-fib">Fibrinogen (mg/dL)</label><input type="number" id="hom-dic-fib" value="85" min="10" max="600" class="viz-calc-input" oninput="window.InternaApp.calcHomDicIsth()" /></div>' +
      '</div>' +
      renderCalcGaugeSvg("calc-hom-dic", "SKOR ISTH OVERT DIC", 7 / 8, "Skor ISTH: 7 / 8 (OVERT DIC)", "var(--accent-coral)", [
        { from: 0, to: 0.5, fill: "var(--accent-primary)", rx: 7, label: "0–4: Non-Overt (Pantau)", textFill: "var(--accent-primary)" },
        { from: 0.5, to: 1, fill: "var(--accent-coral)", rx: 7, label: "5–8: Overt DIC (+)", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-hom-dic-result" class="viz-readout" data-tone="danger" data-last-key="dic_init">' +
        '<p class="font-bold text-[var(--text-primary)]">Skor ISTH = 7 / 8 Poin (Memenuhi Kriteria Overt DIC &ge;5)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">Pembeda Sirosis Hati: Faktor VIII turun pada DIC akibat konsumsi masif, sedangkan pada sirosis hati kadar Faktor VIII normal atau meningkat. Berikan kriopresipitat bila fibrinogen &lt;100–150 mg/dL.</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // W7. SIMULATOR TRALI vs TACO & KALKULATOR WELLS DVT (hom-4-3)
  // =========================================================================
  var HOM_TRANSFUSION_DATA = {
    trali: {
      label: "TRALI (Non-Kardiogenik)",
      onset: "<= 6 Jam", bp: "Hipotensi / Syok", bnp: "Normal (<100 pg/mL)", jvp: "Normal (Tidak naik)",
      diuretic: "KONTRAINDIKASI!", tone: "danger",
      title: "TRALI (Transfusion-Related Acute Lung Injury) — Edema Paru Permeabilitas",
      c1Label: "Patofisiologi & Diagnosis",
      c1Body: "Antibodi anti-HLA/HNA plasma donor (sering dari donor multipara) mengaktivasi neutrofil di kapiler paru &le;6 jam pascatransfusi &rarr; kebocoran kapiler alveoli bilateral (PaO2/FiO2 &le;300), <strong>hipotensi, demam, JVP &amp; BNP tidak meningkat</strong>.",
      c2Label: "Manajemen Darurat",
      c2Body: "<strong>Hentikan transfusi segera!</strong> Beri dukungan oksigen/ventilasi mekanik protektif &amp; cairan hati-hati bila syok. <strong>HINDARI DIURETIK (Furosemid)</strong> karena memperburuk hipotensi!"
    },
    taco: {
      label: "TACO (Volume Overload)",
      onset: "<= 6–12 Jam", bp: "Hipertensi Sistolik", bnp: "Sangat Meningkat", jvp: "JVP Meningkat + Ronki",
      diuretic: "FUROSEMID IV Lini 1", tone: "warning",
      title: "TACO (Transfusion-Associated Circulatory Overload) — Edema Hidrostatik",
      c1Label: "Patofisiologi & Faktor Risiko",
      c1Body: "Kelebihan volume intravaskular pada pasien lansia, gagal jantung, atau PGK akibat kecepatan transfusi terlalu cepat &rarr; <strong>hipertensi akut, distensi vena jugularis (JVP naik), S3 gallop, dan lonjakan BNP/NT-proBNP</strong>.",
      c2Label: "Manajemen Darurat",
      c2Body: "Hentikan/perlambat transfusi, posisikan duduk tegak (<em>semi-Fowler</em>), oksigen, dan berikan <strong>Diuretik Loop (Furosemid IV 20–40 mg)</strong>."
    },
    ahtr: {
      label: "AHTR (Inkompatibilitas ABO)",
      onset: "Menit Pertama", bp: "Syok Hipotensif", bnp: "Normal", jvp: "Normal",
      diuretic: "Hidrasi NaCl 0,9% + Target UOP", tone: "danger",
      title: "Acute Hemolytic Transfusion Reaction (AHTR) — Inkompatibilitas ABO",
      c1Label: "Trias & Komplikasi Fatal",
      c1Body: "Hemolisis intravaskular masif dimediasi IgM anti-A/B &amp; komplemen akibat kesalahan identifikasi sampel/kantong darah. Trias: <strong>demam tinggi menggigil, nyeri pinggang/flank, dan hemoglobinuria</strong> berisiko AKI &amp; DIC.",
      c2Label: "Langkah Menit Pertama",
      c2Body: "<strong>STOP transfusi detik itu juga</strong>, pertahankan akses vena dengan <strong>NaCl 0,9% agresif</strong> (target diuresis &ge;100 mL/jam), kirim ulang kantong darah &amp; sampel pasien ke bank darah (DAT + ulang crossmatch)."
    }
  };

  function buildHomTransfusionSvg(dxKey) {
    var d = HOM_TRANSFUSION_DATA[dxKey] || HOM_TRANSFUSION_DATA.trali;
    var badgeColor = d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-secondary)";
    return '<svg class="viz-svg" viewBox="0 0 480 185" role="img" aria-label="Perbandingan Reaksi Transfusi Akut">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PROFIL HEMODINAMIK &amp; PARU PASCATRANSFUSI</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + badgeColor + '">' + d.label + '</text>' +
      '<rect x="20" y="28" width="212" height="65" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="47" font-size="8.5" font-weight="800" fill="var(--text-muted)">TEKANAN DARAH &amp; JVP</text>' +
      '<text x="32" y="65" font-size="11" font-weight="800" fill="' + badgeColor + '">' + d.bp + '</text>' +
      '<text x="32" y="81" font-size="8.6" font-weight="700" fill="var(--text-secondary)">JVP: ' + d.jvp + '</text>' +
      '<rect x="248" y="28" width="212" height="65" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="47" font-size="8.5" font-weight="800" fill="var(--text-muted)">BIOMARKER BNP &amp; AWITAN</text>' +
      '<text x="260" y="65" font-size="11" font-weight="800" fill="var(--text-primary)">BNP: ' + d.bnp + '</text>' +
      '<text x="260" y="81" font-size="8.6" font-weight="700" fill="var(--text-secondary)">Onset: ' + d.onset + '</text>' +
      '<rect x="20" y="106" width="440" height="62" rx="12" fill="var(--bg-surface-subtle)" stroke="' + badgeColor + '" stroke-width="1.4" />' +
      '<text x="240" y="128" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-muted)">KEPUTUSAN TERAPI CAIRAN / DIURETIK</text>' +
      '<text x="240" y="150" text-anchor="middle" font-size="12.5" font-weight="800" fill="' + badgeColor + '">' + d.diuretic + '</text>' +
      '</svg>';
  }

  function calcHomWellsDvt() {
    var ids = ["wells-ca", "wells-para", "wells-bed", "wells-tend", "wells-leg", "wells-calf", "wells-pit", "wells-coll", "wells-prev"];
    var score = 0;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.checked) score += 1;
    });
    var altEl = document.getElementById("wells-alt");
    if (altEl && altEl.checked) score -= 2;

    var likely = score >= 2;
    var tone = likely ? "danger" : "info";
    var pill = document.getElementById("wells-dvt-pill");
    if (pill) pill.textContent = "Skor Wells: " + score;
    updateCalcGauge("calc-hom-wells", clampNum((score + 2) / 10, 0, 1, 0.3), "Skor " + score + " (" + (likely ? "DVT Likely >=2" : "DVT Unlikely <2") + ")", likely ? "var(--accent-coral)" : "var(--accent-primary)");
    var res = document.getElementById("widget-hom-wells-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        tone,
        "wells_" + score,
        '<p class="font-bold text-[var(--text-primary)]">Skor Wells DVT = ' + score + ' (' + (likely ? "Probabilitas Tinggi / DVT Likely (&ge;2)" : "Probabilitas Rendah / DVT Unlikely (&lt;2)") + ')</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">' + (likely ? '<strong>Langkah Diagnostik Wajib:</strong> Langsung lakukan <strong>USG Doppler Kompresi Vena Proksimal</strong> (tidak perlu menunggu D-Dimer).' : '<strong>Langkah Diagnostik Wajib:</strong> Periksa <strong>D-Dimer kuantitatif sensitivitas tinggi</strong>; bila negatif &rarr; DVT tersingkirkan tanpa USG!') + '</p>'
      );
    }
  }

  function renderHomWellsDvtTransfusionWidget() {
    var tab = homVizState.transfusionTab;
    var dx = homVizState.transfusionDx;
    var d = HOM_TRANSFUSION_DATA[dx] || HOM_TRANSFUSION_DATA.trali;

    var modeTabs = renderCardioTabRow("viz-homTrans-mode", [
      { key: "trali_taco", label: "Reaksi Transfusi (TRALI vs TACO vs AHTR)", onclick: "window.InternaApp.updateHomTransfusionViz('tab', 'trali_taco')" },
      { key: "wells_dvt", label: "Kalkulator Skor Wells DVT", onclick: "window.InternaApp.updateHomTransfusionViz('tab', 'wells_dvt')" }
    ], tab);

    var bodyHtml = "";
    if (tab === "trali_taco") {
      bodyHtml = renderCardioTabRow("viz-homTrans-dx", [
        { key: "trali", label: "TRALI", onclick: "window.InternaApp.updateHomTransfusionViz('dx', 'trali')" },
        { key: "taco", label: "TACO", onclick: "window.InternaApp.updateHomTransfusionViz('dx', 'taco')" },
        { key: "ahtr", label: "AHTR (ABO)", onclick: "window.InternaApp.updateHomTransfusionViz('dx', 'ahtr')" }
      ], dx) +
      '<div class="viz-svg-frame" id="viz-homTrans-frame">' + buildHomTransfusionSvg(dx) + '</div>' +
      '<div id="viz-homTrans-readout" class="viz-readout" data-tone="' + d.tone + '" data-last-key="tr_' + dx + '">' +
        formatVizReadoutHtml(d.title, d.c1Label, d.c1Body, d.c2Label, d.c2Body, "") +
      '</div>';
    } else {
      bodyHtml = '<div class="viz-calc-grid mb-2">' +
        renderCalcCheckItem("wells-ca", "window.InternaApp.calcHomWellsDvt()", "Kanker aktif / terapi &le;6 bln (+1)", { checked: true }) +
        renderCalcCheckItem("wells-para", "window.InternaApp.calcHomWellsDvt()", "Paralisis / imobilisasi gips (+1)") +
        renderCalcCheckItem("wells-bed", "window.InternaApp.calcHomWellsDvt()", "Tirah baring &gt;3 hari / operasi mayor (+1)") +
        renderCalcCheckItem("wells-tend", "window.InternaApp.calcHomWellsDvt()", "Nyeri tekan sepanjang vena dalam (+1)", { checked: true }) +
        renderCalcCheckItem("wells-leg", "window.InternaApp.calcHomWellsDvt()", "Pembengkakan seluruh tungkai (+1)") +
        renderCalcCheckItem("wells-calf", "window.InternaApp.calcHomWellsDvt()", "Betis bengkak &gt;3 cm dr sisi sehat (+1)", { checked: true }) +
        renderCalcCheckItem("wells-pit", "window.InternaApp.calcHomWellsDvt()", "Edema pitting unilateral (+1)") +
        renderCalcCheckItem("wells-coll", "window.InternaApp.calcHomWellsDvt()", "Vena superfisial kolateral (+1)") +
        renderCalcCheckItem("wells-prev", "window.InternaApp.calcHomWellsDvt()", "Riwayat DVT terdokumentasi (+1)") +
        renderCalcCheckItem("wells-alt", "window.InternaApp.calcHomWellsDvt()", "Diagnosis alternatif sama/lebih mungkin (-2)") +
      '</div>' +
      renderCalcGaugeSvg("calc-hom-wells", "STRATIFIKASI WELLS DVT", 0.5, "Skor 3 (DVT Likely >=2)", "var(--accent-coral)", [
        { from: 0, to: 0.4, fill: "var(--accent-primary)", rx: 7, label: "<2: DVT Unlikely (D-Dimer)", textFill: "var(--accent-primary)" },
        { from: 0.4, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">=2: DVT Likely (USG Doppler)", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-hom-wells-result" class="viz-readout" data-tone="danger" data-last-key="wells_init">' +
        '<p class="font-bold text-[var(--text-primary)]">Skor Wells DVT = 3 (Probabilitas Tinggi / DVT Likely &ge;2)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Langkah Diagnostik Wajib:</strong> Langsung lakukan <strong>USG Doppler Kompresi Vena Proksimal</strong>; bila terkonfirmasi pada kanker aktif, berikan LMWH atau DOAC (Apixaban/Rivaroxaban/Edoxaban).</p>' +
      '</div>';
    }

    return '<div class="viz-widget" id="viz-homTrans-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Simulator Reaksi Transfusi Akut &amp; Kalkulator Wells DVT</span>' +
        '<span class="viz-tag" id="wells-dvt-pill">TRANSFUSI &amp; TROMBOSIS</span>' +
      '</div>' +
      modeTabs +
      bodyHtml +
    '</div>';
  }

  function updateHomTransfusionViz(kind, val) {
    if (kind === "tab") {
      homVizState.transfusionTab = val;
      var card = document.getElementById("viz-homTrans-card");
      if (card) card.outerHTML = renderHomWellsDvtTransfusionWidget();
      if (val === "wells_dvt") calcHomWellsDvt();
      return;
    }
    if (kind === "dx" && HOM_TRANSFUSION_DATA[val]) {
      homVizState.transfusionDx = val;
      var d = HOM_TRANSFUSION_DATA[val];
      syncVizPresets("viz-homTrans-dx", ["trali", "taco", "ahtr"].map(function (k) { return k === val; }));
      swapVizSvgFrame("viz-homTrans-frame", buildHomTransfusionSvg(val));
      updateVizReadout("viz-homTrans-readout", d.tone, formatVizReadoutHtml(d.title, d.c1Label, d.c1Body, d.c2Label, d.c2Body, ""), "tr_" + val);
    }
  }

  // =========================================================================
  // W8. SIMULATOR SINDROM LISIS TUMOR 72 JAM (hom-5-1, rAF: homTls)
  // =========================================================================
  function calcHomTlsMetrics(hour, proph) {
    var h = clampNum(hour, 0, 72, 24);
    var pFactor = h / 72;
    var peak = Math.sin(clampNum(h / 48, 0, 1, 0) * Math.PI * 0.85);
    var k = proph === "rasburicase" ? 4.4 + peak * 1.1 : (proph === "allopurinol" ? 4.6 + peak * 1.7 : 4.8 + peak * 2.3);
    var po4 = proph === "rasburicase" ? 4.0 + peak * 2.2 : 4.2 + peak * 3.4;
    var ua = proph === "rasburicase" ? Math.max(1.8, 7.8 - pFactor * 5.6) : (proph === "allopurinol" ? 6.8 + peak * 1.9 : 7.5 + peak * 5.2);
    var ca = Math.max(5.8, 9.2 - (po4 - 4.0) * 0.85);
    return { h: h, k: k, po4: po4, ua: ua, ca: ca };
  }

  function buildHomTlsSvg(hour, proph) {
    var m = calcHomTlsMetrics(hour, proph);
    var xs = [0, 12, 24, 36, 48, 60, 72];
    var mapX = function (hVal) { return 40 + (hVal / 72) * 400; };
    var uaPts = xs.map(function (hx) {
      var val = calcHomTlsMetrics(hx, proph).ua;
      return [mapX(hx), 158 - clampNum((val - 1) / 13, 0, 1, 0.5) * 112];
    });
    var kPts = xs.map(function (hx) {
      var val = calcHomTlsMetrics(hx, proph).k;
      return [mapX(hx), 158 - clampNum((val - 3.5) / 4.0, 0, 1, 0.4) * 112];
    });
    var caPts = xs.map(function (hx) {
      var val = calcHomTlsMetrics(hx, proph).ca;
      return [mapX(hx), 158 - clampNum((val - 5.0) / 5.5, 0, 1, 0.5) * 112];
    });

    var curX = mapX(m.h).toFixed(1);
    return '<svg class="viz-svg" viewBox="0 0 480 205" role="img" aria-label="Simulator Kinetika Sindrom Lisis Tumor">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">KINETIKA METABOLIT TLS (0–72 JAM)</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + (m.ua >= 8 || m.k >= 6 ? "var(--accent-coral)" : "var(--accent-primary)") + '">Jam ke-' + Math.round(m.h) + ' | UA ' + m.ua.toFixed(1) + ' | K ' + m.k.toFixed(1) + ' | Ca ' + m.ca.toFixed(1) + '</text>' +
      '<rect x="35" y="28" width="415" height="140" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<path d="' + buildSmoothSvgPath(uaPts) + '" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" />' +
      '<path d="' + buildSmoothSvgPath(kPts) + '" fill="none" stroke="var(--accent-secondary)" stroke-width="2.4" />' +
      '<path d="' + buildSmoothSvgPath(caPts) + '" fill="none" stroke="var(--accent-primary)" stroke-width="2.4" stroke-dasharray="5,3" />' +
      '<line x1="' + curX + '" y1="32" x2="' + curX + '" y2="164" stroke="var(--text-primary)" stroke-width="1.6" stroke-dasharray="3,3" />' +
      '<text x="40" y="182" font-size="8.2" font-weight="700" fill="var(--text-muted)">0 jam (Kemo)</text>' +
      '<text x="240" y="182" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">36 jam (Puncak Lisis)</text>' +
      '<text x="440" y="182" text-anchor="end" font-size="8.2" font-weight="700" fill="var(--text-muted)">72 jam</text>' +
      '<text x="240" y="198" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--accent-coral)">Cairo-Bishop Lab (&ge;2): Asam Urat &ge;8, Kalium &ge;6.0, Fosfat &ge;4.5, Kalsium &le;7.0 mg/dL</text>' +
      '</svg>';
  }

  function getHomTlsInfo(hour, proph) {
    var m = calcHomTlsMetrics(hour, proph);
    if (proph === "rasburicase") {
      return {
        tone: "info",
        rKey: "tls_ras_" + Math.round(hour / 12),
        title: "Profilaksis / Terapi Rasburicase (Urat Oksidase Rekombinan)",
        c1Label: "Mekanisme Cepat",
        c1Body: "Rasburicase memecah asam urat yang sudah terbentuk menjadi alantoin larut air dalam hitungan jam (Asam urat turun drastis ke " + m.ua.toFixed(1) + " mg/dL). Wajib diberikan pada TLS klinis atau risiko tinggi.",
        c2Label: "Kontraindikasi Mutlak",
        c2Body: "<strong>KONTRAINDIKASI MUTLAK pada defisiensi G6PD</strong> (memicu hemolisis oksidatif berat &amp; methemoglobinemia imbas H2O2) dan kehamilan!"
      };
    }
    if (proph === "allopurinol") {
      return {
        tone: "warning",
        rKey: "tls_allo_" + Math.round(hour / 12),
        title: "Profilaksis Alopurinol + Hidrasi Agresif (Risiko Rendah-Sedang)",
        c1Label: "Mekanisme & Keterbatasan",
        c1Body: "Menghambat xantin oksidase sehingga mencegah pembentukan asam urat baru, tetapi <strong>TIDAK menurunkan asam urat yang sudah telanjur tinggi</strong> di sirkulasi.",
        c2Label: "Board Pitfall",
        c2Body: "<strong>Jangan lakukan alkalinisasi urin (bikarbonat) secara rutin!</strong> Urin basa memicu presipitasi kristal kalsium fosfat di tubulus ginjal."
      };
    }
    return {
      tone: "danger",
      rKey: "tls_none_" + Math.round(hour / 12),
      title: "TLS Tanpa Profilaksis — Risiko Nefropati Urat Akut & Hiperkalemia Letal",
      c1Label: "Kaskade Elektrolit (Jam " + Math.round(m.h) + ")",
      c1Body: "Lisis masif sel tumor melepaskan <strong>K+ (" + m.k.toFixed(1) + " mEq/L), Fosfat (" + m.po4.toFixed(1) + " mg/dL), dan Asam Urat (" + m.ua.toFixed(1) + " mg/dL)</strong>. Fosfat mengikat kalsium memicu <strong>hipokalsemia sekunder (" + m.ca.toFixed(1) + " mg/dL)</strong> &rarr; tetani/kejang/aritmia!",
      c2Label: "Tatalaksana Cito",
      c2Body: "Hidrasi kristaloid IV masif (2–3 L/m&sup2;/hari), <strong>Rasburicase</strong> segera (jika G6PD normal), stabilisasi hiperkalemia, dan hemodialisis bila oliguria/anuria."
    };
  }

  function renderHomTlsWidget() {
    var h = homVizState.tlsHour;
    var p = homVizState.tlsProphylaxis;
    var info = getHomTlsInfo(h, p);
    var controlsTop = renderCardioTabRow("viz-homTls-tabs", [
      { key: "none", label: "Tanpa Profilaksis", onclick: "window.InternaApp.updateHomTlsViz(null, 'none', true)" },
      { key: "allopurinol", label: "Alopurinol (Pencegahan)", onclick: "window.InternaApp.updateHomTlsViz(null, 'allopurinol', true)" },
      { key: "rasburicase", label: "Rasburicase (Lisis Aktif)", onclick: "window.InternaApp.updateHomTlsViz(null, 'rasburicase', true)" }
    ], p);
    var controlsBottom = renderCardioSliderBlock({
      key: "homTls",
      label: "Waktu Pascakemoterapi (Jam)",
      pillText: Math.round(h) + " Jam",
      min: 0,
      max: 72,
      step: 2,
      value: h,
      trackBg: "linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 45%, var(--accent-coral) 100%)",
      oninput: "window.InternaApp.updateHomTlsViz(this.value, null, true)",
      presets: [
        { val: 6, label: "6 Jam", active: Math.round(h) === 6 },
        { val: 24, label: "24 Jam", active: Math.round(h) === 24 },
        { val: 48, label: "48 Jam", active: Math.round(h) === 48 }
      ]
    });

    return renderCardioWidgetCard({
      key: "homTls",
      title: "Simulator Kinetika 72 Jam Sindrom Lisis Tumor (Cairo-Bishop)",
      tag: "KEGAWATAN ONKOLOGI",
      controlsTop: controlsTop,
      svgHtml: buildHomTlsSvg(h, p),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "Asam Urat (mg/dL)" },
        { color: "var(--accent-secondary)", label: "Kalium (mEq/L)" },
        { color: "var(--accent-primary)", label: "Kalsium (mg/dL)", dashed: true }
      ]),
      controlsBottom: controlsBottom,
      info: info,
      readoutFooter: ""
    });
  }

  function updateHomTlsViz(hourVal, prophVal, cancelAnim) {
    if (cancelAnim !== false && R.viz && typeof R.viz.stopVizWalkthrough === "function") {
      R.viz.stopVizWalkthrough("homTls");
    }
    if (hourVal !== null && hourVal !== undefined) homVizState.tlsHour = clampNum(hourVal, 0, 72, 24);
    if (prophVal === "none" || prophVal === "allopurinol" || prophVal === "rasburicase") homVizState.tlsProphylaxis = prophVal;
    var h = homVizState.tlsHour;
    var p = homVizState.tlsProphylaxis;
    syncVizPresets("viz-homTls-tabs", ["none", "allopurinol", "rasburicase"].map(function (k) { return k === p; }));
    syncSliderAndPill("viz-homTls-slider", "viz-homTls-pill", h, Math.round(h) + " Jam");
    syncVizPresets("viz-homTls-presets", [Math.round(h) === 6, Math.round(h) === 24, Math.round(h) === 48]);
    swapVizSvgFrame("viz-homTls-frame", buildHomTlsSvg(h, p));
    var info = getHomTlsInfo(h, p);
    updateVizReadout("viz-homTls-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""), info.rKey);
  }

  // =========================================================================
  // W9 (EXTRA). KALKULATOR ANC & SKOR MASCC NEUTROPENIA FEBRIL (hom-5-1)
  // =========================================================================
  function calcHomAncMascc() {
    var wbc = clampNum(document.getElementById("hom-anc-wbc")?.value, 100, 100000, 800);
    var seg = clampNum(document.getElementById("hom-anc-seg")?.value, 0, 100, 25);
    var band = clampNum(document.getElementById("hom-anc-band")?.value, 0, 100, 5);
    var anc = Math.round(wbc * ((seg + band) / 100));

    var mascc = 0;
    var burden = Number(document.getElementById("hom-mascc-burden")?.value || 5);
    mascc += burden;
    if (document.getElementById("hom-mascc-bp")?.checked) mascc += 5;
    if (document.getElementById("hom-mascc-copd")?.checked) mascc += 4;
    if (document.getElementById("hom-mascc-solid")?.checked) mascc += 4;
    if (document.getElementById("hom-mascc-dehyd")?.checked) mascc += 3;
    if (document.getElementById("hom-mascc-out")?.checked) mascc += 3;
    if (document.getElementById("hom-mascc-age")?.checked) mascc += 2;

    var isFn = anc < 500;
    var isProfound = anc < 100;
    var highRisk = mascc < 21 || isProfound;
    var toneColor = highRisk ? "var(--accent-coral)" : (isFn ? "var(--accent-secondary)" : "var(--accent-primary)");

    var pill = document.getElementById("hom-anc-pill");
    if (pill) pill.textContent = "ANC: " + anc + "/uL | MASCC: " + mascc;
    updateCalcGauge("calc-hom-mascc", clampNum(mascc / 26, 0, 1, 0.5), "ANC " + anc + "/uL • MASCC " + mascc + "/26", toneColor);

    var res = document.getElementById("widget-hom-anc-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        highRisk ? "danger" : (isFn ? "warning" : "info"),
        "anc_" + anc + "_" + mascc,
        '<p class="font-bold text-[var(--text-primary)]">ANC = ' + anc + ' sel/&mu;L (' + (isProfound ? "Profound Neutropenia &lt;100" : (isFn ? "Neutropenia &lt;500" : "ANC &ge;500")) + ') &bull; Skor MASCC = ' + mascc + ' / 26 (' + (mascc >= 21 ? "Risiko Rendah &ge;21" : "Risiko Tinggi &lt;21") + ')</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Protokol Jam Pertama (&le;60 Menit):</strong> Ambil kultur darah 2 set, lalu segera berikan <strong>Beta-laktam Anti-Pseudomonal IV</strong> (<strong>Cefepime 2 g/8j</strong>, <strong>Piperacillin-Tazobactam 4,5 g/6j</strong>, atau <strong>Meropenem 1 g/8j</strong>). Tambahkan Vankomisin bila syok, pneumonia berat, infeksi kateter, atau kolonisasi MRSA.</p>'
      );
    }
  }

  function renderHomAncMasccWidget() {
    return '<div class="viz-widget" id="viz-calc-hom-anc-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Kalkulator ANC &amp; Skor Risiko MASCC Neutropenia Febril</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="hom-anc-pill">ANC: 240/uL | MASCC: 18</span><span class="viz-tag">EMERGENSI INFEKSI</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-anc-wbc">Leukosit (/&mu;L)</label><input type="number" id="hom-anc-wbc" value="800" min="100" max="100000" class="viz-calc-input" oninput="window.InternaApp.calcHomAncMascc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-anc-seg">% Segmen</label><input type="number" id="hom-anc-seg" value="25" min="0" max="100" class="viz-calc-input" oninput="window.InternaApp.calcHomAncMascc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-anc-band">% Batang (Band)</label><input type="number" id="hom-anc-band" value="5" min="0" max="100" class="viz-calc-input" oninput="window.InternaApp.calcHomAncMascc()" /></div>' +
        '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="hom-mascc-burden">Beban Gejala FN</label><select id="hom-mascc-burden" class="viz-calc-input" onchange="window.InternaApp.calcHomAncMascc()"><option value="5">Ringan/Asimtom (+5)</option><option value="3" selected>Sedang (+3)</option><option value="0">Berat/Moribund (0)</option></select></div>' +
      '</div>' +
      '<div class="viz-calc-grid mb-2">' +
        renderCalcCheckItem("hom-mascc-bp", "window.InternaApp.calcHomAncMascc()", "Tanpa Hipotensi (TDS &gt;90) (+5)", { checked: true }) +
        renderCalcCheckItem("hom-mascc-copd", "window.InternaApp.calcHomAncMascc()", "Tanpa PPOK (+4)", { checked: true }) +
        renderCalcCheckItem("hom-mascc-solid", "window.InternaApp.calcHomAncMascc()", "Tumor Padat / Tanpa Jamur (+4)", { checked: true }) +
        renderCalcCheckItem("hom-mascc-dehyd", "window.InternaApp.calcHomAncMascc()", "Tanpa Dehidrasi butuh IV (+3)") +
        renderCalcCheckItem("hom-mascc-out", "window.InternaApp.calcHomAncMascc()", "Status Rawat Jalan saat onset (+3)") +
        renderCalcCheckItem("hom-mascc-age", "window.InternaApp.calcHomAncMascc()", "Usia &lt;60 Tahun (+2)", { checked: true }) +
      '</div>' +
      renderCalcGaugeSvg("calc-hom-mascc", "STRATIFIKASI RISIKO MASCC", 18 / 26, "ANC 240/uL • MASCC 18/26", "var(--accent-coral)", [
        { from: 0, to: 0.78, fill: "var(--accent-coral)", rx: 7, label: "<21: Risiko Tinggi (Rawat + IV)", textFill: "var(--accent-coral)" },
        { from: 0.78, to: 1, fill: "var(--accent-primary)", rx: 7, label: ">=21: Risiko Rendah", textFill: "var(--accent-primary)" }
      ]) +
      '<div id="widget-hom-anc-result" class="viz-readout" data-tone="danger" data-last-key="anc_init">' +
        '<p class="font-bold text-[var(--text-primary)]">ANC = 240 sel/&mu;L (Neutropenia &lt;500) &bull; Skor MASCC = 18 / 26 (Risiko Tinggi &lt;21)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">Segera berikan <strong>Beta-laktam Anti-Pseudomonal IV</strong> (Cefepime / Piperacillin-Tazobactam / Meropenem) dalam &le;60 menit setelah kultur darah.</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // HOM MODULE WIDGET DISPATCHER
  // =========================================================================
  function renderHomModuleWidget(type) {
    if (type === "hom-iron-panel-viz") return renderHomIronPanelWidget();
    if (type === "hom-aiha-coombs-viz") return renderHomAihaCoombsWidget();
    if (type === "hom-g6pd-maha-smear-viz") return renderHomG6pdMahaSmearWidget();
    if (type === "hom-lymphoma-staging-viz") return renderHomLymphomaStagingWidget();
    if (type === "hom-myeloma-slimcrab-viz") return renderHomMyelomaSlimcrabWidget();
    if (type === "hom-dic-isth-calc") return renderHomDicIsthWidget();
    if (type === "hom-wells-dvt-transfusion-viz") return renderHomWellsDvtTransfusionWidget();
    if (type === "hom-tls-mascc-viz") return renderHomTlsWidget();
    if (type === "hom-anc-mascc-calc") return renderHomAncMasccWidget();
    return "";
  }

  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("hom-")) return null;
    return renderHomModuleWidget(type) || null;
  });
  R.registerMotionProvider(getHomVizMotionSpec);

  Object.assign(R.handlers, {
    getHomVizMotionSpec,
    updateHomIronPanelViz,
    renderHomIronPanelWidget,
    updateHomAihaCoombsViz,
    renderHomAihaCoombsWidget,
    updateHomG6pdMahaViz,
    renderHomG6pdMahaSmearWidget,
    updateHomLymphomaViz,
    renderHomLymphomaStagingWidget,
    updateHomMyelomaViz,
    renderHomMyelomaSlimcrabWidget,
    calcHomDicIsth,
    renderHomDicIsthWidget,
    calcHomWellsDvt,
    updateHomTransfusionViz,
    renderHomWellsDvtTransfusionWidget,
    updateHomTlsViz,
    renderHomTlsWidget,
    calcHomAncMascc,
    renderHomAncMasccWidget,
    renderHomModuleWidget
  });
})(window);
