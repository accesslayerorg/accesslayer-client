import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PriceAlertModal from './PriceAlertModal';
import { useCreatePriceAlert } from '@/hooks/usePriceAlerts';

export interface PriceAlertButtonProps {
        userId: string | undefined;
        keyId: string;
        keyName: string;
        currentPrice: number;
        className?: string;
}

export function PriceAlertButton({
        userId,
        keyId,
        keyName,
        currentPrice,
        className,
}: PriceAlertButtonProps) {
        const [open, setOpen] = useState(false);
        const [submitError, setSubmitError] = useState<string | null>(null);
        const createAlert = useCreatePriceAlert(userId);

        const handleSubmit = async (input: { targetPrice: number; direction: 'above' | 'below' }) => {
                setSubmitError(null);
                try {
                        await createAlert.mutateAsync({
                                keyId,
                                keyName,
                                targetPrice: input.targetPrice,
                                direction: input.direction,
                        });
                        setOpen(false);
                } catch (err) {
                        setSubmitError((err as Error).message ?? 'Could not create alert.');
                }
        };

        return (
                <>
                        <Button
                                type="button"
                                variant="outline"
                                className={className}
                                data-testid="set-price-alert-button"
                                onClick={() => {
                                        setSubmitError(null);
                                        setOpen(true);
                                }}
                                disabled={!userId}
                        >
                                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                                Set price alert
                        </Button>
                        <PriceAlertModal
                                open={open}
                                onOpenChange={setOpen}
                                keyId={keyId}
                                keyName={keyName}
                                currentPrice={currentPrice}
                                onSubmit={handleSubmit}
                                isSubmitting={createAlert.isPending}
                                submitError={submitError}
                        />
                </>
        );
}

export default PriceAlertButton;
