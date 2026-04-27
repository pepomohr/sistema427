import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { who } = await req.json()
  if (!who) return NextResponse.json({ ok: false, reason: 'missing who' })

  // Contar ventas del mes actual para esta persona
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { count, error } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('processed_by', who)
    .gte('date', firstDay)
    .lte('date', lastDay)

  if (error) return NextResponse.json({ ok: false, error: error.message })

  const total = count ?? 0

  // Solo notificar en múltiplos de 10
  if (total === 0 || total % 10 !== 0) {
    return NextResponse.json({ ok: false, reason: 'not a milestone', count: total })
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('professional_id', 'admin')

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: false, reason: 'no admin subscriptions', count: total })
  }

  const isMax = total >= 30
  const body = isMax
    ? `🏆 ${who} alcanzó el nivel máximo de comisiones con ${total} ventas`
    : `🎯 ${who} llegó a ${total} ventas este mes`

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title: 'C427', body, url: '/' })
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return NextResponse.json({ ok: true, sent, count: total })
}
