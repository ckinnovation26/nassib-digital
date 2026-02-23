import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, Clock, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const KitchenDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data.filter(o => ['pending', 'in_progress'].includes(o.status)));
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status });
      toast.success(`Commande ${status === 'in_progress' ? 'en préparation' : 'prête'}!`);
      fetchOrders();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const getElapsedTime = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now - created) / 1000 / 60);
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="kitchen-loading">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern" data-testid="kitchen-dashboard">
      <header className="bg-slate-900 border-b border-slate-800 p-6" data-testid="kitchen-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Cuisine - Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">Chef: {user?.name}</p>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            data-testid="logout-button"
            className="text-slate-400 hover:text-rose-600"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="orders-grid">
          {orders.map(order => {
            const elapsed = getElapsedTime(order.created_at);
            const isUrgent = elapsed > 15;

            return (
              <Card
                key={order.id}
                data-testid={`kitchen-order-${order.id}`}
                className={`bg-slate-900 border p-6 ${
                  isUrgent ? 'border-rose-600 shadow-lg shadow-rose-600/20' : 'border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-50 font-mono">Table {order.table_number}</div>
                    <div className="text-xs text-slate-400 mt-1">#{order.id.slice(0, 8)}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-mono ${
                    isUrgent ? 'text-rose-600' : 'text-amber-500'
                  }`}>
                    <Clock className="w-4 h-4" />
                    {elapsed} min
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">{item.menu_item_name}</div>
                          <div className="text-2xl font-bold text-rose-600 mt-1">x{item.quantity}</div>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="text-sm text-amber-500 mt-2 italic">Note: {item.notes}</div>
                      )}
                    </div>
                  ))}
                </div>

                {order.status === 'pending' ? (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'in_progress')}
                    data-testid={`start-cooking-${order.id}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
                  >
                    Commencer
                  </Button>
                ) : (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    data-testid={`mark-ready-${order.id}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Prête
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12" data-testid="no-orders">
            <div className="text-slate-400 text-lg">Aucune commande en attente</div>
          </div>
        )}
      </main>
    </div>
  );
};