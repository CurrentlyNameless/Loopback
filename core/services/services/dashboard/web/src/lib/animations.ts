import gsap from 'gsap';

/**
 * GSAP Animation Utilities for FloofCore Dashboard
 */

/**
 * Cascading Stagger Fade Up
 * Animates a list of cards or elements with a waterfall entrance
 */
export function gsapStaggerFadeUp(
  targets: gsap.TweenTarget,
  options?: {
    stagger?: number;
    duration?: number;
    y?: number;
    delay?: number;
    ease?: string;
    onComplete?: () => void;
  }
) {
  const {
    stagger = 0.06,
    duration = 0.45,
    y = 16,
    delay = 0,
    ease = 'power3.out',
    onComplete,
  } = options || {};

  return gsap.fromTo(
    targets,
    {
      opacity: 0,
      y,
      scale: 0.98,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      stagger,
      delay,
      ease,
      clearProps: 'transform,opacity',
      onComplete,
    }
  );
}

/**
 * Spring Pop-In
 * Elastic entrance for badges, new items, and status indicators
 */
export function gsapSpringPop(
  target: gsap.TweenTarget,
  options?: {
    scaleFrom?: number;
    duration?: number;
    ease?: string;
  }
) {
  const { scaleFrom = 0.8, duration = 0.4, ease = 'back.out(1.8)' } = options || {};

  return gsap.fromTo(
    target,
    { opacity: 0, scale: scaleFrom },
    { opacity: 1, scale: 1, duration, ease, clearProps: 'transform,opacity' }
  );
}

/**
 * Smooth Shrink & Fade Exit
 * Clean dismissal when removing items from a list
 */
export function gsapSmoothExit(
  target: gsap.TweenTarget,
  onComplete?: () => void
) {
  return gsap.to(target, {
    opacity: 0,
    scale: 0.9,
    y: -8,
    duration: 0.22,
    ease: 'power2.in',
    onComplete,
  });
}

/**
 * Interactive Card Hover Helper
 * Attaches buttery GSAP hover lift and return tweens to a DOM element
 */
export function gsapCardHover(element: HTMLElement | null) {
  if (!element) return () => {};

  const onEnter = () => {
    gsap.to(element, {
      y: -4,
      scale: 1.012,
      duration: 0.28,
      ease: 'power2.out',
      boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.7), 0 0 24px -4px rgba(139, 92, 246, 0.3)',
    });
  };

  const onLeave = () => {
    gsap.to(element, {
      y: 0,
      scale: 1,
      duration: 0.32,
      ease: 'power3.out',
      boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    });
  };

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mouseenter', onEnter);
    element.removeEventListener('mouseleave', onLeave);
  };
}

/**
 * Switch Toggle Snap
 * Simulates an authentic mechanical tactile toggle with overshoot
 */
export function gsapSwitchSnap(
  thumbElement: HTMLElement | null,
  checked: boolean
) {
  if (!thumbElement) return;

  gsap.to(thumbElement, {
    x: checked ? 20 : 0,
    duration: 0.38,
    ease: 'back.out(2.2)',
  });
}

/**
 * Top Laser Beam Route Sweep
 * Fires a bright neon laser beam across the very top edge of the screen
 */
export function gsapLaserSweep(laserElement: HTMLElement | null) {
  if (!laserElement) return;

  const tl = gsap.timeline();
  tl.set(laserElement, { width: '0%', opacity: 1 })
    .to(laserElement, {
      width: '75%',
      duration: 0.24,
      ease: 'power2.out',
    })
    .to(laserElement, {
      width: '100%',
      duration: 0.22,
      ease: 'power3.inOut',
    })
    .to(laserElement, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(laserElement, { width: '0%' });
      },
    });

  return tl;
}

/**
 * Cinematic 3D Page Entrance
 * Dramatic perspective tilt, zoom, and cascaded child card entrance
 */
export function gsapCinematicPageEntrance(container: HTMLElement | null) {
  if (!container) return;

  // 1. Animate outer container with 3D perspective camera move
  gsap.fromTo(
    container,
    {
      opacity: 0,
      y: 42,
      scale: 0.965,
      rotateX: 4,
      transformPerspective: 1200,
      transformOrigin: '50% 5%',
      filter: 'blur(3px)',
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      filter: 'blur(0px)',
      duration: 0.52,
      ease: 'power3.out',
      clearProps: 'transform,opacity,filter',
    }
  );

  // 2. Cascade direct child cards/sections
  const cards = container.querySelectorAll(
    ':scope > div > div, .saas-card, [data-animate-card], .module-card'
  );
  if (cards.length > 0) {
    gsap.fromTo(
      Array.from(cards).slice(0, 10),
      { opacity: 0, y: 28, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.46,
        stagger: 0.05,
        ease: 'back.out(1.4)',
        delay: 0.06,
        clearProps: 'transform,opacity',
      }
    );
  }
}

/**
 * Glider Pill Slide
 * Smoothly slides a background indicator pill behind the active tab button with physical overshoot
 */
export function gsapGliderSlide(
  glider: HTMLElement | null,
  targetButton: HTMLElement | null
) {
  if (!glider || !targetButton) return;

  gsap.to(glider, {
    x: targetButton.offsetLeft,
    width: targetButton.offsetWidth,
    duration: 0.38,
    ease: 'back.out(1.8)',
  });
}

/**
 * Tab Content Sweep Entrance
 * Directional slide and cascade when navigating between tabs
 */
export function gsapTabContentSweep(
  container: HTMLElement | null,
  direction: 'right' | 'left' = 'right'
) {
  if (!container) return;

  const subItems = container.children;
  if (!subItems || subItems.length === 0) return;

  const startX = direction === 'right' ? 32 : -32;

  gsap.fromTo(
    subItems,
    {
      opacity: 0,
      x: startX,
      scale: 0.96,
    },
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.44,
      stagger: 0.065,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    }
  );
}

/**
 * Waterfall Grid Entrance
 * Cascades cards in a grid with spring pop
 */
export function gsapWaterfallGrid(
  container: HTMLElement | null,
  selector = ':scope > div'
) {
  if (!container) return;
  const items = container.querySelectorAll(selector);
  if (!items || items.length === 0) return;

  gsap.fromTo(
    items,
    {
      opacity: 0,
      y: 36,
      scale: 0.92,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.48,
      stagger: 0.035,
      ease: 'back.out(1.4)',
      clearProps: 'transform,opacity',
    }
  );
}

export default gsap;
