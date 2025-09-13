import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useTheme } from '../contexts/ThemeContext'
import io from 'socket.io-client'

let socket

export default function CameraPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [currentUser, setCurrentUser] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [stream, setStream] = useState(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Force light mode immediately
    document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', 'false')
    
    // Get current user from localStorage
    const username = localStorage.getItem('username')
    if (username) {
      setCurrentUser(username)
    } else {
      router.push('/')
      return
    }

    // Initialize socket connection
    socket = io('http://localhost:3001')
    
    socket.on('connect', () => {
      setIsConnected(true)
      // Emit user_login to register with server
      socket.emit('user_login', { username, language: 'English' })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('user_login', (data) => {
      console.log('User login response:', data)
    })

    socket.on('users_online', (onlineUsers) => {
      // Filter out current user from the list
      const otherUsers = onlineUsers.filter(user => user !== username)
      setUsers(otherUsers)
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [router])

  const startCamera = async () => {
    try {
      setError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCameraOn(true)
    } catch (err) {
      setError('Unable to access camera. Please check permissions.')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraOn(false)
    setCapturedImage(null)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = canvas.toDataURL('image/png')
      setCapturedImage(imageData)
    }
  }

  const downloadImage = () => {
    if (capturedImage) {
      const link = document.createElement('a')
      link.download = `photo-${Date.now()}.png`
      link.href = capturedImage
      link.click()
    }
  }

  const handleUserSelect = (username) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) {
        return prev.filter(user => user !== username)
      } else {
        return [...prev, username]
      }
    })
  }

  const shareImage = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to share with')
      return
    }

    if (socket && capturedImage) {
      // Send image to selected users
      selectedUsers.forEach(username => {
        socket.emit('send_message', {
          to: username,
          message: `📸 Photo shared by ${currentUser}`,
          image: capturedImage,
          timestamp: new Date().toISOString()
        })
      })

      alert(`Photo shared with ${selectedUsers.join(', ')}`)
      setShowShareModal(false)
      setSelectedUsers([])
    }
  }

  const openShareModal = () => {
    setShowShareModal(true)
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setSelectedUsers([])
  }

  const handleLogout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('selectedLanguage')
    router.push('/')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <>
      <Head>
        <title>Camera - Lingo</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force light mode immediately on camera page
              (function() {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('darkMode', 'false');
                
                setTimeout(() => {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('darkMode', 'false');
                }, 100);
              })();
            `,
          }}
        />
        <style jsx global>{`
          /* Force light mode styles for camera page */
          html, body {
            background-color: #f3f4f6 !important;
            color-scheme: light !important;
          }
          
          html.dark, html.dark body {
            background-color: #f3f4f6 !important;
            color-scheme: light !important;
          }
          
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
              className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 group"
              title="Camera"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                router.push('/settings')
                setIsSidebarOpen(false)
              }}
              className="w-12 h-12 bg-gray-700 dark:bg-gray-800 hover:bg-green-600 rounded-xl flex items-center justify-center transition-all duration-200 group"
              title="Settings"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Camera</h1>
                      <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Take photos and capture moments</p>
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
              {/* Camera Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Camera</h2>
                
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4 sm:space-y-6">
                  {/* Camera Controls */}
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {!isCameraOn ? (
                      <button
                        onClick={startCamera}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm sm:text-base active:scale-95"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Start Camera</span>
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-3 sm:gap-4 w-full">
                        <button
                          onClick={capturePhoto}
                          className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg sm:rounded-xl hover:bg-blue-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm sm:text-base active:scale-95"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Capture</span>
                        </button>
                        
                        <button
                          onClick={stopCamera}
                          className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm sm:text-base active:scale-95"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Stop</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Video Preview */}
                  {isCameraOn && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg aspect-video object-cover"
                      />
                      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black bg-opacity-50 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">
                        Live
                      </div>
                    </div>
                  )}

                  {/* Captured Image */}
                  {capturedImage && (
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">Captured Photo</h3>
                      <div className="relative">
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full max-w-2xl mx-auto rounded-lg shadow-lg max-h-64 sm:max-h-80 object-cover"
                        />
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">
                          Captured
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
                        <button
                          onClick={downloadImage}
                          className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm sm:text-base active:scale-95"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download</span>
                        </button>
                        
                        <button
                          onClick={openShareModal}
                          className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg sm:rounded-xl hover:bg-blue-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm sm:text-base active:scale-95"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          <span>Share</span>
                        </button>
                        
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-500 text-white rounded-lg sm:rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm sm:text-base active:scale-95"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden Canvas for Capturing */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
              </div>

            </div>
          </main>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Share Photo</h3>
                  <button
                    onClick={closeShareModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white p-1"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-3 sm:mb-4">
                  <p className="text-gray-700 dark:text-gray-200 mb-2 sm:mb-3 text-sm sm:text-base">Select users to share with:</p>
                  
                  {users.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No other users online</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                      {users.map((username, index) => (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors active:scale-95 ${
                            selectedUsers.includes(username)
                              ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleUserSelect(username)}
                        >
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs sm:text-sm">
                              {username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-white text-sm sm:text-base truncate">{username}</p>
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">Online</span>
                            </div>
                          </div>
                          {selectedUsers.includes(username) && (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 sm:space-x-3">
                  <button
                    onClick={closeShareModal}
                    className="flex-1 px-3 sm:px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm sm:text-base active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={shareImage}
                    disabled={selectedUsers.length === 0}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base active:scale-95 ${
                      selectedUsers.length === 0
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Share ({selectedUsers.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
