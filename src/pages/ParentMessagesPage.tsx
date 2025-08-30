import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
import { MessageThread } from '@/components/communication/MessageThread'
import { ConversationsList } from '@/components/communication/ConversationsList'
import { supabase } from '@/lib/supabase'
import type { ParentUser } from '@/types/parent-portal'

export default function ParentMessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check Supabase authentication first
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          // Fallback to localStorage for parent portal compatibility
          const storedUser = localStorage.getItem('parentUser')
          if (!storedUser) {
            navigate('/parent-login')
            return
          }
          
          const parentUserData = JSON.parse(storedUser)
          setParentUser(parentUserData)
          setCurrentUserId(parentUserData.id)
        } else {
          // Use Supabase user
          setCurrentUserId(user.id)
          // Try to get parent data from localStorage or create minimal data
          const storedUser = localStorage.getItem('parentUser')
          if (storedUser) {
            setParentUser(JSON.parse(storedUser))
          }
        }
      } catch (error) {
        console.error('Authentication error:', error)
        navigate('/parent-login')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [navigate])

  const handleVoiceCall = (conversationId?: string) => {
    const targetConversation = conversationId || selectedConversationId
    if (targetConversation) {
      console.log('Starting voice call for conversation:', targetConversation)
      // TODO: Implement voice call modal (Task 7)
    }
  }

  const handleVideoCall = (conversationId?: string) => {
    const targetConversation = conversationId || selectedConversationId
    if (targetConversation) {
      console.log('Starting video call for conversation:', targetConversation)
      // TODO: Implement voice call modal (Task 7)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل الرسائل...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('parentUser')
    localStorage.removeItem('parentSession')
    navigate('/parent-login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <ParentDesktopNav 
        onLogout={handleLogout}
        parentName={`${parentUser?.firstName || ''} ${parentUser?.lastName || ''}`.trim() || 'ولي الأمر'}
      />

      <div className="flex h-screen pt-16">
        {/* Conversations List */}
        <ConversationsList
          className="w-1/3"
          currentUserId={currentUserId}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onStartVoiceCall={handleVoiceCall}
          onStartVideoCall={handleVideoCall}
        />

        {/* Chat Area */}
        <div className="flex-1">
          {selectedConversationId ? (
            <MessageThread
              conversationId={selectedConversationId}
              currentUserId={currentUserId}
              onVoiceCall={() => handleVoiceCall()}
              onVideoCall={() => handleVideoCall()}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  اختر محادثة للبدء
                </h3>
                <p className="text-gray-600">
                  اختر محادثة من القائمة للبدء في التواصل مع الفريق العلاجي
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}