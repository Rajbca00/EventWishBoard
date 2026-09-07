'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ reduced motion */

const motionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');

function subscribeToMotionPreference(onChange: () => void) {
  const query = motionQuery();
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * True when the visitor asked their OS to reduce motion.
 *
 * `useSyncExternalStore` rather than an effect: matchMedia is exactly the kind
 * of external store it exists for, and it avoids the render-then-correct flash
 * an effect would cause.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => motionQuery().matches,
    () => false,
  );
}

/* ------------------------------------------------------------------ device capability */

/** Static for the life of the page, so there is nothing to subscribe to. */
const noopSubscribe = () => () => {};

function isLowPoweredDevice(): boolean {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData ?? false;
  return cores <= 4 || memory <= 4 || saveData;
}

interface DeviceCapability {
  /** Drop the expensive decorative layers. */
  lowPower: boolean;
  reducedMotion: boolean;
  /** Convenience: run the full 3D scene. */
  rich: boolean;
}

/**
 * Guests arrive on whatever phone they happen to own. Cheap devices get a
 * lighter scene rather than a janky one.
 */
export function useDeviceCapability(): DeviceCapability {
  const reducedMotion = usePrefersReducedMotion();
  const lowPower = useSyncExternalStore(noopSubscribe, isLowPoweredDevice, () => false);

  // Updating the document class is an external side effect, which is what an
  // effect is actually for.
  useEffect(() => {
    document.documentElement.classList.toggle('low-power', lowPower);
  }, [lowPower]);

  return { lowPower, reducedMotion, rich: !lowPower && !reducedMotion };
}

/* ------------------------------------------------------------------ parallax */

/** Pointer / tilt parallax, normalised to roughly -1..1 on each axis. */
export function useParallax(enabled = true) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const apply = (x: number, y: number) => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setOffset({ x, y });
      });
    };

    const onPointer = (event: PointerEvent) => {
      apply(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
    };

    const onOrient = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0; // left / right tilt
      const beta = event.beta ?? 0; // front / back tilt
      apply(Math.max(-1, Math.min(1, gamma / 35)), Math.max(-1, Math.min(1, (beta - 45) / 45)));
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onOrient, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [enabled]);

  return offset;
}

/* ------------------------------------------------------------------ mounted */

/** Avoids the flash of a server-rendered value before the client takes over. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
