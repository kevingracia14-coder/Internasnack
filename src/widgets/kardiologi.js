/* ==========================================================================
   InternaSnack — Kardiologi & Kedokteran Vaskular Interactive Widgets
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

  const cardioVizState = {
    wavefrontPct: 28,
    reperfMin: 85,
    reperfHosp: "nonpci",
    hstnHour: 1.0,
    hstnProfile: "rulein",
    bnpVal: 720,
    bnpAge: "50_75",
    bnpConf: "none",
    htEscSbp: 148,
    htEscRisk: "high",
    htMap: 165,
    htChronic: true,
    htHmod: "enceph",
    territoryTab: "ant",
    lipidRisk: "very_high",
    lipidStep: 2,
    stevQuad: "B",
    stevSbp: "ge110",
    shockMechTab: "vsr",
    gdmtTab: "pillars",
    tachyTab: "wpw",
    tachyStable: true,
    afCareTab: "rate",
    afLvef: "lt40",
    afDur: "ge48",
    bradyTab: "mob1",
    valvType: "as",
    valvManeuver: "base",
    periTab: "peri",
    tampTab: "tamp",
    aortaTab: "dissection",
    peTab: "spiral",
    peRisk: "high"
  };

  function svgArrowMarker(id, colorVar) {
    return `<defs><marker id="${id}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0.6 L5.2,3 L0,5.4 z" fill="${colorVar}" /></marker></defs>`;
  }

  function svgEcgGridBg(x, y, w, h, step = 16) {
    const lines = [];
    for (let gx = x + step; gx < x + w; gx += step) {
      lines.push(`<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="var(--border-subtle)" stroke-width="0.6" opacity="0.6" />`);
    }
    for (let gy = y + step; gy < y + h; gy += step) {
      lines.push(`<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="var(--border-subtle)" stroke-width="0.6" opacity="0.6" />`);
    }
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
      ${lines.join("")}
    `;
  }


  // --- C1. STEMI Wavefront Transmural & Biomarker Kinetics (0-10 Hari) ---
  const WAVEFRONT_SERIES = {
    myo: [24, 92, 86, 48, 22, 10, 8, 8],
    ckmb: [8, 28, 76, 90, 62, 18, 10, 8],
    trop: [8, 24, 62, 92, 96, 78, 56, 36]
  };
  const WAVEFRONT_X_STOPS = [0, 14, 28, 44, 60, 74, 88, 100];

  function wavefrontPctToX(pct) {
    return 50 + (clampNum(pct, 0, 100, 0) / 100) * 408;
  }

  function wavefrontValToY(val) {
    return 198 - (val / 100) * 96;
  }

  function getWavefrontPts() {
    return {
      myo: WAVEFRONT_SERIES.myo.map((v, i) => [wavefrontPctToX(WAVEFRONT_X_STOPS[i]), wavefrontValToY(v)]),
      ckmb: WAVEFRONT_SERIES.ckmb.map((v, i) => [wavefrontPctToX(WAVEFRONT_X_STOPS[i]), wavefrontValToY(v)]),
      trop: WAVEFRONT_SERIES.trop.map((v, i) => [wavefrontPctToX(WAVEFRONT_X_STOPS[i]), wavefrontValToY(v)])
    };
  }

  function getWavefrontInfo(pct) {
    const p = clampNum(pct, 0, 100, 28);
    if (p <= 16) {
      return {
        tone: "info",
        rKey: "wf-early",
        pill: "15–30 Menit",
        timeSub: "Iskemia Subendokardium Awal",
        salvage: "±85–95% Dapat Diselamatkan",
        subRatio: 0.25,
        midRatio: 0.0,
        epiRatio: 0.0,
        title: "Fase Hiperakut (15–30 Menit) — Reperfusi Menyelamatkan Hampir Seluruh Dinding",
        c1Label: "Wavefront Miokardium",
        c1Body: "Nekrosis baru menyentuh lapisan <strong>subendokardium</strong> (paling rentan karena tekanan dinding tertinggi & kolateral terkecil). Mid- & epikardium masih viabel!",
        c2Label: "Kinetika Biomarker",
        c2Body: "<strong>hs-cTn sering masih negatif / borderline</strong> di &lt;1 jam awal. Mioglobin mulai naik cepat namun tidak spesifik jantung.",
        trap: "Jangan menunggu hasil Troponin untuk aktivasi Cath Lab / Fibrinolisis jika EKG sudah menunjukkan STEMI — <em>Time Is Muscle!</em>"
      };
    }
    if (p <= 42) {
      return {
        tone: "warning",
        rKey: "wf-prog",
        pill: "2–4 Jam",
        timeSub: "Progresi Nekrosis Wavefront",
        salvage: "±40–65% Masih Viabel",
        subRatio: 0.9,
        midRatio: 0.52,
        epiRatio: 0.14,
        title: "Fenomena Wavefront Aktif (1–4 Jam) — Gelombang Infark Merambat ke Epikardium",
        c1Label: "Wavefront Miokardium",
        c1Body: "Zona nekrosis meluas keluar melewati mid-miokardium (Reimer &amp; Jennings). Reperfusi dini dapat menghasilkan fenomena <em>myocardial stunning</em> yang pulih bertahap.",
        c2Label: "Kinetika Biomarker",
        c2Body: "<strong>hs-cTnI/T &amp; CK-MB naik tajam melintasi cut-off persentil ke-99</strong>. Mioglobin mendekati puncak lalu turun cepat.",
        trap: "Nyeri iskemik menetap di rentang 2–4 jam tetap wajib PPCI ≤120 mnt atau Fibrinolisis ≤10 mnt bila transfer terlambat."
      };
    }
    if (p <= 68) {
      return {
        tone: "danger",
        rKey: "wf-transmural",
        pill: "12–24 Jam",
        timeSub: "Infark Transmural & Puncak Troponin",
        salvage: "Gelombang Q Terbentuk",
        subRatio: 1.0,
        midRatio: 1.0,
        epiRatio: 0.88,
        title: "Nekrosis Transmural Komplit (6–24 Jam) — Puncak hs-cTn & Risiko Aritmia/Mekanik",
        c1Label: "Wavefront Miokardium",
        c1Body: "Seluruh ketebalan dinding (subendokard → epikardium) mengalami nekrosis ireversibel; terbentuk <strong>gelombang Q patologis</strong> &amp; inversi T pasca-ST elevasi.",
        c2Label: "Kinetika Biomarker",
        c2Body: "<strong>hs-cTn memuncak pada 12–24 jam</strong> (dapat bertahan 7–14 hari). CK-MB juga mencapai puncak sekitar jam ke-24.",
        trap: "Pada pasien terlambat datang (&gt;12 jam) tanpa nyeri berjalan/instabilitas, infark umumnya sudah komplit (studi OAT: PCI elektif oklusi total stabil tidak bermanfaat)."
      };
    }
    return {
      tone: "info",
      rKey: "wf-reinfarct",
      pill: "48 Jam – 10 Hari",
      timeSub: "Jendela Re-Infark (CK-MB Turun)",
      salvage: "Fase Remodeling & Penyembuhan",
      subRatio: 1.0,
      midRatio: 1.0,
      epiRatio: 1.0,
      title: "Fase Subakut / Deteksi Re-Infark (48 Jam – 10 Hari) — Peran CK-MB vs hs-cTn",
      c1Label: "Wavefront & Remodeling",
      c1Body: "Miokard nekrotik mulai dilunakkan infiltrat makrofag (rentan <strong>komplikasi mekanik VSR/FWR hari ke-1 s/d ke-7</strong>) sebelum digantikan jaringan parut kolagen.",
      c2Label: "Kinetika Biomarker",
      c2Body: "<strong>CK-MB kembali normal dalam 48–72 jam</strong>, sedangkan hs-cTn tetap tinggi 7–14 hari! Kenaikan ulang CK-MB atau lonjakan hs-cTn &gt;20% mendeteksi <strong>re-infarction</strong>.",
      trap: "Jika pasien mengeluh nyeri dada ulang pada hari ke-4 pasca-STEMI, troponin tunggal yang tinggi belum membedakan sisa infark lama — gunakan CK-MB atau delta hs-cTn ≥20%!"
    };
  }

  function renderStemiWavefrontWidget() {
    const pct = clampNum(cardioVizState.wavefrontPct, 0, 100, 28);
    const pts = getWavefrontPts();
    const cxNum = wavefrontPctToX(pct);
    const cx = cxNum.toFixed(1);
    const my = sampleSmoothCurveY(pts.myo, cxNum).toFixed(1);
    const cky = sampleSmoothCurveY(pts.ckmb, cxNum).toFixed(1);
    const tryy = sampleSmoothCurveY(pts.trop, cxNum).toFixed(1);
    const info = getWavefrontInfo(pct);

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 232" role="img" aria-label="Kurva Wavefront Nekrosis Transmural dan Kinetika Biomarker STEMI">
        <!-- Top Cross Section Myocardium (Epicardium -> Endocardium) -->
        <rect x="50" y="10" width="408" height="62" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="58" y="23" font-size="10.2" font-weight="700" fill="var(--text-primary)">PENAMPANG DINDING LV (FENOMENA WAVEFRONT)</text>
        <text id="viz-stemiWavefront-salvage" x="450" y="23" text-anchor="end" font-size="10" font-weight="700" style="font-variant-numeric: tabular-nums;" fill="var(--accent-coral)">${info.salvage}</text>
        <!-- Layers -->
        <rect x="58" y="29" width="246" height="11" rx="5.5" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <rect id="viz-stemiWavefront-l-epi" x="58" y="29" width="${(246 * info.epiRatio).toFixed(1)}" height="11" rx="5.5" fill="var(--accent-coral)" fill-opacity="0.72" />
        <rect x="58" y="42" width="246" height="11" rx="5.5" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <rect id="viz-stemiWavefront-l-mid" x="58" y="42" width="${(246 * info.midRatio).toFixed(1)}" height="11" rx="5.5" fill="var(--accent-coral)" fill-opacity="0.82" />
        <rect x="58" y="55" width="246" height="11" rx="5.5" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" />
        <rect id="viz-stemiWavefront-l-sub" x="58" y="55" width="${(246 * info.subRatio).toFixed(1)}" height="11" rx="5.5" fill="var(--accent-coral)" fill-opacity="0.92" />
        <text x="312" y="38.5" font-size="9.5" font-weight="700" fill="var(--text-secondary)">Epikardium (Terakhir nekrosis)</text>
        <text x="312" y="51.5" font-size="9.5" font-weight="700" fill="var(--text-secondary)">Mid-Miokardium</text>
        <text x="312" y="64.5" font-size="9.5" font-weight="800" fill="var(--accent-coral)">Subendokardium (Pertama kena!)</text>

        <!-- Bottom Biomarker Curve Zone -->
        <line x1="50" y1="102" x2="458" y2="102" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="50" y1="150" x2="458" y2="150" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="50" y1="198" x2="458" y2="198" stroke="var(--border-strong)" stroke-width="1.2" />
        <text x="45" y="106" text-anchor="end" font-size="10" font-weight="700" fill="var(--text-muted)">Puncak</text>
        <text x="45" y="196" text-anchor="end" font-size="10" font-weight="700" fill="var(--text-muted)">99th URL</text>
        <text x="54" y="214" font-size="10" font-weight="700" fill="var(--text-muted)">15 mnt</text>
        <text x="150" y="214" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)">2–4 jam</text>
        <text x="275" y="214" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)">24 jam</text>
        <text x="372" y="214" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent-secondary)">48–72 jam</text>
        <text x="456" y="214" text-anchor="end" font-size="10" font-weight="700" fill="var(--text-muted)">10 hari</text>

        <path d="${buildSmoothSvgPath(pts.myo)}" fill="none" stroke="var(--viz-purple)" stroke-width="2.2" stroke-dasharray="5 3" />
        <path d="${buildSmoothSvgPath(pts.ckmb)}" fill="none" stroke="var(--accent-secondary)" stroke-width="2.8" stroke-linecap="round" />
        <path d="${buildSmoothSvgPath(pts.trop)}" fill="none" stroke="var(--accent-coral)" stroke-width="3" stroke-linecap="round" />

        <line id="viz-stemiWavefront-cursor" x1="${cx}" y1="84" x2="${cx}" y2="202" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
        <circle id="viz-stemiWavefront-halo" class="osm-pulse-dot" cx="${cx}" cy="${tryy}" r="9.5" fill="var(--accent-coral)" fill-opacity="0.26" />
        <circle id="viz-stemiWavefront-dot-myo" cx="${cx}" cy="${my}" r="4.2" fill="var(--viz-purple)" stroke="var(--bg-surface)" stroke-width="1.6" />
        <circle id="viz-stemiWavefront-dot-ckmb" cx="${cx}" cy="${cky}" r="4.8" fill="var(--accent-secondary)" stroke="var(--bg-surface)" stroke-width="1.6" />
        <circle id="viz-stemiWavefront-dot-trop" cx="${cx}" cy="${tryy}" r="5.2" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.8" />
      </svg>
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "stemiWavefront",
      label: "Geser Waktu Pasca-Oklusi Koroner:",
      pillText: info.pill,
      min: 0,
      max: 100,
      step: 0.5,
      value: pct,
      trackBg: "linear-gradient(90deg, rgba(15,118,110,0.32) 0% 18%, rgba(180,83,9,0.32) 18% 45%, rgba(190,18,60,0.34) 45% 70%, rgba(29,78,216,0.28) 70% 100%)",
      oninput: "window.InternaApp.updateCardioWavefrontViz(this.value, true)",
      presets: [
        { label: "20 mnt: Subendokard", val: 8, active: pct <= 16 },
        { label: "3 jam: Wavefront", val: 28, active: pct > 16 && pct <= 42 },
        { label: "18 jam: Puncak hs-cTn", val: 54, active: pct > 42 && pct <= 68 },
        { label: "72 jam: Cek Re-Infark", val: 82, active: pct > 68 }
      ]
    });

    return renderCardioWidgetCard({
      key: "stemiWavefront",
      title: "Simulator Wavefront Nekrosis Transmural & Kinetika Biomarker STEMI",
      tag: "ESC 2023 • Kurva Waktu",
      svgHtml,
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "hs-cTnI/T (Naik <1j, Bertahan 7–14 hari)" },
        { color: "var(--accent-secondary)", label: "CK-MB (Normal <72j → Re-infarction)" },
        { color: "var(--viz-purple)", label: "Mioglobin (Cepat naik, cepat hilang)", dashed: true }
      ]),
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioWavefrontViz(valInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    const pct = clampNum(valInput, 0, 100, 28);
    cardioVizState.wavefrontPct = pct;
    const info = getWavefrontInfo(pct);
    syncSliderAndPill("viz-stemiWavefront-slider", "viz-stemiWavefront-pill", pct, info.pill);

    const pts = getWavefrontPts();
    const cxNum = wavefrontPctToX(pct);
    const cx = cxNum.toFixed(1);
    const my = sampleSmoothCurveY(pts.myo, cxNum).toFixed(1);
    const cky = sampleSmoothCurveY(pts.ckmb, cxNum).toFixed(1);
    const tryy = sampleSmoothCurveY(pts.trop, cxNum).toFixed(1);

    setSvgAttrs("viz-stemiWavefront-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-stemiWavefront-halo", { cx, cy: tryy });
    setSvgAttrs("viz-stemiWavefront-dot-myo", { cx, cy: my });
    setSvgAttrs("viz-stemiWavefront-dot-ckmb", { cx, cy: cky });
    setSvgAttrs("viz-stemiWavefront-dot-trop", { cx, cy: tryy });
    setSvgAttrs("viz-stemiWavefront-l-sub", { width: (246 * info.subRatio).toFixed(1) });
    setSvgAttrs("viz-stemiWavefront-l-mid", { width: (246 * info.midRatio).toFixed(1) });
    setSvgAttrs("viz-stemiWavefront-l-epi", { width: (246 * info.epiRatio).toFixed(1) });
    const sal = document.getElementById("viz-stemiWavefront-salvage");
    if (sal) sal.textContent = info.salvage;

    syncVizPresets("viz-stemiWavefront-presets", [pct <= 16, pct > 16 && pct <= 42, pct > 42 && pct <= 68, pct > 68]);
    updateVizReadout("viz-stemiWavefront-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C2. STEMI Reperfusion Window Decision (<=120 mnt PPCI vs Fibrinolisis) ---
  function reperfMinToX(mins) {
    return 32 + ((clampNum(mins, 20, 180, 85) - 20) / 160) * 416;
  }

  function getReperfInfo(mins, hosp) {
    const m = Math.round(clampNum(mins, 20, 180, 85));
    const isPci = hosp === "pci";
    if (isPci) {
      const ok = m <= 60;
      return {
        tone: ok ? "info" : "warning",
        rKey: `rp-pci-${ok ? "ok" : "delay"}`,
        pill: `${m} Menit (RS PCI)`,
        decisionBadge: ok ? "PRIMARY PCI TARGET ≤60 MNT TERCAPAI" : "AKTIFKAN PRIMARY PCI SEGERA",
        badgeColor: "var(--accent-primary)",
        title: `RS Berkemapuan PCI — Estimasi Wire Crossing ${m} Menit`,
        c1Label: "Keputusan Strategi (ESC 2023)",
        c1Body: "<strong>Primary PCI (PPCI) Segera!</strong> Target maksimal Diagnosis STEMI → <em>Wire Crossing</em> di RS PCI-capable adalah <strong>≤60 menit</strong> (FMC → EKG 12 sadapan <strong>≤10 menit</strong>).",
        c2Label: "Antitrombotik Pendamping",
        c2Body: "<strong>Aspirin 150–300 mg</strong> kunyah + <strong>Prasugrel 60 mg</strong> atau <strong>Ticagrelor 180 mg</strong> (Clopidogrel 600 mg hanya bila KI) + <strong>UFH 70–100 IU/kg IV</strong> saat prosedur.",
        trap: "Jangan menunda PPCI untuk memberikan fibrinolisis pada pasien yang sudah berada di RS PCI-capable (Kelas III)."
      };
    }
    if (m <= 90) {
      return {
        tone: "info",
        rKey: "rp-tr-optimal",
        pill: `${m} Menit (Transfer)`,
        decisionBadge: "TRANSFER PRIMARY PCI OPTIMAL (≤90 MNT)",
        badgeColor: "var(--accent-primary)",
        title: `RS Non-PCI — Estimasi Transfer ke Wire Crossing ${m} Menit (≤90–120 mnt)`,
        c1Label: "Keputusan Strategi (ESC 2023)",
        c1Body: "Pilih <strong>Transfer Langsung untuk Primary PCI</strong> karena estimasi total ≤120 menit (zona ideal ≤90 mnt untuk transfer antar-RS). Bypass IGD RS penerima langsung ke Cath Lab!",
        c2Label: "Antitrombotik Pra-Transfer",
        c2Body: "Loading <strong>Aspirin 150–300 mg</strong> + P2Y12 poten (Prasugrel/Ticagrelor; cek riwayat stroke/perdarahan) + UFH/Enoxaparin sesuai protokol tim jaringan STEMI.",
        trap: "Hindari <em>facilitated PCI</em> (memberi fibrinolisis penuh tepat sebelum PPCI terencana ≤120 mnt) karena menaikkan perdarahan intrakranial."
      };
    }
    if (m <= 120) {
      return {
        tone: "warning",
        rKey: "rp-tr-border",
        pill: `${m} Menit (Ambang)`,
        decisionBadge: "AMBANG BATAS ≤120 MNT — EVALUASI REALISTIS",
        badgeColor: "var(--accent-secondary)",
        title: `RS Non-PCI — Estimasi ${m} Menit (Zona Batas Kritis ≤120 Menit)`,
        c1Label: "Keputusan Strategi (ESC 2023)",
        c1Body: "PPCI masih dapat dipilih jika tim Cath Lab &amp; transportasi menjamin <em>wire crossing</em> <strong>≤120 menit</strong>. Jika macet / cuaca / birokrasi berisiko melewati 120 mnt → <strong>segera beralih ke Fibrinolisis!</strong>",
        c2Label: "Syarat Fibrinolisis Darurat",
        c2Body: "Pastikan tidak ada kontraindikasi absolut (riwayat ICH kapan pun, stroke iskemik ≤6 bln, trauma kepala berat ≤1 bln, diseksi aorta, perdarahan aktif).",
        trap: "Kesalahan tersering di daerah: memaksakan rujukan 2,5 jam ke kota lain dengan asumsi PPCI lebih baik — keterlambatan &gt;120 menit merusak miokardium lebih berat daripada fibrinolisis dini!"
      };
    }
    return {
      tone: "danger",
      rKey: "rp-fibrino",
      pill: `${m} Menit (>120 mnt)`,
      decisionBadge: "PILIH FIBRINOLISIS ≤10 MENIT!",
      badgeColor: "var(--accent-coral)",
      title: `Estimasi Wire Crossing ${m} Menit (>120 mnt) → STRATEGI PHARMACO-INVASIVE`,
      c1Label: "Fibrinolisis Bolus (≤10 Menit Sejak Dx)",
      c1Body: "Berikan <strong>Tenecteplase (TNK)</strong> atau <strong>Alteplase (tPA)</strong> IV segera (Streptokinase 1,5 juta IU/30–60 mnt bila tidak tersedia) + <strong>Aspirin 150–300 mg + Clopidogrel 300 mg</strong> (&le;75 th; tanpa loading ≥75 th) + <strong>Enoxaparin</strong>.",
      c2Label: "Evaluasi Wajib Menit ke-60 s/d ke-90",
      c2Body: "Sukses (resolusi ST &gt;50% + nyeri reda + AIVR) ➔ <strong>Angiografi rutin dalam 2–24 jam</strong>. Gagal (resolusi ST &lt;50% atau syok) ➔ <strong>RESCUE PCI SEGERA!</strong>",
      trap: "Pada strategi fibrinolisis, <strong>P2Y12 inhibitor yang diizinkan adalah CLOPIDOGREL</strong> (Prasugrel/Ticagrelor pada jam awal pasca-trombolitik menaikkan risiko perdarahan berat!)."
    };
  }

  function renderStemiReperfusionWidget() {
    const mins = clampNum(cardioVizState.reperfMin, 20, 180, 85);
    const hosp = cardioVizState.reperfHosp;
    const cx = reperfMinToX(mins).toFixed(1);
    const info = getReperfInfo(mins, hosp);
    const x60 = reperfMinToX(60).toFixed(1);
    const x90 = reperfMinToX(90).toFixed(1);
    const x120 = reperfMinToX(120).toFixed(1);

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 182" role="img" aria-label="Timeline Batas Waktu Reperfusi STEMI PPCI vs Fibrinolisis">
        <rect x="24" y="12" width="432" height="28" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="34" y="30" font-size="10.2" font-weight="700" fill="var(--text-primary)">TARGET FMC → EKG ≤10 MNT</text>
        <text id="viz-stemiReperf-badge" x="446" y="30" text-anchor="end" font-size="10.2" font-weight="700" style="font-variant-numeric: tabular-nums;" fill="${info.badgeColor}">${info.decisionBadge}</text>

        <!-- Timeline zones -->
        <rect x="32" y="58" width="${(Number(x60) - 32).toFixed(1)}" height="42" rx="8" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <rect x="${x60}" y="58" width="${(Number(x90) - Number(x60)).toFixed(1)}" height="42" fill="var(--viz-blue-soft)" />
        <rect x="${x90}" y="58" width="${(Number(x120) - Number(x90)).toFixed(1)}" height="42" fill="var(--accent-secondary-soft)" />
        <rect x="${x120}" y="58" width="${(448 - Number(x120)).toFixed(1)}" height="42" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />

        <text x="${((32 + Number(x60)) / 2).toFixed(1)}" y="76" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-primary)">PPCI Direct</text>
        <text x="${((32 + Number(x60)) / 2).toFixed(1)}" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-primary)">≤60 mnt</text>
        <text x="${((Number(x60) + Number(x90)) / 2).toFixed(1)}" y="76" text-anchor="middle" font-size="10" font-weight="800" fill="var(--viz-blue)">Transfer</text>
        <text x="${((Number(x60) + Number(x90)) / 2).toFixed(1)}" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--viz-blue)">≤90 mnt</text>
        <text x="${((Number(x90) + Number(x120)) / 2).toFixed(1)}" y="76" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-secondary)">Batas</text>
        <text x="${((Number(x90) + Number(x120)) / 2).toFixed(1)}" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-secondary)">≤120 mnt</text>
        <text x="${((Number(x120) + 448) / 2).toFixed(1)}" y="76" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">FIBRINOLISIS ≤10 MNT</text>
        <text x="${((Number(x120) + 448) / 2).toFixed(1)}" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-coral)">Lalu Pharmaco-Invasive</text>

        <!-- Threshold line 120m -->
        <line x1="${x120}" y1="48" x2="${x120}" y2="122" stroke="var(--accent-coral)" stroke-width="2.4" />
        <text x="${x120}" y="135" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-coral)">BATAS MUTLAK 120 MNT</text>

        <!-- Axis labels -->
        <text x="32" y="114" font-size="9.5" font-weight="700" fill="var(--text-muted)">20 mnt</text>
        <text x="${x60}" y="114" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">60 mnt</text>
        <text x="${x90}" y="114" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">90 mnt</text>
        <text x="448" y="114" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--text-muted)">180 mnt</text>

        <!-- Post-fibrinolysis strip -->
        <rect x="32" y="148" width="204" height="24" rx="10" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
        <text x="134" y="163.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-coral)">60–90 mnt ST↓ &lt;50%: RESCUE PCI!</text>
        <rect x="244" y="148" width="204" height="24" rx="10" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <text x="346" y="163.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-primary)">Sukses: Angiografi 2–24 jam</text>

        <!-- Cursor -->
        <line id="viz-stemiReperf-cursor" x1="${cx}" y1="48" x2="${cx}" y2="104" stroke="var(--text-primary)" stroke-width="2.2" />
        <circle id="viz-stemiReperf-halo" class="osm-pulse-dot" cx="${cx}" cy="79" r="9.5" fill="var(--text-primary)" fill-opacity="0.22" />
        <circle id="viz-stemiReperf-dot" cx="${cx}" cy="79" r="5" fill="var(--text-primary)" stroke="var(--bg-surface)" stroke-width="1.8" />
      </svg>
    `;

    const controlsTop = renderCardioTabRow("viz-stemiReperf-hosp-tabs", [
      { key: "nonpci", label: "RS Non-PCI (Perlu Transfer)", onclick: "window.InternaApp.updateCardioReperfViz(null, 'nonpci')" },
      { key: "pci", label: "RS PCI-Capable (Cath Lab Ada)", onclick: "window.InternaApp.updateCardioReperfViz(null, 'pci')" }
    ], hosp);

    const controlsBottom = renderCardioSliderBlock({
      key: "stemiReperf",
      label: "Estimasi Waktu Dx STEMI → Wire Crossing:",
      pillText: info.pill,
      min: 20,
      max: 180,
      step: 1,
      value: mins,
      trackBg: "linear-gradient(90deg, rgba(15,118,110,0.34) 0% 44%, rgba(180,83,9,0.34) 44% 62.5%, rgba(190,18,60,0.38) 62.5% 100%)",
      oninput: "window.InternaApp.updateCardioReperfViz(this.value, null)",
      presets: [
        { label: "45 mnt (PPCI Cepat)", val: 45, active: mins <= 60 },
        { label: "85 mnt (Transfer ≤90)", val: 85, active: mins > 60 && mins <= 90 },
        { label: "115 mnt (Batas 120)", val: 115, active: mins > 90 && mins <= 120 },
        { label: "150 mnt (Fibrinolisis)", val: 150, active: mins > 120 }
      ]
    });

    return renderCardioWidgetCard({
      key: "stemiReperf",
      title: "Kalkulator Jendela Waktu Reperfusi STEMI (PPCI vs Fibrinolisis)",
      tag: "ESC ACS 2023",
      controlsTop,
      svgHtml,
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioReperfViz(minInput, hospInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (hospInput === "pci" || hospInput === "nonpci") cardioVizState.reperfHosp = hospInput;
    if (minInput !== null && minInput !== undefined) cardioVizState.reperfMin = clampNum(minInput, 20, 180, 85);
    const mins = cardioVizState.reperfMin;
    const hosp = cardioVizState.reperfHosp;
    const cx = reperfMinToX(mins).toFixed(1);
    const info = getReperfInfo(mins, hosp);

    syncVizPresets("viz-stemiReperf-hosp-tabs", [hosp === "nonpci", hosp === "pci"]);
    syncSliderAndPill("viz-stemiReperf-slider", "viz-stemiReperf-pill", mins, info.pill);
    setSvgAttrs("viz-stemiReperf-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-stemiReperf-halo", { cx });
    setSvgAttrs("viz-stemiReperf-dot", { cx });
    const badge = document.getElementById("viz-stemiReperf-badge");
    if (badge) {
      badge.textContent = info.decisionBadge;
      badge.setAttribute("fill", info.badgeColor);
    }
    syncVizPresets("viz-stemiReperf-presets", [mins <= 60, mins > 60 && mins <= 90, mins > 90 && mins <= 120, mins > 120]);
    updateVizReadout("viz-stemiReperf-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C3. NSTE-ACS Algoritma ESC hs-cTn 0h/1h ---
  const HSTN_PROFILES = {
    ruleout_ultra: {
      label: "Rule-Out 0h Sangat Rendah",
      tone: "info",
      color: "var(--accent-primary)",
      pts: [[70, 168], [240, 166], [420, 165]],
      title: "Jalur 1: Rule-Out Tunggal 0h Sangat Rendah (NPV >99%)",
      c1Label: "Syarat Mutlak ESC 0h/1h",
      c1Body: "Kadar hs-cTn pada <strong>0h di bawah ambang sangat rendah</strong> DAN <strong>onset nyeri dada sudah &gt;3 jam</strong>! Tidak perlu menunggu sampel 1h untuk menyingkirkan NSTEMI.",
      c2Label: "Tindak Lanjut & Confounder",
      c2Body: "Pertimbangkan pulang bila EKG normal, skor GRACE rendah, &amp; nyeri tidak rekuren. Evaluasi penyebab nyeri non-koroner (GERD, PE, perikarditis, diseksi).",
      trap: "Jika onset nyeri dada &lt;3 jam (misal baru 45 menit tiba di IGD), hasil 0h sangat rendah <strong>TIDAK BOLEH</strong> dipakai rule-out tunggal — wajib ulang 1h!"
    },
    ruleout_delta: {
      label: "Rule-Out Delta 0h→1h Kecil",
      tone: "info",
      color: "var(--accent-primary)",
      pts: [[70, 148], [240, 144], [420, 142]],
      title: "Jalur 2: Rule-Out 0h Rendah + Delta Δ0h/1h Di Bawah Ambang Assay",
      c1Label: "Interpretasi Algoritma",
      c1Body: "Sampel 0h rendah diikuti sampel tepat <strong>60 menit kemudian (1h)</strong> tanpa kenaikan absolut bermakna → infark akut disingkirkan.",
      c2Label: "Angina Pektoris Tidak Stabil (UA)",
      c2Body: "hs-cTn negatif serial pada nyeri dada tipikal berulang saat istirahat tetap bisa merupakan <strong>Unstable Angina (UA)</strong> — lakukan tes iskemia/CT koroner.",
      trap: "Waktu 0h adalah saat pengambilan darah pertama di IGD (bukan onset nyeri pasien!), dan 1h adalah tepat 60 menit sesudahnya."
    },
    observe: {
      label: "Zona Observasi (Cek 3h + TTE)",
      tone: "warning",
      color: "var(--accent-secondary)",
      pts: [[70, 124], [240, 114], [420, 108]],
      title: "Jalur 3: Observe Zone — Wajib Evaluasi Ulang Jam ke-3 (3h) + Ekokardiografi",
      c1Label: "Kondisi Pasien di Zona Abu-Abu",
      c1Body: "Tidak memenuhi kriteria rule-out maupun rule-in (nilai intermediat atau sering pada lansia/PGK basal tinggi dengan Δ belum konklusif).",
      c2Label: "Langkah Wajib Kelas I",
      c2Body: "Ulang <strong>hs-cTn pada jam ke-3 (3h)</strong> + kerjakan <strong>ekokardiografi bedside (RWMA?)</strong> sebelum memutuskan rawat atau pulang.",
      trap: "4 Confounders hs-cTn: (1) Usia lansia, (2) PGK/uremia, (3) Onset sangat dini (&lt;1–2 jam), dan (4) Syok/takiaritmia/sepsis (infark tipe 2)."
    },
    rulein: {
      label: "Rule-In Tinggi / Δ1h Bermakna",
      tone: "danger",
      color: "var(--accent-coral)",
      pts: [[70, 112], [240, 56], [420, 38]],
      title: "Jalur 4: Rule-In NSTEMI (PPV ~70–75%) — Persiapkan Strategi Invasif",
      c1Label: "Kriteria Diagnostik Rule-In",
      c1Body: "Kadar hs-cTn 0h sudah tinggi bermakna ATAU terdapat <strong>kenaikan absolut Δ0h/1h tajam</strong> melampaui ambang assay (pola <em>rise &amp; fall</em> akut).",
      c2Label: "Tatalaksana & Aturan Kelas III",
      c2Body: "Aspirin 150–300 mg + UFH/Fondaparinux → tentukan waktu angiografi (<strong>&lt;2 jam Very High Risk</strong> vs <strong>&lt;24 jam High Risk</strong>). Cek P2Y12 sesuai waktu angiografi!",
      trap: "<strong>Fibrinolisis KONTRAINDIKASI MUTLAK (Kelas III)</strong> pada NSTE-ACS (trombus putih kaya trombosit), dan <strong>pre-treatment P2Y12 rutin sebelum angiografi tidak dianjurkan</strong> bila menuju kateterisasi &lt;24 jam!"
    }
  };

  function hstnHourToX(hr) {
    const h = clampNum(hr, 0, 3, 1);
    if (h <= 1) return 70 + h * 170;
    return 240 + ((h - 1) / 2) * 180;
  }

  function renderNsteacsHstnWidget() {
    const profKey = HSTN_PROFILES[cardioVizState.hstnProfile] ? cardioVizState.hstnProfile : "rulein";
    const hr = clampNum(cardioVizState.hstnHour, 0, 3, 1);
    const prof = HSTN_PROFILES[profKey];
    const cxNum = hstnHourToX(hr);
    const cx = cxNum.toFixed(1);
    const cy = sampleSmoothCurveY(prof.pts, cxNum).toFixed(1);
    const phaseTag = hr < 0.7 ? "Jam ke-0 (IGD)" : hr < 2.0 ? "Jam ke-1 (Δ0h/1h)" : "Jam ke-3 (Observasi)";
    const rKey = `hstn-${profKey}-${hr < 0.7 ? 0 : hr < 2 ? 1 : 3}`;

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Grafik Algoritma ESC 0h 1h hs-cTn pada NSTE-ACS">
        <!-- Horizontal Zones -->
        <rect x="52" y="20" width="396" height="58" rx="4" fill="var(--accent-coral-soft)" />
        <rect x="52" y="80" width="396" height="52" fill="var(--accent-secondary-soft)" />
        <rect x="52" y="134" width="396" height="46" rx="4" fill="var(--accent-primary-soft)" />
        <text x="442" y="38" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--accent-coral)">ZONA RULE-IN (PPV ~75% → Cath)</text>
        <text x="442" y="109" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--accent-secondary)">OBSERVE ZONE (Cek 3h + TTE)</text>
        <text x="442" y="160" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--accent-primary)">ZONA RULE-OUT (NPV &gt;99%)</text>

        <!-- Time columns -->
        <line x1="70" y1="20" x2="70" y2="180" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="240" y1="20" x2="240" y2="180" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="420" y1="20" x2="420" y2="180" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <text x="70" y="195" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">0h (Darah IGD)</text>
        <text x="240" y="195" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">1h (+60 mnt)</text>
        <text x="420" y="195" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">3h (Evaluasi Lanjut)</text>

        <!-- Faded reference tracks + active highlighted path -->
        <path d="${buildSmoothSvgPath(HSTN_PROFILES.rulein.pts)}" fill="none" stroke="var(--accent-coral)" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.35" />
        <path d="${buildSmoothSvgPath(HSTN_PROFILES.observe.pts)}" fill="none" stroke="var(--accent-secondary)" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.35" />
        <path d="${buildSmoothSvgPath(HSTN_PROFILES.ruleout_delta.pts)}" fill="none" stroke="var(--accent-primary)" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.35" />
        <path id="viz-nsteacsHstn-active-path" d="${buildSmoothSvgPath(prof.pts)}" fill="none" stroke="${prof.color}" stroke-width="3.2" stroke-linecap="round" />

        <line id="viz-nsteacsHstn-cursor" x1="${cx}" y1="18" x2="${cx}" y2="182" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
        <circle id="viz-nsteacsHstn-halo" class="osm-pulse-dot" cx="${cx}" cy="${cy}" r="9.5" fill="${prof.color}" fill-opacity="0.28" />
        <circle id="viz-nsteacsHstn-dot" cx="${cx}" cy="${cy}" r="5.2" fill="${prof.color}" stroke="var(--bg-surface)" stroke-width="1.8" />
      </svg>
    `;

    const controlsTop = renderCardioTabRow("viz-nsteacsHstn-tabs", [
      { key: "ruleout_ultra", label: "0h Sangat Rendah", onclick: "window.InternaApp.updateCardioHstnViz(null, 'ruleout_ultra')" },
      { key: "ruleout_delta", label: "0h→1h Δ Rendah", onclick: "window.InternaApp.updateCardioHstnViz(null, 'ruleout_delta')" },
      { key: "observe", label: "Zona Observasi", onclick: "window.InternaApp.updateCardioHstnViz(null, 'observe')" },
      { key: "rulein", label: "Rule-In (NSTEMI)", onclick: "window.InternaApp.updateCardioHstnViz(null, 'rulein')" }
    ], profKey);

    const controlsBottom = renderCardioSliderBlock({
      key: "nsteacsHstn",
      label: "Geser Waktu Sampling Serial:",
      pillText: phaseTag,
      min: 0,
      max: 3,
      step: 0.05,
      value: hr,
      trackBg: "linear-gradient(90deg, rgba(15,118,110,0.3) 0% 33%, rgba(180,83,9,0.32) 33% 100%)",
      oninput: "window.InternaApp.updateCardioHstnViz(this.value, null)",
      presets: [
        { label: "0h: Sampel IGD", val: 0, active: hr < 0.7 },
        { label: "1h: Cek Δ60 mnt", val: 1, active: hr >= 0.7 && hr < 2.0 },
        { label: "3h: Observasi/TTE", val: 3, active: hr >= 2.0 }
      ]
    });

    return renderCardioWidgetCard({
      key: "nsteacsHstn",
      title: "Simulator Algoritma ESC 0h/1h High-Sensitivity Troponin (hs-cTn)",
      tag: "ESC ACS 2023 • Class I",
      controlsTop,
      svgHtml,
      controlsBottom,
      info: { ...prof, rKey },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${prof.trap}</p>`
    });
  }

  function updateCardioHstnViz(hrInput, profInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (HSTN_PROFILES[profInput]) cardioVizState.hstnProfile = profInput;
    if (hrInput !== null && hrInput !== undefined) cardioVizState.hstnHour = clampNum(hrInput, 0, 3, 1);
    const profKey = cardioVizState.hstnProfile;
    const hr = cardioVizState.hstnHour;
    const prof = HSTN_PROFILES[profKey];
    const cxNum = hstnHourToX(hr);
    const cx = cxNum.toFixed(1);
    const cy = sampleSmoothCurveY(prof.pts, cxNum).toFixed(1);
    const phaseTag = hr < 0.7 ? "Jam ke-0 (IGD)" : hr < 2.0 ? "Jam ke-1 (Δ0h/1h)" : "Jam ke-3 (Observasi)";

    syncVizPresets("viz-nsteacsHstn-tabs", ["ruleout_ultra", "ruleout_delta", "observe", "rulein"].map((k) => k === profKey));
    syncSliderAndPill("viz-nsteacsHstn-slider", "viz-nsteacsHstn-pill", hr, phaseTag);
    syncVizPresets("viz-nsteacsHstn-presets", [hr < 0.7, hr >= 0.7 && hr < 2.0, hr >= 2.0]);

    setSvgAttrs("viz-nsteacsHstn-active-path", { d: buildSmoothSvgPath(prof.pts), stroke: prof.color });
    setSvgAttrs("viz-nsteacsHstn-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-nsteacsHstn-halo", { cx, cy, fill: prof.color });
    setSvgAttrs("viz-nsteacsHstn-dot", { cx, cy, fill: prof.color });

    updateVizReadout("viz-nsteacsHstn-readout", prof.tone, formatVizReadoutHtml(prof.title, prof.c1Label, prof.c1Body, prof.c2Label, prof.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${prof.trap}</p>`), `hstn-${profKey}`);
  }

  // --- C4. ADHF Age-Stratified NT-proBNP Slider (Rule-Out <300 vs Rule-In 450/900/1800) ---
  function bnpValToX(val) {
    return 40 + ((clampNum(val, 50, 2400, 720) - 50) / 2350) * 414;
  }

  function getBnpInfo(val, ageKey, confKey) {
    const v = Math.round(clampNum(val, 50, 2400, 720));
    const ruleInCut = ageKey === "lt50" ? 450 : ageKey === "50_75" ? 900 : 1800;
    const ageLabel = ageKey === "lt50" ? "<50 thn" : ageKey === "50_75" ? "50–75 thn" : ">75 thn";
    let confNote = "Tidak ada faktor perancu bermakna aktif.";
    if (confKey === "obese") confNote = "<strong>Obesitas (IMT ≥30):</strong> Jaringan adiposa mengekspresi reseptor klirens NPR-C &amp; degradasi meningkat → <strong>kadar NT-proBNP/BNP tampak SEMU RENDAH (~30–50% lebih rendah)!</strong>";
    if (confKey === "ckd_af") confNote = "<strong>CKD / Fibrilasi Atrium / Sepsis:</strong> Penurunan klirens ginjal &amp; regangan atrium kronik membuat <strong>NT-proBNP tampak SEMU TINGGI</strong> tanpa edema paru kardiogenik akut.";

    if (v < 300) {
      return {
        tone: "info",
        rKey: `bnp-out-${ageKey}-${confKey}`,
        ruleInCut,
        pill: `${v} pg/mL`,
        statusTxt: "RULE-OUT AKUT (NPV TINGGI)",
        statusColor: "var(--accent-primary)",
        title: `NT-proBNP ${v} pg/mL (<300 pg/mL) — Gagal Jantung Akut Disingkirkan (Semua Usia!)`,
        c1Label: "Interpretasi Cut-Off Akut",
        c1Body: `<strong>&lt;300 pg/mL (setara BNP &lt;100 pg/mL)</strong> menyingkirkan gagal jantung akut dengan NPV &gt;98%. Cari penyebab sesak non-kardiak (PPOK, pneumonia, asma, PE).`,
        c2Label: `Faktor Perancu (${ageLabel})`,
        c2Body: confNote,
        trap: "Bedakan ambang <strong>IGD/Akut (&lt;300 NT-proBNP; &lt;100 BNP)</strong> dengan ambang <strong>Rawat Jalan Kronik (&lt;125 NT-proBNP; &lt;35 BNP)</strong>! Dan pada terapi <strong>ARNI (Sacubitril/Valsartan)</strong>, pakai NT-proBNP (bukan BNP yang ikut naik akibat inhibisi neprilysin!)."
      };
    }
    if (v < ruleInCut) {
      return {
        tone: "warning",
        rKey: `bnp-gray-${ageKey}-${confKey}`,
        ruleInCut,
        pill: `${v} pg/mL`,
        statusTxt: `GRAY ZONE (Usia ${ageLabel}: <${ruleInCut})`,
        statusColor: "var(--accent-secondary)",
        title: `NT-proBNP ${v} pg/mL — Zona Abu-Abu (Gray Zone untuk Usia ${ageLabel})`,
        c1Label: "Interpretasi Klinis",
        c1Body: `Berada di antara 300 dan batas Rule-In usia ${ageLabel} (<strong>≥${ruleInCut} pg/mL</strong>). Diagnosis tidak bisa dipastikan hanya dari peptida natriuretik — wajib konfirmasi <strong>Ekokardiografi &amp; USG Paru (B-lines)</strong>!`,
        c2Label: "Pengaruh Faktor Perancu",
        c2Body: confNote,
        trap: "Bila pasien obesitas berat masuk dengan ortopnea &amp; B-lines paru tapi NT-proBNP masih di Gray Zone (400 pg/mL), jangan menyingkirkan ADHF — nilai bisa tertekan semu oleh obesitas!"
      };
    }
    return {
      tone: "danger",
      rKey: `bnp-in-${ageKey}-${confKey}`,
      ruleInCut,
      pill: `${v} pg/mL`,
      statusTxt: `RULE-IN ADHF (≥${ruleInCut} pg/mL)`,
      statusColor: "var(--accent-coral)",
      title: `NT-proBNP ${v} pg/mL (≥${ruleInCut} pada Usia ${ageLabel}) — Sangat Mendukung ADHF`,
      c1Label: "Interpretasi Rule-In",
      c1Body: `Melampaui batas <em>age-stratified Rule-In</em> (<strong>&lt;50 th: ≥450</strong>; <strong>50–75 th: ≥900</strong>; <strong>&gt;75 th: ≥1800 pg/mL</strong>). Segera nilai profil Stevenson (basah vs hangat/dingin) dan mulai dekongesti.`,
      c2Label: "Evaluasi Faktor Perancu",
      c2Body: confNote,
      trap: "Kenaikan NT-proBNP pada hipertensi pulmonal berat atau Emboli Paru menandakan disfungsi regangan ventrikel kanan — selalu periksa klinis &amp; TTE!"
    };
  }

  function renderAdhfBnpWidget() {
    const v = clampNum(cardioVizState.bnpVal, 50, 2400, 720);
    const age = cardioVizState.bnpAge;
    const conf = cardioVizState.bnpConf;
    const info = getBnpInfo(v, age, conf);
    const x300 = bnpValToX(300).toFixed(1);
    const xIn = bnpValToX(info.ruleInCut).toFixed(1);
    const cx = bnpValToX(v).toFixed(1);

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 194" role="img" aria-label="Spektrum NT-proBNP Rule-Out dan Age-Stratified Rule-In ADHF">
        <rect x="24" y="12" width="432" height="28" rx="6" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="34" y="30" font-size="10.5" font-weight="800" fill="var(--text-primary)">RULE-OUT AKUT: &lt;300 (BNP &lt;100)</text>
        <text id="viz-adhfBnp-status" x="446" y="30" text-anchor="end" font-size="10.5" font-weight="800" fill="${info.statusColor}">${info.statusTxt}</text>

        <!-- Dynamic colored bands -->
        <rect x="40" y="60" width="${(Number(x300) - 40).toFixed(1)}" height="46" rx="4" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <rect id="viz-adhfBnp-gray-rect" x="${x300}" y="60" width="${(Number(xIn) - Number(x300)).toFixed(1)}" height="46" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" />
        <rect id="viz-adhfBnp-in-rect" x="${xIn}" y="60" width="${(454 - Number(xIn)).toFixed(1)}" height="46" rx="4" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />

        <text x="${((40 + Number(x300)) / 2).toFixed(1)}" y="87" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-primary)">Out</text>
        <text id="viz-adhfBnp-gray-txt" x="${((Number(x300) + Number(xIn)) / 2).toFixed(1)}" y="87" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-secondary)">GRAY ZONE</text>
        <text id="viz-adhfBnp-in-txt" x="${((Number(xIn) + 454) / 2).toFixed(1)}" y="87" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">RULE-IN ADHF</text>

        <!-- Cutoff lines -->
        <line x1="${x300}" y1="50" x2="${x300}" y2="122" stroke="var(--accent-primary)" stroke-width="2" />
        <text x="${x300}" y="135" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">300</text>
        <line id="viz-adhfBnp-in-line" x1="${xIn}" y1="50" x2="${xIn}" y2="122" stroke="var(--accent-coral)" stroke-width="2.2" />
        <text id="viz-adhfBnp-in-cut-lbl" x="${xIn}" y="135" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">${info.ruleInCut} pg/mL</text>
        <text x="40" y="135" font-size="9.5" font-weight="700" fill="var(--text-muted)">50</text>
        <text x="454" y="135" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--text-muted)">2400 pg/mL</text>

        <!-- Reference comparison strip -->
        <rect x="40" y="150" width="414" height="28" rx="6" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="247" y="168" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-secondary)">Rawat Jalan Kronik lebih rendah: NT-proBNP &lt;125 | BNP &lt;35 pg/mL (ARNI naikkan BNP)</text>

        <line id="viz-adhfBnp-cursor" x1="${cx}" y1="48" x2="${cx}" y2="112" stroke="var(--text-primary)" stroke-width="2.2" />
        <circle id="viz-adhfBnp-halo" class="osm-pulse-dot" cx="${cx}" cy="83" r="9.5" fill="var(--text-primary)" fill-opacity="0.22" />
        <circle id="viz-adhfBnp-dot" cx="${cx}" cy="83" r="5" fill="var(--text-primary)" stroke="var(--bg-surface)" stroke-width="1.8" />
      </svg>
    `;

    const controlsTop = `
      ${renderCardioTabRow("viz-adhfBnp-age-tabs", [
        { key: "lt50", label: "Usia <50 thn (≥450)", onclick: "window.InternaApp.updateCardioBnpViz(null, 'lt50', null)" },
        { key: "50_75", label: "50–75 thn (≥900)", onclick: "window.InternaApp.updateCardioBnpViz(null, '50_75', null)" },
        { key: "gt75", label: ">75 thn (≥1800)", onclick: "window.InternaApp.updateCardioBnpViz(null, 'gt75', null)" }
      ], age)}
      ${renderCardioTabRow("viz-adhfBnp-conf-tabs", [
        { key: "none", label: "Tanpa Perancu", onclick: "window.InternaApp.updateCardioBnpViz(null, null, 'none')" },
        { key: "obese", label: "Obesitas (Semu ↓)", onclick: "window.InternaApp.updateCardioBnpViz(null, null, 'obese')" },
        { key: "ckd_af", label: "CKD / AF / Sepsis (Semu ↑)", onclick: "window.InternaApp.updateCardioBnpViz(null, null, 'ckd_af')" }
      ], conf, "viz-presets")}
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "adhfBnp",
      label: "Geser Kadar NT-proBNP (pg/mL):",
      pillText: info.pill,
      min: 50,
      max: 2400,
      step: 10,
      value: v,
      trackBg: "linear-gradient(90deg, rgba(15,118,110,0.34) 0% 12%, rgba(180,83,9,0.34) 12% 38%, rgba(190,18,60,0.36) 38% 100%)",
      oninput: "window.InternaApp.updateCardioBnpViz(this.value, null, null)",
      presets: [
        { label: "145 (Rule-Out)", val: 145, active: v < 300 },
        { label: "550 (Gray / Rule-In <50)", val: 550, active: v >= 300 && v < 900 },
        { label: "1100 (Rule-In 50–75)", val: 1100, active: v >= 900 && v < 1800 },
        { label: "2100 (Rule-In >75)", val: 2100, active: v >= 1800 }
      ]
    });

    return renderCardioWidgetCard({
      key: "adhfBnp",
      title: "Spektrum & Ambang Usia NT-proBNP Gagal Jantung Akut",
      tag: "ESC HF 2021/2023",
      controlsTop,
      svgHtml,
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioBnpViz(valInput, ageInput, confInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (ageInput === "lt50" || ageInput === "50_75" || ageInput === "gt75") cardioVizState.bnpAge = ageInput;
    if (confInput === "none" || confInput === "obese" || confInput === "ckd_af") cardioVizState.bnpConf = confInput;
    if (valInput !== null && valInput !== undefined) cardioVizState.bnpVal = clampNum(valInput, 50, 2400, 720);

    const v = cardioVizState.bnpVal;
    const age = cardioVizState.bnpAge;
    const conf = cardioVizState.bnpConf;
    const info = getBnpInfo(v, age, conf);
    const x300 = bnpValToX(300);
    const xIn = bnpValToX(info.ruleInCut);
    const cx = bnpValToX(v).toFixed(1);

    syncVizPresets("viz-adhfBnp-age-tabs", [age === "lt50", age === "50_75", age === "gt75"]);
    syncVizPresets("viz-adhfBnp-conf-tabs", [conf === "none", conf === "obese", conf === "ckd_af"]);
    syncSliderAndPill("viz-adhfBnp-slider", "viz-adhfBnp-pill", v, info.pill);
    syncVizPresets("viz-adhfBnp-presets", [v < 300, v >= 300 && v < 900, v >= 900 && v < 1800, v >= 1800]);

    setSvgAttrs("viz-adhfBnp-gray-rect", { width: Math.max(4, xIn - x300).toFixed(1) });
    setSvgAttrs("viz-adhfBnp-in-rect", { x: xIn.toFixed(1), width: Math.max(10, 454 - xIn).toFixed(1) });
    setSvgAttrs("viz-adhfBnp-gray-txt", { x: ((x300 + xIn) / 2).toFixed(1) });
    setSvgAttrs("viz-adhfBnp-in-txt", { x: ((xIn + 454) / 2).toFixed(1) });
    setSvgAttrs("viz-adhfBnp-in-line", { x1: xIn.toFixed(1), x2: xIn.toFixed(1) });
    const cutLbl = document.getElementById("viz-adhfBnp-in-cut-lbl");
    if (cutLbl) {
      cutLbl.setAttribute("x", xIn.toFixed(1));
      cutLbl.textContent = `${info.ruleInCut} pg/mL`;
    }
    const statusEl = document.getElementById("viz-adhfBnp-status");
    if (statusEl) {
      statusEl.textContent = info.statusTxt;
      statusEl.setAttribute("fill", info.statusColor);
    }
    setSvgAttrs("viz-adhfBnp-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-adhfBnp-halo", { cx });
    setSvgAttrs("viz-adhfBnp-dot", { cx });

    updateVizReadout("viz-adhfBnp-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C5. Hipertensi Esensial Klasifikasi & Tangga Terapi SPC ESC 2024 ---
  function htEscSbpToX(sbp) {
    return 40 + ((clampNum(sbp, 105, 185, 148) - 105) / 80) * 412;
  }

  function getHtEscInfo(sbp, riskKey) {
    const s = Math.round(clampNum(sbp, 105, 185, 148));
    const isHigh = riskKey === "high";
    if (s < 120) {
      return {
        tone: "info",
        rKey: `htesc-non-${riskKey}`,
        stepActive: 0,
        pill: `TDS ${s} mmHg`,
        catLabel: "NON-ELEVATED BP (<120/<70)",
        catColor: "var(--accent-primary)",
        title: `Non-Elevated Blood Pressure (TDS ${s} mmHg) — Kategori Optimal Baru ESC 2024`,
        c1Label: "Evaluasi & Target",
        c1Body: "Pertahankan gaya hidup sehat; ulang penapisan setiap 1–3 tahun (setiap tahun bila usia ≥40 thn atau faktor risiko bertambah).",
        c2Label: "Aturan Obat",
        c2Body: "Tidak perlu terapi farmakologis antihipertensi kecuali ada indikasi spesifik lain (misal GDMT HFrEF/PJK).",
        trap: "ESC 2024 menggantikan istilah 'Normal/High-Normal' menjadi 3 kategori saja: <strong>Non-Elevated (&lt;120/70)</strong>, <strong>Elevated (120–139/70–89)</strong>, dan <strong>Hipertensi (≥140/90)</strong>."
      };
    }
    if (s < 140) {
      const needDrug = isHigh && s >= 130;
      return {
        tone: needDrug ? "warning" : "info",
        rKey: `htesc-elev-${needDrug ? "hi" : "lo"}`,
        stepActive: needDrug ? 1 : 0,
        pill: `TDS ${s} mmHg`,
        catLabel: "ELEVATED BP (120–139 / 70–89)",
        catColor: "var(--accent-secondary)",
        title: `Elevated BP (TDS ${s} mmHg) — ${needDrug ? "≥130 + Risiko KV Tinggi: Mulai Terapi!" : "Intervensi Gaya Hidup 3 Bulan"}`,
        c1Label: "Klasifikasi & Aturan ESC 2024",
        c1Body: needDrug
          ? "Karena <strong>TDS ≥130 mmHg + Risiko KV Tinggi</strong> (ASCVD, DM, PGK, HMOD, SCORE2 ≥10%), jika TD tetap ≥130/80 setelah 3 bulan gaya hidup → <strong>MULAI OBAT!</strong>"
          : "Pada risiko KV rendah-sedang tanpa HMOD/ASCVD/DM/PGK, fokus pada modifikasi gaya hidup (diet DASH/natrium rendah, aktivitas fisik, turun BB).",
        c2Label: "Target TD Saat Diobati (ESC 2024)",
        c2Body: "Target baru ESC 2024 bila mendapat terapi farmakologis dan ditoleransi baik adalah <strong>TDS 120–129 mmHg</strong> (bukan lagi membiarkan di kisaran 135–139!).",
        trap: "Soal Board baru ESC 2024 sering menguji pasien <strong>132/82 mmHg + DM/PGK/ASCVD</strong>: bukan lagi dibiarkan observasi selamanya — tetap membutuhkan inisiasi terapi!"
      };
    }
    if (s < 165) {
      return {
        tone: "warning",
        rKey: `htesc-ht1-${riskKey}`,
        stepActive: 2,
        pill: `TDS ${s} mmHg`,
        catLabel: "HIPERTENSI (≥140/90) — SPC 2 LANGKAH",
        catColor: "var(--accent-secondary)",
        title: `Hipertensi (TDS ${s} mmHg) — Wajib Dual SPC Segera + Gaya Hidup (Target 120–129)`,
        c1Label: "Langkah 1 & 2 (Single-Pill Combination)",
        c1Body: "<strong>Langkah 1 (Kelas I):</strong> Dual SPC dosis rendah <strong>ACEi/ARB + CCB DHP atau Diuretik Thiazide-like</strong> (target kontrol &lt;3 bulan). <strong>Langkah 2:</strong> Naik ke <strong>Triple SPC</strong> (RAAS + CCB + Diuretik).",
        c2Label: "Target Baru & Larangan",
        c2Body: "Turunkan awal &lt;140/90 lalu kejar <strong>120–129 mmHg</strong> jika ditoleransi (prinsip <em>ALARA</em> bila lansia/frailty ≥85 thn).",
        trap: "<strong>Beta-Blocker BUKAN lini pertama hipertensi esensial tanpa komorbid!</strong> Dan <strong>JANGAN pernah mengombinasikan ACEi + ARB</strong> (risiko hiperkalemia &amp; AKI tanpa manfaat tambahan!)."
      };
    }
    return {
      tone: "danger",
      rKey: `htesc-res-${riskKey}`,
      stepActive: 3,
      pill: `TDS ${s} mmHg`,
      catLabel: "DERAJAT 2–3 / CEK RESISTEN (PATHWAY-2)",
      catColor: "var(--accent-coral)",
      title: `Hipertensi Tinggi / Evaluasi Hipertensi Resisten (TDS ${s} mmHg)`,
      c1Label: "Eksklusi Pseudo-Resisten → Langkah 3",
      c1Body: "Pastikan kepatuhan + ABPM/HBPM (singkirkan <em>white-coat</em>!). Bila tetap ≥140/90 meski 3 kelas dosis optimal (termasuk diuretik) → <strong>tambahkan Spironolakton 25–50 mg (Uji PATHWAY-2!)</strong>.",
      c2Label: "Skrining Hipertensi Sekunder",
      c2Body: "Waspadai <strong>Sindrom Conn (hiperaldosteronisme primer + K+ rendah)</strong>, stenosis arteri renalis, feokromositoma, &amp; OSA. Bila eGFR &lt;30, ganti Thiazide ke Chlorthalidone/Loop Diuretic.",
      trap: "Di uji PATHWAY-2, <strong>Spironolakton jauh lebih unggul</strong> daripada Bisoprolol dan Doksazosin sebagai obat ke-4 pada hipertensi resisten sejati (awasi K+ &amp; ginekomastia)!"
    };
  }

  function renderHtEsc2024Widget() {
    const sbp = clampNum(cardioVizState.htEscSbp, 105, 185, 148);
    const risk = cardioVizState.htEscRisk;
    const info = getHtEscInfo(sbp, risk);
    const x120 = htEscSbpToX(120).toFixed(1);
    const x130 = htEscSbpToX(130).toFixed(1);
    const x140 = htEscSbpToX(140).toFixed(1);
    const cx = htEscSbpToX(sbp).toFixed(1);

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Spektrum Klasifikasi Tekanan Darah ESC 2024 dan Tangga SPC">
        <rect x="24" y="10" width="432" height="26" rx="6" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="34" y="27" font-size="10" font-weight="800" fill="var(--text-primary)">TARGET TERAPI ESC 2024: TDS 120–129 MMHG</text>
        <text id="viz-htEsc-cat" x="446" y="27" text-anchor="end" font-size="10" font-weight="800" fill="${info.catColor}">${info.catLabel}</text>

        <!-- BP bar -->
        <rect x="40" y="46" width="${(Number(x120) - 40).toFixed(1)}" height="38" rx="4" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <rect x="${x120}" y="46" width="${(Number(x140) - Number(x120)).toFixed(1)}" height="38" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" />
        <rect x="${x140}" y="46" width="${(452 - Number(x140)).toFixed(1)}" height="38" rx="4" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
        <text x="${((40 + Number(x120)) / 2).toFixed(1)}" y="68" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-primary)">Non-Elev</text>
        <text x="${((Number(x120) + Number(x140)) / 2).toFixed(1)}" y="62" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-secondary)">Elevated BP</text>
        <text x="${((Number(x120) + Number(x140)) / 2).toFixed(1)}" y="74" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--accent-secondary)">(130+: Obat jika FR ↑)</text>
        <text x="${((Number(x140) + 452) / 2).toFixed(1)}" y="68" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">HIPERTENSI (≥140/90)</text>

        <!-- Target zone indicator 120-129 -->
        <rect x="${x120}" y="86" width="${(Number(x130) - Number(x120)).toFixed(1)}" height="12" rx="3" fill="var(--accent-primary)" fill-opacity="0.28" stroke="var(--accent-primary)" />
        <text x="172" y="109" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-primary)">Target Ideal 120–129</text>
        <text x="40" y="100" font-size="9" font-weight="700" fill="var(--text-muted)">105</text>
        <text x="${x120}" y="100" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-primary)">120</text>
        <text x="${x140}" y="100" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent-coral)">140</text>
        <text x="452" y="100" text-anchor="end" font-size="9" font-weight="700" fill="var(--text-muted)">185</text>

        <!-- 3 Step SPC Ladder -->
        <rect id="viz-htEsc-s1" x="28" y="122" width="132" height="66" rx="7" fill="${info.stepActive === 1 ? "var(--accent-secondary-soft)" : "var(--bg-surface-subtle)"}" stroke="${info.stepActive === 1 ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${info.stepActive === 1 ? "2.2" : "1"}" />
        <text x="94" y="140" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">LANGKAH 1: DUAL SPC</text>
        <text x="94" y="156" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">ACEi/ARB +</text>
        <text x="94" y="170" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">CCB / Thiazide-like</text>

        <rect id="viz-htEsc-s2" x="174" y="122" width="132" height="66" rx="7" fill="${info.stepActive === 2 ? "var(--accent-secondary-soft)" : "var(--bg-surface-subtle)"}" stroke="${info.stepActive === 2 ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${info.stepActive === 2 ? "2.2" : "1"}" />
        <text x="240" y="140" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">LANGKAH 2: TRIPLE SPC</text>
        <text x="240" y="156" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">ACEi/ARB + CCB +</text>
        <text x="240" y="170" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">Diuretik (Evaluasi 1–3 bln)</text>

        <rect id="viz-htEsc-s3" x="320" y="122" width="132" height="66" rx="7" fill="${info.stepActive === 3 ? "var(--accent-coral-soft)" : "var(--bg-surface-subtle)"}" stroke="${info.stepActive === 3 ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${info.stepActive === 3 ? "2.2" : "1"}" />
        <text x="386" y="140" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-coral)">LANGKAH 3: RESISTEN</text>
        <text x="386" y="156" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">+ Spironolakton 25–50</text>
        <text x="386" y="170" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">(Uji PATHWAY-2)</text>

        <!-- Cursor -->
        <line id="viz-htEsc-cursor" x1="${cx}" y1="40" x2="${cx}" y2="90" stroke="var(--text-primary)" stroke-width="2.2" />
        <circle id="viz-htEsc-halo" class="osm-pulse-dot" cx="${cx}" cy="65" r="9" fill="var(--text-primary)" fill-opacity="0.22" />
        <circle id="viz-htEsc-dot" cx="${cx}" cy="65" r="4.8" fill="var(--text-primary)" stroke="var(--bg-surface)" stroke-width="1.6" />
      </svg>
    `;

    const controlsTop = renderCardioTabRow("viz-htEsc-risk-tabs", [
      { key: "high", label: "Risiko KV Tinggi (ASCVD / DM / PGK / SCORE2 ≥10%)", onclick: "window.InternaApp.updateCardioHtEscViz(null, 'high')" },
      { key: "low", label: "Risiko KV Rendah-Sedang", onclick: "window.InternaApp.updateCardioHtEscViz(null, 'low')" }
    ], risk);

    const controlsBottom = renderCardioSliderBlock({
      key: "htEsc",
      label: "Geser Tekanan Darah Sistolik Klinik:",
      pillText: info.pill,
      min: 105,
      max: 185,
      step: 1,
      value: sbp,
      trackBg: "linear-gradient(90deg, rgba(15,118,110,0.3) 0% 19%, rgba(180,83,9,0.32) 19% 44%, rgba(190,18,60,0.36) 44% 100%)",
      oninput: "window.InternaApp.updateCardioHtEscViz(this.value, null)",
      presets: [
        { label: "115 (Non-Elev)", val: 115, active: sbp < 120 },
        { label: "134 (Elevated)", val: 134, active: sbp >= 120 && sbp < 140 },
        { label: "148 (Hipertensi)", val: 148, active: sbp >= 140 && sbp < 165 },
        { label: "174 (Cek Resisten)", val: 174, active: sbp >= 165 }
      ]
    });

    return renderCardioWidgetCard({
      key: "htEsc",
      title: "Klasifikasi Tekanan Darah Baru & Tangga Terapi SPC ESC 2024",
      tag: "ESC HTN 2024",
      controlsTop,
      svgHtml,
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioHtEscViz(sbpInput, riskInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (riskInput === "high" || riskInput === "low") cardioVizState.htEscRisk = riskInput;
    if (sbpInput !== null && sbpInput !== undefined) cardioVizState.htEscSbp = clampNum(sbpInput, 105, 185, 148);
    const sbp = cardioVizState.htEscSbp;
    const risk = cardioVizState.htEscRisk;
    const info = getHtEscInfo(sbp, risk);
    const cx = htEscSbpToX(sbp).toFixed(1);

    syncVizPresets("viz-htEsc-risk-tabs", [risk === "high", risk === "low"]);
    syncSliderAndPill("viz-htEsc-slider", "viz-htEsc-pill", sbp, info.pill);
    syncVizPresets("viz-htEsc-presets", [sbp < 120, sbp >= 120 && sbp < 140, sbp >= 140 && sbp < 165, sbp >= 165]);
    setSvgAttrs("viz-htEsc-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-htEsc-halo", { cx });
    setSvgAttrs("viz-htEsc-dot", { cx });
    const cat = document.getElementById("viz-htEsc-cat");
    if (cat) {
      cat.textContent = info.catLabel;
      cat.setAttribute("fill", info.catColor);
    }
    [1, 2, 3].forEach((step) => {
      const box = document.getElementById(`viz-htEsc-s${step}`);
      if (!box) return;
      const on = info.stepActive === step;
      box.setAttribute("fill", on ? (step === 3 ? "var(--accent-coral-soft)" : "var(--accent-secondary-soft)") : "var(--bg-surface-subtle)");
      box.setAttribute("stroke", on ? (step === 3 ? "var(--accent-coral)" : "var(--accent-secondary)") : "var(--border-subtle)");
      box.setAttribute("stroke-width", on ? "2.2" : "1");
    });
    updateVizReadout("viz-htEsc-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C6. Krisis Hipertensi — Kurva Autoregulasi Serebral (CBF vs MAP) & HMOD ---
  const HT_HMOD_DATA = {
    enceph: { label: "Ensefalopati / Maligna", target: "Turunkan MAP 20–25% dalam 1–2 jam (lanjut ~160/100 di 2–6 jam)", drug: "Nikardipin IV (5–15 mg/jam) atau Labetalol IV; hindari turun >25%!" },
    aorta: { label: "Diseksi Aorta", target: "SEGERA (<20 menit): TDS 100–120 mmHg DAN HR <60 x/mnt!", drug: "Esmolol / Labetalol IV DAHULU sebelum Nikardipin / Nitroprusid IV!" },
    scape: { label: "Edema Paru (SCAPE)", target: "SEGERA: Turunkan TDS <140 mmHg + atasi kongesti paru", drug: "Nitrogliserin IV (5–200 mcg/mnt) + Furosemid IV + CPAP/NIV" },
    stroke: { label: "Stroke Iskemik / ICH", target: "Iskemik tPA: <185/110 (tanpa tPA hanya bila ≥220/120 ↓15%/24j); ICH: TDS 130–140", drug: "Nikardipin / Labetalol IV titrasi hati-hati (jangan turunkan drastis!)" },
    eclamps: { label: "Eklampsia / HELLP", target: "Segera <160/105 mmHg (cegah perdarahan intraserebral maternal)", drug: "Labetalol IV atau Nikardipin IV + MgSO₄ + terminasi kehamilan (KI: ACEi/ARB/Nitroprusid!)" },
    urgency: { label: "Hipertensi Urgensi", target: "TD ≥180/120 TANPA HMOD akut → Turunkan perlahan dalam 24–48 jam PO", drug: "Amlodipin / Captopril / Klonidin ORAL. LARANGAN MUTLAK Nifedipin SL & furosemid IV rutin!" }
  };

  function htAutoregMapToX(mapVal) {
    return 52 + ((clampNum(mapVal, 55, 205, 165) - 55) / 150) * 402;
  }

  function getAutoregPts(isChronic) {
    // Plateau normotensi ~60-150; hipertensi kronik bergeser ke kanan ~110-180
    if (!isChronic) {
      return [[52, 166], [70, 122], [180, 118], [306, 114], [380, 74], [454, 42]];
    }
    return [[52, 174], [140, 162], [200, 118], [386, 114], [420, 78], [454, 44]];
  }

  function getAutoregInfo(mapVal, isChronic, hmodKey) {
    const m = Math.round(clampNum(mapVal, 55, 205, 165));
    const hmod = HT_HMOD_DATA[hmodKey] || HT_HMOD_DATA.enceph;
    const lowerBound = isChronic ? 110 : 60;
    const upperBound = isChronic ? 180 : 150;

    if (m < lowerBound) {
      return {
        tone: "danger",
        rKey: `hta-low-${isChronic}-${hmodKey}`,
        pill: `MAP ${m} mmHg`,
        zoneTxt: "ZONA ISKEMIA WATERSHED (TERLALU RENDAH!)",
        zoneColor: "var(--accent-coral)",
        title: `MAP ${m} mmHg — BAHAYA Hipoperfusi / Iskemia Serebral Iatrogenik!`,
        c1Label: "Patofisiologi Autoregulasi",
        c1Body: `Di bawah batas bawah kurva ${isChronic ? "Hipertensi Kronik (~110 mmHg akibat hipertrofi media arteriol)" : "Normotensi (~60 mmHg)"}, arteriol sudah dilatasi maksimal sehingga CBF turun drastis → <strong>infark watershed &amp; kebutaan kortikal</strong>!`,
        c2Label: `Protokol ${hmod.label}`,
        c2Body: `Target: <strong>${hmod.target}</strong>. Agen: <strong>${hmod.drug}</strong>.`,
        trap: "Menurunkan MAP &gt;25% dalam 1 jam pertama atau memberi <strong>Nifedipin sublingual kerja pendek</strong> memicu jatuh bebas ke zona iskemia serebral &amp; nekrosis koroner/renal!"
      };
    }
    if (m <= upperBound) {
      return {
        tone: m >= upperBound - 18 ? "warning" : "info",
        rKey: `hta-safe-${isChronic}-${hmodKey}`,
        pill: `MAP ${m} mmHg`,
        zoneTxt: "PLATEAU AUTOREGULASI AMAN",
        zoneColor: "var(--accent-primary)",
        title: `MAP ${m} mmHg — Zona Plateau Autoregulasi Serebral Aman (Target Penurunan 20–25%)`,
        c1Label: "Patofisiologi Autoregulasi",
        c1Body: `Berada pada rentang plateau autoregulasi (${lowerBound}–${upperBound} mmHg): pembuluh darah serebral mampu menjaga CBF tetap konstan melalui vasokonstriksi/dilatasi adaptif.`,
        c2Label: `Protokol ${hmod.label}`,
        c2Body: `Target: <strong>${hmod.target}</strong>. Agen: <strong>${hmod.drug}</strong>.`,
        trap: "Pada krisis hipertensi maligna dengan natriuresis tekanan tinggi (hipovolemia relatif), hindari pemberian Furosemid IV rutin kecuali terbukti ada edema paru!"
      };
    }
    return {
      tone: "danger",
      rKey: `hta-high-${isChronic}-${hmodKey}`,
      pill: `MAP ${m} mmHg`,
      zoneTxt: "BREAKTHROUGH HIPERPERFUSI (PRES!)",
      zoneColor: "var(--accent-coral)",
      title: `MAP ${m} mmHg — Breakthrough Hyperperfusion → Ensefalopati Hipertensi & PRES!`,
      c1Label: "Patofisiologi Autoregulasi",
      c1Body: `Melampaui batas atas kurva (&gt;${upperBound} mmHg): vasokonstriksi gagal menahan tekanan → dilatasi paksa, kebocoran sawar darah-otak, dan <strong>edema serebri vasogenik oksipital-parietal (PRES)</strong>!`,
      c2Label: `Protokol ${hmod.label}`,
      c2Body: `Target: <strong>${hmod.target}</strong>. Agen: <strong>${hmod.drug}</strong>.`,
      trap: "Penentu Hipertensi Emergensi vs Urgensi adalah <strong>kerusakan organ target AKUT (HMOD)</strong> — bukan sekadar angka TDS ≥180/120! TD 175/105 + diseksi aorta/edema paru adalah Emergensi!"
    };
  }

  function renderHtAutoregWidget() {
    const mapVal = clampNum(cardioVizState.htMap, 55, 205, 165);
    const isChronic = Boolean(cardioVizState.htChronic);
    const hmodKey = cardioVizState.htHmod;
    const ptsNorm = getAutoregPts(false);
    const ptsChr = getAutoregPts(true);
    const activePts = isChronic ? ptsChr : ptsNorm;
    const cxNum = htAutoregMapToX(mapVal);
    const cx = cxNum.toFixed(1);
    const cy = sampleSmoothCurveY(activePts, cxNum).toFixed(1);
    const info = getAutoregInfo(mapVal, isChronic, hmodKey);

    const svgHtml = `
      <svg class="viz-svg" viewBox="0 0 480 206" role="img" aria-label="Kurva Autoregulasi Serebral CBF vs MAP pada Normotensi vs Hipertensi Kronik">
        <!-- Safe & Danger background zones -->
        <rect x="52" y="26" width="${(htAutoregMapToX(isChronic ? 110 : 65) - 52).toFixed(1)}" height="146" fill="var(--accent-coral-soft)" />
        <rect x="${htAutoregMapToX(isChronic ? 110 : 65).toFixed(1)}" y="26" width="${(htAutoregMapToX(isChronic ? 180 : 150) - htAutoregMapToX(isChronic ? 110 : 65)).toFixed(1)}" height="146" fill="var(--accent-primary-soft)" />
        <rect x="${htAutoregMapToX(isChronic ? 180 : 150).toFixed(1)}" y="26" width="${(454 - htAutoregMapToX(isChronic ? 180 : 150)).toFixed(1)}" height="146" fill="var(--accent-coral-soft)" />

        <text x="58" y="18" font-size="10.5" font-weight="800" fill="var(--text-primary)">ALIRAN DARAH OTAK (CBF) VS MAP</text>
        <text id="viz-htAutoreg-zone" x="454" y="18" text-anchor="end" font-size="10" font-weight="800" fill="${info.zoneColor}">${info.zoneTxt}</text>

        <line x1="52" y1="68" x2="454" y2="68" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="52" y1="116" x2="454" y2="116" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <line x1="52" y1="172" x2="454" y2="172" stroke="var(--border-strong)" stroke-width="1.2" />
        <text x="46" y="48" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--text-muted)">Tinggi</text>
        <text x="46" y="118" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--text-muted)">Plateau</text>
        <text x="46" y="170" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--text-muted)">Rendah</text>

        <!-- Curves -->
        <path id="viz-htAutoreg-norm" d="${buildSmoothSvgPath(ptsNorm)}" fill="none" stroke="var(--viz-blue)" stroke-width="${isChronic ? "1.8" : "3.2"}" stroke-dasharray="${isChronic ? "5 3" : "none"}" opacity="${isChronic ? "0.55" : "1"}" />
        <path id="viz-htAutoreg-chr" d="${buildSmoothSvgPath(ptsChr)}" fill="none" stroke="var(--accent-coral)" stroke-width="${isChronic ? "3.2" : "1.8"}" stroke-dasharray="${isChronic ? "none" : "5 3"}" opacity="${isChronic ? "1" : "0.45"}" />

        <text x="86" y="156" font-size="9" font-weight="800" fill="var(--accent-coral)">Iskemia</text>
        <text x="275" y="104" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">Rightward Shift: Plateau 110–180</text>
        <text x="450" y="39" text-anchor="end" font-size="9" font-weight="800" fill="var(--accent-coral)">PRES / Edema</text>

        ${[60, 90, 120, 150, 180, 200].map((mv) => `<text x="${htAutoregMapToX(mv).toFixed(1)}" y="190" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)">${mv}</text>`).join("")}
        <text x="454" y="190" text-anchor="end" font-size="9" font-weight="700" fill="var(--text-muted)">mmHg</text>

        <line id="viz-htAutoreg-cursor" x1="${cx}" y1="26" x2="${cx}" y2="175" stroke="var(--text-primary)" stroke-width="2" stroke-dasharray="4 3" />
        <circle id="viz-htAutoreg-halo" class="osm-pulse-dot" cx="${cx}" cy="${cy}" r="9.5" fill="var(--accent-coral)" fill-opacity="0.28" />
        <circle id="viz-htAutoreg-dot" cx="${cx}" cy="${cy}" r="5" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.8" />
      </svg>
    `;

    const controlsTop = `
      ${renderCardioTabRow("viz-htAutoreg-curve-tabs", [
        { key: "chronic", label: "Kurva Hipertensi Kronik (Geser Kanan 110–180)", onclick: "window.InternaApp.updateCardioAutoregViz(null, true, null)" },
        { key: "norm", label: "Kurva Normotensi (60–150 mmHg)", onclick: "window.InternaApp.updateCardioAutoregViz(null, false, null)" }
      ], isChronic ? "chronic" : "norm")}
      ${renderCardioTabRow("viz-htAutoreg-hmod-tabs", Object.entries(HT_HMOD_DATA).map(([k, v]) => ({
        key: k, label: v.label, onclick: `window.InternaApp.updateCardioAutoregViz(null, null, '${k}')`
      })), hmodKey, "viz-presets")}
    `;

    const controlsBottom = renderCardioSliderBlock({
      key: "htAutoreg",
      label: "Geser Mean Arterial Pressure (MAP):",
      pillText: info.pill,
      min: 55,
      max: 205,
      step: 1,
      value: mapVal,
      trackBg: "linear-gradient(90deg, rgba(190,18,60,0.34) 0% 34%, rgba(15,118,110,0.32) 34% 83%, rgba(190,18,60,0.38) 83% 100%)",
      oninput: "window.InternaApp.updateCardioAutoregViz(this.value, null, null)",
      presets: [
        { label: "MAP 190 (PRES)", val: 190, active: mapVal >= 175 },
        { label: "MAP 145 (Aman ↓20–25%)", val: 145, active: mapVal >= 115 && mapVal < 175 },
        { label: "MAP 85 (Watershed!)", val: 85, active: mapVal < 115 }
      ]
    });

    return renderCardioWidgetCard({
      key: "htAutoreg",
      title: "Kurva Autoregulasi Serebral & Target Penurunan MAP Krisis Hipertensi",
      tag: "ESC HTN 2024",
      controlsTop,
      svgHtml,
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "Kurva Hipertensi Kronik (Geser Kanan)" },
        { color: "var(--viz-blue)", label: "Kurva Normotensi", dashed: true }
      ]),
      controlsBottom,
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioAutoregViz(mapInput, chrInput, hmodInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (chrInput === true || chrInput === false) cardioVizState.htChronic = chrInput;
    if (HT_HMOD_DATA[hmodInput]) cardioVizState.htHmod = hmodInput;
    if (mapInput !== null && mapInput !== undefined) cardioVizState.htMap = clampNum(mapInput, 55, 205, 165);

    const mapVal = cardioVizState.htMap;
    const isChronic = cardioVizState.htChronic;
    const hmodKey = cardioVizState.htHmod;
    const activePts = getAutoregPts(isChronic);
    const cxNum = htAutoregMapToX(mapVal);
    const cx = cxNum.toFixed(1);
    const cy = sampleSmoothCurveY(activePts, cxNum).toFixed(1);
    const info = getAutoregInfo(mapVal, isChronic, hmodKey);

    syncVizPresets("viz-htAutoreg-curve-tabs", [isChronic, !isChronic]);
    syncVizPresets("viz-htAutoreg-hmod-tabs", Object.keys(HT_HMOD_DATA).map((k) => k === hmodKey));
    syncSliderAndPill("viz-htAutoreg-slider", "viz-htAutoreg-pill", mapVal, info.pill);
    syncVizPresets("viz-htAutoreg-presets", [mapVal >= 175, mapVal >= 115 && mapVal < 175, mapVal < 115]);

    const normPath = document.getElementById("viz-htAutoreg-norm");
    const chrPath = document.getElementById("viz-htAutoreg-chr");
    if (normPath && chrPath) {
      normPath.setAttribute("stroke-width", isChronic ? "1.8" : "3.2");
      normPath.setAttribute("stroke-dasharray", isChronic ? "5 3" : "none");
      normPath.setAttribute("opacity", isChronic ? "0.55" : "1");
      chrPath.setAttribute("stroke-width", isChronic ? "3.2" : "1.8");
      chrPath.setAttribute("stroke-dasharray", isChronic ? "none" : "5 3");
      chrPath.setAttribute("opacity", isChronic ? "1" : "0.45");
    }
    const zoneEl = document.getElementById("viz-htAutoreg-zone");
    if (zoneEl) {
      zoneEl.textContent = info.zoneTxt;
      zoneEl.setAttribute("fill", info.zoneColor);
    }
    setSvgAttrs("viz-htAutoreg-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-htAutoreg-halo", { cx, cy });
    setSvgAttrs("viz-htAutoreg-dot", { cx, cy });

    updateVizReadout("viz-htAutoreg-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // =========================================================================
  // KARDIOLOGI INTERACTIVE SVG VISUALIZATIONS — PART B1 (ATLASES & TREES 7-12)
  // =========================================================================

  // --- C7. STEMI Teritori Koroner, Sadapan Resiprokal & STEMI-Equivalents ---
  const TERRITORY_DATA = {
    ant: {
      tabLabel: "Anterior (LAD)",
      tone: "danger",
      culprit: "Left Anterior Descending (LAD)",
      leads: "Elevasi ST: V1–V4 / V1–V6, I, aVL | Resiprokal: Depresi ST II, III, aVF (jika LAD proksimal)",
      lesion: { x: 118, y: 86 },
      ekgTitle: "V2–V4: Coved ST↑ + Resiprokal II/III/aVF↓",
      ekgPath: "M236,118 L250,118 Q256,110 262,118 L272,118 L276,124 L283,56 L289,112 Q302,68 322,74 Q338,80 348,118 L368,118",
      recPath: "M236,162 L254,162 L259,154 L265,162 L274,162 L279,144 L285,176 L293,174 L306,174 Q316,184 328,162 L368,162",
      c1Label: "Anatomi & Dampak Hemodinamik",
      c1Body: "Oklusi <strong>LAD</strong> menginfark dinding anterior &amp; septum (40–50% massa LV!). Risiko tinggi <strong>syok pompa LV, VSR, &amp; LBBB/Mobitz II mendadak</strong>.",
      c2Label: "Kunci Pembacaan EKG",
      c2Body: "Jika elevasi ST hingga V1–V6 + I + aVL DISERTAI depresi ST resiprokal di II, III, aVF → oklusi <strong>LAD Proksimal sebelum cabang S1/D1</strong>.",
      trap: "Sgarbossa &amp; Smith-Modified Sgarbossa dipakai bila pasien datang dengan <strong>LBBB baru/lama atau irama pacu RV</strong> dan nyeri dada khas!"
    },
    inf: {
      tabLabel: "Inferior + V4R (RCA/LCx)",
      tone: "warning",
      culprit: "RCA (80%) atau LCx (20%) + Cek V3R/V4R!",
      leads: "RCA: ST↑ III > II, ST↓ I/aVL, V4R↑ | LCx: ST↑ II ≥ III, ST↑ I/aVL/V5-V6",
      lesion: { x: 64, y: 116 },
      ekgTitle: "Lead III > II: ST↑ + Wajib Rekam Sadapan Kanan V4R!",
      ekgPath: "M236,118 L250,118 Q256,110 262,118 L272,118 L276,122 L283,64 L290,110 Q306,70 326,76 Q340,86 350,118 L368,118",
      recPath: "M236,162 L252,162 L258,154 L264,162 L274,162 L279,142 L285,170 L292,162 L302,148 Q314,136 326,154 L368,162",
      c1Label: "Diferensiasi RCA vs LCx",
      c1Body: "Pada RCA: vektor ke kanan-bawah membuat <strong>ST↑ III &gt; II</strong> &amp; <strong>ST↓ dalam di I/aVL</strong>. Pada LCx: ST↑ II ≥ III dan I/aVL isoelektrik/naik.",
      c2Label: "Aturan Emas Infark Ventrikel Kanan",
      c2Body: "<strong>WAJIB rekam sadapan kanan V3R–V4R</strong> di semua STEMI Inferior! Bila ST↑ ≥0,5 mm di V4R: paru bersih, JVP↑, hipotensi pasca-nitrat.",
      trap: "<strong>KONTRAINDIKASI Nitrat (ISDN/NTG), Morfin berlebih, &amp; Diuretik</strong> pada STEMI Inferior + Infark RV — menurunkan preload langsung memicu kolaps hemodinamik!"
    },
    post: {
      tabLabel: "Posterior (V7–V9)",
      tone: "warning",
      culprit: "LCx atau RCA cabang PDA/PLV",
      leads: "V1–V3: ST↓ horizontal ≥0,5 mm + R tinggi (R/S >1) + T tegak → V7–V9 ST↑ ≥0,5 mm!",
      lesion: { x: 162, y: 124 },
      ekgTitle: "V1–V2 (Mirror): ST↓ + R Tinggi ↔ V7–V9: ST↑",
      ekgPath: "M236,104 L250,104 L255,96 L261,104 L271,104 L276,62 L282,116 L292,126 L312,126 Q326,106 340,104 L368,104",
      recPath: "M236,162 L254,162 L262,155 L270,162 L278,162 L284,130 L290,152 Q305,134 324,138 Q338,144 348,162 L368,162",
      c1Label: "Prinsip Gambar Cermin (Mirror-Image)",
      c1Body: "Elektroda anterior V1–V3 melihat dinding posterior dari depan (terbalik!): elevasi ST posterior tampak sebagai <strong>depresi ST horizontal V1–V3 + gelombang R tinggi lebar (R/S &gt;1)</strong>.",
      c2Label: "Konfirmasi Wajib V7–V9",
      c2Body: "Pasang 3 sadapan punggung (<strong>V7</strong> axila posterior, <strong>V8</strong> mid-skapula, <strong>V9</strong> paravertebral kiri): cukup <strong>ST↑ ≥0,5 mm</strong> untuk kriteria reperfusi STEMI!",
      trap: "Jangan keliru menganggap depresi ST horizontal V1–V3 terisolasi sebagai NSTEMI biasa — jika dianggap NSTEMI dan hanya diobservasi, oklusi LCx terlewat berjam-jam!"
    },
    lm: {
      tabLabel: "Left Main (aVR)",
      tone: "danger",
      culprit: "Left Main Coronary Artery (LMCA) / 3-VD",
      leads: "ST↑ di aVR + V1 (aVR > V1) + ST↓ difus ≥6 sadapan (I, II, aVL, V3–V6)",
      lesion: { x: 112, y: 60 },
      ekgTitle: "aVR ST↑ + Depresi ST Difus Multilead (≥6 Sadapan)",
      ekgPath: "M236,118 L252,118 L258,112 L264,118 L272,118 L278,136 L284,96 Q298,84 316,90 L338,118 L368,118",
      recPath: "M236,160 L254,160 L262,154 L270,160 L278,142 L284,174 L294,176 L312,176 Q324,186 338,160 L368,160",
      c1Label: "Arti Hemodinamik Kritis",
      c1Body: "Iskemia subendokardial global ventrikel kiri mengarahkan vektor ST ke bahu kanan (sadapan <strong>aVR</strong>). Risiko tinggi gagal pompa akut &amp; henti jantung.",
      c2Label: "Manajemen & Pertimbangan CABG",
      c2Body: "Perlakukan sebagai <strong>Very High-Risk ACS</strong> → angiografi koroner darurat (&lt;2 jam); konsultasikan tim Bedah Toraks Kardiovaskular untuk kesiapan CABG/dukungan mekanik.",
      trap: "Jangan berikan P2Y12 poten dosis loading tanpa diskusi bila pasien jelas menunjukkan pola LMCA berat yang mungkin segera masuk kamar operasi CABG darurat!"
    },
    equiv: {
      tabLabel: "De Winter & Wellens",
      tone: "danger",
      culprit: "LAD Proksimal Kritis (Oklusi Subtotal / Trombus Lisis)",
      leads: "De Winter: ST↓ upsloping V1–V5 + T tinggi simetris | Wellens A/B: T bifasik / inversi dalam simetris V2–V3",
      lesion: { x: 118, y: 78 },
      ekgTitle: "De Winter (Atas) & Wellens A (Bawah)",
      ekgPath: "M236,116 L252,116 L259,110 L266,116 L274,116 L280,82 L286,128 L296,120 L314,76 Q326,64 338,116 L368,116",
      recPath: "M236,162 L252,162 L259,155 L266,162 L274,162 L280,136 L286,164 L298,162 Q308,144 318,162 Q328,184 342,162 L368,162",
      c1Label: "Pola De Winter (~2% Oklusi LAD)",
      c1Body: "Tanpa elevasi ST klasik prekordial: tampak <strong>depresi J-point upsloping &gt;1 mm</strong> bersambung ke <strong>gelombang T hiperakut tinggi simetris V1–V5</strong> (+ ST↑ ringan aVR). Reperfusi PPCI SEGERA!",
      c2Label: "Sindrom Wellens (Tipe A 25% / Tipe B 75%)",
      c2Body: "Pasien sering sudah <strong>bebas nyeri saat direkam</strong> &amp; troponin normal/sedikit naik: V2–V3 menunjukkan <strong>T bifasik (+/-) [A]</strong> atau <strong>inversi T dalam simetris [B]</strong> = stenosis kritis LAD proksimal.",
      trap: "<strong>LARANGAN MUTLAK UJI TREADMILL (Stress Test)</strong> pada Sindrom Wellens! Memicu takikardia/stres olahraga meruntuhkan plak LAD proksimal menjadi STEMI anterior masif atau VF!"
    }
  };

  function buildTerritorySvg(key) {
    const info = TERRITORY_DATA[key] || TERRITORY_DATA.ant;
    return `
      <svg class="viz-svg" viewBox="0 0 480 206" role="img" aria-label="Atlas Anatomi Koroner dan EKG ${info.tabLabel}">
        <!-- Left Coronary Tree -->
        <rect x="8" y="8" width="206" height="190" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="111" y="25" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-primary)">PETA ANATOMI KORONER</text>
        <!-- Aortic Root -->
        <ellipse cx="111" cy="48" rx="22" ry="11" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <text x="111" y="51.5" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">AORTA</text>
        <!-- RCA path (left viewer side = patient right) -->
        <path d="M90,52 Q56,64 56,104 Q56,142 82,162" fill="none" stroke="${key === "inf" ? "var(--accent-coral)" : "var(--text-muted)"}" stroke-width="${key === "inf" ? "4.5" : "3.2"}" stroke-linecap="round" />
        <path d="M62,126 L78,144" fill="none" stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round" />
        <text x="42" y="102" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-secondary)">RCA</text>
        <text x="48" y="148" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-muted)">RV/V4R</text>
        <!-- LMCA -> LAD & LCx -->
        <path d="M132,52 L116,66" fill="none" stroke="${key === "lm" ? "var(--accent-coral)" : "var(--text-primary)"}" stroke-width="4.5" stroke-linecap="round" />
        <path d="M116,66 Q116,112 114,166" fill="none" stroke="${key === "ant" || key === "equiv" ? "var(--accent-coral)" : "var(--viz-blue)"}" stroke-width="${key === "ant" || key === "equiv" ? "4.5" : "3.2"}" stroke-linecap="round" />
        <path d="M116,66 Q160,84 166,142" fill="none" stroke="${key === "post" ? "var(--accent-coral)" : "var(--viz-purple)"}" stroke-width="${key === "post" ? "4.5" : "3"}" stroke-linecap="round" />
        <path d="M115,104 L142,122" fill="none" stroke="var(--viz-blue)" stroke-width="2" stroke-linecap="round" />
        <text x="102" y="64" text-anchor="end" font-size="8.5" font-weight="800" fill="var(--text-primary)">LM</text>
        <text x="102" y="138" text-anchor="end" font-size="9" font-weight="800" fill="var(--viz-blue)">LAD</text>
        <text x="180" y="114" font-size="9" font-weight="800" fill="var(--viz-purple)">LCx</text>

        <!-- Occlusion Pulse Marker -->
        <circle class="osm-lesion-pulse" cx="${info.lesion.x}" cy="${info.lesion.y}" r="11" fill="var(--accent-coral)" fill-opacity="0.28" stroke="var(--accent-coral)" stroke-width="1.6" />
        <circle cx="${info.lesion.x}" cy="${info.lesion.y}" r="5" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.5" />
        <text x="111" y="186" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">${info.culprit.slice(0, 32)}</text>

        <!-- Right ECG Panel -->
        ${svgEcgGridBg(222, 8, 250, 190, 18)}
        <text x="347" y="25" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-primary)">${info.ekgTitle}</text>
        <line x1="232" y1="118" x2="462" y2="118" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <line x1="232" y1="162" x2="462" y2="162" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <text x="234" y="45" font-size="9" font-weight="700" fill="var(--accent-coral)">Sadapan Primer:</text>
        <path class="osm-draw" pathLength="240" style="--osm-len: 240; --osm-i: 0;" d="${info.ekgPath}" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <text x="234" y="140" font-size="9" font-weight="700" fill="var(--viz-blue)">${key === "equiv" ? "Wellens Tipe A (Bifasik):" : key === "post" ? "Konfirmasi V7–V9:" : key === "inf" ? "Cek V4R (RVMI):" : "Resiprokal / Terkait:"}</text>
        <path class="osm-draw" pathLength="240" style="--osm-len: 240; --osm-i: 1;" d="${info.recPath}" fill="none" stroke="var(--viz-blue)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <text x="347" y="191" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-muted)">Kalibrasi Skematis ESC 2023</text>
      </svg>
    `;
  }

  function renderStemiTerritoryWidget() {
    const key = TERRITORY_DATA[cardioVizState.territoryTab] ? cardioVizState.territoryTab : "ant";
    const info = TERRITORY_DATA[key];
    return renderCardioWidgetCard({
      key: "stemiTer",
      title: "Atlas Teritori Koroner, Resiprokal & STEMI-Equivalents (ESC 2023)",
      tag: "EKG & Anatomi",
      controlsTop: renderCardioTabRow("viz-stemiTer-tabs", Object.entries(TERRITORY_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioTerritoryViz('${k}')`
      })), key),
      svgHtml: buildTerritorySvg(key),
      info: { ...info, rKey: `ter-${key}`, title: `${info.tabLabel} — ${info.leads}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioTerritoryViz(tabInput) {
    const key = TERRITORY_DATA[tabInput] ? tabInput : "ant";
    cardioVizState.territoryTab = key;
    syncVizPresets("viz-stemiTer-tabs", Object.keys(TERRITORY_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-stemiTer-frame", buildTerritorySvg(key));
    const info = TERRITORY_DATA[key];
    updateVizReadout("viz-stemiTer-readout", info.tone, formatVizReadoutHtml(`${info.tabLabel} — ${info.leads}`, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `ter-${key}`);
  }

  // --- C8. CCS Dislipidemia — Target LDL-C & Eskalasi Statin -> Ezetimibe -> PCSK9i ---
  const LIPID_RISKS = {
    extreme: { label: "Extreme (<40)", target: 40, full: "Sangat Tinggi Rekuren (≥2 event KV dalam 2 thn)", note: "Target &lt;40 mg/dL (&lt;1,0 mmol/L) + turun ≥50% (Kelas IIb)." },
    very_high: { label: "Very High (<55)", target: 55, full: "Very High Risk (ASCVD / PJK / DM+HMOD / eGFR <30)", note: "Wajib <strong>&lt;55 mg/dL (&lt;1,4 mmol/L) DAN penurunan ≥50% dari baseline</strong>!" },
    high: { label: "High (<70)", target: 70, full: "High Risk (DM tanpa HMOD ≥10 th / eGFR 30–59 / Kolesterol >310)", note: "Target <strong>&lt;70 mg/dL (&lt;1,8 mmol/L) DAN penurunan ≥50% dari baseline</strong>." },
    moderate: { label: "Moderate (<100)", target: 100, full: "Moderate Risk (DM muda durasi pendek tanpa FR / SCORE2 sedang)", note: "Target LDL-C <strong>&lt;100 mg/dL</strong> (&lt;2,6 mmol/L)." }
  };
  const LIPID_STEPS = [
    { key: 0, label: "0. Baseline (160 mg/dL)", ldl: 160, drop: "0%", drug: "Belum terapi penurun lipid (Baseline LDL-C 160 mg/dL)" },
    { key: 1, label: "1. + Statin Intensitas Tinggi (~−50%)", ldl: 80, drop: "−50%", drug: "Atorvastatin 40–80 mg atau Rosuvastatin 20–40 mg/hari" },
    { key: 2, label: "2. + Ezetimibe 10 mg (~−65%)", ldl: 56, drop: "−65%", drug: "Statin Intensitas Tinggi + Ezetimibe 10 mg/hari (hambat NPC1L1 usus)" },
    { key: 3, label: "3. + PCSK9 Inhibitor (~−85%)", ldl: 24, drop: "−85%", drug: "Statin + Ezetimibe + Evolocumab / Alirocumab SK (atau Inclisiran)" }
  ];

  function buildLipidSvg(riskKey, stepIdx) {
    const risk = LIPID_RISKS[riskKey] || LIPID_RISKS.very_high;
    const step = LIPID_STEPS[stepIdx] || LIPID_STEPS[2];
    const met = step.ldl < risk.target && stepIdx > 0;
    const targetX = (40 + (risk.target / 170) * 395).toFixed(1);

    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Eskalasi Penurunan LDL-C terhadap Target Risiko Kardiovaskular">
        <rect x="20" y="10" width="440" height="28" rx="6" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="30" y="28" font-size="10.5" font-weight="800" fill="var(--text-primary)">BASELINE 160 → TARGET &lt;${risk.target} MG/DL</text>
        <text x="450" y="28" text-anchor="end" font-size="10.5" font-weight="800" fill="${met ? "var(--accent-primary)" : "var(--accent-coral)"}">${met ? "TARGET TERCAPAI (" + step.ldl + " mg/dL)" : "BELUM TERCAPAI (" + step.ldl + " > " + risk.target + ")"}</text>

        <!-- Bars for each step -->
        ${LIPID_STEPS.map((st, idx) => {
          const y = 52 + idx * 32;
          const bw = ((st.ldl / 170) * 395).toFixed(1);
          const isCur = idx === stepIdx;
          const stMet = st.ldl < risk.target && idx > 0;
          const fill = isCur ? (stMet ? "var(--accent-primary)" : "var(--accent-coral)") : "var(--border-strong)";
          return `
            <g onclick="window.InternaApp.updateCardioLipidViz(null, ${idx})" role="button">
              <text x="40" y="${y + 16}" font-size="10" font-weight="${isCur ? "800" : "600"}" fill="${isCur ? "var(--text-primary)" : "var(--text-muted)"}">${st.label.split("(")[0].trim()}</text>
              <rect x="40" y="${y + 20}" width="395" height="8" rx="4" fill="var(--bg-surface-subtle)" />
              <rect class="viz-smooth-bar" x="40" y="${y + 20}" width="${bw}" height="8" rx="4" fill="${fill}" opacity="${isCur ? "0.95" : "0.4"}" />
              <text x="${Math.min(458, 46 + Number(bw)).toFixed(1)}" y="${y + 27}" font-size="9.5" font-weight="800" fill="${isCur ? fill : "var(--text-muted)"}">${st.ldl} mg/dL</text>
            </g>
          `;
        }).join("")}

        <!-- Target vertical line -->
        <line x1="${targetX}" y1="46" x2="${targetX}" y2="180" stroke="var(--accent-primary)" stroke-width="2.2" stroke-dasharray="4 3" />
        <text x="${targetX}" y="192" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">Batas Target &lt;${risk.target} mg/dL</text>
      </svg>
    `;
  }

  function getLipidReadout(riskKey, stepIdx) {
    const risk = LIPID_RISKS[riskKey] || LIPID_RISKS.very_high;
    const step = LIPID_STEPS[stepIdx] || LIPID_STEPS[2];
    const met = step.ldl < risk.target && stepIdx > 0;
    return {
      tone: met ? "info" : stepIdx === 0 ? "danger" : "warning",
      rKey: `lip-${riskKey}-${stepIdx}`,
      title: `${risk.full} — LDL-C saat ini: ${step.ldl} mg/dL (${step.drop})`,
      c1Label: "Regimen Terapi Aktif",
      c1Body: `<strong>${step.drug}</strong>. ${risk.note}`,
      c2Label: "Manajemen Trigliserida & Intoleransi Statin",
      c2Body: "Jika intoleran statin → tambahkan <strong>Bempedoic Acid</strong> + Ezetimibe. Bila <strong>TG 135–499 mg/dL + ASCVD</strong> meski statin optimal → tambah <strong>Icosapent Ethyl</strong>. Jika <strong>TG ≥500 mg/dL</strong> → <strong>Fenofibrat</strong> cegah pankreatitis!",
      trap: "<strong>Jangan hentikan High-Intensity Statin</strong> hanya karena LDL-C sudah turun di bawah 55 atau &lt;40 mg/dL — statin tetap dipertahankan seumur hidup untuk stabilisasi plak &amp; efek pleiotropik!"
    };
  }

  function renderLipidLdlWidget() {
    const riskKey = LIPID_RISKS[cardioVizState.lipidRisk] ? cardioVizState.lipidRisk : "very_high";
    const stepIdx = clampNum(cardioVizState.lipidStep, 0, 3, 2);
    const info = getLipidReadout(riskKey, stepIdx);
    const controlsTop = `
      ${renderCardioTabRow("viz-lipid-risk-tabs", Object.entries(LIPID_RISKS).map(([k, v]) => ({
        key: k, label: v.label, onclick: `window.InternaApp.updateCardioLipidViz('${k}', null)`
      })), riskKey)}
      ${renderCardioTabRow("viz-lipid-step-tabs", LIPID_STEPS.map((s) => ({
        key: String(s.key), label: s.label.split("(")[0].trim(), onclick: `window.InternaApp.updateCardioLipidViz(null, ${s.key})`
      })), String(stepIdx), "viz-presets")}
    `;
    return renderCardioWidgetCard({
      key: "lipid",
      title: "Algoritma Terapi Penurun Lipid Bertingkat & Target LDL-C",
      tag: "ESC/EAS & PAPDI",
      controlsTop,
      svgHtml: buildLipidSvg(riskKey, stepIdx),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioLipidViz(riskInput, stepInput) {
    if (LIPID_RISKS[riskInput]) cardioVizState.lipidRisk = riskInput;
    if (stepInput !== null && stepInput !== undefined) cardioVizState.lipidStep = clampNum(stepInput, 0, 3, 2);
    const riskKey = cardioVizState.lipidRisk;
    const stepIdx = cardioVizState.lipidStep;
    syncVizPresets("viz-lipid-risk-tabs", Object.keys(LIPID_RISKS).map((k) => k === riskKey));
    syncVizPresets("viz-lipid-step-tabs", [0, 1, 2, 3].map((i) => i === stepIdx));
    swapVizSvgFrame("viz-lipid-frame", buildLipidSvg(riskKey, stepIdx));
    const info = getLipidReadout(riskKey, stepIdx);
    updateVizReadout("viz-lipid-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C9. ADHF Kuadran Nohria-Stevenson 2x2 & Protokol Diuretik/UNa+ ---
  const STEVENSON_QUADS = {
    A: { label: "A: Warm & Dry (Kompensasi)", x: 24, y: 24, tone: "info", title: "Kuadran A — Warm & Dry (Perfusi Baik, Tanpa Kongesti)", tx: "Stabil/kompensasi! Optimalkan <strong>4 Pilar GDMT kronik (ARNI, BB, MRA, SGLT2i)</strong> sebelum pulang.", note: "Evaluasi pencetus 'CHAMPIT' &amp; edukasi pembatasan cairan/natrium bila perlu." },
    B: { label: "B: Warm & Wet (Paling Sering!)", x: 242, y: 24, tone: "warning", title: "Kuadran B — Warm & Wet (Kongesti Paru/Sistemik + Perfusi Baik)", tx: "<strong>Furosemid IV</strong> (20–40 mg IV jika <em>naive</em>, atau 1–2× dosis oral harian) + <strong>NIV (CPAP/BiPAP)</strong> bila sesak berat/SCAPE.", note: "Cek <strong>Natrium Urin 2 jam (target ≥50–70 mEq/L)</strong> &amp; UOP 6 jam (&gt;100–150 mL/jam). Bila gagal → gandakan dosis + blokade sekuensial (Thiazide/Acetazolamide)." },
    L: { label: "L: Cold & Dry (Hipovolemik)", x: 24, y: 112, tone: "warning", title: "Kuadran L — Cold & Dry (Hipoperfusi TANPA Kongesti)", tx: "Uji coba <strong>fluid challenge hati-hati</strong> (kristaloid kecil 250 mL) bila curiga deplesi intravaskular berlebih; hentikan diuretik sementara.", note: "Jika tetap dingin tanpa respons cairan → pertimbangkan inotropik hati-hati &amp; evaluasi infark RV / tamponade / emboli paru." },
    C: { label: "C: Cold & Wet (Syok / Kritis!)", x: 242, y: 112, tone: "danger", title: "Kuadran C — Cold & Wet (Hipoperfusi + Kongesti Berat!)", tx: "Inotropik (<strong>Dobutamin</strong> atau <strong>Levosimendan/Milrinon</strong> bila pengguna beta-bloker kronik!) + vasopresor (<strong>Norepinefrin</strong> bila hipotensi berat).", note: "<strong>Jangan beri beta-bloker baru</strong> atau vasodilator tunggal saat TDS &lt;90 mmHg! Mulai diuretik IV baru setelah perfusi ginjal memadai." }
  };

  function buildStevensonSvg(quadKey, sbpKey) {
    const sbpTxt = sbpKey === "ge110" ? "TDS ≥110: Vasodilator NTG IV Boleh!" : sbpKey === "90_109" ? "TDS 90–109: Furosemid ± NTG hati-hati" : "TDS <90: SYOK → Norepinefrin + Dobutamin!";
    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Matriks 2x2 Kuadran Hemodinamik Nohria-Stevenson ADHF">
        ${Object.entries(STEVENSON_QUADS).map(([k, q]) => {
          const active = k === quadKey;
          const fill = active ? (k === "C" ? "var(--accent-coral-soft)" : k === "A" ? "var(--accent-primary-soft)" : "var(--accent-secondary-soft)") : "var(--bg-surface-subtle)";
          const stroke = active ? (k === "C" ? "var(--accent-coral)" : k === "A" ? "var(--accent-primary)" : "var(--accent-secondary)") : "var(--border-subtle)";
          const shortTitle = k === "A" ? "A: WARM & DRY" : k === "B" ? "B: WARM & WET" : k === "L" ? "L: COLD & DRY" : "C: COLD & WET";
          const sub = k === "A" ? "Hangat • Paru Bersih" : k === "B" ? "Hangat • Ronki/Edema!" : k === "L" ? "Akral Dingin • Tanpa Ronki" : "Akral Dingin + Kongesti!";
          return `
            <g class="viz-svg-tile" onclick="window.InternaApp.updateCardioStevensonViz('${k}', null)" role="button">
              <rect x="${q.x}" y="${q.y - 12}" width="212" height="80" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${active ? "2.4" : "1.2"}" />
              <text x="${q.x + 106}" y="${q.y + 18}" text-anchor="middle" font-size="11.5" font-weight="800" fill="${active ? stroke : "var(--text-primary)"}">${shortTitle}</text>
              <text x="${q.x + 106}" y="${q.y + 38}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-secondary)">${sub}</text>
              ${active ? `<rect x="${q.x + 56}" y="${q.y + 46}" width="100" height="16" rx="8" fill="${stroke}" /><text x="${q.x + 106}" y="${q.y + 57.5}" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--bg-surface)">TERPILIH</text>` : ""}
            </g>
          `;
        }).join("")}
        <text x="130" y="180" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-muted)">← KERING (Tanpa Kongesti)</text>
        <text x="348" y="180" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">BASAH (Kongesti +) →</text>
        <rect x="24" y="184" width="430" height="16" rx="4" fill="var(--bg-surface-subtle)" />
        <text x="239" y="195.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="${sbpKey === "lt90" ? "var(--accent-coral)" : "var(--accent-primary)"}">${sbpTxt}</text>
      </svg>
    `;
  }

  function getStevensonReadout(quadKey, sbpKey) {
    const q = STEVENSON_QUADS[quadKey] || STEVENSON_QUADS.B;
    const sbpTxt = sbpKey === "ge110" ? "<strong>TDS ≥110 mmHg (Hipertensif/SCAPE):</strong> Tambahkan <strong>Nitrogliserin IV</strong> (preload + afterload reducer cepat) bersamaan dengan Furosemid IV + NIV!" : sbpKey === "90_109" ? "<strong>TDS 90–109 mmHg (Normotensif):</strong> Andalkan dekongesti Furosemid IV; hindari vasodilator agresif bila TDS turun &lt;90 mmHg." : "<strong>TDS &lt;90 mmHg (Hipotensi/Syok):</strong> KONTRAINDIKASI vasodilator! Mulai <strong>Norepinefrin IV</strong> + Dobutamin/Levosimendan bila syok kardiogenik.";
    return {
      tone: sbpKey === "lt90" ? "danger" : q.tone,
      rKey: `stev-${quadKey}-${sbpKey}`,
      title: q.title,
      c1Label: "Protokol Diuretik / Inotropik",
      c1Body: q.tx,
      c2Label: "Penyesuaian Tekanan Darah (SBP) & UNa+",
      c2Body: `${sbpTxt} ${q.note}`,
      trap: "Kreatinin naik ringan selama dekongesti disertai diuresis baik &amp; klinis membaik adalah <strong>Pseudo-WRF (hemokonsentrasi)</strong> — JANGAN menghentikan diuretik terlalu cepat!"
    };
  }

  function renderAdhfStevensonWidget() {
    const quad = STEVENSON_QUADS[cardioVizState.stevQuad] ? cardioVizState.stevQuad : "B";
    const sbp = cardioVizState.stevSbp;
    const info = getStevensonReadout(quad, sbp);
    const controlsTop = `
      ${renderCardioTabRow("viz-adhfStev-quad-tabs", Object.entries(STEVENSON_QUADS).map(([k, v]) => ({
        key: k, label: v.label.split("(")[0].trim(), onclick: `window.InternaApp.updateCardioStevensonViz('${k}', null)`
      })), quad)}
      ${renderCardioTabRow("viz-adhfStev-sbp-tabs", [
        { key: "ge110", label: "TDS ≥110 mmHg (SCAPE / NTG OK)", onclick: "window.InternaApp.updateCardioStevensonViz(null, 'ge110')" },
        { key: "90_109", label: "TDS 90–109 mmHg", onclick: "window.InternaApp.updateCardioStevensonViz(null, '90_109')" },
        { key: "lt90", label: "TDS <90 mmHg (Hipotensi)", onclick: "window.InternaApp.updateCardioStevensonViz(null, 'lt90')" }
      ], sbp, "viz-presets")}
    `;
    return renderCardioWidgetCard({
      key: "adhfStev",
      title: "Kuadran Hemodinamik Nohria-Stevenson 2×2 & Algoritma Diuretik ADHF",
      tag: "ESC HF 2021/2023",
      controlsTop,
      svgHtml: buildStevensonSvg(quad, sbp),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioStevensonViz(quadInput, sbpInput) {
    if (STEVENSON_QUADS[quadInput]) cardioVizState.stevQuad = quadInput;
    if (sbpInput === "ge110" || sbpInput === "90_109" || sbpInput === "lt90") cardioVizState.stevSbp = sbpInput;
    const quad = cardioVizState.stevQuad;
    const sbp = cardioVizState.stevSbp;
    syncVizPresets("viz-adhfStev-quad-tabs", ["A", "B", "L", "C"].map((k) => k === quad));
    syncVizPresets("viz-adhfStev-sbp-tabs", ["ge110", "90_109", "lt90"].map((k) => k === sbp));
    swapVizSvgFrame("viz-adhfStev-frame", buildStevensonSvg(quad, sbp));
    const info = getStevensonReadout(quad, sbp);
    updateVizReadout("viz-adhfStev-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C10. Syok Kardiogenik — Komplikasi Mekanik Pasca-STEMI & SCAI A-E ---
  const SHOCK_MECH_DATA = {
    vsr: {
      tabLabel: "1. VSR (Ruptur Septum)",
      tone: "danger",
      title: "Ruptur Septum Ventrikel (VSR — Hari ke-3 s/d ke-5)",
      c1Label: "Temuan Klinis & Swan-Ganz",
      c1Body: "Murmur <strong>holosistolik keras + thrill teraba di batas sternum kiri (LSB)</strong>. Kateterisasi Swan-Ganz menunjukkan <strong>Oxygen Step-Up (&gt;5–7%) dari Atrium Kanan ke Ventrikel Kanan</strong>!",
      c2Label: "Lokasi Infark & Terapi",
      c2Body: "Sering pada STEMI Anterior (LAD) atau Inferior luas. Terapi jembatan: afterload reduction (bila TD cukup) / IABP → <strong>perbaikan bedah emergensi</strong>.",
      trap: "Bedakan VSR vs MR Akut di soal Board: VSR punya <strong>thrill (+) di LSB + step-up O₂ di RV</strong>; MR Akut umumnya tidak ada thrill LSB + punya <strong>giant v-wave di PCWP</strong>!"
    },
    pap: {
      tabLabel: "2. Ruptur Papilaris (MR Akut)",
      tone: "danger",
      title: "Ruptur Muskulus Papilaris Posteromedial → MR Akut Berat (Hari ke-2 s/d ke-7)",
      c1Label: "Mengapa Posteromedial Lebih Sering?",
      c1Body: "<strong>Muskulus papilaris posteromedial mendapat suplai darah TUNGGAL (hanya RCA/PDA)</strong>, sehingga rentan ruptur pada STEMI Inferior! (Anterolateral disuplai ganda LAD + LCx).",
      c2Label: "Edema Paru + Giant v-Wave",
      c2Body: "Regurgitasi masif mendadak ke LA kecil → <strong>Edema Paru Akut berat</strong>, murmur sistolik sering pelan karena cepat equalisasi tekanan, dan tampak <strong>Giant v-wave pada kurva PCWP</strong>.",
      trap: "Klinis mirip edema paru akut mendadak setelah STEMI Inferior hari ke-3: segera <strong>TTE bedside (flail leaflet)</strong> + stabilisasi afterload/IABP → operasi katup darurat!"
    },
    fwr: {
      tabLabel: "3. Free Wall Rupture",
      tone: "danger",
      title: "Ruptur Dinding Bebas Ventrikel (FWR — Tamponade & PEA Mendadak!)",
      c1Label: "Presentasi Klasik Ujian Board",
      c1Body: "Pasien usia lanjut/wanita hari ke-1 s/d ke-5 pasca-infark transmural pertama tiba-tiba <strong>kolaps mendadak, JVP↑, suara jantung menghilang, &amp; irama PEA (EMD)</strong>!",
      c2Label: "Mekanisme & Tatalaksana",
      c2Body: "Darah menyembur masuk ke kantung perikardium → <strong>Hemoperikardium &amp; Tamponade Jantung hiperakut</strong>. Perikardiosentesis sementara + operasi bedah jantung cito!",
      trap: "Jika pasien pasca-STEMI mendadak mengalami PEA dengan JVP distensi dan paru tetap bersih → <strong>TTE segera konfirmasi hemoperikardium</strong> (bukan sekadar tromboemboli!)."
    },
    scai: {
      tabLabel: "4. Stadium SCAI & CULPRIT-SHOCK",
      tone: "warning",
      title: "Spektrum Syok SCAI A–E, CULPRIT-SHOCK & Kontraindikasi IABP",
      c1Label: "Vasopresor Lini 1 & Strategi PCI",
      c1Body: "<strong>Norepinefrin</strong> lebih unggul dibanding Dopamin (SOAP II: aritmia lebih sedikit) &amp; Epinefrin. Uji <strong>CULPRIT-SHOCK:</strong> saat PPCI darurat, buka <strong>hanya arteri culprit</strong> dulu!",
      c2Label: "Kontraindikasi Mutlak IABP (Jebakan!)",
      c2Body: "Uji IABP-SHOCK II menunjukkan IABP tidak menurunkan mortalitas syok iskemik rutin. Selain itu, <strong>IABP KONTRAINDIKASI MUTLAK pada Regurgitasi Aorta (AR) sedang-berat</strong>!",
      trap: "Mengapa IABP haram pada AR? Inflasi balon saat diastol mendorong darah balik menembus katup aorta yang bocor → memperberat edema paru &amp; syok!"
    }
  };

  function buildShockMechSvg(key) {
    let leftSvg = "";
    let rightSvg = "";
    if (key === "vsr") {
      leftSvg = `
        <rect x="34" y="42" width="76" height="122" rx="14" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2" />
        <rect x="122" y="42" width="84" height="122" rx="14" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <!-- Septal defect gap -->
        <rect x="108" y="92" width="16" height="22" rx="3" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2" />
        <line class="osm-axon-flow" x1="158" y1="103" x2="72" y2="103" stroke="var(--accent-coral)" stroke-width="2.6" marker-end="url(#c-shk-arr)" />
        <text x="72" y="64" text-anchor="middle" font-size="11" font-weight="800" fill="var(--viz-blue)">RV (O₂ ↑!)</text>
        <text x="164" y="64" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">LV</text>
        <text x="120" y="182" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">Pirau Kiri→Kanan + Thrill LSB</text>
      `;
      rightSvg = `
        <text x="346" y="38" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">SATURASI O₂ KATETER SWAN-GANZ</text>
        <rect x="242" y="54" width="60" height="44" rx="6" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="272" y="74" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">RA</text>
        <text x="272" y="90" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text-primary)">65%</text>
        <line class="osm-axon-flow" x1="304" y1="76" x2="332" y2="76" stroke="var(--accent-coral)" stroke-width="2" marker-end="url(#c-shk-arr)" />
        <rect x="336" y="54" width="118" height="44" rx="6" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <text x="395" y="73" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">RV (O₂ Step-Up!)</text>
        <text x="395" y="90" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent-coral)">82% (+17%!)</text>
        <text x="346" y="132" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-secondary)">Holosistolik Keras + Thrill LSB</text>
        <text x="346" y="152" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">Sering STEMI Anterior / Inferior</text>
      `;
    } else if (key === "pap") {
      leftSvg = `
        <rect x="44" y="38" width="144" height="50" rx="10" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
        <rect x="44" y="96" width="144" height="72" rx="12" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2" />
        <line x1="86" y1="90" x2="108" y2="82" stroke="var(--accent-coral)" stroke-width="3" />
        <line x1="146" y1="90" x2="128" y2="98" stroke="var(--text-primary)" stroke-width="3" />
        <path class="osm-axon-flow" d="M116,142 Q112,92 106,54" fill="none" stroke="var(--accent-coral)" stroke-width="3" marker-end="url(#c-shk-arr)" />
        <circle class="osm-lesion-pulse" cx="116" cy="148" r="8" fill="var(--accent-coral)" fill-opacity="0.35" stroke="var(--accent-coral)" />
        <text x="160" y="64" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">LA (V↑!)</text>
        <text x="160" y="136" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">LV</text>
        <text x="116" y="185" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-coral)">Posteromedial Putus (RCA!)</text>
      `;
      rightSvg = `
        <text x="346" y="38" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">KURVA PCWP: GIANT V-WAVE</text>
        <line x1="242" y1="146" x2="452" y2="146" stroke="var(--border-strong)" />
        <path class="osm-draw" pathLength="240" style="--osm-len: 240;" d="M244,132 L262,118 L278,132 L302,62 Q312,48 322,62 L344,132 L364,120 L380,132 L404,60 Q414,48 424,60 L446,132" fill="none" stroke="var(--accent-coral)" stroke-width="2.8" stroke-linecap="round" />
        <text x="312" y="45" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-coral)">Giant v-wave</text>
        <text x="346" y="168" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">Edema Paru Berat + Flail Leaflet (TTE)</text>
      `;
    } else if (key === "fwr") {
      leftSvg = `
        <circle cx="116" cy="105" r="56" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2.4" stroke-dasharray="5 3" />
        <ellipse cx="116" cy="105" rx="36" ry="40" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.5" />
        <path class="osm-axon-flow" d="M148,108 L170,114" stroke="var(--accent-coral)" stroke-width="3" marker-end="url(#c-shk-arr)" />
        <circle class="osm-lesion-pulse" cx="152" cy="108" r="9" fill="var(--accent-coral)" fill-opacity="0.3" />
        <text x="116" y="102" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">Jantung</text>
        <text x="116" y="116" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent-coral)">Tertekan</text>
        <text x="116" y="182" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">Hemoperikardium Akut</text>
      `;
      rightSvg = `
        <text x="346" y="40" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">TAMPONADE &amp; PEA MENDADAK!</text>
        <rect x="242" y="56" width="208" height="44" rx="6" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="346" y="75" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-coral)">Trias Beck + Nadi Hilang (EMD/PEA)</text>
        <text x="346" y="91" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">Mortalitas sangat tinggi; bedah cito!</text>
        <text x="346" y="132" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-primary)">Faktor Risiko: Usia Tua, Wanita,</text>
        <text x="346" y="148" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">Infark Transmural Pertama, Terlambat PCI</text>
      `;
    } else {
      leftSvg = `
        ${[
          { s: "E", t: "Extremis (Refrakter / CPR)", y: 36, c: "var(--accent-coral)" },
          { s: "D", t: "Deteriorating (Butuh ≥2 Agen)", y: 66, c: "var(--accent-coral)" },
          { s: "C", t: "Classic (Hipoperfusi + Inotrop)", y: 96, c: "var(--accent-secondary)" },
          { s: "B", t: "Beginning (Hipotensi Tanpa ↑Laktat)", y: 126, c: "var(--viz-blue)" },
          { s: "A", t: "At Risk (AMI Luas / Pre-Syok)", y: 156, c: "var(--accent-primary)" }
        ].map((st, idx) => `
          <rect x="${42 - idx * 6}" y="${st.y}" width="${148 + idx * 12}" height="24" rx="10" fill="var(--bg-surface)" stroke="${st.c}" stroke-width="1.5" />
          <text x="116" y="${st.y + 15.5}" text-anchor="middle" font-size="9" font-weight="700" fill="${st.c}">${st.s}: ${st.t.split("(")[0].trim()}</text>
        `).join("")}
      `;
      rightSvg = `
        <text x="346" y="40" text-anchor="middle" font-size="10.2" font-weight="700" fill="var(--text-primary)">EVIDENCE-BASED BOARD RULES</text>
        <rect x="238" y="52" width="216" height="36" rx="11" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <text x="346" y="68" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-primary)">CULPRIT-SHOCK (NEJM)</text>
        <text x="346" y="81" text-anchor="middle" font-size="9" font-weight="600" fill="var(--text-secondary)">PPCI Culprit-Only &gt; Multivessel Langsung</text>
        <rect x="238" y="96" width="216" height="36" rx="11" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" />
        <text x="346" y="112" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-secondary)">Vasopresor Lini 1: Norepinefrin</text>
        <text x="346" y="125" text-anchor="middle" font-size="9" font-weight="600" fill="var(--text-secondary)">Target MAP ≥65 mmHg + Dobutamin bila perlu</text>
        <rect x="238" y="140" width="216" height="36" rx="11" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="346" y="156" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-coral)">LARANGAN MUTLAK IABP:</text>
        <text x="346" y="169" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent-coral)">Regurgitasi Aorta (AR) Berat / Diseksi!</text>
      `;
    }

    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Atlas Komplikasi Mekanik Pasca-STEMI dan SCAI">
        ${svgArrowMarker("c-shk-arr", "var(--accent-coral)")}
        <rect x="8" y="8" width="214" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        ${leftSvg}
        <rect x="230" y="8" width="242" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        ${rightSvg}
      </svg>
    `;
  }

  function renderShockMechanicalWidget() {
    const key = SHOCK_MECH_DATA[cardioVizState.shockMechTab] ? cardioVizState.shockMechTab : "vsr";
    const info = SHOCK_MECH_DATA[key];
    return renderCardioWidgetCard({
      key: "shockMech",
      title: "Atlas Komplikasi Mekanik Pasca-STEMI & Tahapan Syok SCAI",
      tag: "ESC HF & ACS",
      controlsTop: renderCardioTabRow("viz-shockMech-tabs", Object.entries(SHOCK_MECH_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioShockMechViz('${k}')`
      })), key),
      svgHtml: buildShockMechSvg(key),
      info: { ...info, rKey: `shk-${key}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioShockMechViz(tabInput) {
    const key = SHOCK_MECH_DATA[tabInput] ? tabInput : "vsr";
    cardioVizState.shockMechTab = key;
    syncVizPresets("viz-shockMech-tabs", Object.keys(SHOCK_MECH_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-shockMech-frame", buildShockMechSvg(key));
    const info = SHOCK_MECH_DATA[key];
    updateVizReadout("viz-shockMech-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `shk-${key}`);
  }

  // --- C11. Chronic HF — 4 Pilar GDMT, Aturan Washout ARNI 36 Jam & Alat ---
  const GDMT_DATA = {
    pillars: {
      tabLabel: "4 Pilar HFrEF (≤40%)",
      tone: "info",
      title: "Empat Pilar Modifikasi Penyakit HFrEF (RRR Mortalitas Kumulatif ~73% — Kelas I)",
      c1Label: "Empat Obat Wajib Dosis Cepat (STRONG-HF)",
      c1Body: "(1) <strong>ARNI (Sacubitril/Valsartan)</strong> atau ACEi/ARB; (2) <strong>Beta-Blocker terbukti HFrEF</strong> (Bisoprolol, Carvedilol, Metoprolol Suksinat, Nebivolol ≥70 th); (3) <strong>MRA</strong> (Spironolakton/Eplerenon); (4) <strong>SGLT2i</strong> (Dapagliflozin/Empagliflozin 10 mg).",
      c2Label: "Aturan Beta-Blocker & Titrasi",
      c2Body: "Inisiasi seluruh 4 kelas dosis rendah saat pasien stabil lalu <strong>titrasi cepat dalam 2–6 minggu (STRONG-HF)</strong>. Jangan memulai beta-bloker baru saat masih syok atau kongesti basah berat!",
      trap: "<strong>Metoprolol Tartrat &amp; Atenolol TIDAK terbukti</strong> menurunkan mortalitas HFrEF — harus <strong>Metoprolol Suksinat (CR/XL)</strong>, Bisoprolol, Carvedilol, atau Nebivolol!"
    },
    washout: {
      tabLabel: "Aturan Washout ARNI (36j)",
      tone: "danger",
      title: "Aturan Keselamatan Kritis: Transisi ACEi vs ARB ke Sacubitril/Valsartan (ARNI)",
      c1Label: "ACE Inhibitor → ARNI: WAJIB Washout ≥36 Jam!",
      c1Body: "Baik ACE inhibitor maupun Sacubitril (neprilysin inhibitor) menghambat pemecahan <strong>Bradikinin</strong>! Pemberian bersamaan memicu lonjakan bradikinin → <strong>ANGIOEDEMA JALAN NAPAS FATAL!</strong>",
      c2Label: "ARB → ARNI & Ambang eGFR",
      c2Body: "Pasien pengguna <strong>ARB (mis. Valsartan/Candesartan)</strong> <strong>TIDAK perlu washout 36 jam</strong> (ganti langsung pada dosis berikutnya!). SGLT2i tetap aman dimulai hingga <strong>eGFR ≥20 mL/mnt</strong>.",
      trap: "Jika ada riwayat angioedema terkait ACEi/ARB sebelumnya, <strong>Sacubitril/Valsartan KONTRAINDIKASI SEUMUR HIDUP</strong>!"
    },
    devices: {
      tabLabel: "Ivabradin / Alat / Fe IV",
      tone: "warning",
      title: "Terapi Tambahan HFrEF: Ivabradin (SHIFT), ICD/CRT & Besi IV",
      c1Label: "Ivabradin & CRT/ICD",
      c1Body: "<strong>Ivabradin (Kelas IIa):</strong> LVEF ≤35% + <strong>Irama SINUS</strong> + HR ≥70 x/mnt meski dosis beta-bloker maksimal! <strong>CRT-D/P:</strong> LVEF ≤35% + Sinus + <strong>LBBB QRS ≥150 ms (Kelas I)</strong>.",
      c2Label: "Defisiensi Besi (Ferric Carboxymaltose IV)",
      c2Body: "Kriteria HFrEF: <strong>Feritin &lt;100 ng/mL</strong> atau <strong>Feritin 100–299 + TSAT &lt;20%</strong> → berikan <strong>Besi Intravena (Ferric Carboxymaltose / Derisomaltose)</strong>!",
      trap: "<strong>Suplemen besi ORAL tidak efektif (Kelas III)</strong> pada gagal jantung karena hepsidin tinggi menghambat absorpsi usus! Dan <strong>Ivabradin tidak bekerja pada Fibrilasi Atrium</strong>!"
    },
    hfpef: {
      tabLabel: "HFmrEF & HFpEF (ESC 2023)",
      tone: "info",
      title: "Terobosan ESC Update 2023 untuk HFmrEF (41–49%) & HFpEF (≥50%)",
      c1Label: "Rekomendasi KELAS I Level A",
      c1Body: "<strong>SGLT2 Inhibitor (Empagliflozin 10 mg / Dapagliflozin 10 mg)</strong> adalah SATU-SATUNYA kelas obat dengan bukti Kelas I untuk menurunkan rawat inap &amp; kematian KV pada LVEF &gt;40% (tanpa memandang DM!).",
      c2Label: "Skor H₂FPEF & Pengendalian Komorbid",
      c2Body: "Kombinasikan <strong>Diuretik Loop</strong> dosis terendah efektif untuk kongesti, kendalikan hipertensi/AF/iskemia, &amp; gunakan <strong>Skor H₂FPEF</strong> (Heavy, Hypertensive, AF, PH, Elder &gt;60, Filling pressure E/e').",
      trap: "Jangan berikan <strong>CCB Non-DHP (Verapamil/Diltiazem) atau Nitrat</strong> rutin tanpa angina pada HFpEF — dan waspadai peniru HFpEF seperti <strong>Amiloidosis Jantung (ATTR)</strong>!"
    }
  };

  function buildGdmtSvg(key) {
    let body = "";
    if (key === "pillars") {
      body = `
        <text x="240" y="26" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">REDUKSI MORTALITAS KUMULATIF HFrEF (LVEF ≤40%)</text>
        ${[
          { lbl: "Plasebo / Diuretik Saja", w: 30, pct: "0% (Simtomatik)", c: "var(--text-muted)" },
          { lbl: "1. ARNI (vs ACEi)", w: 120, pct: "↓ ~20% vs Enalapril", c: "var(--viz-blue)" },
          { lbl: "2. + Beta-Blocker Terbukti", w: 210, pct: "↓ Kumulatif ~48%", c: "var(--viz-purple)" },
          { lbl: "3. + MRA (Spironolakton)", w: 265, pct: "↓ Kumulatif ~63%", c: "var(--accent-secondary)" },
          { lbl: "4. + SGLT2 Inhibitor (Dapa/Empa)", w: 315, pct: "↓ ~73% RRR Total!", c: "var(--accent-primary)" }
        ].map((r, i) => `
          <text x="24" y="${54 + i * 28}" font-size="10" font-weight="700" fill="var(--text-primary)">${r.lbl}</text>
          <rect x="24" y="${60 + i * 28}" width="315" height="9" rx="4.5" fill="var(--bg-surface)" />
          <rect class="viz-smooth-bar" x="24" y="${60 + i * 28}" width="${r.w}" height="9" rx="4.5" fill="${r.c}" />
          <text x="348" y="${67.5 + i * 28}" font-size="9.5" font-weight="800" fill="${r.c}">${r.pct}</text>
        `).join("")}
      `;
    } else if (key === "washout") {
      body = `
        <text x="240" y="28" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">ALUR KONVERSI AMAN KE SACUBITRIL / VALSARTAN (ARNI)</text>
        <rect x="24" y="48" width="108" height="48" rx="7" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
        <text x="78" y="69" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-secondary)">Pasien Pakai ACEi</text>
        <text x="78" y="85" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-secondary)">Captopril/Ramipril</text>
        <line class="osm-axon-flow" x1="134" y1="72" x2="178" y2="72" stroke="var(--accent-coral)" stroke-width="2.4" marker-end="url(#c-gdmt-arr)" />
        <rect class="osm-lesion-pulse" x="182" y="44" width="126" height="56" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <text x="245" y="67" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">STOP ≥36 JAM!</text>
        <text x="245" y="84" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent-coral)">Cegah Angioedema</text>
        <line class="osm-axon-flow" x1="310" y1="72" x2="348" y2="72" stroke="var(--accent-primary)" stroke-width="2.4" marker-end="url(#c-gdmt-ok)" />
        <rect x="352" y="48" width="106" height="48" rx="7" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
        <text x="405" y="69" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-primary)">Mulai ARNI</text>
        <text x="405" y="85" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-secondary)">2×24/26→97/103</text>

        <rect x="24" y="120" width="434" height="52" rx="8" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
        <text x="241" y="142" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-primary)">Pasien Pakai ARB (Valsartan / Candesartan) → TIDAK PERLU WASHOUT 36 JAM!</text>
        <text x="241" y="159" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-secondary)">Langsung ganti pada jadwal dosis berikutnya (ARB tidak menghambat enzim ACE pemecah bradikinin).</text>
      `;
    } else if (key === "devices") {
      body = `
        <text x="240" y="28" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">KRITERIA PENGGUNAAN ALAT &amp; TERAPI TAMBAHAN HFrEF</text>
        <rect x="20" y="44" width="140" height="128" rx="8" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" />
        <text x="90" y="64" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--viz-blue)">IVABRADIN (SHIFT)</text>
        <text x="90" y="86" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">• LVEF ≤35%</text>
        <text x="90" y="104" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--viz-blue)">• WAJIB Irama SINUS</text>
        <text x="90" y="122" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">• HR ≥70 x/menit</text>
        <text x="90" y="140" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-muted)">(Sudah BB maksimal)</text>

        <rect x="170" y="44" width="140" height="128" rx="8" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
        <text x="240" y="64" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-secondary)">CRT &amp; ICD</text>
        <text x="240" y="86" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">• LVEF ≤35% OMT ≥3 bln</text>
        <text x="240" y="104" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-secondary)">• CRT: Sinus + LBBB</text>
        <text x="240" y="122" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-secondary)">  QRS ≥150 ms (Kelas I)</text>
        <text x="240" y="140" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-muted)">• ICD: Cegah SCD (VT)</text>

        <rect x="320" y="44" width="140" height="128" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="390" y="64" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">BESI INTRAVENA</text>
        <text x="390" y="86" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">• Feritin &lt;100 ng/mL</text>
        <text x="390" y="104" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">• Atau 100–299 +</text>
        <text x="390" y="122" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-coral)">  TSAT &lt;20%</text>
        <text x="390" y="140" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--accent-coral)">Hindari Fe Oral (Hepsidin)</text>
      `;
    } else {
      body = `
        <text x="240" y="28" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-primary)">SPEKTRUM TERAPI GAGAL JANTUNG BERDASARKAN LVEF (ESC 2023)</text>
        <rect x="20" y="48" width="142" height="120" rx="8" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="91" y="69" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">HFrEF (≤40%)</text>
        <text x="91" y="92" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-primary)">4 Pilar Kelas I Wajib:</text>
        <text x="91" y="110" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">ARNI / BB / MRA /</text>
        <text x="91" y="128" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">SGLT2 Inhibitor</text>

        <rect x="170" y="48" width="140" height="120" rx="8" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
        <text x="240" y="69" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-secondary)">HFmrEF (41–49%)</text>
        <text x="240" y="92" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">SGLT2i: KELAS I!</text>
        <text x="240" y="110" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">ARNI/BB/MRA: IIb</text>
        <text x="240" y="128" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">+ Diuretik Kongesti</text>

        <rect x="318" y="48" width="142" height="120" rx="8" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
        <text x="389" y="69" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-primary)">HFpEF (≥50%)</text>
        <text x="389" y="92" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">SGLT2i: KELAS I A!</text>
        <text x="389" y="110" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">(EMPEROR-Preserved &amp;</text>
        <text x="389" y="128" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-secondary)">DELIVER) + Komorbid</text>
      `;
    }
    return `
      <svg class="viz-svg" viewBox="0 0 480 192" role="img" aria-label="Visualisasi GDMT Gagal Jantung Kronik">
        ${svgArrowMarker("c-gdmt-arr", "var(--accent-coral)")}
        ${svgArrowMarker("c-gdmt-ok", "var(--accent-primary)")}
        <rect x="8" y="8" width="464" height="176" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        ${body}
      </svg>
    `;
  }

  function renderGdmtTitrationWidget() {
    const key = GDMT_DATA[cardioVizState.gdmtTab] ? cardioVizState.gdmtTab : "pillars";
    const info = GDMT_DATA[key];
    return renderCardioWidgetCard({
      key: "gdmt",
      title: "Peta 4 Pilar GDMT HFrEF, Washout ARNI & Terapi LVEF >40%",
      tag: "ESC HF 2023 Update",
      controlsTop: renderCardioTabRow("viz-gdmt-tabs", Object.entries(GDMT_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioGdmtViz('${k}')`
      })), key),
      svgHtml: buildGdmtSvg(key),
      info: { ...info, rKey: `gdmt-${key}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioGdmtViz(tabInput) {
    const key = GDMT_DATA[tabInput] ? tabInput : "pillars";
    cardioVizState.gdmtTab = key;
    syncVizPresets("viz-gdmt-tabs", Object.keys(GDMT_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-gdmt-frame", buildGdmtSvg(key));
    const info = GDMT_DATA[key];
    updateVizReadout("viz-gdmt-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `gdmt-${key}`);
  }

  // --- C12. Takiaritmia VT vs SVT vs Pre-Excited AF (WPW) vs Torsades ---
  const TACHY_DATA = {
    vt: {
      tabLabel: "VT Monomorfik",
      tone: "danger",
      color: "var(--accent-coral)",
      stripTitle: "QRS Lebar Reguler • Disosiasi AV + Capture & Fusion Beats",
      wave: "M24,116 L40,56 L56,144 L72,116 L90,56 L106,144 L120,116 L132,102 L140,126 L154,116 L172,56 L188,144 L204,116 L222,56 L238,144 L254,116 L272,72 L286,136 L300,116 L318,56 L334,144 L350,116 L368,56 L384,144 L402,116 L422,56 L438,144 L452,116",
      badgeText: "Kardioversi 100–120J / Procainamide / Amiodaron",
      c1Label: "Kriteria EKG Spesifik VT (>95–99%)",
      c1Body: "<strong>Disosiasi AV</strong> (gelombang P berjalan independen + <em>cannon a-waves</em>), <strong>Capture beat</strong> (QRS sempit dini menembus blok!), <strong>Fusion beat</strong>, &amp; konkordansi prekordial V1–V6.",
      c2Label: "Terapi Akut (ESC VA 2022)",
      c2Body: "<strong>Stabil:</strong> Kardioversi tersinkronisasi (sedasi) atau <strong>Procainamide / Amiodaron IV</strong> (150 mg/10 mnt; hindari pada gagal jantung berat/QT panjang). Pada VT tanpa nadi → Defibrilasi 150–200 J!",
      trap: "Takikardia kompleks lebar pada pasien usia lanjut dengan riwayat infark miokard harus selalu dianggap <strong>VT sampai terbukti bukan</strong>! Pemberian Verapamil pada VT berisiko memicu VF fatal!"
    },
    svt: {
      tabLabel: "SVT / AVNRT (QRS Sempit)",
      tone: "info",
      color: "var(--accent-primary)",
      stripTitle: "Takikardia Reguler Kompleks Sempit (QRS <120 ms) — Tanpa P Jelas",
      wave: "M24,116 L36,116 L40,54 L45,130 L52,116 L76,116 L80,54 L85,130 L92,116 L116,116 L120,54 L125,130 L132,116 L156,116 L160,54 L165,130 L172,116 L196,116 L200,54 L205,130 L212,116 L236,116 L240,54 L245,130 L252,116 L276,116 L280,54 L285,130 L292,116 L316,116 L320,54 L325,130 L332,116 L356,116 L360,54 L365,130 L372,116 L396,116 L400,54 L405,130 L412,116 L436,116 L440,54 L445,130 L452,116",
      badgeText: "Modified Valsalva → Adenosin 6–12–18 mg",
      c1Label: "Lini 1: Manuver Vagal Modifikasi (REVERT)",
      c1Body: "Tiup spuit 10 mL (40 mmHg) selama 15 detik posisi semi-recumbent 45°, lalu segera baringkan terlentang + angkat kedua tungkai pasif 45° selama 15 detik (keberhasilan ~43%!).",
      c2Label: "Lini 2: Adenosin IV Bolus Cepat",
      c2Body: "Berikan <strong>Adenosin 6 mg → 12 mg → 18 mg IV</strong> flush NaCl cepat di vena besar proksimal (rekam strip EKG terus menerus!). Kurangi ke 3 mg bila transplantasi / akses sentral / dipiridamol.",
      trap: "<strong>KONTRAINDIKASI Adenosin pada ASMA BRONKIAL AKTIF / mengi!</strong> Gunakan <strong>Verapamil / Diltiazem IV</strong> atau Beta-Blocker IV pada SVT stabil dengan bronkospasme aktif!"
    },
    wpw: {
      tabLabel: "Pre-Excited AF (WPW — FBI!)",
      tone: "danger",
      color: "var(--accent-coral)",
      stripTitle: "FAST, BROAD, IRREGULAR (Ireguler Total + Lebar QRS Berubah + Delta!)",
      wave: "M24,116 L34,54 L48,136 L58,116 L66,68 L74,126 L82,116 L108,52 L124,140 L138,116 L154,60 L166,130 L176,116 L186,84 L194,122 L208,116 L232,50 L250,144 L264,116 L276,66 L288,132 L300,116 L328,54 L344,138 L356,116 L368,78 L378,124 L392,116 L418,52 L434,142 L452,116",
      badgeText: "HARAM ABCD+Amio! → Kardioversi / Procainamide",
      c1Label: "Bahaya Konduksi 1:1 Mematikan",
      c1Body: "Atrium berdenyut 400–600x/mnt. Bila nodus AV diblok oleh obat penyekat nodus AV, seluruh impuls beralih 1:1 tanpa rem melewati jalur aksesori (<em>bundle of Kent</em>) → <strong>VENTRICULAR FIBRILLATION FATAL!</strong>",
      c2Label: "Obat DILARANG & Terapi Pilihan",
      c2Body: "<strong>HARAM MUTLAK (Kelas III Harm): A</strong>denosin, <strong>B</strong>eta-Blocker, <strong>C</strong>CB (Verapamil/Diltiazem), <strong>D</strong>igoksin, + <strong>Amiodaron IV!</strong> Pilih <strong>Kardioversi Listrik</strong> atau <strong>Procainamide / Ibutilide IV</strong>.",
      trap: "Ciri khas soal Board: pasien muda palpitasi dengan EKG takikardia <strong>sangat cepat (&gt;200x/m), lebar QRS bervariasi (<em>accordion effect</em>), &amp; R-R ireguler total</strong>!"
    },
    tdp: {
      tabLabel: "Torsades de Pointes (Long QT)",
      tone: "warning",
      color: "var(--accent-secondary)",
      stripTitle: "VT Polimorfik dengan Aksis Berpilin Mengelilingi Garis Isoelektrik",
      wave: "M24,116 L38,100 L50,130 L64,82 L78,144 L94,64 L112,162 L130,68 L146,146 L160,96 L174,126 L188,110 L204,124 L220,96 L236,140 L254,68 L272,160 L290,62 L308,158 L326,80 L342,134 L356,104 L372,126 L388,92 L404,142 L422,64 L440,156 L452,116",
      badgeText: "MgSO₄ 2 g IV + Hentikan Obat QT + Overdrive Pacing",
      c1Label: "Terapi Lini Pertama Akut (Stabil)",
      c1Body: "<strong>Magnesium Sulfat (MgSO₄) 2 gram IV</strong> perlahan 10–15 menit (menstabilkan membran miokard meski Mg serum normal!), koreksi <strong>K+ (&gt;4,5 mEq/L)</strong>, &amp; stop obat pemanjang QTc (amiodaron/sotalol/makrolid/haloperidol/metadon).",
      c2Label: "Bila Terkait Bradikardia / Refrakter",
      c2Body: "Naikkan laju jantung dengan <strong>Overdrive Transvenous/Transcutaneous Pacing</strong> atau infus <strong>Isoproterenol</strong> (pada QT memanjang didapat / *pause-dependent TdP*) sambil menunggu MgSO₄ bekerja.",
      trap: "<strong>JANGAN berikan Amiodaron IV</strong> pada Torsades de Pointes terkait Long QT — memperpanjang repolarisasi &amp; memperburuk badai TdP! Jika tidak stabil/tanpa nadi → <strong>Defibrilasi</strong>!"
    }
  };

  function buildTachySvg(key, stable) {
    const d = TACHY_DATA[key] || TACHY_DATA.wpw;
    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Atlas EKG dan Algoritma Takiaritmia ${d.tabLabel}">
        ${svgEcgGridBg(12, 10, 456, 146, 18)}
        <text x="24" y="28" font-size="10" font-weight="800" fill="var(--text-primary)">${d.stripTitle}</text>
        <line x1="20" y1="116" x2="460" y2="116" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <path class="osm-draw" pathLength="360" style="--osm-len: 360;" d="${d.wave}" fill="none" stroke="${d.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        ${key === "vt" ? `<circle cx="136" cy="114" r="14" fill="none" stroke="var(--viz-blue)" stroke-width="1.6" stroke-dasharray="3 2" /><text x="136" y="88" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--viz-blue)">Capture!</text><circle cx="278" cy="108" r="16" fill="none" stroke="var(--accent-primary)" stroke-width="1.6" stroke-dasharray="3 2" /><text x="278" y="64" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-primary)">Fusion!</text>` : ""}
        <rect x="12" y="162" width="456" height="28" rx="6" fill="${!stable ? "var(--accent-coral-soft)" : d.tone === "info" ? "var(--accent-primary-soft)" : d.tone === "warning" ? "var(--accent-secondary-soft)" : "var(--accent-coral-soft)"}" stroke="${!stable ? "var(--accent-coral)" : d.color}" stroke-width="1.6" />
        <text x="240" y="180" text-anchor="middle" font-size="10.2" font-weight="800" fill="${!stable ? "var(--accent-coral)" : d.color}">${!stable ? "TIDAK STABIL (Syok/Angina/Edema Paru) → KARDIOVERSI TERSINKRONISASI SEGERA!" : d.badgeText}</text>
      </svg>
    `;
  }

  function renderTachyEcgAlgoWidget() {
    const key = TACHY_DATA[cardioVizState.tachyTab] ? cardioVizState.tachyTab : "wpw";
    const stable = Boolean(cardioVizState.tachyStable);
    const d = TACHY_DATA[key];
    const info = !stable
      ? {
          tone: "danger",
          rKey: `tachy-${key}-unstab`,
          title: `${d.tabLabel} TIDAK STABIL (Red Flags: Hipotensi / Angina / Gagal Jantung / Penurunan Kesadaran)`,
          c1Label: "Tindakan Detik Pertama (ESC 2019/2022)",
          c1Body: "<strong>Kardioversi Elektrik Tersinkronisasi Segera</strong> dengan sedasi/analgesia IV singkat! Energi Bifasik: <strong>SVT/Flutter 70–120 J</strong> • <strong>VT Monomorfik dengan nadi 100–120 J</strong> • <strong>AF 120–200 J</strong>.",
          c2Label: "Bila Polimorfik (TdP) atau Tanpa Nadi",
          c2Body: "VT Polimorfik / <em>Pre-excited AF</em> tak sinkron / Pulseless VT/VF → <strong>DEFIBRILASI (Unsynchronized Shock 150–200 J Bifasik)</strong> + RJP berkualitas tinggi!",
          trap: d.trap
        }
      : { ...d, rKey: `tachy-${key}-stab`, title: `${d.tabLabel} STABIL — Strategi EKG & Farmakologi Akut` };

    const controlsTop = `
      ${renderCardioTabRow("viz-tachy-tabs", Object.entries(TACHY_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioTachyViz('${k}', null)`
      })), key)}
      ${renderCardioTabRow("viz-tachy-stab-tabs", [
        { key: "true", label: "Status: STABIL Hemodinamik", onclick: "window.InternaApp.updateCardioTachyViz(null, true)" },
        { key: "false", label: "TIDAK STABIL (Syok / Red Flags!)", onclick: "window.InternaApp.updateCardioTachyViz(null, false)" }
      ], String(stable), "viz-presets")}
    `;

    return renderCardioWidgetCard({
      key: "tachy",
      title: "Atlas EKG & Pohon Keputusan Akut Takiaritmia (ESC 2019/2022)",
      tag: "ACLS & ESC VA/SVT",
      controlsTop,
      svgHtml: buildTachySvg(key, stable),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioTachyViz(tabInput, stabInput) {
    if (TACHY_DATA[tabInput]) cardioVizState.tachyTab = tabInput;
    if (stabInput === true || stabInput === false) cardioVizState.tachyStable = stabInput;
    const key = cardioVizState.tachyTab;
    const stable = cardioVizState.tachyStable;
    const d = TACHY_DATA[key];
    syncVizPresets("viz-tachy-tabs", Object.keys(TACHY_DATA).map((k) => k === key));
    syncVizPresets("viz-tachy-stab-tabs", [stable, !stable]);
    swapVizSvgFrame("viz-tachy-frame", buildTachySvg(key, stable));
    const info = !stable
      ? {
          tone: "danger",
          rKey: `tachy-${key}-unstab`,
          title: `${d.tabLabel} TIDAK STABIL (Syok / Angina / Gagal Jantung / Penurunan Kesadaran)`,
          c1Label: "Kardioversi Tersinkronisasi Segera",
          c1Body: "Sedasi IV singkat + <strong>Synchronized Cardioversion</strong> Bifasik: <strong>SVT/Flutter 70–120 J</strong> • <strong>VT berdenyut 100–120 J</strong> • <strong>AF 120–200 J</strong>.",
          c2Label: "Bila Polimorfik / Tanpa Nadi",
          c2Body: "Gunakan <strong>Defibrilasi Unsynchronized 150–200 J Bifasik</strong> + RJP berkualitas tinggi bila nadi tak teraba / sinkronisasi gagal.",
          trap: d.trap
        }
      : { ...d, rKey: `tachy-${key}-stab`, title: `${d.tabLabel} STABIL — Strategi EKG & Farmakologi Akut` };
    updateVizReadout("viz-tachy-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // =========================================================================
  // KARDIOLOGI INTERACTIVE SVG VISUALIZATIONS — PART B2 (ATLASES & TREES 13-19)
  // =========================================================================

  // --- C13. AF-CARE ESC 2024: Rate Control (LVEF), Kardioversi (<48j vs >=48j) & ABC Apixaban ---
  function buildAfCareSvg(tab, lvef, dur) {
    if (tab === "rate") {
      const lowEf = lvef === "lt40";
      return `
        <svg class="viz-svg" viewBox="0 0 480 186" role="img" aria-label="Algoritma Rate Control Akut AF RVR Berdasarkan LVEF ESC 2024">
          <rect x="14" y="10" width="452" height="28" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="24" y="28" font-size="10.2" font-weight="700" fill="var(--text-primary)">TARGET LAJU NADI AWAL (RACE II): LENIENT &lt;110 X/MENIT</text>
          <text x="456" y="28" text-anchor="end" font-size="10" font-weight="700" fill="${lowEf ? "var(--accent-coral)" : "var(--accent-primary)"}">${lowEf ? "LVEF <40% / ADHF" : "LVEF ≥40%"}</text>

          <rect x="14" y="48" width="218" height="126" rx="14" fill="${!lowEf ? "var(--accent-primary-soft)" : "var(--bg-surface-subtle)"}" stroke="${!lowEf ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${!lowEf ? "1.8" : "1"}" />
          <text x="123" y="68" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-primary)">LVEF ≥40% (Tanpa Kongesti)</text>
          <text x="123" y="90" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-primary)">• Beta-Blocker IV/PO (Metoprolol/</text>
          <text x="123" y="106" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-primary)">  Esmolol / Bisoprolol)</text>
          <text x="123" y="128" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--viz-blue)">ATAU CCB Non-DHP:</text>
          <text x="123" y="144" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-secondary)">Diltiazem 0,25 mg/kg IV / Verapamil</text>

          <rect x="248" y="48" width="218" height="126" rx="14" fill="${lowEf ? "var(--accent-coral-soft)" : "var(--bg-surface-subtle)"}" stroke="${lowEf ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${lowEf ? "1.8" : "1"}" />
          <text x="357" y="68" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-coral)">LVEF &lt;40% / Gagal Jantung Akut</text>
          <text x="357" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-coral)">HARAM (Kelas III Harm):</text>
          <text x="357" y="106" text-anchor="middle" font-size="9.2" font-weight="600" fill="var(--accent-coral)">Verapamil, Diltiazem, Kelas IC!</text>
          <text x="357" y="128" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-primary)">Pilihan Aman (Kelas I):</text>
          <text x="357" y="144" text-anchor="middle" font-size="9.2" font-weight="600" fill="var(--text-secondary)">Digoksin IV / Amiodaron IV / BB titrasi</text>
        </svg>
      `;
    }
    if (tab === "cardioversion") {
      const ge48 = dur === "ge48";
      return `
        <svg class="viz-svg" viewBox="0 0 480 186" role="img" aria-label="Aturan Antikoagulasi Perikardioversi AF ESC 2024">
          ${svgArrowMarker("c-af-arr", "var(--accent-primary)")}
          <rect x="14" y="10" width="452" height="28" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="240" y="28" text-anchor="middle" font-size="10.2" font-weight="700" fill="var(--text-primary)">TIMELINE ANTIKOAGULASI KARDIOVERSI AF (${ge48 ? "ONSET ≥48 JAM / TIDAK JELAS" : "ONSET PASTI <48 JAM"})</text>

          <rect x="14" y="54" width="144" height="72" rx="12" fill="${ge48 ? "var(--accent-coral-soft)" : "var(--accent-primary-soft)"}" stroke="${ge48 ? "var(--accent-coral)" : "var(--accent-primary)"}" stroke-width="1.6" />
          <text x="86" y="76" text-anchor="middle" font-size="10" font-weight="700" fill="${ge48 ? "var(--accent-coral)" : "var(--accent-primary)"}">${ge48 ? "PRA-KARDIOVERSI" : "SEBELUM KEJUT (<48j)"}</text>
          <text x="86" y="95" text-anchor="middle" font-size="9.2" font-weight="600" fill="var(--text-primary)">${ge48 ? "Wajib OAC ≥3 MINGGU" : "Mulai UFH / LMWH /"}</text>
          <text x="86" y="111" text-anchor="middle" font-size="9" font-weight="600" fill="var(--text-secondary)">${ge48 ? "atau TEE singkirkan trombus" : "DOAC Segera Saat Masuk"}</text>

          <line class="osm-axon-flow" x1="160" y1="90" x2="188" y2="90" stroke="var(--accent-primary)" stroke-width="2" marker-end="url(#c-af-arr)" />
          <rect x="192" y="60" width="94" height="60" rx="12" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1.6" />
          <text x="239" y="86" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent-secondary)">KARDIOVERSI</text>
          <text x="239" y="103" text-anchor="middle" font-size="9" font-weight="600" fill="var(--text-secondary)">Elektrik / Obat</text>

          <line class="osm-axon-flow" x1="288" y1="90" x2="316" y2="90" stroke="var(--accent-primary)" stroke-width="2" marker-end="url(#c-af-arr)" />
          <rect x="320" y="54" width="146" height="72" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.6" />
          <text x="393" y="76" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent-coral)">PASCA-KARDIOVERSI</text>
          <text x="393" y="95" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--accent-coral)">WAJIB OAC ≥4 MINGGU!</text>
          <text x="393" y="111" text-anchor="middle" font-size="8.8" font-weight="600" fill="var(--text-secondary)">(Semua pasien! Atrial stunning)</text>

          <rect x="14" y="142" width="452" height="32" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="240" y="162" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-primary)">Setelah 4 minggu: Lanjutkan seumur hidup bila CHA₂DS₂-VA ≥2 (pertimbangkan jika =1)</text>
        </svg>
      `;
    }
    return `
      <svg class="viz-svg" viewBox="0 0 480 186" role="img" aria-label="Kriteria ABC Pengurangan Dosis Apixaban AF ESC 2024">
        <rect x="14" y="10" width="452" height="28" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
        <text x="240" y="28" text-anchor="middle" font-size="10.2" font-weight="700" fill="var(--accent-coral)">KRITERIA ABC APIXABAN — WAJIB ≥2 DARI 3 BARU TURUNKAN KE 2×2,5 MG!</text>
        ${[
          { ltr: "A", lbl: "Age ≥80 Tahun", sub: "Usia pasien ≥80 th", x: 16 },
          { ltr: "B", lbl: "Body Weight ≤60 kg", sub: "Berat badan ≤60 kg", x: 168 },
          { ltr: "C", lbl: "Creatinine ≥1,5 mg/dL", sub: "(atau CrCl 15–29 mL/mnt)", x: 320 }
        ].map((c) => `
          <rect x="${c.x}" y="48" width="144" height="74" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--accent-primary-border)" stroke-width="1.4" />
          <text x="${c.x + 72}" y="72" text-anchor="middle" font-size="18" font-weight="800" fill="var(--accent-primary)">${c.ltr}</text>
          <text x="${c.x + 72}" y="94" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-primary)">${c.lbl}</text>
          <text x="${c.x + 72}" y="110" text-anchor="middle" font-size="8.6" font-weight="600" fill="var(--text-muted)">${c.sub}</text>
        `).join("")}
        <rect x="16" y="134" width="448" height="40" rx="12" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
        <text x="240" y="151" text-anchor="middle" font-size="9.6" font-weight="700" fill="var(--accent-secondary)">JEBAKAN UNDERDOSING (KELAS III ESC 2024):</text>
        <text x="240" y="166" text-anchor="middle" font-size="9.2" font-weight="600" fill="var(--text-primary)">Jika hanya memenuhi 1 kriteria ABC saja (mis. BB 55 kg tapi usia 68 th &amp; Cr 1,1) → TETAP 2×5 mg!</text>
      </svg>
    `;
  }

  function getAfCareReadout(tab, lvef, dur) {
    if (tab === "rate") {
      const low = lvef === "lt40";
      return {
        tone: low ? "danger" : "info",
        rKey: `af-rate-${lvef}`,
        title: low ? "AF RVR dengan LVEF <40% / Gagal Jantung Dekompensata" : "AF RVR dengan LVEF ≥40% (Fungsi Sistolik Terjaga)",
        c1Label: "Pilihan Kontrol Laju Akut (ESC 2024)",
        c1Body: low
          ? "<strong>Amiodaron IV</strong> atau <strong>Digoksin IV</strong> (0,25–0,5 mg bolus IV, maks 1–1,5 mg/24 jam), lalu titrasi rendah Beta-blocker selektif HFrEF pasca-euvolemia."
          : "<strong>Beta-blocker IV/PO</strong> atau <strong>CCB Non-Dihidropiridin (Diltiazem 0,25 mg/kg IV / Verapamil IV)</strong> sama-sama Kelas I untuk target HR &lt;110 x/menit.",
        c2Label: "Kontraindikasi & AF + SKA/PCI",
        c2Body: low
          ? "<strong>HARAM Diltiazem, Verapamil, Flecainide/Propafenon, &amp; Dronedarone (Kelas III)!</strong> Efek inotropik negatifnya mencetuskan syok kardiogenik!"
          : "Jika pasien AF + pasca-PCI (NSTEMI/STEMI), stop triple therapy sedini mungkin (<strong>≤1 minggu</strong>), lalu lanjut <strong>Dual Therapy DOAC + Clopidogrel</strong> (hindari Ticagrelor/Prasugrel bersama OAC!).",
        trap: "Uji CAST &amp; ESC AF 2024: Obat antiaritmia <strong>Kelas IC (Flecainide/Propafenone) KONTRAINDIKASI MUTLAK</strong> pada penyakit jantung struktural, pasca-MI, atau LVEF &lt;40%!"
      };
    }
    if (tab === "cardioversion") {
      const ge48 = dur === "ge48";
      return {
        tone: ge48 ? "warning" : "info",
        rKey: `af-cv-${dur}`,
        title: ge48 ? "Kardioversi AF Onset ≥48 Jam / Durasi Tidak Diketahui" : "Kardioversi AF Onset Pasti <48 Jam",
        c1Label: "Syarat Antikoagulan Pra-Kardioversi",
        c1Body: ge48
          ? "Wajib terapi antikoagulan efektif <strong>minimal 3 minggu sebelumnya</strong> ATAU kerjakan <strong>Transesophageal Echocardiography (TEE)</strong> untuk menyingkirkan trombus LAA sebelum kardioversi."
          : "Mulai heparinisasi (UFH/LMWH) atau DOAC segera sebelum kardioversi. Bila tidak stabil hemodinamik → kardioversi elektrik segera tanpa menunda, lalu mulai OAC!",
        c2Label: "Wajib Pasca-Kardioversi (Atrial Stunning)",
        c2Body: "Seluruh pasien (<strong>termasuk CHA₂DS₂-VA = 0 sekalipun</strong>) WAJIB mendapat OAC <strong>minimal 4 minggu setelah kardioversi</strong> karena atrium kiri mengalami <em>stunning</em> mekanis transien!",
        trap: "Pengecualian Kardioversi: Bila pasien AF Tirotoksikosis datang stabil tanpa trombus/syok, prioritaskan <strong>Beta-Blocker + ATD (PTU/MMI)</strong> — kardioversi elektrik sebelum eutiroid sering gagal mempertahankan sinus!"
      };
    }
    return {
      tone: "warning",
      rKey: "af-abc",
      title: "Penyesuaian Dosis DOAC vs Warfarin (ESC AF 2024 — Hindari Underdosing!)",
      c1Label: "Aturan Dosis DOAC Utama",
      c1Body: "<strong>Apixaban:</strong> 2×5 mg (turunkan ke 2×2,5 mg hanya bila ≥2 kriteria <strong>ABC: Age ≥80, BB ≤60 kg, Cr ≥1,5 mg/dL</strong> atau CrCl 15–29). <strong>Rivaroxaban:</strong> 1×20 mg → 1×15 mg (CrCl 15–49). <strong>Dabigatran:</strong> KI CrCl &lt;30!",
      c2Label: "Kapan HARUS Warfarin (DOAC KI)?",
      c2Body: "<strong>Katup Jantung Mekanik</strong> (wajib Warfarin INR 2,0–3,5) dan <strong>Stenosis Mitral Reumatik Sedang–Berat</strong> (uji INVICTUS: Rivaroxaban kalah vs Warfarin!).",
      trap: "ESC 2024 menekankan <strong>Underdosing DOAC tanpa indikasi berstatus Kelas III Harm</strong> karena menaikkan stroke iskemik tanpa menurunkan perdarahan bermakna!"
    };
  }

  function renderAfCareDoacWidget() {
    const tab = cardioVizState.afCareTab;
    const lvef = cardioVizState.afLvef;
    const dur = cardioVizState.afDur;
    const info = getAfCareReadout(tab, lvef, dur);
    const controlsTop = `
      ${renderCardioTabRow("viz-afCare-tabs", [
        { key: "rate", label: "1. Rate Control (LVEF)", onclick: "window.InternaApp.updateCardioAfCareViz('rate', null, null)" },
        { key: "cardioversion", label: "2. Kardioversi (<48j vs ≥48j)", onclick: "window.InternaApp.updateCardioAfCareViz('cardioversion', null, null)" },
        { key: "abc", label: "3. Kriteria ABC Apixaban", onclick: "window.InternaApp.updateCardioAfCareViz('abc', null, null)" }
      ], tab)}
      <div id="viz-afCare-sub" class="viz-presets ${tab === "abc" ? "hidden" : ""}" style="margin-bottom:0.65rem;">
        ${tab === "rate"
          ? `<button type="button" class="viz-pill-btn ${lvef === "lt40" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, 'lt40', null)">LVEF &lt;40% / ADHF</button>
             <button type="button" class="viz-pill-btn ${lvef === "ge40" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, 'ge40', null)">LVEF ≥40%</button>`
          : `<button type="button" class="viz-pill-btn ${dur === "ge48" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, null, 'ge48')">Durasi ≥48j / Tak Jelas</button>
             <button type="button" class="viz-pill-btn ${dur === "lt48" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, null, 'lt48')">Durasi Pasti &lt;48j</button>`}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "afCare",
      title: "Algoritma AF-CARE: Rate Control LVEF, Kardioversi & Dosis ABC DOAC",
      tag: "ESC AF 2024",
      controlsTop,
      svgHtml: buildAfCareSvg(tab, lvef, dur),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioAfCareViz(tabIn, lvefIn, durIn) {
    if (tabIn === "rate" || tabIn === "cardioversion" || tabIn === "abc") cardioVizState.afCareTab = tabIn;
    if (lvefIn === "lt40" || lvefIn === "ge40") cardioVizState.afLvef = lvefIn;
    if (durIn === "lt48" || durIn === "ge48") cardioVizState.afDur = durIn;
    const tab = cardioVizState.afCareTab;
    const lvef = cardioVizState.afLvef;
    const dur = cardioVizState.afDur;

    syncVizPresets("viz-afCare-tabs", [tab === "rate", tab === "cardioversion", tab === "abc"]);
    const subWrap = document.getElementById("viz-afCare-sub");
    if (subWrap) {
      subWrap.classList.toggle("hidden", tab === "abc");
      if (tab === "rate") {
        subWrap.innerHTML = `<button type="button" class="viz-pill-btn ${lvef === "lt40" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, 'lt40', null)">LVEF &lt;40% / ADHF</button><button type="button" class="viz-pill-btn ${lvef === "ge40" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, 'ge40', null)">LVEF ≥40%</button>`;
      } else if (tab === "cardioversion") {
        subWrap.innerHTML = `<button type="button" class="viz-pill-btn ${dur === "ge48" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, null, 'ge48')">Durasi ≥48j / Tak Jelas</button><button type="button" class="viz-pill-btn ${dur === "lt48" ? "active" : ""}" onclick="window.InternaApp.updateCardioAfCareViz(null, null, 'lt48')">Durasi Pasti &lt;48j</button>`;
      }
    }
    swapVizSvgFrame("viz-afCare-frame", buildAfCareSvg(tab, lvef, dur));
    const info = getAfCareReadout(tab, lvef, dur);
    updateVizReadout("viz-afCare-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }

  // --- C14. Bradiaritmia: Hierarki Konduksi SA -> AV -> His-Purkinje & Strip Blok AV ---
  const BRADY_DATA = {
    deg1: {
      tabLabel: "AV Block Derajat I",
      tone: "info",
      blockY: 90,
      blockLvl: "Perlambatan Nodus AV",
      wave: "M204,126 L216,126 Q221,116 226,126 L254,126 L258,72 L263,136 L270,126 Q280,116 290,126 L314,126 Q319,116 324,126 L352,126 L356,72 L361,136 L368,126 Q378,116 388,126 L456,126",
      stripLbl: "PR Memanjang Konstan >200 ms • Semua P Diteruskan (1:1)",
      c1Label: "Level Anatomis & Ciri EKG",
      c1Body: "Keterlambatan konduksi di nodus AV (<strong>PR &gt;0,20 detik tetap</strong>) tanpa ada gelombang P yang terblok.",
      c2Label: "Tatalaksana & Kapan Waspada",
      c2Body: "Umumnya asimtomatik/jinak (evaluasi obat: beta-bloker, CCB non-DHP, digoksin). Tidak perlu Atropin/PPM kecuali PR ekstrem (&gt;300 ms) disertai gejala sinkronisasi.",
      trap: "Setiap gelombang P selalu diikuti QRS — bila ditemukan 1 saja P tanpa QRS, bukan derajat I lagi melainkan derajat II!"
    },
    mob1: {
      tabLabel: "Mobitz I (Wenckebach)",
      tone: "warning",
      blockY: 96,
      blockLvl: "Suprahisian (Nodus AV)",
      wave: "M200,126 Q205,116 210,126 L224,126 L228,72 L233,136 L242,126 Q247,116 252,126 L278,126 L282,72 L287,136 L296,126 Q301,116 306,126 L342,126 L346,72 L351,136 L364,126 Q369,116 374,126 L398,126 Q403,116 408,126 L422,126 L426,72 L431,136 L448,126",
      stripLbl: "PR Memanjang Progresif → P Terblok! • R-R Makin Pendek → Jeda <2×",
      c1Label: "Ciri Patognomonik (Nodal / Suprahisian)",
      c1Body: "<strong>PR memanjang progresif</strong> (lonjakan terbesar antara beat 1 dan 2!) hingga 1 P gagal konduksi. Jeda &lt;2× R-R dasar; <strong>QRS sempit</strong>.",
      c2Label: "Korelasi Klinis & Respons Atropin",
      c2Body: "Sering muncul pada <strong>STEMI Inferior (RCA memperdarahi nodus AV)</strong> dan bersifat transien! <strong>Responsif terhadap Atropin 1 mg IV</strong>.",
      trap: "Kunci penemuan paling akurat di soal Board: jangan hanya cek PR memanjang — cek juga <strong>interval R-R yang makin memendek sebelum jeda (grouped beating)</strong>!"
    },
    mob2: {
      tabLabel: "Mobitz II (Infranodal!)",
      tone: "danger",
      blockY: 136,
      blockLvl: "Infranodal (His-Purkinje)",
      wave: "M200,126 Q205,116 210,126 L226,126 L232,72 L240,142 L254,126 Q259,116 264,126 L280,126 L286,72 L294,142 L310,126 Q315,116 320,126 L364,126 Q369,116 374,126 L390,126 L396,72 L404,142 L448,126",
      stripLbl: "PR KONSTAN Lalu Tiba-Tiba QRS Hilang • Sering QRS Lebar (BBB)!",
      c1Label: "Bahaya Progresi Mendadak ke Asistol / Total AVB",
      c1Body: "Blok berada di distal berkas His (sering pada <strong>STEMI Anterior luas [LAD]</strong> yang merusak septum!). Interval PR <strong>KONSTAN</strong> sebelum &amp; sesudah P terblok.",
      c2Label: "Mengapa ATROPIN Berbahaya / Gagal?",
      c2Body: "<strong>Atropin meningkatkan laju nodus SA tanpa memperbaiki nodus His-Purkinje yang rusak!</strong> Membanjiri berkas His dengan impuls lebih cepat justru <strong>MEMPERBURUK BLOK (2:1 → 3:1/Total)!</strong>",
      trap: "Mobitz II simtomatik atau asimtomatik sekalipun adalah <strong>indikasi mutlak Pacu Jantung (TCP → Permanent Pacemaker / PPM Kelas I)</strong>!"
    },
    deg3: {
      tabLabel: "Total AV Block (Derajat III)",
      tone: "danger",
      blockY: 118,
      blockLvl: "Disosiasi AV Komplit",
      wave: "M200,126 Q204,116 208,126 L232,126 Q236,116 240,126 L248,74 L256,142 L272,126 Q276,116 280,126 L316,126 Q320,116 324,126 L354,126 L362,74 L370,142 L386,126 Q390,116 394,126 L432,126 Q436,116 440,126 L456,126",
      stripLbl: "P–P & R–R Terpisah Total • Cannon a-Waves (+)",
      c1Label: "Karakteristik Disosiasi Atrioventrikular",
      c1Body: "Tidak ada satu pun gelombang P yang diteruskan ke ventrikel! <strong>P–P berjalan cepat reguler</strong>, sementara <strong>QRS lambat teratur</strong> (Escape Nodal 40–60x sempit vs Ventrikel 20–40x lebar).",
      c2Label: "Tatalaksana Akut ACLS (Tidak Stabil)",
      c2Body: "<strong>Atropin 1 mg IV</strong> tiap 3–5 mnt maks 3 mg (jangan dosis &lt;0,5 mg → efek vagomimetik paradoksal!). Bila gagal/infranodal: segera <strong>Transcutaneous Pacing (TCP)</strong> atau infus <strong>Epinefrin / Dopamin</strong> → PPM!",
      trap: "Singkirkan dulu <strong>kausa reversibel</strong> sebelum memasang PPM permanen (Hiperkalemia berat, STEMI Inferior hari 1–3, hipotiroidisme, toksisitas digoksin/BB/CCB, Penyakit Lyme)!"
    }
  };

  function buildBradySvg(key) {
    const d = BRADY_DATA[key] || BRADY_DATA.mob1;
    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Atlas Sistem Konduksi dan Strip EKG ${d.tabLabel}">
        <!-- Left Conduction Hierarchy -->
        <rect x="8" y="8" width="174" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="95" y="25" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-primary)">SISTEM KONDUKSI</text>
        <rect x="26" y="36" width="138" height="32" rx="6" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
        <text x="95" y="51" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">SA Node (If funny)</text>
        <text x="95" y="63" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-secondary)">60–100 x/menit</text>
        <line x1="95" y1="68" x2="95" y2="84" stroke="var(--text-muted)" stroke-width="2" />
        <rect x="26" y="84" width="138" height="32" rx="6" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
        <text x="95" y="99" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-secondary)">AV Node (Nodal)</text>
        <text x="95" y="111" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-secondary)">Escape 40–60 x/mnt</text>
        <line x1="95" y1="116" x2="95" y2="132" stroke="var(--text-muted)" stroke-width="2" />
        <rect x="26" y="132" width="138" height="32" rx="6" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
        <text x="95" y="147" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">His–Purkinje</text>
        <text x="95" y="159" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-secondary)">Escape 20–40 x/mnt</text>

        <!-- Lesion site marker -->
        <circle class="osm-lesion-pulse" cx="152" cy="${d.blockY}" r="9" fill="var(--accent-coral)" fill-opacity="0.32" stroke="var(--accent-coral)" stroke-width="1.8" />
        <text x="95" y="180" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--accent-coral)">${d.blockLvl}</text>

        <!-- Right ECG Strip -->
        ${svgEcgGridBg(192, 8, 280, 182, 18)}
        <text x="332" y="26" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">${d.tabLabel.toUpperCase()}</text>
        <line x1="198" y1="126" x2="464" y2="126" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <path class="osm-draw" pathLength="320" style="--osm-len: 320;" d="${d.wave}" fill="none" stroke="${d.tone === "danger" ? "var(--accent-coral)" : d.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)"}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        ${key === "mob1" || key === "mob2" ? `<text x="371" y="106" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">P Terblok!</text>` : ""}
        <rect x="200" y="156" width="264" height="24" rx="5" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        <text x="332" y="171.5" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--text-primary)">${d.stripLbl}</text>
      </svg>
    `;
  }

  function renderBradyAvblockWidget() {
    const key = BRADY_DATA[cardioVizState.bradyTab] ? cardioVizState.bradyTab : "mob1";
    const info = BRADY_DATA[key];
    return renderCardioWidgetCard({
      key: "brady",
      title: "Atlas Hierarki Konduksi & Diferensiasi Strip EKG Blok AV",
      tag: "ESC Pacing 2021",
      controlsTop: renderCardioTabRow("viz-brady-tabs", Object.entries(BRADY_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioBradyViz('${k}')`
      })), key),
      svgHtml: buildBradySvg(key),
      info: { ...info, rKey: `brady-${key}`, title: `${info.tabLabel} — ${info.blockLvl}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioBradyViz(tabInput) {
    const key = BRADY_DATA[tabInput] ? tabInput : "mob1";
    cardioVizState.bradyTab = key;
    syncVizPresets("viz-brady-tabs", Object.keys(BRADY_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-brady-frame", buildBradySvg(key));
    const info = BRADY_DATA[key];
    updateVizReadout("viz-brady-readout", info.tone, formatVizReadoutHtml(`${info.tabLabel} — ${info.blockLvl}`, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `brady-${key}`);
  }

  // --- C15. Penyakit Katup: Simulator Fonokardiogram S1-S2 & Manuver Bedside ---
  const VALV_DATA = {
    as: {
      tabLabel: "Stenosis Aorta (AS)",
      timing: "Bising Sistolik Ejeksi (Crescendo-Decrescendo / Diamond)",
      spot: "ICS II Linea Sternalis Kanan → Menjalar ke Karotis!",
      baseTone: "warning",
      desc: "Trias klasik AS Berat: <strong>Angina, Sinkop saat aktivitas, &amp; Gagal Jantung</strong> (prognosis buruk cepat tanpa AVR/TAVI!). Nadi karotis <em>pulsus parvus et tardus</em> + S2 lemah.",
      manNote: {
        base: "Baseline: Bising sistolik ejeksi bentuk berlian (diamond) memuncak di mid-sistolik.",
        valsalva: "MELEMAH (↓): Valsalva menurunkan preload &amp; aliran darah melewati katup aorta stenotik!",
        squat: "MENGERAS (↑): Jongkok meningkatkan preload sehingga volume sekuncup yang melewati katup meningkat!",
        insp: "Cenderung Melemah/Tetap (karena kelainan sisi kiri; hanya bising kanan yang mengeras saat inspirasi)."
      },
      trap: "<strong>Sindrom Heyde:</strong> Kombinasi <strong>Stenosis Aorta Berat + Perdarahan GI berulang akibat Angiodisplasia Kolon</strong> (degradasi multimer von Willebrand oleh gaya geser katup sempit)!"
    },
    mr: {
      tabLabel: "Regurgitasi Mitral (MR)",
      timing: "Bising Holosistolik (Pansistolik Plateau)",
      spot: "Apeks Kardiak (ICS V Midklavikula Kiri) → Menjalar ke Aksila!",
      baseTone: "info",
      desc: "Regurgitasi konstan sejak S1 hingga S2 karena tekanan LV selalu &gt; LA sepanjang sistol; S1 sering melemah dan dapat terdengar S3 akibat pengisian cepat volumetrik.",
      manNote: {
        base: "Baseline: Plateau holosistolik rata dari S1 hingga S2.",
        valsalva: "MELEMAH (↓): Penurunan preload &amp; volume ventrikel kiri menurunkan arus balik mitral.",
        squat: "MENGERAS (↑): Jongkok/handgrip menaikkan afterload resistensi sistemik sehingga darah terdorong balik lebih keras ke Atrium Kiri!",
        insp: "Sedikit melemah saat inspirasi (kontras dengan Regurgitasi Trikuspid yang MENGERAS saat inspirasi / <em>Carvallo Sign</em>!)."
      },
      trap: "Pada soal Board, <strong>Handgrip isometrik &amp; Jongkok (Squatting) memperkeras bising regurgitasi (MR &amp; AR)</strong> karena menaikkan afterload sistemik!"
    },
    ms: {
      tabLabel: "Stenosis Mitral (MS Reumatik)",
      timing: "S1 Keras + Opening Snap (OS) + Mid-Diastolic Rumble",
      spot: "Apeks (Bell Stetoskop, Posisi Left Lateral Decubitus) — Tidak Menjalar",
      baseTone: "warning",
      desc: "&gt;90% akibat <strong>Penyakit Jantung Reumatik (PJR)</strong>! Katup mitral fibrotik membuka mendadak menghasilkan <strong>Opening Snap (OS)</strong> (makin dekat jarak S2–OS, makin berat MS!).",
      manNote: {
        base: "Baseline: S1 keras (sebelum kalsifikasi total), S2 → Opening Snap → Gemuruh (rumble) diastolik nada rendah.",
        valsalva: "MELEMAH (↓): Berkurangnya aliran balik vena ke atrium kiri menurunkan gradien transmitral.",
        squat: "MENGERAS (↑): Kenaikan venous return &amp; takikardia refleks memperjelas rumble diastolik.",
        insp: "Melemah (sisi kiri). Waspadai komplikasi klasik MS berat: Fibrilasi Atrium, trombus LAA, stroke, &amp; hemoptisis!"
      },
      trap: "<strong>Warfarin WAJIB</strong> pada Stenosis Mitral Reumatik sedang-berat disertai AF — <strong>DOAC (Rivaroxaban/Apixaban) kalah efektif (uji INVICTUS)</strong>!"
    },
    ar: {
      tabLabel: "Regurgitasi Aorta (AR)",
      timing: "Bising Early-Diastolic Decrescendo (Tiup Tinggi)",
      spot: "ICS III–IV Kiri (Erb's Point) — Paling Jelas Duduk Condong Depan Ekspirasi Penuh!",
      baseTone: "info",
      desc: "<strong>Tekanan Nadi Melebar (<em>Wide Pulse Pressure</em>, mis. 150/40 mmHg)</strong> dengan <em>Water-Hammer Pulse (Corrigan)</em>, Quincke capilary, &amp; Musset's head bobbing.",
      manNote: {
        base: "Baseline: Decrescendo diastolik dini mulai tepat setelah A2; pada AR berat dapat muncul rumble apikal Austin Flint.",
        valsalva: "MELEMAH (↓): Penurunan preload/stroke volume mengurangi volume regurgitan.",
        squat: "MENGERAS (↑): Kenaikan afterload &amp; preload mendadak memaksa darah aorta regurgitasi lebih banyak ke LV.",
        insp: "Tetap/melemah; pastikan mendengar dengan diafragma saat pasien duduk condong ke depan dan tahan napas akhir ekspirasi!"
      },
      trap: "<strong>IABP KONTRAINDIKASI MUTLAK pada Regurgitasi Aorta</strong>! Selain itu, bila AR berat akut terjadi bersama demam &amp; blok AV baru → curigai <strong>Abses Pangkal Aorta Endokarditis Infektif</strong>!"
    },
    hocm: {
      tabLabel: "HOCM (Pengecualian Board!)",
      timing: "Bising Sistolik Ejeksi LVOT (Mengeras Saat Preload Turun!)",
      spot: "Batas Sternum Kiri Bawah — TIDAK Menjalar ke Karotis",
      baseTone: "danger",
      desc: "Hipertrofi septum asimetris + <em>Systolic Anterior Motion (SAM)</em> daun mitral anterior menyempitkan saluran keluar LV (LVOT). Semakin kosong ventrikel, semakin menyumbat!",
      manNote: {
        base: "Baseline: Bising sistolik halus atau sedang saat LV terisi cukup darah.",
        valsalva: "MENGERAS DRASTIS (↑↑)! Inilah JEBAKAN FAVORIT BOARD: Saat Valsalva/Berdiri menurunkan volume LV, daun mitral makin menempel ke septum sehingga obstruksi LVOT melonjak!",
        squat: "MELEMAH (↓↓): Jongkok menambah volume darah mengisi rongga LV sehingga membuka jalur LVOT yang tersumbat!",
        insp: "Tidak spesifik kanan; hindari dehidrasi, diuretik agresif, nitrat, atau digoksin pada HOCM obstruktif!"
      },
      trap: "Hanya <strong>2 kelainan yang bising/kliknya MENGERAS/MENDAHULUI saat Valsalva/Berdiri</strong>: <strong>HOCM</strong> dan <strong>Mitral Valve Prolapse (MVP — mid-systolic click lebih dini!)</strong>."
    }
  };

  function getMurmurAmplitudeScale(type, man) {
    if (man === "base") return 1.0;
    if (type === "hocm") return man === "valsalva" ? 1.65 : man === "squat" ? 0.55 : 0.9;
    if (man === "valsalva") return 0.58;
    if (man === "squat") return 1.48;
    return 0.85;
  }

  function buildValvularSvg(type, man) {
    const scale = getMurmurAmplitudeScale(type, man);
    const v = VALV_DATA[type] || VALV_DATA.as;
    const isDia = type === "ms" || type === "ar";
    let envSvg = "";
    // S1 at x=76 & x=416; S2 at x=230
    const amp = (val) => (val * scale).toFixed(1);
    if (type === "as" || type === "hocm") {
      const h = Math.min(46, Number(amp(26)));
      envSvg = `<polygon class="osm-breathe" points="92,102 156,${102 - h} 214,102 156,${102 + h}" fill="${type === "hocm" ? "var(--accent-coral-soft)" : "var(--accent-secondary-soft)"}" stroke="${type === "hocm" ? "var(--accent-coral)" : "var(--accent-secondary)"}" stroke-width="2" />
                <text x="155" y="160" text-anchor="middle" font-size="9.5" font-weight="800" fill="${type === "hocm" ? "var(--accent-coral)" : "var(--accent-secondary)"}">${type === "hocm" ? "Crescendo-Decrescendo LVOT" : "Diamond Ejection Systolic (→ Karotis)"}</text>`;
    } else if (type === "mr") {
      const h = Math.min(42, Number(amp(22)));
      envSvg = `<rect class="osm-breathe" x="82" y="${102 - h}" width="144" height="${h * 2}" rx="3" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2" />
                <text x="154" y="160" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--viz-blue)">Holosistolik Plateau (Apeks → Aksila)</text>`;
    } else if (type === "ms") {
      const h = Math.min(36, Number(amp(18)));
      envSvg = `
        <line x1="258" y1="68" x2="258" y2="134" stroke="var(--accent-coral)" stroke-width="2.4" />
        <text x="258" y="60" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-coral)">OS</text>
        <polygon class="osm-breathe" points="266,102 280,${102 - h * 0.7} 364,${102 - h * 0.45} 404,${102 - h * 1.15} 410,102 404,${102 + h * 1.15} 364,${102 + h * 0.45} 280,${102 + h * 0.7}" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="2" />
        <text x="336" y="160" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-secondary)">Opening Snap + Diastolic Rumble</text>
      `;
    } else {
      const h = Math.min(44, Number(amp(26)));
      envSvg = `
        <polygon class="osm-breathe" points="236,${102 - h} 248,${102 - h * 0.9} 396,102 248,${102 + h * 0.9} 236,${102 + h}" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
        <text x="318" y="160" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">Early Diastolic Decrescendo (Erb's Point)</text>
      `;
    }

    const manBadge = man === "base" ? "BASELINE (1.0×)" : (type === "hocm" ? (man === "valsalva" ? "VALSALVA → MENGERAS ↑↑!" : man === "squat" ? "JONGKOK → MELEMAH ↓↓" : "INSPIRASI") : (man === "valsalva" ? "VALSALVA → MELEMAH ↓" : man === "squat" ? "JONGKOK → MENGERAS ↑" : "INSPIRASI (Kiri ↓ / Kanan ↑)"));

    return `
      <svg class="viz-svg" viewBox="0 0 480 188" role="img" aria-label="Fonokardiogram ${v.tabLabel} Saat ${manBadge}">
        <rect x="12" y="10" width="456" height="168" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="24" y="28" font-size="10.2" font-weight="800" fill="var(--text-primary)">FONOKARDIOGRAM: ${v.tabLabel.toUpperCase()}</text>
        <text x="456" y="28" text-anchor="end" font-size="10" font-weight="800" fill="${scale > 1.2 ? "var(--accent-coral)" : scale < 0.75 ? "var(--text-muted)" : "var(--accent-primary)"}">${manBadge}</text>

        <!-- Phase backgrounds -->
        <rect x="76" y="42" width="154" height="102" fill="${!isDia ? "var(--bg-surface)" : "transparent"}" opacity="0.65" />
        <rect x="230" y="42" width="186" height="102" fill="${isDia ? "var(--bg-surface)" : "transparent"}" opacity="0.65" />
        <text x="153" y="54" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-muted)">SISTOLIK</text>
        <text x="323" y="54" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--text-muted)">DIASTOLIK</text>

        <line x1="36" y1="102" x2="448" y2="102" stroke="var(--border-strong)" stroke-width="1.4" />
        <!-- Murmur envelope -->
        ${envSvg}

        <!-- Heart sounds S1 - S2 - S1 -->
        <rect x="72" y="${type === "ms" ? "50" : "58"}" width="8" height="${type === "ms" ? "94" : "80"}" rx="2" fill="var(--text-primary)" />
        <text x="76" y="152" text-anchor="middle" font-size="10.5" font-weight="900" fill="var(--text-primary)">S1</text>
        <rect x="226" y="64" width="8" height="72" rx="2" fill="var(--text-primary)" opacity="${type === "as" ? "0.45" : "0.95"}" />
        <text x="230" y="152" text-anchor="middle" font-size="10.5" font-weight="900" fill="var(--text-primary)">S2</text>
        <rect x="412" y="${type === "ms" ? "50" : "58"}" width="8" height="${type === "ms" ? "94" : "80"}" rx="2" fill="var(--text-primary)" />
        <text x="416" y="152" text-anchor="middle" font-size="10.5" font-weight="900" fill="var(--text-primary)">S1</text>
      </svg>
    `;
  }

  function renderValvularMurmurWidget() {
    const type = VALV_DATA[cardioVizState.valvType] ? cardioVizState.valvType : "as";
    const man = cardioVizState.valvManeuver;
    const v = VALV_DATA[type];
    const info = {
      tone: type === "hocm" && man === "valsalva" ? "danger" : v.baseTone,
      rKey: `valv-${type}-${man}`,
      title: `${v.tabLabel} — ${v.timing}`,
      c1Label: "Lokasi Auskultasi & Karakteristik",
      c1Body: `<strong>${v.spot}</strong>. ${v.desc}`,
      c2Label: "Efek Manuver Bedside Saat Ini",
      c2Body: v.manNote[man] || v.manNote.base,
      trap: v.trap
    };
    const controlsTop = `
      ${renderCardioTabRow("viz-valv-type-tabs", Object.entries(VALV_DATA).map(([k, it]) => ({
        key: k, label: it.tabLabel, onclick: `window.InternaApp.updateCardioValvularViz('${k}', null)`
      })), type)}
      ${renderCardioTabRow("viz-valv-man-tabs", [
        { key: "base", label: "Baseline", onclick: "window.InternaApp.updateCardioValvularViz(null, 'base')" },
        { key: "valsalva", label: "Valsalva / Berdiri (Preload ↓)", onclick: "window.InternaApp.updateCardioValvularViz(null, 'valsalva')" },
        { key: "squat", label: "Jongkok / Leg Raise (Preload ↑)", onclick: "window.InternaApp.updateCardioValvularViz(null, 'squat')" },
        { key: "insp", label: "Inspirasi Dalam (Carvallo)", onclick: "window.InternaApp.updateCardioValvularViz(null, 'insp')" }
      ], man, "viz-presets")}
    `;
    return renderCardioWidgetCard({
      key: "valv",
      title: "Simulator Fonokardiogram Katup & Manuver Hemodinamik Bedside",
      tag: "Board Auskultasi",
      controlsTop,
      svgHtml: buildValvularSvg(type, man),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioValvularViz(typeIn, manIn) {
    if (VALV_DATA[typeIn]) cardioVizState.valvType = typeIn;
    if (manIn === "base" || manIn === "valsalva" || manIn === "squat" || manIn === "insp") cardioVizState.valvManeuver = manIn;
    const type = cardioVizState.valvType;
    const man = cardioVizState.valvManeuver;
    const v = VALV_DATA[type];
    syncVizPresets("viz-valv-type-tabs", Object.keys(VALV_DATA).map((k) => k === type));
    syncVizPresets("viz-valv-man-tabs", ["base", "valsalva", "squat", "insp"].map((k) => k === man));
    swapVizSvgFrame("viz-valv-frame", buildValvularSvg(type, man));
    const tone = type === "hocm" && man === "valsalva" ? "danger" : v.baseTone;
    updateVizReadout("viz-valv-readout", tone, formatVizReadoutHtml(`${v.tabLabel} — ${v.timing}`, "Lokasi Auskultasi &amp; Karakteristik", `<strong>${v.spot}</strong>. ${v.desc}`, "Efek Manuver Bedside Saat Ini", v.manNote[man] || v.manNote.base, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${v.trap}</p>`), `valv-${type}-${man}`);
  }

  // --- C16. Perikarditis Akut vs STEMI vs Early Repolarization (EKG Differential) ---
  const PERI_DATA = {
    peri: {
      tabLabel: "Perikarditis Akut (PR↓ + ST Konkaf)",
      tone: "info",
      color: "var(--accent-primary)",
      wave: "M34,116 L54,116 Q64,104 74,116 L84,126 L112,126 L120,132 L128,44 L136,128 Q154,96 176,82 Q196,68 214,116 L246,124 L274,124",
      v6Ratio: "Rasio ST / T di V6 &gt; 0,25 (Sangat Spesifik Perikarditis!)",
      c1Label: "4 Tanda Patognomonik EKG Perikarditis",
      c1Body: "(1) <strong>Elevasi ST konkaf (<em>saddle-shaped</em>) difus</strong> lintas teritori koroner; (2) <strong>Depresi segmen PR</strong> (PR↑ + ST↓ resiprokal di aVR); (3) <strong>Spodick's Sign</strong> (segmen TP turun); (4) <strong>Tidak ada Q patologis</strong>!",
      c2Label: "Terapi Lini 1 (ESC Guidelines)",
      c2Body: "<strong>Ibuprofen 3×600 mg</strong> (atau Aspirin 3×750–1000 mg) tapering + <strong>WAJIB Kolkisin 0,5 mg 2×/hari (&le;70 kg 1×/hari) selama 3 bulan!</strong> (Kolkisin memangkas relaps &gt;50%!).",
      trap: "<strong>2 Larangan Kritis:</strong> (1) Jangan beri trombolitik/antikoagulan dosis penuh karena memicu hemoperikardium tamponade; (2) Hindari Kortikosteroid lini awal (meningkatkan angka kekambuhan kronik — pakai hanya bila refrakter/autoimun!)."
    },
    stemi: {
      tabLabel: "STEMI Oklusif (ST Konveks + Reciprocal)",
      tone: "danger",
      color: "var(--accent-coral)",
      wave: "M34,116 L54,116 Q64,104 74,116 L112,116 L120,144 L130,44 L138,76 Q174,48 206,82 Q220,104 234,116 L274,116",
      v6Ratio: "Depresi ST Resiprokal Nyata di Sadapan Berhadapan!",
      c1Label: "Ciri Pemisah dari Perikarditis Akut",
      c1Body: "Elevasi ST <strong>konveks (<em>tombstone / dome-shaped</em>)</strong> terbatas pada 1 teritori anatomis koroner + <strong>depresi ST resiprokal</strong> + muncul <strong>gelombang Q patologis</strong>; segmen PR tetap isoelektrik.",
      c2Label: "Klinis Nyeri & Biomarker",
      c2Body: "Nyeri menekan berat tidak berkurang saat duduk membungkuk ke depan; Troponin naik jauh tinggi sesuai kurva infark. Segera aktifkan jalur reperfusi PPCI ≤120 mnt!",
      trap: "Pada kasus <strong>Mioperikarditis</strong> (perikarditis disertai kenaikan Troponin akibat inflamasi epimiokardium), pasien tetap harus masuk observasi ketat dan dibatasi aktivitas fisik berat selama 3–6 bulan!"
    },
    erp: {
      tabLabel: "Early Repolarization (Varian Normal)",
      tone: "warning",
      color: "var(--viz-blue)",
      wave: "M34,116 L54,116 Q64,104 74,116 L112,116 L120,126 L128,44 L136,120 L142,96 L148,104 Q174,88 196,52 Q212,68 228,116 L274,116",
      v6Ratio: "Rasio ST / T di V6 &lt; 0,25 + J-Point Fish-Hook Notching",
      c1Label: "Ciri EKG Benign Early Repolarization",
      c1Body: "Sering pada pria muda atletis di V2–V5: <strong>J-point notching (bentuk mata kail / <em>fish-hook</em>)</strong> diikuti gelombang T sangat tinggi simetris sehingga <strong>rasio amplitudo ST / tinggi T di V6 &lt; 0,25</strong>!",
      c2Label: "Pembanding Segmen PR & Klinis",
      c2Body: "Segmen PR normal (tidak depresi difus), tidak ada <em>pericardial friction rub</em>, nyeri dada pleuritik khas tidak ada, dan gambaran EKG menetap tidak berevolusi cepat.",
      trap: "Menghafal angka uji V6: <strong>ST/T V6 &gt; 0,25 → Perikarditis Akut</strong>; <strong>ST/T V6 &lt; 0,25 → Early Repolarization</strong>!"
    }
  };

  function buildPericarditisSvg(key) {
    const d = PERI_DATA[key] || PERI_DATA.peri;
    return `
      <svg class="viz-svg" viewBox="0 0 480 188" role="img" aria-label="Perbandingan Morfologi EKG ${d.tabLabel}">
        ${svgEcgGridBg(12, 10, 290, 168, 18)}
        <text x="157" y="27" text-anchor="middle" font-size="10" font-weight="800" fill="${d.color}">${d.tabLabel.split("(")[0].trim().toUpperCase()}</text>
        <line x1="22" y1="116" x2="292" y2="116" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <path class="osm-draw" pathLength="280" style="--osm-len: 280;" d="${d.wave}" fill="none" stroke="${d.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        ${key === "peri" ? `<circle class="osm-lesion-pulse" cx="98" cy="126" r="10" fill="var(--accent-secondary)" fill-opacity="0.28" stroke="var(--accent-secondary)" /><text x="98" y="148" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-secondary)">PR↓!</text><text x="176" y="70" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-primary)">ST Konkaf</text>` : key === "stemi" ? `<text x="174" y="48" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">ST Konveks!</text><text x="112" y="156" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">Q Patologis</text>` : `<text x="148" y="90" text-anchor="middle" font-size="9" font-weight="800" fill="var(--viz-blue)">J-Notch!</text><text x="196" y="44" text-anchor="middle" font-size="9" font-weight="800" fill="var(--viz-blue)">T Tinggi (ST/T&lt;0,25)</text>`}

        <rect x="312" y="10" width="156" height="168" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="390" y="31" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">RINGKASAN BOARD</text>
        <text x="390" y="54" text-anchor="middle" font-size="9.2" font-weight="800" fill="${d.color}">V6 ST/T Ratio:</text>
        <text x="390" y="69" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-secondary)">${key === "peri" ? "> 0,25 (Perikarditis!)" : key === "stemi" ? "Terlokalisasi + Recip" : "< 0,25 (Benign ERP)"}</text>
        <text x="390" y="96" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)">Segmen PR:</text>
        <text x="390" y="111" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-secondary)">${key === "peri" ? "Depresi Difus (PR↑ aVR)" : "Isoelektrik Normal"}</text>
        <rect x="322" y="128" width="136" height="38" rx="6" fill="var(--bg-surface)" stroke="${d.color}" />
        <text x="390" y="145" text-anchor="middle" font-size="8.8" font-weight="800" fill="${d.color}">${key === "peri" ? "OAINS + Kolkisin 3 bln" : key === "stemi" ? "Reperfusi PPCI ≤120m" : "Yakinkan (Observasi)"}</text>
        <text x="390" y="159" text-anchor="middle" font-size="8.3" font-weight="700" fill="var(--text-muted)">${key === "peri" ? "Hindari Steroid Dini" : key === "stemi" ? "Jangan Salah Diagnosa!" : "Cek Duke-ISCVID IE"}</text>
      </svg>
    `;
  }

  function renderPericarditisEcgWidget() {
    const key = PERI_DATA[cardioVizState.periTab] ? cardioVizState.periTab : "peri";
    const info = PERI_DATA[key];
    return renderCardioWidgetCard({
      key: "peri",
      title: "Diferensiasi EKG Perikarditis Akut vs STEMI vs Early Repolarization",
      tag: "ESC Pericardium",
      controlsTop: renderCardioTabRow("viz-peri-tabs", Object.entries(PERI_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioPericarditisViz('${k}')`
      })), key),
      svgHtml: buildPericarditisSvg(key),
      info: { ...info, rKey: `peri-${key}`, title: `${info.tabLabel} — ${info.v6Ratio}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioPericarditisViz(tabInput) {
    const key = PERI_DATA[tabInput] ? tabInput : "peri";
    cardioVizState.periTab = key;
    syncVizPresets("viz-peri-tabs", Object.keys(PERI_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-peri-frame", buildPericarditisSvg(key));
    const info = PERI_DATA[key];
    updateVizReadout("viz-peri-readout", info.tone, formatVizReadoutHtml(`${info.tabLabel} — ${info.v6Ratio}`, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `peri-${key}`);
  }

  // --- C17. Tamponade vs Perikarditis Konstriktif vs Infark RV (Kurva JVP & Hemodinamik) ---
  const TAMP_DATA = {
    tamp: {
      tabLabel: "1. Tamponade Jantung",
      tone: "danger",
      jvpPath: "M24,132 L64,132 L82,114 L98,162 L126,120 L166,120 L184,112 L200,162 L232,120 L276,120",
      jvpLbl: "JVP: x-descent Tajam • HILANGNYA y-descent (Absent y!)",
      badges: ["Pulsus Paradoksus >10 mmHg (+)", "Tanda Kussmaul: NEGATIF (−)", "Equalisasi RA≈RVEDP≈PCWP"],
      c1Label: "Mekanisme JVP & EKG Khas",
      c1Body: "Kantung perikardium terkunci mengompresi ruang jantung (RA≈RV≈PCWP ~15–25 mmHg): darah gagal mengalir cepat saat trikuspid terbuka → <strong>y-descent menghilang</strong>! EKG: Sinus takikardia + <em>Low Voltage</em> + <strong>Electrical Alternans</strong> (<em>swinging heart</em>).",
      c2Label: "Tatalaksana & False-Negative Pulsus",
      c2Body: "<strong>Perikardiosentesis subksifoid dipandu TTE (Kelas I)</strong> + bolus kristaloid sementara. Waspada <em>false-negative</em> pulsus paradoksus pada <strong>AR berat</strong> &amp; ASD!",
      trap: "<strong>KONTRAINDIKASI PERIKARDIOSENTESIS PENUH</strong> bila Tamponade disebabkan oleh <strong>Diseksi Aorta Tipe A / Free Wall Rupture</strong> — menurunkan tekanan perikardial mendadak memicu perdarahan ulang fatal; langsung kirim kamar operasi cito!"
    },
    const: {
      tabLabel: "2. Konstriktif Kronik (TB)",
      tone: "warning",
      jvpPath: "M24,126 L56,110 L76,162 L94,118 L114,164 L138,126 L176,110 L196,162 L214,118 L234,164 L276,126",
      jvpLbl: "JVP: x & y Sama Tajam (W-Sign) • Kateter: Square-Root Sign!",
      badges: ["Tanda Kussmaul POSITIF Kuat (+)", "Pericardial Knock Diastolik Awal", "Asites Pra-Edema + Kalsifikasi TB"],
      c1Label: "Fisiologi Cangkang Kaku Fibrotik",
      c1Body: "Pengisian diastolik sangat cepat di awal diastol (<strong>y-descent tajam</strong> &amp; bunyi <em>Pericardial Knock</em>!) lalu mendadak membentur cangkang kaku membentuk <strong>Dip-and-Plateau (Square-Root Sign)</strong>.",
      c2Label: "Tanda Kussmaul & Diagnosis di Indonesia",
      c2Body: "Tekanan negatif inspirasi tidak diteruskan menembus cangkang fibrotik → JVP justru NAIK saat inspirasi (<strong>Kussmaul +</strong>). Penyebab tersering di Indonesia: <strong>Tuberkulosis Perikardium!</strong> Terapi definitif: <strong>Perikardiektomi</strong>.",
      trap: "Bedakan Tamponade vs Konstriktif: Tamponade = <strong>y-descent HILANG + Kussmaul (−)</strong>; Konstriktif = <strong>y-descent TAJAM + Kussmaul (+) + Knock</strong>!"
    },
    rvmi: {
      tabLabel: "3. Infark Ventrikel Kanan",
      tone: "warning",
      jvpPath: "M24,132 L64,132 L82,126 L102,116 L124,164 L162,130 L200,126 L220,116 L242,164 L276,132",
      jvpLbl: "JVP: Dominan y-descent / Gelombang v (TR) • EKG: V4R ST↑!",
      badges: ["Tanda Kussmaul: POSITIF (+)", "Paru Bersih + STEMI Inferior!", "HARAM Nitrat / Furosemid!"],
      c1Label: "Trias & Korelasi Anatomis RCA",
      c1Body: "Trias klasik: <strong>Hipotensi (terutama pasca-nitrat!) + JVP tinggi + Auskultasi paru bersih</strong> pada pasien STEMI Inferior (oklusi <strong>RCA proksimal</strong>). Sadapan wajib: <strong>V4R elevasi ST ≥0,5 mm</strong>!",
      c2Label: "Stabilisator & Reperfusi Segera",
      c2Body: "Pertahankan preload RV dengan <strong>cairan NaCl 0,9% hati-hati</strong> (jika tidak ada edema paru), pertahankan sinkronisitas AV (segera atasi bradikardia/AV block), &amp; lakukan PPCI!",
      trap: "Mengapa pasien Infark RV punya paru bersih? Karena ventrikel kanan yang lumpuh tidak mampu memompa darah masuk ke sirkulasi pulmonal!"
    }
  };

  function buildTamponadeSvg(key) {
    const d = TAMP_DATA[key] || TAMP_DATA.tamp;
    const col = d.tone === "danger" ? "var(--accent-coral)" : "var(--accent-secondary)";
    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Kurva JVP dan Hemodinamik ${d.tabLabel}">
        <!-- Left JVP Waveform Panel -->
        <rect x="8" y="8" width="278" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="147" y="26" text-anchor="middle" font-size="10" font-weight="800" fill="${col}">KURVA GELOMBANG VENA JUGULARIS (JVP)</text>
        <line x1="20" y1="132" x2="276" y2="132" stroke="var(--border-strong)" stroke-dasharray="3 2" />
        <path class="osm-draw" pathLength="280" style="--osm-len: 280;" d="${d.jvpPath}" fill="none" stroke="${col}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        ${key === "tamp" ? `<text x="98" y="176" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">x Tajam</text><text x="148" y="109" text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--accent-coral)">y HILANG!</text>` : key === "const" ? `<text x="76" y="176" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-secondary)">x</text><text x="114" y="176" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-secondary)">y Tajam (W!)</text>` : `<text x="124" y="176" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-secondary)">Dominan y-descent</text>`}
        <text x="147" y="187" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-primary)">${d.jvpLbl}</text>

        <!-- Right Key Diagnostic Pill Cards -->
        <rect x="294" y="8" width="178" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="383" y="28" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">3 KUNCI PEMBEDA</text>
        ${d.badges.map((b, idx) => `
          <rect x="304" y="${42 + idx * 46}" width="158" height="36" rx="7" fill="var(--bg-surface)" stroke="${col}" stroke-width="1.4" />
          <text x="383" y="${64 + idx * 46}" text-anchor="middle" font-size="9" font-weight="800" fill="${idx === 0 ? col : "var(--text-primary)"}">${b}</text>
        `).join("")}
      </svg>
    `;
  }

  function renderTamponadeWiggersWidget() {
    const key = TAMP_DATA[cardioVizState.tampTab] ? cardioVizState.tampTab : "tamp";
    const info = TAMP_DATA[key];
    return renderCardioWidgetCard({
      key: "tamp",
      title: "Komparasi Master Tamponade vs Perikarditis Konstriktif vs Infark RV",
      tag: "Hemodinamik & JVP",
      controlsTop: renderCardioTabRow("viz-tamp-tabs", Object.entries(TAMP_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioTamponadeViz('${k}')`
      })), key),
      svgHtml: buildTamponadeSvg(key),
      info: { ...info, rKey: `tamp-${key}`, title: `${info.tabLabel} — ${info.jvpLbl}` },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioTamponadeViz(tabInput) {
    const key = TAMP_DATA[tabInput] ? tabInput : "tamp";
    cardioVizState.tampTab = key;
    syncVizPresets("viz-tamp-tabs", Object.keys(TAMP_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-tamp-frame", buildTamponadeSvg(key));
    const info = TAMP_DATA[key];
    updateVizReadout("viz-tamp-readout", info.tone, formatVizReadoutHtml(`${info.tabLabel} — ${info.jvpLbl}`, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `tamp-${key}`);
  }

  // --- C18. Aorta & PAD: Stanford A/B Anti-Impuls + ABI/TBI + Rutherford ALI ---
  const AORTA_DATA = {
    dissection: {
      tabLabel: "1. Stanford A/B & Anti-Impuls dP/dt",
      tone: "danger",
      c1Label: "Klasifikasi & Terapi Definitif (ESC Aorta 2024)",
      c1Body: "<strong>Stanford Tipe A (Melibatkan Aorta Asendens):</strong> Mortalitas naik 1–2%/jam → <strong>Operasi Bedah Terbuka Darurat!</strong> • <strong>Stanford Tipe B (Distal Subklavia Kiri):</strong> Anti-impuls ICU (TEVAR bila malperfusi/ruptur).",
      c2Label: "Urutan WAJIB Anti-Impuls (<20 Menit!)",
      c2Body: "<strong>(1) Morfin IV</strong> → <strong>(2) Beta-Blocker IV DULU: Esmolol / Labetalol target HR &lt;60 x/mnt</strong> → <strong>(3) HANYA setelah HR &lt;60: Nikardipin/Nitroprusid IV target TDS 100–120 mmHg</strong>!",
      trap: "<strong>2 Jebakan Mematikan:</strong> (1) Jangan beri vasodilator murni dulu (refleks takikardia memperbesar robekan dP/dt!); (2) Diseksi menyumbat RCA sering memicu <strong>EKG STEMI Inferior</strong> — pemberian Loading DAPT/Fibrinolitik berakibat fatal!"
    },
    abi: {
      tabLabel: "2. PAD Kronik: ABI vs TBI (>1,40)",
      tone: "warning",
      c1Label: "Interpretasi Ankle-Brachial Index (ABI)",
      c1Body: "<strong>ABI ≤0,90:</strong> Diagnostik PAD (&lt;0,40 iskemia berat / CLTI). <strong>ABI 1,00–1,40:</strong> Normal. <strong>ABI &gt;1,40:</strong> Arteri kaku kalsifikasi tunika media Mönckeberg (sering DM/PGK) → <strong>WAJIB ukur Toe-Brachial Index (TBI; PAD jika &lt;0,70)!</strong>",
      c2Label: "Terapi PAD & Penyakit Buerger",
      c2Body: "Latihan jalan terstruktur + stop rokok + Statin intensitas tinggi + antiplatelet (Cilostazol memperbaiki jarak jalan, <strong>KONTRAINDIKASI Gagal Jantung!</strong>). Pria muda perokok berat nekrosis jari simetris → <strong>Penyakit Buerger (Stop Rokok Mutlak!)</strong>.",
      trap: "Di soal Board pasien DM + PGK datang nyeri betis klaudikasio dengan hasil <strong>ABI = 1,55</strong> — jangan simpulkan 'Normal'! Arteri terkalsifikasi → periksa <strong>TBI (&lt;0,70)</strong>!"
    },
    ali: {
      tabLabel: "3. ALI: 6P & Viabilitas Rutherford",
      tone: "danger",
      c1Label: "Klasifikasi Viabilitas Kritis (6P)",
      c1Body: "<strong>6P:</strong> Pain, Pallor, Pulselessness, Poikilothermia, Paresthesia, Paralysis. • <strong>Rutherford I:</strong> Utuh, Doppler arteri (+). • <strong>IIa:</strong> Baal ujung jari, motorik utuh. • <strong>IIb:</strong> Defisit motorik/parestesia berat (<em>Immediately Threatened → Revaskularisasi Cito!</em>). • <strong>III:</strong> Paralisis total, Doppler arteri &amp; vena (−) → <strong>Amputasi Primer</strong>!",
      c2Label: "Tindakan Menit Pertama & Reperfusi",
      c2Body: "Berikan <strong>Bolus UFH Intravena SEGERA</strong> untuk mencegah propagasi trombus! Setelah revaskularisasi IIb lanjutkan pantau <strong>Sindrom Kompartemen</strong> (fasiotomi) &amp; <strong>Hiperkalemia / Rabdomiolisis</strong>.",
      trap: "Mencoba trombolisis atau revaskularisasi ekstremitas pada <strong>Rutherford Kategori III (ireversibel / rigor)</strong> justru melepaskan K+, laktat, &amp; mioglobin masif ke sirkulasi sistemik → henti jantung!"
    }
  };

  function buildAortaPadSvg(key) {
    if (key === "dissection") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Diagram Diseksi Aorta Stanford A vs B dan Terapi Anti-Impuls">
          ${svgArrowMarker("c-ao-arr", "var(--accent-coral)")}
          <rect x="8" y="8" width="204" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="110" y="25" text-anchor="middle" font-size="10" font-weight="800" fill="var(--accent-coral)">STANFORD A VS TIPE B</text>
          <!-- Aortic arch schematic -->
          <path d="M84,158 L84,78 Q84,40 124,40 Q162,40 162,80 L162,162" fill="none" stroke="var(--accent-coral-soft)" stroke-width="22" stroke-linecap="round" />
          <path d="M84,158 L84,78 Q84,40 124,40 Q162,40 162,80 L162,162" fill="none" stroke="var(--accent-coral)" stroke-width="2.2" />
          <path class="osm-axon-flow" d="M84,140 L84,82 Q84,54 124,54" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" />
          <line x1="126" y1="22" x2="126" y2="62" stroke="var(--text-primary)" stroke-width="2" />
          <circle class="osm-lesion-pulse" cx="84" cy="108" r="9" fill="var(--accent-coral)" fill-opacity="0.3" stroke="var(--accent-coral)" />
          <text x="54" y="106" text-anchor="end" font-size="9" font-weight="800" fill="var(--accent-coral)">Tipe A</text>
          <text x="54" y="118" text-anchor="end" font-size="8" font-weight="700" fill="var(--text-muted)">(Bedah!)</text>
          <text x="184" y="106" font-size="9" font-weight="800" fill="var(--viz-blue)">Tipe B</text>
          <text x="184" y="118" font-size="8" font-weight="700" fill="var(--text-muted)">(ICU/TEVAR)</text>
          <text x="110" y="180" text-anchor="middle" font-size="8.6" font-weight="800" fill="var(--text-primary)">Subklavia Kiri = Garis Batas</text>

          <rect x="220" y="8" width="252" height="182" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="346" y="27" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">URUTAN WAJIB ANTI-IMPULS dP/dt</text>
          <rect x="234" y="38" width="224" height="38" rx="6" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
          <text x="346" y="54" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">LANGKAH 1 DAHULU: BETA-BLOCKER IV</text>
          <text x="346" y="68" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">Esmolol / Labetalol → Target HR &lt;60 x/mnt!</text>
          <line x1="346" y1="77" x2="346" y2="92" stroke="var(--accent-coral)" stroke-width="2" marker-end="url(#c-ao-arr)" />
          <rect x="234" y="94" width="224" height="38" rx="6" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
          <text x="346" y="110" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">LANGKAH 2 (Setelah HR &lt;60): Nikardipin</text>
          <text x="346" y="124" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">Target TDS 100–120 mmHg (+ Morfin IV)</text>
          <rect x="234" y="142" width="224" height="36" rx="6" fill="var(--bg-surface)" stroke="var(--accent-coral)" />
          <text x="346" y="158" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--accent-coral)">JEBAKAN: Jangan DAPT pada Diseksi →</text>
          <text x="346" y="171" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-secondary)">STEMI Inferior / Cek Asimetri TD Lengan!</text>
        </svg>
      `;
    }
    if (key === "abi") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Spektrum Interpretasi ABI dan TBI pada PAD">
          <rect x="12" y="10" width="456" height="178" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="240" y="30" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text-primary)">SPEKTRUM ANKLE-BRACHIAL INDEX (ABI = TDS KAKI / TDS LENGAN)</text>
          <rect x="28" y="54" width="84" height="44" rx="4" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
          <rect x="114" y="54" width="96" height="44" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" />
          <rect x="212" y="54" width="128" height="44" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" />
          <rect x="342" y="54" width="110" height="44" rx="4" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" />
          <text x="70" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">&lt; 0,40</text>
          <text x="70" y="88" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-primary)">CLTI Berat</text>
          <text x="162" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-secondary)">0,41–0,90</text>
          <text x="162" y="88" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-primary)">Diagnostik PAD</text>
          <text x="276" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-primary)">0,91–1,40</text>
          <text x="276" y="88" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--text-primary)">Border / Normal</text>
          <text x="397" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">&gt; 1,40!</text>
          <text x="397" y="88" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--accent-coral)">Kaku / Mönckeberg</text>

          <rect x="28" y="114" width="424" height="58" rx="8" fill="var(--bg-surface)" stroke="var(--accent-secondary)" />
          <text x="240" y="135" text-anchor="middle" font-size="9.8" font-weight="800" fill="var(--accent-secondary)">ABI &gt; 1,40 pada Pasien DM / PGK = ARTERI NON-COMPRESSIBLE (BUKAN NORMAL!)</text>
          <text x="240" y="154" text-anchor="middle" font-size="9.2" font-weight="700" fill="var(--text-primary)">Wajib lanjutkan Toe-Brachial Index (TBI → diagnostik PAD jika &lt; 0,70)!</text>
        </svg>
      `;
    }
    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Klasifikasi Rutherford Acute Limb Ischemia">
        <rect x="12" y="10" width="456" height="178" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="240" y="29" text-anchor="middle" font-size="10.2" font-weight="800" fill="var(--accent-coral)">ACUTE LIMB ISCHEMIA (ALI): 6P &amp; KLASIFIKASI RUTHERFORD</text>
        ${[
          { r: "I: Viable", desc: "Motor & Sens Utuh\nDoppler A(+) V(+)", tx: "CTA & Elektif", x: 22, c: "var(--accent-primary)" },
          { r: "IIa: Marginal", desc: "Baal Ujung Jari\nDoppler A(−) V(+)", tx: "Revaskularisasi Dini", x: 132, c: "var(--accent-secondary)" },
          { r: "IIb: Immediate", desc: "Motorik Lemah!\nDoppler A(−) V(+)", tx: "CITO + UFH IV!", x: 242, c: "var(--accent-coral)" },
          { r: "III: Ireversibel", desc: "Paralisis / Rigor\nDoppler A(−) V(−)", tx: "Amputasi Primer!", x: 352, c: "var(--accent-coral)" }
        ].map((col) => `
          <rect x="${col.x}" y="42" width="104" height="132" rx="7" fill="var(--bg-surface)" stroke="${col.c}" stroke-width="1.8" />
          <text x="${col.x + 52}" y="62" text-anchor="middle" font-size="9.5" font-weight="800" fill="${col.c}">${col.r}</text>
          <text x="${col.x + 52}" y="90" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-primary)">${col.desc.split("\n")[0]}</text>
          <text x="${col.x + 52}" y="108" text-anchor="middle" font-size="8.6" font-weight="700" fill="var(--text-secondary)">${col.desc.split("\n")[1]}</text>
          <rect x="${col.x + 8}" y="132" width="88" height="28" rx="5" fill="${col.c}" fill-opacity="0.14" />
          <text x="${col.x + 52}" y="150" text-anchor="middle" font-size="8.6" font-weight="800" fill="${col.c}">${col.tx}</text>
        `).join("")}
      </svg>
    `;
  }

  function renderAortaPadWidget() {
    const key = AORTA_DATA[cardioVizState.aortaTab] ? cardioVizState.aortaTab : "dissection";
    const info = AORTA_DATA[key];
    return renderCardioWidgetCard({
      key: "aortaPad",
      title: "Atlas Diseksi Aorta Stanford A/B, ABI/TBI PAD & Rutherford ALI",
      tag: "ESC Aorta & PAD 2024",
      controlsTop: renderCardioTabRow("viz-aortaPad-tabs", Object.entries(AORTA_DATA).map(([k, v]) => ({
        key: k, label: v.tabLabel, onclick: `window.InternaApp.updateCardioAortaPadViz('${k}')`
      })), key),
      svgHtml: buildAortaPadSvg(key),
      info: { ...info, rKey: `aorta-${key}`, title: info.tabLabel },
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioAortaPadViz(tabInput) {
    const key = AORTA_DATA[tabInput] ? tabInput : "dissection";
    cardioVizState.aortaTab = key;
    syncVizPresets("viz-aortaPad-tabs", Object.keys(AORTA_DATA).map((k) => k === key));
    swapVizSvgFrame("viz-aortaPad-frame", buildAortaPadSvg(key));
    const info = AORTA_DATA[key];
    updateVizReadout("viz-aortaPad-readout", info.tone, formatVizReadoutHtml(info.tabLabel, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `aorta-${key}`);
  }

  // --- C19. Emboli Paru: Siklus RV Death Spiral & Matriks 4 Risiko ESC 2019 ---
  const PE_RISKS = {
    high: { label: "High-Risk (Masif)", shock: "YA (+)", spesi: "+ / Wajib", rv: "YA (+)", trop: "(+)", tone: "danger", tx: "<strong>Reperfusi Primer Segera: Alteplase 100 mg/2 jam IV</strong> (atau Tenecteplase) + <strong>Bolus UFH 80 IU/kg + 18 IU/kg/jam IV</strong>! Embolektomi/kateter bila trombolisis KI." },
    inthigh: { label: "Intermediate-High", shock: "TIDAK (−)", spesi: "sPESI ≥1", rv: "YA (+)", trop: "YA (+)", tone: "warning", tx: "Rawat HCU/ICCU, mulai <strong>Antikoagulan Parenteral (LMWH / UFH)</strong>, pantau ketat tanda dekompensasi → <em>Rescue Thrombolysis</em> hanya bila jatuh syok!" },
    intlow: { label: "Intermediate-Low", shock: "TIDAK (−)", spesi: "sPESI ≥1", rv: "Salah satu (+)", trop: "atau Keduanya (−)", tone: "info", tx: "Rawat inap biasa + <strong>Antikoagulan LMWH atau langsung DOAC</strong> (Rivaroxaban 2×15 mg 21 hari / Apixaban 2×10 mg 7 hari)." },
    low: { label: "Low-Risk", shock: "TIDAK (−)", spesi: "sPESI = 0", rv: "TIDAK (−)", trop: "TIDAK (−)", tone: "info", tx: "Pertimbangkan <strong>pulang dini &amp; rawat jalan</strong> dengan DOAC langsung (syarat kepatuhan &amp; akses kontrol memadai)." }
  };

  function buildPeSpiralSvg(tab, riskKey) {
    if (tab === "spiral") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Diagram Siklus RV Death Spiral pada Emboli Paru Akut">
          ${svgArrowMarker("c-pe-arr", "var(--accent-coral)")}
          <rect x="8" y="8" width="464" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="240" y="26" text-anchor="middle" font-size="10.2" font-weight="800" fill="var(--accent-coral)">SIKLUS "RV DEATH SPIRAL" EMBOLI PARU AKUT (ESC 2019)</text>

          <!-- 4 cycle boxes -->
          <rect x="24" y="38" width="176" height="44" rx="7" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.6" />
          <text x="112" y="57" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">1. Obstruksi &gt;30–50% + TXA₂</text>
          <text x="112" y="72" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">↑ PVR Mendadak (PASP &gt;40–50)</text>

          <line class="osm-axon-flow" x1="202" y1="60" x2="274" y2="60" stroke="var(--accent-coral)" stroke-width="2.2" marker-end="url(#c-pe-arr)" />

          <rect x="278" y="38" width="178" height="44" rx="7" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1.6" />
          <text x="367" y="57" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-secondary)">2. Dilatasi RV &amp; D-Sign!</text>
          <text x="367" y="72" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">Septum Geser ke Kiri (McConnell)</text>

          <line class="osm-axon-flow" x1="367" y1="84" x2="367" y2="112" stroke="var(--accent-coral)" stroke-width="2.2" marker-end="url(#c-pe-arr)" />

          <rect x="278" y="116" width="178" height="44" rx="7" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="1.6" />
          <text x="367" y="135" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--viz-blue)">3. ↓ Preload LV &amp; Stroke Vol</text>
          <text x="367" y="150" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">Kompresi LV oleh Ruang RV</text>

          <line class="osm-axon-flow" x1="276" y1="138" x2="204" y2="138" stroke="var(--accent-coral)" stroke-width="2.2" marker-end="url(#c-pe-arr)" />

          <rect x="24" y="116" width="176" height="44" rx="7" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.8" />
          <text x="112" y="135" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--accent-coral)">4. Hipotensi &amp; Iskemia RV</text>
          <text x="112" y="150" text-anchor="middle" font-size="8.8" font-weight="700" fill="var(--text-primary)">↓ Perfusi RCA → Syok / Henti</text>

          <line class="osm-axon-flow" x1="112" y1="114" x2="112" y2="86" stroke="var(--accent-coral)" stroke-width="2.2" marker-end="url(#c-pe-arr)" />

          <rect x="24" y="168" width="432" height="18" rx="4" fill="var(--bg-surface)" stroke="var(--accent-coral-border)" />
          <text x="240" y="180.5" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--accent-coral)">LARANGAN: Hindari Bolus Cairan Agresif (&gt;500 mL) &amp; Intubasi PEEP Tinggi!</text>
        </svg>
      `;
    }
    const r = PE_RISKS[riskKey] || PE_RISKS.high;
    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Matriks 4 Kelas Risiko Emboli Paru ESC 2019">
        <rect x="8" y="8" width="464" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="240" y="27" text-anchor="middle" font-size="10.2" font-weight="800" fill="var(--text-primary)">STRATIFIKASI 4 KELAS RISIKO EMBOLI PARU AKUT (ESC 2019)</text>
        ${Object.entries(PE_RISKS).map(([k, it], i) => {
          const active = k === riskKey;
          const x = 18 + i * 112;
          const col = it.tone === "danger" ? "var(--accent-coral)" : it.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)";
          return `
            <g class="viz-svg-tile" onclick="window.InternaApp.updateCardioPeSpiralViz(null, '${k}')" role="button">
              <rect x="${x}" y="38" width="106" height="144" rx="7" fill="${active ? "var(--bg-surface)" : "var(--bg-surface-subtle)"}" stroke="${active ? col : "var(--border-subtle)"}" stroke-width="${active ? "2.4" : "1"}" />
              <text x="${x + 53}" y="57" text-anchor="middle" font-size="9" font-weight="800" fill="${col}">${it.label.split("(")[0].trim()}</text>
              <text x="${x + 53}" y="80" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">Syok/Hipotensi:</text>
              <text x="${x + 53}" y="94" text-anchor="middle" font-size="9" font-weight="800" fill="var(--text-primary)">${it.shock}</text>
              <text x="${x + 53}" y="114" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">Disfungsi RV:</text>
              <text x="${x + 53}" y="128" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--text-primary)">${it.rv}</text>
              <text x="${x + 53}" y="148" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">Troponin:</text>
              <text x="${x + 53}" y="162" text-anchor="middle" font-size="8.5" font-weight="800" fill="${col}">${it.trop}</text>
            </g>
          `;
        }).join("")}
      </svg>
    `;
  }

  function getPeReadout(tab, riskKey) {
    if (tab === "spiral") {
      return {
        tone: "danger",
        rKey: "pe-spiral",
        title: "Spiral Kematian Ventrikel Kanan (RV Death Spiral) pada Emboli Paru Akut",
        c1Label: "Mengapa Cairan Masif Berbahaya?",
        c1Body: "Berbeda dari syok hipovolemik, RV pada PE masif sudah <em>overdistended</em>. Memberi infus cairan &gt;500 mL mendorong septum interventrikular makin ke kiri (<strong>D-sign</strong>), semakin menjepit pengisian LV!",
        c2Label: "Stabilisasi Hemodinamik & Respirasi",
        c2Body: "Berikan <strong>O₂ bila SpO₂ &lt;90%</strong> (hindari intubasi/PEEP tinggi bila masih bisa hindari), vasopresor dini <strong>Norepinefrin</strong> menjaga perfusi RCA dinding RV, &amp; segera tentukan indikasi reperfusi.",
        trap: "Pencitraan CTPA/TTE: <strong>McConnell Sign</strong> (akinesia dinding bebas tengah RV dengan apeks hiperkontraktil) dan rasio <strong>RV/LV &gt;1,0</strong> menandakan strain RV berat!"
      };
    }
    const r = PE_RISKS[riskKey] || PE_RISKS.high;
    return {
      tone: r.tone,
      rKey: `pe-risk-${riskKey}`,
      title: `PE ${r.label} — Syok: ${r.shock} | Disfungsi RV: ${r.rv} | Troponin: ${r.trop}`,
      c1Label: "Keputusan Strategi Reperfusi / Antikoagulan",
      c1Body: r.tx,
      c2Label: "Catatan Keganasan, APS & Kontraindikasi",
      c2Body: "<strong>Kanker Aktif + VTE:</strong> DOAC (Apixaban/Rivaroxaban/Edoxaban) atau LMWH (hindari Edoxaban/Rivaroxaban pd CA GI berdarah!). <strong>APS Triple-Positif / Hamil:</strong> Gunakan Warfarin / LMWH (JANGAN DOAC!).",
      trap: "<strong>Sindrom HIT Tipe II:</strong> Trombosit turun &gt;50% hari ke-5–14 UFH (Skor 4Ts tinggi) → <strong>STOP semua heparin &amp; JANGAN transfusi trombosit/Warfarin dini</strong>; ganti Argatroban atau Fondaparinux!"
    };
  }

  function renderPeRvspiralWidget() {
    const tab = cardioVizState.peTab === "risk" ? "risk" : "spiral";
    const riskKey = PE_RISKS[cardioVizState.peRisk] ? cardioVizState.peRisk : "high";
    const info = getPeReadout(tab, riskKey);
    const controlsTop = `
      ${renderCardioTabRow("viz-pe-tabs", [
        { key: "spiral", label: "1. Siklus RV Death Spiral (SVG)", onclick: "window.InternaApp.updateCardioPeSpiralViz('spiral', null)" },
        { key: "risk", label: "2. Matriks 4 Kelas Risiko ESC 2019", onclick: "window.InternaApp.updateCardioPeSpiralViz('risk', null)" }
      ], tab)}
      <div id="viz-pe-risk-tabs" class="viz-presets ${tab === "risk" ? "" : "hidden"}" style="margin-bottom:0.65rem;">
        ${Object.entries(PE_RISKS).map(([k, v]) => `<button type="button" class="viz-pill-btn ${k === riskKey ? "active" : ""}" onclick="window.InternaApp.updateCardioPeSpiralViz(null, '${k}')">${v.label}</button>`).join("")}
      </div>
    `;
    return renderCardioWidgetCard({
      key: "peSpiral",
      title: "Mekanisme RV Death Spiral & Matriks Risiko Emboli Paru Akut",
      tag: "ESC PE 2019",
      controlsTop,
      svgHtml: buildPeSpiralSvg(tab, riskKey),
      info,
      readoutFooter: `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
    });
  }

  function updateCardioPeSpiralViz(tabIn, riskIn) {
    if (tabIn === "spiral" || tabIn === "risk") cardioVizState.peTab = tabIn;
    if (PE_RISKS[riskIn]) cardioVizState.peRisk = riskIn;
    const tab = cardioVizState.peTab;
    const riskKey = cardioVizState.peRisk;
    syncVizPresets("viz-pe-tabs", [tab === "spiral", tab === "risk"]);
    const riskWrap = document.getElementById("viz-pe-risk-tabs");
    if (riskWrap) riskWrap.classList.toggle("hidden", tab !== "risk");
    syncVizPresets("viz-pe-risk-tabs", Object.keys(PE_RISKS).map((k) => k === riskKey));
    swapVizSvgFrame("viz-peSpiral-frame", buildPeSpiralSvg(tab, riskKey));
    const info = getPeReadout(tab, riskKey);
    updateVizReadout("viz-peSpiral-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), info.rKey);
  }



  function renderCardioModuleWidget(type) {
    if (type === "stemi-wavefront-viz") return renderStemiWavefrontWidget();
    if (type === "stemi-territory-ekg-viz") return renderStemiTerritoryWidget();
    if (type === "stemi-reperfusion-viz") return renderStemiReperfusionWidget();
    if (type === "nsteacs-hstn-viz") return renderNsteacsHstnWidget();
    if (type === "lipid-ldl-viz") return renderLipidLdlWidget();
    if (type === "adhf-bnp-viz") return renderAdhfBnpWidget();
    if (type === "adhf-stevenson-viz") return renderAdhfStevensonWidget();
    if (type === "shock-mechanical-viz") return renderShockMechanicalWidget();
    if (type === "gdmt-titration-viz") return renderGdmtTitrationWidget();
    if (type === "tachy-ecg-algo-viz") return renderTachyEcgAlgoWidget();
    if (type === "af-care-doac-viz") return renderAfCareDoacWidget();
    if (type === "brady-avblock-viz") return renderBradyAvblockWidget();
    if (type === "valvular-murmur-viz") return renderValvularMurmurWidget();
    if (type === "pericarditis-ecg-viz") return renderPericarditisEcgWidget();
    if (type === "tamponade-wiggers-viz") return renderTamponadeWiggersWidget();
    if (type === "ht-esc2024-viz") return renderHtEsc2024Widget();
    if (type === "ht-autoreg-viz") return renderHtAutoregWidget();
    if (type === "aorta-pad-viz") return renderAortaPadWidget();
    if (type === "pe-rvspiral-viz") return renderPeRvspiralWidget();
    return null;
  }

  R.registerWidgetRenderer(renderCardioModuleWidget);
  R.registerMotionProvider(function (key) {
    if (key === "stemiWavefront") return { min: 0, max: 100, start: 0, end: 100, duration: 8200, get: () => cardioVizState.wavefrontPct, apply: (v) => updateCardioWavefrontViz(v, false) };
    if (key === "stemiReperf") return { min: 20, max: 180, start: 20, end: 170, duration: 7200, get: () => cardioVizState.reperfMin, apply: (v) => updateCardioReperfViz(v, null, false) };
    if (key === "nsteacsHstn") return { min: 0, max: 3, start: 0, end: 3, duration: 6400, get: () => cardioVizState.hstnHour, apply: (v) => updateCardioHstnViz(v, null, false) };
    if (key === "adhfBnp") return { min: 50, max: 2400, start: 120, end: 2200, duration: 7600, get: () => cardioVizState.bnpVal, apply: (v) => updateCardioBnpViz(v, null, null, false) };
    if (key === "htEsc") return { min: 105, max: 185, start: 180, end: 115, duration: 7200, get: () => cardioVizState.htEscSbp, apply: (v) => updateCardioHtEscViz(v, null, false) };
    if (key === "htAutoreg") return { min: 55, max: 205, start: 195, end: 65, duration: 8200, get: () => cardioVizState.htMap, apply: (v) => updateCardioAutoregViz(v, null, null, false) };
    return null;
  });

  Object.assign(R.handlers, { updateCardioWavefrontViz, updateCardioReperfViz, updateCardioHstnViz, updateCardioBnpViz, updateCardioHtEscViz, updateCardioAutoregViz, updateCardioTerritoryViz, updateCardioLipidViz, updateCardioStevensonViz, updateCardioShockMechViz, updateCardioGdmtViz, updateCardioTachyViz, updateCardioAfCareViz, updateCardioBradyViz, updateCardioValvularViz, updateCardioPericarditisViz, updateCardioTamponadeViz, updateCardioAortaPadViz, updateCardioPeSpiralViz });
})(window);
