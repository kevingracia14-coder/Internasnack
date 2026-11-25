/* ==========================================================================
   InternaSnack — Alergi Imunologi Klinik Interactive Widgets (Apple HIG)
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { escapeHtml } = R.utils;
  const {
    renderVizLegend,
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

  var alergiVizState = {
    // A10. alergi-3-2: Vaccine Safety in Immunosuppression, Pregnancy, HIV & Tetanus
    vacProfile: "sle_ritux" // "sle_ritux", "sle_steroid_mtx", "hiv_cd4", "pregnancy_travel", "tetanus_wound"
  };

  // =========================================================================
  // A10. SIMULATOR KEAMANAN VAKSINASI PADA IMUNOSUPRESI, KEHAMILAN & TETANUS
  // =========================================================================
  var ALERGI_VAC_PROFILES = {
    sle_ritux: {
      label: "SLE + Rituximab",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Vaksinasi pada Pasien SLE / Autoimun dengan Terapi Rituximab (Anti-CD20)",
      safeVac: "Inaktif: Influenza, Pneumokokus (PCV/PPSV23), HepB",
      contraVac: "SEMUA Vaksin Hidup (MMR, Varisela, TAK-003, Tifoid Oral)",
      timingRule: "Berikan >=6 bulan pasca-dosis terakhir & >=4 minggu sebelum siklus Rituximab berikutnya!",
      c1: "<strong>Efek Deplesi Sel B Rituximab:</strong> Rituximab meniadakan respons humoral terhadap vaksin baru selama ~6 bulan. Vaksin hidup yang dilemahkan <strong>dikontraindikasikan mutlak</strong>.",
      c2: "<strong>Aturan Waktu Board SpPD:</strong> Vaksin inaktif (Pneumokokus/Influenza) diberikan <strong>minimal 6 bulan setelah infus Rituximab terakhir</strong> dan <strong>minimal 4 minggu sebelum siklus berikutnya</strong>."
    },
    sle_steroid_mtx: {
      label: "Steroid Tinggi / MTX",
      color: "var(--accent-secondary)",
      tone: "warning",
      title: "Vaksinasi pada Kortikosteroid Dosis Tinggi (>=20 mg Prednison) & Metotreksat/Takrolimus",
      safeVac: "Vaksin Inaktif AMAN diberikan langsung (Pneumokokus, Influenza, Tifoid Vi IM)",
      contraVac: "Vaksin Hidup KONTRAINDIKASI (MMR, Varisela, Tifoid Oral Ty21a)",
      timingRule: "Stop Prednison >=20 mg/hr (>=14 hr) tunggu >=1 bln; Stop MTX tunggu 1–3 bln sebelum MMR!",
      c1: "<strong>Batas Imunosupresi Steroid:</strong> Prednison <strong>&ge;20 mg/hari (atau &ge;2 mg/kg) selama &ge;14 hari</strong> dianggap imunosupresif berat. Vaksin inaktif (mis. pneumokokus pada SLE) <strong>tetap boleh diberikan</strong>, tetapi vaksin hidup wajib ditunda minimal <strong>1 bulan</strong> setelah steroid dihentikan.",
      c2: "<strong>Transplantasi Ginjal (Takrolimus/MMF) &amp; MTX:</strong> Pada resipien transplantasi ginjal atau pengguna MTX/azatioprin, <strong>vaksin tifoid oral (hidup) dikontraindikasikan</strong> — pilih <strong>vaksin tifoid polisakarida Vi intramuskular (inaktif)</strong>."
    },
    hiv_cd4: {
      label: "HIV (CD4 <200 vs >=200)",
      color: "var(--viz-purple)",
      tone: "warning",
      title: "Vaksinasi pada ODHA (HIV/AIDS) & Pasien Pasca-Splenektomi",
      safeVac: "Inaktif Wajib: Influenza, Pneumokokus, HepB, Meningokokus ACWY (Haji/Umrah)",
      contraVac: "CD4 <200 sel/uL: KONTRAINDIKASI Vaksin Hidup (MMR, Varisela, Yellow Fever, BCG)",
      timingRule: "Splenektomi: Wajib vaksin bakteri berkapsul (Pneumokokus, Meningokokus, Hib) >=14 hr pra/pasca-op",
      c1: "<strong>Ambang CD4 200 sel/&mu;L:</strong> Pada ODHA dengan <strong>CD4 &lt;200 sel/&mu;L (misal CD4 120 atau 170 saat hendak Umrah/Haji)</strong>, seluruh vaksin hidup dikontraindikasikan; berikan vaksin inaktif (Meningokokus konjugat, Influenza inaktif, Pneumokokus).",
      c2: "<strong>Asplenia / Pasca-Splenektomi:</strong> Risiko sepsis fulminan (OPSI) oleh bakteri berkapsul — wajib imunisasi terhadap <strong><em>S. pneumoniae</em>, <em>N. meningitidis</em>, dan <em>H. influenzae</em> tipe b (Hib)</strong>."
    },
    pregnancy_travel: {
      label: "Hamil & Travel / Dengue",
      color: "var(--accent-primary)",
      tone: "info",
      title: "Vaksinasi pada Kehamilan, Pelaku Perjalanan (Travel) & Dengue TAK-003",
      safeVac: "Hamil Aman: Tdap (27–36 mgg), Influenza Inaktif, Hepatitis B, Tifoid Vi IM",
      contraVac: "Hamil Kontraindikasi: MMR, Varisela, HPV, Dengue TAK-003, Tifoid Oral",
      timingRule: "Dengue TAK-003: 2 dosis (Bulan 0 & 3) SC; tunggu >=6 bulan pasca-infeksi dengue akut",
      c1: "<strong>Kehamilan &amp; Travel:</strong> Ibu hamil berisiko tinggi boleh langsung mendapat <strong>vaksin Hepatitis B rekombinan</strong>, Influenza inaktif, Tdap, serta <strong>Tifoid polisakarida Vi IM</strong> bila bepergian ke daerah endemis (India/Indonesia). Wisatawan ke Bali/daerah endemis disarankan vaksin Hepatitis A, Tifoid, Japanese Encephalitis, dan Rabies.",
      c2: "<strong>Vaksin Dengue TAK-003 (Qdenga):</strong> Diberikan <strong>2 dosis dengan interval 3 bulan (0 dan 3 bulan)</strong> secara subkutan tanpa perlu skrining serologi pra-vaksinasi; bila baru sembuh dari DBD, berikan <strong>6 bulan pasca-infeksi</strong>."
    },
    tetanus_wound: {
      label: "Profilaksis Luka Tetanus",
      color: "var(--viz-green)",
      tone: "success",
      title: "Matriks Profilaksis Tetanus (Vaksin Td/TT vs HTIG) Berdasarkan Riwayat Imunisasi",
      safeVac: "Primer Lengkap (>=3 dosis): Luka Kotor beri Booster Td BILA dosis terakhir >5 tahun",
      contraVac: "TIDAK perlu HTIG bila riwayat vaksinasi primer >=3 dosis sudah lengkap!",
      timingRule: "Luka bersih: Booster Td bila >10 thn | Luka kotor (paku berkarat): Booster Td bila >5 thn",
      c1: "<strong>Riwayat Vaksinasi Lengkap (&ge;3 Dosis):</strong> Tidak memerlukan Human Tetanus Immunoglobulin (HTIG) baik pada luka bersih maupun luka kotor. Jika dosis terakhir <strong>&le;5 tahun lalu (misal 3 tahun lalu), tidak perlu suntik Td maupun HTIG</strong>. Jika &gt;5 tahun pada luka kotor (tertusuk paku berkarat), cukup berikan <strong>1 dosis booster vaksin Td/TT</strong>.",
      c2: "<strong>Indikasi HTIG (250 IU IM):</strong> Hanya diberikan pada <strong>luka kotor/mayor bila riwayat imunisasi tetanus &lt;3 dosis atau tidak diketahui</strong> (diberikan bersama vaksin Td di sisi kontralateral)."
    }
  };

  function buildAlergiVacSvg(pKey) {
    var d = ALERGI_VAC_PROFILES[pKey] || ALERGI_VAC_PROFILES.sle_ritux;
    return '<svg class="viz-svg" viewBox="0 0 480 194" role="img" aria-label="Matriks Keamanan Vaksinasi Populasi Khusus">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">MATRIKS KEAMANAN VAKSINASI POPULASI KHUSUS (SATGAS PAPDI)</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="9.5" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      // Left Safe Box
      '<rect x="18" y="26" width="216" height="86" rx="10" fill="var(--viz-green)" fill-opacity="0.11" stroke="var(--viz-green)" stroke-width="1.6" />' +
      '<text x="28" y="43" font-size="7.8" font-weight="800" fill="var(--viz-green)">DIREKOMENDASIKAN / AMAN</text>' +
      svgWrap(d.safeVac, 28, 58, 32, 11.5, 'font-size="8.3" font-weight="800" fill="var(--text-primary)"') +
      // Right Contraindicated Box
      '<rect x="246" y="26" width="216" height="86" rx="10" fill="var(--accent-coral)" fill-opacity="0.11" stroke="var(--accent-coral)" stroke-width="1.6" />' +
      '<text x="256" y="43" font-size="7.8" font-weight="800" fill="var(--accent-coral)">KONTRAINDIKASI / TIDAK PERLU</text>' +
      svgWrap(d.contraVac, 256, 58, 32, 11.5, 'font-size="8.3" font-weight="800" fill="var(--text-primary)"') +
      // Bottom Timing Rule Banner
      '<rect x="18" y="122" width="444" height="58" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="30" y="139" font-size="8" font-weight="800" fill="' + d.color + '">ATURAN INTERVAL &amp; JEDA WASHOUT SPESIFIK:</text>' +
      svgWrap(d.timingRule, 30, 154, 66, 11.5, 'font-size="8.4" font-weight="800" fill="var(--text-primary)"') +
      '</svg>';
  }

  function renderAlergiVaccineImmunosuppWidget() {
    var cur = alergiVizState.vacProfile;
    var d = ALERGI_VAC_PROFILES[cur] || ALERGI_VAC_PROFILES.sle_ritux;
    var tabs = Object.keys(ALERGI_VAC_PROFILES).map(function (k) {
      return { key: k, label: ALERGI_VAC_PROFILES[k].label, onclick: "window.InternaApp.updateAlergiVacViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "alergiVac",
      title: "Simulator Keamanan Vaksinasi pada Imunosupresi (Rituximab, Steroid, HIV CD4), Kehamilan & Luka Tetanus",
      tag: "VAKSINASI KHUSUS",
      controlsTop: renderCardioTabRow("viz-alergiVac-tabs", tabs, cur),
      svgHtml: buildAlergiVacSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--viz-green)", label: "Vaksin Inaktif / Aman" },
        { color: "var(--accent-coral)", label: "Vaksin Hidup Kontraindikasi" },
        { color: "var(--accent-primary)", label: "Jeda Washout Imunosupresan" }
      ]),
      info: { tone: d.tone, rKey: "vac_" + cur, title: d.title, c1Label: "Prinsip Keamanan Imunologis", c1Body: d.c1, c2Label: "Aturan Interval & Jadwal Klinis", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateAlergiVacViz(key) {
    if (ALERGI_VAC_PROFILES[key]) alergiVizState.vacProfile = key;
    var cur = alergiVizState.vacProfile;
    var d = ALERGI_VAC_PROFILES[cur];
    syncVizPresets("viz-alergiVac-tabs", Object.keys(ALERGI_VAC_PROFILES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-alergiVac-frame", buildAlergiVacSvg(cur));
    updateVizReadout("viz-alergiVac-readout", d.tone, formatVizReadoutHtml(d.title, "Prinsip Keamanan Imunologis", d.c1, "Aturan Interval & Jadwal Klinis", d.c2, ""), "vac_" + cur);
  }

  function renderAlergiModuleWidget(type) {
    if (type === "alergi-vaccine-immunosupp-viz") return renderAlergiVaccineImmunosuppWidget();
    return "";
  }

  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("alergi-")) return null;
    return renderAlergiModuleWidget(type) || null;
  });

  Object.assign(R.handlers, {
    updateAlergiVacViz,
    renderAlergiVaccineImmunosuppWidget,
    renderAlergiModuleWidget
  });
})(window);
