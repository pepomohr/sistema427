"use client"

import { useState, useMemo } from "react"
import { useClinicStore, calculateCommissionTab } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Award,
  Package,
  Stethoscope,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  Target
} from "lucide-react"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

export function ReportsModule() {
  const { sales, appointments, professionals, products, services, expenses, addExpense, cashClosures } = useClinicStore()
  const [showNeto, setShowNeto] = useState(false)
  const [newExpenseDesc, setNewExpenseDesc] = useState("")
  const [newExpenseAmount, setNewExpenseAmount] = useState("")
  const now = new Date()
  const [closureFilterMonth, setClosureFilterMonth] = useState(now.getMonth())
  const [closureFilterYear, setClosureFilterYear] = useState(now.getFullYear())

  const getAppointmentCommissionBase = (apt: any) => {
    if (!Array.isArray(apt?.services)) return 0
    return apt.services.reduce((sum: number, svc: any) => {
      if (!svc || typeof svc === "string") return sum
      return sum + Number(svc.priceCash ?? svc.price ?? 0)
    }, 0)
  }

  const handleAddExpense = () => {
    if(newExpenseDesc && newExpenseAmount) {
      addExpense({ description: newExpenseDesc, amount: parseFloat(newExpenseAmount) })
      setNewExpenseDesc("")
      setNewExpenseAmount("")
    }
  }

  // Filtra solo turnos del mes actual
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const isThisMonth = (d: Date | string) => {
    const date = new Date(d)
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear
  }

  // Calculate total commissions (solo mes actual)
  const calculateCommissions = useMemo(() => {
    let totalCommissions = 0
    professionals.filter(p => p.id !== 'clau').forEach((prof) => {
      const profAppointments = appointments.filter(
        (a) => a.professionalId === prof.id && a.status === "completado" && isThisMonth(a.date)
      )
      const totalBilled = profAppointments.reduce((sum, a) => sum + getAppointmentCommissionBase(a), 0)
      const commissionPercent = calculateCommissionTab(prof.monthlySalesCount)
      totalCommissions += totalBilled * (commissionPercent / 100)
    })
    return totalCommissions
  }, [professionals, appointments])

  // Real expenses
  const currentMonthExpenses = expenses.filter(e => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const eDate = new Date(e.date);
    return eDate.getMonth() === thisMonth && eDate.getFullYear() === thisYear;
  });
  const fixedCosts = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate daily sales for the last 7 days
  const dailySalesData = useMemo(() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const daySales = sales.filter(
        (s) => s.date.toDateString() === date.toDateString() && s.paymentMethod !== 'gift_card'
      )
      const bruto = daySales.reduce((sum, s) => sum + s.total, 0)
      
      // Calculate daily commission deduction
      const dayAppointments = appointments.filter(
        (a) => a.date.toDateString() === date.toDateString() && a.status === "completado"
      )
      let dayCommissions = 0
      dayAppointments.forEach((apt) => {
        const prof = professionals.find((p) => p.id === apt.professionalId)
        if (prof) {
          const commissionPercent = calculateCommissionTab(prof.monthlySalesCount)
          dayCommissions += getAppointmentCommissionBase(apt) * (commissionPercent / 100)
        }
      })
      
      const dailyFixedCost = fixedCosts / 30 // Approximate daily fixed cost
      const neto = bruto - dayCommissions - dailyFixedCost
      
      data.push({
        name: date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
        bruto,
        neto: Math.max(0, neto),
        comisiones: dayCommissions,
        servicios: daySales
          .filter((s) => s.type === "appointment")
          .reduce((sum, s) => sum + s.total, 0),
        productos: daySales
          .filter((s) => s.type === "direct")
          .reduce((sum, s) => sum + s.total, 0),
      })
    }
    return data
  }, [sales, appointments, professionals, fixedCosts])

  // Calculate services vs products breakdown
  const servicesVsProducts = useMemo(() => {
    const serviciosTotal = sales
      .filter((s) => s.type === "appointment" && s.paymentMethod !== 'gift_card')
      .reduce((sum, s) => sum + s.total, 0)
    const productosTotal = sales
      .filter((s) => s.type === "direct" && s.paymentMethod !== 'gift_card')
      .reduce((sum, s) => sum + s.total, 0)
    
    return [
      { name: "Servicios", value: serviciosTotal, color: "#16A34A" },
      { name: "Productos", value: productosTotal, color: "#8fb87f" },
    ]
  }, [sales])

  // Calculate commissions per professional (solo mes actual)
  const commissionsData = useMemo(() => {
    return professionals.filter(p => p.id !== 'clau').map((prof) => {
      const profAppointments = appointments.filter(
        (a) => a.professionalId === prof.id && a.status === "completado" && isThisMonth(a.date)
      )
      const totalBilled = profAppointments.reduce((sum, a) => sum + getAppointmentCommissionBase(a), 0)
      const commissionPercent = calculateCommissionTab(prof.monthlySalesCount)
      const commission = totalBilled * (commissionPercent / 100)
      return {
        name: prof.name.split(" ").slice(1).join(" ") || prof.shortName,
        facturado: totalBilled,
        comision: commission,
        turnos: profAppointments.length,
        porcentaje: commissionPercent,
      }
    }).sort((a, b) => b.comision - a.comision)
  }, [professionals, appointments])

  // Top selling products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    
    sales.forEach((sale) => {
      sale.items
        .filter((item) => item.type === "product")
        .forEach((item) => {
          if (!productSales[item.itemId]) {
            productSales[item.itemId] = { name: item.itemName, quantity: 0, revenue: 0 }
          }
          productSales[item.itemId].quantity += item.quantity
          productSales[item.itemId].revenue += item.price * item.quantity
        })
    })
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [sales])

  // Top performing services
  const topServices = useMemo(() => {
    const serviceSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    
    sales.forEach((sale) => {
      sale.items
        .filter((item) => item.type === "service")
        .forEach((item) => {
          if (!serviceSales[item.itemId]) {
            serviceSales[item.itemId] = { name: item.itemName, quantity: 0, revenue: 0 }
          }
          serviceSales[item.itemId].quantity += item.quantity
          serviceSales[item.itemId].revenue += item.price * item.quantity
        })
    })
    
    return Object.values(serviceSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [sales])

  // Summary stats
  const todaySalesBruto = sales
    .filter((s) => s.date.toDateString() === new Date().toDateString() && s.paymentMethod !== 'gift_card')
    .reduce((sum, s) => sum + s.total, 0)

  const weekSalesBruto = sales
    .filter((s) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(s.date) >= weekAgo && s.paymentMethod !== 'gift_card'
    })
    .reduce((sum, s) => sum + s.total, 0)

  const monthSalesBruto = sales
    .filter((s) => {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return new Date(s.date) >= monthAgo && s.paymentMethod !== 'gift_card'
    })
    .reduce((sum, s) => sum + s.total, 0)

  // Neto calculations
  const todaySalesNeto = todaySalesBruto - (calculateCommissions / 30) - (fixedCosts / 30)
  const weekSalesNeto = weekSalesBruto - (calculateCommissions / 4) - (fixedCosts / 4)
  const monthSalesNeto = monthSalesBruto - calculateCommissions - fixedCosts

  const todayAppointments = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString() && a.status !== "cancelado"
  ).length

  const completedToday = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString() && a.status === "completado"
  ).length

  // Valores a mostrar segun switch
  const todaySales = showNeto ? Math.max(0, todaySalesNeto) : todaySalesBruto
  const weekSales = showNeto ? Math.max(0, weekSalesNeto) : weekSalesBruto
  const monthSales = showNeto ? Math.max(0, monthSalesNeto) : monthSalesBruto

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-[#16A34A]">Reportes</h2>
        
        {/* Neto/Bruto Switch */}
        <div className="flex items-center gap-4 p-3 bg-card rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${!showNeto ? "text-[#16A34A]" : "text-muted-foreground"}`}>
              Bruto
            </span>
            <Switch
              checked={showNeto}
              onCheckedChange={setShowNeto}
              className="data-[state=checked]:bg-[#16A34A]"
            />
            <span className={`text-sm font-medium ${showNeto ? "text-[#16A34A]" : "text-muted-foreground"}`}>
              Neto
            </span>
          </div>
          {showNeto && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-300 border-orange-500/30 text-xs">
              <Minus className="h-3 w-3 mr-1" />
              Comisiones y Gastos
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Facturacion Hoy {showNeto && "(Neto)"}
                </p>
                <p className="text-2xl font-bold text-[#16A34A]">
                  ${todaySales.toLocaleString()}
                </p>
                {showNeto && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto: ${todaySalesBruto.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-[#16A34A]/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#16A34A]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Facturacion Semana {showNeto && "(Neto)"}
                </p>
                <p className="text-2xl font-bold text-[#16A34A]">
                  ${weekSales.toLocaleString()}
                </p>
                {showNeto && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto: ${weekSalesBruto.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Turnos Hoy</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedToday}/{todayAppointments}
                </p>
                <p className="text-xs text-muted-foreground">completados</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Facturacion Mes {showNeto && "(Neto)"}
                </p>
                <p className="text-2xl font-bold text-[#16A34A]">
                  ${monthSales.toLocaleString()}
                </p>
                {showNeto && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto: ${monthSalesBruto.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Summary (only when Neto is active) */}
      {showNeto && (
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownRight className="h-5 w-5 text-orange-400" />
              <h3 className="font-medium text-foreground">Deducciones del Mes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-card rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground">Comisiones Profesionales</p>
                <p className="text-xl font-bold text-orange-400">
                  -${calculateCommissions.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-card rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground">Gastos Fijos (est.)</p>
                <p className="text-xl font-bold text-orange-400">
                  -${fixedCosts.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-card rounded-lg border border-gray-200">
                <p className="text-sm text-muted-foreground">Total Deducciones</p>
                <p className="text-xl font-bold text-orange-400">
                  -${(calculateCommissions + fixedCosts).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <Tabs defaultValue="facturacion" className="space-y-4">
        <TabsList className="bg-secondary border border-gray-200 h-auto flex flex-wrap justify-start overflow-hidden">
          <TabsTrigger value="facturacion" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Facturacion
          </TabsTrigger>
          <TabsTrigger value="servicios" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Servicios vs Productos
          </TabsTrigger>
          <TabsTrigger value="comisiones" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Liquidación
          </TabsTrigger>
          <TabsTrigger value="objetivos" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Objetivos Staff
          </TabsTrigger>
          <TabsTrigger value="egresos" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Gastos Fijos
          </TabsTrigger>
          <TabsTrigger value="cierres" className="data-[state=active]:bg-[#16A34A] data-[state=active]:text-white">
            Cierres de Caja
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facturacion">
          <Card className="bg-card border-gray-200">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#16A34A]" />
                Facturacion Ultimos 7 Dias {showNeto ? "(Bruto vs Neto)" : "(Servicios vs Productos)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {showNeto ? (
                    <BarChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#5a6852",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      />
                      <Legend />
                      <Bar dataKey="bruto" name="Bruto" fill="#8fb87f" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="neto" name="Neto" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#5a6852",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      />
                      <Legend />
                      <Bar dataKey="servicios" name="Servicios" fill="#16A34A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="productos" name="Productos" fill="#8fb87f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card border-gray-200">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#16A34A]" />
                  Servicios vs Productos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={servicesVsProducts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {servicesVsProducts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#5a6852",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {servicesVsProducts.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-foreground">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ${item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-gray-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#16A34A]" />
                  Productos Mas Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay ventas de productos registradas
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-[#16A34A]">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-foreground font-medium truncate max-w-[150px] md:max-w-[300px]">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.quantity} unidades
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-[#16A34A]">
                          ${product.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-gray-200 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#16A34A]" />
                  Top 10 Servicios Realizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topServices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay servicios registrados
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-[#16A34A]">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-foreground font-medium truncate max-w-[200px]">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.quantity} realizados
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-[#16A34A]">
                          ${service.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comisiones">
          <Card className="bg-card border-gray-200">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-[#16A34A]" />
                Ranking de Comisiones (Monto)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                    <YAxis dataKey="name" type="category" width={100} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#5a6852",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`,
                        name === "facturado" ? "Facturado" : "Comision",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="facturado" name="Facturado" fill="#8fb87f" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="comision" name="Comision" fill="#16A34A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Commission Details Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Profesional</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Turnos</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">%</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Facturado</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Comision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionsData.map((prof, index) => (
                      <tr key={index} className="border-b border-gray-200/50">
                        <td className="py-3 px-2 text-foreground">{prof.name}</td>
                        <td className="py-3 px-2 text-center text-foreground">{prof.turnos}</td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{prof.porcentaje}%</td>
                        <td className="py-3 px-2 text-right text-foreground">
                          ${prof.facturado.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-[#16A34A]">
                          ${prof.comision.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#16A34A]/30">
                      <td colSpan={3} className="py-3 px-2 text-foreground font-medium">Total</td>
                      <td className="py-3 px-2 text-right text-foreground font-medium">
                        ${commissionsData.reduce((sum, p) => sum + p.facturado, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-[#16A34A]">
                        ${commissionsData.reduce((sum, p) => sum + p.comision, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUEVA PESTAÑA PARA ADMIN: VER OBJETIVOS DE TODAS */}
        <TabsContent value="objetivos">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#16A34A] flex items-center gap-2">
              <Target className="h-6 w-6" /> Panel Global de Objetivos del Staff
            </h3>

            {/* RECEPCIÓN */}
            {(() => {
              const profIds = new Set(professionals.map(p => p.id))
              const thisMonth = now.getMonth()
              const thisYear = now.getFullYear()
              const monthSales = sales.filter(s => {
                const d = new Date(s.date)
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear
              })
              // Agrupar por processedBy los productos cuyo soldBy no es un profesional
              const recepMap: Record<string, { count: number, amount: number }> = {}
              monthSales.forEach(sale => {
                const name = sale.processedBy || 'Recepción'
                ;(sale.items || []).forEach((item: any) => {
                  if (
                    item.type === 'product' &&
                    (!item.soldBy || !profIds.has(item.soldBy))
                  ) {
                    if (!recepMap[name]) recepMap[name] = { count: 0, amount: 0 }
                    recepMap[name].count += item.quantity || 1
                    recepMap[name].amount += (item.priceCashReference || item.price || 0) * (item.quantity || 1)
                  }
                })
              })
              const recepEntries = Object.entries(recepMap)
              if (recepEntries.length === 0) return null
              return (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recepción</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recepEntries.map(([name, data]) => {
                      const pct = calculateCommissionTab(data.count)
                      const commission = data.amount * pct / 100
                      const nextTarget = data.count < 21 ? 21 : data.count < 31 ? 31 : 31
                      const progressValue = Math.min((data.count / nextTarget) * 100, 100)
                      const levelLabel = pct === 10 ? 'Nivel 3 — 10%' : pct === 7.5 ? 'Nivel 2 — 7.5%' : pct === 5 ? 'Nivel 1 — 5%' : 'Sin nivel'
                      return (
                        <Card key={name} className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-blue-500">
                                  {name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{name}</p>
                                  <p className="text-xs text-gray-500">Recepción · <span className="font-bold text-gray-800">{data.count} prod.</span></p>
                                </div>
                              </div>
                              <Badge className="bg-blue-50 text-blue-700 border-none px-3 py-1">{levelLabel}</Badge>
                            </div>
                            <div className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                              <div className="flex justify-between text-xs font-medium text-gray-500">
                                <span>${data.amount.toLocaleString('es-AR')} vendidos</span>
                                <span className="font-bold text-blue-600">{data.count} / {nextTarget}</span>
                              </div>
                              <Progress value={progressValue} className="h-2.5 bg-gray-200 [&>div]:bg-blue-500" />
                              {pct > 0 && (
                                <p className="text-xs font-bold text-center text-blue-700 mt-1">
                                  Comisión: ${commission.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* PROFESIONALES */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Profesionales</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionals.filter(p => p.id !== 'clau').map(prof => {
                  const salesCount = prof.monthlySalesCount || 0;
                  const salesAmount = prof.monthlySalesAmount || 0;
                  const pct = calculateCommissionTab(salesCount)
                  const commission = salesAmount * pct / 100
                  const atMaxLevel = salesCount >= 31
                  const nextTarget = salesCount < 21 ? 21 : salesCount < 31 ? 31 : salesCount
                  const progressValue = atMaxLevel ? 100 : Math.min((salesCount / nextTarget) * 100, 100);
                  const levelLabel = pct === 10 ? 'Nivel 3 — 10%' : pct === 7.5 ? 'Nivel 2 — 7.5%' : pct === 5 ? 'Nivel 1 — 5%' : 'Sin nivel'
                  return (
                    <Card key={prof.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: prof.color || '#16A34A' }}>
                              {prof.shortName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{prof.shortName}</p>
                              <p className="text-xs text-gray-500">Profesional · <span className="font-bold text-gray-800">{salesCount} prod.</span></p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-100/50 text-emerald-700 border-none px-3 py-1">{levelLabel}</Badge>
                        </div>
                        <div className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <div className="flex justify-between text-xs font-medium text-gray-500">
                            <span>${salesAmount.toLocaleString('es-AR')} vendidos</span>
                            <span className="font-bold text-emerald-600">{atMaxLevel ? `${salesCount} ✓ máx.` : `${salesCount} / ${nextTarget}`}</span>
                          </div>
                          <Progress value={progressValue} className="h-2.5 bg-gray-200 [&>div]:bg-[#16A34A]" />
                          {pct > 0 && (
                            <p className="text-xs font-bold text-center text-emerald-700 mt-1">
                              Comisión: ${commission.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

          </div>
        </TabsContent>

        <TabsContent value="egresos">
          <Card className="bg-card border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Minus className="h-5 w-5 text-orange-400" />
                Registro de Gastos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="space-y-2 flex-1">
                  <Label>Concepto</Label>
                  <Input 
                    placeholder="Ej. Alquiler, Luz, Insumos" 
                    value={newExpenseDesc} 
                    onChange={e => setNewExpenseDesc(e.target.value)}
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Monto</Label>
                  <Input 
                    type="number"
                    placeholder="$$$"
                    value={newExpenseAmount}
                    onChange={e => setNewExpenseAmount(e.target.value)}
                    className="bg-input"
                  />
                </div>
                <div className="flex items-end flex-initial">
                  <Button onClick={handleAddExpense} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-10">
                    Anotar Gasto
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-gray-200/50 text-muted-foreground bg-secondary/10">
                    <tr>
                      <th className="py-3 px-4">FECHA</th>
                      <th className="py-3 px-4">CONCEPTO</th>
                      <th className="py-3 px-4 text-right">MONTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMonthExpenses.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-muted-foreground italic">No hay gastos anotados este mes.</td></tr>
                    ) : (
                      currentMonthExpenses.map((e, i) => (
                        <tr key={i} className="border-b border-gray-200/20 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">{new Date(e.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-medium text-foreground">{e.description}</td>
                          <td className="py-3 px-4 text-right font-bold text-orange-400">-${e.amount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                    {currentMonthExpenses.length > 0 && (
                      <tr className="bg-orange-500/10">
                        <td colSpan={2} className="py-3 px-4 font-bold text-foreground text-right">TOTAL GASTOS FIJOS:</td>
                        <td className="py-3 px-4 text-right font-bold text-orange-400">-${fixedCosts.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cierres">
          <Card className="bg-card border-gray-200">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                Cierres de Caja por Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de mes */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const label = new Date(closureFilterYear, i, 1).toLocaleDateString("es-AR", { month: "short" })
                  const isActive = closureFilterMonth === i
                  return (
                    <Button
                      key={i}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setClosureFilterMonth(i)}
                      className={`font-bold capitalize ${isActive ? "bg-[#16A34A] text-white" : "border-gray-300 text-black"}`}
                    >
                      {label}
                    </Button>
                  )
                })}
                <Input
                  type="number"
                  value={closureFilterYear}
                  onChange={e => setClosureFilterYear(Number(e.target.value))}
                  className="w-24 h-8 text-sm border-gray-300 text-black font-bold"
                  min={2020}
                  max={2099}
                />
              </div>

              {/* Resumen del mes */}
              {(() => {
                const monthClosures = (cashClosures || []).filter((c: any) => {
                  const d = new Date(c.dateFrom)
                  return d.getMonth() === closureFilterMonth && d.getFullYear() === closureFilterYear
                })
                const monthSalesForPeriod = sales.filter((s: any) => {
                  const d = new Date(s.date)
                  return d.getMonth() === closureFilterMonth && d.getFullYear() === closureFilterYear && s.paymentMethod !== 'gift_card'
                })
                const totalIngresos = monthSalesForPeriod.reduce((sum: number, s: any) => sum + s.total, 0)
                const totalEgresos = expenses.filter((e: any) => {
                  const d = new Date(e.date)
                  return d.getMonth() === closureFilterMonth && d.getFullYear() === closureFilterYear
                }).reduce((sum: number, e: any) => sum + e.amount, 0)
                const totalNeto = totalIngresos - totalEgresos

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-emerald-600 font-bold uppercase">Ingresos</p>
                        <p className="text-xl font-black text-emerald-700">${totalIngresos.toLocaleString()}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-red-500 font-bold uppercase">Egresos</p>
                        <p className="text-xl font-black text-red-600">${totalEgresos.toLocaleString()}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600 font-bold uppercase">Neto</p>
                        <p className={`text-xl font-black ${totalNeto >= 0 ? "text-blue-700" : "text-red-600"}`}>${totalNeto.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Lista de cierres del mes */}
                    {monthClosures.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No hay cierres guardados para este mes.</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {[...monthClosures]
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((c: any) => {
                            const isGeneral = String(c.receptionistName).startsWith("[GENERAL]")
                            const displayName = isGeneral ? String(c.receptionistName).replace("[GENERAL] ", "") : c.receptionistName
                            return (
                              <div key={c.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                    {format(new Date(c.dateFrom), "dd/MM")}
                                  </span>
                                  {isGeneral
                                    ? <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">GENERAL</span>
                                    : <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded truncate">{displayName}</span>
                                  }
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {format(new Date(c.dateFrom), "HH:mm")}→{format(new Date(c.dateTo), "HH:mm")}
                                  </span>
                                  {c.observations && <span className="text-xs text-gray-400 italic truncate">"{c.observations}"</span>}
                                </div>
                                <span className="font-black text-emerald-600 whitespace-nowrap">${c.total.toLocaleString()}</span>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}