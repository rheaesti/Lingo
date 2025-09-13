import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'
import VirtualKeyboard from '../../components/VirtualKeyboard'

let socket

export default function ChatPage() {
  const router = useRouter()
  const { id: chatPartner } = router.query
  
  const [currentUser, setCurrentUser] = useState('')
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [isConnected, setIsConnected] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messageInputRef = useRef(null)

  const handleVirtualKeyboardInput = (input) => {
    setNewMessage(input)
    if (messageInputRef.current) {
      messageInputRef.current.value = input
      // Trigger typing indicator
      if (!isTyping) {
        setIsTyping(true)
        socket.emit('typing_start', { to: chatPartner, from: currentUser })
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        socket.emit('typing_stop', { to: chatPartner, from: currentUser })
      }, 1000)
    }
  }

  const handleVirtualKeyboardKeyPress = (button) => {
    if (button === '{enter}') {
      handleSendMessage()
    }
  }

  const toggleVirtualKeyboard = () => {
    setShowVirtualKeyboard(!showVirtualKeyboard)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // DB-backed history is fetched from the server via Socket.IO

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Get current user from localStorage
    const username = localStorage.getItem('username')
    const language = localStorage.getItem('selectedLanguage')
    if (!username) {
      router.push('/')
      return
    }
    
    if (!chatPartner) return
    
    setCurrentUser(username)
    if (language) {
      setSelectedLanguage(language)
    }

    // Fetch chat history from server (DB)
    // Server emits 'chat_history' with normalized records
    socket = io('http://localhost:5000')

    // Re-login with the stored username and language (this will handle duplicate connections)
    socket.emit('user_login', { 
      username: username, 
      preferredLanguage: language 
    })
    // Request history once logged in
    socket.emit('fetch_history', { with: chatPartner, for: username })

    // Socket event listeners
    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('private_message', (data) => {
      if (data.from === chatPartner) {
        const messageData = {
          ...data,
          type: 'received',
          message: data.message,  // Use translated text
          originalMessage: data.originalMessage,  // Keep original for reference
          isTranslated: data.isTranslated,
          originalLanguage: data.originalLanguage,
          translatedLanguage: data.translatedLanguage
        }
        
        console.log('📥 Received message with translation data:', {
          from: data.from,
          translatedText: data.message,
          originalText: data.originalMessage,
          isTranslated: data.isTranslated,
          originalLanguage: data.originalLanguage,
          translatedLanguage: data.translatedLanguage
        });
        console.log('📥 Final messageData object:', messageData);
        setMessages(prev => [...prev, messageData])
        
        // If this is an offline message, show a notification
        if (data.type === 'offline') {
          console.log(`Received offline message from ${chatPartner}: ${data.message}`);
          // Show a special indicator for offline messages
          alert(`📬 Offline message received from ${chatPartner}: ${data.message}`)
        }
      }
    })

    socket.on('message_sent', (data) => {
      if (data.to === chatPartner) {
        const messageData = {
          from: currentUser,
          message: data.message,  // Use original text for sender
          originalMessage: data.message,  // Keep original for reference
          timestamp: data.timestamp,
          type: 'sent',
          isTranslated: data.isTranslated || false
        }
        
        console.log('📤 Sent message data:', {
          to: data.to,
          originalText: data.message,
          isTranslated: data.isTranslated
        });
        setMessages(prev => [...prev, messageData])
      }
    })

    // Receive DB chat history
    socket.on('chat_history', (payload) => {
      if (payload.with === chatPartner && Array.isArray(payload.messages)) {
        console.log('Received chat history with translation data:', payload.messages);
        setMessages(payload.messages)
      }
    })

    // Handle message errors (like self-messaging)
    socket.on('message_error', (errorMessage) => {
      console.error('Message error:', errorMessage)
      // Show error to user
      alert(`Message error: ${errorMessage}`)
    })

    socket.on('typing_start', (data) => {
      if (data.from === chatPartner) {
        setTypingUsers(prev => new Set(prev).add(data.from))
      }
    })

    socket.on('typing_stop', (data) => {
      if (data.from === chatPartner) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.from)
          return newSet
        })
      }
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [chatPartner, router, currentUser])

  const handleSendMessage = (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !isConnected) return

    // Prevent self-messaging
    if (currentUser === chatPartner) {
      alert('Cannot send message to yourself. Please chat with a different user.')
      return
    }

    const messageData = {
      to: chatPartner,
      from: currentUser,
      message: newMessage.trim()
    }

    // Emit message to server
    socket.emit('private_message', messageData)
    
    // Clear input
    setNewMessage('')
    
    // Stop typing indicator
    socket.emit('typing_stop', { to: chatPartner, from: currentUser })
    setIsTyping(false)
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    
    if (!isTyping) {
      setIsTyping(true)
      socket.emit('typing_start', { to: chatPartner, from: currentUser })
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socket.emit('typing_stop', { to: chatPartner, from: currentUser })
    }, 1000)
  }

  const goBack = () => {
    router.push('/users')
  }

  const clearChatHistory = () => {
    // Local UI clear only (does not delete DB records)
    setMessages([])
    setChatHistory([])
  }

  
  const clearInput = () => {
    setNewMessage('')
    if (messageInputRef.current) {
      messageInputRef.current.value = ''
    }
    // Force stop any ongoing input
    if (messageInputRef.current) {
      messageInputRef.current.blur()
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus()
        }
      }, 100)
    }
  }
  
  const emergencyStop = () => {
    setNewMessage('')
    setShowVirtualKeyboard(false)
    if (messageInputRef.current) {
      messageInputRef.current.value = ''
      messageInputRef.current.blur()
    }
    // Clear any pending timeouts
    if (handleVirtualKeyboardInput.timeout) {
      clearTimeout(handleVirtualKeyboardInput.timeout);
    }
  }
  

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }


  if (!chatPartner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Chat with {chatPartner} - Lingo</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                <button
                  onClick={goBack}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
                  title="Go back to users"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-xs sm:text-sm">
                        L
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">{chatPartner}</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Chat
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Chatting with {chatPartner}</p>
                </div>
                
                {messages.length > 0 && (
                  <>
                    <button
                      onClick={clearChatHistory}
                      className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-xs sm:text-sm font-medium"
                      title="Clear chat history"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                    
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                      {messages.length} msg{messages.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {currentUser === chatPartner ? 'Cannot chat with yourself' : 'Start a conversation'}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6 max-w-md mx-auto px-4">
                  {currentUser === chatPartner 
                    ? 'Please go back and select a different user to chat with.'
                    : 'Send your first message to begin chatting with ' + chatPartner
                  }
                </p>
                {currentUser === chatPartner && (
                  <button
                    onClick={() => router.push('/users')}
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base active:scale-95"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Go Back to Users
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  console.log(`Rendering message ${index}:`, {
                    message: message.message,
                    originalMessage: message.originalMessage,
                    isTranslated: message.isTranslated,
                    originalLanguage: message.originalLanguage,
                    translatedLanguage: message.translatedLanguage,
                    type: message.type
                  });
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                        message.type === 'sent' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        <p className="text-sm leading-relaxed">
                          {message.message}
                        </p>
                      <p className={`text-xs mt-2 ${
                        message.type === 'sent' 
                          ? 'text-blue-100' 
                          : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                  );
                })}
                
                {/* Typing indicator */}
                {typingUsers.has(chatPartner) && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-700 ml-2">
                          {chatPartner} is typing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" style={{ position: 'relative', zIndex: 20 }}>
          <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-2 sm:space-x-3">
              <div className="flex-1 relative">
                <div className="relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder={currentUser === chatPartner ? "Cannot message yourself" : "Type your message..."}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                    disabled={!isConnected || currentUser === chatPartner}
                    style={{ zIndex: 10, position: 'relative' }}
                  />
                  {newMessage && (
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <button
                        type="button"
                        onClick={clearInput}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                        title="Clear input"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={emergencyStop}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Emergency stop"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {currentUser === chatPartner && (
                  <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Cannot message yourself</span>
                  </div>
                )}
              </div>
              
              {/* Virtual Keyboard Toggle Button */}
              <button
                type="button"
                onClick={toggleVirtualKeyboard}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  showVirtualKeyboard 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-500'
                }`}
                title={`${showVirtualKeyboard ? 'Hide' : 'Show'} Virtual Keyboard`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected || currentUser === chatPartner}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Virtual Keyboard */}
        <VirtualKeyboard
          language={selectedLanguage}
          onInputChange={handleVirtualKeyboardInput}
          onKeyPress={handleVirtualKeyboardKeyPress}
          inputRef={messageInputRef}
          isVisible={showVirtualKeyboard}
          onToggle={toggleVirtualKeyboard}
        />

        {/* Floating Virtual Keyboard Toggle Button */}
        {!showVirtualKeyboard && (
          <button
            onClick={toggleVirtualKeyboard}
            className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors z-40"
            title="Show Virtual Keyboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
