import crypto from 'crypto';

/**
 * Derive a stable UUID (v5-like) from an external provider ID.
 * This avoids DB type mismatches (UUID) while keeping IDs deterministic.
 */
export function uuidFromProviderId(provider: string, providerUserId: string): string {
  const input = `${provider}:${providerUserId}`;
  const hash = crypto.createHash('sha1').update(input).digest(); // 20 bytes
  const bytes = Buffer.from(hash.subarray(0, 16)); // first 16 bytes

  // Set UUID version (v5 -> 0101)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // Set variant (RFC 4122 -> 10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20)
  ].join('-');
}

