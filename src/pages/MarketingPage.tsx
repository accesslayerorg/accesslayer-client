export default function MarketingPage() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[#04090f] text-white">
			{/* Background pattern */}
			<div className="pointer-events-none absolute inset-0">
				<div
					className="absolute inset-0 opacity-[0.035]"
					style={{
						backgroundImage: `linear-gradient(rgba(99,179,237,0.6) 1px, transparent 1px),
						linear-gradient(90deg, rgba(99,179,237,0.6) 1px, transparent 1px)`,
						backgroundSize: '48px 48px',
					}}
				/>
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent)]" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_100%,rgba(29,78,216,0.06),transparent)]" />
			</div>

			<div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-36 sm:px-8">
				{/* Title */}
				<h1 className="leading-tight">
					<span
						className="font-grotesque text-[clamp(2.75rem,8vw,6rem)] font-extrabold tracking-tight text-white"
						style={{
							display: 'inline-block',
							textShadow:
								'2px 2px 0 #1d4ed8, 4px 4px 0 #1e3a8a, 6px 6px 0 rgba(30,58,138,0.25)',
						}}
					>
						Access Layer
					</span>
				</h1>

				{/* Intro */}
				<p className="mt-8 font-jakarta text-lg leading-relaxed text-white/55">
					AccessLayer is an open source platform built on the Stellar
					blockchain. It works like a marketplace for creators and their fans,
					where the relationship between them has real financial value.
				</p>

				<div className="mt-14 h-px bg-white/8" />

				{/* The idea */}
				<section className="mt-14">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
						The idea
					</p>
					<p className="mt-5 font-jakarta text-base leading-relaxed text-white/65">
						Most platforms give creators a page and some followers. AccessLayer
						gives creators a market. Each creator on the platform has a supply
						of keys that fans can buy and sell. When more people buy keys the
						price goes up, and when people sell the price goes down. This means
						fans who support a creator early can benefit as that creator becomes
						more popular over time.
					</p>
					<p className="mt-4 font-jakarta text-base leading-relaxed text-white/65">
						Holding keys gives fans access to gated content and perks that only
						key holders can unlock. The price is not set by anyone. It is
						determined by a bonding curve formula that runs entirely on chain,
						so nobody can change the rules or interfere with trades.
					</p>
				</section>

				{/* How it works */}
				<section className="mt-14">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
						How it works
					</p>
					<p className="mt-5 font-jakarta text-base leading-relaxed text-white/65">
						You connect your Stellar wallet, browse the marketplace, and buy
						keys for any creator you believe in. You can hold those keys to
						access exclusive content or sell them at any time. Every trade
						settles on chain in seconds with low fees, and creators earn a cut
						every time their keys change hands.
					</p>
					<p className="mt-4 font-jakarta text-base leading-relaxed text-white/65">
						This means creators earn not just from content but from the activity
						their community generates around them. The more their fan base grows
						and trades, the more value flows back to the creator.
					</p>
				</section>

				{/* What makes it different */}
				<section className="mt-14">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
						What makes it different
					</p>
					<p className="mt-5 font-jakarta text-base leading-relaxed text-white/65">
						On most platforms a creator with a million followers and a creator
						with ten thousand followers are treated the same way when it comes
						to what their fans can actually do. On AccessLayer the market itself
						reflects how much people believe in a creator. Early supporters are
						rewarded for their conviction and creators benefit from genuine
						community growth, not just follower counts or ad impressions.
					</p>
				</section>

				<div className="mt-14 h-px bg-white/8" />

				{/* Built on Stellar */}
				<section className="mt-14">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
						Built on Stellar
					</p>
					<p className="mt-5 font-jakarta text-base leading-relaxed text-white/65">
						AccessLayer is built on the Stellar blockchain using Soroban smart
						contracts. The project has three main parts. The first is this
						website where users connect their wallet, browse creators, and trade
						keys. The second is a server that stores creator data and handles
						requests from the website. The third is a set of smart contracts
						that run on Stellar and handle all the buying, selling, and fee
						collection in a trustless way.
					</p>
					<p className="mt-4 font-jakarta text-base leading-relaxed text-white/65">
						Stellar makes every transaction fast and cheap. Soroban handles the
						fee splits, key balances, and payment flows with no middleman. You
						do not have to trust us. You just have to trust the contract. The
						whole project is open source and built for contributors to help
						improve it.
					</p>
				</section>

				<div className="mt-14 h-px bg-white/8" />

				{/* Community */}
				<section className="mt-14 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
							Join the community
						</p>
						<p className="mt-2 font-jakarta text-sm text-white/40">
							Follow us as we keep building. Tell us what you think.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<a
							href="https://github.com/accesslayerorg"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-[9px] uppercase tracking-wider text-white/60 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
						>
							<img src="/icons/github.svg" alt="" className="size-3.5 invert opacity-60" />
							GitHub
						</a>
						<a
							href="https://t.me/c/accesslayerorg/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-sm border border-blue-500/35 bg-blue-500/10 px-5 py-2.5 font-mono text-[9px] uppercase tracking-wider text-blue-400 transition-all hover:border-blue-400 hover:bg-blue-500 hover:text-white"
						>
							Telegram
						</a>
					</div>
				</section>

				{/* Footer */}
				<div className="mt-14 h-px bg-white/8" />
				<div className="mt-8 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src="/icons/logo.svg" alt="Access Layer" className="size-5 opacity-40" />
						<span className="font-mono text-[9px] uppercase tracking-wider text-white/25">
							Access Layer
						</span>
					</div>
					<span className="font-mono text-[9px] text-white/20">
						Built on Stellar
					</span>
				</div>
			</div>
		</div>
	);
}
