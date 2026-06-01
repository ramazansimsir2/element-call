/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  useMemo,
  type FC,
  type CSSProperties,
  useState,
  useEffect,
} from "react";
import { Avatar as CompoundAvatar } from "@vector-im/compound-web";
import { type MatrixClient } from "matrix-js-sdk";
import { type WidgetApi } from "matrix-widget-api";

import { useClientState } from "./ClientContext";
import { widget } from "./widget";

export enum Size {
  XS = "xs",
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl",
}

export const sizes = new Map([
  [Size.XS, 22],
  [Size.SM, 32],
  [Size.MD, 36],
  [Size.LG, 42],
  [Size.XL, 90],
]);

export interface Props {
  id: string;
  name: string;
  className?: string;
  src?: string;
  size?: Size | number;
  style?: CSSProperties;
}

export function getAvatarUrl(
  client: MatrixClient,
  mxcUrl: string | null,
  avatarSize = 96,
): string | null {
  const width = Math.floor(avatarSize * window.devicePixelRatio);
  const height = Math.floor(avatarSize * window.devicePixelRatio);
  // scale is more suitable for larger sizes
  const resizeMethod = avatarSize <= 96 ? "crop" : "scale";
  return mxcUrl
    ? client.mxcUrlToHttp(
        mxcUrl,
        width,
        height,
        resizeMethod,
        false,
        true,
        true,
      )
    : null;
}

export const Avatar: FC<Props> = ({
  className,
  id,
  name,
  src,
  size = Size.MD,
  style,
  ...props
}) => {
  const clientState = useClientState();

  const sizePx = useMemo(
    () =>
      Object.values(Size).includes(size as Size)
        ? sizes.get(size as Size)!
        : (size as number),
    [size],
  );

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // In theory, a change in `clientState` or `sizePx` could run extra getAvatarFromWidgetAPI calls, but in practice they should be stable long before this code runs.
  useEffect(() => {
    if (!src) {
      setAvatarUrl(undefined);
      return;
    }

    let blob: Promise<Blob>;

    if (widget?.api) {
      blob = getAvatarFromWidgetAPI(widget.api, src);
    } else if (
      clientState?.state === "valid" &&
      clientState.authenticated?.client &&
      sizePx
    ) {
      blob = getAvatarFromServer(clientState.authenticated.client, src, sizePx);
    } else {
      setAvatarUrl(undefined);
      return;
    }

    let objectUrl: string | undefined;
    let stale = false;
    blob
      .then((blob) => {
        if (stale) {
          return;
        }
        // Default/generated avatars come back as SVG silhouettes; show the nicer
        // letter avatar instead by treating an SVG as "no avatar". Real uploaded
        // photos (PNG/JPEG/…) are still shown.
        if (blob.type === "image/svg+xml") {
          setAvatarUrl(undefined);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setAvatarUrl(objectUrl);
      })
      .catch(() => {
        if (stale) {
          return;
        }
        setAvatarUrl(undefined);
      });

    return (): void => {
      stale = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [clientState, src, sizePx]);

  return (
    <CompoundAvatar
      className={className}
      id={id}
      name={name}
      size={`${sizePx}px`}
      src={avatarUrl}
      style={style}
      {...props}
    />
  );
};

async function getAvatarFromServer(
  client: MatrixClient,
  src: string,
  sizePx: number,
): Promise<Blob> {
  const httpSrc = getAvatarUrl(client, src, sizePx);
  if (!httpSrc) {
    throw new Error("Failed to get http avatar URL");
  }

  const token = client.getAccessToken();
  if (!token) {
    throw new Error("Failed to get access token");
  }

  const request = await fetch(httpSrc, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const blob = await request.blob();

  return blob;
}

// Sniff an image MIME type from the leading bytes. Needed because the widget API
// returns raw bytes with no content type, and <img> cannot render an SVG (or some
// other formats) from a typeless blob URL — SVG specifically requires
// image/svg+xml.
function sniffImageMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x3c) return "image/svg+xml"; // "<" → SVG/XML
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif"; // "GI"
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp"; // "RI" (RIFF)
  return "application/octet-stream";
}

// export for testing
export async function getAvatarFromWidgetAPI(
  api: WidgetApi,
  src: string,
): Promise<Blob> {
  const response = await api.downloadFile(src);
  const file = response.file;

  // element-web sends a Blob, and the MSC4039 is considering changing the spec to strictly Blob, so only handling that
  if (file instanceof Blob) {
    return file;
  } else if (typeof file === "string") {
    // it is a base64 string; tag the blob with a sniffed MIME type so <img> can
    // render it (SVG avatars in particular need image/svg+xml).
    const bytes = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: sniffImageMime(bytes) });
  }
  throw new Error(
    "Downloaded file format is not supported: " + typeof file + "",
  );
}
