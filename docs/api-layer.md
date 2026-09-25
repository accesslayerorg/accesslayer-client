# Client API Layer Conventions

This document explains how the client's API layer is structured, how errors are handled, and how to add a new server call end-to-end.

---

## Folder structure

All API service files live in `src/services/`:

```
src/services/
├── api.service.ts      # Base class — all services extend this
├── auth.service.ts     # Authentication endpoints
└── course.service.ts   # Creator / course data endpoints
```

Each file exports a **singleton instance** of its service class.

---

## File and class naming convention

| What               | Convention            | Example             |
| ------------------ | --------------------- | ------------------- |
| File name          | `<domain>.service.ts` | `wallet.service.ts` |
| Class name         | `<Domain>Service`     | `WalletService`     |
| Exported singleton | `<domain>Service`     | `walletService`     |

Every service class **extends `BaseApiService`** from `api.service.ts`, which provides:

- A pre-configured Axios instance (`this.api`) pointing at `VITE_BACKEND_URL`
- Automatic token refresh on `401 TOKEN_EXPIRED` responses
- A shared `handleError(error)` method that normalises any thrown value to `ApiError`

---

## Error handling

Every service method wraps its Axios call in a `try/catch` and re-throws via `this.handleError`:

```ts
async getWalletHoldings(address: string): Promise<Holding[]> {
  try {
    const response = await this.api.get<APIResponse<Holding[]>>(
      `/wallets/${address}/holdings`
    );
    return response.data.data;
  } catch (error) {
    throw this.handleError(error);
  }
}
```

`handleError` always returns an `ApiError` instance with:

| Field      | Type                            | Description                                |
| ---------- | ------------------------------- | ------------------------------------------ |
| `message`  | `string`                        | Human-readable error message               |
| `status`   | `number`                        | HTTP status code; `0` for network failures |
| `response` | `APIErrorResponse \| undefined` | Full server error payload when available   |

Callers can check `error instanceof ApiError` and inspect `error.status` for branching logic.

---

## How to add a new endpoint

### 1. Add the method to the relevant service file

Open `src/services/<domain>.service.ts` (or create a new one if the domain is new). Add a method that:

1. Calls `this.api.get/post/patch/delete`
2. Extracts `response.data.data`
3. Re-throws any error via `this.handleError`

```ts
// src/services/wallet.service.ts
import { BaseApiService, type APIResponse } from './api.service';

export interface Holding {
	creatorId: string;
	quantity: number;
	priceStroops: number;
}

class WalletService extends BaseApiService {
	async getHoldings(address: string): Promise<Holding[]> {
		try {
			const response = await this.api.get<APIResponse<Holding[]>>(
				`/wallets/${address}/holdings`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const walletService = new WalletService();
```

### 2. Define a query key in `src/lib/queryKeys.ts`

Add an entry for the new endpoint so all hooks that reference the same data use an identical cache key:

```ts
// src/lib/queryKeys.ts
wallet: {
  holdings: (address: string) => ['wallet', address, 'holdings'] as const,
  // ...
},
```

### 3. Write a React Query hook

`QueryClientProvider` is already wired up in `src/providers/Web3Provider.tsx` — no setup changes needed.

```ts
// src/hooks/useWalletHoldings.ts
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import { queryKeys } from '@/lib/queryKeys';

export function useWalletHoldings(address: string | undefined) {
	return useQuery({
		queryKey: queryKeys.wallet.holdings(address ?? ''),
		queryFn: () => walletService.getHoldings(address!),
		enabled: Boolean(address),
	});
}
```

### 4. Consume the hook in a component

```tsx
import { useWalletHoldings } from '@/hooks/useWalletHoldings';

function HoldingsList({ address }: { address: string }) {
	const { data: holdings, isLoading, error } = useWalletHoldings(address);

	if (isLoading) return <p>Loading…</p>;
	if (error) return <p>Failed to load holdings.</p>;

	return (
		<ul>
			{holdings?.map(h => (
				<li key={h.creatorId}>
					{h.creatorId} — {h.quantity} keys
				</li>
			))}
		</ul>
	);
}
```

---

## Worked example — full GET call

The following shows a complete end-to-end flow for a `GET /wallets/:address/holdings` endpoint.

### Service method

```ts
// src/services/wallet.service.ts
import { BaseApiService, type APIResponse } from './api.service';

export interface Holding {
	creatorId: string;
	quantity: number;
	priceStroops: number;
}

class WalletService extends BaseApiService {
	async getHoldings(address: string): Promise<Holding[]> {
		try {
			const response = await this.api.get<APIResponse<Holding[]>>(
				`/wallets/${address}/holdings`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const walletService = new WalletService();
```

### Query key

```ts
// src/lib/queryKeys.ts (existing file — add the entry)
wallet: {
  holdings: (address: string) => ['wallet', address, 'holdings'] as const,
},
```

### Hook

```ts
// src/hooks/useWalletHoldings.ts
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import { queryKeys } from '@/lib/queryKeys';

export function useWalletHoldings(address: string | undefined) {
	return useQuery({
		queryKey: queryKeys.wallet.holdings(address ?? ''),
		queryFn: () => walletService.getHoldings(address!),
		enabled: Boolean(address),
	});
}
```

### Component

```tsx
// Usage in any component
import { useAccount } from 'wagmi';
import { useWalletHoldings } from '@/hooks/useWalletHoldings';

function HoldingsSummary() {
	const { address } = useAccount();
	const { data: holdings, isLoading, error } = useWalletHoldings(address);

	if (isLoading) return <p>Loading…</p>;
	if (error) return <p>Could not load holdings.</p>;
	if (!holdings?.length) return <p>No holdings yet.</p>;

	return (
		<ul>
			{holdings.map(h => (
				<li key={h.creatorId}>
					{h.creatorId} — {h.quantity} keys at {h.priceStroops} stroops
				</li>
			))}
		</ul>
	);
}
```

---

## Key files at a glance

| File                             | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `src/services/api.service.ts`    | `BaseApiService`, `ApiError`, `APIResponse` types |
| `src/services/auth.service.ts`   | Auth endpoints (login, register, profile)         |
| `src/services/course.service.ts` | Creator / course endpoints                        |
| `src/lib/queryKeys.ts`           | Centralised React Query key constants             |
| `src/providers/Web3Provider.tsx` | `QueryClientProvider` setup                       |
