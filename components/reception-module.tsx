"use client"

import { useState, useMemo, useEffect } from "react"
import { useClinicStore, getCategoryDisplayName } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { 
  Search, 
  Plus, 
  User,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  History,
  CreditCard,
  Clock,
  ChevronRight,
  X,
  AlertCircle,
  Edit2,
  Gift,
  ShoppingBag,
  Trash2
} from "lucide-react"

export function ReceptionModule({ activeView = "pacientes" }: { activeView?: "pacientes" | "agenda" | "caja" }) {
  const {
    sales = [],
    patients = [],
    appointments = [],
    professionals = [],
    services = [],
    addPatient,
    updatePatient,
    addAppointment,
    addSale,
    searchPatients,
    fetchPatients,
    fetchServices,
    fetchProducts,
    getProfessionalsForService,
    startAttention,
    cancelAppointment,
    updateAppointment,
    updatePatientGiftCardBalance
  } = useClinicStore()

  const mainTab = activeView
  const [agendaDate, setAgendaDate] = useState<Date | undefined>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [activePanel, setActivePanel] = useState<"historial" | "agendar" | "cobrar" | "venta_directa" | null>(null)
  
  const [schedulingDate, setSchedulingDate] = useState(new Date().toISOString().split("T")[0])
  const [schedulingServiceCat, setSchedulingServiceCat] = useState<string>("")
  const [schedulingService, setSchedulingService] = useState("")
  const [schedulingProfessional, setSchedulingProfessional] = useState("")
  const [schedulingTime, setSchedulingTime] = useState("")
  const [schedulingPaidAmount, setSchedulingPaidAmount] = useState<number | "">("")
  const [checkoutAptId, setCheckoutAptId] = useState<string>("")
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "">("")
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    dni: "",
    birthdate: "",
  })

  const [showEditPatient, setShowEditPatient] = useState(false)
  const [editPatientData, setEditPatientData] = useState<any>(null)

  // Estados para Venta Directa
  const [directSaleCart, setDirectSaleCart] = useState<{product: any, quantity: number}[]>([])
  const [directSaleProf, setDirectSaleProf] = useState("")
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "">("")
  const [directSaleProdCat, setDirectSaleProdCat] = useState<string>("")

  const [searchResults, setSearchResults] = useState<any[]>([])

  // Gifl Card Loader
  const [showGiftCardLoader, setShowGiftCardLoader] = useState(false)
  const [giftCardAmount, setGiftCardAmount] = useState<number | "">("")
  const [giftCardPaymentMethod, setGiftCardPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "">("")

  // Edit Appointment
  const [editAppointmentData, setEditAppointmentData] = useState<any>(null)

  useEffect(() => {
    if (typeof fetchPatients === 'function') fetchPatients()
    if (typeof fetchServices === 'function') fetchServices()
    if (typeof fetchProducts === 'function') fetchProducts()
  }, [fetchPatients, fetchServices, fetchProducts])

  useEffect(() => {
    let active = true;

    const runSearch = async () => {
      if (!searchQuery.trim() || typeof searchPatients !== 'function') {
        if (active) setSearchResults([]);
        return;
      }
      try {
        const results = await searchPatients(searchQuery);
        if (active) setSearchResults(results);
      } catch (err) {
        console.error("Error al buscar pacientes:", err);
      }
    };
    
    const timeoutId = setTimeout(runSearch, 300);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, searchPatients])

  const handleAddPatient = async () => {
    if (newPatient.name && newPatient.phone && newPatient.dni) {
      await addPatient(newPatient)
      setNewPatient({ name: "", phone: "", email: "", dni: "", birthdate: "" })
      setShowNewPatient(false)
    }
  }

  const handleEditPatientClick = () => {
    if (selectedPatient) {
      setEditPatientData({ ...selectedPatient })
      setShowEditPatient(true)
    }
  }

  const handleUpdatePatient = async () => {
    if (editPatientData?.name && editPatientData?.phone && editPatientData?.dni) {
      await updatePatient(editPatientData.id, editPatientData)
      setSelectedPatient(editPatientData)
      setShowEditPatient(false)
    }
  }

  const handleLoadGiftCard = async () => {
    if (typeof giftCardAmount === 'number' && giftCardAmount > 0 && giftCardPaymentMethod && selectedPatient) {
      await updatePatientGiftCardBalance(selectedPatient.id, giftCardAmount);

      addSale({
        type: 'direct',
        items: [{
           type: 'product',
           itemId: 'gift-card-loader',
           itemName: '🎁 Carga Saldo a Favor',
           price: giftCardAmount,
           priceCashReference: giftCardAmount,
           quantity: 1,
           soldBy: 'recepcion'
        }],
        total: giftCardAmount,
        paymentMethod: giftCardPaymentMethod as any,
        processedBy: "Recepción",
      });

      setSelectedPatient({ ...selectedPatient, giftCardBalance: (selectedPatient.giftCardBalance || 0) + giftCardAmount });
      setShowGiftCardLoader(false);
      setGiftCardAmount("");
      setGiftCardPaymentMethod("");
    }
  };

  const todayBirthdays = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    return patients.filter(p => {
      if (!p.birthdate) return false;
      const parts = p.birthdate.split('-');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return month === currentMonth && day === currentDay;
      }
      return false;
    });
  }, [patients]);

  const getPatientHistory = (patientId: string) => {
    return (appointments || [])
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const agendaAppointments = useMemo(() => {
    if (!agendaDate || !appointments) return []
    return appointments.filter(a => {
      // Comparar sin horas
      return new Date(a.date).toDateString() === agendaDate.toDateString()
    }).sort((a, b) => a.time.localeCompare(b.time))
  }, [appointments, agendaDate])

  // --- LOGICA VENTA DIRECTA ---
  const handleAddProductToDirectSale = (productId: string) => {
    const { products } = useClinicStore.getState()
    const p = products.find(x => x.id === productId)
    if (!p) return

    setDirectSaleCart(prev => {
      const existing = prev.find(item => item.product.id === p.id)
      if (existing) {
        return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product: p, quantity: 1 }]
    })
  }

  const handleRemoveProductFromDirectSale = (productId: string) => {
    setDirectSaleCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const directSaleTotal = useMemo(() => {
    return directSaleCart.reduce((acc, item) => {
      const price = directSalePaymentMethod === 'efectivo' ? item.product.priceCash : item.product.priceList
      return acc + (price * item.quantity)
    }, 0)
  }, [directSaleCart, directSalePaymentMethod])


  // --- SOLUCIÓN AL ERROR DE UNDEFINED ---
  const availableProfessionals = useMemo(() => {
    if (!schedulingService || typeof getProfessionalsForService !== 'function') return []
    return getProfessionalsForService(schedulingService) || []
  }, [schedulingService, getProfessionalsForService])

  const availableSlots = useMemo(() => {
    if (!schedulingProfessional || !schedulingDate || !professionals) return []
    
    const professional = professionals.find((p) => p.id === schedulingProfessional)
    if (!professional) return []
    
    const defaultSchedule = { start: "09:00", end: "20:00" }
    
    const date = new Date(schedulingDate)
    // NextJS locale issues can cause "long" to return different things. "en-US" explicitly returns monday, tuesday...
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
    
    const daySchedule = (professional.schedule as any)?.[dayName] || defaultSchedule
    
    const allSlots: string[] = []
    const startHour = parseInt(daySchedule.start.split(":")[0])
    const endHour = parseInt(daySchedule.end.split(":")[0])
    
    for (let h = startHour; h < endHour; h++) {
      allSlots.push(`${h.toString().padStart(2, "0")}:00`)
      allSlots.push(`${h.toString().padStart(2, "0")}:30`)
    }
    
    const bookedSlots = (appointments || [])
      .filter(
        (a) =>
          a.professionalId === schedulingProfessional &&
          new Date(a.date).toDateString() === date.toDateString() &&
          a.status !== "cancelado"
      )
      .map((a) => a.time)
    
    return allSlots.filter((slot) => !bookedSlots.includes(slot))
  }, [schedulingProfessional, schedulingDate, professionals, appointments])

  const handleScheduleAppointment = () => {
    if (!selectedPatient || !schedulingProfessional || !schedulingService || !schedulingTime) return
    const service = services.find((s) => s.id === schedulingService)
    if (!service) return
    
    addAppointment({
      patientId: selectedPatient.id,
      professionalId: schedulingProfessional,
      date: new Date(schedulingDate),
      time: schedulingTime,
      services: [{ serviceId: service.id, serviceName: service.name, price: service.price, priceCash: (service as any).priceCash || service.price }],
      products: [],
      status: Number(schedulingPaidAmount) > 0 ? "confirmado" : "programado",
      totalAmount: service.price,
      paidAmount: Number(schedulingPaidAmount) || 0,
    })
    
    setSchedulingService("")
    setSchedulingProfessional("")
    setSchedulingTime("")
    setSchedulingPaidAmount("")
    setActivePanel(null)
  }

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    if (!services) return grouped
    
    services.forEach((service) => {
      if (!grouped[service.category]) {
        grouped[service.category] = []
      }
      grouped[service.category].push(service)
    })
    return grouped
  }, [services])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#D1B98D]">Recepción</h2>
        <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
          <DialogTrigger asChild>
            <Button className="bg-[#D1B98D] text-[#2d3529] hover:bg-[#c4a975]">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-[#D1B98D]">Registrar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Apellidos y Nombres</Label>
                  <Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>DNI</Label>
                  <Input value={newPatient.dni} onChange={(e) => setNewPatient({ ...newPatient, dni: e.target.value })} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Nac.</Label>
                  <Input type="date" value={newPatient.birthdate} onChange={(e) => setNewPatient({ ...newPatient, birthdate: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Email (Opcional)</Label>
                  <Input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} className="bg-input border-border" />
                </div>
              </div>
              <Button onClick={handleAddPatient} className="w-full bg-[#D1B98D] text-[#2d3529] font-bold" disabled={!newPatient.name || !newPatient.phone || !newPatient.dni}>
                Registrar Paciente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-6">
        {/* Contenido Principal */}
        <div className="w-full overflow-hidden">
          {mainTab === "pacientes" && (
        <>
      {todayBirthdays.length > 0 && !selectedPatient && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-500 flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 animate-bounce" /> ¡Cumpleañeros de Hoy!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {todayBirthdays.map(p => (
                <Badge 
                  key={p.id} 
                  className="bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/40 px-3 py-1 text-sm font-semibold cursor-pointer transition-colors" 
                  onClick={() => { setSelectedPatient(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  🎉 {p.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-amber-500/70 mt-3 italic">Hacé clic en ellos para ver su ficha. Recordá aplicarles el descuento o entregarles el detallito de cortesía en gabinete.</p>
          </CardContent>
        </Card>
      )}

      {/* GIFT CARD LOADER DIALOG */}
      {showGiftCardLoader && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-background border-[#D1B98D]/30 shadow-2xl">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[#D1B98D]">
                  <Gift className="h-5 w-5" /> 
                  Acreditar Saldo a Favor (Gift Card)
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <Label>Monto Ingresado ($)</Label>
                 <Input 
                   type="number" 
                   value={giftCardAmount} 
                   onChange={(e) => setGiftCardAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                   className="bg-input"
                   placeholder="Ej: 50000"
                 />
               </div>
               <div>
                  <Label>Medio de Pago Abastecedor</Label>
                  <Select value={giftCardPaymentMethod} onValueChange={(val: any) => setGiftCardPaymentMethod(val)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="¿Cómo lo abonó el cliente?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                      <SelectItem value="tarjeta">💳 Tarjeta (Débito/Crédito)</SelectItem>
                      <SelectItem value="qr">📱 Código QR</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               
               <div className="flex justify-end gap-2 pt-4">
                 <Button variant="ghost" onClick={() => setShowGiftCardLoader(false)}>Cancelar</Button>
                 <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLoadGiftCard} disabled={!giftCardAmount || !giftCardPaymentMethod}>
                   Confirmar Ingreso a Caja
                 </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT PATIENT DIALOG */}
      <Card className="bg-card border-border border-2 border-[#D1B98D]/30">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-[#D1B98D]" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedPatient(null)
              }}
              placeholder="Buscar por nombre o DNI..."
              className="pl-14 h-14 text-lg bg-input border-border"
            />
          </div>
          
          {searchResults.length > 0 && !selectedPatient && (
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.map((patient) => (
                <div key={patient.id} className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer flex items-center justify-between" onClick={() => setSelectedPatient(patient)}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#D1B98D]/20 flex items-center justify-center"><User className="h-6 w-6 text-[#D1B98D]" /></div>
                    <div>
                      <p className="font-medium text-lg">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">DNI: {patient.dni}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[#D1B98D]/20 flex items-center justify-center"><User className="h-7 w-7 text-[#D1B98D]" /></div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {selectedPatient.name}
                    {(selectedPatient.giftCardBalance || 0) > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
                        Saldo a Favor: ${selectedPatient.giftCardBalance.toLocaleString()}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">DNI: {selectedPatient.dni} | Tel: {selectedPatient.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowGiftCardLoader(true)} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                  <Gift className="h-4 w-4 mr-2" /> Cargar Saldo a Favor
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditPatientClick} className="border-[#D1B98D]/30 text-[#D1B98D] hover:bg-[#D1B98D]/10">
                  <Edit2 className="h-4 w-4 mr-2" /> Editar Info
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}><X className="h-5 w-5" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Button variant={activePanel === "historial" ? "default" : "outline"} className="h-20 flex-col gap-2" onClick={() => setActivePanel("historial")}>
                <History className="h-6 w-6" /> Historial
              </Button>
              <Button variant={activePanel === "agendar" ? "default" : "outline"} className="h-20 flex-col gap-2" onClick={() => setActivePanel("agendar")}>
                <CalendarIcon className="h-6 w-6" /> Agendar
              </Button>
              <Button variant={activePanel === "cobrar" ? "default" : "outline"} className="h-20 flex-col gap-2" onClick={() => setActivePanel("cobrar")}>
                <CreditCard className="h-6 w-6" /> Cobrar Turno
              </Button>
              <Button variant={activePanel === "venta_directa" ? "default" : "outline"} className="h-20 flex-col gap-2" onClick={() => setActivePanel("venta_directa")}>
                <ShoppingBag className="h-6 w-6" /> Vender Producto
              </Button>
            </div>

            {activePanel === "historial" && (
              <div className="space-y-4 pt-4 border-t border-border">
                {getPatientHistory(selectedPatient.id).length === 0 ? (
                  <p className="text-sm text-white/50 italic text-center py-4">No hay turnos registrados para este paciente.</p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {getPatientHistory(selectedPatient.id).map(apt => {
                      const prof = professionals.find(p => p.id === apt.professionalId);
                      return (
                        <Card key={apt.id} className="bg-secondary/30 border-white/5">
                          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] ${apt.status === 'completado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{apt.status}</Badge>
                                  <span className="text-white/50 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time}</span>
                               </div>
                               <p className="font-bold text-white">{apt.services.map((s:any) => s.serviceName).join(', ')}</p>
                               <p className="text-sm text-[#D1B98D]">con {prof?.name || 'Profesional no encontrado'}</p>
                            </div>
                            {['programado', 'confirmado'].includes(apt.status) && (
                               <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                 <Button variant="outline" size="sm" onClick={() => setEditAppointmentData(apt)} className="flex-1 sm:flex-none border-blue-500/50 text-blue-400 hover:bg-blue-500/10">Reprogramar</Button>
                                 <Button variant="outline" size="sm" onClick={() => { if(window.confirm('¿Seguro que querés cancelar este turno?')) cancelAppointment(apt.id); }} className="flex-1 sm:flex-none border-red-500/50 text-red-400 hover:bg-red-500/10">Cancelar</Button>
                               </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activePanel === "agendar" && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={schedulingDate} onChange={(e) => setSchedulingDate(e.target.value)} className="bg-input" />
                  </div>
                  <div className="space-y-3">
                    <Label>Servicio</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {Object.keys(servicesByCategory).map(cat => (
                        <Badge 
                          key={cat} 
                          variant={schedulingServiceCat === cat ? "default" : "outline"}
                          className={`cursor-pointer whitespace-nowrap px-3 py-1.5 ${schedulingServiceCat === cat ? 'bg-[#D1B98D] text-[#2d3529]' : 'text-white/70 border-white/20 hover:bg-white/5'}`}
                          onClick={() => { setSchedulingServiceCat(cat); setSchedulingService(""); }}
                        >
                          {getCategoryDisplayName(cat as any)}
                        </Badge>
                      ))}
                    </div>
                    {schedulingServiceCat && (
                      <Select value={schedulingService} onValueChange={setSchedulingService}>
                        <SelectTrigger className="bg-input border-white/10"><SelectValue placeholder="Seleccionar servicio específico..." /></SelectTrigger>
                        <SelectContent className="bg-card border-white/10 max-h-[300px]">
                          {servicesByCategory[schedulingServiceCat]?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} - ${s.price}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {schedulingService && (
                  <div className="space-y-2">
                    <Label className="flex justify-between">
                      Profesional
                      <Badge variant="outline" className="text-xs">{(availableProfessionals?.length || 0)} disponibles</Badge>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableProfessionals?.map((prof: any) => (
                        <button
                          key={prof.id}
                          onClick={() => setSchedulingProfessional(prof.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${schedulingProfessional === prof.id ? "border-[#829177] bg-[#829177]/10" : "border-border"}`}
                        >
                          <span className="text-sm font-medium">{prof.shortName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {schedulingProfessional && availableSlots.length > 0 && (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(slot => (
                        <Button key={slot} variant={schedulingTime === slot ? "default" : "outline"} size="sm" onClick={() => setSchedulingTime(slot)}>
                          {slot}
                        </Button>
                      ))}
                    </div>
                    {schedulingTime && (
                      <div className="space-y-2 mt-4">
                        <Label>Seña Abonada ($) - Opcional</Label>
                        <Input 
                          type="number" 
                          placeholder="Ej: 2000"
                          value={schedulingPaidAmount} 
                          onChange={(e) => setSchedulingPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                          className="bg-input" 
                        />
                      </div>
                    )}
                  </>
                )}

                {schedulingTime && (
                  <Button onClick={handleScheduleAppointment} className="w-full bg-[#D1B98D] text-[#2d3529]">
                    Confirmar Turno
                  </Button>
                )}
              </div>
            )}

            {activePanel === "cobrar" && (
              <div className="space-y-6 pt-4 border-t border-border">
                {!checkoutAptId ? (
                  <div className="space-y-4">
                    <Label className="text-[#D1B98D] uppercase text-xs font-bold tracking-wider">Punto de Venta Unificado</Label>
                    
                    <Button onClick={() => setCheckoutAptId("direct")} className="w-full bg-[#D1B98D]/10 hover:bg-[#D1B98D]/20 text-[#D1B98D] font-bold h-12 shadow-md">
                      + Venta Libre / Standalone
                    </Button>

                    {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro'].includes(a.status)).length === 0 ? (
                       <p className="text-sm text-white/50 italic text-center py-4 rounded bg-black/10 mt-2">No hay turnos pendientes para cobrar.</p>
                    ) : (
                      <div className="space-y-2 mt-4">
                        <Label className="text-xs text-white/50 uppercase block mb-2">Turnos Pendientes:</Label>
                        {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro'].includes(a.status)).map(apt => {
                           const prof = professionals.find(p => p.id === apt.professionalId);
                           return (
                             <div key={apt.id} className="p-4 bg-secondary/30 rounded-xl border border-white/5 flex justify-between items-center cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setCheckoutAptId(apt.id)}>
                               <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px]">{apt.status}</Badge>
                                    <span className="text-white/50 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time}</span>
                                 </div>
                                 <p className="font-bold text-white">{apt.services.map((s:any) => s.serviceName).join(', ')}</p>
                                 {apt.products && apt.products.length > 0 && <p className="text-xs text-[#D1B98D] mt-1">+ {apt.products.length} productos extras</p>}
                               </div>
                               <div className="text-right">
                                  {apt.paidAmount > 0 ? <Badge className="bg-emerald-500/20 text-emerald-400 border-none mb-1 text-[9px]">Seña: ${apt.paidAmount}</Badge> : null}
                                  <Button variant="ghost" size="sm" className="bg-[#D1B98D]/10 text-[#D1B98D] hover:bg-[#D1B98D]/20">Abrir Cuenta</Button>
                               </div>
                             </div>
                           )
                        })}
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const apt = checkoutAptId !== "direct" ? appointments.find(a => a.id === checkoutAptId) : null;
                  
                  // Calculamos los totales según medio de pago
                  let subtotalList = 0;
                  let subtotalCash = 0;
                  
                  if (apt) {
                    apt.services.forEach((s: any) => {
                      subtotalList += s.price;
                      subtotalCash += (s.priceCash || s.price);
                    });
                    
                    apt.products?.forEach((p: any) => {
                      subtotalList += (p.price * p.quantity);
                      subtotalCash += ((p.priceCashReference || p.price) * p.quantity);
                    });
                  }
                  
                  // Productos anexados al carrito en mostrador
                  directSaleCart.forEach((item) => {
                    subtotalList += (item.product.priceList * item.quantity);
                    subtotalCash += (item.product.priceCash * item.quantity);
                  });
                  
                  const chosenTotalOriginal = checkoutPaymentMethod === 'efectivo' ? subtotalCash : subtotalList;
                  const finalToPay = Math.max(0, chosenTotalOriginal - (apt?.paidAmount || 0));
                  
                  const canConfirm = checkoutPaymentMethod && 
                                     ((apt !== null) || (apt === null && directSaleCart.length > 0 && directSaleProf));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                           <span className="text-sm font-semibold">{apt ? 'Facturación de Turno + Mostrador' : 'Venta Libre'}</span>
                           <Button variant="ghost" size="sm" onClick={() => {setCheckoutAptId(""); setCheckoutPaymentMethod(""); setDirectSaleCart([]); setDirectSaleProf("");}} className="h-6 px-2 text-xs text-white/50 hover:text-white">Cambiar Selección</Button>
                         </div>
                         
                         <div className="space-y-2 text-sm bg-black/10 p-3 rounded">
                           {apt?.services.map((s:any, i:number) => (
                             <div key={i} className="flex justify-between text-white/80">
                               <span>{s.serviceName}</span>
                               <span>${checkoutPaymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price}</span>
                             </div>
                           ))}
                           {apt?.products?.map((p:any, i:number) => (
                             <div key={i} className="flex justify-between text-white/80 text-xs italic">
                               <span>{p.quantity}x {p.productName} (Gabinete)</span>
                               <span>${(checkoutPaymentMethod === 'efectivo' ? (p.priceCashReference || p.price) : p.price) * p.quantity}</span>
                             </div>
                           ))}
                           
                           {/* Carrito Directo Items */}
                           {directSaleCart.map((item, i) => (
                             <div key={`ds-${i}`} className="flex justify-between items-center text-[#D1B98D] text-xs font-bold leading-none py-1.5 border-t border-white/5 mt-1">
                               <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-500 hover:bg-transparent hover:scale-125" onClick={() => handleRemoveProductFromDirectSale(item.product.id)}>✕</Button>
                                  <span>{item.quantity}x {item.product.name} (Extra)</span>
                               </div>
                               <span>${(checkoutPaymentMethod === 'efectivo' ? item.product.priceCash : item.product.priceList) * item.quantity}</span>
                             </div>
                           ))}

                           {/* Resumen numérico */}
                           <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white mt-2">
                             <span>Subtotal:</span>
                             <span>${chosenTotalOriginal}</span>
                           </div>
                           {(apt?.paidAmount || 0) > 0 && (
                             <div className="flex justify-between font-bold text-emerald-400">
                               <span>Seña ya abonada:</span>
                               <span>- ${apt?.paidAmount}</span>
                             </div>
                           )}
                         </div>

                         {/* Agregador de Productos y Vendedor si corresponde */}
                         <div className="space-y-3 pt-2">
                            <div className="bg-secondary/40 p-3 rounded-lg border border-dashed border-white/10 space-y-2">
                              <Label className="text-xs font-bold text-white/70 block">+ Agregar Producto Extra</Label>
                              <Select onValueChange={(val) => { handleAddProductToDirectSale(val); }}>
                                <SelectTrigger className="w-full text-xs bg-input border-white/10 h-9">
                                  <SelectValue placeholder="Elegir producto..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white max-h-[250px]">
                                  {Array.from(new Set(useClinicStore.getState().products.map(p => p.category))).map(cat => (
                                      <div key={cat} className="space-y-1 mt-1">
                                          <div className="px-2 py-1 text-[10px] font-bold text-[#D1B98D] uppercase tracking-wider bg-white/5">{cat}</div>
                                          {useClinicStore.getState().products.filter(p => p.category === cat).map(p => (
                                              <SelectItem key={p.id} value={p.id} className="text-xs pl-4">{p.name}</SelectItem>
                                          ))}
                                      </div>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Solo si hay productos extras anexados pedimos el comisionador */}
                            {directSaleCart.length > 0 && (
                               <div className="bg-secondary/20 p-3 rounded-lg border border-white/5 space-y-2">
                                  <Label className="text-xs text-white/70">¿Quién vendió el Producto Extra?</Label>
                                  <Select value={directSaleProf} onValueChange={setDirectSaleProf}>
                                    <SelectTrigger className="bg-input border-white/10 h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent className="bg-card border-white/10">
                                      <SelectItem value="recepcion">🏦 Recepción (Sin comisión prof.)</SelectItem>
                                      {professionals.filter(p => p.isActive).map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.shortName}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                               </div>
                            )}
                         </div>
                         
                         <div className="pt-2 flex flex-col gap-2 relative z-10">
                           <Label>Medio de Pago del Saldo Restante</Label>
                           <Select value={checkoutPaymentMethod} onValueChange={(val: any) => setCheckoutPaymentMethod(val)}>
                             <SelectTrigger className="bg-input border-[#D1B98D]/30 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                             <SelectContent className="bg-card border-white/10 z-[100]">
                               <SelectItem value="efectivo">💵 Efectivo (Promo)</SelectItem>
                               <SelectItem value="transferencia">🏦 Transferencia (Lista)</SelectItem>
                               <SelectItem value="tarjeta">💳 Tarjeta (Lista)</SelectItem>
                               <SelectItem value="qr">📱 Código QR (Lista)</SelectItem>
                               <SelectItem 
                                 value="gift_card"
                                 disabled={!selectedPatient?.giftCardBalance || selectedPatient.giftCardBalance < finalToPay}
                               >
                                 🎁 Gift Card (Saldo Disp: ${(selectedPatient?.giftCardBalance || 0).toLocaleString()})
                               </SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                      </div>
                      
                      <div className="bg-[#2d3529] p-6 rounded-xl border border-[#D1B98D]/20 flex flex-col justify-between h-full">
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-white/50 uppercase tracking-widest">Saldo Restante a Pagar</p>
                          <p className="text-5xl font-extrabold text-[#D1B98D]">${finalToPay.toLocaleString()}</p>
                          {!checkoutPaymentMethod ? (
                             <p className="text-xs text-amber-500/70 mt-2">▲ Faltan datos (Medio de pago o Vendedor)</p>
                          ) : (
                             <p className="text-[10px] text-white/40 italic mt-2">
                               {checkoutPaymentMethod === 'efectivo' ? 'Precio promocional efectivo totalizado.' : 'Precio de lista regular totalizado.'}
                             </p>
                          )}
                        </div>
                        <Button 
                          className="w-full bg-[#829177] hover:bg-[#6b7a62] h-14 text-white font-bold mt-6 shadow-lg text-lg" 
                          disabled={!canConfirm}
                          onClick={() => {
                            if (apt) {
                               if (typeof useClinicStore.getState().completeAppointment === 'function') {
                                  (useClinicStore.getState() as any).completeAppointment(checkoutAptId, checkoutPaymentMethod as any, finalToPay, directSaleCart, directSaleProf || "recepcion");
                               }
                            } else {
                               // Sale stand-alone creation
                               addSale({
                                 type: 'direct',
                                 items: directSaleCart.map(i => ({
                                   type: 'product',
                                   itemId: i.product.id,
                                   itemName: i.product.name,
                                   price: checkoutPaymentMethod === 'efectivo' ? i.product.priceCash : i.product.priceList,
                                   priceCashReference: i.product.priceCash,
                                   quantity: i.quantity,
                                   soldBy: directSaleProf || "recepcion"
                                 })),
                                 total: finalToPay,
                                 paymentMethod: checkoutPaymentMethod as any,
                                 processedBy: "Recepción"
                               })
                            }

                            // Limpiar y resetear vista
                            setCheckoutAptId("");
                            setCheckoutPaymentMethod("");
                            setDirectSaleCart([]);
                            setDirectSaleProf("");
                            setActivePanel("historial");
                          }}
                        >
                          Confirmar Cobro
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[#D1B98D]">Editar Información del Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Apellidos y Nombres</Label>
                <Input value={editPatientData?.name || ""} onChange={(e) => setEditPatientData({ ...editPatientData, name: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input value={editPatientData?.dni || ""} onChange={(e) => setEditPatientData({ ...editPatientData, dni: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Nac.</Label>
                <Input type="date" value={editPatientData?.birthdate || ""} onChange={(e) => setEditPatientData({ ...editPatientData, birthdate: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editPatientData?.phone || ""} onChange={(e) => setEditPatientData({ ...editPatientData, phone: e.target.value })} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editPatientData?.email || ""} onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })} className="bg-input border-border" />
              </div>
            </div>
            <Button onClick={handleUpdatePatient} className="w-full bg-[#D1B98D] text-[#2d3529] font-bold" disabled={!editPatientData?.name || !editPatientData?.phone || !editPatientData?.dni}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
          )}

          {mainTab === "agenda" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="bg-card rounded-xl p-4 border border-border flex justify-center shadow-lg sticky top-6">
              <Calendar
                mode="single"
                selected={agendaDate}
                onSelect={setAgendaDate}
                className="rounded-md"
              />
            </div>
          </div>
          
          <div className="col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-[#D1B98D] flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> 
              Agenda del {agendaDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>

            {agendaAppointments.length === 0 ? (
              <Card className="bg-transparent border-dashed border-white/10">
                <CardContent className="py-12 text-center text-white/30 italic text-sm">
                  No hay turnos registrados para este día.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {agendaAppointments.map(apt => {
                  const prof = professionals.find(p => p.id === apt.professionalId);
                  const pat = patients.find(p => p.id === apt.patientId);
                  const isAttended = apt.status === 'en_atencion' || apt.status === 'completado' || apt.status === 'pendiente_cobro';
                  
                  return (
                    <div 
                      key={apt.id} 
                      className={`relative bg-secondary/40 border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                        isAttended ? 'opacity-50 grayscale border-white/5' : 'border-white/10 hover:border-[#D1B98D]/30'
                      }`}
                    >
                      {/* Tachado Overlay if attended */}
                      {isAttended && <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20 -translate-y-1/2 rounded-full pointer-events-none z-10"></div>}
                      
                      <div className="flex items-center gap-4 z-0">
                        <div className="flex flex-col items-center justify-center p-3 bg-black/20 rounded-lg min-w-[70px]">
                          <span className={`font-bold text-lg ${isAttended ? 'text-white/50' : 'text-[#D1B98D]'}`}>{apt.time}</span>
                        </div>
                        
                        <div className="space-y-1 z-0">
                          <p className={`font-bold text-lg ${isAttended ? 'text-white/50' : 'text-white'}`}>
                            {pat?.name || 'Desconocido'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-white/70">Prof: <span className="font-semibold">{prof?.shortName || '-'}</span></span>
                            <span className="text-white/30">•</span>
                            <span className="text-[#D1B98D] max-w-[150px] truncate">{apt.services[0]?.serviceName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full md:w-auto gap-4 z-0">
                        <div className="flex flex-col items-end gap-1">
                          {(() => {
                            if (isAttended) {
                              return <Badge className="bg-secondary text-white/50 border-white/10 text-[10px] uppercase">Ya Asistió</Badge>;
                            }
                            if (apt.status === 'programado') {
                              return <Badge className="bg-orange-600/90 text-white font-bold text-[10px] uppercase">Sin Seña</Badge>;
                            }
                            if (apt.status === 'confirmado') {
                              return <Badge className="bg-emerald-500 text-white font-bold text-[10px] uppercase">Seña OK</Badge>;
                            }
                            if (apt.status === 'cancelado') {
                              return <Badge className="bg-red-500/50 text-white text-[10px] uppercase">Cancelado</Badge>;
                            }
                            return <Badge variant="outline">{apt.status}</Badge>;
                          })()}
                        </div>
                        
                        {!isAttended && apt.status !== 'cancelado' && (
                          <Button 
                            onClick={() => startAttention(apt.id)}
                            className="bg-[#D1B98D] hover:bg-[#c4a975] text-[#2d3529] font-bold h-10 w-10 p-0 rounded-full flex-shrink-0 shadow-lg"
                            title="Marcar como Atendido / Llegó"
                          >
                            ✓
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </div>
          )}

          {mainTab === "caja" && (() => {
            const today = new Date().toDateString();
            const todaysSales = sales.filter((s) => s.date.toDateString() === today);
            
            let totalIncome = 0;
            const byMethod: Record<string, number> = { efectivo: 0, transferencia: 0, tarjeta: 0, qr: 0, gift_card: 0 };
            
            todaysSales.forEach(s => {
              if (s.paymentMethod !== 'gift_card') {
                 totalIncome += s.total;
              }
              if (byMethod[s.paymentMethod] !== undefined) {
                 byMethod[s.paymentMethod] += s.total;
              } else {
                 byMethod[s.paymentMethod] = s.total;
              }
            });

            return (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-[#D1B98D] flex items-center gap-2 text-2xl">
                    Cierre de Caja Diario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-[#2d3529] p-6 rounded-xl border border-[#D1B98D]/20 text-center">
                    <p className="text-sm text-white/50 uppercase tracking-widest mb-2">Ingresos Totales (Dinero Real)</p>
                    <p className="text-5xl font-extrabold text-[#D1B98D]">${totalIncome.toLocaleString()}</p>
                    <p className="text-xs text-amber-500/70 mt-2">No incluye pagos realizados con Gift Cards (ya se cobraron al ser adquiridas).</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-secondary/40 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-xs text-white/50 uppercase mb-1">Efectivo</p>
                       <p className="text-xl font-bold text-white">${byMethod.efectivo.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/40 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-xs text-white/50 uppercase mb-1">Transferencia</p>
                       <p className="text-xl font-bold text-white">${byMethod.transferencia.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/40 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-xs text-white/50 uppercase mb-1">Tarjeta (Déb/Créd)</p>
                       <p className="text-xl font-bold text-white">${byMethod.tarjeta.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/40 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-xs text-white/50 uppercase mb-1">Código QR</p>
                       <p className="text-xl font-bold text-white">${byMethod.qr.toLocaleString()}</p>
                    </div>
                  </div>

                  {byMethod.gift_card > 0 && (
                    <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-xl flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-emerald-400 font-bold text-sm">Crédito de Gift Cards consumido hoy:</span>
                       </div>
                       <span className="text-emerald-400 font-bold">${byMethod.gift_card.toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  )
}