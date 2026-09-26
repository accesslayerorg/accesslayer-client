import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { courseService, type Course } from '@/services/course.service';
import { useWalletHoldings } from '@/hooks/useWallet';
import { AtomicSwapProposalForm } from '@/components/common/AtomicSwapProposalForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import showToast from '@/utils/toast.util';
import SectionDivider from '@/components/common/SectionDivider';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import SectionHeading from '@/components/common/SectionHeading';
import { calculatePortfolioValue, sortHoldingsByTotalValue } from '@/utils/portfolioValue.utils';
import { formatPortfolioValueDisplay, getPortfolioValueHelperText } from '@/utils/portfolioValue.utils';
import PortfolioHoldingRow from '@/components/common/PortfolioHoldingRow';
import HoldingsEmptyState from '@/components/common/HoldingsEmptyState';
import CreatorSkeleton from '@/components/common/CreatorSkeleton';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';

const DEMO_WALLET_ADDRESS = 'demo-wallet-address';

export default function AtomicSwapCreatePage() {
  const { address: connectedAddress } = useAccount();
  const activeWalletAddress = connectedAddress || DEMO_WALLET_ADDRESS;
  const { isMismatch: isNetworkMismatch } = useNetworkMismatch();

  const [creators, setCreators] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const { data: cachedHoldings = [] } = useWalletHoldings(activeWalletAddress);

  useEffect(() => {
    const fetchCreators = async () => {
      setIsLoading(true);
      try {
        const data = await courseService.getCourses();
        if (data && data.length > 0) {
          setCreators(data);
        }
      } catch {
        showToast.error('Unable to load creators. Check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCreators();
  }, []);

  const heldKeyPositions = useMemo(
    () =>
      sortHoldingsByTotalValue(
        creators.map(creator => {
          const cached = cachedHoldings.find(h => h.creatorId === creator.id);
          return {
            creatorId: creator.id,
            quantity: cached?.quantity ?? 0,
            priceStroops: creator.priceStroops,
            price: creator.price,
            pending: cached?.pending ?? false,
            unclaimedDividend: cached?.unclaimedDividend ?? 0,
          };
        })
      ),
    [creators, cachedHoldings]
  );

  const portfolioValue = useMemo(() => calculatePortfolioValue(heldKeyPositions), [heldKeyPositions]);
  const portfolioValueDisplay = formatPortfolioValueDisplay(portfolioValue);
  const portfolioValueHelperText = getPortfolioValueHelperText(portfolioValue);

  const hasHoldings = heldKeyPositions.some(p => p.quantity && p.quantity > 0);

  const handleOpenForm = useCallback(() => {
    if (!hasHoldings) {
      showToast.error('No holdings');
      return;
    }
    setFormOpen(true);
  }, [hasHoldings]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-12 pb-28 md:px-12 md:pb-12">
      <div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
      <div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <MarketplaceSection as="header" spacing="major" className="text-center">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="rounded-xl">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <div />
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-400/80">Direct Key Exchange</p>
          <h1 className="mb-4 font-grotesque text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-white">
            Atomic Swap Proposals
          </h1>
          <p className="max-w-2xl mx-auto text-white/60">
            Create trustless, atomic key exchange proposals. Both sides of the swap execute simultaneously —
            or neither does. Share a link with your counterparty to complete the exchange.
          </p>
        </MarketplaceSection>

        <main>
          <SectionDivider title="Your holdings" spacing="relaxed" />
          <MarketplaceSection spacing="default" className="marketplace-card-surface rounded-[2rem] border p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300/80">Portfolio value</p>
                <div className="flex items-center gap-2 font-grotesque text-2xl font-black text-white md:text-3xl">
                  {portfolioValueDisplay}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{portfolioValueHelperText}</p>
              </div>
            </div>

            {isLoading ? (
              <CreatorSkeleton className="mt-6" />
            ) : !hasHoldings ? (
              <HoldingsEmptyState className="mt-6" />
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {heldKeyPositions
                  .filter(position => position.quantity && position.quantity > 0)
                  .map(position => {
                    const creator = creators.find(item => item.id === position.creatorId);
                    return (
                      <PortfolioHoldingRow
                        key={position.creatorId}
                        position={position}
                        creator={creator}
                        isNetworkMismatch={isNetworkMismatch}
                      />
                    );
                  })}
              </div>
            )}
          </MarketplaceSection>

          <SectionDivider title="Create proposal" spacing="relaxed" />
          <MarketplaceSection spacing="default" className="marketplace-card-surface rounded-[2rem] border p-6 md:p-8">
            <SectionHeading
              title="New atomic swap proposal"
              supportingText="Select a key you own to offer and a key you want in return. Set the amounts and expiry, then share the generated link with your counterparty."
              className="mb-6"
            />

            {!hasHoldings ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 size-16 rounded-full bg-amber-400/10 flex items-center justify-center">
                  <svg className="size-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No keys to swap</h3>
                <p className="text-white/60 max-w-xs mx-auto">You need to own at least one creator key before you can create an atomic swap proposal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AtomicSwapProposalForm
                  open={formOpen}
                  onOpenChange={setFormOpen}
                  creators={creators}
                  walletAddress={activeWalletAddress}
                  isSubmitting={isNetworkMismatch}
                />
                <Button
                  onClick={handleOpenForm}
                  disabled={isNetworkMismatch || !hasHoldings}
                  className="w-full sm:w-auto rounded-xl"
                  size="lg"
                >
                  <svg className="size-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Swap Proposal
                </Button>
                <p className="text-xs text-white/50 text-center sm:text-left">
                  The counterparty will need to connect their wallet and accept the proposal to execute the atomic swap.
                </p>
              </div>
            )}
          </MarketplaceSection>
        </main>
      </div>

      <AtomicSwapProposalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        creators={creators}
        walletAddress={activeWalletAddress}
        isSubmitting={isNetworkMismatch}
      />
    </div>
  );
}