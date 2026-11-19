import { describe, expect, it } from 'vitest';
import { buildPostBroadcastDraftUpdates, createClubChannelWebhookProcessor } from '../clubStreamingService.js';

describe('Post-broadcast review (auto Draft)', () => {
  const optedIn = { auto_draft_after_broadcast: 1 };

  it('moves a published, live-ended Event to Draft and remembers the previous status', () => {
    const u = buildPostBroadcastDraftUpdates({ publish_status: 'published' }, optedIn, true);
    expect(u).toMatchObject({
      publish_status: 'draft',
      auto_drafted_after_broadcast: 1,
      pre_broadcast_publish_status: 'published',
    });
    expect(u?.auto_drafted_at).toBeTruthy();
  });

  it('treats a missing publish_status as published', () => {
    expect(buildPostBroadcastDraftUpdates({}, optedIn, true)?.pre_broadcast_publish_status).toBe('published');
  });

  it('never touches recording / replay fields', () => {
    const u = buildPostBroadcastDraftUpdates({ publish_status: 'published' }, optedIn, true)!;
    expect(Object.keys(u).some((k) => k.startsWith('mux_'))).toBe(false);
    expect(u.status).toBeUndefined();
  });

  it('does nothing when the club has not opted in (default)', () => {
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'published' }, {}, true)).toBeNull();
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'published' }, { auto_draft_after_broadcast: 0 }, true)).toBeNull();
  });

  it('does nothing when the session never went live', () => {
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'published' }, optedIn, false)).toBeNull();
  });

  it('does nothing for Events that are already Draft, deleted or revoked', () => {
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'draft' }, optedIn, true)).toBeNull();
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'deleted' }, optedIn, true)).toBeNull();
    expect(buildPostBroadcastDraftUpdates({ publish_status: 'published', revoke_status: 'revoked' }, optedIn, true)).toBeNull();
  });
});

describe('Club channel webhook: recording completion, idle and encoder restart', () => {
  function setup() {
    const matches = new Map<string, any>([
      ['event_1', { id: 'event_1', status: 'live', status_mode: 'manual', publish_status: 'published' }],
    ]);
    const channel: any = {
      id: 'ch_1', club_id: 'club_1', mux_live_stream_id: 'ls_1', mux_playback_id: 'pb_live',
      mux_playback_policy: 'public', channel_status: 'active',
      active_broadcast_session_id: 'sess_1', active_match_id: 'event_1',
    };
    const sessions = new Map<string, any>([
      ['sess_1', {
        id: 'sess_1', channel_id: 'ch_1', club_id: 'club_1', match_id: 'event_1', mux_live_stream_id: 'ls_1',
        mux_playback_policy: 'public', status: 'live', mux_asset_id: 'asset_1', mux_asset_playback_id: 'pb_vod_1',
        started_at: new Date(Date.now() - 600_000).toISOString(), ended_at: null, ended_by: null, recording_completed_at: null,
      }],
    ]);
    const seen = new Set<string>();

    const db = {
      collection: (_name: string) => ({
        doc: (id: string) => ({
          get: async () => ({ exists: matches.has(id), data: () => matches.get(id) }),
          update: async (u: any) => { matches.set(id, { ...matches.get(id), ...u }); },
        }),
      }),
    };

    const query = async (sql: string, params: any[] = []): Promise<any[]> => {
      if (sql.includes('FROM `mux_webhook_events`')) return seen.has(String(params[0])) ? [{ event_id: params[0] }] : [];
      if (sql.includes('FROM `club_streaming_channels`')) return channel.mux_live_stream_id === params[0] ? [{ ...channel }] : [];
      if (sql.includes('WHERE `mux_asset_id` = ?')) return [...sessions.values()].filter((s) => s.mux_asset_id === params[0]);
      if (sql.includes('WHERE `id` = ?')) return sessions.has(params[0]) ? [{ ...sessions.get(params[0]) }] : [];
      if (sql.includes("`ended_by` = 'mux_idle'")) {
        return [...sessions.values()].filter((s) => s.channel_id === params[0] && s.status === 'completed' && s.ended_by === 'mux_idle');
      }
      if (sql.includes("`status` IN ('assigned'")) {
        return [...sessions.values()].filter((s) => s.mux_live_stream_id === params[0] && ['assigned', 'live', 'disconnected', 'ending'].includes(s.status));
      }
      return [];
    };

    const execute = async (sql: string, params: any[] = []) => {
      const s = (id: string) => sessions.get(String(id));
      if (sql.includes('INSERT INTO `mux_webhook_events`')) seen.add(String(params[0]));
      else if (sql.includes('SET `recording_completed_at`')) { const x = s(params[0]); if (x) x.recording_completed_at = 'now'; }
      else if (sql.includes("SET `ended_by` = 'mux_idle'")) { const x = s(params[0]); if (x) x.ended_by = 'mux_idle'; }
      else if (sql.includes("SET `status` = 'disconnected', `ended_at` = NULL")) {
        const x = s(params[0]); if (x) { x.status = 'disconnected'; x.ended_at = null; x.ended_by = null; }
      }
      else if (sql.includes("SET `status` = 'completed'")) {
        const x = s(params[1]); if (x) { x.status = 'completed'; x.ended_at = new Date().toISOString(); }
      }
      else if (sql.includes("SET `status` = 'live'")) {
        const x = s(params[1]); if (x) { x.status = 'live'; if (params[0]) x.mux_asset_id = params[0]; }
      }
      else if (sql.includes('SET `mux_asset_id` = COALESCE')) {
        const x = s(params[3]); if (x) { x.mux_asset_id = x.mux_asset_id || params[0]; x.mux_asset_playback_id = x.mux_asset_playback_id || params[1]; }
      }
      else if (sql.includes('SET `active_broadcast_session_id` = NULL')) {
        if (channel.active_broadcast_session_id === params[1]) { channel.active_broadcast_session_id = null; channel.active_match_id = null; }
      }
      else if (sql.includes('SET `active_broadcast_session_id` = ?')) {
        if (!channel.active_broadcast_session_id) { channel.active_broadcast_session_id = params[0]; channel.active_match_id = params[1]; }
      }
      return {};
    };

    const process = createClubChannelWebhookProcessor({ db, query, execute, cacheEngine: { invalidateCollection: () => {} } });
    return { process, matches, sessions, channel };
  }

  it('marks the recording complete on video.asset.live_stream_completed without changing Event status', async () => {
    const { process, matches, sessions } = setup();
    const r = await process({ id: 'w1', type: 'video.asset.live_stream_completed', data: { id: 'asset_1', live_stream_id: 'ls_1' } });
    expect(r.handled).toBe(true);
    expect(sessions.get('sess_1').recording_completed_at).toBeTruthy();
    expect(matches.get('event_1').status).toBe('live');
    expect(matches.get('event_1').publish_status).toBe('published');
  });

  it('Mux idle (encoder drop) never auto-drafts the Event', async () => {
    const { process, matches, sessions } = setup();
    await process({ id: 'w2', type: 'video.live_stream.idle', data: { id: 'ls_1' } });
    expect(sessions.get('sess_1').status).toBe('completed');
    expect(sessions.get('sess_1').ended_by).toBe('mux_idle');
    expect(matches.get('event_1').status).toBe('full_match');
    expect(matches.get('event_1').publish_status).toBe('published');
  });

  it('re-opens an idle-closed session when the encoder restarts, keeping the original replay', async () => {
    const { process, matches, sessions, channel } = setup();
    await process({ id: 'w3', type: 'video.live_stream.idle', data: { id: 'ls_1' } });
    expect(channel.active_broadcast_session_id).toBeNull();

    await process({
      id: 'w4', type: 'video.live_stream.active',
      data: { id: 'ls_1', active_asset_id: 'asset_2', playback_ids: [{ id: 'pb_live', policy: 'public' }] },
    });
    expect(sessions.get('sess_1').status).toBe('live');
    expect(sessions.get('sess_1').mux_asset_id).toBe('asset_1');
    expect(channel.active_broadcast_session_id).toBe('sess_1');
    expect(matches.get('event_1').status).toBe('live');

    // Second recording asset becomes ready: Event keeps its first replay
    matches.set('event_1', { ...matches.get('event_1'), mux_asset_playback_id: 'pb_vod_1' });
    await process({
      id: 'w5', type: 'video.asset.ready',
      data: { id: 'asset_2', live_stream_id: 'ls_1', playback_ids: [{ id: 'pb_vod_2', policy: 'public' }] },
    });
    expect(matches.get('event_1').mux_asset_playback_id).toBe('pb_vod_1');
  });

  it('does not re-open a session the club explicitly ended', async () => {
    const { process, sessions, channel } = setup();
    const s = sessions.get('sess_1');
    Object.assign(s, { status: 'completed', ended_by: 'partner', ended_at: new Date().toISOString() });
    channel.active_broadcast_session_id = null;
    const r = await process({ id: 'w6', type: 'video.live_stream.active', data: { id: 'ls_1', active_asset_id: 'asset_9' } });
    expect(r.sessionId).toBeNull();
    expect(sessions.get('sess_1').status).toBe('completed');
  });
});
