import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, Clock, CheckCircle, Timer, AlertTriangle, Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const KitchenDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
      toast.success(status === 'in_progress' ? 'Préparation démarrée !' : 'Commande prête !');
      fetchOrders();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  // Extension timer : envoie extra_minutes au backend
  // Le backend recalcule estimated_preparation_time = temps_déjà_écoulé + extra_minutes
  const extendTimer = async (orderId, extraMinutes) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status: 'in_progress',
        extra_minutes: extraMinutes
      });
      toast.success(`+${extraMinutes} min ajoutées`);
      fetchOrders();
    } catch (error) {
      toast.error('Erreur extension timer');
    }
  };

  const getElapsedTime = (createdAt) => {
    const created = new Date(createdAt);
    return Math.floor((currentTime - created) / 1000 / 60);
  };

  const getRemainingTime = (order) => {
    if (!order.preparation_started_at) return null;
    const started = new Date(order.preparation_started_at);
    const estimatedTime = order.estimated_preparation_time || 15;
    const elapsedSeconds = Math.floor((currentTime - started) / 1000);
    const remainingSeconds = (estimatedTime * 60) - elapsedSeconds;
    return {
      remainingSeconds,
      isOvertime: remainingSeconds < 0,
      percentage: Math.max(0, Math.min(100, (elapsedSeconds / (estimatedTime * 60)) * 100))
    };
  };

  const formatRemainingTime = (remainingSeconds) => {
    const abs = Math.abs(remainingSeconds);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${remainingSeconds < 0 ? '+' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
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
            <h1 className="text-2xl font-bold text-slate-50">Cuisine — Nassib</h1>
            <p className="text-sm text-slate-400 mt-1">Cuisinier: {user?.name}</p>
          </div>
          <Button variant="ghost" onClick={logout} className="text-slate-400 hover:text-rose-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => {
            const elapsed = getElapsedTime(order.created_at);
            const isUrgent = elapsed > 15;
            const remainingInfo = order.status === 'in_progress' ? getRemainingTime(order) : null;
            const maxPrepTime = order.estimated_preparation_time || 15;

            return (
              <Card key={order.id}
                className={`bg-slate-900 border p-6 ${
                  remainingInfo?.isOvertime ? 'border-rose-600 shadow-lg shadow-rose-600/30 animate-pulse' :
                  isUrgent && order.status === 'pending' ? 'border-rose-600 shadow-lg shadow-rose-600/20' :
                  order.status === 'in_progress' ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'
                }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-50 font-mono">Table {order.table_number}</div>
                    <div className="text-xs text-slate-400 mt-1">#{order.id.slice(0, 8)}</div>
                  </div>
                  <div className="text-right">
                    {order.status === 'pending' ? (
                      <div className={`flex items-center gap-1 text-sm font-mono ${isUrgent ? 'text-rose-600' : 'text-amber-500'}`}>
                        <Clock className="w-4 h-4" />{elapsed} min d'attente
                      </div>
                    ) : remainingInfo && (
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1 text-lg font-mono font-bold ${remainingInfo.isOvertime ? 'text-rose-500' : remainingInfo.remainingSeconds < 120 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          <Timer className="w-5 h-5" />
                          {formatRemainingTime(remainingInfo.remainingSeconds)}
                        </div>
                        <div className="text-xs text-slate-400">{remainingInfo.isOvertime ? 'Dépassé !' : 'restant'}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de progression */}
                {order.status === 'in_progress' && remainingInfo && (
                  <div className="mb-4">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${remainingInfo.isOvertime ? 'bg-rose-500' : remainingInfo.percentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, remainingInfo.percentage)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                      <span>0 min</span>
                      <span>{maxPrepTime} min</span>
                    </div>
                  </div>
                )}

                {/* Articles */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">{item.menu_item_name}</div>
                          <div className="text-2xl font-bold text-rose-600 mt-1">x{item.quantity}</div>
                        </div>
                        {item.preparation_time && (
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{item.preparation_time} min
                          </div>
                        )}
                      </div>
                      {item.notes && <div className="text-sm text-amber-500 mt-2 italic">Note: {item.notes}</div>}
                    </div>
                  ))}
                </div>

                {order.status === 'pending' && (
                  <div className="mb-4 p-2 bg-slate-800/50 rounded-md text-center">
                    <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                      <Timer className="w-3 h-3" />Temps estimé : <span className="font-bold text-amber-400">{maxPrepTime} min</span>
                    </div>
                  </div>
                )}

                {/* Boutons extension timer — visibles uniquement en cours de préparation */}
                {order.status === 'in_progress' && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <Plus className="w-3 h-3" />Prolonger (imprévus) :
                    </p>
                    <div className="flex gap-2">
                      {[5, 10, 15].map(min => (
                        <Button key={min} onClick={() => extendTimer(order.id, min)}
                          className="flex-1 h-8 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium border border-slate-600">
                          +{min} min
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {order.status === 'pending' ? (
                  <Button onClick={() => updateOrderStatus(order.id, 'in_progress')}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-6 text-lg">
                    <Timer className="w-5 h-5 mr-2" />Commencer ({maxPrepTime} min)
                  </Button>
                ) : (
                  <Button onClick={() => updateOrderStatus(order.id, 'ready')}
                    className={`w-full font-semibold py-6 text-lg ${remainingInfo?.isOvertime ? 'bg-gradient-to-r from-rose-600 to-rose-700 animate-pulse' : 'bg-gradient-to-r from-green-600 to-green-700'} text-white`}>
                    {remainingInfo?.isOvertime && <AlertTriangle className="w-5 h-5 mr-2" />}
                    <CheckCircle className="w-5 h-5 mr-2" />Prête
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg">Aucune commande en attente</div>
          </div>
        )}
      </main>
    </div>
  );
};
