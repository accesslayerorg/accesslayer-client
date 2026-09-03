import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useFormatXlm } from '@/hooks/useFormatXlm';
import showToast from '@/utils/toast.util';
import { useBatchBuyMutation, type BatchOrder } from '@/hooks/useWallet';
import { courseService } from '@/services/course.service';

export interface BatchOrderRow {
  address: string;
  creatorId?: string;
  priceStroops?: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidBalance?: number;
  initialRows?: BatchOrderRow[];
}

const MAX_KEYS = 5;
const DEFAULT_LIQUID_BALANCE = 100;
const STELLAR_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;

interface RowSimulation {
  perKeyPriceStroops?: number;
  totalStroops?: number;
  loading: boolean;
  error?: string;
}

function resolveSimulatedValue(result: Record<string, number | undefined>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (result[k] != null) return result[k];
  }
  return undefined;
}

export default function BatchBuyModal({
  open,
  onOpenChange,
  liquidBalance = DEFAULT_LIQUID_BALANCE,
  initialRows = [],
}: Props) {
  const [rows, setRows] = useState<BatchOrderRow[]>(initialRows);
  const [addInput, setAddInput] = useState('');
  const [simulations, setSimulations] = useState<RowSimulation[]>(() =>
    initialRows.map(() => ({ loading: false }))
  );
  const { format } = useFormatXlm();
  const mutation = useBatchBuyMutation();
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const totalQuantity = useMemo(
    () => rows.reduce((total, row) => total + row.quantity, 0),
    [rows]
  );

  // Total from simulations if available, else fallback to static price*quantity
  const totalStroops = useMemo(() => {
    return rows.reduce((total, row, idx) => {
      const sim = simulations[idx];
      if (sim?.totalStroops != null) return total + sim.totalStroops;
      return total + (row.priceStroops ?? 0) * row.quantity;
    }, 0);
  }, [rows, simulations]);

  const anySimulationPending = simulations.some(s => s.loading);

  const invalidAddress = rows.some(row => !STELLAR_ADDRESS_PATTERN.test(row.address));
  const balanceExceeded = totalQuantity > liquidBalance;
  const validationError = invalidAddress
    ? 'Enter valid Stellar addresses for every recipient.'
    : balanceExceeded
      ? `Total quantity cannot exceed your liquid balance of ${liquidBalance} keys.`
      : undefined;
  const canSubmit = rows.length > 0 && !validationError && !anySimulationPending;

  const fetchSimulation = useCallback(async (idx: number, keyId: string, quantity: number) => {
    setSimulations(prev => {
      const next = [...prev];
      next[idx] = { ...(next[idx] ?? { loading: false }), loading: true, error: undefined };
      return next;
    });
    try {
      const result = await courseService.simulateBuy(keyId, quantity);
      const perKey =
        resolveSimulatedValue(result as Record<string, number>, [
          'perKeyPriceStroops',
          'per_key_price_stroops',
          'perKeyPrice',
          'per_key_price',
          'pricePerKeyStroops',
          'price_per_key_stroops',
          'pricePerKey',
          'price_per_key',
          'priceStroops',
          'price_stroops',
          'price',
        ]) ??
        resolveSimulatedValue(result as Record<string, number>, [
          'simulated_price',
          'simulatedPrice',
        ]);
      const total =
        resolveSimulatedValue(result as Record<string, number>, [
          'totalStroops',
          'total_stroops',
          'totalCostStroops',
          'total_cost_stroops',
          'totalCost',
          'total_cost',
          'total',
          'subtotal',
          'subtotalStroops',
          'subtotal_stroops',
        ]) ?? (perKey != null ? perKey * quantity : undefined);

      setSimulations(prev => {
        const next = [...prev];
        next[idx] = {
          perKeyPriceStroops: perKey ?? prev[idx]?.perKeyPriceStroops,
          totalStroops: total ?? prev[idx]?.totalStroops,
          loading: false,
        };
        return next;
      });
    } catch {
      setSimulations(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], loading: false, error: 'Unable to simulate price' };
        return next;
      });
    }
  }, []);

  const scheduleSimulation = useCallback(
    (idx: number, keyId: string, quantity: number) => {
      const existing = debounceTimers.current.get(idx);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        fetchSimulation(idx, keyId, quantity);
        debounceTimers.current.delete(idx);
      }, 300);
      debounceTimers.current.set(idx, timer);
    },
    [fetchSimulation]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleAdd = () => {
    const address = addInput.trim();
    if (!address) return;
    if (rows.length >= MAX_KEYS) {
      showToast.error(`Maximum ${MAX_KEYS} keys per batch`);
      return;
    }

    const newRow: BatchOrderRow = { address, creatorId: address, priceStroops: 10_000_000, quantity: 1 };
    const newIdx = rows.length;
    setRows(prev => [...prev, newRow]);
    setSimulations(prev => [...prev, { loading: false }]);
    // Trigger simulation for the new row
    scheduleSimulation(newIdx, newRow.creatorId ?? newRow.address, newRow.quantity);
    setAddInput('');
  };

  const handleRemove = (idx: number) => {
    // Clear any pending timer for this index and shift subsequent timers
    const timer = debounceTimers.current.get(idx);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.current.delete(idx);
    }
    setRows(rows => rows.filter((_, i) => i !== idx));
    setSimulations(prev => prev.filter((_, i) => i !== idx));
    // Re-map remaining timers indices: best to clear all and reschedule for remaining rows
    debounceTimers.current.forEach(t => clearTimeout(t));
    debounceTimers.current.clear();
  };

  const handleQuantityChange = (idx: number, quantity: number) => {
    const nextQty = Math.max(1, quantity);
    setRows(rows =>
      rows.map((row, i) => (i === idx ? { ...row, quantity: nextQty } : row))
    );
    const row = rows[idx];
    const keyId = row?.creatorId ?? row?.address;
    if (keyId) scheduleSimulation(idx, keyId, nextQty);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    try {
      showToast.loading('Submitting batch buy...');
      const orders: BatchOrder[] = rows.map(({ address, quantity }) => ({ address, quantity }));
      await mutation.mutateAsync({ orders });
      showToast.transactionSuccess('Batch buy submitted');
      onOpenChange(false);
      setRows([]);
      setSimulations([]);
    } catch {
      showToast.error('Batch buy failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Buy Keys</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={addInput}
              onChange={e => setAddInput(e.target.value)}
              placeholder="Enter Stellar recipient address"
              aria-label="Recipient address"
              className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-white"
            />
            <Button onClick={handleAdd}>Add</Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-white/60">No keys added</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row, idx) => {
                const sim = simulations[idx];
                const perKeyStroops = sim?.totalStroops != null && sim?.perKeyPriceStroops == null
                  ? Math.round(sim.totalStroops / row.quantity)
                  : (sim?.perKeyPriceStroops ?? row.priceStroops ?? 0);
                const subtotalStroops = sim?.totalStroops ?? (row.priceStroops ?? 0) * row.quantity;
                return (
                  <div key={`${row.address}-${idx}`} className="flex items-center gap-2">
                    <div className="w-40 truncate text-sm">{row.address}</div>
                    <div className="w-28 text-sm" data-testid={`per-key-price-${idx}`}>
                      {sim?.loading ? (
                        <span
                          data-testid={`simulation-spinner-${idx}`}
                          aria-label="Loading simulation"
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60"
                        />
                      ) : (
                        format(perKeyStroops)
                      )}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      aria-label={`Quantity for ${row.address}`}
                      onChange={e => handleQuantityChange(idx, Number(e.target.value || 1))}
                      className="w-24 rounded-xl bg-white/[0.04] px-2 py-1 text-white"
                    />
                    <div
                      className="flex flex-1 items-center gap-2 text-sm text-white/60"
                      data-testid={`row-subtotal-${idx}`}
                    >
                      {sim?.loading && (
                        <span
                          data-testid={`simulation-spinner-${idx}-subtotal`}
                          aria-label="Loading simulation"
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60"
                        />
                      )}
                      <span>Subtotal: {format(subtotalStroops)} XLM</span>
                    </div>
                    {sim?.loading && (
                      <span
                        data-testid={`simulation-spinner-${idx}-row`}
                        aria-label="Loading simulation"
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60"
                      />
                    )}
                    <Button variant="ghost" onClick={() => handleRemove(idx)}>Remove</Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="text-sm text-white/60">
              Total: {totalQuantity} / {liquidBalance} keys
            </div>
            <div className="font-bold text-white" data-testid="batch-total">{format(totalStroops)} XLM</div>
          </div>
          {validationError && (
            <p role="alert" data-testid="batch-buy-validation-error" className="text-sm text-red-400">
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canSubmit} data-testid="batch-buy-confirm">Confirm</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
