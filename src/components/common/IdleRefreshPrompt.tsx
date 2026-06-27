import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface IdleRefreshPromptProps {
	/** Whether the prompt is currently visible. */
	visible: boolean;
	/** Called when the user clicks "Refresh". */
	onRefresh: () => void;
	/** Called when the user dismisses without refreshing. */
	onDismiss: () => void;
}

/**
 * A subtle bottom-of-viewport banner that appears after an inactivity
 * threshold and offers to refresh the creator list.
 *
 * Rendered into the normal DOM flow but positioned fixed so it floats above
 * page content without shifting layout. Hidden via `aria-hidden` and
 * `pointer-events-none` when not visible so it never interferes with
 * keyboard navigation.
 */
const IdleRefreshPrompt: React.FC<IdleRefreshPromptProps> = ({
	visible,
	onRefresh,
	onDismiss,
}) => {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-atomic="true"
			aria-hidden={!visible}
			data-testid="idle-refresh-prompt"
			className={[
				'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
				'flex items-center gap-3 rounded-2xl border border-white/10',
				'bg-zinc-900/90 px-4 py-3 shadow-xl backdrop-blur-md',
				'text-sm text-white/80 transition-all duration-300',
				visible
					? 'translate-y-0 opacity-100 pointer-events-auto'
					: 'translate-y-4 opacity-0 pointer-events-none',
			].join(' ')}
		>
			<span className="shrink-0 text-white/50">
				<RefreshCw className="size-4" aria-hidden="true" />
			</span>
			<span>The creator list may be out of date.</span>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				onClick={onRefresh}
				className="h-7 rounded-lg px-3 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
				data-testid="idle-refresh-prompt-confirm"
			>
				Refresh
			</Button>
			<button
				type="button"
				onClick={onDismiss}
				aria-label="Dismiss refresh prompt"
				className="ml-1 text-white/30 transition-colors hover:text-white/60"
				data-testid="idle-refresh-prompt-dismiss"
			>
				✕
			</button>
		</div>
	);
};

export default IdleRefreshPrompt;
