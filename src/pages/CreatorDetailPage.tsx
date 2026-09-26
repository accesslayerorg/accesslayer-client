import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { courseService } from '@/services/course.service';
import type { Course } from '@/services/course.service';
import BondingCurveChart from '@/components/common/BondingCurveChart';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import KeySupplyBadge from '@/components/common/KeySupplyBadge';
import { formatCreatorKeyPriceDisplay } from '@/utils/keyPriceDisplay.utils';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import { FormInput } from '@/components/common/FormInput';
import { cn } from '@/lib/utils';

const CreatorDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isConnected } = useAccount();
	const { isMismatch: isNetworkMismatch, expectedChainName } = useNetworkMismatch();

	const [creator, setCreator] = useState<Course | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [buyQuantity, setBuyQuantity] = useState<number>(1);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const fetchCreator = async () => {
			if (!id) {
				setError('Creator ID is required');
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const data = await courseService.getCourse(id);
				setCreator(data);
			} catch (err) {
				setError('Failed to load creator details');
				console.error('Error fetching creator:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchCreator();
	}, [id]);

	const handleBuyQuantityChange = (value: string) => {
		const numValue = parseInt(value.replace(/,/g, ''), 10);
		if (!isNaN(numValue) && numValue >= BUY_QUANTITY_BOUNDS.MIN_QTY && numValue <= BUY_QUANTITY_BOUNDS.MAX_QTY) {
			setBuyQuantity(numValue);
		}
	};

	const handleBuy = async () => {
		if (!creator) return;

		if (!isConnected) {
			toast.error('Please connect your wallet to purchase keys', {
				duration: 4000,
			});
			return;
		}

		if (isNetworkMismatch) {
			toast.error(`Switch to ${expectedChainName} to purchase keys`, {
				duration: 4000,
			});
			return;
		}

		setIsProcessing(true);
		try {
			// Simulate purchase - in real implementation, this would interact with the smart contract
			await new Promise(resolve => setTimeout(resolve, 1500));
			toast.success(`Successfully purchased ${buyQuantity} key(s) for ${creator.title}!`);
			// Refresh creator data to get updated supply
			const updatedCreator = await courseService.getCourse(id!);
			setCreator(updatedCreator);
		} catch (err) {
			toast.error('Purchase failed. Please try again.');
			console.error('Purchase error:', err);
		} finally {
			setIsProcessing(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<div className="text-white/60">Loading creator details...</div>
			</div>
		);
	}

	if (error || !creator) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-400 mb-4">{error || 'Creator not found'}</p>
					<Button onClick={() => navigate('/')} variant="outline">
						Back to Marketplace
					</Button>
				</div>
			</div>
		);
	}

	const currentPriceStroops = resolveCreatorKeyPriceStroops(creator);
	const currentSupply = creator.creatorShareSupply || 0;

	return (
		<div className="min-h-screen bg-slate-950">
			<CreatorProfileHeader
				name={creator.title}
				handle={creator.instructorId}
				creatorId={creator.id}
				avatarUrl={creator.thumbnail}
				isVerified={creator.isVerified}
				bio={creator.description}
			/>

			<main className="max-w-7xl mx-auto px-6 py-8 md:px-12">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left column - Chart and price info */}
					<div className="lg:col-span-2 space-y-6">
						<div className="bg-white/5 rounded-2xl border border-white/10 p-6">
							<h2 className="text-xl font-bold text-white mb-4">Bonding Curve Price Chart</h2>
							<BondingCurveChart
								currentSupply={currentSupply}
								currentPriceStroops={currentPriceStroops || 0}
								buyQuantity={buyQuantity}
								className="w-full"
							/>
						</div>

						<div className="bg-white/5 rounded-2xl border border-white/10 p-6">
							<h3 className="text-lg font-bold text-white mb-4">About this creator</h3>
							<p className="text-white/70 leading-relaxed">
								{creator.description || 'No description available.'}
							</p>
							<div className="mt-4 flex flex-wrap gap-2">
								<span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
									{creator.category || 'General'}
								</span>
								<span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
									{creator.level || 'Open'}
								</span>
							</div>
						</div>
					</div>

					{/* Right column - Purchase card */}
					<div className="lg:col-span-1">
						<div className="bg-white/5 rounded-2xl border border-white/10 p-6 sticky top-24">
							<h2 className="text-xl font-bold text-white mb-6">Purchase Keys</h2>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-white/80 mb-2">
										Current Price
									</label>
									<div className="text-2xl font-bold text-amber-400">
										{formatCreatorKeyPriceDisplay(creator)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-white/80 mb-2">
										Current Supply
									</label>
									<KeySupplyBadge supply={currentSupply} />
								</div>

								<div>
									<FormInput
										id="buyQuantity"
										label="Quantity to Buy"
										type="number"
										value={buyQuantity}
										onChange={handleBuyQuantityChange}
										className="w-full"
									/>
									<p className="text-xs text-white/40 mt-1">
										Min: {BUY_QUANTITY_BOUNDS.MIN_QTY}, Max: {BUY_QUANTITY_BOUNDS.MAX_QTY}
									</p>
								</div>

								<Button
									onClick={handleBuy}
									disabled={isProcessing || isNetworkMismatch}
									className={cn(
										'w-full rounded-xl font-bold',
										!isConnected && 'border-white/10 hover:bg-white/5'
									)}
									size="lg"
								>
									{isProcessing ? (
										'Processing...'
									) : (
										<>
											<ShoppingCart className="mr-2" />
											Buy {buyQuantity} Key{buyQuantity > 1 ? 's' : ''}
										</>
									)}
								</Button>

								{isNetworkMismatch && (
									<p className="text-xs text-red-400 text-center">
										Switch to {expectedChainName} to enable purchases
									</p>
								)}

								{!isConnected && (
									<p className="text-xs text-white/40 text-center">
										Connect your wallet to purchase keys
									</p>
								)}
							</div>

							<div className="mt-6 pt-6 border-t border-white/10">
								<h3 className="text-sm font-medium text-white/80 mb-3">Price Impact Preview</h3>
								<div className="text-sm text-white/60">
									<p>
										Buying {buyQuantity} key{buyQuantity > 1 ? 's' : ''} will move you along the bonding curve,
										increasing the price for future buyers.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default CreatorDetailPage;
