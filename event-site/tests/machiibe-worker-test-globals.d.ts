/**
 * R36 test-only Cloudflare Worker globals for the Next.js typecheck.
 * Do not import this file into the deployed Worker; the Worker's own tsconfig
 * uses the official @cloudflare/workers-types package.
 */
interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: {
    httpMetadata?: Record<string, unknown>;
    customMetadata?: Record<string, string>;
  }): Promise<unknown>;
}
interface Queue<T> {
  send(body: T): Promise<void>;
}
interface Message<T> {
  body: T;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}
interface MessageBatch<T> {
  queue: string;
  messages: Message<T>[];
}
