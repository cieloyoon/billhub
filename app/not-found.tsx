import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          요청하신 페이지를 찾을 수 없습니다.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  )
} 