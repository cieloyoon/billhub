'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { Eye, ExternalLink, Clock, FileText } from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isMarking, setIsMarking] = useState(false)
  const { markAsRead } = useNotifications()

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (notification.is_read || isMarking) return

    setIsMarking(true)
    try {
      await markAsRead(notification.id)
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error)
    } finally {
      setIsMarking(false)
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
          "group p-6 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer border-l-4",
          notification.is_read 
            ? "border-l-transparent" 
            : "border-l-blue-500 bg-blue-50/30"
        )}
      >
        <div className="flex items-start gap-4">
          {/* 알림 아이콘 */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            notification.is_read 
              ? "bg-gray-100" 
              : "bg-blue-100"
          )}>
            <FileText className={cn(
              "w-5 h-5",
              notification.is_read ? "text-gray-500" : "text-blue-600"
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
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
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
                "text-sm mb-3 line-clamp-3 whitespace-pre-line leading-relaxed",
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
            
            {/* 액션 버튼들 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    disabled={isMarking}
                    className="text-xs h-7 px-2 hover:bg-blue-100 hover:text-blue-700"
                  >
                    {isMarking ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        읽음 처리
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>자세히 보기</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
} 