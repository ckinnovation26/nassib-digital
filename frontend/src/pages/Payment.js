import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Taux de conversion KMF → EUR
const KMF_TO_EUR_RATE = 491.96775;

const convertKMFtoEUR = (kmf) => {
  return (kmf / KMF_TO_EUR_RATE).toFixed(2);
};

export const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(false);

  useEffect(() => {
    fetchOrder();
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('session_id');
    if (sid) {
      setSessionId(sid);
      pollPaymentStatus(sid);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      toast.error('Commande non trouvée');
      navigate('/waiter');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (sid, attempts = 0) => {
    if (attempts >= 5) {
      setPollingStatus(false);
      toast.error('Délai de vérification dépassé');
      return;
    }

    setPollingStatus(true);

    try {
      const response = await axios.get(`${API}/checkout/status/${sid}`);
      
      if (response.data.payment_status === 'paid') {
        setPollingStatus(false);
        toast.success('Paiement réussi!');
        setTimeout(() => navigate('/waiter'), 2000);
        return;
      }

      if (response.data.status === 'expired') {
        setPollingStatus(false);
        toast.error('Session de paiement expirée');
        return;
      }

      setTimeout(() => pollPaymentStatus(sid, attempts + 1), 2000);
    } catch (error) {
      setPollingStatus(false);
      toast.error('Erreur vérification paiement');
    }
  };

  const initiatePayment = async () => {
    setProcessing(true);

    try {
      const originUrl = window.location.origin;
      const response = await axios.post(`${API}/checkout/session`, {
        order_id: orderId,
        origin_url: originUrl
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erreur lors de la création de la session de paiement';
      toast.error(errorMsg);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="payment-loading">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (pollingStatus) {
    return (
      <div className="min-h-screen bg-slate-950 chiromani-pattern flex items-center justify-center p-4" data-testid="payment-polling">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-12 h-12 animate-spin text-rose-600" />
            </div>
            <CardTitle className="text-slate-50">Vérification du paiement...</CardTitle>
            <CardDescription className="text-slate-400">Veuillez patienter</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (order?.payment_status === 'paid') {
    return (
      <div className="min-h-screen bg-slate-950 chiromani-pattern flex items-center justify-center p-4" data-testid="payment-success">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-slate-50">Paiement réussi!</CardTitle>
            <CardDescription className="text-slate-400">La commande a été payée</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/waiter')}
              data-testid="back-button"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern flex items-center justify-center p-4" data-testid="payment-page">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-50">Paiement</CardTitle>
          <CardDescription className="text-slate-400">Commande #{order?.id.slice(0, 8)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-800 p-4 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Table</span>
              <span className="text-slate-50 font-mono font-bold">{order?.table_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Serveur</span>
              <span className="text-slate-50">{order?.waiter_name}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="space-y-1">
                {order?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-300">{item.menu_item_name} x{item.quantity}</span>
                    <span className="text-slate-300 font-mono">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
              <span className="text-slate-50 font-semibold">Total</span>
              <span className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(order?.total || 0)}</span>
            </div>
          </div>

          <Button
            onClick={initiatePayment}
            disabled={processing}
            data-testid="pay-now-button"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-6 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Payer maintenant
              </>
            )}
          </Button>

          <Button
            onClick={() => navigate('/waiter')}
            variant="ghost"
            data-testid="cancel-payment-button"
            className="w-full text-slate-400 hover:text-slate-300"
          >
            Annuler
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};