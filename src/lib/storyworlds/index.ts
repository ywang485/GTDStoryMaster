import type { StoryWorld } from "@/types/storyworld";

export const storyWorldPresets: StoryWorld[] = [
  {
    id: "fantasy-kingdom",
    name: "The Realm of Eldoria",
    preset: "fantasy-kingdom",
    description:
      "A vast medieval fantasy kingdom where magic flows through ancient ley lines and brave heroes undertake quests to protect the realm from encroaching darkness.",
    tone: "Epic and adventurous with moments of wonder and camaraderie",
    setting:
      "A sprawling kingdom of castles, enchanted forests, mountain fortresses, and hidden villages. Magic is real but requires discipline and sacrifice.",
    themes: [
      "courage",
      "growth",
      "duty",
      "friendship",
      "overcoming challenges",
    ],
    themeId: "fantasy",
  },
  {
    id: "space-station",
    name: "Station Prometheus",
    preset: "space-station",
    description:
      "A cutting-edge space station orbiting a distant planet, serving as humanity's forward base for exploration. The crew faces daily challenges to keep the mission alive.",
    tone: "Optimistic sci-fi with tension and discovery",
    setting:
      "A massive orbital station with research labs, command centers, hydroponic bays, and observation decks overlooking an alien world. Technology is advanced but not infallible.",
    themes: [
      "exploration",
      "innovation",
      "teamwork",
      "problem-solving",
      "frontier spirit",
    ],
    themeId: "scifi",
  },
  {
    id: "detective-noir",
    name: "Shadows of Crescent City",
    preset: "detective-noir",
    description:
      "A rain-soaked city of secrets where a sharp-witted detective unravels conspiracies one clue at a time. Every task is a lead, every completion brings the truth closer.",
    tone: "Atmospheric noir with dry wit and mounting tension",
    setting:
      "A 1940s-inspired city of neon-lit alleys, smoky offices, grand libraries, and hidden speakeasies. Information is currency and everyone has an angle.",
    themes: [
      "truth",
      "persistence",
      "justice",
      "cleverness",
      "uncovering hidden patterns",
    ],
    themeId: "noir",
  },
];

export function getPresetById(id: string): StoryWorld | undefined {
  return storyWorldPresets.find((w) => w.id === id);
}

export function createCustomWorld(
  name: string,
  description: string,
  tone: string,
  ipReference?: string,
): StoryWorld {
  return {
    id: `custom-${Date.now()}`,
    name,
    preset: "custom",
    description,
    tone,
    setting: description,
    themes: [],
    themeId: "custom",
    ipReference,
  };
}
