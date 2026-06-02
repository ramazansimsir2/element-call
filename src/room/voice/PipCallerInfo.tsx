/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC } from "react";

import { type SpotlightTileViewModel } from "../../state/TileViewModel.ts";
import { type MediaViewModel } from "../../state/media/MediaViewModel.ts";
import { useBehavior } from "../../useBehavior";
import { useCallDuration, formatCallDuration } from "./useCallDuration";
import styles from "./PipCallerInfo.module.css";

const PipInfo: FC<{ media: MediaViewModel }> = ({ media }) => {
  const name = useBehavior(media.displayName$);
  const text = formatCallDuration(useCallDuration());
  return (
    <div className={styles.info}>
      <div className={styles.name}>{name}</div>
      <div className={styles.duration}>{text}</div>
    </div>
  );
};

/**
 * Compact name + call-duration shown under the avatar in the 1:1 voice
 * picture-in-picture view (where only the avatar would otherwise be visible).
 */
export const PipCallerInfo: FC<{ spotlight: SpotlightTileViewModel }> = ({
  spotlight,
}) => {
  const media = useBehavior(spotlight.media$);
  const media0 = media[0];
  return media0 ? <PipInfo media={media0} /> : null;
};
