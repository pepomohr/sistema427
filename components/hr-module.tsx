"use client"

import { useState } from "react"
import { useClinicStore, type Professional, type WeekSchedule, getCategoryDisplayName, calculateCommissionTab } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Clock, 
  Palmtree,
  Trash2,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  DollarSign
} from "lucide-react"

const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return `${hour}:00`
})

export function HRModule() {
  const {
    professionals,
    updateProfessional,
    addVacation,
    removeVacation,
    toggleProfessionalActive,
    updateHourlyRate,
    appointments,
    services,
    addExpense
  } = useClinicStore()

  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showVacationModal, setShowVacationModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WeekSchedule | null>(null)
  
  const [vacationStart, setVacationStart] = useState("")
  const [vacationEnd, setVacationEnd] = useState("")
  const [vacationReason, setVacationReason] = useState("")

  const [liquidationData, setLiquidationData] = useState<any>(null)
  const [showLiquidationModal, setShowLiquidationModal] = useState(false)

  const handleCalculateLiquidation = (prof: Professional) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Turnos de esta profesional completados en los ultimos 7 dias
    const doneApts = appointments.filter(a => 
      a.professionalId === prof.id && 
      a.status === 'completado' && 
      new Date(a.date) >= weekAgo
    );
    
    let totalMinutes = 0;
    let totalBilledServices = 0;

    doneApts.forEach(apt => {
       totalBilledServices += apt.totalAmount;
       apt.services.forEach(svc => {
          const fullSvc = services.find(s => s.id === svc.serviceId);
          if (fullSvc) {
            totalMinutes += fullSvc.duration;
          }
       });
    });

    const hoursWorked = totalMinutes / 60;
    const hourlyPay = (prof.hourlyRate || 0) * hoursWorked;
    
    // Comisiones
    const commPercent = calculateCommissionTab(prof.monthlySalesCount || 0);
    const commPay = totalBilledServices * (commPercent / 100);

    const payTotal = hourlyPay + commPay;
    
    setLiquidationData({
      prof,
      hoursWorked,
      hourlyPay,
      commPay,
      payTotal,
      doneAptsCount: doneApts.length,
      salesCount: prof.monthlySalesCount // We use monthly as proxy for counting since it's the tier basis
    });
    setShowLiquidationModal(true);
  };

  const handlePayLiquidation = () => {
    if (liquidationData) {
      addExpense({
        description: `Liquidación Semanal - ${liquidationData.prof.name}`,
        amount: liquidationData.payTotal
      });
      setShowLiquidationModal(false);
      setLiquidationData(null);
    }
  };

  // --- SOLUCIÓN AL ERROR DE UNDEFINED ---
  const formatSchedule = (schedule: any) => {
    if (!schedule) return "Sin horario definido"
    const activeDays = DAYS_OF_WEEK.filter((d) => schedule[d.key as keyof typeof schedule])
    if (activeDays.length === 0) return "Sin horario definido"
    
    return activeDays
      .map((d) => {
        const daySchedule = (schedule as any)[d.key]
        if (!daySchedule) return null
        const intervals = Array.isArray(daySchedule) ? daySchedule : [daySchedule]
        const times = intervals.map(i => `${i.start}-${i.end}`).join(", ")
        return `${d.label.slice(0, 3)}: ${times}`
      })
      .filter(Boolean)
      .join(" | ")
  }

  const handleEditSchedule = (professional: Professional) => {
    setSelectedProfessional(professional)
    setEditingSchedule(professional.schedule ? { ...professional.schedule } : ({} as WeekSchedule))
    setShowScheduleModal(true)
  }

  const handleSaveSchedule = () => {
    if (selectedProfessional && editingSchedule) {
      updateProfessional(selectedProfessional.id, { schedule: editingSchedule })
      setShowScheduleModal(false) // Cerrar
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Gestión de Personal</h2>
        <Badge className="bg-[#16A34A] text-white">
          {(professionals || []).filter((p) => p.isActive).length} Activos
        </Badge>
      </div>

      <div className="grid gap-4">
        {professionals?.map((professional) => (
          <Card key={professional.id} className={`bg-card border-gray-200 ${!professional.isActive ? "opacity-60" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div 
                    className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: professional.color || '#16A34A' }}
                  >
                    {professional.avatar || <User className="h-7 w-7" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-foreground">{professional.name}</h3>
                      {professional.isActive ? (
                        <Badge className="bg-green-500/40 text-black font-bold border-green-500/50 text-[10px]">ACTIVO</Badge>
                      ) : (
                        <Badge className="bg-red-500/40 text-black font-bold border-red-500/50 text-[10px]">INACTIVO</Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground italic">
                      {professional.specialties?.map(s => getCategoryDisplayName(s)).join(", ")}
                    </p>

                    {/* SECCIÓN VALOR HORA (PEDIDO NICO) */}
                    <div className="flex items-center gap-2 mt-3 p-2 bg-secondary/10 rounded-lg border border-gray-200/50 w-fit">
                      <DollarSign className="h-4 w-4 text-[#14532D]" />
                      <span className="text-sm font-bold text-[#14532D]">Valor Hora:</span>
                      <Input 
                        type="number"
                        className="w-20 h-7 bg-input border-none text-sm text-[#14532D] font-bold"
                        value={professional.hourlyRate || 0}
                        onChange={(e) => updateHourlyRate(professional.id, parseInt(e.target.value))}
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatSchedule(professional.schedule)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-start">
                  <Button size="sm" onClick={() => handleCalculateLiquidation(professional)} className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold">
                    <DollarSign className="h-3 w-3 mr-1" /> Liquidar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEditSchedule(professional)} className="h-8 text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Horarios
                  </Button>
                  <div className="flex items-center gap-2 px-2 py-1 bg-secondary rounded-md">
                    <Switch 
                      checked={professional.isActive} 
                      onCheckedChange={() => toggleProfessionalActive(professional.id)} 
                      className="scale-75"
                    />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {professional.isActive ? "Pausar" : "Activar"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showLiquidationModal} onOpenChange={setShowLiquidationModal}>
        <DialogContent className="bg-card border-gray-200 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#16A34A] flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Liquidación Semanal
            </DialogTitle>
          </DialogHeader>
          
          {liquidationData && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50">
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: liquidationData.prof.color || '#16A34A' }}>
                  {liquidationData.prof.shortName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{liquidationData.prof.name}</h3>
                  <p className="text-xs text-muted-foreground">Últimos 7 días</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-secondary/10 p-3 rounded-lg border border-gray-200/50">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Sueldo Base (Horas)</p>
                    <p className="text-xs text-muted-foreground">{liquidationData.hoursWorked.toFixed(1)} hs laburadas a ${liquidationData.prof.hourlyRate}/h</p>
                  </div>
                  <span className="font-bold text-foreground">${liquidationData.hourlyPay.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center bg-secondary/10 p-3 rounded-lg border border-gray-200/50">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Comisiones Gabi.</p>
                    <p className="text-xs text-muted-foreground">{liquidationData.doneAptsCount} turnos al {calculateCommissionTab(liquidationData.salesCount)}%</p>
                  </div>
                  <span className="font-bold text-foreground">${liquidationData.commPay.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground">Productos Vendidos</p>
                  </div>
                  <Badge className="bg-[#16A34A]/20 text-[#16A34A]">{liquidationData.salesCount} unidades</Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-[#16A34A]/30 flex justify-between items-end">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total a Pagar</p>
                  <p className="text-3xl font-black text-[#16A34A]">${liquidationData.payTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handlePayLiquidation} className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold h-12 text-lg">
                  Registrar Pago de ${liquidationData.payTotal.toLocaleString()}
                </Button>
                <p className="text-[10px] text-center mt-2 text-muted-foreground italic">Al registrarlo, impactará automáticamente en Gastos y el Neto del mes.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-card border-gray-200 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#16A34A] flex items-center gap-2">
              <Clock className="h-5 w-5" /> Horarios de {selectedProfessional?.shortName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {DAYS_OF_WEEK.map((day) => {
              const schedule = editingSchedule?.[day.key]
              const intervals = Array.isArray(schedule) ? schedule : (schedule ? [schedule] : [])
              const isWorking = intervals.length > 0
              
              return (
                <div key={day.key} className="flex flex-col p-3 bg-secondary/10 rounded-lg border border-gray-200/50 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={isWorking}
                        onCheckedChange={(checked) => {
                          if(checked) {
                            setEditingSchedule({
                              ...editingSchedule,
                              [day.key]: [{ start: "09:00", end: "18:00" }]
                            })
                          } else {
                            const newSched = {...editingSchedule}
                            delete newSched[day.key]
                            setEditingSchedule(newSched)
                          }
                        }}
                      />
                      <span className={`font-medium ${isWorking ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {day.label}
                      </span>
                    </div>
                    {isWorking && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newIntervals = [...intervals, { start: "15:00", end: "19:00" }]
                        setEditingSchedule({...editingSchedule, [day.key]: newIntervals})
                      }} className="h-6 w-6 p-0 text-[#16A34A]">
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isWorking && intervals.map((interval: any, index: number) => (
                    <div key={index} className="flex items-center justify-end gap-2 pr-2">
                      <Select 
                        value={interval.start}
                        onValueChange={(val) => {
                          const newIntervals = [...intervals]
                          newIntervals[index].start = val
                          setEditingSchedule({...editingSchedule, [day.key]: newIntervals})
                        }}
                      >
                       <SelectTrigger className="w-[85px] h-8 text-[11px] bg-input border-gray-200"><SelectValue/></SelectTrigger>
                       <SelectContent className="bg-card border-gray-200">
                         {TIME_OPTIONS.map(t => <SelectItem key={`start-${t}`} value={t}>{t}</SelectItem>)}
                       </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs">a</span>
                      <Select 
                        value={interval.end}
                        onValueChange={(val) => {
                          const newIntervals = [...intervals]
                          newIntervals[index].end = val
                          setEditingSchedule({...editingSchedule, [day.key]: newIntervals})
                        }}
                      >
                       <SelectTrigger className="w-[85px] h-8 text-[11px] bg-input border-gray-200"><SelectValue/></SelectTrigger>
                       <SelectContent className="bg-card border-gray-200">
                         {TIME_OPTIONS.map(t => <SelectItem key={`end-${t}`} value={t}>{t}</SelectItem>)}
                       </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-400" onClick={() => {
                        const newIntervals = intervals.filter((_: any, i: number) => i !== index)
                        if (newIntervals.length === 0) {
                          const newSched = {...editingSchedule}
                          delete newSched[day.key]
                          setEditingSchedule(newSched)
                        } else {
                          setEditingSchedule({...editingSchedule, [day.key]: newIntervals})
                        }
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancelar</Button>
            <Button className="bg-[#16A34A] text-white hover:bg-[#15803D] font-bold" onClick={handleSaveSchedule}>
              Guardar Horarios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}