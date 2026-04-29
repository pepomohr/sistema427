"use client"

import { useState, useEffect } from "react"
import { useClinicStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Plus, Trash2, Loader2, CheckCircle, AlertCircle, Package, RefreshCw } from "lucide-react"

interface ProductLine {
  id: string
  nombre: string
  cantidad: number
  precio: number
}

interface PedidoPendiente {
  id: string
  created_at: string
  total: number
  status: string
  shipping_address: any
  order_items: Array<{ quantity: number; price: number; products: { name: string } | null }>
}

export function WebSaleModule() {
  const { addSaleMultipago, fetchSales } = useClinicStore()

  const [tab, setTab] = useState<"pendientes" | "manual">("pendientes")

  // Pedidos pendientes
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [registrando, setRegistrando] = useState<string | null>(null)
  const [registrados, setRegistrados] = useState<Set<string>>(new Set())

  // Formulario manual
  const [cliente, setCliente] = useState("")
  const [telefono, setTelefono] = useState("")
  const [formaPago, setFormaPago] = useState<"transferencia" | "tarjeta">("transferencia")
  const [entrega, setEntrega] = useState("Retiro en local - MAIPU 170")
  const [productos, setProductos] = useState<ProductLine[]>([
    { id: "1", nombre: "", cantidad: 1, precio: 0 }
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = productos.reduce((s, p) => s + p.precio * p.cantidad, 0)

  useEffect(() => {
    loadPedidosPendientes()
  }, [])

  async function loadPedidosPendientes() {
    setLoadingPedidos(true)
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, total, status, shipping_address")
        .in("status", ["paid", "pending_whatsapp"])
        .order("created_at", { ascending: false })

      if (!orders?.length) { setPedidos([]); setLoadingPedidos(false); return }

      const { data: ventas } = await supabase
        .from("sales")
        .select("observations")
        .eq("source", "web")

      const pedidosSinRegistrar: PedidoPendiente[] = []
      for (const order of orders) {
        const pedidoId = order.id.slice(0, 8).toUpperCase()
        const yaRegistrada = (ventas || []).some(v =>
          (v.observations || "").includes(pedidoId)
        )
        if (!yaRegistrada) {
          const { data: items } = await supabase
            .from("order_items")
            .select("quantity, price, products(name)")
            .eq("order_id", order.id)
          pedidosSinRegistrar.push({ ...order, order_items: items || [] })
        }
      }

      setPedidos(pedidosSinRegistrar)
    } catch (e) {
      console.error("Error cargando pedidos:", e)
    }
    setLoadingPedidos(false)
  }

  async function registrarPedido(pedido: PedidoPendiente) {
    setRegistrando(pedido.id)
    try {
      const pedidoId = pedido.id.slice(0, 8).toUpperCase()
      const clienteName = pedido.shipping_address?.fullName ?? "Cliente web"
      const tel = pedido.shipping_address?.phone ?? ""
      const entregaObs = pedido.shipping_address?.deliveryMethod === "retiro"
        ? "Retiro en local - MAIPU 170"
        : `Envío: ${pedido.shipping_address?.address ?? ""}, ${pedido.shipping_address?.city ?? ""}`
      const metodoPago = pedido.status === "pending_whatsapp" ? "transferencia" : "tarjeta"

      const items = (pedido.order_items || []).map((i: any) => ({
        type: "product" as const,
        itemId: "web",
        itemName: i.products?.name ?? "Producto ecommerce",
        quantity: Number(i.quantity ?? 1),
        price: Number(i.price ?? 0),
        priceCashReference: Number(i.price ?? 0),
        soldBy: null as any,
      }))

      await addSaleMultipago({
        items,
        total: Number(pedido.total),
        paymentMethod: metodoPago as any,
        paymentSplits: [{ method: metodoPago as any, amount: Number(pedido.total) }],
        source: "web",
        type: "direct",
        patientName: clienteName,
        processedBy: "WEB C427",
        observations: `Pedido web #${pedidoId} | Tel: ${tel} | ${entregaObs}`,
      })

      setRegistrados(prev => new Set([...prev, pedido.id]))
      await fetchSales()
    } catch (e: any) {
      console.error("Error registrando pedido:", e)
    }
    setRegistrando(null)
  }

  async function handleGuardarManual() {
    if (!cliente.trim()) { setError("Ingresá el nombre del cliente"); return }
    if (productos.some(p => !p.nombre.trim())) { setError("Completá el nombre de todos los productos"); return }
    if (total === 0) { setError("El total no puede ser $0"); return }
    setError(null)
    setSaving(true)
    try {
      const items = productos.map(p => ({
        type: "product" as const,
        itemId: "web",
        itemName: p.nombre,
        quantity: p.cantidad,
        price: p.precio,
        priceCashReference: p.precio,
        soldBy: null as any,
      }))

      await addSaleMultipago({
        items,
        total,
        paymentMethod: formaPago as any,
        paymentSplits: [{ method: formaPago as any, amount: total }],
        source: "web",
        type: "direct",
        patientName: cliente,
        processedBy: "WEB C427",
        observations: `Pedido web manual | Tel: ${telefono} | ${entrega}`,
      })

      await fetchSales()
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setCliente("")
        setTelefono("")
        setProductos([{ id: "1", nombre: "", cantidad: 1, precio: 0 }])
        setEntrega("Retiro en local - MAIPU 170")
      }, 1500)
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar")
    }
    setSaving(false)
  }

  const addProductLine = () =>
    setProductos(p => [...p, { id: Date.now().toString(), nombre: "", cantidad: 1, precio: 0 }])

  const removeProductLine = (id: string) =>
    setProductos(p => p.filter(x => x.id !== id))

  const updateProductLine = (id: string, field: keyof ProductLine, value: any) =>
    setProductos(p => p.map(x => x.id === id ? { ...x, [field]: value } : x))

  const pendientesSinRegistrar = pedidos.filter(p => !registrados.has(p.id))

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl font-black text-gray-800">Ventas Web C427</h1>
        </div>
        <Button variant="outline" size="sm" onClick={loadPedidosPendientes} disabled={loadingPedidos} className="gap-2 text-xs">
          <RefreshCw className={`h-3 w-3 ${loadingPedidos ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setTab("pendientes")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${tab === "pendientes" ? "bg-white shadow text-purple-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          Pedidos sin registrar
          {!loadingPedidos && pendientesSinRegistrar.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendientesSinRegistrar.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${tab === "manual" ? "bg-white shadow text-purple-700" : "text-gray-500 hover:text-gray-700"}`}
        >
          Cargar manualmente
        </button>
      </div>

      {/* TAB: Pedidos pendientes */}
      {tab === "pendientes" && (
        <div className="space-y-3">
          {loadingPedidos ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Verificando pedidos del ecommerce...</span>
            </div>
          ) : pendientesSinRegistrar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <CheckCircle className="h-10 w-10 text-green-400" />
              <p className="font-semibold text-base">Todos los pedidos están registrados ✅</p>
              <p className="text-sm">No hay ventas web pendientes de cargar al sistema</p>
            </div>
          ) : (
            pendientesSinRegistrar.map(pedido => {
              const pedidoId = pedido.id.slice(0, 8).toUpperCase()
              const fecha = new Date(pedido.created_at).toLocaleString("es-AR", {
                day: "2-digit", month: "2-digit", year: "2-digit",
                hour: "2-digit", minute: "2-digit"
              })
              return (
                <div key={pedido.id} className="border rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-black text-sm text-gray-800">#{pedidoId}</span>
                        <Badge className={pedido.status === "pending_whatsapp"
                          ? "bg-blue-100 text-blue-800 border-none text-xs"
                          : "bg-green-100 text-green-800 border-none text-xs"}>
                          {pedido.status === "pending_whatsapp" ? "Transferencia" : "MP / Tarjeta"}
                        </Badge>
                        <span className="text-xs text-gray-400">{fecha}</span>
                      </div>
                      <p className="font-bold text-sm">{pedido.shipping_address?.fullName ?? "—"}</p>
                      <p className="text-xs text-gray-500 mb-2">{pedido.shipping_address?.phone ?? ""}</p>
                      <div className="flex flex-wrap gap-1">
                        {(pedido.order_items || []).map((item: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">
                            <Package className="h-3 w-3" />
                            {item.products?.name ?? "Producto"} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-black text-xl">${Number(pedido.total).toLocaleString("es-AR")}</span>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4"
                        disabled={registrando === pedido.id}
                        onClick={() => registrarPedido(pedido)}
                      >
                        {registrando === pedido.id
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Registrando...</>
                          : "Registrar en sistema"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB: Manual */}
      {tab === "manual" && (
        <div className="space-y-4 bg-white border rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">Cliente *</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre completo" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-bold">Teléfono</Label>
              <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="11 1234-5678" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">Forma de pago</Label>
              <Select value={formaPago} onValueChange={v => setFormaPago(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Entrega</Label>
              <Select value={entrega} onValueChange={setEntrega}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retiro en local - MAIPU 170">Retiro en local</SelectItem>
                  <SelectItem value="Envío a domicilio">Envío a domicilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold">Productos *</Label>
              <Button variant="outline" size="sm" onClick={addProductLine} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Agregar producto
              </Button>
            </div>
            <div className="space-y-2">
              {productos.map(p => (
                <div key={p.id} className="flex gap-2 items-center">
                  <Input
                    value={p.nombre}
                    onChange={e => updateProductLine(p.id, "nombre", e.target.value)}
                    placeholder="Nombre del producto"
                    className="flex-1 text-sm"
                  />
                  <Input
                    type="number"
                    value={p.cantidad}
                    onChange={e => updateProductLine(p.id, "cantidad", Math.max(1, Number(e.target.value)))}
                    className="w-16 text-sm text-center"
                    min={1}
                  />
                  <Input
                    type="number"
                    value={p.precio || ""}
                    onChange={e => updateProductLine(p.id, "precio", Number(e.target.value))}
                    placeholder="$precio"
                    className="w-28 text-sm"
                  />
                  {productos.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeProductLine(p.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
            <span className="font-bold text-sm">Total</span>
            <span className="font-black text-2xl text-purple-700">${total.toLocaleString("es-AR")}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-5"
            onClick={handleGuardarManual}
            disabled={saving || saved}
          >
            {saved ? (
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> ¡Venta registrada!</span>
            ) : saving ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</span>
            ) : (
              <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Registrar como Venta Web C427</span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
