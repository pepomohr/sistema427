"use client"

import { useState, useMemo, useEffect } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, Calendar, Download, Stethoscope, ShoppingBag, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react"
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
  const { sales, patients, professionals, appointments, fetchPatients, fetchSales, fetchAppointments } = useClinicStore()

  useEffect(() => {
    fetchPatients()
    fetchSales()
    fetchAppointments()
  }, [])

  const today = format(new Date(), "yyyy-MM-dd")
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  // Ordenamiento y filtros de tabla
  type SortField = 'fecha' | 'hora' | 'paciente' | 'profesional' | 'pago' | 'total'
  const [sortField, setSortField] = useState<SortField>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterPago, setFilterPago] = useState('')
  const [filterProf, setFilterProf] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-[#16A34A]" /> : <ArrowDown className="h-3 w-3 ml-1 text-[#16A34A]" />
  }

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
    // 4. Venta directa sin paciente vinculado
    if (sale.type === "direct") return "Consumidor Final"
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

  // Leemos patients SIEMPRE frescos desde el store para evitar cualquier problema de stale closure/memo
  const storePatients = useClinicStore(state => state.patients)
  const storeProfessionals = useClinicStore(state => state.professionals)
  const storeAppointments = useClinicStore(state => state.appointments)

  // Cada fila = un ítem dentro de una venta — sin memo para siempre usar datos frescos
  const patientMap = new Map((storePatients || []).map((p: any) => [p.id, p.name]))
  const profMap = new Map((storeProfessionals || []).map((p: any) => [p.id, p.shortName || p.name]))
  const rows = filteredSales.flatMap(sale => {
    // Nombre del paciente
    let patientName: string
    if (sale.patientId && patientMap.has(sale.patientId)) {
      patientName = patientMap.get(sale.patientId)!
    } else if (sale.appointmentId) {
      const apt = storeAppointments.find((a: any) => a.id === sale.appointmentId)
      if (apt) {
        const p = patientMap.get(apt.patientId)
        patientName = p || apt.patientName || "—"
      } else {
        patientName = sale.type === "direct" ? "Consumidor Final" : "—"
      }
    } else if (sale.type === "appointment" && sale.items?.length) {
      const profId = sale.items[0]?.soldBy
      const saleDay = new Date(sale.date).toDateString()
      const candidatos = storeAppointments.filter((a: any) =>
        a.professionalId === profId && new Date(a.date).toDateString() === saleDay && a.status === "completado"
      )
      const matched = candidatos.length === 1 ? candidatos[0] : candidatos.find((a: any) => a.totalAmount === sale.total) || candidatos[0]
      patientName = matched ? (patientMap.get(matched.patientId) || matched.patientName || "—") : "—"
    } else {
      patientName = sale.type === "direct" ? "Consumidor Final" : "—"
    }

    // Nombre del profesional
    let profName = "Recepción"
    if (sale.type === "appointment" && sale.appointmentId) {
      const apt = storeAppointments.find((a: any) => a.id === sale.appointmentId)
      if (apt) profName = profMap.get(apt.professionalId) || "Recepción"
    } else if (sale.items?.length) {
      const soldBy = sale.items[0]?.soldBy
      if (soldBy && soldBy !== "recepcion") profName = profMap.get(soldBy) || soldBy
    }

    const saleDate = new Date(sale.date)
    const saleId = sale.id ? sale.id.slice(0, 8).toUpperCase() : "—"
    const isAppointment = sale.type === "appointment"
    const splits = sale.paymentSplits || []
    const hasSplit = splits.length > 1
    const split1 = splits[0]
    const split2 = splits[1]

    return (sale.items || []).map((item: any, i: number) => ({
      saleId,
      date: saleDate,
      patientName,
      profName,
      isAppointment,
      itemName: item.itemName,
      itemType: item.type,
      quantity: item.quantity,
      price: (item.price || 0) * item.quantity,
      paymentMethod: sale.paymentMethod,
      hasSplit,
      split1,
      split2,
      observations: i === 0 ? (sale.observations || "") : "",
      isFirstItem: i === 0,
      saleTotal: sale.total,
    }))
  })

  // Agrupar filas por saleId, aplicar filtros y ordenamiento
  const displayRows = useMemo(() => {
    // Agrupar
    const groups: Record<string, any[]> = {}
    const order: string[] = []
    rows.forEach((row: any) => {
      if (!groups[row.saleId]) { groups[row.saleId] = []; order.push(row.saleId) }
      groups[row.saleId].push(row)
    })
    // Filtrar por grupo (primer item = datos de la venta)
    let keys = order.filter(k => {
      const r = groups[k][0]
      if (filterPago && (r.split1?.method || r.paymentMethod) !== filterPago) return false
      if (filterProf && r.profName !== filterProf) return false
      if (filterTipo === 'turno' && !r.isAppointment) return false
      if (filterTipo === 'directa' && r.isAppointment) return false
      return true
    })
    // Ordenar grupos
    keys = [...keys].sort((a, b) => {
      const ra = groups[a][0], rb = groups[b][0]
      let va: any, vb: any
      if (sortField === 'fecha' || sortField === 'hora') { va = ra.date.getTime(); vb = rb.date.getTime() }
      else if (sortField === 'paciente') { va = ra.patientName?.toLowerCase() || ''; vb = rb.patientName?.toLowerCase() || '' }
      else if (sortField === 'profesional') { va = ra.profName?.toLowerCase() || ''; vb = rb.profName?.toLowerCase() || '' }
      else if (sortField === 'pago') { va = ra.split1?.method || ra.paymentMethod || ''; vb = rb.split1?.method || rb.paymentMethod || '' }
      else if (sortField === 'total') { va = ra.saleTotal; vb = rb.saleTotal }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return keys.flatMap(k => groups[k])
  }, [rows, sortField, sortDir, filterPago, filterProf, filterTipo])

  // Totales sobre filas filtradas/ordenadas
  const displayTotal = displayRows.filter((r: any) => r.isFirstItem && (r.split1?.method || r.paymentMethod) !== 'gift_card').reduce((sum: number, r: any) => sum + r.saleTotal, 0)

  // Opciones únicas para filtros
  const paymentOptions = useMemo(() => [...new Set(rows.filter((r: any) => r.isFirstItem).map((r: any) => r.split1?.method || r.paymentMethod).filter(Boolean))], [rows])
  const profOptions = useMemo(() => [...new Set(rows.filter((r: any) => r.isFirstItem).map((r: any) => r.profName).filter(Boolean))], [rows])

  const handleExportCSV = () => {
    const headers = ["Fecha","Hora","ID","Paciente","Profesional","Origen","Ítem","Tipo","Cantidad","PrecioUnitario","Subtotal","FormaPago","EsGiftCard","TotalVenta","Observaciones"]
    const csvRows = rows.map((r: any) => [
      format(r.date, "dd/MM/yyyy"),
      format(r.date, "HH:mm"),
      r.isFirstItem ? r.saleId : "",
      r.isFirstItem ? r.patientName : "",
      r.isFirstItem ? r.profName : "",
      r.isFirstItem ? (r.isAppointment ? "Turno" : "Venta Directa") : "",
      `"${r.itemName}"`,
      r.itemType === "service" ? "Servicio" : "Producto",
      r.quantity,
      r.price / r.quantity,
      r.price,
      r.isFirstItem ? (PAYMENT_LABELS[r.split1?.method || r.paymentMethod] || r.paymentMethod || "") : "",
      r.isFirstItem ? ((r.split1?.method || r.paymentMethod) === "gift_card" ? "Sí" : "No") : "",
      r.isFirstItem ? r.saleTotal : "",
      r.isFirstItem ? `"${r.observations}"` : "",
    ].join(","))
    const csv = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `ventas_${dateFrom}_${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    if (typeof window === 'undefined') return
    try {
      const { jsPDF } = await import("jspdf")
      const autoTableModule = await import("jspdf-autotable")
      const applyAutoTable: any = autoTableModule.default || autoTableModule

      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text("Reporte de Ventas — Consultorio C427", 14, 18)
      doc.setFontSize(10)
      doc.text(`Período: ${dateFrom} al ${dateTo}   |   Total: $${totalAmount.toLocaleString('es-AR')}`, 14, 26)

      const tableColumn = ["ID","Fecha","Paciente","Profesional","Origen","Ítem","Tipo","Cant","Precio","Pago","Total"]
      const tableRows = rows.map((r: any) => [
        r.isFirstItem ? r.saleId : "↳",
        r.isFirstItem ? format(r.date, "dd/MM/yy HH:mm") : "",
        r.isFirstItem ? r.patientName : "",
        r.isFirstItem ? r.profName : "",
        r.isFirstItem ? (r.isAppointment ? "Turno" : "Venta Directa") : "",
        r.itemName,
        r.itemType === "service" ? "Servicio" : "Producto",
        r.quantity,
        `$${r.price.toLocaleString('es-AR')}`,
        r.isFirstItem ? (PAYMENT_LABELS[r.split1?.method || r.paymentMethod] || r.paymentMethod || "") : "",
        r.isFirstItem ? `$${r.saleTotal.toLocaleString('es-AR')}` : "",
      ])

      applyAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        headStyles: { fillColor: '#16A34A', textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: '#f9fafb' },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          5: { cellWidth: 40 },
        }
      })

      doc.save(`ventas_${dateFrom}_${dateTo}.pdf`)
    } catch (error) {
      console.error("Error generando PDF:", error)
    }
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
          <Button onClick={handleExportCSV} variant="outline" className="border-blue-500 text-blue-600 font-bold gap-2 hover:bg-blue-500 hover:text-white">
            <Download className="h-4 w-4" /> CSV (Google Sheets)
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="border-[#16A34A] text-[#16A34A] font-bold gap-2 hover:bg-[#16A34A] hover:text-white">
            <Download className="h-4 w-4" /> PDF
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
          <CardTitle className="text-sm font-black text-gray-700 flex items-center justify-between flex-wrap gap-2">
            <span>Total filtrado: <span className="text-[#16A34A] text-lg">${displayTotal.toLocaleString()}</span>
              {(filterPago || filterProf || filterTipo) && <span className="text-xs text-gray-400 ml-2 font-normal">({displayRows.filter((r:any)=>r.isFirstItem).length} ventas)</span>}
            </span>
            <span className="text-xs text-gray-400 font-normal">Generado el {format(new Date(), "dd/MM/yyyy - HH:mm")} hs</span>
          </CardTitle>
          {/* Barra de filtros */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={filterPago || "__all__"} onValueChange={v => setFilterPago(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs w-40 border-gray-300">
                <SelectValue placeholder="Forma de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los pagos</SelectItem>
                {paymentOptions.map((p: string) => <SelectItem key={p} value={p}>{PAYMENT_LABELS[p] || p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProf || "__all__"} onValueChange={v => setFilterProf(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs w-40 border-gray-300">
                <SelectValue placeholder="Profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {profOptions.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo || "__all__"} onValueChange={v => setFilterTipo(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs w-36 border-gray-300">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="turno">Turno</SelectItem>
                <SelectItem value="directa">Venta Directa</SelectItem>
              </SelectContent>
            </Select>
            {(filterPago || filterProf || filterTipo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterPago(''); setFilterProf(''); setFilterTipo('') }} className="h-8 text-xs text-gray-500 hover:text-red-500 gap-1">
                <X className="h-3 w-3" /> Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 py-12 font-medium">No hay ventas en el período seleccionado</p>
          ) : displayRows.length === 0 ? (
            <p className="text-center text-gray-400 py-12 font-medium">Ninguna venta coincide con los filtros aplicados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Venta</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none hover:text-[#16A34A]" onClick={() => handleSort('fecha')}>
                      <span className="flex items-center">Fecha/Hora <SortIcon field="fecha" /></span>
                    </th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none hover:text-[#16A34A]" onClick={() => handleSort('paciente')}>
                      <span className="flex items-center">Paciente <SortIcon field="paciente" /></span>
                    </th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none hover:text-[#16A34A]" onClick={() => handleSort('profesional')}>
                      <span className="flex items-center">Profesional <SortIcon field="profesional" /></span>
                    </th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Origen</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Descripción</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Tipo</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Cant.</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Precio</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none hover:text-[#16A34A]" onClick={() => handleSort('pago')}>
                      <span className="flex items-center">Pago 1 <SortIcon field="pago" /></span>
                    </th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Pago 2</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap cursor-pointer select-none hover:text-[#16A34A]" onClick={() => handleSort('total')}>
                      <span className="flex items-center justify-end">Total <SortIcon field="total" /></span>
                    </th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase whitespace-nowrap">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row: any, i: number) => (
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
                    <td colSpan={8} className="px-3 py-3 font-black text-right text-gray-700 uppercase text-xs">
                      {(filterPago || filterProf || filterTipo) ? "Total filtrado:" : "Total período:"}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-[#16A34A] text-base">${displayTotal.toLocaleString()}</td>
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
