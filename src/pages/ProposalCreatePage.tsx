import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useProfileStore } from '@/hooks/useProfileStore';
import showToast from '@/utils/toast.util';

const PARAMETER_OPTIONS = [
  { value: 'quorum_threshold', label: 'Quorum Threshold', description: 'Minimum votes needed to pass' },
  { value: 'voting_period', label: 'Voting Period', description: 'Duration of voting window' },
  { value: 'fee_bps', label: 'Fee Basis Points', description: 'Platform fee percentage' },
  { value: 'min_key_price', label: 'Minimum Key Price', description: 'Floor price for keys' },
];

export default function ProposalCreatePage() {
  const navigate = useNavigate();
  const { isConnected } = useStellarWallet();
  const profile = useProfileStore(state => state.profile);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parameterTarget, setParameterTarget] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [discussionLink, setDiscussionLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);

  // Eligibility check - minimum governance token holding
  const isEligible = profile && profile.governanceTokenBalance && profile.governanceTokenBalance >= 100;

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-2xl text-center space-y-6 py-20">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Connect your wallet</h1>
            <p className="text-white/50">
              Connect a Stellar wallet to create governance proposals.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isEligible) {
    return (
      <main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-2xl text-center space-y-6 py-20">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Not eligible</h1>
            <p className="text-white/50">
              You need at least 100 governance tokens to create proposals.
            </p>
          </div>
          <Link
            to="/governance"
            className="text-amber-400 hover:underline"
          >
            Back to governance
          </Link>
        </div>
      </main>
    );
  }

  if (isSubmitted && proposalId) {
    return (
      <main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-2xl text-center space-y-6 py-20">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Proposal submitted</h1>
            <p className="text-white/50">
              Your proposal has been submitted with ID: <span className="font-mono text-white/70">{proposalId}</span>
            </p>
          </div>
          <Button
            onClick={() => navigate(`/governance?proposal=${proposalId}`)}
            className="rounded-xl"
          >
            View Proposal
          </Button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate proposal submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockProposalId = `prop_${Date.now()}`;
      setProposalId(mockProposalId);
      setIsSubmitted(true);
      showToast.success('Proposal submitted successfully');
    } catch {
      showToast.error('Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = title.trim() && description.trim() && parameterTarget && proposedValue.trim();

  return (
    <main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back nav */}
        <Link
          to="/governance"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to governance
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
            Governance
          </p>
          <h1 className="mt-1 font-jakarta text-3xl font-black tracking-tight sm:text-4xl">
            Create Proposal
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/50">
            Submit a parameter change proposal for on-chain voting.
          </p>
        </div>

        {/* Proposal Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-white/70">
                Title *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Increase quorum threshold to 60%"
                className="rounded-xl border-white/10 bg-white/[0.03]"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold text-white/70">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the rationale for this change..."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>

            {/* Parameter Target */}
            <div className="space-y-2">
              <label htmlFor="parameter" className="text-sm font-semibold text-white/70">
                Parameter to Change *
              </label>
              <select
                id="parameter"
                value={parameterTarget}
                onChange={(e) => setParameterTarget(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              >
                <option value="">Select a parameter</option>
                {PARAMETER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Value */}
            <div className="space-y-2">
              <label htmlFor="value" className="text-sm font-semibold text-white/70">
                Proposed Value *
              </label>
              <Input
                id="value"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder="e.g., 60"
                className="rounded-xl border-white/10 bg-white/[0.03]"
                required
              />
            </div>

            {/* Discussion Link */}
            <div className="space-y-2">
              <label htmlFor="discussion" className="text-sm font-semibold text-white/70">
                Discussion Link
              </label>
              <Input
                id="discussion"
                value={discussionLink}
                onChange={(e) => setDiscussionLink(e.target.value)}
                placeholder="https://forum.example.com/proposal-123"
                className="rounded-xl border-white/10 bg-white/[0.03]"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-xl font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Proposal
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
