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
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { useConfirm } from "@/hooks/use-confirm"
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
  Edit2,
  UserPlus
} from "lucide-react"

// Función auxiliar para traducir estados en ProfessionalsModule
const normalizeStatus = (s: string) => s?.toLowerCase() || '';
const getStatusText = (status: string) => {
  const norm = normalizeStatus(status);
  return { 
      scheduled: "Programado", programado: "Programado", 
      completed: "Completado", completado: "Completado", 
      cancelled: "Cancelado", cancelado: "Cancelado", 
      confirmado: "Confirmado", 
      en_atencion: "En Atención", 
      pendiente_cobro: "A Cobrar" 
  }[norm] || status;
}

export function ProfessionalsModule({ view = "atencion", professionalId }: { view?: "atencion" | "agenda" | "comisiones", professionalId?: string }) {
  const {
    currentUser,
    professionals = [],
    appointments = [],
    patients = [],
    services = [],
    products = [],
    addPatient,
    startAttention,
    finishAttention,
    fetchServices,
    fetchProducts,
    fetchAppointments,
    addAppointment,
    cancelAppointment
  } = useClinicStore()

  const activeTab = view
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  
  const [aptServices, setAptServices] = useState<Record<string, any[]>>({})
  const [aptProducts, setAptProducts] = useState<Record<string, any[]>>({})
  const [svcMenuOpen, setSvcMenuOpen] = useState<Record<string, boolean>>({})

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

  // Nuevo Paciente State (Separado)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone: "",
    email: "",
    dni: "",
    birthdate: "",
  })

  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    if (typeof fetchServices === 'function') fetchServices()
    if (typeof fetchProducts === 'function') fetchProducts()
    if (typeof fetchAppointments === 'function') fetchAppointments()
  }, [fetchServices, fetchProducts, fetchAppointments])

  const currentProfessional = professionals.find(p => p.id === (professionalId || currentUser?.professionalId))
  
  const cabinetQueue = useMemo(() => {
    return appointments.filter(a => 
      a.professionalId === currentProfessional?.id && 
      (normalizeStatus(a.status) === 'confirmado' || normalizeStatus(a.status) === 'en_atencion')
    )
  }, [appointments, currentProfessional])

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    if (!services || !currentProfessional) return grouped
    const allowedServices = services.filter(s => currentProfessional.specialties.includes(s.category))
    allowedServices.forEach((service) => {
      if (!grouped[service.category]) grouped[service.category] = []
      grouped[service.category].push(service)
    })
    return grouped
  }, [services, currentProfessional])

  const agendaAppointments = useMemo(() => {
    if (!selectedDate || !currentProfessional) return []
    return appointments.filter(a => 
      a.professionalId === currentProfessional.id &&
      new Date(a.date).toDateString() === selectedDate.toDateString()
    ).sort((a, b) => a.time.localeCompare(b.time))
  }, [appointments, currentProfessional, selectedDate])

  const salesCount = currentProfessional?.monthlySalesCount || 0
  const currentCommission = calculateCommissionTab(salesCount)
  
  const tInfo = (count: number) => {
    if (count < 10) return { next: 10, label: "5%", nextLabel: "7.5%" }
    if (count < 21) return { next: 21, label: "7.5%", nextLabel: "10%" }
    return { next: count, label: "10%", nextLabel: "MÁXIMO" }
  }
  const info = tInfo(salesCount)
  const progressValue = Math.min((salesCount / (info.next === salesCount && info.next > 0 ? info.next : info.next || 1)) * 100, 100)

  const handleFinishAttention = (aptId: string, svcs: any[], prods: any[]) => {
    confirm({
      title: "¿Finalizar Sesión?",
      description: "¿Confirmás que querés enviar este paciente a Recepción para cobrar?",
      actionType: "success",
      onConfirm: () => finishAttention(aptId, svcs, prods)
    })
  }

  const handleAddPatientSubmit = async () => {
    if (newPatientData.name && newPatientData.phone) {
      await addPatient(newPatientData)
      setNewPatientData({ name: "", phone: "", email: "", dni: "", birthdate: "" })
      setShowNewPatientDialog(false)
    }
  }

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Desconocido'

  // LÓGICA DE HORARIOS OCUPADOS SEGÚN DURACIÓN
  const availableSlots = useMemo(() => {
    if (!currentProfessional || !schedulingDate || !appointments || !services) return []
    
    const intervals = currentProfessional.exceptions?.[schedulingDate] || 
                     (currentProfessional.schedule as any)?.[new Date(schedulingDate + 'T12:00:00').toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()] || 
                     [{ start: "09:00", end: "20:00" }];
    
    const allPossibleSlots: string[] = []
    intervals.forEach((interval: any) => {
      const start = parseInt(interval.start.split(":")[0]), end = parseInt(interval.end.split(":")[0]);
      for (let h = start; h < end; h++) { 
        allPossibleSlots.push(`${h.toString().padStart(2, "0")}:00`); 
        allPossibleSlots.push(`${h.toString().padStart(2, "0")}:30`); 
      }
    })

    const dateForFilter = new Date(schedulingDate + 'T12:00:00').toDateString()
    const bookedAppointments = appointments.filter(a => 
      a.professionalId === currentProfessional.id && 
      new Date(a.date).toDateString() === dateForFilter && 
      normalizeStatus(a.status) !== "cancelado" &&
      normalizeStatus(a.status) !== "cancelled"
    )

    const blockedTimes = new Set<string>()

    bookedAppointments.forEach(apt => {
      const startTime = apt.time
      const serviceId = apt.services[0]?.serviceId
      const serviceDef = services.find(s => s.id === serviceId)
      const duration = serviceDef?.duration || 30

      const [startH, startM] = startTime.split(':').map(Number)
      const startInMinutes = startH * 60 + startM
      const endInMinutes = startInMinutes + duration

      allPossibleSlots.forEach(slot => {
        const [slotH, slotM] = slot.split(':').map(Number)
        const slotTotalM = slotH * 60 + slotM
        if (slotTotalM >= startInMinutes && slotTotalM < endInMinutes) {
          blockedTimes.add(slot)
        }
      })
    })

    return allPossibleSlots.filter(s => !blockedTimes.has(s)).sort()
  }, [currentProfessional, schedulingDate, appointments, services])

  const handleScheduleAppointment = () => {
    if (!schedulingPatientId || !currentProfessional || !schedulingService || !schedulingTime) return
    const service = services.find((s) => s.id === schedulingService)
    const finalDate = new Date(schedulingDate + 'T12:00:00')
    finalDate.setMinutes(finalDate.getMinutes() + finalDate.getTimezoneOffset())
    addAppointment({
      patientId: schedulingPatientId,
      patientName: getPatientName(schedulingPatientId),
      professionalId: currentProfessional.id,
      date: finalDate,
      time: schedulingTime,
      services: [{ serviceId: service?.id, serviceName: service?.name, price: service?.price, priceCash: (service as any)?.priceCash || service?.price }],
      products: [],
      status: Number(schedulingPaidAmount) > 0 ? "confirmado" : "programado",
      totalAmount: service?.price || 0,
      paidAmount: Number(schedulingPaidAmount) || 0,
    })
    setShowScheduleDialog(false)
    setSchedulingPatientSearch("")
    setSchedulingPatientId("")
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Hola, {currentProfessional?.shortName}!</h2>
        <Badge className="bg-[#829177] text-white border-none text-[10px] font-bold px-3">GABINETE</Badge>
      </div>

      {activeTab === "comisiones" && (
        <Card className="bg-white border border-[#16A34A]/30 overflow-hidden shadow-xl rounded-2xl">
          <CardHeader className="py-3 border-b border-[#16A34A]/30 bg-[#F0FDF4] text-center">
            <CardTitle className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center justify-center gap-2">
              <Award className="h-4 w-4 text-[#16A34A]" /> Mi Objetivo Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="flex justify-between items-center p-4 rounded-xl border border-[#16A34A]/20">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Ventas</p>
                <p className="text-4xl font-extrabold text-foreground">{salesCount}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Comisión</p>
                <Badge className="bg-[#16A34A] text-white text-lg font-bold px-4 py-1.5">{currentCommission}%</Badge>
              </div>
            </div>
            
            <div className="space-y-2 mt-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
               <div className="flex justify-between text-xs font-medium text-gray-500">
                 <span>Progreso actual</span>
                 {info.nextLabel !== "MÁXIMO" ? (
                    <span className="font-bold text-emerald-600">{salesCount} / {info.next} ventas</span>
                 ) : (
                    <span className="font-bold text-emerald-600">¡Alcanzado!</span>
                 )}
               </div>
               <Progress value={progressValue} className="h-2.5 bg-gray-200 [&>div]:bg-[#16A34A]" />
               {info.nextLabel !== "MÁXIMO" ? (
                  <p className="text-[10px] text-gray-400 text-center mt-1 uppercase tracking-wider font-bold">
                    Faltan <span className="text-orange-500">{info.next - salesCount}</span> para subir al {info.nextLabel}
                  </p>
               ) : (
                  <p className="text-[10px] text-emerald-600 text-center mt-1 uppercase tracking-wider font-bold">
                    ¡Nivel máximo de comisiones alcanzado!
                  </p>
               )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "atencion" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Clock className="h-5 w-5 text-[#16A34A]" /> Sala de Espera</h3>
          {cabinetQueue.length === 0 ? (
            <Card className="bg-transparent border-dashed border-gray-200"><CardContent className="py-10 text-center text-gray-400 italic text-sm">Sin pacientes en espera.</CardContent></Card>
          ) : (
            cabinetQueue.map(apt => (
              <Card key={apt.id} className={`bg-white border border-gray-200 shadow-lg rounded-2xl ${normalizeStatus(apt.status) === 'en_atencion' ? 'ring-2 ring-emerald-500' : ''}`}>
                <CardContent className="pt-6 space-y-4 text-foreground">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-[#16A34A] font-bold border border-[#16A34A]/20">{apt.time?.substring(0, 5)}</div>
                      <div>
                        <p className="font-bold text-lg">{apt.patientName || getPatientName(apt.patientId)}</p>
                        <p className="text-[10px] text-[#16A34A]">{typeof apt.services[0] === 'string' ? apt.services[0] : apt.services[0]?.serviceName}</p>
                      </div>
                    </div>
                    {normalizeStatus(apt.status) === 'confirmado' ? (
                      <Button onClick={() => startAttention(apt.id)} className="bg-[#16A34A] text-white font-bold">LLAMAR</Button>
                    ) : (
                      <Badge className="bg-emerald-500 text-white animate-pulse border-none px-4 py-2">ATENDIENDO</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "agenda" && (
        <div className="space-y-6">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="bg-white rounded-xl shadow-lg border p-4 mx-auto" />
          
          <div className="flex flex-col gap-2">
             <Button onClick={() => setShowNewPatientDialog(true)} className="bg-white border-2 border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 font-bold w-full h-12 shadow-sm">
                <UserPlus className="h-5 w-5 mr-2" /> REGISTRAR PACIENTE NUEVO
             </Button>
             <Button onClick={() => setShowScheduleDialog(true)} className="bg-[#16A34A] text-white hover:bg-[#15803D] font-bold w-full h-12 shadow-md">
                <Plus className="h-5 w-5 mr-2" /> AGENDAR TURNO EN MI AGENDA
             </Button>
          </div>

          <div className="space-y-3">
             <h3 className="text-sm font-bold text-foreground">Turnos del día</h3>
             {agendaAppointments.length === 0 ? <p className="text-center text-gray-400 italic text-xs py-4">Sin turnos agendados.</p> : agendaAppointments.map(apt => (
               <div key={apt.id} className="bg-white border p-3 rounded-xl flex justify-between items-center shadow-sm">
                 <span className="font-bold text-[#16A34A] text-sm">{apt.time?.substring(0, 5)}</span>
                 <div className="flex-1 px-3 border-l ml-3"><p className="font-bold text-xs text-foreground">{apt.patientName || getPatientName(apt.patientId)}</p></div>
                 <Badge className="text-[9px] bg-secondary text-gray-500 border-none font-bold tracking-wider">{getStatusText(apt.status as string).toUpperCase()}</Badge>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* DIÁLOGOS Y MODALES SE MANTIENEN IGUAL PERO CON LA LÓGICA DE DISPONIBILIDAD MEJORADA ABAJO */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="bg-white text-foreground">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Registrar Nuevo Paciente</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Apellidos y Nombres <span className="text-red-500">*</span></Label>
                <Input value={newPatientData.name} onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })} className="bg-input border-gray-200" placeholder="Ej: Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono <span className="text-red-500">*</span></Label>
                <Input value={newPatientData.phone} onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })} className="bg-input border-gray-200" placeholder="Ej: 1123456789" />
              </div>
              <div className="space-y-2">
                <Label>DNI (Opcional)</Label>
                <Input value={newPatientData.dni} onChange={(e) => setNewPatientData({ ...newPatientData, dni: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Nac. (Opcional)</Label>
                <Input type="date" value={newPatientData.birthdate} onChange={(e) => setNewPatientData({ ...newPatientData, birthdate: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Email (Opcional)</Label>
                <Input type="email" value={newPatientData.email} onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })} className="bg-input border-gray-200" />
              </div>
            </div>
            <Button onClick={handleAddPatientSubmit} className="w-full bg-[#16A34A] text-white font-bold hover:bg-[#15803D]" disabled={!newPatientData.name || !newPatientData.phone}>
              Registrar Paciente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="bg-white text-foreground sm:max-w-[450px]">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Agendar Turno Personal</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2 relative">
              <Label>Paciente</Label>
              <Input 
                 placeholder="Escribí para buscar..." 
                 value={schedulingPatientSearch} 
                 onChange={(e) => {
                    setSchedulingPatientSearch(e.target.value); 
                    setSchedulingPatientMenuOpen(e.target.value.length > 0)
                 }} 
                 className="bg-input border-gray-200" 
              />
              {schedulingPatientMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-white border shadow-xl rounded-md max-h-[150px] overflow-y-auto z-50">
                  {patients.filter(p => p.name.toLowerCase().includes(schedulingPatientSearch.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => {setSchedulingPatientId(p.id); setSchedulingPatientSearch(p.name); setSchedulingPatientMenuOpen(false)}} className="w-full text-left p-3 text-sm border-b hover:bg-emerald-50">{p.name}</button>
                  ))}
                  {patients.filter(p => p.name.toLowerCase().includes(schedulingPatientSearch.toLowerCase())).length === 0 && <p className="p-3 text-xs text-gray-400 italic">No se encontraron resultados.</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={schedulingDate} onChange={(e) => setSchedulingDate(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Horario</Label>
                <Select value={schedulingTime} onValueChange={setSchedulingTime}><SelectTrigger><SelectValue placeholder="Hora" /></SelectTrigger><SelectContent className="max-h-[150px]">{availableSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2">
               <Label>Servicio</Label>
               <Select value={schedulingService} onValueChange={setSchedulingService}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar servicio..." /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                     {services.filter(s => currentProfessional?.specialties.includes(s.category)).map(s => <SelectItem key={s.id} value={s.id}>{s.name} - ${s.price}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
            <Button onClick={handleScheduleAppointment} className="w-full bg-[#16A34A] text-white font-bold h-12" disabled={!schedulingPatientId || !schedulingService || !schedulingTime}>
               Confirmar Turno
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}