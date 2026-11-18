/**
 * Tests for checkMuxSigningPolicy (clubStreamingService.ts).
 *
 * This helper is the single enforcement point for the fail-closed Mux signed-
 * playback guard used in both channel provisioning and event assignment.
 *
 * Route-level tests (HTTP 400, no Mux API call, no DB row) require a full express
 * server with mocked deps (db, muxService, etc.) and are documented as pending stubs
 * at the bottom of this file.
 */
import { describe, expect, it } from 'vitest';
import { checkMuxSigningPolicy } from '../clubStreamingService.js';

describe('checkMuxSigningPolicy', () => {
  describe('signed policy without signing keys configured', () => {
    it('returns ok:false with status 400', () => {
      const result = checkMuxSigningPolicy('signed', false);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
      }
    });

    it('error message mentions Admin Settings and Mux Streaming', () => {
      const result = checkMuxSigningPolicy('signed', false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.error).toMatch(/Admin Settings/i);
        expect(failed.error).toMatch(/Mux Streaming/i);
      }
    });

    it('error message does not contain any key or secret values', () => {
      const result = checkMuxSigningPolicy('signed', false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        // Must not leak actual key material in the message.
        expect(failed.error).not.toMatch(/sk_|whsec_|muxkey_/i);
      }
    });
  });

  describe('public policy (signing keys irrelevant)', () => {
    it('returns ok:true when signing is not configured', () => {
      const result = checkMuxSigningPolicy('public', false);
      expect(result.ok).toBe(true);
    });

    it('returns ok:true when signing IS configured', () => {
      const result = checkMuxSigningPolicy('public', true);
      expect(result.ok).toBe(true);
    });
  });

  describe('signed policy with signing keys configured', () => {
    it('returns ok:true', () => {
      const result = checkMuxSigningPolicy('signed', true);
      expect(result.ok).toBe(true);
    });
  });

  describe('unknown / empty policy', () => {
    it('returns ok:true for empty string (not "signed", so no guard fires)', () => {
      const result = checkMuxSigningPolicy('', false);
      expect(result.ok).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Route-level integration stubs (require test server with mocked deps)
// ---------------------------------------------------------------------------
// The provisioning and event-assignment routes live inside initializeClubStreamingService
// closures, so they cannot be unit-tested without a full express app wired to mock
// instances of db, muxService, cacheEngine, etc.  The following cases should be
// covered in an integration suite once that infrastructure is available:
//
// Channel provisioning (POST /api/partner/streaming/channel):
//   • signed policy + no signing keys → HTTP 400, no createMuxLiveStream() call,
//     no INSERT into club_streaming_channels.
//   • public policy + no signing keys → proceeds normally (HTTP 201).
//   • signed policy + signing keys configured → proceeds normally (HTTP 201).
//
// Event assignment (POST /api/partner/streaming/assign-event):
//   • paid event + requireSignedForPaidEvents:true + no signing keys → HTTP 400,
//     no updateMuxLiveStreamWatermark() call, no INSERT into broadcast_sessions,
//     no UPDATE to club_streaming_channels, no UPDATE to matches.
//   • free event + public effective policy → proceeds normally.
//   • paid event + event-level mux_playback_policy:'public' overrides
//     requireSignedForPaidEvents:true → proceeds normally (policy decision; see
//     Part 2 item 3 in the task summary — this is intentional, not a bug).
//   • paid event + signing keys configured + requireSignedForPaidEvents:true →
//     proceeds normally.
