'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface FloatingWindow {
  id: string
  type: 'bill-detail'
  title: string
  billId?: string
  isOpen: boolean
}

interface FloatingWindowContextType {
  windows: FloatingWindow[]
  openBillDetail: (billId: string, billTitle: string) => void
  closeWindow: (id: string) => void
  closeAllWindows: () => void
}

const FloatingWindowContext = createContext<FloatingWindowContextType | undefined>(undefined)

export function FloatingWindowProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<FloatingWindow[]>([])

  const openBillDetail = useCallback((billId: string, billTitle: string) => {
    setWindows(prev => {
      // 이미 열려있는 창이면 무시
      const existingWindow = prev.find(w => w.type === 'bill-detail' && w.billId === billId)
      if (existingWindow) {
        return prev
      }
      
      const newWindow: FloatingWindow = {
        id: `bill-detail-${billId}`,
        type: 'bill-detail',
        title: billTitle || `의안 ${billId}`,
        billId,
        isOpen: true
      }
      
      return [...prev, newWindow]
    })
  }, [])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const closeAllWindows = useCallback(() => {
    setWindows([])
  }, [])

  return (
    <FloatingWindowContext.Provider value={{
      windows,
      openBillDetail,
      closeWindow,
      closeAllWindows
    }}>
      {children}
    </FloatingWindowContext.Provider>
  )
}

export function useFloatingWindow() {
  const context = useContext(FloatingWindowContext)
  if (context === undefined) {
    throw new Error('useFloatingWindow must be used within a FloatingWindowProvider')
  }
  return context
} 