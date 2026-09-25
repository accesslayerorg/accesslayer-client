# Contributing a New Page: Routing and Data Fetching

This guide walks you through adding a new page to the Access Layer client. It covers route registration, component structure, React Query data-fetching conventions, and layout component usage.

---

## Quick Start

1. **Create the page component** at `src/pages/YourNamePage.tsx` (PascalCase + `Page` suffix)
2. **Register the route** in `src/routes.tsx`
3. **Handle data fetching** using React Query hooks following the query key factory pattern
4. **Manage loading and error states** with skeletons and error boundaries
5. **Use shared layouts** where they fit; create new ones only if needed

---

## Part 1: File Structure and Naming Conventions

### Page Component Location and Naming

Every page lives in `src/pages/` with a consistent naming pattern:

| Item              | Convention                           | Example                                       |
| ----------------- | ------------------------------------ | --------------------------------------------- |
| **File location** | `src/pages/`                         | `src/pages/CreatorDetailPage.tsx`             |
| **File name**     | PascalCase + `Page` suffix           | `CreatorDetailPage.tsx`, `DashboardPage.tsx`  |
| **Export**        | Default export, function declaration | `export default function CreatorDetailPage()` |

A page component takes **no props**. It owns its layout, fetching, and state:

```tsx
// src/pages/CreatorDetailPage.tsx

export default function CreatorDetailPage() {
	// No props here ↑

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<h1>Page Title</h1>
		</main>
	);
}
```

### Page Component Best Practices

- **One component per file.** Don't combine multiple pages into a single file.
- **Always wrap page content in `<main>` semantic landmark** with `min-h-screen` to ensure full-height coverage.
- **Use PascalCase headings** — wrap page titles in `<h1>` and subsections in `<h2>`, `<h3>` following semantic hierarchy.
- **Import shared components** with the `@/` alias (e.g., `@/components/common/Button`).
- **Use existing fonts and colors** — don't introduce new global styles for a single page. Stick to `font-grotesque`, `font-jakarta`, and the dark blue palette (`bg-[#06111f]`, `text-white/70`).

---

## Part 2: Route Registration

Routes are registered in a **single source of truth** at `src/routes.tsx`. Add your new page there:

```tsx
// src/routes.tsx
import HomePage from './pages/HomePage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import YourNewPage from './pages/YourNewPage'; // ← import your page

export const routes = [
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '/creator/:id',
		element: <CreatorDetailPage />,
	},
	{
		path: '/your-route', // ← add your route
		element: <YourNewPage />,
	},
	{
		path: '*', // catch-all must stay last
		element: <NotFoundPage />,
	},
];
```

### Route Rules

- **Keep the catch-all (`*`) route last** — it shadows any route listed after it.
- **Use kebab-case for route paths** (e.g., `/creator-list`, not `/CreatorList`).
- **URL params use colon syntax** (e.g., `/creator/:id`) — extract them inside your page with `useParams()` from `react-router`.

---

## Part 3: Data Fetching with React Query

### Use a Custom Hook for Data Fetching

Don't fetch directly in your page. Instead, create a custom hook in `src/hooks/` that wraps the React Query call.

**Pattern:**

```ts
// src/hooks/useYourData.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { yourService } from '@/services/your.service';

export function useYourData(id: string) {
	return useQuery({
		queryKey: queryKeys.yourEntity.detail(id), // see Query Key Factory below
		queryFn: () => yourService.fetchData(id),
		enabled: !!id, // don't fetch until `id` is defined
	});
}
```

Then use it in your page:

```tsx
// src/pages/YourDetailPage.tsx
import { useYourData } from '@/hooks/useYourData';

export default function YourDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, error } = useYourData(id || '');

	if (isLoading) return <YourSkeleton />;
	if (error) throw error;
	if (!data) throw new ApiError('Not found', 404);

	return <main>{/* render your page with data */}</main>;
}
```

### Query Key Factory Pattern

All React Query keys are defined in a **single central factory** at `src/lib/queryKeys.ts`. This keeps key shapes predictable and invalidation reliable.

**Key structure:**

```ts
export const queryKeys = {
	yourEntity: {
		all: ['yourEntity'] as const,
		list: (params?: GetYourParams) =>
			['yourEntity', 'list', params ?? null] as const,
		detail: (id: string) => ['yourEntity', 'detail', id] as const,
		holders: (entityId: string) =>
			['yourEntity', entityId, 'holders'] as const,
	},
};
```

**Key rules:**

1. **`all` key** — every entity group has a static `all` key for bulk invalidation.
2. **Shared prefixes** — all keys in a group start with the same entity name so prefix-based invalidation works.
3. **`as const`** — return `as const` tuples so TypeScript infers literal types.
4. **Optional params become `null`** — when a list query has no filters, store `null` at the param position for consistent key shape.

**Add your entity to the factory:**

```ts
// src/lib/queryKeys.ts (existing)

import type { GetYourParams } from '@/services/your.service';

export const queryKeys = {
	creators: {
		/* ... */
	},
	wallet: {
		/* ... */
	},
	yourEntity: {
		all: ['yourEntity'] as const,
		list: (params?: GetYourParams) =>
			['yourEntity', 'list', params ?? null] as const,
		detail: (id: string) => ['yourEntity', 'detail', id] as const,
	},
};
```

See [docs/react-query-cache-conventions.md](./react-query-cache-conventions.md) for full details on cache invalidation patterns.

### Loading and Error States

Always handle the three states: `isLoading`, `error`, and `data`:

```tsx
import { CreatorProfileHeaderSkeleton } from '@/components/common/CreatorSkeleton';
import { ApiError } from '@/services/api.service';

export default function YourDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, error } = useYourData(id || '');

	// 1. LOADING: Show a skeleton while fetching
	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16">
				<CreatorProfileHeaderSkeleton />
			</main>
		);
	}

	// 2. ERROR: Throw to error boundary or render error UI
	if (error) {
		throw error; // handled by error boundary (see Part 5)
	}

	// 3. NO DATA: Throw a 404 error
	if (!data) {
		throw new ApiError('Not found', 404);
	}

	// 4. SUCCESS: Render your page
	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<h1>{data.title}</h1>
			{/* render data */}
		</main>
	);
}
```

### Stale Time Configuration

React Query data is stale immediately by default (`staleTime: 0`). Override this for data that changes infrequently:

```ts
useQuery({
	queryKey: queryKeys.yourEntity.detail(id),
	queryFn: () => yourService.fetchData(id),
	staleTime: 30_000, // data is fresh for 30 seconds
});
```

| Data Type                        | Recommended staleTime | Rationale                      |
| -------------------------------- | --------------------- | ------------------------------ |
| Real-time (prices, balances)     | `0` (default)         | Always show the latest value   |
| Semi-static (profiles, metadata) | `30_000` – `60_000`   | Balance freshness vs refetches |
| Rarely-changing (lists, config)  | `5 * 60_000` (5 min)  | Reduce bandwidth               |
| Truly static                     | `Infinity`            | Fetch once per session         |

See [docs/react-query-cache-conventions.md](./react-query-cache-conventions.md#stale-time-and-cache-time) for full details.

---

## Part 4: Service Layer and Data Types

Data fetching happens through a **service layer** in `src/services/`. Each service is a class that extends `BaseApiService` and handles a domain (creators, wallet, etc.).

**Example:**

```ts
// src/services/your.service.ts
import { BaseApiService, type APIResponse } from './api.service';

export interface YourEntity {
	id: string;
	title: string;
	description: string;
	// ... other fields
}

class YourService extends BaseApiService {
	async getYourData(id: string): Promise<YourEntity> {
		try {
			const response = await this.api.get<APIResponse<YourEntity>>(
				`/your-endpoint/${id}`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const yourService = new YourService();
```

Then import and use it in your hook:

```ts
// src/hooks/useYourData.ts
import { yourService } from '@/services/your.service';

export function useYourData(id: string) {
	return useQuery({
		queryKey: queryKeys.yourEntity.detail(id),
		queryFn: () => yourService.getYourData(id),
		enabled: !!id,
	});
}
```

See [docs/api-layer.md](./api-layer.md) for full service layer conventions.

---

## Part 5: Layout Components and Error Boundaries

### When to Use Shared Layouts

Check `src/components/common/` for existing layout and wrapper components:

- **`CreatorPageErrorBoundary`** — wraps creator pages to catch and handle errors
- **`SectionErrorBoundary`** — wraps individual sections to handle errors in one area without crashing the whole page
- **`SectionHeading`** — formats section titles consistently
- **`CardMetaRow`** — displays metadata in a consistent card row style

Use these when they fit. Don't create a new layout component unless an existing one truly doesn't match your needs.

### Error Boundaries for Pages

Wrap your page content in an error boundary to catch and display errors gracefully:

```tsx
// src/pages/YourDetailPage.tsx
import YourPageErrorBoundary from '@/components/common/YourPageErrorBoundary';

function YourDetailPageContent() {
	// ... your page logic with data fetching
	return <main>{/* content */}</main>;
}

export default function YourDetailPage() {
	return (
		<YourPageErrorBoundary>
			<YourDetailPageContent />
		</YourPageErrorBoundary>
	);
}
```

If a similar error boundary exists (e.g., `CreatorPageErrorBoundary`), study it and reuse or adapt it. Create a new one only if your error handling is significantly different.

---

## Part 6: Complete Minimal Example

Here's a full example adding a new page called `/creators` that lists all creators:

### Step 1: Create the Page

```tsx
// src/pages/CreatorListPage.tsx
import { useCreatorList } from '@/hooks/useCreatorList';
import CreatorCard from '@/components/common/CreatorCard';
import { CreatorCardGridSkeleton } from '@/components/common/CreatorCardSkeleton';
import { ApiError } from '@/services/api.service';

function CreatorListPageContent() {
	const { data: creators, isLoading, error } = useCreatorList();

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16">
				<CreatorCardGridSkeleton count={6} />
			</main>
		);
	}

	if (error) {
		throw error;
	}

	if (!creators || creators.length === 0) {
		throw new ApiError('No creators found', 404);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<h1 className="font-grotesque text-5xl font-black tracking-tight">
				All Creators
			</h1>
			<div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{creators.map(creator => (
					<CreatorCard key={creator.id} creator={creator} />
				))}
			</div>
		</main>
	);
}

export default function CreatorListPage() {
	return <CreatorListPageContent />;
}
```

### Step 2: Add the Query Hook

```ts
// src/hooks/useCreatorList.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

export function useCreatorList() {
	return useQuery({
		queryKey: queryKeys.creators.list(),
		queryFn: () => courseService.getCourses(),
	});
}
```

### Step 3: Register the Route

```tsx
// src/routes.tsx
import HomePage from './pages/HomePage';
import CreatorListPage from './pages/CreatorListPage'; // ← add import

export const routes = [
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '/creators',
		element: <CreatorListPage />, // ← add route
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
];
```

### Step 4: Verify

```bash
pnpm dev      # visit http://localhost:5173/creators
pnpm lint
pnpm build
```

---

## Key Files Reference

| File                                    | Purpose                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `src/routes.tsx`                        | Route registration — the single source of truth            |
| `src/pages/`                            | All page components live here (one file per page)          |
| `src/hooks/`                            | Custom React Query hooks for data fetching                 |
| `src/services/`                         | Service layer classes wrapping API calls                   |
| `src/lib/queryKeys.ts`                  | Central query key factory                                  |
| `src/components/common/`                | Shared layout, skeleton, and error boundary components     |
| `src/components/ui/`                    | Reusable UI primitives (Button, Input, etc.)               |
| `docs/react-query-cache-conventions.md` | Full React Query patterns (cache invalidation, stale time) |
| `docs/api-layer.md`                     | Service layer conventions and API error handling           |
| `docs/shared-components.md`             | Shared component library and styling guide                 |
| `docs/environment-variables.md`         | Environment variables reference                            |

---

## Cross-references

- [React Query Cache Conventions](./react-query-cache-conventions.md) — detailed query key design and cache invalidation patterns
- [API Layer Conventions](./api-layer.md) — service layer design, error handling, and request/response patterns
- [Shared Components Guide](./shared-components.md) — existing layout and UI components to reuse
- [Environment Variables](./environment-variables.md) — API endpoints and configuration
- [Contributing Guide](../CONTRIBUTING.md) — general project conventions and PR workflow
