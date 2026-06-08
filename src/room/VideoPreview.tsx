/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import useMeasure from "react-use-measure";
import { facingModeFromLocalTrack, type LocalVideoTrack } from "livekit-client";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

import { TileAvatar } from "../tile/TileAvatar";
import styles from "./VideoPreview.module.css";
import { type EncryptionSystem } from "../e2ee/sharedKeyManagement";

export type MatrixInfo = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  roomId: string;
  roomName: string;
  roomAlias: string | null;
  roomAvatar: string | null;
  e2eeSystem: EncryptionSystem;
};

interface Props {
  matrixInfo: MatrixInfo;
  videoEnabled: boolean;
  videoTrack: LocalVideoTrack | null;
  children: ReactNode;
}

export const VideoPreview: FC<Props> = ({
  matrixInfo,
  videoEnabled,
  videoTrack,
  children,
}) => {
  const { t } = useTranslation();
  const [previewRef, previewBounds] = useMeasure();

  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Effect to connect the videoTrack with the video element.
    if (videoEl.current) {
      videoTrack?.attach(videoEl.current);
    }
    return (): void => {
      videoTrack?.detach();
    };
  }, [videoTrack]);

  const cameraIsStarting = useMemo(
    () => videoEnabled && !videoTrack,
    [videoEnabled, videoTrack],
  );

  // Keep the avatar up until the <video> actually has a decoded frame. An empty
  // <video> (no track yet, or track attached but first frame not decoded) shows
  // the WebView's grey play-button placeholder, so we keep the element rendered
  // (so it keeps decoding and firing events) but invisible until it's ready.
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const el = videoEl.current;
    if (!el || !videoTrack) {
      setVideoReady(false);
      return;
    }
    setVideoReady(el.readyState >= 2);
    const markReady = (): void => setVideoReady(true);
    const markNotReady = (): void => setVideoReady(false);
    el.addEventListener("loadeddata", markReady);
    el.addEventListener("canplay", markReady);
    el.addEventListener("playing", markReady);
    el.addEventListener("emptied", markNotReady);
    return (): void => {
      el.removeEventListener("loadeddata", markReady);
      el.removeEventListener("canplay", markReady);
      el.removeEventListener("playing", markReady);
      el.removeEventListener("emptied", markNotReady);
    };
  }, [videoTrack]);

  const showAvatar = !videoEnabled || !videoReady;

  return (
    <div className={classNames(styles.preview)} ref={previewRef}>
      <video
        className={
          videoTrack &&
          facingModeFromLocalTrack(videoTrack).facingMode === "user"
            ? styles.mirror
            : undefined
        }
        ref={videoEl}
        muted
        playsInline
        // There's no reason for this to be focusable
        tabIndex={-1}
        disablePictureInPicture
        style={{
          display: videoEnabled ? "block" : "none",
          visibility: videoEnabled && videoReady ? "visible" : "hidden",
        }}
      />
      {showAvatar && (
        <>
          <div className={styles.avatarContainer}>
            {cameraIsStarting && (
              <div className={styles.cameraStarting} role="status">
                {t("video_tile.camera_starting")}
              </div>
            )}
            <TileAvatar
              id={matrixInfo.userId}
              name={matrixInfo.displayName}
              size={Math.min(previewBounds.width, previewBounds.height) / 2}
              src={matrixInfo.avatarUrl}
              loading={cameraIsStarting}
            />
          </div>
        </>
      )}
      <div className={styles.buttonBar}>{children}</div>
    </div>
  );
};
