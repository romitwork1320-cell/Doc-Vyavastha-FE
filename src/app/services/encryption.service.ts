import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  // Use the same 32-character key as the C# backend.
  private readonly key = CryptoJS.enc.Utf8.parse('dreamworldi-9999');
  
  // The IV will be generated and prepended to the ciphertext, so we no longer need a fixed one.

  encrypt(plainText: string): string {
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(plainText, this.key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const combined = iv.concat(encrypted.ciphertext);
    const base64String = combined.toString(CryptoJS.enc.Base64);

    // --- NEW: Convert to URL-safe Base64 ---
    return base64String
      .replace(/\+/g, '-') // Replace + with -
      .replace(/\//g, '_') // Replace / with _
      .replace(/=+$/, '');  // Remove padding
  }

  // Decryption is not needed on the client, but provided for completeness
  decrypt(encryptedText: string): string {
    try {
      // 1. Revert URL-safe characters to standard Base64
      let base64 = encryptedText.replace(/-/g, '+').replace(/_/g, '/');

      // 2. Add padding back (Base64 length must be multiple of 4)
      const padding = base64.length % 4;
      if (padding > 0) {
        base64 += '='.repeat(4 - padding);
      }

      // 3. Parse and Decrypt (Existing logic)
      const combined = CryptoJS.enc.Base64.parse(base64);
      
      const iv = combined.clone();
      iv.sigBytes = 16;
      iv.words.splice(4); 

      const ciphertext = combined.clone();
      ciphertext.words.splice(0, 4);
      ciphertext.sigBytes = ciphertext.words.length * 4;

      const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext } as any, this.key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}