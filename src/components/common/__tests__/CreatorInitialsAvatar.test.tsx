import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { getFallbackAvatarColors } from '@/utils/avatarColor.util';

describe('CreatorInitialsAvatar', () => {
	it('uses deterministic fallback colors for the same creator id', () => {
		const first = getFallbackAvatarColors('creator-123');
		const second = getFallbackAvatarColors('creator-123');
		const third = getFallbackAvatarColors('creator-456');

		expect(first).toEqual(second);
		expect(first.background).not.toBe(third.background);
		expect(first.textColor).toBe('rgba(255, 255, 255, 0.95)');
	});

	it('renders initials fallback with hashed background when image is missing', () => {
		render(<CreatorInitialsAvatar name="Alex Rivers" creatorId="creator-123" />);

		const initials = screen.getByLabelText('Alex Rivers initials avatar');
		const avatar = initials.parentElement;
		const colors = getFallbackAvatarColors('creator-123');

		expect(initials).toHaveTextContent('AR');
		expect(avatar).toHaveStyle({
			background: colors.background,
			color: colors.textColor,
		});
	});
});
