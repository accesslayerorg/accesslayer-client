import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplyCapProgress from '../SupplyCapProgress';

describe('SupplyCapProgress', () => {
    it('renders nothing when cap is null', () => {
        const { container } = render(<SupplyCapProgress current={50} cap={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when cap is zero', () => {
        const { container } = render(<SupplyCapProgress current={50} cap={0} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when cap is undefined', () => {
        const { container } = render(<SupplyCapProgress current={50} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows correct percent for a partial fill', () => {
        render(<SupplyCapProgress current={25} cap={100} />);
        expect(screen.getByTestId('supply-cap-progress-percent')).toHaveTextContent('25%');
        expect(screen.getByTestId('supply-cap-progress-current')).toHaveTextContent(/25/);
        expect(screen.getByTestId('supply-cap-progress-current')).toHaveTextContent(/100/);
    });

    it('shows sold-out badge when current equals cap', () => {
        render(<SupplyCapProgress current={100} cap={100} />);
        expect(screen.getByTestId('supply-cap-progress-sold-out-badge')).toBeInTheDocument();
        expect(screen.getByTestId('supply-cap-progress-percent')).toHaveTextContent('100%');
        expect(screen.getByTestId('supply-cap-progress-remaining')).toHaveTextContent(/No keys remaining/);
    });

    it('shows sold-out badge when current exceeds cap', () => {
        render(<SupplyCapProgress current={120} cap={100} />);
        expect(screen.getByTestId('supply-cap-progress-sold-out-badge')).toBeInTheDocument();
        expect(screen.getByTestId('supply-cap-progress-percent')).toHaveTextContent('100%');
    });

    it('caps the progress bar width at 100%', () => {
        render(<SupplyCapProgress current={150} cap={100} />);
        const fill = screen.getByTestId('supply-cap-progress-fill');
        expect(fill).toHaveStyle({ width: '100%' });
    });

    it('shows loading skeleton without rendering the bar', () => {
        render(<SupplyCapProgress current={50} cap={100} isLoading />);
        expect(screen.getByTestId('supply-cap-progress-loading')).toBeInTheDocument();
        expect(screen.queryByTestId('supply-cap-progress')).not.toBeInTheDocument();
    });

    it('shows error state when isError', () => {
        render(<SupplyCapProgress current={50} cap={100} isError />);
        expect(screen.getByTestId('supply-cap-progress-error')).toBeInTheDocument();
    });
});