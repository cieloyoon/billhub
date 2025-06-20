'use client'

import { NotificationList } from '@/components/notification/notification-list'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-xl font-semibold">알림</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <NotificationList className="mt-4" />
        </div>
      </div>
    </div>
  )
} 