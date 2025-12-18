import React, { useState, useEffect } from 'react';
import { Stats } from './components/Stats';
import { ProductManager } from './components/ProductManager';
import { BillingPOS } from './components/BillingPOS';
import { CustomerManager } from './components/CustomerManager';
import { Login } from './components/Login';
import { db } from './services/mockDb';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, Settings, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';

type View = 'dashboard' | 'billing' | 'products' | 'customers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      setDbError(null);
      await db.init();
      setIsDbReady(true);
    } catch (err) {
      console.error(err);
      setDbError('Failed to connect to Cloud Database. Please check your internet connection.');
    }
  };

  if (!isDbReady) {
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-6 p-4 text-center">
            {dbError ? (
              <>
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-400">Connection Failed</h2>
                  <p className="text-gray-400 mt-2 max-w-sm">{dbError}</p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <RefreshCcw size={16} /> Retry
                </button>
              </>
            ) : (
              <>
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-gray-400 animate-pulse">Connecting to Cloud Database...</p>
              </>
            )}
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Stats />;
      case 'billing': return <BillingPOS />;
      case 'products': return <ProductManager />;
      case 'customers': return <CustomerManager />;
      default: return <Stats />;
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view 
          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-black/60 px-4 py-3 border-b border-white/10 z-50 print:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-white focus:outline-none">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">WR Smile POS</h1>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white/20 shadow-lg"></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex print:hidden`}> 
        <div className="mb-10 px-2 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            WR Smile POS
          </h1>
          <button className="md:hidden text-white text-2xl" onClick={() => setSidebarOpen(false)}>&times;</button>
        </div>
        <nav className="space-y-2 flex-1">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="billing" icon={ShoppingCart} label="Billing POS" />
          <NavItem view="products" icon={Package} label="Inventory" />
          <NavItem view="customers" icon={Users} label="Customers" />
        </nav>
        <div className="pt-6 border-t border-white/10 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 relative md:ml-64 print:ml-0 print:p-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h2>
            <p className="text-gray-400 text-sm">Welcome back, Admin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
               <p className="text-xs text-gray-500">Shop Contact</p>
               <p className="text-sm font-medium">0719336848</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white/20 shadow-lg"></div>
          </div>
        </header>
        {renderView()}
      </main>
    </div>
  );
}

export default App;
