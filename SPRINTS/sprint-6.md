# Sprint 6 — pinned viewport layout

## Goal
Convert the whole app to a pinned viewport layout. The browser window never scrolls: the shell (sidebar, top bar, page headers) stays fixed and only designated inner regions scroll, with invisible scrollbars everywhere. On mobile the per-page pinning relaxes into one scroll surface with sticky blurred page headers, and the sidebar becomes an off-canvas drawer.

## Branch
`sprint-6`

## Done when
- The window never scrolls on any route, desktop or mobile.
- No visible scrollbar anywhere in the app, while wheel, touch, and keyboard scrolling all still work.
- Sidebar is fixed on desktop (pinned logo, scrolling nav, pinned account footer) and an off-canvas drawer on mobile (hamburger in the top bar, scrim, closes on nav/scrim/Escape).
- Top bar is pinned in the shell; page headers are pinned on desktop and sticky-blurred on mobile.
- Timetable, money sub-nav, jobs drawer, and shopping basket bar all behave inside the new scroll model.
- Deployed and verified on phone.

## Layer 0 — design spec
Write `design/sprint-6-layout.md` (the layout spec every screen now inherits) and update `design/design-system.md` §9/§10 to match (top bar pinned not sticky, drawer breakpoint 768px).
Commit: `"add sprint 6 layout spec"`

## Layer 1 — global foundation
Lock `html`/`body` (height 100%, overflow hidden, no overscroll). Replace the `scrollbar-thin` utility with `scrollbar-hide`. Add an `h-viewport` utility (100dvh with 100vh fallback). Adjust the root layout body and the login page to fit the locked viewport.
Commit: `"add scrollbar-hide utility and lock the viewport"`

## Layer 2 — app shell
Fixed sidebar + mobile drawer (new `sidebar-context.tsx` for open state), static pinned top bar with a hamburger on mobile, `main` becomes the single scroller with hidden scrollbar and safe-area bottom padding.
Commit: `"rework app shell with fixed sidebar and mobile drawer"`

## Layer 3 — page primitives
New `src/components/layout/page-shell.tsx` (`PageShell` / `PageHeader` / `PageBody`). Refactor every page and board to the pattern: pinned header + internal scroll on desktop, one surface + sticky blurred header on mobile. Money layout hosts the pinned sub-nav; shopping basket bar gains safe-area offset; all `scrollbar-thin` usages swapped.
Commit: `"add page shell primitives and pin page headers"`

## Layer 4 — timetable
The week grid becomes the page scroll region (`flex-1 min-h-0`), dropping the `max-h-[calc(100vh-12rem)]` hack. Sticky day row and time gutter keep working.
Commit: `"make timetable week view the page scroll region"`

## Layer 5 — deploy
tsc + lint + build green, manual desktop and mobile-emulation checks, update `docs/STATUS.md`, merge to main, verify on phone.
