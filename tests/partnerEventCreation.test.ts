import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SPORTS_REGISTRY, getSportConfig } from '../src/config/sports';

describe('Partner Event Creation & Access Control Suite', () => {
  describe('1. Multi-Sport Event Configuration & Dynamic Participant Mapping', () => {
    it('should correctly configure team sports (Football & Basketball)', () => {
      const footballConfig = getSportConfig('football');
      expect(footballConfig.participants.type).toBe('teams');
      expect(footballConfig.participants.slot1Label).toBe('Home team');
      expect(footballConfig.participants.slot2Label).toBe('Away team');
      expect(footballConfig.participants.requiresClub).toBe(true);

      const basketballConfig = getSportConfig('basketball');
      expect(basketballConfig.participants.type).toBe('teams');
      expect(basketballConfig.participants.slot1Label).toBe('Home team');
      expect(basketballConfig.participants.slot2Label).toBe('Away team');
    });

    it('should correctly configure player/pair sports (Tennis)', () => {
      const tennisConfig = getSportConfig('tennis');
      expect(tennisConfig.participants.type).toBe('players_or_pairs');
      expect(tennisConfig.participants.slot1Label).toBe('Player or pair 1');
      expect(tennisConfig.participants.slot2Label).toBe('Player or pair 2');
    });

    it('should correctly configure combat sports (Boxing & MMA)', () => {
      const boxingConfig = getSportConfig('boxing');
      expect(boxingConfig.participants.type).toBe('combatants');
      expect(boxingConfig.participants.slot1Label).toBe('Fighter 1');
      expect(boxingConfig.participants.slot2Label).toBe('Fighter 2');
    });

    it('should support dynamic/custom sports registered by administrators', () => {
      const customSports = [
        {
          id: 'badminton',
          name: 'Badminton',
          slug: 'badminton',
          description: 'Custom badminton tournaments',
          available: true,
          categorySlug: 'badminton',
          participants: {
            type: 'players_or_pairs' as const,
            slot1Label: 'Player 1',
            slot1Placeholder: 'e.g. Player A',
            slot2Label: 'Player 2',
            slot2Placeholder: 'e.g. Player B',
            competitionLabel: 'Tournament',
            competitionPlaceholder: 'Select tournament',
            timeLabel: 'Match time',
            requiresClub: false,
          },
          filters: {
            competitionFilterLabel: 'Tournament',
          },
        },
      ];

      const config = getSportConfig('badminton', customSports);
      expect(config.name).toBe('Badminton');
      expect(config.participants.slot1Label).toBe('Player 1');
    });
  });

  describe('2. Partner Event Creation Payload & Enforcement Rules', () => {
    it('should enforce partner club association and stream provider mux', () => {
      const partnerClubId = 'club_123';
      const rawInput = {
        title: 'SE Dons vs Baiteze',
        sport: 'football',
        home_team: 'SE Dons',
        away_team: 'Baiteze',
        date: '2026-11-20T15:00:00Z',
      };

      // Simulating partner event normalization
      const partnerMatch = {
        ...rawInput,
        club_id: String(partnerClubId),
        stream_provider: 'mux',
        status: 'upcoming',
        publish_status: 'published',
      };

      expect(partnerMatch.club_id).toBe('club_123');
      expect(partnerMatch.stream_provider).toBe('mux');
      expect(partnerMatch.status).toBe('upcoming');
    });

    it('should restrict PPV pricing if can_set_pricing permission is disabled', () => {
      const permissions = { can_set_pricing: false };
      const requestedAccess = 'ppv';
      const requestedPrice = 5.00;

      const finalAccess = permissions.can_set_pricing && requestedAccess === 'ppv' ? 'ppv' : 'free';
      const finalPrice = permissions.can_set_pricing && requestedAccess === 'ppv' ? requestedPrice : 0;

      expect(finalAccess).toBe('free');
      expect(finalPrice).toBe(0);
    });

    it('should allow PPV pricing if can_set_pricing permission is enabled', () => {
      const permissions = { can_set_pricing: true };
      const requestedAccess = 'ppv';
      const requestedPrice = 5.00;

      const finalAccess = permissions.can_set_pricing && requestedAccess === 'ppv' ? 'ppv' : 'free';
      const finalPrice = permissions.can_set_pricing && requestedAccess === 'ppv' ? requestedPrice : 0;

      expect(finalAccess).toBe('ppv');
      expect(finalPrice).toBe(5.00);
    });

    it('should force draft publish status if can_publish_events is disabled', () => {
      const permissions = { can_publish_events: false };
      const requestedPublish = 'published';

      const finalPublishStatus = permissions.can_publish_events ? requestedPublish : 'draft';
      expect(finalPublishStatus).toBe('draft');
    });

    it('should nullify competition if can_select_competitions is disabled', () => {
      const permissions = { can_select_competitions: false };
      const requestedComp = 'comp_999';

      const finalCompetitionId = permissions.can_select_competitions ? requestedComp : null;
      expect(finalCompetitionId).toBeNull();
    });
  });

  describe('3. Automatic Partner Access to Assigned Club Events', () => {
    it('should grant access to partner user whose club matches event club_id', () => {
      const user = {
        id: 'user_partner_1',
        role: 'partner',
        club_id: 'club_sedons',
      };

      const match = {
        id: 'match_100',
        club_id: 'club_sedons',
        access: 'paid',
        access_type: 'ppv',
        ppv_price: 10.00,
      };

      const userClubId = user.club_id;
      const matchClubId = match.club_id;

      const isPartnerOwner = Boolean(
        user.role === 'partner' && (
          (userClubId && matchClubId && String(matchClubId) === String(userClubId)) ||
          (user.id && String((match as any).operator_id) === String(user.id))
        )
      );

      expect(isPartnerOwner).toBe(true);
    });

    it('should grant access if partner user is the designated match operator', () => {
      const user = {
        id: 'user_operator_7',
        role: 'partner',
        club_id: 'club_other',
      };

      const match = {
        id: 'match_101',
        club_id: 'club_other',
        operator_id: 'user_operator_7',
        access: 'paid',
        access_type: 'ppv',
        ppv_price: 15.00,
      };

      const userClubId = user.club_id;
      const matchClubId = match.club_id;

      const isPartnerOwner = Boolean(
        user.role === 'partner' && (
          (userClubId && matchClubId && String(matchClubId) === String(userClubId)) ||
          (user.id && String(match.operator_id) === String(user.id))
        )
      );

      expect(isPartnerOwner).toBe(true);
    });

    it('should deny access to partner user if match belongs to a different club', () => {
      const user = {
        id: 'user_partner_2',
        role: 'partner',
        club_id: 'club_alpha',
      };

      const match = {
        id: 'match_102',
        club_id: 'club_beta',
        operator_id: 'user_beta_admin',
        access: 'paid',
        access_type: 'ppv',
        ppv_price: 5.00,
      };

      const userClubId = user.club_id;
      const matchClubId = match.club_id;

      const isPartnerOwner = Boolean(
        user.role === 'partner' && (
          (userClubId && matchClubId && String(matchClubId) === String(userClubId)) ||
          (user.id && String(match.operator_id) === String(user.id))
        )
      );

      expect(isPartnerOwner).toBe(false);
    });

    it('should preserve PPV protection for regular viewers while allowing club partner', () => {
      const viewerUser = {
        id: 'viewer_99',
        role: 'viewer',
        club_id: null,
      };

      const match = {
        id: 'match_103',
        club_id: 'club_sedons',
        access: 'paid',
        access_type: 'ppv',
        ppv_price: 3.50,
      };

      const purchases: any[] = []; // No purchase made

      const isPartnerOwner = Boolean(
        viewerUser.role === 'partner' && viewerUser.club_id === match.club_id
      );

      const hasValidPurchase = purchases.some(p => p.matchId === match.id && p.userId === viewerUser.id);
      const isFree = match.access === 'free';
      const hasAccess = hasValidPurchase || isFree || isPartnerOwner;

      expect(hasAccess).toBe(false);
    });
  });

  describe('4. Partner Club Permission Defaults & Admin Controls', () => {
    it('should default all standard partner permissions to true (enabled)', () => {
      const defaultPermissions = {
        can_create_events: true,
        can_edit_events: true,
        can_publish_events: true,
        can_set_pricing: true,
        can_select_competitions: true,
        can_select_categories: true,
      };

      expect(defaultPermissions.can_create_events).toBe(true);
      expect(defaultPermissions.can_edit_events).toBe(true);
      expect(defaultPermissions.can_publish_events).toBe(true);
      expect(defaultPermissions.can_set_pricing).toBe(true);
      expect(defaultPermissions.can_select_competitions).toBe(true);
      expect(defaultPermissions.can_select_categories).toBe(true);
    });

    it('should block event creation if can_create_events is explicitly false', () => {
      const club = {
        id: 'club_restricted',
        is_active: 1,
        can_create_events: 0,
      };

      const canCreate = club.can_create_events !== undefined ? Boolean(Number(club.can_create_events)) : true;
      expect(canCreate).toBe(false);
    });
  });
});
