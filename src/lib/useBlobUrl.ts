"use client";

import { useEffect, useState } from "react";
import { getBlobUrl, revokeBlobUrl } from "./blobStore";

/**
 * Reference の種類を判定して適切な URL を返すフック。
 *
 *   - "data:..."   → そのまま返す（後方互換・base64）
 *   - "http(s)://" → そのまま返す（外部URL）
 *   - それ以外      → IndexedDB の Blob を取得 → object URL を返す
 */
export function useBlobUrl(ref: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setUrl(null);
      return;
    }

    // base64 / 外部URL はそのまま使用
    if (ref.startsWith("data:") || ref.startsWith("http")) {
      setUrl(ref);
      return;
    }

    // それ以外は IDB から取得
    let cancelled = false;
    let createdUrl: string | null = null;

    getBlobUrl(ref).then((u) => {
      if (cancelled) {
        if (u) revokeBlobUrl(u);
        return;
      }
      createdUrl = u;
      setUrl(u);
    });

    return () => {
      cancelled = true;
      if (createdUrl) revokeBlobUrl(createdUrl);
    };
  }, [ref]);

  return url;
}
