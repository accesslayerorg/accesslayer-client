# LP Position Management (Portfolio → Liquidity)

The **Liquidity** tab on `/profile` (and `/profile/:wallet`, read-only) lets a
liquidity provider see their active LP positions and manage them (#1030).

## What it shows

- **Total LP earnings** card: unclaimed rewards + rewards already claimed from
  the active positions, plus a position count.
- One row per active position: pool / key name, contributed amount, pool
  share %, accrued (unclaimed) rewards, and lock status.
- Per-position actions, rendered only when the connected Stellar signer owns
  the positions: **Add liquidity**, **Claim rewards**, **Remove liquidity**.

## Where the data comes from

| Concern                  | Source                                                                                                                  | Code                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Positions, rewards, lock | `GET /lp/positions?wallet=` (accesslayer-server #980)                                                                   | `services/lpPositions.service.ts`    |
| Pool size, APR estimate  | `GET /lp/pool/:keyId` (accesslayer-server #980)                                                                         | `services/lpPositions.service.ts`    |
| Spendable XLM            | Account ledger entry over Soroban RPC (`VITE_STELLAR_RPC_URL`)                                                          | `services/stellarAccount.service.ts` |
| Add / claim / remove     | Creator Keys contract `add_liquidity` / `claim_lp_rewards` / `remove_liquidity` (accesslayer-contracts #1002, PR #1004) | `services/lpContract.service.ts`     |

Hooks live in `hooks/useLpPositions.ts`; pure math lives in
`utils/lpPositions.utils.ts`.

### Expected API shapes

The server endpoints are specified in accesslayer-server #980 but were not
merged when this UI was built. The client expects the following shape and
validates every field. Amounts are **stroops as integer strings** (i128 in
the contract); numbers are accepted only when they are safe integers.

```jsonc
// GET /lp/positions?wallet=G...  →  APIResponse<{ positions: [...] }> (a bare array also works)
{
	"lpId": "7", // contract lp_id (u64)
	"keyId": "C...", // contract key_id (Address)
	"keyName": "Alpha Key", // optional, falls back to a shortened keyId
	"creatorId": "alpha", // optional, enables the /creator/:id link
	"contribution": "250000000",
	"share": 2500, // optional, contract basis points
	"poolTotalLiquidity": "1000000000", // optional, preferred for an exact share
	"pendingRewards": "12345", // missing/invalid → shown as "Unavailable"
	"claimedRewards": "100", // optional, lifetime claimed from this position
	"unlocksAt": "2030-01-01T00:00:00Z", // optional; ISO, epoch s, or epoch ms
}

// GET /lp/pool/:keyId  →  APIResponse<{ keyId, totalLiquidity, aprBps }>
```

Records missing `lpId`, `keyId`, or a valid `contribution` are dropped, as are
closed positions (`contribution = 0`, which is how the contract reports them).

## Rules the UI follows

- **Precision.** All amounts are `bigint` stroops end to end and are rendered
  with 7 decimals via `formatXlm`, so tiny rewards never display as `0.00`.
- **Pool share** is `contribution / poolTotalLiquidity` in integer math,
  floored to 0.01%. A non-zero share under 0.01% reads `<0.01%`. If the pool
  total is missing, the contract's basis-point `share` is used instead.
- **Earnings total** de-duplicates by `lpId` and is withheld ("Unavailable")
  when any position's rewards can't be read, rather than showing a partial sum.
- **Add liquidity** validates format, > 0, ≤ 7 decimals, and ≤ spendable XLM
  (balance minus account reserve and selling liabilities). The mutation reads
  the balance again right before signing, so a balance that dropped after the
  modal opened is caught.
- **Reward rate preview** shows the API's APR estimate and the pool share the
  deposit would receive using the contract formula
  `amount / (total_liquidity + amount)`. No reward-rate formula is invented
  client-side; if the API has no APR the preview says "Unavailable".
- **Claim** simulates `claim_lp_rewards` first. If the contract would pay out
  zero, the wallet is never prompted.
- **Remove** is disabled while `unlocksAt` is in the future, with a live
  countdown (`2d 14h 32m`). An unparseable `unlocksAt` blocks removal. Before
  signing, the mutation refetches positions and re-checks the lock, and the
  contract simulation has the final say.
- **Confirmation.** Success toasts (with tx hash and Stellar Expert link)
  appear only after `getTransaction` reports `SUCCESS`. A transaction that
  lands but fails on-chain surfaces as an error.
- **Refresh.** After a confirmed transaction the hooks invalidate
  `queryKeys.lp.positions(wallet)`, `queryKeys.lp.pool(keyId)`, and
  `queryKeys.wallet.xlmBalance(wallet)`. Positions also refetch every 30s and
  when a lock countdown reaches zero.

## Known limitations

- **Lock period:** the LP reward contract in PR #1004 has no lock. `unlocksAt`
  is honoured if the API provides it. Without it, removal is allowed and the
  contract decides.
- **Asset:** the contract does not name the deposited token. The UI assumes
  XLM (stroops, 7 decimals) like every other amount in the app.
- **Entry point:** "Add liquidity" is offered per existing pool. Opening a
  first position in a new pool needs an entry point on the creator page,
  which is outside this tab's scope.
- **Base reserve** is fixed at 0.5 XLM (`BASE_RESERVE_STROOPS`), the current
  value on mainnet and testnet.

## Configuration

Requires `VITE_STELLAR_RPC_URL` and `VITE_CREATOR_KEYS_CONTRACT_ID` (see
`.env.example`). Without them, reads from the API still work but actions show
a clear "not configured" error.
