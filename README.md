# TinyGoods UA

Ukrainian online store (товари для дому, подарункова упаковка, гаджети та освітлення) with a glassmorphism storefront and admin panel for product/order management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/tinygoods/` — storefront + admin frontend (React/Vite, wouter, glass dark theme). Cart in `src/context/cart.tsx` (localStorage).
- `artifacts/api-server/src/routes/` — categories, products, orders, admin (stats)
- `lib/db/src/schema/` — categories, products, orders + order_items
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- Product seed images in `artifacts/tinygoods/public/products/`

## Architecture decisions

- Prices stored as `numeric(10,2)` in Postgres; routes serialize to numbers via `serializeProduct`/`serializeOrder`.
- Minimum order 300 грн enforced server-side in POST /orders; stock decremented in a transaction.
- Admin panel has no auth yet (planned). Ukrainian payment gateway (e.g. LiqPay/Monobank) planned.
- Codegen post-step rewrites zod import to `zod/v4` in `lib/api-zod/src/generated/api.ts` (Orval emits zod v4 API); the sed lives in `lib/api-spec/package.json` codegen script.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- User communicates in Russian; store UI must be Ukrainian.
- Apple-style glassmorphism (frosted translucent panels) is the required aesthetic.
- Mobile-first: dedicated mobile UX (bottom nav), most customers are on phones.
- Products are managed by admin via the admin panel — do not hard-copy products from the old Prom.ua site.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
