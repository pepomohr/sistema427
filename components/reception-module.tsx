"use client"

import { useState, useMemo, useEffect } from "react"
import { useClinicStore, getCategoryDisplayName } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Trash2,
  Award,
  Star
} from "lucide-react"

export function ReceptionModule({ activeView = "pacientes" }: { activeView?: "pacientes" | "agenda" | "caja" | "comisiones" }) {
  const {
    sales = [],
    patients = [],
    appointments = [],
    professionals = [],
    services = [],
    products = [],
    offers = [],
    combos = [],
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
  const [schedulingServiceSearch, setSchedulingServiceSearch] = useState("")
  const [schedulingServiceMenuOpen, setSchedulingServiceMenuOpen] = useState(false)
  
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
  const [directSaleCart, setDirectSaleCart] = useState<{product: any, quantity: number, type: 'product'|'combo'}[]>([])
  const [directSaleProf, setDirectSaleProf] = useState("")
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "">("")
  const [directSaleOfferId, setDirectSaleOfferId] = useState<string>("")
  const [checkoutOfferId, setCheckoutOfferId] = useState<string>("")
  const [directSaleProdCat, setDirectSaleProdCat] = useState<string>("")
  const [directSaleProdSearch, setDirectSaleProdSearch] = useState("")
  const [directSaleProdMenuOpen, setDirectSaleProdMenuOpen] = useState(false)

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

  const generatePDF = async () => {
    if (typeof window === 'undefined') return;

    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const applyAutoTable: any = autoTableModule.default || autoTableModule;

      const doc = new jsPDF()
      const dateFormatted = agendaDate ? agendaDate.toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')
      const title = `Reporte de Turnos - Consultorio C427`
    
      doc.setFontSize(16)
      doc.text(title, 14, 22)
      doc.setFontSize(11)
      doc.text(`Fecha: ${dateFormatted}`, 14, 30)

      const tableColumn = ["Hora", "Paciente", "Servicio/s", "Profesional"]
      const tableRows: any[] = []

      agendaAppointments.forEach((apt: any) => {
        const pat = patients.find(p => p.id === apt.patientId)
        const prof = professionals.find(p => p.id === apt.professionalId)
        
        // Default fallbacks with null safety for patient
        const patientName = apt.patientName || apt.patient?.name || pat?.name || 'Desconocido'
        
        // Default fallbacks with null safety for service
        let serviceNames = 'Desconocido'
        if (Array.isArray(apt.services)) {
          serviceNames = apt.services.map((s: any) => s.serviceName || s.name).filter(Boolean).join(', ')
        } else if (apt.serviceName) {
          serviceNames = apt.serviceName
        }

        const aptData = [
          apt.time,
          patientName,
          serviceNames,
          prof ? prof.name : 'Desconocido'
        ]
        tableRows.push(aptData)
      })

      applyAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        headStyles: { fillColor: '#10b981' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          2: { cellWidth: 'wrap' }
        },
        alternateRowStyles: { fillColor: '#f9f9f9' }
      })

      doc.save(`turnos_${dateFormatted.replace(/\//g, '-')}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  }

  // --- LOGICA VENTA DIRECTA ---
  const handleAddProductToDirectSale = (id: string, type: 'product' | 'combo' = 'product') => {
    const { products, combos } = useClinicStore.getState()
    const item = type === 'combo' ? combos.find(x => x.id === id) : products.find(x => x.id === id)
    if (!item) return

    setDirectSaleCart(prev => {
      const existing = prev.find(i => i.product.id === item.id && i.type === type)
      if (existing) {
        return prev.map(i => i.product.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product: item, quantity: 1, type }]
    })
  }

  const handleRemoveProductFromDirectSale = (id: string, type: 'product' | 'combo') => {
    setDirectSaleCart(prev => prev.filter(item => !(item.product.id === id && item.type === type)))
  }

  const directSaleTotal = useMemo(() => {
    const rawTotal = directSaleCart.reduce((acc, item) => {
      const price = directSalePaymentMethod === 'efectivo' ? item.product.priceCash : item.product.priceList
      return acc + (price * item.quantity)
    }, 0)
    
    if (directSaleOfferId) {
      const offer = useClinicStore.getState().offers.find(o => o.id === directSaleOfferId)
      if (offer) {
        return Math.max(0, rawTotal * (1 - offer.discountPercentage / 100))
      }
    }
    return rawTotal
  }, [directSaleCart, directSalePaymentMethod, directSaleOfferId])


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
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
    
    const daySchedules = (professional.schedule as any)?.[dayName]
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
    
    const bookedSlots = (appointments || [])
      .filter(
        (a) =>
          a.professionalId === schedulingProfessional &&
          new Date(a.date).toDateString() === date.toDateString() &&
          a.status !== "cancelado"
      )
      .map((a) => a.time)
    
    return allSlots.filter((slot) => !bookedSlots.includes(slot)).sort()
  }, [schedulingProfessional, schedulingDate, professionals, appointments])

  const handleScheduleAppointment = () => {
    if (!selectedPatient || !schedulingProfessional || !schedulingService || !schedulingTime) return
    const service = services.find((s) => s.id === schedulingService)
    if (!service) return
    
    addAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
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
        <h2 className="text-2xl font-bold text-[#16A34A]">Recepción</h2>
        <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
          <DialogTrigger asChild>
            <Button className="bg-[#16A34A] text-[#2d3529] hover:bg-[#15803D]">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-gray-200 text-foreground">
            <DialogHeader>
              <DialogTitle className="text-[#16A34A]">Registrar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Apellidos y Nombres</Label>
                  <Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} className="bg-input border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>DNI</Label>
                  <Input value={newPatient.dni} onChange={(e) => setNewPatient({ ...newPatient, dni: e.target.value })} className="bg-input border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Nac.</Label>
                  <Input type="date" value={newPatient.birthdate} onChange={(e) => setNewPatient({ ...newPatient, birthdate: e.target.value })} className="bg-input border-gray-200 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} className="bg-input border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Email (Opcional)</Label>
                  <Input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} className="bg-input border-gray-200" />
                </div>
              </div>
              <Button onClick={handleAddPatient} className="w-full bg-[#16A34A] text-[#2d3529] font-bold hover:bg-[#15803D]" disabled={!newPatient.name || !newPatient.phone || !newPatient.dni}>
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
          <Card className="w-full max-w-md bg-white border-l-4 border-l-[#16A34A] shadow-2xl rounded-2xl">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[#16A34A]">
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
      <Card className="bg-white text-foreground border border-[#16A34A]/40 shadow-xl rounded-2xl overflow-hidden relative">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-[#16A34A]" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedPatient(null)
              }}
              placeholder="Buscar por nombre o DNI..."
              className="pl-14 h-14 text-lg bg-input border-gray-200"
            />
          </div>
          
          {searchResults.length > 0 && !selectedPatient && (
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.map((patient) => (
                <div key={patient.id} className="p-4 rounded-lg bg-secondary/15 hover:bg-secondary cursor-pointer flex items-center justify-between" onClick={() => setSelectedPatient(patient)}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#16A34A]/20 flex items-center justify-center"><User className="h-6 w-6 text-[#16A34A]" /></div>
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
        <Card className="bg-secondary text-secondary-foreground border border-gray-800 shadow-2xl rounded-2xl overflow-hidden relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[#16A34A]/20 flex items-center justify-center"><User className="h-7 w-7 text-[#16A34A]" /></div>
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
                <Button variant="outline" size="sm" onClick={handleEditPatientClick} className="border-[#16A34A]/30 text-[#16A34A] hover:bg-[#16A34A]/10">
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
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {getPatientHistory(selectedPatient.id).length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">No hay turnos registrados para este paciente.</p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {getPatientHistory(selectedPatient.id).map(apt => {
                      const prof = professionals.find(p => p.id === apt.professionalId);
                      return (
                        <Card key={apt.id} className="bg-secondary/10 border-gray-100">
                          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] ${apt.status === 'completado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{apt.status}</Badge>
                                  <span className="text-gray-500 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time}</span>
                               </div>
                               <p className="font-bold text-foreground">{apt.services.map((s:any) => s.serviceName).join(', ')}</p>
                               <p className="text-sm text-[#16A34A]">con {prof?.name || 'Profesional no encontrado'}</p>
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
              <div className="space-y-4 pt-4 border-t border-gray-200">
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
                          className={`cursor-pointer whitespace-nowrap px-3 py-1.5 ${schedulingServiceCat === cat ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-600 border-gray-300 hover:bg-white/5'}`}
                          onClick={() => { setSchedulingServiceCat(cat); setSchedulingService(""); }}
                        >
                          {getCategoryDisplayName(cat as any)}
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
                          <div className="absolute top-[45px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[150px] overflow-y-auto z-50">
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
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-[#2d3529] font-medium border-b border-black/5"
                              >
                                {s.name} <span className="text-[#829177] ml-2 font-bold">${s.price}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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
                          className={`p-3 rounded-xl border text-left transition-all ${schedulingProfessional === prof.id ? "border-[#829177] bg-[#829177]/10" : "border-gray-200"}`}
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
                  <Button onClick={handleScheduleAppointment} className="w-full bg-[#16A34A] text-[#2d3529] hover:bg-[#15803D]">
                    Confirmar Turno
                  </Button>
                )}
              </div>
            )}

            {activePanel === "cobrar" && (
              <div className="space-y-6 pt-4 border-t border-gray-200">
                {!checkoutAptId ? (
                  <div className="space-y-4">
                    <Label className="text-[#16A34A] uppercase text-xs font-bold tracking-wider">Cobro de Turnos</Label>
                    {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro'].includes(a.status)).length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4 rounded bg-gray-50 mt-2">No hay turnos pendientes para cobrar.</p>
                    ) : (
                      <div className="space-y-2 mt-4">
                        <Label className="text-xs text-gray-500 uppercase block mb-2">Turnos Pendientes:</Label>
                        {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro'].includes(a.status)).map(apt => (
                          <div key={apt.id} className="p-4 bg-secondary/10 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-secondary/15 transition-colors" onClick={() => setCheckoutAptId(apt.id)}>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px]">{apt.status}</Badge>
                                <span className="text-gray-500 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time}</span>
                              </div>
                              <p className="font-bold text-foreground">{apt.services.map((s:any) => s.serviceName).join(', ')}</p>
                              {apt.products && apt.products.length > 0 && <p className="text-xs text-[#16A34A] mt-1">+ {apt.products.length} productos extras</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20">Abrir Cuenta</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const apt = appointments.find(a => a.id === checkoutAptId);
                  if (!apt) return null;

                  let subtotalList = 0;
                  let subtotalCash = 0;
                  apt.services.forEach((s: any) => {
                    subtotalList += s.price;
                    subtotalCash += (s.priceCash || s.price);
                  });
                  apt.products?.forEach((p: any) => {
                    subtotalList += (p.price * p.quantity);
                    subtotalCash += ((p.priceCashReference || p.price) * p.quantity);
                  });
                  const chosenTotalOriginal = checkoutPaymentMethod === 'efectivo' ? subtotalCash : subtotalList;
                  
                  let discountedTotal = chosenTotalOriginal;
                  if (checkoutOfferId) {
                    const offer = offers.find(o => o.id === checkoutOfferId);
                    if (offer) {
                      discountedTotal = chosenTotalOriginal * (1 - offer.discountPercentage / 100);
                    }
                  }
                  
                  const finalToPay = Math.max(0, Math.round(discountedTotal) - (apt.paidAmount || 0));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border border-gray-100">
                          <span className="text-sm font-semibold">Facturación de Turno</span>
                          <Button variant="ghost" size="sm" onClick={() => {setCheckoutAptId(""); setCheckoutPaymentMethod("");}} className="h-6 px-2 text-xs text-gray-500 hover:text-white">Cambiar Selección</Button>
                        </div>
                        <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                          {apt.services.map((s:any, i:number) => (
                            <div key={i} className="flex justify-between text-gray-700">
                              <span>{s.serviceName}</span>
                              <span>${checkoutPaymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price}</span>
                            </div>
                          ))}
                          {apt.products?.map((p:any, i:number) => (
                            <div key={i} className="flex justify-between text-gray-700 text-xs italic">
                              <span>{p.quantity}x {p.productName} (Gabinete)</span>
                              <span>${(checkoutPaymentMethod === 'efectivo' ? (p.priceCashReference || p.price) : p.price) * p.quantity}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-foreground mt-2">
                            <span>Subtotal:</span>
                            <span>${chosenTotalOriginal}</span>
                          </div>
                          {(apt.paidAmount || 0) > 0 && (
                            <div className="flex justify-between font-bold text-emerald-400">
                              <span>Seña ya abonada:</span>
                              <span>- ${apt.paidAmount}</span>
                            </div>
                          )}
                        </div>
                        <div className="pt-2 flex flex-col gap-2 relative z-10">
                          <Label>Medio de Pago del Saldo Restante</Label>
                          <Select value={checkoutPaymentMethod} onValueChange={(val: any) => setCheckoutPaymentMethod(val)}>
                            <SelectTrigger className="bg-input border-[#16A34A]/40 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent className="bg-card border-gray-200 z-[100]">
                              <SelectItem value="efectivo">💵 Efectivo (Promo)</SelectItem>
                              <SelectItem value="transferencia">🏦 Transferencia (Lista)</SelectItem>
                              <SelectItem value="tarjeta">💳 Tarjeta (Lista)</SelectItem>
                              <SelectItem value="qr">📱 Código QR (Lista)</SelectItem>
                              <SelectItem value="gift_card" disabled={!selectedPatient?.giftCardBalance || selectedPatient.giftCardBalance < finalToPay}>
                                🎁 Gift Card (Saldo Disp: ${(selectedPatient?.giftCardBalance || 0).toLocaleString()})
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pt-2 flex flex-col gap-2 relative z-10">
                          <Label>Promo Especial / Descuento</Label>
                          <Select value={checkoutOfferId} onValueChange={setCheckoutOfferId}>
                            <SelectTrigger className="bg-input border-gray-200 h-10"><SelectValue placeholder="Sin descuento..." /></SelectTrigger>
                            <SelectContent className="bg-card border-gray-200 z-[100]">
                              <SelectItem value="none">Sin descuento</SelectItem>
                              {offers.map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name} (-{o.discountPercentage}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="bg-emerald-700 p-6 rounded-xl border border-emerald-500/40 flex flex-col justify-between h-full">
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-gray-100 uppercase tracking-widest">Saldo Restante a Pagar</p>
                          <p className="text-5xl font-extrabold text-white">${finalToPay.toLocaleString()}</p>
                        </div>
                        <Button
                          className="w-full bg-[#16A34A] hover:bg-[#15803D] h-14 text-[#2d3529] font-bold mt-6 shadow-lg text-lg"
                          disabled={!checkoutPaymentMethod}
                          onClick={() => {
                            if (typeof useClinicStore.getState().completeAppointment === 'function') {
                              (useClinicStore.getState() as any).completeAppointment(checkoutAptId, checkoutPaymentMethod as any, finalToPay);
                            }
                            setCheckoutAptId("");
                            setCheckoutPaymentMethod("");
                            setCheckoutOfferId("");
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

            {activePanel === "venta_directa" && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <Label className="text-[#16A34A] uppercase text-xs font-bold tracking-wider">Vender Producto</Label>
                <div className="bg-secondary/10 p-3 rounded-lg border border-dashed border-gray-200 space-y-2">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Badge variant={directSaleProdCat === 'COMBOS' ? "default" : "outline"} onClick={() => { setDirectSaleProdCat('COMBOS'); setDirectSaleProdSearch(""); }} className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-xs ${directSaleProdCat === 'COMBOS' ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}>
                      COMBOS 🔥
                    </Badge>
                    {Array.from(new Set(useClinicStore.getState().products.map(p => p.category))).map(cat => (
                      <Badge key={cat} variant={directSaleProdCat === cat ? "default" : "outline"} onClick={() => { setDirectSaleProdCat(cat); setDirectSaleProdSearch(""); }} className={`cursor-pointer whitespace-nowrap px-2 py-0.5 text-xs ${directSaleProdCat === cat ? 'bg-[#16A34A] text-[#2d3529]' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}>
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder={directSaleProdCat ? `Buscar producto en ${directSaleProdCat}...` : "Buscar producto..."}
                      value={directSaleProdSearch}
                      onChange={(e) => { setDirectSaleProdSearch(e.target.value); setDirectSaleProdMenuOpen(true) }}
                      onFocus={() => setDirectSaleProdMenuOpen(true)}
                      onBlur={() => setTimeout(() => setDirectSaleProdMenuOpen(false), 200)}
                      className="bg-input border-gray-200 text-foreground placeholder:text-gray-400 h-10 text-sm"
                    />
                    {directSaleProdMenuOpen && (
                      <div className="absolute top-[44px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[170px] overflow-y-auto z-50">
                        {directSaleProdCat === 'COMBOS' ? (
                          combos
                            .filter(c => !directSaleProdSearch || c.name.toLowerCase().includes(directSaleProdSearch.toLowerCase()))
                            .map(c => (
                              <button key={c.id} onClick={() => { handleAddProductToDirectSale(c.id, 'combo'); setDirectSaleProdSearch(""); setDirectSaleProdMenuOpen(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-[#2d3529] font-medium border-b border-black/5 flex justify-between">
                                <span>{c.name}</span> <span className="text-emerald-700 font-bold">${c.priceCash} ef | ${c.priceList} t.</span>
                              </button>
                            ))
                        ) : (
                          useClinicStore.getState().products
                            .filter(p => (!directSaleProdCat || p.category === directSaleProdCat) && (!directSaleProdSearch || p.name.toLowerCase().includes(directSaleProdSearch.toLowerCase())))
                            .map(p => (
                              <button key={p.id} onClick={() => { handleAddProductToDirectSale(p.id, 'product'); setDirectSaleProdSearch(""); setDirectSaleProdMenuOpen(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-[#2d3529] font-medium border-b border-black/5 flex justify-between">
                                <span>{p.name}</span> <span className="text-emerald-700 font-bold">${p.priceCash} ef | ${p.priceList} t.</span>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm bg-gray-50 p-3 rounded border border-gray-200">
                  {directSaleCart.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-3">No hay productos agregados.</p>
                  ) : (
                    directSaleCart.map((item, i) => (
                      <div key={`vdp-${i}`} className="flex justify-between items-center text-xs font-bold leading-none py-1.5 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-500 hover:bg-transparent hover:scale-125" onClick={() => handleRemoveProductFromDirectSale(item.product.id, item.type)}>✕</Button>
                          <span>{item.quantity}x {item.product.name} {item.type === 'combo' && <span className="text-yellow-600 font-normal ml-1">(Combo)</span>}</span>
                        </div>
                        <span>${(directSalePaymentMethod === 'efectivo' ? item.product.priceCash : item.product.priceList) * item.quantity}</span>
                      </div>
                    ))
                  )}
                </div>

                {directSaleCart.length > 0 && (
                  <>
                    <div className="bg-secondary/5 p-3 rounded-lg border border-gray-100 space-y-2">
                      <Label className="text-xs text-gray-600">¿Quién vendió el producto?</Label>
                      <Select value={directSaleProf} onValueChange={setDirectSaleProf}>
                        <SelectTrigger className="bg-input border-gray-200 h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent className="bg-card border-gray-200">
                          <SelectItem value="recepcion">🏦 Recepción</SelectItem>
                          {professionals.filter(p => p.isActive).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.shortName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <Label>Medio de Pago</Label>
                      <Select value={directSalePaymentMethod} onValueChange={(val: any) => setDirectSalePaymentMethod(val)}>
                        <SelectTrigger className="bg-input border-[#16A34A]/40 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent className="bg-card border-gray-200">
                          <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                          <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                          <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <Label>Promo Especial / Descuento</Label>
                      <Select value={directSaleOfferId} onValueChange={setDirectSaleOfferId}>
                        <SelectTrigger className="bg-input border-gray-200 h-10"><SelectValue placeholder="Sin descuento..." /></SelectTrigger>
                        <SelectContent className="bg-card border-gray-200">
                          <SelectItem value="none">Sin descuento</SelectItem>
                          {offers.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.name} (-{o.discountPercentage}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-emerald-700 p-6 rounded-xl border border-emerald-500/40 flex flex-col gap-4">
                      <p className="text-sm text-emerald-100 uppercase tracking-widest">Total a cobrar</p>
                      <p className="text-4xl font-extrabold text-white">${Math.round(directSaleTotal).toLocaleString()}</p>
                      <Button className="w-full bg-[#16A34A] hover:bg-[#15803D] text-[#2d3529] font-bold" disabled={!directSalePaymentMethod || !directSaleProf} onClick={() => {
                        addSale({
                          type: 'direct',
                          items: directSaleCart.map(i => ({
                            type: i.type,
                            itemId: i.product.id,
                            itemName: i.product.name,
                            price: directSalePaymentMethod === 'efectivo' ? i.product.priceCash : i.product.priceList,
                            priceCashReference: i.product.priceCash,
                            quantity: i.quantity,
                            soldBy: directSaleProf || "recepcion"
                          })),
                          total: Math.round(directSaleTotal),
                          paymentMethod: directSalePaymentMethod as any,
                          processedBy: "Recepción"
                        })
                        setDirectSaleCart([])
                        setDirectSaleProf("")
                        setDirectSalePaymentMethod("")
                        setDirectSaleOfferId("")
                        setDirectSaleProdCat("")
                        setDirectSaleProdSearch("")
                      }}>
                        Confirmar Venta
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[#16A34A]">Editar Información del Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Apellidos y Nombres</Label>
                <Input value={editPatientData?.name || ""} onChange={(e) => setEditPatientData({ ...editPatientData, name: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input value={editPatientData?.dni || ""} onChange={(e) => setEditPatientData({ ...editPatientData, dni: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Nac.</Label>
                <Input type="date" value={editPatientData?.birthdate || ""} onChange={(e) => setEditPatientData({ ...editPatientData, birthdate: e.target.value })} className="bg-input border-gray-200 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editPatientData?.phone || ""} onChange={(e) => setEditPatientData({ ...editPatientData, phone: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editPatientData?.email || ""} onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })} className="bg-input border-gray-200" />
              </div>
            </div>
            <Button onClick={handleUpdatePatient} className="w-full bg-[#16A34A] text-[#2d3529] font-bold hover:bg-[#15803D]" disabled={!editPatientData?.name || !editPatientData?.phone || !editPatientData?.dni}>
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
            <div className="bg-card rounded-xl p-4 border border-gray-200 flex justify-center shadow-lg sticky top-6">
              <Calendar
                mode="single"
                selected={agendaDate}
                onSelect={setAgendaDate}
                className="rounded-md"
              />
            </div>
          </div>
          
          <div className="col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-[#16A34A] flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" /> 
                Agenda del {agendaDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <Button 
                onClick={generatePDF}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-full sm:w-auto"
                disabled={agendaAppointments.length === 0}
              >
                Descargar Turnos (PDF)
              </Button>
            </div>

            {agendaAppointments.length === 0 ? (
              <Card className="bg-transparent border-dashed border-gray-200">
                <CardContent className="py-12 text-center text-gray-400 italic text-sm">
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
                      className={`relative bg-secondary/10 border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                        isAttended ? 'opacity-50 grayscale border-gray-100' : 'border-gray-200 hover:border-[#16A34A]/30'
                      }`}
                    >
                      {/* Tachado Overlay if attended */}
                      {isAttended && <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20 -translate-y-1/2 rounded-full pointer-events-none z-10"></div>}
                      
                      <div className="flex items-center gap-4 z-0">
                        <div className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-lg min-w-[70px]">
                          <span className={`font-bold text-lg ${isAttended ? 'text-gray-500' : 'text-[#16A34A]'}`}>{apt.time}</span>
                        </div>
                        
                        <div className="space-y-1 z-0">
                          <p className={`font-bold text-lg ${isAttended ? 'text-gray-500' : 'text-foreground'}`}>
                            {apt.patientName || pat?.name || 'Desconocido'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-600">Prof: <span className="font-semibold">{prof?.shortName || '-'}</span></span>
                            <span className="text-gray-400">•</span>
                            <span className="text-[#16A34A] max-w-[150px] truncate">{apt.services[0]?.serviceName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full md:w-auto gap-4 z-0">
                        <div className="flex flex-col items-end gap-1">
                          {(() => {
                            if (isAttended) {
                              return <Badge className="bg-secondary text-gray-500 border-gray-200 text-[10px] uppercase">Ya Asistió</Badge>;
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
                            className="bg-[#16A34A] hover:bg-[#15803D] text-[#2d3529] font-bold h-10 w-10 p-0 rounded-full flex-shrink-0 shadow-lg"
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
              <Card className="bg-white text-foreground border border-gray-200 shadow-xl rounded-2xl mt-4">
                <CardHeader>
                  <CardTitle className="text-[#16A34A] flex items-center gap-2 text-2xl">
                    Cierre de Caja Diario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-emerald-700 p-6 rounded-xl border border-emerald-500/40 text-center">
                    <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Ingresos Totales (Dinero Real)</p>
                    <p className="text-5xl font-extrabold text-white">${totalIncome.toLocaleString()}</p>
                    <p className="text-xs text-amber-500/70 mt-2">No incluye pagos realizados con Gift Cards (ya se cobraron al ser adquiridas).</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-secondary/10 p-4 rounded-xl border border-gray-100 text-center">
                       <p className="text-xs text-gray-500 uppercase mb-1">Efectivo</p>
                       <p className="text-xl font-bold text-foreground">${byMethod.efectivo.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-xl border border-gray-100 text-center">
                       <p className="text-xs text-gray-500 uppercase mb-1">Transferencia</p>
                       <p className="text-xl font-bold text-foreground">${byMethod.transferencia.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-xl border border-gray-100 text-center">
                       <p className="text-xs text-gray-500 uppercase mb-1">Tarjeta (Déb/Créd)</p>
                       <p className="text-xl font-bold text-foreground">${byMethod.tarjeta.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-xl border border-gray-100 text-center">
                       <p className="text-xs text-gray-500 uppercase mb-1">Código QR</p>
                       <p className="text-xl font-bold text-foreground">${byMethod.qr.toLocaleString()}</p>
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
          {mainTab === "comisiones" && (() => {
            const currentMonth = new Date().getMonth()
            const salesCount = sales.reduce((total, sale) => {
              const saleDate = new Date(sale.date)
              if (saleDate.getMonth() !== currentMonth) return total
              return total + sale.items.filter(item => item.soldBy === "recepcion").reduce((sum, item) => sum + item.quantity, 0)
            }, 0)
    
            let currentCommission = 0
            let nextTarget = 0
            let nextCommission = 0
    
            if (salesCount >= 21) {
              currentCommission = 20
              nextTarget = 999
              nextCommission = 20
            } else if (salesCount >= 11) {
              currentCommission = 15
              nextTarget = 21
              nextCommission = 20
            } else if (salesCount >= 1) {
              currentCommission = 10
              nextTarget = 11
              nextCommission = 15
            } else {
              currentCommission = 0
              nextTarget = 1
              nextCommission = 10
            }
    
            const tierInfo = {
              missing: nextTarget === 999 ? 0 : nextTarget - salesCount,
              label: nextTarget === 999 ? "Nivel Máximo (20%)" : `${nextCommission}% de comisión`,
              color: salesCount >= 21 ? "bg-amber-400" : (salesCount >= 11 ? "bg-emerald-400" : "bg-blue-400")
            }
    
            const maxProgress = 30
            const progressValue = Math.min((salesCount / maxProgress) * 100, 100)
    
            return (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#16A34A]">Equipo Administrativo</h2>
                <Card className="bg-white text-foreground border border-[#16A34A]/30 overflow-hidden shadow-xl rounded-2xl">
                  <CardHeader className="py-3 border-b border-[#16A34A]/30 bg-[#F0FDF4] text-center">
                    <CardTitle className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center justify-center gap-2">
                      <Award className="h-4 w-4 text-[#16A34A]" /> Objetivo de Ventas (Recepción)
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
                      <p className="text-[10px] text-gray-400 italic">Las comisiones representan las ventas de insumos de toda el área de Caja y Mostrador agrupadas bajo este mes.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}