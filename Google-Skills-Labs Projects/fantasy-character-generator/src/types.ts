export interface CharacterStats {
  might: number;
  agility: number;
  intellect: number;
  resilience: number;
}

export interface CardStats {
  health: number;
  mana: number;
  strength: number;
}

export interface Character {
  name: string;
  class: string;
  title?: string;
  race?: string;
  lore?: string;
  primaryWeapon?: string;
  signatureAbility?: string;
  alignment?: string;
  stats?: CharacterStats;
}

export interface DeckCard {
  id: string;
  name: string;
  characterClass: string;
  title?: string;
  race?: string;
  stats: CardStats;
  portraitUrl: string | null;
  backstory: string | null;
  savedAt: number;
}
