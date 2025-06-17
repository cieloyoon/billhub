import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const billId = searchParams.get('bill_id')
  
  if (!billId) {
    return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })
  }

  try {
    const serviceKey = 'sgOQlwpackhO01oaCAAcwfJy4IGwN%2F2uLcXifUcmx%2FIwLRwPkaBTgz9kBtg5oQg8YRxPZICHxtKF%2BsXKn4rf%2Fw%3D%3D'
    const apiUrl = `http://apis.data.go.kr/9710000/BillInfoService2/getBillAdditionalInfo?bill_id=${billId}&ServiceKey=${serviceKey}`
    
    console.log('부가 정보 API 호출 URL:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, application/json, text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; lawpage1.0)'
      }
    })

    if (!response.ok) {
      console.error('부가 정보 API 응답 에러:', response.status, response.statusText)
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`)
    }

    const data = await response.text()
    console.log('부가 정보 API 응답 받음:', data.length, '바이트')
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  } catch (error) {
    console.error('Error fetching additional info:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '부가 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
} 