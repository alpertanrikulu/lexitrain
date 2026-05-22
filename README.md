# Lexitrain — Adaptive English Vocabulary Trainer

A premium client-side SPA for memorizing English vocabulary with adaptive
repetition. Built with **React + TypeScript + Vite + TailwindCSS + shadcn-style
primitives + Framer Motion + Zustand**. No backend, no auth, no database — every
piece of data is local and the app is offline-friendly. Deploys cleanly on the
Vercel free tier as a static site.

> Designed for desktop-first focus sessions, with a calm, minimal interface that
> feels like Linear / Raycast / a Vercel dashboard, not a busy quiz toy.

---

## Features

- **30 study packs across CEFR A1 → C2** — 6 levels × 5 packs each
- **Adaptive repetition algorithm** — wrong/skipped words spike in priority,
  mastered words fade. Once every word is correct at least once, the engine
  switches to **uniform 1/N drilling mode** so you can keep going.
- **Five-word adaptive batches** — tap a word, pick the meaning from 4
  distractors + the correct option (or skip). Results reveal after the batch.
- **30-minute focused timer** — accurate even when the tab is throttled. Once
  you hit 100%, the timer stops mattering and you can keep drilling.
- **Persistent sessions** — refresh the page and your timer, progress, mastery,
  stats and current batch are all restored from `localStorage`.
- **Glassmorphism UI, dark + light, soft gradients, Framer Motion micro-interactions**.
- **Accessible** — keyboard navigable, focus-visible rings, ARIA labels,
  prefers-reduced-motion-friendly defaults via subtle transitions only.
- **Lazy-loaded data** — each pack is its own JSON file, code-split by Vite via
  `import.meta.glob`, fetched only when you select it.
- **Zero backend** — vocabulary lives in `/src/vocabulary/<level>/<pack>.json`
  and KPSS question sets in `/src/questions/history/<topic>.json`.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in /dist
npm run preview  # preview the build
npm run typecheck
```

Deploy to Vercel: push the repo, import in Vercel, accept defaults. `vercel.json`
configures the rewrite + static cache headers.

---

## Project structure

```
src/
├── components/            # shadcn-style primitives & ErrorBoundary
│   └── ui/
├── vocabulary/            # vocabulary JSON, grouped by CEFR level
│   ├── a1/ … c2/
│   └── manifest.ts        # pack registry + lazy loaders (vocabulary + KPSS)
├── questions/             # KPSS multiple-choice question sets
│   └── history/           # one JSON per topic, auto-discovered
├── features/              # composed app features
│   ├── header/            # session timer, stats, theme toggle
│   ├── sidebar/           # category-grouped pack list with search & progress
│   ├── study/             # WordCard, batch workspace, tabbed shell
│   ├── results/           # post-batch review panel
│   └── session/           # empty state + summary dialog
├── hooks/                 # usePackSelection, useSessionTimer
├── lib/                   # cn (tailwind-merge)
├── pages/                 # AppPage (single page)
├── store/                 # Zustand: session, theme
├── styles/                # globals.css (Tailwind layers + CSS vars)
├── types/                 # canonical types
└── utils/                 # rng, adaptive engine, storage, format
```

---

## Adaptive repetition algorithm

The engine lives in `src/utils/adaptive.ts` and is consumed by the Zustand
store (`src/store/session.ts`).

Each word carries:

```ts
interface WordStats {
  correctCount: number;
  wrongCount: number;
  skipCount: number;
  masteryScore: number;   // 0 (unseen) → 1 (mastered)
  lastSeen: number;       // ms since epoch
  nextPriority: number;   // sampling weight
  hasBeenCorrect: boolean;
}
```

### Sampling

- Fresh/unseen words start at `nextPriority = 8`.
- **Wrong** answers multiply priority by `1.9` and add `4`, capped at `20` —
  ≈80% probability the word resurfaces in the next batch.
- **Skipped** answers multiply priority by `1.5` and add `2.5` — high but
  softer than wrong.
- **Correct** answers shrink priority (×0.45 once mastered, ×0.6 first time)
  and add `(1 − masteryScore) × 0.45` to mastery — fast on early reps,
  asymptotically slower as mastery → 1. Minimum priority floors at `0.2` so the
  engine never *fully* forgets a word.
- Batch selection uses **Efraimidis–Spirakis weighted sampling without
  replacement** (`key = rand()^(1/weight)`, take top N), then a final shuffle
  so the heaviest word isn't always first.
- Words from the immediately previous batch are penalized (×0.2) to avoid
  predictable immediate repeats.

### Drill mode

Once every word has been answered correctly at least once, the engine flips to
**uniform sampling** (every word equal chance, no immediate repeats) so the
session becomes infinite drilling. The "Finish session" button becomes active.

### Distractors

For each presented word, `buildOptions()` samples 4 distractors from the pack,
de-duplicating against the correct meaning by normalized string equality, then
shuffles them with the correct answer. This avoids accidentally showing two
identical options when synonyms occur.

---

## Session lifecycle

```
idle → study → (review batch) → study → … →
  fullyLearned ? drill-mode (timer disabled)
              : timer expires → complete → SummaryDialog
```

State is persisted to `localStorage` via the Zustand `persist` middleware.
`useSessionTimer` uses a wall-clock delta (rather than naive countdown) so a
backgrounded/throttled tab catches up to real elapsed time on resume.

---

## Data files

Each pack is a JSON file matching:

```json
{
  "id": "a1_001",
  "word": "apple",
  "meaning": "elma",
  "example": "I eat an apple every day.",
  "exampleTranslation": "Her gün bir elma yerim.",
  "difficulty": 1
}
```

This repository ships **30 hand-curated CEFR-graded packs** (≈30 words each,
totalling ~900 entries) as a real starting corpus. The architecture loads
each pack lazily and is pack-size-agnostic — to scale up to the full 200
words/pack target, simply extend the JSON files or drop in a generator.

The pack manifest (`src/vocabulary/manifest.ts`) declares titles, subtitles, and
CEFR level for each vocabulary pack. New vocabulary packs are picked up by the
glob loader (`import.meta.glob("./*/*.json")`).

KPSS topics are fully auto-discovered: drop a new `*.json` into
`src/questions/history/` and it appears as a selectable topic under the **KPSS**
section — no manifest edit required. Each KPSS entry has the shape
`{ id, question, choices[], correctAnswer, explanation, difficulty }`.

---

## Performance notes

- **Code-split JSON**: each pack JSON ships as its own chunk; the app loads
  only the pack you select.
- **Manual chunks** in `vite.config.ts` split React, Framer Motion and Radix
  into long-cache vendor chunks.
- `React.memo` on every leaf component that can flip independently (StatCard,
  WordCard, Sidebar, Header). `useMemo` on derived collections; selectors are
  fine-grained so the store doesn't trigger unrelated rerenders.
- The timer uses a single `setInterval`, gated on session state, that ticks
  the store with a wall-clock delta.
- Storage operations go through a `safeStorage` wrapper that falls back to an
  in-memory map (private mode / quota errors).
- No router; the entire SPA is a single page so the bundle stays small.

---

## Accessibility

- All interactive elements use Radix primitives or native buttons with focus
  rings (`focus-visible:ring-2`).
- The sidebar collapses to a Dialog on small viewports.
- Motion stays subtle and short; no parallax or auto-play.
- Color combinations target WCAG AA in both themes.

---

## License

MIT — do whatever you like.
