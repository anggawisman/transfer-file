import { useEffect } from "react";
import type { WsEvent } from "@transfer-file/shared";
import { clearSession, connectWebSocket } from "../api/client";

export function useSessionEnded(onEnded: () => void): void {
  useEffect(() => {
    const ws = connectWebSocket((event: WsEvent) => {
      if (event.type === "session_ended") {
        clearSession();
        onEnded();
      }
    });
    return () => ws.close();
  }, [onEnded]);
}
