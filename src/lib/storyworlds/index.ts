import type { StoryWorld } from "@/types/storyworld";

export const storyWorldPresets: StoryWorld[] = [
  {
    id: "fantasy-kingdom",
    name: "The Realm of Eldoria",
    description:
      "A vast medieval fantasy kingdom where magic flows through ancient ley lines and brave heroes undertake quests to protect the realm from encroaching darkness. The tone is epic and adventurous with moments of wonder and camaraderie. The setting features castles, enchanted forests, mountain fortresses, and hidden villages.",
  },
  {
    id: "space-station",
    name: "Station Prometheus",
    description:
      "A cutting-edge space station orbiting a distant planet, serving as humanity's forward base for exploration. The crew faces daily challenges to keep the mission alive. The tone is optimistic sci-fi with tension and discovery, set aboard a massive orbital station with research labs, command centers, hydroponic bays, and observation decks.",
  },
  {
    id: "detective-noir",
    name: "Shadows of Crescent City",
    description:
      "A rain-soaked city of secrets where a sharp-witted detective unravels conspiracies one clue at a time. Every task is a lead, every completion brings the truth closer. The tone is atmospheric noir with dry wit and mounting tension, set in a 1940s-inspired city of neon-lit alleys, smoky offices, and hidden speakeasies.",
  },
];

export function getPresetById(id: string): StoryWorld | undefined {
  return storyWorldPresets.find((w) => w.id === id);
}
