/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC } from "react";
import classNames from "classnames";
import {
  VideoCallSolidIcon,
  VoiceCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { Avatar } from "../Avatar";
import { type MatrixInfo } from "./VideoPreview";
import styles from "./ConnectingOverlay.module.css";

interface Props {
  matrixInfo: MatrixInfo;
  /** Identity used to colour the (letter) avatar. For a 1:1 this is the other
   * member's userId so the colour matches the calling screen; for a group it is
   * the room id. */
  avatarId: string;
  /** A video call shows the camera icon (like the calling screen) so the two
   * screens differ only by their status text. */
  videoCall: boolean;
  /** While true the overlay fades out — kept on screen briefly across the switch
   * to the calling layout to mask the calling tile's scale-in animation. */
  fadingOut?: boolean;
}

/**
 * Telegram-style "connecting" screen shown during the brief window of a 1:1 call
 * after joining but before the ringing media is established (when the call view
 * would otherwise show the local user's grid tile). Made a visual twin of the
 * one-on-one calling screen (same avatar size/position, pulsing rings, icon) so
 * that switching to it feels like only the status text changes ("Bağlanıyor…" →
 * "Aranıyor…").
 */
export const ConnectingOverlay: FC<Props> = ({
  matrixInfo,
  avatarId,
  videoCall,
  fadingOut = false,
}) => {
  // Match the calling screen's avatar size (≈34% of the smallest viewport
  // dimension = the 50cqmin × 0.68 it renders at) so there is no size jump when
  // this overlay is replaced by the one-on-one calling screen.
  const avatarSize = Math.round(
    Math.min(window.innerWidth, window.innerHeight) * 0.34,
  );
  const Icon = videoCall ? VideoCallSolidIcon : VoiceCallSolidIcon;
  return (
    <div
      className={classNames(styles.overlay, {
        [styles.fadingOut]: fadingOut,
      })}
    >
      <div className="ec-calling-ripples" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <Avatar
        id={avatarId}
        name={matrixInfo.roomName}
        src={matrixInfo.roomAvatar ?? undefined}
        size={avatarSize}
        className={styles.avatar}
      />
      <div className={styles.callerInfo}>
        <div className={styles.name}>{matrixInfo.roomName}</div>
        <div className={styles.callingStatus}>
          <Icon aria-hidden width={20} height={20} />
          Bağlanıyor…
        </div>
      </div>
    </div>
  );
};
