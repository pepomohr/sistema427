"use client"

import { useState, useMemo, useEffect } from "react"
import type { User, UserRole } from "@/lib/store"
import { useClinicStore } from "@/lib/store"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  Users,
  Calendar,
  CreditCard,
  Stethoscope,
  BarChart3,
  UserCog,
  Menu,
  X,
  Wallet,
  Award,
  Settings,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  Bell,
  BellOff
} from "lucide-react"
import { registerServiceWorker, registerPushSubscription } from "@/lib/push-notifications"
import { ReceptionModule } from "@/components/reception-module"
import { ProfessionalsModule } from "@/components/professionals-module"
import { ChargeModule } from "@/components/charge-module"
import { ReportsModule } from "@/components/reports-module"
import { SalesReportModule } from "@/components/sales-report-module"
import { HRModule } from "@/components/hr-module"
import { SystemConfigModule } from "@/components/system-config-module"
import { PricesModule } from "@/components/prices-module"

interface MainLayoutProps {
  user: User
  onLogout: () => void
}

type TabId = "recepcion-busqueda" | "recepcion-agenda" | "recepcion-caja" | "recepcion-comisiones" | "agenda" | "atencion" | "comisiones" | "cobrar" | "ventas" | "precios" | "reportes" | "rrhh" | "config"

interface Tab {
  id: TabId
  label: string
  icon: typeof Users
  roles: UserRole[]
}

// ACÁ ESTÁ LA MAGIA: Le sacamos "admin" a los módulos individuales para limpiar su sidebar
const allTabs: Tab[] = [
  { id: "recepcion-busqueda", label: "Búsqueda Pacientes", icon: Users, roles: ["recepción", "admin"] },
  { id: "recepcion-agenda", label: "Agenda General", icon: Calendar, roles: ["recepción", "admin"] },
  { id: "recepcion-caja", label: "Cierre de Caja", icon: Wallet, roles: ["recepción", "admin"] },
  { id: "recepcion-comisiones", label: "Objetivos y Ventas", icon: Award, roles: ["recepción"] }, // Solo recepción
  { id: "agenda", label: "Mi Agenda", icon: Calendar, roles: ["profesional"] }, // Solo profesionales
  { id: "atencion", label: "Atención", icon: Stethoscope, roles: ["profesional"] }, // Solo profesionales
  { id: "comisiones", label: "Comisiones", icon: Award, roles: ["profesional"] }, // Solo profesionales
  { id: "cobrar", label: "Cobrar", icon: CreditCard, roles: ["recepción"] },
  { id: "ventas", label: "Ventas", icon: ClipboardList, roles: ["recepción", "admin"] },
  { id: "precios", label: "Precios", icon: DollarSign, roles: ["recepción", "admin"] },
  { id: "rrhh", label: "RRHH", icon: UserCog, roles: ["admin"] },
  { id: "reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { id: "config", label: "Configuración", icon: Settings, roles: ["admin"] }
]

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const availableTabs = allTabs.filter((tab) => tab.roles.includes(user.role))
  const [activeTab, setActiveTab] = useState<TabId>(availableTabs[0]?.id || "recepcion-busqueda")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dismissedLowStock, setDismissedLowStock] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Para admin: detectar estado y cargar historial
  useEffect(() => {
    if (user.role !== 'admin') return
    if (!('Notification' in window)) return
    setNotifStatus(Notification.permission as any)
    fetchNotifications()
  }, [user.role])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin-notifications')
      if (!res.ok) return
      const data = await res.json()
      const notifs = data.notifications || []
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n: any) => !n.read).length)
    } catch {}
  }

  const handleBellClick = async () => {
    if (notifStatus !== 'granted') {
      await registerServiceWorker()
      await registerPushSubscription('admin')
      setNotifStatus(Notification.permission as any)
      return
    }
    // Abrir panel
    setNotifPanelOpen(prev => !prev)
    if (!notifPanelOpen) {
      await fetchNotifications()
      // Marcar como leídas
      if (unreadCount > 0) {
        fetch('/api/admin-notifications', { method: 'PATCH' }).catch(() => {})
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    }
  }

  const formatNotifTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)
    if (diffMin < 1) return 'Ahora'
    if (diffMin < 60) return `hace ${diffMin}m`
    if (diffHrs < 24) return `hace ${diffHrs}h`
    return `hace ${diffDays}d`
  }

  const handleEnableNotifications = async () => {
    await registerServiceWorker()
    await registerPushSubscription('admin')
    setNotifStatus(Notification.permission as any)
  }

  const { products } = useClinicStore()
  const lowStockProducts = useMemo(
    () => (products || []).filter(p => typeof p.stock === 'number' && p.stock < 3 && p.stock >= 0),
    [products]
  )

  const renderContent = () => {
    switch (activeTab) {
      case "recepcion-busqueda":
        return <ReceptionModule activeView="pacientes" />
      case "recepcion-agenda":
        return <ReceptionModule activeView="agenda" />
      case "recepcion-caja":
        return <ReceptionModule activeView="caja" />
      case "recepcion-comisiones":
        return <ReceptionModule activeView="comisiones" />
      case "agenda":
        return <ProfessionalsModule view="agenda" professionalId={user.professionalId} />
      case "atencion":
        return <ProfessionalsModule view="atencion" professionalId={user.professionalId} />
      case "comisiones":
        return <ProfessionalsModule view="comisiones" professionalId={user.professionalId} />
      case "cobrar":
        return <ChargeModule />
      case "ventas":
        return <SalesReportModule />
      case "precios":
        return <PricesModule />
      case "reportes":
        return <ReportsModule />
      case "rrhh":
        return <HRModule />
      case "config":
        return <SystemConfigModule />
      default:
        return <ReceptionModule activeView="pacientes" />
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "recepción":
        return "Recepción"
      case "profesional":
        return "Profesional"
      case "admin":
        return "Administrador"
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Image 
              src="/images/c427logodorado.png" 
              alt="C427 CLINIC Logo" 
              width={100} 
              height={32} 
              priority 
              className="object-contain"
            />
            <span className="hidden sm:inline-block text-sm text-muted-foreground">|</span>
            <span className="hidden sm:inline-block text-sm text-muted-foreground">
              {getRoleLabel(user.role)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-sm text-foreground">
              Hola, <span className="font-medium">{user.name}</span>
            </span>

            {/* Campana de notificaciones — solo admin */}
            {user.role === 'admin' && (
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  title={notifStatus === 'granted' ? 'Centro de notificaciones' : 'Activar notificaciones'}
                  className={`relative p-2 rounded-lg transition-colors ${
                    notifStatus === 'granted'
                      ? 'text-[#B68C5C] hover:bg-amber-50'
                      : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  {notifStatus === 'granted' ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                  {notifStatus !== 'granted' && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  {notifStatus === 'granted' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Panel de notificaciones */}
                {notifPanelOpen && notifStatus === 'granted' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifPanelOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <span className="font-bold text-sm text-gray-800">Centro de notificaciones</span>
                        <button onClick={() => setNotifPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center text-sm text-gray-400">Sin notificaciones aún</div>
                        ) : (
                          notifications.map((n: any) => (
                            <div key={n.id} className={`px-4 py-3 ${n.read ? 'bg-white' : 'bg-amber-50/60'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-xs text-gray-800 leading-tight">{n.title}</span>
                                <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatNotifTime(n.created_at)}</span>
                              </div>
                              {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="border-gray-300 text-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-foreground"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <nav className="hidden md:flex w-56 bg-sidebar border-r border-sidebar-border flex-col shadow-sm">
          <div className="p-4 space-y-1">
            {availableTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar p-4 space-y-1 shadow-xl">
              <div className="mb-4 pb-4 border-b border-sidebar-border">
                <p className="text-sm text-sidebar-foreground/70">
                  {user.name} • {getRoleLabel(user.role)}
                </p>
              </div>
              {availableTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Banner de stock bajo */}
          {lowStockProducts.length > 0 && !dismissedLowStock && user.role !== 'profesional' && (
            <div className="mb-4 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-700">⚠ Stock bajo en {lowStockProducts.length} producto{lowStockProducts.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {lowStockProducts.map(p => `${p.name} (${p.stock} unid.)`).join(' · ')}
                </p>
              </div>
              <button onClick={() => setDismissedLowStock(true)} className="text-orange-400 hover:text-orange-600 text-xs font-bold">✕</button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  )
}