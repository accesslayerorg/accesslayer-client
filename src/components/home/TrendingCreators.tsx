import { ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { Course } from '@/services/course.service';
import TrendingCreatorCard from './TrendingCreatorCard';

export interface MockCreator extends Course {
	walletAddress: string;
}

const MOCK_CREATORS: MockCreator[] = [
	{
		id: '1',
		title: 'Lena Markov',
		description:
			'Digital artist and illustrator. Drops exclusive prints and behind-the-scenes content for key holders.',
		price: 12.4,
		priceStroops: 124000000,
		instructorId: 'lenamarkov',
		category: 'Art',
		level: 'INTERMEDIATE',
		isVerified: true,
		change24h: 8.2,
		creatorShareSupply: 214,
		volume24h: 3.1,
		walletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
	},
	{
		id: '2',
		title: 'Dario Fuentes',
		description:
			'Music producer and beatmaker. Key holders get early access to unreleased tracks and sample packs.',
		price: 6.8,
		priceStroops: 68000000,
		instructorId: 'dariofuentes',
		category: 'Music',
		level: 'BEGINNER',
		isVerified: false,
		change24h: -2.5,
		creatorShareSupply: 89,
		walletAddress: 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6',
	},
	{
		id: '3',
		title: 'Nour Al-Rashid',
		description:
			'Independent filmmaker. Shares raw footage, director cuts, and project updates with key holders.',
		price: 22.0,
		priceStroops: 220000000,
		instructorId: 'nour.film',
		category: 'Film',
		level: 'ADVANCED',
		isVerified: true,
		change24h: 14.7,
		creatorShareSupply: 401,
		volume24h: 7.5,
		walletAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKZO9E6H6ADAB4BWJQMHQ',
	},
	{
		id: '4',
		title: 'Kai Osei',
		description:
			'Writer and essayist. Long-form pieces, early drafts, and reader discussions behind the keys.',
		price: 4.2,
		priceStroops: 42000000,
		instructorId: 'kaiosei',
		category: 'Writing',
		level: 'BEGINNER',
		isVerified: false,
		change24h: 1.1,
		creatorShareSupply: 57,
		walletAddress: 'GDQJUTQYK2MQX2CBBF2SPBFHHPLXLB2RQSQEENAZ69P0OAZGVVH5QNQ',
	},
	{
		id: '5',
		title: 'Priya Nair',
		description:
			'Fashion designer and stylist. Exclusive lookbooks, collabs, and wardrobe access for holders.',
		price: 9.6,
		priceStroops: 96000000,
		instructorId: 'priyanair',
		category: 'Fashion',
		level: 'INTERMEDIATE',
		isVerified: true,
		change24h: 5.3,
		creatorShareSupply: 162,
		volume24h: 2.0,
		walletAddress: 'GBVVJJWAKJ4FGDKRZYUNXTKN4KGZR4BKISNC7LMR2TRNWVABKSDO3RD',
	},
	{
		id: '6',
		title: 'Tobias Wren',
		description:
			'Photographer and visual storyteller. Key holders access full resolution galleries and print drops.',
		price: 7.1,
		priceStroops: 71000000,
		instructorId: 'tobiaswren',
		category: 'Photography',
		level: 'INTERMEDIATE',
		isVerified: false,
		change24h: -0.8,
		creatorShareSupply: 103,
		walletAddress: 'GATEMHCCKCY67ZUCKTROYN24ZYT5GK4Q4WLVF3JK3BXAAFAZNTIOH5O',
	},
];

export default function TrendingCreators() {
	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
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

		if (headingRef.current) observer.observe(headingRef.current);
		if (gridRef.current) observer.observe(gridRef.current);

		return () => observer.disconnect();
	}, []);

	return (
		<section
			className="bg-white px-6 py-20"
			style={{
				backgroundImage:
					'radial-gradient(circle, #d1d5db 0.75px, transparent 0.75px)',
				backgroundSize: '22px 22px',
			}}
		>
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal">
					{/* Eyebrow */}
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-gray-300" />
						<span className="font-jakarta text-sm text-gray-400">
							Trending now
						</span>
					</div>

					{/* Heading + View all */}
					<div className="mt-3 flex items-end justify-between gap-6">
						<h2 className="font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
							<span className="text-gray-900">
								Creators worth holding,
							</span>
							<br />
							<span className="text-gray-400">
								before the price tells you so.
							</span>
						</h2>
						<Link
							to="/marketplace"
							className="mb-1 md:flex hidden shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900"
						>
							View all
							<ArrowRight className="size-3.5" />
						</Link>
					</div>
				</div>

				{/* Grid */}
				<div
					ref={gridRef}
					className="scroll-reveal mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
					style={{ animationDelay: '100ms' }}
				>
					{MOCK_CREATORS.map(creator => (
						<TrendingCreatorCard key={creator.id} creator={creator} />
					))}
				</div>
			</div>
		</section>
	);
}
