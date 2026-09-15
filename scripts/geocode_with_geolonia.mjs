import { normalize } from "@geolonia/normalize-japanese-addresses";
import readline from "node:readline";
import { geoloniaResult } from "./geolonia_result.mjs";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const addresses = [];
for await (const line of rl) {
  const address = line.trim();
  if (address) addresses.push(address);
}
const results = new Array(addresses.length);
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= addresses.length) return;
    const address = addresses[index];
  try {
    const r = await normalize(address);
      results[index] = geoloniaResult(address, r);
  } catch (e) {
      results[index] = { input: address, error: String(e), lat: null, lon: null };
    }
  }
}
await Promise.all(Array.from({ length: Math.min(12, addresses.length) }, worker));
for (const result of results) process.stdout.write(JSON.stringify(result) + "\n");
