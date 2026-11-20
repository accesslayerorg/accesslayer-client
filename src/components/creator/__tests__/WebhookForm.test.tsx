import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebhookForm, validateWebhookUrl } from '../WebhookForm';
import { DeliveryLog, isSuccessStatus } from '../DeliveryLog';
import * as webhooks from '../../../services/webhooks';

vi.mock('../../../services/webhooks', async () => {
  const actual = await vi.importActual<typeof import('../../../services/webhooks')>(
    '../../../services/webhooks',
  );
  return {
    ...actual,
    createWebhook: vi.fn(),
    listDeliveries: vi.fn(),
    redeliver: vi.fn(),
  };
});

describe('validateWebhookUrl', () => {
  it('rejects empty input', () => {
    expect(validateWebhookUrl('')).toBe('URL is required');
  });

  it('rejects non-HTTPS URLs', () => {
    expect(validateWebhookUrl('http://example.org/hook')).toBe('Webhook URL must use HTTPS');
  });

  it('rejects malformed URLs', () => {
    expect(validateWebhookUrl('not a url')).toBe('Enter a valid URL');
  });

  it('accepts HTTPS URLs', () => {
    expect(validateWebhookUrl('https://hooks.example.org/abc')).toBeNull();
  });
});

describe('WebhookForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an inline error for non-HTTPS URLs and does not submit', async () => {
    const onCreated = vi.fn();
    render(<WebhookForm onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'http://insecure.org/hook' },
    });
    fireEvent.click(screen.getByLabelText('key.bought'));
    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Webhook URL must use HTTPS');
    expect(webhooks.createWebhook).not.toHaveBeenCalled();
  });

  it('requires at least one event', async () => {
    render(<WebhookForm onCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'https://hooks.example.org/abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));
    expect(await screen.findByText('Select at least one event')).toBeInTheDocument();
    expect(webhooks.createWebhook).not.toHaveBeenCalled();
  });

  it('submits valid input and passes the created webhook to the parent', async () => {
    const created = {
      id: 'wh_1',
      url: 'https://hooks.example.org/abc',
      events: ['key.sold'] as const,
      createdAt: '2024-01-01T00:00:00Z',
      secret: 'whsec_test',
    };
    vi.mocked(webhooks.createWebhook).mockResolvedValue({ ...created, events: ['key.sold'] });
    const onCreated = vi.fn();
    render(<WebhookForm onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'https://hooks.example.org/abc' },
    });
    fireEvent.click(screen.getByLabelText('key.sold'));
    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(webhooks.createWebhook).toHaveBeenCalledWith({
      url: 'https://hooks.example.org/abc',
      events: ['key.sold'],
    });
  });
});

describe('isSuccessStatus', () => {
  it('treats only 2xx as success', () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(500)).toBe(false);
    expect(isSuccessStatus(null)).toBe(false);
  });
});

describe('DeliveryLog rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status codes and highlights non-2xx rows', async () => {
    vi.mocked(webhooks.listDeliveries).mockResolvedValue([
      { id: 'd1', webhookId: 'wh_1', event: 'key.bought', statusCode: 200, timestamp: '2024-01-01T00:00:00Z' },
      { id: 'd2', webhookId: 'wh_1', event: 'key.sold', statusCode: 500, timestamp: '2024-01-01T00:01:00Z' },
    ]);
    render(<DeliveryLog webhookId="wh_1" />);

    const rows = await screen.findAllByTestId('delivery-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-failed', 'false');
    expect(rows[1]).toHaveAttribute('data-failed', 'true');
    expect(rows[1]).toHaveTextContent('500');
  });

  it('redelivers and prepends a new delivery entry', async () => {
    vi.mocked(webhooks.listDeliveries).mockResolvedValue([
      { id: 'd1', webhookId: 'wh_1', event: 'key.bought', statusCode: 500, timestamp: '2024-01-01T00:00:00Z' },
    ]);
    vi.mocked(webhooks.redeliver).mockResolvedValue({
      id: 'd2',
      webhookId: 'wh_1',
      event: 'key.bought',
      statusCode: 200,
      timestamp: '2024-01-01T00:05:00Z',
    });
    render(<DeliveryLog webhookId="wh_1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Redeliver' }));

    await waitFor(() => expect(screen.getAllByTestId('delivery-row')).toHaveLength(2));
    expect(webhooks.redeliver).toHaveBeenCalledWith('wh_1', 'd1');
  });
});
