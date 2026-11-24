import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LaunchCard from '@/components/common/LaunchCard';
import { LAUNCH_REMINDERS_STORAGE_KEY } from '@/lib/launchReminderStorage';
import { toLaunch } from '@/utils/launch.utils';
import type { Course } from '@/services/course.service';

vi.mock('@/utils/toast.util', () => ({
	default: { message: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const notificationSpy = vi.fn();
const MockNotification = Object.assign(vi.fn(notificationSpy), {
	permission: 'granted',
	requestPermission: vi.fn(async () => 'granted'),
});

function makeLaunch(auctionEndsAt: string) {
	const course: Course = {
		id: 'flip',
		title: 'Flip Key',
		description: '',
		price: 1,
		instructorId: 'creator-1',
		category: 'Art',
		level: 'BEGINNER',
		auctionEndsAt,
		auctionPrice: 10,
	};
	return toLaunch(course, new Date('2026-06-10T12:00:00Z').getTime())!;
}

function renderCard(startIso: string, nowIso: string) {
	const launch = makeLaunch(startIso);
	return render(
		<MemoryRouter>
			<LaunchCard
				launch={launch}
				nowMs={new Date(nowIso).getTime()}
			/>
		</MemoryRouter>
	);
}

describe('LaunchCard (#1409)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		vi.stubGlobal('Notification', MockNotification);
	});

	it('shows creator, start time, phase, countdown and key links', () => {
		renderCard('2026-06-10T13:00:00Z', '2026-06-10T12:00:00Z');

		expect(screen.getByText('by creator-1')).toBeInTheDocument();
		expect(screen.getByTestId('launch-phase')).toHaveTextContent('Pre-launch auction');
		expect(screen.getByTestId('launch-countdown')).toHaveTextContent('Launches in 1h 0m 0s');
		expect(screen.getByTestId('launch-key-link')).toHaveAttribute('href', '/keys/flip');
		expect(screen.getByTestId('launch-commit-reveal-link')).toHaveAttribute(
			'href',
			'/keys/flip#commit-reveal'
		);
	});

	it('stores a local reminder and reflects notification permission', () => {
		renderCard('2026-06-10T13:00:00Z', '2026-06-10T12:00:00Z');
		const button = screen.getByTestId('launch-remind-button');
		expect(button).toHaveAttribute('aria-pressed', 'false');

		fireEvent.click(button);

		expect(button).toHaveAttribute('aria-pressed', 'true');
		expect(window.localStorage.getItem(LAUNCH_REMINDERS_STORAGE_KEY)).toContain(
			'"keyId":"flip"'
		);
		expect(MockNotification.requestPermission).not.toHaveBeenCalled();

		fireEvent.click(button);
		expect(button).toHaveAttribute('aria-pressed', 'false');
		expect(window.localStorage.getItem(LAUNCH_REMINDERS_STORAGE_KEY)).not.toContain(
			'"keyId":"flip"'
		);
	});

	it('does not show a countdown once the launch is live', () => {
		renderCard('2026-06-10T13:00:00Z', '2026-06-10T13:01:00Z');
		expect(screen.queryByTestId('launch-countdown')).not.toBeInTheDocument();
		expect(screen.getByTestId('launch-phase')).toHaveTextContent('Live now');
	});
});
