import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markErrorAsCaught } from '@/utils/globalErrorHandler.utils';

export interface TradePanelErrorBoundaryProps {
	children: ReactNode;
	fallbackMessage?: string;
	onReset?: () => void;
}

export interface TradePanelErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class TradePanelErrorBoundary extends Component<
	TradePanelErrorBoundaryProps,
	TradePanelErrorBoundaryState
> {
	public state: TradePanelErrorBoundaryState = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): TradePanelErrorBoundaryState {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		markErrorAsCaught(error);
		if (process.env.NODE_ENV !== 'test') {
			console.error('Uncaught error inside TradePanel:', error, errorInfo);
		}
	}

	public handleRetry = () => {
		this.setState({ hasError: false, error: null });
		if (this.props.onReset) {
			this.props.onReset();
		}
	};

	public render() {
		if (this.state.hasError) {
			return (
				<div
					data-testid="trade-panel-error-fallback"
					role="alert"
					aria-live="assertive"
					className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-slate-950/90 p-6 text-center text-white backdrop-blur-md"
				>
					<div className="flex flex-col items-center gap-2">
						<AlertCircle className="size-8 text-red-400" aria-hidden="true" />
						<p className="font-grotesque text-base font-bold text-white">
							{this.props.fallbackMessage ?? 'Something went wrong inside the trade panel'}
						</p>
						<p className="max-w-xs font-jakarta text-xs text-white/60">
							The rest of the marketplace is still running. Click retry below to attempt remounting the trade panel.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={this.handleRetry}
						data-testid="trade-panel-retry-button"
						className="mt-2 inline-flex items-center gap-2 rounded-xl border-amber-400/40 bg-amber-400/10 px-4 py-2 font-jakarta text-xs font-bold text-amber-300 hover:bg-amber-400/20"
					>
						<RefreshCw className="size-3.5" aria-hidden="true" />
						Retry
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default TradePanelErrorBoundary;
