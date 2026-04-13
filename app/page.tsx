"use client"

import { useState, useEffect } from "react"
import { useClinicStore, type User, type UserRole } from "@/lib/store"
import { LoginScreen } from "@/components/login-screen"
import { ProfessionalSelectScreen } from "@/components/professional-select-screen"
import { MainLayout } from "@/components/main-layout"
import Loader from "@/components/loader"

const STORAGE_KEY = "c427_professional_session"

export default function Home() {
  const { currentUser, setCurrentUser, professionals } = useClinicStore()
  const [showProfessionalSelect, setShowProfessionalSelect] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // 1. Recuperar sesión del localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const session = JSON.parse(stored)
        const professional = professionals.find(p => p.id === session.professionalId)
        if (professional && professional.isActive) {
          setCurrentUser({
            id: session.professionalId,
            name: session.name,
            role: session.role,
            professionalId: session.professionalId,
          })
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // 2. CARGA DE DATOS DE SUPABASE (Ventas, Ofertas y Combos)
    const { fetchSales, fetchOffers, fetchCombos } = useClinicStore.getState()
    fetchSales()
    fetchOffers()
    fetchCombos()

    // 3. Tiempo mínimo de carga para que luzca el logo (3 segs)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [professionals, setCurrentUser])
  
  const handleLogin = (role: UserRole, name: string) => {
    if (role === "profesional") {
      setShowProfessionalSelect(true)
    } else {
      setCurrentUser({ id: Date.now().toString(), name, role })
    }
  }
  
  const handleProfessionalSelect = (professionalId: string) => {
    const professional = professionals.find(p => p.id === professionalId)
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