"use client"

import { useState, useMemo } from "react"
import { useClinicStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Search, Check, X, Pencil, Loader2 } from "lucide-react"

export function PricesModule() {
  const { services, products, updateService, updateProduct } = useClinicStore()
  const [search, setSearch] = useState("")

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCash, setEditCash] = useState<string>("")
  const [editList, setEditList] = useState<string>("")
  const [editStock, setEditStock] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const startEdit = (id: string, cash: number, list: number, stock?: number) => {
    setEditingId(id)
    setEditCash(String(cash || 0))
    setEditList(String(list || 0))
    setEditStock(stock !== undefined ? String(stock) : "")
    setSaveError(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditCash(""); setEditList(""); setEditStock(""); setSaveError(null) }

  const saveService = async (id: string) => {
    setSaving(true)
    setSaveError(null)
    try {
      await updateService(id, { priceCash: Number(editCash), price: Number(editList) })
      cancelEdit()
    } catch (err: any) {
      setSaveError(err?.message || "Error al guardar. Intentá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const saveProduct = async (id: string) => {
    setSaving(true)
    setSaveError(null)
    try {
      const updates: any = { priceCash: Number(editCash), priceList: Number(editList) }
      if (editStock !== "") updates.stock = Number(editStock)
      await updateProduct(id, updates)
      cancelEdit()
    } catch (err: any) {
      setSaveError(err?.message || "Error al guardar. Intentá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const filteredServices = useMemo(() =>
    (services || []).filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [services, search])

  const filteredProducts = useMemo(() =>
    (products || []).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [products, search])

  const EditRow = ({ id, onSave, showStock }: { id: string, onSave: (id: string) => void, showStock?: boolean }) => (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[90px] space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase">Precio Efectivo</p>
          <Input type="number" value={editCash} onChange={e => setEditCash(e.target.value)}
            className="h-8 text-sm border-emerald-400 font-bold text-black" autoFocus />
        </div>
        <div className="flex-1 min-w-[90px] space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase">Precio Lista</p>
          <Input type="number" value={editList} onChange={e => setEditList(e.target.value)}
            className="h-8 text-sm border-blue-400 font-bold text-black" />
        </div>
        {showStock && (
          <div className="w-20 space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Stock</p>
            <Input type="number" min="0" value={editStock} onChange={e => setEditStock(e.target.value)}
              className="h-8 text-sm border-orange-400 font-bold text-black" />
          </div>
        )}
        <div className="flex gap-1 mt-4">
          <Button size="sm" onClick={() => onSave(id)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 h-8 w-8 p-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving} className="h-8 w-8 p-0 border-gray-300">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {saveError && (
        <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-200 rounded px-2 py-1">
          ❌ {saveError}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#16A34A] flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Gestión de Precios
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 border-gray-300 text-black font-medium" />
        </div>
      </div>

      <Tabs defaultValue="servicios">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger value="servicios" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white font-bold">
            Servicios ({filteredServices.length})
          </TabsTrigger>
          <TabsTrigger value="productos" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white font-bold">
            Productos ({filteredProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servicios">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {filteredServices.map(svc => (
                  <div key={svc.id} className="border border-gray-100 rounded-lg p-3 hover:border-[#16A34A]/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-black truncate">{svc.name}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-emerald-600 font-bold">Efect: ${(svc.priceCash || 0).toLocaleString()}</span>
                          <span className="text-xs text-blue-600 font-bold">Lista: ${(svc.price || 0).toLocaleString()}</span>
                          {svc.duration && <span className="text-xs text-gray-400">{svc.duration} min</span>}
                        </div>
                      </div>
                      {editingId !== svc.id && (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(svc.id, svc.priceCash || 0, svc.price || 0)}
                          className="text-gray-400 hover:text-[#16A34A] h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {editingId === svc.id && (
                      <EditRow id={svc.id} onSave={saveService} />
                    )}
                  </div>
                ))}
                {filteredServices.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No se encontraron servicios.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productos">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {filteredProducts.map(prod => (
                  <div key={prod.id} className="border border-gray-100 rounded-lg p-3 hover:border-[#16A34A]/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-black truncate">{prod.name}</p>
                          {typeof prod.stock === 'number' && (
                            <Badge className={`text-[10px] border ${prod.stock < 3 ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              Stock: {prod.stock}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-emerald-600 font-bold">Efect: ${(prod.priceCash || 0).toLocaleString()}</span>
                          <span className="text-xs text-blue-600 font-bold">Lista: ${(prod.priceList || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {editingId !== prod.id && (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(prod.id, prod.priceCash || 0, prod.priceList || 0, prod.stock ?? 0)}
                          className="text-gray-400 hover:text-[#16A34A] h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {editingId === prod.id && (
                      <EditRow id={prod.id} onSave={saveProduct} showStock />
                    )}
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No se encontraron productos.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
