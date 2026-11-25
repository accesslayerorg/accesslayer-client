/**
 * Backtest simulator page - test hypothetical purchases (#1473)
 * Route: /tools/backtest
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useHistoricalPrices, useXlmPrices, useKeyCreatedDate, useBacktestComputation } from '@/hooks/useBacktest';
import type { BacktestParams } from '@/types/backtest.types';

export function BacktestPage() {
  const [params, setParams] = useState<BacktestParams>({
    keyId: '',
    amountSpent: 1000,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    exitDate: new Date().toISOString().split('T')[0],
  });

  const { data: keyPrices } = useHistoricalPrices(params.keyId, {
    start: params.startDate,
    end: params.exitDate || new Date().toISOString().split('T')[0],
  });

  const { data: xlmPrices } = useXlmPrices({
    start: params.startDate,
    end: params.exitDate || new Date().toISOString().split('T')[0],
  });

  const { data: keyCreatedDate } = useKeyCreatedDate(params.keyId);

  const result = useBacktestComputation(keyPrices, xlmPrices, params, {
    protocolFee: 0.01,
    creatorFee: 0.01,
  });

  const handleInputChange = (field: keyof BacktestParams, value: unknown) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Helmet>
        <title>Backtest Simulator - Access Layer</title>
        <meta name="description" content="Test hypothetical key purchases against historical prices" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">
              Backtest Simulator
            </h1>
            <p className="text-lg text-slate-400">
              Test how a purchase would have performed in the past
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1">
              <div className="bg-slate-700 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Creator Key
                  </label>
                  <input
                    type="text"
                    placeholder="Enter key ID"
                    value={params.keyId}
                    onChange={e => handleInputChange('keyId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Amount Spent ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={params.amountSpent}
                    onChange={e =>
                      handleInputChange('amountSpent', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={params.startDate}
                    onChange={e => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                  {keyCreatedDate && params.startDate < keyCreatedDate && (
                    <p className="text-xs text-red-400 mt-1">
                      Date before key creation
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Exit Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={params.exitDate || ''}
                    onChange={e => handleInputChange('exitDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2">
              {result ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-400">Return</p>
                      <p className={`text-2xl font-bold ${result.returns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(result.returns * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-400">Max Drawdown</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {(result.maxDrawdown * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-400">Quantity</p>
                      <p className="text-2xl font-bold text-white">
                        {result.quantity.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-400">Holding Days</p>
                      <p className="text-2xl font-bold text-white">
                        {result.holdingDays}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-400">XLM Comparison</p>
                    <p className={`text-lg font-bold ${result.xlmReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(result.xlmReturn * 100).toFixed(2)}% if held XLM
                    </p>
                  </div>

                  <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-4">
                    <p className="text-sm text-red-100 font-semibold">
                      ⚠️ Past Performance Disclaimer
                    </p>
                    <p className="text-xs text-red-200 mt-2">
                      Past performance does not guarantee future results. This backtest is for educational purposes only.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-12">
                  Fill in the form and select a date range to see backtest results
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BacktestPage;
