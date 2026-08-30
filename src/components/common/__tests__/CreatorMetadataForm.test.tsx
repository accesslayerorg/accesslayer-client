import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CreatorMetadataForm from '@/components/common/CreatorMetadataForm';

function setup(overrides: Partial<React.ComponentProps<typeof CreatorMetadataForm>> = {}) {
	const onSubmit = vi.fn();
	render(
		<CreatorMetadataForm
			initialName="Ada"
			initialBio="Building on Stellar"
			initialAvatarUri="https://example.com/a.png"
			onSubmit={onSubmit}
			{...overrides}
		/>
	);
	return { onSubmit };
}

const nameInput = () => screen.getByLabelText('Display name') as HTMLInputElement;
const bioInput = () => screen.getByLabelText('Bio') as HTMLTextAreaElement;
const submit = () => screen.getByTestId('metadata-submit');

describe('CreatorMetadataForm (#818)', () => {
	it('pre-fills inputs with the current metadata on mount', () => {
		setup();
		expect(nameInput().value).toBe('Ada');
		expect(bioInput().value).toBe('Building on Stellar');
		expect((screen.getByLabelText('Avatar URI') as HTMLInputElement).value).toBe(
			'https://example.com/a.png'
		);
	});

	it('renders character counters below the name and bio inputs', () => {
		setup();
		expect(screen.getByTestId('metadata-name-counter')).toHaveTextContent('3 / 64');
		expect(screen.getByTestId('metadata-bio-counter')).toHaveTextContent('19 / 256');

		fireEvent.change(nameInput(), { target: { value: 'Ada Lovelace' } });
		expect(screen.getByTestId('metadata-name-counter')).toHaveTextContent('12 / 64');
	});

	it('disables submit with an error when the name exceeds 64 characters', () => {
		setup();
		fireEvent.change(nameInput(), { target: { value: 'a'.repeat(65) } });

		expect(screen.getByTestId('metadata-name-error')).toBeInTheDocument();
		expect(submit()).toBeDisabled();
	});

	it('disables submit with an error when the bio exceeds 256 characters', () => {
		setup();
		fireEvent.change(bioInput(), { target: { value: 'b'.repeat(257) } });

		expect(screen.getByTestId('metadata-bio-error')).toBeInTheDocument();
		expect(submit()).toBeDisabled();
	});

	it('keeps submit disabled until something changes', () => {
		setup();
		expect(submit()).toBeDisabled();

		fireEvent.change(bioInput(), { target: { value: 'New bio' } });
		expect(submit()).toBeEnabled();
	});

	it('submits only the fields that changed', () => {
		const { onSubmit } = setup();

		fireEvent.change(bioInput(), { target: { value: 'A brand new bio' } });
		fireEvent.click(submit());

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({ bio: 'A brand new bio' });
	});

	it('submits multiple changed fields together', () => {
		const { onSubmit } = setup();

		fireEvent.change(nameInput(), { target: { value: 'Ada L' } });
		fireEvent.change(screen.getByLabelText('Avatar URI'), {
			target: { value: 'https://example.com/new.png' },
		});
		fireEvent.click(submit());

		expect(onSubmit).toHaveBeenCalledWith({
			name: 'Ada L',
			avatarUri: 'https://example.com/new.png',
		});
	});
});
