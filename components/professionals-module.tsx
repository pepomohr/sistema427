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

  // Scheduling local state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [schedulingDate, setSchedulingDate] = useState(new Date().toISOString().split("T")[0])
  const [schedulingServiceCat, setSchedulingServiceCat] = useState<string>("")
  const [schedulingService, setSchedulingService] = useState("")
  const [schedulingTime, setSchedulingTime] = useState("")
  const [schedulingPatientId, setSchedulingPatientId] = useState("")
  const [schedulingPaidAmount, setSchedulingPaidAmount] = useState<number | "">("")

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
    setShowScheduleDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#D1B98D]">Hola, {currentProfessional?.shortName}!</h2>
        <Badge className="bg-[#829177] text-white border-none text-[10px] font-bold px-3">
          {currentProfessional?.isActive ? "EN GABINETE" : "FUERA DE SERVICIO"}
        </Badge>
      </div>

      {/* SECCIÓN DE COMISIONES */}
      {activeTab === "comisiones" && (
        <Card className="bg-[#2d3529] border-[#D1B98D]/30 border-2 overflow-hidden shadow-2xl">
          <CardHeader className="pb-3 border-b border-[#D1B98D]/10 bg-[#252c22]">
            <CardTitle className="text-xs font-bold text-[#D1B98D] uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-[#D1B98D]" /> Mi Objetivo de Ventas (Mensual)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] text-white/50 uppercase font-medium">Unidades Vendidas</p>
                <p className="text-4xl font-extrabold text-white tracking-tighter">{salesCount}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-white/50 uppercase font-medium">Comisión Actual</p>
                <Badge className="bg-[#D1B98D] text-[#2d3529] text-lg font-bold px-4 py-1.5 border-none">
                  {currentCommission}%
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-medium">Progreso al siguiente nivel</span>
                {tierInfo.missing > 0 && (
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    ¡Faltan {tierInfo.missing} para el {tierInfo.label}!
                  </span>
                )}
              </div>
              <div className="relative">
                <Progress value={progressValue} className={`h-3 bg-white/10 ${tierInfo.color}`} />
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
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#D1B98D]" /> Pacientes en Sala
          </h3>

          {cabinetQueue.length === 0 ? (
            <Card className="bg-transparent border-dashed border-white/10">
              <CardContent className="py-10 text-center text-white/30 italic text-sm">
                No tienes pacientes en espera por el momento.
              </CardContent>
            </Card>
          ) : (
            cabinetQueue.map(apt => (
              <Card key={apt.id} className={`bg-card border-border ${apt.status === 'en_atencion' ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10' : ''}`}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-[#D1B98D] font-bold text-xl border border-[#D1B98D]/20">
                        {apt.time}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{getPatientName(apt.patientId)}</p>
                        <p className="text-xs text-[#D1B98D]">Recepción agendó: {apt.services[0]?.serviceName}</p>
                      </div>
                    </div>
                    
                    {apt.status === 'confirmado' ? (
                      <Button onClick={() => startAttention(apt.id)} className="bg-[#D1B98D] text-[#2d3529] font-bold">
                        <Play className="h-4 w-4 mr-2" /> LLAMAR
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500 text-white font-bold tracking-wider animate-pulse border-none">
                        ATENDIENDO
                      </Badge>
                    )}
                  </div>

                  {apt.status === 'en_atencion' && (
                    <div className="pt-4 border-t border-white/10 space-y-4">
                      
                      <div className="space-y-4 bg-black/20 p-4 rounded-lg border border-white/5">
                        
                        {/* SERVICIOS */}
                        <div>
                          <Label className="text-[10px] font-bold text-[#D1B98D] uppercase tracking-wider mb-2 block">Servicios Realizados</Label>
                          <div className="space-y-2 mb-3">
                            {getCurrentServices(apt.id).map((svc, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                <span className="text-white text-xs">{svc.serviceName}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-red-400" onClick={() => removeService(apt.id, i)}><X className="h-4 w-4"/></Button>
                              </div>
                            ))}
                            {getCurrentServices(apt.id).length === 0 && <p className="text-[10px] text-white/30 italic">Sin servicios asignados.</p>}
                          </div>
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {Object.keys(servicesByCategory).map(cat => (
                                <Badge
                                  key={cat}
                                  variant={activeSvcCat[apt.id] === cat ? "default" : "outline"}
                                  className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-[10px] ${activeSvcCat[apt.id] === cat ? 'bg-[#D1B98D] text-[#2d3529]' : 'text-white/50 border-white/10 hover:bg-white/5'}`}
                                  onClick={() => setActiveSvcCat({...activeSvcCat, [apt.id]: cat})}
                                >
                                  {getCategoryDisplayName(cat as any)}
                                </Badge>
                              ))}
                            </div>
                            {activeSvcCat[apt.id] && (
                              <Select onValueChange={(val) => { addService(apt.id, val); setActiveSvcCat({...activeSvcCat, [apt.id]: ""}); }} value="">
                                <SelectTrigger className="bg-input border-white/10 text-[#D1B98D] h-8 text-xs font-bold w-full">
                                  <SelectValue placeholder={`+ Seleccionar Servicio Especializado`} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white max-h-[250px]">
                                  {servicesByCategory[activeSvcCat[apt.id]]?.map((s: any) => <SelectItem key={`svc-${s.id}`} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        
                        {/* PRODUCTOS */}
                        <div className="border-t border-white/10 pt-3">
                          <Label className="text-[10px] font-bold text-[#D1B98D] uppercase tracking-wider mb-2 block">Productos Entregados</Label>
                          <div className="space-y-2 mb-3">
                            {getCurrentProducts(apt.id).map((prod, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                <span className="text-white text-xs">{prod.quantity}x {prod.productName}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-red-400" onClick={() => removeProduct(apt.id, prod.productId)}><X className="h-4 w-4"/></Button>
                              </div>
                            ))}
                            {getCurrentProducts(apt.id).length === 0 && <p className="text-[10px] text-white/30 italic">No llevó productos extras.</p>}
                          </div>
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {Object.keys(productsByCategory).map(cat => (
                                <Badge
                                  key={cat}
                                  variant={activeProdCat[apt.id] === cat ? "default" : "outline"}
                                  className={`cursor-pointer uppercase tracking-wider whitespace-nowrap px-2 py-0.5 text-[10px] ${activeProdCat[apt.id] === cat ? 'bg-[#D1B98D] text-[#2d3529]' : 'text-white/50 border-white/10 hover:bg-white/5'}`}
                                  onClick={() => setActiveProdCat({...activeProdCat, [apt.id]: cat})}
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                            {activeProdCat[apt.id] && (
                              <Select onValueChange={(val) => { addProduct(apt.id, val); setActiveProdCat({...activeProdCat, [apt.id]: ""}); }} value="">
                                <SelectTrigger className="bg-input border-white/10 text-[#D1B98D] h-8 text-xs font-bold w-full">
                                  <SelectValue placeholder={`+ Seleccionar Producto`} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white max-h-[250px]">
                                  {productsByCategory[activeProdCat[apt.id]]?.map((p: any) => <SelectItem key={`prod-${p.id}`} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>

                      </div>

                      <Button onClick={() => handleFinishAttention(apt.id)} className="w-full bg-[#829177] hover:bg-[#6b7a62] text-white font-bold h-12 shadow-lg">
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
          <div className="bg-card rounded-xl p-4 border border-border flex justify-center shadow-lg">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#D1B98D]" /> 
                Turnos para {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </h3>
              
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#D1B98D] hover:bg-[#b59e74] text-[#2d3529] font-bold">
                    <Plus className="h-4 w-4 mr-2" /> Agendar Turno
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle className="text-[#D1B98D]">Agendar Turno Personal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Paciente</Label>
                      <Select value={schedulingPatientId} onValueChange={setSchedulingPatientId}>
                        <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Seleccionar Paciente..." /></SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-[200px]">
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" value={schedulingDate} onChange={(e) => setSchedulingDate(e.target.value)} className="bg-input border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label>Horario</Label>
                        <Select value={schedulingTime} onValueChange={setSchedulingTime}>
                          <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Hora..." /></SelectTrigger>
                          <SelectContent className="bg-card border-border max-h-[150px]">
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
                            className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-xs ${schedulingServiceCat === cat ? 'bg-[#D1B98D] text-[#2d3529]' : 'text-white/50 border-white/10 hover:bg-white/5'}`}
                            onClick={() => { setSchedulingServiceCat(cat); setSchedulingService(""); }}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      {schedulingServiceCat && (
                        <Select value={schedulingService} onValueChange={setSchedulingService}>
                          <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Servicio..." /></SelectTrigger>
                          <SelectContent className="bg-card border-border max-h-[150px]">
                            {servicesByCategory[schedulingServiceCat]?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - ${s.price}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button onClick={handleScheduleAppointment} disabled={!schedulingPatientId || !schedulingService || !schedulingTime || !schedulingDate} className="w-full bg-[#D1B98D] text-[#2d3529] font-bold">
                      Confirmar Turno
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {agendaAppointments.length === 0 ? (
               <Card className="bg-transparent border-dashed border-white/10">
                <CardContent className="py-8 text-center text-white/30 italic text-sm">
                  No hay turnos registrados para esta fecha.
                </CardContent>
              </Card>
            ) : (
              agendaAppointments.map(apt => (
                <div key={apt.id} className="bg-secondary/40 border border-white/10 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#D1B98D] w-12">{apt.time}</span>
                    <div className="border-l border-white/10 pl-3">
                      <p className="font-bold text-white text-sm">{getPatientName(apt.patientId)}</p>
                      <p className="text-xs text-white/50">{apt.services[0]?.serviceName}</p>
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
                      badgeColor = "bg-secondary text-white/50 border-white/10";
                      badgeLabel = "ATENDIDO";
                    } else if (apt.status === 'cancelado') {
                      badgeColor = "bg-black/40 text-white/30 border-white/5 line-through";
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