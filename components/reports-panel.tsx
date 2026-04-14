"use client"

import { useState, useMemo } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, FileSpreadsheet } from "lucide-react"

export function ReportsPanel() {
  const { sales, professionals, patients, services, products } = useClinicStore()
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0])
  const [searchTerm, setSearchTerm] = useState("")

  // Generamos las filas calcadas al Excel
  const reportRows = useMemo(() => {
    if (!sales) return []
    
    const targetDate = new Date(filterDate).toDateString()
    const filteredSales = sales.filter(s => new Date(s.date).toDateString() === targetDate)

    const rows: any[] = []

    filteredSales.forEach(sale => {
      // Calculamos la forma de pago (si es multipago, las unimos con un " + ")
      let formaPago = sale.paymentMethod
      if (sale.paymentSplits && sale.paymentSplits.length > 0) {
        formaPago = sale.paymentSplits.map(split => `${split.method}`).join(' + ')
      }

      sale.items.forEach(item => {
        const prof = professionals.find(p => p.id === item.soldBy)
        
        // Buscar info extra dependiendo si es servicio o producto
        let tipoServicio = "-"
        let unidadNegocio = "Recepción"
        
        if (item.type === 'service') {
          const svc = services.find(s => s.id === item.itemId)
          tipoServicio = svc ? svc.category : "-"
          unidadNegocio = "Gabinete"
        } else if (item.type === 'product') {
          const prd = products.find(p => p.id === item.itemId)
          tipoServicio = prd ? prd.category : "-"
          unidadNegocio = "Mostrador"
        }

        rows.push({
          idVenta: `VEN-${sale.id.substring(0,5).toUpperCase()}`,
          fecha: new Date(sale.date).toLocaleDateString('es-AR'),
          cliente: "Consumidor Final", // Podrías enlazar el paciente si lo guardas en la venta
          profesional: prof ? prof.shortName : 'Recepcion',
          origen: sale.type === 'appointment' ? 'Turno' : 'S/T',
          tipo: item.type === 'service' ? 'Servicio' : 'Producto',
          codigo: item.itemId.substring(0,7).toUpperCase(),
          descripcion: item.itemName,
          cantidad: item.quantity,
          precioUnitario: item.price,
          subtotal: item.price * item.quantity,
          formaPago: formaPago,
          precioEfectivo: formaPago.includes('efectivo') ? 'Sí' : 'No',
          giftCard: formaPago.includes('gift_card') ? 'Sí' : '',
          canalVentas: sale.source === 'gabinete' ? 'Atención' : 'Mostrador',
          tipoServicio: tipoServicio,
          unidadNegocio: unidadNegocio,
          observaciones: sale.observations || ""
        })
      })
    })

    return rows.filter(row => 
      row.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.profesional.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [sales, filterDate, professionals, services, products, searchTerm])

  const totalSum = reportRows.reduce((acc, row) => acc + row.subtotal, 0)

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30 shadow-lg">
        <CardHeader className="bg-emerald-50 border-b border-emerald-100 flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-emerald-800 flex items-center gap-2 text-2xl">
            <FileSpreadsheet className="h-6 w-6" /> Ventas por Fecha
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-emerald-600 font-bold uppercase">Total del Día:</p>
              <p className="text-3xl font-black text-emerald-800">${Math.round(totalSum).toLocaleString('es-AR')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="space-y-2 flex-1 max-w-[200px]">
              <Label>Fecha del Reporte</Label>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Buscar en la tabla...</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Filtrar por profesional o servicio..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-600 text-white text-xs uppercase">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap">IDVenta</th>
                  <th className="px-3 py-3 whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-3 whitespace-nowrap">Profesional</th>
                  <th className="px-3 py-3 whitespace-nowrap">Origen</th>
                  <th className="px-3 py-3 whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-3 whitespace-nowrap">Código</th>
                  <th className="px-3 py-3 whitespace-nowrap">Descripción</th>
                  <th className="px-3 py-3 whitespace-nowrap text-center">Cant.</th>
                  <th className="px-3 py-3 whitespace-nowrap text-right">Precio Unitario</th>
                  <th className="px-3 py-3 whitespace-nowrap text-right">Subtotal</th>
                  <th className="px-3 py-3 whitespace-nowrap">FormaPago</th>
                  <th className="px-3 py-3 whitespace-nowrap">CanalVentas</th>
                  <th className="px-3 py-3 whitespace-nowrap">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-500 italic">
                      No hay ventas registradas en esta fecha.
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-emerald-50/50">
                      <td className="px-3 py-2 font-medium">{row.idVenta}</td>
                      <td className="px-3 py-2">{row.fecha}</td>
                      <td className="px-3 py-2">{row.profesional}</td>
                      <td className="px-3 py-2">{row.origen}</td>
                      <td className="px-3 py-2">{row.tipo}</td>
                      <td className="px-3 py-2 text-gray-500">{row.codigo}</td>
                      <td className="px-3 py-2 font-semibold">{row.descripcion}</td>
                      <td className="px-3 py-2 text-center">{row.cantidad}</td>
                      <td className="px-3 py-2 text-right">${Math.round(row.precioUnitario).toLocaleString('es-AR')}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">${Math.round(row.subtotal).toLocaleString('es-AR')}</td>
                      <td className="px-3 py-2">{row.formaPago}</td>
                      <td className="px-3 py-2">{row.canalVentas}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={row.observaciones}>{row.observaciones}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}