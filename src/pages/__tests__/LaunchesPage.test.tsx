import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LaunchesPage from '@/pages/LaunchesPage';
import { useLaunches } from '@/hooks/useLaunches';
import { toLaunch } from '@/utils/launch.utils';
import type { Course } from '@/services/course.service';

vi.mock('@/hooks/useLaunches', () => ({ useLaunches: vi.fn() }));
vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: vi.fn() }));

const mockedUseLaunches = vi.mocked(useLaunches);
const recentLaunch = toLaunch(
	{
		id: 'recent-key',
		title: 'Recent Key',
		description: '',
		price: 1,
		instructorId: 'creator',
		category: 'Art',
		level: 'BEGINNER',
		createdAt: '2026-01-01T00:00:00Z',
	} as Course,
	new Date('2026-06-10T12:00:00Z').getTime()
)!;

describe('LaunchesPage (#1409)', () => {
	beforeEach(() => {
		mockedUseLaunches.mockImplementation(tab => ({
			allLaunches: [recentLaunch],
			launches: tab === 'recent' ? [recentLaunch] : [],
			nowMs: new Date('2026-06-10T12:00:00Z').getTime(),
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		}));
	});

	it('shows tab-specific empty messages and launches', async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<LaunchesPage />
			</MemoryRouter>
		);

		expect(screen.getByTestId('launch-panel-live')).toHaveTextContent(
			'No keys are live right now'
		);
		await user.click(screen.getByTestId('launch-tab-recent'));
		expect(screen.getByTestId('launch-grid-recent')).toHaveTextContent(
			'Recent Key'
		);
	});
});
