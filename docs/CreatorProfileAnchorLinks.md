# Creator Profile Anchor Links

> Issue #159 — Adds URL hash navigation for main creator profile sections.

## Overview

Each creator profile tab (`overview`, `creations`, `collectors`, `activity`) is now addressable via a URL hash fragment. This enables:

- **Direct deep-linking** — share or bookmark a URL like `/#creations` and land on the correct tab.
- **Browser back/forward navigation** — pressing back after switching tabs returns to the previous section.
- **Preserved layout** — the visual appearance and existing component structure are unchanged.

## How it works

### `ProfileTabPillGroup` (`src/components/common/ProfileTabPill.tsx`)

The `enableHashRouting` prop has been activated and the implementation improved:

| Behaviour              | Detail                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **On mount**           | Reads `window.location.hash` and calls `onTabChange` if the hash matches a tab value.            |
| **Tab click**          | Calls `onTabChange` _and_ sets `window.location.hash` to the tab value.                          |
| **`hashchange` event** | Listens for browser-level hash changes (e.g. back/forward) and syncs the active tab.             |
| **ARIA attributes**    | Each `<button>` receives `id="profile-tab-{value}"` and `aria-controls="profile-panel-{value}"`. |

The two previously-duplicated `useEffect` calls are now merged into one to eliminate a potential mount-time race condition.

### `LandingPage` (`src/pages/LandingPage.tsx`)

Three targeted changes:

1. **Initial state** — `activeProfileTab` is initialised from `window.location.hash` so that a page load with a hash (e.g. `/#activity`) shows the correct tab immediately, without waiting for a re-render.
2. **`enableHashRouting`** — passed to `ProfileTabPillGroup`, enabling the hash sync logic.
3. **Panel markup** — the tab-panel `<div>` now carries `id="profile-panel-{activeTab}"`, `role="tabpanel"`, `aria-labelledby="profile-tab-{activeTab}"`, and `tabIndex={0}` so the tab ↔ panel relationship is semantically complete.

## Validation

```bash
# Run the new unit tests
pnpm test ProfileTabPillGroup

# Run the full test suite
pnpm test
```

### Manual verification

1. Open the app at `/`.
2. Navigate to the "Creator profile pattern" section.
3. Click **Creations** — the URL bar should update to `/#creations`.
4. Click **Collectors** — URL updates to `/#collectors`.
5. Press the browser **Back** button — returns to `/#creations` and activates that tab.
6. Open `/#activity` directly — the Activity tab should be active on load.
7. Open `/#` or a non-matching hash — falls back to the Overview tab.
