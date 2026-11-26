import { Button } from '@/components/ui/button';
import { useConsent } from '@/hooks/useConsent';

export default function ConsentBanner() {
	const preferences = useConsent(state => state.preferences);
	const preferencesOpen = useConsent(state => state.preferencesOpen);
	const acceptAll = useConsent(state => state.acceptAll);
	const rejectNonEssential = useConsent(state => state.rejectNonEssential);
	const openPreferences = useConsent(state => state.openPreferences);

	if (preferences || preferencesOpen) return null;

	return (
		<aside
			aria-labelledby="consent-banner-title"
			className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#07111f] px-4 py-5 text-white shadow-[0_-16px_50px_rgba(0,0,0,0.35)] sm:px-6 sm:py-6"
			data-testid="consent-banner"
			role="region"
		>
			<div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<div className="max-w-2xl">
					<h2
						className="font-grotesque text-lg font-bold"
						id="consent-banner-title"
					>
						Your privacy choices
					</h2>
					<p className="mt-1 font-jakarta text-sm leading-6 text-white/70">
						Essential storage keeps Access Layer working. With your
						permission, we also use analytics and error reports to improve
						the app. You can change these choices at any time.
					</p>
				</div>

				<div className="flex flex-wrap gap-2 sm:shrink-0">
					<Button
						className="border-white/20 text-white hover:bg-white/10"
						onClick={rejectNonEssential}
						variant="outline"
					>
						Reject non-essential
					</Button>
					<Button
						className="border-white/20 text-white hover:bg-white/10"
						onClick={openPreferences}
						variant="outline"
					>
						Customize
					</Button>
					<Button
						className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
						onClick={acceptAll}
					>
						Accept all
					</Button>
				</div>
			</div>
		</aside>
	);
}
