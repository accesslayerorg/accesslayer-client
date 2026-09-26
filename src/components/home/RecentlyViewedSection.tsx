import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import RecentlyViewedKeyCard from './RecentlyViewedKeyCard';

/**
 * Homepage section that surfaces the last few creator keys the authenticated
 * user visited. It stays hidden until the wallet is connected and at least one
 * key has been recorded, and it is cleared wholesale when the wallet
 * disconnects.
 */
export default function RecentlyViewedSection() {
	const keys = useRecentlyViewed(state => state.keys);
	const clear = useRecentlyViewed(state => state.clear);
	const { isConnected } = useAccount();

	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	// Purge the list whenever the wallet is not connected, so a previously
	// populated list never resurfaces for a disconnected (guest) session even
	// if the disconnect happened somewhere other than the homepage.
	useEffect(() => {
		if (!isConnected && keys.length > 0) {
			clear();
		}
	}, [isConnected, keys.length, clear]);

	useEffect(() => {
		const targets = [headingRef.current, gridRef.current].filter(
			Boolean
		) as HTMLDivElement[];
		if (targets.length === 0) return;

		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.1 }
		);

		targets.forEach(target => observer.observe(target));
		return () => observer.disconnect();
	}, [keys.length]);

	if (!isConnected || keys.length === 0) return null;

	return (
		<section className="bg-white px-6 py-16 md:py-20">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal">
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-gray-300" />
						<span className="font-jakarta text-sm text-gray-400">
							Recently viewed
						</span>
					</div>

					<div className="mt-3 flex items-end justify-between gap-6">
						<h2 className="font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
							<span className="text-gray-900">Pick up where</span>{' '}
							<span className="text-gray-400">you left off.</span>
						</h2>
						<Link
							to="/marketplace"
							className="mb-1 hidden shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900 md:flex"
						>
							Explore keys
							<ArrowRight className="size-3.5" />
						</Link>
					</div>
				</div>

				{/* Card grid */}
				<div
					ref={gridRef}
					className="scroll-reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
					style={{ animationDelay: '100ms' }}
				>
					{keys.map(key => (
						<RecentlyViewedKeyCard key={key.id} creator={key} />
					))}
				</div>
			</div>
		</section>
	);
}
