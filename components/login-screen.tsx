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
    <div className="h-screen overflow-hidden bg-white text-foreground">
      <div className="mx-auto grid h-full w-full max-w-5xl grid-rows-[46vh_1fr] px-6 py-4 sm:px-10 sm:py-5">
        <div className="flex flex-col items-center justify-center text-center min-h-0">
          <div className="flex h-[40vh] w-full items-center justify-center overflow-hidden">
            <Image 
              src="/images/c427logodorado.png" 
              alt="C427 CLINIC Logo" 
              width={1200} 
              height={420} 
              priority
              sizes="100vw"
              className="h-full w-auto max-w-none object-contain scale-[1.35] drop-shadow-sm"
            />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">Sistema de Gestión Clínica</p>
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-5 overflow-hidden">
          {/* RECEPCIÓN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Users size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Recepción</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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