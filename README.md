# Playwright API · E-Commerce

[![Playwright tests](https://github.com/mukeshn/playwright-api-ecommerce/actions/workflows/playwright.yml/badge.svg)](https://github.com/mukeshn/playwright-api-ecommerce/actions/workflows/playwright.yml)
[![Live report](https://img.shields.io/badge/report-live-2ea44f?logo=github)](https://mukeshn.github.io/playwright-api-ecommerce/)
![Playwright](https://img.shields.io/badge/Playwright-1.65-2EAD33?logo=playwright&logoColor=white)
![zod](https://img.shields.io/badge/contracts-zod%204-3E67B1)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Pure API tests for a storefront backend, using Playwright's `APIRequestContext` with no browser. Responses are validated against **zod** schemas, so a contract break fails with a readable diff.

| Endpoint group | Covered |
|---|---|
| `GET /products` | contract, pagination, sorting, combined filters, 404 payload |
| Product admin | full CRUD, `Location` header, immutable `id`/`sku`, 401 vs 403 |
| Carts | add/merge/remove lines, stock conflict (409), invalid quantities |
| Pricing | free-shipping threshold, promo codes, VAT formula |
| Orders | contract, Swiss VAT, malformed JSON |

```ts
const body = ProductPage.parse(await res.json());   // throws with a field-level diff on contract drift
```

Role-based contexts come from fixtures, so a test simply asks for `adminApi` or `customerApi`:

```ts
test('customers are forbidden, anonymous is unauthorized', async ({ customerApi, request }) => {
  expect((await customerApi.delete('/api/shop/products/1')).status()).toBe(403);
  expect((await request.delete('/api/shop/products/1')).status()).toBe(401);
});
```

```bash
npm ci && npx playwright test
```
