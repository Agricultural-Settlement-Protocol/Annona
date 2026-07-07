/**
 * SHA-256 helper for anchoring off-chain proof references on-chain as a
 * BytesN<32>. Used for the residu remittance `ref_hash` (hash of the bank
 * transfer reference + uploaded proof filename). PII/proofs stay off-chain;
 * only this hash is anchored (Golden Rule 1).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
