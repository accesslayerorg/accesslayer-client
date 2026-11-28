/**
 * Position sizing and break-even calculator drawer for swap panel (#1472)
 * Triggered from swap panel, shows capital, risk%, and outcomes table
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  calculateBreakEvenPrice,
  calculateMaxPosition,
  generateOutcomesTable,
  validatePositionSize,
} from '@/utils/positionCalculator.utils';
import type { PositionCalculatorInputs } from '@/types/positionCalculator.types';

interface PositionCalculatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  keySupply: number;
  onUsePosition?: (quantity: number) => void;
  protocolFeePercent?: number;
  creatorFeePercent?: number;
}

export function PositionCalculatorDrawer({
  isOpen,
  onClose,
  currentPrice,
  keySupply,
  onUsePosition,
  protocolFeePercent = 0.01,
  creatorFeePercent = 0.01,
}: PositionCalculatorDrawerProps) {
  const [inputs, setInputs] = useState<PositionCalculatorInputs>({
    capital: 1000,
    riskPercentage: 2,
    plannedExitPrice: currentPrice * 1.5,
    currentPrice,
  });

  const breakEven = calculateBreakEvenPrice(
    currentPrice,
    protocolFeePercent,
    creatorFeePercent
  );

  const stopPrice = inputs.currentPrice * (1 - inputs.riskPercentage / 100);
  const maxQuantity = calculateMaxPosition(
    inputs.capital,
    inputs.riskPercentage,
    stopPrice,
    inputs.currentPrice
  );

  const positionWarning = validatePositionSize(maxQuantity, keySupply);
  const outcomes = generateOutcomesTable(
    inputs,
    maxQuantity,
    protocolFeePercent,
    creatorFeePercent
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-end">
        <div className="w-full max-w-md bg-slate-800 rounded-l-lg shadow-xl max-h-screen overflow-y-auto">
          <div className="sticky top-0 flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
            <h2 className="text-lg font-bold text-white">Position Calculator</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Capital ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={inputs.capital}
                  onChange={e =>
                    setInputs(prev => ({
                      ...prev,
                      capital: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Risk Percentage (%)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={inputs.riskPercentage}
                  onChange={e =>
                    setInputs(prev => ({
                      ...prev,
                      riskPercentage: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Planned Exit Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputs.plannedExitPrice}
                  onChange={e =>
                    setInputs(prev => ({
                      ...prev,
                      plannedExitPrice: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Break-even */}
            <div className="bg-slate-700 rounded p-4">
              <p className="text-sm text-slate-400">Break-Even Price</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${breakEven.toFixed(4)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Includes all fees and round-trip impact
              </p>
            </div>

            {/* Position size */}
            <div className="bg-slate-700 rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-slate-400">Max Quantity</p>
                  <p className="text-2xl font-bold text-white">
                    {maxQuantity.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 text-right">Stop Loss</p>
                  <p className="text-lg font-bold text-white">
                    ${stopPrice.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning */}
            {positionWarning.message && (
              <div className="bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded p-3">
                <p className="text-xs text-yellow-100 font-semibold">
                  ⚠️ {positionWarning.message}
                </p>
              </div>
            )}

            {/* Outcomes table */}
            <div>
              <h3 className="font-semibold text-white mb-3">
                Outcomes at Exit Prices
              </h3>
              <div className="bg-slate-700 rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="px-3 py-2 text-left text-slate-400">
                        Exit Price
                      </th>
                      <th className="px-3 py-2 text-right text-slate-400">
                        Profit/Loss
                      </th>
                      <th className="px-3 py-2 text-right text-slate-400">
                        Return %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomes.slice(0, 5).map((outcome, idx) => (
                      <tr key={idx} className="border-b border-slate-600">
                        <td className="px-3 py-2 text-white">
                          ${outcome.exitPrice.toFixed(4)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${outcome.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          ${outcome.profitLoss.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${outcome.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {outcome.returnPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Use position button */}
            {onUsePosition && (
              <button
                onClick={() => onUsePosition(maxQuantity)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
              >
                Use This Amount
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PositionCalculatorDrawer;
