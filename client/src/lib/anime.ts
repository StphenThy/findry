import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, DependencyList } from 'react';
import { createScope, onScroll } from 'animejs';

/* Shared anime.js plumbing for the public pages (landing, login). */

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scale/rotate SVG children around their own centre instead of the viewport origin. */
export const TB: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };
export const TB_LEFT: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'left center' };

/**
 * Runs `build` inside an anime.js scope rooted at the returned element and
 * reverts every animation on unmount or when `deps` change (StrictMode
 * double-mount safe). Skipped entirely under prefers-reduced-motion — the
 * markup already renders the final state, so nothing needs to move.
 */
export function useAnime<T extends HTMLElement>(build: (root: T) => void, deps: DependencyList = []) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion()) return;
    const scope = createScope({ root }).add(() => build(root));
    return () => scope.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** `autoplay` value that starts an animation once the element scrolls into view. */
export const whenVisible = (target: Element) => onScroll({ target, enter: 'bottom-=80 top' });
