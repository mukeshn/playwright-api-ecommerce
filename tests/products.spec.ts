import { test, expect } from '../src/fixtures';
import { Product, ProductPage } from '../src/schemas';

test.describe('GET /api/shop/products', () => {
  test('response matches the contract', async ({ request }) => {
    const res = await request.get('/api/shop/products');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const body = ProductPage.parse(await res.json());
    expect(body.total).toBe(body.items.length);
  });

  test('pagination returns disjoint pages', async ({ request }) => {
    const p1 = (await (await request.get('/api/shop/products', { params: { page: 1, size: 5, sort: 'name-asc' } })).json()).items;
    const p2 = (await (await request.get('/api/shop/products', { params: { page: 2, size: 5, sort: 'name-asc' } })).json()).items;
    expect(p1).toHaveLength(5);
    expect(p1.map((p: { id: number }) => p.id)).not.toEqual(expect.arrayContaining(p2.map((p: { id: number }) => p.id)));
  });

  for (const [sort, cmp] of [['price-asc', (a: number, b: number) => a - b], ['price-desc', (a: number, b: number) => b - a]] as const) {
    test(`sort=${sort}`, async ({ request }) => {
      const prices = (await (await request.get('/api/shop/products', { params: { sort } })).json()).items.map((p: { price: number }) => p.price);
      expect(prices).toEqual([...prices].sort(cmp));
    });
  }

  test('filters combine: category + inStock + q', async ({ request }) => {
    const { items } = await (await request.get('/api/shop/products', { params: { category: 'Apparel', inStock: 'true', q: 'layer' } })).json();
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      expect(p.category).toBe('Apparel');
      expect(p.stock).toBeGreaterThan(0);
      expect(p.name.toLowerCase()).toContain('layer');
    }
  });

  test('unknown product id is 404', async ({ request }) => {
    const res = await request.get('/api/shop/products/99999');
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'NOT_FOUND', message: 'Product 99999 not found' });
  });
});

test.describe('Product administration', () => {
  test('admin can create, update, patch and delete', async ({ adminApi }) => {
    const created = await adminApi.post('/api/shop/products', { data: { name: `Trail Cap ${Date.now()}`, category: 'Accessories', price: 24.9, stock: 10 } });
    expect(created.status()).toBe(201);
    const product = Product.parse(await created.json());
    expect(created.headers()['location']).toBe(`/api/shop/products/${product.id}`);

    const put = await adminApi.put(`/api/shop/products/${product.id}`, { data: { name: 'Trail Cap Pro', price: 29.9 } });
    expect((await put.json()).name).toBe('Trail Cap Pro');

    const patch = await adminApi.patch(`/api/shop/products/${product.id}`, { data: { stock: 3 } });
    expect(await patch.json()).toMatchObject({ name: 'Trail Cap Pro', stock: 3 });

    expect((await adminApi.delete(`/api/shop/products/${product.id}`)).status()).toBe(204);
    expect((await adminApi.get(`/api/shop/products/${product.id}`)).status()).toBe(404);
  });

  test('validation errors are listed', async ({ adminApi }) => {
    const res = await adminApi.post('/api/shop/products', { data: { category: 'Toys', price: -1 } });
    expect(res.status()).toBe(422);
    expect((await res.json()).details).toEqual(['name is required', 'category must be Footwear, Apparel or Accessories', 'price must be a positive number']);
  });

  test('customers are forbidden, anonymous is unauthorized', async ({ customerApi, request }) => {
    expect((await customerApi.delete('/api/shop/products/1')).status()).toBe(403);
    expect((await request.delete('/api/shop/products/1')).status()).toBe(401);
  });

  test('id and sku are immutable on update', async ({ adminApi }) => {
    const res = await adminApi.patch('/api/shop/products/2', { data: { id: 999, sku: 'HACK' } });
    expect(await res.json()).toMatchObject({ id: 2, sku: 'SKU-1002' });
  });
});
