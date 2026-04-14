"use client"

import { useState, useEffect } from "react"
import { useClinicStore, type User, type UserRole } from "@/lib/store"
import { LoginScreen } from "@/components/login-screen"
import { ProfessionalSelectScreen } from "@/components/professional-select-screen"
import { MainLayout } from "@/components/main-layout"
import Loader from "@/components/loader"

const STORAGE_KEY = "c427_professional_session"

export default function Home() {
  const { currentUser, setCurrentUser } = useClinicStore()
  const [showProfessionalSelect, setShowProfessionalSelect] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // EFECTO 1: Carga de datos y Realtime (Array vacío para que corra UNA sola vez y no haga bucle)
  useEffect(() => {
    const store = useClinicStore.getState()
    
    // Traemos los datos de Supabase
    store.fetchSales()
    store.fetchOffers()
    store.fetchCombos()
    store.fetchAppointments()
    store.fetchProfessionals()
    store.fetchServices()
    store.fetchProducts()
    store.fetchCashClosures()
    store.fetchExpenses()

    // Activamos Realtime de Claude
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
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const session = JSON.parse(stored)
        const profs = useClinicStore.getState().professionals
        const professional = profs.find(p => p.id === session.professionalId)
        
        if (professional && professional.isActive) {
          setCurrentUser({
            id: session.professionalId,
            name: session.name,
            role: session.role,
            professionalId: session.professionalId,
          })
        } else if (session.role === 'admin' || session.role === 'recepcion') {
           setCurrentUser({
            id: session.id || Date.now().toString(),
            name: session.name,
            role: session.role,
          })
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
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