import React, { useEffect, useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { db } from '../services/mockDb';
import { Bill } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TrendingUp, Users, Package, AlertCircle } from 'lucide-react';

export const Stats: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    todayProfit: 0,
    totalProfit: 0,
    pendingLoans: 0
  });
  const [dbTest, setDbTest] = useState<{ status: 'idle' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        // DB connection test: try to fetch products
        const products = await db.products.getAll();
        if (products && products.length > 0) {
          setDbTest({ status: 'success', message: `Database connected. (${products.length} products found)` });
        } else {
          setDbTest({ status: 'success', message: 'Database connected, but no products found.' });
        }
      } catch (err) {
        setDbTest({ status: 'error', message: 'Database connection failed!' });
      }
      // ...existing code...
      const allBills = await db.bills.getAll();
      const customers = await db.customers.getAll();
      setBills(allBills);

      const today = new Date().toISOString().split('T')[0];
      const todayBills = allBills.filter(b => b.date.startsWith(today));
      
      const totalPending = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

      setStats({
        todaySales: todayBills.reduce((sum, b) => sum + b.total, 0),
        monthSales: allBills.reduce((sum, b) => sum + b.total, 0), 
        todayProfit: todayBills.reduce((sum, b) => sum + b.totalProfit, 0),
        totalProfit: allBills.reduce((sum, b) => sum + b.totalProfit, 0),
        pendingLoans: totalPending
      });
    };
    loadData();
  }, []);

  const chartData = bills.slice(0, 7).reverse().map(b => ({
    name: new Date(b.date).toLocaleDateString(undefined, { weekday: 'short' }),
    sales: b.total,
    profit: b.totalProfit
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Database connection test message */}
      {dbTest.status !== 'idle' && (
        <div className={`p-3 rounded-lg mb-2 text-sm font-semibold ${dbTest.status === 'success' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
          {dbTest.message}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <p className="text-gray-400 text-sm font-medium uppercase">Today's Sales</p>
          <h3 className="text-2xl font-bold mt-1">LKR {stats.todaySales.toLocaleString()}</h3>
          <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> Profit: {stats.todayProfit.toLocaleString()}
          </p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package size={48} />
          </div>
          <p className="text-gray-400 text-sm font-medium uppercase">Total Profit</p>
          <h3 className="text-2xl font-bold mt-1 text-purple-400">LKR {stats.totalProfit.toLocaleString()}</h3>
          <p className="text-gray-500 text-xs mt-2">Lifetime net income</p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={48} />
          </div>
          <p className="text-gray-400 text-sm font-medium uppercase">Pending Loans</p>
          <h3 className="text-2xl font-bold mt-1 text-red-400">LKR {stats.pendingLoans.toLocaleString()}</h3>
          <p className="text-gray-500 text-xs mt-2">Uncollected debt</p>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={48} />
          </div>
          <p className="text-gray-400 text-sm font-medium uppercase">Total Bills</p>
          <h3 className="text-2xl font-bold mt-1">{bills.length}</h3>
          <p className="text-gray-500 text-xs mt-2">Transactions processed</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h4 className="text-lg font-semibold mb-4 text-white/90">Recent Performance</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#82ca9d" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h4 className="text-lg font-semibold mb-4 text-white/90">Recent Transactions</h4>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs uppercase bg-white/5 text-gray-300">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Bill #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 rounded-r-lg">Type</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 5).map(bill => (
                  <tr key={bill.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{bill.invoiceNumber}</td>
                    <td className="px-4 py-3">{bill.customerName}</td>
                    <td className="px-4 py-3 text-right">LKR {bill.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${bill.paymentType === 'LOAN' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                        {bill.paymentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};