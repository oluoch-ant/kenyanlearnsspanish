# Usage-based mastery for the 195 verbs — design proposal

**Status:** proposal, nothing built. No code touched.
**Date:** 11 July 2026
**Supersedes:** the "3 correct recalls in each of 5 tenses" idea (rejected — wrong axis).

---

## 0. The premise, restated

The current bar is *3 correct recalls of the present "yo" form*. That is too low.

But the fix that suggests itself — *make it 5 tenses instead of 1* — is a bad fix, and it's worth being precise about why, because the reason drives the whole design:

> **A uniform rule prices every verb the same, but verbs are not hard in the same place.**

- `estar` conjugates almost perfectly regularly. You could produce `estoy / estás / estuve / estaba / esté` flawlessly and still say *"la sopa **es** fría"* every single time. Estar's difficulty is **ser vs estar**, and no amount of conjugating estar touches it.
- `tener` is likewise not hard to conjugate once you know `tengo/tienes/tiene`. Its difficulty is that it's an **idiom engine**: *tener hambre, tener 40 años, tener ganas de, tener que, tener prisa, tener razón*. An English speaker's instinct is *estar hambre* / *ser 40 años*, and drilling `tendré` does nothing about that.
- `hacer` is a **weather and time machine**: *hace frío, hace sol, hace dos años, hacer falta*. Again — irrelevant to the paradigm.
- Meanwhile `agradecer` is a perfectly ordinary verb whose only quirk is `-zco`. It has no trap. Making him drill `agradecería` is pure tax.

So: **the difficulty budget should be spent where the difficulty is.** That is the entire thesis. Everything below follows from it.

---

## 1. The mastery model

### 1.1 Pressure-testing form / function / fluency

The proposed three axes are close to right, but one of them isn't an axis.

**Form — keep.** Producing the correct conjugated shape. Genuinely independent, genuinely needs drilling, genuinely has content behind it.

**Function — keep, and it's the important one.** Knowing this is the right verb, and the right construction around it. This is the axis the app currently has *zero* coverage of, and it's where the failures Anthony actually makes live. I'd rename it **Use**, because "function" reads as grammatical function and this is broader: verb choice (`ser` vs `estar`), governed complements (`tener` **que** + inf, `empezar` **a** + inf), and fixed idioms (`tener hambre`).

**Fluency — demote.** It is not a third thing you can practise. There is no "fluency content" — there's no drill you could build called *fluency of estar* that isn't just the form drill or the use drill with a stopwatch on it. Treating it as a co-equal axis would produce a third mode that is a reskin of the first two, and a third progress bar that moves for no independent reason.

What fluency actually is: **a condition on whether a rep counts.**

> A rep counts toward mastery only if it is **correct *and* answered under the threshold**. A slow-but-correct answer still advances the SRS box (it's evidence of retention) but does **not** tick a mastery requirement.

This gets everything Anthony wants from a fluency axis — automaticity is required for mastery, and a verb can't be mastered by grinding it slowly — with zero new content and no fake third mode. The app already measures `avgSec` per lesson for the XP speed bonus, so the plumbing exists.

Suggested thresholds (tunable, store in state so he can adjust):

| Item type | Threshold |
|---|---|
| Typed form production (`tengo`) | 7 s |
| Two-way usage choice (`es` / `está`) | 5 s |
| Typed usage fill-in-blank | 9 s |

### 1.2 The thing that's missing from all three axes: spacing

The current bar has a subtler flaw than being low: **3 correct recalls in one sitting counts as mastered.** That's not mastery, that's a working-memory echo.

> **A verb's 3 correct reps for a given requirement must fall on ≥3 distinct days.**

Zero content cost, zero new drill types, and it is arguably a bigger real-world improvement to the honesty of the "mastered" badge than anything else in this document. The SRS boxes already track dates; mastery just has to look at them.

### 1.3 So what makes a verb "mastered"?

Not a global constant. **A per-verb profile**, because the whole point is that verbs differ:

```js
{
  inf: "estar", tier: 1,
  form: ["presYo","presTu","presEl","pret","subj","ger"],
  use:  ["ser-estar-location","ser-estar-adj","ser-estar-resultant","estar-gerundio"],
}
```

```js
{
  inf: "agradecer", tier: 3,
  form: ["presYo","pret"],
  use:  [],
}
```

> **mastered(v)** = every slot in `v.form` has ≥3 correct reps, on ≥3 distinct days, under threshold
> **AND** every check in `v.use` has ≥3 correct reps, on ≥3 distinct days, under threshold, **across ≥2 distinct items** (so he can't memorise one sentence).

`estar` therefore needs 10 requirements × 3 = 30 clean reps. `agradecer` needs 2 × 3 = 6. That asymmetry **is the feature.**

**Sequencing rule:** a verb's `use` checks stay locked until its `form` slots are done. You cannot meaningfully practise *choosing* between ser and estar if you can't yet produce `soy` and `estoy`.

### 1.4 One more cheap, high-value addition: error-driven scheduling

When he picks the trap, record *which trap*. Then preferentially re-serve items from that contrast family. Right now a wrong answer just resets the box to 1 — the app knows he got it wrong but not **what he confused it with**, which is the single most useful thing it could know. One extra field on the state record, big payoff.

---

## 2. Which forms actually earn their keep

Person × tense, judged by "will he say or hear this."

### Worth drilling

| Slot | Who | Why |
|---|---|---|
| **Present** | yo, tú, él/ella | The engine of all conversation. (`nosotros` for Tier 1 only.) |
| **Preterite** | yo, él/ella | The two persons that carry narration. Irregular, must be authored — the real cost centre. |
| **Present subjunctive** | yo, tú, él/ella | **Agreed, and it's underrated.** *Espero que **estés** bien. Quiero que **vengas**. Ojalá **pueda**.* You cannot be polite or express a wish without it. |
| **Imperative (tú, affirmative)** | — | Wildly high-yield and usually skipped: *dime, ven, mira, espera, ten, oye.* Cheap (see §5). |
| **Gerund** | — | Needed for `estar + -ndo`, which is half of spoken present. Cheap. |
| **Participle** | — | Needed for `he + participio` (*¿Has comido?*) and `estar + participio`. Cheap. |
| **Imperfect** | yo, él/ella — *lightly* | See below. |

### Dead weight — cut

| Slot | Verdict |
|---|---|
| **Conditional paradigm** | **Cut.** Anthony's instinct is right: `estaría` is barely a sentence. What survives is **three lexical chunks** — *me gustaría, podría, querría* — so teach them as **vocabulary items, not a conjugation**. Zero paradigm drilling. |
| **Future paradigm** | **Mostly cut.** Spoken Spanish says *voy a comer*, not *comeré*. Drill the **`ir a` + infinitive construction** instead. Keep morphological future for Tier 1 only, and mainly for its *probability* use (*¿Dónde **estará**?*). |
| **`vosotros`, every tense** | **Cut entirely.** (Also worth removing from the Conjugation tab's 6-person table — it's 1/6 of every conjugation exercise in the app spent on a form he will essentially never use.) |
| **Imperfect subjunctive, pluperfect, future perfect, conditional perfect** | Cut. Not at this level. |
| **Preterite `nosotros`/`ellos`** | Cut outside Tier 1. |

### The imperfect deserves a special note — it proves the thesis

The imperfect is **the most regular tense in Spanish**: three irregular verbs in the entire language (`era`, `iba`, `veía`). Its *form* is nearly free.

But **preterite vs imperfect** is one of the hardest choices in the language.

So: drill imperfect **forms** barely. Drill the **preterite/imperfect choice** heavily, as a usage check. Same verb, difficulty relocated — exactly the move this whole design is making.

---

## 3. Verb tiers

The 195 verbs are already roughly frequency-ordered (`ser, estar, tener, hacer, ir…` down to `reconocer, agradecer`), and `VERBS200.forEach((v,i) => v.batch = Math.floor(i/10)+1)` already batches by that order. So tiering mostly formalises what the list already implies.

**The line between Tier 1 and everything else is one question:**

> ### Does a fluent-sounding *wrong* answer exist for this verb?

If yes → it needs usage content. If no → forms only. Crisp and testable.

### Tier 1 — "verbs that are really grammar" (~22 verbs)

Difficulty is **not** in the paradigm. These get the full Form + Use treatment.

- **Contrast pairs:** `ser`/`estar`, `saber`/`conocer`, `ir`/`venir`, `llevar`/`traer`, `pedir`/`preguntar`, `dejar`/`quedarse`
- **Idiom engines:** `tener` (hambre/sed/frío/miedo/prisa/ganas de/años/que/razón), `hacer` (weather, *hace dos años*, *hacer falta*), `dar` (*dar un paseo, dar igual, darse cuenta*), `pasar` (*¿qué pasa?*, *pasar tiempo*)
- **Backwards (gustar-type):** `gustar`, `encantar`, `doler`, `importar`, `interesar`, `faltar` — subject/object inversion + verb agreeing with the *thing*, not the person. Already stored as `me gusta` / `me duele`, so the data half-knows this.
- **Modals + high-irregularity workhorses:** `poder`, `querer`, `deber`, `decir`, `poner`, `salir`, `ver`
- **⚠️ `haber` — MISSING FROM THE LIST ENTIRELY.** `hay` is arguably the most useful single verb form in Spanish (*hay un problema*), and `haber` is required for every perfect tense. **This is a real gap and should be added regardless of what else we do.** Also worth adding: `jugar`, `contar`, `llover`/`nevar`, `irse`.

### Tier 2 — irregular, but semantically ordinary (~40 verbs)

`dormir, morir, pedir, seguir, servir, sentir, preferir, mentir, medir, elegir, conseguir, volver, encontrar, recordar, empezar, cerrar, pensar, entender, perder, defender, probar, mostrar, resolver, costar, volar, oír, traer, construir, incluir, destruir, conducir, conocer/parecer/nacer/crecer/reconocer/agradecer, proteger, exigir, confiar, enviar, continuar, reír…`

Here the **form *is* the whole difficulty**. Full form set, no usage content.

**Key efficiency:** don't drill these as 40 unrelated facts. They fall into **~8 morphological families**:

| Family | Members | Pattern |
|---|---|---|
| e→ie boot | pensar, entender, perder, cerrar, empezar, preferir, defender, mentir | piensas, but pensamos |
| o→ue boot | dormir, volver, encontrar, recordar, poder, costar, volar, probar, mostrar, resolver | duermes, but dormimos |
| e→i (-ir only) | pedir, seguir, servir, medir, elegir, conseguir, vestir | pides |
| -zco (yo only) | conocer, parecer, nacer, crecer, reconocer, agradecer, conducir | conozco, but **conoces** — not *conozces* |
| -uyo | construir, incluir, excluir, destruir | construyo, construyes |
| -í́o (accented) | enviar, confiar, continuar, prohibir, reunir | envío |
| -jo (g→j) | proteger, exigir, elegir | protejo |
| stem-vowel -ir preterite | dormir→durmió, pedir→pidió, sentir→sintió | 3rd person only |

**Teach the family once; spot-check the members.** This turns ~40 verbs of memorisation into ~8 rules plus verification, and it's the single biggest saving in the design.

### Tier 3 — regular and useful (~90 verbs)

`hablar, comer, vivir, trabajar, estudiar, comprar, vender, pagar, caminar, correr, viajar, limpiar, escuchar, aprender…`

Fully rule-derivable. **Form only, and only two slots: present (yo/tú/él) + preterite (yo/él).** Roughly today's bar, slightly widened. **No usage content authored — ever.**

### Tier 4 — the synonym tail (~43 verbs)

The `alt`-paired near-duplicates and low-frequency entries: `comprender, comenzar, acabar, contestar, regresar, utilizar, manejar, solucionar, argumentar, gestionar, empeorar, sobrar, denunciar, opinar, apoyar, demostrar…`

The list **already encodes these** — there are 13 `alt:` pairs (`entender`/`comprender`, `empezar`/`comenzar`, `terminar`/`acabar`, `responder`/`contestar`, `volver`/`regresar`, `usar`/`utilizar`, `conducir`/`manejar`, `resolver`/`solucionar`, `intentar`/`probar`, `lograr`/`conseguir`, `tomar`/`beber`, `querer`/`amar`, `ocurrir`/`suceder`).

**Drilling both halves of a synonym pair to production is wasted reps.** Recognition only: show the Spanish, he identifies the meaning. He needs to *understand* `comenzar`; he can go on saying `empezar` forever and never be wrong.

### Tier sizes

| Tier | Verbs | Treatment |
|---|---|---|
| 1 | ~22 | Form (6 slots) + Use (4–6 checks) |
| 2 | ~40 | Form (4 slots), family-taught |
| 3 | ~90 | Form (2 slots), rule-derived |
| 4 | ~43 | Recognition only |
| | **195** | |

---

## 4. The usage check — the new drill type

### 4.1 Item shape

```js
{
  id: "ser-estar-adj-04",
  verb: "estar",
  check: "ser-estar-adj",
  prompt: "La sopa ___ fría — ¡llama al camarero!",
  gloss: "(the soup has gone cold — complain)",
  answer: "está",
  trap: "es",
  why: "Gone cold = a state it ended up in → estar. «La sopa es fría» would mean cold by nature, like gazpacho.",
  twin: "ser-estar-adj-05"
}
```

### 4.2 The three rules that make this work

**1. Two-way forced choice, not free typing.** Present exactly `[answer, trap]`. Typing lets him dodge the contrast by writing something safe; a forced choice puts the discrimination *directly* under the lamp. Fast, too — good for the fluency gate.

**2. Every item must have a twin where the trap is the answer.** This is the non-negotiable authoring rule.

> *La sopa **está** fría* (it went cold) ⟷ *El gazpacho **es** frío* (it's a cold soup by nature)
> *Estoy **aburrido*** (I'm bored) ⟷ *La clase **es** aburrida* (the class is boring)

Without twins, the 50% guess rate rots the data and he learns "when in doubt, pick está." **An item without a twin is not a valid item.**

**3. `why` is shown on right answers too, not just wrong ones.** The correction is the teaching moment; showing it only on failure means the reps that go well teach nothing.

### 4.3 What the content covers, and how much

| Check family | Items | Notes |
|---|---|---|
| ser/estar — location, origin, profession, temporary state, resultant condition, `estar`+gerundio, time/date | ~32 | The big one. ~8 sub-families × 2 items × both directions |
| ser/estar — the flipping adjectives (`aburrido, listo, rico, verde, vivo, malo, seguro`) | ~14 | Each is naturally its own twin pair |
| `tener` idioms (hambre, sed, frío, calor, sueño, miedo, prisa, razón, ganas de, años, que, cuidado) | ~24 | Traps: `estar`/`ser` + the English-instinct noun |
| `hacer` weather & elapsed time (*hace frío*, *hace dos años*, *hacer falta*) | ~20 | Traps: `estar frío`, `es frío`, `por dos años` |
| gustar-type: inversion + agreement (*me gusta el libro* / *me gust**an** los libros*) | ~14 | Traps: *yo gusto*, agreement failures |
| **preterite vs imperfect** | ~20 | The hardest choice in the language; deserves its own bank |
| saber / conocer | ~12 | |
| pedir / preguntar | ~8 | |
| llevar / traer, ir / venir | ~12 | Deixis — genuinely hard for English speakers |
| `hay` vs `es`/`está` | ~10 | Depends on adding `haber` |
| Governed prepositions (`tener que`, `empezar a`, `tratar de`, `soñar con`, `pensar en`) | ~16 | Cheap, high-yield, one field per verb |
| Reflexive meaning-shift (`sentir`/`sentirse`, `quedar`/`quedarse`, `mover`/`moverse`) | ~14 | |
| **Total** | **≈ 196 items** (98 twin pairs) | |

### 4.4 How it gets authored

**Hand-written for Tier 1. Nothing for Tiers 2–4.** That's the whole point of the tiering — the expensive content only exists where it pays.

Practically: **I generate in batches of 20 (10 twin pairs), Anthony reviews.** But with one hard QA rule, because there's a specific way this goes wrong:

> **An item is invalid if the trap is actually acceptable Spanish in the given context.**

This is *the* characteristic failure mode of LLM-generated contrast items — writing *"El café ___ caliente"* with answer `está` and trap `es`, when both are fine depending on meaning. That item teaches a false rule. Every item needs a context cue (the `gloss`) that makes exactly one answer correct, and review has to check that specifically. Budget for ~20% rejection on first pass.

---

## 5. Content cost, honestly

### 5.1 What derives safely and what doesn't

Carrying forward the earlier finding, and extending it:

| Form | Derivable? | Manual entries needed |
|---|---|---|
| **Imperfect** | ✅ Fully. 3 irregulars in the whole language. | 3 (`era, iba, veía`) |
| **Present subjunctive** | ✅ **Mostly — and this is a happy surprise.** It derives from the *present yo form*, which the app **already stores for all 195 verbs**: drop the `-o`, flip the vowel. `tengo→tenga`, `conozco→conozca`, `digo→diga`, `salgo→salga`. Works for exactly the verbs that are otherwise painful. | 6 (the DISHES set: `dar→dé, ir→vaya, ser→sea, haber→haya, estar→esté, saber→sepa`) + ~15 `-ir` nosotros stem notes (`durmamos`, `pidamos`) |
| **Participle** | ✅ by rule | ~14 irregular (`hecho, dicho, visto, puesto, vuelto, escrito, abierto, muerto, roto, cubierto, resuelto…`) |
| **Gerund** | ✅ by rule | ~13 (`diciendo, durmiendo, pidiendo, sintiendo, leyendo, oyendo, yendo, trayendo, construyendo…`) |
| **Imperative (tú affirm.)** | ✅ by rule (= 3rd-person present) | 8 (`di, haz, ve, ven, ten, sal, pon, sé`) |
| **Future / conditional** | ⚠️ by rule **except 12 irregular stems** | 12 (`tendr-, podr-, pondr-, saldr-, vendr-, har-, dir-, querr-, sabr-, habr-, cabr-, valdr-`) — and note we're mostly cutting these tenses anyway |
| **Present tú/él/nos/ellos** | ⚠️ Derivable from the stored `yo` **only for regulars.** Fails for the top ~20 (`tengo→tienes` is irregular-yo *and* stem-changing; `conozco→cono**c**es`, not *conozces*) | Full paradigms for Tier 1 (~22 — about 15 already exist in the `VERBS` array and can be copied); `stem` flags for Tier 2 (~40) |
| **Preterite** | ❌ **Not derivable.** ~40 truly irregular (`fui, hice, tuve, dije, puse, supe, quise, pude, vine, di, estuve, traje…`), ~25 orthographic (`llegué, busqué, empecé, pagué`), ~15 `-ir` stem-changers (`pidió, durmió`), plus 3rd-person `y` (`leyó, oyó, construyó`) | **All 195.** ~80 of them non-obvious. The one genuine content slog on the forms side. |

**The good news:** the app storing `yo` for all 195 verbs turns out to be a much more valuable asset than it looks — it unlocks the present subjunctive, one of the highest-value tenses, nearly for free.
**The bad news:** the preterite has to be typed out and checked, verb by verb.

### 5.2 The real number

**One free head start:** the existing `VERBS` array (the Conjugation tab's data, 22 verbs) already contains **verified full 6-person preterite paradigms** — and they happen to be the nastiest ones: `fui, estuve, tuve, hice, quise, pude, supe, dije, vine, puse, di, vi`. So ~22 of the 195 preterites are already written and checked, including most of the hard irregulars. 14 of the ~22 Tier 1 verbs also already have full present paradigms there. Copy, don't retype.

| Work item | Volume | Effort |
|---|---|---|
| `pret` (preterite yo) for all 195 | 195 entries — ~22 copyable from `VERBS`, ~60 remaining non-obvious | **2–3 h** |
| Preterite `él` (mostly derives from `pret`; `hice→hizo` is the exception) | ~5 exceptions | 15 min |
| `futStem` (12), `part` (14), `ger` (13), `impTu` (8), subjunctive exceptions (~21) | ~68 | **1.5 h** |
| Tier 1 full present paradigms | ~22 verbs (~15 copyable from `VERBS`) | **1 h** |
| Tier 2 stem/family flags | ~40 | 45 min |
| Tier assignment + `form`/`use` profiles for all 195 | 195 | **1–2 h** (judgement, can't be automated) |
| Add missing verbs (`haber/hay`, `jugar`, `contar`, `llover`, `irse`) | ~5 | 30 min |
| **Usage bank — 98 twin pairs** | **~196 items** | **8–12 h** ← the cost centre |
| Verification pass (machine-check derived forms against the `VERBS` array + spot-check) | — | **2–3 h** |
| **TOTAL CONTENT** | | **≈ 18–25 hours** |
| Code (state model, migration, drill modes, UI, PWA sync) | | ≈ 1–1.5 days |

**Be clear-eyed about what this is: a content project wearing a code project's clothes.** ~70% of the effort is writing and verifying Spanish, not writing JavaScript. The code is the easy part. If that budget isn't acceptable, the honest move is to cut Tier 1 from 22 verbs to the **top 8** (`ser, estar, tener, hacer, haber, ir, saber, conocer`), which takes the usage bank from ~196 items to ~90 and the total from ~20 h to ~10 h — and still captures most of the real-world error rate.

---

## 6. Migration and grind

### 6.1 Migrating `state.verbs`

Today: `state.verbs[inf] = { box: 1-4, seen: n }` — a single flat counter, plus SRS `due`/`ivl` from `gradeSRS`.

Proposed:

```js
state.verbs[inf] = {
  slots: {
    presYo: { box, seen, correct, days: ["2026-07-04","2026-07-09"], due, ivl },
    pret:   { box: 1, seen: 0, correct: 0, days: [] },
    …
  },
  use: { "ser-estar-adj": { correct: 0, days: [], items: [] }, … },
  legacySeen: n
}
```

**The migration rule:** credit the entire existing record to **`presYo`** — because present-`yo` is literally the only thing the drill has ever asked, so that's exactly what the data is evidence of. Every other slot starts empty. SRS due-date carries to `presYo`. Nothing is discarded; `seen` is preserved as `legacySeen` so lifetime stats don't reset.

Old `days` history doesn't exist, so migrated verbs get **grandfathered on the spacing rule** for `presYo` only — a verb at box 4 is credited as having met its 3-spaced-reps requirement. Anything else would punish him for progress he actually made.

### 6.2 ⚠️ The mastered count is going to crater — handle it deliberately

Every verb currently "mastered" (box 4 = 3 correct recalls) will, under the new rule, satisfy **exactly one requirement out of 2–10.** The Home and Progress counters will drop to near zero on first load.

That is *correct* — it's the honest consequence of raising the bar — but presented naively it looks like data loss and feels like punishment.

**So change the metric, not just the threshold.** Retire the raw "verbs mastered" count as the headline number and replace it with **requirements met**:

> **Verb strength: 312 / 2,140**  ·  *Fully mastered: 14*

Plus a one-time notice on first load after the update:

> *"The mastery bar changed — a verb now has to hold up across the forms and uses that actually make it hard. Your existing progress is intact and banked as the present tense for 87 verbs. The 'mastered' number is smaller because it's measuring something harder."*

And per-verb, show the profile rather than a single `0/3`:

```
estar    Form ●●●●●○  Use ●●○○     8/10
tener    Form ●●●●●●  Use ●●●○○○   9/12
agradecer Form ●●               6/6  ✓ mastered
```

### 6.3 Grind — what we're actually proposing

Reps to full mastery of all 195 verbs (3 clean reps per requirement):

| Tier | Verbs | Reqs/verb | Reps/verb | Total reps |
|---|---|---|---|---|
| 1 | 22 | ~11 | 33 | 726 |
| 2 | 40 | 4 | 12 | 480 |
| 3 | 90 | 2 | 6 | 540 |
| 4 | 43 | 1 (recognition) | 3 | 129 |
| | | | | **≈ 1,875** |

Compare:

| Model | Reps to master all 195 |
|---|---|
| Today (3 recalls, present yo) | ~585 |
| **Rejected** uniform 5-tense rule | ~2,925 |
| **This proposal** | **~1,875** |

**This is the headline of the whole design:** it is a substantially harder bar than today, but it is *less total grind than the uniform 5-tense rule* — while being aimed at the things that are actually hard. The 5-tense rule would have charged him 15 reps for `agradecer`. This charges him 6 for `agradecer` and 33 for `estar`, which is the correct pricing.

At ~20 clean reps in a session: **~95 sessions to full mastery** (vs ~30 today). Reasonable for a multi-year project, and the Tier 1 verbs — the ones that unlock actual speech — land in the first few weeks because they're already at the front of the batch order.

---

## 7. Suggested build order (de-risked)

Each phase is shippable on its own; the huge content spend comes last and lands incrementally.

- **Phase 0 — safety.** Version control (`git init`) or a timestamped folder backup. Add the missing verbs (`haber/hay` above all).
- **Phase 1 — code, no new content (~1 day).** Per-slot state model, migration, spacing rule, fluency gate, tier field, new UI pips. Ships with only `presYo` required, so **behaviour is ≈ today** — but the data model is correct and nothing is lost. Zero risk, unlocks everything after it.
- **Phase 2 — forms content (~5 h).** `pret` for all 195 + the derivation rules and their exception tables. Turns on preterite, subjunctive, imperative, gerund, participle slots. Tiers 2–4 are **done** at this point.
- **Phase 3 — the usage bank (~8–12 h, incremental).** Twin-pair batches of 20, reviewed. Ship `ser`/`estar` first — it alone is probably the largest single win in the app. Each batch that lands makes Tier 1 sharper; there's no big-bang.
- **Phase 4 — polish.** Error-driven scheduling (re-serve the trap he fell for), drop `vosotros` from the Conjugation tab.

---

## 8. Open questions for Anthony

1. **Tier 1 at 22 verbs (~20 h) or top 8 (~10 h)?** The 8-verb cut still catches most real errors.
2. **Is ~1,875 reps to full mastery the right price?** It's 3× today. (Reassurance: it's *less* than the 5-tense rule he already rejected.)
3. **Add `haber`/`hay`?** Strongly recommended — it's a genuine hole in the list.
4. **Cut `vosotros` from the Conjugation tab too**, or leave that tab alone?
5. **Latin American or Peninsular bias?** Affects `vosotros`, and whether present perfect (*¿has comido?*) is drilled hard or lightly.
6. **Keep the conditional as three lexical chunks (`me gustaría / podría / querría`)** rather than a paradigm — confirm that's acceptable.
