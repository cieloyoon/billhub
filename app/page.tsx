import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Search, Bell, Users, Send, Lightbulb, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-center space-y-4 px-4 py-16 md:space-y-6 md:py-24 lg:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-2">
          <Badge variant="outline" className="mb-2 md:mb-4 text-xs md:text-sm">
            🏛️ 대한민국 의정 추적 플랫폼
          </Badge>
          <h1 className="text-center text-2xl font-bold leading-tight tracking-tighter md:text-4xl lg:text-6xl lg:leading-[1.1]">
            모든 의안을 추적하고
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              숨겨진 의도까지 파악하세요
            </span>
          </h1>
          <p className="max-w-[750px] text-center text-base text-muted-foreground md:text-lg lg:text-xl">
            국회 의안을 실시간으로 추적하고, AI 챗봇과 대화하며 정책의 진짜 의미를 파악하세요. 
            시민의 목소리를 직접 의회에 전달할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-center w-full max-w-sm sm:max-w-none">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
            지금 시작하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            서비스 둘러보기
          </Button>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-8 md:space-y-6 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2 text-center md:gap-4">
          <h2 className="text-2xl font-bold leading-[1.1] md:text-3xl lg:text-6xl">
            핵심 기능
          </h2>
          <p className="max-w-[85%] text-sm leading-normal text-muted-foreground md:text-lg md:leading-7">
            복잡한 의정 활동을 누구나 쉽게 이해하고 참여할 수 있도록 돕습니다
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] lg:grid-cols-3 lg:gap-6">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">스마트 의안 검색</CardTitle>
              </div>
              <CardDescription className="text-sm">
                모든 의안을 실시간으로 추적하고 강력한 검색 기능으로 찾아보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 키워드, 발의자, 위원회별 검색</li>
                <li>• 진행 상황 실시간 추적</li>
                <li>• 관련 의안 자동 연결</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">맞춤형 알림</CardTitle>
              </div>
              <CardDescription className="text-sm">
                관심 있는 의안의 진행 상황을 놓치지 않고 받아보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 개인화된 알림 설정</li>
                <li>• 중요 변경사항 즉시 알림</li>
                <li>• 이메일, 푸시 알림 지원</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">AI 정책 분석</CardTitle>
              </div>
              <CardDescription className="text-sm">
                AI 챗봇과 대화하며 정책의 숨겨진 의도까지 파악하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 의안 영향도 분석</li>
                <li>• 이해관계자 분석</li>
                <li>• 정치적 맥락 해석</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">시민 토론</CardTitle>
              </div>
              <CardDescription className="text-sm">
                다른 시민들과 의견을 나누고 토론에 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 의안별 토론방</li>
                <li>• 전문가 의견 공유</li>
                <li>• 건설적 토론 문화</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-red-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">의회 의견 제출</CardTitle>
              </div>
              <CardDescription className="text-sm">
                시민의 목소리를 직접 의회에 전달할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 공식 의견서 작성 도구</li>
                <li>• 집단 의견 취합</li>
                <li>• 의원실 직접 전달</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-600 md:h-5 md:w-5" />
                <CardTitle className="text-lg md:text-xl">투명한 정보</CardTitle>
              </div>
              <CardDescription className="text-sm">
                복잡한 정치 과정을 누구나 이해할 수 있게 설명합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-1 md:text-sm">
                <li>• 의정 활동 시각화</li>
                <li>• 쉬운 언어로 요약</li>
                <li>• 팩트체크 지원</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto w-full max-w-screen-2xl space-y-4 px-4 py-8 md:space-y-6 md:py-12 lg:py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2 text-center md:gap-4">
          <h2 className="text-2xl font-bold leading-[1.1] md:text-3xl lg:text-6xl">
            이렇게 작동합니다
          </h2>
          <p className="max-w-[85%] text-sm leading-normal text-muted-foreground md:text-lg md:leading-7">
            3단계로 시민 참여형 의정 감시가 시작됩니다
          </p>
        </div>
        <div className="mx-auto max-w-[800px] space-y-6 md:space-y-8">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm md:text-base">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 md:text-xl md:mb-2">관심 의안 선택</h3>
              <p className="text-sm text-muted-foreground md:text-base">
                관심 있는 분야나 특정 의안을 선택하여 맞춤형 추적을 시작하세요. 
                AI가 연관 의안까지 추천해드립니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm md:text-base">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 md:text-xl md:mb-2">AI와 심도 있는 분석</h3>
              <p className="text-sm text-muted-foreground md:text-base">
                RAG 챗봇과 대화하며 의안의 표면적 내용 뿐만 아니라 숨겨진 의도와 
                정치적 맥락까지 파악하세요.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm md:text-base">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 md:text-xl md:mb-2">직접 참여</h3>
              <p className="text-sm text-muted-foreground md:text-base">
                분석 결과를 바탕으로 의견을 제출하고, 다른 시민들과 토론하며 
                실질적인 민주주의에 참여하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:py-12 lg:py-24">
        <div className="mx-auto max-w-[980px] text-center">
          <h2 className="text-2xl font-bold mb-3 md:text-3xl lg:text-4xl md:mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-sm text-muted-foreground mb-4 md:text-lg md:mb-8">
            시민의 힘으로 더 투명한 정치를 만들어갑시다
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
              무료로 시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              더 알아보기
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
