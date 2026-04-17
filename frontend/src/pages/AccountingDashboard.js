import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, DollarSign, ShoppingCart, TrendingUp, Clock, Download, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateStatus = (status) => {
  const t = { 'pending': 'En attente', 'in_progress': 'En préparation', 'ready': 'Prête', 'served': 'Servie', 'paid': 'Payée', 'completed': 'Terminée' };
  return t[status] || status;
};

// Formatage EUR avec virgule comme séparateur décimal
const formatEur = (kmf) => {
  const eur = kmf / 491.96775;
  return eur.toFixed(2).replace('.', ',') + ' €';
};

export const AccountingDashboard = () => {
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtres période
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const [statsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/stats/dashboard`, { params }),
        axios.get(`${API}/accounting/orders`, { params })
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

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await axios.get(`${API}/accounting/export/csv?${params.toString()}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compta_nassib_${dateFrom}_${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch (error) {
      toast.error('Erreur export CSV');
    } finally {
      setExporting(false);
    }
  };

  const resetPeriod = (preset) => {
    const now = new Date();
    const t = now.toISOString().slice(0, 10);
    if (preset === 'today') {
      setDateFrom(t); setDateTo(t);
    } else if (preset === 'week') {
      const mon = new Date(now);
      mon.setDate(now.getDate() - now.getDay() + 1);
      setDateFrom(mon.toISOString().slice(0, 10)); setDateTo(t);
    } else if (preset === 'month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setDateTo(t);
    } else if (preset === 'all') {
      setDateFrom(''); setDateTo('');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Chargement...</div>
    </div>
  );

  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const totalKmf = paidOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern">
      <header className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Comptabilité — Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleExportCSV} disabled={exporting}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium">
              <Download className="w-4 h-4 mr-2" />{exporting ? 'Export...' : 'Export CSV'}
            </Button>
            <Button variant="ghost" onClick={logout} className="text-slate-400 hover:text-rose-600">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Filtre période */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400 font-medium">Période :</span>
              <div className="flex gap-2 flex-wrap">
                {[['today', "Aujourd'hui"], ['week', 'Cette semaine'], ['month', 'Ce mois'], ['all', 'Tout']].map(([key, label]) => (
                  <button key={key} onClick={() => resetPeriod(key)}
                    className="px-3 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500">Du</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-rose-500" />
                <span className="text-xs text-slate-500">au</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Revenu période</CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{formatCurrency(totalKmf)}</div>
              <p className="text-xs text-slate-500 mt-2">{formatEur(totalKmf)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Revenu aujourd'hui</CardTitle>
              <TrendingUp className="w-4 h-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{formatCurrency(stats?.today_revenue || 0)}</div>
              <p className="text-xs text-slate-500 mt-2">{stats?.today_orders || 0} commandes</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Commandes période</CardTitle>
              <ShoppingCart className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{orders.length}</div>
              <p className="text-xs text-slate-500 mt-2">{paidOrders.length} payées</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">En attente</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-slate-50">{stats?.pending_orders || 0}</div>
              <p className="text-xs text-slate-500 mt-2">Commandes actives</p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau commandes */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-50">
              Historique des commandes
              <span className="ml-2 text-sm font-normal text-slate-400">({orders.length} commandes · {formatCurrency(totalKmf)} · {formatEur(totalKmf)})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">ID</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Table</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Serveur</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Total KMF</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Total EUR</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Statut</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Paiement</th>
                    <th className="text-left text-sm font-semibold text-slate-400 pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 50).map(order => (
                    <tr key={order.id} className="border-b border-slate-800/50">
                      <td className="py-3 text-sm font-mono text-slate-400">{order.id.slice(0, 8)}</td>
                      <td className="py-3 text-sm font-mono font-bold text-slate-50">{order.table_number}</td>
                      <td className="py-3 text-sm text-slate-300">{order.waiter_display_name || order.waiter_name}</td>
                      <td className="py-3 text-sm font-mono font-bold text-rose-600">{formatCurrency(order.total)}</td>
                      <td className="py-3 text-sm font-mono text-slate-400">{formatEur(order.total)}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          order.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                          order.status === 'served' ? 'bg-purple-500/20 text-purple-400' :
                          order.status === 'ready' ? 'bg-green-500/20 text-green-500' :
                          order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-500'
                        }`}>
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-slate-500/20 text-slate-400'}`}>
                          {order.payment_status === 'paid' ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {orders.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-700">
                      <td colSpan={3} className="py-3 text-sm font-bold text-slate-300">TOTAL ({paidOrders.length} payées)</td>
                      <td className="py-3 text-sm font-bold font-mono text-rose-500">{formatCurrency(totalKmf)}</td>
                      <td className="py-3 text-sm font-bold font-mono text-slate-300">{formatEur(totalKmf)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
