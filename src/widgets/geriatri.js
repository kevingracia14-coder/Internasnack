/* ==========================================================================
   InternaSnack — Geriatri Interactive Widgets & Calculators (Apple HIG)
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { clampNum, escapeHtml } = R.utils;
  const {
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

  var geriVizState = {
    // W1. geri-1-1: 5-Domain P3G / CGA Dashboard
    cgaProfile: "frail_multi", // "robust", "frail_multi", "delirium_immob"

    // W2. geri-1-1 (extra): Barthel ADL Calculator (0-20)
    barthelScore: 10, // slider 0..20

    // W3. geri-1-2: Beers Criteria, ACB & Prescribing Cascade
    beersCase: "acb_delirium", // "acb_delirium", "cascade_edema", "cascade_parkinson", "su_hypo"

    // W4. geri-2-1: CAM Delirium Algorithm & 3D Matrix
    camProfile: "delirium_hypo", // "delirium_hypo", "delirium_hyper", "dementia_ad", "depression_gds"

    // W5. geri-2-2: Dementia Neuroanatomy & Domains Atlas
    demType: "alzheimer", // "alzheimer", "vascular", "dlb", "mci_vci"

    // W7. geri-2-4: Refeeding Syndrome Electrolyte Shift (rAF: geriRefeed)
    refeedDay: 2.5, // 0..5 days
    refeedMode: "aggressive", // "aggressive", "safe_nice"

    // W8. geri-2-4 (extra): MNA-SF & Refeeding Risk Calculator
    mnaScore: 9, // 0..14

    // W10. geri-3-2: NPIAP Pressure Injury Staging I-IV & Urinary Incontinence Atlas
    piStage: "stage3" // "stage1", "stage2", "stage3", "stage4", "incontinence"
  };

  function getGeriVizMotionSpec(key) {
    if (key === "geriRefeed") {
      return {
        min: 0, max: 5, start: 0, end: 5, duration: 6600,
        get: function () { return geriVizState.refeedDay; },
        apply: function (v) { updateGeriRefeedViz(v, null, false); }
      };
    }
    return null;
  }

  // =========================================================================
  // W1. SIMULATOR 5 DOMAIN PENGKAJIAN PARIPURNA PASIEN GERIATRI (P3G / CGA)
  // =========================================================================
  var GERI_CGA_PROFILES = {
    robust: {
      label: "Lansia Fit / Robust",
      color: "var(--viz-green)",
      tone: "success",
      title: "Profil Lansia Mandiri (Fit / Robust) — Kapasitas Intrinsik Terjaga",
      scores: [
        { dom: "Fungsional", tool: "Barthel 20/20", pct: 95, col: "var(--viz-green)" },
        { dom: "Kognitif", tool: "MMSE 29/30", pct: 92, col: "var(--viz-green)" },
        { dom: "Afektif", tool: "GDS-15: 1/15", pct: 90, col: "var(--viz-green)" },
        { dom: "Nutrisi", tool: "MNA-SF 13/14", pct: 90, col: "var(--viz-green)" },
        { dom: "Sosial", tool: "Caregiver (+)", pct: 88, col: "var(--viz-green)" }
      ],
      summary: "Mandiri penuh ADL/IADL, fungsi kognitif utuh, nutrisi baik",
      plan: "Promotif-preventif: Vaksinasi Influenza/Pneumokokus, latihan beban, target HbA1c <7,0–7,5%",
      c1: "<strong>5 Domain P3G Utuh:</strong> Indeks Barthel 20/20 (Mandiri), Lawton IADL 8/8, AMT 10/10 / MMSE 29/30, GDS-15 &lt;5 (Normal), dan MNA-SF 12–14 (Status nutrisi normal).",
      c2: "<strong>Target Klinis:</strong> Pasien lansia <em>fit</em> berhak mendapatkan terapi kuratif/preventif standar dewasa muda (target HbA1c &lt;7,0–7,5% tanpa obat pemicu hipoglikemia) serta imunisasi influenza tahunan dan pneumokokus."
    },
    frail_multi: {
      label: "Multimorbid + Frail",
      color: "var(--accent-secondary)",
      tone: "warning",
      title: "Sindrom Geriatri Multimorbid, Pre-Frail/Frail & Ketergantungan Sedang",
      scores: [
        { dom: "Fungsional", tool: "Barthel 10/20", pct: 50, col: "var(--accent-secondary)" },
        { dom: "Kognitif", tool: "MMSE 24/30", pct: 68, col: "var(--accent-primary)" },
        { dom: "Afektif", tool: "GDS-15: 9/15", pct: 45, col: "var(--accent-secondary)" },
        { dom: "Nutrisi", tool: "MNA-SF 9/14", pct: 52, col: "var(--accent-secondary)" },
        { dom: "Sosial", tool: "Beban Sedang", pct: 60, col: "var(--accent-primary)" }
      ],
      summary: "Barthel 10 (Ketergantungan Sedang), GDS 9 (Depresi), MNA-SF 9 (Risiko)",
      plan: "Deprescribing Beers/STOPP, SSRI Sertralin, Protein 1,2–1,5 g/kg + Leusin, Rehabilitasi",
      c1: "<strong>Interpretasi Skor P3G:</strong> Barthel <strong>10/20 = Ketergantungan Sedang (9–11)</strong>; GDS-15 <strong>skor 9 = Kecurigaan Depresi Ringan-Sedang (&ge;5)</strong>; MNA-SF <strong>9/14 = Risiko Malnutrisi (8–11)</strong>.",
      c2: "<strong>Rencana Paripurna:</strong> Rekonsiliasi obat (hentikan sulfonilurea/antikolinergik), mulai <strong>sertralin</strong> (rumatan 4–9 bulan pasca-remisi), suplementasi protein 1–1,5 g/kgBB/hari kaya leusin + vitamin D, dan latihan ketahanan."
    },
    delirium_immob: {
      label: "Delirium + Imobilisasi",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Kegawatdaruratan Geriatri: Delirium Akut, ImobilisasiTotal & Dekubitus",
      scores: [
        { dom: "Fungsional", tool: "Barthel 3/20", pct: 18, col: "var(--accent-coral)" },
        { dom: "Kognitif", tool: "CAM Positif", pct: 22, col: "var(--accent-coral)" },
        { dom: "Afektif", tool: "Sulit Dinilai", pct: 30, col: "var(--accent-secondary)" },
        { dom: "Nutrisi", tool: "MNA Total 14", pct: 28, col: "var(--accent-coral)" },
        { dom: "Sosial", tool: "Risiko Neglect", pct: 25, col: "var(--accent-coral)" }
      ],
      summary: "Barthel 3/20 (Ketergantungan Total), CAM (+), Malnutrisi (MNA <17)",
      plan: "Atasi infeksi/dehidrasi, reposisi tiap 2 jam, profilaksis DVT & refeeding bertahap",
      c1: "<strong>Temuan Kritis P3G:</strong> Barthel <strong>0–4 = Ketergantungan Total</strong>; CAM positif menandakan <strong>Delirium Akut</strong> (sering dicetuskan pneumonia, ISK, dehidrasi, atau polifarmasi); MNA Total &lt;17 = Malnutrisi.",
      c2: "<strong>Waspada Elderly Mistreatment:</strong> Ketergantungan fungsional berat dan beban pengasuh (<em>caregiver burden</em>) adalah faktor risiko utama salah perlakuan/penelantaran lansia (<em>elderly neglect</em>)."
    }
  };

  function buildGeriCgaSvg(pKey) {
    var d = GERI_CGA_PROFILES[pKey] || GERI_CGA_PROFILES.frail_multi;
    var bars = d.scores.map(function (s, idx) {
      var y = 40 + idx * 27;
      var w = Math.round((s.pct / 100) * 120);
      return '<text x="26" y="' + (y + 11) + '" font-size="8.2" font-weight="800" fill="var(--text-primary)">' + s.dom + '</text>' +
        '<rect x="88" y="' + y + '" width="120" height="14" rx="5" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
        '<rect x="88" y="' + y + '" width="' + w + '" height="14" rx="5" fill="' + s.col + '" fill-opacity="0.82" />' +
        '<text x="214" y="' + (y + 11) + '" font-size="7.6" font-weight="800" fill="' + s.col + '">' + s.tool + '</text>';
    }).join("");

    return '<svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Dashboard 5 Domain P3G Geriatri">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PENGKAJIAN PARIPURNA PASIEN GERIATRI (5 DOMAIN P3G)</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      '<rect x="18" y="24" width="256" height="162" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      bars +
      '<rect x="284" y="24" width="178" height="162" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="296" y="42" font-size="8" font-weight="800" fill="var(--text-muted)">RINGKASAN DOMAIN P3G</text>' +
      svgWrap(d.summary, 296, 56, 26, 11.5, 'font-size="8.4" font-weight="700" fill="var(--text-primary)"') +
      '<line x1="296" y1="100" x2="450" y2="100" stroke="var(--border-subtle)" />' +
      '<text x="296" y="116" font-size="8" font-weight="800" fill="var(--text-muted)">INTERVENSI TIM GERIATRI</text>' +
      svgWrap(d.plan, 296, 130, 26, 11.5, 'font-size="8.4" font-weight="800" fill="' + d.color + '"') +
      '</svg>';
  }

  function renderGeriCgaDashboardWidget() {
    var cur = geriVizState.cgaProfile;
    var d = GERI_CGA_PROFILES[cur] || GERI_CGA_PROFILES.frail_multi;
    var tabs = Object.keys(GERI_CGA_PROFILES).map(function (k) {
      return { key: k, label: GERI_CGA_PROFILES[k].label, onclick: "window.InternaApp.updateGeriCgaViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "geriCga",
      title: "Simulator 5 Domain Pengkajian Paripurna Pasien Geriatri (P3G / CGA)",
      tag: "P3G / CGA",
      controlsTop: renderCardioTabRow("viz-geriCga-tabs", tabs, cur),
      svgHtml: buildGeriCgaSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--viz-green)", label: "Mandiri / Optimal" },
        { color: "var(--accent-secondary)", label: "Hendaya Sedang / Pre-Frail" },
        { color: "var(--accent-coral)", label: "Ketergantungan Berat / Akut" }
      ]),
      info: { tone: d.tone, rKey: "cga_" + cur, title: d.title, c1Label: "Evaluasi Instrumen P3G", c1Body: d.c1, c2Label: "Manajemen Holistik & Target", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriCgaViz(key) {
    if (GERI_CGA_PROFILES[key]) geriVizState.cgaProfile = key;
    var cur = geriVizState.cgaProfile;
    var d = GERI_CGA_PROFILES[cur];
    syncVizPresets("viz-geriCga-tabs", Object.keys(GERI_CGA_PROFILES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-geriCga-frame", buildGeriCgaSvg(cur));
    updateVizReadout("viz-geriCga-readout", d.tone, formatVizReadoutHtml(d.title, "Evaluasi Instrumen P3G", d.c1, "Manajemen Holistik & Target", d.c2, ""), "cga_" + cur);
  }

  // =========================================================================
  // W2 (EXTRA). KALKULATOR INDEKS BARTHEL ADL (0–20 POIN)
  // =========================================================================
  function evalBarthelScore(sc) {
    var s = Math.round(clampNum(sc, 0, 20));
    if (s === 20) {
      return {
        score: s, cat: "Mandiri Penuh (20)", color: "var(--viz-green)", tone: "success",
        c1: "Skor Barthel <strong>20/20 = Mandiri (Independent)</strong> pada seluruh 10 aktivitas dasar hidup sehari-hari (makan, mandi, berdandan, berpakaian, kontrol BAB/BAK, penggunaan toilet, transfer, mobilitas, naik tangga).",
        c2: "Lanjutkan evaluasi menggunakan instrumen <strong>IADL Lawton (0–8)</strong> untuk mendeteksi hendaya dini fungsi eksekutif (mengelola obat, keuangan, telepon, transportasi)."
      };
    }
    if (s >= 12) {
      return {
        score: s, cat: "Ketergantungan Ringan (12–19)", color: "var(--accent-primary)", tone: "info",
        c1: "Skor Barthel <strong>" + s + "/20 = Ketergantungan Ringan (12–19)</strong>. Pasien memerlukan bantuan minimal pada satu atau dua aktivitas seperti naik tangga atau mandi.",
        c2: "Program latihan penguatan otot, evaluasi risiko jatuh (TUG), dan modifikasi kamar mandi (pegangan tangan / <em>grab bar</em>, alas anti-selip) dapat mencegah penurunan ke ketergantungan sedang."
      };
    }
    if (s >= 9) {
      return {
        score: s, cat: "Ketergantungan Sedang (9–11)", color: "var(--accent-secondary)", tone: "warning",
        c1: "Skor Barthel <strong>" + s + "/20 = Ketergantungan Sedang (9–11)</strong> (sering keluar di ujian Board: <strong>skor 10/20 = ketergantungan sedang</strong>). Pasien membutuhkan bantuan parsial dalam transfer, toileting, atau mobilitas.",
        c2: "Wajib melibatkan fisioterapi rehabilitasi medik, penyesuaian alat bantu jalan (<em>walker/tripod</em>), dan edukasi pendamping/keluarga."
      };
    }
    if (s >= 5) {
      return {
        score: s, cat: "Ketergantungan Berat (5–8)", color: "var(--accent-coral)", tone: "danger",
        c1: "Skor Barthel <strong>" + s + "/20 = Ketergantungan Berat (5–8)</strong>. Pasien bergantung pada pelaku rawat untuk sebagian besar aktivitas dasar harian.",
        c2: "Risiko tinggi sindrom dekondisi, jatuh saat transfer, serta kelelahan pengasuh (<em>caregiver burden</em> -> risiko <em>elderly mistreatment</em>)."
      };
    }
    return {
      score: s, cat: "Ketergantungan Total (0–4)", color: "var(--accent-coral)", tone: "danger",
      c1: "Skor Barthel <strong>" + s + "/20 = Ketergantungan Total (0–4)</strong>. Pasien mengalami imobilisasi berat/tirah baring dan memerlukan bantuan penuh pada seluruh fungsi ADL.",
      c2: "Terapkan protokol pencegahan komplikasi imobilisasi: <strong>reposisi miring kanan-kiri tiap 2 jam</strong>, kasur dekubitus, latihan ROM pasif mencegah kontraktur, dan evaluasi profilaksis DVT."
    };
  }

  function buildGeriBarthelSvg(sc) {
    var ev = evalBarthelScore(sc);
    var bands = [
      { rng: "0–4", lbl: "Total", min: 0, max: 4, col: "var(--accent-coral)" },
      { rng: "5–8", lbl: "Berat", min: 5, max: 8, col: "var(--accent-coral)" },
      { rng: "9–11", lbl: "Sedang", min: 9, max: 11, col: "var(--accent-secondary)" },
      { rng: "12–19", lbl: "Ringan", min: 12, max: 19, col: "var(--accent-primary)" },
      { rng: "20", lbl: "Mandiri", min: 20, max: 20, col: "var(--viz-green)" }
    ];
    var cards = bands.map(function (b, idx) {
      var x = 20 + idx * 89;
      var active = (ev.score >= b.min && ev.score <= b.max);
      var fill = active ? b.col : "var(--bg-surface)";
      var op = active ? "0.18" : "1";
      var stroke = active ? b.col : "var(--border-subtle)";
      var sw = active ? "2.2" : "1";
      return '<rect x="' + x + '" y="32" width="84" height="58" rx="8" fill="' + fill + '" fill-opacity="' + op + '" stroke="' + stroke + '" stroke-width="' + sw + '" />' +
        '<text x="' + (x + 42) + '" y="53" text-anchor="middle" font-size="10.5" font-weight="800" fill="' + (active ? b.col : "var(--text-primary)") + '">' + b.rng + '</text>' +
        '<text x="' + (x + 42) + '" y="73" text-anchor="middle" font-size="8.2" font-weight="700" fill="var(--text-muted)">' + b.lbl + '</text>';
    }).join("");

    return '<svg class="viz-svg" viewBox="0 0 480 158" role="img" aria-label="Kalkulator Indeks Barthel ADL">' +
      '<text x="20" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">KLASIFIKASI SKOR INDEKS BARTHEL ADL (0–20 POIN)</text>' +
      '<text x="460" y="18" text-anchor="end" font-size="10" font-weight="800" fill="' + ev.color + '">SKOR: ' + ev.score + '/20</text>' +
      cards +
      '<rect x="20" y="100" width="440" height="46" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="118" font-size="8.5" font-weight="800" fill="' + ev.color + '">KATEGORI FUNGSIONAL: ' + ev.cat.toUpperCase() + '</text>' +
      '<text x="32" y="135" font-size="8" font-weight="700" fill="var(--text-primary)">10 Item: Makan, Mandi, Berdandan, Berpakaian, BAB, BAK, Toilet, Transfer, Mobilitas, Tangga</text>' +
      '</svg>';
  }

  function renderGeriBarthelAdlWidget() {
    var sc = geriVizState.barthelScore;
    var ev = evalBarthelScore(sc);
    var slider = '<div class="viz-controls"><div class="viz-slider-row"><label class="viz-slider-label" for="geri-barthel-slider">Total Skor Indeks Barthel ADL</label><span class="viz-value-pill" id="geri-barthel-pill">' + sc + ' / 20 Poin</span></div><input type="range" id="geri-barthel-slider" class="viz-range" min="0" max="20" step="1" value="' + sc + '" oninput="window.InternaApp.calcGeriBarthelAdl(this.value)" /></div>';
    return renderCardioWidgetCard({
      key: "geriBarthel",
      title: "Kalkulator Status Fungsional Indeks Barthel ADL (Standar P3G 0–20 Poin)",
      tag: "KALKULATOR ADL",
      controlsTop: slider,
      svgHtml: buildGeriBarthelSvg(sc),
      legendHtml: "",
      info: { tone: ev.tone, rKey: "barthel_" + ev.cat, title: "Interpretasi Barthel: " + ev.cat, c1Label: "Makna Klinis Skor ADL", c1Body: ev.c1, c2Label: "Tindak Lanjut Rehabilitasi & P3G", c2Body: ev.c2 },
      readoutFooter: ""
    });
  }

  function calcGeriBarthelAdl(val) {
    geriVizState.barthelScore = Math.round(clampNum(val, 0, 20));
    var sc = geriVizState.barthelScore;
    var ev = evalBarthelScore(sc);
    syncSliderAndPill("geri-barthel-slider", "geri-barthel-pill", sc, sc + " / 20 Poin");
    swapVizSvgFrame("viz-geriBarthel-frame", buildGeriBarthelSvg(sc));
    updateVizReadout("viz-geriBarthel-readout", ev.tone, formatVizReadoutHtml("Interpretasi Barthel: " + ev.cat, "Makna Klinis Skor ADL", ev.c1, "Tindak Lanjut Rehabilitasi & P3G", ev.c2, ""), "barthel_" + ev.cat);
  }

  // =========================================================================
  // W3. POLIFARMASI, BEERS CRITERIA, ACB & PRESCRIBING CASCADE
  // =========================================================================
  var GERI_BEERS_CASES = {
    acb_delirium: {
      label: "Beban Antikolinergik",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Toksisitas Antikolinergik Tinggi (ACB >=3) & Benzodiazepin (AGS Beers)",
      step1: "Amitriptilin / Difenhidramin / Alprazolam",
      step2: "Blokade Reseptor Muskarinik M1 Sentral & GABA",
      step3: "Delirium Akut, Jatuh, Retensi Urin & Konstipasi",
      action: "STOP segera/tapering; ganti Depresi -> Sertralin (SSRI)",
      c1: "<strong>Obat PIMs (AGS Beers):</strong> Antidepresan trisiklik (<strong>amitriptilin</strong>, ACB=3), antihistamin generasi-1 (difenhidramin/klorfeniramin, ACB=3), dan benzodiazepin (<strong>alprazolam/lorazepam/diazepam</strong>) memicu <strong>delirium akut, jatuh, dan fraktur panggul</strong>.",
      c2: "<strong>Alternatif Aman:</strong> Untuk depresi lansia gunakan <strong>SSRI (sertralin)</strong>; bila disertai insomnia berat dapat dipilih trazodon dosis rendah + <em>sleep hygiene</em>, bukan amitriptilin atau benzodiazepin."
    },
    cascade_edema: {
      label: "Kaskade Amlodipin",
      color: "var(--accent-secondary)",
      tone: "warning",
      title: "Prescribing Cascade: Amlodipin -> Edema Pretibial -> Furosemid -> Jatuh",
      step1: "Amlodipin 10 mg (Vasodilatasi Pre-kapiler)",
      step2: "Edema Tungkai disalahartikan Gagal Jantung",
      step3: "Ditambah Furosemid -> Dehidrasi & Hipotensi Ortostatik",
      action: "Hentikan Furosemid; turunkan dosis Amlodipin / kombinasikan ACEi/ARB",
      c1: "<strong>Mekanisme Prescribing Cascade:</strong> Efek samping obat pertama (edema perifer akibat vasodilatasi arteriol selektif <strong>amlodipin</strong>) disalahartikan sebagai penyakit baru sehingga diresepkan <strong>furosemid</strong>.",
      c2: "<strong>Akibat Klinis:</strong> Diuretik loop yang tidak perlu pada lansia memicu <strong>deplesi volume, hipotensi ortostatik, hipokalemia, jatuh, dan inkontinensia urgensi</strong>."
    },
    cascade_parkinson: {
      label: "Kaskade Metoklopramid",
      color: "var(--viz-purple)",
      tone: "warning",
      title: "Prescribing Cascade: Metoklopramid / Haloperidol -> Parkinsonisme -> Levodopa",
      step1: "Metoklopramid / Antipsikotik Tipikal Kronik",
      step2: "Blokade Reseptor Dopamin D2 Striatum",
      step3: "Tremor/Rigiditas disalahartikan Parkinson Primer -> Diberi Levodopa",
      action: "Hentikan Metoklopramid; jangan tambah obat antiparkinson baru",
      c1: "<strong>Kaskade Lain yang Sering Diujikan:</strong> (1) <strong>Metoklopramid</strong> -> parkinsonisme imbas obat -> diberi levodopa; (2) <strong>NSAID</strong> -> kenaikan tekanan darah -> ditambah antihipertensi; (3) <strong>Donepezil</strong> -> inkontinensia urgensi -> ditambah antikolinergik (antagonisme langsung!).",
      c2: "<strong>Aturan Emas Geriatri:</strong> Setiap gejala baru pada pasien lansia harus selalu dicurigai sebagai <strong>efek samping obat yang sedang dikonsumsi</strong> sampai terbukti sebaliknya."
    },
    su_hypo: {
      label: "Sulfonilurea & DM Lansia",
      color: "var(--accent-primary)",
      tone: "danger",
      title: "Hipoglikemia Sulfonilurea (Glibenklamid / Glimepirid) & Target HbA1c Lansia",
      step1: "Glibenklamid / Glimepirid pada eGFR Menurun",
      step2: "Akumulasi Metabolit Aktif -> Neuroglikopenia",
      step3: "Delirium / Penurunan Kesadaran Berulang",
      action: "STOP Sulfonilurea, Infus Dekstrosa rumatan + Observasi 24–48 jam",
      c1: "<strong>Bahaya Sulfonilurea pada Lansia:</strong> Glibenklamid dan glimepirid memiliki waktu paruh panjang dan metabolit aktif yang terakumulasi saat fungsi ginjal lansia menurun, menyebabkan <strong>hipoglikemia berkepanjangan/rekuren</strong>.",
      c2: "<strong>Target HbA1c Individual (PERKENI/ADA):</strong> Lansia sehat mandiri (<em>fit</em>): <strong>&lt;7,0–7,5%</strong>; lansia multimorbid/ketergantungan sedang: <strong>&lt;8,0%</strong>; lansia sangat renta (<em>frail</em>/demensia berat): cukup hindari hipoglikemia &amp; hiperglikemia simtomatik."
    }
  };

  function buildGeriBeersSvg(cKey) {
    var d = GERI_BEERS_CASES[cKey] || GERI_BEERS_CASES.acb_delirium;
    return '<svg class="viz-svg" viewBox="0 0 480 186" role="img" aria-label="Alur Polifarmasi dan Prescribing Cascade">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">ALUR IATROGENESIS OBAT &amp; PRESCRIBING CASCADE</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      // Box 1
      '<rect x="18" y="26" width="136" height="82" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="28" y="42" font-size="7.8" font-weight="800" fill="var(--text-muted)">1. OBAT PEMICU AWAL</text>' +
      svgWrap(d.step1, 28, 57, 20, 11.5, 'font-size="8.4" font-weight="800" fill="var(--text-primary)"') +
      // Arrow 1
      '<line x1="156" y1="67" x2="170" y2="67" stroke="var(--border-strong)" stroke-width="2" />' +
      // Box 2
      '<rect x="172" y="26" width="136" height="82" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="182" y="42" font-size="7.8" font-weight="800" fill="var(--text-muted)">2. MEKANISME / JEBAKAN</text>' +
      svgWrap(d.step2, 182, 57, 20, 11.5, 'font-size="8.4" font-weight="700" fill="var(--text-primary)"') +
      // Arrow 2
      '<line x1="310" y1="67" x2="324" y2="67" stroke="var(--border-strong)" stroke-width="2" />' +
      // Box 3
      '<rect x="326" y="26" width="136" height="82" rx="10" fill="' + d.color + '" fill-opacity="0.12" stroke="' + d.color + '" stroke-width="1.8" />' +
      '<text x="336" y="42" font-size="7.8" font-weight="800" fill="' + d.color + '">3. DAMPAK IATROGENIK</text>' +
      svgWrap(d.step3, 336, 57, 20, 11.5, 'font-size="8.4" font-weight="800" fill="' + d.color + '"') +
      // Bottom Action Banner
      '<rect x="18" y="120" width="444" height="54" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="30" y="138" font-size="8" font-weight="800" fill="var(--viz-green)">SOLUSI DEPRESCRIBING (AGS BEERS / STOPP-START):</text>' +
      svgWrap(d.action, 30, 154, 66, 11.5, 'font-size="8.6" font-weight="800" fill="var(--text-primary)"') +
      '</svg>';
  }

  function renderGeriBeersAcbWidget() {
    var cur = geriVizState.beersCase;
    var d = GERI_BEERS_CASES[cur] || GERI_BEERS_CASES.acb_delirium;
    var tabs = Object.keys(GERI_BEERS_CASES).map(function (k) {
      return { key: k, label: GERI_BEERS_CASES[k].label, onclick: "window.InternaApp.updateGeriBeersViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "geriBeers",
      title: "Simulator Polifarmasi, Kriteria AGS Beers, ACB & Prescribing Cascade",
      tag: "BEERS & ACB",
      controlsTop: renderCardioTabRow("viz-geriBeers-tabs", tabs, cur),
      svgHtml: buildGeriBeersSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "PIMs / Risiko Tinggi" },
        { color: "var(--accent-secondary)", label: "Prescribing Cascade" },
        { color: "var(--viz-green)", label: "Target Deprescribing" }
      ]),
      info: { tone: d.tone, rKey: "beers_" + cur, title: d.title, c1Label: "Analisis Farmakoterapi Geriatri", c1Body: d.c1, c2Label: "Panduan Deprescribing & Target Klinis", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriBeersViz(key) {
    if (GERI_BEERS_CASES[key]) geriVizState.beersCase = key;
    var cur = geriVizState.beersCase;
    var d = GERI_BEERS_CASES[cur];
    syncVizPresets("viz-geriBeers-tabs", Object.keys(GERI_BEERS_CASES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-geriBeers-frame", buildGeriBeersSvg(cur));
    updateVizReadout("viz-geriBeers-readout", d.tone, formatVizReadoutHtml(d.title, "Analisis Farmakoterapi Geriatri", d.c1, "Panduan Deprescribing & Target Klinis", d.c2, ""), "beers_" + cur);
  }

  // =========================================================================
  // W4. ALGORITMA CAM DELIRIUM & MATRIKS 3D (DELIRIUM vs DEMENSIA vs DEPRESI)
  // =========================================================================
  var GERI_CAM_PROFILES = {
    delirium_hypo: {
      label: "Delirium Hipoaktif",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Delirium Akut Tipe Hipoaktif — CAM Positif (Fitur 1 + 2 + 4)",
      cam: [true, true, false, true],
      camRes: "CAM POSITIF (Delirium Akut)",
      onset: "Akut (jam–hari) & berfluktuasi",
      attn: "Inatensi nyata (mudah teralihkan)",
      consc: "Letargi / mengantuk / apatis",
      tx: "Atasi kausa (infeksi/dehidrasi/obat) + Reorientasi (TANPA haloperidol rutin)",
      c1: "<strong>Kriteria CAM Positif:</strong> Memenuhi <strong>Fitur 1 (Onset akut &amp; fluktuatif) + Fitur 2 (Inatensi)</strong> ditambah <strong>Fitur 4 (Penurunan kesadaran/letargi)</strong>. Subtipe hipoaktif paling sering luput didiagnosis karena disangka depresi atau kelelahan biasa.",
      c2: "<strong>Tata Laksana Utama:</strong> Cari dan koreksi pencetus (pneumonia, ISK, dehidrasi, hiponatremia, efek alprazolam/kodein) serta optimalkan non-farmakologis (reorientasi, kacamata/alat bantu dengar, mobilisasi). <strong>Jangan beri antipsikotik</strong> pada delirium hipoaktif yang tenang."
    },
    delirium_hyper: {
      label: "Delirium Hiperaktif",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Delirium Akut Tipe Hiperaktif / Campuran — Agitasi Mengancam Keselamatan",
      cam: [true, true, true, true],
      camRes: "CAM POSITIF (Agitasi Berat)",
      onset: "Mendadak, memburuk malam (sundowning)",
      attn: "Inatensi berat & pikiran kacau",
      consc: "Hipervigilans / gelisah / menarik NGT",
      tx: "Koreksi pencetus + Non-farmakologis + Haloperidol dosis rendah 0,5 mg",
      c1: "<strong>Indikasi Farmakoterapi Delirium:</strong> Bila pasien mengalami agitasi hebat yang <strong>membahayakan keselamatan diri/orang lain atau mengancam prosedur medis penting</strong> (menarik selang NGT, kateter, atau infus).",
      c2: "<strong>Obat Pilihan:</strong> <strong>Haloperidol dosis rendah (0,5–1 mg PO/IM/IV)</strong> dengan pemantauan interval QTc dan gejala ekstrapiramidal. Hindari benzodiazepin (kecuali delirium tremens/putus alkohol) karena memperberat delirium!"
    },
    dementia_ad: {
      label: "Demensia Kronik",
      color: "var(--accent-primary)",
      tone: "info",
      title: "Demensia Kronik Progresif — CAM Negatif (Tanpa Onset Akut/Inatensi Dini)",
      cam: [false, false, true, false],
      camRes: "CAM NEGATIF (Demensia Kronik)",
      onset: "Perlahan (bulan–tahun), progresif",
      attn: "Atensi relatif utuh hingga tahap lanjut",
      consc: "Kompos mentis (sadar penuh)",
      tx: "Donepezil/Rivastigmin (ringan-sedang) atau Memantin (sedang-berat)",
      c1: "<strong>Pembeda Kunci dari Delirium:</strong> Pada demensia tanpa tumpang tindih delirium, <strong>kesadaran pasien jernih (kompos mentis)</strong> dan <strong>atensi relatif terjaga</strong> pada stadium awal-menengah, sementara penurunan memori berlangsung berbulan-bulan/bertahun-tahun.",
      c2: "<strong>Kewaspadaan Klinis:</strong> Demensia pra-morbid merupakan <strong>faktor predisposisi terkuat</strong> terjadinya delirium akut saat lansia mengalami infeksi, pembedahan, atau polifarmasi (<em>delirium superimposed on dementia</em>)."
    },
    depression_gds: {
      label: "Depresi (Pseudodemensia)",
      color: "var(--accent-secondary)",
      tone: "warning",
      title: "Depresi Lansia (Pseudodementia) — CAM Negatif, Skrining GDS-15 >=5",
      cam: [false, false, false, false],
      camRes: "CAM NEGATIF (Evaluasi GDS-15)",
      onset: "Subakut (minggu–bulan), terkait stresor",
      attn: "Mudah menyerah ('Saya tidak tahu')",
      consc: "Kompos mentis, afek murung/anhedonia",
      tx: "SSRI Sertralin (lanjutkan rumatan 4–9 bulan setelah perbaikan)",
      c1: "<strong>Ciri Pseudodemensia Depresi:</strong> Pasien tampak mengeluhkan gangguan memori secara dramatis dan sering menjawab <em>'Saya tidak tahu'</em> pada uji MMSE akibat kurangnya motivasi, disertai skor <strong>GDS-15 &ge;5 (curiga) atau &ge;10 (depresi)</strong>.",
      c2: "<strong>Terapi Antidepresan Lansia:</strong> Lini pertama adalah <strong>SSRI (Sertralin)</strong> yang wajib dilanjutkan selama <strong>4–9 bulan fase rumatan</strong> setelah gejala membaik untuk mencegah relaps."
    }
  };

  function buildGeriCamSvg(pKey) {
    var d = GERI_CAM_PROFILES[pKey] || GERI_CAM_PROFILES.delirium_hypo;
    var feats = [
      { code: "F1 (Wajib)", name: "Onset Akut & Fluktuasi", on: d.cam[0] },
      { code: "F2 (Wajib)", name: "Inatensi (Sulit Fokus)", on: d.cam[1] },
      { code: "F3 (Salah 1)", name: "Pikir Tidak Terorganisir", on: d.cam[2] },
      { code: "F4 (Salah 1)", name: "Perubahan Kesadaran", on: d.cam[3] }
    ];
    var fBoxes = feats.map(function (f, idx) {
      var y = 38 + idx * 33;
      var col = f.on ? "var(--accent-coral)" : "var(--border-strong)";
      var bg = f.on ? "var(--accent-coral)" : "var(--bg-surface)";
      var op = f.on ? "0.14" : "1";
      var badge = f.on ? "YA" : "TIDAK";
      return '<rect x="24" y="' + y + '" width="204" height="27" rx="6" fill="' + bg + '" fill-opacity="' + op + '" stroke="' + col + '" stroke-width="1.4" />' +
        '<text x="32" y="' + (y + 17) + '" font-size="7.8" font-weight="800" fill="var(--text-primary)">' + f.code + ': ' + f.name + '</text>' +
        '<text x="220" y="' + (y + 17) + '" text-anchor="end" font-size="7.8" font-weight="800" fill="' + (f.on ? "var(--accent-coral)" : "var(--text-muted)") + '">' + badge + '</text>';
    }).join("");

    return '<svg class="viz-svg" viewBox="0 0 480 196" role="img" aria-label="Algoritma CAM Delirium dan Matriks 3D">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">ALGORITMA CAM (F1 + F2 WAJIB + [F3 ATAU F4])</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.camRes + '</text>' +
      '<rect x="16" y="24" width="220" height="158" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      fBoxes +
      '<rect x="246" y="24" width="218" height="158" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="258" y="42" font-size="8" font-weight="800" fill="var(--text-muted)">ONSET &amp; PERJALANAN</text>' +
      '<text x="258" y="55" font-size="8.4" font-weight="700" fill="var(--text-primary)">' + escapeHtml(d.onset) + '</text>' +
      '<text x="258" y="75" font-size="8" font-weight="800" fill="var(--text-muted)">ATENSI &amp; KESADARAN</text>' +
      '<text x="258" y="88" font-size="8.2" font-weight="700" fill="var(--text-primary)">' + escapeHtml(d.attn) + '</text>' +
      '<text x="258" y="101" font-size="8.2" font-weight="700" fill="' + d.color + '">' + escapeHtml(d.consc) + '</text>' +
      '<line x1="258" y1="112" x2="452" y2="112" stroke="var(--border-subtle)" />' +
      '<text x="258" y="126" font-size="8" font-weight="800" fill="var(--text-muted)">PRINSIP TATA LAKSANA</text>' +
      svgWrap(d.tx, 258, 140, 31, 11.5, 'font-size="8.3" font-weight="800" fill="' + d.color + '"') +
      '</svg>';
  }

  function renderGeriCamDeliriumWidget() {
    var cur = geriVizState.camProfile;
    var d = GERI_CAM_PROFILES[cur] || GERI_CAM_PROFILES.delirium_hypo;
    var tabs = Object.keys(GERI_CAM_PROFILES).map(function (k) {
      return { key: k, label: GERI_CAM_PROFILES[k].label, onclick: "window.InternaApp.updateGeriCamViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "geriCam",
      title: "Algoritma Confusion Assessment Method (CAM) & Matriks 3D (Delirium vs Demensia vs Depresi)",
      tag: "CAM & DIFERENSIAL 3D",
      controlsTop: renderCardioTabRow("viz-geriCam-tabs", tabs, cur),
      svgHtml: buildGeriCamSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "Fitur CAM Positif / Delirium" },
        { color: "var(--accent-primary)", label: "Demensia Kronik" },
        { color: "var(--accent-secondary)", label: "Depresi Lansia (GDS-15)" }
      ]),
      info: { tone: d.tone, rKey: "cam_" + cur, title: d.title, c1Label: "Kriteria Diagnostik & Pembeda", c1Body: d.c1, c2Label: "Tata Laksana Berbasis Bukti", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriCamViz(key) {
    if (GERI_CAM_PROFILES[key]) geriVizState.camProfile = key;
    var cur = geriVizState.camProfile;
    var d = GERI_CAM_PROFILES[cur];
    syncVizPresets("viz-geriCam-tabs", Object.keys(GERI_CAM_PROFILES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-geriCam-frame", buildGeriCamSvg(cur));
    updateVizReadout("viz-geriCam-readout", d.tone, formatVizReadoutHtml(d.title, "Kriteria Diagnostik & Pembeda", d.c1, "Tata Laksana Berbasis Bukti", d.c2, ""), "cam_" + cur);
  }

  // =========================================================================
  // W5. ATLAS NEUROANATOMI & FENOTIPE DEMENSIA (ALZHEIMER vs VASKULAR vs DLB)
  // =========================================================================
  var GERI_DEM_DATA = {
    alzheimer: {
      label: "Alzheimer (AD)",
      color: "var(--accent-primary)",
      tone: "info",
      title: "Demensia Alzheimer — Atrofi Hipokampus/Temporoparietal & Plak Amiloid-Tau",
      region: "Hipokampus & Korteks Temporoparietal",
      pathology: "Plak Beta-Amiloid + Neurofibrillary Tangles (Tau)",
      course: "Progresif perlahan, diawali amnesia episodik baru, Hachinski <=4",
      tx: "Ringan-Sedang: Donepezil/Rivastigmin | Sedang-Berat: Memantin (NMDA)",
      c1: "<strong>Ciri Klinis &amp; Patologi:</strong> Penurunan memori episodik jangka pendek yang progresif perlahan disertai apraksia/agnosia/afasia dan gangguan ADL (misal Barthel menurun). Skor Iskemik Hachinski rendah (&le;4).",
      c2: "<strong>Pilihan Farmakoterapi:</strong> Inhibitor kolinesterase (donepezil, rivastigmin, galantamin) untuk derajat ringan–sedang, serta <strong>antagonis reseptor NMDA (Memantin)</strong> untuk demensia derajat sedang–berat."
    },
    vascular: {
      label: "Demensia Vaskular",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Demensia Vaskular (VaD) — Infark Multipel/Lakunar & Stepwise Deterioration",
      region: "Substansia Alba Subkortikal & Infark Kortikal Multipel",
      pathology: "Infark Serebri Multipel / Penyakit Pembuluh Darah Kecil",
      course: "Memburuk bertahap (stepwise), defisit fokal, Skor Hachinski >=7",
      tx: "Kendali faktor risiko vaskular (HT, DM, antiplatelet/antikoagulan) + Kolinesterase",
      c1: "<strong>Pembeda Utama:</strong> Riwayat strok/TIA, perjalanan klinis memburuk secara bertangga (<em>stepwise deterioration</em>), tanda neurologis fokal, gangguan fungsi eksekutif dini, dan <strong>Skor Iskemik Hachinski &ge;7</strong> (sering 8–15 pada soal Board).",
      c2: "<strong>VCI vs Demensia Vaskular:</strong> Bila pasca-strok/TIA terdapat penurunan kognitif ringan (misal MMSE 25) tetapi <strong>ADL Barthel masih mandiri penuh (20/20)</strong>, diagnosisnya adalah <strong>Vascular Cognitive Impairment (VCI) non-demensia</strong>."
    },
    dlb: {
      label: "Lewy Body (DLB)",
      color: "var(--viz-purple)",
      tone: "warning",
      title: "Demensia Lewy Body (DLB) — Halusinasi Visual, Parkinsonisme & Bahaya Neuroleptik",
      region: "Korteks Oksipital-Parietal & Substansia Nigra",
      pathology: "Agregat Protein Alfa-Sinuklein (Badan Lewy Intrasitoplasmik)",
      course: "Fluktuasi kognitif + Halusinasi visual rinci + Parkinsonisme + REM sleep",
      tx: "Rivastigmin; KONTRAINDIKASI antipsikotik tipikal (Haloperidol)!",
      c1: "<strong> Kriteria Inti DLB:</strong> (1) Fluktuasi kognitif/kewaspadaan; (2) <strong>Halusinasi visual yang terperinci dan berulang</strong>; (3) Gejala <strong>parkinsonisme</strong> spontan; dan (4) Gangguan perilaku tidur REM.",
      c2: "<strong>Jebakan Fatal Ujian:</strong> Pasien DLB memiliki <strong>hipersensitivitas neuroleptik berat</strong>; pemberian antipsikotik tipikal seperti haloperidol dapat memicu rigiditas ekstrem, sindrom neuroleptik maligna, hingga kematian."
    },
    mci_vci: {
      label: "MCI & Workup Reversibel",
      color: "var(--viz-green)",
      tone: "success",
      title: "MCI, VCI Non-Demensia & Evaluasi Kausa Kognitif Reversibel (TSH & Vitamin B12)",
      region: "Kapasitas Fungsional ADL Masih Utuh (Barthel 20/20)",
      pathology: "Singkirkan Hipotiroidisme, Defisiensi B12, NPH & Depresi",
      course: "Keluhan memori subjektif/objektif ringan, namun ADL mandiri penuh",
      tx: "Wajib cek laboratorium TSH & kadar Vitamin B12 serum + Latihan kognitif",
      c1: "<strong>Batas MCI vs Demensia:</strong> Penentu utama yang membedakan MCI/VCI non-demensia dari demensia sejati adalah <strong>kemandirian aktivitas hidup sehari-hari (ADL) yang masih utuh</strong> meskipun skor kognitif sedikit menurun (MMSE ~24–26).",
      c2: "<strong>Workup Reversibel Wajib (PAPDI/AAN):</strong> Setiap pasien lansia dengan keluhan penurunan kognitif wajib menjalani pemeriksaan <strong>fungsi tiroid (TSH) dan kadar Vitamin B12 serum</strong> untuk menyingkirkan kausa metabolik yang dapat disembuhkan."
    }
  };

  function buildGeriDemSvg(dKey) {
    var d = GERI_DEM_DATA[dKey] || GERI_DEM_DATA.alzheimer;
    var hlHippocampus = (dKey === "alzheimer") ? 'fill="var(--accent-primary)" fill-opacity="0.65"' : 'fill="var(--border-subtle)"';
    var hlVascular = (dKey === "vascular") ? 'fill="var(--accent-coral)" fill-opacity="0.75"' : 'fill="none"';
    var hlOccipital = (dKey === "dlb") ? 'fill="var(--viz-purple)" fill-opacity="0.65"' : 'fill="var(--border-subtle)"';

    return '<svg class="viz-svg" viewBox="0 0 480 198" role="img" aria-label="Atlas Neuroanatomi Demensia">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">ATLAS KORELASI NEUROANATOMI &amp; SUBTIPE KOGNITIF</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      // Left Brain Schematic
      '<rect x="18" y="24" width="184" height="160" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      // Outer cortex silhouette
      '<path d="M 48 115 C 42 72, 72 44, 114 44 C 154 44, 180 68, 178 106 C 177 132, 156 146, 132 144 L 114 144 C 95 144, 54 142, 48 115 Z" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2.2" />' +
      // Ventricles
      '<path d="M 94 84 Q 112 74 128 86 Q 114 94 94 84 Z" fill="var(--border-strong)" fill-opacity="0.35" />' +
      // Hippocampus / Temporal lobe region
      '<ellipse cx="110" cy="116" rx="24" ry="12" ' + hlHippocampus + ' stroke="var(--accent-primary)" stroke-width="1.4" />' +
      '<text x="110" y="119" text-anchor="middle" font-size="7" font-weight="800" fill="var(--text-primary)">Hipokampus</text>' +
      // Occipital / Substantia nigra Lewy region
      '<circle cx="158" cy="102" r="14" ' + hlOccipital + ' stroke="var(--viz-purple)" stroke-width="1.4" />' +
      '<text x="158" y="105" text-anchor="middle" font-size="6.8" font-weight="800" fill="var(--text-primary)">Oksipital</text>' +
      // Vascular infarcts
      '<circle cx="82" cy="68" r="7" ' + hlVascular + ' stroke="var(--accent-coral)" stroke-width="1.5" stroke-dasharray="2,2" />' +
      '<circle cx="132" cy="66" r="8" ' + hlVascular + ' stroke="var(--accent-coral)" stroke-width="1.5" stroke-dasharray="2,2" />' +
      '<text x="110" y="168" text-anchor="middle" font-size="7.6" font-weight="800" fill="' + d.color + '">Fokus: ' + (dKey === "alzheimer" ? "Atrofi Hipokampus" : dKey === "vascular" ? "Infark Multipel" : dKey === "dlb" ? "Badan Lewy Kortikal" : "ADL Utuh + Cek TSH/B12") + '</text>' +
      // Right Clinical Details Card
      '<rect x="212" y="24" width="250" height="160" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="224" y="41" font-size="7.8" font-weight="800" fill="var(--text-muted)">PREDILEKSI ANATOMI &amp; PATOLOGI</text>' +
      svgWrap(d.region + " — " + d.pathology, 224, 54, 37, 11, 'font-size="8.2" font-weight="700" fill="var(--text-primary)"') +
      '<text x="224" y="92" font-size="7.8" font-weight="800" fill="var(--text-muted)">PERJALANAN KLINIS &amp; SKOR HACHINSKI</text>' +
      svgWrap(d.course, 224, 105, 37, 11, 'font-size="8.2" font-weight="700" fill="var(--text-primary)"') +
      '<line x1="224" y1="132" x2="450" y2="132" stroke="var(--border-subtle)" />' +
      '<text x="224" y="146" font-size="7.8" font-weight="800" fill="var(--text-muted)">TERAPI SPESIFIK &amp; KEWASPADAAN</text>' +
      svgWrap(d.tx, 224, 159, 37, 11, 'font-size="8.2" font-weight="800" fill="' + d.color + '"') +
      '</svg>';
  }

  function renderGeriDementiaDomainsWidget() {
    var cur = geriVizState.demType;
    var d = GERI_DEM_DATA[cur] || GERI_DEM_DATA.alzheimer;
    var tabs = Object.keys(GERI_DEM_DATA).map(function (k) {
      return { key: k, label: GERI_DEM_DATA[k].label, onclick: "window.InternaApp.updateGeriDemViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "geriDem",
      title: "Atlas Neuroanatomi & Fenotipe Demensia (Alzheimer vs Vaskular vs Lewy Body vs MCI)",
      tag: "ATLAS DEMENSIA",
      controlsTop: renderCardioTabRow("viz-geriDem-tabs", tabs, cur),
      svgHtml: buildGeriDemSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-primary)", label: "Alzheimer (Hipokampus)" },
        { color: "var(--accent-coral)", label: "Vaskular (Infark Stepwise)" },
        { color: "var(--viz-purple)", label: "Lewy Body (Oksipital/SN)" },
        { color: "var(--viz-green)", label: "MCI / Reversibel (TSH/B12)" }
      ]),
      info: { tone: d.tone, rKey: "dem_" + cur, title: d.title, c1Label: "Karakteristik Diagnostik", c1Body: d.c1, c2Label: "Farmakoterapi & Mutiara Ujian", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriDemViz(key) {
    if (GERI_DEM_DATA[key]) geriVizState.demType = key;
    var cur = geriVizState.demType;
    var d = GERI_DEM_DATA[cur];
    syncVizPresets("viz-geriDem-tabs", Object.keys(GERI_DEM_DATA).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-geriDem-frame", buildGeriDemSvg(cur));
    updateVizReadout("viz-geriDem-readout", d.tone, formatVizReadoutHtml(d.title, "Karakteristik Diagnostik", d.c1, "Farmakoterapi & Mutiara Ujian", d.c2, ""), "dem_" + cur);
  }

  // =========================================================================
  // W7. SIMULATOR PERGESERAN ELEKTROLIT & TIAMIN REFEEDING SYNDROME (rAF: geriRefeed)
  // =========================================================================
  function evalRefeedingDay(day, mode) {
    var t = clampNum(day, 0, 5);
    var isAgg = (mode !== "safe_nice");
    // Phosphate normal 2.5 - 4.5 mg/dL; drops sharply day 1-3 in aggressive refeeding
    var dip = Math.sin((Math.min(t, 4.2) / 4.2) * Math.PI);
    var po4 = isAgg ? (3.2 - 2.1 * dip) : (3.2 - 0.55 * dip);
    var k = isAgg ? (4.1 - 1.3 * dip) : (4.1 - 0.35 * dip);
    var mg = isAgg ? (2.0 - 0.7 * dip) : (2.0 - 0.2 * dip);
    var tone = (po4 < 1.8) ? "danger" : (po4 < 2.5 ? "warning" : "success");
    return {
      day: t,
      isAgg: isAgg,
      po4: po4.toFixed(2),
      k: k.toFixed(2),
      mg: mg.toFixed(2),
      tone: tone,
      title: isAgg
        ? "Refeeding Agresif Hari ke-" + t.toFixed(1) + " — Lonjakan Insulin & Hipofosfatemia Berat"
        : "Protokol NICE Aman Hari ke-" + t.toFixed(1) + " (10 kkal/kg + Tiamin 200–300 mg)",
      c1: "<strong>Penanda Elektrolit Utama (Hallmark):</strong> Re-introduksi karbohidrat memicu sekresi insulin mendadak yang mendorong <strong>Fosfat (PO4: " + po4.toFixed(2) + " mg/dL)</strong>, <strong>Kalium (K: " + k.toFixed(2) + " mEq/L)</strong>, dan <strong>Magnesium (Mg: " + mg.toFixed(2) + " mg/dL)</strong> masuk ke intraseluler untuk sintesis ATP.",
      c2: "<strong>Pencegahan Wajib (NICE):</strong> Berikan <strong>Tiamin (Vitamin B1) 200–300 mg/hari minimal 30 menit sebelum makan</strong> (mencegah ensefalopati Wernicke), mulai kalori rendah <strong>10 kkal/kgBB/hari</strong> pada risiko tinggi, dan pantau PO4/K/Mg harian."
    };
  }

  function buildGeriRefeedSvg(day, mode) {
    var ev = evalRefeedingDay(day, mode);
    var x0 = 44, x1 = 290, yTop = 34, yBot = 156;
    var ptsPo4 = [], ptsK = [], ptsMg = [];
    for (var i = 0; i <= 25; i++) {
      var dVal = (i / 25) * 5;
      var st = evalRefeedingDay(dVal, mode);
      var px = x0 + (dVal / 5) * (x1 - x0);
      var yP = yBot - ((parseFloat(st.po4) - 0.8) / 3.6) * (yBot - yTop);
      var yK = yBot - ((parseFloat(st.k) - 2.0) / 3.0) * (yBot - yTop);
      var yM = yBot - ((parseFloat(st.mg) - 1.0) / 1.6) * (yBot - yTop);
      ptsPo4.push([px, yP]);
      ptsK.push([px, yK]);
      ptsMg.push([px, yM]);
    }
    var curX = x0 + (ev.day / 5) * (x1 - x0);
    var curPo4Y = yBot - ((parseFloat(ev.po4) - 0.8) / 3.6) * (yBot - yTop);

    return '<svg class="viz-svg" viewBox="0 0 480 188" role="img" aria-label="Grafik Elektrolit Refeeding Syndrome">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">KURVA ELEKTROLIT SERUM HARI KE-0 S/D KE-5 REFEEDING</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + (ev.isAgg ? "var(--accent-coral)" : "var(--viz-green)") + '">PO4: ' + ev.po4 + ' mg/dL</text>' +
      '<rect x="20" y="24" width="282" height="148" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      // Danger threshold line for PO4 < 2.0
      '<line x1="' + x0 + '" y1="115" x2="' + x1 + '" y2="115" stroke="var(--accent-coral)" stroke-width="1" stroke-dasharray="3,3" />' +
      '<text x="' + (x0 + 4) + '" y="111" font-size="7" font-weight="700" fill="var(--accent-coral)">Batas Kritis Hipofosfatemia</text>' +
      '<path d="' + buildSmoothSvgPath(ptsPo4) + '" fill="none" stroke="var(--accent-coral)" stroke-width="2.6" />' +
      '<path d="' + buildSmoothSvgPath(ptsK) + '" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4,2" />' +
      '<path d="' + buildSmoothSvgPath(ptsMg) + '" fill="none" stroke="var(--accent-secondary)" stroke-width="2" />' +
      '<line x1="' + curX.toFixed(1) + '" y1="' + yTop + '" x2="' + curX.toFixed(1) + '" y2="' + yBot + '" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="2,2" />' +
      '<circle cx="' + curX.toFixed(1) + '" cy="' + curPo4Y.toFixed(1) + '" r="4.5" fill="var(--accent-coral)" stroke="var(--bg-surface)" stroke-width="1.5" />' +
      '<text x="44" y="168" font-size="7.2" font-weight="700" fill="var(--text-muted)">H0</text>' +
      '<text x="167" y="168" text-anchor="middle" font-size="7.2" font-weight="700" fill="var(--text-muted)">H2.5 (Nadir)</text>' +
      '<text x="288" y="168" text-anchor="end" font-size="7.2" font-weight="700" fill="var(--text-muted)">H5</text>' +
      // Right Readout Box
      '<rect x="312" y="24" width="150" height="148" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="322" y="42" font-size="7.8" font-weight="800" fill="var(--text-muted)">PANEL HARI KE-' + ev.day.toFixed(1) + '</text>' +
      '<text x="322" y="60" font-size="8.5" font-weight="800" fill="var(--accent-coral)">Fosfat: ' + ev.po4 + ' mg/dL</text>' +
      '<text x="322" y="77" font-size="8.5" font-weight="800" fill="var(--accent-primary)">Kalium: ' + ev.k + ' mEq/L</text>' +
      '<text x="322" y="94" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">Magnesium: ' + ev.mg + ' mg/dL</text>' +
      '<line x1="322" y1="105" x2="452" y2="105" stroke="var(--border-subtle)" />' +
      '<text x="322" y="120" font-size="7.6" font-weight="800" fill="var(--text-muted)">HALLMARK UTAMA:</text>' +
      '<text x="322" y="134" font-size="8.2" font-weight="800" fill="var(--accent-coral)">Hipofosfatemia Berat</text>' +
      '<text x="322" y="150" font-size="7.6" font-weight="700" fill="var(--viz-green)">Wajib Tiamin sebelum kalori!</text>' +
      '</svg>';
  }

  function renderGeriRefeedingElectrolyteWidget() {
    var day = geriVizState.refeedDay;
    var mode = geriVizState.refeedMode;
    var ev = evalRefeedingDay(day, mode);
    var tabs = [
      { key: "aggressive", label: "Refeeding Agresif (Tanpa Protokol)", onclick: "window.InternaApp.updateGeriRefeedViz(null, 'aggressive', true)" },
      { key: "safe_nice", label: "Protokol NICE (10 kkal/kg + Tiamin)", onclick: "window.InternaApp.updateGeriRefeedViz(null, 'safe_nice', true)" }
    ];
    var slider = '<div class="viz-controls"><div class="viz-slider-row"><label class="viz-slider-label" for="geri-refeed-slider">Hari Setelah Re-introduksi Nutrisi</label><span class="viz-value-pill" id="geri-refeed-pill">Hari ke-' + day.toFixed(1) + '</span></div><input type="range" id="geri-refeed-slider" class="viz-range" min="0" max="5" step="0.5" value="' + day + '" oninput="window.InternaApp.updateGeriRefeedViz(this.value, null, true)" /></div>';
    return renderCardioWidgetCard({
      key: "geriRefeed",
      title: "Simulator Pergeseran Intraseluler Fosfat, Kalium, Magnesium & Tiamin (Refeeding Syndrome)",
      tag: "REFEEDING SYNDROME",
      motionKey: "geriRefeed",
      controlsTop: renderCardioTabRow("viz-geriRefeed-tabs", tabs, mode) + slider,
      svgHtml: buildGeriRefeedSvg(day, mode),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "Fosfat Serum (PO4 - Hallmark)" },
        { color: "var(--accent-primary)", label: "Kalium (K+)" },
        { color: "var(--accent-secondary)", label: "Magnesium (Mg2+)" }
      ]),
      info: { tone: ev.tone, rKey: "refeed_" + mode + "_" + Math.round(day), title: ev.title, c1Label: "Patofisiologi Pergeseran Elektrolit", c1Body: ev.c1, c2Label: "Protokol Pencegahan NICE", c2Body: ev.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriRefeedViz(dayVal, modeVal, stopAnim) {
    if (stopAnim && R.stopVizMotion) R.stopVizMotion("geriRefeed");
    if (dayVal !== null && dayVal !== undefined) geriVizState.refeedDay = clampNum(dayVal, 0, 5);
    if (modeVal) geriVizState.refeedMode = modeVal;
    var day = geriVizState.refeedDay;
    var mode = geriVizState.refeedMode;
    var ev = evalRefeedingDay(day, mode);
    syncVizPresets("viz-geriRefeed-tabs", [mode === "aggressive", mode === "safe_nice"]);
    syncSliderAndPill("geri-refeed-slider", "geri-refeed-pill", day, "Hari ke-" + day.toFixed(1));
    swapVizSvgFrame("viz-geriRefeed-frame", buildGeriRefeedSvg(day, mode));
    updateVizReadout("viz-geriRefeed-readout", ev.tone, formatVizReadoutHtml(ev.title, "Patofisiologi Pergeseran Elektrolit", ev.c1, "Protokol Pencegahan NICE", ev.c2, ""), "refeed_" + mode + "_" + Math.round(day));
  }

  // =========================================================================
  // W8 (EXTRA). KALKULATOR SKRINING MNA-SF (0–14) & RISIKO REFEEDING
  // =========================================================================
  function evalMnaSf(sc) {
    var s = Math.round(clampNum(sc, 0, 14));
    if (s >= 12) {
      return {
        score: s, status: "Status Nutrisi Normal (12–14)", color: "var(--viz-green)", tone: "success",
        workup: "Skrining ulang berkala tiap 3–6 bulan",
        c1: "Skor MNA-SF <strong>" + s + "/14 (12–14 poin) = Status Nutrisi Normal</strong>. Pada MNA Total (30 poin), kategori normal adalah <strong>&ge;24 poin</strong>.",
        c2: "Pertahankan asupan protein lansia sehat 1,0–1,2 g/kgBB/hari, hidrasi cukup, dan aktivitas fisik rutin."
      };
    }
    if (s >= 8) {
      return {
        score: s, status: "Berisiko Malnutrisi (8–11)", color: "var(--accent-secondary)", tone: "warning",
        workup: "Lanjutkan ke MNA Full (17–23,5 = Risiko) + Cek Albumin/Limfosit",
        c1: "Skor MNA-SF <strong>" + s + "/14 (8–11 poin) = Berisiko Malnutrisi</strong> (setara skor MNA Total <strong>17–23,5 poin</strong>, contoh di Board: skrining 10 + total 19 = berisiko malnutrisi).",
        c2: "Lakukan evaluasi kausa (depresi, disfagia, kesehatan gigi/mulut, polifarmasi), periksa darah tepi (hitung limfosit total), albumin/prealbumin, dan berikan suplementasi nutrisi oral (ONS) tinggi protein (1,2–1,5 g/kgBB/hari + leusin)."
      };
    }
    return {
      score: s, status: "Malnutrisi (0–7 Poin) — Risiko Refeeding Tinggi", color: "var(--accent-coral)", tone: "danger",
      workup: "Cek PO4, K, Mg, Albumin, Limfosit + Tiamin sebelum makan!",
      c1: "Skor MNA-SF <strong>" + s + "/14 (0–7 poin) = Malnutrisi</strong> (setara MNA Total <strong>&lt;17 poin</strong>). Pasien berisiko tinggi mengalami <em>Refeeding Syndrome</em> bila asupan makan sebelumnya sangat minim &gt;5–10 hari.",
      c2: "<strong>Tindakan Wajib:</strong> Periksa elektrolit dasar (<strong>Fosfat, Kalium, Magnesium</strong>), berikan <strong>Tiamin 200–300 mg</strong> sebelum memulai nutrisi, dan naikkan kalori bertahap mulai 10 kkal/kgBB/hari."
    };
  }

  function buildGeriMnaSvg(sc) {
    var ev = evalMnaSf(sc);
    var zones = [
      { rng: "0–7 Poin", lbl: "Malnutrisi (MNA Total <17)", min: 0, max: 7, col: "var(--accent-coral)" },
      { rng: "8–11 Poin", lbl: "Berisiko (MNA Total 17–23,5)", min: 8, max: 11, col: "var(--accent-secondary)" },
      { rng: "12–14 Poin", lbl: "Normal (MNA Total >=24)", min: 12, max: 14, col: "var(--viz-green)" }
    ];
    var zHtml = zones.map(function (z, idx) {
      var x = 20 + idx * 149;
      var active = (ev.score >= z.min && ev.score <= z.max);
      var stroke = active ? z.col : "var(--border-subtle)";
      var sw = active ? "2.2" : "1";
      var bg = active ? z.col : "var(--bg-surface)";
      var op = active ? "0.16" : "1";
      return '<rect x="' + x + '" y="30" width="142" height="58" rx="8" fill="' + bg + '" fill-opacity="' + op + '" stroke="' + stroke + '" stroke-width="' + sw + '" />' +
        '<text x="' + (x + 71) + '" y="51" text-anchor="middle" font-size="10" font-weight="800" fill="' + (active ? z.col : "var(--text-primary)") + '">' + z.rng + '</text>' +
        '<text x="' + (x + 71) + '" y="71" text-anchor="middle" font-size="7.6" font-weight="700" fill="var(--text-muted)">' + z.lbl + '</text>';
    }).join("");

    return '<svg class="viz-svg" viewBox="0 0 480 154" role="img" aria-label="Kalkulator Skrining MNA-SF">' +
      '<text x="20" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">SKRINING MINI NUTRITIONAL ASSESSMENT SHORT-FORM (MNA-SF)</text>' +
      '<text x="460" y="18" text-anchor="end" font-size="10" font-weight="800" fill="' + ev.color + '">SKOR: ' + ev.score + '/14</text>' +
      zHtml +
      '<rect x="20" y="98" width="440" height="44" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="116" font-size="8.4" font-weight="800" fill="' + ev.color + '">STATUS: ' + ev.status.toUpperCase() + '</text>' +
      '<text x="32" y="132" font-size="8" font-weight="700" fill="var(--text-primary)">Tindak Lanjut: ' + escapeHtml(ev.workup) + '</text>' +
      '</svg>';
  }

  function renderGeriMnaRefeedingWidget() {
    var sc = geriVizState.mnaScore;
    var ev = evalMnaSf(sc);
    var slider = '<div class="viz-controls"><div class="viz-slider-row"><label class="viz-slider-label" for="geri-mna-slider">Skor Skrining MNA-SF (6 Parameter)</label><span class="viz-value-pill" id="geri-mna-pill">' + sc + ' / 14 Poin</span></div><input type="range" id="geri-mna-slider" class="viz-range" min="0" max="14" step="1" value="' + sc + '" oninput="window.InternaApp.calcGeriMnaRefeeding(this.value)" /></div>';
    return renderCardioWidgetCard({
      key: "geriMna",
      title: "Kalkulator Skrining Malnutrisi MNA-SF (0–14) & Korelasi Skor MNA Total (30 Poin)",
      tag: "KALKULATOR MNA",
      controlsTop: slider,
      svgHtml: buildGeriMnaSvg(sc),
      legendHtml: "",
      info: { tone: ev.tone, rKey: "mna_" + ev.status, title: ev.status, c1Label: "Interpretasi MNA-SF & MNA Total", c1Body: ev.c1, c2Label: "Evaluasi Lab & Protokol Nutrisi", c2Body: ev.c2 },
      readoutFooter: ""
    });
  }

  function calcGeriMnaRefeeding(val) {
    geriVizState.mnaScore = Math.round(clampNum(val, 0, 14));
    var sc = geriVizState.mnaScore;
    var ev = evalMnaSf(sc);
    syncSliderAndPill("geri-mna-slider", "geri-mna-pill", sc, sc + " / 14 Poin");
    swapVizSvgFrame("viz-geriMna-frame", buildGeriMnaSvg(sc));
    updateVizReadout("viz-geriMna-readout", ev.tone, formatVizReadoutHtml(ev.status, "Interpretasi MNA-SF & MNA Total", ev.c1, "Evaluasi Lab & Protokol Nutrisi", ev.c2, ""), "mna_" + ev.status);
  }

  // =========================================================================
  // W10. ATLAS STAGING ULKUS DEKUBITUS (NPIAP I–IV) & TIPE INKONTINENSIA URIN
  // =========================================================================
  var GERI_PI_DATA = {
    stage1: {
      label: "Dekubitus Stad I",
      color: "var(--accent-primary)",
      tone: "info",
      depth: 1,
      title: "Ulkus Dekubitus Stadium I — Eritema Kulit Utuh Non-Blanchable",
      layer: "Epidermis Utuh (Eritema Non-Blanchable)",
      wound: "Kulit masih utuh, kemerahan menetap saat ditekan (non-blanching erythema)",
      care: "Reposisi miring tiap 2 jam, kasur dekubitus, jaga kelembapan kulit (hindari pijat pada area merah!)",
      c1: "<strong>Karakteristik Stadium I:</strong> Epidermis masih utuh namun tampak <strong>eritema lokal yang tidak memucat saat ditekan (<em>non-blanchable erythema</em>)</strong> di atas penonjolan tulang (sakrum, trokanter, tumit).",
      c2: "<strong>Pencegahan Progresivitas:</strong> Alihkan tekanan dengan <strong>reposisi berkala tiap 2 jam</strong>, gunakan matras pengurang tekanan, dan kendalikan iklim mikro (kelembapan akibat keringat/inkontinensia) serta gaya geser (<em>shear</em>)."
    },
    stage2: {
      label: "Dekubitus Stad II",
      color: "var(--accent-secondary)",
      tone: "warning",
      depth: 2,
      title: "Ulkus Dekubitus Stadium II — Hilangnya Ketebalan Kulit Parsial (Dermis Terpapar)",
      layer: "Epidermis Hilang -> Dermis Terpapar / Bula",
      wound: "Dasar luka merah-muda lembap di lapisan dermis atau bula utuh/pecah (tanpa slough)",
      care: "Reposisi tiap 2 jam + Balutan lembap (NaCl 0,9% / hidrokoloid / foam)",
      c1: "<strong>Karakteristik Stadium II:</strong> Kehilangan jaringan kulit ketebalan parsial dengan <strong>paparan lapisan dermis</strong>; dasar luka tampak merah muda/merah lembap atau berupa <strong>lepuh (bula) berisi serum</strong> tanpa jaringan lemak maupun <em>slough</em>.",
      c2: "<strong>Prinsip Perawatan Luka:</strong> Pertahankan lingkungan luka lembap fisiologis dengan <strong>kompres NaCl 0,9% atau balutan hidrokoloid/foam</strong>. Jangan gunakan povidon iodin pekat atau kompres es/panas!"
    },
    stage3: {
      label: "Dekubitus Stad III",
      color: "var(--accent-coral)",
      tone: "danger",
      depth: 3,
      title: "Ulkus Dekubitus Stadium III — Ketebalan Kulit Penuh (Lemak Subkutan Terlihat)",
      layer: "Menembus Dermis -> Lemak Subkutan Tampak (Fasia Utuh)",
      wound: "Jaringan adiposa/lemak subkutan terlihat, dapat ada slough/undermining; otot & tulang BELUM tampak",
      care: "Debridemen jaringan nekrotik + Dressing absorptif + Nutrisi tinggi protein 1,2–1,5 g/kg/hari",
      c1: "<strong>Karakteristik Stadium III:</strong> Kehilangan kulit ketebalan penuh di mana <strong>lemak subkutan telah tampak</strong>, namun fasia, otot, tendon, dan tulang belum terpapar.",
      c2: "<strong>Manajemen Komprehensif:</strong> Lakukan debridemen jaringan mati (nekrotik/<em>slough</em>), koreksi anemia dan hipoalbuminemia/malnutrisi (protein 1,2–1,5 g/kgBB/hari), serta offloading tekanan total."
    },
    stage4: {
      label: "Dekubitus Stad IV",
      color: "var(--accent-coral)",
      tone: "danger",
      depth: 4,
      title: "Ulkus Dekubitus Stadium IV — Fasia Tembus, Otot/Tendon/Tulang Terpapar + Infeksi",
      layer: "Menembus Fasia -> Otot, Tendon, atau Tulang Sakrum/Koksigis Terpapar",
      wound: "Dasar luka mencapai otot/tulang (risiko tinggi osteomielitis, selulitis & sepsis pencetus delirium)",
      care: "Debridemen bedah + Antibiotik sistemik (bila infeksi/sepsis) + Reposisi & dukungan nutrisi",
      c1: "<strong>Karakteristik Stadium IV:</strong> Kerusakan jaringan ketebalan penuh yang menembus fasia hingga <strong>otot, tendon, atau tulang (mis. tulang koksigis/sakrum) terpapar</strong> atau teraba langsung.",
      c2: "<strong>Komplikasi Sistemik:</strong> Ulkus Stadium IV yang terinfeksi (pus berbau, nekrosis luas, leukositosis) merupakan <strong>faktor presipitasi klasik delirium akut dan sepsis</strong> pada lansia; wajib dilakukan <strong>debridemen jaringan nekrotik + antibiotik sistemik</strong>."
    },
    incontinence: {
      label: "Tipe Inkontinensia",
      color: "var(--viz-purple)",
      tone: "info",
      depth: 0,
      title: "Klasifikasi Inkontinensia Urin Persisten (Stres, Urgensi, Overflow, Fungsional)",
      layer: "Stres vs Urgensi vs Overflow (BPH) vs Fungsional (OA Lutut)",
      wound: "Stres: batuk/bersin (multipara) | Urgensi: detrusor overaktif | Overflow: retensi BPH | Fungsional: hendaya mobilitas",
      care: "Stres -> Latihan Kegel | Urgensi -> Bladder training | Overflow + Hidronefrosis -> Kateter & TURP",
      c1: "<strong>4 Tipe Inkontinensia Persisten:</strong> (1) <strong>Stres</strong> (bocor saat batuk/mengejan pada multipara -> lini pertama <strong>latihan otot dasar panggul Kegel</strong>); (2) <strong>Urgensi</strong> (tidak sempat ke toilet -> <em>bladder training</em> + antimuskarinik/mirabegron); (3) <strong>Overflow</strong> (menetes terus akibat retensi BPH); (4) <strong>Fungsional</strong> (sulit berjalan ke toilet akibat OA lutut berat).",
      c2: "<strong>Indikasi Bedah BPH &amp; Inkontinensia Alvi:</strong> BPH obstruktif dengan komplikasi <strong>hidronefrosis bilateral/penurunan fungsi ginjal</strong> merupakan indikasi <strong>TURP</strong>. Inkontinensia alvi pada lansia imobilisasi tersering disebabkan oleh <strong>konstipasi kronik dengan impaksi fekal</strong> (<em>overflow diarrhea</em>)."
    }
  };

  function buildGeriPiSvg(sKey) {
    var d = GERI_PI_DATA[sKey] || GERI_PI_DATA.stage3;
    var layers = [
      { y: 36, h: 24, name: "1. Epidermis", col: "#FDE68A" },
      { y: 62, h: 28, name: "2. Dermis", col: "#FCA5A5" },
      { y: 92, h: 32, name: "3. Lemak Subkutis", col: "#FCD34D" },
      { y: 126, h: 28, name: "4. Otot & Fasia", col: "#F87171" },
      { y: 156, h: 24, name: "5. Tulang Sakrum", col: "#E2E8F0" }
    ];
    var layerRects = layers.map(function (l) {
      return '<rect x="22" y="' + l.y + '" width="186" height="' + l.h + '" rx="4" fill="' + l.col + '" fill-opacity="0.32" stroke="var(--border-subtle)" />' +
        '<text x="30" y="' + (l.y + 15) + '" font-size="7.6" font-weight="800" fill="var(--text-primary)">' + l.name + '</text>';
    }).join("");

    var craterH = d.depth === 1 ? 18 : d.depth === 2 ? 48 : d.depth === 3 ? 84 : d.depth === 4 ? 132 : 0;
    var craterSvg = craterH > 0
      ? '<path d="M 118 36 L 132 ' + (36 + craterH) + ' L 178 ' + (36 + craterH) + ' L 192 36 Z" fill="var(--accent-coral)" fill-opacity="0.72" stroke="var(--accent-coral)" stroke-width="2" />' +
        '<text x="155" y="' + (32 + Math.min(craterH, 120)) + '" text-anchor="middle" font-size="7.4" font-weight="800" fill="#FFFFFF">Ulkus</text>'
      : '<rect x="118" y="44" width="82" height="128" rx="8" fill="var(--viz-purple)" fill-opacity="0.18" stroke="var(--viz-purple)" stroke-width="1.6" />' +
        '<text x="159" y="88" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--viz-purple)">Stres: Kegel</text>' +
        '<text x="159" y="106" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--viz-purple)">Urgensi: Bladder</text>' +
        '<text x="159" y="124" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--viz-purple)">Overflow: TURP</text>' +
        '<text x="159" y="142" text-anchor="middle" font-size="7.6" font-weight="800" fill="var(--viz-purple)">Fungsional: OA</text>';

    return '<svg class="viz-svg" viewBox="0 0 480 196" role="img" aria-label="Penampang Anatomi Ulkus Dekubitus dan Inkontinensia">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PENAMPANG JARINGAN SAKRUM (NPIAP) &amp; INKONTINENSIA</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      '<rect x="16" y="24" width="198" height="162" rx="10" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      layerRects + craterSvg +
      '<rect x="224" y="24" width="240" height="162" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="236" y="42" font-size="7.8" font-weight="800" fill="var(--text-muted)">KEDALAMAN ANATOMIS / TIPE</text>' +
      svgWrap(d.layer, 236, 55, 35, 11, 'font-size="8.3" font-weight="800" fill="' + d.color + '"') +
      '<text x="236" y="88" font-size="7.8" font-weight="800" fill="var(--text-muted)">TEMUAN KLINIS UTAMA</text>' +
      svgWrap(d.wound, 236, 101, 35, 11, 'font-size="8.1" font-weight="700" fill="var(--text-primary)"') +
      '<line x1="236" y1="132" x2="452" y2="132" stroke="var(--border-subtle)" />' +
      '<text x="236" y="145" font-size="7.8" font-weight="800" fill="var(--text-muted)">TATA LAKSANA PRIORITAS</text>' +
      svgWrap(d.care, 236, 158, 35, 11, 'font-size="8.1" font-weight="800" fill="var(--viz-green)"') +
      '</svg>';
  }

  function renderGeriPressureInjuryWidget() {
    var cur = geriVizState.piStage;
    var d = GERI_PI_DATA[cur] || GERI_PI_DATA.stage3;
    var tabs = Object.keys(GERI_PI_DATA).map(function (k) {
      return { key: k, label: GERI_PI_DATA[k].label, onclick: "window.InternaApp.updateGeriPiViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "geriPi",
      title: "Atlas Penampang Ulkus Dekubitus (NPIAP Stadium I–IV) & Matriks Inkontinensia Urin",
      tag: "DEKUBITUS & INKONTINENSIA",
      controlsTop: renderCardioTabRow("viz-geriPi-tabs", tabs, cur),
      svgHtml: buildGeriPiSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-primary)", label: "Stad I (Epidermis Utuh)" },
        { color: "var(--accent-secondary)", label: "Stad II (Dermis Terpapar)" },
        { color: "var(--accent-coral)", label: "Stad III–IV (Subkutis/Otot/Tulang)" },
        { color: "var(--viz-purple)", label: "Inkontinensia (Stres/Urgensi/Overflow)" }
      ]),
      info: { tone: d.tone, rKey: "pi_" + cur, title: d.title, c1Label: "Klasifikasi & Patofisiologi", c1Body: d.c1, c2Label: "Tata Laksana Spesifik", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateGeriPiViz(key) {
    if (GERI_PI_DATA[key]) geriVizState.piStage = key;
    var cur = geriVizState.piStage;
    var d = GERI_PI_DATA[cur];
    syncVizPresets("viz-geriPi-tabs", Object.keys(GERI_PI_DATA).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-geriPi-frame", buildGeriPiSvg(cur));
    updateVizReadout("viz-geriPi-readout", d.tone, formatVizReadoutHtml(d.title, "Klasifikasi & Patofisiologi", d.c1, "Tata Laksana Spesifik", d.c2, ""), "pi_" + cur);
  }

  // =========================================================================
  // GERIATRI MODULE WIDGET DISPATCHER (8 WIDGETS: 1, 2, 3, 4, 5, 7, 8, 10)
  // =========================================================================
  function renderGeriModuleWidget(type) {
    if (type === "geri-cga-dashboard-viz") return renderGeriCgaDashboardWidget();
    if (type === "geri-barthel-adl-calc") return renderGeriBarthelAdlWidget();
    if (type === "geri-beers-acb-viz") return renderGeriBeersAcbWidget();
    if (type === "geri-cam-delirium-viz") return renderGeriCamDeliriumWidget();
    if (type === "geri-dementia-domains-viz") return renderGeriDementiaDomainsWidget();
    if (type === "geri-refeeding-electrolyte-viz") return renderGeriRefeedingElectrolyteWidget();
    if (type === "geri-mna-refeeding-calc") return renderGeriMnaRefeedingWidget();
    if (type === "geri-pressure-injury-viz") return renderGeriPressureInjuryWidget();
    return "";
  }

  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("geri-")) return null;
    return renderGeriModuleWidget(type) || null;
  });
  R.registerMotionProvider(getGeriVizMotionSpec);

  Object.assign(R.handlers, {
    getGeriVizMotionSpec,
    updateGeriCgaViz,
    renderGeriCgaDashboardWidget,
    calcGeriBarthelAdl,
    renderGeriBarthelAdlWidget,
    updateGeriBeersViz,
    renderGeriBeersAcbWidget,
    updateGeriCamViz,
    renderGeriCamDeliriumWidget,
    updateGeriDemViz,
    renderGeriDementiaDomainsWidget,
    updateGeriRefeedViz,
    renderGeriRefeedingElectrolyteWidget,
    calcGeriMnaRefeeding,
    renderGeriMnaRefeedingWidget,
    updateGeriPiViz,
    renderGeriPressureInjuryWidget,
    renderGeriModuleWidget
  });
})(window);
