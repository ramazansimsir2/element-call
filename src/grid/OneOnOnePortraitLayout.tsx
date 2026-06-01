/*
Copyright 2024 New Vector Ltd.
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, type ReactNode, useCallback } from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { VoiceCallSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { type OneOnOnePortraitLayout as OneOnOnePortraitLayoutModel } from "../state/layout-types.ts";
import { type SpotlightTileViewModel } from "../state/TileViewModel.ts";
import { type MediaViewModel } from "../state/media/MediaViewModel.ts";
import { type RingingMediaViewModel } from "../state/media/RingingMediaViewModel.ts";
import { type CallLayout } from "./CallLayout";
import styles from "./OneOnOnePortraitLayout.module.css";
import { type DragCallback, useUpdateLayout } from "./Grid";
import { useBehavior } from "../useBehavior";

// Telegram-style caller info shown under the avatar on the 1:1 portrait (voice)
// screen: big name, then the call status ("Aranıyor…") beneath it. Split into
// sub-components so hook order stays stable regardless of media/ringing state.
const OneOnOneCallingStatus: FC<{ media: RingingMediaViewModel }> = ({
  media,
}) => {
  const { t } = useTranslation();
  const pickupState = useBehavior(media.pickupState$);
  return (
    <div className={styles.callingStatus}>
      <VoiceCallSolidIcon aria-hidden width={20} height={20} />
      {pickupState === "ringing"
        ? t("video_tile.calling")
        : t("video_tile.call_ended")}
    </div>
  );
};

const OneOnOneCallerInfo: FC<{ media: MediaViewModel }> = ({ media }) => {
  const name = useBehavior(media.displayName$);
  return (
    <div className={styles.callerInfo}>
      <div className={styles.bigName}>{name}</div>
      {media.type === "ringing" && <OneOnOneCallingStatus media={media} />}
    </div>
  );
};

const OneOnOneName: FC<{ spotlight: SpotlightTileViewModel }> = ({
  spotlight,
}) => {
  const media = useBehavior(spotlight.media$);
  const media0 = media[0];
  return media0 ? <OneOnOneCallerInfo media={media0} /> : null;
};

/**
 * An implementation of the "one-on-one" layout for portrait screens, in which
 * the remote participant is shown at maximum size, overlaid by a small view of
 * the local participant.
 */
export const makeOneOnOnePortraitLayout: CallLayout<
  OneOnOnePortraitLayoutModel
> = () => ({
  foreground: "scrolling",

  fixed: function OneOnOnePortraitLayoutFixed({ ref, model, Slot }): ReactNode {
    useUpdateLayout();
    return (
      <div ref={ref} className={styles.layer}>
        <Slot
          className={styles.spotlight}
          id="spotlight"
          model={model.spotlight}
        />
        <OneOnOneName spotlight={model.spotlight} />
      </div>
    );
  },

  scrolling: function OneOnOnePortraitLayoutScrolling({
    ref,
    model,
    Slot,
  }): ReactNode {
    useUpdateLayout();
    const pipSize = useBehavior(model.pipSize$);
    const pipAlignment = useBehavior(model.pipAlignment$);
    const onDragLocalTile: DragCallback = useCallback(
      ({ xRatio, yRatio }) =>
        model.pipAlignment$.next({
          block: yRatio < 0.5 ? "start" : "end",
          inline: xRatio < 0.5 ? "start" : "end",
        }),
      [model.pipAlignment$],
    );

    return (
      <div ref={ref} className={styles.layer}>
        {model.pip && (
          <Slot
            className={classNames(styles.pip)}
            id={model.pip.id}
            model={model.pip}
            onDrag={onDragLocalTile}
            data-size={pipSize}
            data-block-alignment={pipAlignment.block}
            data-inline-alignment={pipAlignment.inline}
          />
        )}
      </div>
    );
  },
});
