import * as React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const tooltipId = React.useId();
  const [visible, setVisible] = React.useState(false);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const toggle = () => setVisible((v) => !v);

  return (
    <div
      className="relative inline-flex group"
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={toggle}
    >
      {children}

      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-normal rounded-md bg-black px-2 py-1 text-xs text-white shadow-md group-hover:block group-focus-within:block"
      >
        {content}
      </div>
    </div>
  );
}
