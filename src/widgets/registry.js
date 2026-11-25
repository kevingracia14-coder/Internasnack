/* ==========================================================================
   InternaSnack — Unified Interactive Widget Registry & Catalog
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const {
    getAllModules, getModuleDisplayTitles, getDivisionShortLabel, SUBCLUSTER_TITLES
  } = R.utils;
  const {
    NEFRO_WIDGET_MAP, PULMO_WIDGET_MAP, PULMO_EXTRA_WIDGET_SPECS,
    GEH_WIDGET_MAP, GEH_EXTRA_WIDGET_SPECS,
    ENDO_WIDGET_MAP, ENDO_EXTRA_WIDGET_SPECS,
    HOM_WIDGET_MAP, HOM_EXTRA_WIDGET_SPECS,
    REUMA_WIDGET_MAP, REUMA_EXTRA_WIDGET_SPECS,
    GERI_WIDGET_MAP, GERI_EXTRA_WIDGET_SPECS,
    ALERGI_WIDGET_MAP, ALERGI_EXTRA_WIDGET_SPECS,
    PSIKO_WIDGET_MAP, PSIKO_EXTRA_WIDGET_SPECS,
    TROPIK_CALCULATOR_SPECS
  } = R.maps;
  const { renderCalcCheckItem, renderCalcWeightSlider, renderCalcGaugeSvg } = R.viz;

  function renderInteractiveWidget(type) {
    if (!type) return "";
    for (let i = 0; i < R.widgetRenderers.length; i++) {
      const html = R.widgetRenderers[i](type);
      if (html !== null && html !== undefined && html !== "") return html;
    }
    if (type === "dss-calc") {
      return `
        <div class="viz-widget" id="viz-calc-dss-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Resusitasi Cairan DSS (PNPK Kemenkes 2021)</span>
            <span class="viz-tag">PK &amp; Emergensi</span>
          </div>
          ${renderCalcWeightSlider(
            "dss",
            "calcDSS",
            55,
            `<div style="min-width: 0;">
              <label class="viz-slider-label" style="display:block; margin-bottom:0.35rem;" for="widget-dss-type">Derajat Syok</label>
              <select id="widget-dss-type" class="viz-calc-input" onchange="window.InternaApp.calcDSS()">
                <option value="comp">DSS Terkompensasi (TN ≤20 mmHg)</option>
                <option value="decomp">DSS Dekompensasi / Hipotensif</option>
              </select>
            </div>`
          )}
          ${renderCalcGaugeSvg("calc-dss", "TARGET BOLUS / INFUS 1 JAM", 0.2646, "550–1100 mL / 1 jam", "var(--accent-secondary)", [
            { from: 0, to: 0.6, fill: "var(--accent-secondary)", rx: 7, label: "Compensated (10–20 mL/kg)", textFill: "var(--accent-secondary)" },
            { from: 0.6, to: 1, fill: "var(--accent-coral)", rx: 7, label: "Dekompensasi (Bolus 20 mL/kg)", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-dss-result" class="viz-readout" data-tone="warning" data-last-key="comp-55">
            <p class="font-bold text-[var(--text-primary)]">DSS Terkompensasi (Tekanan Nadi ≤20 mmHg)</p>
            <p class="mt-1">• <strong>Resusitasi Awal:</strong> <strong>550 – 1100 mL Kristaloid Isotonik (RL)</strong> habis dalam <strong>1 jam</strong> (~183–367 tpm makrodrip).</p>
            <p class="mt-1">• <strong>Evaluasi 1 jam:</strong> Bila membaik, turunkan bertahap 7 ➔ 5 ➔ 3 mL/kg/jam. Jika syok persisten ➔ cek Hematokrit serial segera!</p>
          </div>
        </div>
      `;
    }
    if (type === "sepsis-calc") {
      return `
        <div class="viz-widget" id="viz-calc-sepsis-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Volume Resusitasi Sepsis (SSC 2021)</span>
            <span class="viz-tag">30 mL/kgBB ≤ 3 Jam</span>
          </div>
          ${renderCalcWeightSlider(
            "sepsis",
            "calcSepsis",
            60,
            `<div style="min-width: 0;">
              <span class="viz-slider-label" style="display:block; margin-bottom:0.35rem;">Target Kristaloid Seimbang (30 mL/kgBB)</span>
              <div id="widget-sepsis-target-box" class="viz-calc-input" style="display:flex; align-items:center; font-family:var(--font-mono); color:var(--accent-primary);">1.800 mL (dalam ≤ 3 jam)</div>
            </div>`
          )}
          ${renderCalcGaugeSvg("calc-sepsis", "VOLUME RESUSITASI KRISTALOID SEIMBANG", 0.25, "1.800 mL (~600 mL/jam)", "var(--accent-primary)", [
            { from: 0, to: 0.5, fill: "var(--accent-primary)", rx: 7, label: "30–90 kg (900–2.700 mL)", textFill: "var(--accent-primary)" },
            { from: 0.5, to: 1, fill: "var(--accent-secondary)", rx: 7, label: "90–150 kg (2.700–4.500 mL)", textFill: "var(--accent-secondary)" }
          ])}
          <div id="widget-sepsis-result" class="viz-readout" data-tone="info" data-last-key="sepsis-60">
            <p class="font-bold text-[var(--text-primary)]">Target Resusitasi Cairan Sepsis 3 Jam Pertama (SSC 2021)</p>
            <p class="mt-1">• <strong>30 mL/kgBB Kristaloid Seimbang (RL / Plasmalyte):</strong> <strong>1800 mL</strong> (rata-rata ~<strong>600 mL/jam</strong>). Hindari NaCl 0,9% masif (risiko asidosis hiperkloremik).</p>
            <p class="mt-1">• <strong>Vasopresor Lini 1:</strong> Norepinefrin target <strong>MAP ≥65 mmHg</strong> (3.0–30.0 mcg/mnt). Tambahkan Vasopresin 0,03 unit/mnt bila perlu.</p>
          </div>
        </div>
      `;
    }
    if (type === "malaria-calc") {
      return `
        <div class="viz-widget" id="viz-calc-malaria-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Dosis DHP &amp; Artesunat IV (Kemenkes &amp; WHO)</span>
            <span class="viz-tag">Protokol Malaria</span>
          </div>
          ${renderCalcWeightSlider(
            "malaria",
            "calcMalaria",
            60,
            `<div style="min-width: 0;">
              <label class="viz-slider-label" style="display:block; margin-bottom:0.35rem;" for="widget-malaria-type">Kategori Klinis Malaria</label>
              <select id="widget-malaria-type" class="viz-calc-input" onchange="window.InternaApp.calcMalaria()">
                <option value="falciparum">P. falciparum (DHP 3H + Primakuin 1H)</option>
                <option value="vivax">P. vivax / ovale (DHP 3H + Primakuin 14H)</option>
                <option value="severe">Malaria Berat (Artesunat IV J0, 12, 24)</option>
              </select>
            </div>`
          )}
          ${renderCalcGaugeSvg("calc-malaria", "REGIMEN DHP HARIAN / ARTESUNAT IV", 0.6, "DHP 4 tablet/hari + Primakuin 1x", "var(--accent-primary)", [
            { from: 0, to: 0.4, fill: "var(--accent-primary)", rx: 7, label: "2–3 Tab DHP", textFill: "var(--accent-primary)" },
            { from: 0.4, to: 0.72, fill: "var(--accent-secondary)", label: "4–5 Tab / Primakuin", textFill: "var(--accent-secondary)" },
            { from: 0.72, to: 1, fill: "var(--accent-coral)", rx: 7, label: "Malaria Berat (IV)", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-malaria-result" class="viz-readout" data-tone="info" data-last-key="falc-4-60">
            <p class="font-bold text-[var(--text-primary)]">P. falciparum Tanpa Komplikasi</p>
            <p class="mt-1">• <strong>DHP:</strong> 1 kali <strong>4 tablet</strong>/hari selama <strong>3 hari</strong> + <strong>Primakuin 15.0 mg</strong> dosis tunggal Hari ke-1 (gametosidal).</p>
            <p class="mt-1">• <em>Kontraindikasi Primakuin:</em> Ibu hamil dan bayi &lt;6 bulan.</p>
          </div>
        </div>
      `;
    }
    if (type === "tifoid-calc") {
      return `
        <div class="viz-widget" id="viz-calc-tifoid-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Dosis Deksametason Ensefalopati Tifoid (PETRI/PAPDI)</span>
            <span class="viz-tag">Hoffman Protocol</span>
          </div>
          ${renderCalcWeightSlider("tifoid", "calcTifoid", 60, `<div class="text-xs font-semibold text-[var(--text-muted)]" style="min-width:0;">Regimen wajib pada tifoid toksik dengan koma/delirium atau syok septik setelah kultur diambil.</div>`)}
          ${renderCalcGaugeSvg("calc-tifoid", "PROTOKOL DEKSAMETASON INTRAVENA", 0.25, "Loading 180 mg ➔ 60 mg/6j", "var(--accent-secondary)", [
            { from: 0, to: 0.5, fill: "var(--accent-primary)", rx: 7, label: "BB 30–90 kg (Load 90–270 mg)", textFill: "var(--accent-primary)" },
            { from: 0.5, to: 1, fill: "var(--accent-secondary)", rx: 7, label: "BB >90–150 kg (Load >270 mg)", textFill: "var(--accent-secondary)" }
          ])}
          <div id="widget-tifoid-result" class="viz-readout" data-tone="warning" data-last-key="tifoid-60">
            <p class="font-bold text-[var(--text-primary)]">Protokol Deksametason Ensefalopati Tifoid (Hoffman et al.)</p>
            <p class="mt-1">• <strong>Loading Dose:</strong> 3 mg/kgBB = <strong>180 mg IV</strong> lambat dalam 30 menit.</p>
            <p class="mt-1">• <strong>Maintenance:</strong> 1 mg/kgBB = <strong>60 mg IV tiap 6 jam × 48 jam</strong> (8 dosis = 480 mg; menekan mortalitas 56% ➔ 10%).</p>
          </div>
        </div>
      `;
    }
    if (type === "curb-calc") {
      return `
        <div class="viz-widget" id="viz-calc-curb-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Interaktif Skor CURB-65 (ATS/IDSA &amp; PDPI)</span>
            <div class="viz-slider-meta">
              <span class="viz-value-pill" id="curb-score-pill">Skor 0 / 5</span>
              <span class="viz-tag">CAP Severity</span>
            </div>
          </div>
          <div class="viz-calc-grid">
            ${renderCalcCheckItem("curb-c", "window.InternaApp.calcCURB()", "<strong>C</strong> — Confusion (GCS turun / AMT ≤8)")}
            ${renderCalcCheckItem("curb-u", "window.InternaApp.calcCURB()", "<strong>U</strong> — Urea >40 mg/dL (BUN >19 mg/dL)")}
            ${renderCalcCheckItem("curb-r", "window.InternaApp.calcCURB()", "<strong>R</strong> — Respiratory Rate ≥30x/menit")}
            ${renderCalcCheckItem("curb-b", "window.InternaApp.calcCURB()", "<strong>B</strong> — Blood Pressure (Sist <90 / Diast ≤60)")}
            ${renderCalcCheckItem("curb-65", "window.InternaApp.calcCURB()", "<strong>65</strong> — Usia ≥65 Tahun", { fullWidth: true })}
          </div>
          ${renderCalcGaugeSvg("calc-curb", "STRATIFIKASI SKOR CURB-65", 0, "Skor 0/5 (Rendah)", "var(--accent-primary)", [
            { from: 0, to: 0.35, fill: "var(--accent-primary)", rx: 7, label: "0–1: Rawat Jalan", textFill: "var(--accent-primary)" },
            { from: 0.35, to: 0.55, fill: "var(--accent-secondary)", label: "2: Rawat Inap", textFill: "var(--accent-secondary)" },
            { from: 0.55, to: 1, fill: "var(--accent-coral)", rx: 7, label: "3–5: Risiko Tinggi / ICU", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-curb-result" class="viz-readout" data-tone="info" data-last-key="curb-0">
            <p>Skor 0 Poin: Risiko Rendah (<2%). Rekomendasi: <strong>Rawat Jalan (Outpatient)</strong> dengan antibiotik oral (Amoksisilin / Doksisiklin / Makrolid).</p>
          </div>
        </div>
      `;
    }
    if (type === "grace-calc") {
      return `
        <div class="viz-widget" id="viz-calc-grace-card">
          <div class="viz-header">
            <span class="viz-title">Stratifikasi Timing Angiografi Invasif NSTE-ACS (ESC 2023)</span>
            <div class="viz-slider-meta">
              <span class="viz-value-pill" id="grace-risk-pill">HIGH RISK (&lt;24 jam) • 145</span>
              <span class="viz-tag">ESC 2023</span>
            </div>
          </div>
          <div class="space-y-2.5 text-xs">
            <div class="font-bold text-[var(--text-primary)]">Kriteria Risiko Sangat Tinggi (Very High Risk — &lt;2 Jam):</div>
            <div class="viz-calc-grid">
              ${renderCalcCheckItem("grace-shock", "window.InternaApp.calcGRACE()", "Ketidakstabilan hemodinamik / Syok kardiogenik")}
              ${renderCalcCheckItem("grace-angina", "window.InternaApp.calcGRACE()", "Nyeri dada berulang/refrakter terapi medikamentosa")}
              ${renderCalcCheckItem("grace-vt", "window.InternaApp.calcGRACE()", "Aritmia mengancam nyawa (VT/VF) atau henti jantung")}
              ${renderCalcCheckItem("grace-arrest", "window.InternaApp.calcGRACE()", "Gagal jantung akut dekompensasi / komplikasi mekanik")}
            </div>
            <div class="font-bold text-[var(--text-primary)] pt-1">Kriteria Risiko Tinggi (High Risk — &lt;24 Jam):</div>
            <div class="viz-calc-grid">
              ${renderCalcCheckItem("grace-trop", "window.InternaApp.calcGRACE()", "Diagnosis NSTEMI (kenaikan/penurunan hs-cTn)", { checked: true })}
              ${renderCalcCheckItem("grace-st", "window.InternaApp.calcGRACE()", "Perubahan segmen ST/gelombang T dinamis")}
            </div>
            <div class="pt-1">
              <label class="viz-slider-label" style="display:block; margin-bottom:0.3rem;" for="grace-score-val">Estimasi Skor GRACE 2.0 (Risk Score):</label>
              <input type="number" id="grace-score-val" value="145" min="50" max="250" class="viz-calc-input" style="max-width: 240px; font-family: var(--font-mono);" oninput="window.InternaApp.calcGRACE()" />
            </div>
          </div>
          ${renderCalcGaugeSvg("calc-grace", "TIMING STRATEGI INVASIF NSTE-ACS", 0.55, "HIGH RISK (<24 jam) • 145", "var(--accent-secondary)", [
            { from: 0, to: 0.45, fill: "var(--accent-primary)", rx: 7, label: "Non-High (Selektif)", textFill: "var(--accent-primary)" },
            { from: 0.45, to: 0.8, fill: "var(--accent-secondary)", label: "High (<24 jam)", textFill: "var(--accent-secondary)" },
            { from: 0.8, to: 1, fill: "var(--accent-coral)", rx: 7, label: "Very High (<2j)", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-grace-result" class="viz-readout" data-tone="warning" data-last-key="grace-warning">
            <p><strong>Kategori Risiko Tinggi (High Risk - ESC 2023):</strong> Indikasi <strong>Early Invasive Strategy (&lt;24 jam)</strong> angiografi koroner selama rawat inap, disertai DAPT dan antikoagulan parenteral.</p>
          </div>
        </div>
      `;
    }
    if (type === "cha2ds2va-calc") {
      return `
        <div class="viz-widget" id="viz-calc-cha-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Skor CHA₂DS₂-VA (ESC 2024 — Tanpa Variabel Gender Sc)</span>
            <div class="viz-slider-meta">
              <span class="viz-value-pill" id="cha-score-pill">Skor 0 Poin</span>
              <span class="viz-tag">ESC 2024</span>
            </div>
          </div>
          <div class="viz-calc-grid">
            ${renderCalcCheckItem("cha-c", "window.InternaApp.calcCHA2DS2VA()", "<strong>C</strong> — Chronic Heart Failure / LVEF ≤40% (+1)")}
            ${renderCalcCheckItem("cha-h", "window.InternaApp.calcCHA2DS2VA()", "<strong>H</strong> — Hypertension / terapi antihipertensi (+1)")}
            ${renderCalcCheckItem("cha-a2", "window.InternaApp.calcCHA2DS2VA()", "<strong>A₂</strong> — Age ≥75 tahun (+2)")}
            ${renderCalcCheckItem("cha-d", "window.InternaApp.calcCHA2DS2VA()", "<strong>D</strong> — Diabetes Mellitus (+1)")}
            ${renderCalcCheckItem("cha-s2", "window.InternaApp.calcCHA2DS2VA()", "<strong>S₂</strong> — Prior Stroke / TIA / Tromboemboli (+2)")}
            ${renderCalcCheckItem("cha-v", "window.InternaApp.calcCHA2DS2VA()", "<strong>V</strong> — Vascular disease (CAD, PAD, plak aorta) (+1)")}
            ${renderCalcCheckItem("cha-a1", "window.InternaApp.calcCHA2DS2VA()", "<strong>A</strong> — Age 65–74 tahun (+1)", { fullWidth: true })}
          </div>
          ${renderCalcGaugeSvg("calc-cha", "REKOMENDASI ANTIKOAGULAN ORAL (OAC)", 0, "Skor 0 (Tanpa OAC)", "var(--accent-primary)", [
            { from: 0, to: 0.14, fill: "var(--accent-primary)", rx: 7, label: "0: Aman", textFill: "var(--accent-primary)" },
            { from: 0.14, to: 0.31, fill: "var(--accent-secondary)", label: "1: DOAC (IIa)", textFill: "var(--accent-secondary)" },
            { from: 0.31, to: 1, fill: "var(--accent-coral)", rx: 7, label: "≥2: Wajib DOAC (Class I)", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-cha-result" class="viz-readout" data-tone="info" data-last-key="cha-0">
            <p>Skor CHA₂DS₂-VA = <strong>0 Poin</strong> (ESC 2024): Risiko tromboemboli rendah; <strong>Tidak Direkomendasikan</strong> pemberian antikoagulan maupun terapi antiplatelet tunggal untuk pencegahan stroke.</p>
          </div>
        </div>
      `;
    }
    if (type === "wells-pe-calc") {
      return `
        <div class="viz-widget" id="viz-calc-wells-card">
          <div class="viz-header">
            <span class="viz-title">Kalkulator Skor Wells Emboli Paru Akut (ESC 2019)</span>
            <div class="viz-slider-meta">
              <span class="viz-value-pill" id="wells-score-pill">0.0 Poin</span>
              <span class="viz-tag">ESC 2019</span>
            </div>
          </div>
          <div class="viz-calc-grid">
            ${renderCalcCheckItem("wells-dvt", "window.InternaApp.calcWellsPE()", "Gejala dan tanda klinis DVT (+3.0)")}
            ${renderCalcCheckItem("wells-alt", "window.InternaApp.calcWellsPE()", "Diagnosis alternatif lebih kecil kemungkinannya dibanding PE (+3.0)")}
            ${renderCalcCheckItem("wells-hr", "window.InternaApp.calcWellsPE()", "Frekuensi nadi &gt;100 x/menit (+1.5)")}
            ${renderCalcCheckItem("wells-immob", "window.InternaApp.calcWellsPE()", "Imobilisasi ≥3 hari atau operasi dalam 4 minggu terakhir (+1.5)")}
            ${renderCalcCheckItem("wells-prev", "window.InternaApp.calcWellsPE()", "Riwayat DVT atau Emboli Paru sebelumnya (+1.5)")}
            ${renderCalcCheckItem("wells-hemop", "window.InternaApp.calcWellsPE()", "Hemoptisis (+1.0)")}
            ${renderCalcCheckItem("wells-ca", "window.InternaApp.calcWellsPE()", "Keganasan aktif (sedang terapi atau dalam 6 bulan terakhir / paliatif) (+1.0)", { fullWidth: true })}
          </div>
          ${renderCalcGaugeSvg("calc-wells", "PROBABILITAS PRE-TEST EMBOLI PARU", 0, "0.0 Poin (PE Unlikely → D-dimer)", "var(--accent-primary)", [
            { from: 0, to: 0.4, fill: "var(--accent-primary)", rx: 7, label: "≤4.0: PE Unlikely (D-dimer)", textFill: "var(--accent-primary)" },
            { from: 0.4, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">4.0: PE Likely (Langsung CTPA)", textFill: "var(--accent-coral)" }
          ])}
          <div id="widget-wells-result" class="viz-readout" data-tone="info" data-last-key="wells-lo-0.0">
            <p>Skor Wells = <strong>0.0 Poin (PE Unlikely / Probabilitas Rendah-Sedang)</strong>: Periksa <strong>D-dimer kuantitatif</strong> (gunakan cut-off terkompensasi usia: <em>Usia × 10 mcg/L</em> untuk usia >50 tahun). Bila D-dimer negatif, PE disingkirkan tanpa CTPA.</p>
          </div>
        </div>
      `;
    }
    return "";
  }



  function inferWidgetKind(widgetType) {
    if (!widgetType) return "Simulator";
    if (
      widgetType.endsWith("-calc") ||
      widgetType === "endo-hypoglycemia-d40-viz" ||
      widgetType === "endo-hypothyroid-lt4-viz" ||
      widgetType === "geri-beers-acb-viz" ||
      widgetType === "geri-cam-delirium-viz"
    ) return "Kalkulator";
    if (
      widgetType.includes("histo") ||
      widgetType.includes("hrct") ||
      widgetType.includes("sediment") ||
      widgetType.includes("hereditary") ||
      widgetType.includes("ain") ||
      widgetType.includes("forrest") ||
      widgetType.includes("villi") ||
      widgetType.includes("ibd-comparison") ||
      widgetType.includes("polyp") ||
      widgetType.includes("tirads") ||
      widgetType.includes("smear") ||
      widgetType.includes("crystal") ||
      widgetType.includes("capillaroscopy") ||
      widgetType.includes("kellgren") ||
      widgetType.includes("synovial-ana") ||
      widgetType.includes("hand-joint") ||
      widgetType.includes("dementia-domains") ||
      widgetType.includes("pressure-injury")
    ) {
      return "Atlas Histo / Sel";
    }
    return "Simulator";
  }

  function cleanWidgetTitle(rawTitle, fallbackTitle) {
    const cleaned = String(rawTitle || "").replace(/^\d+\.\s*/, "").trim();
    return cleaned || String(fallbackTitle || "Widget Klinis").trim();
  }

  function getWidgetCatalog() {
    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );
    const allModules = getAllModules();
    const seen = new Set();
    const catalog = [];

    activeDivisions.forEach((div) => {
      const divMods = allModules.filter((m) => (m.divisionId || "tropik-infeksi") === div.id);
      divMods.forEach((mod) => {
        const disp = getModuleDisplayTitles(mod);
        const tier = Number(mod.tier || 0);
        const clusterTitle = (SUBCLUSTER_TITLES[div.id] && SUBCLUSTER_TITLES[div.id][tier]) || "Modul Inti";

        // 1. Calculators attached to Tropik modules (appear first alongside module)
        if (div.id === "tropik-infeksi") {
          TROPIK_CALCULATOR_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            catalog.push({
              widgetType: c.widgetType,
              title: c.title,
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: c.slideIndex
            });
          });
        }

        // 2. Slide-embedded widgets (Tropik & Kardiologi)
        (mod.slides || []).forEach((s, idx) => {
          if (!s || !s.widgetType || seen.has(s.widgetType)) return;
          seen.add(s.widgetType);
          catalog.push({
            widgetType: s.widgetType,
            title: cleanWidgetTitle(s.title, disp.title),
            kind: inferWidgetKind(s.widgetType),
            divisionId: div.id,
            divisionName: div.name,
            divisionShort: getDivisionShortLabel(div.id),
            tier,
            clusterTitle,
            moduleId: mod.id,
            moduleTitle: disp.title,
            slideIndex: idx
          });
        });

        // 3. Nefrologi dynamically mapped widgets
        const nefroMeta = NEFRO_WIDGET_MAP[mod.id];
        if (nefroMeta && nefroMeta.widgetType && !seen.has(nefroMeta.widgetType)) {
          seen.add(nefroMeta.widgetType);
          const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
            ? Math.min(Math.max(0, nefroMeta.slideIndex ?? 0), mod.slides.length - 1)
            : 0;
          catalog.push({
            widgetType: nefroMeta.widgetType,
            title: cleanWidgetTitle(nefroMeta.slideTitle, disp.title),
            kind: inferWidgetKind(nefroMeta.widgetType),
            divisionId: div.id,
            divisionName: div.name,
            divisionShort: getDivisionShortLabel(div.id),
            tier,
            clusterTitle,
            moduleId: mod.id,
            moduleTitle: disp.title,
            slideIndex: slideIdx
          });
        }

        // 4. Pulmonologist & Medik Kritis primary + extra widgets/calculators
        if (div.id === "pulmonologi") {
          const pulmoMeta = PULMO_WIDGET_MAP[mod.id];
          if (pulmoMeta && pulmoMeta.widgetType && !seen.has(pulmoMeta.widgetType)) {
            seen.add(pulmoMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, pulmoMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: pulmoMeta.widgetType,
              title: cleanWidgetTitle(pulmoMeta.slideTitle, disp.title),
              kind: inferWidgetKind(pulmoMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          PULMO_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 5. Gastroenterohepatologi primary + extra widgets/calculators
        if (div.id === "gastroenterohepatologi") {
          const gehMeta = GEH_WIDGET_MAP[mod.id];
          if (gehMeta && gehMeta.widgetType && !seen.has(gehMeta.widgetType)) {
            seen.add(gehMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, gehMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: gehMeta.widgetType,
              title: cleanWidgetTitle(gehMeta.slideTitle, disp.title),
              kind: inferWidgetKind(gehMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          GEH_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 6. Endokrinologi Metabolik & Diabetes primary + extra widgets/calculators
        if (div.id === "endokrin-metabolik") {
          const endoMeta = ENDO_WIDGET_MAP[mod.id];
          if (endoMeta && endoMeta.widgetType && !seen.has(endoMeta.widgetType)) {
            seen.add(endoMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, endoMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: endoMeta.widgetType,
              title: cleanWidgetTitle(endoMeta.slideTitle, disp.title),
              kind: inferWidgetKind(endoMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          ENDO_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 7. Hematologi Onkologi Medik primary + extra widgets/calculators
        if (div.id === "hematologi-onkologi") {
          const homMeta = HOM_WIDGET_MAP[mod.id];
          if (homMeta && homMeta.widgetType && !seen.has(homMeta.widgetType)) {
            seen.add(homMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, homMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: homMeta.widgetType,
              title: cleanWidgetTitle(homMeta.slideTitle, disp.title),
              kind: inferWidgetKind(homMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          HOM_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 8. Reumatologi primary + extra widgets/calculators
        if (div.id === "reumatologi") {
          const reumaMeta = REUMA_WIDGET_MAP[mod.id];
          if (reumaMeta && reumaMeta.widgetType && !seen.has(reumaMeta.widgetType)) {
            seen.add(reumaMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, reumaMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: reumaMeta.widgetType,
              title: cleanWidgetTitle(reumaMeta.slideTitle, disp.title),
              kind: inferWidgetKind(reumaMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          REUMA_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 9. Geriatri primary + extra widgets/calculators
        if (div.id === "geriatri") {
          const geriMeta = GERI_WIDGET_MAP[mod.id];
          if (geriMeta && geriMeta.widgetType && !seen.has(geriMeta.widgetType)) {
            seen.add(geriMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, geriMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: geriMeta.widgetType,
              title: cleanWidgetTitle(geriMeta.slideTitle, disp.title),
              kind: inferWidgetKind(geriMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          GERI_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 10. Alergi Imunologi Klinik primary + extra widgets/calculators
        if (div.id === "alergi-imunologi") {
          const alergiMeta = ALERGI_WIDGET_MAP[mod.id];
          if (alergiMeta && alergiMeta.widgetType && !seen.has(alergiMeta.widgetType)) {
            seen.add(alergiMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, alergiMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: alergiMeta.widgetType,
              title: cleanWidgetTitle(alergiMeta.slideTitle, disp.title),
              kind: inferWidgetKind(alergiMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          ALERGI_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }

        // 11. Psikosomatik & Paliatif Medik primary + extra widgets/calculators
        if (div.id === "psikosomatik-paliatif") {
          const psikoMeta = PSIKO_WIDGET_MAP[mod.id];
          if (psikoMeta && psikoMeta.widgetType && !seen.has(psikoMeta.widgetType)) {
            seen.add(psikoMeta.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, psikoMeta.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: psikoMeta.widgetType,
              title: cleanWidgetTitle(psikoMeta.slideTitle, disp.title),
              kind: inferWidgetKind(psikoMeta.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          }
          PSIKO_EXTRA_WIDGET_SPECS.filter((c) => c.moduleId === mod.id).forEach((c) => {
            if (seen.has(c.widgetType)) return;
            seen.add(c.widgetType);
            const slideIdx = Array.isArray(mod.slides) && mod.slides.length > 0
              ? Math.min(Math.max(0, c.slideIndex ?? 0), mod.slides.length - 1)
              : 0;
            catalog.push({
              widgetType: c.widgetType,
              title: cleanWidgetTitle(c.title, disp.title),
              kind: inferWidgetKind(c.widgetType),
              divisionId: div.id,
              divisionName: div.name,
              divisionShort: getDivisionShortLabel(div.id),
              tier,
              clusterTitle,
              moduleId: mod.id,
              moduleTitle: disp.title,
              slideIndex: slideIdx
            });
          });
        }
      });
    });

    return catalog;
  }



  R.registry = {
    renderInteractiveWidget,
    getWidgetCatalog,
    inferWidgetKind,
    cleanWidgetTitle
  };
})(window);
