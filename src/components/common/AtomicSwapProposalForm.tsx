import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { useWalletHoldings } from '@/hooks/useWallet';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';
import { useCreateAtomicSwapProposal } from '@/hooks/useAtomicSwap';
import type { Course } from '@/services/course.service';

interface AtomicSwapProposalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creators: Course[];
  walletAddress: string;
  isSubmitting?: boolean;
}

const MAX_EXPIRY_HOURS = 168; // 1 week

export const AtomicSwapProposalForm: React.FC<AtomicSwapProposalFormProps> = ({
  open,
  onOpenChange,
  creators,
  walletAddress,
  isSubmitting = false,
}) => {
  const { data: holdings = [] } = useWalletHoldings(walletAddress);
  const createProposalMutation = useCreateAtomicSwapProposal(walletAddress);

  const [offeredKeyId, setOfferedKeyId] = useState('');
  const [offeredAmount, setOfferedAmount] = useState('1');
  const [desiredKeyId, setDesiredKeyId] = useState('');
  const [desiredAmount, setDesiredAmount] = useState('1');
  const [expiryHours, setExpiryHours] = useState(24);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const offeredKey = useMemo(() => creators.find(c => c.id === offeredKeyId), [creators, offeredKeyId]);
  const desiredKey = useMemo(() => creators.find(c => c.id === desiredKeyId), [creators, desiredKeyId]);
  const offeredHolding = useMemo(
    () => holdings.find(h => h.creatorId === offeredKeyId)?.quantity ?? 0,
    [holdings, offeredKeyId]
  );

  const parsedOfferedAmount = useMemo(() => Number(offeredAmount), [offeredAmount]);
  const parsedDesiredAmount = useMemo(() => Number(desiredAmount), [desiredAmount]);

  const validationErrors = useMemo((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (touched.offeredKey && !offeredKeyId) errors.offeredKey = 'Please select a key to offer';
    if (touched.desiredKey && !desiredKeyId) errors.desiredKey = 'Please select a key you want';
    if (touched.offeredAmount && (!offeredAmount.trim() || !Number.isFinite(parsedOfferedAmount))) {
      errors.offeredAmount = 'Please enter a valid amount';
    }
    if (touched.desiredAmount && (!desiredAmount.trim() || !Number.isFinite(parsedDesiredAmount))) {
      errors.desiredAmount = 'Please enter a valid amount';
    }
    if (touched.offeredAmount && parsedOfferedAmount <= 0) errors.offeredAmount = 'Amount must be greater than zero';
    if (touched.desiredAmount && parsedDesiredAmount <= 0) errors.desiredAmount = 'Amount must be greater than zero';
    if (touched.offeredAmount && parsedOfferedAmount > offeredHolding) {
      errors.offeredAmount = `You only have ${formatNumber(offeredHolding)} ${offeredKey?.title ?? 'this key'}`;
    }
    if (touched.offeredKey && touched.desiredKey && offeredKeyId && desiredKeyId && offeredKeyId === desiredKeyId) {
      errors.desiredKey = 'Cannot swap the same key with itself';
    }
    if (touched.expiryHours && (!expiryHours || expiryHours < 1 || expiryHours > MAX_EXPIRY_HOURS)) {
      errors.expiryHours = `Expiry must be between 1 and ${MAX_EXPIRY_HOURS} hours`;
    }

    return errors;
  }, [touched, offeredKeyId, desiredKeyId, offeredAmount, desiredAmount, parsedOfferedAmount, parsedDesiredAmount, offeredHolding, offeredKey?.title, expiryHours]);

  const isFormValid = offeredKeyId && desiredKeyId && offeredAmount.trim() && desiredAmount.trim() &&
    Number.isFinite(parsedOfferedAmount) && Number.isFinite(parsedDesiredAmount) &&
    parsedOfferedAmount > 0 && parsedDesiredAmount > 0 &&
    parsedOfferedAmount <= offeredHolding &&
    offeredKeyId !== desiredKeyId &&
    expiryHours >= 1 && expiryHours <= MAX_EXPIRY_HOURS;

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    setTouched({
      offeredKey: true,
      desiredKey: true,
      offeredAmount: true,
      desiredAmount: true,
      expiryHours: true,
    });

    if (!isFormValid) return;

    const proposal = await createProposalMutation.mutateAsync({
      proposerAddress: walletAddress,
      offeredKeyId,
      offeredKeyName: offeredKey?.title ?? 'Unknown',
      offeredAmount: parsedOfferedAmount,
      desiredKeyId,
      desiredKeyName: desiredKey?.title ?? 'Unknown',
      desiredAmount: parsedDesiredAmount,
      expiryHours,
    });

    if (proposal) {
      const proposalUrl = `${window.location.origin}/swap/${proposal.id}`;
      setGeneratedLink(proposalUrl);
      setShowLinkDialog(true);
      setOfferedKeyId('');
      setOfferedAmount('1');
      setDesiredKeyId('');
      setDesiredAmount('1');
      setExpiryHours(24);
      setTouched({});
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyTextToClipboard(generatedLink);
      showToast.success('Link copied');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Clipboard API is unavailable')) {
        showToast.error('Could not copy');
      } else {
        showToast.error('Copy failed');
      }
    }
  };

  const handleCloseLinkDialog = () => {
    setShowLinkDialog(false);
    setGeneratedLink('');
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setOfferedKeyId('');
      setOfferedAmount('1');
      setDesiredKeyId('');
      setDesiredAmount('1');
      setExpiryHours(24);
      setTouched({});
      setGeneratedLink('');
      setShowLinkDialog(false);
    }
  }, [open]);

  const heldKeysWithQuantity = useMemo(() => {
    return creators.filter(creator =>
      holdings.some(h => h.creatorId === creator.id && (h.quantity ?? 0) > 0)
    );
  }, [creators, holdings]);

  return (
    <>
      <Dialog open={open} onOpenChange={next => !isSubmitting && !createProposalMutation.isPending && onOpenChange(next)}>
        <DialogContent className="max-w-lg" showCloseButton={!isSubmitting && !createProposalMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Create Atomic Swap Proposal</DialogTitle>
            <DialogDescription>
              Offer your creator keys in exchange for another creator's keys. The swap executes atomically —
              both sides transfer simultaneously or neither does.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Offered Side */}
            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <legend className="text-sm font-semibold text-amber-300/90">You offer</legend>
              <div className="space-y-3">
                <div>
                  <label htmlFor="offered-key" className="block text-xs font-medium text-white/70 mb-1.5">
                    Key to offer
                  </label>
                  <select
                    id="offered-key"
                    value={offeredKeyId}
                    onChange={e => setOfferedKeyId(e.target.value)}
                    onBlur={() => handleBlur('offeredKey')}
                    disabled={isSubmitting || createProposalMutation.isPending}
                    className={cn(
                      'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
                      validationErrors.offeredKey ? 'border-red-500/60' : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15'
                    )}
                    aria-invalid={!!validationErrors.offeredKey}
                    aria-describedby={validationErrors.offeredKey ? 'offered-key-error' : undefined}
                  >
                    <option value="">Select a key you own</option>
                    {heldKeysWithQuantity.map(creator => {
                      const holding = holdings.find(h => h.creatorId === creator.id);
                      return (
                        <option key={creator.id} value={creator.id}>
                          {creator.title} ({formatNumber(holding?.quantity ?? 0)} held)
                        </option>
                      );
                    })}
                  </select>
                  {validationErrors.offeredKey && (
                    <p id="offered-key-error" className="mt-1 text-xs text-red-300" role="alert">
                      {validationErrors.offeredKey}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="offered-amount" className="block text-xs font-medium text-white/70 mb-1.5">
                    Amount to offer
                  </label>
                  <input
                    id="offered-amount"
                    type="number"
                    min="1"
                    max={offeredHolding}
                    step="1"
                    inputMode="numeric"
                    value={offeredAmount}
                    onChange={e => setOfferedAmount(e.target.value)}
                    onBlur={() => handleBlur('offeredAmount')}
                    disabled={isSubmitting || createProposalMutation.isPending || !offeredKeyId}
                    className={cn(
                      'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
                      validationErrors.offeredAmount ? 'border-red-500/60' : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15'
                    )}
                    aria-invalid={!!validationErrors.offeredAmount}
                    aria-describedby={validationErrors.offeredAmount ? 'offered-amount-error' : undefined}
                    placeholder={offeredKeyId ? 'Enter amount' : 'Select a key first'}
                  />
                  {validationErrors.offeredAmount && (
                    <p id="offered-amount-error" className="mt-1 text-xs text-red-300" role="alert">
                      {validationErrors.offeredAmount}
                    </p>
                  )}
                  {offeredKeyId && (
                    <p className="mt-1 text-xs text-white/50">
                      Available: {formatNumber(offeredHolding)} {offeredKey?.title ?? 'keys'}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Desired Side */}
            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <legend className="text-sm font-semibold text-emerald-300/90">You want</legend>
              <div className="space-y-3">
                <div>
                  <label htmlFor="desired-key" className="block text-xs font-medium text-white/70 mb-1.5">
                    Key you want
                  </label>
                  <select
                    id="desired-key"
                    value={desiredKeyId}
                    onChange={e => setDesiredKeyId(e.target.value)}
                    onBlur={() => handleBlur('desiredKey')}
                    disabled={isSubmitting || createProposalMutation.isPending}
                    className={cn(
                      'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
                      validationErrors.desiredKey ? 'border-red-500/60' : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15'
                    )}
                    aria-invalid={!!validationErrors.desiredKey}
                    aria-describedby={validationErrors.desiredKey ? 'desired-key-error' : undefined}
                  >
                    <option value="">Select a key you want</option>
                    {creators
                      .filter(c => c.id !== offeredKeyId)
                      .map(creator => (
                        <option key={creator.id} value={creator.id}>
                          {creator.title} ({formatNumber(creator.creatorShareSupply ?? 0)} supply)
                        </option>
                      ))}
                  </select>
                  {validationErrors.desiredKey && (
                    <p id="desired-key-error" className="mt-1 text-xs text-red-300" role="alert">
                      {validationErrors.desiredKey}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="desired-amount" className="block text-xs font-medium text-white/70 mb-1.5">
                    Amount wanted
                  </label>
                  <input
                    id="desired-amount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={desiredAmount}
                    onChange={e => setDesiredAmount(e.target.value)}
                    onBlur={() => handleBlur('desiredAmount')}
                    disabled={isSubmitting || createProposalMutation.isPending || !desiredKeyId}
                    className={cn(
                      'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
                      validationErrors.desiredAmount ? 'border-red-500/60' : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15'
                    )}
                    aria-invalid={!!validationErrors.desiredAmount}
                    aria-describedby={validationErrors.desiredAmount ? 'desired-amount-error' : undefined}
                    placeholder={desiredKeyId ? 'Enter amount' : 'Select a key first'}
                  />
                  {validationErrors.desiredAmount && (
                    <p id="desired-amount-error" className="mt-1 text-xs text-red-300" role="alert">
                      {validationErrors.desiredAmount}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Expiry */}
            <div className="space-y-2">
              <label htmlFor="expiry-hours" className="block text-xs font-medium text-white/70 mb-1.5">
                Proposal expires in (hours)
              </label>
              <input
                id="expiry-hours"
                type="number"
                min="1"
                max={MAX_EXPIRY_HOURS}
                step="1"
                inputMode="numeric"
                value={expiryHours}
                onChange={e => setExpiryHours(Number(e.target.value) || 1)}
                onBlur={() => handleBlur('expiryHours')}
                disabled={isSubmitting || createProposalMutation.isPending}
                className={cn(
                  'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
                  validationErrors.expiryHours ? 'border-red-500/60' : 'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15'
                )}
                aria-invalid={!!validationErrors.expiryHours}
                aria-describedby={validationErrors.expiryHours ? 'expiry-hours-error' : undefined}
              />
              {validationErrors.expiryHours && (
                <p id="expiry-hours-error" className="mt-1 text-xs text-red-300" role="alert">
                  {validationErrors.expiryHours}
                </p>
              )}
              <p className="text-xs text-white/50">
                After expiry, the proposal can no longer be accepted. Max {MAX_EXPIRY_HOURS} hours (7 days).
              </p>
            </div>

            {/* Summary Preview */}
            {offeredKey && desiredKey && offeredAmount && desiredAmount && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Proposal summary</p>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex-1 text-center p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
                    <p className="font-semibold text-amber-300">{offeredKey.title}</p>
                    <p className="font-mono text-white/90">{formatNumber(parsedOfferedAmount)} keys</p>
                  </div>
                  <span className="text-white/40 shrink-0" aria-hidden="true">↔</span>
                  <div className="flex-1 text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="font-semibold text-emerald-400">{desiredKey.title}</p>
                    <p className="font-mono text-white/90">{formatNumber(parsedDesiredAmount)} keys</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/50 text-center">
                  Expires in {expiryHours} hour{expiryHours !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || createProposalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting || createProposalMutation.isPending}
              aria-busy={createProposalMutation.isPending || undefined}
            >
              <StableButtonContent
                isLoading={createProposalMutation.isPending}
                loadingLabel="Creating…"
              >
                Create Proposal
              </StableButtonContent>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Proposal Created</DialogTitle>
            <DialogDescription>
              Share this link with your counterparty. They can review and accept the swap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="block text-xs font-medium text-white/70 mb-2">Shareable link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none font-mono text-sm truncate"
                  aria-label="Proposal share link"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-xl"
                  aria-label="Copy link to clipboard"
                >
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/50 text-center">
              This proposal expires in {expiryHours} hour{expiryHours !== 1 ? 's' : ''}.
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(generatedLink).catch(() => {});
                handleCopyLink();
              }}
            >
              Copy Again
            </Button>
            <Button type="button" onClick={handleCloseLinkDialog}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AtomicSwapProposalForm;