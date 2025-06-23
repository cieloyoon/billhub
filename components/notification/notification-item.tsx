'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications, type Notification } from '@/contexts/notification-context'
import { cn } from '@/lib/utils'
import { Eye, ExternalLink, Clock, FileText, Trash2 } from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification: initialNotification }: NotificationItemProps) {
  const [isMarking, setIsMarking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { markAsRead, deleteNotification, notifications } = useNotifications()
  
  // 현재 상태의 알림 데이터를 가져오기 (실시간 업데이트 반영)
  const notification = useMemo(() => {
    const currentNotification = notifications.find(n => n.id === initialNotification.id)
    console.log('🔄 알림 상태 체크:', {
      id: initialNotification.id,
      initial_is_read: initialNotification.is_read,
      current_is_read: currentNotification?.is_read,
      found: !!currentNotification,
      notifications_length: notifications.length
    })
    return currentNotification || initialNotification
  }, [notifications, initialNotification])

  // 알림이 삭제되었으면 컴포넌트를 렌더링하지 않음
  if (notifications.length > 0 && !notifications.find(n => n.id === initialNotification.id)) {
    console.log('🚫 삭제된 알림이므로 렌더링 안함:', initialNotification.id)
    return null
  }

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🖱️ 읽음 버튼 클릭:', { 
      id: notification.id, 
      title: notification.title,
      is_read: notification.is_read,
      isMarking 
    })
    
    if (notification.is_read) {
      console.log('⚠️ 이미 읽음 상태')
      return
    }
    
    if (isMarking) {
      console.log('⚠️ 이미 처리 중')
      return
    }

    setIsMarking(true)
    try {
      console.log('🔄 markAsRead 호출 시작')
      await markAsRead(notification.id)
      console.log('✅ markAsRead 성공')
    } catch (error) {
      console.error('❌ 알림 읽음 처리 오류:', error)
    } finally {
      setIsMarking(false)
      console.log('🏁 처리 완료, isMarking = false')
    }
  }

  const handleClick = async () => {
    // 클릭 시 자동으로 읽음 처리
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('알림 읽음 처리 오류:', error)
      }
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🗑️ 삭제 버튼 클릭:', { 
      id: notification.id, 
      title: notification.title,
      isDeleting 
    })
    
    if (isDeleting) {
      console.log('⚠️ 이미 삭제 중')
      return
    }

    setIsDeleting(true)
    try {
      console.log('🔄 deleteNotification 호출 시작')
      await deleteNotification(notification.id)
      console.log('✅ deleteNotification 성공')
      // 삭제 성공 시 컴포넌트가 언마운트되므로 finally는 실행되지 않을 수 있음
    } catch (error) {
      console.error('❌ 알림 삭제 오류:', error)
      // 에러 발생 시 사용자에게 알림 (선택사항)
      // 404 에러나 "찾을 수 없음" 에러는 무시
      if (error instanceof Error && 
          !error.message.includes('404') && 
          !error.message.includes('not found')) {
        // 실제 에러만 표시
        alert('알림 삭제 중 오류가 발생했습니다.')
      }
    } finally {
      console.log('🏁 삭제 처리 완료')
      // 컴포넌트가 여전히 마운트되어 있을 때만 상태 업데이트
      setTimeout(() => {
        setIsDeleting(false)
      }, 100)
    }
  }

  const getNotificationTypeText = (type: string) => {
    switch (type) {
      case 'stage_change':
        return '단계 변경'
      case 'general_result':
        return '처리 결과'
      default:
        return '알림'
    }
  }

  const getNotificationTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'stage_change':
        return 'default' as const
      case 'general_result':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  // 마크다운 볼드 처리를 HTML로 변환
  const formatMessage = (message: string) => {
    return message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  }

  return (
    <Link href={`/bill/${notification.bill_id}`} onClick={handleClick}>
      <div
        className={cn(
          "group p-6 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer",
          notification.is_read 
            ? "" 
            : "",
          isDeleting && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex items-start gap-4">
          {/* 알림 아이콘 */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            notification.is_read 
              ? "bg-gray-100" 
              : "bg-green-100"
          )}>
            <FileText className={cn(
              "w-5 h-5",
              notification.is_read ? "text-gray-500" : "text-green-600"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-3">
              <Badge 
                variant={getNotificationTypeBadgeVariant(notification.notification_type)}
                className="text-xs font-medium"
              >
                {getNotificationTypeText(notification.notification_type)}
              </Badge>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
              <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(notification.sent_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </div>
            </div>
            
            {/* 제목 */}
            <h3 className={cn(
              "font-semibold mb-2 line-clamp-1",
              notification.is_read ? "text-gray-700" : "text-gray-900"
            )}>
              {notification.title}
            </h3>
            
            {/* 메시지 내용 */}
            <div 
              className={cn(
                "text-sm mb-3 line-clamp-4 whitespace-pre-line leading-relaxed",
                notification.is_read ? "text-gray-500" : "text-gray-700"
              )}
              dangerouslySetInnerHTML={{ __html: formatMessage(notification.message) }}
            />
            
            {/* 법안 정보 */}
            {notification.bills && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded-md">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">{notification.bills.bill_no}</span>
                <span className="text-gray-400">|</span>
                <span className="line-clamp-1">{notification.bills.bill_name}</span>
              </div>
            )}
            
            {/* 삭제 중일 때 메시지 표시 */}
            {isDeleting && (
              <div className="flex items-center gap-2 text-sm text-orange-600 mb-3 px-2 py-1 bg-orange-50 rounded-md">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-600" />
                <span>삭제 중...</span>
              </div>
            )}
            
            {/* 액션 버튼들 */}
            <div className="flex items-center justify-end gap-2">
              {!notification.is_read && !isDeleting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarking}
                  className="text-xs h-7 px-2 hover:bg-green-100 hover:text-green-700"
                >
                  {isMarking ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      읽음
                    </>
                  )}
                </Button>
              )}
              {!isDeleting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs h-7 px-2 hover:bg-red-100 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
} 