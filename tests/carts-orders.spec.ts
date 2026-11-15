import { test, expect, customer } from '../src/fixtures';
import { Order } from '../src/schemas';

test.describe('Carts', () => {
  test('cart lifecycle with server-side pricing', async ({ request }) => {
    const cart = await (await request.post('/api/shop/carts')).json();
    await request.post(`/api/shop/carts/${cart.id}/items`, { data: { productId: 4, quantity: 2 } });
    await request.post(`/api/shop/carts/${cart.id}/items`, { data: { productId: 4, quantity: 1 } });
    const read = await (await request.get(`/api/shop/carts/${cart.id}`, { params: { country: 'FR', promo: 'SAVE10' } })).json();
    expect(read.items).toEqual([{ productId: 4, size: null, quantity: 3 }]);
    expect(read.pricing).toMatchObject({ subtotal: 43.5, discount: 4.35, shipping: 4.95, vatRate: 20 });

    await request.delete(`/api/shop/carts/${cart.id}/items/4`);
    expect((await (await request.get(`/api/shop/carts/${cart.id}`)).json()).items).toEqual([]);
  });

  test('cannot add more than the stock', async ({ request }) => {
    const cart = await (await request.post('/api/shop/carts')).json();
    const res = await request.post(`/api/shop/carts/${cart.id}/items`, { data: { productId: 6, quantity: 1 } });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: 'INSUFFICIENT_STOCK', available: 0 });
  });

  for (const quantity of [0, -1, 1.5]) {
    test(`quantity ${quantity} is rejected`, async ({ request }) => {
      const cart = await (await request.post('/api/shop/carts')).json();
      expect((await request.post(`/api/shop/carts/${cart.id}/items`, { data: { productId: 1, quantity } })).status()).toBe(422);
    });
  }
});

test.describe('Pricing rules', () => {
  const cases = [
    { name: 'free shipping from 100 EUR', items: [{ productId: 1, quantity: 1 }], promo: undefined, shipping: 0 },
    { name: 'shipping below 100 EUR', items: [{ productId: 9, quantity: 1 }], promo: undefined, shipping: 4.95 },
    { name: 'FREESHIP promo', items: [{ productId: 9, quantity: 1 }], promo: 'FREESHIP', shipping: 0 },
    { name: 'discount can push below threshold', items: [{ productId: 7, quantity: 1 }, { productId: 4, quantity: 1 }], promo: 'SAVE10', shipping: 4.95 },
  ];
  for (const c of cases) {
    test(c.name, async ({ request }) => {
      const p = await (await request.post('/api/shop/pricing', { data: { items: c.items, country: 'DE', promo: c.promo } })).json();
      expect(p.shipping).toBe(c.shipping);
      expect(p.total).toBeCloseTo(+((p.subtotal - p.discount + p.shipping) * 1.19).toFixed(2), 2);
    });
  }
});

test.describe('Orders', () => {
  test('order contract and Location header', async ({ request }) => {
    const res = await request.post('/api/shop/orders', { data: { customer: customer(), items: [{ productId: 11, quantity: 1 }], paymentMethod: 'paypal' } });
    expect(res.status()).toBe(201);
    const order = Order.parse(await res.json());
    expect(res.headers()['location']).toBe(`/api/shop/orders/${order.id}`);
  });

  test('Swiss order uses 8.1% VAT', async ({ request }) => {
    const order = await (await request.post('/api/shop/orders', { data: { customer: customer({ country: 'CH', postcode: '8001' }), items: [{ productId: 2, quantity: 1 }], paymentMethod: 'card' } })).json();
    expect(order.vatRate).toBe(8.1);
    expect(order.total).toBe(+(119 * 1.081).toFixed(2));
  });

  test('malformed JSON body is handled', async ({ request }) => {
    const res = await request.post('/api/shop/orders', { headers: { 'content-type': 'application/json' }, data: '{ not json' });
    expect(res.status()).toBe(422);
  });
});
