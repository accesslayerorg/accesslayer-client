import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CreatorProfileStatRow from '../CreatorProfileStatRow';

const mockItems = [
  { label: 'Followers', value: '1.2k' },
  { label: 'Keys Held', value: '42' },
  { label: 'Revenue', value: '$300' },
  { label: 'Rank', value: '#5' },
];

describe('CreatorProfileStatRow', () => {
  it('renders all stat items when not loading', () => {
    render(<CreatorProfileStatRow items={mockItems} />);
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Keys Held')).toBeInTheDocument();
  });

  it('renders skeleton and hides stat content when isLoading=true', () => {
    render(<CreatorProfileStatRow items={mockItems} isLoading />);
    expect(screen.queryByText('Followers')).toBeNull();
    expect(screen.queryByText('Keys Held')).toBeNull();
  });

  it('skeleton renders correct number of placeholder cards', () => {
    const { container } = render(
      <CreatorProfileStatRow items={mockItems} isLoading skeletonCount={4} />
    );
    // Each skeleton card has 2 Skeleton divs (label + value)
    const skeletonDivs = container.querySelectorAll('.animate-pulse');
    expect(skeletonDivs).toHaveLength(8);
  });
});