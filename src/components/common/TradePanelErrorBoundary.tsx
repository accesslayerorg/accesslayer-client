import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';
import { cn } from '@/lib/utils';

interface Props {
	children: ReactNode;
	className?: string;
}

interface State {
	hasError: boolean;
}

class TradePanelErrorBoundary extends Component<Props, State> {
	public state: State = { hasError: false };

	public static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Uncaught error in trade panel:', error, errorInfo);
	}

	private handleRetry = () => {
		this.setState({ hasError: false });
	};

	public render() {
		if (this.state.hasError) {
			return (
				<div
					role="alert"
					aria-live="assertive"
					className={cn(
						'flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2',
						this.props.className
					)}
				>
					<TransactionStatusIcon status="failed" className="shrink-0" />
					<p className="min-w-0 flex-1 truncate text-xs font-medium text-white/80">
						Trading is unavailable right now.
					</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={this.handleRetry}
						className="shrink-0 gap-1.5 border-red-400/30 bg-transparent text-white hover:bg-red-500/10"
					>
						<RotateCcw className="size-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default TradePanelErrorBoundary;
