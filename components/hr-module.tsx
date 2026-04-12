"use client"

import { useState, useEffect } from "react"
import { useClinicStore, type Professional, type WeekSchedule, getCategoryDisplayName, calculateCommissionTab } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useConfirm } from "@/hooks/use-confirm"
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
  Trash2,
  Plus,
  User,
  DollarSign,
  KeyRound
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

const TIME_OPTIONS: string[] = []
for(let h=9; h<=21; h++) {
  const hr = h.toString().padStart(2, "0")
  TIME_OPTIONS.push(`${hr}:00`, `${hr}:30`)
}

export function HRModule() {
  const {
    professionals,
    updateProfessional,
    resetProfessionalPin,
    toggleProfessionalActive,
    updateHourlyRate,
    appointments,
    services,
    addExpense,
    fetchProfessionals,
    addProfessional
  } = useClinicStore()

  const { confirm, ConfirmDialog } = useConfirm()

  // 🚀 ARREGLO AQUÍ: Array de dependencias vacío [] para evitar el error de tamaño
  useEffect(() => {
    const loadData = async () => {
      if (typeof fetchProfessionals === 'function') {
        await fetchProfessionals();
      }
    };
    loadData();
  }, []); // Antes tenía [fetchProfessionals], ahora vacío para ser estable

  const [showNewProfessionalModal, setShowNewProfessionalModal] = useState(false)
  const [newProfData, setNewProfData] = useState({ 
    name: "", 
    shortName: "", 
    specialties: [] as any[], 
    color: "#16A34A", 
    hourlyRate: 5000,
    hourlyRateFacial: 0,
    hourlyRateCorporal: 0
  })
  
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WeekSchedule | null>(null)
  const [editingExceptions, setEditingExceptions] = useState<Record<string, { start: string, end: string }[]> | null>(null)
  const [liquidationData, setLiquidationData] = useState<any>(null)
  const [showLiquidationModal, setShowLiquidationModal] = useState(false)

  const handleCalculateLiquidation = (prof: Professional) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const doneApts = appointments.filter(a => 
      a.professionalId === prof.id && 
      a.status === 'completado' && 
      new Date(a.date) >= weekAgo
    );
    
    let totalMinutes = 0;
    let facialMinutes = 0;
    let corporalMinutes = 0;
    let totalBilledServices = 0;

    doneApts.forEach(apt => {
       totalBilledServices += apt.totalAmount;
       apt.services.forEach(svc => {
          const fullSvc = services.find(s => s.id === svc.serviceId);
          if (fullSvc) {
            totalMinutes += fullSvc.duration;
            const cat = fullSvc.category.trim().toLowerCase();
            if (['facial', 'facial/escote', 'escote'].includes(cat)) facialMinutes += fullSvc.duration;
            else if (['corporales', 'corporal'].includes(cat)) corporalMinutes += fullSvc.duration;
          }
       });
    });

    const isMartina = prof.name.toLowerCase().includes('martina') || prof.shortName.toLowerCase().includes('martina');
    const isFiorella = prof.name.toLowerCase().includes('fiorella') || prof.shortName.toLowerCase().includes('fiorella');
    const isBianca = prof.name.toLowerCase().includes('bianca') || prof.shortName.toLowerCase().includes('bianca');

    let hourlyPay = 0;
    let commPay = 0;
    let isCommissionOnly = isMartina || isFiorella || isBianca;
    let commPercent = isCommissionOnly ? (prof.hourlyRate || (isFiorella ? 40 : 50)) : calculateCommissionTab(prof.monthlySalesCount || 0);

    if (!isCommissionOnly) {
       if (prof.hourlyRateFacial && prof.hourlyRateCorporal) {
          hourlyPay = ((facialMinutes / 60) * prof.hourlyRateFacial) + ((corporalMinutes / 60) * prof.hourlyRateCorporal);
       } else {
          hourlyPay = (prof.hourlyRate || 0) * (totalMinutes / 60);
       }
    }
    
    commPay = totalBilledServices * (commPercent / 100);
    
    setLiquidationData({
      prof, hourlyPay, commPay, payTotal: hourlyPay + commPay,
      doneAptsCount: doneApts.length, salesCount: prof.monthlySalesCount,
      isCommissionOnly, commPercent, totalBilledServices
    });
    setShowLiquidationModal(true);
  };

  const handleSaveSchedule = () => {
    if (selectedProfessional && editingSchedule) {
      updateProfessional(selectedProfessional.id, { schedule: editingSchedule, exceptions: editingExceptions || {} })
      setShowScheduleModal(false)
    }
  }

  const handleCreateProfessional = async () => {
    if(!newProfData.name || !newProfData.shortName) return;
    await addProfessional({
      ...newProfData,
      isActive: true,
      monthlySalesCount: 0
    });
    setShowNewProfessionalModal(false);
    setNewProfData({ name: "", shortName: "", specialties: [], color: "#16A34A", hourlyRate: 5000, hourlyRateFacial: 0, hourlyRateCorporal: 0 });
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Gestión de Personal</h2>
        <Button onClick={() => setShowNewProfessionalModal(true)} className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold h-10 px-4 shadow-md">
          <Plus className="h-5 w-5 mr-2" /> Nuevo Profesional
        </Button>
      </div>

      <div className="grid gap-4">
        {professionals?.map((professional) => (
          <Card key={professional.id} className={`bg-white border-gray-200 shadow-sm ${!professional.isActive ? "opacity-60 grayscale" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold shadow-inner" style={{ backgroundColor: professional.color || '#16A34A' }}>
                    {professional.shortName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-foreground">{professional.name}</h3>
                      <Badge className={professional.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                        {professional.isActive ? "ACTIVO" : "PAUSADO"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{professional.specialties?.map(s => getCategoryDisplayName(s)).join(" • ")}</p>

                    <div className="flex flex-wrap gap-3 mt-4">
                       {['martina', 'fiorella', 'bianca'].some(n => professional.name.toLowerCase().includes(n)) ? (
                         <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-xl border border-orange-200">
                           <DollarSign className="h-4 w-4 text-orange-600" />
                           <span className="text-xs font-bold text-orange-700">Comisión:</span>
                           <Input type="number" className="w-16 h-8 bg-white text-center font-bold" value={professional.hourlyRate} onChange={(e) => updateHourlyRate(professional.id, parseInt(e.target.value))} />
                           <span className="text-xs font-bold text-orange-700">%</span>
                         </div>
                       ) : (
                         <>
                           <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                             <DollarSign className="h-4 w-4 text-emerald-600" />
                             <span className="text-xs font-bold text-emerald-700">Facial: $</span>
                             <Input type="number" className="w-20 h-8 bg-white text-center font-bold" value={professional.hourlyRateFacial || professional.hourlyRate} onChange={(e) => updateProfessional(professional.id, { hourlyRateFacial: parseInt(e.target.value) })} />
                           </div>
                           <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                             <DollarSign className="h-4 w-4 text-emerald-600" />
                             <span className="text-xs font-bold text-emerald-700">Corporal: $</span>
                             <Input type="number" className="w-20 h-8 bg-white text-center font-bold" value={professional.hourlyRateCorporal || professional.hourlyRate} onChange={(e) => updateProfessional(professional.id, { hourlyRateCorporal: parseInt(e.target.value) })} />
                           </div>
                         </>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button onClick={() => handleCalculateLiquidation(professional)} className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 shadow-sm">
                    <DollarSign className="h-4 w-4 mr-2" /> Liquidar Semana
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedProfessional(professional);
                    setEditingSchedule(professional.schedule || {});
                    setEditingExceptions(professional.exceptions || {});
                    setShowScheduleModal(true);
                  }} className="h-10 border-gray-300 font-bold">
                    <Clock className="h-4 w-4 mr-2" /> Horarios
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-10 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold" 
                    onClick={() => {
                      confirm({
                        title: "¿Resetear PIN?",
                        description: `Se eliminará el PIN de ${professional.shortName}. Deberá elegir uno nuevo al ingresar.`,
                        onConfirm: async () => {
                          await resetProfessionalPin(professional.id);
                          confirm({
                            title: "PIN Reseteado",
                            description: `El acceso de ${professional.shortName} fue restablecido con éxito.`,
                            actionType: "success",
                            confirmText: "Entendido",
                            onConfirm: () => {}
                          });
                        }
                      })
                  }}>
                    <KeyRound className="h-4 w-4 mr-2" /> Reset PIN
                  </Button>
                  <Switch checked={professional.isActive} onCheckedChange={() => toggleProfessionalActive(professional.id)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showNewProfessionalModal} onOpenChange={setShowNewProfessionalModal}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Agregar Personal al Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2"><Label>Nombre Completo</Label><Input value={newProfData.name} onChange={e => setNewProfData({...newProfData, name: e.target.value})} placeholder="Ej: Martina Soria" /></div>
              <div className="space-y-2"><Label>Nombre Corto</Label><Input value={newProfData.shortName} onChange={e => setNewProfData({...newProfData, shortName: e.target.value})} placeholder="Ej: Martu" /></div>
              <div className="space-y-2"><Label>Color</Label><Input type="color" className="h-10" value={newProfData.color} onChange={e => setNewProfData({...newProfData, color: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Especialidades (Separadas por coma)</Label><Input placeholder="Facial, Corporales, CyP..." onChange={e => setNewProfData({...newProfData, specialties: e.target.value.split(',').map(s=>s.trim())})} /></div>
            <Button className="w-full bg-[#16A34A] text-white font-bold h-12" onClick={handleCreateProfessional}>DAR DE ALTA PROFESIONAL</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLiquidationModal} onOpenChange={setShowLiquidationModal}>
        <DialogContent className="bg-white sm:max-w-[450px]">
          <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-orange-600" /> Detalle de Liquidación</DialogTitle></DialogHeader>
          {liquidationData && (
            <div className="space-y-5 pt-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Total a entregar a {liquidationData.prof.shortName}</p>
                <p className="text-4xl font-black text-[#16A34A]">${liquidationData.payTotal.toLocaleString()}</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>{liquidationData.isCommissionOnly ? `Comisión (${liquidationData.commPercent}%)` : 'Sueldo Base'}</span><span className="font-bold">${(liquidationData.isCommissionOnly ? liquidationData.commPay : liquidationData.hourlyPay).toLocaleString()}</span></div>
                {!liquidationData.isCommissionOnly && <div className="flex justify-between text-sm"><span>Comisiones por Ventas</span><span className="font-bold">${liquidationData.commPay.toLocaleString()}</span></div>}
                <div className="flex justify-between text-xs text-muted-foreground italic border-t pt-2"><span>Facturación Gabinete</span><span>${liquidationData.totalBilledServices.toLocaleString()}</span></div>
              </div>
              <Button onClick={() => {
                addExpense({ description: `Pago Staff: ${liquidationData.prof.name}`, amount: liquidationData.payTotal });
                setShowLiquidationModal(false);
              }} className="w-full bg-[#16A34A] text-white font-black h-14 text-lg shadow-lg">CONFIRMAR PAGO Y REGISTRAR GASTO</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}