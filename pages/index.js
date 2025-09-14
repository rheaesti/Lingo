import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'
import VirtualKeyboard from '../components/VirtualKeyboard'

let socket

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  
  const usernameInputRef = useRef(null)

  const handleVirtualKeyboardInput = (input) => {
    setUsername(input)
    if (usernameInputRef.current) {
      usernameInputRef.current.value = input
      // Trigger input event to ensure React detects the change
      const event = new Event('input', { bubbles: true });
      usernameInputRef.current.dispatchEvent(event);
    }
  }

  const handleVirtualKeyboardKeyPress = (button) => {
    if (button === '{enter}') {
      handleSubmit(new Event('submit'))
    }
  }

  const toggleVirtualKeyboard = () => {
    setShowVirtualKeyboard(!showVirtualKeyboard)
  }

  useEffect(() => {
    // Check if user is already logged in
    const storedUsername = localStorage.getItem('username')
    const storedLanguage = localStorage.getItem('selectedLanguage')
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage)
    }
    if (storedUsername) {
      router.push('/users')
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setIsLoading(true)
    setError('')

    // Initialize socket connection
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000'
    socket = io(serverUrl, { timeout: 3000, reconnectionAttempts: 2 })

    // Connection error handlers
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err?.message || err)
      setError(`Cannot reach server at ${serverUrl}`)
      setIsLoading(false)
      socket.disconnect()
    })
    socket.on('connect_timeout', () => {
      setError('Server connection timed out')
      setIsLoading(false)
      socket.disconnect()
    })

    // Emit login event
    socket.on('login_success', (loggedInUsername) => {
      localStorage.setItem('username', loggedInUsername)
      localStorage.setItem('selectedLanguage', selectedLanguage)
      // Proactively close this socket to avoid duplicate sessions
      try { socket.disconnect() } catch {}
      router.push('/users')
    })

    socket.on('login_error', (errorMessage) => {
      setError(errorMessage)
      setIsLoading(false)
      if (socket) {
        socket.disconnect()
      }
    })

    socket.emit('user_login', {
      username: username.trim(),
      preferredLanguage: selectedLanguage
    })
  }


  return (
    <>
      <Head>
        <title>Login - Lingo</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lingo</h1>
            <p className="text-gray-600">Connect with friends in real-time</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a username
                </label>
                <div className="relative">
                  <input
                    ref={usernameInputRef}
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={toggleVirtualKeyboard}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={`${showVirtualKeyboard ? 'Hide' : 'Show'} Virtual Keyboard`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Select your preferred language
                </label>
                <select
                  id="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={isLoading}
                >
                  <option value="Assamese">Assamese</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Bodo">Bodo</option>
                  <option value="Dogri">Dogri</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Kashmiri">Kashmiri</option>
                  <option value="Konkani">Konkani</option>
                  <option value="Maithili">Maithili</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Manipuri">Manipuri</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Nepali">Nepali</option>
                  <option value="Odia">Odia</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Sanskrit">Sanskrit</option>
                  <option value="Santali">Santali</option>
                  <option value="Sindhi">Sindhi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Urdu">Urdu</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </div>
                ) : (
                  'Start Chatting'
                )}
              </button>
            </form>

            {/* Features */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Real-time messaging
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Multi-language support (22 Indian languages)
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No password required
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Instant notifications
                </div>
              </div>
            </div>
        </div>

        {/* Virtual Keyboard */}
        <VirtualKeyboard
          language={selectedLanguage}
          onInputChange={handleVirtualKeyboardInput}
          onKeyPress={handleVirtualKeyboardKeyPress}
          inputRef={usernameInputRef}
          isVisible={showVirtualKeyboard}
          onToggle={toggleVirtualKeyboard}
        />

        {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Open multiple tabs to test with different users
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
