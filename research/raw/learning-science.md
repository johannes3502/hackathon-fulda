# Learning Science, Future Skills & the German/EU Education Context

**Research note for Hackathon Fulda 2026 — “Future Education – Lernen neu denken”**
Prepared 2026-10-23. Scope: learning-science foundations, future-skills frameworks, German/EU policy context, and build implications for a 24-hour prototype.

**How to read this note.** Claims are labelled with their source type in the source table (peer-reviewed, policy report, industry research, institutional, opinion/commentary). Effect sizes are reported as the authors reported them (`d`, `g`, or percentage points). They are not directly comparable across studies. For education-field effects, use Kraft’s benchmarks (below), not Cohen’s generic labels.

---

## 0. Executive summary

1. **Build a learning loop, not a content library.** Retrieval practice, spacing, feedback, and metacognitive calibration are the highest-leverage, lowest-cost mechanisms. Content is increasingly a commodity; the loop is the product.
2. **Difficulty is desirable, but only conditionally.** Retrieval and spacing are robust; interleaving is material-dependent; productive failure requires high design fidelity; feedback can backfire.
3. **Measure delayed retention and transfer, not engagement.** Time-on-task, clicks, satisfaction, and “AI wow” are not learning outcomes. A 10-minute delayed post-test and one novel transfer item are feasible even in a hackathon demo.
4. **Adapt to prior knowledge, not “learning styles.”** The expertise reversal effect is robust: novices benefit from scaffolds and worked examples; experts benefit from less assistance. Learning-styles matching has no actionable evidence.
5. **Feedback quality beats feedback quantity.** Feedback should say what was wrong, why, and what to do next. About 17% of feedback effects in a large meta-analysis were negative; average effects hide bad feedback.
6. **AI is a delivery mechanism, not the learning mechanism.** AI tutors are promising but the evidence is short-term, context-specific, and often researcher-designed. Constrain generation with vetted content, rubrics, and human review.
7. **Future-skills frameworks are directional, not assessment instruments.** OECD, WEF, DigComp, UNESCO, and KMK describe desirable competencies; most are not validated measures. Assess authentic performance, not self-report or badge counts.
8. **The German pain is time, equity, and implementation — not a lack of content.** Teacher shortage, PISA decline, DigitalPakt 2.0’s pedagogy turn, dual-VET matching problems, and unequal Weiterbildung participation define the opportunity.
9. **Trust is won by transparency, teacher control, privacy, and honest limits.** GDPR/Art. 22, the EU AI Act’s education high-risk rules (from 2 Dec 2027), and KMK’s 2024 AI recommendation all point the same way: human final decisions, explainable evidence, data minimisation.
10. **The strongest 24-hour concepts operationalise one mechanism deeply.** Recommended: a retrieval-and-calibration coach; a productive-failure studio; or a teach-back/explanation auditor. Do not build an LMS.

---

## 1. How learning works: evidence, effect sizes, and boundary conditions

### 1.1 Effect-size reality check

Education interventions usually look weaker in classrooms than in labs. Kraft’s analysis of 1,942 effect sizes from 747 RCTs with standardised achievement outcomes proposes these field benchmarks: **< 0.05 SD small, 0.05–0.20 SD medium, ≥ 0.20 SD large** (Kraft, 2020, peer-reviewed). A lab finding of `g = 0.5` is not automatically a classroom `0.5 SD`; implementation, prior knowledge, outcome measure, and test narrowness matter. Many EdTech demos compare against “no treatment” and use self-made quizzes, which inflates apparent effects.

Use effect sizes to choose mechanisms, not to promise outcomes. In the pitch, say “the literature supports this mechanism” rather than “our product will produce a 0.5 SD gain.”

### 1.2 Summary table

| Mechanism | Core claim | Evidence strength | Representative effect / finding | Key caveats | Prototype implication |
|---|---|---|---|---|---|
| **Retrieval practice** (testing effect) | Trying to recall improves later retention more than rereading | Strong, many lab and classroom studies | 50 classroom experiments, 49 effect sizes, N=5,374; 57% medium/large (`d > 0.50`), only 3 negative (Agarwal et al., 2021) | Most outcomes are fact/concept recall; transfer is weaker; test format and feedback matter; most studies are WEIRD | Make short-answer recall the primary interaction; give corrective feedback; do not let learners just reread |
| **Spaced practice** | Distributing study over time improves retention vs massing | Strong in lab; heterogeneous in field | Spaced vs massed retrieval `g = 0.74`; expanding vs uniform schedules not different (`g = 0.034`) (Latimier et al., 2021) | Field STEM meta: significant across 9 courses but not across 8 science/engineering courses; high heterogeneity (Bego et al., 2024) | Schedule reviews over days/weeks; show “next review” dates; avoid cram-mode |
| **Interleaving** | Mixing related categories/examples improves discrimination and transfer | Moderate; material-dependent | Overall `g = 0.42`; maths `g = 0.34`; words `g = −0.39`; expository texts non-significant (Brunmair & Richter, 2019) | Can harm when categories are unrelated or materials are textual/verbal; “two desirable difficulties are not always additive” (Firth et al., 2021) | Interleave only confusable concepts/skills; explain the contrast; do not interleave everything |
| **Elaboration / self-explanation** | Generating “why/how” explanations connects new knowledge to prior knowledge | Moderate–strong | Self-explanation prompts `g = 0.55` across 69 effects, 5,917 participants (Bisra et al., 2018) | Prompt design matters; generic prompts can beat specific ones; some tasks show smaller effects | Ask “why is this true?” and “how does this connect to X?”; require learner-generated explanations |
| **Productive failure** | Problem-solving before instruction, followed by consolidation, can improve conceptual understanding/transfer | Moderate; fidelity-dependent | `g = 0.36` for conceptual knowledge/transfer; `g = −0.03` for procedural knowledge; high-fidelity PF `g = 0.37–0.58` (Sinha & Kapur, 2021) | Younger learners and domain-general skills sometimes favour instruction-first; poor fidelity produces poor results; mostly maths/physics | Use one ill-structured problem, then compare solutions and teach the canonical method; do not leave novices floundering without consolidation |
| **Desirable difficulties** (umbrella) | Making learning harder in the right way can improve retention/transfer | Framework, not a single intervention | Supported by retrieval, spacing, interleaving, generation; effects vary by condition | “Desirable” is conditional; difficulty can become undesirable if learners lack prior knowledge or feedback | Design for effortful recall and error correction, not for smoothness or speed |
| **Cognitive load theory / worked examples** | Novices learn better when extraneous load is reduced; experts need less scaffolding | Strong for novices; robust expertise reversal | Low prior knowledge + high assistance `d = 0.505`; high prior knowledge + low assistance `d = −0.428` (Tetzlaff et al., 2025) | Element interactivity is domain- and prior-knowledge-dependent; worked examples can hurt experts; CLT is a design theory, not a single effect size | Use worked examples, faded scaffolding, and completion problems for novices; remove scaffolds as competence grows |
| **Feedback** | Information about performance can improve learning | Moderate; highly heterogeneous | `d = 0.48` (trimmed) to `0.55`; 17% of effects negative (Wisniewski et al., 2020); stricter EPPI review `g = 0.17` (EPPI, 2021) | Type, timing, and content matter; praise/grades alone are weak; feedback can harm self-esteem or attention if misdirected | Give task/process-level feedback: what, why, next step; avoid “correct/incorrect” only |
| **Metacognition / calibration** | Learners are poor at judging what they know; accurate monitoring improves study decisions | Moderate; interventions have small effects on accuracy | Monitoring-accuracy interventions `g = 0.25` (Janssen et al., 2024); metacomprehension accuracy `MC = 0.24`, barely better than chance (Yang et al., 2022) | Secondary-school students benefit least; timing interventions can backfire; self-report is not calibration | Ask for confidence before/after each answer; show calibration gap; use delayed judgments |
| **Deliberate practice** | Focused, feedback-rich practice on weaknesses improves performance | Contested; domain-dependent | Practice explains ~14% of performance variance overall, ~5% in education (Macnamara et al., 2014, corrected); Ericsson’s reanalysis ~29% (up to 61% after attenuation) | Quantity alone is weak; quality, feedback, and task selection matter; “10,000-hour rule” is not supported as a law | Build a practice loop with error targeting and feedback, not a time counter |
| **Transfer** | Learning should apply to new contexts | Near transfer is common; far transfer is hard | Testing produces transfer `d = 0.40` vs restudy; strongest for application/inference, weakest for rearranged items and worked examples (Pan & Rickard, 2018) | Far transfer from generic “brain training” is largely null; publication bias reduces some estimates; transfer depends on varied practice and common elements | Include at least one novel application item; vary contexts; teach principles, not just answers |

### 1.3 Retrieval practice: strong, but not magic

Retrieval practice is the most reliable single mechanism for durable memory. The classroom review by Agarwal, Nunes, and Blunt (2021) screened nearly 2,000 abstracts, coded 50 experiments, and found 49 effect sizes with N=5,374; 57% were medium or large, and only 3 were negative. The effect holds across education levels, content areas, test formats, and delays, but most studies are from WEIRD countries and use experimenter-made quizzes.

Two caveats matter for product design:

- **Retrieval is not the same as recognition.** Multiple-choice questions can trigger retrieval, but short-answer recall is harder and usually more diagnostic. Use a mix, but make learners produce answers.
- **Transfer is weaker than retention.** Pan and Rickard’s meta-analysis (2018) found `d = 0.40` for transfer of test-enhanced learning, with the strongest effects for application and inference questions and the weakest for rearranged stimulus-response items and worked examples. Do not claim “critical thinking” from a fact quiz.

A useful nuance: **interim tests on smaller chunks** outperform one big end test, with a small-to-medium `g = 0.25` (Don et al., 2024). This supports short, frequent retrieval rather than one massive exam.

### 1.4 Spaced practice: robust in lab, messy in field

Spacing is one of the oldest and most replicated findings in learning science. Latimier, Peyre, and Ramus (2021) meta-analysed 29 studies and found spaced retrieval practice strongly outperformed massed retrieval (`g = 0.74`). They also found **no advantage for expanding intervals over uniform intervals** (`g = 0.034`), despite the popular belief that intervals should progressively increase.

But field evidence is more mixed. Bego et al. (2024) embedded spaced vs massed retrieval in bi-weekly quizzes across nine introductory STEM courses. The nine-course meta-analysis found a significant but small improvement of about 2 percentage points; the eight science/engineering courses alone were not significant, and heterogeneity was very high (`I² ≈ 89%`). The lesson: spacing is a good default, but implementation (quiz format, feedback, whether students study between quizzes) can swamp the effect.

For a prototype: use a simple scheduler (SM-2 or Leitner), show next review dates, and avoid claiming a specific “memory boost.” The visible mechanism — “this item returns in 3 days because you almost forgot it” — is more credible than a generic streak.

### 1.5 Interleaving: powerful for discrimination, not universal

Interleaving means mixing different but related categories or problem types, rather than blocking one type at a time. Brunmair and Richter’s meta-analysis (2019; 59 studies, 238 effect sizes) found an overall `g = 0.42`, but the effect was strongly material-dependent:

- paintings/visual materials: `g = 0.67`
- mathematical tasks: `g = 0.34` (small, heterogeneous)
- words: `g = −0.39` (blocking better)
- expository texts: non-significant

A classroom study by Sana and Yan (2022) with 155 high-school science students found that blocked quizzes improved later performance over no quiz (`d = 0.30`), and interleaved quizzes improved it further over blocked quizzes (`d = 0.35`). That is a clean retrieval + interleaving demonstration.

Design rule: interleave **confusable categories** where contrast is informative (e.g., correlation vs causation, similar formulas, different legal concepts). Do not interleave unrelated topics or vocabulary lists just to look “adaptive.” Firth et al. (2021) note that two desirable difficulties are not always additive; spacing can even reduce the interleaving benefit.

### 1.6 Elaboration and self-explanation: make learners generate meaning

Self-explanation is the learner’s own articulation of why something is true, how it works, or how it relates to prior knowledge. Bisra et al. (2018) meta-analysed 69 effect sizes (5,917 participants) and found `g = 0.55` for self-explanation prompts, with benefits across tasks and education levels. Generic prompts (“Explain why this is true”) sometimes outperform highly specific prompts because they force deeper processing.

This is one of the best mechanisms for an AI product because the AI can ask “why?” and evaluate the explanation, rather than merely generating content. But explanation quality is hard to score reliably; use a rubric with dimensions (accuracy, causal coherence, completeness, use of evidence/examples) and keep the learner’s original text visible so teachers/judges can audit the score.

### 1.7 Productive failure: start with a problem, then teach

Productive failure (PF) reverses the usual sequence: learners attempt an ill-structured problem before instruction, then the teacher consolidates and compares solutions. Sinha and Kapur’s meta-analysis (2021; 53 studies, 166 comparisons) found `g = 0.36` favouring problem-solving-first over instruction-first for conceptual knowledge and transfer. The effect was larger with high fidelity to PF principles (`g = 0.37–0.58`), but **procedural knowledge showed no benefit** (`g = −0.03`). Younger learners (grades 2–5) and domain-general skills sometimes favoured instruction-first.

The practical implication: PF is not “let students fail and figure it out.” It requires:

1. a problem that surfaces prior knowledge and multiple representations,
2. group work / multiple solution paths,
3. instruction that builds on student solutions,
4. consolidation of the canonical method,
5. a transfer task.

For a 24-hour prototype, one well-designed problem in one domain is enough. Do not claim PF works for every age or topic.

### 1.8 Desirable difficulties: a useful umbrella, not a license for confusion

“Desirable difficulties” (Bjork) is a framework: retrieval, spacing, interleaving, generation, and variation can make learning feel harder but produce better retention/transfer. The evidence is strongest for retrieval and spacing, moderate for interleaving, and conditional for the rest. The word “desirable” is doing a lot of work: difficulty is desirable only when learners have enough prior knowledge, get feedback, and can eventually succeed.

A hackathon demo should make difficulty **visible and productive**: show the learner struggling, getting a hint, correcting the error, and succeeding on a later item. Do not optimize for a frictionless “delightful” experience; that often produces fluency illusions.

### 1.9 Cognitive load theory and worked examples: adapt to expertise

Cognitive load theory (CLT) argues that working memory is limited and instruction should minimise extraneous load, especially for novices. The most robust practical finding is the **worked-example effect**: novices learn more from studying worked solutions than from unguided problem-solving. The complementary **expertise reversal effect** is robust: scaffolding that helps novices can hinder experts.

Tetzlaff et al. (2025) meta-analysed 176 effect sizes from 60 experiments (5,924 participants): low prior-knowledge learners benefited from high-assistance instruction (`d = 0.505`), while high prior-knowledge learners benefited from low-assistance instruction (`d = −0.428`). The effect was moderated by prior-knowledge assessment, educational status, and domain; evidence was less clear for younger students and humanities/language learning.

Design implication: a short diagnostic should estimate prior knowledge and adjust scaffolding. Do not personalise by “visual/auditory” preference; personalise by **what the learner already knows** and **where they make errors**.

### 1.10 Feedback: average effects hide bad feedback

Feedback is often called “one of the most powerful influences on learning,” but the evidence is more nuanced. Wisniewski, Zierer, and Hattie (2020) meta-analysed 435 studies (994 effects, N>61,000) and found a medium effect (`d = 0.48` after trimming extreme values; `d = 0.55` weighted), but **17% of effects were negative** and heterogeneity was very high (`I² ≈ 86%`). A stricter EPPI systematic review (2021) found a much smaller `g = 0.17` for feedback vs no feedback/usual practice.

What matters:

- **Content:** task-level and process-level information (“your argument conflates correlation with causation”) beats praise, grades, or generic “good job.”
- **Timing:** immediate vs delayed depends on the task; immediate can help procedural learning, delayed can help transfer.
- **Actionability:** the learner should know what to do next.
- **Self-regulation:** feedback that supports monitoring (“check whether your conclusion follows from the data”) is more durable than answer-giving.

For a prototype: generate **elaborated feedback** with a “what/why/next” structure, and log whether the learner revises. Avoid AI feedback that is fluent but unverifiable; anchor it to a rubric or source text.

### 1.11 Metacognition: the missing multiplier

Learners are poor at judging their own learning. Yang et al. (2022) meta-analysed 502 effects and 15,889 participants and found metacomprehension accuracy `MC = 0.24` — actual comprehension accounted for only about 5.9% of the variance in judgments, barely better than a coin toss. Janssen et al. (2024) found that monitoring-accuracy interventions have a small overall effect (`g = 0.25`), with whole-task, metacognitive-knowledge, and external-standard interventions working best; timing interventions sometimes backfired.

This is a strong differentiator for EdTech: most apps ask “did you get it right?”; few ask “how confident were you?” and then show the gap. A simple calibration loop — confidence rating before feedback, then a calibration chart — is cheap to build and makes a sophisticated learning mechanism visible.

### 1.12 Deliberate practice: quality, not hours

The “10,000-hour rule” is a popular simplification, not a scientific law. Macnamara, Hambrick, and Oswald (2014; corrected 2018) found that deliberate practice explained about **14% of performance variance overall** and only about **5% in education**; the figures were higher for games (~24%), music (~23%), and sports (~20%). Ericsson’s reanalysis argued that Macnamara et al. used a broader definition (“structured practice”) and estimated ~29% of variance (up to 61% after attenuation correction). The debate is partly definitional.

The practical takeaway is not “practice doesn’t matter”; it is that **how** you practice matters: focused goals, feedback, repetition with variation, and targeting weaknesses. A product that counts hours is not a deliberate-practice product.

### 1.13 Transfer: near is achievable, far is hard

Transfer is the ability to apply learning to new contexts. The evidence supports **near transfer** (similar tasks/contexts) much more than **far transfer** (unrelated domains). Pan and Rickard (2018) found that retrieval practice can produce transfer (`d = 0.40`), especially to application and inference questions, but the effect is weaker for rearranged items and worked examples. Working-memory training produces near transfer but no convincing far transfer to intelligence or real-world skills (Melby-Lervåg et al., 2016; Sala et al., 2019).

Design implication: build **varied practice** and **application tasks** into the loop. A single quiz on the same wording is a retention test, not a transfer test. For the demo, include one novel scenario that requires using the concept differently.

### 1.14 What this means for a 24-hour prototype

- Pick **one or two mechanisms** and make them visible. “Retrieval + calibration” is more credible than “AI-powered personalized learning platform.”
- Use **short-answer or explanation tasks**, not only multiple choice.
- Show **delayed retention** (even 10 minutes) and **one transfer item**.
- Give **elaborated feedback** and log revision.
- Adapt to **prior knowledge** via a short diagnostic, not “learning styles.”
- Keep the **teacher in the loop** with a class-level dashboard and editable content.
- Be explicit about **limits**: small demo, short delay, no efficacy claim.

---

## 2. Myths and overclaims relevant to EdTech

### 2.1 Learning styles (VARK, visual/auditory/kinesthetic)

**Status: not actionable; the “meshing hypothesis” is not supported.**

The popular claim is that matching instruction to a learner’s preferred modality (visual, auditory, kinesthetic) improves learning. The evidence does not support this as a design principle. Pashler et al. (2008) set out the criteria for a valid crossover interaction and found little evidence; subsequent reviews reached similar conclusions. Touloumakos et al. (2023) tested visual/auditory/kinesthetic types with sign-language stimuli and found no difference in learning between types across three measures.

A 2024 meta-analysis by Clinton-Lisell and Litzinger is sometimes cited as revival evidence: it found an overall `g = 0.31` for matched vs unmatched instruction, but **only 26% of learning outcomes showed the crossover interaction** required to support the matching hypothesis, most studies were low quality, and heterogeneity was very high (`I² ≈ 91%`). The authors themselves conclude the benefits are “too small and too infrequent to warrant widespread adoption.”

**Pitch implication:** Do not say “we adapt to visual learners.” Say “we adapt to prior knowledge and error patterns.” The latter is evidence-based and more defensible.

### 2.2 Bloom’s 2-sigma problem

**Status: real finding, but widely oversimplified.**

Bloom (1984) reported that one-to-one tutoring plus mastery learning produced about a 2-standard-deviation advantage over conventional group instruction. The claim is often used to promise that AI tutors will produce 2-sigma gains. The original studies had small samples, used a narrow probability/cartography test, and bundled tutoring with mastery learning, extra time, frequent testing, feedback, and retesting. The tutoring condition also used a higher mastery threshold (90%) than the classroom mastery condition (80%).

Von Hippel’s 2024 review concludes that the 2-sigma effects were real but “obtained on a narrow, specialized test” and “weren’t obtained by tutoring alone.” Rigorous evaluations of intensive, well-designed tutoring typically find about **one-third of a standard deviation** on broad tests, with a range from 2 SD to zero or worse.

**Pitch implication:** Do not promise 2 sigma. If you mention Bloom, say “the original 2-sigma result was a bundled, narrow-test finding; modern intensive tutoring typically produces ~0.3 SD on broad tests.” That honesty signals expertise.

### 2.3 Digital natives

**Status: myth.**

The claim that young people born into technology are “digital natives” with innate tech savvy and multitasking ability is not supported. Kirschner and De Bruyckere (2017) review the evidence: there is no information-savvy digital native generation, and humans cannot multitask; they task-switch, which harms learning. Exposure to technology does not equal digital literacy or the ability to use it for learning.

**Pitch implication:** Do not assume students can use your tool without instruction. Design onboarding, accessibility, and low-threshold entry. Also do not assume teachers are “digital immigrants” who need simplistic UI; they need workflow fit.

### 2.4 Other red flags

- **Brain training / far transfer:** Working-memory training produces near transfer but no convincing far transfer to intelligence or real-world skills (Melby-Lervåg et al., 2016; Sala et al., 2019). Do not claim “trains your brain.”
- **Multitasking:** Task-switching costs are real; “multitasking” is not a skill to train.
- **Engagement = learning:** Time-on-task, streaks, clicks, and satisfaction can rise while learning does not. Use learning outcomes.
- **AI replaces teachers:** The evidence supports AI as a tutor/assistant in constrained contexts, not as a replacement for teachers or assessment judgement. KMK explicitly reserves final assessment to teachers (KMK, 2024).
- **AI detection:** AI-text detectors are unreliable and can produce false accusations. Do not build assessment on detection.
- **“Personalization” without a learner model:** Recommending content is not personalization. Adapt to prior knowledge, errors, and goals.

---

## 3. Future skills 2024–2026

### 3.1 OECD Learning Compass 2030

The OECD Learning Compass 2030 is an aspirational framework, not an assessment instrument. It has seven elements:

1. **Core foundations** — literacy, numeracy, data/digital literacy, health, social-emotional skills.
2. **Knowledge** — disciplinary, interdisciplinary, epistemic, procedural.
3. **Skills** — cognitive/metacognitive, social/emotional, practical/physical.
4. **Attitudes and values.**
5. **Transformative competencies** — creating new value, reconciling tensions and dilemmas, taking responsibility.
6. **Student agency / co-agency** — the capacity to set a goal, reflect, and act responsibly, with peers/teachers/community.
7. **Anticipation–Action–Reflection (AAR) cycle.**

The framework’s language is useful for a pitch (“student agency,” “creating new value,” “reconciling tensions”), but it does not tell you how to measure those constructs. Treat it as a **design vocabulary**, not a validated competency model.

### 3.2 WEF Future of Jobs 2025

The World Economic Forum’s 2025 report is an **employer survey**, not a forecast or a skills assessment. Key findings:

- Employers expect **39% of workers’ core skills to change by 2030**, down from 44% in 2023.
- **Analytical thinking** remains the top core skill: about seven in ten employers consider it essential.
- Next: **resilience, flexibility, and agility**; **leadership and social influence**; **creative thinking**; **motivation and self-awareness**; **technological literacy**; **empathy and active listening**; **curiosity and lifelong learning**.
- **AI and big data** are the fastest-growing skills, followed by **networks and cybersecurity** and **technological literacy**.
- Skills-first hiring is expanding but uneven; many employers have not removed degree requirements (OECD, 2025).

Use this for framing (“employers say…”), not for curriculum design. The constructs are broad and self-reported; they are not directly teachable or assessable without operational definition.

### 3.3 DigComp 3.0

The European Digital Competence Framework was updated to **DigComp 3.0** on **27 November 2025** (the fifth edition, replacing DigComp 2.2 from 2022). Key facts:

- **5 competence areas, 21 competences, 4 proficiency levels** (Basic, Intermediate, Advanced, Highly Advanced).
- **Over 500 learning outcomes**, plus an extended glossary and machine-readable formats.
- **AI competence is integrated across all 21 competences**, not as a separate add-on.
- New emphasis: cybersecurity, digital rights and responsibilities, wellbeing/inclusion, and misinformation/disinformation.
- Widely used: adopted by at least 22 EU member states and used in 27 certification schemes across 25 countries.

For a prototype, DigComp 3.0 is useful as a **competence map** for teacher-facing language and for aligning “AI literacy” claims. Do not claim your tool certifies a DigComp level unless you have a validated assessment.

### 3.4 AI literacy frameworks

There is no single official “AI literacy” standard, but several frameworks converge on similar dimensions:

- **UNESCO AI Competency Framework for Students (2024):** 12 competencies across four dimensions — human-centred mindset, ethics of AI, AI techniques and applications, AI system design — with three progression levels: Understand, Apply, Create.
- **DigComp 3.0 (2025):** AI is transversal across all 21 digital competences.
- **KMK Germany (2024):** “Learning about AI” and “learning with AI,” plus the **4K future competencies** — communication, collaboration, creativity, critical thinking. The KMK recommendation also emphasizes changes to exam culture, teacher professionalization, regulation, and equity.
- **Academic definitions (Chiu et al., 2024):** AI literacy = knowledge/skills to explain how AI works and impacts society, use it ethically, and collaborate with it; AI competency adds confidence and self-reflection. Five components: technology, impact, ethics, collaboration, self-reflection.

For assessment, the literature uses AI literacy tests, self-report surveys, rubrics for artifacts, classroom observation, and interviews. Most are not validated across contexts. A hackathon prototype should assess **performance** (e.g., can the learner critique an AI output, identify bias, or design a simple AI-supported workflow) rather than administer a self-report “AI literacy score.”

### 3.5 21st-century skills and competency-based education

“21st-century skills” is an umbrella term (critical thinking, creativity, collaboration, communication, digital literacy, etc.). The OECD’s 2023 assessment volume identifies six interconnected challenges:

1. defining the construct and learning progression,
2. generalisability across contexts,
3. task and item design (authentic, ill-structured problems),
4. interpreting and scoring evidence,
5. reporting,
6. validation (construct, external, fairness, cross-cultural).

These are not just technical details; they explain why many “21st-century skills” badges are weak. Self-report surveys are especially problematic. Better approaches: scenario-based tasks, portfolios, rubrics with exemplars, process data, teach-back, and expert judgement. All are resource-intensive and subject to bias.

**Competency-based education (CBE)** is a related model: learners progress by demonstrating competencies, not seat time. The evidence base is limited. A 2024 research agenda notes that most CBE studies are single-institution, descriptive, or qualitative; there are few rigorous RCTs or quasi-experiments, and outcome measures are often proxies. Some studies suggest benefits for weaker students and adult learners, but claims of systemic effectiveness are premature.

### 3.6 Micro-credentials and skills-based hiring

**Micro-credentials** are records of small volumes of assessed learning, designed to be portable and stackable. The EU Council Recommendation (2022) defines them and sets standard elements: learner identity, title, issuer, date, learning outcomes, workload (ECTS where possible), level, assessment type, participation form, and quality assurance. They are meant to complement, not replace, degrees.

Recognition is inconsistent. A 2025 European Commission progress report and peer-learning activity found that definitions and use vary across countries and sectors; some systems align with the Recommendation, others have similar practices under different names. Quality assurance and cross-border recognition remain unresolved.

**Skills-based hiring** is growing, but the evidence is sobering. The Harvard Business School / Burning Glass Institute study (2024) found that employers removed degree requirements from many postings, but actual hiring of non-degree candidates barely changed: the net effect was about **0.14% of hires**, or fewer than **1 in 700**. At “skills-based hiring leader” firms, non-degree hires increased by about 18%, and retention was 10 percentage points higher than degree-holding colleagues. The OECD (2025) similarly finds uneven adoption: large firms and public sector lead; SMEs face capacity constraints; trust in non-traditional signals varies.

**Pitch implication:** A micro-credential is not automatically a labor-market currency. If you propose one, show the assessment validity, the issuer’s quality assurance, and the employer partner. Otherwise, call it a “learning record,” not a credential.

### 3.7 What is durable / “uniquely human” — and how to assess it

The phrase “uniquely human” is a rhetorical frame, not a clean empirical boundary. AI can mimic many cognitive skills; what remains comparatively durable is a combination of **judgement, accountability, context, embodiment, and social trust**. A defensible list:

| Durable capability | Why it matters | Better assessment approaches | Caveats |
|---|---|---|---|
| **Problem framing / judgement under uncertainty** | AI can solve well-specified problems; framing the right problem remains human | Ill-structured case studies, think-alouds, portfolios, decision logs | Hard to score reliably; context-dependent |
| **Ethical reasoning and responsibility** | AI can generate options but cannot bear accountability | Scenario-based dilemmas, structured rubrics, reflection, peer review | Social desirability bias; values differ across cultures |
| **Collaboration and communication** | Work is increasingly human-AI-team based | Group performance tasks, observation, peer assessment, process data | Group work confounds individual contribution |
| **Creativity / creating new value** | AI can generate variations; novelty plus usefulness plus responsibility is human | Portfolio + expert judgement, divergent tasks, client briefs | “Creativity” is domain-specific and culturally contested |
| **Metacognition / self-regulation** | Knowing what you don’t know is essential in AI-rich environments | Calibration tasks, learning logs, delayed judgments, process data | Self-report is weak; calibration is task-specific |
| **Domain expertise + AI literacy** | Judgment requires deep domain knowledge; AI use requires critique | Concept inventories, explain-back, AI-output critique, supervised projects | AI literacy tests are often not validated |
| **Adaptability / resilience** | Change is constant; routine skills depreciate | Longitudinal performance, repeated problem-solving, feedback response | Hard to measure in a short demo; avoid self-report claims |

The practical conclusion: **assess performance, not labels.** A learner who can critique an AI output, explain their reasoning, and revise after feedback is more credible than a learner with a “critical thinking” badge.

---

## 4. German/EU context: what is urgent and politically salient

### 4.1 Governance and federalism

Germany’s education system is federal. The **Kultusministerkonferenz (KMK)** coordinates the 16 Länder; curricula, teacher training, and examinations are largely Land responsibilities. Municipal **Schulträger** own school buildings and much of the IT infrastructure. This creates a fragmented procurement and data-protection landscape. A hackathon prototype that assumes a single buyer or a single LMS will misread the market.

For a pitch: name the buyer and the workflow. “For a Berufsschule in Hessen” is more credible than “for all German schools.”

### 4.2 Teacher shortage and time poverty

The KMK’s 2025 projection for 2025–2035:

- **356,000** teacher hiring demand vs **329,000** fully trained graduates → a calculated gap of **27,000** across all teacher types.
- **Sekundarstufe I:** 75,200 demand vs 44,600 supply → a gap of **30,600**.
- **Vocational schools (berufliche Fächer):** 50,500 demand vs 26,500 supply → a gap of **24,000**; the gap widens over time.
- **Primary:** acute shortage in 2025–2027, then improvement; some Länder may see oversupply later.
- The report stresses that aggregate numbers hide regional and subject-specific shortages.

Alternative estimates are larger. A VBE/Klemm study projected up to **81,000** missing teachers by 2030, depending on assumptions about additional reform needs (all-day schooling, inclusion, disadvantaged schools). The range matters: the shortage is real, but the exact number is model-dependent.

**Design implication:** Teachers are time-poor. A tool that adds a new dashboard, a new login, and a new grading workflow will fail. The winning pitch is “saves 20–30 minutes per lesson” or “turns a 45-minute worksheet into a 10-minute retrieval loop,” with evidence from a real teacher.

### 4.3 Learning outcomes and equity: PISA 2022

PISA 2022 (published December 2023) is the latest available PISA cycle. Germany’s results:

- Mathematics **475** (OECD 472), reading **480** (OECD 476), science **492** (OECD 485).
- All three are the **lowest ever measured** in Germany; math and reading are now only at the OECD average.
- **30%** of 15-year-olds are below Level 2 in mathematics; **26%** in reading; **23%** in science.
- The socioeconomic gap is large: advantaged students outperform disadvantaged students by **111 points** in mathematics, vs an OECD average gap of 93 points. Socioeconomic status explains 19% of math variance (OECD average 15%).
- The decline began before the pandemic and continued through it.

This is the political backdrop: **basic skills and equity**, not “future skills” alone. A pitch that only talks about “21st-century skills” and AI may feel disconnected from the urgent problem. Connect your mechanism to **Basiskompetenzen** (reading, math, language) and to disadvantaged learners.

### 4.4 DigitalPakt 2.0

After a long negotiation, Bund and Länder agreed on **DigitalPakt 2.0** on **18 December 2025**:

- **€5 billion total for 2026–2030**, split 50/50 between Bund and Länder.
- The Bund contributes €2.5 billion, largely from the “Infrastruktur und Klimaneutralität” special fund.
- The pact covers **infrastructure, maintenance/support, and digital learning environments** — not just devices.
- A new **Bund-Länder initiative “Digitales Lehren und Lernen”** focuses on teacher training and practice-oriented research; the Bund plans up to **€250 million** for five research clusters and a transfer unit.
- The official period is 2026–2030, with a retroactive start to 1 January 2025; formal signing/ratification was ongoing after the December 2025 agreement.

**Pitch implication:** The funding window is real, but it is not a direct sales channel. Schools and Schulträger procure; Länder set curricula; data protection is decentralized. Position the prototype as a **digital learning environment** or **teacher-training tool** that fits the pact’s pedagogy turn, not as “another app.”

### 4.5 KMK AI recommendation (2024)

On **10 October 2024**, the Bildungsministerkonferenz adopted a cross-Land recommendation on AI in schools. Five themes:

1. **Learning and didactics:** AI can support preparation, differentiated materials, and adaptive practice; research on intelligent tutoring/adaptive environments is still developing.
2. **Examination culture:** Exams should assess AI-related competencies and human-AI co-activity; AI can assist correction, but **final assessment remains a human/teacher decision**. The recommendation cites **Art. 22 GDPR** (no solely automated decisions with legal/significant effects).
3. **Teacher professionalization:** AI competences in all three phases of teacher education; informatics, media education, and pedagogical use.
4. **Regulation:** AI Act, GDPR, copyright, data protection; “ethical by design”; common standards via DigitalPakt projects.
5. **Equity of access:** all students should develop AI competence; avoid a new digital divide.

The recommendation explicitly names the **4K** future competencies — **Kommunikation, Kollaboration, Kreativität, Kritisches Denken** — and calls for changed exam formats. This is a direct hook for a prototype that makes **process** visible (reasoning, explanation, revision), not just final answers.

### 4.6 Dual vocational education (duale Ausbildung)

The dual system is a German strength, but the market is under pressure. BIBB’s 2025 training-market balance:

- **476,000** new dual training contracts in 2025, down **2.1%**.
- **530,300** training places offered, down **4.6%**; company-based offers fell **5%**.
- **84,400** applicants still unplaced at the end of September, up **19.9%** — the highest since 2010.
- **54,400** places unfilled, down **21.6%**; 10.6% of company offers unfilled.
- The problem is increasingly **matching**, not a simple aggregate shortage: regional, occupational, and qualification mismatches.
- **2.86 million** 20–34-year-olds had no vocational qualification in 2024; about **1 million** young people were NEET (not in education, employment, or training).

**Design implication:** For dual VET, the pain is **matching, basic skills, and dropout**, not a lack of content. A prototype that helps applicants articulate evidence of skills, or helps trainers diagnose gaps, is more relevant than a generic flashcard app. But avoid claiming to solve the “Fachkräftemangel” in 24 hours.

### 4.7 Further education (Weiterbildung)

Germany has high but unequal participation:

- **58%** of adults participated in Weiterbildung in the last 12 months (AES 2022); **54%** of 25–65-year-olds participated in formal/non-formal education.
- Including informal learning, **83%** of 18–70-year-olds reported some learning activity.
- Participation is socially graded: in 2020, **77%** of people with a university degree participated in courses vs **47%** of those without a vocational qualification.
- Only about **1%** of adults report continuous annual participation over 13 years (NEPS); most participate sporadically.
- The most common barrier is time; digital formats are growing but not equally accessible.
- The national goal is 65% participation among 25–65-year-olds by 2030; the 2022 figure was 54%.

**Design implication:** Weiterbildung is a large, fragmented market with recognition problems. A micro-credential or learning-record prototype must solve **assessment and recognition**, not just content delivery. Partner with a Weiterbildung provider or chamber; do not invent a credential standard.

### 4.8 Hochschule Fulda

Hochschule Fulda is a **Hochschule für Angewandte Wissenschaften (HAW)** with:

- about **9,500 students**, **60** Bachelor’s/Master’s programmes, **8** departments, **170+** professors;
- its own **doctoral right** since 2016 (first HAW in Germany for selected research-strength areas);
- research strengths in **health, nutrition, food**, **interculturality and social sustainability**, and **computer science/systems engineering** (including human-centred AI, IT security, sensor networks);
- a strong **transfer and application orientation**, dual study programmes, and regional partnerships;
- a 2024 transfer strategy and a 2026–2031 development plan emphasizing quality, equity, internationality, and regional innovation.

It does **not** have a prominent teacher-training profile in the public materials reviewed. The best fit for a hackathon pilot is therefore **Weiterbildung, dual study, health/social services, applied AI/computer science, and regional transfer** — not a claim to reinvent school teacher education. Fulda’s regional economy (health, food, logistics, skilled trades) is a realistic pilot context.

### 4.9 EU legal and policy context

- **GDPR Art. 22:** individuals have the right not to be subject to solely automated decisions with legal or similarly significant effects. KMK explicitly applies this to school assessment. A prototype that auto-grades high-stakes work needs human review.
- **EU AI Act:** education and vocational training are listed in **Annex III** as high-risk for AI systems that determine access/admission, evaluate learning outcomes (including steering the learning process), assess appropriate education level, or monitor prohibited behaviour during tests. The **high-risk rules for Annex III apply from 2 December 2027** (after the AI Omnibus timeline change); **AI literacy obligations** applied from 2 February 2025; **transparency obligations** from 2 August 2026. A formative, teacher-controlled tool may fall outside high-risk, but an AI that evaluates learning outcomes and steers students may be in scope. Design for transparency, logging, human oversight, and bias mitigation from day one.
- **Micro-credentials:** Council Recommendation (2022) and 2025 progress report; recognition remains inconsistent.
- **DigComp 3.0:** EU reference framework for digital competence; AI integrated across all 21 competences.

### 4.10 The most urgent, politically salient problems (ranked for a hackathon pitch)

1. **Basic skills and equity** — PISA decline, 30% below Level 2 in math, strong SES gradient.
2. **Teacher shortage and workload** — 27k–81k projected gap depending on model; time poverty is the adoption barrier.
3. **Digitalisation without pedagogy** — DigitalPakt 2.0 shifts from devices to learning environments, support, and teacher training.
4. **AI in schools** — KMK 2024 recommendation; exam culture, legal uncertainty, teacher professionalization, equity.
5. **Dual VET matching and dropout** — 84k unplaced applicants, 54k unfilled places, 2.86m without vocational qualification.
6. **Lifelong learning inequality** — high overall participation but low continuous participation and strong social gaps.
7. **Recognition of skills** — micro-credentials and skills-based hiring are growing, but recognition and trust are weak.

A strong hackathon pitch picks **one** of these and shows a credible mechanism, not all seven.

---

## 5. Design implications

### 5.1 Fifteen design rules for a learning-science-grounded prototype

1. **Start with a mechanism, not a feature.** “Retrieval + spacing” is a product thesis; “AI chat” is not.
2. **Make the learner produce, not consume.** Short-answer recall, explanation, teach-back, or problem attempt.
3. **Schedule the return.** Show when an item/concept will be reviewed and why.
4. **Interleave only confusable material.** Explain the contrast; do not mix unrelated topics.
5. **Give elaborated feedback.** What was wrong, why, and what to do next.
6. **Ask for confidence.** Calibration is a differentiator and cheap to implement.
7. **Adapt to prior knowledge.** Use a short diagnostic; provide worked examples for novices and less scaffolding for experts.
8. **Measure delayed retention and transfer.** At least one delayed item and one novel application item.
9. **Keep the teacher in the loop.** Class-level misconceptions, editable items, export, no extra grading burden.
10. **Constrain the AI.** Retrieve from vetted content, use rubrics, show sources, allow human review, and have a deterministic fallback.
11. **Design for privacy and legal compliance.** Data minimisation, EU hosting, no training on student data, human final decisions, transparent AI use.
12. **Design for accessibility and language.** Keyboard/screen-reader support, German/English, low bandwidth, mobile-friendly.
13. **Show limits.** State the sample size, delay, and what the demo does not prove. Juries reward honesty.
14. **Align to frameworks without overclaiming.** Use KMK 4K, DigComp 3.0, UNESCO AI competencies as vocabulary; do not badge competencies without validated assessment.
15. **Make the demo a learning experience.** The jury should feel the mechanism, not just watch a dashboard.

### 5.2 What makes educators and juries trust it

**Educators care about:**

- **Time:** does it save preparation/grading time?
- **Fit:** does it match my curriculum, class level, and exam format?
- **Control:** can I edit questions, see what students did, and override the AI?
- **Privacy:** where is data stored? Is it GDPR-compliant? Does it train on my students’ data?
- **Reliability:** what happens when the AI is wrong or offline?
- **Support:** who helps me set it up? Does it work on the devices we have?
- **Evidence:** has it been used in a real classroom, not just a lab?

**Juries care about:**

- **Problem clarity:** a specific user and pain, not a generic “education is broken” story.
- **Mechanism:** a clear learning-science rationale, not just AI.
- **Differentiation:** why this is not ChatGPT with a prompt.
- **Feasibility:** what is built vs mocked; a working demo.
- **Measurement:** evidence of learning, not engagement.
- **Scalability:** cost, procurement, integration, language.
- **Ethics/legal:** privacy, bias, teacher control, AI Act.
- **Team:** ability to execute and learn.

**Trust builders that are cheap in 24 hours:**

- A “Why this works” panel with 2–3 citations and a one-sentence caveat.
- A “What we don’t claim” slide.
- A teacher dashboard with one actionable insight (“62% of the class conflates correlation and causation”).
- A data-flow diagram showing what is stored and where.
- A before/after learning trace from a real test user.
- A named pilot partner or letter of intent.

### 5.3 What is often missing in EdTech demos

1. **Learning outcome measurement.** Most demos show engagement, completion, or “AI magic,” not delayed retention.
2. **Error diagnosis.** A score is not a diagnosis; show the misconception.
3. **Feedback quality.** “Correct/incorrect” or generic praise is not feedback.
4. **Teacher workflow.** The tool adds work instead of removing it.
5. **Prior knowledge.** One-size-fits-all difficulty; no expertise reversal.
6. **Transfer.** Only identical items, no novel application.
7. **Content quality.** LLM hallucinations, no source grounding, no review.
8. **Privacy/legal.** No data map, no GDPR/AI Act consideration, hidden tracking.
9. **Accessibility.** No screen-reader/keyboard support, poor contrast, English-only.
10. **Integration.** No LMS/SIS/CSV path; a standalone silo.
11. **Cost/scale.** No unit economics, no procurement path, no support model.
12. **Honest limits.** Overclaiming “personalization,” “2 sigma,” or “AI tutor replaces teachers.”

### 5.4 A feasible measurement plan for the 24-hour demo

Do not attempt a real efficacy trial. Do a **small, descriptive, within-demo study** and report it honestly.

| Metric | How to measure | Why | Feasibility |
|---|---|---|---|
| **Immediate recall** | 5 short-answer items after a 5-minute learning phase | Shows the basic retrieval effect | High |
| **Delayed recall** | 5 parallel items after a 10-minute distractor task | Shows retention, not just fluency | High |
| **Transfer** | 1 novel application/scenario item | Shows deeper learning | Medium |
| **Calibration** | Confidence rating (0–100%) before feedback; compare to correctness; report Brier score or calibration gap | Shows metacognitive mechanism | High |
| **Error types** | Rubric codes: conceptual, procedural, language, careless | Shows diagnosis, not just score | Medium |
| **Revision quality** | Compare first and second explanation/answer with a rubric | Shows feedback uptake | Medium |
| **Teacher time** | Time a teacher needs to set up a 20-item quiz; 5-question usability survey | Shows adoption potential | High |
| **Engagement** | Optional; do not make it the primary outcome | Useful context, not learning | High |

**Reporting rules:** say “in our demo with N visitors, the retrieval group improved from X to Y; this is descriptive, not evidence of efficacy.” Do not compute p-values on tiny convenience samples and call them significant. If you have 20+ participants, you can report a confidence interval, but still label it exploratory.

### 5.5 A 3-minute demo script

**0:00–0:20 — Hook.** “This is what forgetting looks like.” Show a forgetting curve or a learner’s first vs delayed attempt. “Students reread, feel confident, and forget. Teachers don’t have time to diagnose it.”

**0:20–0:40 — Insight.** “The evidence is clear: retrieval, spacing, and feedback beat rereading. But most EdTech optimizes for content delivery and engagement, not retention.”

**0:40–1:00 — Product.** “We built [name]: a 5-minute loop that makes you recall, explains your error, and schedules the next review.”

**1:00–2:00 — Live demo.** A jury member answers two short-answer questions. The system gives elaborated feedback, asks for confidence, and shows the calibration gap. The dashboard shows “next review in 3 days” and a class misconception.

**2:00–2:20 — Evidence.** “In our demo, we compared retrieval vs rereading; here is the delayed result. The literature supports the mechanism; we are not claiming a 2-sigma effect.”

**2:20–2:40 — Feasibility/trust.** “It runs on existing devices, exports to Moodle/CSV, stores minimal data in the EU, and keeps the teacher in control. Here is our pilot partner.”

**2:40–3:00 — Ask.** “We want to pilot with [specific school/Weiterbildung provider] and measure delayed retention. Thank you.”

**Backup:** a 60-second screen-recorded demo in case the live API fails. Pre-generate the demo content; do not rely on live LLM latency.

---

## 6. Three concrete prototype concepts feasible in 24 hours

### 6.1 Concept A — “Recall Coach” / “Vergiss-mich-nicht”

**User:** secondary/tertiary students or Weiterbildung learners preparing for an exam; teachers who want a low-effort retrieval routine.

**Job to be done:** “Help me remember what I learned, not just feel like I learned it.”

**Core loop:**
1. Learner selects a topic or uploads notes.
2. A short diagnostic (5–8 items) estimates prior knowledge and misconceptions.
3. Learner answers short-answer retrieval questions (not just MCQ).
4. System gives elaborated feedback (“what/why/next”).
5. Learner rates confidence before feedback; system shows calibration.
6. Scheduler sets the next review (SM-2/Leitner); related topics are interleaved when confusable.
7. Teacher dashboard shows class-level misconceptions and next-review load.

**Evidence:** retrieval practice (Agarwal et al., 2021), spacing (Latimier et al., 2021), feedback (Wisniewski et al., 2020), calibration (Janssen et al., 2024; Yang et al., 2022), interleaving for confusable categories (Brunmair & Richter, 2019). Boundary conditions: spacing field effects are heterogeneous; interleaving can harm for texts/words.

**24-hour build:**
- Next.js/React + Tailwind; SQLite/Supabase; one LLM API with pre-generated question bank and cached responses.
- 1 domain, 20–30 concepts, 30–40 short-answer items with rubrics.
- SM-2 scheduler in ~50 lines; confidence slider; calibration chart (Recharts).
- Two screens: learner loop + teacher dashboard; CSV export.
- No auth; demo accounts; deterministic fallback content.

**Demo:** 5-minute study → 5-minute distractor → 5-minute delayed test. Compare retrieval vs rereading with a within-subject or counterbalanced design. Show the “forgetting dashboard” and the teacher misconception heatmap.

**Risks:** crowded flashcard market; LLM grading reliability; question quality; novelty effect. **Differentiator:** the visible calibration + forgetting schedule + teacher insight, not the flashcards.

**Why it can win:** lowest technical risk, strongest evidence base, easy to demo, directly addresses “students forget” and “teachers have no time.”

### 6.2 Concept B — “Failure First Lab”

**User:** secondary/tertiary STEM or vocational learners; teachers who want conceptual understanding, not formula memorization.

**Job to be done:** “Help me understand a hard concept by struggling with it first, then teaching me the canonical solution.”

**Core loop:**
1. Present one ill-structured problem before instruction (e.g., “Design an experiment to test whether this study method works”; “Diagnose why this circuit behaves unexpectedly”).
2. Learner attempts a solution and explains reasoning.
3. System shows contrasting cases / other learners’ approaches (pre-seeded).
4. Expert explanation consolidates the canonical method and connects to the learner’s attempt.
5. Learner revises the solution and writes a self-explanation of what changed.
6. Transfer item: a novel scenario using the same principle.

**Evidence:** productive failure (Sinha & Kapur, 2021; `g = 0.36` for conceptual/transfer; fidelity matters), self-explanation (Bisra et al., 2018), contrasting cases, feedback. Boundary conditions: younger learners/domain-general skills may favour instruction-first; procedural knowledge does not benefit; novices need consolidation.

**24-hour build:**
- One topic with a well-designed problem and two contrasting cases.
- LLM coach with fixed prompts: “What is your current model?”, “What would change your mind?”, “Compare your approach to this case.”
- Capture text; rubric-score the explanation; show a “learning trace” (initial model → misconception → revision).
- No scheduler needed; the artifact is the explanation and revision.

**Demo:** A jury member attempts the problem, sees a contrasting case, revises, and explains the difference. The “wow” is the visible conceptual change, not a score.

**Risks:** problem design is hard; novices may flounder; LLM feedback may be generic; effect is domain-specific. **Differentiator:** “We start with the wrong answer” is a bold, memorable pitch; it operationalizes productive failure rather than content delivery.

**Why it can win:** strong conceptual story, differentiated from quiz apps, demonstrates a sophisticated mechanism. Needs a strong domain expert on the team.

### 6.3 Concept C — “Teach-Back Tutor”

**User:** vocational learners, university students, or employees in Weiterbildung; anyone who needs to prove understanding.

**Job to be done:** “Let me explain it in my own words, show me what I’m missing, and help me remember it.”

**Core loop:**
1. Learner explains a concept in 60 seconds (voice or text) to a peer/avatar.
2. System scores the explanation against a rubric: accuracy, causal coherence, completeness, examples/evidence.
3. System asks 2–3 probing questions targeting gaps (“You said X causes Y; what about Z?”).
4. Learner revises the explanation.
5. System generates retrieval prompts and schedules a later re-test.
6. Output: a “learning card” with the before/after explanation and evidence of revision (not a badge).

**Evidence:** self-explanation (Bisra et al., 2018), protégé/teach-back effect (oral explaining can help), metacognition (Yang et al., 2022), retrieval. Boundary conditions: oral explaining may be more effective than written; scoring reliability is a risk; AI feedback must be grounded.

**24-hour build:**
- Text-first with optional Web Speech API/Whisper; LLM rubric scoring + probing questions.
- 3 concepts; pre-written rubric anchors; deterministic fallback feedback.
- Before/after diff view; calibration rating; export to PDF/CSV.
- Privacy: no audio retention by default; local transcription if possible.

**Demo:** A jury member explains a concept they know (e.g., opportunity cost, why vaccines work, how a loan amortizes). The system finds a gap, asks a probing question, and the revised explanation improves. This is highly engaging and domain-agnostic.

**Risks:** speech latency; rubric reliability; hallucinated critique; privacy of voice data. **Differentiator:** “The best way to learn is to explain” + a visible before/after; it assesses understanding, not recall of options.

**Why it can win:** highest demo “wow,” strong fit with KMK 4K (communication, critical thinking) and AI literacy (critique/explanation), and works across domains. Text fallback reduces risk.

### 6.4 Comparison and recommendation

| Criterion | Recall Coach | Failure First Lab | Teach-Back Tutor |
|---|---|---|---|
| Evidence strength | Very strong | Moderate–strong | Moderate–strong |
| Technical risk | Low | Medium | Medium |
| Demo wow | Medium | High | High |
| Domain flexibility | High | Low–medium | High |
| Teacher fit | High | Medium | Medium |
| Build effort | Low | Medium | Medium |
| Differentiation | Medium (crowded) | High | High |

**Recommendation:** If the team has strong LLM/prompt engineering and a domain expert, build **Teach-Back Tutor** or **Failure First Lab**; they are more distinctive. If the team wants the lowest-risk, most evidence-backed demo, build **Recall Coach** and add a lightweight teach-back step. A hybrid “retrieve → explain → re-test” loop combines the strongest mechanisms but risks scope creep; build the smallest version that demonstrates the loop.

**Do not build in 24 hours:** a full LMS, content marketplace, avatar world, social feed, proctoring, AI detection, complex adaptive learner model, multi-tenant auth, native app, or voice-only interface.

---

## 7. Sources

### 7.1 Peer-reviewed research (meta-analyses, reviews, experiments)

| Source | Type | URL | Used for |
|---|---|---|---|
| Agarwal, Nunes & Blunt (2021). Retrieval Practice Consistently Benefits Student Learning: a Systematic Review of Applied Research in Schools and Classrooms. *Educational Psychology Review*. | Peer-reviewed systematic review | https://doi.org/10.1007/s10648-021-09595-9 | Retrieval practice classroom evidence (49 effects, N=5,374; 57% medium/large) |
| Latimier, Peyre & Ramus (2021). A Meta-Analytic Review of the Benefit of Spacing out Retrieval Practice Episodes on Retention. *Educational Psychology Review*. | Peer-reviewed meta-analysis | https://doi.org/10.1007/s10648-020-09572-8 | Spaced retrieval `g=0.74`; expanding vs uniform `g=0.034` |
| Bego et al. (2024). Single-paper meta-analyses of the effects of spaced retrieval practice in nine introductory STEM courses. *International Journal of STEM Education*. | Peer-reviewed meta-analysis | https://doi.org/10.1186/s40594-024-00468-5 | Field spacing heterogeneity; 9-course vs 8-course results |
| Brunmair & Richter (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin*. | Peer-reviewed meta-analysis | https://doi.org/10.1037/bul0000209 | Interleaving `g=0.42`; math `g=0.34`; words `g=-0.39`; texts ns |
| Sana & Yan (2022). Interleaving Retrieval Practice Promotes Science Learning. *Psychological Science*. | Peer-reviewed classroom experiment | https://doi.org/10.1177/09567976211057507 | Blocked quiz `d=0.30`; interleaved vs blocked `d=0.35` |
| Sinha & Kapur (2021). When Problem Solving Followed by Instruction Works: Evidence for Productive Failure. *Review of Educational Research*. | Peer-reviewed meta-analysis | https://doi.org/10.3102/00346543211019105 | Productive failure `g=0.36`; procedural `g=-0.03`; fidelity |
| Tetzlaff, Simonsmeier, Peters & Brod (2025). A cornerstone of adaptivity – A meta-analysis of the expertise reversal effect. *Learning and Instruction*. | Peer-reviewed meta-analysis | https://doi.org/10.1016/j.learninstruc.2025.102142 | Novices `d=0.505`; experts `d=-0.428` |
| Chen, Retnowati, Chan & Kalyuga (2023). The effect of worked examples on learning solution steps and knowledge transfer. *Educational Psychology*. | Peer-reviewed experiment | https://doi.org/10.1080/01443410.2023.2273762 | Worked examples reduce load for novices; expertise reversal |
| Wisniewski, Zierer & Hattie (2020). The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research. *Frontiers in Psychology*. | Peer-reviewed meta-analysis | https://doi.org/10.3389/fpsyg.2019.03087 | Feedback `d=0.48–0.55`; 17% negative; heterogeneity |
| EPPI (2021). The impact of feedback on student attainment: a systematic review. | Systematic review (policy/evidence) | https://discovery.ucl.ac.uk/id/eprint/10138571/1/Systematic-Review-of-Feedback-EPPI-2021.pdf | Stricter feedback estimate `g=0.17` |
| Bisra, Liu, Nesbit, Salimi & Winne (2018). Inducing Self-Explanation: a Meta-Analysis. *Educational Psychology Review*. | Peer-reviewed meta-analysis | https://doi.org/10.1007/s10648-018-9434-x | Self-explanation `g=0.55` (69 effects, 5,917 participants) |
| Pan & Rickard (2018). Transfer of test-enhanced learning: Meta-analytic review and synthesis. *Psychological Bulletin*. | Peer-reviewed meta-analysis | https://doi.org/10.1037/bul0000151 | Testing transfer `d=0.40`; moderators; publication bias |
| Macnamara, Hambrick & Oswald (2014). Deliberate Practice and Performance in Music, Games, Sports, Education, and Professions: A Meta-Analysis. *Psychological Science*. | Peer-reviewed meta-analysis + corrigendum | https://doi.org/10.1177/0956797614535810 ; corrigendum https://doi.org/10.1177/0956797618769891 | Practice explains ~14% overall, ~5% education |
| Ericsson & Harwell (2019). Deliberate Practice and Proposed Limits on the Effects of Practice… *Frontiers in Psychology*. | Peer-reviewed commentary/reanalysis | https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411/ | Alternative estimate ~29% (up to 61% after attenuation) |
| Clinton-Lisell & Litzinger (2024). Is it really a neuromyth? A meta-analysis of the learning styles matching hypothesis. *Frontiers in Psychology*. | Peer-reviewed meta-analysis | https://doi.org/10.3389/fpsyg.2024.1428732 | Learning styles `g=0.31`, but only 26% crossover; low quality |
| Touloumakos, Vlachou & Papadatou-Pastou (2023). “Visual Type? Not My Type”: A Systematic Study on the Learning Styles Neuromyth… *Mind, Brain, and Education*. | Peer-reviewed experiment | https://doi.org/10.1111/mbe.12380 | No learning difference by “style” |
| Pashler, McDaniel, Rohrer & Bjork (2008). Learning Styles: Concepts and Evidence. *Psychological Science in the Public Interest*. | Peer-reviewed review | https://doi.org/10.1111/j.1539-6053.2009.01038.x | Criteria for a valid learning-styles crossover; little evidence |
| Bloom (1984). The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring. *Educational Researcher*. | Peer-reviewed article | https://facultycenter.ischool.syr.edu/wp-content/uploads/2012/02/2-sigma.pdf | Original 2-sigma claim; bundled tutoring + mastery learning; narrow test |
| Kirschner & De Bruyckere (2017). The myths of the digital native and the multitasker. *Teaching and Teacher Education*. | Peer-reviewed review | https://doi.org/10.1016/j.tate.2017.06.001 | Digital-native myth; task-switching |
| Yang, Zhao, Yuan, Luo & Shanks (2022). Mind the Gap Between Comprehension and Metacomprehension… *Review of Educational Research*. | Peer-reviewed meta-analysis | https://doi.org/10.3102/00346543221094083 | Metacomprehension accuracy `MC=0.24` |
| Janssen et al. (2024). Meta-analysis of Interventions for Monitoring Accuracy in Problem Solving. *Educational Psychology Review*. | Peer-reviewed meta-analysis | https://doi.org/10.1007/s10648-024-09936-4 | Monitoring accuracy `g=0.25`; timing interventions can backfire |
| Kestin, Miller, Klales, Milbourne & Ponti (2025). AI tutoring outperforms in-class active learning: an RCT… *Scientific Reports*. | Peer-reviewed RCT | https://doi.org/10.1038/s41598-025-97652-6 | AI tutor vs active learning; 0.63 regression / 0.73–1.3 quantile; single course |
| Wang et al. (2024). The Efficacy of AI-Enabled Adaptive Learning Systems From 2010 to 2022 on Learner Outcomes: A Meta-Analysis. *Journal of Educational Computing Research*. | Peer-reviewed meta-analysis | https://doi.org/10.1177/07356331241240459 | AI adaptive learning `g=0.70` |
| Ma & Zhong (2025). A Meta-Analysis of the Impact of Generative AI on Learning Outcomes. *Journal of Computer Assisted Learning*. | Peer-reviewed meta-analysis | https://doi.org/10.1111/jcal.70117 | GAI overall `g=0.68`; cognitive `g=0.795` |
| Melby-Lervåg, Redick & Hulme (2016). Working Memory Training Does Not Improve Performance on Measures of Intelligence or Other Measures of “Far Transfer.” *Perspectives on Psychological Science*. | Peer-reviewed meta-analysis | https://pmc.ncbi.nlm.nih.gov/articles/PMC4968033/ | No convincing far transfer from working-memory training |
| Sala et al. (2019). Near and Far Transfer in Cognitive Training: A Second-Order Meta-Analysis. *Collabra: Psychology*. | Peer-reviewed second-order meta-analysis | https://doi.org/10.1525/collabra.203 | Far transfer null after placebo/publication bias |
| Kraft (2020). Interpreting Effect Sizes of Education Interventions. *Educational Researcher*. | Peer-reviewed methods/review | https://doi.org/10.3102/0013189X20912798 | Field benchmarks: <0.05 small, 0.05–0.20 medium, ≥0.20 large |
| DeBacker et al. (2024). A Research Agenda for Competency-Based Education. *Journal of Competency-Based Education*. | Peer-reviewed research agenda | https://doi.org/10.17161/cberj.v1.23064 | CBE evidence is limited, mostly descriptive/single-institution |
| Firth, Rivers & Boyle (2021). A systematic review of interleaving as a concept learning strategy. *Review of Education*. | Peer-reviewed systematic review | https://doi.org/10.1002/rev3.3266 | Interleaving boundary conditions; “two desirable difficulties” not additive |
| Don, Boustani, Yang & Shanks (2024). A grain of truth in the grain size effect… *Journal of Experimental Psychology: Learning, Memory, and Cognition*. | Peer-reviewed experiments + meta-analysis | https://doi.org/10.1037/xlm0001382 | Interim tests on smaller chunks `g=0.25` |

### 7.2 Policy, legal, and institutional sources

| Source | Type | URL | Used for |
|---|---|---|---|
| OECD. The OECD Learning Compass 2030 (concept note). | Policy framework | https://www.oecd.org/content/dam/oecd/en/about/projects/edu/education-2040/concept-notes/OECD_Learning_Compass_2030_concept_note.pdf | Seven elements; transformative competencies; student agency; AAR |
| OECD. Transformative Competencies for 2030 (concept note). | Policy framework | https://www.oecd.org/content/dam/oecd/en/about/projects/edu/education-2040/concept-notes/Transformative_Competencies_for_2030_concept_note.pdf | Creating new value; reconciling tensions; taking responsibility |
| WEF. The Future of Jobs Report 2025. | Industry/policy report (employer survey) | https://www.weforum.org/publications/the-future-of-jobs-report-2025/ | 39% skills change by 2030; top core/fastest-growing skills |
| European Commission JRC. DigComp 3.0. | Policy framework | https://joint-research-centre.ec.europa.eu/scientific-activities/key-competences-lifelong-learning/digital-competence-framework-digcomp/digcomp-30_en | 5 areas, 21 competences, 4 levels, 500+ learning outcomes, AI transversal |
| UNESCO. AI Competency Framework for Students (2024). | Policy framework | https://www.unesco.org/en/articles/ai-competency-framework-students | 12 competencies, 4 dimensions, 3 levels |
| KMK (2024). Handlungsempfehlung für die Bildungsverwaltung zum Umgang mit Künstlicher Intelligenz in schulischen Bildungsprozessen. | Policy recommendation | https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2024/2024_10_10-Handlungsempfehlung-KI.pdf | 5 themes; 4K; human final assessment; Art. 22 GDPR; AI literacy |
| KMK (2025). Lehrkräfteeinstellungsbedarf und -angebot 2025–2035. | Policy/statistics | https://www.kmk.org/fileadmin/Dateien/pdf/Statistik/Dokumentationen/Dok_247_Bericht_LEB_LEA_2025.pdf | 356k demand vs 329k supply; 27k gap; Sek I and vocational shortages |
| BMBF (2025). Bund und Länder einig über den Digitalpakt 2.0. | Policy press release | https://www.bmbfsfj.bund.de/bmbfsfj/aktuelles/pressemitteilungen/digitalisierung-von-schulen-bund-und-laender-einig-ueber-den-digitalpakt-2-0-278566 | €5bn 2026–2030; 50/50; infrastructure/support/learning environments; €250m research |
| BIBB (2025). Angespannte Lage auf dem Ausbildungsmarkt. | Policy/statistics | https://www.bibb.de/dokumente/pdf/pmbilanzausbildungsmarkt2025.pdf | 476k contracts; 530k offers; 84.4k unplaced; 54.4k unfilled |
| OECD. PISA 2022 Results: Germany country note. | Policy/research report | https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/germany_1a2cf137-en.html | Math 475, reading 480, science 492; 30% below Level 2 math; SES gap 111 |
| Council of the EU (2022). Recommendation on a European approach to micro-credentials. | Legal/policy | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=oj%3AJOC_2022_243_R_0002 | Micro-credential definition; standard elements; quality assurance |
| European Commission (2025). Progress report on the implementation of the Council Recommendation on micro-credentials. | Policy report | https://employment-social-affairs.ec.europa.eu/progress-report-implementation-council-recommendation-european-approach-micro-credentials-lifelong_en | Recognition/implementation inconsistent |
| European Commission. AI Act Annex III and application timeline. | Legal/policy | https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3 ; https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai | Education high-risk uses; Annex III rules from 2 Dec 2027; AI literacy from Feb 2025 |
| Hochschule Fulda. Profil / Forschungsprofil / Entwicklungsplan. | Institutional | https://www.hs-fulda.de/hochschule/profil ; https://www.hs-fulda.de/forschung/forschungsprofil | 9,500 students; 60 programmes; 8 departments; research strengths; transfer |
| Nationaler Bildungsbericht 2024 / DIE. Zentrale Ergebnisse Erwachsenen- und Weiterbildung. | Policy/research report | https://www.die-bonn.de/docs/2024_Nationaler_Bildungsbericht_Zentrale_Ergebnisse_EB.pdf | 83% any learning; 54% ages 25–65; 1% continuous; social gaps |
| OECD (2023). 21st Century competencies: Challenges in education and assessment. In *Innovating Assessments to Measure and Support Complex Skills*. | Policy/research report | https://www.oecd.org/en/publications/innovating-assessments-to-measure-and-support-complex-skills_e5f3e341-en/full-report/component-7.html | Six assessment challenges; authentic tasks; validity/fairness |

### 7.3 Industry research, preprints, and commentary

| Source | Type | URL | Used for |
|---|---|---|---|
| Fuller et al. / Burning Glass Institute & Harvard Business School (2024). Skills-Based Hiring: The Long Road from Pronouncements to Practice. | Industry research | https://www.hbs.edu/ris/Publication%20Files/Skills-Based%20Hiring_80b90afa-f6b5-4de9-b7f8-5d8232ce20e2.pdf | Degree requirements dropped but <1 in 700 hires; leader firms +18%, retention +10pp |
| OECD (2025). Empowering the Workforce in the Context of a Skills-First Approach. | Policy report | https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/06/empowering-the-workforce-in-the-context-of-a-skills-first-approach_0e3be363/345b6528-en.pdf | Skills-first adoption uneven; trust in signals varies |
| Leite et al. (2025). Do intelligent tutoring systems benefit K-12 students? A meta-analysis… | Preprint (arXiv) | https://arxiv.org/abs/2511.04997 | ITS K-12 `g=0.271`; 18 studies, 77 effects |
| von Hippel (2024). Two-Sigma Tutoring: Separating Science Fiction from Science Fact. *Education Next*. | Evidence commentary/opinion | https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/ | 2-sigma was narrow/bundled; typical intensive tutoring ~0.33 SD |
| Kremer, Gray-Lobe, de Laat & van der Haar (2023). A Year of Desirable Difficulties: The Impact of Interleaving Math Practice in Nigeria. *NBER Working Paper*. | Working paper | https://doi.org/10.3386/w31853 | Interleaving +0.29 SD short-term; no average cumulative effect; heterogeneous |


---

## 8. Uncertainties, contradictions, and things not to overclaim

1. **Lab vs field effect sizes.** Meta-analytic `g` values often shrink in classroom implementations. Spacing looked strong in lab (`g=0.74`) but was small/non-significant across eight STEM courses (Bego et al., 2024). Do not promise a specific gain.
2. **Retrieval practice is mostly a memory finding.** Transfer is weaker (`d=0.40`) and depends on test format, feedback, and variation. Do not claim “critical thinking” from recall.
3. **Interleaving is not universal.** It can harm for words and expository texts; math effects are small and heterogeneous. Use it only for confusable categories.
4. **Productive failure is fidelity-dependent.** The meta-analysis finds benefits for conceptual/transfer outcomes, not procedural knowledge; younger learners and domain-general skills may favour instruction-first. “Let them fail” without consolidation is not PF.
5. **Feedback is not uniformly positive.** 17% of effects in Wisniewski et al. were negative; stricter reviews find small average effects (`g=0.17`). Bad feedback can harm.
6. **Learning styles are not actionable.** A 2024 meta-analysis found a small overall `g=0.31`, but only 26% of outcomes showed the required crossover and most studies were low quality. The consensus remains: do not match instruction to self-reported modality.
7. **Bloom’s 2 sigma is oversimplified.** The original studies were small, narrow, and bundled with mastery learning, extra time, and higher mastery thresholds. Typical intensive tutoring is ~0.33 SD on broad tests.
8. **Digital natives do not exist.** Exposure to technology is not digital literacy; multitasking is task-switching. But digital access and competence gaps are real; do not swing to “students know nothing.”
9. **Deliberate practice variance is contested.** 14% overall (Macnamara et al.) vs ~29% (Ericsson reanalysis); education ~5%. The “10,000-hour rule” is not supported.
10. **AI tutor evidence is promising but limited.** The Harvard RCT is a single course, post-test only, researcher-designed, with ceiling effects; ITS K-12 meta-analysis finds `g≈0.27`; GAI meta-analyses find larger effects but high heterogeneity. Do not claim AI replaces teachers.
11. **Competency-based education evidence is weak.** Mostly single-institution, descriptive, or qualitative; few RCTs. Potential for adult/weaker learners, but not proven at scale.
12. **Micro-credentials are not automatically labor-market currency.** Recognition is inconsistent; quality assurance varies; employers trust non-traditional signals unevenly.
13. **Skills frameworks are fuzzy.** WEF is an employer survey; OECD Learning Compass is aspirational; “21st-century skills” constructs are hard to define and assess. Use them for framing, not measurement.
14. **German teacher-shortage projections vary.** KMK’s 2025 model says ~27k gap; VBE/Klemm says up to ~81k by 2030. Both are model-based; regional/subject shortages are worse than aggregates.
15. **DigitalPakt 2.0 is not a direct sales channel.** Federalism, procurement, data protection, and support structures mediate access. The pact’s pedagogy turn is an opportunity, not a guarantee.
16. **AI Act timing changed.** Annex III high-risk rules for education apply from **2 December 2027**, not 2026; AI literacy obligations applied from February 2025; transparency from August 2026. Build for compliance, but do not misstate current obligations.
17. **Hochschule Fulda inference.** The public profile shows an applied, transfer-oriented HAW with health/social/CS research strengths; it does not show a prominent teacher-training profile. Treat “Fulda as a school-teacher-training partner” as unverified.
18. **“Uniquely human” is a framing.** AI can mimic many listed skills; the durable human advantage is accountability, context, embodiment, and social trust, not a clean cognitive boundary.

---

## 9. Pitch language and hooks

### 9.1 German

- “Nicht mehr Inhalte – besseres Erinnern.”
- “Wir optimieren nicht auf Klicks, sondern auf Behalten.”
- “Fehler sind der Anfang des Lernens, nicht das Ende.”
- “KI ersetzt keine Lehrkraft – sie gibt ihr Zeit zurück.”
- “Evidenzbasiert, datenschutzkonform, im Unterricht getestet.”
- “Wir machen sichtbar, was Lernende wirklich verstanden haben.”
- “Fünf Minuten Retrieval statt fünfzig Minuten Markieren.”

### 9.2 English

- “Content is not the bottleneck. Forgetting is.”
- “We optimize for retention, not engagement.”
- “The learner does the thinking; the AI does the feedback.”
- “We make the learning mechanism visible.”
- “AI is the tutor’s assistant, not the teacher’s replacement.”
- “Evidence-based, privacy-preserving, teacher-controlled.”

### 9.3 Phrases to avoid

- “Personalized learning for every learning style.”
- “2-sigma gains.”
- “Digital natives.”
- “Brain training.”
- “AI replaces teachers.”
- “Revolutionary.”
- “Engagement is learning.”
- “Our AI is 95% accurate” (unless you have validation data).
- “We certify 21st-century skills” (unless you have a validated assessment).

---

## 10. One-page checklist for the team

- [ ] One specific user and one specific pain, named.
- [ ] One learning mechanism, named and cited.
- [ ] One core loop the jury can experience in under 2 minutes.
- [ ] Short-answer/explanation task, not only MCQ.
- [ ] Elaborated feedback (what/why/next).
- [ ] Confidence/calibration step.
- [ ] Delayed retention item and one transfer item.
- [ ] Prior-knowledge diagnostic or adaptive scaffolding.
- [ ] Teacher dashboard with one actionable insight.
- [ ] Editable content / CSV export.
- [ ] Data map: what is stored, where, for how long.
- [ ] Human final decision for any grading/assessment.
- [ ] German/English UI; keyboard/screen-reader basics.
- [ ] Deterministic fallback if the LLM/API fails.
- [ ] “What we don’t claim” slide.
- [ ] Pilot partner or letter of intent.
- [ ] 60-second backup video.
- [ ] 3-minute pitch rehearsed to 2:50.

---

*End of note.*
