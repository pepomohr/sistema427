"use client"

import { useState, useMemo } from "react"
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
  X,
  AlertCircle,
  Search,
  Trash2
} from "lucide-react"

export function ChargeModule({ onNavigateToReception }: { onNavigateToReception?: (patientId: string, aptId: string) => void }) {
  const {
    patients = [],
    appointments = [],
    professionals = [],
    products = [],
    offers = [],
    completeAppointment,
    addSale,
    updatePatientGiftCardBalance,
  } = useClinicStore()

  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false)
  
  // Estados para el cobro de un turno específico
  const [activeApt, setActiveApt] = useState<any>(null)
  const [extraProducts, setExtraProducts] = useState<any[]>([])
  const [selectedOfferId, setSelectedOfferId] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "">("")
  const [prodSearch, setProdSearch] = useState("")
  const [showProdMenu, setShowProdMenu] = useState(false)

  // Estados originales para Venta Directa
  const [directSalePatient, setDirectSalePatient] = useState("")
  const [directSaleItems, setDirectSaleItems] = useState<any[]>([])
  const [directSaleProductSearch, setDirectSaleProductSearch] = useState("")
  const [directSaleProductMenuOpen, setDirectSaleProductMenuOpen] = useState(false)
  const [profSearch, setProfSearch] = useState<Record<number, string>>({})
  const [profMenuOpen, setProfMenuOpen] = useState<Record<number, boolean>>({})

  const isGiftCardGeneralItem = (item: any) => ((item?.itemName || "").toLowerCase().includes("gift card general"))
  const getDirectSaleUnitPrice = (item: any, method: "efectivo" | "tarjeta" | "transferencia") => {
    if (isGiftCardGeneralItem(item) && typeof item.customUnitPrice === "number" && item.customUnitPrice > 0) {
      return item.customUnitPrice
    }
    return method === "efectivo" ? (item.priceCashReference || item.price) : item.price
  }

  const pendingCharges = (appointments || []).filter(
    (a) => a.status === "pendiente_cobro" || a.status === "pending_payment"
  )

  const handleOpenCheckout = (apt: any) => {
    setActiveApt(apt)
    setExtraProducts([])
    setSelectedOfferId("")
    setPaymentMethod("")
    setShowCheckoutModal(true)
  }

  // --- CÁLCULOS EN TIEMPO REAL PARA EL TURNO ---
  const totals = useMemo(() => {
    if (!activeApt) return { subtotal: 0, total: 0 }
    let subtotal = 0
    activeApt.services.forEach((s: any) => {
      subtotal += (paymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price)
    })
    activeApt.products?.forEach((p: any) => {
      subtotal += (paymentMethod === 'efectivo' ? (p.priceCashReference || p.price) : p.price) * p.quantity
    })
    extraProducts.forEach((p: any) => {
      subtotal += (paymentMethod === 'efectivo' ? p.priceCash : p.priceList) * p.quantity
    })
    let finalTotal = subtotal
    if (selectedOfferId && selectedOfferId !== "none") {
      const offer = offers.find(o => o.id === selectedOfferId)
      if (offer) finalTotal = subtotal * (1 - offer.discountPercentage / 100)
    }
    const alreadyPaid = activeApt.paidAmount || 0
    const pending = Math.max(0, Math.round(finalTotal) - alreadyPaid)
    return { subtotal, total: pending, alreadyPaid }
  }, [activeApt, extraProducts, selectedOfferId, paymentMethod, offers])

  const handleFinalizePayment = () => {
    if (!paymentMethod) return
    completeAppointment(
      activeApt.id, 
      paymentMethod as any, 
      totals.total, 
      extraProducts.map(p => ({ product: p, quantity: p.quantity }))
    )
    setShowCheckoutModal(false)
    setActiveApt(null)
  }

  // Lógica original de Venta Directa
  const handleAddProductToDirectSale = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const existing = directSaleItems.find((i) => i.itemId === productId)
      if (existing) {
        setDirectSaleItems(directSaleItems.map((i) => i.itemId === productId ? { ...i, quantity: i.quantity + 1 } : i))
      } else {
        setDirectSaleItems([...directSaleItems, { type: "product", itemId: product.id, itemName: product.name, price: product.priceList, priceCashReference: product.priceCash, quantity: 1, soldBy: "" }])
      }
    }
  }

  const handleProcessDirectSale = async (method: "efectivo" | "tarjeta" | "transferencia") => {
    const missingSeller = directSaleItems.some(i => i.type === 'product' && !i.soldBy)
    if (missingSeller) { alert("Por favor, selecciona qué profesional vendió cada producto."); return; }
    if (directSaleItems.length > 0) {
      const hasInvalidGiftCardAmount = directSaleItems.some(i => isGiftCardGeneralItem(i) && !(typeof i.customUnitPrice === "number" && i.customUnitPrice > 0))
      if (hasInvalidGiftCardAmount) {
        alert("Ingresá un monto válido para la Gift Card General.");
        return;
      }

      const saleItems = directSaleItems.map(i => ({
        ...i,
        price: getDirectSaleUnitPrice(i, method),
        priceCashReference: getDirectSaleUnitPrice(i, method),
      }))

      const giftCardAmount = directSaleItems.reduce((sum, i) => {
        return isGiftCardGeneralItem(i) ? sum + (getDirectSaleUnitPrice(i, method) * i.quantity) : sum
      }, 0)
      if (giftCardAmount > 0 && !directSalePatient) {
        alert("Para acreditar una Gift Card, seleccioná el paciente.");
        return;
      }

      const total = saleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      await addSale({ type: "direct", items: saleItems as any, total, paymentMethod: method, processedBy: "Recepción" })
      if (giftCardAmount > 0 && directSalePatient) {
        await updatePatientGiftCardBalance(directSalePatient, giftCardAmount)
      }
      setDirectSaleItems([]); setDirectSalePatient(""); setShowDirectSaleModal(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Cobrar</h2>
        <Button onClick={() => setShowDirectSaleModal(true)} className="bg-[#16A34A] text-white hover:bg-[#15803D]">
          <ShoppingCart className="h-4 w-4 mr-2" /> Venta Directa
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#16A34A] flex items-center gap-2 text-xl font-bold">
            <Clock className="h-5 w-5 text-[#16A34A]" /> FILA DE COBROS (Esperando en Recepción)
            <Badge className="ml-2 bg-gray-100 text-black font-black border-gray-200 px-3 text-sm shadow-sm">
              {pendingCharges.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCharges.length === 0 ? (
            <p className="text-gray-500 font-medium text-center py-8">No hay cobros pendientes</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingCharges.map((apt) => {
                const pat = patients.find(p => p.id === apt.patientId);
                const prof = professionals.find(p => p.id === apt.professionalId);
                return (
                  <div 
                    key={apt.id} 
                    onClick={() => handleOpenCheckout(apt)}
                    className="bg-white p-5 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer hover:shadow-lg hover:border-[#16A34A]/50 transition-all group"
                  >
                    <div>
                      <p className="font-bold text-black text-xl group-hover:text-[#16A34A] transition-colors">
                        {apt.patientName || pat?.name || "Paciente Desconocido"}
                      </p>
                      <p className="text-sm text-gray-700 font-medium mt-1">Gabinete: <span className="font-black text-black">{prof?.shortName || '-'}</span></p>
                    </div>
                    <Badge className="bg-[#16A34A] text-white border-none font-bold text-sm px-4 py-2 uppercase shadow-sm group-hover:bg-[#15803D]">
                      Cobrar
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCheckoutModal} onOpenChange={(open) => !open && setShowCheckoutModal(false)}>
        <DialogContent className="bg-white text-black max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#16A34A] border-b border-gray-100 pb-2 uppercase">
              Cobrar a: {patients.find(p => p.id === activeApt?.patientId)?.name || activeApt?.patientName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black text-black text-sm uppercase">Resumen de Cuenta</Label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm space-y-2">
                  {activeApt?.services.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between font-bold text-black">
                      <span>{s.serviceName}</span>
                      <span>${(paymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price).toLocaleString()}</span>
                    </div>
                  ))}
                  {activeApt?.products?.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-orange-700 font-black">
                      <span>{p.quantity}x {p.productName}</span>
                      <span>${((paymentMethod === 'efectivo' ? (p.priceCashReference || p.price) : p.price) * p.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  {extraProducts.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-emerald-700 font-black animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setExtraProducts(extraProducts.filter((_, idx) => idx !== i))}><Trash2 size={14} className="text-red-500"/></button>
                        <span>{p.quantity}x {p.name}</span>
                      </div>
                      <span>${((paymentMethod === 'efectivo' ? p.priceCash : p.priceList) * p.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 relative">
                <Label className="text-xs font-black uppercase text-black">¿Agregar Producto Extra?</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                  <Input placeholder="Escribir producto..." className="pl-9 bg-white border-gray-300 text-black font-bold" value={prodSearch} onChange={(e) => { setProdSearch(e.target.value); setShowProdMenu(true); }} onFocus={() => setShowProdMenu(true)} />
                  {showProdMenu && prodSearch.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-gray-300 shadow-2xl rounded-md z-[100] max-h-48 overflow-y-auto">
                      {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                        <div key={p.id} className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0 flex justify-between font-black text-black" onClick={() => { setExtraProducts([...extraProducts, { ...p, quantity: 1 }]); setProdSearch(""); setShowProdMenu(false); }}>
                          <span>{p.name}</span>
                          <span className="text-[#16A34A]">${p.priceCash}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-black">Aplicar Oferta</Label>
                <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                  <SelectTrigger className="font-bold border-gray-300 text-black"><SelectValue placeholder="Sin oferta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-bold">Sin Descuento</SelectItem>
                    {offers.map(o => ( <SelectItem key={o.id} value={o.id} className="font-bold text-emerald-600">{o.name} (-{o.discountPercentage}%)</SelectItem> ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col justify-between bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="space-y-4">
                <Label className="font-black text-black uppercase text-center block">Método de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={paymentMethod === 'efectivo' ? 'default' : 'outline'} onClick={() => setPaymentMethod('efectivo')} className={`h-12 font-black ${paymentMethod === 'efectivo' ? 'bg-emerald-600' : 'text-black border-gray-300'}`}>EFECTIVO</Button>
                  <Button variant={paymentMethod === 'transferencia' ? 'default' : 'outline'} onClick={() => setPaymentMethod('transferencia')} className={`h-12 font-black ${paymentMethod === 'transferencia' ? 'bg-blue-600' : 'text-black border-gray-300'}`}>TRANSF.</Button>
                  <Button variant={paymentMethod === 'tarjeta' ? 'default' : 'outline'} onClick={() => setPaymentMethod('tarjeta')} className={`h-12 font-black ${paymentMethod === 'tarjeta' ? 'bg-purple-600' : 'text-black border-gray-300'}`}>TARJETA</Button>
                  <Button variant={paymentMethod === 'qr' ? 'default' : 'outline'} onClick={() => setPaymentMethod('qr')} className={`h-12 font-black ${paymentMethod === 'qr' ? 'bg-orange-500' : 'text-black border-gray-300'}`}>QR</Button>
                </div>
                <div className="pt-6 border-t border-gray-200 mt-6 text-center space-y-1 text-black">
                  {!!totals.alreadyPaid && (
                    <p className="text-xs font-bold text-emerald-700">
                      Seña registrada: ${totals.alreadyPaid.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm font-black uppercase">Total a Cobrar</p>
                  <p className="text-5xl font-black">${totals.total.toLocaleString()}</p>
                </div>
              </div>
              <Button 
                disabled={!paymentMethod} 
                onClick={handleFinalizePayment} 
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-black h-16 text-lg sm:text-xl shadow-xl mt-8 px-2 py-4 leading-tight"
              >
                <span className="whitespace-normal text-center">FINALIZAR COBRO</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDirectSaleModal} onOpenChange={setShowDirectSaleModal}>
        <DialogContent className="bg-card border-gray-200 text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Venta Directa de Productos</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-black font-bold">Paciente (solo si incluye Gift Card)</Label>
              <Select value={directSalePatient} onValueChange={setDirectSalePatient}>
                <SelectTrigger className="bg-input border-gray-200 text-black font-bold">
                  <SelectValue placeholder="Seleccionar paciente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.dni ? `- DNI ${p.dni}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label className="text-black font-bold">Seleccionar Producto</Label>
            <div className="relative">
              <Input placeholder="Escribir producto..." value={directSaleProductSearch} onChange={(e) => { setDirectSaleProductSearch(e.target.value); setDirectSaleProductMenuOpen(true) }} onFocus={() => setDirectSaleProductMenuOpen(true)} onBlur={() => setTimeout(() => setDirectSaleProductMenuOpen(false), 200)} className="bg-input border-gray-200 text-black font-bold" />
              {directSaleProductMenuOpen && (
                <div className="absolute bottom-[45px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[200px] overflow-y-auto z-[60]">
                  {products.filter(p => !directSaleProductSearch || p.name.toLowerCase().includes(directSaleProductSearch.toLowerCase())).map(p => (
                      <button key={`charge-prod-${p.id}`} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary hover:text-white text-black font-bold border-b border-gray-100 flex justify-between" onClick={() => { handleAddProductToDirectSale(p.id); setDirectSaleProductSearch(""); setDirectSaleProductMenuOpen(false) }}>
                        <span>{p.name}</span> <span className="text-[#16A34A]">${p.priceCash}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {directSaleItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-secondary/15 rounded-lg space-y-3">
                  <div className="flex justify-between items-center text-black font-bold"><span>{item.itemName}</span><Button variant="ghost" size="sm" onClick={() => setDirectSaleItems(directSaleItems.filter((_, i) => i !== idx))}><X className="h-4 w-4"/></Button></div>
                  {isGiftCardGeneralItem(item) && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-[#16A34A]">Monto Gift Card</p>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ej: 50000"
                        value={item.customUnitPrice ?? ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setDirectSaleItems(prev => prev.map((it, i) => i === idx ? {
                            ...it,
                            customUnitPrice: val === "" ? undefined : Number(val)
                          } : it))
                        }}
                        className="h-8 text-xs bg-input border-gray-200 text-black font-bold"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-[#16A34A]">¿Quién lo vendió?</p>
                    <div className="relative">
                      <Input placeholder="Buscar profesional..." value={profSearch[idx] || item.soldBy} onChange={(e) => { setProfSearch({...profSearch, [idx]: e.target.value}); setProfMenuOpen({...profMenuOpen, [idx]: true}) }} onFocus={() => setProfMenuOpen({...profMenuOpen, [idx]: true})} onBlur={() => setTimeout(() => setProfMenuOpen({...profMenuOpen, [idx]: false}), 200)} className="h-8 text-xs bg-input border-gray-200 text-black font-bold" />
                      {profMenuOpen[idx] && (
                        <div className="absolute top-[35px] left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md max-h-[150px] overflow-y-auto z-[70]">
                           <button className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-black font-black border-b" onClick={() => { const newItems = [...directSaleItems]; newItems[idx].soldBy = "recepcion"; setDirectSaleItems(newItems); setProfSearch({...profSearch, [idx]: "Recepción"}); setProfMenuOpen({...profMenuOpen, [idx]: false}) }}>Recepción</button>
                          {professionals.filter(p => !profSearch[idx] || p.shortName.toLowerCase().includes(profSearch[idx].toLowerCase())).map(p => (
                              <button key={`prof-${p.id}`} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary hover:text-white text-black font-bold border-b" onClick={() => { const newItems = [...directSaleItems]; newItems[idx].soldBy = p.id; setDirectSaleItems(newItems); setProfSearch({...profSearch, [idx]: p.shortName}); setProfMenuOpen({...profMenuOpen, [idx]: false}) }}>{p.shortName}</button>
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
                <div className="flex justify-between text-xl font-black text-black"><span>Total:</span><span className="text-[#16A34A]">${directSaleItems.reduce((s, i) => s + (isGiftCardGeneralItem(i) ? ((i.customUnitPrice || 0) * i.quantity) : ((i.priceCashReference || i.price || 0) * i.quantity)), 0).toLocaleString()}</span></div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleProcessDirectSale("efectivo")} className="bg-green-600 font-black">EFECTIVO</Button>
                  <Button onClick={() => handleProcessDirectSale("tarjeta")} className="bg-blue-600 font-black">TARJETA</Button>
                  <Button onClick={() => handleProcessDirectSale("transferencia")} className="bg-purple-600 font-black">TRANSF.</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}