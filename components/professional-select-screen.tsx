"use client"

import { useClinicStore } from "@/lib/store"
import { ArrowLeft, UserCircle2 } from "lucide-react"

interface ProfessionalSelectScreenProps {
  onSelect: (id: string) => void
  onBack: () => void
}

export function ProfessionalSelectScreen({ onSelect, onBack }: ProfessionalSelectScreenProps) {
  const { professionals = [] } = useClinicStore()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-muted-foreground hover:text-primary flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="text-center mb-8 mt-2">
          <h2 className="text-3xl font-bold text-primary tracking-tighter">Selección</h2>
          <p className="text-muted-foreground text-sm mt-2">¿Qué profesional está ingresando?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {professionals.map(prof => (
            <button
              key={prof.id}
              onClick={() => onSelect(prof.id)}
              className="bg-secondary hover:bg-accent group text-secondary-foreground p-5 rounded-2xl transition-all border border-gray-200 shadow-sm flex flex-col items-center gap-3"
            >
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-transparent group-hover:border-primary/40"
                style={{ backgroundColor: prof.color || '#4A5D45' }}
              >
                {prof.avatar ? (
                  <img src={prof.avatar} alt={prof.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white">{prof.shortName.substring(0,2).toUpperCase()}</span>
                )}
              </div>
              <span className="font-bold text-sm">{prof.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}