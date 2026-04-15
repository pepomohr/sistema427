"use client"

import { useState, useMemo } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Calendar, Download, Stethoscope, ShoppingBag } from "lucide-react"
import { format } from "date-fns"

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transf.",
  qr: "QR",
  gift_card: "Gift Card",
}

const PAYMENT_COLORS: Record<string, string> = {
  efectivo: "bg-emerald-100 text-emerald-800",
  tarjeta: "bg-purple-100 text-purple-800",
  transferencia: "bg-blue-100 text-blue-800",
  qr: "bg-orange-100 text-orange-800",
  gift_card: "bg-pink-100 text-pink-800",
}

export function SalesReportModule() {
  const { sales, patients, professionals, appointments } = useClinicStore()

  const today = format(new Date(), "yyyy-MM-dd")
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const setQuickFilter = (filter: "hoy" | "ayer" | "7dias" | "mes") => {
    const now = new Date()
    if (filter === "hoy") {
      setDateFrom(format(now, "yyyy-MM-dd"))
      setDateTo(format(now, "yyyy-MM-dd"))
    } else if (filter === "ayer") {
      const ayer = new Date(now); ayer.setDate(ayer.getDate() - 1)
      setDateFrom(format(ayer, "yyyy-MM-dd"))
      setDateTo(format(ayer, "yyyy-MM-dd"))
    } else if (filter === "7dias") {
      const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 6)
      setDateFrom(format(hace7, "yyyy-MM-dd"))
      setDateTo(format(now, "yyyy-MM-dd"))
    } else if (filter === "mes") {
      setDateFrom(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"))
      setDateTo(format(now, "yyyy-MM-dd"))
    }
  }

  const filteredSales = useMemo(() => {
    const from = new Date(dateFrom + "T00:00:00")
    const to = new Date(dateTo + "T23:59:59")
    return sales
      .filter(s => {
        const d = new Date(s.date)
        return d >= from && d <= to
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, dateFrom, dateTo])

  const totalAmount = filteredSales
    .filter(s => s.paymentMethod !== "gift_card")
    .reduce((sum, s) => sum + s.total, 0)

  const getPatientName = (sale: any) => {
    // 1. Ventas nuevas: tienen patientId guardado directamente
    if (sale.patientId) {
      const p = patients.find((p: any) => p.id === sale.patientId)
      if (p) return p.name
    }
    // 2. Ventas nuevas: tienen appointmentId guardado
    if (sale.appointmentId) {
      const apt = appointments.find((a: any) => a.id === sale.appointmentId)
      if (apt) {
        if (apt.patientName) return apt.patientName
        const p = patients.find((p: any) => p.id === apt.patientId)
        if (p) return p.name
      }
    }
    // 3. Ventas viejas (sin patientId): buscar el turno completado
    //    que coincida con el mismo profesional y mismo día
    if (sale.type === "appointment" && sale.items?.length) {
      const profId = sale.items[0]?.soldBy
      const saleDay = new Date(sale.date).toDateString()
      // Buscar turno completado del mismo profesional en el mismo día
      const candidatos = appointments.filter((apt: any) =>
        apt.professionalId === profId &&
        new Date(apt.date).toDateString() === saleDay &&
        apt.status === "completado"
      )
      // Si hay solo uno, ese es. Si hay varios, intentar afinar por total
      const matched = candidatos.length === 1
        ? candidatos[0]
        : candidatos.find((apt: any) => apt.totalAmount === sale.total) || candidatos[0]
      if (matched) {
        if (matched.patientName) return matched.patientName
        const p = patients.find((p: any) => p.id === matched.patientId)
        if (p) return p.name
      }
    }
    return "-"
  }

  const getProfessionalName = (sale: any) => {
    if (sale.type === "appointment" && sale.appointmentId) {
      const apt = appointments.find((a: any) => a.id === sale.appointmentId)
      if (apt) {
        const prof = professionals.find((p: any) => p.id === apt.professionalId)
        if (prof) return prof.shortName
      }
    }
    if (sale.items?.length) {
      const soldBy = sale.items[0]?.soldBy
      if (soldBy && soldBy !== "recepcion") {
        const prof = professionals.find((p: any) => p.id === soldBy)
        if (prof) return prof.shortName
      }
    }
    return "Recepción"
  }

  // Cada fila = un ítem dentro de una venta
  const rows = useMemo(() => {
    const result: any[] = []
    filteredSales.forEach(sale => {
      const patientName = getPatientName(sale)
      const profName = getProfessionalName(sale)
      const saleDate = new Date(sale.date)
      const saleId = sale.id ? sale.id.slice(0, 8).toUpperCase() : "—"
      const isAppointment = sale.type === "appointment"

      // Splits de pago (2do método)
      const splits = sale.paymentSplits || []
      const hasSplit = splits.length > 1
      const split1 = splits[0]
      const split2 = splits[1]

      sale.items.forEach((item: any, i: number) => {
        result.push({
          saleId,
          date: saleDate,
          patientName,
          profName,
          isAppointment,
          itemName: item.itemName,
          itemType: item.type,
          quantity: item.quantity,
          price: item.price * item.quantity,
          paymentMethod: sale.paymentMethod,
          hasSplit,
          split1,
          split2,
          observations: i === 0 ? (sale.observations || "") : "",
          isFirstItem: i === 0,
          saleTotal: sale.total,
        })
      })
    })
    return result
  }, [filteredSales, patients, professionals, appointments])

  const handleExportCSV = () => {
    const headers = ["ID Venta","Fecha","Paciente","Profesional","Origen","Ítem","Tipo","Cant","Precio","Método Pago 1","Monto 1","Método Pago 2","Monto 2","Total Venta","Observaciones"]
    const csvRows = rows.map((r: any) => [
      r.saleId,
      format(r.date, "dd/MM/yyyy HH:mm"),
      r.patientName,
      r.profName,
      r.isAppointment ? "Turno" : "Venta Directa",
      r.itemName,
      r.itemType === "service" ? "Servicio" : "Producto",
      r.quantity,
      r.price,
      r.isFirstItem ? (PAYMENT_LABELS[r.split1?.method || r.paymentMethod] || r.paymentMethod) : "",
      r.isFirstItem ? (r.split1?.amount ?? r.saleTotal) : "",
      r.isFirstItem && r.hasSplit ? (PAYMENT_LABELS[r.split2?.method] || r.split2?.method || "") : "",
      r.isFirstItem && r.hasSplit ? (r.split2?.amount || "") : "",
      r.isFirstItem ? r.saleTotal : "",
      r.observations,
    ])
    const csv = [headers, ...csvRows].map((row: any[]) => row.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ventas_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#16A34A] flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Ventas por Fecha
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtros rápidos */}
          <div className="flex gap-1">
            {([
              { key: "hoy", label: "Hoy" },
              { key: "ayer", label: "Ayer" },
              { key: "7dias", label: "7 días" },
              { key: "mes", label: "Este mes" },
            ] as const).map(f => (
              <Button
                key={f.key}
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter(f.key)}
                className="text-xs font-bold border-gray-300 text-black hover:bg-[#16A34A] hover:text-white hover:border-[#16A34A]"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label className="text-xs font-bold text-gray-600 whitespace-nowrap">Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-0 p-0 h-auto text-sm font-bold text-black w-36 focus-visible:ring-0" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label className="text-xs font-bold text-gray-600 whitespace-nowrap">Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-0 p-0 h-auto text-sm font-bold text-black w-36 focus-visible:ring-0" />
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="border-gray-300 text-black font-bold gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Total período</p>
            <p className="text-2xl font-black text-[#16A34A]">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 font-medium uppercase">N° de ventas</p>
            <p className="text-2xl font-black text-black">{filteredSales.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Turnos cobrados</p>
            <p className="text-2xl font-black text-black">{filteredSales.filter(s => s.type === "appointment").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Ventas directas</p>
            <p className="text-2xl font-black text-black">{filteredSales.filter(s => s.type === "direct").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b border-gray-100">
          <CardTitle className="text-sm font-black text-gray-700 flex items-center justify-between">
            <span>Total: <span className="text-[#16A34A] text-lg">${totalAmount.toLocaleString()}</span></span>
            <span className="text-xs text-gray-400 font-normal">
              Generado el {format(new Date(), "dd/MM/yyyy - HH:mm")} hs
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 py-12 font-medium">No hay ventas en el período seleccionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Venta</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Fecha</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Paciente</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Profesional</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Origen</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Descripción</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Tipo</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Cant.</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Precio</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Pago 1</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Pago 2</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Total</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, i: number) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${row.isFirstItem && i > 0 ? 'border-t-2 border-t-gray-300' : ''}`}>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {row.isFirstItem
                          ? <span className="font-black text-gray-700">VEN-{row.saleId}</span>
                          : <span className="text-gray-300">↳</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">
                        {row.isFirstItem ? format(row.date, "dd/MM/yy HH:mm") : ""}
                      </td>
                      <td className="px-3 py-2 font-bold text-black whitespace-nowrap">
                        {row.isFirstItem ? row.patientName : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {row.isFirstItem ? row.profName : ""}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isFirstItem
                          ? row.isAppointment
                            ? <Badge className="bg-green-100 text-green-800 border-none text-xs font-bold">Turno</Badge>
                            : <Badge className="bg-sky-100 text-sky-800 border-none text-xs font-bold">Venta Directa</Badge>
                          : ""}
                      </td>
                      <td className="px-3 py-2 font-bold text-black max-w-[180px]">
                        <span className="block truncate">{row.itemName}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.itemType === "service"
                          ? <span className="inline-flex items-center gap-1 text-green-700 font-bold"><Stethoscope className="h-3 w-3" /> Servicio</span>
                          : <span className="inline-flex items-center gap-1 text-orange-700 font-bold"><ShoppingBag className="h-3 w-3" /> Producto</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-700">{row.quantity}</td>
                      <td className="px-3 py-2 text-right font-black text-black">${row.price.toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isFirstItem ? (
                          <div>
                            <span className={"inline-block px-2 py-0.5 rounded text-xs font-bold " + (PAYMENT_COLORS[row.split1?.method || row.paymentMethod] || "bg-gray-100 text-gray-700")}>
                              {PAYMENT_LABELS[row.split1?.method || row.paymentMethod] || row.paymentMethod}
                            </span>
                            {row.hasSplit && row.split1?.amount !== undefined && (
                              <span className="ml-1 text-xs font-black text-gray-500">${row.split1.amount.toLocaleString()}</span>
                            )}
                          </div>
                        ) : ""}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isFirstItem && row.hasSplit && row.split2 ? (
                          <div>
                            <span className={"inline-block px-2 py-0.5 rounded text-xs font-bold " + (PAYMENT_COLORS[row.split2.method] || "bg-gray-100 text-gray-700")}>
                              {PAYMENT_LABELS[row.split2.method] || row.split2.method}
                            </span>
                            {row.split2.amount !== undefined && (
                              <span className="ml-1 text-xs font-black text-gray-500">${row.split2.amount.toLocaleString()}</span>
                            )}
                          </div>
                        ) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-[#16A34A] whitespace-nowrap">
                        {row.isFirstItem ? `$${row.saleTotal.toLocaleString()}` : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.observations
                          ? <span className="block text-xs italic text-gray-500 whitespace-normal break-words max-w-[220px]">{row.observations}</span>
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={8} className="px-3 py-3 font-black text-right text-gray-700 uppercase text-xs">Total período:</td>
                    <td className="px-3 py-3 text-right font-black text-[#16A34A] text-base">${totalAmount.toLocaleString()}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
