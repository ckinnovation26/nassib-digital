import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogOut, Users, UtensilsCrossed, Table2, Trash2, Edit, Plus, Save, Clock, Settings, Upload } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(true);
  const csvInputRef = useRef(null);
  const [importProgress, setImportProgress] = useState(null);
  
  const [menuItems, setMenuItems] = useState([]);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: 'Plats', available: true, preparation_time: 15
  });
  
  const [tables, setTables] = useState([]);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ number: 1, capacity: 4 });
  
  const [users, setUsers] = useState([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'waiter' });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [menuRes, tablesRes, usersRes] = await Promise.all([
        axios.get(`${API}/menu`),
        axios.get(`${API}/tables`),
        axios.get(`${API}/users`, authHeaders)
      ]);
      setMenuItems(menuRes.data);
      setTables(tablesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // ========== IMPORT CSV ==========
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
        else { current += line[i]; }
      }
      cols.push(current.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
      return obj;
    });
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { toast.error('CSV vide ou mal formaté'); return; }
    const valid = rows.filter(r => r.nom && r.prix_kmf);
    if (valid.length === 0) { toast.error('Colonnes requises : nom, prix_kmf'); return; }

    setImportProgress({ done: 0, total: valid.length });
    let success = 0, errors = 0;

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      const prix = parseFloat((row.prix_kmf || '').replace(/[^\d.]/g, ''));
      if (isNaN(prix)) { errors++; setImportProgress({ done: i + 1, total: valid.length }); continue; }
      try {
        await axios.post(`${API}/menu`, {
          name: row.nom,
          description: row.description || '',
          price: prix,
          category: row.categorie || 'Plats',
          available: true,
          preparation_time: parseInt(row.temps_preparation, 10) || 15,
          image_url: row.image_url || null
        }, authHeaders);
        success++;
      } catch { errors++; }
      setImportProgress({ done: i + 1, total: valid.length });
    }

    setImportProgress(null);
    fetchAllData();
    if (errors === 0) toast.success(`✅ ${success} plats importés avec succès !`);
    else toast.warning(`${success} importés, ${errors} erreurs`);
  };

  // ========== MENU ==========
  const openMenuDialog = (item = null) => {
    if (item) {
      setEditingMenuItem(item);
      setMenuForm({ name: item.name, description: item.description || '', price: item.price, category: item.category, available: item.available !== false, preparation_time: item.preparation_time || 15 });
    } else {
      setEditingMenuItem(null);
      setMenuForm({ name: '', description: '', price: '', category: 'Plats', available: true, preparation_time: 15 });
    }
    setIsMenuDialogOpen(true);
  };

  const saveMenuItem = async () => {
    try {
      const data = { ...menuForm, price: parseFloat(menuForm.price), preparation_time: parseInt(menuForm.preparation_time) };
      if (editingMenuItem) { await axios.put(`${API}/menu/${editingMenuItem.id}`, data, authHeaders); toast.success('Plat modifié !'); }
      else { await axios.post(`${API}/menu`, data, authHeaders); toast.success('Plat ajouté !'); }
      setIsMenuDialogOpen(false);
      fetchAllData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur sauvegarde'); }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Supprimer ce plat ?')) return;
    try { await axios.delete(`${API}/menu/${id}`, authHeaders); toast.success('Plat supprimé !'); fetchAllData(); }
    catch { toast.error('Erreur suppression'); }
  };

  // ========== TABLES ==========
  const openTableDialog = (table = null) => {
    if (table) { setEditingTable(table); setTableForm({ number: table.number, capacity: table.capacity }); }
    else { setEditingTable(null); setTableForm({ number: 1, capacity: 4 }); }
    setIsTableDialogOpen(true);
  };

  const saveTable = async () => {
    const number = parseInt(tableForm.number, 10);
    const capacity = parseInt(tableForm.capacity, 10);
    if (isNaN(number) || isNaN(capacity) || number < 1 || capacity < 1) { toast.error('Numéro et capacité invalides'); return; }
    try {
      if (editingTable) { toast.info('Modification non supportée'); }
      else { await axios.post(`${API}/tables`, { number, capacity }, authHeaders); toast.success('Table ajoutée !'); }
      setIsTableDialogOpen(false);
      fetchAllData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur sauvegarde'); }
  };

  const deleteTable = async (id) => {
    if (!window.confirm('Supprimer cette table ?')) return;
    try { await axios.delete(`${API}/tables/${id}`, authHeaders); toast.success('Table supprimée !'); fetchAllData(); }
    catch (error) { toast.error(error.response?.data?.detail || 'Erreur suppression'); }
  };

  // ========== UTILISATEURS ==========
  const openUserDialog = (userItem = null) => {
    if (userItem) { setEditingUser(userItem); setUserForm({ email: userItem.email, password: '', name: userItem.name, role: userItem.role }); }
    else { setEditingUser(null); setUserForm({ email: '', password: '', name: '', role: 'waiter' }); }
    setIsUserDialogOpen(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        const updateData = { name: userForm.name, role: userForm.role };
        if (userForm.password) updateData.password = userForm.password;
        await axios.put(`${API}/users/${editingUser.id}`, updateData, authHeaders);
        toast.success('Utilisateur modifié !');
      } else {
        await axios.post(`${API}/auth/register`, userForm, authHeaders);
        toast.success('Utilisateur créé !');
      }
      setIsUserDialogOpen(false);
      fetchAllData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try { await axios.delete(`${API}/users/${id}`, authHeaders); toast.success('Utilisateur supprimé !'); fetchAllData(); }
    catch (error) { toast.error(error.response?.data?.detail || 'Erreur suppression'); }
  };

  // Rôles : cook (pas chef) pour cohérence backend + cashier ajouté
  const getRoleLabel = (role) => ({
    waiter: 'Serveur',
    cook: 'Cuisinier',
    accountant: 'Comptable',
    admin: 'Administrateur',
    cashier: 'Caissier'
  }[role] || role);

  const getRoleColor = (role) => ({
    waiter: 'bg-blue-500/20 text-blue-400',
    cook: 'bg-amber-500/20 text-amber-400',
    accountant: 'bg-emerald-500/20 text-emerald-400',
    admin: 'bg-rose-500/20 text-rose-400',
    cashier: 'bg-purple-500/20 text-purple-400'
  }[role] || 'bg-slate-500/20 text-slate-400');

  const categories = ['Plats', 'Entrées Froides', 'Entrées Chaudes', 'Poissons', 'Fruits de mer', 'Viandes', 'Volailles', 'Pizzas', 'Desserts', 'Boissons', 'Accompagnements'];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="admin-loading">
      <div className="text-slate-400">Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 chiromani-pattern" data-testid="admin-dashboard">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-rose-600/50 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-amber-600 rounded-xl flex items-center justify-center">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">ADMINISTRATION NASSIB</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">Connecté: {user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="admin-logout-btn" className="text-slate-400 hover:text-rose-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          {[['menu', 'MENU', UtensilsCrossed, menuItems.length], ['tables', 'TABLES', Table2, tables.length], ['users', 'UTILISATEURS', Users, users.length]].map(([tab, label, Icon, count]) => (
            <Button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 h-14 font-bold text-base ${activeTab === tab ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              <Icon className="w-5 h-5 mr-2" />{label} ({count})
            </Button>
          ))}
        </div>

        {/* ===== MENU ===== */}
        {activeTab === 'menu' && (
          <div data-testid="menu-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion du Menu</h2>
              <div className="flex gap-2">
                <input type="file" accept=".csv" ref={csvInputRef} onChange={handleCSVImport} className="hidden" />
                <Button onClick={() => csvInputRef.current?.click()} disabled={!!importProgress} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold">
                  <Upload className="w-5 h-5 mr-2" />
                  {importProgress ? `Import ${importProgress.done}/${importProgress.total}...` : 'IMPORTER CSV'}
                </Button>
                <Button onClick={() => openMenuDialog()} data-testid="add-menu-item-btn" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold">
                  <Plus className="w-5 h-5 mr-2" />AJOUTER UN PLAT
                </Button>
              </div>
            </div>

            {importProgress && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex justify-between text-sm text-blue-400 mb-1">
                  <span>Import en cours...</span>
                  <span>{importProgress.done}/{importProgress.total}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <Card key={item.id} data-testid={`menu-item-${item.id}`} className="bg-slate-900 border-slate-800 hover:border-rose-500/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-50 text-lg">{item.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md font-medium">{item.category}</span>
                          <span className="text-lg font-black text-rose-500 font-mono">{formatCurrency(item.price)}</span>
                          <span className="text-xs text-slate-500">{(item.price / 491.96775).toFixed(2)} €</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-slate-400 text-xs">
                          <Clock className="w-3 h-3" /><span>{item.preparation_time || 15} min</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => openMenuDialog(item)} className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" onClick={() => deleteMenuItem(item.id)} className="bg-rose-600 hover:bg-rose-700 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {menuItems.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun plat dans le menu.</p>
                <p className="text-sm mt-1">Importez le CSV ou ajoutez un plat manuellement.</p>
              </div>
            )}

            <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
              <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50 text-xl flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-rose-500" />
                    {editingMenuItem ? 'Modifier le plat' : 'Ajouter un plat'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">Remplissez les informations du plat</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Nom du plat</Label>
                    <Input value={menuForm.name} onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} placeholder="Ex: Poulet grillé" className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Input value={menuForm.description} onChange={(e) => setMenuForm({...menuForm, description: e.target.value})} placeholder="Description du plat" className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Prix (KMF)</Label>
                      <Input type="number" value={menuForm.price} onChange={(e) => setMenuForm({...menuForm, price: e.target.value})} placeholder="5000" className="bg-slate-950 border-slate-800 text-slate-50" />
                      {menuForm.price && <p className="text-xs text-slate-500 mt-1">{(parseFloat(menuForm.price) / 491.96775).toFixed(2)} €</p>}
                    </div>
                    <div>
                      <Label className="text-slate-300">Catégorie</Label>
                      <select value={menuForm.category} onChange={(e) => setMenuForm({...menuForm, category: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2 h-10">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-300 flex items-center gap-1"><Clock className="w-3 h-3" />Prépa (min)</Label>
                      <Input type="number" min="1" max="120" value={menuForm.preparation_time} onChange={(e) => setMenuForm({...menuForm, preparation_time: e.target.value})} className="bg-slate-950 border-slate-800 text-slate-50" />
                    </div>
                  </div>
                  <Button onClick={saveMenuItem} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12">
                    <Save className="w-5 h-5 mr-2" />ENREGISTRER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ===== TABLES ===== */}
        {activeTab === 'tables' && (
          <div data-testid="tables-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion des Tables</h2>
              <Button onClick={() => openTableDialog()} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold">
                <Plus className="w-5 h-5 mr-2" />AJOUTER UNE TABLE
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map(table => (
                <Card key={table.id} className="bg-slate-900 border-slate-800 p-4">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-black text-slate-50 font-mono">{table.number}</div>
                    <div className="text-sm text-slate-400 mt-1">{table.capacity} personnes</div>
                    <div className={`text-xs font-bold mt-2 ${table.status === 'free' ? 'text-emerald-400' : table.status === 'partial' ? 'text-amber-400' : 'text-rose-400'}`}>
                      {table.status === 'free' ? 'Libre' : table.status === 'partial' ? `Partielle (${table.occupied_seats}/${table.capacity})` : 'Occupée'}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => deleteTable(table.id)} className="w-full bg-rose-600 hover:bg-rose-700 h-8">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </Card>
              ))}
            </div>
            {tables.length === 0 && <div className="text-center py-12 text-slate-400">Aucune table configurée.</div>}

            <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50 flex items-center gap-2"><Table2 className="w-5 h-5 text-rose-500" />Ajouter une table</DialogTitle>
                  <DialogDescription className="text-slate-400">Définissez le numéro et la capacité</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Numéro de table</Label>
                    <Input type="number" min="1" value={tableForm.number} onChange={(e) => setTableForm({...tableForm, number: e.target.value})} className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Capacité (personnes)</Label>
                    <Input type="number" min="1" value={tableForm.capacity} onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})} className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <Button onClick={saveTable} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12">
                    <Save className="w-5 h-5 mr-2" />ENREGISTRER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ===== UTILISATEURS ===== */}
        {activeTab === 'users' && (
          <div data-testid="users-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Gestion des Utilisateurs</h2>
              <Button onClick={() => openUserDialog()} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold">
                <Plus className="w-5 h-5 mr-2" />CRÉER UN UTILISATEUR
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(userItem => (
                <Card key={userItem.id} className="bg-slate-900 border-slate-800 hover:border-rose-500/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-50 text-lg">{userItem.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{userItem.email}</p>
                        <span className={`inline-block px-2 py-1 mt-2 text-xs rounded-md font-medium ${getRoleColor(userItem.role)}`}>{getRoleLabel(userItem.role)}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => openUserDialog(userItem)} className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                        {userItem.id !== user?.id && (
                          <Button size="sm" onClick={() => deleteUser(userItem.id)} className="bg-rose-600 hover:bg-rose-700 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {users.length === 0 && <div className="text-center py-12 text-slate-400">Aucun utilisateur trouvé.</div>}

            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-50 flex items-center gap-2">
                    <Users className="w-5 h-5 text-rose-500" />
                    {editingUser ? "Modifier l'utilisateur" : 'Créer un utilisateur'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {editingUser ? "Modifiez les informations" : 'Remplissez les informations'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Nom complet</Label>
                    <Input value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} placeholder="Chamsoudine AHMED" className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} placeholder="email@nassib.com" disabled={!!editingUser} className="bg-slate-950 border-slate-800 text-slate-50 disabled:opacity-50" />
                  </div>
                  <div>
                    <Label className="text-slate-300">{editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}</Label>
                    <Input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} placeholder="••••••••" className="bg-slate-950 border-slate-800 text-slate-50" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Rôle</Label>
                    <select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-50 rounded-md px-3 py-2">
                      <option value="waiter">Serveur</option>
                      <option value="cook">Cuisinier</option>
                      <option value="accountant">Comptable</option>
                      <option value="cashier">Caissier</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <Button onClick={saveUser} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12">
                    <Save className="w-5 h-5 mr-2" />{editingUser ? 'MODIFIER' : 'CRÉER'}
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
