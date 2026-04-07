"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function Loader() {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    // Animación suave de 0 a 100
    const interval = setInterval(() => {
      setFill((prev) => (prev >= 100 ? 100 : prev + 1))
    }, 25) // Ajustá este número para que cargue más rápido o lento
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="relative w-72 h-72">
        {/* Capa 1: Logo de fondo (Gris transparente) */}
        <div className="absolute inset-0 grayscale opacity-10">
          <Image 
            src="/images/c427logodorado.png" 
            alt="C427 Fondo" 
            fill 
            className="object-contain" 
          />
        </div>
        
        {/* Capa 2: Logo que se llena de IZQUIERDA a DERECHA */}
        <div 
          className="absolute inset-0 overflow-hidden transition-all duration-100 ease-linear"
          style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
        >
          <Image 
            src="/images/c427logodorado.png" 
            alt="C427 Carga" 
            fill 
            className="object-contain" 
          />
        </div>
      </div>
      
      {/* Porcentaje con el dorado del logo */}
      <p className="mt-4 text-lg font-bold text-[#D4AF37] tracking-widest">
        {Math.round(fill)}%
      </p>
    </div>
  )
}