import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogOut, Users, UtensilsCrossed, Table2, Trash2, Edit, Plus, Save } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(true);
  
  // États pour le menu
  const [menuItems, setMenuItems] = useState([]);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Plats',
    available: true
  });
  
  // États pour les tables
  const [tables, setTables] = useState([]);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({
    number: '',
    capacity: 4
  });
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'waiter'
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        axios.get(`${API}/menu`),
        axios.get(`${API}/tables`)
      ]);
      setMenuItems(menuRes.data);
      setTables(tablesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // ========== GESTION MENU ==========
  const openMenuDialog = (item = null) => {
    if (item) {
      setEditingMenuItem(item);
      setMenuForm({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available
      });
    } else {
      setEditingMenuItem(null);
      setMenuForm({
        name: '',
        description: '',
        price: '',
        category: 'Plats',
        available: true
      });
    }
    setIsMenuDialogOpen(true);
  };

  const saveMenuItem = async () => {
    try {
      if (editingMenuItem) {
        await axios.put(`${API}/menu/${editingMenuItem.id}`, menuForm);
        toast.success('Plat modifié !');
      } else {
        await axios.post(`${API}/menu`, menuForm);
        toast.success('Plat ajouté !');
      }
      setIsMenuDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error('Erreur sauvegarde');
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Supprimer ce plat ?')) return;
    try {
      await axios.delete(`${API}/menu/${id}`);
      toast.success('Plat supprimé !');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  // ========== GESTION TABLES ==========
  const openTableDialog = (table = null) => {
    if (table) {
      setEditingTable(table);
      setTableForm({
        number: table.number,
        capacity: table.capacity
      });
    } else {
      setEditingTable(null);
      setTableForm({
        number: '',
        capacity: 4
      });
    }
    setIsTableDialogOpen(true);
  };

  const saveTable = async () => {
    try {
      if (editingTable) {
        await axios.put(`${API}/tables/${editingTable.id}`, { status: editingTable.status });
        toast.success('Table modifiée !');
      } else {
        await axios.post(`${API}/tables`, tableForm);
        toast.success('Table ajoutée !');
      }
      setIsTableDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur sauvegarde');
    }
  };

  const deleteTable = async (id) => {
    if (!window.confirm('Supprimer cette table ?')) return;
    try {
      await axios.delete(`${API}/tables/${id}`);
      toast.success('Table supprimée !');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  // ========== GESTION UTILISATEURS ==========
  const saveUser = async () => {
    try {
      await axios.post(`${API}/auth/register`, userForm);
      toast.success('Utilisateur créé !');
      setIsUserDialogOpen(false);
      setUserForm({ email: '', password: '', name: '', role: 'waiter' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur création');
    }
  };

  const categories = ['Plats', 'Entrées Froides', 'Entrées Chaudes', 'Poissons', 'Fruits de mer', 'Viandes', 'Volailles', 'Pizzas', 'Desserts', 'Boissons', 'Accompagnements'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-rose-600/50 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">
              ADMINISTRATION NASSIB
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Admin: {user?.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-400 hover:text-rose-400"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 h-14 font-bold text-base ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mr-2" />
            MENU ({menuItems.length})
          </Button>
          <Button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 h-14 font-bold text-base ${
              activeTab === 'tables'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Table2 className="w-5 h-5 mr-2" />
            TABLES ({tables.length})
          </Button>
          <Button
            onClick={() => setActiveTab('users')}
            className={`flex-1 h-14 font-bold text-base ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            UTILISATEURS
          </Button>
        </div>

        {/* ========== ONGLET MENU ========== */}
        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion du Menu</h2>
              <Button
                onClick={() => openMenuDialog()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                AJOUTER UN PLAT
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <Card key={item.id} className="bg-slate-900 border-slate-800 hover:border-rose-500/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-50 text-lg">{item.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md font-medium">
                            {item.category}
                          </span>
                          <span className="text-lg font-black text-rose-500 font-mono">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => openMenuDialog(item)}
                          className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => deleteMenuItem(item.id)}
                          className="bg-rose-600 hover:bg-rose-700 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dialog Menu */}
            <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
              <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50 text-xl">
                    {editingMenuItem ? 'Modifier le plat' : 'Ajouter un plat'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Nom du plat</Label>
                    <Input
                      value={menuForm.name}
                      onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      value={menuForm.description}
                      onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Prix (KMF)</Label>
                      <Input
                        type="number"
                        value={menuForm.price}
                        onChange={(e) => setMenuForm({...menuForm, price: parseFloat(e.target.value)})}
                        className="bg-slate-950 border-slate-800 text-slate-50"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Catégorie</Label>
                      <select
                        value={menuForm.category}
                        onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={saveMenuItem}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-12"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    ENREGISTRER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ========== ONGLET TABLES ========== */}
        {activeTab === 'tables' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion des Tables</h2>
              <Button
                onClick={() => openTableDialog()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                AJOUTER UNE TABLE
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map(table => (
                <Card key={table.id} className="bg-slate-900 border-slate-800 p-4">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-black text-slate-50 font-mono">{table.number}</div>
                    <div className="text-sm text-slate-400 mt-1">{table.capacity} personnes</div>
                    <div className={`text-xs font-bold mt-2 ${
                      table.status === 'free' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {table.status === 'free' ? 'Libre' : 'Occupée'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => openTableDialog(table)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-8"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => deleteTable(table.id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Dialog Table */}
            <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50">
                    {editingTable ? 'Modifier la table' : 'Ajouter une table'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Numéro de table</Label>
                    <Input
                      type="number"
                      value={tableForm.number}
                      onChange={(e) => setTableForm({...tableForm, number: parseInt(e.target.value)})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                      disabled={!!editingTable}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Capacité (personnes)</Label>
                    <Input
                      type="number"
                      value={tableForm.capacity}
                      onChange={(e) => setTableForm({...tableForm, capacity: parseInt(e.target.value)})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                      disabled={!!editingTable}
                    />
                  </div>
                  <Button
                    onClick={saveTable}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    ENREGISTRER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ========== ONGLET UTILISATEURS ========== */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion des Utilisateurs</h2>
              <Button
                onClick={() => setIsUserDialogOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                CRÉER UN UTILISATEUR
              </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <p className="text-slate-400 text-center py-8">
                  Fonctionnalité de liste d'utilisateurs à venir
                </p>
              </CardContent>
            </Card>

            {/* Dialog Utilisateur */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50">Créer un utilisateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Nom complet</Label>
                    <Input
                      value={userForm.name}
                      onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Mot de passe</Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      className="bg-slate-950 border-slate-800 text-slate-50"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Rôle</Label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2"
                    >
                      <option value="waiter">Serveur</option>
                      <option value="chef">Cuisinier</option>
                      <option value="accountant">Comptable</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <Button
                    onClick={saveUser}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    CRÉER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};
