import { useState, type ReactNode } from 'react';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useProfileStore } from '@/hooks/useProfileStore';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { ContentGateType } from '@/types/contentGate';

/**
 * The gate types the holder-facing gate can enforce. The creator-facing
 * configuration adds a "none" type, which disables the gate entirely (#1221).
 */
export type GateType = Exclude<ContentGateType, 'none'>;

interface SubscriptionAccessGateProps {
    creatorId: string;
    gateType?: GateType;
    minimumHolding?: number;
    children: ReactNode;
    onBuyClick?: () => void;
    onSubscribeClick?: () => void;
    hasGate?: boolean;
}

export default function SubscriptionAccessGate({
    creatorId,
    gateType = 'holder',
    minimumHolding = 1,
    children,
    onBuyClick,
    onSubscribeClick,
    hasGate = true,
}: SubscriptionAccessGateProps) {
    const profile = useProfileStore(state => state.profile);
    const userAddress = profile?.id;
    const [durationDays, setDurationDays] = useState(30);
    const { data: holdings = [], isLoading } = useWalletHoldings(
        userAddress ?? ''
    );

    if (!hasGate) {
        return <>{children}</>;
    }

    const userPosition = holdings.find(h => h.creatorId === creatorId);
    const quantity = userPosition?.quantity ?? 0;
    const isUnlocked = quantity >= minimumHolding;

    const requirementLabel =
        gateType === 'subscriber'
            ? 'Subscriber Required'
            : gateType === 'threshold'
                ? `Threshold (${minimumHolding} token${minimumHolding === 1 ? '' : 's'})`
                : 'Holder Required';

    const ctaLabel =
        gateType === 'subscriber' ? 'Subscribe' : 'Buy Key';
    const handleCtaClick =
        gateType === 'subscriber'
            ? (onSubscribeClick ?? onBuyClick)
            : (onBuyClick ?? onSubscribeClick);

    // Mock expiry countdown for now (e.g. 30 days from last buy, defaulting to 30 days from now if not present)
    const expiryDate = userPosition?.last_buy_timestamp
        ? new Date(
                new Date(userPosition.last_buy_timestamp).getTime() +
                    30 * 24 * 60 * 60 * 1000
          )
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (!userAddress) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#06111f] p-8 text-center" data-testid="subscription-gate-unconnected">
                <h3 className="mb-2 text-xl font-bold text-white">Wallet Not Connected</h3>
                <p className="mb-4 text-white/70">
                    Connect your wallet to verify your key holdings and access this content.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 animate-pulse" data-testid="subscription-gate-loading">
                Checking subscription status...
            </div>
        );
    }

    if (!isUnlocked) {
        return (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center" data-testid="subscription-gate-locked">
                <div className="mb-4 text-rose-400">
                    <svg
                        className="mx-auto h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Content Locked</h3>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-rose-300" data-testid="subscription-gate-requirement">
                    {requirementLabel}
                </p>
                <p className="mb-6 text-white/70">
                    You need at least {minimumHolding} key{minimumHolding === 1 ? '' : 's'}{' '}
                    to access this creator&apos;s gated content. You currently hold {quantity}.
                </p>
                {handleCtaClick && (
                    <>
                        <div className="mb-3 flex items-center justify-center gap-3 text-sm text-white/70">
                            <label htmlFor="subscription-duration">Duration</label>
                            <select
                                id="subscription-duration"
                                value={durationDays}
                                onChange={(event) => setDurationDays(Number(event.target.value))}
                                className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-white"
                            >
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={90}>90 days</option>
                            </select>
                        </div>
                        <Button onClick={handleCtaClick} variant="default" className="font-bold" data-testid="subscription-gate-cta">
                            {ctaLabel} for {durationDays} days
                        </Button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="subscription-gate-unlocked">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-400">Active Subscription</h4>
                        <p className="text-xs text-emerald-400/80">
                            You hold {quantity} key{quantity === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>
                {expiryDate && (
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-emerald-400/70">
                            Expires
                        </p>
                        <p className="font-mono text-sm font-semibold text-emerald-400">
                            {formatDistanceToNow(expiryDate, { addSuffix: true })}
                        </p>
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
