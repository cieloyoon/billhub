'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { Eye, ExternalLink } from 'lucide-react'

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

  return (
    <div
      className={cn(
        "p-4 hover:bg-gray-50 transition-colors cursor-pointer",
        !notification.is_read && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
    >
      <Link href={`/bill/${notification.bill_id}`} onClick={handleClick}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getNotificationTypeBadgeVariant(notification.notification_type)}>
                {getNotificationTypeText(notification.notification_type)}
              </Badge>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
              {notification.title}
            </h3>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-3">
              {notification.message}
            </p>
            
            {notification.bills && (
              <div className="text-xs text-gray-500 mb-2">
                {notification.bills.bill_no} | {notification.bills.bill_name}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <time className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(notification.sent_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </time>
              
              <div className="flex items-center gap-2">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    disabled={isMarking}
                    className="text-xs h-6 px-2"
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
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
} 