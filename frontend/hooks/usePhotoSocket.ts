"use client";

import { useEffect } from "react";

interface UsePhotoSocketOptions {
  onUpdate: () => void;
}

/**
 * Opens a persistent WebSocket to /ws/photos.
 * On {"type": "photo_added"} → calls onUpdate().
 * Auto-reconnects with a fixed 3-second delay on close.
 * Degrades gracefully if the WebSocket cannot be established.
 */
export function usePhotoSocket({ onUpdate }: UsePhotoSocketOptions): void {
  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const wsUrl = apiUrl.replace(/^http/, "ws") + "/api/ws/photos";

    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        // WebSocket constructor can throw in some environments — swallow it
        schedule();
        return;
      }

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(event.data) as { type: string };
          if (msg.type === "photo_added") {
            onUpdate();
          }
        } catch {
          // Ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        ws = null;
        schedule();
      };

      ws.onerror = () => {
        // onclose fires next — reconnect is handled there
      };
    }

    function schedule() {
      if (destroyed) return;
      retryTimeout = setTimeout(() => {
        connect();
      }, 3000);
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      ws?.close();
    };
  }, [onUpdate]);
}
