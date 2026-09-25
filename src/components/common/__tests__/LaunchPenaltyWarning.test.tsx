import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LaunchPenaltyWarning from '@/components/common/LaunchPenaltyWarning';

describe('LaunchPenaltyWarning', () => {
	it('renders nothing when not visible', () => {
		const { container } = render(
			<LaunchPenaltyWarning visible={false} penaltyBps={500} />
		);

		expect(container.firstChild).toBeNull();
	});

	it('renders the warning with the penalty percentage when visible', () => {
		render(<LaunchPenaltyWarning visible={true} penaltyBps={500} />);

		const warning = screen.getByTestId('launch-penalty-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent('Early sell penalty applies');
		expect(warning).toHaveTextContent('will be deducted from your proceeds');
		expect(screen.getByTestId('launch-penalty-rate')).toHaveTextContent('5%');
	});

	it('formats fractional penalty percentages', () => {
		render(<LaunchPenaltyWarning visible={true} penaltyBps={333} />);

		expect(screen.getByTestId('launch-penalty-rate')).toHaveTextContent(
			'3.33%'
		);
	});

	it('has an alert role so assistive tech announces it', () => {
		render(<LaunchPenaltyWarning visible={true} penaltyBps={500} />);

		expect(screen.getByTestId('launch-penalty-warning')).toHaveAttribute(
			'role',
			'alert'
		);
	});
});
