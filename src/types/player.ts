export interface PlayerProfile {
  name: string;
  description: string;
}

export interface CharacterSheet {
  characterName: string;
  role: string;
  backstory: string;
  traits: string[];
  level: number;
  xp: number;
}
