"use client"

import { useState } from "react"
import { useClinicStore, type Sale, type SaleItem } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { 
  CreditCard, 
  Banknote, 
  Building2,
  User,
  Clock,
  DollarSign,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  X
} from "lucide-react"

export function ChargeModule() {
  // ESCUDO: Inicializamos con arrays vacíos por si el store tarda
  const {
    patients = [],
    appointments = [],
    professionals = [],
    products = [],
    completeAppointment,
    addSale, // Usamos la nueva acción que creamos en el store
  } = useClinicStore()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  
  const [directSalePatient, setDirectSalePatient] = useState("")
  const [directSaleItems, setDirectSaleItems] = useState<any[]>([])

  const pendingCharges = (appointments || []).filter(
    (a) => a.status === "pendiente_cobro"
  )

  const handleOpenPayment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setShowPaymentModal(true)
  }

  const handleProcessPayment = (method: "efectivo" | "tarjeta" | "transferencia") => {
    if (selectedAppointmentId) {
      completeAppointment(selectedAppointmentId, method)
      setShowPaymentModal(false)
      setSelectedAppointmentId(null)
    }
  }

  const handleAddProductToDirectSale = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const existing = directSaleItems.find((i) => i.itemId === productId)
      if (existing) {
        setDirectSaleItems(
          directSaleItems.map((i) =>
            i.itemId === productId ? { ...i, quantity: i.quantity + 1 } : i
          )
        )
      } else {
        setDirectSaleItems([
          ...directSaleItems,
          {
            type: "product",
            itemId: product.id,
            itemName: product.name,
            price: product.priceList, // Precio Lista por defecto
            priceCashReference: product.priceCash, // IMPORTANTE: Nico usa esto para comisión
            quantity: 1,
            soldBy: "", // Se completará abajo
          },
        ])
      }
    }
  }

  const handleProcessDirectSale = (method: "efectivo" | "tarjeta" | "transferencia") => {
    // Verificamos que todos los productos tengan asignado quién los vendió
    const missingSeller = directSaleItems.some(i => i.type === 'product' && !i.soldBy)
    if (missingSeller) {
      alert("Por favor, selecciona qué profesional vendió cada producto para la comisión.")
      return
    }

    if (directSaleItems.length > 0) {
      const total = directSaleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      addSale({
        type: "direct",
        items: directSaleItems,
        total,
        paymentMethod: method,
        processedBy: "Recepción",
      })
      
      setDirectSaleItems([])
      setDirectSalePatient("")
      setShowDirectSaleModal(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#D1B98D]">Cobrar</h2>
        <Button onClick={() => setShowDirectSaleModal(true)} className="bg-[#D1B98D] text-[#2d3529]">
          <ShoppingCart className="h-4 w-4 mr-2" /> Venta Directa
        </Button>
      </div>

      {/* Pendientes de Cobro */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#D1B98D]" />
            Pendientes de Cobro
            <Badge className="ml-2 bg-orange-500/20 text-orange-200">
              {pendingCharges.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCharges.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay cobros pendientes</p>
          ) : (
            <div className="space-y-4">
              {pendingCharges.map((apt) => (
                <div key={apt.id} className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/10 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-lg">{(patients.find(p => p.id === apt.patientId))?.name || "Paciente"}</p>
                    <p className="text-sm text-muted-foreground">Monto total: <span className="text-[#D1B98D] font-bold">${apt.totalAmount.toLocaleString()}</span></p>
                  </div>
                  <Button onClick={() => handleOpenPayment(apt.id)} className="bg-green-600 hover:bg-green-700">Cobrar</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Venta Directa */}
      <Dialog open={showDirectSaleModal} onOpenChange={setShowDirectSaleModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-[#D1B98D]">Venta Directa de Productos</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Label>Seleccionar Producto</Label>
            <Select onValueChange={handleAddProductToDirectSale}>
              <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Buscar producto..." /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {products?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} (${p.priceCash.toLocaleString()})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lista de productos en el carrito */}
            <div className="space-y-3">
              {directSaleItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-secondary/50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.itemName}</span>
                    <Button variant="ghost" size="sm" onClick={() => setDirectSaleItems(directSaleItems.filter((_, i) => i !== idx))}><X className="h-4 w-4"/></Button>
                  </div>
                  
                  {/* Selector de quién vendió para la COMISIÓN DE NICO */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-[#D1B98D]">¿Quién lo vendió?</p>
                    <Select value={item.soldBy} onValueChange={(val) => {
                      const newItems = [...directSaleItems];
                      newItems[idx].soldBy = val;
                      setDirectSaleItems(newItems);
                    }}>
                      <SelectTrigger className="h-8 text-xs bg-input border-border">
                        <SelectValue placeholder="Seleccionar profesional..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {professionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.shortName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            {directSaleItems.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-[#D1B98D]">${directSaleItems.reduce((s, i) => s + (i.priceCashReference * i.quantity), 0).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleProcessDirectSale("efectivo")} className="bg-green-600 text-[10px]">EFECTIVO</Button>
                  <Button onClick={() => handleProcessDirectSale("tarjeta")} className="bg-blue-600 text-[10px]">TARJETA</Button>
                  <Button onClick={() => handleProcessDirectSale("transferencia")} className="bg-purple-600 text-[10px]">TRANSF.</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Método de Pago (Turnos) */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-[#D1B98D]">Seleccionar Pago</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button onClick={() => handleProcessPayment("efectivo")} variant="outline" className="h-16 justify-start gap-4 border-green-500/30 hover:bg-green-500/10">
              <Banknote className="h-6 w-6 text-green-500" /> Efectivo
            </Button>
            <Button onClick={() => handleProcessPayment("tarjeta")} variant="outline" className="h-16 justify-start gap-4 border-blue-500/30 hover:bg-blue-500/10">
              <CreditCard className="h-6 w-6 text-blue-500" /> Tarjeta
            </Button>
            <Button onClick={() => handleProcessPayment("transferencia")} variant="outline" className="h-16 justify-start gap-4 border-purple-500/30 hover:bg-purple-500/10">
              <Building2 className="h-6 w-6 text-purple-500" /> Transferencia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}