"use client"

import { useState, useMemo, useEffect } from "react"
import { useClinicStore, calculateCommissionTab, getCategoryDisplayName } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Clock, 
  Award,
  Star,
  Play,
  ArrowRightCircle,
  CalendarDays,
  X,
  Plus,
  Trash2,
  Edit2
} from "lucide-react"

export function ProfessionalsModule({ view = "atencion", professionalId }: { view?: "atencion" | "agenda" | "comisiones", professionalId?: string }) {
  const {
    currentUser,
    professionals = [],
    appointments = [],
    patients = [],
    services = [],
    products = [],
    startAttention,
    finishAttention,
    fetchServices,
    fetchProducts,
    addAppointment,
    cancelAppointment
  } = useClinicStore()

  const activeTab = view
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  
  // Local state for building the final service bucket
  const [aptServices, setAptServices] = useState<Record<string, any[]>>({})
  const [aptProducts, setAptProducts] = useState<Record<string, any[]>>({})
  const [activeSvcCat, setActiveSvcCat] = useState<Record<string, string>>({})
  const [activeProdCat, setActiveProdCat] = useState<Record<string, string>>({})
  
  const [svcSearch, setSvcSearch] = useState<Record<string, string>>({})
  const [svcMenuOpen, setSvcMenuOpen] = useState<Record<string, boolean>>({})
  const [prodSearch, setProdSearch] = useState<Record<string, string>>({})
  const [prodMenuOpen, setProdMenuOpen] = useState<Record<string, boolean>>({})

  // Scheduling local state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [schedulingDate, setSchedulingDate] = useState(new Date().toISOString().split("T")[0])
  const [schedulingServiceCat, setSchedulingServiceCat] = useState<string>("")
  const [schedulingService, setSchedulingService] = useState("")
  const [schedulingTime, setSchedulingTime] = useState("")
  const [schedulingPatientId, setSchedulingPatientId] = useState("")
  const [schedulingPaidAmount, setSchedulingPaidAmount] = useState<number | "">("")
  const [schedulingPatientSearch, setSchedulingPatientSearch] = useState("")
  const [schedulingPatientMenuOpen, setSchedulingPatientMenuOpen] = useState(false)
  const [schedulingServiceSearch, setSchedulingServiceSearch] = useState("")
  const [schedulingServiceMenuOpen, setSchedulingServiceMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof fetchServices === 'function') fetchServices()
    if (typeof fetchProducts === 'function') fetchProducts()
  }, [fetchServices, fetchProducts])

  const currentProfessional = professionals.find(p => p.id === (professionalId || currentUser?.professionalId))
  
  // Gabinete filter
  const cabinetQueue = useMemo(() => {
    return appointments.filter(a => 
      a.professionalId === currentProfessional?.id && 
      (a.status === 'confirmado' || a.status === 'en_atencion')
    )
  }, [appointments, currentProfessional])

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    if (!services || !currentProfessional) return grouped
    
    // Filtro estricto por la especialidad del profesional activo
    const allowedServices = services.filter(s => currentProfessional.specialties.includes(s.category))
    
    allowedServices.forEach((service) => {
      if (!grouped[service.category]) grouped[service.category] = []
      grouped[service.category].push(service)
    })
    return grouped
  }, [services, currentProfessional])

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    if (!products) return grouped
    products.forEach((prod) => {
      if (!grouped[prod.category]) grouped[prod.category] = []
      grouped[prod.category].push(prod)
    })
    return grouped
  }, [products])

  // Agenda filter
  const agendaAppointments = useMemo(() => {
    if (!selectedDate || !currentProfessional) return []
    return appointments.filter(a => 
      a.professionalId === currentProfessional.id &&
      a.date.toDateString() === selectedDate.toDateString()
    ).sort((a, b) => a.time.localeCompare(b.time))
  }, [appointments, currentProfessional, selectedDate])

  // Progress logic
  const salesCount = currentProfessional?.monthlySalesCount || 0
  const currentCommission = calculateCommissionTab(salesCount)
  const getNextTierInfo = (count: number) => {
    if (count < 10) return { next: 10, label: "5%", missing: 10 - count, color: "bg-sky-500" }
    if (count < 21) return { next: 21, label: "7.5%", missing: 21 - count, color: "bg-emerald-500" }
    if (count < 31) return { next: 31, label: "10%", missing: 31 - count, color: "bg-amber-500" }
    return { next: count, label: "10% (Max)", missing: 0, color: "bg-amber-500" }
  }
  const tierInfo = getNextTierInfo(salesCount)
  const progressValue = tierInfo.next > 0 ? (salesCount / tierInfo.next) * 100 : 100

  // Cart Logic
  const getCurrentServices = (aptId: string) => aptServices[aptId] || appointments.find(a=>a.id===aptId)?.services || [];
  const getCurrentProducts = (aptId: string) => aptProducts[aptId] || appointments.find(a=>a.id===aptId)?.products || [];

  const addService = (aptId: string, svcId: string) => {
    const s = services.find(x => x.id === svcId);
    if(s) setAptServices({...aptServices, [aptId]: [...getCurrentServices(aptId), { serviceId: s.id, serviceName: s.name, price: s.price }]});
  }
  const removeService = (aptId: string, idx: number) => {
    const arr = [...getCurrentServices(aptId)];
    arr.splice(idx, 1);
    setAptServices({...aptServices, [aptId]: arr});
  }

  const addProduct = (aptId: string, prodId: string) => {
    const p = products.find(x => x.id === prodId);
    if(p) {
      const arr = [...getCurrentProducts(aptId)];
      const existing = arr.find(x => x.productId === p.id);
      if(existing) {
        setAptProducts({...aptProducts, [aptId]: arr.map(x => x.productId === p.id ? {...x, quantity: x.quantity + 1} : x)});
      } else {
        setAptProducts({...aptProducts, [aptId]: [...arr, { productId: p.id, productName: p.name, price: p.priceList, priceCashReference: p.priceCash, quantity: 1 }]});
      }
    }
  }
  const removeProduct = (aptId: string, prodId: string) => {
    setAptProducts({...aptProducts, [aptId]: getCurrentProducts(aptId).filter(x => x.productId !== prodId)});
  }

  const handleFinishAttention = (aptId: string) => {
    if (window.confirm("¿Confirmás que querés Finalizar la Sesión y enviar este paciente a Recepción para que le cobren?")) {
      finishAttention(aptId, getCurrentServices(aptId), getCurrentProducts(aptId));
    }
  }

  const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'Paciente Desconocido'

  const availableSlots = useMemo(() => {
    if (!currentProfessional || !schedulingDate) return []
    
    const defaultSchedule = { start: "09:00", end: "20:00" }
    const date = new Date(schedulingDate)
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
    
    const daySchedules = (currentProfessional.schedule as any)?.[dayName]
    const intervals = Array.isArray(daySchedules) ? daySchedules : (daySchedules ? [daySchedules] : [defaultSchedule])
    
    const allSlots: string[] = []
    
    intervals.forEach((interval: any) => {
      if(!interval || !interval.start || !interval.end) return;
      const startHour = parseInt(interval.start.split(":")[0])
      const endHour = parseInt(interval.end.split(":")[0])
      
      for (let h = startHour; h < endHour; h++) {
        allSlots.push(`${h.toString().padStart(2, "0")}:00`)
        allSlots.push(`${h.toString().padStart(2, "0")}:30`)
      }
    })
    
    const bookedSlots = appointments
      .filter(
        (a) =>
          a.professionalId === currentProfessional.id &&
          new Date(a.date).toDateString() === date.toDateString() &&
          a.status !== "cancelado"
      )
      .map((a) => a.time)
    
    return allSlots.filter((slot) => !bookedSlots.includes(slot)).sort()
  }, [currentProfessional, schedulingDate, appointments])

  const handleScheduleAppointment = () => {
    if (!schedulingPatientId || !currentProfessional || !schedulingService || !schedulingTime) return
    const service = services.find((s) => s.id === schedulingService)
    if (!service) return
    
    // Correct timezone adjusting for the date
    const finalDate = new Date(schedulingDate)
    // Add timezone offset to avoid previous day error
    finalDate.setMinutes(finalDate.getMinutes() + finalDate.getTimezoneOffset())
    
    addAppointment({
      patientId: schedulingPatientId,
      patientName: getPatientName(schedulingPatientId),
      professionalId: currentProfessional.id,
      date: finalDate,
      time: schedulingTime,
      services: [{ serviceId: service.id, serviceName: service.name, price: service.price, priceCash: (service as any).priceCash || service.price }],
      products: [],
      status: Number(schedulingPaidAmount) > 0 ? "confirmado" : "programado",
      totalAmount: service.price,
      paidAmount: Number(schedulingPaidAmount) || 0,
    })
    
    setSchedulingService("")
    setSchedulingTime("")
    setSchedulingPaidAmount("")
    setSchedulingPatientId("")
    setSchedulingPatientSearch("")
    setSchedulingServiceSearch("")
    setShowScheduleDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Hola, {currentProfessional?.shortName}!</h2>
        <Badge className="bg-[#829177] text-white border-none text-[10px] font-bold px-3">
          {currentProfessional?.isActive ? "EN GABINETE" : "FUERA DE SERVICIO"}
        </Badge>
      </div>

      {/* SECCIÓN DE COMISIONES */}
      {activeTab === "comisiones" && (
        <Card className="bg-white text-foreground border border-[#16A34A]/30 overflow-hidden shadow-xl rounded-2xl">
          <CardHeader className="py-3 border-b border-[#16A34A]/30 bg-[#F0FDF4] text-center">
            <CardTitle className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center justify-center gap-2">
              <Award className="h-4 w-4 text-[#16A34A]" /> Mi Objetivo de Ventas (Mensual)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#16A34A]/20">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Unidades Vendidas</p>
                <p className="text-4xl font-extrabold text-foreground tracking-tighter">{salesCount}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Comisión Actual</p>
                <Badge className="bg-[#16A34A] text-[#2d3529] text-lg font-bold px-4 py-1.5 border-none">
                  {currentCommission}%
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 font-medium">Progreso al siguiente nivel</span>
                {tierInfo.missing > 0 && (
                  <span className="text-foreground font-bold flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-green-500 fill-green-500" />
                    ¡Faltan {tierInfo.missing} para el {tierInfo.label}!
                  </span>
                )}
              </div>
              <div className="relative">
                <Progress value={progressValue} className="h-3 bg-[#DCFCE7]" />
                <div className="absolute top-0 left-[32%] h-3 w-0.5 bg-black/40"></div>
                <div className="absolute top-0 left-[67%] h-3 w-0.5 bg-black/40"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONTENIDO DE LOS TABS */}
      {activeTab === "atencion" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#16A34A]" /> Pacientes en Sala
          </h3>

          {cabinetQueue.length === 0 ? (
            <Card className="bg-transparent border-dashed border-gray-200">
              <CardContent className="py-10 text-center text-gray-400 italic text-sm">
                No tienes pacientes en espera por el momento.
              </CardContent>
            </Card>
          ) : (
            cabinetQueue.map(apt => (
              <Card key={apt.id} className={`bg-white text-foreground border border-gray-200 shadow-lg rounded-2xl transition-all ${apt.status === 'en_atencion' ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10' : ''}`}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-[#16A34A] font-bold text-xl border border-[#16A34A]/20">
                        {apt.time}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">{apt.patientName || getPatientName(apt.patientId)}</p>
                        <p className="text-xs text-[#16A34A]">Recepción agendó: {apt.services[0]?.serviceName}</p>
                      </div>
                    </div>
                    
                    {apt.status === 'confirmado' ? (
                      <Button onClick={() => startAttention(apt.id)} className="bg-[#16A34A] text-[#2d3529] font-bold hover:bg-[#15803D]">
                        <Play className="h-4 w-4 mr-2" /> LLAMAR
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500 text-white font-bold tracking-wider animate-pulse border-none">
                        ATENDIENDO
                      </Badge>
                    )}
                  </div>

                  {apt.status === 'en_atencion' && (
                    <div className="pt-4 border-t border-gray-200 space-y-4">
                      
                      <div className="space-y-4 bg-gray-100 p-4 rounded-lg border border-gray-100">
                        
                        {/* SERVICIOS */}
                        <div>
                          <Label className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider mb-2 block">Servicios Realizados</Label>
                          <div className="space-y-2 mb-3">
                            {getCurrentServices(apt.id).map((svc, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                <span className="text-foreground text-xs">{svc.serviceName}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-red-400" onClick={() => removeService(apt.id, i)}><X className="h-4 w-4"/></Button>
                              </div>
                            ))}
                            {getCurrentServices(apt.id).length === 0 && <p className="text-[10px] text-gray-400 italic">Sin servicios asignados.</p>}
                          </div>
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {Object.keys(servicesByCategory).map(cat => (
                                <Badge
                                  key={cat}
                                  variant={activeSvcCat[apt.id] === cat ? "default" : "outline"}
                                  className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-[10px] ${activeSvcCat[apt.id] === cat ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}
                                  onClick={() => setActiveSvcCat({...activeSvcCat, [apt.id]: cat})}
                                >
                                  {cat === "Corporales" ? "Corporal" : cat === "Facial" ? "Facial" : getCategoryDisplayName(cat)}
                                </Badge>
                              ))}
                            </div>
                            <div className="relative mt-2">
                              <Input
                                placeholder="+ Escribir servicio o especialidad..."
                                value={svcSearch[apt.id] || ""}
                                onChange={(e) => {
                                  setSvcSearch({...svcSearch, [apt.id]: e.target.value})
                                  setSvcMenuOpen({...svcMenuOpen, [apt.id]: true})
                                }}
                                onFocus={() => setSvcMenuOpen({...svcMenuOpen, [apt.id]: true})}
                                onBlur={() => setTimeout(() => setSvcMenuOpen({...svcMenuOpen, [apt.id]: false}), 200)}
                                className="bg-input border-gray-200 text-foreground placeholder:text-gray-400 h-8 text-xs"
                              />
                              {svcMenuOpen[apt.id] && (
                                <div className="absolute top-[35px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[250px] overflow-y-auto z-[60]">
                                  {(activeSvcCat[apt.id] ? servicesByCategory[activeSvcCat[apt.id]] : services.filter(s => currentProfessional?.specialties.includes(s.category)))
                                    ?.filter((s:any) => !(svcSearch[apt.id]) || s.name.toLowerCase().includes(svcSearch[apt.id].toLowerCase()) || s.category.toLowerCase().includes(svcSearch[apt.id].toLowerCase()))
                                    .map((s: any) => (
                                      <button
                                        key={`svc-${s.id}`}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100 flex justify-between"
                                        onClick={() => {
                                          addService(apt.id, s.id)
                                          setActiveSvcCat({...activeSvcCat, [apt.id]: ""})
                                          setSvcSearch({...svcSearch, [apt.id]: ""})
                                          setSvcMenuOpen({...svcMenuOpen, [apt.id]: false})
                                        }}
                                      >
                                        <span>{s.name} <span className="text-gray-400 text-[10px] ml-1">({s.category})</span></span>
                                        <span className="font-bold text-[#16A34A]">${s.price}</span>
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* PRODUCTOS */}
                        <div className="border-t border-gray-200 pt-3">
                          <Label className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider mb-2 block">Productos Entregados</Label>
                          <div className="space-y-2 mb-3">
                            {getCurrentProducts(apt.id).map((prod, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                <span className="text-foreground text-xs">{prod.quantity}x {prod.productName}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-red-400" onClick={() => removeProduct(apt.id, prod.productId)}><X className="h-4 w-4"/></Button>
                              </div>
                            ))}
                            {getCurrentProducts(apt.id).length === 0 && <p className="text-[10px] text-gray-400 italic">No llevó productos extras.</p>}
                          </div>
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {Object.keys(productsByCategory).map(cat => (
                                <Badge
                                  key={cat}
                                  variant={activeProdCat[apt.id] === cat ? "default" : "outline"}
                                  className={`cursor-pointer uppercase tracking-wider whitespace-nowrap px-2 py-0.5 text-[10px] ${activeProdCat[apt.id] === cat ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}
                                  onClick={() => setActiveProdCat({...activeProdCat, [apt.id]: cat})}
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                            <div className="relative mt-2">
                              <Input
                                placeholder="+ Escribir marca o producto..."
                                value={prodSearch[apt.id] || ""}
                                onChange={(e) => {
                                  setProdSearch({...prodSearch, [apt.id]: e.target.value})
                                  setProdMenuOpen({...prodMenuOpen, [apt.id]: true})
                                  
                                  // Clear active badge filter if typing to search globally
                                  if (activeProdCat[apt.id]) {
                                    setActiveProdCat({...activeProdCat, [apt.id]: ""})
                                  }
                                }}
                                onFocus={() => setProdMenuOpen({...prodMenuOpen, [apt.id]: true})}
                                onBlur={() => setTimeout(() => setProdMenuOpen({...prodMenuOpen, [apt.id]: false}), 200)}
                                className="bg-input border-gray-200 text-foreground placeholder:text-gray-400 h-8 text-xs"
                              />
                              {prodMenuOpen[apt.id] && (
                                <div className="absolute top-[35px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[250px] overflow-y-auto z-[60]">
                                  {(activeProdCat[apt.id] ? productsByCategory[activeProdCat[apt.id]] : products)
                                    ?.filter((p:any) => !(prodSearch[apt.id]) || p.name.toLowerCase().includes(prodSearch[apt.id].toLowerCase()) || p.category.toLowerCase().includes(prodSearch[apt.id].toLowerCase()))
                                    .map((p: any) => (
                                      <button
                                        key={`prod-${p.id}`}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100 flex justify-between"
                                        onClick={() => {
                                          addProduct(apt.id, p.id)
                                          setActiveProdCat({...activeProdCat, [apt.id]: ""})
                                          setProdSearch({...prodSearch, [apt.id]: ""})
                                          setProdMenuOpen({...prodMenuOpen, [apt.id]: false})
                                        }}
                                      >
                                        <span>{p.name} <span className="text-gray-400 text-[10px] ml-1">({p.category})</span></span>
                                        <span className="font-bold text-[#16A34A]">${p.priceCash}</span>
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>

                      <Button onClick={() => handleFinishAttention(apt.id)} className="w-full bg-[#829177] hover:bg-[#6b7a62] text-white font-bold h-12 shadow-lg mt-4">
                        <ArrowRightCircle className="h-5 w-5 mr-2" /> TERMINAR Y ENVIAR A COBRAR
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "agenda" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-4 border border-gray-200 flex justify-center shadow-lg">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#16A34A]" /> 
                Turnos para {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </h3>
              
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#16A34A] hover:bg-[#15803D] text-[#2d3529] font-bold">
                    <Plus className="h-4 w-4 mr-2" /> Agendar Turno
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-gray-200 text-foreground sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle className="text-[#16A34A]">Agendar Turno Personal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2 relative">
                      <Label>Paciente</Label>
                      <Input 
                        placeholder="Buscar paciente por nombre o DNI..." 
                        value={schedulingPatientSearch} 
                        onChange={(e) => {
                          setSchedulingPatientSearch(e.target.value)
                          setSchedulingPatientMenuOpen(true)
                          if(e.target.value === "") setSchedulingPatientId("")
                        }}
                        onFocus={() => setSchedulingPatientMenuOpen(true)}
                        onBlur={() => setTimeout(() => setSchedulingPatientMenuOpen(false), 200)}
                        className="bg-input border-gray-200 text-foreground placeholder:text-gray-400"
                      />
                      {schedulingPatientMenuOpen && (
                        <div className="absolute top-[68px] left-0 w-full bg-card border border-gray-200 shadow-xl rounded-md max-h-[220px] overflow-y-auto z-50">
                          {patients.filter(p => !schedulingPatientSearch || p.name.toLowerCase().includes(schedulingPatientSearch.toLowerCase()) || p.dni?.includes(schedulingPatientSearch)).map(p => (
                            <button 
                              key={p.id}
                              onClick={() => {
                                setSchedulingPatientId(p.id)
                                setSchedulingPatientSearch(p.name)
                                setSchedulingPatientMenuOpen(false)
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100"
                            >
                              <span className="font-semibold">{p.name}</span>
                              {p.dni && <span className="text-gray-400 text-xs ml-2">DNI: {p.dni}</span>}
                            </button>
                          ))}
                          {patients.filter(p => !schedulingPatientSearch || p.name.toLowerCase().includes(schedulingPatientSearch.toLowerCase()) || p.dni?.includes(schedulingPatientSearch)).length === 0 && (
                            <div className="p-3 text-sm text-gray-500 text-center italic">No se encontraron pacientes.</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" value={schedulingDate} onChange={(e) => setSchedulingDate(e.target.value)} className="bg-input border-gray-200" />
                      </div>
                      <div className="space-y-2">
                        <Label>Horario</Label>
                        <Select value={schedulingTime} onValueChange={setSchedulingTime}>
                          <SelectTrigger className="bg-input border-gray-200"><SelectValue placeholder="Hora..." /></SelectTrigger>
                          <SelectContent className="bg-card border-gray-200 max-h-[150px]">
                            {availableSlots.length > 0 ? availableSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>) : <SelectItem value="none" disabled>Sin Turnos Disponibles</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Servicio</Label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {Object.keys(servicesByCategory).map(cat => (
                          <Badge 
                            key={cat} 
                            variant={schedulingServiceCat === cat ? "default" : "outline"}
                            className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-xs ${schedulingServiceCat === cat ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}
                            onClick={() => { setSchedulingServiceCat(cat); setSchedulingService(""); }}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      {schedulingServiceCat && (
                        <div className="relative">
                          <Input 
                            placeholder="Buscar servicio específico..." 
                            value={schedulingServiceSearch} 
                            onChange={(e) => {
                              setSchedulingServiceSearch(e.target.value)
                              setSchedulingServiceMenuOpen(true)
                              if(e.target.value === "") setSchedulingService("")
                            }}
                            onFocus={() => setSchedulingServiceMenuOpen(true)}
                            onBlur={() => setTimeout(() => setSchedulingServiceMenuOpen(false), 200)}
                            className="bg-input border-gray-200 text-foreground placeholder:text-gray-400 mt-2"
                          />
                          {schedulingServiceMenuOpen && (
                            <div className="absolute top-[48px] left-0 w-full bg-card border border-gray-200 shadow-xl rounded-md max-h-[150px] overflow-y-auto z-50">
                              {servicesByCategory[schedulingServiceCat]
                                ?.filter(s => !schedulingServiceSearch || s.name.toLowerCase().includes(schedulingServiceSearch.toLowerCase()))
                                .map(s => (
                                <button 
                                  key={s.id}
                                  onClick={() => {
                                    setSchedulingService(s.id)
                                    setSchedulingServiceSearch(s.name)
                                    setSchedulingServiceMenuOpen(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100"
                                >
                                  {s.name} <span className="text-[#16A34A] ml-2 font-bold">${s.price}</span>
                                </button>
                              ))}
                              {servicesByCategory[schedulingServiceCat]?.filter(s => !schedulingServiceSearch || s.name.toLowerCase().includes(schedulingServiceSearch.toLowerCase())).length === 0 && (
                                <div className="p-3 text-sm text-gray-500 text-center italic">No hay servicios coincidentes.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button onClick={handleScheduleAppointment} disabled={!schedulingPatientId || !schedulingService || !schedulingTime || !schedulingDate} className="w-full bg-[#16A34A] text-[#2d3529] font-bold hover:bg-[#15803D]">
                      Confirmar Turno
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {agendaAppointments.length === 0 ? (
               <Card className="bg-transparent border-dashed border-gray-200">
                <CardContent className="py-8 text-center text-gray-400 italic text-sm">
                  No hay turnos registrados para esta fecha.
                </CardContent>
              </Card>
            ) : (
              agendaAppointments.map(apt => (
                <div key={apt.id} className="bg-secondary/10 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#16A34A] w-12">{apt.time}</span>
                    <div className="border-l border-gray-200 pl-3">
                      <p className="font-bold text-foreground text-sm">{apt.patientName || getPatientName(apt.patientId)}</p>
                      <p className="text-xs text-gray-500">{apt.services[0]?.serviceName}</p>
                    </div>
                  </div>
                  {(() => {
                    let badgeColor = "bg-gray-500 hover:bg-gray-600 border-none text-white";
                    let badgeLabel = apt.status.replace('_', ' ').toUpperCase();
                    
                    if (apt.status === 'programado') {
                      badgeColor = "bg-orange-600/90 text-white font-bold border-orange-600 hover:bg-orange-700 shadow-sm animate-pulse";
                      badgeLabel = "SIN SEÑA (Programado)";
                    } else if (apt.status === 'confirmado') {
                      badgeColor = "bg-emerald-500 text-white font-bold border-emerald-500 hover:bg-emerald-600 shadow-sm";
                      badgeLabel = "CONFIRMADO (Seña OK)";
                    } else if (apt.status === 'en_atencion' || apt.status === 'completado' || apt.status === 'pendiente_cobro') {
                      badgeColor = "bg-secondary text-gray-500 border-gray-200";
                      badgeLabel = "ATENDIDO";
                    } else if (apt.status === 'cancelado') {
                      badgeColor = "bg-black/40 text-gray-400 border-gray-100 line-through";
                      badgeLabel = "CANCELADO";
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.status === 'programado' || apt.status === 'confirmado' ? 'default' : 'outline'} className={`text-[9px] uppercase tracking-wider ${badgeColor}`}>
                          {badgeLabel}
                        </Badge>
                        {currentUser?.role === 'admin' && (apt.status === 'programado' || apt.status === 'confirmado') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10" 
                            onClick={() => { if(window.confirm('¿Seguro que querés cancelar este turno?')) cancelAppointment(apt.id); }}
                          >
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}