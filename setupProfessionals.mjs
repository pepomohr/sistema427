import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hwkhcwdqicgnvitlcmwr.supabase.co'
// Utilizando la ANON KEY para inyectar la tabla, ya que en el paso previo (SQL) activaremos la política RLS abierta
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2hjd2RxaWNnbnZpdGxjbXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTY4MTMsImV4cCI6MjA4OTk3MjgxM30.Z4EiAJ16WOu4XRJWFCyY8hfyc1pE6Gc5qW7gytyspRI'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const mockProfessionals = [
  { id: 'ceci', name: 'Cecilia', shortName: 'Ceci', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 12, color: '#E8B4B8' },
  { id: 'adri', name: 'Adriana', shortName: 'Adri', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 8, color: '#A8D8EA' },
  { id: 'vero', name: 'Vero', shortName: 'Vero', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 22, color: '#C9B1FF' },
  { id: 'isabel', name: 'Isabel', shortName: 'Isabel', specialties: ['Facial'], isActive: true, hourlyRate: 5000, monthlySalesCount: 4, color: '#F8B195' },
  { id: 'delfi', name: 'Delfi', shortName: 'Delfi', specialties: ['Facial'], isActive: true, hourlyRate: 5000, monthlySalesCount: 7, color: '#F67280' },
  { id: 'martina', name: 'Martina', shortName: 'Martina', specialties: ['CyP'], isActive: true, hourlyRate: 4000, monthlySalesCount: 15, color: '#C06C84' },
  { id: 'fiorella', name: 'Fiorella', shortName: 'Fiorella', specialties: ['Uñas', 'CyP'], isActive: true, hourlyRate: 4500, monthlySalesCount: 5, color: '#F0A6CA' },
  { id: 'bianca', name: 'Bianca', shortName: 'Bianca', specialties: ['CyP'], isActive: true, hourlyRate: 4000, monthlySalesCount: 11, color: '#6C5B7B' },
  { id: 'mavy', name: 'Mavy', shortName: 'Mavy', specialties: ['Maderoterapia'], isActive: true, hourlyRate: 6000, monthlySalesCount: 35, color: '#B8E0D2' }
]

async function seedProfessionals() {
  console.log("Iniciando volcado de profesionales...");
  for (const prof of mockProfessionals) {
    const { error } = await supabase.from('professionals').upsert(prof);
    if (error) {
      console.error(`Error al insertar ${prof.name}:`, error);
    } else {
      console.log(`✅ ${prof.name} persistida correctamente.`);
    }
  }
  console.log("Carga completada.");
}

seedProfessionals();
