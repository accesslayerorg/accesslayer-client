import { AtomicSwapProposalReview } from '@/components/common/AtomicSwapProposalReview';

export default function AtomicSwapProposalPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-12 pb-28 md:px-12 md:pb-12">
      <div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
      <div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <AtomicSwapProposalReview />
      </div>
    </div>
  );
}