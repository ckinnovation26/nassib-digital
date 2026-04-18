# 🍽️ Nassib - Système de Gestion de Restaurant

Application web moderne pour la digitalisation complète des opérations de la chaîne de restauration Nassib aux Comores.

## 🎯 Fonctionnalités

### 🔐 Authentification
- Inscription et connexion avec rôles multiples
- 4 rôles disponibles : **Serveur**, **Cuisinier**, **Comptable**, **Admin**
- Authentification JWT sécurisée

### 👨‍🍳 Dashboard Serveur
- Vue en temps réel des tables (libres/occupées)
- Création de commandes avec sélection d'items du menu
- Panier interactif avec calcul automatique du total
- Gestion des commandes actives avec statuts
- Initiation des paiements Stripe
- Interface mobile-first optimisée pour tablettes

### 🔥 Dashboard Cuisine
- Affichage haute densité des commandes en attente
- Mise à jour des statuts : En attente → En préparation → Prête
- Timer par commande avec alertes visuelles (15+ min)
- Interface optimisée pour lecture à distance
- Synchronisation en temps réel avec la salle

### 📊 Dashboard Comptabilité
- Statistiques en temps réel :
  - Revenu total et du jour
  - Nombre de commandes
  - Commandes en attente
- Historique complet des commandes avec filtres
- Suivi des paiements (payé/non payé)
- Vue d'ensemble financière

### 💳 Paiements
- Intégration Stripe complète
- Sessions de paiement sécurisées
- Polling automatique du statut de paiement
- Support cartes bancaires
- Webhooks pour notifications en temps réel

## 🎨 Design

- **Thème** : Modern Island Hospitality - Dark Mode
- **Couleurs** : 
  - Primaire : Rose (#e11d48)
  - Secondaire : Amber (#f59e0b)
  - Fond : Slate-950
- **Typographie** :
  - Headings : Manrope (bold, moderne)
  - Body : Inter
  - Data/Prix : JetBrains Mono
- **Pattern** : Motif Chiromani subtil en fond

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Python 3.11+
- MongoDB

### Installation

1. **Backend**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend**
```bash
cd /app/frontend
yarn install
```

3. **Seeding des données**
```bash
python /app/scripts/seed_data.py
```

### Démarrage des services

Les services sont gérés par Supervisor et démarrent automatiquement :
```bash
sudo supervisorctl status
```

## 📝 Comptes de Test

Créez vos propres comptes via l'interface d'inscription ou utilisez :

**Serveur**
- Email : info@ckinnovation.fr
- Password : password123
- Rôle : waiter

**Cuisinier**
- Email : info@ckinnovation.fr  
- Password : password123
- Rôle : chef

**Comptable**
- Email : info@ckinnovation.fr
- Password : password123
- Rôle : accountant

## 🔧 Configuration

### Variables d'environnement

**Backend** (`/app/backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
STRIPE_API_KEY=sk_test_votre_cle_stripe
JWT_SECRET=votre_secret_jwt
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=168
```

**Frontend** (`/app/frontend/.env`)
```env
REACT_APP_BACKEND_URL=https://illustrious-success-production-597f.up.railway.app
```

## 📊 Données Seedées

L'application est pré-configurée avec :
- **12 tables** (capacité 4-6 personnes)
- **12 items de menu** répartis en :
  - Plats principaux (Poisson Grillé, Poulet Yassa, Langouste...)
  - Entrées (Salade Comorienne, Samosas)
  - Accompagnements (Riz au Coco, Mataba)
  - Boissons (Jus de Coco, Thé à la Vanille)
  - Desserts (Gâteau de Coco, Bananes Flambées)

## 🌟 Flux d'Utilisation

### Création d'une Commande
1. **Serveur** : Sélectionne une table libre
2. Ajoute des items du menu au panier
3. Crée la commande
4. La table passe en statut "Occupée"

### Préparation en Cuisine
1. **Cuisinier** : Voit la nouvelle commande en "En attente"
2. Clique sur "Commencer" → statut "En préparation"
3. Une fois terminé, clique sur "Prête"

### Service et Paiement
1. **Serveur** : Voit que la commande est "Prête"
2. Sert la commande → clique sur "Servie"
3. Clique sur "Payer" pour initier le paiement
4. Le client est redirigé vers Stripe
5. Après paiement, retour automatique avec confirmation

### Suivi Comptable
1. **Comptable** : Accède au dashboard
2. Consulte les statistiques en temps réel
3. Vérifie l'historique des commandes
4. Exporte les données si nécessaire

## 🔄 Synchronisation Temps Réel

L'application utilise un système de polling pour maintenir les données à jour :
- Dashboard Serveur : refresh toutes les 5 secondes
- Dashboard Cuisine : refresh toutes les 3 secondes
- Dashboard Comptabilité : refresh toutes les 10 secondes

## 💳 Paiements Stripe

### Flux de Paiement
1. Backend crée une session Stripe avec l'URL de retour dynamique
2. Transaction enregistrée en base (statut: "initiated")
3. Redirection vers Stripe Checkout
4. Polling du statut côté client (max 5 tentatives)
5. Mise à jour automatique après paiement réussi

### Sécurité
- Montants définis côté serveur (pas manipulables côté client)
- URLs de retour dynamiques basées sur l'origine
- Validation des transactions via webhooks
- Protection contre les doubles paiements

## 📱 Responsive Design

- **Mobile** : Interface optimisée pour serveurs avec bottom navigation
- **Tablette** : Grilles adaptatives pour cuisine
- **Desktop** : Dashboards complets pour comptabilité et admin

## 🛠️ Stack Technique

### Backend
- **Framework** : FastAPI
- **Base de données** : MongoDB (Motor async)
- **Auth** : JWT (PyJWT + passlib)
- **Paiements** : Stripe

### Frontend
- **Framework** : React 19
- **Routing** : React Router v7
- **UI** : Shadcn/UI + Tailwind CSS
- **HTTP** : Axios
- **Notifications** : Sonner

## 🎯 Prochaines Fonctionnalités

- 📦 Livraison à domicile
- 🎁 Programme de fidélité
- 📈 Analytics avancés
- 📱 Application mobile native
- 🌐 Multi-langues (FR/AR)
- 📧 Notifications email
- 🖨️ Impression tickets cuisine

## 📞 Support

Pour toute question ou problème, consultez la documentation ou contactez l'équipe de développement.

---

**Développé avec ❤️ pour Nassib - Comores**
