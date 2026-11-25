import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VerificationStatusCard from '@/components/creator/VerificationStatusCard';
import type {
	VerificationApplication,
	VerificationStatus,
} from '@/services/creatorVerification.service';

function application(status: VerificationStatus): VerificationApplication {
	return {
		id: 'app-1',
		status,
		legalName: 'Ada Lovelace',
		socialUrls: ['https://x.com/ada'],
		proofCode: 'AL-123456',
		proofVerified: status === 'approved',
		reviewerNote: status === 'rejected' ? 'Proof post not found' : null,
		submittedAt: '2026-06-01T00:00:00Z',
		updatedAt: '2026-06-02T00:00:00Z',
	};
}

describe('VerificationStatusCard (#1410)', () => {
	it.each<VerificationStatus>(['submitted', 'in_review', 'approved', 'rejected'])(
		'displays the %s status with timestamps',
		status => {
			render(<VerificationStatusCard application={application(status)} />);
			expect(screen.getByTestId('verification-status')).toHaveTextContent(
				status === 'in_review' ? 'In review' : status[0].toUpperCase() + status.slice(1)
			);
			expect(screen.getByTestId('verification-submitted-at')).toBeInTheDocument();
			expect(screen.getByTestId('verification-updated-at')).toBeInTheDocument();
		}
	);

	it('shows the reviewer note and resubmit action when rejected', () => {
		const onResubmit = vi.fn();
		render(
			<VerificationStatusCard
				application={application('rejected')}
				onResubmit={onResubmit}
			/>
		);
		expect(screen.getByTestId('verification-reviewer-note')).toHaveTextContent(
			'Proof post not found'
		);
		screen.getByTestId('verification-resubmit-button').click();
		expect(onResubmit).toHaveBeenCalledOnce();
	});

	it('shows the verified badge when approved', () => {
		render(<VerificationStatusCard application={application('approved')} />);
		expect(screen.getByTestId('verification-proof-state')).toHaveTextContent(
			'Verified'
		);
		expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(2);
	});
});
