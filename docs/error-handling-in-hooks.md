# Error Handling in React Query Hooks

This guide documents the standard pattern for handling API errors in React Query hooks across this codebase. Follow it when writing new `useQuery` or `useMutation` hooks so error behavior is consistent and predictable for users.

---

## How Errors Flow In

All HTTP requests go through the service layer (`src/services/`), which extends `BaseApiService`. The `handleError` method on that base class normalises every failure into an `ApiError` before it reaches the hook:

| Raw failure                           | What you receive                                       |
| ------------------------------------- | ------------------------------------------------------ |
| HTTP response with an error status    | `ApiError(message, httpStatus, responseBody)`          |
| Request sent but no response received | `ApiError('Network error - check your connection', 0)` |
| Unexpected non-HTTP exception         | `ApiError(error.message, 500)`                         |

One important exception: **401 + `TOKEN_EXPIRED`** is handled transparently by the Axios interceptor in `BaseApiService`. The interceptor silently retries the original request after refreshing the access token. If the refresh also fails the user is redirected to `/login`; the hook never sees this error.

---

## The `ApiError` Shape

```ts
// src/services/api.service.ts
class ApiError extends Error {
	status: number; // HTTP status code; 0 means no network response
	response?: {
		success: false;
		message: string;
		code?: string; // machine-readable code from the API, e.g. "INSUFFICIENT_BALANCE"
		errors?: Array<{
			field?: string; // present on 422 validation failures
			message: string;
		}>;
	};
}
```

Always cast the error to `ApiError` before inspecting it:

```ts
import { ApiError } from '@/services/api.service';

onError: error => {
	const apiError = error as ApiError;
	console.log(apiError.status); // 0, 400, 403, 422, 500 …
	console.log(apiError.message); // human-readable message from the API
	console.log(apiError.response?.errors); // field-level details on 422
};
```

---

## Distinguishing Error Types

### Network errors (`status === 0`)

No response was received — the user is offline, the server is unreachable, or a timeout occurred. The user cannot fix the request payload; they need to retry later.

```ts
if (apiError.status === 0) {
	showToast.error('Network error. Check your connection and try again.');
	return;
}
```

### 4xx — Client errors

The request was received but rejected because of something the client sent. The message from the API is usually safe to show to the user.

| Status | Cause                    | Typical UI response                                  |
| ------ | ------------------------ | ---------------------------------------------------- |
| 400    | Malformed request        | Toast with `apiError.message`                        |
| 401    | Session expired          | Auto-handled by the interceptor                      |
| 403    | Insufficient permissions | Inline error or redirect                             |
| 404    | Resource not found       | Inline error state                                   |
| 422    | Validation failure       | Inline field errors from `apiError.response?.errors` |
| 429    | Rate limited             | Toast with retry suggestion                          |

### 5xx — Server errors

The API itself failed. The user cannot fix the payload; they can only retry after the server recovers. Avoid showing raw server messages — use a generic fallback instead.

```ts
if (apiError.status >= 500) {
	showToast.error('The server ran into a problem. Please try again shortly.');
	return;
}
```

---

## Deciding: Toast vs. Inline Error vs. Error Boundary

### Use a toast when

- The failure came from a **user-initiated action** (mutation): buying a key, submitting a form, enrolling in a course.
- The error **does not block the current view** — the page can still render usefully.
- The fix is to retry or change input: one line of feedback is enough.

```ts
onError: error => {
	const apiError = error as ApiError;
	showToast.error(
		apiError.status >= 500
			? 'Something went wrong. Try again.'
			: apiError.message
	);
};
```

### Use an inline error state when

- The error **blocks the primary purpose of the screen** — for example, the creator list failed to load so the page is empty.
- The error contains **field-level detail** (422) that needs to map to specific form inputs.
- The user needs to take **corrective action** (fix a field, switch networks) before retrying makes sense.

```tsx
const { data, isError, error } = useCreatorKeys(creatorId);

if (isError) {
	const apiError = error as ApiError;
	return (
		<div
			role="alert"
			className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"
		>
			{apiError.status >= 500
				? 'Unable to load data. Please try again later.'
				: apiError.message}
		</div>
	);
}
```

### Use `SectionErrorBoundary` when

- A **component throws during render**, not from an API call.
- You want to **isolate a section** so one broken widget does not crash the whole page.
- React Query's `throwOnError` option is enabled on a query.

```tsx
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

<SectionErrorBoundary sectionName="creator keys">
	<CreatorKeysSection creatorId={id} />
</SectionErrorBoundary>;
```

`SectionErrorBoundary` renders a retry button that resets its own error state. Use it as a safety net around sections that fetch and render data together.

---

## `useQuery` Pattern

React Query v5 removed the `onError` callback from `useQuery`. Errors surface through `isError` and `error` in the component. Keep the hook thin and handle the error at the call site:

```ts
// src/hooks/useCreatorProfile.ts
import { useQuery } from '@tanstack/react-query';
import { creatorService } from '@/services/creator.service';

export function useCreatorProfile(creatorId: string) {
	return useQuery({
		queryKey: ['creator-profile', creatorId],
		queryFn: () => creatorService.getProfile(creatorId),
		staleTime: 30_000,
	});
}
```

```tsx
// In the component
import { ApiError } from '@/services/api.service';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';

function CreatorProfileSection({ creatorId }: { creatorId: string }) {
	const { data, isLoading, isError, error } = useCreatorProfile(creatorId);

	if (isLoading) return <ProfileSkeleton />;

	if (isError) {
		const apiError = error as ApiError;
		return (
			<div role="alert" className="p-4 text-sm text-destructive">
				{apiError.status >= 500
					? 'Unable to load this profile right now.'
					: apiError.message}
			</div>
		);
	}

	return <ProfileCard profile={data} />;
}
```

---

## `useMutation` Pattern

`useMutation` still accepts `onError` and `onSuccess` callbacks. Use them for toasts and cache invalidation:

```ts
// src/hooks/useEnrollInCourse.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '@/services/course.service';
import { ApiError } from '@/services/api.service';
import showToast from '@/utils/toast.util';

export function useEnrollInCourse() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (courseId: string) => courseService.enrollInCourse(courseId),
		onError: error => {
			const apiError = error as ApiError;

			if (apiError.status === 0) {
				showToast.error(
					'Network error. Check your connection and try again.'
				);
				return;
			}

			if (apiError.status >= 500) {
				showToast.error(
					'Something went wrong on our end. Please try again.'
				);
				return;
			}

			// 4xx: the API message is safe and actionable
			showToast.error(apiError.message);
		},
		onSuccess: (_, courseId) => {
			queryClient.invalidateQueries({ queryKey: ['enrolled-courses'] });
			queryClient.invalidateQueries({ queryKey: ['course', courseId] });
			showToast.success('Enrolled successfully!');
		},
	});
}
```

---

## Worked Example: Handling Both Error Types

The following hook wraps a write operation (buying a creator key) and shows how to handle network errors, 4xx validation failures, and 5xx server errors in a single consistent flow.

```ts
// src/hooks/useCreatorKeys.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api.service';
import showToast from '@/utils/toast.util';
import { creatorKeysService } from '@/services/creatorKeys.service';

// --- Read ---
export function useCreatorKeys(creatorId: string) {
	return useQuery({
		queryKey: ['creator-keys', creatorId],
		queryFn: () => creatorKeysService.getKeys(creatorId),
		staleTime: 30_000,
	});
}

// --- Write ---
export function useBuyCreatorKey() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			creatorId,
			amount,
		}: {
			creatorId: string;
			amount: number;
		}) => creatorKeysService.buyKey(creatorId, amount),

		onError: error => {
			const apiError = error as ApiError;

			// No response received — user is likely offline
			if (apiError.status === 0) {
				showToast.error(
					'Network error. Check your connection and try again.'
				);
				return;
			}

			// Server-side failure — not actionable by the user
			if (apiError.status >= 500) {
				showToast.error(
					'The server ran into a problem. Please try again shortly.'
				);
				return;
			}

			// 422 Validation — show the first field error if available
			if (apiError.status === 422 && apiError.response?.errors?.length) {
				showToast.error(apiError.response.errors[0].message);
				return;
			}

			// All other 4xx — the API message is safe to surface
			showToast.error(apiError.message);
		},

		onSuccess: (_, { creatorId }) => {
			// Invalidate relevant queries so the UI reflects the purchase
			queryClient.invalidateQueries({
				queryKey: ['creator-keys', creatorId],
			});
			queryClient.invalidateQueries({ queryKey: ['user-holdings'] });
			showToast.success('Key purchased successfully!');
		},
	});
}
```

Usage in a component:

```tsx
import { ApiError } from '@/services/api.service';
import { useCreatorKeys, useBuyCreatorKey } from '@/hooks/useCreatorKeys';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

function CreatorKeysSection({ creatorId }: { creatorId: string }) {
	const { data: keys, isLoading, isError, error } = useCreatorKeys(creatorId);
	const { mutate: buyKey, isPending } = useBuyCreatorKey();

	if (isLoading) return <KeysSkeleton />;

	if (isError) {
		const apiError = error as ApiError;
		return (
			<div
				role="alert"
				className="rounded-xl border border-dashed p-8 text-center"
			>
				<p className="text-sm text-muted-foreground">
					{apiError.status >= 500
						? 'Unable to load keys right now. Please try again later.'
						: apiError.message}
				</p>
			</div>
		);
	}

	return (
		// SectionErrorBoundary catches any render-time throws inside KeysList
		<SectionErrorBoundary sectionName="creator keys">
			<KeysList
				keys={keys}
				onBuy={amount => buyKey({ creatorId, amount })}
				isBuying={isPending}
			/>
		</SectionErrorBoundary>
	);
}
```

---

## Quick Reference

| Condition           | Check                           | UI response                                                  |
| ------------------- | ------------------------------- | ------------------------------------------------------------ |
| No network response | `apiError.status === 0`         | Toast: "Network error. Check your connection."               |
| Server error        | `apiError.status >= 500`        | Toast: generic "something went wrong" message                |
| Validation failure  | `apiError.status === 422`       | Toast or inline: first item from `apiError.response?.errors` |
| Other 4xx           | `apiError.status >= 400`        | Toast or inline: `apiError.message` (safe from the API)      |
| Read query fails    | `isError === true` in component | Inline error state replacing the content area                |
| Render throws       | Component boundary              | Wrap with `<SectionErrorBoundary>`                           |
