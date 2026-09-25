import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

/**
 * Catches uncaught render errors anywhere in the app that aren't already
 * handled by a more specific boundary (SectionErrorBoundary,
 * CreatorPageErrorBoundary, etc). This is the last line of defense before
 * React would otherwise unmount the whole tree to a blank screen.
 *
 * A full reload is used for recovery rather than resetting local state:
 * an error this high up means the app-level state that produced it is
 * suspect, so a fresh mount is safer than trying to resume it.
 */
class AppErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Uncaught error at app root:', error, errorInfo);
	}

	private handleReload = () => {
		window.location.reload();
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
							The app hit an unexpected error and couldn't continue.
							Reloading the page usually fixes this.
						</p>
					</div>
					<Button
						type="button"
						onClick={this.handleReload}
						className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						Reload page
					</Button>
				</main>
			);
		}

		return this.props.children;
	}
}

export default AppErrorBoundary;
