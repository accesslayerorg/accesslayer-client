import { useState, useEffect } from 'react';
import { Coins, Clock, CheckCircle, Loader2, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';

interface DividendDistribution {
  id: string;
  date: string;
  poolAmount: number;
  holderShare: number;
  claimed: boolean;
}

interface KeyDividend {
  keyId: string;
  keyName: string;
  pendingDividends: number;
  claimedDividends: number;
  totalEarned: number;
  distributions: DividendDistribution[];
}

interface DividendPoolSectionProps {
  dividends: KeyDividend[];
  isLoading?: boolean;
  onClaim?: (keyId: string) => Promise<void>;
}

export default function DividendPoolSection({
  dividends,
  isLoading = false,
  onClaim,
}: DividendPoolSectionProps) {
  const [claimingKeyId, setClaimingKeyId] = useState<string | null>(null);

  // Auto-refresh every 60 seconds
  const [, setRefreshCounter] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalPending = dividends.reduce((sum, d) => sum + d.pendingDividends, 0);
  const totalClaimed = dividends.reduce((sum, d) => sum + d.claimedDividends, 0);
  const totalEarned = dividends.reduce((sum, d) => sum + d.totalEarned, 0);

  const handleClaim = async (keyId: string) => {
    setClaimingKeyId(keyId);
    try {
      await onClaim?.(keyId);
    } finally {
      setClaimingKeyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 rounded bg-white/5" />
            <div className="h-24 rounded bg-white/5" />
            <div className="h-24 rounded bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (dividends.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="size-5 text-amber-400" />
          <h2 className="font-grotesque text-xl font-black tracking-tight text-white">
            Dividend Pool
          </h2>
        </div>
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-white/40">
            No dividend data available yet. Dividends accrue when you hold keys.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Coins className="size-5 text-amber-400" />
          <h2 className="font-grotesque text-xl font-black tracking-tight text-white">
            Dividend Pool
          </h2>
        </div>
        <span className="text-xs text-white/30">Auto-refreshes every 60s</span>
      </div>

      {/* Aggregate Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">Pending</p>
          <p className="mt-1 text-lg font-bold text-amber-400">
            {formatNumber(totalPending)} XLM
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">Claimed</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">
            {formatNumber(totalClaimed)} XLM
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Earned</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatNumber(totalEarned)} XLM
          </p>
        </div>
      </div>

      {/* Per-Key Dividends */}
      <div className="space-y-4">
        {dividends.map(dividend => (
          <div
            key={dividend.keyId}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">{dividend.keyName}</h3>
              <span className="text-xs text-white/40">Key ID: {dividend.keyId.slice(0, 8)}...</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-amber-400">
                  Pending: {formatNumber(dividend.pendingDividends)} XLM
                </span>
                <span className="text-emerald-400">
                  Claimed: {formatNumber(dividend.claimedDividends)} XLM
                </span>
              </div>
              {dividend.pendingDividends > 0 && (
                <Button
                  size="sm"
                  onClick={() => handleClaim(dividend.keyId)}
                  disabled={claimingKeyId === dividend.keyId}
                  className="rounded-lg"
                >
                  {claimingKeyId === dividend.keyId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4 mr-1" />
                      Claim
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Distribution History */}
            {dividend.distributions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-white/40 mb-2">Recent Distributions</p>
                <div className="space-y-1">
                  {dividend.distributions.slice(0, 3).map(dist => (
                    <div key={dist.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/50">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(dist.date).toLocaleDateString()}
                      </span>
                      <span className="text-white/60">
                        Pool: {formatNumber(dist.poolAmount)} · Share: {formatNumber(dist.holderShare)} XLM
                      </span>
                      {dist.claimed && (
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
