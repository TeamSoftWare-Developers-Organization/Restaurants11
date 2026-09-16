'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components';
import {
  BarChart3,
  Users,
  ShoppingBag,
  TrendingUp,
  Plus
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { orderService } from '@/services/orderService';
import { employeeService } from '@/services/employeeService';

export default function Dashboard() {
  const { isLoggedIn, user } = useAuthStore();
  const { isSidebarCollapsed } = useUIStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [stats, setStats] = useState([
    { label: 'المبيعات', value: '0', unit: 'د.ل', trend: '0%', isPositive: true, icon: TrendingUp, bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
    { label: 'الطلبات', value: '0', trend: '0%', isPositive: true, icon: ShoppingBag, bgColor: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
    { label: 'الموظفون', value: '0', trend: '0%', isPositive: true, icon: Users, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      fetchDashboardData();
    }
  }, [isLoggedIn, router]);

  const fetchDashboardData = async () => {
    try {
      const [orders, employees] = await Promise.all([
        orderService.getOrders(),
        employeeService.getEmployees()
      ]);

      const totalSales = orders.reduce((acc: number, order: any) => acc + order.total_amount, 0);

      setStats([
        { label: 'المبيعات', value: totalSales.toLocaleString(), unit: 'د.ل', trend: '+0%', isPositive: true, icon: TrendingUp, bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
        { label: 'الطلبات', value: orders.length.toString(), trend: '+0%', isPositive: true, icon: ShoppingBag, bgColor: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
        { label: 'الموظفون', value: employees.length.toString(), trend: '0%', isPositive: true, icon: Users, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500' },
      ]);

      // Sort by date and take latest 5
      const sorted = [...orders].sort((a, b) =>
        new Date(b.order_date_time).getTime() - new Date(a.order_date_time).getTime()
      ).slice(0, 5);

      setRecentOrders(sorted);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  if (!isClient || !isLoggedIn) return null;

  return (
    <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
      <Sidebar />

      <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-80'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
        {/* Header - Comfortable */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">نظرة عامة</h1>
              <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold opacity-70">أداء اليوم، مرحباً بك {user?.first_name || 'أدمن'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-card dark:bg-card text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800/40 px-5 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-all font-bold text-xs">التقارير</button>
            <button
              onClick={() => router.push('/pos')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/15 transition-all font-black text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              طلب سريع
            </button>
          </div>
        </header>

        {/* Stats Grid - High Density but comfortable */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-card dark:bg-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 group relative overflow-hidden transition-all hover:shadow-md hover:scale-[1.02]">
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    {stat.trend !== '0%' && (
                      <span className={`flex items-center gap-1 font-bold text-[11px] px-2 py-1 rounded-lg ${stat.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/20'}`}>
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 font-bold mb-1 text-[11px] uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                      {stat.value}
                      {stat.unit && <span className="text-xs font-bold text-gray-400 mr-1 italic">{stat.unit}</span>}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Content - Two Column Comfortable */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900 dark:text-white">آخر الطلبات</h2>
              <button onClick={() => router.push('/orders')} className="text-indigo-600 text-xs font-bold hover:underline">المزيد</button>
            </div>
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-800/40">
                    <th className="px-6 py-3 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الطلب</th>
                    <th className="px-6 py-3 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الطاولة</th>
                    <th className="px-6 py-3 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">المبلغ</th>
                    <th className="px-6 py-3 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none">الحالة</th>
                    <th className="px-6 py-3 text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-none text-center">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                  {recentOrders.length > 0 ? recentOrders.map((order) => {
                    const statusMap: any = {
                      'pending': { label: 'قيد الانتظار', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' },
                      'paid': { label: 'مكتمل', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' },
                      'cancelled': { label: 'ملغي', color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' }
                    };
                    const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-50 text-gray-600' };

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 font-black text-gray-800 dark:text-gray-200">#{order.id}</td>
                        <td className="px-6 py-4 font-semibold text-gray-400 dark:text-gray-500">طاولة {order.table_number || '--'}</td>
                        <td className="px-6 py-4 font-black text-indigo-600 italic">
                          {order.total_amount} <span className="text-[10px] not-italic mr-0.5">د.ل</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-[11px] font-black ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 font-semibold text-xs text-center tabular-nums">
                          {new Date(order.order_date_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-bold italic">لا توجد طلبات مؤخراً</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
              <TrendingUp className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 group-hover:scale-125 transition-transform duration-700" />
              <h3 className="text-lg font-black mb-1 relative z-10">الأداء النمو</h3>
              <p className="text-indigo-100 font-semibold text-xs mb-4 relative z-10 leading-relaxed opacity-90 italic">النمو مرتفع بنسبة 15%. استمر في العمل الرائع!</p>
              <button
                onClick={() => router.push('/pos')}
                className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl font-black text-xs hover:bg-white text-white hover:text-indigo-600 transition-all relative z-10 uppercase"
              >
                التفاصيل
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
