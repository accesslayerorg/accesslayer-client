import React, { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useWrapperPosition } from '@/hooks/useWrapperPosition'
import { SHARES_PER_KEY } from '@/utils/wrapper.utils'
import { type WrapParams } from '@/utils/wrapper.utils'
import type { CreatorKeySummary } from '@/utils/creatorProfile.utils'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRef } from 'react'

/** Props for the WrapKeysModal component */
export interface WrapKeysModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  availableKeys: CreatorKeySummary[]
}

/**
 * Modal for wrapping creator keys into fungible share tokens.
 * 
 * Features:
 * - Key selection from available creator keys
 * - Quantity input (can be fractional, e.g. 0.5 keys)
 * - Preview of shares to be minted
 * - Real-time share balance display
 */
export const WrapKeysModal: React.FC<WrapKeysModalProps> = ({
  open,
  onOpenChange,
  walletAddress,
  availableKeys,
}) => {
  const { data: positionData, isLoading } = useWrapperPosition(
    availableKeys[0]?.id || ''
  )
  const { toast } = useToast()
  const [selectedKey, setSelectedKey] = useState<CreatorKeySummary | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [sharePreview, setSharePreview] = useState(0)
  const [showPassThroughNote, setShowPassThroughNote] = useState(true)

  // Update share preview when key or quantity changes
  useCallback(() => {
    if (!selectedKey) {
      setSharePreview(0)
      return
    }

    // Calculate shares: quantity * sharesPerKey
    const shares = quantity * SHARES_PER_KEY
    setSharePreview(shares)
  }, [selectedKey, quantity])

  // Update preview when selected key changes
  useEffect(() => {
    if (selectedKey) {
      setQuantity(1) // Reset to 1 key when switching keys
    }
  }, [selectedKey])

  const handleKeyChange = (key: CreatorKeySummary | undefined) => {
    setSelectedKey(key)
    setQuantity(1)
    setSharePreview(0)
  }

  const handleQuantityChange = (value: number) => {
    setQuantity(value)
    setSharePreview(value * SHARES_PER_KEY)
  }

  const handleWrap = useCallback(async () => {
    if (!selectedKey) {
      toast({
        title: 'Error',
        description: 'Please select a key to wrap.',
        variant: 'destructive',
      })
      return
    }

    const params: WrapParams = {
      keyId: selectedKey.id,
      quantity,
      sharesMinted: Math.round(sharePreview),
    }

    try {
      const result = await wrapKeys(params)
      toast({
        title: 'Success!',
        description: `${result.sharesMinted} shares minted for key ${selectedKey.title}.`,
      })
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to wrap keys.',
        variant: 'destructive',
      })
    }
  }, [selectedKey, quantity, sharePreview, toast])

  if (!selectedKey && availableKeys.length > 0) {
    setSelectedKey(availableKeys[0])
  }

  if (isLoading || !selectedKey) {
    return (
      <div className="py-8 text-center text-white/60">
        {isLoading ? (
          <p>Loading wrapper position…</p>
        ) : (
          <p>
            Select a key to see your share balance and wrap options.
          </p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-grotesque">
            Wrap Keys into Shares
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Convert whole or fractional creator keys into fungible share tokens.
            Share holders receive proportional dividends and royalties.
          </DialogDescription>
        </DialogHeader>

        <DialogDescription className="mt-4 text-sm text-white/60">
          <p className="font-medium">Select Key</p>
          <Select
            onValueChange={handleKeyChange}
            defaultValue={selectedKey?.id || ''}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a creator key" />
            </SelectTrigger>
            <SelectContent>
              {availableKeys.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogDescription>

        {selectedKey && (
          <div className="space-y-4">
            <DialogDescription className="mt-4 text-sm text-white/60">
              <p className="font-medium">Quantity (keys)</p>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => {
                  const val = Math.max(0.01, parseFloat(e.target.value) || 1)
                  setQuantity(val)
                  setSharePreview(val * SHARES_PER_KEY)
                }}
                className="w-full"
                placeholder="e.g. 1, 0.5, 0.25"
              />
            </DialogDescription>

            <DialogDescription className="mt-4 text-sm text-white/60">
              <p className="font-medium">Shares to be Minted</p>
              <p className="font-mono text-lg font-bold text-amber-400">
                {sharePreview.toLocaleString()} shares
              </p>
              <p className="mt-2 text-xs text-white/50">
                1 key = {SHARES_PER_KEY} shares{' '}
                ({(sharePreview / SHARES_PER_KEY).toFixed(2)} keys)
              </p>
            </DialogDescription>

            {/* Share balance preview */}
            {positionData && (
              <DialogDescription className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="font-medium text-sm">Your Share Balance</p>
                <p className="font-mono text-amber-400">
                  {positionData.shareBalance.toLocaleString()} shares
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {positionData.isFullyWrapped
                    ? 'Fully wrapped - holds complete key(s)'
                    : `Partial wrap - ${positionData.dividendRate.toFixed(2)}% of a full key`}
                </p>
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
          </div>
        )}

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
            disabled={isLoading || !selectedKey || sharePreview <= 0}
            onClick={handleWrap}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
          >
            {isLoading ? (
              <span className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <>\n                Wrap Keys\n                <span className="ml-1">↑</span>\n              </>\n            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default WrapKeysModal