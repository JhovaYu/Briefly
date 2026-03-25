'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('briefly_token')
    if (token) {
      router.push('/notas')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="loading-center" style={{ height: '100vh' }}>
      <div className="spinner" />
    </div>
  )
}
