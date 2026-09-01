import type { WsEvent } from "@transfer-file/shared";

type WsClient = {
  send: (data: string) => void;
  role?: string;
};

export class WsHub {
  private clients = new Set<WsClient>();

  add(client: WsClient): void {
    this.clients.add(client);
  }

  remove(client: WsClient): void {
    this.clients.delete(client);
  }

  broadcast(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      try {
        client.send(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export const wsHub = new WsHub();
