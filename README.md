# Shopify Admin App – Product Price Manager (Remix + GraphQL)

> Embedded admin app that lists products and increases variant prices by 10% in one click.
> Public read-only demo available via Storefront API.

## Demo
- 90s video: (링크)
- Public read-only page: (링크)
- If you’d like, I can invite you as a read-only staff to the dev store.

## Tech
- Remix, Polaris, App Bridge
- GraphQL Admin API (productVariantsBulkUpdate)
- Storefront API (public demo)

## Features
- List products (title, image, first variant price)
- One-click +10% price update (bulk mutation)
- Optimistic UI refresh

## Setup
1. Create Shopify Partner dev store
2. Add scopes: `read_products,write_products` (in `shopify.app.toml`)
3. `npm install && npm run dev` → install app to dev store
4. Open `/app/products`

## Code Pointers
- Loader: `app.routes/app.products.tsx` → `products(first:10)`
- Action: `productVariantsBulkUpdate`
