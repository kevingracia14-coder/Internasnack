/* ==========================================================================
   InternaSnack — Penyakit Tropik & Infeksi Interactive Widgets
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

  const prior2VizState = {
    dengueDay: 4,
    typhoidWeek: 1,
    leptoDay: 5,
    hivCd4: 180,
    hivCoinfection: "tb_lt50"
  };


  // --- 1. Dengue 3 Fase (Hari 1-10) ---
  const DENGUE_SERIES = {
    temp: [86, 92, 84, 34, 24, 30, 44, 26, 22, 20],
    ht: [34, 35, 38, 68, 90, 74, 42, 34, 32, 32],
    plt: [82, 72, 54, 24, 10, 16, 40, 62, 76, 86]
  };

  function dengueDayToX(day) {
    return 50 + ((Math.min(10, Math.max(1, day)) - 1) / 9) * 408;
  }

  function dengueValToY(val) {
    return 148 - (val / 100) * 122;
  }

  function getDenguePts() {
    return {
      temp: DENGUE_SERIES.temp.map((v, i) => [dengueDayToX(i + 1), dengueValToY(v)]),
      ht: DENGUE_SERIES.ht.map((v, i) => [dengueDayToX(i + 1), dengueValToY(v)]),
      plt: DENGUE_SERIES.plt.map((v, i) => [dengueDayToX(i + 1), dengueValToY(v)])
    };
  }

  function getDengueDayInfo(day) {
    const d = Math.min(10, Math.max(1, Math.round(Number(day) || 1)));
    if (d <= 3) {
      return {
        tone: "warning",
        phase: `Hari ke-${d} — Fase Demam / Febris (Hari 1–3)`,
        lab: "Viremia tinggi; suhu mendadak tinggi, leukopenia awal, nyeri retroorbital/mialgia. Hematokrit masih baseline; trombosit mulai turun bertahap.",
        dx: "Antigen <strong>NS1 / RT-PCR</strong> (sensitivitas tertinggi di Hari 1–4). <em>Jebakan:</em> IgM masih negatif palsu di Hari ke-2!",
        action: "Pantau tanda dehidrasi & asupan oral; evaluasi faktor risiko & tanda bahaya (<em>Warning Signs</em>)."
      };
    }
    if (d <= 6) {
      return {
        tone: "danger",
        phase: `Hari ke-${d} — FASE KRITIS (Hari 4–6, Kebocoran Plasma 24–48 jam)`,
        lab: "<strong>Suhu turun (defervescence)</strong> justru menandai awal fase kritis! Trombosit jatuh tajam (≤100.000/µL) & <strong>hemokonsentrasi (Ht naik ≥20%)</strong> + efusi pleura/asites/hipoalbuminemia.",
        dx: d === 4
          ? "Hari 4 masih dapat gunakan <strong>NS1</strong> (+ USG toraks/abdomen untuk deteksi dini efusi/penebalan dinding empedu &gt;3 mm)."
          : "Mulai Hari ≥5 gunakan <strong>IgM &amp; IgG anti-Dengue</strong> (rasio IgM/IgG &gt;1,2 primer; &lt;1,2 sekunder) + Limfosit Plasma Biru &gt;4%.",
        action: "Waspadai DSS! Derajat III (tekanan nadi ≤20 mmHg) ➔ Kristaloid 10–20 mL/kg dalam 15–30 mnt. Bila Ht turun drastis tapi syok refrakter ➔ curiga perdarahan okulta (PRC/WB). <strong>Stop infus TC profilaksis!</strong>"
      };
    }
    return {
      tone: "info",
      phase: `Hari ke-${d} — Fase Pemulihan / Konvalesen (Hari ≥7)`,
      lab: "Reabsorpsi cairan ekstravaskular kembali ke intravaskular: <strong>Hematokrit stabil turun ke baseline</strong>, trombosit mulai pulih, nafsu makan membaik, ruam konvalesen <em>isles of white in a sea of red</em>.",
      dx: "<strong>Serologi IgM / IgG anti-Dengue</strong> (+ konfirmasi kenaikan atau rasio IgM/IgG bila diperlukan).",
      action: "<strong>HENTIKAN cairan infus</strong> bila nafsu makan pulih &amp; diuresis baik untuk mencegah <em>fluid overload</em> / edema paru akibat reabsorpsi cairan!"
    };
  }

  function renderDenguePhaseWidget() {
    const d = clampNum(prior2VizState.dengueDay, 1, 10, 4);
    const roundDay = Math.round(d);
    const pts = getDenguePts();
    const cxNum = dengueDayToX(d);
    const cx = cxNum.toFixed(1);
    const ty = sampleSmoothCurveY(pts.temp, cxNum).toFixed(1);
    const hy = sampleSmoothCurveY(pts.ht, cxNum).toFixed(1);
    const py = sampleSmoothCurveY(pts.plt, cxNum).toFixed(1);
    const info = getDengueDayInfo(roundDay);
    const xCritStart = ((dengueDayToX(3) + dengueDayToX(4)) / 2).toFixed(1);
    const xRecStart = ((dengueDayToX(6) + dengueDayToX(7)) / 2).toFixed(1);
    const ns1End = ((dengueDayToX(4) + dengueDayToX(5)) / 2).toFixed(1);
    const igmStart = dengueDayToX(5).toFixed(1);

    return `
      <div class="viz-widget" id="viz-dengue-card">
        <div class="viz-header">
          <span class="viz-title">Simulator Dinamika 3 Fase Dengue (Hari 1–10)</span>
          <span class="viz-tag">Kurva Skematis</span>
        </div>
        <div class="viz-svg-frame">
          <svg class="viz-svg" viewBox="0 0 480 226" role="img" aria-label="Grafik Kurva Skematis 3 Fase Dengue Hari 1 hingga 10">
            <!-- Phase zones -->
            <rect x="50" y="24" width="${(Number(xCritStart) - 50).toFixed(1)}" height="126" fill="var(--accent-secondary-soft)" />
            <rect x="${xCritStart}" y="24" width="${(Number(xRecStart) - Number(xCritStart)).toFixed(1)}" height="126" fill="var(--accent-coral-soft)" />
            <rect x="${xRecStart}" y="24" width="${(458 - Number(xRecStart)).toFixed(1)}" height="126" fill="var(--accent-primary-soft)" />
            <!-- Zone headers -->
            <text x="106" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent-secondary)">FASE FEBRIS</text>
            <text x="231" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent-coral)">KRITIS (24–48j)</text>
            <text x="379" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent-primary)">PEMULIHAN</text>
            <!-- Grid lines -->
            <line x1="50" y1="56" x2="458" y2="56" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="88" x2="458" y2="88" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="120" x2="458" y2="120" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="150" x2="458" y2="150" stroke="var(--border-strong)" stroke-width="1.2" />
            <!-- Y axis label -->
            <text x="45" y="42" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--text-muted)">Tinggi</text>
            <text x="45" y="144" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--text-muted)">Rendah</text>
            <!-- Day ticks -->
            ${Array.from({ length: 10 }, (_, idx) => {
              const x = dengueDayToX(idx + 1).toFixed(1);
              return `<text x="${x}" y="165" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">H${idx + 1}</text>`;
            }).join("")}
            <!-- Curves -->
            <path d="${buildSmoothSvgPath(pts.temp)}" fill="none" stroke="var(--accent-coral)" stroke-width="2.8" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.ht)}" fill="none" stroke="var(--accent-secondary)" stroke-width="2.8" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.plt)}" fill="none" stroke="var(--viz-blue)" stroke-width="2.8" stroke-linecap="round" />
            <!-- Diagnostic windows -->
            <rect x="50" y="176" width="${(Number(ns1End) - 50).toFixed(1)}" height="18" rx="4" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
            <text x="58" y="189" font-size="11.5" font-weight="700" fill="var(--accent-primary)">NS1 / RT-PCR (Hari 1–4)</text>
            <rect x="${igmStart}" y="199" width="${(458 - Number(igmStart)).toFixed(1)}" height="18" rx="4" fill="var(--viz-purple-soft)" stroke="var(--viz-purple)" stroke-opacity="0.4" />
            <text x="${(Number(igmStart) + 8).toFixed(1)}" y="212" font-size="11.5" font-weight="700" fill="var(--viz-purple)">Serologi IgM &amp; IgG (Hari ≥5)</text>
            <!-- Interactive cursor & Osmosis pulse halo -->
            <line id="viz-dengue-cursor" x1="${cx}" y1="22" x2="${cx}" y2="173" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
            <circle id="viz-dengue-halo" class="osm-pulse-dot" cx="${cx}" cy="${hy}" r="9.5" fill="var(--accent-secondary)" fill-opacity="0.28" />
            <circle id="viz-dengue-dot-temp" cx="${cx}" cy="${ty}" r="4.8" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-dengue-dot-ht" cx="${cx}" cy="${hy}" r="5.2" fill="var(--accent-secondary)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-dengue-dot-plt" cx="${cx}" cy="${py}" r="4.8" fill="var(--viz-blue)" stroke="var(--bg-surface)" stroke-width="1.8" />
          </svg>
        </div>
        ${renderVizLegend([
          { color: "var(--accent-coral)", label: "Suhu (Defervescence di H4)" },
          { color: "var(--accent-secondary)", label: "Hematokrit (Naik ≥20% saat Kritis)" },
          { color: "var(--viz-blue)", label: "Trombosit (≤100.000/µL)" }
        ])}
        <div class="viz-controls">
          <div class="viz-slider-row">
            <label for="viz-dengue-slider" class="viz-slider-label">Geser Hari Demam:</label>
            <div class="viz-slider-meta">
              <button type="button" id="viz-dengue-play-btn" class="viz-play-btn" aria-pressed="false" onclick="window.InternaApp.toggleVizWalkthrough('dengue')">${vizPlayIconSvg(false)}<span>Putar Fase</span></button>
              <span id="viz-dengue-day-pill" class="viz-value-pill">Hari ke-${roundDay}</span>
            </div>
          </div>
          <input type="range" id="viz-dengue-slider" class="viz-range" min="1" max="10" step="0.05" value="${d}" style="--viz-track-bg: linear-gradient(90deg, rgba(180,83,9,0.28) 0% 27.8%, rgba(190,18,60,0.34) 27.8% 61.1%, rgba(15,118,110,0.28) 61.1% 100%);" oninput="window.InternaApp.updateDengueViz(this.value, true)" />
          <div class="viz-presets" id="viz-dengue-presets">
            <button type="button" class="viz-pill-btn ${roundDay <= 3 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('dengue', 2)">H2: Febris / NS1</button>
            <button type="button" class="viz-pill-btn ${roundDay === 4 || roundDay === 6 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('dengue', 4)">H4: Awal Kritis</button>
            <button type="button" class="viz-pill-btn ${roundDay === 5 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('dengue', 5)">H5: Puncak Kebocoran</button>
            <button type="button" class="viz-pill-btn ${roundDay >= 7 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('dengue', 8)">H8: Pemulihan</button>
          </div>
        </div>
        <div id="viz-dengue-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="dengue-${roundDay}">
          ${formatVizReadoutHtml(info.phase, "Tren Suhu &amp; Lab", info.lab, "Uji Diagnostik", info.dx, `<p class="mt-1.5"><strong>Tata Laksana &amp; Kewaspadaan:</strong> ${info.action}</p>`)}
        </div>
      </div>
    `;
  }

  function updateDengueViz(dayInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    const d = clampNum(dayInput, 1, 10, 1);
    const roundDay = Math.round(d);
    prior2VizState.dengueDay = d;
    syncSliderAndPill("viz-dengue-slider", "viz-dengue-day-pill", d, `Hari ke-${roundDay}`);

    const pts = getDenguePts();
    const cxNum = dengueDayToX(d);
    const cx = cxNum.toFixed(1);
    const ty = sampleSmoothCurveY(pts.temp, cxNum).toFixed(1);
    const hy = sampleSmoothCurveY(pts.ht, cxNum).toFixed(1);
    const py = sampleSmoothCurveY(pts.plt, cxNum).toFixed(1);

    setSvgAttrs("viz-dengue-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-dengue-halo", { cx, cy: hy });
    setSvgAttrs("viz-dengue-dot-temp", { cx, cy: ty });
    setSvgAttrs("viz-dengue-dot-ht", { cx, cy: hy });
    setSvgAttrs("viz-dengue-dot-plt", { cx, cy: py });
    syncVizPresets("viz-dengue-presets", [roundDay <= 3, roundDay === 4 || roundDay === 6, roundDay === 5, roundDay >= 7]);

    const info = getDengueDayInfo(roundDay);
    updateVizReadout(
      "viz-dengue-readout",
      info.tone,
      formatVizReadoutHtml(info.phase, "Tren Suhu &amp; Lab", info.lab, "Uji Diagnostik", info.dx, `<p class="mt-1.5"><strong>Tata Laksana &amp; Kewaspadaan:</strong> ${info.action}</p>`),
      `dengue-${roundDay}`
    );
  }

  // --- 2. Demam Tifoid Timeline 4 Minggu B-A-S-U ---
  const TYPHOID_CENTERS = [95.5, 198.5, 301.5, 404.5];
  const TYPHOID_SERIES = {
    bm: [92, 92, 91, 89],
    blood: [75, 46, 24, 14],
    serology: [22, 76, 74, 62],
    stool: [16, 48, 78, 52],
    urine: [8, 22, 46, 66]
  };

  function typhoidValToY(val) {
    return 162 - (val / 100) * 134;
  }

  const TYPHOID_WEEK_INFO = {
    1: {
      tone: "info",
      title: "Minggu ke-1 — B: BLOOD (Kultur Darah Empedu/Oxgall)",
      specimen: "<strong>Kultur Darah</strong> (sensitivitas 60–80% di minggu ke-1, <em>gold standard</em> praktis) + <strong>Kultur Sumsum Tulang</strong> (&gt;90% walau sudah diberi antibiotik 5 hari).",
      clinical: "Demam naik bertahap (<em>step-ladder fever</em>), bradikardia relatif (Tanda Faget), lidah kotor tepi hiperemis &amp; tremor (<em>typhoid tongue</em>), konstipasi, rose spots.",
      trap: "Uji Widal &amp; Tubex sering masih negatif pada hari-hari awal minggu pertama karena antibodi IgM belum cukup tinggi."
    },
    2: {
      tone: "warning",
      title: "Minggu ke-2 — A: AGGLUTINATION (Tubex TF / Widal)",
      specimen: "<strong>Tubex TF</strong> (IgM spesifik anti-O9; skor ≥4 positif) atau <strong>Widal</strong> (kurang spesifik di daerah endemis). Kultur darah mulai turun (~40–50%), sedangkan <strong>Sumsum Tulang tetap &gt;90%</strong>.",
      clinical: "Demam tinggi kontinu, hepatosplenomegali akibat hiperplasia RES (<em>typhoid nodules</em> oleh sel Kupffer), risiko tifoid toksik / ensefalopati (butuh regimen Deksametason Hoffman).",
      trap: "<strong>Jebakan Widal:</strong> Titer O bertahan 4–6 bulan dan H bertahan 1–2 tahun. Pasien pasca-terapi yang afebris tidak boleh diobati ulang hanya karena Widal masih tinggi, dan hati-hati reaksi silang pada leptospirosis/malaria!"
    },
    3: {
      tone: "danger",
      title: "Minggu ke-3 — S: STOOL (Kultur Feses) &amp; Puncak Komplikasi Ileum",
      specimen: "<strong>Kultur Feses (Stool)</strong> mencapai puncak pelepasan bakteri dari kandung empedu &amp; Plak Peyer (<strong>Sumsum Tulang</strong> tetap &gt;85–90%).",
      clinical: "<strong>PUNCAK KOMPLIKASI MINGGU KE-3:</strong> Nekrosis/ulkus Plak Peyer di ileum terminalis memicu <strong>perforasi ileum</strong> (nyeri perut mendadak, defans muskular, pekak hati hilang) dan <strong>perdarahan masif</strong>.",
      trap: "Jangan tunggu kultur feses bila muncul tanda peritonitis akut atau penurunan Hb/melena mendadak pada minggu ke-3!"
    },
    4: {
      tone: "info",
      title: "Minggu ke-4 — U: URINE (Kultur Urin) &amp; Evaluasi Pemulihan/Karier",
      specimen: "<strong>Kultur Urin</strong> mendeteksi ekskresi saluran kemih &amp; evaluasi pembersihan bakteri.",
      clinical: "Fase lisis demam perlahan menuju pemulihan. Catatan evaluasi karier: ekskresi bulan ke-5 masih tergolong <em>convalescent carriage</em>.",
      trap: "Definisi <strong>Karier Kronis</strong> baru tegak jika ekskresi <em>S. Typhi</em> di feses/urin berlanjut <strong>&gt;12 bulan</strong> (terapi Siprofloksasin 2x750 mg 4–6 minggu; kolesistektomi bila kolelitiasis membandel)."
    }
  };

  function getTyphoidPts() {
    return {
      bm: TYPHOID_CENTERS.map((x, i) => [x, typhoidValToY(TYPHOID_SERIES.bm[i])]),
      blood: TYPHOID_CENTERS.map((x, i) => [x, typhoidValToY(TYPHOID_SERIES.blood[i])]),
      sero: TYPHOID_CENTERS.map((x, i) => [x, typhoidValToY(TYPHOID_SERIES.serology[i])]),
      stool: TYPHOID_CENTERS.map((x, i) => [x, typhoidValToY(TYPHOID_SERIES.stool[i])]),
      urine: TYPHOID_CENTERS.map((x, i) => [x, typhoidValToY(TYPHOID_SERIES.urine[i])])
    };
  }

  function typhoidWeekToX(w) {
    return 95.5 + (clampNum(w, 1, 4, 1) - 1) * 103;
  }

  function renderTyphoidBasuWidget() {
    const w = clampNum(prior2VizState.typhoidWeek, 1, 4, 1);
    const roundWeek = Math.round(w);
    const info = TYPHOID_WEEK_INFO[roundWeek];
    const zoneX = (44 + (w - 1) * 103).toFixed(1);
    const cxNum = typhoidWeekToX(w);
    const cx = cxNum.toFixed(1);
    const pts = getTyphoidPts();
    const by = sampleSmoothCurveY(pts.blood, cxNum).toFixed(1);
    const ay = sampleSmoothCurveY(pts.sero, cxNum).toFixed(1);
    const sy = sampleSmoothCurveY(pts.stool, cxNum).toFixed(1);

    return `
      <div class="viz-widget" id="viz-typhoid-card">
        <div class="viz-header">
          <span class="viz-title">Timeline 4 Minggu Demam Tifoid &amp; Akurasi B-A-S-U</span>
          <span class="viz-tag">Kurva Skematis</span>
        </div>
        <div class="viz-svg-frame">
          <svg class="viz-svg" viewBox="0 0 480 218" role="img" aria-label="Grafik Skematis Sensitivitas Relatif Diagnostik B-A-S-U Tifoid Minggu 1 sampai 4">
            <!-- Week dividers -->
            <rect id="viz-typhoid-zone" x="${zoneX}" y="24" width="103" height="140" rx="6" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
            <line x1="147" y1="24" x2="147" y2="164" stroke="var(--border-subtle)" />
            <line x1="250" y1="24" x2="250" y2="164" stroke="var(--border-subtle)" />
            <line x1="353" y1="24" x2="353" y2="164" stroke="var(--border-subtle)" />
            <!-- Horizontal grid -->
            <line x1="44" y1="41" x2="456" y2="41" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="44" y1="82" x2="456" y2="82" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="44" y1="122" x2="456" y2="122" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="44" y1="164" x2="456" y2="164" stroke="var(--border-strong)" stroke-width="1.2" />
            <text x="40" y="44" text-anchor="end" font-size="11" font-weight="700" fill="var(--text-muted)">~90%</text>
            <text x="40" y="96" text-anchor="end" font-size="11" font-weight="700" fill="var(--text-muted)">~50%</text>
            <text x="40" y="160" text-anchor="end" font-size="11" font-weight="700" fill="var(--text-muted)">0%</text>
            <!-- Week column labels -->
            <text x="95.5" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text-primary)">M1: Blood</text>
            <text x="198.5" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text-primary)">M2: Agglut.</text>
            <text x="301.5" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent-coral)">M3: Stool</text>
            <text x="404.5" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text-primary)">M4: Urine</text>
            <!-- Curves -->
            <path d="${buildSmoothSvgPath(pts.bm)}" fill="none" stroke="var(--accent-primary)" stroke-width="2.6" stroke-dasharray="6 4" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.blood)}" fill="none" stroke="var(--accent-coral)" stroke-width="2.8" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.sero)}" fill="none" stroke="var(--accent-secondary)" stroke-width="2.6" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.stool)}" fill="none" stroke="var(--viz-blue)" stroke-width="2.6" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.urine)}" fill="none" stroke="var(--viz-purple)" stroke-width="2.4" stroke-linecap="round" />
            <!-- M3 complication marker -->
            <rect x="252" y="173" width="99" height="21" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
            <text x="301.5" y="187" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">! Perforasi Ileum</text>
            <!-- Footer week markers -->
            <text x="95.5" y="210" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">Minggu 1</text>
            <text x="198.5" y="210" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">Minggu 2</text>
            <text x="301.5" y="210" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-coral)">Minggu 3</text>
            <text x="404.5" y="210" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">Minggu 4</text>
            <!-- Active cursor & curve trackers -->
            <line id="viz-typhoid-cursor" x1="${cx}" y1="24" x2="${cx}" y2="164" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
            <circle id="viz-typhoid-halo" class="osm-pulse-dot" cx="${cx}" cy="${by}" r="9" fill="var(--accent-coral)" fill-opacity="0.24" />
            <circle id="viz-typhoid-dot-blood" cx="${cx}" cy="${by}" r="4.6" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-typhoid-dot-sero" cx="${cx}" cy="${ay}" r="4.4" fill="var(--accent-secondary)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-typhoid-dot-stool" cx="${cx}" cy="${sy}" r="4.4" fill="var(--viz-blue)" stroke="var(--bg-surface)" stroke-width="1.8" />
          </svg>
        </div>
        ${renderVizLegend([
          { color: "var(--accent-primary)", label: "Sumsum Tulang (>90%)", dashed: true },
          { color: "var(--accent-coral)", label: "B: Darah (60–80% M1)" },
          { color: "var(--accent-secondary)", label: "A: Tubex/Widal (M2)" },
          { color: "var(--viz-blue)", label: "S: Feses (Puncak M3)" },
          { color: "var(--viz-purple)", label: "U: Urin (M3–4)" }
        ])}
        <div class="viz-controls">
          <div class="viz-slider-row">
            <label for="viz-typhoid-slider" class="viz-slider-label">Pilih Minggu Sakit:</label>
            <div class="viz-slider-meta">
              <button type="button" id="viz-typhoid-play-btn" class="viz-play-btn" aria-pressed="false" onclick="window.InternaApp.toggleVizWalkthrough('typhoid')">${vizPlayIconSvg(false)}<span>Putar Fase</span></button>
              <span id="viz-typhoid-week-pill" class="viz-value-pill">Minggu ke-${roundWeek}</span>
            </div>
          </div>
          <input type="range" id="viz-typhoid-slider" class="viz-range" min="1" max="4" step="0.02" value="${w}" style="--viz-track-bg: linear-gradient(90deg, rgba(15,118,110,0.28) 0% 33%, rgba(180,83,9,0.3) 33% 56%, rgba(190,18,60,0.34) 56% 78%, rgba(15,118,110,0.26) 78% 100%);" oninput="window.InternaApp.updateTyphoidViz(this.value, true)" />
          <div class="viz-presets" id="viz-typhoid-presets">
            <button type="button" class="viz-pill-btn ${roundWeek === 1 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('typhoid', 1)">M1: Blood</button>
            <button type="button" class="viz-pill-btn ${roundWeek === 2 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('typhoid', 2)">M2: Agglutination</button>
            <button type="button" class="viz-pill-btn ${roundWeek === 3 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('typhoid', 3)">M3: Stool</button>
            <button type="button" class="viz-pill-btn ${roundWeek === 4 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('typhoid', 4)">M4: Urine</button>
          </div>
        </div>
        <div id="viz-typhoid-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="typhoid-${roundWeek}">
          ${formatVizReadoutHtml(info.title, "Spesimen Prioritas", info.specimen, "Gambaran Klinis", info.clinical, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`)}
        </div>
      </div>
    `;
  }

  function updateTyphoidViz(weekInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    const w = clampNum(weekInput, 1, 4, 1);
    const roundWeek = Math.round(w);
    prior2VizState.typhoidWeek = w;
    syncSliderAndPill("viz-typhoid-slider", "viz-typhoid-week-pill", w, `Minggu ke-${roundWeek}`);

    const cxNum = typhoidWeekToX(w);
    const cx = cxNum.toFixed(1);
    const pts = getTyphoidPts();
    const by = sampleSmoothCurveY(pts.blood, cxNum).toFixed(1);
    const ay = sampleSmoothCurveY(pts.sero, cxNum).toFixed(1);
    const sy = sampleSmoothCurveY(pts.stool, cxNum).toFixed(1);

    setSvgAttrs("viz-typhoid-zone", { x: (44 + (w - 1) * 103).toFixed(1) });
    setSvgAttrs("viz-typhoid-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-typhoid-halo", { cx, cy: by });
    setSvgAttrs("viz-typhoid-dot-blood", { cx, cy: by });
    setSvgAttrs("viz-typhoid-dot-sero", { cx, cy: ay });
    setSvgAttrs("viz-typhoid-dot-stool", { cx, cy: sy });
    syncVizPresets("viz-typhoid-presets", [roundWeek === 1, roundWeek === 2, roundWeek === 3, roundWeek === 4]);

    const info = TYPHOID_WEEK_INFO[roundWeek];
    updateVizReadout(
      "viz-typhoid-readout",
      info.tone,
      formatVizReadoutHtml(info.title, "Spesimen Prioritas", info.specimen, "Gambaran Klinis", info.clinical, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`),
      `typhoid-${roundWeek}`
    );
  }

  // --- 3. Leptospirosis Bifasik (Hari 1-21) ---
  // Exact 21-day schematic values [D1..D21] so dots align strictly on plotted curves
  const LEPTO_SERIES = {
    bacteremia: [88, 92, 90, 82, 70, 54, 38, 18, 10, 6, 4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    iggMat:     [2,  3,  5,  10, 22, 36, 50, 64, 75, 83, 88, 91, 93, 94, 94, 93, 92, 91, 90, 89, 88],
    urine:      [3,  4,  6,  9,  16, 26, 40, 56, 68, 76, 80, 80, 78, 74, 70, 65, 60, 56, 52, 49, 46]
  };

  function leptoDayToX(day) {
    return 50 + ((Math.min(21, Math.max(1, day)) - 1) / 20) * 406;
  }

  function leptoValToY(val) {
    return 148 - (val / 100) * 122;
  }

  function getLeptoDayInfo(day) {
    const d = Math.min(21, Math.max(1, Number(day) || 1));
    if (d <= 4) {
      return {
        tone: "danger",
        phase: `Hari ke-${d} — Fase Leptospiremia / Septikemia (Hari 1–7)`,
        dx: "<strong>PCR Darah / LCS</strong> (pilihan paling sensitif sebelum antibiotik &amp; sebelum antibodi terbentuk) atau Kultur Darah media EMJH (inkubasi lama 4–12 mgg).",
        clinical: "Demam tinggi mendadak, nyeri kepala retroorbital, <strong>nyeri tekan otot betis (gastroknemius)</strong>, dan <strong>conjunctival suffusion</strong> tanpa sekret purulen.",
        trap: "Antibodi IgM / MAT masih negatif di minggu ke-1 awal! Jangan menyingkirkan leptospirosis karena hasil Widal 1/320 (reaksi silang)."
      };
    }
    if (d <= 7) {
      return {
        tone: "warning",
        phase: `Hari ke-${d} — Akhir Fase Leptospiremia / Transisi Menuju Fase Imun`,
        dx: "<strong>PCR Darah</strong> (masih bermanfaat hingga H7) mulai dikombinasikan dengan <strong>ELISA / Rapid IgM</strong> (mulai dapat dideteksi dari Hari ke-5–7 ke atas).",
        clinical: "Spiroketa mulai berpindah dari darah menuju ginjal &amp; organ target; waspadai onset awal <strong>Sindrom Weil</strong> (ikterus kolestatik dengan SGOT/SGPT &lt;200, AKI non-oligurik hipokalemik).",
        trap: "Saat pertama kali menyuntikkan Penisilin G / Seftriakson, waspadai reaksi <strong>Jarisch-Herxheimer</strong> (demam/hipotensi transien) — <strong>JANGAN hentikan antibiotik!</strong>"
      };
    }
    return {
      tone: "info",
      phase: `Hari ke-${d} — Fase Imun &amp; Leptospiruria (Hari ≥8 / Minggu ke-2+)`,
      dx: "<strong>MAT (<em>Microscopic Agglutination Test</em>)</strong> sebagai <strong>Gold Standard serologi</strong> (titer ≥1:400 non-endemis / ≥1:800 endemis atau naik ≥4x serum berpasangan) + <strong>ELISA IgM</strong> &amp; <strong>Kultur Urin (&gt;H7)</strong>.",
      clinical: "Kuman menghilang dari darah, muncul antibodi IgM/MAT, risiko <strong>meningitis aseptik</strong>, leptospiruria, serta puncak manifestasi berat <strong>Sindrom Weil</strong> (ikterus, AKI hipokalemik, SPHS/hemoptisis).",
      trap: "Kultur darah sudah sangat rendah sensitivitasnya pada fase ini; ibu hamil anikterik/berat KONTRAINDIKASI Doksisiklin (pilih Seftriakson IV / Penisilin G IV)."
    };
  }

  function getLeptoPts() {
    return {
      bac: LEPTO_SERIES.bacteremia.map((v, i) => [leptoDayToX(i + 1), leptoValToY(v)]),
      igm: LEPTO_SERIES.iggMat.map((v, i) => [leptoDayToX(i + 1), leptoValToY(v)]),
      ur: LEPTO_SERIES.urine.map((v, i) => [leptoDayToX(i + 1), leptoValToY(v)])
    };
  }

  function renderLeptoBiphasicWidget() {
    const d = clampNum(prior2VizState.leptoDay, 1, 21, 5);
    const roundDay = Math.round(d);
    const info = getLeptoDayInfo(roundDay);
    const pts = getLeptoPts();

    const splitX = ((leptoDayToX(7) + leptoDayToX(8)) / 2).toFixed(1);
    const igmBarStart = leptoDayToX(5).toFixed(1);
    const matBarStart = leptoDayToX(8).toFixed(1);
    const cxNum = leptoDayToX(d);
    const cx = cxNum.toFixed(1);
    const by = sampleSmoothCurveY(pts.bac, cxNum).toFixed(1);
    const iy = sampleSmoothCurveY(pts.igm, cxNum).toFixed(1);
    const uy = sampleSmoothCurveY(pts.ur, cxNum).toFixed(1);

    return `
      <div class="viz-widget" id="viz-lepto-card">
        <div class="viz-header">
          <span class="viz-title">Kurva Bifasik Leptospirosis &amp; Pilihan Spesimen</span>
          <span class="viz-tag">Kurva Skematis</span>
        </div>
        <div class="viz-svg-frame">
          <svg class="viz-svg" viewBox="0 0 480 236" role="img" aria-label="Grafik Kurva Bifasik Leptospirosis Hari 1 hingga 21">
            <!-- 2 phase zones -->
            <rect x="50" y="24" width="${(Number(splitX) - 50).toFixed(1)}" height="126" fill="var(--accent-coral-soft)" />
            <rect x="${splitX}" y="24" width="${(456 - Number(splitX)).toFixed(1)}" height="126" fill="var(--accent-primary-soft)" />
            <text x="116" y="17" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-coral)">LEPTOSPIREMIA (H1–7)</text>
            <text x="319" y="17" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-primary)">FASE IMUN &amp; URIN (≥H8)</text>
            <!-- Grid lines -->
            <line x1="50" y1="56" x2="456" y2="56" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="88" x2="456" y2="88" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="120" x2="456" y2="120" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
            <line x1="50" y1="150" x2="456" y2="150" stroke="var(--border-strong)" stroke-width="1.2" />
            <text x="45" y="42" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--text-muted)">Tinggi</text>
            <text x="45" y="144" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--text-muted)">Rendah</text>
            <!-- Axis day ticks -->
            ${[1, 3, 5, 7, 10, 14, 18, 21]
              .map((tick) => `<text x="${leptoDayToX(tick).toFixed(1)}" y="165" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">H${tick}</text>`)
              .join("")}
            <!-- Curves -->
            <path d="${buildSmoothSvgPath(pts.bac)}" fill="none" stroke="var(--accent-coral)" stroke-width="2.8" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.igm)}" fill="none" stroke="var(--accent-primary)" stroke-width="2.8" stroke-linecap="round" />
            <path d="${buildSmoothSvgPath(pts.ur)}" fill="none" stroke="var(--viz-blue)" stroke-width="2.6" stroke-dasharray="5 3" stroke-linecap="round" />
            <!-- 3 non-overlapping stacked diagnostic windows -->
            <rect x="50" y="173" width="${(Number(splitX) - 50).toFixed(1)}" height="17" rx="4" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
            <text x="56" y="185" font-size="10.8" font-weight="700" fill="var(--accent-coral)">PCR &amp; Kultur Darah</text>
            <rect x="${igmBarStart}" y="193" width="${(456 - Number(igmBarStart)).toFixed(1)}" height="17" rx="4" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" />
            <text x="${(Number(igmBarStart) + 8).toFixed(1)}" y="205" font-size="11" font-weight="700" fill="var(--accent-secondary)">Skrining ELISA / Rapid IgM (≥H5–7)</text>
            <rect x="${matBarStart}" y="213" width="${(456 - Number(matBarStart)).toFixed(1)}" height="18" rx="4" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
            <text x="${(Number(matBarStart) + 8).toFixed(1)}" y="225.5" font-size="11" font-weight="700" fill="var(--accent-primary)">MAT (Gold Std) &amp; Kultur Urin (&gt;H7)</text>
            <!-- Cursor & Osmosis pulse halo -->
            <line id="viz-lepto-cursor" x1="${cx}" y1="22" x2="${cx}" y2="171" stroke="var(--text-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
            <circle id="viz-lepto-halo" class="osm-pulse-dot" cx="${cx}" cy="${iy}" r="9.5" fill="var(--accent-primary)" fill-opacity="0.26" />
            <circle id="viz-lepto-dot-bac" cx="${cx}" cy="${by}" r="4.8" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-lepto-dot-igm" cx="${cx}" cy="${iy}" r="5.2" fill="var(--accent-primary)" stroke="var(--bg-surface)" stroke-width="1.8" />
            <circle id="viz-lepto-dot-ur" cx="${cx}" cy="${uy}" r="4.8" fill="var(--viz-blue)" stroke="var(--bg-surface)" stroke-width="1.8" />
          </svg>
        </div>
        ${renderVizLegend([
          { color: "var(--accent-coral)", label: "Leptospiremia (Darah / LCS)" },
          { color: "var(--accent-primary)", label: "Antibodi IgM / MAT" },
          { color: "var(--viz-blue)", label: "Leptospiruria (Urin)", dashed: true }
        ])}
        <div class="viz-controls">
          <div class="viz-slider-row">
            <label for="viz-lepto-slider" class="viz-slider-label">Geser Hari Sakit:</label>
            <div class="viz-slider-meta">
              <button type="button" id="viz-lepto-play-btn" class="viz-play-btn" aria-pressed="false" onclick="window.InternaApp.toggleVizWalkthrough('lepto')">${vizPlayIconSvg(false)}<span>Putar Fase</span></button>
              <span id="viz-lepto-day-pill" class="viz-value-pill">Hari ke-${roundDay}</span>
            </div>
          </div>
          <input type="range" id="viz-lepto-slider" class="viz-range" min="1" max="21" step="0.1" value="${d}" style="--viz-track-bg: linear-gradient(90deg, rgba(190,18,60,0.34) 0% 30%, rgba(180,83,9,0.3) 30% 35%, rgba(15,118,110,0.28) 35% 100%);" oninput="window.InternaApp.updateLeptoViz(this.value, true)" />
          <div class="viz-presets" id="viz-lepto-presets">
            <button type="button" class="viz-pill-btn ${roundDay <= 4 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('lepto', 3)">H3: Akut (PCR)</button>
            <button type="button" class="viz-pill-btn ${roundDay >= 5 && roundDay <= 7 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('lepto', 6)">H6: Transisi (IgM)</button>
            <button type="button" class="viz-pill-btn ${roundDay >= 8 && roundDay <= 14 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('lepto', 10)">H10: Fase Imun (MAT)</button>
            <button type="button" class="viz-pill-btn ${roundDay >= 15 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('lepto', 16)">H16: Konvalesen / Urin</button>
          </div>
        </div>
        <div id="viz-lepto-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="lepto-${roundDay}">
          ${formatVizReadoutHtml(info.phase, "Uji Diagnostik Optimal", info.dx, "Klinis &amp; Risiko Weil", info.clinical, `<p class="mt-1.5"><strong>Catatan &amp; Jebakan Board:</strong> ${info.trap}</p>`)}
        </div>
      </div>
    `;
  }

  function updateLeptoViz(dayInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    const d = clampNum(dayInput, 1, 21, 1);
    const roundDay = Math.round(d);
    prior2VizState.leptoDay = d;
    syncSliderAndPill("viz-lepto-slider", "viz-lepto-day-pill", d, `Hari ke-${roundDay}`);

    const pts = getLeptoPts();
    const cxNum = leptoDayToX(d);
    const cx = cxNum.toFixed(1);
    const by = sampleSmoothCurveY(pts.bac, cxNum).toFixed(1);
    const iy = sampleSmoothCurveY(pts.igm, cxNum).toFixed(1);
    const uy = sampleSmoothCurveY(pts.ur, cxNum).toFixed(1);

    setSvgAttrs("viz-lepto-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-lepto-halo", { cx, cy: iy });
    setSvgAttrs("viz-lepto-dot-bac", { cx, cy: by });
    setSvgAttrs("viz-lepto-dot-igm", { cx, cy: iy });
    setSvgAttrs("viz-lepto-dot-ur", { cx, cy: uy });
    syncVizPresets("viz-lepto-presets", [roundDay <= 4, roundDay >= 5 && roundDay <= 7, roundDay >= 8 && roundDay <= 14, roundDay >= 15]);

    const info = getLeptoDayInfo(roundDay);
    updateVizReadout(
      "viz-lepto-readout",
      info.tone,
      formatVizReadoutHtml(info.phase, "Uji Diagnostik Optimal", info.dx, "Klinis &amp; Risiko Weil", info.clinical, `<p class="mt-1.5"><strong>Catatan &amp; Jebakan Board:</strong> ${info.trap}</p>`),
      `lepto-${roundDay}`
    );
  }

  // --- 4. HIV CD4 Threshold & Timing ARV Koinfeksi ---
  function hivCd4ToX(cd4) {
    return 30 + (Math.min(500, Math.max(0, cd4)) / 500) * 420;
  }

  const HIV_COINFECTION_TIMING = {
    none: {
      label: "Tanpa IO SSP / TB Aktif",
      timing: "<strong>Inisiasi ARV Dini (<em>Same-day / ≤7 hari</em>)</strong> dengan KDT Lini-1 <strong>TLD</strong> (TDF 300 + 3TC 300 + DTG 50 mg) 1x1/hari (aman termasuk ibu hamil).",
      iris: "Singkirkan gejala TB aktif sebelum mulai <strong>TPT</strong> (INH + B6 6 bln atau 3HP 3 bln mingguan; 3HP aman bersama DTG tanpa perlu menggandakan dosis)."
    },
    tb_lt50: {
      label: "TB Paru / Non-SSP (CD4 <50 sel/µL)",
      timing: "Mulai OAT terlebih dahulu, lalu <strong>inisiasi ARV DALAM ≤2 MINGGU</strong> setelah OAT ditoleransi (menurunkan mortalitas bermakna; studi CAMELIA/STRIDE).",
      iris: "<strong>Interaksi Rifampisin–TLD:</strong> Tambahkan ekstra <strong>DTG 50 mg tiap 12 jam</strong> selama memakai Rifampisin hingga 2 minggu setelah Rifampisin stop. Bila muncul IRIS paradoksal: <strong>TERUSKAN ARV &amp; OAT</strong>."
    },
    tb_ge50: {
      label: "TB Paru / Non-SSP (CD4 ≥50 sel/µL)",
      timing: "Mulai OAT, lalu inisiasi ARV maksimal dalam <strong>2–8 minggu</strong> setelah OAT ditoleransi.",
      iris: "Tetap wajib <strong>menggandakan dosis DTG</strong> (TLD 1x1 + ekstra DTG 50 mg selang 12 jam) selama menerima Rifampisin + 2 minggu pasca-stop Rifampisin."
    },
    tb_men: {
      label: "Meningitis Tuberkulosis (SSP)",
      timing: "<strong>TUNDA ARV 4–8 MINGGU</strong> setelah OAT + <strong>Deksametason</strong> tapering.",
      iris: "Inisiasi ARV terlalu dini pada TB SSP memicu edema serebri &amp; <strong>CNS-IRIS mematikan</strong>. Ingat pula tambahan ekstra DTG 50 mg bila memakai Rifampisin."
    },
    crypto_men: {
      label: "Meningitis Kriptokokus",
      timing: "<strong>TUNDA ARV 4–6 MINGGU</strong> setelah terapi antijamur induksi (Amfoterisin B + Flusitosin/Flukonazol).",
      iris: "Uji COAT membuktikan ARV &lt;2 minggu <strong>menggandakan kematian</strong> akibat CNS-IRIS. Kontrol TIK tinggi (&gt;25 cmH2O) dengan <strong>LP serial terapeutik</strong> (hindari steroid rutin)."
    },
    toxo: {
      label: "Toksoplasmosis Serebri",
      timing: "Mulai ARV dalam <strong>2–3 minggu</strong> setelah respons klinis antiparasit (Pirimetamin + Sulfadiazin/Klindamisin + Leukovorin) stabil.",
      iris: "Wajib berikan <strong>Asam Folinat (Leukovorin)</strong> bersama Pirimetamin (bukan Asam Folat biasa!). Evaluasi ulang dalam 10–14 hari; bila gagal curiga PCNSL."
    },
    pcp: {
      label: "PCP Akut (Pneumocystis Pneumonia)",
      timing: "Mulai ARV dalam <strong>≤2 minggu</strong> setelah terapi Kotrimoksazol stabil.",
      iris: "Teruskan profilaksis sekunder/kotrimoksazol sampai CD4 &gt;200 stabil ≥3–6 bulan dengan Viral Load tersupresi."
    }
  };

  function getHivCd4Info(cd4) {
    const v = Math.round(clampNum(cd4, 0, 500, 0));
    if (v < 50) {
      return {
        bucket: "lt50",
        tone: "danger",
        tier: `CD4 = <span id="viz-hiv-tier-num">${v}</span> sel/µL (Imunosupresi Sangat Berat: <50)`,
        risk: "<strong>Retinitis &amp; Kolitis/Esofagitis CMV</strong> (<em>pizza-pie retina</em>, inklusi <em>Owl's eye</em>), <strong>MAC Diseminata</strong>, ditambah seluruh risiko CD4 &lt;100 &amp; &lt;200 (Toksoplasma, Kriptokokus, PCP).",
        proph: "<strong>WAJIB Kotrimoksazol 1x960 mg/hari</strong> (cegah PCP &amp; Toksoplasmosis) + TPT setelah TB aktif disingkirkan. Skrining ketat gejala CMV/MAC &amp; evaluasi fundus."
      };
    }
    if (v < 100) {
      return {
        bucket: "lt100",
        tone: "danger",
        tier: `CD4 = <span id="viz-hiv-tier-num">${v}</span> sel/µL (Imunosupresi Berat: 50–99)`,
        risk: "<strong>Toksoplasmosis Serebri</strong> (<em>multiple ring-enhancing lesions</em> ganglia basalis), <strong>Meningitis Kriptokokus</strong> (Tinta India +, CrAg +), <strong>Histoplasmosis Diseminata</strong>, serta risiko PCP.",
        proph: "<strong>WAJIB Kotrimoksazol 1x960 mg/hari</strong> (mencegah PCP &amp; Toksoplasmosis; stop bila CD4 &gt;200 stabil ≥3–6 bln dengan VL tersupresi) + TPT setelah TB aktif disingkirkan."
      };
    }
    if (v < 200) {
      return {
        bucket: "lt200",
        tone: "warning",
        tier: `CD4 = <span id="viz-hiv-tier-num">${v}</span> sel/µL (Ambang AIDS Imunologis: 100–199)`,
        risk: "<strong>PCP (Pneumocystis Pneumonia)</strong>, <strong>Kandidiasis Esofagus</strong> (Stadium IV), TB Paru/Ekstraparu.",
        proph: "<strong>WAJIB Kotrimoksazol 1x960 mg/hari</strong> (ambang utama CD4 &lt;200) + <strong>TPT</strong> (INH + B6 6 bln atau 3HP 3 bln) setelah menyingkirkan TB aktif (TST HIV positif jika ≥5 mm)."
      };
    }
    return {
      bucket: "ge200",
      tone: "info",
      tier: `CD4 = <span id="viz-hiv-tier-num">${v}</span> sel/µL (≥200 sel/µL)`,
      risk: "Risiko IO klasik &lt;200 jauh lebih rendah, namun tetap waspada <strong>TB Paru</strong> dan <strong>Kandidiasis Orofaring (Stadium III)</strong> pada nilai berapa pun.",
      proph: "Kotrimoksazol 1x960 mg TIDAK wajib bila CD4 ≥200 tanpa Stadium III/IV WHO (atau dapat dihentikan bila sebelumnya pernah minum &amp; kini CD4 &gt;200 stabil ≥3–6 bln dengan VL tersupresi). Tetap berikan <strong>ARV TLD + TPT</strong>."
    };
  }

  function renderHivCd4Widget() {
    const cd4 = Math.round(clampNum(prior2VizState.hivCd4, 0, 500, 180));
    const coinf = prior2VizState.hivCoinfection;
    const info = getHivCd4Info(cd4);
    const cInfo = HIV_COINFECTION_TIMING[coinf] || HIV_COINFECTION_TIMING.none;
    const cxNum = hivCd4ToX(cd4);
    const cx = cxNum.toFixed(1);
    const tagX = Math.min(435, Math.max(48, cxNum)).toFixed(1);
    const x50 = hivCd4ToX(50).toFixed(1);
    const x100 = hivCd4ToX(100).toFixed(1);
    const x200 = hivCd4ToX(200).toFixed(1);

    const isLt200 = cd4 < 200;
    const isLt100 = cd4 < 100;
    const isLt50 = cd4 < 50;

    return `
      <div class="viz-widget" id="viz-hiv-card">
        <div class="viz-header">
          <span class="viz-title">Simulator Ambang CD4, Profilaksis IO &amp; Timing ARV</span>
          <span class="viz-tag">PNPK HIV &amp; PAPDI</span>
        </div>
        <div class="viz-svg-frame">
          <svg class="viz-svg" viewBox="0 0 480 192" role="img" aria-label="Spektrum Ambang CD4 0 sampai 500 sel per mikroliter untuk Risiko Infeksi Oportunistik">
            <!-- Spectrum segments -->
            <rect x="30" y="28" width="${(Number(x50) - 30).toFixed(1)}" height="24" rx="4" fill="var(--accent-coral)" fill-opacity="0.88" />
            <rect x="${x50}" y="28" width="${(Number(x100) - Number(x50)).toFixed(1)}" height="24" fill="var(--accent-coral)" fill-opacity="0.62" />
            <rect x="${x100}" y="28" width="${(Number(x200) - Number(x100)).toFixed(1)}" height="24" fill="var(--accent-secondary)" fill-opacity="0.72" />
            <rect x="${x200}" y="28" width="${(450 - Number(x200)).toFixed(1)}" height="24" rx="4" fill="var(--accent-primary)" fill-opacity="0.72" />
            <!-- Threshold ticks -->
            <text x="30" y="68" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-muted)">0</text>
            <text x="${x50}" y="68" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-coral)">50</text>
            <text x="${x100}" y="68" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-coral)">100</text>
            <text x="${x200}" y="68" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-secondary)">200</text>
            <text x="324" y="68" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--text-muted)">350</text>
            <text x="450" y="68" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--accent-primary)">500</text>
            <!-- Stacked OI & prophylaxis coverage bars with smooth opacity transitions -->
            <rect x="30" y="83" width="420" height="23" rx="5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
            <rect id="viz-hiv-bar-200" class="viz-smooth-bar" x="30" y="83" width="${(Number(x200) - 30).toFixed(1)}" height="23" rx="5" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="${isLt200 ? "1.8" : "0.8"}" opacity="${isLt200 ? "1" : "0.45"}" />
            <text x="38" y="98.5" font-size="11.5" font-weight="700" fill="var(--accent-secondary)">CD4 &lt;200: PCP &amp; Kandidiasis Esofagus (Kotrimoksazol 1x960)</text>

            <rect x="30" y="112" width="420" height="23" rx="5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
            <rect id="viz-hiv-bar-100" class="viz-smooth-bar" x="30" y="112" width="${(Number(x100) - 30).toFixed(1)}" height="23" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="${isLt100 ? "1.8" : "0.8"}" opacity="${isLt100 ? "1" : "0.45"}" />
            <text x="38" y="127.5" font-size="11.5" font-weight="700" fill="var(--accent-coral)">CD4 &lt;100: Toksoplasmosis Serebri &amp; Meningitis Kriptokokus</text>

            <rect x="30" y="141" width="420" height="23" rx="5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
            <rect id="viz-hiv-bar-50" class="viz-smooth-bar" x="30" y="141" width="${(Number(x50) - 30).toFixed(1)}" height="23" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="${isLt50 ? "1.8" : "0.8"}" opacity="${isLt50 ? "1" : "0.45"}" />
            <text x="38" y="156.5" font-size="11.5" font-weight="700" fill="var(--accent-coral)">CD4 &lt;50: CMV (Retinitis/GI) &amp; MAC (TB Paru: ARV ≤2 mgg)</text>

            <!-- TPT / TLD baseline -->
            <rect x="30" y="170" width="420" height="17" rx="4" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
            <text x="240" y="182" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-primary)">Semua ODHIV: ARV TLD + TPT (setelah TB aktif negatif)</text>

            <!-- Cursor needle + Osmosis pulse halo -->
            <line id="viz-hiv-cursor" x1="${cx}" y1="20" x2="${cx}" y2="167" stroke="var(--text-primary)" stroke-width="2" />
            <circle id="viz-hiv-halo" class="osm-pulse-dot" cx="${cx}" cy="40" r="10" fill="var(--accent-primary)" fill-opacity="0.24" />
            <circle id="viz-hiv-dot" cx="${cx}" cy="40" r="5" fill="var(--bg-surface)" stroke="var(--text-primary)" stroke-width="2.2" />
            <text id="viz-hiv-svg-tag" x="${tagX}" y="15" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text-primary)">CD4 ${cd4}</text>
          </svg>
        </div>
        <div class="viz-controls">
          <div class="viz-slider-row">
            <label for="viz-hiv-slider" class="viz-slider-label">Geser Nilai CD4 (sel/µL):</label>
            <div class="viz-slider-meta">
              <button type="button" id="viz-hiv-play-btn" class="viz-play-btn" aria-pressed="false" onclick="window.InternaApp.toggleVizWalkthrough('hiv')">${vizPlayIconSvg(false)}<span>Putar Fase</span></button>
              <span id="viz-hiv-cd4-pill" class="viz-value-pill">${cd4} sel/µL</span>
            </div>
          </div>
          <input type="range" id="viz-hiv-slider" class="viz-range" min="0" max="500" step="1" value="${cd4}" style="--viz-track-bg: linear-gradient(90deg, rgba(190,18,60,0.38) 0% 20%, rgba(180,83,9,0.32) 20% 40%, rgba(15,118,110,0.28) 40% 100%);" oninput="window.InternaApp.updateHivCd4Viz(this.value, null, true)" />
          <div class="viz-presets" id="viz-hiv-presets">
            <button type="button" class="viz-pill-btn ${cd4 < 50 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('hiv', 25)">CD4 25 (&lt;50)</button>
            <button type="button" class="viz-pill-btn ${cd4 >= 50 && cd4 < 100 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('hiv', 80)">CD4 80 (&lt;100)</button>
            <button type="button" class="viz-pill-btn ${cd4 >= 100 && cd4 < 200 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('hiv', 150)">CD4 150 (&lt;200)</button>
            <button type="button" class="viz-pill-btn ${cd4 >= 200 ? "active" : ""}" onclick="window.InternaApp.animateVizTo('hiv', 350)">CD4 350 (≥200)</button>
          </div>
          <div class="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
            <label for="viz-hiv-coinfection" class="viz-slider-label block mb-1">Cek Timing Inisiasi ARV pada Koinfeksi Aktif:</label>
            <select id="viz-hiv-coinfection" class="viz-calc-input" onchange="window.InternaApp.updateHivCd4Viz(null, this.value, true)">
              ${Object.entries(HIV_COINFECTION_TIMING)
                .map(([key, item]) => `<option value="${key}" ${key === coinf ? "selected" : ""}>${item.label}</option>`)
                .join("")}
            </select>
          </div>
        </div>
        <div id="viz-hiv-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="${info.bucket}-${coinf}">
          ${formatVizReadoutHtml(info.tier, "Risiko IO Dominan", info.risk, "Profilaksis / TPT", info.proph, `<div class="mt-2 pt-2 border-t border-[var(--border-subtle)]"><p><strong>Timing ARV (${cInfo.label}):</strong> ${cInfo.timing}</p><p class="mt-1"><strong>Interaksi &amp; Pencegahan IRIS:</strong> ${cInfo.iris}</p></div>`)}
        </div>
      </div>
    `;
  }

  function updateHivCd4Viz(cd4Input, coinfInput, fromUser = true) {
    if (fromUser) cancelAllVizAnimations();
    if (cd4Input !== null && cd4Input !== undefined) {
      prior2VizState.hivCd4 = Math.round(clampNum(cd4Input, 0, 500, 0));
    }
    if (coinfInput) prior2VizState.hivCoinfection = coinfInput;

    const cd4 = Math.round(clampNum(prior2VizState.hivCd4, 0, 500, 0));
    const coinf = prior2VizState.hivCoinfection;
    syncSliderAndPill("viz-hiv-slider", "viz-hiv-cd4-pill", cd4, `${cd4} sel/µL`);
    const sel = document.getElementById("viz-hiv-coinfection");
    if (sel && sel.value !== coinf) sel.value = coinf;

    const cxNum = hivCd4ToX(cd4);
    const cx = cxNum.toFixed(1);
    const tagX = Math.min(435, Math.max(48, cxNum)).toFixed(1);
    setSvgAttrs("viz-hiv-cursor", { x1: cx, x2: cx });
    setSvgAttrs("viz-hiv-halo", { cx });
    setSvgAttrs("viz-hiv-dot", { cx });
    const svgTag = setSvgAttrs("viz-hiv-svg-tag", { x: tagX });
    if (svgTag) svgTag.textContent = `CD4 ${cd4}`;

    setSvgAttrs("viz-hiv-bar-200", { opacity: cd4 < 200 ? "1" : "0.45", "stroke-width": cd4 < 200 ? "1.8" : "0.8" });
    setSvgAttrs("viz-hiv-bar-100", { opacity: cd4 < 100 ? "1" : "0.45", "stroke-width": cd4 < 100 ? "1.8" : "0.8" });
    setSvgAttrs("viz-hiv-bar-50", { opacity: cd4 < 50 ? "1" : "0.45", "stroke-width": cd4 < 50 ? "1.8" : "0.8" });
    syncVizPresets("viz-hiv-presets", [cd4 < 50, cd4 >= 50 && cd4 < 100, cd4 >= 100 && cd4 < 200, cd4 >= 200]);

    const info = getHivCd4Info(cd4);
    const cInfo = HIV_COINFECTION_TIMING[coinf] || HIV_COINFECTION_TIMING.none;
    const tKey = `${info.bucket}-${coinf}`;
    const updated = updateVizReadout(
      "viz-hiv-readout",
      info.tone,
      formatVizReadoutHtml(
        info.tier,
        "Risiko IO Dominan",
        info.risk,
        "Profilaksis / TPT",
        info.proph,
        `<div class="mt-2 pt-2 border-t border-[var(--border-subtle)]"><p><strong>Timing ARV (${cInfo.label}):</strong> ${cInfo.timing}</p><p class="mt-1"><strong>Interaksi &amp; Pencegahan IRIS:</strong> ${cInfo.iris}</p></div>`
      ),
      tKey
    );
    if (updated === false) {
      const liveNum = document.getElementById("viz-hiv-tier-num");
      if (liveNum) liveNum.textContent = String(cd4);
    }
  }

  // =========================================================================
  // PRIORITAS 3: DIAGNOSTIC SVG ILLUSTRATIONS & CLINICAL ALGORITHMS (Tropik)
  // =========================================================================

  const prior3VizState = {
    malariaSp: "falciparum",
    neuroType: "toxo",
    mycosisTab: "ipa",
    rabiesTab: "pep",
    rabiesCat: 3,
    amrTab: "esbl_cre",
    amrNode: "esbl"
  };


  // --- 1. Atlas Morfologi 5 Spesies Malaria ---
  const MALARIA_ATLAS_DATA = {
    falciparum: {
      name: "Plasmodium falciparum",
      shortLabel: "P. falciparum",
      cycle: "48 jam (tak beraturan)",
      rbc: "Normal (tidak membesar)",
      smear: "Cincin ganda (accolé), titik Maurer, gametosit PISANG",
      primakuin: "Primakuin 0,25 mg/kg DOSIS TUNGGAL H1",
      tone: "danger",
      clinical: "Mengekspresikan <strong>PfEMP-1</strong> ➔ sitoadherensi &amp; sekuestrasi eritrosit di mikrovaskular otak/organ (penyebab utama <strong>Malaria Berat / Serebral</strong>).",
      tx: "<strong>Tanpa komplikasi:</strong> DHP 3 hari + <strong>Primakuin 0,25 mg/kg dosis tunggal (H1)</strong> sebagai gametosida pemutus transmisi. <strong>Malaria berat:</strong> Artesunat IV 2,4 mg/kg jam 0, 12, 24 s.d. bisa oral.",
      trap: "Trombositopenia (&lt;50.000/µL) lazim dan BUKAN kriteria malaria berat WHO; RDT HRP-2 dapat tetap positif 2–4 minggu pasca-sembuh."
    },
    vivax: {
      name: "Plasmodium vivax",
      shortLabel: "P. vivax",
      cycle: "48 jam (Tersiana)",
      rbc: "Membesar & pucat",
      smear: "Trofozoit ameboid + titik Schüffner halus",
      primakuin: "Primakuin 0,25 mg/kg/hari × 14 HARI",
      tone: "warning",
      clinical: "Membentuk <strong>hipnozoit dorman di hepatosit</strong> yang dapat reaktivasi menjadi relaps berminggu-minggu hingga berbulan-bulan pasca-terapi.",
      tx: "<strong>Lini 1:</strong> DHP 3 hari + <strong>Primakuin 0,25 mg/kg/hari × 14 hari</strong> (relaps: 0,5 mg/kg/hari × 14 hari; defisiensi G6PD: <strong>0,75 mg/kg 1x/minggu × 8 mgg</strong>).",
      trap: "Primakuin <strong>KONTRAINDIKASI mutlak pada ibu hamil</strong> &amp; bayi &lt;6 bulan (risiko hemolisis G6PD janin) dan tidak meredakan demam fase akut eritrositik."
    },
    ovale: {
      name: "Plasmodium ovale",
      shortLabel: "P. ovale",
      cycle: "48 jam (Tersiana)",
      rbc: "Membesar, oval & tepi berjumbai",
      smear: "Titik Schüffner + bentuk oval bergerigi",
      primakuin: "Primakuin 0,25 mg/kg/hari × 14 HARI",
      tone: "warning",
      clinical: "Sama seperti <em>P. vivax</em>, memiliki <strong>hipnozoit dorman di hati</strong> yang menyebabkan relaps bila terapi radikal 14 hari tidak dituntaskan.",
      tx: "<strong>Lini 1:</strong> DHP 3 hari penuh + <strong>Primakuin 0,25 mg/kg/hari × 14 hari</strong> (ibu hamil cukup DHP 3 hari).",
      trap: "Ciri khas apusan tepi tipis adalah eritrosit membesar, lonjong (oval), dan tepi berjumbai (<em>fimbriated</em>) disertai titik Schüffner."
    },
    malariae: {
      name: "Plasmodium malariae",
      shortLabel: "P. malariae",
      cycle: "72 jam (Kuartana)",
      rbc: "Normal / cenderung kecil",
      smear: "Bentuk PITA (band/basket) + titik Ziemann",
      primakuin: "TANPA Primakuin (tidak ada hipnozoit)",
      tone: "info",
      clinical: "Infeksi persisten bertahun-tahun dapat memicu deposit kompleks imun di glomerulus ➔ <strong>Sindrom Nefrotik (<em>Quartan Nephropathy</em>)</strong>.",
      tx: "<strong>Lini 1:</strong> DHP 3 hari penuh <strong>TANPA Primakuin</strong> karena tidak membentuk fase hipnozoit hati.",
      trap: "Jangan keliru memberi Primakuin 14 hari pada <em>P. malariae</em>—fase eksoeritrositik dorman tidak ada pada spesies ini."
    },
    knowlesi: {
      name: "Plasmodium knowlesi",
      shortLabel: "P. knowlesi",
      cycle: "24 jam (Kuotidiana!)",
      rbc: "Normal",
      smear: "Cincin (awal) + pita (lanjut) — mirip falciparum/malariae",
      primakuin: "TANPA Primakuin; awasi parasitemia cepat!",
      tone: "danger",
      clinical: "Zoonosis monyet ekor panjang; siklus replikasi <strong>24 jam paling cepat</strong> sehingga parasitemia melonjak pesat (&gt;100.000/µL = kriteria <strong>Malaria Berat</strong>).",
      tx: "<strong>Tanpa komplikasi:</strong> DHP 3 hari penuh tanpa Primakuin. <strong>Bila parasitemia &gt;100.000/µL atau tanda berat:</strong> Segera <strong>Artesunat IV 2,4 mg/kgBB</strong> (jam 0, 12, 24).",
      trap: "Secara mikroskopis mudah salah identifikasi sebagai <em>P. malariae</em> yang jinak, padahal progresivitas klinis <em>P. knowlesi</em> secepat <em>P. falciparum</em>!"
    }
  };

  function buildMalariaAtlasSvg(sp) {
    const info = MALARIA_ATLAS_DATA[sp] || MALARIA_ATLAS_DATA.falciparum;
    let rbcShapes = "";
    let rbcCaption = "";
    if (sp === "falciparum") {
      rbcShapes = `
        <circle cx="96" cy="96" r="42" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <circle cx="88" cy="92" r="10" fill="none" stroke="var(--viz-blue)" stroke-width="2.2" />
        <circle cx="81" cy="85" r="3" fill="var(--accent-coral)" />
        <circle cx="114" cy="122" r="8" fill="none" stroke="var(--viz-blue)" stroke-width="2" />
        <circle cx="131" cy="80" r="7" fill="none" stroke="var(--viz-blue)" stroke-width="2" />
        <circle cx="136" cy="76" r="3" fill="var(--accent-coral)" />
        <line x1="72" y1="112" x2="78" y2="108" stroke="var(--accent-coral)" stroke-width="1.6" />
        <line x1="104" y1="74" x2="110" y2="78" stroke="var(--accent-coral)" stroke-width="1.6" />
        <path class="osm-draw" style="--osm-len: 120;" d="M126,154 Q146,162 162,138 Q154,154 126,154 Z" fill="var(--viz-purple)" fill-opacity="0.35" stroke="var(--viz-purple)" stroke-width="2.2" />
        <circle cx="146" cy="150" r="3.5" fill="var(--accent-coral)" />
      `;
      rbcCaption = `<text x="108" y="182" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--viz-purple)">Gametosit Pisang + Accolé</text>`;
    } else if (sp === "vivax") {
      rbcShapes = `
        <ellipse cx="106" cy="100" rx="54" ry="50" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="2" stroke-dasharray="4 2" />
        <path class="osm-draw" style="--osm-len: 160;" d="M84,96 Q98,74 118,86 Q132,102 114,118 Q94,128 84,110 Z" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2.2" />
        <circle cx="96" cy="88" r="4" fill="var(--accent-coral)" />
        ${[[70,84],[76,120],[138,88],[132,126],[104,64],[108,136],[144,108],[66,102]].map(([dx,dy]) => `<circle cx="${dx}" cy="${dy}" r="2" fill="var(--accent-coral)" />`).join("")}
      `;
      rbcCaption = `<text x="106" y="182" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-secondary)">Eritrosit Membesar + Titik Schüffner</text>`;
    } else if (sp === "ovale") {
      rbcShapes = `
        <path d="M64,100 C64,68 92,56 122,64 L138,72 L134,82 L148,92 L140,104 L150,116 L136,126 L140,136 C112,148 64,136 64,100 Z" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="2" />
        <ellipse cx="100" cy="100" rx="14" ry="11" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2.2" />
        <circle cx="94" cy="95" r="3.8" fill="var(--accent-coral)" />
        ${[[76,84],[82,120],[124,78],[122,124],[108,72],[108,132]].map(([dx,dy]) => `<circle cx="${dx}" cy="${dy}" r="2" fill="var(--accent-coral)" />`).join("")}
      `;
      rbcCaption = `<text x="106" y="182" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-secondary)">Oval Berjumbai + Titik Schüffner</text>`;
    } else if (sp === "malariae") {
      rbcShapes = `
        <circle cx="106" cy="100" r="40" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2" />
        <rect x="68" y="90" width="76" height="20" rx="6" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2.2" />
        <ellipse cx="106" cy="100" rx="11" ry="5" fill="var(--accent-coral)" fill-opacity="0.7" />
        ${[[84,74],[124,74],[86,126],[122,126]].map(([dx,dy]) => `<circle cx="${dx}" cy="${dy}" r="1.8" fill="var(--text-muted)" />`).join("")}
      `;
      rbcCaption = `<text x="106" y="182" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-primary)">Bentuk Pita (Band) + Titik Ziemann</text>`;
    } else {
      rbcShapes = `
        <circle cx="106" cy="100" r="42" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="2" />
        <rect x="66" y="94" width="80" height="14" rx="5" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2" />
        <circle cx="88" cy="76" r="8" fill="none" stroke="var(--viz-purple)" stroke-width="2.2" />
        <circle cx="84" cy="70" r="2.8" fill="var(--accent-coral)" />
        <circle cx="116" cy="101" r="3.8" fill="var(--accent-coral)" />
      `;
      rbcCaption = `<text x="106" y="182" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-coral)">Cincin (Awal) &amp; Pita (Lanjut) — 24j!</text>`;
    }

    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Ilustrasi Morfologi Apusan Darah ${info.name}">
        <rect x="8" y="8" width="196" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <circle cx="106" cy="100" r="68" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-dasharray="3 3" />
        <g class="osm-breathe">${rbcShapes}</g>
        ${rbcCaption}
        <!-- Summary panel with Osmosis staggered callouts -->
        <rect x="214" y="8" width="258" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="228" y="31" font-size="13" font-weight="800" fill="var(--accent-primary)">${info.shortLabel}</text>
        <line x1="228" y1="40" x2="458" y2="40" stroke="var(--border-subtle)" />
        <g class="osm-callout" style="--osm-i: 0;">
          <text x="228" y="59" font-size="10.5" font-weight="700" fill="var(--text-muted)">SIKLUS DEMAM</text>
          <text x="228" y="74" font-size="11.5" font-weight="700" fill="var(--text-primary)">${info.cycle}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 1;">
          <text x="228" y="96" font-size="10.5" font-weight="700" fill="var(--text-muted)">ERITROSIT INANG</text>
          <text x="228" y="111" font-size="11.5" font-weight="700" fill="var(--text-primary)">${info.rbc}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 2;">
          <text x="228" y="133" font-size="10.5" font-weight="700" fill="var(--text-muted)">CIRI APUSAN TEPI</text>
          <text x="228" y="148" font-size="11" font-weight="700" fill="var(--text-primary)">${info.smear.slice(0, 36)}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 3;">
          <rect x="226" y="160" width="234" height="24" rx="5" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
          <text x="234" y="175.5" font-size="10.5" font-weight="800" fill="var(--accent-primary)">${info.primakuin.slice(0, 38)}</text>
        </g>
      </svg>
    `;
  }

  function renderMalariaAtlasWidget() {
    const sp = prior3VizState.malariaSp;
    const info = MALARIA_ATLAS_DATA[sp] || MALARIA_ATLAS_DATA.falciparum;
    const keys = ["falciparum", "vivax", "ovale", "malariae", "knowlesi"];

    return `
      <div class="viz-widget" id="viz-malaria-card">
        <div class="viz-header">
          <span class="viz-title">Atlas Morfologi 5 Spesies Plasmodium</span>
          <span class="viz-tag">Ilustrasi Skematis</span>
        </div>
        <div class="viz-subtabs" id="viz-malaria-tabs">
          ${keys
            .map(
              (k) => `<button type="button" class="viz-pill-btn ${k === sp ? "active" : ""}" onclick="window.InternaApp.updateMalariaAtlasViz('${k}')"><em>${MALARIA_ATLAS_DATA[k].shortLabel}</em></button>`
            )
            .join("")}
        </div>
        <div class="viz-svg-frame" id="viz-malaria-frame">
          ${buildMalariaAtlasSvg(sp)}
        </div>
        <div id="viz-malaria-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="malaria-${sp}">
          ${formatVizReadoutHtml(
            `${info.name} — ${info.smear}`,
            "Patogenesis &amp; Klinis",
            info.clinical,
            "Terapi Radikal (Kemenkes/WHO)",
            info.tx,
            `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
          )}
        </div>
      </div>
    `;
  }

  function updateMalariaAtlasViz(spInput) {
    const sp = MALARIA_ATLAS_DATA[spInput] ? spInput : "falciparum";
    prior3VizState.malariaSp = sp;
    const info = MALARIA_ATLAS_DATA[sp];
    swapVizSvgFrame("viz-malaria-frame", buildMalariaAtlasSvg(sp));
    const keys = ["falciparum", "vivax", "ovale", "malariae", "knowlesi"];
    syncVizPresets("viz-malaria-tabs", keys.map((k) => k === sp));
    updateVizReadout(
      "viz-malaria-readout",
      info.tone,
      formatVizReadoutHtml(
        `${info.name} — ${info.smear}`,
        "Patogenesis &amp; Klinis",
        info.clinical,
        "Terapi Radikal (Kemenkes/WHO)",
        info.tx,
        `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
      ),
      `malaria-${sp}`
    );
  }

  // --- 2. Pola Neuroimaging ODHIV (CD4 <100) ---
  const HIV_NEURO_DATA = {
    toxo: {
      tabLabel: "Toksoplasmosis",
      title: "Toksoplasmosis Serebri (CD4 <100 sel/µL)",
      loc: "Ganglia Basalis & Corticomedullary",
      pattern: "Multiple Ring-Enhancing + Edema",
      lcs: "MRI kontras lebih sensitif dari CT",
      tone: "danger",
      imaging: "<strong>Multiple ring-enhancing lesions</strong> di <strong>ganglia basalis / <em>corticomedullary junction</em></strong> disertai edema vasogenik.",
      tx: "<strong>Min 6 minggu:</strong> Pirimetamin (loading 200 mg ➔ 50–75 mg) + Sulfadiazin 4x1–1,5 g (atau Klindamisin 4x600 mg bila alergi sulfa) + <strong>Asam Folinat / Leukovorin 10–25 mg/hari</strong>. Mulai ARV dalam 2–3 minggu.",
      trap: "<strong>JANGAN ganti Leukovorin dengan Asam Folat biasa</strong> (mengganggu efek Pirimetamin)! Bila gagal membaik dalam 10–14 hari ➔ curiga PCNSL &amp; biopsi stereotaktik."
    },
    pcnsl: {
      tabLabel: "Limfoma SSP (PCNSL)",
      title: "Limfoma SSP Primer / PCNSL (CD4 <100 sel/µL)",
      loc: "Periventrikular & Korpus Kalosum",
      pattern: "Lesi Soliter Menembus Kalosum",
      lcs: "EBV PCR LCS (+); Biopsi bila gagal tx Toxo",
      tone: "warning",
      imaging: "Massa sering <strong>soliter periventrikular</strong>, menyebar/menembus korpus kalosum (pola <em>butterfly</em>), serta positif <strong>EBV PCR</strong> di LCS.",
      tx: "Evaluasi ulang bila pasien dugaan toksoplasmosis <strong>gagal membaik secara klinis/radiologis setelah 10–14 hari terapi empiris</strong> ➔ lanjutkan ke <strong>biopsi stereotaktik</strong>.",
      trap: "Hindari pemberian kortikosteroid sebelum biopsi bila memungkinkan karena steroid dapat melisiskan sel limfoma sementara (<em>vanishing tumor</em>) dan mengaburkan patologi."
    },
    crypto: {
      tabLabel: "Meningitis Kriptokokus",
      title: "Meningitis Kriptokokus (CD4 <100 sel/µL)",
      loc: "Ruang Virchow-Robin / Ganglia Basalis",
      pattern: "Soap-Bubble Lesions + TIK >25",
      lcs: "Tinta India (+) & CrAg LCS (+)",
      tone: "danger",
      imaging: "Dapat tampak <em>soap-bubble lesions</em> atau normal; pungsi lumbal menunjukkan <strong>tekanan pembukaan tinggi (&gt;25 cmH2O)</strong>, <strong>Tinta India (+)</strong>, dan <strong>CrAg (+)</strong>.",
      tx: "<strong>Induksi 2 mgg:</strong> Amfoterisin B + Flusitosin (atau Liposomal AmB 10 mg/kg tunggal + Flusitosin/Flukonazol 14h) ➔ Konsolidasi Flukonazol 8 mgg ➔ Rumatan 200 mg. <strong>TIK tinggi:</strong> LP evakuasi serial!",
      trap: "ARV <strong>WAJIB ditunda 4–6 minggu</strong> (Uji COAT: ARV dini gandakan mortalitas); <strong>hindari Deksametason rutin</strong> (meningkatkan mortalitas!); Ekinokandin tidak aktif."
    },
    tb_men: {
      tabLabel: "Meningitis TB",
      title: "Meningitis Tuberkulosis (ODHIV)",
      loc: "Sisterna Basalis & Meninx",
      pattern: "Eksudat Basal + Hidrosefalus",
      lcs: "Limfosit tinggi, Protein ↑↑, Glukosa ↓, GeneXpert",
      tone: "warning",
      imaging: "Penyangatan <strong>eksudat leptomeningeal basal</strong> di sekitar sisterna basalis/batang otak + dilatasi ventrikel (hidrosefalus komunikans).",
      tx: "OAT lengkap + <strong>Deksametason tapering</strong> wajib diberikan untuk menekan inflamasi basal &amp; vaskulitis serebri. <strong>Tunda ARV 4–8 minggu</strong> pasca-OAT + steroid.",
      trap: "Inisiasi ARV terlalu dini pada Meningitis TB memicu edema serebri &amp; <strong>CNS-IRIS mematikan</strong>; bila memakai Rifampisin + TLD, beri ekstra DTG 50 mg tiap 12 jam."
    }
  };

  function buildHivNeuroSvg(type) {
    const info = HIV_NEURO_DATA[type] || HIV_NEURO_DATA.toxo;
    let lesionShapes = "";
    let lesionCaption = "";
    if (type === "toxo") {
      lesionShapes = `
        <ellipse cx="86" cy="96" rx="14" ry="20" fill="none" stroke="var(--border-strong)" stroke-dasharray="2 2" />
        <ellipse cx="144" cy="96" rx="14" ry="20" fill="none" stroke="var(--border-strong)" stroke-dasharray="2 2" />
        <circle cx="84" cy="92" r="20" fill="var(--accent-secondary-soft)" />
        <circle cx="84" cy="92" r="11" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="3.2" />
        <circle cx="148" cy="112" r="18" fill="var(--accent-secondary-soft)" />
        <circle cx="148" cy="112" r="9.5" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="3" />
        <circle cx="78" cy="134" r="13" fill="var(--accent-secondary-soft)" />
        <circle cx="78" cy="134" r="7" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.6" />
      `;
      lesionCaption = `<text x="115" y="188" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">Multiple Ring-Enhancing</text>`;
    } else if (type === "pcnsl") {
      lesionShapes = `
        <path d="M84,68 Q115,54 148,70 Q158,88 138,98 Q115,90 92,98 Q74,88 84,68 Z" fill="var(--accent-secondary)" fill-opacity="0.45" stroke="var(--accent-coral)" stroke-width="2.6" />
      `;
      lesionCaption = `<text x="115" y="188" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-secondary)">Soliter Periventrikular / Kalosum</text>`;
    } else if (type === "crypto") {
      lesionShapes = `
        ${[[86,92,6],[96,102,5],[82,106,4.5],[142,94,6],[134,104,5],[146,108,4]].map(([cx,cy,r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--viz-blue-soft)" stroke="var(--viz-blue)" stroke-width="2" />`).join("")}
      `;
      lesionCaption = `<text x="115" y="188" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--viz-blue)">Soap-Bubble + TIK &gt;25 cmH2O</text>`;
    } else {
      lesionShapes = `
        <path d="M90,108 Q115,94 140,108 Q134,132 115,134 Q96,132 90,108 Z" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="3" stroke-dasharray="4 2" />
      `;
      lesionCaption = `<text x="115" y="188" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">Eksudat Basal + Hidrosefalus</text>`;
    }

    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Skema Neuroimaging Axial ${info.title}">
        <rect x="8" y="8" width="214" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <!-- Axial skull & brain outline -->
        <ellipse cx="115" cy="98" rx="68" ry="76" fill="var(--bg-surface)" stroke="var(--text-muted)" stroke-width="2.2" />
        <ellipse cx="115" cy="98" rx="58" ry="66" fill="none" stroke="var(--border-strong)" stroke-width="1.2" />
        <!-- Midline & ventricles -->
        <line x1="115" y1="34" x2="115" y2="162" stroke="var(--border-subtle)" stroke-dasharray="3 3" />
        <path d="M104,80 Q112,92 102,114 Q96,102 104,80 Z" fill="var(--border-strong)" fill-opacity="0.45" />
        <path d="M126,80 Q118,92 128,114 Q134,102 126,80 Z" fill="var(--border-strong)" fill-opacity="0.45" />
        <g class="osm-lesion-pulse">${lesionShapes}</g>
        ${lesionCaption}
        <!-- Diagnostic readout side panel -->
        <rect x="232" y="8" width="240" height="186" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="246" y="31" font-size="12.5" font-weight="800" fill="var(--accent-primary)">${info.tabLabel}</text>
        <line x1="246" y1="40" x2="458" y2="40" stroke="var(--border-subtle)" />
        <g class="osm-callout" style="--osm-i: 0;">
          <text x="246" y="59" font-size="10.5" font-weight="700" fill="var(--text-muted)">LOKASI ANATOMIS</text>
          <text x="246" y="74" font-size="11" font-weight="700" fill="var(--text-primary)">${info.loc}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 1;">
          <text x="246" y="96" font-size="10.5" font-weight="700" fill="var(--text-muted)">POLA RADIOLOGI</text>
          <text x="246" y="111" font-size="11" font-weight="700" fill="var(--accent-coral)">${info.pattern}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 2;">
          <text x="246" y="133" font-size="10.5" font-weight="700" fill="var(--text-muted)">PENUNJANG KUNCI</text>
          <text x="246" y="148" font-size="11" font-weight="700" fill="var(--text-primary)">${info.lcs.slice(0, 35)}</text>
        </g>
        <g class="osm-callout" style="--osm-i: 3;">
          <rect x="244" y="160" width="216" height="24" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
          <text x="252" y="175.5" font-size="10.2" font-weight="800" fill="var(--accent-coral)">MRI/CT kontras SEBELUM LP!</text>
        </g>
      </svg>
    `;
  }

  function renderHivNeuroWidget() {
    const t = prior3VizState.neuroType;
    const info = HIV_NEURO_DATA[t] || HIV_NEURO_DATA.toxo;
    const keys = ["toxo", "pcnsl", "crypto", "tb_men"];

    return `
      <div class="viz-widget" id="viz-neuro-card">
        <div class="viz-header">
          <span class="viz-title">Atlas Pola Neuroimaging ODHIV &amp; Neuroinfeksi</span>
          <span class="viz-tag">Ilustrasi Skematis</span>
        </div>
        <div class="viz-banner">
          Aturan Emas: Lakukan MRI/CT Kepala Kontras SEBELUM Pungsi Lumbal bila terdapat defisit neurologis fokal atau papiledema!
        </div>
        <div class="viz-subtabs" id="viz-neuro-tabs">
          ${keys
            .map(
              (k) => `<button type="button" class="viz-pill-btn ${k === t ? "active" : ""}" onclick="window.InternaApp.updateHivNeuroViz('${k}')">${HIV_NEURO_DATA[k].tabLabel}</button>`
            )
            .join("")}
        </div>
        <div class="viz-svg-frame" id="viz-neuro-frame">
          ${buildHivNeuroSvg(t)}
        </div>
        <div id="viz-neuro-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="neuro-${t}">
          ${formatVizReadoutHtml(
            info.title,
            "Pencitraan &amp; LCS Khas",
            info.imaging,
            "Terapi Kunci &amp; ARV",
            info.tx,
            `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
          )}
        </div>
      </div>
    `;
  }

  function updateHivNeuroViz(typeInput) {
    const t = HIV_NEURO_DATA[typeInput] ? typeInput : "toxo";
    prior3VizState.neuroType = t;
    const info = HIV_NEURO_DATA[t];
    swapVizSvgFrame("viz-neuro-frame", buildHivNeuroSvg(t));
    const keys = ["toxo", "pcnsl", "crypto", "tb_men"];
    syncVizPresets("viz-neuro-tabs", keys.map((k) => k === t));
    updateVizReadout(
      "viz-neuro-readout",
      info.tone,
      formatVizReadoutHtml(
        info.title,
        "Pencitraan &amp; LCS Khas",
        info.imaging,
        "Terapi Kunci &amp; ARV",
        info.tx,
        `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`
      ),
      `neuro-${t}`
    );
  }

  // --- 3. Perbandingan CT & Hifa Mikosis Invasif (Aspergillus vs Mucorales) ---
  const MYCOSIS_CT_DATA = {
    ipa: {
      tabLabel: "IPA / CAPA (Aspergillus)",
      title: "Aspergilosis Paru Invasif (IPA / CAPA)",
      ctSign: "Halo Sign (Awal) → Air-Crescent (Pulih)",
      hyphaeLabel: "Bersepta Reguler, Cabang Lancip 45°",
      tone: "warning",
      risk: "Neutropenia berat / pasca-COVID-19 ICU (CAPA pasca-steroid/tocilizumab). Biomarker spesifik: <strong>Antigen Galaktomanan</strong> serum/BAL (+ β-D-Glukan).",
      tx: "<strong>Lini 1: Vorikonazol</strong> (loading 6 mg/kg/12j H1 ➔ 4 mg/kg/12j; pantau target kadar 1–5,5 mcg/mL) atau <strong>Isavukonazol</strong>.",
      trap: "<strong>Flukonazol TIDAK aktif</strong> untuk <em>Aspergillus</em>! Waspadai toksisitas penglihatan/halusinasi &amp; hepatotoksisitas Vorikonazol."
    },
    mucor: {
      tabLabel: "Mukormikosis (Mucorales)",
      title: "Mukormikosis Pulmoner &amp; Rino-Orbito-Serebral",
      ctSign: "Reversed Halo Sign (Atoll Sign)",
      hyphaeLabel: "Lebar Tanpa Septa, Cabang Tegak 90°",
      tone: "danger",
      risk: "<strong>Ketoasidosis Diabetikum (KAD)</strong>, kelebihan besi/deferoksamin. Khas: <strong>eschar hitam nekrotik di palatum/mukosa hidung</strong> + proptosis/oftalmoplegia.",
      tx: "<strong>Trias Terapi Wajib:</strong> (1) <strong>Debridemen bedah radikal emergensi</strong>; (2) <strong>Liposomal Amfoterisin B dosis tinggi (5–10 mg/kg/hari)</strong>; (3) Koreksi cepat KAD.",
      trap: "<strong>Vorikonazol &amp; Ekinokandin TIDAK AKTIF terhadap Mucorales</strong>! Pemakaian Vorikonazol rutin justru berisiko memicu <em>breakthrough mukormikosis</em>!"
    },
    aspergiloma: {
      tabLabel: "Aspergiloma (Fungus Ball)",
      title: "Aspergiloma (Kolonisasi Kavitas Pasca-TB)",
      ctSign: "Monad Sign (Bola Jamur + Bulan Sabit)",
      hyphaeLabel: "Hifa Aspergillus (Bersepta, 45°)",
      tone: "info",
      risk: "Kavitas paru lama pasca-TB yang terisi massa miselium (<em>fungus ball</em>) bebas bergerak saat ubah posisi (<strong>Monad Sign</strong>); keluhan klasik hemoptisis berulang.",
      tx: "Bila asimtomatik: observasi. Bila hemoptisis berulang/berat: <strong>Reseksi bedah definitif</strong> (atau embolisasi arteri bronkialis bila kontraindikasi operasi).",
      trap: "Bedakan <em>Aspergiloma</em> (non-invasif di kavitas lama) vs <em>IPA</em> (angioinvasif di pejamu neutropenik berat yang memerlukan Vorikonazol IV segera)."
    }
  };

  function buildMycosisCtSvg(tab) {
    const info = MYCOSIS_CT_DATA[tab] || MYCOSIS_CT_DATA.ipa;
    let ctVisual = "";
    let hyphaeVisual = "";

    if (tab === "ipa") {
      ctVisual = `
        <!-- Halo Sign: Solid central core + hazy ground-glass outer halo -->
        <circle class="osm-lesion-pulse" cx="96" cy="96" r="36" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1.5" stroke-dasharray="4 3" />
        <circle cx="96" cy="96" r="18" fill="var(--accent-coral)" fill-opacity="0.82" />
        <!-- Air-crescent recovery mini inset -->
        <g class="osm-callout" style="--osm-i: 1;">
          <circle cx="178" cy="70" r="22" fill="var(--bg-surface-subtle)" stroke="var(--border-strong)" stroke-width="1.5" />
          <path d="M161,72 A17,17 0 0,0 195,72 A15,12 0 0,1 161,72 Z" fill="var(--accent-primary)" fill-opacity="0.7" />
          <text x="178" y="104" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-muted)">Air-Crescent</text>
        </g>
        <text class="osm-callout" style="--osm-i: 0;" x="122" y="176" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-secondary)">Halo Sign (GGO + Nodul)</text>
      `;
    } else if (tab === "mucor") {
      ctVisual = `
        <!-- Reversed Halo / Atoll Sign: Thick solid ring surrounding GGO inner core -->
        <circle class="osm-lesion-pulse" cx="122" cy="98" r="36" fill="none" stroke="var(--accent-coral)" stroke-width="10" />
        <circle cx="122" cy="98" r="27" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary)" stroke-width="1" stroke-dasharray="3 2" />
        <text class="osm-callout" style="--osm-i: 0;" x="122" y="176" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">Reversed Halo (Atoll Sign)</text>
      `;
    } else {
      ctVisual = `
        <!-- Aspergiloma: thin cavity + dependent fungal ball -->
        <circle cx="122" cy="98" r="36" fill="var(--bg-surface)" stroke="var(--accent-primary)" stroke-width="2.5" />
        <circle class="osm-breathe" cx="122" cy="110" r="21" fill="var(--accent-secondary)" fill-opacity="0.78" />
        <path class="osm-draw" pathLength="180" style="--osm-i: 0;" d="M98,82 Q122,68 146,82" fill="none" stroke="var(--viz-blue)" stroke-width="2" stroke-dasharray="3 2" />
        <text class="osm-callout" style="--osm-i: 0;" x="122" y="176" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-primary)">Monad Sign (Bola Jamur)</text>
      `;
    }

    if (tab === "mucor") {
      hyphaeVisual = `
        <!-- Wide non-septate Mucorales with 90-degree branching -->
        <path class="osm-draw" pathLength="180" style="--osm-i: 0;" d="M294,148 L294,58" fill="none" stroke="var(--accent-coral)" stroke-width="9" stroke-linecap="round" />
        <path class="osm-draw" pathLength="180" style="--osm-i: 1;" d="M294,104 L394,104" fill="none" stroke="var(--accent-coral)" stroke-width="8" stroke-linecap="round" />
        <path class="osm-draw" pathLength="180" style="--osm-i: 2;" d="M348,104 L348,54" fill="none" stroke="var(--accent-coral)" stroke-width="7.5" stroke-linecap="round" />
        <!-- 90 degree right-angle corner marker -->
        <g class="osm-callout" style="--osm-i: 2;">
          <polyline points="299,88 314,88 314,100" fill="none" stroke="var(--text-primary)" stroke-width="2" />
          <text x="328" y="84" font-size="12.5" font-weight="800" fill="var(--text-primary)">90°</text>
          <text x="358" y="176" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-coral)">Hifa Lebar Tanpa Septa (90°)</text>
        </g>
      `;
    } else {
      hyphaeVisual = `
        <!-- Narrow septate Aspergillus with 45-degree dichotomous branching -->
        <path class="osm-draw" pathLength="180" style="--osm-i: 0;" d="M312,150 L348,96 L326,48 M348,96 L392,56 M366,79 L410,92" fill="none" stroke="var(--accent-primary)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        <g class="osm-callout" style="--osm-i: 1;">
          <!-- Septa tick marks -->
          <line x1="322" y1="128" x2="331" y2="134" stroke="var(--bg-surface)" stroke-width="2" />
          <line x1="334" y1="110" x2="343" y2="116" stroke="var(--bg-surface)" stroke-width="2" />
          <line x1="334" y1="74" x2="342" y2="70" stroke="var(--bg-surface)" stroke-width="2" />
          <line x1="364" y1="74" x2="371" y2="82" stroke="var(--bg-surface)" stroke-width="2" />
          <!-- 45 degree arc -->
          <path d="M342,84 A16,16 0 0,1 359,86" fill="none" stroke="var(--text-primary)" stroke-width="1.8" />
          <text x="351" y="72" text-anchor="middle" font-size="12.5" font-weight="800" fill="var(--text-primary)">45°</text>
          <text x="358" y="176" text-anchor="middle" font-size="11" font-weight="800" fill="var(--accent-primary)">Hifa Bersepta Cabang 45°</text>
        </g>
      `;
    }

    return `
      <svg class="viz-svg" viewBox="0 0 480 200" role="img" aria-label="Perbandingan HRCT dan Histologi Hifa ${info.title}">
        <!-- Left HRCT card -->
        <rect x="8" y="8" width="226" height="184" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="121" y="28" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--text-muted)">POLA HRCT PARU</text>
        <ellipse cx="122" cy="98" rx="68" ry="52" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.4" />
        ${ctVisual}
        <!-- Right Hyphae card -->
        <rect x="246" y="8" width="226" height="184" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="359" y="28" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--text-muted)">HISTOPATOLOGI HIFA</text>
        <rect x="262" y="38" width="194" height="118" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />
        ${hyphaeVisual}
      </svg>
    `;
  }

  function renderMycosisCtWidget() {
    const tab = prior3VizState.mycosisTab;
    const info = MYCOSIS_CT_DATA[tab] || MYCOSIS_CT_DATA.ipa;
    const keys = ["ipa", "mucor", "aspergiloma"];

    return `
      <div class="viz-widget" id="viz-mycosis-card">
        <div class="viz-header">
          <span class="viz-title">Komparasi CT Paru &amp; Hifa: Aspergillus vs Mucorales</span>
          <span class="viz-tag">Ilustrasi Skematis</span>
        </div>
        <div class="viz-subtabs" id="viz-mycosis-tabs">
          ${keys
            .map(
              (k) => `<button type="button" class="viz-pill-btn ${k === tab ? "active" : ""}" onclick="window.InternaApp.updateMycosisCtViz('${k}')">${MYCOSIS_CT_DATA[k].tabLabel}</button>`
            )
            .join("")}
        </div>
        <div class="viz-svg-frame" id="viz-mycosis-frame">
          ${buildMycosisCtSvg(tab)}
        </div>
        <div id="viz-mycosis-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="mycosis-${tab}">
          ${formatVizReadoutHtml(
            `${info.title} — ${info.ctSign}`,
            "Faktor Risiko &amp; Biomarker",
            info.risk,
            "Terapi Pilihan Wajib",
            info.tx,
            `<p class="mt-1.5"><strong>Lubang Spektrum &amp; Jebakan Board:</strong> ${info.trap}</p>`
          )}
        </div>
      </div>
    `;
  }

  function updateMycosisCtViz(tabInput) {
    const tab = MYCOSIS_CT_DATA[tabInput] ? tabInput : "ipa";
    prior3VizState.mycosisTab = tab;
    const info = MYCOSIS_CT_DATA[tab];
    swapVizSvgFrame("viz-mycosis-frame", buildMycosisCtSvg(tab));
    syncVizPresets("viz-mycosis-tabs", ["ipa", "mucor", "aspergiloma"].map((k) => k === tab));
    updateVizReadout(
      "viz-mycosis-readout",
      info.tone,
      formatVizReadoutHtml(
        `${info.title} — ${info.ctSign}`,
        "Faktor Risiko &amp; Biomarker",
        info.risk,
        "Terapi Pilihan Wajib",
        info.tx,
        `<p class="mt-1.5"><strong>Lubang Spektrum &amp; Jebakan Board:</strong> ${info.trap}</p>`
      ),
      `mycosis-${tab}`
    );
  }

  // --- 4. Alur PEP Rabies WHO & Neurotropisme / Mpox ---
  const RABIES_CAT_DATA = {
    1: {
      tone: "info",
      title: "WHO Kategori I — Kontak Kulit Utuh",
      exposure: "Menyentuh/memberi makan hewan atau jilatan pada <strong>kulit yang utuh</strong> (tidak ada luka/lecet/mukosa).",
      pep: "<strong>Cuci area kontak saja</strong> dengan air &amp; sabun. <strong>TIDAK perlu VAR maupun SAR</strong>.",
      trap: "Jangan memboroskan SAR/VAR untuk kontak kulit utuh tanpa abrasi."
    },
    2: {
      tone: "warning",
      title: "WHO Kategori II — Gigitan / Cakaran Ringan Tanpa Perdarahan",
      exposure: "Gigitan minor atau cakaran kulit lecet <strong>tanpa perdarahan</strong>.",
      pep: "<strong>Cuci sabun + air mengalir min 15 menit</strong> + antiseptik ➔ segera berikan <strong>VAR (Zagreb 2-1-1 atau Essen 5 dosis)</strong> di otot deltoid. SAR hanya bila imunokompromais berat.",
      trap: "Pastikan tidak ada perdarahan mikro/mukosa; bila meragukan atau pasien imunokompromais berat, naikkan menjadi tata laksana Kategori III."
    },
    3: {
      tone: "danger",
      title: "WHO Kategori III — Luka Tembus Berdarah / Mukosa / Kelelawar",
      exposure: "Gigitan transdermal berdarah (tunggal/multipel), kontaminasi air liur di selaput mukosa/luka terbuka, atau <strong>setiap paparan kelelawar</strong>.",
      pep: "<strong>Cuci sabun + air 15 mnt</strong> ➔ <strong>Infiltrasi SAR (HRIG 20 IU/kg atau ERIG 40 IU/kg)</strong> langsung di dalam &amp; sekitar luka + <strong>VAR IM deltoid kontralateral</strong>!",
      trap: "<strong>DILARANG menjahit primer luka rapat</strong> sebelum infiltrasi SAR; sisa SAR disuntikkan IM di tempat berbeda dari lokasi VAR, dan VAR <strong>TIDAK boleh di gluteus</strong>!"
    }
  };

  function buildRabiesPepSvg(tab, cat) {
    if (tab === "neuro_mpox") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Diagram Neurotropisme Retrograd Rabies dan Perbandingan Mpox vs Varicella">
          ${renderVizArrowDefs("rabies-arr-nm")}
          <!-- Left: Rabies retrograde neurotropism -->
          <rect x="8" y="8" width="226" height="186" rx="14" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="121" y="27" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="0.03em" fill="var(--accent-coral)">NEUROTROPISME RABIES</text>
          <g class="osm-callout" style="--osm-i: 0;">
            <rect x="20" y="38" width="202" height="30" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="1.2" />
            <text x="121" y="56.5" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">1. Reseptor ACh Nikotinik (nAChR)</text>
          </g>
          <line class="osm-axon-flow" x1="121" y1="68" x2="121" y2="82" stroke="var(--accent-coral)" stroke-width="1.8" marker-end="url(#rabies-arr-nm)" />
          <g class="osm-callout" style="--osm-i: 1;">
            <rect x="20" y="84" width="202" height="30" rx="10" fill="var(--accent-secondary-soft)" stroke="var(--accent-secondary-border)" stroke-width="1.2" />
            <text x="121" y="102.5" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--accent-secondary)">2. Transpor Aksonal (8–20 mm/hari)</text>
          </g>
          <line class="osm-axon-flow" x1="121" y1="114" x2="121" y2="128" stroke="var(--accent-coral)" stroke-width="1.8" marker-end="url(#rabies-arr-nm)" />
          <g class="osm-callout" style="--osm-i: 2;">
            <rect class="osm-lesion-pulse" x="20" y="130" width="202" height="52" rx="10" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" stroke-width="1.4" />
            <text x="121" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-coral)">3. Otak: Negri Bodies (Hipokampus)</text>
            <text x="121" y="167" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-primary)">Hidrofobia &amp; Aerofobia (~100% fatal)</text>
          </g>

          <!-- Right: Mpox vs Varicella -->
          <rect x="246" y="8" width="226" height="186" rx="14" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="359" y="27" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="0.03em" fill="var(--accent-primary)">MPOX vs VARISELA</text>
          <!-- Mpox uniform lesions -->
          <g class="osm-callout" style="--osm-i: 1;">
            <rect x="258" y="38" width="202" height="68" rx="10" fill="var(--bg-surface)" stroke="var(--accent-primary-border)" stroke-width="1.2" />
            <text x="270" y="55" font-size="11" font-weight="700" fill="var(--accent-primary)">Mpox: Monomorfik &amp; Sinkron</text>
            <g class="osm-lesion-pulse">
              ${[278,302,326].map((lx) => `<circle cx="${lx}" cy="74" r="7" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="1.6" /><circle cx="${lx}" cy="74" r="2" fill="var(--accent-primary)" />`).join("")}
            </g>
            <text x="342" y="77" font-size="10" font-weight="600" fill="var(--text-secondary)">Umbilikasi seragam</text>
            <text x="270" y="96" font-size="10" font-weight="600" fill="var(--text-muted)">Telapak (+), Limfadenopati (+)</text>
          </g>

          <!-- Varicella polymorphic lesions -->
          <g class="osm-callout" style="--osm-i: 2;">
            <rect x="258" y="114" width="202" height="68" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="1.2" />
            <text x="270" y="131" font-size="11" font-weight="700" fill="var(--text-primary)">Varisela: Polimorfik (Sentripetal)</text>
            <circle cx="278" cy="150" r="4" fill="var(--accent-coral)" />
            <circle cx="300" cy="150" r="7" fill="none" stroke="var(--viz-blue)" stroke-width="2" />
            <path d="M318,144 L328,154 M328,144 L318,154" stroke="var(--text-muted)" stroke-width="2" />
            <text x="338" y="153" font-size="10" font-weight="700" fill="var(--text-secondary)">Papul-vesikel-krusta</text>
            <text x="270" y="172" font-size="10" font-weight="700" fill="var(--text-muted)">Bebas telapak, Limfadenopati (-)</text>
          </g>
        </svg>
      `;
    }

    const activeSar = cat === 3;
    const activeVar = cat >= 2;
    const sarStroke = activeSar ? "var(--accent-coral)" : "var(--border-subtle)";
    const sarFill = activeSar ? "var(--accent-coral-soft)" : "var(--bg-surface)";
    const varStroke = activeVar ? "var(--accent-primary)" : "var(--border-subtle)";
    const varFill = activeVar ? "var(--accent-primary-soft)" : "var(--bg-surface)";

    return `
      <svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Algoritma PEP Rabies WHO Kategori ${cat}">
        ${renderVizArrowDefs("rabies-arr")}
        <!-- Top exposure banner -->
        <rect x="14" y="10" width="452" height="36" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
        <text x="240" y="32" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-primary)">
          ${cat === 1 ? "KATEGORI I: Kontak Kulit Utuh (Tanpa Abrasi)" : cat === 2 ? "KATEGORI II: Lecet / Gigitan Minor Tanpa Darah" : "KATEGORI III: Luka Berdarah / Mukosa / Kelelawar"}
        </text>
        <!-- Step 1: Wash 15 min -->
        <g class="osm-callout" style="--osm-i: 0;">
          <rect x="14" y="62" width="134" height="68" rx="12" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="1.6" />
          <text x="81" y="83" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-primary)">1. CUCI LUKA</text>
          <text x="81" y="101" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-primary)">Sabun + Air Mengalir</text>
          <text x="81" y="117" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--accent-primary)">Min. 15 Menit</text>
        </g>
        <line class="${activeSar || activeVar ? "osm-axon-flow" : ""}" x1="148" y1="96" x2="167" y2="96" stroke="${activeSar ? "var(--accent-coral)" : activeVar ? "var(--accent-primary)" : "var(--text-muted)"}" stroke-width="1.8" marker-end="url(#rabies-arr)" />
        <!-- Step 2: SAR -->
        <g class="osm-callout" style="--osm-i: 1;">
          ${activeSar ? '<rect class="osm-lesion-pulse" x="167" y="59" width="148" height="74" rx="14" fill="none" stroke="var(--accent-coral)" stroke-width="1.4" />' : ""}
          <rect class="viz-smooth-bar" x="170" y="62" width="142" height="68" rx="12" fill="${sarFill}" stroke="${sarStroke}" stroke-width="${activeSar ? "1.8" : "1.2"}" opacity="${activeSar ? "1" : "0.55"}" />
          <text x="241" y="83" text-anchor="middle" font-size="11" font-weight="700" fill="${activeSar ? "var(--accent-coral)" : "var(--text-muted)"}">2. INFILTRASI SAR</text>
          <text x="241" y="101" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-primary)">${activeSar ? "HRIG 20 / ERIG 40 IU" : "Tidak Rutin"}</text>
          <text x="241" y="117" text-anchor="middle" font-size="10.2" font-weight="600" fill="${activeSar ? "var(--accent-coral)" : "var(--text-muted)"}">${activeSar ? "WAJIB di Sekitar Luka" : cat === 2 ? "(Kecuali Imunokompr.)" : "Tidak Perlu"}</text>
        </g>
        <line class="${activeVar ? "osm-axon-flow" : ""}" x1="312" y1="96" x2="331" y2="96" stroke="${activeVar ? "var(--accent-primary)" : "var(--text-muted)"}" stroke-width="1.8" marker-end="url(#rabies-arr)" />
        <!-- Step 3: VAR -->
        <g class="osm-callout" style="--osm-i: 2;">
          <rect class="viz-smooth-bar" x="334" y="62" width="132" height="68" rx="12" fill="${varFill}" stroke="${varStroke}" stroke-width="${activeVar ? "1.8" : "1.2"}" opacity="${activeVar ? "1" : "0.55"}" />
          <text x="400" y="83" text-anchor="middle" font-size="11" font-weight="700" fill="${activeVar ? "var(--accent-primary)" : "var(--text-muted)"}">3. VAKSIN VAR</text>
          <text x="400" y="101" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-primary)">${activeVar ? "Zagreb / Essen" : "Tidak Perlu"}</text>
          <text x="400" y="117" text-anchor="middle" font-size="10.2" font-weight="600" fill="${activeVar ? "var(--accent-primary)" : "var(--text-muted)"}">${activeVar ? "IM Otot Deltoid" : "Observasi Saja"}</text>
        </g>
        <!-- Bottom Pitfall box -->
        <g class="osm-callout" style="--osm-i: 3;">
          <rect x="14" y="144" width="452" height="44" rx="12" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
          <text x="240" y="163" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-coral)">DILARANG Jahit Rapat Primer Tanpa Infiltrasi SAR!</text>
          <text x="240" y="179" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-secondary)">VAR disuntik di DELTOID (bukan gluteus) kontralateral terhadap sisa SAR.</text>
        </g>
      </svg>
    `;
  }

  function renderRabiesPepWidget() {
    const tab = prior3VizState.rabiesTab;
    const cat = prior3VizState.rabiesCat;
    const cInfo = RABIES_CAT_DATA[cat] || RABIES_CAT_DATA[3];
    const readoutHtml =
      tab === "neuro_mpox"
        ? formatVizReadoutHtml(
            "Neurotropisme Rabies &amp; Diferensial Mpox vs Varisela",
            "Jalur Rabies &amp; Negri Bodies",
            "Virus berikatan di <strong>nAChR</strong> ➔ merambat aksonal retrograd (8–20 mm/hari) ➔ <strong>Negri Bodies</strong> di neuron hipokampus/Purkinje ➔ hidrofobia &amp; aerofobia.",
            "Mpox vs Varisela &amp; Ebola",
            "<strong>Mpox:</strong> limfadenopati menonjol + ruam <strong>monomorfik/sinkron</strong> sentrifugal ke telapak (PCR swab lesi; berat: Tecovirimat). <strong>Ebola:</strong> AST &gt;&gt; ALT; mAb Inmazeb/Ebanga.",
            `<p class="mt-1.5"><strong>Jebakan Ujian:</strong> Spesimen baku emas Mpox adalah <strong>RT-PCR swab atap/dasar lesi kulit</strong> (bukan serologi darah rutin!).</p>`
          )
        : formatVizReadoutHtml(
            cInfo.title,
            "Kriteria Pajanan WHO",
            cInfo.exposure,
            "Protokol PEP Wajib",
            cInfo.pep,
            `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${cInfo.trap}</p>`
          );

    return `
      <div class="viz-widget" id="viz-rabies-card">
        <div class="viz-header">
          <span class="viz-title">Algoritma PEP Rabies WHO &amp; Zoonosis Viral</span>
          <span class="viz-tag">WHO &amp; PAPDI</span>
        </div>
        <div class="viz-subtabs" id="viz-rabies-mode-tabs">
          <button type="button" class="viz-pill-btn ${tab === "pep" ? "active" : ""}" onclick="window.InternaApp.updateRabiesPepViz('pep', null)">1. Alur PEP WHO (Kat I–III)</button>
          <button type="button" class="viz-pill-btn ${tab === "neuro_mpox" ? "active" : ""}" onclick="window.InternaApp.updateRabiesPepViz('neuro_mpox', null)">2. Neurotropisme + Mpox vs Varisela</button>
        </div>
        <div class="viz-presets ${tab === "pep" ? "" : "hidden"}" id="viz-rabies-cat-tabs" style="margin-bottom:0.65rem;">
          <button type="button" class="viz-pill-btn ${cat === 1 ? "active" : ""}" onclick="window.InternaApp.updateRabiesPepViz(null, 1)">Kategori I</button>
          <button type="button" class="viz-pill-btn ${cat === 2 ? "active" : ""}" onclick="window.InternaApp.updateRabiesPepViz(null, 2)">Kategori II</button>
          <button type="button" class="viz-pill-btn ${cat === 3 ? "active" : ""}" onclick="window.InternaApp.updateRabiesPepViz(null, 3)">Kategori III</button>
        </div>
        <div class="viz-svg-frame" id="viz-rabies-frame">
          ${buildRabiesPepSvg(tab, cat)}
        </div>
        <div id="viz-rabies-readout" class="viz-readout" data-tone="${tab === "neuro_mpox" ? "warning" : cInfo.tone}" data-last-key="rabies-${tab}-${tab === "pep" ? cat : "nm"}">
          ${readoutHtml}
        </div>
      </div>
    `;
  }

  function updateRabiesPepViz(tabInput, catInput) {
    if (tabInput === "pep" || tabInput === "neuro_mpox") prior3VizState.rabiesTab = tabInput;
    if (catInput !== null && catInput !== undefined) {
      prior3VizState.rabiesCat = Math.min(3, Math.max(1, parseInt(catInput, 10) || 3));
    }
    const tab = prior3VizState.rabiesTab;
    const cat = prior3VizState.rabiesCat;

    syncVizPresets("viz-rabies-mode-tabs", [tab === "pep", tab === "neuro_mpox"]);
    syncVizPresets("viz-rabies-cat-tabs", [cat === 1, cat === 2, cat === 3]);
    const catWrap = document.getElementById("viz-rabies-cat-tabs");
    if (catWrap) catWrap.classList.toggle("hidden", tab !== "pep");

    swapVizSvgFrame("viz-rabies-frame", buildRabiesPepSvg(tab, cat));

    const cInfo = RABIES_CAT_DATA[cat] || RABIES_CAT_DATA[3];
    const tone = tab === "neuro_mpox" ? "warning" : cInfo.tone;
    const html =
      tab === "neuro_mpox"
        ? formatVizReadoutHtml(
            "Neurotropisme Rabies &amp; Diferensial Mpox vs Varisela",
            "Jalur Rabies &amp; Negri Bodies",
            "Virus berikatan di <strong>nAChR</strong> ➔ merambat aksonal retrograd (8–20 mm/hari) ➔ <strong>Negri Bodies</strong> di neuron hipokampus/Purkinje ➔ hidrofobia &amp; aerofobia.",
            "Mpox vs Varisela &amp; Ebola",
            "<strong>Mpox:</strong> limfadenopati menonjol + ruam <strong>monomorfik/sinkron</strong> sentrifugal ke telapak (PCR swab lesi; berat: Tecovirimat). <strong>Ebola:</strong> AST &gt;&gt; ALT; mAb Inmazeb/Ebanga.",
            `<p class="mt-1.5"><strong>Jebakan Ujian:</strong> Spesimen baku emas Mpox adalah <strong>RT-PCR swab atap/dasar lesi kulit</strong> (bukan serologi darah rutin!).</p>`
          )
        : formatVizReadoutHtml(
            cInfo.title,
            "Kriteria Pajanan WHO",
            cInfo.exposure,
            "Protokol PEP Wajib",
            cInfo.pep,
            `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${cInfo.trap}</p>`
          );
    updateVizReadout("viz-rabies-readout", tone, html, `rabies-${tab}-${tab === "pep" ? cat : "nm"}`);
  }

  // --- 5. Stewardship ESBL/CRE, MRSA TDM & ASB ---
  const AMR_STEWARD_INFO = {
    esbl_cre: {
      tone: "danger",
      title: "Algoritma Bakteremia ESBL &amp; CRE (IDSA AMR Guidelines)",
      col1Title: "ESBL vs CRE Serin (KPC / OXA-48)",
      col1Html: "<strong>ESBL:</strong> Wajib <strong>Karbapenem (Meropenem / Ertapenem)</strong> — hasil Uji MERINO melarang Piperasilin-tazobaktam &amp; Seftriakson meski tampak sensitif cakram! <strong>CRE KPC/OXA-48:</strong> <strong>Ceftazidime-avibactam</strong>.",
      col2Title: "CRE Metallo-β-Lactamase (NDM / VIM)",
      col2Html: "Pilih kombinasi <strong>Ceftazidime-avibactam + Aztreonam</strong> (atau Cefiderocol). Aztreonam kebal dihidrolisis enzim MBL/NDM, sementara avibactam melindungi aztreonam dari ko-produksi ESBL/AmpC!",
      trap: "Jangan menggunakan monoterapi Ceftazidime-avibactam pada CRE penghasil NDM/MBL tanpa Aztreonam!"
    },
    mrsa_tdm: {
      tone: "warning",
      title: "Pneumonia / Bakteremia MRSA &amp; TDM Vankomisin (AUC/MIC)",
      col1Title: "TDM Vankomisin Berbasis PK/PD",
      col1Html: "Target terbaru IDSA/ASHP untuk MRSA berat adalah rasio <strong>AUC<sub>24</sub>/MIC 400–600 mg·jam/L</strong> (menggantikan target <em>trough</em> 15–20 mcg/mL tunggal) untuk menekan risiko nefrotoksisitas akut.",
      col2Title: "Linezolid vs Daptomisin (Paru vs Darah)",
      col2Html: "<strong>Pneumonia MRSA:</strong> <strong>Linezolid 2x600 mg</strong> (penetrasi cairan epitel paru tinggi) atau Vankomisin. <strong>Daptomisin KONTRAINDIKASI</strong> untuk pneumonia karena diinaktivasi surfaktan paru!",
      trap: "CAP rawat inap stabil klinis &amp; afebris 48–72 jam (min 5 hari) dipulangkan TANPA perlu menunggu foto toraks bersih atau menambah antibiotik oral pulang!"
    },
    asb: {
      tone: "info",
      title: "Aturan Emas Bakteriuria Asimtomatik (Kultur ≥10⁵ CFU/mL Tanpa Gejala)",
      col1Title: "2 Populasi WAJIB Terapi",
      col1Html: "(1) <strong>Ibu Hamil:</strong> terapi oral aman kehamilan 3–7 hari mencegah pielonefritis &amp; partus prematur. (2) <strong>Pra-Prosedur Urologi Invasif Berisiko Perdarahan Mukosa</strong> (TURP / litotripsi).",
      col2Title: "Populasi DILARANG Diterapi",
      col2Html: "<strong>Geriatri/lansia, pasien Diabetes Melitus, pengguna kateter Foley menetap, serta pra-bedah non-urologi</strong> (ortopedi/bedah umum) — piuria asimtomatik bukan indikasi antibiotik!",
      trap: "Mengobati ASB pada kateter atau geriatri tidak menurunkan mortalitas, justru memicu resistensi MDR dan kolitis <em>C. difficile</em>."
    }
  };

  function buildAmrStewardSvg(tab, node) {
    if (tab === "mrsa_tdm") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="TDM Vankomisin AUC per MIC dan Pilihan Pneumonia MRSA">
          <!-- PK/PD Gauge Bar -->
          <text x="240" y="23" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--text-primary)">TARGET TDM VANKOMISIN (MRSA BERAT): AUC₂₄ / MIC</text>
          <rect x="20" y="34" width="130" height="28" rx="5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="85" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--text-muted)">&lt;400 Subterapeutik</text>
          <rect class="osm-breathe" x="156" y="34" width="168" height="28" rx="5" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="2.2" />
          <text x="240" y="52" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-primary)">400–600 mg·jam/L (TARGET)</text>
          <rect x="330" y="34" width="130" height="28" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
          <text x="395" y="52" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--accent-coral)">&gt;600 Risiko AKI</text>

          <!-- Lung vs Blood fork -->
          <g class="osm-callout" style="--osm-i: 0;">
            <rect x="20" y="82" width="212" height="106" rx="8" fill="var(--accent-primary-soft)" stroke="var(--accent-primary-border)" />
            <text x="126" y="103" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--accent-primary)">Pneumonia MRSA (HAP/VAP)</text>
            <text x="126" y="125" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">Linezolid 2x600 / Vankomisin</text>
            <rect x="32" y="140" width="188" height="36" rx="5" fill="var(--accent-coral-soft)" stroke="var(--accent-coral-border)" />
            <text x="126" y="156" text-anchor="middle" font-size="10.2" font-weight="800" fill="var(--accent-coral)">Daptomisin KONTRAINDIKASI</text>
            <text x="126" y="170" text-anchor="middle" font-size="9.8" font-weight="700" fill="var(--text-secondary)">(Diinaktivasi surfaktan paru)</text>
          </g>

          <g class="osm-callout" style="--osm-i: 1;">
            <rect x="248" y="82" width="212" height="106" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-strong)" />
            <text x="354" y="103" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--text-primary)">Bakteremia / Endokarditis Kanan</text>
            <text x="354" y="125" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-primary)">Vankomisin / Daptomisin IV</text>
            <text x="354" y="150" text-anchor="middle" font-size="10.2" font-weight="700" fill="var(--text-muted)">Pantau AUC/MIC cegah nefrotoksik</text>
            <text x="354" y="168" text-anchor="middle" font-size="10.2" font-weight="700" fill="var(--text-muted)">(ganti pendekatan trough 15–20)</text>
          </g>
        </svg>
      `;
    }
    if (tab === "asb") {
      return `
        <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Decision Tree Bakteriuria Asimtomatik ASB">
          ${renderVizArrowDefs("asb-arr")}
          <rect x="70" y="12" width="340" height="34" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />
          <text x="240" y="33" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-primary)">Kultur Urin ≥10⁵ CFU/mL TANPA Gejala ISK (ASB)</text>
          <path class="osm-draw" pathLength="180" style="--osm-i: 0;" d="M160,46 C145,58 135,60 124,72" fill="none" stroke="var(--accent-primary)" stroke-width="1.8" marker-end="url(#asb-arr)" />
          <path class="osm-draw" pathLength="180" style="--osm-i: 0;" d="M320,46 C335,58 345,60 356,72" fill="none" stroke="var(--accent-coral)" stroke-width="1.8" marker-end="url(#asb-arr)" />

          <!-- Left: TREAT -->
          <g class="osm-callout" style="--osm-i: 1;">
            <rect x="16" y="76" width="214" height="114" rx="14" fill="var(--accent-primary-soft)" stroke="var(--accent-primary)" stroke-width="1.6" />
            <text x="123" y="97" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--accent-primary)">WAJIB TERAPI (Hanya 2)</text>
            <rect x="28" y="108" width="190" height="32" rx="9" fill="var(--bg-surface)" stroke="var(--accent-primary-border)" />
            <text x="123" y="128" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">1. Ibu Hamil (3–7 hari oral)</text>
            <rect x="28" y="146" width="190" height="34" rx="9" fill="var(--bg-surface)" stroke="var(--accent-primary-border)" />
            <text x="123" y="161" text-anchor="middle" font-size="10.2" font-weight="600" fill="var(--text-primary)">2. Pra-Urologi Trauma Mukosa</text>
            <text x="123" y="174" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-muted)">(misal TURP, Litotripsi)</text>
          </g>

          <!-- Right: DO NOT TREAT -->
          <g class="osm-callout" style="--osm-i: 2;">
            <rect x="250" y="76" width="214" height="114" rx="14" fill="var(--accent-coral-soft)" stroke="var(--accent-coral)" stroke-width="1.6" />
            <text x="357" y="97" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--accent-coral)">DILARANG ANTIBIOTIK</text>
            <text x="357" y="120" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">• Geriatri / Lansia</text>
            <text x="357" y="139" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">• Diabetes Melitus</text>
            <text x="357" y="158" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">• Kateter Foley Menetap</text>
            <text x="357" y="177" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-primary)">• Pra-Op Ortopedi / Non-Uro</text>
          </g>
        </svg>
      `;
    }

    const isEsbl = node === "esbl";
    const isKpc = node === "kpc";
    const isNdm = node === "ndm";

    return `
      <svg class="viz-svg" viewBox="0 0 480 202" role="img" aria-label="Algoritma Stewardship ESBL dan CRE KPC vs NDM">
        ${renderVizArrowDefs("amr-arr")}
        <!-- Root box on left -->
        <rect x="10" y="70" width="108" height="62" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="1.4" />
        <text x="64" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">Gram-Negatif</text>
        <text x="64" y="111" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-coral)">Resisten Berat</text>
        <text x="64" y="124" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-muted)">(Bakteremia/Sepsis)</text>

        <!-- Smooth Bezier Arrows to 3 branches -->
        <path class="${isEsbl ? "osm-axon-flow" : ""}" d="M118,88 C134,88 132,38 148,38" fill="none" stroke="${isEsbl ? "var(--accent-primary)" : "var(--text-muted)"}" stroke-width="${isEsbl ? "2" : "1.3"}" opacity="${isEsbl ? "1" : "0.4"}" marker-end="url(#amr-arr)" />
        <line class="${isKpc ? "osm-axon-flow" : ""}" x1="118" y1="101" x2="148" y2="101" stroke="${isKpc ? "var(--accent-secondary)" : "var(--text-muted)"}" stroke-width="${isKpc ? "2" : "1.3"}" opacity="${isKpc ? "1" : "0.4"}" marker-end="url(#amr-arr)" />
        <path class="${isNdm ? "osm-axon-flow" : ""}" d="M118,114 C134,114 132,164 148,164" fill="none" stroke="${isNdm ? "var(--accent-coral)" : "var(--text-muted)"}" stroke-width="${isNdm ? "2" : "1.3"}" opacity="${isNdm ? "1" : "0.4"}" marker-end="url(#amr-arr)" />

        <!-- Branch 1: ESBL -->
        <g opacity="${isEsbl ? "1" : "0.58"}">
          <rect class="viz-smooth-bar" x="152" y="14" width="128" height="48" rx="11" fill="${isEsbl ? "var(--accent-primary-soft)" : "var(--bg-surface-subtle)"}" stroke="${isEsbl ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${isEsbl ? "1.6" : "1"}" />
          <text x="216" y="34" text-anchor="middle" font-size="11" font-weight="700" fill="${isEsbl ? "var(--accent-primary)" : "var(--text-primary)"}">ESBL</text>
          <text x="216" y="50" text-anchor="middle" font-size="9.8" font-weight="600" fill="var(--text-muted)">Uji MERINO Trap</text>
          <line class="${isEsbl ? "osm-axon-flow" : ""}" x1="280" y1="38" x2="298" y2="38" stroke="${isEsbl ? "var(--accent-primary)" : "var(--text-muted)"}" stroke-width="${isEsbl ? "1.8" : "1.3"}" marker-end="url(#amr-arr)" />
          <rect class="viz-smooth-bar" x="302" y="14" width="168" height="48" rx="11" fill="${isEsbl ? "var(--accent-primary-soft)" : "var(--bg-surface)"}" stroke="${isEsbl ? "var(--accent-primary)" : "var(--border-subtle)"}" stroke-width="${isEsbl ? "1.6" : "1"}" />
          <text x="386" y="34" text-anchor="middle" font-size="10.8" font-weight="700" fill="var(--accent-primary)">Karbapenem (Meropenem)</text>
          <text x="386" y="50" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--accent-coral)">Hindari Pip-Tazo meski S!</text>
        </g>

        <!-- Branch 2: CRE KPC/OXA-48 -->
        <g opacity="${isKpc ? "1" : "0.58"}">
          <rect class="viz-smooth-bar" x="152" y="77" width="128" height="48" rx="11" fill="${isKpc ? "var(--accent-secondary-soft)" : "var(--bg-surface-subtle)"}" stroke="${isKpc ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${isKpc ? "1.6" : "1"}" />
          <text x="216" y="97" text-anchor="middle" font-size="11" font-weight="700" fill="${isKpc ? "var(--accent-secondary)" : "var(--text-primary)"}">CRE: KPC / OXA-48</text>
          <text x="216" y="113" text-anchor="middle" font-size="9.8" font-weight="600" fill="var(--text-muted)">Serin Karbapenemase</text>
          <line class="${isKpc ? "osm-axon-flow" : ""}" x1="280" y1="101" x2="298" y2="101" stroke="${isKpc ? "var(--accent-secondary)" : "var(--text-muted)"}" stroke-width="${isKpc ? "1.8" : "1.3"}" marker-end="url(#amr-arr)" />
          <rect class="viz-smooth-bar" x="302" y="77" width="168" height="48" rx="11" fill="${isKpc ? "var(--accent-secondary-soft)" : "var(--bg-surface)"}" stroke="${isKpc ? "var(--accent-secondary)" : "var(--border-subtle)"}" stroke-width="${isKpc ? "1.6" : "1"}" />
          <text x="386" y="97" text-anchor="middle" font-size="10.8" font-weight="700" fill="var(--accent-secondary)">Ceftazidime-avibactam</text>
          <text x="386" y="113" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-muted)">(atau Meropenem-vaborb.)</text>
        </g>

        <!-- Branch 3: CRE NDM/MBL -->
        <g opacity="${isNdm ? "1" : "0.58"}">
          <rect class="viz-smooth-bar" x="152" y="140" width="128" height="48" rx="11" fill="${isNdm ? "var(--accent-coral-soft)" : "var(--bg-surface-subtle)"}" stroke="${isNdm ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${isNdm ? "1.6" : "1"}" />
          <text x="216" y="160" text-anchor="middle" font-size="11" font-weight="700" fill="${isNdm ? "var(--accent-coral)" : "var(--text-primary)"}">CRE: NDM / VIM</text>
          <text x="216" y="176" text-anchor="middle" font-size="9.8" font-weight="600" fill="var(--text-muted)">Metallo-β-Lactamase</text>
          <line class="${isNdm ? "osm-axon-flow" : ""}" x1="280" y1="164" x2="298" y2="164" stroke="${isNdm ? "var(--accent-coral)" : "var(--text-muted)"}" stroke-width="${isNdm ? "1.8" : "1.3"}" marker-end="url(#amr-arr)" />
          <rect class="viz-smooth-bar" x="302" y="140" width="168" height="48" rx="11" fill="${isNdm ? "var(--accent-coral-soft)" : "var(--bg-surface)"}" stroke="${isNdm ? "var(--accent-coral)" : "var(--border-subtle)"}" stroke-width="${isNdm ? "1.6" : "1"}" />
          <text x="386" y="159" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-coral)">Ceftaz-Avibactam + Aztreonam</text>
          <text x="386" y="175" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-muted)">(atau Cefiderocol)</text>
        </g>
      </svg>
    `;
  }

  function renderAmrStewardshipWidget() {
    const tab = prior3VizState.amrTab;
    const node = prior3VizState.amrNode;
    const info = AMR_STEWARD_INFO[tab] || AMR_STEWARD_INFO.esbl_cre;

    return `
      <div class="viz-widget" id="viz-amr-card">
        <div class="viz-header">
          <span class="viz-title">Alur Stewardship MDR/XDR, MRSA &amp; ASB</span>
          <span class="viz-tag">IDSA AMR &amp; PAPDI</span>
        </div>
        <div class="viz-subtabs" id="viz-amr-tabs">
          <button type="button" class="viz-pill-btn ${tab === "esbl_cre" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz('esbl_cre', null)">1. ESBL &amp; CRE</button>
          <button type="button" class="viz-pill-btn ${tab === "mrsa_tdm" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz('mrsa_tdm', null)">2. MRSA &amp; TDM AUC/MIC</button>
          <button type="button" class="viz-pill-btn ${tab === "asb" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz('asb', null)">3. Aturan ASB (≥10⁵)</button>
        </div>
        <div class="viz-presets ${tab === "esbl_cre" ? "" : "hidden"}" id="viz-amr-nodes" style="margin-bottom:0.65rem;">
          <button type="button" class="viz-pill-btn ${node === "esbl" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz(null, 'esbl')">Fokus: ESBL (MERINO)</button>
          <button type="button" class="viz-pill-btn ${node === "kpc" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz(null, 'kpc')">Fokus: KPC / OXA-48</button>
          <button type="button" class="viz-pill-btn ${node === "ndm" ? "active" : ""}" onclick="window.InternaApp.updateAmrStewardshipViz(null, 'ndm')">Fokus: NDM (MBL)</button>
        </div>
        <div class="viz-svg-frame" id="viz-amr-frame">
          ${buildAmrStewardSvg(tab, node)}
        </div>
        <div id="viz-amr-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="amr-${tab}">
          ${formatVizReadoutHtml(info.title, info.col1Title, info.col1Html, info.col2Title, info.col2Html, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`)}
        </div>
      </div>
    `;
  }

  function updateAmrStewardshipViz(tabInput, nodeInput) {
    if (AMR_STEWARD_INFO[tabInput]) prior3VizState.amrTab = tabInput;
    if (nodeInput === "esbl" || nodeInput === "kpc" || nodeInput === "ndm") prior3VizState.amrNode = nodeInput;
    const tab = prior3VizState.amrTab;
    const node = prior3VizState.amrNode;

    syncVizPresets("viz-amr-tabs", [tab === "esbl_cre", tab === "mrsa_tdm", tab === "asb"]);
    syncVizPresets("viz-amr-nodes", [node === "esbl", node === "kpc", node === "ndm"]);
    const nodeWrap = document.getElementById("viz-amr-nodes");
    if (nodeWrap) nodeWrap.classList.toggle("hidden", tab !== "esbl_cre");

    swapVizSvgFrame("viz-amr-frame", buildAmrStewardSvg(tab, node));
    const info = AMR_STEWARD_INFO[tab] || AMR_STEWARD_INFO.esbl_cre;
    updateVizReadout("viz-amr-readout", info.tone, formatVizReadoutHtml(info.title, info.col1Title, info.col1Html, info.col2Title, info.col2Html, `<p class="mt-1.5"><strong>Jebakan Ujian Board:</strong> ${info.trap}</p>`), `amr-${tab}`);
  }


// 1. TROPIK-ABX-STEWARDSHIP-VIZ (Antibiotic Helper — Fixed & Interna Snack Styled)
// -------------------------------------------------------------------------
var ABX_BUGS = [
  ["mssa", "gp", "MSSA", "S. aureus sensitif metisilin", "Terapi pilihan: cefazolin atau anti-staphylococcal penicillin (nafcillin/oxacillin), lebih unggul daripada vancomycin untuk bakteremia MSSA."],
  ["mrsa", "gp", "MRSA", "S. aureus resisten metisilin", "Resistensi via mecA (PBP2a). Pilihan: vancomycin, daptomycin (bukan untuk pneumonia), linezolid, ceftaroline."],
  ["strep", "gp", "Strep spp.", "GAS, GBS, S. pneumoniae", "Umumnya sangat sensitif penicillin & cephalosporin. Resistensi makrolida meningkat."],
  ["efae", "gp", "E. faecalis", "Enterococcus faecalis", "Biasanya sensitif ampicillin. Sefalosporin tidak aktif klinis; aminoglikosida tidak dipakai sebagai monoterapi."],
  ["vre", "gp", "VRE", "Enterococcus resisten vancomycin", "Umumnya E. faecium, resisten ampicillin. Opsi: linezolid, daptomycin dosis tinggi."],
  ["ecoli", "gn", "E. coli (WT)", "E. coli & Klebsiella wild-type", "Patogen utama ISK & IAI. Resistensi FQ & TMP-SMX di banyak wilayah tinggi, cek antibiogram."],
  ["esbl", "gn", "ESBL", "Extended-spectrum beta-lactamase", "Menghidrolisis penisilin & sefalosporin gen 1-4. Karbapenem = pilihan utama (MERINO: pip-tazo inferior pada bakteremia)."],
  ["kpc", "gn", "CRE (KPC)", "Karbapenemase serin (KPC)", "Aktif: ceftazidime-avibactam, meropenem-vaborbactam, cefiderocol."],
  ["mbl", "gn", "CRE (MBL/NDM)", "Metallo-beta-lactamase", "Avibactam & vaborbactam TIDAK menghambat MBL. Pilihan: cefiderocol, aztreonam-avibactam, atau ceftazidime-avibactam + aztreonam."],
  ["paeru", "gn", "P. aeruginosa", "Pseudomonas aeruginosa", "Butuh beta-laktam antipseudomonas (pip-tazo, cefepime, ceftazidime, meropenem). Ceftriaxone & ertapenem TIDAK aktif."],
  ["abau", "gn", "A. baumannii", "Acinetobacter baumannii", "Sering MDR/CRAB. Sulbactam-durlobactam agen baru; sulbactam punya aktivitas intrinsik."],
  ["bfrag", "an", "B. fragilis", "Kelompok Bacteroides fragilis", "Anaerob usus utama. Metronidazole, amox-clav, pip-tazo, karbapenem. Resistensi klindamisin meningkat."],
  ["cdiff", "an", "C. difficile", "Clostridioides difficile", "Terapi: fidaxomicin atau vancomycin PO. Vancomycin IV tidak masuk lumen usus."],
  ["atyp", "at", "Atipikal", "Mycoplasma, Legionella, Chlamydophila", "Tanpa dinding sel -> beta-laktam tidak aktif. Gunakan makrolida, doksisiklin, atau FQ respirasi."]
].map(function(a) { return { id: a[0], cat: a[1], name: a[2], desc: a[3], notes: a[4] }; });

var ABX_BCAT = {
  gp: { n: "Gram-positif", color: "var(--viz-purple)" },
  gn: { n: "Gram-negatif", color: "var(--accent-coral)" },
  an: { n: "Anaerob", color: "var(--accent-secondary)" },
  at: { n: "Atipikal", color: "var(--accent-primary)" }
};

var ABX_DCAT = {
  pen: "Penisilin & Kombinasi",
  mono: "Monobaktam",
  ceph: "Sefalosporin",
  carba: "Karbapenem",
  novel: "BL/BLI Baru & Siderofor",
  fq: "Fluorokuinolon & Aminoglikosida",
  gpa: "Anti-MRSA / VRE",
  oth: "Kelas Lain",
  alt: "Oral / Alternatif / Last-Line"
};

var ABX_RAW = [
  "amox|pen|Amoxicillin|Aminopenisilin|Menghambat sintesis dinding sel; bakterisidal.|Bagus untuk Strep & E. faecalis. Tidak stabil terhadap beta-laktamase.|3 3 1 1 3 2 3 3 3 3 3 3 0 0",
  "amoxclav|pen|Amoxiclav|Penisilin + BLI|Aminopenisilin + clavulanate; bakterisidal.|Mencakup MSSA & anaerob. Andalan untuk gigitan, otitis/sinusitis, IAI ringan.|1 3 1 1 3 2 3 3 3 3 3 1 0 0",
  "ampsulb|pen|Ampicillin-sulbactam|Penisilin + BLI|Sulbactam punya aktivitas intrinsik terhadap Acinetobacter.|Aktivitas pada CRAB tergantung kerentanan isolat.|1 3 1 1 3 2 3 3 3 3 2 1 0 0",
  "piptazo|pen|Pip/Tazo|Antipseudomonal penisilin + BLI|Piperacillin + tazobactam; bakterisidal.|Empiris serbaguna: Pseudomonas + anaerob. Hindari untuk bakteremia ESBL (MERINO).|1 3 1 1 3 1 3 3 3 1 2 1 0 0",
  "aztreonam|mono|Aztreonam|Monobaktam antipseudomonal|Menghambat PBP3; bakterisidal.|Hanya Gram-negatif aerob termasuk Pseudomonas; aman pada alergi penisilin berat. Kebal MBL bila dipadukan avibactam.|0 0 0 0 0 1 3 3 3 1 2 3 0 0",
  "cefazolin|ceph|Cefazolin (gen 1)|Sefalosporin gen 1|Menghambat sintesis dinding sel; bakterisidal.|Pilihan utama bakteremia MSSA & profilaksis bedah. Tidak aktif Enterococcus & anaerob.|1 3 1 3 3 1 3 3 3 3 3 3 0 0",
  "cefuroxime|ceph|Cefuroxime (gen 2)|Sefalosporin gen 2|Menghambat sintesis dinding sel; bakterisidal.|Gram-negatif lebih luas dari gen 1; dipakai pada respirasi & jaringan lunak.|1 3 1 3 3 2 3 3 3 3 3 3 0 0",
  "ceftriaxone|ceph|Ceftriaxone (gen 3)|Sefalosporin gen 3|Menghambat sintesis dinding sel; bakterisidal.|Penetrasi SSP baik. TIDAK mencakup Pseudomonas/Enterococcus/anaerob.|1 3 1 3 3 1 3 3 3 3 3 3 0 0",
  "cefotaxime|ceph|Cefotaxime (gen 3)|Sefalosporin gen 3|Menghambat sintesis dinding sel; bakterisidal.|Spektrum setara ceftriaxone; aman untuk neonatus & SBP.|1 3 1 3 3 1 3 3 3 3 3 3 0 0",
  "ceftazidime|ceph|Ceftazidime (gen 3)|Sefalosporin antipseudomonal|Menghambat sintesis dinding sel; bakterisidal.|Antipseudomonas, namun lemah terhadap Gram-positif (MSSA/Strep).|3 3 2 3 3 1 3 3 3 1 2 3 0 0",
  "cefepime|ceph|Cefepime (gen 4)|Sefalosporin gen 4|Menghambat sintesis dinding sel; bakterisidal.|Gram-negatif luas termasuk Pseudomonas. Tidak dianjurkan untuk ESBL; waspada neurotoksisitas pada CKD.|1 3 1 3 3 1 3 3 3 1 2 3 0 0",
  "ceftaroline|ceph|Ceftaroline (gen 5)|Sefalosporin anti-MRSA|Berikatan dengan PBP2a; bakterisidal.|Mencakup MRSA, tetapi tidak andal untuk Enterococcus/Pseudomonas/ESBL.|1 1 1 3 3 1 3 3 3 3 3 3 0 0",
  "ertapenem|carba|Ertapenem|Karbapenem (tanpa APE)|Stabil terhadap ESBL; bakterisidal.|TIDAK mencakup Pseudomonas, Acinetobacter, Enterococcus (APE). Sekali sehari.|1 3 1 3 3 1 1 3 3 3 3 1 0 0",
  "meropenem|carba|Meropenem|Karbapenem|Stabil terhadap ESBL; bakterisidal.|Pilihan utama bakteremia ESBL. Pseudomonas baik; risiko kejang lebih rendah vs imipenem.|1 3 1 3 3 1 1 3 3 1 2 1 0 0",
  "ceftazavi|novel|Ceftazidime-avibactam|BL/BLI baru|Avibactam menghambat KPC, AmpC, OXA-48.|Kunci untuk CRE-KPC. Untuk MBL wajib kombinasi + aztreonam.|2 3 2 3 3 1 1 1 3 1 3 3 0 0",
  "aztreavi|novel|Aztreonam-avibactam|Monobaktam + BLI baru|Aztreonam PBP3 + avibactam hambat kelas A/C/D.|Pilihan IDSA untuk Enterobacterales penghasil NDM/MBL.|0 0 0 0 0 2 2 2 1 3 3 3 0 0",
  "merovabor|novel|Meropenem-vaborbactam|BL/BLI baru|Vaborbactam menghambat KPC.|Poten untuk KPC-CRE. Tidak aktif untuk OXA-48/MBL.|2 3 2 3 3 1 1 1 3 2 3 1 0 0",
  "cefiderocol|novel|Cefiderocol|Sefalosporin siderofor|Masuk via transporter besi, hambat PBP3.|Aktif untuk semua kelas CRE (termasuk MBL), Pseudomonas, Acinetobacter.|3 3 3 3 3 1 1 1 1 1 1 3 0 0",
  "sulbadurlo|novel|Sulbactam-durlobactam|BL/BLI (Acinetobacter)|Durlobactam melindungi sulbactam dari OXA.|Khusus Acinetobacter baumannii (CRAB) bersama karbapenem.|0 0 0 0 0 0 0 0 0 0 1 0 0 0",
  "cipro|fq|Ciprofloxacin|Fluorokuinolon|Menghambat DNA gyrase; bakterisidal.|Oral antipseudomonas terbaik. Risiko C. difficile, tendinopati, QT.|2 3 3 3 3 2 3 3 3 1 2 3 0 2",
  "levo|fq|Levofloxacin|FQ Respirasi|Menghambat gyrase & topoisomerase IV; bakterisidal.|FQ respirasi dengan cakupan Pseudomonas; bioavailabilitas oral ~100%.|2 3 1 3 3 2 3 3 3 1 2 3 0 1",
  "moxi|fq|Moxifloxacin|FQ Respirasi|Menghambat gyrase & topoisomerase IV; bakterisidal.|Cakupan anaerob parsial, TIDAK Pseudomonas. JANGAN untuk ISK (kadar urin rendah).|2 3 1 3 3 2 3 3 3 3 3 2 0 1",
  "gentamicin|fq|Gentamicin|Aminoglikosida|Mengikat 30S; bakterisidal.|Sinergi beta-laktam (endokarditis). Nefro/ototoksik; penetrasi paru/SSP buruk.|2 2 2 2 3 1 2 2 2 1 2 3 0 0",
  "amikacin|fq|Amikacin|Aminoglikosida|Mengikat 30S; bakterisidal.|Stabil terhadap enzim modifikasi; berguna untuk MDR GNB terutama ISK.|1 2 3 2 3 1 1 2 2 1 2 3 0 0",
  "vancomycin|gpa|Vancomycin|Glikopeptida|Berikatan dengan D-ala-D-ala; bakterisidal.|Standar MRSA. PO hanya untuk C. difficile. Pantau AUC24/MIC 400-600.|1 1 1 1 3 0 0 0 0 0 0 3 1 0",
  "daptomycin|gpa|Daptomycin|Lipopeptida|Depolarisasi membran sel; bakterisidal cepat.|Aktif MRSA/VRE. JANGAN untuk pneumonia (diinaktivasi surfaktan paru). Pantau CK.|1 1 1 1 1 0 0 0 0 0 0 3 0 0",
  "linezolid|gpa|Linezolid|Oksazolidinon|Menghambat ribosom 50S; bakteriostatik.|Aktif MRSA/VRE; penetrasi paru unggul. Waspada trombositopenia (>14 hr) & serotonin.|1 1 1 1 1 0 0 0 0 0 0 3 0 0",
  "metronidazole|oth|Metronidazole|Nitroimidazol|Merusak DNA anaerob; bakterisidal.|Standar emas anaerob di bawah diafragma. Bukan lini 1 C. difficile.|0 0 0 0 0 0 0 0 0 0 0 1 2 0",
  "azithromycin|oth|Azithromycin|Makrolida|Menghambat ribosom 50S; bakteriostatik.|Pilihan atipikal. Perhatikan pemanjangan interval QT.|2 3 2 3 3 3 3 3 3 3 3 3 0 1",
  "doxycycline|oth|Doxycycline|Tetrasiklin|Menghambat ribosom 30S; bakteriostatik.|Atipikal, rickettsia, leptospirosis, CA-MRSA SSTI.|2 2 2 3 3 3 3 3 3 3 3 3 0 1",
  "clindamycin|oth|Clindamycin|Linkosamid|Menghambat ribosom 50S; bakteriostatik.|Anti-toksin (TSS, nekrotikans). Risiko C. difficile tertinggi.|2 2 2 3 3 3 3 3 3 3 3 2 3 3",
  "tmpsmx|oth|TMP-SMX|Antagonis folat|Blokade folat berurutan; bergantung organisme.|Baik untuk CA-MRSA, PJP, Stenotrophomonas, ISK. Hindari pada selulitis non-purulen.|1 1 3 3 3 2 2 3 3 3 2 3 0 0",
  "nitrofurantoin|alt|Nitrofurantoin|ISK bawah (oral)|Metabolit reaktif merusak DNA; bakterisidal di urin.|HANYA sistitis tanpa komplikasi. Hindari bila CrCl <30 & pielonefritis.|0 0 0 1 2 1 1 2 2 3 3 0 0 0",
  "fosfomycin|alt|Fosfomycin|Epoksida (PO & IV)|Menghambat MurA sintesis dinding sel; bakterisidal.|PO 3 g dosis tunggal sistitis. IV untuk cUTI/pielonefritis sensitif.|0 0 0 1 2 1 1 2 2 3 3 0 0 0",
  "colistin|alt|Colistin|Polimiksin (last-line)|Mengganggu membran luar Gram-negatif; bakterisidal.|Opsi terakhir CRE/CRAB. Nefro/neurotoksik tinggi; wajib loading dose.|0 0 0 0 0 1 1 2 2 2 2 0 0 0",
  "tigecycline|alt|Tigecycline|Glisilsiklin|Menghambat ribosom 30S; bakteriostatik.|Kadar serum/urin rendah: JANGAN untuk bakteremia/ISK. Tidak untuk Pseudomonas.|1 1 1 1 1 1 1 2 2 3 2 1 0 1",
  "fidaxomicin|alt|Fidaxomicin (PO)|Makrosiklik lokal|Menghambat RNA polimerase; bakterisidal C. diff.|Lini 1 CDI (rekurensi lebih rendah vs vancomycin PO).|0 0 0 0 0 0 0 0 0 0 0 0 1 0"
];

var ABX_DRUGS = ABX_RAW.map(function(l) {
  var p = l.split("|");
  return { id: p[0], cat: p[1], name: p[2], cls: p[3], moa: p[4], notes: p[5], row: p[6].trim().split(/\s+/).map(Number) };
});

var ABX_M = {};
ABX_DRUGS.forEach(function(d) {
  ABX_M[d.id] = {};
  ABX_BUGS.forEach(function(b, i) { ABX_M[d.id][b.id] = d.row[i]; });
});

var ABX_INFS = [
  "cap|resp|Pneumonia (CAP)|Community-acquired pneumonia|Empiris mencakup S. pneumoniae & atipikal: beta-laktam + makrolida ATAU FQ respirasi.|strep:3 atyp:3 mssa:1 mrsa:1",
  "vap|resp|Pneumonia (HAP/VAP)|Hospital / ventilator-associated|Risiko MDR tinggi (MRSA, Pseudomonas, Acinetobacter). Daptomycin KONTRAINDIKASI untuk paru!|mrsa:3 mssa:2 ecoli:2 esbl:2 kpc:1 mbl:1 paeru:3 abau:2 strep:1",
  "cystitis|urin|ISK Tanpa Komplikasi|Sistitis pada pasien sehat|Didominasi E. coli. Pilihan: nitrofurantoin, fosfomycin, TMP-SMX.|ecoli:3 efae:1 esbl:1",
  "cauti|urin|ISK Komplikata / CAUTI|Kateter atau kelainan anatomi|Spektrum lebih luas; levo/cipro kadar urin tinggi (Moxi TIDAK untuk ISK).|ecoli:3 esbl:3 kpc:1 mbl:1 paeru:2 abau:1 efae:3 vre:2 mssa:1 mrsa:1",
  "iai|gi|Intra-abdominal (IAI)|Peritonitis, apendisitis, kolesistitis|Polimikroba: wajib Gram-negatif enterik + anaerob + source control.|ecoli:3 esbl:2 kpc:1 paeru:1 efae:2 vre:1 bfrag:3 strep:1",
  "sbp|gi|Spontaneous Bacterial Peritonitis|Asites pada sirosis|Ceftriaxone/cefotaxime (komunitas) + Albumin IV hari 1 & 3; karbapenem bila nosokomial.|ecoli:3 strep:2 esbl:2 efae:1 paeru:1",
  "cdi|gi|Kolitis C. difficile|Diare toksin pasca-antibiotik|Fidaxomicin atau vancomycin PO; hentikan antibiotik pencetus.|cdiff:3",
  "cellulitis|ssti|Selulitis / Erisipelas|Infeksi kulit non-purulen|Didominasi Strep beta-hemolitik & MSSA. Anti-MRSA hanya bila purulen/risiko.|strep:3 mssa:3 mrsa:2",
  "diabetic|ssti|Infeksi Kaki Diabetik|Ulkus dalam / kronis|Polimikroba termasuk anaerob; pertimbangkan Pseudomonas bila maserasi.|mssa:3 mrsa:2 strep:3 efae:2 vre:1 ecoli:2 esbl:1 paeru:1 bfrag:2",
  "meningitis|ssti|Meningitis Bakterial|Infeksi SSP komunitas|Penetrasi BBB (ceftriaxone/meropenem dosis tinggi) + vancomycin (+ ampicillin >50 th/imunokompromais).|strep:3 ecoli:1",
  "fn|host|Febrile Neutropenia|Neutropenia pasca-kemoterapi|Segera (<60 mnt) beta-laktam antipseudomonas (cefepime, pip-tazo, meropenem).|paeru:3 ecoli:3 esbl:2 kpc:1 mssa:2 mrsa:1 strep:2 efae:1 vre:1"
].map(function(l) {
  var p = l.split("|");
  var w = {};
  p[5].trim().split(/\s+/).forEach(function(x) { var kv = x.split(":"); w[kv[0]] = Number(kv[1]); });
  return { id: p[0], cat: p[1], name: p[2], desc: p[3], notes: p[4], w: w };
});

var ABX_NOTES = {
  "piptazo|esbl": "MERINO trial: pip-tazo inferior vs meropenem pada bakteremia ESBL (mortalitas 30 hari lebih tinggi).",
  "cefepime|esbl": "Cefepime tidak dianjurkan untuk ESBL (efek inokulum), gunakan karbapenem.",
  "ertapenem|paeru": "Ertapenem tidak memiliki aktivitas anti-Pseudomonas (APE).",
  "ertapenem|abau": "Ertapenem tidak memiliki aktivitas anti-Acinetobacter (APE).",
  "ertapenem|efae": "Ertapenem tidak memiliki aktivitas anti-Enterococcus (APE).",
  "ceftriaxone|efae": "Enterococcus resisten intrinsik terhadap seluruh sefalosporin standar.",
  "ceftriaxone|paeru": "Ceftriaxone tidak aktif terhadap Pseudomonas aeruginosa.",
  "daptomycin|mrsa": "Aktif untuk bakteremia/endokarditis MRSA, tetapi KONTRAINDIKASI untuk pneumonia (inaktivasi surfaktan).",
  "ceftazavi|mbl": "Avibactam tidak menghambat MBL. Wajib padukan ceftazidime-avibactam + aztreonam atau cefiderocol.",
  "merovabor|mbl": "Vaborbactam tidak menghambat MBL maupun OXA-48.",
  "moxi|paeru": "Moxifloxacin tidak aktif terhadap Pseudomonas dan kadar urin rendah (jangan untuk ISK).",
  "tmpsmx|strep": "TMP-SMX tidak andal untuk Streptococcus beta-hemolitik pada selulitis non-purulen.",
  "vancomycin|cdiff": "Hanya rute PO; Vancomycin IV tidak mencapai lumen kolon.",
  "metronidazole|cdiff": "Bukan lagi lini pertama CDI; hanya alternatif non-berat bila fidaxomicin/vancomycin PO tak tersedia."
};

var ABX_ADM = {
  amox: ["PO", "500 mg q8h (1 g q8h dosis tinggi)", "Time (fT>MIC)", "Intermiten"],
  amoxclav: ["PO / IV", "PO 625 mg q8h; IV 1.2 g q8h", "Time (fT>MIC)", "Intermiten"],
  ampsulb: ["IV / IM", "3 g q6h (CRAB: sulbactam 6-9 g/hr)", "Time (fT>MIC)", "Extended (CRAB)"],
  piptazo: ["IV", "4.5 g q6h atau load 4.5 g -> 4.5 g infus 4j q8h", "Time (fT>MIC)", "Extended Infusion"],
  aztreonam: ["IV / IM", "1-2 g q8h (Pseudomonas 2 g q6-8h)", "Time (fT>MIC)", "Intermiten"],
  cefazolin: ["IV", "2 g q8h (bakteremia MSSA)", "Time (fT>MIC)", "Intermiten"],
  cefuroxime: ["PO / IV", "IV 1.5 g q8h; PO 500 mg q12h", "Time (fT>MIC)", "Intermiten"],
  ceftriaxone: ["IV / IM", "1-2 g q24h (meningitis 2 g q12h)", "Time (fT>MIC)", "Intermiten"],
  cefotaxime: ["IV", "1-2 g q6-8h (meningitis 2 g q4-6h)", "Time (fT>MIC)", "Intermiten"],
  ceftazidime: ["IV", "2 g q8h (infus 3-4j untuk Pseudomonas)", "Time (fT>MIC)", "Extended Infusion"],
  cefepime: ["IV", "2 g q8h (load 30m -> infus 3-4j)", "Time (fT>MIC)", "Extended Infusion"],
  ceftaroline: ["IV", "600 mg q12h (q8h MIC tinggi)", "Time (fT>MIC)", "Intermiten"],
  ertapenem: ["IV / IM", "1 g q24h", "Time (fT>MIC)", "Intermiten (OPAT)"],
  meropenem: ["IV", "1 g q8h (2 g q8h SSP/MDR, infus 3j)", "Time (fT>MIC)", "Extended Infusion"],
  ceftazavi: ["IV", "2.5 g q8h infus 2j (+ aztreonam 2 g q8h MBL)", "Time (fT>MIC)", "Infus 2 Jam (Label)"],
  aztreavi: ["IV", "Load 2.67 g -> 2 g q6h infus 3j", "Time (fT>MIC)", "Infus 3 Jam (Label)"],
  merovabor: ["IV", "4 g q8h infus 3j", "Time (fT>MIC)", "Infus 3 Jam (Label)"],
  cefiderocol: ["IV", "2 g q8h infus 3j (CrCl >=120: q6h)", "Time (fT>MIC)", "Infus 3 Jam (Label)"],
  sulbadurlo: ["IV", "1 g / 1 g q6h infus 3j (+ karbapenem)", "Time (fT>MIC)", "Infus 3 Jam (Label)"],
  cipro: ["PO / IV", "PO 500-750 mg q12h; IV 400 mg q8-12h", "Conc (AUC/MIC)", "Dosis Tinggi"],
  levo: ["PO / IV", "750 mg q24h (CAP/Pseudomonas)", "Conc (AUC/MIC)", "Sekali Sehari"],
  moxi: ["PO / IV", "400 mg q24h (bukan ISK)", "Conc (AUC/MIC)", "Sekali Sehari"],
  gentamicin: ["IV / IM", "5-7 mg/kg q24h (sinergi 1 mg/kg q8h)", "Conc (Cmax/MIC)", "Extended-Interval"],
  amikacin: ["IV / IM", "15-20 mg/kg q24h (pakai AdjBW obesitas)", "Conc (Cmax/MIC)", "Extended-Interval"],
  vancomycin: ["IV (PO CDI)", "Load 20-35 mg/kg -> 15-20 mg/kg q8-12h; CDI 125 mg PO q6h", "AUC24/MIC 400-600", "Dipandu AUC/TDM"],
  daptomycin: ["IV", "6-10 mg/kg q24h (VRE 10-12 mg/kg)", "Conc (Cmax/MIC)", "Sekali Sehari"],
  linezolid: ["PO / IV", "600 mg q12h (PO = IV)", "AUC/MIC 80-120", "Intermiten"],
  metronidazole: ["PO / IV", "500 mg q8h", "Conc-dependent", "Intermiten"],
  azithromycin: ["PO / IV", "500 mg q24h", "AUC/MIC", "Sekali Sehari"],
  doxycycline: ["PO / IV", "100 mg q12h (load 200 mg hr 1)", "AUC/MIC", "Intermiten"],
  clindamycin: ["PO / IV", "IV 600 mg q8h; PO 300-450 mg q6-8h", "AUC/MIC", "Intermiten"],
  tmpsmx: ["PO / IV", "160/800 mg q12h; PJP 15-20 mg/kg/hr TMP", "AUC/MIC", "Intermiten"],
  nitrofurantoin: ["PO", "100 mg makrokristal q12h x 5 hr", "Lokal Urin", "Sistitis Saja"],
  fosfomycin: ["PO / IV", "PO 3 g tunggal; IV 6 g q8h (cUTI)", "AUC/MIC", "Dosis Tunggal PO"],
  colistin: ["IV", "Load 9 MU (300 mg CBA) -> ~4.5 MU q12h", "AUC/MIC", "Wajib Loading Dose"],
  tigecycline: ["IV", "Load 100 mg -> 50 mg q12h", "AUC/MIC", "Intermiten"],
  fidaxomicin: ["PO", "200 mg q12h x 10 hr", "Lokal Lumen", "CDI Lini 1"]
};

// Renal bands: [type, base, [[minCrCl_exclusive_or_inclusive_thr, label, dose], ...], hdNote]
// Note: evaluated without upward rounding (exact CrCl >= thr) so e.g. 29.6 does NOT falsely pass >=30!
var ABX_RDOSE = {
  amox: ["a", "500 mg PO q8h", [[30, ">=30", "Dosis standar"], [10, "10-29", "500 mg q12h"], [0, "<10", "500 mg q24h"]], "500 mg q24h, beri setelah HD"],
  amoxclav: ["a", "875/125 mg q12h atau 500/125 mg q8h", [[30, ">=30", "Dosis standar"], [10, "10-29", "500/125 mg q12h (hindari 875 mg)"], [0, "<10", "500/125 mg q24h"]], "500/125 mg q24h setelah HD"],
  ampsulb: ["a", "3 g IV q6h", [[30, ">=30", "Dosis standar"], [15, "15-29", "3 g q12h"], [0, "<15", "3 g q24h"]], "3 g q24h setelah HD"],
  piptazo: ["a", "4.5 g q6h (HAP) / 3.375 g q6h", [[40.01, ">40", "Dosis standar"], [20, "20-40", "2.25 g q6h (umum) / 3.375 g q6h (HAP)"], [0, "<20", "2.25 g q8h (umum) / 2.25 g q6h (HAP)"]], "2.25 g q12h + 0.75 g pasca-HD"],
  aztreonam: ["a", "2 g IV q6-8h", [[30, ">=30", "Dosis standar"], [10, "10-29", "1-2 g q12h"], [0, "<10", "1-2 g q24h"]], "0.5-1 g q24h setelah HD"],
  cefazolin: ["a", "2 g IV q8h", [[30, ">=30", "Dosis standar"], [10, "10-29", "2 g q12h"], [0, "<10", "1 g q24h"]], "1 g q24h setelah HD"],
  cefuroxime: ["a", "1.5 g IV q8h", [[20.01, ">20", "Dosis standar"], [10, "10-20", "1.5 g q12h"], [0, "<10", "1.5 g q24h"]], "1.5 g q24h setelah HD"],
  ceftriaxone: ["n", "2 g IV q24h", [[0, "Semua CrCl", "Tanpa penyesuaian ginjal (maks 2 g/hr bila gagal ginjal+hati)"]], "Tanpa penyesuaian"],
  cefotaxime: ["a", "2 g IV q8h", [[20, ">=20", "Dosis standar"], [0, "<20", "Kurangi dosis 50%"]], "Kurangi 50%, beri setelah HD"],
  ceftazidime: ["a", "2 g IV q8h", [[50.01, ">50", "Dosis standar"], [31, "31-50", "2 g q12h"], [16, "16-30", "2 g q24h"], [0, "<=15", "1 g q24h"]], "1 g q24h setelah HD"],
  cefepime: ["a", "2 g IV q8h", [[60.01, ">60", "Dosis standar"], [30, "30-60", "2 g q12h"], [11, "11-29", "2 g q24h"], [0, "<=10", "1 g q24h (waspada neurotoksik!)"]], "1 g q24h setelah HD"],
  ceftaroline: ["a", "600 mg IV q12h", [[50.01, ">50", "Dosis standar"], [31, "31-50", "400 mg q12h"], [15, "15-30", "300 mg q12h"], [0, "<15", "200 mg q12h"]], "200 mg q12h setelah HD"],
  ertapenem: ["a", "1 g IV q24h", [[30.01, ">30", "Dosis standar"], [0, "<=30", "500 mg q24h"]], "500 mg q24h setelah HD"],
  meropenem: ["a", "1 g IV q8h", [[50.01, ">50", "Dosis standar"], [26, "26-50", "1 g q12h"], [10, "10-25", "500 mg q12h"], [0, "<10", "500 mg q24h"]], "500 mg q24h setelah HD"],
  ceftazavi: ["a", "2.5 g IV q8h", [[50.01, ">50", "Dosis standar"], [31, "31-50", "1.25 g q8h"], [16, "16-30", "0.94 g q12h"], [6, "6-15", "0.94 g q24h"], [0, "<=5", "0.94 g q48h"]], "0.94 g q24h setelah HD"],
  aztreavi: ["a", "Load 2.67 g -> 2 g q6h", [[50.01, ">50", "Load 2.67 g -> 2 g q6h"], [31, "31-50", "Load 2.67 g -> 1 g q6h"], [16, "16-30", "Load 1.8 g -> 0.9 g q8h"], [0, "<=15", "Load 1.33 g -> 0.9 g q12h"]], "Seperti <=15, beri setelah HD"],
  merovabor: ["a", "4 g IV q8h", [[50, "eGFR >=50", "Dosis standar"], [30, "eGFR 30-49", "2 g q8h"], [15, "eGFR 15-29", "2 g q12h"], [0, "eGFR <15", "1 g q12h"]], "1 g q12h setelah HD (berbasis eGFR)"],
  cefiderocol: ["a", "2 g IV q8h (infus 3j)", [[120, ">=120 (ARC)", "2 g q6h"], [60, "60-119", "2 g q8h"], [30, "30-59", "1.5 g q8h"], [15, "15-29", "1 g q8h"], [0, "<15", "750 mg q12h"]], "750 mg q12h segera setelah HD"],
  sulbadurlo: ["c", "1 g/1 g IV q6h", [[0, "Semua CrCl", "Ikuti label/apoteker klinis (data terbatas CrCl <45)"]], "Konsultasi apoteker/ID"],
  cipro: ["a", "400 mg IV q8-12h / 500-750 mg PO q12h", [[30, ">=30", "Dosis standar"], [0, "<30", "400 mg IV q24h atau 500 mg PO q24h"]], "Seperti <30 setelah HD"],
  levo: ["a", "750 mg q24h", [[50, ">=50", "Dosis standar"], [20, "20-49", "750 mg q48h"], [0, "<20", "750 mg awal, lalu 500 mg q48h"]], "750 mg awal, lalu 500 mg q48h"],
  moxi: ["n", "400 mg q24h", [[0, "Semua CrCl", "Tanpa penyesuaian ginjal (bukan untuk ISK)"]], "Tanpa penyesuaian"],
  gentamicin: ["t", "7 mg/kg (AdjBW) q24h", [[60, ">=60", "q24h"], [40, "40-59", "q36h"], [20, "20-39", "q48h"], [0, "<20", "Dosis awal -> ulang berdasar kadar"]], "1-2 mg/kg pasca-HD berdasar kadar"],
  amikacin: ["t", "15 mg/kg (AdjBW) q24h", [[90.01, ">90", "15 mg/kg q24h"], [50, "50-90", "12-15 mg/kg q24h"], [30, "30-49", "7.5 mg/kg q24h atau 15 mg/kg q48h"], [10, "10-29", "5 mg/kg q24h atau 10 mg/kg q48h"], [0, "<10", "7.5 mg/kg q48h (sesuai kadar)"]], "10 mg/kg awal, 5 mg/kg pasca-HD"],
  vancomycin: ["t", "Load 20-35 mg/kg -> AUC 400-600", [[0, "Semua CrCl", "Dosis awal penuh; rumatan dipandu AUC/kadar (hindari + pip-tazo)"]], "Ulang berdasar kadar pre-HD"],
  daptomycin: ["a", "6-8 mg/kg IV q24h", [[30, ">=30", "Dosis standar"], [0, "<30", "Dosis sama q48h"]], "Dosis sama q48h setelah HD"],
  linezolid: ["n", "600 mg q12h", [[0, "Semua CrCl", "Tanpa penyesuaian (awas trombositopenia pada CKD)"]], "Tanpa penyesuaian"],
  metronidazole: ["n", "500 mg q8h", [[0, "Semua CrCl", "Tanpa penyesuaian (metabolit menumpuk di ESRD)"]], "Beri setelah HD"],
  azithromycin: ["n", "500 mg q24h", [[0, "Semua CrCl", "Tanpa penyesuaian (hati-hati bila CrCl <10)"]], "Tanpa penyesuaian"],
  doxycycline: ["n", "100 mg q12h", [[0, "Semua CrCl", "Tanpa penyesuaian ginjal"]], "Tanpa penyesuaian"],
  clindamycin: ["n", "600 mg IV q8h", [[0, "Semua CrCl", "Tanpa penyesuaian ginjal"]], "Tanpa penyesuaian"],
  tmpsmx: ["a", "160/800 mg q12h", [[30, ">=30", "Dosis standar"], [15, "15-29", "Kurangi dosis 50%"], [0, "<15", "HINDARI (tidak direkomendasikan)"]], "Umumnya HINDARI"],
  nitrofurantoin: ["a", "100 mg PO q12h", [[30, ">=30", "Dosis standar (efikasi turun di 30-45)"], [0, "<30", "HINDARI (kadar urin tak adekuat & toksisitas)"]], "HINDARI"],
  fosfomycin: ["a", "PO 3 g tunggal / IV 6 g q8h", [[50.01, ">50", "IV 6 g q8h (PO tunggal tetap aman)"], [41, "41-50", "IV 4 g q8h"], [31, "31-40", "IV 3 g q8h"], [21, "21-30", "IV 5 g q24h"], [11, "11-20", "IV 3 g q24h"], [0, "<=10", "Konsultasi farmasi/ID"]], "Beri setelah HD"],
  colistin: ["c", "Load 300 mg CBA -> rumatan 12j kemudian", [[90, ">=90", "180 mg CBA q12h"], [60, "60-89", "135-170 mg CBA q12h"], [30, "30-59", "95-120 mg CBA q12h"], [10, "10-29", "80-90 mg CBA q12h"], [0, "<10", "65-75 mg CBA q12h"]], "130 mg/hr + 50 mg hari HD"],
  tigecycline: ["n", "100 mg load -> 50 mg q12h", [[0, "Semua CrCl", "Tanpa penyesuaian ginjal (sesuaikan gagal hati berat)"]], "Tanpa penyesuaian"],
  fidaxomicin: ["n", "200 mg PO q12h", [[0, "Semua CrCl", "Tanpa penyesuaian (aksi lokal lumen usus)"]], "Tanpa penyesuaian"]
};

var tropikAbxState = {
  activeTab: "spectrum", // "spectrum" | "builder" | "compare" | "renal"
  bugCatFilter: "all", // "all" | "gp" | "gn" | "an" | "at"
  drugSearch: "",
  selectedDrug: "piptazo",
  selectedBug: "esbl",
  builderInf: "cap",
  builderDrugs: ["ceftriaxone", "azithromycin"],
  compareDrugs: ["piptazo", "cefepime", "meropenem"],
  compareOnlyDiff: false,
  renalAge: 60,
  renalSex: "m",
  renalWt: 65,
  renalHt: 165,
  renalScr: 1.5,
  renalUnit: "mg",
  renalBasis: "auto",
  renalRrt: "none",
  renalAki: false,
  renalMuscle: false,
  renalFilter: "adj",
  renalSearch: ""
};

function calcAbxRenalMetrics() {
  var age = clampNum(tropikAbxState.renalAge, 18, 120, 60);
  var sex = tropikAbxState.renalSex === "f" ? "f" : "m";
  var wt = clampNum(tropikAbxState.renalWt, 25, 250, 65);
  var ht = clampNum(tropikAbxState.renalHt, 120, 230, 165);
  var rawScr = clampNum(tropikAbxState.renalScr, 0.2, 2000, 1.5);
  var scr = tropikAbxState.renalUnit === "umol" ? rawScr / 88.4 : rawScr;
  if (scr <= 0.1) scr = 0.2;

  var inch = Math.max(ht / 2.54 - 60, 0);
  var ibw = (sex === "m" ? 50 : 45.5) + 2.3 * inch;
  var adj = ibw + 0.4 * (wt - ibw);
  var basis = tropikAbxState.renalBasis;
  if (basis === "auto") basis = wt < ibw ? "act" : (wt > 1.2 * ibw ? "adj" : "ibw");
  var w = basis === "act" ? wt : (basis === "adj" ? adj : ibw);
  var crcl = ((140 - age) * w * (sex === "f" ? 0.85 : 1)) / (72 * scr);
  var k = sex === "f" ? 0.7 : 0.9;
  var a = sex === "f" ? -0.241 : -0.302;
  var egfr = 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(0.9938, age) * (sex === "f" ? 1.012 : 1);
  var bsa = Math.sqrt((ht * wt) / 3600);
  var egfrAbs = (egfr * bsa) / 1.73;
  return { age: age, sex: sex, wt: wt, ht: ht, scr: scr, ibw: ibw, adj: adj, w: w, basis: basis, crcl: crcl, egfr: egfr, bsa: bsa, egfrAbs: egfrAbs };
}

function getAbxRenalDose(drugId, metrics) {
  var rd = ABX_RDOSE[drugId];
  if (!rd || !metrics) return null;
  var type = rd[0], base = rd[1], bands = rd[2], hd = rd[3];
  var rrt = tropikAbxState.renalRrt;
  if (rrt === "crrt") return { type: "c", base: base, band: "CRRT/SLED", dose: "Ikuti protokol CRRT/SLED institusi", isAdj: true };
  if (rrt === "hd" && hd) return { type: type, base: base, band: "Hemodialisis", dose: hd, isAdj: type === "a" || type === "c" };
  var valToUse = drugId === "merovabor" ? metrics.egfr : metrics.crcl;
  if (rrt === "pd") {
    var lastB = bands[bands.length - 1];
    return { type: type, base: base, band: "PD (" + lastB[1] + ")", dose: lastB[2], isAdj: type === "a" };
  }
  var chosenIdx = bands.length - 1;
  for (var i = 0; i < bands.length; i++) {
    if (valToUse >= bands[i][0]) { chosenIdx = i; break; }
  }
  var b = bands[chosenIdx];
  return { type: type, base: base, band: b[1], dose: b[2], isAdj: chosenIdx > 0 && type === "a" };
}

function calcAbxEmpiricCoverage(infId, drugIds) {
  var inf = ABX_INFS.find(function(x) { return x.id === infId; }) || ABX_INFS[0];
  var tot = 0, got = 0;
  var rows = Object.keys(inf.w).map(function(k) { return [k, inf.w[k]]; }).sort(function(a, b) { return b[1] - a[1]; }).map(function(pair) {
    var k = pair[0], w = pair[1];
    var best = 0;
    drugIds.forEach(function(did) {
      var v = ABX_M[did] ? ABX_M[did][k] : 0;
      if (v === 1 && best < 1) best = 1;
      else if (v === 2 && best < 0.5) best = 0.5;
    });
    tot += w;
    got += w * best;
    return { bugId: k, weight: w, status: best === 1 ? "ok" : (best === 0.5 ? "part" : "no") };
  });
  return { inf: inf, pct: tot ? Math.round((100 * got) / tot) : 0, rows: rows };
}

function renderTropikAbxStewardshipBody() {
  var tab = tropikAbxState.activeTab;
  var tabRow = '<div class="viz-subtabs mb-2.5" id="viz-tropik-abx-tabs">' +
    [
      { k: "spectrum", lbl: "Spektrum (Obat x Kuman)" },
      { k: "builder", lbl: "Empiric Builder" },
      { k: "compare", lbl: "Bandingkan & PK/PD" },
      { k: "renal", lbl: "Dosis Ginjal (CrCl)" }
    ].map(function(t) {
      return '<button type="button" class="viz-pill-btn ' + (tab === t.k ? "active" : "") + '" onclick="window.InternaApp.updateTropikAbxTab(\'' + t.k + '\')">' + t.lbl + '</button>';
    }).join("") +
  '</div>';

  if (tab === "spectrum") {
    var bugs = ABX_BUGS.filter(function(b) { return tropikAbxState.bugCatFilter === "all" || b.cat === tropikAbxState.bugCatFilter; });
    var q = (tropikAbxState.drugSearch || "").toLowerCase();
    var drugs = ABX_DRUGS.filter(function(d) { return !q || d.name.toLowerCase().includes(q) || d.cls.toLowerCase().includes(q); });
    var selD = ABX_DRUGS.find(function(d) { return d.id === tropikAbxState.selectedDrug; }) || ABX_DRUGS[0];
    var selB = ABX_BUGS.find(function(b) { return b.id === tropikAbxState.selectedBug; }) || ABX_BUGS[6];
    var cellVal = ABX_M[selD.id] ? ABX_M[selD.id][selB.id] : 0;
    var cellLabel = cellVal === 1 ? "S (Aktif secara klinis)" : (cellVal === 2 ? "V (Variabel / Lini 2)" : (cellVal === 3 ? "R (Resisten / Tidak aktif)" : "Tidak relevan"));
    var pearl = ABX_NOTES[selD.id + "|" + selB.id] || selD.notes;
    var adm = ABX_ADM[selD.id] || ["-", "-", "-", "-"];

    var catBtns = '<div class="viz-presets mb-2">' +
      [{ k: "all", l: "Semua Kuman" }, { k: "gp", l: "Gram+" }, { k: "gn", l: "Gram-" }, { k: "an", l: "Anaerob" }, { k: "at", l: "Atipikal" }].map(function(c) {
        return '<button type="button" class="viz-pill-btn ' + (tropikAbxState.bugCatFilter === c.k ? "active" : "") + '" onclick="window.InternaApp.updateTropikAbxSpectrumFilter(\'' + c.k + '\')">' + c.l + '</button>';
      }).join("") +
    '</div>';

    var tblRows = drugs.map(function(d) {
      var tds = bugs.map(function(b) {
        var v = ABX_M[d.id][b.id];
        var txt = v === 1 ? "S" : (v === 2 ? "V" : (v === 3 ? "R" : "·"));
        var bg = v === 1 ? "background:var(--viz-green-soft);color:var(--viz-green);font-weight:700;" : (v === 2 ? "background:var(--accent-secondary-soft);color:var(--accent-secondary);font-weight:700;" : (v === 3 ? "background:var(--accent-coral-soft);color:var(--accent-coral);font-weight:700;" : "opacity:0.35;"));
        var isSel = d.id === selD.id && b.id === selB.id ? "outline:2px solid var(--accent-primary);" : "";
        return '<td style="text-align:center;padding:3px 4px;"><button type="button" style="width:26px;height:24px;border-radius:5px;border:none;cursor:pointer;font-size:11px;' + bg + isSel + '" onclick="window.InternaApp.selectTropikAbxCell(\'' + d.id + '\',\'' + b.id + '\')">' + txt + '</button></td>';
      }).join("");
      return '<tr><td style="white-space:nowrap;font-weight:700;">' + escapeHtml(d.name) + '</td>' + tds + '</tr>';
    }).join("");

    return tabRow +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2" style="align-items:center;">' +
        '<input type="search" id="abx-drug-search" value="' + escapeHtml(tropikAbxState.drugSearch) + '" placeholder="Cari 37 antimikroba (mis. meropenem, cefiderocol)..." class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxSearch(this.value)" />' +
        catBtns +
      '</div>' +
      '<div class="med-table-wrap mb-2.5" style="max-height:240px;overflow:auto;">' +
        '<table class="med-table" style="font-size:11px;">' +
          '<thead><tr><th>Antimikroba</th>' + bugs.map(function(b) { return '<th style="text-align:center;white-space:nowrap;">' + escapeHtml(b.name) + '</th>'; }).join("") + '</tr></thead>' +
          '<tbody>' + tblRows + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="viz-readout" data-tone="' + (cellVal === 1 ? "info" : (cellVal === 2 ? "warning" : "danger")) + '">' +
        '<p class="font-bold text-[var(--text-primary)]">' + escapeHtml(selD.name) + ' &rarr; ' + escapeHtml(selB.name) + ': ' + cellLabel + '</p>' +
        '<p class="mt-1"><strong>Dosis & PK/PD:</strong> ' + escapeHtml(adm[0]) + ' &bull; ' + escapeHtml(adm[1]) + ' &bull; <strong>' + escapeHtml(adm[2]) + '</strong> (' + escapeHtml(adm[3]) + ').</p>' +
        '<p class="mt-1"><strong>Pearl Klinis:</strong> ' + escapeHtml(pearl) + '</p>' +
      '</div>';
  }

  if (tab === "builder") {
    var cov = calcAbxEmpiricCoverage(tropikAbxState.builderInf, tropikAbxState.builderDrugs);
    var infOpts = ABX_INFS.map(function(x) {
      return '<option value="' + x.id + '" ' + (x.id === cov.inf.id ? "selected" : "") + '>' + escapeHtml(x.name) + '</option>';
    }).join("");
    var quickDrugs = ["ceftriaxone", "azithromycin", "piptazo", "meropenem", "cefepime", "vancomycin", "linezolid", "daptomycin", "metronidazole", "levo", "cipro", "nitrofurantoin", "fosfomycin", "ceftazavi", "aztreonam", "fidaxomicin"];
    var drugChips = quickDrugs.map(function(did) {
      var d = ABX_DRUGS.find(function(x) { return x.id === did; });
      if (!d) return "";
      var active = tropikAbxState.builderDrugs.includes(did);
      return '<button type="button" class="viz-pill-btn ' + (active ? "active" : "") + '" onclick="window.InternaApp.toggleTropikAbxBuilderDrug(\'' + did + '\')">' + (active ? "✓ " : "") + escapeHtml(d.name) + '</button>';
    }).join("");

    var barColor = cov.pct >= 80 ? "var(--accent-primary)" : (cov.pct >= 50 ? "var(--accent-secondary)" : "var(--accent-coral)");
    var pathList = cov.rows.map(function(r) {
      var b = ABX_BUGS.find(function(x) { return x.id === r.bugId; });
      var badge = r.status === "ok" ? '<span style="color:var(--viz-green);font-weight:700;">Tercakup (S)</span>' : (r.status === "part" ? '<span style="color:var(--accent-secondary);font-weight:700;">Parsial (V)</span>' : '<span style="color:var(--accent-coral);font-weight:700;">Belum Tercakup</span>');
      return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border-subtle);"><span>' + escapeHtml(b ? b.name : r.bugId) + ' (bobot ' + r.weight + ')</span>' + badge + '</div>';
    }).join("");

    return tabRow +
      '<div class="mb-2.5">' +
        '<label class="viz-slider-label block mb-1" for="abx-builder-inf">Pilih Sindrom Klinis Empiris:</label>' +
        '<select id="abx-builder-inf" class="viz-calc-input w-full" onchange="window.InternaApp.setTropikAbxBuilderInf(this.value)">' + infOpts + '</select>' +
      '</div>' +
      '<div class="viz-presets mb-2.5">' + drugChips + '</div>' +
      '<div class="mb-2">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px;"><span>Cakupan Patogen Terbobot</span><span>' + cov.pct + '%</span></div>' +
        '<div style="height:10px;border-radius:99px;background:var(--bg-surface-subtle);overflow:hidden;border:1px solid var(--border-subtle);"><div style="height:100%;width:' + cov.pct + '%;background:' + barColor + ';transition:width .25s;"></div></div>' +
      '</div>' +
      '<div class="mb-2.5">' + pathList + '</div>' +
      '<div class="viz-readout" data-tone="' + (cov.pct >= 80 ? "info" : (cov.pct >= 50 ? "warning" : "danger")) + '">' +
        '<p class="font-bold text-[var(--text-primary)]">' + escapeHtml(cov.inf.name) + ' — Cakupan ' + cov.pct + '%</p>' +
        '<p class="mt-1">' + escapeHtml(cov.inf.notes) + '</p>' +
      '</div>';
  }

  if (tab === "compare") {
    var PRESETS = [
      { l: "Antipseudomonal", ids: ["piptazo", "cefepime", "meropenem"] },
      { k: "cre", l: "CRE Baru (KPC/MBL)", ids: ["ceftazavi", "merovabor", "cefiderocol"] },
      { l: "Anti-MRSA", ids: ["vancomycin", "daptomycin", "linezolid"] },
      { l: "FQ Respirasi", ids: ["levo", "moxi", "cipro"] }
    ];
    var ds = tropikAbxState.compareDrugs.map(function(id) { return ABX_DRUGS.find(function(x) { return x.id === id; }); }).filter(Boolean);
    if (ds.length < 2) ds = [ABX_DRUGS[3], ABX_DRUGS[10], ABX_DRUGS[13]];

    var presetBtns = '<div class="viz-presets mb-2.5">' + PRESETS.map(function(p, idx) {
      return '<button type="button" class="viz-pill-btn" onclick="window.InternaApp.setTropikAbxComparePreset(' + idx + ')">' + p.l + '</button>';
    }).join("") + '</div>';

    var cmpRows = ABX_BUGS.map(function(b) {
      var vals = ds.map(function(d) { return ABX_M[d.id][b.id]; });
      var tds = vals.map(function(v) {
        var txt = v === 1 ? "S" : (v === 2 ? "V" : (v === 3 ? "R" : "·"));
        var col = v === 1 ? "var(--viz-green)" : (v === 2 ? "var(--accent-secondary)" : (v === 3 ? "var(--accent-coral)" : "var(--text-muted)"));
        return '<td style="text-align:center;font-weight:800;color:' + col + ';">' + txt + '</td>';
      }).join("");
      return '<tr><td><strong>' + escapeHtml(b.name) + '</strong></td>' + tds + '</tr>';
    }).join("");

    var admRows = ds.map(function(d) {
      var a = ABX_ADM[d.id] || ["-", "-", "-", "-"];
      return '<tr><td><strong>' + escapeHtml(d.name) + '</strong></td><td>' + escapeHtml(a[0]) + '</td><td>' + escapeHtml(a[1]) + '</td><td>' + escapeHtml(a[2]) + ' (' + escapeHtml(a[3]) + ')</td></tr>';
    }).join("");

    return tabRow + presetBtns +
      '<div class="med-table-wrap mb-2.5"><table class="med-table" style="font-size:11px;"><thead><tr><th>Obat</th><th>Rute</th><th>Dosis Dewasa</th><th>PK/PD & Strategi</th></tr></thead><tbody>' + admRows + '</tbody></table></div>' +
      '<div class="med-table-wrap"><table class="med-table" style="font-size:11px;"><thead><tr><th>Kuman</th>' + ds.map(function(d) { return '<th style="text-align:center;">' + escapeHtml(d.name) + '</th>'; }).join("") + '</tr></thead><tbody>' + cmpRows + '</tbody></table></div>';
  }

  // tab === "renal"
  var r = calcAbxRenalMetrics();
  var warns = [];
  if (tropikAbxState.renalAki) warns.push("AKI / Kreatinin belum stabil: CrCl tidak andal — beri dosis awal penuh (loading dose) beta-laktam, evaluasi tiap 24 jam.");
  if (tropikAbxState.renalMuscle) warns.push("Sarkopenia / Sirosis: kreatinin menaksir GFR terlalu tinggi; waspada toksisitas.");
  if (r.crcl > 130 && !tropikAbxState.renalAki) warns.push("CrCl >130 mL/mnt: curiga Augmented Renal Clearance (ARC) — pertimbangkan extended infusion dosis tinggi.");
  if (tropikAbxState.renalRrt === "crrt") warns.push("CRRT/SLED: dosis tergantung laju efluen — wajib ikuti protokol CRRT institusi.");

  var rq = (tropikAbxState.renalSearch || "").toLowerCase();
  var rRows = ABX_DRUGS.map(function(d) {
    if (rq && !d.name.toLowerCase().includes(rq)) return "";
    var res = getAbxRenalDose(d.id, r);
    if (!res) return "";
    if (tropikAbxState.renalFilter === "adj" && res.type === "n") return "";
    var badgeCol = res.dose.indexOf("HINDARI") === 0 ? "var(--accent-coral)" : (res.isAdj ? "var(--accent-secondary)" : "var(--viz-green)");
    return '<tr><td><strong>' + escapeHtml(d.name) + '</strong><br><span style="font-size:10px;opacity:0.75;">' + escapeHtml(res.base) + '</span></td><td>' + escapeHtml(res.dose) + '<br><span style="font-size:10px;color:' + badgeCol + ';font-weight:700;">' + escapeHtml(res.band) + '</span></td></tr>';
  }).join("");

  return tabRow +
    '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-age">Usia (th)</label><input type="number" id="abx-r-age" value="' + r.age + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxRenal()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-sex">Kelamin</label><select id="abx-r-sex" class="viz-calc-input w-full" onchange="window.InternaApp.updateTropikAbxRenal()"><option value="m" ' + (r.sex === "m" ? "selected" : "") + '>Pria</option><option value="f" ' + (r.sex === "f" ? "selected" : "") + '>Wanita</option></select></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-wt">BB (kg)</label><input type="number" id="abx-r-wt" value="' + r.wt + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxRenal()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-ht">TB (cm)</label><input type="number" id="abx-r-ht" value="' + r.ht + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxRenal()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-scr">SCr (' + (tropikAbxState.renalUnit === "umol" ? "umol/L" : "mg/dL") + ')</label><input type="number" id="abx-r-scr" step="0.1" value="' + tropikAbxState.renalScr + '" class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxRenal()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="abx-r-rrt">RRT</label><select id="abx-r-rrt" class="viz-calc-input w-full" onchange="window.InternaApp.updateTropikAbxRenal()"><option value="none" ' + (tropikAbxState.renalRrt === "none" ? "selected" : "") + '>Non-RRT</option><option value="hd" ' + (tropikAbxState.renalRrt === "hd" ? "selected" : "") + '>Hemodialisis</option><option value="pd" ' + (tropikAbxState.renalRrt === "pd" ? "selected" : "") + '>Dialisis Peritoneal</option><option value="crrt" ' + (tropikAbxState.renalRrt === "crrt" ? "selected" : "") + '>CRRT / SLED</option></select></div>' +
    '</div>' +
    '<div class="viz-calc-checklist mb-2">' +
      renderCalcCheckItem("abx-r-aki", "window.InternaApp.updateTropikAbxRenal()", "AKI / Kreatinin belum stabil", { checked: tropikAbxState.renalAki }) +
      renderCalcCheckItem("abx-r-muscle", "window.InternaApp.updateTropikAbxRenal()", "Sirosis / Sarkopenia", { checked: tropikAbxState.renalMuscle }) +
    '</div>' +
    '<div class="viz-readout mb-2.5" data-tone="' + (r.crcl < 30 ? "danger" : (r.crcl < 60 ? "warning" : "info")) + '">' +
      '<p class="font-bold text-[var(--text-primary)]">CrCl (Cockcroft-Gault): ' + r.crcl.toFixed(1) + ' mL/mnt | eGFR (CKD-EPI 2021): ' + r.egfr.toFixed(0) + ' mL/mnt/1.73m2</p>' +
      '<p class="mt-1">BB dipakai: <strong>' + r.w.toFixed(1) + ' kg (' + r.basis.toUpperCase() + ')</strong> &bull; IBW: ' + r.ibw.toFixed(1) + ' kg &bull; AdjBW: ' + r.adj.toFixed(1) + ' kg &bull; eGFR de-indeks: ' + r.egfrAbs.toFixed(0) + ' mL/mnt.</p>' +
      (warns.length ? '<p class="mt-1 text-[var(--accent-coral)]"><strong>Peringatan:</strong> ' + warns.map(escapeHtml).join(" ") + '</p>' : "") +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">' +
      '<input type="search" id="abx-r-search" value="' + escapeHtml(tropikAbxState.renalSearch) + '" placeholder="Cari obat di tabel dosis ginjal..." class="viz-calc-input w-full" oninput="window.InternaApp.updateTropikAbxRenalSearch(this.value)" />' +
      '<div class="viz-presets"><button type="button" class="viz-pill-btn ' + (tropikAbxState.renalFilter === "adj" ? "active" : "") + '" onclick="window.InternaApp.setTropikAbxRenalFilter(\'adj\')">Perlu Penyesuaian</button><button type="button" class="viz-pill-btn ' + (tropikAbxState.renalFilter === "all" ? "active" : "") + '" onclick="window.InternaApp.setTropikAbxRenalFilter(\'all\')">Semua 37 Obat</button></div>' +
    '</div>' +
    '<div class="med-table-wrap" style="max-height:220px;overflow:auto;"><table class="med-table" style="font-size:11px;"><thead><tr><th>Antimikroba (Acuan)</th><th>Dosis Sesuai CrCl</th></tr></thead><tbody>' + rRows + '</tbody></table></div>';
}

function renderTropikAbxSummarySvg() {
  var r = calcAbxRenalMetrics();
  var pct = Math.max(4, Math.min(100, Math.round((r.crcl / 120) * 100)));
  var col = r.crcl < 30 ? "var(--accent-coral)" : (r.crcl < 60 ? "var(--accent-secondary)" : "var(--viz-green)");
  var emp = calcAbxEmpiricCoverage(tropikAbxState.builderInf, tropikAbxState.builderDrugs);
  return '<svg class="viz-svg" viewBox="0 0 640 58" style="width:100%;height:auto;display:block;margin-bottom:8px;">' +
    '<rect x="2" y="2" width="636" height="54" rx="14" fill="var(--bg-surface)" stroke="var(--border-subtle)"/>' +
    '<text x="16" y="22" font-size="11" font-weight="600" style="font-variant-numeric:tabular-nums;" fill="var(--text-primary)">Cockcroft-Gault CrCl: ' + r.crcl.toFixed(1) + ' mL/mnt (' + r.basis.toUpperCase() + ')</text>' +
    '<rect x="16" y="31" width="270" height="8" rx="4" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="0.6"/>' +
    '<rect x="16" y="31" width="' + Math.round(2.7 * pct) + '" height="8" rx="4" fill="' + col + '"/>' +
    '<text x="320" y="22" font-size="11" font-weight="600" style="font-variant-numeric:tabular-nums;" fill="var(--text-primary)">Empiric Coverage (' + tropikAbxState.builderDrugs.length + ' obat): ' + emp.pct + '%</text>' +
    '<rect x="320" y="31" width="300" height="8" rx="4" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="0.6"/>' +
    '<rect x="320" y="31" width="' + Math.round(3 * emp.pct) + '" height="8" rx="4" fill="var(--accent-primary)"/>' +
  '</svg>';
}

function renderTropikAbxStewardshipWidget() {
  return '<div class="viz-widget" id="viz-tropik-abx-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Antibiotic Helper: Spektrum 37 Obat, Empiric Builder &amp; Dosis Ginjal</span>' +
      '<span class="viz-tag">Stewardship &amp; PK/PD • KKI 4/3A</span>' +
    '</div>' +
    '<div id="viz-tropik-abx-svg">' + renderTropikAbxSummarySvg() + '</div>' +
    '<div id="viz-tropik-abx-body">' + renderTropikAbxStewardshipBody() + '</div>' +
  '</div>';
}

function refreshTropikAbxWidget() {
  var svgEl = document.getElementById("viz-tropik-abx-svg");
  if (svgEl) svgEl.innerHTML = renderTropikAbxSummarySvg();
  var el = document.getElementById("viz-tropik-abx-body");
  if (el) el.innerHTML = renderTropikAbxStewardshipBody();
}

function updateTropikAbxTab(t) { tropikAbxState.activeTab = t; refreshTropikAbxWidget(); }
function updateTropikAbxSpectrumFilter(cat) { tropikAbxState.bugCatFilter = cat; refreshTropikAbxWidget(); }
function updateTropikAbxSearch(q) { tropikAbxState.drugSearch = q || ""; refreshTropikAbxWidget(); }
function selectTropikAbxCell(dId, bId) { tropikAbxState.selectedDrug = dId; tropikAbxState.selectedBug = bId; refreshTropikAbxWidget(); }
function setTropikAbxBuilderInf(infId) { tropikAbxState.builderInf = infId; tropikAbxState.builderDrugs = []; refreshTropikAbxWidget(); }
function toggleTropikAbxBuilderDrug(dId) {
  var idx = tropikAbxState.builderDrugs.indexOf(dId);
  if (idx >= 0) tropikAbxState.builderDrugs.splice(idx, 1);
  else tropikAbxState.builderDrugs.push(dId);
  refreshTropikAbxWidget();
}
function setTropikAbxComparePreset(idx) {
  var presets = [["piptazo", "cefepime", "meropenem"], ["ceftazavi", "merovabor", "cefiderocol"], ["vancomycin", "daptomycin", "linezolid"], ["levo", "moxi", "cipro"]];
  if (presets[idx]) tropikAbxState.compareDrugs = presets[idx];
  refreshTropikAbxWidget();
}
function updateTropikAbxRenal() {
  var ageEl = document.getElementById("abx-r-age");
  var sexEl = document.getElementById("abx-r-sex");
  var wtEl = document.getElementById("abx-r-wt");
  var htEl = document.getElementById("abx-r-ht");
  var scrEl = document.getElementById("abx-r-scr");
  var rrtEl = document.getElementById("abx-r-rrt");
  var akiEl = document.getElementById("abx-r-aki");
  var musEl = document.getElementById("abx-r-muscle");
  if (ageEl) tropikAbxState.renalAge = Number(ageEl.value) || 60;
  if (sexEl) tropikAbxState.renalSex = sexEl.value;
  if (wtEl) tropikAbxState.renalWt = Number(wtEl.value) || 65;
  if (htEl) tropikAbxState.renalHt = Number(htEl.value) || 165;
  if (scrEl) tropikAbxState.renalScr = Number(scrEl.value) || 1.5;
  if (rrtEl) tropikAbxState.renalRrt = rrtEl.value;
  if (akiEl) tropikAbxState.renalAki = akiEl.checked;
  if (musEl) tropikAbxState.renalMuscle = musEl.checked;
  refreshTropikAbxWidget();
}
function updateTropikAbxRenalSearch(q) { tropikAbxState.renalSearch = q !== null && q !== undefined ? String(q) : ""; refreshTropikAbxWidget(); }
function setTropikAbxRenalFilter(f) { tropikAbxState.renalFilter = f; refreshTropikAbxWidget(); }

// -------------------------------------------------------------------------


  function renderTropikModuleWidget(type) {
    if (type === "dengue-phase-viz") return renderDenguePhaseWidget();
    if (type === "typhoid-basu-viz") return renderTyphoidBasuWidget();
    if (type === "lepto-biphasic-viz") return renderLeptoBiphasicWidget();
    if (type === "hiv-cd4-viz") return renderHivCd4Widget();
    if (type === "malaria-atlas-viz") return renderMalariaAtlasWidget();
    if (type === "hiv-neuro-viz") return renderHivNeuroWidget();
    if (type === "mycosis-ct-viz") return renderMycosisCtWidget();
    if (type === "rabies-pep-viz") return renderRabiesPepWidget();
    if (type === "amr-stewardship-viz") return renderAmrStewardshipWidget();
    if (type === "tropik-abx-stewardship-viz") return renderTropikAbxStewardshipWidget();
    return null;
  }

  R.registerWidgetRenderer(renderTropikModuleWidget);
  R.registerMotionProvider(function (key) {
    if (key === "dengue") return { min: 1, max: 10, start: 1, end: 10, duration: 7600, get: () => prior2VizState.dengueDay, apply: (v) => updateDengueViz(v, false) };
    if (key === "typhoid") return { min: 1, max: 4, start: 1, end: 4, duration: 6000, get: () => prior2VizState.typhoidWeek, apply: (v) => updateTyphoidViz(v, false) };
    if (key === "lepto") return { min: 1, max: 21, start: 1, end: 21, duration: 8200, get: () => prior2VizState.leptoDay, apply: (v) => updateLeptoViz(v, false) };
    if (key === "hiv") return { min: 0, max: 500, start: 460, end: 20, duration: 8200, get: () => prior2VizState.hivCd4, apply: (v) => updateHivCd4Viz(v, null, false) };
    return null;
  });

  Object.assign(R.handlers, { updateDengueViz, updateTyphoidViz, updateLeptoViz, updateHivCd4Viz, updateMalariaAtlasViz, updateHivNeuroViz, updateMycosisCtViz, updateRabiesPepViz, updateAmrStewardshipViz, renderTropikAbxStewardshipWidget, updateTropikAbxTab, updateTropikAbxSpectrumFilter, updateTropikAbxSearch, selectTropikAbxCell, setTropikAbxBuilderInf, toggleTropikAbxBuilderDrug, setTropikAbxComparePreset, updateTropikAbxRenal, updateTropikAbxRenalSearch, setTropikAbxRenalFilter });
})(window);
