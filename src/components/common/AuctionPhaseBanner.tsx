interface AuctionPhaseBannerProps {
	auctionPrice: number;
	auctionSupply: number;
	auctionSold: number;
}

const AuctionPhaseBanner: React.FC<AuctionPhaseBannerProps> = ({
	auctionPrice,
	auctionSupply,
	auctionSold,
}) => {
	const remaining = auctionSupply - auctionSold;
	const progressPercent = Math.min(100, (auctionSold / auctionSupply) * 100);

	if (remaining <= 0) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
		>
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
				Auction Phase
			</p>
			<p className="mt-1 font-grotesque text-lg font-black text-white">
				Early access price: {auctionPrice} XLM — {remaining} keys left
			</p>
			<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full bg-amber-400 transition-all"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>
			<p className="mt-1 text-xs text-white/50">
				{auctionSold} / {auctionSupply} sold
			</p>
		</div>
	);
};

export default AuctionPhaseBanner;
