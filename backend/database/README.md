# NexaMarket database

Run from the backend directory with the existing `.env` configuration:

```sh
npm run db:migrate
npm run test:db
```

Both commands require host `localhost`, port `5432`, database `nexamarket`, and
user `nexamarket`, and verify the connected database identity before writing.
The runner uses the existing `pg` pool; no ORM or extra dependencies are needed.
PostgreSQL 13 or newer is required for the built-in `gen_random_uuid()` default.

## Migrations

`migrations/001_initial_schema.sql` creates the 12 marketplace tables. The runner
records filenames, SHA-256 checksums, and application timestamps in
`public.schema_migrations`. All pending migrations and their history records
commit in one transaction. A transaction-scoped advisory lock serializes runners.
A failure rolls back the entire batch. Existing conflicting tables cause an error;
they are never replaced or reset. Re-running the command skips applied files.

Add subsequent files as `002_description.sql`, `003_description.sql`, etc.
Use unique three-digit sequential prefixes. Never edit or remove an applied file.
The runner rejects changed, missing, or reordered migration history. Migration SQL
must not contain transaction control: the runner owns the transaction.

## Design decisions

- UUID primary keys and timezone-aware timestamps throughout. Update triggers
  maintain `updated_at` on the ten tables that have it.
- Email is unique and must be supplied trimmed and lowercase. Category names
  are unique with PostgreSQL's case-sensitive text semantics; category and product
  slugs are globally unique, lowercase, and hyphen-separated.
- Roles: CUSTOMER, SELLER, ADMIN. A seller profile belongs to one unique user.
  Application authorization will determine who can create a seller profile; the
  foreign key does not require that user's role to equal SELLER.
- One cart and one wishlist per user; at most one inventory row per product.
  Product creation should insert its inventory record in the same transaction.
- Prices are `NUMERIC(12,2)`, order totals `NUMERIC(14,2)`, and generated line
  totals `NUMERIC(22,2)`. Money must be nonnegative and cannot be NaN. This initial
  schema assumes one application currency; tax, shipping, and currency conversion
  are outside its scope.
- Order items store independent product name and unit price snapshots. Their line
  total is generated from the stored unit price and positive quantity. Checkout
  must copy these values and calculate the order total in one transaction; there
  is no cross-row order-total constraint. Product updates never update snapshots.
- Deleting a product sets historical order-item product references to NULL, while
  retaining snapshots. Orders with items, users with orders/seller profiles, and
  referenced sellers/categories are protected by RESTRICT. Prefer deactivating
  products using `is_active`. Disposable inventory, cart/wishlist items, and reviews
  cascade with their owner/product.
- Order statuses: PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED.
  Allowed transitions will be enforced by future order application logic.
- Ratings are 1–5; quantities are positive except inventory, which can be zero.
  Composite uniqueness prevents duplicate cart items, wishlist items, and reviews.
- Primary/unique constraints create indexes automatically. Nine additional indexes
  cover remaining foreign keys and category/active, user/date, and status/date queries.

## Verification

`npm test` tests target safety, migration transactions/history, and existing database
configuration without opening a database connection. `npm run test:db` explicitly
connects to the migrated NexaMarket database and checks real constraints, delete
behavior, automatic timestamps, and snapshot preservation. Its temporary fixture
records are always rolled back. No seed data is installed by either migration or
tests, and no customer or business records are supplied.

## Fictional development catalogue

```sh
npm run db:seed
npm run test:catalogue
```

The separate `seeds/development_catalogue.sql` inserts one fictional seller user,
one seller profile, four categories, ten active products, and ten inventory rows.
All records have fixed UUIDs and `demo-` slugs. The user has an invalid password-hash
marker (`!disabled-development-fixture`), not a usable login credential. The email
uses `example.invalid`. Images are NULL; no external image service is required.
One product has zero inventory to demonstrate an out-of-stock listing.

The seed verifies configuration and connected database identity before writing,
refuses `NODE_ENV=production`, and uses a transaction and advisory lock. Reruns skip
existing IDs without changing prices, stock, or other edits. A conflicting unique
email/slug under another ID fails and rolls back rather than overwriting records.
Run migrations first. The seed does not create orders, reviews, payments, or activity.

`npm run test:catalogue` requires the seeded development database. It reruns the
seed and checks that existing data is unchanged, then exercises real HTTP reads.
Inactive-product and missing-inventory checks run in a rolled-back transaction.
The test starts and closes its own temporary localhost listener.

## Read-only catalogue API

- `GET /api/categories`: `{ "data": [...] }`, sorted by name then ID.
- `GET /api/products`: `{ "data": [...], "pagination": { "page": 1, "limit": 12, "totalItems": 10, "totalPages": 1 } }`, active products only, sorted by name then ID.
- `GET /api/products/:id`: `{ "data": {...} }`, active product detail by canonical UUID.
- Invalid UUID: HTTP 400 `{ "error": "Bad Request" }`.
- Missing or inactive product: HTTP 404 `{ "error": "Not Found" }`.

Product responses contain `id`, `name`, `slug`, `description`, `price`, `image_url`,
`category` (id/name/slug), `seller` (id/store_name), and `available_quantity`.
Prices remain exact decimal strings, e.g. `"8.50"`. Missing inventory returns zero.
Out-of-stock active products remain visible. No user emails, password hashes,
internal timestamps, or seller user IDs are exposed. Product lists accept `page` (default 1), `limit` (default 12, maximum 100), and
`category` (an exact lowercase category slug, such as `demo-desk`). Page and limit
must be positive decimal integers without whitespace, signs, or leading zeroes.
Repeated parameters, malformed slugs, and unsafe integer/offset values return 400.
An unknown or empty category has zero results (`totalPages: 0`); an empty category
parameter is invalid. A page beyond the last returns an empty data array with the
matching total preserved. Filtering, LIMIT, OFFSET, and counting all happen in
one PostgreSQL statement. Existing category slug and product category/active
indexes support filtering; no additional indexes are introduced.

Routes delegate to controllers, services validate detail IDs, and repositories
hold PostgreSQL queries. User-controlled IDs use SQL parameters. Existing JSON
error handling is retained. `npm test` mocks only the PostgreSQL boundary and
exercises the HTTP routes without needing a running database.
