/**
 * Authoritative Sport Configuration Registry
 * 
 * Defines supported sports, participant schemas, terminology, validation,
 * and discovery filter configurations.
 */

export type SportId = 'football' | 'tennis' | 'basketball';

export interface SportParticipantConfig {
  type: 'teams' | 'players_or_pairs';
  slot1Label: string;
  slot1Placeholder: string;
  slot2Label: string;
  slot2Placeholder: string;
  competitionLabel: string; // e.g. "Competition" for Football, "Tournament" for Tennis
  competitionPlaceholder: string;
  timeLabel: string; // e.g. "Kick-off time" vs "Start time"
  requiresClub: boolean;
}

export interface SportConfig {
  id: SportId;
  name: string;
  slug: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  categorySlug: string; // Associated default match category slug
  participants: SportParticipantConfig;
  filters: {
    participantFilterLabel?: string;
    competitionFilterLabel: string;
    clubFilterLabel?: string;
  };
}

export const SPORTS_REGISTRY: Record<SportId, SportConfig> = {
  football: {
    id: 'football',
    name: 'Football',
    slug: 'football',
    description: 'Club and competition matches with home and away teams',
    available: true,
    categorySlug: 'football',
    participants: {
      type: 'teams',
      slot1Label: 'Home team',
      slot1Placeholder: 'e.g. Manchester Red',
      slot2Label: 'Away team',
      slot2Placeholder: 'e.g. London Blue',
      competitionLabel: 'Competition',
      competitionPlaceholder: 'Select competition',
      timeLabel: 'Kick-off time',
      requiresClub: false,
    },
    filters: {
      competitionFilterLabel: 'Competition',
      clubFilterLabel: 'Club',
    },
  },
  tennis: {
    id: 'tennis',
    name: 'Tennis',
    slug: 'tennis',
    description: 'Singles or doubles tournament matches with players or pairs',
    available: true,
    categorySlug: 'tennis',
    participants: {
      type: 'players_or_pairs',
      slot1Label: 'Player or pair 1',
      slot1Placeholder: 'e.g. C. Alcaraz or Salisbury / Ram',
      slot2Label: 'Player or pair 2',
      slot2Placeholder: 'e.g. J. Sinner or Koolhof / Mektic',
      competitionLabel: 'Tournament',
      competitionPlaceholder: 'Select tournament',
      timeLabel: 'Start time',
      requiresClub: false,
    },
    filters: {
      participantFilterLabel: 'Player / Pair',
      competitionFilterLabel: 'Tournament',
    },
  },
  basketball: {
    id: 'basketball',
    name: 'Basketball',
    slug: 'basketball',
    description: 'Team basketball fixtures and league tournaments',
    available: false,
    unavailableReason: 'Basketball schema and rules are defined, awaiting production enablement',
    categorySlug: 'basketball',
    participants: {
      type: 'teams',
      slot1Label: 'Home team',
      slot1Placeholder: 'e.g. Boston Green',
      slot2Label: 'Away team',
      slot2Placeholder: 'e.g. Los Angeles Gold',
      competitionLabel: 'Competition',
      competitionPlaceholder: 'Select competition',
      timeLabel: 'Tip-off time',
      requiresClub: false,
    },
    filters: {
      participantFilterLabel: 'Team',
      competitionFilterLabel: 'Competition',
    },
  },
};

export const CONFIGURED_SPORTS = Object.values(SPORTS_REGISTRY);

export function getSportConfig(sportId?: string | null): SportConfig | null {
  if (!sportId) return null;
  const key = sportId.toLowerCase() as SportId;
  return SPORTS_REGISTRY[key] || null;
}

export function formatEventTitle(
  sportId: SportId,
  slot1?: string | null,
  slot2?: string | null,
  fallbackTitle?: string
): string {
  const p1 = (slot1 || '').trim();
  const p2 = (slot2 || '').trim();
  if (p1 && p2) {
    return `${p1} vs ${p2}`;
  }
  if (p1) return p1;
  if (p2) return p2;
  return fallbackTitle || 'Untitled Event';
}
