import { z } from 'zod';

export const Product = z.object({
  id: z.number().int().positive(),
  sku: z.string().regex(/^SKU-\d{4}$/),
  name: z.string().min(1),
  category: z.enum(['Footwear', 'Apparel', 'Accessories']),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  sizes: z.array(z.string()).nonempty(),
  description: z.string(),
});

export const ProductPage = z.object({ total: z.number(), page: z.number(), size: z.number(), items: z.array(Product) });

export const Order = z.object({
  id: z.string().regex(/^ORD-/),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  currency: z.literal('EUR'),
  subtotal: z.number(), discount: z.number(), shipping: z.number(), vat: z.number(), vatRate: z.number(), total: z.number(),
  lines: z.array(z.object({ productId: z.number(), sku: z.string(), quantity: z.number().int().positive(), unitPrice: z.number(), lineTotal: z.number() })).nonempty(),
});

export type ProductT = z.infer<typeof Product>;
