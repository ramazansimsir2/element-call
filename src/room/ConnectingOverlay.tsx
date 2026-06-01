/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC } from "react";
import { Heading } from "@vector-im/compound-web";
import { VoiceCallSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { Avatar } from "../Avatar";
import { type MatrixInfo } from "./VideoPreview";
import styles from "./ConnectingOverlay.module.css";

interface Props {
  matrixInfo: MatrixInfo;
}

/**
 * Telegram-style "connecting" screen shown during the brief window of a 1:1
 * voice call after joining but before the ringing media is established (when the
 * call view would otherwise show the local user's grid tile). Shows the callee's
 * avatar + name + "Bağlanıyor…".
 */
export const ConnectingOverlay: FC<Props> = ({ matrixInfo }) => {
  return (
    <div className={styles.overlay}>
      <Avatar
        id={matrixInfo.roomId}
        name={matrixInfo.roomName}
        src={matrixInfo.roomAvatar ?? undefined}
        size={112}
      />
      <Heading as="h2" weight="semibold" size="lg" className={styles.name}>
        {matrixInfo.roomName}
      </Heading>
      <div className={styles.callingStatus}>
        <VoiceCallSolidIcon aria-hidden width={20} height={20} />
        Bağlanıyor…
      </div>
    </div>
  );
};
