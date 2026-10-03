import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	resetKey: number;
}

/**
 * Catches uncaught render errors anywhere in the app that aren't already
 * handled by a more specific boundary (SectionErrorBoundary,
 * CreatorPageErrorBoundary, etc). This is the last line of defense before
 * React would otherwise unmount the whole tree to a blank screen.
 *
 * The retry action remounts the complete app subtree so the app can recover
 * without requiring a browser reload.
 */
class AppErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		resetKey: 0,
	};

	public static getDerivedStateFromError(): Partial<State> {
		return { hasError: true };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		if (import.meta.env.DEV) {
			console.error('Uncaught error at app root:', error, errorInfo);
		}
	}

	private handleRetry = () => {
		this.setState(state => ({
			hasError: false,
			resetKey: state.resetKey + 1,
		}));
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
							Something went wrong
						</h1>
						<p className="max-w-md font-jakarta text-base leading-7 text-white/70">
							The app hit an unexpected error and couldn't continue. Try
							again, or contact support if the issue persists.
						</p>
					</div>
					<Button
						type="button"
						onClick={this.handleRetry}
						className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						Retry
					</Button>
					<a
						href="https://github.com/accesslayerorg/accesslayer-client/issues"
						target="_blank"
						rel="noreferrer"
						className="text-sm font-semibold text-white/70 underline underline-offset-4 hover:text-white"
					>
						Contact support
					</a>
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

export default AppErrorBoundary;
