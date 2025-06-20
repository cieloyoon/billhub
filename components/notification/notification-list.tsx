'use client'

import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

interface NotificationListProps {
  className?: string
}

export function NotificationList({ className = "" }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    fetchNotifications, 
    markAllAsRead 
  } = useNotifications()

  useEffect(() => {
    fetchNotifications(1, activeTab === 'unread')
  }, [activeTab])

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      if (activeTab === 'unread') {
        // 읽지 않은 알림 탭에서 전체 읽음 처리 후 목록 새로고침
        fetchNotifications(1, true)
      }
    } catch (error) {
      console.error('모든 알림 읽음 처리 오류:', error)
    }
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-red-500 ${className}`}>
        <p>알림을 불러오는 중 오류가 발생했습니다.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchNotifications(1, activeTab === 'unread')}
          className="mt-2"
        >
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">알림</h2>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-sm"
          >
            모두 읽음
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}>
        <TabsList className="w-full grid grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            전체
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            읽지 않음
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>알림이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : notifications.filter(n => !n.is_read).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>읽지 않은 알림이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications
                  .filter(n => !n.is_read)
                  .map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
} 