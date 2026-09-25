import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { markErrorAsCaught } from '@/utils/globalErrorHandler.utils';

interface Props {
	children: ReactNode;
	sectionName?: string;
	minHeight?: string | number;
	className?: string;
	/**
	 * Overrides the default "Something went wrong in this section" heading.
	 * Use for a short, section-specific message (e.g. "Chart unavailable —
	 * try refreshing").
	 */
	title?: string;
	/**
	 * Overrides the default explanatory paragraph. Pass an empty string to
	 * show only the title (no secondary copy).
	 */
	description?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

class SectionErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		markErrorAsCaught(error);
		console.error(`Uncaught error in section ${this.props.sectionName || 'Unknown'}:`, error, errorInfo);
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	public render() {
		if (this.state.hasError) {
			return (
				<div
					className={cn(
						'flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-8 text-center',
						this.props.className
					)}
					style={{ minHeight: this.props.minHeight }}
					role="alert"
					aria-live="assertive"
				>
					<div className="flex flex-col items-center gap-2">
						<AlertCircle className="h-10 w-10 text-destructive" />
						<h3 className="text-lg font-semibold">
							{this.props.title ?? 'Something went wrong in this section'}
						</h3>
						{this.props.description !== '' && (
							<p className="max-w-md text-sm text-muted-foreground">
								{this.props.description ??
									(this.props.sectionName
										? `We encountered an error while loading the ${this.props.sectionName}. Please try again or contact support if the issue persists.`
										: 'We encountered an error while loading this content. Please try again or contact support if the issue persists.')}
							</p>
						)}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={this.handleRetry}
						className="gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						Retry
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default SectionErrorBoundary;
