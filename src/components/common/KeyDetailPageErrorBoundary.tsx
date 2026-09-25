import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markErrorAsCaught } from '@/utils/globalErrorHandler.utils';

interface ErrorBoundaryProps {
	children: ReactNode;
	locationKey: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

class KeyDetailPageErrorBoundary extends Component<ErrorBoundaryProps, State> {
	public state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		markErrorAsCaught(error);
		console.error(
			'Error rendering key detail page:',
			error,
			errorInfo.componentStack
		);
	}

	public componentDidUpdate(prevProps: ErrorBoundaryProps) {
		if (
			this.state.hasError &&
			prevProps.locationKey !== this.props.locationKey
		) {
			this.setState({ hasError: false, error: null });
		}
	}

	private handleReload = () => {
		this.setState({ hasError: false, error: null }, () => {
			window.location.reload();
		});
	};

	public render() {
		if (this.state.hasError) {
			return (
				<main
					className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#06111f] px-6 py-16 text-center text-white"
					role="alert"
					aria-live="assertive"
				>
					<div className="flex flex-col items-center gap-3">
						<AlertCircle
							className="size-10 text-amber-400"
							aria-hidden="true"
						/>
						<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
							Something went wrong loading this key
						</h1>
						<p className="max-w-md font-jakarta text-base leading-7 text-white/70">
							An unexpected error occurred. You can reload the page or return
							to the marketplace to continue browsing.
						</p>
						{this.state.error && (
							<p className="max-w-md font-jakarta text-xs leading-5 text-white/50 break-words">
								{this.state.error.message}
							</p>
						)}
					</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button
							type="button"
							onClick={this.handleReload}
							className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
						>
							<RefreshCw className="size-4" aria-hidden="true" />
							Reload page
						</Button>
						<Button
							asChild
							variant="outline"
							className="h-12 rounded-xl border-white/20 bg-transparent px-5 font-jakarta font-black text-white hover:bg-white/10"
						>
							<Link to="/">
								<ArrowLeft className="size-4" aria-hidden="true" />
								Back to marketplace
							</Link>
						</Button>
					</div>
				</main>
			);
		}

		return this.props.children;
	}
}

interface KeyDetailPageErrorBoundaryWrapperProps {
	children: ReactNode;
}

export default function KeyDetailPageErrorBoundaryWrapper({
	children,
}: KeyDetailPageErrorBoundaryWrapperProps) {
	const location = useLocation();
	return (
		<KeyDetailPageErrorBoundary locationKey={location.pathname}>
			{children}
		</KeyDetailPageErrorBoundary>
	);
}
