# Serious games, simulations, scenario-based learning, XR, gamification, and assessment inside games

**Research note for Hackathon Fulda 2026 (24–25 Oct 2026), theme "Future Education – Lernen neu denken"**
Prepared 2026-10-23. Scope: evidence on learning outcomes, design mechanisms, assessment, landscape, 24-hour feasibility, and concrete prototype concepts.

**Evidence labels used below:** [MA] meta-analysis; [SR] systematic review; [RCT] randomised controlled trial; [P] peer-reviewed journal/article; [C] conference proceedings; [Pre] preprint (not yet peer-reviewed); [Rep] government/industry report; [V] vendor or tool documentation (claim, not independent evidence); [F] foundational work.

**Effect sizes** are standardised mean differences (Hedges' g, Cohen's d, or SMD) unless stated otherwise. Rough benchmarks: 0.2 small, 0.5 moderate, 0.8 large. These benchmarks are conventions, not thresholds for practical significance, and effect sizes from different meta-analyses are **not directly comparable** because inclusion criteria, control conditions, outcome measures, and publication dates differ.

---

## 0. Bottom line for the build

1. **Games and simulations reliably beat "no intervention" and often beat passive lectures, but average effects are small-to-moderate and highly design-dependent.** The best honest summary is: simulation-based learning for complex skills is strong (g ≈ 0.85); digital game-based learning in school is moderate (g ≈ 0.54); gamification after bias correction is small (g ≈ 0.3); serious games in healthcare show near-null average effects; immersive VR averages small (g ≈ 0.24–0.38) and can be worse than a well-designed slideshow for factual learning.
2. **The active ingredients are not points, badges, 3D, or story.** They are: repeated decision practice with consequences, specific feedback, a structured debrief, increasing difficulty, and assessment aligned to the target competency. Debriefing/after-action review has some of the largest effects in the literature (d ≈ 0.79–0.92).
3. **Design the assessment first, then the game.** Use evidence-centered design (ECD): define 2–4 competencies, define the observable behaviours that evidence them, then design decision points that elicit those behaviours. A 24-hour team can do an "ECD-lite" version in a JSON file; a Bayesian network is not required.
4. **A 3–5 minute demo cannot prove durable learning.** It can demonstrate: (a) a measurable pre/post gain on 2–3 concept items, (b) a near-transfer item, (c) process evidence (information gathered before acting, safety checks, escalation timing), and (d) a debrief that explains why. Claim "evidence-informed" and "formative," not "validated" or "proven."
5. **Do not build a 3D world, an avatar system, multiplayer, an LMS integration, or an authoring UI in 24 hours.** Build a text/2D decision simulation with 6–10 nodes, 3 competencies, 2–3 endings, a rule-based debrief, one transfer case, and an event log. That is enough to demo real learning mechanics.
6. **Physical realism is overrated; functional task alignment is what matters.** Low-fidelity simulation can be as effective as high-fidelity for novices; high fidelity can add cost, stress, and extraneous load. A clean 2D interface with authentic decisions is defensible and buildable.
7. **VR/XR is a niche tool, not a default.** Use it only when the learning goal requires spatial presence, dangerous practice, or inaccessible environments (e.g., safety, surgery, height/confined space). For factual or conceptual learning, desktop/2D is often better and cheaper.
8. **Engagement is not learning.** Satisfaction, time-on-task, points, and "fun" are not acceptable primary evidence. Measure knowledge/skill with direct items, process with behavioural indicators, and transfer with a novel case.
9. **The biggest red flags in the evidence are publication bias, small samples, no active controls, self-report outcomes, and media-comparison confounds.** When better-controlled studies are isolated, effects shrink. Pitch the design logic, not a single inflated number.
10. **The most hackathon-friendly, evidence-aligned format is a branching scenario with a structured debrief and a near-transfer case** — ideally in a vocational or professional domain where decisions have visible consequences.

---

## 1. How to read the evidence

Three distinctions matter for judging claims:

- **Comparison condition.** "Game vs. no intervention" produces larger effects than "game vs. active, well-designed instruction." Many meta-analyses mix both. Prefer studies with active controls.
- **Outcome type.** Knowledge tests, procedural skill checks, workplace behaviour, and patient/employee outcomes are different. Most studies measure reaction and immediate learning; far fewer measure behaviour or results. A 2023 review of 136 VR safety-training studies found 72% measured learning and 66% measured reaction, but **none** measured behaviour (Kirkpatrick level 3) and only three measured results (level 4) [SR].
- **Study quality.** Randomisation, allocation concealment, blinded assessment, and validated instruments are often weak in this literature. Several meta-analyses report high heterogeneity (I² > 75–95%), which means the average is a weak summary.

**Rule for the pitch:** report the effect size **and** the caveat in the same breath. Example: "Simulation for complex skills averages g ≈ 0.85 across 145 studies, but heterogeneity is very high and most studies are in health professions education; we use it as design guidance, not as a guarantee."

**Working definitions.** *Serious game:* a game whose primary purpose is education or training, not entertainment. *Game-based learning (GBL):* use of games to support learning. *Gamification:* game-design elements (points, levels, badges, leaderboards, challenges) in a non-game context. *Simulation:* a simplified but functional model of a real task or environment that allows practice without real-world consequences. *Scenario-based learning:* learning through structured situations that require decisions. *Stealth assessment:* embedding assessment in the learning environment so evidence is collected during performance rather than in a separate test. *XR:* umbrella term for VR/AR/MR; *IVR:* immersive VR via a head-mounted display.

---

## 2. Evidence by format

### 2.1 Game-based learning and serious games

**Overall.** A meta-analysis of digital game-based learning (DGBL) interventions in schools (studies 2015–2020) found a medium effect on overall learning (g = 0.54) and cognitive outcomes (g = 0.67), a small effect on affective-motivational outcomes (g = 0.32), and **no significant effect on metacognitive outcomes** [MA, P]. An earlier meta-analysis of serious games vs. conventional instruction (77 studies) found small effects on learning (d = 0.29) and retention (d = 0.36), but **no significant motivation advantage** (d = 0.26, n.s.) [MA, P]. A 2022 STEM meta-analysis (33 studies) found g = 0.667 [MA, P]; a computational-thinking meta-analysis (27 studies) found g = 0.600 [MA, P].

**Moderators that consistently matter:**
- **Integration with instruction.** Games supplemented with other instruction outperform games used alone (d ≈ 0.41 vs. 0.20 in Wouters et al.).
- **Multiple sessions.** Multiple training sessions outperform a single session (d ≈ 0.54 vs. 0.10).
- **Group play.** Group play outperforms individual play (d ≈ 0.66 vs. 0.22).
- **Visual realism.** Schematic games outperformed cartoon-like and photorealistic games in one meta-analysis (d ≈ 0.46 vs. 0.20 and 0.14). This is counterintuitive but consistent with cognitive-load accounts.
- **Random assignment.** Effects were much smaller in randomised studies (d ≈ 0.08) than non-randomised studies (d ≈ 0.44) in a science-education meta-analysis [MA, P]. This is a strong signal that some of the literature is inflated.

**Context.** K-12 evidence is moderate and growing; higher-education evidence is moderate but often uses self-report or course grades; vocational and corporate evidence is thinner and more domain-specific.

**Null/weak findings you must know:**
- A meta-analysis of serious games in healthcare professions education (29 RCTs) found **no significant effects** on knowledge (SMD = 0.16, CI includes 0), cognitive skills (0.08), procedural skills (0.05), attitude (−0.09), or behaviour (0.20); only confidence improved slightly (0.27) [MA, P]. This is a major counterweight to vendor claims.
- A science-education meta-analysis of 79 studies found 46 favouring serious games, **26 with no significant difference**, and 7 favouring conventional instruction; average effects were small-to-moderate (declarative d ≈ 0.34, retention ≈ 0.31, procedural ≈ 0.41) [MA, P].
- A meta-analysis of gamified cognitive training found more motivation/engagement but **no effect on the training domain** (i.e., cognitive outcomes) [MA, P].

**Interpretation.** Games are a delivery format, not an active ingredient. The same game can produce learning or waste time depending on alignment, feedback, debrief, and dose.

**Build implication:** use a game frame only where it creates decisions that require the target skill. Do not add points, badges, or story as a substitute for practice.

---

### 2.2 Gamification

**Overall.** Estimates vary widely:
- Higher-education multilevel meta-analysis (143 effect sizes, 32 studies, 2013–2024): g = 0.515 overall; cognitive g = 0.716; skill-based g = 0.605; affective g = 0.317 [MA, P].
- A broader meta-analysis (22 studies): g = 0.782 [MA, P], but with only 22 studies and high heterogeneity.
- A 41-study meta-analysis: g = 0.822 [MA, P].
- A 2026 meta-analysis **of 10 existing meta-analyses**, with outliers and publication bias accounted for, found much smaller adjusted effects: g = 0.316 for academic performance and g = 0.183 for motivation/engagement, with **prediction intervals that include negative values** [MA, P]. This is the most sober estimate and the one to cite if a judge asks "does gamification really work?"

**Moderators:**
- **Design elements matter more than the label.** In a programming-learning meta-analysis, gamification produced d ≈ 0.41, but the effect was essentially due to **levels**; badges, points, avatars, and leaderboards had no significant effect on learning [MA, P]. A higher-education meta-analysis found that the best combinations included performance/measurement plus social and personal elements; a combination of levels + badges + leaderboards was associated with a **negative** effect in one analysis [MA, P].
- **Competition and collaboration.** Competitive-collaborative designs tend to outperform pure competition for behavioural outcomes [MA, P]; however, a 29-study meta-analysis found the competition advantage was not robust, and collaboration alone did not moderate learning [MA, P].
- **Context and learner type.** Effects depend on subject, educational level, duration, and whether the comparison is active. Short interventions are vulnerable to novelty effects.
- **Novelty decay.** A 14-week longitudinal study found gamification effects declined after about four weeks, then partially recovered (U-shape) [P]. Other work shows novelty can be overcome with meaningful design [P]. Do not assume a first-week engagement boost persists.

**Negative effects.** A systematic mapping of 77–87 papers found that badges, leaderboards, competitions, and points are the elements most often reported as causing negative effects: lack of effect, worsened performance, motivational issues, lack of understanding, irrelevance, cheating/gaming the system, and overjustification (rewards undermining intrinsic motivation) [C/P]. "Shallow gamification" — layering points on unchanged content — is a common failure mode.

**Corporate/vocational evidence:**
- An industry meta-analysis (IOGP Report 668) concludes small-to-moderate positive effects on cognitive, motivational, and behavioural outcomes in workplace learning, mainly via engagement and job performance [Rep, not peer-reviewed].
- A field experiment in a bank found gamified compliance training was preferred and produced a **3.5%** improvement in assessment scores, but only for less-experienced employees; experienced employees did not benefit [P/working paper].
- A field study of a professional-services firm reported large sales effects from a gamified training platform, but it is a working paper with observational/rollout design, not a peer-reviewed RCT; treat as suggestive, not proof [Pre/working paper].

**Build implication:** if you use gamification, use **levels/challenge progression, clear goals, and feedback** — not a points/badges/leaderboard layer. Make the "game" the decision problem itself.

---

### 2.3 Simulation-based learning

**Overall.** A meta-analysis of 145 studies in higher education found a **large** overall effect of simulation-based learning on complex skills: g = 0.85 (SE = 0.08), robust across medical, teacher, and management education [MA, P]. A meta-analysis of simulation-based medical education with deliberate practice reported an effect size of r ≈ 0.71 vs. traditional clinical education [MA, P]. A JAMA meta-analysis of technology-enhanced simulation (609 studies) found large effects vs. no intervention for knowledge (1.20), time skills (1.14), process skills (1.09), and a moderate effect on patient outcomes (0.50) [MA, P]. A 2023 update (59 RCTs) found an overall effect of 0.80; high-fidelity mannequins/physical environments 0.90, VR 0.70, virtual patients 1.28; effects were larger for training over more than one day (0.94) than a single day (0.58) [MA, P].

**Instructional-design features that matter (pooled effects on skills):**
- Range of difficulty: 0.68
- Repetitive practice: 0.68
- Distributed practice: 0.66
- Interactivity: 0.65
- Multiple learning strategies: 0.62
- Individualised learning: 0.52
- Mastery learning: 0.45 (not significant in the pooled analysis, few studies)
- Feedback: 0.44
- Longer time: 0.34
- Clinical variation: 0.20 (n.s.)
- Group training: −0.22 (n.s.)

Source: Cook et al. 2012, medical teacher meta-analysis of 289 studies [MA, P]. The pattern is clear: **practice design and feedback beat fidelity and group format**.

**Fidelity.** Physical fidelity is a weak predictor of learning. A meta-analysis of high- vs. low-fidelity simulators in undergraduate medical education found **no significant differences** in knowledge, skill performance, or confidence [MA, Preprint — treat cautiously]. A systematic review of team training found no significant difference in knowledge or teamwork between higher- and lower-fidelity simulation; higher fidelity was preferred by participants but also produced more stress [SR, P]. The classic recommendation is to abandon "fidelity" as a global term and focus on **functional task alignment** and **psychological fidelity** [P, perspective]. A RAND review of army training reached the same conclusion: high psychological fidelity matters; high physical fidelity is not necessary and can limit practice opportunities [Rep].

**Contexts:**
- **Health professions:** strongest evidence base; simulation improves knowledge, procedural skills, and some non-technical skills, but effects on clinical reasoning and team behaviour are more mixed.
- **Teacher education:** included in the Chernikova meta-analysis (7 studies); simulation is promising for communication and classroom management, but the evidence base is much smaller than in medicine.
- **Business:** business decision-making games show g ≈ 0.53 across 41 studies (N = 8,376), with reactions 0.44, learning process 0.66, learning performance 0.45, and motivation 0.85 [MA, C — Academy of Management Proceedings, not a full journal article]. A systematic review of 57 papers finds positive effects on knowledge, cognitive skills, and behaviour, but notes weak assessment frameworks [SR, P].
- **Aviation:** flight simulation combined with aircraft training consistently improves training vs. aircraft-only; motion cueing adds little; performance-paced training beats lock-step [MA, P, 1992]. Crew resource management (CRM) training shows positive reactions, learning, and behaviour, but evidence for safety bottom-line effects is weak, and rigorous evaluations are often null or mixed [MA/SR, P].

**Null/weak findings:**
- VR nursing education: one meta-analysis found improved theoretical knowledge (SMD ≈ 0.97) but **no significant improvement in practical skills** (SMD ≈ 0.15, CI includes 0) and no significant critical-thinking advantage [MA, P]. A 2026 meta-analysis of 21 RCTs found **no significant effect on nursing skill performance** (SMD = 0.18, CI −0.47 to 0.82) or confidence (0.12, n.s.), with small effects on knowledge (0.32) and self-efficacy (0.46) [MA, P]. This directly contradicts stronger claims.
- Virtual simulation for clinical reasoning: large pooled effects on knowledge (d = 0.84) and skills (d = 1.79), but very high heterogeneity (I² = 89–96%); post-scenario feedback, multiple scenarios, >30 minutes, and non-immersive delivery were associated with better outcomes [MA, P]. The heterogeneity means the average should not be treated as a fixed constant.
- CRM: a meta-analysis found medium knowledge effects and large attitude/behaviour effects, but confidence intervals often bounded zero; a rigorous systematic review found CRM was effective in **less than half** of the most rigorous tests [MA/SR, P]. The safety case is not established.

**Build implication:** simulation is the strongest evidence-backed format for complex skills, but only if you build the **practice loop** (decide → see consequence → get feedback → try again) and the **debrief**. Fidelity is not the priority.

---

### 2.4 VR/AR/XR

**Overall.** Immersive VR (I-VR) has a small average effect on learning: g = 0.38 across 48 studies (105 effect sizes), with 23 of 105 effects negative; effects were larger in K-12 than higher education [MA, P]. Head-mounted-display IVR vs. non-immersive approaches: ES = 0.24 across 35 studies [MA, P]. A 2023 meta-analysis of technology-enhanced simulation found VR at 0.70, lower than physical high-fidelity mannequins at 0.90 [MA, P].

**The counter-evidence is important.** In a well-known experiment, students learned **less** from an immersive VR biology lesson than from a desktop slideshow (post-test d = 0.92 favouring slideshow; factual items d = 1.12), despite reporting more interest and motivation; adding summarisation prompts to the VR lesson closed much of the gap [RCT, P]. A follow-up found IVR produced worse transfer, more extraneous cognitive load, and higher emotional arousal [RCT, P]. A 2024 systematic review of 36 studies concluded that VR often increases extraneous load and hinders learning, especially for novices, whereas AR more often reduces load by supporting spatial contiguity [SR, P].

**When VR does make sense:**
- Spatial or procedural skills (surgery, assembly, maintenance).
- Dangerous or inaccessible environments (fire, heights, confined spaces, electrical).
- Situations where presence/emotional engagement is part of the learning goal (e.g., communication under stress).
- K-12 science and simulation/virtual-world representations, where the average effect is larger.

**When it does not:**
- Factual or conceptual knowledge delivery.
- Novices who lack the prior knowledge to handle a complex 3D environment.
- Short demos where headset discomfort, setup time, and cybersickness consume the learning time. A 2025 review of 130 IVR studies found only 39% measured presence and 10% measured cybersickness; these are real confounds [SR, P].

**AR vs. VR.** AR tends to preserve the real context and reduce split attention; VR replaces it and can add load. For a 24-hour browser demo, **AR-like 2D overlays or a 360° image with hotspots** are more feasible and often more instructionally efficient than a full 3D scene.

**Build implication:** do not use VR as the differentiator. If you want an XR flavor, use a 360° photo/hotspot scene or an optional WebXR "view in headset" button, with the core experience fully playable on a laptop.

---

### 2.5 AI/LLM role-play (2024–2026)

This is the fastest-moving and most hackathon-relevant sub-literature. The evidence is promising but early.

- **LLM simulated patient for surgical history-taking:** an RCT with 90 medical students found the intervention group improved OSCE history-taking scores (Cohen's d ≈ 0.37) vs. standard experiential learning [RCT, P].
- **AI vs. actor-based consultation training:** a multicentre randomised crossover study (396 students) found both improved self-reported communication skills, but the AI condition was slightly inferior (0.36 points on a 10-point scale) and less satisfying; AI was substantially cheaper (£33 vs. £62 per student) [RCT, P].
- **AI standardised patient for serious-illness communication:** a randomised study (n = 51) found larger gains than written materials across empathy, explicitness, and empowerment (Cohen's d ≈ 0.59–0.92), but the sample is small and the report is a preprint [Pre].
- **GenAI patient simulation vs. 360° VR:** a crossover RCT (n = 44) found both improved perceived clinical competence; GenAI showed greater initial gains [RCT, P]. Outcomes were self-reported.
- **Feedback quality is a risk:** a GPT-4 virtual simulated patient study found the model generated plausible feedback but **occasionally misidentified adherence to communication protocols** [P/development study]. Do not let an LLM assign high-stakes grades without a rubric and human review.

**Moderators / design lessons:**
- The scenario prompt, persona, emotional state, and expected learner behaviours need to be tightly specified.
- LLM role-play is good for open-ended communication practice; it is weaker for precise procedural steps unless constrained.
- Latency, cost, safety filtering, and reproducibility are engineering constraints.
- The comparison is usually "AI vs. no practice" or "AI vs. actors"; AI is not reliably better than actors, but it is scalable and cheaper.

**Build implication:** LLM role-play is a strong **stretch** feature, not a safe core. Build a scripted branching fallback first; add LLM chat as an optional layer with a timeout, a rubric, and a "this is a training simulation, not professional advice" disclaimer.

---

### 2.6 Summary table

| Format | Best estimate | Typical moderators | Strongest contexts | Confidence | Key caveat |
|---|---|---|---|---|---|
| Digital game-based learning (school) | g ≈ 0.54 overall; cognitive ≈ 0.67; affective ≈ 0.32; metacognitive n.s. | Integration, multiple sessions, group play, realism, randomisation | K-12, STEM | Moderate | High heterogeneity; many passive controls |
| Serious games vs. conventional | d ≈ 0.29 learning; 0.36 retention; motivation n.s. | Integration, dose, group | School, science | Moderate | Effects shrink with better controls |
| Gamification (higher ed) | g ≈ 0.52; cognitive ≈ 0.72; skill ≈ 0.61; affective ≈ 0.32 | Element combination, context, duration | Higher ed | Low–moderate | Meta-meta adjusted g ≈ 0.32; prediction intervals include negative |
| Serious games (healthcare) | Knowledge 0.16 n.s.; procedural 0.05 n.s.; confidence 0.27 | Design, integration | Health professions | Moderate (null) | Do not overclaim |
| Simulation-based learning (higher ed) | g ≈ 0.85 | Deliberate practice, feedback, debrief, dose | Health, teacher ed, management | High (for complex skills) | Heterogeneity; mostly health |
| Simulation + deliberate practice | r ≈ 0.71 vs. traditional clinical ed | Practice design | Medical procedures | Moderate–high | Small number of studies |
| Technology-enhanced simulation | 0.80 overall; mannequins 0.90; VR 0.70; virtual patients 1.28 | Dose, modality, outcome type | Health professions | Moderate | Observational/heterogeneous |
| Immersive VR | g ≈ 0.38; HMD vs. non-immersive 0.24 | K-12 vs. higher ed, domain, prior knowledge | Spatial/procedural, safety | Low–moderate | Can be worse than slideshow; extraneous load |
| VR safety training | SMD ≈ 0.52 | Behaviour/experience/skills | Construction, fire, mining | Low–moderate | Few behaviour/results measures |
| Business decision games | g ≈ 0.53 | Team play, debrief | Higher ed, corporate | Low–moderate | Conference meta-analysis; self-report risk |
| CRM/aviation | Medium knowledge; large attitudes/behaviour; safety unclear | Rigour of evaluation | Aviation, healthcare teams | Low | Rigorous tests often null |
| AI/LLM role-play | d ≈ 0.37–0.92 vs. weak controls | Prompt design, feedback quality | Communication skills | Low–moderate | Small samples; AI not better than actors; feedback errors |

---

### 2.7 Null and weak findings (read before pitching)

- **Serious games in healthcare:** no significant knowledge, procedural skill, attitude, or behaviour effects in a 29-RCT meta-analysis; only confidence improved [MA, P].
- **Science serious games:** 26 of 79 studies found no difference; 7 favoured conventional instruction [MA, P].
- **Gamification after bias correction:** g ≈ 0.32 for performance; prediction intervals include negative values [MA, P].
- **VR nursing skills:** no significant effect on skill performance in a 21-RCT meta-analysis; another meta-analysis found no practical-skill advantage [MA, P].
- **Immersive VR for factual learning:** worse than a desktop slideshow in a controlled experiment [RCT, P].
- **CRM safety outcomes:** not established; rigorous evaluations often null or mixed [SR, P].
- **Metacognition:** DGBL had no significant effect on metacognitive outcomes [MA, P]. Do not claim your game improves "learning to learn" without a direct measure.
- **Far transfer:** games can improve near transfer but often fail to improve far transfer; one study found a game condition did **worse** on far-transfer items than a non-game condition, plausibly due to extraneous load [C/P — conference paper].
- **Engagement:** gamified cognitive training increased motivation but not cognitive outcomes [MA, P]. Engagement is not a proxy for learning.

---

## 3. Mechanisms: what makes these formats work

### 3.1 Debriefing / after-action review (the highest-leverage ingredient)

**Evidence.**
- A meta-analysis of 61 studies found the after-action review (AAR)/debrief produced an overall **d = 0.79** improvement across training criteria [MA, P]. An expanded meta-analysis of 83 studies found **d = 0.92**, with the largest benefits in tasks that are complex and ambiguous and provide no intrinsic feedback — exactly the kind of tasks simulations are used for [MA, P].
- In technology-enhanced simulation, simulation plus debriefing vs. no intervention produced effects ranging from **0.28 to 2.16** across outcomes; video-assisted debriefing had negligible effects vs. non-video debriefing (ES ≈ 0.10, n.s.) [MA, P].
- In nursing education, debriefing interventions improved clinical competence with g ≈ 1.06; after trim-and-fill correction for publication bias, g ≈ 0.68 [MA, P]. Debriefing for Meaningful Learning improved debriefing quality (SMD ≈ 0.52); video-assisted debriefing improved critical thinking (SMD ≈ 0.90); written and peer-led debriefing did not show advantages [MA, P].
- A systematic review of 70 studies concluded that current debriefing strategies are **not based on robust empirical evidence**; the overall signal is strong, but the specific method is not settled [SR, P]. This is an important honesty caveat.

**Design lessons.**
- **Structure the debrief.** A simple, defensible sequence: (1) what happened? (2) what did you notice/why? (3) what went well? (4) what would you change? (5) what is the transferable principle? This maps to experiential learning and after-action review.
- **Use objective evidence.** The AAR meta-analyses found that alignment to the individual/team and **objective performance review media** consistently contributed to effectiveness. Log the decisions; show the path.
- **Timing and length.** Debrief close to the event; for complex scenarios, longer debriefs (20–30+ minutes in full simulations) are associated with better outcomes, but a 3–5 minute demo needs a compressed 60–90 second debrief. Do not skip it.
- **Individual vs. team alignment.** Align the debrief to the unit that performed: individual debrief for individual play, team debrief for team play.
- **Avoid blame.** Psychological safety matters; frame errors as information.

**Build implication:** allocate 25–35% of the demo time to debrief. The debrief screen is not a "nice to have"; it is the main learning event. Show the learner's path vs. an expert path, with 2–3 specific "why" explanations and one transferable rule.

---

### 3.2 Alignment of mechanics with learning goals

The core failure mode is "chocolate-covered broccoli": a game layered on top of content that does not require the target skill. The game mechanic should **be** the target task, or a close analog.

Evidence:
- Adding game-design elements to a base game produced a small-to-medium enhancement (g ≈ 0.30), and elements added for **content learning** were more effective than elements added for gaming experience [MA, P].
- In gamification, the combination of elements matters; some combinations (e.g., levels + badges + leaderboards) have been associated with negative effects, while performance/measurement plus social/personal elements are more promising [MA, P].
- The ECD logic (below) makes alignment explicit: every decision point should map to a competency and an observable indicator.

**Build implication:** write a one-sentence "learning claim" for each decision point: "This choice requires the learner to [competency]." If you cannot write it, cut the choice.

---

### 3.3 Authenticity and fidelity

**What matters:** functional correspondence between the simulation and the real task, psychological fidelity (the cognitive/affective demands), and salience of relevant information. **What matters less:** photorealistic graphics, physical resemblance, motion platforms, high-fidelity mannequins for novices.

Evidence:
- High vs. low physical fidelity: no significant differences in knowledge, skill, or confidence in undergraduate medical education [MA, Preprint]; no significant difference in knowledge or teamwork in team training [SR, P]; high fidelity can increase stress [SR, P].
- A meta-analysis of 214 studies found that **salience of relevant information** significantly explains variation in simulation effectiveness, and that authenticity and salience are independent design features [MA, P].
- The fidelity literature recommends replacing "fidelity" with "physical resemblance" and "functional task alignment" [P, perspective].
- RAND: high psychological fidelity is key; high physical fidelity is not necessary and can limit practice [Rep].

**Build implication:** make the **decisions** authentic (real cues, real consequences, real distractors), not the **pixels**. A 2D interface with a realistic vital-signs panel and a plausible patient dialogue is more instructionally sound than a low-quality 3D room.

---

### 3.4 Deliberate practice and dose

Deliberate practice is effortful, repeated practice on a defined task with immediate feedback and a focus on improvement, not mere experience. It is the best-supported mechanism in simulation.

Evidence:
- Simulation-based medical education with deliberate practice outperformed traditional clinical education (reported r ≈ 0.71) [MA, P].
- Multiple training sessions outperform a single session (d ≈ 0.54 vs. 0.10) [MA, P].
- Training over more than one day outperforms single-day training (0.94 vs. 0.58) [MA, P].
- Range of difficulty, repetitive practice, and distributed practice are among the strongest instructional-design features (0.68, 0.68, 0.66) [MA, P].
- In virtual simulation for clinical reasoning, scenarios longer than 30 minutes and multiple scenarios were more effective [MA, P].

**Build implication:** a 3–5 minute demo can show **one** deliberate-practice cycle, but the product concept should support **repeated cases with varied difficulty** and a visible progression. In the pitch, say "the demo is one rep; the product is the practice loop."

---

### 3.5 Feedback

Feedback is necessary but not sufficient; its effect depends on specificity, timing, and whether it is actionable.

Evidence:
- Feedback in simulation-based education: pooled effect ≈ 0.44 on skills [MA, P].
- Post-scenario feedback was associated with better clinical reasoning in virtual simulation [MA, P].
- In digital simulation meta-analysis, assessment feedback **after** rather than during training was associated with higher self-efficacy and transfer [MA, P]. This is a useful nuance: immediate continuous feedback can be distracting; a short post-decision explanation plus an end-of-scenario debrief may be better.
- Feedback should target the task and the process, not the person; avoid praise and generic "correct/incorrect" without explanation.

**Build implication:** after each choice, show the **consequence** first (what happened), then a one-sentence **why** (the principle), then move on. Save the deeper analysis for the debrief. Do not interrupt flow with long explanations.

---

### 3.6 Cognitive load

The core idea: working memory is limited; instruction should minimise extraneous load, manage intrinsic load, and support germane processing.

Evidence:
- Seductive details (interesting but irrelevant text/images) reliably impair learning: a meta-analysis of 54 studies found g = −0.43 overall; another found d ≈ −0.30 for retention and −0.48 for transfer [MA, P]. Effects are not always consistent, but the direction is robust enough to design against [P].
- Immersive VR can increase extraneous load and reduce learning, especially for novices [RCT/SR, P].
- Schematic/cartoon-like visuals can outperform photorealistic ones in games, consistent with coherence and load reduction [MA, P].
- Segmenting, signalling, and coherence principles from multimedia learning are foundational [F — Mayer].

**Build implication:** one decision per screen; no decorative animation; no auto-playing video; short sentences; highlight the 2–3 relevant cues; progressive disclosure (let the learner ask for labs/help rather than dumping all data). The UI should be calm.

---

### 3.7 Narrative

Narrative is optional. It can support engagement, context, and emotional connection, but it is not a learning mechanism by itself and can add load.

Evidence:
- In a serious-games meta-analysis, the **absence** of narrative was associated with a numerically larger effect (d ≈ 0.46) than the presence of narrative (d ≈ 0.25), though the difference was not statistically significant [MA, P]. Do not assume a story improves learning.
- A 2×2 experiment found **linear** storytelling and **third-person** perspective produced better learning outcomes than nonlinear storytelling and first-person perspective, contrary to the authors' expectations; engagement mediated the effects [P].
- Narrative immersive VR used as pre-training improved **transfer** but had minimal impact on knowledge acquisition, engagement, or motivation [P]. This suggests narrative can prime context, not replace instruction.
- Narrative game interventions can change health behaviours, but the mechanisms are persuasive/affective, not necessarily instructional [MA, P].

**Build implication:** use a **thin frame story** (role, goal, stakes) to make the decisions meaningful; do not write a branching novel. Keep the task salient. A linear spine with meaningful choices is easier to build and often better than a sprawling nonlinear narrative.

---

### 3.8 Challenge/skill balance and adaptivity

**Evidence.**
- Challenge–skill balance is moderately associated with flow, but the relationship is weaker in education/work contexts and with self-reported state flow [MA, P]. Flow is not a reliable proxy for learning; a review of flow in game-based learning found mainly conceptual claims and weak empirical evidence for a flow–learning link [SR, P].
- A preregistered study (n = 309) manipulating objective difficulty–skill ratio found that the "draw" condition was perceived as most balanced, but balance did **not** produce the predicted inverted-U in enjoyment or play behaviour; the authors conclude balance matters less for behavioural engagement than commonly assumed [P].
- Adaptivity research: computer-controlled adaptivity is more effective for **scaffolding**, while learner-controlled adaptability is more effective for **task progression** [MA, P, 217 studies].
- Difficulty adaptation can backfire: a within-subject study with 167 fifth-graders found that substantial **upward** adaptation decreased situational interest, while substantial downward adaptation increased it [P, Computers & Education 2023].

**Build implication:** for a 24-hour demo, use **2–3 fixed difficulty tiers** or let the learner choose; use adaptive **hints/scaffolds**, not adaptive difficulty. Do not claim "AI personalisation" unless you actually implement and evaluate it.

---

### 3.9 Social presence and collaboration

**Evidence.**
- Group play is a strong moderator in serious games (d ≈ 0.66 vs. 0.22) [MA, P].
- Competitive-collaborative designs outperform pure competition for behavioural outcomes; pure competition can be problematic for some learners [MA, P].
- Networked interactivity increased learning and feelings of social presence, and social presence mediated the effect on learning outcomes [P].
- Social presence has a moderate effect on satisfaction and learning in online higher education [MA, P].
- However, a 29-study gamification meta-analysis found collaboration alone did not moderate learning, and the competition advantage was not robust [MA, P]. Social formats are not a universal fix.

**Build implication:** design a **pair/team mode** (two roles, shared decision, different information) or a classroom wrap-around (think-pair-share, teacher-led debrief). Avoid global leaderboards; if you use competition, make it team-based and low-stakes.

---

### 3.10 What kills learning

A design blacklist, with the mechanism:

| Killer | Mechanism | Evidence |
|---|---|---|
| Seductive details (fun facts, decorative images, memes) | Diverts attention, increases extraneous load | g ≈ −0.43 [MA] |
| Points/badges/leaderboards without learning | Shallow gamification, overjustification, gaming the system | Negative-effects mapping [C/P] |
| Photorealistic 3D for factual content | Extraneous load, distraction, novelty | IVR worse than slideshow [RCT] |
| Long text dumps before a decision | Split attention, overload | Cognitive load theory [F] |
| Immediate "correct/incorrect" with no explanation | No actionable feedback | Feedback meta-analysis [MA] |
| No debrief | Experience without conceptual integration | AAR meta-analysis [MA] |
| Fake choices (all paths lead to the same outcome) | Learner detects agency is illusory; no consequential practice | Design logic; branching-scenario literature |
| Punitive failure / no retry | Reduces exploration and learning from errors | Deliberate-practice literature |
| Pure competition / public leaderboard | Anxiety, demotivation, cheating | Gamification negative effects [C/P] |
| Lag, broken UI, headset discomfort | Consumes learning time; cybersickness | IVR reviews [SR] |
| LLM hallucination / inconsistent persona | Teaches wrong behaviour; erodes trust | AI VSP study [P] |
| Self-report as the only outcome | Measures confidence, not competence | Assessment reviews [SR] |
| One 3–5 minute station treated as high-stakes assessment | Low reliability | OSCE meta-analysis [MA] |

---

## 4. Assessment: showing learning rather than engagement

### 4.1 Evidence-centered design and stealth assessment

**ECD** is the standard design logic for game-based assessment. It has three models:
- **Competency model (CM):** what you want to measure, broken into facets.
- **Evidence model (EM):** the observable behaviours that indicate the competency, plus scoring rules and a statistical model that links observables to the competency.
- **Task model (TM):** the tasks/scenarios that elicit the evidence.

**Stealth assessment** embeds these models in the game so that assessment is unobtrusive and continuous. Shute's work uses Bayesian networks to update mastery estimates from gameplay actions; validity is established by correlating in-game estimates with external measures. In Physics Playground, in-game estimates correlated with an external physics test at r ≈ 0.41; different game mechanics correlated at r ≈ 0.22–0.40 (Shute & Moore, 2017) [P/chapter]. A systematic review of 93 stealth-assessment studies found that most are **validational** (42) or design-only (14); only 4 used the estimates for real-time adaptation/feedback [C]. Stealth assessment is promising but not a solved problem.

**ECD-lite for a 24-hour build:**
1. Pick **2–3 competencies** (e.g., information gathering, clinical judgment, escalation).
2. For each, write **2–4 observable indicators** (e.g., "requests vitals before ordering treatment"; "reassesses after intervention"; "escalates within two decisions").
3. Design **6–10 decision nodes**, each intentionally eliciting one or more indicators.
4. Write a **scoring rule** per choice (0/1/2) and a **weight** per competency.
5. Log the actions; compute a profile; show it in the debrief.
6. Validate the content with one domain expert; pilot with 3–5 learners for ambiguity.

This is enough to demonstrate the **logic** of stealth assessment without building a psychometric model. Be explicit in the pitch: "This is an ECD-lite, rule-based formative assessment; we have not calibrated a Bayesian network."

---

### 4.2 Rubric-based scenario assessment

**Lessons from OSCE and simulation assessment:**
- OSCE reliability depends heavily on the number of stations: a meta-analysis found overall alpha ≈ 0.66 across stations and 0.78 within stations; more stations and more examiners improve reliability [MA, P]. A 2025 meta-analysis found the best internal consistency with **5–10 stations, each under 10 minutes** (alpha ≈ 0.88) [MA, P]. A single 3–5 minute station is **not** reliable for high-stakes decisions.
- OSCE validity for predicting practice readiness is low-to-fair; it is better used for instructional design and formative feedback [SR, P].
- **Global rating scales** scored by experts can have higher inter-station reliability and construct validity than checklists; checklists can miss integrated performance [P].
- **Scenario-specific rubrics** are perceived as more helpful for learning and debriefing, while generic rubrics may be slightly more reliable across scenarios; use scenario-specific anchors for formative feedback, generic dimensions for comparability [P].
- Rater training and behavioural anchors are essential; without them, scores drift.

**24-hour rubric pattern:**
- 3–4 criteria (e.g., "Gathers relevant information," "Interprets cues correctly," "Escalates appropriately," "Communicates clearly").
- 3 levels per criterion (0 = unsafe/incomplete, 1 = partially effective, 2 = effective), with **behavioural anchors** ("asks for vitals and mental status before choosing a treatment").
- A critical-error flag (e.g., "bypasses safety interlock") that overrides the total.
- An expert key per choice; a short "why" for each.
- If possible, have a second rater score 5 recorded attempts to estimate agreement; report it as a pilot, not as validation.

---

### 4.3 Transfer measures

**Near transfer** = new case with the same underlying structure/competency. **Far transfer** = new context/domain. The evidence is much stronger for near transfer; far transfer is weak and can even be negative when game mechanics add load [C/P]. Design a **near-transfer case** for the demo: a new patient/machine/parent with the same decision structure but different surface details. Do not claim far transfer from a 5-minute experience.

**Measurement options:**
- Parallel pre/post concept items (2–3 each; counterbalance order).
- A novel-case decision item scored with the same rubric.
- A "teach-back" or self-explanation prompt scored with a rubric (generative learning; summarisation improved VR learning in Parong & Mayer).
- Process metrics: information gathered before action, redundant tests, time to escalation, safety checks, help-seeking.
- Delayed retention: not feasible in a 24-hour demo; mention as a product roadmap item.

---

### 4.4 A 3–5 minute demo protocol that can show learning

A defensible demo arc:

| Time | Segment | What the judge does | What you show |
|---|---|---|---|
| 0:00–0:20 | Frame | Reads one sentence: role, goal, stakes, time | Clear goal; no tutorial |
| 0:20–2:30 | Play | Makes 3–5 decisions | Consequences, short feedback, visible state change |
| 2:30–3:30 | Debrief | Reviews path vs. expert path | 3 competencies, 2–3 "why" explanations, one transferable rule |
| 3:30–4:30 | Transfer | Solves one novel case/item | Near-transfer performance |
| 4:30–5:00 | Evidence | Reads the evidence panel | Pre/post, process indicators, ECD mapping, limitations |

**If you only have 3 minutes:** cut the transfer item and show pre/post + debrief. Do not cut the debrief.

**What this can show:** that the learner's decisions changed after feedback; that the learner can apply a rule to a new case; that the system captures process evidence; that the debrief is instructionally coherent.
**What it cannot show:** durable retention, workplace behaviour change, or population-level efficacy. Say so.

---

### 4.5 What to log

Log at least:
- `timestamp`, `node_id`, `choice_id`, `latency_ms`
- `info_requests` before the action (which data the learner asked for)
- `help_used`, `retry_count`, `revisited_nodes`
- `critical_error` flags (e.g., unsafe action)
- `confidence` before/after (1–5)
- `self_explanation` text (if used)
- `pre_test`, `post_test`, `transfer_item` scores
- `condition`/`version` (for A/B testing later)

Do **not** log names, emails, or free-text health/personal data. For a hackathon, keep data local (localStorage) and state that no data leaves the browser. If you use an LLM API, disclose what is sent and avoid sensitive content.

---

### 4.6 Claims you can and cannot make

| Claim | Verdict |
|---|---|
| "Simulation with debrief improves complex skills; average effects are large but heterogeneous." | Defensible, with citations. |
| "Our 5-minute demo proves learning." | Not defensible. Say "demonstrates a measurable pre/post gain and a near-transfer response in a single session." |
| "Gamification raises achievement by 0.8 SD." | Not defensible without caveats; bias-corrected estimates are ~0.3 and context-dependent. |
| "VR is more effective than traditional instruction." | Not universally; average effects are small and can be negative for factual learning. |
| "Our game is validated." | Only if you have psychometric validation; a 24-hour build does not. Say "evidence-informed, ECD-lite, formative." |
| "Engagement predicts learning." | Not supported; measure learning directly. |
| "AI gives personalised feedback." | Only if you constrain and evaluate it; LLM feedback can be wrong. |

---

## 5. Landscape and examples

### 5.1 Nursing and medical education

The most mature market. Common formats: virtual simulation, branching scenarios, virtual patients, screen-based sims, high-fidelity mannequins, standardized patients, and OSCE stations. Evidence supports simulation for knowledge and procedural skills; effects on clinical reasoning and critical thinking are mixed. Debriefing is standard practice (INACSL standards). Examples: virtual simulation with decision-branching videos improved thoracic trauma knowledge at 12 weeks but not clinical reasoning significantly [RCT, P]; branching-path simulation improved exam performance vs. lecture [P]; virtual patients are widely used but feedback on clinical reasoning is often limited to easy-to-assess components [SR, P].

**What to borrow:** the debrief culture, the competency language (SBAR, ABCDE, escalation), the rubric discipline, and the "safe to fail" framing.

### 5.2 Aviation

The oldest simulation industry. Flight simulators combined with aircraft training improve performance; motion cueing adds little; performance-paced training beats lock-step [MA, P]. CRM team training improves reactions, learning, and behaviour, but safety bottom-line effects are not established; rigorous evaluations are often null [MA/SR, P]. The lesson for education: **team communication and decision-making can be trained in low-cost part-task simulators**, not only full-motion devices.

### 5.3 Manufacturing and safety

VR safety training has a moderate average effect (SMD ≈ 0.52) and is used for construction, fire, mining, electrical, and confined-space training [MA, P]. However, a review of 52 studies found only 9.6% explicitly used theory and only 36% measured long-term retention [SR, P]. Mixed reality for manual assembly is not consistently better than traditional training; AR is promising, VR is mostly as good [SR, P]. The strongest use cases are dangerous, expensive, or inaccessible tasks: hazard identification, lockout/tagout, emergency response, assembly sequence.

**What to borrow:** the task analysis, the critical-error concept, and the "procedure order" mechanic. A 2D hotspot scene can teach hazard recognition; you do not need a 3D factory.

### 5.4 Business

Business decision-making games show g ≈ 0.53 across 41 studies (N = 8,376), with the largest effect on motivation (0.85) and learning process (0.66), smaller on learning performance (0.45) [MA, C]. Systematic reviews report positive effects on knowledge, cognitive skills, and behaviour, but assessment is often weak and self-reported [SR, P]. The best use is **team decision-making under uncertainty with a debrief**, not content delivery.

### 5.5 Classroom games

Game-based student response systems (e.g., Kahoot) show moderate-to-large effects on achievement and retention in meta-analysis, but the retention estimate (≈1.49) is implausibly large and likely reflects short-term testing/novelty; use these tools for retrieval practice and formative checks, not as a substitute for deep instruction [MA, P]. Classroom games are cheap and scalable, but the evidence is weaker than simulation for complex skills.

### 5.6 WebXR and low-cost browser options

- **WebXR Device API** runs VR/AR in a browser without an app install; support varies by device/browser. It is the lowest-friction route to a headset demo, but it is not necessary for learning.
- **A-Frame** is an open-source web framework for 3D/AR/VR using HTML-like entities; good for a quick 360° scene or simple 3D interaction, but a full 3D learning game is a 24-hour risk.
- **Three.js** is a lower-level 3D library; more control, more code.
- **360° photo + hotspots** is the best cost/benefit XR-ish option: realistic context, low cognitive load, works on laptop/mobile, optional WebXR view.
- **Cybersickness and presence** are under-measured in the literature and in demos; keep sessions short, avoid artificial locomotion, provide a 2D fallback.

### 5.7 Authoring tools

| Tool | What it is | 24h fit | Assessment | Caveats |
|---|---|---|---|---|
| **H5P Branching Scenario** | Free HTML5 content type; tree of branches/endings; can embed video, images, interactive video; scoring per ending or points | High | Scoring per path/ending; no fine-grained competency model | Limited analytics; not a full game engine |
| **Twine** | Open-source interactive fiction; publishes to HTML; variables, conditionals, images, CSS, JS | Very high | Manual variables; custom JS for scoring | Text-first; UI polish takes time; analytics custom |
| **BabloXR** | Research authoring tool; block-based (Blockly) WebXR scenes; browser-based | Low–medium | Not built for assessment | Research prototype; not a production platform |
| **XRAuthor** | Research tool; records webcam lesson and generates video/interactive/VR formats | Low–medium | Auto-generated MCQs/interactions | Limited interaction types; research prototype |
| **iQ3Connect** | Commercial no-code WebXR training platform; CAD to interactive 3D | Low (for 24h) | Enterprise analytics (vendor claim) | Vendor claims; cost/licensing; overkill |
| **Moodle GEAR** | Moodle plugin for 3D/VR/AR scenes, hotspots, spatial quizzes | Low–medium | Quizzes sync to gradebook (vendor claim) | Requires Moodle; vendor claim |
| **Custom React/TS** | Full control; JSON scenario graph; custom scoring/logging | Medium–high (if team can code) | Any | More build time; need to resist scope creep |

**Recommendation:** custom React/TS or Twine for the core; H5P if the team is non-technical and wants a fast branching prototype. Do not start with a 3D engine.

---

## 6. 24-hour feasibility

### 6.1 Scope: what to build and what not to build

**Build:**
- One scenario with 6–10 decision nodes.
- 3 competencies, mapped to choices.
- 2–3 endings (success, partial, critical error).
- Immediate consequence + one-sentence "why" per choice.
- A 60–90 second structured debrief with expert path.
- One near-transfer case or item.
- A pre/post mini-test (2–3 items each).
- An event log and an evidence panel.
- A static deploy (Vercel/Netlify/GitHub Pages) with no login.

**Do not build:**
- A 3D world, avatar customisation, or multiplayer.
- An authoring UI for teachers (use JSON/Sheets).
- LMS integration, SSO, or a database.
- A large content library; one polished scenario beats five rough ones.
- An LLM-only experience; always have a scripted fallback.
- A leaderboard or points economy.

### 6.2 Architecture pattern

```
[Static frontend]
  React + TypeScript + Vite (or plain TS/HTML)
  ├── Scenario loader (JSON)
  ├── State machine (useReducer/XState)
  ├── Decision screen (situation, cues, choices)
  ├── Consequence screen (state change, feedback)
  ├── Debrief generator (rules + templates)
  ├── Transfer item
  ├── Evidence panel
  └── Event logger (localStorage)
[Optional]
  LLM adapter (fetch, timeout 8s, JSON schema, fallback)
[Deploy]
  Static hosting; no server; no PII
```

**Why this shape:** it is testable, deterministic, and demo-safe. The state machine prevents "spaghetti branching"; the JSON keeps content editable by a non-coder; the event log enables the debrief and the evidence panel; the optional LLM is isolated behind a timeout/fallback so a network failure cannot kill the demo.

### 6.3 Scenario schema

A minimal schema that supports ECD-lite:

```json
{
  "id": "sepsis-01",
  "title": "Deteriorating patient",
  "role": "Triage nurse",
  "time_limit_sec": 240,
  "competencies": [
    {"id": "info", "label": "Information gathering", "weight": 0.30},
    {"id": "judge", "label": "Clinical judgment", "weight": 0.40},
    {"id": "esc", "label": "Escalation and communication", "weight": 0.30}
  ],
  "start": "n1",
  "nodes": {
    "n1": {
      "type": "decision",
      "situation": "Maya, 68, arrived with breathlessness. She looks clammy. The waiting room is full.",
      "cues": ["RR 26", "SpO2 92%", "BP 96/58", "HR 112", "Temp 38.4"],
      "choices": [
        {
          "id": "c1",
          "text": "Apply the monitor and take a full set of vitals while asking a focused history.",
          "next": "n2",
          "scores": {"info": 2, "judge": 1},
          "feedback": "Good: you obtain the first set of observations without losing the history.",
          "expert": "This is the expected first action: observe first, history in parallel."
        },
        {
          "id": "c2",
          "text": "Ask about onset, symptoms, and recent illness before touching the monitor.",
          "next": "n2",
          "scores": {"info": 1},
          "feedback": "History is useful, but you delayed the first set of observations in a patient who looks unwell.",
          "expert": "A focused history is important, but in a deteriorating patient, do not delay the first set of observations."
        }
      ]
    },
    "n2": {"type": "decision", "situation": "...", "choices": []},
    "end_success": {"type": "ending", "outcome": "success", "text": "..."}
  }
}
```

**Scoring engine:** weighted sum of choice scores per competency, normalised to 0–100; critical-error flags override; partial credit for plausible-but-incomplete actions. **Debrief generator:** select the top 2 strengths and top 2 gaps from the log; compare to the expert path; insert one transferable principle.

### 6.4 Content-authoring pattern

1. **Pick a decision that matters** (a place where novices commonly go wrong and where the consequence is visible).
2. **Write the competency model** (3 constructs, 2–4 indicators each).
3. **Draft the decision points** on paper or in a spreadsheet: situation, cues, 3–4 choices, consequence, score, why.
4. **Build the expert key** with a domain expert (30–45 minutes is enough for one scenario).
5. **Pilot with 3–5 people** who are not on the team; look for ambiguous choices, unclear cues, and text that is too long.
6. **Cut** any node that does not elicit a target indicator. Aim for 6–10 nodes, not 20.
7. **Write the debrief last**, from the expert key, not from the game code.

**Content rules:**
- One decision per screen; 40–80 words of situation max.
- 3–4 choices; each choice should be plausible to a novice. No strawmen.
- Show the consequence before the explanation.
- Use a consistent "vital signs / status panel" so the learner can see state change.
- Avoid decorative images and irrelevant story details.
- Include at least one "tempting but wrong" choice that reflects a real misconception.
- Include one "safe but incomplete" choice to test prioritisation.

### 6.5 Fallbacks

| Risk | Fallback |
|---|---|
| LLM API down/slow | Scripted branching dialogue; keyword/rubric scoring; disable chat |
| No internet at venue | Static build with local assets; no external fonts/CDNs |
| No projector/audio | Laptop screen; all content text; captions |
| Team runs out of time | Cut to 3 decision nodes + debrief + 1 transfer item; no pre-test |
| No domain expert | Use a published guideline/protocol; label the scenario as "based on [guideline], reviewed by [expert]" only if true |
| Ambiguous choices in pilot | Rewrite or remove; ambiguity is a validity threat |
| 3D/WebXR fails | 2D/360° fallback; never make XR the only path |
| Judge wants "AI" | Show the LLM adapter and the guardrails; if it fails, show the scripted fallback and explain why it is safer |

### 6.6 5-minute demo script

**0:00–0:20 — Frame.**
"Meet Maya, 68, breathless, waiting room full. You are the triage nurse. You have four minutes and six decisions. There is no back button; choose as you would in the department."

**0:20–2:30 — Play.**
Three decision points. Each: read the situation, scan the cues, choose. Show the consequence (vitals change, patient response, time cost). One-sentence "why" after each choice, with an optional "more" expander for judges who want depth. Keep the UI calm.

**2:30–3:30 — Debrief.**
Show the path vs. expert path. Three competencies with scores. Two strengths, two gaps. One "what would you do differently?" prompt (free text). One transferable rule: "In a deteriorating patient, reassess after every intervention; do not anchor on the first diagnosis."

**3:30–4:30 — Transfer.**
A new patient with the same structure but different surface features. One decision. Show whether the rule transferred.

**4:30–5:00 — Evidence.**
Show the evidence panel: pre/post items, process indicators (did you gather info before acting? did you escalate within two decisions?), ECD mapping, and a limitations line: "Single-session formative demo; not a validated high-stakes assessment."

### 6.7 Mapping to judging

- **40% pitch (3 min + 2 min AI reflection):** problem → evidence → demo → learning gain → limitations. The AI reflection can use the event log: "Here is what the system observed, here is what it cannot conclude, here is what we would test next." That is a strong, honest use of AI.
- **40% independent product review:** can a judge play without a facilitator? Is the goal clear in 10 seconds? Is the debrief useful? Does it work on a laptop/mobile? Is it accessible? Does it avoid dark patterns (leaderboards, streak pressure)? Is the content accurate?
- **20% technology & implementation:** ECD-lite, deterministic scoring, event log, LLM guardrails, static deploy, test coverage, no PII.

---

## 7. Three prototype concepts

### 7.1 Concept A — "Deteriorating Patient" (clinical triage)

**Audience:** nursing/medical students, EMTs, clinical staff; also a strong demo for vocational education.

**3–5 minute loop:** one patient, 6 decisions, 2–3 endings, 90-second debrief, one transfer patient.

**Learning goals:** recognise deterioration, gather information before acting, interpret vitals, escalate, communicate using SBAR.

**Evidence fit:**
- Virtual simulation improves knowledge and clinical reasoning; branching scenarios improve knowledge; debriefing has large effects; OSCE-style rubrics are the norm [MA/RCT, P].
- The strongest caution: VR nursing skill effects are often null, so use 2D/screen-based simulation and measure decision quality, not "VR wow."

**Assessment:** 3 competencies (information gathering, clinical judgment, escalation/communication); process metrics (info before action, reassessment after intervention, escalation timing); pre/post 3 items; near-transfer patient; SBAR checklist.

**24h build:** SVG/PNG patient card, vitals panel, dialogue box, choice buttons, consequence screen, debrief screen, event log. One scenario, 8 nodes, 3 endings, 1 transfer case.

**Risks:** medical accuracy; need a clinician reviewer; avoid unsafe advice; include a disclaimer. Do not claim clinical efficacy.

**Stretch:** AI patient chat; team mode (nurse + doctor); adaptive hints.

---

### 7.2 Concept B — "Line Clear" (manufacturing safety / lockout-tagout)

**Audience:** vocational trainees, new production operators, safety induction.

**3–4 minute loop:** a 2D factory scene; identify hazards, sequence lockout-tagout, choose PPE, respond to a fault; debrief; transfer to a second machine.

**Learning goals:** hazard recognition, procedure order, critical safety errors, escalation.

**Evidence fit:**
- VR safety training has a moderate effect (SMD ≈ 0.52); AR is promising for assembly; mixed reality is not consistently better than traditional training, so a well-designed 2D/360° sim is defensible [MA/SR, P].
- Functional task alignment and psychological fidelity matter more than photorealism; low-fidelity can be effective [P/Rep].

**Assessment:** hotspot hazard identification (precision/recall), sequence correctness (order of steps), critical-error flag (bypassing interlock), transfer to a novel machine layout; pre/post 3 items; confidence.

**24h build:** one 2D scene (photo or SVG), hotspot layer, step sequencer (drag/drop or numbered choices), consequence animations (simple), debrief, event log. One scene, 5 hazards, 6 steps, 2 endings.

**Risks:** asset quality; ambiguous hazards; need an expert key; safety content must be accurate. Use a public standard/guideline and cite it.

**Stretch:** 360° photo with WebXR view; randomized hazard placement; multi-machine transfer.

---

### 7.3 Concept C — "The Parent Meeting" (AI role-play for teacher education)

**Audience:** pre-service teachers, teacher PD, school leaders.

**3–5 minute loop:** a chat with a parent about a struggling student; 5–6 turns; choose goals, empathy moves, evidence, and a plan; debrief with quotes; transfer to a second parent profile.

**Learning goals:** active listening, non-defensive framing, evidence-based planning, cultural awareness, managing emotion.

**Evidence fit:**
- Simulation-based learning is effective for complex interpersonal skills in higher education, including teacher education (7 studies in the Chernikova meta-analysis) [MA, P].
- AI/LLM role-play RCTs in healthcare communication show small-to-large gains vs. weak controls, but AI is not better than actors and feedback can be wrong [RCT/P/Pre].
- This is the most theme-aligned concept ("future education") and the most differentiable, but the evidence base for AI role-play in teacher education specifically is thin.

**Assessment:** rubric on empathy, structuring, evidence use, and plan quality; LLM-assisted scoring with a rubric and human review; self-explanation; transfer to a new parent profile; process metrics (open questions, paraphrases, interruptions).

**24h build:** chat UI; scripted fallback with 5 branches; optional LLM adapter with system prompt, persona, guardrails, timeout; debrief with 2 quotes and 3 rubric scores; one transfer persona.

**Risks:** LLM inconsistency/bias; sensitive content; latency; over-reliance on AI feedback. Build the scripted version first; add LLM as an optional layer; never let the LLM assign a high-stakes grade.

**Stretch:** voice input; multiple parent personas; teacher-facing scenario authoring.

---

### 7.4 Recommendation matrix

| Criterion | A: Deteriorating patient | B: Line Clear | C: Parent Meeting |
|---|---|---|---|
| Evidence strength | High | Moderate | Moderate (AI-specific low) |
| Theme fit ("Future Education") | Moderate | Moderate (vocational) | High |
| 24h feasibility | High | High | Medium |
| Visual demo appeal | High | High | Medium |
| Assessment clarity | High | High | Medium |
| Content risk | Medium (medical accuracy) | Medium (safety accuracy) | Medium–high (LLM behaviour) |
| Differentiator | Clinical realism + debrief | Vocational/regional industry | AI role-play + teacher education |

**Recommendation:** if the team has a clinician or health-education advisor, build **A**. If the team has manufacturing/vocational contacts or wants a regional-industry angle, build **B**. If the team has a strong LLM engineer and wants the strongest theme fit, build **C** with a scripted fallback. In all three, the **debrief + transfer item + evidence panel** are the differentiators, not the graphics.

---

## 8. Key sources

### 8.1 Meta-analyses and systematic reviews (learning outcomes)

1. Barz, N., Benick, M., Dörrenbächer-Ulrich, L., & Perels, F. (2023). The effect of digital game-based learning interventions on cognitive, metacognitive, and affective-motivational learning outcomes in school: A meta-analysis. *Review of Educational Research*. https://doi.org/10.3102/00346543231167795 [MA, P]
2. Wouters, P., van Nimwegen, C., van Oostendorp, H., & van der Spek, E. D. (2013). A meta-analysis of the cognitive and motivational effects of serious games. *Journal of Educational Psychology, 105*(2), 249–265. https://doi.org/10.1037/a0031311 [MA, P]
3. Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*, 77–112. https://doi.org/10.1007/s10648-019-09498-w [MA, P]
4. Xu, W. M., Xu, G.-R., & Xing, Q.-W. (2024). The impact of different combinations of game elements for gamified learning in higher education on student learning outcomes: A multilevel meta-analysis. *Studies in Higher Education*. https://doi.org/10.1080/03075079.2024.2416498 [MA, P]
5. Kanadlı, S., & Sancar Tokmak, H. (2026). A meta-analysis of existing meta-analyses on gamification practices in education: It does not fit all. *Review of Education, 14*(3). https://doi.org/10.1002/rev3.70223 [MA, P]
6. Zeng, J., Sun, D., Looi, C.-K., & Fan, A. C. W. (2024). Exploring the impact of gamification on students' academic performance: A comprehensive meta-analysis of studies from 2008 to 2023. *British Journal of Educational Technology*. https://doi.org/10.1111/bjet.13471 [MA, P]
7. Ho, J. C.-S., Hung, Y.-S., & Kwan, L. Y.-Y. (2021). The impact of peer competition and collaboration on gamified learning performance in educational settings: A meta-analytical study. *Education and Information Technologies*. https://doi.org/10.1007/s10639-021-10770-2 [MA, P]
8. Wang, L.-H., Chen, B., Hwang, G.-J., Guan, J., & Wang, Y. (2022). Effects of digital game-based STEM education on students' learning achievement: A meta-analysis. *International Journal of STEM Education, 9*, 19. https://doi.org/10.1186/s40594-022-00344-0 [MA, P]
9. Ma, J., Zhang, Y., Zhu, Z., Zhao, S., & Wang, Q. (2023). Game-based learning for students' computational thinking: A meta-analysis. *Journal of Educational Computing Research*. https://doi.org/10.1177/07356331231178948 [MA, P]
10. Gorbanev, I., et al. (2021). Efficacy of serious games in healthcare professions education: A systematic review and meta-analysis. *Simulation in Healthcare*. https://pubmed.ncbi.nlm.nih.gov/33196609/ [MA, P]
11. Riopel, M., Nenciovici, L., Potvin, P., Chastenay, P., Charland, P., Blanchette Sarrasin, J., & Masson, S. (2020). Impact of serious games on science learning achievement compared with more conventional instruction: An overview and a meta-analysis. *Studies in Science Education, 56*(2), 169–214. https://doi.org/10.1080/03057267.2019.1722420 [MA, P]
12. Chernikova, O., Heitzmann, N., Stadler, M., Holzberger, D., Seidel, T., & Fischer, F. (2020). Simulation-based learning in higher education: A meta-analysis. *Review of Educational Research, 90*(4), 499–541. https://doi.org/10.3102/0034654320933544 [MA, P]
13. Chernikova, O., Sommerhoff, D., Stadler, M. J., Holzberger, D., Nickl, M., Seidel, T., & Fischer, F. (2024). Personalization through adaptivity or adaptability? A meta-analysis on simulation-based learning in higher education. *Educational Research Review*. https://doi.org/10.1016/j.edurev.2024.100662 [MA, P]
14. Chernikova, O., Holzberger, D., Heitzmann, N., Stadler, M. J., Seidel, T., & Fischer, F. (2023). Where salience goes beyond authenticity. *Zeitschrift für Pädagogische Psychologie*. https://doi.org/10.1024/1010-0652/a000357 [MA, P]
15. Cook, D. A., Hatala, R., Brydges, R., Zendejas, B., Szostek, J. H., Wang, A. T., Erwin, P. J., & Hamstra, S. J. (2011). Technology-enhanced simulation for health professions education: A systematic review and meta-analysis. *JAMA, 306*(9), 978–988. https://jamanetwork.com/journals/jama/article-abstract/1104300 [MA, P]
16. Cook, D. A., Hamstra, S. J., Brydges, R., Zendejas, B., Szostek, J. H., Wang, A. T., Erwin, P. J., & Hatala, R. (2012). Comparative effectiveness of instructional design features in simulation-based education: Systematic review and meta-analysis. *Medical Teacher, 35*(1), e867–e898. https://doi.org/10.3109/0142159X.2012.714886 [MA, P]
17. McGaghie, W. C., Issenberg, S. B., Cohen, E. R., Barsuk, J. H., & Wayne, D. B. (2011). Does simulation-based medical education with deliberate practice yield better results than traditional clinical education? A meta-analytic comparative review of the evidence. *Academic Medicine, 86*(6), 706–711. https://ncbi.nlm.nih.gov/pmc/articles/PMC3102783/ [MA, P]
18. Cheng, A., Eppich, W., Grant, V., Sherbino, J., Zendejas, B., & Cook, D. A. (2014). Debriefing for technology-enhanced simulation: A systematic review and meta-analysis. *Medical Education, 48*(7), 657–666. https://doi.org/10.1111/medu.12432 [MA, P]
19. Keiser, N. L., & Arthur, W., Jr. (2021). A meta-analysis of the effectiveness of the after-action review (or debrief) and factors that influence its effectiveness. *Journal of Applied Psychology, 106*(7), 1007–1032. https://doi.org/10.1037/apl0000821 [MA, P]
20. Keiser, N. L., & Arthur, W., Jr. (2022). A meta-analysis of task and training characteristics that contribute to or attenuate the effectiveness of the after-action review (or debrief). *Journal of Business and Psychology, 37*, 953–976. https://doi.org/10.1007/s10869-021-09784-x [MA, P]
21. Song, Y., & Park, S. (2022). Effectiveness of debriefing in simulation-based education for nursing students: A systematic review and meta-analysis. *Journal of Korean Academy of Fundamentals of Nursing, 29*(4), 399–411. https://doi.org/10.7739/jkafn.2022.29.4.399 [MA, P]
22. Cantrell, M. A. (2021). Effectiveness of simulation debriefing methods in nursing education: A systematic review and meta-analysis. *Nurse Education Today*. https://pubmed.ncbi.nlm.nih.gov/34492539/ [MA, P]
23. Duff, J. P., Morse, K. J., Seelandt, J., Gross, I. T., Lydston, M., Sargeant, J., et al. (2024). Debriefing methods for simulation in healthcare: A systematic review. *Simulation in Healthcare*. https://doi.org/10.1097/SIH.0000000000000765 [SR, P]
24. Sim, J. J. M., Rusli, K. D. B., Seah, B., Levett-Jones, T., & Lau, Y. (2022). Virtual simulation to enhance clinical reasoning in nursing: A systematic review and meta-analysis. *Clinical Simulation in Nursing*. https://pmc.ncbi.nlm.nih.gov/articles/PMC9212904/ [MA, P]
25. Liu, K., Zhang, W., Li, W., Wang, T., & Zheng, Y. (2023). Effectiveness of virtual reality in nursing education: A systematic review and meta-analysis. *BMC Nursing*. https://pmc.ncbi.nlm.nih.gov/articles/PMC10540340/ [MA, P]
26. Jeong, Y.-H., & Her, J. (2026). Effects of virtual reality-based simulation education for nursing students: A systematic review and meta-analysis. *BMC Nursing*. https://pmc.ncbi.nlm.nih.gov/articles/PMC13268350/ [MA, P]
27. Efendi, D., et al. (2023). The effect of virtual reality on cognitive, affective, and psychomotor outcomes in nursing staff: Systematic review and meta-analysis. *BMC Nursing, 22*, 170. https://doi.org/10.1186/s12912-023-01312-x [MA, P]
28. Alaker, M., et al. (2022). The potential of immersive virtual reality to enhance learning: A meta-analysis. *Educational Research Review*. https://www.sciencedirect.com/science/article/abs/pii/S1747938X22000215 [MA, P]
29. Wu, B., Yu, X., & Gu, X. (2020). Effectiveness of immersive virtual reality using head-mounted displays on learning performance: A meta-analysis. *British Journal of Educational Technology*. https://doi.org/10.1111/bjet.13023 [MA, P]
30. Parong, J., & Mayer, R. E. (2018). Learning science in immersive virtual reality. *Journal of Educational Psychology, 110*(6), 785–797. https://doi.org/10.1037/edu0000241 [RCT, P]
31. Parong, J., & Mayer, R. E. (2021). Cognitive and affective processes for learning science in immersive virtual reality. *Journal of Computer Assisted Learning, 37*(1), 226–241. https://doi.org/10.1111/jcal.12482 [RCT, P]
32. Poupard, M., Larrue, F., Sauzeon, H., & Tricot, A. (2024). A systematic review of immersive technologies for education: Learning performance, cognitive load and intrinsic motivation. *British Journal of Educational Technology*. https://doi.org/10.1111/bjet.13503 [SR, P]
33. Man, S. S., Wen, H., & So, B. C. L. (2024). Are virtual reality applications effective for construction safety training and education? A systematic review and meta-analysis. *Journal of Safety Research, 88*, 230–243. https://doi.org/10.1016/j.jsr.2023.11.011 [MA, P]
34. Scorgie, D., Feng, Z., Paes, D., Parisi, F., Yiu, T. W., & Lovreglio, R. (2024). Virtual reality for safety training: A systematic literature review and meta-analysis. *Safety Science, 171*, 106372. https://doi.org/10.1016/j.ssci.2023.106372 [SR/MA, P]
35. Daling, L. M., & Schlittmeier, S. J. (2024). Effects of augmented reality-, virtual reality-, and mixed reality-based training on objective performance measures and subjective evaluations in manual assembly tasks: A scoping review. *Human Factors*. https://doi.org/10.1177/00187208221105135 [SR, P]
36. Stefan, H., Mortimer, M., & Horan, B. (2023). Evaluating the effectiveness of virtual reality for safety-relevant training: A systematic review. *Virtual Reality*. https://doi.org/10.1007/s10055-023-00843-7 [SR, P]
37. Hamstra, S. J., Brydges, R., Hatala, R., Zendejas, B., & Cook, D. A. (2014). Reconsidering fidelity in simulation-based training. *Academic Medicine, 89*(3), 387–392. https://academic.oup.com/academicmedicine/article-abstract/89/3/387/8351158 [P, perspective]
38. Straus, S. G., Lewis, M. W., Connor, K., Eden, R., Boyer, M., Marler, T., et al. (2019). *Collective simulation-based training in the U.S. Army: User interface fidelity, costs, and training effectiveness*. RAND Corporation. https://doi.org/10.7249/RR2250 [Rep]
39. Hays, R. T., Jacobs, J. W., Prince, C., & Salas, E. (1992). Flight simulator training effectiveness: A meta-analysis. *Military Psychology, 4*(2), 63–74. https://doi.org/10.1207/s15327876mp0402_1 [MA, P]
40. O'Connor, P., et al. (2008). Crew resource management training effectiveness: A meta-analysis and some critical needs. *International Journal of Aviation Psychology, 18*(4), 353–368. https://doi.org/10.1080/10508410802347044 [MA, P]
41. Salas, E., Burke, C. S., Bowers, C. A., & Wilson, K. A. (2001). Team training in the skies: Does crew resource management (CRM) training work? *Human Factors, 43*(4), 641–674. https://doi.org/10.1518/001872001775870386 [SR, P]
42. Havinga, J., de Boer, R. J., Rae, A., & Dekker, S. W. A. (2017). How did crew resource management take-off outside of the cockpit? A systematic review of how CRM training is conceptualised and evaluated for non-pilots. *Safety, 3*(4), 26. https://doi.org/10.3390/safety3040026 [SR, P]
43. Cai, Y., Liu, Z., Hu, M., Pang, T., Luo, W., Cheng, J., et al. (2024). Business decision-making game facilitates training effectiveness: A three-level meta-analysis. *Academy of Management Proceedings*. https://doi.org/10.5465/AMPROC.2024.13471abstract [MA, C]
44. Faisal, N., Chadhar, M., Goriss-Hunter, A., & Stranieri, A. (2022). Business simulation games in higher education: A systematic review of empirical research. *Education Research International*. https://doi.org/10.1155/2022/1578791 [SR, P]
45. Özdemir, O. (2024). Kahoot! Game-based digital learning platform: A comprehensive meta-analysis. *Journal of Computer Assisted Learning*. https://doi.org/10.1111/jcal.13084 [MA, P]
46. Rodrigues, L., Pereira, F. D., Toda, A. M., Palomino, P. T., Pessoa, M., Carvalho, L. S. G., et al. (2022). Gamification suffers from the novelty effect but benefits from the familiarization effect: Findings from a longitudinal study. *International Journal of Educational Technology in Higher Education, 19*, 9. https://doi.org/10.1186/s41239-021-00314-6 [P]
47. Tsay, C. H.-H., Kofinas, A., Trivedi, S., & Yang, Y. (2020). Overcoming the novelty effect in online gamified learning systems: An empirical evaluation of student engagement and performance. *Journal of Computer Assisted Learning, 36*(2), 128–146. https://doi.org/10.1111/jcal.12385 [P]
48. Almeida, C., Kalinowski, M., & Feijó, B. (2021). A systematic mapping of negative effects of gamification in education/learning systems. *SEAA 2021*. https://doi.org/10.1109/SEAA53835.2021.00011 [C]
49. Almeida, C., Kalinowski, M., Uchôa, A., & Feijó, B. (2023). Negative effects of gamification in education software: Systematic mapping and practitioner perceptions. *Information and Software Technology, 156*, 107142. https://doi.org/10.1016/j.infsof.2022.107142 [SR, P]
50. Sundararajan, N., & Adesope, O. (2020). Keep it coherent: A meta-analysis of the seductive details effect. *Educational Psychology Review, 32*, 707–734. https://doi.org/10.1007/s10648-020-09522-4 [MA, P]
51. Rey, G. D. (2012). A review of research and a meta-analysis of the seductive detail effect. *Educational Research Review, 7*(3), 216–237. https://www.sciencedirect.com/science/article/abs/pii/S1747938X12000413 [MA, P]
52. Alexander, P. A., et al. (2021). Inconsistent seduction: Addressing confounds and methodological issues in the study of the seductive detail effect. *Brain and Behavior*. https://doi.org/10.1002/brb3.2322 [P]
53. Kienitz, A., Krebs, M.-C., & Eitel, A. (2023). Seductive details hamper learning even when they do not disrupt. *PMC*. https://pmc.ncbi.nlm.nih.gov/articles/PMC10176302/ [P]
54. Deterding, S., & Cutting, J. (2023). A test of flow and self-determination theory predictions. *Proceedings of the ACM on Human-Computer Interaction*. https://doi.org/10.1145/3611065 [P]
55. Perttula, A., Kiili, K., Lindstedt, A., & Tuomi, P. (2017). Flow experience in game-based learning: A systematic literature review. *International Journal of Serious Games, 4*(1). https://doi.org/10.17083/ijsg.v4i1.151 [SR, P]
56. Shang, S., & Ni, N. (2023). Understanding the impacts of storytelling and player perspective on learning outcomes: The mediating roles of engagements. *International Journal of Human–Computer Interaction*. https://doi.org/10.1080/10447318.2023.2288732 [P]
57. Lee, K. M., Jeong, E. J., Park, N., & Ryu, S. (2011). Effects of interactivity in educational games: A mediating role of social presence on learning outcomes. *International Journal of Human–Computer Interaction, 27*(7), 620–633. https://doi.org/10.1080/10447318.2011.555302 [P]
58. Mykota, D. (2025). A meta-analysis of social presence in higher education online environments. *International Journal of E-Learning & Distance Education*. https://www.ijede.ca/index.php/jde/article/view/1351 [MA, P]

### 8.2 Assessment and measurement

59. Shute, V. J., Lu, X., & Rahimi, S. Stealth assessment. Handbook chapter. https://myweb.fsu.edu/vshute/pdf/sa_handbook.pdf [Chapter]
60. Shute, V. J., Rahimi, S., Smith, G., Ke, F., Almond, R. G., Dai, C.-P., et al. (2020). Maximizing learning without sacrificing the fun: Stealth assessment, adaptivity and learning supports in educational games. *Journal of Computer Assisted Learning, 37*(1), 127–141. https://doi.org/10.1111/jcal.12473 [P]
61. Rahimi, S., Shute, V. J., Khodabandelou, R., Kuba, R., Babaee, M., & Esmaeiligoujar, S. (2023). Stealth assessment: A systematic review of the literature. *ICLS 2023*. https://doi.org/10.22318/icls2023.395429 [C/SR]
62. Brannick, M. T., Erol-Korkmaz, H. T., & Prewett, M. (2011). A systematic review of the reliability of objective structured clinical examination scores. *Medical Education, 45*(12), 1181–1189. https://doi.org/10.1111/j.1365-2923.2011.04075.x [MA, P]
63. Peng, Q., Luo, J., Wang, C., Chen, L., & Tan, S. (2025). Impact of station number and duration time per station on the reliability of Objective Structured Clinical Examination (OSCE) scores: A systematic review and meta-analysis. *BMC Medical Education*. https://doi.org/10.1186/s12909-025-06691-0 [MA, P]
64. Pelland, L., Kolomitro, K., Hopkins-Rosseel, D. H., & Durando, P. (2022). The scientific rigor of the objective structured examination for competency assessment in health sciences education: A systematic review. *Journal of Physical Therapy Education*. https://doi.org/10.1097/JTE.0000000000000258 [SR, P]
65. Luctkar-Flude, M., Tregunno, D., Egan, R., Sears, K., & Lee, K. (2019?). Reliability and validity of scenario-specific versus generic simulation assessment rubrics. https://www.academia.edu/44961689/Reliability_and_validity_of_scenario_specific_versus_generic_simulation_assessment_rubrics [P/Conference — exact venue uncertain]

### 8.3 AI/LLM role-play

66. McCarrick, C. A., McEntee, P. D., Boland, P. A., Donnelly, S. C., O'Meara, Y., Heneghan, H., et al. (2025). A randomized controlled trial of a deep language learning model-based simulation tool for undergraduate medical students in surgery. *Journal of Surgical Education*. https://doi.org/10.1016/j.jsurg.2025.103629 [RCT, P]
67. Tyrrell, E. G., Sandhu, S., Berry, K., Ghannam, S. F., Lewis, S., Crowfoot, D., et al. (2025). Web-based AI-driven virtual patient simulator versus actor-based simulation for teaching consultation skills: Multicenter randomized crossover study. *JMIR Formative Research*. https://doi.org/10.2196/71667 [RCT, P]
68. Weisman, D., Sugarman, A., Huang, Y. M., Gelberg, L., Ganz, P. A., & Comulada, W. S. (2025). Development of a GPT-4–powered virtual simulated patient and communication training platform for medical students. *JMIR Formative Research*. https://doi.org/10.2196/65670 [P/development study]
69. Haut, K. G., Hasan, M., Carroll, T., Epstein, R. M., Sen, T., & Hoque, M. E. (2025). AI standardized patient improves human conversations in advanced cancer care. *arXiv*. https://doi.org/10.48550/arXiv.2505.02694 [Pre]
70. Fung, T. C. J., Chan, S. L., Lam, C. F. M., Lam, C. Y., & Cheng, C. C. W. (2025). Effects of generative artificial intelligence (GenAI) patient simulation on perceived clinical competency among global nursing undergraduates: A cross-over randomised controlled trial. *BMC Nursing*. https://doi.org/10.1186/s12912-025-03492-0 [RCT, P]

### 8.4 Tools, WebXR, and industry reports

71. H5P. Branching Scenario. https://h5p.org/branching-scenario [V/tool docs; open-source]
72. Twine. https://twinery.org/ [V/tool docs; open-source]
73. A-Frame. https://aframe.io/ [V/tool docs; open-source]
74. WebXR Device API (MDN). https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API [V/tool docs]
75. Barrón Estrada, M. L., Zataraín Cabada, R., Sotelo Rivas, M. A., Ibáñez, M. B., & Bátiz Beltrán, V. M. (2025). BabloXR: An authoring tool for developing WebXR educational applications. *Multimodal Technologies and Interaction, 9*(6), 52. https://doi.org/10.3390/mti9060052 [P]
76. Shen, S., Tan, C. T., & Chen, H.-T. (2025). Educator perceptions of XRAuthor: An accessible tool for authoring learning content with different immersion levels. *CHI 2025*. https://doi.org/10.1145/3706598.3713982 [C]
77. Scavarelli, A., Arya, A., & Teather, R. J. (2024). Circles: A framework for creating inclusive virtual reality learning activities in social learning spaces. https://doi.org/10.56198/u6c0wwzcx [P]
78. iQ3Connect. Web-based XR training platform. https://iq3connect.com/web-xr-training-platform/ [V/vendor claim]
79. Moodle. GEAR — Immersive AR/VR Learning plugin. https://moodle.org/plugins/mod_gear [V/vendor claim]
80. IOGP. (2023). *Gamification techniques in well control training and competency* (Report 668). https://www.iogp.org/blog/news/study-into-the-effectiveness-of-gamification-techniques-in-workplace-learning-published/ [Rep]
81. Baxter, R. J., Holderness, D. K., & Wood, D. A. (2019?). The effects of gamification on corporate compliance training: A field experiment of True Office anti-corruption training programs. https://scholarsarchive.byu.edu/cgi/viewcontent.cgi?article=9216&context=facpub [P/working paper]

### 8.5 Additional sources cited

82. Li, M., Ma, S., & Shi, Y. (2023). Examining the effectiveness of gamification as a tool promoting teaching and learning in educational settings: A meta-analysis. https://pmc.ncbi.nlm.nih.gov/articles/PMC10591086/ [MA, P]
83. The effects of gamification on computerized cognitive training: Systematic review and meta-analysis. https://pmc.ncbi.nlm.nih.gov/articles/PMC7445616/ [MA, P — author list not captured]
84. Technology-enhanced simulation for healthcare professionals: A meta-analysis. https://pmc.ncbi.nlm.nih.gov/articles/PMC10150956/ [MA, P — author list not captured]
85. Effects of simulation fidelity on health care providers on team training—A systematic review. *Simulation in Healthcare* (2024). https://journals.lww.com/simulationinhealthcare/fulltext/2024/01001/effects_of_simulation_fidelity_on_health_care.6.aspx [SR, P]
86. Buchner, J., & Mulders, M. (2025/2026). Still trapped in media comparison? A systematic review of comparative research on immersive virtual reality in education. *Interactive Learning Environments*. https://doi.org/10.1080/10494820.2026.2617986 [SR, P]
87. The strength and direction of the difficulty adaptation affect situational interest in game-based learning. *Computers & Education* (2023). https://www.sciencedirect.com/science/article/pii/S0360131522002652 [P — author list not captured]
88. Shute, V. J., & Moore, G. R. (2017). Consistency and validity in game-based stealth assessment. https://myweb.fsu.edu/vshute/pdf/ShuteMoore.pdf [Chapter]
89. Hua, Y., Cen, X.-Y., Niu, S., & Yu, T. (2021). The impact of the fidelity of simulation on medical undergraduate education: A meta-analysis. *Research Square* preprint. https://doi.org/10.21203/rs.3.rs-147713/v1 [MA, Pre]
90. Elder, J., et al. When does gamified training improve performance? Harvard Business School working paper 19-101. https://www.hbs.edu/ris/Publication%20Files/19-101_ef11c210-fbe8-42cd-945f-5c9c963e4c9a.pdf [Pre/working paper]
91. Gegenfurtner, A., Quesada-Pallarès, C., & Knogler, M. (2014). Digital simulation-based training: A meta-analysis. *British Journal of Educational Technology*. https://doi.org/10.1111/bjet.12188 [MA, P]
92. Improving student learning outcomes using narrative virtual reality as pre-training. *Virtual Reality* (2023). https://doi.org/10.1007/s10055-023-00830-y [P — author list not captured]
93. Costa, J. M. (2023). Using game concepts to improve programming learning: A multi-level meta-analysis. *Computer Applications in Engineering Education*. https://doi.org/10.1002/cae.22630 [MA, P]
94. Regehr, G., MacRae, H., Reznick, R. K., & Szalay, D. (1998). Comparing the psychometric properties of checklists and global rating scales for assessing performance on an OSCE-format examination. *Academic Medicine*. https://doi.org/10.1097/00001888-199809000-00020 [P]

### 8.6 Foundational works (books/classics; no URL needed)

- Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in the acquisition of expert performance. *Psychological Review, 100*(3), 363–406.
- Kolb, D. A. (1984). *Experiential Learning: Experience as the Source of Learning and Development*. Prentice Hall.
- Mislevy, R. J., Steinberg, L. S., & Almond, R. G. (2003). On the structure of educational assessments. *Measurement: Interdisciplinary Research and Perspectives, 1*(1), 3–62.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science, 12*(2), 257–285.
- Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.
- Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience*. Harper & Row.

---

## 9. Uncertainties and contradictions

1. **Gamification effect estimates disagree by a factor of ~2.5.** Meta-analyses range from g ≈ 0.32 (bias-corrected meta-meta) to g ≈ 0.82 (smaller meta-analyses). The difference is explained by inclusion criteria, outcome measures, publication bias, and design quality. Use the lower estimate for planning and the higher only as an optimistic bound.
2. **VR evidence is contradictory.** Some meta-analyses find small positive average effects; controlled media-comparison experiments find VR can be worse than a slideshow for factual learning. The likely moderators are task type (spatial/procedural vs. factual), prior knowledge, immersion, and extraneous load. Do not treat "VR" as a single treatment.
3. **Nursing VR skill effects are often null.** Two recent meta-analyses found no significant effect on skill performance; another found large effects with very high heterogeneity. The difference may be outcome measures, simulation design, or study quality. For a prototype, measure decision quality, not "VR skill."
4. **Debriefing has a strong overall signal but weak method-level evidence.** The AAR meta-analyses show large effects, but a 70-study review concludes specific debriefing strategies are not based on robust evidence. Build a structured, objective, learner-centred debrief; do not claim a specific branded method is proven.
5. **Fidelity is not a reliable predictor.** Physical fidelity often does not correlate with learning; high fidelity can increase stress and cost. Functional task alignment and psychological fidelity are better design targets. There are exceptions for experts and some psychomotor tasks; do not overgeneralise.
6. **Narrative is not necessary and can hurt.** Some studies find no-narrative games outperform narrative games; linear/third-person can outperform nonlinear/first-person. Use a thin frame story, not a branching novel.
7. **Flow is not a learning outcome.** Challenge–skill balance correlates moderately with flow, but flow's link to learning is weak and inconsistently measured. Do not pitch "flow" as evidence of learning.
8. **AI role-play is promising but early.** Most studies are small, short-term, and use self-report or weak controls; AI is not better than human actors; LLM feedback can be wrong. Treat it as a scalable practice tool, not a replacement for human debriefing.
9. **Transfer is the weak link.** Near transfer is plausible; far transfer is weak and sometimes negative. A 5-minute demo can show near transfer at best.
10. **Assessment reliability is a hard constraint.** One OSCE-style station is not reliable; 5–10 stations are needed for good internal consistency. A 3–5 minute demo is formative, not summative.
11. **Most evidence is from health professions and higher education.** K-12, vocational, and corporate evidence is thinner. If you build for vocational education, borrow the simulation/debrief logic but do not assume the effect sizes transfer.
12. **The hackathon context is not a laboratory.** A jury demo with n = 1 cannot establish efficacy. The honest claim is "evidence-informed design + a measurable single-session signal," not "proven learning outcomes."

---

## 10. One-page build checklist

**Learning design**
- [ ] 2–3 competencies, each with 2–4 observable indicators.
- [ ] 6–10 decision nodes; every node elicits at least one indicator.
- [ ] 3–4 plausible choices per node; at least one "tempting but wrong" misconception.
- [ ] Consequence before explanation; one-sentence "why" per choice.
- [ ] 2–3 endings, including a partial-success ending.
- [ ] 60–90 second structured debrief: what happened, what went well, what to change, transferable rule.
- [ ] One near-transfer case/item.
- [ ] Pre/post 2–3 parallel items (if time).
- [ ] No seductive details; one decision per screen; calm UI.

**Assessment**
- [ ] Scoring rules and weights per competency.
- [ ] Critical-error flag (unsafe action) that overrides total.
- [ ] Event log: node, choice, latency, info before action, help, retries, confidence.
- [ ] Evidence panel: profile, expert comparison, process indicators, limitations.
- [ ] Content reviewed by one domain expert; pilot with 3–5 users.
- [ ] No PII; local-only data; disclaimer.

**Demo**
- [ ] 3–5 minute arc: frame → play → debrief → transfer → evidence.
- [ ] Works on laptop and mobile; no facilitator needed.
- [ ] No network dependency for the core; LLM optional with timeout/fallback.
- [ ] 10-second clarity test: a stranger can state the goal and the first action.
- [ ] One memorable "moment" (patient deteriorates, machine faults, parent reacts).
- [ ] Honest limitations slide/panel.

**Pitch**
- [ ] One-sentence problem, one-sentence mechanism, one-sentence evidence.
- [ ] Report effect sizes with caveats, not as guarantees.
- [ ] Show the learning signal, not just the fun.
- [ ] Explain what you would test next (delayed retention, transfer, classroom study).
- [ ] Do not claim "validated," "proven," or "personalised" without evidence.

---

*End of note. This note is a research synthesis, not a substitute for a domain expert review. Numbers are reported as they appear in the cited sources; where sources disagree, the disagreement is noted rather than resolved by assertion.*
