"use client"

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// ============================================
// TYPES & INTERFACES
// ============================================

export type UserRole = 'recepción' | 'profesional' | 'admin'

export type ServiceCategory = 
  | 'Facial' 
  | 'Corporales' 
  | 'CyP' 
  | 'Uñas' 
  | 'Maderoterapia' 
  | 'Capilar'
  | 'Depilación'
  | 'Planes'

export interface User {
  id: string
  name: string
  role: UserRole
  professionalId?: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  dni: string
  email?: string
  birthdate?: string
  createdAt: Date
  notes?: string
  giftCardBalance?: number
}

export interface Service {
  id: string
  name: string
  price: number
  priceCash: number
  duration: number
  category: ServiceCategory
}

export interface Product {
  id: string
  name: string
  priceCash: number 
  priceList: number 
  stock: number
  category: string
}

export interface Offer {
  id: string
  name: string
  discountPercentage: number
}

export interface ComboItem {
  type: 'service' | 'product'
  itemId: string
  quantity: number
}

export interface Combo {
  id: string
  name: string
  items: ComboItem[]
  priceCash: number
  priceList: number
}

export interface WeekSchedule {
  monday?: { start: string, end: string }[]
  tuesday?: { start: string, end: string }[]
  wednesday?: { start: string, end: string }[]
  thursday?: { start: string, end: string }[]
  friday?: { start: string, end: string }[]
  saturday?: { start: string, end: string }[]
  sunday?: { start: string, end: string }[]
}

export interface Professional {
  id: string
  name: string
  shortName: string
  specialties: ServiceCategory[]
  isActive: boolean
  hourlyRate: number 
  hourlyRateFacial?: number 
  hourlyRateCorporal?: number 
  monthlySalesCount: number
  monthlySalesAmount: number
  color: string
  avatar?: string
  pin?: string | null
  schedule?: WeekSchedule
  exceptions?: Record<string, { start: string, end: string }[]>
}

export type AppointmentStatus = 'programado' | 'confirmado' | 'en_atencion' | 'pendiente_cobro' | 'completado' | 'cancelado'

export interface Appointment {
  id: string
  patientId: string
  patientName?: string 
  professionalId: string
  date: Date
  time: string
  services: any[]
  products?: any[]
  status: AppointmentStatus
  totalAmount: number
  paidAmount: number
}

export interface SaleItem {
  type: 'service' | 'product' | 'combo'
  itemId: string
  itemName: string
  price: number
  priceCashReference: number 
  quantity: number
  soldBy: string 
}

export interface PaymentSplit {
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr' | 'gift_card'
  amount: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  total: number
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr' | 'gift_card' // principal
  paymentSplits?: PaymentSplit[]
  usedOfferId?: string
  observations?: string
  source?: 'recepcion' | 'gabinete'
  patientId?: string
  appointmentId?: string
  date: Date
  processedBy: string
  type?: 'direct' | 'appointment'
}

export interface CashClosure {
  id: string
  receptionistName: string
  dateFrom: Date
  dateTo: Date
  amountEfectivo: number
  amountTransferencia: number
  amountTarjeta: number
  amountQr: number
  total: number
  observations?: string
  createdAt: Date
}

export interface Expense {
  id: string
  description: string
  amount: number
  date: Date
}

// ============================================
// HELPERS & LOGIC
// ============================================

export const getCategoryDisplayName = (category: string): string => {
  const names: Record<string, string> = {
    'Facial': 'Facial/Escote',
    'Corporales': 'Corporales',
    'CyP': 'Cejas y Pestañas',
    'Uñas': 'Uñas',
    'Maderoterapia': 'Maderoterapia',
    'Capilar': 'Capilar',
    'Depilación': 'Depilación',
    'Planes': 'Planes',
  }
  return names[category] || category
}

export const calculateCommissionTab = (count: number) => {
  if (count >= 31) return 10
  if (count >= 21) return 7.5
  if (count >= 1) return 5
  return 0
}

// ============================================
// STORE (ZUSTAND)
// ============================================

interface ClinicStore {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  professionals: Professional[]
  appointments: Appointment[]
  sales: Sale[]
  products: Product[]
  patients: Patient[]
  services: Service[]
  expenses: Expense[]
  offers: Offer[]
  combos: Combo[]
  cashClosures: CashClosure[]
  
  fetchExpenses: () => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<void>
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => Promise<void>
  addSaleMultipago: (sale: Omit<Sale, 'id' | 'date'>) => Promise<void>
  fetchSales: () => Promise<void>
  resetMonthlyCommissions: () => Promise<void>
  monthlyReset: () => Promise<void>
  
  updateHourlyRate: (id: string, rate: number) => void
  updateProfessional: (id: string, updates: Partial<Professional>) => void
  resetProfessionalPin: (id: string) => Promise<void>
  setProfessionalPin: (id: string, pin: string) => Promise<boolean>
  toggleProfessionalActive: (id: string) => void
  startAttention: (id: string) => void
  finishAttention: (id: string, finalServices: any[], finalProducts: any[]) => void
  completeAppointment: (id: string, paymentMethod: "efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card", finalTotal: number, extraProducts?: any[], extraSoldBy?: string, paymentSplits?: PaymentSplit[], observations?: string) => void
  cancelAppointment: (id: string) => void
  updateAppointment: (id: string, updates: Partial<Appointment>) => void
  fetchProfessionals: () => Promise<void>
  addProfessional: (prof: Omit<Professional, 'id'>) => Promise<void>
  
  fetchPatients: () => Promise<void>
  searchPatients: (query: string) => Promise<Patient[]>
  updatePatientGiftCardBalance: (id: string, amountToAdd: number) => Promise<void>
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>
  
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>
  fetchAppointments: () => Promise<void>
  getProfessionalsForService: (serviceId: string) => Professional[]
  
  fetchServices: () => Promise<void>
  addService: (service: Omit<Service, 'id'>) => Promise<void>
  updateService: (id: string, updates: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  
  fetchProducts: () => Promise<void>
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  
  fetchOffers: () => Promise<void>
  addOffer: (offer: Omit<Offer, 'id'>) => Promise<void>
  updateOffer: (id: string, updates: Partial<Offer>) => Promise<void>
  deleteOffer: (id: string) => Promise<void>
  
  fetchCombos: () => Promise<void>
  addCombo: (combo: Omit<Combo, 'id'>) => Promise<void>
  updateCombo: (id: string, updates: Partial<Combo>) => Promise<void>
  deleteCombo: (id: string) => Promise<void>
  
  fetchCashClosures: () => Promise<void>
  addCashClosure: (closure: Omit<CashClosure, 'id' | 'createdAt'>) => Promise<void>
  
  subscribeToAppointments: () => () => void
}

export const useClinicStore = create<ClinicStore>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  professionals: [],
  appointments: [],
  sales: [],
  patients: [],
  services: [],
  expenses: [],
  products: [],
  offers: [],
  combos: [],
  cashClosures: [],

  fetchExpenses: async () => {
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
      if (!error && data) {
        set({ expenses: data.map((e: any) => ({ id: e.id, description: e.description, amount: Number(e.amount), date: new Date(e.date) })) })
      }
    } catch (err) { console.error('fetchExpenses error', err) }
  },

  addExpense: async (expenseData) => {
    try {
      const { data, error } = await supabase.from('expenses').insert([{ description: expenseData.description, amount: expenseData.amount }]).select().single()
      if (!error && data) {
        const newExpense = { id: data.id, description: data.description, amount: Number(data.amount), date: new Date(data.date) }
        set(state => ({ expenses: [newExpense, ...state.expenses] }))
      }
    } catch (err) { console.error('addExpense error', err) }
  },

  fetchSales: async () => {
    try {
      const { data, error } = await supabase
        .from('sales').select('*')
        .order('date', { ascending: false })
      if (!error && data) {
        set({ sales: data.map((s: any) => ({
          id: s.id, items: s.items, total: s.total,
          paymentMethod: s.payment_method, paymentSplits: s.payment_splits || [],
          usedOfferId: s.used_offer_id, observations: s.observations,
          source: s.source || 'recepcion', patientId: s.patient_id,
          appointmentId: s.appointment_id, processedBy: s.processed_by,
          type: s.type, date: new Date(s.date)
        })) })
      }
    } catch (err) { console.error(err) }
  },

  resetMonthlyCommissions: async () => {
    // Recalcula monthlySalesCount desde las ventas reales del mes en curso
    try {
      const { sales, professionals } = get()
      const now = new Date()
      const monthSales = sales.filter(s => {
        const d = new Date(s.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      for (const prof of professionals) {
        const soldItems = monthSales.flatMap(sale =>
          (sale.items || []).filter((item: any) =>
            item.type === 'product' &&
            item.soldBy === prof.id &&
            !String(item.itemName || '').toLowerCase().includes('gift card')
          )
        )
        const count = soldItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
        const amount = soldItems.reduce((sum: number, item: any) => sum + ((item.priceCashReference || item.price || 0) * (item.quantity || 1)), 0)
        await supabase.from('professionals').update({ monthlySalesCount: count, monthlySalesAmount: amount }).eq('id', prof.id)
        set(state => ({ professionals: state.professionals.map(p => p.id === prof.id ? { ...p, monthlySalesCount: count, monthlySalesAmount: amount } : p) }))
      }
      console.log('[Comisiones] Contadores recalculados desde ventas reales')
    } catch (err) { console.error(err) }
  },

  monthlyReset: async () => {
    // Pone monthlySalesCount y monthlySalesAmount a 0 (se llama al cambiar de mes)
    try {
      const { professionals } = get()
      for (const prof of professionals) {
        await supabase.from('professionals').update({ monthlySalesCount: 0, monthlySalesAmount: 0 }).eq('id', prof.id)
      }
      set(state => ({
        professionals: state.professionals.map(p => ({ ...p, monthlySalesCount: 0, monthlySalesAmount: 0 }))
      }))
      console.log('[Comisiones] Reset mensual ejecutado')
    } catch (err) { console.error(err) }
  },

  addSale: async (saleData) => {
    const { professionals } = get()
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([{
          items: saleData.items,
          total: saleData.total,
          payment_method: saleData.paymentMethod,
          processed_by: saleData.processedBy,
          type: saleData.type || 'direct'
        }])
        .select()
        .single();

      if (error) throw error;

      const newSale: Sale = { 
        id: data.id, 
        items: data.items,
        total: data.total,
        paymentMethod: data.payment_method,
        processedBy: data.processed_by,
        type: data.type,
        date: new Date(data.date)
      };

      const updatedProfessionals = professionals.map(prof => {
        const soldItems = saleData.items.filter(
          item =>
            item.type === 'product' &&
            item.soldBy === prof.id &&
            item.itemId !== 'gift-card-loader' &&
            !String(item.itemName || '').toLowerCase().includes('gift card')
        )
        const totalQty = soldItems.reduce((acc, item) => acc + item.quantity, 0)
        if (totalQty === 0) return prof

        const totalAmt = soldItems.reduce((acc, item) => acc + ((item.priceCashReference || item.price) * item.quantity), 0)
        const newCount = (prof.monthlySalesCount || 0) + totalQty
        const newAmount = (prof.monthlySalesAmount || 0) + totalAmt
        supabase.from('professionals').update({ monthlySalesCount: newCount, monthlySalesAmount: newAmount }).eq('id', prof.id)
        return { ...prof, monthlySalesCount: newCount, monthlySalesAmount: newAmount }
      })

      set((state) => {
        let currentProducts = [...state.products]
        const deductStock = (prodId: string, qtyToDeduct: number) => {
          currentProducts = currentProducts.map(p => 
            p.id === prodId ? { ...p, stock: Math.max(0, p.stock - qtyToDeduct) } : p
          )
        }

        saleData.items.forEach(item => {
          if (item.type === 'product') deductStock(item.itemId, item.quantity)
          else if (item.type === 'combo') {
            const comboDef = state.combos.find(c => c.id === item.itemId)
            if (comboDef) comboDef.items.forEach(i => {
              if (i.type === 'product') deductStock(i.itemId, i.quantity * item.quantity)
            })
          }
        })

        return { 
          sales: [...state.sales, newSale],
          professionals: updatedProfessionals,
          products: currentProducts
        }
      })
    } catch (err) { console.error("Error al guardar venta:", err); }
  },

  // ============================================
  // MULTIPAGO: Guarda partes divididas y observaciones
  // ============================================
  addSaleMultipago: async (saleData) => {
    const { professionals } = get()
    try {
      const mainMethod = saleData.paymentSplits && saleData.paymentSplits.length > 0
        ? saleData.paymentSplits.reduce((a, b) => a.amount >= b.amount ? a : b).method
        : saleData.paymentMethod

      const { data, error } = await supabase
        .from('sales')
        .insert([{
          items: saleData.items,
          total: saleData.total,
          payment_method: mainMethod,
          payment_splits: saleData.paymentSplits || [],
          used_offer_id: saleData.usedOfferId || null,
          observations: saleData.observations || null,
          source: saleData.source || 'recepcion',
          patient_id: saleData.patientId || null,
          appointment_id: saleData.appointmentId || null,
          processed_by: saleData.processedBy,
          type: saleData.type || 'direct'
        }])
        .select()
        .single();

      if (error) throw error;

      const newSale: Sale = {
        id: data.id,
        items: data.items,
        total: data.total,
        paymentMethod: data.payment_method,
        paymentSplits: data.payment_splits || [],
        usedOfferId: data.used_offer_id,
        observations: data.observations,
        source: data.source,
        patientId: data.patient_id,
        appointmentId: data.appointment_id,
        processedBy: data.processed_by,
        type: data.type,
        date: new Date(data.date)
      };

      const updatedProfessionals = professionals.map(prof => {
        const soldItems = saleData.items.filter(
          item => item.type === 'product' && item.soldBy === prof.id &&
          item.itemId !== 'gift-card-loader' &&
          !String(item.itemName || '').toLowerCase().includes('gift card')
        )
        const totalQty = soldItems.reduce((acc, item) => acc + item.quantity, 0)
        if (totalQty === 0) return prof
        const totalAmt = soldItems.reduce((acc, item) => acc + ((item.priceCashReference || item.price) * item.quantity), 0)
        const newCount = (prof.monthlySalesCount || 0) + totalQty
        const newAmount = (prof.monthlySalesAmount || 0) + totalAmt
        supabase.from('professionals').update({ monthlySalesCount: newCount, monthlySalesAmount: newAmount }).eq('id', prof.id)
        return { ...prof, monthlySalesCount: newCount, monthlySalesAmount: newAmount }
      })

      set(state => {
        let currentProducts = [...state.products]
        saleData.items.forEach(item => {
          if (item.type === 'product') {
            currentProducts = currentProducts.map(p =>
              p.id === item.itemId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
            )
          }
        })
        return { sales: [...state.sales, newSale], professionals: updatedProfessionals, products: currentProducts }
      })
    } catch (err) { console.error("Error addSaleMultipago:", err); }
  },

  updateHourlyRate: (id, rate) => {
    set((state) => ({
      professionals: state.professionals.map(p => p.id === id ? { ...p, hourlyRate: rate } : p)
    }));
    supabase.from('professionals').update({ hourlyRate: rate }).eq('id', id)
  },

  updateProfessional: (id, updates) => {
    set(state => ({
      professionals: state.professionals.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    supabase.from('professionals').update(updates).eq('id', id)
  },

  resetProfessionalPin: async (id) => {
    set(state => ({
      professionals: state.professionals.map(p => p.id === id ? { ...p, pin: null } : p)
    }));
    localStorage.removeItem(`c427_pins_${id}`);
    try { await supabase.from('professionals').update({ pin: null }).eq('id', id); } catch (err) {}
  },

  setProfessionalPin: async (id, pin) => {
    try {
      const { error } = await supabase.from('professionals').update({ pin }).eq('id', id);
      if (error) return false;
      set(state => ({
        professionals: state.professionals.map(p => p.id === id ? { ...p, pin } : p)
      }));
      return true;
    } catch (err) { return false; }
  },

  addProfessional: async (prof) => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .insert([{
          id: crypto.randomUUID(),
          name: prof.name,
          shortName: prof.shortName,
          specialties: prof.specialties,
          isActive: prof.isActive,
          hourlyRate: prof.hourlyRate,
          hourlyRateFacial: prof.hourlyRateFacial || 0,
          hourlyRateCorporal: prof.hourlyRateCorporal || 0,
          monthlySalesCount: 0,
          monthlySalesAmount: 0,
          color: prof.color,
          pin: null
        }]).select().single();
        
      if (!error && data) set(state => ({ professionals: [...state.professionals, data] }));
    } catch(err) {}
  },

  toggleProfessionalActive: (id) => {
    const { professionals } = get();
    const prof = professionals.find(p => p.id === id);
    if (prof) {
      const nextActive = !prof.isActive;
      set(state => ({
        professionals: state.professionals.map(p => p.id === id ? { ...p, isActive: nextActive } : p)
      }));
      supabase.from('professionals').update({ isActive: nextActive }).eq('id', id)
    }
  },

  addPatient: async (patient) => {
    try {
      const { data, error } = await supabase.from('patients').insert([{
          name: patient.name, dni: patient.dni, phone: patient.phone,
          email: patient.email, birth_date: patient.birthdate
        }]).select().single();
        
      if (!error && data) {
        const np = {
          id: data.id, name: data.name, phone: data.phone, dni: data.dni, email: data.email,
          birthdate: data.birth_date, createdAt: new Date(data.created_at || Date.now()), notes: data.notes
        };
        set(state => ({ patients: [...state.patients, np] }));
      }
    } catch (err) { console.error(err); }
  },

  updatePatient: async (id, updates) => {
    try {
      const { error } = await supabase.from('patients').update({
          name: updates.name, dni: updates.dni, phone: updates.phone,
          email: updates.email, birth_date: updates.birthdate, notes: updates.notes
        }).eq('id', id);
      if (!error) {
        set(state => ({ patients: state.patients.map(p => p.id === id ? { ...p, ...updates } : p) }));
      }
    } catch (err) { console.error(err); }
  },

  addAppointment: async (appointment) => {
    try {
      const { data, error } = await supabase.from('appointments').insert([{
          patientId: appointment.patientId, patientName: appointment.patientName,
          professionalId: appointment.professionalId,
          date: format(appointment.date, "yyyy-MM-dd'T'12:00:00.000'Z'"),
          time: appointment.time, services: appointment.services,
          products: appointment.products || [], status: appointment.status,
          totalAmount: appointment.totalAmount, paidAmount: appointment.paidAmount
        }]).select().single();
      if (!error && data) {
        set(state => ({ appointments: [...state.appointments, { ...data, date: new Date(data.date) }] }));
      }
    } catch (err) { console.error(err); }
  },

  fetchAppointments: async () => {
    try {
      const { data, error } = await supabase.from('appointments').select('*').limit(2000);
      if (!error && data) {
        set({ appointments: data.map((a: any) => ({ ...a, date: new Date(a.date) })) });
      }
    } catch (err) { console.error(err); }
  },

  getProfessionalsForService: (serviceId) => {
    const { professionals, services } = get()
    const service = services.find(s => s.id === serviceId)
    if (!service) return []
    return professionals.filter(p => p.isActive && p.specialties.includes(service.category))
  },

  fetchProfessionals: async () => {
    try {
      const { data, error } = await supabase.from('professionals').select('*');
      if (!error && data) set({ professionals: data });
    } catch (err) { console.error(err); }
  },

  fetchPatients: async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*').limit(1300);
      if (!error && data) {
        set({ patients: data.map((p: any) => ({
            id: p.id, name: p.name, phone: p.phone, dni: p.dni, email: p.email,
            birthdate: p.birth_date, createdAt: new Date(p.created_at || Date.now()),
            notes: p.notes, giftCardBalance: p.gift_card_balance || 0
          }))
        });
      }
    } catch (err) { console.error(err); }
  },

  searchPatients: async (query: string) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];
    const { patients } = get();
    const localResults = patients.filter(p => (p.name?.toLowerCase().includes(cleanQuery)) || (p.dni?.includes(cleanQuery)) || (p.phone?.includes(cleanQuery)));
    try {
      const { data } = await supabase.from('patients').select('*').or(`name.ilike.%${cleanQuery}%,dni.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`).limit(20);
      if (data) {
          const remoteResults = data.map((p: any) => ({
            id: p.id, name: p.name, phone: p.phone, dni: p.dni, email: p.email,
            birthdate: p.birth_date, createdAt: new Date(p.created_at || Date.now()),
            notes: p.notes, giftCardBalance: p.gift_card_balance || 0
          }));
          const merged = [...localResults];
          const seen = new Set(localResults.map(p => p.id));
          for (const p of remoteResults) { if (!seen.has(p.id)) merged.push(p); }
          return merged;
      }
    } catch (err) { console.error(err); }
    return localResults;
  },

  fetchServices: async () => {
    try {
      const { data, error } = await supabase.from('services').select('*').limit(500);
      if (data) set({ services: data.map((s: any) => ({ 
        id: s.id, name: s.name, price: s.price, priceCash: s.price_cash ?? s.price, 
        duration: s.duration ?? 60, category: s.category 
      })) });
    } catch (err) { console.error(err); }
  },

  fetchProducts: async () => {
    try {
      const { data } = await supabase.from('products').select('*').limit(500);
      if (data) set({ products: data.map((p: any) => ({ id: p.id, name: p.name, priceCash: p.price_cash || 0, priceList: p.price_list || 0, stock: p.stock || 0, category: p.category })) });
    } catch (err) { console.error(err); }
  },

  addService: async (service) => {
    try {
      const { data, error } = await supabase.from('services').insert([{ 
          name: service.name, price: service.price, price_cash: service.priceCash, 
          duration: service.duration, category: service.category 
        }]).select().single()
      if (data) set(state => ({ 
        services: [...state.services, { 
          id: data.id, name: data.name, price: data.price, priceCash: data.price_cash ?? data.price, 
          duration: data.duration ?? 60, category: data.category 
        }]
      }))
    } catch (err) {}
  },

  updateService: async (id, updates) => {
    try {
      const up: any = {}
      if (updates.name !== undefined) up.name = updates.name
      if (updates.price !== undefined) up.price = updates.price
      if (updates.priceCash !== undefined) up.price_cash = updates.priceCash
      if (updates.category !== undefined) up.category = updates.category
      if (updates.duration !== undefined) up.duration = Number(updates.duration)
      const { error } = await supabase.from('services').update(up).eq('id', id)
      if (!error) set(state => ({ services: state.services.map(s => s.id === id ? { ...s, ...updates } : s) }))
    } catch (err) {}
  },

  deleteService: async (id) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (!error) set(state => ({ services: state.services.filter(s => s.id !== id) }))
    } catch (err) {}
  },

  addProduct: async (product) => {
    try {
      const { data, error } = await supabase.from('products').insert([{ name: product.name, price_cash: product.priceCash, price_list: product.priceList, stock: product.stock, category: product.category }]).select().single()
      if (!error && data) set(state => ({ products: [...state.products, { id: data.id, name: data.name, priceCash: data.price_cash || 0, priceList: data.price_list || 0, stock: data.stock || 0, category: data.category }]}))
    } catch (err) {}
  },

  updateProduct: async (id, updates) => {
    try {
      const up: any = {}
      if (updates.name !== undefined) up.name = updates.name
      if (updates.priceCash !== undefined) up.price_cash = updates.priceCash
      if (updates.priceList !== undefined) up.price_list = updates.priceList
      if (updates.stock !== undefined) up.stock = updates.stock
      if (updates.category !== undefined) up.category = updates.category
      const { error } = await supabase.from('products').update(up).eq('id', id)
      if (!error) set(state => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }))
    } catch (err) {}
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) set(state => ({ products: state.products.filter(p => p.id !== id) }))
    } catch (err) {}
  },

  startAttention: (id) => {
    supabase.from('appointments').update({ status: 'en_atencion' }).eq('id', id).then(() => {
       set((state) => ({ appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'en_atencion' } : a) }))
    })
  },

  finishAttention: (id, finalServices, finalProducts) => {
    let calcTotal = 0;
    finalServices.forEach(s => calcTotal += s.price);
    finalProducts.forEach(p => calcTotal += (p.price * p.quantity));
    
    supabase.from('appointments').update({ 
      status: 'pendiente_cobro', services: finalServices, products: finalProducts, totalAmount: calcTotal 
    }).eq('id', id).then(() => {
      set((state) => ({ appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'pendiente_cobro', services: finalServices, products: finalProducts, totalAmount: calcTotal } : a) }));
    })
  },

  completeAppointment: (id, method, finalTotal, extraProducts: any[] = [], extraSoldBy = "", paymentSplits?: PaymentSplit[], observations?: string) => {
    const apt = get().appointments.find(a => a.id === id);
    if(!apt) return;
    const accumulatedPaid = (apt.paidAmount || 0) + finalTotal;

    const saleItems: SaleItem[] = [];
    apt.services.forEach(s => saleItems.push({ type: 'service', itemId: s.serviceId, itemName: s.serviceName, price: method === 'efectivo' ? (s.priceCash || s.price) : s.price, priceCashReference: s.priceCash || s.price, quantity: 1, soldBy: apt.professionalId }));
    apt.products?.forEach(p => saleItems.push({ type: 'product', itemId: p.productId, itemName: p.productName, price: method === 'efectivo' ? (p.priceCashReference || p.price) : p.price, priceCashReference: p.priceCashReference || p.price, quantity: p.quantity, soldBy: apt.professionalId }));
    extraProducts.forEach(p => saleItems.push({ type: 'product', itemId: p.product.id, itemName: p.product.name, price: method === 'efectivo' ? p.product.priceCash : p.product.priceList, priceCashReference: p.product.priceCash, quantity: p.quantity, soldBy: extraSoldBy || apt.professionalId }));

    get().addSaleMultipago({
      type: 'appointment',
      items: saleItems,
      total: finalTotal,
      paymentMethod: method,
      paymentSplits: paymentSplits || [{ method, amount: finalTotal }],
      observations,
      source: 'recepcion',
      patientId: apt.patientId,
      appointmentId: id,
      processedBy: "Recepción"
    }).then(() => {
      supabase.from('appointments').update({ status: 'completado', paidAmount: accumulatedPaid }).eq('id', id).then(() => {
        set((state) => ({
          appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'completado', paidAmount: accumulatedPaid } : a)
        }));
      })
    })
    if (method === 'gift_card') get().updatePatientGiftCardBalance(apt.patientId, -finalTotal);
  },

  cancelAppointment: async (id) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (!error) set((state) => ({ appointments: state.appointments.filter(a => a.id !== id) }))
    } catch (err) { console.error(err) }
  },

  updateAppointment: async (id, updates) => {
    try {
      const up: any = {};
      if (updates.professionalId) up.professionalId = updates.professionalId;
      if (updates.time) up.time = updates.time;
      if (updates.status) up.status = updates.status;
      if (updates.services) up.services = updates.services;
      if (updates.products) up.products = updates.products;
      if (updates.totalAmount !== undefined) up.totalAmount = updates.totalAmount;
      if (updates.paidAmount !== undefined) up.paidAmount = updates.paidAmount;
      if (updates.date) up.date = format(updates.date, "yyyy-MM-dd'T'12:00:00.000'Z'");
      const { error } = await supabase.from('appointments').update(up).eq('id', id);
      if (!error) set((state) => ({ appointments: state.appointments.map(a => a.id === id ? { ...a, ...updates } : a) }))
    } catch (err) { console.error(err) }
  },

  updatePatientGiftCardBalance: async (id, amountToAdd) => {
    const { patients } = get();
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    const currentBalance = patient.giftCardBalance || 0
    // Nunca puede quedar negativo
    const newBalance = Math.max(0, currentBalance + amountToAdd)
    if (amountToAdd < 0 && currentBalance + amountToAdd < 0) {
      console.warn(`[GiftCard] Saldo insuficiente: tiene $${currentBalance}, intenta usar $${Math.abs(amountToAdd)}`)
      return
    }
    try {
      const { error } = await supabase.from('patients').update({ gift_card_balance: newBalance }).eq('id', id);
      if (!error) set((state) => ({ patients: state.patients.map(p => p.id === id ? { ...p, giftCardBalance: newBalance } : p) }));
    } catch (err) { console.error(err); }
  },

  fetchOffers: async () => {
    try {
      const { data, error } = await supabase.from('offers').select('*');
      if (!error && data) set({ offers: data.map((o: any) => ({ id: o.id, name: o.name, discountPercentage: o.discount_percentage })) });
    } catch (err) { console.error(err); }
  },

  addOffer: async (offer) => {
    try {
      const { data, error } = await supabase.from('offers').insert([{ name: offer.name, discount_percentage: offer.discountPercentage }]).select().single();
      if (!error && data) set(state => ({ offers: [...state.offers, { id: data.id, name: data.name, discountPercentage: data.discount_percentage }] }));
    } catch (err) { console.error(err); }
  },

  updateOffer: async (id, updates) => {
    try {
      const up: any = {}
      if (updates.name !== undefined) up.name = updates.name
      if (updates.discountPercentage !== undefined) up.discount_percentage = updates.discountPercentage
      const { error } = await supabase.from('offers').update(up).eq('id', id);
      if (!error) set(state => ({ offers: state.offers.map(o => o.id === id ? { ...o, ...updates } : o) }));
    } catch (err) { console.error(err); }
  },

  deleteOffer: async (id) => {
    try {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (!error) set(state => ({ offers: state.offers.filter(o => o.id !== id) }));
    } catch (err) { console.error(err); }
  },

  fetchCombos: async () => {
    try {
      const { data, error } = await supabase.from('combos').select('*');
      if (!error && data) set({ combos: data.map((c: any) => ({ id: c.id, name: c.name, items: c.items, priceCash: c.price_cash, priceList: c.price_list })) });
    } catch (err) { console.error(err); }
  },

  addCombo: async (combo) => {
    try {
      const { data, error } = await supabase.from('combos').insert([{ name: combo.name, items: combo.items, price_cash: combo.priceCash, price_list: combo.priceList }]).select().single();
      if (!error && data) set(state => ({ combos: [...state.combos, { id: data.id, name: data.name, items: data.items, priceCash: data.price_cash, priceList: data.price_list }] }));
    } catch (err) { console.error(err); }
  },

  updateCombo: async (id, updates) => {
    try {
      const up: any = {}
      if (updates.name !== undefined) up.name = updates.name
      if (updates.items !== undefined) up.items = updates.items
      if (updates.priceCash !== undefined) up.price_cash = updates.priceCash
      if (updates.priceList !== undefined) up.price_list = updates.priceList
      const { error } = await supabase.from('combos').update(up).eq('id', id);
      if (!error) set(state => ({ combos: state.combos.map(c => c.id === id ? { ...c, ...updates } : c) }));
    } catch (err) { console.error(err); }
  },

  deleteCombo: async (id) => {
    try {
      const { error } = await supabase.from('combos').delete().eq('id', id);
      if (!error) set(state => ({ combos: state.combos.filter(c => c.id !== id) }));
    } catch (err) { console.error(err); }
  },

  fetchCashClosures: async () => {
    try {
      const { data, error } = await supabase.from('cash_closures').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        set({ cashClosures: data.map((c: any) => ({
          id: c.id,
          receptionistName: c.receptionist_name,
          dateFrom: new Date(c.date_from),
          dateTo: new Date(c.date_to),
          amountEfectivo: c.amount_efectivo || 0,
          amountTransferencia: c.amount_transferencia || 0,
          amountTarjeta: c.amount_tarjeta || 0,
          amountQr: c.amount_qr || 0,
          total: c.total || 0,
          observations: c.observations,
          createdAt: new Date(c.created_at),
        })) });
      }
    } catch (err) { console.error(err); }
  },

  addCashClosure: async (closure) => {
    try {
      const { data, error } = await supabase.from('cash_closures').insert([{
        receptionist_name: closure.receptionistName,
        date_from: closure.dateFrom.toISOString(),
        date_to: closure.dateTo.toISOString(),
        amount_efectivo: closure.amountEfectivo,
        amount_transferencia: closure.amountTransferencia,
        amount_tarjeta: closure.amountTarjeta,
        amount_qr: closure.amountQr,
        total: closure.total,
        observations: closure.observations,
      }]).select().single();
      if (!error && data) {
        const newClosure = {
          id: data.id,
          receptionistName: data.receptionist_name,
          dateFrom: new Date(data.date_from),
          dateTo: new Date(data.date_to),
          amountEfectivo: data.amount_efectivo || 0,
          amountTransferencia: data.amount_transferencia || 0,
          amountTarjeta: data.amount_tarjeta || 0,
          amountQr: data.amount_qr || 0,
          total: data.total || 0,
          observations: data.observations,
          createdAt: new Date(data.created_at),
        };
        set(state => ({ cashClosures: [newClosure, ...state.cashClosures] }));
      }
    } catch (err) { console.error(err); }
  },

  // ============================================
  // REALTIME — TODAS LAS TABLAS
  // ============================================
  subscribeToAppointments: () => {
    const channelName = `clinic-realtime-${Date.now()}`

    const mapSale = (s: any): Sale => ({
      id: s.id, items: s.items || [], total: s.total,
      paymentMethod: s.payment_method, paymentSplits: s.payment_splits || [],
      usedOfferId: s.used_offer_id, observations: s.observations,
      source: s.source || 'recepcion', processedBy: s.processed_by,
      patientId: s.patient_id, appointmentId: s.appointment_id,
      type: s.type, date: new Date(s.date)
    })

    const mapClosure = (c: any) => ({
      id: c.id, receptionistName: c.receptionist_name,
      dateFrom: new Date(c.date_from), dateTo: new Date(c.date_to),
      amountEfectivo: c.amount_efectivo || 0, amountTransferencia: c.amount_transferencia || 0,
      amountTarjeta: c.amount_tarjeta || 0, amountQr: c.amount_qr || 0,
      total: c.total || 0, observations: c.observations, createdAt: new Date(c.created_at),
    })

    const channel = supabase
      .channel(channelName)

      // --- APPOINTMENTS ---
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newApt = { ...payload.new, date: new Date((payload.new as any).date) } as any
          set(state => {
            if (state.appointments.find((a: any) => a.id === newApt.id)) return state
            return { appointments: [...state.appointments, newApt] } as any
          })
        }
        if (payload.eventType === 'UPDATE') {
          const updated = { ...payload.new, date: new Date((payload.new as any).date) } as any
          set(state => ({ appointments: state.appointments.map((a: any) => a.id === updated.id ? { ...a, ...updated } : a) } as any))
        }
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any
          set(state => ({ appointments: state.appointments.filter((a: any) => a.id !== old.id) } as any))
        }
      })

      // --- SALES ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
        const newSale = mapSale(payload.new)
        set(state => {
          if (state.sales.find(x => x.id === newSale.id)) return state
          return { sales: [newSale, ...state.sales] }
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sales' }, (payload) => {
        const updated = mapSale(payload.new)
        set(state => ({ sales: state.sales.map(x => x.id === updated.id ? updated : x) }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sales' }, (payload) => {
        set(state => ({ sales: state.sales.filter(x => x.id !== payload.old.id) }))
      })

      // --- PROFESSIONALS ---
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professionals' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const np = payload.new as any
          set(state => {
            if (state.professionals.find(p => p.id === np.id)) return state
            return { professionals: [...state.professionals, np] }
          })
        }
        if (payload.eventType === 'UPDATE') {
          const up = payload.new as any
          set(state => ({ professionals: state.professionals.map(p => p.id === up.id ? { ...p, ...up } : p) }))
        }
        if (payload.eventType === 'DELETE') {
          const dp = payload.old as any
          set(state => ({ professionals: state.professionals.filter(p => p.id !== dp.id) }))
        }
      })

      // --- PATIENTS ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, (payload) => {
        const p = payload.new
        const newPatient = {
          id: p.id, name: p.name, phone: p.phone, dni: p.dni, email: p.email,
          birthdate: p.birth_date, createdAt: new Date(p.created_at || Date.now()),
          notes: p.notes, giftCardBalance: p.gift_card_balance || 0
        }
        set(state => {
          if (state.patients.find(x => x.id === newPatient.id)) return state
          return { patients: [...state.patients, newPatient] }
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, (payload) => {
        const p = payload.new
        set(state => ({
          patients: state.patients.map(x => x.id === p.id ? {
            ...x, name: p.name, phone: p.phone, dni: p.dni, email: p.email,
            birthdate: p.birth_date, notes: p.notes, giftCardBalance: p.gift_card_balance || 0
          } : x)
        }))
      })

      // --- CASH CLOSURES ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cash_closures' }, (payload) => {
        const newClosure = mapClosure(payload.new)
        set(state => {
          if (state.cashClosures.find(x => x.id === newClosure.id)) return state
          return { cashClosures: [newClosure, ...state.cashClosures] }
        })
      })

      // --- EXPENSES ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' }, (payload) => {
        const e = payload.new
        const newExp = { id: e.id, description: e.description, amount: Number(e.amount), date: new Date(e.date) }
        set(state => {
          if (state.expenses.find(x => x.id === newExp.id)) return state
          return { expenses: [newExp, ...state.expenses] }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' }, (payload) => {
        set(state => ({ expenses: state.expenses.filter(x => x.id !== payload.old.id) }))
      })

      // --- PRODUCTS (stock changes) ---
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        set(state => ({ products: state.products.map(p => p.id === payload.new.id ? { ...p, stock: payload.new.stock ?? p.stock } : p) }))
      })

      .subscribe((status) => {
        console.log('[Realtime] Estado:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))