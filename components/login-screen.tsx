"use client"

import { UserRole } from "@/lib/store"
import { Building2, Users, ShieldCheck } from "lucide-react"
import Image from "next/image"

interface LoginScreenProps {
  onLogin: (role: UserRole, name: string) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  
  const staff = {
    recepcion: ["Luna", "Valen"],
    admin: ["Nico", "Ale", "Claudia"]
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-foreground flex flex-col">
      <div className="mx-auto w-full h-full max-w-5xl flex flex-col px-6 py-4 sm:px-10 sm:py-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative w-full h-[180px] sm:h-[200px] max-w-[300px] sm:max-w-[400px] flex items-center justify-center">
            <Image 
              src="/images/c427logodorado.png" 
              alt="C427 CLINIC Logo" 
              fill
              priority
              className="object-contain scale-[2.6] sm:scale-[1.35] drop-shadow-sm translate-y-3 sm:translate-y-0"
            />
          </div>
          <p className="text-muted-foreground text-xs sm:text-base font-medium mt-10 sm:mt-6">Sistema de Gestión Clínica</p>
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6 shrink-0 pb-12 sm:pb-8 pt-2">
          {/* RECEPCIÓN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Recepción</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
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
              <Building2 size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Cuerpo Profesional</span>
            </div>
            <button
              onClick={() => onLogin("profesional", "")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 rounded-2xl transition-all text-base font-bold flex items-center justify-center gap-3 shadow-md"
            >
              INGRESAR A AGENDA
            </button>
          </div>

          {/* ADMIN */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Administración</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {staff.admin.map(name => (
                <button
                  key={name}
                  onClick={() => onLogin("admin", name)}
                  className="bg-secondary hover:bg-primary hover:text-primary-foreground text-secondary-foreground py-4 rounded-xl transition-all text-sm font-bold shadow-sm border border-border"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}