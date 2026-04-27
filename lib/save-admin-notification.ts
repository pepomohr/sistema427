import { SupabaseClient } from '@supabase/supabase-js'

export async function saveAdminNotification(
  supabase: SupabaseClient,
  title: string,
  body: string
) {
  try {
    await supabase.from('admin_notifications').insert({ title, body })
  } catch {
    // No bloquear el flujo si falla el guardado
  }
}
