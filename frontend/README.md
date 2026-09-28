# NexaMarket frontend

Vue 3 + TypeScript catalogue connected to the NexaMarket REST API. Vue Router is
the only added dependency. No global state library or UI framework is required.

## Run

```sh
cd ~/Desktop/Portfolio/NexaMarket/frontend
npm install
cp .env.example .env.local
npm run dev -- --host localhost
```

Open the local URL printed by Vite (normally http://localhost:5173).
The existing backend must be available at http://localhost:3000. Set
`VITE_API_BASE_URL` in `.env.local` to change the API origin; restart Vite after
changing it. Vite environment variables are public browser configuration, not secrets.

## Build

```sh
npm run build
npm run preview -- --host localhost
```

Build runs vue-tsc and Vite. No lint or test scripts are configured in this starter.
Production hosting must serve index.html for client-side routes such as
`/products/:id` (history fallback).

## Structure and behavior

- `src/services/api.ts`: all HTTP requests, encoded parameters and API errors.
- `src/types/catalogue.ts`: actual API envelopes, decimal-string prices and nullable images.
- `src/views/`: catalogue, product detail and unknown-route screens.
- `src/components/`: product cards/images, pagination and status messages.
- `src/router/`: `/`, `/products/:id`, and a catch-all not-found page.

Catalogue category/page/limit state lives in the URL. Categories reset the page to
one. Lists use the backend pagination metadata, defaulting to 12 items; no local
pagination or text search is invented. Product detail links preserve the catalogue
query for the return link. Superseded requests are aborted. Loading, errors with
retry, empty results, invalid IDs, missing products and failed/missing images have
explicit states. Prices are displayed exactly as supplied; the API has no currency
field, so no currency symbol is assumed. Current seeded records are fictional.

Manual checks: browse categories; use `/?limit=3` and next/previous; open a product
and return; check narrow/mobile layout; visit `/products/invalid`; stop only your
own API session to check connection errors; test missing/broken product images.

## NexaMarket visual system

The marketplace uses an indigo primary, coral accents, mint stock indicators and
lavender/peach illustration surfaces. `src/style.css` defines reusable semantic
color, background, text, border, shadow, radius and spacing tokens. The responsive
layout includes a sticky header, layered hero, real category discovery controls,
product cards, a detail layout and designed loading/error/empty states.

Reusable presentation components:

- `SiteHeader.vue`: navigation and explicitly disabled search/wishlist/cart previews.
- `MarketplaceHero.vue`: original locally illustrated hero.
- `CategoryDiscovery.vue`: API-derived category buttons with pressed states.
- `CategoryArtwork.vue`: local SVG illustrations, shared by hero, filters and products.
- `ProductImage.vue`: safe HTTP(S) images with labelled illustrative fallbacks.
- `ProductCard.vue`, `ProductSkeleton.vue`, `StatusPanel.vue` and `PaginationControls.vue`.
- `src/utils/artwork.ts`: deterministic product/category illustration and palette mapping.

### Image investigation

All ten records in `backend/database/seeds/development_catalogue.sql` have a NULL
`image_url`; the running development API confirmed the same. These records do
not provide product photographs. Instead of an image-unavailable box, the frontend
renders local illustrations appropriate to the product name/category, with a
visible “Illustrative artwork” caption and accessible placeholder description.
Unknown categories receive generic artwork. Valid HTTP(S) images still render;
failed, missing and unsupported image sources use the same fallback. No external
image dependency or backend change is required.

### Truthful discovery and accessibility

“In-stock discoveries” is a subset of the currently returned API page with
`available_quantity > 0`, explicitly described as such. It makes no popularity,
recommendation, discount or delivery claims. Search, wishlist and cart do not send
requests and are labelled “Coming soon.” No currency symbol is inferred.

The skip link, visible keyboard focus, semantic sections, real button/link
semantics, pressed category state, loading announcements, image descriptions and
text stock labels are preserved or improved. Reduced-motion preferences disable
entrance effects, skeleton shimmer and hover movement. Layouts adapt across
mobile, tablet and desktop; page navigation scrolls to the catalogue and preserves
browser back/forward scroll positions.

### Verification of the redesign

- `npm run build`: passed (`vue-tsc -b` and Vite production build).
- No existing frontend lint/test scripts are configured.
- Temporary Playwright checks against the running development API passed:
  category filtering and active state; backend pagination; product detail and
  return filters; empty results; invalid query/ID; missing product/route;
  simulated API failure and retry; failed-image fallback; skip link; reduced motion.
- Catalogue overflow checks passed at 320, 375, 390, 600, 700, 768, 1024, 1280 and
  1920 CSS pixels. Mobile product detail also passed its overflow check.
- axe-core WCAG A/AA checks found no violations on catalogue and product detail
  at 1440px and 390px. Automated checks do not replace a complete manual audit.
- QA tooling was installed only in `/tmp/nexamarket-qa`; project dependencies,
  API services/types and backend files were not changed.
