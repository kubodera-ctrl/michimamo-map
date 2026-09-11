import { normalize } from "@geolonia/normalize-japanese-addresses";
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  const address = line.trim();
  if (!address) continue;
  try {
    const r = await normalize(address);
    process.stdout.write(JSON.stringify({
      input: address,
      pref: r.pref ?? "",
      city: r.city ?? "",
      town: r.town ?? "",
      addr: r.addr ?? "",
      level: r.level ?? r.point?.level ?? null,
      lat: r.point?.lat ?? null,
      lon: r.point?.lng ?? null
    }) + "\n");
  } catch (e) {
    process.stdout.write(JSON.stringify({ input: address, error: String(e), lat: null, lon: null }) + "\n");
  }
}
