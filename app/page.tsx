import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Search, Bell, Users, Send, Lightbulb, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-center space-y-6 px-4 py-24 md:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-2">
          <Badge variant="outline" className="mb-4">
            🏛️ 대한민국 의정 추적 플랫폼
          </Badge>
          <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            모든 의안을 추적하고
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              숨겨진 의도까지 파악하세요
            </span>
          </h1>
          <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
            국회 의안을 실시간으로 추적하고, AI 챗봇과 대화하며 정책의 진짜 의미를 파악하세요. 
            시민의 목소리를 직접 의회에 전달할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-4">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            지금 시작하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg">
            서비스 둘러보기
          </Button>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
            핵심 기능
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            복잡한 의정 활동을 누구나 쉽게 이해하고 참여할 수 있도록 돕습니다
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-2 lg:grid-cols-3">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                <CardTitle>스마트 의안 검색</CardTitle>
              </div>
              <CardDescription>
                모든 의안을 실시간으로 추적하고 강력한 검색 기능으로 찾아보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 키워드, 발의자, 위원회별 검색</li>
                <li>• 진행 상황 실시간 추적</li>
                <li>• 관련 법안 자동 연결</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                <CardTitle>맞춤형 알림</CardTitle>
              </div>
              <CardDescription>
                관심 있는 의안의 진행 상황을 놓치지 않고 받아보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 개인화된 알림 설정</li>
                <li>• 중요 변경사항 즉시 알림</li>
                <li>• 이메일, 푸시 알림 지원</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                <CardTitle>AI 정책 분석</CardTitle>
              </div>
              <CardDescription>
                AI 챗봇과 대화하며 정책의 숨겨진 의도까지 파악하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 법안 영향도 분석</li>
                <li>• 이해관계자 분석</li>
                <li>• 정치적 맥락 해석</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                <CardTitle>시민 토론</CardTitle>
              </div>
              <CardDescription>
                다른 시민들과 의견을 나누고 토론에 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 의안별 토론방</li>
                <li>• 전문가 의견 공유</li>
                <li>• 건설적 토론 문화</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-red-600" />
                <CardTitle>의회 의견 제출</CardTitle>
              </div>
              <CardDescription>
                시민의 목소리를 직접 의회에 전달할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 공식 의견서 작성 도구</li>
                <li>• 집단 의견 취합</li>
                <li>• 의원실 직접 전달</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                <CardTitle>투명한 정보</CardTitle>
              </div>
              <CardDescription>
                복잡한 정치 과정을 누구나 이해할 수 있게 설명합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 의정 활동 시각화</li>
                <li>• 쉬운 언어로 요약</li>
                <li>• 팩트체크 지원</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 md:py-12 lg:py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
            이렇게 작동합니다
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            3단계로 시민 참여형 의정 감시가 시작됩니다
          </p>
        </div>
        <div className="mx-auto max-w-[800px] space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">관심 의안 선택</h3>
              <p className="text-muted-foreground">
                관심 있는 분야나 특정 의안을 선택하여 맞춤형 추적을 시작하세요. 
                AI가 연관 의안까지 추천해드립니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white font-bold">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">AI와 심도 있는 분석</h3>
              <p className="text-muted-foreground">
                RAG 챗봇과 대화하며 의안의 표면적 내용 뿐만 아니라 숨겨진 의도와 
                정치적 맥락까지 파악하세요.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white font-bold">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">참여와 행동</h3>
              <p className="text-muted-foreground">
                다른 시민들과 토론하고, 전문가 의견을 듣고, 최종적으로 
                여러분의 의견을 의회에 직접 전달하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-6xl">
            지금 시작하세요
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            더 나은 민주주의를 위한 첫 걸음을 내디뎌보세요
          </p>
          <div className="flex gap-4 mt-6">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              무료로 시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              데모 보기
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
