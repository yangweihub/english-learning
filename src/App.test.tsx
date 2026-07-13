import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the application title', () => {
    render(<App />);
    // The app title is rendered in both desktop sidebar and mobile header
    const titles = screen.getAllByText('英语学习');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders navigation items', () => {
    render(<App />);
    // Navigation should contain the four main items (shown on both mobile and desktop)
    const vocabLinks = screen.getAllByText('词汇');
    expect(vocabLinks.length).toBeGreaterThan(0);

    const grammarLinks = screen.getAllByText('语法');
    expect(grammarLinks.length).toBeGreaterThan(0);

    const dashboardLinks = screen.getAllByText('看板');
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it('renders theme toggle button', () => {
    render(<App />);
    // Theme toggle should be accessible
    const toggleButtons = screen.getAllByLabelText(/切换到/);
    expect(toggleButtons.length).toBeGreaterThan(0);
  });
});
