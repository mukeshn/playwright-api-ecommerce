import { test as base, expect, type APIRequestContext } from '@playwright/test';

type Fixtures = { adminApi: APIRequestContext; customerApi: APIRequestContext };

async function authed(playwright: typeof import('@playwright/test'), baseURL: string, email: string, password: string) {
  const anon = await playwright.request.newContext({ baseURL });
  const { token } = await (await anon.post('/api/shop/auth/login', { data: { email, password } })).json();
  await anon.dispose();
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${token}` } });
}

export const test = base.extend<Fixtures>({
  adminApi: async ({ playwright, baseURL }, use) => {
    const ctx = await authed(playwright as never, baseURL!, 'admin@shop.test', 'Adm1n!2026');
    await use(ctx);
    await ctx.dispose();
  },
  customerApi: async ({ playwright, baseURL }, use) => {
    const ctx = await authed(playwright as never, baseURL!, 'standard@shop.test', 'Passw0rd!');
    await use(ctx);
    await ctx.dispose();
  },
});
export { expect };

export const customer = (over: Record<string, string> = {}) => ({
  email: `api.${Date.now()}@example.com`, firstName: 'Tom', lastName: 'Richter', street: 'Karlstraße 3', postcode: '80333', city: 'München', country: 'DE', ...over,
});
