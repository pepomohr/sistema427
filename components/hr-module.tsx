"use client"

import React, { useState, useEffect } from "react"
import { useClinicStore, type Professional, type WeekSchedule, getCategoryDisplayName, type ServiceCategory } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useConfirm } from "@/hooks/use-confirm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Plus, KeyRound, Trash2, X, Loader2 } from "lucide-react"

const ALL_SPECIALTIES: ServiceCategory[] = ['Facial', 'Corporales', 'CyP', 'Uñas', 'Maderoterapia', 'Capilar', 'Depilación', 'Planes']
const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" }, { key: "tuesday", label: "Martes" }, { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" }, { key: "friday", label: "Viernes" }, { key: "saturday", label: "Sábado" }, { key: "sunday", label: "Domingo" }
]
const TIME_OPTIONS: string[] = []
for(let h=8; h<=21; h++) {
  const hr = h.toString().padStart(2, "0")
  TIME_OPTIONS.push(`${hr}:00`, `${hr}:30`)
}

const calculateWeeklyHours = (schedule?: WeekSchedule | any) => {
  if (!schedule) return 0;
  let total = 0;
  Object.values(schedule).forEach(dayData => {
    const shifts = Array.isArray(dayData) ? dayData : [dayData];
    shifts.forEach(shift => {
      if (shift?.start && shift?.end) {
        const [hStart, mStart] = shift.start.split(':').map(Number);
        const [hEnd, mEnd] = shift.end.split(':').map(Number);
        const diff = (hEnd + mEnd/60) - (hStart + mStart/60);
        if (diff > 0) total += diff;
      }
    });
  });
  return total;
};

export function HRModule() {
  const { professionals, updateProfessional, resetProfessionalPin, toggleProfessionalActive, updateHourlyRate, appointments, fetchProfessionals, addProfessional } = useClinicStore()
  const { confirm, ConfirmDialog } = useConfirm()
  const [resettingPinId, setResettingPinId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof fetchProfessionals === 'function') fetchProfessionals()
  }, [fetchProfessionals])

  const [showNewModal, setShowNewModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<WeekSchedule | null>(null)
  
  const [newProfData, setNewProfData] = useState<any>({ name: "", shortName: "", specialties: [] as ServiceCategory[], color: "#16A34A", hourlyRate: 50, hourlyRateFacial: '', hourlyRateCorporal: '' })
  const [isCommissionMode, setIsCommissionMode] = useState(true)

  // --- HANDLERS ---
  const handleEditSchedule = (prof: Professional) => {
    setSelectedProf(prof)
    setEditingSchedule(prof.schedule || {})
    setShowScheduleModal(true)
  }

  const handleSaveSchedule = async () => {
    if (selectedProf && editingSchedule) {
      await updateProfessional(selectedProf.id, { schedule: editingSchedule })
      setShowScheduleModal(false)
      confirm({ title: "Horarios Guardados", actionType: "success", confirmText: "Cerrar", onConfirm: () => {} })
    }
  }

  const toggleSpecialty = (s: ServiceCategory) => {
    setNewProfData((prev: any) => ({
      ...prev,
      specialties: prev.specialties.includes(s) ? prev.specialties.filter((x: any) => x !== s) : [...prev.specialties, s]
    }))
  }

  const handleResetPin = (p: Professional) => {
    confirm({ 
      title: "¿Resetear PIN?", 
      description: `Se borrará el PIN de ${p.shortName}. La próxima vez que inicie sesión, el sistema le pedirá crear uno nuevo.`, 
      onConfirm: async () => { 
        setResettingPinId(p.id);
        try {
          await resetProfessionalPin(p.id); 
          confirm({title: "PIN Borrado", description: "El acceso ha sido reseteado exitosamente.", actionType:"success", onConfirm:()=>{}}) 
        } catch (error) {
          alert("Error al resetear el PIN. Verificá la conexión.");
        } finally {
          setResettingPinId(null);
        }
      }
    })
  }

  // --- LÓGICA DE LIQUIDACIÓN ---
  const handleLiquidarSemana = (p: Professional) => {
    const weeklyHours = calculateWeeklyHours(p.schedule);
    const isCommission = !p.hourlyRateFacial && !p.hourlyRateCorporal && p.hourlyRate != null && p.hourlyRate <= 100;

    let totalPay = 0;
    let detailContent: React.ReactNode = null;

    if (isCommission) {
      const profAppointments = appointments?.filter(a => a.professionalId === p.id) || []; // CORRECCIÓN: a.profId no existe, es professionalId
      const totalSales = profAppointments.reduce((acc, a) => acc + (a.totalAmount || a.paidAmount || 0), 0); // CORRECCIÓN: price no existe en appointment root
      totalPay = totalSales * (p.hourlyRate! / 100);

      detailContent = (
        <span className="block space-y-1 mt-2">
          <span className="block text-gray-600">Turnos atendidos: {profAppointments.length}</span>
          <span className="block text-gray-600">Facturación Total: ${totalSales}</span>
          <span className="block text-lg font-black text-gray-900 mt-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
            Comisión ({p.hourlyRate}%): ${totalPay.toFixed(2)}
          </span>
        </span>
      );
      
    } else {
      if (weeklyHours === 0) {
        confirm({ title: "Sin horas asignadas", description: `${p.shortName} no tiene horas en su cronograma.`, confirmText: "Cerrar", onConfirm: () => {} });
        return;
      }

      const rateFacial = p.hourlyRateFacial || 0;
      const rateCorporal = p.hourlyRateCorporal || 0;
      
      const hasBothRates = p.hourlyRateFacial !== null && p.hourlyRateFacial !== undefined && rateFacial !== rateCorporal;

      if (hasBothRates) {
          // CORRECCIÓN: Lógica adaptada para buscar categorías dentro del array services de Appointment
          const corporalAppointments = appointments?.filter(a => a.professionalId === p.id && a.services?.some(s => s.category === 'Corporales')) || [];
          const corporalHours = corporalAppointments.length; 
          const normalHours = Math.max(0, weeklyHours - corporalHours);
          
          totalPay = (normalHours * rateFacial) + (corporalHours * rateCorporal);

          detailContent = (
            <span className="block space-y-1 mt-2">
              <span className="block text-gray-600">Horas faciales a liquidar: {normalHours}</span>
              <span className="block text-gray-600">Horas corporales a liquidar: {corporalHours}</span>
              <span className="block text-lg font-black text-gray-900 mt-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                Total a Pagar: ${totalPay}
              </span>
            </span>
          );
      } else {
          const singleRate = p.hourlyRate || rateFacial || rateCorporal || 0;
          totalPay = weeklyHours * singleRate;

          detailContent = (
            <span className="block space-y-1 mt-2">
              <span className="block text-gray-600">Horas a liquidar: {weeklyHours}</span>
              <span className="block text-gray-600">A ${singleRate} la hora</span>
              <span className="block text-lg font-black text-gray-900 mt-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                Total a Pagar: ${totalPay}
              </span>
            </span>
          );
      }
    }

    confirm({
      title: `Liquidar Semana: ${p.shortName}`,
      description: (
        <span className="block space-y-4">
          {detailContent}
          <span className="block text-sm font-medium text-gray-500 pt-2 border-t border-gray-100">
            ¿Deseas registrar este pago en los gastos del consultorio?
          </span>
        </span>
      ),
      confirmText: "Aprobar y Registrar",
      onConfirm: () => {
        alert(`Liquidación de $${totalPay} guardada correctamente.`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      
      <div className="flex items-center justify-between px-4">
        <h2 className="text-2xl font-bold text-[#16A34A]">Gestión de Personal</h2>
        <Button onClick={() => setShowNewModal(true)} className="bg-[#16A34A] hover:bg-[#15803d] text-white rounded-md h-10 px-4 font-medium shadow-sm">
          <Plus className="h-5 w-5 mr-2" /> Nuevo Profesional
        </Button>
      </div>

      <div className="grid gap-4 px-4">
        {professionals?.map((p) => {
          const isCommission = !p.hourlyRateFacial && !p.hourlyRateCorporal && p.hourlyRate != null && p.hourlyRate <= 100;
          const hasDoubleRate = p.hourlyRateFacial !== null && p.hourlyRateFacial !== undefined;

          return (
            <Card key={p.id} className={`bg-white border-gray-200 shadow-sm transition-all ${!p.isActive ? "opacity-60 grayscale" : ""}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  
                  {/* SECCIÓN IZQUIERDA: INFO Y PRECIOS */}
                  <div className="flex flex-col gap-4 w-full lg:max-w-md">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full flex shrink-0 items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: p.color || '#16A34A' }}>
                          {p.shortName?.substring(0, 2).toUpperCase() || p.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold text-gray-900">{p.name}</h3>
                            <Badge className={p.isActive ? "bg-emerald-100 text-emerald-700 border-none px-2" : "bg-gray-100 text-gray-500 border-none px-2"}>
                              {p.isActive ? "ACTIVO" : "EN PAUSA"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {p.specialties?.map(s => getCategoryDisplayName(s)).join(" / ")}
                          </p>
                        </div>
                    </div>

                    {/* CAJA DE PRECIOS EDITABLE DIRECTO EN LA TARJETA */}
                    <div className="flex flex-col gap-2 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              {isCommission ? 'Pago: Comisión por Turno' : 'Pago: Sueldo Fijo por Hora'}
                          </span>
                          <Switch
                              checked={isCommission}
                              onCheckedChange={(val) => {
                                  if (val) {
                                      updateProfessional(p.id, { hourlyRateFacial: null, hourlyRateCorporal: null, hourlyRate: p.hourlyRate && p.hourlyRate <= 100 ? p.hourlyRate : 50 });
                                  } else {
                                      updateProfessional(p.id, { hourlyRateFacial: null, hourlyRateCorporal: null, hourlyRate: 3000 });
                                  }
                              }}
                          />
                      </div>
                      <div className="flex items-center gap-2">
                          {isCommission ? (
                              <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg px-3 py-1.5 w-full">
                                  <span className="text-green-700 text-sm font-semibold">% Porcentaje:</span>
                                  <Input type="number" className="w-full h-7 border-none bg-transparent text-gray-900 font-black focus-visible:ring-0 p-0 text-right" value={p.hourlyRate || ''} onChange={e => updateHourlyRate(p.id, parseInt(e.target.value) || 0)} />
                              </div>
                          ) : hasDoubleRate ? (
                              <div className="flex items-center gap-2 w-full">
                                  <div className="flex flex-1 items-center gap-2 border border-gray-200 bg-white rounded-lg px-2 py-1.5 shadow-sm">
                                      <span className="text-gray-500 text-xs font-bold truncate">Facial $</span>
                                      <Input type="number" className="w-full h-7 border-none bg-transparent text-gray-900 font-black focus-visible:ring-0 p-0 text-right" value={p.hourlyRateFacial || ''} onChange={e => updateProfessional(p.id, {hourlyRateFacial: parseInt(e.target.value) || null})} />
                                  </div>
                                  <div className="flex flex-1 items-center gap-2 border border-gray-200 bg-white rounded-lg px-2 py-1.5 shadow-sm">
                                      <span className="text-gray-500 text-xs font-bold">Corp $</span>
                                      <Input type="number" className="w-full h-7 border-none bg-transparent text-gray-900 font-black focus-visible:ring-0 p-0 text-right" value={p.hourlyRateCorporal || ''} onChange={e => updateProfessional(p.id, {hourlyRateCorporal: parseInt(e.target.value) || null})} />
                                  </div>
                                  <button onClick={() => updateProfessional(p.id, {hourlyRateFacial: null, hourlyRateCorporal: null})} className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1">
                                      <X size={18} strokeWidth={3}/>
                                  </button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 w-full">
                                  <div className="flex flex-1 items-center gap-2 border border-gray-200 bg-white rounded-lg px-3 py-1.5 shadow-sm">
                                      <span className="text-gray-500 text-xs font-bold uppercase">Sueldo Hora $</span>
                                      <Input type="number" className="w-full h-7 border-none bg-transparent text-gray-900 font-black focus-visible:ring-0 p-0 text-right" value={p.hourlyRate || ''} onChange={e => updateHourlyRate(p.id, parseInt(e.target.value) || 0)} />
                                  </div>
                                  <button onClick={() => updateProfessional(p.id, {hourlyRateFacial: p.hourlyRate || 3000, hourlyRateCorporal: p.hourlyRate || 4000})} className="text-[#16A34A] hover:bg-green-50 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-green-200 shrink-0">
                                      <Plus size={18} strokeWidth={3}/>
                                  </button>
                              </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN DERECHA: BOTONES DE ACCIÓN */}
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:mt-4">
                    <Button onClick={() => handleLiquidarSemana(p)} className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-md font-semibold h-10 px-4 shadow-sm w-full lg:w-auto">
                      $ Liquidar Semana
                    </Button>
                    
                    <div className="flex flex-col items-center gap-1 w-full lg:w-auto">
                      <Button onClick={() => handleEditSchedule(p)} variant="outline" className="rounded-md h-10 px-4 border-gray-300 text-gray-700 hover:bg-gray-50 w-full lg:w-auto">
                          <Clock size={16} className="mr-2"/> Horarios
                      </Button>
                      <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{calculateWeeklyHours(p.schedule)} hs asignadas</span>
                    </div>

                    <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                      <Button 
                        onClick={() => handleResetPin(p)} 
                        variant="outline" 
                        disabled={resettingPinId === p.id}
                        className="text-blue-500 rounded-md h-10 px-4 border-gray-300 hover:bg-blue-50 w-full lg:w-auto"
                      >
                        {resettingPinId === p.id ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <KeyRound size={16} className="mr-2" />
                        )}
                        Reset PIN
                      </Button>
                      
                      <Switch checked={p.isActive} onCheckedChange={() => toggleProfessionalActive(p.id)} />
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-white rounded-xl max-w-sm p-6">
          <DialogHeader><DialogTitle className="text-center font-bold text-[#16A34A] text-lg uppercase tracking-wide">Cronograma: {selectedProf?.shortName}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            {DAYS_OF_WEEK.map((day) => {
              const rawSched = (editingSchedule as any)?.[day.key];
              const shifts = Array.isArray(rawSched) ? rawSched : (rawSched ? [rawSched] : []);
              const isActive = shifts.length > 0;

              return (
                <div key={day.key} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Switch checked={isActive} onCheckedChange={(val) => {
                            const newS = {...editingSchedule} as any; 
                            if(val) newS[day.key] = [{start: "09:00", end: "18:00"}]; else delete newS[day.key]
                            setEditingSchedule(newS)
                        }} />
                        <span className="text-sm font-semibold w-20">{day.label}</span>
                    </div>
                    {isActive && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#16A34A] hover:bg-green-50" onClick={() => {
                            const newS = {...editingSchedule} as any;
                            newS[day.key] = [...shifts, {start: "16:00", end: "20:00"}];
                            setEditingSchedule(newS);
                        }}>
                            <Plus size={16} />
                        </Button>
                    )}
                  </div>
                  
                  {isActive && shifts.map((sched: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 justify-end pl-8">
                        <Select value={sched.start} onValueChange={(v) => {
                            const newS = {...editingSchedule} as any;
                            newS[day.key][index] = {...sched, start: v};
                            setEditingSchedule(newS);
                        }}>
                            <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="text-xs text-gray-500">a</span>
                        <Select value={sched.end} onValueChange={(v) => {
                            const newS = {...editingSchedule} as any;
                            newS[day.key][index] = {...sched, end: v};
                            setEditingSchedule(newS);
                        }}>
                            <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                        </Select>
                        
                        {index > 0 ? (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                const newS = {...editingSchedule} as any;
                                newS[day.key] = shifts.filter((_: any, i: number) => i !== index);
                                setEditingSchedule(newS);
                            }}>
                                <Trash2 size={16} />
                            </Button>
                        ) : (
                            <div className="w-8"></div>
                        )}
                      </div>
                  ))}
                </div>
              )
            })}
            <Button onClick={handleSaveSchedule} className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white font-bold h-12 rounded-lg mt-4">Guardar Cronograma</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="bg-white rounded-xl max-w-md p-6 text-left">
            <DialogHeader><DialogTitle className="text-left font-bold text-gray-900 text-xl">Nuevo Profesional</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Nombre Completo</Label><Input value={newProfData.name} onChange={e=>setNewProfData({...newProfData, name: e.target.value})} placeholder="Ej: Sabrina Gomez" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre Corto</Label><Input value={newProfData.shortName} onChange={e=>setNewProfData({...newProfData, shortName: e.target.value})} placeholder="Sabri" /></div>
                    <div className="space-y-2"><Label>Color Identificador</Label><Input type="color" value={newProfData.color} onChange={e=>setNewProfData({...newProfData, color: e.target.value})} className="h-10 p-1 cursor-pointer w-full" /></div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <span className="text-sm font-semibold text-gray-700">{isCommissionMode ? 'Esquema de Pago: Comisión %' : 'Esquema de Pago: Sueldo Fijo'}</span>
                        <Switch checked={isCommissionMode} onCheckedChange={setIsCommissionMode} />
                    </div>
                    
                    {isCommissionMode ? (
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Porcentaje de Comisión (%)</Label>
                            <Input type="number" value={newProfData.hourlyRate} onChange={e=>setNewProfData({...newProfData, hourlyRate: parseInt(e.target.value) || 0})} className="w-full bg-white font-bold" placeholder="Ej: 50" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Valor Único o Facial ($)</Label>
                                <Input type="number" value={newProfData.hourlyRateFacial} onChange={e=>setNewProfData({...newProfData, hourlyRateFacial: parseInt(e.target.value) || null})} className="bg-white font-bold" placeholder="Ej: 3000" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Valor Corporal ($) <span className="font-normal italic">(Opcional)</span></Label>
                                <Input type="number" value={newProfData.hourlyRateCorporal} onChange={e=>setNewProfData({...newProfData, hourlyRateCorporal: parseInt(e.target.value) || null})} className="bg-white font-bold" placeholder="Si es igual, dejar vacío" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3 pt-2">
                    <Label className="text-gray-500 text-sm">Especialidades</Label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_SPECIALTIES.map(s => (
                            <Badge key={s} onClick={()=>toggleSpecialty(s)} className={`cursor-pointer px-3 py-1 text-xs transition-colors ${newProfData.specialties.includes(s) ? 'bg-[#16A34A] hover:bg-[#15803d] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} variant="secondary">{getCategoryDisplayName(s)}</Badge>
                        ))}
                    </div>
                </div>
                <Button onClick={async () => { 
                    const finalData = { ...newProfData, isActive: true, monthlySalesCount: 0 };
                    if (isCommissionMode) {
                        finalData.hourlyRateFacial = null;
                        finalData.hourlyRateCorporal = null;
                    } else {
                        if (!finalData.hourlyRateCorporal) {
                            finalData.hourlyRate = finalData.hourlyRateFacial; 
                            finalData.hourlyRateFacial = null;
                        } else {
                            finalData.hourlyRate = null;
                        }
                    }
                    await addProfessional(finalData); 
                    setShowNewModal(false); 
                    confirm({title:"Alta Exitosa", actionType:"success", onConfirm:()=>{}}) 
                }} className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white font-bold mt-2">Dar de Alta</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}