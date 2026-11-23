import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	useConsent,
	type ConsentPreferences as Preferences,
} from '@/hooks/useConsent';

const DEFAULT_PREFERENCES: Preferences = {
	analytics: false,
	errorReporting: false,
};

export default function ConsentPreferences() {
	const preferences = useConsent(state => state.preferences);
	const isOpen = useConsent(state => state.preferencesOpen);
	const closePreferences = useConsent(state => state.closePreferences);
	const savePreferences = useConsent(state => state.savePreferences);
	const [draft, setDraft] = useState<Preferences>(
		preferences ?? DEFAULT_PREFERENCES
	);

	useEffect(() => {
		if (isOpen) {
			setDraft(preferences ?? DEFAULT_PREFERENCES);
		}
	}, [isOpen, preferences]);

	return (
		<Dialog
			onOpenChange={open => {
				if (!open) closePreferences();
			}}
			open={isOpen}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#07111f] text-white sm:max-w-lg"
				showEscapeHint={false}
			>
				<DialogHeader className="pr-6 text-left">
					<DialogTitle className="font-grotesque text-2xl">
						Privacy preferences
					</DialogTitle>
					<DialogDescription className="text-white/65">
						Choose which optional technologies Access Layer may use on
						this device. Your choices are saved in local storage.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="font-jakarta text-sm font-semibold">
									Essential storage
								</h3>
								<p className="mt-1 text-sm leading-5 text-white/60">
									Required for core app features and your saved
									preferences.
								</p>
							</div>
							<span className="shrink-0 pt-0.5 text-xs font-semibold text-amber-300">
								Always on
							</span>
						</div>
					</div>

					<label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<span>
							<span className="block font-jakarta text-sm font-semibold">
								Analytics
							</span>
							<span className="mt-1 block text-sm leading-5 text-white/60">
								Anonymous app usage and performance events help us
								improve the experience.
							</span>
						</span>
						<input
							checked={draft.analytics}
							className="mt-1 size-4 accent-amber-400"
							onChange={event =>
								setDraft(current => ({
									...current,
									analytics: event.target.checked,
								}))
							}
							type="checkbox"
						/>
					</label>

					<label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<span>
							<span className="block font-jakarta text-sm font-semibold">
								Error reporting
							</span>
							<span className="mt-1 block text-sm leading-5 text-white/60">
								Share error details with our monitoring service so we
								can diagnose problems.
							</span>
						</span>
						<input
							checked={draft.errorReporting}
							className="mt-1 size-4 accent-amber-400"
							onChange={event =>
								setDraft(current => ({
									...current,
									errorReporting: event.target.checked,
								}))
							}
							type="checkbox"
						/>
					</label>
				</div>

				<DialogFooter className="pt-2">
					<Button onClick={closePreferences} variant="outline">
						Cancel
					</Button>
					<Button
						className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
						onClick={() => savePreferences(draft)}
					>
						Save preferences
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
