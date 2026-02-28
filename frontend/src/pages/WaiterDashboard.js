import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, LogOut, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const WaiterDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [loading, setLoading] = useState(true);

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
        c.menu_item_id === item.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
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
    if (table) {
      setSelectedTable(table);
    }
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
        items: cart
      });
      toast.success('Commande créée!');
      setCart([]);
      setSelectedTable(null);
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

  const handlePayment = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    setSelectedOrderForPayment(order);
    setIsPaymentDialogOpen(true);
  };

  const handleCashPayment = async () => {
    if (!selectedOrderForPayment) return;

    try {
      await axios.post(`${API}/payment/cash`, {
        order_id: selectedOrderForPayment.id
      });
      toast.success('Paiement cash enregistré!');
      setIsPaymentDialogOpen(false);
      setSelectedOrderForPayment(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur enregistrement paiement');
    }
  };

  const handleCardPayment = () => {
    if (!selectedOrderForPayment) return;
    setIsPaymentDialogOpen(false);
    navigate(`/payment/${selectedOrderForPayment.id}`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="waiter-loading">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern pb-24" data-testid="waiter-dashboard">
      <header className="bg-slate-900 border-b border-slate-800 p-4" data-testid="waiter-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-50">Nassib</h1>
            <p className="text-sm text-slate-400">Serveur: {user?.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-testid="logout-button"
            className="text-slate-400 hover:text-rose-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <section data-testid="tables-section">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-50">Tables</h2>
            <p className="text-xs text-slate-400">Cliquez sur une table pour commander</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map(table => (
              <Card
                key={table.id}
                data-testid={`table-${table.number}`}
                onClick={() => table.status === 'free' && openOrderDialog(table)}
                className={`p-4 cursor-pointer border transition-colors ${
                  table.status === 'free'
                    ? 'bg-slate-900 border-slate-800 hover:border-rose-600'
                    : 'bg-rose-600/10 border-rose-600/30 cursor-not-allowed'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-50 font-mono">{table.number}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {table.status === 'free' ? 'Libre' : 'Occupée'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section data-testid="orders-section">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-slate-50">Commandes actives</h2>
            <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
              setIsOrderDialogOpen(open);
              if (!open) {
                setSelectedTable(null);
                setCart([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  data-testid="new-order-button"
                  onClick={() => {
                    setSelectedTable(null);
                    setCart([]);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle commande
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800" data-testid="order-dialog">
                <DialogHeader>
                  <DialogTitle className="text-slate-50">Créer une commande</DialogTitle>
                  <DialogDescription className="text-slate-400">Sélectionnez une table et ajoutez des items</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Table</label>
                    <select
                      data-testid="table-select"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2"
                      value={selectedTable?.id || ''}
                      onChange={(e) => setSelectedTable(tables.find(t => t.id === e.target.value))}
                    >
                      <option value="">Sélectionner une table</option>
                      {tables.filter(t => t.status === 'free').map(table => (
                        <option key={table.id} value={table.id}>Table {table.number}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Menu</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto" data-testid="menu-items">
                      {menuItems.filter(item => item.available).map(item => (
                        <Card
                          key={item.id}
                          data-testid={`menu-item-${item.id}`}
                          onClick={() => addToCart(item)}
                          className="p-3 bg-slate-800 border-slate-700 hover:border-rose-600 cursor-pointer transition-colors"
                        >
                          <div className="text-sm font-semibold text-slate-50">{item.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{item.category}</div>
                          <div className="text-sm font-mono text-rose-600 mt-2">{formatCurrency(item.price)}</div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block">Panier</label>
                      <div className="space-y-2" data-testid="cart-items">
                        {cart.map(item => (
                          <div key={item.menu_item_id} className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
                            <div className="text-sm text-slate-50">
                              {item.menu_item_name} x{item.quantity}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-slate-400">{formatCurrency(item.price * item.quantity)}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.menu_item_id)}
                                className="text-rose-600 hover:text-rose-700 h-6 px-2"
                              >
                                ✕
                              </Button>
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
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    disabled={!selectedTable || cart.length === 0}
                  >
                    Créer la commande
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status !== 'completed').map(order => (
              <Card key={order.id} data-testid={`order-${order.id}`} className="bg-slate-900 border-slate-800 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-50 font-mono">Table {order.table_number}</span>
                      <span className={`text-xs px-2 py-1 rounded-md border font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Commande #{order.id.slice(0, 8)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-rose-600">{formatCurrency(order.total)}</div>
                    {order.payment_status === 'paid' && (
                      <div className="text-xs text-green-500 mt-1">✓ Payé</div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-300 flex justify-between">
                      <span>{item.menu_item_name} x{item.quantity}</span>
                      <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {order.status === 'ready' && (
                    <Button
                      onClick={() => markAsServed(order.id)}
                      data-testid={`mark-served-${order.id}`}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Servie
                    </Button>
                  )}
                  {order.status === 'served' && order.payment_status !== 'paid' && (
                    <Button
                      onClick={() => handlePayment(order.id)}
                      data-testid={`pay-button-${order.id}`}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Payer
                    </Button>
                  )}
                  {order.payment_status === 'paid' && order.status !== 'completed' && (
                    <Button
                      onClick={() => markAsCompleted(order.id)}
                      data-testid={`complete-order-${order.id}`}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terminer (Libérer table)
                    </Button>
                  )}
                  {order.status === 'pending' && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-amber-500 text-sm">
                      <Clock className="w-4 h-4" />
                      En attente
                    </div>
                  )}
                  {(order.status === 'in_progress' || order.status === 'served') && order.payment_status !== 'paid' && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-blue-500 text-sm">
                      <Clock className="w-4 h-4" />
                      {order.status === 'in_progress' ? 'En préparation' : 'En cours'}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};