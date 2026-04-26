import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const EUR_RATE = 491.96775;

const formatKMF = (amount) => `${Math.round(amount).toLocaleString('fr-FR')} KMF`;
const formatEUR = (amount) => `${(amount / EUR_RATE).toFixed(2).replace('.', ',')} €`;

export const MenuPublic = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Tout');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(`${API}/menu`).then(res => {
      const available = res.data.filter(i => i.available !== false);
      setItems(available);
      const cats = ['Tout', ...new Set(available.map(i => i.category))];
      setCategories(cats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'Tout' || item.category === activeCategory;
    const q = search.toLowerCase().trim();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const grouped = categories.slice(1).reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-rose-600/50 sticky top-0 z-10 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/LOGO NASSIB.jpeg"
              alt="Nassib"
              className="w-12 h-12 object-contain rounded-full border-2 border-rose-600/40"
            />
            <div>
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 leading-tight">
                NASSIB
              </h1>
              <p className="text-xs text-slate-400">Restaurant · Comores</p>
            </div>
          </div>
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Onglets catégories */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-24 text-slate-500">
            <p className="text-lg">Aucun plat trouvé</p>
          </div>
        )}

        {!loading && (
          activeCategory === 'Tout'
            ? Object.entries(grouped).map(([cat, catItems]) => (
                <section key={cat} className="mb-8">
                  <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-rose-600 rounded-full inline-block" />
                    {cat}
                    <span className="text-xs text-slate-500 font-normal">({catItems.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catItems.map(item => <MenuCard key={item.id} item={item} />)}
                  </div>
                </section>
              ))
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(item => <MenuCard key={item.id} item={item} />)}
              </div>
            )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-1">
          <p className="text-slate-400 text-sm font-semibold">Restaurant Nassib — Comores</p>
          <p className="text-slate-600 text-xs">Livraison : +269 332 0308</p>
          <p className="text-slate-700 text-xs mt-2">Powered by CK Innovation</p>
        </div>
      </footer>
    </div>
  );
};

const MenuCard = ({ item }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-rose-600/40 transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/10 flex flex-col">
    {item.image_url && (
      <div className="h-40 overflow-hidden bg-slate-800">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
    )}
    <div className="p-3 flex flex-col flex-1">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-slate-50 text-sm leading-tight">{item.name}</h3>
        <span className="flex-shrink-0 px-2 py-0.5 bg-amber-500/15 text-amber-400 text-xs rounded-md font-medium">
          {item.category}
        </span>
      </div>
      {item.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2 flex-1">{item.description}</p>
      )}
      <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-800">
        <div>
          <div className="text-lg font-black text-rose-500 font-mono leading-tight">
            {formatKMF(item.price)}
          </div>
          <div className="text-xs text-slate-500">≈ {formatEUR(item.price)}</div>
        </div>
        {item.preparation_time && (
          <span className="text-xs text-slate-600">⏱ {item.preparation_time} min</span>
        )}
      </div>
    </div>
  </div>
);
