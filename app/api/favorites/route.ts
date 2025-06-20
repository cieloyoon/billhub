import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Favorite {
  bill_id: string
  created_at: string
}

interface Bill {
  id: string
  bill_id: string
  bill_no: string
  bill_name: string
  proposer_kind: string
  proposer: string
  propose_dt: string
  proc_dt: string
  general_result: string
  proc_stage_cd: string
  pass_gubn: string
  summary: string
}

export async function GET() {
  try {
    console.log('Starting GET /api/favorites')
    const supabase = await createClient()
    console.log('Supabase client created')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check result:', { user: !!user, authError })
    
    if (authError || !user) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 먼저 즐겨찾기 목록 가져오기
    const { data: favoritesList, error: favoritesError } = await supabase
      .from('favorites')
      .select('bill_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError)
      return NextResponse.json({ error: favoritesError.message }, { status: 500 })
    }

    if (!favoritesList || favoritesList.length === 0) {
      return NextResponse.json({ favorites: [] })
    }

    // 법안 정보 가져오기
    const billIds = favoritesList.map((fav: Favorite) => fav.bill_id)
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id,
        bill_id,
        bill_no,
        bill_name,
        proposer_kind,
        proposer,
        propose_dt,
        proc_dt,
        general_result,
        proc_stage_cd,
        pass_gubn,
        summary
      `)
      .in('bill_id', billIds)

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return NextResponse.json({ error: billsError.message }, { status: 500 })
    }

    // 즐겨찾기와 법안 정보 합치기
    const favorites = favoritesList.map((favorite: Favorite) => ({
      bill_id: favorite.bill_id,
      created_at: favorite.created_at,
      bills: bills?.find((bill: Bill) => bill.bill_id === favorite.bill_id) || null
    }))

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting POST /api/favorites')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('POST Auth check result:', { user: !!user, authError })
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bill_id } = await request.json()
    
    if (!bill_id) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, bill_id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        return NextResponse.json({ error: 'Already favorited' }, { status: 409 })
      }
      console.error('Error adding favorite:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ favorite: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bill_id = searchParams.get('bill_id')
    
    if (!bill_id) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('bill_id', bill_id)

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 