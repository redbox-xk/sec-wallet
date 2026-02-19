// This worker handles all cryptographic operations in isolation
let encryptionKey: CryptoKey | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      // Generate or import key
      encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      self.postMessage({ type: 'INIT_DONE' });
      break;

    case 'ENCRYPT':
      if (!encryptionKey) throw new Error('Key not initialized');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(payload.data);
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encoded
      );
      self.postMessage({
        type: 'ENCRYPT_RESULT',
        payload: { ciphertext, iv: Array.from(iv) }
      }, [ciphertext]);
      break;

    case 'DECRYPT':
      // Similar logic...
      break;
  }
};