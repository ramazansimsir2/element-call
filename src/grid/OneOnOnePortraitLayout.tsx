/*
Copyright 2024 New Vector Ltd.
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, type ReactNode, useCallback } from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import {
  VideoCallSolidIcon,
  VoiceCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { type OneOnOnePortraitLayout as OneOnOnePortraitLayoutModel } from "../state/layout-types.ts";
import { type SpotlightTileViewModel } from "../state/TileViewModel.ts";
import { type MediaViewModel } from "../state/media/MediaViewModel.ts";
import { type RingingMediaViewModel } from "../state/media/RingingMediaViewModel.ts";
import { type CallLayout } from "./CallLayout";
import styles from "./OneOnOnePortraitLayout.module.css";
import { type DragCallback, useUpdateLayout } from "./Grid";
import { useBehavior } from "../useBehavior";
import { VoiceBlobs } from "../room/voice/VoiceBlobs";
import {
  useCallDuration,
  formatCallDuration,
} from "../room/voice/useCallDuration";

// Telegram-style caller info shown under the avatar on the 1:1 portrait (voice)
// screen: big name, then the call status ("Aranıyor…") beneath it. Split into
// sub-components so hook order stays stable regardless of media/ringing state.
const OneOnOneCallingStatus: FC<{ media: RingingMediaViewModel }> = ({
  media,
}) => {
  const { t } = useTranslation();
  const pickupState = useBehavior(media.pickupState$);
  // Indicate a video call with the camera icon + "Görüntülü aranıyor…" so the
  // (otherwise identical) blue calling screen distinguishes video from voice.
  const videoCall = useBehavior(media.videoEnabled$);
  const Icon = videoCall ? VideoCallSolidIcon : VoiceCallSolidIcon;
  return (
    <div className={styles.callingStatus}>
      <Icon aria-hidden width={20} height={20} />
      {pickupState === "ringing"
        ? videoCall
          ? t("video_tile.calling_video")
          : t("video_tile.calling")
        : t("video_tile.call_ended")}
    </div>
  );
};

// Counts up from when the remote participant connects (mount), shown as mm:ss
// (or h:mm:ss past an hour) so it's clear the call is live — like Telegram.
const OneOnOneCallTimer: FC = () => {
  const text = formatCallDuration(useCallDuration());
  return (
    <div className={styles.callDuration}>
      <svg
        width={16}
        height={16}
        viewBox="0 0 18 18"
        fill="currentColor"
        aria-hidden
      >
        <rect x="2" y="11" width="2.5" height="5" rx="1" />
        <rect x="6.5" y="8" width="2.5" height="8" rx="1" />
        <rect x="11" y="5" width="2.5" height="11" rx="1" />
        <rect x="15.5" y="2" width="2.5" height="14" rx="1" />
      </svg>
      {text}
    </div>
  );
};

const OneOnOneCallerInfo: FC<{ media: MediaViewModel }> = ({ media }) => {
  const name = useBehavior(media.displayName$);
  // ringing → "Aranıyor…"; local user in the spotlight (still connecting, no
  // remote/ringing media yet) → "Bağlanıyor…"; connected remote → no status.
  return (
    <div className={styles.callerInfo}>
      <div className={styles.bigName}>{name}</div>
      {media.type === "ringing" ? (
        <OneOnOneCallingStatus media={media} />
      ) : media.type === "user" && media.local ? (
        <div className={styles.callingStatus}>
          <VoiceCallSolidIcon aria-hidden width={20} height={20} />
          Bağlanıyor…
        </div>
      ) : media.type === "user" ? (
        <OneOnOneCallTimer />
      ) : null}
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
    const media = useBehavior(model.spotlight.media$);
    const media0 = media[0];
    // Telegram-style pulsing rings while the call is still being established:
    // ringing ("Aranıyor…") or the local user connecting ("Bağlanıyor…"). Once
    // the remote's media takes the spotlight (call timer) they stop.
    const showRipples =
      media0?.type === "ringing" ||
      (media0?.type === "user" && media0.local);
    return (
      <div ref={ref} className={styles.layer}>
        <VoiceBlobs />
        {showRipples && (
          <div className="ec-calling-ripples" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        )}
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
