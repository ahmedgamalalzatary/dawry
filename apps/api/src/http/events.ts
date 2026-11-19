import { EventEmitter } from "node:events";
import type { Response } from "express";

/**
 * In-process "something changed" bus, keyed by restaurant id.
 * Events carry no data; clients refetch through the normal endpoints.
 */
export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(restaurantId: string) {
    this.emitter.emit("change", restaurantId);
  }

  subscribe(listener: (restaurantId: string) => void) {
    this.emitter.on("change", listener);
    return () => this.emitter.off("change", listener);
  }
}

const HEARTBEAT_MS = 25_000;

/**
 * Open a Server-Sent Events stream. `shouldNotify` decides per change whether
 * this client cares; it receives `event: change`.
 */
export function openStream(
  res: Response,
  bus: EventBus,
  shouldNotify: (restaurantId: string) => boolean | Promise<boolean>,
) {
  if (res.destroyed || res.writableEnded) return;
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write("event: ready\ndata: {}\n\n");

  const unsubscribe = bus.subscribe(async (restaurantId) => {
    try {
      if (await shouldNotify(restaurantId) && !res.destroyed && !res.writableEnded) {
        res.write("event: change\ndata: {}\n\n");
      }
    } catch {
      // A failed filter only skips this notification.
    }
  });
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  res.once("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
