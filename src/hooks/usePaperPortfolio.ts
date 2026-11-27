// #1459: Paper trading practice mode with simulated balance and separate portfolio
import { useState, useCallback } from 'react';

const STARTING_BALANCE = 10_000;
const STORAGE_KEY = 'paper_portfolio';

export interface PaperTrade {
  keyId: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
}

export interface PaperPortfolio {
  balance: number;
  trades: PaperTrade[];
  holdings: Record<string, number>;
}

function load(): PaperPortfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore unreadable or corrupted storage and fall back to a fresh portfolio.
    return { balance: STARTING_BALANCE, trades: [], holdings: {} };
  }
  return { balance: STARTING_BALANCE, trades: [], holdings: {} };
}

function save(p: PaperPortfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function usePaperPortfolio() {
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(load);

  const executeTrade = useCallback((trade: Omit<PaperTrade, 'timestamp'>) => {
    setPortfolio(prev => {
      const cost = trade.amount * trade.price;
      if (trade.action === 'buy' && prev.balance < cost) return prev;
      const newBalance = trade.action === 'buy' ? prev.balance - cost : prev.balance + cost;
      const prevHolding = prev.holdings[trade.keyId] ?? 0;
      const newHolding = trade.action === 'buy' ? prevHolding + trade.amount : Math.max(0, prevHolding - trade.amount);
      const next: PaperPortfolio = {
        balance: newBalance,
        trades: [...prev.trades, { ...trade, timestamp: Date.now() }],
        holdings: { ...prev.holdings, [trade.keyId]: newHolding },
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const fresh: PaperPortfolio = { balance: STARTING_BALANCE, trades: [], holdings: {} };
    save(fresh);
    setPortfolio(fresh);
  }, []);

  const pnl = portfolio.trades.reduce((acc, t) => {
    const sign = t.action === 'sell' ? 1 : -1;
    return acc + sign * t.amount * t.price;
  }, 0);

  return { portfolio, executeTrade, reset, pnl };
}
