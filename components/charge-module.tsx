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
import { Input } from "@/components/ui/input"
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
  
  const [directSaleProductSearch, setDirectSaleProductSearch] = useState("")
  const [directSaleProductMenuOpen, setDirectSaleProductMenuOpen] = useState(false)
  
  const [profSearch, setProfSearch] = useState<Record<number, string>>({})
  const [profMenuOpen, setProfMenuOpen] = useState<Record<number, boolean>>({})

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
        <h2 className="text-2xl font-bold text-[#16A34A]">Cobrar</h2>
        <Button onClick={() => setShowDirectSaleModal(true)} className="bg-[#16A34A] text-[#2d3529] hover:bg-[#15803D]">
          <ShoppingCart className="h-4 w-4 mr-2" /> Venta Directa
        </Button>
      </div>

      {/* Pendientes de Cobro */}
      <Card className="bg-card border-gray-200">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#16A34A]" />
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
                    <p className="text-sm text-muted-foreground">Monto total: <span className="text-[#16A34A] font-bold">${apt.totalAmount.toLocaleString()}</span></p>
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
        <DialogContent className="bg-card border-gray-200 text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Venta Directa de Productos</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Label>Seleccionar Producto</Label>
            <div className="relative">
              <Input
                placeholder="Escribir nombre o marca del producto..."
                value={directSaleProductSearch}
                onChange={(e) => {
                  setDirectSaleProductSearch(e.target.value)
                  setDirectSaleProductMenuOpen(true)
                }}
                onFocus={() => setDirectSaleProductMenuOpen(true)}
                onBlur={() => setTimeout(() => setDirectSaleProductMenuOpen(false), 200)}
                className="bg-input border-gray-200 text-foreground placeholder:text-gray-400"
              />
              {directSaleProductMenuOpen && (
                <div className="absolute top-[45px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[200px] overflow-y-auto z-[60]">
                  {products
                    .filter(p => !directSaleProductSearch || p.name.toLowerCase().includes(directSaleProductSearch.toLowerCase()) || p.category.toLowerCase().includes(directSaleProductSearch.toLowerCase()))
                    .map(p => (
                      <button
                        key={`charge-prod-${p.id}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100 flex justify-between items-center"
                        onClick={() => {
                          handleAddProductToDirectSale(p.id)
                          setDirectSaleProductSearch("")
                          setDirectSaleProductMenuOpen(false)
                        }}
                      >
                        <span className="font-semibold">{p.name} <span className="text-gray-400 font-normal text-xs ml-2">({p.category})</span></span>
                        <span className="text-[#16A34A] ml-2 font-bold">${p.priceCash.toLocaleString()}</span>
                      </button>
                    ))}
                  {products.filter(p => !directSaleProductSearch || p.name.toLowerCase().includes(directSaleProductSearch.toLowerCase()) || p.category.toLowerCase().includes(directSaleProductSearch.toLowerCase())).length === 0 && (
                     <div className="p-3 text-sm text-gray-500 text-center italic">No se encontraron productos.</div>
                  )}
                </div>
              )}
            </div>

            {/* Lista de productos en el carrito */}
            <div className="space-y-3">
              {directSaleItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-secondary/15 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.itemName}</span>
                    <Button variant="ghost" size="sm" onClick={() => setDirectSaleItems(directSaleItems.filter((_, i) => i !== idx))}><X className="h-4 w-4"/></Button>
                  </div>
                  
                  {/* Selector de quién vendió para la COMISIÓN DE NICO */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-[#16A34A]">¿Quién lo vendió?</p>
                    <div className="relative">
                      <Input
                        placeholder="Buscar profesional o Recepción..."
                        value={profSearch[idx] || item.soldBy}
                        onChange={(e) => {
                          setProfSearch({...profSearch, [idx]: e.target.value})
                          setProfMenuOpen({...profMenuOpen, [idx]: true})
                          
                          // Reset the actual assigned value if typing again
                          if (item.soldBy) {
                            const newItems = [...directSaleItems]
                            newItems[idx].soldBy = ""
                            setDirectSaleItems(newItems)
                          }
                        }}
                        onFocus={() => setProfMenuOpen({...profMenuOpen, [idx]: true})}
                        onBlur={() => setTimeout(() => setProfMenuOpen({...profMenuOpen, [idx]: false}), 200)}
                        className="h-8 text-xs bg-input border-gray-200 text-foreground placeholder:text-gray-400 focus-visible:ring-1"
                      />
                      {profMenuOpen[idx] && (
                        <div className="absolute top-[35px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[150px] overflow-y-auto z-[70]">
                           <button
                             className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100 flex items-center font-bold"
                             onClick={() => {
                               const newItems = [...directSaleItems];
                               newItems[idx].soldBy = "recepcion";
                               setDirectSaleItems(newItems);
                               setProfSearch({...profSearch, [idx]: "Recepción"})
                               setProfMenuOpen({...profMenuOpen, [idx]: false})
                             }}
                           >
                             🏦 Recepción
                           </button>
                          {professionals
                            .filter(p => !(profSearch[idx] && profSearch[idx] !== "Recepción" && profSearch[idx] !== "recepcion") || p.shortName.toLowerCase().includes(profSearch[idx].toLowerCase()))
                            .map(p => (
                              <button
                                key={`prof-${p.id}`}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-foreground transition-colors border-b border-gray-100"
                                onClick={() => {
                                  const newItems = [...directSaleItems];
                                  newItems[idx].soldBy = p.id;
                                  setDirectSaleItems(newItems);
                                  setProfSearch({...profSearch, [idx]: p.shortName})
                                  setProfMenuOpen({...profMenuOpen, [idx]: false})
                                }}
                              >
                                {p.shortName}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {directSaleItems.length > 0 && (
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-[#16A34A]">${directSaleItems.reduce((s, i) => s + (i.priceCashReference * i.quantity), 0).toLocaleString()}</span>
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
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Seleccionar Pago</DialogTitle></DialogHeader>
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