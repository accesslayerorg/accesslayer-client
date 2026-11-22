import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReferralLinkPanel from '../ReferralLinkPanel';

describe('ReferralLinkPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies generated URL and shows Copied! then resets', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error mock navigator clipboard for test
    navigator.clipboard = { writeText: writeMock };

    render(<ReferralLinkPanel initialKeyId={"alpha"} keys={[{ id: 'alpha' }]} />);

    const btn = screen.getByRole('button', { name: /Copy/i });
    await userEvent.click(btn);

    expect(writeMock).toHaveBeenCalledWith('/keys/alpha?ref=');
    expect(screen.getByText('Copied!')).toBeTruthy();

    vi.advanceTimersByTime(2000);
    expect(screen.queryByText('Copied!')).toBeNull();
  });
});
