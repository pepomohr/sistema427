"use client"

import { useState } from "react"
import { useClinicStore } from "@/lib/store"
import { ArrowLeft, Delete } from "lucide-react"
import Image from "next/image"

interface ProfessionalSelectScreenProps {
  onSelect: (id: string) => void
  onBack: () => void
}

export function ProfessionalSelectScreen({ onSelect, onBack }: ProfessionalSelectScreenProps) {
  const { professionals = [] } = useClinicStore()

  const [selectedProfId, setSelectedProfId] = useState<string | null>(null)
  
  // Pin entry state
  const [pin, setPin] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [errorShake, setErrorShake] = useState(false)

  // Handlers
  const handleProfClick = (id: string) => {
    setSelectedProfId(id)
    setPin("")
    setErrorShake(false)
    const existingPin = localStorage.getItem(`c427_pins_${id}`)
    setIsCreating(!existingPin)
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return
    const newPin = pin + num
    setPin(newPin)
    
    if (newPin.length === 4) {
      setTimeout(() => validatePin(newPin), 150)
    }
  }

  const validatePin = (enteredPin: string) => {
    if (!selectedProfId) return
    
    if (isCreating) {
      localStorage.setItem(`c427_pins_${selectedProfId}`, enteredPin)
      onSelect(selectedProfId)
    } else {
      const existingPin = localStorage.getItem(`c427_pins_${selectedProfId}`)
      if (enteredPin === existingPin) {
        onSelect(selectedProfId)
      } else {
        setErrorShake(true)
        setTimeout(() => {
          setPin("")
          setErrorShake(false)
        }, 700)
      }
    }
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
        .animate-custom-shake {
          animation: custom-shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}} />

      <div className="w-full relative py-6">
        <button 
          onClick={onBack}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={28} />
        </button>

        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-wider">CUERPO PROFESIONAL</h2>
          <p className="text-muted-foreground text-sm mt-1">Seleccioná tu perfil para acceder a la agenda</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-12">
          {professionals.map(prof => (
            <button
              key={prof.id}
              onClick={() => handleProfClick(prof.id)}
              className="group flex flex-col items-center gap-4 transition-transform hover:scale-105 outline-none"
            >
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4 border-transparent shadow-md group-hover:shadow-xl transition-all"
                style={{ backgroundColor: prof.color || '#16A34A' }}
              >
                {prof.avatar ? (
                  <img src={prof.avatar} alt={prof.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white tracking-widest drop-shadow-sm">
                    {prof.shortName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-semibold text-base text-gray-700 group-hover:text-primary transition-colors">
                {prof.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedProfId && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedProfId(null)}
            className="absolute top-6 sm:top-8 left-4 sm:left-8 text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <ArrowLeft size={32} />
          </button>
          
          <div className="flex flex-col items-center max-w-[320px] w-full px-4 relative z-10">
            {/* Logo en el flujo, más grande y un poco más abajo */}
            <div className="relative w-[280px] h-[95px] sm:w-[320px] sm:h-[105px] mt-6 sm:mt-10 mb-6 pointer-events-none">
              <Image 
                src="/images/c427logodorado.png"
                alt="C427 Logo"
                fill
                priority
                className="object-contain drop-shadow-sm scale-[1.25] sm:scale-[1.3]"
              />
            </div>
            
            <div className="text-center space-y-2 mb-10 w-full relative">
              <h3 className="text-xl font-medium tracking-tight text-gray-800">
                {isCreating ? 'Creá tu PIN de acceso' : 'Ingresá tu PIN'}
              </h3>
              <p className="text-sm font-semibold text-primary">
                {professionals.find(p => p.id === selectedProfId)?.name}
              </p>
            </div>
            
            {/* PIN Dots */}
            <div className={`flex gap-5 mb-12 ${errorShake ? 'animate-custom-shake' : ''}`}>
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    i < pin.length 
                      ? errorShake ? 'bg-red-500 border-red-500' : 'bg-primary border-primary scale-110' 
                      : 'bg-transparent border-gray-300'
                  }`}
                />
              ))}
            </div>
            
            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  disabled={pin.length >= 4}
                  onClick={() => handleKeyPress(num.toString())}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors mx-auto"
                >
                  {num}
                </button>
              ))}
              <div className="col-span-1" />
              <button
                disabled={pin.length >= 4}
                onClick={() => handleKeyPress("0")}
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors mx-auto"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="w-20 h-20 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors mx-auto active:bg-gray-100 rounded-full"
              >
                <Delete size={28} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="h-12 mt-4 flex items-center justify-center">
               {errorShake && (
                 <div className="bg-red-500/10 border border-red-400/40 rounded-xl px-6 py-2.5 animate-in fade-in">
                   <p className="text-red-600 text-sm font-semibold text-center">Contraseña incorrecta, volvé a intentarlo</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}