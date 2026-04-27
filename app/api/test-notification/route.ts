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

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('professional_id', 'admin')

  if (!subscriptions?.length) {
    return NextResponse.json({ error: 'No hay suscripciones de admin. Entrá al sistema como admin primero.' })
  }

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: 'C427',
          body: '🎯 Recepción llegó a 155 ventas este mes',
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

  return NextResponse.json({ ok: true, sent, total: subscriptions.length })
}
