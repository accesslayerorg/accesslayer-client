import { useState } from 'react';
import CurveSimulator from '@/components/learn/CurveSimulator';
import Stepper from '@/components/common/Stepper';
import { Button } from '@/components/ui/button';
import { useCurveParams } from '@/hooks/useCurveParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/utils/numberFormat.utils';

const STEPS = ['How it works', 'Explore the curve', 'Calculate a trade'];

export default function CurveExplainerPage() {
	useDocumentTitle('Bonding curve explainer — AccessLayer');
	const [step, setStep] = useState(1);
	const [keyId, setKeyId] = useState('');
	const {
		params,
		currentSupply,
		protocolFeeBps,
		creatorFeeBps,
		isLoading,
		isError,
		usingDefaults,
	} = useCurveParams(keyId.trim() || undefined);

	return (
		<main className="min-h-screen bg-slate-950 px-6 pt-12 pb-28 md:px-12 md:pb-16">
			<div className="mx-auto max-w-5xl space-y-6">
				<header>
					<h1 className="font-grotesque text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
						How key prices move
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						Keys are priced on a bonding curve. Every buy moves the supply up and
						the next key costs a little more; selling moves it back down.
					</p>
				</header>

				<div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
					<label
						htmlFor="curve-key-id"
						className="block font-jakarta text-xs font-bold text-white/70"
					>
						Key ID (leave blank for the example curve)
					</label>
					<input
						id="curve-key-id"
						value={keyId}
						onChange={event => setKeyId(event.target.value)}
						placeholder="e.g. creator-key-1"
						data-testid="curve-key-id"
						className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-jakarta text-sm text-white"
					/>
					{isLoading && (
						<p role="status" className="mt-2 font-jakarta text-xs text-white/50">
							Loading real curve parameters…
						</p>
					)}
					{isError && (
						<p role="alert" className="mt-2 font-jakarta text-xs text-red-300">
							Could not load that key. Showing the default example curve instead.
						</p>
					)}
					{!isLoading && !isError && !usingDefaults && (
						<p
							data-testid="curve-real-params-note"
							className="mt-2 font-jakarta text-xs text-emerald-200"
						>
							Using live curve parameters: base {formatNumber(params.basePriceStroops)} stroops,
							growth {params.growthFactor}, supply {formatNumber(currentSupply)}.
						</p>
					)}
				</div>

				<Stepper
					currentStep={step}
					totalSteps={3}
					steps={STEPS}
					ariaLabel="Bonding curve walkthrough"
				/>

				{step === 1 && (
					<section
						data-testid="curve-explainer-step-1"
						className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 font-jakarta text-sm text-white/70"
					>
						<h2 className="font-grotesque text-lg font-bold text-white">
							Three things to know
						</h2>
						<ol className="list-inside list-decimal space-y-2">
							<li>
								<strong className="text-white">Supply sets the price.</strong> The
								curve assigns a price to every supply level.
							</li>
							<li>
								<strong className="text-white">A buy walks up the curve.</strong> You
								pay the average price across every step of your order.
							</li>
							<li>
								<strong className="text-white">Fees and impact are shown.</strong> You
								see protocol/creator fees and how much your trade moves the price
								before you confirm.
							</li>
						</ol>
					</section>
				)}

				{step === 2 && (
					<CurveSimulator
						params={params}
						currentSupply={currentSupply}
						protocolFeeBps={protocolFeeBps}
						creatorFeeBps={creatorFeeBps}
					/>
				)}

				{step === 3 && (
					<CurveSimulator
						params={params}
						currentSupply={currentSupply}
						protocolFeeBps={protocolFeeBps}
						creatorFeeBps={creatorFeeBps}
						className="border-amber-400/30"
					/>
				)}

				<div className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => setStep(current => Math.max(1, current - 1))}
						disabled={step === 1}
					>
						Back
					</Button>
					<Button
						type="button"
						onClick={() => setStep(current => Math.min(3, current + 1))}
						disabled={step === 3}
					>
						Continue
					</Button>
				</div>
			</div>
		</main>
	);
}
