/* ==========================================================================
   Interna Snack — Gamification & Clinical Progression System
   - 100-Level Stepped XP Curve
   - 8-Tier Clinical Progression System
   - Speed Bonus (<15s) & Answer Streak Multiplier
   - Personal Best Leaderboard
   ========================================================================== */

(function () {
  // 8 Clinical Tiers
  const CLINICAL_TIERS = [
    { tier: 1, name: "Clinical Clerk", minLevel: 1, maxLevel: 9, colorLight: "#57534E", colorDark: "#A8A29E" },
    { tier: 2, name: "Medical Intern", minLevel: 10, maxLevel: 19, colorLight: "#0F766E", colorDark: "#2DD4BF" },
    { tier: 3, name: "General Practitioner", minLevel: 20, maxLevel: 29, colorLight: "#1D4ED8", colorDark: "#60A5FA" },
    { tier: 4, name: "Junior Resident", minLevel: 30, maxLevel: 44, colorLight: "#2D6A4F", colorDark: "#52B788" },
    { tier: 5, name: "Senior Resident", minLevel: 45, maxLevel: 59, colorLight: "#3F6212", colorDark: "#A3E635" },
    { tier: 6, name: "Chief Resident", minLevel: 60, maxLevel: 74, colorLight: "#C2410C", colorDark: "#FB923C" },
    { tier: 7, name: "Internist Specialist", minLevel: 75, maxLevel: 89, colorLight: "#B45309", colorDark: "#FBBF24" },
    { tier: 8, name: "Senior Consultant", minLevel: 90, maxLevel: 100, colorLight: "#1C1917", colorDark: "#F59E0B" }
  ];

  // Stepped Level Thresholds
  // 1-10: 1,500 XP/level (Cumulative 0 - 15,000)
  // 11-20: 3,000 XP/level (Cumulative 15,000 - 45,000)
  // 21-35: 5,000 XP/level (Cumulative 45,000 - 120,000)
  // 36-50: 8,500 XP/level (Cumulative 120,000 - 247,500)
  // 51-65: 13,000 XP/level (Cumulative 247,500 - 442,500)
  // 66-80: 20,000 XP/level (Cumulative 442,500 - 742,500)
  // 81-95: 30,000 XP/level (Cumulative 742,500 - 1,192,500)
  // 96-100: 50,000 XP/level (Cumulative 1,192,500 - 1,442,500+)
  function getLevelFromXP(totalXP) {
    let xp = Math.max(0, totalXP || 0);
    const ranges = [
      { startL: 1, endL: 10, cost: 1500 },
      { startL: 11, endL: 20, cost: 3000 },
      { startL: 21, endL: 35, cost: 5000 },
      { startL: 36, endL: 50, cost: 8500 },
      { startL: 51, endL: 65, cost: 13000 },
      { startL: 66, endL: 80, cost: 20000 },
      { startL: 81, endL: 95, cost: 30000 },
      { startL: 96, endL: 100, cost: 50000 }
    ];

    let currentLvl = 1;
    let accumulated = 0;
    let lvlStartXP = 0;
    let lvlCost = 1500;

    for (let r of ranges) {
      let levelsInRange = r.endL - r.startL + 1;
      let rangeTotalXP = levelsInRange * r.cost;

      if (xp >= accumulated + rangeTotalXP) {
        accumulated += rangeTotalXP;
        currentLvl = r.endL + 1;
      } else {
        let diff = xp - accumulated;
        let lvlsGained = Math.floor(diff / r.cost);
        currentLvl = r.startL + lvlsGained;
        lvlStartXP = accumulated + lvlsGained * r.cost;
        lvlCost = r.cost;
        break;
      }
    }

    if (currentLvl > 100) {
      currentLvl = 100;
      lvlStartXP = 1392500;
      lvlCost = 50000;
    }

    let progressInLevel = Math.min(lvlCost, Math.max(0, xp - lvlStartXP));
    let pct = Math.min(100, Math.round((progressInLevel / lvlCost) * 100));

    // Find Tier
    let tierObj = CLINICAL_TIERS.find(t => currentLvl >= t.minLevel && currentLvl <= t.maxLevel) || CLINICAL_TIERS[0];

    return {
      level: currentLvl,
      tier: tierObj.tier,
      tierName: tierObj.name,
      tierColorLight: tierObj.colorLight,
      tierColorDark: tierObj.colorDark,
      currentLevelXP: progressInLevel,
      requiredLevelXP: lvlCost,
      progressPct: pct,
      totalXP: xp
    };
  }

  // Answer Streak Multiplier
  function getStreakMultiplier(streak) {
    if (streak >= 10) return 2.0;
    if (streak >= 5) return 1.5;
    if (streak >= 3) return 1.2;
    return 1.0;
  }

  // Speed Bonus (<15s)
  function calculateSpeedBonus(spentSec) {
    if (spentSec >= 15) return 0;
    // Linear from 15s -> 0 bonus, 1s -> 50 bonus
    const ratio = (15 - spentSec) / 14;
    return Math.round(10 + ratio * 40); // 10 to 50 pts
  }

  const CLINICAL_ACHIEVEMENTS = [
    // --- General & Mastery Badges (11) ---
    {
      id: "first_steps",
      title: "First Blood",
      desc: "Complete your first clinical quiz session.",
      icon: "sparkles",
      accent: "blue"
    },
    {
      id: "streak_3",
      title: "3-Day On-Call",
      desc: "Maintain a 3-day active study streak.",
      icon: "flame",
      accent: "amber"
    },
    {
      id: "streak_7",
      title: "Weekly Attending",
      desc: "Maintain a 7-day active study streak.",
      icon: "flame",
      accent: "coral"
    },
    {
      id: "streak_30",
      title: "Iron Internist",
      desc: "Maintain a 30-day active study streak.",
      icon: "flame",
      accent: "purple"
    },
    {
      id: "sharp_80",
      title: "Sharp Diagnostician",
      desc: "Score >= 85% accuracy in a session of >= 10 questions.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "perfect_round",
      title: "Flawless Ward Round",
      desc: "Score 100% accuracy in a session of >= 10 questions.",
      icon: "award",
      accent: "purple"
    },
    {
      id: "speed_consultant",
      title: "Speed Consultant",
      desc: "Answer >= 5 questions under 10s with >= 80% accuracy in one session.",
      icon: "zap",
      accent: "amber"
    },
    {
      id: "board_centurion",
      title: "Board Centurion",
      desc: "Answer 100 total clinical questions.",
      icon: "shield",
      accent: "blue"
    },
    {
      id: "papdi_scholar",
      title: "PAPDI Scholar",
      desc: "Answer 500 total clinical questions.",
      icon: "book",
      accent: "purple"
    },
    {
      id: "xp_5000",
      title: "Night Shift Grinder",
      desc: "Earn 5,000 total clinical XP.",
      icon: "zap",
      accent: "amber"
    },
    {
      id: "xp_25000",
      title: "Senior Consultant",
      desc: "Earn 25,000 total clinical XP.",
      icon: "trophy",
      accent: "purple"
    },
    // --- Division Mastery Badges (13) ---
    {
      id: "tropik_specialist",
      title: "Outbreak Hunter",
      desc: "Tropik & Infeksi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "tropik_master",
      title: "Stewardship Guardian",
      desc: "Tropik & Infeksi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "kardio_specialist",
      title: "Coronary First Responder",
      desc: "Kardiologi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "coral"
    },
    {
      id: "kardio_master",
      title: "Apex Cardiologist",
      desc: "Kardiologi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "coral"
    },
    {
      id: "pulmo_specialist",
      title: "Ventilator Virtuoso",
      desc: "Pulmonologi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "pulmo_master",
      title: "Critical Care Commander",
      desc: "Pulmonologi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "geh_specialist",
      title: "Hepato-Biliary Ace",
      desc: "GEH: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "amber"
    },
    {
      id: "geh_master",
      title: "Endoscopy Maestro",
      desc: "GEH: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "amber"
    },
    {
      id: "nefro_specialist",
      title: "Nephron Balancer",
      desc: "Ginjal & Hipertensi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "nefro_master",
      title: "Electrolyte Alchemist",
      desc: "Ginjal & Hipertensi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "endo_specialist",
      title: "Glycemic Tactician",
      desc: "Endokrin & Metabolik: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "amber"
    },
    {
      id: "endo_master",
      title: "Metabolic Architect",
      desc: "Endokrin & Metabolik: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "hom_specialist",
      title: "Marrow Guardian",
      desc: "Hematologi Onkologi Medik: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "coral"
    },
    {
      id: "hom_master",
      title: "Apex Hematologist-Oncologist",
      desc: "Hematologi Onkologi Medik: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "reuma_specialist",
      title: "Autoimmune Navigator",
      desc: "Reumatologi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "reuma_master",
      title: "Apex Rheumatologist",
      desc: "Reumatologi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "geri_specialist",
      title: "Geriatric Steward",
      desc: "Geriatri: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "amber"
    },
    {
      id: "geri_master",
      title: "Apex Geriatrician",
      desc: "Geriatri: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "alergi_specialist",
      title: "Immunology Sentinel",
      desc: "Alergi Imunologi: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "blue"
    },
    {
      id: "alergi_master",
      title: "Apex Allergist-Immunologist",
      desc: "Alergi Imunologi: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "psiko_specialist",
      title: "Biopsychosocial Healer",
      desc: "Psikosomatik & Paliatif: >= 40 questions answered with >= 80% accuracy.",
      icon: "target",
      accent: "amber"
    },
    {
      id: "psiko_master",
      title: "Apex Palliative Internist",
      desc: "Psikosomatik & Paliatif: >= 100 questions answered with >= 85% accuracy.",
      icon: "trophy",
      accent: "purple"
    },
    {
      id: "omni_internist",
      title: "Omni-Internist",
      desc: "Score >= 80% accuracy across all 11 active divisions (>= 20 questions each).",
      icon: "award",
      accent: "purple"
    }
  ];

  function getPerformanceRank(accuracy) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
    if (pct >= 90) {
      return { rank: "S", label: "Sangat Menguasai", badgeClass: "rank-badge-s", xpBonus: 40 };
    }
    if (pct >= 80) {
      return { rank: "A", label: "Klinisi Andal", badgeClass: "rank-badge-a", xpBonus: 25 };
    }
    if (pct >= 65) {
      return { rank: "B", label: "Terus Pertajam", badgeClass: "rank-badge-b", xpBonus: 10 };
    }
    return { rank: "C", label: "Perlu Review", badgeClass: "rank-badge-c", xpBonus: 0 };
  }

  function evaluateAchievements(state, sessionStats) {
    const safeState = state || {};
    const unlocked = new Set(Array.isArray(safeState.unlockedAchievements) ? safeState.unlockedAchievements : []);
    const history = Array.isArray(safeState.quizHistory) ? safeState.quizHistory : [];
    const divStats = safeState.divisionStats || {};
    const streak = Number(safeState.streakCount || 0);
    const xp = Number(safeState.xp || 0);
    const totalQ = history.length;
    const sessionAcc = sessionStats ? Number(sessionStats.accuracy || 0) : 0;
    const sessionTotal = sessionStats ? Number(sessionStats.total || 0) : 0;
    const sessionCorrect = sessionStats ? Number(sessionStats.correct || 0) : 0;
    const fastCorrect = sessionStats ? Number(sessionStats.fastCorrectCount || 0) : 0;

    function hasDivMastery(divId, minQ, minAcc) {
      const d = divStats[divId];
      if (!d || d.attempted < minQ) return false;
      return (d.correct / d.attempted) * 100 >= minAcc;
    }

    const activeDivs = [
      "tropik-infeksi",
      "kardiologi",
      "pulmonologi",
      "gastroenterohepatologi",
      "ginjal-hipertensi",
      "endokrin-metabolik",
      "hematologi-onkologi",
      "reumatologi",
      "geriatri",
      "alergi-imunologi",
      "psikosomatik-paliatif"
    ];
    const omniOk = activeDivs.every((id) => hasDivMastery(id, 20, 80));

    const checks = {
      first_steps: totalQ >= 1 || sessionTotal >= 1,
      streak_3: streak >= 3,
      streak_7: streak >= 7,
      streak_30: streak >= 30,
      sharp_80: sessionTotal >= 10 && sessionAcc >= 85,
      perfect_round: sessionTotal >= 10 && sessionCorrect === sessionTotal,
      speed_consultant: sessionTotal >= 5 && sessionAcc >= 80 && fastCorrect >= 5,
      board_centurion: totalQ >= 100,
      papdi_scholar: totalQ >= 500,
      xp_5000: xp >= 5000,
      xp_25000: xp >= 25000,
      tropik_specialist: hasDivMastery("tropik-infeksi", 40, 80),
      tropik_master: hasDivMastery("tropik-infeksi", 100, 85),
      kardio_specialist: hasDivMastery("kardiologi", 40, 80),
      kardio_master: hasDivMastery("kardiologi", 100, 85),
      pulmo_specialist: hasDivMastery("pulmonologi", 40, 80),
      pulmo_master: hasDivMastery("pulmonologi", 100, 85),
      geh_specialist: hasDivMastery("gastroenterohepatologi", 40, 80),
      geh_master: hasDivMastery("gastroenterohepatologi", 100, 85),
      nefro_specialist: hasDivMastery("ginjal-hipertensi", 40, 80),
      nefro_master: hasDivMastery("ginjal-hipertensi", 100, 85),
      endo_specialist: hasDivMastery("endokrin-metabolik", 40, 80),
      endo_master: hasDivMastery("endokrin-metabolik", 100, 85),
      hom_specialist: hasDivMastery("hematologi-onkologi", 40, 80),
      hom_master: hasDivMastery("hematologi-onkologi", 100, 85),
      reuma_specialist: hasDivMastery("reumatologi", 40, 80),
      reuma_master: hasDivMastery("reumatologi", 100, 85),
      geri_specialist: hasDivMastery("geriatri", 40, 80),
      geri_master: hasDivMastery("geriatri", 100, 85),
      alergi_specialist: hasDivMastery("alergi-imunologi", 40, 80),
      alergi_master: hasDivMastery("alergi-imunologi", 100, 85),
      psiko_specialist: hasDivMastery("psikosomatik-paliatif", 40, 80),
      psiko_master: hasDivMastery("psikosomatik-paliatif", 100, 85),
      omni_internist: omniOk
    };

    const newlyUnlocked = [];
    for (const ach of CLINICAL_ACHIEVEMENTS) {
      if (!unlocked.has(ach.id) && checks[ach.id]) {
        unlocked.add(ach.id);
        newlyUnlocked.push(ach);
      }
    }
    return {
      unlockedIds: Array.from(unlocked),
      newlyUnlocked
    };
  }

  let sharedAudioCtx = null;
  function playClinicalFeedbackTone(kind, enabled) {
    if (enabled === false || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
      if (sharedAudioCtx.state === "suspended" && typeof sharedAudioCtx.resume === "function") {
        sharedAudioCtx.resume().catch(function () {});
      }
      const now = sharedAudioCtx.currentTime;
      const playNote = function (freq, startOffset, duration, type, peakGain) {
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, now + startOffset);
        gain.gain.setValueAtTime(0.0001, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(peakGain || 0.06, now + startOffset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration + 0.02);
      };

      if (kind === "correct") {
        playNote(587.33, 0, 0.14, "sine", 0.065); // D5
        playNote(880.0, 0.08, 0.18, "sine", 0.06); // A5
      } else if (kind === "wrong") {
        playNote(246.94, 0, 0.16, "triangle", 0.045); // B3
        playNote(196.0, 0.09, 0.2, "triangle", 0.04); // G3
      } else if (kind === "fanfare") {
        playNote(523.25, 0, 0.14, "sine", 0.055); // C5
        playNote(659.25, 0.09, 0.14, "sine", 0.055); // E5
        playNote(783.99, 0.18, 0.18, "sine", 0.06); // G5
        playNote(1046.5, 0.28, 0.28, "sine", 0.065); // C6
      }
    } catch (_) {
      // Safe no-op in headless or restricted audio contexts
    }
  }

  window.InternaGamification = {
    CLINICAL_TIERS,
    CLINICAL_ACHIEVEMENTS,
    getLevelFromXP,
    calculateLevelProgress: getLevelFromXP,
    getStreakMultiplier,
    calculateSpeedBonus,
    getPerformanceRank,
    evaluateAchievements,
    playClinicalFeedbackTone
  };
})();
