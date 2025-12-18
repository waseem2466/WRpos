import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { GlassInput } from './ui/GlassInput';
import { GlassButton } from './ui/GlassButton';
import { db } from '../services/mockDb';
import { Product, MarginType } from '../types';
import { Edit2, Trash2, Plus } from 'lucide-react';

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    marginType: MarginType.FIXED,
    transportCost: 0,
    marginValue: 0,
    cost: 0,
    customPrice: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await db.products.getAll();
    setProducts(data);
  };

  const calculatePricing = (data: Partial<Product>) => {
    const cost = Number(data.cost) || 0;
    const transport = Number(data.transportCost) || 0;
    const totalCost = cost + transport;
    const margin = Number(data.marginValue) || 0;
    let selling = 0;
    if (data.customPrice && !isNaN(Number(data.customPrice)) && Number(data.customPrice) > 0) {
      selling = Number(data.customPrice);
    } else if (data.marginType === MarginType.FIXED) {
      selling = totalCost + margin;
    } else {
      selling = totalCost + (totalCost * (margin / 100));
    }
    return { totalCost, price: Math.ceil(selling) };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: name === 'marginType' || name === 'name' || name === 'category' ? value : Number(value) };
    
    if (["cost", "transportCost", "marginType", "marginValue", "customPrice"].includes(name)) {
      const { totalCost, price } = calculatePricing(updated);
      updated.totalCost = totalCost;
      updated.price = price;
    }
    
    setFormData(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cost) return;

    const product = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
    } as Product;

    if (formData.id) {
      await db.products.update(product);
    } else {
      await db.products.add(product);
    }
    
    setFormData({ marginType: MarginType.FIXED, transportCost: 0, marginValue: 0, cost: 0 });
    setIsEditing(false);
    loadProducts();
  };

  const handleEdit = (product: Product) => {
    setFormData(product);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await db.products.delete(id);
      loadProducts();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1">
        <GlassCard className="sticky top-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Plus className="text-blue-400" /> {isEditing ? 'Edit Product' : 'New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput name="name" label="Product Name" value={formData.name || ''} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
               <GlassInput name="category" label="Category" value={formData.category || ''} onChange={handleChange} />
               <GlassInput name="stock" label="Stock Qty" type="number" value={formData.stock || ''} onChange={handleChange} required />
            </div>
            
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Costing</h4>
              <div className="grid grid-cols-2 gap-4">
                <GlassInput name="cost" label="Cost Price" type="number" value={formData.cost || ''} onChange={handleChange} required />
                <GlassInput name="transportCost" label="Transport" type="number" value={formData.transportCost || ''} onChange={handleChange} />
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                <span className="text-gray-400">Total Cost:</span>
                <span className="text-yellow-400 font-mono font-bold">LKR {formData.totalCost?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Pricing Logic</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input 
                    type="radio" 
                    name="marginType" 
                    value={MarginType.FIXED}
                    checked={formData.marginType === MarginType.FIXED}
                    onChange={handleChange}
                    className="accent-blue-500"
                  /> Fixed
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input 
                    type="radio" 
                    name="marginType" 
                    value={MarginType.PERCENTAGE}
                    checked={formData.marginType === MarginType.PERCENTAGE}
                    onChange={handleChange}
                    className="accent-blue-500"
                  /> Percentage (%)
                </label>
              </div>
              <GlassInput 
                name="marginValue" 
                label={formData.marginType === MarginType.FIXED ? "Margin Amount (LKR)" : "Margin Percentage (%)"} 
                type="number" 
                value={formData.marginValue || ''} 
                onChange={handleChange} 
              />
              <GlassInput 
                name="customPrice"
                label="Custom Selling Price (LKR)"
                type="number"
                value={formData.customPrice || ''}
                onChange={handleChange}
                placeholder="Override calculated price"
              />
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                <span className="text-gray-400">Selling Price:</span>
                <span className="text-green-400 font-mono font-bold text-lg">LKR {formData.price?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <GlassButton type="submit" className="flex-1">{isEditing ? 'Update' : 'Save Product'}</GlassButton>
              {isEditing && (
                <GlassButton type="button" variant="secondary" onClick={() => { setIsEditing(false); setFormData({ marginType: MarginType.FIXED }); }}>
                  Cancel
                </GlassButton>
              )}
            </div>
          </form>
        </GlassCard>
      </div>

      <div className="lg:col-span-2">
        <GlassCard>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Inventory ({products.length})</h3>
            <GlassInput placeholder="Search products..." className="w-64" />
          </div>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs uppercase bg-white/5 text-gray-300 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Selling</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.category}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{p.totalCost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-green-400">{p.price.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${p.stock < 10 ? 'text-red-400' : ''}`}>{p.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)} className="p-1 hover:text-blue-400"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 hover:text-red-400"><Trash2 size={16}/></button>
                      </div>
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