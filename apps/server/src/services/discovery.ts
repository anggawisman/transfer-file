import Bonjour from "bonjour-service";
import type { AppConfig } from "../config.js";
import { APP_NAME } from "../config.js";

export interface DiscoveryHandle {
  stop: () => void;
}

export function startDiscovery(config: AppConfig): DiscoveryHandle {
  const bonjour = new Bonjour();
  const service = bonjour.publish({
    name: APP_NAME,
    type: "transfer-file",
    port: config.port,
    txt: { version: "0.1.0" },
  });

  return {
    stop: () => {
      service.stop();
      bonjour.destroy();
    },
  };
}
