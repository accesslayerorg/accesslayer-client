import React from 'react';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';
import { Tooltip } from '@/components/ui/tooltip';

type TransactionStatus = 'success' | 'pending' | 'failed';

interface TransactionStatusBadgeProps {
	status: TransactionStatus;
	className?: string;
}

const statusDescriptions: Record<TransactionStatus, string> = {
	success: 'Transaction completed successfully',
	pending: 'Transaction is being processed',
	failed: 'Transaction failed or was rejected',
};

const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({
	status,
	className,
}) => {
	return (
		<Tooltip content={statusDescriptions[status]}>
			<TransactionStatusIcon status={status} className={className} />
		</Tooltip>
	);
};

export default TransactionStatusBadge;
