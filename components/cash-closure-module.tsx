"use client"

import { useState, useMemo } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useConfirm } from "@/hooks/use-confirm"
import { Lock, Calculator, Clock, CalendarDays, User, Users, History, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"

type ClosureMode = "propio" | "general"
type ShiftPreset = "mañana" | "tarde" | "completo" | "custom"

export function CashClosureModule({ receptionistName }: { receptionistName: string }) {
  const { sales, cashClosures, addCashClosure } = useClinicStore()
  const { confirm, ConfirmDialog } = useConfirm()

  const [mode, setMode] = useState<ClosureMode>("propio")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [timeFrom, setTimeFrom] = useState<string>("08:00")
  const [timeTo, setTimeTo] = useState<string>("14:00")
  const [shiftPreset, setShiftPreset] = useState<ShiftPreset>("mañana")
  const [observations, setObservations] = useState<string>("")
  const [showHistory, setShowHistory] = useState(false)

  const setPreset = (preset: ShiftPreset) => {
    setShiftPreset(preset)
    if (preset === "mañana") { setTimeFrom("08:00"); setTimeTo("14:00") }
    else if (preset === "tarde") { setTimeFrom("14:00"); setTimeTo("21:00") }
    else if (preset === "completo") { setTimeFrom("00:00"); setTimeTo("23:59") }
  }

  const closureMetrics = useMemo(() => {
    if (!sales || sales.length === 0) return { efectivo: 0, transferencia: 0, tarjeta: 0, qr: 0, total: 0, count: 0 }

    const filterDateStr = new Date(selectedDate).toDateString()
    const [fromH, fromM] = timeFrom.split(':').map(Number)
    const fromInMins = fromH * 60 + fromM
    const [toH, toM] = timeTo.split(':').map(Number)
    const toInMins = toH * 60 + toM

    const filteredSales = sales.filter((s: any) => {
      const saleDate = new Date(s.date)
      if (saleDate.toDateString() !== filterDateStr) return false
      const saleTimeInMins = saleDate.getHours() * 60 + saleDate.getMinutes()
      if (saleTimeInMins < fromInMins || saleTimeInMins > toInMins) return false
      if (mode === "propio" && s.processedBy !== receptionistName) return false
      return true
    })

    const metrics = { efectivo: 0, transferencia: 0, tarjeta: 0, qr: 0, total: 0, count: filteredSales.length }

    filteredSales.forEach((s: any) => {
      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach((split: any) => {
          if (split.method === 'efectivo') metrics.efectivo += split.amount
          if (split.method === 'transferencia') metrics.transferencia += split.amount
          if (split.method === 'tarjeta') metrics.tarjeta += split.amount
          if (split.method === 'qr') metrics.qr += split.amount
          if (split.method !== 'gift_card') metrics.total += split.amount
        })
      } else {
        if (s.paymentMethod === 'efectivo') metrics.efectivo += s.total
        if (s.paymentMethod === 'transferencia') metrics.transferencia += s.total
        if (s.paymentMethod === 'tarjeta') metrics.tarjeta += s.total
        if (s.paymentMethod === 'qr') metrics.qr += s.total
        if (s.paymentMethod !== 'gift_card') metrics.total += s.total
      }
    })

    return metrics
  }, [sales, selectedDate, timeFrom, timeTo, mode, receptionistName])

  const historialFiltrado = useMemo(() => {
    if (!cashClosures) return []
    return [...cashClosures]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30)
  }, [cashClosures])

  const handleSubmitClosure = () => {
    confirm({
      title: "Confirmar Cierre de Caja",
      description: `¿Confirmás el cierre ${mode === "propio" ? "de tu turno" : "GENERAL"} con un total de $${closureMetrics.total.toLocaleString()}?`,
      actionType: "success",
      onConfirm: async () => {
        const dateFromReal = new Date(`${selectedDate}T${timeFrom}:00`)
        const dateToReal = new Date(`${selectedDate}T${timeTo}:00`)

        await addCashClosure({
          receptionistName: mode === "general" ? `[GENERAL] ${receptionistName}` : receptionistName,
          dateFrom: dateFromReal,
          dateTo: dateToReal,
          amountEfectivo: closureMetrics.efectivo,
          amountTransferencia: closureMetrics.transferencia,
          amountTarjeta: closureMetrics.tarjeta,
          amountQr: closureMetrics.qr,
          total: closureMetrics.total,
          observations: observations || undefined
        })

        setObservations("")
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4">
          <CardTitle className="text-emerald-800 flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5" />
            Cierre de Caja
            <Badge className="ml-auto bg-emerald-600 text-white hover:bg-emerald-700">
              {receptionistName}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">

          {/* MODO: MI TURNO / GENERAL */}
          <div className="space-y-2">
            <Label className="text-gray-600 font-bold uppercase text-xs">Modo de Cierre</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "propio" ? "default" : "outline"}
                onClick={() => setMode("propio")}
                className={`font-bold gap-2 ${mode === "propio" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-gray-300 text-black"}`}
              >
                <User className="h-4 w-4" /> MI TURNO
              </Button>
              <Button
                variant={mode === "general" ? "default" : "outline"}
                onClick={() => setMode("general")}
                className={`font-bold gap-2 ${mode === "general" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 text-black"}`}
              >
                <Users className="h-4 w-4" /> CIERRE GENERAL
              </Button>
            </div>
            <p className="text-xs text-gray-400 italic">
              {mode === "propio"
                ? `Solo ventas registradas por: ${receptionistName}`
                : "Todas las ventas del día (ambas recepcionistas)"}
            </p>
          </div>

          {/* TURNO PRESET */}
          <div className="space-y-2">
            <Label className="text-gray-600 font-bold uppercase text-xs">Turno Rápido</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "mañana", label: "MAÑANA", sub: "8hs - 14hs" },
                { key: "tarde", label: "TARDE", sub: "14hs - 21hs" },
                { key: "completo", label: "COMPLETO", sub: "Todo el día" },
              ] as const).map(p => (
                <Button
                  key={p.key}
                  variant={shiftPreset === p.key ? "default" : "outline"}
                  onClick={() => setPreset(p.key)}
                  className={`flex flex-col h-auto py-2 font-bold ${shiftPreset === p.key ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-gray-300 text-black"}`}
                >
                  <span className="text-sm">{p.label}</span>
                  <span className="text-[10px] opacity-70">{p.sub}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* FECHA + HORA */}
          <div className="flex flex-col md:flex-row gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex-1 space-y-1">
              <Label className="text-gray-500 text-xs flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Fecha
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border-gray-200 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-gray-500 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> Desde
              </Label>
              <Input
                type="time"
                value={timeFrom}
                onChange={(e) => { setTimeFrom(e.target.value); setShiftPreset("custom") }}
                className="bg-white border-gray-200 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-gray-500 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> Hasta
              </Label>
              <Input
                type="time"
                value={timeTo}
                onChange={(e) => { setTimeTo(e.target.value); setShiftPreset("custom") }}
                className="bg-white border-gray-200 text-sm"
              />
            </div>
          </div>

          {/* MÉTRICAS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Efectivo</p>
              <p className="text-lg font-black text-emerald-600">${closureMetrics.efectivo.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Transf.</p>
              <p className="text-lg font-black text-gray-700">${closureMetrics.transferencia.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tarjeta</p>
              <p className="text-lg font-black text-gray-700">${closureMetrics.tarjeta.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">QR</p>
              <p className="text-lg font-black text-gray-700">${closureMetrics.qr.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-600 p-3 rounded-lg border border-emerald-500 text-center shadow-md col-span-2 md:col-span-1">
              <p className="text-[10px] text-emerald-100 font-bold uppercase mb-1">
                TOTAL ({closureMetrics.count} ventas)
              </p>
              <p className="text-xl font-black text-white">${closureMetrics.total.toLocaleString()}</p>
            </div>
          </div>

          {/* OBSERVACIONES */}
          <div className="space-y-2">
            <Label className="text-gray-600 text-sm">Observaciones (faltantes, sobrantes, gastos)</Label>
            <Textarea
              placeholder="Ej: Saqué $2000 para comprar insumos. Sobraron $500 en efectivo."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="resize-none border-gray-200 text-sm"
            />
          </div>

          <Button
            className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold h-12 text-lg shadow-md"
            onClick={handleSubmitClosure}
          >
            <Calculator className="h-5 w-5 mr-2" />
            Guardar Cierre de Caja
          </Button>

        </CardContent>
      </Card>

      {/* HISTORIAL DE CIERRES */}
      <Card className="bg-white border-gray-200">
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setShowHistory(!showHistory)}
        >
          <CardTitle className="text-gray-700 flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historial de Cierres
            <Badge className="ml-1 bg-gray-100 text-gray-700 border-gray-200">
              {historialFiltrado.length}
            </Badge>
            <span className="ml-auto text-gray-400">
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent className="pt-0">
            {historialFiltrado.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay cierres guardados aún.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {historialFiltrado.map((c: any) => {
                  const isGeneral = String(c.receptionistName).startsWith("[GENERAL]")
                  const displayName = isGeneral
                    ? String(c.receptionistName).replace("[GENERAL] ", "")
                    : c.receptionistName
                  return (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isGeneral
                            ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">GENERAL</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{displayName}</Badge>
                          }
                        </div>
                        <span className="text-xs text-gray-400">
                          {format(new Date(c.createdAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>
                          {format(new Date(c.dateFrom), "HH:mm")} → {format(new Date(c.dateTo), "HH:mm")}
                        </span>
                        <span className="font-black text-emerald-600 text-sm ml-auto">
                          ${c.total.toLocaleString()}
                        </span>
                      </div>
                      {c.amountEfectivo > 0 || c.amountTransferencia > 0 || c.amountTarjeta > 0 || c.amountQr > 0 ? (
                        <div className="flex gap-3 text-[10px] text-gray-400 mt-1 flex-wrap">
                          {c.amountEfectivo > 0 && <span>Efect: ${c.amountEfectivo.toLocaleString()}</span>}
                          {c.amountTransferencia > 0 && <span>Transf: ${c.amountTransferencia.toLocaleString()}</span>}
                          {c.amountTarjeta > 0 && <span>Tarj: ${c.amountTarjeta.toLocaleString()}</span>}
                          {c.amountQr > 0 && <span>QR: ${c.amountQr.toLocaleString()}</span>}
                        </div>
                      ) : null}
                      {c.observations && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{c.observations}"</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <ConfirmDialog />
    </div>
  )
}
