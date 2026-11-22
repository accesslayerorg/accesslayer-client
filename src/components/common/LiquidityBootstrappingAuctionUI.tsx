import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader, TrendingUp, Zap, Clock } from 'lucide-react';
import showToast from '@/utils/toast.util';

interface AuctionBidFormData {
  bidAmount: number;
}

interface AuctionPhase {
  name: string;
  startPrice: number;
  endPrice: number;
  duration: number;
  priceMultiplier: number;
}

interface LiquidityBootstrappingAuctionUIProps {
  keyId: string;
  keyName: string;
  auctionId: string;
  startTime: Date;
  endTime: Date;
  totalTokensAvailable: number;
  initialStartPrice: number;
  finalEndPrice: number;
  tokensSold?: number;
  onBidPlaced?: (bidAmount: number) => void;
}

const AUCTION_PHASES: AuctionPhase[] = [
  {
    name: 'Phase 1: Premium Launch',
    startPrice: 1.0,
    endPrice: 0.75,
    duration: 24,
    priceMultiplier: 0.9,
  },
  {
    name: 'Phase 2: Growth Phase',
    startPrice: 0.75,
    endPrice: 0.5,
    duration: 24,
    priceMultiplier: 0.85,
  },
  {
    name: 'Phase 3: Distribution',
    startPrice: 0.5,
    endPrice: 0.3,
    duration: 24,
    priceMultiplier: 0.8,
  },
];

export default function LiquidityBootstrappingAuctionUI({
  keyName,
  startTime,
  endTime,
  totalTokensAvailable,
  initialStartPrice,
  finalEndPrice,
  tokensSold = 0,
  onBidPlaced,
}: LiquidityBootstrappingAuctionUIProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentPrice, setCurrentPrice] = useState(initialStartPrice);
  const [isLoading, setIsLoading] = useState(false);
  const [showBidForm, setShowBidForm] = useState(false);
  const { register, handleSubmit, watch } = useForm<AuctionBidFormData>({
    defaultValues: { bidAmount: 1 },
  });

  const bidAmount = watch('bidAmount');
  const maxTokensForBid = bidAmount / currentPrice;
  const progressPercent = (tokensSold / totalTokensAvailable) * 100;

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = new Date(endTime).getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Simulate price decay over time
  useEffect(() => {
    const updatePrice = () => {
      const now = new Date();
      const started = new Date(startTime);
      const elapsed = now.getTime() - started.getTime();
      const total = new Date(endTime).getTime() - started.getTime();
      const progress = Math.min(elapsed / total, 1);

      const newPrice = initialStartPrice - (initialStartPrice - finalEndPrice) * progress;
      setCurrentPrice(Math.max(newPrice, finalEndPrice));
    };

    updatePrice();
    const interval = setInterval(updatePrice, 5000);
    return () => clearInterval(interval);
  }, [startTime, endTime, initialStartPrice, finalEndPrice]);

  const handlePlaceBid = async (data: AuctionBidFormData) => {
    if (data.bidAmount <= 0) {
      showToast.error('Bid amount must be greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with LBA auction service
      // const result = await placeLBABid({
      //   auctionId,
      //   bidAmount: data.bidAmount,
      // });

      showToast.success(
        `Bid placed! You will receive ${maxTokensForBid.toFixed(2)} tokens.`
      );
      setShowBidForm(false);
      onBidPlaced?.(data.bidAmount);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to place bid');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Liquidity Bootstrapping Auction</CardTitle>
                <CardDescription>{keyName} Token Launch</CardDescription>
              </div>
            </div>
            <Badge className="bg-blue-600">Live</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold text-blue-600">${currentPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground">Starting Price</p>
              <p className="text-lg font-semibold">${initialStartPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Sale Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Tokens Sold</p>
              <p className="text-sm font-bold text-blue-600">
                {tokensSold.toLocaleString()} / {totalTokensAvailable.toLocaleString()}
              </p>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercent.toFixed(1)}% sold</p>
          </div>

          {/* Countdown Timer */}
          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-semibold">Time Remaining</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{timeRemaining.days}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{timeRemaining.hours}</p>
                <p className="text-xs text-muted-foreground">Hours</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{timeRemaining.minutes}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{timeRemaining.seconds}</p>
                <p className="text-xs text-muted-foreground">Seconds</p>
              </div>
            </div>
          </div>

          {/* Auction Phases Information */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Auction Phases</p>
            <div className="space-y-2">
              {AUCTION_PHASES.map((phase, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-white p-2 text-xs border border-gray-200"
                >
                  <p className="font-semibold text-gray-900">{phase.name}</p>
                  <p className="text-gray-600">
                    ${phase.startPrice.toFixed(2)} → ${phase.endPrice.toFixed(2)} ({phase.duration}h)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bidding Form */}
      <Card>
        <CardHeader>
          <CardTitle>Place Your Bid</CardTitle>
          <CardDescription>
            Participate in the LBA and secure {keyName} tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showBidForm ? (
            <Button onClick={() => setShowBidForm(true)} className="w-full" size="lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Bidding
            </Button>
          ) : (
            <form onSubmit={handleSubmit(handlePlaceBid)} className="space-y-4">
              <Alert>
                <AlertDescription>
                  At current price of ${currentPrice.toFixed(4)}, your bid will get{' '}
                  <strong>{maxTokensForBid.toFixed(2)}</strong> tokens.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="bidAmount">Bid Amount (USD)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('bidAmount', {
                    required: 'Bid amount is required',
                    min: { value: 0.01, message: 'Minimum bid is $0.01' },
                  })}
                  className="mt-1"
                />
              </div>

              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tokens to receive:</span>
                  <span className="font-bold">{maxTokensForBid.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                  Place Bid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBidForm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
