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
