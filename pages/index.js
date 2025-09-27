import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'
import VirtualKeyboard from '../components/VirtualKeyboard'
import { useTranslation } from '../hooks/useTranslation'

let socket

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  const [keyboardTarget, setKeyboardTarget] = useState('username') // 'username' or 'password'
  
  // Initialize translation hook
  const { t, currentLanguage, changeLanguage } = useTranslation(selectedLanguage)
  
  const usernameInputRef = useRef(null)
  const passwordInputRef = useRef(null)

  const handleVirtualKeyboardInput = (input) => {
    if (keyboardTarget === 'username') {
      setUsername(input)
      if (usernameInputRef.current) {
        usernameInputRef.current.value = input
        // Trigger input event to ensure React detects the change
        const event = new Event('input', { bubbles: true });
        usernameInputRef.current.dispatchEvent(event);
      }
    } else if (keyboardTarget === 'password') {
      setPassword(input)
      if (passwordInputRef.current) {
        passwordInputRef.current.value = input
        // Trigger input event to ensure React detects the change
        const event = new Event('input', { bubbles: true });
        passwordInputRef.current.dispatchEvent(event);
      }
    }
  }

  const handleVirtualKeyboardKeyPress = (button) => {
    if (button === '{enter}') {
      handleSubmit(new Event('submit'))
    }
  }

  const toggleVirtualKeyboard = (target = 'username') => {
    setKeyboardTarget(target)
    setShowVirtualKeyboard(!showVirtualKeyboard)
  }

  useEffect(() => {
    // Check if user is already logged in
    const storedUsername = localStorage.getItem('username')
    const storedLanguage = localStorage.getItem('selectedLanguage')
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage)
      changeLanguage(storedLanguage)
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

    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
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

    // Emit signup event
    socket.on('signup_success', (loggedInUsername) => {
      localStorage.setItem('username', loggedInUsername)
      localStorage.setItem('selectedLanguage', selectedLanguage)
      // Proactively close this socket to avoid duplicate sessions
      try { socket.disconnect() } catch {}
      router.push('/users')
    })

    socket.on('signup_error', (errorMessage) => {
      setError(errorMessage)
      setIsLoading(false)
      if (socket) {
        socket.disconnect()
      }
    })

    socket.emit('user_signup', {
      username: username.trim(),
      password: password.trim(),
      preferredLanguage: selectedLanguage
    })
  }


  return (
    <>
      <Head>
        <title>{t('create_account')} - Lingo</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-green-500 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-green-500 font-bold text-xl">L</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Lingo
                  </h1>
                  <p className="text-green-100 text-xs sm:text-sm">
                    {t('create_your_account')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-md mx-auto px-4 sm:px-6 py-8">

          {/* Signup Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('choose_username')}
                </label>
                <div className="relative">
                  <input
                    ref={usernameInputRef}
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('enter_username')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVirtualKeyboard('username')}
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('create_password')}
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('enter_password')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVirtualKeyboard('password')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showVirtualKeyboard ? t('hide_virtual_keyboard') : t('show_virtual_keyboard')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirm_password')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirm_your_password')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('select_language')}
                </label>
                <select
                  id="language"
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value)
                    changeLanguage(e.target.value)
                  }}
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
                disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
                className="w-full px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('creating_account')}
                  </div>
                ) : (
                  t('create_account')
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('already_have_account')}{' '}
                <button
                  onClick={() => router.push('/signin')}
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  {t('sign_in_here')}
                </button>
              </p>
            </div>

            {/* Features */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('real_time_messaging')}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('multi_language_support')}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('secure_password_protection')}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('instant_notifications')}
                </div>
              </div>
            </div>
        </div>

        {/* Virtual Keyboard */}
        <VirtualKeyboard
          language={currentLanguage}
          onInputChange={handleVirtualKeyboardInput}
          onKeyPress={handleVirtualKeyboardKeyPress}
          inputRef={keyboardTarget === 'username' ? usernameInputRef : passwordInputRef}
          isVisible={showVirtualKeyboard}
          onToggle={toggleVirtualKeyboard}
        />

        </main>

      </div>
    </>
  )
}
