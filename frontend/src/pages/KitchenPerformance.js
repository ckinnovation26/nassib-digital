import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, Timer, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Filter, Zap, Turtle, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const KitchenPerformance = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    fetchPerformance();
  }, [dateFrom, dateTo]);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await axios.get(`${API}/kitchen/performance`, { params });
      setData(res.data);
    } catch (error) {
      toast.error('Erreur chargement performance cuisine');
    } finally {
      setLoading(false);
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

  const getScoreColor = (onTimeRate) => {
    if (onTimeRate >= 80) return 'text-emerald-400';
    if (onTimeRate >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreLabel = (onTimeRate) => {
    if (onTimeRate >= 90) return '⭐ Excellent';
    if (onTimeRate >= 80) return '✅ Bon';
    if (onTimeRate >= 60) return '⚠️ Moyen';
    return '🔴 À améliorer';
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Chargement des données cuisine...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern">
      <header className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Performance Cuisine — Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">Admin: {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => window.location.href = '/admin'} className="text-slate-400 hover:text-slate-100">
              <ArrowLeft className="w-5 h-5 mr-1" /> Admin
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
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-rose-500" />
                <span className="text-xs text-slate-500">au</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {!data || data.measured_orders === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Timer className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Aucune donnée de préparation sur cette période.</p>
            <p className="text-sm mt-1 text-slate-600">Les stats apparaissent dès que des commandes ont été préparées.</p>
          </div>
        ) : (
          <>
            {/* Score global */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Score de performance global</p>
                    <div className={`text-5xl font-black font-mono ${getScoreColor(data.on_time_rate)}`}>
                      {data.on_time_rate}%
                    </div>
                    <p className="text-slate-400 text-sm mt-2">{getScoreLabel(data.on_time_rate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">{data.measured_orders} commandes analysées</p>
                    <div className="w-32 h-32 relative">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={data.on_time_rate >= 80 ? '#10b981' : data.on_time_rate >= 60 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="3"
                          strokeDasharray={`${data.on_time_rate} ${100 - data.on_time_rate}`}
                          strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Métriques clés */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400">Temps moyen réel</CardTitle>
                  <Timer className="w-4 h-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-slate-50">{data.avg_real_minutes} min</div>
                  <p className="text-xs text-slate-500 mt-1">Estimé : {data.avg_estimated_minutes} min</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400">Écart moyen</CardTitle>
                  {data.avg_delta_minutes > 0 ? <TrendingUp className="w-4 h-4 text-rose-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono ${data.avg_delta_minutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {data.avg_delta_minutes > 0 ? '+' : ''}{data.avg_delta_minutes} min
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{data.avg_delta_minutes > 0 ? 'En retard en moyenne' : 'En avance en moyenne'}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400">Dans les temps</CardTitle>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {data.measured_orders - data.overtime_count}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">sur {data.measured_orders} commandes</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400">Dépassements</CardTitle>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-rose-400">{data.overtime_count}</div>
                  <p className="text-xs text-slate-500 mt-1">{data.overtime_rate}% des commandes</p>
                </CardContent>
              </Card>
            </div>

            {/* Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.fastest && (
                <Card className="bg-slate-900 border-emerald-800/50 border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Zap className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Commande la plus rapide</p>
                      <p className="text-lg font-bold text-emerald-400 font-mono">{data.fastest.minutes} min</p>
                      <p className="text-xs text-slate-500">Table {data.fastest.table} — #{data.fastest.order_id}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.slowest && (
                <Card className="bg-slate-900 border-rose-800/50 border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Turtle className="w-8 h-8 text-rose-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Commande la plus lente</p>
                      <p className="text-lg font-bold text-rose-400 font-mono">{data.slowest.minutes} min</p>
                      <p className="text-xs text-slate-500">Table {data.slowest.table} — #{data.slowest.order_id}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Détail 20 dernières commandes */}
            {data.details && data.details.length > 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-50 text-base">Détail des 20 dernières commandes préparées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Commande</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Table</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Date</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Estimé</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Réel</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Écart</th>
                          <th className="text-left text-xs font-semibold text-slate-400 pb-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.details].reverse().map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50">
                            <td className="py-2 text-xs font-mono text-slate-400">#{item.order_id}</td>
                            <td className="py-2 text-xs font-mono font-bold text-slate-50">{item.table}</td>
                            <td className="py-2 text-xs text-slate-400">{item.date}</td>
                            <td className="py-2 text-xs text-slate-400">{item.estimated_minutes} min</td>
                            <td className="py-2 text-xs font-mono font-bold text-slate-50">{item.real_minutes} min</td>
                            <td className={`py-2 text-xs font-mono font-bold ${item.delta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {item.delta > 0 ? '+' : ''}{item.delta} min
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.is_overtime ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {item.is_overtime ? 'Retard' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};
