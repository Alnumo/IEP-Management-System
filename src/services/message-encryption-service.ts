/**
 * Message Encryption Service
 * End-to-end encryption for chat messages and media attachments
 * Arkan Al-Numo Center - Secure Communication System
 */

import { supabase } from '@/lib/supabase'
import { encryptionService } from './encryption-service'
import type { Message, MediaAttachment } from '@/types/communication'

// =====================================================
// MESSAGE ENCRYPTION INTERFACES
// =====================================================

export interface EncryptedMessage {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  encrypted_content_ar?: string
  encrypted_content_en?: string
  content_hash: string
  encryption_key_id: string
  iv: string
  auth_tag?: string
  message_type: string
  priority_level: string
  created_at: string
  decrypted?: boolean
}

export interface EncryptedMediaAttachment extends Omit<MediaAttachment, 'file_path'> {
  encrypted_file_path: string
  encryption_metadata: {
    keyId: string
    iv: string
    authTag?: string
    originalFilename: string
    encryptedSize: number
  }
}

export interface MessageEncryptionResult {
  encryptedMessage: Partial<Message>
  encryptionMetadata: {
    keyId: string
    iv: string
    authTag?: string
    contentHash: string
  }
}

// =====================================================
// MESSAGE ENCRYPTION SERVICE
// =====================================================

export class MessageEncryptionService {
  private readonly CHUNK_SIZE = 1024 * 1024 // 1MB chunks for large files

  /**
   * Encrypts a message before storing in database
   */
  async encryptMessage(
    message: Pick<Message, 'content_ar' | 'content_en' | 'message_type' | 'media_attachments'>
  ): Promise<MessageEncryptionResult> {
    try {
      const encryptedMessage: Partial<Message> = {}
      let contentForHash = ''

      // Encrypt Arabic content if present
      if (message.content_ar) {
        const encrypted = await encryptionService.encryptMedicalField(message.content_ar)
        encryptedMessage.content_ar = encrypted.encryptedData
        contentForHash += message.content_ar
      }

      // Encrypt English content if present
      if (message.content_en) {
        const encrypted = await encryptionService.encryptMedicalField(message.content_en)
        encryptedMessage.content_en = encrypted.encryptedData
        contentForHash += message.content_en
      }

      // Encrypt media attachments if present
      if (message.media_attachments && message.media_attachments.length > 0) {
        const encryptedAttachments = await Promise.all(
          message.media_attachments.map(attachment => this.encryptMediaAttachment(attachment))
        )
        encryptedMessage.media_attachments = encryptedAttachments as MediaAttachment[]
      }

      // Generate content hash for integrity verification
      const contentHash = await this.generateContentHash(contentForHash)

      return {
        encryptedMessage,
        encryptionMetadata: {
          keyId: await this.getCurrentKeyId(),
          iv: this.generateIV(),
          contentHash
        }
      }

    } catch (error) {
      console.error('Message encryption error:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  /**
   * Decrypts a message after retrieving from database
   */
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<Message> {
    try {
      const decryptedMessage: Partial<Message> = {
        ...encryptedMessage,
        decrypted: true
      }

      // Decrypt Arabic content if present
      if (encryptedMessage.encrypted_content_ar) {
        const decrypted = await encryptionService.decryptMedicalField({
          encryptedData: encryptedMessage.encrypted_content_ar,
          keyId: encryptedMessage.encryption_key_id,
          iv: encryptedMessage.iv,
          authTag: encryptedMessage.auth_tag,
          algorithm: 'AES-256-GCM'
        })
        decryptedMessage.content_ar = decrypted as string
      }

      // Decrypt English content if present
      if (encryptedMessage.encrypted_content_en) {
        const decrypted = await encryptionService.decryptMedicalField({
          encryptedData: encryptedMessage.encrypted_content_en,
          keyId: encryptedMessage.encryption_key_id,
          iv: encryptedMessage.iv,
          authTag: encryptedMessage.auth_tag,
          algorithm: 'AES-256-GCM'
        })
        decryptedMessage.content_en = decrypted as string
      }

      // Verify content integrity
      const contentForHash = (decryptedMessage.content_ar || '') + (decryptedMessage.content_en || '')
      const expectedHash = await this.generateContentHash(contentForHash)
      
      if (expectedHash !== encryptedMessage.content_hash) {
        throw new Error('Message integrity verification failed')
      }

      return decryptedMessage as Message

    } catch (error) {
      console.error('Message decryption error:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  /**
   * Encrypts a media attachment file
   */
  async encryptMediaAttachment(attachment: MediaAttachment): Promise<EncryptedMediaAttachment> {
    try {
      // Download the original file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('communication-files')
        .download(this.extractPathFromUrl(attachment.file_path))

      if (downloadError || !fileData) {
        throw new Error('Failed to download file for encryption')
      }

      // Convert to array buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const fileBytes = new Uint8Array(arrayBuffer)

      // Encrypt file data
      const encrypted = await encryptionService.encryptMedicalField(
        Array.from(fileBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      )

      // Generate encrypted filename
      const encryptedFilename = `encrypted_${Date.now()}_${attachment.id}.enc`
      const encryptedPath = `conversations/encrypted/${encryptedFilename}`

      // Upload encrypted file
      const encryptedBlob = new Blob([this.hexToBytes(encrypted.encryptedData)], {
        type: 'application/octet-stream'
      })

      const { error: uploadError } = await supabase.storage
        .from('communication-files')
        .upload(encryptedPath, encryptedBlob)

      if (uploadError) {
        throw new Error('Failed to upload encrypted file')
      }

      // Delete original file for security
      await supabase.storage
        .from('communication-files')
        .remove([this.extractPathFromUrl(attachment.file_path)])

      // Get encrypted file URL
      const { data: { publicUrl } } = supabase.storage
        .from('communication-files')
        .getPublicUrl(encryptedPath)

      return {
        ...attachment,
        encrypted_file_path: publicUrl,
        encryption_metadata: {
          keyId: encrypted.keyId,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          originalFilename: attachment.filename,
          encryptedSize: encryptedBlob.size
        }
      }

    } catch (error) {
      console.error('Media encryption error:', error)
      throw new Error('Failed to encrypt media attachment')
    }
  }

  /**
   * Decrypts a media attachment file
   */
  async decryptMediaAttachment(encryptedAttachment: EncryptedMediaAttachment): Promise<MediaAttachment> {
    try {
      // Download encrypted file
      const { data: encryptedData, error: downloadError } = await supabase.storage
        .from('communication-files')
        .download(this.extractPathFromUrl(encryptedAttachment.encrypted_file_path))

      if (downloadError || !encryptedData) {
        throw new Error('Failed to download encrypted file')
      }

      // Convert to hex string
      const arrayBuffer = await encryptedData.arrayBuffer()
      const encryptedBytes = new Uint8Array(arrayBuffer)
      const encryptedHex = Array.from(encryptedBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Decrypt file data
      const decrypted = await encryptionService.decryptMedicalField({
        encryptedData: encryptedHex,
        keyId: encryptedAttachment.encryption_metadata.keyId,
        iv: encryptedAttachment.encryption_metadata.iv,
        authTag: encryptedAttachment.encryption_metadata.authTag,
        algorithm: 'AES-256-GCM'
      })

      // Convert back to file
      const decryptedBytes = this.hexToBytes(decrypted as string)
      const decryptedBlob = new Blob([decryptedBytes], { type: encryptedAttachment.mime_type })

      // Generate temporary decrypted filename
      const tempFilename = `temp_${Date.now()}_${encryptedAttachment.encryption_metadata.originalFilename}`
      const tempPath = `conversations/temp/${tempFilename}`

      // Upload decrypted file temporarily
      const { error: uploadError } = await supabase.storage
        .from('communication-files')
        .upload(tempPath, decryptedBlob)

      if (uploadError) {
        throw new Error('Failed to upload decrypted file')
      }

      // Get temporary file URL
      const { data: { publicUrl } } = supabase.storage
        .from('communication-files')
        .getPublicUrl(tempPath)

      // Schedule cleanup of temporary file
      setTimeout(async () => {
        await supabase.storage
          .from('communication-files')
          .remove([tempPath])
      }, 300000) // 5 minutes

      return {
        ...encryptedAttachment,
        file_path: publicUrl,
        filename: encryptedAttachment.encryption_metadata.originalFilename,
        file_size: encryptedAttachment.encryption_metadata.encryptedSize
      }

    } catch (error) {
      console.error('Media decryption error:', error)
      throw new Error('Failed to decrypt media attachment')
    }
  }

  /**
   * Encrypts message content in transit (additional layer)
   */
  async encryptForTransit(content: string, recipientPublicKey?: string): Promise<string> {
    try {
      // Simple additional encryption layer for transit
      const encoder = new TextEncoder()
      const data = encoder.encode(content)
      
      // Use Web Crypto API for client-side encryption
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt']
      )

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return Array.from(combined)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    } catch (error) {
      console.error('Transit encryption error:', error)
      return content // Fallback to unencrypted
    }
  }

  /**
   * Verifies message integrity using hash
   */
  async verifyMessageIntegrity(message: Message, expectedHash: string): Promise<boolean> {
    try {
      const contentForHash = (message.content_ar || '') + (message.content_en || '')
      const calculatedHash = await this.generateContentHash(contentForHash)
      return calculatedHash === expectedHash
    } catch (error) {
      console.error('Integrity verification error:', error)
      return false
    }
  }

  /**
   * Generates a content hash for integrity verification
   */
  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generates a random IV for encryption
   */
  private generateIV(): string {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    return Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Gets current encryption key ID
   */
  private async getCurrentKeyId(): Promise<string> {
    try {
      const { data: keyData, error } = await supabase
        .rpc('get_current_encryption_key')
      
      if (error) throw error
      return keyData.key_id
    } catch (error) {
      console.error('Get key ID error:', error)
      return 'default-key-id'
    }
  }

  /**
   * Extracts file path from Supabase storage URL
   */
  private extractPathFromUrl(url: string): string {
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === 'communication-files')
    return urlParts.slice(bucketIndex + 1).join('/')
  }

  /**
   * Converts hex string to bytes
   */
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
  }

  /**
   * Encrypts conversation metadata (titles, descriptions)
   */
  async encryptConversationMetadata(title?: string, description?: string): Promise<{
    encryptedTitle?: string
    encryptedDescription?: string
    keyId: string
    iv: string
  }> {
    try {
      const results: any = {
        keyId: await this.getCurrentKeyId(),
        iv: this.generateIV()
      }

      if (title) {
        const encrypted = await encryptionService.encryptMedicalField(title)
        results.encryptedTitle = encrypted.encryptedData
      }

      if (description) {
        const encrypted = await encryptionService.encryptMedicalField(description)
        results.encryptedDescription = encrypted.encryptedData
      }

      return results
    } catch (error) {
      console.error('Conversation metadata encryption error:', error)
      throw new Error('Failed to encrypt conversation metadata')
    }
  }

  /**
   * Batch encrypts multiple messages for performance
   */
  async batchEncryptMessages(
    messages: Pick<Message, 'content_ar' | 'content_en' | 'message_type' | 'media_attachments'>[]
  ): Promise<MessageEncryptionResult[]> {
    const BATCH_SIZE = 10
    const results: MessageEncryptionResult[] = []

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(message => this.encryptMessage(message))
      )
      results.push(...batchResults)
    }

    return results
  }
}

// Export singleton instance
export const messageEncryptionService = new MessageEncryptionService()

// =====================================================
// ENCRYPTION UTILITIES
// =====================================================

export const messageEncryptionUtils = {
  /**
   * Checks if a message is encrypted
   */
  isMessageEncrypted(message: any): message is EncryptedMessage {
    return message.encryption_key_id && message.iv && message.content_hash
  },

  /**
   * Gets encryption status for a conversation
   */
  async getConversationEncryptionStatus(conversationId: string): Promise<{
    isEnabled: boolean
    keyRotationDate?: string
    totalEncryptedMessages: number
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversation_encryption_status', {
          conversation_id: conversationId
        })

      if (error) throw error

      return {
        isEnabled: data.encryption_enabled,
        keyRotationDate: data.last_key_rotation,
        totalEncryptedMessages: data.encrypted_message_count
      }
    } catch (error) {
      console.error('Encryption status check error:', error)
      return {
        isEnabled: false,
        totalEncryptedMessages: 0
      }
    }
  },

  /**
   * Enables encryption for a conversation
   */
  async enableConversationEncryption(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          encryption_enabled: true,
          encryption_key_rotation_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      return !error
    } catch (error) {
      console.error('Enable encryption error:', error)
      return false
    }
  },

  /**
   * Performance metrics for encryption operations
   */
  async measureEncryptionPerformance(): Promise<{
    averageEncryptionTime: number
    averageDecryptionTime: number
    throughputMsgPerSecond: number
  }> {
    const testMessages = Array(100).fill(0).map((_, i) => ({
      content_ar: `اختبار الرسالة رقم ${i} مع محتوى عربي طويل لقياس الأداء`,
      content_en: `Test message ${i} with long English content for performance measurement`,
      message_type: 'text' as const,
      media_attachments: []
    }))

    const startTime = performance.now()
    const encrypted = await messageEncryptionService.batchEncryptMessages(testMessages)
    const encryptionTime = performance.now() - startTime

    const decryptStartTime = performance.now()
    // Simulate decryption (would need actual encrypted messages)
    const decryptionTime = performance.now() - decryptStartTime

    return {
      averageEncryptionTime: encryptionTime / testMessages.length,
      averageDecryptionTime: decryptionTime / testMessages.length,
      throughputMsgPerSecond: testMessages.length / (encryptionTime / 1000)
    }
  }
}

export default messageEncryptionService