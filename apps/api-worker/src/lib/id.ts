const textEncoder = new TextEncoder();

export async function uuidFromProviderId(provider: string, providerUserId: string): Promise<string> {
  const input = `${provider}:${providerUserId}`;
  const buffer = await crypto.subtle.digest("SHA-1", textEncoder.encode(input));
  const hash = new Uint8Array(buffer).slice(0, 16);

  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant RFC 4122

  const hex: string[] = [];
  for (const byte of hash) {
    hex.push(byte.toString(16).padStart(2, "0"));
  }

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

