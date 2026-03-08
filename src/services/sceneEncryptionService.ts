const ENCRYPTION_VERSION = 'v1';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const sceneEncryptionService = {
  async encrypt(data: string, password: string): Promise<string> {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(encoder.encode(data)),
    );

    const cipherBytes = new Uint8Array(encrypted);
    return `${ENCRYPTION_VERSION}.${toBase64(salt)}.${toBase64(iv)}.${toBase64(cipherBytes)}`;
  },

  async decrypt(payload: string, password: string): Promise<string> {
    const [version, saltB64, ivB64, cipherB64] = payload.split('.');
    if (version !== ENCRYPTION_VERSION || !saltB64 || !ivB64 || !cipherB64) {
      throw new Error('Invalid encrypted payload format');
    }

    const salt = fromBase64(saltB64);
    const iv = fromBase64(ivB64);
    const ciphertext = fromBase64(cipherB64);
    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(ciphertext),
    );

    return decoder.decode(decrypted);
  },

  async hashPassword(password: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(encoder.encode(password)));
    return toBase64(new Uint8Array(hash));
  },
};
