"use client"

import { useState } from "react"
import { useClinicStore, type ServiceCategory, getCategoryDisplayName } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit2, Package, Sparkles, Percent } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function SystemConfigModule() {
  const { 
    services, products, 
    addService, updateService, deleteService,
    addProduct, updateProduct, deleteProduct 
  } = useClinicStore()

  const [activeTab, setActiveTab] = useState<"servicios" | "productos" | "ofertas">("servicios")
  
  // Modal states
  const [showServiceDialog, setShowServiceDialog] = useState(false)
  const [showProductDialog, setShowProductDialog] = useState(false)

  // Service form state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [svcForm, setSvcForm] = useState({ name: "", price: 0, priceCash: 0, duration: 60, category: "Facial" as ServiceCategory })

  // Product form state
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [prodForm, setProdForm] = useState({ name: "", priceCash: 0, priceList: 0, stock: 1, category: "General" })

  const handleOpenService = (svc?: any) => {
    if (svc) {
      setEditingServiceId(svc.id)
      setSvcForm({ name: svc.name, price: svc.price, priceCash: svc.priceCash, duration: svc.duration, category: svc.category })
    } else {
      setEditingServiceId(null)
      setSvcForm({ name: "", price: 0, priceCash: 0, duration: 60, category: "Facial" })
    }
    setShowServiceDialog(true)
  }

  const handleSaveService = async () => {
    if (editingServiceId) {
      await updateService(editingServiceId, svcForm)
    } else {
      await addService(svcForm)
    }
    setShowServiceDialog(false)
  }

  const handleOpenProduct = (prod?: any) => {
    if (prod) {
      setEditingProductId(prod.id)
      setProdForm({ name: prod.name, priceCash: prod.priceCash, priceList: prod.priceList, stock: prod.stock, category: prod.category })
    } else {
      setEditingProductId(null)
      setProdForm({ name: "", priceCash: 0, priceList: 0, stock: 1, category: "General" })
    }
    setShowProductDialog(true)
  }

  const handleSaveProduct = async () => {
    if (editingProductId) {
      await updateProduct(editingProductId, prodForm)
    } else {
      await addProduct(prodForm)
    }
    setShowProductDialog(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#D1B98D]">Configuración de Catálogo</h2>
      </div>

      <div className="flex gap-4 mb-4">
        <Button variant={activeTab === "servicios" ? "default" : "outline"} onClick={() => setActiveTab("servicios")} className={activeTab === "servicios" ? "bg-[#D1B98D] text-[#2d3529]" : "border-[#D1B98D] text-[#D1B98D]"}>
          <Sparkles className="h-4 w-4 mr-2"/> Servicios
        </Button>
        <Button variant={activeTab === "productos" ? "default" : "outline"} onClick={() => setActiveTab("productos")} className={activeTab === "productos" ? "bg-[#D1B98D] text-[#2d3529]" : "border-[#D1B98D] text-[#D1B98D]"}>
          <Package className="h-4 w-4 mr-2"/> Productos
        </Button>
        <Button variant={activeTab === "ofertas" ? "default" : "outline"} onClick={() => setActiveTab("ofertas")} className={activeTab === "ofertas" ? "bg-[#D1B98D] text-[#2d3529]" : "border-[#D1B98D] text-[#D1B98D]"}>
          <Percent className="h-4 w-4 mr-2"/> Ofertas
        </Button>
      </div>

      {activeTab === "servicios" && (
        <Card className="bg-card border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl text-foreground">Listado de Servicios</CardTitle>
            <Button onClick={() => handleOpenService()} className="bg-[#829177] hover:bg-[#6b7a62] text-white">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto mt-4">
            {services.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-gray-200/50">
                <div>
                  <h4 className="font-bold text-foreground">{s.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-[#D1B98D] uppercase tracking-wide">{getCategoryDisplayName(s.category as any)}</span>
                    <span className="text-xs text-gray-500">{s.duration} mins</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">Cash: ${s.priceCash}</p>
                    <p className="text-xs text-gray-500">Lista: ${s.price}</p>
                  </div>
                  <div className="flex gap-2 border-l border-gray-200 pl-4">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenService(s)} className="text-blue-400 p-2"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if(window.confirm("¿Seguro que deseas eliminarlo?")) deleteService(s.id); }} className="text-red-400 p-2"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "productos" && (
        <Card className="bg-card border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl text-foreground">Listado de Productos</CardTitle>
            <Button onClick={() => handleOpenProduct()} className="bg-[#829177] hover:bg-[#6b7a62] text-white">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto mt-4">
            {products.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-gray-200/50">
                <div>
                  <h4 className="font-bold text-foreground">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-[#D1B98D] uppercase tracking-wide">{p.category}</span>
                    <span className={`text-xs ${p.stock > 5 ? 'text-blue-400' : 'text-red-400'}`}>Stock: {p.stock}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">Cash: ${p.priceCash}</p>
                    <p className="text-xs text-gray-500">Lista: ${p.priceList}</p>
                  </div>
                  <div className="flex gap-2 border-l border-gray-200 pl-4">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenProduct(p)} className="text-blue-400 p-2"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if(window.confirm("¿Seguro que deseas eliminarlo?")) deleteProduct(p.id); }} className="text-red-400 p-2"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "ofertas" && (
        <Card className="bg-card border-gray-200">
          <CardContent className="pt-6 text-center text-gray-500 italic py-12">
            <Percent className="h-12 w-12 mx-auto opacity-20 mb-4" />
            <p>Sección de Ofertas y Porcentajes de Descuento</p>
            <p className="text-xs mt-2">Próximamente se conectará a la Base de Datos para definir descuentos aplicables al carrito.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#D1B98D]">{editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-3">
            <Label>Nombre</Label><Input value={svcForm.name} onChange={e=>setSvcForm({...svcForm, name: e.target.value})} className="bg-input border-gray-200" />
            <Label>Cat/Especialidad</Label>
            <Select value={svcForm.category} onValueChange={(val: any)=>setSvcForm({...svcForm, category: val})}>
              <SelectTrigger className="bg-input border-gray-200"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-card">
                 <SelectItem value="Facial">Facial/Escote</SelectItem>
                 <SelectItem value="Corporales">Corporales</SelectItem>
                 <SelectItem value="CyP">Cejas y Pestañas</SelectItem>
                 <SelectItem value="Uñas">Uñas</SelectItem>
                 <SelectItem value="Maderoterapia">Maderoterapia</SelectItem>
                 <SelectItem value="Capilar">Capilar</SelectItem>
                 <SelectItem value="Depilación">Depilación</SelectItem>
                 <SelectItem value="Planes">Planes Especiales</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio Efvo ($)</Label><Input type="number" value={svcForm.priceCash || ""} onChange={e=>setSvcForm({...svcForm, priceCash: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
              <div><Label>Precio Tarjeta ($)</Label><Input type="number" value={svcForm.price || ""} onChange={e=>setSvcForm({...svcForm, price: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
            </div>
            <Label>Duración (mins)</Label><Input type="number" value={svcForm.duration || ""} onChange={e=>setSvcForm({...svcForm, duration: Number(e.target.value)})} className="bg-input border-gray-200" />
            <Button onClick={handleSaveService} className="w-full mt-4 bg-[#D1B98D] text-[#2d3529]">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#D1B98D]">{editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-3">
            <Label>Nombre del Insumo/Producto</Label><Input value={prodForm.name} onChange={e=>setProdForm({...prodForm, name: e.target.value})} className="bg-input border-gray-200" />
            <Label>Marca/Categoría Lógica</Label><Input value={prodForm.category} onChange={e=>setProdForm({...prodForm, category: e.target.value})} className="bg-input border-gray-200" placeholder="Ej: Lidherma, AP, etc." />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio Efvo ($)</Label><Input type="number" value={prodForm.priceCash || ""} onChange={e=>setProdForm({...prodForm, priceCash: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
              <div><Label>Precio Lista ($)</Label><Input type="number" value={prodForm.priceList || ""} onChange={e=>setProdForm({...prodForm, priceList: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
            </div>
            <Label>Stock Actual</Label><Input type="number" value={prodForm.stock || 0} onChange={e=>setProdForm({...prodForm, stock: Number(e.target.value)})} className="bg-input border-gray-200" />
            <Button onClick={handleSaveProduct} className="w-full mt-4 bg-[#D1B98D] text-[#2d3529]">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
