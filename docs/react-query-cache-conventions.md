# React Query Cache Conventions

This document describes the conventions for React Query cache keys and cache
invalidation used across the client. Following these conventions keeps query
keys predictable, invalidation reliable, and cache behaviour consistent.

---

## Query Key Structure

Every query key follows the general shape:

```
[entity, identifier?, scope?]
```

- **entity** — the domain object (e.g. `'creators'`, `'wallet'`)
- **identifier** — a specific record id or address when targeting one item
- **scope** — the view or sub-resource (e.g. `'list'`, `'detail'`, `'holders'`)

### The Query Key Factory

All keys are defined in a **single central factory** at
`src/lib/queryKeys.ts`. Hooks and mutations import from it rather than
constructing inline arrays.

```ts
// src/lib/queryKeys.ts
export const queryKeys = {
	creators: {
		all: ['creators'] as const,
		list: (params?: GetCoursesParams) =>
			['creators', 'list', params ?? null] as const,
		detail: (id: string) => ['creators', 'detail', id] as const,
		holders: (creatorId: string) =>
			['creators', creatorId, 'holders'] as const,
	},
	wallet: {
		holdings: (address: string) => ['wallet', address, 'holdings'] as const,
		activity: (address: string) => ['wallet', address, 'activity'] as const,
	},
};
```

Key design rules:

1. **`all` key** — every entity group exposes a static `all` key
   (`['creators']`) so a single `invalidateQueries` call can target every key
   in that domain.
2. **Shared prefixes** — keys within a group share the leading segment so
   prefix-based invalidation works. Invalidating `['creators']` will mark every
   creator key stale.
3. **`as const`** — factory functions return `as const` tuples so TypeScript
   infers literal types instead of `string[]`.
4. **Optional params** — when a list key receives no filter, it stores `null`
   at the param position so the key shape is always consistent.
5. **No inline keys** — production hooks must use the factory. (Existing code
   in `useCreatorHolderCount.ts` uses an inline key as a deliberate exception
   because the `queryFn` is injected for testability.)

### Adding a New Entity

To add a new entity type — for example `courses` — extend the factory with the
same patterns:

```ts
import type { GetCoursesParams } from '@/services/course.service';

export const queryKeys = {
	creators: { /* … */ },
	wallet: { /* … */ },
	courses: {
		all: ['courses'] as const,
		list: (params?: GetCoursesParams) =>
			['courses', 'list', params ?? null] as const,
		detail: (id: string) => ['courses', 'detail', id] as const,
		enrollments: (courseId: string) =>
			['courses', courseId, 'enrollments'] as const,
	},
};
```

Then use it in hooks:

```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

export function useCourseDetail(id: string) {
	return useQuery({
		queryKey: queryKeys.courses.detail(id),
		queryFn: () => courseService.getById(id),
		enabled: !!id,
	});
}
```

The corresponding unit tests in `src/lib/__tests__/queryKeys.test.ts` verify key
shapes and shared prefixes:

```ts
it('courses.detail shares the courses prefix with courses.all', () => {
	expect(queryKeys.courses.detail('x')[0]).toBe(
		queryKeys.courses.all[0],
	);
});

it('courses.detail embeds the id at index 2', () => {
	expect(queryKeys.courses.detail('course-123')[2]).toBe('course-123');
});
```

---

## Cache Invalidation Patterns

### `invalidateQueries` (preferred after writes)

After a mutation that changes server data, **invalidate** stale queries and let
React Query refetch in the background:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useEnrollInCourse() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (courseId: string) => courseService.enroll(courseId),
		onSuccess: (_, courseId) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.courses.enrollments(courseId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.courses.detail(courseId),
			});
		},
	});
}
```

Use `invalidateQueries` when:

- The server is the source of truth for the mutated data.
- The mutation response does not contain the full updated entity.
- Multiple queries might be affected and you want them all to refetch.

### `setQueryData` (optimistic or server-returned data)

Use `setQueryData` when the mutation response contains the **exact** updated
data and you want to avoid an extra network roundtrip:

```ts
export function useUpdateCourseTitle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			courseId,
			title,
		}: { courseId: string; title: string }) =>
			courseService.updateTitle(courseId, title),
		onSuccess: (updatedCourse, { courseId }) => {
			queryClient.setQueryData(
				queryKeys.courses.detail(courseId),
				updatedCourse,
			);
		},
	});
}
```

Use `setQueryData` when:

- The server returns the complete updated entity in the mutation response.
- You are implementing **optimistic updates** and need to roll back on error.
- The updated data is needed immediately without waiting for a refetch.

### Decision Table

| Situation | Approach |
|---|---|
| Mutation changes server state, response is minimal | `invalidateQueries` |
| Mutation response includes full updated object | `setQueryData` |
| Optimistic update with rollback | `setQueryData` + `onError` rollback |
| Multiple entities affected by one mutation | `invalidateQueries` on shared prefix |
| User clicks "Refresh" button | `refetch()` on the specific query |

See [docs/state-management.md](./state-management.md) for the general rule on
when data belongs in React Query vs local state.

---

## Stale Time and Cache Time

### Defaults

The client does not set global overrides, so React Query v5 defaults apply:

| Option | Default | Meaning |
|---|---|---|
| `staleTime` | `0` | Data is stale immediately. Queries refetch on mount, window focus, and reconnect. |
| `gcTime` | `5 * 60 * 1000` (5 minutes) | Unused/inactive data stays in the cache for 5 minutes before garbage collection. |

### When to Override

Override `staleTime` for data that changes infrequently. This reduces
unnecessary network requests:

```ts
// Price data that updates every 30 seconds
useQuery({
	queryKey: queryKeys.creators.holders(creatorId),
	queryFn: () => fetchHolderCount(creatorId),
	staleTime: 30_000,
});
```

| Scenario | Recommended `staleTime` | Rationale |
|---|---|---|
| Real-time or live data (prices, balances) | `0` (default) | Always show the latest value. |
| Semi-static data (profile details, course metadata) | `30_000` – `60_000` (30–60 s) | Balances freshness against unnecessary refetches. |
| Rarely-changing data (creator list, static config) | `5 * 60_000` (5 min) or longer | Reduce bandwidth for data that barely changes. |
| Data that never changes during a session | `Infinity` | Fetch once; never refetch until the page reloads. |

Override `gcTime` only when you want to keep data in the cache longer (or
shorter) than the 5 minute default — for example, to preserve form draft data
across navigation:

```ts
useQuery({
	queryKey: queryKeys.courses.detail(courseId),
	queryFn: () => courseService.getById(courseId),
	gcTime: 10 * 60_000, // keep in cache for 10 minutes after unmount
});
```

### Important

- `gcTime` must always be **greater than** `staleTime` (if both are set).
- React Query v5 renamed `cacheTime` to `gcTime`. Use `gcTime` everywhere.
- The `MutationCache` in `src/providers/web3Utils.ts` logs structured error
  data on mutation failures. There is no need to add per-hook error logging.

---

## Cross-references

- [State Management Overview](./state-management.md) — when to use React Query
  vs local state
- [Error Handling in Hooks](./error-handling-in-hooks.md) — `useMutation`
  patterns with toasts and invalidation
- [API Layer Conventions](./api-layer.md) — service layer and `ApiError` class
- [Contribution Guide](../CONTRIBUTING.md) — verification commands, naming
  conventions, and PR workflow
- [Adding a Page Route](./adding-page-routes.md) — how to register a new route
  that consumes these hooks
