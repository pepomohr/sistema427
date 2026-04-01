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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-secondary text-secondary-foreground shadow-2xl rounded-3xl p-8 border border-[#2d3529]">
        <div className="flex flex-col items-center text-center mb-8">
          <Image 
            src="/images/c427logodorado.png" 
            alt="C427 CLINIC Logo" 
            width={180} 
            height={60} 
            priority 
            className="mb-2 object-contain filter drop-shadow-md"
          />
          <p className="text-gray-800 text-sm mt-3 font-medium">Sistema de Gestión Clínica</p>
        </div>

        <div className="space-y-6">
          {/* RECEPCIÓN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#D1B98D] mb-1">
              <Users size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Recepción</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {staff.recepcion.map(name => (
                <button
                  key={name}
                  onClick={() => onLogin("recepción", name)}
                  className="bg-white hover:bg-gray-100 text-secondary py-4 rounded-2xl transition-all font-bold shadow-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* PROFESIONALES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#D1B98D] mb-1">
              <Building2 size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Cuerpo Profesional</span>
            </div>
            <button
              onClick={() => onLogin("profesional", "")}
              className="w-full bg-primary hover:bg-[#bfa67a] text-secondary py-5 rounded-2xl transition-all font-bold flex items-center justify-center gap-3 shadow-md"
            >
              INGRESAR A AGENDA
            </button>
          </div>

          {/* ADMIN */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-[#D1B98D] mb-1">
              <ShieldCheck size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Administración</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {staff.admin.map(name => (
                <button
                  key={name}
                  onClick={() => onLogin("admin", name)}
                  className="bg-white hover:bg-primary hover:text-secondary text-secondary py-3 rounded-xl transition-all text-xs font-bold shadow-sm"
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