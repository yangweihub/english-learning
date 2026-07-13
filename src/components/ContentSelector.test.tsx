import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContentSelector } from './ContentSelector';
import type { ContentSource } from '../types';
import { CONTENT_SOURCE_LABELS } from '../types';

const ALL_SOURCES: ContentSource[] = [
  'current-affairs',
  'senior-high',
  'junior-high',
  'junior-senior-mixed',
  'elementary',
];

describe('ContentSelector', () => {
  it('renders all five content source options with Chinese labels', () => {
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={() => {}}
        availableSources={ALL_SOURCES}
      />
    );

    for (const source of ALL_SOURCES) {
      expect(screen.getByText(CONTENT_SOURCE_LABELS[source])).toBeInTheDocument();
    }
  });

  it('visually indicates the currently active source with aria-selected', () => {
    render(
      <ContentSelector
        currentSource="junior-high"
        onSourceChange={() => {}}
        availableSources={ALL_SOURCES}
      />
    );

    const activeTab = screen.getByRole('tab', { name: '初中英语' });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');

    // Other tabs should not be selected
    const otherTab = screen.getByRole('tab', { name: '时政新闻' });
    expect(otherTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSourceChange when a different source is clicked', () => {
    const onSourceChange = vi.fn();
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={onSourceChange}
        availableSources={ALL_SOURCES}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '高中英语' }));
    expect(onSourceChange).toHaveBeenCalledWith('senior-high');
  });

  it('does not call onSourceChange when the active source is clicked', () => {
    const onSourceChange = vi.fn();
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={onSourceChange}
        availableSources={ALL_SOURCES}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '时政新闻' }));
    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('shows loading state after switching source', () => {
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={() => {}}
        availableSources={ALL_SOURCES}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '小学英语' }));
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('disables all buttons during loading state', () => {
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={() => {}}
        availableSources={ALL_SOURCES}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '初中英语' }));

    const allTabs = screen.getAllByRole('tab');
    for (const tab of allTabs) {
      expect(tab).toBeDisabled();
    }
  });

  it('renders only the provided available sources', () => {
    const subset: ContentSource[] = ['current-affairs', 'elementary'];
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={() => {}}
        availableSources={subset}
      />
    );

    expect(screen.getByText('时政新闻')).toBeInTheDocument();
    expect(screen.getByText('小学英语')).toBeInTheDocument();
    expect(screen.queryByText('高中英语')).not.toBeInTheDocument();
  });

  it('has accessible navigation landmark', () => {
    render(
      <ContentSelector
        currentSource="current-affairs"
        onSourceChange={() => {}}
        availableSources={ALL_SOURCES}
      />
    );

    expect(screen.getByRole('navigation', { name: '内容来源选择' })).toBeInTheDocument();
  });
});
