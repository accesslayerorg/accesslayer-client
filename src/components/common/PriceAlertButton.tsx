import { useState } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import PriceAlertModal from './PriceAlertModal';
import { useCreatePriceAlert } from '@/hooks/usePriceAlerts';

export interface PriceAlertButtonProps {
	userId?: string;
	keyId: string;
	keyName: string;
	/** Current key price in stroops. */
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

	const handleSubmit = async (input: {
		targetPrice: number;
		direction: 'above' | 'below';
	}) => {
		setSubmitError(null);
		try {
			await createAlert.mutateAsync({
				keyId,
				keyName,
				targetPrice: input.targetPrice,
				direction: input.direction,
			});
			toast.success(`Price alert set for ${keyName}`);
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
			>
				<Bell className="size-4" aria-hidden="true" />
				Set price alert
			</Button>
			<PriceAlertModal
				open={open}
				onOpenChange={setOpen}
				keyId={keyId}
				keyName={keyName}
				currentPrice={currentPrice / STROOPS_PER_XLM}
				onSubmit={handleSubmit}
				isSubmitting={createAlert.isPending}
				submitError={submitError}
			/>
		</>
	);
}

export default PriceAlertButton;
