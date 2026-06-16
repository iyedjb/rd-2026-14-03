import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'roda_bem_turismo_encryption_key_2024';

export function encryptData(data: string): string {
  if (!data) return '';
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

export function decryptData(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting data:', error);
    return '';
  }
}

export function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...data };
  fieldsToEncrypt.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      (encrypted as any)[field] = encryptData(encrypted[field] as string);
    }
  });
  return encrypted;
}

export function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...data };
  fieldsToDecrypt.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      (decrypted as any)[field] = decryptData(decrypted[field] as string);
    }
  });
  return decrypted;
}
