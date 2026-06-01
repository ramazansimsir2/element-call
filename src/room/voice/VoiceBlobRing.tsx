/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, useEffect, useRef } from "react";

import styles from "./VoiceBlobs.module.css";

interface Props {
  radius: number;
  points: number;
  alpha: number;
  /** Max deformation as a fraction of radius. */
  deform?: number;
  /** RGB string, e.g. "255, 255, 255". */
  color?: string;
}

/**
 * Organic blob ring rendered as an SVG path, replicating Telegram Android's
 * BlobDrawable with cubic bezier curves. The deformation and overall scale are
 * driven each frame by the `--ec-voice-speak` CSS variable (remote loudness).
 */
export const VoiceBlobRing: FC<Props> = ({
  radius,
  points,
  alpha,
  deform = 0.16,
  color = "255, 255, 255",
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const frameRef = useRef<number>(0);
  const pointsRef = useRef(
    Array.from({ length: points }, (_, i) => ({
      angle: (i * 2 * Math.PI) / points,
      speed: 0.017 + 0.003 * Math.random(),
      progress: Math.random() * 2 * Math.PI,
    })),
  );

  useEffect(() => {
    const animate = (): void => {
      const pts = pointsRef.current;
      const maxDiff = radius * deform;
      const liveAmp =
        0.48 +
        parseFloat(
          document.documentElement.style.getPropertyValue("--ec-voice-speak") ||
            "0",
        ) *
          0.9;
      const scale = 0.8 + 0.4 * liveAmp;

      for (const p of pts) p.progress += p.speed;

      const coords = pts.map((p) => {
        const r = (radius + Math.sin(p.progress) * maxDiff * liveAmp) * scale;
        return {
          x: Math.cos(p.angle) * r + radius,
          y: Math.sin(p.angle) * r + radius,
        };
      });

      let d = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length; i++) {
        const p0 = coords[(i - 1 + coords.length) % coords.length];
        const p1 = coords[i];
        const p2 = coords[(i + 1) % coords.length];
        const p3 = coords[(i + 2) % coords.length];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      d += " Z";

      if (pathRef.current) pathRef.current.setAttribute("d", d);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [radius, deform, points]);

  const size = radius * 2;
  return (
    <svg
      className={styles.blobRing}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      overflow="visible"
      aria-hidden
    >
      <path ref={pathRef} fill={`rgba(${color}, ${alpha})`} d="" />
    </svg>
  );
};
