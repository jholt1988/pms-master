/**
 * P0-002/P0-003: Focus Trap Utility for Modals
 * Ensures keyboard navigation stays within modal boundaries
 * Implements WCAG 2.1 keyboard navigation requirements
 */

export class FocusTrap {
  private container: HTMLElement;
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;
  private keyDownHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.init();
  }

  private init() {
    // Store previously focused element
    this.previouslyFocused = document.activeElement as HTMLElement;

    // Find all focusable elements within container
    const focusableElements = this.getFocusableElements();
    
    if (focusableElements.length === 0) {
      // If no focusable elements, focus the container itself
      this.container.setAttribute('tabindex', '-1');
      this.container.focus();
      return;
    }

    this.firstFocusable = focusableElements[0];
    this.lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    this.firstFocusable.focus();

    // Add keyboard event listener
    this.container.addEventListener('keydown', this.keyDownHandler);
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      this.container.querySelectorAll<HTMLElement>(selector)
    ).filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') {
      return;
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  }

  public destroy() {
    this.container.removeEventListener('keydown', this.keyDownHandler);
    
    // Restore focus to previously focused element
    if (this.previouslyFocused && document.contains(this.previouslyFocused)) {
      this.previouslyFocused.focus();
    }
  }
}

/**
 * React hook for focus trapping in modals
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const focusTrapRef = React.useRef<FocusTrap | null>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    // Create focus trap
    focusTrapRef.current = new FocusTrap(containerRef.current);

    return () => {
      focusTrapRef.current?.destroy();
      focusTrapRef.current = null;
    };
  }, [isActive]);

  return containerRef;
}

// Import React for the hook
import React from 'react';

