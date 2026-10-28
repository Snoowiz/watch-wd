import { describe, it, expect } from 'vitest';
import {
  formatMatchStatus,
  isInterview,
  isHighlights,
  isVideoOnlyContent,
  cleanEditorialDescription,
  getPlaybackActionLabel
} from '../src/utils/statusHelper';

describe('Match Page Wording and Content Hierarchy Refinements', () => {
  describe('Status Helper & Content Classification', () => {
    it('accurately identifies interviews and prevents contradictory Full Match labels', () => {
      const interviewMatch = {
        title: 'Post-Match Press Interview: Coach Robertson',
        status: 'completed',
        description: 'Exclusive post game interview. #interview'
      };

      expect(isInterview(interviewMatch)).toBe(true);
      expect(isVideoOnlyContent(interviewMatch)).toBe(true);
      // Even if raw status is 'completed', display label should be 'Interview', not 'Full Match'
      expect(formatMatchStatus(interviewMatch.status, interviewMatch.title)).toBe('Interview');
    });

    it('accurately identifies highlights and formats label as Highlights', () => {
      const highlightsItem = {
        title: 'Highland League Semi-Final Highlights',
        status: 'completed',
        description: 'Key match highlights. #highlights'
      };

      expect(isHighlights(highlightsItem)).toBe(true);
      expect(isVideoOnlyContent(highlightsItem)).toBe(true);
      expect(formatMatchStatus(highlightsItem.status, highlightsItem.title)).toBe('Highlights');
    });

    it('formats standard match statuses accurately without inventing data', () => {
      expect(formatMatchStatus('live', 'Wester Ross FC vs Loch Ness United')).toBe('Live Now');
      expect(formatMatchStatus('upcoming', 'Wester Ross FC vs Loch Ness United')).toBe('Upcoming');
      expect(formatMatchStatus('full_match', 'Wester Ross FC vs Loch Ness United')).toBe('Full Match');
      expect(formatMatchStatus('completed', 'Wester Ross FC vs Loch Ness United')).toBe('Full Match');
    });

    it('provides short, accurate playback action labels for verified playback states', () => {
      expect(getPlaybackActionLabel({ isLive: true, isPlayable: true })).toBe('Watch live');
      expect(getPlaybackActionLabel({ isReplayAvailable: true, isPlayable: true })).toBe('Watch replay');
      expect(getPlaybackActionLabel({ isReplayAvailable: true, isPlayable: true, isOverlay: true })).toBe('Play replay');
      expect(getPlaybackActionLabel({ isUpcoming: true })).toBe('View broadcast');
      expect(getPlaybackActionLabel({ isEnded: true, isPlayable: false })).toBe('Broadcast ended');
      expect(getPlaybackActionLabel({ isUnavailable: true })).toBe('Temporarily unavailable');
    });
  });

  describe('Description Cleaning & Editorial Metadata Separation', () => {
    it('strips internal hashtags and SEO metadata without rewriting original description', () => {
      const storedContent = `
        Exciting Highland League match under floodlights.
        #full-match #interview
        SEO: grassroots football streaming scotland highlands
      `;

      const cleaned = cleanEditorialDescription(storedContent);
      expect(cleaned).toContain('Exciting Highland League match under floodlights.');
      expect(cleaned).not.toContain('#full-match');
      expect(cleaned).not.toContain('#interview');
      expect(cleaned).not.toContain('SEO:');
    });

    it('returns friendly default when description is empty or contains only tags', () => {
      expect(cleanEditorialDescription('')).toBe('No description provided.');
      expect(cleanEditorialDescription('#full-match')).toBe('No description provided.');
      expect(cleanEditorialDescription('SEO: keywords only')).toBe('No description provided.');
    });
  });
});
