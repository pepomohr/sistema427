"use client"

import { useState, useEffect } from "react"
import { useClinicStore, type User, type UserRole } from "@/lib/store"
import { LoginScreen } from "@/components/login-screen"
import { ProfessionalSelectScreen } from "@/components/professional-select-screen"
import { MainLayout } from "@/components/main-layout"
import Loader from "@/components/loader"

const STORAGE_KEY = "c427_professional_session"
const RESET_MONTH_KEY = "c427_last_sales_reset"

export default function Home() {
  const { currentUser, setCurrentUser } = useClinicStore()
  const [showProfessionalSelect, setShowProfessionalSelect] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // EFECTO 1: Carga de datos y Realtime (Array vacío para que corra UNA sola vez y no haga bucle)
  useEffect(() => {
    const store = useClinicStore.getState()

    const initApp = async () => {
      // Cargamos ventas y profesionales primero (necesarios para recalcular contadores)
      await Promise.all([store.fetchSales(), store.fetchProfessionals()])

      // Reset mensual automático de contadores de comisiones
      const now = new Date()
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
      const lastReset = localStorage.getItem(RESET_MONTH_KEY)
      if (lastReset === null) {
        // Primera vez: recalcular desde ventas reales para restaurar contadores
        await store.resetMonthlyCommissions()
        localStorage.setItem(RESET_MONTH_KEY, currentMonthKey)
      } else if (lastReset !== currentMonthKey) {
        // Cambió el mes → poner todo a 0
        await store.monthlyReset()
        localStorage.setItem(RESET_MONTH_KEY, currentMonthKey)
      }

      // Resto de datos en paralelo
      store.fetchPatients()
      store.fetchOffers()
      store.fetchCombos()
      store.fetchAppointments()
      store.fetchServices()
      store.fetchProducts()
      store.fetchCashClosures()
      store.fetchExpenses()
    }

    initApp()

    // Activamos Realtime
    const unsubscribe = store.subscribeToAppointments()

    // Sacamos el loader a los 3 segundos
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    // Limpieza
    return () => {
      clearTimeout(timer)
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, []) // <-- ESTE ARRAY VACÍO ES LA CLAVE QUE FALTABA

  // EFECTO 2: Recuperar sesión guardada
  // No esperamos a que carguen los profesionales — confiamos en el localStorage
  // (si la profesional fue desactivada, el admin puede hacer logout manual)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const session = JSON.parse(stored)
      if (session.role === 'profesional' && session.professionalId && session.name) {
        setCurrentUser({
          id: session.professionalId,
          name: session.name,
          role: 'profesional',
          professionalId: session.professionalId,
        })
      } else if ((session.role === 'admin' || session.role === 'recepcion') && session.name) {
        setCurrentUser({
          id: session.id || Date.now().toString(),
          name: session.name,
          role: session.role,
        })
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [setCurrentUser])
  
  const handleLogin = (role: UserRole, name: string) => {
    if (role === "profesional") {
      setShowProfessionalSelect(true)
    } else {
      const newSession = { id: Date.now().toString(), name, role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession))
      setCurrentUser(newSession)
    }
  }
  
  const handleProfessionalSelect = (professionalId: string) => {
    const profs = useClinicStore.getState().professionals
    const professional = profs.find(p => p.id === professionalId)
    if (!professional) return
    
    const session = { professionalId, name: professional.name, role: "profesional" as UserRole }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    
    setCurrentUser({ id: professionalId, name: professional.name, role: "profesional", professionalId })
    setShowProfessionalSelect(false)
  }
  
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
    setShowProfessionalSelect(false)
  }
  
  if (isLoading) return <Loader />
  
  if (!currentUser && !showProfessionalSelect) {
    return <LoginScreen onLogin={handleLogin} />
  }
  
  if (showProfessionalSelect) {
    return <ProfessionalSelectScreen onSelect={handleProfessionalSelect} onBack={() => setShowProfessionalSelect(false)} />
  }
  
  return <MainLayout user={currentUser!} onLogout={handleLogout} />
}