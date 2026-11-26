import fs from 'fs';
import { describe, expect, it } from 'vitest';

// Inactive sports (Admin > Sports) must not be offered when creating an event.
describe('create-event sport pickers list active sports only', () => {
  it('admin Create Event dialog reads activeSports and never re-adds built-in sports', () => {
    const src = fs.readFileSync('src/pages/admin/CreateEvent.tsx', 'utf8');
    expect(src).toContain('activeSports: sports');
    expect(src).not.toMatch(/const \{ sports = \[\]/);
    expect(src).not.toContain('CONFIGURED_SPORTS');
    expect(src).toContain('if (!isActive) continue;');
  });

  it('partner Create Event modal reads activeSports', () => {
    const src = fs.readFileSync('src/components/PartnerCreateEventModal.tsx', 'utf8');
    expect(src).toContain('activeSports: sports');
  });
});
