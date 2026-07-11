/* ============================ STATE MERGE ============================
 *
 * The whole reason sync is safe. Last-write-wins would silently eat a session: drill on the
 * phone on the train, drill on the desktop that evening, and whichever writes second replaces
 * the other wholesale. So we don't do that.
 *
 * We can afford a real merge because of a happy accident in the mastery model: the
 * one-rep-per-day rule means every rep record stores a SET OF DATE STRINGS, and the counter
 * `c` is always exactly `days.length` (creditRep only increments c when it pushes a new day).
 * Sets union cleanly, order doesn't matter, and merging twice gives the same answer as merging
 * once — so the mastery half of the state is effectively a CRDT.
 *
 * Rules, field by field:
 *   days[] / items[]  union            (the reps themselves — never lose one)
 *   c                 = days.length    (derived, never merged directly)
 *   box/seen/ivl      max              (optimistic; a miss on one device shouldn't undo the other)
 *   due               earlier of the two  (more review is safer than less)
 *   xpHistory         max per date
 *   customVocab       union by es
 *   streak            MAX — see the note below
 *   freezes           MIN              (a freeze consumed on one device is consumed, period)
 *   scalars/prefs     from whichever save is newer
 *
 * On streak: an earlier draft of this recomputed the streak from the days present in
 * xpHistory. That was wrong. Streak FREEZES mean a day can be missing from xpHistory and the
 * streak legitimately survives it — recomputing would silently destroy a frozen streak. So we
 * take the max, which is generous but never punishes. It's the one field where I'd rather be
 * wrong in his favour.
 *
 * This module is imported by the sync function and runs SERVER-SIDE only. The client never
 * merges — it posts its state and takes back whatever the server returns. One merge, one place.
 */

const uniq = (arr) => [...new Set(arr)];
const maxN = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
const keysOf = (...objs) => uniq(objs.flatMap((o) => Object.keys(o || {})));

/* one rep record: {c, days[], box, seen, due, ivl} — plus items[] on usage checks */
function mergeRec(a, b) {
  if (!a) return b;
  if (!b) return a;
  const days = uniq([...(a.days || []), ...(b.days || [])]).sort();
  const out = {
    ...a,
    ...b,
    days,
    c: days.length,                       // c is derived, always
    box: maxN(a.box, b.box) || 1,
    seen: maxN(a.seen, b.seen),
  };
  const ivl = maxN(a.ivl, b.ivl);
  if (ivl) out.ivl = ivl;
  // sorted, not just unioned: two devices must converge on an IDENTICAL blob, not merely an
  // equivalent one, or every sync produces a "new" value and they ping-pong writes forever
  if (a.items || b.items) out.items = uniq([...(a.items || []), ...(b.items || [])]).sort();
  // due: take the earlier date — being asked to review something twice is harmless,
  // never being asked again is not
  const dues = [a.due, b.due].filter(Boolean).sort();
  if (dues.length) out.due = dues[0];
  return out;
}

const mergeMap = (a, b) => {
  const out = {};
  for (const k of keysOf(a, b)) out[k] = mergeRec((a || {})[k], (b || {})[k]);
  return out;
};

/* core8: inf -> { slots: {slot -> rec}, use: {check -> rec} } */
function mergeCore8(a, b) {
  const out = {};
  for (const inf of keysOf(a, b)) {
    const A = (a || {})[inf] || {};
    const B = (b || {})[inf] || {};
    out[inf] = { slots: mergeMap(A.slots, B.slots), use: mergeMap(A.use, B.use) };
  }
  return out;
}

function mergeVocab(a = [], b = []) {
  const byEs = new Map();
  for (const w of [...(a || []), ...(b || [])]) if (w && w.es) byEs.set(w.es, w);
  return [...byEs.values()].sort((x, y) => (x.es > y.es ? 1 : x.es < y.es ? -1 : 0));   // deterministic
}

function mergeCounts(a = {}, b = {}) {
  const out = {};
  for (const k of keysOf(a, b)) out[k] = maxN((a || {})[k], (b || {})[k]);
  return out;
}

export function mergeState(remote, local) {
  if (!remote) return local;
  if (!local) return remote;

  /* RESET. The merge only ever unions, so it can never delete anything — which means "Reset all
   * progress" would be undone by the very next sync, with the cloud handing everything straight
   * back. syncEpoch is the escape hatch: a reset bumps it, and a higher epoch wins outright
   * instead of merging. Whichever side has the newer epoch replaces the other wholesale. */
  const re = Number(remote.syncEpoch) || 0;
  const le = Number(local.syncEpoch) || 0;
  if (le > re) return local;    // this device reset — wipe the cloud
  if (re > le) return remote;   // another device reset — wipe this device

  // whichever save was written last wins for plain scalars & preferences
  const newer = (local.updatedAt || "") >= (remote.updatedAt || "") ? local : remote;
  const older = newer === local ? remote : local;

  const xpHistory = {};
  for (const d of keysOf(remote.xpHistory, local.xpHistory)) {
    xpHistory[d] = maxN(remote.xpHistory?.[d], local.xpHistory?.[d]);
  }

  const sameDay = remote.todayDate && remote.todayDate === local.todayDate;
  const sameWeek = remote.weekKey && remote.weekKey === local.weekKey;
  const streak = maxN(remote.streak, local.streak);

  return {
    ...older,
    ...newer,

    // --- the mastery data: never lose a rep ---
    cards: mergeMap(remote.cards, local.cards),
    verbs: mergeMap(remote.verbs, local.verbs),
    past: mergeMap(remote.past, local.past),
    core8: mergeCore8(remote.core8, local.core8),
    customVocab: mergeVocab(remote.customVocab, local.customVocab),

    // --- gamification ---
    xpHistory,
    totalXP: maxN(remote.totalXP, local.totalXP),
    todayDate: newer.todayDate,
    todayXP: sameDay ? maxN(remote.todayXP, local.todayXP) : newer.todayXP,
    weekKey: newer.weekKey,
    weekXP: sameWeek ? maxN(remote.weekXP, local.weekXP) : newer.weekXP,
    lessonsToday: sameDay ? mergeCounts(remote.lessonsToday, local.lessonsToday) : newer.lessonsToday || {},
    streak,
    bestDayStreak: Math.max(maxN(remote.bestDayStreak, local.bestDayStreak), streak),
    lastEarnedDate: [remote.lastEarnedDate, local.lastEarnedDate].filter(Boolean).sort().pop() || null,
    freezes: Math.min(remote.freezes ?? 0, local.freezes ?? 0),   // consumed is consumed
    quizCorrect: maxN(remote.quizCorrect, local.quizCorrect),
    quizTotal: maxN(remote.quizTotal, local.quizTotal),
    bestStreak: maxN(remote.bestStreak, local.bestStreak),
    records: {
      bestDayXP: maxN(remote.records?.bestDayXP, local.records?.bestDayXP),
      bestWeekXP: maxN(remote.records?.bestWeekXP, local.records?.bestWeekXP),
    },

    // --- housekeeping ---
    syncEpoch: Math.max(re, le),
    migV: maxN(remote.migV, local.migV),
    migNotice: false,   // device-local, never synced
    gNotice: newer.gNotice ?? null,
  };
}

export default mergeState;
