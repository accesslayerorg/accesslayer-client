# Curve Migration Panel

Creator-only management surface for the bonding-curve migrations queued against
a creator key. It lives in the **Governance** tab of the creator dashboard
(`src/pages/CreatorDashboardPage.tsx`).

- Component: `CurveMigrationPanel`
- File: `src/components/common/CurveMigrationPanel.tsx`
- Hook: `useCurveMigrations` — `src/hooks/useCurveMigrations.ts`
- Service: `curveMigrationService` — `src/services/curveMigration.service.ts`
- Types: `src/types/curveMigration.ts`
- Pure helpers: `src/utils/curveMigration.utils.ts`
- Execute mutation: `useExecuteCurveMigrationMutation` —
  `src/hooks/useCreatorContractActions.ts`

## Why

A curve migration changes the price every holder buys and sells at, so it is
governed rather than applied directly. Two **independent** gates must both be
satisfied before the creator can execute one:

1. **Vote approval** — quorum reached _and_ more weight `for` than `against`.
2. **Timelock elapsed** — the post-vote delay has passed, giving holders a
   window to exit before the new pricing goes live.

Either gate being unmet keeps Execute disabled, and the panel shows which one is
still blocking.

## What the panel renders

| Region          | Test id                              | Contents                                                                                                                |
| --------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Pending list    | `curve-migration-pending-section`    | One card per `pending` migration, soonest timelock first                                                                |
| Proposed params | `curve-migration-params-{id}`        | `from → to` diff of base price, growth factor, and graduated curve tiers; unchanged params carry `data-changed="false"` |
| Timelock        | `curve-migration-timelock-{id}`      | Live `HH:MM:SS` countdown, or `Ready` once elapsed                                                                      |
| Vote approval   | `curve-migration-vote-approval-{id}` | Share of cast weight that voted `for`                                                                                   |
| Vote status     | `curve-migration-vote-status-{id}`   | `Approved` / `Not approved`, with quorum and participation below                                                        |
| Execute         | `curve-migration-execute-{id}`       | Enabled only when both gates pass                                                                                       |
| History         | `curve-migration-history-section`    | Executed migrations with applied params and execution date                                                              |

The countdown only re-renders while a timelock is actually running.

## Visibility

`CreatorDashboardPage` gates the section on `isKeyCreator` — the connected
wallet must match the key's `instructorId`. For non-creators the section is not
rendered at all **and** the `useCurveMigrations` query stays disabled, so no
migration data is fetched for wallets that cannot act on it.

## Execute call

Executing submits `execute_curve_migration`, built by the pure
`buildCurveMigrationExecuteCall` helper so the exact call is assertable without
signing anything:

```ts
buildCurveMigrationExecuteCall({ creatorId, migrationId });
// { functionName: 'execute_curve_migration', args: { creatorId, migrationId } }
```

On success both cache layers are invalidated together — the 15s
`curve_migrations_{keyId}` entry and the
`queryKeys.creators.curveMigrations(creatorId)` query — so the migration moves
from the pending list into the history with the params it actually applied.

## Local validation

```bash
pnpm test src/utils/__tests__/curveMigration.utils.test.ts
pnpm test src/services/__tests__/curveMigration.service.test.ts
pnpm test src/hooks/__tests__/useCurveMigrations.test.tsx
pnpm test src/hooks/__tests__/useCreatorContractActions.curveMigration.test.tsx
pnpm test src/components/common/__tests__/CurveMigrationPanel.test.tsx
pnpm test src/pages/__tests__/CreatorDashboardPage.curveMigration.integration.test.tsx
```
