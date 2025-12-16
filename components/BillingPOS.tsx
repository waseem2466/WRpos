import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { GlassInput } from './ui/GlassInput';
import { GlassButton } from './ui/GlassButton';
import { db, generateId } from '../services/mockDb';
import { Product, Customer, BillItem, Bill } from '../types';
import { Search, ShoppingCart, Trash, User, Printer, Share2, Plus, X, Save, PackagePlus } from 'lucide-react';

// Shop Configuration
const SHOP_LOGO_URL = 'https://res.cloudinary.com/wrsmile/image/upload/v1765612669/wr_smile_supplies_products/hkp1yeb4c2vcjxzvsenh.webp';
const SHOP_WHATSAPP_NUMBER = '+94719336848';
const SHOP_CONTACT = '0719336848';

export const BillingPOS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<BillItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'LOAN'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [successBill, setSuccessBill] = useState<Bill | null>(null);

  // Manual Item State
  const [isCustomItemMode, setIsCustomItemMode] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '', cost: '', quantity: 1 });

  // New Customer State
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setProducts(await db.products.getAll());
    setCustomers(await db.customers.getAll());
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    // Stock Validation
    if (currentQty + 1 > product.stock) {
      alert(`Insufficient stock! Only ${product.stock} available.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, profit: (item.price - item.cost) * (item.quantity + 1) } : item));
    } else {
      const item: BillItem = {
        productId: product.id,
        name: product.name,
        quantity: 1,
        cost: product.totalCost,
        price: product.price,
        profit: product.price - product.totalCost,
        warranty: false
      };
      setCart([...cart, item]);
    }
  };

  const addCustomItemToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name || !customItem.price) return;

    const price = Number(customItem.price);
    const cost = Number(customItem.cost) || 0; 
    const quantity = Number(customItem.quantity) || 1;

    const item: BillItem = {
      productId: `manual-${Date.now()}`,
      name: customItem.name,
      quantity: quantity,
      cost: cost,
      price: price,
      profit: (price - cost) * quantity,
      warranty: false
    };

    setCart([...cart, item]);
    setCustomItem({ name: '', price: '', cost: '', quantity: 1 });
    setIsCustomItemMode(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.name) return;

    const newCus: Customer = {
      id: generateId(),
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      totalLoan: 0,
      totalPaid: 0,
      balanceDue: 0
    };

    await db.customers.add(newCus);
    await loadData(); // Refresh customers
    setSelectedCustomer(newCus.id);
    setIsNewCustomerMode(false);
    setNewCustomerData({ name: '', phone: '' });
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty < 1) return;
    
    const item = cart[index];
    
    // Find original product to check stock for validation
    // Skip check for manual items (they have manual- prefix)
    if (!item.productId.startsWith('manual-')) {
      const product = products.find(p => p.id === item.productId);
      if (product && qty > product.stock) {
        alert(`Cannot add more. Max stock is ${product.stock}.`);
        return;
      }
    }

    const newCart = [...cart];
    newCart[index].quantity = qty;
    newCart[index].profit = (newCart[index].price - newCart[index].cost) * qty;
    setCart(newCart);
  };

  const toggleWarranty = (index: number) => {
    const newCart = [...cart];
    newCart[index].warranty = !newCart[index].warranty;
    setCart(newCart);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);
    const total = subtotal - discount;
    return { subtotal, totalCost, totalProfit, total };
  };

  const { subtotal, totalCost, totalProfit, total } = calculateTotals();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentType === 'LOAN' && !selectedCustomer) {
      alert("Customer required for LOAN sales");
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);

    const bill: Bill = {
      id: generateId(),
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      customerId: selectedCustomer || null,
      customerName: customer ? customer.name : 'Walk-in Customer',
      items: cart,
      subtotal,
      totalCost,
      totalProfit,
      discount,
      total,
      paymentType
    };

    await db.bills.create(bill);
    setSuccessBill(bill);
    setCart([]);
    setDiscount(0);
    setSearch('');
    
    // Critical: Refresh products to show updated stock
    await loadData();
  };

  // Get customer phone number for WhatsApp
  const getCustomerPhone = () => {
    if (!successBill || !successBill.customerId) return null;
    const customer = customers.find(c => c.id === successBill.customerId);
    return customer?.phone || null;
  };

  // Format phone number for WhatsApp (Sri Lanka +94)
  const formatPhoneForWhatsApp = (phone: string | null): string => {
    if (!phone) return '';
    // Remove any spaces, dashes, or special characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // If starts with 0, replace with +94
    if (cleaned.startsWith('0')) {
      cleaned = '+94' + cleaned.substring(1);
    }
    // If doesn't start with +, add +94
    if (!cleaned.startsWith('+')) {
      cleaned = '+94' + cleaned;
    }
    return cleaned;
  };

  const shareOnWhatsApp = () => {
    if (!successBill) return;

    const customerPhone = getCustomerPhone();
    const formattedPhone = formatPhoneForWhatsApp(customerPhone);

    // Build the bill message with shop logo and details
    const text = `*WR Smile & Supplies*\n` +
      `\n` +
      `Bill No: ${successBill.invoiceNumber}\n` +
      `Date: ${new Date(successBill.date).toLocaleDateString()}\n` +
      `Customer: ${successBill.customerName}\n` +
      `------------------------\n` +
      successBill.items.map(i => `${i.name} x${i.quantity} = LKR ${(i.price * i.quantity).toLocaleString()}`).join('\n') +
      `\n------------------------\n` +
      `Subtotal: LKR ${successBill.subtotal.toLocaleString()}\n` +
      `Discount: LKR ${successBill.discount.toLocaleString()}\n` +
      `*Total: LKR ${successBill.total.toLocaleString()}*\n` +
      `\n` +
      `Payment: ${successBill.paymentType}\n` +
      `------------------------\n` +
      `Shop Contact: ${SHOP_CONTACT}\n` +
      `WhatsApp: ${SHOP_WHATSAPP_NUMBER}\n` +
      `\n` +
      `Shop Logo: ${SHOP_LOGO_URL}\n` +
      `\n` +
      `Thank you for shopping with us!`;

    // If customer has phone, send directly to their number
    // Otherwise, open WhatsApp with text but no recipient
    const whatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (successBill) {
    return (
      <>
        {/* Print-friendly bill section (hidden on screen, visible on print) */}
        <div className="hidden print:block print:p-8 print:bg-white print:text-black print:max-w-lg print:mx-auto print:rounded print:shadow-lg">
          <div className="text-center mb-4">
            {/* Shop Logo */}
            <img
              src={SHOP_LOGO_URL}
              alt="WR Smile & Supplies Logo"
              className="h-16 mx-auto mb-2"
              style={{ maxHeight: '64px', objectFit: 'contain' }}
            />
            <h2 className="text-2xl font-bold">WR Smile & Supplies</h2>
            <div className="text-sm">Shop Contact: {SHOP_CONTACT}</div>
            <div className="text-sm">WhatsApp: {SHOP_WHATSAPP_NUMBER}</div>
            <div className="text-xs">Cloud Edition v1.0</div>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <div>Bill No: <b>{successBill.invoiceNumber}</b></div>
            <div>Date: <b>{new Date(successBill.date).toLocaleDateString()}</b></div>
          </div>
          <div className="mb-2 text-sm">Customer: <b>{successBill.customerName}</b></div>
          <div className="mb-2 text-sm">Payment Type: <b>{successBill.paymentType}</b></div>
          <table className="w-full text-xs border-t border-b border-black mb-2">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1 text-left">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {successBill.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{item.price.toLocaleString()}</td>
                  <td className="py-1 text-right">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between text-sm mb-1">
            <span>Subtotal:</span>
            <span>LKR {successBill.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Discount:</span>
            <span>LKR {successBill.discount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-black pt-1 mb-2">
            <span>Total:</span>
            <span>LKR {successBill.total.toLocaleString()}</span>
          </div>
          <div className="text-center text-xs mt-4">
            <p>Thank you for your purchase!</p>
            <p className="mt-2">Contact us on WhatsApp: {SHOP_WHATSAPP_NUMBER}</p>
          </div>
        </div>

        {/* On-screen success card (hidden on print) */}
        <GlassCard className="max-w-md mx-auto text-center py-12 print:hidden">
          {/* Shop Logo */}
          <img
            src={SHOP_LOGO_URL}
            alt="WR Smile & Supplies Logo"
            className="h-20 mx-auto mb-4"
            style={{ maxHeight: '80px', objectFit: 'contain' }}
          />
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Sale Complete!</h2>
          <p className="text-gray-400 mb-8">Bill #{successBill.invoiceNumber} has been saved.</p>
          <div className="flex gap-4 justify-center">
            <GlassButton onClick={() => window.print()} className="flex items-center gap-2">
              <Printer size={16} /> Print
            </GlassButton>
            <GlassButton onClick={shareOnWhatsApp} className="flex items-center gap-2 bg-[#25D366]/80 hover:bg-[#25D366]/60">
              <Share2 size={16} /> WhatsApp
            </GlassButton>
          </div>
          <button onClick={() => setSuccessBill(null)} className="mt-8 text-sm text-gray-400 hover:text-white underline">
            Start New Sale
          </button>
        </GlassCard>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-[calc(100vh-100px)]">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-4 h-full">
        <GlassCard className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4 sticky top-0 bg-transparent z-10 space-y-3">
             <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsCustomItemMode(!isCustomItemMode)}
                  className={`px-4 rounded-xl border border-white/10 flex items-center gap-2 transition-all ${isCustomItemMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                   {isCustomItemMode ? <X size={20} /> : <PackagePlus size={20} />}
                   <span className="hidden sm:inline">{isCustomItemMode ? 'Cancel' : 'Custom Item'}</span>
                </button>
             </div>

             {/* Custom Item Form Overlay */}
             {isCustomItemMode && (
                <form onSubmit={addCustomItemToCart} className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl animate-fade-in">
                  <h4 className="text-sm font-bold text-blue-300 mb-3 uppercase flex items-center gap-2">
                    <PackagePlus size={16}/> Manual Entry
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                     <GlassInput 
                        placeholder="Item Name" 
                        value={customItem.name}
                        onChange={e => setCustomItem({...customItem, name: e.target.value})}
                        className="md:col-span-1"
                        autoFocus
                        required
                     />
                     <GlassInput 
                        placeholder="Price (LKR)" 
                        type="number"
                        value={customItem.price}
                        onChange={e => setCustomItem({...customItem, price: e.target.value})}
                        required
                     />
                     <GlassInput 
                        placeholder="Cost (Optional)" 
                        type="number"
                        title="Enter Cost Price for accurate profit calculation"
                        value={customItem.cost}
                        onChange={e => setCustomItem({...customItem, cost: e.target.value})}
                     />
                     <div className="flex gap-2">
                        <GlassInput 
                            placeholder="Qty" 
                            type="number"
                            value={customItem.quantity}
                            onChange={e => setCustomItem({...customItem, quantity: Number(e.target.value)})}
                            className="w-20"
                        />
                        <GlassButton type="submit" className="flex-1">Add</GlassButton>
                     </div>
                  </div>
                </form>
             )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto p-1">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="flex flex-col text-left p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                <span className="font-semibold text-sm line-clamp-2 h-10">{product.name}</span>
                <span className="text-xs text-gray-400 mt-1">{product.category}</span>
                <div className="mt-auto pt-3 flex justify-between items-end">
                  <span className="text-green-400 font-bold font-mono">LKR {product.price}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.stock > 10 ? 'bg-gray-700 text-gray-300' : 'bg-red-500/20 text-red-300'}`}>
                    Qty: {product.stock}
                  </span>
                </div>
                {/* Hover effect to show add icon */}
                <div className="absolute inset-0 bg-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="text-white drop-shadow-md" />
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Cart & Checkout */}
      <div className="lg:col-span-1 h-full flex flex-col">
        <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-blue-500/20">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Current Bill</h3>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">{cart.length} Items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <ShoppingCart size={48} className="mb-2" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="font-mono text-sm">LKR {item.price * item.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                       <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">-</button>
                       <span className="w-4 text-center text-white font-bold">{item.quantity}</span>
                       <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">+</button>
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input type="checkbox" checked={item.warranty} onChange={() => toggleWarranty(idx)} className="rounded bg-white/10 border-white/20" />
                      Warranty
                    </label>
                    <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-300"><Trash size={14}/></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-black/20 backdrop-blur-md border-t border-white/10 space-y-4">
             {/* Customer Select */}
             <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="text-xs text-gray-400 uppercase font-bold">Customer</label>
                   {!isNewCustomerMode && (
                     <button onClick={() => setIsNewCustomerMode(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                       <Plus size={12}/> New
                     </button>
                   )}
                </div>

                {isNewCustomerMode ? (
                  <form onSubmit={handleCreateCustomer} className="space-y-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <GlassInput 
                      placeholder="Name" 
                      value={newCustomerData.name} 
                      onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                      className="text-sm"
                      autoFocus
                    />
                    <GlassInput 
                      placeholder="Phone" 
                      value={newCustomerData.phone} 
                      onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <GlassButton type="submit" className="py-1 text-xs w-full">Save</GlassButton>
                      <button type="button" onClick={() => setIsNewCustomerMode(false)} className="px-3 py-1 bg-white/10 rounded text-xs hover:bg-white/20">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="relative">
                    <select 
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm text-gray-300 appearance-none focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <User className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" size={14} />
                  </div>
                )}
             </div>

             {/* Payment Details */}
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span>LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Discount</span>
                  <input 
                    type="number" 
                    value={discount} 
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 bg-white/5 border border-white/10 rounded text-right px-2 py-0.5 text-xs text-white" 
                  />
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-blue-400">LKR {total.toLocaleString()}</span>
                </div>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={() => setPaymentType('CASH')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${paymentType === 'CASH' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  CASH
                </button>
                <button 
                  onClick={() => setPaymentType('LOAN')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${paymentType === 'LOAN' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  LOAN
                </button>
             </div>

             <GlassButton onClick={handleCheckout} className="w-full py-3 text-lg" disabled={cart.length === 0}>
               COMPLETE SALE
             </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};