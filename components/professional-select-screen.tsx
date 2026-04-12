"use client"

import { useState, useEffect, useCallback } from "react"
import { useClinicStore, getCategoryDisplayName } from "@/lib/store"
import { ArrowLeft, Delete, MapPin } from "lucide-react"
import Image from "next/image"

interface ProfessionalSelectScreenProps {
  onSelect: (id: string) => void
  onBack: () => void
}

export function ProfessionalSelectScreen({ onSelect, onBack }: ProfessionalSelectScreenProps) {
  const { professionals = [], fetchProfessionals } = useClinicStore()
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null)
  const [pin, setPin] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [errorShake, setErrorShake] = useState(false)

  useEffect(() => {
    const load = async () => { if (typeof fetchProfessionals === 'function') await fetchProfessionals() }
    load()
  }, [fetchProfessionals])

  const validatePin = useCallback((enteredPin: string, profId: string, creating: boolean) => {
    if (creating) {
      localStorage.setItem(`c427_pins_${profId}`, enteredPin)
      onSelect(profId)
    } else {
      const existingPin = localStorage.getItem(`c427_pins_${profId}`)
      if (enteredPin === existingPin) {
        onSelect(profId)
      } else {
        setErrorShake(true)
        setTimeout(() => { setPin(""); setErrorShake(false) }, 700)
      }
    }
  }, [onSelect])

  const handleKeyPress = useCallback((num: string) => {
    if (pin.length >= 4) return
    const newPin = pin + num
    setPin(newPin)
    if (newPin.length === 4 && selectedProfId) {
      setTimeout(() => validatePin(newPin, selectedProfId, isCreating), 150)
    }
  }, [pin, selectedProfId, isCreating, validatePin])

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedProfId) return
      if (e.key >= "0" && e.key <= "9") handleKeyPress(e.key)
      if (e.key === "Backspace") handleDelete()
      if (e.key === "Escape") setSelectedProfId(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedProfId, handleKeyPress, handleDelete])

  const handleProfClick = (id: string) => {
    setSelectedProfId(id)
    setPin("")
    setErrorShake(false)
    setIsCreating(!localStorage.getItem(`c427_pins_${id}`))
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col p-4 sm:p-8 relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes custom-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          50% { transform: translateX(10px); }
          75% { transform: translateX(-10px); }
        }
        .animate-custom-shake { animation: custom-shake 0.4s ease-in-out; }
      `}} />

      <div className="w-full relative py-6 mb-8 border-b border-gray-100">
        <button onClick={onBack} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#16A34A] p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={28} />
        </button>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-wider">PANEL DE INGRESO</h2>
          <p className="text-muted-foreground text-sm mt-1">Seleccioná tu tarjeta de staff para acceder</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {professionals.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#16A34A]/20 border-t-[#16A34A] rounded-full animate-spin" />
          </div>
        ) : (
          // 🏆 DISEÑO ORIGINAL DE CARDS RESTAURADO
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-10 gap-y-12 max-w-[1400px]">
            {professionals.map(prof => (
              <button key={prof.id} onClick={() => handleProfClick(prof.id)} className="group flex flex-col items-center outline-none transition-transform hover:-translate-y-2">
                <div className="w-[230px] h-[330px] rounded-3xl bg-white shadow-lg group-hover:shadow-2xl transition-all overflow-hidden border border-gray-100 flex flex-col relative">
                    <div className="h-[140px] w-full p-6 flex flex-col justify-end relative" style={{ backgroundColor: prof.color || '#16A34A' }}>
                        <p className="text-[10px] text-white/80 font-medium italic tracking-widest uppercase">Staff Oficial C427</p>
                        <h3 className="text-2xl font-black text-white leading-tight truncate">{prof.shortName || prof.name.split(' ')[0]}</h3>
                    </div>
                    <div className="flex-1 p-6 flex flex-col justify-between text-left">
                        <div className="space-y-4">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Especialidad</p>
                            <p className="text-xs text-gray-700 font-semibold line-clamp-2">{prof.specialties?.map(s => getCategoryDisplayName(s)).join(", ") || 'General'}</p>
                            <div className="flex items-center gap-2 text-gray-500">
                                <MapPin size={14} className="text-[#B68C5C]" />
                                <span className="text-[11px] font-medium">Sede Temperley</span>
                            </div>
                        </div>
                        <div className="relative w-full h-[35px] opacity-70"><Image src="/images/c427logodorado.png" alt="Logo" fill className="object-contain" /></div>
                    </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* OVERLAY DE PIN - Ajustado para que entre en la pantalla */}
      {selectedProfId && (
        <div className="fixed inset-0 bg-white/98 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <button onClick={() => setSelectedProfId(null)} className="absolute top-6 left-6 text-gray-400 hover:text-[#16A34A] p-2 transition-colors">
            <ArrowLeft size={28} />
          </button>
          
          <div className="w-full max-w-[320px] flex flex-col items-center">
            {/* Logo más compacto */}
            <div className="relative w-[180px] h-[60px] mb-4">
              <Image src="/images/c427logodorado.png" alt="C427 Logo" fill priority className="object-contain" />
            </div>
            
            {/* Textos más compactos */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 tracking-tight">{isCreating ? 'Creá tu PIN de acceso' : 'Ingresá tu PIN'}</h3>
              <p className="text-sm font-bold text-[#16A34A]">{professionals.find(p => p.id === selectedProfId)?.name}</p>
            </div>
            
            {/* PIN Dots más compactos */}
            <div className={`flex gap-4 mb-8 ${errorShake ? 'animate-custom-shake' : ''}`}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all border-2 ${i < pin.length ? (errorShake ? 'bg-red-500 border-red-500' : 'bg-[#16A34A] border-[#16A34A] scale-110') : 'bg-transparent border-gray-300'}`} />
              ))}
            </div>
            
            {/* Teclado Numérico más compacto (w-16 h-16) */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} onClick={() => handleKeyPress(num.toString())} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors mx-auto">
                  {num}
                </button>
              ))}
              <div className="col-span-1" />
              <button onClick={() => handleKeyPress("0")} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors mx-auto">0</button>
              <button onClick={handleDelete} className="w-16 h-16 flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors mx-auto active:bg-gray-100 rounded-full">
                <Delete size={24} />
              </button>
            </div>
            
            {errorShake && <p className="text-red-600 text-xs font-bold mt-4 animate-in fade-in">PIN INCORRECTO</p>}
          </div>
        </div>
      )}
    </div>
  )
}