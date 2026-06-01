/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useEffect, useRef } from "react";
import { type RemoteParticipant } from "livekit-client";

import { type LivekitRoomItem } from "../../state/CallViewModel/CallViewModel";

const VOICE_LEVEL_VAR = "--ec-voice-speak";

function getMediaStreamTrack(p: RemoteParticipant): MediaStreamTrack | null {
  for (const [, pub] of p.audioTrackPublications) {
    if (pub.isMuted) return null;
    const msTrack = pub.track?.mediaStreamTrack;
    if (msTrack) return msTrack;
  }
  return null;
}

/**
 * Telegram-style voice reactivity: while a 1:1 voice call is connected, measure
 * the remote participant's audio loudness (WebAudio RMS) every 60ms and publish
 * it as the `--ec-voice-speak` CSS variable (0–1, exponentially smoothed). The
 * blob rings around the avatar read this variable each frame. The analyser is
 * never connected to the audio destination, so it does not affect playback and
 * works regardless of the output route (earpiece or loudspeaker).
 */
export function useRemoteVoiceLevel(
  audioParticipants: LivekitRoomItem[],
  enabled: boolean,
): void {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<
    Map<string, { analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> }>
  >(new Map());

  useEffect(() => {
    if (!enabled) {
      document.documentElement.style.removeProperty(VOICE_LEVEL_VAR);
      return;
    }

    const analysers = analysersRef.current;

    const getAudioCtx = (): AudioContext | null => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          const Ctx =
            window.AudioContext ??
            (window as typeof window & { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current.state === "suspended") {
          void audioCtxRef.current.resume().catch(() => {});
        }
        return audioCtxRef.current;
      } catch {
        return null;
      }
    };

    // Slow-decay smoothing so the rings hold through inter-word pauses instead
    // of flickering closed between every word.
    const display = { current: 0 };

    const levelInterval = setInterval(() => {
      const ctx = getAudioCtx();
      if (!ctx) return;

      let maxRms = 0;
      for (const { livekitRoom } of audioParticipants) {
        for (const [id, p] of livekitRoom.remoteParticipants) {
          const msTrack = getMediaStreamTrack(p);
          if (!msTrack) {
            analysers.delete(id);
            continue;
          }

          let node = analysers.get(id);
          if (!node) {
            try {
              const source = ctx.createMediaStreamSource(
                new MediaStream([msTrack]),
              );
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 512;
              analyser.smoothingTimeConstant = 0;
              source.connect(analyser);
              node = {
                analyser,
                data: new Uint8Array(analyser.frequencyBinCount),
              };
              analysers.set(id, node);
            } catch {
              continue;
            }
          }

          node.analyser.getByteTimeDomainData(node.data);
          let sum = 0;
          for (let i = 0; i < node.data.length; i++) {
            const v = (node.data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / node.data.length);
          if (rms > maxRms) maxRms = rms;
        }
      }

      // Typical speech RMS peaks around 0.25 → map to 0–1.
      const normalized = Math.min(1, maxRms / 0.25);
      const alpha = normalized > display.current ? 0.4 : 0.1;
      display.current = display.current * (1 - alpha) + normalized * alpha;
      document.documentElement.style.setProperty(
        VOICE_LEVEL_VAR,
        display.current.toFixed(3),
      );
    }, 60);

    return () => {
      clearInterval(levelInterval);
      void audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analysers.clear();
      document.documentElement.style.removeProperty(VOICE_LEVEL_VAR);
    };
  }, [enabled, audioParticipants]);
}
