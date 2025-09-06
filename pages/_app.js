import '../styles/globals.css'
import '../styles/virtual-keyboard.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in (has username in localStorage)
    const username = localStorage.getItem('username')
    
    // If not on login page and no username, redirect to login
    if (!username && router.pathname !== '/') {
      router.push('/')
    }
    
    // If on login page and has username, redirect to users page
    if (username && router.pathname === '/') {
      router.push('/users')
    }
  }, [router.pathname])

  return <Component {...pageProps} />
}
