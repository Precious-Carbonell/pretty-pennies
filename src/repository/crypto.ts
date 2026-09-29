// ---------------------------------------------------------------------------
// Crypto helpers — turn a PIN into a key and encrypt the ledger at rest.
//
// Uses the Web Crypto API only (built into every modern browser, no libraries,
// no third parties). The PIN never leaves the device and is never stored; we
// only persist a random salt + the ciphertext. Wrong PIN => decryption fails,
// so nobody can read your money info without it.
// ---------------------------------------------------------------------------

const KEY_ITERATIONS = 150_000;

export interface EncryptedBlob {
  /** base64 */
  salt: string;
  /** base64 */
  iv: string;
  /** base64 */
  ciphertext: string;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

/** Random bytes backed by a plain ArrayBuffer (satisfies BufferSource typing). */
function randomBytes(len: number): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(new ArrayBuffer(len));
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KEY_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJSON(pin: string, value: unknown): Promise<EncryptedBlob> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(value)) as Uint8Array<ArrayBuffer>;
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(cipher),
  };
}

/** Returns the parsed value, or throws if the PIN is wrong / data is corrupt. */
export async function decryptJSON<T>(pin: string, blob: EncryptedBlob): Promise<T> {
  const salt = fromBase64(blob.salt);
  const iv = fromBase64(blob.iv);
  const key = await deriveKey(pin, salt);
  const cipher = fromBase64(blob.ciphertext);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  const text = new TextDecoder().decode(plain);
  return JSON.parse(text) as T;
}
