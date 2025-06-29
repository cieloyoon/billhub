'use client'

import { useEffect, useState } from 'react'
import { useNotifications } from '@/contexts/notification-context'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingCompact } from '@/components/ui/loading'
import { Card } from '@/components/ui/card'
import { Bell, BellRing, CheckCheck } from 'lucide-react'

interface NotificationListProps {
  className?: string
}

export function NotificationList({ className = "" }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([])
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    fetchNotifications, 
    markAllAsRead,
    forceRefresh,
    refreshTrigger
  } = useNotifications()

  // 탭 변경 시 알림 목록 새로고침
  useEffect(() => {
    console.log('🔄 탭 변경 또는 마운트, 알림 목록 가져오기:', activeTab)
    const loadData = async () => {
      const data = await fetchNotifications(1, activeTab === 'unread')
      if (activeTab === 'unread') {
        setUnreadNotifications(data.notifications)
      }
    }
    loadData()
  }, [activeTab, fetchNotifications])

  // 읽음 처리 후 목록 업데이트를 위한 효과
  useEffect(() => {
    if (activeTab === 'unread') {
      // 읽지 않은 탭에서는 실시간으로 목록을 갱신
      const loadUnreadData = async () => {
        const data = await fetchNotifications(1, true)
        setUnreadNotifications(data.notifications)
      }
      loadUnreadData()
    }
  }, [unreadCount, activeTab, fetchNotifications])

  // 알림 목록 변화 감지 (디버깅 목적 - 간소화)
  useEffect(() => {
    console.log('📊 알림 목록 업데이트:', {
      총개수: notifications.length,
      읽지않음: unreadCount,
      현재탭: activeTab
    })
  }, [notifications.length, unreadCount, activeTab])

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

  const handleRetry = () => {
    console.log('다시 시도 - 강제 새로고침')
    forceRefresh()
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Bell className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">오류가 발생했습니다</h3>
            <p className="text-sm text-gray-500">알림을 불러오는 중 문제가 발생했습니다.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
          >
            다시 시도
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')} className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              전체
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              읽지 않음
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 ml-4"
            >
              <CheckCheck className="w-4 h-4" />
              모두 읽음
            </Button>
          )}
        </div>

        <TabsContent value="all" className="flex-1 mt-0">
          <Card className="min-h-[400px]">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-20 px-4 min-h-[300px]">
                  <LoadingCompact message="알림 목록 불러오는 중..." />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[300px]">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">알림이 없습니다</h3>
                  <p className="text-sm text-gray-500 text-center">
                    의안 구독을 설정하면 변경 사항을 알려드립니다.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    return (
                      <NotificationItem
                        key={`${notification.id}-${refreshTrigger}`}
                        notification={notification}
                      />
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 mt-0">
          <Card className="min-h-[400px]">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-20 px-4 min-h-[300px]">
                  <LoadingCompact message="알림 목록 불러오는 중..." />
                </div>
              ) : unreadNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[300px]">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">모든 알림을 확인했습니다</h3>
                  <p className="text-sm text-gray-500 text-center">
                    읽지 않은 알림이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unreadNotifications.map((notification) => {
                    return (
                      <NotificationItem
                        key={`${notification.id}-${refreshTrigger}`}
                        notification={notification}
                      />
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 