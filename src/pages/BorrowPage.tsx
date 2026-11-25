import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Landmark } from 'lucide-react';
import HealthFactorGauge from '@/components/common/HealthFactorGauge';
import OracleHealthBadge from '@/components/common/OracleHealthBadge';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useVaultAction, useVaultPosition } from '@/hooks/useVaultPosition';
import { useOracleStatus } from '@/hooks/useOracleStatus';
import { getHealthBand, previewHealthFactor } from '@/utils/vaultHealth.utils';

function ActionForm({
  title,
  label,
  amount,
  setAmount,
  preview,
  canSubmit,
  onSubmit,
  pending,
  explanation,
}: {
  title: string;
  label: string;
  amount: string;
  setAmount: (value: string) => void;
  preview: number;
  canSubmit: boolean;
  onSubmit: () => void;
  pending: boolean;
  explanation?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <label className="block text-sm text-muted-foreground" htmlFor={`borrow-${title}`}>{label}</label>
      <div className="mt-2 flex rounded-lg border border-border bg-background">
        <input
          id={`borrow-${title}`}
          data-testid={`borrow-${title.toLowerCase().replaceAll(' ', '-')}-input`}
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none"
          placeholder="0.00"
        />
        <span className="px-3 py-2.5 text-sm text-muted-foreground">XLM</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Preview health</span>
        <strong data-testid={`borrow-${title.toLowerCase().replaceAll(' ', '-')}-preview`}>{preview.toFixed(2)}</strong>
      </div>
      {explanation && <p className="mt-2 text-sm text-red-600" role="alert">{explanation}</p>}
      <button
        type="button"
        disabled={!canSubmit || pending || preview < 1}
        onClick={onSubmit}
        className="mt-4 w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Submitting…' : title}
      </button>
    </section>
  );
}

export default function BorrowPage() {
  const { address, isConnected, loading } = useStellarWallet();
  const positionQuery = useVaultPosition(address ?? '');
  const actionMutation = useVaultAction(address ?? '');
  const oracle = useOracleStatus('XLM');
  const position = positionQuery.data;
  const collateral = position?.collateralValueXlm ?? position?.collateral ?? 0;
  const debt = position?.debt ?? 0;
  const interest = position?.interest ?? 0;

  const [deposit, setDeposit] = useState('');
  const [withdraw, setWithdraw] = useState('');
  const [borrow, setBorrow] = useState('');
  const [repay, setRepay] = useState('');

  const parsed = (value: string) => Math.max(0, Number(value) || 0);
  const depositPreview = previewHealthFactor(collateral, debt, interest, parsed(deposit), 0);
  const withdrawPreview = previewHealthFactor(collateral, debt, interest, -parsed(withdraw), 0);
  const borrowPreview = previewHealthFactor(collateral, debt, interest, 0, parsed(borrow));
  const repayPreview = previewHealthFactor(collateral, debt, interest, 0, -parsed(repay));
  const submit = (action: 'deposit' | 'withdraw' | 'borrow' | 'repay', amount: number) => {
    if (!address || amount <= 0 || oracle.isStale) return;
    actionMutation.mutate({ address, action, amount });
  };

  const healthFactor = position?.healthFactor ?? 999;

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Landmark className="size-5" /></div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lending vault</p>
            <h1 className="text-2xl font-bold">Borrow XLM</h1>
          </div>
        </div>
        <OracleHealthBadge asset="XLM" />
      </div>

      {oracle.isFallback && (
        <div
          data-testid="oracle-fallback-banner"
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-500" />
          <div>
            <strong>Oracle Fallback Active</strong>
            <p className="text-sm">
              The lending vault price oracle is currently using its fallback source ({oracle.sourceName}). Borrow and liquidation calculations are using fallback rates.
            </p>
          </div>
        </div>
      )}

      {oracle.isStale && (
        <div
          data-testid="oracle-stale-banner"
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300"
        >
          <AlertTriangle className="size-5 shrink-0 text-red-500" />
          <div>
            <strong>Oracle Price Stale</strong>
            <p className="text-sm">
              {oracle.staleReason || 'Price feed is stale. All borrowing and collateral actions are temporarily disabled.'}
            </p>
          </div>
        </div>
      )}

      {healthFactor < 1.3 && position && (
        <div role="alert" className="mb-5 flex items-start justify-between rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:bg-red-950/30">
          <div className="flex gap-3"><AlertTriangle className="size-5 shrink-0" /><div><strong>Position at risk</strong><p className="text-sm">Your health factor is below 1.3. Repay debt or add collateral to avoid liquidation.</p></div></div>
          <Link to="/notifications" className="ml-4 shrink-0 text-sm font-semibold underline">View notifications</Link>
        </div>
      )}

      {!loading && !isConnected && (
        <div className="mb-5 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Connect a wallet to view and manage your borrowing position.</div>
      )}

      {positionQuery.isLoading && <p className="mb-5 text-sm text-muted-foreground">Loading vault position…</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5 sm:grid-cols-2">
          <ActionForm
            title="Deposit collateral"
            label="Deposit amount"
            amount={deposit}
            setAmount={setDeposit}
            preview={depositPreview}
            canSubmit={parsed(deposit) > 0 && !oracle.isStale}
            onSubmit={() => submit('deposit', parsed(deposit))}
            pending={actionMutation.isPending}
            explanation={oracle.isStale ? 'Action disabled: Oracle price is stale.' : undefined}
          />
          <ActionForm
            title="Withdraw collateral"
            label="Withdraw amount"
            amount={withdraw}
            setAmount={setWithdraw}
            preview={withdrawPreview}
            canSubmit={parsed(withdraw) > 0 && parsed(withdraw) <= collateral && !oracle.isStale}
            onSubmit={() => submit('withdraw', parsed(withdraw))}
            pending={actionMutation.isPending}
            explanation={oracle.isStale ? 'Action disabled: Oracle price is stale.' : withdrawPreview < 1 ? 'This withdrawal would make your position unhealthy. Health must remain at or above 1.' : undefined}
          />
          <ActionForm
            title="Borrow XLM"
            label="Borrow amount"
            amount={borrow}
            setAmount={setBorrow}
            preview={borrowPreview}
            canSubmit={parsed(borrow) > 0 && !oracle.isStale}
            onSubmit={() => submit('borrow', parsed(borrow))}
            pending={actionMutation.isPending}
            explanation={oracle.isStale ? 'Action disabled: Oracle price is stale.' : borrowPreview < 1 ? 'This borrow would make your position unhealthy. Health must remain at or above 1.' : undefined}
          />
          <ActionForm
            title="Repay debt"
            label="Repay amount"
            amount={repay}
            setAmount={setRepay}
            preview={repayPreview}
            canSubmit={parsed(repay) > 0 && parsed(repay) <= debt && !oracle.isStale}
            onSubmit={() => submit('repay', parsed(repay))}
            pending={actionMutation.isPending}
            explanation={oracle.isStale ? 'Action disabled: Oracle price is stale.' : undefined}
          />
        </div>

        <div className="space-y-5">
          <HealthFactorGauge healthFactor={healthFactor} liquidationPrice={position?.liquidationPrice} />
          <section className="rounded-xl border border-border bg-card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Position</h2>
            <div className="space-y-2"><div className="flex justify-between"><span className="text-muted-foreground">Collateral</span><strong>{collateral.toFixed(2)} XLM</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Debt</span><strong>{debt.toFixed(2)} XLM</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Interest</span><strong>{interest.toFixed(2)} XLM</strong></div></div>
            <p className="mt-3 text-xs text-muted-foreground">Band: {getHealthBand(healthFactor)}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
