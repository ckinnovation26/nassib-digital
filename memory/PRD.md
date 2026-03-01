# Nassib Digital - PRD (Product Requirements Document)

## Original Problem Statement
Application de gestion pour moderniser la chaîne de restauration "Nassib" aux Comores. Digitalisation du processus de commande pour réduire les erreurs humaines et optimiser le service entre la salle, la cuisine et la comptabilité.

## User Personas
1. **Administrateur** - Gère les utilisateurs, le menu et les tables
2. **Serveur** - Prend les commandes, gère les tables, encaisse les paiements
3. **Cuisinier** - Voit les commandes entrantes, démarre la préparation avec timer
4. **Comptable** - Consulte les statistiques et revenus

## Core Requirements (Implemented)
- ✅ Menu numérique avec temps de préparation par plat
- ✅ Prise de commande digitalisée
- ✅ Flux de travail entre serveurs, cuisine et comptabilité
- ✅ Système de paiement (Espèces KMF + Carte Stripe)
- ✅ Dashboard administrateur complet

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python), Motor (async MongoDB)
- **Database**: MongoDB
- **Authentication**: JWT avec rôles
- **Payments**: Stripe (mode test)

## Key Features Implemented

### 1. Authentication & Authorization
- Login/Register avec rôles (waiter, chef, accountant, admin)
- JWT tokens avec expiration configurable
- Redirection automatique par rôle

### 2. Dashboard Serveur (/waiter)
- Vue des tables avec statut (Libre/Occupée)
- Création de commandes
- Suivi des commandes actives
- Paiement Espèces ou Carte

### 3. Dashboard Cuisine (/kitchen)
- Liste des commandes en attente/en préparation
- Temps de préparation affiché par plat (défini par admin)
- Bouton "Commencer" qui déclenche le timer
- Barre de progression et countdown
- Alerte visuelle si temps dépassé

### 4. Dashboard Comptabilité (/accounting)
- Statistiques: commandes du jour, revenus total/jour
- Liste des transactions

### 5. Dashboard Admin (/admin) - NEW
- **Onglet Menu**: CRUD plats avec nom, description, prix (KMF), catégorie, temps de préparation
- **Onglet Tables**: Ajout/Suppression de tables avec numéro et capacité
- **Onglet Utilisateurs**: Liste, création, modification, suppression d'utilisateurs avec rôles

## Database Schema
- **users**: `{id, email, password_hash, name, role, created_at}`
- **menu_items**: `{id, name, description, price, category, preparation_time, available}`
- **tables**: `{id, number, capacity, status}`
- **orders**: `{id, table_id, table_number, waiter_id, items, total, status, payment_status, payment_method, estimated_preparation_time, preparation_started_at}`
- **payment_transactions**: `{id, order_id, amount, currency, session_id, payment_status}`

## API Endpoints
- Auth: `/api/auth/{register, login, me}`
- Menu: `/api/menu` (GET, POST, PUT, DELETE)
- Tables: `/api/tables` (GET, POST, DELETE)
- Users: `/api/users` (GET, PUT, DELETE) - admin only
- Orders: `/api/orders`, `/api/orders/{id}/status`
- Payments: `/api/payment/cash`, `/api/checkout/session`
- Stats: `/api/stats/dashboard`

## Test Credentials
- **Admin**: administration@nassib.com / password123
- **Serveur**: serveur@nassib.com / password123
- **Cuisinier**: cuisine@nassib.com / password123
- **Comptable**: comptable@nassib.com / password123
- **Carte Stripe test**: 4242 4242 4242 4242

## Upcoming Tasks (P1)
1. Activation de compte par email et réinitialisation de mot de passe
2. Amélioration du dashboard comptabilité avec filtres

## Future Tasks (P2+)
1. Système de livraison à domicile
2. Programme de fidélité

## Configuration
- Devise: KMF (Franc comorien)
- Taux de conversion Stripe: 1 EUR = 491.96775 KMF
- Montant minimum Stripe: 0.50 EUR

---
*Dernière mise à jour: Mars 2026*
