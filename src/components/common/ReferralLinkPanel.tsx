import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { useAccount } from 'wagmi';

interface Props {
  initialKeyId?: string | number;
  keys?: Array<{ id: string | number; label?: string }>;
}

const COPIED_MS = 2000;

export default function ReferralLinkPanel({ initialKeyId, keys = [] }: Props) {
  const { address } = useAccount();
  const [selectedKey, setSelectedKey] = useState<string | number>(
    initialKeyId ?? (keys[0]?.id ?? '')
  );
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wallet = address ?? '';

  const url = `/keys/${selectedKey}?ref=${wallet}`;

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(url);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, COPIED_MS);
    } catch {
      // In case of failure, a real app would show an error toast. For now
      // leave the UI unchanged.
       
      console.error('Failed to copy referral link');
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.01] p-4">
      <h3 className="font-grotesque text-sm font-bold text-white mb-2">My Referral Link</h3>
      <div className="flex gap-2">
        <select
          aria-label="Select key"
          value={String(selectedKey)}
          onChange={e => setSelectedKey(e.target.value)}
          className="rounded-xl bg-white/[0.04] px-3 py-2 text-white"
        >
          {keys.length === 0 ? (
            <option value="">No keys</option>
          ) : (
            keys.map(k => (
              <option key={String(k.id)} value={String(k.id)}>
                {k.label ?? `Key ${k.id}`}
              </option>
            ))
          )}
        </select>

        <Button onClick={handleCopy} aria-label={copied ? 'Copied!' : 'Copy referral link'}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
