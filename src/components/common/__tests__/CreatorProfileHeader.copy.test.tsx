import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreatorProfileHeader from '../CreatorProfileHeader';

describe('CreatorProfileHeader clipboard copy', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    // ensure a stable href for tests
    // @ts-expect-error mock window location/clipboard in test environment
    delete window.location;
    // @ts-expect-error mock window location/clipboard in test environment
    window.location = { href: 'https://app.test/creator/42', origin: 'https://app.test' };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // @ts-expect-error mock window location/clipboard in test environment
    window.location = originalLocation;
  });

  it('calls navigator.clipboard.writeText and shows Copied! then resets', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error mock window location/clipboard in test environment
    navigator.clipboard = { writeText: writeMock };

    render(
      <CreatorProfileHeader
        name="Alice"
        handle="alice"
        creatorId={42}
        connectedWalletAddress={null}
      />
    );

    const btn = screen.getByRole('button', { name: /Share profile/i });
    await userEvent.click(btn);

    expect(writeMock).toHaveBeenCalledWith('https://app.test/creator/42');

    // should show confirmation immediately
    expect(screen.getByText('Copied!')).toBeTruthy();

    // advance timers to reset the label
    vi.advanceTimersByTime(2000);

    // confirmation should be gone after timeout
    expect(screen.queryByText('Copied!')).toBeNull();
  });

  it('falls back to prompt when clipboard write fails', async () => {
    const writeMock = vi.fn().mockRejectedValue(new Error('fail'));
    // @ts-expect-error mock window location/clipboard in test environment
    navigator.clipboard = { writeText: writeMock };

    const promptMock = vi.fn();
    // @ts-expect-error mock window location/clipboard in test environment
    window.prompt = promptMock;

    render(
      <CreatorProfileHeader
        name="Bob"
        handle="bob"
        creatorId={123}
        connectedWalletAddress={null}
      />
    );

    const btn = screen.getByRole('button', { name: /Share profile/i });
    await userEvent.click(btn);

    expect(writeMock).toHaveBeenCalledWith('https://app.test/creator/42');
    expect(promptMock).toHaveBeenCalled();

    // should not show Copied! when write fails
    expect(screen.queryByText('Copied!')).toBeNull();
  });
});
