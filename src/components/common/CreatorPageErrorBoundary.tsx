import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api.service';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error boundary scoped to creator detail routes. When a creator page throws
 * during render, this catches the error and shows a fallback with a link back
 * to the creator list instead of crashing the whole app to a blank screen.
 */
class CreatorPageErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		if (import.meta.env.DEV) {
			console.error('Error rendering creator page:', error, errorInfo);
		}
	}

	public render() {
		if (this.state.hasError) {
			const isNotFound =
				this.state.error instanceof ApiError &&
				this.state.error.status === 404;

			return (
				<main
					className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#06111f] px-6 py-16 text-center text-white"
					role="alert"
					aria-live="assertive"
				>
					<div className="flex flex-col items-center gap-3">
						<AlertCircle className="size-10 text-amber-400" aria-hidden="true" />
						<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
							{isNotFound
								? 'Creator not found'
								: 'This creator page could not load'}
						</h1>
						<p className="max-w-md font-jakarta text-base leading-7 text-white/70">
							{isNotFound
								? "We couldn't find a creator with that ID. Return to the creator list to keep browsing."
								: 'Something went wrong while loading this creator. The rest of the marketplace is still available.'}
						</p>
					</div>
					<Button
						asChild
						className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
					>
						<Link to="/creators">
							<ArrowLeft className="size-4" aria-hidden="true" />
							Back to creators
						</Link>
					</Button>
				</main>
			);
		}

		return this.props.children;
	}
}

export default CreatorPageErrorBoundary;
