import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markErrorAsCaught } from '@/utils/globalErrorHandler.utils';

interface RouteErrorBoundaryProps {
	children: ReactNode;
	routeName: string;
}

interface RouteErrorBoundaryState {
	error: Error | null;
	resetKey: number;
}

/** Isolates a route from the rest of the app and remounts it on retry. */
export default class RouteErrorBoundary extends Component<
	RouteErrorBoundaryProps,
	RouteErrorBoundaryState
> {
	public state: RouteErrorBoundaryState = { error: null, resetKey: 0 };

	public static getDerivedStateFromError(
		error: Error
	): Partial<RouteErrorBoundaryState> {
		return { error };
	}

	public componentDidCatch(error: Error, info: ErrorInfo) {
		markErrorAsCaught(error);
		if (import.meta.env.DEV) {
			console.error(
				`Uncaught error in ${this.props.routeName} route:`,
				error,
				info
			);
		}
	}

	private handleRetry = () => {
		this.setState(state => ({ error: null, resetKey: state.resetKey + 1 }));
	};

	public render() {
		if (this.state.error) {
			return (
				<main
					className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#06111f] px-6 py-16 text-center text-white"
					role="alert"
					aria-live="assertive"
					data-testid="route-error-fallback"
				>
					<div className="flex flex-col items-center gap-3">
						<AlertCircle
							className="size-10 text-amber-400"
							aria-hidden="true"
						/>
						<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
							{this.props.routeName} couldn&apos;t load
						</h1>
						<p className="max-w-md font-jakarta text-base leading-7 text-white/70">
							An unexpected error interrupted this page. Retry, or
							contact support if the problem continues.
						</p>
						{import.meta.env.DEV && (
							<pre
								data-testid="route-error-details"
								className="max-w-2xl whitespace-pre-wrap break-words text-left text-xs text-white/45"
							>
								{this.state.error.message}
							</pre>
						)}
					</div>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button
							type="button"
							onClick={this.handleRetry}
							className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
							data-testid="route-error-retry"
						>
							<RefreshCw className="size-4" aria-hidden="true" />
							Retry
						</Button>
						<a
							href="https://github.com/accesslayerorg/accesslayer-client/issues"
							target="_blank"
							rel="noreferrer"
							className="inline-flex h-12 items-center rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10"
						>
							Contact support
						</a>
					</div>
				</main>
			);
		}

		return (
			<div key={this.state.resetKey} className="contents">
				{this.props.children}
			</div>
		);
	}
}
