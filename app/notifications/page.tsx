'use client'

import { NotificationList } from '@/components/notification/notification-list'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">알림 센터</h1>
              <p className="text-gray-600 mt-1">의안 변경 사항을 확인하세요</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <NotificationList />
        </div>
      </div>
    </div>
  )
} 