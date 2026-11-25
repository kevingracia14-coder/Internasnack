/* ==========================================================================
   InternaSnack — Core Application Controller (v2)
   - 3 Tombol Modul: Review (Carousel 7-Komponen), Latih 10 Soal, Rujukan Khusus
   - Level Kompetensi Langsung pada Kartu (Tanpa Sortiran Tier)
   - Tab Profil & Statistik Belajar (Menggantikan Nilai Lab di Nav Bar)
   - Navigasi Keyboard Arrow Key (Next/Prev, Submit, Opsi 1-5, Flip)
   - Mobile-Friendly dengan Bottom Navigation Bar
   ========================================================================== */

(function () {
  const R = window.InternaRuntime;
  const {
    clampNum, escapeHtml, normalizeQuestionCategory, formatDuration, shuffleArray,
    getAllModules, getDivisionMeta, getDivisionShortLabel, getDivisionInitials,
    SUBCLUSTER_TITLES, buildSlidesFromSnackableSummary, svgIcon, renderInternaSnackLogoSvg, getModuleDisplayTitles
  } = R.utils;
  const { NEFRO_WIDGET_MAP, PULMO_WIDGET_MAP, GEH_WIDGET_MAP, ENDO_WIDGET_MAP } = R.maps;
  const { cancelAllVizAnimations } = R.viz;
  const { renderInteractiveWidget, getWidgetCatalog } = R.registry;

  const STORAGE_KEY = "internasnack_sppd_state_v2";

  function getLocalDateKey(offsetDays = 0) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const defaultState = {
    themePreference: "system",
    fontSizePreference: "normal",
    selectedDivisionId: "tropik-infeksi",
    userProfile: {
      name: "dr. Residen Interna",
      title: "Residen Ilmu Penyakit Dalam",
      avatarEmoji: "stethoscope"
    },
    streakDays: 0,
    lastStudyDate: null,
    lastDailyDate: getLocalDateKey(0),
    lastFirstWinDate: null,
    totalXP: 0,
    dailyXP: 0,
    dailyGoalXP: 100,
    sessionsCompleted: 0,
    personalBestScore: 0,
    personalBestStreak: 0,
    personalLeaderboard: [],
    divisionXP: {},
    lastDivisionPracticeDate: {},
    dashboardStatusFilter: "all",
    quizSourceFilter: "all",
    quizCategoryFilter: "all",
    tryoutDivisionFilter: "all",
    tocDivisionFilter: "all",
    tocStatusFilter: "all",
    divisionAccordions: {
      "tropik-infeksi": true,
      "kardiologi": true,
      "ginjal-hipertensi": true,
      "pulmonologi": true,
      "gastroenterohepatologi": true,
      "endokrin-metabolik": true,
      "hematologi-onkologi": true,
      "reumatologi": true,
      "geriatri": true,
      "alergi-imunologi": true,
      "psikosomatik-paliatif": true
    },
    topicSearchQuery: "",
    topicsRead: {},
    quizStats: {
      totalAnswered: 0,
      totalCorrect: 0
    },
    srs: {},
    customQuestions: [],
    customModules: [],
    lastOpenedModuleId: null,
    materiClusterFilter: "all",
    soundEnabled: true,
    unlockedAchievements: [],
    snackQuizConfig: {
      count: 10,
      divisions: ["tropik-infeksi", "kardiologi", "ginjal-hipertensi", "pulmonologi", "gastroenterohepatologi", "endokrin-metabolik", "hematologi-onkologi", "reumatologi", "geriatri", "alergi-imunologi", "psikosomatik-paliatif"],
      source: "mixed"
    },
    cbtConfig: {
      packageSize: 25,
      divisions: ["tropik-infeksi", "kardiologi", "ginjal-hipertensi", "pulmonologi", "gastroenterohepatologi", "endokrin-metabolik", "hematologi-onkologi", "reumatologi", "geriatri", "alergi-imunologi", "psikosomatik-paliatif"]
    }
  };

  let state = loadState();
  R.setCustomModulesGetter(() => state.customModules || []);

  let activeView = "home";
  let sidebarMobileOpen = false;
  let quizOriginView = "home";
  let sessionNewAchievements = [];

  let widgetHubState = {
    divisionFilter: "all",
    searchQuery: "",
    activeWidgetType: null
  };

  // Quiz Runtime
  let currentQuiz = {
    mode: "module", // 'module' | 'mixed' | 'weakness' | 'ai-custom'
    title: "",
    moduleId: null,
    questions: [],
    currentIndex: 0,
    selectedOption: null,
    isSubmitted: false,
    correctCount: 0,
    highlightEnabled: false,
    startTime: null,
    questionStartTime: null,
    elapsedSeconds: 0,
    timerInterval: null,
    timerHidden: false,
    sessionResults: [],
    userAnswers: {}, // questionIdx -> { selectedOption, isSubmitted, isCorrect, spentSec, pointsEarned }
    currentStreak: 0,
    maxStreak: 0,
    totalPoints: 0,
    lastPointsEarned: 0
  };

  // Carousel Review Modal State (7 Komponen Klinis)

  // Try Out CBT Simulation State
  let tryoutSession = {
    isActive: false,
    packageSize: 25, // 25 | 50
    totalSeconds: 2250, // 25 * 90s = 2250s (37m 30s) or 50 * 90s = 4500s (75m)
    remainingSeconds: 2250,
    timerInterval: null,
    questions: [],
    userAnswers: {}, // index -> optionIndex (0..4)
    doubtFlags: {}, // index -> boolean
    currentIndex: 0,
    isFinished: false,
    timeSpentSeconds: 0,
    score: 0,
    percentage: 0,
    passed: false,
    categoryStats: {},
    reviewFilter: "all" // 'all' | 'wrong' | 'doubt' | 'correct'
  };

  let activeCarousel = {
    isOpen: false,
    moduleId: null,
    moduleTitle: "",
    tierLabel: "",
    kkiNo: "",
    slides: [],
    currentSlideIndex: 0
  };

  // Rujukan Khusus Modal State

  let battleState = {
    role: null, // 'host' | 'client' | null
    status: "idle", // 'idle' | 'lobby' | 'countdown' | 'question' | 'round-summary' | 'podium'
    pin: "",
    peer: null,
    connections: [], // Host: array of DataConnection to clients
    hostConn: null,  // Client: DataConnection to host
    players: {},     // peerId -> { id, name, avatar, score, lastAnswer: null, isCorrect: false, timeSpent: 0, streak: 0 }
    questions: [],   // Synchronized questions deck
    currentIndex: 0,
    timeLimit: 20,   // seconds per question
    timerRemaining: 20,
    timerInterval: null,
    selectedOption: null,
    hasAnswered: false,
    distribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundFinished: false,
    settings: {
      divisionId: "all", // 'tropik-infeksi' | 'kardiologi' | 'all'
      questionCount: 5,
      timeLimit: 20
    }
  };

  // =========================================================================

  // =========================================================================

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      const parsed = JSON.parse(raw);
      const loaded = {
        ...defaultState,
        ...parsed,
        srs: parsed.srs && typeof parsed.srs === "object" ? parsed.srs : {},
        topicsRead: parsed.topicsRead && typeof parsed.topicsRead === "object" ? parsed.topicsRead : {},
        quizStats: parsed.quizStats || { ...defaultState.quizStats },
        userProfile: parsed.userProfile || { ...defaultState.userProfile },
        dashboardStatusFilter: parsed.dashboardStatusFilter || "all",
        quizSourceFilter: parsed.quizSourceFilter || "all",
        quizCategoryFilter: parsed.quizCategoryFilter || "all",
        tryoutDivisionFilter: parsed.tryoutDivisionFilter || "all",
        tocDivisionFilter: parsed.tocDivisionFilter || "all",
        tocStatusFilter: parsed.tocStatusFilter || "all",
        divisionAccordions: {
          "tropik-infeksi": true,
          "kardiologi": true,
          "ginjal-hipertensi": true,
          "pulmonologi": true,
          "gastroenterohepatologi": true,
          "endokrin-metabolik": true,
          "hematologi-onkologi": true,
          "reumatologi": true,
          "geriatri": true,
          "alergi-imunologi": true,
          "psikosomatik-paliatif": true,
          ...(parsed.divisionAccordions || {})
        },
        lastOpenedModuleId: parsed.lastOpenedModuleId || null,
        materiClusterFilter: parsed.materiClusterFilter || "all",
        soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
        unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
        snackQuizConfig: {
          ...defaultState.snackQuizConfig,
          ...(parsed.snackQuizConfig || {})
        },
        cbtConfig: {
          ...defaultState.cbtConfig,
          ...(parsed.cbtConfig || {})
        }
      };
      const today = getLocalDateKey(0);
      if (loaded.lastDailyDate !== today) {
        loaded.dailyXP = 0;
        loaded.lastDailyDate = today;
      }
      return loaded;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Storage save failed:", e);
    }
  }

  function checkDailyReset() {
    const today = getLocalDateKey(0);
    let changed = false;
    if (state.lastDailyDate !== today) {
      state.dailyXP = 0;
      state.lastDailyDate = today;
      changed = true;
    }
    return changed;
  }

  function markTopicRead(moduleId) {
    if (!moduleId) return;
    if (!state.topicsRead) state.topicsRead = {};
    if (!state.topicsRead[moduleId]) {
      state.topicsRead[moduleId] = { readCount: 0, lastRead: null, completed: false };
    }
    state.topicsRead[moduleId].readCount++;
    state.topicsRead[moduleId].lastRead = Date.now();
    state.topicsRead[moduleId].completed = true;
    updateStreak();
    saveState();
  }

  function updateStreak() {
    const today = getLocalDateKey(0);
    if (state.lastStudyDate === today) return;
    const yesterday = getLocalDateKey(-1);
    if (state.lastStudyDate === yesterday) {
      state.streakDays = (state.streakDays || 0) + 1;
    } else {
      state.streakDays = 1;
    }
    state.lastStudyDate = today;
  }

  function prepareShuffledQuizQuestion(rawQ) {
    if (!rawQ || !rawQ.options) return rawQ;
    const originalOptions = rawQ.options;
    const origCorrectIdx = rawQ.correctIndex !== undefined ? rawQ.correctIndex : 0;
    const origDistractors = rawQ.rationale?.distractorAnalysis || {};

    // Create indexed option pairs
    const pairs = originalOptions.map((text, idx) => ({
      text,
      origIdx: idx,
      isCorrect: idx === origCorrectIdx,
      distractorText: origDistractors[String(idx)] || origDistractors[idx] || ""
    }));

    // Shuffle options
    const shuffledPairs = shuffleArray(pairs);
    const newOptions = shuffledPairs.map((p) => p.text);
    const newCorrectIdx = shuffledPairs.findIndex((p) => p.isCorrect);

    // Reconstruct distractorAnalysis with new indices
    const newDistractors = {};
    shuffledPairs.forEach((p, newIdx) => {
      if (!p.isCorrect && p.distractorText) {
        newDistractors[String(newIdx)] = p.distractorText;
      }
    });

    return {
      ...rawQ,
      options: newOptions,
      correctIndex: newCorrectIdx,
      rationale: {
        ...(rawQ.rationale || {}),
        distractorAnalysis: newDistractors
      }
    };
  }

  function getAllQuestions() {
    return [...(window.INTERNA_DATA.questions || []), ...(state.customQuestions || [])];
  }

  function isBoardQuestion(q) {
    return !!(q && (q.sourceType === "board" || q.boardSource || (q.id && q.id.includes("-board-"))));
  }

  function getQuestionSourceType(q) {
    return isBoardQuestion(q) ? "board" : "papdi_drill";
  }

  function filterQuestionsByPreferences(questions, divId = state.selectedDivisionId, sourceFilter = state.quizSourceFilter, catFilter = state.quizCategoryFilter) {
    return (questions || []).filter((q) => {
      if (divId && divId !== "all" && (q.divisionId || "tropik-infeksi") !== divId) return false;
      if (sourceFilter && sourceFilter !== "all" && getQuestionSourceType(q) !== sourceFilter) return false;
      if (catFilter && catFilter !== "all" && normalizeQuestionCategory(q.category) !== catFilter) return false;
      return true;
    });
  }


  function applyFontSize() {
    const valid = ["normal", "large", "xlarge"];
    const pref = valid.includes(state.fontSizePreference) ? state.fontSizePreference : "normal";
    document.documentElement.setAttribute("data-font-size", pref);
    document.querySelectorAll(".font-size-btn").forEach((btn) => {
      const active = btn.getAttribute("data-fs") === pref;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setFontSizePreference(pref) {
    if (!["normal", "large", "xlarge"].includes(pref)) return;
    state.fontSizePreference = pref;
    saveState();
    applyFontSize();
  }

  function runClickTransition(updateFn, dir = "fade", getFallbackEl = null) {
    updateFn();
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const target = typeof getFallbackEl === "function" ? getFallbackEl() : document.getElementById("app-main")?.firstElementChild;
    if (target) {
      const cls = dir === "next" ? "vt-enter-next" : dir === "prev" ? "vt-enter-prev" : "vt-enter-fade";
      target.classList.remove("vt-enter-next", "vt-enter-prev", "vt-enter-fade", "apple-view-enter");
      void target.offsetWidth;
      target.classList.add(cls);
    }
  }

  function renderFontSizeStepperHtml() {
    const pref = state.fontSizePreference || "normal";
    const items = [
      { id: "normal", label: "A", title: "Ukuran Teks Normal (100%)", cls: "text-xs" },
      { id: "large", label: "A+", title: "Ukuran Teks Besar (115%)", cls: "text-[13px]" },
      { id: "xlarge", label: "A++", title: "Ukuran Teks Ekstra Besar (130%)", cls: "text-sm" }
    ];
    return `
      <div class="font-size-stepper" role="group" aria-label="Pengaturan Ukuran Teks Bacaan">
        ${items
          .map(
            (it) => `
            <button
              type="button"
              data-fs="${it.id}"
              onclick="window.InternaApp.setFontSizePreference('${it.id}')"
              class="font-size-btn ${it.cls} ${pref === it.id ? "active" : ""}"
              title="${it.title}"
              aria-pressed="${pref === it.id ? "true" : "false"}"
            >${it.label}</button>
          `
          )
          .join("")}
      </div>
    `;
  }

  function renderExtendedRationaleHtml(q) {
    const r = q?.rationale || {};
    const redFlags = r.redFlags || r.red_flags || "";
    const pathophys = r.pathophysiology || r.patofisiologi_singkat || "";
    let html = "";
    if (redFlags) {
      html += `
        <div class="exam-pitfall-box mt-2.5 mb-0">
          <div class="flex items-center gap-1.5 font-bold text-[var(--accent-coral)] mb-0.5">
            ${svgIcon("alert", "w-4 h-4")}
            <span>Red Flags Klinis</span>
          </div>
          <p class="m-0">${escapeHtml(redFlags)}</p>
        </div>
      `;
    }
    if (pathophys) {
      html += `
        <div class="mt-2.5 p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]" style="font-size: calc(0.92rem * var(--reading-scale)); line-height: 1.65;">
          <div class="flex items-center gap-1.5 font-bold text-[var(--text-primary)] mb-0.5">
            ${svgIcon("dna", "w-4 h-4 text-[var(--accent-primary)]")}
            <span>Patofisiologi Singkat</span>
          </div>
          <p class="m-0">${escapeHtml(pathophys)}</p>
        </div>
      `;
    }
    return html;
  }

  function applyTheme() {
    const html = document.documentElement;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    let isDark = false;

    if (state.themePreference === "dark") {
      isDark = true;
    } else if (state.themePreference === "light") {
      isDark = false;
    } else {
      isDark = prefersDark;
    }

    if (isDark) {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    }

    updateThemeToggleUI(isDark);
    applyFontSize();
  }

  function toggleThemeQuick() {
    const isDark = document.documentElement.classList.contains("dark");
    state.themePreference = isDark ? "light" : "dark";
    saveState();
    applyTheme();
  }

  function setThemePreference(pref) {
    state.themePreference = pref;
    saveState();
    applyTheme();
    if (activeView === "profile") {
      renderApp();
    }
  }

  function updateThemeToggleUI(isDark) {
    const btns = Array.from(document.querySelectorAll("#theme-toggle-btn, .js-theme-toggle-btn"));
    btns.forEach((btn) => {
      btn.setAttribute("aria-label", isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap");
      btn.innerHTML = isDark
        ? svgIcon("sun", "w-4 h-4 text-[var(--accent-secondary)]")
        : svgIcon("moon", "w-4 h-4 text-[var(--text-secondary)]");
    });
  }

  if (window.matchMedia) {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq) {
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", () => {
            if (state.themePreference === "system") applyTheme();
          });
        } else if (typeof mq.addListener === "function") {
          mq.addListener(() => {
            if (state.themePreference === "system") applyTheme();
          });
        }
      }
    } catch (e) {
      // Ignore media query listener error on unsupported browsers
    }
  }

  // =========================================================================

  // 2. SRS & ANALYTICS
  // =========================================================================
  function getQuestionSRS(qId) {
    return (
      state.srs[qId] || {
        box: 0,
        attempts: 0,
        correct: 0,
        wrong: 0,
        inMistakeVault: false,
        flaggedDoubt: false,
        lastSeen: 0,
        nextReview: 0,
        totalTimeSec: 0
      }
    );
  }

  function recordQuestionResult(qId, isCorrect, timeSec) {
    const prev = getQuestionSRS(qId);
    const now = Date.now();
    let newBox = prev.box;
    let inMistakeVault = prev.inMistakeVault;

    const intervals = {
      1: 10 * 60 * 1000,
      2: 24 * 3600 * 1000,
      3: 3 * 24 * 3600 * 1000,
      4: 7 * 24 * 3600 * 1000
    };

    if (isCorrect) {
      newBox = Math.min(4, (prev.box || 1) + 1);
      if (newBox >= 3 && !prev.flaggedDoubt) inMistakeVault = false;
    } else {
      newBox = 1;
      inMistakeVault = true;
    }

    state.srs[qId] = {
      box: newBox,
      attempts: prev.attempts + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      inMistakeVault,
      flaggedDoubt: Boolean(prev.flaggedDoubt),
      lastSeen: now,
      nextReview: now + (intervals[newBox] || intervals[1]),
      totalTimeSec: (prev.totalTimeSec || 0) + timeSec
    };
    saveState();
  }

  function toggleDoubtFlag(qId) {
    const srs = getQuestionSRS(qId);
    srs.flaggedDoubt = !srs.flaggedDoubt;
    if (srs.flaggedDoubt) {
      srs.inMistakeVault = true;
      srs.box = 1;
      srs.nextReview = Date.now();
    }
    state.srs[qId] = srs;
    saveState();
    renderQuizFeedbackFlagButton(qId);
  }

  function getMistakeVaultQuestions() {
    const allQ = getAllQuestions();
    return allQ.filter((q) => {
      const s = state.srs[q.id];
      return s && (s.inMistakeVault || s.flaggedDoubt);
    });
  }

  function computeAnalytics() {
    const allQ = getAllQuestions();
    const modules = getAllModules();

    const moduleStats = modules.map((m) => {
      const mQuestions = allQ.filter(
        (q) => q.moduleId === m.id && (!q.divisionId || !m.divisionId || q.divisionId === m.divisionId)
      );
      let attempts = 0;
      let correct = 0;
      let mastered = 0;
      let mistakes = 0;
      let boardQuestionsCount = 0;
      let papdiQuestionsCount = 0;

      mQuestions.forEach((q) => {
        if (isBoardQuestion(q)) {
          boardQuestionsCount++;
        } else {
          papdiQuestionsCount++;
        }
        const s = state.srs[q.id];
        if (s && s.attempts > 0) {
          attempts += s.attempts;
          correct += s.correct;
          if (s.box >= 3 && !s.inMistakeVault) mastered++;
          if (s.inMistakeVault || s.flaggedDoubt) mistakes++;
        }
      });

      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
      const isRead = !!(state.topicsRead && state.topicsRead[m.id]?.completed);
      return {
        ...m,
        totalQuestions: mQuestions.length,
        boardQuestionsCount,
        papdiQuestionsCount,
        attempts,
        correct,
        accuracy,
        mastered,
        mistakes,
        isRead
      };
    });

    const mistakesList = getMistakeVaultQuestions();
    const repeatQuestions = [...mistakesList].sort((a, b) => {
      const sa = state.srs[a.id] || { box: 1, wrong: 1, correct: 0 };
      const sb = state.srs[b.id] || { box: 1, wrong: 1, correct: 0 };
      if ((sa.box || 1) !== (sb.box || 1)) return (sa.box || 1) - (sb.box || 1);
      return ((sb.wrong || 0) - (sb.correct || 0)) - ((sa.wrong || 0) - (sa.correct || 0));
    });

    const activeDiv = state.selectedDivisionId || "tropik-infeksi";
    const divModules = activeDiv === "all"
      ? moduleStats
      : moduleStats.filter((m) => (m.divisionId || "tropik-infeksi") === activeDiv);
    const scopeModules = divModules.length > 0 ? divModules : moduleStats;

    // Prioritaskan bahan bacaan berdasarkan kelemahan (kesalahan terbanyak / akurasi rendah) lalu materi belum dibaca
    const rankedReadCandidates = [...moduleStats]
      .map((m) => {
        let score = 0;
        let reason = "";
        if (m.mistakes > 0) {
          score += m.mistakes * 100 + (m.isRead ? 0 : 25);
          reason = `${m.mistakes} soal perlu penguatan`;
        } else if (m.accuracy !== null && m.accuracy < 75) {
          score += (80 - m.accuracy) + (m.isRead ? 0 : 20);
          reason = `Akurasi masih ${m.accuracy}%`;
        } else if (!m.isRead && (activeDiv === "all" || (m.divisionId || "tropik-infeksi") === activeDiv)) {
          score += 15 + (m.boardQuestionsCount > 0 ? 5 : 0);
          reason = "Materi belum dibaca";
        }
        return { ...m, _weakScore: score, reason };
      })
      .filter((m) => m._weakScore > 0)
      .sort((a, b) => b._weakScore - a._weakScore);

    const recommendedReadings = rankedReadCandidates.length > 0
      ? rankedReadCandidates.slice(0, 2)
      : scopeModules.slice(0, 2).map((m) => ({ ...m, reason: "Review berkala" }));

    const weakest = rankedReadCandidates[0] || scopeModules[0] || moduleStats[0];
    const nowTs = Date.now();
    const dueSRSCount = allQ.reduce((cnt, q) => {
      const s = state.srs[q.id];
      return s && s.attempts > 0 && s.nextReview && s.nextReview <= nowTs ? cnt + 1 : cnt;
    }, 0);

    return {
      moduleStats,
      mistakesCount: mistakesList.length,
      dueSRSCount,
      repeatQuestions,
      recommendedReadings,
      weakestModule: weakest
    };
  }

  function evaluateAndSaveAchievements(sessionMeta) {
    if (!window.InternaGamification || typeof window.InternaGamification.evaluateAchievements !== "function") {
      return [];
    }
    const qDivMap = {};
    getAllQuestions().forEach((item) => {
      if (item && item.id) qDivMap[item.id] = item.divisionId;
    });
    const divisionStats = {};
    Object.entries(state.srs || {}).forEach(([qId, s]) => {
      if (!s || !s.attempts) return;
      const divId = qDivMap[qId];
      if (!divId) return;
      if (!divisionStats[divId]) divisionStats[divId] = { attempted: 0, correct: 0 };
      divisionStats[divId].attempted += s.attempts;
      divisionStats[divId].correct += (s.correct || 0);
    });
    const achResult = window.InternaGamification.evaluateAchievements(
      {
        unlockedAchievements: state.unlockedAchievements || [],
        streakCount: state.streakDays || 0,
        xp: state.totalXP || 0,
        quizHistory: Object.values(state.srs || {}).filter((s) => s && s.attempts > 0),
        divisionStats
      },
      sessionMeta || {}
    );
    state.unlockedAchievements = achResult.unlockedIds;
    return achResult.newlyUnlocked || [];
  }

  // =========================================================================

  function openMaterialCarousel(moduleId, initialSlideIdx = 0) {
    cancelAllVizAnimations();
    if (widgetHubState.activeWidgetType) {
      widgetHubState.activeWidgetType = null;
      const stageEl = document.getElementById("widget-active-stage");
      if (stageEl) stageEl.innerHTML = "";
    }
    const allMods = getAllModules();
    const mod = allMods.find((m) => m.id === moduleId);
    if (!mod) return;

    markTopicRead(mod.id);
    state.lastOpenedModuleId = mod.id;
    saveState();
    const display = getModuleDisplayTitles(mod);
    const slides = buildSlidesFromSnackableSummary(mod);
    const safeIdx = Math.min(Math.max(0, Number(initialSlideIdx) || 0), Math.max(0, slides.length - 1));

    activeCarousel = {
      isOpen: true,
      moduleId: mod.id,
      moduleTitle: display.title,
      moduleSubtitle: display.subtitle,
      tierLabel: mod.competencyLevel || mod.kkiLevel || (mod.tier ? `Tier ${mod.tier}` : "Tingkat 4"),
      slides,
      currentSlideIndex: safeIdx
    };

    renderCarouselModal();
  }

  function openMaterialCarouselAtSlide(moduleId, slideIdx) {
    openMaterialCarousel(moduleId, slideIdx);
  }

  function closeMaterialCarousel() {
    cancelAllVizAnimations();
    activeCarousel.isOpen = false;
    const modal = document.getElementById("carousel-modal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
    document.body.style.overflow = "";
  }

  function nextCarouselSlide() {
    if (activeCarousel.currentSlideIndex + 1 < activeCarousel.slides.length) {
      cancelAllVizAnimations();
      runClickTransition(() => {
        activeCarousel.currentSlideIndex++;
        renderCarouselModal();
      }, "next", () => document.getElementById("carousel-modal-card"));
    }
  }

  function prevCarouselSlide() {
    if (activeCarousel.currentSlideIndex > 0) {
      cancelAllVizAnimations();
      runClickTransition(() => {
        activeCarousel.currentSlideIndex--;
        renderCarouselModal();
      }, "prev", () => document.getElementById("carousel-modal-card"));
    }
  }

  function setCarouselSlide(idx) {
    if (idx >= 0 && idx < activeCarousel.slides.length && idx !== activeCarousel.currentSlideIndex) {
      const dir = idx > activeCarousel.currentSlideIndex ? "next" : "prev";
      cancelAllVizAnimations();
      runClickTransition(() => {
        activeCarousel.currentSlideIndex = idx;
        renderCarouselModal();
      }, dir, () => document.getElementById("carousel-modal-card"));
    }
  }

  function renderCarouselModal() {
    const modal = document.getElementById("carousel-modal");
    if (!modal) return;

    if (!activeCarousel.isOpen) {
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      document.documentElement.classList.remove("overflow-hidden");
      document.body.style.overflow = "";
      return;
    }

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    const total = Math.max(1, activeCarousel.slides.length);
    const currentIdx = Math.min(activeCarousel.currentSlideIndex, total - 1);
    const currentSlide = activeCarousel.slides[currentIdx] || {
      title: "Materi Belum Tersedia",
      content: "Materi sedang disiapkan."
    };
    const slideHeading = currentSlide.title || currentSlide.slideTitle || `Bagian ${currentIdx + 1}`;

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col w-screen overflow-hidden animate-fade-in" style="height: 100vh; height: 100dvh;">
        
        <!-- Top Sticky App Bar (Dynamic Stepper + Compact Title + Font Control + Close) -->
        <header class="w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-3 sm:px-8 pt-3 pb-3 shrink-0 z-20 space-y-2.5">
          <!-- Dynamic Progress Stepper Bar (matches exact slide count 3–7) -->
          <div class="grid gap-1.5 sm:gap-2 max-w-5xl mx-auto w-full" style="grid-template-columns: repeat(${total}, minmax(0, 1fr));">
            ${activeCarousel.slides.map((s, i) => {
              const sLabel = s.title || s.slideTitle || `Slide ${i + 1}`;
              return `
                <button
                  type="button"
                  onclick="window.InternaApp.setCarouselSlide(${i})"
                  class="h-1.5 sm:h-2 rounded-full cursor-pointer transition-all duration-150 ${
                    i === currentIdx
                      ? 'bg-[var(--accent-primary)]'
                      : i < currentIdx
                      ? 'bg-[var(--accent-primary)] opacity-45'
                      : 'bg-[var(--border-subtle)] hover:bg-[var(--border-strong)]'
                  }"
                  title="${escapeHtml(sLabel)}"
                  aria-label="Slide ${i + 1}: ${escapeHtml(sLabel)}"
                ></button>
              `;
            }).join("")}
          </div>

          <!-- Top Row: Badge, Compact 2-Level Title, Font Adjuster & Close -->
          <div class="max-w-5xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">
            <div class="flex items-center gap-2 sm:gap-3 min-w-0">
              <span class="badge-kki badge-kki-4 font-mono text-[11px] shrink-0">
                ${escapeHtml(activeCarousel.tierLabel)}
              </span>
              <div class="min-w-0">
                <h2 class="font-bold text-sm sm:text-lg text-[var(--text-primary)] tracking-tight truncate">
                  ${escapeHtml(activeCarousel.moduleTitle)}
                </h2>
                <div class="flex items-center gap-2 text-xs text-[var(--text-muted)] truncate">
                  <span class="font-mono font-semibold text-[var(--accent-primary)] shrink-0">Slide ${currentIdx + 1}/${total}</span>
                  ${activeCarousel.moduleSubtitle ? `<span aria-hidden="true">&bull;</span><span class="truncate">${escapeHtml(activeCarousel.moduleSubtitle)}</span>` : ""}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
              ${renderFontSizeStepperHtml()}
              <button
                type="button"
                onclick="window.InternaApp.closeMaterialCarousel()"
                class="h-9 px-2.5 sm:px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] font-semibold text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center gap-1.5 touch-target transition"
                title="Tutup Layar Penuh (Esc)"
              >
                ${svgIcon("close", "w-4 h-4")}
                <span class="hidden sm:inline">Tutup</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Fullscreen Reading Canvas -->
        <main class="flex-1 w-full overflow-y-auto overscroll-contain px-3 sm:px-8 pt-4 sm:pt-8 select-text bg-[var(--bg-canvas)]" style="padding-bottom: calc(2.5rem + env(safe-area-inset-bottom));">
          <div id="carousel-modal-card" class="max-w-3xl mx-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-8 space-y-5 sm:space-y-6">
            <!-- Slide Title Banner -->
            <div class="pb-3.5 border-b border-[var(--border-subtle)] flex items-baseline justify-between gap-4">
              <h1 class="font-bold text-lg sm:text-2xl text-[var(--text-primary)] tracking-tight leading-snug min-w-0">
                ${escapeHtml(slideHeading)}
              </h1>
              <span class="font-mono text-[11px] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                Navigasi: &larr; / &rarr;
              </span>
            </div>

            <!-- Content Area with Dynamic --reading-scale Typography -->
            <div id="carousel-slide-content" class="study-prose">
              ${currentSlide.studyHtml || `<p class="whitespace-pre-line">${escapeHtml(currentSlide.content)}</p>`}

              ${renderInteractiveWidget(currentSlide.widgetType)}
            </div>

            <!-- Carousel-Attached Navigation Bar (never obscured by browser bottom bar) -->
            <div id="carousel-card-nav" class="pt-4 mt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onclick="window.InternaApp.prevCarouselSlide()"
                class="btn-duo btn-duo-outline text-xs sm:text-sm py-2 px-3.5 sm:px-4 flex items-center gap-1.5 touch-target ${currentIdx === 0 ? 'opacity-35 pointer-events-none' : ''}"
              >
                ${svgIcon("arrowLeft", "w-4 h-4")}
                <span>Sebelumnya</span>
              </button>

              <div class="text-xs font-mono font-semibold text-[var(--text-muted)]">
                ${currentIdx + 1} / ${total}
              </div>

              <div>
                ${
                  currentIdx === total - 1
                    ? `
                      <button
                        type="button"
                        onclick="window.InternaApp.closeMaterialCarousel(); window.InternaApp.startQuizSession('module', '${activeCarousel.moduleId}');"
                        class="btn-duo btn-duo-primary text-xs sm:text-sm py-2 px-4 sm:px-5 font-bold flex items-center gap-1.5"
                      >
                        ${svgIcon("zap", "w-4 h-4")}
                        <span>Selesai &amp; Latih Soal</span>
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        onclick="window.InternaApp.nextCarouselSlide()"
                        class="btn-duo btn-duo-primary text-xs sm:text-sm py-2 px-4 sm:px-5 font-bold flex items-center gap-1.5"
                      >
                        <span>Berikutnya</span>
                        ${svgIcon("arrowRight", "w-4 h-4")}
                      </button>
                    `
                }
              </div>
            </div>
          </div>
        </main>

      </div>
    `;
  }

  function isAppOnline() {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  function isOfflineCacheReady() {
    return Boolean(window.__INTERNA_OFFLINE_STATUS__ && window.__INTERNA_OFFLINE_STATUS__.ready);
  }

  // =========================================================================

  // KAHOOT-STYLE BATTLE ENGINE CONTROLLER & PEER-TO-PEER SYNC
  // =========================================================================
  function initBattlePeer(customId) {
    if (battleState.peer) {
      try { battleState.peer.destroy(); } catch (e) {}
      battleState.peer = null;
    }

    if (typeof Peer === "undefined") {
      console.warn("PeerJS library not loaded. Falling back to local offline mode.");
      return null;
    }

    const peer = customId ? new Peer(customId) : new Peer();
    peer.on("error", (err) => {
      console.warn("PeerJS notice:", err.type, err.message);
      if (err.type === "unavailable-id") {
        showToast("PIN sudah terpakai. Mencoba membuat PIN baru...", "error");
        setTimeout(createBattleRoom, 1000);
      } else if (err.type === "peer-unavailable") {
        showToast("Room dengan PIN tersebut tidak ditemukan atau host sudah keluar.", "error");
      }
    });
    return peer;
  }

  let peerJsLoadPromise = null;
  function ensurePeerJsLoaded() {
    if (typeof Peer !== "undefined") return Promise.resolve(true);
    if (!isAppOnline()) return Promise.reject(new Error("offline"));
    if (peerJsLoadPromise) return peerJsLoadPromise;
    peerJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
      script.async = true;
      const timer = setTimeout(() => {
        peerJsLoadPromise = null;
        reject(new Error("timeout"));
      }, 10000);
      script.onload = () => {
        clearTimeout(timer);
        if (typeof Peer !== "undefined") resolve(true);
        else {
          peerJsLoadPromise = null;
          reject(new Error("Peer undefined"));
        }
      };
      script.onerror = () => {
        clearTimeout(timer);
        peerJsLoadPromise = null;
        reject(new Error("load failed"));
      };
      document.head.appendChild(script);
    });
    return peerJsLoadPromise;
  }

  function generateBattlePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function createBattleRoom() {
    if (!isAppOnline()) {
      showToast("Mode Battle membutuhkan koneksi internet. Materi, widget & soal tetap bisa dipakai offline.", "error");
      return;
    }
    if (typeof Peer === "undefined") {
      showToast("Memuat modul jaringan Mode Battle...", "info");
      ensurePeerJsLoaded().then(() => createBattleRoom()).catch(() => {
        showToast("Gagal memuat modul Battle (periksa koneksi internet).", "error");
      });
      return;
    }
    const pin = generateBattlePin();
    const peerId = "interna-room-" + pin;
    const peer = initBattlePeer(peerId);

    battleState.role = "host";
    battleState.status = "lobby";
    battleState.pin = pin;
    battleState.peer = peer;
    battleState.connections = [];
    battleState.players = {};

    // Register host as Player 1
    const hostProfile = state.userProfile || { name: "dr. Host", avatarEmoji: "🩺" };
    battleState.players["host"] = {
      id: "host",
      name: (hostProfile.name || "dr. Host") + " (Host)",
      avatar: hostProfile.avatarEmoji || "🩺",
      score: 0,
      streak: 0,
      lastAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };

    if (peer) {
      peer.on("open", (id) => {
        console.log("Battle Room created on peer ID:", id);
      });

      peer.on("connection", (conn) => {
        conn.on("open", () => {
          battleState.connections.push(conn);
          conn.on("data", (data) => handleHostIncomingData(conn, data));
          conn.on("close", () => {
            delete battleState.players[conn.peer];
            battleState.connections = battleState.connections.filter(c => c.peer !== conn.peer);
            if (battleState.status === "question") {
              const playersVals = Object.values(battleState.players);
              if (playersVals.length > 0 && playersVals.every(pl => pl.lastAnswer !== null)) {
                finishQuestionRound();
                return;
              }
            }
            broadcastBattleState();
            renderApp();
          });
        });
      });
    }

    activeView = "battle";
    renderApp();
  }

  function handleHostIncomingData(conn, data) {
    if (!data || typeof data !== "object") return;
    if (data.type === "JOIN") {
      battleState.players[conn.peer] = {
        id: conn.peer,
        name: String(data.name || "Dokter Tamu").slice(0, 48),
        avatar: String(data.avatar || "stethoscope").slice(0, 32),
        score: 0,
        streak: 0,
        lastAnswer: null,
        isCorrect: false,
        timeSpent: 0
      };
      // Send welcome packet with current room settings
      conn.send({
        type: "WELCOME",
        status: battleState.status,
        pin: battleState.pin,
        players: battleState.players,
        settings: battleState.settings,
        totalQuestions: battleState.questions.length
      });
      broadcastBattleState();
      renderApp();
    } else if (data.type === "SUBMIT_ANSWER") {
      const p = battleState.players[conn.peer];
      if (p && battleState.status === "question" && p.lastAnswer === null) {
        const currentQ = battleState.questions[battleState.currentIndex];
        if (!currentQ) return;
        const maxOpt = (currentQ.options?.length || 5) - 1;
        const selIdx = Math.round(clampNum(data.selectedOption, 0, maxOpt, 0));
        const limit = Math.max(1, Number(battleState.timeLimit) || 30);
        const safeSpent = clampNum(data.timeSpent, 0, limit, limit);
        p.lastAnswer = selIdx;
        p.timeSpent = safeSpent;

        const targetCorrect = currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correctAnswer;
        const isCorrect = selIdx === targetCorrect;
        p.isCorrect = isCorrect;

        if (isCorrect) {
          p.streak = (p.streak || 0) + 1;
          const timeRatio = clampNum((limit - safeSpent) / limit, 0, 1, 0);
          const pts = Math.round(500 + timeRatio * 500);
          p.score = (Number(p.score) || 0) + pts;
        } else {
          p.streak = 0;
        }

        // Check if all players answered
        const allAnswered = Object.values(battleState.players).every(pl => pl.lastAnswer !== null);
        if (allAnswered) {
          finishQuestionRound();
        } else {
          broadcastBattleState();
          renderApp();
        }
      }
    }
  }

  function broadcastBattleState() {
    const payload = {
      type: "SYNC_STATE",
      status: battleState.status,
      pin: battleState.pin,
      players: battleState.players,
      currentIndex: battleState.currentIndex,
      totalQuestions: battleState.questions.length,
      timeLimit: battleState.timeLimit,
      timerRemaining: battleState.timerRemaining,
      distribution: battleState.distribution,
      currentQuestion: battleState.questions[battleState.currentIndex]
        ? {
            id: battleState.questions[battleState.currentIndex].id,
            vignette: battleState.questions[battleState.currentIndex].vignette,
            leadIn: battleState.questions[battleState.currentIndex].leadIn || battleState.questions[battleState.currentIndex].question,
            options: battleState.questions[battleState.currentIndex].options,
            correctIndex: battleState.status === "round-summary" || battleState.status === "podium"
              ? (battleState.questions[battleState.currentIndex].correctIndex !== undefined ? battleState.questions[battleState.currentIndex].correctIndex : battleState.questions[battleState.currentIndex].correctAnswer)
              : null,
            rationale: battleState.status === "round-summary" || battleState.status === "podium"
              ? battleState.questions[battleState.currentIndex].rationale
              : null
          }
        : null
    };

    battleState.connections.forEach(conn => {
      if (conn && conn.open) {
        conn.send(payload);
      }
    });
  }

  function joinBattleRoom(inputPin) {
    const pin = (inputPin || "").replace(/\D+/g, "").slice(0, 6);
    if (pin.length !== 6) {
      showToast("Masukkan 6 digit PIN permainan.", "error");
      return;
    }
    if (!isAppOnline()) {
      showToast("Mode Battle membutuhkan koneksi internet. Materi, widget & soal tetap bisa dipakai offline.", "error");
      return;
    }
    if (typeof Peer === "undefined") {
      showToast("Memuat modul jaringan Mode Battle...", "info");
      ensurePeerJsLoaded().then(() => joinBattleRoom(pin)).catch(() => {
        showToast("Gagal memuat modul Battle (periksa koneksi internet).", "error");
      });
      return;
    }

    const hostPeerId = "interna-room-" + pin;
    const myPeer = initBattlePeer();

    battleState.role = "client";
    battleState.status = "lobby";
    battleState.pin = pin;
    battleState.peer = myPeer;
    battleState.selectedOption = null;
    battleState.hasAnswered = false;

    showToast("Menghubungkan ke Room #" + pin + "...", "info");

    myPeer.on("open", (myId) => {
      const conn = myPeer.connect(hostPeerId, { reliable: true });
      battleState.hostConn = conn;

      conn.on("open", () => {
        const myProf = state.userProfile || { name: "Dokter Residen", avatarEmoji: "🩺" };
        conn.send({
          type: "JOIN",
          name: myProf.name || "Dokter Residen",
          avatar: myProf.avatarEmoji || "🩺"
        });
        showToast("Berhasil terhubung ke lobi arena!", "success");
      });

      conn.on("data", (data) => {
        handleClientIncomingData(data);
      });

      conn.on("close", () => {
        showToast("Koneksi ke host terputus.", "error");
        battleState.status = "idle";
        activeView = "battle";
        renderApp();
      });

      conn.on("error", (err) => {
        console.error("Client conn error:", err);
        showToast("Tidak dapat menemukan room dengan PIN tersebut.", "error");
      });
    });

    activeView = "battle";
    renderApp();
  }

  function handleClientIncomingData(data) {
    if (!data || typeof data !== "object") return;
    if (data.type === "WELCOME" || data.type === "SYNC_STATE") {
      const prevStatus = battleState.status;
      const prevIndex = battleState.currentIndex;

      battleState.status = data.status;
      battleState.players = data.players || battleState.players;
      battleState.currentIndex = data.currentIndex !== undefined ? data.currentIndex : battleState.currentIndex;
      battleState.timeLimit = data.timeLimit || battleState.timeLimit;
      battleState.timerRemaining = data.timerRemaining !== undefined ? data.timerRemaining : battleState.timerRemaining;
      battleState.distribution = data.distribution || battleState.distribution;
      if (data.totalQuestions) battleState.totalQuestions = data.totalQuestions;

      if (data.currentQuestion) {
        battleState.currentQuestionData = data.currentQuestion;
      }

      if (data.status === "question" && (prevStatus !== "question" || battleState.currentIndex !== prevIndex)) {
        battleState.selectedOption = null;
        battleState.hasAnswered = false;
      }

      renderApp();
    }
  }

  function startBattleGame() {
    if (battleState.role !== "host") return;

    // Pick random questions according to settings
    const allQuestions = getAllQuestions();
    let pool = allQuestions;
    if (battleState.settings.divisionId !== "all") {
      pool = allQuestions.filter(q => q.divisionId === battleState.settings.divisionId);
    }
    if (pool.length < battleState.settings.questionCount) pool = allQuestions;

    const shuffled = shuffleArray(pool);
    battleState.questions = shuffled
      .slice(0, battleState.settings.questionCount)
      .map((q) => prepareShuffledQuizQuestion(q));
    battleState.currentIndex = 0;
    battleState.timeLimit = battleState.settings.timeLimit || 20;

    // Reset scores
    Object.values(battleState.players).forEach(p => {
      p.score = 0;
      p.streak = 0;
      p.lastAnswer = null;
      p.isCorrect = false;
      p.timeSpent = 0;
    });

    startQuestionRound();
  }

  function startQuestionRound() {
    battleState.status = "question";
    battleState.timerRemaining = battleState.timeLimit;
    battleState.selectedOption = null;
    battleState.hasAnswered = false;
    battleState.roundFinished = false;
    battleState.distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    // Reset players answers for this round
    Object.values(battleState.players).forEach(p => {
      p.lastAnswer = null;
      p.isCorrect = false;
      p.timeSpent = 0;
    });

    clearInterval(battleState.timerInterval);
    battleState.timerInterval = setInterval(() => {
      battleState.timerRemaining--;
      if (battleState.role === "host") {
        broadcastBattleState();
      }
      renderBattleTimer();

      if (battleState.timerRemaining <= 0) {
        clearInterval(battleState.timerInterval);
        finishQuestionRound();
      }
    }, 1000);

    if (battleState.role === "host") {
      broadcastBattleState();
    }
    renderApp();
  }

  function renderBattleTimer() {
    const fillEl = document.getElementById("battle-timer-fill");
    const textEl = document.getElementById("battle-timer-text");
    if (fillEl) {
      const pct = Math.max(0, (battleState.timerRemaining / battleState.timeLimit) * 100);
      fillEl.style.width = pct + "%";
      if (battleState.timerRemaining <= 5) fillEl.classList.add("critical");
      else fillEl.classList.remove("critical");
    }
    if (textEl) {
      textEl.textContent = battleState.timerRemaining + "s";
    }
  }

  function submitBattleAnswer(optIdx) {
    if (battleState.hasAnswered || battleState.status !== "question") return;

    battleState.hasAnswered = true;
    battleState.selectedOption = optIdx;
    const timeSpent = battleState.timeLimit - battleState.timerRemaining;

    if (battleState.role === "host") {
      const p = battleState.players["host"];
      if (p) {
        p.lastAnswer = optIdx;
        p.timeSpent = timeSpent;
        const currentQ = battleState.questions[battleState.currentIndex];
        const targetCorrect = currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correctAnswer;
        const isCorrect = optIdx === targetCorrect;
        p.isCorrect = isCorrect;
        if (isCorrect) {
          p.streak = (p.streak || 0) + 1;
          const timeRatio = Math.max(0, (battleState.timeLimit - timeSpent) / battleState.timeLimit);
          p.score += Math.round(500 + timeRatio * 500);
        } else {
          p.streak = 0;
        }

        const allAnswered = Object.values(battleState.players).every(pl => pl.lastAnswer !== null);
        if (allAnswered) finishQuestionRound();
        else {
          broadcastBattleState();
          renderApp();
        }
      }
    } else if (battleState.role === "client" && battleState.hostConn) {
      battleState.hostConn.send({
        type: "SUBMIT_ANSWER",
        selectedOption: optIdx,
        timeSpent: timeSpent
      });
      renderApp();
    }
  }

  function finishQuestionRound() {
    if (battleState.roundFinished) return;
    battleState.roundFinished = true;
    clearInterval(battleState.timerInterval);
    battleState.status = "round-summary";

    // Compute distribution
    const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.values(battleState.players).forEach(p => {
      if (p.lastAnswer !== null && dist[p.lastAnswer] !== undefined) {
        dist[p.lastAnswer]++;
      }
    });
    battleState.distribution = dist;

    if (battleState.role === "host") {
      broadcastBattleState();
    }
    renderApp();
  }

  function nextBattleRound() {
    if (battleState.role !== "host") return;

    if (battleState.currentIndex + 1 < battleState.questions.length) {
      battleState.currentIndex++;
      startQuestionRound();
    } else {
      // Game Over -> Podium
      battleState.status = "podium";
      broadcastBattleState();
      renderApp();
    }
  }

  function exitBattle() {
    clearInterval(battleState.timerInterval);
    if (battleState.peer) {
      try { battleState.peer.destroy(); } catch (e) {}
    }
    battleState.role = null;
    battleState.status = "idle";
    battleState.connections = [];
    battleState.hostConn = null;
    activeView = "dashboard";
    renderApp();
  }

  function renderBattleView() {
    if (battleState.status === "idle") {
      return renderBattleEntryView();
    } else if (battleState.status === "lobby") {
      return renderBattleLobbyView();
    } else if (battleState.status === "question") {
      return renderBattleQuestionView();
    } else if (battleState.status === "round-summary") {
      return renderBattleRoundSummaryView();
    } else if (battleState.status === "podium") {
      return renderBattlePodiumView();
    }
    return renderBattleEntryView();
  }

  function renderBattleEntryView() {
    const prof = state.userProfile || { name: "dr. Residen", avatarEmoji: "🩺" };
    const offlineNotice = !isAppOnline()
      ? `
        <div class="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-[var(--text-primary)] flex items-start gap-3">
          <span class="text-lg leading-none">📡</span>
          <div class="space-y-1">
            <div class="font-bold">Anda sedang dalam Mode Offline</div>
            <p class="text-[var(--text-secondary)] leading-relaxed">
              Clinical Battle Arena (duel P2P real-time) membutuhkan koneksi internet untuk menghubungkan pemain. Semua <strong>Materi Klinis, Kalkulator Widget, Snack Quiz, dan Try Out CBT</strong> tetap berfungsi 100% tanpa internet.
            </p>
          </div>
        </div>
      `
      : "";
    return `
      <div class="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pop">
        ${offlineNotice}
        <!-- Hero Header -->
        <div class="med-card p-6 sm:p-8 space-y-3 border border-[var(--border-subtle)] text-center">
          <div class="w-16 h-16 rounded-2xl bg-[var(--accent-primary-soft)] border-2 border-[var(--accent-primary)] mx-auto flex items-center justify-center text-3xl shadow-sm">
            ⚔️
          </div>
          <span class="badge-specialty uppercase tracking-wider text-[10px] font-mono">
            Peer-to-Peer Live Duel (Kahoot Style)
          </span>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-[var(--text-primary)]">
            Clinical Battle Arena
          </h1>
          <p class="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
            Adu cepat dan tepat menjawab kasus klinis internal medicine real-time bersama teman residen / dokter muda menggunakan kode PIN room.
          </p>

          <!-- Current User Profile Badge -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs">
            ${renderProfileAvatarSvg(prof.avatarEmoji, "w-5 h-5")}
            <span class="font-bold text-[var(--text-primary)]">${escapeHtml(prof.name || "dr. Residen")}</span>
            <button onclick="window.InternaApp.openProfileModal()" class="text-[var(--accent-primary)] hover:underline ml-1 font-semibold text-[11px]">(Ganti)</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Card 1: Buat Room (Host) -->
          <div class="battle-card p-6 space-y-4 flex flex-col justify-between hover:border-[var(--accent-primary)]">
            <div class="space-y-2">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
                👑
              </div>
              <h2 class="font-serif font-bold text-lg text-[var(--text-primary)]">Buat Room Duel (Host)</h2>
              <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                Buat room baru, dapatkan 6 digit PIN, dan undang teman-teman masuk ke lobi Anda.
              </p>
            </div>
            <button onclick="window.InternaApp.createBattleRoom()" class="btn-duo btn-duo-primary w-full text-xs py-2.5">
              <span>Buat Room Baru</span>
            </button>
          </div>

          <!-- Card 2: Gabung Room (Join) -->
          <div class="battle-card p-6 space-y-4 flex flex-col justify-between hover:border-[var(--accent-primary)]">
            <div class="space-y-2">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg">
                🚀
              </div>
              <h2 class="font-serif font-bold text-lg text-[var(--text-primary)]">Gabung dengan PIN</h2>
              <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                Punya PIN dari room teman? Masukkan 6 digit PIN di bawah untuk langsung duel.
              </p>
            </div>
            <div class="space-y-2">
              <input
                type="text"
                id="battle-join-pin-input"
                placeholder="Contoh: 742918"
                maxlength="6"
                class="w-full text-center font-mono font-extrabold text-base tracking-widest px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                onclick="window.InternaApp.joinBattleRoom(document.getElementById('battle-join-pin-input').value)"
                class="btn-duo btn-duo-outline w-full text-xs py-2.5 font-bold"
              >
                <span>Masuk Room</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderBattleLobbyView() {
    const isHost = battleState.role === "host";
    const playersList = Object.values(battleState.players);

    return `
      <div class="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pop">
        <!-- Lobby Header & PIN -->
        <div class="med-card p-6 sm:p-8 space-y-4 border border-[var(--border-subtle)] text-center">
          <span class="badge-specialty uppercase tracking-wider text-[10px] font-mono">
            ${isHost ? "Lobi Room (Host)" : "Lobi Room (Peserta)"}
          </span>
          <div>
            <div class="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1">Game PIN:</div>
            <div class="battle-lobby-pin">${escapeHtml(battleState.pin)}</div>
            <p class="text-xs text-[var(--text-secondary)] mt-1">
              Bagikan PIN ini ke teman Anda agar bisa masuk dari gadget mereka masing-masing!
            </p>
          </div>

          ${
            isHost
              ? `
                <!-- Host Game Settings -->
                <div class="pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                  <div>
                    <label class="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Divisi:</label>
                    <select
                      onchange="window.InternaApp.updateBattleSettings('divisionId', this.value)"
                      class="w-full text-xs font-semibold p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)]"
                    >
                      <option value="all" ${battleState.settings.divisionId === 'all' ? 'selected' : ''}>Semua Divisi</option>
                      <option value="tropik-infeksi" ${battleState.settings.divisionId === 'tropik-infeksi' ? 'selected' : ''}>Tropik Infeksi</option>
                      <option value="kardiologi" ${battleState.settings.divisionId === 'kardiologi' ? 'selected' : ''}>Kardiologi</option>
                      <option value="ginjal-hipertensi" ${battleState.settings.divisionId === 'ginjal-hipertensi' ? 'selected' : ''}>Ginjal & Hipertensi</option>
                      <option value="pulmonologi" ${battleState.settings.divisionId === 'pulmonologi' ? 'selected' : ''}>Pulmo & MK</option>
                      <option value="gastroenterohepatologi" ${battleState.settings.divisionId === 'gastroenterohepatologi' ? 'selected' : ''}>GEH</option>
                      <option value="endokrin-metabolik" ${battleState.settings.divisionId === 'endokrin-metabolik' ? 'selected' : ''}>Endokrin</option>
                      <option value="hematologi-onkologi" ${battleState.settings.divisionId === 'hematologi-onkologi' ? 'selected' : ''}>HOM</option>
                      <option value="reumatologi" ${battleState.settings.divisionId === 'reumatologi' ? 'selected' : ''}>Reumatologi</option>
                      <option value="geriatri" ${battleState.settings.divisionId === 'geriatri' ? 'selected' : ''}>Geriatri</option>
                      <option value="alergi-imunologi" ${battleState.settings.divisionId === 'alergi-imunologi' ? 'selected' : ''}>Alergi Imunologi</option>
                      <option value="psikosomatik-paliatif" ${battleState.settings.divisionId === 'psikosomatik-paliatif' ? 'selected' : ''}>Psikosomatik & Paliatif</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Jumlah Soal:</label>
                    <select
                      onchange="window.InternaApp.updateBattleSettings('questionCount', parseInt(this.value))"
                      class="w-full text-xs font-semibold p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)]"
                    >
                      <option value="5" ${battleState.settings.questionCount === 5 ? 'selected' : ''}>5 Soal</option>
                      <option value="10" ${battleState.settings.questionCount === 10 ? 'selected' : ''}>10 Soal</option>
                    </select>
                  </div>
                  <div class="col-span-2 sm:col-span-1">
                    <label class="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Waktu / Soal:</label>
                    <select
                      onchange="window.InternaApp.updateBattleSettings('timeLimit', parseInt(this.value))"
                      class="w-full text-xs font-semibold p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)]"
                    >
                      <option value="15" ${battleState.settings.timeLimit === 15 ? 'selected' : ''}>15 Detik</option>
                      <option value="20" ${battleState.settings.timeLimit === 20 ? 'selected' : ''}>20 Detik</option>
                      <option value="30" ${battleState.settings.timeLimit === 30 ? 'selected' : ''}>30 Detik</option>
                    </select>
                  </div>
                </div>
              `
              : `
                <div class="pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] animate-pulse">
                  Menunggu host memulai permainan...
                </div>
              `
          }
        </div>

        <!-- Players List Grid -->
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>Pemain di Lobi (${playersList.length}):</span>
            <span class="font-mono text-[var(--text-muted)]">Real-time Connected</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${playersList.map(p => `
              <div class="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center gap-2.5 shadow-sm">
                ${renderProfileAvatarSvg(p.avatar, "w-8 h-8")}
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-[var(--text-primary)] truncate">${escapeHtml(p.name)}</div>
                  <div class="text-[10px] font-mono text-[var(--text-muted)]">${p.id === 'host' ? 'Host Room' : 'Pemain'}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-2">
          ${
            isHost
              ? `
                <button
                  onclick="window.InternaApp.startBattleGame()"
                  class="btn-duo btn-duo-primary flex-1 text-xs py-3 font-extrabold shadow-md"
                >
                  <span>Mulai Pertarungan Sekarang (${playersList.length} Pemain)</span>
                </button>
              `
              : ""
          }
          <button
            onclick="window.InternaApp.exitBattle()"
            class="btn-duo btn-duo-outline text-xs py-3 px-4"
          >
            <span>Keluar Room</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderBattleQuestionView() {
    const q = battleState.role === "host"
      ? battleState.questions[battleState.currentIndex]
      : battleState.currentQuestionData;

    if (!q) {
      return `<div class="p-8 text-center text-xs text-[var(--text-muted)]">Memuat data soal...</div>`;
    }

    const totalQ = battleState.role === "host"
      ? battleState.questions.length
      : (battleState.totalQuestions || battleState.settings?.questionCount || 5);
    const shapes = [
      { label: "A", shape: "▲", class: "battle-opt-a" },
      { label: "B", shape: "◆", class: "battle-opt-b" },
      { label: "C", shape: "●", class: "battle-opt-c" },
      { label: "D", shape: "■", class: "battle-opt-d" },
      { label: "E", shape: "★", class: "battle-opt-e" }
    ];

    const isHost = battleState.role === "host";
    const answeredCount = Object.values(battleState.players).filter(p => p.lastAnswer !== null).length;
    const totalPlayers = Object.keys(battleState.players).length;

    return `
      <div class="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-pop">
        <!-- Top Bar: Progress & Timer -->
        <div class="flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded font-mono font-bold bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]">
              Soal ${battleState.currentIndex + 1} / ${totalQ}
            </span>
            <span class="font-mono text-[var(--text-muted)]">PIN: ${escapeHtml(battleState.pin)}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono text-xs text-[var(--text-secondary)]">${answeredCount} / ${totalPlayers} Menjawab</span>
            <span id="battle-timer-text" class="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              ${battleState.timerRemaining}s
            </span>
          </div>
        </div>

        <!-- Timer Bar -->
        <div class="battle-timer-bar">
          <div id="battle-timer-fill" class="battle-timer-fill" style="width: ${(battleState.timerRemaining / battleState.timeLimit) * 100}%"></div>
        </div>

        <!-- Vignette & Lead-In (Pertanyaan Klinis) Card -->
        <div class="med-card p-5 sm:p-6 border border-[var(--border-subtle)] space-y-3.5 shadow-sm">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span class="badge-specialty uppercase tracking-wider text-[10px] font-mono">
              Vignette Kasus Klinis
            </span>
            ${q.boardSource ? `<span class="text-[11px] font-mono font-semibold text-[var(--text-muted)]">${escapeHtml(q.boardSource)}</span>` : ''}
          </div>

          <!-- Narasi Kasus (Vignette) -->
          <div class="font-sans text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            ${escapeHtml(q.vignette)}
          </div>

          <!-- Kalimat Pertanyaan Inti (Lead-In) -->
          ${
            q.leadIn || q.question
              ? `
                <div class="pt-2.5 border-t border-[var(--border-subtle)]">
                  <div class="font-serif font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug flex items-start gap-2">
                    <span class="text-[var(--accent-primary)] font-bold">❓</span>
                    <span>${escapeHtml(q.leadIn || q.question)}</span>
                  </div>
                </div>
              `
              : ""
          }
        </div>

        <!-- 4 Options Grid (Kahoot Tactile Style) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          ${q.options.map((opt, idx) => {
            const sh = shapes[idx] || { label: String.fromCharCode(65 + idx), shape: "●", class: "battle-opt-a" };
            const isSelected = battleState.selectedOption === idx;
            return `
              <button
                onclick="window.InternaApp.submitBattleAnswer(${idx})"
                ${battleState.hasAnswered ? 'disabled' : ''}
                class="battle-opt-btn ${sh.class} ${isSelected ? 'ring-4 ring-white shadow-2xl scale-[1.02]' : ''} ${battleState.hasAnswered && !isSelected ? 'opacity-40 filter grayscale' : ''}"
              >
                <div class="battle-shape">${sh.shape}</div>
                <div class="text-left font-sans flex-1 text-sm sm:text-base font-bold text-white tracking-wide">${escapeHtml(opt)}</div>
                ${isSelected ? '<span class="text-white text-base font-extrabold mr-1">✓</span>' : ''}
              </button>
            `;
          }).join("")}
        </div>

        ${
          battleState.hasAnswered
            ? `
              <div class="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-center text-xs font-mono text-[var(--accent-primary)] animate-pulse">
                ✓ Jawaban tersimpan! Menunggu pemain lain atau timer habis...
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderBattleRoundSummaryView() {
    const q = battleState.role === "host"
      ? battleState.questions[battleState.currentIndex]
      : battleState.currentQuestionData;

    const isHost = battleState.role === "host";
    const correctIdx = q ? (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer !== undefined ? q.correctAnswer : 0)) : 0;
    const sortedPlayers = Object.values(battleState.players).sort((a, b) => b.score - a.score);

    return `
      <div class="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-pop">
        <!-- Header -->
        <div class="med-card p-5 border border-[var(--border-subtle)] space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span class="text-xs font-mono font-bold text-[var(--accent-primary)] uppercase">
              Hasil Ronde Soal #${battleState.currentIndex + 1}
            </span>
            <span class="text-xs font-mono text-[var(--text-muted)]">Kunci: Opsi ${String.fromCharCode(65 + correctIdx)}</span>
          </div>

          <!-- Answer & Rationale -->
          <div class="space-y-1.5">
            <div class="text-xs sm:text-sm font-serif font-bold text-[var(--text-primary)]">
              Jawaban Benar: <span class="text-[var(--accent-primary)]">${escapeHtml(q?.options?.[correctIdx] || "")}</span>
            </div>
            ${
              q?.rationale?.clinicalPearl
                ? `
                  <div class="p-3 rounded-lg bg-[var(--accent-primary-soft)] border-l-4 border-[var(--accent-primary)] text-xs text-[var(--text-secondary)]">
                    <strong>Clinical Pearl:</strong> ${escapeHtml(q.rationale.clinicalPearl)}
                  </div>
                `
                : ""
            }
          </div>
        </div>

        <!-- Live Scoreboard -->
        <div class="med-card p-5 border border-[var(--border-subtle)] space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>Klasemen Sementara:</span>
            <span class="text-[11px] font-mono text-[var(--text-muted)]">Skor Kecepatan (pts)</span>
          </div>

          <div class="space-y-2">
            ${sortedPlayers.map((p, idx) => `
              <div class="p-2.5 rounded-xl border ${idx === 0 ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'} flex items-center justify-between gap-3 transition">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="font-mono font-extrabold text-xs w-5 text-center ${idx === 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}">#${idx + 1}</span>
                  ${renderProfileAvatarSvg(p.avatar, "w-7 h-7")}
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-[var(--text-primary)] truncate">${escapeHtml(p.name)}</div>
                    ${p.streak >= 2 ? `<span class="text-[10px] font-mono text-amber-600 font-bold">🔥 Streak ${p.streak}</span>` : ""}
                  </div>
                </div>
                <div class="font-mono font-extrabold text-sm text-[var(--text-primary)] shrink-0">
                  ${p.score.toLocaleString("id-ID")} pts
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Next / Action Button -->
        <div class="pt-2 flex items-center justify-between gap-3">
          ${
            isHost
              ? `
                <button
                  onclick="window.InternaApp.nextBattleRound()"
                  class="btn-duo btn-duo-primary flex-1 text-xs py-2.5 font-bold shadow-sm"
                >
                  <span>${battleState.currentIndex + 1 < battleState.questions.length ? "Lanjut Soal Berikutnya →" : "Lihat Podium Akhir 🏆"}</span>
                </button>
              `
              : `
                <div class="flex-1 text-center text-xs text-[var(--text-muted)] animate-pulse font-mono">
                  Menunggu host melanjutkan ronde...
                </div>
              `
          }
          <button
            onclick="window.InternaApp.exitBattle()"
            class="btn-duo btn-duo-outline text-xs py-2.5 px-4"
          >
            <span>Keluar</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderBattlePodiumView() {
    const sortedPlayers = Object.values(battleState.players).sort((a, b) => b.score - a.score);
    const p1 = sortedPlayers[0];
    const p2 = sortedPlayers[1];
    const p3 = sortedPlayers[2];

    return `
      <div class="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pop">
        <div class="med-card p-6 sm:p-8 space-y-4 border border-[var(--border-subtle)] text-center">
          <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500 text-amber-600 mx-auto flex items-center justify-center text-3xl shadow-sm">
            🏆
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-[var(--text-primary)]">
            Podium Juara Battle Klinis
          </h1>
          <p class="text-xs text-[var(--text-secondary)]">
            Selamat kepada pemenang duel! Poin akumulasi telah dikonversikan ke dalam rekor belajar Anda.
          </p>

          <!-- 3-Pillar Podium Graphic -->
          <div class="flex items-end justify-center gap-3 pt-6 pb-2">
            <!-- 2nd Place -->
            ${
              p2
                ? `
                  <div class="flex flex-col items-center flex-1 max-w-[120px] animate-podium" style="animation-delay: 0.1s">
                    <span class="mb-1">${renderProfileAvatarSvg(p2.avatar || "heart", "w-9 h-9")}</span>
                    <span class="text-xs font-bold text-[var(--text-primary)] truncate max-w-full">${escapeHtml(p2.name)}</span>
                    <span class="text-[10px] font-mono text-[var(--text-muted)]">${Number(p2.score) || 0} pts</span>
                    <div class="w-full h-24 rounded-t-xl bg-slate-200 dark:bg-slate-700/60 flex items-center justify-center font-mono font-extrabold text-lg text-slate-500 mt-2">
                      2
                    </div>
                  </div>
                `
                : ""
            }

            <!-- 1st Place -->
            ${
              p1
                ? `
                  <div class="flex flex-col items-center flex-1 max-w-[140px] animate-podium" style="animation-delay: 0.2s">
                    <span class="mb-1">${renderProfileAvatarSvg(p1.avatar || "stethoscope", "w-11 h-11")}</span>
                    <span class="text-xs font-bold text-[var(--text-primary)] truncate max-w-full">${escapeHtml(p1.name)}</span>
                    <span class="text-[11px] font-mono font-bold text-[var(--accent-primary)]">${Number(p1.score) || 0} pts</span>
                    <div class="w-full h-32 rounded-t-xl bg-amber-400 dark:bg-amber-500 flex items-center justify-center font-mono font-extrabold text-2xl text-amber-950 mt-2 shadow-lg">
                      👑 1
                    </div>
                  </div>
                `
                : ""
            }

            <!-- 3rd Place -->
            ${
              p3
                ? `
                  <div class="flex flex-col items-center flex-1 max-w-[120px] animate-podium" style="animation-delay: 0.3s">
                    <span class="mb-1">${renderProfileAvatarSvg(p3.avatar || "lungs", "w-9 h-9")}</span>
                    <span class="text-xs font-bold text-[var(--text-primary)] truncate max-w-full">${escapeHtml(p3.name)}</span>
                    <span class="text-[10px] font-mono text-[var(--text-muted)]">${Number(p3.score) || 0} pts</span>
                    <div class="w-full h-16 rounded-t-xl bg-amber-700/20 dark:bg-amber-900/40 flex items-center justify-center font-mono font-extrabold text-lg text-amber-800 dark:text-amber-400 mt-2">
                      3
                    </div>
                  </div>
                `
                : ""
            }
          </div>
        </div>

        <button
          onclick="window.InternaApp.exitBattle()"
          class="btn-duo btn-duo-primary w-full text-xs py-3 font-bold"
        >
          <span>Kembali ke Beranda Modul</span>
        </button>
      </div>
    `;
  }

  function updateBattleSettings(key, val) {
    if (battleState.settings) {
      battleState.settings[key] = val;
      renderApp();
    }
  }


  function renderWidgetStageInnerHtml(item) {
    if (!item) return "";
    return `
      <section class="med-card p-4 sm:p-6 border border-[var(--accent-primary-border)] space-y-4 animate-pop">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
              <span class="px-2 py-0.5 rounded-md font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]">
                ${escapeHtml(item.divisionName)}
              </span>
              <span class="px-2 py-0.5 rounded-md font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                ${escapeHtml(item.kind)}
              </span>
            </div>
            <h2 class="font-bold text-base sm:text-lg text-[var(--text-primary)] tracking-tight leading-snug">
              ${escapeHtml(item.title)}
            </h2>
            <p class="text-xs text-[var(--text-muted)] truncate">
              Modul: ${escapeHtml(item.moduleTitle)} &bull; ${escapeHtml(item.clusterTitle)}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onclick="window.InternaApp.openMaterialCarouselAtSlide('${item.moduleId}', ${item.slideIndex || 0})"
              class="btn-duo btn-duo-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              ${svgIcon("book", "w-3.5 h-3.5")}
              <span>Baca Materi</span>
            </button>
            <button
              type="button"
              onclick="window.InternaApp.closeActiveWidgetStage()"
              class="btn-duo btn-duo-outline text-xs py-1.5 px-3 flex items-center gap-1"
              aria-label="Tutup Simulator"
            >
              ${svgIcon("close", "w-3.5 h-3.5")}
              <span>Tutup</span>
            </button>
          </div>
        </div>
        <div class="study-prose" style="max-width: 48rem;">
          ${renderInteractiveWidget(item.widgetType)}
        </div>
      </section>
    `;
  }

  function renderWidgetCatalogInnerHtml(allWidgets) {
    const divFilter = widgetHubState.divisionFilter || "all";
    const q = (widgetHubState.searchQuery || "").trim().toLowerCase();
    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => (d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi")
        && (divFilter === "all" || d.id === divFilter)
    );

    let totalShown = 0;
    const sectionsHtml = activeDivisions
      .map((div) => {
        const divItems = allWidgets.filter((item) => {
          if (item.divisionId !== div.id) return false;
          if (!q) return true;
          return (
            item.title.toLowerCase().includes(q) ||
            item.moduleTitle.toLowerCase().includes(q) ||
            item.clusterTitle.toLowerCase().includes(q) ||
            item.kind.toLowerCase().includes(q)
          );
        });
        if (divItems.length === 0) return "";
        totalShown += divItems.length;

        const tiersMap = new Map();
        divItems.forEach((item) => {
          const t = Number(item.tier || 0);
          if (!tiersMap.has(t)) tiersMap.set(t, []);
          tiersMap.get(t).push(item);
        });
        const sortedTiers = Array.from(tiersMap.keys()).sort((a, b) => a - b);

        return `
          <section class="space-y-4" data-widget-division="${div.id}">
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="px-2 py-1 rounded-lg text-[11px] font-mono font-extrabold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)] shrink-0">
                  ${escapeHtml(getDivisionInitials(div.id))}
                </span>
                <h2 class="font-extrabold text-base sm:text-lg text-[var(--text-primary)] tracking-tight truncate">
                  ${escapeHtml(div.name)}
                </h2>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                ${divItems.length} Widget
              </span>
            </div>

            <div class="space-y-4">
              ${sortedTiers
                .map((tierNum) => {
                  const clusterItems = tiersMap.get(tierNum) || [];
                  const clusterLabel = (SUBCLUSTER_TITLES[div.id] && SUBCLUSTER_TITLES[div.id][tierNum]) || "Umum";
                  return `
                    <div class="space-y-2">
                      <div class="text-xs font-bold text-[var(--text-secondary)]">${escapeHtml(clusterLabel)}</div>
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${clusterItems
                          .map((item) => {
                            const isActive = widgetHubState.activeWidgetType === item.widgetType;
                            return `
                              <button
                                type="button"
                                data-widget-type="${escapeHtml(item.widgetType)}"
                                onclick="window.InternaApp.selectWidgetFromHub('${item.widgetType}')"
                                class="pathway-node p-3.5 text-left flex flex-col justify-between gap-2.5 cursor-pointer transition ${
                                  isActive
                                    ? "!border-[var(--accent-primary)] bg-[var(--tint-teal-bg)]"
                                    : ""
                                }"
                              >
                                <div class="space-y-1.5 min-w-0">
                                  <div class="flex items-center justify-between gap-2 text-[10px] font-mono">
                                    <span class="px-1.5 py-0.5 rounded font-bold ${
                                      item.kind === "Kalkulator"
                                        ? "bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)]"
                                        : item.kind.startsWith("Atlas")
                                        ? "bg-[var(--viz-purple-soft)] text-[var(--viz-purple)] border border-[var(--border-subtle)]"
                                        : "bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]"
                                    }">
                                      ${escapeHtml(item.kind)}
                                    </span>
                                    <span class="font-bold ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}">
                                      ${isActive ? "Aktif" : "Buka →"}
                                    </span>
                                  </div>
                                  <div class="font-bold text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                                    ${escapeHtml(item.title)}
                                  </div>
                                </div>
                                <div class="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] truncate w-full">
                                  ${escapeHtml(item.moduleTitle)}
                                </div>
                              </button>
                            `;
                          })
                          .join("")}
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </section>
        `;
      })
      .join("");

    if (totalShown === 0) {
      return `
        <div class="med-card p-8 text-center text-xs text-[var(--text-muted)]">
          Tidak ada widget yang cocok dengan pencarian Anda.
        </div>
      `;
    }
    return sectionsHtml;
  }

  function renderWidgetsView() {
    const allWidgets = getWidgetCatalog();
    const divFilter = widgetHubState.divisionFilter || "all";
    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );
    const activeItem = widgetHubState.activeWidgetType
      ? allWidgets.find((w) => w.widgetType === widgetHubState.activeWidgetType) || null
      : null;

    return `
      <div class="max-w-5xl mx-auto px-4 py-6 space-y-5 animate-pop">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">Pusat Widget &amp; Simulator Klinis</h1>
            <p class="text-xs sm:text-sm text-[var(--text-secondary)]">Seluruh simulator interaktif, atlas histologi, dan kalkulator klinis dikelompokkan berdasarkan divisi.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)] self-start sm:self-auto shrink-0">
            ${allWidgets.length} Widget Aktif
          </span>
        </div>

        <!-- Division Selector & Search Filter Bar -->
        <div class="med-card p-3.5 sm:p-4 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onclick="window.InternaApp.setWidgetDivisionFilter('all')"
              class="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                divFilter === "all"
                  ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]"
                  : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
              }"
            >
              Semua Divisi (${allWidgets.length})
            </button>
            ${activeDivisions
              .map((div) => {
                const cnt = allWidgets.filter((w) => w.divisionId === div.id).length;
                const active = divFilter === div.id;
                return `
                  <button
                    type="button"
                    onclick="window.InternaApp.setWidgetDivisionFilter('${div.id}')"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      active
                        ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]"
                        : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    }"
                  >
                    ${escapeHtml(div.shortName || getDivisionShortLabel(div.id))} (${cnt})
                  </button>
                `;
              })
              .join("")}
          </div>

          <div class="flex items-center gap-2">
            <input
              type="search"
              id="widget-search-input"
              value="${escapeHtml(widgetHubState.searchQuery || "")}"
              oninput="window.InternaApp.setWidgetSearchQuery(this.value)"
              placeholder="Cari widget, kalkulator, atau topik klinis..."
              class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            ${
              widgetHubState.searchQuery
                ? `<button type="button" onclick="window.InternaApp.setWidgetSearchQuery('')" class="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0">Reset</button>`
                : ""
            }
          </div>
        </div>

        <!-- Live Interactive Stage -->
        <div id="widget-active-stage">
          ${renderWidgetStageInnerHtml(activeItem)}
        </div>

        <!-- Division-Organized Widget Catalog -->
        <div id="widget-catalog-container" class="space-y-8">
          ${renderWidgetCatalogInnerHtml(allWidgets)}
        </div>
      </div>
    `;
  }

  function setWidgetDivisionFilter(divId) {
    cancelAllVizAnimations();
    widgetHubState.divisionFilter = divId || "all";
    renderApp();
  }

  function setWidgetSearchQuery(val) {
    widgetHubState.searchQuery = val || "";
    const container = document.getElementById("widget-catalog-container");
    if (container) {
      container.innerHTML = renderWidgetCatalogInnerHtml(getWidgetCatalog());
    } else {
      renderApp();
    }
  }

  function selectWidgetFromHub(widgetType) {
    cancelAllVizAnimations();
    widgetHubState.activeWidgetType = widgetType || null;
    const allWidgets = getWidgetCatalog();
    const activeItem = widgetHubState.activeWidgetType
      ? allWidgets.find((w) => w.widgetType === widgetHubState.activeWidgetType) || null
      : null;

    const stage = document.getElementById("widget-active-stage");
    const catalogEl = document.getElementById("widget-catalog-container");
    if (stage && catalogEl) {
      runClickTransition(() => {
        stage.innerHTML = renderWidgetStageInnerHtml(activeItem);
        catalogEl.innerHTML = renderWidgetCatalogInnerHtml(allWidgets);
      }, "fade", () => stage);
      if (activeItem && typeof stage.scrollIntoView === "function") {
        stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      renderApp();
    }
  }

  function closeActiveWidgetStage() {
    cancelAllVizAnimations();
    widgetHubState.activeWidgetType = null;
    const stage = document.getElementById("widget-active-stage");
    const catalogEl = document.getElementById("widget-catalog-container");
    if (stage && catalogEl) {
      stage.innerHTML = "";
      catalogEl.innerHTML = renderWidgetCatalogInnerHtml(getWidgetCatalog());
    } else {
      renderApp();
    }
  }

  // =========================================================================
  // 7A. HOME / DASHBOARD LANDING VIEW (OSMOSIS MOTIVATION HUB)
  // =========================================================================

  function renderHomeDashboardView() {
    const analytics = computeAnalytics();
    const lvlObj = window.InternaGamification
      ? window.InternaGamification.getLevelFromXP(state.totalXP || 0)
      : { level: 1, tier: 1, tierName: "Clinical Clerk", currentLevelXP: 0, requiredLevelXP: 1500, progressPct: 0 };
    const prof = state.userProfile || { name: "dr. Residen Interna" };
    const allModulesList = getAllModules();
    const totalTopicsCount = allModulesList.length;
    const completedTopicsCount = allModulesList.filter((m) => state.topicsRead && state.topicsRead[m.id]?.completed).length;
    const completionPct = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

    const allQ = getAllQuestions();
    let boardAtt = 0;
    let boardCor = 0;
    let drillAtt = 0;
    let drillCor = 0;
    let answeredDistinct = 0;
    allQ.forEach((q) => {
      const s = state.srs && state.srs[q.id];
      if (s && s.attempts > 0) {
        answeredDistinct++;
        if (isBoardQuestion(q)) {
          boardAtt += s.attempts;
          boardCor += s.correct;
        } else {
          drillAtt += s.attempts;
          drillCor += s.correct;
        }
      }
    });
    const totalAttempts = boardAtt + drillAtt;
    const totalCorrect = boardCor + drillCor;
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const boardAcc = boardAtt > 0 ? Math.round((boardCor / boardAtt) * 100) : null;
    const drillAcc = drillAtt > 0 ? Math.round((drillCor / drillAtt) * 100) : null;

    const dailyXP = Number(state.dailyXP || 0);
    const dailyGoal = Math.max(50, Number(state.dailyGoalXP || 100));
    const dailyPct = Math.min(100, Math.round((dailyXP / dailyGoal) * 100));
    const streakDays = state.streakDays || 1;
    const unlockedCount = Array.isArray(state.unlockedAchievements) ? state.unlockedAchievements.length : 0;
    const totalAchievements = window.InternaGamification?.CLINICAL_ACHIEVEMENTS?.length || 8;

    const lastMod = state.lastOpenedModuleId
      ? allModulesList.find((m) => m.id === state.lastOpenedModuleId)
      : null;
    const primaryRec = (analytics.recommendedReadings && analytics.recommendedReadings[0]) || analytics.weakestModule || allModulesList[0];
    const resumeTarget = lastMod || primaryRec;
    const resumeDisp = resumeTarget ? getModuleDisplayTitles(resumeTarget) : null;
    const resumeDivName = resumeTarget ? (getDivisionMeta(resumeTarget.divisionId)?.shortName || "Interna") : "";

    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );

    const recList = (analytics.recommendedReadings || []).slice(0, 3);

    return `
      <div class="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-pop">
        <!-- Hero Welcome, Streak Pulse & Resume Last Studied -->
        <section class="med-card p-5 sm:p-6 space-y-5">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]">
                  Level ${lvlObj.level} &bull; ${escapeHtml(lvlObj.tierName)}
                </span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)]">
                  <span class="streak-flame-glow inline-flex">${svgIcon("flame", "w-3.5 h-3.5")}</span>
                  <span>Streak ${streakDays} Hari</span>
                </span>
              </div>
              <h1 class="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">
                Selamat Datang, ${escapeHtml(prof.name || "dr. Residen")}
              </h1>
              <p class="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                Pantau penguasaan kurikulum penyakit dalam, latihan soal CBT Board, dan akurasi harian Anda dalam satu ringkasan terfokus.
              </p>
            </div>

            <!-- Primary Quick CTAs -->
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <button
                type="button"
                onclick="window.InternaApp.openGlobalSearch()"
                class="btn-duo btn-duo-outline text-xs sm:text-sm py-2.5 px-3.5 flex items-center gap-1.5"
                title="Cari Modul atau Widget (Cmd+K)"
              >
                ${svgIcon("search", "w-4 h-4 text-[var(--text-muted)]")}
                <span class="hidden sm:inline">Cari</span>
                <kbd class="kbd-shortcut text-[10px]">⌘K</kbd>
              </button>
              <button
                type="button"
                onclick="window.InternaApp.navigate('materi')"
                class="btn-duo btn-duo-outline text-xs sm:text-sm py-2.5 px-4 flex items-center gap-2"
              >
                ${svgIcon("book", "w-4 h-4 text-[var(--accent-primary)]")}
                <span>Buka Materi</span>
              </button>
              ${
                analytics.dueSRSCount > 0
                  ? `
                    <button
                      type="button"
                      onclick="window.InternaApp.startSRSReview()"
                      class="btn-duo btn-duo-outline text-xs sm:text-sm py-2.5 px-4 flex items-center gap-2 border-[var(--accent-secondary-border)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)]"
                    >
                      ${svgIcon("refresh", "w-4 h-4")}
                      <span>Review SRS (${analytics.dueSRSCount})</span>
                    </button>
                  `
                  : ""
              }
              <button
                type="button"
                onclick="window.InternaApp.navigate('tryout')"
                class="btn-duo btn-duo-primary text-xs sm:text-sm py-2.5 px-4 flex items-center gap-2"
              >
                ${svgIcon("play", "w-4 h-4")}
                <span>Latih Soal</span>
              </button>
            </div>
          </div>

          <!-- Daily Goal + Resume Row -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-4 border-t border-[var(--border-subtle)]">
            <!-- Compact Daily XP & Level Progress -->
            ${(() => {
              const hl = window.InternaGamification
                ? window.InternaGamification.getLevelFromXP(state.totalXP)
                : { level: 1, tier: 1, tierName: "Clinical Clerk", currentLevelXP: 0, requiredLevelXP: 1500, progressPct: 0 };
              return `
                <div class="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2.5">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                    <div class="flex flex-col justify-between gap-1.5">
                      <div class="flex items-center justify-between gap-2 min-h-[20px] text-xs">
                        <span class="font-bold text-[var(--text-primary)] inline-flex items-center gap-1.5 truncate">
                          ${svgIcon("zap", "w-3.5 h-3.5 text-[var(--accent-secondary)] shrink-0")}
                          <span>Target Harian</span>
                        </span>
                        <span class="font-mono font-bold text-[var(--accent-primary)] tabular-nums shrink-0">${dailyXP}/${dailyGoal} XP (${dailyPct}%)</span>
                      </div>
                      <div class="duo-progress-track">
                        <div class="duo-progress-fill" style="width:${Math.max(4, dailyPct)}%"></div>
                      </div>
                    </div>
                    <div class="flex flex-col justify-between gap-1.5">
                      <div class="flex items-center justify-between gap-2 min-h-[20px] text-xs">
                        <span class="font-bold text-[var(--text-primary)] truncate">Lv.${hl.level} <span class="text-[var(--text-muted)] font-normal">&bull; ${escapeHtml(hl.tierName)}</span></span>
                        <span class="font-mono font-bold text-[var(--accent-primary)] tabular-nums shrink-0">${hl.progressPct}%</span>
                      </div>
                      <div class="duo-progress-track">
                        <div class="duo-progress-fill" style="width:${Math.max(4, hl.progressPct)}%"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                    <span>Total XP: ${(state.totalXP || 0).toLocaleString("id-ID")}</span>
                    <span>Badge: ${unlockedCount}/${totalAchievements} Terbuka</span>
                  </div>
                </div>
              `;
            })()}

            <!-- Rekomendasi Fokus Hari Ini (Rekomendasi Cerdas) -->
            ${(() => {
              const divScores = activeDivisions.map((d) => {
                const dMods = analytics.moduleStats.filter((m) => (m.divisionId || "tropik-infeksi") === d.id);
                const att = dMods.reduce((s, m) => s + (m.attempts || 0), 0);
                const cor = dMods.reduce((s, m) => s + (m.correct || 0), 0);
                const acc = att > 0 ? Math.round((cor / att) * 100) : -1;
                return { div: d, att, acc };
              });
              divScores.sort((a, b) => {
                if (a.att === 0 && b.att > 0) return -1;
                if (b.att === 0 && a.att > 0) return 1;
                if (a.acc !== b.acc) return a.acc - b.acc;
                return a.att - b.att;
              });
              const focus = divScores[0] || { div: activeDivisions[0], att: 0, acc: -1 };
              if (!focus || !focus.div) return "";
              const focusReason = focus.att === 0
                ? "Belum pernah dilatih — mulai kuasai dasar divisi ini"
                : `Akurasi saat ini ${focus.acc}% (${focus.att} soal) — tingkatkan ke ≥80%`;
              return `
                <div class="p-3.5 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-primary-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    ${renderDivisionIconSvg(focus.div.id, "w-9 h-9")}
                    <div class="min-w-0">
                      <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">Rekomendasi Fokus Hari Ini</div>
                      <div class="font-bold text-sm text-[var(--text-primary)] truncate">${escapeHtml(focus.div.name)}</div>
                      <div class="text-[11px] text-[var(--text-secondary)] truncate">${focusReason}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onclick="window.InternaApp.startQuizSession('division', '${focus.div.id}')"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--accent-primary)] text-[var(--on-accent-primary)] hover:opacity-90 transition cursor-pointer"
                    >
                      Latih 10 Soal
                    </button>
                    <button
                      type="button"
                      onclick="window.InternaApp.selectDivision('${focus.div.id}')"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--accent-primary-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer"
                    >
                      Materi
                    </button>
                  </div>
                </div>
              `;
            })()}
          </div>
        </section>

        <!-- 4 Statistik Pemacu Belajar -->
        <section aria-label="Statistik Belajar" class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="med-card p-4 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Penguasaan Modul</span>
              ${svgIcon("book", "w-4 h-4 text-[var(--accent-primary)]")}
            </div>
            <div class="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">${completionPct}%</div>
            <div class="text-xs text-[var(--text-secondary)] font-mono">${completedTopicsCount} / ${totalTopicsCount} Topik Tuntas</div>
          </div>

          <div class="med-card p-4 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Akurasi Keseluruhan</span>
              ${svgIcon("target", "w-4 h-4 text-[var(--accent-secondary)]")}
            </div>
            <div class="text-2xl font-extrabold text-[var(--accent-secondary)] tabular-nums">${overallAccuracy}%</div>
            <div class="text-xs text-[var(--text-secondary)] font-mono">${answeredDistinct} dari ${allQ.length} Soal Tersentuh</div>
          </div>

          <div class="med-card p-4 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Board vs Drill</span>
              ${svgIcon("award", "w-4 h-4 text-[var(--accent-primary)]")}
            </div>
            <div class="flex items-baseline gap-2 font-mono">
              <span class="text-xl font-extrabold text-[var(--text-primary)] tabular-nums">${boardAcc !== null ? boardAcc + "%" : "—"}</span>
              <span class="text-xs text-[var(--text-muted)]">vs</span>
              <span class="text-xl font-extrabold text-[var(--text-secondary)] tabular-nums">${drillAcc !== null ? drillAcc + "%" : "—"}</span>
            </div>
            <div class="text-xs text-[var(--text-secondary)] font-mono">Akurasi Asli Board vs Drill</div>
          </div>

          <div class="med-card p-4 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Antrian Bank Salah</span>
              ${svgIcon("alert", "w-4 h-4 text-[var(--accent-coral)]")}
            </div>
            <div class="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">${analytics.mistakesCount}</div>
            <div class="text-xs">
              <button type="button" onclick="window.InternaApp.navigate('tryout')" class="text-[var(--accent-primary)] font-semibold hover:underline cursor-pointer">
                ${analytics.mistakesCount > 0 ? "Review di Tab Soal →" : "Semua Soal Terkendali"}
              </button>
            </div>
          </div>
        </section>

        <!-- Penguasaan Per Divisi -->
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-base sm:text-lg text-[var(--text-primary)]">Penguasaan Per Divisi</h2>
            <button type="button" onclick="window.InternaApp.navigate('materi')" class="text-xs font-bold text-[var(--accent-primary)] hover:underline cursor-pointer">
              Lihat Semua Modul →
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            ${activeDivisions
              .map((div) => {
                const divMods = analytics.moduleStats.filter((m) => (m.divisionId || "tropik-infeksi") === div.id);
                const divRead = divMods.filter((m) => m.isRead).length;
                const divTotal = divMods.length;
                const divPct = divTotal > 0 ? Math.round((divRead / divTotal) * 100) : 0;
                const divQTotal = divMods.reduce((s, m) => s + (m.totalQuestions || 0), 0);
                const divBoardTotal = divMods.reduce((s, m) => s + (m.boardQuestionsCount || 0), 0);
                const divAttempts = divMods.reduce((s, m) => s + (m.attempts || 0), 0);
                const divCorrect = divMods.reduce((s, m) => s + (m.correct || 0), 0);
                const divAcc = divAttempts > 0 ? Math.round((divCorrect / divAttempts) * 100) : null;

                return `
                  <div class="med-card p-4 flex flex-col justify-between gap-3.5">
                    <div class="space-y-2.5">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2.5 min-w-0">
                          ${renderDivisionIconSvg(div.id, "w-8 h-8 mt-0.5")}
                          <div class="min-w-0">
                            <div class="font-bold text-sm text-[var(--text-primary)]">${escapeHtml(div.name)}</div>
                            <div class="text-[11px] font-mono text-[var(--text-muted)]">${divTotal} Modul &bull; ${divQTotal} Soal (${divBoardTotal} Board)</div>
                          </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] tabular-nums shrink-0">${divPct}%</span>
                      </div>
                      <div class="w-full h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                        <div class="h-full rounded-full bg-[var(--accent-primary)] transition-all" style="width:${Math.max(divPct, 3)}%"></div>
                      </div>
                      <div class="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                        <span>Dibaca: ${divRead}/${divTotal}</span>
                        <span>Akurasi: ${divAcc !== null ? divAcc + "%" : "Belum ada"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onclick="window.InternaApp.selectDivision('${div.id}')"
                      class="btn-duo btn-duo-outline w-full text-xs py-1.5"
                    >
                      <span>Eksplorasi Materi</span>
                    </button>
                  </div>
                `;
              })
              .join("")}
          </div>
          ${(() => {
            const upcomingDivs = (window.INTERNA_DATA?.divisions || []).filter((d) => d.status !== "active");
            if (!upcomingDivs.length) return "";
            return `
              <details class="med-card p-4 border border-[var(--border-subtle)] group">
                <summary class="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-[var(--text-primary)]">Divisi Mendatang (Segera Hadir)</span>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">${upcomingDivs.length} Divisi</span>
                  </div>
                  <span class="w-6 h-6 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    ${svgIcon("chevronDown", "w-3.5 h-3.5")}
                  </span>
                </summary>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 mt-3 border-t border-[var(--border-subtle)]">
                  ${upcomingDivs.map((div) => `
                    <div class="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5 opacity-75">
                      <div class="flex items-center gap-2.5 min-w-0">
                        ${renderDivisionIconSvg(div.id, "w-7 h-7")}
                        <div class="min-w-0">
                          <div class="font-bold text-xs text-[var(--text-primary)] truncate">${escapeHtml(div.name)}</div>
                          <div class="text-[10px] font-mono text-[var(--text-muted)]">Segera Hadir</div>
                        </div>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </details>
            `;
          })()}
        </section>

        <!-- Rekomendasi Cerdas Adaptif -->
        <section class="med-card p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="badge-specialty uppercase tracking-wider text-[11px] font-mono text-[var(--accent-primary)] border-[var(--accent-primary-border)] bg-[var(--accent-primary-soft)] inline-flex items-center gap-1">
                ${svgIcon("sparkles", "w-3.5 h-3.5")}
                <span>Rekomendasi Cerdas</span>
              </span>
              <span class="text-xs text-[var(--text-secondary)]">Prioritas adaptif berdasarkan akurasi &amp; kelengkapan modul</span>
            </div>
            ${
              analytics.mistakesCount > 0
                ? `<button type="button" onclick="window.InternaApp.startQuizSession('weakness')" class="btn-duo btn-duo-primary text-xs py-1.5 px-3">Ulang ${Math.min(10, analytics.mistakesCount)} Soal Lemah</button>`
                : ""
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${recList
              .map((rec) => {
                const disp = getModuleDisplayTitles(rec);
                const divShort = getDivisionShortLabel(rec.divisionId || "tropik-infeksi");
                return `
                  <div class="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between gap-3">
                    <div class="space-y-1">
                      <div class="flex items-center justify-between gap-1 text-[11px] font-mono">
                        <span class="font-bold text-[var(--text-muted)]">${escapeHtml(divShort)}</span>
                        <span class="font-semibold text-[var(--accent-secondary)]">${escapeHtml(rec.reason || "Prioritas")}</span>
                      </div>
                      <div class="font-bold text-sm text-[var(--text-primary)] line-clamp-1" title="${escapeHtml(disp.fullTitle)}">${escapeHtml(disp.title)}</div>
                      ${disp.subtitle ? `<p class="text-xs text-[var(--text-muted)] line-clamp-1">${escapeHtml(disp.subtitle)}</p>` : ""}
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <button type="button" onclick="window.InternaApp.openMaterialCarousel('${rec.id}')" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer">Materi</button>
                      <button type="button" onclick="window.InternaApp.startQuizSession('module', '${rec.id}')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--accent-primary)] text-[var(--on-accent-primary)] hover:opacity-90 cursor-pointer">Latih</button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
          ${(() => {
            const upcomingDivs = (window.INTERNA_DATA?.divisions || []).filter((d) => d.status !== "active");
            if (!upcomingDivs.length) return "";
            return `
              <details class="med-card p-4 border border-[var(--border-subtle)] group">
                <summary class="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-[var(--text-primary)]">Divisi Mendatang (Segera Hadir)</span>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">${upcomingDivs.length} Divisi</span>
                  </div>
                  <span class="w-6 h-6 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    ${svgIcon("chevronDown", "w-3.5 h-3.5")}
                  </span>
                </summary>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 mt-3 border-t border-[var(--border-subtle)]">
                  ${upcomingDivs.map((div) => `
                    <div class="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5 opacity-75">
                      <div class="flex items-center gap-2.5 min-w-0">
                        ${renderDivisionIconSvg(div.id, "w-7 h-7")}
                        <div class="min-w-0">
                          <div class="font-bold text-xs text-[var(--text-primary)] truncate">${escapeHtml(div.name)}</div>
                          <div class="text-[10px] font-mono text-[var(--text-muted)]">Segera Hadir</div>
                        </div>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </details>
            `;
          })()}
        </section>
      </div>
    `;
  }

  // =========================================================================
  // 7B. MATERI KLINIS VIEW (RE-KATEGORISASI DIVISI & SUB-KLASTER TIER)
  // =========================================================================
  function renderMateriView() {
    const analytics = computeAnalytics();
    const currentDivToggle = state.selectedDivisionId || state.dashboardDivisionToggle || "tropik-infeksi";
    const currentStatusFilter = state.dashboardStatusFilter || "all";
    const currentClusterFilter = String(state.materiClusterFilter || "all");
    const searchQuery = (state.topicSearchQuery || "").trim().toLowerCase();

    const activeDivisions = window.INTERNA_DATA.divisions.filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );

    const modsByDivision = {};
    activeDivisions.forEach((d) => {
      modsByDivision[d.id] = analytics.moduleStats.filter((m) => (m.divisionId || "tropik-infeksi") === d.id);
    });
    const totalAllMods = activeDivisions.reduce((sum, d) => sum + (modsByDivision[d.id]?.length || 0), 0);

    function applyFilters(mods) {
      return mods.filter((mod) => {
        const isRead = state.topicsRead && state.topicsRead[mod.id]?.completed;
        if (currentStatusFilter === "read" && !isRead) return false;
        if (currentStatusFilter === "unread" && isRead) return false;
        if (currentDivToggle !== "all" && currentClusterFilter !== "all") {
          if (String(mod.tier || "") !== currentClusterFilter) return false;
        }
        if (searchQuery) {
          const disp = getModuleDisplayTitles(mod);
          const matchTitle = (mod.title || "").toLowerCase().includes(searchQuery)
            || disp.title.toLowerCase().includes(searchQuery)
            || disp.subtitle.toLowerCase().includes(searchQuery);
          const matchComp = (mod.competencyLevel || mod.kkiLevel || "").toLowerCase().includes(searchQuery);
          const matchId = (mod.id || "").toLowerCase().includes(searchQuery);
          if (!matchTitle && !matchComp && !matchId) return false;
        }
        return true;
      });
    }

    const activeDivMatch = activeDivisions.find((d) => d.id === currentDivToggle);
    const currentDivMods = activeDivMatch ? (modsByDivision[activeDivMatch.id] || []) : analytics.moduleStats;
    const distinctTiers = Array.from(
      new Set(currentDivMods.map((m) => Number(m.tier || 0)).filter((t) => t > 0))
    ).sort((a, b) => a - b);

    function renderModuleCard(mod, idx) {
      const isRead = state.topicsRead && state.topicsRead[mod.id]?.completed;
      const compLevel = (mod.competencyLevel || mod.kkiLevel || "Tingkat 4").replace("Tingkat ", "KKI ");
      const qCount = mod.totalQuestions || 10;
      const bCount = mod.boardQuestionsCount || 0;
      const display = getModuleDisplayTitles(mod);
      const numLabel = String(idx + 1).padStart(2, "0");

      return `
        <article id="module-card-${mod.id}" class="pathway-node flex flex-col justify-between gap-3.5 p-4">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2 text-xs font-mono">
              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                <span class="text-[var(--text-secondary)]">${numLabel}</span>
                <span aria-hidden="true">&bull;</span>
                <span class="${compLevel.includes("4") ? "text-[var(--accent-primary)] font-bold" : "text-[var(--text-secondary)]"}">${escapeHtml(compLevel)}</span>
              </div>
              <span class="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold ${isRead ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}">
                <span class="w-1.5 h-1.5 rounded-full ${isRead ? "bg-[var(--accent-primary)]" : "bg-[var(--border-strong)]"}"></span>
                <span>${isRead ? "Selesai" : "Belum"}</span>
              </span>
            </div>

            <div class="space-y-1">
              <h3 class="module-title-compact" title="${escapeHtml(display.fullTitle)}">
                ${escapeHtml(display.title)}
              </h3>
              ${display.subtitle ? `<p class="module-subtitle line-clamp-2">${escapeHtml(display.subtitle)}</p>` : ""}
            </div>
          </div>

          <div class="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
            <div class="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>${qCount} soal tersedia</span>
              ${
                bCount > 0
                  ? `<span class="text-[var(--accent-secondary)] font-semibold">${bCount} Asli Board</span>`
                  : `<span>Drill Klinis</span>`
              }
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                onclick="window.InternaApp.openMaterialCarousel('${mod.id}')"
                class="btn-duo btn-duo-outline text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 touch-target"
                title="Baca Ringkasan Materi"
              >
                ${svgIcon("book", "w-3.5 h-3.5 text-[var(--text-muted)]")}
                <span>Materi</span>
              </button>

              <button
                type="button"
                onclick="window.InternaApp.startQuizSession('module', '${mod.id}')"
                class="btn-duo btn-duo-primary text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 touch-target font-bold"
                title="Mulai Kuis Modul"
              >
                ${svgIcon("clipboard", "w-3.5 h-3.5")}
                <span>Latih Soal</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }

    function renderGroupedModules(mods, divId) {
      const tiersMap = new Map();
      mods.forEach((m) => {
        const t = Number(m.tier || 0);
        if (!tiersMap.has(t)) tiersMap.set(t, []);
        tiersMap.get(t).push(m);
      });
      const sortedTiers = Array.from(tiersMap.keys()).sort((a, b) => a - b);
      let globalCounter = 0;

      return `
        <div class="space-y-6">
          ${sortedTiers
            .map((tierNum) => {
              const groupMods = tiersMap.get(tierNum) || [];
              const clusterTitle = (SUBCLUSTER_TITLES[divId] && SUBCLUSTER_TITLES[divId][tierNum])
                || (tierNum > 0 ? `Topik ${tierNum}` : "Topik Lainnya");
              return `
                <section class="space-y-3">
                  <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-subtle)]">
                    <h3 class="font-bold text-sm sm:text-base text-[var(--text-primary)] tracking-tight">${escapeHtml(clusterTitle)}</h3>
                    <span class="text-[11px] font-mono font-semibold text-[var(--text-muted)] shrink-0">${groupMods.length} Modul</span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    ${groupMods.map((mod) => renderModuleCard(mod, globalCounter++)).join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </div>
      `;
    }

    return `
      <div class="max-w-5xl mx-auto px-4 py-6 space-y-5 animate-pop">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">Materi Klinis &amp; Kurikulum</h1>
            <p class="text-xs sm:text-sm text-[var(--text-secondary)]">Struktur belajar terorganisir berdasarkan divisi spesialisasi dan sub-klaster kompetensi.</p>
          </div>
          <button type="button" onclick="window.InternaApp.toggleTocModal(true)" class="btn-duo btn-duo-outline text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto">
            <span>Daftar Isi (${totalAllMods} Topik)</span>
          </button>
        </div>

        <!-- Division Selector, Sub-Cluster Filter & Search -->
        <div class="med-card p-4 sm:p-5 space-y-3.5">
          <!-- Row 1: Divisi Pills -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            ${activeDivisions
              .map((div) => {
                const isSelected = div.id === currentDivToggle;
                const count = (modsByDivision[div.id] || []).length;
                return `
                  <button
                    type="button"
                    onclick="window.InternaApp.selectDivision('${div.id}')"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-2 border ${
                      isSelected
                        ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)] font-bold"
                        : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                    }"
                  >
                    <span>${renderDivisionIconSvg(div.id, "w-4 h-4 inline-flex mr-1 align-text-bottom")}${escapeHtml(div.shortName || div.name)}</span>
                    <span class="text-[11px] font-mono opacity-80">(${count})</span>
                  </button>
                `;
              })
              .join("")}
            <button
              type="button"
              onclick="window.InternaApp.selectDivision('all')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-2 border ${
                currentDivToggle === "all"
                  ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)] font-bold"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }"
            >
              <span>Semua Divisi</span>
              <span class="text-[11px] font-mono opacity-80">(${totalAllMods})</span>
            </button>
          </div>

          <!-- Row 2: Sub-Klaster Filter Chips (When Specific Division Active) -->
          ${
            currentDivToggle !== "all" && distinctTiers.length > 1
              ? `
                <div class="pt-2.5 border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <span class="text-[11px] font-mono font-bold text-[var(--text-muted)] mr-1 shrink-0">Topik:</span>
                  <button
                    type="button"
                    onclick="window.InternaApp.setMateriClusterFilter('all')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 border transition ${
                      currentClusterFilter === "all"
                        ? "bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border-[var(--tint-teal-border)] font-bold"
                        : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }"
                  >
                    Semua Klaster
                  </button>
                  ${distinctTiers
                    .map((t) => {
                      const active = currentClusterFilter === String(t);
                      const fullName = SUBCLUSTER_TITLES[currentDivToggle]?.[t] || `Klaster ${t}`;
                      return `
                        <button
                          type="button"
                          onclick="window.InternaApp.setMateriClusterFilter('${t}')"
                          title="${escapeHtml(fullName)}"
                          class="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 border transition ${
                            active
                              ? "bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border-[var(--tint-teal-border)] font-bold"
                              : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                          }"
                        >
                          ${escapeHtml(fullName)}
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `
              : ""
          }

          <!-- Row 3: Search + Status Filter -->
          <div class="pt-2.5 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="relative flex-1">
              <input
                type="text"
                id="topic-search-input"
                value="${escapeHtml(state.topicSearchQuery || "")}"
                oninput="window.InternaApp.setTopicSearch(this.value)"
                placeholder="Cari topik (misal: STEMI, Sepsis, Dengue, KDIGO, Hipertensi)..."
                class="w-full pl-9 pr-8 py-2 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <svg class="w-4 h-4 text-[var(--text-muted)] absolute left-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              ${
                state.topicSearchQuery
                  ? `<button type="button" onclick="window.InternaApp.clearTopicSearch()" class="absolute right-2.5 top-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1" aria-label="Hapus Pencarian">${svgIcon("close", "w-3.5 h-3.5")}</button>`
                  : ""
              }
            </div>

            <div class="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-0.5">
              <span class="text-xs font-mono text-[var(--text-muted)] mr-1">Status:</span>
              <button type="button" onclick="window.InternaApp.setDashboardStatusFilter('all')" class="px-2.5 py-1 rounded-lg text-xs font-medium transition ${currentStatusFilter === "all" ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold" : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"}">Semua</button>
              <button type="button" onclick="window.InternaApp.setDashboardStatusFilter('read')" class="px-2.5 py-1 rounded-lg text-xs font-medium transition ${currentStatusFilter === "read" ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold" : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"}">Sudah Dibaca</button>
              <button type="button" onclick="window.InternaApp.setDashboardStatusFilter('unread')" class="px-2.5 py-1 rounded-lg text-xs font-medium transition ${currentStatusFilter === "unread" ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold" : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"}">Belum Dibaca</button>
            </div>
          </div>
        </div>

        <!-- Modules by Sub-Cluster -->
        ${(() => {
          if (activeDivMatch) {
            const divMods = modsByDivision[activeDivMatch.id] || [];
            const filtered = applyFilters(divMods);
            if (filtered.length === 0) {
              return `
                <div class="med-card p-8 text-center space-y-3 border border-dashed border-[var(--border-strong)]">
                  <div class="text-[var(--text-muted)] text-sm font-semibold">Tidak ada topik ${escapeHtml(activeDivMatch.shortName || activeDivMatch.name)} yang sesuai filter.</div>
                  <button type="button" onclick="window.InternaApp.clearTopicSearch(); window.InternaApp.setDashboardStatusFilter('all'); window.InternaApp.setMateriClusterFilter('all');" class="btn-duo btn-duo-primary text-xs py-1.5 px-4">
                    <span>Reset Filter</span>
                  </button>
                </div>
              `;
            }
            return renderGroupedModules(filtered, activeDivMatch.id);
          }

          if (currentDivToggle === "all") {
            return `
              <div class="space-y-6">
                ${activeDivisions
                  .map((div) => {
                    const divMods = modsByDivision[div.id] || [];
                    const filteredDiv = applyFilters(divMods);
                    const isOpen = state.divisionAccordions ? state.divisionAccordions[div.id] !== false : true;
                    const initials = getDivisionInitials(div.id);
                    return `
                      <div class="space-y-3">
                        <button type="button" onclick="window.InternaApp.toggleDivisionAccordion('${div.id}')" class="division-accordion-header w-full text-left">
                          <div class="flex items-center gap-2.5">
                            <span class="w-6 h-6 rounded-md bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] flex items-center justify-center font-bold text-xs">${initials}</span>
                            <div>
                              <div class="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">${renderDivisionIconSvg(div.id, "w-6 h-6")}<span>Divisi ${escapeHtml(div.name)}</span></div>
                              <div class="text-[11px] text-[var(--text-muted)]">${filteredDiv.length} dari ${divMods.length} Topik Ditampilkan</div>
                            </div>
                          </div>
                          <span class="text-xs font-mono font-bold text-[var(--text-muted)]">${isOpen ? "Tutup" : "Buka"}</span>
                        </button>
                        ${isOpen ? renderGroupedModules(filteredDiv, div.id) : ""}
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `;
          }

          const targetDiv = window.INTERNA_DATA.divisions.find((d) => d.id === currentDivToggle) || { name: "Divisi Terpilih" };
          return `
            <div class="med-card p-8 text-center space-y-3 border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
              <h3 class="font-bold text-lg text-[var(--text-primary)]">Divisi ${escapeHtml(targetDiv.name)} Segera Hadir</h3>
              <p class="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">Materi klinis terstruktur dan bank soal CBT terstandar untuk divisi ini sedang dalam tahap penyusunan.</p>
              <button type="button" onclick="window.InternaApp.selectDivision('tropik-infeksi')" class="btn-duo btn-duo-primary text-xs py-2 px-4">
                <span>Buka Tropik &amp; Infeksi</span>
              </button>
            </div>
          `;
        })()}
      </div>
    `;
  }


  // 8. TOP NAV & MOBILE BOTTOM NAV
  function toggleMobileSidebar(forceState) {
    if (typeof forceState === "boolean") {
      sidebarMobileOpen = forceState;
    } else {
      sidebarMobileOpen = !sidebarMobileOpen;
    }
    const sidebarEl = document.getElementById("app-sidebar");
    const backdropEl = document.getElementById("sidebar-backdrop");
    if (sidebarEl) sidebarEl.classList.toggle("is-open", sidebarMobileOpen);
    if (backdropEl) backdropEl.classList.toggle("is-open", sidebarMobileOpen);
  }

  function toggleSoundPreference() {
    state.soundEnabled = state.soundEnabled === false ? true : false;
    saveState();
    if (state.soundEnabled && window.InternaGamification && typeof window.InternaGamification.playClinicalFeedbackTone === "function") {
      window.InternaGamification.playClinicalFeedbackTone("correct", true);
    }
    renderTopNav();
    if (activeView === "profile") renderApp();
  }

  // =========================================================================
  function renderTopNav() {
    const sidebar = document.getElementById("app-sidebar");
    const header = document.getElementById("app-header");

    const widgetCount = getWidgetCatalog().length;
    const lvlObj = window.InternaGamification
      ? window.InternaGamification.getLevelFromXP(state.totalXP)
      : { level: 1, tier: 1, tierName: "Clinical Clerk", progressPercent: 0 };
    const prof = state.userProfile || { name: "dr. Residen" };
    const streakDays = state.streakDays || 1;
    const isMateri = activeView === "materi" || activeView === "dashboard";
    const isSoal = activeView === "tryout" || activeView === "tryout-exam" || activeView === "tryout-result" || activeView === "quiz" || activeView === "quiz-summary";
    const online = isAppOnline();
    const cacheReady = isOfflineCacheReady();
    const offlineStatusPill = !online
      ? `<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-[var(--text-primary)]">
           <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Mode Offline</span>
           <span class="font-mono text-[10px] text-[var(--text-muted)]">Lokal</span>
         </div>`
      : (cacheReady
          ? `<div class="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-[var(--text-secondary)]" title="Seluruh materi, widget &amp; soal sudah tersimpan untuk akses tanpa internet">
               <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Siap Offline</span>
               <span class="font-mono text-[9px] text-[var(--text-muted)]">PWA</span>
             </div>`
          : "");

    if (sidebar) {
      sidebar.classList.toggle("is-open", sidebarMobileOpen);
      const backdropEl = document.getElementById("sidebar-backdrop");
      if (backdropEl) backdropEl.classList.toggle("is-open", sidebarMobileOpen);

      sidebar.innerHTML = `
        <div class="p-4 flex flex-col h-full gap-4">
          <!-- Brand Header (Minimalist Anatomical Logo) -->
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
            <button type="button" onclick="window.InternaApp.navigate('home')" class="flex items-center gap-2.5 text-left cursor-pointer rounded-xl p-1 -m-1 hover:opacity-90 transition">
              ${renderInternaSnackLogoSvg("w-9 h-9")}
              <div class="flex flex-col min-w-0">
                <span class="font-extrabold text-[15px] tracking-tight text-[var(--text-primary)] leading-tight">Interna Snack</span>
                <span class="text-[11px] font-medium text-[var(--text-muted)] truncate">Internal Medicine Hub</span>
              </div>
            </button>
            <button type="button" onclick="window.InternaApp.toggleMobileSidebar(false)" class="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]" aria-label="Tutup Menu">
              ${svgIcon("close", "w-4 h-4")}
            </button>
          </div>

          <!-- Primary Osmosis-Style Navigation -->
          <nav class="flex flex-col gap-1 flex-1" aria-label="Menu Samping">
            <button type="button" onclick="window.InternaApp.navigate('home')" class="osm-nav-item ${activeView === "home" ? "is-active" : ""}">
              ${svgIcon("home", "w-4 h-4")}
              <span class="flex-1">Home</span>
            </button>

            <button type="button" onclick="window.InternaApp.navigate('materi')" class="osm-nav-item ${isMateri ? "is-active" : ""}">
              ${svgIcon("book", "w-4 h-4")}
              <span class="flex-1">Materi Klinis</span>
            </button>

            <button type="button" onclick="window.InternaApp.navigate('widgets')" class="osm-nav-item ${activeView === "widgets" ? "is-active" : ""}">
              ${svgIcon("sliders", "w-4 h-4")}
              <span class="flex-1">Widget</span>
              <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">${widgetCount}</span>
            </button>

            <button type="button" onclick="window.InternaApp.navigate('tryout')" class="osm-nav-item ${isSoal ? "is-active" : ""}">
              ${svgIcon("clipboard", "w-4 h-4")}
              <span class="flex-1">Soal</span>
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]">CBT &amp; Snack</span>
            </button>

            <button type="button" onclick="window.InternaApp.openGlobalSearch()" class="osm-nav-item">
              ${svgIcon("search", "w-4 h-4")}
              <span class="flex-1">Cari Cepat</span>
              <kbd class="kbd-shortcut text-[10px]">⌘K</kbd>
            </button>
          </nav>

          <!-- Bottom Controls + Streak/XP + Profil & Pengaturan -->
          <div class="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-2.5 mt-auto">
            ${offlineStatusPill}
            <!-- Theme, Sound & Font Stepper -->
            <div class="flex items-center justify-between gap-1.5">
              ${renderFontSizeStepperHtml()}
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  onclick="window.InternaApp.toggleSoundPreference()"
                  class="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition cursor-pointer"
                  title="${state.soundEnabled !== false ? "Matikan Efek Suara" : "Aktifkan Efek Suara"}"
                  aria-label="Toggle Audio Kuis"
                >
                  ${svgIcon(state.soundEnabled !== false ? "volume" : "volumeOff", "w-4 h-4")}
                </button>
                <button
                  type="button"
                  id="theme-toggle-btn"
                  onclick="window.InternaApp.toggleThemeQuick()"
                  class="js-theme-toggle-btn w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition cursor-pointer"
                  title="Beralih Mode Gelap/Terang"
                >
                  ${svgIcon("moon", "w-4 h-4")}
                </button>
              </div>
            </div>

            <!-- Bottom-most Integrated Block: Streak & XP + Profil & Pengaturan -->
            <div class="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2 px-1">
                <div class="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-secondary)] font-mono">
                  <span class="streak-flame-glow inline-flex">${svgIcon("flame", "w-4 h-4")}</span>
                  <span>${streakDays} hari streak</span>
                </div>
                <span class="text-[11px] font-mono font-bold text-[var(--accent-primary)]">Lv.${lvlObj.level} &bull; ${state.totalXP || 0} XP</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <div class="h-full rounded-full bg-[var(--accent-primary)] transition-all" style="width:${lvlObj.progressPct || 12}%"></div>
              </div>
              <button type="button" onclick="window.InternaApp.navigate('profile')" class="osm-nav-item ${activeView === "profile" ? "is-active" : ""} !min-h-[40px] !py-1.5 !px-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                ${svgIcon("user", "w-4 h-4")}
                <span class="flex-1 min-w-0 text-left leading-tight">
                  <span class="block text-xs font-bold text-[var(--text-primary)] truncate">${escapeHtml(prof.name || "dr. Residen")}</span>
                  <span class="block text-[10px] font-semibold text-[var(--text-muted)] truncate">Profil &amp; Pengaturan</span>
                </span>
                ${svgIcon("arrowRight", "w-3.5 h-3.5 text-[var(--text-muted)]")}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (header) {
      header.innerHTML = `
        <div class="px-3 py-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <button type="button" onclick="window.InternaApp.toggleMobileSidebar(true)" class="w-10 h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] shrink-0 cursor-pointer" aria-label="Buka Navigasi">
              ${svgIcon("menu", "w-5 h-5")}
            </button>
            <button type="button" class="flex items-center gap-2 text-left min-w-0 cursor-pointer" onclick="window.InternaApp.navigate('home')">
              ${renderInternaSnackLogoSvg("w-8 h-8")}
              <span class="font-extrabold text-sm tracking-tight text-[var(--text-primary)] truncate">Interna Snack</span>
            </button>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${!online ? `<span class="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-[10px] font-mono font-bold text-[var(--text-primary)]">Offline</span>` : ""}
            <button
              type="button"
              onclick="window.InternaApp.openGlobalSearch()"
              class="w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer"
              title="Cari Cepat (Cmd+K)"
              aria-label="Cari Cepat"
            >
              ${svgIcon("search", "w-4 h-4")}
            </button>
            <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--accent-secondary)] font-mono font-bold">
              ${svgIcon("flame", "w-3.5 h-3.5")}
              <span>${streakDays}d</span>
            </div>
            <button
              type="button"
              onclick="window.InternaApp.toggleThemeQuick()"
              class="js-theme-toggle-btn w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer"
              title="Beralih Mode Gelap/Terang"
            >
              ${svgIcon("moon", "w-4 h-4")}
            </button>
          </div>
        </div>
      `;
    }

    applyTheme();
  }

  function renderMobileNav() {
    const nav = document.getElementById("mobile-nav");
    if (!nav) return;

    const analytics = computeAnalytics();
    const isMateri = activeView === "materi" || activeView === "dashboard";
    const isSoal = activeView === "tryout" || activeView === "tryout-exam" || activeView === "tryout-result" || activeView === "quiz" || activeView === "quiz-summary";
    const online = isAppOnline();
    const cacheReady = isOfflineCacheReady();
    const offlineStatusPill = !online
      ? `<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-[var(--text-primary)]">
           <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Mode Offline</span>
           <span class="font-mono text-[10px] text-[var(--text-muted)]">Lokal</span>
         </div>`
      : (cacheReady
          ? `<div class="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-[var(--text-secondary)]" title="Seluruh materi, widget &amp; soal sudah tersimpan untuk akses tanpa internet">
               <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Siap Offline</span>
               <span class="font-mono text-[9px] text-[var(--text-muted)]">PWA</span>
             </div>`
          : "");

    nav.innerHTML = `
      <div class="grid grid-cols-5 h-full items-center px-1">
        <!-- Tab 1: Home -->
        <button
          type="button"
          onclick="window.InternaApp.navigate('home')"
          class="touch-target flex flex-col items-center justify-center gap-0.5 h-full ${
            activeView === "home"
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
          }"
        >
          ${svgIcon("home", "w-5 h-5")}
          <span class="text-[10px]">Home</span>
        </button>

        <!-- Tab 2: Materi -->
        <button
          type="button"
          onclick="window.InternaApp.navigate('materi')"
          class="touch-target flex flex-col items-center justify-center gap-0.5 h-full ${
            isMateri
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
          }"
        >
          ${svgIcon("book", "w-5 h-5")}
          <span class="text-[10px]">Materi</span>
        </button>

        <!-- Tab 3: Widget -->
        <button
          type="button"
          onclick="window.InternaApp.navigate('widgets')"
          class="touch-target flex flex-col items-center justify-center gap-0.5 h-full ${
            activeView === "widgets"
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
          }"
        >
          ${svgIcon("sliders", "w-5 h-5")}
          <span class="text-[10px]">Widget</span>
        </button>

        <!-- Tab 4: Soal -->
        <button
          type="button"
          onclick="window.InternaApp.navigate('tryout')"
          class="touch-target flex flex-col items-center justify-center gap-0.5 h-full relative ${
            isSoal
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
          }"
        >
          <div class="relative">
            ${svgIcon("clipboard", "w-5 h-5")}
            ${
              analytics.mistakesCount > 0
                ? `<span class="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-mono bg-[var(--accent-coral)] text-white font-bold leading-none">${analytics.mistakesCount}</span>`
                : ""
            }
          </div>
          <span class="text-[10px]">Soal</span>
        </button>

        <!-- Tab 5: Profil -->
        <button
          type="button"
          onclick="window.InternaApp.navigate('profile')"
          class="touch-target flex flex-col items-center justify-center gap-0.5 h-full ${
            activeView === "profile"
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
          }"
        >
          ${svgIcon("user", "w-5 h-5")}
          <span class="text-[10px]">Profil</span>
        </button>
      </div>
    `;
  }

  // =========================================================================
  // 9. QUIZ ENGINE (10 SOAL PER SESI)
  // =========================================================================
  function startSRSReview() {
    startQuizSession("srs");
  }

  function startQuizSession(mode, moduleId = null) {
    const allQ = getAllQuestions();
    const activeDiv = state.selectedDivisionId || "tropik-infeksi";
    const sourceFilter = state.quizSourceFilter || "all";
    const catFilter = state.quizCategoryFilter || "all";
    const modObj = mode === "module" && moduleId ? getAllModules().find((m) => m.id === moduleId) : null;
    const effectiveDiv = mode === "division" && moduleId
      ? moduleId
      : (mode === "module" && modObj ? (modObj.divisionId || activeDiv) : activeDiv);
    let pool = [];

    if (mode === "module" && moduleId) {
      const modAll = allQ.filter((q) => q.moduleId === moduleId);
      const filteredModQ = shuffleArray(filterQuestionsByPreferences(modAll, "all", sourceFilter, catFilter));
      const divFilteredOtherQ = shuffleArray(
        filterQuestionsByPreferences(allQ.filter((q) => q.moduleId !== moduleId), effectiveDiv, sourceFilter, catFilter)
      );
      const fallbackOtherQ = shuffleArray(allQ.filter((q) => q.moduleId !== moduleId));
      const chosen = filteredModQ.length > 0
        ? [...filteredModQ, ...divFilteredOtherQ, ...fallbackOtherQ].slice(0, 10)
        : [...shuffleArray(modAll), ...fallbackOtherQ].slice(0, 10);
      if (filteredModQ.length === 0 && (sourceFilter !== "all" || catFilter !== "all")) {
        showToast("Modul ini belum memiliki soal untuk filter aktif; menampilkan soal modul umum.", "info");
      }
      pool = chosen.map((q) => prepareShuffledQuizQuestion(q));
    } else if (mode === "weakness") {
      const mistakes = shuffleArray(getMistakeVaultQuestions());
      if (mistakes.length === 0) {
        showToast("Bank salah kosong. Semua soal terkendali!", "success");
        return;
      }
      const chosen = mistakes.slice(0, 10);
      pool = chosen.map((q) => prepareShuffledQuizQuestion(q));
    } else if (mode === "srs") {
      const nowTs = Date.now();
      const dueList = allQ
        .filter((q) => {
          const s = state.srs[q.id];
          return s && s.attempts > 0 && s.nextReview && s.nextReview <= nowTs;
        })
        .sort((a, b) => (state.srs[a.id]?.nextReview || 0) - (state.srs[b.id]?.nextReview || 0));
      if (dueList.length === 0) {
        showToast("Belum ada soal SRS yang jatuh tempo hari ini!", "info");
        return;
      }
      pool = dueList.slice(0, 10).map((q) => prepareShuffledQuizQuestion(q));
    } else if (mode === "division" && moduleId) {
      const divPool = allQ.filter((q) => (q.divisionId || "tropik-infeksi") === moduleId);
      const sourcePool = divPool.length > 0 ? divPool : allQ;
      pool = shuffleArray(sourcePool).slice(0, Math.min(10, sourcePool.length)).map((q) => prepareShuffledQuizQuestion(q));
    } else if (mode === "board") {
      const divBoardQ = filterQuestionsByPreferences(allQ, effectiveDiv, "board", catFilter);
      const anyDivBoardQ = filterQuestionsByPreferences(allQ, "all", "board", "all");
      const sourcePool = divBoardQ.length > 0 ? divBoardQ : anyDivBoardQ;
      const shuffled = shuffleArray(sourcePool.length > 0 ? sourcePool : allQ);
      pool = shuffled.slice(0, 10).map((q) => prepareShuffledQuizQuestion(q));
    } else {
      // 'filtered' or 'mixed': respects selectedDivisionId + quizSourceFilter + quizCategoryFilter
      const filtered = filterQuestionsByPreferences(allQ, effectiveDiv, sourceFilter, catFilter);
      const divQ = effectiveDiv === "all" ? allQ : allQ.filter((q) => (q.divisionId || "tropik-infeksi") === effectiveDiv);
      const sourcePool = filtered.length > 0 ? filtered : (divQ.length > 0 ? divQ : allQ);
      const shuffled = shuffleArray(sourcePool);
      pool = shuffled.slice(0, Math.min(10, shuffled.length)).map((q) => prepareShuffledQuizQuestion(q));
    }

    if (currentQuiz.timerInterval) clearInterval(currentQuiz.timerInterval);

    const activeDivObj = window.INTERNA_DATA.divisions.find((d) => d.id === effectiveDiv);
    const divShort = effectiveDiv === "all" ? "Semua Divisi" : (activeDivObj ? activeDivObj.shortName : "Interna");
    const sourceLabel = sourceFilter === "board" ? "Asli Board" : sourceFilter === "papdi_drill" ? "Teori & Drill" : "Campuran";
    const catSuffix = catFilter !== "all" ? ` • ${catFilter}` : "";
    const quizTitle =
      mode === "weakness"
        ? "Penguatan Soal Lemah & Salah"
        : mode === "srs"
        ? "Review Spaced Repetition (SRS)"
        : mode === "module" && modObj
        ? `Latihan Modul — ${getModuleDisplayTitles(modObj).title}`
        : mode === "board"
        ? `Latihan Soal Asli Board — ${divShort}${catSuffix}`
        : `Kuis ${sourceLabel} — ${divShort}${catSuffix}`;

    const attributedDiv = (mode === "weakness" || mode === "srs" || effectiveDiv === "all") ? null : effectiveDiv;
    quizOriginView = activeView === "materi" || activeView === "dashboard" ? "materi" : activeView === "tryout" ? "tryout" : "home";
    sessionNewAchievements = [];

    currentQuiz = {
      mode,
      title: quizTitle,
      moduleId,
      divisionId: attributedDiv,
      questions: pool,
      currentIndex: 0,
      selectedOption: null,
      isSubmitted: false,
      lastAnswerAnim: "",
      correctCount: 0,
      highlightEnabled: false,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      elapsedSeconds: 0,
      timerInterval: null,
      timerHidden: false,
      sessionResults: [],
      userAnswers: {},
      currentStreak: 0,
      maxStreak: 0,
      totalPoints: 0,
      lastPointsEarned: 0
    };

    currentQuiz.timerInterval = setInterval(() => {
      currentQuiz.elapsedSeconds = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
      const timerEl = document.getElementById("quiz-timer-display");
      if (timerEl && !currentQuiz.timerHidden) {
        timerEl.textContent = formatDuration(currentQuiz.elapsedSeconds);
      }
      updateSpeedBar();
    }, 100);

    activeView = "quiz";
    renderApp();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSpeedBar() {
    const bar = document.getElementById("quiz-speed-bar-fill");
    if (!bar || currentQuiz.isSubmitted) return;
    const spentSec = (Date.now() - (currentQuiz.questionStartTime || Date.now())) / 1000;
    const remainingPct = Math.max(0, Math.min(100, Math.round(((15 - spentSec) / 15) * 100)));
    bar.style.width = remainingPct + "%";
  }

  function selectQuizOption(index) {
    if (currentQuiz.isSubmitted) return;
    currentQuiz.selectedOption = index;
    renderQuizQuestionArea();
  }

  function submitQuizAnswer() {
    if (currentQuiz.selectedOption === null || currentQuiz.isSubmitted) return;
    currentQuiz.isSubmitted = true;
    const q = currentQuiz.questions[currentQuiz.currentIndex];
    const isCorrect = currentQuiz.selectedOption === q.correctIndex;
    const spent = Math.max(1, Math.round((Date.now() - currentQuiz.questionStartTime) / 1000));

    let pointsThisQ = 0;
    if (isCorrect) {
      currentQuiz.correctCount++;
      currentQuiz.currentStreak++;
      if (currentQuiz.currentStreak > currentQuiz.maxStreak) {
        currentQuiz.maxStreak = currentQuiz.currentStreak;
      }
      const multiplier = window.InternaGamification
        ? window.InternaGamification.getStreakMultiplier(currentQuiz.currentStreak)
        : 1.0;
      const speedBonus = window.InternaGamification
        ? window.InternaGamification.calculateSpeedBonus(spent)
        : 0;
      pointsThisQ = Math.round((100 + speedBonus) * multiplier);
      currentQuiz.totalPoints += pointsThisQ;
    } else {
      currentQuiz.currentStreak = 0;
    }
    currentQuiz.lastPointsEarned = pointsThisQ;

    recordQuestionResult(q.id, isCorrect, spent);
    currentQuiz.lastAnswerAnim = isCorrect ? "correct-pop" : "wrong-shake";
    if (window.InternaGamification && typeof window.InternaGamification.playClinicalFeedbackTone === "function") {
      window.InternaGamification.playClinicalFeedbackTone(isCorrect ? "correct" : "wrong", state.soundEnabled !== false);
    }

    currentQuiz.userAnswers[currentQuiz.currentIndex] = {
      selectedOption: currentQuiz.selectedOption,
      isSubmitted: true,
      isCorrect,
      spentSec: spent,
      pointsEarned: pointsThisQ
    };

    currentQuiz.sessionResults.push({
      questionId: q.id,
      subtopic: q.subtopic,
      isCorrect,
      spent,
      pointsEarned: pointsThisQ
    });

    renderQuizQuestionArea();
    setTimeout(() => {
      document.getElementById("quiz-feedback-panel")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function prevQuizQuestion() {
    if (currentQuiz.currentIndex > 0) {
      runClickTransition(() => {
        currentQuiz.currentIndex--;
        const prevAns = currentQuiz.userAnswers[currentQuiz.currentIndex];
        if (prevAns) {
          currentQuiz.selectedOption = prevAns.selectedOption;
          currentQuiz.isSubmitted = prevAns.isSubmitted;
        } else {
          currentQuiz.selectedOption = null;
          currentQuiz.isSubmitted = false;
        }
        renderApp();
      }, "prev");
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function nextQuizQuestion() {
    if (currentQuiz.currentIndex + 1 < currentQuiz.questions.length) {
      runClickTransition(() => {
        currentQuiz.currentIndex++;
        const nextAns = currentQuiz.userAnswers[currentQuiz.currentIndex];
        if (nextAns) {
          currentQuiz.selectedOption = nextAns.selectedOption;
          currentQuiz.isSubmitted = nextAns.isSubmitted;
        } else {
          currentQuiz.selectedOption = null;
          currentQuiz.isSubmitted = false;
          currentQuiz.questionStartTime = Date.now();
        }
        renderApp();
      }, "next");
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      finishQuizSession();
    }
  }

  function finishQuizSession() {
    if (currentQuiz.timerInterval) {
      clearInterval(currentQuiz.timerInterval);
      currentQuiz.timerInterval = null;
    }

    const totalQ = currentQuiz.questions.length;
    const correctCount = currentQuiz.correctCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const basePoints = currentQuiz.totalPoints || correctCount * 100;

    // Bonuses
    let bonusXP = 0;
    const today = getLocalDateKey(0);
    const isFirstWinToday = state.lastFirstWinDate !== today;
    if (isFirstWinToday) {
      bonusXP += 250; // Daily First-Win Bonus
      state.lastFirstWinDate = today;
    }
    if (accuracy === 100 && totalQ >= 5) {
      bonusXP += 300; // Perfect Accuracy Bonus
    }

    // Spaced Repetition Bonus (>7 days since last practice on this division)
    const activeDivId = currentQuiz.divisionId !== undefined ? currentQuiz.divisionId : (state.selectedDivisionId !== "all" ? state.selectedDivisionId : null);
    const lastDivDate = activeDivId && state.lastDivisionPracticeDate && state.lastDivisionPracticeDate[activeDivId];
    if (lastDivDate) {
      const daysDiff = (Date.now() - new Date(lastDivDate).getTime()) / (1000 * 3600 * 24);
      if (daysDiff >= 7) {
        bonusXP += 300;
      }
    }

    // Daily Streak Multiplier on XP
    let streakMult = 1.0;
    if (state.streakDays >= 30) streakMult = 1.5;
    else if (state.streakDays >= 7) streakMult = 1.25;
    else if (state.streakDays >= 3) streakMult = 1.1;

    const rankObj = window.InternaGamification && typeof window.InternaGamification.getPerformanceRank === "function"
      ? window.InternaGamification.getPerformanceRank(accuracy)
      : { rank: accuracy >= 80 ? "A" : accuracy >= 65 ? "B" : "C", label: "Sesi Tuntas", badgeClass: "rank-badge-b", xpBonus: 0 };
    bonusXP += (rankObj.xpBonus || 0);

    const totalEarnedXP = Math.round((basePoints + bonusXP) * streakMult);

    // Update State
    if (activeDivId && activeDivId !== "all") {
      if (!state.divisionXP) state.divisionXP = {};
      state.divisionXP[activeDivId] = (state.divisionXP[activeDivId] || 0) + totalEarnedXP;

      if (!state.lastDivisionPracticeDate) state.lastDivisionPracticeDate = {};
      state.lastDivisionPracticeDate[activeDivId] = today;
    }

    const isNewPersonalBest = basePoints > (state.personalBestScore || 0);
    if (isNewPersonalBest) {
      state.personalBestScore = basePoints;
    }
    if (currentQuiz.maxStreak > (state.personalBestStreak || 0)) {
      state.personalBestStreak = currentQuiz.maxStreak;
    }

    if (!state.personalLeaderboard) state.personalLeaderboard = [];
    const divObj = activeDivId ? window.INTERNA_DATA.divisions.find((d) => d.id === activeDivId) : null;
    state.personalLeaderboard.unshift({
      id: "run-" + Date.now(),
      date: today,
      divisionName: divObj ? divObj.shortName : "Campuran",
      score: basePoints,
      xpEarned: totalEarnedXP,
      maxStreak: currentQuiz.maxStreak,
      accuracy: accuracy
    });
    // Keep top 10 runs
    state.personalLeaderboard = state.personalLeaderboard.slice(0, 10);

    const prevLevel = window.InternaGamification
      ? window.InternaGamification.getLevelFromXP(state.totalXP)
      : { level: 1, tier: 1 };

    checkDailyReset();
    updateStreak();
    state.dailyXP = (state.dailyXP || 0) + totalEarnedXP;
    state.totalXP += totalEarnedXP;
    state.sessionsCompleted += 1;

    const fastCorrectCount = (currentQuiz.sessionResults || []).filter((r) => r && r.isCorrect && Number(r.spent || 99) < 10).length;
    sessionNewAchievements = evaluateAndSaveAchievements({ accuracy, total: totalQ, correct: correctCount, fastCorrectCount });

    saveState();

    const newLevel = window.InternaGamification
      ? window.InternaGamification.getLevelFromXP(state.totalXP)
      : { level: 1, tier: 1 };

    const subtopicMap = {};
    (currentQuiz.sessionResults || []).forEach((item) => {
      const key = item.subtopic || "Umum";
      if (!subtopicMap[key]) subtopicMap[key] = { subtopic: key, total: 0, correct: 0 };
      subtopicMap[key].total += 1;
      if (item.isCorrect) subtopicMap[key].correct += 1;
    });

    currentQuiz.finalStats = {
      basePoints,
      bonusXP,
      streakMult,
      totalEarnedXP,
      accuracy,
      rankObj,
      subtopicBreakdown: Object.values(subtopicMap),
      isNewPersonalBest,
      leveledUp: newLevel.level > prevLevel.level,
      tierUpgraded: newLevel.tier > prevLevel.tier,
      prevLevel,
      newLevel
    };

    if (
      (accuracy >= 80 || newLevel.level > prevLevel.level || sessionNewAchievements.length > 0) &&
      window.InternaGamification &&
      typeof window.InternaGamification.playClinicalFeedbackTone === "function"
    ) {
      window.InternaGamification.playClinicalFeedbackTone("fanfare", state.soundEnabled !== false);
    }

    activeView = "quiz-summary";
    renderApp();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitQuizEarly() {
    if (currentQuiz.timerInterval) {
      clearInterval(currentQuiz.timerInterval);
      currentQuiz.timerInterval = null;
    }
    activeView = quizOriginView || "home";
    renderApp();
  }

  // =========================================================================
  // 10. QUIZ VIEW TEMPLATES
  // =========================================================================
  function renderQuizView() {
    const q = currentQuiz.questions[currentQuiz.currentIndex];
    if (!q) return `<div class="p-8 text-center">Soal tidak ditemukan.</div>`;

    const total = currentQuiz.questions.length;
    const progressPct = Math.round(((currentQuiz.currentIndex + (currentQuiz.isSubmitted ? 1 : 0)) / total) * 100);
    const multiplier = window.InternaGamification
      ? window.InternaGamification.getStreakMultiplier(currentQuiz.currentStreak)
      : 1.0;
    const bestScore = state.personalBestScore || 0;
    const pointsToBeat = Math.max(0, bestScore + 1 - currentQuiz.totalPoints);

    return `
      <div class="max-w-3xl mx-auto px-4 py-5 space-y-4 animate-pop">
        <!-- Top Bar with Ghost Target, Font Adjuster & Streak Multiplier -->
        <div class="med-card p-3 sm:p-4 space-y-2.5">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <button type="button" onclick="window.InternaApp.exitQuizEarly()" class="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Keluar Sesi">
              ${svgIcon("close", "w-4 h-4")}
            </button>

            <button
              type="button"
              onclick="${currentQuiz.currentIndex === 0 ? 'window.InternaApp.exitQuizEarly()' : 'window.InternaApp.prevQuizQuestion()'}"
              class="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="${currentQuiz.currentIndex === 0 ? 'Keluar Sesi' : 'Soal Sebelumnya'}"
            >
              ${svgIcon("arrowLeft", "w-3.5 h-3.5")}
              <span class="hidden sm:inline">${currentQuiz.currentIndex === 0 ? 'Keluar' : 'Sebelumnya'}</span>
            </button>

            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center justify-between text-xs font-semibold gap-2">
                <span class="truncate text-[var(--text-primary)] font-bold">${escapeHtml(currentQuiz.title)}</span>
                <div class="flex items-center gap-2 shrink-0">
                  ${
                    currentQuiz.currentStreak >= 3
                      ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)] inline-flex items-center gap-1">${svgIcon("flame", "w-3 h-3")} ${multiplier}x</span>`
                      : ""
                  }
                  <span class="text-[var(--accent-primary)] font-mono font-bold">Soal ${currentQuiz.currentIndex + 1}/${total}</span>
                </div>
              </div>
              <div class="duo-progress-track">
                <div class="duo-progress-fill" style="width: ${Math.max(6, progressPct)}%"></div>
              </div>
            </div>

            <!-- Score & Timer -->
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--accent-primary)] tabular-nums" title="Total Poin Sesi Ini">
                ${currentQuiz.totalPoints} pts
              </div>
              <button type="button" onclick="window.InternaApp.toggleQuizTimerVisibility()" class="px-2 py-1 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] tabular-nums">
                <span id="quiz-timer-display">${currentQuiz.timerHidden ? "••:••" : formatDuration(currentQuiz.elapsedSeconds)}</span>
              </button>
            </div>
          </div>

          <!-- Speed bonus 2px micro-bar -->
          <div class="speed-bar-container rounded-full" title="Clinical Speed Bonus (dalam 15 detik)">
            <div id="quiz-speed-bar-fill" class="speed-bar-fill" style="width: 100%;"></div>
          </div>

          <!-- Ghost Target Footer Indicator -->
          <div class="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5 font-mono">
            <span>Rekor Personal Best: <strong>${bestScore} pts</strong></span>
            <span class="inline-flex items-center gap-1">${pointsToBeat === 0 ? `${svgIcon("trophy", "w-3.5 h-3.5 text-[var(--accent-secondary)]")} Memimpin Rekor Baru` : `Butuh ${pointsToBeat} pts lagi untuk PB`}</span>
          </div>
        </div>

        <div id="quiz-question-container">
          ${renderQuizQuestionInnerHtml()}
        </div>
      </div>
    `;
  }

  function renderQuizQuestionArea() {
    const el = document.getElementById("quiz-question-container");
    if (el) el.innerHTML = renderQuizQuestionInnerHtml();
  }

  function renderQuizQuestionInnerHtml() {
    const q = currentQuiz.questions[currentQuiz.currentIndex];
    const srs = getQuestionSRS(q.id);
    const letters = ["A", "B", "C", "D", "E"];

    return `
      <div class="space-y-4">
        <div class="med-card p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-[var(--text-muted)] font-semibold">${escapeHtml(normalizeQuestionCategory(q.category))}</span>
              ${
                isBoardQuestion(q)
                  ? `<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)] inline-flex items-center gap-1">${svgIcon("award", "w-3 h-3")} ${escapeHtml(q.boardSource || "Asli Board SpPD")}</span>`
                  : `<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] inline-flex items-center gap-1">${svgIcon("book", "w-3 h-3")} Drill PAPDI</span>`
              }
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              ${renderFontSizeStepperHtml()}
              <button type="button" onclick="window.InternaApp.toggleVignetteHighlight()" class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${currentQuiz.highlightEnabled ? "bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border-[var(--accent-secondary-border)]" : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"}">
                ${currentQuiz.highlightEnabled ? "Sorotan Aktif" : "Sorot Klinis"} <kbd class="kbd-shortcut hidden sm:inline ml-0.5">H</kbd>
              </button>
              <button type="button" onclick="window.InternaApp.openLabModal()" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition">
                Nilai Lab
              </button>
            </div>
          </div>

          <div class="vignette-text">
            ${formatVignetteWithHighlights(q.vignette, currentQuiz.highlightEnabled)}
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-surface-subtle)] border-l-3 border-l-4 border-[var(--accent-primary)] leadin-text">
            ${escapeHtml(q.leadIn)}
          </div>
        </div>

        <!-- Options A-E with Keyboard Shortcuts & Scalable Typography -->
        <div class="space-y-2.5">
          ${q.options
            .map((opt, idx) => {
              let cls = "";
              if (!currentQuiz.isSubmitted) {
                if (currentQuiz.selectedOption === idx) cls = "selected";
              } else {
                cls = "locked ";
                if (idx === q.correctIndex) cls += "correct quiz-correct-pop";
                else if (idx === currentQuiz.selectedOption && idx !== q.correctIndex) cls += "wrong quiz-wrong-shake";
              }

              return `
                <button type="button" onclick="window.InternaApp.selectQuizOption(${idx})" class="option-card ${cls}" ${currentQuiz.isSubmitted ? "disabled" : ""}>
                  <span class="option-letter">
                    ${letters[idx]}
                    <kbd class="kbd-shortcut ml-1 hidden sm:inline text-[9px] opacity-75">${idx + 1}</kbd>
                  </span>
                  <div class="flex-1 option-body font-medium pt-0.5">${escapeHtml(opt)}</div>
                  ${
                    currentQuiz.isSubmitted && idx === q.correctIndex
                      ? `<span class="text-[var(--accent-primary)] pt-0.5">${svgIcon("check", "w-5 h-5")}</span>`
                      : currentQuiz.isSubmitted && idx === currentQuiz.selectedOption && idx !== q.correctIndex
                      ? `<span class="text-[var(--accent-coral)] pt-0.5">${svgIcon("close", "w-5 h-5")}</span>`
                      : ""
                  }
                </button>
              `;
            })
            .join("")}
        </div>

        ${
          !currentQuiz.isSubmitted
            ? `
              <div class="pt-3 flex items-center justify-between gap-3">
                ${
                  currentQuiz.currentIndex === 0
                    ? `
                      <button
                        type="button"
                        onclick="window.InternaApp.exitQuizEarly()"
                        class="btn-duo btn-duo-outline text-xs sm:text-sm px-3.5 py-2.5 flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Keluar dari sesi kuis"
                      >
                        ${svgIcon("arrowLeft", "w-4 h-4")}
                        <span>Keluar Sesi</span>
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        onclick="window.InternaApp.prevQuizQuestion()"
                        class="btn-duo btn-duo-outline text-xs sm:text-sm px-3.5 py-2.5 flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Kembali ke soal sebelumnya"
                      >
                        ${svgIcon("arrowLeft", "w-4 h-4")}
                        <span>Soal Sebelumnya</span>
                      </button>
                    `
                }
                <button type="button" onclick="window.InternaApp.submitQuizAnswer()" class="btn-duo btn-duo-primary flex-1 sm:flex-initial min-w-[190px] text-xs sm:text-sm px-5 py-2.5 flex items-center justify-center gap-2" ${currentQuiz.selectedOption === null ? "disabled" : ""}>
                  <span>Periksa Jawaban</span>
                  <kbd class="kbd-shortcut opacity-85 hidden sm:inline text-[10px]">Enter</kbd>
                </button>
              </div>
            `
            : renderRationaleFeedbackPanel(q)
        }
      </div>
    `;
  }

  function renderRationaleFeedbackPanel(q) {
    const isCorrect = currentQuiz.selectedOption === q.correctIndex;
    const letters = ["A", "B", "C", "D", "E"];
    const srs = getQuestionSRS(q.id);
    const isLast = currentQuiz.currentIndex + 1 >= currentQuiz.questions.length;
    const distractorEntries = Object.entries(q.rationale?.distractorAnalysis || {});
    const multiplier = window.InternaGamification
      ? window.InternaGamification.getStreakMultiplier(currentQuiz.currentStreak)
      : 1.0;

    return `
      <div id="quiz-feedback-panel" class="med-card p-5 sm:p-6 space-y-4 border-2 animate-pop ${
        isCorrect ? "border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]" : "border-[var(--accent-coral)] bg-[var(--accent-coral-soft)]"
      }">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isCorrect ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)]" : "bg-[var(--danger)] text-white"}">
              ${isCorrect ? svgIcon("check", "w-5 h-5") : svgIcon("alert", "w-5 h-5")}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-base ${isCorrect ? "text-[var(--accent-primary)]" : "text-[var(--accent-coral)]"}">
                  ${isCorrect ? `Tepat! (+${currentQuiz.lastPointsEarned} pts)` : "Kurang Tepat — Masuk Bank Salah & SRS"}
                </h3>
                ${
                  isCorrect && currentQuiz.currentStreak >= 3
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)]">${multiplier}x Streak</span>`
                    : ""
                }
              </div>
              <p class="text-xs text-[var(--text-secondary)] font-semibold mt-0.5">Kunci Jawaban: Opsi ${letters[q.correctIndex]}</p>
            </div>
          </div>
          <div id="feedback-flag-btn-wrapper">
            ${renderDoubtFlagButtonHtml(q.id, srs.flaggedDoubt)}
          </div>
        </div>

        <!-- Layer 1: Jawaban Benar & Anchor Guideline (Open by default) -->
        <details class="rationale-accordion border-l-4 border-l-[var(--accent-primary)]" open>
          <summary>
            <span class="flex items-center gap-2 text-[var(--accent-primary)]">
              ${svgIcon("check", "w-4 h-4")}
              <span>Rasional Jawaban Benar &amp; Guideline Anchor</span>
            </span>
            <span class="acc-chevron text-[var(--text-muted)] text-xs">▼</span>
          </summary>
          <div class="acc-body space-y-3">
            <p class="text-[var(--text-primary)] font-normal m-0" style="font-size: calc(0.95rem * var(--reading-scale)); line-height: 1.7;">
              ${escapeHtml(q.rationale?.correctExplanation || "")}
            </p>
            ${
              q.rationale?.guidelineAnchor
                ? `<div class="p-3 rounded-lg bg-[var(--bg-surface-subtle)] text-xs border border-[var(--border-subtle)]">
                    <span class="font-bold text-[var(--accent-primary)]">Guideline Anchor: </span>
                    <span class="text-[var(--text-secondary)]">${escapeHtml(q.rationale.guidelineAnchor)}</span>
                  </div>`
                : ""
            }
          </div>
        </details>

        <!-- Layer 2: Clinical Pearl, Red Flags & Patofisiologi -->
        ${
          q.rationale?.clinicalPearl || q.rationale?.redFlags || q.rationale?.red_flags || q.rationale?.pathophysiology || q.rationale?.patofisiologi_singkat
            ? `
              <details class="rationale-accordion">
                <summary>
                  <span class="flex items-center gap-2 text-[var(--accent-secondary)]">
                    ${svgIcon("target", "w-4 h-4")}
                    <span>Clinical Pearl &amp; Patofisiologi</span>
                  </span>
                  <span class="acc-chevron text-[var(--text-muted)] text-xs">▼</span>
                </summary>
                <div class="acc-body space-y-2.5">
                  ${
                    q.rationale?.clinicalPearl
                      ? `
                        <div class="p-3 rounded-lg bg-[var(--accent-secondary-soft)] border border-[var(--accent-secondary-border)] text-[var(--text-primary)]" style="font-size: calc(0.92rem * var(--reading-scale)); line-height: 1.65;">
                          <div class="flex items-center gap-1.5 font-bold text-[var(--accent-secondary)] mb-0.5">
                            ${svgIcon("target", "w-4 h-4")}
                            <span>Board Pearl</span>
                          </div>
                          <p class="m-0 text-[var(--text-secondary)]">${escapeHtml(q.rationale.clinicalPearl)}</p>
                        </div>
                      `
                      : ""
                  }
                  ${renderExtendedRationaleHtml(q)}
                </div>
              </details>
            `
            : ""
        }

        <!-- Layer 3: Analisis Distractor (Jebakan Opsi) -->
        ${
          distractorEntries.length > 0
            ? `
              <details class="rationale-accordion">
                <summary>
                  <span class="flex items-center gap-2 text-[var(--text-secondary)]">
                    ${svgIcon("alert", "w-4 h-4")}
                    <span>Analisis Distraktor (${distractorEntries.length} Opsi Jebakan)</span>
                  </span>
                  <span class="acc-chevron text-[var(--text-muted)] text-xs">▼</span>
                </summary>
                <div class="acc-body space-y-2">
                  ${distractorEntries
                    .map(([idxStr, exp]) => {
                      const idxNum = parseInt(idxStr, 10);
                      const optLabel = (!isNaN(idxNum) && q.options && q.options[idxNum]) ? q.options[idxNum].trim() : "";
                      const expStr = String(exp || "").trim();
                      const startsWithOpt = optLabel && expStr.toLowerCase().startsWith(optLabel.slice(0, Math.min(20, optLabel.length)).toLowerCase());
                      return `<div class="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]" style="font-size: calc(0.9rem * var(--reading-scale)); line-height: 1.6;">${optLabel && !startsWithOpt ? `<strong class="text-[var(--text-primary)]">${escapeHtml(optLabel)} — </strong>` : ""}${escapeHtml(expStr)}</div>`;
                    })
                    .join("")}
                </div>
              </details>
            `
            : ""
        }

        <div class="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onclick="window.InternaApp.prevQuizQuestion()"
            class="btn-duo btn-duo-outline text-xs px-3 py-2 flex items-center gap-1 ${currentQuiz.currentIndex === 0 ? 'opacity-40 pointer-events-none' : ''}"
          >
            ${svgIcon("arrowLeft", "w-3.5 h-3.5")}
            <span>Soal Sebelumnya</span>
          </button>

          <button type="button" onclick="window.InternaApp.nextQuizQuestion()" class="btn-duo btn-duo-primary flex-1 sm:flex-initial min-w-[200px] text-xs sm:text-sm flex items-center justify-center gap-1.5">
            <span>${isLast ? "Selesaikan Sesi" : "Soal Berikutnya"}</span>
            ${svgIcon("arrowRight", "w-4 h-4")}
          </button>
        </div>
      </div>
    `;
  }

  function renderDoubtFlagButtonHtml(qId, isFlagged) {
    return `
      <button onclick="window.InternaApp.toggleDoubtFlag('${qId}')" class="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
        isFlagged ? "bg-amber-600 text-white border-amber-700" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
      }">
        <span>${isFlagged ? "Ditandai Ragu" : "Tandai Ragu"}</span>
        <kbd class="kbd-shortcut ml-0.5 hidden sm:inline">D</kbd>
      </button>
    `;
  }

  function renderQuizFeedbackFlagButton(qId) {
    const wrapper = document.getElementById("feedback-flag-btn-wrapper");
    if (wrapper) wrapper.innerHTML = renderDoubtFlagButtonHtml(qId, getQuestionSRS(qId).flaggedDoubt);
  }

  // =========================================================================
  // 11. QUIZ SUMMARY, BANK SALAH & TAB PROFIL
  // =========================================================================
  function renderQuizSummaryView() {
    const total = currentQuiz.questions.length;
    const correct = currentQuiz.correctCount;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const defaultRank = window.InternaGamification?.getPerformanceRank
      ? window.InternaGamification.getPerformanceRank(accuracy)
      : { rank: accuracy >= 80 ? "A" : accuracy >= 65 ? "B" : "C", label: "Sesi Tuntas", badgeClass: "rank-badge-b", xpBonus: 0 };

    const finalStats = currentQuiz.finalStats || {
      basePoints: currentQuiz.totalPoints || correct * 100,
      bonusXP: 0,
      streakMult: 1.0,
      totalEarnedXP: currentQuiz.totalPoints || correct * 100,
      accuracy,
      rankObj: defaultRank,
      subtopicBreakdown: [],
      isNewPersonalBest: false,
      leveledUp: false,
      tierUpgraded: false,
      prevLevel: { level: 1, tier: 1 },
      newLevel: window.InternaGamification ? window.InternaGamification.getLevelFromXP(state.totalXP) : { level: 1, tier: 1, tierName: "Clinical Clerk" }
    };

    const lvlObj = finalStats.newLevel;
    const rankObj = finalStats.rankObj || defaultRank;
    const showConfetti = accuracy >= 80;
    const confettiColors = ["#0F766E", "#14B8A6", "#D97706", "#2563EB", "#EA580C", "#7C3AED"];
    const confettiDotsHtml = showConfetti
      ? Array.from({ length: 14 }, (_, i) => {
          const left = ((i * 7 + 5) % 92) + 4;
          const delay = ((i % 5) * 0.14).toFixed(2);
          const color = confettiColors[i % confettiColors.length];
          return `<span class="confetti-dot" style="left:${left}%; background:${color}; animation-delay:${delay}s;"></span>`;
        }).join("")
      : "";
    const breakdown = Array.isArray(finalStats.subtopicBreakdown) ? finalStats.subtopicBreakdown : [];

    return `
      <div class="max-w-xl mx-auto px-4 py-8 space-y-6 animate-pop">
        <div class="med-card p-6 sm:p-8 space-y-5 border border-[var(--border-subtle)] text-center ${showConfetti ? "confetti-container" : ""}">
          ${confettiDotsHtml}

          <!-- Rank Badge & Title -->
          <div class="flex flex-col items-center justify-center gap-2.5">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl font-mono ${rankObj.badgeClass}">
              ${escapeHtml(rankObj.rank)}
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]">
                ${escapeHtml(rankObj.label)}
              </span>
              ${
                finalStats.isNewPersonalBest
                  ? `<span class="stamp-personal-best">REKOR BARU</span>`
                  : ""
              }
            </div>
            <h1 class="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">${escapeHtml(currentQuiz.title)}</h1>
            <p class="text-xs font-mono text-[var(--text-muted)]">${correct} dari ${total} soal dijawab benar &bull; Max Streak ${currentQuiz.maxStreak || 0}x</p>
          </div>

          <!-- Newly Unlocked Achievements -->
          ${
            sessionNewAchievements.length > 0
              ? `
                <div class="p-4 rounded-xl border border-[var(--accent-secondary-border)] bg-[var(--accent-secondary-soft)] text-left space-y-2.5">
                  <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-secondary)] flex items-center gap-1.5">
                    ${svgIcon("trophy", "w-4 h-4")}
                    <span>Badge Baru Terbuka (${sessionNewAchievements.length})</span>
                  </div>
                  <div class="grid grid-cols-1 gap-2">
                    ${sessionNewAchievements
                      .map(
                        (ach) => `
                          <div class="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-2.5">
                            <span class="w-8 h-8 rounded-lg bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                              ${svgIcon(ach.icon || "award", "w-4 h-4")}
                            </span>
                            <div class="min-w-0">
                              <div class="text-xs font-bold text-[var(--text-primary)]">${escapeHtml(ach.title)}</div>
                              <div class="text-[11px] text-[var(--text-muted)]">${escapeHtml(ach.desc)}</div>
                            </div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }

          <!-- Promotion Certificate Card if Leveled Up or Tier Upgraded -->
          ${
            finalStats.tierUpgraded || finalStats.leveledUp
              ? `
                <div class="p-4 rounded-xl border-2 border-[var(--accent-secondary)] bg-[var(--accent-secondary-soft)] text-center space-y-1.5 animate-pop">
                  <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-secondary)]">
                    ${finalStats.tierUpgraded ? "PROMOSI CLINICAL TIER BARU!" : "LEVEL UP!"}
                  </div>
                  <div class="font-bold text-lg text-[var(--text-primary)]">
                    Level ${lvlObj.level} — <span class="tier-${lvlObj.tier}">${lvlObj.tierName}</span>
                  </div>
                  <p class="text-xs text-[var(--text-secondary)]">Dedikasi belajar Anda membuka tingkatan kompetensi klinis baru.</p>
                </div>
              `
              : ""
          }

          <!-- Points Breakdown -->
          <div class="grid grid-cols-3 gap-2.5 pt-1">
            <div class="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <div class="text-[11px] text-[var(--text-muted)] font-medium">Akurasi</div>
              <div class="text-xl font-mono font-bold text-[var(--accent-primary)]">${accuracy}%</div>
            </div>
            <div class="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <div class="text-[11px] text-[var(--text-muted)] font-medium">Skor Poin</div>
              <div class="text-xl font-mono font-bold text-[var(--text-primary)]">${finalStats.basePoints}</div>
            </div>
            <div class="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <div class="text-[11px] text-[var(--text-muted)] font-medium">XP Diterima</div>
              <div class="text-xl font-mono font-bold text-[var(--accent-secondary)]">+${finalStats.totalEarnedXP}</div>
            </div>
          </div>

          <!-- XP Flow Progress Bar -->
          <div class="p-4 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2 text-left">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[var(--text-primary)]">Level ${lvlObj.level} (${lvlObj.tierName})</span>
              <span class="font-mono text-[var(--text-muted)]">${lvlObj.currentLevelXP} / ${lvlObj.requiredLevelXP} XP (${lvlObj.progressPct}%)</span>
            </div>
            <div class="duo-progress-track">
              <div class="duo-progress-fill" style="width: ${lvlObj.progressPct}%"></div>
            </div>
            ${
              finalStats.bonusXP > 0
                ? `<div class="text-[11px] text-[var(--accent-primary)] font-mono">Termasuk bonus: +${finalStats.bonusXP} XP (Rank / Daily / Accuracy)</div>`
                : ""
            }
          </div>

          <!-- Per-Subtopic Breakdown -->
          ${
            breakdown.length > 0
              ? `
                <div class="p-4 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2.5 text-left">
                  <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Rincian Penguasaan Topik Sesi Ini</div>
                  <div class="space-y-2">
                    ${breakdown
                      .slice(0, 6)
                      .map((row) => {
                        const rowPct = Math.round((row.correct / row.total) * 100);
                        return `
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                              <span class="font-semibold text-[var(--text-primary)] truncate pr-2">${escapeHtml(row.subtopic)}</span>
                              <span class="font-mono font-bold ${rowPct >= 70 ? "text-[var(--accent-primary)]" : "text-[var(--accent-coral)]"} shrink-0">${row.correct}/${row.total} (${rowPct}%)</span>
                            </div>
                            <div class="w-full h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                              <div class="h-full rounded-full ${rowPct >= 70 ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-coral)]"}" style="width:${Math.max(rowPct, 5)}%"></div>
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }

          <!-- Navigation CTA -->
          <div class="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button type="button" onclick="window.InternaApp.navigate('${currentQuiz.mode === "snack-quiz" || quizOriginView === "tryout" ? "tryout" : quizOriginView === "materi" ? "materi" : "home"}')" class="btn-duo btn-duo-outline flex-1 text-xs py-2.5">
              <span>${currentQuiz.mode === "snack-quiz" || quizOriginView === "tryout" ? "Kembali ke Tab Soal" : quizOriginView === "materi" ? "Kembali ke Materi" : "Kembali ke Home"}</span>
            </button>
            <button type="button" onclick="${currentQuiz.mode === "snack-quiz" ? "window.InternaApp.startSnackQuiz()" : currentQuiz.mode === "weakness" ? "window.InternaApp.startQuizSession('weakness')" : "window.InternaApp.startQuizSession('mixed')"}" class="btn-duo btn-duo-primary flex-1 text-xs py-2.5">
              <span>${currentQuiz.mode === "snack-quiz" ? "Ulang Snack Quiz" : currentQuiz.mode === "weakness" ? "Ulang Sesi Review" : "Lanjut Sesi 10 Soal"}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB PROFIL & PENGATURAN
  // =========================================================================
  function renderProfileView() {
    const allMods = getAllModules();
    const allQ = getAllQuestions();

    // 1. Topics Read Count
    const readMap = state.topicsRead || {};
    let readCount = 0;
    allMods.forEach((m) => {
      if (readMap[m.id] && readMap[m.id].completed) {
        readCount++;
      }
    });
    const totalMods = allMods.length;
    const readPct = totalMods > 0 ? Math.round((readCount / totalMods) * 100) : 0;

    // 2. Questions Answered & Accuracy
    let totalAttempts = 0;
    let totalCorrect = 0;
    allQ.forEach((q) => {
      const s = state.srs[q.id];
      if (s && s.attempts > 0) {
        totalAttempts += s.attempts;
        totalCorrect += s.correct;
      }
    });
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // 3. 100-Level & 8-Tier Clinical Progression
    const lvlObj = window.InternaGamification
      ? window.InternaGamification.getLevelFromXP(state.totalXP)
      : { level: 1, tier: 1, tierName: "Clinical Clerk", currentLevelXP: 0, requiredLevelXP: 1500, progressPct: 0 };

    const leaderboard = state.personalLeaderboard || [];
    const bestScore = state.personalBestScore || 0;
    const bestStreak = state.personalBestStreak || 0;

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-pop">
        <!-- Profile Header Card (Editorial Style) -->
        <div class="med-card p-6 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="relative cursor-pointer group" onclick="window.InternaApp.openProfileModal()" title="Klik untuk ubah avatar & nama">
              <div class="w-16 h-16 rounded-2xl bg-[var(--accent-primary-soft)] border-2 border-[var(--accent-primary)] flex items-center justify-center p-2 shadow-sm transition group-hover:scale-105">
                ${renderProfileAvatarSvg(state.userProfile?.avatarEmoji, "w-11 h-11")}
              </div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--accent-primary)] text-[var(--on-accent-primary)] flex items-center justify-center text-[10px] font-bold">
                ✎
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]">
                  Tier ${lvlObj.tier} — <span class="tier-${lvlObj.tier}">${lvlObj.tierName}</span>
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  Level ${lvlObj.level} / 100
                </span>
              </div>
              <h1 class="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)] mt-1.5 flex items-center gap-2">
                <span>${escapeHtml(state.userProfile?.name || "dr. Residen Interna")}</span>
                <button onclick="window.InternaApp.openProfileModal()" class="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] font-normal font-sans">
                  (Edit)
                </button>
              </h1>
              <p class="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">${escapeHtml(state.userProfile?.title || "Residen Ilmu Penyakit Dalam")} • Pantau akumulasi XP, rekor personal best, dan penguasaan sub-divisi kedokteran.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button type="button" onclick="window.InternaApp.toggleSoundPreference()" class="btn-duo btn-duo-outline text-xs flex items-center gap-1.5">
              ${svgIcon(state.soundEnabled !== false ? "volume" : "volumeOff", "w-3.5 h-3.5")}
              <span>Suara: ${state.soundEnabled !== false ? "Aktif" : "Mati"}</span>
            </button>
            <button onclick="window.InternaApp.openProfileModal()" class="btn-duo btn-duo-primary text-xs flex items-center gap-1.5">
              <span>Ubah Profil & Avatar</span>
            </button>
            <button onclick="window.InternaApp.openLabModal()" class="btn-duo btn-duo-outline text-xs">
              <span>Nilai Lab</span>
            </button>
          </div>
        </div>

        <!-- Koleksi Badge (Collapsible) -->
        <details class="med-card p-5 sm:p-6 border border-[var(--border-subtle)] group">
          <summary class="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
            <div>
              <h2 class="font-bold text-base text-[var(--text-primary)]">Badge</h2>
              <p class="text-xs text-[var(--text-secondary)]">Pencapaian otomatis dari konsistensi, streak, akurasi, dan penguasaan divisi.</p>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <span class="text-xs font-mono font-bold text-[var(--accent-primary)]">
                ${(state.unlockedAchievements || []).length} / ${(window.InternaGamification?.CLINICAL_ACHIEVEMENTS || []).length} Terbuka
              </span>
              <span class="w-7 h-7 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] transition-transform group-open:rotate-180">
                ${svgIcon("chevronDown", "w-4 h-4")}
              </span>
            </div>
          </summary>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-4 border-t border-[var(--border-subtle)]">
            ${(window.InternaGamification?.CLINICAL_ACHIEVEMENTS || [])
              .map((ach) => {
                const isUnlocked = Array.isArray(state.unlockedAchievements) && state.unlockedAchievements.includes(ach.id);
                return `
                  <div class="p-3.5 rounded-xl border transition space-y-2 ${
                    isUnlocked
                      ? "bg-[var(--tint-teal-bg)] border-[var(--tint-teal-border)]"
                      : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] opacity-60"
                  }">
                    <div class="flex items-center justify-between">
                      <span class="w-8 h-8 rounded-lg flex items-center justify-center ${
                        isUnlocked
                          ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)]"
                          : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                      }">
                        ${svgIcon(ach.icon || "award", "w-4 h-4")}
                      </span>
                      <span class="text-[10px] font-mono font-bold ${isUnlocked ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}">
                        ${isUnlocked ? "TERBUKA" : "TERKUNCI"}
                      </span>
                    </div>
                    <div>
                      <div class="text-xs font-bold text-[var(--text-primary)]">${escapeHtml(ach.title)}</div>
                      <div class="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">${escapeHtml(ach.desc)}</div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </details>

        <!-- Level & Tier Progression (Collapsible) -->
        ${(() => {
          const allTiers = window.InternaGamification?.CLINICAL_TIERS || [];
          const totalTiers = allTiers.length || 8;
          const curTierObj = allTiers.find((t) => t.tier === lvlObj.tier) || { minLevel: 1, maxLevel: 9 };
          const nextTierObj = allTiers.find((t) => t.tier === lvlObj.tier + 1);
          const tierSpan = Math.max(1, (curTierObj.maxLevel - curTierObj.minLevel) + 1);
          const tierDone = Math.max(1, (lvlObj.level - curTierObj.minLevel) + 1);
          const tierPct = lvlObj.tier >= totalTiers ? 100 : Math.min(100, Math.round((tierDone / tierSpan) * 100));
          return `
            <details class="med-card p-5 sm:p-6 border border-[var(--border-subtle)] group" open>
              <summary class="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
                <div>
                  <h2 class="font-bold text-base text-[var(--text-primary)]">Progres Level &amp; Tier (${totalTiers} Tier Klinis)</h2>
                  <p class="text-xs text-[var(--text-secondary)]">Level ${lvlObj.level} &bull; Tier ${lvlObj.tier} dari ${totalTiers} (${escapeHtml(lvlObj.tierName)})</p>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                  <span class="text-xs font-mono font-bold text-[var(--accent-primary)]">Tier ${lvlObj.tier}/${totalTiers}</span>
                  <span class="w-7 h-7 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    ${svgIcon("chevronDown", "w-4 h-4")}
                  </span>
                </div>
              </summary>
              <div class="space-y-4 pt-4 mt-4 border-t border-[var(--border-subtle)]">
                <!-- Level Progress -->
                <div class="space-y-1.5">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span class="font-semibold text-[var(--text-primary)]">Progres Menuju Level ${Math.min(100, lvlObj.level + 1)}</span>
                    <span class="font-mono text-[var(--text-muted)]">${lvlObj.currentLevelXP.toLocaleString("id-ID")} / ${lvlObj.requiredLevelXP.toLocaleString("id-ID")} XP (${lvlObj.progressPct}%)</span>
                  </div>
                  <div class="duo-progress-track">
                    <div class="duo-progress-fill" style="width: ${lvlObj.progressPct}%"></div>
                  </div>
                </div>
                <!-- Tier Progress -->
                <div class="space-y-1.5">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span class="font-semibold text-[var(--text-primary)]">Progres Tier ${lvlObj.tier} &rarr; ${nextTierObj ? `Tier ${nextTierObj.tier} (${escapeHtml(nextTierObj.name)})` : "Tier Maksimal"}</span>
                    <span class="font-mono text-[var(--text-muted)]">Level ${lvlObj.level} / ${curTierObj.maxLevel} (${tierPct}%)</span>
                  </div>
                  <div class="duo-progress-track">
                    <div class="duo-progress-fill" style="width: ${tierPct}%"></div>
                  </div>
                </div>
                <!-- All 8 Tiers Overview -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  ${allTiers.map((t) => {
                    const isCurrent = t.tier === lvlObj.tier;
                    const isPassed = t.tier < lvlObj.tier;
                    return `
                      <div class="p-2.5 rounded-xl border text-xs ${
                        isCurrent
                          ? "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)]"
                          : isPassed
                            ? "bg-[var(--bg-surface)] border-[var(--border-strong)]"
                            : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] opacity-60"
                      }">
                        <div class="flex items-center justify-between font-mono text-[10px] font-bold ${isCurrent ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}">
                          <span>TIER ${t.tier}</span>
                          <span>Lv ${t.minLevel}–${t.maxLevel}</span>
                        </div>
                        <div class="font-bold text-[var(--text-primary)] truncate mt-0.5">${escapeHtml(t.name)}</div>
                      </div>
                    `;
                  }).join("")}
                </div>
                <div class="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono pt-1">
                  <span>Total Akumulasi: <strong>${(state.totalXP || 0).toLocaleString("id-ID")} XP</strong></span>
                  <span>Target Harian: <strong>${state.dailyXP} / ${state.dailyGoalXP} XP</strong></span>
                </div>
              </div>
            </details>
          `;
        })()}

        <!-- 4 Key Stat Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <!-- Streak -->
          <div class="med-card p-4 space-y-1.5 border border-[var(--border-subtle)]">
            <div class="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wide">Streak Belajar</div>
            <div class="text-2xl font-mono font-bold text-[var(--text-primary)]">${state.streakDays} Hari</div>
            <div class="text-[11px] text-[var(--accent-primary)] font-semibold">Aktif berturut-turut</div>
          </div>

          <!-- Personal Best -->
          <div class="med-card p-4 space-y-1.5 border border-[var(--border-subtle)]">
            <div class="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wide">Personal Best</div>
            <div class="text-2xl font-mono font-bold text-[var(--accent-secondary)]">${bestScore} pts</div>
            <div class="text-[11px] text-[var(--text-muted)] font-mono">Max Streak: ${bestStreak}</div>
          </div>

          <!-- Soal Dikerjakan -->
          <div class="med-card p-4 space-y-1.5 border border-[var(--border-subtle)]">
            <div class="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wide">Soal Dikerjakan</div>
            <div class="text-2xl font-mono font-bold text-[var(--text-primary)]">${totalAttempts} Soal</div>
            <div class="text-[11px] text-[var(--accent-primary)] font-semibold">Akurasi ${accuracy}%</div>
          </div>

          <!-- Topik Dibaca -->
          <div class="med-card p-4 space-y-1.5 border border-[var(--border-subtle)]">
            <div class="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wide">Materi Dibaca</div>
            <div class="text-2xl font-mono font-bold text-[var(--text-primary)]">${readCount} / ${totalMods}</div>
            <div class="text-[11px] text-[var(--text-muted)] font-semibold">${readPct}% Topik Selesai</div>
          </div>
        </div>

        <!-- Personal Best Leaderboard Table -->
        <div class="med-card p-5 sm:p-6 space-y-4 border border-[var(--border-subtle)]">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 class="font-serif font-bold text-base text-[var(--text-primary)]">Personal Best Leaderboard (Top 10 Runs)</h2>
              <p class="text-xs text-[var(--text-secondary)]">Riwayat 10 performa kuis terbaik yang tersimpan permanen.</p>
            </div>
            <span class="text-xs font-mono font-bold text-[var(--accent-secondary)]">Rekor Tertinggi: ${bestScore} pts</span>
          </div>

          ${
            leaderboard.length === 0
              ? `<div class="p-6 text-center text-xs text-[var(--text-muted)] font-medium">Belum ada riwayat kuis tersimpan. Selesaikan 1 sesi kuis untuk mencatat rekor pertama Anda!</div>`
              : `
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-[11px]">
                        <th class="py-2 px-2 font-bold">#</th>
                        <th class="py-2 px-2 font-bold">Tanggal</th>
                        <th class="py-2 px-2 font-bold">Divisi</th>
                        <th class="py-2 px-2 font-bold text-right">Skor Poin</th>
                        <th class="py-2 px-2 font-bold text-right">XP Earned</th>
                        <th class="py-2 px-2 font-bold text-center">Akurasi</th>
                        <th class="py-2 px-2 font-bold text-center">Max Streak</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--border-subtle)] font-mono">
                      ${leaderboard
                        .map((run, idx) => {
                          const isTop = idx === 0 && run.score === bestScore;
                          return `
                            <tr class="hover:bg-[var(--bg-surface-subtle)] transition ${isTop ? "bg-[var(--accent-secondary-soft)] font-bold" : ""}">
                              <td class="py-2.5 px-2 text-[var(--text-muted)]">${idx + 1} ${isTop ? "🏆" : ""}</td>
                              <td class="py-2.5 px-2 text-[var(--text-secondary)] font-sans">${run.date}</td>
                              <td class="py-2.5 px-2 text-[var(--text-primary)] font-sans font-medium">${escapeHtml(run.divisionName)}</td>
                              <td class="py-2.5 px-2 text-right font-bold text-[var(--text-primary)]">${run.score} pts</td>
                              <td class="py-2.5 px-2 text-right text-[var(--accent-primary)] font-bold">+${run.xpEarned}</td>
                              <td class="py-2.5 px-2 text-center text-[var(--text-secondary)]">${run.accuracy}%</td>
                              <td class="py-2.5 px-2 text-center text-[var(--accent-secondary)]">${run.maxStreak}x</td>
                            </tr>
                          `;
                        })
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>

        <!-- Division Mastery Sub-Tracks -->
        <div class="med-card p-5 sm:p-6 space-y-4 border border-[var(--border-subtle)]">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 class="font-serif font-bold text-base text-[var(--text-primary)]">Division Mastery Sub-Tracks</h2>
              <p class="text-xs text-[var(--text-secondary)]">Akumulasi penguasaan per spesialisasi (Target: 50.000 XP per divisi).</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${window.INTERNA_DATA.divisions
              .map((div) => {
                const divXp = (state.divisionXP && state.divisionXP[div.id]) || 0;
                const divPct = Math.min(100, Math.round((divXp / 50000) * 100));
                const isFellow = divXp >= 15000;

                return `
                  <div class="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-serif font-bold text-xs text-[var(--text-primary)]">${escapeHtml(div.name)}</span>
                      ${
                        isFellow
                          ? `<span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]">${div.shortName} Fellow</span>`
                          : `<span class="text-[10px] font-mono text-[var(--text-muted)]">${divPct}%</span>`
                      }
                    </div>
                    <div class="duo-progress-track">
                      <div class="duo-progress-fill" style="width: ${divPct}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                      <span>${divXp.toLocaleString("id-ID")} / 50.000 XP</span>
                      <span>${div.status === "active" ? "Divisi Aktif" : "Segera Hadir"}</span>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- Preferensi & Opsi Data -->
        <div class="med-card p-5 border border-[var(--border-subtle)] space-y-4">
          <h3 class="font-serif text-sm font-bold text-[var(--text-primary)]">Pengaturan &amp; Preferensi</h3>
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <div class="text-xs font-bold text-[var(--text-primary)]">Ukuran Teks Bacaan</div>
              <div class="text-[11px] text-[var(--text-muted)]">Sesuaikan ukuran vignette, opsi soal, dan materi bacaan.</div>
            </div>
            ${renderFontSizeStepperHtml()}
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <div class="text-xs font-bold text-[var(--text-primary)]">Tampilan Tema</div>
              <div class="text-[11px] text-[var(--text-muted)]">Pilih mode terang, gelap, atau ikuti sistem.</div>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="window.InternaApp.setThemePreference('light')" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition ${state.themePreference === 'light' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}">Terang</button>
              <button type="button" onclick="window.InternaApp.setThemePreference('dark')" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition ${state.themePreference === 'dark' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}">Gelap</button>
              <button type="button" onclick="window.InternaApp.setThemePreference('system')" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition ${state.themePreference === 'system' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}">Sistem</button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <div class="text-xs font-bold text-[var(--accent-coral)]">Atur Ulang Riwayat Belajar</div>
              <div class="text-[11px] text-[var(--text-muted)]">Hapus riwayat soal, streak, dan materi dibaca untuk memulai dari awal.</div>
            </div>
            <button onclick="window.InternaApp.resetAllProgress()" class="btn-duo btn-duo-danger text-xs py-1.5 px-3">
              Reset Riwayat
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 12. LAB NORMAL VALUES MODAL
  // =========================================================================
  // =========================================================================
  // PROFILE & AVATAR CUSTOMIZATION CONTROLLER (12 Original Clinical SVGs)
  // =========================================================================
  const AVATAR_OPTIONS = [
    "stethoscope",
    "ecg",
    "mascot",
    "heart",
    "lungs",
    "kidney",
    "dna",
    "microscope",
    "thyroid",
    "rx",
    "coffee",
    "shield"
  ];

  const LEGACY_EMOJI_TO_AVATAR = {
    "🩺": "stethoscope",
    "🥼": "shield",
    "💉": "rx",
    "🫀": "heart",
    "🦠": "microscope",
    "💊": "rx",
    "🧠": "dna",
    "⚡": "ecg",
    "☕": "coffee",
    "🔬": "microscope",
    "📋": "mascot",
    "🏥": "lungs"
  };

  function resolveAvatarId(raw) {
    if (!raw) return "stethoscope";
    if (AVATAR_OPTIONS.includes(raw)) return raw;
    return LEGACY_EMOJI_TO_AVATAR[raw] || "stethoscope";
  }

  function renderProfileAvatarSvg(rawId, cls = "w-8 h-8") {
    const id = resolveAvatarId(rawId);
    if (id === "mascot") {
      return renderInternaSnackLogoSvg(cls);
    }
    const specs = {
      stethoscope: {
        bg: "var(--accent-primary-soft)",
        fg: "var(--accent-primary)",
        body: `<path d="M9 5v5a5 5 0 0010 0V5M9 5H7.5M19 5h1.5M14 15v2.5a3.5 3.5 0 007 0V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="12" r="2" fill="currentColor"/>`
      },
      ecg: {
        bg: "var(--accent-coral-soft)",
        fg: "var(--accent-coral)",
        body: `<path d="M3 14h4l2.2-6 3.6 12 2.7-8.5 1.8 2.5H25" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
      },
      heart: {
        bg: "var(--accent-coral-soft)",
        fg: "var(--accent-coral)",
        body: `<path d="M14 23.5s-7.5-4.7-7.5-10.2C6.5 10.3 8.8 8 11.4 8c1.6 0 2.6.8 2.6 1.8 0-1 1-1.8 2.6-1.8 2.6 0 4.9 2.3 4.9 5.3 0 5.5-7.5 10.2-7.5 10.2z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12.5 5.5v3M15.5 6.2l-1 2.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
      },
      lungs: {
        bg: "var(--viz-blue-soft)",
        fg: "var(--viz-blue)",
        body: `<path d="M14 5.5V12M14 12l-2.5 2.2M14 12l2.5 2.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12.2 10.5C9.2 10.5 6 13.5 5.5 18.8c-.3 2.7 1.4 4.4 3.7 4 1.7-.3 2.8-1.6 3-3.2v-9.1zM15.8 10.5c3 0 6.2 3 6.7 8.3.3 2.7-1.4 4.4-3.7 4-1.7-.3-2.8-1.6-3-3.2v-9.1z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`
      },
      kidney: {
        bg: "var(--viz-purple-soft)",
        fg: "var(--viz-purple)",
        body: `<path d="M10.5 7.5c-3 0-5 2.5-5 6.5s2 6.5 5 6.5c1.6 0 2.5-1 2.5-2.4 0-1.2-1-2-1-4.1s1-2.9 1-4.1c0-1.4-.9-2.4-2.5-2.4zM17.5 7.5c3 0 5 2.5 5 6.5s-2 6.5-5 6.5c-1.6 0-2.5-1-2.5-2.4 0-1.2 1-2 1-4.1s-1-2.9-1-4.1c0-1.4.9-2.4 2.5-2.4z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`
      },
      dna: {
        bg: "var(--viz-purple-soft)",
        fg: "var(--viz-purple)",
        body: `<path d="M9 6c0 4 10 4 10 8s-10 4-10 8M19 6c0 4-10 4-10 8s10 4 10 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.5 9h7M10.5 19h7M11.8 14h4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`
      },
      microscope: {
        bg: "var(--viz-green-soft)",
        fg: "var(--viz-green)",
        body: `<path d="M10 22h10M15 18v4M11 8l4-2.5 3 4.8-4 2.5-3-4.8zM16.5 11.5a5.5 5.5 0 01-2.5 9.5M8.5 17h6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
      },
      thyroid: {
        bg: "var(--accent-secondary-soft)",
        fg: "var(--accent-secondary)",
        body: `<path d="M14 6v16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.45"/><path d="M12.2 12.5c-2.8-2.2-6-1.2-6 2.5s3.2 4.8 6 2.5h3.6c2.8 2.3 6 1.2 6-2.5s-3.2-4.7-6-2.5h-3.6z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`
      },
      rx: {
        bg: "var(--accent-primary-soft)",
        fg: "var(--accent-primary)",
        body: `<path d="M8 19V7h4.5a3.2 3.2 0 010 6.4H8m4.2 0L19 21m0-5.5l-4.5 5.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`
      },
      coffee: {
        bg: "var(--accent-secondary-soft)",
        fg: "var(--accent-secondary)",
        body: `<path d="M7.5 11.5h10v5.5a4.5 4.5 0 01-4.5 4.5h-1a4.5 4.5 0 01-4.5-4.5v-5.5zM17.5 12.5h1.8a2.2 2.2 0 010 4.4h-1.8M10.5 7.5c0-1 1-1.5 1-2.5M14.5 7.5c0-1 1-1.5 1-2.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
      },
      shield: {
        bg: "var(--bg-surface-subtle)",
        fg: "var(--text-primary)",
        body: `<path d="M14 5.5l7.5 3.2v5.5c0 4.6-3.2 7.8-7.5 9.3-4.3-1.5-7.5-4.7-7.5-9.3V8.7L14 5.5z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M14 10.5v6M11 13.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
      }
    };
    const s = specs[id] || specs.stethoscope;
    return `
      <svg class="${cls} shrink-0" viewBox="0 0 28 28" fill="none" aria-hidden="true" style="color:${s.fg};">
        <rect x="1" y="1" width="26" height="26" rx="8" fill="${s.bg}" />
        ${s.body}
      </svg>
    `;
  }

  function renderDivisionIconSvg(divId, cls = "w-5 h-5") {
    const map = {
      "tropik-infeksi": { bg: "var(--viz-green-soft)", fg: "var(--viz-green)", body: `<circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M17.7 6.3l-1.8 1.8M8.1 15.9l-1.8 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>` },
      "kardiologi": { bg: "var(--accent-coral-soft)", fg: "var(--accent-coral)", body: `<path d="M12 19.5s-6.5-4-6.5-8.8C5.5 8.1 7.4 6.2 9.6 6.2c1.3 0 2.1.6 2.4 1.4.3-.8 1.1-1.4 2.4-1.4 2.2 0 4.1 1.9 4.1 4.5 0 4.8-6.5 8.8-6.5 8.8z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>` },
      "pulmonologi": { bg: "var(--viz-blue-soft)", fg: "var(--viz-blue)", body: `<path d="M12 5v5.5M12 10.5l-2 1.8M12 10.5l2 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M10.4 9.5C7.9 9.5 5.2 12 4.8 16.4c-.2 2.2 1.1 3.6 3 3.3 1.4-.3 2.4-1.3 2.6-2.7V9.5zM13.6 9.5c2.5 0 5.2 2.5 5.6 6.9.2 2.2-1.1 3.6-3 3.3-1.4-.3-2.4-1.3-2.6-2.7V9.5z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>` },
      "gastroenterohepatologi": { bg: "var(--accent-secondary-soft)", fg: "var(--accent-secondary)", body: `<path d="M13 5.5v3.5c2.5 0 4.5 1.8 4.5 4.3 0 2.7-2.2 4.7-5 4.7-2.2 0-3.5-1.1-4.2-2.2-.6-.9-.2-2 .8-2.3 1-.3 1.9-1.1 1.9-2.2V5.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` },
      "ginjal-hipertensi": { bg: "var(--viz-purple-soft)", fg: "var(--viz-purple)", body: `<path d="M9 6.5c-2.5 0-4.2 2.1-4.2 5.5s1.7 5.5 4.2 5.5c1.3 0 2.1-.8 2.1-2 0-1-.8-1.7-.8-3.5s.8-2.5.8-3.5c0-1.2-.8-2-2.1-2zM15 6.5c2.5 0 4.2 2.1 4.2 5.5s-1.7 5.5-4.2 5.5c-1.3 0-2.1-.8-2.1-2 0-1 .8-1.7.8-3.5s-.8-2.5-.8-3.5c0-1.2.8-2 2.1-2z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>` },
      "endokrin-metabolik": { bg: "var(--accent-primary-soft)", fg: "var(--accent-primary)", body: `<path d="M5.5 14.5c0-2.1 1.6-3.6 3.8-3.6 1.5 0 3.2-.6 5.2-1.8 1.4-.9 3.2-1.3 4.2-.5.9.7.6 2.1-.6 3.1-1.3 1.1-3.1 2-5.1 2.7-1.6.6-2.9 1.6-4.2 2.1-1.8.7-3.3-.2-3.3-2z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 14.2c2.5-.5 5.4-1.5 8.2-3.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.65"/>` },
      "hematologi-onkologi": { bg: "var(--accent-coral-soft)", fg: "var(--accent-coral)", body: `<ellipse cx="12" cy="12" rx="7" ry="5.5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="3.1" ry="2.1" stroke="currentColor" stroke-width="1.3" opacity="0.72"/>` },
      "reumatologi": { bg: "var(--viz-purple-soft)", fg: "var(--viz-purple)", body: `<path d="M7 6.5l2.5 2.5a2.2 2.2 0 01-3 3L4 9.5M17 17.5l-2.5-2.5a2.2 2.2 0 013-3l2.5 2.5" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>` },
      "geriatri": { bg: "var(--accent-secondary-soft)", fg: "var(--accent-secondary)", body: `<circle cx="12" cy="6.5" r="2.2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.7"/><path d="M9.5 11.2c1.2-.8 3.2-.8 4.4 0l1.6 3.3M11.2 11.2v4.6l-2.2 3.7M11.2 15.8l2.2 3.7M16.5 13.5v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` },
      "alergi-imunologi": { bg: "var(--viz-green-soft)", fg: "var(--viz-green)", body: `<path d="M12 4.5l6.5 3.2v4.8c0 4.2-2.8 7.5-6.5 9-3.7-1.5-6.5-4.8-6.5-9V7.7L12 4.5z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8.5v4.2M12 12.7l-2.3 2.3M12 12.7l2.3 2.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>` },
      "psikosomatik-paliatif": { bg: "var(--accent-primary-soft)", fg: "var(--accent-primary)", body: `<path d="M9.5 6.5a3.5 3.5 0 00-3.5 3.5c0 1.2.6 2.2 1.5 2.8A3 3 0 009 18h6a3 3 0 001.5-5.2c.9-.6 1.5-1.6 1.5-2.8a3.5 3.5 0 00-3.5-3.5c-.9 0-1.8.4-2.5 1-.7-.6-1.6-1-2.5-1z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.5v6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` }
    };
    const d = map[divId] || { bg: "var(--bg-surface-subtle)", fg: "var(--accent-primary)", body: `<path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` };
    return `<span class="inline-flex items-center justify-center rounded-lg shrink-0 ${cls}" style="background:${d.bg};color:${d.fg};"><svg class="w-4/5 h-4/5" viewBox="0 0 24 24" fill="none" aria-hidden="true">${d.body}</svg></span>`;
  }

  function openProfileModal() {
    const modal = document.getElementById("profile-modal");
    if (!modal) return;
    const prof = state.userProfile || { name: "dr. Residen Interna", title: "Residen Ilmu Penyakit Dalam", avatarEmoji: "stethoscope" };
    const currentAvatar = resolveAvatarId(prof.avatarEmoji);
    modal.classList.remove("hidden");

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="med-card max-w-md w-full p-6 space-y-5 animate-pop border border-[var(--border-subtle)]">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div class="flex items-center gap-2.5">
              ${renderProfileAvatarSvg(currentAvatar, "w-7 h-7")}
              <h3 class="font-serif font-bold text-base text-[var(--text-primary)]">Edit Profil Klinis</h3>
            </div>
            <button onclick="window.InternaApp.closeProfileModal()" class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm bg-[var(--bg-surface-subtle)]">✕</button>
          </div>

          <!-- Original Clinical SVG Avatar Selector -->
          <div class="space-y-2">
            <label class="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Pilih Avatar Klinis:</label>
            <div class="grid grid-cols-6 gap-2">
              ${AVATAR_OPTIONS.map((avId) => `
                <button
                  type="button"
                  onclick="window.InternaApp.selectProfileAvatar('${avId}')"
                  class="w-12 h-12 rounded-xl p-1.5 flex items-center justify-center transition border ${
                    currentAvatar === avId
                      ? "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]"
                      : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }"
                >
                  ${renderProfileAvatarSvg(avId, "w-8 h-8")}
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Name & Title Inputs -->
          <div class="space-y-3">
            <div class="space-y-1">
              <label for="profile-name-input" class="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Nama / Gelar:</label>
              <input
                type="text"
                id="profile-name-input"
                value="${escapeHtml(prof.name || '')}"
                placeholder="Contoh: dr. Kevin, Sp.PD / Dokter Muda"
                class="w-full px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div class="space-y-1">
              <label for="profile-title-input" class="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Institusi / Peran:</label>
              <input
                type="text"
                id="profile-title-input"
                value="${escapeHtml(prof.title || '')}"
                placeholder="Contoh: Residen Ilmu Penyakit Dalam / FK UNPAD"
                class="w-full px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          <!-- Save Button -->
          <div class="pt-2 flex items-center gap-2">
            <button
              onclick="window.InternaApp.saveProfileFromModal()"
              class="btn-duo btn-duo-primary flex-1 text-xs py-2.5 font-bold"
            >
              Simpan Profil
            </button>
            <button
              onclick="window.InternaApp.closeProfileModal()"
              class="btn-duo btn-duo-outline text-xs py-2.5 px-4"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function closeProfileModal() {
    const modal = document.getElementById("profile-modal");
    if (modal) modal.classList.add("hidden");
  }

  function selectProfileAvatar(avatarId) {
    if (!state.userProfile) state.userProfile = { name: "dr. Residen", title: "", avatarEmoji: "stethoscope" };
    state.userProfile.avatarEmoji = resolveAvatarId(avatarId);
    openProfileModal();
  }

  function saveProfileFromModal() {
    const nameInput = document.getElementById("profile-name-input");
    const titleInput = document.getElementById("profile-title-input");
    if (!state.userProfile) state.userProfile = { name: "dr. Residen", title: "", avatarEmoji: "stethoscope" };
    if (nameInput) state.userProfile.name = nameInput.value.trim() || "dr. Residen Interna";
    if (titleInput) state.userProfile.title = titleInput.value.trim() || "Residen Ilmu Penyakit Dalam";
    saveState();
    closeProfileModal();
    renderApp();
    showToast("Profil klinis berhasil diperbarui!", "success");
  }

  function openLabModal() {
    const modal = document.getElementById("lab-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="med-card max-w-lg w-full p-5 space-y-3 animate-pop max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-2 border-b">
            <h3 class="font-extrabold text-base">Nilai Normal Lab Dewasa</h3>
            <button onclick="document.getElementById('lab-modal').classList.add('hidden')" class="font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">✕</button>
          </div>
          <div class="divide-y text-xs">
            ${window.INTERNA_DATA.labReference
              .map(
                (item) => `
                  <div class="py-2 flex items-center justify-between">
                    <div>
                      <span class="text-[10px] uppercase text-teal-700 dark:text-teal-300 font-bold block">${item.group}</span>
                      <span class="font-bold">${item.name}</span>
                    </div>
                    <span class="font-mono text-slate-700 dark:text-slate-300">${item.value}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 12B. DAFTAR ISI (TABLE OF CONTENTS) & SEARCH CONTROLLER
  // =========================================================================
  function setTopicSearch(val) {
    state.topicSearchQuery = val;
    renderApp();
    const inp = document.getElementById("topic-search-input");
    if (inp && typeof inp.focus === "function") {
      inp.focus();
      if (typeof inp.setSelectionRange === "function" && typeof inp.value === "string") {
        const len = inp.value.length;
        inp.setSelectionRange(len, len);
      }
    }
  }

  function clearTopicSearch() {
    state.topicSearchQuery = "";
    renderApp();
  }

  function toggleTocModal(show) {
    const modal = document.getElementById("toc-modal");
    if (!modal) return;
    const isHidden = modal.classList.contains("hidden");
    const willOpen = show !== undefined ? show : isHidden;
    if (!willOpen) {
      modal.classList.add("hidden");
      return;
    }

    modal.classList.remove("hidden");
    renderTocModalContent();

    setTimeout(() => {
      const inp = document.getElementById("toc-filter-input");
      if (inp && typeof inp.focus === "function") inp.focus();
    }, 50);
  }

  function renderTocModalContent() {
    const modal = document.getElementById("toc-modal");
    if (!modal) return;

    const allMods = getAllModules();
    const readMap = state.topicsRead || {};
    const divFilter = state.tocDivisionFilter || "all";
    const statusFilter = state.tocStatusFilter || "all";
    const searchVal = (document.getElementById("toc-filter-input")?.value || "").trim().toLowerCase();

    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );

    const filtered = allMods.filter((mod) => {
      const modDiv = mod.divisionId || "tropik-infeksi";
      if (divFilter !== "all" && modDiv !== divFilter) return false;

      const isRead = readMap[mod.id] && readMap[mod.id].completed;
      if (statusFilter === "read" && !isRead) return false;
      if (statusFilter === "unread" && isRead) return false;

      if (searchVal) {
        const titleMatch = (mod.title || "").toLowerCase().includes(searchVal);
        const divName = (getDivisionMeta(modDiv)?.name || getDivisionShortLabel(modDiv) || "").toLowerCase();
        const divMatch = `${divName} ${getDivisionShortLabel(modDiv).toLowerCase()}`.includes(searchVal);
        if (!titleMatch && !divMatch) return false;
      }
      return true;
    });

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div class="med-card max-w-2xl w-full p-5 space-y-4 animate-pop max-h-[88vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 class="font-serif font-bold text-base text-[var(--text-primary)]">Daftar Isi Modul Interna Snack</h3>
              <p class="text-xs text-[var(--text-muted)]">${allMods.length} Topik Terstruktur Penyakit Dalam</p>
            </div>
            <button onclick="window.InternaApp.toggleTocModal(false)" class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">✕</button>
          </div>

          <!-- Controls: Division Toggle & Status Filter -->
          <div class="space-y-2">
            <!-- Division Toggle Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span class="text-[11px] font-mono text-[var(--text-muted)] mr-1 shrink-0">Divisi:</span>
              <button
                type="button"
                onclick="window.InternaApp.setTocDivisionFilter('all')"
                class="px-2.5 py-1 rounded text-xs font-semibold shrink-0 transition ${divFilter === 'all' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}"
              >
                Semua (${allMods.length})
              </button>
              ${activeDivisions
                .map((div) => {
                  const divCount = allMods.filter((m) => (m.divisionId || "tropik-infeksi") === div.id).length;
                  return `
                    <button
                      type="button"
                      onclick="window.InternaApp.setTocDivisionFilter('${div.id}')"
                      class="px-2.5 py-1 rounded text-xs font-semibold shrink-0 transition ${divFilter === div.id ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}"
                    >
                      ${escapeHtml(div.shortName || div.name)} (${divCount})
                    </button>
                  `;
                })
                .join("")}
            </div>

            <!-- Status Filter & Search Input -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="relative flex-1">
                <input
                  type="text"
                  id="toc-filter-input"
                  value="${escapeHtml(searchVal)}"
                  oninput="window.InternaApp.filterTocList(this.value)"
                  placeholder="Cari dalam daftar isi..."
                  class="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                <svg class="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onclick="window.InternaApp.setTocStatusFilter('all')"
                  class="px-2 py-1 rounded text-[11px] font-medium transition ${statusFilter === 'all' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}"
                >
                  Semua
                </button>
                <button
                  type="button"
                  onclick="window.InternaApp.setTocStatusFilter('read')"
                  class="px-2 py-1 rounded text-[11px] font-medium transition ${statusFilter === 'read' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}"
                >
                  Dibaca
                </button>
                <button
                  type="button"
                  onclick="window.InternaApp.setTocStatusFilter('unread')"
                  class="px-2 py-1 rounded text-[11px] font-medium transition ${statusFilter === 'unread' ? 'bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-bold' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}"
                >
                  Belum
                </button>
              </div>
            </div>
          </div>

          <!-- Scrollable Topic List -->
          <div id="toc-list-container" class="overflow-y-auto space-y-1.5 pr-1 flex-1 text-xs divide-y divide-[var(--border-subtle)]">
            ${
              filtered.length === 0
                ? `<div class="p-6 text-center text-xs text-[var(--text-muted)]">Tidak ada topik yang sesuai dengan filter atau pencarian.</div>`
                : filtered
                    .map((mod, idx) => {
                      const isRead = readMap[mod.id] && readMap[mod.id].completed;
                      const compLevel = (mod.competencyLevel || mod.kkiLevel || "Tingkat 4").replace("Tingkat ", "KKI ");
                      const divShort = getDivisionShortLabel(mod.divisionId || "tropik-infeksi");
                      const disp = getModuleDisplayTitles(mod);
                      return `
                        <div class="toc-item pt-2 pb-1.5 flex items-center justify-between gap-2 hover:bg-[var(--bg-surface-subtle)] px-2 rounded-lg transition" data-title="${escapeHtml((mod.title + ' ' + disp.title + ' ' + disp.subtitle + ' ' + divShort).toLowerCase())}">
                          <div class="flex items-center gap-2 min-w-0 cursor-pointer flex-1" onclick="window.InternaApp.jumpToTopic('${escapeHtml(mod.id)}')">
                            <span class="font-mono font-bold text-[var(--text-muted)] text-[11px] w-6 shrink-0 text-right">${String(idx + 1).padStart(2, "0")}</span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">${escapeHtml(divShort)}</span>
                            <span class="badge-kki ${compLevel.includes('4') ? 'badge-kki-4' : 'badge-kki-3b'} shrink-0 text-[10px] py-0 px-1.5 font-mono">
                              ${escapeHtml(compLevel)}
                            </span>
                            <div class="min-w-0 flex-1">
                              <div class="font-semibold text-[var(--text-primary)] truncate hover:text-[var(--accent-primary)]" title="${escapeHtml(disp.fullTitle)}">
                                ${escapeHtml(disp.title)}
                              </div>
                              ${disp.subtitle ? `<div class="text-[11px] text-[var(--text-muted)] truncate">${escapeHtml(disp.subtitle)}</div>` : ""}
                            </div>
                            ${
                              isRead
                                ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)] shrink-0">Selesai</span>`
                                : `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0">Belum</span>`
                            }
                          </div>
                          <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="window.InternaApp.openMaterialCarousel('${mod.id}'); window.InternaApp.toggleTocModal(false);" class="px-2 py-1 rounded text-[11px] font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]">
                              Materi
                            </button>
                            <button type="button" onclick="window.InternaApp.startQuizSession('module', '${mod.id}'); window.InternaApp.toggleTocModal(false);" class="px-2 py-1 rounded text-[11px] font-bold bg-[var(--accent-primary)] text-[var(--on-accent-primary)] hover:opacity-90">
                              Kuis
                            </button>
                          </div>
                        </div>
                      `;
                    })
                    .join("")
            }
          </div>
        </div>
      </div>
    `;
  }

  function filterTocList(query) {
    const q = (query || "").trim().toLowerCase();
    const container = document.getElementById("toc-list-container");
    if (!container) return;
    const items = container.querySelectorAll(".toc-item");
    items.forEach((item) => {
      const title = item.getAttribute("data-title") || "";
      if (!q || title.includes(q)) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  }

  function setTocDivisionFilter(divId) {
    state.tocDivisionFilter = divId;
    saveState();
    renderTocModalContent();
  }

  function setTocStatusFilter(status) {
    state.tocStatusFilter = status;
    saveState();
    renderTocModalContent();
  }


  function setDashboardStatusFilter(status) {
    state.dashboardStatusFilter = status;
    saveState();
    renderApp();
  }

  function toggleDivisionAccordion(divId) {
    if (!state.divisionAccordions) {
      state.divisionAccordions = { "tropik-infeksi": true, "kardiologi": true, "ginjal-hipertensi": true, "pulmonologi": true, "gastroenterohepatologi": true, "endokrin-metabolik": true, "hematologi-onkologi": true, "reumatologi": true, "geriatri": true, "alergi-imunologi": true, "psikosomatik-paliatif": true };
    }
    state.divisionAccordions[divId] = !state.divisionAccordions[divId];
    saveState();
    renderApp();
  }

  function setMateriClusterFilter(tierVal) {
    state.materiClusterFilter = tierVal || "all";
    saveState();
    renderApp();
  }

  function jumpToTopic(moduleId) {
    toggleTocModal(false);
    const mod = getAllModules().find((m) => m.id === moduleId);
    if (mod && mod.divisionId && state.selectedDivisionId !== mod.divisionId) {
      state.selectedDivisionId = mod.divisionId;
      state.materiClusterFilter = "all";
      saveState();
    }
    if (activeView !== "materi") {
      window.InternaApp.navigate("materi");
    } else {
      state.topicSearchQuery = "";
      renderApp();
    }
    setTimeout(() => {
      const el = document.getElementById("module-card-" + moduleId);
      if (el) {
        el.scrollIntoView?.({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-teal-500", "scale-[1.01]");
        setTimeout(() => el.classList.remove("ring-2", "ring-teal-500", "scale-[1.01]"), 2200);
      }
    }, 120);
  }

  // =========================================================================
  // 13. HELPERS & GLOBAL KEYBOARD NAVIGATION
  // =========================================================================

  function formatVignetteWithHighlights(text, enable) {
    if (!enable) return escapeHtml(text);
    let s = escapeHtml(text);
    const regexes = [
      /(\b(?:TD|tekanan darah)\s*\d+\/\d+\s*mmHg|\bMAP\s*\d+(?:–\d+)?\s*mmHg)/gi,
      /(\b(?:nadi|frekuensi nadi|RR|frekuensi napas)\s*\d+\s*x\/menit|\bsuhu\s*\d+[,.]\d+\s*°C)/gi,
      /(\b(?:Hb|Hematokrit|Ht|Leukosit|Trombosit|CD4)\s*[\d.,%/\s\w-]+)/gi,
      /(\b(?:Laktat|Kreatinin|Bilirubin|Kalium|GDS|PaO2)\s*[\d.,%/\s\w-]+)/gi
    ];
    regexes.forEach((r) => {
      s = s.replace(r, '<span class="vignette-highlight">$1</span>');
    });
    return s;
  }

  function showToast(msg, type = "info") {
    const c = document.getElementById("toast-container");
    if (!c) return;
    const toneClass =
      type === "success"
        ? "bg-emerald-600 text-white border-emerald-800"
        : type === "error"
        ? "bg-rose-600 text-white border-rose-800"
        : type === "warning"
        ? "bg-amber-600 text-white border-amber-800"
        : "bg-sky-600 text-white border-sky-800";
    const t = document.createElement("div");
    t.setAttribute("role", type === "error" ? "alert" : "status");
    t.className = `px-4 py-2.5 rounded-2xl shadow-lg border-b-4 font-bold text-xs max-w-sm animate-pop ${toneClass}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function resetAllProgress() {
    if (confirm("Apakah Anda yakin ingin mereset seluruh progres belajar, riwayat latihan soal, dan streak? Tindakan ini tidak dapat dibatalkan.")) {
      state.topicsRead = {};
      state.srs = {};
      state.streakDays = 0;
      state.lastStudyDate = null;
      state.lastDailyDate = getLocalDateKey(0);
      state.lastFirstWinDate = null;
      state.totalXP = 0;
      state.dailyXP = 0;
      state.sessionsCompleted = 0;
      state.personalBestScore = 0;
      state.personalBestStreak = 0;
      state.personalLeaderboard = [];
      state.divisionXP = {};
      state.lastDivisionPracticeDate = {};
      state.tryoutHistory = [];
      state.unlockedAchievements = [];
      state.lastOpenedModuleId = null;
      state.quizStats = { totalAnswered: 0, totalCorrect: 0 };
      saveState();
      renderApp();
      showToast("Progres belajar berhasil direset ke awal.", "success");
    }
  }

  function handleGlobalKeyDown(e) {
    if (globalSearchState && globalSearchState.isOpen) {
      return;
    }

    // Handle Escape cleanly across all open modals (even when search/filter inputs are focused)
    if (e.key === "Escape") {
      const profileModal = document.getElementById("profile-modal");
      if (profileModal && !profileModal.classList.contains("hidden")) {
        e.preventDefault();
        closeProfileModal();
        return;
      }
      const tryoutFinishModal = document.getElementById("tryout-finish-modal");
      if (tryoutFinishModal && !tryoutFinishModal.classList.contains("hidden")) {
        e.preventDefault();
        toggleTryoutFinishModal(false);
        return;
      }
      const tryoutGridModal = document.getElementById("tryout-grid-modal");
      if (tryoutGridModal && !tryoutGridModal.classList.contains("hidden")) {
        e.preventDefault();
        toggleTryoutGridModal(false);
        return;
      }
      const tocModal = document.getElementById("toc-modal");
      if (tocModal && !tocModal.classList.contains("hidden")) {
        e.preventDefault();
        toggleTocModal(false);
        return;
      }
      const labModal = document.getElementById("lab-modal");
      if (labModal && !labModal.classList.contains("hidden")) {
        e.preventDefault();
        labModal.classList.add("hidden");
        return;
      }
      if (activeCarousel && activeCarousel.isOpen) {
        e.preventDefault();
        closeMaterialCarousel();
        return;
      }
    }

    // Abaikan shortcut navigasi saat fokus pada input / textarea / select (kecuali Escape di atas)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT" || activeEl.isContentEditable)) {
      return;
    }

    // Keyboard listener for Carousel Material Modal
    if (activeCarousel && activeCarousel.isOpen) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextCarouselSlide();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevCarouselSlide();
        return;
      }
    }

    // Block single-key quiz/tryout shortcuts when browser modifier keys (Cmd+C, Cmd+A, Cmd+R, etc.) are pressed
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    if (e.key === "/" && (activeView === "materi" || activeView === "dashboard")) {
      e.preventDefault();
      const searchInput = document.getElementById("topic-search-input");
      if (searchInput) searchInput.focus();
      return;
    }

    // Tryout Exam Key Navigation
    if (activeView === "tryout-exam") {
      const optKeys = ["1", "2", "3", "4", "5"];
      const letterKeys = ["a", "b", "c", "d", "e"];
      const keyLower = e.key.toLowerCase();

      let optIdx = optKeys.indexOf(e.key);
      if (optIdx === -1) optIdx = letterKeys.indexOf(keyLower);
      if (optIdx !== -1 && optIdx < (tryoutSession.questions[tryoutSession.currentIndex]?.options?.length || 0)) {
        e.preventDefault();
        selectTryoutOption(optIdx);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextTryoutQuestion();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevTryoutQuestion();
        return;
      }
      if (keyLower === "d" || keyLower === "r") {
        e.preventDefault();
        toggleTryoutDoubt();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        toggleTryoutFinishModal(true);
        return;
      }
    }

    // 3. Quiz View Navigation (Arrow Key, Enter, 1-5, A-E, D)
    if (activeView === "quiz") {
      const optKeys = ["1", "2", "3", "4", "5"];
      const letterKeys = ["a", "b", "c", "d", "e"];
      const keyLower = e.key.toLowerCase();

      // Pilih Opsi 1-5 / A-E
      if (!currentQuiz.isSubmitted) {
        let optIdx = optKeys.indexOf(e.key);
        if (optIdx === -1) optIdx = letterKeys.indexOf(keyLower);
        if (optIdx !== -1 && optIdx < (currentQuiz.questions[currentQuiz.currentIndex]?.options?.length || 0)) {
          e.preventDefault();
          selectQuizOption(optIdx);
          return;
        }
      }

      // Next / Submit via ArrowRight atau Enter
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (!currentQuiz.isSubmitted) {
          if (currentQuiz.selectedOption !== null) {
            submitQuizAnswer();
          }
        } else {
          nextQuizQuestion();
        }
        return;
      }

      // Tandai Ragu-ragu (D)
      if (keyLower === "d") {
        e.preventDefault();
        const q = currentQuiz.questions[currentQuiz.currentIndex];
        if (q) toggleDoubtFlag(q.id);
        return;
      }

      // Toggle Sorot Data Klinis (H)
      if (keyLower === "h") {
        e.preventDefault();
        currentQuiz.highlightEnabled = !currentQuiz.highlightEnabled;
        renderQuizQuestionArea();
        return;
      }

      // Keluar dari kuis (Escape)
      if (e.key === "Escape") {
        e.preventDefault();
        exitQuizEarly();
        return;
      }
    }
  }


  // =========================================================================
  // TRY OUT CBT SIMULATION ENGINE (25 & 50 SOAL ACAK)
  // =========================================================================
  function formatTryoutTime(sec) {
    const s = Math.max(0, sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function getActiveDivisionIds() {
    return (window.INTERNA_DATA.divisions || [])
      .filter((d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi")
      .map((d) => d.id);
  }

  function sampleTryoutQuestions(packageSize, divFilter = state.cbtConfig?.divisions || state.tryoutDivisionFilter || "all") {
    const allBoardQ = getAllQuestions().filter((q) => isBoardQuestion(q));
    let scopedQ = allBoardQ;
    if (Array.isArray(divFilter)) {
      if (divFilter.length === 0) return [];
      const setDiv = new Set(divFilter);
      scopedQ = allBoardQ.filter((q) => setDiv.has(q.divisionId || "tropik-infeksi"));
    } else if (divFilter && divFilter !== "all") {
      scopedQ = allBoardQ.filter((q) => (q.divisionId || "tropik-infeksi") === divFilter);
    }

    if (scopedQ.length === 0) return [];

    const categories = {
      "Teori Dasar": [],
      "Diagnosis": [],
      "Tatalaksana": [],
      "Kasus Lintas Divisi": []
    };

    scopedQ.forEach((q) => {
      const cat = normalizeQuestionCategory(q.category);
      if (categories[cat]) {
        categories[cat].push(q);
      } else {
        categories["Diagnosis"].push(q);
      }
    });

    for (const k in categories) {
      categories[k] = shuffleArray(categories[k]);
    }

    let sampled = [];
    if (packageSize === 25) {
      sampled = [
        ...categories["Teori Dasar"].slice(0, 4),
        ...categories["Diagnosis"].slice(0, 8),
        ...categories["Tatalaksana"].slice(0, 10),
        ...categories["Kasus Lintas Divisi"].slice(0, 3)
      ];
    } else {
      sampled = [
        ...categories["Teori Dasar"].slice(0, 6),
        ...categories["Diagnosis"].slice(0, 16),
        ...categories["Tatalaksana"].slice(0, 24),
        ...categories["Kasus Lintas Divisi"].slice(0, 4)
      ];
    }

    const targetSize = Math.min(packageSize, scopedQ.length);
    if (sampled.length < targetSize) {
      const existingIds = new Set(sampled.map((q) => q.id));
      const remaining = shuffleArray(scopedQ.filter((q) => !existingIds.has(q.id)));
      sampled.push(...remaining.slice(0, targetSize - sampled.length));
    }

    return shuffleArray(sampled.slice(0, targetSize)).map((q) => prepareShuffledQuizQuestion(q));
  }

  function startTryout(packageSize = null, customDivisions = null) {
    if (tryoutSession.timerInterval) {
      clearInterval(tryoutSession.timerInterval);
      tryoutSession.timerInterval = null;
    }
    if (currentQuiz.timerInterval) {
      clearInterval(currentQuiz.timerInterval);
      currentQuiz.timerInterval = null;
    }

    const pkg = Number(packageSize || state.cbtConfig?.packageSize || 25);
    const divFilter = customDivisions || (state.cbtConfig && Array.isArray(state.cbtConfig.divisions) ? state.cbtConfig.divisions : state.tryoutDivisionFilter || "all");
    const qList = sampleTryoutQuestions(pkg, divFilter);
    if (qList.length === 0) {
      showToast("Pilih minimal 1 divisi yang memiliki soal Asli Board.", "warning");
      return;
    }
    const actualSize = qList.length;
    const totalSec = actualSize * 90;

    tryoutSession = {
      isActive: true,
      packageSize: actualSize,
      totalSeconds: totalSec,
      remainingSeconds: totalSec,
      timerInterval: null,
      questions: qList,
      userAnswers: {},
      doubtFlags: {},
      currentIndex: 0,
      isFinished: false,
      timeSpentSeconds: 0,
      score: 0,
      percentage: 0,
      passed: false,
      categoryStats: {},
      reviewFilter: "all"
    };

    tryoutSession.timerInterval = setInterval(() => {
      if (tryoutSession.remainingSeconds > 0) {
        tryoutSession.remainingSeconds--;
        const timerEl = document.getElementById("tryout-countdown-display");
        if (timerEl) {
          timerEl.textContent = formatTryoutTime(tryoutSession.remainingSeconds);
          if (tryoutSession.remainingSeconds <= 300) {
            timerEl.classList.remove("text-teal-700", "dark:text-teal-300");
            timerEl.classList.add("text-red-600", "dark:text-red-400", "font-black");
          }
        }
      } else {
        clearInterval(tryoutSession.timerInterval);
        tryoutSession.timerInterval = null;
        showToast("Waktu ujian telah habis! Mengumpulkan jawaban...", "warning");
        finishTryoutSession();
      }
    }, 1000);

    activeView = "tryout-exam";
    renderApp();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectTryoutOption(optIndex) {
    if (tryoutSession.isFinished) return;
    tryoutSession.userAnswers[tryoutSession.currentIndex] = optIndex;
    renderTryoutExamQuestionArea();
  }

  function toggleTryoutDoubt(qIndex = null) {
    const idx = qIndex !== null ? qIndex : tryoutSession.currentIndex;
    tryoutSession.doubtFlags[idx] = !tryoutSession.doubtFlags[idx];
    renderTryoutExamQuestionArea();
  }

  function navigateTryoutQuestion(idx) {
    if (idx >= 0 && idx < tryoutSession.questions.length) {
      const dir = idx > tryoutSession.currentIndex ? "next" : idx < tryoutSession.currentIndex ? "prev" : "fade";
      runClickTransition(() => {
        tryoutSession.currentIndex = idx;
        renderTryoutExamQuestionArea();
        toggleTryoutGridModal(false);
      }, dir);
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function prevTryoutQuestion() {
    if (tryoutSession.currentIndex > 0) {
      navigateTryoutQuestion(tryoutSession.currentIndex - 1);
    }
  }

  function nextTryoutQuestion() {
    if (tryoutSession.currentIndex + 1 < tryoutSession.questions.length) {
      navigateTryoutQuestion(tryoutSession.currentIndex + 1);
    } else {
      toggleTryoutFinishModal(true);
    }
  }

  function toggleTryoutGridModal(isOpen) {
    const modal = document.getElementById("tryout-grid-modal");
    if (!modal) return;
    if (isOpen) {
      modal.classList.remove("hidden");
      modal.innerHTML = renderTryoutGridModalHtml();
    } else {
      modal.classList.add("hidden");
    }
  }

  function toggleTryoutFinishModal(isOpen) {
    const modal = document.getElementById("tryout-finish-modal");
    if (!modal) return;
    if (isOpen) {
      modal.classList.remove("hidden");
      modal.innerHTML = renderTryoutFinishModalHtml();
    } else {
      modal.classList.add("hidden");
    }
  }

  function exitTryoutEarly() {
    if (confirm("Apakah Anda yakin ingin membatalkan dan keluar dari Try Out ini? Progres sesi ini tidak akan disimpan.")) {
      if (tryoutSession.timerInterval) {
        clearInterval(tryoutSession.timerInterval);
        tryoutSession.timerInterval = null;
      }
      tryoutSession.isActive = false;
      activeView = "tryout";
      renderApp();
    }
  }

  function finishTryoutSession() {
    if (tryoutSession.timerInterval) {
      clearInterval(tryoutSession.timerInterval);
      tryoutSession.timerInterval = null;
    }

    toggleTryoutFinishModal(false);
    toggleTryoutGridModal(false);

    tryoutSession.isActive = false;
    tryoutSession.isFinished = true;
    tryoutSession.timeSpentSeconds = tryoutSession.totalSeconds - Math.max(0, tryoutSession.remainingSeconds);

    let score = 0;
    const catStats = {};

    tryoutSession.questions.forEach((q, idx) => {
      const userAns = tryoutSession.userAnswers[idx];
      const isCorrect = userAns === q.correctIndex;
      if (isCorrect) score++;

      const cat = q.category || "Diagnosis";
      if (!catStats[cat]) catStats[cat] = { total: 0, correct: 0 };
      catStats[cat].total++;
      if (isCorrect) catStats[cat].correct++;

      // Simpan otomatis soal salah ke Bank Salah SRS
      if (userAns !== undefined && !isCorrect) {
        recordQuestionResult(q.id, false, 90);
      } else if (isCorrect) {
        recordQuestionResult(q.id, true, 90);
      }
    });

    tryoutSession.score = score;
    tryoutSession.percentage = Math.round((score / tryoutSession.questions.length) * 100);
    tryoutSession.passed = tryoutSession.percentage >= 70;
    tryoutSession.categoryStats = catStats;

    if (!state.tryoutHistory) state.tryoutHistory = [];
    state.tryoutHistory.unshift({
      id: "to-" + Date.now(),
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      packageSize: tryoutSession.packageSize,
      score: tryoutSession.score,
      total: tryoutSession.questions.length,
      percentage: tryoutSession.percentage,
      passed: tryoutSession.passed,
      timeSpentSeconds: tryoutSession.timeSpentSeconds
    });

    const earnedXP = tryoutSession.score * 10 + 50;
    checkDailyReset();
    updateStreak();
    state.totalXP = (state.totalXP || 0) + earnedXP;
    state.dailyXP = (state.dailyXP || 0) + earnedXP;
    state.sessionsCompleted = (state.sessionsCompleted || 0) + 1;
    evaluateAndSaveAchievements({
      accuracy: tryoutSession.percentage,
      total: tryoutSession.questions.length,
      correct: tryoutSession.score,
      fastCorrectCount: 0
    });
    saveState();

    activeView = "tryout-result";
    tryoutSession.reviewFilter = "all";
    renderApp();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setTryoutReviewFilter(filter) {
    tryoutSession.reviewFilter = filter;
    const container = document.getElementById("tryout-review-cards-container");
    if (container) {
      container.innerHTML = renderTryoutReviewCardsInnerHtml();
    }
    const filterTabsContainer = document.getElementById("tryout-review-filters");
    if (filterTabsContainer) {
      filterTabsContainer.innerHTML = renderTryoutReviewFilterButtonsHtml();
    }
  }

  // =========================================================================
  // TRY OUT VIEW TEMPLATES (HOME, CBT EXAM, RESULT & REVIEW)
  // =========================================================================
  function setSnackQuizCount(count) {
    if (!state.snackQuizConfig) state.snackQuizConfig = { count: 10, divisions: getActiveDivisionIds(), source: "mixed" };
    state.snackQuizConfig.count = [10, 15, 20].includes(Number(count)) ? Number(count) : 10;
    saveState();
    renderApp();
  }

  function toggleSnackQuizDivision(divId) {
    if (!state.snackQuizConfig) state.snackQuizConfig = { count: 10, divisions: getActiveDivisionIds(), source: "mixed" };
    const current = Array.isArray(state.snackQuizConfig.divisions) ? [...state.snackQuizConfig.divisions] : [];
    const idx = current.indexOf(divId);
    if (idx >= 0) {
      if (current.length > 1) current.splice(idx, 1);
      else showToast("Minimal 1 divisi harus dipilih.", "info");
    } else {
      current.push(divId);
    }
    state.snackQuizConfig.divisions = current;
    saveState();
    renderApp();
  }

  function selectAllSnackQuizDivisions() {
    if (!state.snackQuizConfig) state.snackQuizConfig = { count: 10, divisions: [], source: "mixed" };
    state.snackQuizConfig.divisions = getActiveDivisionIds();
    saveState();
    renderApp();
  }

  function setSnackQuizSource(source) {
    if (!state.snackQuizConfig) state.snackQuizConfig = { count: 10, divisions: getActiveDivisionIds(), source: "mixed" };
    state.snackQuizConfig.source = source === "board" ? "board" : "mixed";
    saveState();
    renderApp();
  }

  function getSnackQuizPool() {
    const cfg = state.snackQuizConfig || { count: 10, divisions: getActiveDivisionIds(), source: "mixed" };
    const divSet = new Set(Array.isArray(cfg.divisions) && cfg.divisions.length > 0 ? cfg.divisions : getActiveDivisionIds());
    const allQ = getAllQuestions();
    return allQ.filter((q) => {
      const qDiv = q.divisionId || "tropik-infeksi";
      if (!divSet.has(qDiv)) return false;
      if (cfg.source === "board" && !isBoardQuestion(q)) return false;
      return true;
    });
  }

  function startSnackQuiz() {
    const cfg = state.snackQuizConfig || { count: 10, divisions: getActiveDivisionIds(), source: "mixed" };
    const filteredPool = getSnackQuizPool();
    if (filteredPool.length === 0) {
      showToast("Tidak ada soal yang sesuai kombinasi Snack Quiz saat ini.", "warning");
      return;
    }

    const targetCount = Math.min(Number(cfg.count || 10), filteredPool.length);
    const chosen = shuffleArray(filteredPool).slice(0, targetCount);
    const pool = chosen.map((q) => prepareShuffledQuizQuestion(q));

    if (currentQuiz.timerInterval) clearInterval(currentQuiz.timerInterval);

    const activeDivIds = getActiveDivisionIds();
    const divLabel = (cfg.divisions || []).length >= activeDivIds.length
      ? "Semua Divisi"
      : (cfg.divisions || []).map((id) => getDivisionShortLabel(id)).join(" + ");
    const sourceLabel = cfg.source === "board" ? "Khusus Soal Board" : "Campuran Drill + Board";

    quizOriginView = "tryout";
    sessionNewAchievements = [];

    currentQuiz = {
      mode: "snack-quiz",
      title: `Snack Quiz ${targetCount} Soal — ${divLabel} (${sourceLabel})`,
      moduleId: null,
      divisionId: null,
      questions: pool,
      currentIndex: 0,
      selectedOption: null,
      isSubmitted: false,
      lastAnswerAnim: "",
      correctCount: 0,
      highlightEnabled: false,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      elapsedSeconds: 0,
      timerInterval: null,
      timerHidden: false,
      sessionResults: [],
      userAnswers: {},
      currentStreak: 0,
      maxStreak: 0,
      totalPoints: 0,
      lastPointsEarned: 0
    };

    currentQuiz.timerInterval = setInterval(() => {
      currentQuiz.elapsedSeconds = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
      const timerEl = document.getElementById("quiz-timer-display");
      if (timerEl && !currentQuiz.timerHidden) {
        timerEl.textContent = formatDuration(currentQuiz.elapsedSeconds);
      }
      updateSpeedBar();
    }, 100);

    activeView = "quiz";
    renderApp();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setCbtPackageSize(size) {
    if (!state.cbtConfig) state.cbtConfig = { packageSize: 25, divisions: getActiveDivisionIds() };
    state.cbtConfig.packageSize = Number(size) === 50 ? 50 : 25;
    saveState();
    renderApp();
  }

  function toggleCbtDivision(divId) {
    if (!state.cbtConfig) state.cbtConfig = { packageSize: 25, divisions: getActiveDivisionIds() };
    const current = Array.isArray(state.cbtConfig.divisions) ? [...state.cbtConfig.divisions] : [];
    const idx = current.indexOf(divId);
    if (idx >= 0) {
      if (current.length > 1) current.splice(idx, 1);
      else showToast("Minimal 1 divisi harus dipilih.", "info");
    } else {
      current.push(divId);
    }
    state.cbtConfig.divisions = current;
    saveState();
    renderApp();
  }

  function selectAllCbtDivisions() {
    if (!state.cbtConfig) state.cbtConfig = { packageSize: 25, divisions: [] };
    state.cbtConfig.divisions = getActiveDivisionIds();
    saveState();
    renderApp();
  }

  function renderTryoutHomeView() {
    const history = state.tryoutHistory || [];
    const allQ = getAllQuestions();
    const allBoardQ = allQ.filter((q) => isBoardQuestion(q));
    const activeDivisions = (window.INTERNA_DATA.divisions || []).filter(
      (d) => d.status === "active" || d.id === "tropik-infeksi" || d.id === "kardiologi"
    );
    const activeDivIds = activeDivisions.map((d) => d.id);

    const cbtCfg = state.cbtConfig || { packageSize: 25, divisions: activeDivIds };
    const cbtDivSet = new Set(Array.isArray(cbtCfg.divisions) && cbtCfg.divisions.length > 0 ? cbtCfg.divisions : activeDivIds);
    const cbtPkg = Number(cbtCfg.packageSize) === 50 ? 50 : 25;
    const cbtScopedBoardCount = allBoardQ.filter((q) => cbtDivSet.has(q.divisionId || "tropik-infeksi")).length;
    const cbtActualSize = Math.min(cbtPkg, cbtScopedBoardCount);

    const snackCfg = state.snackQuizConfig || { count: 10, divisions: activeDivIds, source: "mixed" };
    const snackDivSet = new Set(Array.isArray(snackCfg.divisions) && snackCfg.divisions.length > 0 ? snackCfg.divisions : activeDivIds);
    const snackPool = getSnackQuizPool();
    const snackCount = Number(snackCfg.count || 10);
    const snackActualSize = Math.min(snackCount, snackPool.length);
    const mistakesCount = getMistakeVaultQuestions().length;

    return `
      <div class="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-pop">
        <!-- Page Header (Compact, No Verbose Subtitles) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 class="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">Bank Soal &amp; Simulasi CBT</h1>
          <div class="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <span>${allQ.length} Total Soal</span>
            <span>&bull;</span>
            <span class="text-[var(--accent-secondary)] font-bold">${allBoardQ.length} Asli Board</span>
          </div>
        </div>

        <!-- Two Side-by-Side Boxes: 1. CBT Ujian Board | 2. Snack Quiz -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- KOTAK 1: CBT UJIAN BOARD (100% ASLI BOARD) -->
          <section class="med-card p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)]">
                    Khusus Soal Board
                  </span>
                  <h2 class="font-extrabold text-lg text-[var(--text-primary)] mt-1.5">CBT Ujian Board</h2>
                </div>
                <span class="text-xs font-mono font-bold text-[var(--accent-secondary)] tabular-nums">${cbtScopedBoardCount} Soal</span>
              </div>

              <!-- Paket Jumlah Soal -->
              <div class="space-y-2">
                <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Jumlah Soal</div>
                <div class="grid grid-cols-2 gap-2">
                  ${[25, 50]
                    .map((sz) => {
                      const active = cbtPkg === sz;
                      const mins = Math.round((Math.min(sz, Math.max(1, cbtScopedBoardCount)) * 90) / 60);
                      return `
                        <button
                          type="button"
                          onclick="window.InternaApp.setCbtPackageSize(${sz})"
                          class="p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? "bg-[var(--tint-teal-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold"
                              : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                          }"
                        >
                          <div class="text-sm font-mono font-extrabold">${sz} Soal</div>
                          <div class="text-[11px] font-mono opacity-80">${mins} Menit &bull; Lulus &ge;70%</div>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>

              <!-- Custom Mix & Match Divisi (CBT) -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Pilih Divisi</span>
                  <button type="button" onclick="window.InternaApp.selectAllCbtDivisions()" class="text-[11px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer">Pilih Semua</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  ${activeDivisions
                    .map((div) => {
                      const divBoardCnt = allBoardQ.filter((q) => (q.divisionId || "tropik-infeksi") === div.id).length;
                      const checked = cbtDivSet.has(div.id);
                      return `
                        <button
                          type="button"
                          onclick="window.InternaApp.toggleCbtDivision('${div.id}')"
                          class="px-3 py-2 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                            checked
                              ? "bg-[var(--tint-teal-bg)] border-[var(--tint-teal-border)] text-[var(--text-primary)] font-bold"
                              : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          }"
                        >
                          <span class="text-xs truncate">${escapeHtml(div.shortName || div.name)}</span>
                          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">${divBoardCnt}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            </div>

            <button
              type="button"
              onclick="window.InternaApp.startTryout()"
              ${cbtActualSize === 0 ? "disabled" : ""}
              class="btn-duo btn-duo-primary w-full py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 touch-target"
            >
              <span>Mulai CBT (${cbtActualSize} Soal Board)</span>
              ${svgIcon("arrowRight", "w-4 h-4")}
            </button>
          </section>

          <!-- KOTAK 2: SNACK QUIZ (CUSTOMIZE 10/15/20 SOAL, MIX & MATCH DIVISI, BOARD/MIXED) -->
          <section class="med-card p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]">
                    Kuis Cepat Adaptif
                  </span>
                  <h2 class="font-extrabold text-lg text-[var(--text-primary)] mt-1.5">Snack Quiz</h2>
                </div>
                <span class="text-xs font-mono font-bold text-[var(--accent-primary)] tabular-nums">${snackPool.length} Soal</span>
              </div>

              <!-- Pilih Jumlah Pertanyaan: 10 / 15 / 20 -->
              <div class="space-y-2">
                <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Jumlah Pertanyaan</div>
                <div class="grid grid-cols-3 gap-2">
                  ${[10, 15, 20]
                    .map((n) => {
                      const active = snackCount === n;
                      return `
                        <button
                          type="button"
                          onclick="window.InternaApp.setSnackQuizCount(${n})"
                          class="py-2 px-3 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                            active
                              ? "bg-[var(--accent-primary)] text-[var(--on-accent-primary)] border-[var(--accent-primary)]"
                              : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                          }"
                        >
                          ${n} Soal
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>

              <!-- Sumber Soal: Campuran vs Khusus Board -->
              <div class="space-y-2">
                <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Komposisi Sumber Soal</div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onclick="window.InternaApp.setSnackQuizSource('mixed')"
                    class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      snackCfg.source !== "board"
                        ? "bg-[var(--tint-teal-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)]"
                        : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }"
                  >
                    Campuran Drill + Board
                  </button>
                  <button
                    type="button"
                    onclick="window.InternaApp.setSnackQuizSource('board')"
                    class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      snackCfg.source === "board"
                        ? "bg-[var(--accent-secondary-soft)] border-[var(--accent-secondary)] text-[var(--accent-secondary)]"
                        : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }"
                  >
                    Khusus Soal Board
                  </button>
                </div>
              </div>

              <!-- Mix & Match Divisi -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">Mix &amp; Match Divisi</span>
                  <button type="button" onclick="window.InternaApp.selectAllSnackQuizDivisions()" class="text-[11px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer">Pilih Semua</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  ${activeDivisions
                    .map((div) => {
                      const divPoolCnt = allQ.filter((q) => (q.divisionId || "tropik-infeksi") === div.id && (snackCfg.source !== "board" || isBoardQuestion(q))).length;
                      const checked = snackDivSet.has(div.id);
                      return `
                        <button
                          type="button"
                          onclick="window.InternaApp.toggleSnackQuizDivision('${div.id}')"
                          class="px-3 py-2 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                            checked
                              ? "bg-[var(--tint-teal-bg)] border-[var(--tint-teal-border)] text-[var(--text-primary)] font-bold"
                              : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          }"
                        >
                          <span class="text-xs truncate">${escapeHtml(div.shortName || div.name)}</span>
                          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">${divPoolCnt}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            </div>

            <button
              type="button"
              onclick="window.InternaApp.startSnackQuiz()"
              ${snackActualSize === 0 ? "disabled" : ""}
              class="btn-duo btn-duo-primary w-full py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 touch-target"
            >
              <span>Mulai Snack Quiz (${snackActualSize} Soal)</span>
              ${svgIcon("play", "w-4 h-4")}
            </button>
          </section>
        </div>

        <!-- Bank Salah (Compact Sesi Review Saja) -->
        <section id="soal-bank-salah" class="med-card p-4 sm:p-5 border ${mistakesCount > 0 ? "border-[var(--accent-coral-border)]" : "border-[var(--border-subtle)]"} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mistakesCount > 0 ? "bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] border border-[var(--accent-coral-border)]" : "bg-[var(--tint-teal-bg)] text-[var(--accent-primary)] border border-[var(--tint-teal-border)]"}">
              ${svgIcon(mistakesCount > 0 ? "alert" : "check", "w-5 h-5")}
            </div>
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="font-bold text-sm sm:text-base text-[var(--text-primary)]">Bank Salah</h2>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${mistakesCount > 0 ? "bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] border border-[var(--accent-coral-border)]" : "bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"}">
                  ${mistakesCount} Soal
                </span>
              </div>
              <p class="text-xs text-[var(--text-secondary)]">
                ${
                  mistakesCount > 0
                    ? `Siap diulang dalam sesi review terfokus (${Math.min(10, mistakesCount)} soal prioritas).`
                    : "Belum ada soal salah atau ditandai ragu."
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onclick="window.InternaApp.startQuizSession('weakness')"
            ${mistakesCount === 0 ? "disabled" : ""}
            class="btn-duo btn-duo-primary text-xs py-2 px-4 shrink-0 flex items-center justify-center gap-1.5 touch-target ${mistakesCount === 0 ? "opacity-50 cursor-not-allowed" : ""}"
          >
            ${svgIcon("play", "w-3.5 h-3.5")}
            <span>${mistakesCount > 0 ? `Mulai Sesi Review (${Math.min(10, mistakesCount)} Soal)` : "Semua Terkendali"}</span>
          </button>
        </section>

        <!-- Riwayat CBT Terakhir -->
        <div class="med-card p-5 sm:p-6 border border-[var(--border-subtle)] space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <h3 class="font-bold text-sm text-[var(--text-primary)]">Riwayat Hasil CBT Terakhir</h3>
            <span class="text-xs font-mono text-[var(--text-muted)]">${history.length} Sesi Terdata</span>
          </div>

          ${
            history.length === 0
              ? `<div class="p-6 text-center text-xs text-[var(--text-muted)]">Belum ada riwayat CBT. Pilih paket di atas untuk memulai simulasi pertama.</div>`
              : `
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="text-[var(--text-muted)] font-mono border-b border-[var(--border-subtle)]">
                        <th class="py-2 pr-3">Tanggal</th>
                        <th class="py-2 px-3">Paket</th>
                        <th class="py-2 px-3">Skor</th>
                        <th class="py-2 px-3">Persentase</th>
                        <th class="py-2 px-3">Status</th>
                        <th class="py-2 pl-3 text-right">Durasi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--border-subtle)] font-medium">
                      ${history
                        .slice(0, 5)
                        .map((h) => `
                          <tr class="hover:bg-[var(--bg-surface-subtle)]">
                            <td class="py-2.5 pr-3 text-[var(--text-secondary)]">${escapeHtml(h.date)}</td>
                            <td class="py-2.5 px-3 font-bold">${h.packageSize} Soal</td>
                            <td class="py-2.5 px-3 font-extrabold">${h.score} / ${h.total}</td>
                            <td class="py-2.5 px-3 font-extrabold ${h.passed ? "text-[var(--accent-primary)]" : "text-[var(--accent-secondary)]"}">${h.percentage}%</td>
                            <td class="py-2.5 px-3">
                              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                h.passed
                                  ? "bg-[var(--tint-teal-bg)] text-[var(--accent-primary)]"
                                  : "bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)]"
                              }">
                                ${h.passed ? "LULUS" : "BELUM LULUS"}
                              </span>
                            </td>
                            <td class="py-2.5 pl-3 text-right text-[var(--text-muted)] font-mono">${formatTryoutTime(h.timeSpentSeconds)}</td>
                          </tr>
                        `)
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>
      </div>
    `;
  }

  function renderTryoutExamView() {
    const total = tryoutSession.questions.length;
    const answeredCount = Object.keys(tryoutSession.userAnswers).length;
    const doubtCount = Object.values(tryoutSession.doubtFlags).filter(Boolean).length;

    return `
      <div class="max-w-3xl mx-auto px-4 py-4 space-y-4 animate-pop">
        <!-- Top CBT Exam Header Bar -->
        <div class="med-card p-3 sm:p-4 flex items-center justify-between gap-2 border border-[var(--border-subtle)]">
          <!-- Left: Title & Question Count -->
          <div class="flex items-center gap-2">
            <button
              onclick="window.InternaApp.exitTryoutEarly()"
              class="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-center font-bold text-[var(--text-secondary)] hover:text-[var(--accent-coral)] transition"
              title="Batalkan & Keluar dari Try Out"
            >
              ✕
            </button>
            <div>
              <div class="text-[11px] font-mono font-extrabold text-[var(--accent-primary)] uppercase tracking-wide">
                Try Out ${tryoutSession.packageSize} Soal • Asli Board
              </div>
              <div class="text-xs font-bold text-[var(--text-muted)]">
                Soal ${tryoutSession.currentIndex + 1} dari ${total}
              </div>
            </div>
          </div>

          <!-- Center: Countdown Timer -->
          <div class="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center gap-2">
            <svg class="w-4 h-4 text-[var(--accent-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span id="tryout-countdown-display" class="font-extrabold text-sm text-[var(--accent-primary)] tabular-nums">
              ${formatTryoutTime(tryoutSession.remainingSeconds)}
            </span>
          </div>

          <!-- Right: Grid Modal Button & Selesaikan -->
          <div class="flex items-center gap-2">
            <button
              onclick="window.InternaApp.toggleTryoutGridModal(true)"
              class="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] flex items-center gap-1.5 hover:border-[var(--accent-primary)] transition"
              title="Buka Lembar Daftar Nomor Soal"
            >
              <span>Lembar Soal</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent-primary)] text-[var(--on-accent-primary)] font-extrabold">${answeredCount}/${total}</span>
            </button>

            <button
              onclick="window.InternaApp.toggleTryoutFinishModal(true)"
              class="btn-duo btn-duo-primary text-xs py-1.5 px-3"
            >
              <span>Selesai</span>
            </button>
          </div>
        </div>

        <!-- Question Body Area -->
        <div id="tryout-exam-question-container">
          ${renderTryoutExamQuestionInnerHtml()}
        </div>
      </div>
    `;
  }

  function renderTryoutExamQuestionArea() {
    const el = document.getElementById("tryout-exam-question-container");
    if (el) el.innerHTML = renderTryoutExamQuestionInnerHtml();
  }

  function renderTryoutExamQuestionInnerHtml() {
    const q = tryoutSession.questions[tryoutSession.currentIndex];
    if (!q) return `<div class="p-8 text-center">Soal tidak ditemukan.</div>`;

    const total = tryoutSession.questions.length;
    const currentAns = tryoutSession.userAnswers[tryoutSession.currentIndex];
    const isDoubt = !!tryoutSession.doubtFlags[tryoutSession.currentIndex];
    const letters = ["A", "B", "C", "D", "E"];

    return `
      <div class="med-card p-5 sm:p-7 space-y-5 border border-[var(--border-subtle)]">
        <!-- Question Meta -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]">
              No. ${tryoutSession.currentIndex + 1}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              ${escapeHtml(normalizeQuestionCategory(q.category))}
            </span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)] border border-[var(--accent-secondary-border)] inline-flex items-center gap-1">${svgIcon("award", "w-3 h-3")} ${escapeHtml(q.boardSource || "Asli Board SpPD")}</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            ${renderFontSizeStepperHtml()}
            <button
              onclick="window.InternaApp.toggleTryoutDoubt()"
              class="px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                isDoubt
                  ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                  : "bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-amber-500"
              }"
            >
              <span>${isDoubt ? "Ditandai Ragu" : "Tandai Ragu"}</span>
              <kbd class="kbd-shortcut ml-0.5 hidden sm:inline ${isDoubt ? "bg-amber-800 text-amber-100" : ""}">D</kbd>
            </button>
          </div>
        </div>

        <!-- Clinical Vignette -->
        <div class="space-y-3">
          <p class="vignette-text leading-relaxed text-[var(--text-primary)] font-normal">
            ${escapeHtml(q.vignette)}
          </p>
          <div class="p-3.5 rounded-xl bg-[var(--accent-primary-soft)] border-l-4 border-[var(--accent-primary)] leadin-text font-bold text-[var(--text-primary)] leading-snug">
            ${escapeHtml(q.leadIn)}
          </div>
        </div>

        <!-- 5 Options (A-E) -->
        <div class="space-y-2.5 pt-1">
          ${q.options
            .map((opt, idx) => {
              const isSelected = currentAns === idx;
              return `
                <button
                  type="button"
                  onclick="window.InternaApp.selectTryoutOption(${idx})"
                  class="option-card ${isSelected ? "selected" : ""}"
                >
                  <span class="option-letter">
                    ${letters[idx]}
                  </span>
                  <span class="option-body leading-relaxed font-medium flex-1 text-[var(--text-primary)]">
                    ${escapeHtml(opt)}
                  </span>
                </button>
              `;
            })
            .join("")}
        </div>

        <!-- Bottom Navigation Bar -->
        <div class="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <button
            onclick="window.InternaApp.prevTryoutQuestion()"
            class="btn-duo btn-duo-outline text-xs py-2 px-3 flex items-center gap-1.5"
            ${tryoutSession.currentIndex === 0 ? "disabled" : ""}
          >
            <span>← Sebelumnya</span>
            <kbd class="kbd-shortcut hidden sm:inline">←</kbd>
          </button>

          <span class="text-xs font-mono font-bold text-[var(--text-muted)]">
            ${tryoutSession.currentIndex + 1} / ${total}
          </span>

          ${
            tryoutSession.currentIndex + 1 < total
              ? `
                <button
                  onclick="window.InternaApp.nextTryoutQuestion()"
                  class="btn-duo btn-duo-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <span>Berikutnya →</span>
                  <kbd class="kbd-shortcut bg-teal-800 text-teal-100 border-teal-600 hidden sm:inline">→</kbd>
                </button>
              `
              : `
                <button
                  onclick="window.InternaApp.toggleTryoutFinishModal(true)"
                  class="btn-duo btn-duo-primary text-xs py-2 px-4 font-extrabold"
                >
                  <span>Selesaikan Ujian ✓</span>
                </button>
              `
          }
        </div>
      </div>
    `;
  }

  function renderTryoutGridModalHtml() {
    const total = tryoutSession.questions.length;
    const answeredCount = Object.keys(tryoutSession.userAnswers).length;
    const doubtCount = Object.values(tryoutSession.doubtFlags).filter(Boolean).length;

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-pop">
        <div class="med-card max-w-xl w-full p-5 sm:p-6 space-y-4 border-2 border-teal-500/40 max-h-[85vh] flex flex-col justify-between">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-white">Lembar Nomor Soal Try Out</h3>
              <p class="text-xs text-slate-500">Klik nomor untuk langsung melompat ke soal tersebut.</p>
            </div>
            <button onclick="window.InternaApp.toggleTryoutGridModal(false)" class="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-500">
              ✕
            </button>
          </div>

          <!-- Status Legend -->
          <div class="flex flex-wrap items-center gap-3 text-xs font-semibold py-1">
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded bg-teal-600"></span>
              <span>Sudah Dijawab (${answeredCount})</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded bg-amber-500"></span>
              <span>Ragu-ragu (${doubtCount})</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700"></span>
              <span>Belum Dijawab (${total - answeredCount})</span>
            </div>
          </div>

          <!-- Numbers Grid -->
          <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 overflow-y-auto max-h-[50vh] p-1">
            ${tryoutSession.questions
              .map((q, idx) => {
                const isAnswered = tryoutSession.userAnswers[idx] !== undefined;
                const isDoubt = !!tryoutSession.doubtFlags[idx];
                const isCurrent = idx === tryoutSession.currentIndex;

                let btnClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
                if (isDoubt) {
                  btnClass = "bg-amber-500 text-white border-amber-600";
                } else if (isAnswered) {
                  btnClass = "bg-teal-600 text-white border-teal-700";
                }

                return `
                  <button
                    onclick="window.InternaApp.navigateTryoutQuestion(${idx})"
                    class="h-10 rounded-xl text-xs font-extrabold border transition flex items-center justify-center relative ${btnClass} ${
                      isCurrent ? "ring-2 ring-teal-400 ring-offset-2 dark:ring-offset-slate-900" : ""
                    }"
                  >
                    <span>${idx + 1}</span>
                    ${isDoubt ? `<span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>` : ""}
                  </button>
                `;
              })
              .join("")}
          </div>

          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button onclick="window.InternaApp.toggleTryoutGridModal(false)" class="btn-duo btn-duo-outline text-xs px-4 py-2">
              Tutup Lembar Soal
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderTryoutFinishModalHtml() {
    const total = tryoutSession.questions.length;
    const answeredCount = Object.keys(tryoutSession.userAnswers).length;
    const unansweredCount = total - answeredCount;
    const doubtCount = Object.values(tryoutSession.doubtFlags).filter(Boolean).length;

    return `
      <div class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-pop">
        <div class="med-card max-w-md w-full p-5 sm:p-6 space-y-4 border-2 border-teal-500/40">
          <div class="space-y-1 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">Kumpulkan Lembar Jawaban?</h3>
            <p class="text-xs text-slate-500">Pastikan seluruh soal telah Anda teliti sebelum dinilai.</p>
          </div>

          <!-- Summary Box -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500">Total Soal:</span>
              <span class="font-extrabold">${total} Soal</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800 text-teal-700 dark:text-teal-300 font-bold">
              <span>Sudah Dijawab:</span>
              <span>${answeredCount} Soal</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800 ${unansweredCount > 0 ? "text-red-600 dark:text-red-400 font-extrabold" : "text-slate-500 font-bold"}">
              <span>Belum Dijawab:</span>
              <span>${unansweredCount} Soal</span>
            </div>
            <div class="flex justify-between py-1 text-amber-600 dark:text-amber-400 font-bold">
              <span>Ditandai Ragu-ragu:</span>
              <span>${doubtCount} Soal</span>
            </div>
          </div>

          ${
            unansweredCount > 0
              ? `
                <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
                  <strong>Peringatan:</strong> Masih ada <strong>${unansweredCount} soal</strong> yang belum Anda jawab. Jawaban kosong akan dinilai salah.
                </div>
              `
              : ""
          }

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button
              onclick="window.InternaApp.toggleTryoutFinishModal(false)"
              class="btn-duo btn-duo-outline text-xs px-3 py-2"
            >
              Lanjut Mengerjakan
            </button>
            <button
              onclick="window.InternaApp.finishTryoutSession()"
              class="btn-duo btn-duo-primary text-xs px-4 py-2 font-extrabold"
            >
              Ya, Kumpulkan Jawaban
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderTryoutResultView() {
    const total = tryoutSession.questions.length;
    const score = tryoutSession.score;
    const pct = tryoutSession.percentage;
    const passed = tryoutSession.passed;
    const spentStr = formatTryoutTime(tryoutSession.timeSpentSeconds);
    const wrongCount = total - score;
    const doubtCount = Object.values(tryoutSession.doubtFlags).filter(Boolean).length;

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-pop">
        <!-- Hero Score Card -->
        <div class="med-card p-6 sm:p-8 rounded-2xl border-2 ${
          passed
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]"
            : "border-[var(--accent-secondary)] bg-[var(--accent-secondary-soft)]"
        } space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1.5">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold ${
                passed
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }">
                <span>${passed ? "LULUS (Passed)" : "BELUM LULUS (Needs Improvement)"}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Hasil Simulasi Try Out SpPD</h1>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                ${
                  passed
                    ? "Selamat! Anda melampaui batas kelulusan standar ujian SpPD (Passing Grade ≥ 70%). Pertahankan dan kuatkan evaluasi topik salah di bawah."
                    : "Belum mencapai ambang batas kelulusan ≥ 70%. Periksa kembali pembahasan rinci dan sumber rujukan di bawah untuk penguatan."
                }
              </p>
            </div>

            <!-- Big Circular Score Display -->
            <div class="flex items-center gap-4 self-center sm:self-auto">
              <div class="text-center p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 min-w-[120px]">
                <div class="text-3xl sm:text-4xl font-black ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}">
                  ${pct}%
                </div>
                <div class="text-xs font-bold text-slate-500 mt-0.5">${score} / ${total} Soal</div>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span class="text-slate-500 font-semibold">Waktu Pengerjaan</span>
              <div class="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">${spentStr}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span class="text-slate-500 font-semibold">Jawaban Benar</span>
              <div class="font-extrabold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">${score} Soal</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span class="text-slate-500 font-semibold">Jawaban Salah</span>
              <div class="font-extrabold text-base text-red-600 dark:text-red-400 mt-0.5">${wrongCount} Soal</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span class="text-slate-500 font-semibold">Ditandai Ragu</span>
              <div class="font-extrabold text-base text-amber-600 dark:text-amber-400 mt-0.5">${doubtCount} Soal</div>
            </div>
          </div>

          <!-- Category Breakdown Grid -->
          <div class="pt-2">
            <div class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Performa Berdasarkan Kategori Soal:</div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              ${Object.entries(tryoutSession.categoryStats || {})
                .map(([cat, stat]) => {
                  const catPct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  return `
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div class="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 truncate">${escapeHtml(cat)}</div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-bold text-slate-500">${stat.correct} / ${stat.total}</span>
                        <span class="font-extrabold ${catPct >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}">${catPct}%</span>
                      </div>
                      <div class="duo-progress-track">
                        <div class="duo-progress-fill" style="width: ${catPct}%"></div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-2 flex flex-wrap gap-3">
            <button onclick="window.InternaApp.startTryout(${tryoutSession.packageSize})" class="btn-duo btn-duo-primary text-xs py-2.5 px-4">
              Ulangi Try Out Baru (${tryoutSession.packageSize} Soal)
            </button>
            <button onclick="window.InternaApp.navigate('tryout')" class="btn-duo btn-duo-outline text-xs py-2.5 px-4">
              Pilih Paket Lain
            </button>
            <button onclick="window.InternaApp.navigate('dashboard')" class="btn-duo btn-duo-outline text-xs py-2.5 px-4">
              Kembali ke Beranda Modul
            </button>
          </div>
        </div>

        <!-- Comprehensive Review Header & Filters -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-lg font-extrabold text-slate-900 dark:text-white">Pembahasan Komprehensif Seluruh Soal</h2>
              <p class="text-xs text-slate-500">Pelajari penjelasan rasional, analisis opsi distraktor, dan sumber rujukan resmi di bawah tiap soal.</p>
            </div>

            <!-- Filter Buttons -->
            <div id="tryout-review-filters" class="flex items-center gap-1.5 overflow-x-auto py-1">
              ${renderTryoutReviewFilterButtonsHtml()}
            </div>
          </div>

          <!-- Cards Container -->
          <div id="tryout-review-cards-container" class="space-y-4">
            ${renderTryoutReviewCardsInnerHtml()}
          </div>
        </div>
      </div>
    `;
  }

  function renderTryoutReviewFilterButtonsHtml() {
    const total = tryoutSession.questions.length;
    const score = tryoutSession.score;
    const wrongCount = total - score;
    const doubtCount = Object.values(tryoutSession.doubtFlags).filter(Boolean).length;
    const f = tryoutSession.reviewFilter || "all";

    return `
      <button
        onclick="window.InternaApp.setTryoutReviewFilter('all')"
        class="px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
          f === "all" ? "bg-teal-700 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }"
      >
        Semua (${total})
      </button>
      <button
        onclick="window.InternaApp.setTryoutReviewFilter('wrong')"
        class="px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
          f === "wrong" ? "bg-red-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }"
      >
        Salah Saja (${wrongCount})
      </button>
      <button
        onclick="window.InternaApp.setTryoutReviewFilter('doubt')"
        class="px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
          f === "doubt" ? "bg-amber-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }"
      >
        Ragu-ragu (${doubtCount})
      </button>
      <button
        onclick="window.InternaApp.setTryoutReviewFilter('correct')"
        class="px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
          f === "correct" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }"
      >
        Benar Saja (${score})
      </button>
    `;
  }

  function renderTryoutReviewCardsInnerHtml() {
    const letters = ["A", "B", "C", "D", "E"];
    const f = tryoutSession.reviewFilter || "all";

    const filteredItems = tryoutSession.questions
      .map((q, idx) => ({ q, idx, userAns: tryoutSession.userAnswers[idx], isDoubt: !!tryoutSession.doubtFlags[idx] }))
      .filter((item) => {
        const isCorrect = item.userAns === item.q.correctIndex;
        if (f === "wrong") return !isCorrect;
        if (f === "correct") return isCorrect;
        if (f === "doubt") return item.isDoubt;
        return true;
      });

    if (filteredItems.length === 0) {
      return `<div class="p-8 text-center text-xs text-slate-500">Tidak ada soal pada kategori filter ini.</div>`;
    }

    return filteredItems
      .map(({ q, idx, userAns, isDoubt }) => {
        const isCorrect = userAns === q.correctIndex;
        const isUnanswered = userAns === undefined;
        const distractorEntries = Object.entries(q.rationale?.distractorAnalysis || {});

        return `
          <div class="med-card p-5 sm:p-6 space-y-4 border-2 ${
            isCorrect
              ? "border-emerald-500/60 bg-emerald-500/5"
              : isUnanswered
              ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
              : "border-red-500/60 bg-red-500/5"
          }">
            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                  No. ${idx + 1}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  ${escapeHtml(q.category || "Diagnosis")}
                </span>
                ${
                  q.boardSource || (q.id && q.id.includes("-board-"))
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">${escapeHtml(q.boardSource || "Board SpPD")}</span>`
                    : ""
                }
              </div>

              <div class="flex items-center gap-2">
                ${
                  isDoubt
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">Ragu-ragu</span>`
                    : ""
                }
                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  isCorrect
                    ? "bg-emerald-600 text-white"
                    : isUnanswered
                    ? "bg-slate-400 text-white"
                    : "bg-red-600 text-white"
                }">
                  ${isCorrect ? "✓ Jawaban Anda Benar" : isUnanswered ? "— Tidak Dijawab" : `✕ Salah (Pilihan Anda: Opsi ${letters[userAns]})`}
                </span>
              </div>
            </div>

            <!-- Vignette & Lead-in -->
            <div class="space-y-2">
              <p class="vignette-text text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                ${escapeHtml(q.vignette)}
              </p>
              <div class="p-3 rounded-xl bg-teal-500/10 border-l-4 border-teal-600 text-xs font-bold text-teal-900 dark:text-teal-100">
                ${escapeHtml(q.leadIn)}
              </div>
            </div>

            <!-- Options Review with User Selection & Key Highlight -->
            <div class="space-y-2 text-xs">
              ${q.options
                .map((opt, optIdx) => {
                  const isKey = optIdx === q.correctIndex;
                  const isUserChosen = userAns === optIdx;

                  let optBorder = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
                  let badge = letters[optIdx];

                  if (isKey) {
                    optBorder = "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500";
                  } else if (isUserChosen && !isCorrect) {
                    optBorder = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 font-semibold";
                  }

                  return `
                    <div class="p-3 rounded-xl border-2 flex items-start gap-2.5 ${optBorder}">
                      <span class="w-5 h-5 rounded-md font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                        isKey
                          ? "bg-emerald-600 text-white"
                          : isUserChosen && !isCorrect
                          ? "bg-red-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }">
                        ${badge}
                      </span>
                      <div class="flex-1 leading-relaxed">
                        ${escapeHtml(opt)}
                        ${isKey ? `<strong class="text-emerald-600 dark:text-emerald-400 ml-1.5 font-extrabold">[KUNCI BENAR]</strong>` : ""}
                        ${isUserChosen && !isKey ? `<strong class="text-red-600 dark:text-red-400 ml-1.5 font-extrabold">[PILIHAN ANDA]</strong>` : ""}
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>

            <!-- Rationale & Explanation -->
            <div class="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div class="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300">Rasional Jawaban Benar:</div>
              <p class="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                ${escapeHtml(q.rationale?.correctExplanation || "")}
              </p>
              ${
                q.rationale?.clinicalPearl
                  ? `
                    <div class="mt-2 p-3 rounded-lg bg-[var(--accent-secondary-soft)] border border-[var(--accent-secondary-border)] text-[var(--text-secondary)]" style="font-size: calc(0.9rem * var(--reading-scale)); line-height: 1.6;">
                      <div class="flex items-center gap-1.5 font-bold text-[var(--accent-secondary)] mb-0.5">
                        ${svgIcon("target", "w-4 h-4")}
                        <span>Board Pearl</span>
                      </div>
                      <p class="m-0">${escapeHtml(q.rationale.clinicalPearl)}</p>
                    </div>
                  `
                  : ""
              }
              ${renderExtendedRationaleHtml(q)}
            </div>

            <!-- Distractor Analysis -->
            ${
              distractorEntries.length > 0
                ? `
                  <div class="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div class="text-[11px] font-extrabold uppercase text-slate-500">Analisis Opsi Distraktor:</div>
                    ${distractorEntries
                      .map(([idxStr, exp]) => {
                        const idxNum = parseInt(idxStr, 10);
                        const optLabel = (!isNaN(idxNum) && q.options && q.options[idxNum]) ? q.options[idxNum].trim() : "";
                        const expStr = String(exp || "").trim();
                        const startsWithOpt = optLabel && expStr.toLowerCase().startsWith(optLabel.slice(0, Math.min(20, optLabel.length)).toLowerCase());
                        return `<div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60">${optLabel && !startsWithOpt ? `<strong>${escapeHtml(optLabel)} — </strong>` : ""}${escapeHtml(expStr)}</div>`;
                      })
                      .join("")}
                  </div>
                `
                : ""
            }

            <!-- Guideline Anchor -->
            <div class="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div>
                <span class="font-extrabold text-teal-700 dark:text-teal-300">Guideline Anchor: </span>
                <span class="text-slate-800 dark:text-slate-200">${escapeHtml(q.rationale?.guidelineAnchor || "")}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  let lastRenderedView = null;

  function renderApp() {
    applyTheme();
    renderTopNav();
    renderMobileNav();
    const main = document.getElementById("app-main");
    if (!main) return;

    const viewChanged = lastRenderedView !== activeView;
    lastRenderedView = activeView;

    if (activeView === "quiz") {
      main.innerHTML = renderQuizView();
    } else if (activeView === "quiz-summary") {
      main.innerHTML = renderQuizSummaryView();
    } else if (activeView === "tryout") {
      main.innerHTML = renderTryoutHomeView();
    } else if (activeView === "tryout-exam") {
      main.innerHTML = renderTryoutExamView();
    } else if (activeView === "tryout-result") {
      main.innerHTML = renderTryoutResultView();
    } else if (activeView === "widgets") {
      main.innerHTML = renderWidgetsView();
    } else if (activeView === "profile") {
      main.innerHTML = renderProfileView();
    } else if (activeView === "battle") {
      main.innerHTML = renderBattleView();
    } else if (activeView === "materi" || activeView === "dashboard") {
      main.innerHTML = renderMateriView();
    } else {
      main.innerHTML = renderHomeDashboardView();
    }

    if (viewChanged && main.firstElementChild) {
      main.firstElementChild.classList.add("apple-view-enter");
    }
  }

  // Public Interface

  // ==========================================================================
  // Manual Vignette Highlighter & Global Search (Cmd+K)
  // ==========================================================================
  function initManualVignetteHighlighter() {
    document.addEventListener("mouseup", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (text.length < 2) return;
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 3 ? container.parentElement : container;
      if (!el || !el.closest(".vignette-text")) return;
      if (el.closest("mark.clinical-hl")) return;
      try {
        const mark = document.createElement("mark");
        mark.className = "clinical-hl";
        mark.title = "Klik untuk hapus sorotan";
        range.surroundContents(mark);
        sel.removeAllRanges();
      } catch (e) {
        // Cross-node selection fallback: ignore gracefully
      }
    });

    document.addEventListener("click", (e) => {
      const mark = e.target && e.target.closest ? e.target.closest("mark.clinical-hl") : null;
      if (mark && mark.closest(".vignette-text")) {
        const parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        parent.normalize();
      }
    });
  }

  let globalSearchState = {
    isOpen: false,
    query: "",
    activeIndex: 0,
    results: []
  };

  function buildGlobalSearchResults(query) {
    const q = (query || "").trim().toLowerCase();
    const modResults = [];
    const widgetResults = [];

    // 1. Modules (111)
    const mods = getAllModules ? getAllModules() : [];
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      const title = m.title || "";
      const sub = m.subtitle || "";
      const divLabel = getDivisionShortLabel ? getDivisionShortLabel(m.divisionId) : m.divisionId;
      const hay = `${title} ${sub} ${divLabel} ${m.id}`.toLowerCase();
      if (!q || hay.includes(q)) {
        modResults.push({
          type: "module",
          id: m.id,
          title: title,
          subtitle: `${divLabel} • ${sub || "Modul Materi"}`,
          badge: "Materi"
        });
      }
      if (modResults.length >= 10) break;
    }

    // 2. Clinical Widgets (109)
    const widgets = typeof getWidgetCatalog === "function" ? getWidgetCatalog() : [];
    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      const hay = `${w.title || ""} ${w.moduleTitle || ""} ${w.clusterTitle || ""} ${w.divisionShort || ""} ${w.divisionName || ""} ${w.widgetType || ""}`.toLowerCase();
      if (!q || hay.includes(q)) {
        widgetResults.push({
          type: "widget",
          id: w.widgetType,
          title: w.title || w.widgetType,
          subtitle: `${w.divisionShort || w.divisionName || "Klinis"} • ${w.moduleTitle || w.clusterTitle || "Kalkulator / Visualisasi"}`,
          badge: "Widget"
        });
      }
      if (widgetResults.length >= 10) break;
    }

    return [...modResults, ...widgetResults].slice(0, 18);
  }

  function openGlobalSearch() {
    globalSearchState.isOpen = true;
    globalSearchState.query = "";
    globalSearchState.activeIndex = 0;
    globalSearchState.results = buildGlobalSearchResults("");
    renderGlobalSearchModal();
    setTimeout(() => {
      const inp = document.getElementById("gs-input");
      if (inp) inp.focus();
    }, 20);
  }

  function closeGlobalSearch() {
    globalSearchState.isOpen = false;
    const modal = document.getElementById("global-search-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.innerHTML = "";
    }
  }

  function updateGlobalSearchResults(val) {
    globalSearchState.query = val;
    globalSearchState.activeIndex = 0;
    globalSearchState.results = buildGlobalSearchResults(val);
    const listEl = document.getElementById("gs-results-list");
    if (listEl) listEl.innerHTML = renderGlobalSearchListHtml();
  }

  function selectGlobalSearchItem(idx) {
    const item = globalSearchState.results[idx];
    if (!item) return;
    closeGlobalSearch();
    if (item.type === "module") {
      openMaterialCarousel(item.id, 0);
    } else if (item.type === "widget") {
      widgetHubState.divisionFilter = "all";
      widgetHubState.searchQuery = "";
      widgetHubState.activeWidgetType = item.id || null;
      window.InternaApp.navigate("widgets");
      setTimeout(() => {
        const stage = document.getElementById("widget-active-stage");
        if (stage && typeof stage.scrollIntoView === "function") {
          stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 60);
    }
  }

  function handleGlobalSearchKeydown(e) {
    if (!globalSearchState.isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeGlobalSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (globalSearchState.results.length > 0) {
        globalSearchState.activeIndex = (globalSearchState.activeIndex + 1) % globalSearchState.results.length;
        const listEl = document.getElementById("gs-results-list");
        if (listEl) listEl.innerHTML = renderGlobalSearchListHtml();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (globalSearchState.results.length > 0) {
        globalSearchState.activeIndex = (globalSearchState.activeIndex - 1 + globalSearchState.results.length) % globalSearchState.results.length;
        const listEl = document.getElementById("gs-results-list");
        if (listEl) listEl.innerHTML = renderGlobalSearchListHtml();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectGlobalSearchItem(globalSearchState.activeIndex);
    }
  }

  function renderGlobalSearchListHtml() {
    if (globalSearchState.results.length === 0) {
      return `<div class="p-6 text-center text-sm text-[var(--text-muted)]">Tidak ada modul atau widget yang cocok.</div>`;
    }
    return globalSearchState.results
      .map((item, idx) => {
        const isActive = idx === globalSearchState.activeIndex;
        return `
          <button
            type="button"
            onclick="window.InternaApp.selectGlobalSearchItem(${idx})"
            class="gs-item w-full text-left px-3.5 py-2.5 rounded-xl border border-transparent flex items-center justify-between gap-3 transition ${
              isActive ? "active" : "hover:bg-[var(--bg-surface-subtle)]"
            }"
          >
            <div class="min-w-0">
              <div class="text-sm font-bold text-[var(--text-primary)] truncate">${escapeHtml(item.title)}</div>
              <div class="text-xs text-[var(--text-muted)] truncate">${escapeHtml(item.subtitle)}</div>
            </div>
            <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
              item.type === "widget"
                ? "bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)]"
                : "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
            }">${item.badge}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderGlobalSearchModal() {
    const modal = document.getElementById("global-search-modal");
    if (!modal || !globalSearchState.isOpen) return;
    modal.className = "fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm";
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden animate-pop" onclick="event.stopPropagation()">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          ${svgIcon("search", "w-5 h-5 text-[var(--accent-primary)] shrink-0")}
          <input
            id="gs-input"
            type="text"
            value="${escapeHtml(globalSearchState.query)}"
            oninput="window.InternaApp.updateGlobalSearchResults(this.value)"
            onkeydown="window.InternaApp.handleGlobalSearchKeydown(event)"
            placeholder="Cari 111 modul materi, 109 widget klinis, atau kalkulator..."
            class="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            autocomplete="off"
          />
          <button type="button" onclick="window.InternaApp.closeGlobalSearch()" class="px-2 py-1 rounded-lg text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">ESC</button>
        </div>
        <div id="gs-results-list" class="max-h-80 overflow-y-auto p-2 space-y-1">
          ${renderGlobalSearchListHtml()}
        </div>
        <div class="px-4 py-2 bg-[var(--bg-surface-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>↑↓ Navigasi • Enter Buka</span>
          <span>Cmd/Ctrl + K</span>
        </div>
      </div>
    `;
    modal.onclick = () => closeGlobalSearch();
  }

  function cleanupInactiveTimers(nextView) {
    if (tryoutSession && tryoutSession.isActive && !tryoutSession.isFinished && nextView !== "tryout-exam") {
      const ok = confirm("Try Out CBT sedang berlangsung. Keluar dari halaman ujian akan menghentikan sesi tanpa menyimpan hasil. Lanjutkan?");
      if (!ok) return false;
      if (tryoutSession.timerInterval) {
        clearInterval(tryoutSession.timerInterval);
        tryoutSession.timerInterval = null;
      }
      tryoutSession.isActive = false;
    } else if (tryoutSession && tryoutSession.timerInterval && nextView !== "tryout-exam") {
      clearInterval(tryoutSession.timerInterval);
      tryoutSession.timerInterval = null;
    }
    if (currentQuiz.timerInterval && nextView !== "quiz") {
      clearInterval(currentQuiz.timerInterval);
      currentQuiz.timerInterval = null;
    }
    if (battleState.timerInterval && nextView !== "battle") {
      clearInterval(battleState.timerInterval);
      battleState.timerInterval = null;
    }
    return true;
  }

  window.InternaApp = {
    navigate(v) {
      const targetView = v === "mistakes" ? "tryout" : v === "flashcards" ? "home" : v;
      if (!cleanupInactiveTimers(targetView)) return;
      cancelAllVizAnimations();
      sidebarMobileOpen = false;
      runClickTransition(() => {
        activeView = targetView;
        renderApp();
      }, "fade");
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    selectDivision(divId) {
      if (!cleanupInactiveTimers("materi")) return;
      cancelAllVizAnimations();
      runClickTransition(() => {
        state.selectedDivisionId = divId;
        state.materiClusterFilter = "all";
        sidebarMobileOpen = false;
        activeView = "materi";
        saveState();
        renderApp();
      }, "next");
    },
    toggleMobileSidebar,
    toggleSoundPreference,
    setMateriClusterFilter,
    setWidgetDivisionFilter,
    setWidgetSearchQuery,
    selectWidgetFromHub,
    closeActiveWidgetStage,
    setSnackQuizCount,
    toggleSnackQuizDivision,
    selectAllSnackQuizDivisions,
    setSnackQuizSource,
    startSnackQuiz,
    setCbtPackageSize,
    toggleCbtDivision,
    selectAllCbtDivisions,
    setQuizSourceFilter(source) {
      state.quizSourceFilter = source || "all";
      saveState();
      renderApp();
    },
    setQuizCategoryFilter(cat) {
      state.quizCategoryFilter = cat || "all";
      saveState();
      renderApp();
    },
    setTryoutDivisionFilter(divId) {
      state.tryoutDivisionFilter = divId || "all";
      saveState();
      renderApp();
    },
    toggleThemeQuick,
    setThemePreference,
    setFontSizePreference,
    startSRSReview,
    startQuizSession,
    selectQuizOption,
    submitQuizAnswer,
    prevQuizQuestion,
    nextQuizQuestion,
    exitQuizEarly,
    startTryout,
    selectTryoutOption,
    toggleTryoutDoubt,
    navigateTryoutQuestion,
    prevTryoutQuestion,
    nextTryoutQuestion,
    toggleTryoutGridModal,
    toggleTryoutFinishModal,
    exitTryoutEarly,
    finishTryoutSession,
    setTryoutReviewFilter,
    toggleQuizTimerVisibility() {
      currentQuiz.timerHidden = !currentQuiz.timerHidden;
      const el = document.getElementById("quiz-timer-display");
      if (el) el.textContent = currentQuiz.timerHidden ? "••:••" : formatDuration(currentQuiz.elapsedSeconds);
    },
    toggleVignetteHighlight() {
      currentQuiz.highlightEnabled = !currentQuiz.highlightEnabled;
      renderQuizQuestionArea();
    },
    toggleDoubtFlag,
    openMaterialCarousel,
    openMaterialCarouselAtSlide,
    closeMaterialCarousel,
    nextCarouselSlide,
    prevCarouselSlide,
    setCarouselSlide,
    openLabModal,
    openProfileModal,
    closeProfileModal,
    selectProfileAvatar,
    saveProfileFromModal,
    createBattleRoom,
    joinBattleRoom,
    startBattleGame,
    submitBattleAnswer,
    nextBattleRound,
    exitBattle,
    updateBattleSettings,
    setTopicSearch,
    clearTopicSearch,
    toggleTocModal,
    filterTocList,
    jumpToTopic,
    setDashboardStatusFilter,
    toggleDivisionAccordion,
    setTocDivisionFilter,
    setTocStatusFilter,
    resetAllProgress,
    openGlobalSearch,
    closeGlobalSearch,
    updateGlobalSearchResults,
    handleGlobalSearchKeydown,
    selectGlobalSearchItem,
    ...R.handlers
  };

  document.addEventListener("DOMContentLoaded", () => {
    checkDailyReset();
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (globalSearchState.isOpen) closeGlobalSearch();
        else openGlobalSearch();
        return;
      }
      handleGlobalKeyDown(e);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (checkDailyReset()) {
          saveState();
          renderApp();
        }
      }
    });
    window.addEventListener("focus", () => {
      if (checkDailyReset()) {
        saveState();
        renderApp();
      }
    });
    setInterval(() => {
      if (checkDailyReset()) {
        saveState();
        renderApp();
      }
    }, 60000);
    initManualVignetteHighlighter();
    window.addEventListener("online", () => {
      renderTopNav();
      if (activeView === "battle") renderApp();
      showToast("Kembali online. Semua fitur termasuk Mode Battle aktif.", "success");
    });
    window.addEventListener("offline", () => {
      renderTopNav();
      if (activeView === "battle") renderApp();
      showToast("Mode Offline aktif — materi, widget & soal tetap berjalan.", "info");
    });
    window.addEventListener("interna:offline-status", () => {
      renderTopNav();
    });
    applyTheme();
    applyFontSize();
    renderApp();
  });
})();
