"use client"

import { useState, useEffect } from "react"
import { UserRole } from "@/lib/store"
import { Building2, Users, ShieldCheck, Lock } from "lucide-react"
import Image from "next/image"

interface LoginScreenProps {
  onLogin: (role: UserRole, name: string) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [adminPin, setAdminPin] = useState("")
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [storedPin, setStoredPin] = useState<string | null>(null)
  const [error, setError] = useState(false)

  // Cargar el PIN guardado al iniciar
  useEffect(() => {
    const pin = localStorage.getItem("c427_admin_password")
    if (pin) {
      setStoredPin(pin)
    } else {
      setIsSettingPin(true)
    }
  }, [])

  const staff = {
    recepcion: ["Luna", "Valen"],
  }

  const handleAdminAccess = () => {
    if (isSettingPin) {
      if (adminPin.length >= 4) {
        localStorage.setItem("c427_admin_password", adminPin)
        setStoredPin(adminPin)
        setIsSettingPin(false)
        onLogin("admin", "Admin")
      }
    } else {
      if (adminPin === storedPin) {
        onLogin("admin", "Admin")
      } else {
        setError(true)
        setTimeout(() => setError(false), 500)
        setAdminPin("")
      }
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-foreground flex flex-col">
      <div className="mx-auto w-full h-full max-w-5xl flex flex-col px-6 py-4 sm:px-10 sm:py-5">
        
        {/* LOGO SECCIÓN */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative w-full h-[120px] sm:h-[140px] max-w-[220px] sm:max-w-[280px] flex items-center justify-center">
            <Image 
              src="/images/c427logodorado.png" 
              alt="C427 CLINIC Logo" 
              fill
              priority
              className="object-contain drop-shadow-sm"
            />
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-4 tracking-tight">
            Sistema de Gestión Profesional
          </p>
        </div>

        {/* BOTONES DE ACCESO / MODAL ADMIN */}
        <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6 shrink-0 pb-12 sm:pb-8 pt-2">
          
          {showAdminAuth ? (
            <div className="bg-secondary/20 p-6 rounded-3xl border border-border space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="text-center space-y-1">
                <Lock className="mx-auto h-6 w-6 text-primary mb-2" />
                <h3 className="font-bold text-lg">
                  {isSettingPin ? "Configurar Acceso Admin" : "Acceso Restringido"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isSettingPin ? "Elegí una contraseña maestra para administración" : "Ingresá la contraseña para continuar"}
                </p>
              </div>
              
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                autoFocus
                className={`w-full h-14 text-center text-2xl tracking-[1em] font-bold bg-white border-2 rounded-2xl focus:outline-none focus:border-primary transition-colors ${error ? "border-red-500 animate-bounce" : "border-border"}`}
                onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {setShowAdminAuth(false); setAdminPin("");}}
                  className="flex-1 py-3 text-sm font-bold text-muted-foreground"
                >
                  Volver
                </button>
                <button
                  onClick={handleAdminAccess}
                  className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg"
                >
                  {isSettingPin ? "Guardar y Entrar" : "Ingresar"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* RECEPCIÓN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Users size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Recepción</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {staff.recepcion.map(name => (
                    <button
                      key={name}
                      onClick={() => onLogin("recepción", name)}
                      className="bg-secondary hover:bg-accent text-secondary-foreground py-4 rounded-2xl transition-all text-base font-bold shadow-sm border border-border"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROFESIONALES */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Building2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Cuerpo Profesional</span>
                </div>
                <button
                  onClick={() => onLogin("profesional", "")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 rounded-2xl transition-all text-base font-bold flex items-center justify-center gap-3 shadow-md"
                >
                  INGRESAR A AGENDA
                </button>
              </div>

              {/* ADMIN ÚNICO */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Administración</span>
                </div>
                <button
                  onClick={() => setShowAdminAuth(true)}
                  className="w-full bg-[#B68C5C] hover:bg-[#a07840] text-white py-4 rounded-xl transition-all text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  ACCESO ADMIN (DUEÑOS)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}