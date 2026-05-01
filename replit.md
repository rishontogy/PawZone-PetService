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
- **Gender Inventory System**: Listings now track `maleQuantity` + `femaleQuantity` separately. CreateListingPage and EditListingPage have ♂ Male / ♀ Female quantity inputs. ListingDetailPage shows gender selection buttons with available counts. Cart stores gender preference. Order creation deducts gender-specific stock.
- **Safe Listing Delete**: DELETE /listings/:id checks for active orders. If active orders exist → soft delete (status=inactive, hidden from buyers). Otherwise → hard delete (clears cart items first to avoid FK constraint). Seller listings page shows no inactive listings.
- **Vaccination UI Fix**: CreateListingPage and EditListingPage use consistent flex layout for the vaccination toggle with label + optional detail text.
- **Missing Order Video Endpoints**: Added POST /orders/:id/pickup-video (transporter), POST /orders/:id/in-transit (transporter), POST /orders/:id/delivery-video (transporter). Existing: prepared-video (seller), received-video (buyer).
- **Buyer Order Detail 8-Stage Timeline**: OrderDetailPage shows all 8 stages with timestamps: Order Requested → Seller Confirmed → Payment Completed → Transport Assigned → Picked Up → In Transit → Delivered → Received Confirmation.
- **Seller Prepared Video**: SellerOrdersPage has PreparedVideoBlock — upload video before marking order "ready for pickup".
- **Transporter Dashboard Complete**: Accept delivery dialog with transport fee input + earnings preview. PickupVideoBlock (status=ready), StartInTransitBlock (status=picked_up), DeliveryVideoBlock (status=in_transit).
- **Admin Platform Share % Management**: Admin users page shows Platform Share % numeric input for each transporter. PATCH /admin/users/:id endpoint to update. Inline save with success toast.
- **Notifications Page**: Full notifications list with mark-as-read, mark-all-read, clickable notifications routing to relevant order pages.
- **Settings Page**: Name, email, phone, password, address update. Report an Issue to Admin form. Transporter earnings info block. Logout.
- **Open Signup**: All users can sign up. Buyers get instant access, sellers/transporters need admin approval.
- **Persistent Media Storage**: Uploads to Replit Object Storage (GCS). Upload accepts image/* and video/* up to 50MB.
- **Cart 3-hour Auto-Expiry**: Background sweeper sends notifications at 2.5h, clears cart at 3h.
- **Multi-stop Routes**: Transporter routes support intermediate stops.

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
