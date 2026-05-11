import { describe, it, expect } from 'vitest';

// Smoke test the live staging deploy. Verifies every public route returns 200
// and admin routes redirect unauth callers.

const BASE = process.env.SMOKE_BASE_URL || 'https://staging.opengolfapi.org';

describe('public routes', () => {
  const paths = ['/', '/api-keys', '/pricing', '/status', '/near-me', '/search', '/submit', '/contact', '/legal/terms', '/legal/privacy', '/admin/login', '/sitemap.xml', '/robots.txt'];
  for (const p of paths) {
    it(`GET ${p} → 200`, async () => {
      const res = await fetch(`${BASE}${p}`, { redirect: 'manual' });
      expect(res.status, `${p} status`).toBe(200);
    }, 15000);
  }
});

describe('admin gate', () => {
  const adminPaths = ['/admin/dashboard', '/admin/members', '/admin/edits'];
  for (const p of adminPaths) {
    it(`GET ${p} unauth → 307 to /admin/login`, async () => {
      const res = await fetch(`${BASE}${p}`, { redirect: 'manual' });
      expect(res.status).toBe(307);
      const loc = res.headers.get('location') || '';
      expect(loc).toContain('/admin/login');
    }, 15000);
  }

  it('forged cookie → still 307 (HMAC verification rejects)', async () => {
    const res = await fetch(`${BASE}/admin/dashboard`, {
      redirect: 'manual',
      headers: { Cookie: 'og_admin=info%40geekur.com|9999999999|fakesignature' },
    });
    expect(res.status).toBe(307);
  }, 15000);
});

describe('content sanity', () => {
  it('course detail renders real DB data', async () => {
    const res = await fetch(`${BASE}/courses/il/governors-run-golf-course`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Governors Run');
  }, 15000);

  it('pricing has all 5 tiers', async () => {
    const html = await fetch(`${BASE}/pricing`).then(r => r.text());
    for (const tier of ['Anonymous', 'Keyed', 'Backer', 'Sponsor', 'Major Sponsor']) {
      expect(html, `tier ${tier}`).toContain(tier);
    }
  }, 15000);

  it('sitemap has 10k+ URLs', async () => {
    const xml = await fetch(`${BASE}/sitemap.xml`).then(r => r.text());
    const count = (xml.match(/<url>/g) || []).length;
    expect(count).toBeGreaterThan(10000);
  }, 30000);
});
