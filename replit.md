# PawZone — Kerala's Pet Marketplace

## Project Overview

PawZone is a full-featured pet marketplace web application serving Kerala, India. Built as a pnpm monorepo with React+Vite frontend and Express/Node.js backend with PostgreSQL.

## Architecture

### Monorepo Packages
- `artifacts/api-server` — Express 5 REST API backend (port 8080)
- `artifacts/pawzone` — React+Vite frontend (port 19233)
- `lib/db` — Drizzle ORM schema + PostgreSQL client
- `lib/api-spec` — OpenAPI 3 spec + Orval codegen config
- `lib/api-zod` — Generated Zod validation schemas
- `lib/api-client-react` — Generated React Query hooks + custom fetch

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, shadcn/ui, wouter routing, TanStack Query
- **Backend**: Express 5, Node.js 24, TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Token-based (Bearer JWT-style sessions in DB)
- **Validation**: Zod v4 + drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Build**: esbuild

## User Roles

| Role | Description | Login |
|------|-------------|-------|
| Buyer | Browse, cart, order, pay | Email + password |
| Seller | Create listings, manage orders | Email + password |
| Transporter | Accept/deliver orders | Email + password |
| Admin | Platform management | PAWZONE_A2005 / PawZone2005 |

## Demo Credentials

- Buyer: `arun@example.com` / `test123`
- Seller: `rajan@example.com` / `seller123`
- Transporter: `saji@example.com` / `transport123`
- Admin: `PAWZONE_A2005` / `PawZone2005`

## Recent Updates (v2)
- **Open Signup**: All users can sign up worldwide. Country + State fields added (India/Kerala default). Non-Kerala users shown informational message.
- **Buyer Instant Access**: Buyers get immediate dashboard access. Sellers/Transporters still require admin approval.
- **Buyer Dashboard Redesign**: Amazon/Swiggy-style with sidebar, category pills (Dogs/Cats/Birds/Fish), live pet grid, welcome banner.
- **Image Upload**: Drag & drop image upload on CreateListingPage with POST `/api/upload` endpoint (multer).
- **Multi-stop Routes**: Transporter AddRoutePage now supports multiple intermediate stops with visual route preview.
- **Admin User Notifications**: WhatsApp button opens wa.me link with approval message for sellers/transporters.
- **UI/UX Overhaul**: New teal gradient hero, search bar, stats bar, improved cards, rounded-2xl design system.
- **Login/Signup Redesigned**: Modern cards, icon inputs, role selector buttons with emoji.
- **DB Schema**: Added `stops` JSON column to `transporter_routes` table.

## Business Logic

- **Kerala-only**: Service restricted to Kerala cities
- **Platform fees**: ₹20 for orders >₹100, ₹5 for orders ≤₹100
- **Payment window**: 3 hours from order placement
- **Night rule**: Orders after 9 PM processed next business day
- **PetCode system**: Unique code per pet for tracking/authenticity
- **Seller approval**: Sellers require admin approval before listing
- **Dispute resolution**: Buyers can report issues, admin resolves

## Frontend Pages

- `/` — Home page with hero, categories, featured listings
- `/listings` — Browse all pets with search/filter
- `/listings/:id` — Listing detail with photos, PetCode, add to cart
- `/login` — Login (email/seller ID/admin ID)
- `/signup` — Registration (role selection, Kerala city)
- `/buyer` — Buyer dashboard with order stats
- `/buyer/cart` — Shopping cart with order placement
- `/buyer/orders` — Order history
- `/buyer/orders/:id` — Order detail with payment & tracking
- `/seller` — Seller dashboard with revenue stats
- `/seller/listings` — Manage pet listings
- `/seller/listings/new` — Create new listing
- `/seller/orders` — View buyer orders
- `/transporter` — Transporter dashboard + routes
- `/admin` — Admin dashboard with platform stats
- `/admin/users` — User management (approve/block)
- `/admin/listings` — Listing approval queue
- `/admin/orders` — All platform orders
- `/admin/disputes` — Dispute resolution

## Database Schema Tables

- `users` — All roles (buyer/seller/transporter/admin)
- `sessions` — Auth tokens
- `listings` — Pet listings
- `cart` / `cart_table` — Shopping cart
- `orders` / `order_items` / `order_timeline` — Orders
- `transporter_routes` — Transporter route schedules
- `reviews` — Seller/pet reviews
- `disputes` — Buyer disputes
- `notifications` — User notifications
- `waitlist` — Pre-launch waitlist
- `addresses` — User delivery addresses

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI
- `pnpm --filter @workspace/db run push` — push schema to database
- `pnpm --filter @workspace/api-server run dev` — run API server

## Important Notes

- `lib/api-zod/src/index.ts` must only export `export * from "./generated/api"` — codegen rewrites it
- `lib/api-spec/orval.config.ts` zod output uses `target: "generated/api.ts"` (single file, no split mode)
- API responses from listings/orders use paginated format `{ items/listings/orders, total, totalPages, page }`
- Auth token stored in localStorage as `pawzone_token` and auto-injected via `setAuthTokenGetter`
