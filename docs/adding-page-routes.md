# Adding a New Page Route

This guide explains how to add a new route to the Access Layer client. It covers where routes are registered, the file naming convention for page components, and how to mark a route as auth-protected.

---

## Where routes are registered

Every route in the client is declared in a **single source of truth** at the top of `src/App.tsx`. The router is built once with `createBrowserRouter([...])` and passed to `<RouterProvider />`. To add a new route, append a `{ path, element }` entry to that array.

```tsx
// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage'; // ← new import

const router = createBrowserRouter([
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '/about', // ← new public route
		element: <AboutPage />,
	},
	{
		path: '*', // catch-all stays last
		element: <NotFoundPage />,
	},
]);
```

Key things to know:

- **Order matters** only for the `*` catch-all — keep it as the **last entry** so it does not shadow real routes.
- **Imports** for new page components live at the top of `src/App.tsx` alongside the existing ones. Use the relative `'./pages/<Name>Page'` path shown above, matching the existing imports.
- **Do not** create a second router or wrap the app in another `<RouterProvider />`. The router configured here is the only one.
- Nested routes for sub-pages (for example `/creators/:handle/keys`) are added the same way — just declare the full pattern on each entry. The current client uses flat routes only.

---

## File naming convention for page components

| What               | Convention                                      | Example                               |
| ------------------ | ----------------------------------------------- | ------------------------------------- |
| File location      | `src/pages/`                                    | `src/pages/HomePage.tsx`              |
| File name          | PascalCase + `Page` suffix                      | `AboutPage.tsx`                       |
| Exported component | Default export of a function named `<Name>Page` | `export default function AboutPage()` |

The component itself uses `export default function <Name>Page()` — not a named export, and not an arrow const. This keeps imports straightforward and matches every existing page in `src/pages/`:

```
src/pages/
├── HomePage.tsx        // registered as '/'
├── MarketingPage.tsx   // exists on disk, not yet registered
├── LandingPage.tsx     // exists on disk, not yet registered
└── NotFoundPage.tsx    // registered as '*' (catch-all)
```

A few pages exist as files but are not currently wired into the router in `src/App.tsx`. They are kept on disk because they are planned routes waiting on the marketplace flows to land. If you need one of them live, follow this guide to register it like any other page.

### What a page component looks like

Top-level page components take **no props**. They own their own layout, fetching, and state. A minimal page is just a function that returns JSX:

```tsx
// src/pages/AboutPage.tsx
export default function AboutPage() {
	return (
		<main className="min-h-screen px-6 py-16 text-white">
			<h1 className="font-grotesque text-4xl font-black">
				About Access Layer
			</h1>
			<p className="mt-4 font-jakarta text-white/70">
				Access Layer is a Stellar-native creator keys marketplace.
			</p>
		</main>
	);
}
```

Conventions to follow:

- **Default export only.** Named exports break the import in `App.tsx`.
- **One component per file.** Don't lump multiple pages into a single file.
- **No props.** Reach for URL params via `useParams()` from `react-router` instead of prop drilling.
- **Accessibility:** wrap content in a single `<main>` landmark and use semantic headings (`<h1>` for the page title).
- **Match the project styling.** Use the existing `font-grotesque`, `font-jakarta`, and dark-on-blue palette referenced throughout the codebase. Don't introduce new global styles for a single page.
- **Use the `@/` alias for component imports.** The project-wide path alias `@/` maps to `src/` (configured via Vite + TypeScript path mapping). Use it freely from any component file; reserve short relative paths like `'../pages/<Name>Page'` for tight sibling-file imports.

---

## Public vs auth-protected routes

There is **no existing `RequireAuth` / `ProtectedRoute` wrapper** in the codebase yet. Every route registered today is public. When a feature needs auth gating, follow the pattern below — and ship the wrapper component with that feature, since the client doesn't have a standalone auth-guard component yet.

### Recommended pattern

1. Create a small wrapper component, conventionally `src/components/auth/RequireAuth.tsx` (create the `auth/` subfolder if it doesn't exist yet).
2. Inside the wrapper, check the appropriate auth state — wagmi's `useAccount` for wallet-gated flows, or `authService.isAuthenticated()` for email/login-gated flows.
3. While the state is resolving, render a lightweight placeholder (the existing `PendingOnboardingPlaceholder` makes a good model).
4. If unauthenticated, render a redirect or a connect-wallet CTA — do **not** render the protected page.
5. Wrap the protected page's `element` with the wrapper inside `App.tsx`.

```tsx
// src/components/auth/RequireAuth.tsx
import type { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { Navigate, useLocation } from 'react-router';
import PendingOnboardingPlaceholder from '@/components/common/PendingOnboardingPlaceholder';

interface RequireAuthProps {
	children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
	const { isConnected, isConnecting } = useAccount();
	const location = useLocation();

	// Show the placeholder while a fresh wallet connection is in flight
	// so the user isn't redirected to "/" mid-connect. Once it resolves,
	// isConnected flips to true and we render the protected page below.
	// Note: isReconnecting is intentionally NOT in this branch — a
	// reconnect of a prior session keeps the user authenticated, so
	// rendering the protected page during a reconnect is fine.
	if (isConnecting) {
		return <PendingOnboardingPlaceholder />;
	}

	if (!isConnected) {
		// Send unauthenticated users back to the homepage while preserving
		// the path they tried to reach so a future flow can deep-link them
		// back here after they connect.
		return <Navigate to="/" state={{ from: location.pathname }} replace />;
	}

	return <>{children}</>;
}
```

Then wire the protection in `src/App.tsx` by wrapping the element rather than registering the page directly:

```tsx
// src/App.tsx
import RequireAuth from './components/auth/RequireAuth';
import DashboardPage from './pages/DashboardPage';

const router = createBrowserRouter([
	{ path: '/', element: <HomePage /> },
	{
		path: '/dashboard',
		// Public route → element: <DashboardPage />
		// Protected route → wrap in <RequireAuth>:
		element: (
			<RequireAuth>
				<DashboardPage />
			</RequireAuth>
		),
	},
	{ path: '*', element: <NotFoundPage /> },
]);
```

### Choosing which auth check to use

| Use case                                                            | Check                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The page reads or writes Stellar assets (keys, trades, portfolio)   | `useAccount().isConnected` from wagmi                                              |
| The page reads or writes user-profile data via the backend REST API | `authService.isAuthenticated()`                                                    |
| Both                                                                | Call both. Render the placeholder until both resolve; redirect if either is false. |

Don't mix the two states in a single component without documenting which is the source of truth for that page — that's the kind of bug that's hard to spot in review.

### Known repo state (read before adding a protected route)

Two pre-existing repo facts you should know before shipping a wagmi-based guard:

1. **`<Web3Provider>` is not currently mounted above `<App />` in `src/main.tsx`.** As of writing this guide, `main.tsx` renders `<App />` directly inside `<StrictMode>`. Any wagmi hook — including `useAccount` inside `RequireAuth` — will throw at runtime because the `WagmiProvider` context is missing. Wiring `<Web3Provider>` here is an app-level change and should be tracked separately; reference the tracking issue in your route PR description rather than embedding the wiring fix in your route PR.
2. **Wagmi has a transient `isConnecting` state** while a fresh wallet handshake is in flight. During this window `isConnected` is `false`, but redirecting the user mid-connect would bounce them away. The example above handles this by rendering `PendingOnboardingPlaceholder` for the `isConnecting` branch — copy that pattern verbatim. (Note: `isReconnecting` is _not_ included in that branch — a reconnect of a prior, already-authenticated session keeps the user authenticated, so rendering the protected page during a reconnect is fine and avoids a UX flash.)

If your guard only uses `authService.isAuthenticated()` (no wagmi hooks), neither caveat applies — the helper reads `localStorage` directly.

---

## Worked example — adding a new public page

This walks a contributor end-to-end through adding `AboutPage` at `/about`. The page is public, so no `RequireAuth` wrapper is involved.

### 1. Create the page component

Add a new file at `src/pages/AboutPage.tsx`:

```tsx
// src/pages/AboutPage.tsx
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<h1 className="font-grotesque text-5xl font-black tracking-tight">
				About Access Layer
			</h1>
			<p className="mt-6 max-w-2xl font-jakarta text-lg text-white/70">
				Access Layer is a Stellar-native creator keys marketplace built on
				the open AccessLayer protocol.
			</p>

			<div className="mt-8">
				<Button asChild>
					<Link to="/">Back to marketplace</Link>
				</Button>
			</div>
		</main>
	);
}
```

### 2. Register the route

Add the import and a new entry to the router array in `src/App.tsx`:

```tsx
// src/App.tsx
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage'; // ← added

const router = createBrowserRouter([
	{ path: '/', element: <HomePage /> },
	{ path: '/about', element: <AboutPage /> }, // ← added
	{ path: '*', element: <NotFoundPage /> },
]);
```

### 3. Link to it from another page

Open `src/pages/HomePage.tsx`, import `Link`, and add a `<Link>` to the new route:

```tsx
import { Link } from 'react-router';

// inside the JSX you return
<Link to="/about" className="font-jakarta text-amber-300 hover:underline">
	About this project
</Link>;
```

### 4. Verify locally

```bash
pnpm dev      # visit http://localhost:5173/about
pnpm lint
pnpm build
```

If `pnpm build` succeeds and `/about` renders the page with a working "Back to marketplace" link, you are done.

---

## Key files at a glance

| File                                                                                                       | Purpose                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                                                                              | The single source of truth for routing — the only place routes are registered.                                                                                          |
| `src/pages/`                                                                                               | Folder where every page component lives. One file per page, PascalCase + `Page` suffix, default export.                                                                 |
| `src/components/auth/RequireAuth.tsx`                                                                      | The recommended wrapper for auth-protected pages. Create it the first time a protected route is added.                                                                  |
| `src/main.tsx`                                                                                             | Mounts `<App />` inside React's `createRoot`. **Currently does not wrap `<App />` in `Web3Provider`** — must be updated the first time a wagmi-based route guard lands. |
| `src/providers/Web3Provider.tsx`                                                                           | Provides `WagmiProvider` + `QueryClientProvider`. Any auth wrapper that uses `useAccount` only works after this provider is mounted above the router in `main.tsx`.     |
| `CONTRIBUTING.md`                                                                                          | High-level project conventions — read this alongside this guide.                                                                                                        |
| `docs/api-layer.md`                                                                                        | Sibling guide covering how to add backend/API endpoints.                                                                                                                |
| [docs/shared-components.md](file:///Users/marvellous/Desktop/accesslayer-client/docs/shared-components.md) | Guide to the project's shared UI component library, key props, and styling.                                                                                             |
