# Frontend dependency upgrade plan

Same format as `fetch_shorts_review.md` — work through tier by tier, commit each tier separately. Mark items as done in the **Status** column.

Versions captured 2026-04-25.

---

## Tier 1 — Free wins (no API changes expected)

Goal: get on the latest patch/minor, plus React 18.3 to surface v19 deprecations.

| Package | Current | Target | Notes | Status |
|---|---|---|---|---|
| `autoprefixer` | 10.4.17 | ^10.5.0 | Patch+ | ✅ done (10.5.0) |
| `postcss` | 8.4.33 | ^8.5.10 | Patch+ | ✅ done (8.5.10) |
| `eslint-plugin-react-refresh` | 0.4.5 | ^0.5.2 | Pre-1.0, but stable | ✅ done (0.5.2). **Note:** peer-dep warning until ESLint upgraded in Tier 4 |
| `react` | 18.2.0 | ^18.3.0 | Final 18.x — emits v19 deprecation warnings | ✅ done (18.3.1) |
| `react-dom` | 18.2.0 | ^18.3.0 | Same | ✅ done (18.3.1) |
| `@types/react` | 18.2.51 | ^18.3.0 | Match React | ✅ done (18.3.7) |
| `@types/react-dom` | 18.2.18 | ^18.3.0 | Match React | ✅ done (18.3.7) |

**Test plan:** `pnpm run build` + manual smoke of homepage, detail page, watchlist.

**Expected output of Tier 1:** new deprecation warnings in dev console (legacy refs, propTypes, defaultProps on function components). Don't fix them yet — they're the input for Tier 3.

---

## Tier 2 — Single-package majors (independent)

Each can be done individually. Bump, scan changelog for breaking changes touching code we use, fix imports/usage, build.

| Package | Current | Target | Likely impact | Status |
|---|---|---|---|---|
| `@vitejs/plugin-react-swc` | 3.6.0 | ^4 | Mostly internal; minor config touch possible | ✅ done (4.3.0) |
| `i18next-browser-languagedetector` | 7.2.0 | ^8 | Detector option renames possible | ✅ done (8.2.1) |
| `react-cookie` | 7.2.0 | ^8 | Hooks API mostly stable | ✅ done (8.1.0) |
| `react-ga4` | 2.1.0 | ^3 | Init signature change possible — verify GA tracking still works | ✅ done (3.0.1) |
| `@fortawesome/fontawesome-svg-core` | 6.5.1 | ^7 | Icon set repackaging | ✅ done (7.2.0) |
| `@fortawesome/free-solid-svg-icons` | 6.5.1 | ^7 | Icon set repackaging | ✅ done (7.2.0) |
| `uuid` | 10.0.0 | ^14 | Tiny API surface; v11+ ships own types (drop `@types/uuid`) | ✅ done (14.0.0); `@types/uuid` removed |

**Test plan:** build + smoke after each. The fontawesome packages should be bumped together.

---

## Tier 3 — Coordinated React 19 day

Must be done together — peer-deps cascade.

| Package | Current | Target | Notes | Status |
|---|---|---|---|---|
| `react` | 18.3 (after Tier 1) | ^19 | Major — see below | ✅ done (19.2.5) |
| `react-dom` | 18.3 | ^19 | Same | ✅ done (19.2.5) |
| `@types/react` | 18.3 | ^19 | | ✅ done (19.2.14) |
| `@types/react-dom` | 18.3 | ^19 | | ✅ done (19.2.3) |
| `react-router-dom` | 6.22.0 | ^7 | New file-based routing optional; existing API mostly compatible | ✅ done (7.14.2) |
| `react-i18next` | 14.0.5 | ^17 | 3 majors | ✅ done (17.0.4) |
| `i18next` | 23.8.2 | ^26 | 3 majors | ✅ done (26.0.8) |
| `@headlessui/react` | 1.7.18 | ^2 | New component API for some primitives | ✅ done (2.2.10). Legacy `Menu.Button`/`Transition` render-prop API still works |
| `@fortawesome/react-fontawesome` | 0.2.0 | ^3 | First stable major | ✅ done (3.3.1) |
| `recharts` | 2.11.0 | ^3 | API tightening; check chart code | ✅ done (3.8.1). Custom tooltip switched from `TooltipProps` to `TooltipContentProps` |

**React 19 migration steps:**
1. Resolve all Tier 1 deprecation warnings first
2. Replace `forwardRef` with regular `ref` prop where used
3. Replace `<Context.Provider>` with `<Context>` (if any)
4. Remove `propTypes` / `defaultProps` from function components
5. Run codemods: `npx codemod@latest react/19/migration-recipe`

**Test plan:** full build + run dev server + smoke every page. Watch for runtime errors in console.

---

## Tier 4 — Big architectural shifts (each its own session)

Each is independent and substantial. Don't bundle.

| Migration | Current → Target | Effort | Status |
|---|---|---|---|
| `react-query@3` → `@tanstack/react-query@5` | rename + new API | High — touches every query/mutation hook | |
| `tailwindcss` 3 → 4 | new oxide engine, CSS-first config, breaking config format | High | |
| `vite` 5 → 8 | 3 majors, plugin churn | Medium-high | |
| `typescript` 5 → 6 | stricter; expect new type errors | Medium | |
| `eslint` 8 → 10 + `@typescript-eslint` 6 → 8 + `eslint-plugin-react-hooks` 4 → 7 | flat config required (v9+) | Medium-high; new config file format | |

**Order suggestion if doing all:** TanStack Query first (highest user-facing value), then ESLint flat config, then TS 6, then Vite 8, then Tailwind 4 last (biggest churn).

---

## Process per tier

1. Read this file's tier section
2. Run upgrades via `pnpm add` (specifying targets explicitly)
3. Build with `pnpm run build` — fix errors as they appear
4. Smoke test in `pnpm run dev`
5. Commit per tier with a clear message
6. Mark statuses in this file
