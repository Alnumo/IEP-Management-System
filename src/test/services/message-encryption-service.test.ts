/**
 * Message Encryption Service Unit Tests
 * Tests encryption and decryption functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { messageEncryptionService, messageEncryptionUtils } from '@/services/message-encryption-service'
import { encryptionService } from '@/services/encryption-service'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    rpc: vi.fn(() => ({ data: { encryption_enabled: true, encrypted_message_count: 5 }, error: null }))
  }
}))

vi.mock('@/services/encryption-service', () => ({
  encryptionService: {
    encryptMedicalField: vi.fn(() => Promise.resolve({
      encryptedData: 'encrypted-content',
      keyId: 'test-key-id',
      iv: 'test-iv',
      authTag: 'test-auth-tag',
      algorithm: 'AES-256-GCM'
    })),
    decryptMedicalField: vi.fn(() => Promise.resolve('decrypted content'))
  }
}))

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: vi.fn(() => Promise.resolve('mock-key')),
      encrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    })
  }
})

describe('MessageEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encryptMessage', () => {
    it('should encrypt Arabic message content', async () => {
      const message = {
        content_ar: 'رسالة سرية',
        content_en: 'Secret message',
        message_type: 'text' as const,
        media_attachments: []
      }

      const result = await messageEncryptionService.encryptMessage(message)

      expect(result).toHaveProperty('encryptedMessage')
      expect(result).toHaveProperty('encryptionMetadata')
      expect(result.encryptionMetadata).toHaveProperty('keyId')
      expect(result.encryptionMetadata).toHaveProperty('iv')
      expect(result.encryptionMetadata).toHaveProperty('contentHash')

      // Verify encryption service was called for both languages
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledWith('رسالة سرية')
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledWith('Secret message')
    })

    it('should handle messages with only Arabic content', async () => {
      const message = {
        content_ar: 'رسالة عربية فقط',
        message_type: 'text' as const,
        media_attachments: []
      }

      const result = await messageEncryptionService.encryptMessage(message)

      expect(result.encryptedMessage).toHaveProperty('content_ar')
      expect(result.encryptedMessage).not.toHaveProperty('content_en')
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledTimes(1)
    })

    it('should handle messages with only English content', async () => {
      const message = {
        content_en: 'English only message',
        message_type: 'text' as const,
        media_attachments: []
      }

      const result = await messageEncryptionService.encryptMessage(message)

      expect(result.encryptedMessage).toHaveProperty('content_en')
      expect(result.encryptedMessage).not.toHaveProperty('content_ar')
    })

    it('should generate content hash for integrity', async () => {
      const message = {
        content_ar: 'test content',
        message_type: 'text' as const,
        media_attachments: []
      }

      const result = await messageEncryptionService.encryptMessage(message)

      expect(result.encryptionMetadata.contentHash).toBeDefined()
      expect(typeof result.encryptionMetadata.contentHash).toBe('string')
      expect(result.encryptionMetadata.contentHash.length).toBeGreaterThan(0)
    })

    it('should handle encryption errors gracefully', async () => {
      vi.mocked(encryptionService.encryptMedicalField).mockRejectedValue(
        new Error('Encryption failed')
      )

      const message = {
        content_ar: 'test message',
        message_type: 'text' as const,
        media_attachments: []
      }

      await expect(messageEncryptionService.encryptMessage(message)).rejects.toThrow(
        'Failed to encrypt message'
      )
    })
  })

  describe('decryptMessage', () => {
    it('should decrypt message with both languages', async () => {
      const encryptedMessage = {
        id: 'test-id',
        encrypted_content_ar: 'encrypted-arabic',
        encrypted_content_en: 'encrypted-english',
        encryption_key_id: 'test-key',
        iv: 'test-iv',
        auth_tag: 'test-auth-tag',
        content_hash: 'test-hash'
      }

      // Mock successful decryption
      vi.mocked(encryptionService.decryptMedicalField)
        .mockResolvedValueOnce('رسالة عربية')
        .mockResolvedValueOnce('English message')

      // Mock hash generation to match
      const mockHash = 'test-hash'
      vi.spyOn(messageEncryptionService as any, 'generateContentHash')
        .mockResolvedValue(mockHash)

      const result = await messageEncryptionService.decryptMessage(encryptedMessage as any)

      expect(result).toHaveProperty('content_ar', 'رسالة عربية')
      expect(result).toHaveProperty('content_en', 'English message')
      expect(result).toHaveProperty('decrypted', true)
      expect(encryptionService.decryptMedicalField).toHaveBeenCalledTimes(2)
    })

    it('should verify message integrity', async () => {
      const encryptedMessage = {
        id: 'test-id',
        encrypted_content_ar: 'encrypted-content',
        encryption_key_id: 'test-key',
        iv: 'test-iv',
        auth_tag: 'test-auth-tag',
        content_hash: 'expected-hash'
      }

      vi.mocked(encryptionService.decryptMedicalField).mockResolvedValue('decrypted content')
      
      // Mock hash generation to not match
      vi.spyOn(messageEncryptionService as any, 'generateContentHash')
        .mockResolvedValue('different-hash')

      await expect(messageEncryptionService.decryptMessage(encryptedMessage as any))
        .rejects.toThrow('Message integrity verification failed')
    })

    it('should handle decryption errors', async () => {
      const encryptedMessage = {
        id: 'test-id',
        encrypted_content_ar: 'encrypted-content',
        encryption_key_id: 'test-key',
        iv: 'test-iv',
        content_hash: 'test-hash'
      }

      vi.mocked(encryptionService.decryptMedicalField).mockRejectedValue(
        new Error('Decryption failed')
      )

      await expect(messageEncryptionService.decryptMessage(encryptedMessage as any))
        .rejects.toThrow('Failed to decrypt message')
    })
  })

  describe('batchEncryptMessages', () => {
    it('should encrypt multiple messages efficiently', async () => {
      const messages = [
        {
          content_ar: 'رسالة أولى',
          message_type: 'text' as const,
          media_attachments: []
        },
        {
          content_ar: 'رسالة ثانية',
          message_type: 'text' as const,
          media_attachments: []
        },
        {
          content_ar: 'رسالة ثالثة',
          message_type: 'text' as const,
          media_attachments: []
        }
      ]

      const results = await messageEncryptionService.batchEncryptMessages(messages)

      expect(results).toHaveLength(3)
      expect(results[0]).toHaveProperty('encryptedMessage')
      expect(results[0]).toHaveProperty('encryptionMetadata')
    })

    it('should process messages in batches', async () => {
      // Create 25 messages (more than batch size of 10)
      const messages = Array(25).fill(0).map((_, i) => ({
        content_ar: `رسالة رقم ${i}`,
        message_type: 'text' as const,
        media_attachments: []
      }))

      const results = await messageEncryptionService.batchEncryptMessages(messages)

      expect(results).toHaveLength(25)
      // Should have processed in 3 batches (10, 10, 5)
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledTimes(25)
    })
  })

  describe('encryptConversationMetadata', () => {
    it('should encrypt conversation title and description', async () => {
      const result = await messageEncryptionService.encryptConversationMetadata(
        'عنوان المحادثة',
        'وصف المحادثة'
      )

      expect(result).toHaveProperty('encryptedTitle')
      expect(result).toHaveProperty('encryptedDescription')
      expect(result).toHaveProperty('keyId')
      expect(result).toHaveProperty('iv')

      expect(encryptionService.encryptMedicalField).toHaveBeenCalledWith('عنوان المحادثة')
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledWith('وصف المحادثة')
    })

    it('should handle optional parameters', async () => {
      const result = await messageEncryptionService.encryptConversationMetadata('عنوان فقط')

      expect(result).toHaveProperty('encryptedTitle')
      expect(result).not.toHaveProperty('encryptedDescription')
      expect(encryptionService.encryptMedicalField).toHaveBeenCalledTimes(1)
    })
  })

  describe('encryptForTransit', () => {
    it('should add additional encryption layer for transit', async () => {
      const content = 'sensitive message'
      
      const result = await messageEncryptionService.encryptForTransit(content)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result).not.toBe(content) // Should be different from original
    })

    it('should handle encryption failures gracefully', async () => {
      // Mock crypto.subtle to fail
      vi.mocked(crypto.subtle.generateKey).mockRejectedValue(new Error('Crypto failed'))

      const result = await messageEncryptionService.encryptForTransit('test message')

      // Should fallback to unencrypted content
      expect(result).toBe('test message')
    })
  })

  describe('verifyMessageIntegrity', () => {
    it('should verify message integrity correctly', async () => {
      const message = {
        content_ar: 'test content',
        content_en: 'test content'
      }
      const hash = 'expected-hash'

      vi.spyOn(messageEncryptionService as any, 'generateContentHash')
        .mockResolvedValue('expected-hash')

      const result = await messageEncryptionService.verifyMessageIntegrity(message as any, hash)

      expect(result).toBe(true)
    })

    it('should detect integrity violations', async () => {
      const message = { content_ar: 'original content' }
      const hash = 'expected-hash'

      vi.spyOn(messageEncryptionService as any, 'generateContentHash')
        .mockResolvedValue('different-hash')

      const result = await messageEncryptionService.verifyMessageIntegrity(message as any, hash)

      expect(result).toBe(false)
    })

    it('should handle verification errors', async () => {
      const message = { content_ar: 'test content' }

      vi.spyOn(messageEncryptionService as any, 'generateContentHash')
        .mockRejectedValue(new Error('Hash generation failed'))

      const result = await messageEncryptionService.verifyMessageIntegrity(message as any, 'hash')

      expect(result).toBe(false)
    })
  })
})

describe('MessageEncryptionUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isMessageEncrypted', () => {
    it('should identify encrypted messages', () => {
      const encryptedMessage = {
        encryption_key_id: 'key-123',
        iv: 'initialization-vector',
        content_hash: 'content-hash-value'
      }

      const result = messageEncryptionUtils.isMessageEncrypted(encryptedMessage)
      expect(result).toBe(true)
    })

    it('should identify unencrypted messages', () => {
      const unencryptedMessage = {
        content_ar: 'plain text message'
      }

      const result = messageEncryptionUtils.isMessageEncrypted(unencryptedMessage)
      expect(result).toBe(false)
    })

    it('should handle partial encryption metadata', () => {
      const partialMessage = {
        encryption_key_id: 'key-123'
        // Missing iv and content_hash
      }

      const result = messageEncryptionUtils.isMessageEncrypted(partialMessage)
      expect(result).toBe(false)
    })
  })

  describe('getConversationEncryptionStatus', () => {
    it('should return encryption status for conversation', async () => {
      const result = await messageEncryptionUtils.getConversationEncryptionStatus('conv-123')

      expect(result).toHaveProperty('isEnabled', true)
      expect(result).toHaveProperty('totalEncryptedMessages', 5)
      expect(supabase.rpc).toHaveBeenCalledWith('get_conversation_encryption_status', {
        conversation_id: 'conv-123'
      })
    })

    it('should handle database errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('DB error') })

      const result = await messageEncryptionUtils.getConversationEncryptionStatus('conv-123')

      expect(result).toEqual({
        isEnabled: false,
        totalEncryptedMessages: 0
      })
    })
  })

  describe('enableConversationEncryption', () => {
    it('should enable encryption for conversation', async () => {
      const result = await messageEncryptionUtils.enableConversationEncryption('conv-123')

      expect(result).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('conversations')
    })

    it('should handle enable encryption errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: new Error('Update failed') }))
        }))
      } as any)

      const result = await messageEncryptionUtils.enableConversationEncryption('conv-123')

      expect(result).toBe(false)
    })
  })

  describe('measureEncryptionPerformance', () => {
    it('should measure encryption performance', async () => {
      const result = await messageEncryptionUtils.measureEncryptionPerformance()

      expect(result).toHaveProperty('averageEncryptionTime')
      expect(result).toHaveProperty('averageDecryptionTime')
      expect(result).toHaveProperty('throughputMsgPerSecond')
      expect(typeof result.averageEncryptionTime).toBe('number')
      expect(typeof result.throughputMsgPerSecond).toBe('number')
    })

    it('should handle performance test errors', async () => {
      vi.mocked(encryptionService.encryptMedicalField).mockRejectedValue(
        new Error('Performance test failed')
      )

      // Should not throw but may return degraded metrics
      await expect(messageEncryptionUtils.measureEncryptionPerformance()).rejects.toThrow()
    })
  })
})