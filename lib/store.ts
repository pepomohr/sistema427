"use client"

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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
  priceCash: number // Precio Efectivo (Base para comisión)
  priceList: number // Precio Lista (Tarjeta/Transfe)
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
  hourlyRate: number // Pago por hora (Sueldo Nico)
  monthlySalesCount: number // Contador de productos vendidos
  color: string
  avatar?: string
  schedule?: WeekSchedule
}

export type AppointmentStatus = 'programado' | 'confirmado' | 'en_atencion' | 'pendiente_cobro' | 'completado' | 'cancelado'

export interface Appointment {
  id: string
  patientId: string
  patientName?: string // Added to prevent 'Desconocido' when patients list is fetched and clears mocks
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
  priceCashReference: number // El valor efectivo para calcular la comisión
  quantity: number
  soldBy: string // ID de la profesional que lo vendió
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

// La función que faltaba para arreglar el error de Next.js
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
    // Fallbacks just in case
    'facial': 'Facial/Escote',
    'escote': 'Facial/Escote',
    'corporal': 'Corporales',
    'cejas_pestanas': 'Cejas y Pestañas',
    'unas': 'Uñas',
  }
  return names[category] || category
}

// La escala de comisiones de Nico
export const calculateCommissionTab = (count: number) => {
  if (count >= 31) return 10
  if (count >= 21) return 7.5
  if (count >= 10) return 5
  return 0
}

// ============================================
// DATA INICIAL (MOCK)
// ============================================

const mockProfessionals: Professional[] = [
  { id: 'ceci', name: 'Cecilia', shortName: 'Ceci', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 12, color: '#E8B4B8' },
  { id: 'adri', name: 'Adriana', shortName: 'Adri', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 8, color: '#A8D8EA' },
  { id: 'vero', name: 'Vero', shortName: 'Vero', specialties: ['Facial', 'Corporales'], isActive: true, hourlyRate: 5000, monthlySalesCount: 22, color: '#C9B1FF' },
  { id: 'isabel', name: 'Isabel', shortName: 'Isabel', specialties: ['Facial'], isActive: true, hourlyRate: 5000, monthlySalesCount: 4, color: '#F8B195' },
  { id: 'delfi', name: 'Delfi', shortName: 'Delfi', specialties: ['Facial'], isActive: true, hourlyRate: 5000, monthlySalesCount: 7, color: '#F67280' },
  { id: 'martina', name: 'Martina', shortName: 'Martina', specialties: ['CyP'], isActive: true, hourlyRate: 4000, monthlySalesCount: 15, color: '#C06C84' },
  { id: 'fiorella', name: 'Fiorella', shortName: 'Fiorella', specialties: ['Uñas', 'CyP'], isActive: true, hourlyRate: 4500, monthlySalesCount: 5, color: '#F0A6CA' },
  { id: 'bianca', name: 'Bianca', shortName: 'Bianca', specialties: ['CyP'], isActive: true, hourlyRate: 4000, monthlySalesCount: 11, color: '#6C5B7B' },
  { id: 'mavy', name: 'Mavy', shortName: 'Mavy', specialties: ['Maderoterapia'], isActive: true, hourlyRate: 6000, monthlySalesCount: 35, color: '#B8E0D2' },
]

const mockOffers: Offer[] = [
  { id: 'off1', name: 'Promo Empleados 20%', discountPercentage: 20 },
  { id: 'off2', name: 'Descuento Especial 10%', discountPercentage: 10 }
]

const mockCombos: Combo[] = []

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
  
  // Actions
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => void
  updateHourlyRate: (id: string, rate: number) => void
  updateProfessional: (id: string, updates: Partial<Professional>) => void
  addVacation: (id: string) => void
  removeVacation: (id: string) => void
  toggleProfessionalActive: (id: string) => void
  getProfessionalAppointments: (id: string, date: Date) => Appointment[]
  startAttention: (id: string) => void
  finishAttention: (id: string, finalServices: any[], finalProducts: any[]) => void
  completeAppointment: (id: string, paymentMethod: "efectivo" | "tarjeta" | "transferencia" | "qr" | "gift_card", finalTotal: number, extraProducts?: any[], extraSoldBy?: string) => void
  cancelAppointment: (id: string) => void
  updateAppointment: (id: string, updates: Partial<Appointment>) => void
  
  // Supabase Patient Actions
  fetchPatients: () => Promise<void>
  searchPatients: (query: string) => Promise<Patient[]>
  updatePatientGiftCardBalance: (id: string, amountToAdd: number) => Promise<void>
  
  // Supabase Products & Services
  fetchServices: () => Promise<void>
  fetchProducts: () => Promise<void>
  
  // Reception actions
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void
  getProfessionalsForService: (serviceId: string) => Professional[]

  // Supabase Products & Services Admin
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

 
const mockPatients: Patient[] = [
  { id: 'pat1', name: 'Laura Gómez', phone: '1123456789', dni: '30123456', createdAt: new Date() },
  { id: 'pat2', name: 'Mariana Pérez', phone: '1198765432', dni: '31987654', createdAt: new Date() },
  { id: 'pat3', name: 'Sofía Martínez', phone: '1176543210', dni: '32000111', createdAt: new Date() },
]

const mockAppointments: Appointment[] = [
  { 
    id: 'a1', patientId: 'pat1', patientName: 'Laura Gómez', professionalId: 'ceci', 
    date: new Date(), time: '09:00', 
    services: [{ serviceId: 's1', serviceName: 'Limpieza Facial Profunda', price: 5000, priceCash: 4500 }],
    products: [],
    status: 'confirmado', totalAmount: 5000, paidAmount: 0 
  },
  { 
    id: 'a2', patientId: 'pat2', patientName: 'Mariana Pérez', professionalId: 'ceci', 
    date: new Date(), time: '10:30', 
    services: [{ serviceId: 's3', serviceName: 'Masaje Reductor', price: 6000, priceCash: 5000 }],
    products: [],
    status: 'en_atencion', totalAmount: 6000, paidAmount: 0 
  },
  { 
    id: 'a3', patientId: 'pat3', patientName: 'Sofía Martínez', professionalId: 'ceci', 
    date: new Date(new Date().setDate(new Date().getDate() + 1)), time: '15:00', 
    services: [{ serviceId: 's2', serviceName: 'Peeling Químico', price: 8000 }],
    products: [],
    status: 'programado', totalAmount: 8000, paidAmount: 0 
  }
]

export const useClinicStore = create<ClinicStore>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  professionals: mockProfessionals,
  appointments: mockAppointments,
  sales: [],
  patients: mockPatients,
  services: [],
  expenses: [],
  products: [],
  offers: mockOffers,
  combos: mockCombos,

  addExpense: (expenseData) => {
    const newExpense = { ...expenseData, id: Date.now().toString(), date: new Date() }
    set(state => ({ expenses: [...state.expenses, newExpense] }))
  },

  addSale: (saleData) => {
    const { professionals, combos } = get()
    const newSale = { ...saleData, id: Date.now().toString(), date: new Date() }
    
    // Lógica de Nico: Si se vendió un producto, sumamos al contador de la profesional
    const updatedProfessionals = professionals.map(prof => {
      const soldItems = saleData.items.filter(item => item.type === 'product' && item.soldBy === prof.id)
      const totalQty = soldItems.reduce((acc, item) => acc + item.quantity, 0)
      
      if (totalQty > 0) {
        return { ...prof, monthlySalesCount: prof.monthlySalesCount + totalQty }
      }
      return prof
    })

    set((state) => {
      let currentProducts = [...state.products]

      // Helper for stock deduction
      const deductStock = (prodId: string, qtyToDeduct: number) => {
        currentProducts = currentProducts.map(p => 
          p.id === prodId ? { ...p, stock: Math.max(0, p.stock - qtyToDeduct) } : p
        )
      }

      // Deduct stock for all products explicitly sold or sold within combos
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
    }))
  },

  updateProfessional: (id, updates) => set(state => ({
    professionals: state.professionals.map(p => p.id === id ? { ...p, ...updates } : p)
  })),

  addVacation: (id) => {},
  removeVacation: (id) => {},

  toggleProfessionalActive: (id) => set(state => ({
    professionals: state.professionals.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
  })),

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
        
      if (error) {
        console.error('Supabase add patient error:', error);
      } else if (data) {
        const newPatient = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          dni: data.dni,
          email: data.email,
          birthdate: data.birth_date,
          createdAt: new Date(data.created_at || Date.now()),
          notes: data.notes
        };
        set(state => ({ patients: [...state.patients, newPatient] }));
      }
    } catch (err) {
      console.error('Network error adding patient:', err);
    }
  },

  updatePatient: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: updates.name,
          dni: updates.dni,
          phone: updates.phone,
          email: updates.email,
          birth_date: updates.birthdate,
          notes: updates.notes
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase update patient error:', error);
      } else {
        set(state => ({
          patients: state.patients.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
      }
    } catch (err) {
      console.error('Network error updating patient:', err);
    }
  },

  addAppointment: (appointment) => {
    const newAppointment = { ...appointment, id: Date.now().toString() }
    set(state => ({ appointments: [...state.appointments, newAppointment] }))
  },

  getProfessionalsForService: (serviceId) => {
    const { professionals, services } = get()
    const service = services.find(s => s.id === serviceId)
    if (!service) return []
    return professionals.filter(p => p.isActive && p.specialties.includes(service.category))
  },

  fetchPatients: async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(1300);
        
      if (error) {
        console.error('Supabase fetch error:', error);
        return; // Fallback to mock data already in state
      }

      if (data && data.length > 0) {
        set({
          patients: data.map((p: any) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            dni: p.dni,
            email: p.email,
            birthdate: p.birth_date,
            createdAt: new Date(p.created_at || p.createdAt || Date.now()),
            notes: p.notes,
            giftCardBalance: p.gift_card_balance || 0
          }))
        });
      }
    } catch (err) {
      console.error('Network error fetching patients:', err);
      // Fails silently, keeping local state intact
    }
  },

  searchPatients: async (query: string) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];
    
    const { patients } = get();

    // 1. Local state search (ultra fast)
    const localResults = patients.filter(p => 
      (p.name && p.name.toLowerCase().includes(cleanQuery)) || 
      (p.dni && p.dni.includes(cleanQuery)) || 
      (p.phone && p.phone.includes(cleanQuery))
    );

    // 2. Also query Supabase and merge, so local partial matches
    // never hide valid records that are not loaded in-memory yet.
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${cleanQuery}%,dni.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
        .limit(20);

      if (error) {
         console.error('Supabase search error:', error);
         return [];
      }

      if (data) {
         const remoteResults = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          dni: p.dni,
          email: p.email,
          birthdate: p.birth_date,
          createdAt: new Date(p.created_at || p.createdAt || Date.now()),
          notes: p.notes,
          giftCardBalance: p.gift_card_balance || 0
         }));

         const merged = [...localResults];
         const seen = new Set(localResults.map((p) => p.id));
         for (const patient of remoteResults) {
           if (!seen.has(patient.id)) {
             merged.push(patient);
             seen.add(patient.id);
           }
         }
         return merged;
      }
    } catch (err) {
      console.error('Network error searching Supabase:', err);
    }
    
    return localResults;
  },

  fetchServices: async () => {
    try {
      const { data, error } = await supabase.from('services').select('*').limit(500);
      if (data && data.length > 0) {
        set({
          services: data.map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            priceCash: s.price_cash || s.price,
            duration: s.duration || 60,
            category: s.category
          }))
        });
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  },

  fetchProducts: async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').limit(500);
      if (data && data.length > 0) {
        set({
          products: data.map((p: any) => ({
            id: p.id,
            name: p.name,
            priceCash: p.price_cash || p.priceCash || p.price || 0,
            priceList: p.price_list || p.priceList || p.price || 0,
            stock: p.stock || 0,
            category: p.category
          }))
        });
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  },

  addService: async (service) => {
    try {
      const { data, error } = await supabase.from('services').insert([{
        name: service.name,
        price: service.price,
        price_cash: service.priceCash,
        duration: service.duration,
        category: service.category
      }]).select().single()
      
      if (!error && data) {
        set(state => ({ services: [...state.services, {
          id: data.id,
          name: data.name,
          price: data.price,
          priceCash: data.price_cash || data.price,
          duration: data.duration || 60,
          category: data.category
        }]}))
      }
    } catch (err) { console.error(err) }
  },

  updateService: async (id, updates) => {
    try {
      const updatePayload: any = {}
      if (updates.name !== undefined) updatePayload.name = updates.name
      if (updates.price !== undefined) updatePayload.price = updates.price
      if (updates.priceCash !== undefined) updatePayload.price_cash = updates.priceCash
      if (updates.duration !== undefined) updatePayload.duration = updates.duration
      if (updates.category !== undefined) updatePayload.category = updates.category

      const { error } = await supabase.from('services').update(updatePayload).eq('id', id)
      if (!error) {
        set(state => ({ services: state.services.map(s => s.id === id ? { ...s, ...updates } : s) }))
      }
    } catch (err) { console.error(err) }
  },

  deleteService: async (id) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (!error) {
        set(state => ({ services: state.services.filter(s => s.id !== id) }))
      }
    } catch (err) { console.error(err) }
  },

  addProduct: async (product) => {
    try {
      const { data, error } = await supabase.from('products').insert([{
        name: product.name,
        price_cash: product.priceCash,
        price_list: product.priceList,
        stock: product.stock,
        category: product.category
      }]).select().single()
      
      if (!error && data) {
        set(state => ({ products: [...state.products, {
          id: data.id,
          name: data.name,
          priceCash: data.price_cash || 0,
          priceList: data.price_list || 0,
          stock: data.stock || 0,
          category: data.category
        }]}))
      }
    } catch (err) { console.error(err) }
  },

  updateProduct: async (id, updates) => {
    try {
      const updatePayload: any = {}
      if (updates.name !== undefined) updatePayload.name = updates.name
      if (updates.priceCash !== undefined) updatePayload.price_cash = updates.priceCash
      if (updates.priceList !== undefined) updatePayload.price_list = updates.priceList
      if (updates.stock !== undefined) updatePayload.stock = updates.stock
      if (updates.category !== undefined) updatePayload.category = updates.category

      const { error } = await supabase.from('products').update(updatePayload).eq('id', id)
      if (!error) {
        set(state => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }))
      }
    } catch (err) { console.error(err) }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) {
        set(state => ({ products: state.products.filter(p => p.id !== id) }))
      }
    } catch (err) { console.error(err) }
  },

  getProfessionalAppointments: (id, date) => {
    const { appointments } = get()
    return appointments.filter(a => a.professionalId === id && Math.abs(a.date.getTime() - date.getTime()) < 86400000 * 2 ) // A bit relaxed comparison for calendar
  },

  startAttention: (id) => {
    set((state) => ({
      appointments: state.appointments.map(a => a.id === id ? { ...a, status: 'en_atencion' } : a)
    }))
  },

  finishAttention: (id, finalServices, finalProducts) => {
    set((state) => {
      let calcTotal = 0;
      finalServices.forEach(s => calcTotal += s.price);
      finalProducts.forEach(p => calcTotal += (p.price * p.quantity));

      return {
        appointments: state.appointments.map(a => 
          a.id === id ? { 
            ...a, 
            status: 'pendiente_cobro', 
            services: finalServices, 
            products: finalProducts,
            totalAmount: calcTotal 
          } : a
        )
      };
    })
  },

  completeAppointment: (id, method, finalTotal, extraProducts: any[] = [], extraSoldBy = "") => {
    set((state) => {
      const apt = state.appointments.find(a => a.id === id);
      if(!apt) return state;

      // Generar venta integrada para que el Dashboard lo absorba
      const saleItems: SaleItem[] = [];
      apt.services.forEach(s => saleItems.push({ 
        type: 'service', itemId: s.serviceId, itemName: s.serviceName, 
        price: method === 'efectivo' ? (s.priceCash || s.price) : s.price, 
        priceCashReference: s.priceCash || s.price, quantity: 1, soldBy: apt.professionalId 
      }));
      
      apt.products?.forEach(p => saleItems.push({ 
        type: 'product', itemId: p.productId, itemName: p.productName, 
        price: method === 'efectivo' ? (p.priceCashReference || p.price) : p.price, 
        priceCashReference: p.priceCashReference || p.price, quantity: p.quantity, soldBy: apt.professionalId 
      }));

      extraProducts.forEach(p => saleItems.push({
        type: 'product', itemId: p.product.id, itemName: p.product.name,
        price: method === 'efectivo' ? p.product.priceCash : p.product.priceList,
        priceCashReference: p.product.priceCash, quantity: p.quantity, soldBy: extraSoldBy || apt.professionalId
      }));

      const newSale: Sale = {
        id: Date.now().toString(),
        type: 'appointment',
        items: saleItems,
        total: finalTotal,
        paymentMethod: method,
        date: new Date(),
        processedBy: "Recepción" // O cajero logueado
      };

      // Actualizar contador de ventas de productos para la comision/tier
      // Incluye los productos de gabinete + los directos de mostrador vendidos por la profesional
      let prodQty = apt.products?.reduce((acc, p) => acc + p.quantity, 0) || 0;
      
      let extraProdQtyByProf = 0;
      if (extraSoldBy !== "recepcion") {
         extraProdQtyByProf = extraProducts.reduce((acc, item) => acc + item.quantity, 0);
      }

      let currentProducts = [...state.products]
      const deductStock = (prodId: string, qtyToDeduct: number) => {
        currentProducts = currentProducts.map(p => 
          p.id === prodId ? { ...p, stock: Math.max(0, p.stock - qtyToDeduct) } : p
        )
      }

      // Deduct stock for all products explicitly sold or sold within combos
      saleItems.forEach(item => {
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
        appointments: state.appointments.map(a => 
          a.id === id ? { ...a, status: 'completado', paidAmount: a.totalAmount } : a
        ),
        sales: [...state.sales, newSale],
        products: currentProducts,
        professionals: state.professionals.map(prof => {
          if (prof.id === apt.professionalId && prodQty > 0) prof.monthlySalesCount += prodQty;
          if (prof.id === extraSoldBy && extraProdQtyByProf > 0) prof.monthlySalesCount += extraProdQtyByProf;
          return prof;
        })
      };
    });
    const aptFound = get().appointments.find(a => a.id === id);
    if (method === 'gift_card' && aptFound) {
      get().updatePatientGiftCardBalance(aptFound.patientId, -finalTotal);
    }
  },

  cancelAppointment: (id) => {
    set((state) => ({
      appointments: state.appointments.filter(a => a.id !== id)
    }))
  },

  updateAppointment: (id, updates) => {
    set((state) => ({
      appointments: state.appointments.map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }))
  },

  updatePatientGiftCardBalance: async (id: string, amountToAdd: number) => {
    const { patients } = get();
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const newBalance = (patient.giftCardBalance || 0) + amountToAdd;

    try {
      const { error } = await supabase
        .from('patients')
        .update({ gift_card_balance: newBalance })
        .eq('id', id);

      if (error) {
        console.error('Failed to update gift card balance:', error);
        return;
      }

      set((state) => ({
        patients: state.patients.map(p => 
          p.id === id ? { ...p, giftCardBalance: newBalance } : p
        )
      }));
    } catch (err) {
      console.error(err);
    }
  },

  addOffer: (offer) => set(state => ({ offers: [...state.offers, { id: Date.now().toString(), ...offer }] })),
  updateOffer: (id, updates) => set(state => ({ offers: state.offers.map(o => o.id === id ? { ...o, ...updates } : o) })),
  deleteOffer: (id) => set(state => ({ offers: state.offers.filter(o => o.id !== id) })),
  
  addCombo: (combo) => set(state => ({ combos: [...state.combos, { id: Date.now().toString(), ...combo }] })),
  updateCombo: (id, updates) => set(state => ({ combos: state.combos.map(c => c.id === id ? { ...c, ...updates } : c) })),
  deleteCombo: (id) => set(state => ({ combos: state.combos.filter(c => c.id !== id) })),

}))