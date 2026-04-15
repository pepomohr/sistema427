"use client"

import { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import { CashClosureModule } from "@/components/cash-closure-module"; // El componente que te dio Claude
import { useClinicStore, getCategoryDisplayName, calculateCommissionTab } from "@/lib/store"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { useConfirm } from "@/hooks/use-confirm"
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
const getStatusColor = (status: string) => {
  const s = normalizeStatus(status);
  if (s === 'completado' || s === 'completed') return 'bg-emerald-100/50 text-emerald-600 border-emerald-200';
  if (s === 'cancelado' || s === 'cancelled') return 'bg-red-100/50 text-red-600 border-red-200';
  return 'bg-sky-100/50 text-sky-600 border-sky-200';
}

export function ReceptionModule({ activeView = "pacientes" }: { activeView?: "pacientes" | "agenda" | "caja" | "comisiones" }) {
  const {
    currentUser, // <-- ACÁ TRAEMOS AL USUARIO LOGUEADO
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
    updateAppointment,
    searchPatients,
    fetchPatients,
    fetchServices,
    fetchProducts,
    fetchAppointments,
    fetchProfessionals,
    fetchOffers,
    getProfessionalsForService,
    startAttention,
    cancelAppointment,
    updatePatientGiftCardBalance,
    addSale
  } = useClinicStore()

  const mainTab = activeView
  const [agendaDate, setAgendaDate] = useState<Date | undefined>(new Date())
  const [agendaSortBy, setAgendaSortBy] = useState<'time' | 'professional'>('time')
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
  
  const { confirm, ConfirmDialog } = useConfirm()

  const [checkoutAptId, setCheckoutAptId] = useState<string>("")
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card" | "">("")
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
  type DirectSaleCartItem = { product: any, quantity: number, type: 'product'|'combo', customUnitPrice?: number }
  const [directSaleCart, setDirectSaleCart] = useState<DirectSaleCartItem[]>([])
  const [directSaleProf, setDirectSaleProf] = useState("")
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "">("")
  const [directSaleOfferId, setDirectSaleOfferId] = useState<string>("")
  const [checkoutOfferId, setCheckoutOfferId] = useState<string>("")
  const [directSaleProdCat, setDirectSaleProdCat] = useState<string>("")
  const [directSaleProdSearch, setDirectSaleProdSearch] = useState("")
  const [directSaleProdMenuOpen, setDirectSaleProdMenuOpen] = useState(false)

  const [searchResults, setSearchResults] = useState<any[]>([])

  // Gift Card Loader
  const [showGiftCardLoader, setShowGiftCardLoader] = useState(false)
  const [giftCardAmount, setGiftCardAmount] = useState<number | "">("")
  const [giftCardPaymentMethod, setGiftCardPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "">("")

  // Edit Appointment
  const [editAppointmentData, setEditAppointmentData] = useState<any>(null)

  // Agregar Seña a turno existente
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAptId, setDepositAptId] = useState<string>("")
  const [depositAmount, setDepositAmount] = useState<string>("")
  // Editar Seña existente
  const [showEditDepositModal, setShowEditDepositModal] = useState(false)
  const [editDepositAptId, setEditDepositAptId] = useState<string>("")
  const [editDepositAmount, setEditDepositAmount] = useState<string>("")

  useEffect(() => {
    if (typeof fetchPatients === 'function') fetchPatients()
    if (typeof fetchServices === 'function') fetchServices()
    if (typeof fetchProducts === 'function') fetchProducts()
    if (typeof fetchAppointments === 'function') fetchAppointments()
    if (typeof fetchProfessionals === 'function') fetchProfessionals()
    if (typeof fetchOffers === 'function') fetchOffers()
  }, [fetchPatients, fetchServices, fetchProducts, fetchAppointments, fetchProfessionals, fetchOffers])

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
    if (newPatient.name && newPatient.phone) {
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
    if (editPatientData?.name && editPatientData?.phone) {
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

  const compressServiceName = (value: string) => value.toLowerCase().replace(/[\s\-_()&+.,\/]/g, "")
  const getAppointmentServiceNames = (apt: any) => {
    if (!Array.isArray(apt?.services)) return "Sin servicio"
    const names = apt.services.map((s: any) => {
      if (typeof s === "string") {
        const compressed = compressServiceName(s)
        const canonical = services.find((svc) => {
          const svcCompressed = compressServiceName(svc.name || "")
          return svcCompressed.includes(compressed) || compressed.includes(svcCompressed)
        })?.name
        return canonical || s
      }
      if (s?.serviceId) {
        const canonical = services.find((svc) => svc.id === s.serviceId)?.name
        if (canonical) return canonical
      }
      return s?.serviceName || s?.name || ""
    }).filter(Boolean)
    return names.length > 0 ? names.join(", ") : "Sin servicio"
  }

  const agendaAppointments = useMemo(() => {
    if (!agendaDate || !appointments) return []
    const filtered = appointments.filter(a => {
      return new Date(a.date).toDateString() === agendaDate.toDateString()
    })

    return filtered.sort((a, b) => {
      if (agendaSortBy === 'professional') {
        const profA = professionals.find(p => p.id === a.professionalId)?.name || ''
        const profB = professionals.find(p => p.id === b.professionalId)?.name || ''
        const profCompare = profA.localeCompare(profB)
        if (profCompare !== 0) return profCompare
      }
      return a.time.localeCompare(b.time)
    })
  }, [appointments, agendaDate, agendaSortBy, professionals])

  const generatePDF = async (sortBy: 'time' | 'professional' = 'time') => {
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

      let sortedAppointments = [...agendaAppointments];
      if (sortBy === 'professional') {
        sortedAppointments.sort((a, b) => {
          const profA = professionals.find(p => p.id === a.professionalId)?.name || '';
          const profB = professionals.find(p => p.id === b.professionalId)?.name || '';
          const profCompare = profA.localeCompare(profB);
          if (profCompare !== 0) return profCompare;
          return a.time.localeCompare(b.time);
        });
      }

      sortedAppointments.forEach((apt: any) => {
        const pat = patients.find(p => p.id === apt.patientId)
        const prof = professionals.find(p => p.id === apt.professionalId)
        const patientName = apt.patientName || apt.patient?.name || pat?.name || 'Desconocido'
        
        let serviceNames = 'Desconocido'
        if (Array.isArray(apt.services)) {
          serviceNames = apt.services.map((s: any) => typeof s === 'string' ? s : (s.serviceName || s.name)).filter(Boolean).join(', ')
        } else if (apt.serviceName) {
          serviceNames = apt.serviceName
        }

        const aptData = [
          apt.time ? apt.time.substring(0, 5) : apt.time,
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

  const isGeneralGiftCardProduct = (item: DirectSaleCartItem) => {
    if (item.type !== 'product') return false
    const productName = (item.product?.name || '').toLowerCase()
    return productName.includes('gift card general')
  }

  const getDirectSaleUnitPrice = (item: DirectSaleCartItem) => {
    if (typeof item.customUnitPrice === 'number' && item.customUnitPrice > 0) return item.customUnitPrice
    return directSalePaymentMethod === 'efectivo' ? item.product.priceCash : item.product.priceList
  }

  const directSaleTotal = useMemo(() => {
    const rawTotal = directSaleCart.reduce((acc, item) => {
      const price = getDirectSaleUnitPrice(item)
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


  const availableProfessionals = useMemo(() => {
    if (!schedulingService || typeof getProfessionalsForService !== 'function') return []
    return getProfessionalsForService(schedulingService) || []
  }, [schedulingService, getProfessionalsForService])

  const compressName = (s: string): string =>
    s.toLowerCase().replace(/[\s\-_()&+.,\/]/g, '')

  const getServiceDuration = (aptServiceInfo: any): number => {
    if (!aptServiceInfo || !services || services.length === 0) return 30

    if (typeof aptServiceInfo === 'object' && aptServiceInfo.serviceId) {
      const byId = services.find(
        s => s.id?.toLowerCase() === String(aptServiceInfo.serviceId).toLowerCase()
      )
      if (byId?.duration) return Number(byId.duration) || 30

      if (aptServiceInfo.serviceName) {
        const byName = services.find(
          s => s.name?.trim().toLowerCase() === aptServiceInfo.serviceName.trim().toLowerCase()
        )
        if (byName?.duration) return Number(byName.duration) || 30
      }
    }

    if (typeof aptServiceInfo === 'string') {
      const compressed = compressName(aptServiceInfo)
      const found = services.find(s => {
        if (!s.name) return false
        const compressedService = compressName(s.name)
        return compressedService.includes(compressed) || compressed.includes(compressedService)
      })
      if (found?.duration) return Number(found.duration) || 30
    }

    return 30
  }

  // Helper: check if an appointment is outside the professional's schedule
  const isAptOutsideSchedule = (apt: any): boolean => {
    const prof = professionals.find(p => p.id === apt.professionalId)
    if (!prof?.schedule) return false
    const dateObj = new Date(apt.date)
    const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][dateObj.getDay()]
    const daySchedule = (prof.schedule as any)[dayKey]
    if (!daySchedule || daySchedule.length === 0) return false
    const [aptH, aptM] = (apt.time || '00:00').split(':').map(Number)
    const aptMins = aptH * 60 + aptM
    return !daySchedule.some(({ start, end }: any) => {
      const [sH, sM] = start.split(':').map(Number)
      const [eH, eM] = end.split(':').map(Number)
      return aptMins >= sH * 60 + sM && aptMins < eH * 60 + eM
    })
  }

  const scheduleSlots = useMemo(() => {
    if (!schedulingProfessional || !schedulingDate || !professionals || !appointments || !services) return []

    const professional = professionals.find((p) => p.id === schedulingProfessional)
    if (!professional) return []

    // Get day of week for the selected date
    const dateObj = schedulingDate.includes('T') ? new Date(schedulingDate) : new Date(schedulingDate + 'T12:00:00')
    const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][dateObj.getDay()]
    const daySchedule = professional.schedule ? (professional.schedule as any)[dayKey] : null

    const allPossibleSlots: string[] = []

    if (daySchedule && daySchedule.length > 0) {
      // Only generate slots within the professional's working hours
      daySchedule.forEach(({ start, end }: { start: string, end: string }) => {
        const [startH, startM] = start.split(':').map(Number)
        const [endH, endM] = end.split(':').map(Number)
        const startMins = startH * 60 + startM
        const endMins = endH * 60 + endM
        for (let m = startMins; m < endMins; m += 30) {
          const h = Math.floor(m / 60)
          const min = m % 60
          allPossibleSlots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
        }
      })
    } else {
      // No schedule configured = show all 9-21
      for (let h = 9; h < 21; h++) {
        allPossibleSlots.push(`${h.toString().padStart(2, "0")}:00`)
        allPossibleSlots.push(`${h.toString().padStart(2, "0")}:30`)
      }
    }
    
    const dateForFilter = (
      schedulingDate.includes('T')
        ? new Date(schedulingDate)
        : new Date(schedulingDate + 'T12:00:00')
    ).toDateString()

    const bookedAppointments = appointments.filter(a =>
      a.professionalId === schedulingProfessional &&
      new Date(a.date).toDateString() === dateForFilter &&
      normalizeStatus(a.status as string) !== "cancelado" &&
      normalizeStatus(a.status as string) !== "cancelled"
    )

    const blockedTimes = new Set<string>()

    bookedAppointments.forEach(apt => {
      const timeParts = apt.time.split(':')
      const startH = parseInt(timeParts[0], 10)
      const startM = parseInt(timeParts[1], 10)
      const startInMinutes = startH * 60 + startM

      let duration = 30
      if (Array.isArray(apt.services) && apt.services.length > 0) {
        duration = getServiceDuration(apt.services[0])
      } else if (apt.serviceId) {
        duration = getServiceDuration(apt.serviceId)
      }

      const endInMinutes = startInMinutes + duration

      allPossibleSlots.forEach(slot => {
        const slotParts = slot.split(':')
        const slotH = parseInt(slotParts[0], 10)
        const slotM = parseInt(slotParts[1], 10)
        const slotInMinutes = slotH * 60 + slotM

        if (slotInMinutes >= startInMinutes && slotInMinutes < endInMinutes) {
          blockedTimes.add(slot)
        }
      })
    })
    
    return allPossibleSlots
      .sort()
      .map((slot) => ({ slot, blocked: blockedTimes.has(slot) }))
  }, [schedulingProfessional, schedulingDate, professionals, appointments, services])

  const handleScheduleAppointment = () => {
    if (!selectedPatient || !schedulingProfessional || !schedulingService || !schedulingTime) return
    // Validar que no sea fecha pasada
    const selectedDateObj = schedulingDate.includes('T') ? new Date(schedulingDate) : new Date(schedulingDate + 'T12:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (selectedDateObj < today) {
      confirm({
        title: "Fecha no válida",
        description: "No se puede agendar un turno en una fecha pasada. Por favor seleccioná una fecha de hoy en adelante.",
        actionType: "info",
        onConfirm: () => {}
      })
      return
    }
    const service = services.find((s) => s.id === schedulingService)
    if (!service) return
    const profName = professionals.find((p) => p.id === schedulingProfessional)?.shortName
    
    if (editAppointmentData) {
      confirm({
        title: "Reprogramar Turno",
        description: `Vas a reprogramar el turno de ${selectedPatient.name} para un ${service.name} el ${schedulingDate} a las ${schedulingTime}hs.`,
        actionType: "success",
        onConfirm: () => {
          updateAppointment(editAppointmentData, {
            professionalId: schedulingProfessional,
            date: new Date(schedulingDate + 'T12:00:00'),
            time: schedulingTime,
            services: [{ serviceId: service.id, serviceName: service.name, price: service.price, priceCash: (service as any).priceCash || service.price }],
            paidAmount: Number(schedulingPaidAmount) || 0,
            totalAmount: service.price,
          })
          
          setSchedulingService("")
          setSchedulingProfessional("")
          setSchedulingTime("")
          setSchedulingPaidAmount("")
          setActivePanel(null)
          setEditAppointmentData(null)
        }
      })
      return
    }

    confirm({
      title: "Confirmar Turno",
      description: `Estás por agendar a ${selectedPatient.name} con ${profName} para un ${service.name} a las ${schedulingTime}hs.`,
      actionType: "success",
      onConfirm: () => {
        addAppointment({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          professionalId: schedulingProfessional,
          date: new Date(schedulingDate + 'T12:00:00'),
          time: schedulingTime,
          services: [{ serviceId: service.id, serviceName: service.name, price: service.price, priceCash: (service as any).priceCash || service.price }],
          products: [],
          status: "programado",
          totalAmount: service.price,
          paidAmount: Number(schedulingPaidAmount) || 0,
        })
        
        setSchedulingService("")
        setSchedulingProfessional("")
        setSchedulingTime("")
        setSchedulingPaidAmount("")
        setActivePanel(null)
      }
    })
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

  const productCategories = useMemo(() => {
    const cats = Array.from(new Set((products || []).map((p: any) => p.category).filter(Boolean)))
    return cats.sort((a, b) => a.localeCompare(b))
  }, [products])

  const filteredDirectSaleProducts = useMemo(() => {
    return (products || []).filter((p: any) => {
      const matchesCategory = !directSaleProdCat || p.category === directSaleProdCat
      const matchesSearch = !directSaleProdSearch || p.name.toLowerCase().includes(directSaleProdSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, directSaleProdCat, directSaleProdSearch])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Recepción</h2>
        <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
          <DialogTrigger asChild>
            <Button className="bg-[#16A34A] text-white hover:bg-[#15803D]">
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
                  <Label>Apellidos y Nombres <span className="text-red-500">*</span></Label>
                  <Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} className="bg-input border-gray-200" placeholder="Ej: Juan Pérez" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono <span className="text-red-500">*</span></Label>
                  <Input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} className="bg-input border-gray-200" placeholder="Ej: 1123456789" />
                </div>
                <div className="space-y-2">
                  <Label>DNI (Opcional)</Label>
                  <Input value={newPatient.dni} onChange={(e) => setNewPatient({ ...newPatient, dni: e.target.value })} className="bg-input border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Nac. (Opcional)</Label>
                  <Input type="date" value={newPatient.birthdate} onChange={(e) => setNewPatient({ ...newPatient, birthdate: e.target.value })} className="bg-input border-gray-200 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Email (Opcional)</Label>
                  <Input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} className="bg-input border-gray-200" />
                </div>
              </div>
              <Button onClick={handleAddPatient} className="w-full bg-[#16A34A] text-white font-bold hover:bg-[#15803D]" disabled={!newPatient.name || !newPatient.phone}>
                Registrar Paciente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-6">
        <div className="w-full overflow-hidden">
          {mainTab === "pacientes" && (
        <>
      {todayBirthdays.length > 0 && !selectedPatient && (
        <Card className="bg-gradient-to-r from-[#B68C5C]/10 to-transparent border-[#B68C5C]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#B68C5C] flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 animate-bounce" /> ¡Cumpleañeros de Hoy!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {todayBirthdays.map(p => (
                <Badge 
                  key={p.id} 
                  className="bg-[#B68C5C]/20 text-[#B68C5C] border-[#B68C5C]/30 hover:bg-[#B68C5C]/40 px-3 py-1 text-sm font-semibold cursor-pointer transition-colors" 
                  onClick={() => { setSelectedPatient(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  🎉 {p.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardHeader className="pb-4 relative pt-6 sm:pt-6">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 pr-8 sm:pr-0">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 rounded-full bg-[#16A34A]/20 flex items-center justify-center"><User className="h-6 w-6 sm:h-7 sm:w-7 text-[#16A34A]" /></div>
                <div>
                  <CardTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2">
                    {selectedPatient.name}
                    {(() => {
                      const liveBal = patients.find(p => p.id === selectedPatient.id)?.giftCardBalance || 0
                      return liveBal > 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
                          Saldo: ${liveBal.toLocaleString()}
                        </Badge>
                      ) : null
                    })()}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">DNI: {selectedPatient.dni} | Tel: {selectedPatient.phone}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setShowGiftCardLoader(true)} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 justify-start sm:justify-center">
                  <Gift className="h-4 w-4 mr-2 flex-shrink-0" /> Cargar Saldo a Favor
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setDepositAptId(""); setDepositAmount(""); setShowDepositModal(true) }} className="border-blue-400/50 text-blue-500 hover:bg-blue-500/10 justify-start sm:justify-center">
                  <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" /> Agregar Seña
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditPatientClick} className="border-[#16A34A]/30 text-[#16A34A] hover:bg-[#16A34A]/10 justify-start sm:justify-center">
                  <Edit2 className="h-4 w-4 mr-2 flex-shrink-0" /> Editar Info
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="absolute top-4 right-4 p-2 h-8 w-8 flex items-center justify-center"><X className="h-5 w-5" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Button variant={activePanel === "historial" ? "default" : "outline"} className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm" onClick={() => setActivePanel("historial")}>
                <History className="h-5 w-5 sm:h-6 sm:w-6" /> Historial
              </Button>
              <Button variant={activePanel === "agendar" ? "default" : "outline"} className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm" onClick={() => setActivePanel("agendar")}>
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" /> Agendar
              </Button>
              <Button variant={activePanel === "cobrar" ? "default" : "outline"} className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm" onClick={() => setActivePanel("cobrar")}>
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" /> Cobrar Turno
              </Button>
              <Button variant={activePanel === "venta_directa" ? "default" : "outline"} className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-[10px] sm:text-sm text-center leading-tight" onClick={() => setActivePanel("venta_directa")}>
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" /> Vender Producto
              </Button>
            </div>

            {activePanel === "historial" && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Resumen financiero del paciente */}
                {(() => {
                  const patApts = getPatientHistory(selectedPatient.id)
                  const totalPagado = patApts
                    .filter((a: any) => a.status === 'completado')
                    .reduce((sum: number, a: any) => sum + (a.paidAmount || a.totalAmount || 0), 0)
                  const seniasPendientes = patApts
                    .filter((a: any) => ['programado','confirmado','scheduled'].includes(normalizeStatus(a.status)))
                    .reduce((sum: number, a: any) => sum + (a.paidAmount || 0), 0)
                  const patientSales = sales.filter((s: any) => s.patientId === selectedPatient.id && s.paymentMethod !== 'gift_card')
                  const totalVentas = patientSales.reduce((sum: number, s: any) => sum + s.total, 0)
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Turnos cobrados</p>
                        <p className="text-lg font-black text-emerald-600">${totalPagado.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Señas activas</p>
                        <p className="text-lg font-black text-blue-600">${seniasPendientes.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Productos</p>
                        <p className="text-lg font-black text-gray-700">${totalVentas.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Saldo favor</p>
                        {(() => {
                          const liveBal = patients.find(p => p.id === selectedPatient.id)?.giftCardBalance || 0
                          return (
                            <p className={`text-lg font-black ${liveBal > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              ${liveBal.toLocaleString()}
                            </p>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })()}
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
                                  <Badge className={`text-[10px] border ${getStatusColor(apt.status as string)}`}>
                                    {getStatusText(apt.status as string)}
                                  </Badge>
                                  <span className="text-gray-500 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time ? apt.time.substring(0, 5) : apt.time}</span>
                               </div>
                               <p className="font-bold text-foreground">{apt.services.map((s:any) => typeof s === 'string' ? s : s.serviceName).join(', ')}</p>
                               <p className="text-sm text-[#16A34A]">con {prof?.name || 'Profesional no encontrado'}</p>
                            </div>
                            {['programado', 'confirmado', 'scheduled'].includes(normalizeStatus(apt.status as string)) && (
                               <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                 {(apt.paidAmount || 0) > 0 && (
                                   <Button variant="outline" size="sm" onClick={() => {
                                     setEditDepositAptId(apt.id)
                                     setEditDepositAmount(String(apt.paidAmount))
                                     setShowEditDepositModal(true)
                                   }} className="flex-1 sm:flex-none border-amber-400/60 text-amber-600 hover:bg-amber-50">
                                     ✏️ Seña: ${(apt.paidAmount || 0).toLocaleString('es-AR')}
                                   </Button>
                                 )}
                                 <Button variant="outline" size="sm" onClick={() => {
                                    setSchedulingDate(new Date(apt.date).toISOString().split('T')[0])
                                    setSchedulingTime(apt.time)
                                    setSchedulingProfessional(apt.professionalId)
                                    setSchedulingService(apt.services[0]?.serviceId || "")
                                    setSchedulingServiceSearch((typeof apt.services[0] === 'string' ? apt.services[0] : apt.services[0]?.serviceName) || "")
                                    setSchedulingPaidAmount(apt.paidAmount || "")
                                    setActivePanel("agendar")
                                    setEditAppointmentData(apt.id)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                 }} className="flex-1 sm:flex-none border-blue-500/50 text-blue-400 hover:bg-blue-500/10">Reprogramar</Button>
                                 <Button variant="outline" size="sm" onClick={() => {
                                    confirm({
                                      title: "Cancelar Turno",
                                      description: "¿Seguro que querés cancelar este turno? Esta acción no se puede deshacer.",
                                      actionType: "danger",
                                      onConfirm: () => cancelAppointment(apt.id)
                                    })
                                 }} className="flex-1 sm:flex-none border-red-500/50 text-red-400 hover:bg-red-500/10">Cancelar</Button>
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
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide scroll-smooth snap-x">
                      {Object.keys(servicesByCategory).map(cat => (
                        <Badge 
                          key={cat} 
                          variant={schedulingServiceCat === cat ? "default" : "outline"}
                          className={`cursor-pointer whitespace-nowrap px-4 py-2 sm:px-3 sm:py-1.5 flex-shrink-0 snap-start min-w-max text-center flex justify-center text-sm sm:text-xs ${schedulingServiceCat === cat ? 'bg-[#16A34A] text-white' : 'text-gray-600 border-gray-300 hover:bg-white/5'}`}
                          onClick={() => { setSchedulingServiceCat(cat); setSchedulingService(""); }}
                        >
                          {getCategoryDisplayName(cat as any)}
                        </Badge>
                      ))}
                    </div>
                    {schedulingServiceCat && (
                      <Popover open={schedulingServiceMenuOpen} onOpenChange={setSchedulingServiceMenuOpen}>
                        <PopoverAnchor asChild>
                          <div className="relative w-full">
                            <Input 
                              placeholder="Buscar servicio específico..." 
                              value={schedulingServiceSearch} 
                              onChange={(e) => {
                                setSchedulingServiceSearch(e.target.value)
                                setSchedulingServiceMenuOpen(true)
                                if(e.target.value === "") setSchedulingService("")
                              }}
                              onFocus={() => setSchedulingServiceMenuOpen(true)}
                              className="bg-input border-emerald-500/50 focus-visible:ring-emerald-500 text-foreground placeholder:text-gray-400 mt-2 service-search-input"
                            />
                          </div>
                        </PopoverAnchor>
                        <PopoverContent
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onInteractOutside={(e) => {
                            if ((e.target as Element)?.closest('.service-search-input')) {
                              e.preventDefault()
                            }
                          }}
                          className="w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto p-0 z-[100] border-emerald-500/30 shadow-xl"
                        >
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
                              className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-[#2d3529] font-medium border-b border-black/5 transition-colors"
                            >
                              {s.name} <span className="text-[#829177] ml-2 font-bold">${s.price}</span>
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
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

                {schedulingProfessional && scheduleSlots.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500">
                      Los horarios ocupados se muestran tachados para identificar rápido disponibilidad.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {scheduleSlots.map(({ slot, blocked }) => (
                        <Button
                          key={slot}
                          variant={schedulingTime === slot ? "default" : "outline"}
                          size="sm"
                          disabled={blocked}
                          onClick={() => setSchedulingTime(slot)}
                          className={blocked ? "line-through opacity-60 cursor-not-allowed" : ""}
                        >
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
                  <Button onClick={handleScheduleAppointment} className="w-full bg-[#16A34A] text-white hover:bg-[#15803D]">
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
                    {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro', 'scheduled'].includes(normalizeStatus(a.status))).length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4 rounded bg-gray-50 mt-2">No hay turnos pendientes para cobrar.</p>
                    ) : (
                      <div className="space-y-2 mt-4">
                        <Label className="text-xs text-gray-500 uppercase block mb-2">Turnos Pendientes:</Label>
                        {getPatientHistory(selectedPatient.id).filter(a => ['programado', 'confirmado', 'pendiente_cobro', 'scheduled'].includes(normalizeStatus(a.status))).map(apt => (
                          <div key={apt.id} className="p-4 bg-secondary/10 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-secondary/15 transition-colors" onClick={() => setCheckoutAptId(apt.id)}>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-[10px] border ${getStatusColor(apt.status as string)}`}>
                                  {getStatusText(apt.status as string)}
                                </Badge>
                                <span className="text-gray-500 text-xs">{new Date(apt.date).toLocaleDateString()} a las {apt.time ? apt.time.substring(0,5) : apt.time}</span>
                              </div>
                              <p className="font-bold text-foreground">{apt.services.map((s:any) => typeof s === 'string' ? s : s.serviceName).join(', ')}</p>
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
                          <Button variant="outline" size="sm" onClick={() => {setCheckoutAptId(""); setCheckoutPaymentMethod(""); setCheckoutOfferId("");}} className="border-red-500/30 text-red-500 hover:bg-red-50 h-7 text-xs px-3">Cerrar Cuenta</Button>
                        </div>
                        <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                          {apt.services.map((s:any, i:number) => (
                            <div key={i} className="flex justify-between text-gray-700">
                              <span>{typeof s === 'string' ? s : s.serviceName}</span>
                              <span>${typeof s === 'string' ? 0 : (checkoutPaymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price)}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-foreground mt-2">
                            <span>Subtotal:</span>
                            <span>${chosenTotalOriginal}</span>
                          </div>
                        </div>
                        <div className="pt-2 flex flex-col gap-2 relative z-10">
                          <Label>Medio de Pago</Label>
                          <Select value={checkoutPaymentMethod} onValueChange={(val: any) => setCheckoutPaymentMethod(val)}>
                            <SelectTrigger className="bg-input border-[#16A34A]/40 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent className="bg-card border-gray-200 z-[100]">
                              <SelectItem value="efectivo">💵 Efectivo (Promo)</SelectItem>
                              <SelectItem value="transferencia">🏦 Transferencia (Lista)</SelectItem>
                              <SelectItem value="tarjeta">💳 Tarjeta (Lista)</SelectItem>
                              <SelectItem value="qr">📱 Código QR</SelectItem>
                              {(() => {
                                const bal = patients.find(p => p.id === selectedPatient?.id)?.giftCardBalance || 0
                                return (
                                  <SelectItem value="gift_card" disabled={bal <= 0}>
                                    💳 Saldo a Favor {bal > 0 ? `($${bal.toLocaleString('es-AR')} disp.)` : '(sin saldo)'}
                                  </SelectItem>
                                )
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pt-2 flex flex-col gap-2 relative z-10">
                          <Label>Aplicar Oferta</Label>
                          <Select value={checkoutOfferId || "none"} onValueChange={(val) => setCheckoutOfferId(val === "none" ? "" : val)}>
                            <SelectTrigger className="bg-input border-[#16A34A]/40 h-10"><SelectValue placeholder="Sin oferta" /></SelectTrigger>
                            <SelectContent className="bg-card border-gray-200 z-[100]">
                              <SelectItem value="none">Sin Descuento</SelectItem>
                              {offers.map(o => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name} (-{o.discountPercentage}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="bg-emerald-700 p-6 rounded-xl border border-emerald-500/40 flex flex-col justify-between h-full">
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-gray-100 uppercase tracking-widest">Saldo a Pagar</p>
                          <p className="text-5xl font-extrabold text-white">${finalToPay.toLocaleString()}</p>
                        </div>
                        <Button
                          className="w-full bg-[#16A34A] hover:bg-[#15803D] h-14 text-white font-bold mt-6 shadow-lg text-lg"
                          disabled={!checkoutPaymentMethod}
                          onClick={() => {
                            if (checkoutPaymentMethod === 'gift_card') {
                              const bal = patients.find(p => p.id === selectedPatient?.id)?.giftCardBalance || 0
                              if (bal < finalToPay) {
                                alert(`Saldo insuficiente. Disponible: $${bal.toLocaleString('es-AR')}, necesario: $${finalToPay.toLocaleString('es-AR')}`)
                                return
                              }
                            }
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
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide scroll-smooth snap-x">
                    <Badge
                      variant={!directSaleProdCat ? "default" : "outline"}
                      onClick={() => { setDirectSaleProdCat(""); setDirectSaleProdSearch(""); }}
                      className={`cursor-pointer whitespace-nowrap px-4 py-2 sm:px-2 sm:py-0.5 text-sm sm:text-xs flex-shrink-0 snap-start ${!directSaleProdCat ? 'bg-[#16A34A] text-white' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}
                    >
                      Todas
                    </Badge>
                    {productCategories.map(cat => (
                      <Badge
                        key={cat}
                        variant={directSaleProdCat === cat ? "default" : "outline"}
                        onClick={() => { setDirectSaleProdCat(cat); setDirectSaleProdSearch(""); }}
                        className={`cursor-pointer whitespace-nowrap px-4 py-2 sm:px-2 sm:py-0.5 text-sm sm:text-xs flex-shrink-0 snap-start ${directSaleProdCat === cat ? 'bg-[#16A34A] text-white' : 'text-gray-500 border-gray-200 hover:bg-white/5'}`}
                      >
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
                      onBlur={() => setTimeout(() => setDirectSaleProdMenuOpen(false), 180)}
                      className="bg-input border-gray-200 text-foreground placeholder:text-gray-400 h-10 text-sm"
                    />
                    {directSaleProdMenuOpen && (
                      <div className="absolute bottom-[42px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[220px] overflow-y-auto z-[80]">
                        {filteredDirectSaleProducts.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-gray-500">No hay productos para ese filtro.</p>
                        ) : (
                          filteredDirectSaleProducts.map((p: any) => (
                            <button
                              key={`reception-direct-${p.id}`}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary hover:text-white text-black font-semibold border-b border-gray-100 last:border-b-0 flex justify-between"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                handleAddProductToDirectSale(p.id, 'product')
                                setDirectSaleProdSearch("")
                                setDirectSaleProdMenuOpen(false)
                              }}
                            >
                              <span className="truncate mr-3">{p.name}</span>
                              <span className="text-[#16A34A] font-bold">${p.priceCash}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Aplicar Oferta</Label>
                  <Select value={directSaleOfferId || "none"} onValueChange={(val) => setDirectSaleOfferId(val === "none" ? "" : val)}>
                    <SelectTrigger className="bg-input border-gray-200 text-foreground h-10">
                      <SelectValue placeholder="Sin oferta" />
                    </SelectTrigger>
                    <SelectContent className="z-[90]">
                      <SelectItem value="none">Sin Descuento</SelectItem>
                      {offers.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} (-{o.discountPercentage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {directSaleCart.length > 0 && (
                  <div className="bg-emerald-700 p-6 rounded-xl border border-emerald-500/40 flex flex-col gap-4">
                    <div className="space-y-2">
                      {directSaleCart.map(item => (
                        <div key={`${item.type}-${item.product.id}`} className="rounded-lg bg-white/10 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-white font-semibold">
                              {item.product.name} x{item.quantity}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-100 hover:text-white hover:bg-red-500/30"
                              onClick={() => handleRemoveProductFromDirectSale(item.product.id, item.type)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {isGeneralGiftCardProduct(item) && (
                            <div className="mt-2">
                              <Label className="text-xs text-emerald-100">Precio manual Gift Card General</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.customUnitPrice ?? ""}
                                placeholder="Ingresar importe"
                                onChange={(e) => {
                                  const value = e.target.value
                                  setDirectSaleCart(prev => prev.map(cartItem => {
                                    if (cartItem.product.id !== item.product.id || cartItem.type !== item.type) return cartItem
                                    return { ...cartItem, customUnitPrice: value === "" ? undefined : Number(value) }
                                  }))
                                }}
                                className="mt-1 bg-white border-emerald-200 text-foreground"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-emerald-100 uppercase tracking-widest">Total a cobrar</p>
                    <p className="text-4xl font-extrabold text-white">${Math.round(directSaleTotal).toLocaleString()}</p>
                    <Button className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold" onClick={async () => {
                      const giftCardCredit = directSaleCart.reduce((acc, item) => {
                        if (!isGeneralGiftCardProduct(item)) return acc
                        return acc + (getDirectSaleUnitPrice(item) * item.quantity)
                      }, 0)

                      await addSale({
                        type: 'direct',
                        items: directSaleCart.map(i => ({
                          type: i.type,
                          itemId: i.product.id,
                          itemName: i.product.name,
                          price: getDirectSaleUnitPrice(i),
                          priceCashReference: getDirectSaleUnitPrice(i),
                          quantity: i.quantity,
                          soldBy: directSaleProf || "recepcion"
                        })),
                        total: Math.round(directSaleTotal),
                        paymentMethod: directSalePaymentMethod as any,
                        processedBy: "Recepción"
                      })

                      if (selectedPatient && giftCardCredit > 0) {
                        await updatePatientGiftCardBalance(selectedPatient.id, giftCardCredit)
                        setSelectedPatient((prev: any) => prev ? {
                          ...prev,
                          giftCardBalance: (prev.giftCardBalance || 0) + giftCardCredit
                        } : prev)
                      }

                      setDirectSaleCart([])
                    }}>
                      Confirmar Venta
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIÁLOGO DE EDICIÓN FLEXIBLE */}
      <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[#16A34A]">Editar Información del Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Apellidos y Nombres <span className="text-red-500">*</span></Label>
                <Input value={editPatientData?.name || ""} onChange={(e) => setEditPatientData({ ...editPatientData, name: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono <span className="text-red-500">*</span></Label>
                <Input value={editPatientData?.phone || ""} onChange={(e) => setEditPatientData({ ...editPatientData, phone: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>DNI (Opcional)</Label>
                <Input value={editPatientData?.dni || ""} onChange={(e) => setEditPatientData({ ...editPatientData, dni: e.target.value })} className="bg-input border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Nac. (Opcional)</Label>
                <Input type="date" value={editPatientData?.birthdate || ""} onChange={(e) => setEditPatientData({ ...editPatientData, birthdate: e.target.value })} className="bg-input border-gray-200 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Email (Opcional)</Label>
                <Input type="email" value={editPatientData?.email || ""} onChange={(e) => setEditPatientData({ ...editPatientData, email: e.target.value })} className="bg-input border-gray-200" />
              </div>
            </div>
            <Button onClick={handleUpdatePatient} className="w-full bg-[#16A34A] text-white font-bold hover:bg-[#15803D]" disabled={!editPatientData?.name || !editPatientData?.phone}>
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
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={agendaSortBy} onValueChange={(v: 'time' | 'professional') => setAgendaSortBy(v)}>
                  <SelectTrigger className="bg-input border-gray-200 w-full sm:w-[240px]">
                    <SelectValue placeholder="Ordenar agenda..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Ver agenda ordenada por horario</SelectItem>
                    <SelectItem value="professional">Ver agenda ordenada por profesional</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      className="bg-[#B68C5C] hover:bg-[#a07840] text-white font-bold w-full sm:w-auto"
                      disabled={agendaAppointments.length === 0}
                    >
                      Descargar Turnos (PDF)
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => generatePDF('time')} className="cursor-pointer">
                      Ordenados solo por Hora
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => generatePDF('professional')} className="cursor-pointer">
                      Ordenados agrupados por Profesional
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                  const sNorm = normalizeStatus(apt.status as string);
                  const isAttended = sNorm === 'en_atencion' || sNorm === 'completado' || sNorm === 'pendiente_cobro' || sNorm === 'completed';
                  const isOutside = !isAttended && isAptOutsideSchedule(apt);

                  return (
                    <div
                      key={apt.id}
                      className={`relative bg-secondary/10 border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                        isAttended ? 'opacity-50 grayscale border-gray-100' :
                        isOutside ? 'border-red-400 bg-red-50/60 hover:border-red-500' :
                        'border-gray-200 hover:border-[#16A34A]/30'
                      }`}
                    >
                      {isAttended && <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20 -translate-y-1/2 rounded-full pointer-events-none z-10"></div>}
                      
                      <div className="flex items-center gap-4 z-0">
                        <div className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-lg min-w-[70px]">
                          <span className={`font-bold text-lg ${isAttended ? 'text-gray-500' : 'text-[#16A34A]'}`}>{apt.time ? apt.time.substring(0, 5) : apt.time}</span>
                        </div>
                        
                        <div className="space-y-1 z-0">
                          <p className={`font-bold text-lg ${isAttended ? 'text-gray-500' : 'text-foreground'}`}>
                            {apt.patientName || pat?.name || 'Desconocido'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-600">Prof: <span className="font-semibold">{prof?.shortName || '-'}</span></span>
                            <span className="text-gray-400">•</span>
                            <span className="text-[#16A34A] break-words">{getAppointmentServiceNames(apt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full md:w-auto gap-4 z-0">
                        <div className="flex flex-col items-end gap-1">
                          {isOutside && (
                            <Badge className="bg-red-500 text-white border-red-600 font-bold text-[10px] uppercase">
                              ⚠ Fuera de Horario — Reprogramar
                            </Badge>
                          )}
                          {(() => {
                            if (isAttended) {
                              return <Badge className="bg-secondary text-gray-500 border-gray-200 text-[10px] uppercase">Ya Asistió</Badge>;
                            }
                            if (sNorm === 'programado' || sNorm === 'scheduled') {
                              return <Badge onClick={() => updateAppointment(apt.id, { status: 'confirmado' })} className="bg-sky-100/80 text-sky-600 border-sky-200 font-bold text-[10px] uppercase cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300 transition-colors">Programado</Badge>;
                            }
                            if (sNorm === 'confirmado') {
                              return <Badge className="bg-emerald-500 text-white font-bold text-[10px] uppercase">Confirmado</Badge>;
                            }
                            return <Badge variant="outline">{getStatusText(apt.status as string)}</Badge>;
                          })()}
                        </div>
                        
                        {!isAttended && sNorm !== 'cancelado' && sNorm !== 'cancelled' && (
                          <Button 
                            onClick={() => startAttention(apt.id)}
                            className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold h-10 w-10 p-0 rounded-full flex-shrink-0 shadow-lg"
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

          {mainTab === "caja" && (
            <div className="space-y-6 mt-4">
              
              {/* === NUEVO MÓDULO DE CIERRE DE CAJA (POR RECEPCIONISTA) === */}
              {currentUser && (
                <CashClosureModule receptionistName={currentUser.name} />
              )}

              {/* === RESUMEN GENERAL DIARIO (PARA TODA LA CLÍNICA) === */}
              {(() => {
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
                  }
                });

                return (
                  <Card className="bg-white text-foreground border border-gray-200 shadow-xl rounded-2xl mt-4">
                    <CardHeader>
                      <CardTitle className="text-[#16A34A] flex items-center gap-2 text-2xl">
                        Cierre de Caja Diario General
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-gradient-to-br from-[#16A34A] to-[#14532D] p-8 rounded-2xl border border-emerald-500/30 text-center shadow-lg relative overflow-hidden">
                        <p className="relative z-10 text-xs sm:text-sm text-emerald-100/90 font-bold uppercase tracking-widest mb-2">Ingresos Totales (Dinero Real)</p>
                        <p className="relative z-10 text-5xl sm:text-6xl font-black text-white drop-shadow-md">${totalIncome.toLocaleString()}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center shadow-sm">
                           <p className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-2">Efectivo</p>
                           <p className="text-xl sm:text-2xl font-extrabold text-foreground">${byMethod.efectivo.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center shadow-sm">
                           <p className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-2">Transferencia</p>
                           <p className="text-xl sm:text-2xl font-extrabold text-foreground">${byMethod.transferencia.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center shadow-sm">
                           <p className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-2">Tarjeta</p>
                           <p className="text-xl sm:text-2xl font-extrabold text-foreground">${byMethod.tarjeta.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center shadow-sm">
                           <p className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase mb-2">QR</p>
                           <p className="text-xl sm:text-2xl font-extrabold text-foreground">${byMethod.qr.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

          {mainTab === "comisiones" && (() => {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            // Cuenta solo productos vendidos directamente por recepción
            // (soldBy === 'recepcion'), NO los de profesionales que pasan
            // por recepción al cobrar el turno (esos tienen soldBy = prof.id)
            const receptionSalesCount = sales.reduce((total, s) => {
              const saleDate = new Date(s.date);
              if (saleDate.getMonth() !== currentMonth || saleDate.getFullYear() !== currentYear) return total;
              const receptionItems = (s.items || []).filter(
                item => item.type === 'product' && item.soldBy === 'recepcion'
              );
              return total + receptionItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            }, 0);

            const tInfo = (count: number) => {
              if (count < 10) return { next: 10, label: "5%", nextLabel: "7.5%" }
              if (count < 21) return { next: 21, label: "7.5%", nextLabel: "10%" }
              return { next: count, label: "10%", nextLabel: "MÁXIMO" }
            }
            
            const info = tInfo(receptionSalesCount);
            const progressValue = Math.min((receptionSalesCount / (info.next === receptionSalesCount && info.next > 0 ? info.next : info.next || 1)) * 100, 100);

            return (
              <div className="space-y-6 mt-4">
                <Card className="bg-white border border-[#16A34A]/30 overflow-hidden shadow-xl rounded-2xl w-full">
                  <CardHeader className="py-3 border-b border-[#16A34A]/30 bg-[#F0FDF4] text-center">
                    <CardTitle className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center justify-center gap-2">
                      <Award className="h-4 w-4 text-[#16A34A]" /> Objetivo Mensual - Recepción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    <div className="flex justify-between items-center p-4 rounded-xl border border-[#16A34A]/20">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-medium">Ventas</p>
                        <p className="text-4xl font-extrabold text-foreground">{receptionSalesCount}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-medium">Comisión</p>
                        <Badge className="bg-[#16A34A] text-white text-lg font-bold px-4 py-1.5">{info.label}</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                       <div className="flex justify-between text-xs font-medium text-gray-500">
                         <span>Progreso actual</span>
                         {info.nextLabel !== "MÁXIMO" ? (
                            <span className="font-bold text-emerald-600">{receptionSalesCount} / {info.next} ventas</span>
                         ) : (
                            <span className="font-bold text-emerald-600">¡Alcanzado!</span>
                         )}
                       </div>
                       <Progress value={progressValue} className="h-2.5 bg-gray-200 [&>div]:bg-[#16A34A]" />
                       {info.nextLabel !== "MÁXIMO" ? (
                          <p className="text-[10px] text-gray-400 text-center mt-1 uppercase tracking-wider font-bold">
                            Faltan <span className="text-orange-500">{info.next - receptionSalesCount}</span> para subir al {info.nextLabel}
                          </p>
                       ) : (
                          <p className="text-[10px] text-emerald-600 text-center mt-1 uppercase tracking-wider font-bold">
                            ¡Nivel máximo de comisiones alcanzado!
                          </p>
                       )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}

        </div>
      </div>
      {/* MODAL: Agregar Seña a turno existente */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-white text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-600 font-black text-xl">Agregar Seña a Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {(() => {
              const patientApts = (appointments || []).filter(
                (a: any) => a.patientId === selectedPatient?.id &&
                  !['completado', 'cancelado'].includes(a.status)
              ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
              return (
                <>
                  {patientApts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No hay turnos pendientes para este paciente.</p>
                  ) : (
                    <div className="space-y-2">
                      <Label className="font-bold text-black text-sm">Seleccionar Turno</Label>
                      {patientApts.map((apt: any) => {
                        const prof = professionals.find((p: any) => p.id === apt.professionalId)
                        const isSelected = depositAptId === apt.id
                        return (
                          <button
                            key={apt.id}
                            onClick={() => setDepositAptId(apt.id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm text-black">
                                  {format(new Date(apt.date), "dd/MM/yyyy")} {apt.time}
                                </p>
                                <p className="text-xs text-gray-500">{prof?.shortName || "—"} · {apt.services?.[0]?.serviceName || "Servicio"}</p>
                              </div>
                              {(apt.paidAmount || 0) > 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">
                                  Seña: ${apt.paidAmount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="font-bold text-black text-sm">Monto de la Seña</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Ej: 5000"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      className="border-gray-300 text-black font-bold text-lg h-12"
                    />
                  </div>
                  <Button
                    disabled={!depositAptId || !depositAmount || parseFloat(depositAmount) <= 0}
                    onClick={async () => {
                      const apt = appointments.find((a: any) => a.id === depositAptId)
                      if (!apt) return
                      const newPaid = (apt.paidAmount || 0) + parseFloat(depositAmount)
                      await updateAppointment(depositAptId, { paidAmount: newPaid })
                      setShowDepositModal(false)
                      setDepositAmount("")
                      setDepositAptId("")
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 text-base"
                  >
                    Guardar Seña
                  </Button>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Editar Seña existente */}
      <Dialog open={showEditDepositModal} onOpenChange={setShowEditDepositModal}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600 font-black text-xl">Editar Seña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {(() => {
              const apt = appointments.find((a: any) => a.id === editDepositAptId)
              const pat = apt ? patients.find((p: any) => p.id === apt.patientId) : null
              return apt ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="font-bold text-gray-900">{apt.patientName || pat?.name}</p>
                  <p className="text-gray-500">{apt.services?.map((s: any) => typeof s === 'string' ? s : s.serviceName).join(', ')}</p>
                  <p className="text-xs text-gray-400">{new Date(apt.date).toLocaleDateString()} — {apt.time}</p>
                </div>
              ) : null
            })()}
            <div className="space-y-2">
              <Label className="font-bold text-black">Monto correcto de la seña</Label>
              <Input
                type="number"
                min={0}
                value={editDepositAmount}
                onChange={e => setEditDepositAmount(e.target.value)}
                className="h-12 text-xl font-black text-center bg-white border-amber-300"
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDepositModal(false)} className="flex-1">Cancelar</Button>
              <Button
                disabled={!editDepositAmount || parseFloat(editDepositAmount) < 0}
                onClick={async () => {
                  await updateAppointment(editDepositAptId, { paidAmount: parseFloat(editDepositAmount) })
                  setShowEditDepositModal(false)
                  setEditDepositAptId("")
                  setEditDepositAmount("")
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black"
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
}