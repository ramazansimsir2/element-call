/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, useEffect, useRef } from "react";

import styles from "./VoiceBlobs.module.css";
import { VoiceBlobRing } from "./VoiceBlobRing";

/**
 * Two concentric voice-reactive blob rings sitting behind the avatar on the 1:1
 * voice screen (Telegram-style). The whole group grows out from nothing as the
 * remote participant speaks and shrinks back during silence, driven by the
 * `--ec-voice-speak` CSS variable (see useRemoteVoiceLevel). Visibility is gated
 * by CSS to the voice call screen, so group/video calls are unaffected.
 */
interface Props {
  /** "pip" renders a smaller, centered variant for the picture-in-picture view. */
  variant?: "full" | "pip";
}

export const VoiceBlobs: FC<Props> = ({ variant = "full" }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const peak = { current: 0 };
    const tick = (): void => {
      const level = parseFloat(
        document.documentElement.style.getPropertyValue("--ec-voice-speak") ||
          "0",
      );
      // Peak hold with slow per-frame decay so the group stays open through
      // inter-word pauses; exponential saturation so even quiet speech opens it.
      peak.current = level > peak.current ? level : peak.current * 0.98;
      const wrapperScale = 1 - Math.exp(-peak.current * 25);
      if (wrapperRef.current)
        wrapperRef.current.style.transform = `scale(${wrapperScale.toFixed(4)})`;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div
      className={variant === "pip" ? styles.blobsPip : styles.blobs}
      aria-hidden
    >
      <div ref={wrapperRef} className={styles.blobWrapper}>
        <VoiceBlobRing radius={100} points={7} alpha={0.2} deform={0.16} />
        <VoiceBlobRing radius={86} points={8} alpha={0.3} deform={0.16} />
      </div>
    </div>
  );
};
