import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WholesaleClient {
  id: string
  name: string
  cuit?: string
  phone?: string
  balance: number
  createdAt: string
}

export interface WholesaleProduct {
  id: string
  name: string
  sku?: string
  price: number
  stock: number
  createdAt: string
}

export interface WholesaleSaleItem {
  id: string
  saleId: string
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
}

export interface WholesaleSale {
  id: string
  clientId: string
  clientName?: string
  totalAmount: number
  paidAmount: number
  paymentMethod?: string
  observations?: string
  createdAt: string
  items?: WholesaleSaleItem[]
}

export interface WholesalePayment {
  id: string
  clientId: string
  clientName?: string
  amount: number
  paymentMethod?: string
  notes?: string
  createdAt: string
}

export interface WholesaleCartItem {
  product: WholesaleProduct
  quantity: number
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface WholesaleStore {
  clients: WholesaleClient[]
  products: WholesaleProduct[]
  sales: WholesaleSale[]
  payments: WholesalePayment[]

  fetchClients: () => Promise<void>
  fetchProducts: () => Promise<void>
  fetchSales: () => Promise<void>
  fetchPayments: () => Promise<void>

  addClient: (client: Omit<WholesaleClient, 'id' | 'createdAt' | 'balance'>) => Promise<void>
  addProduct: (product: Omit<WholesaleProduct, 'id' | 'createdAt'>) => Promise<void>
  updateProductStock: (id: string, newStock: number) => Promise<void>

  processWholesaleSale: (params: {
    clientId: string
    cart: WholesaleCartItem[]
    totalAmount: number
    paidAmount: number
    paymentMethod: string
    observations?: string
  }) => Promise<void>

  addPayment: (params: {
    clientId: string
    amount: number
    paymentMethod: string
    notes?: string
  }) => Promise<void>
}

const mapClient = (r: any): WholesaleClient => ({
  id: r.id,
  name: r.name,
  cuit: r.cuit,
  phone: r.phone,
  balance: r.balance ?? 0,
  createdAt: r.created_at,
})

const mapProduct = (r: any): WholesaleProduct => ({
  id: r.id,
  name: r.name,
  sku: r.sku,
  price: r.price ?? 0,
  stock: r.stock ?? 0,
  createdAt: r.created_at,
})

export const useWholesaleStore = create<WholesaleStore>((set, get) => ({
  clients: [],
  products: [],
  sales: [],
  payments: [],

  fetchClients: async () => {
    const { data } = await supabase
      .from('wholesale_clients')
      .select('*')
      .order('name')
    if (data) set({ clients: data.map(mapClient) })
  },

  fetchProducts: async () => {
    const { data } = await supabase
      .from('wholesale_products')
      .select('*')
      .order('name')
    if (data) set({ products: data.map(mapProduct) })
  },

  fetchSales: async () => {
    const { data } = await supabase
      .from('wholesale_sales')
      .select(`
        *,
        wholesale_clients(name),
        wholesale_sale_items(*, wholesale_products(name))
      `)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) {
      set({
        sales: data.map((s: any) => ({
          id: s.id,
          clientId: s.client_id,
          clientName: s.wholesale_clients?.name,
          totalAmount: s.total_amount,
          paidAmount: s.paid_amount,
          paymentMethod: s.payment_method,
          observations: s.observations,
          createdAt: s.created_at,
          items: (s.wholesale_sale_items || []).map((i: any) => ({
            id: i.id,
            saleId: i.sale_id,
            productId: i.product_id,
            productName: i.wholesale_products?.name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
          })),
        })),
      })
    }
  },

  fetchPayments: async () => {
    const { data } = await supabase
      .from('wholesale_payments')
      .select(`*, wholesale_clients(name)`)
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) {
      set({
        payments: data.map((p: any) => ({
          id: p.id,
          clientId: p.client_id,
          clientName: p.wholesale_clients?.name,
          amount: p.amount,
          paymentMethod: p.payment_method,
          notes: p.notes,
          createdAt: p.created_at,
        })),
      })
    }
  },

  addClient: async (client) => {
    const { data, error } = await supabase
      .from('wholesale_clients')
      .insert([{ name: client.name, cuit: client.cuit || null, phone: client.phone || null, balance: 0 }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    if (data) set(state => ({ clients: [...state.clients, mapClient(data)].sort((a, b) => a.name.localeCompare(b.name)) }))
  },

  addProduct: async (product) => {
    const { data, error } = await supabase
      .from('wholesale_products')
      .insert([{ name: product.name, sku: product.sku || null, price: product.price, stock: product.stock }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    if (data) set(state => ({ products: [...state.products, mapProduct(data)].sort((a, b) => a.name.localeCompare(b.name)) }))
  },

  updateProductStock: async (id, newStock) => {
    const { error } = await supabase
      .from('wholesale_products')
      .update({ stock: newStock })
      .eq('id', id)
    if (error) throw new Error(error.message)
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, stock: newStock } : p)
    }))
  },

  processWholesaleSale: async ({ clientId, cart, totalAmount, paidAmount, paymentMethod, observations }) => {
    // 1. Validar stock antes de todo
    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        throw new Error(`Stock insuficiente para "${item.product.name}": hay ${item.product.stock}, pediste ${item.quantity}. Faltan ${item.quantity - item.product.stock}.`)
      }
    }

    // 2. Insertar venta
    const { data: sale, error: saleError } = await supabase
      .from('wholesale_sales')
      .insert([{
        client_id: clientId,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        observations: observations || null,
      }])
      .select()
      .single()
    if (saleError) throw new Error(saleError.message)

    // 3. Insertar items
    const items = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
    }))
    const { error: itemsError } = await supabase.from('wholesale_sale_items').insert(items)
    if (itemsError) throw new Error(itemsError.message)

    // 4. Descontar stock de cada producto
    for (const item of cart) {
      const newStock = item.product.stock - item.quantity
      await supabase.from('wholesale_products').update({ stock: newStock }).eq('id', item.product.id)
    }

    // 5. Si quedó deuda, sumar al balance del cliente
    const debt = totalAmount - paidAmount
    if (debt > 0) {
      const client = get().clients.find(c => c.id === clientId)
      const newBalance = (client?.balance ?? 0) + debt
      const { error: balError } = await supabase
        .from('wholesale_clients')
        .update({ balance: newBalance })
        .eq('id', clientId)
      if (balError) throw new Error(balError.message)
      set(state => ({
        clients: state.clients.map(c => c.id === clientId ? { ...c, balance: newBalance } : c)
      }))
    }

    // 6. Actualizar estado local
    await get().fetchProducts()
    await get().fetchSales()
  },

  addPayment: async ({ clientId, amount, paymentMethod, notes }) => {
    const client = get().clients.find(c => c.id === clientId)
    if (!client) throw new Error('Cliente no encontrado')
    if (amount > client.balance) throw new Error(`El pago ($${amount}) supera la deuda ($${client.balance})`)

    // Registrar pago en historial
    const { error: payError } = await supabase
      .from('wholesale_payments')
      .insert([{ client_id: clientId, amount, payment_method: paymentMethod, notes: notes || null }])
    if (payError) throw new Error(payError.message)

    // Restar del balance
    const newBalance = Math.max(0, client.balance - amount)
    const { error: balError } = await supabase
      .from('wholesale_clients')
      .update({ balance: newBalance })
      .eq('id', clientId)
    if (balError) throw new Error(balError.message)

    set(state => ({
      clients: state.clients.map(c => c.id === clientId ? { ...c, balance: newBalance } : c),
    }))
    await get().fetchPayments()
  },
}))
