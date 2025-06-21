'use client'

import { FloatingWindow } from '@/components/ui/floating-window'
import BillDetailFloating from '@/components/bill-detail-page/bill-detail-floating'
import { useFloatingWindow } from '@/hooks/use-floating-window'

export function FloatingWindowManager() {
  const { windows, closeWindow } = useFloatingWindow()

  // 창들이 겹치지 않도록 스마트하게 위치 계산
  const getWindowPosition = (index: number) => {
    if (typeof window === 'undefined') return { x: undefined, y: undefined }
    
    // 첫 번째 창은 중앙에 배치 (defaultX, defaultY가 undefined면 자동 중앙 배치)
    if (index === 0) {
      return { x: undefined, y: undefined }
    }
    
    // 이후 창들은 cascading 배치
    const offset = 30 + (index * 25) // 점진적으로 줄어드는 오프셋
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    // 모바일에서는 하단 네비게이션을 고려
    const isMobile = screenWidth < 768
    const reservedHeight = isMobile ? 66 : 20
    const availableHeight = screenHeight - reservedHeight
    
    // 예상 창 크기 (floating-window에서 계산하는 것과 동일)
    const expectedWidth = Math.min(screenWidth - 20, 900)
    const expectedHeight = Math.min(availableHeight, 800)
    
    // 기본 중앙 위치에서 오프셋
    const centerX = (screenWidth - expectedWidth) / 2
    const centerY = Math.max(50, Math.min(
      (availableHeight - expectedHeight) / 2 + 50,
      availableHeight - expectedHeight - 20
    ))
    
    // 화면 경계를 벗어나지 않도록 제한
    const maxX = screenWidth - expectedWidth - 5
    const maxY = availableHeight - expectedHeight - 5
    
    return {
      x: Math.max(10, Math.min(centerX + offset, maxX)),
      y: Math.max(10, Math.min(centerY + offset, maxY))
    }
  }

  return (
    <>
      {windows.map((window, index) => {
        const { x, y } = getWindowPosition(index)
        
        return (
          <FloatingWindow
            key={window.id}
            title={window.title}
            isOpen={window.isOpen}
            onClose={() => closeWindow(window.id)}
            defaultX={x}
            defaultY={y}
            className="z-[100]"
          >
            {window.type === 'bill-detail' && window.billId && (
              <BillDetailFloating 
                billId={window.billId}
                onClose={() => closeWindow(window.id)}
              />
            )}
          </FloatingWindow>
        )
      })}
    </>
  )
} 