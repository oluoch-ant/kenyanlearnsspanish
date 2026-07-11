/* ==================================================================================
   Language Teacher — gamified dashboard prototype
   React 18 (inlined UMD) + htm + Tailwind (inlined engine). No external requests.
   ================================================================================== */
const { useState, useEffect, useMemo, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

/* ==================== GAMIFICATION CONFIG (single source of truth) ==================== */
const CFG = {
  QUESTIONS_PER_LESSON: 5,
  XP: {
    lessonBase: 10,        // completing any lesson
    perCorrect: 4,         // first-attempt correct answers carry the payout
    perfectBonus: 10,      // 100% first-attempt accuracy
    speedBonus: 5,         // avg answer <= speedSec AND accuracy >= speedAccGate
    speedSec: 7,
    speedAccGate: 0.8,     // stops speed-spamming wrong answers
    firstOfDayBonus: 10,   // lands a typical first lesson at/above the daily goal
  },
  // multiplier is the OUTERMOST factor (applied after decay), computed on the streak
  // AFTER today's increment — the lesson that extends you to day 3 already earns ×1.1
  STREAK_TIERS: [
    { min: 30, mult: 1.5,  label: "×1.5" },
    { min: 14, mult: 1.3,  label: "×1.3" },
    { min: 7,  mult: 1.2,  label: "×1.2" },
    { min: 3,  mult: 1.1,  label: "×1.1" },
    { min: 0,  mult: 1.0,  label: "×1" },
  ],
  ORDINAL_DECAY: [1, 1, 1, 0.75, 0.5, 0.25], // 1st..5th lesson today, then 6th+
  REPEAT_DECAY: [1, 0.5, 0.25],              // same lesson repeated the same day
  DAILY_GOAL: 35,          // one good first lesson (10 + 4×4 + 10) clears it — no near-miss
  WEEKLY_GOAL: 210,        // 6 × daily: tolerates one rest day per week
  FREEZE_MAX: 2,
  AT_RISK_HOUR: 18,        // 6pm local: unpracticed flame turns amber
  URGENT_HOUR: 21,         // 9pm: copy escalates
  REPAIR_MIN_STREAK: 7,    // broken streaks >= 7 days get a same-day repair offer
  REPAIR_LESSONS: 3,
  REPAIR_COOLDOWN_DAYS: 30,
  levelStep: l => 25 * (l + 1),   // closed-form curve: L2@50, L5@350, L10@1350 total XP
};

const streakTier = s => CFG.STREAK_TIERS.find(t => s >= t.min);
function levelInfo(totalXP) {
  let level = 1, rest = totalXP;
  while (rest >= CFG.levelStep(level)) { rest -= CFG.levelStep(level); level++; }
  return { level, into: rest, needed: CFG.levelStep(level) };
}

/* ==================== PERSISTED STATE ==================== */
const STORE = "oluochAprende.v1";   // namespaced so progress survives revisits without clashing
const DAY_MS = 86400000;

function seedState() {
  // A believable mid-journey Thursday: 5-day streak banked through yesterday,
  // today still unpracticed — the demo opens with something at stake.
  return {
    anchor: Date.now(),          // real timestamp for simulated dayIndex 3
    anchorDay: 3,
    dayIndex: 3,                 // Thu (weekStartDay 0 = Mon)
    weekStartDay: 0,
    streak: 5,
    bestStreak: 11,
    lastEarnedDay: 2,            // yesterday
    freezes: 1,
    repair: null,                // {prevCount, day} while a same-day repair offer is live
    lastRepairDay: null,
    todayXP: 0,
    weekXP: 125,
    totalXP: 645,
    xpByLang: { es: 645 },
    lessonsToday: {},
    history: {                   // dayIndex -> XP earned that day
      "-24": 45, "-23": 60, "-22": 0, "-21": 35, "-20": 85, "-19": 40, "-18": 0,
      "-17": 0, "-16": 55, "-15": 70, "-14": 40, "-13": 90, "-12": 35, "-11": 60,
      "-10": 45, "-9": 0, "-8": 0, "-7": 30, "-6": 0, "-5": 0, "-4": 0,
      "-3": 0, "-2": 40, "-1": 65, "0": 40, "1": 30, "2": 55,
    },
    progress: {                  // lesson progress
      es: { "es-greet": { times: 2, bestAcc: 100 }, "es-num": { times: 1, bestAcc: 80 },
            "es-family": { times: 1, bestAcc: 100 }, "es-food": { times: 1, bestAcc: 60 },
            "es-color": { times: 1, bestAcc: 80 } },
    },
    badges: { first: true, perfect: true },
    notice: null,                // one-shot morning notice: {icon, title, body}
  };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.anchor) return s;
  } catch (e) {}
  return seedState();
}

/* ==================== DERIVED HELPERS ==================== */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function simDate(st, dayIndex = st.dayIndex) {
  return new Date(st.anchor + (dayIndex - st.anchorDay) * DAY_MS);
}
function fmtDate(st) {
  return simDate(st).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
const daysIntoWeek = st => st.dayIndex - st.weekStartDay;          // 0..6
const earnedToday = st => st.lastEarnedDay === st.dayIndex;
const streakAlive = st => st.streak > 0;

function flameMode(st, hour) {
  if (earnedToday(st)) return "earned";                            // safe & banked
  if (streakAlive(st) && hour >= CFG.AT_RISK_HOUR) return "risk";  // evening, nothing banked
  if (streakAlive(st)) return "waiting";                           // lit, today still open
  return "dead";
}

/* deterministic pseudo-random for rival XP (stable across re-renders) */
function dhash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
function rivalWeekXP(r, st) {
  let xp = 0;
  for (let d = 0; d <= daysIntoWeek(st); d++) {
    const roll = dhash(r.id + ":" + (st.weekStartDay + d));
    if (roll > 0.18) xp += Math.round(25 + roll * (r.base / 4));   // rivals skip days too
  }
  return xp;
}

/* lesson unlock rules: sequential within a unit; a unit opens when the previous
   unit has >= 3 completed lessons (or all, if it has fewer) */
function lessonStates(lang, prog) {
  const units = LANGS[lang].units;
  const states = {};
  let prevUnitDone = 0, prevUnitSize = 0, unitOpen = true;
  units.forEach((u, ui) => {
    if (ui > 0) unitOpen = unitOpen && prevUnitDone >= Math.min(3, prevUnitSize);
    let prevLessonDone = true;
    let doneCount = 0;
    u.lessons.forEach(l => {
      const p = prog[l.id];
      if (p && p.times > 0) { states[l.id] = "done"; doneCount++; prevLessonDone = true; }
      else if (unitOpen && prevLessonDone) { states[l.id] = "next"; prevLessonDone = false; }
      else { states[l.id] = "locked"; }
    });
    prevUnitDone = doneCount; prevUnitSize = u.lessons.length;
  });
  return states;
}

/* ==================== XP ENGINE ==================== */
const lessonsCompletedToday = st => Object.values(st.lessonsToday).reduce((a, b) => a + b, 0);

/* XP = max(1, round( D × decay × streakMult )) — one atomic award, one rounding.
   D = base + firstAttemptCorrect×4 + perfect + speed + firstOfDay
   decay = min(ordinal decay for today's lesson count, repeat decay for this lesson)
   streakMult uses the streak AFTER today's prospective increment. */
function scoreLesson(st, lessonId, correct, total, avgSec) {
  const x = CFG.XP;
  const lines = [];
  let D = x.lessonBase;
  lines.push({ label: "Lesson complete", xp: x.lessonBase });
  const c = correct * x.perCorrect;
  D += c;
  lines.push({ label: `Correct answers × ${correct}`, xp: c });
  if (correct === total) { D += x.perfectBonus; lines.push({ label: "Perfect lesson", xp: x.perfectBonus, hot: true }); }
  if (avgSec <= x.speedSec && correct / total >= x.speedAccGate) {
    D += x.speedBonus;
    lines.push({ label: `Quick thinking (≤${x.speedSec}s avg)`, xp: x.speedBonus });
  }
  const firstOfDay = lessonsCompletedToday(st) === 0;
  if (firstOfDay) { D += x.firstOfDayBonus; lines.push({ label: "First lesson today", xp: x.firstOfDayBonus }); }

  const ordinal = lessonsCompletedToday(st);                        // this lesson's index today (0-based)
  const ordDecay = CFG.ORDINAL_DECAY[Math.min(ordinal, CFG.ORDINAL_DECAY.length - 1)];
  const repDecay = CFG.REPEAT_DECAY[Math.min(st.lessonsToday[lessonId] || 0, CFG.REPEAT_DECAY.length - 1)];
  const decay = Math.min(ordDecay, repDecay);
  const afterDecay = D * decay;
  if (decay < 1) lines.push({ label: repDecay < ordDecay ? `Repeat lesson today (×${decay})` : `Daily fatigue (×${decay})`, xp: Math.round(afterDecay) - D, dim: true });

  const prospectiveStreak = earnedToday(st) ? st.streak : st.streak + 1;
  const tier = streakTier(prospectiveStreak);
  const totalXPGain = Math.max(1, Math.round(afterDecay * tier.mult));
  if (tier.mult > 1) lines.push({ label: `Streak bonus ${tier.label}`, xp: totalXPGain - Math.round(afterDecay), hot: true });

  return { lines, total: totalXPGain };
}

function applyLesson(st, lang, lessonId, correct, total, avgSec, hour) {
  const s = { ...st, lessonsToday: { ...st.lessonsToday }, xpByLang: { ...st.xpByLang },
              progress: { ...st.progress, [lang]: { ...st.progress[lang] } },
              badges: { ...st.badges }, history: { ...st.history } };
  const score = scoreLesson(st, lessonId, correct, total, avgSec);
  const events = [];

  s.todayXP += score.total;
  s.weekXP += score.total;
  s.totalXP += score.total;
  s.xpByLang[lang] = (s.xpByLang[lang] || 0) + score.total;
  s.lessonsToday[lessonId] = (s.lessonsToday[lessonId] || 0) + 1;

  const prev = s.progress[lang][lessonId] || { times: 0, bestAcc: 0 };
  const acc = Math.round((correct / total) * 100);
  s.progress[lang][lessonId] = { times: prev.times + 1, bestAcc: Math.max(prev.bestAcc, acc) };

  // streak day banks at the FIRST completed lesson of the day — binary and legible
  if (!earnedToday(s)) {
    s.streak += 1;
    s.lastEarnedDay = s.dayIndex;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    events.push({ type: "streak", value: s.streak });
    if (s.streak > 0 && s.streak % 7 === 0) {              // freeze faucet: 1 per 7 streak days
      if (s.freezes < CFG.FREEZE_MAX) { s.freezes += 1; events.push({ type: "freeze", value: s.freezes }); }
      else events.push({ type: "freezecap" });             // at cap: say so, don't read as a bug
    }
  }

  // same-day streak repair: 3 completed lessons restore a broken >=7-day streak
  if (s.repair && s.repair.day === s.dayIndex && lessonsCompletedToday(s) >= CFG.REPAIR_LESSONS) {
    s.streak = s.repair.prevCount + 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.lastEarnedDay = s.dayIndex;
    s.lastRepairDay = s.dayIndex;
    s.repair = null;
    events.push({ type: "repair", value: s.streak });
  }

  const before = levelInfo(st.totalXP).level, after = levelInfo(s.totalXP).level;
  if (after > before) events.push({ type: "level", value: after });

  // badges
  const earn = id => { if (!s.badges[id]) { s.badges[id] = true; events.push({ type: "badge", value: id }); } };
  earn("first");
  if (correct === total) earn("perfect");
  if (s.streak >= 7) earn("flame7");
  if (s.streak >= 30) earn("flame30");
  if (s.totalXP >= 1000) earn("xp1k");
  if (s.weekXP >= CFG.WEEKLY_GOAL) earn("goal");
  if (hour >= 22) earn("owl");

  return { state: s, score, events };
}

/* day rollover — the demo "sleep" button */
function advanceDay(st) {
  const s = { ...st, history: { ...st.history } };
  s.history[s.dayIndex] = s.todayXP;
  let notice = null;
  s.repair = s.repair && s.repair.day === s.dayIndex ? null : s.repair;   // unfinished repair expires
  if (!earnedToday(s) && streakAlive(s)) {
    if (s.freezes > 0) {
      s.freezes -= 1;
      notice = { icon: "🧊", title: "Streak freeze used", body: `Your ${s.streak}-day streak survived the night. ${s.freezes} freeze${s.freezes === 1 ? "" : "s"} left.` };
    } else {
      const repairable = s.streak >= CFG.REPAIR_MIN_STREAK &&
        (s.lastRepairDay == null || s.dayIndex + 1 - s.lastRepairDay >= CFG.REPAIR_COOLDOWN_DAYS);
      if (repairable) {
        s.repair = { prevCount: s.streak, day: s.dayIndex + 1 };
        notice = { icon: "🛠️", title: `${s.streak}-day streak broken — repairable`, body: `Finish ${CFG.REPAIR_LESSONS} lessons today to restore it. One repair per ${CFG.REPAIR_COOLDOWN_DAYS} days.` };
      } else {
        notice = { icon: "💔", title: `${s.streak}-day streak lost`, body: `Fresh start today — your best (${s.bestStreak} days) is still on the books.` };
      }
      s.streak = 0;
    }
  }
  s.dayIndex += 1;
  s.todayXP = 0;
  s.lessonsToday = {};
  if (s.dayIndex - s.weekStartDay >= 7) { s.weekStartDay += 7; s.weekXP = 0; }
  s.notice = notice;
  return s;
}

/* ==================== SMALL UI ATOMS ==================== */
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf, t0;
    const step = t => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const GradDefs = () => html`
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <linearGradient id="emberGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#ff6200" /><stop offset="100%" stopColor="#ff9500" />
      </linearGradient>
      <linearGradient id="coreGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#ffcc00" /><stop offset="100%" stopColor="#fff3c4" />
      </linearGradient>
      <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0071e3" /><stop offset="100%" stopColor="#64d2ff" />
      </linearGradient>
    </defs>
  </svg>`;

function Flame({ size = 24, mode = "earned", className = "" }) {
  const lit = mode === "earned" || mode === "waiting" || mode === "risk";
  const outer = lit ? "url(#emberGrad)" : "#c7c7cc";
  const core = lit ? "url(#coreGrad)" : "#e8e8ed";
  return html`
    <svg width=${size} height=${size} viewBox="0 0 24 24" className=${(lit && mode !== "dead" ? "flame-live " : "") + className} aria-hidden="true">
      <path d="M12 2 C9.2 6.2 5 8.6 5 13.2 a7 7 0 0 0 14 0 C19 8.6 14.8 6.2 12 2 Z" fill=${outer} opacity=${mode === "waiting" ? .8 : 1} />
      <path d="M12 8.4 C10.6 10.4 8.9 11.6 8.9 13.9 a3.1 3.1 0 0 0 6.2 0 C15.1 11.6 13.4 10.4 12 8.4 Z" fill=${core} />
    </svg>`;
}

function Ring({ value, goal, size = 190, stroke = 13, children }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const frac = Math.min(1, value / goal);
  return html`
    <div className="relative" style=${{ width: size, height: size }}>
      <svg width=${size} height=${size} className="-rotate-90" role="img" aria-label=${`Weekly XP: ${value} of ${goal}`}>
        <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke="#e8e8ed" strokeWidth=${stroke} />
        <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke="url(#ringGrad)" strokeWidth=${stroke}
          strokeLinecap="round" strokeDasharray=${C} strokeDashoffset=${C * (1 - frac)} className="ring-anim" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">${children}</div>
    </div>`;
}

function Confetti({ fire }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!fire || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current, ctx = cv.getContext("2d");
    cv.width = cv.offsetWidth; cv.height = cv.offsetHeight;
    const colors = ["#0071e3", "#64d2ff", "#ff9500", "#1d9a3c"];
    const ps = Array.from({ length: 42 }, () => ({
      x: cv.width / 2, y: cv.height * .42,
      vx: (Math.random() - .5) * 9, vy: -4 - Math.random() * 6,
      s: 3 + Math.random() * 4, c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6,
    }));
    let frames = 0, raf;
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .25; p.rot += .1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore();
      });
      if (++frames < 80) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  return html`<canvas ref=${ref} className="absolute inset-0 pointer-events-none" aria-hidden="true"></canvas>`;
}

/* ==================== LESSON MODAL ==================== */
function LessonModal({ lang, lesson, state, onClose, onComplete }) {
  const bank = BANKS[lesson.id];
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);      // option index after answering
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState("question");  // question | summary
  const [result, setResult] = useState(null);      // {score, events, hour}
  const t0 = useRef(Date.now());
  const answerMs = useRef(0);
  const applied = useRef(false);
  const dlgRef = useRef(null);
  // put keyboard focus inside the dialog on open and on each new question
  useEffect(() => { if (dlgRef.current) dlgRef.current.focus(); }, [qi, phase]);

  const q = bank[qi];

  const pick = i => {
    if (picked !== null) return;
    answerMs.current += Date.now() - t0.current;
    setPicked(i);
    if (i === q.a) setCorrectCount(c => c + 1);
  };
  const next = () => {
    if (qi + 1 < bank.length) { setQi(qi + 1); setPicked(null); t0.current = Date.now(); }
    else finish();
  };
  const finish = () => {
    if (applied.current) return;
    applied.current = true;
    const finalCorrect = correctCount;
    const avgSec = answerMs.current / bank.length / 1000;
    const hour = new Date().getHours();
    const out = applyLesson(state, lang, lesson.id, finalCorrect, bank.length, avgSec, hour);
    setResult({ ...out, correct: finalCorrect, total: bank.length });
    setPhase("summary");
    onComplete(out.state);   // commit immediately so the dashboard behind updates live
  };

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/80 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label=${lesson.title} ref=${dlgRef} tabIndex="-1"
           className="pop-in relative w-full max-w-lg bg-panel border border-stroke rounded-3xl shadow-lift overflow-hidden outline-none">
        ${phase === "question" ? html`
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">${lesson.icon}</span>
                <span className="font-bold truncate">${lesson.title}</span>
              </div>
              <button onClick=${onClose} aria-label="Quit lesson"
                className="shrink-0 w-10 h-10 rounded-full border border-stroke text-mist hover:text-ink hover:border-mist">✕</button>
            </div>
            <div className="flex gap-1.5 mb-6" role="img" aria-label=${`Question ${qi + 1} of ${bank.length}`}>
              ${bank.map((_, i) => html`<div key=${i} className=${"h-1.5 flex-1 rounded-full " + (i < qi ? "bg-sage" : i === qi ? "bg-gradient-to-r from-ember to-coral" : "bg-panel2")}></div>`)}
            </div>
            <p className="text-xs uppercase tracking-widest text-mist font-bold mb-2">Question ${qi + 1} / ${bank.length}</p>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-6" style=${{ textWrap: "balance" }}>${q.q}</h2>
            <div className="grid gap-2.5">
              ${q.o.map((opt, i) => {
                let cls = "bg-panel2 border-stroke hover:border-ember hover:translate-x-1";
                if (picked !== null) {
                  if (i === q.a) cls = "bg-sage/15 border-sage text-sage";
                  else if (i === picked) cls = "bg-rose/15 border-rose text-rose";
                  else cls = "bg-panel2 border-stroke opacity-50";
                }
                return html`
                  <button key=${i} disabled=${picked !== null} onClick=${() => pick(i)}
                    className=${"text-left px-4 py-3.5 rounded-xl border font-semibold transition-all " + cls}>
                    ${opt}
                  </button>`;
              })}
            </div>
            <div className="mt-6 min-h-12">
              ${picked !== null && html`
                <div className="flex items-center justify-between gap-3 fade-up">
                  <p className=${"font-bold " + (picked === q.a ? "text-sage" : "text-rose")}>
                    ${picked === q.a ? "¡Correcto!" : `Answer: ${q.o[q.a]}`}
                  </p>
                  <button onClick=${next} autoFocus
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-ember to-coral text-night font-extrabold">
                    ${qi + 1 < bank.length ? "Next" : "Finish"}
                  </button>
                </div>`}
            </div>
          </div>` : html`
          <${Summary} result=${result} onClose=${onClose} />`}
      </div>
    </div>`;
}

function Summary({ result, onClose }) {
  const { score, events, correct, total, state: st } = result;
  const [stage, setStage] = useState(0);
  const shownTotal = useCountUp(stage >= 1 ? score.total : 0, 800);
  const acc = Math.round((correct / total) * 100);
  const leveled = events.find(e => e.type === "level");
  const streaked = events.find(e => e.type === "streak");
  const froze = events.find(e => e.type === "freeze");
  const frozeCap = events.find(e => e.type === "freezecap");
  const repaired = events.find(e => e.type === "repair");
  const badges = events.filter(e => e.type === "badge");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setStage(3); return; }
    const ts = [setTimeout(() => setStage(1), 350), setTimeout(() => setStage(2), 1250), setTimeout(() => setStage(3), 1850)];
    return () => ts.forEach(clearTimeout);
  }, []);

  return html`
    <div className="relative p-6 sm:p-8 text-center">
      <${Confetti} fire=${stage >= 2 && (leveled || streaked || repaired)} />
      <p className="text-xs uppercase tracking-widest text-mist font-bold">Lesson complete</p>
      <p className=${"font-display text-4xl font-extrabold mt-2 " + (acc === 100 ? "text-sage" : "text-ink")}>${acc}%</p>
      <p className="text-mist text-sm mt-1">${correct} of ${total} correct</p>

      <div className="mt-6 bg-night/50 border border-stroke rounded-2xl p-4 text-left">
        ${score.lines.map((l, i) => html`
          <div key=${i} className=${"flex justify-between py-1 text-sm " + (stage >= 1 ? "fade-up " : "opacity-0 ") + (l.dim ? "text-mist" : l.hot ? "text-ember font-bold" : "text-ink")}
               style=${{ animationDelay: `${i * 90}ms` }}>
            <span>${l.label}</span><span className="tnum">${l.xp >= 0 ? "+" : ""}${l.xp} XP</span>
          </div>`)}
        <div className="border-t border-stroke mt-2 pt-2 flex justify-between items-baseline">
          <span className="font-bold">Total</span>
          <span className="font-display text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-ember to-coral tnum">+${shownTotal} XP</span>
        </div>
      </div>

      ${stage >= 2 && html`
        <div className="mt-4 grid gap-2">
          ${repaired ? html`
            <div className="fade-up flex items-center justify-center gap-2 bg-gold/10 border border-gold/50 rounded-xl py-2.5 font-bold text-[#b25000]">
              🛠️ Streak repaired — back to day ${repaired.value}!
            </div>` : streaked && html`
            <div className="fade-up flex items-center justify-center gap-2 bg-ember/10 border border-ember/40 rounded-xl py-2.5 font-bold text-ember">
              <${Flame} size=${20} mode="earned" /> Day ${streaked.value} banked — streak safe until midnight
            </div>`}
          ${froze && html`
            <div className="fade-up flex items-center justify-center gap-2 bg-panel2 border border-stroke rounded-xl py-2 text-sm font-semibold">
              🧊 Streak freeze earned (${froze.value}/${CFG.FREEZE_MAX})
            </div>`}
          ${frozeCap && html`
            <div className="fade-up flex items-center justify-center gap-2 bg-panel2 border border-stroke rounded-xl py-2 text-sm font-semibold">
              🧊 Freeze cap reached — you're fully stocked (×${CFG.FREEZE_MAX})
            </div>`}
          ${leveled && html`
            <div className="fade-up flex items-center justify-center gap-2 bg-gradient-to-r from-ember/20 to-coral/20 border border-ember/40 rounded-xl py-2.5 font-extrabold">
              🎉 Level ${leveled.value} reached
            </div>`}
          ${badges.map(b => {
            const bd = BADGES.find(x => x.id === b.value);
            return html`<div key=${b.value} className="fade-up flex items-center justify-center gap-2 bg-panel2 border border-stroke rounded-xl py-2 text-sm font-semibold">
              ${bd.icon} Achievement: ${bd.name}</div>`;
          })}
          <div className="fade-up text-xs text-mist mt-1">
            Weekly goal: ${Math.min(st.weekXP, CFG.WEEKLY_GOAL)} / ${CFG.WEEKLY_GOAL} XP
          </div>
        </div>`}

      <button onClick=${onClose} autoFocus
        className=${"mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-ember to-coral text-night font-extrabold text-lg transition-opacity " + (stage >= 3 ? "" : "opacity-40")}>
        Continue
      </button>
    </div>`;
}

/* ==================== SHARED WIDGETS ==================== */
function LessonCard({ lesson, st8, prog, onStart }) {
  const locked = st8 === "locked", done = st8 === "done";
  return html`
    <button onClick=${() => !locked && onStart(lesson)} disabled=${locked}
      aria-label=${`${lesson.title}${locked ? " (locked)" : done ? " (completed)" : ""}`}
      className=${"card-hover text-left p-4 rounded-2xl border relative overflow-hidden " +
        (locked ? "bg-panel/40 border-stroke/50 opacity-55 cursor-not-allowed"
          : done ? "bg-panel border-ember/35"
          : "bg-panel border-stroke hover:border-ember")}>
      <div className="flex items-start justify-between">
        <span className="text-2xl" aria-hidden="true">${locked ? "🔒" : lesson.icon}</span>
        ${done ? html`<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sage/15 text-sage border border-sage/30">${prog.bestAcc}% best</span>`
          : st8 === "next" ? html`<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-ember/15 text-ember border border-ember/30">START</span>` : null}
      </div>
      <p className="font-bold mt-2.5 leading-tight">${lesson.title}</p>
      <p className="text-mist text-xs mt-1">${lesson.blurb}</p>
      ${done && html`<p className="text-[11px] text-mist mt-2">Completed ×${prog.times} · repeats today pay less XP</p>`}
    </button>`;
}

function WeekBars({ st }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = st.weekStartDay + i;
    const xp = d === st.dayIndex ? st.todayXP : (st.history[d] ?? 0);
    return { label: WEEKDAYS[i], xp, isToday: d === st.dayIndex, future: d > st.dayIndex };
  });
  const max = Math.max(CFG.DAILY_GOAL, ...days.map(d => d.xp));
  return html`
    <div className="flex items-end justify-between gap-2 h-24" role="img" aria-label="XP earned each day this week">
      ${days.map(d => html`
        <div key=${d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full h-16 flex items-end">
            <div className=${"w-full rounded-t-md " + (d.future ? "bg-panel2/40" : d.xp >= CFG.DAILY_GOAL ? "bg-gradient-to-t from-ember to-coral" : d.xp > 0 ? "bg-stroke" : "bg-panel2")}
                 style=${{ height: `${Math.max(d.future ? 4 : 8, (d.xp / max) * 100)}%` }}></div>
          </div>
          <span className=${"text-[10px] font-bold " + (d.isToday ? "text-ember" : "text-mist")}>${d.label[0]}</span>
        </div>`)}
    </div>`;
}

/* ==================== VIEWS ==================== */
function HomeView({ st, lang, onStart, hour }) {
  const fm = flameMode(st, hour);
  const li = levelInfo(st.totalXP);
  const prog = st.progress[lang];
  const states = lessonStates(lang, prog);
  const allLessons = LANGS[lang].units.flatMap(u => u.lessons);
  const upNext = allLessons.filter(l => states[l.id] === "next").slice(0, 2);
  const review = allLessons.filter(l => states[l.id] === "done").slice(0, 1);
  const rows = [...upNext, ...review].slice(0, 3);
  const board = [...RIVALS.map(r => ({ ...r, xp: rivalWeekXP(r, st), me: false })), { id: "me", name: "You", flag: LANGS[lang].flag, xp: st.weekXP, me: true }]
    .sort((a, b) => b.xp - a.xp);
  const myRank = board.findIndex(r => r.me) + 1;

  const repairLive = st.repair && st.repair.day === st.dayIndex;
  return html`
    <div className="grid gap-5">
      ${repairLive && html`
        <div className="fade-up bg-panel border border-gold/50 rounded-3xl p-5 flex items-center gap-4">
          <span className="text-3xl" aria-hidden="true">🛠️</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">Repair your ${st.repair.prevCount}-day streak</p>
            <p className="text-sm text-mist mt-0.5">Finish ${CFG.REPAIR_LESSONS} lessons today to restore it — ${lessonsCompletedToday(st)} of ${CFG.REPAIR_LESSONS} done.</p>
          </div>
          <div className="flex gap-1.5 shrink-0" aria-hidden="true">
            ${Array.from({ length: CFG.REPAIR_LESSONS }, (_, i) => html`
              <div key=${i} className=${"w-3 h-3 rounded-full " + (i < lessonsCompletedToday(st) ? "bg-gold" : "bg-panel2 border border-stroke")}></div>`)}
          </div>
        </div>`}
      <div className="grid md:grid-cols-[auto_1fr] gap-5">
        <div className="bg-panel border border-stroke rounded-3xl p-6 flex flex-col sm:flex-row md:flex-col items-center gap-5 shadow-lift">
          <${Ring} value=${st.weekXP} goal=${CFG.WEEKLY_GOAL}>
            <p className="text-[10px] uppercase tracking-widest text-mist font-bold">Weekly XP</p>
            <p className="font-display text-4xl font-extrabold tnum">${st.weekXP}</p>
            <p className="text-mist text-xs tnum">of ${CFG.WEEKLY_GOAL}</p>
          <//>
          <div className="text-center sm:text-left md:text-center">
            <p className="text-sm text-mist">
              ${st.weekXP >= CFG.WEEKLY_GOAL ? "Weekly goal crushed 🎉" : `${CFG.WEEKLY_GOAL - st.weekXP} XP to go · ${7 - daysIntoWeek(st)} day${7 - daysIntoWeek(st) === 1 ? "" : "s"} left`}
            </p>
            <p className="text-xs text-mist mt-1">Today: <span className=${"font-bold tnum " + (st.todayXP >= CFG.DAILY_GOAL ? "text-sage" : "text-ink")}>${st.todayXP}</span> / ${CFG.DAILY_GOAL} XP</p>
          </div>
        </div>

        <div className="grid gap-5 content-start">
          <div className=${"border rounded-3xl p-5 flex items-center gap-4 " + (fm === "risk" ? "bg-gold/10 border-gold/50 at-risk-pulse" : "bg-panel border-stroke")}>
            <${Flame} size=${44} mode=${fm} />
            <div className="flex-1 min-w-0">
              <p className="font-display text-3xl font-extrabold leading-none tnum">${st.streak}<span className="text-base font-bold text-mist ml-1.5">day streak</span></p>
              <p className=${"text-sm mt-1 " + (fm === "risk" ? "text-[#b25000] font-semibold" : "text-mist")}>
                ${fm === "earned" ? "Banked for today — see you tomorrow" :
                  fm === "risk" ? (hour >= CFG.URGENT_HOUR ? "Final hours — one lesson before midnight saves it" : "Evening! One lesson by midnight keeps the flame") :
                  fm === "waiting" ? "One lesson today keeps it alive" :
                  "Do a lesson to light a new flame"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg" role="img" aria-label=${`${st.freezes} streak freezes held`}>${"🧊".repeat(st.freezes) || html`<span className="opacity-30">🧊</span>`}</p>
              <p className="text-[10px] text-mist font-bold uppercase tracking-wide">freezes</p>
            </div>
          </div>

          <div className="bg-panel border border-stroke rounded-3xl p-5">
            <div className="flex justify-between items-baseline mb-2">
              <p className="font-bold">Level ${li.level}</p>
              <p className="text-xs text-mist tnum">${li.into} / ${li.needed} XP</p>
            </div>
            <div className="h-2.5 bg-panel2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-ember to-coral ring-anim" style=${{ width: `${(li.into / li.needed) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-stroke rounded-3xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-bold text-lg">Jump back in — ${LANGS[lang].name}</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          ${rows.map(l => html`<${LessonCard} key=${l.id} lesson=${l} st8=${states[l.id]} prog=${prog[l.id] || {}} onStart=${onStart} />`)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-panel border border-stroke rounded-3xl p-5">
          <h2 className="font-display font-bold text-lg mb-4">This week</h2>
          <${WeekBars} st=${st} />
        </div>
        <div className="bg-panel border border-stroke rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-display font-bold text-lg">League</h2>
            <span className="text-xs text-mist font-bold">#${myRank} of ${board.length}</span>
          </div>
          <div className="grid gap-1">
            ${(myRank <= 4
              ? board.slice(0, 4).map((r, i) => ({ r, rank: i + 1 }))
              : [...board.slice(0, 3).map((r, i) => ({ r, rank: i + 1 })), { r: board[myRank - 1], rank: myRank }]
            ).map(({ r, rank }) => html`
              <div key=${r.id} className=${"flex items-center gap-3 px-3 py-2 rounded-xl " + (r.me ? "bg-ember/10 border border-ember/40" : "")}>
                <span className="w-5 text-center font-bold text-mist tnum">${rank}</span>
                <span aria-hidden="true">${r.flag}</span>
                <span className=${"flex-1 truncate text-sm " + (r.me ? "font-extrabold" : "font-semibold")}>${r.name}</span>
                <span className="text-sm text-mist font-bold tnum">${r.xp} XP</span>
              </div>`)}
          </div>
        </div>
      </div>
    </div>`;
}

function LessonsView({ st, lang, onStart }) {
  const prog = st.progress[lang];
  const states = lessonStates(lang, prog);
  return html`
    <div className="grid gap-6">
      ${LANGS[lang].units.map((u, ui) => {
        const done = u.lessons.filter(l => states[l.id] === "done").length;
        return html`
          <section key=${u.title}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display font-bold text-lg">Unit ${ui + 1} · ${u.title}</h2>
              <span className="text-xs text-mist font-bold tnum">${done}/${u.lessons.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              ${u.lessons.map(l => html`<${LessonCard} key=${l.id} lesson=${l} st8=${states[l.id]} prog=${prog[l.id] || {}} onStart=${onStart} />`)}
            </div>
          </section>`;
      })}
      <p className="text-xs text-mist">Each lesson = ${CFG.QUESTIONS_PER_LESSON} questions · your first 3 lessons a day pay full XP, then rewards taper · repeating the same lesson pays ×${CFG.REPEAT_DECAY[1]} then ×${CFG.REPEAT_DECAY[2]}.</p>
    </div>`;
}

function ProfileView({ st, onAdvance, onReset }) {
  const li = levelInfo(st.totalXP);
  const perfect = Object.values(st.progress).flatMap(p => Object.values(p)).filter(x => x.bestAcc === 100).length;
  const calDays = Array.from({ length: 28 }, (_, i) => {
    const d = st.dayIndex - 27 + i;
    const xp = d === st.dayIndex ? st.todayXP : (st.history[d] ?? 0);
    return { d, xp, today: d === st.dayIndex };
  });
  return html`
    <div className="grid gap-5">
      <div className="bg-panel border border-stroke rounded-3xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ember to-coral flex items-center justify-center font-display font-extrabold text-2xl text-night shrink-0">O</div>
        <div className="min-w-0">
          <p className="font-display font-extrabold text-2xl truncate">Oluoch</p>
          <p className="text-mist text-sm">Level ${li.level} · <span className="tnum">${st.totalXP.toLocaleString()}</span> total XP</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${[["🔥", st.bestStreak, "Best streak"], ["⚡", st.totalXP.toLocaleString(), "Total XP"], ["💯", perfect, "Perfect lessons"], ["🧊", st.freezes, "Freezes held"]].map(([ic, num, lbl]) => html`
          <div key=${lbl} className="bg-panel border border-stroke rounded-2xl p-4 text-center">
            <p className="text-lg" aria-hidden="true">${ic}</p>
            <p className="font-display font-extrabold text-2xl tnum">${num}</p>
            <p className="text-[11px] text-mist font-bold uppercase tracking-wide mt-0.5">${lbl}</p>
          </div>`)}
      </div>

      <div className="bg-panel border border-stroke rounded-3xl p-5">
        <h2 className="font-display font-bold text-lg mb-3">Last 28 days</h2>
        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5" role="img" aria-label="Practice calendar, last 28 days">
          ${calDays.map(c => html`
            <div key=${c.d} title=${`${c.xp} XP`}
              className=${"aspect-square rounded-md " + (c.today ? "ring-2 ring-ember " : "") +
                (c.xp >= CFG.DAILY_GOAL ? "bg-ember" : c.xp > 0 ? "bg-ember/50" : "bg-panel2")}></div>`)}
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-mist">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-panel2 inline-block"></span> rest day</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ember/50 inline-block"></span> practiced</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ember inline-block"></span> goal hit</span>
        </div>
      </div>

      <div className="bg-panel border border-stroke rounded-3xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${BADGES.map(b => {
            const got = !!st.badges[b.id];
            return html`
              <div key=${b.id} className=${"rounded-2xl border p-3.5 text-center " + (got ? "bg-panel2 border-ember/40" : "border-stroke opacity-40")}>
                <p className="text-2xl" aria-hidden="true">${b.icon}</p>
                <p className="font-bold text-sm mt-1.5">${b.name}</p>
                <p className="text-[11px] text-mist mt-0.5 leading-snug">${b.desc}</p>
              </div>`;
          })}
        </div>
      </div>

      <div className="bg-panel border border-dashed border-stroke rounded-3xl p-5">
        <h2 className="font-bold text-sm uppercase tracking-widest text-mist mb-1">Prototype controls</h2>
        <p className="text-xs text-mist mb-4">Time-travel to test streak logic: end the day and see freezes burn or the streak break. Progress saves automatically in this browser.</p>
        <div className="flex flex-wrap gap-2.5">
          <button onClick=${onAdvance} className="px-4 py-2.5 rounded-xl bg-panel2 border border-stroke font-bold text-sm hover:border-ember">🌙 Sleep — start next day</button>
          <button onClick=${onReset} className="px-4 py-2.5 rounded-xl border border-stroke text-mist font-bold text-sm hover:border-rose hover:text-rose">Reset demo data</button>
        </div>
      </div>
    </div>`;
}

function LeaderboardView({ st, lang }) {
  const board = [...RIVALS.map(r => ({ ...r, xp: rivalWeekXP(r, st), me: false })), { id: "me", name: "You", flag: LANGS[lang].flag, xp: st.weekXP, me: true }]
    .sort((a, b) => b.xp - a.xp);
  const daysLeft = 7 - daysIntoWeek(st);
  const medals = ["🥇", "🥈", "🥉"];
  const max = Math.max(...board.map(r => r.xp), 1);
  return html`
    <div className="grid gap-5">
      <div className="bg-panel border border-stroke rounded-3xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-extrabold text-2xl">Ember League</h2>
          <p className="text-mist text-sm mt-1">Weekly XP race · resets Monday</p>
        </div>
        <div className="text-right">
          <p className="font-display font-extrabold text-2xl tnum">${daysLeft}</p>
          <p className="text-[11px] text-mist font-bold uppercase tracking-wide">day${daysLeft === 1 ? "" : "s"} left</p>
        </div>
      </div>
      <div className="bg-panel border border-stroke rounded-3xl p-3 grid gap-1.5">
        ${board.map((r, i) => html`
          <div key=${r.id} className=${"flex items-center gap-3 px-4 py-3 rounded-2xl " + (r.me ? "bg-ember/10 border border-ember/40" : i < 3 ? "bg-panel2/60" : "")}>
            <span className="w-7 text-center font-bold tnum">${medals[i] || i + 1}</span>
            <span className="text-lg" aria-hidden="true">${r.flag}</span>
            <div className="flex-1 min-w-0">
              <p className=${"truncate " + (r.me ? "font-extrabold" : "font-semibold")}>${r.name}${r.me ? " ← you" : ""}</p>
              <div className="h-1.5 bg-night/60 rounded-full mt-1.5 overflow-hidden">
                <div className=${"h-full rounded-full " + (r.me ? "bg-gradient-to-r from-ember to-coral" : "bg-stroke")} style=${{ width: `${(r.xp / max) * 100}%` }}></div>
              </div>
            </div>
            <span className="font-bold text-sm text-mist tnum shrink-0">${r.xp} XP</span>
          </div>`)}
      </div>
      <p className="text-xs text-mist">Prototype note: rivals are simulated locally with deterministic daily gains.</p>
    </div>`;
}

/* ==================== SHELL ==================== */
const NAV = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "lessons", label: "Lessons", icon: "📚" },
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "board", label: "Leaderboard", icon: "🏆" },
];

function App() {
  const [st, setSt] = useState(loadState);
  const [view, setView] = useState("home");
  const [lang, setLang] = useState("es");
  const [active, setActive] = useState(null);       // lesson being taken
  const [toast, setToast] = useState(null);
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {   // keep the at-risk evening state live while the app stays open
    const t = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }, [st]);

  // surface the morning-rollover notice (freeze burned / streak lost) as a toast
  useEffect(() => {
    if (st.notice) {
      setToast(st.notice);
      setSt(s => ({ ...s, notice: null }));
    }
  }, [st.notice]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const startLesson = l => setActive(l);
  const advance = () => setSt(s => advanceDay(s));
  const reset = () => { localStorage.removeItem(STORE); setSt(seedState()); setToast({ icon: "♻️", title: "Demo reset", body: "Back to the seeded Thursday." }); };

  const fm = flameMode(st, hour);
  const li = levelInfo(st.totalXP);

  return html`
    <div className="min-h-screen ground text-ink font-body">
      <${GradDefs} />

      <!-- sidebar (desktop) -->
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-panel/70 backdrop-blur border-r border-stroke p-5 z-30">
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <${Flame} size=${26} mode="earned" />
          <div>
            <p className="font-display font-extrabold text-lg leading-none">Oluoch aprende</p>
            <p className="text-[10px] text-mist font-bold uppercase tracking-widest mt-1">español · dashboard</p>
          </div>
        </div>
        <nav className="grid gap-1.5" aria-label="Main">
          ${NAV.map(n => html`
            <button key=${n.id} onClick=${() => setView(n.id)}
              aria-current=${view === n.id ? "page" : undefined}
              className=${"flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm text-left transition-colors " +
                (view === n.id ? "bg-gradient-to-r from-ember/15 to-coral/10 text-ember border border-ember/30" : "text-mist hover:text-ink hover:bg-panel2/60 border border-transparent")}>
              <span aria-hidden="true">${n.icon}</span> ${n.label}
            </button>`)}
        </nav>
        <div className="mt-auto bg-night/50 border border-stroke rounded-2xl p-4">
          <div className="flex items-center gap-2.5">
            <${Flame} size=${28} mode=${fm} />
            <div>
              <p className="font-display font-extrabold text-xl leading-none tnum">${st.streak}</p>
              <p className="text-[10px] text-mist font-bold uppercase tracking-wide">day streak</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-panel2 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-ember to-coral ring-anim" style=${{ width: `${Math.min(100, (st.todayXP / CFG.DAILY_GOAL) * 100)}%` }}></div>
          </div>
          <p className="text-[11px] text-mist mt-1.5 tnum">${st.todayXP}/${CFG.DAILY_GOAL} XP today</p>
        </div>
      </aside>

      <!-- main -->
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 bg-night/75 backdrop-blur border-b border-stroke/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
            <div className="md:hidden"><${Flame} size=${22} mode="earned" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold leading-tight truncate">${view === "home" ? "¡Hola, Oluoch!" : NAV.find(n => n.id === view).label}</p>
              <p className="text-[11px] text-mist">${fmtDate(st)} · simulated</p>
            </div>
            <div className="px-3 py-1.5 rounded-full text-sm font-bold border border-stroke text-mist">🇪🇸 <span className="hidden sm:inline">Español</span></div>
            <div className=${"hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bold text-sm tnum " + (fm === "risk" ? "border-gold/60 text-[#b25000]" : "border-stroke text-ink")}>
              <${Flame} size=${16} mode=${fm} /> ${st.streak}
            </div>
            <div className="hidden sm:block px-3 py-1.5 rounded-full border border-stroke text-sm font-bold text-mist tnum">Lv ${li.level}</div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-10">
          ${view === "home" && html`<${HomeView} st=${st} lang=${lang} hour=${hour} onStart=${startLesson} />`}
          ${view === "lessons" && html`<${LessonsView} st=${st} lang=${lang} onStart=${startLesson} />`}
          ${view === "profile" && html`<${ProfileView} st=${st} onAdvance=${advance} onReset=${reset} />`}
          ${view === "board" && html`<${LeaderboardView} st=${st} lang=${lang} />`}
        </main>
      </div>

      <!-- bottom tab bar (mobile) -->
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-panel/90 backdrop-blur border-t border-stroke flex" aria-label="Main">
        ${NAV.map(n => html`
          <button key=${n.id} onClick=${() => setView(n.id)}
            aria-current=${view === n.id ? "page" : undefined}
            className=${"flex-1 py-3 flex flex-col items-center gap-0.5 text-[11px] font-bold " + (view === n.id ? "text-ember" : "text-mist")}>
            <span className="text-lg" aria-hidden="true">${n.icon}</span> ${n.label}
          </button>`)}
      </nav>

      ${toast && html`
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pop-in bg-panel2 border border-stroke rounded-2xl shadow-lift px-5 py-3.5 flex items-center gap-3 max-w-sm w-[calc(100%-2rem)]" role="status">
          <span className="text-2xl" aria-hidden="true">${toast.icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm">${toast.title}</p>
            <p className="text-mist text-xs mt-0.5">${toast.body}</p>
          </div>
        </div>`}

      ${active && html`
        <${LessonModal} lang=${lang} lesson=${active} state=${st}
          onClose=${() => setActive(null)}
          onComplete=${next => setSt(next)} />`}
    </div>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
