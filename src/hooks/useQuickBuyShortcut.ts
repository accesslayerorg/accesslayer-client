import { useEffect } from 'react';

export const useQuickBuyShortcut = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // Find the hovered or focused creator card
        const hoveredCard = document.querySelector('.creator-card:hover');
        if (hoveredCard) {
          const buyButton = hoveredCard.querySelector('button') as HTMLButtonElement;
          buyButton?.click();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};