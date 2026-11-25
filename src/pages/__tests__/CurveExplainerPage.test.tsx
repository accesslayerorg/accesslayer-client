import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CurveExplainerPage from '@/pages/CurveExplainerPage';
import { useCurveParams } from '@/hooks/useCurveParams';
import { DEFAULT_BONDING_CURVE_PARAMS } from '@/utils/bondingCurve.utils';

vi.mock('@/hooks/useCurveParams', () => ({ useCurveParams: vi.fn() }));
vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: vi.fn() }));

vi.mocked(useCurveParams).mockReturnValue({
	params: DEFAULT_BONDING_CURVE_PARAMS,
	currentSupply: 0,
	protocolFeeBps: 100,
	creatorFeeBps: 200,
	isLoading: false,
	isError: false,
	usingDefaults: true,
});

describe('CurveExplainerPage (#1411)', () => {
	it('walks through the three explainer steps', () => {
		render(<CurveExplainerPage />);
		expect(screen.getByTestId('curve-explainer-step-1')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
		expect(screen.getByTestId('curve-simulator')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
		expect(screen.getByTestId('curve-simulator')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

		fireEvent.click(screen.getByRole('button', { name: 'Back' }));
		fireEvent.click(screen.getByRole('button', { name: 'Back' }));
		expect(screen.getByTestId('curve-explainer-step-1')).toBeInTheDocument();
	});
});
