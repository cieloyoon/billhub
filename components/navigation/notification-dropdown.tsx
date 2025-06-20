'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, type Notification } from '@/hooks/use-notifications'

export function NotificationDropdown() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // 드롭다운이 열릴 때 최신 알림 5개 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, false).then((data) => {
        setRecentNotifications(data.notifications.slice(0, 5))
      })
    }
  }, [isOpen])

  // 마크다운 볼드 처리를 HTML로 변환
  const formatMessage = (message: string) => {
    return message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return
    
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
      // 알림 목록 새로고침
      const data = await fetchNotifications(1, false)
      setRecentNotifications(data.notifications.slice(0, 5))
    } catch (error) {
      console.error('모든 알림 읽음 처리 오류:', error)
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              모두 읽음
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/bill/${notification.bill_id}`}
                  onClick={() => handleNotificationClick(notification)}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {notification.title}
                        </p>
                        <p 
                          className="text-xs text-muted-foreground mt-1 line-clamp-4 whitespace-pre-line"
                          dangerouslySetInnerHTML={{ __html: formatMessage(notification.message) }}
                        />
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          {formatDistanceToNow(new Date(notification.sent_at), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {recentNotifications.length > 0 && (
          <div className="p-3 border-t">
            <Link href="/notifications">
              <Button variant="outline" size="sm" className="w-full">
                모든 알림 보기
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
} 