"use client"

import { useState, useEffect, useMemo } from "react"
import { useWholesaleStore, type WholesaleCartItem, type WholesaleClient, type WholesaleProduct } from "@/lib/wholesale-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart, Users, Package, CreditCard, Plus, Minus, Trash2,
  Search, X, AlertTriangle, CheckCircle, ChevronDown, History, Truck
} from "lucide-react"

type Tab = "venta" | "revendedores" | "stock" | "cuentas"

const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Cheque"]

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

const formatDate = (str: string) => {
  const d = new Date(str)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function WholesaleModule() {
  const {
    clients, products, sales, payments,
    fetchClients, fetchProducts, fetchSales, fetchPayments,
    addClient, addProduct, updateProductStock, processWholesaleSale, addPayment
  } = useWholesaleStore()

  const [tab, setTab] = useState<Tab>("venta")
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    fetchClients()
    fetchProducts()
    fetchSales()
    fetchPayments()
  }, [])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000) }
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 5000) }

  // ─── NUEVA VENTA ─────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [cart, setCart] = useState<WholesaleCartItem[]>([])
  const [paidAmount, setPaidAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Efectivo")
  const [observations, setObservations] = useState("")

  const filteredProducts = useMemo(() =>
    products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0),
    [products, productSearch]
  )

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const paid = parseFloat(paidAmount) || 0
  const debt = Math.max(0, cartTotal - paid)

  const addToCart = (product: WholesaleProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
    setProductSearch("")
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      const newQty = i.quantity + delta
      if (newQty <= 0) return i
      if (newQty > i.product.stock) return i
      return { ...i, quantity: newQty }
    }))
  }

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId))

  const handleProcessSale = async () => {
    if (!selectedClientId) return showError("Seleccioná un cliente")
    if (cart.length === 0) return showError("El carrito está vacío")
    if (!paymentMethod) return showError("Seleccioná un método de pago")
    if (paid > cartTotal) return showError("El abono no puede superar el total")

    setLoading(true)
    try {
      await processWholesaleSale({
        clientId: selectedClientId,
        cart,
        totalAmount: cartTotal,
        paidAmount: paid,
        paymentMethod,
        observations,
      })
      setCart([])
      setSelectedClientId("")
      setPaidAmount("")
      setObservations("")
      showSuccess("¡Venta registrada correctamente!")
    } catch (err: any) {
      showError(err.message || "Error al procesar la venta")
    } finally {
      setLoading(false)
    }
  }

  // ─── REVENDEDORES ────────────────────────────────────────────────────────
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({ name: "", cuit: "", phone: "" })
  const [clientSearch, setClientSearch] = useState("")

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.cuit || "").includes(clientSearch)
  )

  const handleAddClient = async () => {
    if (!clientForm.name.trim()) return showError("El nombre es obligatorio")
    setLoading(true)
    try {
      await addClient(clientForm)
      setClientForm({ name: "", cuit: "", phone: "" })
      setShowClientModal(false)
      showSuccess("Cliente agregado")
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── STOCK MAYORISTA ─────────────────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false)
  const [productForm, setProductForm] = useState({ name: "", sku: "", price: "", stock: "" })
  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null)
  const [stockSearch, setStockSearch] = useState("")

  const filteredStock = products.filter(p =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(stockSearch.toLowerCase())
  )

  const handleAddProduct = async () => {
    if (!productForm.name.trim()) return showError("El nombre es obligatorio")
    setLoading(true)
    try {
      await addProduct({
        name: productForm.name,
        sku: productForm.sku,
        price: parseFloat(productForm.price) || 0,
        stock: parseInt(productForm.stock) || 0,
      })
      setProductForm({ name: "", sku: "", price: "", stock: "" })
      setShowProductModal(false)
      showSuccess("Producto agregado")
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStock = async (id: string) => {
    if (!editingStock) return
    const newStock = parseInt(editingStock.value)
    if (isNaN(newStock) || newStock < 0) return showError("Stock inválido")
    setLoading(true)
    try {
      await updateProductStock(id, newStock)
      setEditingStock(null)
      showSuccess("Stock actualizado")
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── CUENTAS CORRIENTES ──────────────────────────────────────────────────
  const [payingClientId, setPayingClientId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "Efectivo", notes: "" })
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null)

  const debtClients = clients.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance)

  const handleAddPayment = async () => {
    if (!payingClientId) return
    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) return showError("Ingresá un monto válido")
    setLoading(true)
    try {
      await addPayment({ clientId: payingClientId, amount, paymentMethod: paymentForm.method, notes: paymentForm.notes })
      setPayingClientId(null)
      setPaymentForm({ amount: "", method: "Efectivo", notes: "" })
      showSuccess("Pago asentado correctamente")
    } catch (err: any) {
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clientPayments = (clientId: string) => payments.filter(p => p.clientId === clientId)
  const clientSales = (clientId: string) => sales.filter(s => s.clientId === clientId)

  // ─── RENDER ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "venta", label: "Nueva Venta", icon: ShoppingCart },
    { id: "revendedores", label: "Revendedores", icon: Users },
    { id: "stock", label: "Stock", icon: Package },
    { id: "cuentas", label: "Cuentas Corrientes", icon: CreditCard },
  ]

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-700">Distribuidora Mayorista</h1>
          <p className="text-xs text-muted-foreground">Productos Helue · Ventas B2B</p>
        </div>
      </div>

      {/* Toast messages */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-blue-50 p-1 rounded-2xl">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id ? "bg-blue-600 text-white shadow-sm" : "text-blue-600 hover:bg-blue-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── TAB: NUEVA VENTA ─── */}
      {tab === "venta" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Columna izquierda: cliente + búsqueda */}
          <div className="space-y-4">
            {/* Selector de cliente */}
            <Card className="border-blue-100">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-blue-700">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:border-blue-400"
                >
                  <option value="">— Seleccioná un revendedor —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.balance > 0 ? ` (debe ${fmt(c.balance)})` : ""}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Buscador de productos */}
            <Card className="border-blue-100">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-blue-700">Agregar productos</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
                  <Input
                    placeholder="Buscar producto Helue..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="pl-9 border-blue-200 bg-blue-50"
                  />
                </div>
                {productSearch && (
                  <div className="border border-blue-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">Sin resultados con stock disponible</p>
                    ) : filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left border-b border-blue-50 last:border-0 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku && `SKU: ${p.sku} · `}Stock: {p.stock}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{fmt(p.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: carrito + pago */}
          <div className="space-y-4">
            <Card className="border-blue-100">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-blue-700">Carrito ({cart.length})</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {cart.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Buscá productos para agregar</p>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(item.product.price)} c/u · Stock: {item.product.stock}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-100">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="p-1 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-700">{fmt(item.product.price * item.quantity)}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="border-t border-blue-100 pt-3 space-y-3">
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-blue-700">{fmt(cartTotal)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Abono inicial</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={paidAmount}
                            onChange={e => setPaidAmount(e.target.value)}
                            className="border-blue-200 bg-blue-50 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Método de pago</Label>
                          <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-blue-50 focus:outline-none mt-1"
                          >
                            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {debt > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">
                            {fmt(debt)} irá a Cuenta Corriente del revendedor
                          </p>
                        </div>
                      )}

                      <Textarea
                        placeholder="Observaciones (opcional)"
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="border-blue-200 bg-blue-50 text-sm resize-none h-16"
                      />

                      <Button
                        onClick={handleProcessSale}
                        disabled={loading || cart.length === 0 || !selectedClientId || paid > cartTotal}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        {loading ? "Procesando..." : `Confirmar Venta · ${fmt(cartTotal)}`}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB: REVENDEDORES ─── */}
      {tab === "revendedores" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
              <Input placeholder="Buscar revendedor..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-9 border-blue-200 bg-blue-50" />
            </div>
            <Button onClick={() => setShowClientModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          <div className="space-y-2">
            {filteredClients.map(c => (
              <Card key={c.id} className="border-blue-100">
                <CardContent className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.cuit && `CUIT: ${c.cuit}`}{c.cuit && c.phone && " · "}{c.phone && `Tel: ${c.phone}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {c.balance > 0
                      ? <Badge className="bg-red-100 text-red-700 border-red-200">Debe {fmt(c.balance)}</Badge>
                      : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Al día</Badge>
                    }
                    <p className="text-xs text-muted-foreground mt-1">{sales.filter(s => s.clientId === c.id).length} ventas</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredClients.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No hay revendedores</p>}
          </div>

          {/* Modal nuevo cliente */}
          {showClientModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-sm border-blue-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-700">Nuevo Revendedor</CardTitle>
                    <button onClick={() => setShowClientModal(false)}><X className="h-4 w-4" /></button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Nombre *</Label><Input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  <div><Label className="text-xs">CUIT</Label><Input value={clientForm.cuit} onChange={e => setClientForm({ ...clientForm, cuit: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  <div><Label className="text-xs">Teléfono</Label><Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  <Button onClick={handleAddClient} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: STOCK ─── */}
      {tab === "stock" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
              <Input placeholder="Buscar producto..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} className="pl-9 border-blue-200 bg-blue-50" />
            </div>
            <Button onClick={() => setShowProductModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          <div className="space-y-2">
            {filteredStock.map(p => (
              <Card key={p.id} className="border-blue-100">
                <CardContent className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-blue-700">{fmt(p.price)}</p>
                    {editingStock?.id === p.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          type="number"
                          value={editingStock.value}
                          onChange={e => setEditingStock({ id: p.id, value: e.target.value })}
                          className="w-20 h-7 text-xs border-blue-300"
                          autoFocus
                        />
                        <button onClick={() => handleSaveStock(p.id)} className="text-xs text-emerald-600 font-bold hover:text-emerald-700">OK</button>
                        <button onClick={() => setEditingStock(null)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingStock({ id: p.id, value: String(p.stock) })}
                        className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock < 5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                      >
                        Stock: {p.stock} — editar
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredStock.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No hay productos cargados</p>}
          </div>

          {/* Modal nuevo producto */}
          {showProductModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-sm border-blue-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-700">Nuevo Producto Helue</CardTitle>
                    <button onClick={() => setShowProductModal(false)}><X className="h-4 w-4" /></button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Nombre *</Label><Input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  <div><Label className="text-xs">SKU</Label><Input value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Precio ($) *</Label><Input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                    <div><Label className="text-xs">Stock inicial</Label><Input type="number" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} className="border-blue-200 bg-blue-50 mt-1" /></div>
                  </div>
                  <Button onClick={handleAddProduct} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: CUENTAS CORRIENTES ─── */}
      {tab === "cuentas" && (
        <div className="space-y-3">
          {debtClients.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
              <p className="font-medium">Todos los revendedores están al día</p>
            </div>
          )}
          {debtClients.map(c => (
            <Card key={c.id} className="border-red-100">
              <CardContent className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">Tel: {c.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 text-lg">{fmt(c.balance)}</p>
                    <p className="text-xs text-muted-foreground">deuda total</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => { setPayingClientId(c.id); setPaymentForm({ amount: "", method: "Efectivo", notes: "" }) }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Asentar Pago
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHistoryFor(showHistoryFor === c.id ? null : c.id)}
                    className="text-xs border-blue-200 text-blue-600 gap-1"
                  >
                    <History className="h-3 w-3" /> Historial
                  </Button>
                </div>

                {/* Modal asentar pago */}
                {payingClientId === c.id && (
                  <div className="bg-blue-50 rounded-xl p-3 space-y-2 border border-blue-200">
                    <p className="text-xs font-bold text-blue-700">Registrar pago de {c.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Monto ($)</Label>
                        <Input type="number" placeholder={String(c.balance)} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="border-blue-200 mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Método</Label>
                        <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white mt-1">
                          {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <Input placeholder="Notas (opcional)" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="border-blue-200 h-8 text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddPayment} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex-1">
                        {loading ? "..." : "Guardar Pago"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPayingClientId(null)} className="text-xs border-blue-200">Cancelar</Button>
                    </div>
                  </div>
                )}

                {/* Historial */}
                {showHistoryFor === c.id && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pagos recibidos</p>
                    {clientPayments(c.id).length === 0
                      ? <p className="text-xs text-muted-foreground">Sin pagos registrados</p>
                      : clientPayments(c.id).slice(0, 5).map(p => (
                        <div key={p.id} className="flex justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-blue-50">
                          <span className="text-muted-foreground">{formatDate(p.createdAt)} · {p.paymentMethod}</span>
                          <span className="font-bold text-emerald-600">+{fmt(p.amount)}</span>
                        </div>
                      ))
                    }
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-2">Compras</p>
                    {clientSales(c.id).length === 0
                      ? <p className="text-xs text-muted-foreground">Sin compras registradas</p>
                      : clientSales(c.id).slice(0, 5).map(s => (
                        <div key={s.id} className="flex justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-blue-50">
                          <span className="text-muted-foreground">{formatDate(s.createdAt)} · {s.paymentMethod}</span>
                          <div className="text-right">
                            <span className="font-bold">{fmt(s.totalAmount)}</span>
                            {s.paidAmount < s.totalAmount && <span className="text-red-500 ml-1">(abonó {fmt(s.paidAmount)})</span>}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
