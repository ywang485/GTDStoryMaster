export interface PlayerProfile {
  name: string;
  gender: string;
  age: number;
  personality: string;
  hobbies: string[];
  coreValues: string[];
  beliefSystems: string[];
}

export interface CharacterSheet {
  characterName: string;
  role: string;
  backstory: string;
  traits: string[];
  level: number;
  xp: number;
}
