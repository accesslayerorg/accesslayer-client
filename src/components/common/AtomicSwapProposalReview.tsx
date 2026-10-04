import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router';
import { useAccount } from 'wagmi';
import { useAtomicSwapProposal, useAcceptAtomicSwapProposal } from '@/hooks/useAtomicSwap';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';
import { formatRelativeTime } from '@/utils/time.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { isProposalExpired, canAcceptProposal } from '@/types/atomicSwap';
import { cn } from '@/lib/utils';

export const AtomicSwapProposalReview: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const { address: connectedAddress } = useAccount();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: proposal, isLoading, isError } = useAtomicSwapProposal(proposalId ?? '');
  const acceptMutation = useAcceptAtomicSwapProposal(connectedAddress ?? '');

  const handleAccept = async () => {
    if (!proposal || !connectedAddress) return;
    if (!canAcceptProposal(proposal, connectedAddress)) {
      showToast.error('Cannot accept');
      return;
    }
    await acceptMutation.mutateAsync({ proposalId: proposal.id, counterpartyAddress: connectedAddress });
  };

  const handleCopyLink = async () => {
    if (!proposal) return;
    try {
      await copyTextToClipboard(window.location.href);
      setCopied(true);
      showToast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Clipboard API is unavailable')) {
        showToast.error('Could not copy');
      } else {
        showToast.error('Copy failed');
      }
    }
  };

  const isProposer = connectedAddress && proposal?.proposerAddress === connectedAddress;
  const isCounterparty = connectedAddress && proposal?.counterpartyAddress === connectedAddress;
  const isExpired = proposal ? isProposalExpired(proposal) : false;
  const isExecuted = proposal?.status === 'executed';
  const isAccepted = proposal?.status === 'accepted';
  const isPending = proposal?.status === 'pending';
  const canAct = isPending && !isExpired && !isProposer && connectedAddress && canAcceptProposal(proposal, connectedAddress);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <svg className="size-8 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle className="opacity-25" cx="12" cy="12" r="10" />
          <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        <p className="text-white/60">Loading proposal…</p>
      </div>
    );
  }

  if (isError || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <AlertCircle className="size-12 text-red-400" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Proposal not found</h2>
        <p className="text-white/60 max-w-md">
          This proposal doesn't exist or has been removed. It may have expired or been cancelled.
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>Back to marketplace</Button>
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Pending' },
    accepted: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Accepted' },
    executed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Executed' },
    expired: { icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Expired' },
    cancelled: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Cancelled' },
  } as const;

  const status = statusConfig[proposal.status];

  return (
    <section className="space-y-6" aria-labelledby="proposal-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="proposal-title" className="text-2xl font-bold text-white">Atomic Swap Proposal</h1>
          <p className="text-white/60">Review the exchange details below</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', status.bg, status.color)}>
            <status.icon className="size-4" aria-hidden="true" />
            {status.label}
          </span>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="rounded-xl">
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      </div>

      {/* Exchange Details */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* You Receive */}
          <div className={cn('relative rounded-xl p-5 border-2', 'border-emerald-500/30 bg-emerald-500/5')}>
            <div className="absolute -top-3 left-4 px-2 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-wide">
              You receive
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="size-6 text-emerald-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-white">{proposal.desiredKeyName}</p>
                  <p className="text-sm text-white/60">Desired key</p>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-500/20">
                <p className="text-xs text-white/50">Amount</p>
                <p className="font-mono text-2xl font-bold text-emerald-300 tabular-nums">{formatNumber(proposal.desiredAmount)} keys</p>
              </div>
            </div>
          </div>

          {/* You Give */}
          <div className={cn('relative rounded-xl p-5 border-2', 'border-amber-400/30 bg-amber-400/5')}>
            <div className="absolute -top-3 left-4 px-2 bg-amber-400/5 text-amber-400 text-xs font-bold uppercase tracking-wide">
              You give
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 rounded-xl bg-amber-400/10 flex items-center justify-center">
                  <AlertCircle className="size-6 text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-white">{proposal.offeredKeyName}</p>
                  <p className="text-sm text-white/60">Offered by proposer</p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-400/20">
                <p className="text-xs text-white/50">Amount</p>
                <p className="font-mono text-2xl font-bold text-amber-300 tabular-nums">{formatNumber(proposal.offeredAmount)} keys</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proposer Info */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Proposal details</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-white/50">Proposer</dt>
            <dd className="font-mono text-sm text-white/90 truncate">{proposal.proposerAddress.slice(0, 8)}…{proposal.proposerAddress.slice(-6)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Created</dt>
            <dd className="font-mono text-sm text-white/90">{formatRelativeTime(proposal.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Expires</dt>
            <dd className="font-mono text-sm text-white/90">{formatRelativeTime(proposal.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Proposal ID</dt>
            <dd className="font-mono text-sm text-white/70 truncate">{proposal.id}</dd>
          </div>
          {proposal.executedAt && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-white/50">Executed</dt>
              <dd className="font-mono text-sm text-white/90">{formatRelativeTime(proposal.executedAt)}</dd>
            </div>
          )}
          {proposal.transactionHash && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-white/50">Transaction</dt>
              <dd className="font-mono text-sm text-white/70 truncate">{proposal.transactionHash}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Action / Status */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        {isExpired && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <Clock className="size-6 text-rose-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-rose-300">This proposal has expired</p>
              <p className="text-sm text-white/60">
                It expired {formatRelativeTime(proposal.expiresAt)} and can no longer be accepted.
              </p>
            </div>
          </div>
        )}

        {isExecuted && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="size-6 text-emerald-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-300">Swap executed</p>
              <p className="text-sm text-white/60">
                This atomic swap was completed {formatRelativeTime(proposal.executedAt!)}.
                {proposal.transactionHash && (
                  <span className="ml-2 font-mono text-xs text-white/50">Tx: {proposal.transactionHash.slice(0, 10)}…</span>
                )}
              </p>
            </div>
          </div>
        )}

        {isAccepted && !isExecuted && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Clock className="size-6 text-amber-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-300">Proposal accepted</p>
              <p className="text-sm text-white/60">Waiting for on-chain confirmation…</p>
            </div>
          </div>
        )}

        {canAct && (
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              You're connected as <span className="font-mono">{connectedAddress!.slice(0, 8)}…{connectedAddress!.slice(-6)}</span>.
              Accept this proposal to execute the atomic swap.
            </p>
            <Button
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="w-full rounded-xl"
              size="lg"
            >
              <StableButtonContent
                isLoading={acceptMutation.isPending}
                loadingLabel="Submitting swap…"
              >
                Accept & Execute Swap
              </StableButtonContent>
            </Button>
            <p className="text-xs text-white/50 text-center">
              This will submit an atomic transaction — both transfers succeed or neither does.
            </p>
          </div>
        )}

        {isProposer && isPending && !isExpired && (
          <div className="text-center text-white/60">
            <p>You created this proposal. Share the link above with your counterparty.</p>
            <p className="text-xs mt-1">Expires {formatRelativeTime(proposal.expiresAt)}</p>
          </div>
        )}

        {isProposer && (isExpired || isExecuted) && (
          <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-xl">
            Back to marketplace
          </Button>
        )}

        {isCounterparty && isExecuted && (
          <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-xl">
            Back to marketplace
          </Button>
        )}

        {!connectedAddress && isPending && !isExpired && !isProposer && (
          <div className="text-center text-white/60">
            <p>Connect your wallet to accept this proposal.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AtomicSwapProposalReview;