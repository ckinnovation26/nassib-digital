import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, LogOut, CheckCircle, Clock, Search, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { Input } from '../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const WaiterDashboard = () => {
  const { user, logout, token } = useAuth();
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [guestsCount, setGuestsCount] = useState(1);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tablesRes, menuRes, ordersRes] = await Promise.all([
        axios.get(`${API}/tables`),
        axios.get(`${API}/menu`),
        axios.get(`${API}/orders`)
      ]);
      setTables(tablesRes.data);
      setMenuItems(menuRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c =>
        c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        price: item.price,
        notes: ''
      }]);
    }
    toast.success(`${item.name} ajouté`);
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.menu_item_id !== itemId));
  };

  const openOrderDialog = (table = null) => {
    if (table) setSelectedTable(table);
    setIsOrderDialogOpen(true);
  };

  const createOrder = async () => {
    if (!selectedTable || cart.length === 0) {
      toast.error('Sélectionnez une table et ajoutez des items');
      return;
    }
    try {
      await axios.post(`${API}/orders`, {
        table_id: selectedTable.id,
        items: cart,
        guests_count: guestsCount
      });
      toast.success('Commande créée!');
      setCart([]);
      setSelectedTable(null);
      setGuestsCount(1);
      setIsOrderDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur création commande');
    }
  };

  const markAsServed = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: 'served' });
      toast.success('Commande servie!');
      fetchData();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const markAsCompleted = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: 'completed' });
      toast.success('Table libérée!');
      fetchData();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      toast.info('Génération du reçu...');
      const response = await axios.get(`${API}/orders/${orderId}/invoice`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_nassib_${orderId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reçu téléchargé !');
    } catch (error) {
      console.error('Erreur téléchargement reçu:', error);
      toast.error('Erreur lors du téléchargement du reçu');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'ready': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'served': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'paid': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'completed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En préparation';
      case 'ready': return 'Prête';
      case 'served': return 'Servie';
      case 'paid': return 'Payée';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const getTableStyle = (table) => {
    switch (table.status) {
      case 'free':
        return 'bg-gradient-to-br from-emerald-900/30 to-slate-900 border-emerald-600/50 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105';
      case 'partial':
        return 'bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105';
      case 'occupied':
        return 'bg-gradient-to-br from-rose-900/30 to-slate-900 border-rose-600/50 cursor-not-allowed opacity-75';
      default:
        return 'bg-gradient-to-br from-rose-900/30 to-slate-900 border-rose-600/50 cursor-not-allowed opacity-75';
    }
  };

  const getTableStatusLabel = (table) => {
    switch (table.status) {
      case 'free':
        return <span className="text-emerald-400">✓ Libre</span>;
      case 'partial':
        return <span className="text-amber-400">◑ Partielle ({table.occupied_seats || 0}/{table.capacity})</span>;
      case 'occupied':
        return <span className="text-rose-400">● Occupée</span>;
      default:
        return <span className="text-rose-400">● Occupée</span>;
    }
  };

  const isTableClickable = (table) => table.status === 'free' || table.status === 'partial';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="waiter-loading">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern pb-24" data-testid="waiter-dashboard">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-rose-600/50 shadow-lg shadow-rose-600/20 p-4" data-testid="waiter-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">NASSIB</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Serveur: {user?.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Tables */}
        <section data-testid="tables-section">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-50">Tables</h2>
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Libre</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Partielle</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>Occupée</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map(table => (
              <Card
                key={table.id}
                data-testid={`table-${table.number}`}
                onClick={() => isTableClickable(table) && openOrderDialog(table)}
                className={`group relative p-6 border-2 transition-all duration-300 overflow-hidden ${getTableStyle(table)} ${isTableClickable(table) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative text-center">
                  <div className="text-4xl font-black text-slate-50 font-mono tracking-wider drop-shadow-lg">{table.number}</div>
                  <div className="text-xs font-bold mt-2 uppercase tracking-wide">{getTableStatusLabel(table)}</div>
                  <div className="text-xs text-slate-500 mt-1">{table.capacity} pers.</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Commandes */}
        <section data-testid="orders-section">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-50">Commandes actives</h2>
            <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
              setIsOrderDialogOpen(open);
              if (!open) { setSelectedTable(null); setCart([]); setGuestsCount(1); setSearchQuery(''); }
            }}>
              <DialogTrigger asChild>
                <Button
                  data-testid="new-order-button"
                  onClick={() => { setSelectedTable(null); setCart([]); setGuestsCount(1); }}
                  className="h-12 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-lg shadow-xl shadow-rose-500/40 transition-all hover:scale-105"
                >
                  <Plus className="w-6 h-6 mr-2" />NOUVELLE COMMANDE
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800" data-testid="order-dialog">
                <DialogHeader>
                  <DialogTitle className="text-slate-50">Créer une commande</DialogTitle>
                  <DialogDescription className="text-slate-400">Sélectionnez une table et ajoutez des items</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">

                  {/* Sélection table — fond sombre corrigé */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block font-semibold">
                      Table {selectedTable ? `✓ ${selectedTable.number} sélectionnée` : '⚠️ SÉLECTIONNEZ UNE TABLE'}
                    </label>
                    <select
                      data-testid="table-select"
                      className="w-full bg-slate-950 border border-slate-700 text-slate-50 rounded-md px-3 py-3 text-base font-medium focus:border-rose-500 focus:outline-none"
                      value={selectedTable?.id || ''}
                      onChange={(e) => {
                        const t = tables.find(t => t.id === e.target.value);
                        setSelectedTable(t);
                        if (t) {
                          const remaining = t.capacity - (t.occupied_seats || 0);
                          setGuestsCount(Math.max(1, Math.min(1, remaining)));
                        }
                      }}
                    >
                      <option value="">⚠️ Sélectionner une table</option>
                      {tables.filter(t => t.status === 'free' || t.status === 'partial').map(table => (
                        <option key={table.id} value={table.id}>
                          Table {table.number} ({table.capacity} pers.
                          {table.status === 'partial' ? ` — ${table.capacity - (table.occupied_seats || 0)} places libres` : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nombre de couverts */}
                  {selectedTable && (
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block font-semibold">
                        Nombre de couverts
                        {selectedTable.status === 'partial' && (
                          <span className="ml-2 text-amber-400 font-normal">
                            (max {selectedTable.capacity - (selectedTable.occupied_seats || 0)} places restantes)
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="ghost" onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))} className="w-10 h-10 text-xl text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg">−</Button>
                        <span className="text-2xl font-black text-slate-50 w-8 text-center">{guestsCount}</span>
                        <Button type="button" variant="ghost"
                          onClick={() => {
                            const maxSeats = selectedTable.capacity - (selectedTable.occupied_seats || 0);
                            setGuestsCount(Math.min(guestsCount + 1, maxSeats));
                          }}
                          className="w-10 h-10 text-xl text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg">+</Button>
                        <span className="text-xs text-slate-500 ml-1">sur {selectedTable.capacity} places</span>
                      </div>
                    </div>
                  )}

                  {/* Menu */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Menu</label>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Rechercher un plat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="menu-search"
                        className="pl-10 bg-slate-950 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-rose-500"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-rose-400">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2" data-testid="menu-items">
                      {menuItems
                        .filter(item => item.available)
                        .filter(item => {
                          if (!searchQuery.trim()) return true;
                          const query = searchQuery.toLowerCase();
                          return item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query));
                        })
                        .map(item => (
                          <Card
                            key={item.id}
                            data-testid={`menu-item-${item.id}`}
                            onClick={() => addToCart(item)}
                            className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 hover:border-rose-500 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-500/20"
                          >
                            {item.image_url && (
                              <div className="h-32 overflow-hidden">
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              </div>
                            )}
                            <div className="p-3">
                              <div className="text-base font-bold text-slate-50 group-hover:text-rose-400 transition-colors">{item.name}</div>
                              <div className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</div>
                              <div className="flex items-center justify-between mt-3">
                                <span className="inline-block px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md font-medium">{item.category}</span>
                                <span className="text-lg font-black text-rose-500 font-mono">{formatCurrency(item.price)}</span>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-5 h-5 text-white" />
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* Panier */}
                  {cart.length > 0 && (
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block">Panier</label>
                      <div className="space-y-2" data-testid="cart-items">
                        {cart.map(item => (
                          <div key={item.menu_item_id} className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
                            <div className="text-sm text-slate-50">{item.menu_item_name} x{item.quantity}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-slate-400">{formatCurrency(item.price * item.quantity)}</span>
                              <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.menu_item_id)} className="text-rose-600 hover:text-rose-700 h-6 px-2">✕</Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                          <span className="text-sm font-semibold text-slate-50">Total</span>
                          <span className="text-lg font-mono font-bold text-rose-600">
                            {formatCurrency(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={createOrder}
                    data-testid="create-order-button"
                    className={`w-full h-14 text-lg font-black ${
                      !selectedTable || cart.length === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-500/30'
                    }`}
                    disabled={!selectedTable || cart.length === 0}
                  >
                    {!selectedTable ? '⚠️ SÉLECTIONNEZ UNE TABLE' : cart.length === 0 ? '⚠️ AJOUTEZ DES ITEMS' : `✓ CRÉER LA COMMANDE (${guestsCount} couvert${guestsCount > 1 ? 's' : ''})`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status !== 'completed').map(order => (
              <Card key={order.id} data-testid={`order-${order.id}`} className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 hover:border-rose-500/50 transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600"></div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-50 font-mono">Table {order.table_number}</span>
                        <span className={`text-xs px-3 py-1.5 rounded-full border-2 font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        #{order.id.slice(0, 8)}
                        {order.guests_count > 0 && (
                          <span className="ml-2 text-amber-400">· {order.guests_count} couvert{order.guests_count > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black font-mono bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                        {formatCurrency(order.total)}
                      </div>
                      {order.payment_status === 'paid' && (
                        <div className="text-xs text-emerald-400 font-bold mt-1">✓ PAYÉ</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-slate-950/50 rounded-lg p-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-slate-300 flex justify-between items-center">
                        <span className="font-medium">{item.menu_item_name} <span className="text-amber-500 font-bold">x{item.quantity}</span></span>
                        <span className="font-mono font-bold text-rose-400">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {/* Serveur voit uniquement : SERVIE quand prête */}
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => markAsServed(order.id)}
                        data-testid={`mark-served-${order.id}`}
                        className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-base shadow-lg shadow-purple-500/30"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />SERVIE
                      </Button>
                    )}

                    {/* Servie et non payée : message "En attente du caissier" */}
                    {order.status === 'served' && order.payment_status !== 'paid' && (
                      <div className="flex-1 h-12 flex items-center justify-center gap-2 text-amber-400 text-sm font-bold bg-amber-500/10 rounded-lg border-2 border-amber-500/30">
                        <Clock className="w-5 h-5" />
                        EN ATTENTE CAISSIER
                      </div>
                    )}

                    {/* Payée : bouton reçu + terminer */}
                    {order.payment_status === 'paid' && order.status !== 'completed' && (
                      <>
                        <Button
                          onClick={() => downloadInvoice(order.id)}
                          data-testid={`invoice-${order.id}`}
                          className="h-12 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold"
                        >
                          <FileText className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={() => markAsCompleted(order.id)}
                          data-testid={`complete-order-${order.id}`}
                          className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-500/30"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />TERMINER
                        </Button>
                      </>
                    )}

                    {order.status === 'pending' && (
                      <div className="flex-1 h-12 flex items-center justify-center gap-2 text-amber-500 text-sm font-bold bg-amber-500/10 rounded-lg border-2 border-amber-500/30">
                        <Clock className="w-5 h-5" />EN ATTENTE
                      </div>
                    )}

                    {order.status === 'in_progress' && (
                      <div className="flex-1 h-12 flex items-center justify-center gap-2 text-blue-400 text-sm font-bold bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
                        <Clock className="w-5 h-5" />EN PRÉPARATION
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
