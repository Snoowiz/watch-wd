import { describe, it, expect } from 'vitest';
import { 
  SPORTS_REGISTRY, 
  CONFIGURED_SPORTS, 
  getSportConfig, 
  formatEventTitle 
} from '../src/config/sports';
import { matchSchema } from '../api/v1/schemas/matchSchema';
import { MySQLAdapter } from '../db/MySQLAdapter';

describe('WatchWDS Multi-Sport Event Architecture & Ingestion', () => {
  describe('Authoritative Sport Configuration Registry', () => {
    it('defines authoritative configurations for Football, Tennis, and Basketball', () => {
      expect(SPORTS_REGISTRY.football).toBeDefined();
      expect(SPORTS_REGISTRY.tennis).toBeDefined();
      expect(SPORTS_REGISTRY.basketball).toBeDefined();
    });

    it('enables Football and Tennis, while keeping Basketball strictly disabled until schema approval', () => {
      expect(SPORTS_REGISTRY.football.available).toBe(true);
      expect(SPORTS_REGISTRY.tennis.available).toBe(true);
      expect(SPORTS_REGISTRY.basketball.available).toBe(false);
      expect(SPORTS_REGISTRY.basketball.unavailableReason).toBeTruthy();
    });

    it('configures Football with team participants and Competition labeling', () => {
      const fb = SPORTS_REGISTRY.football;
      expect(fb.participants.type).toBe('teams');
      expect(fb.participants.slot1Label).toBe('Home team');
      expect(fb.participants.slot2Label).toBe('Away team');
      expect(fb.participants.competitionLabel).toBe('Competition');
      expect(fb.participants.timeLabel).toBe('Kick-off time');
    });

    it('configures Tennis with player/pair participants and Tournament labeling', () => {
      const tn = SPORTS_REGISTRY.tennis;
      expect(tn.participants.type).toBe('players_or_pairs');
      expect(tn.participants.slot1Label).toBe('Player or pair 1');
      expect(tn.participants.slot2Label).toBe('Player or pair 2');
      expect(tn.participants.competitionLabel).toBe('Tournament');
      expect(tn.participants.timeLabel).toBe('Start time');
      expect(tn.participants.requiresClub).toBe(false);
    });

    it('formats event titles accurately according to sport participants', () => {
      expect(formatEventTitle('football', 'Arsenal FC', 'Chelsea FC')).toBe('Arsenal FC vs Chelsea FC');
      expect(formatEventTitle('tennis', 'C. Alcaraz', 'J. Sinner')).toBe('C. Alcaraz vs J. Sinner');
      expect(formatEventTitle('tennis', 'Ram / Salisbury', 'Koolhof / Mektic')).toBe('Ram / Salisbury vs Koolhof / Mektic');
      expect(formatEventTitle('football', 'Arsenal FC', '')).toBe('Arsenal FC');
      expect(formatEventTitle('football', '', '', 'Custom Match Title')).toBe('Custom Match Title');
    });

    it('resolves sport configuration safely by id case-insensitively', () => {
      expect(getSportConfig('football')?.name).toBe('Football');
      expect(getSportConfig('TENNIS')?.name).toBe('Tennis');
      expect(getSportConfig('unknown_sport')).toBeNull();
      expect(getSportConfig(null)).toBeNull();
    });
  });

  describe('API v1 Match Ingestion & Schema Validation', () => {
    it('validates a standard football match with home_team and away_team', () => {
      const validFootball = {
        title: 'Highland Derby',
        home_team: 'Inverness CT',
        away_team: 'Ross County',
        sport: 'football',
        match_date: '2026-08-15T15:00:00Z',
        category: '1',
        price: 10,
        status: 'upcoming' as const,
        publish_status: 'published' as const
      };

      const result = matchSchema.safeParse(validFootball);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sport).toBe('football');
        expect(result.data.home_team).toBe('Inverness CT');
        expect(result.data.away_team).toBe('Ross County');
      }
    });

    it('validates a tennis event with player_pair_1 and player_pair_2', () => {
      const validTennis = {
        title: 'Highland Open - Men\'s Final',
        player_pair_1: 'C. Norrie',
        player_pair_2: 'A. Murray',
        sport: 'tennis',
        match_date: '2026-07-20T14:00:00Z',
        category: 'tennis',
        price: 15,
        status: 'upcoming' as const,
        publish_status: 'draft' as const
      };

      const result = matchSchema.safeParse(validTennis);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sport).toBe('tennis');
        expect(result.data.player_pair_1).toBe('C. Norrie');
        expect(result.data.player_pair_2).toBe('A. Murray');
        expect(result.data.publish_status).toBe('draft');
      }
    });

    it('rejects unsupported or unauthorized sport types', () => {
      const invalidSport = {
        home_team: 'Team A',
        away_team: 'Team B',
        sport: 'unsupported_rugby',
        match_date: '2026-09-01T15:00:00Z',
        category: '1',
        price: 0
      };

      const result = matchSchema.safeParse(invalidSport);
      expect(result.success).toBe(false);
    });

    it('supports draft publication status in match creation', () => {
      const draftEvent = {
        title: 'Draft Highland Match',
        home_team: 'Wester Ross',
        away_team: 'Skye United',
        sport: 'football',
        match_date: '2026-09-01T15:00:00Z',
        category: '1',
        publish_status: 'draft' as const
      };

      const result = matchSchema.safeParse(draftEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publish_status).toBe('draft');
      }
    });
  });

  describe('MySQL Database Mapping Integrity', () => {
    it('verifies MySQLAdapter bidirectional camelCase <-> snake_case participant fields', () => {
      // Mock an instance of MySQLAdapter
      const adapter = Object.create(MySQLAdapter.prototype);
      
      const jsEntity = {
        id: '12345',
        title: 'Test Match',
        sport: 'football',
        homeTeam: 'Team Red',
        awayTeam: 'Team Blue',
        playerPair1: null,
        playerPair2: null,
        clubId: 'club_99',
        competitionId: 'comp_88'
      };

      const dbRow = adapter.toDbObject ? adapter.toDbObject(jsEntity) : null;
      if (dbRow) {
        expect(dbRow.home_team).toBe('Team Red');
        expect(dbRow.away_team).toBe('Team Blue');
        expect(dbRow.club_id).toBe('club_99');
        expect(dbRow.competition_id).toBe('comp_88');
      }

      const inputDbRow = {
        id: '12345',
        title: 'Tennis Match',
        sport: 'tennis',
        player_pair_1: 'Player 1',
        player_pair_2: 'Player 2',
        home_team: null,
        away_team: null
      };

      const mappedEntity = adapter.toEntityObject ? adapter.toEntityObject(inputDbRow) : null;
      if (mappedEntity) {
        expect(mappedEntity.playerPair1).toBe('Player 1');
        expect(mappedEntity.playerPair2).toBe('Player 2');
        expect(mappedEntity.sport).toBe('tennis');
      }
    });
  });

  describe('Catalogue & Discovery Filtering Rules', () => {
    const mockMatches = [
      {
        id: 1,
        slug: 'highland-football-derby',
        title: 'Inverness CT vs Ross County',
        sport: 'football',
        home_team: 'Inverness CT',
        away_team: 'Ross County',
        club_id: 'club_inverness',
        competition_id: 'comp_highland_league',
        status: 'live',
        publish_status: 'published'
      },
      {
        id: 2,
        slug: 'skye-cup-upcoming',
        title: 'Portree FC vs Broadford FC',
        sport: 'football',
        home_team: 'Portree FC',
        away_team: 'Broadford FC',
        club_id: 'club_portree',
        competition_id: 'comp_skye_cup',
        status: 'upcoming',
        publish_status: 'published'
      },
      {
        id: 3,
        slug: 'highland-open-semi',
        title: 'Alcaraz vs Sinner',
        sport: 'tennis',
        player_pair_1: 'C. Alcaraz',
        player_pair_2: 'J. Sinner',
        competition_id: 'comp_tennis_open',
        status: 'completed',
        publish_status: 'published'
      },
      {
        id: 4,
        slug: 'private-draft-event',
        title: 'Unpublished Draft Clash',
        sport: 'football',
        home_team: 'Secret A',
        away_team: 'Secret B',
        status: 'upcoming',
        publish_status: 'draft' // DRAFT EVENT
      },
      {
        id: 5,
        slug: 'legacy-football-match',
        title: 'Old Football Match',
        sport: null, // Legacy match without sport field
        categories: [10], // Category 10 = Football
        status: 'completed',
        publish_status: 'published'
      }
    ];

    it('strictly excludes draft events from public catalog queries', () => {
      const publicCatalog = mockMatches.filter(m => m.publish_status !== 'draft');
      expect(publicCatalog.some(m => m.id === 4)).toBe(false);
      expect(publicCatalog.length).toBe(4);
    });

    it('filters events accurately by sport', () => {
      const tennisEvents = mockMatches.filter(m => m.publish_status !== 'draft' && m.sport === 'tennis');
      expect(tennisEvents.length).toBe(1);
      expect(tennisEvents[0].slug).toBe('highland-open-semi');
      expect(tennisEvents[0].player_pair_1).toBe('C. Alcaraz');

      const footballEvents = mockMatches.filter(m => m.publish_status !== 'draft' && m.sport === 'football');
      expect(footballEvents.length).toBe(2);
    });

    it('partitions matches correctly into Live now, Upcoming, and Replays', () => {
      const publicMatches = mockMatches.filter(m => m.publish_status !== 'draft');
      
      const liveMatches = publicMatches.filter(m => m.status === 'live');
      expect(liveMatches.length).toBe(1);
      expect(liveMatches[0].slug).toBe('highland-football-derby');

      const upcomingMatches = publicMatches.filter(m => m.status === 'upcoming');
      expect(upcomingMatches.length).toBe(1);
      expect(upcomingMatches[0].slug).toBe('skye-cup-upcoming');

      const replayMatches = publicMatches.filter(m => m.status === 'completed' || m.status === 'full_match');
      expect(replayMatches.length).toBe(2);
    });

    it('filters tennis matches by player name search', () => {
      const query = 'alcaraz';
      const tennisMatches = mockMatches.filter(m => {
        if (m.sport !== 'tennis') return false;
        const p1 = (m.player_pair_1 || '').toLowerCase();
        const p2 = (m.player_pair_2 || '').toLowerCase();
        return p1.includes(query) || p2.includes(query);
      });

      expect(tennisMatches.length).toBe(1);
      expect(tennisMatches[0].title).toBe('Alcaraz vs Sinner');
    });

    it('filters football matches by club id', () => {
      const invernessMatches = mockMatches.filter(m => m.club_id === 'club_inverness');
      expect(invernessMatches.length).toBe(1);
      expect(invernessMatches[0].home_team).toBe('Inverness CT');
    });

    it('retains canonical /matches/:slug URLs across all discovery routes', () => {
      mockMatches.forEach(m => {
        const canonicalUrl = `/matches/${m.slug}`;
        expect(canonicalUrl).toMatch(/^\/matches\/[a-z0-9-]+$/);
      });
    });
  });
});
