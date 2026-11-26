/* ==========================================================================
   InternaSnack — Shared Runtime Registry, Utils & Curriculum Maps (v2.3)
   ========================================================================== */
(function (global) {
  const R = {
    utils: {},
    maps: {},
    viz: {},
    widgetRenderers: [],
    motionProviders: [],
    handlers: {},
    registry: {},
    _customModulesGetter: () => [],
    setCustomModulesGetter(fn) {
      if (typeof fn === "function") R._customModulesGetter = fn;
    },
    registerWidgetRenderer(fn) {
      if (typeof fn === "function") R.widgetRenderers.push(fn);
    },
    registerMotionProvider(fn) {
      if (typeof fn === "function") R.motionProviders.push(fn);
    }
  };

  function clampNum(val, min, max, fallback) {
    const fb = fallback !== undefined ? fallback : min;
    if (val === "" || val === null || val === undefined) return fb;
    const n = Number(val);
    if (!Number.isFinite(n)) return fb;
    return Math.min(max, Math.max(min, n));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeQuestionCategory(cat) {
    if (cat === "Teori") return "Teori Dasar";
    if (cat === "Diagnosis & Algoritma") return "Diagnosis";
    return cat || "Diagnosis";
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getAllModules() {
    const data = global.INTERNA_DATA || {};
    const tropik = (data.tropikModules || []).map((m) => ({ divisionId: "tropik-infeksi", ...m }));
    const kardio = (data.kardiologiModules || []).map((m) => ({ divisionId: "kardiologi", ...m }));
    const nefrologi = (data.nefrologiModules || []).map((m) => ({ divisionId: "ginjal-hipertensi", ...m }));
    const pulmo = (data.pulmonologiModules || []).map((m) => ({ divisionId: "pulmonologi", ...m }));
    const geh = (data.gehModules || []).map((m) => ({ divisionId: "gastroenterohepatologi", ...m }));
    const endokrin = (data.endokrinModules || []).map((m) => ({ divisionId: "endokrin-metabolik", ...m }));
    const hom = (data.homModules || []).map((m) => ({ divisionId: "hematologi-onkologi", ...m }));
    const reuma = (data.reumatologiModules || []).map((m) => ({ divisionId: "reumatologi", ...m }));
    const geriatri = (data.geriatriModules || []).map((m) => ({ divisionId: "geriatri", ...m }));
    const alergi = (data.alergiModules || []).map((m) => ({ divisionId: "alergi-imunologi", ...m }));
    const psiko = (data.psikosomatikModules || []).map((m) => ({ divisionId: "psikosomatik-paliatif", ...m }));
    return [...tropik, ...kardio, ...nefrologi, ...pulmo, ...geh, ...endokrin, ...hom, ...reuma, ...geriatri, ...alergi, ...psiko, ...(R._customModulesGetter() || [])];
  }

  function getDivisionMeta(divisionId) {
    const id = divisionId || "tropik-infeksi";
    return ((global.INTERNA_DATA || {}).divisions || []).find((d) => d.id === id) || null;
  }

  function getDivisionShortLabel(divisionId) {
    const id = divisionId || "tropik-infeksi";
    if (id === "tropik-infeksi") return "Tropik";
    if (id === "kardiologi") return "Kardio";
    if (id === "ginjal-hipertensi") return "Nefro";
    if (id === "pulmonologi") return "Pulmo & MK";
    if (id === "gastroenterohepatologi") return "GEH";
    if (id === "endokrin-metabolik") return "Endokrin";
    if (id === "hematologi-onkologi") return "HOM";
    if (id === "reumatologi") return "Reuma";
    if (id === "geriatri") return "Geriatri";
    if (id === "alergi-imunologi") return "Alergi";
    if (id === "psikosomatik-paliatif") return "Psikosomatik";
    const meta = getDivisionMeta(id);
    return meta?.shortName || meta?.name || id;
  }

  function getDivisionInitials(divisionId) {
    const id = divisionId || "tropik-infeksi";
    if (id === "tropik-infeksi") return "TI";
    if (id === "kardiologi") return "KV";
    if (id === "ginjal-hipertensi") return "GH";
    if (id === "pulmonologi") return "PM";
    if (id === "gastroenterohepatologi") return "GE";
    if (id === "endokrin-metabolik") return "EM";
    if (id === "hematologi-onkologi") return "HO";
    if (id === "reumatologi") return "RM";
    if (id === "geriatri") return "GR";
    if (id === "alergi-imunologi") return "AI";
    if (id === "psikosomatik-paliatif") return "PP";
    return getDivisionShortLabel(id).slice(0, 2).toUpperCase();
  }

  const SUBCLUSTER_TITLES = {
    "tropik-infeksi": {
      1: "Kedaruratan Infeksi & Sepsis",
      2: "Arbovirus & Penyakit Tropik Vector-Borne",
      3: "Zoonosis, Bakterial Sistemik & Parasit",
      4: "HIV, Infeksi Oportunistik & Imunokompromais",
      5: "Mikologi Sistemik, Rabies & Emergensi Tropik",
      6: "Penatalaksanaan Antibiotik & Stewardship"
    },
    "kardiologi": {
      1: "Penyakit Jantung Koroner & Dislipidemia",
      2: "Gagal Jantung & Syok Kardiogenik",
      3: "Aritmia & Gangguan Konduksi",
      4: "Penyakit Katup, Endokardium & Perikardium",
      5: "Hipertensi & Penyakit Vaskular"
    },
    "ginjal-hipertensi": {
      1: "Fisiologi Ginjal & Pendekatan Urinalisis",
      2: "Gangguan Cairan, Elektrolit & Asam-Basa",
      3: "Acute Kidney Injury (AKI) & RRT",
      4: "Chronic Kidney Disease (CKD) & Komplikasinya",
      5: "Penyakit Glomerular & Sindrom Nefrotik/Nefritik",
      6: "Infeksi Saluran Kemih, Tubulointerstisial & Nefrolitiasis",
      7: "Hipertensi Esensial, Sekunder & Krisis HT",
      8: "Farmakoterapi Renal & Transplantasi Ginjal"
    },
    "pulmonologi": {
      1: "Fondasi Fisiologi, Spirometri & Penyakit Saluran Napas",
      2: "Penyakit Infeksi Paru (Pneumonia, TB-SO/TB-RO, Mikosis)",
      3: "Penyakit Pleura & Mediastinum",
      4: "Penyakit Parenkim Difus, Vaskular Paru & Onkologi Toraks",
      5: "Medik Kritis Respirasi, Ventilasi Mekanik & Gangguan Tidur"
    },
    "gastroenterohepatologi": {
      1: "Esofagus, Asam-Peptik & Perdarahan Saluran Cerna",
      2: "Usus Halus, Kolon, IBD & Gangguan Fungsional",
      3: "Hepatitis Virus, Steatotik (MASLD) & Cedera Hati Akut",
      4: "Sirosis Hepatis, Hipertensi Porta & Onkologi Hepatobiliar",
      5: "Penyakit Sistem Biliaris & Pankreas"
    },
    "endokrin-metabolik": {
      1: "Diabetes Melitus, Farmakoterapi & Terapi Insulin (PERKENI)",
      2: "Kegawatdaruratan Glikemik & Komplikasi Kronik Diabetes",
      3: "Gangguan Kelenjar Tiroid & Krisis Tiroid",
      4: "Kelenjar Adrenal, Hipofisis & Endokrinologi Reproduksi",
      5: "Metabolisme Lipid, Obesitas, Kalsium-Paratiroid & Tulang"
    },
    "hematologi-onkologi": {
      1: "Anemia Defisiensi, Hemoglobinopati & Kegagalan Sumsum Tulang",
      2: "Anemia Hemolitik Imun & Non-Imun",
      3: "Keganasan Hematologi (Leukemia, Limfoma, Mieloma & MPN)",
      4: "Hemostasis, Trombosis & Kedokteran Transfusi",
      5: "Onkologi Medik Sistemik & Kegawatdaruratan Onkologi"
    },
    "reumatologi": {
      1: "Pendekatan Nyeri Sendi, Artritis Reumatoid & Spondiloartropati",
      2: "Lupus Eritematosus Sistemik (SLE) & Penyakit Jaringan Ikat",
      3: "Artritis Kristal, Artritis Septik, Osteoartritis & Nyeri Muskuloskeletal",
      4: "Vaskulitis Sistemik & Penyakit Autoimun Terkait IgG4"
    },
    "geriatri": {
      1: "Pengkajian Paripurna Pasien Geriatri (P3G/CGA) & Polifarmasi",
      2: "Sindrom Geriatri Kognitif, Frailty, Sarkopenia & Nutrisi",
      3: "Instabilitas, Imobilisasi, Ulkus Dekubitus & Inkontinensia"
    },
    "alergi-imunologi": {
      1: "Dasar Imunologi Klinis, Anafilaksis & Alergi Organ",
      2: "Hipersensitivitas Obat Berat (SCARs) & Desensitisasi",
      3: "Imunodefisiensi Primer Dewasa & Imunisasi Populasi Khusus"
    },
    "psikosomatik-paliatif": {
      1: "Gangguan Psikosomatik, Otonom-Vegetatif & Sindrom Fungsional",
      2: "Komorbiditas Ansietas & Depresi pada Penyakit Medis Kronik",
      3: "Manajemen Nyeri Kanker (WHO) & Kedokteran Paliatif Akhir Hayat"
    }
  };



  const NEFRO_WIDGET_MAP = {
    "nefro-1-1": {
      slideIndex: 1,
      widgetType: "nefro-filtration-viz",
      slideTitle: "Simulasi Hemodinamik Glomerulus & Situs Diuretik",
      slideContent: "Visualisasi regulasi arteriol aferen-eferen (NSAID, ACEi/ARB, SGLT2i) terhadap tekanan intraglomerular serta lokasi kerja diuretik di sepanjang nefron."
    },
    "nefro-2-2": {
      slideIndex: 2,
      widgetType: "nefro-hyperkalemia-viz",
      slideTitle: "Simulator Progresi EKG Hiperkalemia & Algoritma Cito",
      slideContent: "Simulasi perubahan gelombang EKG (peaked T → PR memanjang → QRS lebar → sine wave) sesuai kenaikan kalium serum beserta prioritas terapi emergensi."
    },
    "nefro-2-3": {
      slideIndex: 1,
      widgetType: "nefro-abg-viz",
      slideTitle: "Kalkulator AGD Bertahap, Anion Gap & Rumus Winter",
      slideContent: "Analisis otomatis gangguan asam-basa, Anion Gap terkoreksi albumin, rumus kompensasi Winter, Delta-Delta Ratio, dan posisi nomogram."
    },
    "nefro-4-1": {
      slideIndex: 1,
      widgetType: "nefro-nephrotic-histo-viz",
      slideTitle: "Atlas Mikroskop 3-Lapisan Sindrom Nefrotik (LM / IF / EM)",
      slideContent: "Perbandingan mikroanatomi dinding kapiler glomerulus (endotel, MBG, podosit) pada GNLM, GSFS, dan GNMN di bawah mikroskop cahaya, imunofluoresensi, dan elektron."
    },
    "nefro-4-3": {
      slideIndex: 0,
      widgetType: "nefro-lupus-histo-viz",
      slideTitle: "Atlas Histopatologi Nefritis Lupus ISN/RPS (Kelas I–VI)",
      slideContent: "Eksplorasi lokasi deposit kompleks imun (mesangial, subendotelial wire-loop, subepitelial), fokal vs difus, serta Indeks Aktivitas vs Kronisitas."
    },
    "nefro-4-4": {
      slideIndex: 0,
      widgetType: "nefro-rpgn-histo-viz",
      slideTitle: "Simulator Kresen RPGN, Pola IF & Polarisasi Congo Red",
      slideContent: "Animasi pembentukan kresen di ruang Bowman, tiga pola imunofluoresensi (Linear, Granular, Pauci-Immune), deposit mesangial IgA, serta polarisasi Congo Red amiloidosis."
    },
    "nefro-3-1": {
      slideIndex: 1,
      widgetType: "nefro-aki-viz",
      slideTitle: "KDIGO AKI Staging, Kalkulator FENa/FEUrea & Silinder Tubulus",
      slideContent: "Staging KDIGO 1–3, kalkulator otomatis FENa & FEUrea (termasuk jebakan diuretik), serta perbandingan silinder hialin vs muddy brown casts pada ATN."
    },
    "nefro-1-2": {
      slideIndex: 1,
      widgetType: "nefro-sediment-viz",
      slideTitle: "Atlas Mikroskop Sedimen Urin & Diferensiasi Hematuria",
      slideContent: "Lensa interaktif membedakan eritrosit dismorfik/akantosit + silinder eritrosit (glomerular), eumorfik (urologis), silinder leukosit/eosinofil, serta silinder lilin/broad."
    },
    "nefro-5-1": {
      slideIndex: 1,
      widgetType: "nefro-ckd-viz",
      slideTitle: "Peta Risiko KDIGO PGK, Kalkulator CKD-EPI & Histologi Diabetik",
      slideContent: "Matriks risiko GFR × Albuminuria interaktif, kalkulator CKD-EPI 2021 tanpa koreksi ras, serta progresi nodul Kimmelstiel-Wilson & hialinosis arteriol."
    },
    "nefro-2-1": {
      slideIndex: 1,
      widgetType: "nefro-hyponatremia-viz",
      slideTitle: "Simulator Osmosis Neuron, Laju NaCl 3% & Pencegahan ODS",
      slideContent: "Animasi perubahan volume sel neuron akibat tonisitas, kalkulator defisit NaCl 3%, serta guardrail batas aman koreksi maksimal ≤8–10 mEq/L per 24 jam."
    },
    "nefro-4-2": {
      slideIndex: 1,
      widgetType: "nefro-nephritic-histo-viz",
      slideTitle: "Atlas Dinding Kapiler Sindrom Nefritik & Kurva Pemulihan C3",
      slideContent: "Komparasi subepithelial humps (GNAPS) vs double-contour/tram-track PAS (GNMP) vs deposit mesangial IgA lengkap dengan kurva dinamika komplemen C3 minggu 0–12."
    },
    "nefro-7-3": {
      slideIndex: 1,
      widgetType: "nefro-htcrisis-viz",
      slideTitle: "Kurva Penurunan MAP Krisis Hipertensi & Keamanan Obat IV HMOD",
      slideContent: "Kurva target penurunan MAP 20–25% jam I vs pengecualian diseksi aorta, edema paru, stroke iskemik, dan bahaya nifedipin sublingual."
    },
    "nefro-8-2": {
      slideIndex: 1,
      widgetType: "nefro-hereditary-viz",
      slideTitle: "Atlas Tubulopati Herediter (Bartter/Gitelman/Liddle) & Kolagen IV EM",
      slideContent: "Peta kanal ion nefron (NKCC2, NCC, ENaC) dan membran basal glomerulus EM (basket-weave Alport vs penipisan TBMN vs kista ADPKD)."
    },
    "nefro-5-2": {
      slideIndex: 2,
      widgetType: "nefro-ckdmbd-viz",
      slideTitle: "Loop Hormonal CKD-MBD & Manajemen Anemia Renal (ESA + Besi)",
      slideContent: "Animasi umpan balik FGF-23 – Kalsitriol – Ca – PO4 – PTH seiring penurunan eLFG serta efek pengikat fosfat, sinakalset, dan terapi anemia."
    },
    "nefro-2-4": {
      slideIndex: 0,
      widgetType: "nefro-rta-viz",
      slideTitle: "Kalkulator Anion Gap Urin (UAG) & Matriks RTA Tipe 1, 2, 4",
      slideContent: "Penghitung UAG otomatis pada NAGMA untuk membedakan diare GI vs RTA 1/2/4 lengkap dengan pH urin, K+, koreksi kalsium albumin, dan jebakan ujian."
    },
    "nefro-3-3": {
      slideIndex: 1,
      widgetType: "nefro-ain-viz",
      slideTitle: "Atlas Kompartemen Ginjal: AIN Interstisium vs ATN vs GN",
      slideContent: "Visualisasi mikroanatomi infiltrat eosinofil/limfosit di ruang interstisium (AIN akibat PPI/OAINS) berbanding tubulus ATN dan glomerulonefritis."
    },
    "nefro-3-4": {
      slideIndex: 0,
      widgetType: "nefro-dialysis-viz",
      slideTitle: "Checklist Cito AEIOU & Pemilihan Modalitas TPG-A (IHD vs SLED vs CRRT)",
      slideContent: "Evaluasi indikasi dialisis darurat AEIOU, pemilihan modalitas berdasarkan hemodinamik ICU, dan pencegahan Dialysis Disequilibrium Syndrome."
    },
    "nefro-6-1": {
      slideIndex: 1,
      widgetType: "nefro-stone-viz",
      slideTitle: "Simulator Ukuran Batu Saluran Kemih, Tatalaksana & Dekompresi Cito",
      slideContent: "Peta ukuran/komposisi batu (Ca Oksalat, Asam Urat, Struvit), pilihan MET/ESWL/URS/PCNL, serta over-ride dekompresi cito pada urosepsis."
    },
    "nefro-8-1": {
      slideIndex: 0,
      widgetType: "nefro-cardiorenal-viz",
      slideTitle: "Diagram Sindrom Kardiorenal (SKR 1–5) & Stepper Protokol SHR-GGA",
      slideContent: "Alur timbal-balik jantung-ginjal SKR tipe 1–5 dan langkah kriteria ICA-AKI + terapi vasokonstriktor splanknik (Terlipressin + Albumin) pada SHR."
    }
  };

  const PULMO_WIDGET_MAP = {
    "pulmo-1-1": {
      slideIndex: 2,
      widgetType: "pulmo-spiro-viz",
      slideTitle: "Simulator Spirometri, Flow-Volume Loop & Difusi (DLCO)",
      slideContent: "Simulasi morfologi kurva Flow-Volume Loop obstruksi vs restriksi vs obstruksi jalan napas atas, uji bronkodilator & pola DLCO."
    },
    "pulmo-1-2": {
      slideIndex: 3,
      widgetType: "pulmo-asthma-gina-viz",
      slideTitle: "Simulator Eskalasi Terapi Asma GINA 2024 (Track 1 MART vs Track 2)",
      slideContent: "Navigasi Step 1–5 GINA, perbedaan Track 1 ICS-Formoterol vs Track 2, pemilihan biologik T2-High & tata laksana eksaserbasi akut."
    },
    "pulmo-1-3": {
      slideIndex: 2,
      widgetType: "pulmo-copd-gold-viz",
      slideTitle: "Matriks GOLD ABE 2024, Ambang Eosinofil ICS & PPOK Eksaserbasi",
      slideContent: "Klasifikasi GOLD ABE berdasarkan eksaserbasi & mMRC/CAT, titrasi eosinofil >=300 sel/uL untuk Triple Therapy & target SpO2 88–92%."
    },
    "pulmo-1-4": {
      slideIndex: 5,
      widgetType: "pulmo-hemoptysis-viz",
      slideTitle: "Algoritma Emergensi Hemoptisis Masif, Lateralisasi & Bronkiektasis",
      slideContent: "Proteksi jalan napas lateral dekubitus sisi sakit di bawah, embolisasi arteri bronkialis (BAE) & pembeda hemoptisis vs hematemesis."
    },
    "pulmo-2-1": {
      slideIndex: 4,
      widgetType: "pulmo-cap-strata-viz",
      slideTitle: "Peta Keputusan CAP (ATS/IDSA), Kriteria ICU & Cakupan HAP/VAP",
      slideContent: "Stratifikasi empiris CAP rawat jalan vs bangsal vs ICU (1 mayor atau >=3 minor ATS/IDSA), risiko MRSA/Pseudomonas & mutlak hindari daptomisin."
    },
    "pulmo-2-2": {
      slideIndex: 3,
      widgetType: "pulmo-tb-dili-viz",
      slideTitle: "Timeline Hepatotoksisitas OAT (DILI), Rechallenge Bertahap & TB-HIV",
      slideContent: "Simulasi kinetik SGOT/SGPT saat DILI OAT, jembatan streptomisin + etambutol, rechallenge berurutan R -> H serta timing ARV & IRIS."
    },
    "pulmo-2-3": {
      slideIndex: 2,
      widgetType: "pulmo-tbro-bpalm-viz",
      slideTitle: "Arsitektur Paduan TB-RO WHO (BPaLM 6 Bln, Grup A–C) & QTcF",
      slideContent: "Pemilihan regimen all-oral BPaLM vs BPaL (Pre-XDR) vs 9 bulan vs jangka panjang Grup A–B–C serta tata laksana QTcF >500 ms."
    },
    "pulmo-2-4": {
      slideIndex: 2,
      widgetType: "pulmo-aspergillosis-histo-viz",
      slideTitle: "Atlas Radiologi-Histologi Spektrum Jamur Paru (ABPA, CPA, IPA, Mukor)",
      slideContent: "Perbandingan CT khas (Halo, Air-Crescent, Monod, Reverse Halo) dan sudut hifa 45° berseptat Aspergillus vs 90° non-septat Mucorales."
    },
    "pulmo-3-1": {
      slideIndex: 1,
      widgetType: "pulmo-light-calc",
      slideTitle: "Kalkulator Kriteria Light, SAAG Pleura (Pseudoeksudat) & Empiema",
      slideContent: "Evaluasi rasio protein/LDH kriteria Light, koreksi gradien albumin/protein pada diuretik, indikasi WSD (pH <7,2) & kilotoraks."
    },
    "pulmo-3-2": {
      slideIndex: 4,
      widgetType: "pulmo-wsd-ptx-viz",
      slideTitle: "Simulator Botol WSD (Undulasi/Bubbling), Tension PTX (ATLS 10) & USG",
      slideContent: "Simulasi siklus respirasi pada water-seal WSD, dekompresi jarum ICS 4–5 anterior/mid-axillary ATLS Ed.10 & tanda USG Lung Point."
    },
    "pulmo-3-3": {
      slideIndex: 0,
      widgetType: "pulmo-mediastinum-svcs-viz",
      slideTitle: "Peta 3 Kompartemen ITMIG ('4T'), Timoma-MG & Alur Emergensi SVCS",
      slideContent: "Pemetaan kompartemen prevascular, visceral, paravertebral ITMIG, asosiasi Timoma-Miastenia Gravis & prioritas biopsi pada SVCS."
    },
    "pulmo-4-1": {
      slideIndex: 1,
      widgetType: "pulmo-ild-hrct-viz",
      slideTitle: "Atlas HRCT & Profil BAL Penyakit Paru Interstisial (UIP/IPF, NSIP, HP)",
      slideContent: "Visualisasi pola HRCT UIP honeycombing vs NSIP subpleural sparing vs HP mosaic attenuation, sarkoidosis & pneumokoniosis."
    },
    "pulmo-4-2": {
      slideIndex: 4,
      widgetType: "pulmo-ph-hemodynamic-viz",
      slideTitle: "Simulator Kateterisasi RHC ESC/ERS 2022 (mPAP >20, PAWP, PVR >2 WU)",
      slideContent: "Kalkulasi hemodinamik Pre-kapiler vs IpcPH vs CpcPH, uji vasoreaktivitas Grup 1, Grup 4 CTEPH & kontraindikasi vasodilator Grup 2–3."
    },
    "pulmo-4-3": {
      slideIndex: 1,
      widgetType: "pulmo-oncology-spn-viz",
      slideTitle: "Evaluator SPN (Kalsifikasi & Fleischner), Target Molekuler & Paraneoplastik",
      slideContent: "Identifikasi morfologi kalsifikasi jinak vs ganas SPN, peta biomarker EGFR/ALK/PD-L1 serta sindrom paraneoplastik SCLC & SCC."
    },
    "pulmo-5-1": {
      slideIndex: 4,
      widgetType: "pulmo-ards-vent-viz",
      slideTitle: "Simulator Mekanika 'Baby Lung' ARDSNet, Driving Pressure & Prone PROSEVA",
      slideContent: "Simulasi volume tidal 6 mL/kg PBW, PEEP, Pplat <=30 & Driving Pressure <15 cmH2O disertai strategi prone >=12–16 jam pada ARDS berat."
    },
    "pulmo-5-2": {
      slideIndex: 2,
      widgetType: "pulmo-mv-troubleshoot-viz",
      slideTitle: "Simulator Gelombang Ventilator (Ppeak vs Pplat), Auto-PEEP & DOPE",
      slideContent: "Analisis kurva tekanan-aliran untuk membedakan obstruksi jalan napas vs penurunan komplians, breath stacking PPOK & protokol DOPE."
    }
  };

  const PULMO_EXTRA_WIDGET_SPECS = [
    {
      widgetType: "curb-calc",
      moduleId: "pulmo-2-1",
      slideIndex: 2,
      title: "Kalkulator Skor CURB-65 Pneumonia (CAP)"
    },
    {
      widgetType: "pulmo-rox-pbw-calc",
      moduleId: "pulmo-5-1",
      slideIndex: 1,
      title: "Kalkulator Terintegrasi PBW Volume Tidal (6 mL/kg), Gradien (A-a)O2 & ROX Index"
    },
    {
      widgetType: "pulmo-niv-rsbi-calc",
      moduleId: "pulmo-5-2",
      slideIndex: 4,
      title: "Kalkulator RSBI Penyapihan Ventilator (f/Vt), Titrasi BiPAP & Skor STOP-BANG"
    }
  ];

// =========================================================================
// GEH WIDGET MAP & EXTRA WIDGET SPECS
// =========================================================================
const GEH_WIDGET_MAP = {
  "geh-1-1": {
    slideIndex: 3,
    widgetType: "geh-esophageal-motility-viz",
    slideTitle: "Simulator Manometri Esofagus (Akalasia Tipe I–III), GERD LA A–D & Disfagia",
    slideContent: "Analisis High-Resolution Manometry (HRM) Chicago v4.0, tekanan IRP, aperistalsis vs spastik, klasifikasi endoskopi Los Angeles A–D & terapi POEM vs Heller."
  },
  "geh-1-2": {
    slideIndex: 4,
    widgetType: "geh-forrest-ugib-viz",
    slideTitle: "Atlas Endoskopi Klasifikasi Forrest (Ia–III), Risiko Rebleeding & Eradikasi H. pylori",
    slideContent: "Morfologi ulkus peptikum Forrest Ia–III, risiko rebleeding, hemostasis kombinasi endoskopi, PPI infus 72 jam & paduan kuadrupel Bismut."
  },
  "geh-1-3": {
    slideIndex: 3,
    widgetType: "geh-variceal-portal-viz",
    slideTitle: "Simulator Hemodinamik Hipertensi Porta (HVPG) & Protokol Varises Akut Baveno VII",
    slideContent: "Gradien tekanan vena porta HVPG (>=10 CSPH, >=12 ruptur, >=20 kritis), protokol vasoaktif Terlipressin, ligasi EVL & early preemptive TIPS Baveno VII."
  },
  "geh-1-4": {
    slideIndex: 2,
    widgetType: "geh-lgib-oakland-viz",
    slideTitle: "Simulator Algoritma SCBB Akut, Skor Oakland, CT-Angiografi vs Kolonoskopi",
    slideContent: "Stratifikasi SCBB akut dengan Skor Oakland (cut-off <=8 aman rawat jalan), etiologi divertikulosis vs kolitis iskemik, CTA emergensi vs kolonoskopi elektif."
  },
  "geh-2-1": {
    slideIndex: 2,
    widgetType: "geh-malabsorption-villi-viz",
    slideTitle: "Atlas Histopatologi Vili Usus (Marsh 0–3c Celiac, Whipple, Giardia) & Uji D-Xylose",
    slideContent: "Atrofi vili dan limfosit intraepitelial Marsh 0–3c Celiac, makrofag PAS+ Whipple, trofozoit Giardia, serta pembeda malabsorpsi mukosa vs maldigesti via D-Xylose."
  },
  "geh-2-2": {
    slideIndex: 2,
    widgetType: "geh-ibd-comparison-viz",
    slideTitle: "Atlas Perbandingan Kolitis Ulseratif vs Penyakit Crohn & Derajat Truelove-Witts",
    slideContent: "Distribusi lesi kontinu superfisial UC vs transmural skip lesions CD, abses kriptus vs granuloma, komplikasi megakolon toksik & kriteria Truelove-Witts."
  },
  "geh-2-3": {
    slideIndex: 2,
    widgetType: "geh-rome-ibs-viz",
    slideTitle: "Simulator Kriteria Rome IV, Bristol Stool Scale (1–7) & Kalprotektin Fekal",
    slideContent: "Kriteria Rome IV nyeri perut terkait defekasi, penentuan subtipe IBS-C/D/M via Bristol Stool Scale, red flags & ambang kalprotektin fekal (<50 vs >150)."
  },
  "geh-2-4": {
    slideIndex: 2,
    widgetType: "geh-colorectal-polyp-viz",
    slideTitle: "Atlas Sekuens Adenoma-Karsinoma (APC-KRAS-TP53), Sindrom Lynch & Staging KKR",
    slideContent: "Kaskade mutasi kromosom APC -> KRAS -> DCC -> TP53, defisiensi MMR/MSI-H pada Sindrom Lynch, interval surveilans kolonoskopi pasca-polipektomi & biomarker CEA."
  },
  "geh-3-1": {
    slideIndex: 2,
    widgetType: "geh-rvalue-alf-calc",
    slideTitle: "Kalkulator R-Value Pola Cedera Hati, Nomogram Parasetamol & Kriteria King's College ALF",
    slideContent: "Kalkulasi R-Value pola hepatoseluler (>=5) vs kolestatik (<=2), Rumack-Matthew nomogram intoksikasi parasetamol & kriteria King's College indikasi transplantasi hepar cito."
  },
  "geh-3-2": {
    slideIndex: 2,
    widgetType: "geh-hbv-phases-viz",
    slideTitle: "Simulator 5 Fase Hepatitis B Kronik (EASL/PPHI) & Ambang Terapi Tenofovir/Entecavir",
    slideContent: "Dinamika serologi HBsAg, HBeAg, HBV DNA & ALT pada 5 fase HBV kronik, mutasi precore/BCP, indikasi absolut terapi antiviral TDF/TAF/ETV & risiko reaktivasi."
  },
  "geh-3-3": {
    slideIndex: 2,
    widgetType: "geh-hcv-daa-viz",
    slideTitle: "Simulator Pemilihan Regimen DAA Pan-genotipik HCV, Status Sirosis & SVR12",
    slideContent: "Pemilihan paduan DAA oral pan-genotipik SOF/VEL vs GLE/PIB, penyesuaian status sirosis terkompensasi vs dekompensasi (kontraindikasi protease inhibitor), durasi 8 vs 12 minggu & kesembuhan SVR12."
  },
  "geh-3-4": {
    slideIndex: 3,
    widgetType: "geh-fib4-maddrey-calc",
    slideTitle: "Kalkulator Terintegrasi Skor FIB-4 (MASLD) & Maddrey Discriminant Function (Hepatitis Alkoholik)",
    slideContent: "Stratifikasi non-invasif fibrosis hepar FIB-4 (<1.30 vs >2.67) pada MASLD, dan formula Maddrey (mDF >=32) untuk indikasi kortikosteroid Prednisolon pada hepatitis alkoholik akut."
  },
  "geh-4-1": {
    slideIndex: 2,
    widgetType: "geh-ascites-saag-viz",
    slideTitle: "Simulator Diagnostik Cairan Asites (SAAG >=1,1), Protokol SBP & Dosis Albumin",
    slideContent: "Diferensiasi hipertensi porta (SAAG >=1.1 g/dL) vs karsinomatosis/TB peritoneal (<1.1), kriteria diagnostik SBP (PMN >=250 sel/mm3) & protokol infus albumin H1/H3 serta LVP."
  },
  "geh-4-2": {
    slideIndex: 2,
    widgetType: "geh-he-westhaven-viz",
    slideTitle: "Simulator Derajat Ensefalopati Hepatikum (West Haven I–IV), Pencetus & Laktulosa-Rifaximin",
    slideContent: "Tahapan klinis West Haven 0–IV dari flapping tremor/asteriksis hingga koma, koreksi faktor pencetus HEPATICS & terapi titrasi Laktulosa (2–3x BAB lunak) + Rifaximin 550 mg."
  },
  "geh-4-3": {
    slideIndex: 2,
    widgetType: "geh-hcc-bclc-viz",
    slideTitle: "Simulator Dinamika Kontras CT 3 Fase KSH (Wash-in/Wash-out) & Peta Terapi BCLC 2022",
    slideContent: "Karakteristik vaskular KSH (arterial hyperenhancement / wash-in & portal venous wash-out) serta alur terapi BCLC 2022: reseksi/RFA (0/A), TACE (B), Atezolizumab+Bevacizumab (C), hingga paliatif (D)."
  },
  "geh-5-3": {
    slideIndex: 2,
    widgetType: "geh-pancreatitis-tg18-viz",
    slideTitle: "Simulator Kolangitis Akut (Tokyo TG18) & Pankreatitis Akut (Revised Atlanta)",
    slideContent: "Trias Charcot & Pentad Reynolds kolangitis akut dengan stratifikasi TG18 dan indikasi dekompresi bilier emergensi, dibandingkan kriteria diagnostik & skor BISAP pankreatitis akut."
  },
  "geh-5-4": {
    slideIndex: 2,
    widgetType: "geh-pancreatitis-tg18-viz",
    slideTitle: "Simulator Pankreatitis Akut (Revised Atlanta & BISAP) vs Kolangitis Akut (Tokyo TG18)",
    slideContent: "Kriteria diagnostik amilase/lipase >=3x ULN, skor BISAP mortalitas pankreatitis vs Trias Charcot & Pentad Reynolds kolangitis akut dengan indikasi dekompresi bilier emergensi TG18."
  }
};

const GEH_EXTRA_WIDGET_SPECS = [
  {
    widgetType: "geh-blatchford-calc",
    moduleId: "geh-1-3",
    slideIndex: 1,
    title: "Kalkulator Skor Glasgow-Blatchford SCBA & Ambang Transfusi Restriktif"
  },
  {
    widgetType: "geh-child-meld-calc",
    moduleId: "geh-4-1",
    slideIndex: 1,
    title: "Kalkulator Terintegrasi Skor Child-Pugh (Kelas A/B/C) & MELD-Na Sirosis"
  },
  {
    widgetType: "geh-hbv-clinical-calc",
    moduleId: "geh-3-2",
    slideIndex: 6,
    title: "Asisten Klinis Hepatitis B Kronik, Kehamilan (MTCT) & Dosis Ginjal (PPHI 2026)"
  }
];

// ENDOKRIN WIDGET MAP
const ENDO_WIDGET_MAP = {
  "endo-1-1": {
    slideIndex: 1,
    widgetType: "endo-dm-criteria-viz",
    slideTitle: "Simulator Diagnosis Glikemik (GDP, TTGO, HbA1c & Artefak)",
    slideContent: "Kriteria diagnostik DM & Prediabetes (GDPT/TGT) menurut PERKENI & ADA 2024, batas ambang GDP, TTGO, HbA1c serta identifikasi kondisi artefak pemendekan umur eritrosit (anemia hemolitik, hemodialisis)."
  },
  "endo-1-2": {
    slideIndex: 1,
    widgetType: "endo-oad-organ-viz",
    slideTitle: "Algoritma OAD & Injeksi Non-Insulin Berbasis Komorbid Organ",
    slideContent: "Stratifikasi pemilihan OAD berorientasi organ: ASCVD, HFrEF, CKD, dan kontrol berat badan (obesitas) serta batas aman penyesuaian eLFG (kontraindikasi Metformin <30 dan inisiasi SGLT2i)."
  },
  "endo-1-3": {
    slideIndex: 2,
    widgetType: "endo-insulin-pk-viz",
    slideTitle: "Simulasi Kurva Insulin 24 Jam & Fenomena Dawn vs Somogyi",
    slideContent: "Simulasi farmakokinetik insulin basal vs prandial 24 jam serta pembeda krusial fenomena Dawn vs efek Somogyi berbasis profil glukosa nokturnal jam 03:00 vs pagi jam 06:00."
  },
  "endo-2-1": {
    slideIndex: 2,
    widgetType: "endo-dka-hhs-viz",
    slideTitle: "Simulator Protokol Jam-ke-Jam KAD vs HHS & Gerbang Kalium",
    slideContent: "Protokol resusitasi jam-ke-jam kegawatdaruratan hiperglikemia (KAD vs HHS), gerbang keselamatan kalium (<3.3 mEq/L tahan insulin!), serta transisi cairan dekstrosa saat glukosa darah mencapai target."
  },
  "endo-2-2": {
    slideIndex: 1,
    widgetType: "endo-hypoglycemia-d40-viz",
    slideTitle: "Kalkulator Protokol D40% (Aturan 3-2-1) & Matriks Trias Whipple",
    slideContent: "Kalkulator titrasi bolus Dekstrosa 40% (aturan 3-2-1) pada hipoglikemia berat tak sadar, infus D10% rumatan, serta matriks diferensial Trias Whipple (Insulinoma vs Eksogen vs Sulfonilurea)."
  },
  "endo-2-3": {
    slideIndex: 3,
    widgetType: "endo-diabetic-foot-viz",
    slideTitle: "Simulator Kaki Diabetik (Wagner, PEDIS & Matriks ABI-Iskemia)",
    slideContent: "Klasifikasi Wagner 0-5, uji probe-to-bone untuk osteomielitis, interpretasi Ankle-Brachial Index (ABI) iskemia perifer, offloading serta pemilihan regimen antibiotik empiris."
  },
  "endo-3-1": {
    slideIndex: 1,
    widgetType: "endo-thyroid-axis-viz",
    slideTitle: "Simulator Poros HPT: Graves vs Tiroiditis Subakut vs Adenoma Toksik vs TSHoma",
    slideContent: "Dinamika poros Hipotalamus-Pituitari-Tiroid, pola serologi TSH/fT4/TRAb, skintigrafi tiroid (RAIU difus vs supresi vs fokal), serta aturan khusus kehamilan (PTU trimester 1 vs Metimazol)."
  },
  "endo-3-2": {
    slideIndex: 2,
    widgetType: "endo-hypothyroid-lt4-viz",
    slideTitle: "Kalkulator Dosis Levotiroksin & Urutan Terapi Koma Miksedema",
    slideContent: "Kalkulasi dosis awal Levotiroksin (1.6 mcg/kgBB vs start-low lansia/PJK vs penyesuaian kehamilan +30%) serta urutan mutlak hidrokortison IV mendahului tiroksin pada koma miksedema."
  },
  "endo-3-3": {
    slideIndex: 1,
    widgetType: "endo-burch-wartofsky-calc",
    slideTitle: "Kalkulator Skor Burch-Wartofsky Krisis Tiroid & Sekuens PTU–Lugol",
    slideContent: "Kalkulator skor Burch-Wartofsky Point Scale (BWPS) untuk krisis tiroid serta sekuens kronologis 4 pilar terapi emergensi: PTU, Propranolol, Hidrokortison, dan jeda >=60 menit sebelum Lugol."
  },
  "endo-3-4": {
    slideIndex: 1,
    widgetType: "endo-tirads-bethesda-viz",
    slideTitle: "Kalkulator Atlas ACR TI-RADS USG Nodul Tiroid & Bethesda I–VI",
    slideContent: "Kalkulator 5 fitur USG nodul tiroid ACR TI-RADS (TR1-TR5), ambang batas ukuran inisiasi biopsi FNAB, serta atlas korelasi sitopatologi Bethesda I-VI dan estimasi risiko keganasan."
  },
  "endo-4-1": {
    slideIndex: 2,
    widgetType: "endo-cushing-addison-viz",
    slideTitle: "Stepper DST–ACTH–HDDST & Kurva Sirkadian Kortisol 24 Jam",
    slideContent: "Dinamika ritme sirkadian kortisol 24 jam serta stepper diagnostik 3 langkah: skrining hiperkortisolisme (DST 1 mg), pengukuran ACTH plasma, dan uji supresi deksametason dosis tinggi (HDDST 8 mg)."
  },
  "endo-4-2": {
    slideIndex: 1,
    widgetType: "endo-pheo-conn-viz",
    slideTitle: "Simulator Urutan Blokade Reseptor Feokromositoma & Rasio ARR Conn",
    slideContent: "Simulasi bahaya fatal unopposed alpha-1 vasokonstriksi bila beta-blocker mendahului alfa-blocker pada feokromositoma, serta kalkulator skrining rasio Aldosteron-Renin (ARR) sindrom Conn."
  },
  "endo-4-3": {
    slideIndex: 3,
    widgetType: "endo-pituitary-di-viz",
    slideTitle: "Simulator Uji Deprivasi Air + Desmopresin (AVP-D vs AVP-R vs Polidipsia)",
    slideContent: "Simulasi protokol jam-ke-jam uji deprivasi air dan uji tantang Desmopresin (DDAVP) untuk mendiferensiasi DI Sentral (AVP-D kenaikan >50%) vs DI Nefrogenik (AVP-R) vs Polidipsia Primer."
  },
  "endo-5-1": {
    slideIndex: 3,
    widgetType: "endo-calcium-dxa-viz",
    slideTitle: "Matriks 3D Ca–PO4–PTH–Vit D & Interpretasi T-Score / Z-Score DXA",
    slideContent: "Matriks diagnostik gangguan metabolisme tulang dan mineral (HPT primer/sekunder/tersier vs keganasan PTHrP vs defisiensi vitamin D) serta kalkulator T-Score/Z-Score DXA dan kalsium terkoreksi."
  }
};

const ENDO_EXTRA_WIDGET_SPECS = [
  {
    widgetType: "endo-dka-anion-calc",
    moduleId: "endo-2-1",
    slideIndex: 4,
    title: "Kalkulator Natrium Terkoreksi Katz, Osmolalitas Efektif & Anion Gap KAD/HHS"
  },
  {
    widgetType: "endo-homa-dxa-calc",
    moduleId: "endo-5-1",
    slideIndex: 5,
    title: "Kalkulator HOMA-IR, Dutch Lipid Clinic (FH) & Risiko Pankreatitis Trigliserida"
  }
];

// HEMATOLOGI ONKOLOGI MEDIK WIDGET MAP (Approved 9 Widgets: 8 Main + 1 Extra)
const HOM_WIDGET_MAP = {
  "hom-1-1": {
    slideIndex: 3,
    widgetType: "hom-iron-panel-viz",
    slideTitle: "Simulator Panel Besi, Aksis Hepsidin & Rasio sTfR",
    slideContent: "Perbandingan bar visual Feritin, TIBC, Fe Serum, Saturasi Transferin, Hepsidin & sTfR pada ADB vs ACD vs Kombinasi vs Talasemia Trait."
  },
  "hom-2-1": {
    slideIndex: 3,
    widgetType: "hom-aiha-coombs-viz",
    slideTitle: "Simulator Termodinamika AIHA (37 C vs 4 C) & Uji Coombs Langsung (DAT)",
    slideContent: "Simulasi suhu aktivasi antibodi AIHA Hangat (IgG 37 C) vs Cold Agglutinin Disease (IgM/C3d <30 C) beserta tata laksana dan jebakan steroid."
  },
  "hom-2-2": {
    slideIndex: 1,
    widgetType: "hom-g6pd-maha-smear-viz",
    slideTitle: "Atlas Mikroskop Morfologi Eritrosit Hemolitik Non-Imun",
    slideContent: "Lensa interaktif membedakan Bite/Blister cells & Heinz bodies (G6PD), Schistocytes/Helmet cells (MAHA), Spherocytes (HS), dan klon CD55/CD59 (PNH)."
  },
  "hom-3-3": {
    slideIndex: 3,
    widgetType: "hom-lymphoma-staging-viz",
    slideTitle: "Simulator Staging Ann Arbor / Lugano & Skor IPI Limfoma",
    slideContent: "Peta anatomi keterlibatan KGB atas/bawah diafragma, Gejala B, dan kalkulator Skor IPI DLBCL beserta skrining wajib HBV sebelum Rituximab."
  },
  "hom-3-4": {
    slideIndex: 2,
    widgetType: "hom-myeloma-slimcrab-viz",
    slideTitle: "Simulator Kurva SPEP (M-Spike) & Evaluator Kriteria SLiM-CRAB",
    slideContent: "Kurva densitometri protein serum (M-spike gamma) untuk membedakan MGUS, Smoldering MM, Active MM (SLiM-CRAB), dan Makroglobulinemia Waldenstrom."
  },
  "hom-4-2": {
    slideIndex: 5,
    widgetType: "hom-dic-isth-calc",
    slideTitle: "Kalkulator Skor ISTH Overt DIC & Pembeda Koagulopati Sirosis",
    slideContent: "Skoring Trombosit, D-Dimer, pemanjangan PT, dan Fibrinogen untuk diagnosis Overt DIC (>=5) serta pembeda Faktor VIII pada koagulopati sirosis."
  },
  "hom-4-3": {
    slideIndex: 6,
    widgetType: "hom-wells-dvt-transfusion-viz",
    slideTitle: "Simulator Reaksi Transfusi Akut (TRALI vs TACO vs AHTR) & Wells DVT",
    slideContent: "Komparasi hemodinamik paru pascatransfusi (TRALI hipotensi vs TACO hipertensi/BNP naik) dan kalkulator probabilitas klinis Skor Wells DVT."
  },
  "hom-5-1": {
    slideIndex: 3,
    widgetType: "hom-tls-mascc-viz",
    slideTitle: "Simulator Kinetika 72 Jam Sindrom Lisis Tumor (Cairo-Bishop)",
    slideContent: "Dinamika lonjakan Kalium, Fosfat, Asam Urat dan penurunan Kalsium pada TLS serta efek urikolitik Rasburicase (kontraindikasi G6PD) vs Alopurinol."
  }
};

const HOM_EXTRA_WIDGET_SPECS = [
  {
    widgetType: "hom-anc-mascc-calc",
    moduleId: "hom-5-1",
    slideIndex: 1,
    title: "Kalkulator ANC & Skor Risiko MASCC Neutropenia Febril"
  }
];

// REUMATOLOGI WIDGET MAP (14 Widgets: 12 Main + 2 Extra)
const REUMA_WIDGET_MAP = {
  "reuma-1-1": {
    slideIndex: 2,
    widgetType: "reuma-synovial-ana-viz",
    slideTitle: "Simulator Analisis Cairan Sendi & Atlas Pola Imunofluoresensi ANA",
    slideContent: "Perbandingan makroskopis & selularitas 4 kelas cairan sinovial (Normal, Non-inflamasi, Inflamasi, Septik) serta pola imunofluoresensi ANA Hep-2."
  },
  "reuma-1-2": {
    slideIndex: 2,
    widgetType: "reuma-ra-acr2010-calc",
    slideTitle: "Kalkulator Kriteria Klasifikasi ACR/EULAR 2010 Artritis Reumatoid",
    slideContent: "Skoring 4 domain klasifikasi ACR/EULAR 2010 RA (Sendi, RF/ACPA, CRP/LED, Durasi >=6 minggu; cutoff >=6/10) dan panduan MTX lini pertama."
  },
  "reuma-1-3": {
    slideIndex: 3,
    widgetType: "reuma-spa-axial-viz",
    slideTitle: "Simulator Spondiloartritis Aksial (Bamboo Spine) vs DISH vs PsA",
    slideContent: "Perbandingan morfologi sindesmofit marginal vertikal (AS), nr-axSpA (MRI STIR+), DISH, dan Artritis Psoriatik beserta algoritma OAINS -> bDMARD."
  },
  "reuma-2-1": {
    slideIndex: 1,
    widgetType: "reuma-sle-acr2019-calc",
    slideTitle: "Kalkulator Kriteria Klasifikasi ACR/EULAR 2019 SLE",
    slideContent: "Gerbang masuk wajib ANA >=1:80 diikuti pembobotan tertinggi domain klinis dan imunologis SLE (cutoff >=10 poin)."
  },
  "reuma-2-2": {
    slideIndex: 5,
    widgetType: "reuma-sle-pregnancy-viz",
    slideTitle: "Simulator Keamanan Imunosupresan Kehamilan & Lupus Neonatal",
    slideContent: "Matriks obat aman kehamilan (HCQ, Azatioprin, Takrolimus, LMWH+Aspirin) vs teratogenik mutlak (MMF, MTX, CYC) serta blok jantung janin Anti-Ro/SSA."
  },
  "reuma-2-3": {
    slideIndex: 2,
    widgetType: "reuma-ssc-capillaroscopy-viz",
    slideTitle: "Atlas Kapilaroskopi Lipat Kuku & Pembeda lcSSc vs dcSSc",
    slideContent: "Visualisasi megakapiler & zona avaskular lipat kuku, perbandingan Anti-Centromere (PAH) vs Anti-Scl-70 (ILD) vs Anti-RNA Pol III (Krisis Renal Captopril)."
  },
  "reuma-2-4": {
    slideIndex: 3,
    widgetType: "reuma-myositis-panel-viz",
    slideTitle: "Simulator Fenotipe Miopati Inflamatorik & Panel Autoantibodi (MSA)",
    slideContent: "Korelasi klinis ruam dermatomiositis, kelemahan otot proksimal, dan profil antibodi Anti-Jo-1 (ASS/ILD), Anti-Mi-2, Anti-MDA5, Anti-TIF1-gamma, dan Anti-HMGCR."
  },
  "reuma-3-1": {
    slideIndex: 1,
    widgetType: "reuma-crystal-polar-viz",
    slideTitle: "Simulator Mikroskop Polarisasi Kompensator Merah (MSU vs CPPD)",
    slideContent: "Simulasi rotasi sumbu kompensator polarisasi (0-90 derajat) pada kristal jarum MSU (negative birefringent: kuning sejajar) vs romboid CPPD (biru sejajar)."
  },
  "reuma-3-2": {
    slideIndex: 2,
    widgetType: "reuma-septic-joint-viz",
    slideTitle: "Simulator Probabilitas Artritis Septik & Protokol Drainase-Antibiotik",
    slideContent: "Stratifikasi risiko artritis septik berdasarkan hitung leukosit cairan sendi (>50.000/mm3), perbedaan nongonokokal vs DGI, serta terapi empiris + drainase."
  },
  "reuma-3-3": {
    slideIndex: 2,
    widgetType: "reuma-oa-kellgren-viz",
    slideTitle: "Simulator Radiografi Lutut Kellgren-Lawrence (Grade 0-4) & Terapi OA",
    slideContent: "Progresi penyempitan celah sendi medial, osteofit marginal, dan sklerosis subkondral (KL 0-4) beserta terapi multimodal OA dan profilaksis GIOP."
  },
  "reuma-4-1": {
    slideIndex: 0,
    widgetType: "reuma-vasculitis-caliber-viz",
    slideTitle: "Simulator Kaliber Pembuluh Darah Vaskulitis Chapel Hill (CHCC)",
    slideContent: "Peta spektrum vaskulitis pembuluh besar (Takayasu, GCA -> steroid cito cegah kebutaan), sedang (PAN-HBV), dan kecil (ANCA vs Kompleks Imun)."
  },
  "reuma-4-2": {
    slideIndex: 1,
    widgetType: "reuma-anca-spectrum-viz",
    slideTitle: "Simulator Spektrum Vaskulitis ANCA (GPA vs MPA vs EGPA) & IgAV",
    slideContent: "Matriks keterlibatan THT, paru, ginjal (RPGN), eosinofilia, serta serologi c-ANCA/PR3 vs p-ANCA/MPO pada vaskulitis pembuluh kecil."
  }
};

const REUMA_EXTRA_WIDGET_SPECS = [
  {
    widgetType: "reuma-hand-joint-viz",
    moduleId: "reuma-1-1",
    slideIndex: 1,
    title: "Atlas Distribusi Sendi Jari Tangan pada Artritis (RA vs OA vs PsA vs SLE vs Gout)"
  },
  {
    widgetType: "reuma-das28-calc",
    moduleId: "reuma-1-2",
    slideIndex: 3,
    title: "Kalkulator Aktivitas Penyakit DAS28-ESR (Treat-to-Target RA)"
  },
  {
    widgetType: "reuma-sledai-flare-calc",
    moduleId: "reuma-2-1",
    slideIndex: 6,
    title: "Evaluator Aktivitas SLEDAI-2K & Derajat Flare Lupus"
  }
];

const GERI_WIDGET_MAP = {
  "geri-1-1": {
    slideIndex: 0,
    widgetType: "geri-cga-dashboard-viz",
    slideTitle: "Simulator 5 Domain Pengkajian Paripurna Pasien Geriatri (P3G / CGA)",
    slideContent: "Evaluasi terintegrasi 5 domain P3G (Fungsional Barthel/Lawton, Kognitif AMT/MMSE, Afektif GDS-15, Nutrisi MNA-SF, Sosial/Caregiver) pada berbagai profil lansia."
  },
  "geri-1-2": {
    slideIndex: 1,
    widgetType: "geri-beers-acb-viz",
    slideTitle: "Simulator Polifarmasi, Kriteria AGS Beers, ACB & Prescribing Cascade",
    slideContent: "Analisis obat berisiko tinggi (antikolinergik, benzodiazepin, sulfonilurea), mekanisme prescribing cascade (amlodipin-furosemid, metoklopramid-levodopa), dan deprescribing."
  },
  "geri-2-1": {
    slideIndex: 3,
    widgetType: "geri-cam-delirium-viz",
    slideTitle: "Algoritma Confusion Assessment Method (CAM) & Matriks 3D (Delirium vs Demensia vs Depresi)",
    slideContent: "Diagnostik interaktif CAM (Fitur 1 + 2 wajib + Fitur 3 atau 4) serta perbandingan onset, atensi, kesadaran, dan terapi Delirium vs Demensia vs Depresi."
  },
  "geri-2-2": {
    slideIndex: 2,
    widgetType: "geri-dementia-domains-viz",
    slideTitle: "Atlas Neuroanatomi & Fenotipe Demensia (Alzheimer vs Vaskular vs Lewy Body vs MCI)",
    slideContent: "Korelasi atrofi hipokampus (Alzheimer), infark multipel Hachinski >=7 (Vaskular), badan Lewy oksipital/substansia nigra (DLB), serta workup reversibel TSH & B12."
  },
  "geri-2-4": {
    slideIndex: 5,
    widgetType: "geri-refeeding-electrolyte-viz",
    slideTitle: "Simulator Pergeseran Intraseluler Fosfat, Kalium, Magnesium & Tiamin (Refeeding Syndrome)",
    slideContent: "Simulasi lonjakan insulin saat re-introduksi kalori yang memicu hipofosfatemia berat, hipokalemia, hipomagnesemia, serta protokol pencegahan NICE + tiamin."
  },
  "geri-3-2": {
    slideIndex: 3,
    widgetType: "geri-pressure-injury-viz",
    slideTitle: "Atlas Penampang Ulkus Dekubitus (NPIAP Stadium I–IV) & Matriks Inkontinensia Urin",
    slideContent: "Penampang anatomi epidermis hingga tulang sakrum untuk staging ulkus dekubitus NPIAP I–IV beserta perawatan luka dan klasifikasi 4 tipe inkontinensia urin."
  }
};

const GERI_EXTRA_WIDGET_SPECS = [
  {
    widgetType: "geri-barthel-adl-calc",
    moduleId: "geri-1-1",
    slideIndex: 3,
    title: "Kalkulator Status Fungsional Indeks Barthel ADL (Standar P3G 0–20 Poin)"
  },
  {
    widgetType: "geri-mna-refeeding-calc",
    moduleId: "geri-2-4",
    slideIndex: 1,
    title: "Kalkulator Skrining Malnutrisi MNA-SF (0–14) & Korelasi Skor MNA Total (30 Poin)"
  }
];

const ALERGI_WIDGET_MAP = {
  "alergi-3-2": {
    slideIndex: 5,
    widgetType: "alergi-vaccine-immunosupp-viz",
    slideTitle: "Simulator Keamanan Vaksinasi pada Imunosupresi (Rituximab, Steroid, HIV CD4), Kehamilan & Luka Tetanus",
    slideContent: "Matriks pemilihan vaksin aman vs kontraindikasi, aturan jeda Rituximab (>=6 bulan pasca & >=4 minggu pra-siklus), steroid dosis tinggi, kehamilan, dan tetanus."
  }
};

const ALERGI_EXTRA_WIDGET_SPECS = [];

const PSIKO_WIDGET_MAP = {
  "psiko-1-2": {
    slideIndex: 2,
    widgetType: "psiko-fibromyalgia-acr-calc",
    slideTitle: "Kalkulator Kriteria Fibromialgia ACR 2016 (WPI + SSS) vs ACR 1990 & Algoritma Terapi",
    slideContent: "Evaluasi Widespread Pain Index (WPI) dan Symptom Severity Scale (SSS) beserta algoritma terapi multimodal (Duloxetine/Pregabalin/CBT; hindari kortikosteroid)."
  },
  "psiko-3-1": {
    slideIndex: 1,
    widgetType: "psiko-who-pain-ladder-viz",
    slideTitle: "Simulator WHO Analgesic Ladder (Step 1–3), Aturan Opioid-Naive & Konversi Morfin IV ke Oral (1:3)",
    slideContent: "Visualisasi tangga analgesik WHO, kontraindikasi fentanil patch langsung pada pasien opioid-naive, dan rumus konversi morfin IV + breakthrough ke oral lepas lambat."
  }
};

const PSIKO_EXTRA_WIDGET_SPECS = [];







  const TROPIK_CALCULATOR_SPECS = [
    { widgetType: "sepsis-calc", moduleId: "tropik-1-1", slideIndex: 2, title: "Kalkulator Volume Resusitasi Sepsis (SSC 2021)" },
    { widgetType: "dss-calc", moduleId: "tropik-1-3", slideIndex: 2, title: "Kalkulator Resusitasi Cairan DSS (PNPK 2021)" },
    { widgetType: "tifoid-calc", moduleId: "tropik-2-1", slideIndex: 2, title: "Kalkulator Dosis Deksametason Ensefalopati Tifoid" },
    { widgetType: "malaria-calc", moduleId: "tropik-3-1", slideIndex: 2, title: "Kalkulator Dosis DHP & Artesunat IV Malaria" },
    { widgetType: "tropik-abx-stewardship-viz", moduleId: "tropik-6-3", slideIndex: 1, title: "Antibiotic Helper: Spektrum 36 Obat, Empiric Builder, PK/PD & Dosis Ginjal" }
  ];

  function buildSlidesFromSnackableSummary(mod) {
    const nefroMeta = mod && NEFRO_WIDGET_MAP[mod.id];
    const pulmoMeta = mod && PULMO_WIDGET_MAP[mod.id];
    const gehMeta = mod && GEH_WIDGET_MAP[mod.id];
    const endoMeta = mod && ENDO_WIDGET_MAP[mod.id];
    const homMeta = mod && HOM_WIDGET_MAP[mod.id];
    const reumaMeta = mod && REUMA_WIDGET_MAP[mod.id];
    const geriMeta = mod && GERI_WIDGET_MAP[mod.id];
    const alergiMeta = mod && ALERGI_WIDGET_MAP[mod.id];
    const psikoMeta = mod && PSIKO_WIDGET_MAP[mod.id];
    const pulmoExtras = mod
      ? [
          ...TROPIK_CALCULATOR_SPECS.filter((x) => x.moduleId === mod.id),
          ...PULMO_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...GEH_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...ENDO_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...HOM_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...REUMA_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...GERI_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...ALERGI_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id),
          ...PSIKO_EXTRA_WIDGET_SPECS.filter((x) => x.moduleId === mod.id)
        ]
      : [];
    const widgetMeta = nefroMeta || pulmoMeta || gehMeta || endoMeta || homMeta || reumaMeta || geriMeta || alergiMeta || psikoMeta;
    if (Array.isArray(mod?.slides) && mod.slides.length > 0) {
      if (!widgetMeta && pulmoExtras.length === 0) return mod.slides;
      const idxMap = new Map();
      if (widgetMeta && widgetMeta.widgetType) {
        const targetIdx = Math.min(Math.max(0, widgetMeta.slideIndex ?? 0), mod.slides.length - 1);
        idxMap.set(targetIdx, widgetMeta.widgetType);
      }
      pulmoExtras.forEach((ex) => {
        const exIdx = Math.min(Math.max(0, ex.slideIndex ?? 0), mod.slides.length - 1);
        if (!idxMap.has(exIdx)) idxMap.set(exIdx, ex.widgetType);
      });
      return mod.slides.map((s, idx) =>
        idxMap.has(idx) ? { ...s, widgetType: s.widgetType || idxMap.get(idx) } : s
      );
    }
    const summary = mod?.snackable_summary || {};
    const concepts = Array.isArray(summary.key_concepts) ? summary.key_concepts : [];
    const tableRefs = Array.isArray(summary.diagnostic_tables_ref) ? summary.diagnostic_tables_ref : [];
    const kkiItems = Array.isArray(mod?.kki_competency_items) ? mod.kki_competency_items : [];
    const slides = [];

    if (concepts.length > 0) {
      slides.push({
        title: "1. Poin Kunci & Konsep Inti",
        content: concepts[0],
        studyHtml: `<ul class="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">${concepts
          .map((c) => `<li>${escapeHtml(c)}</li>`)
          .join("")}</ul>`
      });
    }
    if (widgetMeta) {
      slides.push({
        title: `${slides.length + 1}. ${widgetMeta.slideTitle}`,
        content: widgetMeta.slideContent,
        studyHtml: `<p class="text-xs sm:text-sm text-[var(--text-secondary)] mb-2">${escapeHtml(widgetMeta.slideContent)}</p>`,
        widgetType: widgetMeta.widgetType
      });
    }
    if (tableRefs.length > 0 || kkiItems.length > 0) {
      slides.push({
        title: `${slides.length + 1}. Kompetensi KKI & Rujukan Diagnostik`,
        content: mod?.papdi_reference || "Ringkasan referensi PAPDI Edisi VII & SK KKI 181/2024",
        studyHtml: `
          <div class="space-y-3 text-xs sm:text-sm">
            ${
              kkiItems.length > 0
                ? `<div><strong>Topik Kompetensi KKI:</strong><ul class="list-disc pl-5 mt-1 space-y-1">${kkiItems
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${
              tableRefs.length > 0
                ? `<div><strong>Tabel Diagnostik Acuan:</strong><ul class="list-disc pl-5 mt-1 space-y-1">${tableRefs
                    .map((t) => `<li>${escapeHtml(t)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${mod?.papdi_reference ? `<div><strong>Referensi PAPDI:</strong> ${escapeHtml(mod.papdi_reference)}</div>` : ""}
          </div>
        `
      });
    }
    return slides;
  }

  // =========================================================================
  // UI v2 HELPERS: SVG Icons, Compact 2-Level Module Titles & Font Size Control
  // =========================================================================


  function svgIcon(name, cls = "w-4 h-4") {
    const paths = {
      book: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />`,
      clipboard: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />`,
      award: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 15l-3.5 2 1-4L6 10l4-.5L12 6l2 3.5 4 .5-3.5 3 1 4z" />`,
      check: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.1" d="M5 13l4 4L19 7" />`,
      close: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
      alert: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />`,
      flame: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 3c.5 3-2 4.5-2 7.5a3.5 3.5 0 007 0c0-1.5-.5-3-1.5-4.5 2.5 1.5 4 4 4 6.8a7.5 7.5 0 11-15 0c0-3.2 2-6.5 5.5-9.8z" />`,
      sparkles: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />`,
      dna: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M7 4c0 4 10 4 10 8s-10 4-10 8M17 4c0 4-10 4-10 8s10 4 10 8M8 7h8M8 17h8" />`,
      target: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-5a4 4 0 100-8 4 4 0 000 8zm0-3a1 1 0 100-2 1 1 0 000 2z" />`,
      arrowLeft: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />`,
      arrowRight: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />`,
      zap: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />`,
      shield: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />`,
      trophy: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" />`,
      moon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`,
      sun: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`,
      home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5.5v-6h-5v6H4a1 1 0 01-1-1v-9.5z" />`,
      menu: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d="M4 6h16M4 12h16M4 18h16" />`,
      user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />`,
      sliders: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />`,
      volume: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />`,
      volumeOff: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />`,
      layers: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />`,
      play: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d="M6 4l14 8-14 8V4z" />`,
      search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />`,
      chevronDown: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6" />`,
      refresh: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
      download: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />`,
      upload: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" />`
    };
    const body = paths[name] || paths.book;
    return `<svg class="${cls} shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">${body}</svg>`;
  }

  function renderInternaSnackLogoSvg(cls = "w-8 h-8") {
    return `<img src="icons/icon.svg?v=2" class="${cls} shrink-0 rounded-xl" alt="Interna Snack" />`;
  }

  const MODULE_DISPLAY_MAP = {
    // Tropik Infeksi (20)
    "tropik-1-1": { title: "Sepsis & Syok Septik", subtitle: "Sepsis-3, Bundle 1-Jam SSC & Vasopresor" },
    "tropik-1-2": { title: "Demam Akut & FUO", subtitle: "Evaluasi FUO, Drug Fever & Hipertermia" },
    "tropik-1-3": { title: "Infeksi Dengue", subtitle: "DF, DBD, DSS & Expanded Dengue Syndrome" },
    "tropik-2-1": { title: "Demam Tifoid & MDRST", subtitle: "Kultur, Resistensi & Karier Kronik Salmonella" },
    "tropik-2-2": { title: "Leptospirosis", subtitle: "Bentuk Anikterik & Sindrom Weil" },
    "tropik-2-3": { title: "Tetanus & Profilaksis Luka", subtitle: "Tetanus Generalisata, Sefalik & TIG" },
    "tropik-2-4": { title: "Zoonosis Bakterial", subtitle: "Difteri, Antraks & Bruselosis" },
    "tropik-3-1": { title: "Malaria & Kemoprofilaksis", subtitle: "Tanpa Komplikasi, Malaria Berat & Artesunat" },
    "tropik-3-2": { title: "Amebiasis & Abses Hati", subtitle: "Amebiasis Intestinal & AHA vs Piogenik" },
    "tropik-4-1": { title: "HIV/AIDS & Terapi ARV", subtitle: "Diagnostik, TLD, PrEP/PEP, TPT & IRIS" },
    "tropik-4-2": { title: "Infeksi Oportunistik SSP", subtitle: "Toksoplasmosis Serebri, Kriptokokus & Meningitis TB" },
    "tropik-4-3": { title: "IO Pulmoner & Mukokutan", subtitle: "PCP, Kandidiasis & Histoplasmosis pada HIV" },
    "tropik-4-4": { title: "IO Viral & IMS", subtitle: "CMV, HSV/VZV, Sifilis & Ulkus Genital" },
    "tropik-5-1": { title: "Diare Akut Infeksius", subtitle: "Disentri Basiler, Kolera, Giardia & C. difficile" },
    "tropik-5-2": { title: "Helmintiasis", subtitle: "STH, Filariasis, Taenia/Sistiserkosis & Trematoda" },
    "tropik-5-3": { title: "Mikosis Sistemik Invasif", subtitle: "Aspergilosis (IPA/CAPA) & Mukormikosis" },
    "tropik-6-1": { title: "Virus Respiratorik", subtitle: "Influenza, MERS/COVID-19 & Mumps" },
    "tropik-6-2": { title: "Zoonosis Viral Berat", subtitle: "Rabies, Mpox & Demam Berdarah Ebola" },
    "tropik-6-3": { title: "Infeksi Nosokomial & AMR", subtitle: "HAP/VAP, ISK/ASB, SSI, MRSA & CRE" },
    "tropik-6-4": { title: "Vaksinasi Dewasa", subtitle: "Imunokompromais, Ibu Hamil & Travel Medicine" },
    // Kardiologi (16)
    "cardio-stemi": { title: "STEMI & Ekuivalen", subtitle: "Infark Elevasi ST, PPCI & Fibrinolitik" },
    "cardio-nsteacs": { title: "NSTE-ACS", subtitle: "NSTEMI, Angina Tidak Stabil & Stratifikasi GRACE" },
    "cardio-ccs-dyslipidemia": { title: "CCS & Dislipidemia", subtitle: "Angina Stabil, Target LDL & Pencegahan Sekunder" },
    "cardio-adhf": { title: "Gagal Jantung Akut (ADHF)", subtitle: "Edema Paru Kardiogenik & Profil Hemodinamik" },
    "cardio-shock": { title: "Syok Kardiogenik", subtitle: "Dukungan Hemodinamik & Komplikasi Mekanik" },
    "cardio-chronic-hf": { title: "Gagal Jantung Kronik", subtitle: "HFrEF 4 Pilar, HFmrEF/HFpEF & Kardiomiopati" },
    "cardio-vt-svt": { title: "Takiaritmia Tidak Stabil", subtitle: "VT/VF, SVT & Protokol Kardioversi/Defibrilasi" },
    "cardio-af-rvr": { title: "Fibrilasi Atrium (AF RVR)", subtitle: "Kendali Laju/Irama & Antikoagulasi CHA2DS2-VA" },
    "cardio-brady-avb": { title: "Bradiaritmia & AV Block", subtitle: "Disfungsi Nodus SA & Pacu Jantung" },
    "cardio-valvular-rf": { title: "Penyakit Katup & PJR", subtitle: "Demam Reumatik, Stenosis/Regurgitasi & PJB Dewasa" },
    "cardio-ie-myopericarditis": { title: "Endokarditis & Mioperikard", subtitle: "Duke-ISCVID, Perikarditis, Miokarditis & Kardio-Onkologi" },
    "cardio-tamponade": { title: "Tamponade Jantung", subtitle: "Trias Beck, Ekokardiografi & Perikardiosentesis" },
    "cardio-ht-essential": { title: "Hipertensi Esensial", subtitle: "ESC 2024, Terapi SPC, Resisten & Hipertensi Sekunder" },
    "cardio-ht-crisis": { title: "Krisis Hipertensi", subtitle: "Hipertensi Emergensi vs Urgensi & Target MAP" },
    "cardio-aorta-pad": { title: "Aorta, PAD & ALI", subtitle: "Diseksi Aorta, AAA, ABI/TBI & Iskemia Tungkai Akut" },
    "cardio-pe": { title: "Emboli Paru Akut", subtitle: "Tromboemboli Vena, Skor Wells & Trombolisis" },
    // Ginjal & Hipertensi (29)
    "nefro-1-1": { title: "Fisiologi Filtrasi Ginjal", subtitle: "Hemodinamik Glomerulus & Regulasi Tubulus" },
    "nefro-1-2": { title: "Sedimen Urin & Hematuria", subtitle: "Morfologi Eritrosit, Silinder & Urinalisis" },
    "nefro-1-3": { title: "Evaluasi Proteinuria", subtitle: "Klasifikasi KDIGO, ACR/PCR & Selektivitas" },
    "nefro-2-1": { title: "Disnatremia & Tonisitas", subtitle: "Hiponatremia, Hipernatremia & Batas Koreksi" },
    "nefro-2-2": { title: "Diskalemia & Hiperkalemia", subtitle: "Stabilisasi Membran EKG & Redistribusi Kalium" },
    "nefro-2-3": { title: "Analisis Gas Darah", subtitle: "Anion Gap, Delta-Delta & Koreksi Bikarbonat" },
    "nefro-2-4": { title: "Renal Tubular Acidosis", subtitle: "RTA Tipe 1, 2, 4 & Gangguan Mineral" },
    "nefro-3-1": { title: "AKI Prerenal vs ATN", subtitle: "Kriteria KDIGO, FENa & Indeks Urin" },
    "nefro-3-2": { title: "AKI Spesifik & Nefrotoksin", subtitle: "Kontras, Rabdomiolisis & Cedera Obat" },
    "nefro-3-3": { title: "Nefritis Interstisial", subtitle: "AIN Akut Akibat Obat vs TIN Kronik" },
    "nefro-3-4": { title: "Inisiasi Dialisis Akut", subtitle: "Indikasi CITO (AEIOU) & Modalitas TPG" },
    "nefro-4-1": { title: "Sindrom Nefrotik Dewasa", subtitle: "MCD, FSGS, Nefropati Membranosa & Steroid" },
    "nefro-4-2": { title: "Sindrom Nefritik & GN", subtitle: "GN Pasca-Infeksi, Akut & Progresif" },
    "nefro-4-3": { title: "Nefritis Lupus", subtitle: "Klasifikasi ISN/RPS I–VI & Induksi Imunosupresan" },
    "nefro-4-4": { title: "RPGN & Glomerulopati", subtitle: "Vaskulitis ANCA, Nefropati IgA & Sindrom Goodpasture" },
    "nefro-5-1": { title: "PGK & Nefropati Diabetik", subtitle: "Staging G1–G5 KDIGO, SGLT2i & RAAS" },
    "nefro-5-2": { title: "Anemia Renal & CKD-MBD", subtitle: "Target Hb, ESA, Besi IV & Pengikat Fosfat" },
    "nefro-5-3": { title: "Hemodialisis Kronik", subtitle: "Adekuasi Kt/V, Akses Vaskular & Etika TPG" },
    "nefro-5-4": { title: "CAPD & Transplantasi Ginjal", subtitle: "Peritonitis Dialisis & Imunosupresi Transplant" },
    "nefro-6-1": { title: "Nefrolitiasis & Obstruksi", subtitle: "Batu Saluran Kemih, Hidronefrosis & Dekompresi" },
    "nefro-6-2": { title: "BPH & Disfungsi Berkemih", subtitle: "LUTD, Alfa-Blocker, 5-ARI & Kandung Kemih Neurogenik" },
    "nefro-6-3": { title: "Infeksi Saluran Kemih", subtitle: "ISK Sederhana, Komplikata, Pielonefritis & Hamil" },
    "nefro-7-1": { title: "Hipertensi Primer", subtitle: "Target TD, Kombinasi Obat & Deteksi HMOD" },
    "nefro-7-2": { title: "Hipertensi Resisten & DM/PGK", subtitle: "Spironolakton & Penyesuaian Komorbid Kardio-Renal" },
    "nefro-7-3": { title: "Krisis Hipertensi Renal", subtitle: "Hipertensi Emergensi vs Urgensi & Antihipertensi IV" },
    "nefro-7-4": { title: "Hipertensi Sekunder & Hamil", subtitle: "Aldosteronisme, Stenosis Arteri & Preeklamsia" },
    "nefro-8-1": { title: "Sindrom Kardiorenal & SHR", subtitle: "Klasifikasi SKR 1–5 & Protokol Terlipresin-Albumin" },
    "nefro-8-2": { title: "Penyakit Ginjal Polikistik", subtitle: "ADPKD, Sindrom Alport & Kelainan Herediter" },
    "nefro-8-3": { title: "Nefro-Onkologi & Geriatri", subtitle: "Cedera Ginjal Kemoterapi, Perioperatif & Lansia" },
    "pulmo-1-1": { title: "Fisiologi Paru, Spirometri & AGD", subtitle: "Volume Paru, Obstruksi vs Restriksi, DLCO & Asam-Basa" },
    "pulmo-1-2": { title: "Asma Bronkial & Status Asmatikus", subtitle: "GINA 2024, Fenotipe T2-High, MART & Manajemen Eksaserbasi" },
    "pulmo-1-3": { title: "PPOK Stabil & Eksaserbasi Akut", subtitle: "GOLD ABE, Bronkodilator Ganda, Triple Therapy & Biologik" },
    "pulmo-1-4": { title: "Bronkiektasis, Abses Paru & Hemoptisis", subtitle: "P. aeruginosa, Abses Anaerob vs Clindamycin & Hemoptisis Masif" },
    "pulmo-2-1": { title: "Pneumonia Komunitas & Nosokomial", subtitle: "CAP (CURB-65/ATS), HAP, VAP, MRSA & Anti-Pseudomonas" },
    "pulmo-2-2": { title: "Tuberkulosis Sensitif Obat (TB-SO)", subtitle: "TCM Xpert, Paduan 2HRZE/4HR, Efek Samping OAT/DILI & TB-HIV" },
    "pulmo-2-3": { title: "TB Resisten Obat & Mikobakterium NTM", subtitle: "BPaLM/BPaL 6 Bulan, Klasifikasi Grup WHO & MAC/M. abscessus" },
    "pulmo-2-4": { title: "Mikosis Paru & Aspergilosis", subtitle: "ABPA, Aspergilloma, CPA, IPA (Galactomannan) & PCP (HIV)" },
    "pulmo-3-1": { title: "Efusi Pleura, Empiema & Kilotoraks", subtitle: "Kriteria Light, Pseudoeksudat, ADA TB, MIST2 tPA+DNase & RPE" },
    "pulmo-3-2": { title: "Pneumotoraks & Tata Laksana WSD", subtitle: "Tension Dekompresi ATLS 10, BTS 2023, Undulasi WSD & Deep Sulcus" },
    "pulmo-3-3": { title: "Mediastinum, SVCS & Mediastinitis", subtitle: "ITMIG 4T, Timoma-MG, Biopsi vs Stent SVCS & Sindrom Boerhaave" },
    "pulmo-4-1": { title: "Penyakit Paru Interstisial (ILD)", subtitle: "IPF/UIP vs NSIP, Sarkoidosis (Lofgren) & Pneumokoniosis" },
    "pulmo-4-2": { title: "Emboli Paru & Hipertensi Pulmonal", subtitle: "Wells/Age-Dimer/CTPA, High-Risk PE, PH 2022 & CTEPH/PEA" },
    "pulmo-4-3": { title: "Onkologi Toraks & Paraneoplastik", subtitle: "SPN/Fleischner, NSCLC EGFR/ALK, SCLC, Pancoast-Horner & LEMS" },
    "pulmo-5-1": { title: "Gagal Napas Akut, HFNC & ARDS", subtitle: "Tipe I-II, ROX Index, ARDSNet 6 mL/kg PBW, PROSEVA & Global 2024" },
    "pulmo-5-2": { title: "Ventilasi Mekanik, NIV, Weaning & OSA", subtitle: "BiPAP/CPAP, Ppeak-Pplat, Auto-PEEP, RSBI & Pickwickian/OHS" },
    // Gastroenterohepatologi Sub-klaster 5 (5)
    "geh-5-1": { title: "Kolelitiasis, Koledokolitiasis & Polip", subtitle: "Batu Kolesterol/Pigmen, ASGE 2019, Mirizzi & Polip ESGAR 2022" },
    "geh-5-2": { title: "Kolesistitis Akut (TG18)", subtitle: "Kalkulosa vs Akalkulosa, Grading TG18, Early Cholecystectomy & PTGBD" },
    "geh-5-3": { title: "Kolangitis Akut (TG18)", subtitle: "Trias Charcot, Pentad Reynolds, Grading TG18 & Dekompresi ERCP CITO" },
    "geh-5-4": { title: "Pankreatitis Akut", subtitle: "Revised Atlanta 2012, BISAP, WATERFALL Trial & Step-Up WON" },
    "geh-5-5": { title: "Pankreatitis Kronik, IPMN & Ca Pankreas", subtitle: "TIGAR-O, Fecal Elastase-1/PERT, AIP IgG4, Kyoto 2024 & PDAC" }
  };

  function getModuleDisplayTitles(mod) {
    if (!mod) return { title: "Modul Klinis", subtitle: "", fullTitle: "Modul Klinis" };
    const mapped = MODULE_DISPLAY_MAP[mod.id];
    if (mapped) {
      return { title: mapped.title, subtitle: mapped.subtitle, fullTitle: mod.title || mapped.title };
    }
    const raw = (mod.title || "").trim();
    if (mod.shortTitle) {
      return { title: mod.shortTitle, subtitle: mod.subtitle || "", fullTitle: raw };
    }
    const colonIdx = raw.indexOf(":");
    const openParenIdx = raw.indexOf("(");
    if (colonIdx !== -1 && (openParenIdx === -1 || colonIdx < openParenIdx)) {
      return { title: raw.slice(0, colonIdx).trim(), subtitle: raw.slice(colonIdx + 1).trim(), fullTitle: raw };
    }
    const parenIdx = openParenIdx;
    if (parenIdx > 8) {
      return {
        title: raw.slice(0, parenIdx).trim(),
        subtitle: raw.slice(parenIdx).replace(/[()]/g, "").trim(),
        fullTitle: raw
      };
    }
    return { title: raw, subtitle: mod.subtitle || "", fullTitle: raw };
  }



  R.maps = {
    SUBCLUSTER_TITLES,
    NEFRO_WIDGET_MAP,
    PULMO_WIDGET_MAP,
    PULMO_EXTRA_WIDGET_SPECS,
    GEH_WIDGET_MAP,
    GEH_EXTRA_WIDGET_SPECS,
    ENDO_WIDGET_MAP,
    ENDO_EXTRA_WIDGET_SPECS,
    HOM_WIDGET_MAP,
    HOM_EXTRA_WIDGET_SPECS,
    REUMA_WIDGET_MAP,
    REUMA_EXTRA_WIDGET_SPECS,
    GERI_WIDGET_MAP,
    GERI_EXTRA_WIDGET_SPECS,
    ALERGI_WIDGET_MAP,
    ALERGI_EXTRA_WIDGET_SPECS,
    PSIKO_WIDGET_MAP,
    PSIKO_EXTRA_WIDGET_SPECS,
    TROPIK_CALCULATOR_SPECS
  };

  R.utils = {
    clampNum,
    escapeHtml,
    normalizeQuestionCategory,
    formatDuration,
    shuffleArray,
    getAllModules,
    getDivisionMeta,
    getDivisionShortLabel,
    getDivisionInitials,
    SUBCLUSTER_TITLES,
    buildSlidesFromSnackableSummary,
    svgIcon,
    renderInternaSnackLogoSvg,
    getModuleDisplayTitles
  };

  global.InternaRuntime = R;
})(window);
