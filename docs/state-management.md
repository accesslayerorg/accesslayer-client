# Client State Management

## The Rule

| Data type                                                               | Where it lives                           |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| Server data (creators, holdings, activity feed)                         | React Query (`useQuery` / `useMutation`) |
| Ephemeral UI state (modals, input values, selected tabs, loading flags) | Local `useState`                         |

If the value came from an API response and needs to survive a component unmount or be shared across routes, put it in React Query. If it only controls what the user sees right now and can be re-derived on re-mount, use `useState`.

## Query Invalidation vs Manual Refetch

**Invalidate** after a mutation that changes server data:

```ts
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: queryKeys.creators.list() });
```

This marks cached data stale and lets React Query refetch in the background the next time the query is observed. Use this after a buy, sell, or profile update so all subscribers see fresh data automatically.

See [React Query Cache Conventions](./react-query-cache-conventions.md) for the query key naming convention, the `invalidateQueries` vs `setQueryData` decision guide, and stale time defaults.

## Refetch manually

Refetch manually only when you need to force an immediate reload independent of staleness — for example, a user-triggered "Refresh" button:

```ts
const { refetch } = useQuery({ queryKey: queryKeys.wallet.holdings(address), ... });
<button onClick={() => refetch()}>Refresh</button>
```

Avoid calling `refetch()` inside effects or after mutations — that bypasses cache coordination and can race with invalidation.

## Do Not Copy Server State into Local State

Storing a React Query result in `useState` breaks cache coherence and causes stale UI after mutations.

### Wrong

```tsx
function CreatorProfile({ id }: { id: string }) {
	const { data } = useCreatorDetail(id);
	const [creator, setCreator] = useState(data);
	return <div>{creator?.title}</div>;
}
```

### Right

```tsx
function CreatorProfile({ id }: { id: string }) {
	const { data: creator } = useCreatorDetail(id);
	return <div>{creator?.title}</div>;
}
```

## Ephemeral UI State Examples

These belong in `useState`, not React Query:

- Modal open/closed: `const [open, setOpen] = useState(false)`
- Controlled input value: `const [query, setQuery] = useState('')`
- Active tab: `const [activeTab, setActiveTab] = useState('overview')`
- Optimistic loading flag: `const [submitting, setSubmitting] = useState(false)`

---

## Handling Asynchronous States (Loading, Error, Data)

To avoid inconsistent layout shift and unhandled application crashes, every page component introducing server mutations or asynchronous fetching must explicitly handle the three lifecycle states: **Loading**, **Error**, and **Data**.

### 1. The Three-State Pattern Flowchart

1. **Loading State:** Immediately show a structural fallback layout matching the structural scale of the destination layout. Never present empty blank states or unformatted spinning animations.
2. **Error State:** Intercept request faults gracefully. Provide an isolated contextual failure notice alongside a trigger to manually execute a `refetch()` query call.
3. **Data State:** Render layout presentation markup smoothly once the data successfully hydrates.

### 2. Choosing a Skeleton Component

Match your structural loading fallbacks strictly to your structural data card layout sizes:

- Use `<CreatorSkeleton />` for complete full-bleed layout views or single entity profile view roots.
- Use `<CreatorCardSkeleton />` wrapped inside layout grids for multi-item entity dashboards, galleries, or listing blocks.

### 3. Error Architecture Strategy: Boundary vs. Inline States

- **Error Boundaries (`CreatorPageErrorBoundary`):** Use at the route level to safely isolate catastrophic runtime engine failures, critical layout state breakdowns, or complete backend authorization drops across whole pages.
- **Inline Contextual States (`SectionErrorBoundary`):** Use for sub-components, standalone layout modules, tabs, or localized search bars where a remote service query issue shouldn't block a user from browsing the remainder of the active application canvas. Always supply the React Query context `refetch` callback method directly to retry controls.

> The full convention — every error display mode (toast, inline, section boundary, page boundary, transaction surfaces, network banner), the `ApiError` status cheat sheet, and how to add a new error type to the classification system — lives in **[Error Handling Conventions](./error-handling-conventions.md)**.

### 4. Code Implementation Blueprint

```tsx
import React from 'react';
import { useCreatorDetail } from '@/hooks/useCreatorDetail';
import { CreatorSkeleton } from '@/components/common/CreatorSkeleton';

interface CreatorDashboardPageProps {
	creatorId: string;
}

export function CreatorDashboardPage({ creatorId }: CreatorDashboardPageProps) {
	const {
		data: creator,
		isLoading,
		isError,
		error,
		refetch,
	} = useCreatorDetail(creatorId);

	if (isLoading) {
		return <CreatorSkeleton />;
	}

	if (isError) {
		return (
			<div
				className="p-6 border border-red-200 rounded-lg bg-red-50"
				role="alert"
			>
				<h3 className="text-lg font-semibold text-red-800">
					Failed to load profile details
				</h3>
				<p className="mt-1 text-sm text-red-600">
					{error instanceof Error
						? error.message
						: 'An unexpected data layer exception occurred.'}
				</p>
				<button
					onClick={() => void refetch()}
					className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
				>
					Retry Connection
				</button>
			</div>
		);
	}

	return (
		<main className="p-6 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold">{creator?.name}</h1>
			<p className="text-gray-600 mt-2">{creator?.bio}</p>
		</main>
	);
}
```
