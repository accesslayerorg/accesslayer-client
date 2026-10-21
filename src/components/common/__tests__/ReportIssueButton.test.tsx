import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportIssueButton from '@/components/common/ReportIssueButton';

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('ReportIssueButton (#1250)', () => {
	it('opens the support ticket dialog when clicked', () => {
		render(<ReportIssueButton keyId="key-1" keyName="Luna Starlight" />, {
			wrapper: makeWrapper(),
		});

		expect(screen.queryByTestId('support-ticket-dialog')).not.toBeInTheDocument();
		fireEvent.click(screen.getByTestId('report-issue-button'));
		expect(screen.getByTestId('support-ticket-dialog')).toBeInTheDocument();
		expect(
			screen.getByText(/Report a problem with Luna Starlight/)
		).toBeInTheDocument();
	});
});
