import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelemetry } from '@/hooks/useTelemetry';

function NotFoundPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const { track } = useTelemetry();
	const [searchQuery, setSearchQuery] = useState('');

	// Log 404 event with the attempted path on mount
	useEffect(() => {
		track({
			type: 'UserAction',
			action: '404_page_view',
			target: 'not_found_page',
			metadata: { path: location.pathname + location.search },
		});
	}, [track, location.pathname, location.search]);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = searchQuery.trim();
		if (trimmed) {
			navigate(`/?search=${encodeURIComponent(trimmed)}`);
		}
	};

	return (
		<main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
			<section className="relative flex min-h-screen items-center px-6 py-16">
				<div
					className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_30%),linear-gradient(135deg,rgba(6,17,31,0.98),rgba(12,33,58,0.95))]"
					aria-hidden="true"
				/>
				<div
					className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent"
					aria-hidden="true"
				/>

				<div className="relative mx-auto w-full max-w-4xl">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 font-jakarta text-sm font-bold text-amber-100">
						<Compass className="size-4" aria-hidden="true" />
						Page not found
					</div>

					<p className="font-jakarta text-sm font-black uppercase tracking-[0.28em] text-amber-200/80">
						Access Layer
					</p>
					<h1 className="mt-4 max-w-3xl font-grotesque text-5xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl">
						Page not found
					</h1>
					<p className="mt-6 max-w-2xl font-jakarta text-base leading-8 text-white/70 sm:text-lg">
						The page you are looking for doesn't exist or has been moved.
						Return to the marketplace or search for creators below.
					</p>

					{/* Search Keys input */}
					<form
						onSubmit={handleSearchSubmit}
						className="mt-8 max-w-md"
						role="search"
						aria-label="Search creators from 404 page"
					>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Search className="size-5 text-white/50" aria-hidden="true" />
							</div>
							<input
								type="text"
								aria-label="Search keys"
								className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus:border-amber-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
								placeholder="Search keys by creator name..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>
						</div>
						<Button
							type="submit"
							variant="outline"
							className="mt-3 h-10 rounded-xl border-white/15 bg-white/5 px-5 font-jakarta text-sm font-bold text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white"
						>
							Search
						</Button>
					</form>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button
							asChild
							className="h-12 rounded-xl bg-amber-400 px-5 font-jakarta font-black text-slate-950 hover:bg-amber-300"
						>
							<Link to="/">
								<ArrowLeft className="size-4" aria-hidden="true" />
								Back to Marketplace
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</main>
	);
}

export default NotFoundPage;
