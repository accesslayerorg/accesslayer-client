import React, { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useWrapperPosition } from '@/hooks/useWrapperPosition'
import { SHARES_PER_KEY } from '@/utils/wrapper.utils'
import { type UnwrapResult } from '@/utils/wrapper.utils'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Props for the UnwrapSharesModal component */
export interface UnwrapSharesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  keyId: string
}

/**
 * Modal for unwrapping shares back into whole creator keys.
 * 
 * Features:
 * - Shows current share balance
 * - Requires unwrapping quantity to be a multiple of sharesPerKey
 * - Displays keys returned
 * - Blocks non-multiple quantities with explanation
 */
export const UnwrapSharesModal: React.FC<UnwrapSharesModalProps> = ({
  open,
  onOpenChange,
  walletAddress,
  keyId,
}) => {
  const { data: positionData, isLoading } = useWrapperPosition(keyId)
  const { toast } = useToast()
  const [shareCount, setShareCount] = useState(0)
  const [keysReturned, setKeysReturned] = useState(0)
  const [remainingShares, setRemainingShares] = useState(0)
  const [isMultipleValid, setIsMultipleValid] = useState(true)
  const [showError, setShowError] = useState(false)

  // Calculate unwrapping when share count changes
  useCallback(() => {
    if (shareCount <= 0) {
      setKeysReturned(0)
      setRemainingShares(0)
      setIsMultipleValid(true)
      setShowError(false)
      return
    }

    // Calculate how many whole keys we can return
    const keys = Math.floor(shareCount / SHARES_PER_KEY)
    const remaining = shareCount % SHARES_PER_KEY

    setKeysReturned(keys)
    setRemainingShares(remaining)

    // Check if it's an exact multiple
    const isExactMultiple = remaining === 0
    setIsMultipleValid(isExactMultiple)
    setShowError(!isExactMultiple)
  }, [shareCount])

  const handleShareCountChange = (value: number) => {
    setShareCount(value)
    useCallback(() => {
      // Recalculate after state update
      if (shareCount <= 0) {
        setKeysReturned(0)
        setRemainingShares(0)
        setIsMultipleValid(true)
        setShowError(false)
        return
      }

      const keys = Math.floor(shareCount / SHARES_PER_KEY)
      const remaining = shareCount % SHARES_PER_KEY

      setKeysReturned(keys)
      setRemainingShares(remaining)
      const isExactMultiple = remaining === 0
      setIsMultipleValid(isExactMultiple)
      setShowError(!isExactMultiple)
    }(), [shareCount])
  }

  const handleUnwrap = useCallback(async () => {
    if (shareCount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a share count greater than 0.',
        variant: 'destructive',
      })
      return
    }

    if (!isMultipleValid && showError) {
      toast({
        title: 'Invalid Quantity',
        description: `Unwrap quantity must be a multiple of ${SHARES_PER_KEY} shares (${SHARES_PER_KEY / SHARES_PER_KEY} key(s)).`,
        variant: 'destructive',
      })
      return
    }

    try {
      const result: UnwrapResult = await unwrapShares(keyId, shareCount)
      toast({
        title: 'Success!',
        description: `${result.keysReturned} key${result.keysReturned !== 1 ? 's' : ''} returned, ${result.remainingShares} share${result.remainingShares !== 1 ? 's' : ''} remaining.`,
      })
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to unwrap shares.',
        variant: 'destructive',
      })
    }
  }, [shareCount, isMultipleValid, showError, keyId, toast])

  if (isLoading) {
    return (
      <div className="py-8 text-center text-white/60">
        <p>Loading wrapper position…</p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-grotesque">
            Unwrap Shares into Keys
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Convert your share tokens back into whole creator keys.
          </DialogDescription>
        </DialogHeader>

        <DialogDescription className="mt-4 text-sm text-white/60">
          <p className="font-medium">Current Share Balance</p>
          <p className="font-mono text-amber-400">
            {positionData?.shareBalance.toLocaleString()} shares
          </p>
          {positionData && (
            <p className="mt-1 text-xs text-white/50">
              {positionData.isFullyWrapped
                ? 'Fully wrapped - holds complete key(s)'
                : `Partial wrap - ${positionData.dividendRate.toFixed(2)}% of a full key`}
            </p>
          )}
        </DialogDescription>

        {positionData && (
          <DialogDescription className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="font-medium text-sm">Shares to Unwrap</p>
            <Input
              type="number"
              min="1"
              step="1"
              value={shareCount}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 0)
                setShareCount(val)
                useCallback(() => {
                  if (shareCount <= 0) {
                    setKeysReturned(0)
                    setRemainingShares(0)
                    setIsMultipleValid(true)
                    setShowError(false)
                    return
                  }

                  const keys = Math.floor(shareCount / SHARES_PER_KEY)
                  const remaining = shareCount % SHARES_PER_KEY

                  setKeysReturned(keys)
                  setRemainingShares(remaining)
                  const isExactMultiple = remaining === 0
                  setIsMultipleValid(isExactMultiple)
                  setShowError(!isExactMultiple)
                }(), [shareCount])
              }}
              className="w-full"
              placeholder="e.g. 1000, 2000, 3000"
            />
          </DialogDescription>
        )}

        {/* Unwrap result preview */}
        {positionData && (
          <DialogDescription className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="font-medium text-sm">Unwrap Result</p>
            <div className="grid grid-cols-2 gap-2 my-2">
              <div>
                <p className="text-amber-400 font-mono font-bold">{keysReturned}</p>
                <p className="text-xs text-white/50">Keys Returned</p>
              </div>
              <div>
                <p className="text-amber-400 font-mono font-bold">{remainingShares}</p>
                <p className="text-xs text-white/50">Remaining Shares</p>
              </div>
            </div>
            {isMultipleValid && !showError && (
              <p className="mt-2 text-xs text-emerald-400">
                ✓ Exact multiple - will return {keysReturned} whole key{keysReturned !== 1 ? 's' : ''}
              </p>
            )}
            {!isMultipleValid && showError && (
              <p className="mt-2 text-xs text-red-400">
                ✗ Must be a multiple of {SHARES_PER_KEY} shares
              </p>
            )}
          </DialogDescription>
        )}

        {/* Pass-through note */}
        <DialogDescription className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs text-amber-400 font-medium">
            📋 Dividends & royalties pass through proportionally to share holders
          </p>
          <p className="mt-1 text-xs text-white/50">
            Share holders receive earnings proportional to their share balance
            relative to the total wrapped supply for this key.
          </p>
        </DialogDescription>
      </DialogContent>

      <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenChange}
          className="flex-1"
        >
          Close
        </Button>

        <Button
          type="button"
          disabled={isLoading || shareCount <= 0 || !isMultipleValid}
          onClick={handleUnwrap}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
        >
          {isLoading ? (
            <span className="size-3.5 animate-spin" aria-hidden="true" />
          ) : showError && isMultipleValid === false ? (
            <span className="text-red-400">Invalid Quantity</span>
          ) : (
            <>\n                Unwrap Shares\n                <span className="ml-1">↓</span>\n              </>\n            )}
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export default UnwrapSharesModal