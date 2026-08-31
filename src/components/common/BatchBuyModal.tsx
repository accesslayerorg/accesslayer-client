import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useFormatXlm } from '@/hooks/useFormatXlm';
import showToast from '@/utils/toast.util';
import { useBatchBuyMutation, type BatchOrder } from '@/hooks/useWallet';

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

export default function BatchBuyModal({
  open,
  onOpenChange,
  liquidBalance = DEFAULT_LIQUID_BALANCE,
  initialRows = [],
}: Props) {
  const [rows, setRows] = useState<BatchOrderRow[]>(initialRows);
  const [addInput, setAddInput] = useState('');
  const { format } = useFormatXlm();
  const mutation = useBatchBuyMutation();

  const totalQuantity = useMemo(
    () => rows.reduce((total, row) => total + row.quantity, 0),
    [rows]
  );
  const totalStroops = useMemo(
    () => rows.reduce((total, row) => total + (row.priceStroops ?? 0) * row.quantity, 0),
    [rows]
  );
  const invalidAddress = rows.some(row => !STELLAR_ADDRESS_PATTERN.test(row.address));
  const balanceExceeded = totalQuantity > liquidBalance;
  const validationError = invalidAddress
    ? 'Enter valid Stellar addresses for every recipient.'
    : balanceExceeded
      ? `Total quantity cannot exceed your liquid balance of ${liquidBalance} keys.`
      : undefined;
  const canSubmit = rows.length > 0 && !validationError;

  const handleAdd = () => {
    const address = addInput.trim();
    if (!address) return;
    if (rows.length >= MAX_KEYS) {
      showToast.error(`Maximum ${MAX_KEYS} keys per batch`);
      return;
    }

    setRows(rows => [
      ...rows,
      { address, creatorId: address, priceStroops: 10_000_000, quantity: 1 },
    ]);
    setAddInput('');
  };

  const handleRemove = (idx: number) => {
    setRows(rows => rows.filter((_, i) => i !== idx));
  };

  const handleQuantityChange = (idx: number, quantity: number) => {
    setRows(rows =>
      rows.map((row, i) => (i === idx ? { ...row, quantity: Math.max(1, quantity) } : row))
    );
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
              {rows.map((row, idx) => (
                <div key={`${row.address}-${idx}`} className="flex items-center gap-2">
                  <div className="w-40 truncate text-sm">{row.address}</div>
                  <div className="w-28 text-sm">{format(row.priceStroops ?? 0)}</div>
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    aria-label={`Quantity for ${row.address}`}
                    onChange={e => handleQuantityChange(idx, Number(e.target.value || 1))}
                    className="w-24 rounded-xl bg-white/[0.04] px-2 py-1 text-white"
                  />
                  <div className="flex-1 text-sm text-white/60">
                    Subtotal: {format((row.priceStroops ?? 0) * row.quantity)} XLM
                  </div>
                  <Button variant="ghost" onClick={() => handleRemove(idx)}>Remove</Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="text-sm text-white/60">
              Total: {totalQuantity} / {liquidBalance} keys
            </div>
            <div className="font-bold text-white">{format(totalStroops)} XLM</div>
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
            <Button onClick={handleConfirm} disabled={!canSubmit}>Confirm</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
