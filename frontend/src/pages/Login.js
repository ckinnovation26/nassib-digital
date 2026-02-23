import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ChefHat } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isRegister) {
      const result = await register(email, password, name, role);
      if (result.success) {
        toast.success('Inscription réussie!');
        navigate(getDashboardRoute(role));
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Connexion réussie!');
        const userRole = result.user?.role || 'waiter';
        navigate(getDashboardRoute(userRole));
      } else {
        toast.error(result.error);
      }
    }

    setLoading(false);
  };

  const getDashboardRoute = (userRole) => {
    switch (userRole) {
      case 'chef':
        return '/kitchen';
      case 'accountant':
      case 'admin':
        return '/accounting';
      default:
        return '/waiter';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern flex items-center justify-center p-4" data-testid="login-page">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800" data-testid="login-card">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-rose-600 rounded-md flex items-center justify-center" data-testid="logo">
              <ChefHat className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-slate-50">
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            Système de gestion Nassib
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Nom complet</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-slate-50 focus:ring-rose-600 focus:border-rose-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-300">Rôle</Label>
                  <select
                    id="role"
                    data-testid="role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2 focus:ring-rose-600 focus:border-rose-600"
                  >
                    <option value="waiter">Serveur</option>
                    <option value="chef">Cuisinier</option>
                    <option value="accountant">Comptable</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                data-testid="email-input"
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
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-50 focus:ring-rose-600 focus:border-rose-600"
              />
            </div>
            <Button
              type="submit"
              data-testid="submit-button"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {loading ? 'Chargement...' : isRegister ? "S'inscrire" : 'Se connecter'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              data-testid="toggle-mode-button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-slate-400 hover:text-rose-600"
            >
              {isRegister ? 'Déjà un compte? Se connecter' : "Pas de compte? S'inscrire"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};