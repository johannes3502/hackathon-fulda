# Hackathon Fulda 2026 — EdTech Trends, Competitive Landscape & Winning Patterns

**Prepared:** 2026-10-23  
**Scope:** EdTech trends 2025–2026, likely competitor projects, Hackathon Fulda history, hackathon-winning patterns, strategy for the unusual 2026 rubric, and five concrete build directions.  
**Evidence tags:** `[V]` verified from an official/primary source; `[P]` press or survey claim; `[I]` inference from evidence; `[S]` speculation.  
**Critical caveat:** the 2026 challenge description is password-protected until Saturday morning. The public theme is broad; the actual sub-themes, sponsors, data, and constraints may change the best idea. Confirm on site before committing.

---

## 0. TL;DR — what matters for the build

- The rubric is product-heavy: **40% independent product review, 40% pitch (3 min + 2 min AI reflection), 20% technology**. Build for a judge who has three minutes and no explanation.
- Fulda winners win on **working software + practical benefit + quantified value + stability**, not on the most original idea. The 2024 winner was explicitly praised for showing time saved per employee; the 2025 winner for exceptional code quality.
- The most crowded lanes are **generic AI tutors, PDF-to-quiz/flashcard tools, study planners, chat-with-notes, and quiz games**. Differentiate by user (teacher trainer, assessor, Ausbilder, verifier) and by evidence (proof of understanding, verified competency, debrief).
- **AI reflection is a rare, scored artifact.** Keep an AI decision log from hour one; prepare two or three concrete failures and corrections. Most teams will improvise this.
- Substantive trends: teacher productivity (RCT evidence), AI literacy (legal obligation plus student demand), assessment integrity (detectors discredited; oral/process-based assessment), skills/micro-credentials (EU policy, early adoption), simulation (short-term efficacy, thin long-term evidence).
- Hype: autonomous AI teachers, VR/metaverse, AI detection as high-stakes evidence, blockchain credentials, "2 sigma" personalization claims, generic agent wrappers.
- German/EU tailwinds are real but slow: **DigitalPakt 2.0 €5B (2026–2030)**, 58% of secondary teachers and 65% of secondary students use AI, only 23% of secondary schools have central AI rules.
- Demo discipline wins: one golden path, seeded data, no login, 90-second value, mobile plus laptop, backup video, reset button, one narrator.

---

## 1. EdTech trends 2025–2026: substance vs hype

### 1.1 Macro context: money, policy, adoption

| Signal | What is verified | Why it matters for this hackathon |
|---|---|---|
| **DigitalPakt 2.0** | €5B total 2026–2030, half federal/half Länder; agreed December 2025, signed September 2026; explicitly includes maintenance/support and digital learning environments; €250M for practice-oriented research. `[V]` | Money exists for infrastructure and teacher training, but procurement is slow. A 24h prototype cannot rely on a school buying it; it can rely on the narrative. |
| **Teacher/student AI use** | Bitkom 2025: 65% of secondary students use AI for school; 23% of secondary schools have central AI rules; 35% leave rules to individual teachers; 27% have none; 80% of students want to learn how to use AI. Bitkom 2026 survey coverage: 58% of secondary teachers use AI for school purposes; 46% have an official school AI license. `[P]` | Adoption is already mainstream; the gap is governance, competence, and quality, not access. |
| **EU AI Act** | General application since 2 August 2026; Article 4 AI literacy binding since 2 February 2025; Article 50 transparency obligations apply from 2 August 2026; high-risk Annex III education obligations deferred to 2 December 2027. `[V]` | AI literacy is a legal obligation, not a nice-to-have. But do not overclaim that every learning tool is "high-risk". |
| **Micro-credentials** | Council Recommendation 2022; Commission progress report December 2025 shows uneven national adoption; JRC 2025 report notes the need for interoperable platforms and stable funding. `[V]` | Policy tailwind for skills-based credentials, but employer acceptance is still maturing. |
| **German EdTech market** | EdTech Startup Monitor 2024: 493 EdTech startups; 91% of founders say digitalization is too slow; only 4% have VC. Tracxn vendor data: 3.3K companies, $844M cumulative VC. `[P/vendor]` | The market is fragmented and underfunded; schools are slow buyers. A hackathon project should not assume a short sales cycle. |
| **Funding examples** | Sdui: €46M total by 2024, further growth investment led by Bain Capital 2025; TukToro/a2zebra €2.5M seed 2025; acemate seed 2025; AI Club €1M+ 2026; skulio EXIST 2025. `[P]` | Money flows to school infrastructure/communication and AI-enabled learning tools, not to generic chatbots. |

### 1.2 Trend-by-trend verdict

| Trend | Evidence | Verdict | Build relevance |
|---|---|---|---|
| **AI agents / agentic workflows** | EDUCAUSE Horizon 2026: AI redefining teaching, instructional design, academic support; agentic AI can act as tutors/assistants, but oversight and trust are unresolved. Most "agents" in edtech are workflow automation, not autonomous pedagogy. `[V/I]` | **Early substance, much hype** | Good if the agent has a bounded job, visible state, and a human approval step. Bad if "agent" is a chat wrapper. |
| **Learning copilots** | Copilots for teachers/students are proliferating; adoption high; evidence on learning outcomes is mixed and design-dependent. `[V/P]` | **Substance, crowded** | Need a wedge: a specific workflow (feedback, oral defense, differentiation) with measurable output. |
| **AI literacy** | EU Article 4 obligation; 80% want to learn how to use AI; only 23% of secondary schools have central rules; many teachers feel under-trained. `[V/P]` | **Strong substance** | Under-served, policy-backed, demo-friendly. Avoid an "AI ethics lecture"; build a practice environment. |
| **Skills-based learning / micro-credentials** | EU recommendation plus progress report; 1EdTech 2026 trend; employer adoption still uneven; verification/interoperability is the bottleneck. `[V/P]` | **Substance, slow** | Strong if you verify evidence, not completion. Weak if it is another course catalog. |
| **Personalized/adaptive learning** | ITS meta-analyses: g≈0.4 vs conventional instruction; comparable to human tutoring in some domains; "2 sigma" is not supported. LLM tutor RCTs are promising but small/short. `[V]` | **Substance with caveats** | Personalization must be tied to a learning mechanism (retrieval, spacing, feedback), not just "AI adapts". |
| **Simulation-based training / serious games** | Systematic reviews: short-term learning and engagement benefits; long-term transfer evidence is thin; gamification novelty fades. `[V]` | **Substance for practice, hype for metaverse** | Excellent for procedural/soft-skill practice with debrief. A quiz with points is not a simulation. |
| **Teacher productivity** | EEF RCT: ChatGPT plus a guide cut lesson planning time by 31% (259 teachers); Aila RCT: 24% reduction (464 primary teachers), but mixed views and declining use. `[V/P]` | **Strong substance** | Real pain, measurable outcome. Crowded by MagicSchool, Oak Aila, fobizz, etc.; differentiate by subject/rubric/provenance. |
| **Assessment integrity** | AI detectors unreliable (Stanford 2025; Inside Higher Ed 2026); institutions moving to oral/viva, process-based assessment, in-person components. `[V]` | **Strong substance** | Urgent, under-served, and demo-friendly (oral defense, process evidence). Avoid AI-detection products. |
| **Immersive learning (VR/AR)** | Evidence exists for training, but hardware/content costs and usability issues; not feasible in 24h without hardware. `[V/I]` | **Niche substance, high production cost** | Do not build VR for this hackathon unless you already have a polished hardware demo. |
| **Learning engineering / measurement** | Growing emphasis on efficacy, pre/post assessment, telemetry (xAPI), and evidence-based design. `[V/P]` | **Substance, invisible to most judges** | A measurable outcome is a differentiator in pitch and product review. Bake in a pre/post or task-completion metric. |
| **Interoperability (xAPI, LTI, OneRoster)** | LTI 1.3 and OneRoster 1.2 are common procurement requirements; 1EdTech/Ed-Fi integration expanding; xAPI for learning data. `[V]` | **Substance, backstage** | Useful as a technical credibility signal, not as the product. Do not spend 24h on full certification. |
| **Privacy / security / AI governance** | EDUCAUSE 2026 flags growing cybersecurity/privacy threats; GDPR plus AI Act; schools need DPAs, data minimization, human oversight. `[V]` | **Substance, sales blocker** | Build privacy in: no personal data, local processing where possible, clear data flow, human approval. Judges may ask. |

### 1.3 What is actually hype

- **"AI replaces teachers/tutors."** No credible evidence at scale; the Horizon report emphasizes human oversight and relationships. `[V/I]`
- **"Fully autonomous agents run the course."** Most products are bounded workflow automation; autonomy adds risk and reduces trust. `[I]`
- **"AI detectors can prove cheating."** Multiple universities have disabled or banned them; false positives and bias are documented. `[V]`
- **"VR/metaverse is the future of learning."** Real but expensive and niche; evidence is mixed and content costs are high. `[V/I]`
- **"Micro-credentials are already hiring currency."** Policy momentum is real; employer adoption and verification are not yet universal. `[V/P]`
- **"2 sigma from AI tutoring."** The original Bloom claim is not supported; ITS effects are moderate, and context/design matter. `[V]`
- **"Blockchain credentials."** Open Badges 3.0/verifiable credentials solve most of the problem without blockchain. `[I]`

### 1.4 Germany/EU specifics worth using in the pitch

- **DigitalPakt 2.0** is a €5B signal that digital learning infrastructure is a policy priority through 2030. Use it as a tailwind, not as a sales claim. `[V]`
- **AI literacy is legally required** for providers/deployers under Article 4; enforcement began August 2026. This is a concrete, defensible "why now". `[V]`
- **AI Act high-risk education rules are deferred to December 2027**, so a 2026 product can position as "compliance-ready" without claiming full certification. `[V]`
- **German VET (duale Ausbildung)** is a large, under-digitized market with strong regional employers; CEDEFOP 2025 notes AI is emerging as a key VET competence. `[V/P]`
- **Teachers are using AI but lack rules and licenses**: 58% of secondary teachers use it, 46% have an official license, 23% of secondary schools have central rules. This is a teacher-productivity/governance gap. `[P]`

---

## 2. What other teams will likely build

### 2.1 Base rates and likely crowded ideas

Given the official examples ("KI-Tutor, interaktive Lernsimulation, Serious Game") and typical hackathon behavior, expect a large share of teams to build:

| Crowded idea | Why teams pick it | Why it struggles |
|---|---|---|
| **Generic AI tutor chatbot for a school subject** | Obvious interpretation of the theme; LLM API makes it easy | Commoditized; judges have seen many; no unique user/workflow; hard to prove learning. |
| **PDF/lecture-notes → quiz/flashcards** | Fast to build; demo looks complete | Crowded (Microsoft winners, EduHacks, every study app); low defensibility; "AI wrapper" perception. |
| **Study planner / Pomodoro / habit tracker** | Easy UI; personal pain | Not really AI; low technical depth; weak link to "Future Education". |
| **Chat with your course materials (RAG)** | Feasible; impressive in 2024, normal in 2026 | Now table stakes; judges ask "why not ChatGPT/NotebookLM?" |
| **AI lesson-plan generator for teachers** | Clear pain; RCT evidence | MagicSchool, Oak Aila, fobizz, countless tools; hard to differentiate without a subject/rubric wedge. |
| **Quiz-as-serious-game** | Theme literally suggests games; easy to scaffold | Gameplay is usually skin-deep; no simulation, no consequential decisions, no debrief. |
| **AI grading/feedback dashboard** | Clear teacher pain | Trust/bias concerns; hard to validate in 24h; crowded. |
| **Language conversation partner** | Demo-friendly; LLM strength | Extremely crowded (Babbel, Duolingo, Speak, etc.); no distribution. |
| **Career guidance chatbot** | Broad appeal; easy prompt | Generic; no local data; low trust. |
| **AI detector** | Timely; seems valuable | Ethically and technically discredited; judges may penalize. |
| **VR campus tour / metaverse classroom** | Looks futuristic | Hardware/content cost; often a gimmick; not testable by judges without devices. |

**Caveat:** this is an inference from the theme, prior hackathons, and public project galleries, not direct observation of the 2026 Fulda teams. `[I]`

### 2.2 What the winners will likely look like

Based on Fulda history and general hackathon patterns, the winning project will probably:

- Serve a **specific user** (e.g., a teacher trainer, an Ausbilder, a student preparing for an oral exam), not "all learners".
- Demonstrate a **consequential interaction** (simulation, roleplay, oral defense), not a static dashboard.
- Produce a **visible artifact** (score, debrief, verified badge, evidence map, before/after).
- Be **testable in under three minutes without login**, with seeded data.
- Have a **credible "why now"**: AI Act/AI literacy, assessment integrity, DigitalPakt, VET shortage, micro-credentials.
- Quantify something: time saved, error rate, completion, confidence, rubric score, pre/post gain.

### 2.3 Differentiation matrix

Use two axes: **who the user is** and **what evidence the product produces**.

| User | Crowded | Differentiated |
|---|---|---|
| Student | AI tutor, flashcards, planner | Oral-defense coach, AI-literacy detective game, transfer-focused practice |
| Teacher | Lesson planner, quiz generator, grading | Classroom simulator, rubric-aligned feedback with provenance, parent communication |
| Trainer/Ausbilder | LMS, video courses | Roleplay simulator with debrief, competency evidence capture |
| Institution/assessor | AI detector, proctoring | Process-based assessment, verifiable credentials, audit trail |
| Developer/EdTech | Another LMS | LTI/xAPI interoperability layer, evaluation harness |

**Rule:** if the idea can be described as "ChatGPT for X", it is not differentiated. If it can be described as "a flight simulator for Y" or "a verification layer for Z", it is.

### 2.4 Under-claimed opportunities

1. **Teacher training / classroom management** — the official theme mentions simulations, but most teams will build student-facing games. Teacher trainers are a real B2B buyer.
2. **Oral assessment / viva practice** — assessment integrity is urgent, and AI detectors are discredited. Few teams will build a viva coach.
3. **Competency verification for VET** — micro-credentials are policy-hot, but most teams will build course platforms, not evidence verification.
4. **AI literacy as a practice environment** — most "AI literacy" projects are content/lectures; a game with a teacher dashboard is rare.
5. **Debrief quality** — a simulation without a debrief is just a game. A rubric-based debrief is a differentiator.
6. **Accessibility / plain language** — under-served, demoable, and socially compelling; but avoid "yet another summarizer".
7. **Assessment of process, not output** — e.g., showing how a student revised, which sources they checked, how they reasoned. Hard to fake, timely.

---

## 3. Prior Hackathon Fulda winners/projects

### 3.1 Winners table

| Year | Theme | Winner | Project | Why it won (as reported) | Source |
|---|---|---|---|---|---|
| 2019 | First Fulda hackathon; mobility, outdoor, indoor navigation | **Team crc** (Noah Grosch, Marlon Resler, Thomas Staab, Tobias Harms) | "Diin Con" — wristband with display for indoor navigation in the Landratsamt | Jury: most technically innovative, extensible, includes all age groups; "idea that can be developed further and considers many components". `[P]` | Osthessen-Zeitung 2019 |
| 2020 | Smart City / Corona contact tracing (online) | **Manifold Conglomerat** | App for digital contact-data documentation for Corona tracing | Strong concept and high innovation; replaced paper chaos. `[P]` | Osthessen-News 2020 |
| 2021 | Smart City – Smart Country – Smart You | **Deep Thought** | Project not specified in accessible coverage | "Overall concept" convinced jury; second place Runtime Terror impressed with technical implementation. Organizer noted three minutes is tight. `[P]` | Osthessen-News 2021 |
| 2022 | Hack 'n Health | **Team Slackoverflow** | Project not specified in accessible coverage; health challenges (endurance, sports facility exchange, smart care room) | "Most balanced product and most balanced presentation"; programming code was decisive. `[P]` | Osthessen-Zeitung 2022 |
| 2023 | Sustainability | **Team Hackgrid** (6 members) | Smart solution for building and energy management | Jury criteria: degree of innovation, practical benefit, user-friendliness. `[P]` | EDAG press release 2023 |
| 2024 | Vernetztes Wissen (connected knowledge) | **Drop Table Team** | Knowledge database that grows with the company, with interactive chat | First place plus best code; judges praised real-world problem-solving and **quantified time saved per employee**; "something very stable in 25 hours". `[P]` | Osthessen-News 2024; official retrospective |
| 2025 | Disaster Tech | **Team Tux** | Platform that detects and analyzes environmental damage after natural disasters | Won first place; organizer said code quality was "exceptional" and it was "probably the best hackathon so far". Second: "Affen aus dem Zoo" (radio crisis communication); third: "Disaster Shrek" (aid distribution). `[P]` | Fuldaer Zeitung 2025 |

**Notes:**
- 2020 was fully online due to Corona; 2021 was in person again.
- 2021/2022 project details are not in the accessible articles; do not invent them.
- The 2026 rubric differs from earlier years: 2024/2025 organizers described a 50/50 code/pitch split; 2026 is 40/40/20. Do not over-index on "code counts 50%".

### 3.2 What Fulda judges have actually praised

Synthesizing the press quotes:

1. **Working, stable software** — "something very stable in 25 hours" (2024); "quality, especially in code, exceptional" (2025).
2. **Practical benefit with a number** — the 2024 winner showed time saved per employee; the Edag jury member explicitly praised this.
3. **Balanced product plus presentation** — the 2022 winner had the "most balanced product and most balanced presentation".
4. **Extensibility / many components** — the 2019 winner was "developable further and considers many components".
5. **Breadth of accessibility** — the 2019 winner included all age groups.
6. **Innovation plus user-friendliness** — 2023 EDAG criteria.
7. **Overall concept** — 2021 winner; not necessarily the most technical.

**Implication:** Fulda rewards *execution and legibility* more than novelty. A simple, stable, quantified product with a clear story beats an ambitious, half-working platform.

### 3.3 What cannot be verified

- Official judging sheets, weights, and scores are not public.
- The exact projects of the 2021 and 2022 winners are not described in accessible press.
- 2026 team count/composition and challenge details are unknown/password-protected.
- Local press may have omitted technical details and losing teams; treat "why it won" as journalistic interpretation, not official rubric.

---

## 4. Hackathon-winning patterns

### 4.1 What judges reward

From practitioner sources (JetBrains 2026 judging-table notes, Devpost, MLH):

- **Lead with the problem, not the solution.** Judges must feel the frustration before they see the product. A real user quote works.
- **Show something working within ~90 seconds.** The demo is the pitch; a strong project with a confusing demo loses to a simpler project judges understand.
- **Put the judge in the user's shoes.** Walk through the actual workflow, not a feature tour.
- **Be direct about what works and what does not.** Honesty reads as confidence; talking around a missing feature reads as evasion.
- **Mock/pre-fill everything.** Pre-fill forms, seed data, mock slow API calls, remove every place the demo can stall.
- **Ship the demo, not the architecture.** Hackathons reward the working demo, not clean code nobody sees. But Fulda's 20% tech and past "best code" prize mean you still need a defensible technical story.
- **Rehearse out loud, timed.** The pitch is part of the product; teams that practiced look like they practiced.
- **One narrator, one clicker.** Switching speakers mid-demo wastes time.

### 4.2 Scope rules

- **One user, one job, one golden path.** If the demo requires two personas and a settings page, cut it.
- **Vertical slice, not platform.** A complete loop (input → AI → visible output → feedback) beats ten half-features.
- **Build backwards from the demo.** Decide the 90-second demo, then build only what it needs.
- **Cut features, not quality.** A polished narrow product signals competence; a broad broken product signals chaos.
- **Freeze early.** Feature freeze by Sunday 09:30; after that, only bug fixes and demo hardening.

### 4.3 Demo reliability

- **No login, no sign-up, no installation.** Public URL plus QR code.
- **Seed data plus reset button.** The judge should see a meaningful state immediately.
- **Deterministic demo mode.** `?demo=1` loads a scripted scenario; the LLM can be slow, but the demo cannot.
- **Fallback for API failure.** Pre-recorded video, cached response, or local rule-based fallback. Rehearse the fail line: "The live API is rate-limited right now; here is the recording from 20 minutes ago showing the same flow."
- **Test on laptop and phone.** Responsive layout; large tap targets; no hover-only interactions.
- **German UI** for a German jury, unless the product is explicitly English-only. At least a German landing page and demo labels.
- **Accessibility**: readable contrast, captions for audio, keyboard navigation. It also signals product maturity.

### 4.4 The 3-minute pitch structure

A proven skeleton (adapted from JetBrains/Devpost/ETHGlobal guides):

| Time | Content | What to show |
|---|---|---|
| 0:00–0:20 | Hook plus problem: one user, one frustration, one number/quote | A single problem slide or a real user quote; no team intro |
| 0:20–0:30 | One-sentence solution: "<Product> lets <user> <do thing> in <time>." | Product name plus one line |
| 0:30–1:50 | Live demo: the golden path, narrated in user language | Working product; pre-filled data; visible result |
| 1:50–2:20 | How it works: three or four bullets, one technical differentiator | Simple architecture diagram; name the AI/guardrail |
| 2:20–2:45 | Evidence plus impact: measurable outcome, who buys/uses it, why now | One metric, one policy tailwind, one user quote |
| 2:45–3:00 | Close: memorable last line plus URL/QR | Product URL, QR code; stop talking |

**Rules:** no feature lists, no team bios, no "we used GPT-4" without a reason, no slide reading. End 5–10 seconds early; running over reads as unfinished.

### 4.5 Q&A patterns

- **Answer formula:** direct answer (10s) → evidence (20s) → scope honesty (10s).
- **Never bluff a live capability.** If it does not work, say so and offer the recording or explain the roadmap.
- **One speaker drives.** Others can handle clicks or deep technical questions.
- **Prepare the top eight questions:**
  1. Who is the user and what do they do today?
  2. Why will not ChatGPT/NotebookLM/MagicSchool do this?
  3. How do you know it works? What is the evidence?
  4. What happens when the AI is wrong? How do you guardrail it?
  5. What data do you store? How is it GDPR-compliant?
  6. How would this make money / who pays?
  7. What did you cut and why?
  8. What would you build next with more time?

### 4.6 AI reflection authenticity (the 2-minute segment)

The official FAQ asks exactly:

- "Wo hat KI uns beschleunigt?"
- "Welche Entscheidungen haben wir selbst getroffen?"
- "Wo lag KI falsch bzw. mussten wir korrigieren?"

This is a **scored, structured reflection**, not a disclaimer. A credible two-minute answer has:

1. **A concrete acceleration example** — "We used AI to generate 40 rubric variants in 10 minutes; we kept 6."
2. **A concrete human decision** — "We rejected the AI's suggestion to auto-grade oral answers; we kept a human approval step because the stakes are high."
3. **A concrete failure/correction** — "The model hallucinated a source in the first demo; we added a citation check and a 'no source, no claim' rule."
4. **A verification method** — "We tested 10 known-answer cases; 8 passed, 2 failed; we fixed the prompt and added a fallback."
5. **A lesson / what you would do differently** — "Next time we would build the evaluation set before the UI."

**What loses points:**

- Generic "AI helped us code faster" with no specifics.
- Claiming "we made all decisions" while the demo is obviously AI-generated.
- Blaming the AI ("the model was bad") without describing the correction.
- Overclaiming ("our AI is 95% accurate") without a test.
- Reading a statement; the jury can tell.

**Artifact:** keep an **AI Decision Log** with timestamp, prompt/tool, output, decision, reason, correction. Show three entries in the reflection slide. This is a differentiator because most teams will improvise.

### 4.7 Judge psychology / common losing patterns

Judges see many projects; they remember:

- **Clarity** — can they explain the product to someone else after 30 seconds?
- **Confidence** — does the team know what works and what does not?
- **Visible progress** — does the demo show a real result?
- **Believable usefulness** — would a real user use this tomorrow?

They mark down:

- Ambiguity: judges cannot tell what the product does.
- Backend-heavy project with no UI.
- Barely changed template.
- Rehashed/overly simple idea.
- Over-indexing on one criterion (e.g., only tech, or only story).
- Big team with unequal contribution / no clear roles.
- Broken demo, no fallback, running over time.
- Feature list instead of a story.

---

## 5. Strategy for the 2026 rubric (40/40/20)

### 5.1 Expected-value model

| Component | Weight | What it rewards | Where teams lose it |
|---|---|---|---|
| Independent product review | 40% | Instant value without explanation; usability; reliability; mobile; reset; clear outcome | Login, empty states, API dependency, confusing UI, no seed data |
| Pitch (3 min plus 2 min AI reflection) | 40% | Story, demo, measurable impact, honest AI reflection, Q&A | Rambling, feature list, generic AI reflection, overclaiming, no demo |
| Technology and implementation | 20% | Sensible use of AI/tech, architecture rationale, guardrails, evaluation, limits | Overengineering, "GPT wrapper", no evaluation, no fallback |

**Key insight:** product review and pitch are not independent. The demo you build for the review jury is the same demo you show in the pitch. Build for the review first; the pitch writes itself.

### 5.2 Product review playbook (40%)

**Design for a judge who:**

- has three minutes,
- has no context,
- may be on a phone or laptop,
- will click the first obvious thing,
- will judge the first 30 seconds.

**Must-haves:**

- Public URL plus QR code on a one-pager.
- No login, no installation, no onboarding wall.
- A "Start demo" button that loads a seeded scenario.
- One core loop, visible in under 90 seconds.
- A visible result: score, debrief, badge, evidence map, before/after.
- A "Reset" button.
- German UI (or bilingual), plain language.
- Fast first paint; no blocking API call before the UI renders.
- Fallback if LLM/API fails: cached result, rule-based mode, or recorded demo.
- Mobile-responsive; test on a phone.
- Privacy note: what data is stored, what is sent to the LLM, how to delete it.

**Nice-to-haves:**

- A 60-second explainer video on the landing page.
- A printed one-pager with the problem, user, metric, and architecture.
- A "judge mode" that shows the evaluation rubric/evidence.
- A visible "AI is thinking" state with a timeout.
- A "why this is not ChatGPT" comparison.

**Do not:**

- Require the judge to upload a file to see value (pre-load a sample, allow upload as optional).
- Require microphone/camera permissions for the first interaction (offer text fallback).
- Show an empty dashboard.
- Use a chatbot as the entire product.
- Hide the result behind a long conversation.

### 5.3 Pitch playbook (40%)

**3-minute pitch:**

- Use the skeleton in 4.4.
- Live demo 60–90 seconds; if the venue network is risky, use a pre-recorded video for the first 20 seconds, then switch to live for the interactive part, or vice versa. Rehearse both.
- One narrator; one clicker; one timekeeper.
- Slides: five to seven maximum, one idea per slide, large visuals, no walls of text.
- End on the URL/QR and a memorable line.

**2-minute AI reflection:**

- Structure: **Accelerate → Decide → Fail → Correct → Verify → Lesson** (six beats, about 20 seconds each).
- Show the AI Decision Log on one slide with three entries.
- Name the tools and the specific use (e.g., "Claude for rubric critique, Cursor for scaffolding, Whisper for transcription").
- Be honest about a failure and the fix. This is the credibility moment.
- End with a principle: "AI generated options; we kept the judgment."

**Q&A:** prepare the eight questions in 4.5; assign a technical and a product spokesperson; practice 15-second answers.

### 5.4 Technology playbook (20%)

- **One defensible technical differentiator**, not five. Examples:
  - A deterministic simulation engine with LLM-generated dialogue (state machine plus guardrails).
  - A rubric-based evaluator with structured JSON output and evidence quotes.
  - A retrieval pipeline with citations and "no source, no claim".
  - Speech-to-text plus rubric scoring for oral defense.
  - Open Badges 3.0 verification with evidence links.
  - xAPI/LTI logging for learning evidence.
- **Show the architecture in four bullets**: input → AI component → guardrail → output → evaluation.
- **Show the evaluation**: a small test set, pass/fail, known failure cases. Even 10 cases is credible.
- **Show the guardrails**: human approval, citation check, confidence threshold, fallback, rate limit, timeout.
- **Explain why AI**: what would be impossible without it (generating plausible distractors, parsing open-ended speech, mapping evidence to competencies), not just "it is faster".
- **Do not overengineer**: no Kubernetes, no microservices, no custom model training unless it is the demo.

### 5.5 Mistakes that lose points (ranked)

1. **Generic AI tutor/chatbot** — judges have seen it; no unique user or outcome.
2. **Login/onboarding wall** — product review jury cannot get to value.
3. **Empty states / no seed data** — the first screen looks broken.
4. **Live API dependency with no fallback** — demo stalls; credibility collapses.
5. **Feature sprawl** — ten half-features; nothing works end-to-end.
6. **No measurable outcome** — "it helps learning" without evidence.
7. **AI reflection as a generic disclaimer** — wastes two of five scored minutes.
8. **Overclaiming** — "95% accuracy", "replaces teachers", "fully autonomous" without evidence.
9. **No mobile test** — product review jury uses a phone.
10. **Pitch over time / reading slides** — reads as unprepared.
11. **Ignoring privacy/DPA** — a judge from a school/university will ask.
12. **Team members who cannot explain the product** — judges probe contribution.

### 5.6 24-hour operating plan (roles and gates)

| Time | Gate | Owner | Output |
|---|---|---|---|
| Sa 09:00–10:00 | Registration, challenge read, team roles | Product lead | Scope one-pager, demo script |
| Sa 10:00–11:00 | Final idea plus user plus metric plus demo path | Whole team | One-sentence pitch, 90s demo storyboard |
| Sa 11:00–14:00 | Build core loop (frontend plus AI plus data) | Tech lead | End-to-end "ugly but working" |
| Sa 14:00–17:30 | Seed data, reset, mobile, fallback | Design/QA | Judge-ready demo v1 |
| Sa 17:30–19:30 | Coaching; validate problem/positioning | Product/Pitch | Revised scope, cut list |
| Sa 19:30–23:00 | Polish demo, AI reflection log, slides | All | Demo v2, reflection draft |
| Sa 23:00–Su 07:00 | Bug fixes, backup video, sleep rotations | Tech/QA | Stable build, video |
| Su 07:30–09:30 | Feature freeze, final QA, one-pager/QR | QA/Ops | Submission-ready |
| Su 09:30–10:30 | Jury walkthrough rehearsal | Pitch lead | 2–3 minute explanation |
| Su 10:30–11:00 | Jury walkthrough; submission | Ops | Submitted plus screenshot |
| Su 11:00–12:00 | Pitch plus AI reflection rehearsal | Pitch lead | Timed run |
| Su 12:15–13:30 | Pitches | Pitch lead | Delivered |

**Roles (eight people):** Product/Story, Frontend, Backend/AI, Design/UX, Demo/QA, Pitch, AI Log/Reflection, Submission/Ops. Double up where needed; one person is "single point of truth" for deadlines.

### 5.7 Self-scorecard (use before submission)

- [ ] Can a stranger get value in under three minutes without login? (0–10)
- [ ] Is there a visible result/artifact? (0–10)
- [ ] Does it work on a phone? (0–5)
- [ ] Is there a reset plus seed data? (0–5)
- [ ] Is there an API fallback? (0–10)
- [ ] Is the AI reflection specific, honest, and evidenced? (0–10)
- [ ] Is there one measurable outcome? (0–10)
- [ ] Is the technical differentiator clear in four bullets? (0–10)
- [ ] Is the pitch under 3:00 and rehearsed three times? (0–10)
- [ ] Can every team member explain the product in one sentence? (0–10)

---

## 6. Five concrete project directions (differentiated, feasible in 24h)

> All five are web-first, no hardware, no login for judges, with a seeded demo and a text fallback. Each has one clear AI differentiator and one measurable outcome. Pick one; do not build more than one.

### Direction 1: **Viva — the oral-defense coach**

**One-liner:** A student uploads an essay/project; an AI examiner asks probing questions; the student answers by voice; the system produces an evidence-based "understanding profile" and a teacher dashboard.

**User/problem:** Universities and schools cannot trust written work in the AI era; AI detectors are unreliable; oral exams do not scale. Students need practice explaining their own reasoning.

**Core loop:** Upload work → AI extracts five claims and generates Bloom-level questions → student records a two-to-three-minute answer → transcript plus rubric score plus evidence quotes → teacher sees gaps and flags for a human viva.

**24h build spec:**
- Next.js frontend; FastAPI/Node backend; PDF text extraction; LLM for question generation and rubric evaluation; browser MediaRecorder plus Whisper/Web Speech for transcription; SQLite/Postgres for sessions.
- Three seeded essays (e.g., biology, history, economics); one rubric with four dimensions; teacher dashboard with five students.
- Fallback: pre-recorded audio/transcript; text answer mode; cached evaluation.
- Cut: accounts, LMS integration, multi-language, proctoring, plagiarism detection.

**90-second demo:** Open preloaded essay → click "Viva starten" → question appears → speak a 20-second answer → transcript plus score plus follow-up question → switch to teacher view → see "three students need a human viva; concept X is weak".

**Why this can win:** It turns the assessment-integrity crisis into a usable, human-in-the-loop product, and the demo is a compelling "AI asks, human decides" story that fits the AI-reflection requirement.

**Evidence tailwind:** Stanford/Inside Higher Ed on unreliable AI detectors; shift to oral/process-based assessment; AI Act transparency/human oversight.

**Risks/cuts:** Speech recognition in a noisy hall; latency; perceived bias. Mitigate with text fallback, pre-recorded audio, evidence quotes, and human approval.

**Differentiation:** "An AI tutor helps you learn; Viva proves you learned."

---

### Direction 2: **Klassenzimmer-Simulator — a flight simulator for teachers**

**One-liner:** A web-based classroom simulation where AI-driven student agents react to a teacher's interventions, followed by a rubric-based debrief.

**User/problem:** Classroom management is the hardest part of teaching and is learned on the job; teacher training is theoretical; beginning teachers burn out. Existing simulations are expensive or role-play based.

**Core loop:** Choose a scenario (e.g., phone use, group-work conflict) → four student agents with hidden states react to interventions (proximity, name drop, choice, de-escalation) → class climate meter changes → five-minute debrief with what worked, escalation patterns, and evidence-based alternatives.

**24h build spec:**
- React frontend with a classroom view (four avatars/chat bubbles); state machine for student states (calm, anxious, escalating, disengaged); LLM for dialogue phrasing only; rubric/debrief generator; three scenarios, six interventions; seeded session; text input plus clickable interventions.
- Cut: 3D/VR, voice, multi-user, full curriculum.

**90-second demo:** Pick "Klasse 8, Handyverbot" → student agent escalates → choose "Ich-Botschaft" → climate improves → debrief shows "you de-escalated; next time try a choice statement earlier" with a transcript excerpt.

**Why this can win:** The theme explicitly asks for simulations/serious games, but most teams will build student-facing games; a teacher-training simulator is a credible B2B product with a dramatic, easy-to-understand demo.

**Evidence tailwind:** Simulation-based training evidence (short-term efficacy); teacher shortage/workload; DigitalPakt 2.0 teacher training; AI agents as bounded role-play.

**Risks/cuts:** LLM inconsistency; cultural sensitivity; "judging teachers" backlash. Mitigate with a non-judgmental frame ("practice space"), scripted state machine, expert-reviewed strategies, and a debrief that offers options rather than a grade.

**Differentiation:** "Not a quiz about classroom management; a safe place to practice the hardest five minutes of teaching."

---

### Direction 3: **SkillPass — verified competency evidence for VET**

**One-liner:** An apprentice records evidence of a real work task; AI maps it to a competency framework and asks follow-up questions; a trainer approves; the learner gets a verifiable Open Badge with evidence links.

**User/problem:** Apprentices and career changers have skills but no portable proof; employers struggle to verify; micro-credentials are often just course certificates. German VET has a detailed competency framework (Ausbildungsrahmenplan) but paper-based documentation.

**Core loop:** Select occupation/competency → upload photo/video/text evidence → AI proposes mapping with confidence plus one probing question → trainer approves/edits → Open Badge 3.0 plus verification page.

**24h build spec:**
- One occupation (e.g., Industriekaufmann/-frau or Kaufmann/-frau für Büromanagement), six competencies, three seeded evidence entries; LLM structured mapping with confidence; trainer approval UI; Open Badges 3.0 JSON; public verification page with QR; PDF export.
- Cut: blockchain, employer marketplace, full ESCO mapping, video hosting.

**90-second demo:** Select "Lernfeld 3: Kundenkommunikation" → upload a photo plus three sentences → AI maps to "customer orientation" and "conflict resolution" with 0.82 confidence, asks "What would you do differently if the customer refused the solution?" → trainer clicks approve → badge appears with QR → scan shows verified evidence.

**Why this can win:** It rides the strongest EU policy tailwind (micro-credentials, skills-based hiring) and produces a tangible, verifiable artifact that judges can inspect, unlike another course platform.

**Evidence tailwind:** EU Council Recommendation on micro-credentials (2022); Commission progress report (December 2025); 1EdTech 2026 digital credentials trend; CEDEFOP Germany VET AI; skills-first hiring.

**Risks/cuts:** Mapping accuracy/legal validity; privacy (workplace video, minors); employer acceptance. Mitigate with one narrow framework, human approval, no video storage (photo/text only), consent, and a clear "evidence, not certification" disclaimer.

**Differentiation:** "Not a certificate for watching videos; a verified proof of what you can do."

---

### Direction 4: **AI Literacy Lab — the hallucination hunt**

**One-liner:** A 20-minute mission-based game where students interrogate an AI that has planted errors, biases, and fake citations; they fact-check, flag, and explain; the teacher sees class misconceptions.

**User/problem:** Students use AI but cannot evaluate it; schools lack rules and trained teachers; AI literacy is legally required (Article 4) and 80% want to learn how to use AI; most AI literacy content is passive.

**Core loop:** Pick a mission (climate, history, health) → chat with an AI that makes five subtle errors → student flags claims and cites evidence from source cards → score plus explanation → teacher dashboard shows which misconceptions the class missed.

**24h build spec:**
- Two missions, five claims each; hand-authored ground truth plus source cards; LLM for plausible chat phrasing and distractors; flagging UI; scoring; teacher dashboard; seeded class of 20; text-only; German/English.
- Cut: authoring tool, LMS integration, multi-language beyond DE/EN, voice.

**90-second demo:** Mission "Die KI behauptet, eine Studie zeigt..." → student clicks "Quelle prüfen" → sees source card contradicts claim → flags "hallucination" → explanation box → score plus badge → teacher dashboard shows "62% missed the fake citation".

**Why this can win:** AI literacy is a policy-backed, under-served need, and a game where students catch AI errors is more memorable and demoable than another chatbot; the teacher dashboard gives it a B2B story.

**Evidence tailwind:** EU AI Act Article 4 (binding since February 2025); Bitkom: 80% want to learn how to use AI, only 23% of secondary schools have central rules; EDUCAUSE 2026: AI reshapes trust in information.

**Risks/cuts:** Content accuracy; "quiz with chat" perception; teacher dashboard scope. Mitigate with hand-authored ground truth, source evidence, and a narrow set of missions.

**Differentiation:** "Teaches students to catch AI, not to trust it."

---

### Direction 5: **Azubi Talk — vocational roleplay with a rubric**

**One-liner:** A voice/text roleplay simulator where an AI customer/patient/colleague reacts to an apprentice's communication, followed by a rubric-based debrief with transcript evidence.

**User/problem:** Soft skills (complaints, handover, safety) are hard to practice and assess in VET; roleplays need actors; trainers cannot scale; employers need evidence of communication competence.

**Core loop:** Choose scenario (retail complaint, care handover, supplier call) → AI counterpart with hidden goal/emotion → trainee responds by voice/text → AI escalates/calms based on empathy and structure → debrief with rubric scores and transcript quotes.

**24h build spec:**
- Two scenarios; text-first with optional browser TTS/STT; hidden state machine for customer emotion; LLM for dialogue; rubric evaluator (empathy, structure, solution, compliance); debrief; seeded transcript; trainer dashboard.
- Cut: voice cloning, VR, multi-user, full curriculum.

**90-second demo:** "Reklamation: Kundin ist wütend wegen defekter Kaffeemaschine" → trainee apologizes and offers a solution → AI calms → debrief: "Empathy 3/5, structure 4/5; you offered a solution at 2:10; next time acknowledge the inconvenience first."

**Why this can win:** VET is a large German market, the demo is visceral, and it measures soft skills rather than quiz knowledge; it fits the simulation-based training trend and the regional employer base (Fulda has a strong Mittelstand/VET base).

**Evidence tailwind:** Serious-games reviews (short-term efficacy, engagement); CEDEFOP Germany VET AI; skills-based learning; DigitalPakt 2.0 teacher/trainer training.

**Risks/cuts:** Voice latency/noise; rubric subjectivity; scenario realism. Mitigate with text fallback, scripted emotional beats, expert rubric, and a "practice, not certification" frame.

**Differentiation:** "Roleplay practice with a patient AI customer and a rubric, not a chatbot that just chats."

---

### 6.6 Which one to pick?

| If your team is strong in... | Pick | Why |
|---|---|---|
| LLM plus speech plus rubric design | Viva | Highest "why now", strong demo, assessment integrity |
| Game/simulation plus frontend | Klassenzimmer-Simulator | Best fit to theme, dramatic demo, B2B teacher training |
| Policy/B2B plus structured data | SkillPass | Strongest EU tailwind, tangible artifact, VET market |
| Content plus UX plus teacher dashboard | AI Literacy Lab | Under-served, fun, policy-backed, easy to explain |
| Voice plus conversation design | Azubi Talk | Visceral demo, VET market, measurable soft skills |

**Do not pick all five. Pick one by Saturday 10:30.** The failure mode is a team that builds a "platform" with five modules and demos none of them well.

---

## 7. Key sources

### Hackathon Fulda / local evidence

1. Hackathon Fulda official site (2026 theme, prizes, schedule): https://hackathon-fulda.de/ `[V]`
2. Hackathon Fulda FAQ (three-minute pitch plus two-minute reflection questions; minimum eight-person team; prototype review): https://hackathon-fulda.de/faq/ `[V]`
3. Hackathon Fulda retrospective 2024 (theme, challenges, press links): https://hackathon-fulda.de/rueckblick/hackathon-2024/ `[V]`
4. Fuldaer Zeitung, 2025 winners (Team Tux; second/third; organizer quotes): https://www.fuldaerzeitung.de/fulda/hackathon-fulda-2025-digitale-loesungen-fuer-krisenmanagement-94005116.html `[P]`
5. Osthessen-News, 2024 winners (Drop Table Team; quantified time savings; best code): https://osthessen-news.de/n11767727/drop-table-team-sahnt-zweifach-beim-6-hackathon-ab.html `[P]`
6. Osthessen-Zeitung, 2022 winner (Slackoverflow; balanced product/presentation; code decisive): https://www.osthessen-zeitung.de/einzelansicht/news/2022/oktober/team-slackoverflow-gewinnt-vierten-fuldaer-hackathon.html `[P]`
7. EDAG press release, 2023 winner (Hackgrid; innovation, practical benefit, user-friendliness): https://www.edag.com/pt/edag-group/newsroom/detail?cHash=762de2fdec4849af2e9d5698d6f8c4eb&tx_news_pi1%5Baction%5D=detail&tx_news_pi1%5Bcontroller%5D=News&tx_news_pi1%5Bnews%5D=34 `[P]`
8. Osthessen-Zeitung, 2019 first hackathon (Team crc / Diin Con; judging rationale): https://www.osthessen-zeitung.de/einzelansicht/news/2019/oktober/erster-fuldaer-hackathon-marathon-spitze-siegerehrung `[P]`
9. Osthessen-News, 2021 winners (Deep Thought; three-minute pitch note): https://osthessen-news.de/n11656954/hackathon-fulda-helle-koepfe-smarte-loesungen-viel-gelernt-fuer-zukunft.html `[P]`
10. Osthessen-News, 2020 winner (Manifold Conglomerat; online edition): https://osthessen-news.de/n11639140/sechs-teams-prasentieren-innovative-loesungen-beim-zweiten-hackathon.html `[P]`

### EdTech trends / policy / evidence

11. EDUCAUSE Horizon Report 2026, Teaching and Learning Edition (AI reshaping assessment, trust, support; authentic assessment): https://library.educause.edu/resources/2026/5/2026-educause-horizon-report-teaching-and-learning-edition `[V]`
12. 1EdTech, "Three Trends We're Watching in 2026" (digital credentials, AI governance, interoperability): https://www.1edtech.org/blog/three-trends-were-watching-in-2026 `[V]`
13. European Commission, AI Act implementation timeline (August 2026 general application; high-risk education December 2027): https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act `[V]`
14. EU AI Act Article 4, AI literacy (binding since February 2025): https://www.artificialintelligenceact.eu/article/4 `[V]`
15. European Commission, progress report on micro-credentials (December 2025): https://employment-social-affairs.ec.europa.eu/progress-report-implementation-council-recommendation-european-approach-micro-credentials-lifelong_en `[V]`
15b. JRC 2025, "Micro-credentials in higher education" (DOI 10.2760/0157920): https://doi.org/10.2760/0157920 `[V]`
16. KMK, DigitalPakt 2.0 (€5B, 2026–2030): https://www.kmk.org/aktuelles-1/artikelansicht/digitalisierung-von-schulen-bund-und-laender-einig-ueber-den-digitalpakt-20.html `[V]`
17. Eurydice, Germany Digital Pact 2.0 (€5B; teacher training/research): https://eurydice.eacea.ec.europa.eu/news/germany-digital-pact-20-expands-digital-education-infrastructure `[V]`
18. Bitkom, Digitale Schule 2025 (65% students use AI; 23% central rules; 80% want to learn AI use): https://www.bitkom.org/sites/main/files/2025-11/Bitkom-Studienbericht-Digitale-Schule-2025.pdf `[P]`
19. Bitkom 2026 teacher survey coverage (58% of secondary teachers use AI; 46% official license): https://www.egovernment.de/ki-nutzung-in-der-schule-a-6d7d32897f5312b4feea4071fbcfe649 `[P]`
20. EEF RCT, ChatGPT lesson planning (−31% time): https://educationendowmentfoundation.org.uk/news/teachers-using-chatgpt-alongside-a-guide-to-support-them-to-use-it-effectively-can-cut-lesson-planning-time-by-over-30-per-cent `[V]`
21. EEF/Aila RCT coverage (−24% planning time; mixed views): https://www.tes.com/magazine/news/general/do-teachers-find-oak-ai-lesson-planning-tool-helpful-aila `[P]`
22. Scientific Reports RCT, AI tutoring vs active learning (N=194; higher gains, more engagement): https://www.nature.com/articles/s41598-025-97652-6 `[V]`
23. arXiv preprint, UK classroom AI tutoring RCT (N=165; exploratory, human-supervised): https://arxiv.org/pdf/2512.23633v1 `[V/preprint]`
24. Ma et al. 2014, ITS meta-analysis (g≈.41; comparable to human tutoring): https://psycnet.apa.org/record/2014-25074-001 `[V]`
25. Systematic review, AI-driven ITS in K-12 (positive but mitigated effects; evidence gaps): https://pmc.ncbi.nlm.nih.gov/articles/PMC12078640/ `[V]`
26. Systematic review, serious games for psychological education/training (short-term efficacy; feedback/modeling matter): https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1511729/pdf `[V]`
27. Systematic review, gamification in workplace training (engagement/retention; novelty fades): https://www.emerald.com/jwl/article/37/9/206/1326647/Exploring-the-impact-of-gamification-on-employee `[V]`
28. Stanford Report, academic integrity and AI (detectors unreliable; oral/in-person assessments): https://news.stanford.edu/stories/2025/10/academic-integrity-working-group-generative-ai-exam-policies `[V]`
29. Inside Higher Ed, "AI Detectors Are Out, New Assessments Are In" (2026): https://www.insidehighered.com/news/tech-innovation/artificial-intelligence/2026/08/05/ai-detectors-are-out-new-approaches-are `[P]`
30. CEDEFOP, Germany: AI emerging as key VET competence (2025): https://www.cedefop.europa.eu/en/news/germany-ai-emerging-key-vet-competence `[V]`
31. EdTech Startup Monitor 2024 (493 startups; 4% VC; 91% say too slow): https://www.startbase.com/reports/edtech-startup-monitor-2024 `[P]`
32. Sdui funding/consolidation (€46M total by 2024; Bain Capital 2025): https://www.htgf.de/htgf-finanzierung-sdui/ and https://www.eu-startups.com/2025/07/german-startup-sdui-group-secures-investment-to-become-the-de-facto-european-edtech-platform `[P]`
33. Tracxn Germany EdTech market data (3.3K companies, $844M cumulative VC; vendor estimate): https://tracxn.com/d/explore/edtech-startups-in-germany/__fpQpYpejRQUpr2Den-JxfE86-yIquw57TAJsDcPbM54 `[vendor data]`
34. 1EdTech OneRoster/LTI overview (interoperability): https://www.1edtech.org/standards/oneroster and https://www.1edtech.org/standards/lti `[V]`

### Hackathon/pitch craft

35. JetBrains, "How to Win a Hackathon: Notes From the Judging Table" (2026): https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/ `[P/practitioner]`
36. Devpost, "Understanding hackathon submission and judging criteria": https://info.devpost.com/blog/understanding-hackathon-submission-and-judging-criteria `[P/practitioner]`
37. MLH standard hackathon rules/judging criteria: https://github.com/MLH/mlh-hackathon-rules/blob/master/Rules.md `[V]`
38. MLH contest terms (originality 25%, technical complexity 25%, theme 25%, implementation 25%): https://github.com/MLH/mlh-policies/blob/main/contest-terms.md `[V]`

---

## 8. Uncertainties

1. **2026 challenge details are password-protected.** The public theme is broad; the actual challenge may specify sub-themes, sponsors, data, or constraints that shift the best idea. Read it Saturday 09:00 and be ready to pivot the framing (not the core tech).
2. **2026 rubric weights are from organizer mails / internal notes, not the public FAQ.** The FAQ says "prototype plus pitch" and mentions a separate review team; the 40/40/20 split may be simplified or interpreted differently by judges. Confirm at registration.
3. **"Bester Code" prize discrepancy.** The official website still lists a €750 "Bester Code" prize; the organizer mail says there is no special code prize in 2026. Confirm which is current. If the code prize exists, a technically elegant solution has upside; if not, do not optimize for code golf.
4. **AI reflection scoring criteria are not public.** The three questions are public; how judges weight specificity, honesty, and technical understanding is inferred. Prepare for the questions, not a guessed rubric.
5. **Prior winners' "why" is journalistic, not official.** Press quotes may reflect a single jury member; the actual score sheets are not public. Use the patterns as strong signals, not laws.
6. **AI tutor evidence is promising but limited.** The Harvard RCT is one course/topic; the UK RCT is exploratory and human-supervised; ITS meta-analyses predate LLMs. Do not claim "AI tutors outperform teachers" broadly.
7. **Micro-credential employer acceptance is uncertain.** EU policy momentum is real; hiring practice lags. If you build SkillPass, frame it as "verification infrastructure", not "guaranteed jobs".
8. **German school procurement is slow.** DigitalPakt 2.0 is real money, but sales cycles are long. For a 24h pitch, focus on a credible pilot buyer (single school, IHK, university teacher-training center, company Ausbildungsabteilung), not "all schools".
9. **AI Act high-risk classification is nuanced.** Education is an Annex III high-risk area for certain uses (admission, assessment, monitoring), but not every learning tool is high-risk. Do not overclaim compliance; say "designed for human oversight and transparency".
10. **Venue network/API access is unknown.** The requirements doc says external APIs are not prohibited but must be tested; the venue may have restricted networks. Build a fallback and test on site.
11. **Team size/role fit.** The FAQ says minimum eight; a large team can dilute contribution. Assign clear ownership and make sure every member can explain the product; judges may probe.
12. **No verified data on 2026 competitors.** The crowded-idea analysis is inference from the theme, prior hackathons, and public project galleries; actual teams may surprise.
13. **Schedule discrepancy.** The website currently lists the jury walkthrough 10:30–11:00, hacking deadline 11:00, pitches 12:15–13:30, and winners 15:15; the organizer mail summary says awards 14:45. Treat the earlier time as the planning deadline and confirm on site.

---

## Appendix A: 3-minute pitch script template (fill in)

**0:00–0:20 (Hook):** "Every week, [user] spends [time] on [painful task]. Today they [current workaround], and it still fails when [specific situation]. We watched [n] of them do it; [quote/observation]."

**0:20–0:30 (Solution):** "[Product] lets [user] [core action] in [time], with [key differentiator]."

**0:30–1:50 (Demo):** "Let me show you. I am [user]. I [action 1]; the system [AI action]; here is the result: [visible artifact]. Now I click here to [action 2]; notice [evidence/guardrail]."

**1:50–2:20 (How):** "Under the hood: [input] → [AI component] → [guardrail] → [output]. The key is [one technical differentiator], because [reason]. We tested [n] cases; [pass/fail]."

**2:20–2:45 (Impact):** "For [buyer], this means [metric] — we measured [small evidence]. The timing is [policy/trend]."

**2:45–3:00 (Close):** "[Memorable line]. Try it at [URL] / scan the QR. Danke."

## Appendix B: 2-minute AI reflection template

**0:00–0:20 — Accelerate:** "AI accelerated [specific task] from [x] to [y]. We used [tool] for [task]."
**0:20–0:40 — Decide:** "The key decision was ours: we chose [design/guardrail] because [reason]. AI suggested [alternative]; we rejected it because [reason]."
**0:40–1:00 — Fail:** "AI was wrong about [specific thing]. In our first test, it [failure]; we noticed because [evidence]."
**1:00–1:20 — Correct:** "We corrected it by [specific change], and added [guardrail/fallback]."
**1:20–1:40 — Verify:** "We tested [n] cases; [result]. The remaining limitation is [honest limitation]."
**1:40–2:00 — Lesson:** "What we would do differently: [lesson]. AI generated options; we kept the judgment."

## Appendix C: One-page judge handout (template)

- **Problem:** one sentence plus one user quote.
- **Product:** one sentence plus screenshot.
- **Demo:** URL plus QR code; "Start demo" instruction; 90-second path.
- **Impact:** one metric plus one policy tailwind.
- **Tech:** four bullets (input → AI → guardrail → output) plus one evaluation result.
- **AI reflection:** three bullet points (accelerate / fail plus fix / human decision).
- **Privacy:** what data, where stored, how deleted.
- **Team:** names/roles (optional; keep short).
