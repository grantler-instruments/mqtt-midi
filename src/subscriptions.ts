import type { MqttClient } from "mqtt";

export class TopicSubscriptionRegistry {
  private readonly refCounts = new Map<string, number>();

  get topics(): string[] {
    return [...this.refCounts.keys()];
  }

  refCount(topic: string): number {
    return this.refCounts.get(topic) ?? 0;
  }

  /** @returns true when this is the first reference to the topic */
  increment(topic: string): boolean {
    const next = (this.refCounts.get(topic) ?? 0) + 1;
    this.refCounts.set(topic, next);
    return next === 1;
  }

  /** @returns true when the last reference was removed */
  decrement(topic: string): boolean {
    const current = this.refCounts.get(topic) ?? 0;
    if (current <= 0) {
      return false;
    }
    const next = current - 1;
    if (next === 0) {
      this.refCounts.delete(topic);
      return true;
    }
    this.refCounts.set(topic, next);
    return false;
  }

  async subscribe(client: MqttClient, topic: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.subscribe(topic, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async unsubscribe(client: MqttClient, topic: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.unsubscribe(topic, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
