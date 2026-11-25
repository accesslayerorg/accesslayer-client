import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import LaunchCalendar from '@/components/common/LaunchCalendar';
import { toLaunch } from '@/utils/launch.utils';
import type { Course } from '@/services/course.service';

function makeLaunch(id: string, iso: string) {
	const course: Course = {
		id,
		title: `Launch ${id}`,
		description: '',
		price: 1,
		instructorId: 'creator',
		category: 'Art',
		level: 'BEGINNER',
		createdAt: iso,
	};
	return toLaunch(course, new Date('2026-06-01T00:00:00Z').getTime())!;
}

function renderCalendar() {
	return render(
		<MemoryRouter>
			<LaunchCalendar
				launches={[
					makeLaunch('june15', '2026-06-15T10:00:00Z'),
					makeLaunch('june20', '2026-06-20T10:00:00Z'),
				]}
				initialMonth={new Date(2026, 5, 1)}
			/>
		</MemoryRouter>
	);
}

describe('LaunchCalendar (#1409)', () => {
	it('renders launches on their calendar days and in the mobile list', () => {
		renderCalendar();

		expect(screen.getByTestId('launch-calendar-grid')).toBeInTheDocument();
		expect(
			screen.getByTestId('launch-calendar-day-2026-06-15')
		).toContainElement(screen.getByTestId('launch-calendar-event-june15'));
		expect(
			screen.getByTestId('launch-calendar-day-2026-06-14')
		).not.toContainElement(screen.getByTestId('launch-calendar-event-june15'));
		expect(screen.getByTestId('launch-calendar-list')).toContainElement(
			screen.getByTestId('launch-calendar-list-item-june15')
		);
	});

	it('navigates between months', () => {
		renderCalendar();
		expect(screen.getByTestId('launch-calendar-month')).toHaveTextContent('June 2026');
		fireEvent.click(screen.getByTestId('launch-calendar-next'));
		expect(screen.getByTestId('launch-calendar-month')).toHaveTextContent('July 2026');
		fireEvent.click(screen.getByTestId('launch-calendar-previous'));
		expect(screen.getByTestId('launch-calendar-month')).toHaveTextContent('June 2026');
	});
});
