import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'

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
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

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
    if (!username) {
      router.push('/')
      return
    }
    
    if (!chatPartner) return
    
    setCurrentUser(username)

    // Fetch chat history from server (DB)
    // Server emits 'chat_history' with normalized records
    socket = io('http://localhost:5000')

    // Re-login with the stored username (this will handle duplicate connections)
    socket.emit('user_login', username)
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
          type: 'received'
        }
        
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
          message: data.message,
          timestamp: data.timestamp,
          type: 'sent'
        }
        
        setMessages(prev => [...prev, messageData])
      }
    })

    // Receive DB chat history
    socket.on('chat_history', (payload) => {
      if (payload.with === chatPartner && Array.isArray(payload.messages)) {
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
          <p className="text-gray-600">Loading chat...</p>
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
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBack}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Go back to users"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {chatPartner.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <div>
                    <h1 className="text-lg font-medium text-gray-900">{chatPartner}</h1>
                    <p className="text-sm text-gray-500 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {isConnected ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {messages.length > 0 && (
                  <button
                    onClick={clearChatHistory}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
                    title="Clear chat history"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>
                )}
                
                <div className="text-right">
                  <p className="text-sm text-gray-500">Chatting with {chatPartner}</p>
                  {messages.length > 0 && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mt-1">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentUser === chatPartner ? 'Cannot chat with yourself' : 'Start a conversation'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {currentUser === chatPartner 
                    ? 'Please go back and select a different user to chat with.'
                    : 'Send your first message to begin chatting with ' + chatPartner
                  }
                </p>
                {currentUser === chatPartner && (
                  <button
                    onClick={() => router.push('/users')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
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
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                      message.type === 'sent' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}>
                      <p className="text-sm leading-relaxed">
                        {message.message}
                      </p>
                      {message.isTranslated && message.type === 'received' && (
                        <p className={`text-xs mt-1 italic ${
                          message.type === 'sent' 
                            ? 'text-blue-200' 
                            : 'text-gray-400'
                        }`}>
                          🔄 Auto-translated from {message.originalLanguage} to {message.translatedLanguage}
                        </p>
                      )}
                      <p className={`text-xs mt-2 ${
                        message.type === 'sent' 
                          ? 'text-blue-100' 
                          : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
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
                        <span className="text-sm text-gray-600 ml-2">
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
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder={currentUser === chatPartner ? "Cannot message yourself" : "Type your message..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={!isConnected || currentUser === chatPartner}
                />
                {currentUser === chatPartner && (
                  <div className="absolute inset-0 bg-gray-50 rounded-md flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Cannot message yourself</span>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected || currentUser === chatPartner}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
