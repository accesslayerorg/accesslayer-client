import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VerificationApplicationWizard from '@/components/creator/VerificationApplicationWizard';
import type { VerificationApplicationDraft } from '@/services/creatorVerification.service';

const draft: VerificationApplicationDraft = {
	legalName: '',
	socialUrls: [''],
	proofCode: 'AL-ABC123',
};

const validDraft: VerificationApplicationDraft = {
	legalName: 'Ada Lovelace',
	socialUrls: ['https://x.com/ada'],
	proofCode: 'AL-ABC123',
};

function renderWizard(
	overrides: Partial<React.ComponentProps<typeof VerificationApplicationWizard>> = {}
) {
	const props = {
		draft,
		onDraftChange: vi.fn(),
		onSubmit: vi.fn(),
		isSubmitting: false,
		...overrides,
	};
	return { ...render(<VerificationApplicationWizard {...props} />), props };
}

describe('VerificationApplicationWizard (#1410)', () => {
	it('requires valid fields before submitting the application', async () => {
		const user = userEvent.setup();
		const { props } = renderWizard();

		await user.click(screen.getByRole('button', { name: 'Continue' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Enter your full legal name.');
		expect(screen.getByTestId('verification-step-identity')).toBeInTheDocument();

		await user.type(screen.getByLabelText('Legal name'), 'Ada Lovelace');
		expect(props.onDraftChange).toHaveBeenCalled();
	});

	it('shows proof check status after the creator posts the code', async () => {
		const user = userEvent.setup();
		const onCheckProof = vi.fn();
		const { rerender } = renderWizard({ draft: validDraft, onCheckProof });
		await user.click(screen.getByRole('button', { name: 'Continue' }));

		expect(screen.getByTestId('verification-proof-code')).toHaveTextContent(
			'AL-ABC123'
		);
		await user.click(screen.getByTestId('verification-check-proof'));
		expect(onCheckProof).toHaveBeenCalledOnce();

		rerender(
			<VerificationApplicationWizard
				draft={validDraft}
				onDraftChange={vi.fn()}
				onSubmit={vi.fn()}
				isSubmitting={false}
				onCheckProof={onCheckProof}
				proofCheck={{ status: 'verified', checkedAt: '2026-06-02T00:00:00Z' }}
			/>
		);
		expect(screen.getByTestId('verification-proof-check-state')).toHaveTextContent(
			'Proof verified at'
		);
	});
});
