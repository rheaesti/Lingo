import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'
import { useTheme } from '../contexts/ThemeContext'

let socket

export default function SettingsPage() {
  const router = useRouter()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [currentUser, setCurrentUser] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    // Force light mode immediately and continuously
    const forceLightMode = () => {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
    
    forceLightMode()
    
    // Force light mode multiple times
    setTimeout(forceLightMode, 100)
    setTimeout(forceLightMode, 500)
    setTimeout(forceLightMode, 1000)
    
    // Get current user from localStorage
    const username = localStorage.getItem('username')
    const language = localStorage.getItem('selectedLanguage')
    
    if (username) {
      setCurrentUser(username)
    } else {
      router.push('/')
      return
    }
    
    if (language) {
      setSelectedLanguage(language)
    }

    // Initialize socket connection
    socket = io('http://localhost:3001')
    
    socket.on('connect', () => {
      setIsConnected(true)
      // Emit user_login to register with server
      socket.emit('user_login', { username, preferredLanguage: language || 'English' })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('user_login', (data) => {
      console.log('User login response:', data)
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [router])

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language)
    localStorage.setItem('selectedLanguage', language)
    
    // Emit user_login to update server with new language
    if (socket && currentUser) {
      socket.emit('user_login', { username: currentUser, preferredLanguage: language })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('selectedLanguage')
    if (socket) {
      socket.disconnect()
    }
    router.push('/')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleNotificationToggle = () => {
    setNotifications(!notifications)
  }

  const handleDarkModeToggle = () => {
    toggleDarkMode()
  }

  // Force light mode on every render
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', 'false')
  })

  const languages = [
    'English', 'Hindi', 'Malayalam', 'Tamil', 'Bengali', 
    'Gujarati', 'Telugu', 'Kannada', 'Punjabi', 'Marathi', 'Odia'
  ]

  return (
    <>
      <Head>
        <title>Settings - Lingo</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force light mode immediately on settings page
              (function() {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('darkMode', 'false');
                
                // Force light mode multiple times
                setTimeout(() => {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('darkMode', 'false');
                }, 50);
                
                setTimeout(() => {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('darkMode', 'false');
                }, 200);
              })();
            `,
          }}
        />
        <style jsx global>{`
          /* Force light mode styles for settings page */
          html, body {
            background-color: #f3f4f6 !important;
            color-scheme: light !important;
          }
          
          html.dark, html.dark body {
            background-color: #f3f4f6 !important;
            color-scheme: light !important;
          }
          
          /* Override any dark mode classes */
          .dark\\:bg-gray-900 {
            background-color: #f3f4f6 !important;
          }
          
          .dark\\:bg-gray-800 {
            background-color: #ffffff !important;
          }
          
          .dark\\:text-white {
            color: #1f2937 !important;
          }
          
          .dark\\:text-gray-300 {
            color: #6b7280 !important;
          }
          
          .dark\\:border-gray-700 {
            border-color: #e5e7eb !important;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={toggleSidebar}
          ></div>
        )}

        {/* WhatsApp-style Sidebar */}
        <div className={`fixed left-0 top-0 h-full w-16 bg-gray-800 dark:bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="flex flex-col items-center py-4 space-y-4">
            {/* L Logo */}
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>

            {/* Navigation Icons */}
            <button
              onClick={() => {
                router.push('/users')
                setIsSidebarOpen(false)
              }}
              className="w-12 h-12 bg-gray-700 dark:bg-gray-800 hover:bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 group"
              title="Chats"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>


            <button
              onClick={() => {
                router.push('/camera')
                setIsSidebarOpen(false)
              }}
              className="w-12 h-12 bg-gray-700 dark:bg-gray-800 hover:bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 group"
              title="Camera"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                router.push('/settings')
                setIsSidebarOpen(false)
              }}
              className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 group"
              title="Settings"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center transition-all duration-200 group mt-auto"
              title="Logout"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-0 md:ml-16 min-h-screen">
          {/* Header */}
          <header className="bg-green-500 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 text-white hover:bg-green-600 rounded-lg transition-all duration-200 flex-shrink-0"
                    title="Menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-green-500 font-bold text-lg sm:text-xl">
                        L
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Settings</h1>
                      <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Manage your preferences</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-green-100 text-sm">Welcome, {currentUser}!</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-100 text-sm">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="space-y-6 sm:space-y-8">
            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Profile</h2>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white font-bold text-2xl sm:text-3xl">
                      {currentUser.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">{currentUser}</h3>
                    <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Chat User</p>
                  </div>
                </div>
              </div>

              {/* Language Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Language Settings</h2>
                <div className="space-y-3 sm:space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preferred Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  >
                    {languages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    This will be used for message translation and virtual keyboard layout.
                  </p>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Notifications</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">Push Notifications</h3>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">Receive notifications for new messages</p>
                    </div>
                    <button
                      onClick={handleNotificationToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Appearance Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Appearance</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">Dark Mode</h3>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">Switch to dark theme</p>
                    </div>
                    <button
                      onClick={handleDarkModeToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        isDarkMode 
                          ? 'bg-green-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isDarkMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>


              {/* Account Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Account</h2>
                <div className="space-y-3 sm:space-y-4">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
