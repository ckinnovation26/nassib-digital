from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table as PDFTable, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_HOURS', 168))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "waiter"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    available: bool = True
    preparation_time: int = 15  # Temps de préparation en minutes (défini par l'admin)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    available: bool = True
    preparation_time: int = 15  # Temps de préparation en minutes

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    capacity: int
    status: str = "free"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    number: int
    capacity: int

class TableUpdate(BaseModel):
    status: str

class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: float
    notes: Optional[str] = None
    preparation_time: int = 15  # Temps de préparation en minutes

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    table_number: int
    waiter_id: str
    waiter_name: str
    items: List[OrderItem]
    total: float
    status: str = "pending"
    payment_status: str = "unpaid"
    payment_method: Optional[str] = None  # "cash" ou "card"
    preparation_started_at: Optional[str] = None  # Heure de début de préparation
    estimated_preparation_time: int = 15  # Temps de préparation max en minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItem]

class OrderStatusUpdate(BaseModel):
    status: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    amount: float
    currency: str
    session_id: Optional[str] = None
    payment_status: str = "initiated"
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = pwd_context.hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email, user.role)
    return {"user": user.model_dump(), "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not pwd_context.verify(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user_doc["id"], user_doc["email"], user_doc["role"])
    
    user_doc.pop("password_hash", None)
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return {"user": user_doc, "token": token}

@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return user_doc

@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get("created_at"), str):
            item["created_at"] = datetime.fromisoformat(item["created_at"])
    return items

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item_data: MenuItemCreate, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    item = MenuItem(**item_data.model_dump())
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    
    await db.menu_items.insert_one(item_dict)
    return item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item_data: MenuItemCreate, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    update_data = item_data.model_dump()
    result = await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    updated = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    
    return updated

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    return {"message": "Item supprimé"}

@api_router.get("/tables", response_model=List[Table])
async def get_tables():
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table.get("created_at"), str):
            table["created_at"] = datetime.fromisoformat(table["created_at"])
    return tables

@api_router.post("/tables", response_model=Table)
async def create_table(table_data: TableCreate, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    existing = await db.tables.find_one({"number": table_data.number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Numéro de table déjà existant")
    
    table = Table(**table_data.model_dump())
    table_dict = table.model_dump()
    table_dict["created_at"] = table_dict["created_at"].isoformat()
    
    await db.tables.insert_one(table_dict)
    return table

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, table_data: TableUpdate):
    result = await db.tables.update_one({"id": table_id}, {"$set": {"status": table_data.status}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    
    updated = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    
    return updated

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Vérifier si la table a des commandes actives
    active_orders = await db.orders.count_documents({
        "table_id": table_id,
        "status": {"$nin": ["completed", "cancelled"]}
    })
    if active_orders > 0:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une table avec des commandes actives")
    
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    
    return {"message": "Table supprimée"}

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: Dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Empêcher l'auto-suppression
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur supprimé"}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    update_fields = {}
    if "name" in user_data:
        update_fields["name"] = user_data["name"]
    if "role" in user_data:
        update_fields["role"] = user_data["role"]
    if "password" in user_data and user_data["password"]:
        update_fields["password_hash"] = pwd_context.hash(user_data["password"])
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: Dict = Depends(get_current_user)):
    table = await db.tables.find_one({"id": order_data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    
    total = sum(item.quantity * item.price for item in order_data.items)
    
    # Récupérer les temps de préparation des plats et calculer le temps max
    max_prep_time = 15  # Valeur par défaut
    items_with_prep_time = []
    
    for item in order_data.items:
        item_dict = item.model_dump()
        # Chercher le temps de préparation dans le menu
        menu_item = await db.menu_items.find_one({"id": item.menu_item_id}, {"_id": 0})
        if menu_item:
            prep_time = menu_item.get("preparation_time", 15)
            item_dict["preparation_time"] = prep_time
            if prep_time > max_prep_time:
                max_prep_time = prep_time
        else:
            item_dict["preparation_time"] = 15
        items_with_prep_time.append(item_dict)
    
    order = Order(
        table_id=order_data.table_id,
        table_number=table["number"],
        waiter_id=current_user["user_id"],
        waiter_name=current_user.get("email", "Unknown"),
        items=items_with_prep_time,
        total=total,
        estimated_preparation_time=max_prep_time
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    
    await db.orders.insert_one(order_dict)
    await db.tables.update_one({"id": order_data.table_id}, {"$set": {"status": "occupied"}})
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None, table_id: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if table_id:
        query["table_id"] = table_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get("created_at"), str):
            order["created_at"] = datetime.fromisoformat(order["created_at"])
        if isinstance(order.get("updated_at"), str):
            order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if isinstance(order.get("created_at"), str):
        order["created_at"] = datetime.fromisoformat(order["created_at"])
    if isinstance(order.get("updated_at"), str):
        order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_data: OrderStatusUpdate):
    update_data = {
        "status": status_data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Si on passe en préparation, enregistrer l'heure de début
    if status_data.status == "in_progress":
        update_data["preparation_started_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(order.get("created_at"), str):
        order["created_at"] = datetime.fromisoformat(order["created_at"])
    if isinstance(order.get("updated_at"), str):
        order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    
    # La table se libère seulement quand la commande est terminée (completed)
    if status_data.status == "completed":
        await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": "free"}})
    
    return order

class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str

@api_router.post("/checkout/session")
async def create_checkout_session(checkout_req: CheckoutRequest, current_user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": checkout_req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Commande déjà payée")
    
    # Conversion KMF → EUR (1 EUR = 491.96775 KMF)
    amount_kmf = float(order["total"])
    amount_eur = round(amount_kmf / 491.96775, 2)
    
    # Vérifier le montant minimum de Stripe (0.50 EUR)
    if amount_eur < 0.50:
        min_kmf = round(0.50 * 491.96775, 0)
        raise HTTPException(
            status_code=400, 
            detail=f"Le montant est trop faible pour le paiement par carte. Minimum : {min_kmf} KMF (0.50 EUR). Veuillez utiliser le paiement cash."
        )
    
    currency = "eur"
    
    success_url = f"{checkout_req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/payment/cancel"
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    host_url = checkout_req.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=amount_eur,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": checkout_req.order_id,
            "user_id": current_user["user_id"],
            "amount_kmf": str(amount_kmf)
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = PaymentTransaction(
        order_id=checkout_req.order_id,
        amount=amount_eur,
        currency=currency,
        session_id=session.session_id,
        payment_status="initiated",
        metadata={"user_id": current_user["user_id"], "amount_kmf": amount_kmf}
    )
    
    transaction_dict = transaction.model_dump()
    transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
    transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
    
    await db.payment_transactions.insert_one(transaction_dict)
    
    # Marquer la méthode de paiement
    await db.orders.update_one(
        {"id": checkout_req.order_id},
        {"$set": {"payment_method": "card"}}
    )
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if transaction and transaction["payment_status"] != checkout_status.payment_status:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": checkout_status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if checkout_status.payment_status == "paid":
            order_id = transaction["order_id"]
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {"payment_status": "paid"}}
            )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            order_id = webhook_response.metadata.get("order_id")
            if order_id:
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {"payment_status": "paid"}}
                )
        
        return {"received": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class CashPaymentRequest(BaseModel):
    order_id: str

@api_router.post("/payment/cash")
async def process_cash_payment(payment_req: CashPaymentRequest, current_user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment_req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Commande déjà payée")
    
    # Marquer comme payé en cash
    await db.orders.update_one(
        {"id": payment_req.order_id},
        {"$set": {
            "payment_status": "paid",
            "payment_method": "cash",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Créer une transaction cash pour les records
    transaction = PaymentTransaction(
        order_id=payment_req.order_id,
        amount=float(order["total"]),
        currency="KMF",
        session_id=None,
        payment_status="paid",
        metadata={"user_id": current_user["user_id"], "method": "cash"}
    )
    
    transaction_dict = transaction.model_dump()
    transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
    transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
    
    await db.payment_transactions.insert_one(transaction_dict)
    
    return {"success": True, "message": "Paiement cash enregistré", "order_id": payment_req.order_id}

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_orders = await db.orders.count_documents({})
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today.isoformat()}
    })
    
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0.0
    
    pipeline_today = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": today.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_today_result = await db.orders.aggregate(pipeline_today).to_list(1)
    today_revenue = revenue_today_result[0]["total"] if revenue_today_result else 0.0
    
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    return {
        "total_orders": total_orders,
        "today_orders": today_orders,
        "total_revenue": round(total_revenue, 2),
        "today_revenue": round(today_revenue, 2),
        "pending_orders": pending_orders
    }

# Taux de conversion EUR/KMF
EUR_TO_KMF = 491.96775

def format_currency_pdf(amount_kmf):
    """Formate le montant en KMF et EUR"""
    amount_eur = amount_kmf / EUR_TO_KMF
    return f"{amount_kmf:,.0f} KMF", f"{amount_eur:,.2f} €"

@api_router.get("/orders/{order_id}/invoice")
async def generate_order_invoice(order_id: str, current_user: Dict = Depends(get_current_user)):
    """Génère une facture PDF pour une commande"""
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Créer le PDF en mémoire
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#E11D48'), alignment=TA_CENTER, spaceAfter=20)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748B'), alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1E293B'), spaceBefore=15, spaceAfter=10)
    normal_style = ParagraphStyle('Normal2', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'))
    
    elements = []
    
    # En-tête
    elements.append(Paragraph("FACTURE", title_style))
    elements.append(Paragraph("Restaurant Nassib", header_style))
    elements.append(Spacer(1, 20))
    
    # Infos facture
    invoice_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    order_date = order.get("created_at", "")
    if isinstance(order_date, str):
        try:
            order_date = datetime.fromisoformat(order_date).strftime("%d/%m/%Y %H:%M")
        except:
            order_date = invoice_date
    
    info_data = [
        ["N° Commande:", order_id[:8].upper(), "Date commande:", str(order_date)],
        ["Table:", str(order.get("table_number", "N/A")), "Serveur:", order.get("waiter_name", "N/A")],
        ["Statut paiement:", "PAYÉ" if order.get("payment_status") == "paid" else "NON PAYÉ", "Mode:", order.get("payment_method", "N/A").upper()],
    ]
    
    info_table = PDFTable(info_data, colWidths=[3*cm, 4.5*cm, 3*cm, 4.5*cm])
    info_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748B')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#64748B')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Détail des articles
    elements.append(Paragraph("DÉTAIL DE LA COMMANDE", section_style))
    
    table_data = [["Article", "Qté", "Prix unit.", "Total KMF", "Total EUR"]]
    
    for item in order.get("items", []):
        name = item.get("menu_item_name", "Article")
        qty = item.get("quantity", 1)
        price = item.get("price", 0)
        total = qty * price
        kmf, eur = format_currency_pdf(total)
        price_kmf, price_eur = format_currency_pdf(price)
        table_data.append([name, str(qty), price_kmf, kmf, eur])
    
    # Total
    total_amount = order.get("total", 0)
    total_kmf, total_eur = format_currency_pdf(total_amount)
    table_data.append(["", "", "", "", ""])
    table_data.append(["", "", "TOTAL:", total_kmf, total_eur])
    
    items_table = PDFTable(table_data, colWidths=[6*cm, 1.5*cm, 3*cm, 3*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#E11D48')),
        ('LINEBELOW', (0, 1), (-1, -3), 0.5, colors.HexColor('#E2E8F0')),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (2, -1), (-1, -1), colors.HexColor('#FEF2F2')),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#E11D48')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 30))
    
    # Pied de page
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94A3B8'), alignment=TA_CENTER)
    elements.append(Paragraph(f"Taux de conversion: 1 EUR = {EUR_TO_KMF} KMF", footer_style))
    elements.append(Paragraph(f"Facture générée le {invoice_date} | Restaurant Nassib", footer_style))
    elements.append(Paragraph("Merci de votre visite !", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    # Retourner le PDF
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=facture_nassib_{order_id[:8]}.pdf"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()