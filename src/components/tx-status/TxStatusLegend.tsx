import React, { useState, useRef, useEffect } from 'react';

export type TxStatus = 'pending' | 'success' | 'failed' | 'processing';

interface StatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const STATUS_MAP: Record<TxStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    description: 'Transaction submitted, awaiting confirmation',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  processing: {
    label: 'Processing',
    description: 'Transaction is being processed on-chain',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  success: {
    label: 'Success',
    description: 'Transaction confirmed and finalized',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  failed: {
    label: 'Failed',
    description: 'Transaction reverted or failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

export function TxStatusLegend(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on Escape and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    // Focus trap: focus first focusable element in tooltip
    tooltipRef.current?.querySelector<HTMLElement>('button, [href]')?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleTooltip = () => setIsOpen((prev) => !prev);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleTooltip}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-expanded={isOpen}
        aria-controls="tx-status-legend"
        aria-label="Transaction status legend"
      >
        <svg
          className="h-4 w-4 text-gray-500 dark:text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Status Legend
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          id="tx-status-legend"
          role="dialog"
          aria-label="Transaction status explanations"
          className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Status Meanings
            </h3>
            <button
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Close legend"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ul className="space-y-2.5" role="list">
            {(Object.entries(STATUS_MAP) as [TxStatus, StatusConfig][]).map(([key, config]) => (
              <li key={key} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 inline-flex h-5 min-w-[4.5rem] items-center justify-center rounded-full px-2 text-xs font-medium ${config.bgColor} ${config.color}`}
                >
                  {config.label}
                </span>
                <span className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                  {config.description}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
            Press <kbd className="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">Esc</kbd> to close
          </p>
        </div>
      )}
    </div>
  );
}