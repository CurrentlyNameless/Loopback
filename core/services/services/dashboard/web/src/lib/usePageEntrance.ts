import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * usePageEntrance
 *
 * Drop this into ANY page component to automatically cascade-animate
 * all direct section children (cards, panels, grids) on mount.
 *
 * Usage:
 *   const pageRef = usePageEntrance();
 *   return <div ref={pageRef} className="space-y-6">...</div>
 */
export function usePageEntrance<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Kill any in-progress tweens on children to avoid fighting the DashboardLayout 3D entrance
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;

    // Start hidden
    gsap.set(children, { opacity: 0, y: 36, scale: 0.96 });

    // Cascade them in
    const tween = gsap.to(children, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.065,
      ease: 'power3.out',
      delay: 0.08,
      clearProps: 'transform,opacity',
    });

    return () => { tween.kill(); };
  }, []);

  return ref;
}
