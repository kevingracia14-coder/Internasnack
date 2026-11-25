/* ==========================================================================
   InternaSnack — Pulmonologi & Kedokteran Kritis Interactive Widgets
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

  const pulmoVizState = {
    spiroPattern: "obstruksi",
    spiroPhase: 42,
    spiroBdr: false,
    asthmaTrack: "track1",
    asthmaStep: "step3",
    copdExac: "ge2",
    copdSymp: "high",
    copdEos: 320,
    copdFlare: false,
    hemoptysisMode: "masif_kanan",
    capSite: "icu",
    capMrsa: false,
    capPseudo: false,
    tbDiliMode: "dili",
    tbDiliDay: 8,
    tbHivCd4: "lt50",
    tbroMode: "bpalm",
    fungusMode: "ipa",
    lightPreset: "exudate_tb",
    wsdMode: "air_leak",
    wsdPhase: 35,
    mediastinumMode: "anterior",
    ildMode: "uip",
    phGroup: "g1",
    phMpap: 38,
    phPawp: 10,
    phPvr: 5.5,
    oncoMode: "spn",
    ardsSeverity: "severe",
    ardsVt: 6.0,
    ardsPeep: 14,
    mvMode: "auto_peep",
    mvPhase: 50
  };


  // --- P1. Simulator Spirometri & Flow-Volume Loop (pulmo-1-1) ---
  const PULMO_SPIRO_PATTERNS = {
    normal: {
      label: "Normal",
      tone: "info",
      expPts: [[48,130],[60,72],[76,34],[112,58],[156,82],[200,106],[242,130]],
      inspPts: [[242,130],[208,162],[148,186],[92,168],[48,130]],
      fev1Fvc: "82% (>=0,70)",
      fev1Pred: "98% Pred",
      fvcPred: "99% Pred",
      tlcPred: "100% (Normal)",
      dlcoNote: "100% (Normal)",
      color: "var(--accent-primary)",
      c1Label: "Morfologi Kurva & Rasio",
      c1Body: "Puncak ekspirasi tajam diikuti garis turun linear hingga volume residu; lengkung inspirasi simetris semikular. FEV1/FVC &gt;=0,70 &amp; TLC normal.",
      c2Label: "Interpretasi DLCO",
      c2Body: "DLCO normal menyingkirkan kerusakan membran alveolokapiler bermakna. Bila dispnea persisten + spirometri/DLCO normal, pikirkan hipertensi pulmonal awal atau V/Q mismatch ringan."
    },
    obstruksi: {
      label: "Obstruksi (PPOK/Asma)",
      tone: "warning",
      expPts: [[38,130],[52,82],[68,54],[94,90],[136,112],[184,122],[232,130]],
      inspPts: [[232,130],[196,158],[140,180],[86,164],[38,130]],
      fev1Fvc: "54% (<0,70!)",
      fev1Pred: "52% (GOLD 2)",
      fvcPred: "86% Pred",
      tlcPred: "118% (Hiperinflasi)",
      dlcoNote: "Emfisema ↓ vs Asma ↑/N",
      color: "var(--accent-secondary)",
      c1Label: "Scooped Curve & Air Trapping",
      c1Body: "Kurva ekspirasi cekung ke dalam (<em>coved/scooped appearance</em>) akibat kolaps jalan napas kecil dini; RV &amp; TLC meningkat (hiperinflasi) dan FEV1/FVC &lt;0,70 (GOLD).",
      c2Label: "Pembeda Uji Bronkodilator (BDR) & DLCO",
      c2Body: "<strong>Reversibilitas positif (Asma):</strong> kenaikan FEV1 atau FVC &ge;12% DAN &ge;200 mL pasca-salbutamol. Pada PPOK Emfisema DLCO turun (&lt;80%), sedangkan pada Asma DLCO normal atau meningkat."
    },
    restriksi: {
      label: "Restriksi (ILD/Dinding)",
      tone: "info",
      expPts: [[84,130],[94,76],[106,44],[130,68],[162,94],[190,114],[214,130]],
      inspPts: [[214,130],[188,156],[150,174],[114,158],[84,130]],
      fev1Fvc: "89% (>=0,80)",
      fev1Pred: "58% Pred",
      fvcPred: "55% Pred",
      tlcPred: "54% (<80% Wajib)",
      dlcoNote: "ILD ↓ vs Ekstrapulmoner N",
      color: "var(--viz-blue)",
      c1Label: "Witch's Hat & Konfirmasi TLC",
      c1Body: "Kurva menyempit horizontal (volume kecil) dengan puncak relatif tinggi (&quot;<em>Witch's Hat</em>&quot;); rasio FEV1/FVC normal/meningkat (&ge;0,80). Diagnosis restriksi WAJIB dikonfirmasi <strong>TLC &lt;80% prediksi</strong>.",
      c2Label: "Intrapulmoner vs Ekstrapulmoner",
      c2Body: "<strong>DLCO turun:</strong> Penyakit parenkim interstisial (IPF, NSIP, sarkoidosis). <strong>DLCO normal:</strong> Obesitas masif, kifoskoliosis, miastenia gravis, efusi pleura."
    },
    upper_fixed: {
      label: "Atas Terfiksasi",
      tone: "danger",
      expPts: [[50,130],[64,96],[88,92],[146,92],[204,96],[240,130]],
      inspPts: [[240,130],[204,162],[148,166],[88,166],[64,160],[50,130]],
      fev1Fvc: "76% (Puncak Datar)",
      fev1Pred: "74% Pred",
      fvcPred: "88% Pred",
      tlcPred: "96% Normal",
      dlcoNote: "95% (Normal)",
      color: "var(--accent-coral)",
      c1Label: "Box-Shaped Double Plateau",
      c1Body: "Diameter lumen tidak berubah selama siklus napas (stenosis trakea pasca-intubasi, struma menekan cincin trakea) sehingga baik lengkung <strong>ekspirasi maupun inspirasi mendatar</strong> (kotak).",
      c2Label: "Indeks Empey",
      c2Body: "Rasio FEV1 (mL) / PEF (L/mnt) &ge;8–10 mengarahkan kuat ke obstruksi jalan napas sentral. Evaluasi bronkoskopi &amp; CT leher-toraks cito bila stridor inspiratoir."
    },
    upper_var_extr: {
      label: "Variabel Ekstratoraks",
      tone: "danger",
      expPts: [[50,130],[64,74],[78,38],[116,62],[158,86],[202,108],[240,130]],
      inspPts: [[240,130],[208,162],[160,166],[104,166],[70,160],[50,130]],
      fev1Fvc: "78% (Inspirasi Datar)",
      fev1Pred: "88% Pred",
      fvcPred: "94% Pred",
      tlcPred: "98% Normal",
      dlcoNote: "96% (Normal)",
      color: "var(--accent-coral)",
      c1Label: "Kolaps Dinamis Saat Inspirasi",
      c1Body: "Tekanan lumen ekstratorasik menjadi subatmosferik saat menarik napas &rarr; pita suara paralisis / laringomalasia tersedot ke dalam &rarr; <strong>plateau mendatar hanya pada fase INSPIRASI</strong>.",
      c2Label: "Korelasi Klinis (Stridor)",
      c2Body: "Khas menimbulkan <strong>stridor inspiratoir</strong> (paralisis pita suara bilateral pasca-tiroidektomi, disfungsi pita suara / VCD sering menyamar sebagai asma refrakter!)."
    },
    upper_var_intr: {
      label: "Variabel Intratoraks",
      tone: "warning",
      expPts: [[50,130],[66,94],[92,90],[150,90],[206,96],[240,130]],
      inspPts: [[240,130],[206,162],[148,186],[92,168],[50,130]],
      fev1Fvc: "66% (Ekspirasi Datar)",
      fev1Pred: "68% Pred",
      fvcPred: "92% Pred",
      tlcPred: "102% Normal",
      dlcoNote: "95% (Normal)",
      color: "var(--accent-secondary)",
      c1Label: "Kompresi Pleura Saat Ekspirasi",
      c1Body: "Tekanan pleura positif saat ekspirasi paksa menindih trakea intratorasik yang melemah (trakeomalasia / polikondritis) &rarr; <strong>plateau mendatar hanya pada fase EKSPIRASI</strong>.",
      c2Label: "Pembeda Ekspirasi",
      c2Body: "Inspirasi tetap berbentuk normal karena tekanan negatif pleura membantu membuka saluran napas intratorasik."
    }
  };

  function samplePolylineAt(pts, tNorm) {
    if (!pts || pts.length === 0) return [120, 130];
    if (pts.length === 1) return pts[0];
    const lens = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      const d = Math.hypot(dx, dy);
      lens.push(d);
      total += d;
    }
    let target = clampNum(tNorm, 0, 1, 0) * Math.max(0.001, total);
    for (let i = 0; i < lens.length; i++) {
      if (target <= lens[i] || i === lens.length - 1) {
        const f = lens[i] > 0 ? target / lens[i] : 0;
        return [
          pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
          pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
        ];
      }
      target -= lens[i];
    }
    return pts[pts.length - 1];
  }

  function ptsToSmoothSvgPath(pts) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  }

  function buildPulmoSpiroSvg(patternKey, phasePct, showBdr) {
    const p = PULMO_SPIRO_PATTERNS[patternKey] || PULMO_SPIRO_PATTERNS.obstruksi;
    const normPts = PULMO_SPIRO_PATTERNS.normal.expPts.concat(PULMO_SPIRO_PATTERNS.normal.inspPts.slice(1));
    const normPath = ptsToSmoothSvgPath(normPts);
    const activeLoopPts = p.expPts.concat(p.inspPts.slice(1));
    const activePath = ptsToSmoothSvgPath(activeLoopPts);
    const bdrExpPts = [[42,130],[56,76],[72,44],[106,74],[148,100],[192,116],[236,130]];
    const bdrPath = ptsToSmoothSvgPath(bdrExpPts);
    const t = clampNum(phasePct, 0, 100, 42) / 100;
    const dot = samplePolylineAt(activeLoopPts, t);
    const isExp = t <= 0.52;

    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Simulator Flow-Volume Loop Spirometri">
        <!-- Coordinate Panel -->
        <rect x="10" y="10" width="256" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <line x1="28" y1="130" x2="254" y2="130" stroke="var(--text-muted)" stroke-width="1.2" />
        <line x1="38" y1="22" x2="38" y2="206" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3 3" />
        <text x="14" y="24" font-size="8.2" font-weight="800" fill="var(--text-muted)">Eksp (+)</text>
        <text x="14" y="206" font-size="8.2" font-weight="800" fill="var(--text-muted)">Insp (-)</text>
        <text x="44" y="216" font-size="7.6" font-weight="700" fill="var(--text-muted)">TLC</text>
        <text x="236" y="216" font-size="7.6" font-weight="700" fill="var(--text-muted)">RV (Volume &rarr;)</text>

        <!-- Ghost Normal Curve -->
        <path d="${normPath}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.55" />

        <!-- Post-BDR Improvement Overlay -->
        ${showBdr ? `<path d="${bdrPath}" fill="none" stroke="var(--accent-primary)" stroke-width="2.1" stroke-dasharray="5 3" />` : ""}

        <!-- Active Flow-Volume Loop -->
        <path d="${activePath}" fill="${p.color}" fill-opacity="0.12" stroke="${p.color}" stroke-width="2.8" stroke-linejoin="round" />

        <!-- Animated Breath Cursor -->
        <circle cx="${dot[0].toFixed(1)}" cy="${dot[1].toFixed(1)}" r="5.5" fill="var(--bg-surface)" stroke="${p.color}" stroke-width="2.8" />
        <text x="144" y="24" text-anchor="middle" font-size="8.8" font-weight="800" fill="${p.color}">${isExp ? "EKSPIRASI PAKSA" : "INSPIRASI MAKSIMAL"} (${Math.round(phasePct)}%)</text>
        ${showBdr ? `<text x="144" y="36" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-primary)">Post-BD: +14% &amp; +260 mL (BDR +)</text>` : ""}

        <!-- Right Readout Matrix -->
        <rect x="276" y="10" width="194" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="373" y="28" text-anchor="middle" font-size="9.4" font-weight="800" fill="var(--text-primary)">Profil PFT &amp; Difusi (DLCO)</text>
        <rect x="286" y="38" width="174" height="32" rx="12" fill="var(--bg-surface)" stroke="${p.color}" stroke-width="1.4" />
        <text x="294" y="51" font-size="7.5" font-weight="700" fill="var(--text-muted)">FEV1 / FVC</text>
        <text x="452" y="59" text-anchor="end" font-size="9.5" font-weight="800" fill="${p.color}">${p.fev1Fvc}</text>

        <rect x="286" y="76" width="84" height="40" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="294" y="90" font-size="7.2" font-weight="700" fill="var(--text-muted)">FEV1</text>
        <text x="294" y="106" font-size="8.2" font-weight="800" fill="var(--text-primary)">${p.fev1Pred}</text>

        <rect x="376" y="76" width="84" height="40" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="384" y="90" font-size="7.2" font-weight="700" fill="var(--text-muted)">FVC</text>
        <text x="384" y="106" font-size="8.2" font-weight="800" fill="var(--text-primary)">${p.fvcPred}</text>

        <rect x="286" y="122" width="174" height="38" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="294" y="136" font-size="7.2" font-weight="700" fill="var(--text-muted)">Total Lung Capacity (TLC)</text>
        <text x="294" y="151" font-size="8.4" font-weight="800" fill="var(--text-primary)">${p.tlcPred}</text>

        <rect x="286" y="166" width="174" height="46" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="294" y="180" font-size="7.2" font-weight="700" fill="var(--text-muted)">Kapasitas Difusi (DLCO)</text>
        <text x="294" y="196" font-size="8.2" font-weight="800" fill="var(--accent-primary)">${p.dlcoNote}</text>
        <text x="294" y="207" font-size="6.8" font-weight="600" fill="var(--text-muted)">&bull; +Polisitemia / Perdarahan = DLCO &uarr;</text>
      </svg>
    `;
  }

  function renderPulmoSpiroWidget() {
    const key = PULMO_SPIRO_PATTERNS[pulmoVizState.spiroPattern] ? pulmoVizState.spiroPattern : "obstruksi";
    const phase = clampNum(pulmoVizState.spiroPhase, 0, 100, 42);
    const bdr = Boolean(pulmoVizState.spiroBdr);
    const p = PULMO_SPIRO_PATTERNS[key];

    const controlsTop = `
      <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        ${renderCardioTabRow("viz-pulmo-spiro-tabs", Object.entries(PULMO_SPIRO_PATTERNS).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoSpiroViz('${k}', null, null, true)`
        })), key)}
        <button type="button" id="viz-pulmo-spiro-bdr" class="viz-pill-btn ${bdr ? "active" : ""}" onclick="window.InternaApp.updatePulmoSpiroViz(null, null, ${!bdr}, true)">
          Uji Bronkodilator (+12% &amp; 200 mL)
        </button>
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "pulmoSpiro",
      label: "Simulasi Siklus Aliran-Volume (Ekspirasi &rarr; Inspirasi):",
      pillText: `${Math.round(phase)}%`,
      min: 0, max: 100, step: 1, value: phase,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.32), rgba(217,119,6,0.34))",
      oninput: "window.InternaApp.updatePulmoSpiroViz(null, this.value, null, true)",
      presets: [
        { label: "PEF Puncak", val: 16, active: phase >= 10 && phase <= 25 },
        { label: "Scooping Mid", val: 38, active: phase > 25 && phase <= 52 },
        { label: "Inspirasi Puncak", val: 76, active: phase >= 65 && phase <= 88 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoSpiro",
      title: "Simulator Spirometri, Flow-Volume Loop & Uji Difusi (DLCO)",
      tag: "Fisiologi Paru • KKI 4",
      controlsTop,
      svgHtml: buildPulmoSpiroSvg(key, phase, bdr),
      controlsBottom,
      info: {
        tone: p.tone,
        rKey: `spiro-${key}-${bdr}`,
        title: `Pola ${p.label} — FEV1/FVC ${p.fev1Fvc}`,
        c1Label: p.c1Label,
        c1Body: p.c1Body,
        c2Label: p.c2Label,
        c2Body: p.c2Body
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Diagnosis <strong>Restriksi murni</strong> tidak boleh hanya berdasar FVC turun pada spirometri (karena <em>air-trapping</em> PPOK berat juga menurunkan FVC = pseudorestriksi); wajib konfirmasi <strong>TLC &lt;80%</strong>! Evaluasi toleransi bedah lobektomi memakai <strong>ppoFEV1 &amp; ppoDLCO (&ge;30–40%)</strong>.</p>`
    });
  }

  function updatePulmoSpiroViz(patternIn, phaseIn, bdrIn, fromUser = true) {
    if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
    if (PULMO_SPIRO_PATTERNS[patternIn]) pulmoVizState.spiroPattern = patternIn;
    if (phaseIn !== null && phaseIn !== undefined) pulmoVizState.spiroPhase = clampNum(phaseIn, 0, 100, 42);
    if (typeof bdrIn === "boolean") pulmoVizState.spiroBdr = bdrIn;

    const key = pulmoVizState.spiroPattern;
    const phase = pulmoVizState.spiroPhase;
    const bdr = pulmoVizState.spiroBdr;
    const p = PULMO_SPIRO_PATTERNS[key];

    syncVizPresets("viz-pulmo-spiro-tabs", Object.keys(PULMO_SPIRO_PATTERNS).map((k) => k === key));
    const bdrBtn = document.getElementById("viz-pulmo-spiro-bdr");
    if (bdrBtn) bdrBtn.classList.toggle("active", bdr);
    syncSliderAndPill("viz-pulmoSpiro-slider", "viz-pulmoSpiro-pill", phase, `${Math.round(phase)}%`);
    syncVizPresets("viz-pulmoSpiro-presets", [phase >= 10 && phase <= 25, phase > 25 && phase <= 52, phase >= 65 && phase <= 88]);
    swapVizSvgFrame("viz-pulmoSpiro-frame", buildPulmoSpiroSvg(key, phase, bdr));
    updateVizReadout("viz-pulmoSpiro-readout", p.tone, formatVizReadoutHtml(
      `Pola ${p.label} — FEV1/FVC ${p.fev1Fvc}`, p.c1Label, p.c1Body, p.c2Label, p.c2Body,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Restriksi sejati wajib <strong>TLC &lt;80%</strong>; bronkodilator positif bila <strong>FEV1/FVC naik &ge;12% &amp; &ge;200 mL</strong>!</p>`
    ), `spiro-${key}-${bdr}`);
  }

  // --- P2. Simulator Eskalasi Asma GINA 2024 & Biologik (pulmo-1-2) ---
  const PULMO_GINA_DATA = {
    step12: {
      label: "Step 1–2", tone: "info", stepIdx: 1,
      track1Ctrl: "As-needed Low-Dose ICS-Formoterol (TIDAK perlu pemeliharaan harian)",
      track1Rel: "Low-Dose ICS-Formoterol PRN (Anti-inflamasi reliever / AIR)",
      track2Ctrl: "Step 1: Ambil ICS setiap SABA | Step 2: Low-Dose ICS harian reguler",
      track2Rel: "As-needed SABA (hanya jika kepatuhan ICS harian sangat baik)",
      bio: "Belum diindikasikan. Evaluasi teknik inhaler, pemicu alergen, rinosinusitis, GERD.",
      acute: "Gejala &lt;4–5 hari/minggu. Jangan berikan SABA monoterapi tanpa ICS (meningkatkan mortalitas eksaserbasi berat!)."
    },
    step3: {
      label: "Step 3", tone: "info", stepIdx: 2,
      track1Ctrl: "Low-Dose ICS-Formoterol Maintenance (1 hirup pagi-malam)",
      track1Rel: "Low-Dose ICS-Formoterol PRN (= Regimen MART Tunggal)",
      track2Ctrl: "Low-Dose ICS-LABA Harian",
      track2Rel: "As-needed SABA (atau ICS-SABA)",
      bio: "Cek kepatuhan &amp; konfirmasi diagnosis (spirometri BDR+ atau uji metakolin/PEF diurnal &gt;10%).",
      acute: "Konsep <strong>MART</strong> (Track 1) menggunakan inhaler ICS-Formoterol yang SAMA untuk kontroler &amp; pelega (menekan risiko eksaserbasi berat dibanding SABA)."
    },
    step4: {
      label: "Step 4", tone: "warning", stepIdx: 3,
      track1Ctrl: "Medium-Dose ICS-Formoterol Maintenance (MART)",
      track1Rel: "Low-Dose ICS-Formoterol PRN",
      track2Ctrl: "Medium/High-Dose ICS-LABA Harian (+ Tiotropium PRN)",
      track2Rel: "As-needed SABA / ICS-SABA",
      bio: "Pertimbangkan rujukan subspesialis asma berat + pemeriksaan endotipe T2 (Eosinofil darah, FeNO, IgE total).",
      acute: "<strong>Eksaserbasi Akut IGD:</strong> Target SpO2 <strong>93–95%</strong>, Nebulisasi SABA + Ipratropium, <strong>Steroid Sistemik</strong> (Prednison 40–50 mg/hr x 5–7 hr), <strong>MgSO4 2 g IV</strong> bila FEV1/PEF &lt;25–30% refrakter!"
    },
    step5: {
      label: "Step 5 (Biologik)", tone: "danger", stepIdx: 4,
      track1Ctrl: "Tambahkan LAMA (Tiotropium) + Fenotipik Biologik + Rujuk Subspesialis",
      track1Rel: "Low-Dose ICS-Formoterol PRN",
      track2Ctrl: "High-Dose ICS-LABA + LAMA (Triple) + Evaluasi Biologik T2-High",
      track2Rel: "As-needed SABA + hindari OCS jangka panjang",
      bio: "<strong>Omalizumab</strong> (Anti-IgE alergi), <strong>Mepolizumab / Benralizumab</strong> (Anti-IL5/5R &rarr; Eos &ge;150–300), <strong>Dupilumab</strong> (Anti-IL4R &rarr; Eos/FeNO&ge;25/OCS-dependen), <strong>Tezepelumab</strong> (Anti-TSLP &rarr; T2-high maupun Non-T2!).",
      acute: "Status Asmatikus ICU (<em>silent chest</em>, PaCO2 mulai normal/naik &ge;45 mmHg!): Pertahankan permissive hypercapnia, RR rendah, waktu ekspirasi panjang agar bebas Auto-PEEP!"
    }
  };

  function buildPulmoGinaSvg(trackKey, stepKey) {
    const d = PULMO_GINA_DATA[stepKey] || PULMO_GINA_DATA.step3;
    const isT1 = trackKey === "track1";
    const steps = ["Step 1–2", "Step 3", "Step 4", "Step 5"];
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Diagram Eskalasi GINA 2024 Asma">
        <!-- Left Ladder Steps 1-5 -->
        <rect x="10" y="10" width="214" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="117" y="27" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Tangga GINA 2024 (${isT1 ? "TRACK 1 MART" : "TRACK 2 ALT"})</text>
        ${steps.map((lbl, idx) => {
          const i = idx + 1;
          const active = i === d.stepIdx;
          const w = 104 + idx * 24;
          const y = 166 - idx * 38;
          const fill = active ? (d.tone === "danger" ? "var(--accent-coral)" : d.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)") : "var(--bg-surface-subtle)";
          return `
            <rect x="20" y="${y}" width="${w}" height="30" rx="10" fill="${fill}" fill-opacity="${active ? "0.24" : "1"}" stroke="${active ? fill : "var(--border-subtle)"}" stroke-width="${active ? "2" : "1"}" />
            <text x="28" y="${y + 19}" font-size="8.6" font-weight="800" fill="${active ? fill : "var(--text-secondary)"}">${lbl}${i === 4 ? " + Biologik" : ""}</text>
          `;
        }).join("")}
        <text x="20" y="208" font-size="7.4" font-weight="800" fill="var(--accent-coral)">Larangan Mutlak: NO SABA-Only Monotherapy!</text>

        <!-- Right Regimen & T2 Phenotype Card -->
        <rect x="234" y="10" width="236" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="352" y="27" text-anchor="middle" font-size="9.2" font-weight="800" fill="${isT1 ? "var(--accent-primary)" : "var(--accent-secondary)"}">${d.label}: ${isT1 ? "Track 1 (Diutamakan)" : "Track 2 (Alternatif)"}</text>

        <rect x="244" y="38" width="216" height="52" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="252" y="52" font-size="7.5" font-weight="800" fill="var(--accent-primary)">CONTROLLER / PEMELIHARAAN</text>
        <text x="252" y="67" font-size="7.6" font-weight="700" fill="var(--text-primary)">${(isT1 ? d.track1Ctrl : d.track2Ctrl).slice(0, 44)}</text>
        <text x="252" y="79" font-size="7.2" font-weight="600" fill="var(--text-muted)">${(isT1 ? d.track1Ctrl : d.track2Ctrl).slice(44, 88)}</text>

        <rect x="244" y="96" width="216" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="252" y="110" font-size="7.5" font-weight="800" fill="var(--viz-purple)">RELIEVER / PELEGA</text>
        <text x="252" y="126" font-size="7.6" font-weight="700" fill="var(--text-primary)">${(isT1 ? d.track1Rel : d.track2Rel).slice(0, 46)}</text>

        <rect x="244" y="146" width="216" height="60" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="252" y="160" font-size="7.6" font-weight="800" fill="var(--accent-coral)">TARGET BIOLOGIK T2 / IGD AKUT</text>
        <text x="252" y="174" font-size="7.3" font-weight="700" fill="var(--text-primary)">Eos &ge;150–300: Mepo / Benra / Dupilumab</text>
        <text x="252" y="187" font-size="7.3" font-weight="700" fill="var(--text-primary)">Alergi IgE&uarr;: Omalizumab | T2-Low: Tezepelumab</text>
        <text x="252" y="199" font-size="7.2" font-weight="800" fill="var(--accent-primary)">SpO2 Target Eksaserbasi: 93–95% (Bukan 88-92%!)</text>
      </svg>
    `;
  }

  function renderPulmoAsthmaGinaWidget() {
    const track = pulmoVizState.asthmaTrack === "track2" ? "track2" : "track1";
    const step = PULMO_GINA_DATA[pulmoVizState.asthmaStep] ? pulmoVizState.asthmaStep : "step3";
    const d = PULMO_GINA_DATA[step];
    const isT1 = track === "track1";
    const controlsTop = `
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        ${renderCardioTabRow("viz-pulmo-gina-tracks", [
          { key: "track1", label: "Track 1: ICS-Formoterol MART", onclick: "window.InternaApp.updatePulmoAsthmaGinaViz('track1', null)" },
          { key: "track2", label: "Track 2: ICS + SABA PRN", onclick: "window.InternaApp.updatePulmoAsthmaGinaViz('track2', null)" }
        ], track)}
        ${renderCardioTabRow("viz-pulmo-gina-steps", Object.entries(PULMO_GINA_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoAsthmaGinaViz(null, '${k}')`
        })), step)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoGina",
      title: "Simulator Eskalasi Asma GINA 2024 (Track 1 MART vs Track 2) & Biologik Step 5",
      tag: "Asma Bronkial • KKI 4",
      controlsTop,
      svgHtml: buildPulmoGinaSvg(track, step),
      info: {
        tone: d.tone,
        rKey: `gina-${track}-${step}`,
        title: `${d.label} (${isT1 ? "Track 1 MART" : "Track 2"}): Kontroler & Pelega`,
        c1Label: "Regimen Pilihan GINA 2024",
        c1Body: `<strong>Controller:</strong> ${isT1 ? d.track1Ctrl : d.track2Ctrl}.<br/><strong>Reliever:</strong> ${isT1 ? d.track1Rel : d.track2Rel}.`,
        c2Label: "Biologik T2-High & Kegawatan Akut",
        c2Body: `${d.bio}<br/><strong>Catatan Klinis:</strong> ${d.acute}`
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Hanya <strong>Formoterol</strong> (onset cepat + durasi panjang) yang dipakai untuk <strong>MART</strong> (bukan Salmeterol!). Jangan lupa: pada eksaserbasi asma akut, kenaikan <strong>PaCO2 mulai normal/tinggi (&ge;40–45 mmHg)</strong> adalah tanda kelelahan otot napas &amp; ancaman henti napas!</p>`
    });
  }

  function updatePulmoAsthmaGinaViz(trackIn, stepIn) {
    if (trackIn === "track1" || trackIn === "track2") pulmoVizState.asthmaTrack = trackIn;
    if (PULMO_GINA_DATA[stepIn]) pulmoVizState.asthmaStep = stepIn;
    const track = pulmoVizState.asthmaTrack;
    const step = pulmoVizState.asthmaStep;
    const d = PULMO_GINA_DATA[step];
    const isT1 = track === "track1";

    syncVizPresets("viz-pulmo-gina-tracks", [track === "track1", track === "track2"]);
    syncVizPresets("viz-pulmo-gina-steps", Object.keys(PULMO_GINA_DATA).map((k) => k === step));
    swapVizSvgFrame("viz-pulmoGina-frame", buildPulmoGinaSvg(track, step));
    updateVizReadout("viz-pulmoGina-readout", d.tone, formatVizReadoutHtml(
      `${d.label} (${isT1 ? "Track 1 MART" : "Track 2"}): Kontroler & Pelega`,
      "Regimen Pilihan GINA 2024", `<strong>Controller:</strong> ${isT1 ? d.track1Ctrl : d.track2Ctrl}.<br/><strong>Reliever:</strong> ${isT1 ? d.track1Rel : d.track2Rel}.`,
      "Biologik T2-High & Kegawatan Akut", `${d.bio}<br/><strong>Catatan Klinis:</strong> ${d.acute}`,
      `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> Hanya <strong>ICS-Formoterol</strong> untuk MART! PaCO2 mulai &ge;45 pada asma akut = ancaman kelelahan otot napas &amp; intubasi.</p>`
    ), `gina-${track}-${step}`);
  }

  // --- P3. Matriks GOLD ABE 2024 & Titrasi Eosinofil (pulmo-1-3) ---
  function evaluatePulmoCopd(exacKey, sympKey, eosRaw, flare) {
    const eos = Math.round(clampNum(eosRaw, 0, 500, 320));
    const isE = exacKey === "ge2";
    const isHighSymp = sympKey === "high";
    const group = isE ? "E" : (isHighSymp ? "B" : "A");

    let regimen = "1 Bronkodilator (LABA atau LAMA)";
    let icsAdvice = "ICS TIDAK diperlukan untuk terapi awal Grup A.";
    let tone = "info";

    if (group === "B") {
      tone = "warning";
      regimen = "LABA + LAMA Dual Bronchodilator";
      icsAdvice = "Grup B memprioritaskan LABA+LAMA untuk sesak maksimal tanpa ICS rutin (ICS menambah risiko pneumonia jika tanpa eksaserbasi!).";
    } else if (group === "E") {
      tone = eos >= 300 ? "danger" : "warning";
      if (eos >= 300) {
        regimen = "Triple Therapy: LABA + LAMA + ICS (Single Inhaler)";
        icsAdvice = `Eosinofil darah <strong>${eos} sel/&mu;L (&ge;300)</strong>: Indikasi KUAT penambahan <strong>ICS</strong> (studi IMPACT &amp; ETHOS terbukti menurunkan eksaserbasi dan <strong>mortalitas</strong>!).`;
      } else if (eos >= 100) {
        regimen = "LABA + LAMA (+ pertimbangkan ICS bila eksaserbasi berulang)";
        icsAdvice = `Eosinofil <strong>${eos} sel/&mu;L (100–299)</strong>: Mulai LABA+LAMA; tambahkan ICS bila riwayat &ge;2 eksaserbasi sedang atau &ge;1 ranap.`;
      } else {
        regimen = "LABA + LAMA SAJA (Hindari ICS!)";
        icsAdvice = `Eosinofil <strong>${eos} sel/&mu;L (&lt;100)</strong>: Respon ICS minimal dan meningkatkan risiko pneumonia! Pertimbangkan <strong>Roflumilast</strong> (FEV1 &lt;50% + bronkitis kronik) atau <strong>Azitromisin</strong> (eks-perokok).`;
      }
    }

    if (flare) {
      tone = "danger";
      regimen = "Eksaserbasi Akut: Target SpO2 88–92% + SABA/SAMA + Steroid 5 Hr";
    }
    return { group, eos, isE, isHighSymp, flare, regimen, icsAdvice, tone };
  }

  function buildPulmoCopdSvg(r) {
    const eosX = 276 + (r.eos / 500) * 180;
    return `
      <svg viewBox="0 0 480 230" class="viz-svg" role="img" aria-label="Matriks GOLD ABE PPOK 2024">
        <!-- Left GOLD ABE 2024 Matrix -->
        <rect x="10" y="10" width="244" height="210" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="132" y="27" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Matriks GOLD ABE 2024 (Spirometri FEV1/FVC &lt;0,70)</text>

        <!-- Group E (Top Merged) -->
        <rect x="20" y="38" width="224" height="62" rx="8" fill="${r.group === "E" ? "rgba(225,29,72,0.18)" : "var(--bg-surface-subtle)"}" stroke="${r.group === "E" ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${r.group === "E" ? "2.4" : "1.2"}" />
        <text x="132" y="57" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">GRUP E (&ge;2 Eksaserbasi Sedang atau &ge;1 Ranap)</text>
        <text x="132" y="75" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-primary)">LABA + LAMA | Tambahkan ICS jika Eos &ge;300</text>
        <text x="132" y="89" text-anchor="middle" font-size="7.2" font-weight="600" fill="var(--text-muted)">(Penggabungan bekas C &amp; D)</text>

        <!-- Group A (Bottom Left) -->
        <rect x="20" y="108" width="108" height="72" rx="8" fill="${r.group === "A" ? "rgba(0,122,255,0.18)" : "var(--bg-surface-subtle)"}" stroke="${r.group === "A" ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${r.group === "A" ? "2.4" : "1.2"}" />
        <text x="74" y="128" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-primary)">GRUP A</text>
        <text x="74" y="144" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-primary)">mMRC 0–1, CAT &lt;10</text>
        <text x="74" y="159" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--text-muted)">1 Bronkodilator</text>

        <!-- Group B (Bottom Right) -->
        <rect x="136" y="108" width="108" height="72" rx="8" fill="${r.group === "B" ? "rgba(217,119,6,0.2)" : "var(--bg-surface-subtle)"}" stroke="${r.group === "B" ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${r.group === "B" ? "2.4" : "1.2"}" />
        <text x="190" y="128" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-secondary)">GRUP B</text>
        <text x="190" y="144" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-primary)">mMRC &ge;2 / CAT &ge;10</text>
        <text x="190" y="159" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-secondary)">LABA + LAMA</text>

        <text x="132" y="202" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-primary)">Penurun Mortalitas: Stop Rokok + LTOT + Triple + LVRS</text>

        <!-- Right Eosinophil Gauge & Exacerbation -->
        <rect x="264" y="10" width="206" height="210" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="367" y="27" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Titrasi Eosinofil Darah (ICS?)</text>

        <rect x="276" y="42" width="36" height="18" rx="3" fill="var(--accent-coral-soft)" />
        <rect x="312" y="42" width="72" height="18" fill="var(--accent-secondary-soft)" />
        <rect x="384" y="42" width="72" height="18" rx="3" fill="var(--accent-primary-soft)" />
        <line x1="${eosX.toFixed(1)}" y1="36" x2="${eosX.toFixed(1)}" y2="66" stroke="var(--text-primary)" stroke-width="2.4" />
        <text x="294" y="74" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">&lt;100 (No)</text>
        <text x="348" y="74" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">100–299</text>
        <text x="420" y="74" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-primary)">&ge;300 (ICS+)</text>
        <text x="367" y="92" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">Eosinofil: ${r.eos} sel/&mu;L</text>

        <rect x="276" y="104" width="180" height="106" rx="8" fill="var(--bg-surface)" stroke="${r.flare ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${r.flare ? "1.8" : "1"}" />
        <text x="284" y="120" font-size="7.8" font-weight="800" fill="${r.flare ? "var(--accent-coral)" : "var(--accent-primary)"}">${r.flare ? "MODE EKSASERBASI AKUT (IGD)" : "REKOMENDASI TERAPI STABIL"}</text>
        <text x="284" y="135" font-size="7.3" font-weight="800" fill="var(--text-primary)">&bull; SpO2 Target Akut: 88–92% (Venturi)</text>
        <text x="284" y="150" font-size="7.3" font-weight="700" fill="var(--text-primary)">&bull; Steroid Sistemik: 40 mg/hr x 5 hari</text>
        <text x="284" y="165" font-size="7.3" font-weight="700" fill="var(--text-primary)">&bull; Abx bila &ge;2 Kriteria Anthonisen / Sputum Purulen</text>
        <text x="284" y="180" font-size="7.3" font-weight="800" fill="var(--accent-coral)">&bull; BiPAP (NIV) WAJIB bila pH &lt;7,35 &amp; PaCO2 &ge;45</text>
        <text x="284" y="196" font-size="7" font-weight="700" fill="var(--text-muted)">&bull; LTOT (&ge;15j/hr): PaO2 &le;55 atau &le;59 + Kor Pulm</text>
      </svg>
    `;
  }

  function renderPulmoCopdGoldWidget() {
    const r = evaluatePulmoCopd(pulmoVizState.copdExac, pulmoVizState.copdSymp, pulmoVizState.copdEos, pulmoVizState.copdFlare);
    const controlsTop = `
      <div class="mb-2.5 flex flex-wrap items-center gap-2">
        ${renderCardioTabRow("viz-pulmo-copd-exac", [
          { key: "lt2", label: "0–1 Eksaserbasi (Tanpa Ranap)", onclick: "window.InternaApp.updatePulmoCopdGoldViz('lt2', null, null, null)" },
          { key: "ge2", label: ">=2 Sedang / >=1 Ranap (E)", onclick: "window.InternaApp.updatePulmoCopdGoldViz('ge2', null, null, null)" }
        ], r.isE ? "ge2" : "lt2")}
        ${renderCardioTabRow("viz-pulmo-copd-symp", [
          { key: "low", label: "mMRC <2 & CAT <10", onclick: "window.InternaApp.updatePulmoCopdGoldViz(null, 'low', null, null)" },
          { key: "high", label: "mMRC >=2 / CAT >=10", onclick: "window.InternaApp.updatePulmoCopdGoldViz(null, 'high', null, null)" }
        ], r.isHighSymp ? "high" : "low")}
        <button type="button" id="viz-pulmo-copd-flare" class="viz-pill-btn ${r.flare ? "active" : ""}" onclick="window.InternaApp.updatePulmoCopdGoldViz(null, null, null, ${!r.flare})">
          Eksaserbasi Akut (IGD/BiPAP)
        </button>
      </div>
    `;
    const controlsBottom = renderPulmoSliderOnly({
      key: "pulmoCopdEos",
      label: "Titrasi Eosinofil Darah Tepi (sel/uL):",
      pillText: `${r.eos} sel/uL`,
      min: 0, max: 500, step: 10, value: r.eos,
      trackBg: "linear-gradient(90deg, rgba(225,29,72,0.32) 0% 20%, rgba(217,119,6,0.34) 20% 60%, rgba(0,122,255,0.38) 60% 100%)",
      oninput: "window.InternaApp.updatePulmoCopdGoldViz(null, null, this.value, null)",
      presets: [
        { label: "60 (<100 Hindari ICS)", onclick: "window.InternaApp.updatePulmoCopdGoldViz(null, null, 60, null)", active: r.eos < 100 },
        { label: "180 (100–299)", onclick: "window.InternaApp.updatePulmoCopdGoldViz(null, null, 180, null)", active: r.eos >= 100 && r.eos < 300 },
        { label: "350 (>=300 ICS+)", onclick: "window.InternaApp.updatePulmoCopdGoldViz(null, null, 350, null)", active: r.eos >= 300 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoCopd",
      title: "Matriks GOLD ABE 2024, Titrasi Eosinofil ICS & PPOK Eksaserbasi Akut",
      tag: "PPOK Stabil & Akut • KKI 4",
      controlsTop,
      svgHtml: buildPulmoCopdSvg(r),
      controlsBottom,
      info: {
        tone: r.tone,
        rKey: `copd-${r.group}-${r.eos >= 300 ? "hi" : r.eos >= 100 ? "mid" : "lo"}-${r.flare}`,
        title: `GOLD Grup ${r.group} — ${r.regimen}`,
        c1Label: "Evaluasi ICS Berbasis Eosinofil",
        c1Body: r.icsAdvice,
        c2Label: "Eksaserbasi Akut & Penurun Mortalitas",
        c2Body: r.flare
          ? "Beri oksigen terkontrol target <strong>SpO2 88–92%</strong> (mencegah hilangnya <em>hypoxic drive</em> &amp; V/Q mismatch hiperkapnia!). Pasang <strong>BiPAP (NIV)</strong> jika pH &lt;7,35 + PaCO2 &ge;45 mmHg persisten."
          : "4 Intervensi Penurun Mortalitas PPOK: <strong>1) Berhenti Merokok, 2) LTOT (&ge;15 j/hr jika PaO2 &le;55), 3) Triple Therapy (Eos tinggi), 4) LVRS emfisema lobus atas</strong>."
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Diagnosis PPOK WAJIB <strong>FEV1/FVC pasca-bronkodilator &lt;0,70</strong>. Dan jangan berikan oksigen aliran tinggi (NRM 15 Lpm) pada PPOK retensi CO2 jika cukup Venturi target 88–92%!</p>`
    });
  }

  function updatePulmoCopdGoldViz(exacIn, sympIn, eosIn, flareIn) {
    if (exacIn === "lt2" || exacIn === "ge2") pulmoVizState.copdExac = exacIn;
    if (sympIn === "low" || sympIn === "high") pulmoVizState.copdSymp = sympIn;
    if (eosIn !== null && eosIn !== undefined) pulmoVizState.copdEos = clampNum(eosIn, 0, 500, 320);
    if (typeof flareIn === "boolean") pulmoVizState.copdFlare = flareIn;

    const r = evaluatePulmoCopd(pulmoVizState.copdExac, pulmoVizState.copdSymp, pulmoVizState.copdEos, pulmoVizState.copdFlare);
    syncVizPresets("viz-pulmo-copd-exac", [!r.isE, r.isE]);
    syncVizPresets("viz-pulmo-copd-symp", [!r.isHighSymp, r.isHighSymp]);
    const fBtn = document.getElementById("viz-pulmo-copd-flare");
    if (fBtn) fBtn.classList.toggle("active", r.flare);
    syncSliderAndPill("viz-pulmoCopdEos-slider", "viz-pulmoCopdEos-pill", r.eos, `${r.eos} sel/uL`);
    syncVizPresets("viz-pulmoCopdEos-presets", [r.eos < 100, r.eos >= 100 && r.eos < 300, r.eos >= 300]);
    swapVizSvgFrame("viz-pulmoCopd-frame", buildPulmoCopdSvg(r));
    updateVizReadout("viz-pulmoCopd-readout", r.tone, formatVizReadoutHtml(
      `GOLD Grup ${r.group} — ${r.regimen}`,
      "Evaluasi ICS Berbasis Eosinofil", r.icsAdvice,
      "Eksaserbasi Akut & Penurun Mortalitas", r.flare ? "Target <strong>SpO2 88–92%</strong> + SABA/SAMA + Prednison 40 mg 5 hari + <strong>BiPAP</strong> bila asidosis respiratorik pH &lt;7,35!" : "Stop Rokok, LTOT (&ge;15 j/hr PaO2 &le;55), Triple Therapy &amp; LVRS terbukti menurunkan mortalitas.",
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Syarat mutlak PPOK: <strong>FEV1/FVC pasca-BD &lt;0,70</strong>!</p>`
    ), `copd-${r.group}-${r.eos >= 300 ? "hi" : r.eos >= 100 ? "mid" : "lo"}-${r.flare}`);
  }

  // --- P4. Algoritma Hemoptisis Masif & Bronkiektasis (pulmo-1-4) ---
  const PULMO_HEMO_MODES = {
    masif_kanan: {
      label: "Masif Kanan", tone: "danger", side: "right",
      title: "Hemoptisis Masif Paru Kanan (>600 mL/24j) — Posisi Lateral Kanan Bawah!",
      c1: "Segera posisikan pasien <strong>Lateral Dekubitus KANAN (Sisi Sakit di Bawah!)</strong> untuk mencegah darah membanjiri paru kiri yang sehat (penyebab kematian utama adalah <em>asfiksia</em>, bukan syok hemoragik!).",
      c2: "Pasang <strong>ETT lumen besar (&ge;8,0 mm)</strong> (atau intubasi selektif kiri / <em>bronchial blocker</em>), lalu lakukan <strong>Bronchial Artery Embolization (BAE)</strong> — 90% sumber perdarahan berasal dari arteri bronkialis bertekanan sistemik!"
    },
    masif_kiri: {
      label: "Masif Kiri", tone: "danger", side: "left",
      title: "Hemoptisis Masif Paru Kiri — Posisi Lateral Kiri Bawah!",
      c1: "Baringkan <strong>Lateral Dekubitus KIRI (Paru Kiri Sakit di Bawah!)</strong> sehingga gravitasi menahan bekuan darah di bronkus kiri dan menjaga pertukaran gas paru kanan tetap bersih.",
      c2: "Kontrol tekanan darah, koreksi koagulopati, siapkan bronkoskopi kaku (isap bekuan besar) + rujuk <strong>BAE cito</strong> oleh radiologi intervensi."
    },
    stabil: {
      label: "Bronkiektasis Stabil", tone: "warning", side: "both",
      title: "Bronkiektasis: Siklus Ganas Cole, HRCT Signet-Ring & Eradikasi Pseudomonas",
      c1: "Baku emas diagnosis adalah <strong>HRCT Toraks</strong>: tampak tanda <em>Signet-Ring Sign</em> (rasio bronkus/arteri &gt;1) dan <em>Tram-Track Lines</em> akibat kurangnya <em>tapering</em> bronkus.",
      c2: "Terapi inti: <strong>Fisioterapi klirens saluran napas (mukolitik + PEP)</strong> harian + vaksinasi. Bila kolonisasi/eksaserbasi <em>Pseudomonas aeruginosa</em>: eradikasi siprofloksasin/inhalesi antibiotik; hindari ICS rutin kecuali asma/ABPA."
    },
    ddx: {
      label: "Hemoptisis vs Hematemesis", tone: "info", side: "ddx",
      title: "Pembeda Klasik Bedside: Hemoptisis (Paru) vs Hematemesis (GI)",
      c1: "<strong>Hemoptisis:</strong> Batuk berdahak, darah merah terang <strong>berbusa (frothy)</strong>, <strong>pH basa/alkali</strong>, mengandung <strong>makrofag berisi hemosiderin</strong>.",
      c2: "<strong>Hematemesis:</strong> Mual/muntah, darah merah gelap <strong>bubuk kopi (coffee-ground)</strong> bercampur sisa makanan, <strong>pH asam</strong>, sering riwayat sirosis atau NSAID/ulkus peptikum."
    }
  };

  function buildPulmoHemoptysisSvg(modeKey) {
    const d = PULMO_HEMO_MODES[modeKey] || PULMO_HEMO_MODES.masif_kanan;
    const isRight = d.side === "right";
    const isLeft = d.side === "left";
    const isDdx = d.side === "ddx";
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Algoritma Hemoptisis Masif dan Bronkiektasis">
        <rect x="10" y="10" width="224" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        ${isDdx ? `
          <text x="122" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-primary)">Pembeda Darah Batuk vs Muntah</text>
          <rect x="20" y="42" width="204" height="76" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
          <text x="30" y="59" font-size="8.4" font-weight="800" fill="var(--accent-coral)">HEMOPTISIS (DIBATUKKAN)</text>
          <text x="30" y="75" font-size="7.4" font-weight="700" fill="var(--text-primary)">&bull; Merah Terang &amp; Berbusa (Frothy)</text>
          <text x="30" y="89" font-size="7.4" font-weight="700" fill="var(--text-primary)">&bull; pH Basa/Alkali + Hemosiderin (+)</text>
          <text x="30" y="103" font-size="7.2" font-weight="600" fill="var(--text-muted)">&bull; Terbanyak: TB, Bronkiektasis, Ca Paru</text>

          <rect x="20" y="128" width="204" height="76" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="30" y="145" font-size="8.4" font-weight="800" fill="var(--accent-secondary)">HEMATEMESIS (DIMUNTAHKAN)</text>
          <text x="30" y="161" font-size="7.4" font-weight="700" fill="var(--text-primary)">&bull; Merah Gelap / Coffee-Ground</text>
          <text x="30" y="175" font-size="7.4" font-weight="700" fill="var(--text-primary)">&bull; pH Asam + Bercampur Makanan</text>
          <text x="30" y="189" font-size="7.2" font-weight="600" fill="var(--text-muted)">&bull; Pencetus Mual, Sirosis / Melena</text>
        ` : `
          <text x="122" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">${d.side === "both" ? "HRCT Bronkiektasis (Signet-Ring)" : `Posisi Dekubitus: Sisi ${isRight ? "KANAN" : "KIRI"} Bawah`}</text>
          <!-- Trachea & Bronchi Schematic -->
          <rect x="115" y="42" width="14" height="44" rx="4" fill="var(--bg-surface-subtle)" stroke="var(--text-muted)" />
          <path d="M122,84 L82,116 M122,84 L162,116" stroke="var(--text-muted)" stroke-width="5" stroke-linecap="round" />
          <!-- Right Lung (Left viewer side) & Left Lung -->
          <ellipse cx="76" cy="136" rx="40" ry="52" fill="${isRight ? "rgba(225,29,72,0.22)" : "rgba(0,122,255,0.14)"}" stroke="${isRight ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2" />
          <ellipse cx="168" cy="136" rx="40" ry="52" fill="${isLeft ? "rgba(225,29,72,0.22)" : "rgba(0,122,255,0.14)"}" stroke="${isLeft ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2" />
          <text x="76" y="130" text-anchor="middle" font-size="8" font-weight="800" fill="${isRight ? "var(--accent-coral)" : "var(--accent-primary)"}">Paru Kanan</text>
          <text x="76" y="144" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-primary)">${isRight ? "PERDARAHAN (BAWAH)" : d.side === "both" ? "Signet-Ring >1" : "SEHAT (ATAS)"}</text>
          <text x="168" y="130" text-anchor="middle" font-size="8" font-weight="800" fill="${isLeft ? "var(--accent-coral)" : "var(--accent-primary)"}">Paru Kiri</text>
          <text x="168" y="144" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-primary)">${isLeft ? "PERDARAHAN (BAWAH)" : d.side === "both" ? "Tram-Track" : "SEHAT (ATAS)"}</text>
          <text x="122" y="204" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-coral)">${d.side === "both" ? "Siklus Ganas Cole: Inflamasi ↔ Klirens Mucus↓" : "Gravitasi cegah darah tumpah ke paru sehat!"}</text>
        `}

        <!-- Right Sequence Card -->
        <rect x="244" y="10" width="226" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Protokol ABC &amp; Intervensi Definitif</text>
        <rect x="254" y="42" width="206" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="57" font-size="7.5" font-weight="800" fill="var(--accent-coral)">1. PROTEKSI JALAN NAPAS (ASFIKSIA = PEMBUNUH)</text>
        <text x="262" y="73" font-size="7.2" font-weight="700" fill="var(--text-primary)">ETT Besar &ge;8,0 mm / Lateral Dekubitus Bawah</text>

        <rect x="254" y="92" width="206" height="54" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="107" font-size="7.5" font-weight="800" fill="var(--accent-primary)">2. LOKALISASI &amp; EMBOLISASI BAE (90%)</text>
        <text x="262" y="122" font-size="7.2" font-weight="700" fill="var(--text-primary)">Bronkoskopi / CT Angiografi &rarr; Embolisasi</text>
        <text x="262" y="135" font-size="7.2" font-weight="700" fill="var(--text-primary)">Arteri Bronkialis (Tekanan Sistemik Aorta!)</text>

        <rect x="254" y="152" width="206" height="54" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="167" font-size="7.5" font-weight="800" fill="var(--accent-secondary)">3. REID MORFOLOGI BRONKIEKTASIS</text>
        <text x="262" y="182" font-size="7.1" font-weight="700" fill="var(--text-primary)">Silindris (ringan) &rarr; Varikosa &rarr; Kistik/Sakular</text>
        <text x="262" y="195" font-size="7.1" font-weight="600" fill="var(--text-muted)">Kistik = destruksi paling berat, batuk purulen masif</text>
      </svg>
    `;
  }

  function renderPulmoHemoptysisWidget() {
    const mode = PULMO_HEMO_MODES[pulmoVizState.hemoptysisMode] ? pulmoVizState.hemoptysisMode : "masif_kanan";
    const d = PULMO_HEMO_MODES[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-hemo-tabs", Object.entries(PULMO_HEMO_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoHemoptysisViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoHemo",
      title: "Algoritma Emergensi Hemoptisis Masif, Lateralisasi Paru & Bronkiektasis",
      tag: "Bronkiektasis • KKI 3B/4",
      controlsTop,
      svgHtml: buildPulmoHemoptysisSvg(mode),
      info: {
        tone: d.tone,
        rKey: `hemo-${mode}`,
        title: d.title,
        c1Label: "Prinsip Anatomi & Diagnostik",
        c1Body: d.c1,
        c2Label: "Tindakan Kunci",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Jangan membaringkan paru yang berdarah di posisi atas (darah akan menetes lewat karina ke paru sehat!); selalu posisikan <strong>paru sakit di bawah</strong>! Kalsifikasi massa <strong>asam sitrat? Bukan</strong>—batuk kronik dengan foto toraks normal paling sering: UACS (post-nasal drip), Asma, GERD, atau ACEi!</p>`
    });
  }

  function updatePulmoHemoptysisViz(modeIn) {
    if (PULMO_HEMO_MODES[modeIn]) pulmoVizState.hemoptysisMode = modeIn;
    const mode = pulmoVizState.hemoptysisMode;
    const d = PULMO_HEMO_MODES[mode];
    syncVizPresets("viz-pulmo-hemo-tabs", Object.keys(PULMO_HEMO_MODES).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoHemo-frame", buildPulmoHemoptysisSvg(mode));
    updateVizReadout("viz-pulmoHemo-readout", d.tone, formatVizReadoutHtml(
      d.title, "Prinsip Anatomi & Diagnostik", d.c1, "Tindakan Kunci", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada hemoptisis masif, penyebab kematian akut adalah <strong>asfiksia</strong>; selalu posisikan <strong>sisi perdarahan di BAWAH</strong> dan targetkan <strong>Arteri Bronkialis (BAE)</strong>!</p>`
    ), `hemo-${mode}`);
  }

  // --- P5. Peta Keputusan CAP (ATS/IDSA) & HAP/VAP (pulmo-2-1) ---
  function evaluatePulmoCap(siteKey, mrsa, pseudo) {
    const site = ["out_healthy", "out_comorbid", "ward", "icu", "hap_vap"].includes(siteKey) ? siteKey : "icu";
    let title = "";
    let reg = "";
    let note = "";
    let tone = "info";

    if (site === "out_healthy") {
      title = "CAP Rawat Jalan Tanpa Komorbid (<65 th, Tanpa Abx 3 Bln)";
      reg = "Amoksisilin 3x1 g PO ATAU Doksisiklin 2x100 mg PO ATAU Makrolid (Azitromisin bila resistensi pneumokokus lokal <25%).";
      note = "Fokus patogen: S. pneumoniae & atipik (Mycoplasma, Chlamydophila). Tidak perlu fluorokuinolon respirasi lini pertama!";
    } else if (site === "out_comorbid") {
      tone = "warning";
      title = "CAP Rawat Jalan + Komorbid (Jantung/Paru/Hati/Ginjal/DM)";
      reg = "Kombinasi Beta-Laktam (Amoksisilin-Klavulanat 2x875 mg atau Sefuroksim) + Makrolid/Doksisiklin ATAU Monoterapi Fluorokuinolon Respirasi (Levofloksasin 750 mg / Moksifloksasin 400 mg).";
      note = "Kuinolon respirasi berisiko efek samping aorta/tendon & menunda deteksi TB paru aktif ('masking TB'!).";
    } else if (site === "ward") {
      tone = "warning";
      title = "CAP Rawat Inap Bangsal Biasa (Non-ICU)";
      reg = "Beta-Laktam IV (Seftriakson 1-2 g atau Ampisilin-Sulbaktam) + Makrolid (Azitromisin 500 mg) ATAU Monoterapi Levofloksasin 750 mg IV/PO.";
      note = "Cek kultur darah & sputum HANYA jika berat atau berisiko MRSA/Pseudomonas. Pertimbangkan switch IV-ke-oral setelah stabil 48–72 jam.";
    } else if (site === "icu") {
      tone = "danger";
      title = "CAP Berat / ICU (1 Kriteria Mayor ATS/IDSA ATAU >=3 Minor)";
      reg = "WAJIB Kombinasi Beta-Laktam IV + Makrolid (atau Beta-Laktam + Fluorokuinolon Respirasi) — JANGAN monoterapi kuinolon di ICU!";
      note = "Adjuvan Kortikosteroid (Hidrokortison 200 mg/hr atau Metilprednisolon) dipertimbangkan pada CAP berat disertai syok septik refrakter / CRP sangat tinggi (studi CAPE COD).";
    } else {
      tone = "danger";
      title = "HAP (Ranap >=48 Jam) & VAP (Intubasi >=48 Jam)";
      reg = "Beta-Laktam Anti-Pseudomonas (Piperasilin-Tazobaktam / Sefepim / Meropenem) + Cakupan MRSA (Vankomisin atau Linezolid) bila risiko MRSA (+).";
      note = "VAP dengan faktor risiko tinggi MDR / syok septik memerlukan <strong>Dual Anti-Pseudomonas</strong> (2 kelas berbeda: mis. Sefepim + Amikasin/Levofloksasin) selama empiris awal, lalu de-eskalasi berdasarkan kultur!";
    }
    if ((site === "icu" || site === "ward" || site === "hap_vap") && mrsa) {
      reg += " + TAMBAH Vankomisin 15–20 mg/kg IV (atau Linezolid 600 mg IV/12j).";
    }
    if ((site === "icu" || site === "ward" || site === "hap_vap") && pseudo) {
      reg += " + Ganti ke Anti-Pseudomonas (Piperasilin-Tazobaktam / Sefepim / Meropenem / Imipenem).";
    }
    return { site, mrsa, pseudo, title, reg, note, tone };
  }

  function buildPulmoCapSvg(r) {
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Stratifikasi ATS/IDSA CAP dan HAP VAP">
        <rect x="10" y="10" width="224" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">Kriteria ICU ATS/IDSA (1 Mayor / &ge;3 Minor)</text>
        <rect x="20" y="38" width="204" height="44" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="28" y="53" font-size="7.8" font-weight="800" fill="var(--accent-coral)">KRITERIA MAYOR (Cukup 1 &rarr; ICU):</text>
        <text x="28" y="67" font-size="7.2" font-weight="700" fill="var(--text-primary)">1) Syok Septik butuh Vasopresor</text>
        <text x="28" y="78" font-size="7.2" font-weight="700" fill="var(--text-primary)">2) Gagal Napas butuh Ventilator Mekanik</text>

        <rect x="20" y="88" width="204" height="86" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="28" y="102" font-size="7.8" font-weight="800" fill="var(--accent-secondary)">KRITERIA MINOR (Butuh &ge;3 &rarr; ICU):</text>
        <text x="28" y="116" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; RR &ge;30x/mnt | PaO2/FiO2 &le;250</text>
        <text x="28" y="129" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; Infiltrat Multilobar | Konfusi/Disorientasi</text>
        <text x="28" y="142" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; Uremia (BUN &ge;20 mg/dL) | Leukopenia &lt;4000</text>
        <text x="28" y="155" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; Trombosit &lt;100rb | Suhu &lt;36&deg;C</text>
        <text x="28" y="168" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; Hipotensi butuh Resusitasi Cairan Agresif</text>

        <text x="122" y="196" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-primary)">HCAP DIHAPUS (IDSA 2019): Nilai Risiko Individu!</text>

        <rect x="244" y="10" width="226" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Regimen Empiris Terpilih</text>
        <rect x="254" y="38" width="206" height="62" rx="12" fill="var(--bg-surface)" stroke="${r.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="1.5" />
        <text x="262" y="53" font-size="7.6" font-weight="800" fill="${r.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">${r.title.slice(0, 34)}</text>
        <text x="262" y="69" font-size="7.2" font-weight="700" fill="var(--text-primary)">${r.reg.slice(0, 40)}</text>
        <text x="262" y="82" font-size="7.1" font-weight="700" fill="var(--text-primary)">${r.reg.slice(40, 82)}</text>
        <text x="262" y="94" font-size="6.9" font-weight="600" fill="var(--text-muted)">${r.reg.slice(82, 126)}</text>

        <rect x="254" y="106" width="206" height="50" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="262" y="120" font-size="7.6" font-weight="800" fill="var(--accent-coral)">JEBAKAN BOARD: DAPTOMISIN!</text>
        <text x="262" y="134" font-size="7.1" font-weight="700" fill="var(--text-primary)">JANGAN pakai Daptomisin untuk Pneumonia!</text>
        <text x="262" y="147" font-size="6.9" font-weight="600" fill="var(--text-muted)">(Diinaktivasi surfaktan alveoli &rarr; pilih Vanko/Linezolid)</text>

        <rect x="254" y="162" width="206" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="177" font-size="7.4" font-weight="800" fill="var(--accent-secondary)">FLAG FAKTOR RISIKO MDR:</text>
        <text x="262" y="192" font-size="7.1" font-weight="700" fill="var(--text-primary)">MRSA: ${r.mrsa ? "AKTIF (Vanko/Lzd)" : "Non-Aktif"} | Pseudo: ${r.pseudo ? "AKTIF (Anti-PsA)" : "Non-Aktif"}</text>
      </svg>
    `;
  }

  function renderPulmoCapStrataWidget() {
    const r = evaluatePulmoCap(pulmoVizState.capSite, pulmoVizState.capMrsa, pulmoVizState.capPseudo);
    const controlsTop = `
      <div class="mb-2 flex flex-wrap items-center gap-2">
        ${renderCardioTabRow("viz-pulmo-cap-sites", [
          { key: "out_healthy", label: "Rajal Sehat", onclick: "window.InternaApp.updatePulmoCapStrataViz('out_healthy', null, null)" },
          { key: "out_comorbid", label: "Rajal Komorbid", onclick: "window.InternaApp.updatePulmoCapStrataViz('out_comorbid', null, null)" },
          { key: "ward", label: "Ranap Bangsal", onclick: "window.InternaApp.updatePulmoCapStrataViz('ward', null, null)" },
          { key: "icu", label: "CAP ICU (ATS)", onclick: "window.InternaApp.updatePulmoCapStrataViz('icu', null, null)" },
          { key: "hap_vap", label: "HAP / VAP", onclick: "window.InternaApp.updatePulmoCapStrataViz('hap_vap', null, null)" }
        ], r.site)}
        <button type="button" id="viz-pulmo-cap-mrsa" class="viz-pill-btn ${r.mrsa ? "active" : ""}" onclick="window.InternaApp.updatePulmoCapStrataViz(null, ${!r.mrsa}, null)">
          + Risiko MRSA
        </button>
        <button type="button" id="viz-pulmo-cap-pseudo" class="viz-pill-btn ${r.pseudo ? "active" : ""}" onclick="window.InternaApp.updatePulmoCapStrataViz(null, null, ${!r.pseudo})">
          + Risiko Pseudomonas
        </button>
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoCap",
      title: "Peta Keputusan CAP (ATS/IDSA), Kriteria Mayor-Minor ICU & Cakupan HAP/VAP",
      tag: "Pneumonia • KKI 4",
      controlsTop,
      svgHtml: buildPulmoCapSvg(r),
      info: {
        tone: r.tone,
        rKey: `cap-${r.site}-${r.mrsa}-${r.pseudo}`,
        title: r.title,
        c1Label: "Pilihan Antibiotik Empiris",
        c1Body: r.reg,
        c2Label: "Konteks Patogen & Prinsip Stewardship",
        c2Body: r.note
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Istilah <strong>HCAP sudah dihapus</strong> (IDSA/ATS). Kapan gunakan Prokalsitonin (PCT)? Untuk membantu <strong>de-eskalasi / penghentian antibiotik</strong>, BUKAN untuk menunda dosis pertama antibiotik pada pneumonia berat/sepsis!</p>`
    });
  }

  function updatePulmoCapStrataViz(siteIn, mrsaIn, pseudoIn) {
    if (siteIn) pulmoVizState.capSite = siteIn;
    if (typeof mrsaIn === "boolean") pulmoVizState.capMrsa = mrsaIn;
    if (typeof pseudoIn === "boolean") pulmoVizState.capPseudo = pseudoIn;

    const r = evaluatePulmoCap(pulmoVizState.capSite, pulmoVizState.capMrsa, pulmoVizState.capPseudo);
    syncVizPresets("viz-pulmo-cap-sites", ["out_healthy", "out_comorbid", "ward", "icu", "hap_vap"].map((k) => k === r.site));
    const mBtn = document.getElementById("viz-pulmo-cap-mrsa");
    if (mBtn) mBtn.classList.toggle("active", r.mrsa);
    const pBtn = document.getElementById("viz-pulmo-cap-pseudo");
    if (pBtn) pBtn.classList.toggle("active", r.pseudo);
    swapVizSvgFrame("viz-pulmoCap-frame", buildPulmoCapSvg(r));
    updateVizReadout("viz-pulmoCap-readout", r.tone, formatVizReadoutHtml(
      r.title, "Pilihan Antibiotik Empiris", r.reg, "Konteks Patogen & Prinsip Stewardship", r.note,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Jangan beri Daptomisin pada pneumonia! Ingat 'masking TB' bila monoterapi levofloksasin sembarangan.</p>`
    ), `cap-${r.site}-${r.mrsa}-${r.pseudo}`);
  }

  // --- P6. Timeline DILI OAT & TB-HIV IRIS (pulmo-2-2) ---
  function evaluatePulmoTbDili(modeKey, dayRaw, hivCd4) {
    const mode = modeKey === "hiv" ? "hiv" : "dili";
    const day = Math.round(clampNum(dayRaw, 0, 28, 8));
    const cd4 = ["lt50", "ge50", "meningitis"].includes(hivCd4) ? hivCd4 : "lt50";

    if (mode === "hiv") {
      const cfg = cd4 === "lt50"
        ? { tone: "danger", pill: "CD4 <50 sel/uL", title: "TB Paru + HIV (CD4 <50 sel/uL): OAT Dulu, ARV DALAM 2 MINGGU!", c1: "Mulai <strong>OAT dulu</strong> (mencegah IRIS masif); mulai <strong>ARV dalam 2 minggu</strong> setelah OAT karena mortalitas HIV sangat tinggi pada CD4 &lt;50.", c2: "Waspada <strong>Sindrom IRIS Paradoksikal</strong> (demam + KGB membesar); <strong>JANGAN stop OAT/ARV</strong>! Berikan Prednison untuk meredakan inflamasi IRIS dan pantau interaksi Rifampisin vs DTG (naikkan Dolutegravir 2x50 mg) atau EFV." }
        : cd4 === "ge50"
        ? { tone: "warning", pill: "CD4 >=50 sel/uL", title: "TB Paru + HIV (CD4 >=50 sel/uL): OAT Dulu, ARV dalam <=8 Minggu", c1: "Mulai OAT penuh selama 2 minggu awal; ARV dapat dimulai antara minggu ke-2 hingga maksimal <strong>8 minggu</strong> setelah inisiasi OAT.", c2: "Kotrimoksazol profilaksis rutin untuk semua ko-infeksi TB-HIV tanpa memandang CD4!" }
        : { tone: "danger", pill: "TB Meningitis", title: "PENGECUALIAN KHUSUS: TB Meningitis + HIV!", c1: "<strong>TUNDA ARV selama 4–8 minggu</strong> setelah memulai OAT + Deksametason (bahkan bila CD4 rendah!), karena IRIS intrakranial cepat menimbulkan edema otak &amp; kematian fatal!", c2: "Selalu mulai OAT + Kortikosteroid IV lebih dahulu pada meningitis TB sebelum rekonstitusi imun oleh ARV." };
      return { mode, day, cd4, ...cfg };
    }

    let phaseTitle = "";
    let phaseTone = "info";
    let drugs = "R + H + Z + E";
    let altRatio = 1.0;
    let c1 = "";
    let c2 = "";
    if (day < 4) {
      phaseTone = "info";
      phaseTitle = `Hari ke-${day}: Awal OAT (Baseline Normal / Kenaikan Ringan)`;
      drugs = "R + H + Z + E";
      altRatio = 1.0 + day * 0.4;
      c1 = "<strong>Ambang Hentikan RHZ (PDPI / ATS):</strong> SGOT/SGPT &ge;3x ULN DISERTAI gejala (mual, muntah, nyeri kuadran kanan atas, ikterik), ATAU &ge;5x ULN meski tanpa gejala, ATAU Bilirubin &ge;2 mg/dL.";
      c2 = "Edukasi pasien agar tidak menghentikan OAT sendiri sebelum melapor, tetapi segera periksa LFT bila muncul ikterik atau muntah persisten.";
    } else if (day <= 11) {
      phaseTone = "danger";
      phaseTitle = `Hari ke-${day}: FASE DILI AKUT — STOP R, H, Z SEGERA!`;
      drugs = "Streptomisin + Etambutol (Jembatan Aman Hati)";
      altRatio = day <= 7 ? 5.8 - (day - 4) * 0.3 : 4.2 - (day - 7) * 0.55;
      c1 = "STOP semua obat hepatotoksik (<strong>Rifampisin, Isoniazid, Pirazinamid</strong>). Pada TB berat/ekstensif/meningitis/BTA+, pasang rejimen jembatan non-hepatotoksik: <strong>Streptomisin + Etambutol (S + E)</strong> (+ Levofloksasin bila perlu).";
      c2 = "Tunggu hingga klinis membaik dan transaminase turun <strong>&lt;2x batas atas normal</strong> (biasanya hari ke-10 sampai ke-14) sebelum memulai rechallenge satu per satu!";
    } else if (day <= 16) {
      phaseTone = "warning";
      phaseTitle = `Hari ke-${day}: RECHALLENGE LANGKAH 1 — Introduksi RIFAMPISIN Dulu`;
      drugs = "Rifampisin (+ S + E) | H & Z masih tunda";
      altRatio = 1.6;
      c1 = "Saat SGOT/SGPT &lt;2x ULN, perkenalkan <strong>Rifampisin</strong> terlebih dahulu selama 3–7 hari sambil memantau LFT (R adalah tulang punggung sterilisasi TB dan paling jarang memicu kegagalan hati fulminan dibanding Z).";
      c2 = "Jika SGOT/SGPT tetap stabil setelah dosis penuh Rifampisin, lanjut ke Langkah 2.";
    } else if (day <= 22) {
      phaseTone = "warning";
      phaseTitle = `Hari ke-${day}: RECHALLENGE LANGKAH 2 — Tambah ISONIAZID`;
      drugs = "R + H (+ E / S)";
      altRatio = 1.4;
      c1 = "Tambahkan kembali <strong>Isoniazid (H)</strong> secara bertahap atau dosis penuh dan ulangi LFT 3–7 hari kemudian.";
      c2 = "Bila SGOT/SGPT kembali melonjak pasca-H &rarr; H bersalah (hentikan permanen H, lanjutkan R+E+Fq 9–12 bln).";
    } else {
      phaseTone = "info";
      phaseTitle = `Hari ke-${day}: RECHALLENGE SELESAI — STOP PERMANEN PIRAZINAMID (Z)!`;
      drugs = "2RHE / 7RH (Total 9 Bulan Tanpa Z)";
      altRatio = 1.2;
      c1 = "<strong>Pirazinamid (Z)</strong> adalah obat paling hepatotoksik pada KDT RHZE. Setelah DILI berat akibat RHZ, <strong>Z umumnya DIHENTIKAN PERMANEN</strong> agar risiko relaps DILI fatal minimal!";
      c2 = "Karena Z tidak dipakai pada fase intensif, durasi total OAT diperpanjang menjadi <strong>9 bulan (2RHE / 7RH)</strong>.";
    }
    return { mode, day, cd4, tone: phaseTone, pill: `Hari ke-${day}`, title: phaseTitle, drugs, altRatio, c1, c2 };
  }

  function buildPulmoTbDiliSvg(r) {
    if (r.mode === "hiv") {
      return `
        <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Timeline ARV pada Koinfeksi TB-HIV">
          <rect x="10" y="10" width="460" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
          <text x="240" y="30" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-primary)">Aturan Emas Timing Inisiasi ARV pada Koinfeksi TB-HIV</text>

          <rect x="24" y="46" width="432" height="46" rx="8" fill="${r.cd4 === "lt50" ? "rgba(225,29,72,0.16)" : "var(--bg-surface-subtle)"}" stroke="${r.cd4 === "lt50" ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${r.cd4 === "lt50" ? "2.2" : "1"}" />
          <text x="36" y="64" font-size="8.4" font-weight="800" fill="var(--accent-coral)">1) CD4 &lt;50 sel/&mu;L (Imunodefisiensi Berat)</text>
          <text x="36" y="80" font-size="7.6" font-weight="700" fill="var(--text-primary)">OAT dulu &rarr; Mulai ARV DALAM 2 MINGGU! (Menurunkan mortalitas drastis; awas IRIS paradoksikal)</text>

          <rect x="24" y="102" width="432" height="46" rx="8" fill="${r.cd4 === "ge50" ? "rgba(217,119,6,0.18)" : "var(--bg-surface-subtle)"}" stroke="${r.cd4 === "ge50" ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${r.cd4 === "ge50" ? "2.2" : "1"}" />
          <text x="36" y="120" font-size="8.4" font-weight="800" fill="var(--accent-secondary)">2) CD4 &ge;50 sel/&mu;L (TB Paru Non-Meningitis)</text>
          <text x="36" y="136" font-size="7.6" font-weight="700" fill="var(--text-primary)">OAT dulu &rarr; Mulai ARV dalam &le;8 MINGGU (biasanya minggu ke-2 s.d. ke-8) + Kotrimoksazol</text>

          <rect x="24" y="158" width="432" height="50" rx="8" fill="${r.cd4 === "meningitis" ? "rgba(225,29,72,0.16)" : "var(--bg-surface-subtle)"}" stroke="${r.cd4 === "meningitis" ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${r.cd4 === "meningitis" ? "2.2" : "1"}" />
          <text x="36" y="176" font-size="8.4" font-weight="800" fill="var(--accent-coral)">3) PENGECUALIAN TB MENINGITIS + HIV (Kegawatan SSP)</text>
          <text x="36" y="192" font-size="7.6" font-weight="700" fill="var(--text-primary)">TUNDA ARV 4–8 MINGGU meski CD4 &lt;50 + Berikan Deksametason (cegah IRIS intrakranial fatal!)</text>
        </svg>
      `;
    }
    const dayX = 48 + (r.day / 28) * 392;
    const series = [
      [0, 1.0], [3, 2.8], [5, 5.9], [8, 4.6], [11, 1.7], [14, 1.6], [18, 1.4], [24, 1.2], [28, 1.2]
    ];
    const pathD = series.map((pt, i) => {
      const px = 48 + (pt[0] / 28) * 392;
      const py = 148 - (clampNum(pt[1], 0.5, 6.5, 1) / 6.5) * 98;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(" ");
    const curY = 148 - (clampNum(r.altRatio, 0.5, 6.5, 1) / 6.5) * 98;

    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Timeline Hepatotoksisitas DILI OAT">
        <rect x="10" y="10" width="460" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="240" y="28" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Kinetik SGOT/SGPT &amp; Rechallenge OAT Bertahap (0–28 Hari)</text>

        <!-- Threshold Lines -->
        <line x1="48" y1="73" x2="440" y2="73" stroke="var(--accent-coral)" stroke-width="1" stroke-dasharray="4 3" />
        <text x="444" y="76" font-size="6.8" font-weight="800" fill="var(--accent-coral)">5x</text>
        <line x1="48" y1="103" x2="440" y2="103" stroke="var(--accent-secondary)" stroke-width="1" stroke-dasharray="4 3" />
        <text x="444" y="106" font-size="6.8" font-weight="800" fill="var(--accent-secondary)">3x</text>
        <line x1="48" y1="118" x2="440" y2="118" stroke="var(--accent-primary)" stroke-width="1" stroke-dasharray="3 3" />
        <text x="444" y="121" font-size="6.8" font-weight="800" fill="var(--accent-primary)">&lt;2x</text>

        <!-- Axis & Curve -->
        <line x1="48" y1="45" x2="48" y2="148" stroke="var(--text-muted)" />
        <line x1="48" y1="148" x2="440" y2="148" stroke="var(--text-muted)" />
        <path d="${pathD}" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" stroke-linejoin="round" />

        <!-- Day Scrubber -->
        <line x1="${dayX.toFixed(1)}" y1="40" x2="${dayX.toFixed(1)}" y2="152" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="3 2" />
        <circle cx="${dayX.toFixed(1)}" cy="${curY.toFixed(1)}" r="5" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.5" />

        <!-- Bottom Active Regimen Banner -->
        <rect x="24" y="162" width="432" height="48" rx="8" fill="var(--bg-surface-subtle)" stroke="${r.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="1.4" />
        <text x="34" y="179" font-size="8" font-weight="800" fill="${r.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">Hari ke-${r.day} &bull; Paduan Aktif: ${r.drugs}</text>
        <text x="34" y="196" font-size="7.3" font-weight="700" fill="var(--text-primary)">Urutan Rechallenge: 1) STOP R-H-Z + Beri S-E &rarr; 2) Tunggu &lt;2x ULN &rarr; 3) R lalu H (Z Distop!)</text>
      </svg>
    `;
  }

  function renderPulmoTbDiliWidget() {
    const r = evaluatePulmoTbDili(pulmoVizState.tbDiliMode, pulmoVizState.tbDiliDay, pulmoVizState.tbHivCd4);
    const controlsTop = `
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        ${renderCardioTabRow("viz-pulmo-tb-modes", [
          { key: "dili", label: "Kinetik DILI & Rechallenge OAT", onclick: "window.InternaApp.updatePulmoTbDiliViz('dili', null, null, true)" },
          { key: "hiv", label: "TB-HIV (Timing ARV & IRIS)", onclick: "window.InternaApp.updatePulmoTbDiliViz('hiv', null, null, true)" }
        ], r.mode)}
        <div id="viz-pulmo-tb-cd4wrap" class="${r.mode === "hiv" ? "" : "hidden"}">
          ${renderCardioTabRow("viz-pulmo-tb-cd4s", [
            { key: "lt50", label: "CD4 <50 (<2 Mgg)", onclick: "window.InternaApp.updatePulmoTbDiliViz('hiv', null, 'lt50', true)" },
            { key: "ge50", label: "CD4 >=50 (<=8 Mgg)", onclick: "window.InternaApp.updatePulmoTbDiliViz('hiv', null, 'ge50', true)" },
            { key: "meningitis", label: "Meningitis TB (4-8 Mgg)", onclick: "window.InternaApp.updatePulmoTbDiliViz('hiv', null, 'meningitis', true)" }
          ], r.cd4)}
        </div>
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "pulmoTbDili",
      label: "Timeline Hari Penanganan DILI OAT (0–28 Hari):",
      pillText: `Hari ke-${r.day}`,
      min: 0, max: 28, step: 1, value: r.day,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3) 0% 15%, rgba(225,29,72,0.4) 15% 40%, rgba(217,119,6,0.34) 40% 80%, rgba(0,122,255,0.38) 80% 100%)",
      oninput: "window.InternaApp.updatePulmoTbDiliViz(null, this.value, null, true)",
      presets: [
        { label: "Stop RHZ (+SE)", val: 6, active: r.day >= 4 && r.day <= 11 },
        { label: "Intro Rifampisin", val: 14, active: r.day >= 12 && r.day <= 16 },
        { label: "Tambah INH", val: 19, active: r.day >= 17 && r.day <= 22 },
        { label: "9 Bln Tanpa Z", val: 25, active: r.day > 22 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoTbDili",
      title: "Timeline Hepatotoksisitas OAT (DILI), Rechallenge Bertahap & Timing ARV TB-HIV",
      tag: "TB Sensitif Obat • KKI 4",
      controlsTop,
      svgHtml: buildPulmoTbDiliSvg(r),
      controlsBottom,
      info: {
        tone: r.tone,
        rKey: `tbdili-${r.mode}-${r.mode === "hiv" ? r.cd4 : r.title}`,
        title: r.title,
        c1Label: "Protokol Klinis",
        c1Body: r.c1,
        c2Label: "Pemantauan & Keputusan",
        c2Body: r.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Obat OAT paling sering memicu DILI berat adalah <strong>Pirazinamid (Z) &gt; INH (H) &gt; Rifampisin (R)</strong>, sedangkan yang aman di PGK berat (LFT normal): <strong>R + Z tetap dosis penuh</strong> (Etambutol &amp; Streptomisin dikurangi/diperpanjang intervalnya!).</p>`
    });
  }

  function updatePulmoTbDiliViz(modeIn, dayIn, cd4In, fromUser = true) {
    if (fromUser && dayIn !== null && dayIn !== undefined) cancelAllVizAnimations();
    if (modeIn === "dili" || modeIn === "hiv") pulmoVizState.tbDiliMode = modeIn;
    if (dayIn !== null && dayIn !== undefined) pulmoVizState.tbDiliDay = clampNum(dayIn, 0, 28, 8);
    if (["lt50", "ge50", "meningitis"].includes(cd4In)) pulmoVizState.tbHivCd4 = cd4In;

    const r = evaluatePulmoTbDili(pulmoVizState.tbDiliMode, pulmoVizState.tbDiliDay, pulmoVizState.tbHivCd4);
    syncVizPresets("viz-pulmo-tb-modes", [r.mode === "dili", r.mode === "hiv"]);
    const cd4Wrap = document.getElementById("viz-pulmo-tb-cd4wrap");
    if (cd4Wrap) cd4Wrap.classList.toggle("hidden", r.mode !== "hiv");
    syncVizPresets("viz-pulmo-tb-cd4s", ["lt50", "ge50", "meningitis"].map((k) => k === r.cd4));
    syncSliderAndPill("viz-pulmoTbDili-slider", "viz-pulmoTbDili-pill", r.day, `Hari ke-${r.day}`);
    syncVizPresets("viz-pulmoTbDili-presets", [r.day >= 4 && r.day <= 11, r.day >= 12 && r.day <= 16, r.day >= 17 && r.day <= 22, r.day > 22]);
    swapVizSvgFrame("viz-pulmoTbDili-frame", buildPulmoTbDiliSvg(r));
    updateVizReadout("viz-pulmoTbDili-readout", r.tone, formatVizReadoutHtml(
      r.title, "Protokol Klinis", r.c1, "Pemantauan & Keputusan", r.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Urutan rechallenge pasca-DILI OAT: tunggu SGOT/SGPT &lt;2x ULN &rarr; intro <strong>R dulu</strong> &rarr; lalu <strong>H</strong> &rarr; hentikan <strong>Z</strong> permanen (lanjut 9 bln).</p>`
    ), `tbdili-${r.mode}-${r.mode === "hiv" ? r.cd4 : r.title}`);
  }

  // --- P7. Arsitektur TB-RO WHO (BPaLM 6 Bln, Grup A-B-C) & QTcF (pulmo-2-3) ---
  const PULMO_TBRO_MODES = {
    bpalm: {
      label: "BPaLM (6 Bln)", tone: "info", duration: "6 Bulan All-Oral",
      drugs: ["Bedaquiline (Bdq)", "Pretomanid (Pa)", "Linezolid 600mg (Lzd)", "Moxifloxacin (Mfx)"],
      ind: "<strong>Pilihan Pertama WHO &amp; Kemenkes RI</strong> untuk MDR/RR-TB (paru maupun ekstraparu non-meningitis/tulang/diseminata) tanpa resistensi Fluorokuinolon.",
      warn: "Waspada <strong>QTcF memanjang</strong> (Bdq + Mfx) dan toksisitas Linezolid (anemia/trombositopenia, neuropati perifer &amp; optik). Tidak dipakai pada ibu hamil atau usia &lt;14 tahun."
    },
    bpal: {
      label: "BPaL (Pre-XDR)", tone: "warning", duration: "6 Bulan All-Oral",
      drugs: ["Bedaquiline (Bdq)", "Pretomanid (Pa)", "Linezolid 600mg (Lzd)"],
      ind: "Indikasi utama <strong>Pre-XDR TB</strong> (MDR/RR-TB yang JUGA terbukti <strong>resisten Fluorokuinolon</strong>!). Moksifloksasin dilepas bila hasil LPA lini-2 / Xpert XDR menunjukkan resistensi FQ.",
      warn: "Bila Linezolid harus dihentikan dini karena mielosupresi berat, pastikan jumlah obat efektif tersisa masih cukup sesuai panduan BPaL modifikasi WHO."
    },
    short9: {
      label: "9 Bln All-Oral", tone: "info", duration: "9 Bulan (4–6 Bdq+6 obat / 5 Bln)",
      drugs: ["Bdq (6 Bln)", "Lfx/Mfx", "Clofazimine (Cfz)", "Ethionamide / INH-HD + E + Z"],
      ind: "Alternatif <strong>All-Oral 9 Bulan</strong> bagi pasien sensitif FQ yang belum memenuhi syarat BPaLM (mis. kehamilan memilih variasi tanpa Pretomanid bila tersedia, atau keterbatasan logistik Pa) asalkan tidak ada keterlibatan TB SSP/milier ekstensif.",
      warn: "Pastikan tidak ada paparan obat lini kedua &gt;1 bulan sebelumnya sebelum memakai paduan standar 9 bulan."
    },
    long18: {
      label: "18–20 Bln (Grup A–C)", tone: "danger", duration: "18–20 Bulan Individual",
      drugs: ["Grup A: Lfx/Mfx + Bdq + Lzd", "Grup B: Cfz + Sikloserin (Cs)", "Grup C: Delamanid/Amikasin"],
      ind: "Dipilih pada <strong>TB-XDR</strong> (resisten Rif+INH + FQ + minimal 1 obat Grup A lain yaitu Bdq/Lzd), <strong>TB Meningitis/Tulang RO</strong>, atau kegagalan BPaLM. Susun minimal <strong>4–5 obat efektif</strong> (semua 3 Grup A + min 1–2 Grup B).",
      warn: "Jika memakai <strong>Kanamisin/Amikasin (Grup C)</strong> injeksi, risiko nefrotoksisitas &amp; ototoksisitas ireversibel sangat tinggi; injeksi tidak lagi dipakai rutin pada paduan standar."
    },
    tox: {
      label: "Monitor QTcF & Lzd", tone: "danger", duration: "Keamanan Obat TB-RO",
      drugs: ["EKG Baseline, Mgg 2, Tiap Bulan", "Target QTcF <500 ms", "DPL & Visus Snellen/Ishihara"],
      ind: "<strong>QTcF &gt;500 ms</strong> (dikonfirmasi ulang EKG): Hentikan sementara obat pemanjang QT (<strong>Bdq, Mfx, Cfz, Dlm</strong>), periksa &amp; koreksi segera hipokalemia, hipomagnesemia, hipokalsemia!",
      warn: "<strong>Linezolid:</strong> Jika Hb turun drastis atau muncul gejala neuropati optik (buta warna merah-hijau/kabur) atau parestesia progresif &rarr; turunkan dosis ke 300 mg atau hentikan permanen!"
    }
  };

  function buildPulmoTbroSvg(modeKey) {
    const d = PULMO_TBRO_MODES[modeKey] || PULMO_TBRO_MODES.bpalm;
    const isTox = modeKey === "tox";
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Arsitektur Regimen TB-RO WHO">
        <rect x="10" y="10" width="224" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Prioritas Obat TB-RO WHO (Grup A–B–C)</text>
        <rect x="20" y="38" width="204" height="52" rx="12" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
        <text x="28" y="53" font-size="8" font-weight="800" fill="var(--accent-primary)">GRUP A (WAJIB DIPILIH SEMUA)</text>
        <text x="28" y="68" font-size="7.6" font-weight="700" fill="var(--text-primary)">1. Levofloksasin / Moksifloksasin</text>
        <text x="28" y="81" font-size="7.6" font-weight="700" fill="var(--text-primary)">2. Bedaquiline (Bdq) &amp; 3. Linezolid (Lzd)</text>

        <rect x="20" y="96" width="204" height="44" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="28" y="111" font-size="8" font-weight="800" fill="var(--accent-secondary)">GRUP B (TAMBAHKAN KEDUANYA/1)</text>
        <text x="28" y="128" font-size="7.6" font-weight="700" fill="var(--text-primary)">Clofazimine (Cfz) + Sikloserin (Cs)</text>

        <rect x="20" y="146" width="204" height="58" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="28" y="161" font-size="8" font-weight="800" fill="var(--text-muted)">GRUP C (BILA A+B KURANG DARI 4 OBAT)</text>
        <text x="28" y="176" font-size="7.2" font-weight="700" fill="var(--text-primary)">Delamanid, Etambutol, Pirazinamid,</text>
        <text x="28" y="190" font-size="7.2" font-weight="700" fill="var(--text-primary)">Meropenem-Clav, Amikasin, PAS, Eto</text>

        <!-- Right Active Regimen -->
        <rect x="244" y="10" width="226" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="29" text-anchor="middle" font-size="9.2" font-weight="800" fill="${d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">${d.label} &bull; ${d.duration}</text>
        ${d.drugs.map((drug, idx) => `
          <rect x="256" y="${42 + idx * 36}" width="202" height="28" rx="10" fill="var(--bg-surface)" stroke="${isTox ? "var(--accent-coral)" : "var(--accent-primary)"}" />
          <text x="266" y="${60 + idx * 36}" font-size="8" font-weight="800" fill="var(--text-primary)">&bull; ${drug}</text>
        `).join("")}
        <text x="357" y="200" text-anchor="middle" font-size="7.3" font-weight="800" fill="var(--accent-coral)">Definisi Baru WHO: XDR = Pre-XDR + Resisten Bdq / Lzd!</text>
      </svg>
    `;
  }

  function renderPulmoTbroBpalmWidget() {
    const mode = PULMO_TBRO_MODES[pulmoVizState.tbroMode] ? pulmoVizState.tbroMode : "bpalm";
    const d = PULMO_TBRO_MODES[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-tbro-tabs", Object.entries(PULMO_TBRO_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoTbroBpalmViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoTbro",
      title: "Arsitektur Paduan TB-RO WHO (BPaLM, BPaL, Grup A–B–C) & Monitor QTcF/Linezolid",
      tag: "TB Resisten Obat • KKI 4",
      controlsTop,
      svgHtml: buildPulmoTbroSvg(mode),
      info: {
        tone: d.tone,
        rKey: `tbro-${mode}`,
        title: `${d.label} (${d.duration})`,
        c1Label: "Indikasi & Pemilihan Paduan",
        c1Body: d.ind,
        c2Label: "Pemantauan Toksisitas Kritis",
        c2Body: d.warn
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Untuk <strong>Monoresistan INH (Hr-TB)</strong> sensitif Rifampisin, gunakan regimen <strong>6 bulan R-E-Z-Levofloksasin (6REZ-Lfx)</strong> tanpa perlu mengubah ke paduan MDR!</p>`
    });
  }

  function updatePulmoTbroBpalmViz(modeIn) {
    if (PULMO_TBRO_MODES[modeIn]) pulmoVizState.tbroMode = modeIn;
    const mode = pulmoVizState.tbroMode;
    const d = PULMO_TBRO_MODES[mode];
    syncVizPresets("viz-pulmo-tbro-tabs", Object.keys(PULMO_TBRO_MODES).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoTbro-frame", buildPulmoTbroSvg(mode));
    updateVizReadout("viz-pulmoTbro-readout", d.tone, formatVizReadoutHtml(
      `${d.label} (${d.duration})`, "Indikasi & Pemilihan Paduan", d.ind, "Pemantauan Toksisitas Kritis", d.warn,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Monoresistan INH (Hr-TB) diobati <strong>6(R)EZ-Lfx</strong>! Resistan Bdq/Lzd + FQ = <strong>XDR-TB</strong>.</p>`
    ), `tbro-${mode}`);
  }

  // --- P8. Atlas Radiologi-Histologi Infeksi Jamur Paru (pulmo-2-4) ---
  const PULMO_FUNGUS_DATA = {
    abpa: {
      label: "ABPA (Alergi IgE)", tone: "warning",
      ctTag: "Bronkiektasis Sentral + High-Attenuation Mucus",
      hyphaTag: "Mucus Eosinofilik & Kristal Charcot-Leyden",
      host: "Asma Persisten / Fibrosis Kistik (Hipersensitivitas Tipe I &amp; III)",
      c1: "Kriteria wajib: Asma/CF + IgE total darah <strong>&gt;1000 IU/mL</strong> (atau &gt;500 ISHAM), IgE/IgG spesifik <em>Aspergillus</em> positif, eosinofil &gt;500 + <strong>bronkiektasis sentral</strong>.",
      c2: "Terapi utama adalah <strong>Kortikosteroid Oral</strong> (Prednisolon) untuk menekan inflamasi alergik + <strong>Itrakonazol</strong> untuk menurunkan beban jamur!"
    },
    aspergilloma: {
      label: "Aspergilloma (Monod)", tone: "info",
      ctTag: "Fungus Ball Mobil di Dalam Kavitas Lama (Monod Sign)",
      hyphaTag: "Massa Hifa Septat Bercabang 45° Non-Invasif",
      host: "Imunokompeten dengan Bekas Kavitas TB / Sarkoidosis Lama",
      c1: "Massa jamur (<em>mycetoma</em>) mengisi kavitas TB lama tanpa invasi jaringan; klasik menunjukkan <strong>Monod Sign</strong> (udara sabit bergerak bebas saat posisi pasien diubah pronasi/supinasi).",
      c2: "Asimtomatik cukup observasi. Bila timbul <strong>hemoptisis berulang/masif</strong> &rarr; <strong>BAE</strong> lalu <strong>reseksi bedah</strong> jika toleransi paru memadai (antijamur sistemik penetrasi buruk ke bola jamur)."
    },
    cpa: {
      label: "CPA (Kronik >3 Bln)", tone: "warning",
      ctTag: "Kavitas Dinding Tebal + Penebalan Pleura >3 Bln",
      hyphaTag: "Koloni Aspergillus + Reaksi Granulomatosa Lokal",
      host: "Imunokompeten + Penyakit Paru Struktural (PPOK / Bekas TB)",
      c1: "Kavitas progresif &gt;3 bulan disertai demam kronik, penurunan berat badan, hemoptisis (sering dikira relaps TB BTA negatif!), IgG spesifik <em>Aspergillus</em> positif.",
      c2: "Berikan antijamur oral jangka panjang minimal 6 bulan: <strong>Itrakonazol</strong> atau <strong>Vorikonazol</strong>."
    },
    ipa: {
      label: "IPA (Halo / Air-Crescent)", tone: "danger",
      ctTag: "Halo Sign (Invasi Vaskular) &rarr; Air-Crescent (Pemulihan Neutrofil)",
      hyphaTag: "Hifa Aspergillus: Ber-SEPTUM, Sudut Tajam 45° Dikotomis",
      host: "Neutropenia Berat Berkepanjangan / Transplantasi / Steroid Tinggi",
      c1: "<strong>Halo Sign</strong> (nodul dikelilingi <em>ground-glass</em> perdarahan vaskular) muncul awal pada neutropenia berat; <strong>Air-Crescent Sign</strong> muncul saat neutrofil mulai pulih. Galaktomanan &amp; Beta-D-Glukan (+).",
      c2: "Terapi Baku Emas: <strong>Vorikonazol IV/PO</strong> (atau Isavukonazol). Waspada efek samping khas Vorikonazol: <strong>gangguan visual fotopsia sementara, halusinasi, hepatotoksisitas &amp; fotosensitivitas</strong>!"
    },
    mukor: {
      label: "Mukormikosis (Reverse Halo)", tone: "danger",
      ctTag: "Reverse Halo / Atoll Sign (GGO Sentral + Konsolidasi Cincin)",
      hyphaTag: "Hifa Mucorales: LEBAR (Ribbon), NON-SEPTAT, Sudut 90°",
      host: "Ketoasidosis Diabetikum (KAD) / Kelebihan Besi / Imunosupresi Berat",
      c1: "Menyerang pembuluh darah cepat (rino-orbito-serebral atau paru) pada pasien <strong>KAD</strong> atau besi tinggi. CT klasik memperlihatkan <strong>Reverse Halo Sign</strong>; Galaktomanan &amp; BDG negatif!",
      c2: "<strong>JEBAKAN MUTLAK: Vorikonazol TIDAK MEMPAN terhadap Mucorales!</strong> Terapi wajib: <strong>Amfoterisin B Liposomal</strong> dosis tinggi + koreksi KAD/asidosis + <strong>debridemen bedah cito</strong>!"
    }
  };

  function buildPulmoFungusSvg(modeKey) {
    const d = PULMO_FUNGUS_DATA[modeKey] || PULMO_FUNGUS_DATA.ipa;
    const isMucor = modeKey === "mukor";
    const isHalo = modeKey === "ipa";
    const isBall = modeKey === "aspergilloma";
    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Atlas Radiologi dan Histologi Infeksi Jamur Paru">
        <!-- Left CT Lesion Schematic -->
        <rect x="10" y="10" width="224" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Gambaran HRCT Toraks Khas</text>
        <circle cx="122" cy="112" r="56" fill="var(--bg-surface-subtle)" stroke="var(--text-muted)" stroke-width="1.4" />
        ${isMucor ? `
          <circle cx="122" cy="112" r="34" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="6" />
          <text x="122" y="116" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">GGO Sentral</text>
        ` : isHalo ? `
          <circle cx="122" cy="112" r="36" fill="var(--accent-secondary-soft)" />
          <circle cx="122" cy="112" r="20" fill="var(--accent-coral)" fill-opacity="0.72" />
          <text x="122" y="115" text-anchor="middle" font-size="7.2" font-weight="800" fill="white">Nodul</text>
        ` : isBall ? `
          <circle cx="122" cy="112" r="34" fill="var(--bg-surface)" stroke="var(--text-primary)" stroke-width="3" />
          <circle cx="122" cy="120" r="22" fill="var(--accent-secondary)" fill-opacity="0.75" />
          <text x="122" y="96" text-anchor="middle" font-size="6.8" font-weight="800" fill="var(--accent-primary)">Air-Crescent</text>
        ` : `
          <path d="M96,92 L122,112 L148,94 M122,112 L122,146" stroke="var(--accent-secondary)" stroke-width="7" stroke-linecap="round" opacity="0.75" />
        `}
        <text x="122" y="190" text-anchor="middle" font-size="7.6" font-weight="800" fill="${d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">${d.ctTag.slice(0, 38)}</text>
        <text x="122" y="204" text-anchor="middle" font-size="6.8" font-weight="600" fill="var(--text-muted)">${d.host.slice(0, 42)}</text>

        <!-- Right Microscopic Hyphal Angle Panel -->
        <rect x="244" y="10" width="226" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Mikroskopik Hifa (KOH / GMS)</text>
        <rect x="260" y="38" width="194" height="96" rx="8" fill="var(--bg-surface)" stroke="${isMucor ? "var(--accent-coral)" : "var(--accent-primary)"}" />
        ${isMucor ? `
          <!-- 90-degree broad ribbon non-septate Mucorales -->
          <path d="M286,88 L412,88 M338,88 L338,50 M372,88 L372,124" stroke="var(--accent-coral)" stroke-width="6.5" stroke-linecap="round" />
          <text x="357" y="122" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">Sudut 90&deg; &bull; Non-Septat Lebar</text>
        ` : `
          <!-- 45-degree septate Aspergillus -->
          <path d="M290,104 L352,80 L414,56 M334,87 L366,52 M368,74 L406,102" stroke="var(--accent-primary)" stroke-width="3.2" stroke-linecap="round" />
          <line x1="316" y1="89" x2="320" y2="98" stroke="var(--bg-surface)" stroke-width="1.8" />
          <line x1="348" y1="77" x2="352" y2="85" stroke="var(--bg-surface)" stroke-width="1.8" />
          <line x1="382" y1="64" x2="386" y2="72" stroke="var(--bg-surface)" stroke-width="1.8" />
          <text x="357" y="122" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">Sudut 45&deg; &bull; Hifa Ber-Septum</text>
        `}
        <rect x="256" y="144" width="202" height="68" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="264" y="160" font-size="7.6" font-weight="800" fill="${isMucor ? "var(--accent-coral)" : "var(--accent-primary)"}">${isMucor ? "TERAPI: AMFOTERISIN B LIPOSOMAL" : modeKey === "abpa" ? "TERAPI: STEROID + ITRAKONAZOL" : "TERAPI: VORIKONAZOL (+/BAE)"}</text>
        <text x="264" y="176" font-size="7.2" font-weight="700" fill="var(--text-primary)">${d.hyphaTag}</text>
        <text x="264" y="192" font-size="7" font-weight="700" fill="var(--accent-coral)">${isMucor ? "Vorikonazol TIDAK EFEKTIF di Mukor!" : "Waspada Fotopsia & QTc pada Vorikonazol"}</text>
      </svg>
    `;
  }

  function renderPulmoAspergillosisWidget() {
    const mode = PULMO_FUNGUS_DATA[pulmoVizState.fungusMode] ? pulmoVizState.fungusMode : "ipa";
    const d = PULMO_FUNGUS_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-fungus-tabs", Object.entries(PULMO_FUNGUS_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoFungusViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoFungus",
      title: "Atlas Radiologi-Histologi Spektrum Jamur Paru (ABPA, Aspergilloma, CPA, IPA, Mukor)",
      tag: "Mikologi Paru • KKI 3B",
      controlsTop,
      svgHtml: buildPulmoFungusSvg(mode),
      info: {
        tone: d.tone,
        rKey: `fungus-${mode}`,
        title: `${d.label} — Pejamu: ${d.host}`,
        c1Label: "Temuan CT, Biomarker & Histopatologi",
        c1Body: d.c1,
        c2Label: "Terapi Terpilih & Board Trap",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> <em>Halo sign</em> dan <em>Air-crescent sign</em> pada IPA mencerminkan fase berbeda: <strong>Halo</strong> saat neutropenia berat (infark hemoragik awal), sedangkan <strong>Air-crescent</strong> muncul ketika neutrofil kembali membersihkan jaringan nekrotik!</p>`
    });
  }

  function updatePulmoFungusViz(modeIn) {
    if (PULMO_FUNGUS_DATA[modeIn]) pulmoVizState.fungusMode = modeIn;
    const mode = pulmoVizState.fungusMode;
    const d = PULMO_FUNGUS_DATA[mode];
    syncVizPresets("viz-pulmo-fungus-tabs", Object.keys(PULMO_FUNGUS_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoFungus-frame", buildPulmoFungusSvg(mode));
    updateVizReadout("viz-pulmoFungus-readout", d.tone, formatVizReadoutHtml(
      `${d.label} — Pejamu: ${d.host}`, "Temuan CT, Biomarker & Histopatologi", d.c1, "Terapi Terpilih & Board Trap", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Aspergillus = hifa 45° septat (Vorikonazol); Mucorales pada KAD = hifa 90° non-septat (Amfoterisin B Liposomal)!</p>`
    ), `fungus-${mode}`);
  }

  // --- P9. Kalkulator Kriteria Light, SAAG Pleura & Empiema (pulmo-3-1) ---
  function calcPulmoLight(presetKey) {
    const pProtEl = document.getElementById("pulmo-light-pp");
    const sProtEl = document.getElementById("pulmo-light-ps");
    const pLdhEl = document.getElementById("pulmo-light-lp");
    const sLdhEl = document.getElementById("pulmo-light-ls");
    const ulnEl = document.getElementById("pulmo-light-uln");
    const sAlbEl = document.getElementById("pulmo-light-as");
    const pAlbEl = document.getElementById("pulmo-light-ap");
    const phEl = document.getElementById("pulmo-light-ph");
    const tgEl = document.getElementById("pulmo-light-tg");

    const PRESETS = {
      transudate_hf: { pp: 1.8, ps: 6.8, lp: 90, ls: 210, uln: 200, as: 3.6, ap: 1.2, ph: 7.42, tg: 35 },
      pseudo_diuretic: { pp: 3.6, ps: 6.9, lp: 120, ls: 195, uln: 200, as: 3.8, ap: 2.1, ph: 7.40, tg: 40 },
      exudate_tb: { pp: 5.1, ps: 6.7, lp: 380, ls: 220, uln: 200, as: 3.4, ap: 2.9, ph: 7.31, tg: 45 },
      empyema: { pp: 4.8, ps: 6.2, lp: 1450, ls: 240, uln: 200, as: 2.9, ap: 2.5, ph: 7.04, tg: 55 },
      chylo: { pp: 4.2, ps: 6.6, lp: 260, ls: 200, uln: 200, as: 3.5, ap: 2.7, ph: 7.38, tg: 280 }
    };
    if (presetKey && PRESETS[presetKey]) {
      pulmoVizState.lightPreset = presetKey;
      const pr = PRESETS[presetKey];
      if (pProtEl) pProtEl.value = pr.pp;
      if (sProtEl) sProtEl.value = pr.ps;
      if (pLdhEl) pLdhEl.value = pr.lp;
      if (sLdhEl) sLdhEl.value = pr.ls;
      if (ulnEl) ulnEl.value = pr.uln;
      if (sAlbEl) sAlbEl.value = pr.as;
      if (pAlbEl) pAlbEl.value = pr.ap;
      if (phEl) phEl.value = pr.ph;
      if (tgEl) tgEl.value = pr.tg;
    }
    syncVizPresets("viz-pulmo-light-presets", Object.keys(PRESETS).map((k) => k === pulmoVizState.lightPreset));

    const pp = clampNum(pProtEl?.value || 5.1, 0.2, 9.0, 5.1);
    const ps = clampNum(sProtEl?.value || 6.7, 2.0, 11.0, 6.7);
    const lp = clampNum(pLdhEl?.value || 380, 10, 10000, 380);
    const ls = clampNum(sLdhEl?.value || 220, 40, 5000, 220);
    const uln = clampNum(ulnEl?.value || 200, 80, 600, 200);
    const as = clampNum(sAlbEl?.value || 3.4, 1.0, 6.0, 3.4);
    const ap = clampNum(pAlbEl?.value || 2.9, 0.2, 5.5, 2.9);
    const ph = clampNum(phEl?.value || 7.31, 6.5, 7.7, 7.31);
    const tg = clampNum(tgEl?.value || 45, 5, 1200, 45);

    const protRatio = pp / ps;
    const ldhRatio = lp / ls;
    const ulnCut = (2 / 3) * uln;
    const c1 = protRatio > 0.5;
    const c2 = ldhRatio > 0.6;
    const c3 = lp > ulnCut;
    const lightCount = (c1 ? 1 : 0) + (c2 ? 1 : 0) + (c3 ? 1 : 0);
    const saagPleura = as - ap;
    const protGrad = ps - pp;

    let label = "TRANSUDAT (0 Kriteria Light)";
    let tone = "info";
    let toneColor = "var(--accent-primary)";
    let pct = 0.22;
    let extraNote = "Sesuai Gagal Jantung Kongestif (paling sering bilateral), sirosis hepatis (hepatic hydrothorax), atau sindrom nefrotik.";

    if (lightCount > 0) {
      if (saagPleura > 1.2 || protGrad > 3.1) {
        tone = "warning";
        toneColor = "var(--accent-secondary)";
        pct = 0.45;
        label = `PSEUDO-EKSUDAT DIURETIK (SAAG ${saagPleura.toFixed(1)} >1,2!)`;
        extraNote = "Light positif akibat pemekatan cairan pleura pasca-diuretik, tetapi <strong>Gradien Albumin Serum-Pleura &gt;1,2 g/dL</strong> membuktikan ini sebenarnya <strong>TRANSUDAT</strong> (cek NT-proBNP &gt;1500 pg/mL!).";
      } else {
        tone = ph < 7.20 ? "danger" : "warning";
        toneColor = ph < 7.20 ? "var(--accent-coral)" : "var(--accent-secondary)";
        pct = ph < 7.20 ? 0.92 : 0.72;
        label = `EKSUDAT SEJATI (${lightCount}/3 Light)`;
        extraNote = ph < 7.20
          ? "<strong>INDIKASI WSD CITO (pH &lt;7,20)!</strong> Efusi parapneumonik kompleks / empiema; bila multilokulasi + gagal drainase, beri intrapleural <strong>tPA + DNase (MIST2)</strong>. Ingat batas aspirasi aman &le;1.000–1.500 mL agar bebas <em>Re-Expansion Pulmonary Edema</em>!"
          : "Curigai <strong>TB Pleura (ADA &gt;40 U/L, dominan limfosit; BTA cairan sering negatif!)</strong> atau <strong>Malignansi Pleura (EPM &rarr; pleurodesis talkum / IPC bila trapped lung)</strong>.";
      }
    }
    if (tg > 110) {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      pct = 0.85;
      label += " + KILOTORAKS";
      extraNote += " <strong>Trigliserida &gt;110 mg/dL:</strong> Kilotoraks sejati (kebocoran duktus torasikus / limfoma; beda dengan <em>Pseudokilotoraks</em>: kolesterol &gt;200 mg/dL tanpa trigliserida tinggi!).";
    }

    updateCalcGauge("calc-pulmo-light", pct, label, toneColor);
    const pill = document.getElementById("pulmo-light-pill");
    if (pill) pill.textContent = label;
    const res = document.getElementById("widget-pulmo-light-result");
    if (!res) return;
    updateCalcReadoutTone(
      res,
      tone,
      `light-${label}-${ph.toFixed(2)}-${tg}`,
      `
        <p class="font-bold text-[var(--text-primary)]">${label}</p>
        <div class="viz-readout-grid mt-1">
          <p>&bull; <strong>3 Uji Light:</strong> P/S = <strong>${protRatio.toFixed(2)}</strong> (${c1 ? "&gt;0,5 +" : "-"}), LDH P/S = <strong>${ldhRatio.toFixed(2)}</strong> (${c2 ? "&gt;0,6 +" : "-"}), LDH Pleura = <strong>${lp}</strong> vs 2/3 ULN (${Math.round(ulnCut)}: ${c3 ? "+" : "-"}).</p>
          <p>&bull; <strong>SAAG Pleura &amp; WSD:</strong> Alb(S-P) = <strong>${saagPleura.toFixed(2)} g/dL</strong> | Prot(S-P) = <strong>${protGrad.toFixed(2)}</strong> | pH = <strong>${ph.toFixed(2)}</strong> | TG = <strong>${tg} mg/dL</strong>.</p>
        </div>
        <p class="mt-1">${extraNote}</p>
      `
    );
  }

  function renderPulmoLightCalcWidget() {
    const presetButtons = [
      { key: "transudate_hf", label: "Transudat HF" },
      { key: "pseudo_diuretic", label: "Pseudoeksudat Diuretik" },
      { key: "exudate_tb", label: "Eksudat TB (ADA↑)" },
      { key: "empyema", label: "Empiema (pH <7.2)" },
      { key: "chylo", label: "Kilotoraks (TG >110)" }
    ];
    return `
      <div class="viz-widget" id="viz-calc-pulmo-light-card">
        <div class="viz-header">
          <span class="viz-title">Kalkulator Kriteria Light, Koreksi SAAG Pseudoeksudat, pH Empiema &amp; Kilotoraks</span>
          <span class="viz-tag">Efusi Pleura • KKI 4</span>
        </div>
        <div class="viz-presets mb-2.5" id="viz-pulmo-light-presets">
          ${presetButtons.map((b) => `<button type="button" class="viz-pill-btn ${pulmoVizState.lightPreset === b.key ? "active" : ""}" onclick="window.InternaApp.calcPulmoLight('${b.key}')">${b.label}</button>`).join("")}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5" style="align-items:end;">
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-pp">Prot Pleura (g/dL)</label><input type="number" id="pulmo-light-pp" step="0.1" value="5.1" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-ps">Prot Serum (g/dL)</label><input type="number" id="pulmo-light-ps" step="0.1" value="6.7" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-lp">LDH Pleura (U/L)</label><input type="number" id="pulmo-light-lp" step="10" value="380" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-ls">LDH Serum (U/L)</label><input type="number" id="pulmo-light-ls" step="10" value="220" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-uln">ULN LDH (U/L)</label><input type="number" id="pulmo-light-uln" step="10" value="200" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-as">Albumin Serum</label><input type="number" id="pulmo-light-as" step="0.1" value="3.4" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-ap">Albumin Pleura</label><input type="number" id="pulmo-light-ap" step="0.1" value="2.9" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-ph">pH Pleura</label><input type="number" id="pulmo-light-ph" step="0.02" value="7.31" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-light-tg">Trigliserida Pleura</label><input type="number" id="pulmo-light-tg" step="5" value="45" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoLight()" /></div>
        </div>
        ${renderCalcGaugeSvg("calc-pulmo-light", "KLASIFIKASI PLEURA (TRANSUDAT VS EKSUDAT / EMPIEMA)", 0.72, "EKSUDAT SEJATI (3/3 Light)", "var(--accent-secondary)", [
          { from: 0, to: 0.35, fill: "var(--accent-primary)", rx: 7, label: "Transudat", textFill: "var(--accent-primary)" },
          { from: 0.35, to: 0.62, fill: "var(--accent-secondary)", rx: 0, label: "Pseudoeksudat (SAAG>1,2)", textFill: "var(--accent-secondary)" },
          { from: 0.62, to: 1, fill: "var(--accent-coral)", rx: 7, label: "Eksudat / Empiema pH<7,2", textFill: "var(--accent-coral)" }
        ])}
        <div id="widget-pulmo-light-result" class="viz-readout" data-tone="warning" data-last-key="light-init">
          <p class="font-bold text-[var(--text-primary)]">EKSUDAT SEJATI (3/3 Light) — P/S 0,76 | LDH P/S 1,73</p>
          <p class="mt-1">Curigai <strong>TB Pleura (ADA &gt;40 U/L)</strong> atau <strong>Malignansi Pleura</strong>. Klik preset di atas untuk melihat koreksi SAAG pseudoeksudat diuretik (&gt;1,2 g/dL) atau ambang WSD empiema (pH &lt;7,20)!</p>
        </div>
      </div>
    `;
  }

  // --- P10. Simulator WSD, Tension Pneumotoraks ATLS 10 & USG Paru (pulmo-3-2) ---
  const PULMO_WSD_MODES = {
    air_leak: {
      label: "Kebocoran Udara Aktif", tone: "warning",
      undul: "Undulasi (+)", bubble: "Bubbling Ekspirasi (+)",
      c1: "Cairan selang <strong>berundulasi</strong> seirama napas (menandakan rongga pleura masih terhubung paten ke botol) + muncul <strong>gelembung udara saat ekspirasi/batuk</strong> karena fistula/bula masih bocor.",
      c2: "JANGAN diklem bila masih bubbling aktif (akan memicu tension pneumotoraks iatrogenik!). Jika bocor menetap &gt;5 hari &rarr; pertimbangkan VATS / pleurodesis."
    },
    re_expanded: {
      label: "Paru Mengembang Penuh", tone: "info",
      undul: "Undulasi (-)", bubble: "Bubbling (-)",
      c1: "Paru telah menempel kembali ke dinding dada dan menutupi lubang selang WSD. Undulasi berhenti DAN gelembung udara nihil.",
      c2: "Wajib konfirmasi dengan <strong>Foto Toraks</strong> (untuk membedakan paru benar-benar mengembang vs selang tersumbat bekuan!)."
    },
    blocked: {
      label: "Selang Tersumbat / Tertekuk", tone: "danger",
      undul: "Undulasi (-)", bubble: "Bubbling (-)",
      c1: "BAHAYA! Selang terlipat, terklamp, atau tersumbat bekuan fibrin padahal udara pleura masih terus masuk &rarr; tekanan pleura naik menjadi <strong>Tension Pneumotoraks sekunder</strong>!",
      c2: "Periksa segera patensi seluruh panjang selang, luruskan lipatan, observasi distres napas/deviasi trakea."
    },
    tension_atls: {
      label: "Tension PTX (ATLS Ed.10)", tone: "danger",
      undul: "Nihil / Darurat!", bubble: "JANGAN Tunggu Foto!",
      c1: "<strong>Diagnosis Klinis Cito:</strong> Sesak berat, hipotensi (syok obstruktif), JVP meningkat, suara napas sisi sakit hilang + hipersonor, deviasi trakea ke kontralateral (<em>Deep Sulcus Sign</em> jika foto supine ICU!).",
      c2: "<strong>Dekompresi Jarum / Finger Thoracostomy (ATLS Ed.10):</strong> Pada DEWASA lakukan di <strong>ICS 4–5 garis anterior/mid-axillary</strong> (<em>Triangle of Safety</em>, bukan lagi hanya ICS 2 MCL yang sering gagal akibat otot pektoral tebal!)."
    },
    usg_lung: {
      label: "USG Paru: Lung Point", tone: "info",
      undul: "Stratosphere Sign", bubble: "Lung Point (+)",
      c1: "Normal menunjukkan <em>Lung Sliding</em> + <em>Seashore Sign</em> (M-mode). Pneumotoraks menghapus <em>Lung Sliding</em> dan menampilkan pola garis sejajar kaku <strong>Barcode / Stratosphere Sign</strong>.",
      c2: "Ditemukannya <strong>Lung Point</strong> (batas tepat paru kolaps menyentuh dinding dada saat inspirasi) memiliki spesifisitas mendekati <strong>100%</strong> untuk pneumotoraks!"
    }
  };

  function buildPulmoWsdSvg(modeKey, phasePct) {
    const d = PULMO_WSD_MODES[modeKey] || PULMO_WSD_MODES.air_leak;
    const p = clampNum(phasePct, 0, 100, 35);
    const insp = p <= 50 ? p / 50 : (100 - p) / 50; // 0..1 peak inspiration
    const undulShift = modeKey === "air_leak" ? Math.round(insp * 16) : 0;
    const isTension = modeKey === "tension_atls" || modeKey === "blocked";
    const lungShrink = isTension ? 26 : modeKey === "air_leak" ? 38 - insp * 6 : 48;

    return `
      <svg viewBox="0 0 480 230" class="viz-svg" role="img" aria-label="Simulator WSD dan Tension Pneumotoraks">
        <!-- Left Chest & Pleural Cavity -->
        <rect x="10" y="10" width="224" height="210" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">${modeKey === "usg_lung" ? "USG Toraks M-Mode (PTX)" : "Kavum Pleura &amp; Triangle of Safety"}</text>
        ${modeKey === "usg_lung" ? `
          <rect x="24" y="40" width="196" height="86" rx="12" fill="#0f172a" stroke="var(--accent-primary)" />
          ${[0,1,2,3,4,5,6].map((i) => `<line x1="34" y1="${52 + i * 10}" x2="128" y2="${52 + i * 10}" stroke="#38bdf8" stroke-width="1.6" />`).join("")}
          <rect x="128" y="42" width="88" height="82" fill="var(--accent-primary-soft)" />
          <line x1="128" y1="42" x2="128" y2="124" stroke="var(--accent-coral)" stroke-width="2" stroke-dasharray="3 2" />
          <text x="80" y="144" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">Barcode/Stratosphere</text>
          <text x="172" y="144" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-primary)">Seashore</text>
          <text x="122" y="164" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--text-primary)">Garis Batas = LUNG POINT (Spesifisitas 100%!)</text>
        ` : `
          <rect x="34" y="42" width="176" height="132" rx="18" fill="${isTension ? "rgba(225,29,72,0.16)" : "var(--bg-surface-subtle)"}" stroke="${isTension ? "var(--accent-coral)" : "var(--border-strong)"}" stroke-width="1.6" />
          <ellipse cx="110" cy="110" rx="${lungShrink}" ry="48" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
          <text x="110" y="114" text-anchor="middle" font-size="8" font-weight="800" fill="var(--text-primary)">${isTension ? "PARU KOLAPS!" : "Paru"}</text>
          <!-- Chest Tube & Safety Landmark -->
          <path d="M188,128 L258,128 L258,154" fill="none" stroke="var(--accent-secondary)" stroke-width="4" stroke-linecap="round" />
          <circle cx="188" cy="128" r="5" fill="var(--accent-coral)" />
          <text x="122" y="192" text-anchor="middle" font-size="7.4" font-weight="800" fill="${isTension ? "var(--accent-coral)" : "var(--accent-primary)"}">ATLS Ed.10: ICS 4–5 Anterior/Mid-Axillary!</text>
        `}
        <text x="122" y="210" text-anchor="middle" font-size="7" font-weight="700" fill="var(--text-muted)">PSP Stabil BTS 2023: Pertimbangkan Konservatif!</text>

        <!-- Right WSD Water-Seal Bottle -->
        <rect x="244" y="10" width="226" height="210" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Botol Water-Seal Drainage (WSD)</text>
        <rect x="282" y="42" width="150" height="122" rx="10" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.6" />
        <!-- Water Volume -->
        <rect x="284" y="116" width="146" height="46" rx="4" fill="var(--viz-blue-soft)" />
        <!-- Submerged Tube & Oscillation Level -->
        <rect x="338" y="38" width="12" height="106" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="1.6" />
        <rect x="339" y="${116 - undulShift}" width="10" height="${28 + undulShift}" fill="var(--viz-blue)" fill-opacity="0.72" />
        ${modeKey === "air_leak" && p > 50 ? `
          <circle cx="344" cy="124" r="3" fill="white" stroke="var(--viz-blue)" />
          <circle cx="352" cy="108" r="3.5" fill="white" stroke="var(--viz-blue)" />
          <circle cx="336" cy="118" r="2.5" fill="white" stroke="var(--viz-blue)" />
        ` : ""}
        <text x="357" y="182" text-anchor="middle" font-size="8.2" font-weight="800" fill="${d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">${d.undul} &bull; ${d.bubble}</text>
        <text x="357" y="198" text-anchor="middle" font-size="7" font-weight="700" fill="var(--text-muted)">Dilarang terbang minimal 1–2 mgg pasca resolusi penuh</text>
      </svg>
    `;
  }

  function renderPulmoWsdPtxWidget() {
    const mode = PULMO_WSD_MODES[pulmoVizState.wsdMode] ? pulmoVizState.wsdMode : "air_leak";
    const phase = clampNum(pulmoVizState.wsdPhase, 0, 100, 35);
    const d = PULMO_WSD_MODES[mode];

    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-wsd-tabs", Object.entries(PULMO_WSD_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoWsdViz('${k}', null, true)`
        })), mode)}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "pulmoWsd",
      label: "Simulasi Siklus Respirasi pada Water-Seal WSD (Inspirasi &harr; Ekspirasi):",
      pillText: phase <= 50 ? `Inspirasi (${Math.round(phase)}%)` : `Ekspirasi (${Math.round(phase)}%)`,
      min: 0, max: 100, step: 1, value: phase,
      trackBg: "linear-gradient(90deg, rgba(14,165,233,0.34), rgba(217,119,6,0.34))",
      oninput: "window.InternaApp.updatePulmoWsdViz(null, this.value, true)",
      presets: [
        { label: "Puncak Inspirasi", val: 45, active: phase >= 30 && phase <= 55 },
        { label: "Ekspirasi (Bubbling)", val: 78, active: phase >= 65 && phase <= 92 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoWsd",
      title: "Simulator Sistem Botol WSD (Undulasi/Bubbling), Tension PTX (ATLS 10) & USG Lung Point",
      tag: "Pneumotoraks • KKI 3B",
      controlsTop,
      svgHtml: buildPulmoWsdSvg(mode, phase),
      controlsBottom,
      info: {
        tone: d.tone,
        rKey: `wsd-${mode}`,
        title: `${d.label} — ${d.undul} | ${d.bubble}`,
        c1Label: "Interpretasi Fisiologis WSD / USG",
        c1Body: d.c1,
        c2Label: "Tindakan Klinis & Keselamatan",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Pada pasien ICU posisi berbaring (<em>supine</em>), udara pleura berkumpul di anterior-inferior bukan di apeks, membentuk tanda <strong>Deep Sulcus Sign</strong> pada sudut kostofrenikus yang tampak tajam memanjang ke bawah!</p>`
    });
  }

  function updatePulmoWsdViz(modeIn, phaseIn, fromUser = true) {
    if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
    if (PULMO_WSD_MODES[modeIn]) pulmoVizState.wsdMode = modeIn;
    if (phaseIn !== null && phaseIn !== undefined) pulmoVizState.wsdPhase = clampNum(phaseIn, 0, 100, 35);

    const mode = pulmoVizState.wsdMode;
    const phase = pulmoVizState.wsdPhase;
    const d = PULMO_WSD_MODES[mode];
    syncVizPresets("viz-pulmo-wsd-tabs", Object.keys(PULMO_WSD_MODES).map((k) => k === mode));
    syncSliderAndPill("viz-pulmoWsd-slider", "viz-pulmoWsd-pill", phase, phase <= 50 ? `Inspirasi (${Math.round(phase)}%)` : `Ekspirasi (${Math.round(phase)}%)`);
    syncVizPresets("viz-pulmoWsd-presets", [phase >= 30 && phase <= 55, phase >= 65 && phase <= 92]);
    swapVizSvgFrame("viz-pulmoWsd-frame", buildPulmoWsdSvg(mode, phase));
    updateVizReadout("viz-pulmoWsd-readout", d.tone, formatVizReadoutHtml(
      `${d.label} — ${d.undul} | ${d.bubble}`, "Interpretasi Fisiologis WSD / USG", d.c1, "Tindakan Klinis & Keselamatan", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Foto toraks supine di ICU menunjukkan <strong>Deep Sulcus Sign</strong>! Dewasa dekompresi Tension PTX ATLS 10 di <strong>ICS 4–5 anterior/mid-axillary</strong>!</p>`
    ), `wsd-${mode}`);
  }

  // --- P11. Kompartemen ITMIG ('4T') & SVCS (pulmo-3-3) ---
  const PULMO_MED_DATA = {
    anterior: {
      label: "Prevascular (Anterior '4T')", tone: "warning",
      items: ["1. Thymoma (MG / PRCA / Hipogammaglobulinemia)", "2. Teratoma / Germ Cell Tumor (Cek AFP & beta-hCG!)", "3. 'Terrible' Lymphoma (Hodgkin / NHL / DLBCL)", "4. Thyroid Retrosternal (Ekstensi struma servikal)"],
      c1: "Konsensus <strong>ITMIG</strong> menyebut ruang belakang sternum hingga perikardium anterior sebagai kompartemen <strong>Prevascular (Anterior)</strong> dengan mnemonic klasik <strong>4T</strong>.",
      c2: "Jika terdeteksi pria muda massa anterior masif: wajib periksa <strong>AFP &amp; beta-hCG</strong> serum! Pada <strong>Timoma</strong>, cek antibodi anti-AChR untuk <strong>Miastenia Gravis</strong> (ditemukan pada 30–50% timoma)."
    },
    middle: {
      label: "Visceral (Tengah)", tone: "info",
      items: ["1. Kista Duplikasi (Bronkogenik / Esofageal)", "2. Limfadenopati (TB, Sarkoidosis, Metastasis)", "3. Kista Perikardium & Tumor Trakea/Esofagus", "4. Aneurisma Arkus Aorta / Lesi Vaskular"],
      c1: "Kompartemen <strong>Visceral (Tengah)</strong> mencakup trakea, karina, esofagus, jantung, pembuluh besar, dan KGB mediastinum tengah.",
      c2: "Evaluasi dengan CT toraks berkontras &amp; <strong>EBUS-TBNA</strong> bila pembesaran KGB stasiun subkarina/paratrakeal."
    },
    posterior: {
      label: "Paravertebral (Posterior)", tone: "info",
      items: ["1. Tumor Neurogenik (>75% kasus!: Schwannoma)", "2. Neurofibroma, Ganglioneuroma, Neuroblastoma", "3. Meningokel Lateral & Abses Paravertebral (Pott TB)", "4. Hematopoiesis Ekstramedular (Talasemia berat!)"],
      c1: "Kompartemen <strong>Paravertebral (Posterior)</strong> membentang dari batas anterior korpus vertebra ke sulkus paravertebral; didominasi <strong>Tumor Neurogenik</strong> (Schwannoma).",
      c2: "Minta <strong>MRI Torakolumbal</strong> bila ada lesi berbentuk <em>dumbbell</em> menembus foramen intervertebralis untuk menyingkirkan kompresi medula spinalis."
    },
    svcs: {
      label: "Emergensi SVCS & Mediastinitis", tone: "danger",
      items: ["Etiologi Terbanyak: Ca Paru (NSCLC/SCLC) & Limfoma", "Klinis: Wajah Plethora, Venektasi Leher, Pemberton (+)", "PRIORITAS: BIOPSI DULU sebelum Steroid/Kemo!", "Mediastinitis Akut: Sindrom Boerhaave / Odontogenik"],
      c1: "<strong>Aturan Emas SVCS:</strong> Kecuali ada ancaman obstruksi jalan napas/edema laring berat atau edema serebri akut, lakukan <strong>BIOPSI jaringan dahulu sebelum steroid/radioterapi</strong> (steroid melisiskan limfoma sehingga PA menjadi non-diagnostik!).",
      c2: "Jika distres berat/ancaman jalan napas &rarr; pasang <strong>Stent Vena Kava Superior endovaskular</strong> cito yang meredakan gejala dalam 24–48 jam tanpa merusak diagnosis histopatologi!"
    }
  };

  function buildPulmoMediastinumSvg(modeKey) {
    const d = PULMO_MED_DATA[modeKey] || PULMO_MED_DATA.anterior;
    const isAnt = modeKey === "anterior";
    const isMid = modeKey === "middle";
    const isPost = modeKey === "posterior";
    const isSvcs = modeKey === "svcs";

    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Kompartemen Mediastinum ITMIG dan SVCS">
        <rect x="10" y="10" width="206" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="113" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Potongan Sagital ITMIG</text>
        <!-- Sternum & Spine -->
        <rect x="26" y="42" width="10" height="142" rx="3" fill="var(--text-muted)" opacity="0.55" />
        <text x="31" y="198" text-anchor="middle" font-size="6.8" font-weight="700" fill="var(--text-muted)">Sternum</text>
        <!-- Anterior Prevascular -->
        <rect x="42" y="42" width="46" height="142" rx="9" fill="${isAnt || isSvcs ? "rgba(217,119,6,0.28)" : "var(--bg-surface-subtle)"}" stroke="${isAnt || isSvcs ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${isAnt || isSvcs ? "2" : "1"}" />
        <text x="65" y="114" text-anchor="middle" font-size="8" font-weight="800" fill="${isAnt ? "var(--accent-secondary)" : "var(--text-muted)"}">Ant</text>
        <text x="65" y="128" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">4T</text>
        <!-- Middle Visceral -->
        <rect x="92" y="42" width="52" height="142" rx="9" fill="${isMid ? "rgba(0,122,255,0.24)" : "var(--bg-surface-subtle)"}" stroke="${isMid ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${isMid ? "2" : "1"}" />
        <text x="118" y="114" text-anchor="middle" font-size="8" font-weight="800" fill="${isMid ? "var(--accent-primary)" : "var(--text-muted)"}">Tengah</text>
        <text x="118" y="128" text-anchor="middle" font-size="6.6" font-weight="700" fill="var(--text-muted)">Visceral</text>
        <!-- Posterior Paravertebral -->
        <rect x="148" y="42" width="42" height="142" rx="9" fill="${isPost ? "rgba(14,165,233,0.25)" : "var(--bg-surface-subtle)"}" stroke="${isPost ? "var(--viz-blue)" : "var(--border-subtle)"}" stroke-width="${isPost ? "2" : "1"}" />
        <text x="169" y="114" text-anchor="middle" font-size="8" font-weight="800" fill="${isPost ? "var(--viz-blue)" : "var(--text-muted)"}">Post</text>
        <text x="169" y="128" text-anchor="middle" font-size="6.6" font-weight="700" fill="var(--text-muted)">Neuro</text>
        <rect x="194" y="42" width="12" height="142" rx="3" fill="var(--text-muted)" opacity="0.55" />
        <text x="196" y="198" text-anchor="middle" font-size="6.8" font-weight="700" fill="var(--text-muted)">Vertebra</text>

        <rect x="226" y="10" width="244" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="348" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="${d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)"}">${d.label}</text>
        ${d.items.map((it, idx) => `
          <rect x="236" y="${42 + idx * 39}" width="224" height="31" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
          <text x="244" y="${61 + idx * 39}" font-size="7.5" font-weight="700" fill="var(--text-primary)">${it}</text>
        `).join("")}
        <text x="348" y="206" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">Timoma + Miastenia Gravis + PRCA = Mediastinum Anterior!</text>
      </svg>
    `;
  }

  function renderPulmoMediastinumWidget() {
    const mode = PULMO_MED_DATA[pulmoVizState.mediastinumMode] ? pulmoVizState.mediastinumMode : "anterior";
    const d = PULMO_MED_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-med-tabs", Object.entries(PULMO_MED_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoMediastinumViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoMed",
      title: "Peta 3 Kompartemen ITMIG ('4T'), Asosiasi Timoma-MG & Alur Biopsi vs Stent SVCS",
      tag: "Mediastinum • KKI 3A/3B",
      controlsTop,
      svgHtml: buildPulmoMediastinumSvg(mode),
      info: {
        tone: d.tone,
        rKey: `med-${mode}`,
        title: d.label,
        c1Label: "Klasifikasi & Prinsip Diagnostik",
        c1Body: d.c1,
        c2Label: "Tatalaksana & Pemeriksaan Kunci",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Jangan langsung menyuntikkan deksametason dosis tinggi pada pasien SVCS stabil dengan massa anterior sebelum biopsi (akan mengaburkan histologi <strong>Limfoma</strong>!). Pada nyeri retrosternal hebat pasca-muntah (<em>Boerhaave</em>) + krepitasi subkutis &rarr; <strong>Hamman's crunch / Mediastinitis Akut</strong> (bedah cito + meropenem-vankomisin).</p>`
    });
  }

  function updatePulmoMediastinumViz(modeIn) {
    if (PULMO_MED_DATA[modeIn]) pulmoVizState.mediastinumMode = modeIn;
    const mode = pulmoVizState.mediastinumMode;
    const d = PULMO_MED_DATA[mode];
    syncVizPresets("viz-pulmo-med-tabs", Object.keys(PULMO_MED_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoMed-frame", buildPulmoMediastinumSvg(mode));
    updateVizReadout("viz-pulmoMed-readout", d.tone, formatVizReadoutHtml(
      d.label, "Klasifikasi & Prinsip Diagnostik", d.c1, "Tatalaksana & Pemeriksaan Kunci", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> 4T = Thymoma, Teratoma, Terrible Lymphoma, Thyroid! Pada SVCS stabil, usahakan <strong>Biopsi dulu sebelum Steroid</strong>.</p>`
    ), `med-${mode}`);
  }

  // --- P12. Atlas HRCT & BAL ILD (pulmo-4-1) ---
  const PULMO_ILD_DATA = {
    uip: {
      label: "UIP / IPF", tone: "danger", zone: "Basal & Subpleural",
      hrct: "Honeycombing (Sarang Tawon) + Traction Bronchiectasis Basal", bal: "Neutrofil &amp; Eosinofil ringan",
      c1: "Usia &gt;60 tahun, sesak progresif + <strong>Velcro crackles basal</strong> + <em>clubbing finger</em>. Biopsi tidak wajib bila HRCT menunjukkan <strong>pola UIP definitif</strong>.",
      c2: "Terapi antifibrotik <strong>Nintedanib</strong> atau <strong>Pirfenidone</strong> (menekan penurunan FVC). <strong>LARANGAN KERAS (PANTHER-IPF Trial): Jangan beri kombinasi Prednison + Azathioprin + NAC</strong> (meningkatkan kematian &amp; rawat inap!)."
    },
    nsip: {
      label: "NSIP (CTD-ILD)", tone: "warning", zone: "Simetris Lobus Bawah + Sparing",
      hrct: "Ground-Glass Homogen + Subpleural Sparing (Tidak Ada Honeycombing)", bal: "Limfositosis ringan-sedang",
      c1: "Merupakan pola tersering pada penyakit jaringan ikat (<strong>Skleroderma / SSc, RA, PM/DM, SLE</strong>; kecuali RA sering pula berpola UIP!). Perhatikan <em>subpleural sparing</em> pada NSIP seluler.",
      c2: "Responsif terhadap <strong>Imunosupresan (Kortikosteroid, MMF, Siklofosfamid/Rituximab)</strong> + Nintedanib bila berkembang menjadi fibrosis progresif (PPF)."
    },
    hp: {
      label: "HP (Alveolitis Alergik)", tone: "info", zone: "Difus / Tengah-Atas",
      hrct: "Nodul Sentrilobular Kabur + Mosaic / Three-Density Sign", bal: "BAL Limfositosis KUAT (>40–50%!)",
      c1: "Reaksi inhalasi antigen organik (petani jerami jamur, pemelihara burung dara, AC berjamur). HRCT menampakkan <strong>Three-Density Sign (Headcheese sign)</strong> + air trapping ekspirasi.",
      c2: "Kunci utama adalah <strong>eliminasi total paparan antigen</strong> + kortikosteroid pada fase inflamasi non-fibrotik."
    },
    sarcoid: {
      label: "Sarkoidosis", tone: "info", zone: "Hilum Bilateral & Lobus Atas",
      hrct: "Limfadenopati Hilum Simetris + Nodul Perilimfatik", bal: "Limfosit CD4/CD8 >3,5!",
      c1: "Granuloma <strong>NON-KASEOSA</strong> (bedakan mutlak dengan TB!). Tanda khas: <strong>Sindrom Lofgren</strong> (eritema nodosum, artritis pergelangan kaki, adenopati hilum bilateral = prognosis baik!) &amp; <strong>Heerfordt</strong> (uveitis-parotitis-paresis N.VII). ACE serum &amp; 1,25-OH-Vit D3 sering meningkat &rarr; <strong>Hiperkalsemia!</strong>",
      c2: "Stage I asimtomatik cukup observasi. Bila gejala pulmonal/hiperkalsemia/kardiak/okular &rarr; <strong>Prednison oral</strong>."
    },
    pneumo: {
      label: "Pneumokoniosis & Drug", tone: "warning", zone: "Silika (Atas) vs Asbes (Bawah)",
      hrct: "Eggshell Hilum (Silikosis Atas) vs Plak Pleura Kalsifikasi (Asbes Bawah)", bal: "Ferruginous Bodies (Asbestosis)",
      c1: "<strong>Silikosis:</strong> Penambang batu/pasir &rarr; nodul <strong>lobus ATAS</strong>, kalsifikasi KGB hilum <em>eggshell</em>, risiko sangat tinggi terkena <strong>Tuberkulosis (Silikotuberkulosis)</strong>! <strong>Asbestosis:</strong> Galangan kapal/atap asbes &rarr; fibrosis <strong>lobus BAWAH</strong> + plak pleura kalsifikasi, meningkatkan risiko Ca Paru &amp; <strong>Mesotelioma Maligna</strong>!",
      c2: "<strong>Drug-Induced ILD:</strong> <strong>Amiodaron</strong> (makrofag berbusa/foamy, densitas tinggi di hati &amp; paru) dan <strong>Bleomisin</strong> (oksigen konsentrasi tinggi/FiO2 berlebihan memicu kerusakan radikal bebas masif!)."
    }
  };

  function buildPulmoIldSvg(modeKey) {
    const d = PULMO_ILD_DATA[modeKey] || PULMO_ILD_DATA.uip;
    const isUip = modeKey === "uip";
    const isSarc = modeKey === "sarcoid";
    const isPneumo = modeKey === "pneumo";
    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Atlas HRCT dan BAL ILD">
        <rect x="10" y="10" width="224" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Distribusi Zonal HRCT Paru</text>
        <!-- Two Lungs Frontal Zonal Diagram -->
        <path d="M56,52 Q94,42 98,86 L98,178 Q60,184 44,158 Z" fill="var(--bg-surface-subtle)" stroke="var(--text-muted)" stroke-width="1.5" />
        <path d="M188,52 Q150,42 146,86 L146,178 Q184,184 200,158 Z" fill="var(--bg-surface-subtle)" stroke="var(--text-muted)" stroke-width="1.5" />
        ${isUip ? `
          ${[62,74,86,162,174].map((x,i) => `<circle cx="${x}" cy="${156 + (i%2)*8}" r="6" fill="none" stroke="var(--accent-coral)" stroke-width="1.8" />`).join("")}
          <text x="122" y="128" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-coral)">Honeycombing Basal</text>
        ` : isSarc ? `
          <circle cx="102" cy="96" r="13" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
          <circle cx="142" cy="96" r="13" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
          <text x="122" y="132" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-primary)">Hilum Simetris</text>
        ` : isPneumo ? `
          <circle cx="72" cy="70" r="8" fill="none" stroke="var(--accent-secondary)" stroke-width="2.2" />
          <circle cx="172" cy="70" r="8" fill="none" stroke="var(--accent-secondary)" stroke-width="2.2" />
          <line x1="48" y1="176" x2="94" y2="176" stroke="var(--viz-blue)" stroke-width="4" />
          <line x1="150" y1="176" x2="196" y2="176" stroke="var(--viz-blue)" stroke-width="4" />
          <text x="122" y="126" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-secondary)">Silika Atas | Asbes Bawah</text>
        ` : `
          <ellipse cx="72" cy="144" rx="18" ry="22" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-dasharray="3 2" />
          <ellipse cx="172" cy="144" rx="18" ry="22" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-dasharray="3 2" />
          <text x="122" y="114" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-secondary)">${modeKey === "nsip" ? "GGO + Subpleural Sparing" : "Three-Density / Mosaic"}</text>
        `}
        <text x="122" y="202" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--accent-primary)">Predileksi: ${d.zone}</text>

        <!-- Right BAL & Biomarker Panel -->
        <rect x="244" y="10" width="226" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">HRCT, BAL &amp; Trap Terapi</text>
        <rect x="254" y="42" width="206" height="54" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="56" font-size="7.5" font-weight="800" fill="var(--accent-primary)">TEMUAN HRCT UTAMA</text>
        <text x="262" y="72" font-size="7.4" font-weight="700" fill="var(--text-primary)">${d.hrct.slice(0, 36)}</text>
        <text x="262" y="85" font-size="7.2" font-weight="600" fill="var(--text-muted)">${d.hrct.slice(36, 74)}</text>

        <rect x="254" y="102" width="206" height="44" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="116" font-size="7.5" font-weight="800" fill="var(--viz-purple)">BRONCHOALVEOLAR LAVAGE (BAL)</text>
        <text x="262" y="133" font-size="7.5" font-weight="800" fill="var(--text-primary)">${d.bal}</text>

        <rect x="254" y="152" width="206" height="60" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="262" y="167" font-size="7.5" font-weight="800" fill="var(--accent-coral)">HIGH-YIELD BOARD RULE:</text>
        <text x="262" y="182" font-size="7" font-weight="700" fill="var(--text-primary)">IPF: Nintedanib/Pirfenidone (NO PANTHER!)</text>
        <text x="262" y="196" font-size="7" font-weight="700" fill="var(--text-primary)">Bleomisin + O2 Tinggi = Fibrosis Fulminan!</text>
      </svg>
    `;
  }

  function renderPulmoIldHrctWidget() {
    const mode = PULMO_ILD_DATA[pulmoVizState.ildMode] ? pulmoVizState.ildMode : "uip";
    const d = PULMO_ILD_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-ild-tabs", Object.entries(PULMO_ILD_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoIldViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoIld",
      title: "Atlas HRCT, Profil BAL & Terapi Interstitial Lung Disease (UIP/IPF, NSIP, HP, Sarkoid, Pneumokoniosis)",
      tag: "Penyakit Paru Interstisial • KKI 3A",
      controlsTop,
      svgHtml: buildPulmoIldSvg(mode),
      info: {
        tone: d.tone,
        rKey: `ild-${mode}`,
        title: `${d.label} — Predileksi ${d.zone}`,
        c1Label: "Khas Klinis & Pencitraan",
        c1Body: d.c1,
        c2Label: "Terapi Terpilih & Peringatan",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Bedakan <strong>Silikosis</strong> (lobus ATAS + kalsifikasi <em>eggshell</em> + risiko tinggi <strong>TB</strong>) vs <strong>Asbestosis</strong> (lobus BAWAH + <em>pleural plaques</em> + mesotelioma). Semua pasien kanker testis/limfoma pasca-<strong>Bleomisin</strong> wajib diberi FiO2 serendah mungkin untuk SpO2 88–92% saat operasi!</p>`
    });
  }

  function updatePulmoIldViz(modeIn) {
    if (PULMO_ILD_DATA[modeIn]) pulmoVizState.ildMode = modeIn;
    const mode = pulmoVizState.ildMode;
    const d = PULMO_ILD_DATA[mode];
    syncVizPresets("viz-pulmo-ild-tabs", Object.keys(PULMO_ILD_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoIld-frame", buildPulmoIldSvg(mode));
    updateVizReadout("viz-pulmoIld-readout", d.tone, formatVizReadoutHtml(
      `${d.label} — Predileksi ${d.zone}`, "Khas Klinis & Pencitraan", d.c1, "Terapi Terpilih & Peringatan", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> IPF memakai antifibrotik (hindari imunosupresi triple PANTHER); Sarkoidosis ditandai granuloma non-kaseosa + CD4/CD8 BAL &gt;3,5!</p>`
    ), `ild-${mode}`);
  }

  // --- P13. Simulator Hemodinamik RHC ESC/ERS 2022 & Grup 1-5 PH / PE (pulmo-4-2) ---
  function evaluatePulmoPh(groupKey, mpapIn, pawpIn, pvrIn) {
    const mpap = Math.round(clampNum(mpapIn, 12, 65, 38));
    const pawp = Math.round(clampNum(pawpIn, 4, 28, 10));
    const pvr = clampNum(pvrIn, 0.8, 9.0, 5.5);
    const tpg = mpap - pawp;

    let hemoClass = "Normal (Tidak Ada PH — mPAP <=20)";
    let tone = "info";
    if (mpap > 20) {
      if (pawp <= 15 && pvr > 2.0) {
        hemoClass = "PH PRE-KAPILER (mPAP >20, PAWP <=15, PVR >2 WU)";
        tone = "warning";
      } else if (pawp > 15 && pvr <= 2.0) {
        hemoClass = "Isolated Post-Capillary PH / IpcPH (PAWP >15, PVR <=2)";
        tone = "info";
      } else if (pawp > 15 && pvr > 2.0) {
        hemoClass = "Combined Pre+Post-Capillary PH / CpcPH (PAWP >15, PVR >2)";
        tone = "danger";
      } else {
        hemoClass = "Unclassified PH (mPAP >20, PAWP <=15, PVR <=2 — Hati-hati High-Flow!)";
      }
    }

    const GROUP_INFO = {
      g1: { label: "Grup 1: PAH", c2: "Idiopatik/herediter/CTD (Skleroderma)/HIV/PJB. Lakukan <strong>Uji Vasoreaktivitas (iNO)</strong> pada IPAH/HPAH/drug-PAH: hanya jika respons (+) boleh beri <strong>CCB dosis tinggi</strong>! Negatif &rarr; kombinasi ERA (Bosentan/Macitentan) + PDE5i (Sildenafil/Tadalafil) + jalur Prostasiklin." },
      g2: { label: "Grup 2: Jantung Kiri", c2: "HFrEF, HFpEF, stenosis/regurgitasi mitral/aorta (PAWP &gt;15). <strong>DILARANG beri vasodilator PAH (Sildenafil/Bosentan/Epoprostenol)</strong> karena membanjiri edema paru!" },
      g3: { label: "Grup 3: Paru & Hipoksia", c2: "PPOK berat, ILD, OSA, hipoventilasi. <strong>Terapi utama = Koreksi Penyakit Paru &amp; Oksigen (LTOT)</strong>! Vasodilator PAH sistemik memperburuk V/Q mismatch (kecuali Treprostinil inhalasi pada ILD tertentu)." },
      g4: { label: "Grup 4: CTEPH", c2: "Tromboemboli kronik tidak lisis. Skrining baku emas = <strong>V/Q Scan (perfusi defek tanpa defek ventilasi)</strong>. Terapi kuratif = <strong>Pulmonary Endarterectomy (PEA)</strong> + antikoagulan seumur hidup + <strong>Riociguat</strong> bila inoperable!" },
      g5_pe: { label: "PE Akut: Masif vs Submasif", c2: "<strong>Masif (High-Risk: Hipotensi/Syok):</strong> Alteplase/Trombolitik IV sistemik cito! <strong>Submasif (Intermediate: RV Strain + Troponin tanpa syok):</strong> Antikoagulan (UFH/LMWH/DOAC) + monitor ketat (rescue lisis bila memburuk); IVC filter hanya jika kontraindikasi mutlak antikoagulan!" }
    };
    const g = GROUP_INFO[groupKey] || GROUP_INFO.g1;
    return { groupKey, mpap, pawp, pvr, tpg, hemoClass, tone, g };
  }

  function buildPulmoPhSvg(r) {
    // Plot x = PAWP (4..28, cutoff 15), y = PVR (0..9, cutoff 2.0)
    const cx = 36 + ((r.pawp - 4) / 24) * 184;
    const cy = 186 - (r.pvr / 9) * 136;
    const cutX = 36 + ((15 - 4) / 24) * 184;
    const cutY = 186 - (2.0 / 9) * 136;

    return `
      <svg viewBox="0 0 480 230" class="viz-svg" role="img" aria-label="Simulator Hemodinamik RHC ESC/ERS 2022">
        <rect x="10" y="10" width="224" height="210" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="27" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Kuadran Kateterisasi RHC (ESC/ERS 2022)</text>
        <!-- Zones -->
        <rect x="36" y="48" width="${(cutX - 36).toFixed(1)}" height="${(cutY - 48).toFixed(1)}" fill="var(--accent-primary-soft)" />
        <rect x="${cutX.toFixed(1)}" y="48" width="${(220 - cutX).toFixed(1)}" height="${(cutY - 48).toFixed(1)}" fill="var(--accent-coral-soft)" />
        <rect x="${cutX.toFixed(1)}" y="${cutY.toFixed(1)}" width="${(220 - cutX).toFixed(1)}" height="${(186 - cutY).toFixed(1)}" fill="var(--accent-secondary-soft)" />
        <line x1="${cutX.toFixed(1)}" y1="48" x2="${cutX.toFixed(1)}" y2="186" stroke="var(--accent-coral)" stroke-dasharray="4 2" />
        <line x1="36" y1="${cutY.toFixed(1)}" x2="220" y2="${cutY.toFixed(1)}" stroke="var(--accent-primary)" stroke-dasharray="4 2" />
        <text x="76" y="88" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-primary)">PRE-KAPILER</text>
        <text x="76" y="100" text-anchor="middle" font-size="6.8" font-weight="700" fill="var(--text-muted)">(Grup 1, 3, 4)</text>
        <text x="174" y="88" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-coral)">CpcPH</text>
        <text x="174" y="172" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-secondary)">IpcPH (Grup 2)</text>
        <text x="128" y="200" text-anchor="middle" font-size="7" font-weight="700" fill="var(--text-muted)">PAWP (Cut-off 15 mmHg) &rarr;</text>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="2" />

        <rect x="244" y="10" width="226" height="210" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="28" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Profil RHC Aktif (Batas Baru 2022!)</text>
        <rect x="256" y="38" width="202" height="50" rx="12" fill="var(--bg-surface)" stroke="${r.mpap > 20 ? "var(--accent-coral)" : "var(--accent-primary)"}" />
        <text x="264" y="53" font-size="7.5" font-weight="800" fill="var(--accent-primary)">mPAP=${r.mpap} | PAWP=${r.pawp} | PVR=${r.pvr.toFixed(1)} WU</text>
        <text x="264" y="70" font-size="7.4" font-weight="800" fill="${r.mpap > 20 ? "var(--accent-coral)" : "var(--text-primary)"}">${r.hemoClass.slice(0, 38)}</text>
        <text x="264" y="81" font-size="6.8" font-weight="700" fill="var(--text-muted)">TPG = ${r.tpg} mmHg</text>

        <rect x="256" y="96" width="202" height="114" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="264" y="112" font-size="7.6" font-weight="800" fill="var(--accent-secondary)">REVISI DEFINISI ESC/ERS 2022:</text>
        <text x="264" y="128" font-size="7.1" font-weight="700" fill="var(--text-primary)">&bull; Ambang mPAP turun 25 &rarr; &gt;20 mmHg!</text>
        <text x="264" y="142" font-size="7.1" font-weight="700" fill="var(--text-primary)">&bull; Ambang PVR turun 3 &rarr; &gt;2,0 Wood Units!</text>
        <text x="264" y="156" font-size="7.1" font-weight="800" fill="var(--accent-coral)">&bull; JANGAN beri Sildenafil/Bosentan Grup 2-3!</text>
        <text x="264" y="170" font-size="7" font-weight="700" fill="var(--text-primary)">&bull; CTEPH (Grup 4): V/Q Scan + PEA / Riociguat</text>
        <text x="264" y="185" font-size="7" font-weight="700" fill="var(--text-muted)">&bull; PE Masif (Hipotensi) = Trombolisis Sistemik!</text>
      </svg>
    `;
  }

  function renderPulmoPhWidget() {
    const r = evaluatePulmoPh(pulmoVizState.phGroup, pulmoVizState.phMpap, pulmoVizState.phPawp, pulmoVizState.phPvr);
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-ph-tabs", [
          { key: "g1", label: "Grup 1: PAH", onclick: "window.InternaApp.updatePulmoPhViz('g1', 38, 10, 5.5)" },
          { key: "g2", label: "Grup 2: LHD (PAWP>15)", onclick: "window.InternaApp.updatePulmoPhViz('g2', 34, 22, 1.6)" },
          { key: "g3", label: "Grup 3: PPOK/ILD", onclick: "window.InternaApp.updatePulmoPhViz('g3', 30, 11, 3.2)" },
          { key: "g4", label: "Grup 4: CTEPH", onclick: "window.InternaApp.updatePulmoPhViz('g4', 44, 9, 6.2)" },
          { key: "g5_pe", label: "Emboli Paru (PE)", onclick: "window.InternaApp.updatePulmoPhViz('g5_pe', 36, 8, 4.8)" }
        ], r.groupKey)}
      </div>
    `;
    const controlsBottom = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${renderPulmoSliderOnly({ key: "pulmoPhMpap", label: "mPAP (mmHg):", pillText: `${r.mpap} mmHg`, min: 14, max: 60, step: 1, value: r.mpap, trackBg: "rgba(225,29,72,0.28)", oninput: "window.InternaApp.updatePulmoPhViz(null, this.value, null, null)" })}
        ${renderPulmoSliderOnly({ key: "pulmoPhPawp", label: "PAWP (mmHg):", pillText: `${r.pawp} mmHg`, min: 4, max: 26, step: 1, value: r.pawp, trackBg: "rgba(217,119,6,0.28)", oninput: "window.InternaApp.updatePulmoPhViz(null, null, this.value, null)" })}
        ${renderPulmoSliderOnly({ key: "pulmoPhPvr", label: "PVR (WU):", pillText: `${r.pvr.toFixed(1)} WU`, min: 0.8, max: 8.5, step: 0.2, value: r.pvr, trackBg: "rgba(0,122,255,0.28)", oninput: "window.InternaApp.updatePulmoPhViz(null, null, null, this.value)" })}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoPh",
      title: "Simulator Kateterisasi Jantung Kanan ESC/ERS 2022 (mPAP >20, PVR >2 WU), Grup 1–5 PH & PE",
      tag: "Vaskular Paru • KKI 3B",
      controlsTop,
      svgHtml: buildPulmoPhSvg(r),
      controlsBottom,
      info: {
        tone: r.tone,
        rKey: `ph-${r.groupKey}-${r.hemoClass}`,
        title: `${r.g.label} — ${r.hemoClass}`,
        c1Label: "Interpretasi Parameter RHC",
        c1Body: `<strong>mPAP ${r.mpap} mmHg</strong> (ambang 2022: &gt;20), <strong>PAWP ${r.pawp} mmHg</strong> (&gt;15 menandakan disfungsi ventrikel kiri/katup mitral!), <strong>PVR ${r.pvr.toFixed(1)} WU</strong> (&gt;2 WU = peningkatan resistensi arteriol paru).`,
        c2Label: "Terapi Terarah & Larangan Klinis",
        c2Body: r.g.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Ingat revisi terbaru ESC/ERS 2022: ambang Hipertensi Pulmonal diturunkan menjadi <strong>mPAP &gt;20 mmHg</strong> dan <strong>PVR &gt;2 Wood Units</strong>! Dan pada PH Grup 2 &amp; 3, dilarang meresepkan Sildenafil/Bosentan!</p>`
    });
  }

  function updatePulmoPhViz(groupIn, mpapIn, pawpIn, pvrIn) {
    if (groupIn) pulmoVizState.phGroup = groupIn;
    if (mpapIn !== null && mpapIn !== undefined) pulmoVizState.phMpap = clampNum(mpapIn, 14, 60, 38);
    if (pawpIn !== null && pawpIn !== undefined) pulmoVizState.phPawp = clampNum(pawpIn, 4, 26, 10);
    if (pvrIn !== null && pvrIn !== undefined) pulmoVizState.phPvr = clampNum(pvrIn, 0.8, 8.5, 5.5);

    const r = evaluatePulmoPh(pulmoVizState.phGroup, pulmoVizState.phMpap, pulmoVizState.phPawp, pulmoVizState.phPvr);
    syncVizPresets("viz-pulmo-ph-tabs", ["g1", "g2", "g3", "g4", "g5_pe"].map((k) => k === r.groupKey));
    syncSliderAndPill("viz-pulmoPhMpap-slider", "viz-pulmoPhMpap-pill", r.mpap, `${r.mpap} mmHg`);
    syncSliderAndPill("viz-pulmoPhPawp-slider", "viz-pulmoPhPawp-pill", r.pawp, `${r.pawp} mmHg`);
    syncSliderAndPill("viz-pulmoPhPvr-slider", "viz-pulmoPhPvr-pill", r.pvr, `${r.pvr.toFixed(1)} WU`);
    swapVizSvgFrame("viz-pulmoPh-frame", buildPulmoPhSvg(r));
    updateVizReadout("viz-pulmoPh-readout", r.tone, formatVizReadoutHtml(
      `${r.g.label} — ${r.hemoClass}`,
      "Interpretasi Parameter RHC", `mPAP ${r.mpap} mmHg | PAWP ${r.pawp} mmHg | PVR ${r.pvr.toFixed(1)} WU (TPG ${r.tpg}).`,
      "Terapi Terarah & Larangan Klinis", r.g.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> ESC/ERS 2022: <strong>mPAP &gt;20 mmHg &amp; PVR &gt;2 WU</strong>! PE Masif = trombolitik IV; CTEPH = V/Q Scan + PEA.</p>`
    ), `ph-${r.groupKey}-${r.hemoClass}`);
  }

  // --- P14. Onkologi Toraks: SPN, Target Molekuler & Paraneoplastik (pulmo-4-3) ---
  const PULMO_ONCO_DATA = {
    spn: {
      label: "SPN & Kalsifikasi", tone: "info",
      c1: "<strong>Pola Kalsifikasi Jinak:</strong> <em>Popcorn</em> (Hamartoma — mengandung lemak/kartilago), <em>Konsentrik / Laminar</em> &amp; <em>Sentral</em> (Granuloma TB/jamur), atau stabil &gt;2 tahun pada foto lama.<br/><strong>Curiga Ganas:</strong> Kalsifikasi <em>Eksentrik</em> / <em>Stippled</em>, tepi spikulata (<em>corona radiata</em>), &ge;8 mm berisiko tinggi (Fleischner &rarr; PET-CT / biopsi).",
      c2: "Skrining <strong>LDCT Tahunan</strong> (USPSTF): Usia <strong>50–80 tahun</strong> dengan riwayat merokok <strong>&ge;20 pack-years</strong> yang masih merokok atau berhenti &lt;15 tahun lalu."
    },
    subtypes: {
      label: "Histologi Paru", tone: "warning",
      c1: "<strong>Adenokarsinoma (Tersering, bahkan Non-Perokok!):</strong> Letak <strong>Perifer</strong>, TTF-1 (+), risiko efusi pleura ganas.<br/><strong>Squamous Cell Carcinoma (SCC):</strong> Letak <strong>Sentral</strong>, sering <strong>berkavitasi</strong>, sangat erat merokok, menghasilkan <strong>PTHrP &rarr; Hiperkalsemia</strong>.",
      c2: "<strong>Small Cell Lung Cancer (SCLC):</strong> Letak <strong>Sentral</strong>, progresi sangat cepat, <strong>Sangat Sensitif Kemoterapi (Etoposida + Sisplatin)</strong> tetapi hampir tidak pernah direseksi bedah!"
    },
    targeted: {
      label: "Biomarker NSCLC", tone: "info",
      c1: "Wajib periksa panel molekuler (NGS/PCR) sebelum kemoterapi lini pertama pada Adenokarsinoma stadium lanjut: <strong>EGFR</strong> (tersering di Asia non-perokok!), <strong>ALK</strong>, <strong>ROS1</strong>, <strong>KRAS G12C</strong>, BRAF, RET, serta <strong>PD-L1 (TPS)</strong>.",
      c2: "<strong>EGFR Delesi Ekson 19 / L858R:</strong> Terapi lini pertama TKI generasi ke-3 <strong>Osimertinib</strong>!<br/><strong>ALK Rearrangement:</strong> <strong>Alectinib / Lorlatinib</strong>.<br/><strong>PD-L1 &ge;50% tanpa mutasi driver:</strong> Monoterapi imunoterapi <strong>Pembrolizumab</strong>!"
    },
    paraneo: {
      label: "Paraneoplastik & Pancoast", tone: "danger",
      c1: "<strong>Pencocokan Board Klasik:</strong><br/>&bull; <strong>SCLC:</strong> <strong>SIADH</strong> (Hiponatremia euvolemik), <strong>Sindrom Cushing Ektopik (ACTH↑)</strong>, dan <strong>Lambert-Eaton Myasthenic Syndrome (LEMS)</strong> (kelemahan proksimal membaik setelah aktivitas / antibodi anti-VGCC!).<br/>&bull; <strong>SCC:</strong> <strong>Hiperkalsemia (PTHrP)</strong>.",
      c2: "<strong>Tumor Pancoast (Sulkus Superior):</strong> Menyerang ganglion servikale superior &rarr; <strong>Sindrom Horner (Ptosis, Miosis, Anhidrosis ipsilateral)</strong> + nyeri bahu-lengan distribusi C8–T1–T2 + atrofi otot intrinsik tangan!"
    }
  };

  function buildPulmoOncoSvg(modeKey) {
    const d = PULMO_ONCO_DATA[modeKey] || PULMO_ONCO_DATA.spn;
    const isSpn = modeKey === "spn";
    return `
      <svg viewBox="0 0 480 226" class="viz-svg" role="img" aria-label="Onkologi Toraks SPN dan Biomarker">
        <rect x="10" y="10" width="224" height="206" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        ${isSpn ? `
          <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Pola Kalsifikasi SPN (&le;3 cm)</text>
          <circle cx="64" cy="78" r="24" fill="var(--bg-surface-subtle)" stroke="var(--accent-primary)" stroke-width="1.8" />
          <circle cx="58" cy="74" r="5" fill="var(--accent-primary)" /><circle cx="70" cy="80" r="6" fill="var(--accent-primary)" /><circle cx="63" cy="86" r="4" fill="var(--accent-primary)" />
          <text x="64" y="114" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-primary)">Popcorn (Hamartoma)</text>

          <circle cx="176" cy="78" r="24" fill="var(--bg-surface-subtle)" stroke="var(--accent-primary)" stroke-width="1.8" />
          <circle cx="176" cy="78" r="15" fill="none" stroke="var(--accent-primary)" stroke-width="2" />
          <circle cx="176" cy="78" r="6" fill="var(--accent-primary)" />
          <text x="176" y="114" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-primary)">Konsentrik (Granuloma)</text>

          <circle cx="122" cy="158" r="26" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" stroke-dasharray="4 2" />
          <circle cx="136" cy="148" r="4" fill="var(--accent-coral)" /><circle cx="130" cy="154" r="2.5" fill="var(--accent-coral)" />
          <text x="122" y="198" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--accent-coral)">Spikulata / Kalsifikasi Eksentrik = GANAS!</text>
        ` : `
          <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Peta Anatomi Tumor &amp; Horner</text>
          <rect x="34" y="42" width="176" height="44" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
          <text x="122" y="59" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-coral)">SULKUS SUPERIOR (PANCOAST)</text>
          <text x="122" y="75" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-primary)">Horner (Miosis/Ptosis) + Nyeri C8-T1</text>

          <rect x="34" y="96" width="176" height="52" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="122" y="113" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-secondary)">SENTRAL: SCLC &amp; SQUAMOUS</text>
          <text x="122" y="128" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-primary)">SCLC: SIADH / ACTH / LEMS</text>
          <text x="122" y="140" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-primary)">SCC: Kavitasi + PTHrP (Kalsium↑)</text>

          <rect x="34" y="156" width="176" height="48" rx="12" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
          <text x="122" y="173" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">PERIFER: ADENOKARSINOMA</text>
          <text x="122" y="189" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-primary)">Non-Perokok &bull; EGFR / ALK / ROS1</text>
        `}

        <rect x="244" y="10" width="226" height="206" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Ringkasan Keputusan Klinis</text>
        <rect x="254" y="42" width="206" height="52" rx="12" fill="var(--bg-surface)" stroke="var(--accent-primary)" />
        <text x="262" y="57" font-size="7.6" font-weight="800" fill="var(--accent-primary)">TERAPI TERARAH MOLEKULER</text>
        <text x="262" y="72" font-size="7.2" font-weight="700" fill="var(--text-primary)">EGFR+ &rarr; Osimertinib | ALK+ &rarr; Alectinib</text>
        <text x="262" y="85" font-size="7.1" font-weight="700" fill="var(--text-muted)">PD-L1 &ge;50% (driver neg) &rarr; Pembrolizumab</text>

        <rect x="254" y="102" width="206" height="48" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="262" y="117" font-size="7.6" font-weight="800" fill="var(--accent-secondary)">SKRINING LDCT PARU</text>
        <text x="262" y="133" font-size="7.2" font-weight="700" fill="var(--text-primary)">Usia 50–80 th + &ge;20 pack-years</text>

        <rect x="254" y="158" width="206" height="48" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="262" y="173" font-size="7.5" font-weight="800" fill="var(--accent-coral)">KONTRAINDIKASI RESEKSI BEDAH:</text>
        <text x="262" y="188" font-size="7.1" font-weight="700" fill="var(--text-primary)">N3/KGB Kontralateral, M1, atau SCLC ekstensif!</text>
      </svg>
    `;
  }

  function renderPulmoOncologySpnWidget() {
    const mode = PULMO_ONCO_DATA[pulmoVizState.oncoMode] ? pulmoVizState.oncoMode : "spn";
    const d = PULMO_ONCO_DATA[mode];
    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-onco-tabs", Object.entries(PULMO_ONCO_DATA).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoOncoViz('${k}')`
        })), mode)}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "pulmoOnco",
      title: "Evaluator SPN (Fleischner & Kalsifikasi), Biomarker EGFR/ALK & Sindrom Paraneoplastik",
      tag: "Onkologi Toraks • KKI 3A/3B",
      controlsTop,
      svgHtml: buildPulmoOncoSvg(mode),
      info: {
        tone: d.tone,
        rKey: `onco-${mode}`,
        title: `Onkologi Toraks: ${d.label}`,
        c1Label: "Analisis Diagnostik & Patologi",
        c1Body: d.c1,
        c2Label: "Terapi & Evaluasi Lanjutan",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Adenokarsinoma pada wanita Asia bukan perokok hampir selalu didorong mutasi <strong>EGFR</strong> &rarr; uji biomarker wajib sebelum memulai kemoterapi sitotoksik! Jangan lupakan uji <strong>LEMS</strong> membaik dengan aktivitas (berkebalikan dari Miastenia Gravis).</p>`
    });
  }

  function updatePulmoOncoViz(modeIn) {
    if (PULMO_ONCO_DATA[modeIn]) pulmoVizState.oncoMode = modeIn;
    const mode = pulmoVizState.oncoMode;
    const d = PULMO_ONCO_DATA[mode];
    syncVizPresets("viz-pulmo-onco-tabs", Object.keys(PULMO_ONCO_DATA).map((k) => k === mode));
    swapVizSvgFrame("viz-pulmoOnco-frame", buildPulmoOncoSvg(mode));
    updateVizReadout("viz-pulmoOnco-readout", d.tone, formatVizReadoutHtml(
      `Onkologi Toraks: ${d.label}`, "Analisis Diagnostik & Patologi", d.c1, "Terapi & Evaluasi Lanjutan", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Kalsifikasi <em>popcorn</em> / <em>konsentrik</em> = Jinak; <em>eksentrik</em> + spikulata = Ganas!</p>`
    ), `onco-${mode}`);
  }

  // --- P15. Simulator Ventilasi Protektif ARDSNet ('Baby Lung') & PROSEVA (pulmo-5-1) ---
  function evaluatePulmoArds(sevKey, vtIn, peepIn) {
    const sev = ["mild", "moderate", "severe"].includes(sevKey) ? sevKey : "severe";
    const vt = clampNum(vtIn, 4.0, 10.0, 6.0);
    const peep = Math.round(clampNum(peepIn, 5, 22, 14));
    const stiffOffset = sev === "severe" ? 3 : sev === "moderate" ? 1 : -1;
    const pplat = Math.round(clampNum(peep + vt * 2.15 + stiffOffset, 12, 48, 28));
    const deltaP = pplat - peep;
    const isSafeVt = vt <= 6.2;
    const isSafePplat = pplat <= 30;
    const isSafeDp = deltaP < 15;

    let tone = "info";
    if (!isSafePplat || !isSafeDp || vt > 8.0) tone = "danger";
    else if (sev === "severe" || !isSafeVt) tone = "warning";

    const berlinLabel = sev === "mild" ? "ARDS Ringan (P/F 201–300)" : sev === "moderate" ? "ARDS Sedang (P/F 101–200)" : "ARDS Berat (P/F <=100 — Indikasi Prone PROSEVA!)";
    return { sev, vt, peep, pplat, deltaP, isSafeVt, isSafePplat, isSafeDp, tone, berlinLabel };
  }

  function buildPulmoArdsSvg(r) {
    const pplatPct = clampNum((r.pplat - 10) / 35, 0, 1, 0.5);
    const overdistended = r.vt > 7.5 || r.pplat > 30;
    const alvR = 14 + ((r.vt - 4) / 6) * 14;
    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Simulator ARDSNet Baby Lung">
        <rect x="10" y="10" width="224" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="122" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Konsep 'Baby Lung' ARDSNet</text>
        <!-- Non-dependent Healthy/Baby Alveoli (Upper) vs Collapsed Dependent Dorsal -->
        <rect x="26" y="42" width="192" height="66" rx="8" fill="${overdistended ? "rgba(225,29,72,0.16)" : "rgba(0,122,255,0.12)"}" stroke="${overdistended ? "var(--accent-coral)" : "var(--accent-primary)"}" />
        <circle cx="80" cy="74" r="${alvR.toFixed(1)}" fill="none" stroke="${overdistended ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2.4" />
        <circle cx="122" cy="74" r="${alvR.toFixed(1)}" fill="none" stroke="${overdistended ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2.4" />
        <circle cx="164" cy="74" r="${alvR.toFixed(1)}" fill="none" stroke="${overdistended ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="2.4" />
        <text x="122" y="54" text-anchor="middle" font-size="7.2" font-weight="800" fill="${overdistended ? "var(--accent-coral)" : "var(--accent-primary)"}">${overdistended ? "VOLUTRAUMA / BAROTRAUMA!" : "Baby Lung Terbuka Aman"}</text>

        <rect x="26" y="114" width="192" height="58" rx="8" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" />
        <text x="122" y="138" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--viz-blue)">Zona Dorsal Kolaps / Terendam Cairan</text>
        <text x="122" y="154" text-anchor="middle" font-size="7.1" font-weight="700" fill="var(--text-primary)">PEEP ${r.peep} cmH2O + ${r.sev !== "mild" ? "PRONE >=12–16 j/hr" : "Terbuka Sebagian"}</text>

        <text x="122" y="196" text-anchor="middle" font-size="7.4" font-weight="800" fill="var(--accent-secondary)">Wajib Hitung PBW (Tinggi), BUKAN BB Aktual!</text>

        <rect x="244" y="10" width="226" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="357" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">Mekanika Tekanan ARDSNet</text>

        <rect x="256" y="40" width="202" height="50" rx="12" fill="var(--bg-surface)" stroke="${r.isSafePplat ? "var(--accent-primary)" : "var(--accent-coral)"}" stroke-width="1.5" />
        <text x="264" y="56" font-size="7.5" font-weight="800" fill="var(--text-muted)">PLATEAU PRESSURE (Target &le;30)</text>
        <text x="450" y="56" text-anchor="end" font-size="9" font-weight="800" fill="${r.isSafePplat ? "var(--accent-primary)" : "var(--accent-coral)"}">${r.pplat} cmH2O</text>
        <rect x="264" y="66" width="186" height="10" rx="9" fill="var(--bg-surface-subtle)" />
        <rect x="264" y="66" width="${(pplatPct * 186).toFixed(1)}" height="10" rx="9" fill="${r.isSafePplat ? "var(--accent-primary)" : "var(--accent-coral)"}" />

        <rect x="256" y="98" width="202" height="44" rx="12" fill="var(--bg-surface)" stroke="${r.isSafeDp ? "var(--accent-primary)" : "var(--accent-coral)"}" stroke-width="1.5" />
        <text x="264" y="114" font-size="7.5" font-weight="800" fill="var(--text-muted)">DRIVING PRESSURE (&Delta;P = Pplat - PEEP)</text>
        <text x="264" y="131" font-size="8.6" font-weight="800" fill="${r.isSafeDp ? "var(--accent-primary)" : "var(--accent-coral)"}">&Delta;P = ${r.deltaP} cmH2O (${r.isSafeDp ? "AMAN <15" : "BAHAYA >=15!"})</text>

        <rect x="256" y="150" width="202" height="62" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="264" y="165" font-size="7.5" font-weight="800" fill="var(--accent-secondary)">TARGET ARDSNET &amp; RESCUE:</text>
        <text x="264" y="180" font-size="7.1" font-weight="700" fill="var(--text-primary)">&bull; SpO2 88–95% | PaO2 55–80 mmHg</text>
        <text x="264" y="194" font-size="7.1" font-weight="700" fill="var(--text-primary)">&bull; Permissive Hypercapnia (pH &ge;7,20–7,25)</text>
        <text x="264" y="206" font-size="7" font-weight="700" fill="var(--accent-coral)">&bull; Prone PROSEVA (P/F &lt;150) &amp; Cairan Konservatif</text>
      </svg>
    `;
  }

  function renderPulmoArdsVentWidget() {
    const r = evaluatePulmoArds(pulmoVizState.ardsSeverity, pulmoVizState.ardsVt, pulmoVizState.ardsPeep);
    const controlsTop = `
      <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        ${renderCardioTabRow("viz-pulmo-ards-sev", [
          { key: "mild", label: "Ringan (P/F 201–300)", onclick: "window.InternaApp.updatePulmoArdsViz('mild', null, null, true)" },
          { key: "moderate", label: "Sedang (P/F 101–200)", onclick: "window.InternaApp.updatePulmoArdsViz('moderate', null, null, true)" },
          { key: "severe", label: "Berat (P/F <=100)", onclick: "window.InternaApp.updatePulmoArdsViz('severe', null, null, true)" }
        ], r.sev)}
        ${renderCardioTabRow("viz-pulmo-ards-peeps", [
          { key: "8", label: "PEEP 8", onclick: "window.InternaApp.updatePulmoArdsViz(null, null, 8, true)" },
          { key: "12", label: "PEEP 12", onclick: "window.InternaApp.updatePulmoArdsViz(null, null, 12, true)" },
          { key: "14", label: "PEEP 14", onclick: "window.InternaApp.updatePulmoArdsViz(null, null, 14, true)" },
          { key: "18", label: "PEEP 18", onclick: "window.InternaApp.updatePulmoArdsViz(null, null, 18, true)" }
        ], String(r.peep))}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "pulmoArds",
      label: "Simulasi Volume Tidal ARDSNet (4,5–10 mL/kg PBW):",
      pillText: `${r.vt.toFixed(1)} mL/kg`,
      min: 4.5, max: 10.0, step: 0.2, value: r.vt,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.36) 0% 35%, rgba(217,119,6,0.34) 35% 58%, rgba(225,29,72,0.44) 58% 100%)",
      oninput: "window.InternaApp.updatePulmoArdsViz(null, this.value, null, true)",
      presets: [
        { label: "6,0 mL/kg (Baku Emas)", val: 6.0, active: r.vt <= 6.2 },
        { label: "8,0 mL/kg", val: 8.0, active: r.vt > 7.5 && r.vt <= 8.5 },
        { label: "10,0 mL/kg (Barotrauma)", val: 10.0, active: r.vt > 8.5 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoArds",
      title: "Simulator Mekanika 'Baby Lung' ARDSNet, Driving Pressure & Prone Positioning PROSEVA",
      tag: "ARDS & Gagal Napas • KKI 3B",
      controlsTop,
      svgHtml: buildPulmoArdsSvg(r),
      controlsBottom,
      info: {
        tone: r.tone,
        rKey: `ards-${r.sev}-${r.isSafePplat}-${r.isSafeDp}`,
        title: `${r.berlinLabel} — Vt ${r.vt.toFixed(1)} mL/kg | PEEP ${r.peep} | Pplat ${r.pplat}`,
        c1Label: "Evaluasi Barotrauma & Driving Pressure",
        c1Body: `<strong>Pplat ${r.pplat} cmH2O</strong> (target <strong>&le;30</strong>) dan <strong>Driving Pressure &Delta;P = ${r.deltaP} cmH2O</strong> (target <strong>&lt;15</strong>). Turunkan Vt bertahap hingga 4 mL/kg jika Pplat &gt;30!`,
        c2Label: "Terapi Penurun Mortalitas ARDS",
        c2Body: "<strong>1) Low Tidal Volume 6 mL/kg PBW</strong> (studi ARMA), <strong>2) Prone Positioning &ge;12–16 jam/hari</strong> bila PaO2/FiO2 &lt;150 (studi PROSEVA), <strong>3) Manajemen Cairan Konservatif (FACTT)</strong> setelah syok stabil!"
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Kriteria Berlin ARDS tidak memakai PCWP &le;18 lagi; cukup foto infiltrat bilateral + P/F &le;300 + PEEP &ge;5 dalam &le;7 hari (<em>Global Definition 2024</em> kini juga mencakup HFNC &ge;30 L/mnt dan USG paru!).</p>`
    });
  }

  function updatePulmoArdsViz(sevIn, vtIn, peepIn, fromUser = true) {
    if (fromUser && vtIn !== null && vtIn !== undefined) cancelAllVizAnimations();
    if (["mild", "moderate", "severe"].includes(sevIn)) pulmoVizState.ardsSeverity = sevIn;
    if (vtIn !== null && vtIn !== undefined) pulmoVizState.ardsVt = clampNum(vtIn, 4.5, 10.0, 6.0);
    if (peepIn !== null && peepIn !== undefined) pulmoVizState.ardsPeep = clampNum(peepIn, 5, 22, 14);

    const r = evaluatePulmoArds(pulmoVizState.ardsSeverity, pulmoVizState.ardsVt, pulmoVizState.ardsPeep);
    syncVizPresets("viz-pulmo-ards-sev", ["mild", "moderate", "severe"].map((k) => k === r.sev));
    syncVizPresets("viz-pulmo-ards-peeps", [8, 12, 14, 18].map((p) => p === r.peep));
    syncSliderAndPill("viz-pulmoArds-slider", "viz-pulmoArds-pill", r.vt, `${r.vt.toFixed(1)} mL/kg`);
    syncVizPresets("viz-pulmoArds-presets", [r.vt <= 6.2, r.vt > 7.5 && r.vt <= 8.5, r.vt > 8.5]);
    swapVizSvgFrame("viz-pulmoArds-frame", buildPulmoArdsSvg(r));
    updateVizReadout("viz-pulmoArds-readout", r.tone, formatVizReadoutHtml(
      `${r.berlinLabel} — Vt ${r.vt.toFixed(1)} mL/kg | PEEP ${r.peep} | Pplat ${r.pplat}`,
      "Evaluasi Barotrauma & Driving Pressure", `Pplat = <strong>${r.pplat} cmH2O</strong> (target &le;30) &bull; Driving Pressure &Delta;P = <strong>${r.deltaP} cmH2O</strong> (target &lt;15).`,
      "Terapi Penurun Mortalitas ARDS", "Low Tidal Volume 6 mL/kg PBW + Prone Positioning &ge;12–16 j/hr (PROSEVA, P/F &lt;150) + Cairan Konservatif!",
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Hitung Volume Tidal dari <strong>PBW (Tinggi Badan)</strong>, JANGAN berat badan aktual pada pasien obesitas!</p>`
    ), `ards-${r.sev}-${r.isSafePplat}-${r.isSafeDp}`);
  }

  // --- P16. Kalkulator Terintegrasi PBW, Gradien (A-a)O2 & ROX Index HFNC (pulmo-5-1 Extra) ---
  function calcPulmoRoxPbw(presetKey) {
    const sexEl = document.getElementById("pulmo-rox-sex");
    const tbEl = document.getElementById("pulmo-rox-tb");
    const spo2El = document.getElementById("pulmo-rox-spo2");
    const fio2El = document.getElementById("pulmo-rox-fio2");
    const rrEl = document.getElementById("pulmo-rox-rr");
    const pao2El = document.getElementById("pulmo-rox-pao2");
    const paco2El = document.getElementById("pulmo-rox-paco2");
    const ageEl = document.getElementById("pulmo-rox-age");

    const PRESETS = {
      obese_pbw: { sex: "female", tb: 155, spo2: 94, fio2: 0.60, rr: 26, pao2: 72, paco2: 40, age: 48 },
      hfnc_fail: { sex: "male", tb: 170, spo2: 89, fio2: 0.80, rr: 34, pao2: 58, paco2: 36, age: 62 },
      hypovent: { sex: "male", tb: 168, spo2: 90, fio2: 0.21, rr: 10, pao2: 58, paco2: 64, age: 32 },
      shunt_vqm: { sex: "female", tb: 160, spo2: 88, fio2: 0.50, rr: 28, pao2: 64, paco2: 32, age: 55 }
    };
    if (presetKey && PRESETS[presetKey]) {
      const pr = PRESETS[presetKey];
      if (sexEl) sexEl.value = pr.sex;
      if (tbEl) tbEl.value = pr.tb;
      if (spo2El) spo2El.value = pr.spo2;
      if (fio2El) fio2El.value = pr.fio2;
      if (rrEl) rrEl.value = pr.rr;
      if (pao2El) pao2El.value = pr.pao2;
      if (paco2El) paco2El.value = pr.paco2;
      if (ageEl) ageEl.value = pr.age;
      syncVizPresets("viz-pulmo-rox-presets", Object.keys(PRESETS).map((k) => k === presetKey));
    } else if (presetKey !== undefined) {
      syncVizPresets("viz-pulmo-rox-presets", [false, false, false, false]);
    }

    const sex = sexEl?.value === "female" ? "female" : "male";
    const tb = clampNum(tbEl?.value || 170, 130, 210, 170);
    const spo2 = clampNum(spo2El?.value || 94, 60, 100, 94);
    const fio2 = clampNum(fio2El?.value || 0.60, 0.21, 1.0, 0.60);
    const rr = clampNum(rrEl?.value || 26, 6, 55, 26);
    const pao2 = clampNum(pao2El?.value || 72, 30, 400, 72);
    const paco2 = clampNum(paco2El?.value || 40, 15, 110, 40);
    const age = clampNum(ageEl?.value || 48, 18, 95, 48);

    const pbw = (sex === "male" ? 50 : 45.5) + 0.91 * (tb - 152.4);
    const vt6 = Math.round(pbw * 6);
    const rox = (spo2 / fio2) / rr;
    const pao2Alv = fio2 * 713 - paco2 / 0.8;
    const aaGrad = pao2Alv - pao2;
    const aaNorm = age / 4 + 4;
    const aaHigh = aaGrad > aaNorm;

    let tone = "info";
    let toneColor = "var(--accent-primary)";
    let badge = `ROX ${rox.toFixed(2)} (>=4,88 Sukses)`;
    let roxNote = "Prediksi tinggi keberhasilan HFNC (&ge;4,88); lanjutkan observasi.";
    if (rox < 3.85) {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      badge = `ROX ${rox.toFixed(2)} (<3,85 Gagal HFNC!)`;
      roxNote = "<strong>Risiko tinggi gagal HFNC!</strong> Bila ROX &lt;3,85 pada jam ke-2/6/12 &rarr; jangan tunda intubasi invasif!";
    } else if (rox < 4.88) {
      tone = "warning";
      toneColor = "var(--accent-secondary)";
      badge = `ROX ${rox.toFixed(2)} (Zona Abu-abu)`;
      roxNote = "Evaluasi ulang dalam 1–2 jam (cek ulang ROX; gagal bila &lt;2,85 jam ke-2, &lt;3,47 jam ke-6, &lt;3,85 jam ke-12).";
    }

    const pct = clampNum((rox - 1.5) / 8.5, 0, 1, 0.5);
    updateCalcGauge("calc-pulmo-rox", pct, badge, toneColor);
    const res = document.getElementById("widget-pulmo-rox-result");
    if (!res) return;
    updateCalcReadoutTone(
      res,
      tone,
      `rox-${badge}-${vt6}-${Math.round(aaGrad)}`,
      `
        <p class="font-bold text-[var(--text-primary)]">PBW = ${pbw.toFixed(1)} kg &rarr; Target Vt ARDSNet (6 mL/kg) = ${vt6} mL | ${badge}</p>
        <div class="viz-readout-grid mt-1">
          <p>&bull; <strong>ROX Index HFNC:</strong> (${spo2} / ${fio2.toFixed(2)}) / ${rr} = <strong>${rox.toFixed(2)}</strong> &rarr; ${roxNote}</p>
          <p>&bull; <strong>Gradien (A-a)O2:</strong> PAO2 (${pao2Alv.toFixed(0)}) - PaO2 (${pao2}) = <strong>${aaGrad.toFixed(0)} mmHg</strong> (Batas Usia &le;${aaNorm.toFixed(0)} mmHg &rarr; <strong>${aaHigh ? "MELEBAR (V/Q Mismatch, Shunt, Difusi!)" : "NORMAL (Hipoventilasi Murni / Opioid / Neuromuskular!)"}</strong>).</p>
        </div>
      `
    );
  }

  function renderPulmoRoxPbwCalcWidget() {
    return `
      <div class="viz-widget" id="viz-calc-pulmo-rox-card">
        <div class="viz-header">
          <span class="viz-title">Kalkulator PBW ARDSNet (6 mL/kg), Gradien (A-a)O2 &amp; ROX Index HFNC</span>
          <span class="viz-tag">Medik Kritis • KKI 3B</span>
        </div>
        <div class="viz-presets mb-2.5" id="viz-pulmo-rox-presets">
          <button type="button" class="viz-pill-btn active" onclick="window.InternaApp.calcPulmoRoxPbw('obese_pbw')">Obesitas 155 cm (PBW!)</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoRoxPbw('hfnc_fail')">HFNC Gagal (ROX &lt;3,85)</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoRoxPbw('hypovent')">Hipoventilasi Murni</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoRoxPbw('shunt_vqm')">V/Q Mismatch / ARDS</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5" style="align-items:end;">
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-sex">Jenis Kelamin</label><select id="pulmo-rox-sex" class="viz-calc-input w-full" onchange="window.InternaApp.calcPulmoRoxPbw()"><option value="female" selected>Wanita</option><option value="male">Pria</option></select></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-tb">Tinggi (cm)</label><input type="number" id="pulmo-rox-tb" value="155" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-spo2">SpO2 (%)</label><input type="number" id="pulmo-rox-spo2" value="94" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-fio2">FiO2 (0.21–1)</label><input type="number" id="pulmo-rox-fio2" step="0.05" value="0.60" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-rr">RR (/mnt)</label><input type="number" id="pulmo-rox-rr" value="26" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-pao2">PaO2 (mmHg)</label><input type="number" id="pulmo-rox-pao2" value="72" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-paco2">PaCO2 (mmHg)</label><input type="number" id="pulmo-rox-paco2" value="40" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rox-age">Usia (th)</label><input type="number" id="pulmo-rox-age" value="48" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoRoxPbw()" /></div>
        </div>
        ${renderCalcGaugeSvg("calc-pulmo-rox", "SKOR ROX INDEX HFNC = (SpO2 / FiO2) / RR", 0.53, "ROX 6,03 (>=4,88 Sukses)", "var(--accent-primary)", [
          { from: 0, to: 0.28, fill: "var(--accent-coral)", rx: 7, label: "<3,85 Gagal (Intubasi)", textFill: "var(--accent-coral)" },
          { from: 0.28, to: 0.40, fill: "var(--accent-secondary)", rx: 0, label: "3,85–4,87 Monitor", textFill: "var(--accent-secondary)" },
          { from: 0.40, to: 1, fill: "var(--accent-primary)", rx: 7, label: ">=4,88 Sukses HFNC", textFill: "var(--accent-primary)" }
        ])}
        <div id="widget-pulmo-rox-result" class="viz-readout" data-tone="info" data-last-key="rox-init">
          <p class="font-bold text-[var(--text-primary)]">PBW = 47,9 kg &rarr; Target Vt ARDSNet (6 mL/kg) = 287 mL | ROX 6,03 (&ge;4,88 Sukses)</p>
          <p class="mt-1">Contoh klinis klasik: Wanita TB 155 cm dengan berat badan aktual 110 kg TETAP mendapatkan <strong>Vt = 287 mL</strong> dari tinggi badan (PBW), BUKAN 660 mL! Dan Gradien (A-a)O2 &gt;(Usia/4 + 4) membedakan kerusakan parenkim vs hipoventilasi sentral/opioid.</p>
        </div>
      </div>
    `;
  }

  // --- P17. Simulator Gelombang Ventilator Ppeak vs Pplat, Auto-PEEP & DOPE (pulmo-5-2) ---
  const PULMO_MV_MODES = {
    normal: {
      label: "Normal", tone: "info", ppeak: 22, pplat: 19, flowTouchesZero: true,
      c1: "Selisih <strong>Ppeak - Pplat &lt;5 cmH2O</strong> (normal). Setelah ekspirasi, kurva aliran kembali mulus menyentuh garis <strong>0 L/mnt</strong> sebelum tarikan napas berikutnya dimulai.",
      c2: "Pertahankan pemantauan alarm tekanan puncak &amp; sinkroni pasien-ventilator."
    },
    airway_res: {
      label: "Resistensi Jalan Napas↑ (Ppeak↑, Pplat N)", tone: "warning", ppeak: 42, pplat: 20, flowTouchesZero: true,
      c1: "<strong>Ppeak melonjak (&gt;35–40)</strong> tetapi <strong>Pplat saat Inspiratory Hold tetap normal (&le;20–25)</strong>! Gradien <strong>Ppeak - Pplat &gt;5–10 cmH2O</strong> menunjukkan sumbatan/spasme antara sirkuit hingga bronkus!",
      c2: "Etiologi klasik: <strong>Bronkospasme berat, sumbatan mukus kental/kinked ETT, pasien menggigit ETT, ETT terlalu kecil</strong>. Tindakan: Penghisapan (suction), bronkodilator inhalasi, cek pipa ETT / bite block!"
    },
    compliance_low: {
      label: "Komplians Turun (Ppeak↑ DAN Pplat↑)", tone: "danger", ppeak: 40, pplat: 36, flowTouchesZero: true,
      c1: "<strong>Keduanya Ppeak DAN Pplat ikut naik bersamaan</strong> dengan selisih Ppeak - Pplat tetap sempit (&le;4–5 cmH2O)! Ini mencerminkan parenkim alveoli atau dinding dada yang kaku/tertekan.",
      c2: "Etiologi wajib hafal: <strong>ARDS memburuk, Edema Paru kardiogenik, Pneumotoraks (DOPE!), Efusi Pleura masif, Intubasi Mainstem Kanan, atau Asites/ACS</strong>. Segera lakukan <strong>DOPE</strong> bila desaturasi mendadak!"
    },
    auto_peep: {
      label: "Auto-PEEP (Breath Stacking)", tone: "danger", ppeak: 36, pplat: 30, flowTouchesZero: false,
      c1: "Tampak pada kurva Aliran-Waktu: <strong>aliran ekspirasi TIDAK sempat menyentuh garis nol (0)</strong> sebelum siklus napas baru menumpuk masuk (<em>breath stacking / dynamic hyperinflation</em>) pada PPOK &amp; Status Asmatikus!",
      c2: "<strong>JEBAKAN BOARD KRITIS:</strong> Jangan naikkan Frekuensi Napas (RR) atau memperpanjang Inspirasi (akan memperparah auto-PEEP dan memicu syok hipotensi!). Solusi: <strong>1) Lepas sirkuit ventilator sejenak (disconnect)</strong> bila hipotensi mendadak, <strong>2) TURUNKAN RR</strong>, <strong>3) Tingkatkan rasio I:E (perpanjang ekspirasi!)</strong>, &amp; beri bronkodilator."
    }
  };

  function buildPulmoMvSvg(modeKey, phasePct) {
    const d = PULMO_MV_MODES[modeKey] || PULMO_MV_MODES.auto_peep;
    const scanX = 44 + (clampNum(phasePct, 0, 100, 50) / 100) * 184;
    const pPeakY = 98 - (d.ppeak / 46) * 52;
    const pPlatY = 98 - (d.pplat / 46) * 52;
    const pawPath = `M44,90 L76,${pPeakY.toFixed(1)} L96,${pPlatY.toFixed(1)} L142,${pPlatY.toFixed(1)} L154,90 L228,90`;
    const flowPath = d.flowTouchesZero
      ? `M44,158 L54,132 L112,132 L118,188 Q154,170 198,158 L228,158`
      : `M44,158 L54,132 L112,132 L118,188 Q154,180 218,172 L228,172`;

    return `
      <svg viewBox="0 0 480 232" class="viz-svg" role="img" aria-label="Simulator Kurva Ventilator Ppeak vs Pplat dan Auto-PEEP">
        <rect x="10" y="10" width="234" height="212" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="127" y="27" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">Kurva Tekanan (Paw) &amp; Aliran (Flow)</text>
        <!-- Top Paw -->
        <line x1="42" y1="92" x2="232" y2="92" stroke="var(--text-muted)" stroke-width="1" />
        <path d="${pawPath}" fill="var(--accent-secondary-soft)" stroke="${d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-secondary)"}" stroke-width="2.4" stroke-linejoin="round" />
        <text x="68" y="${Math.max(40, pPeakY - 4).toFixed(1)}" font-size="7" font-weight="800" fill="var(--accent-coral)">Ppeak ${d.ppeak}</text>
        <text x="118" y="${Math.min(86, pPlatY + 11).toFixed(1)}" font-size="7" font-weight="800" fill="var(--accent-primary)">Hold Pplat ${d.pplat}</text>

        <!-- Bottom Flow -->
        <line x1="42" y1="158" x2="232" y2="158" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3 2" />
        <path d="${flowPath}" fill="none" stroke="var(--viz-blue)" stroke-width="2.4" />
        ${!d.flowTouchesZero ? `<circle cx="222" cy="172" r="4.5" fill="var(--accent-coral)" /><text x="166" y="198" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-coral)">TIDAK Kembali Ke 0 = AUTO-PEEP!</text>` : `<text x="166" y="198" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-primary)">Ekspirasi Tuntas Ke Garis 0</text>`}

        <line x1="${scanX.toFixed(1)}" y1="36" x2="${scanX.toFixed(1)}" y2="206" stroke="var(--text-primary)" stroke-width="1.6" stroke-dasharray="3 3" />

        <!-- Right DOPE + Comparison Card -->
        <rect x="254" y="10" width="216" height="212" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="362" y="28" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">Algoritma Cito: D - O - P - E</text>
        ${[
          { k: "D - Displacement", v: "ETT tercabut / masuk bronkus kanan (cek ETCO2!)" },
          { k: "O - Obstruction", v: "Sekret kental / tertekuk / gigit ETT (Ppeak↑, Pplat N)" },
          { k: "P - Pneumothorax", v: "Barotrauma akut (Ppeak↑ & Pplat↑ + hipotensi!)" },
          { k: "E - Equipment", v: "Lepas ventilator, bagging manual 100% O2 segera!" }
        ].map((item, idx) => `
          <rect x="264" y="${38 + idx * 38}" width="196" height="31" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
          <text x="272" y="${52 + idx * 38}" font-size="7.5" font-weight="800" fill="var(--accent-primary)">${item.k}</text>
          <text x="272" y="${63 + idx * 38}" font-size="6.8" font-weight="700" fill="var(--text-primary)">${item.v}</text>
        `).join("")}
        <text x="362" y="206" text-anchor="middle" font-size="7.2" font-weight="800" fill="var(--accent-coral)">Selisih (Ppeak - Pplat) = ${d.ppeak - d.pplat} cmH2O</text>
      </svg>
    `;
  }

  function renderPulmoMvTroubleshootWidget() {
    const mode = PULMO_MV_MODES[pulmoVizState.mvMode] ? pulmoVizState.mvMode : "auto_peep";
    const phase = clampNum(pulmoVizState.mvPhase, 0, 100, 50);
    const d = PULMO_MV_MODES[mode];

    const controlsTop = `
      <div class="mb-2.5">
        ${renderCardioTabRow("viz-pulmo-mv-tabs", Object.entries(PULMO_MV_MODES).map(([k, v]) => ({
          key: k, label: v.label, onclick: `window.InternaApp.updatePulmoMvViz('${k}', null, true)`
        })), mode)}
      </div>
    `;
    const controlsBottom = renderCardioSliderBlock({
      key: "pulmoMv",
      label: "Simulasi Sapuan Siklus Gelombang Ventilator (0–100%):",
      pillText: `${Math.round(phase)}%`,
      min: 0, max: 100, step: 1, value: phase,
      trackBg: "linear-gradient(90deg, rgba(0,122,255,0.3), rgba(225,29,72,0.34))",
      oninput: "window.InternaApp.updatePulmoMvViz(null, this.value, true)",
      presets: [
        { label: "Inspirasi Puncak", val: 20, active: phase >= 10 && phase <= 30 },
        { label: "Inspiratory Hold (Pplat)", val: 48, active: phase > 30 && phase <= 62 },
        { label: "Akhir Ekspirasi", val: 92, active: phase >= 80 }
      ]
    });

    return renderCardioWidgetCard({
      key: "pulmoMv",
      title: "Simulator Gelombang Ventilator (Ppeak vs Pplat), Auto-PEEP & Algoritma DOPE",
      tag: "Ventilasi Mekanik • KKI 3B",
      controlsTop,
      svgHtml: buildPulmoMvSvg(mode, phase),
      controlsBottom,
      info: {
        tone: d.tone,
        rKey: `mv-${mode}`,
        title: `${d.label} — Ppeak ${d.ppeak} | Pplat ${d.pplat} (&Delta;=${d.ppeak - d.pplat} cmH2O)`,
        c1Label: "Analisis Kurva & Mekanika",
        c1Body: d.c1,
        c2Label: "Tindakan Bedside Cito",
        c2Body: d.c2
      },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Saat pasien PPOK / status asmatikus di ventilator tiba-tiba <strong>hipotensi syok</strong>, jangan langsung dorong vasopresor atau naikkan RR — lepas sirkuit ventilator sejenak untuk mengosongkan <strong>Auto-PEEP</strong> lalu turunkan frekuensi napas!</p>`
    });
  }

  function updatePulmoMvViz(modeIn, phaseIn, fromUser = true) {
    if (fromUser && phaseIn !== null && phaseIn !== undefined) cancelAllVizAnimations();
    if (PULMO_MV_MODES[modeIn]) pulmoVizState.mvMode = modeIn;
    if (phaseIn !== null && phaseIn !== undefined) pulmoVizState.mvPhase = clampNum(phaseIn, 0, 100, 50);

    const mode = pulmoVizState.mvMode;
    const phase = pulmoVizState.mvPhase;
    const d = PULMO_MV_MODES[mode];
    syncVizPresets("viz-pulmo-mv-tabs", Object.keys(PULMO_MV_MODES).map((k) => k === mode));
    syncSliderAndPill("viz-pulmoMv-slider", "viz-pulmoMv-pill", phase, `${Math.round(phase)}%`);
    syncVizPresets("viz-pulmoMv-presets", [phase >= 10 && phase <= 30, phase > 30 && phase <= 62, phase >= 80]);
    swapVizSvgFrame("viz-pulmoMv-frame", buildPulmoMvSvg(mode, phase));
    updateVizReadout("viz-pulmoMv-readout", d.tone, formatVizReadoutHtml(
      `${d.label} — Ppeak ${d.ppeak} | Pplat ${d.pplat} (&Delta;=${d.ppeak - d.pplat} cmH2O)`,
      "Analisis Kurva & Mekanika", d.c1, "Tindakan Bedside Cito", d.c2,
      `<p class="mt-1.5"><strong>Jebakan Ujian PAPDI:</strong> Solusi Auto-PEEP: lepas sirkuit sesaat (dekompresi), <strong>TURUNKAN RR</strong>, &amp; perpanjang waktu ekspirasi!</p>`
    ), `mv-${mode}`);
  }

  // --- P18. Kalkulator RSBI Penyapihan Ventilator, Titrasi BiPAP & STOP-BANG OSA (pulmo-5-2 Extra) ---
  function calcPulmoNivRsbi(presetKey) {
    const rrEl = document.getElementById("pulmo-rsbi-rr");
    const vtEl = document.getElementById("pulmo-rsbi-vt");
    const ipapEl = document.getElementById("pulmo-rsbi-ipap");
    const epapEl = document.getElementById("pulmo-rsbi-epap");
    const sbIds = ["sb-snore", "sb-tired", "sb-obs", "sb-bp", "sb-bmi", "sb-age", "sb-neck", "sb-male"];

    const PRESETS = {
      pass_sbt: { rr: 18, vt: 450, ipap: 14, epap: 5, sb: [false, false, false, false, false, true, false, true] },
      fail_sbt: { rr: 34, vt: 240, ipap: 16, epap: 6, sb: [true, true, false, true, false, true, false, false] },
      bipap_copd: { rr: 24, vt: 380, ipap: 18, epap: 6, sb: [true, true, false, true, false, true, true, true] },
      osa_ohs: { rr: 16, vt: 420, ipap: 20, epap: 10, sb: [true, true, true, true, true, true, true, true] }
    };
    if (presetKey && PRESETS[presetKey]) {
      const pr = PRESETS[presetKey];
      if (rrEl) rrEl.value = pr.rr;
      if (vtEl) vtEl.value = pr.vt;
      if (ipapEl) ipapEl.value = pr.ipap;
      if (epapEl) epapEl.value = pr.epap;
      sbIds.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(pr.sb[idx]);
      });
      syncVizPresets("viz-pulmo-rsbi-presets", Object.keys(PRESETS).map((k) => k === presetKey));
    } else if (presetKey !== undefined) {
      syncVizPresets("viz-pulmo-rsbi-presets", [false, false, false, false]);
    }

    const rr = clampNum(rrEl?.value || 18, 6, 55, 18);
    const vtMl = clampNum(vtEl?.value || 450, 120, 950, 450);
    const ipap = clampNum(ipapEl?.value || 14, 8, 28, 14);
    const epap = clampNum(epapEl?.value || 5, 4, 16, 5);
    const sbScore = sbIds.reduce((sum, id) => sum + (document.getElementById(id)?.checked ? 1 : 0), 0);

    const rsbi = rr / (vtMl / 1000);
    const psDiff = Math.max(0, ipap - epap);
    const passRsbi = rsbi < 105;

    let tone = passRsbi ? "info" : "danger";
    let toneColor = passRsbi ? "var(--accent-primary)" : "var(--accent-coral)";
    if (passRsbi && sbScore >= 5) {
      tone = "warning";
      toneColor = "var(--accent-secondary)";
    }
    const badge = `RSBI ${Math.round(rsbi)} (${passRsbi ? "<105 Siap SBT" : ">=105 Gagal!"})`;
    updateCalcGauge("calc-pulmo-rsbi", clampNum(rsbi / 180, 0, 1, 0.3), badge, toneColor);

    const res = document.getElementById("widget-pulmo-rsbi-result");
    if (!res) return;
    updateCalcReadoutTone(
      res,
      tone,
      `rsbi-${Math.round(rsbi)}-${psDiff}-${sbScore}`,
      `
        <p class="font-bold text-[var(--text-primary)]">${badge} | BiPAP PS (&Delta; = IPAP-EPAP): ${psDiff} cmH2O | STOP-BANG: ${sbScore}/8</p>
        <div class="viz-readout-grid mt-1">
          <p>&bull; <strong>Weaning SAT + SBT:</strong> RSBI = ${rr} / ${(vtMl / 1000).toFixed(2)} L = <strong>${rsbi.toFixed(1)}</strong> (${passRsbi ? "Peluang sukses SBT T-piece/PS rendah tinggi &rarr; evaluasi Cuff-Leak Test &amp; refleks batuk!" : "Gagal SBT! Jangan ekstubasi; koreksi elektrolit [K/PO4/Mg], overload cairan, atau Auto-PEEP!"}).</p>
          <p>&bull; <strong>Titrasi BiPAP &amp; OSA/OHS:</strong> Untuk membuang CO2 naikkan <strong>IPAP</strong> (memperbesar &Delta;PS = ${psDiff} cmH2O); untuk oksigenasi/OSA naikkan <strong>EPAP (${epap})</strong>. STOP-BANG <strong>${sbScore}/8</strong> (${sbScore >= 5 ? "RISIKO TINGGI OSA &rarr; Rujuk PSG!" : sbScore >= 3 ? "Risiko Sedang OSA" : "Risiko Rendah"}). Ingat pembeda: <strong>OHS memiliki hiperkapnia siang hari (PaCO2 &gt;45)!</strong></p>
        </div>
      `
    );
  }

  function renderPulmoNivRsbiCalcWidget() {
    const sbLabels = [
      ["sb-snore", "S: Snoring keras"],
      ["sb-tired", "T: Tired / ngantuk siang"],
      ["sb-obs", "O: Observed apnea"],
      ["sb-bp", "P: Hipertensi"],
      ["sb-bmi", "B: BMI &gt;35 kg/m2"],
      ["sb-age", "A: Usia &gt;50 th"],
      ["sb-neck", "N: Lingkar leher &gt;40 cm"],
      ["sb-male", "G: Pria"]
    ];
    return `
      <div class="viz-widget" id="viz-calc-pulmo-rsbi-card">
        <div class="viz-header">
          <span class="viz-title">Kalkulator RSBI Penyapihan Ventilator (f/Vt), Titrasi BiPAP &amp; Skrining STOP-BANG</span>
          <span class="viz-tag">Weaning, NIV &amp; OSA • KKI 3B</span>
        </div>
        <div class="viz-presets mb-2.5" id="viz-pulmo-rsbi-presets">
          <button type="button" class="viz-pill-btn active" onclick="window.InternaApp.calcPulmoNivRsbi('pass_sbt')">Siap Ekstubasi (RSBI &lt;105)</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoNivRsbi('fail_sbt')">Gagal Weaning (&ge;105)</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoNivRsbi('bipap_copd')">BiPAP PPOK Akut</button>
          <button type="button" class="viz-pill-btn" onclick="window.InternaApp.calcPulmoNivRsbi('osa_ohs')">OSA Berat / OHS</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5" style="align-items:end;">
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rsbi-rr">Napas f (/mnt)</label><input type="number" id="pulmo-rsbi-rr" value="18" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoNivRsbi()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rsbi-vt">Tidal Vol (mL)</label><input type="number" id="pulmo-rsbi-vt" step="20" value="450" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoNivRsbi()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rsbi-ipap">IPAP (cmH2O)</label><input type="number" id="pulmo-rsbi-ipap" value="14" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoNivRsbi()" /></div>
          <div style="min-width:0;"><label class="viz-slider-label block mb-1" for="pulmo-rsbi-epap">EPAP (cmH2O)</label><input type="number" id="pulmo-rsbi-epap" value="5" class="viz-calc-input w-full" oninput="window.InternaApp.calcPulmoNivRsbi()" /></div>
        </div>
        <div class="viz-calc-checklist mb-2.5">
          ${sbLabels.map(([id, lbl], idx) => renderCalcCheckItem(id, "window.InternaApp.calcPulmoNivRsbi()", lbl, { checked: idx === 5 || idx === 7 })).join("")}
        </div>
        ${renderCalcGaugeSvg("calc-pulmo-rsbi", "RAPID SHALLOW BREATHING INDEX (RSBI = f / Vt [Liter])", 0.22, "RSBI 40 (<105 Siap SBT)", "var(--accent-primary)", [
          { from: 0, to: 0.58, fill: "var(--accent-primary)", rx: 7, label: "<105 Sukses SBT", textFill: "var(--accent-primary)" },
          { from: 0.58, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">=105 Gagal Weaning", textFill: "var(--accent-coral)" }
        ])}
        <div id="widget-pulmo-rsbi-result" class="viz-readout" data-tone="info" data-last-key="rsbi-init">
          <p class="font-bold text-[var(--text-primary)]">RSBI 40 (&lt;105 Siap SBT) | BiPAP PS (&Delta; = IPAP-EPAP): 9 cmH2O | STOP-BANG: 2/8</p>
          <p class="mt-1">Kontraindikasi mutlak NIV (BiPAP/CPAP): henti napas, koma/tidak dapat lindungi jalan napas, syok refrakter, perdarahan/muntah masif, atau trauma wajah. Aturan kunci BiPAP: <strong>Naikkan IPAP buang CO2, naikkan EPAP naikkan O2!</strong></p>
        </div>
      </div>
    `;
  }

  // =========================================================================


  function renderPulmoModuleWidget(type) {
    if (type === "pulmo-spiro-viz") return renderPulmoSpiroWidget();
    if (type === "pulmo-asthma-gina-viz") return renderPulmoAsthmaGinaWidget();
    if (type === "pulmo-copd-gold-viz") return renderPulmoCopdGoldWidget();
    if (type === "pulmo-hemoptysis-viz") return renderPulmoHemoptysisWidget();
    if (type === "pulmo-cap-strata-viz") return renderPulmoCapStrataWidget();
    if (type === "pulmo-tb-dili-viz") return renderPulmoTbDiliWidget();
    if (type === "pulmo-tbro-bpalm-viz") return renderPulmoTbroBpalmWidget();
    if (type === "pulmo-aspergillosis-histo-viz") return renderPulmoAspergillosisWidget();
    if (type === "pulmo-light-calc") return renderPulmoLightCalcWidget();
    if (type === "pulmo-wsd-ptx-viz") return renderPulmoWsdPtxWidget();
    if (type === "pulmo-mediastinum-svcs-viz") return renderPulmoMediastinumWidget();
    if (type === "pulmo-ild-hrct-viz") return renderPulmoIldHrctWidget();
    if (type === "pulmo-ph-hemodynamic-viz") return renderPulmoPhWidget();
    if (type === "pulmo-oncology-spn-viz") return renderPulmoOncologySpnWidget();
    if (type === "pulmo-ards-vent-viz") return renderPulmoArdsVentWidget();
    if (type === "pulmo-rox-pbw-calc") return renderPulmoRoxPbwCalcWidget();
    if (type === "pulmo-mv-troubleshoot-viz") return renderPulmoMvTroubleshootWidget();
    if (type === "pulmo-niv-rsbi-calc") return renderPulmoNivRsbiCalcWidget();
    return null;
  }

  R.registerWidgetRenderer(renderPulmoModuleWidget);
  R.registerMotionProvider(function (key) {
    if (key === "pulmoSpiro") return { min: 0, max: 100, start: 0, end: 100, duration: 6800, get: () => pulmoVizState.spiroPhase, apply: (v) => updatePulmoSpiroViz(null, v, null, false) };
    if (key === "pulmoTbDili") return { min: 0, max: 28, start: 0, end: 28, duration: 7600, get: () => pulmoVizState.tbDiliDay, apply: (v) => updatePulmoTbDiliViz(null, v, null, false) };
    if (key === "pulmoWsd") return { min: 0, max: 100, start: 0, end: 100, duration: 5800, get: () => pulmoVizState.wsdPhase, apply: (v) => updatePulmoWsdViz(null, v, false) };
    if (key === "pulmoArds") return { min: 4.5, max: 10, start: 5.5, end: 9.8, duration: 6400, get: () => pulmoVizState.ardsVt, apply: (v) => updatePulmoArdsViz(null, v, null, false) };
    if (key === "pulmoMv") return { min: 0, max: 100, start: 0, end: 100, duration: 6000, get: () => pulmoVizState.mvPhase, apply: (v) => updatePulmoMvViz(null, v, false) };
    return null;
  });

  Object.assign(R.handlers, { updatePulmoSpiroViz, updatePulmoAsthmaGinaViz, updatePulmoCopdGoldViz, updatePulmoHemoptysisViz, updatePulmoCapStrataViz, updatePulmoTbDiliViz, updatePulmoTbroBpalmViz, updatePulmoFungusViz, calcPulmoLight, updatePulmoWsdViz, updatePulmoMediastinumViz, updatePulmoIldViz, updatePulmoPhViz, updatePulmoOncoViz, updatePulmoArdsViz, calcPulmoRoxPbw, updatePulmoMvViz, calcPulmoNivRsbi });
})(window);
