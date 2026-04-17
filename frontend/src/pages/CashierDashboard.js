import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, CreditCard, FileText, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateStatus = (status) => {
  const translations = {
    'pending': 'En attente',
    'in_progress': 'En préparation',
    'ready': 'Prête',
    'served': 'Servie',
    'completed': 'Terminée',
    'cancelled': 'Annulée'
  };
  return translations[status] || status;
};

export const CashierDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/cashier/orders`);
      setOrders(res.data);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      toast.error('Erreur chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleCashPayment = async (orderId) => {
    setProcessingId(orderId);
    try {
      await axios.post(`${API}/payment/cash`, { order_id: orderId });
      toast.success('Paiement cash enregistré');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur paiement');
    } finally {
      setProcessingId(null);
    }
  };

  const handleInvoice = async (orderId) => {
    try {
      const res = await axios.get(`${API}/orders/${orderId}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_nassib_${orderId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Facture téléchargée');
    } catch (error) {
      toast.error('Erreur génération facture');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern">
      <header className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Caisse — Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.name}</p>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="text-slate-400 hover:text-rose-600"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">À encaisser</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{orders.length}</div>
              <p className="text-xs text-slate-500 mt-2">Commandes en attente</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total à encaisser</CardTitle>
              <CreditCard className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-rose-600">
                {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Toutes tables</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des commandes à encaisser */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-50">Commandes à encaisser</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Aucune commande en attente</p>
                <p className="text-slate-600 text-sm mt-1">Toutes les commandes sont encaissées</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold font-mono text-slate-50">
                            Table {order.table_number}
                          </span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            order.status === 'ready' ? 'bg-green-500/20 text-green-500' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {translateStatus(order.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {order.guests_count} couvert(s) · Serveur : {order.waiter_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono text-rose-600">
                          {formatCurrency(order.total)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Détail des articles */}
                    <div className="border-t border-slate-700 pt-3 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span className="text-slate-300">
                            {item.quantity}x {item.menu_item_name}
                            {item.notes && <span className="text-slate-500 ml-1">({item.notes})</span>}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleCashPayment(order.id)}
                        disabled={processingId === order.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {processingId === order.id ? 'Traitement...' : 'Encaisser cash'}
                      </Button>
                      <Button
                        onClick={() => handleInvoice(order.id)}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Facture PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

