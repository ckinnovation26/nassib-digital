import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Connexion réussie!');
      const userRole = result.user?.role || 'waiter';
      navigate(getDashboardRoute(userRole));
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const getDashboardRoute = (userRole) => {
    switch (userRole) {
      case 'cook': return '/kitchen';
      case 'accountant': return '/accounting';
      case 'admin': return '/admin';
      default: return '/waiter';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-2">
            <img 
              src="https://illustrious-success-production-597f.up.railway.app/LOGO%20NASSIB.jpeg"
              alt="Logo Nassib"
              className="w-32 h-32 object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-center text-slate-50">Connexion</CardTitle>
          <CardDescription className="text-center text-slate-400">
            Système de gestion Nassib
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-50 focus:ring-rose-600 focus:border-rose-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-50 focus:ring-rose-600 focus:border-rose-600"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {loading ? 'Chargement...' : 'Se connecter'}
            </Button>
            <div className="pt-1 text-center">
              <a
                href="https://guide.nassib.rest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                © CK Innovation — Guide d'installation du logiciel
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
