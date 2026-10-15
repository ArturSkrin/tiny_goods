import { useEffect } from 'react';

/**
 * Fixed animated backdrop: drifting colour blobs, light rays, paper grain and a light
 * that follows the pointer. Publishes --mx/--my (pointer, px) and --sy (scroll, px) on
 * <html>, which the blobs (parallax) and .liquid-glass sheen read.
 */
export function AmbientBackground() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight * 0.2;

    const flush = () => {
      frame = 0;
      root.style.setProperty('--mx', `${mx}px`);
      root.style.setProperty('--my', `${my}px`);
      root.style.setProperty('--sy', `${window.scrollY}`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const onPointer = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      schedule();
    };

    flush();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-blob ambient-blob--1" />
      <div className="ambient-blob ambient-blob--2" />
      <div className="ambient-blob ambient-blob--3" />
      <div className="ambient-blob ambient-blob--4" />
      <div className="ambient-rays" />
      <div className="ambient-cursor" />
      <div className="ambient-grain" />
    </div>
  );
}
