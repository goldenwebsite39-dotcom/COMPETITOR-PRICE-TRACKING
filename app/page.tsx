"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Cloud, 
  Search, 
  UserCircle, 
  LayoutDashboard, 
  Activity, 
  Zap, 
  BellRing, 
  AlertTriangle, 
  TrendingDown, 
  Package, 
  Gavel,
  Filter,
  Layers,
  User,
  BarChart3,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from '@/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocFromServer, 
  doc 
} from 'firebase/firestore';
import { Product, CompetitorPrice, Alert } from '@/types';

// Firebase Context
interface FirebaseContextType {
  user: FirebaseUser | null;
  isAuthReady: boolean;
  products: Product[];
  competitorPrices: CompetitorPrice[];
  alerts: Alert[];
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test connection
  useEffect(() => {
    if (isAuthReady) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady]);

  // Data Fetching
  useEffect(() => {
    if (user) {
      const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

      const unsubPrices = onSnapshot(collection(db, 'competitor_prices'), (snapshot) => {
        setCompetitorPrices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'competitor_prices'));

      const unsubAlerts = onSnapshot(query(collection(db, 'alerts'), orderBy('timestamp', 'desc')), (snapshot) => {
        setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'alerts'));

      return () => {
        unsubProducts();
        unsubPrices();
        unsubAlerts();
      };
    } else {
      setProducts([]);
      setCompetitorPrices([]);
      setAlerts([]);
    }
  }, [user]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <FirebaseContext.Provider value={{ user, isAuthReady, products, competitorPrices, alerts, signIn, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
}

function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
}

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firebase Error: ${parsed.error} (${parsed.operationType})`;
      } catch (e) {
        errorMessage = this.state.error.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="bg-surface-container p-8 rounded-xl border border-secondary max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-on-surface-variant text-sm mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 kinetic-gradient rounded-lg text-on-primary font-bold uppercase tracking-widest"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Mock Data
const PRICE_HISTORY = [
  { time: '00:00', price: 1650, market: 1680 },
  { time: '04:00', price: 1650, market: 1670 },
  { time: '08:00', price: 1620, market: 1640 },
  { time: '12:00', price: 1620, market: 1630 },
  { time: '16:00', price: 1620, market: 1642 },
  { time: '20:00', price: 1620, market: 1645 },
];

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <DashboardLayout />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}

function DashboardLayout() {
  const { user, isAuthReady, signIn, logout, alerts } = useFirebase();
  const [activeTab, setActiveTab] = useState('alerts');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Cloud className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-container p-12 rounded-2xl border border-outline-variant/20 max-w-md w-full text-center shadow-2xl">
          <Cloud className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="font-headline text-3xl font-bold mb-4 tracking-tight">Golden Cloud</h2>
          <p className="text-on-surface-variant mb-8">Sign in to access the Price Tracking Alert Center.</p>
          <button 
            onClick={signIn}
            className="w-full py-4 kinetic-gradient rounded-xl text-on-primary font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'insights':
        return <InsightsView />;
      case 'engine':
        return <PricingEngineView />;
      case 'alerts':
      default:
        return <AlertsView alerts={alerts} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen w-72 left-0 top-0 fixed bg-surface-container-low z-40 transition-all duration-300",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-10">
            <Cloud className="text-[#0693E3] w-8 h-8" />
            <span className="font-headline font-black italic tracking-tighter text-[#0693E3] text-xl">GOLDEN CLOUD</span>
          </div>
          
          <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-surface-container">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full rounded-full" />
              ) : (
                <User className="text-primary w-5 h-5" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">{user.displayName || 'Admin'}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">System Architect</p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Activity className="w-5 h-5" />} label="Market Insights" active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
            <NavItem icon={<Zap className="w-5 h-5" />} label="Pricing Engine" active={activeTab === 'engine'} onClick={() => setActiveTab('engine')} />
            <NavItem icon={<BellRing className="w-5 h-5" />} label="Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          </nav>
        </div>
        <div className="mt-auto px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant font-mono tracking-widest">v2.4.0</span>
          <button onClick={logout} className="p-2 text-on-surface-variant hover:text-secondary transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 pb-24 md:pb-8",
        isSidebarOpen ? "md:ml-72" : "md:ml-0"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-surface shadow-lg">
          <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Cloud className="text-[#0693E3] w-6 h-6" />
              <h1 className="font-headline font-bold tracking-tight text-2xl text-[#0693E3]">GOLDEN CLOUD</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
                <Search className="w-5 h-5 text-on-surface-variant" />
              </button>
              <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
                <UserCircle className="w-6 h-6 text-[#0693E3]" />
              </button>
            </div>
          </div>
        </header>

        <section className="p-6 max-w-7xl mx-auto space-y-8">
          {renderContent()}
        </section>
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/15 z-50 md:hidden">
        <MobileNavItem icon={<BarChart3 className="w-6 h-6" />} label="Health" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Package className="w-6 h-6" />} label="Products" active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
        <MobileNavItem icon={<Gavel className="w-6 h-6" />} label="Rules" active={activeTab === 'engine'} onClick={() => setActiveTab('engine')} />
        <MobileNavItem icon={<BellRing className="w-6 h-6" />} label="Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
      </nav>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-xl bg-surface-container relative overflow-hidden min-h-[240px]">
          <h2 className="font-headline text-3xl font-bold mb-4">Market Overview</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PRICE_HISTORY}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#97cbff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#97cbff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f4851" vertical={false} />
                <XAxis dataKey="time" stroke="#bfc7d3" fontSize={12} />
                <YAxis stroke="#bfc7d3" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#202020', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#97cbff' }}
                />
                <Area type="monotone" dataKey="price" stroke="#97cbff" fillOpacity={1} fill="url(#colorPrice)" />
                <Area type="monotone" dataKey="market" stroke="#ffb4a8" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <StatCard label="Total Products" value="1,240" trend="+5 new today" color="primary" />
          <StatCard label="Market Share" value="12.4%" trend="+0.8% vs last month" color="primary" />
        </div>
      </div>
    </div>
  );
}

function PricingEngineView() {
  return (
    <div className="space-y-8">
      <h2 className="font-headline text-3xl font-bold">Smart Pricing Engine</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/10">
          <h3 className="text-lg font-bold mb-4">AI Recommendation</h3>
          <div className="p-4 bg-surface-container-highest rounded-lg border-l-4 border-primary">
            <p className="text-sm text-on-surface-variant mb-2">Based on current market volatility and competitor drops:</p>
            <p className="text-xl font-bold text-primary">Suggesting AED 1,599 for RTX 4080</p>
            <p className="text-xs text-on-surface-variant mt-2 italic">"This maintains a 12% margin while beating the current market leader by 1%."</p>
          </div>
          <button className="mt-6 w-full py-3 kinetic-gradient rounded-lg text-on-primary font-bold uppercase tracking-widest">Apply Globally</button>
        </div>
        <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/10">
          <h3 className="text-lg font-bold mb-4">Rule Configuration</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="text-sm">Minimum Margin</span>
              <span className="font-bold text-primary">10%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="text-sm">Competitor Match</span>
              <span className="font-bold text-primary">-1%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsView() {
  const { products, competitorPrices } = useFirebase();

  return (
    <div className="space-y-8">
      <h2 className="font-headline text-3xl font-bold">Market Insights</h2>
      <div className="bg-surface-container rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-highest">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Product</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Your Price</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Amazon</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Noon</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Best Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {products.map(product => {
              const amazonPrice = competitorPrices.find(cp => cp.productId === product.id && cp.competitorName === 'Amazon')?.price;
              const noonPrice = competitorPrices.find(cp => cp.productId === product.id && cp.competitorName === 'Noon')?.price;
              const prices = [product.currentPrice, amazonPrice, noonPrice].filter(p => p !== undefined) as number[];
              const minPrice = Math.min(...prices);
              
              return (
                <tr key={product.id} className="hover:bg-surface-container-highest/50 transition-colors">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className={cn("px-6 py-4 font-bold", product.currentPrice === minPrice && "text-primary")}>
                    AED {product.currentPrice.toLocaleString()}
                  </td>
                  <td className={cn("px-6 py-4", amazonPrice === minPrice && "text-primary font-bold")}>
                    {amazonPrice ? `AED ${amazonPrice.toLocaleString()}` : '-'}
                  </td>
                  <td className={cn("px-6 py-4", noonPrice === minPrice && "text-primary font-bold")}>
                    {noonPrice ? `AED ${noonPrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-primary font-bold">
                    AED {minPrice.toLocaleString()} {product.currentPrice === minPrice ? '(You)' : ''}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsView({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col justify-end p-8 rounded-xl bg-surface-container relative overflow-hidden min-h-[240px]">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
            <img 
              className="w-full h-full object-cover" 
              src="https://picsum.photos/seed/tech/1200/400" 
              alt="Tech Visualization"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10">
            <h2 className="font-headline text-4xl font-bold tracking-tight mb-2">Price Tracking Alert Center</h2>
            <p className="text-on-surface-variant font-body max-w-md">Real-time intelligence on market shifts, competitor movements, and category-wide pricing volatility.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Critical Alerts" value={alerts.filter(a => a.type === 'critical').length.toString()} trend="+12% vs last 24h" color="secondary" />
          <StatCard label="Price Actions" value="24" trend="18 Auto-applied" color="primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <select className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none">
              <option>All Priorities</option>
              <option>Critical Only</option>
              <option>Medium Priority</option>
            </select>
          </div>
          <div className="relative flex-1 md:w-64">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <select className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none">
              <option>All Categories</option>
              <option>GPUs</option>
              <option>Processors</option>
              <option>Storage</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Clear All</button>
          <button className="kinetic-gradient px-6 py-2 rounded-lg text-on-primary font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Create Alert</button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {alerts.map((alert) => (
            <div key={alert.id}>
              <AlertItem alert={alert} />
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="p-12 text-center text-on-surface-variant bg-surface-container rounded-xl">
              No active alerts.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full px-6 py-3 transition-all duration-300 border-l-4",
        active 
          ? "bg-surface-container text-primary border-primary" 
          : "text-on-surface-variant border-transparent hover:bg-surface-container-highest/50"
      )}
    >
      {icon}
      <span className="font-body font-medium text-sm tracking-wide uppercase">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-4 py-1 active:scale-90 transition-transform duration-150",
        active ? "bg-surface-container text-primary rounded-xl" : "text-on-surface-variant"
      )}
    >
      {icon}
      <span className="font-body font-semibold text-[10px] uppercase tracking-widest mt-1">{label}</span>
    </button>
  );
}

function StatCard({ label, value, trend, color }: { label: string, value: string, trend: string, color: 'primary' | 'secondary' }) {
  return (
    <div className={cn(
      "bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border-l-2",
      color === 'primary' ? "border-primary" : "border-secondary"
    )}>
      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{label}</span>
      <div>
        <span className={cn("text-4xl font-headline font-bold", color === 'primary' ? "text-primary" : "text-secondary")}>{value}</span>
        <div className={cn("flex items-center gap-1 text-xs mt-1", color === 'primary' ? "text-primary" : "text-secondary")}>
          <TrendingDown className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: any }) {
  const Icon = alert.type === 'critical' ? AlertTriangle : alert.type === 'market' ? TrendingDown : alert.type === 'inventory' ? Package : Gavel;
  const colorClass = alert.type === 'critical' ? "border-secondary-container text-secondary" : "border-primary text-primary";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex flex-col md:flex-row gap-6 p-6 bg-surface-container border-l-4 hover:bg-surface-container-highest transition-all duration-300 rounded-r-xl",
        colorClass
      )}
    >
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl",
        alert.type === 'critical' ? "bg-secondary-container/20" : "bg-primary/10"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded",
            alert.type === 'critical' ? "bg-secondary-container text-on-secondary-container" : "bg-primary text-on-primary"
          )}>
            {alert.priority}
          </span>
          <span className="text-[11px] font-mono text-on-surface-variant">ID: {alert.id}</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface">{alert.title}</h3>
        <p className="text-sm text-on-surface-variant">{alert.description}</p>
        
        {(alert.marketAvg || alert.volatility) && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-outline-variant/10">
            {alert.marketAvg && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-on-surface-variant uppercase">Market Avg:</span>
                  <span className="text-sm font-bold text-on-surface">AED {alert.marketAvg.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-on-surface-variant uppercase">Your Price:</span>
                  <span className="text-sm font-bold text-primary">AED {alert.yourPrice.toLocaleString()}</span>
                </div>
              </>
            )}
            {alert.volatility && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-on-surface-variant uppercase">Volatility Index:</span>
                <span className="text-sm font-bold text-secondary">High ({alert.volatility})</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex md:flex-col items-center justify-end gap-3 w-full md:w-auto">
        <button className="w-full md:w-32 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-surface-variant transition-colors">Ignore</button>
        <button className="w-full md:w-32 py-2.5 rounded-lg kinetic-gradient text-on-primary text-xs font-bold uppercase tracking-widest shadow-md">
          {alert.type === 'market' ? 'Analyze Trend' : 'Adjust Price'}
        </button>
      </div>
    </motion.div>
  );
}
