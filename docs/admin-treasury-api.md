# Admin treasury API contract

The treasury panel calls the authenticated backend API; this client repository does not contain the Soroban contract source or its ABI/spec, so it deliberately does not invent contract entrypoint names or simulate successful transactions. The backend must read the deployed contract/event index and execute/confirm the real distribution transaction.

All routes use the existing `BaseApiService` credentials and return the standard `{ success, data, message }` envelope.

| Method | Route                           | `data`                                                   |
| ------ | ------------------------------- | -------------------------------------------------------- |
| `GET`  | `/admin/treasury`               | `{ accumulatedFeesStroops: string, updatedAt?: string }` |
| `GET`  | `/admin/treasury/distributions` | `TreasuryDistribution[]`                                 |
| `GET`  | `/admin/treasury/fees`          | Recent `FeeCollected` records, newest first              |
| `POST` | `/admin/treasury/distributions` | Confirmed `{ epoch: number, transactionHash: string }`   |

Distribution request body:

```json
{
	"admin": "G...",
	"totalAmountStroops": "10000000",
	"recipients": [{ "address": "G...", "amountStroops": "10000000" }]
}
```

Every amount is a non-negative decimal integer in stroops (1 XLM = 10,000,000 stroops). The client validates the Stellar addresses, rejects duplicate recipients, and requires the allocation sum to equal the displayed treasury balance. The backend must independently authenticate/authorize the admin, re-read the contract balance, validate allocations, submit the contract call, wait for successful confirmation, and only then return the epoch and transaction hash. A response without those confirmation fields is treated as a failure.

Distribution records use `{ id, epoch, totalDistributedStroops, recipients: [{ address, amountStroops }], distributedAt, transactionHash }`. Fee event records use `{ id, creatorAddress, traderAddress, amountStroops, collectedAt, transactionHash }`.

## Protocol fee dashboard integration gap

The current client/API contract is not sufficient to implement the protocol fee dashboard (#1153) without inventing data sources or contract calls:

- `GET /admin/treasury` exposes one accumulated treasury amount only. It does not report separate accumulated and withdrawable amounts, LP-pool fees, or staking-pool fees.
- `POST /admin/treasury/distributions` distributes the treasury balance to admin-selected recipients. It is not a destination-specific withdrawal method, does not use the connected wallet's signer, and cannot safely substitute for treasury, LP-pool, or staking-pool withdrawals. The client has no corresponding contract spec or fee-withdrawal entrypoints to invoke directly.
- `GET /admin/treasury/fees` is documented as returning recent events, without a completeness or date-range guarantee. It cannot establish a complete 30-day daily history. Its event records contain creator and trader addresses, but no key identifier or cumulative per-key total, so they cannot provide the requested top fee-generating keys.

The existing frontend admin check is the configured `VITE_ADMIN_WALLETS` allowlist (`src/utils/adminAccess.ts`); it is a UI gate, not contract authorization. The treasury API documentation requires the backend to independently authorize admin requests. A dashboard must continue to treat that server/contract authorization as authoritative for any transaction.

Implementation requires a verified source of treasury, LP-pool, and staking-pool accumulated/withdrawable balances; destination-specific withdrawal contract methods or a documented connected-wallet signing/confirmation flow; a complete indexed fee-event query for a 30-day window with a defined timezone; and indexed per-key cumulative fee totals with stable key identifiers. Until those interfaces and their deployed contract specifications are available, the client must not display inferred balances or historical totals, or submit guessed withdrawal calls.
