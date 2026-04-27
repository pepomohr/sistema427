import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { saveAdminNotification } from '@/lib/save-admin-notification'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  const { data: pending, error } = await supabase
    .from('appointments')
    .select('id, patient_name, professional_id, date, status')
    .gte('date', `${todayStr}T00:00:00`)
    .lte('date', `${todayStr}T23:59:59`)
    .not('status', 'in', '("completado","cancelado","cancelled")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending?.length) return NextResponse.json({ ok: true, pending: 0 })

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('professional_id', 'admin')

  if (!subscriptions?.length) return NextResponse.json({ ok: true, pending: pending.length, note: 'no admin subs' })

  const names = pending.map(a => a.patient_name || 'Paciente').slice(0, 3).join(', ')
  const extra = pending.length > 3 ? ` y ${pending.length - 3} más` : ''
  const title = 'C427 — Pendientes de cobro'
  const body = `Quedaron ${pending.length} paciente${pending.length > 1 ? 's' : ''} sin cobrar: ${names}${extra}`

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url: '/' }))
      sent++
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  if (sent > 0) await saveAdminNotification(supabase, title, body)

  return NextResponse.json({ ok: true, sent, pending: pending.length })
}
