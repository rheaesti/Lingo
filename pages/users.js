import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'
import { useTranslation } from '../hooks/useTranslation'

let socket

export default function UsersPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [currentUser, setCurrentUser] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  
  // Initialize translation hook
  const { t, currentLanguage, changeLanguage } = useTranslation(selectedLanguage)

  useEffect(() => {
    // Get current user from localStorage
    const username = localStorage.getItem('username')
    const storedLanguage = localStorage.getItem('selectedLanguage')
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage)
      changeLanguage(storedLanguage)
    }
    if (!username) {
      router.push('/')
      return
    }

    setCurrentUser(username)

    // Initialize socket connection
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000'
    socket = io(serverUrl)

    // Re-login with the stored username and language
    const language = localStorage.getItem('selectedLanguage') || 'English'
    socket.emit('user_login', { 
      username: username, 
      preferredLanguage: language 
    })

    // Socket event listeners
    socket.on('connect', () => {
      setIsConnected(true)
      // Re-authenticate user and fetch previous contacts when connected
      const username = localStorage.getItem('username')
      if (username) {
        // Use user_login for now to maintain compatibility
        socket.emit('user_login', { username, preferredLanguage: selectedLanguage || 'English' })
      }
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('login_success', () => {
      // Fetch previous contacts after successful login
      console.log('🔍 Login successful, requesting previous contacts...')
      setIsLoadingContacts(true)
      socket.emit('get_previous_contacts')
    })

    socket.on('previous_contacts', (contactsList) => {
      console.log('📨 Previous contacts received:', contactsList)
      console.log('📊 Number of contacts:', contactsList?.length || 0)
      setContacts(contactsList)
      setIsLoadingContacts(false)
      
      // Don't automatically switch to online users - let user choose
      // The placeholder cards will be shown when contacts.length === 0
    })

    socket.on('contacts_error', (error) => {
      console.error('Error fetching contacts:', error)
      setIsLoadingContacts(false)
      // Don't automatically switch to online users on error
      // Let the user manually choose between tabs
    })

    // Handle online users list
    socket.on('users_list_update', (usersList) => {
      console.log('Users list updated:', usersList)
      const filteredUsers = usersList
        .filter(username => username !== currentUser)
        .filter((username, index, arr) => arr.indexOf(username) === index)
      setOnlineUsers(filteredUsers)
    })

    socket.on('user_joined', (username) => {
      // Refresh contacts when a user joins
      if (isConnected) {
        socket.emit('get_previous_contacts')
      }
    })

    socket.on('user_left', (username) => {
      // Refresh contacts when a user leaves
      if (isConnected) {
        socket.emit('get_previous_contacts')
      }
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [router, currentUser])

  const startChat = (username) => {
    router.push(`/chat/${username}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('username')
    if (socket) {
      socket.disconnect()
    }
    router.push('/')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <>
      <Head>
        <title>{showOnlineUsers ? t('online_users') : t('previous_contacts')} - Lingo</title>
      </Head>

      <div className="min-h-screen bg-gray-100">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={toggleSidebar}
          ></div>
        )}

        {/* WhatsApp-style Sidebar */}
        <div className={`fixed left-0 top-0 h-full w-16 bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="flex flex-col items-center py-4 space-y-4">
            {/* L Logo */}
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            
            {/* Navigation Icons */}
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => {
                  router.push('/users')
                  setIsSidebarOpen(false)
                }}
                className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-md hover:bg-green-700 transition-all duration-200 hover:scale-105"
                title="Chats"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              
              <button 
                onClick={() => {
                  router.push('/camera')
                  setIsSidebarOpen(false)
                }}
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                title="Camera"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            
            {/* Settings and Logout Icons at Bottom */}
            <div className="mt-auto space-y-3">
              <button 
                onClick={() => {
                  router.push('/settings')
                  setIsSidebarOpen(false)
                }}
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                title={t('settings')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white hover:bg-red-700 transition-all duration-200 hover:scale-105"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar Offset */}
        <div className="ml-0 md:ml-16">
          {/* WhatsApp-style Header */}
          <header className="bg-green-500 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                  {/* Mobile Hamburger Menu */}
                  <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 text-white hover:bg-green-600 rounded-lg transition-all duration-200 flex-shrink-0"
                    title="Menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-green-500 font-bold text-lg sm:text-xl">
                        L
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                      {t('welcome')}, {currentUser}!
                    </h1>
                    <p className="text-green-100 text-xs sm:text-sm">
                      {showOnlineUsers ? t('online_users') : t('previous_contacts')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="group flex items-center space-x-1 sm:space-x-2 p-2 sm:px-4 sm:py-2 text-white hover:bg-green-600 rounded-lg transition-all duration-200 font-medium flex-shrink-0"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
                {showOnlineUsers ? t('online_users') : t('previous_contacts')}
              </h2>
              <p className="text-gray-700 dark:text-gray-200 max-w-2xl mx-auto text-sm sm:text-lg px-4 mb-6">
                {showOnlineUsers ? `${t('connect_with_users')}. ${t('click_user_to_chat')}.` : `${t('your_conversation_history')}. ${t('click_contact_to_continue')}.`}
              </p>
              
              {/* Toggle Button */}
              <div className="flex justify-center">
                <div className="bg-gray-200 rounded-lg p-1 flex">
                  <button
                    onClick={() => setShowOnlineUsers(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      !showOnlineUsers 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t('previous_contacts')}
                  </button>
                  <button
                    onClick={() => setShowOnlineUsers(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      showOnlineUsers 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t('online_users')}
                  </button>
                </div>
              </div>
            </div>

            {/* Contacts/Users Grid */}
            {isLoadingContacts ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('loading')}...</p>
              </div>
            ) : (showOnlineUsers ? onlineUsers.length === 0 : contacts.length === 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* Placeholder grey cards */}
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 shadow-lg opacity-40"
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                    <div className="mt-4 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {showOnlineUsers ? onlineUsers.map((username, index) => (
                  <div
                    key={index}
                    className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 active:scale-95"
                    onClick={() => startChat(username)}
                  >
                    <div className="p-4 sm:p-6 text-center">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                          <span className="text-white font-bold text-xl sm:text-2xl">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors truncate">
                        {username}
                      </h3>
                      <div className="flex items-center justify-center space-x-2 mb-4 sm:mb-6">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm text-green-600 font-semibold">{t('online')}</span>
                      </div>
                      <button className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg group-hover:shadow-xl group-hover:scale-105 text-sm sm:text-base">
                        {t('start_chat')}
                      </button>
                    </div>
                  </div>
                )) : contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 active:scale-95"
                    onClick={() => startChat(contact.username)}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center mb-4">
                        <div className="relative">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors shadow-lg">
                            <span className="text-white font-bold text-lg sm:text-xl">
                              {contact.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {contact.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors truncate">
                            {contact.username}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${contact.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <span className="text-xs sm:text-sm text-gray-600 font-medium">
                              {contact.isOnline ? t('online') : t('offline')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {contact.lastMessage && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {contact.isLastMessageFromMe ? 'You: ' : ''}{contact.lastMessage}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(contact.lastMessageTime).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      
                      <button className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg group-hover:shadow-xl group-hover:scale-105 text-sm sm:text-base">
                        {t('start_chat')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  )
}
