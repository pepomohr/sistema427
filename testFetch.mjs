import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hwkhcwdqicgnvitlcmwr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2hjd2RxaWNnbnZpdGxjbXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTY4MTMsImV4cCI6MjA4OTk3MjgxM30.Z4EiAJ16WOu4XRJWFCyY8hfyc1pE6Gc5qW7gytyspRI'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  const { data, error } = await supabase.from('professionals').select('*').limit(1)
  console.log('Data:', data)
  console.log('Error:', error)
}
test()
