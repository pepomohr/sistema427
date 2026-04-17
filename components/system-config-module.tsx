"use client"

import { useState } from "react"
import { useClinicStore, type ServiceCategory, getCategoryDisplayName, type Offer, type Combo, type ComboItem } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useConfirm } from "@/hooks/use-confirm"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit2, Package, Sparkles, Percent, Layers, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function SystemConfigModule() {
  const { 
    services, products, offers, combos,
    addService, updateService, deleteService,
    addProduct, updateProduct, deleteProduct,
    addOffer, updateOffer, deleteOffer,
    addCombo, updateCombo, deleteCombo
  } = useClinicStore()

  const [activeTab, setActiveTab] = useState<"servicios" | "productos" | "ofertas" | "combos">("servicios")
  const { confirm, ConfirmDialog } = useConfirm()
  
  // Modal states
  const [showServiceDialog, setShowServiceDialog] = useState(false)
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const [showComboDialog, setShowComboDialog] = useState(false)

  // Service form state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [svcForm, setSvcForm] = useState({ name: "", price: 0, priceCash: 0, duration: 60, category: "Facial" as ServiceCategory })

  // Product form state
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [prodForm, setProdForm] = useState({ name: "", priceCash: 0, priceList: 0, stock: 1, category: "General" })

  // Offer form state
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
  const [offerForm, setOfferForm] = useState({ name: "", discountPercentage: 10 })

  // Combo form state
  const [editingComboId, setEditingComboId] = useState<string | null>(null)
  const [comboForm, setComboForm] = useState<Omit<Combo, 'id'>>({ name: "", items: [], priceCash: 0, priceList: 0 })
  const [comboItemTypeToAdd, setComboItemTypeToAdd] = useState<'service'|'product'>('service')
  const [comboItemToAddId, setComboItemToAddId] = useState<string>('')
  const [comboItemToAddQty, setComboItemToAddQty] = useState<number>(1)

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
    try {
      if (editingServiceId) {
        await updateService(editingServiceId, svcForm)
      } else {
        await addService(svcForm)
      }
      setShowServiceDialog(false)
    } catch (err: any) {
      alert(`❌ Error al guardar el servicio: ${err?.message || 'Error desconocido'}. Intentá de nuevo.`)
    }
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
    try {
      if (editingProductId) {
        await updateProduct(editingProductId, prodForm)
      } else {
        await addProduct(prodForm)
      }
      setShowProductDialog(false)
    } catch (err: any) {
      alert(`❌ Error al guardar el producto: ${err?.message || 'Error desconocido'}. Intentá de nuevo.`)
    }
  }

  const handleOpenOffer = (off?: any) => {
    if (off) {
      setEditingOfferId(off.id)
      setOfferForm({ name: off.name, discountPercentage: off.discountPercentage })
    } else {
      setEditingOfferId(null)
      setOfferForm({ name: "", discountPercentage: 10 })
    }
    setShowOfferDialog(true)
  }

  const handleSaveOffer = async () => {
    if (editingOfferId) {
      updateOffer(editingOfferId, offerForm)
    } else {
      addOffer(offerForm)
    }
    setShowOfferDialog(false)
  }

  const handleOpenCombo = (combo?: any) => {
    if (combo) {
      setEditingComboId(combo.id)
      setComboForm({ name: combo.name, items: [...combo.items], priceCash: combo.priceCash, priceList: combo.priceList })
    } else {
      setEditingComboId(null)
      setComboForm({ name: "", items: [], priceCash: 0, priceList: 0 })
    }
    setShowComboDialog(true)
  }

  const handleSaveCombo = async () => {
    if (editingComboId) {
      updateCombo(editingComboId, comboForm)
    } else {
      addCombo(comboForm)
    }
    setShowComboDialog(false)
  }

  const handleAddComboItem = () => {
    if (!comboItemToAddId || comboItemToAddQty <= 0) return;
    const items = [...comboForm.items, { type: comboItemTypeToAdd, itemId: comboItemToAddId, quantity: comboItemToAddQty }];
    setComboForm({ ...comboForm, items });
    setComboItemToAddId('');
    setComboItemToAddQty(1);
  }

  const removeComboItem = (index: number) => {
    const items = [...comboForm.items];
    items.splice(index, 1);
    setComboForm({ ...comboForm, items });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#16A34A]">Configuración de Catálogo</h2>
      </div>

      <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
        <Button variant={activeTab === "servicios" ? "default" : "outline"} onClick={() => setActiveTab("servicios")} className={activeTab === "servicios" ? "bg-[#16A34A] text-white" : "border-[#16A34A] text-[#16A34A]"}>
          <Sparkles className="h-4 w-4 mr-2"/> Servicios
        </Button>
        <Button variant={activeTab === "productos" ? "default" : "outline"} onClick={() => setActiveTab("productos")} className={activeTab === "productos" ? "bg-[#16A34A] text-white" : "border-[#16A34A] text-[#16A34A]"}>
          <Package className="h-4 w-4 mr-2"/> Productos
        </Button>
        <Button variant={activeTab === "combos" ? "default" : "outline"} onClick={() => setActiveTab("combos")} className={activeTab === "combos" ? "bg-[#16A34A] text-white" : "border-[#16A34A] text-[#16A34A]"}>
          <Layers className="h-4 w-4 mr-2"/> Combos
        </Button>
        <Button variant={activeTab === "ofertas" ? "default" : "outline"} onClick={() => setActiveTab("ofertas")} className={activeTab === "ofertas" ? "bg-[#16A34A] text-white" : "border-[#16A34A] text-[#16A34A]"}>
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
              <div key={s.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-3 bg-secondary/10 rounded-xl sm:rounded-lg border border-gray-200/50 gap-3 sm:gap-0 w-full">
                <div className="w-full">
                  <h4 className="font-bold text-foreground leading-tight">{s.name}</h4>
                  <div className="flex items-center gap-2 mt-2 sm:mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-[#16A34A] uppercase tracking-wide">{getCategoryDisplayName(s.category as any)}</span>
                    <span className="text-xs text-gray-500">{s.duration} mins</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-200 sm:border-t-0 sm:border-l-0 sm:pl-4">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-emerald-600 sm:text-emerald-400">Cash: ${s.priceCash}</p>
                    <p className="text-xs text-gray-500">Lista: ${s.price}</p>
                  </div>
                  <div className="flex gap-2 sm:border-l border-gray-200 sm:pl-4">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenService(s)} className="text-blue-500 sm:text-blue-400 p-2 h-8 w-8"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { 
                      confirm({
                        title: "¿Estás seguro?",
                        description: `Vas a eliminar el servicio "${s.name}". Esta acción no se puede deshacer.`,
                        actionType: "danger",
                        onConfirm: () => deleteService(s.id)
                      })
                    }} className="text-red-500 sm:text-red-400 p-2 h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
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
              <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-3 bg-secondary/10 rounded-xl sm:rounded-lg border border-gray-200/50 gap-3 sm:gap-0 w-full">
                <div className="w-full">
                  <h4 className="font-bold text-foreground leading-tight">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-2 sm:mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-[#16A34A] uppercase tracking-wide">{p.category}</span>
                    <span className={`text-xs ${p.stock > 5 ? 'text-blue-600 sm:text-blue-400' : 'text-red-600 sm:text-red-400'}`}>Stock: {p.stock}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-200 sm:border-t-0 sm:border-l-0 sm:pl-4">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-emerald-600 sm:text-emerald-400">Cash: ${p.priceCash}</p>
                    <p className="text-xs text-gray-500">Lista: ${p.priceList}</p>
                  </div>
                  <div className="flex gap-2 sm:border-l border-gray-200 sm:pl-4">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenProduct(p)} className="text-blue-500 sm:text-blue-400 p-2 h-8 w-8"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { 
                      confirm({
                        title: "¿Estás seguro?",
                        description: `Vas a eliminar el producto "${p.name}". Esta acción no se puede deshacer.`,
                        actionType: "danger",
                        onConfirm: () => deleteProduct(p.id)
                      })
                    }} className="text-red-500 sm:text-red-400 p-2 h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "ofertas" && (
        <Card className="bg-card border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl text-foreground">Listado de Ofertas (Descuentos %)</CardTitle>
            <Button onClick={() => handleOpenOffer()} className="bg-[#829177] hover:bg-[#6b7a62] text-white">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto mt-4">
            {offers.length === 0 ? (
              <p className="text-center italic text-gray-500 py-6">No hay ofertas cargadas actualmente.</p>
            ) : offers.map(o => (
              <div key={o.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-3 bg-[#16A34A]/10 sm:bg-[#16A34A]/5 rounded-xl sm:rounded-lg border border-[#16A34A]/20 gap-3 sm:gap-0 w-full">
                <div className="w-full">
                  <h4 className="font-bold text-[#14532D] flex items-center gap-2 leading-tight">
                    <Percent className="h-4 w-4 text-[#16A34A]" /> {o.name}
                  </h4>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t border-green-200/50 sm:border-t-0 sm:border-l-0 sm:pl-4">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-[#16A34A]">{o.discountPercentage}% OFF</p>
                  </div>
                  <div className="flex gap-2 sm:border-l border-green-200 sm:pl-4">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenOffer(o)} className="text-blue-500 sm:text-blue-400 p-2 h-8 w-8"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { 
                      confirm({
                        title: "¿Estás seguro?",
                        description: `Vas a eliminar la oferta "${o.name}". Esta acción no se puede deshacer.`,
                        actionType: "danger",
                        onConfirm: () => deleteOffer(o.id)
                      })
                    }} className="text-red-500 sm:text-red-400 p-2 h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "combos" && (
        <Card className="bg-card border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl text-foreground">Paquetes y Combos Especiales</CardTitle>
            <Button onClick={() => handleOpenCombo()} className="bg-[#829177] hover:bg-[#6b7a62] text-white">
              <Plus className="h-4 w-4 mr-2" /> Añadir Combo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto mt-4">
            {combos.length === 0 ? (
              <p className="text-center italic text-gray-500 py-6">No hay combos cargados actualmente.</p>
            ) : combos.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row justify-between sm:items-start p-4 bg-secondary/20 rounded-xl sm:rounded-lg border border-gray-200 gap-4 w-full">
                <div className="space-y-2 w-full">
                  <h4 className="font-bold text-foreground text-lg leading-tight">{c.name}</h4>
                  <div className="space-y-1">
                    {c.items.map((it, i) => {
                      const itemName = it.type === 'service' ? services.find(s=>s.id===it.itemId)?.name : products.find(p=>p.id===it.itemId)?.name;
                      return (
                        <p key={i} className="text-sm text-gray-600 flex items-center gap-1">
                          <span className="font-medium text-[#16A34A]">{it.quantity}x</span> {itemName || '(Item no encontrado)'}
                        </p>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-200 sm:border-t-0 sm:h-full">
                  <div className="text-left sm:text-right">
                    <p className="text-xl font-bold text-emerald-600 sm:text-emerald-500">${c.priceCash}</p>
                    <p className="text-xs text-gray-500">Lista: ${c.priceList}</p>
                  </div>
                  <div className="flex gap-2 sm:border-l border-gray-200 sm:pl-4 h-full items-center">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenCombo(c)} className="text-blue-500 sm:text-blue-400 p-2 h-8 w-8"><Edit2 className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => { 
                      confirm({
                        title: "¿Estás seguro?",
                        description: `Vas a eliminar el combo "${c.name}". Esta acción no se puede deshacer.`,
                        actionType: "danger",
                        onConfirm: () => deleteCombo(c.id)
                      })
                    }} className="text-red-500 sm:text-red-400 p-2 h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* --- MODAL SERVICIO --- */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#16A34A]">{editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle></DialogHeader>
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
            <Button onClick={handleSaveService} className="w-full mt-4 bg-[#16A34A] text-white hover:bg-[#15803D]">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL PRODUCTO --- */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#16A34A]">{editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-3">
            <Label>Nombre del Insumo/Producto</Label><Input value={prodForm.name} onChange={e=>setProdForm({...prodForm, name: e.target.value})} className="bg-input border-gray-200" />
            <Label>Marca/Categoría Lógica</Label><Input value={prodForm.category} onChange={e=>setProdForm({...prodForm, category: e.target.value})} className="bg-input border-gray-200" placeholder="Ej: Lidherma, AP, etc." />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio Efvo ($)</Label><Input type="number" value={prodForm.priceCash || ""} onChange={e=>setProdForm({...prodForm, priceCash: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
              <div><Label>Precio Lista ($)</Label><Input type="number" value={prodForm.priceList || ""} onChange={e=>setProdForm({...prodForm, priceList: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
            </div>
            <Label>Stock Actual</Label><Input type="number" value={prodForm.stock || 0} onChange={e=>setProdForm({...prodForm, stock: Number(e.target.value)})} className="bg-input border-gray-200" />
            <Button onClick={handleSaveProduct} className="w-full mt-4 bg-[#16A34A] text-white hover:bg-[#15803D]">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL OFERTA --- */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader><DialogTitle className="text-[#16A34A]">{editingOfferId ? 'Editar Oferta' : 'Nueva Oferta'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-3">
            <Label>Nombre de la Oferta</Label>
            <Input value={offerForm.name} onChange={e=>setOfferForm({...offerForm, name: e.target.value})} className="bg-input border-gray-200" placeholder="Ej: Especial Navidad" />
            
            <Label>Descuento Porcentual (%)</Label>
            <Input type="number" value={offerForm.discountPercentage || ""} onChange={e=>setOfferForm({...offerForm, discountPercentage: Number(e.target.value)})} className="bg-input border-gray-200" placeholder="Ej: 15" />
            
            <Button onClick={handleSaveOffer} className="w-full mt-4 bg-[#16A34A] text-white hover:bg-[#15803D]">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL COMBO --- */}
      <Dialog open={showComboDialog} onOpenChange={setShowComboDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="text-[#16A34A]">{editingComboId ? 'Editar Combo' : 'Nuevo Combo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nombre del Combo</Label>
              <Input value={comboForm.name} onChange={e=>setComboForm({...comboForm, name: e.target.value})} className="bg-input border-gray-200" placeholder="Ej: Pack 4 Madero + 1 Laca" />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
              <Label className="uppercase text-[10px] tracking-widest text-[#16A34A] font-bold">Conceptos Incluidos</Label>
              
              {comboForm.items.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No agregaste ningún producto o servicio todavía.</p>
              ) : (
                <div className="space-y-2">
                  {comboForm.items.map((it, idx) => {
                    const itemName = it.type === 'service' ? services.find(s=>s.id===it.itemId)?.name : products.find(p=>p.id===it.itemId)?.name;
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded text-sm">
                        <span><span className="font-bold text-[#16A34A]">{it.quantity}x</span> {itemName} <span className="text-xs text-gray-400">({it.type === 'service' ? 'Servicio' : 'Producto'})</span></span>
                        <Button variant="ghost" size="sm" onClick={() => removeComboItem(idx)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700 min-w-0"><X className="h-4 w-4"/></Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex gap-2">
                  <Select value={comboItemTypeToAdd} onValueChange={(v:any)=>{setComboItemTypeToAdd(v); setComboItemToAddId('')}}>
                    <SelectTrigger className="w-[120px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Servicio</SelectItem>
                      <SelectItem value="product">Producto</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={comboItemToAddId} onValueChange={setComboItemToAddId}>
                    <SelectTrigger className="flex-1 bg-white"><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                    <SelectContent>
                      {comboItemTypeToAdd === 'service' ? (
                        services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                      ) : (
                        products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Input type="number" value={comboItemToAddQty} onChange={e=>setComboItemToAddQty(Number(e.target.value))} className="w-[120px] bg-white" placeholder="Cantidad" />
                  <Button type="button" variant="outline" onClick={handleAddComboItem} className="flex-1 border-[#16A34A] text-[#16A34A]">Agregar al Paquete</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div><Label>Precio Cerrado Efvo ($)</Label><Input type="number" value={comboForm.priceCash || ""} onChange={e=>setComboForm({...comboForm, priceCash: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
              <div><Label>Precio Cerrado Lista ($)</Label><Input type="number" value={comboForm.priceList || ""} onChange={e=>setComboForm({...comboForm, priceList: Number(e.target.value)})} className="bg-input border-gray-200" /></div>
            </div>
            
            <Button onClick={handleSaveCombo} className="w-full mt-4 bg-[#16A34A] text-white hover:bg-[#15803D]">Guardar Combo</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
