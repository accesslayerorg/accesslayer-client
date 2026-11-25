// #1457: Stuck transaction detection with fee bump resubmission
import { useState, useCallback } from 'react';

export const STUCK_THRESHOLD_MS = 60_000; // 1 minute

export interface PendingTx {
  hash: string;
  submittedAt: number;
  envelopeXdr: string;
  feePaidStroops: number;
}

export function useFeeBump() {
  const [bumping, setBumping] = useState(false);
  const [bumpHash, setBumpHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStuck = useCallback((tx: PendingTx): boolean => {
    return Date.now() - tx.submittedAt > STUCK_THRESHOLD_MS;
  }, []);

  const suggestedFee = useCallback((tx: PendingTx): number => {
    return Math.ceil(tx.feePaidStroops * 1.5);
  }, []);

  const bump = useCallback(async (tx: PendingTx, sign: (xdr: string) => Promise<string>, submit: (xdr: string) => Promise<string>) => {
    setBumping(true);
    setError(null);
    try {
      // Build a minimal fee-bump envelope comment — real XDR construction belongs in stellar SDK layer
      const bumpXdr = `fee_bump:${tx.envelopeXdr}:${suggestedFee(tx)}`;
      const signed = await sign(bumpXdr);
      const hash = await submit(signed);
      setBumpHash(hash);
      return hash;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fee bump failed');
      return null;
    } finally {
      setBumping(false);
    }
  }, [suggestedFee]);

  return { isStuck, suggestedFee, bump, bumping, bumpHash, error };
}
