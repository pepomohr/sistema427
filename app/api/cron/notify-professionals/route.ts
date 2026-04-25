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

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', `${tomorrowStr}T00:00:00`)
    .lte('date', `${tomorrowStr}T23:59:59`)
    .not('status', 'in', '("cancelado","cancelled")')

  if (aptError) return NextResponse.json({ error: aptError.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ ok: true, sent: 0 })

  // Agrupar por profesional
  const byProf: Record<string, any[]> = {}
  for (const apt of appointments) {
    const profId = apt.professional_id || apt.professionalId
    if (!profId) continue
    if (!byProf[profId]) byProf[profId] = []
    byProf[profId].push(apt)
  }

  const profIds = Object.keys(byProf)
  if (!profIds.length) return NextResponse.json({ ok: true, sent: 0 })

  const [{ data: subscriptions }, { data: professionals }] = await Promise.all([
    supabase.from('push_subscriptions').select('*').in('professional_id', profIds),
    supabase.from('professionals').select('id, name').in('id', profIds),
  ])

  if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0, note: 'No subscriptions' })

  const profNames: Record<string, string> = {}
  for (const p of professionals ?? []) {
    profNames[p.id] = p.name.split(' ')[0]
  }

  let sent = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      const apts = byProf[sub.professional_id]
      if (!apts) return

      const firstName = profNames[sub.professional_id] ?? 'Hola'
      const aptLines = apts
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((apt) => {
          const time = new Date(apt.date).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires',
          })
          const services = Array.isArray(apt.services)
            ? apt.services.map((s: any) => s.name || s).join(' + ')
            : apt.service_name ?? 'Turno'
          return `${time}hs - ${services}`
        })
        .join('\n')

      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: `¡Hola ${firstName}! 👋`,
            body: `Mañana tenés:\n${aptLines}`,
            url: '/',
          })
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return NextResponse.json({ ok: true, sent })
}
