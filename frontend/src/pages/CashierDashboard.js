import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, CreditCard, FileText, CheckCircle, Clock, History, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateStatus = (status) => {
  const t = { 'ready': 'Prête', 'served': 'Servie', 'completed': 'Terminée' };
  return t[status] || status;
};

export const CashierDashboard = () => {
  const { user, logout, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('encaissement');

  // Filtres historique
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'historique') fetchHistory();
  }, [activeTab, dateFrom, dateTo]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/cashier/orders`);
      setOrders(res.data);
    } catch (error) {
      toast.error('Erreur chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await axios.get(`${API}/cashier/history`, { params });
      setHistory(res.data.orders || []);
      setHistoryStats({ count: res.data.count, total_kmf: res.data.total_kmf, total_eur: res.data.total_eur });
    } catch (error) {
      toast.error('Erreur chargement historique');
    }
  };

  const handleCashPayment = async (orderId) => {
    setProcessingId(orderId);
    try {
      await axios.post(`${API}/payment/cash`, { order_id: orderId });
      toast.success('Paiement cash enregistré');
      await handleInvoice(orderId);
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
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
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

  const resetPeriod = (preset) => {
    const now = new Date();
    const t = now.toISOString().slice(0, 10);
    if (preset === 'today') { setDateFrom(t); setDateTo(t); }
    else if (preset === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      setDateFrom(mon.toISOString().slice(0, 10)); setDateTo(t);
    } else if (preset === 'month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setDateTo(t);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern">
      <header className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Caisse — Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.name}</p>
          </div>
          <Button variant="ghost" onClick={logout} className="text-slate-400 hover:text-rose-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Onglets */}
        <div className="flex gap-2">
          <Button onClick={() => setActiveTab('encaissement')}
            className={`flex-1 h-12 font-bold ${activeTab === 'encaissement' ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <CreditCard className="w-4 h-4 mr-2" />Encaissement ({orders.length})
          </Button>
          <Button onClick={() => setActiveTab('historique')}
            className={`flex-1 h-12 font-bold ${activeTab === 'historique' ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <History className="w-4 h-4 mr-2" />Historique
          </Button>
        </div>

        {/* ===== ENCAISSEMENT ===== */}
        {activeTab === 'encaissement' && (
          <>
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
                  <div className="text-3xl font-bold font-mono text-rose-600">{formatCurrency(orders.reduce((s, o) => s + o.total, 0))}</div>
                  <p className="text-xs text-slate-500 mt-2">Toutes tables</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-slate-50">Commandes à encaisser</CardTitle></CardHeader>
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
                      <div key={order.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold font-mono text-slate-50">Table {order.table_number}</span>
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                order.status === 'ready' ? 'bg-green-500/20 text-green-500' :
                                order.status === 'served' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>{translateStatus(order.status)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{order.guests_count} couvert(s) · Serveur : {order.waiter_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(order.total)}</div>
                            <p className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="border-t border-slate-700 pt-3 mb-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-1">
                              <span className="text-slate-300">{item.quantity}x {item.menu_item_name}</span>
                              <span className="text-slate-400 font-mono">{formatCurrency(item.quantity * item.price)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => handleCashPayment(order.id)} disabled={processingId === order.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold">
                            <CreditCard className="w-4 h-4 mr-2" />
                            {processingId === order.id ? 'Traitement...' : 'Encaisser cash'}
                          </Button>
                          <Button onClick={() => handleInvoice(order.id)} variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <FileText className="w-4 h-4 mr-2" />Facture PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== HISTORIQUE ===== */}
        {activeTab === 'historique' && (
          <>
            {/* Filtre période */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <div className="flex gap-2 flex-wrap">
                    {[['today', "Aujourd'hui"], ['week', 'Cette semaine'], ['month', 'Ce mois']].map(([key, label]) => (
                      <button key={key} onClick={() => resetPeriod(key)}
                        className="px-3 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-500">Du</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none" />
                    <span className="text-xs text-slate-500">au</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none" />
                    <Button onClick={fetchHistory} className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-1">OK</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats période */}
            {historyStats && (
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-mono text-slate-50">{historyStats.count}</div>
                    <p className="text-xs text-slate-500 mt-1">Transactions</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(historyStats.total_kmf)}</div>
                    <p className="text-xs text-slate-500 mt-1">Total KMF</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-mono text-slate-300">{String(historyStats.total_eur?.toFixed(2)).replace('.', ',')} €</div>
                    <p className="text-xs text-slate-500 mt-1">Total EUR</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tableau historique */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-slate-50">Ventes de la période</CardTitle></CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">Aucune vente sur cette période</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Heure</th>
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Table</th>
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Couverts</th>
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Total KMF</th>
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Mode</th>
                          <th className="text-left text-sm font-semibold text-slate-400 pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(order => (
                          <tr key={order.id} className="border-b border-slate-800/50">
                            <td className="py-2 text-sm text-slate-400">{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-2 text-sm font-mono font-bold text-slate-50">{order.table_number}</td>
                            <td className="py-2 text-sm text-slate-400">{order.guests_count}</td>
                            <td className="py-2 text-sm font-mono font-bold text-rose-600">{formatCurrency(order.total)}</td>
                            <td className="py-2 text-sm text-slate-400 uppercase">{order.payment_method || 'cash'}</td>
                            <td className="py-2 text-sm text-slate-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};
