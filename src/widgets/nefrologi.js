/* ==========================================================================
   InternaSnack — Ginjal & Hipertensi Interactive Widgets
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

  const nefroVizState = {
    hemoDrug: "normal",   // 'normal' | 'nsaid' | 'acei' | 'sglt2'
    tubSeg: "loop",       // 'pct' | 'loop' | 'dct' | 'cd'
    hyperK: 6.2,          // 4.5..9.2
    abgPreset: "kad",     // 'kad' | 'nagma' | 'resp' | 'mixed'
    nephDisease: "gnmn",  // 'gnlm' | 'gsfs' | 'gnmn'
    nephLens: "em",       // 'lm' | 'if' | 'em'
    lupusClass: 4,        // 1..6
    lupusIndex: "act",    // 'act' | 'chron'
    rpgnMode: "pauci",    // 'linear' | 'granular' | 'pauci' | 'iga' | 'amyloid'
    rpgnProg: 48,         // 0..100
    // Prioritas 2
    akiPreset: "prerenal",     // 'prerenal' | 'atn' | 'diuretic'
    akiRatio: 1.7,             // 1.0..3.5x baseline sCr
    sedType: "dismorfik",      // 'dismorfik' | 'eumorfik' | 'leukosit' | 'waxy'
    sedOptic: "phase",         // 'phase' | 'bright'
    ckdTab: "heatmap",         // 'heatmap' | 'histo'
    ckdG: "G3b",               // 'G1'..'G5'
    ckdA: "A2",                // 'A1'..'A3'
    dnStage: 3.0,              // 1..4
    naMode: "chronic",         // 'acute' | 'chronic' | 'hyperna'
    naBb: 60,
    naStart: 114,
    naTargetDelta: 8.0,        // 0..16 mEq/L/24j
    nephriticMode: "gnaps",    // 'gnaps' | 'gnmp' | 'iga_diff'
    nephriticWeek: 4.0,        // 0..12 minggu
    htcHmod: "general",        // 'general' | 'aorta' | 'pulmo' | 'stroke_isch' | 'urgency'
    htcDrug: "nicardipine",    // 'nicardipine' | 'esmolol' | 'ntg' | 'nifedipin_sl'
    htcMin: 30,                // 0..120 menit
    // Prioritas 3
    heredMode: "bartter",      // 'bartter' | 'gitelman' | 'liddle' | 'alport' | 'adpkd'
    mbdEgfr: 28,               // 10..90 mL/mnt
    mbdTx: "baseline",         // 'baseline' | 'binder' | 'calcitriol' | 'cinacalcet' | 'esa'
    rtaPreset: "rta1",         // 'diare' | 'rta1' | 'rta2' | 'rta4'
    ainComp: "ain",            // 'ain' | 'atn' | 'gn'
    hdHemo: "unstable",        // 'stable' | 'unstable'
    stoneMm: 7,                // 2..22 mm
    stoneMode: "ca_ox",        // 'ca_ox' | 'uric' | 'struvite' | 'sepsis'
    skrMode: "crs1"            // 'crs1' | 'crs2' | 'crs3' | 'crs4' | 'crs5' | 'hrs'
  };

  // --- N1. Hemodinamik Glomerulus & Situs Diuretik (nefro-1-1) ---
  const NEFRO_HEMO_DATA = {
    normal: {
      label: "Fisiologi Basal", tone: "info", rKey: "hemo-normal",
      affW: 11, effW: 8.5, pgcPct: 0.62, pgcTxt: "55 mmHg (Normal)", gfrTxt: "GFR ~105 mL/mnt",
      affColor: "var(--accent-primary)", effColor: "var(--viz-blue)",
      title: "Regulasi Tekanan Filtrasi Glomerulus Basal (Starling Net ~10–15 mmHg)",
      c1Label: "Arteriol Aferen vs Eferen",
      c1Body: "Resistensi arteriol <strong>eferen sedikit lebih tinggi</strong> dibanding aferen menjaga tekanan kapiler glomerulus (P<sub>GC</sub> ~55 mmHg) stabil meski TD sistemik berubah.",
      c2Label: "Target Autoregulasi",
      c2Body: "Tekanan hidrostatik kapiler (P<sub>GC</sub>) mendorong filtrasi melawan tekanan onkotik kapiler dan hidrostatik ruang Bowman.",
      trap: "Autoregulasi ginjal gagal bila MAP turun &lt;65–70 mmHg atau pada hipertensi maligna/stenosis arteri renalis."
    },
    nsaid: {
      label: "+ NSAID", tone: "danger", rKey: "hemo-nsaid",
      affW: 4.5, effW: 8.5, pgcPct: 0.30, pgcTxt: "34 mmHg (Turun)", gfrTxt: "GFR ↓ Tajam (Risiko AKI)",
      affColor: "var(--accent-coral)", effColor: "var(--viz-blue)",
      title: "Blokade Prostaglandin oleh NSAID → Vasokonstriksi Arteriol Aferen",
      c1Label: "Mekanisme Hemodinamik",
      c1Body: "NSAID menghambat sintesis PGE<sub>2</sub>/PGI<sub>2</sub> vasodilator aferen. Aliran darah masuk berkurang drastis → <strong>P<sub>GC</sub> &amp; GFR anjlok</strong>.",
      c2Label: "Klinis & Interaksi Obat",
      c2Body: "Berbahaya bila digabung dengan <strong>ACEi/ARB + Diuretik</strong> (<em>Triple Whammy</em>): aferen tercekik + eferen melebar + hipovolemia.",
      trap: "Hindari NSAID pada PGK, gagal jantung, sirosis/asites, atau dehidrasi karena memicu AKI prerenal fungsional maupun AIN!"
    },
    acei: {
      label: "+ ACEi / ARB", tone: "info", rKey: "hemo-acei",
      affW: 11, effW: 13.5, pgcPct: 0.44, pgcTxt: "43 mmHg (Protektif)", gfrTxt: "GFR ↓ Ringan <30% (Aman)",
      affColor: "var(--accent-primary)", effColor: "var(--accent-secondary)",
      title: "Blokade Angiotensin II oleh ACEi/ARB → Vasodilatasi Arteriol Eferen",
      c1Label: "Mekanisme Nefroproteksi",
      c1Body: "Angiotensin II terutama menyempitkan arteriol eferen. ACEi/ARB melebarkan pintu keluar → <strong>hipertensi intraglomerular &amp; proteinuria turun</strong>.",
      c2Label: "Kapan Dipertahankan vs Distop?",
      c2Body: "Kenaikan kreatinin serum awal <strong>&lt;30% dalam 2–4 minggu adalah efek hemodinamik normal</strong> (teruskan obat!).",
      trap: "<strong>Kontraindikasi absolut</strong> pada kehamilan &amp; <strong>stenosis arteri renalis bilateral</strong> (atau ginjal soliter stenosis), karena GFR bergantung penuh pada tonus eferen!"
    },
    sglt2: {
      label: "+ SGLT2i", tone: "success", rKey: "hemo-sglt2",
      affW: 7.5, effW: 8.5, pgcPct: 0.48, pgcTxt: "46 mmHg (Seimbang)", gfrTxt: "GFR Dip Awal → Jangka Panjang Awet",
      affColor: "var(--viz-purple)", effColor: "var(--viz-blue)",
      title: "Restorasi Umpan Balik Tubuloglomerular (TGF) oleh SGLT2 Inhibitor",
      c1Label: "Mekanisme Makula Densa",
      c1Body: "Blokade SGLT2 di tubulus proksimal meningkatkan aliran Na<sup>+</sup>/Cl<sup>-</sup> sampai ke <strong>makula densa</strong> → sinyal adenosin menyempitkan aferen secara fisiologis.",
      c2Label: "Sinergi dengan ACEi/ARB",
      c2Body: "Mengatasi hiperfiltrasi diabetik maupun non-diabetik; penurunan eGFR awal (<em>eGFR dip</em>) menandakan berkurangnya stres barotrauma glomerulus.",
      trap: "Pada PGK, SGLT2i tetap dimulai hingga eGFR ≥20 mL/mnt/1,73m² dan dilanjutkan hingga dialisis (efek proteksi ginjal-jantung independen dari glukosa)."
    }
  };

  const NEFRO_TUBULE_DATA = {
    pct: { label: "Proksimal (SGLT2i / Asetazolamid)", x: 262, y: 84, note: "65% reabsorpsi Na⁺ & HCO₃⁻ + Glukosa (SGLT2)" },
    loop: { label: "Henle Asenden (Furosemide)", x: 325, y: 174, note: "NKCC2 (25% Na⁺); kunci pemekatan urin & ekskresi Ca²⁺" },
    dct: { label: "Tubulus Distal (Tiazid)", x: 374, y: 84, note: "NCC (5% NaCl); menurunkan Ca²⁺ urin (cegah batu Ca)" },
    cd: { label: "Kolektivus (Spironolakton)", x: 432, y: 138, note: "ENaC & Reseptor Mineralokortikoid; atur K⁺ & H⁺" }
  };

  function buildNefroFiltrationSvg(drugKey, segKey) {
    const d = NEFRO_HEMO_DATA[drugKey] || NEFRO_HEMO_DATA.normal;
    const t = NEFRO_TUBULE_DATA[segKey] || NEFRO_TUBULE_DATA.loop;
    const barW = (d.pgcPct * 150).toFixed(1);
    return `
      <svg class="viz-svg" viewBox="0 0 480 236" role="img" aria-label="Anatomi Glomerulus dan Segmen Tubulus">
        <rect x="8" y="8" width="218" height="220" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="18" y="26" font-size="10.2" font-weight="800" fill="var(--text-primary)">KAPSUL BOWMAN &amp; KAPILER</text>
        <text x="18" y="40" font-size="9" font-weight="700" fill="${d.affColor}">${d.gfrTxt}</text>

        <!-- Bowman's Capsule C-cup -->
        <path d="M98,66 C154,66 176,100 176,126 C176,154 152,184 98,184 C74,184 58,172 52,158" fill="none" stroke="var(--border-strong)" stroke-width="5" stroke-linecap="round" />
        <!-- Afferent Arteriole -->
        <path d="M18,104 L88,104" stroke="${d.affColor}" stroke-width="${d.affW}" stroke-linecap="round" />
        <text x="18" y="92" font-size="8.6" font-weight="800" fill="${d.affColor}">Aferen (Masuk)</text>
        <!-- Glomerular Capillary Tuft -->
        <path d="M88,104 C106,82 138,84 146,112 C152,134 128,154 106,148 C88,142 96,116 122,118" fill="none" stroke="var(--accent-coral)" stroke-width="5.2" stroke-linecap="round" />
        <!-- Efferent Arteriole -->
        <path d="M122,118 L122,150 L22,150" stroke="${d.effColor}" stroke-width="${d.effW}" stroke-linecap="round" fill="none" />
        <text x="18" y="168" font-size="8.6" font-weight="800" fill="${d.effColor}">Eferen (Keluar)</text>

        <!-- PGC Gauge -->
        <text x="18" y="196" font-size="8.5" font-weight="800" fill="var(--text-muted)">TEKANAN GLOMERULUS (Pgc)</text>
        <rect x="18" y="202" width="150" height="10" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <rect x="18" y="202" width="${barW}" height="10" rx="9" fill="${d.affColor}" />
        <text x="174" y="210" font-size="8.4" font-weight="800" fill="var(--text-primary)">${d.pgcTxt.split(" ")[0]}</text>

        <!-- Right Box: Nephron Diuretic Segments -->
        <rect x="234" y="8" width="238" height="220" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="246" y="26" font-size="10.2" font-weight="800" fill="var(--text-primary)">PETA SEGMEN TUBULUS &amp; DIURETIK</text>
        <!-- Nephron Schematic Loop -->
        <path d="M244,86 C260,64 282,102 296,86 L306,176 C308,194 344,194 346,174 L354,84 C368,68 386,100 402,84 L432,84 L432,196" fill="none" stroke="var(--border-strong)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M244,86 C260,64 282,102 296,86 L306,176 C308,194 344,194 346,174 L354,84 C368,68 386,100 402,84 L432,84 L432,196" fill="none" stroke="var(--bg-surface)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Segment Markers -->
        <circle cx="262" cy="84" r="${segKey === "pct" ? 10 : 6}" fill="${segKey === "pct" ? "var(--accent-primary)" : "var(--text-muted)"}" fill-opacity="${segKey === "pct" ? 0.95 : 0.45}" />
        <circle cx="325" cy="174" r="${segKey === "loop" ? 10 : 6}" fill="${segKey === "loop" ? "var(--accent-primary)" : "var(--text-muted)"}" fill-opacity="${segKey === "loop" ? 0.95 : 0.45}" />
        <circle cx="374" cy="84" r="${segKey === "dct" ? 10 : 6}" fill="${segKey === "dct" ? "var(--accent-primary)" : "var(--text-muted)"}" fill-opacity="${segKey === "dct" ? 0.95 : 0.45}" />
        <circle cx="432" cy="138" r="${segKey === "cd" ? 10 : 6}" fill="${segKey === "cd" ? "var(--accent-primary)" : "var(--text-muted)"}" fill-opacity="${segKey === "cd" ? 0.95 : 0.45}" />

        <text x="262" y="60" text-anchor="middle" font-size="8.4" font-weight="800" fill="${segKey === "pct" ? "var(--accent-primary)" : "var(--text-muted)"}">PCT</text>
        <text x="325" y="156" text-anchor="middle" font-size="8.4" font-weight="800" fill="${segKey === "loop" ? "var(--accent-primary)" : "var(--text-muted)"}">Henle</text>
        <text x="374" y="60" text-anchor="middle" font-size="8.4" font-weight="800" fill="${segKey === "dct" ? "var(--accent-primary)" : "var(--text-muted)"}">DCT</text>
        <text x="448" y="138" font-size="8.4" font-weight="800" fill="${segKey === "cd" ? "var(--accent-primary)" : "var(--text-muted)"}">CD</text>

        <!-- Active Segment Footer inside Right Panel -->
        <rect x="244" y="200" width="218" height="22" rx="10" fill="var(--bg-surface)" stroke="var(--accent-primary)" stroke-width="1" />
        <text x="353" y="214" text-anchor="middle" font-size="8.1" font-weight="700" fill="var(--text-primary)">${t.note}</text>
      </svg>
    `;
  }

  function renderNefroFiltrationWidget() {
    const drugKey = NEFRO_HEMO_DATA[nefroVizState.hemoDrug] ? nefroVizState.hemoDrug : "normal";
    const segKey = NEFRO_TUBULE_DATA[nefroVizState.tubSeg] ? nefroVizState.tubSeg : "loop";
    const info = NEFRO_HEMO_DATA[drugKey];
    const tInfo = NEFRO_TUBULE_DATA[segKey];
    const controlsTop = `
      <div class="space-y-2 mb-2.5">
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">1. Modulator Arteriol Glomerulus:</div>
        ${renderCardioTabRow("viz-nefro-hemo-tabs", Object.entries(NEFRO_HEMO_DATA).map(([k, v]) => ({
          key: k,
          label: v.label,
          onclick: `window.InternaApp.updateNefroFiltrationViz('${k}', null)`
        })), drugKey)}
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">2. Target Segmen Tubulus:</div>
        ${renderCardioTabRow("viz-nefro-tub-tabs", Object.entries(NEFRO_TUBULE_DATA).map(([k, v]) => ({
          key: k,
          label: v.label,
          onclick: `window.InternaApp.updateNefroFiltrationViz(null, '${k}')`
        })), segKey)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroFiltration",
      title: "Hemodinamik Arteriol Glomerulus & Situs Kerja Diuretik",
      tag: "Fisiologi Ginjal • KKI 4",
      controlsTop,
      svgHtml: buildNefroFiltrationSvg(drugKey, segKey),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Segmen Terpilih (${tInfo.label}):</strong> ${tInfo.note}</p><p class="mt-1"><strong>Jebakan Ujian:</strong> ${info.trap}</p>`
    });
  }

  function updateNefroFiltrationViz(hemoIn, segIn) {
    if (NEFRO_HEMO_DATA[hemoIn]) nefroVizState.hemoDrug = hemoIn;
    if (NEFRO_TUBULE_DATA[segIn]) nefroVizState.tubSeg = segIn;
    const drugKey = nefroVizState.hemoDrug;
    const segKey = nefroVizState.tubSeg;
    syncVizPresets("viz-nefro-hemo-tabs", Object.keys(NEFRO_HEMO_DATA).map((k) => k === drugKey));
    syncVizPresets("viz-nefro-tub-tabs", Object.keys(NEFRO_TUBULE_DATA).map((k) => k === segKey));
    swapVizSvgFrame("viz-nefroFiltration-frame", buildNefroFiltrationSvg(drugKey, segKey));
    const info = NEFRO_HEMO_DATA[drugKey];
    const tInfo = NEFRO_TUBULE_DATA[segKey];
    updateVizReadout(
      "viz-nefroFiltration-readout",
      info.tone,
      formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Segmen Terpilih (${tInfo.label}):</strong> ${tInfo.note}</p><p class="mt-1"><strong>Jebakan Ujian:</strong> ${info.trap}</p>`),
      `${info.rKey}-${segKey}`
    );
  }

  // --- N2. Simulator Progresi EKG Hiperkalemia & Algoritma Cito (nefro-2-2) ---
  function getHyperKInfo(kVal) {
    const k = clampNum(kVal, 4.5, 9.2, 6.2);
    if (k < 5.5) {
      return {
        tone: "info", rKey: "hk-norm", pill: `${k.toFixed(1)} mEq/L (Normal–Borderline)`,
        stage: "Normokalemia / Ringan", ecgPath: "M24,95 L58,95 Q66,85 74,95 L88,95 L93,102 L100,46 L106,105 L114,95 L132,95 Q148,76 164,95 L220,95 Q228,85 236,95 L250,95 L255,102 L262,46 L268,105 L276,95 L294,95 Q310,76 326,95 L380,95",
        stabilizeOn: false, shiftOn: false,
        title: `K⁺ ${k.toFixed(1)} mEq/L — Morfologi Gelombang P, Interval PR & T Normal`,
        c1Label: "Elektrofisiologi EKG", c1Body: "Gradien kalium transmembran stabil. Gelombang T membulat asimetris, interval PR 120–200 ms, QRS sempit (&lt;120 ms).",
        c2Label: "Manajemen Klinis", c2Body: "Pantau kalium ulang (singkirkan <em>pseudohiperkalemia</em> akibat hemolisis saat flebotomi) dan evaluasi obat (ACEi/ARB/MRA).",
        trap: "Pelepasan torniket terlambat atau mengepalkan tangan saat ambil darah sering memicu <strong>pseudohiperkalemia</strong>!"
      };
    }
    if (k < 6.5) {
      return {
        tone: "warning", rKey: "hk-peaked", pill: `${k.toFixed(1)} mEq/L (Peaked T)`,
        stage: "Tinggi Lancip (Peaked T)", ecgPath: "M24,95 L58,95 Q66,86 74,95 L88,95 L93,102 L100,46 L106,105 L114,95 L126,95 Q138,24 150,95 L220,95 Q228,86 236,95 L250,95 L255,102 L262,46 L268,105 L276,95 L288,95 Q300,24 312,95 L380,95",
        stabilizeOn: true, shiftOn: true,
        title: `K⁺ ${k.toFixed(1)} mEq/L — Gelombang T Tinggi Simetris Lancip ("Tenting T Wave")`,
        c1Label: "Elektrofisiologi EKG", c1Body: "Aktivasi kanal K⁺ (IKr) mempercepat repolarisasi fase 3 → terbentuk <strong>gelombang T lancip sempit simetris (<em>tented T</em>)</strong> paling awal di V2–V4.",
        c2Label: "Aksi Darurat 3 Pilar", c2Body: "<strong>(1) Ca Glukonas 10% 10 mL IV</strong> pelan 2–3 menit + <strong>(2) Insulin Regular 10 IU + D40% 50 mL IV</strong> (± Salbutamol inhalasi) + <strong>(3) Eliminasi</strong>.",
        trap: "<strong>Ca Glukonas TIDAK menurunkan kadar kalium serum</strong> — kerjanya hanya menaikkan potensial ambang miokard dalam 1–3 menit!"
      };
    }
    if (k < 7.6) {
      return {
        tone: "danger", rKey: "hk-pflat", pill: `${k.toFixed(1)} mEq/L (PR Panjang / P Datar)`,
        stage: "PR Memanjang + P Hilang", ecgPath: "M24,95 L68,95 Q75,92 82,95 L92,95 L98,106 L105,54 L112,108 L120,96 Q136,26 154,95 L230,95 Q237,92 244,95 L254,95 L260,106 L267,54 L274,108 L282,96 Q298,26 316,95 L380,95",
        stabilizeOn: true, shiftOn: true,
        title: `K⁺ ${k.toFixed(1)} mEq/L — Gelombang P Mendatar/Hilang &amp; Interval PR Memanjang`,
        c1Label: "Elektrofisiologi EKG", c1Body: "Miokardium atrium paling sensitif terhadap hiperkalemia → gelombang P memudar hingga tak tampak, PR memanjang, dan awal <strong>pelebaran QRS</strong>.",
        c2Label: "Terapi Agresif Segera", c2Body: "Monitor EKG kontinu, ulang <strong>Ca Glukonas IV</strong> bila EKG masih melebar dalam 5–10 mnt, berikan <strong>Insulin+D40%</strong> &amp; siapkan akses dialisis bila anuria.",
        trap: "Jangan lupa cek <strong>GDS pasca-Insulin + D40% setiap 1 jam</strong> hingga 4–6 jam karena pasien PGK rentan hipoglikemia lambat!"
      };
    }
    return {
      tone: "danger", rKey: "hk-sine", pill: `${k.toFixed(1)} mEq/L (QRS Lebar / Sine Wave)`,
      stage: "DARURAT: Sine Wave!", ecgPath: "M24,95 Q52,32 82,95 Q112,148 142,95 Q172,32 202,95 Q232,148 262,95 Q292,32 322,95 Q352,148 380,95",
      stabilizeOn: true, shiftOn: true,
      title: `K⁺ ${k.toFixed(1)} mEq/L — Pola Sine Wave (Pre-VF / Asistol Cito!)`,
      c1Label: "Elektrofisiologi EKG", c1Body: "QRS melebar ekstrem dan melebur dengan gelombang T membentuk kurva sinusoidal kontinyu (<strong><em>sine wave pattern</em></strong>). Ancaman henti jantung dalam hitungan menit!",
      c2Label: "Protokol Code-Level Resusitasi", c2Body: "<strong>Ca Glukonas 10% 10–20 mL IV</strong> secepatnya + ulang bila belum menyempit + <strong>Insulin/D40% + Salbutamol + HD Cito</strong>!",
      trap: "Jangan tunda Ca Glukonas menunggu hasil lab ulang jika EKG sudah berbentuk <em>sine wave</em> atau QRS melebar aneh pada pasien oliguria!"
    };
  }

  function buildNefroHyperKSvg(kVal) {
    const info = getHyperKInfo(kVal);
    const stabFill = info.stabilizeOn ? "var(--accent-coral)" : "var(--text-muted)";
    const shiftFill = info.shiftOn ? "var(--accent-secondary)" : "var(--text-muted)";
    return `
      <svg class="viz-svg" viewBox="0 0 480 226" role="img" aria-label="Simulator Gelombang EKG Hiperkalemia">
        <!-- ECG Grid Box -->
        <rect x="14" y="10" width="452" height="122" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" />
        <line x1="14" y1="50" x2="466" y2="50" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="14" y1="95" x2="466" y2="95" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <text x="26" y="28" font-size="10" font-weight="800" fill="${info.stabilizeOn ? "var(--accent-coral)" : "var(--accent-primary)"}">TRACING EKG — ${info.stage.toUpperCase()}</text>
        <text x="454" y="28" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--text-primary)">K⁺ ${clampNum(kVal, 4.5, 9.2, 6.2).toFixed(1)} mEq/L</text>

        <path id="viz-nefroHyperK-ecg-path" d="${info.ecgPath}" fill="none" stroke="${info.stabilizeOn ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- 3 Pillar Emergency Action Cards Inside SVG -->
        <rect x="14" y="142" width="144" height="74" rx="10" fill="var(--bg-surface-subtle)" stroke="${stabFill}" stroke-width="${info.stabilizeOn ? 2 : 1}" />
        <text x="24" y="160" font-size="9.2" font-weight="800" fill="${stabFill}">1. STABILISASI (1–3 mnt)</text>
        <text x="24" y="177" font-size="9" font-weight="700" fill="var(--text-primary)">Ca Glukonas 10% 10 mL</text>
        <text x="24" y="192" font-size="8.2" fill="var(--text-muted)">Lindungi membran miokard</text>
        <text x="24" y="205" font-size="8.2" font-weight="700" fill="${stabFill}">(Tidak turunkan K⁺)</text>

        <rect x="168" y="142" width="144" height="74" rx="10" fill="var(--bg-surface-subtle)" stroke="${shiftFill}" stroke-width="${info.shiftOn ? 2 : 1}" />
        <text x="178" y="160" font-size="9.2" font-weight="800" fill="${shiftFill}">2. SHIFT INTRASEL (15 mnt)</text>
        <text x="178" y="177" font-size="9" font-weight="700" fill="var(--text-primary)">Insulin 10 IU + D40% 50 mL</text>
        <text x="178" y="192" font-size="8.2" fill="var(--text-muted)">+ Nebulizer Salbutamol</text>
        <text x="178" y="205" font-size="8.2" font-weight="700" fill="var(--text-secondary)">(Turun 0,5–1,2 mEq/L)</text>

        <rect x="322" y="142" width="144" height="74" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--accent-primary)" stroke-width="1.4" />
        <text x="332" y="160" font-size="9.2" font-weight="800" fill="var(--accent-primary)">3. ELIMINASI TUBUH</text>
        <text x="332" y="177" font-size="9" font-weight="700" fill="var(--text-primary)">Furosemide / Binder</text>
        <text x="332" y="192" font-size="8.2" fill="var(--text-muted)">Atau Hemodialisis Cito</text>
        <text x="332" y="205" font-size="8.2" font-weight="700" fill="var(--accent-primary)">(Bila anuria/refrakter)</text>
      </svg>
    `;
  }

  function renderNefroHyperKWidget() {
    const k = clampNum(nefroVizState.hyperK, 4.5, 9.2, 6.2);
    const info = getHyperKInfo(k);
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroHyperK",
      label: "Geser Kadar Kalium Serum (mEq/L):",
      pillText: info.pill,
      min: 4.5, max: 9.0, step: 0.1, value: k,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3) 0% 22%, rgba(217,119,6,0.35) 22% 45%, rgba(225,29,72,0.42) 45% 100%)",
      oninput: "window.InternaApp.updateNefroHyperKViz(this.value, true)",
      presets: [
        { label: "5.0 Normal", val: 5.0, active: k < 5.5 },
        { label: "6.0 Peaked T", val: 6.0, active: k >= 5.5 && k < 6.5 },
        { label: "7.2 P Datar", val: 7.2, active: k >= 6.5 && k < 7.6 },
        { label: "8.5 Sine Wave", val: 8.5, active: k >= 7.6 }
      ]
    });
    return renderCardioWidgetCard({
      key: "nefroHyperK",
      title: "Simulator Progresi EKG Hiperkalemia & Algoritma 3 Pilar Cito",
      tag: "Kegawatdaruratan Elektrolit",
      svgHtml: buildNefroHyperKSvg(k),
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateNefroHyperKViz(valIn, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    const k = clampNum(valIn, 4.5, 9.2, 6.2);
    nefroVizState.hyperK = k;
    const info = getHyperKInfo(k);
    syncSliderAndPill("viz-nefroHyperK-slider", "viz-nefroHyperK-pill", k, info.pill);
    swapVizSvgFrame("viz-nefroHyperK-frame", buildNefroHyperKSvg(k));
    syncVizPresets("viz-nefroHyperK-presets", [k < 5.5, k >= 5.5 && k < 6.5, k >= 6.5 && k < 7.6, k >= 7.6]);
    updateVizReadout("viz-nefroHyperK-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- N3. Kalkulator AGD, Anion Gap Terkoreksi & Rumus Winter (nefro-2-3) ---
  const NEFRO_ABG_PRESETS = {
    kad: { label: "KAD (HAGMA Terkompensasi)", ph: 7.22, paco2: 24, hco3: 10, na: 136, cl: 98, alb: 3.8 },
    nagma: { label: "Diare Berat (NAGMA)", ph: 7.28, paco2: 29, hco3: 14, na: 138, cl: 114, alb: 4.0 },
    resp: { label: "Asidosis Respiratorik Akut", ph: 7.24, paco2: 60, hco3: 26, na: 140, cl: 102, alb: 4.0 },
    mixed: { label: "Uremia + Muntah (Mixed)", ph: 7.36, paco2: 39, hco3: 22, na: 138, cl: 90, alb: 2.4 }
  };

  function evaluateNefroAbg(vals) {
    const ph = clampNum(vals.ph, 6.8, 7.8, 7.22);
    const paco2 = clampNum(vals.paco2, 10, 110, 24);
    const hco3 = clampNum(vals.hco3, 3, 55, 10);
    const na = clampNum(vals.na, 110, 175, 136);
    const cl = clampNum(vals.cl, 70, 140, 98);
    const alb = clampNum(vals.alb, 1.0, 5.5, 3.8);

    const agRaw = na - (cl + hco3);
    const agCorr = agRaw + 2.5 * (4.0 - alb);
    let primary = "Asam-Basa dalam Rentang Normal";
    let compNote = "Tidak terdapat asidemia/alkalemia bermakna.";
    let tone = "info";

    if (ph < 7.35) {
      tone = "danger";
      if (hco3 < 22) {
        primary = agCorr > 12 ? "Asidosis Metabolik Anion Gap Tinggi (HAGMA)" : "Asidosis Metabolik Non-Anion Gap (NAGMA / Hiperkloremik)";
        const winLow = 1.5 * hco3 + 6;
        const winHigh = 1.5 * hco3 + 10;
        if (paco2 >= winLow && paco2 <= winHigh) compNote = `Rumus Winter (Expected PaCO₂ ${winLow.toFixed(0)}–${winHigh.toFixed(0)} mmHg) → Kompensasi Respiratorik Adekuat.`;
        else if (paco2 > winHigh) compNote = `PaCO₂ (${paco2}) lebih tinggi dari target Winter (${winLow.toFixed(0)}–${winHigh.toFixed(0)}) → disertai <strong>Asidosis Respiratorik Konkomitan!</strong>`;
        else compNote = `PaCO₂ (${paco2}) lebih rendah dari target Winter (${winLow.toFixed(0)}–${winHigh.toFixed(0)}) → disertai <strong>Alkalosis Respiratorik Primer!</strong>`;
      } else {
        primary = "Asidosis Respiratorik Primer";
        compNote = `Peningkatan PaCO₂ primer (${paco2} mmHg). Cek ΔHCO₃⁻: 1 mEq/L tiap +10 PaCO₂ (akut) vs 3,5–4 mEq/L (kronik).`;
      }
    } else if (ph > 7.45) {
      tone = "warning";
      if (hco3 > 26) {
        primary = "Alkalosis Metabolik Primer";
        const expCo2 = 0.7 * (hco3 - 24) + 40;
        compNote = `Expected PaCO₂ ~${expCo2.toFixed(0)} ± 2 mmHg (aktual ${paco2} mmHg). Cek klorida urin untuk responsif salin (<20) vs resisten.`;
      } else {
        primary = "Alkalosis Respiratorik Primer";
        compNote = `Hiperventilasi primer (PaCO₂ ${paco2} mmHg).`;
      }
    } else if (agCorr > 12) {
      tone = "warning";
      primary = "pH Terkompensasi / Gangguan Campuran Tersembunyi (Cek Anion Gap!)";
      compNote = "Meski pH mendekati 7,35–7,45, Anion Gap terkoreksi meningkat (>12) menandakan <strong>HAGMA + Alkalosis Metabolik/Respiratorik bersamaan</strong>!";
    }

    let deltaNote = "Anion Gap terkoreksi dalam batas normal (≤12 mEq/L).";
    if (agCorr > 12) {
      const denom = Math.max(1, 24 - hco3);
      const ratio = (agCorr - 12) / denom;
      if (hco3 >= 22 || ratio > 2) {
        deltaNote = `Delta Ratio >2 (${ratio.toFixed(1)}) → <strong>HAGMA + Alkalosis Metabolik Bersamaan</strong> (mis. muntah/diuretik pada pasien PGK/sepsis).`;
      } else if (ratio < 1) {
        deltaNote = `Delta Ratio = ${ratio.toFixed(2)} (<1,0) → <strong>HAGMA + NAGMA Bersamaan</strong> (penurunan HCO₃⁻ lebih besar dari kenaikan AG).`;
      } else {
        deltaNote = `Delta Ratio = ${ratio.toFixed(2)} (1,0–2,0) → <strong>HAGMA Murni</strong> (KAD, asidosis laktat, uremia, atau intoksikasi salisilat/metanol).`;
      }
    }

    return { ph, paco2, hco3, na, cl, alb, agRaw, agCorr, primary, compNote, deltaNote, tone };
  }

  function buildNefroAbgSvg(res) {
    const px = 42 + ((clampNum(res.paco2, 15, 85, 40) - 15) / 70) * 200;
    const py = 166 - ((clampNum(res.hco3, 4, 44, 24) - 4) / 40) * 126;
    const totalBar = Math.max(100, res.na);
    const clW = (res.cl / totalBar) * 165;
    const hcW = (res.hco3 / totalBar) * 165;
    const agW = (Math.max(0, res.agCorr) / totalBar) * 165;
    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Nomogram Kompensasi AGD dan Bar Anion Gap">
        <!-- Left: PaCO2 vs HCO3 Compensation Nomogram -->
        <rect x="10" y="10" width="246" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="20" y="27" font-size="9.5" font-weight="800" fill="var(--text-primary)">NOMOGRAM PaCO₂ vs HCO₃⁻</text>
        <line x1="42" y1="38" x2="42" y2="166" stroke="var(--border-strong)" stroke-width="1.2" />
        <line x1="42" y1="166" x2="244" y2="166" stroke="var(--border-strong)" stroke-width="1.2" />
        <!-- Expected Metabolic Acidosis Band -->
        <polygon points="42,160 118,108 124,96 42,146" fill="var(--accent-primary)" fill-opacity="0.22" />
        <text x="142" y="182" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-muted)">PaCO₂ (15 → 85 mmHg)</text>
        <text x="24" y="104" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-muted)" transform="rotate(-90 24 104)">HCO₃⁻</text>
        <!-- Normal Box -->
        <rect x="106" y="96" width="22" height="16" rx="3" fill="var(--accent-primary)" fill-opacity="0.22" stroke="var(--accent-primary)" stroke-dasharray="2 2" />
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="9" fill="var(--accent-coral)" fill-opacity="0.25" class="osm-pulse-dot" />
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.8" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.5" />

        <!-- Right: Anion Gap Bar Breakdown -->
        <rect x="264" y="10" width="206" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="276" y="27" font-size="9.5" font-weight="800" fill="var(--text-primary)">KOMPOSISI ANION GAP</text>
        <text x="276" y="54" font-size="8.8" font-weight="700" fill="var(--text-secondary)">Kation Na⁺ (${res.na} mEq/L)</text>
        <rect x="276" y="60" width="165" height="22" rx="9" fill="var(--viz-blue)" fill-opacity="0.82" />
        <text x="276" y="102" font-size="8.8" font-weight="700" fill="var(--text-secondary)">Anion Terukur + AG Terkoreksi</text>
        <rect x="276" y="108" width="${clW.toFixed(1)}" height="22" rx="3" fill="var(--accent-primary)" />
        <rect x="${(276 + clW).toFixed(1)}" y="108" width="${hcW.toFixed(1)}" height="22" fill="var(--accent-secondary)" />
        <rect x="${(276 + clW + hcW).toFixed(1)}" y="108" width="${Math.min(55, agW).toFixed(1)}" height="22" rx="3" fill="var(--accent-coral)" />
        <text x="276" y="152" font-size="10.2" font-weight="800" fill="var(--text-primary)">AG Raw: ${res.agRaw.toFixed(1)} mEq/L</text>
        <text x="276" y="168" font-size="10.5" font-weight="800" fill="${res.agCorr > 12 ? "var(--accent-coral)" : "var(--accent-primary)"}">AG Koreksi Alb: ${res.agCorr.toFixed(1)} mEq/L</text>
        <text x="276" y="182" font-size="8.2" fill="var(--text-muted)">(Koreksi +2,5 per turun 1 g/dL Alb)</text>
      </svg>
    `;
  }

  function renderNefroAbgWidget() {
    const def = NEFRO_ABG_PRESETS[nefroVizState.abgPreset] || NEFRO_ABG_PRESETS.kad;
    const res = evaluateNefroAbg(def);
    const controlsTop = `
      <div class="space-y-2.5 mb-3">
        ${renderCardioTabRow("viz-nefro-abg-presets", Object.entries(NEFRO_ABG_PRESETS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroAbgViz('${k}')`
        })), nefroVizState.abgPreset)}
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          ${[
            { id: "abg-ph", lbl: "pH", val: def.ph, step: "0.01" },
            { id: "abg-paco2", lbl: "PaCO₂", val: def.paco2, step: "1" },
            { id: "abg-hco3", lbl: "HCO₃⁻", val: def.hco3, step: "1" },
            { id: "abg-na", lbl: "Na⁺", val: def.na, step: "1" },
            { id: "abg-cl", lbl: "Cl⁻", val: def.cl, step: "1" },
            { id: "abg-alb", lbl: "Alb (g/dL)", val: def.alb, step: "0.1" }
          ].map((f) => `
            <div class="flex flex-col gap-1">
              <label for="${f.id}" class="text-[10px] font-mono font-bold text-[var(--text-muted)]">${f.lbl}</label>
              <input type="number" id="${f.id}" value="${f.val}" step="${f.step}" oninput="window.InternaApp.updateNefroAbgViz()" class="viz-calc-input text-xs font-mono py-1.5 px-2" />
            </div>
          `).join("")}
        </div>
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroAbg",
      title: "Kalkulator AGD Bertahap, Anion Gap Terkoreksi Albumin & Rumus Winter",
      tag: "Asam-Basa • Board Gold",
      controlsTop,
      svgHtml: buildNefroAbgSvg(res),
      info: {
        tone: res.tone,
        rKey: `abg-${res.ph}-${res.agCorr.toFixed(1)}`,
        title: `${res.primary} (pH ${res.ph.toFixed(2)}, AG Koreksi ${res.agCorr.toFixed(1)})`,
        c1Label: "Evaluasi Kompensasi (Rumus Winter)",
        c1Body: res.compNote,
        c2Label: "Analisis Delta-Delta Ratio",
        c2Body: res.deltaNote
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Selalu hitung <strong>AG terkoreksi albumin</strong> pada pasien sepsis/sindrom nefrotik — hipoalbuminemia menyamarkan HAGMA menjadi seolah-olah normal!</p>`
    });
  }

  function updateNefroAbgViz(presetKey) {
    if (presetKey && NEFRO_ABG_PRESETS[presetKey]) {
      nefroVizState.abgPreset = presetKey;
      const p = NEFRO_ABG_PRESETS[presetKey];
      const map = { "abg-ph": p.ph, "abg-paco2": p.paco2, "abg-hco3": p.hco3, "abg-na": p.na, "abg-cl": p.cl, "abg-alb": p.alb };
      Object.entries(map).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = String(v); });
      syncVizPresets("viz-nefro-abg-presets", Object.keys(NEFRO_ABG_PRESETS).map((k) => k === presetKey));
    }
    const vals = {
      ph: document.getElementById("abg-ph")?.value ?? 7.22,
      paco2: document.getElementById("abg-paco2")?.value ?? 24,
      hco3: document.getElementById("abg-hco3")?.value ?? 10,
      na: document.getElementById("abg-na")?.value ?? 136,
      cl: document.getElementById("abg-cl")?.value ?? 98,
      alb: document.getElementById("abg-alb")?.value ?? 3.8
    };
    const res = evaluateNefroAbg(vals);
    swapVizSvgFrame("viz-nefroAbg-frame", buildNefroAbgSvg(res));
    updateVizReadout(
      "viz-nefroAbg-readout",
      res.tone,
      formatVizReadoutHtml(`${res.primary} (pH ${res.ph.toFixed(2)}, AG Koreksi ${res.agCorr.toFixed(1)})`, "Evaluasi Kompensasi (Rumus Winter)", res.compNote, "Analisis Delta-Delta Ratio", res.deltaNote, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Selalu hitung <strong>AG terkoreksi albumin</strong> pada pasien sepsis/sindrom nefrotik!</p>`),
      `${res.ph}-${res.paco2}-${res.hco3}-${res.na}-${res.cl}-${res.alb}`
    );
  }

  // --- N4. Atlas Mikroskop 3-Lapisan Sindrom Nefrotik (nefro-4-1) ---
  const NEFRO_NEPHROTIC_DATA = {
    gnlm: {
      label: "GNLM (Minimal Change)", tone: "info",
      lm: "Mikroskop Cahaya normal (glomerulus utuh; tetes lipid pada tubulus proksimal).",
      ifm: "Imunofluoresensi negatif (tidak ada endapan imunoglobulin maupun komplemen).",
      em: "Fusi / pendataran difus seluruh foot processes (pedisel) podosit!",
      trap: "Terapi lini pertama adalah <strong>kortikosteroid</strong>; namun pada dewasa bila disertai gagal ginjal mendadak/riwayat NSAID atau limfoma Hodgkin, curigai GNLM sekunder!"
    },
    gsfs: {
      label: "GSFS (Fokal Segmental)", tone: "warning",
      lm: "Sklerosis jaringan parut & hialinosis hanya pada SEBAGIAN glomerulus (fokal) dan SEBAGIAN rumbai (segmental).",
      ifm: "Deposit IgM & C3 fokal terjebak pasif di area segmen yang sklerotik.",
      em: "Effacement foot processes podosit terutama di segmen sklerotik + kolaps kapiler.",
      trap: "GSFS primer sering muncul dengan sindrom nefrotik lengkap + respons steroid lebih lambat; bedakan dengan GSFS adaptif/sekunder (obesitas, HIV, refluks) yang lebih responsif ke RAAS blokade."
    },
    gnmn: {
      label: "GNMN (Membranosa / PLA2R)", tone: "danger",
      lm: "Penebalan homogen dinding kapiler difus; pewarnaan perak menampilkan 'spike-and-dome'!",
      ifm: "Pendaran hijau GRANULAR difus IgG & C3 sepanjang dinding kapiler subepitelial.",
      em: "Endapan padat elektron SUBEPITELIAL tepat di bawah podosit diapit taji (spikes) MBG!",
      trap: "<strong>Risiko paling tinggi mengalami Trombosis Vena Renalis (TVR)</strong> &amp; emboli paru bila albumin &lt;2,0–2,5 g/dL! Selalu cek anti-PLA2R serta skrining keganasan padat pada lansia."
    }
  };

  function buildNefroNephroticSvg(disKey, lensKey) {
    const d = NEFRO_NEPHROTIC_DATA[disKey] || NEFRO_NEPHROTIC_DATA.gnmn;
    const isIf = lensKey === "if";
    const bg = isIf ? "#071412" : "var(--bg-surface-subtle)";
    const titleColor = isIf ? "#5EEAD4" : "var(--text-primary)";
    const subColor = isIf ? "#99F6E4" : "var(--text-muted)";

    // Foot processes shape (normal vs effaced vs partially effaced)
    const fpPath = disKey === "gnlm"
      ? "M44,102 L436,102"
      : disKey === "gsfs"
      ? "M44,102 L200,102 L212,92 L224,102 L244,102 L256,92 L268,102 L288,102 L300,92 L312,102 L436,102"
      : "M44,102 L72,102 L82,90 L94,102 L120,102 L130,90 L142,102 L176,102 L188,90 L200,102 L436,102";

    return `
      <svg class="viz-svg" viewBox="0 0 480 226" role="img" aria-label="Mikroskop Dinding Kapiler Glomerulus Sindrom Nefrotik">
        <rect x="10" y="10" width="460" height="206" rx="12" fill="${bg}" stroke="var(--border-strong)" />
        <text x="24" y="30" font-size="10.2" font-weight="800" fill="${titleColor}">${d.label.toUpperCase()} — LENSA ${lensKey.toUpperCase()}</text>
        <text x="24" y="45" font-size="8.8" fill="${subColor}">Potongan Dinding Kapiler: Podosit (Atas) • MBG (Tengah) • Endotel &amp; Lumen (Bawah)</text>

        <!-- Layer Labels -->
        <rect x="34" y="64" width="412" height="28" rx="8" fill="${isIf ? "#0F2924" : "var(--bg-surface)"}" stroke="var(--border-subtle)" />
        <text x="240" y="81" text-anchor="middle" font-size="9.5" font-weight="800" fill="${titleColor}">Badan Sel Podosit (Epitel Viseral)</text>

        <!-- Podocyte Foot Processes -->
        <path d="${fpPath}" fill="none" stroke="${disKey === "gnlm" && lensKey === "em" ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="${disKey === "gnlm" ? 6 : 4.2}" stroke-linecap="round" />

        <!-- GBM / Glomerular Basement Membrane -->
        <rect x="34" y="106" width="412" height="22" rx="4" fill="${disKey === "gnmn" ? "var(--accent-secondary)" : "var(--viz-blue)"}" fill-opacity="${disKey === "gnmn" ? 0.35 : 0.25}" stroke="${disKey === "gnmn" ? "var(--accent-secondary)" : "var(--viz-blue)"}" stroke-width="1.6" />
        <text x="240" y="121" text-anchor="middle" font-size="8.8" font-weight="800" fill="${isIf ? "#FDE68A" : "var(--text-primary)"}">${disKey === "gnmn" ? "MBG Menebal ('Spike-and-Dome')" : "Membran Basalis Glomerulus (MBG)"}</text>

        <!-- Subepithelial Deposits for GNMN -->
        ${disKey === "gnmn" ? [74, 130, 190, 250, 310, 370].map((cx) =>
          `<ellipse cx="${cx}" cy="105" rx="14" ry="5.5" fill="${isIf ? "#22C55E" : "var(--accent-coral)"}" fill-opacity="0.92" />`
        ).join("") : ""}

        <!-- Segmental Sclerosis Patch for GSFS -->
        ${disKey === "gsfs" ? `<rect x="44" y="128" width="145" height="36" rx="8" fill="${isIf ? "#22C55E" : "var(--accent-coral)"}" fill-opacity="0.55" /><text x="116" y="150" text-anchor="middle" font-size="8.5" font-weight="800" fill="white">Sklerosis Segmental</text>` : ""}

        <!-- Fenestrated Endothelium & Capillary Lumen -->
        <line x1="34" y1="138" x2="446" y2="138" stroke="var(--accent-coral)" stroke-width="2.5" stroke-dasharray="10 5" />
        <rect x="34" y="142" width="412" height="44" rx="8" fill="${isIf ? "#131C24" : "var(--bg-surface)"}" fill-opacity="0.7" stroke="var(--border-subtle)" />
        <text x="240" y="168" text-anchor="middle" font-size="9.5" font-weight="700" fill="${subColor}">Lumen Kapiler Glomerulus (Eritrosit &amp; Albumin Plasma)</text>

        <!-- Lens Summary Pill inside SVG -->
        <text x="240" y="204" text-anchor="middle" font-size="8.8" font-weight="800" fill="${isIf ? "#4ADE80" : "var(--accent-primary)"}">${lensKey === "lm" ? d.lm : lensKey === "if" ? d.ifm : d.em}</text>
      </svg>
    `;
  }

  function renderNefroNephroticHistoWidget() {
    const disKey = NEFRO_NEPHROTIC_DATA[nefroVizState.nephDisease] ? nefroVizState.nephDisease : "gnmn";
    const lensKey = ["lm", "if", "em"].includes(nefroVizState.nephLens) ? nefroVizState.nephLens : "em";
    const d = NEFRO_NEPHROTIC_DATA[disKey];
    const controlsTop = `
      <div class="space-y-2 mb-2.5">
        ${renderCardioTabRow("viz-nefro-ns-dis", Object.entries(NEFRO_NEPHROTIC_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroNephroticHistoViz('${k}', null)`
        })), disKey)}
        ${renderCardioTabRow("viz-nefro-ns-lens", [
          { key: "lm", label: "Mikroskop Cahaya (LM)", onclick: "window.InternaApp.updateNefroNephroticHistoViz(null, 'lm')" },
          { key: "if", label: "Imunofluoresensi (IF)", onclick: "window.InternaApp.updateNefroNephroticHistoViz(null, 'if')" },
          { key: "em", label: "Mikroskop Elektron (EM)", onclick: "window.InternaApp.updateNefroNephroticHistoViz(null, 'em')" }
        ], lensKey)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroNephrotic",
      title: "Atlas Mikroskop 3-Lapisan Histopatologi Sindrom Nefrotik",
      tag: "Histologi Glomerulus",
      controlsTop,
      svgHtml: buildNefroNephroticSvg(disKey, lensKey),
      info: {
        tone: d.tone,
        rKey: `ns-${disKey}-${lensKey}`,
        title: `${d.label} — Lensa ${lensKey.toUpperCase()}`,
        c1Label: "Temuan Kunci Histopatologi",
        c1Body: lensKey === "lm" ? d.lm : lensKey === "if" ? d.ifm : d.em,
        c2Label: "Korelasi Komparatif (LM / IF / EM)",
        c2Body: `<strong>LM:</strong> ${d.lm} <strong>EM:</strong> ${d.em}`
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${d.trap}</p>`
    });
  }

  function updateNefroNephroticHistoViz(disIn, lensIn) {
    if (NEFRO_NEPHROTIC_DATA[disIn]) nefroVizState.nephDisease = disIn;
    if (["lm", "if", "em"].includes(lensIn)) nefroVizState.nephLens = lensIn;
    const disKey = nefroVizState.nephDisease;
    const lensKey = nefroVizState.nephLens;
    const d = NEFRO_NEPHROTIC_DATA[disKey];
    syncVizPresets("viz-nefro-ns-dis", Object.keys(NEFRO_NEPHROTIC_DATA).map((k) => k === disKey));
    syncVizPresets("viz-nefro-ns-lens", ["lm", "if", "em"].map((k) => k === lensKey));
    swapVizSvgFrame("viz-nefroNephrotic-frame", buildNefroNephroticSvg(disKey, lensKey));
    const c1 = lensKey === "lm" ? d.lm : lensKey === "if" ? d.ifm : d.em;
    updateVizReadout("viz-nefroNephrotic-readout", d.tone, formatVizReadoutHtml(`${d.label} — Lensa ${lensKey.toUpperCase()}`, "Temuan Kunci Histopatologi", c1, "Korelasi Komparatif (LM / IF / EM)", `<strong>LM:</strong> ${d.lm} <strong>EM:</strong> ${d.em}`, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${d.trap}</p>`), `ns-${disKey}-${lensKey}`);
  }

  // --- N5. Atlas Nefritis Lupus ISN/RPS Kelas I-VI (nefro-4-3) ---
  const LUPUS_CLASS_DATA = {
    1: { name: "Kelas I — Mesangial Minimal", tone: "info", affCount: 0, loc: "Mesangial (hanya IF/EM)", act: "Aktivitas 0/24", chron: "Kronisitas 0/12", tx: "Tidak butuh imunosupresi khusus ginjal; berikan Hidroksiklorokuin + kontrol SLE sistemik." },
    2: { name: "Kelas II — Mesangial Proliferatif", tone: "info", affCount: 2, loc: "Mesangial Proliferatif", act: "Aktivitas Ringan", chron: "Minimal", tx: "Proteinuria <1 g/24j: RAAS blokade (ACEi/ARB) + Hidroksiklorokuin; steroid jangka pendek bila sindrom nefrotik (lupus podocytopathy)." },
    3: { name: "Kelas III — Fokal Proliferatif (<50%)", tone: "warning", affCount: 3, loc: "Subendotelial Fokal (<50% glomerulus)", act: "Aktivitas Sedang (Indeks A)", chron: "Tergantung indeks C", tx: "<strong>Wajib Induksi Imunosupresi Agresif:</strong> Pulse Metilprednisolon + MMF (atau Siklofosfamid), lanjut Pemeliharaan MMF/Azatioprin." },
    4: { name: "Kelas IV — Difus Proliferatif (≥50%) • Wire-Loop!", tone: "danger", affCount: 7, loc: "Subendotelial Difus ('Wire-Loop' + Kresen Selular)", act: "Aktivitas Tinggi (0–24)", chron: "Pantau Sklerosis/Kresen", tx: "<strong>Paling Berat &amp; Tersering:</strong> Induksi Cito Pulse Metilprednisolon IV + MMF 2–3 g/hari atau Siklofosfamid (NIH/Euro-Lupus) ± Voclosporin/Belimumab." },
    5: { name: "Kelas V — Nefritis Lupus Membranosa", tone: "warning", affCount: 6, loc: "Subepitelial Difus ('Full-House IF')", act: "Nefrotik Dominan", chron: "Minimal–Sedang", tx: "Proteinuria nefrotik atau campuran III/IV+V: ACEi/ARB + Hidroksiklorokuin + Imunosupresi (MMF / CNI + steroid)." },
    6: { name: "Kelas VI — Sklerotik Lanjut (≥90%)", tone: "info", affCount: 9, loc: "Sklerosis Global ≥90% + Atrofi Tubulus", act: "Aktivitas ~0/24", chron: "Kronisitas Maksimal (C→12)", tx: "<strong>JANGAN beri imunosupresi berat</strong> untuk ginjal! Fokus proteksi PGK (RAAS blokade, SGLT2i) dan persiapan Terapi Pengganti Ginjal." }
  };

  function buildNefroLupusSvg(clsNum, idxMode) {
    const c = LUPUS_CLASS_DATA[clsNum] || LUPUS_CLASS_DATA[4];
    const showAct = idxMode !== "chron";
    // 10 miniature glomeruli grid
    const miniGlom = Array.from({ length: 10 }, (_, i) => {
      const gx = 28 + (i % 2) * 58;
      const gy = 58 + Math.floor(i / 2) * 32;
      const hit = i < c.affCount;
      const color = !hit ? "var(--accent-primary)" : clsNum === 6 ? "var(--text-muted)" : "var(--accent-coral)";
      return `<circle cx="${gx}" cy="${gy}" r="11.5" fill="${color}" fill-opacity="${hit ? 0.35 : 0.14}" stroke="${color}" stroke-width="1.8" /><circle cx="${gx}" cy="${gy}" r="4.5" fill="${color}" fill-opacity="${hit ? 0.85 : 0.3}" />`;
    }).join("");

    return `
      <svg class="viz-svg" viewBox="0 0 480 236" role="img" aria-label="Atlas Biopsi Nefritis Lupus Kelas I sampai VI">
        <!-- Left: 10 Glomeruli Biopsy Sampling -->
        <rect x="10" y="10" width="142" height="216" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="81" y="28" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">SAMPEL BIOPSI (10 GLOM)</text>
        <text x="81" y="40" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">${c.affCount}/10 Terlibat (${c.affCount * 10}%)</text>
        ${miniGlom}

        <!-- Right: Cross Section of Glomerular Tuft -->
        <rect x="160" y="10" width="310" height="216" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="174" y="28" font-size="10" font-weight="800" fill="var(--text-primary)">${c.name.toUpperCase()}</text>
        <text x="174" y="42" font-size="8.5" font-weight="700" fill="${showAct ? "var(--accent-coral)" : "var(--text-muted)"}">${showAct ? "Mode Indeks Aktivitas (Lesi Reversibel)" : "Mode Indeks Kronisitas (Parut Permanen)"}</text>

        <!-- Bowman's Capsule & Glomerular Tuft -->
        <circle cx="290" cy="128" r="68" fill="var(--bg-surface)" stroke="${clsNum === 4 && showAct ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="${clsNum === 4 ? 5 : 2.5}" />
        <!-- Cellular / Fibrous Crescent when Class 4 or 6 -->
        ${clsNum === 4 || clsNum === 6 ? `<path d="M226,104 C228,72 260,60 296,62 C264,74 242,96 244,126 Z" fill="${clsNum === 6 ? "var(--text-muted)" : "var(--accent-coral)"}" fill-opacity="0.72" />` : ""}

        <!-- Capillary Loops + Wire-loop or Subepithelial Deposits -->
        <circle cx="272" cy="122" r="22" fill="none" stroke="${clsNum === 3 || clsNum === 4 ? "var(--accent-coral)" : clsNum === 6 ? "var(--text-muted)" : "var(--viz-blue)"}" stroke-width="${clsNum === 4 ? 6.5 : 3.2}" />
        <circle cx="312" cy="134" r="22" fill="none" stroke="${clsNum === 5 ? "var(--accent-secondary)" : clsNum === 6 ? "var(--text-muted)" : "var(--viz-blue)"}" stroke-width="${clsNum === 5 ? 5.5 : 3.2}" />
        <!-- Mesangial Core -->
        <circle cx="290" cy="130" r="${clsNum >= 2 ? 15 : 8}" fill="${clsNum <= 2 ? "var(--accent-primary)" : clsNum === 6 ? "var(--text-muted)" : "var(--accent-secondary)"}" fill-opacity="0.65" />

        <!-- Labels Right Column -->
        <rect x="372" y="64" width="88" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="416" y="80" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-muted)">INDEKS A / C</text>
        <text x="416" y="96" text-anchor="middle" font-size="8.5" font-weight="800" fill="${showAct ? "var(--accent-coral)" : "var(--text-primary)"}">${showAct ? c.act : c.chron}</text>

        <rect x="172" y="200" width="288" height="20" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="316" y="213" text-anchor="middle" font-size="8.4" font-weight="700" fill="var(--text-primary)">Lokasi Endapan: ${c.loc}</text>
      </svg>
    `;
  }

  function renderNefroLupusHistoWidget() {
    const clsNum = Math.round(clampNum(nefroVizState.lupusClass, 1, 6, 4));
    const idxMode = nefroVizState.lupusIndex === "chron" ? "chron" : "act";
    const c = LUPUS_CLASS_DATA[clsNum];
    const controlsTop = `
      ${renderCardioTabRow("viz-nefro-lupus-idx", [
        { key: "act", label: "Indeks Aktivitas (0–24: Reversibel)", onclick: "window.InternaApp.updateNefroLupusHistoViz(null, 'act', true)" },
        { key: "chron", label: "Indeks Kronisitas (0–12: Permanen)", onclick: "window.InternaApp.updateNefroLupusHistoViz(null, 'chron', true)" }
      ], idxMode)}
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroLupus",
      label: "Pilih Kelas Histopatologi ISN/RPS (I–VI):",
      pillText: `Kelas ${["I", "II", "III", "IV", "V", "VI"][clsNum - 1]}`,
      min: 1, max: 6, step: 1, value: clsNum,
      trackBg: "linear-gradient(90deg, var(--accent-primary-soft), var(--accent-secondary-soft), var(--accent-coral-soft))",
      oninput: "window.InternaApp.updateNefroLupusHistoViz(this.value, null, true)",
      presets: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `Kelas ${["I", "II", "III", "IV", "V", "VI"][n - 1]}`, val: n, active: clsNum === n }))
    });
    return renderCardioWidgetCard({
      key: "nefroLupus",
      title: "Atlas Histopatologi Nefritis Lupus (Klasifikasi ISN/RPS & Indeks A/C)",
      tag: "ISN/RPS • KKI 4",
      controlsTop,
      svgHtml: buildNefroLupusSvg(clsNum, idxMode),
      controlsBottom,
      info: {
        tone: c.tone,
        rKey: `nl-${clsNum}-${idxMode}`,
        title: c.name,
        c1Label: "Temuan Biopsi & Indeks",
        c1Body: `${c.loc}. (${c.act} | ${c.chron}).`,
        c2Label: "Implikasi Terapi",
        c2Body: c.tx
      },
      readoutFooter: `<p class="mt-1.5"><strong>Kaidah Wajib Board:</strong> Seluruh pasien Nefritis Lupus (kecuali kontraindikasi mata/alergi) wajib menerima <strong>Hidroksiklorokuin + RAAS Blokade</strong>; Kelas III/IV + Aktivitas tinggi adalah indikasi mutlak induksi imunosupresi segera, sedangkan Kelas VI kontraindikasi imunosupresi berat!</p>`
    });
  }

  function updateNefroLupusHistoViz(clsIn, idxIn, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (clsIn !== null && clsIn !== undefined) nefroVizState.lupusClass = Math.round(clampNum(clsIn, 1, 6, 4));
    if (idxIn === "act" || idxIn === "chron") nefroVizState.lupusIndex = idxIn;
    const clsNum = nefroVizState.lupusClass;
    const idxMode = nefroVizState.lupusIndex;
    const roman = ["I", "II", "III", "IV", "V", "VI"][clsNum - 1];
    syncSliderAndPill("viz-nefroLupus-slider", "viz-nefroLupus-pill", clsNum, `Kelas ${roman}`);
    syncVizPresets("viz-nefro-lupus-idx", [idxMode === "act", idxMode === "chron"]);
    syncVizPresets("viz-nefroLupus-presets", [1, 2, 3, 4, 5, 6].map((n) => n === clsNum));
    swapVizSvgFrame("viz-nefroLupus-frame", buildNefroLupusSvg(clsNum, idxMode));
    const c = LUPUS_CLASS_DATA[clsNum];
    updateVizReadout("viz-nefroLupus-readout", c.tone, formatVizReadoutHtml(c.name, "Temuan Biopsi & Indeks", `${c.loc}. (${c.act} | ${c.chron}).`, "Implikasi Terapi", c.tx, `<p class="mt-1.5"><strong>Kaidah Wajib Board:</strong> Seluruh pasien Nefritis Lupus wajib mendapat <strong>Hidroksiklorokuin</strong>; Kelas III/IV butuh induksi steroid+MMF/siklofosfamid, sedangkan Kelas VI fokus ke PGK!</p>`), `nl-${clsNum}-${idxMode}`);
  }

  // --- N6. Simulator Kresen RPGN, Pola IF & Amiloidosis Congo Red (nefro-4-4) ---
  const NEFRO_RPGN_DATA = {
    linear: {
      label: "IF Linear (Goodpasture)", tone: "danger",
      ifPattern: "Garis fluoresensi IgG HALUS & KONTINU mengikuti seluruh kontur Membran Basalis Glomerulus.",
      tx: "<strong>Sindrom Goodpasture (Anti-GBM):</strong> RPGN + Hemoptisis (perdarahan alveolar). Terapi darurat: <strong>Plasmaferesis + Siklofosfamid + Pulse Steroid</strong>."
    },
    granular: {
      label: "IF Granular (Kompleks Imun)", tone: "warning",
      ifPattern: "Pendaran berbintik tidak merata ('lumpy-bumpy'): khas SLE (Full-House), GNAPS (IgG/C3), atau krioglobulinemia.",
      tx: "Atasi etiologi kompleks imun (steroid/imunosupresan pada lupus atau eradikasi infeksi pemicu seperti endokarditis/HCV)."
    },
    pauci: {
      label: "IF Pauci-Immune (ANCA+)", tone: "danger",
      ifPattern: "Nihil/sangat minim deposit imun (gelap), namun <strong>kresen nekrotikan</strong> di ruang Bowman sangat merusak kapiler!",
      tx: "<strong>Vaskulitis ANCA (GPA / MPA / EGPA):</strong> c-ANCA/PR3 atau p-ANCA/MPO (+). Induksi: <strong>Pulse Steroid + Rituximab / Siklofosfamid</strong>."
    },
    iga: {
      label: "Nefropati IgA (MEST)", tone: "info",
      ifPattern: "Deposit <strong>IgA DOMINAN</strong> yang berpendar terang khususnya di regio <strong>mesangium</strong> glomerulus.",
      tx: "Khas hematuria makroskopik <strong>sinfaringitik (1–3 hari pasca-ISPA)</strong>. Skor Oxford <strong>MEST-C</strong>; optimalkan RAAS blokade + SGLT2i (± Budesonide lepas-lambat/steroid)."
    },
    amyloid: {
      label: "Amiloidosis (Congo Red)", tone: "warning",
      ifPattern: "Di bawah <strong>cahaya polarisasi</strong>, deposit amiloid mesangial berpendar <strong>Apple-Green Birefringence</strong> yang khas!",
      tx: "Bedakan Amiloid AL (myeloma/rantai ringan) vs AA (inflamasi kronik/TB/RA); sindrom nefrotik dengan ginjal tetap besar &amp; kardiomiopati restriktif."
    }
  };

  function buildNefroRpgnSvg(modeKey, progPct) {
    const d = NEFRO_RPGN_DATA[modeKey] || NEFRO_RPGN_DATA.pauci;
    const p = clampNum(progPct, 0, 100, 48);
    const crescentThick = (12 + (p / 100) * 34).toFixed(1);
    const crescentColor = p > 70 ? "var(--text-muted)" : "var(--accent-coral)";
    const ifColor = modeKey === "amyloid" ? "#4ADE80" : "#22C55E";

    return `
      <svg class="viz-svg" viewBox="0 0 480 232" role="img" aria-label="Simulator Kresen RPGN dan Pola Imunofluoresensi">
        <!-- Left: Bowman Space Crescent Animation -->
        <rect x="10" y="10" width="224" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="22" y="28" font-size="9.5" font-weight="800" fill="var(--text-primary)">PROLIFERASI KRESEN RUANG BOWMAN</text>
        <text x="22" y="42" font-size="8.4" font-weight="700" fill="${crescentColor}">${p <= 25 ? "Kapiler Terbuka (Awal)" : p <= 70 ? "Cellular Crescent (Reversibel)" : "Fibrous Crescent (Sklerotik)"}</text>

        <circle cx="122" cy="132" r="66" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2.5" />
        <!-- Crescent Moon Expanding in Bowman's Space -->
        <path d="M58,128 C60,74 114,58 176,82 C136,80 100,104 98,158 C70,152 58,142 58,128 Z" fill="${crescentColor}" fill-opacity="${(0.25 + (p / 100) * 0.68).toFixed(2)}" stroke="${crescentColor}" stroke-width="${(Number(crescentThick) / 14).toFixed(1)}" />
        <!-- Compressed Glomerular Tuft -->
        <circle cx="136" cy="144" r="${Math.max(16, 36 - p * 0.16).toFixed(1)}" fill="var(--viz-blue)" fill-opacity="0.24" stroke="var(--viz-blue)" stroke-width="2.5" />
        <text x="136" y="148" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--text-primary)">Rumbai</text>

        <!-- Right: Darkroom Microscopy Window (IF / Polarized Congo Red) -->
        <rect x="242" y="10" width="228" height="212" rx="10" fill="#07120F" stroke="var(--border-strong)" />
        <text x="254" y="28" font-size="9.5" font-weight="800" fill="#5EEAD4">${modeKey === "amyloid" ? "MIKROSKOP POLARISASI CONGO RED" : "MIKROSKOP IMUNOFLUORESENSI (IF)"}</text>
        <text x="254" y="42" font-size="8.4" font-weight="700" fill="#99F6E4">${d.label}</text>

        <!-- Capillary Loops Pattern inside Darkfield -->
        ${modeKey === "linear" ? `
          <circle cx="328" cy="126" r="34" fill="none" stroke="${ifColor}" stroke-width="4" />
          <circle cx="378" cy="134" r="30" fill="none" stroke="${ifColor}" stroke-width="4" />
          <text x="356" y="198" text-anchor="middle" font-size="8.5" font-weight="800" fill="#4ADE80">Pita Linear Halus (Anti-GBM)</text>
        ` : modeKey === "granular" ? `
          <circle cx="328" cy="126" r="34" fill="none" stroke="${ifColor}" stroke-width="3.5" stroke-dasharray="3 6" />
          <circle cx="378" cy="134" r="30" fill="none" stroke="${ifColor}" stroke-width="3.5" stroke-dasharray="3 6" />
          <text x="356" y="198" text-anchor="middle" font-size="8.5" font-weight="800" fill="#4ADE80">Bintik Granular (Kompleks Imun)</text>
        ` : modeKey === "pauci" ? `
          <circle cx="328" cy="126" r="34" fill="none" stroke="#1E3A34" stroke-width="2" />
          <circle cx="378" cy="134" r="30" fill="none" stroke="#1E3A34" stroke-width="2" />
          <text x="356" y="198" text-anchor="middle" font-size="8.5" font-weight="800" fill="#FDE68A">Pauci-Immune: Nihil Endapan IF!</text>
        ` : modeKey === "iga" ? `
          <circle cx="356" cy="130" r="24" fill="${ifColor}" fill-opacity="0.85" />
          <circle cx="328" cy="126" r="34" fill="none" stroke="#1E3A34" stroke-width="1.8" />
          <circle cx="378" cy="134" r="30" fill="none" stroke="#1E3A34" stroke-width="1.8" />
          <text x="356" y="198" text-anchor="middle" font-size="8.5" font-weight="800" fill="#4ADE80">Deposit IgA Dominan di Mesangium</text>
        ` : `
          <polygon points="324,104 366,112 384,152 332,162" fill="${ifColor}" fill-opacity="0.72" />
          <circle cx="356" cy="130" r="44" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x="356" y="198" text-anchor="middle" font-size="8.5" font-weight="800" fill="#4ADE80">Apple-Green Birefringence</text>
        `}
      </svg>
    `;
  }

  function renderNefroRpgnHistoWidget() {
    const modeKey = NEFRO_RPGN_DATA[nefroVizState.rpgnMode] ? nefroVizState.rpgnMode : "pauci";
    const prog = clampNum(nefroVizState.rpgnProg, 0, 100, 48);
    const d = NEFRO_RPGN_DATA[modeKey];
    const controlsTop = renderCardioTabRow("viz-nefro-rpgn-tabs", Object.entries(NEFRO_RPGN_DATA).map(([k, v]) => ({
      key: k, label: v.label, onclick: `window.InternaApp.updateNefroRpgnHistoViz('${k}', null, true)`
    })), modeKey);
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroRpgn",
      label: "Simulasi Progresi Kresen Glomerulus (%):",
      pillText: prog <= 25 ? "Awal" : prog <= 70 ? "Cellular Crescent" : "Fibrous Crescent",
      min: 0, max: 100, step: 2, value: prog,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3), rgba(225,29,72,0.4), rgba(100,116,139,0.4))",
      oninput: "window.InternaApp.updateNefroRpgnHistoViz(null, this.value, true)",
      presets: [
        { label: "10% Awal", val: 10, active: prog <= 25 },
        { label: "50% Cellular", val: 50, active: prog > 25 && prog <= 70 },
        { label: "90% Fibrosa", val: 90, active: prog > 70 }
      ]
    });
    return renderCardioWidgetCard({
      key: "nefroRpgn",
      title: "Simulator Kresen RPGN, 3 Pola Imunofluoresensi & Polarisasi Congo Red",
      tag: "Biopsi Darurat • RPGN",
      controlsTop,
      svgHtml: buildNefroRpgnSvg(modeKey, prog),
      controlsBottom,
      info: {
        tone: d.tone,
        rKey: `rpgn-${modeKey}-${prog > 70 ? "f" : prog > 25 ? "c" : "a"}`,
        title: d.label,
        c1Label: "Pola Mikroskopis Khas",
        c1Body: d.ifPattern,
        c2Label: "Tatalaksana Spesifik",
        c2Body: d.tx
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Pada RPGN kresentik, waktu biopsi &amp; pulse steroid sangat krusial — <em>cellular crescent</em> masih dapat pulih dengan imunosupresi + plasmaferesis (anti-GBM), sedangkan <em>fibrous crescent</em> menandakan kerusakan permanen!</p>`
    });
  }

  function updateNefroRpgnHistoViz(modeIn, progIn, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (NEFRO_RPGN_DATA[modeIn]) nefroVizState.rpgnMode = modeIn;
    if (progIn !== null && progIn !== undefined) nefroVizState.rpgnProg = clampNum(progIn, 0, 100, 48);
    const modeKey = nefroVizState.rpgnMode;
    const prog = nefroVizState.rpgnProg;
    const d = NEFRO_RPGN_DATA[modeKey];
    syncSliderAndPill("viz-nefroRpgn-slider", "viz-nefroRpgn-pill", prog, prog <= 25 ? "Awal" : prog <= 70 ? "Cellular Crescent" : "Fibrous Crescent");
    syncVizPresets("viz-nefro-rpgn-tabs", Object.keys(NEFRO_RPGN_DATA).map((k) => k === modeKey));
    syncVizPresets("viz-nefroRpgn-presets", [prog <= 25, prog > 25 && prog <= 70, prog > 70]);
    swapVizSvgFrame("viz-nefroRpgn-frame", buildNefroRpgnSvg(modeKey, prog));
    updateVizReadout("viz-nefroRpgn-readout", d.tone, formatVizReadoutHtml(d.label, "Pola Mikroskopis Khas", d.ifPattern, "Tatalaksana Spesifik", d.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Selalu kejar <em>cellular crescent</em> dengan imunosupresi dini sebelum berubah menjadi <em>fibrous crescent</em>!</p>`), `rpgn-${modeKey}-${prog > 70 ? "f" : prog > 25 ? "c" : "a"}`);
  }

  // =========================================================================
  // PRIORITAS 2 — WIDGET NEFROLOGI GELOMBANG 2 (6 MODUL DIFERENSIASI & STAGING)
  // =========================================================================

  // --- N7. KDIGO AKI Staging + Kalkulator FENa/FEUrea + Silinder (nefro-3-1) ---
  const NEFRO_AKI_PRESETS = {
    prerenal: {
      label: "Prerenal Azotemia",
      una: 12, pna: 138, ucr: 140, pcr: 1.8, uurea: 900, purea: 60, ratio: 1.6
    },
    atn: {
      label: "ATN (Nekrosis Tubular)",
      una: 58, pna: 136, ucr: 55, pcr: 3.2, uurea: 450, purea: 45, ratio: 2.6
    },
    diuretic: {
      label: "Prerenal + Diuretik (Jebakan!)",
      una: 68, pna: 136, ucr: 50, pcr: 2.2, uurea: 480, purea: 75, ratio: 2.0
    }
  };

  function evaluateNefroAki(vals, ratioIn) {
    const una = clampNum(vals.una, 1, 250, 12);
    const pna = clampNum(vals.pna, 105, 175, 138);
    const ucr = clampNum(vals.ucr, 5, 450, 140);
    const pcr = clampNum(vals.pcr, 0.3, 20, 1.8);
    const uurea = clampNum(vals.uurea, 10, 4000, 900);
    const purea = clampNum(vals.purea, 5, 400, 60);
    const ratio = clampNum(ratioIn, 1.0, 3.5, 1.7);

    const fena = (una * pcr * 100) / Math.max(0.01, pna * ucr);
    const feurea = (uurea * pcr * 100) / Math.max(0.01, purea * ucr);
    const kdigoStage = ratio >= 3.0 ? 3 : ratio >= 2.0 ? 2 : ratio >= 1.5 ? 1 : 0;

    let pattern = "prerenal";
    let tone = "info";
    let title = "Azotemia Prerenal — Perfusi Turun, Tubulus Masih Utuh";
    let interp = "FENa <1% dan FEUrea <35% membuktikan reabsorpsi natrium & urea proksimal masih aktif maksimal.";
    let tx = "Respon baik dengan <strong>kristaloid seimbang</strong> bila hipovolemik / optimasi curah jantung pada sindrom kardiorenal.";

    if (fena > 2.0 && feurea < 35) {
      pattern = "diuretic";
      tone = "warning";
      title = "Jebakan Diuretik: FENa Naik Palsu, tetapi FEUrea <35% (Prerenal!)";
      interp = `Diuretik loop/tiazid membuang Na ke urin (FENa ${fena.toFixed(2)}%), namun <strong>reabsorpsi Urea PCT tetap utuh (FEUrea ${feurea.toFixed(1)}%)</strong>!`;
      tx = "Jangan salah diagnosis sebagai ATN — koreksi perfusi ginjal, evaluasi volume intravaskular, dan hindari penghentian resusitasi dini.";
    } else if (fena > 2.0 || feurea > 50) {
      pattern = "atn";
      tone = "danger";
      title = "Nekrosis Tubular Akut (ATN) — Kerusakan Epitel Tubulus Intrinsik";
      interp = `Kegagalan reabsorpsi Na (FENa ${fena.toFixed(2)}%) & urea (FEUrea ${feurea.toFixed(1)}%) disertai pelepasan epitel (<strong>muddy brown casts</strong>).`;
      tx = "<strong>STOP nefrotoksin</strong> (OAINS, aminoglikosida, kontras), jaga euvolemia (<strong>JANGAN over-resusitasi cairan!</strong>), siapkan TPG bila ada indikasi AEIOU.";
    } else if (fena >= 1.0 && fena <= 2.0) {
      pattern = feurea < 35 ? "prerenal" : "atn";
      tone = "warning";
      title = "Zona Intermedia (FENa 1–2%) — Konfirmasi FEUrea & Mikroskop Sedimen";
      interp = `FENa ${fena.toFixed(2)}% berada di zona abu-abu; gunakan FEUrea (${feurea.toFixed(1)}%) dan cari <em>muddy brown casts</em> pada sedimen urin.`;
      tx = "Cek respons tantangan cairan terbatas sambil memantau diuresis (<0,5 mL/kg/jam) dan elektrolit.";
    }

    return {
      una, pna, ucr, pcr, uurea, purea, ratio, kdigoStage, fena, feurea,
      pattern, tone, title, interp, tx
    };
  }

  function buildNefroAkiSvg(res) {
    const isAtn = res.pattern === "atn";
    const stagePill = res.kdigoStage === 0 ? "Pre-AKI (<1,5x)" : `KDIGO Stage ${res.kdigoStage}`;
    const cursorX = 258 + ((res.ratio - 1.0) / 2.5) * 196;
    const fenaW = Math.min(182, (Math.min(4.0, res.fena) / 4.0) * 182);
    const feureaW = Math.min(182, (Math.min(80, res.feurea) / 80) * 182);

    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="KDIGO AKI Staging dan Tubulus Prerenal vs ATN">
        <!-- Left Panel: Mikroskop Tubulus & Sedimen -->
        <rect x="14" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="124" y="29" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Mikroskop Tubulus &amp; Silinder</text>

        <!-- Tube Wall (Left & Right Epithelium) -->
        <rect x="28" y="42" width="192" height="122" rx="8" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.2" />
        ${isAtn ? `
          <!-- Damaged Epithelium & Sloughing Cells -->
          <path d="M 32 54 L 68 54 L 78 65 L 114 54 L 154 54 L 166 64 L 216 54" fill="none" stroke="var(--accent-coral)" stroke-width="3" />
          <path d="M 32 152 L 88 152 L 98 140 L 146 152 L 216 152" fill="none" stroke="var(--accent-coral)" stroke-width="3" />
          <circle cx="84" cy="78" r="7" fill="var(--accent-secondary)" opacity="0.8" />
          <circle cx="158" cy="130" r="6.5" fill="var(--accent-secondary)" opacity="0.8" />
          <!-- Muddy Brown Granular Cast -->
          <rect x="64" y="88" width="122" height="28" rx="12" fill="rgba(146,64,14,0.34)" stroke="#92400e" stroke-width="1.8" />
          <circle cx="82" cy="99" r="3.2" fill="#78350f" />
          <circle cx="96" cy="106" r="2.8" fill="#78350f" />
          <circle cx="114" cy="97" r="3.5" fill="#78350f" />
          <circle cx="132" cy="105" r="3" fill="#78350f" />
          <circle cx="150" cy="98" r="3.2" fill="#78350f" />
          <circle cx="168" cy="104" r="2.8" fill="#78350f" />
          <text x="125" y="130" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--accent-coral)">Muddy Brown Granular Cast</text>
        ` : `
          <!-- Intact Brush Border Epithelium -->
          ${[0, 1, 2, 3, 4, 5].map((i) => `
            <rect x="${36 + i * 30}" y="46" width="26" height="18" rx="3" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="1" />
            <rect x="${36 + i * 30}" y="142" width="26" height="18" rx="3" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="1" />
          `).join("")}
          <!-- Translucent Hyaline Cast -->
          <rect x="74" y="89" width="104" height="26" rx="13" fill="rgba(56,189,248,0.16)" stroke="var(--viz-blue)" stroke-width="1.3" stroke-dasharray="4 2" />
          <text x="126" y="105" text-anchor="middle" font-size="8.1" font-weight="700" fill="var(--viz-blue)">Silinder Hialin (Jernih)</text>
          <text x="124" y="131" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-primary)">Reabsorpsi Na+ &amp; Urea Aktif</text>
        `}

        <rect x="26" y="172" width="196" height="42" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="124" y="188" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--text-primary)">${isAtn ? "Epitel Nekrotik + Uosm <350" : "Tubulus Utuh + Uosm >500"}</text>
        <text x="124" y="203" text-anchor="middle" font-size="7.7" font-weight="700" fill="var(--text-muted)">${res.pattern === "diuretic" ? "Furosemid naikkan UNa palsu!" : isAtn ? "BUN/Cr biasanya ~10–15:1" : "BUN/Cr klasik >20:1"}</text>

        <!-- Right Panel: KDIGO Stage Bar + FENa/FEUrea Gauges -->
        <rect x="244" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="355" y="29" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">KDIGO AKI &amp; Indeks Tubulus</text>

        <!-- KDIGO Stage Bar (1.0 .. 3.5x) -->
        <rect x="258" y="42" width="39" height="20" rx="3" fill="rgba(100,116,139,0.18)" />
        <rect x="297" y="42" width="39" height="20" fill="var(--accent-primary-soft)" />
        <rect x="336" y="42" width="78" height="20" fill="var(--accent-secondary-soft)" />
        <rect x="414" y="42" width="40" height="20" rx="3" fill="var(--accent-coral-soft)" />
        <line x1="${cursorX}" y1="36" x2="${cursorX}" y2="70" stroke="var(--text-primary)" stroke-width="2.4" />
        <circle cx="${cursorX}" cy="36" r="3.5" fill="var(--accent-coral)" />
        <text x="277" y="55" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-secondary)">Basal</text>
        <text x="316" y="55" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--viz-blue)">St 1</text>
        <text x="375" y="55" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-secondary)">Stage 2</text>
        <text x="434" y="55" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-coral)">St 3</text>
        <text x="355" y="82" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--text-primary)">sCr ${res.ratio.toFixed(2)}x Baseline (${stagePill})</text>

        <!-- FENa Bar -->
        <text x="258" y="106" font-size="8.4" font-weight="800" fill="var(--text-primary)">FENa: ${res.fena.toFixed(2)}% ${res.fena < 1 ? "(Prerenal <1%)" : res.fena > 2 ? "(ATN/Diuretik >2%)" : "(Zona Abu)"}</text>
        <rect x="258" y="112" width="182" height="12" rx="4" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <rect x="258" y="112" width="${fenaW}" height="12" rx="4" fill="${res.fena < 1 ? "var(--accent-primary)" : res.fena > 2 ? "var(--accent-coral)" : "var(--accent-secondary)"}" />
        <line x1="${258 + (1.0 / 4.0) * 182}" y1="110" x2="${258 + (1.0 / 4.0) * 182}" y2="127" stroke="var(--text-muted)" stroke-dasharray="2 2" />
        <line x1="${258 + (2.0 / 4.0) * 182}" y1="110" x2="${258 + (2.0 / 4.0) * 182}" y2="127" stroke="var(--text-muted)" stroke-dasharray="2 2" />

        <!-- FEUrea Bar -->
        <text x="258" y="146" font-size="8.4" font-weight="800" fill="var(--text-primary)">FEUrea: ${res.feurea.toFixed(1)}% ${res.feurea < 35 ? "(Prerenal ≤35%)" : res.feurea > 50 ? "(ATN >50%)" : "(Intermedia)"}</text>
        <rect x="258" y="152" width="182" height="12" rx="4" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <rect x="258" y="152" width="${feureaW}" height="12" rx="4" fill="${res.feurea <= 35 ? "var(--accent-primary)" : res.feurea > 50 ? "var(--accent-coral)" : "var(--accent-secondary)"}" />
        <line x1="${258 + (35 / 80) * 182}" y1="150" x2="${258 + (35 / 80) * 182}" y2="167" stroke="var(--text-muted)" stroke-dasharray="2 2" />
        <line x1="${258 + (50 / 80) * 182}" y1="150" x2="${258 + (50 / 80) * 182}" y2="167" stroke="var(--text-muted)" stroke-dasharray="2 2" />

        <!-- Oliguria rule box -->
        <rect x="256" y="176" width="198" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="355" y="191" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-secondary)">Urin St 1: &lt;0.5 mL/kg/jam &gt;6j</text>
        <text x="355" y="205" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-coral)">St 3: ≥4,0 mg/dL, TPG, atau Anuria ≥12j</text>
      </svg>
    `;
  }

  function renderNefroAkiWidget() {
    const pKey = NEFRO_AKI_PRESETS[nefroVizState.akiPreset] ? nefroVizState.akiPreset : "prerenal";
    const def = NEFRO_AKI_PRESETS[pKey];
    const ratio = clampNum(nefroVizState.akiRatio, 1.0, 3.5, def.ratio);
    const res = evaluateNefroAki(def, ratio);
    const stagePill = res.kdigoStage === 0 ? `${res.ratio.toFixed(1)}x (Basal)` : `Stage ${res.kdigoStage} (${res.ratio.toFixed(1)}x)`;

    const controlsTop = `
      <div class="space-y-2.5 mb-2.5">
        ${renderCardioTabRow("viz-nefro-aki-presets", Object.entries(NEFRO_AKI_PRESETS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroAkiViz(null, '${k}', true)`
        })), pKey)}
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          ${[
            { id: "aki-una", lbl: "Na Urin", val: res.una, step: "1" },
            { id: "aki-pna", lbl: "Na Serum", val: res.pna, step: "1" },
            { id: "aki-ucr", lbl: "Cr Urin", val: res.ucr, step: "1" },
            { id: "aki-pcr", lbl: "Cr Serum", val: res.pcr, step: "0.1" },
            { id: "aki-uurea", lbl: "Urea Urin", val: res.uurea, step: "10" },
            { id: "aki-purea", lbl: "Urea Srm", val: res.purea, step: "1" }
          ].map((f) => `
            <div style="min-width: 0;">
              <label for="${f.id}" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1 truncate">${f.lbl}</label>
              <input type="number" id="${f.id}" value="${f.val}" step="${f.step}" oninput="window.InternaApp.updateNefroAkiViz()" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
            </div>
          `).join("")}
        </div>
      </div>
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "nefroAki",
      label: "Scrubber Rasio Kreatinin (Staging KDIGO 1–3):",
      pillText: stagePill,
      min: 1.0, max: 3.5, step: 0.05, value: ratio,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.28) 0% 40%, rgba(217,119,6,0.34) 40% 80%, rgba(225,29,72,0.42) 80% 100%)",
      oninput: "window.InternaApp.updateNefroAkiViz(this.value, null, true)",
      presets: [
        { label: "Stage 1 (1,6x)", val: 1.6, active: res.kdigoStage === 1 },
        { label: "Stage 2 (2,4x)", val: 2.4, active: res.kdigoStage === 2 },
        { label: "Stage 3 (3,2x)", val: 3.2, active: res.kdigoStage === 3 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroAki",
      title: "Staging KDIGO AKI, Kalkulator FENa/FEUrea & Sedimen Tubulus",
      tag: "KDIGO AKI • KKI 4",
      controlsTop,
      svgHtml: buildNefroAkiSvg(res),
      controlsBottom,
      info: {
        tone: res.tone,
        rKey: `aki-${res.pattern}-${res.fena.toFixed(1)}-${res.feurea.toFixed(1)}-${res.kdigoStage}`,
        title: `${res.title} (${stagePill})`,
        c1Label: "Interpretasi FENa vs FEUrea",
        c1Body: res.interp,
        c2Label: "Prioritas KDIGO Bundle",
        c2Body: res.tx
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan pakai FENa pada pasien yang sudah disuntik Furosemid! Hitung <strong>FEUrea (&le;35% = Prerenal)</strong> dan waspadai FENa rendah palsu pada <strong>kontras nefropati, sepsis dini, &amp; rhabdomyolisis</strong>.</p>`
    });
  }

  function updateNefroAkiViz(ratioIn, presetKey, fromUser = true) {
    if (fromUser && ratioIn !== null && ratioIn !== undefined) cancelAllVizAnimations();
    if (presetKey && NEFRO_AKI_PRESETS[presetKey]) {
      nefroVizState.akiPreset = presetKey;
      const p = NEFRO_AKI_PRESETS[presetKey];
      nefroVizState.akiRatio = p.ratio;
      const map = { "aki-una": p.una, "aki-pna": p.pna, "aki-ucr": p.ucr, "aki-pcr": p.pcr, "aki-uurea": p.uurea, "aki-purea": p.purea };
      Object.entries(map).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
      syncVizPresets("viz-nefro-aki-presets", Object.keys(NEFRO_AKI_PRESETS).map((k) => k === presetKey));
    }
    if (ratioIn !== null && ratioIn !== undefined) {
      nefroVizState.akiRatio = clampNum(ratioIn, 1.0, 3.5, 1.7);
    }
    const vals = {
      una: document.getElementById("aki-una")?.value ?? 12,
      pna: document.getElementById("aki-pna")?.value ?? 138,
      ucr: document.getElementById("aki-ucr")?.value ?? 140,
      pcr: document.getElementById("aki-pcr")?.value ?? 1.8,
      uurea: document.getElementById("aki-uurea")?.value ?? 900,
      purea: document.getElementById("aki-purea")?.value ?? 60
    };
    const res = evaluateNefroAki(vals, nefroVizState.akiRatio);
    const stagePill = res.kdigoStage === 0 ? `${res.ratio.toFixed(1)}x (Basal)` : `Stage ${res.kdigoStage} (${res.ratio.toFixed(1)}x)`;
    syncSliderAndPill("viz-nefroAki-slider", "viz-nefroAki-pill", res.ratio, stagePill);
    syncVizPresets("viz-nefroAki-presets", [res.kdigoStage === 1, res.kdigoStage === 2, res.kdigoStage === 3]);
    swapVizSvgFrame("viz-nefroAki-frame", buildNefroAkiSvg(res));
    updateVizReadout("viz-nefroAki-readout", res.tone, formatVizReadoutHtml(`${res.title} (${stagePill})`, "Interpretasi FENa vs FEUrea", res.interp, "Prioritas KDIGO Bundle", res.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Selalu hitung <strong>FEUrea (&le;35%)</strong> bila pasien sudah mendapat loop diuretik!</p>`), `aki-${res.pattern}-${res.fena.toFixed(1)}-${res.feurea.toFixed(1)}-${res.kdigoStage}`);
  }

  // --- N8. Atlas Mikroskop Sedimen Urin & Hematuria (nefro-1-2) ---
  const NEFRO_SEDIMENT_DATA = {
    dismorfik: {
      label: "1. Dismorfik & Silinder RBC", tone: "danger",
      finding: "Eritrosit <strong>dismorfik / akantosit (tonjolan bleb 'telinga Mickey Mouse') &gt;5%</strong> dan <strong>silinder eritrosit</strong> terjebak dalam matriks Tamm-Horsfall.",
      action: "Patognomonik <strong>Perdarahan Glomerular</strong> (Sindrom Nefritik / IgA / RPGN). Langkah lanjut: cek <strong>C3, C4, ANCA, anti-dsDNA &amp; pertimbangkan Biopsi Ginjal</strong> (bukan sistoskopi!)."
    },
    eumorfik: {
      label: "2. Eumorfik Urologis", tone: "info",
      finding: "Eritrosit berbentuk <strong>cakram bikonkaf bulat seragam (eumorfik)</strong> tanpa silinder dan tanpa proteinuria bermakna.",
      action: "Menandakan <strong>Hematuria Non-Glomerular / Urologis</strong> (nefrolitiasis, BPH, ISK, keganasan urotelial). Lanjutkan <strong>USG Ginjal, CT Urografi, atau Sistoskopi</strong>."
    },
    leukosit: {
      label: "3. Silinder Leukosit & AIN", tone: "warning",
      finding: "Matriks Tamm-Horsfall penuh <strong>leukosit PMN berlobus</strong> (+ bakteri = <strong>Pielonefritis</strong>; piuria steril + eosinofiluria = <strong>Nefritis Interstisial Akut / AIN</strong>).",
      action: "Bila piuria + kultur (-) dan eosinofiluria setelah PPI/OAINS/beta-laktam -> hentikan obat pemicu AIN; bila bakteri (+)/demam -> antibiotik pielonefritis."
    },
    waxy: {
      label: "4. Silinder Lilin & Hialin", tone: "info",
      finding: "Bedakan <strong>Silinder Hialin</strong> (bening, dehidrasi/furosemid/olahraga) vs <strong>Silinder Lilin (Waxy) &amp; Broad Cast</strong> (tepi tajam berlekuk di tubulus melebar).",
      action: "<strong>Broad / Waxy casts</strong> merupakan penanda klasik <strong>Stasis Kronik PGK Lanjut</strong>; hati-hati bila ukuran ginjal sudah mengecil (&lt;9 cm = kontraindikasi biopsi)."
    }
  };

  function buildNefroSedimentSvg(sedType, opticMode) {
    const isPhase = opticMode === "phase";
    const bgField = isPhase ? "rgba(15,23,42,0.88)" : "var(--bg-surface)";
    const rimStroke = isPhase ? "#38bdf8" : "var(--border-strong)";

    let elems = "";
    if (sedType === "dismorfik") {
      elems = `
        <!-- Acanthocyte with blebs -->
        <circle cx="92" cy="86" r="14" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <circle cx="92" cy="86" r="6" fill="none" stroke="var(--accent-coral)" stroke-width="1.3" />
        <circle cx="80" cy="76" r="4.2" fill="rgba(225,29,72,0.4)" stroke="var(--accent-coral)" stroke-width="1.4" />
        <circle cx="104" cy="76" r="4.2" fill="rgba(225,29,72,0.4)" stroke="var(--accent-coral)" stroke-width="1.4" />
        <text x="92" y="110" text-anchor="middle" font-size="7.5" font-weight="800" fill="${isPhase ? "#fda4af" : "var(--accent-coral)"}">Akantosit</text>
        <!-- RBC Cast in Tamm-Horsfall Matrix -->
        <rect x="78" y="128" width="106" height="32" rx="14" fill="${isPhase ? "var(--viz-blue-soft)" : "rgba(225,29,72,0.12)"}" stroke="${isPhase ? "var(--viz-blue)" : "var(--accent-coral)"}" stroke-width="1.6" />
        ${[94, 114, 134, 152, 168].map((rx, idx) => `<circle cx="${rx}" cy="${idx % 2 === 0 ? 140 : 148}" r="5.5" fill="var(--accent-coral)" opacity="0.88" />`).join("")}
        <text x="130" y="174" text-anchor="middle" font-size="7.6" font-weight="800" fill="${isPhase ? "#f8fafc" : "var(--text-primary)"}">Silinder Eritrosit</text>
      `;
    } else if (sedType === "eumorfik") {
      elems = `
        ${[[94, 88], [136, 78], [164, 116], [108, 138], [150, 154]].map(([cx, cy]) => `
          <circle cx="${cx}" cy="${cy}" r="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
          <circle cx="${cx}" cy="${cy}" r="5" fill="${bgField}" stroke="var(--accent-coral)" stroke-width="1" opacity="0.7" />
        `).join("")}
        <text x="130" y="182" text-anchor="middle" font-size="8" font-weight="800" fill="${isPhase ? "#f8fafc" : "var(--text-primary)"}">RBC Cakram Bikonkaf Utuh</text>
      `;
    } else if (sedType === "leukosit") {
      elems = `
        <!-- WBC Cast -->
        <rect x="70" y="68" width="120" height="36" rx="16" fill="${isPhase ? "rgba(56,189,248,0.16)" : "rgba(245,158,11,0.14)"}" stroke="${isPhase ? "var(--viz-blue)" : "var(--accent-secondary)"}" stroke-width="1.6" />
        ${[88, 112, 136, 160].map((cx) => `
          <circle cx="${cx}" cy="86" r="8" fill="rgba(245,158,11,0.35)" stroke="var(--accent-secondary)" stroke-width="1.4" />
          <circle cx="${cx - 2}" cy="85" r="2" fill="${isPhase ? "#fef08a" : "var(--text-primary)"}" />
          <circle cx="${cx + 2}" cy="87" r="2" fill="${isPhase ? "#fef08a" : "var(--text-primary)"}" />
        `).join("")}
        <text x="130" y="118" text-anchor="middle" font-size="7.5" font-weight="800" fill="${isPhase ? "#fde047" : "var(--accent-secondary)"}">Silinder Leukosit (PMN)</text>
        <!-- Bilobed Eosinophil + Rods -->
        <circle cx="96" cy="150" r="11" fill="rgba(236,72,153,0.25)" stroke="#ec4899" stroke-width="1.8" />
        <ellipse cx="92" cy="150" rx="3" ry="4" fill="#db2777" />
        <ellipse cx="100" cy="150" rx="3" ry="4" fill="#db2777" />
        <text x="96" y="172" text-anchor="middle" font-size="7.3" font-weight="800" fill="${isPhase ? "#f9a8d4" : "#be185d"}">Eosinofil (AIN)</text>
        <rect x="148" y="144" width="14" height="4" rx="2" fill="var(--accent-primary)" />
        <rect x="156" y="152" width="14" height="4" rx="2" fill="var(--accent-primary)" />
        <text x="160" y="172" text-anchor="middle" font-size="7.3" font-weight="800" fill="${isPhase ? "#6ee7b7" : "var(--accent-primary)"}">Bakteri (ISK)</text>
      `;
    } else {
      elems = `
        <!-- Hyaline Cast (faint top) -->
        <rect x="78" y="66" width="102" height="22" rx="11" fill="rgba(56,189,248,0.1)" stroke="${isPhase ? "#bae6fd" : "var(--viz-blue)"}" stroke-width="${isPhase ? "2" : "0.9"}" stroke-dasharray="4 3" />
        <text x="130" y="102" text-anchor="middle" font-size="7.4" font-weight="700" fill="${isPhase ? "#bae6fd" : "var(--viz-blue)"}">Silinder Hialin (Jinak)</text>
        <!-- Waxy Broad Cast (wide, cracked) -->
        <path d="M 68 122 L 188 122 Q 194 139 188 156 L 154 156 L 148 144 L 142 156 L 68 156 Q 62 139 68 122 Z" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="2" />
        <line x1="106" y1="122" x2="112" y2="136" stroke="var(--accent-secondary)" stroke-width="1.5" />
        <text x="130" y="176" text-anchor="middle" font-size="7.6" font-weight="800" fill="${isPhase ? "#fcd34d" : "var(--accent-secondary)"}">Waxy / Broad Cast (PGK Lanjut)</text>
      `;
    }

    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Atlas Mikroskop Sedimen Urin">
        <!-- Left Microscope Circular FOV -->
        <rect x="14" y="12" width="224" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="126" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">LPB 400x (${isPhase ? "Fase-Kontras" : "Cahaya Biasa"})</text>
        <circle cx="130" cy="122" r="88" fill="${bgField}" stroke="${rimStroke}" stroke-width="2.6" />
        ${elems}

        <!-- Right Interactive Legend & Clinical Decision Cards -->
        <rect x="248" y="12" width="218" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="357" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Klik Jenis Sedimen Urin:</text>
        ${[
          { k: "dismorfik", y: 42, ttl: "Akantosit & Silinder RBC", sub: "Glomerular → Biopsi / Serologi" },
          { k: "eumorfik", y: 84, ttl: "Eritrosit Eumorfik", sub: "Urologis → USG / Sistoskopi" },
          { k: "leukosit", y: 126, ttl: "Silinder Leukosit / Eos", sub: "Pielonefritis vs AIN Obat" },
          { k: "waxy", y: 168, ttl: "Silinder Lilin vs Hialin", sub: "PGK Lanjut vs Dehidrasi" }
        ].map((item) => {
          const active = sedType === item.k;
          return `
            <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroSedimentViz('${item.k}', null)" style="cursor:pointer;">
              <rect x="258" y="${item.y}" width="198" height="36" rx="12" fill="var(--bg-surface)" stroke="${active ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${active ? "2" : "1"}" />
              <text x="268" y="${item.y + 15}" font-size="8.3" font-weight="800" fill="${active ? "var(--accent-primary)" : "var(--text-primary)"}">${item.ttl}</text>
              <text x="268" y="${item.y + 29}" font-size="7.5" font-weight="600" fill="var(--text-muted)">${item.sub}</text>
            </g>
          `;
        }).join("")}
      </svg>
    `;
  }

  function renderNefroSedimentWidget() {
    const sedType = NEFRO_SEDIMENT_DATA[nefroVizState.sedType] ? nefroVizState.sedType : "dismorfik";
    const optic = nefroVizState.sedOptic === "bright" ? "bright" : "phase";
    const info = NEFRO_SEDIMENT_DATA[sedType];
    const controlsTop = `
      <div class="space-y-2 mb-2.5">
        ${renderCardioTabRow("viz-nefro-sed-tabs", Object.entries(NEFRO_SEDIMENT_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroSedimentViz('${k}', null)`
        })), sedType)}
        ${renderCardioTabRow("viz-nefro-sed-optic", [
          { key: "phase", label: "Mikroskop Fase-Kontras (Optimal Hialin/Akantosit)", onclick: "window.InternaApp.updateNefroSedimentViz(null, 'phase')" },
          { key: "bright", label: "Mikroskop Cahaya Biasa (Brightfield)", onclick: "window.InternaApp.updateNefroSedimentViz(null, 'bright')" }
        ], optic)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroSediment",
      title: "Atlas Mikroskop Sedimen Urin & Diferensiasi Hematuria",
      tag: "Sedimen • KKI 4",
      controlsTop,
      svgHtml: buildNefroSedimentSvg(sedType, optic),
      info: {
        tone: info.tone,
        rKey: `sed-${sedType}-${optic}`,
        title: `${info.label} (${optic === "phase" ? "Fase-Kontras" : "Cahaya Biasa"})`,
        c1Label: "Identifikasi Mikroskopik",
        c1Body: info.finding,
        c2Label: "Alur Diagnostik Lanjutan",
        c2Body: info.action
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Urin terlalu lama diam memicu <strong>lisis silinder/sel</strong>! Periksa urin segar &amp; ingat kontraindikasi biopsi: ginjal mengecil (<strong>&lt;9 cm</strong>), hipertensi tak terkontrol, koagulopati, atau ginjal tunggal.</p>`
    });
  }

  function updateNefroSedimentViz(sedIn, opticIn) {
    if (NEFRO_SEDIMENT_DATA[sedIn]) nefroVizState.sedType = sedIn;
    if (opticIn === "phase" || opticIn === "bright") nefroVizState.sedOptic = opticIn;
    const sedType = nefroVizState.sedType;
    const optic = nefroVizState.sedOptic;
    const info = NEFRO_SEDIMENT_DATA[sedType];
    syncVizPresets("viz-nefro-sed-tabs", Object.keys(NEFRO_SEDIMENT_DATA).map((k) => k === sedType));
    syncVizPresets("viz-nefro-sed-optic", [optic === "phase", optic === "bright"]);
    swapVizSvgFrame("viz-nefroSediment-frame", buildNefroSedimentSvg(sedType, optic));
    updateVizReadout("viz-nefroSediment-readout", info.tone, formatVizReadoutHtml(`${info.label} (${optic === "phase" ? "Fase-Kontras" : "Cahaya Biasa"})`, "Identifikasi Mikroskopik", info.finding, "Alur Diagnostik Lanjutan", info.action, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Stasis urin melisis silinder; hindari biopsi bila ginjal sudah kisut (<strong>&lt;9 cm</strong>)!</p>`), `sed-${sedType}-${optic}`);
  }

  // --- N9. KDIGO CKD Heat Map + CKD-EPI 2021 + Histologi Nefropati Diabetik (nefro-5-1) ---
  const CKD_G_ROWS = [
    { k: "G1", label: "G1 ≥90" },
    { k: "G2", label: "G2 60–89" },
    { k: "G3a", label: "G3a 45–59" },
    { k: "G3b", label: "G3b 30–44" },
    { k: "G4", label: "G4 15–29" },
    { k: "G5", label: "G5 <15" }
  ];
  const CKD_A_COLS = [
    { k: "A1", label: "A1 <30" },
    { k: "A2", label: "A2 30–300" },
    { k: "A3", label: "A3 >300" }
  ];
  const CKD_RISK_MATRIX = {
    "G1-A1": 0, "G1-A2": 1, "G1-A3": 2,
    "G2-A1": 0, "G2-A2": 1, "G2-A3": 2,
    "G3a-A1": 1, "G3a-A2": 2, "G3a-A3": 3,
    "G3b-A1": 2, "G3b-A2": 3, "G3b-A3": 3,
    "G4-A1": 3, "G4-A2": 3, "G4-A3": 3,
    "G5-A1": 3, "G5-A2": 3, "G5-A3": 3
  };
  const DN_HISTO_STAGES = [
    {
      s: 1, title: "Tahap 1: Hiperfiltrasi Glomerular & Penebalan Awal MBG",
      tone: "info",
      morph: "Dilatasi arteriol aferen memicu hipertensi intraglomerular + hipertrofi kapiler & penebalan seragam Membran Basalis Glomerulus (EM).",
      tx: "Segera mulai <strong>SGLT2i</strong> (memulihkan TGF makula densa!) + <strong>ACEi/ARB</strong> + target HbA1c ~7% dan TD &lt;130/80 mmHg."
    },
    {
      s: 2, title: "Tahap 2: Ekspansi Matriks Mesangial Difus (Albuminuria A2)",
      tone: "warning",
      morph: "Ekspansi matriks mesangial PAS-positif difus mengisi celah kapiler disertai mikroalbuminuria persisten (30–300 mg/g, konfirmasi >=2x).",
      tx: "Maksimalkan <strong>RAAS Blokade</strong> + <strong>SGLT2i</strong>; tambah <strong>Finerenon (MRA non-steroid)</strong> bila K+ &le;4,8 dan albuminuria persisten."
    },
    {
      s: 3, title: "Tahap 3: Nodul Kimmelstiel-Wilson & Hialinosis Aferen+Eferen",
      tone: "danger",
      morph: "Patognomonik PGD: <strong>Nodul aseluler mesangial Kimmelstiel-Wilson</strong> + <strong>hialinosis arteriol aferen DAN eferen bersamaan</strong>!",
      tx: "SGLT2i tetap boleh diteruskan hingga inisiasi dialisis (meski eLFG turun ke 20), namun <strong>STOP Metformin bila eLFG &lt;30</strong>!"
    },
    {
      s: 4, title: "Tahap 4: Sklerosis Global vs Waspada NDKD (Non-Diabetic Kidney Disease)",
      tone: "danger",
      morph: "Lebih dari 50–75% glomerulus sklerotik + fibrosis interstisium. Curigai <strong>NDKD</strong> bila: <strong>DM &lt;5 th, TIDAK ada retinopati DM, atau hematuria akantosit!</strong>",
      tx: "Rujuk nefrologi (persiapan akses TPG pada G4–G5, asupan protein non-dialisis 0,8 g/kgBB/hari); lakukan biopsi bila ada red flag NDKD!"
    }
  ];

  function calcCkdEpi2021(ageIn, scrIn, sexIn, acrIn) {
    const age = clampNum(ageIn, 18, 100, 58);
    const scr = clampNum(scrIn, 0.3, 18, 1.8);
    const sex = sexIn === "F" ? "F" : "M";
    const acr = clampNum(acrIn, 1, 5000, 180);

    const kappa = sex === "F" ? 0.7 : 0.9;
    const alpha = sex === "F" ? -0.241 : -0.302;
    const factor = sex === "F" ? 1.012 : 1.0;
    const ratio = scr / kappa;
    const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.200) * Math.pow(0.9938, age) * factor;

    const g = egfr >= 90 ? "G1" : egfr >= 60 ? "G2" : egfr >= 45 ? "G3a" : egfr >= 30 ? "G3b" : egfr >= 15 ? "G4" : "G5";
    const a = acr < 30 ? "A1" : acr <= 300 ? "A2" : "A3";
    return { age, scr, sex, acr, egfr, g, a };
  }

  function getCkdRiskInfo(g, a) {
    const lvl = CKD_RISK_MATRIX[`${g}-${a}`] ?? 2;
    const meta = [
      { tone: "info", label: "Risiko Rendah (Hijau)", freq: "Pantau 1x/tahun + kontrol risiko kardiovaskular." },
      { tone: "warning", label: "Risiko Sedang (Kuning)", freq: "Pantau 1–2x/tahun; mulai SGLT2i/ACEi bila A2/DM." },
      { tone: "warning", label: "Risiko Tinggi (Oranye)", freq: "Pantau 2–3x/tahun; optimalkan RAAS + SGLT2i." },
      { tone: "danger", label: "Risiko Sangat Tinggi (Merah)", freq: "Wajib Rujuk Nefrologi (>=3–4x/tahun) & persiapan akses TPG bila G4–G5!" }
    ][lvl];
    return { lvl, ...meta };
  }

  function buildNefroCkdSvg(tab, gKey, aKey, dnStageVal, epiRes) {
    if (tab === "histo") {
      const stNum = Math.min(4, Math.max(1, Math.round(dnStageVal)));
      const st = DN_HISTO_STAGES[stNum - 1];
      const cursorX = 28 + ((clampNum(dnStageVal, 1, 4, 3) - 1) / 3) * 190;
      const gbmThick = stNum >= 3 ? 4.2 : stNum === 2 ? 3.0 : 2.0;
      return `
        <svg viewBox="0 0 480 244" class="viz-svg" role="img" aria-label="Atlas Progresi Histologi Nefropati Diabetik">
          <!-- Left: Glomerular Cross Section -->
          <rect x="14" y="12" width="222" height="220" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
          <text x="125" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Mikroanatomi Glomerulus DM (PAS)</text>
          <!-- Afferent & Efferent Arterioles (Hyalinosis on BOTH at stage >=3) -->
          <path d="M 32 76 L 82 96" fill="none" stroke="${stNum >= 3 ? "#ec4899" : stNum === 1 ? "var(--accent-primary)" : "var(--text-muted)"}" stroke-width="${stNum === 1 ? "8" : "5"}" stroke-linecap="round" />
          <path d="M 82 146 L 32 166" fill="none" stroke="${stNum >= 3 ? "#ec4899" : "var(--viz-blue)"}" stroke-width="5" stroke-linecap="round" />
          <text x="24" y="65" font-size="7.2" font-weight="800" fill="${stNum >= 3 ? "#db2777" : "var(--text-muted)"}">${stNum >= 3 ? "Aferen Hialin!" : "Aferen"}</text>
          <text x="24" y="180" font-size="7.2" font-weight="800" fill="${stNum >= 3 ? "#db2777" : "var(--text-muted)"}">${stNum >= 3 ? "Eferen Hialin!" : "Eferen"}</text>

          <!-- Bowman Capsule & Glomerular Tuft -->
          <circle cx="144" cy="118" r="64" fill="var(--bg-surface)" stroke="${stNum === 4 ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="${gbmThick}" />
          <!-- Capillary Loops -->
          <path d="M 102 106 C 110 72, 168 72, 180 108 C 194 138, 160 166, 128 156 C 98 156, 92 126, 102 106 Z" fill="${stNum >= 2 ? "rgba(236,72,153,0.16)" : "rgba(0,122,255,0.1)"}" stroke="var(--accent-coral)" stroke-width="${gbmThick}" />
          ${stNum >= 3 ? `
            <!-- Kimmelstiel-Wilson Acellular Nodules (PAS+ pink) -->
            <circle cx="136" cy="102" r="14" fill="rgba(219,39,119,0.55)" stroke="#be185d" stroke-width="1.6" />
            <circle cx="164" cy="130" r="12" fill="rgba(219,39,119,0.55)" stroke="#be185d" stroke-width="1.6" />
            <text x="144" y="176" text-anchor="middle" font-size="7.6" font-weight="800" fill="#be185d">Nodul Kimmelstiel-Wilson</text>
          ` : `
            <text x="144" y="176" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">${stNum === 1 ? "Hiperfiltrasi + MBG Menebal" : "Ekspansi Mesangium Difus"}</text>
          `}

          <!-- Progression Cursor Bar inside SVG -->
          <rect x="28" y="198" width="190" height="8" rx="4" fill="var(--border-subtle)" />
          <circle cx="${cursorX}" cy="202" r="5" fill="var(--accent-primary)" />
          <text x="125" y="222" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-primary)">Tahap ${stNum} dari 4</text>

          <!-- Right: Red Flags NDKD & Rules -->
          <rect x="246" y="12" width="220" height="220" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
          <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Kapan Curiga NDKD (Biopsi)?</text>
          ${[
            { y: 42, lbl: "1. Tidak ada Retinopati Diabetik", col: "var(--accent-coral)" },
            { y: 74, lbl: "2. Hematuria Dismorfik / Akantosit", col: "var(--accent-coral)" },
            { y: 106, lbl: "3. Penurunan eLFG terlalu cepat", col: "var(--accent-secondary)" },
            { y: 138, lbl: "4. Sindrom Nefrotik mendadak <5 th DM", col: "var(--accent-secondary)" }
          ].map((it) => `
            <rect x="258" y="${it.y}" width="196" height="26" rx="10" fill="var(--bg-surface)" stroke="${it.col}" stroke-width="1" />
            <text x="356" y="${it.y + 16}" text-anchor="middle" font-size="7.7" font-weight="700" fill="var(--text-primary)">${it.lbl}</text>
          `).join("")}
          <rect x="258" y="176" width="196" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--accent-primary)" stroke-width="1.2" />
          <text x="356" y="194" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--accent-primary)">Khas DM vs Hipertensi:</text>
          <text x="356" y="210" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-secondary)">DM: Aferen &amp; Eferen KEDUANYA hialin</text>
        </svg>
      `;
    }

    // Mode 1: Interactive 6x3 KDIGO Heatmap + CKD-EPI 2021 Gauge
    const risk = getCkdRiskInfo(gKey, aKey);
    const cellColors = [
      "rgba(16,185,129,0.28)",
      "rgba(234,179,8,0.34)",
      "rgba(249,115,22,0.4)",
      "rgba(225,29,72,0.44)"
    ];
    const cellText = ["Rendah", "Sedang", "Tinggi", "Sgt Tgg"];

    return `
      <svg viewBox="0 0 480 244" class="viz-svg" role="img" aria-label="Peta Risiko KDIGO PGK dan Kalkulator CKD-EPI 2021">
        <!-- Left Heatmap Panel -->
        <rect x="14" y="10" width="302" height="224" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="165" y="26" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Matriks KDIGO (Klik Sel G × A)</text>
        ${CKD_A_COLS.map((ac, ci) => `<text x="${134 + ci * 64}" y="42" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-secondary)">${ac.label}</text>`).join("")}
        ${CKD_G_ROWS.map((gr, ri) => {
          const y = 49 + ri * 29;
          return `
            <text x="24" y="${y + 16}" font-size="7.8" font-weight="800" fill="${gr.k === gKey ? "var(--accent-primary)" : "var(--text-secondary)"}">${gr.label}</text>
            ${CKD_A_COLS.map((ac, ci) => {
              const x = 104 + ci * 64;
              const lvl = CKD_RISK_MATRIX[`${gr.k}-${ac.k}`];
              const isSel = gr.k === gKey && ac.k === aKey;
              return `
                <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroCkdViz(null, '${gr.k}', '${ac.k}', null, true)" style="cursor:pointer;">
                  <rect x="${x}" y="${y}" width="60" height="25" rx="4" fill="${cellColors[lvl]}" stroke="${isSel ? "var(--text-primary)" : "var(--border-subtle)"}" stroke-width="${isSel ? "2.4" : "0.8"}" />
                  <text x="${x + 30}" y="${y + 16}" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--text-primary)">${cellText[lvl]}</text>
                </g>
              `;
            }).join("")}
          `;
        }).join("")}

        <!-- Right eGFR Card & 4 Pillars -->
        <rect x="326" y="10" width="140" height="224" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="396" y="28" text-anchor="middle" font-size="8.6" font-weight="800" fill="var(--text-primary)">CKD-EPI 2021</text>
        <rect x="336" y="36" width="120" height="58" rx="8" fill="var(--bg-surface)" stroke="var(--accent-primary)" stroke-width="1.4" />
        <text x="396" y="59" text-anchor="middle" font-size="16" font-weight="800" fill="var(--accent-primary)">${epiRes.egfr.toFixed(0)}</text>
        <text x="396" y="73" text-anchor="middle" font-size="7.3" font-weight="700" fill="var(--text-muted)">mL/mnt/1,73 m²</text>
        <text x="396" y="87" text-anchor="middle" font-size="8.1" font-weight="800" fill="var(--text-primary)">Status: ${gKey} / ${aKey}</text>

        <rect x="336" y="102" width="120" height="36" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="396" y="117" text-anchor="middle" font-size="7.8" font-weight="800" fill="${risk.lvl >= 3 ? "var(--accent-coral)" : risk.lvl >= 1 ? "var(--accent-secondary)" : "var(--accent-primary)"}">${risk.label}</text>
        <text x="396" y="131" text-anchor="middle" font-size="7" font-weight="600" fill="var(--text-muted)">${risk.lvl >= 3 ? "Rujuk Nefro >=3-4x/th" : "Pantau 1–2x/tahun"}</text>

        <rect x="336" y="146" width="120" height="78" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="396" y="161" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-primary)">4 Pilar PGK / DM:</text>
        <text x="344" y="175" font-size="7.1" font-weight="700" fill="var(--accent-primary)">1. ACEi / ARB (Dosis Maks)</text>
        <text x="344" y="188" font-size="7.1" font-weight="700" fill="var(--accent-primary)">2. SGLT2i (eLFG ≥20)</text>
        <text x="344" y="201" font-size="7.1" font-weight="700" fill="var(--viz-blue)">3. Finerenon (K ≤4,8)</text>
        <text x="344" y="214" font-size="7.1" font-weight="700" fill="var(--text-secondary)">4. GLP-1 RA / Statin</text>
      </svg>
    `;
  }

  function renderNefroCkdWidget() {
    const tab = nefroVizState.ckdTab === "histo" ? "histo" : "heatmap";
    const gKey = nefroVizState.ckdG || "G3b";
    const aKey = nefroVizState.ckdA || "A2";
    const dnVal = clampNum(nefroVizState.dnStage, 1, 4, 3);
    const dnInt = Math.min(4, Math.max(1, Math.round(dnVal)));
    const epi = calcCkdEpi2021(58, 1.8, "M", 180);
    const risk = getCkdRiskInfo(gKey, aKey);
    const dnInfo = DN_HISTO_STAGES[dnInt - 1];

    const controlsTop = `
      <div class="space-y-2.5 mb-2.5">
        ${renderCardioTabRow("viz-nefro-ckd-tabs", [
          { key: "heatmap", label: "1. Peta Risiko KDIGO + Kalkulator CKD-EPI 2021", onclick: "window.InternaApp.updateNefroCkdViz('heatmap', null, null, null, true)" },
          { key: "histo", label: "2. Atlas Progresi Histologi Nefropati Diabetik", onclick: "window.InternaApp.updateNefroCkdViz('histo', null, null, null, true)" }
        ], tab)}
        <div id="viz-nefro-ckd-calc-wrap" class="${tab === "heatmap" ? "" : "hidden"} grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div style="min-width:0;">
            <label for="ckd-age" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">Umur (th)</label>
            <input type="number" id="ckd-age" value="58" min="18" max="100" oninput="window.InternaApp.updateNefroCkdViz(null, null, null, null, true)" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
          </div>
          <div style="min-width:0;">
            <label for="ckd-scr" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">Kreatinin (mg/dL)</label>
            <input type="number" id="ckd-scr" value="1.8" step="0.1" min="0.3" max="18" oninput="window.InternaApp.updateNefroCkdViz(null, null, null, null, true)" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
          </div>
          <div style="min-width:0;">
            <label for="ckd-sex" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">Jenis Kelamin</label>
            <select id="ckd-sex" onchange="window.InternaApp.updateNefroCkdViz(null, null, null, null, true)" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full">
              <option value="M" selected>Laki-laki</option>
              <option value="F">Perempuan</option>
            </select>
          </div>
          <div style="min-width:0;">
            <label for="ckd-acr" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">uACR (mg/g)</label>
            <input type="number" id="ckd-acr" value="180" step="10" min="1" max="5000" oninput="window.InternaApp.updateNefroCkdViz(null, null, null, null, true)" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
          </div>
        </div>
      </div>
    `;

    const controlsBottom = `
      <div id="viz-nefro-dn-slider-wrap" class="${tab === "histo" ? "" : "hidden"}">
        ${renderCardioSliderBlock({
          key: "nefroDn",
          label: "Tahap Histologi Nefropati Diabetik (1–4):",
          pillText: `Tahap ${dnInt}`,
          min: 1, max: 4, step: 0.05, value: dnVal,
          trackBg: "linear-gradient(90deg, rgba(0,122,255,0.28) 0% 33%, rgba(217,119,6,0.34) 33% 66%, rgba(225,29,72,0.42) 66% 100%)",
          oninput: "window.InternaApp.updateNefroCkdViz(null, null, null, this.value, true)",
          presets: [
            { label: "1. Hiperfiltrasi", val: 1, active: dnInt === 1 },
            { label: "2. Mesangial", val: 2, active: dnInt === 2 },
            { label: "3. Kimmelstiel-Wilson", val: 3, active: dnInt === 3 },
            { label: "4. Sklerosis/NDKD", val: 4, active: dnInt === 4 }
          ]
        })}
      </div>
    `;

    return renderCardioWidgetCard({
      key: "nefroCkd",
      title: "Peta Risiko KDIGO PGK, CKD-EPI 2021 & Histologi Nefropati Diabetik",
      tag: "PGK & PGD • KKI 4",
      controlsTop,
      svgHtml: buildNefroCkdSvg(tab, gKey, aKey, dnVal, epi),
      controlsBottom,
      info: tab === "histo"
        ? { tone: dnInfo.tone, rKey: `ckd-histo-${dnInt}`, title: dnInfo.title, c1Label: "Patologi Glomerulus & Vaskular", c1Body: dnInfo.morph, c2Label: "Terapi & Penyesuaian Obat", c2Body: dnInfo.tx }
        : { tone: risk.tone, rKey: `ckd-hm-${gKey}-${aKey}`, title: `KDIGO ${gKey} / ${aKey} — ${risk.label} (eLFG CKD-EPI: ${epi.egfr.toFixed(1)} mL/mnt)`, c1Label: "Frekuensi Pemantauan & Rujukan", c1Body: risk.freq, c2Label: "Target Nefroproteksi", c2Body: "TD &lt;130/80 mmHg, HbA1c ~7%, asupan protein non-dialisis <strong>0,8 g/kgBB/hari</strong> (1,0–1,2 pada dialisis), STOP Metformin bila eLFG &lt;30!" },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Kenaikan kreatinin hingga <strong>&le;30% setelah ACEi/ARB/SGLT2i</strong> adalah efek hemodinamik eferen/TGF protektif — JANGAN dihentikan selama K+ &lt;5,5 dan kenaikan &le;30%!</p>`
    });
  }

  function updateNefroCkdViz(tabIn, gIn, aIn, dnIn, fromUser = true) {
    if (fromUser && (dnIn !== null && dnIn !== undefined)) cancelAllVizAnimations();
    if (tabIn === "heatmap" || tabIn === "histo") nefroVizState.ckdTab = tabIn;

    const ageEl = document.getElementById("ckd-age");
    const scrEl = document.getElementById("ckd-scr");
    const sexEl = document.getElementById("ckd-sex");
    const acrEl = document.getElementById("ckd-acr");
    const epi = calcCkdEpi2021(ageEl ? ageEl.value : 58, scrEl ? scrEl.value : 1.8, sexEl ? sexEl.value : "M", acrEl ? acrEl.value : 180);

    if (gIn || aIn) {
      if (gIn) nefroVizState.ckdG = gIn;
      if (aIn) nefroVizState.ckdA = aIn;
    } else if (tabIn === null && dnIn === null) {
      nefroVizState.ckdG = epi.g;
      nefroVizState.ckdA = epi.a;
    }

    if (dnIn !== null && dnIn !== undefined) {
      nefroVizState.dnStage = clampNum(dnIn, 1, 4, 3);
    }

    const tab = nefroVizState.ckdTab;
    const gKey = nefroVizState.ckdG;
    const aKey = nefroVizState.ckdA;
    const dnVal = nefroVizState.dnStage;
    const dnInt = Math.min(4, Math.max(1, Math.round(dnVal)));

    const calcWrap = document.getElementById("viz-nefro-ckd-calc-wrap");
    const sliderWrap = document.getElementById("viz-nefro-dn-slider-wrap");
    if (calcWrap) calcWrap.classList.toggle("hidden", tab !== "heatmap");
    if (sliderWrap) sliderWrap.classList.toggle("hidden", tab !== "histo");

    syncVizPresets("viz-nefro-ckd-tabs", [tab === "heatmap", tab === "histo"]);
    syncSliderAndPill("viz-nefroDn-slider", "viz-nefroDn-pill", dnVal, `Tahap ${dnInt}`);
    syncVizPresets("viz-nefroDn-presets", [1, 2, 3, 4].map((x) => x === dnInt));
    swapVizSvgFrame("viz-nefroCkd-frame", buildNefroCkdSvg(tab, gKey, aKey, dnVal, epi));

    const risk = getCkdRiskInfo(gKey, aKey);
    const dnInfo = DN_HISTO_STAGES[dnInt - 1];
    if (tab === "histo") {
      updateVizReadout("viz-nefroCkd-readout", dnInfo.tone, formatVizReadoutHtml(dnInfo.title, "Patologi Glomerulus & Vaskular", dnInfo.morph, "Terapi & Penyesuaian Obat", dnInfo.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Kenaikan sCr &le;30% pasca-ACEi/ARB/SGLT2i bersifat hemodinamik protektif (jangan dihentikan selama stabil &amp; normokalemia)!</p>`), `ckd-histo-${dnInt}`);
    } else {
      updateVizReadout("viz-nefroCkd-readout", risk.tone, formatVizReadoutHtml(`KDIGO ${gKey} / ${aKey} — ${risk.label} (eLFG CKD-EPI: ${epi.egfr.toFixed(1)} mL/mnt)`, "Frekuensi Pemantauan & Rujukan", risk.freq, "Target Nefroproteksi", "TD &lt;130/80 mmHg, HbA1c ~7%, protein non-dialisis <strong>0,8 g/kgBB/hari</strong>, STOP Metformin bila eLFG &lt;30!", `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Kenaikan kreatinin hingga <strong>&le;30% setelah ACEi/ARB/SGLT2i</strong> jangan langsung dihentikan!</p>`), `ckd-hm-${gKey}-${aKey}-${epi.egfr.toFixed(0)}`);
    }
  }

  // --- N10. Simulator Osmosis Neuron, NaCl 3% & Pencegahan ODS (nefro-2-1) ---
  const NEFRO_NA_MODES = {
    acute: { label: "Hiponatremia Akut (<48 jam)" },
    chronic: { label: "Hiponatremia Kronik (>48 jam)" },
    hyperna: { label: "Hipernatremia (>145 mEq/L)" }
  };

  function evaluateNefroNa(mode, bbIn, naStartIn, deltaIn) {
    const bb = clampNum(bbIn, 30, 150, 60);
    const naStart = clampNum(naStartIn, 95, 185, mode === "hyperna" ? 160 : 114);
    const delta = clampNum(deltaIn, 0, 16, 8.0);
    const isHyper = mode === "hyperna";

    let tone = "info";
    let statusPill = "Zona Aman";
    let neuronRadius = 30;
    let formulaTxt = "";
    let safetyMsg = "";
    let txPlan = "";

    if (isHyper) {
      const fwdL = 0.6 * bb * Math.max(0, (naStart - 140) / 140);
      neuronRadius = Math.max(19, 30 - (naStart - 140) * 0.25 + delta * 0.45);
      if (delta > 12) {
        tone = "danger";
        statusPill = "BAHAYA Edema Serebri!";
        safetyMsg = `Menurunkan Na &gt;10–12 mEq/L per 24 jam pada hipernatremia kronik memicu pergeseran air mendadak ke otak &rarr; <strong>Edema Serebri Fatal</strong>!`;
      } else {
        tone = delta >= 4 && delta <= 10 ? "info" : "warning";
        statusPill = "Rehidrasi Aman";
        safetyMsg = "Koreksi hipernatremia secara bertahap &le;10–12 mEq/L/24 jam (0,5 mEq/L/jam).";
      }
      formulaTxt = `Defisit Air Bebas: 0,6 &times; ${bb} kg &times; (${naStart}/140 &minus; 1) = <strong>${fwdL.toFixed(2)} L</strong> (D5% / NaCl 0,45%).`;
      txPlan = "Gunakan cairan hipotonik (D5% atau NaCl 0,45%), pantau Na tiap 4–6 jam agar penurunan maksimal &le;10–12 mEq/L/hari.";
    } else {
      const meqNeed = 0.5 * bb * delta;
      const mlNacl3 = (meqNeed / 513) * 1000;
      const rateHr = mlNacl3 / 24;
      if (delta > 10) {
        tone = "danger";
        statusPill = "BAHAYA ODS / Myelinolisis!";
        neuronRadius = 21;
        safetyMsg = `Koreksi <strong>+${delta.toFixed(1)} mEq/L/24 jam (&gt;10!)</strong> mengempiskan neuron &amp; merusak mielin Pons &rarr; <strong>Osmotic Demyelination Syndrome (ODS / Locked-In)</strong>!`;
      } else if (delta > 8 && mode === "chronic") {
        tone = "warning";
        statusPill = "Waspada (>8 mEq Kronik)";
        neuronRadius = 26;
        safetyMsg = "Pada hiponatremia kronik (&gt;48j), alkoholisme, malnutrisi, atau hipokalemia, patok target aman <strong>&le;6–8 mEq/L/24 jam</strong>!";
      } else if (delta < 3 && mode === "acute") {
        tone = "danger";
        statusPill = "Risiko Herniasi Otak!";
        neuronRadius = 39;
        safetyMsg = "Hiponatremia akut berat (kejang/koma) butuh bolus cepat NaCl 3% <strong>+4–6 mEq/L jam I</strong> untuk mengempiskan edema serebri!";
      } else {
        tone = "info";
        statusPill = "Koridor Aman (≤8–10)";
        neuronRadius = 30;
        safetyMsg = `Kenaikan +${delta.toFixed(1)} mEq/L/24 jam berada pada batas aman. Setelah bolus akut +4–6 mEq/L, jaga batas total &le;8–10 mEq/L dalam 24 jam.`;
      }
      formulaTxt = `Kebutuhan Na: 0,5 &times; ${bb} kg &times; ${delta.toFixed(1)} = <strong>${meqNeed.toFixed(0)} mEq</strong> &rarr; <strong>${mlNacl3.toFixed(0)} mL NaCl 3%</strong> (~${rateHr.toFixed(0)} mL/jam).`;
      txPlan = mode === "acute"
        ? "Gejala berat: Bolus NaCl 3% 100–150 mL tiap 20 mnt (maks 3x) naikkan +4–6 mEq/L jam I; stop bila kesadaran membaik."
        : "Kronik (&gt;48j): Evaluasi SIADH (batasi cairan, furosemid/tolvaptan) vs CSW (NaCl 0,9%); pantau Na tiap 4 jam dan cegah overkoreksi dengan Desmopresin/D5% bila diuresis mendadak.";
    }
    return { mode, bb, naStart, delta, tone, statusPill, neuronRadius, formulaTxt, safetyMsg, txPlan };
  }

  function buildNefroHyponatremiaSvg(res) {
    const cursorX = 256 + (res.delta / 16) * 198;
    const isSwollen = res.neuronRadius >= 35;
    const isShrunk = res.neuronRadius <= 23;
    const cellColor = isShrunk ? "var(--accent-coral)" : isSwollen ? "var(--accent-secondary)" : "var(--accent-primary)";
    const cellFill = isShrunk ? "rgba(225,29,72,0.2)" : isSwollen ? "rgba(217,119,6,0.22)" : "rgba(0,122,255,0.18)";

    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Simulator Osmosis Neuron dan Guardrail NaCl 3%">
        <!-- Left Panel: Pontine Neuron & Myelin Osmosis -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Simulator Volume Neuron Pons</text>

        <!-- Brain Skull Boundary -->
        <rect x="34" y="42" width="182" height="120" rx="14" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.3" stroke-dasharray="5 3" />
        <!-- Neuron Cell Body (morphs radius with osmosis!) -->
        <circle cx="125" cy="94" r="${res.neuronRadius}" fill="${cellFill}" stroke="${cellColor}" stroke-width="2.4" />
        <circle cx="125" cy="94" r="${Math.max(8, res.neuronRadius * 0.35)}" fill="${cellColor}" opacity="0.55" />
        <!-- Axon + Myelin Sheath -->
        <line x1="125" y1="${94 + res.neuronRadius}" x2="125" y2="148" stroke="${cellColor}" stroke-width="4" stroke-linecap="round" />
        ${isShrunk ? `
          <!-- Vacuolated Myelin (ODS!) -->
          <circle cx="114" cy="136" r="4" fill="none" stroke="var(--accent-coral)" stroke-width="1.5" />
          <circle cx="136" cy="138" r="4" fill="none" stroke="var(--accent-coral)" stroke-width="1.5" />
          <text x="125" y="156" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">MIELIN PONS RUSAK (ODS!)</text>
        ` : isSwollen ? `
          <text x="125" y="156" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-secondary)">EDEMA SEREBRI / HERNIASI!</text>
        ` : `
          <text x="125" y="156" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">Volume Sel &amp; Mielin Stabil</text>
        `}

        <rect x="28" y="172" width="194" height="42" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="189" text-anchor="middle" font-size="8.2" font-weight="800" fill="${cellColor}">${res.statusPill}</text>
        <text x="125" y="204" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">${res.mode === "hyperna" ? "Target turun ≤10–12 / 24 jam" : "Batas 24j: ≤8 (kronik) | ≤10 maks"}</text>

        <!-- Right Panel: Guardrail 0..16 mEq/L + Dose Box -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Guardrail ΔNa (mEq/L per 24 Jam)</text>

        <rect x="256" y="48" width="99" height="22" rx="3" fill="var(--accent-primary-soft)" />
        <rect x="355" y="48" width="25" height="22" fill="var(--accent-secondary-soft)" />
        <rect x="380" y="48" width="74" height="22" rx="3" fill="rgba(225,29,72,0.4)" />
        <text x="305" y="62" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-primary)">Aman (0–8)</text>
        <text x="367" y="62" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">8–10</text>
        <text x="417" y="62" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-coral)">Bahaya &gt;10</text>

        <!-- Animated Cursor -->
        <line x1="${cursorX}" y1="40" x2="${cursorX}" y2="78" stroke="var(--text-primary)" stroke-width="2.4" />
        <circle cx="${cursorX}" cy="40" r="3.5" fill="var(--accent-coral)" />
        <text x="356" y="94" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-primary)">Target ΔNa: ${res.delta.toFixed(1)} mEq/L / 24j</text>

        <!-- Dose Calculation Box -->
        <rect x="258" y="106" width="196" height="62" rx="8" fill="var(--bg-surface)" stroke="${res.tone === "danger" ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="1.3" />
        ${res.mode === "hyperna" ? `
          <text x="356" y="125" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--text-primary)">Defisit Air = 0,6 × BB × (Na/140 - 1)</text>
          <text x="356" y="143" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-primary)">${(0.6 * res.bb * Math.max(0, (res.naStart - 140) / 140)).toFixed(2)} Liter (D5%)</text>
          <text x="356" y="159" text-anchor="middle" font-size="7.4" font-weight="700" fill="var(--text-muted)">BB ${res.bb} kg | Na Awal ${res.naStart} mEq/L</text>
        ` : `
          <text x="356" y="124" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">Kebutuhan Na = 0,5 × ${res.bb} × ${res.delta.toFixed(1)}</text>
          <text x="356" y="143" text-anchor="middle" font-size="10.8" font-weight="800" fill="var(--accent-primary)">${(0.5 * res.bb * res.delta).toFixed(0)} mEq = ${(((0.5 * res.bb * res.delta) / 513) * 1000).toFixed(0)} mL NaCl 3%</text>
          <text x="356" y="159" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">Laju 24j: ~${((((0.5 * res.bb * res.delta) / 513) * 1000) / 24).toFixed(0)} mL/jam (NaCl 3% = 513 mEq/L)</text>
        `}

        <rect x="258" y="176" width="196" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="356" y="192" text-anchor="middle" font-size="7.4" font-weight="700" fill="var(--text-secondary)">Akut Berat: +4–6 mEq/L jam I (stop kejang)</text>
        <text x="356" y="205" text-anchor="middle" font-size="7.4" font-weight="700" fill="var(--accent-coral)">SIADH: Euvolemik + Uosm &gt;100 + UNa &gt;30</text>
      </svg>
    `;
  }

  function renderNefroHyponatremiaWidget() {
    const mode = NEFRO_NA_MODES[nefroVizState.naMode] ? nefroVizState.naMode : "chronic";
    const bb = clampNum(nefroVizState.naBb, 30, 150, 60);
    const naStart = clampNum(nefroVizState.naStart, 95, 185, 114);
    const delta = clampNum(nefroVizState.naTargetDelta, 0, 16, 8.0);
    const res = evaluateNefroNa(mode, bb, naStart, delta);

    const controlsTop = `
      <div class="space-y-2.5 mb-2.5">
        ${renderCardioTabRow("viz-nefro-na-tabs", Object.entries(NEFRO_NA_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroHyponatremiaViz('${k}', null, true)`
        })), mode)}
        <div class="grid grid-cols-2 gap-2">
          <div style="min-width:0;">
            <label for="na-bb" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">Berat Badan (kg)</label>
            <input type="number" id="na-bb" value="${bb}" min="30" max="150" oninput="window.InternaApp.updateNefroHyponatremiaViz()" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
          </div>
          <div style="min-width:0;">
            <label for="na-init" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1">Na Serum Awal (mEq/L)</label>
            <input type="number" id="na-init" value="${naStart}" min="95" max="185" oninput="window.InternaApp.updateNefroHyponatremiaViz()" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
          </div>
        </div>
      </div>
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "nefroNa",
      label: "Simulasi Target Kenaikan/Penurunan ΔNa 24 Jam (mEq/L):",
      pillText: `${res.delta.toFixed(1)} mEq/L/24j`,
      min: 0, max: 16, step: 0.25, value: delta,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3) 0% 50%, rgba(217,119,6,0.36) 50% 62.5%, rgba(225,29,72,0.44) 62.5% 100%)",
      oninput: "window.InternaApp.updateNefroHyponatremiaViz(null, this.value, true)",
      presets: [
        { label: "+5 Jam I (Akut)", val: 5, active: Math.abs(delta - 5) < 0.8 },
        { label: "8 (Aman Kronik)", val: 8, active: Math.abs(delta - 8) < 0.8 },
        { label: "10 (Maks 24j)", val: 10, active: Math.abs(delta - 10) < 0.8 },
        { label: "14 (Risiko ODS!)", val: 14, active: delta > 11.5 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroNa",
      title: "Simulator Osmosis Neuron, Kalkulator NaCl 3% & Pencegahan ODS",
      tag: "Disnatremia • KKI 4",
      controlsTop,
      svgHtml: buildNefroHyponatremiaSvg(res),
      controlsBottom,
      info: {
        tone: res.tone,
        rKey: `na-${mode}-${res.delta.toFixed(1)}-${res.bb}-${res.naStart}`,
        title: `${NEFRO_NA_MODES[mode].label} — ${res.statusPill}`,
        c1Label: "Kalkulasi Terapi & Guardrail Osmotik",
        c1Body: `${res.formulaTxt}<br>${res.safetyMsg}`,
        c2Label: "Protokol Klinis",
        c2Body: res.txPlan
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jika koreksi melampaui batas &gt;8–10 mEq/L/24j (sering terjadi saat SIADH mendadak mengalami <em>water diuresis</em>), hentikan NaCl 3% &amp; berikan <strong>Desmopresin + D5%</strong> untuk menurunkan Na kembali!</p>`
    });
  }

  function updateNefroHyponatremiaViz(modeIn, deltaIn, fromUser = true) {
    if (fromUser && deltaIn !== null && deltaIn !== undefined) cancelAllVizAnimations();
    if (NEFRO_NA_MODES[modeIn]) {
      nefroVizState.naMode = modeIn;
      const initEl = document.getElementById("na-init");
      if (initEl) initEl.value = modeIn === "hyperna" ? 160 : 114;
    }
    const bbEl = document.getElementById("na-bb");
    const initEl = document.getElementById("na-init");
    nefroVizState.naBb = clampNum(bbEl ? bbEl.value : nefroVizState.naBb, 30, 150, 60);
    nefroVizState.naStart = clampNum(initEl ? initEl.value : nefroVizState.naStart, 95, 185, 114);
    if (deltaIn !== null && deltaIn !== undefined) nefroVizState.naTargetDelta = clampNum(deltaIn, 0, 16, 8.0);

    const res = evaluateNefroNa(nefroVizState.naMode, nefroVizState.naBb, nefroVizState.naStart, nefroVizState.naTargetDelta);
    syncVizPresets("viz-nefro-na-tabs", Object.keys(NEFRO_NA_MODES).map((k) => k === res.mode));
    syncSliderAndPill("viz-nefroNa-slider", "viz-nefroNa-pill", res.delta, `${res.delta.toFixed(1)} mEq/L/24j`);
    syncVizPresets("viz-nefroNa-presets", [Math.abs(res.delta - 5) < 0.8, Math.abs(res.delta - 8) < 0.8, Math.abs(res.delta - 10) < 0.8, res.delta > 11.5]);
    swapVizSvgFrame("viz-nefroNa-frame", buildNefroHyponatremiaSvg(res));
    updateVizReadout("viz-nefroNa-readout", res.tone, formatVizReadoutHtml(`${NEFRO_NA_MODES[res.mode].label} — ${res.statusPill}`, "Kalkulasi Terapi & Guardrail Osmotik", `${res.formulaTxt}<br>${res.safetyMsg}`, "Protokol Klinis", res.txPlan, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Hentikan NaCl 3% &amp; pakai <strong>Desmopresin + D5%</strong> bila laju koreksi melampaui 8–10 mEq/L/24j!</p>`), `na-${res.mode}-${res.delta.toFixed(1)}-${res.bb}-${res.naStart}`);
  }

  // --- N11. Atlas Dinding Kapiler Sindrom Nefritik & Kurva C3 (nefro-4-2) ---
  const NEFRO_NEPHRITIC_DATA = {
    gnaps: {
      label: "GNAPS (Subepithelial Humps)", tone: "warning",
      morph: "Proliferasi endokapiler difus + infiltrasi PMN intrakapiler; EM khas menunjukkan gundukan kompleks imun besar di bawah podosit (<strong>Subepithelial Humps</strong>).",
      course: "Muncul <strong>1–3 minggu pasca-faringitis/impetigo</strong>; ASTO tinggi, <strong>C3 turun sementara &amp; pulih normal dalam 6–8 minggu</strong> (suportif: diuretik + kontrol TD)."
    },
    gnmp: {
      label: "GNMP (Tram-Track PAS)", tone: "danger",
      morph: "Interposisi sel &amp; matriks mesangial menyusup membelah MBG menjadi dua garis sejajar (<strong>Double-Contour / Tram-Track appearance</strong> pada pewarnaan PAS/Perak).",
      course: "<strong>Hipokomplemenemia C3 PERSISTEN (&gt;8–12 minggu)</strong>! Wajib singkirkan Hepatitis C, krioglobulinemia, SLE, atau disfungsi jalur alternatif komplemen — indikasi Biopsi."
    },
    iga_diff: {
      label: "Nefropati IgA (Sinfaringitik)", tone: "info",
      morph: "Proliferasi mesangial tanpa humps subepitelial maupun double-contour; IF menunjukkan deposit <strong>IgA dominan mesangial</strong>.",
      course: "Hematuria muncul sangat cepat <strong>1–3 hari bersamaan (sinfaringitik) dengan ISPA</strong> dan kadar komplemen <strong>C3/C4 selalu NORMAL</strong>!"
    }
  };

  function buildNefroNephriticSvg(modeKey, weekVal) {
    const w = clampNum(weekVal, 0, 12, 4);
    const curX = 258 + (w / 12) * 192;

    // Curve coordinates inside Right Panel x: 258..450, y: 58..178
    // Normal C3 baseline around y=74; Low C3 around y=148
    const ptsIga = "258,74 300,75 354,74 402,75 450,74";
    const ptsGnaps = "258,78 274,142 306,148 338,132 370,96 386,78 418,75 450,75";
    const ptsGnmp = "258,82 276,146 318,156 364,158 408,158 450,157";

    let leftAnatomy = "";
    if (modeKey === "gnaps") {
      leftAnatomy = `
        <!-- Podosit -->
        <path d="M 32 62 C 62 50, 96 68, 124 62 C 154 54, 188 68, 218 58 L 218 46 L 32 46 Z" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1.4" />
        <!-- Subepithelial Humps (characteristic domes pushing up under podocyte) -->
        <path d="M 52 94 Q 70 64 88 94 Z" fill="var(--accent-coral)" opacity="0.88" />
        <path d="M 110 94 Q 128 60 146 94 Z" fill="var(--accent-coral)" opacity="0.88" />
        <path d="M 166 94 Q 184 66 202 94 Z" fill="var(--accent-coral)" opacity="0.88" />
        <!-- Intact single GBM -->
        <line x1="30" y1="96" x2="220" y2="96" stroke="var(--text-primary)" stroke-width="3.6" />
        <!-- PMN Neutrophil inside Capillary Lumen -->
        <circle cx="96" cy="126" r="11" fill="rgba(56,189,248,0.2)" stroke="var(--viz-blue)" stroke-width="1.5" />
        <circle cx="93" cy="125" r="2.3" fill="var(--viz-blue)" />
        <circle cx="99" cy="125" r="2.3" fill="var(--viz-blue)" />
        <circle cx="96" cy="130" r="2.3" fill="var(--viz-blue)" />
        <circle cx="154" cy="128" r="11" fill="rgba(56,189,248,0.2)" stroke="var(--viz-blue)" stroke-width="1.5" />
        <circle cx="151" cy="127" r="2.3" fill="var(--viz-blue)" />
        <circle cx="157" cy="129" r="2.3" fill="var(--viz-blue)" />
        <text x="125" y="160" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--accent-coral)">Subepithelial Humps (EM) + PMN</text>
      `;
    } else if (modeKey === "gnmp") {
      leftAnatomy = `
        <!-- Podocyte roof -->
        <rect x="32" y="48" width="186" height="16" rx="4" fill="rgba(100,116,139,0.2)" stroke="var(--border-strong)" />
        <!-- Split GBM Double Contour / Tram-Track! -->
        <line x1="30" y1="84" x2="220" y2="84" stroke="var(--accent-coral)" stroke-width="3" />
        <rect x="30" y="88" width="190" height="16" fill="var(--accent-secondary-soft)" />
        <line x1="30" y1="106" x2="220" y2="106" stroke="var(--accent-coral)" stroke-width="3" />
        <text x="125" y="100" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">Interposisi Mesangial (Subendotel)</text>
        <text x="125" y="152" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--accent-coral)">Double-Contour / Tram-Track (PAS)</text>
      `;
    } else {
      leftAnatomy = `
        <line x1="30" y1="90" x2="220" y2="90" stroke="var(--text-primary)" stroke-width="3.2" />
        <ellipse cx="125" cy="134" rx="54" ry="24" fill="var(--accent-primary-soft)" stroke="var(--viz-blue)" stroke-width="1.8" />
        <circle cx="104" cy="134" r="5" fill="var(--viz-blue)" />
        <circle cx="125" cy="130" r="6" fill="var(--viz-blue)" />
        <circle cx="146" cy="136" r="5" fill="var(--viz-blue)" />
        <text x="125" y="168" text-anchor="middle" font-size="8.1" font-weight="800" fill="var(--viz-blue)">Deposit IgA Dominan di Mesangium</text>
      `;
    }

    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Atlas Dinding Kapiler Nefritik dan Kurva C3">
        <!-- Left Panel: Capillary Wall Histology -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Dinding Kapiler Glomerulus</text>
        <rect x="26" y="40" width="198" height="136" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        ${leftAnatomy}
        <rect x="26" y="182" width="198" height="34" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="196" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">${modeKey === "gnaps" ? "Onset 1–3 mgg pasca-ISPA/impetigo" : modeKey === "gnmp" ? "Terkait HCV / Krioglobulinemia" : "Onset 1–3 hari pasca-ISPA"}</text>
        <text x="125" y="209" text-anchor="middle" font-size="7.4" font-weight="700" fill="var(--text-muted)">${modeKey === "gnaps" ? "ASTO tinggi + hematuria" : modeKey === "gnmp" ? "Indikasi Biopsi bila C3 tetap rendah" : "C3 & C4 tetap normal"}</text>

        <!-- Right Panel: Serum C3 Time-Course (Weeks 0..12) -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Dinamika Komplemen C3 (Mgg 0–12)</text>

        <!-- Normal C3 Zone -->
        <rect x="256" y="56" width="198" height="36" rx="4" fill="rgba(16,185,129,0.12)" />
        <text x="262" y="69" font-size="7.2" font-weight="800" fill="var(--accent-primary)">C3 Normal</text>
        <!-- Hypocomplementemia Zone -->
        <rect x="256" y="126" width="198" height="46" rx="4" fill="rgba(225,29,72,0.08)" />
        <text x="262" y="167" font-size="7.2" font-weight="800" fill="var(--accent-coral)">Hipokomplemenemia C3</text>

        <!-- Week 6-8 recovery highlight band -->
        <rect x="${258 + (6 / 12) * 192}" y="44" width="${(2 / 12) * 192}" height="132" fill="rgba(245,158,11,0.12)" />
        <text x="${258 + (7 / 12) * 192}" y="53" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">Mgg 6–8</text>

        <!-- 3 Curves -->
        <polyline points="${ptsIga}" fill="none" stroke="var(--viz-blue)" stroke-width="${modeKey === "iga_diff" ? "3" : "1.5"}" opacity="${modeKey === "iga_diff" ? "1" : "0.5"}" />
        <polyline points="${ptsGnaps}" fill="none" stroke="var(--accent-secondary)" stroke-width="${modeKey === "gnaps" ? "3.2" : "1.6"}" opacity="${modeKey === "gnaps" ? "1" : "0.55"}" />
        <polyline points="${ptsGnmp}" fill="none" stroke="var(--accent-coral)" stroke-width="${modeKey === "gnmp" ? "3.2" : "1.6"}" opacity="${modeKey === "gnmp" ? "1" : "0.55"}" />

        <!-- Animated Week Cursor -->
        <line x1="${curX}" y1="42" x2="${curX}" y2="178" stroke="var(--text-primary)" stroke-width="2" stroke-dasharray="3 2" />
        <circle cx="${curX}" cy="42" r="3.5" fill="var(--accent-primary)" />

        <!-- Curve Legend Footer -->
        <text x="258" y="192" font-size="7.4" font-weight="800" fill="var(--viz-blue)">● IgA: Selalu Normal</text>
        <text x="360" y="192" font-size="7.4" font-weight="800" fill="var(--accent-secondary)">● GNAPS: Pulih Mgg 6–8</text>
        <text x="356" y="207" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-coral)">● GNMP: Rendah Persisten &gt;8 Mgg &rarr; BIOPSI!</text>
      </svg>
    `;
  }

  function renderNefroNephriticHistoWidget() {
    const mode = NEFRO_NEPHRITIC_DATA[nefroVizState.nephriticMode] ? nefroVizState.nephriticMode : "gnaps";
    const week = clampNum(nefroVizState.nephriticWeek, 0, 12, 4);
    const d = NEFRO_NEPHRITIC_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-nephritic-tabs", Object.entries(NEFRO_NEPHRITIC_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroNephriticHistoViz('${k}', null, true)`
        })), mode)}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroNephritic",
      label: "Timeline Perjalanan Penyakit & Pemulihan C3 (Minggu 0–12):",
      pillText: `Minggu ke-${Math.round(week)}`,
      min: 0, max: 12, step: 0.2, value: week,
      trackBg: "linear-gradient(90deg, rgba(217,119,6,0.34) 0% 50%, rgba(16,185,129,0.34) 50% 66%, rgba(225,29,72,0.4) 66% 100%)",
      oninput: "window.InternaApp.updateNefroNephriticHistoViz(null, this.value, true)",
      presets: [
        { label: "Mgg 2 (Akut)", val: 2, active: week <= 3 },
        { label: "Mgg 6–8 (Pulih?)", val: 7, active: week > 3 && week <= 8.5 },
        { label: "Mgg 12 (Biopsi GNMP)", val: 12, active: week > 8.5 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroNephritic",
      title: "Atlas Dinding Kapiler Sindrom Nefritik (Humps vs Tram-Track) & Kurva C3",
      tag: "Nefritik • KKI 4",
      controlsTop,
      svgHtml: buildNefroNephriticSvg(mode, week),
      controlsBottom,
      info: {
        tone: d.tone,
        rKey: `nephr-${mode}-${Math.round(week)}`,
        title: `${d.label} (Minggu ke-${Math.round(week)})`,
        c1Label: "Anatomi Mikroskopis Glomerulus",
        c1Body: d.morph,
        c2Label: "Kinetika Komplemen C3 & Klinis",
        c2Body: d.course
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jika pasien klinis GNAPS tidak memulihkan <strong>C3 dalam 6–8 minggu</strong> (atau langsung muncul dengan RPGN/hematuria menetap), WAJIB curiga <strong>GNMP / Lupus / ANCA</strong> &rarr; lakukan Biopsi Ginjal!</p>`
    });
  }

  function updateNefroNephriticHistoViz(modeIn, weekIn, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (NEFRO_NEPHRITIC_DATA[modeIn]) nefroVizState.nephriticMode = modeIn;
    if (weekIn !== null && weekIn !== undefined) nefroVizState.nephriticWeek = clampNum(weekIn, 0, 12, 4);
    const mode = nefroVizState.nephriticMode;
    const week = nefroVizState.nephriticWeek;
    const d = NEFRO_NEPHRITIC_DATA[mode];
    syncVizPresets("viz-nefro-nephritic-tabs", Object.keys(NEFRO_NEPHRITIC_DATA).map((k) => k === mode));
    syncSliderAndPill("viz-nefroNephritic-slider", "viz-nefroNephritic-pill", week, `Minggu ke-${Math.round(week)}`);
    syncVizPresets("viz-nefroNephritic-presets", [week <= 3, week > 3 && week <= 8.5, week > 8.5]);
    swapVizSvgFrame("viz-nefroNephritic-frame", buildNefroNephriticSvg(mode, week));
    updateVizReadout("viz-nefroNephritic-readout", d.tone, formatVizReadoutHtml(`${d.label} (Minggu ke-${Math.round(week)})`, "Anatomi Mikroskopis Glomerulus", d.morph, "Kinetika Komplemen C3 & Klinis", d.course, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Bila C3 gagal normal pada <strong>Minggu 6–8</strong>, curigai GNMP &rarr; biopsi!</p>`), `nephr-${mode}-${Math.round(week)}`);
  }

  // --- N12. Kurva Penurunan MAP Krisis Hipertensi & Keamanan Obat IV HMOD (nefro-7-3) ---
  const NEFRO_HTC_HMODS = {
    general: {
      label: "1. Emergensi Umum (Ensefalopati/AKI)",
      targetTxt: "Turunkan MAP 20–25% dalam 1 jam (lalu ~160/100 dlm 2–6j)",
      curvePts: "26,56 76,68 128,88 184,96 274,100"
    },
    aorta: {
      label: "2. Diseksi Aorta Akut",
      targetTxt: "CEPAT (5–20 mnt): TDS ≤120 mmHg &amp; Nadi &lt;60/mnt!",
      curvePts: "26,56 48,118 82,138 148,140 274,140"
    },
    pulmo: {
      label: "3. Edema Paru Akut / SKA",
      targetTxt: "Turunkan preload+afterload cepat (NTG IV + Furosemid IV)",
      curvePts: "26,56 64,92 122,114 190,118 274,120"
    },
    stroke_isch: {
      label: "4. Stroke Iskemik Akut",
      targetTxt: "KONSERVATIF: Tahan TD &lt;220/120 (&lt;185/110 prartPA); maks -15%/24j",
      curvePts: "26,56 96,58 176,62 274,66"
    },
    urgency: {
      label: "5. Hipertensi Urgensi (Tanpa HMOD)",
      targetTxt: "TANPA HMOD: Turun bertahap 24–48 jam dgn obat ORAL di rawat jalan",
      curvePts: "26,56 120,58 200,60 274,64"
    }
  };

  const NEFRO_HTC_DRUGS = {
    nicardipine: { label: "Nicardipine IV" },
    esmolol: { label: "Esmolol / Labetalol IV" },
    ntg: { label: "Nitrogliserin IV" },
    nifedipin_sl: { label: "Nifedipin Sublingual" }
  };

  function evaluateNefroHtCrisis(hmodKey, drugKey, minVal) {
    const hmod = NEFRO_HTC_HMODS[hmodKey] || NEFRO_HTC_HMODS.general;
    const drug = NEFRO_HTC_DRUGS[drugKey] || NEFRO_HTC_DRUGS.nicardipine;
    const mins = clampNum(minVal, 0, 120, 30);

    let verdict = "TEPAT & AMAN";
    let tone = "info";
    let reason = `<strong>${drug.label}</strong> sesuai protokol untuk <strong>${hmod.label}</strong> (titrasi IV terkendali dengan pemantauan arterial/ICU).`;

    if (drugKey === "nifedipin_sl") {
      verdict = "BAHAYA / KONTRAINDIKASI!";
      tone = "danger";
      reason = "<strong>Nifedipin Sublingual DILARANG</strong> baik pada Emergensi maupun Urgensi! Memicu drop MAP tak terprediksi &rarr; <strong>iskemia koroner, stroke watershed, &amp; AKI</strong>!";
    } else if (hmodKey === "aorta" && (drugKey === "nicardipine" || drugKey === "ntg")) {
      verdict = "URUTAN SALAH (BAHAYA)!";
      tone = "danger";
      reason = `Pada Diseksi Aorta Akut, vasodilator tunggal (<strong>${drug.label}</strong>) memicu <strong>refleks takikardia &amp; kenaikan dP/dt shear stress</strong>! Wajib beri <strong>Beta-Bloker IV (Esmolol/Labetalol) DULU</strong>.`;
    } else if (hmodKey === "pulmo" && drugKey === "esmolol") {
      verdict = "HATI-HATI / HINDARI!";
      tone = "danger";
      reason = "Pada Edema Paru Akut dekompensata, penyekat beta IV menekan kontraktilitas &amp; memperburuk gagal napas — pilih <strong>Nitrogliserin IV</strong> / Nicardipine + Furosemid!";
    } else if (hmodKey === "urgency") {
      verdict = "TIDAK PERLU IV DRIP";
      tone = "warning";
      reason = "Hipertensi Urgensi <strong>tidak memiliki HMOD akut</strong>: jangan beri infus IV ICU (berisiko hipoperfusi)! Berikan obat <strong>ORAL</strong> bertahap dalam 24–48 jam.";
    } else if (hmodKey === "stroke_isch" && drugKey === "ntg") {
      verdict = "KURANG OPTIMAL (Pilih Labetalol/Nicardipine)";
      tone = "warning";
      reason = "Nitrogliserin IV berisiko meningkatkan tekanan intrakranial akibat vasodilatasi serebral — pilih <strong>Nicardipine / Labetalol IV</strong> dan hanya bila TD melewati ambang (≥220/120 atau ≥185/110 pra-rtPA).";
    }

    return { hmodKey, drugKey, hmod, drug, mins, verdict, tone, reason };
  }

  function buildNefroHtCrisisSvg(ev) {
    const curX = 26 + (ev.mins / 120) * 248;
    const isDanger = ev.tone === "danger";
    return `
      <svg viewBox="0 0 480 238" class="viz-svg" role="img" aria-label="Kurva Penurunan MAP Krisis Hipertensi">
        <!-- Left Chart: MAP Trajectory 0..120 Min -->
        <rect x="14" y="12" width="278" height="214" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="153" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Kurva Target MAP (0–120 Menit Pertama)</text>

        <!-- Safe Envelope vs Hypoperfusion Danger Zone -->
        <rect x="26" y="46" width="248" height="122" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <!-- Danger Steep Drop >35% zone -->
        <rect x="26" y="132" width="248" height="36" rx="4" fill="var(--accent-coral-soft)" />
        <text x="150" y="158" text-anchor="middle" font-size="7.3" font-weight="800" fill="var(--accent-coral)">Zona Bahaya Hipoperfusi (&gt;25–50% MAP Drop Kecuali Aorta)</text>
        <!-- Safe Target Zone -20..25% -->
        <rect x="26" y="84" width="248" height="26" fill="var(--accent-primary-soft)" />
        <text x="270" y="99" text-anchor="end" font-size="7" font-weight="800" fill="var(--accent-primary)">Target -20..25%</text>

        <!-- Trajectory Curve -->
        <polyline points="${ev.hmod.curvePts}" fill="none" stroke="${isDanger ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        ${ev.drugKey === "nifedipin_sl" ? `<polyline points="26,56 46,120 72,160 150,164" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" stroke-dasharray="4 2" />` : ""}

        <!-- Animated Time Cursor -->
        <line x1="${curX}" y1="46" x2="${curX}" y2="168" stroke="var(--text-primary)" stroke-width="2" stroke-dasharray="3 2" />
        <circle cx="${curX}" cy="46" r="3.5" fill="var(--accent-coral)" />

        <text x="28" y="182" font-size="7.3" font-weight="700" fill="var(--text-muted)">t = 0 mnt</text>
        <text x="150" y="182" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">Saat ini: ${Math.round(ev.mins)} Menit</text>
        <text x="272" y="182" text-anchor="end" font-size="7.3" font-weight="700" fill="var(--text-muted)">120 mnt</text>

        <rect x="26" y="190" width="252" height="28" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="152" y="207" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--text-primary)">${ev.hmod.label}</text>

        <!-- Right Panel: Drug + HMOD Safety Evaluator -->
        <rect x="302" y="12" width="164" height="214" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="384" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Audit Obat &amp; HMOD</text>

        <rect x="312" y="40" width="144" height="44" rx="12" fill="var(--bg-surface)" stroke="${isDanger ? "var(--accent-coral)" : ev.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)"}" stroke-width="2" />
        <text x="384" y="59" text-anchor="middle" font-size="8.8" font-weight="800" fill="${isDanger ? "var(--accent-coral)" : ev.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)"}">${ev.verdict}</text>
        <text x="384" y="75" text-anchor="middle" font-size="7.6" font-weight="700" fill="var(--text-muted)">${ev.drug.label}</text>

        <rect x="312" y="94" width="144" height="120" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="384" y="111" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-primary)">Kaidah Emas Board:</text>
        <text x="320" y="128" font-size="7.1" font-weight="700" fill="var(--accent-primary)">• Umum: MAP -20..25% (1j)</text>
        <text x="320" y="144" font-size="7.1" font-weight="700" fill="var(--accent-coral)">• Aorta: Esmolol DULU!</text>
        <text x="320" y="160" font-size="7.1" font-weight="700" fill="var(--viz-blue)">• Edema Paru: NTG IV</text>
        <text x="320" y="176" font-size="7.1" font-weight="700" fill="var(--accent-secondary)">• Stroke: Tahan &lt;220/120</text>
        <text x="320" y="192" font-size="7.1" font-weight="700" fill="var(--accent-coral)">• Nifedipin SL: TERLARANG</text>
        <text x="320" y="206" font-size="6.9" font-weight="700" fill="var(--text-muted)">• Nitroprusida: Cek Tiosianat</text>
      </svg>
    `;
  }

  function renderNefroHtCrisisWidget() {
    const hmodKey = NEFRO_HTC_HMODS[nefroVizState.htcHmod] ? nefroVizState.htcHmod : "general";
    const drugKey = NEFRO_HTC_DRUGS[nefroVizState.htcDrug] ? nefroVizState.htcDrug : "nicardipine";
    const mins = clampNum(nefroVizState.htcMin, 0, 120, 30);
    const ev = evaluateNefroHtCrisis(hmodKey, drugKey, mins);

    const controlsTop = `
      <div class="space-y-2 mb-2.5">
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">1. Pilih Skenario HMOD / Kondisi Pasien:</div>
        ${renderCardioTabRow("viz-nefro-htc-hmod", Object.entries(NEFRO_HTC_HMODS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroHtCrisisViz('${k}', null, null, true)`
        })), hmodKey)}
        <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">2. Uji Pemilihan Obat Antihipertensi:</div>
        ${renderCardioTabRow("viz-nefro-htc-drug", Object.entries(NEFRO_HTC_DRUGS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroHtCrisisViz(null, '${k}', null, true)`
        })), drugKey)}
      </div>
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "nefroHtCrisis",
      label: "Timeline Titrasi & Monitoring (Menit ke-0 s.d. 120):",
      pillText: `${Math.round(mins)} Menit`,
      min: 0, max: 120, step: 2, value: mins,
      trackBg: "linear-gradient(90deg, rgba(225,29,72,0.38) 0% 18%, rgba(0,122,255,0.34) 18% 55%, rgba(0,122,255,0.28) 55% 100%)",
      oninput: "window.InternaApp.updateNefroHtCrisisViz(null, null, this.value, true)",
      presets: [
        { label: "10 Mnt (Aorta)", val: 10, active: mins <= 20 },
        { label: "60 Mnt (MAP -25%)", val: 60, active: mins > 20 && mins <= 80 },
        { label: "120 Mnt (Stabil)", val: 120, active: mins > 80 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroHtCrisis",
      title: "Kurva Penurunan MAP Krisis Hipertensi & Keamanan Obat IV HMOD",
      tag: "Hipertensi Darurat • KKI 4",
      controlsTop,
      svgHtml: buildNefroHtCrisisSvg(ev),
      controlsBottom,
      info: {
        tone: ev.tone,
        rKey: `htc-${hmodKey}-${drugKey}`,
        title: `${ev.hmod.label} × ${ev.drug.label} → ${ev.verdict}`,
        c1Label: "Target Tekanan Darah Organ Spesifik",
        c1Body: ev.hmod.targetTxt,
        c2Label: "Evaluasi Keamanan Pilihan Obat",
        c2Body: ev.reason
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Nitroprusida pada PGK berat (&gt;48–72j) berisiko <strong>toksisitas sianida/tiosianat</strong>; pada eklampsia pilih <strong>Labetalol/Nikardipin/Hidralazin + MgSO<sub>4</sub></strong>!</p>`
    });
  }

  function updateNefroHtCrisisViz(hmodIn, drugIn, minIn, fromUser = true) {
    if (fromUser && minIn !== null && minIn !== undefined) cancelAllVizAnimations();
    if (NEFRO_HTC_HMODS[hmodIn]) nefroVizState.htcHmod = hmodIn;
    if (NEFRO_HTC_DRUGS[drugIn]) nefroVizState.htcDrug = drugIn;
    if (minIn !== null && minIn !== undefined) nefroVizState.htcMin = clampNum(minIn, 0, 120, 30);

    const ev = evaluateNefroHtCrisis(nefroVizState.htcHmod, nefroVizState.htcDrug, nefroVizState.htcMin);
    syncVizPresets("viz-nefro-htc-hmod", Object.keys(NEFRO_HTC_HMODS).map((k) => k === ev.hmodKey));
    syncVizPresets("viz-nefro-htc-drug", Object.keys(NEFRO_HTC_DRUGS).map((k) => k === ev.drugKey));
    syncSliderAndPill("viz-nefroHtCrisis-slider", "viz-nefroHtCrisis-pill", ev.mins, `${Math.round(ev.mins)} Menit`);
    syncVizPresets("viz-nefroHtCrisis-presets", [ev.mins <= 20, ev.mins > 20 && ev.mins <= 80, ev.mins > 80]);
    swapVizSvgFrame("viz-nefroHtCrisis-frame", buildNefroHtCrisisSvg(ev));
    updateVizReadout("viz-nefroHtCrisis-readout", ev.tone, formatVizReadoutHtml(`${ev.hmod.label} × ${ev.drug.label} → ${ev.verdict}`, "Target Tekanan Darah Organ Spesifik", ev.hmod.targetTxt, "Evaluasi Keamanan Pilihan Obat", ev.reason, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Nifedipin sublingual &amp; vasodilator mendahului beta-bloker pada diseksi aorta adalah jebakan fatal!</p>`), `htc-${ev.hmodKey}-${ev.drugKey}-${Math.round(ev.mins)}`);
  }

  // =========================================================================
  // PRIORITAS 3 — WIDGET NEFROLOGI GELOMBANG 3 (7 MODUL HEREDITER, CKD-MBD, RTA, AIN, TPG, BATU, SKR/SHR)
  // =========================================================================

  // --- N13. Atlas Tubulopati Herediter, Kolagen IV Alport/TBMN & ADPKD (nefro-8-2) ---
  const NEFRO_HERED_DATA = {
    bartter: {
      label: "Bartter (NKCC2)", site: "TAL Henle", tone: "warning",
      mech: "Defek kanal <strong>NKCC2</strong> di lengkung Henle asenden tebal &rarr; meniru keracunan kronik <strong>Furosemid</strong>!",
      diff: "Alkalosis metabolik + hipokalemia + <strong>Hiperkalsiuria &amp; nefrokalsinosis</strong> (TD normal/rendah, renin &amp; aldosteron tinggi)."
    },
    gitelman: {
      label: "Gitelman (NCC)", site: "DCT Distal", tone: "info",
      mech: "Defek kotransporter <strong>NCC</strong> di tubulus kontortus distal &rarr; meniru efek kronik <strong>Diuretik Tiazid</strong>!",
      diff: "Alkalosis metabolik + hipokalemia + <strong>HIPOKALSIURIA berat &amp; Hipomagnesemia</strong> (pembeda kunci vs Bartter!)."
    },
    liddle: {
      label: "Liddle (ENaC)", site: "Duktus Kolektivus", tone: "danger",
      mech: "Mutasi <em>gain-of-function</em> kanal natrium epitel (<strong>ENaC</strong>) di duktus kolektivus &rarr; reabsorpsi Na+ aktif terus-menerus!",
      diff: "<strong>Hipertensi berat sejak muda + Hipokalemia + Alkalosis</strong>, tetapi kadar <strong>Renin &amp; Aldosteron RENDAH</strong>! Terapi: <strong>Amiloride / Triamteren</strong> (bukan spironolakton!)."
    },
    alport: {
      label: "Alport (EM Kolagen IV)", site: "MBG & Koklea", tone: "danger",
      mech: "Mutasi rantai alfa kolagen tipe IV (<em>COL4A5</em> terkait-X paling sering) &rarr; mikroskop elektron: <strong>Lamellated / Basket-Weave splitting</strong> membran basalis!",
      diff: "Trias klasik: <strong>Hematuria glomerular + Tuli sensorineural nada tinggi + Lentikonus anterior mata</strong> (hindari diagnosis keliru sebagai Nefropati IgA!)."
    },
    adpkd: {
      label: "ADPKD & TBMN", site: "Parenkim / MBG", tone: "warning",
      mech: "<strong>ADPKD (PKD1 85% berat / PKD2 15%)</strong>: ribuan kista kortikomedular bilateral progresif; berbanding <strong>TBMN</strong> (penipisan difus MBG &lt;200 nm yang jinak).",
      diff: "Wajib skrining <strong>MRA Aneurisma Berry intrakranial</strong> bila riwayat keluarga (+) perdarahan subaraknoid + kista hepar + kriteria USG <strong>Ravine-Pei</strong>."
    }
  };

  function buildNefroHereditarySvg(mode) {
    const d = NEFRO_HERED_DATA[mode] || NEFRO_HERED_DATA.bartter;
    const isEmView = mode === "alport" || mode === "adpkd";
    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Atlas Kanal Tubulopati dan Kolagen IV EM">
        <!-- Left Panel: Nephron Channel Map vs EM Collagen IV -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">${isEmView ? "Mikroskop Elektron MBG / Kista" : "Peta Situs Kanal Ion Nefron"}</text>

        ${mode === "alport" ? `
          <!-- Basket-weave / Lamellated Splitting GBM -->
          <rect x="28" y="42" width="194" height="122" rx="8" fill="var(--bg-surface)" stroke="var(--border-strong)" />
          <path d="M 36 86 Q 80 78 124 86 Q 168 94 212 86" fill="none" stroke="var(--accent-coral)" stroke-width="2.4" />
          <path d="M 36 96 Q 80 106 124 94 Q 168 84 212 96" fill="none" stroke="var(--accent-coral)" stroke-width="2.4" stroke-dasharray="5 2" />
          <path d="M 36 108 Q 80 96 124 110 Q 168 120 212 106" fill="none" stroke="var(--accent-secondary)" stroke-width="2.2" />
          <text x="125" y="64" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">Basket-Weave Splitting (EM)</text>
          <text x="125" y="136" text-anchor="middle" font-size="7.6" font-weight="700" fill="var(--text-primary)">Tuli Sensorineural + Lentikonus</text>
          <text x="125" y="152" text-anchor="middle" font-size="7.3" font-weight="700" fill="var(--text-muted)">Kolagen Tipe IV (COL4A3/4/5)</text>
        ` : mode === "adpkd" ? `
          <!-- Bilateral Renal Cysts vs Thin GBM -->
          <rect x="28" y="42" width="194" height="122" rx="8" fill="var(--bg-surface)" stroke="var(--border-strong)" />
          <ellipse cx="92" cy="100" rx="44" ry="48" fill="var(--accent-primary-soft)" stroke="var(--viz-blue)" stroke-width="2" />
          <circle cx="80" cy="82" r="14" fill="rgba(56,189,248,0.34)" stroke="var(--viz-blue)" stroke-width="1.4" />
          <circle cx="104" cy="112" r="16" fill="rgba(56,189,248,0.34)" stroke="var(--viz-blue)" stroke-width="1.4" />
          <circle cx="76" cy="118" r="10" fill="rgba(56,189,248,0.34)" stroke="var(--viz-blue)" stroke-width="1.4" />
          <text x="176" y="76" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--accent-coral)">ADPKD (PKD1/2)</text>
          <text x="176" y="92" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-secondary)">Kista Bilateral</text>
          <line x1="146" y1="114" x2="210" y2="114" stroke="var(--accent-primary)" stroke-width="2" />
          <text x="178" y="130" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-primary)">TBMN &lt;200 nm</text>
          <text x="178" y="144" text-anchor="middle" font-size="7" font-weight="700" fill="var(--text-muted)">(Jinak / Thin MBG)</text>
        ` : `
          <!-- Schematic Nephron Channels (Bartter NKCC2, Gitelman NCC, Liddle ENaC) -->
          <path d="M 42 56 L 78 56 L 78 148 Q 92 166 106 148 L 106 62 L 154 62 L 178 102 L 178 164" fill="none" stroke="var(--border-strong)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Bartter NKCC2 on TAL (x=106, y=106) -->
          <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroHereditaryViz('bartter')" style="cursor:pointer;">
            <circle cx="106" cy="108" r="15" fill="${mode === "bartter" ? "var(--accent-secondary)" : "var(--bg-surface)"}" stroke="var(--accent-secondary)" stroke-width="2.2" />
            <text x="106" y="111" text-anchor="middle" font-size="7" font-weight="800" fill="${mode === "bartter" ? "#fff" : "var(--text-primary)"}">NKCC2</text>
          </g>
          <!-- Gitelman NCC on DCT (x=140, y=62) -->
          <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroHereditaryViz('gitelman')" style="cursor:pointer;">
            <circle cx="142" cy="62" r="15" fill="${mode === "gitelman" ? "var(--accent-primary)" : "var(--bg-surface)"}" stroke="var(--accent-primary)" stroke-width="2.2" />
            <text x="142" y="65" text-anchor="middle" font-size="7.2" font-weight="800" fill="${mode === "gitelman" ? "#fff" : "var(--text-primary)"}">NCC</text>
          </g>
          <!-- Liddle ENaC on CD (x=178, y=126) -->
          <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroHereditaryViz('liddle')" style="cursor:pointer;">
            <circle cx="178" cy="124" r="15" fill="${mode === "liddle" ? "var(--accent-coral)" : "var(--bg-surface)"}" stroke="var(--accent-coral)" stroke-width="2.2" />
            <text x="178" y="127" text-anchor="middle" font-size="7.2" font-weight="800" fill="${mode === "liddle" ? "#fff" : "var(--text-primary)"}">ENaC</text>
          </g>
        `}

        <rect x="26" y="176" width="198" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="192" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--text-primary)">${d.label} (${d.site})</text>
        <text x="125" y="206" text-anchor="middle" font-size="7.3" font-weight="700" fill="var(--accent-primary)">${mode === "bartter" ? "Ca Urin NAIK" : mode === "gitelman" ? "Ca Urin TURUN + Mg RENDAH" : mode === "liddle" ? "TD NAIK + Aldosteron RENDAH" : mode === "alport" ? "Tuli + Mata" : "Ravine-Pei + Berry"}</text>

        <!-- Right Panel: Board Matrix Comparison -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Pembeda Cepat Ujian Board</text>
        ${[
          { k: "bartter", y: 40, t: "Bartter (NKCC2)", s: "≈ Furosemid | TD N | K↓ | Ca Urin↑" },
          { k: "gitelman", y: 74, t: "Gitelman (NCC)", s: "≈ Tiazid | TD N | Mg↓↓ | Ca Urin↓" },
          { k: "liddle", y: 108, t: "Liddle (ENaC+)", s: "HT Berat | Renin↓ Aldo↓ | Tx Amilorid" },
          { k: "alport", y: 142, t: "Alport (Kolagen IV)", s: "Basket-Weave EM | Tuli | Lentikonus" },
          { k: "adpkd", y: 176, t: "ADPKD vs TBMN", s: "PKD1/2 Kista+Berry vs TBMN Tipis" }
        ].map((r) => {
          const act = r.k === mode;
          return `
            <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroHereditaryViz('${r.k}')" style="cursor:pointer;">
              <rect x="256" y="${r.y}" width="200" height="30" rx="10" fill="var(--bg-surface)" stroke="${act ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${act ? "2" : "1"}" />
              <text x="264" y="${r.y + 13}" font-size="7.9" font-weight="800" fill="${act ? "var(--accent-primary)" : "var(--text-primary)"}">${r.t}</text>
              <text x="264" y="${r.y + 24}" font-size="7.1" font-weight="600" fill="var(--text-muted)">${r.s}</text>
            </g>
          `;
        }).join("")}
      </svg>
    `;
  }

  function renderNefroHereditaryWidget() {
    const mode = NEFRO_HERED_DATA[nefroVizState.heredMode] ? nefroVizState.heredMode : "bartter";
    const d = NEFRO_HERED_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-hered-tabs", Object.entries(NEFRO_HERED_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroHereditaryViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroHereditary",
      title: "Atlas Tubulopati Herediter (Bartter/Gitelman/Liddle), Alport & ADPKD",
      tag: "Genetik • KKI 4",
      controlsTop,
      svgHtml: buildNefroHereditarySvg(mode),
      info: { tone: d.tone, rKey: `her-${mode}`, title: `${d.label} — ${d.site}`, c1Label: "Mekanisme & Struktur Anatomi", c1Body: d.mech, c2Label: "Trias & Pembeda Kunci", c2Body: d.diff },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Pasien hipertensi muda + hipokalemia + alkalosis + <strong>Aldosteron RENDAH</strong> bukan hiperaldosteronisme (Conn), melainkan <strong>Sindrom Liddle (ENaC)</strong> — obati dengan Amiloride, bukan Spironolakton!</p>`
    });
  }

  function updateNefroHereditaryViz(modeIn) {
    if (NEFRO_HERED_DATA[modeIn]) nefroVizState.heredMode = modeIn;
    const mode = nefroVizState.heredMode;
    const d = NEFRO_HERED_DATA[mode];
    syncVizPresets("viz-nefro-hered-tabs", Object.keys(NEFRO_HERED_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-nefroHereditary-frame", buildNefroHereditarySvg(mode));
    updateVizReadout("viz-nefroHereditary-readout", d.tone, formatVizReadoutHtml(`${d.label} — ${d.site}`, "Mekanisme & Struktur Anatomi", d.mech, "Trias & Pembeda Kunci", d.diff, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Liddle (ENaC aktif) ditandai HT + hipokalemia dengan <strong>Aldosteron &amp; Renin RENDAH</strong>!</p>`), `her-${mode}`);
  }

  // --- N14. Loop Hormonal CKD-MBD & Anemia Renal (nefro-5-2) ---
  const NEFRO_MBD_TX = {
    baseline: { label: "1. Alami (Tanpa Terapi)", po4Mod: 0, caMod: 0, pthMod: 1.0, tone: "warning" },
    binder: { label: "2. Pengikat Fosfat (Sevelamer)", po4Mod: -1.6, caMod: 0, pthMod: 0.78, tone: "info" },
    calcitriol: { label: "3. Kalsitriol (Vit D Aktif)", po4Mod: 0.3, caMod: 0.6, pthMod: 0.72, tone: "info" },
    cinacalcet: { label: "4. Kalsimimetik (Sinakalset)", po4Mod: -0.4, caMod: -0.5, pthMod: 0.55, tone: "info" },
    esa: { label: "5. Anemia Renal (Besi + ESA)", po4Mod: 0, caMod: 0, pthMod: 1.0, tone: "warning" }
  };

  function evaluateNefroCkdMbd(egfrIn, txKey) {
    const egfr = clampNum(egfrIn, 10, 90, 28);
    const tx = NEFRO_MBD_TX[txKey] || NEFRO_MBD_TX.baseline;
    const sev = (90 - egfr) / 80; // 0 (G1) -> 1 (G5)

    const fgf23 = Math.round(45 + Math.pow(sev, 1.3) * 900);
    const po4 = clampNum(3.4 + sev * 3.1 + tx.po4Mod, 2.6, 8.5, 4.8);
    const calcitriol = txKey === "calcitriol" ? Math.round(32 - sev * 8) : Math.round(46 - sev * 34);
    const ca = clampNum(9.4 - sev * 1.4 + tx.caMod, 7.0, 10.6, 8.5);
    const pth = Math.round((42 + Math.pow(sev, 1.7) * 580) * tx.pthMod);

    let title = `CKD-MBD pada eLFG ${Math.round(egfr)} mL/mnt (${tx.label})`;
    let c1Label = "Dinamika Umpan Balik Hormonal";
    let c1Body = `<strong>FGF-23 (~${fgf23}) naik paling dini</strong> untuk membuang PO<sub>4</sub><sup>3-</sup>, sekaligus menghambat 1&alpha;-hidroksilase ginjal &rarr; Kalsitriol turun (${calcitriol}) &rarr; Hipokalsemia (${ca.toFixed(1)}) memicu <strong>PTH lonjak (${pth} pg/mL)</strong>!`;
    let c2Label = "Rekomendasi Terapi KDIGO CKD-MBD";
    let c2Body = "Kontrol fosfat dulu (pengikat non-kalsium <strong>Sevelamer</strong> bila ada kalsifikasi vaskular; batasi CaCO<sub>3</sub> bila Ca tinggi; hindari Al(OH)<sub>3</sub> jangka panjang!).";

    if (txKey === "esa") {
      title = `Manajemen Anemia Renal PGK (eLFG ${Math.round(egfr)} mL/mnt)`;
      c1Label = "Status Besi & Hepsidin Sebelum ESA";
      c1Body = "Cek bila <strong>Hb &le;10 g/dL</strong>: nilai <strong>Feritin &amp; TSAT</strong> (hepsidin tinggi pada PGK memicu defisiensi besi fungsional). Koreksi cadangan besi <strong>TERLEBIH DAHULU</strong> atau bersamaan sebelum ESA/EPO!";
      c2Label = "Target Hb & Bahaya Resistensi ESA";
      c2Body = "Target Hb aman <strong>10–11,5 g/dL</strong> (<strong>JANGAN koreksi hingga Hb normal ≥13</strong> &rarr; meningkatkan stroke &amp; trombosis!). Penyebab utama resistensi ESA = <strong>defisiensi besi</strong>, inflamasi, &amp; hiperparatiroid berat.";
    } else if (txKey === "cinacalcet") {
      c2Body = "<strong>Sinakalset</strong> meningkatkan sensitivitas reseptor CaSR paratiroid &rarr; efektif menekan <strong>PTH sekaligus menurunkan Ca &amp; PO<sub>4</sub></strong> (berguna bila pasien cenderung hiperkalsemia).";
    } else if (txKey === "calcitriol") {
      c2Body = "<strong>Kalsitriol</strong> meningkatkan absorpsi Ca usus &amp; menekan transkripsi PTH, tetapi <strong>syaratnya PO<sub>4</sub> dan Ca harus terkontrol</strong> agar tidak memicu kalsifikasi vaskular/kalsifilaksis!";
    }

    return { egfr, txKey, tx, sev, fgf23, po4, calcitriol, ca, pth, title, c1Label, c1Body, c2Label, c2Body };
  }

  function buildNefroCkdMbdSvg(r) {
    const curX = 258 + ((90 - r.egfr) / 80) * 194;
    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Loop Hormonal CKD-MBD">
        <!-- Left Panel: Hormonal Feedback Loop -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Loop Hormonal CKD-MBD</text>

        <!-- 5 Hormonal Nodes in Loop -->
        <rect x="26" y="42" width="88" height="38" rx="12" fill="var(--bg-surface)" stroke="${r.po4 > 4.5 ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="1.8" />
        <text x="70" y="57" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">Fosfat (PO4)</text>
        <text x="70" y="71" text-anchor="middle" font-size="8.6" font-weight="800" fill="${r.po4 > 4.5 ? "var(--accent-coral)" : "var(--accent-primary)"}">${r.po4.toFixed(1)} mg/dL</text>

        <rect x="136" y="42" width="88" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="1.8" />
        <text x="180" y="57" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">FGF-23 (Dini!)</text>
        <text x="180" y="71" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--accent-secondary)">~${r.fgf23} RU</text>

        <rect x="136" y="102" width="88" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--viz-blue)" stroke-width="1.6" />
        <text x="180" y="117" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-primary)">Kalsitriol 1,25D</text>
        <text x="180" y="131" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--viz-blue)">${r.calcitriol} pg/mL</text>

        <rect x="26" y="102" width="88" height="38" rx="12" fill="var(--bg-surface)" stroke="${r.ca < 8.5 ? "var(--accent-secondary)" : "var(--accent-primary)"}" stroke-width="1.6" />
        <text x="70" y="117" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">Kalsium (Ca2+)</text>
        <text x="70" y="131" text-anchor="middle" font-size="8.6" font-weight="800" fill="${r.ca < 8.5 ? "var(--accent-secondary)" : "var(--accent-primary)"}">${r.ca.toFixed(1)} mg/dL</text>

        <!-- PTH Master Bar -->
        <rect x="46" y="156" width="158" height="54" rx="8" fill="var(--bg-surface)" stroke="${r.pth > 300 ? "var(--accent-coral)" : "var(--accent-secondary)"}" stroke-width="2" />
        <text x="125" y="174" text-anchor="middle" font-size="8.3" font-weight="800" fill="var(--text-primary)">Parathormon (PTH)</text>
        <text x="125" y="192" text-anchor="middle" font-size="11.5" font-weight="800" fill="${r.pth > 300 ? "var(--accent-coral)" : "var(--accent-secondary)"}">${r.pth} pg/mL</text>
        <text x="125" y="204" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-muted)">${r.pth > 300 ? "Hiperparatiroid Sekunder Berat!" : "Kompensasi Tulang & Ginjal"}</text>

        <!-- Arrows -->
        <line x1="114" y1="61" x2="134" y2="61" stroke="var(--text-muted)" stroke-width="1.6" />
        <line x1="180" y1="80" x2="180" y2="100" stroke="var(--accent-coral)" stroke-width="1.8" />
        <line x1="136" y1="121" x2="116" y2="121" stroke="var(--text-muted)" stroke-width="1.6" />
        <line x1="70" y1="140" x2="86" y2="154" stroke="var(--accent-secondary)" stroke-width="1.6" />

        <!-- Right Panel: eGFR Progression & Anemia Rule -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Kaskade Seiring Penurunan eLFG</text>

        <rect x="258" y="42" width="194" height="22" rx="4" fill="linear-gradient(90deg, rgba(0,122,255,0.25), rgba(225,29,72,0.35))" stroke="var(--border-subtle)" />
        <rect x="258" y="42" width="65" height="22" rx="4" fill="var(--accent-primary-soft)" />
        <rect x="323" y="42" width="65" height="22" fill="var(--accent-secondary-soft)" />
        <rect x="388" y="42" width="64" height="22" rx="4" fill="var(--accent-coral-soft)" />
        <text x="290" y="56" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-primary)">90 → 60</text>
        <text x="355" y="56" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">45 → 30</text>
        <text x="420" y="56" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">&lt;15 (G5)</text>
        <line x1="${curX}" y1="36" x2="${curX}" y2="70" stroke="var(--text-primary)" stroke-width="2.2" />
        <text x="356" y="84" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">eLFG Saat Ini: ${Math.round(r.egfr)} mL/mnt</text>

        <!-- Therapy / Anemia Box -->
        <rect x="256" y="98" width="200" height="116" rx="8" fill="var(--bg-surface)" stroke="${r.txKey === "esa" ? "var(--accent-secondary)" : "var(--border-strong)"}" stroke-width="1.3" />
        <text x="356" y="115" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">Urutan Intervensi Board:</text>
        <text x="264" y="132" font-size="7.2" font-weight="700" fill="var(--text-primary)">1. FGF-23 ↑ lebih dulu drpd PO4↑!</text>
        <text x="264" y="147" font-size="7.2" font-weight="700" fill="var(--text-primary)">2. Binder Non-Ca: Sevelamer</text>
        <text x="264" y="162" font-size="7.2" font-weight="700" fill="var(--accent-coral)">3. Hindari Al(OH)3 (Ensef/Tulang)</text>
        <text x="264" y="177" font-size="7.2" font-weight="700" fill="var(--viz-blue)">4. Anemia: Cek Besi/TSAT sblm ESA</text>
        <text x="264" y="192" font-size="7.2" font-weight="800" fill="var(--accent-coral)">5. Target Hb ESA: 10–11,5 (bukan 13)</text>
        <text x="264" y="206" font-size="7" font-weight="700" fill="var(--text-muted)">Kalsifilaksis: nekrosis kulit nyeri berat</text>
      </svg>
    `;
  }

  function renderNefroCkdMbdWidget() {
    const egfr = clampNum(nefroVizState.mbdEgfr, 10, 90, 28);
    const txKey = NEFRO_MBD_TX[nefroVizState.mbdTx] ? nefroVizState.mbdTx : "baseline";
    const r = evaluateNefroCkdMbd(egfr, txKey);

    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-mbd-tx", Object.entries(NEFRO_MBD_TX).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroCkdMbdViz(null, '${k}', true)`
        })), txKey)}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroMbd",
      label: "Simulasi Progresi Penurunan eLFG (90 → 10 mL/mnt):",
      pillText: `eLFG ${Math.round(egfr)}`,
      min: 10, max: 90, step: 1, value: egfr,
      trackBg: "linear-gradient(90deg, rgba(225,29,72,0.4) 0% 25%, rgba(217,119,6,0.34) 25% 65%, rgba(0,122,255,0.3) 65% 100%)",
      oninput: "window.InternaApp.updateNefroCkdMbdViz(this.value, null, true)",
      presets: [
        { label: "eLFG 60 (FGF23↑)", val: 60, active: egfr >= 50 },
        { label: "eLFG 30 (Kalsitriol↓)", val: 30, active: egfr >= 20 && egfr < 50 },
        { label: "eLFG 12 (PTH↑ Berat)", val: 12, active: egfr < 20 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroMbd",
      title: "Loop Hormonal CKD-MBD & Manajemen Anemia Renal (Besi + ESA)",
      tag: "CKD-MBD & Anemia",
      controlsTop,
      svgHtml: buildNefroCkdMbdSvg(r),
      controlsBottom,
      info: { tone: r.tx.tone, rKey: `mbd-${Math.round(egfr)}-${txKey}`, title: r.title, c1Label: r.c1Label, c1Body: r.c1Body, c2Label: r.c2Label, c2Body: r.c2Body },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan langsung beri ESA pada Hb 8 bila feritin/TSAT rendah (<strong>hepsidin + defisiensi besi</strong> adalah penyebab #1 resistensi ESA!), dan jangan targetkan Hb ≥13 g/dL!</p>`
    });
  }

  function updateNefroCkdMbdViz(egfrIn, txIn, fromUser = true) {
    if (fromUser && egfrIn !== null && egfrIn !== undefined) cancelAllVizAnimations();
    if (egfrIn !== null && egfrIn !== undefined) nefroVizState.mbdEgfr = clampNum(egfrIn, 10, 90, 28);
    if (NEFRO_MBD_TX[txIn]) nefroVizState.mbdTx = txIn;

    const r = evaluateNefroCkdMbd(nefroVizState.mbdEgfr, nefroVizState.mbdTx);
    syncVizPresets("viz-nefro-mbd-tx", Object.keys(NEFRO_MBD_TX).map((k) => k === r.txKey));
    syncSliderAndPill("viz-nefroMbd-slider", "viz-nefroMbd-pill", r.egfr, `eLFG ${Math.round(r.egfr)}`);
    syncVizPresets("viz-nefroMbd-presets", [r.egfr >= 50, r.egfr >= 20 && r.egfr < 50, r.egfr < 20]);
    swapVizSvgFrame("viz-nefroMbd-frame", buildNefroCkdMbdSvg(r));
    updateVizReadout("viz-nefroMbd-readout", r.tx.tone, formatVizReadoutHtml(r.title, r.c1Label, r.c1Body, r.c2Label, r.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Koreksi defisiensi besi sebelum ESA &amp; hindari target Hb &ge;13 g/dL!</p>`), `mbd-${Math.round(r.egfr)}-${r.txKey}`);
  }

  // --- N15. Kalkulator Urine Anion Gap (UAG) & Matriks RTA Tipe 1, 2, 4 (nefro-2-4) ---
  const NEFRO_RTA_PRESETS = {
    diare: { label: "Diare Berat (GI Loss)", una: 22, uk: 20, ucl: 64, phU: 5.1, kSer: 3.1, alb: 3.6, ca: 8.6 },
    rta1: { label: "RTA Tipe 1 (Distal)", una: 48, uk: 18, ucl: 40, phU: 6.4, kSer: 2.8, alb: 3.8, ca: 9.2 },
    rta2: { label: "RTA Tipe 2 (Proksimal)", una: 40, uk: 22, ucl: 50, phU: 5.3, kSer: 3.0, alb: 3.5, ca: 8.8 },
    rta4: { label: "RTA Tipe 4 (Hipoaldo)", una: 54, uk: 16, ucl: 48, phU: 5.2, kSer: 5.8, alb: 3.2, ca: 8.5 }
  };

  function evaluateNefroRta(vals, presetKey) {
    const una = clampNum(vals.una, 5, 220, 48);
    const uk = clampNum(vals.uk, 3, 150, 18);
    const ucl = clampNum(vals.ucl, 5, 250, 40);
    const phU = clampNum(vals.phU, 4.5, 8.0, 6.4);
    const kSer = clampNum(vals.kSer, 1.8, 7.5, 2.8);
    const alb = clampNum(vals.alb, 1.2, 5.0, 3.8);
    const ca = clampNum(vals.ca, 5.5, 13.0, 9.2);

    const uag = (una + uk) - ucl;
    const caCorr = ca + 0.8 * (4.0 - alb);

    let dx = "RTA Tipe 1 (Distal — Gagal Sekresi H+)";
    let tone = "warning";
    let body = "pH urin selalu <strong>&gt;5,5</strong> meski asidemia + UAG positif (&gt;0) + hipokalemia; klasik menyebabkan <strong>nefrokalsinosis / batu CaPO<sub>4</sub></strong> (terkait Sj&ouml;gren/SLE).";
    let tx = "Berikan <strong>Natrium Bikarbonat atau Kalium Sitrat</strong> oral + koreksi kalium.";

    if (uag < 0) {
      dx = "Kehilangan Bikarbonat GI (Diare) — Respons Ginjal Utuh!";
      tone = "info";
      body = `<strong>UAG Negatif (${uag.toFixed(0)} mEq/L &lt; 0)</strong> menandakan ginjal berhasil mengekskresikan banyak <strong>NH<sub>4</sub><sup>+</sup></strong> bersama Cl<sup>-</sup> untuk melawan asidosis!`;
      tx = "Atasi diare &amp; rehidrasi cairan; BUKAN RTA.";
    } else if (kSer >= 5.2) {
      dx = "RTA Tipe 4 (Hipoaldosteronisme Hiperkalemik)";
      tone = "danger";
      body = `UAG positif (${uag.toFixed(0)}) + <strong>HIPERKALEMIA (K+ ${kSer.toFixed(1)})</strong> + pH urin &lt;5,5; tersering pada <strong>Nefropati Diabetik (hiporeninemia), ACEi/ARB, atau Spironolakton</strong>!`;
      tx = "Hentikan penghambat RAAS/NSAID/TMP-SMX, diet rendah K<sup>+</sup>, furosemid/fludrokortison bila perlu.";
    } else if (presetKey === "rta2" || phU <= 5.5) {
      dx = "RTA Tipe 2 (Proksimal / Sindrom Fanconi)";
      tone = "warning";
      body = "Gangguan reabsorpsi HCO<sub>3</sub><sup>-</sup> di tubulus proksimal (pH urin bisa <strong>&lt;5,5 saat HCO<sub>3</sub><sup>-</sup> serum turun</strong> di bawah ambang ginjal) disertai glukosuria normoglikemik, fosfaturia, &amp; aminoasiduria.";
      tx = "Butuh dosis bikarbonat sangat besar + suplementasi K<sup>+</sup>/fosfat/Vit D; etiologi klasik: <strong>Mieloma Multipel, Tenofovir, Asetazolamid</strong>.";
    }

    return { una, uk, ucl, phU, kSer, alb, ca, uag, caCorr, dx, tone, body, tx };
  }

  function buildNefroRtaSvg(res) {
    const uagClamp = clampNum(res.uag, -40, 40, 0);
    const barX = 125 + (uagClamp / 40) * 90;
    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Kalkulator UAG dan Matriks RTA">
        <!-- Left Panel: UAG Formula Gauge -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Anion Gap Urin: (UNa + UK) - UCl</text>

        <rect x="26" y="42" width="198" height="58" rx="8" fill="var(--bg-surface)" stroke="${res.uag < 0 ? "var(--accent-primary)" : "var(--accent-coral)"}" stroke-width="1.8" />
        <text x="125" y="64" text-anchor="middle" font-size="14" font-weight="800" fill="${res.uag < 0 ? "var(--accent-primary)" : "var(--accent-coral)"}">UAG = ${res.uag >= 0 ? "+" : ""}${res.uag.toFixed(0)} mEq/L</text>
        <text x="125" y="84" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">${res.uag < 0 ? "NEGATIF (NH4+ Tinggi → GI/Diare)" : "POSITIF (NH4+ Terganggu → RTA)"}</text>

        <!-- Zero-Centered Gauge Bar -->
        <rect x="34" y="114" width="91" height="16" rx="3" fill="var(--accent-primary-soft)" />
        <rect x="125" y="114" width="91" height="16" rx="3" fill="var(--accent-coral-soft)" />
        <line x1="125" y1="110" x2="125" y2="134" stroke="var(--text-muted)" stroke-width="1.4" />
        <line x1="${barX}" y1="108" x2="${barX}" y2="136" stroke="var(--text-primary)" stroke-width="2.5" />
        <text x="58" y="146" text-anchor="middle" font-size="7.3" font-weight="800" fill="var(--accent-primary)">&lt;0 Diare</text>
        <text x="192" y="146" text-anchor="middle" font-size="7.3" font-weight="800" fill="var(--accent-coral)">&gt;0 RTA</text>

        <!-- Calcium Albumin Correction Bonus -->
        <rect x="26" y="160" width="198" height="52" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="177" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--viz-blue)">Koreksi Kalsium Albumin (Bab 290):</text>
        <text x="125" y="193" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Ca Koreksi: ${res.caCorr.toFixed(2)} mg/dL</text>
        <text x="125" y="206" text-anchor="middle" font-size="7" font-weight="600" fill="var(--text-muted)">Ca + 0,8 × (4,0 - Alb ${res.alb.toFixed(1)})</text>

        <!-- Right Panel: RTA 1 vs 2 vs 4 Matrix -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Matriks Pembeda NAGMA (UAG +)</text>

        ${[
          { y: 42, lbl: "Diare / GI Loss", desc: "UAG <0 | pH <5,5 | K↓ | NH4+ Utuh", act: res.uag < 0 },
          { y: 84, lbl: "RTA Tipe 1 (Distal)", desc: "UAG + | pH >5,5 | K↓ | Batu CaPO4", act: res.uag >= 0 && res.phU > 5.5 && res.kSer < 5.2 },
          { y: 126, lbl: "RTA Tipe 2 (Proksimal)", desc: "pH <5,5 saat berat | K↓ | Fanconi", act: res.uag >= 0 && res.phU <= 5.5 && res.kSer < 5.2 },
          { y: 168, lbl: "RTA Tipe 4 (Hipoaldo)", desc: "UAG + | pH <5,5 | K+ NAIK! | DM/ACEi", act: res.uag >= 0 && res.kSer >= 5.2 }
        ].map((r) => `
          <rect x="256" y="${r.y}" width="200" height="36" rx="10" fill="var(--bg-surface)" stroke="${r.act ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${r.act ? "2" : "1"}" />
          <text x="266" y="${r.y + 15}" font-size="8.2" font-weight="800" fill="${r.act ? "var(--accent-primary)" : "var(--text-primary)"}">${r.lbl}</text>
          <text x="266" y="${r.y + 28}" font-size="7.2" font-weight="700" fill="var(--text-muted)">${r.desc}</text>
        `).join("")}
      </svg>
    `;
  }

  function renderNefroRtaWidget() {
    const pKey = NEFRO_RTA_PRESETS[nefroVizState.rtaPreset] ? nefroVizState.rtaPreset : "rta1";
    const def = NEFRO_RTA_PRESETS[pKey];
    const res = evaluateNefroRta(def, pKey);

    const controlsTop = `
      <div class="space-y-2.5 mb-2.5">
        ${renderCardioTabRow("viz-nefro-rta-tabs", Object.entries(NEFRO_RTA_PRESETS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroRtaViz('${k}')`
        })), pKey)}
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          ${[
            { id: "rta-una", lbl: "Na Urin", val: def.una },
            { id: "rta-uk", lbl: "K Urin", val: def.uk },
            { id: "rta-ucl", lbl: "Cl Urin", val: def.ucl },
            { id: "rta-phu", lbl: "pH Urin", val: def.phU, step: "0.1" },
            { id: "rta-kser", lbl: "K Serum", val: def.kSer, step: "0.1" },
            { id: "rta-alb", lbl: "Albumin", val: def.alb, step: "0.1" }
          ].map((f) => `
            <div style="min-width:0;">
              <label for="${f.id}" class="block text-[10px] font-mono font-bold text-[var(--text-muted)] mb-1 truncate">${f.lbl}</label>
              <input type="number" id="${f.id}" value="${f.val}" step="${f.step || "1"}" oninput="window.InternaApp.updateNefroRtaViz()" class="viz-calc-input text-xs font-mono py-1.5 px-2 w-full" />
            </div>
          `).join("")}
        </div>
      </div>
    `;

    return renderCardioWidgetCard({
      key: "nefroRta",
      title: "Kalkulator Anion Gap Urin (UAG) & Matriks RTA Tipe 1, 2, 4",
      tag: "RTA & Mineral • KKI 4",
      controlsTop,
      svgHtml: buildNefroRtaSvg(res),
      info: { tone: res.tone, rKey: `rta-${pKey}-${res.uag.toFixed(0)}`, title: `${res.dx} (UAG ${res.uag.toFixed(0)})`, c1Label: "Analisis NAGMA & Kinetika RTA", c1Body: res.body, c2Label: "Tata Laksana", c2Body: res.tx },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Seluruh RTA berpola <strong>NAGMA (Anion Gap serum normal)</strong>! Hanya <strong>RTA Tipe 4</strong> yang disertai <strong>HIPERKALEMIA</strong>; dan pada hipoalbuminemia, koreksi Ca total: +0,8 per penurunan 1 g/dL albumin!</p>`
    });
  }

  function updateNefroRtaViz(presetKey) {
    if (presetKey && NEFRO_RTA_PRESETS[presetKey]) {
      nefroVizState.rtaPreset = presetKey;
      const p = NEFRO_RTA_PRESETS[presetKey];
      const map = { "rta-una": p.una, "rta-uk": p.uk, "rta-ucl": p.ucl, "rta-phu": p.phU, "rta-kser": p.kSer, "rta-alb": p.alb };
      Object.entries(map).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
      syncVizPresets("viz-nefro-rta-tabs", Object.keys(NEFRO_RTA_PRESETS).map((k) => k === presetKey));
    }
    const vals = {
      una: document.getElementById("rta-una")?.value ?? 48,
      uk: document.getElementById("rta-uk")?.value ?? 18,
      ucl: document.getElementById("rta-ucl")?.value ?? 40,
      phU: document.getElementById("rta-phu")?.value ?? 6.4,
      kSer: document.getElementById("rta-kser")?.value ?? 2.8,
      alb: document.getElementById("rta-alb")?.value ?? 3.8,
      ca: 9.2
    };
    const res = evaluateNefroRta(vals, nefroVizState.rtaPreset);
    swapVizSvgFrame("viz-nefroRta-frame", buildNefroRtaSvg(res));
    updateVizReadout("viz-nefroRta-readout", res.tone, formatVizReadoutHtml(`${res.dx} (UAG ${res.uag.toFixed(0)})`, "Analisis NAGMA & Kinetika RTA", res.body, "Tata Laksana", res.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Hanya <strong>RTA Tipe 4</strong> yang hiperkalemik; Diare memberikan <strong>UAG negatif (&lt;0)</strong>!</p>`), `rta-${res.uag.toFixed(0)}-${res.kSer}`);
  }

  // --- N16. Atlas Kompartemen Ginjal AIN vs ATN vs GN (nefro-3-3) ---
  const NEFRO_AIN_DATA = {
    ain: {
      label: "1. AIN (Interstisium)", tone: "warning",
      comp: "<strong>Glomerulus UTUH</strong>, namun <strong>ruang interstisium melebar edematosa</strong> penuh infiltrat <strong>Eosinofil, Limfosit, &amp; Sel Plasma</strong> akibat hipersensitivitas obat.",
      tx: "<strong>Hentikan SEGERA obat pemicu</strong> (PPI/Omeprazol, NSAID, Beta-laktam, Rifampisin, Alopurinol); beri <strong>Kortikosteroid</strong> bila eLFG gagal membaik dalam 3–7 hari!"
    },
    atn: {
      label: "2. ATN (Tubulus Nekrotik)", tone: "danger",
      comp: "Kerusakan langsung <strong>sel epitel tubulus</strong> rontok ke lumen (<strong>muddy brown casts</strong>, FENa &gt;2%); ruang interstisium relatif bersih tanpa infiltrat eosinofil.",
      tx: "Atasi syok/sepsis/iskemia, stop nefrotoksin, jaga euvolemia (<strong>bukan steroid!</strong>)."
    },
    gn: {
      label: "3. Glomerulonefritis (Glomerulus)", tone: "info",
      comp: "Inflamasi terpusat di <strong>rumbai kapiler glomerulus</strong> (hiperselularitas / kresen) disertai <strong>hematuria akantosit &amp; silinder eritrosit</strong>.",
      tx: "Evaluasi C3/C4/ANCA/anti-dsDNA dan lakukan biopsi ginjal untuk terapi imunosupresi spesifik."
    }
  };

  function buildNefroAinSvg(compKey) {
    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Atlas Kompartemen Ginjal AIN vs ATN vs GN">
        <!-- Left Panel: 3-Compartment Renal Biopsy Field -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">3 Kompartemen Biopsi Ginjal</text>

        <!-- Interstitial Background Space (Inflamed Eosinophils in AIN) -->
        <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroAinViz('ain')" style="cursor:pointer;">
          <rect x="26" y="42" width="198" height="128" rx="8" fill="${compKey === "ain" ? "rgba(217,119,6,0.22)" : "var(--bg-surface)"}" stroke="${compKey === "ain" ? "var(--accent-secondary)" : "var(--border-strong)"}" stroke-width="${compKey === "ain" ? "2.4" : "1.2"}" />
          ${compKey === "ain" ? `
            <!-- Eosinophils (pink bilobed) in Interstitium -->
            ${[[48, 66], [198, 62], [44, 146], [202, 148], [130, 152]].map(([cx, cy]) => `
              <circle cx="${cx}" cy="${cy}" r="8" fill="rgba(236,72,153,0.34)" stroke="#db2777" stroke-width="1.6" />
              <circle cx="${cx - 2}" cy="${cy}" r="2" fill="#be185d" />
              <circle cx="${cx + 2}" cy="${cy}" r="2" fill="#be185d" />
            `).join("")}
          ` : ""}
        </g>

        <!-- Glomerulus Top Left -->
        <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroAinViz('gn')" style="cursor:pointer;">
          <circle cx="88" cy="88" r="34" fill="${compKey === "gn" ? "rgba(225,29,72,0.2)" : "var(--bg-surface)"}" stroke="${compKey === "gn" ? "var(--accent-coral)" : "var(--viz-blue)"}" stroke-width="${compKey === "gn" ? "2.6" : "1.6"}" />
          <circle cx="88" cy="88" r="20" fill="${compKey === "gn" ? "rgba(225,29,72,0.3)" : "rgba(0,122,255,0.12)"}" stroke="var(--text-muted)" />
          <text x="88" y="134" text-anchor="middle" font-size="7.3" font-weight="800" fill="${compKey === "gn" ? "var(--accent-coral)" : "var(--text-secondary)"}">${compKey === "gn" ? "Glomerulus Inflamasi" : "Glomerulus Utuh"}</text>
        </g>

        <!-- Tubule Cross-Section Top Right -->
        <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroAinViz('atn')" style="cursor:pointer;">
          <rect x="140" y="64" width="66" height="52" rx="10" fill="${compKey === "atn" ? "rgba(225,29,72,0.22)" : "var(--bg-surface-subtle)"}" stroke="${compKey === "atn" ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="${compKey === "atn" ? "2.4" : "1.5"}" />
          <text x="173" y="93" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--text-primary)">${compKey === "atn" ? "Epitel Rontok!" : "Tubulus Utuh"}</text>
        </g>

        <rect x="26" y="176" width="198" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="192" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">${NEFRO_AIN_DATA[compKey].label}</text>
        <text x="125" y="206" text-anchor="middle" font-size="7.3" font-weight="700" fill="var(--accent-secondary)">${compKey === "ain" ? "Piuria Steril + Eosinofiluria" : compKey === "atn" ? "Muddy Brown Casts + FENa >2%" : "Silinder RBC + Akantosit"}</text>

        <!-- Right Panel: Urinalysis & Trigger Drugs -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Kunci Diagnosis AIN (15–20% AKI RS)</text>
        ${[
          { y: 42, t: "5 Obat Pemicu Tersering:", s: "PPI (Omeprazol), NSAID, Beta-Laktam", s2: "Rifampisin, Alopurinol, Jamu" },
          { y: 98, t: "Temuan Urin & Darah:", s: "Silinder Leukosit STERIL (kultur -)", s2: "Eosinofiluria | Proteinuria <2 g/hari" },
          { y: 154, t: "Jebakan Trias Klasik:", s: "Demam + Ruam + Eosinofilia <30%!", s2: "Jangan tunggu trias lengkap u/ stop obat!" }
        ].map((box) => `
          <rect x="256" y="${box.y}" width="200" height="48" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
          <text x="266" y="${box.y + 15}" font-size="8" font-weight="800" fill="var(--accent-primary)">${box.t}</text>
          <text x="266" y="${box.y + 28}" font-size="7.3" font-weight="700" fill="var(--text-primary)">${box.s}</text>
          <text x="266" y="${box.y + 41}" font-size="7.1" font-weight="600" fill="var(--text-muted)">${box.s2}</text>
        `).join("")}
      </svg>
    `;
  }

  function renderNefroAinWidget() {
    const compKey = NEFRO_AIN_DATA[nefroVizState.ainComp] ? nefroVizState.ainComp : "ain";
    const d = NEFRO_AIN_DATA[compKey];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-ain-tabs", Object.entries(NEFRO_AIN_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroAinViz('${k}')`
        })), compKey)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroAin",
      title: "Atlas Kompartemen Biopsi Ginjal: AIN Interstisium vs ATN vs GN",
      tag: "AIN Obat • KKI 4",
      controlsTop,
      svgHtml: buildNefroAinSvg(compKey),
      info: { tone: d.tone, rKey: `ain-${compKey}`, title: d.label, c1Label: "Histopatologi Kompartemen", c1Body: d.comp, c2Label: "Prioritas Tata Laksana", c2Body: d.tx },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan selalu salahkan infeksi bila ada silinder leukosit! Bila <strong>kultur urin negatif + minum PPI/OAINS baru</strong> &rarr; itu <strong>AIN</strong>, bukan ISK!</p>`
    });
  }

  function updateNefroAinViz(compIn) {
    if (NEFRO_AIN_DATA[compIn]) nefroVizState.ainComp = compIn;
    const compKey = nefroVizState.ainComp;
    const d = NEFRO_AIN_DATA[compKey];
    syncVizPresets("viz-nefro-ain-tabs", Object.keys(NEFRO_AIN_DATA).map((k) => k === compKey));
    swapVizSvgFrame("viz-nefroAin-frame", buildNefroAinSvg(compKey));
    updateVizReadout("viz-nefroAin-readout", d.tone, formatVizReadoutHtml(d.label, "Histopatologi Kompartemen", d.comp, "Prioritas Tata Laksana", d.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Piuria steril + riwayat PPI/NSAID &rarr; stop obat pemicu segera!</p>`), `ain-${compKey}`);
  }

  // --- N17. Checklist AEIOU Dialisis Cito & Modalitas IHD vs PIRRT/CRRT (nefro-3-4) ---
  function getNefroDialysisState() {
    const chks = ["hd-a", "hd-e", "hd-i", "hd-o", "hd-u"].map((id) => Boolean(document.getElementById(id)?.checked));
    const count = chks.filter(Boolean).length;
    const hemo = nefroVizState.hdHemo === "stable" ? "stable" : "unstable";
    const cito = count > 0;
    const modality = hemo === "stable"
      ? "IHD (Hemodialisis Intermiten — Klirens Cepat!)"
      : "CRRT atau PIRRT / SLED (Lindungi Hemodinamik Syok!)";
    return { chks, count, hemo, cito, modality };
  }

  function buildNefroDialysisSvg(st) {
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Checklist AEIOU Dialisis Akut dan Pemilihan Modalitas">
        <!-- Left Panel: AEIOU Emergency Readiness -->
        <rect x="14" y="12" width="222" height="202" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Status Indikasi Cito TPG-A (AEIOU)</text>
        <rect x="26" y="42" width="198" height="58" rx="8" fill="var(--bg-surface)" stroke="${st.cito ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2" />
        <text x="125" y="64" text-anchor="middle" font-size="11.5" font-weight="800" fill="${st.cito ? "var(--accent-coral)" : "var(--accent-primary)"}">${st.cito ? `CITO DIALISIS (${st.count}/5)!` : "Belum Ada AEIOU Cito"}</text>
        <text x="125" y="83" text-anchor="middle" font-size="7.6" font-weight="700" fill="var(--text-secondary)">${st.cito ? "Pasang kateter CDL & mulai TPG-A" : "Terapi konservatif & pantau ketat"}</text>

        <!-- Letter Badges A E I O U -->
        ${["A", "E", "I", "O", "U"].map((ltr, idx) => {
          const on = st.chks[idx];
          const x = 32 + idx * 38;
          return `
            <rect x="${x}" y="114" width="32" height="32" rx="10" fill="${on ? "var(--accent-coral)" : "var(--bg-surface)"}" stroke="${on ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="1.6" />
            <text x="${x + 16}" y="134" text-anchor="middle" font-size="11" font-weight="800" fill="${on ? "#fff" : "var(--text-muted)"}">${ltr}</text>
          `;
        }).join("")}

        <rect x="26" y="158" width="198" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="174" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">Cegah Dialysis Disequilibrium (DDS):</text>
        <text x="125" y="189" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-muted)">Ureum tinggi: turunkan Qb &amp; durasi awal (2j)</text>

        <!-- Right Panel: IHD vs CRRT / SLED Comparison -->
        <rect x="246" y="12" width="220" height="202" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Modalitas: ${st.hemo === "stable" ? "Hemodinamik Stabil" : "Syok / ICU Vasopresor"}</text>

        <rect x="256" y="42" width="200" height="72" rx="12" fill="var(--bg-surface)" stroke="${st.hemo === "stable" ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${st.hemo === "stable" ? "2.2" : "1"}" />
        <text x="266" y="59" font-size="8.3" font-weight="800" fill="var(--accent-primary)">IHD (Hemodialisis Intermiten)</text>
        <text x="266" y="75" font-size="7.2" font-weight="700" fill="var(--text-primary)">• Klirens TERCEPAT (3–4 jam/sesi)</text>
        <text x="266" y="90" font-size="7.2" font-weight="700" fill="var(--text-primary)">• Utama: Hiperkalemia Kritis &amp; Intoksikasi</text>
        <text x="266" y="104" font-size="7" font-weight="600" fill="var(--text-muted)">• Syarat: TD stabil tanpa vasopresor tinggi</text>

        <rect x="256" y="124" width="200" height="78" rx="12" fill="var(--bg-surface)" stroke="${st.hemo === "unstable" ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${st.hemo === "unstable" ? "2.2" : "1"}" />
        <text x="266" y="141" font-size="8.3" font-weight="800" fill="var(--accent-coral)">CRRT / PIRRT (SLED)</text>
        <text x="266" y="157" font-size="7.2" font-weight="700" fill="var(--text-primary)">• Ultrafiltrasi lambat &amp; kontinu (24 jam)</text>
        <text x="266" y="172" font-size="7.2" font-weight="700" fill="var(--text-primary)">• Pilihan: Syok Septik, Kardiogenik, Edema Otak</text>
        <text x="266" y="187" font-size="7" font-weight="600" fill="var(--text-muted)">• Perikarditis Uremik: Heparin-Free HD!</text>
      </svg>
    `;
  }

  function renderNefroDialysisWidget() {
    const hemo = nefroVizState.hdHemo === "stable" ? "stable" : "unstable";
    const initSt = { chks: [false, true, false, false, false], count: 1, hemo, cito: true, modality: hemo === "stable" ? "IHD" : "CRRT / SLED" };
    const controlsTop = `
      <div class="space-y-2.5 mb-2.5">
        <div class="viz-calc-grid">
          ${renderCalcCheckItem("hd-a", "window.InternaApp.updateNefroDialysisViz()", "<strong>A</strong>sidosis Berat Refrakter (pH &lt;7,15)")}
          ${renderCalcCheckItem("hd-e", "window.InternaApp.updateNefroDialysisViz()", "<strong>E</strong>lektrolit: Hiperkalemia Refrakter + EKG", { checked: true })}
          ${renderCalcCheckItem("hd-i", "window.InternaApp.updateNefroDialysisViz()", "<strong>I</strong>ntoksikasi Dialisabel (Metanol, Litium, Salisilat)")}
          ${renderCalcCheckItem("hd-o", "window.InternaApp.updateNefroDialysisViz()", "<strong>O</strong>verload Edema Paru Anuria Refrakter Diuretik")}
          ${renderCalcCheckItem("hd-u", "window.InternaApp.updateNefroDialysisViz()", "<strong>U</strong>remia: Perikarditis / Ensefalopati / Perdarahan", { fullWidth: true })}
        </div>
        ${renderCardioTabRow("viz-nefro-hd-hemo", [
          { key: "unstable", label: "Hemodinamik Tidak Stabil / Syok (CRRT / SLED)", onclick: "window.InternaApp.updateNefroDialysisViz('unstable')" },
          { key: "stable", label: "Hemodinamik Stabil (IHD Cepat)", onclick: "window.InternaApp.updateNefroDialysisViz('stable')" }
        ], hemo)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroDialysis",
      title: "Checklist Indikasi Cito AEIOU & Pemilih Modalitas TPG-A",
      tag: "Dialisis ICU • KKI 4",
      controlsTop,
      svgHtml: buildNefroDialysisSvg(initSt),
      info: {
        tone: "danger",
        rKey: `hd-1-${hemo}`,
        title: `Indikasi Cito (1/5 AEIOU) → Pilih ${initSt.modality}`,
        c1Label: "Keputusan Inisiasi Cito (Bab 307)",
        c1Body: "Minimal 1 kriteria <strong>AEIOU</strong> refrakter terapi medis merupakan indikasi dialisis emergensi.",
        c2Label: "Pemilihan Modalitas & Keamanan",
        c2Body: hemo === "stable" ? "<strong>IHD</strong> memberi klirens paling cepat (ideal untuk hiperkalemia mengancam nyawa &amp; keracunan metanol)." : "<strong>CRRT / SLED</strong> menghindari fluktuasi TD &amp; perubahan osmolalitas mendadak pada pasien vasopresor / TIK meningkat."
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> <strong>Perikarditis uremik</strong> adalah indikasi mutlak dialisis cito dengan <strong>heparin-free</strong> (mencegah tamponade hemoragik!). Ingat obat NON-dialisabel: <strong>Digoksin &amp; Antidepresan Trisiklik</strong>!</p>`
    });
  }

  function updateNefroDialysisViz(hemoIn) {
    if (hemoIn === "stable" || hemoIn === "unstable") nefroVizState.hdHemo = hemoIn;
    const st = getNefroDialysisState();
    syncVizPresets("viz-nefro-hd-hemo", [st.hemo === "unstable", st.hemo === "stable"]);
    swapVizSvgFrame("viz-nefroDialysis-frame", buildNefroDialysisSvg(st));
    updateVizReadout("viz-nefroDialysis-readout", st.cito ? "danger" : "info", formatVizReadoutHtml(st.cito ? `Indikasi Cito (${st.count}/5 AEIOU) → ${st.modality}` : `Belum Ada AEIOU (${st.hemo === "stable" ? "Monitor Ketat" : "Siapkan CRRT jika Perburukan"})`, "Keputusan Inisiasi Cito (Bab 307)", st.cito ? "Segera inisiasi TPG-A; bila pasien memakai heparin &amp; mengalami perikarditis uremik, gunakan protokol <strong>bebas heparin</strong>!" : "Lanjutkan optimalisasi hemodinamik &amp; terapi medis konservatif sambil memantau kreatinin/diuresis.", "Pemilihan Modalitas & Keamanan", st.hemo === "stable" ? "<strong>IHD</strong> unggul pada klirens cepat hiperkalemia &amp; intoksikasi metanol/salisilat/litium." : "<strong>CRRT / SLED</strong> aman menjaga stabilitas hemodinamik ICU dan mencegah edema serebri (DDS).", `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Digoksin &amp; TCA terikat protein jaringan tinggi sehingga <strong>TIDAK efektif didialisis</strong>!</p>`), `hd-${st.count}-${st.hemo}`);
  }

  // --- N18. Simulator Batu Saluran Kemih & Dekompresi Cito (nefro-6-1) ---
  const NEFRO_STONE_MODES = {
    ca_ox: { label: "Ca Oksalat (Radiopak)", tone: "info", char: "Batu tersering (~75–80%); <strong>radiopak</strong> di foto BNO, bentuk amplop/halter di urin, risiko naik bila dehidrasi &amp; oksalat tinggi." },
    uric: { label: "Asam Urat (Radiolusen)", tone: "warning", char: "<strong>Radiolusen</strong> pada foto polos BNO (terlihat jelas di CT non-kontras &amp; USG); terbentuk di <strong>urin asam (pH &lt;5,5)</strong> — dapat larut dgn <strong>Kalium Sitrat</strong>!" },
    struvite: { label: "Struvit / Staghorn (Proteus)", tone: "warning", char: "Batu <strong>tanduk rusa (Staghorn)</strong> raksasa di kaliks renal akibat infeksi bakteri pemecah urea (<strong>Proteus mirabilis, Klebsiella</strong>) &rarr; urin basa pH &gt;7,2!" },
    sepsis: { label: "Darurat: Urosepsis / Anuria!", tone: "danger", char: "Obstruksi batu disertai <strong>demam/urosepsis atau ginjal tunggal anuria</strong> adalah kegawatdaruratan urologi absolut!" }
  };

  function evaluateNefroStone(mmIn, modeIn) {
    const mm = clampNum(mmIn, 2, 22, 7);
    const mode = NEFRO_STONE_MODES[modeIn] ? modeIn : "ca_ox";
    const info = NEFRO_STONE_MODES[mode];

    let planTitle = "";
    let planBody = "";
    let tone = info.tone;

    if (mode === "sepsis") {
      tone = "danger";
      planTitle = "STOP ESWL/MET — DEKOMPRESI CITO (DJ Stent / Nefrostomi PCN)!";
      planBody = "Berikan <strong>Antibiotik IV + Resusitasi Sepsis + Pasang DJ Stent atau Nefrostomi Perkutan (PCN) DARURAT</strong> untuk mengalirkan pus; JANGAN langsung tembak ESWL saat terinfeksi!";
    } else if (mm < 5) {
      planTitle = `Ukuran ${mm.toFixed(0)} mm (<5 mm) → Keluar Spontan Tinggi (68–80%) + MET`;
      planBody = "Hidrasi adekuat + analgetik (<strong>Ketorolac/NSAID hati-hati eLFG</strong>) + pertimbangkan <strong>Tamsulosin 0,4 mg/hari</strong> bila di ureter distal.";
    } else if (mm <= 10) {
      planTitle = `Ukuran ${mm.toFixed(0)} mm (5–10 mm) → MET (Tamsulosin) atau ESWL / URS`;
      planBody = "Berikan <strong>Tamsulosin 0,4 mg/hari</strong> (alfa-bloker relaksasi ureter distal) hingga 4 minggu; bila nyeri refrakter/gagal keluar &rarr; <strong>URS atau ESWL</strong>.";
    } else if (mm <= 20) {
      planTitle = `Ukuran ${mm.toFixed(0)} mm (10–20 mm) → URS / RIRS atau ESWL`;
      planBody = "Peluang keluar spontan sangat kecil; pilihan utama adalah <strong>Ureteroskopi (URS/RIRS laser)</strong> atau <strong>ESWL</strong> sesuai lokasi &amp; densitas CT (HU).";
    } else {
      planTitle = `Ukuran ${mm.toFixed(0)} mm (>20 mm / Staghorn) → PCNL Utama!`;
      planBody = "Baku emas batu &gt;20 mm atau <strong>Staghorn</strong> adalah <strong>PCNL (Percutaneous Nephrolithotomy)</strong> + terapi infeksi bila struvit.";
    }

    return { mm, mode, info, planTitle, planBody, tone };
  }

  function buildNefroStoneSvg(r) {
    const rScale = 4 + (r.mm / 22) * 11;
    const isSepsis = r.mode === "sepsis";
    const stoneColor = r.mode === "uric" ? "rgba(217,119,6,0.45)" : r.mode === "struvite" ? "#92400e" : "var(--text-primary)";
    const curX = 258 + ((r.mm - 2) / 20) * 194;

    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Simulator Anatomi Batu Saluran Kemih">
        <!-- Left Panel: Kidney -> Ureter -> Bladder Anatomy -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Anatomi Traktus &amp; Lokasi Batu</text>

        <!-- Kidney Outline + Hydronephrosis Dilation -->
        <ellipse cx="92" cy="84" rx="34" ry="42" fill="${isSepsis || r.mm >= 10 ? "rgba(225,29,72,0.16)" : "var(--bg-surface)"}" stroke="${isSepsis ? "var(--accent-coral)" : "var(--viz-blue)"}" stroke-width="2" />
        <!-- Dilated Renal Pelvis -->
        <path d="M 88 76 C 118 76, 134 92, 134 114 L 134 166" fill="none" stroke="${isSepsis ? "var(--accent-coral)" : "var(--viz-blue)"}" stroke-width="${r.mm >= 8 || isSepsis ? "12" : "7"}" stroke-linecap="round" opacity="0.45" />
        <!-- Bladder bottom -->
        <ellipse cx="134" cy="180" rx="44" ry="20" fill="rgba(56,189,248,0.16)" stroke="var(--viz-blue)" stroke-width="1.6" />
        <text x="134" y="184" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">Vesika Urinaria</text>

        <!-- Dynamic Stone Sized by r.mm -->
        <circle cx="${r.mm > 15 ? 92 : 134}" cy="${r.mm > 15 ? 84 : 134}" r="${rScale}" fill="${stoneColor}" stroke="${isSepsis ? "var(--accent-coral)" : "var(--accent-secondary)"}" stroke-width="2.2" />
        <text x="178" y="88" font-size="8.5" font-weight="800" fill="${isSepsis ? "var(--accent-coral)" : "var(--text-primary)"}">${r.mm.toFixed(0)} mm</text>
        <text x="178" y="102" font-size="7.2" font-weight="700" fill="var(--text-muted)">${r.mm > 15 ? "Kaliks / Staghorn" : "Ureter"}</text>
        ${isSepsis ? `<text x="176" y="128" font-size="7.6" font-weight="800" fill="var(--accent-coral)">DJ Stent / PCN!</text>` : ""}

        <!-- Right Panel: Size Gauge + Diagnosis Rules -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Algoritma Ukuran Batu (2–22 mm)</text>

        <rect x="258" y="44" width="38" height="22" rx="3" fill="var(--accent-primary-soft)" />
        <rect x="296" y="44" width="52" height="22" fill="var(--accent-primary-soft)" />
        <rect x="348" y="44" width="76" height="22" fill="var(--accent-secondary-soft)" />
        <rect x="424" y="44" width="28" height="22" rx="3" fill="var(--accent-coral-soft)" />
        <text x="277" y="58" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-primary)">&lt;5</text>
        <text x="322" y="58" text-anchor="middle" font-size="7" font-weight="800" fill="var(--viz-blue)">5–10</text>
        <text x="386" y="58" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">10–20</text>
        <text x="438" y="58" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">&gt;20</text>
        <line x1="${curX}" y1="38" x2="${curX}" y2="72" stroke="var(--text-primary)" stroke-width="2.4" />
        <text x="356" y="85" text-anchor="middle" font-size="8.8" font-weight="800" fill="${isSepsis ? "var(--accent-coral)" : "var(--text-primary)"}">${isSepsis ? "OVERRULE: CITO DEKOMPRESI!" : `${r.mm.toFixed(0)} mm — ${r.info.label}`}</text>

        <rect x="256" y="98" width="200" height="114" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="266" y="115" font-size="7.4" font-weight="800" fill="var(--accent-primary)">• Baku Emas: CT Non-Kontras</text>
        <text x="266" y="131" font-size="7.4" font-weight="700" fill="var(--text-primary)">• &lt;5 mm: Spontan + Hidrasi</text>
        <text x="266" y="147" font-size="7.4" font-weight="700" fill="var(--text-primary)">• 5–10 mm: Tamsulosin 0,4 mg</text>
        <text x="266" y="163" font-size="7.4" font-weight="700" fill="var(--text-primary)">• 10–20 mm: URS / ESWL | &gt;20: PCNL</text>
        <text x="266" y="179" font-size="7.4" font-weight="800" fill="var(--accent-coral)">• Batu + Infeksi = DJ Stent / PCN!</text>
        <text x="266" y="196" font-size="7" font-weight="700" fill="var(--text-muted)">• Awas Diuresis Pasca-Obstruksi (&gt;200/j)</text>
      </svg>
    `;
  }

  function renderNefroStoneWidget() {
    const mm = clampNum(nefroVizState.stoneMm, 2, 22, 7);
    const mode = NEFRO_STONE_MODES[nefroVizState.stoneMode] ? nefroVizState.stoneMode : "ca_ox";
    const r = evaluateNefroStone(mm, mode);

    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-stone-tabs", Object.entries(NEFRO_STONE_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroStoneViz(null, '${k}', true)`
        })), mode)}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "nefroStone",
      label: "Simulasi Diameter Batu Saluran Kemih (2–22 mm):",
      pillText: `${mm.toFixed(0)} mm`,
      min: 2, max: 22, step: 0.5, value: mm,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3) 0% 40%, rgba(217,119,6,0.35) 40% 90%, rgba(225,29,72,0.42) 90% 100%)",
      oninput: "window.InternaApp.updateNefroStoneViz(this.value, null, true)",
      presets: [
        { label: "4 mm (<5 Spontan)", val: 4, active: mm < 5 },
        { label: "7 mm (MET)", val: 7, active: mm >= 5 && mm <= 10 },
        { label: "14 mm (URS)", val: 14, active: mm > 10 && mm <= 20 },
        { label: "22 mm (PCNL)", val: 22, active: mm > 20 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nefroStone",
      title: "Simulator Ukuran Batu Saluran Kemih, Modalitas Urologi & Dekompresi Cito",
      tag: "Nefrolitiasis • KKI 4",
      controlsTop,
      svgHtml: buildNefroStoneSvg(r),
      controlsBottom,
      info: { tone: r.tone, rKey: `stone-${mm.toFixed(0)}-${mode}`, title: r.planTitle, c1Label: "Karakteristik Jenis Batu", c1Body: r.info.char, c2Label: "Strategi Tatalaksana", c2Body: r.planBody },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan anjurkan <strong>diet rendah kalsium</strong> pada batu kalsium oksalat (justru menaikkan absorpsi oksalat di usus!); pertahankan kalsium diet normal &amp; batasi natrium/protein hewani!</p>`
    });
  }

  function updateNefroStoneViz(mmIn, modeIn, fromUser = true) {
    if (fromUser && mmIn !== null && mmIn !== undefined) cancelAllVizAnimations();
    if (mmIn !== null && mmIn !== undefined) nefroVizState.stoneMm = clampNum(mmIn, 2, 22, 7);
    if (NEFRO_STONE_MODES[modeIn]) nefroVizState.stoneMode = modeIn;

    const r = evaluateNefroStone(nefroVizState.stoneMm, nefroVizState.stoneMode);
    syncVizPresets("viz-nefro-stone-tabs", Object.keys(NEFRO_STONE_MODES).map((k) => k === r.mode));
    syncSliderAndPill("viz-nefroStone-slider", "viz-nefroStone-pill", r.mm, `${r.mm.toFixed(0)} mm`);
    syncVizPresets("viz-nefroStone-presets", [r.mm < 5, r.mm >= 5 && r.mm <= 10, r.mm > 10 && r.mm <= 20, r.mm > 20]);
    swapVizSvgFrame("viz-nefroStone-frame", buildNefroStoneSvg(r));
    updateVizReadout("viz-nefroStone-readout", r.tone, formatVizReadoutHtml(r.planTitle, "Karakteristik Jenis Batu", r.info.char, "Strategi Tatalaksana", r.planBody, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan restriksi kalsium diet pada batu Ca oksalat; waspadai urosepsis obstruktif (dekompresi cito)!</p>`), `stone-${r.mm.toFixed(0)}-${r.mode}`);
  }

  // --- N19. Diagram SKR Tipe 1-5 & Stepper Terapi SHR (nefro-8-1) ---
  const NEFRO_SKR_DATA = {
    crs1: {
      label: "SKR Tipe 1 (ADHF→AKI)", tone: "danger",
      flow: "Jantung Akut (ADHF) → Kongesti Vena Renal & Perfusi↓ → AKI Akut",
      mech: "Gagal jantung akut meningkatkan tekanan vena sentral &amp; vena renalis + aktivasi RAAS/simpatis memicu AKI (~25–40% ADHF).",
      tx: "Tetap optimalkan <strong>diuretik loop IV (Furosemid)</strong>! <strong>Kenaikan ringan sCr saat dekongesti adekuat BUKAN alasan menyetop diuretik dini</strong> bila kongesti masih ada."
    },
    crs2: {
      label: "SKR Tipe 2 (CHF→PGK)", tone: "warning",
      flow: "Gagal Jantung Kronik (CHF) → Hipoperfusi + Remodeling → PGK",
      mech: "Hipoperfusi ginjal kronik &amp; aktivasi neurohormonal jangka panjang mempercepat fibrosis nefron menjadi PGK progresif.",
      tx: "<strong>GDMT 4 Pilar Gagal Jantung</strong> (ACEi/ARNI, Beta-Bloker, MRA, <strong>SGLT2i</strong>) melindungi jantung &amp; ginjal bersamaan."
    },
    crs3: {
      label: "SKR Tipe 3 (AKI→Jantung)", tone: "danger",
      flow: "AKI Berat → Overload + Asidosis + Hiperkalemia → ADHF / Aritmia",
      mech: "Cedera ginjal akut menyebabkan retensi cairan akut (edema paru), asidemia menekan kontraktilitas, dan hiperkalemia memicu aritmia fatal.",
      tx: "Atasi etiologi AKI + loop diuretik + segera <strong>dialisis cito</strong> bila overload/elektrolit refrakter."
    },
    crs4: {
      label: "SKR Tipe 4 (PGK→Jantung)", tone: "warning",
      flow: "PGK Kronik → Beban Vol/FGF-23 + Kalsifikasi → LVH / PJK",
      mech: "Hipertensi volume, anemia renal, FGF-23 tinggi, dan hiperparatiroid sekunder mempercepat hipertrofi ventrikel kiri &amp; kematian kardiovaskular.",
      tx: "Kontrol TD, anemia, CKD-MBD, statin, serta optimalkan ACEi/ARB dan SGLT2i."
    },
    crs5: {
      label: "SKR Tipe 5 (Sistemik)", tone: "info",
      flow: "Penyakit Sistemik (Sepsis / Amiloid / SLE) → Merusak Keduanya",
      mech: "Proses sistemik akut/kronik (sepsis berat, amiloidosis, SLE, diabetes, sirosis) mencederai jantung dan ginjal secara simultan.",
      tx: "Terapi sumber penyakit sistemik utamanya (antibiotik + resusitasi sepsis, kemoterapi amiloid, atau imunosupresi SLE)."
    },
    hrs: {
      label: "SHR-GGA (Terlipressin)", tone: "danger",
      flow: "Sirosis + Asites → Vasodilatasi Splanknik → Vasokonstriksi Ginjal",
      mech: "<strong>Kriteria ICA-AKI (Bab 296):</strong> Sirosis + asites + kenaikan sCr &ge;0,3 mg/dL/48j (&ge;50%), <strong>TIDAK membaik setelah stop diuretik &amp; tantangan Albumin 48 jam</strong>, tanpa syok/nefrotoksin/hematuria!",
      tx: "Langkah terapi: <strong>1) Stop diuretik &amp; beta-bloker, 2) Tantangan Albumin 1 g/kg/hari (maks 100g) x 2 hari</strong>, 3) Mulai <strong>Terlipressin IV</strong> (atau Norepinefrin) + Albumin; definitif: <strong>Transplantasi Hati</strong>!"
    }
  };

  function buildNefroCardiorenalSvg(modeKey) {
    const d = NEFRO_SKR_DATA[modeKey] || NEFRO_SKR_DATA.crs1;
    const isHrs = modeKey === "hrs";
    return `
      <svg viewBox="0 0 480 236" class="viz-svg" role="img" aria-label="Diagram Sindrom Kardiorenal dan Hepatorenal">
        <!-- Left Panel: Two-Organ Crosstalk -->
        <rect x="14" y="12" width="222" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="125" y="29" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">${isHrs ? "Patofisiologi SHR (Sirosis → Ginjal)" : "Interaksi Dua Arah Jantung ↔ Ginjal"}</text>

        ${isHrs ? `
          <rect x="30" y="46" width="190" height="44" rx="8" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1.8" />
          <text x="125" y="64" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--text-primary)">Sirosis Hati + Hipertensi Porta</text>
          <text x="125" y="80" text-anchor="middle" font-size="7.4" font-weight="700" fill="var(--accent-secondary)">Vasodilatasi Arteri Splanknik Ekstrem!</text>

          <line x1="125" y1="90" x2="125" y2="112" stroke="var(--accent-coral)" stroke-width="2.4" />
          <polygon points="120,108 130,108 125,116" fill="var(--accent-coral)" />

          <rect x="30" y="116" width="190" height="48" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
          <text x="125" y="135" text-anchor="middle" font-size="8.4" font-weight="800" fill="var(--accent-coral)">Vasokonstriksi Arteri Renal Hebat</text>
          <text x="125" y="151" text-anchor="middle" font-size="7.3" font-weight="700" fill="var(--text-primary)">Gagal Ginjal Fungsional (Parenkim Utuh)</text>
        ` : `
          <rect x="34" y="46" width="84" height="58" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
          <text x="76" y="70" text-anchor="middle" font-size="8.6" font-weight="800" fill="var(--accent-coral)">JANTUNG</text>
          <text x="76" y="86" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-secondary)">CO / CVP</text>

          <rect x="134" y="46" width="84" height="58" rx="8" fill="var(--accent-primary-soft)" stroke="var(--viz-blue)" stroke-width="1.8" />
          <text x="176" y="70" text-anchor="middle" font-size="8.6" font-weight="800" fill="var(--viz-blue)">GINJAL</text>
          <text x="176" y="86" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-secondary)">eLFG / Vol</text>

          <line x1="118" y1="64" x2="132" y2="64" stroke="${modeKey === "crs1" || modeKey === "crs2" ? "var(--accent-coral)" : "var(--text-muted)"}" stroke-width="${modeKey === "crs1" || modeKey === "crs2" ? "3" : "1.4"}" />
          <line x1="132" y1="86" x2="118" y2="86" stroke="${modeKey === "crs3" || modeKey === "crs4" ? "var(--viz-blue)" : "var(--text-muted)"}" stroke-width="${modeKey === "crs3" || modeKey === "crs4" ? "3" : "1.4"}" />

          <rect x="34" y="118" width="184" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-strong)" />
          <text x="126" y="136" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--accent-primary)">${d.label}</text>
          <text x="126" y="151" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-secondary)">${modeKey === "crs5" ? "Pemicu Sistemik: Sepsis/Amiloid/SLE" : "Kongesti Vena & Aktivasi RAAS"}</text>
        `}

        <rect x="26" y="174" width="198" height="40" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="125" y="191" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">${isHrs ? "Syarat Diagnosis SHR (Bab 296):" : "Prinsip Klinis SKR (Bab 295):"}</text>
        <text x="125" y="205" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--accent-coral)">${isHrs ? "Wajib uji Albumin 48j + stop diuretik dulu!" : "Dekongesti ADHF tidak perlu stop diuretik!"}</text>

        <!-- Right Panel: Classifier Stepper (SKR 1-5 & HRS 3-Step) -->
        <rect x="246" y="12" width="220" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.2" />
        <text x="356" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Klasifikasi SKR 1–5 &amp; Stepper SHR</text>
        ${[
          { k: "crs1", y: 40, t: "SKR 1: ADHF → AKI", s: "Tetap diuretik bila masih kongesti" },
          { k: "crs2", y: 70, t: "SKR 2: CHF → PGK", s: "GDMT 4 Pilar termasuk SGLT2i" },
          { k: "crs3", y: 100, t: "SKR 3: AKI → ADHF", s: "Dialisis cito bila overload refrakter" },
          { k: "crs4", y: 130, t: "SKR 4: PGK → PJK/LVH", s: "Kontrol TD, FGF-23 & kalsifikasi" },
          { k: "crs5", y: 160, t: "SKR 5: Sistemik → Keduanya", s: "Sepsis / Amiloidosis / SLE" },
          { k: "hrs", y: 190, t: "SHR-GGA: Terlipressin+Albumin", s: "Stop diuretik + Alb 48j → Tx Hati" }
        ].map((it) => {
          const act = it.k === modeKey;
          return `
            <g role="button" tabindex="0" onclick="window.InternaApp.updateNefroCardiorenalViz('${it.k}')" style="cursor:pointer;">
              <rect x="256" y="${it.y}" width="200" height="26" rx="9" fill="var(--bg-surface)" stroke="${act ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${act ? "2" : "1"}" />
              <text x="264" y="${it.y + 11.5}" font-size="7.6" font-weight="800" fill="${act ? "var(--accent-primary)" : "var(--text-primary)"}">${it.t}</text>
              <text x="264" y="${it.y + 21.5}" font-size="6.8" font-weight="600" fill="var(--text-muted)">${it.s}</text>
            </g>
          `;
        }).join("")}
      </svg>
    `;
  }

  function renderNefroCardiorenalWidget() {
    const mode = NEFRO_SKR_DATA[nefroVizState.skrMode] ? nefroVizState.skrMode : "crs1";
    const d = NEFRO_SKR_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-nefro-skr-tabs", Object.entries(NEFRO_SKR_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updateNefroCardiorenalViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "nefroCardiorenal",
      title: "Diagram Sindrom Kardiorenal (SKR 1–5) & Stepper Terlipressin SHR",
      tag: "SKR & SHR • KKI 4",
      controlsTop,
      svgHtml: buildNefroCardiorenalSvg(mode),
      info: { tone: d.tone, rKey: `skr-${mode}`, title: `${d.label}: ${d.flow}`, c1Label: "Mekanisme & Kriteria Diagnosis", c1Body: d.mech, c2Label: "Protokol Terapi", c2Body: d.tx },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Jangan langsung diagnosis <strong>SHR</strong> sebelum melakukan uji henti diuretik + tantangan <strong>Albumin selama 48 jam</strong>! Dan jangan stop Furosemid pada <strong>SKR Tipe 1</strong> hanya karena kreatinin naik ringan (&lt;0,3–0,5) bila edema paru/kongesti masih aktif!</p>`
    });
  }

  function updateNefroCardiorenalViz(modeIn) {
    if (NEFRO_SKR_DATA[modeIn]) nefroVizState.skrMode = modeIn;
    const mode = nefroVizState.skrMode;
    const d = NEFRO_SKR_DATA[mode];
    syncVizPresets("viz-nefro-skr-tabs", Object.keys(NEFRO_SKR_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-nefroCardiorenal-frame", buildNefroCardiorenalSvg(mode));
    updateVizReadout("viz-nefroCardiorenal-readout", d.tone, formatVizReadoutHtml(`${d.label}: ${d.flow}`, "Mekanisme & Kriteria Diagnosis", d.mech, "Protokol Terapi", d.tx, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Syarat mutlak SHR: gagal membaik setelah <strong>stop diuretik + ekspansi albumin 48 jam</strong>!</p>`), `skr-${mode}`);
  }



  function renderNefroModuleWidget(type) {
    if (type === "nefro-filtration-viz") return renderNefroFiltrationWidget();
    if (type === "nefro-hyperkalemia-viz") return renderNefroHyperKWidget();
    if (type === "nefro-abg-viz") return renderNefroAbgWidget();
    if (type === "nefro-nephrotic-histo-viz") return renderNefroNephroticHistoWidget();
    if (type === "nefro-lupus-histo-viz") return renderNefroLupusHistoWidget();
    if (type === "nefro-rpgn-histo-viz") return renderNefroRpgnHistoWidget();
    if (type === "nefro-aki-viz") return renderNefroAkiWidget();
    if (type === "nefro-sediment-viz") return renderNefroSedimentWidget();
    if (type === "nefro-ckd-viz") return renderNefroCkdWidget();
    if (type === "nefro-hyponatremia-viz") return renderNefroHyponatremiaWidget();
    if (type === "nefro-nephritic-histo-viz") return renderNefroNephriticHistoWidget();
    if (type === "nefro-htcrisis-viz") return renderNefroHtCrisisWidget();
    if (type === "nefro-hereditary-viz") return renderNefroHereditaryWidget();
    if (type === "nefro-ckdmbd-viz") return renderNefroCkdMbdWidget();
    if (type === "nefro-rta-viz") return renderNefroRtaWidget();
    if (type === "nefro-ain-viz") return renderNefroAinWidget();
    if (type === "nefro-dialysis-viz") return renderNefroDialysisWidget();
    if (type === "nefro-stone-viz") return renderNefroStoneWidget();
    if (type === "nefro-cardiorenal-viz") return renderNefroCardiorenalWidget();
    return null;
  }

  R.registerWidgetRenderer(renderNefroModuleWidget);
  R.registerMotionProvider(function (key) {
    if (key === "nefroHyperK") return { min: 4.5, max: 9.0, start: 4.6, end: 8.8, duration: 7600, get: () => nefroVizState.hyperK, apply: (v) => updateNefroHyperKViz(v, false) };
    if (key === "nefroLupus") return { min: 1, max: 6, start: 1, end: 6, duration: 7200, get: () => nefroVizState.lupusClass, apply: (v) => updateNefroLupusHistoViz(v, null, false) };
    if (key === "nefroRpgn") return { min: 0, max: 100, start: 0, end: 100, duration: 6800, get: () => nefroVizState.rpgnProg, apply: (v) => updateNefroRpgnHistoViz(null, v, false) };
    if (key === "nefroAki") return { min: 1.0, max: 3.5, start: 1.1, end: 3.4, duration: 6400, get: () => nefroVizState.akiRatio, apply: (v) => updateNefroAkiViz(v, null, false) };
    if (key === "nefroDn") return { min: 1, max: 4, start: 1, end: 4, duration: 6400, get: () => nefroVizState.dnStage, apply: (v) => updateNefroCkdViz(null, null, null, v, false) };
    if (key === "nefroNa") return { min: 0, max: 16, start: 1, end: 15, duration: 6800, get: () => nefroVizState.naTargetDelta, apply: (v) => updateNefroHyponatremiaViz(null, v, false) };
    if (key === "nefroNephritic") return { min: 0, max: 12, start: 0, end: 12, duration: 6800, get: () => nefroVizState.nephriticWeek, apply: (v) => updateNefroNephriticHistoViz(null, v, false) };
    if (key === "nefroHtCrisis") return { min: 0, max: 120, start: 0, end: 120, duration: 6800, get: () => nefroVizState.htcMin, apply: (v) => updateNefroHtCrisisViz(null, null, v, false) };
    if (key === "nefroMbd") return { min: 10, max: 90, start: 86, end: 12, duration: 6800, get: () => nefroVizState.mbdEgfr, apply: (v) => updateNefroCkdMbdViz(v, null, false) };
    if (key === "nefroStone") return { min: 2, max: 22, start: 3, end: 21, duration: 6400, get: () => nefroVizState.stoneMm, apply: (v) => updateNefroStoneViz(v, null, false) };
    return null;
  });

  Object.assign(R.handlers, { updateNefroFiltrationViz, updateNefroHyperKViz, updateNefroAbgViz, updateNefroNephroticHistoViz, updateNefroLupusHistoViz, updateNefroRpgnHistoViz, updateNefroAkiViz, updateNefroSedimentViz, updateNefroCkdViz, updateNefroHyponatremiaViz, updateNefroNephriticHistoViz, updateNefroHtCrisisViz, updateNefroHereditaryViz, updateNefroCkdMbdViz, updateNefroRtaViz, updateNefroAinViz, updateNefroDialysisViz, updateNefroStoneViz, updateNefroCardiorenalViz });
})(window);
