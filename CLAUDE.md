# CLAUDE.md — Nassib Digital

Application de gestion de restaurant pour la chaîne Nassib (Comores).
Développée par **CK Innovation** · Déployée sur **Railway** · Accessible via **nassib.rest**

**CK Innovation**
- Email technique : ckinnov@gmail.com
- Email commercial : info@ckinnovation.fr
- Site : ckinnovation.fr
- Tél. France : +33 9 72 13 07 43 · Maurice : +230 5909 2881 · Comores : +269 431 4366

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, React Router v7, Shadcn/UI, Tailwind CSS, Axios |
| Backend | FastAPI (Python 3.11+) |
| Base de données | MongoDB (Motor async) |
| Auth | JWT (PyJWT + passlib) |
| Paiements | Stripe |
| Déploiement | Railway (2 services : frontend + backend) |
| PWA | manifest.json + sw.js → installable via nassib.rest |

---

## Structure des dossiers

```
nassib-digital-github/
├── frontend/
│   ├── public/
│   │   ├── index.html          # Entrée HTML
│   │   ├── manifest.json       # Config PWA
│   │   ├── sw.js               # Service Worker PWA
│   │   ├── icon-192.png        # Icône PWA
│   │   └── icon-512.png        # Icône PWA
│   └── src/
│       ├── App.js              # Routes principales
│       ├── context/AuthContext.js   # Auth JWT global
│       ├── pages/
│       │   ├── Login.js
│       │   ├── WaiterDashboard.js
│       │   ├── KitchenDashboard.js
│       │   ├── CashierDashboard.js
│       │   ├── AccountingDashboard.js
│       │   ├── AdminDashboard.js
│       │   └── Payment.js
│       ├── components/ui/      # Composants Shadcn
│       └── utils/currency.js  # Conversion KMF/EUR (taux : 491.96775)
├── backend/
│   ├── server.py               # API FastAPI principale
│   ├── requirements.txt
│   └── .env
├── Dockerfile
└── scripts/seed_data.py        # 12 tables + menu initial
```

---

## Déploiement Railway

- URL Railway : `illustrious-success-production-597f.up.railway.app`
- Domaine custom : `nassib.rest` (DNS Dynadot → CNAME `v6q86gto.up.railway.app`)
- Plan : Hobby ($5/mois)
- Port : 8080

## Variables d'environnement

**Backend** (`backend/.env`)
```
MONGO_URL=...
DB_NAME=...
STRIPE_API_KEY=...
JWT_SECRET=...
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=168
```

**Frontend** (`frontend/.env`)
```
REACT_APP_BACKEND_URL=https://illustrious-success-production-597f.up.railway.app
```

---

## Rôles utilisateurs

| Rôle | Dashboard |
|------|-----------|
| `waiter` | WaiterDashboard — tables et commandes |
| `chef` | KitchenDashboard — suivi préparation |
| `cashier` | CashierDashboard — caisse et paiements |
| `accountant` | AccountingDashboard — comptabilité |
| `admin` | AdminDashboard — administration |

---

## Polling temps réel

| Dashboard | Intervalle |
|-----------|------------|
| Serveur | 5 secondes |
| Cuisine | 3 secondes |
| Comptabilité | 10 secondes |

---

## Workflow git

```bash
# Toujours travailler dans :
# C:\Users\Derka\Downloads\CKI_Ondrive26\nassib-digital-github

git add <fichiers>
git commit -m "Description du changement"
git push
# → Railway redéploie automatiquement
```

Identité git : `CK Innovation` / `ckinnov@gmail.com`
