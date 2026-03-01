import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, DollarSign, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des statuts en français
const translateStatus = (status) => {
  const translations = {
    'pending': 'En attente',
    'in_progress': 'En préparation',
    'ready': 'Prête',
    'served': 'Servie',
    'paid': 'Payée',
    'completed': 'Terminée'
  };
  return translations[status] || status;
};

export const AccountingDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/stats/dashboard`),
        axios.get(`${API}/orders`)
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="accounting-loading">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern" data-testid="accounting-dashboard">
      <header className="bg-slate-900 border-b border-slate-800 p-6" data-testid="accounting-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Comptabilité - Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.name}</p>
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

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-grid">
          <Card className="bg-slate-900 border-slate-800" data-testid="total-revenue-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Revenu Total</CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{formatCurrency(stats?.total_revenue || 0)}</div>
              <p className="text-xs text-slate-500 mt-2">Depuis le début</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800" data-testid="today-revenue-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Revenu Aujourd'hui</CardTitle>
              <TrendingUp className="w-4 h-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{formatCurrency(stats?.today_revenue || 0)}</div>
              <p className="text-xs text-slate-500 mt-2">{stats?.today_orders || 0} commandes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800" data-testid="total-orders-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Commandes Totales</CardTitle>
              <ShoppingCart className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{stats?.total_orders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Toutes périodes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800" data-testid="pending-orders-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">En Attente</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{stats?.pending_orders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Commandes actives</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800" data-testid="orders-table">
          <CardHeader>
            <CardTitle className="text-slate-50">Historique des commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">ID</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Table</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Serveur</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Total</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Statut</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Paiement</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map(order => (
                    <tr key={order.id} className="border-b border-slate-800/50" data-testid={`order-row-${order.id}`}>
                      <td className="py-3 text-sm font-mono text-slate-400">{order.id.slice(0, 8)}</td>
                      <td className="py-3 text-sm font-mono font-bold text-slate-50">{order.table_number}</td>
                      <td className="py-3 text-sm text-slate-400">{order.waiter_name}</td>
                      <td className="py-3 text-sm font-mono font-bold text-rose-600">{formatCurrency(order.total)}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          order.status === 'served' ? 'bg-green-500/20 text-green-500' :
                          order.status === 'ready' ? 'bg-blue-500/20 text-blue-500' :
                          order.status === 'in_progress' ? 'bg-amber-500/20 text-amber-500' :
                          order.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                          'bg-amber-500/20 text-amber-500'
                        }`}>
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          order.payment_status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {order.payment_status === 'paid' ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};