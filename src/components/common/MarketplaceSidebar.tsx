import React, { useState } from 'react';
import { Menu, X, Bookmark } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';

interface MarketplaceSidebarProps {
  className?: string;
}

const MarketplaceSidebar: React.FC<MarketplaceSidebarProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const walletKey = useConnectedWallet(state => state.walletKey);
  const watchlistCount = useWatchlist(state => state.getWatchlistCount(walletKey));

  const navLinkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg transition-colors',
      active
        ? 'text-white bg-white/10 font-semibold'
        : 'text-white/70 hover:text-white hover:bg-white/5'
    );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={isOpen}
          className="bg-slate-900 border-white/10"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-950 border-r border-white/10 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8">
            <h2 className="text-xl font-black text-white tracking-tight">Navigation</h2>
          </div>
          <nav className="flex-1 space-y-2">
            <Link to="/" className={navLinkClass(false)}>Home</Link>
            <Link to="/creators" className={navLinkClass(false)}>Creators</Link>
            <Link to="/activity" className={navLinkClass(false)}>Activity</Link>
            <Link
              to="/watchlist"
              className={cn(navLinkClass(false), 'relative')}
              aria-label={`Watchlist, ${watchlistCount} saved ${watchlistCount === 1 ? 'key' : 'keys'}`}
            >
              <Bookmark className="size-4 shrink-0 text-amber-400/80" aria-hidden="true" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span
                  data-testid="watchlist-badge"
                  className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[0.7rem] font-bold text-slate-950"
                >
                  {watchlistCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default MarketplaceSidebar;
