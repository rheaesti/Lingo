import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import io from 'socket.io-client'

let socket

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Get current user from localStorage
    const username = localStorage.getItem('username')
    if (!username) {
      router.push('/')
      return
    }
    
    setCurrentUser(username)

    // Initialize socket connection
    socket = io('http://localhost:5000')

    // Re-login with the stored username
    socket.emit('user_login', username)

    // Socket event listeners
    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('users_list_update', (usersList) => {
      // Filter out current user and remove duplicates
      const filteredUsers = usersList
        .filter(username => username !== currentUser)
        .filter((username, index, arr) => arr.indexOf(username) === index)
      
      setUsers(filteredUsers)
    })

    socket.on('user_joined', (username) => {
      // Only add if it's not the current user and not already in the list
      if (username !== currentUser && !users.includes(username)) {
        setUsers(prev => [...prev, username])
      }
    })

    socket.on('user_left', (username) => {
      setUsers(prev => prev.filter(user => user !== username))
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

  return (
    <>
      <Head>
        <title>Online Users - ChitChat</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {currentUser.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-medium text-gray-900">Welcome, {currentUser}!</h1>
                  <p className="text-sm text-gray-500 flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-medium"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Online Users</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Connect with other users in real-time. Click on any user to start a private conversation.
            </p>
          </div>

          {/* Users Grid */}
          {users.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No other users online</h3>
              <p className="text-gray-600 mb-6">
                You're the only one online right now. Invite friends to join the chat!
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-md">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Open another tab to test with multiple users
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((username, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => startChat(username)}
                >
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-lg">
                        {username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {username}
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">Online</span>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
                      Start Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connection Status */}
          <div className="mt-12 text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-md ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Connected to server' : 'Disconnected from server'}
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
