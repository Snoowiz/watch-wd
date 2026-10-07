import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  sanitizeKey,
  isMaskedSecret,
  maskSecret,
  getPaymentGatewaySettings,
  savePaymentGatewaySettings,
  getAdminPaymentSettings,
  getPublicPaymentSettings,
} from '../db/persistentConfig.js';
import pool from '../db/connection.js';

describe('Persistent Configuration & Credentials Protection Suite', () => {
  const SECURE_DIR = path.join(process.cwd(), 'data', 'secure_settings');
  const gatewayFile = path.join(SECURE_DIR, 'payment_settings_gateway.json');

  beforeEach(() => {
    // Reset pool.execute mock if mocked, or prepare clean state
    vi.restoreAllMocks();
  });

  describe('1. Key Sanitization & Masking Detection', () => {
    it('should correctly identify masked secrets with bullet characters or asterisks', () => {
      expect(isMaskedSecret('••••••••')).toBe(true);
      expect(isMaskedSecret('sk_test_••••••••1234')).toBe(true);
      expect(isMaskedSecret('****')).toBe(true);
      expect(isMaskedSecret('sk_test_51PABCD1234567890')).toBe(false);
      expect(isMaskedSecret('')).toBe(false);
      expect(isMaskedSecret(null)).toBe(false);
    });

    it('should sanitize whitespace, newlines, tabs, and quotation marks from keys', () => {
      expect(sanitizeKey('  "sk_live_123456" \r\n\t')).toBe('sk_live_123456');
      expect(sanitizeKey("'pk_test_abcdef'")).toBe('pk_test_abcdef');
      expect(sanitizeKey('')).toBe('');
      expect(sanitizeKey(undefined)).toBe('');
    });

    it('should generate consistent mask representations for display in admin UI', () => {
      const masked = maskSecret('sk_test_51Pabcdefghijklmnopqrstuvwxyz1234');
      expect(masked).toBe('sk_test_••••••••1234');
      expect(maskSecret('short')).toBe('••••••••');
      expect(maskSecret('')).toBe('');
    });
  });

  describe('2. Masked Secret Protection during Admin Saves', () => {
    it('should reject API key identifiers starting with mk_', async () => {
      await expect(
        savePaymentGatewaySettings({
          stripe: {
            enabled: true,
            publicKey: 'pk_test_123',
            secretKey: 'mk_1234567890abcdef',
            isTestMode: true,
          },
        })
      ).rejects.toThrow(/Invalid Stripe Secret Key: An API Key Identifier/);
    });

    it('should preserve active unmasked secret key when admin saves masked bullet string', async () => {
      // Mock existing DB record having a real key
      const executeSpy = vi.spyOn(pool, 'execute');
      executeSpy.mockResolvedValue([
        [
          {
            value: JSON.stringify({
              stripe: {
                enabled: true,
                publicKey: 'pk_test_originalPublic',
                secretKey: 'sk_test_realSecretKey54321',
                isTestMode: true,
                merchantCurrency: 'GBP',
              },
              paypal: { enabled: false },
              paystack: { enabled: false },
            }),
          },
        ],
        [],
      ] as any);

      // Admin saves with masked string from UI (e.g. they only changed the public key)
      const saved = await savePaymentGatewaySettings({
        stripe: {
          enabled: true,
          publicKey: 'pk_test_updatedPublic',
          secretKey: 'sk_test_••••••••4321', // masked!
          isTestMode: true,
          merchantCurrency: 'GBP',
        },
      });

      // The saved configuration must KEEP the real unmasked secret key!
      expect(saved.stripe.secretKey).toBe('sk_test_realSecretKey54321');
      expect(saved.stripe.publicKey).toBe('pk_test_updatedPublic');
    });

    it('should replace active secret key when admin provides a real new secret key', async () => {
      const executeSpy = vi.spyOn(pool, 'execute');
      executeSpy.mockResolvedValue([
        [
          {
            value: JSON.stringify({
              stripe: {
                enabled: true,
                publicKey: 'pk_test_old',
                secretKey: 'sk_test_oldKey111',
                isTestMode: true,
              },
            }),
          },
        ],
        [],
      ] as any);

      const saved = await savePaymentGatewaySettings({
        stripe: {
          enabled: true,
          publicKey: 'pk_test_new',
          secretKey: 'sk_test_brandNewKey999',
          isTestMode: false,
        },
      });

      expect(saved.stripe.secretKey).toBe('sk_test_brandNewKey999');
      expect(saved.stripe.publicKey).toBe('pk_test_new');
      expect(saved.stripe.isTestMode).toBe(false);
    });
  });

  describe('3. Admin & Public Settings Isolation', () => {
    it('getAdminPaymentSettings should return masked secret key and flag hasSecretKey', async () => {
      const executeSpy = vi.spyOn(pool, 'execute');
      executeSpy.mockResolvedValue([
        [
          {
            value: JSON.stringify({
              stripe: {
                enabled: true,
                publicKey: 'pk_test_validPub',
                secretKey: 'sk_test_51Pabcdef1234',
                isTestMode: true,
              },
            }),
          },
        ],
        [],
      ] as any);

      const adminSettings = await getAdminPaymentSettings();
      expect(adminSettings.stripe.secretKey).toContain('••••');
      expect(adminSettings.stripe.hasSecretKey).toBe(true);
      expect(adminSettings.stripe.publicKey).toBe('pk_test_validPub');
    });

    it('getPublicPaymentSettings must never expose secret keys', async () => {
      const executeSpy = vi.spyOn(pool, 'execute');
      executeSpy.mockResolvedValue([
        [
          {
            value: JSON.stringify({
              stripe: {
                enabled: true,
                publicKey: 'pk_test_clientFacingKey',
                secretKey: 'sk_live_superSecret',
                isTestMode: false,
              },
            }),
          },
        ],
        [],
      ] as any);

      const publicSettings = await getPublicPaymentSettings();
      expect(publicSettings.stripe.publicKey).toBe('pk_test_clientFacingKey');
      expect((publicSettings.stripe as any).secretKey).toBeUndefined();
      expect(publicSettings.stripe.enabled).toBe(true);
    });
  });
});
