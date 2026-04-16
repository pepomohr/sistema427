"use client"

import { useState, useMemo, useEffect } from "react"
import { useClinicStore, type Sale, type SaleItem, type PaymentSplit } from "@/lib/store"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useConfirm } from "@/hooks/use-confirm"
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
  Trash2,
  MessageSquare
} from "lucide-react"

export function ChargeModule({ onNavigateToReception }: { onNavigateToReception?: (patientId: string, aptId: string) => void }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const {
    patients = [],
    appointments = [],
    professionals = [],
    products = [],
    offers = [],
    completeAppointment,
    addSale,
    addSaleMultipago,
    updatePatientGiftCardBalance,
    fetchOffers,
    fetchAppointments,
    currentUser,
  } = useClinicStore()

  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false)

  // Estados para el cobro de un turno específico
  const [activeApt, setActiveApt] = useState<any>(null)
  const [extraProducts, setExtraProducts] = useState<any[]>([])
  const [selectedOfferId, setSelectedOfferId] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card" | "">("")
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "">("")
  const [secondPaymentAmount, setSecondPaymentAmount] = useState<string>("")
  const [checkoutObservations, setCheckoutObservations] = useState<string>("")
  const [prodSearch, setProdSearch] = useState("")
  const [showProdMenu, setShowProdMenu] = useState(false)

  // Estados para Venta Directa
  const [directSalePatient, setDirectSalePatient] = useState("")
  const [directSaleItems, setDirectSaleItems] = useState<any[]>([])
  const [directSaleProductSearch, setDirectSaleProductSearch] = useState("")
  const [directSaleProductMenuOpen, setDirectSaleProductMenuOpen] = useState(false)
  const [profSearch, setProfSearch] = useState<Record<number, string>>({})
  const [profMenuOpen, setProfMenuOpen] = useState<Record<number, boolean>>({})
  const [directSaleOfferId, setDirectSaleOfferId] = useState<string>("")
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card" | "">("")
  const [directSaleSecondMethod, setDirectSaleSecondMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "qr" | "">("")
  const [directSaleSecondAmount, setDirectSaleSecondAmount] = useState<string>("")
  const [directSaleObservations, setDirectSaleObservations] = useState<string>("")

  const isGiftCardGeneralItem = (item: any) => ((item?.itemName || "").toLowerCase().includes("gift card general"))
  const getDirectSaleUnitPrice = (item: any, method: "efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card" | "") => {
    if (isGiftCardGeneralItem(item) && typeof item.customUnitPrice === "number" && item.customUnitPrice > 0) {
      return item.customUnitPrice
    }
    return method === "efectivo" ? (item.priceCashReference || item.price) : item.price
  }

  const directSaleDisplayTotal = useMemo(() => {
    if (directSaleItems.length === 0) return 0
    const methodForPreview = directSalePaymentMethod || "efectivo"
    const subtotal = directSaleItems.reduce((sum, i) => sum + (getDirectSaleUnitPrice(i, methodForPreview) * i.quantity), 0)
    if (!directSaleOfferId) return subtotal
    const offer = offers.find(o => o.id === directSaleOfferId)
    if (!offer) return subtotal
    return Math.max(0, Math.round(subtotal * (1 - offer.discountPercentage / 100)))
  }, [directSaleItems, directSalePaymentMethod, directSaleOfferId, offers])

  const pendingCharges = (appointments || []).filter(
    (a) => a.status === "pendiente_cobro" || a.status === "pending_payment"
  )

  useEffect(() => {
    if (typeof fetchOffers === "function") fetchOffers()
  }, [fetchOffers])

  // Polling de turnos cada 20 segundos como fallback al Realtime
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof fetchAppointments === "function") fetchAppointments()
    }, 20000)
    return () => clearInterval(interval)
  }, [fetchAppointments])

  const handleOpenCheckout = (apt: any) => {
    setActiveApt(apt)
    setExtraProducts([])
    setSelectedOfferId("")
    // Refrescar balance del paciente desde DB para tener dato actualizado
    if (apt?.patientId) {
      useClinicStore.getState().refreshPatientBalance(apt.patientId)
    }
    setPaymentMethod("")
    setSecondPaymentMethod("")
    setSecondPaymentAmount("")
    setCheckoutObservations("")
    setShowCheckoutModal(true)
  }

  // --- CÁLCULOS EN TIEMPO REAL PARA EL TURNO ---
  const totals = useMemo(() => {
    if (!activeApt) return { subtotal: 0, total: 0 }
    let subtotal = 0
    ;(activeApt.services || []).forEach((s: any) => {
      subtotal += (paymentMethod === 'efectivo' ? (s.priceCash || s.price) : s.price)
    })
    ;(activeApt.products || []).forEach((p: any) => {
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
    if (paymentMethod === 'gift_card') {
      const aptPat = patients.find(p => p.id === activeApt?.patientId)
      const bal = aptPat?.giftCardBalance || 0
      if (bal <= 0) {
        alert('Este paciente no tiene saldo a favor.')
        return
      }
      if (bal >= totals.total && secondPaymentMethod && parseFloat(secondPaymentAmount) > 0) {
        // Saldo cubre todo el turno → no puede usarse como pago parcial
        alert(`El saldo disponible ($${bal.toLocaleString('es-AR')}) cubre el total del turno. No se puede dividir el pago: el saldo a favor debe cubrir el total completo.`)
        return
      }
      if (bal < totals.total && !secondPaymentMethod) {
        // Saldo no alcanza y no hay segundo método
        alert(`Saldo insuficiente para cubrir el turno completo ($${totals.total.toLocaleString('es-AR')}). Disponible: $${bal.toLocaleString('es-AR')}. Seleccioná un segundo método de pago por la diferencia de $${(totals.total - bal).toLocaleString('es-AR')}.`)
        return
      }
    }

    // Armar los splits de pago
    const splits: PaymentSplit[] = []
    const secondAmt = secondPaymentAmount ? parseFloat(secondPaymentAmount) : 0
    if (paymentMethod === 'gift_card' && secondPaymentMethod && secondAmt > 0) {
      // Saldo < total: gift_card cubre lo que puede, resto con segundo método
      const aptPat = patients.find(p => p.id === activeApt?.patientId)
      const bal = aptPat?.giftCardBalance || 0
      splits.push({ method: 'gift_card' as any, amount: bal })
      splits.push({ method: secondPaymentMethod as any, amount: totals.total - bal })
    } else if (secondPaymentMethod && secondAmt > 0) {
      const firstAmt = Math.max(0, totals.total - secondAmt)
      splits.push({ method: paymentMethod as any, amount: firstAmt })
      splits.push({ method: secondPaymentMethod as any, amount: secondAmt })
    } else {
      splits.push({ method: paymentMethod as any, amount: totals.total })
    }

    completeAppointment(
      activeApt.id,
      paymentMethod as any,
      totals.total,
      extraProducts.map(p => ({ product: p, quantity: p.quantity })),
      "",
      splits,
      checkoutObservations || undefined
    )
    setShowCheckoutModal(false)
    setActiveApt(null)
  }

  // Lógica de Venta Directa
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

  const handleProcessDirectSale = async (method: "efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card") => {
    if (!directSalePatient) {
      alert("Seleccioná el paciente antes de procesar la venta.")
      return
    }
    const missingSeller = directSaleItems.some(i => i.type === 'product' && !i.soldBy)
    if (missingSeller) { alert("Por favor, selecciona qué profesional vendió cada producto."); return; }
    if (directSaleItems.length > 0) {
      const hasInvalidGiftCardAmount = directSaleItems.some(i => isGiftCardGeneralItem(i) && !(typeof i.customUnitPrice === "number" && i.customUnitPrice > 0))
      if (hasInvalidGiftCardAmount) {
        alert("Ingresá un monto válido para la Gift Card General.");
        return;
      }

      // Para gift_card se cobra precio efectivo (es dinero del paciente)
      const pricingMethod = method === 'gift_card' ? 'efectivo' : method
      const saleItems = directSaleItems.map(i => ({
        ...i,
        price: getDirectSaleUnitPrice(i, pricingMethod),
        // priceCashReference siempre en efectivo para comisión correcta
        priceCashReference: isGiftCardGeneralItem(i) ? (i.customUnitPrice || 0) : (i.priceCashReference || i.price),
      }))

      const giftCardAmount = directSaleItems.reduce((sum, i) => {
        return isGiftCardGeneralItem(i) ? sum + (getDirectSaleUnitPrice(i, method) * i.quantity) : sum
      }, 0)

      const subtotal = saleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      let total = subtotal
      if (directSaleOfferId && directSaleOfferId !== "none") {
        const offer = offers.find(o => o.id === directSaleOfferId)
        if (offer) total = Math.max(0, Math.round(subtotal * (1 - offer.discountPercentage / 100)))
      }

      // Armar splits de pago para venta directa
      const splits: PaymentSplit[] = []
      const secondAmt = directSaleSecondAmount ? parseFloat(directSaleSecondAmount) : 0
      if (directSaleSecondMethod && secondAmt > 0) {
        const firstAmt = Math.max(0, total - secondAmt)
        splits.push({ method: method as any, amount: firstAmt })
        splits.push({ method: directSaleSecondMethod as any, amount: secondAmt })
      } else {
        splits.push({ method: method as any, amount: total })
      }

      await addSaleMultipago({
        type: "direct",
        items: saleItems as any,
        total,
        paymentMethod: method,
        paymentSplits: splits,
        observations: directSaleObservations || undefined,
        patientId: directSalePatient || undefined,
        source: 'recepcion',
        processedBy: currentUser?.name || "Recepción"
      })
      if (giftCardAmount > 0 && directSalePatient) {
        await updatePatientGiftCardBalance(directSalePatient, giftCardAmount)
      }
      setDirectSaleItems([])
      setDirectSalePatient("")
      setDirectSaleOfferId("")
      setDirectSaleSecondMethod("")
      setDirectSaleSecondAmount("")
      setDirectSaleObservations("")
      setShowDirectSaleModal(false)
    }
  }

  const paymentColors: Record<string, string> = {
    efectivo: 'bg-emerald-600',
    transferencia: 'bg-blue-600',
    tarjeta: 'bg-purple-600',
    qr: 'bg-orange-500',
    gift_card: 'bg-pink-600',
  }
  const paymentLabels: Record<string, string> = {
    efectivo: 'EFECTIVO',
    transferencia: 'TRANSF.',
    tarjeta: 'TARJETA',
    qr: 'QR',
    gift_card: 'SALDO A FAVOR',
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />
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

      {/* MODAL: Cobrar turno */}
      <Dialog open={showCheckoutModal} onOpenChange={(open) => !open && setShowCheckoutModal(false)}>
        <DialogContent className="bg-white text-black max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#16A34A] border-b border-gray-100 pb-2 uppercase">
              Cobrar a: {patients.find(p => p.id === activeApt?.patientId)?.name || activeApt?.patientName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Columna izquierda: resumen + extras + oferta + observaciones */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black text-black text-sm uppercase">Resumen de Cuenta</Label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm space-y-2">
                  {(activeApt?.services || []).map((s: any, i: number) => (
                    <div key={i} className="flex justify-between font-bold text-black">
                      <span>{s.serviceName}</span>
                      <span>${(paymentMethod === 'efectivo' ? (s.priceCash || s.price || 0) : (s.price || 0)).toLocaleString()}</span>
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
              {/* Observaciones */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-black flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Observaciones
                </Label>
                <Textarea
                  placeholder="Ej: Abono $35.000, quedan $10.000 a favor para próxima sesión..."
                  value={checkoutObservations}
                  onChange={(e) => setCheckoutObservations(e.target.value)}
                  className="bg-white border-gray-300 text-black font-medium text-sm min-h-[70px] resize-none"
                />
              </div>
            </div>

            {/* Columna derecha: método de pago + 2do método + total + botón */}
            <div className="flex flex-col justify-between bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="space-y-4">
                <Label className="font-black text-black uppercase text-center block">Método de Pago</Label>
                {(() => {
                  const aptPat = patients.find(p => p.id === activeApt?.patientId)
                  const bal = aptPat?.giftCardBalance || 0
                  return bal > 0 ? (
                    <p className="text-xs text-pink-600 font-bold text-center">💳 Saldo disponible: ${bal.toLocaleString('es-AR')}</p>
                  ) : null
                })()}
                <div className="grid grid-cols-2 gap-2">
                  {(['efectivo', 'transferencia', 'tarjeta', 'qr'] as const).map(m => (
                    <Button
                      key={m}
                      variant={paymentMethod === m ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod(m)
                        if (secondPaymentMethod === m) { setSecondPaymentMethod(""); setSecondPaymentAmount("") }
                      }}
                      className={`h-12 font-black ${paymentMethod === m ? paymentColors[m] : 'text-black border-gray-300'}`}
                    >
                      {paymentLabels[m]}
                    </Button>
                  ))}
                  {(() => {
                    const aptPat = patients.find(p => p.id === activeApt?.patientId)
                    const bal = aptPat?.giftCardBalance || 0
                    const isSelected = paymentMethod === 'gift_card'
                    return (
                      <div className="col-span-2">
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => {
                            if (bal <= 0) {
                              confirm({ title: "Sin saldo a favor", description: "Este paciente no tiene saldo a favor disponible.", actionType: "info", onConfirm: () => {} })
                              return
                            }
                            setPaymentMethod('gift_card' as any)
                            setSecondPaymentMethod(""); setSecondPaymentAmount("")
                          }}
                          className={`w-full h-12 font-black ${isSelected ? paymentColors['gift_card'] : 'text-pink-600 border-pink-300 hover:bg-pink-50'}`}
                        >
                          💳 SALDO A FAVOR {bal > 0 ? `· $${bal.toLocaleString('es-AR')}` : ''}
                        </Button>
                      </div>
                    )
                  })()}
                </div>

                {/* 2do método de pago: aparece si hay método principal, excepto gift_card cuando el saldo cubre todo */}
                {paymentMethod && !(paymentMethod === 'gift_card' && (() => { const aptPat = patients.find(p => p.id === activeApt?.patientId); return (aptPat?.giftCardBalance || 0) >= totals.total })()) && (
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <Label className="font-black text-black uppercase text-xs block">2do Método (opcional)</Label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['efectivo', 'transferencia', 'tarjeta', 'qr'] as const)
                        .filter(m => m !== paymentMethod)
                        .map(m => {
                          const isSel = secondPaymentMethod === m
                          return (
                            <Button
                              key={m}
                              variant={isSel ? 'default' : 'outline'}
                              onClick={() => {
                                setSecondPaymentMethod(isSel ? '' : m)
                                if (isSel) setSecondPaymentAmount('')
                              }}
                              className={`h-9 text-xs font-black ${isSel ? paymentColors[m] : 'text-black border-gray-300'}`}
                            >
                              {paymentLabels[m]}
                            </Button>
                          )
                        })}
                    </div>
                    {secondPaymentMethod && (
                      <Input
                        type="number"
                        min={0}
                        placeholder="Monto del 2do pago"
                        value={secondPaymentAmount}
                        onChange={(e) => setSecondPaymentAmount(e.target.value)}
                        className="h-9 text-sm bg-white border-gray-300 text-black font-bold"
                      />
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 mt-2 text-center space-y-1 text-black">
                  {!!totals.alreadyPaid && (
                    <p className="text-xs font-bold text-emerald-700">
                      Seña registrada: ${totals.alreadyPaid.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm font-black uppercase">Total a Cobrar</p>
                  <p className="text-5xl font-black">${totals.total.toLocaleString()}</p>
                  {secondPaymentMethod && secondPaymentAmount && parseFloat(secondPaymentAmount) > 0 && (
                    <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                      <p>{paymentLabels[paymentMethod]}: ${Math.max(0, totals.total - parseFloat(secondPaymentAmount)).toLocaleString()}</p>
                      <p>{paymentLabels[secondPaymentMethod]}: ${parseFloat(secondPaymentAmount).toLocaleString()}</p>
                    </div>
                  )}
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

      {/* MODAL: Venta Directa (AHORA CON TOPE DE ALTURA Y SCROLL) */}
      <Dialog open={showDirectSaleModal} onOpenChange={setShowDirectSaleModal}>
        {/* EL CAMBIO ESTÁ ACÁ: max-h-[85vh] y overflow-y-auto */}
        <DialogContent className="bg-card border-gray-200 text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#16A34A]">Venta Directa de Productos</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-black font-bold">Paciente <span className="text-red-500">*</span></Label>
              <Select value={directSalePatient} onValueChange={(id) => { setDirectSalePatient(id); if (id) useClinicStore.getState().refreshPatientBalance(id) }}>
                <SelectTrigger className="bg-input border-gray-200 text-black font-bold">
                  <SelectValue placeholder="Seleccionar paciente (obligatorio)" />
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
              <div className="space-y-2">
                <Label className="text-black font-bold">Aplicar Oferta</Label>
                <Select value={directSaleOfferId || "none"} onValueChange={(val) => setDirectSaleOfferId(val === "none" ? "" : val)}>
                  <SelectTrigger className="bg-input border-gray-200 text-black font-bold">
                    <SelectValue placeholder="Sin oferta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin Descuento</SelectItem>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name} (-{o.discountPercentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {directSaleItems.length > 0 && (
              <div className="pt-4 border-t border-gray-200 space-y-4">
                {/* TOTAL */}
                <div className="flex justify-between text-2xl font-black text-black bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                  <span>Total:</span>
                  <span className="text-[#16A34A]">${directSaleDisplayTotal.toLocaleString()}</span>
                </div>

                {/* MÉTODO PRINCIPAL */}
                <div className="space-y-2">
                  <Label className="text-black font-bold text-xs uppercase">Método de Pago</Label>
                  {(() => {
                    const dsPat = patients.find(p => p.id === directSalePatient)
                    const bal = dsPat?.giftCardBalance || 0
                    return bal > 0 ? <p className="text-xs text-pink-600 font-bold">💳 Saldo disponible: ${bal.toLocaleString('es-AR')}</p> : null
                  })()}
                  <div className="grid grid-cols-2 gap-2">
                    {(['efectivo', 'tarjeta', 'transferencia', 'qr'] as const).map(m => (
                      <Button
                        key={m}
                        variant={directSalePaymentMethod === m ? 'default' : 'outline'}
                        onClick={() => { setDirectSalePaymentMethod(m); setDirectSaleSecondMethod(''); setDirectSaleSecondAmount('') }}
                        className={`h-11 font-black ${directSalePaymentMethod === m ? paymentColors[m] : 'text-black border-gray-300'}`}
                      >
                        {paymentLabels[m]}
                      </Button>
                    ))}
                    {(() => {
                      const dsPat = patients.find(p => p.id === directSalePatient)
                      const bal = dsPat?.giftCardBalance || 0
                      const isSelected = (directSalePaymentMethod as any) === 'gift_card'
                      return (
                        <div className="col-span-2">
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={bal <= 0}
                            onClick={() => { setDirectSalePaymentMethod('gift_card' as any); setDirectSaleSecondMethod(''); setDirectSaleSecondAmount('') }}
                            className={`w-full h-11 font-black ${isSelected ? 'bg-pink-600 text-white' : bal > 0 ? 'text-pink-600 border-pink-300 hover:bg-pink-50' : 'text-gray-400 border-gray-200'}`}
                          >
                            💳 SALDO A FAVOR {bal > 0 ? `· $${bal.toLocaleString('es-AR')}` : '· sin saldo'}
                          </Button>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* 2DO MÉTODO COLAPSABLE */}
                {directSalePaymentMethod && (directSalePaymentMethod as any) !== 'gift_card' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => { setDirectSaleSecondMethod(directSaleSecondMethod ? '' : 'efectivo' as any); setDirectSaleSecondAmount('') }}
                      className="text-xs text-gray-500 underline font-bold"
                    >
                      {directSaleSecondMethod ? '− Quitar 2do método' : '+ Agregar 2do método (opcional)'}
                    </button>
                    {directSaleSecondMethod && (
                      <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-4 gap-1">
                          {(['efectivo', 'tarjeta', 'transferencia', 'qr'] as const)
                            .filter(m => m !== directSalePaymentMethod)
                            .map(m => (
                              <Button
                                key={m}
                                variant={directSaleSecondMethod === m ? 'default' : 'outline'}
                                onClick={() => setDirectSaleSecondMethod(m)}
                                className={`h-9 text-xs font-black ${directSaleSecondMethod === m ? paymentColors[m] : 'text-black border-gray-300'}`}
                              >
                                {paymentLabels[m]}
                              </Button>
                            ))}
                        </div>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Monto del 2do pago"
                          value={directSaleSecondAmount}
                          onChange={(e) => setDirectSaleSecondAmount(e.target.value)}
                          className="h-9 text-sm bg-white border-gray-300 text-black font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* OBSERVACIONES */}
                <div className="space-y-1">
                  <Label className="text-black font-bold text-xs uppercase flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Observaciones
                  </Label>
                  <Textarea
                    placeholder="Ej: Abono, saldo a favor, aclaración..."
                    value={directSaleObservations}
                    onChange={(e) => setDirectSaleObservations(e.target.value)}
                    className="min-h-[60px] text-sm bg-input border-gray-200 text-black font-medium resize-none"
                  />
                </div>

                {/* BOTÓN GRANDE CONFIRMAR */}
                <Button
                  disabled={!directSalePaymentMethod}
                  onClick={async () => {
                    if ((directSalePaymentMethod as any) === 'gift_card') {
                      if (!directSalePatient) { alert("Seleccioná el paciente primero."); return }
                      const dsPat = patients.find(p => p.id === directSalePatient)
                      const bal = dsPat?.giftCardBalance || 0
                      if (bal < directSaleDisplayTotal) {
                        alert(`Saldo insuficiente. Disponible: $${bal.toLocaleString('es-AR')}, necesario: $${directSaleDisplayTotal.toLocaleString('es-AR')}`)
                        return
                      }
                      const pacienteCapturado = directSalePatient
                      const totalCapturado = directSaleDisplayTotal
                      // Procesar con gift_card como método real (no fakeando efectivo)
                      await handleProcessDirectSale("gift_card")
                      await updatePatientGiftCardBalance(pacienteCapturado, -totalCapturado)
                    } else {
                      await handleProcessDirectSale(directSalePaymentMethod as any)
                    }
                  }}
                  className="w-full h-14 text-lg font-black bg-[#16A34A] hover:bg-[#15803d] text-white shadow-lg"
                >
                  CONFIRMAR VENTA
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}