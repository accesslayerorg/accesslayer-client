import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from './tooltip';

interface TruncatedTextProps {
  text: string;
  maxWidth?: number | string;
  className?: string;
}

export function TruncatedText({
  text,
  maxWidth = 120,
  className,
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const maxWidthValue = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    const updateTruncation = () => {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    };

    updateTruncation();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateTruncation);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateTruncation);
    return () => window.removeEventListener('resize', updateTruncation);
  }, [text]);

  const content = (
    <span
      ref={textRef}
      className={cn(
        'inline-block min-w-0 truncate whitespace-nowrap overflow-hidden',
        className
      )}
      style={{ maxWidth: maxWidthValue }}
      aria-label={text}
    >
      {text}
    </span>
  );

  return isTruncated ? <Tooltip content={text}>{content}</Tooltip> : content;
}
