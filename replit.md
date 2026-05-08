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

## Recent Updates (PRD v2 Final System Perfection)
- **Gender Inventory System**: Listings now track `maleQuantity` + `femaleQuantity` separately.
- **Safe Listing Delete**: Soft delete if active orders, hard delete otherwise.
- **Buyer Order Detail 8-Stage Timeline**: Order Requested → Seller Confirmed → Payment Completed → Transport Assigned → Picked Up → In Transit → Delivered → Received Confirmation.
- **Transport Flow Simplified**: Pickup video auto-advances to in_transit. Buyer confirms delivery with one button (no video needed).
- **Delivery Point Architecture (v3)**: Full district→town matching system:
  - Buyers select multiple delivery towns during signup (multi-select checkboxes per district)
  - Sellers' towns serve as pickup points (stored as deliveryPoints array)
  - Transporter route stops are exact town names (not keyword matching)
  - New exact-intersection matching: order visible to transporter only if seller's pickup point AND buyer's delivery point are both in transporter's route stops
  - Auto-detected pickupPoint and deliveryPoint stored on order when transporter accepts
  - Cart page shows saved delivery points as radio buttons instead of text area
  - Settings page allows buyers/sellers to add/remove delivery points (district + town picker)
  - OrderDetailPage shows pickup → delivery route when both are set
- **Notifications Page**: Full notifications list with mark-as-read and clickable routing.
- **Settings Page**: Name, email, phone, password, address, delivery points update. Report an Issue. Logout.
- **Open Signup**: Buyers instant, sellers/transporters need admin approval.
- **Persistent Media Storage**: Replit Object Storage, up to 50MB images/videos.
- **Cart 3-hour Auto-Expiry**: Background sweeper sends notifications at 2.5h, clears at 3h.
- **Multi-stop Routes**: Transporter routes support intermediate stops. No limit on routes per day.

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
- `/buyer/orders/:id/pay` — UPI payment page (QR + upload screenshot)
- `/admin` — Admin dashboard with platform stats
- `/admin/users` — User management (approve/block)
- `/admin/listings` — Listing approval queue
- `/admin/orders` — All platform orders
- `/admin/disputes` — Dispute resolution
- `/admin/alerts` — System alerts from alert engine
- `/admin/payments` — UPI payment proof verification (approve/reject)

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
- `alerts` — System alerts (alert engine outputs)
- `payment_proofs` — UPI payment screenshot submissions with approve/reject workflow

## UPI Payment Flow

- `paymentStatus` values: `pending` → `pending_verification` → `paid` (approved) or `retry_allowed` (1st reject) or `failed` (2nd reject, cancels order)
- QR code stored at `artifacts/pawzone/public/upi-qr.jpg`
- UPI ID: `rishontogy5050@oksbi`
- Flow: buyer uploads screenshot + reference + date → admin verifies → approve (paid) or reject (retry/cancel)

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
