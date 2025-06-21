import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FloatingWindowProps {
  children: React.ReactNode
  title: string
  isOpen: boolean
  onClose: () => void
  defaultWidth?: number
  defaultHeight?: number
  defaultX?: number
  defaultY?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  className?: string
}

export function FloatingWindow({
  children,
  title,
  isOpen,
  onClose,
  defaultWidth = 900,
  defaultHeight = 800,
  defaultX,
  defaultY,
  minWidth = 350, // 모바일을 위해 최소 너비 줄임
  minHeight = 400,
  maxWidth,
  maxHeight,
  className
}: FloatingWindowProps) {
  // 화면 중앙에 배치하는 초기 위치 계산
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 100, y: 100 }
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    // 크기 계산 (getInitialSize와 동일한 로직)
    const isMobile = screenWidth < 768
    const reservedHeight = isMobile ? 66 : 20
    const availableHeight = screenHeight - reservedHeight
    
    let currentWidth, currentHeight
    
    // 모바일과 데스크톱 크기 계산
    if (isMobile) {
      currentWidth = Math.max(minWidth, screenWidth - 10)
      currentHeight = Math.max(minHeight, availableHeight - 10)
    } else {
      // 데스크톱에서는 좌우 30% 여백 (60% 너비 사용)
      const desktopWidth = screenWidth * 0.6
      currentWidth = Math.max(minWidth, desktopWidth)
      currentHeight = Math.max(minHeight, availableHeight - 10)
    }
    
    // 기본값이 제공되지 않았다면 적절한 위치에 배치
    const x = defaultX !== undefined ? defaultX : (isMobile ? 5 : Math.max(50, (screenWidth - currentWidth) / 2))
    const y = defaultY !== undefined ? defaultY : (isMobile ? 5 : Math.max(50, Math.min(
      (availableHeight - currentHeight) / 2 + 50, // 상단 여백 50px 추가
      availableHeight - currentHeight - 20 // 하단 최소 20px 여백
    )))
    
    return { x, y }
  }, [defaultX, defaultY, defaultWidth, defaultHeight, minWidth, minHeight])

  // 화면 크기에 맞춘 초기 사이즈 계산
  const getInitialSize = useCallback(() => {
    if (typeof window === 'undefined') return { width: defaultWidth, height: defaultHeight }
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    // 모바일에서는 하단 네비게이션(64px)만 고려, 여백 최소화
    const isMobile = screenWidth < 768
    const reservedHeight = isMobile ? 66 : 20 // 모바일은 네비게이션만, 데스크톱은 최소 여백
    const availableHeight = screenHeight - reservedHeight
    
    // 모바일에서는 화면을 거의 가득 채우고, 데스크톱에서는 좌우 30% 여백
    if (isMobile) {
      return {
        width: Math.max(minWidth, screenWidth - 10), // 좌우 5px씩만 여백
        height: Math.max(minHeight, availableHeight - 10) // 상하 5px씩만 여백
      }
    } else {
      // 데스크톱에서는 좌우 30% 여백 (60% 너비 사용)
      const desktopWidth = screenWidth * 0.6 // 60% 너비 사용
      return {
        width: Math.max(minWidth, desktopWidth),
        height: Math.max(minHeight, availableHeight - 10) // 상하 5px씩만 여백
      }
    }
  }, [defaultWidth, defaultHeight, minWidth, minHeight])

  const [position, setPosition] = useState(getInitialPosition())
  const [size, setSize] = useState(getInitialSize())
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [beforeMinimize, setBeforeMinimize] = useState({ 
    position: { x: defaultX || 100, y: defaultY || 100 }, 
    size: { width: defaultWidth, height: defaultHeight } 
  })

  const windowRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // 창 위치와 크기 업데이트
  const updateWindow = useCallback(() => {
    if (!windowRef.current) return
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    // 모바일에서는 하단 네비게이션을 고려
    const isMobile = screenWidth < 768
    const reservedHeight = isMobile ? 66 : 20
    const availableHeight = screenHeight - reservedHeight
    
    // 화면 밖으로 나가지 않도록 제한 (여백 최소화)
    const minX = 5 // 최소 좌측 여백
    const minY = 5 // 최소 상단 여백
    const maxX = Math.max(minX, screenWidth - size.width - 5) // 최소 우측 여백
    const maxY = Math.max(minY, availableHeight - size.height - 5) // 최소 하단 여백
    
    const constrainedX = Math.max(minX, Math.min(position.x, maxX))
    const constrainedY = Math.max(minY, Math.min(position.y, maxY))
    
    if (constrainedX !== position.x || constrainedY !== position.y) {
      setPosition({ x: constrainedX, y: constrainedY })
    }
  }, [position, size])

  // 컴포넌트 마운트 시 화면 크기에 맞춰 위치와 크기 재조정
  useEffect(() => {
    if (isOpen) {
      setPosition(getInitialPosition())
      setSize(getInitialSize())
    }
  }, [isOpen, getInitialPosition, getInitialSize])

  useEffect(() => {
    updateWindow()
  }, [updateWindow])

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  // 마우스 이동
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  // 최소화
  const handleMinimize = () => {
    if (!isMinimized) {
      // 최소화 시 화면 하단으로 이동
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const isMobile = screenWidth < 768
      const reservedHeight = isMobile ? 66 : 20
      const availableHeight = screenHeight - reservedHeight
      
      // 현재 위치를 저장 (복원용)
      setBeforeMinimize({ position, size })
      
      // 화면 하단에 배치
      const minimizedWidth = Math.min(400, size.width)
      setPosition({
        x: Math.max(10, (screenWidth - minimizedWidth) / 2), // 중앙 정렬
        y: availableHeight - 57 - 10 // 하단에서 10px 위
      })
    } else {
      // 복원 시 원래 위치로
      setPosition(beforeMinimize.position)
    }
    setIsMinimized(!isMinimized)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={windowRef}
        className={cn(
          "absolute bg-background border border-border rounded-lg shadow-2xl pointer-events-auto overflow-hidden",
          "backdrop-blur-sm bg-background/95 supports-[backdrop-filter]:bg-background/95",
          isDragging ? "cursor-move" : "",
          isOpen ? "animate-in fade-in-0 zoom-in-95 duration-200" : "",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? Math.min(400, size.width) : size.width,
          height: isMinimized ? 57 : size.height, // 헤더 높이만큼만 표시
          transition: isMinimized ? 'all 0.2s ease-in-out' : isDragging ? 'none' : 'all 0.1s ease-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-muted/30 to-muted/50 border-b border-border/50 cursor-move select-none backdrop-blur-sm"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-sm font-semibold truncate text-foreground/90 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/60" />
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted/80 rounded-full transition-colors"
              onClick={handleMinimize}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full transition-colors"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* 내용 */}
        {!isMinimized && (
          <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100% - 57px)' }}>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        )}


      </div>
    </div>
  )
} 