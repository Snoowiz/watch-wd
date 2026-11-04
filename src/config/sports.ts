/**
 * Authoritative Sport Configuration Registry
 * 
 * Defines supported sports, participant schemas, terminology, validation,
 * and discovery filter configurations.
 */

export type SportId = 'football' | 'tennis' | 'basketball' | 'boxing' | string;

export interface SportParticipantConfig {
  type: 'teams' | 'players_or_pairs' | 'combatants';
  slot1Label: string;
  slot1Placeholder: string;
  slot2Label: string;
  slot2Placeholder: string;
  competitionLabel: string; // e.g. "Competition" for Football, "Tournament" for Tennis, "Card / Event" for Boxing
  competitionPlaceholder: string;
  timeLabel: string; // e.g. "Kick-off time", "Start time", "Tip-off time", "Fight time"
  requiresClub: boolean;
}

export interface SportConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  categorySlug: string;
  participants: SportParticipantConfig;
  filters: {
    participantFilterLabel?: string;
    competitionFilterLabel: string;
    clubFilterLabel?: string;
  };
}

export const SPORTS_REGISTRY: Record<string, SportConfig> = {
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
      requiresClub: true,
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
    description: 'Team basketball fixtures, league games, and tournament championships',
    available: true,
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
  boxing: {
    id: 'boxing',
    name: 'Boxing & MMA',
    slug: 'boxing',
    description: 'Combat sports, championship title bouts, and fight cards',
    available: true,
    categorySlug: 'boxing',
    participants: {
      type: 'combatants',
      slot1Label: 'Fighter 1',
      slot1Placeholder: 'e.g. Tyson Fury',
      slot2Label: 'Fighter 2',
      slot2Placeholder: 'e.g. Oleksandr Usyk',
      competitionLabel: 'Card / Event',
      competitionPlaceholder: 'Select event or title card',
      timeLabel: 'Ring-walk time',
      requiresClub: false,
    },
    filters: {
      participantFilterLabel: 'Fighter',
      competitionFilterLabel: 'Card / Event',
    },
  },
};

export const CONFIGURED_SPORTS = Object.values(SPORTS_REGISTRY);

export function getSportConfig(sportId?: string | null, dynamicSports?: any[]): SportConfig | null {
  if (!sportId) return null;
  const key = sportId.toLowerCase();
  
  if (SPORTS_REGISTRY[key]) {
    return SPORTS_REGISTRY[key];
  }

  // Check dynamic sports if provided
  if (dynamicSports && Array.isArray(dynamicSports)) {
    const dyn = dynamicSports.find(s => (s.id && s.id.toLowerCase() === key) || (s.slug && s.slug.toLowerCase() === key));
    if (dyn) {
      return {
        id: dyn.id || dyn.slug,
        name: dyn.name,
        slug: dyn.slug || dyn.id,
        description: dyn.description || '',
        available: dyn.is_active === 1 || dyn.is_active === true,
        categorySlug: dyn.slug || dyn.id,
        participants: {
          type: dyn.participant_type || 'teams',
          slot1Label: dyn.slot1_label || 'Home team',
          slot1Placeholder: dyn.slot1_placeholder || '',
          slot2Label: dyn.slot2_label || 'Away team',
          slot2Placeholder: dyn.slot2_placeholder || '',
          competitionLabel: dyn.competition_label || 'Competition',
          competitionPlaceholder: `Select ${dyn.competition_label || 'competition'}`,
          timeLabel: dyn.time_label || 'Start time',
          requiresClub: Boolean(dyn.requires_club),
        },
        filters: {
          participantFilterLabel: dyn.participant_type === 'players_or_pairs' ? 'Player / Pair' : (dyn.participant_type === 'combatants' ? 'Fighter' : 'Team'),
          competitionFilterLabel: dyn.competition_label || 'Competition',
          clubFilterLabel: dyn.requires_club ? 'Club' : undefined,
        },
      };
    }
  }

  return null;
}

export function formatEventTitle(
  sportId: string,
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
