import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { HelpCircle, X, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

export type TxStatus = 'pending' | 'success' | 'failed' | 'processing';

interface TransactionStatusBadgeProps {
  status: TxStatus;
  className?: string;
  showLegend?: boolean;
}

const statusConfig: Record<TxStatus, { label: string; icon: React.ReactNode; bgColor: string; textColor: string; dotColor: string }> = {
  pending: { label: 'Pending', icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />, bgColor: 'bg-amber-50', textColor: 'text-amber-700', dotColor: 'bg-amber-400' },
  processing: { label: 'Processing', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />, bgColor: 'bg-blue-50', textColor: 'text-blue-700', dotColor: 'bg-blue-400' },
  success: { label: 'Success', icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />, bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500' },
  failed: { label: 'Failed', icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />, bgColor: 'bg-red-50', textColor: 'text-red-700', dotColor: 'bg-red-500' },
};

const legendItems = [
  { status: 'pending' as TxStatus, label: 'Pending', description: 'Transaction submitted, awaiting confirmation.' },
  { status: 'processing' as TxStatus, label: 'Processing', description: 'Being validated on the Stellar network.' },
  { status: 'success' as TxStatus, label: 'Success', description: 'Confirmed and recorded on-chain.' },
  { status: 'failed' as TxStatus, label: 'Failed', description: 'Rejected or reverted. Funds returned.' },
];

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({ status, className, showLegend = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const config = statusConfig[status];

  const closeTooltip = useCallback(() => setIsOpen(false), []);
  const toggleTooltip = useCallback(() => setIsOpen((p) => !p), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) { closeTooltip(); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeTooltip]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        closeTooltip();
      }
    };
    if (isOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [isOpen, closeTooltip]);

  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;
    const focusable = tooltipRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0], last = focusable[focusable.length - 1];
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleTab);
    first?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <div className={cn('relative inline-flex items-center gap-2', className)}>
      <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bgColor, config.textColor)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
        {config.icon}
        <span>{config.label}</span>
      </div>
      {showLegend && (
        <>
          <button ref={triggerRef} onClick={toggleTooltip} className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-150')} aria-label="Transaction status legend" aria-expanded={isOpen} aria-controls="tx-status-legend" type="button">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {isOpen && (
            <div ref={tooltipRef} id="tx-status-legend" role="dialog" aria-label="Transaction status legend" className={cn('absolute z-50 top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-4')}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Status Guide</h4>
                <button onClick={closeTooltip} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close legend" type="button">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-2.5" role="list">
                {legendItems.map((item) => {
                  const c = statusConfig[item.status];
                  return (
                    <div key={item.status} className="flex items-start gap-2.5" role="listitem">
                      <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5', c.bgColor, c.textColor)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', c.dotColor)} />
                        {c.icon}
                        <span>{item.label}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono">Esc</kbd> to close</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionStatusBadge;