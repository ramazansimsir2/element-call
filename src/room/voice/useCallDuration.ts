/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useEffect, useState } from "react";

// Module-level start time so the duration is stable across layout changes (e.g.
// switching between the full call screen and the picture-in-picture view), which
// remount their own timer components. Assumes a single active call at a time.
let callStart: number | null = null;

/** Reset the shared call timer (call when the call view unmounts / call ends). */
export function resetCallDuration(): void {
  callStart = null;
}

/** Format a duration in seconds as mm:ss (or h:mm:ss past an hour). */
export function formatCallDuration(seconds: number): string {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Seconds elapsed since the call timer first started, ticking once a second. The
 * start time is shared across all callers (see callStart above), so the full
 * screen and the PiP view show the same running duration.
 */
export function useCallDuration(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (callStart === null) callStart = Date.now();
    const tick = (): void =>
      setSeconds(Math.floor((Date.now() - (callStart ?? Date.now())) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return (): void => clearInterval(id);
  }, []);
  return seconds;
}
