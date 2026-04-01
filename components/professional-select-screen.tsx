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
    <div className="min-h-screen bg-[#829177] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-gray-300 shadow-2xl relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-gray-600 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="text-center mb-8 mt-2">
          <h2 className="text-3xl font-bold text-[#D1B98D] tracking-tighter">Selección</h2>
          <p className="text-gray-600 text-sm mt-2">¿Qué profesional está ingresando?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {professionals.map(prof => (
            <button
              key={prof.id}
              onClick={() => onSelect(prof.id)}
              className="bg-white/10 hover:bg-[#D1B98D] group text-white hover:text-[#4A5D45] p-5 rounded-2xl transition-all border border-gray-200 shadow-sm flex flex-col items-center gap-3"
            >
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-transparent group-hover:border-gray-300"
                style={{ backgroundColor: prof.color || '#4A5D45' }}
              >
                {prof.avatar ? (
                  <img src={prof.avatar} alt={prof.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-[#2d3529]">{prof.shortName.substring(0,2).toUpperCase()}</span>
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