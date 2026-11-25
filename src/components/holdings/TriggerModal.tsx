/**
 * Modal for setting take-profit and stop-loss triggers on holdings (#1471)
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  validateTriggerPrice,
  calculatePriceDistance,
  calculateEstimatedProceeds,
} from '@/utils/triggers.utils';
import type { TriggerType } from '@/types/holdingTrigger.types';

interface TriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  quantity: number;
  holdingId: string;
  onCreateTrigger?: (data: {
    type: TriggerType;
    triggerPrice: number;
    linkToTriggerId?: string;
  }) => void;
  protocolFeePercent?: number;
  creatorFeePercent?: number;
}

export function TriggerModal({
  isOpen,
  onClose,
  currentPrice,
  quantity,
  holdingId,
  onCreateTrigger,
  protocolFeePercent = 0.01,
  creatorFeePercent = 0.01,
}: TriggerModalProps) {
  const [takeProfitPrice, setTakeProfitPrice] = useState<number | null>(null);
  const [stopLossPrice, setStopLossPrice] = useState<number | null>(null);
  const [linkTriggers, setLinkTriggers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (takeProfitPrice !== null) {
      const validation = validateTriggerPrice(takeProfitPrice, currentPrice, 'take-profit');
      if (!validation.valid) {
        newErrors.takeProfit = validation.message;
      }
    }

    if (stopLossPrice !== null) {
      const validation = validateTriggerPrice(stopLossPrice, currentPrice, 'stop-loss');
      if (!validation.valid) {
        newErrors.stopLoss = validation.message;
      }
    }

    if (!takeProfitPrice && !stopLossPrice) {
      newErrors.general = 'Set at least one trigger';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm() || !onCreateTrigger) return;

    if (takeProfitPrice !== null) {
      onCreateTrigger({
        type: 'take-profit',
        triggerPrice: takeProfitPrice,
      });
    }

    if (stopLossPrice !== null) {
      onCreateTrigger({
        type: 'stop-loss',
        triggerPrice: stopLossPrice,
        linkToTriggerId: linkTriggers ? undefined : undefined,
      });
    }

    onClose();
  };

  const tpProceeds = takeProfitPrice
    ? calculateEstimatedProceeds(quantity, takeProfitPrice, protocolFeePercent, creatorFeePercent)
    : null;

  const slProceeds = stopLossPrice
    ? calculateEstimatedProceeds(quantity, stopLossPrice, protocolFeePercent, creatorFeePercent)
    : null;

  const tpDistance = takeProfitPrice ? calculatePriceDistance(takeProfitPrice, currentPrice) : null;
  const slDistance = stopLossPrice ? calculatePriceDistance(stopLossPrice, currentPrice) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Set Triggers</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-700 rounded p-3">
            <p className="text-xs text-slate-400">Current Price</p>
            <p className="text-xl font-bold text-white mt-1">
              ${currentPrice.toFixed(4)}
            </p>
          </div>

          {errors.general && (
            <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded p-3">
              <p className="text-xs text-red-100">{errors.general}</p>
            </div>
          )}

          {/* Take-Profit */}
          <div>
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={takeProfitPrice !== null}
                onChange={e =>
                  setTakeProfitPrice(e.target.checked ? currentPrice * 1.5 : null)
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 cursor-pointer"
              />
              <span className="text-sm font-medium text-white">
                Take-Profit
              </span>
            </label>

            {takeProfitPrice !== null && (
              <div className="space-y-3 ml-6 p-3 bg-slate-700 rounded">
                <input
                  type="number"
                  min={currentPrice}
                  step="0.01"
                  value={takeProfitPrice}
                  onChange={e =>
                    setTakeProfitPrice(parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none text-sm"
                />
                {errors.takeProfit && (
                  <p className="text-xs text-red-400">{errors.takeProfit}</p>
                )}
                {tpDistance !== null && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>+{tpDistance.toFixed(2)}% from current</p>
                    {tpProceeds && (
                      <p>Est. proceeds: ${tpProceeds.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stop-Loss */}
          <div>
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={stopLossPrice !== null}
                onChange={e =>
                  setStopLossPrice(e.target.checked ? currentPrice * 0.8 : null)
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 cursor-pointer"
              />
              <span className="text-sm font-medium text-white">Stop-Loss</span>
            </label>

            {stopLossPrice !== null && (
              <div className="space-y-3 ml-6 p-3 bg-slate-700 rounded">
                <input
                  type="number"
                  max={currentPrice}
                  step="0.01"
                  value={stopLossPrice}
                  onChange={e =>
                    setStopLossPrice(parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none text-sm"
                />
                {errors.stopLoss && (
                  <p className="text-xs text-red-400">{errors.stopLoss}</p>
                )}
                {slDistance !== null && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>{slDistance.toFixed(2)}% from current</p>
                    {slProceeds && (
                      <p>Est. proceeds: ${slProceeds.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Link triggers */}
          {takeProfitPrice !== null && stopLossPrice !== null && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={linkTriggers}
                onChange={e => setLinkTriggers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 cursor-pointer"
              />
              <span className="text-sm text-slate-300">
                Link triggers (execute one cancels other)
              </span>
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
            >
              Create Triggers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TriggerModal;
