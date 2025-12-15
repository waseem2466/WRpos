import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { db } from '../services/mockDb';
import { Customer, Loan, Payment } from '../types';
import { Phone, ArrowUpRight, ArrowLeft, Calendar, DollarSign, Save, History, Edit2, Trash2, X, Check } from 'lucide-react';
import { GlassInput } from './ui/GlassInput';
import { GlassButton } from './ui/GlassButton';

export const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  
  // Detail View State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<(Loan | Payment)[]>([]);
  
  // Default to local date YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: getLocalDate()
  });

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', amount: '' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => setCustomers(await db.customers.getAll());

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    await db.customers.add({
      id: crypto.randomUUID(),
      ...newCustomer,
      totalLoan: 0,
      totalPaid: 0,
      balanceDue: 0
    });
    setNewCustomer({ name: '', phone: '' });
    loadCustomers();
  };

  const openCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await refreshTransactions(customer.id);
  };

  const refreshTransactions = async (customerId: string) => {
    const loans = await db.loans.getByCustomerId(customerId);
    const payments = await db.payments.getByCustomerId(customerId);
    
    // Merge and sort by date descending
    const all = [
        ...loans.map(l => ({ ...l, type: 'LOAN' })), 
        ...payments.map(p => ({ ...p, type: 'PAYMENT' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setTransactions(all as (Loan | Payment)[]);

    // Refresh main customer list and selected customer to update balances in UI
    const allCustomers = await db.customers.getAll();
    setCustomers(allCustomers);
    const updatedCustomer = allCustomers.find(c => c.id === customerId);
    if (updatedCustomer) setSelectedCustomer(updatedCustomer);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentForm.amount) return;

    const amount = Number(paymentForm.amount);
    
    const newPayment: Payment = {
        id: crypto.randomUUID(),
        customerId: selectedCustomer.id,
        amount: amount,
        date: paymentForm.date
    };

    await db.payments.add(newPayment);
    await refreshTransactions(selectedCustomer.id);
    setPaymentForm({ amount: '', date: getLocalDate() });
  };

  // Edit / Delete Handlers
  const startEditing = (t: any) => {
    setEditingId(t.id);
    setEditForm({ 
        date: t.date.split('T')[0], // Ensure YYYY-MM-DD
        amount: t.amount.toString() 
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ date: '', amount: '' });
  };

  const saveEdit = async (t: any) => {
    if (!selectedCustomer) return;

    if (t.type === 'LOAN') {
        const updatedLoan: Loan = {
            id: t.id,
            customerId: t.customerId,
            billId: t.billId,
            amount: Number(editForm.amount),
            date: editForm.date
        };
        await db.loans.update(updatedLoan);
    } else {
        const updatedPayment: Payment = {
            id: t.id,
            customerId: t.customerId,
            amount: Number(editForm.amount),
            date: editForm.date
        };
        await db.payments.update(updatedPayment);
    }

    setEditingId(null);
    await refreshTransactions(selectedCustomer.id);
  };

  const handleDelete = async (t: any) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Are you sure you want to delete this record? This will adjust the customer balance.')) return;

    if (t.type === 'LOAN') {
        await db.loans.delete(t.id);
    } else {
        await db.payments.delete(t.id);
    }
    await refreshTransactions(selectedCustomer.id);
  };

  if (selectedCustomer) {
    return (
        <div className="animate-fade-in space-y-6">
            <button 
                onClick={() => setSelectedCustomer(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} /> Back to Directory
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <GlassCard className="md:col-span-1 h-fit">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
                            {selectedCustomer.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                        <p className="text-gray-400 flex items-center justify-center gap-2 mt-1">
                            <Phone size={14} /> {selectedCustomer.phone}
                        </p>
                    </div>
                    
                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Credit</span>
                            <span className="font-mono">LKR {selectedCustomer.totalLoan.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Paid</span>
                            <span className="font-mono text-green-400">LKR {selectedCustomer.totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className="font-bold">Balance Due</span>
                            <span className={`text-xl font-bold font-mono ${selectedCustomer.balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                LKR {selectedCustomer.balanceDue.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <form onSubmit={handleAddPayment} className="mt-6 space-y-3 pt-6 border-t border-white/10">
                        <h4 className="font-bold flex items-center gap-2 text-sm uppercase text-blue-300">
                             <DollarSign size={16}/> Add Payment
                        </h4>
                        <GlassInput 
                            type="date"
                            value={paymentForm.date}
                            onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                            required
                        />
                        <div className="flex gap-2">
                             <GlassInput 
                                placeholder="Amount (LKR)"
                                type="number"
                                value={paymentForm.amount}
                                onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                                required
                                className="flex-1"
                            />
                            <GlassButton type="submit" className="px-3">
                                <Save size={18} />
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>

                {/* History */}
                <GlassCard className="md:col-span-2">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <History /> Transaction History
                    </h3>
                    <div className="overflow-y-auto max-h-[600px]">
                        {transactions.length === 0 ? (
                            <p className="text-gray-500 text-center py-10">No history found.</p>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs uppercase bg-white/5 text-gray-300 sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-right">Ref</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t: any) => (
                                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            {editingId === t.id ? (
                                                <>
                                                    <td className="px-2 py-3">
                                                        <input 
                                                            type="date" 
                                                            value={editForm.date}
                                                            onChange={e => setEditForm({...editForm, date: e.target.value})}
                                                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white w-full"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {t.type === 'LOAN' ? 'Credit' : 'Payment'}
                                                    </td>
                                                    <td className="px-2 py-3 text-right">
                                                        <input 
                                                            type="number" 
                                                            value={editForm.amount}
                                                            onChange={e => setEditForm({...editForm, amount: e.target.value})}
                                                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white text-right w-24 ml-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs opacity-50">Editing...</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => saveEdit(t)} className="text-green-400 hover:text-green-300"><Check size={16}/></button>
                                                            <button onClick={cancelEditing} className="text-red-400 hover:text-red-300"><X size={16}/></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-mono whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">
                                                        {t.type === 'LOAN' ? (
                                                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs">Credit Bill</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs">Payment</span>
                                                        )}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-bold ${t.type === 'LOAN' ? 'text-red-400' : 'text-green-400'}`}>
                                                        {t.type === 'LOAN' ? '+' : '-'}{Number(t.amount).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs opacity-50">
                                                        {t.billId ? 'Bill #' + t.billId.slice(-4) : 'Manual'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEditing(t)} className="p-1 text-blue-400 hover:text-blue-300"><Edit2 size={14}/></button>
                                                            <button onClick={() => handleDelete(t)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
       <div className="lg:col-span-1">
          <GlassCard>
            <h3 className="text-xl font-bold mb-4">Add Customer</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <GlassInput 
                label="Full Name" 
                value={newCustomer.name} 
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                required
              />
              <GlassInput 
                label="Phone Number" 
                value={newCustomer.phone} 
                onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} 
              />
              <GlassButton type="submit" className="w-full">Create Profile</GlassButton>
            </form>
          </GlassCard>
       </div>

       <div className="lg:col-span-2">
          <GlassCard>
            <h3 className="text-xl font-bold mb-6">Customer Directory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customers.map(customer => (
                <div key={customer.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{customer.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Phone size={12}/> {customer.phone || 'No Phone'}
                      </div>
                    </div>
                    {customer.balanceDue > 0 && (
                      <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs font-bold">
                        DUE
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                    <div>
                      <span className="text-xs text-gray-500 block uppercase">Total Loan</span>
                      <span className="text-gray-300 font-mono">LKR {customer.totalLoan.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block uppercase">Balance Due</span>
                      <span className={`font-mono font-bold ${customer.balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        LKR {customer.balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => openCustomerDetails(customer)}
                    className="w-full mt-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 rounded text-center transition-colors flex justify-center items-center gap-1 opacity-0 group-hover:opacity-100"
                  >
                     View History <ArrowUpRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
       </div>
    </div>
  );
};