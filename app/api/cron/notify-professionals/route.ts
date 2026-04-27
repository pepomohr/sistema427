import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

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

  // Mañana en Argentina (UTC-3)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  // Formato "27/04" para el body
  const [year, month, day] = tomorrowStr.split('-')
  const tomorrowDisplay = `${day}/${month}`

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', `${tomorrowStr}T00:00:00`)
    .lte('date', `${tomorrowStr}T23:59:59`)
    .not('status', 'in', '("cancelado","cancelled")')

  if (aptError) return NextResponse.json({ error: aptError.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ ok: true, sent: 0 })

  // Obtener todos los professional_ids únicos
  const profIds = [...new Set(appointments.map(a => a.professional_id || a.professionalId).filter(Boolean))]
  if (!profIds.length) return NextResponse.json({ ok: true, sent: 0 })

  const [{ data: subscriptions }] = await Promise.all([
    supabase.from('push_subscriptions').select('*').in('professional_id', profIds),
  ])

  if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0, note: 'No subscriptions' })

  let sent = 0

  // Una notificación por turno
  for (const apt of appointments) {
    const profId = apt.professional_id || apt.professionalId
    if (!profId) continue

    const profSubs = subscriptions.filter(s => s.professional_id === profId)
    if (!profSubs.length) continue

    // Hora del turno
    const aptDate = new Date(apt.date)
    const time = aptDate.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false,
    })

    // Nombre del servicio
    const serviceName = Array.isArray(apt.services) && apt.services.length > 0
      ? apt.services.map((s: any) => s.name || s).join(' + ')
      : apt.service_name ?? 'turno'

    const body = `Mañana ${tomorrowDisplay} tenés un ${serviceName} a las ${time}hs`

    for (const sub of profSubs) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: 'C427',
            body,
            url: '/',
          })
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
