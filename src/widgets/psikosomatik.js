/* ==========================================================================
   InternaSnack — Psikosomatik & Paliatif Medik Interactive Widgets (Apple HIG)
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { clampNum, escapeHtml } = R.utils;
  const {
    renderVizLegend,
    syncSliderAndPill,
    syncVizPresets,
    formatVizReadoutHtml,
    updateVizReadout,
    swapVizSvgFrame,
    renderCardioTabRow,
    renderCardioWidgetCard
  } = R.viz;

  function svgWrap(str, x, y, maxChars, lineH, attrs) {
    var words = String(str || "").split(/\s+/);
    var lines = [];
    var cur = "";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!cur) { cur = w; }
      else if (cur.length + 1 + w.length <= maxChars) { cur += " " + w; }
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.map(function (ln, idx) {
      return '<text x="' + x + '" y="' + (y + idx * (lineH || 12)) + '" ' + (attrs || "") + '>' + escapeHtml(ln) + '</text>';
    }).join("");
  }

  var psikoVizState = {
    // P2. psiko-1-2: Fibromyalgia ACR 2016 (WPI + SSS) vs ACR 1990 Calculator
    fibroWpi: 9, // 0..19
    fibroSss: 7, // 0..12

    // P8. psiko-3-1: WHO Analgesic Ladder, Opioid-Naive Safety & Conversion
    whoStep: "step3_naive" // "step1", "step2", "step3_naive", "step3_convert"
  };

  // =========================================================================
  // P2. KALKULATOR KRITERIA FIBROMIALGIA ACR 2016 (WPI + SSS) & ACR 1990
  // =========================================================================
  function evalFibromyalgia(wpi, sss) {
    var w = Math.round(clampNum(wpi, 0, 19));
    var s = Math.round(clampNum(sss, 0, 12));
    var pathA = (w >= 7 && s >= 5);
    var pathB = (w >= 4 && w <= 6 && s >= 9);
    var met = pathA || pathB;
    return {
      wpi: w,
      sss: s,
      met: met,
      color: met ? "var(--accent-coral)" : "var(--accent-primary)",
      tone: met ? "danger" : "info",
      status: met
        ? "MEMENUHI KRITERIA ACR 2016 FIBROMIALGIA" + (pathA ? " (WPI >=7 & SSS >=5)" : " (WPI 4–6 & SSS >=9)")
        : "BELUM MEMENUHI AMBANG ACR 2016 (Evaluasi Nyeri Lokal / Miofasial)",
      c1: "<strong>Syarat Diagnostik ACR 2016 &amp; ACR 1990:</strong> Nyeri menyeluruh &ge;3 bulan (di &ge;4 dari 5 regio tubuh) dengan <strong>(WPI &ge;7 dan SSS &ge;5) ATAU (WPI 4–6 dan SSS &ge;9)</strong>, atau pada kriteria klasik <strong>ACR 1990: nyeri tekan pada &ge;11 dari 18 titik <em>tender points</em></strong> dengan penanda inflamasi (LED/CRP) normal.",
      c2: "<strong>Tata Laksana Multimodal (PAPDI/EULAR):</strong> Edukasi, latihan aerobik bertahap, <strong>CBT</strong>, serta farmakoterapi lini pertama <strong>Duloxetine (SNRI), Pregabalin/Gabapentin, atau Amitriptilin dosis rendah</strong>. <strong>Kortikosteroid dan opioid kuat TIDAK diindikasikan!</strong>"
    };
  }

  function buildPsikoFibroSvg(wpi, sss) {
    var ev = evalFibromyalgia(wpi, sss);
    var wPct = Math.round((ev.wpi / 19) * 180);
    var sPct = Math.round((ev.sss / 12) * 180);
    return '<svg class="viz-svg" viewBox="0 0 480 182" role="img" aria-label="Kalkulator Kriteria Fibromialgia ACR">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">EVALUASI KRITERIA FIBROMIALGIA ACR 2016 &amp; ACR 1990</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + ev.color + '">WPI: ' + ev.wpi + '/19 | SSS: ' + ev.sss + '/12</text>' +
      // Left Gauge Panel
      '<rect x="18" y="24" width="224" height="94" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="28" y="42" font-size="8" font-weight="800" fill="var(--text-primary)">Widespread Pain Index (WPI: ' + ev.wpi + '/19)</text>' +
      '<rect x="28" y="48" width="180" height="12" rx="5" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<rect x="28" y="48" width="' + wPct + '" height="12" rx="5" fill="var(--accent-coral)" fill-opacity="0.82" />' +
      '<text x="28" y="80" font-size="8" font-weight="800" fill="var(--text-primary)">Symptom Severity Scale (SSS: ' + ev.sss + '/12)</text>' +
      '<rect x="28" y="86" width="180" height="12" rx="5" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<rect x="28" y="86" width="' + sPct + '" height="12" rx="5" fill="var(--viz-purple)" fill-opacity="0.82" />' +
      '<text x="28" y="111" font-size="7.5" font-weight="700" fill="var(--text-muted)">ACR 1990: &gt;=11 dari 18 Tender Points (+)</text>' +
      // Right Therapy Box
      '<rect x="252" y="24" width="210" height="94" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="264" y="42" font-size="7.8" font-weight="800" fill="var(--viz-green)">LINI PERTAMA TERBUKTI EFEKTIF:</text>' +
      svgWrap("Edukasi + Aerobik + CBT + Duloxetine / Pregabalin / Gabapentin / Amitriptilin", 264, 55, 31, 11, 'font-size="8" font-weight="800" fill="var(--text-primary)"') +
      '<text x="264" y="92" font-size="7.8" font-weight="800" fill="var(--accent-coral)">JEBAKAN SOAL BOARD (HINDARI):</text>' +
      '<text x="264" y="106" font-size="8" font-weight="800" fill="var(--accent-coral)">Kortikosteroid &amp; NSAID Monoterapi!</text>' +
      // Bottom Status Banner
      '<rect x="18" y="126" width="444" height="44" rx="8" fill="' + ev.color + '" fill-opacity="0.12" stroke="' + ev.color + '" stroke-width="1.6" />' +
      '<text x="30" y="144" font-size="8.3" font-weight="800" fill="' + ev.color + '">' + escapeHtml(ev.status) + '</text>' +
      '<text x="30" y="160" font-size="7.8" font-weight="700" fill="var(--text-primary)">Wajib: Gejala &gt;=3 bulan, nyeri &gt;=4 regio, LED &amp; CRP normal (bukan sinovitis inflamatorik)</text>' +
      '</svg>';
  }

  function renderPsikoFibromyalgiaAcrWidget() {
    var w = psikoVizState.fibroWpi;
    var s = psikoVizState.fibroSss;
    var ev = evalFibromyalgia(w, s);
    var controls =
      '<div class="viz-controls">' +
        '<div class="viz-slider-row"><label class="viz-slider-label" for="psiko-wpi-slider">Widespread Pain Index (WPI: 0–19 Area Tubuh)</label><span class="viz-value-pill" id="psiko-wpi-pill">' + w + ' / 19 Area</span></div>' +
        '<input type="range" id="psiko-wpi-slider" class="viz-range" min="0" max="19" step="1" value="' + w + '" oninput="window.InternaApp.calcPsikoFibromyalgia(this.value, null)" />' +
        '<div class="viz-slider-row" style="margin-top:0.45rem;"><label class="viz-slider-label" for="psiko-sss-slider">Symptom Severity Scale (SSS: 0–12 Kelelahan/Tidur/Kognitif)</label><span class="viz-value-pill" id="psiko-sss-pill">' + s + ' / 12 Poin</span></div>' +
        '<input type="range" id="psiko-sss-slider" class="viz-range" min="0" max="12" step="1" value="' + s + '" oninput="window.InternaApp.calcPsikoFibromyalgia(null, this.value)" />' +
      '</div>';
    return renderCardioWidgetCard({
      key: "psikoFibro",
      title: "Kalkulator Kriteria Fibromialgia ACR 2016 (WPI + SSS) vs ACR 1990 & Algoritma Terapi",
      tag: "FIBROMIALGIA ACR",
      controlsTop: controls,
      svgHtml: buildPsikoFibroSvg(w, s),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "WPI (0–19 Area Nyeri)" },
        { color: "var(--viz-purple)", label: "SSS (0–12 Keparahan Gejala)" },
        { color: "var(--viz-green)", label: "Terapi Multimodal (SNRI/Gabapentinoid/CBT)" }
      ]),
      info: { tone: ev.tone, rKey: "fibro_" + w + "_" + s, title: ev.status, c1Label: "Kriteria Diagnostik ACR 2016 & 1990", c1Body: ev.c1, c2Label: "Farmakoterapi & Non-Farmakoterapi", c2Body: ev.c2 },
      readoutFooter: ""
    });
  }

  function calcPsikoFibromyalgia(wpiVal, sssVal) {
    if (wpiVal !== null && wpiVal !== undefined) psikoVizState.fibroWpi = Math.round(clampNum(wpiVal, 0, 19));
    if (sssVal !== null && sssVal !== undefined) psikoVizState.fibroSss = Math.round(clampNum(sssVal, 0, 12));
    var w = psikoVizState.fibroWpi;
    var s = psikoVizState.fibroSss;
    var ev = evalFibromyalgia(w, s);
    syncSliderAndPill("psiko-wpi-slider", "psiko-wpi-pill", w, w + " / 19 Area");
    syncSliderAndPill("psiko-sss-slider", "psiko-sss-pill", s, s + " / 12 Poin");
    swapVizSvgFrame("viz-psikoFibro-frame", buildPsikoFibroSvg(w, s));
    updateVizReadout("viz-psikoFibro-readout", ev.tone, formatVizReadoutHtml(ev.status, "Kriteria Diagnostik ACR 2016 & 1990", ev.c1, "Farmakoterapi & Non-Farmakoterapi", ev.c2, ""), "fibro_" + w + "_" + s);
  }

  // =========================================================================
  // P8. SIMULATOR WHO ANALGESIC LADDER, OPIOID-NAIVE & KONVERSI MORFIN (1:3)
  // =========================================================================
  var PSIKO_WHO_STEPS = {
    step1: {
      label: "Step 1 (VAS 1–3)",
      color: "var(--viz-green)",
      tone: "success",
      stepNum: 1,
      title: "WHO Step 1 — Nyeri Kanker Ringan (VAS 1–3): Non-Opioid ± Adjuvan",
      regimen: "Parasetamol (maks 3–4 g/hr) atau NSAID ± Ko-analgesik",
      adjuvant: "Metastasis tulang: Bifosfonat/NSAID | Neuropatik: Gabapentin/Pregabalin/Duloxetine",
      rule: "Berikan terjadwal (by the clock) & sesuai mekanisme nyeri",
      c1: "<strong>Step 1 (VAS 1–3):</strong> Gunakan analgesik non-opioid (parasetamol atau NSAID bila fungsi ginjal/GI aman) dikombinasikan dengan <strong>ko-analgesik (adjuvan)</strong> sejak tahap mana pun bila ada komponen neuropatik atau tulang.",
      c2: "<strong>Prinsip Dasar WHO:</strong> <em>By the mouth</em> (utamakan rute oral), <em>by the clock</em> (dosis terjadwal reguler, bukan hanya saat nyeri muncul), dan <em>by the ladder</em>."
    },
    step2: {
      label: "Step 2 (VAS 4–6)",
      color: "var(--accent-secondary)",
      tone: "warning",
      stepNum: 2,
      title: "WHO Step 2 — Nyeri Kanker Sedang (VAS 4–6): Opioid Lemah / Kuat Dosis Rendah",
      regimen: "Kodein / Tramadol ATAU Morfin Oral Dosis Rendah + Non-Opioid ± Adjuvan",
      adjuvant: "Wajib mulai profilaksis Laksatif Stimulan (Senna/Bisakodil) sejak hari ke-1 opioid!",
      rule: "Jangan kombinasikan dua opioid lemah; naik ke Step 3 bila dosis maksimal gagal",
      c1: "<strong>Step 2 (VAS 4–6):</strong> Opioid untuk nyeri ringan-sedang (kodein atau tramadol) atau morfin oral lepas cepat dosis rendah ditambah non-opioid dan adjuvan.",
      c2: "<strong>Pencegahan Efek Samping:</strong> Toleransi terhadap <strong>konstipasi imbas opioid tidak pernah terbentuk</strong> — selalu resepkan laksatif stimulan + pelunak feses sejak hari pertama pemberian opioid."
    },
    step3_naive: {
      label: "Step 3 (Opioid-Naive)",
      color: "var(--accent-coral)",
      tone: "danger",
      stepNum: 3,
      title: "WHO Step 3 (VAS 7–10) pada Pasien Opioid-Naive — Titrasi Morfin & Larangan Fentanil Patch!",
      regimen: "Mulai Titrasi Morfin Lepas Cepat (IR) Oral 5 mg tiap 4 jam atau Morfin IV",
      adjuvant: "KONTRAINDIKASI langsung memberi Fentanil Transdermal Patch pada pasien Opioid-Naive!",
      rule: "Fentanil patch onsetnya lambat (12–24 jam) & berisiko depresi napas fatal pada opioid-naive",
      c1: "<strong>Aturan Emas Pasien Opioid-Naive dengan Nyeri Berat (VAS 7–10):</strong> Inisiasi harus menggunakan <strong>opioid kerja pendek/lepas cepat (Morfin IR oral atau Morfin IV/SC titrasi)</strong> agar dosis kebutuhan harian diketahui secara aman.",
      c2: "<strong>Jebakan Ujian Board:</strong> Sediaan <strong>Fentanil transdermal (patch) TIDAK BOLEH diberikan langsung pada pasien <em>opioid-naive</em></strong> maupun untuk titrasi cepat nyeri akut yang belum stabil!"
    },
    step3_convert: {
      label: "Konversi IV -> Oral (1:3)",
      color: "var(--accent-primary)",
      tone: "info",
      stepNum: 3,
      title: "Konversi Ekuianalgesik Drip Morfin IV + Breakthrough ke Morfin Lepas Lambat Oral (Rasio 1:3)",
      regimen: "Rasio Morfin IV : Morfin Oral = 1 : 3 (Contoh: Total IV 20 mg/24j = Oral 60 mg/24j -> MST 2x30 mg)",
      adjuvant: "Dosis Breakthrough / Rescue = 10–15% (1/6) dari Total Dosis Harian | Gagal Ginjal: Pilih Fentanil",
      rule: "Jumlahkan (Drip IV 24 jam + Seluruh Extra Breakthrough IV) x 3 -> Bagi 2 untuk SR tiap 12 jam",
      c1: "<strong>Rumus Konversi Board SpPD:</strong> (1) Hitung total morfin IV 24 jam = <strong>dosis drip 24 jam + seluruh dosis <em>breakthrough</em> IV</strong> yang diberikan; (2) Kalikan <strong>3</strong> untuk mendapatkan total kebutuhan <strong>Morfin Oral 24 jam</strong>; (3) Bagi 2 untuk sediaan <strong>Morfin Lepas Lambat (SR/MST) tiap 12 jam</strong>.",
      c2: "<strong>Rotasi Opioid &amp; Dispnea Paliatif:</strong> Saat merotasi jenis opioid, kurangi dosis ekuianalgesik <strong>25–50%</strong>. Untuk <strong>dispnea refrakter paliatif</strong> (mis. kanker serviks/paru metastasis), terapi farmakologis lini pertama adalah <strong>morfin dosis rendah</strong>."
    }
  };

  function buildPsikoWhoSvg(sKey) {
    var d = PSIKO_WHO_STEPS[sKey] || PSIKO_WHO_STEPS.step3_naive;
    var steps = [
      { n: 1, x: 22, y: 84, w: 62, h: 32, lbl: "Step 1", sub: "VAS 1–3", col: "var(--viz-green)" },
      { n: 2, x: 88, y: 58, w: 62, h: 58, lbl: "Step 2", sub: "VAS 4–6", col: "var(--accent-secondary)" },
      { n: 3, x: 154, y: 32, w: 66, h: 84, lbl: "Step 3", sub: "VAS 7–10", col: "var(--accent-coral)" }
    ];
    var stairSvg = steps.map(function (st) {
      var active = (d.stepNum === st.n);
      var op = active ? "0.28" : "0.10";
      var sw = active ? "2.2" : "1.2";
      return '<rect x="' + st.x + '" y="' + st.y + '" width="' + st.w + '" height="' + st.h + '" rx="6" fill="' + st.col + '" fill-opacity="' + op + '" stroke="' + st.col + '" stroke-width="' + sw + '" />' +
        '<text x="' + (st.x + st.w / 2) + '" y="' + (st.y + 16) + '" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--text-primary)">' + st.lbl + '</text>' +
        '<text x="' + (st.x + st.w / 2) + '" y="' + (st.y + 28) + '" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-muted)">' + st.sub + '</text>';
    }).join("");

    return '<svg class="viz-svg" viewBox="0 0 480 192" role="img" aria-label="Simulator WHO Analgesic Ladder dan Konversi Opioid">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">WHO ANALGESIC LADDER &amp; KONVERSI EKUIANALGESIK OPIOID</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      // Left Ladder Box
      '<rect x="16" y="24" width="212" height="102" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      stairSvg +
      // Right Regimen Box
      '<rect x="236" y="24" width="226" height="102" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="248" y="41" font-size="7.8" font-weight="800" fill="var(--text-muted)">REGIMEN ANALGESIK UTAMA</text>' +
      svgWrap(d.regimen, 248, 54, 34, 11, 'font-size="8.2" font-weight="800" fill="var(--text-primary)"') +
      '<text x="248" y="90" font-size="7.8" font-weight="800" fill="var(--accent-coral)">ATURAN KUNCI / KEWASPADAAN</text>' +
      svgWrap(d.adjuvant, 248, 103, 34, 11, 'font-size="8" font-weight="700" fill="' + d.color + '"') +
      // Bottom Rule Banner
      '<rect x="16" y="134" width="446" height="46" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="28" y="151" font-size="8" font-weight="800" fill="' + d.color + '">PRINSIP TITRASI &amp; KONVERSI OPIOID:</text>' +
      svgWrap(d.rule, 28, 165, 68, 11, 'font-size="8.2" font-weight="800" fill="var(--text-primary)"') +
      '</svg>';
  }

  function renderPsikoWhoPainLadderWidget() {
    var cur = psikoVizState.whoStep;
    var d = PSIKO_WHO_STEPS[cur] || PSIKO_WHO_STEPS.step3_naive;
    var tabs = Object.keys(PSIKO_WHO_STEPS).map(function (k) {
      return { key: k, label: PSIKO_WHO_STEPS[k].label, onclick: "window.InternaApp.updatePsikoWhoViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "psikoWho",
      title: "Simulator WHO Analgesic Ladder (Step 1–3), Aturan Opioid-Naive & Konversi Morfin IV ke Oral (1:3)",
      tag: "WHO PAIN LADDER",
      controlsTop: renderCardioTabRow("viz-psikoWho-tabs", tabs, cur),
      svgHtml: buildPsikoWhoSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--viz-green)", label: "Step 1 (Non-Opioid)" },
        { color: "var(--accent-secondary)", label: "Step 2 (Opioid Lemah)" },
        { color: "var(--accent-coral)", label: "Step 3 (Opioid Kuat)" },
        { color: "var(--accent-primary)", label: "Konversi IV:Oral = 1:3" }
      ]),
      info: { tone: d.tone, rKey: "who_" + cur, title: d.title, c1Label: "Algoritma & Perhitungan Dosis", c1Body: d.c1, c2Label: "Mutiara Klinis & Keamanan Opioid", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updatePsikoWhoViz(key) {
    if (PSIKO_WHO_STEPS[key]) psikoVizState.whoStep = key;
    var cur = psikoVizState.whoStep;
    var d = PSIKO_WHO_STEPS[cur];
    syncVizPresets("viz-psikoWho-tabs", Object.keys(PSIKO_WHO_STEPS).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-psikoWho-frame", buildPsikoWhoSvg(cur));
    updateVizReadout("viz-psikoWho-readout", d.tone, formatVizReadoutHtml(d.title, "Algoritma & Perhitungan Dosis", d.c1, "Mutiara Klinis & Keamanan Opioid", d.c2, ""), "who_" + cur);
  }

  function renderPsikoModuleWidget(type) {
    if (type === "psiko-fibromyalgia-acr-calc") return renderPsikoFibromyalgiaAcrWidget();
    if (type === "psiko-who-pain-ladder-viz") return renderPsikoWhoPainLadderWidget();
    return "";
  }

  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("psiko-")) return null;
    return renderPsikoModuleWidget(type) || null;
  });

  Object.assign(R.handlers, {
    calcPsikoFibromyalgia,
    renderPsikoFibromyalgiaAcrWidget,
    updatePsikoWhoViz,
    renderPsikoWhoPainLadderWidget,
    renderPsikoModuleWidget
  });
})(window);
