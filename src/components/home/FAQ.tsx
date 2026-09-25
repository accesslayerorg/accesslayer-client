import { useEffect, useRef, useState } from 'react';

const FAQS = [
	{
		q: 'What is AccessLayer?',
		a: 'AccessLayer is an open-source marketplace built on Stellar where fans buy and sell creator keys. Holding keys unlocks exclusive content — and early believers benefit as creators grow.',
	},
	{
		q: 'What are creator keys?',
		a: 'Keys are on-chain tokens tied to a creator. Each creator has their own supply. More buyers push the price up; selling brings it down. Every trade settles on Stellar in seconds.',
	},
	{
		q: 'How is the key price determined?',
		a: 'A bonding curve formula running entirely on Soroban smart contracts. Nobody sets it — it moves automatically with supply and demand. No admin, no interference.',
	},
	{
		q: 'What do I get for holding keys?',
		a: 'Exclusive content, early access, and creator-defined perks. Only key holders can unlock them.',
	},
	{
		q: 'Can I sell my keys at any time?',
		a: 'Yes — instantly, at the current on-chain price. No lock-ups, no waiting.',
	},
	{
		q: 'How do creators earn?',
		a: 'Creators earn a cut of every trade their keys generate, buys and sells alike. The more active the community, the more value flows back.',
	},
	{
		q: 'What do I need to get started?',
		a: 'A Stellar wallet. Connect it, browse creators, and buy keys. No sign-up, no email.',
	},
	{
		q: 'Is AccessLayer open source?',
		a: 'Completely. Client, server, and Soroban contracts are all public. Audit, contribute, or fork.',
	},
];

function Row({
	q,
	a,
	index,
	open,
	onToggle,
}: {
	q: string;
	a: string;
	index: number;
	open: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="border-t border-black/6 first:border-t-0">
			<button
				onClick={onToggle}
				className="group flex w-full items-start md:gap-6 gap-2 py-6 text-left"
			>
				<span className="mt-0.5 min-w-[2rem] font-mono text-[10px] text-gray-300 transition-colors group-hover:text-gray-400">
					{String(index + 1).padStart(2, '0')}
				</span>
				<span
					className={`flex-1 font-jakarta text-base font-medium transition-colors duration-200 ${open ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}
				>
					{q}
				</span>
				<span
					className={`mt-1 font-mono text-lg leading-none text-gray-300 transition-all duration-300 group-hover:text-gray-500 ${open ? 'rotate-45' : ''}`}
				>
					+
				</span>
			</button>
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-40 pb-6' : 'max-h-0'}`}
			>
				<p className="ml-14 font-jakarta text-sm leading-relaxed text-gray-400">
					{a}
				</p>
			</div>
		</div>
	);
}

export default function FAQ() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);

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
		if (bodyRef.current) observer.observe(bodyRef.current);
		return () => observer.disconnect();
	}, []);

	return (
		<section className="bg-white px-6 py-20">
			<div className="mx-auto max-w-3xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal mb-12">
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-gray-300" />
						<span className="font-jakarta text-sm text-gray-400">
							FAQ
						</span>
					</div>
					<h2 className="mt-3 font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
						<span className="text-gray-900">Your questions, </span>
						<span className="text-gray-400">answered.</span>
					</h2>
				</div>

				{/* Rows */}
				<div
					ref={bodyRef}
					className="scroll-reveal"
					style={{ animationDelay: '100ms' }}
				>
					{FAQS.map((item, i) => (
						<Row
							key={item.q}
							{...item}
							index={i}
							open={openIndex === i}
							onToggle={() => setOpenIndex(openIndex === i ? null : i)}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
