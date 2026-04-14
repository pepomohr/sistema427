"use client"

import { useState, useMemo } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Calendar, DollarSign, ShoppingBag, Stethoscope, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
    // 1. Try from sale.patientId directly
    if (sale.patientId) {
      const p = patients.find(p => p.id === sale.patientId)
      if (p) return p.name
    }
    // 2. Try from appointmentId → appointment → patient
    if (sale.appointmentId) {
      const apt = appointments.find(a => a.id === sale.appointmentId)
      if (apt) {
        if (apt.patientName) return apt.patientName
        const p = patients.find(p => p.id === apt.patientId)
        if (p) return p.name
      }
    }
    // 3. Try from items' soldBy
    return "-"
  }

  const getProfessionalName = (sale: any) => {
    if (sale.type === "appointment" && sale.appointmentId) {
      const apt = appointments.find(a => a.id === sale.appointmentId)
      if (apt) {
        const prof = professionals.find(p => p.id === apt.professionalId)
        if (prof) return prof.shortName
      }
    }
    // For direct sales, look at first item's soldBy
    if (sale.items?.length) {
      const soldBy = sale.items[0]?.soldBy
      if (soldBy && soldBy !== "recepcion") {
        const prof = professionals.find(p => p.id === soldBy)
        if (prof) return prof.shortName
      }
    }
    return "Recepción"
  }

  const getOriginLabel = (sale: any) => {
    return sale.type === "appointment" ? "Turno" : "Venta Directa"
  }

  const getOriginBadge = (sale: any) => {
    if (sale.type === "appointment") {
      return <Badge className="bg-green-100 text-green-800 border-none text-xs font-bold whitespace-nowrap">Turno</Badge>
    }
    return <Badge className="bg-sky-100 text-sky-800 border-none text-xs font-bold whitespace-nowrap">Venta Directa</Badge>
  }

  // Expand items: each row = one item in the sale
  const rows = useMemo(() => {
    const result: any[] = []
    filteredSales.forEach(sale => {
      const patientName = getPatientName(sale)
      const profName = getProfessionalName(sale)
      const saleDate = new Date(sale.date)
      const saleId = sale.id ? sale.id.slice(0, 8).toUpperCase() : "—"
      const hasExtras = sale.items.filter(i => i.type === "product").length > 0
      const hasServices = sale.items.filter(i => i.type === "service").length > 0

      sale.items.forEach((item, i) => {
        result.push({
          saleId,
          date: saleDate,
          patientName,
          profName,
          origin: getOriginLabel(sale),
          originBadge: getOriginBadge(sale),
          itemName: item.itemName,
          itemType: item.type,
          quantity: item.quantity,
          price: item.price * item.quantity,
          paymentMethod: sale.paymentMethod,
          secondPaymentMethod: sale.secondPaymentMethod,
          secondPaymentAmount: sale.secondPaymentAmount,
          observations: i === 0 ? (sale.observations || "") : "",
          isFirstItem: i === 0,
          totalItems: sale.items.length,
          saleTotal: sale.total,
        })
      })
    })
    return result
  }, [filteredSales, patients, professionals, appointments])

  // Grouped view for printing
  const handleExportCSV = () => {
    const headers = ["ID Venta","Fecha","Paciente","Profesional","Origen","Ítem","Tipo","Cant","Precio","Método Pago","2do Método","Monto 2do","Total Venta","Observaciones"]
    const csvRows = rows.map(r => [
      r.saleId,
      format(r.date, "dd/MM/yyyy HH:mm"),
      r.patientName,
      r.profName,
      r.origin,
      r.itemName,
      r.itemType === "service" ? "Servicio" : "Producto",
      r.quantity,
      r.price,
      PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod,
      r.secondPaymentMethod ? (PAYMENT_LABELS[r.secondPaymentMethod] || r.secondPaymentMethod) : "",
      r.secondPaymentAmount || "",
      r.isFirstItem ? r.saleTotal : "",
      r.observations,
    ])
    const csv = [headers, ...csvRows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")).join("\n")
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
        <div className="flex items-center gap-3 flex-wrap">
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

      {/* Summary strip */}
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

      {/* Table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b border-gray-100">
          <CardTitle className="text-sm font-black text-gray-700 flex items-center justify-between">
            <span>
              Total: <span className="text-[#16A34A] text-lg">${totalAmount.toLocaleString()}</span>
            </span>
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
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Método</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">2do Pago</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Total</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${row.isFirstItem && i > 0 ? 'border-t-2 border-t-gray-300' : ''}`}>
                      <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                        {row.isFirstItem ? <span className="font-black text-gray-700">VEN-{row.saleId}</span> : <span className="text-gray-300">↳</span>}
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
                        {row.isFirstItem ? row.originBadge : ""}
                      </td>
                      <td className="px-3 py-2 font-bold text-black max-w-[180px]">
                        <span className="block truncate">{row.itemName}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.itemType === "service" ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                            <Stethoscope className="h-3 w-3" /> Servicio
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-orange-700 font-bold">
                            <ShoppingBag className="h-3 w-3" /> Producto
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-700">{row.quantity}</td>
                      <td className="px-3 py-2 text-right font-black text-black">${row.price.toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isFirstItem ? (
                          <span className={"inline-block px-2 py-0.5 rounded text-xs font-bold " + (PAYMENT_COLORS[row.paymentMethod] || "bg-gray-100 text-gray-700")}>
                            {PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod}
                          </span>
                        ) : ""}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isFirstItem && row.secondPaymentMethod ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={"inline-block px-2 py-0.5 rounded text-xs font-bold " + (PAYMENT_COLORS[row.secondPaymentMethod] || "bg-gray-100 text-gray-700")}>
                              {PAYMENT_LABELS[row.secondPaymentMethod] || row.secondPaymentMethod}
                            </span>
                            {row.secondPaymentAmount && (
                              <span className="text-xs font-black text-gray-600">${Number(row.secondPaymentAmount).toLocaleString()}</span>
                            )}
                          </div>
                        ) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-[#16A34A] whitespace-nowrap">
                        {row.isFirstItem ? `$${row.saleTotal.toLocaleString()}` : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px]">
                        {row.observations ? (
                          <span className="block text-xs italic text-gray-500 truncate" title={row.observations}>{row.observations}</span>
                        ) : ""}
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
