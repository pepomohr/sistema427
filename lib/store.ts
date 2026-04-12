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
  monday?: { start: string, end: string }
  tuesday?: { start: string, end: string }
  wednesday?: { start: string, end: string }
  thursday?: { start: string, end: string }
  friday?: { start: string, end: string }
  saturday?: { start: string, end: string }
  sunday?: { start: string, end: string }
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

export interface Sale {
  id: string
  items: SaleItem[]
  total: number
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr' | 'gift_card'
  date: Date
  processedBy: string
  type?: 'direct' | 'appointment'
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
  if (count >= 10) return 5
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
  
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => void
  updateHourlyRate: (id: string, rate: number) => void
  updateProfessional: (id: string, updates: Partial<Professional>) => void
  resetProfessionalPin: (id: string) => Promise<void>
  toggleProfessionalActive: (id: string) => void
  startAttention: (id: string) => void
  finishAttention: (id: string, finalServices: any[], finalProducts: any[]) => void
  completeAppointment: (id: string, paymentMethod: "efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card", finalTotal: number, extraProducts?: any[], extraSoldBy?: string) => void
  cancelAppointment: (id: string) => void
  updateAppointment: (id: string, updates: Partial<Appointment>) => void
  fetchProfessionals: () => Promise<void>
  addProfessional: (prof: Omit<Professional, 'id'>) => Promise<void>
  fetchPatients: () => Promise<void>
  searchPatients: (query: string) => Promise<Patient[]>
  updatePatientGiftCardBalance: (id: string, amountToAdd: number) => Promise<void>
  fetchServices: () => Promise<void>
  fetchProducts: () => Promise<void>
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>
  fetchAppointments: () => Promise<void>
  getProfessionalsForService: (serviceId: string) => Professional[]
  addService: (service: Omit<Service, 'id'>) => Promise<void>
  updateService: (id: string, updates: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addOffer: (offer: Omit<Offer, 'id'>) => void
  updateOffer: (id: string, updates: Partial<Offer>) => void
  deleteOffer: (id: string) => void
  addCombo: (combo: Omit<Combo, 'id'>) => void
  updateCombo: (id: string, updates: Partial<Combo>) => void
  deleteCombo: (id: string) => void
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

  addExpense: (expenseData) => {
    const newExpense = { ...expenseData, id: Date.now().toString(), date: new Date() }
    set(state => ({ expenses: [...state.expenses, newExpense] }))
  },

  addSale: (saleData) => {
    const { professionals } = get()
    const newSale = { ...saleData, id: Date.now().toString(), date: new Date() }
    
    const updatedProfessionals = professionals.map(prof => {
      const soldItems = saleData.items.filter(item => item.type === 'product' && item.soldBy === prof.id)
      const totalQty = soldItems.reduce((acc, item) => acc + item.quantity, 0)
      return totalQty > 0 ? { ...prof, monthlySalesCount: prof.monthlySalesCount + totalQty } : prof
    })

    set((state) => {
      let currentProducts = [...state.products]
      const deductStock = (prodId: string, qtyToDeduct: number) => {
        currentProducts = currentProducts.map(p => 
          p.id === prodId ? { ...p, stock: Math.max(0, p.stock - qtyToDeduct) } : p
        )
      }

      saleData.items.forEach(item => {
        if (item.type === 'product') {
          deductStock(item.itemId, item.quantity)
        } else if (item.type === 'combo') {
          const comboDef = state.combos.find(c => c.id === item.itemId)
          if (comboDef) {
            comboDef.items.forEach(i => {
              if (i.type === 'product') deductStock(i.itemId, i.quantity * item.quantity)
            })
          }
        }
      })

      return { 
        sales: [...state.sales, newSale],
        professionals: updatedProfessionals,
        products: currentProducts
      }
    })
  },

  updateHourlyRate: (id, rate) => {
    set((state) => ({
      professionals: state.professionals.map(p => p.id === id ? { ...p, hourlyRate: rate } : p)
    }));
    supabase.from('professionals').update({ hourlyRate: rate }).eq('id', id).then(({error}) => {
       if(error) console.error('updateHourlyRate error:', error);
    });
  },

  updateProfessional: (id, updates) => {
    set(state => ({
      professionals: state.professionals.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    supabase.from('professionals').update(updates).eq('id', id).then(({error}) => {
       if(error) console.error('updateProfessional error:', error);
    });
  },

  resetProfessionalPin: async (id) => {
    // 1. Limpieza Local Inmediata (Para que Nico vea el cambio aunque falle la red)
    set(state => ({
      professionals: state.professionals.map(p => 
        p.id === id ? { ...p, pin: null } : p
      )
    }));

    // 2. Limpieza de LocalStorage del Administrador (Por si las moscas)
    localStorage.removeItem(`c427_pins_${id}`);

    // 3. Intento de Update en Supabase con Error Handling Detallado
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ pin: null })
        .eq('id', id);

      if (error) {
        console.error('Error de Supabase resetProfessionalPin:', error.message, '| Detalle:', error.details);
      } else {
        console.log(`PIN de profesional ${id} reseteado en la nube.`);
      }
    } catch (err) {
      console.error('Fallo crítico de conexión al resetear PIN:', err);
    }
  },

  addProfessional: async (prof) => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .insert([{
          name: prof.name,
          shortName: prof.shortName,
          specialties: prof.specialties,
          isActive: prof.isActive,
          hourlyRate: prof.hourlyRate,
          hourlyRateFacial: prof.hourlyRateFacial,
          hourlyRateCorporal: prof.hourlyRateCorporal,
          monthlySalesCount: 0,
          color: prof.color
        }])
        .select()
        .single();
        
      if (!error && data) {
        set(state => ({ professionals: [...state.professionals, data] }))
      }
    } catch(err) { console.error(err) }
  },

  toggleProfessionalActive: (id) => {
    const { professionals } = get();
    const prof = professionals.find(p => p.id === id);
    if (prof) {
      const nextActive = !prof.isActive;
      set(state => ({
        professionals: state.professionals.map(p => p.id === id ? { ...p, isActive: nextActive } : p)
      }));
      supabase.from('professionals').update({ isActive: nextActive }).eq('id', id).then(({error}) => {
         if(error) console.error('toggleProfessionalActive error:', error);
      });
    }
  },

  addPatient: async (patient) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          name: patient.name,
          dni: patient.dni,
          phone: patient.phone,
          email: patient.email,
          birth_date: patient.birthdate
        }])
        .select()
        .single();
        
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
      if (!error && data) {
        set({ professionals: data });
      }
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
      const { data } = await supabase.from('services').select('*').limit(500);
      if (data) set({ services: data.map((s: any) => ({ id: s.id, name: s.name, price: s.price, priceCash: s.price_cash || s.price, duration: s.duration || 60, category: s.category })) });
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
      const { data, error } = await supabase.from('services').insert([{ name: service.name, price: service.price, price_cash: service.priceCash, duration: service.duration, category: service.category }]).select().single()
      if (!error && data) set(state => ({ services: [...state.services, { id: data.id, name: data.name, price: data.price, priceCash: data.price_cash || data.price, duration: data.duration || 60, category: data.category }]}))
    } catch (err) { console.error(err) }
  },

  updateService: async (id, updates) => {
    try {
      const up: any = {}
      if (updates.name !== undefined) up.name = updates.name
      if (updates.price !== undefined) up.price = updates.price
      if (updates.priceCash !== undefined) up.price_cash = updates.priceCash
      if (updates.category !== undefined) up.category = updates.category
      const { error } = await supabase.from('services').update(up).eq('id', id)
      if (!error) set(state => ({ services: state.services.map(s => s.id === id ? { ...s, ...updates } : s) }))
    } catch (err) { console.error(err) }
  },

  deleteService: async (id) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (!error) set(state => ({ services: state.services.filter(s => s.id !== id) }))
    } catch (err) { console.error(err) }
  },

  addProduct: async (product) => {
    try {
      const { data, error } = await supabase.from('products').insert([{ name: product.name, price_cash: product.priceCash, price_list: product.priceList, stock: product.stock, category: product.category }]).select().single()
      if (!error && data) set(state => ({ products: [...state.products, { id: data.id, name: data.name, priceCash: data.price_cash || 0, priceList: data.price_list || 0, stock: data.stock || 0, category: data.category }]}))
    } catch (err) { console.error(err) }
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
    } catch (err) { console.error(err) }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) set(state => ({ products: state.products.filter(p => p.id !== id) }))
    } catch (err) { console.error(err) }
  },

  startAttention: (id) => {
    set((state) => ({ appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'en_atencion' } : a) }))
  },

  finishAttention: (id, finalServices, finalProducts) => {
    set((state) => {
      let calcTotal = 0;
      finalServices.forEach(s => calcTotal += s.price);
      finalProducts.forEach(p => calcTotal += (p.price * p.quantity));
      return { appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'pendiente_cobro', services: finalServices, products: finalProducts, totalAmount: calcTotal } : a) };
    })
  },

  completeAppointment: (id, method, finalTotal, extraProducts: any[] = [], extraSoldBy = "") => {
    set((state) => {
      const apt = state.appointments.find(a => a.id === id);
      if(!apt) return state;
      const saleItems: SaleItem[] = [];
      apt.services.forEach(s => saleItems.push({ type: 'service', itemId: s.serviceId, itemName: s.serviceName, price: method === 'efectivo' ? (s.priceCash || s.price) : s.price, priceCashReference: s.priceCash || s.price, quantity: 1, soldBy: apt.professionalId }));
      apt.products?.forEach(p => saleItems.push({ type: 'product', itemId: p.productId, itemName: p.productName, price: method === 'efectivo' ? (p.priceCashReference || p.price) : p.price, priceCashReference: p.priceCashReference || p.price, quantity: p.quantity, soldBy: apt.professionalId }));
      extraProducts.forEach(p => saleItems.push({ type: 'product', itemId: p.product.id, itemName: p.product.name, price: method === 'efectivo' ? p.product.priceCash : p.product.priceList, priceCashReference: p.product.priceCash, quantity: p.quantity, soldBy: extraSoldBy || apt.professionalId }));
      const newSale: Sale = { id: Date.now().toString(), type: 'appointment', items: saleItems, total: finalTotal, paymentMethod: method, date: new Date(), processedBy: "Recepción" };
      let prodQty = apt.products?.reduce((acc, p) => acc + p.quantity, 0) || 0;
      let extraProdQtyByProf = extraSoldBy !== "recepcion" ? extraProducts.reduce((acc, item) => acc + item.quantity, 0) : 0;
      let currentProducts = [...state.products]
      const deductStock = (pId: string, q: number) => { currentProducts = currentProducts.map(p => p.id === pId ? { ...p, stock: Math.max(0, p.stock - q) } : p) }
      saleItems.forEach(item => { if (item.type === 'product') deductStock(item.itemId, item.quantity); else if (item.type === 'combo') { const c = state.combos.find(x => x.id === item.itemId); if (c) c.items.forEach(i => { if (i.type === 'product') deductStock(i.itemId, i.quantity * item.quantity) }) } })
      return { appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'completado', paidAmount: a.totalAmount } : a), sales: [...state.sales, newSale], products: currentProducts, professionals: state.professionals.map(prof => { if (prof.id === apt.professionalId && prodQty > 0) prof.monthlySalesCount += prodQty; if (prof.id === extraSoldBy && extraProdQtyByProf > 0) prof.monthlySalesCount += extraProdQtyByProf; return prof; }) };
    });
    const aptFound = get().appointments.find(a => a.id === id);
    if (method === 'gift_card' && aptFound) get().updatePatientGiftCardBalance(aptFound.patientId, -finalTotal);
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
    const newBalance = (patient.giftCardBalance || 0) + amountToAdd;
    try {
      const { error } = await supabase.from('patients').update({ gift_card_balance: newBalance }).eq('id', id);
      if (!error) set((state) => ({ patients: state.patients.map(p => p.id === id ? { ...p, giftCardBalance: newBalance } : p) }));
    } catch (err) { console.error(err); }
  },

  addOffer: (offer) => set(state => ({ offers: [...state.offers, { id: Date.now().toString(), ...offer }] })),
  updateOffer: (id, updates) => set(state => ({ offers: state.offers.map(o => o.id === id ? { ...o, ...updates } : o) })),
  deleteOffer: (id) => set(state => ({ offers: state.offers.filter(o => o.id !== id) })),
  addCombo: (combo) => set(state => ({ combos: [...state.combos, { id: Date.now().toString(), ...combo }] })),
  updateCombo: (id, updates) => set(state => ({ combos: state.combos.map(c => c.id === id ? { ...c, ...updates } : c) })),
  deleteCombo: (id) => set(state => ({ combos: state.combos.filter(c => c.id !== id) })),

}))