# Event geographic restrictions

Events are worldwide by default. An **admin** (not operator or partner) can exclude countries per event in
Admin > edit event > Geographic availability. Each exclusion is permanent or timed. The event page stays visible;
only playback is refused.

## How it is enforced

- `geoRestrictionService.ts` evaluates windows on each request: start inclusive, end exclusive, stored as UTC
  milliseconds. There is no scheduled job to miss.
- `POST /api/matches/:id/stream` runs the gate after entitlement and before any playback ID or token is built.
  Excluded viewers get HTTP 451. The admin preview token uses the same gate. No role bypasses it.
- Tokens for a viewer whose window starts later are capped at that start. Because Mux tokens here are at least 60
  seconds, such viewers are cut off up to 60 seconds early.
- While an exclusion is active, a viewer whose country cannot be verified is refused.
- If protection drifts (signing removed, policy made public, another video source added, a playback ID is not signed),
  playback for that event is refused to everyone with HTTP 503.
- Changes that would weaken a restricted event are refused with HTTP 409.

## Required infrastructure

Restrictions cannot be saved until all of these pass; the editor lists what is missing.

1. Mux API token and Mux Signing Keys (Admin Settings > Mux Streaming).
2. Event source is Mux, policy is Signed Playback, and there is no other video link or embed on the event.
3. No non-signed playback ID remains on the event's Mux live stream or recording. Events using a club channel need
   that **channel** to be signed.
4. A trusted country source:

| Variable | Meaning |
| --- | --- |
| `GEO_COUNTRY_HEADER` | Header with the ISO country, e.g. `cf-ipcountry` |
| `GEO_EDGE_SECRET` | 32+ random characters (`openssl rand -hex 32`) |
| `GEO_EDGE_SECRET_HEADER` | Optional; default `x-wds-edge-secret` |

The edge (Cloudflare with IP Geolocation plus a request-header Transform Rule, or nginx with GeoIP2) must **overwrite**
both headers on every request. Do not expose the secret to browsers. The admin saving must reach the site through that
edge, which proves it works.

`X-Forwarded-For` and the existing `ip-api.com` lookup are not used: the first can be forged here, the second is
unencrypted, rate-limited and fails open.

## Assumptions and limits

- Country is based on IP. VPNs and proxies that appear to be in an allowed country are not detected.
- Mux's documented playback restrictions cover referrer and user agent, not country, so the check is made when access
  is issued. Tokens are not bound to an IP and could be shared until they expire.
- A restriction added with immediate effect does not revoke tokens already issued (up to 2 hours). Open event pages
  hide the player within about a minute, but that part is cosmetic. Schedule restrictions ahead where rights matter.
- Public playback IDs that were distributed before switching to signed must be deleted in Mux. The check covers the
  IDs on the event's current stream and recording.
- `GB` does not include Jersey (`JE`), Guernsey (`GG`), Isle of Man (`IM`) or Gibraltar (`GI`).
- No UK blackout is applied automatically; only manual exclusions exist.
- Purchases are not blocked. Restricted viewers see the notice but can still buy. This is a product decision to make.
- Editing one exclusion re-saves the whole list, so the last admin to save wins.
- A change of playback policy made directly in the Mux dashboard is caught by the per-ID check at playback, but a
  *new* public ID added there to a restricted stream is not seen until the next readiness check.
