import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExportDateRangeSelector } from '@/components/common/ExportDateRangeSelector';

describe('ExportDateRangeSelector (#1256)', () => {
	it('renders with current preset label', () => {
		render(
			<ExportDateRangeSelector
				preset="30d"
				customRange={{ start: '', end: '' }}
				onPresetChange={vi.fn()}
				onCustomRangeChange={vi.fn()}
			/>
		);

		expect(screen.getByRole('button', { name: /30 days/i })).toBeInTheDocument();
	});

	it('opens dropdown when clicked', () => {
		render(
			<ExportDateRangeSelector
				preset="30d"
				customRange={{ start: '', end: '' }}
				onPresetChange={vi.fn()}
				onCustomRangeChange={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /30 days/i }));

		expect(screen.getByRole('option', { name: /30 days/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /90 days/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /1 year/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /All time/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /Custom range/i })).toBeInTheDocument();
	});

	it('calls onPresetChange when preset selected', () => {
		const onPresetChange = vi.fn();
		render(
			<ExportDateRangeSelector
				preset="30d"
				customRange={{ start: '', end: '' }}
				onPresetChange={onPresetChange}
				onCustomRangeChange={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /30 days/i }));
		fireEvent.click(screen.getByRole('option', { name: /90 days/i }));

		expect(onPresetChange).toHaveBeenCalledWith('90d');
	});

	it('shows custom range inputs when custom is selected', () => {
		const onPresetChange = vi.fn();
		const onCustomRangeChange = vi.fn();
		render(
			<ExportDateRangeSelector
				customRange={{ start: '', end: '' }}
				onPresetChange={onPresetChange}
				onCustomRangeChange={onCustomRangeChange}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /30 days/i }));
		fireEvent.click(screen.getByRole('option', { name: /Custom range/i }));

		expect(screen.getByTestId('export-date-from')).toBeInTheDocument();
		expect(screen.getByTestId('export-date-to')).toBeInTheDocument();
	});

	it('calls onCustomRangeChange when date inputs change', async () => {
		const onPresetChange = vi.fn();
		const onCustomRangeChange = vi.fn();
		render(
			<ExportDateRangeSelector
				customRange={{ start: '', end: '' }}
				onPresetChange={onPresetChange}
				onCustomRangeChange={onCustomRangeChange}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /30 days/i }));
		fireEvent.click(screen.getByRole('option', { name: /Custom range/i }));

		// Test that changing the from date calls the callback
		fireEvent.change(screen.getByTestId('export-date-from'), { target: { value: '2026-01-01' } });
		await waitFor(() => expect(onCustomRangeChange).toHaveBeenCalled());

		// Test that changing the to date calls the callback
		fireEvent.change(screen.getByTestId('export-date-to'), { target: { value: '2026-01-31' } });
		await waitFor(() => expect(onCustomRangeChange).toHaveBeenCalledTimes(2));
	});

	it('marks current preset as selected', () => {
		render(
			<ExportDateRangeSelector
				preset="90d"
				customRange={{ start: '', end: '' }}
				onPresetChange={vi.fn()}
				onCustomRangeChange={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /90 days/i }));

		expect(screen.getByRole('option', { name: /90 days/i })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('option', { name: /30 days/i })).toHaveAttribute('aria-selected', 'false');
	});
});