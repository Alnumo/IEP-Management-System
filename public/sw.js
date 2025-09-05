/**
 * Service Worker for Push Notifications
 * Handles background push notifications for the communication system
 */

const CACHE_NAME = 'arkan-communication-v1'
const NOTIFICATION_SOUND = '/sounds/notification.mp3'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/icons/message-icon.png',
        '/icons/voice-call-icon.png',
        '/icons/emergency-icon.png',
        '/sounds/notification.mp3',
        '/sounds/call-ringtone.mp3'
      ])
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event.data?.text())
  
  let notificationData
  try {
    notificationData = event.data ? event.data.json() : {}
  } catch (error) {
    console.error('Invalid push data:', error)
    notificationData = {
      title: 'رسالة جديدة',
      body: 'لديك رسالة جديدة في التطبيق',
      icon: '/icons/default-notification.png'
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/default-notification.png',
    badge: notificationData.badge || '/icons/badge.png',
    tag: notificationData.tag || 'default',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    vibrate: notificationData.vibrate || [200, 100, 200],
    data: notificationData.data || {},
    actions: getNotificationActions(notificationData.type),
    dir: 'rtl', // Right-to-left for Arabic
    lang: 'ar'
  }

  // Handle different notification types
  if (notificationData.type === 'voice_call') {
    options.requireInteraction = true
    options.silent = false
    options.vibrate = [300, 100, 300, 100, 300]
  } else if (notificationData.type === 'message_urgent') {
    options.requireInteraction = true
    options.vibrate = [500, 200, 500]
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.data)
  
  event.notification.close()
  
  const data = event.notification.data
  let url = '/'

  // Determine URL based on notification type
  switch (data.type) {
    case 'message':
    case 'message_urgent':
    case 'message_priority':
      url = `/conversations/${data.conversationId}?message=${data.messageId}`
      break
    case 'voice_call':
      if (event.action === 'answer') {
        url = `/call/answer/${data.callId}`
      } else if (event.action === 'decline') {
        // Send decline signal to server
        sendCallResponse(data.callId, 'declined')
        return
      } else {
        url = `/conversations/${data.conversationId}?call=${data.callId}`
      }
      break
    case 'file_shared':
      url = `/conversations/${data.conversationId}?file=${data.fileId}`
      break
    default:
      url = '/dashboard'
  }

  // Handle notification actions
  if (event.action) {
    handleNotificationAction(event.action, data)
    return
  }

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus existing window and navigate
          client.focus()
          client.postMessage({
            type: 'NAVIGATE',
            url: url,
            data: data
          })
          return
        }
      }
      // Open new window
      return clients.openWindow(url)
    })
  )
})

// Background sync for offline message sending
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'send-queued-messages') {
    event.waitUntil(sendQueuedMessages())
  } else if (event.tag === 'upload-queued-files') {
    event.waitUntil(uploadQueuedFiles())
  }
})

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)
  
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CACHE_MESSAGE':
      cacheMessage(payload)
      break
    case 'QUEUE_FILE_UPLOAD':
      queueFileUpload(payload)
      break
    case 'UPDATE_CALL_STATUS':
      updateCallNotification(payload)
      break
  }
})

// Helper Functions

function getNotificationActions(type) {
  switch (type) {
    case 'voice_call':
    case 'voice_call_emergency':
      return [
        {
          action: 'answer',
          title: 'رد',
          icon: '/icons/answer-call.png'
        },
        {
          action: 'decline',
          title: 'رفض',
          icon: '/icons/decline-call.png'
        }
      ]
    case 'message':
    case 'message_urgent':
      return [
        {
          action: 'reply',
          title: 'رد سريع',
          icon: '/icons/quick-reply.png'
        },
        {
          action: 'mark_read',
          title: 'تم القراءة',
          icon: '/icons/mark-read.png'
        }
      ]
    default:
      return []
  }
}

function handleNotificationAction(action, data) {
  switch (action) {
    case 'answer':
      // Open call interface
      clients.openWindow(`/call/answer/${data.callId}`)
      break
    case 'decline':
      sendCallResponse(data.callId, 'declined')
      break
    case 'reply':
      // Open conversation with reply focus
      clients.openWindow(`/conversations/${data.conversationId}?reply=${data.messageId}`)
      break
    case 'mark_read':
      markMessageAsRead(data.messageId)
      break
  }
}

async function sendCallResponse(callId, response) {
  try {
    // Send message to all clients
    const clientList = await clients.matchAll()
    clientList.forEach(client => {
      client.postMessage({
        type: 'CALL_RESPONSE',
        callId: callId,
        response: response
      })
    })
  } catch (error) {
    console.error('Failed to send call response:', error)
  }
}

async function markMessageAsRead(messageId) {
  try {
    const clientList = await clients.matchAll()
    clientList.forEach(client => {
      client.postMessage({
        type: 'MARK_MESSAGE_READ',
        messageId: messageId
      })
    })
  } catch (error) {
    console.error('Failed to mark message as read:', error)
  }
}

async function sendQueuedMessages() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const queuedMessages = await getFromIndexedDB('queued_messages')
    
    if (!queuedMessages || queuedMessages.length === 0) {
      return
    }

    const clientList = await clients.matchAll()
    if (clientList.length > 0) {
      // App is active, delegate to main thread
      clientList[0].postMessage({
        type: 'SEND_QUEUED_MESSAGES',
        messages: queuedMessages
      })
    } else {
      // App is closed, try to send via fetch
      for (const message of queuedMessages) {
        try {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          })
          // Remove from queue on success
          await removeFromIndexedDB('queued_messages', message.id)
        } catch (error) {
          console.error('Failed to send queued message:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error in sendQueuedMessages:', error)
  }
}

async function uploadQueuedFiles() {
  try {
    const queuedFiles = await getFromIndexedDB('queued_files')
    
    if (!queuedFiles || queuedFiles.length === 0) {
      return
    }

    const clientList = await clients.matchAll()
    if (clientList.length > 0) {
      // App is active, delegate to main thread
      clientList[0].postMessage({
        type: 'UPLOAD_QUEUED_FILES',
        files: queuedFiles
      })
    }
  } catch (error) {
    console.error('Error in uploadQueuedFiles:', error)
  }
}

function cacheMessage(message) {
  // Cache message for offline access
  addToIndexedDB('cached_messages', message)
}

function queueFileUpload(fileData) {
  // Queue file for background upload
  addToIndexedDB('queued_files', fileData)
}

function updateCallNotification(callData) {
  // Update ongoing call notification
  if (callData.status === 'ended') {
    // Close call notification
    self.registration.getNotifications({ tag: `call-${callData.callId}` })
      .then(notifications => {
        notifications.forEach(notification => notification.close())
      })
  }
}

// IndexedDB helpers
function addToIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CommunicationDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      store.add(data)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CommunicationDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const getAll = store.getAll()
      
      getAll.onsuccess = () => resolve(getAll.result)
      getAll.onerror = () => reject(getAll.error)
    }
  })
}

function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CommunicationDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      store.delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }
  })
}