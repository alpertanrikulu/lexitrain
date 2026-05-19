import type { CEFRLevel, PackGroup, PackManifestEntry, VocabularyWord } from "@/types";

const LEVEL_META: Record<CEFRLevel, { label: string; description: string }> = {
  a1: { label: "A1 · Beginner", description: "Everyday words for survival English." },
  a2: { label: "A2 · Elementary", description: "Common situations & familiar topics." },
  b1: { label: "B1 · Intermediate", description: "Opinions, experiences, plans." },
  b2: { label: "B2 · Upper Intermediate", description: "Abstract ideas, academic ground." },
  c1: { label: "C1 · Advanced", description: "Nuance, register, idiom." },
  c2: { label: "C2 · Proficient", description: "Sophisticated & literary vocabulary." },
  pv: { label: "Phrasal Verbs", description: "Common verb phrases for daily conversation." },
};

interface PackDescriptor {
  id: string;
  level: CEFRLevel;
  title: string;
  subtitle: string;
  size: number;
}

const PACK_DESCRIPTORS: PackDescriptor[] = [
  // A1
  { id: "a1-pack-1", level: "a1", title: "People & Family", subtitle: "names, roles & relations", size: 30 },
  { id: "a1-pack-2", level: "a1", title: "Food & Drink", subtitle: "everyday meals", size: 30 },
  { id: "a1-pack-3", level: "a1", title: "Home & Things", subtitle: "rooms, furniture, items", size: 30 },
  { id: "a1-pack-4", level: "a1", title: "Numbers, Time & Color", subtitle: "the foundations", size: 30 },
  { id: "a1-pack-5", level: "a1", title: "Daily Actions", subtitle: "verbs you'll say every day", size: 30 },
  // A2
  { id: "a2-pack-1", level: "a2", title: "Travel & Places", subtitle: "transport, cities, signs", size: 30 },
  { id: "a2-pack-2", level: "a2", title: "Work & School", subtitle: "jobs, study, routine", size: 30 },
  { id: "a2-pack-3", level: "a2", title: "Weather & Nature", subtitle: "outdoor life", size: 30 },
  { id: "a2-pack-4", level: "a2", title: "Body & Health", subtitle: "feelings, doctors, parts", size: 30 },
  { id: "a2-pack-5", level: "a2", title: "Shopping & Money", subtitle: "stores, prices, payment", size: 30 },
  // B1
  { id: "b1-pack-1", level: "b1", title: "Emotions & Personality", subtitle: "how we feel & who we are", size: 30 },
  { id: "b1-pack-2", level: "b1", title: "Technology & Internet", subtitle: "screens, apps, networks", size: 30 },
  { id: "b1-pack-3", level: "b1", title: "Society & Media", subtitle: "news, opinion, culture", size: 30 },
  { id: "b1-pack-4", level: "b1", title: "Sports & Leisure", subtitle: "play, perform, compete", size: 30 },
  { id: "b1-pack-5", level: "b1", title: "Environment & Planet", subtitle: "climate, ecology, action", size: 30 },
  // B2
  { id: "b2-pack-1", level: "b2", title: "Business & Economy", subtitle: "markets, money, firms", size: 30 },
  { id: "b2-pack-2", level: "b2", title: "Politics & Government", subtitle: "power & policy", size: 30 },
  { id: "b2-pack-3", level: "b2", title: "Science & Research", subtitle: "method, data, discovery", size: 30 },
  { id: "b2-pack-4", level: "b2", title: "Art & Culture", subtitle: "aesthetic, narrative, taste", size: 30 },
  { id: "b2-pack-5", level: "b2", title: "Education & Knowledge", subtitle: "schools, theory, ideas", size: 30 },
  // C1
  { id: "c1-pack-1", level: "c1", title: "Academic Writing", subtitle: "argument, evidence, claim", size: 30 },
  { id: "c1-pack-2", level: "c1", title: "Critical Thinking", subtitle: "reason, logic, bias", size: 30 },
  { id: "c1-pack-3", level: "c1", title: "Philosophy & Ethics", subtitle: "values, morality, truth", size: 30 },
  { id: "c1-pack-4", level: "c1", title: "Literature & Style", subtitle: "voice, register, craft", size: 30 },
  { id: "c1-pack-5", level: "c1", title: "Psychology & Behavior", subtitle: "minds & motives", size: 30 },
  // C2
  { id: "c2-pack-1", level: "c2", title: "Rhetoric & Argument", subtitle: "the art of persuasion", size: 30 },
  { id: "c2-pack-2", level: "c2", title: "Idioms & Expressions", subtitle: "native-like phrasing", size: 30 },
  { id: "c2-pack-3", level: "c2", title: "Formal Discourse", subtitle: "the register of officialdom", size: 30 },
  { id: "c2-pack-4", level: "c2", title: "Nuanced Verbs", subtitle: "fine-grained action", size: 30 },
  { id: "c2-pack-5", level: "c2", title: "Erudite Vocabulary", subtitle: "sophisticated & rare", size: 30 },
  // Phrasal Verbs
  { id: "phrasal-verbs-pack-1", level: "pv", title: "Phrasal Verbs · Part 1", subtitle: "give up, pick up & 98 more", size: 100 },
  { id: "phrasal-verbs-pack-2", level: "pv", title: "Phrasal Verbs · Part 2", subtitle: "hang out, save up & 98 more", size: 100 },
];

// Vite resolves these glob imports at build time and code-splits each JSON.
// `import: "default"` strips wrappers so each loader resolves directly to the
// `VocabularyWord[]` payload, keeping the data offline-friendly.
const packModules = import.meta.glob("./*/*.json", {
  import: "default",
}) as unknown as Record<string, () => Promise<VocabularyWord[]>>;

function loaderFor(level: CEFRLevel, id: string): () => Promise<VocabularyWord[]> {
  const key = `./${level}/${id}.json`;
  const loader = packModules[key];
  if (!loader) {
    return async () => {
      throw new Error(`Pack not found: ${key}`);
    };
  }
  return loader as () => Promise<VocabularyWord[]>;
}

export const PACKS: PackManifestEntry[] = PACK_DESCRIPTORS.map((d) => ({
  id: d.id,
  level: d.level,
  title: d.title,
  subtitle: d.subtitle,
  size: d.size,
  load: loaderFor(d.level, d.id),
}));

export const PACK_GROUPS: PackGroup[] = (
  Object.keys(LEVEL_META) as CEFRLevel[]
).map((level) => ({
  level,
  label: LEVEL_META[level].label,
  description: LEVEL_META[level].description,
  packs: PACKS.filter((p) => p.level === level),
}));

export function findPack(id: string): PackManifestEntry | undefined {
  return PACKS.find((p) => p.id === id);
}
