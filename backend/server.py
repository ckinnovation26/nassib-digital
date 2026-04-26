from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header, Query
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
import csv
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table as PDFTable, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

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

VALID_ROLES = ["admin", "waiter", "cook", "accountant", "cashier"]
EUR_TO_KMF = 491.96775

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
    preparation_time: int = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    available: bool = True
    preparation_time: int = 15

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    capacity: int
    status: str = "free"
    occupied_seats: int = 0
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
    preparation_time: int = 15

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
    guests_count: int = 1
    payment_status: str = "unpaid"
    payment_method: Optional[str] = None
    preparation_started_at: Optional[str] = None
    estimated_preparation_time: int = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItem]
    guests_count: int = 1

class OrderStatusUpdate(BaseModel):
    status: str
    extra_minutes: Optional[int] = None

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

def create_token(user_id: str, email: str, role: str, name: str = "") -> str:
    payload = {"user_id": user_id, "email": email, "role": role, "name": name, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)}
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

def parse_date_param(value: Optional[str], end_of_day: bool = False) -> Optional[str]:
    """Valide et normalise un paramètre de date ISO (YYYY-MM-DD). Lève 400 si invalide."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.strip()[:10])
        if end_of_day:
            dt = dt.replace(hour=23, minute=59, second=59)
        return dt.isoformat()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Format de date invalide : '{value}'. Attendu YYYY-MM-DD")

def fmt_eur(amount_kmf: float) -> str:
    eur = amount_kmf / EUR_TO_KMF
    return f"{eur:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ─── AUTH ────────────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(user_data: UserRegister, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé — réservé aux administrateurs")
    if user_data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Rôles valides : {VALID_ROLES}")
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(email=user_data.email, name=user_data.name, role=user_data.role)
    user_dict = user.model_dump()
    user_dict["password_hash"] = pwd_context.hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    await db.users.insert_one(user_dict)
    return {"user": user.model_dump(), "token": create_token(user.id, user.email, user.role, user.name)}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not pwd_context.verify(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_token(user_doc["id"], user_doc["email"], user_doc["role"], user_doc.get("name", ""))
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

# ─── MENU ────────────────────────────────────────────────────────────────────

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
    result = await db.menu_items.update_one({"id": item_id}, {"$set": item_data.model_dump()})
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

# ─── TABLES ──────────────────────────────────────────────────────────────────

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
async def update_table(table_id: str, table_data: TableUpdate, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "waiter", "cashier"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
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
    active_orders = await db.orders.count_documents({"table_id": table_id, "status": {"$nin": ["completed", "cancelled"]}})
    if active_orders > 0:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une table avec des commandes actives")
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    return {"message": "Table supprimée"}

# ─── USERS ───────────────────────────────────────────────────────────────────

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
    if "name" in user_data: update_fields["name"] = user_data["name"]
    if "role" in user_data:
        if user_data["role"] not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Rôle invalide. Rôles valides : {VALID_ROLES}")
        update_fields["role"] = user_data["role"]
    if "password" in user_data and user_data["password"]:
        update_fields["password_hash"] = pwd_context.hash(user_data["password"])
    if not update_fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    result = await db.users.update_one({"id": user_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})

# ─── ORDERS ──────────────────────────────────────────────────────────────────

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: Dict = Depends(get_current_user)):
    table = await db.tables.find_one({"id": order_data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    total = sum(item.quantity * item.price for item in order_data.items)
    max_prep_time = 15
    items_with_prep_time = []
    for item in order_data.items:
        item_dict = item.model_dump()
        menu_item = await db.menu_items.find_one({"id": item.menu_item_id}, {"_id": 0})
        if menu_item:
            prep_time = menu_item.get("preparation_time", 15)
            item_dict["preparation_time"] = prep_time
            if prep_time > max_prep_time: max_prep_time = prep_time
        else:
            item_dict["preparation_time"] = 15
        items_with_prep_time.append(item_dict)
    order = Order(
        table_id=order_data.table_id, table_number=table["number"],
        waiter_id=current_user["user_id"], waiter_name=current_user.get("name") or current_user.get("email", "Unknown"),
        items=items_with_prep_time, total=total,
        guests_count=order_data.guests_count, estimated_preparation_time=max_prep_time
    )
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    await db.orders.insert_one(order_dict)
    new_occupied = min(table.get("occupied_seats", 0) + order_data.guests_count, table["capacity"])
    new_status = "occupied" if new_occupied >= table["capacity"] else "partial" if new_occupied > 0 else "free"
    await db.tables.update_one({"id": order_data.table_id}, {"$set": {"status": new_status, "occupied_seats": new_occupied}})
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None, table_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    if table_id: query["table_id"] = table_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
        if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: Dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order: raise HTTPException(status_code=404, detail="Commande non trouvée")
    if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
    if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_data: OrderStatusUpdate, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "cook", "waiter", "cashier"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    update_data = {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if status_data.status == "in_progress":
        update_data["preparation_started_at"] = datetime.now(timezone.utc).isoformat()
    if status_data.extra_minutes and status_data.extra_minutes > 0:
        order_doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order_doc and order_doc.get("preparation_started_at"):
            started = datetime.fromisoformat(order_doc["preparation_started_at"])
            if started.tzinfo is None: started = started.replace(tzinfo=timezone.utc)
            elapsed_minutes = (datetime.now(timezone.utc) - started).total_seconds() / 60
            update_data["estimated_preparation_time"] = int(elapsed_minutes + status_data.extra_minutes)
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="Commande non trouvée")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
    if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    if status_data.status in ["completed", "cancelled"]:
        table_doc = await db.tables.find_one({"id": order["table_id"]}, {"_id": 0})
        if table_doc:
            guests = order.get("guests_count", 1)
            new_occupied = max(0, table_doc.get("occupied_seats", 0) - guests)
            new_status = "free" if new_occupied == 0 else "occupied" if new_occupied >= table_doc["capacity"] else "partial"
            await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": new_status, "occupied_seats": new_occupied}})
    return order

# ─── PAIEMENT CASH ───────────────────────────────────────────────────────────

class CashPaymentRequest(BaseModel):
    order_id: str

@api_router.post("/payment/cash")
async def process_cash_payment(payment_req: CashPaymentRequest, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "cashier", "waiter"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    order = await db.orders.find_one({"id": payment_req.order_id}, {"_id": 0})
    if not order: raise HTTPException(status_code=404, detail="Commande non trouvée")
    if order["payment_status"] == "paid": raise HTTPException(status_code=400, detail="Commande déjà payée")
    await db.orders.update_one(
        {"id": payment_req.order_id},
        {"$set": {"payment_status": "paid", "payment_method": "cash", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    transaction = PaymentTransaction(
        order_id=payment_req.order_id, amount=float(order["total"]), currency="KMF",
        payment_status="paid", metadata={"user_id": current_user["user_id"], "cashier_name": current_user.get("email", ""), "method": "cash"}
    )
    transaction_dict = transaction.model_dump()
    transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
    transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
    await db.payment_transactions.insert_one(transaction_dict)
    return {"success": True, "message": "Paiement cash enregistré", "order_id": payment_req.order_id}

# ─── CAISSIER ────────────────────────────────────────────────────────────────

@api_router.get("/cashier/orders", response_model=List[Order])
async def get_cashier_orders(current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "cashier"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    query = {"status": {"$in": ["ready", "served", "completed"]}, "payment_status": "unpaid"}
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
        if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    return orders

@api_router.get("/cashier/history")
async def get_cashier_history(
    current_user: Dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    if current_user["role"] not in ["admin", "cashier"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    query = {"payment_status": "paid"}
    d_from = parse_date_param(date_from)
    d_to = parse_date_param(date_to, end_of_day=True)
    if d_from: query.setdefault("created_at", {})["$gte"] = d_from
    if d_to: query.setdefault("created_at", {})["$lte"] = d_to
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
        if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    total_kmf = sum(o.get("total", 0) for o in orders)
    return {"orders": orders, "count": len(orders), "total_kmf": round(total_kmf, 2), "total_eur": round(total_kmf / EUR_TO_KMF, 2)}

# ─── COMPTA ──────────────────────────────────────────────────────────────────

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(
    current_user: Dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    period_query = {"payment_status": "paid"}
    d_from = parse_date_param(date_from)
    d_to = parse_date_param(date_to, end_of_day=True)
    if d_from: period_query.setdefault("created_at", {})["$gte"] = d_from
    if d_to: period_query.setdefault("created_at", {})["$lte"] = d_to
    total_orders = await db.orders.count_documents({})
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    pipeline = [{"$match": period_query}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0.0
    pipeline_today = [{"$match": {"payment_status": "paid", "created_at": {"$gte": today.isoformat()}}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_today_result = await db.orders.aggregate(pipeline_today).to_list(1)
    today_revenue = revenue_today_result[0]["total"] if revenue_today_result else 0.0
    pending_orders = await db.orders.count_documents({"status": "pending"})
    return {"total_orders": total_orders, "today_orders": today_orders, "total_revenue": round(total_revenue, 2), "today_revenue": round(today_revenue, 2), "pending_orders": pending_orders}

@api_router.get("/accounting/orders")
async def get_accounting_orders(
    current_user: Dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    query = {}
    d_from = parse_date_param(date_from)
    d_to = parse_date_param(date_to, end_of_day=True)
    if d_from: query.setdefault("created_at", {})["$gte"] = d_from
    if d_to: query.setdefault("created_at", {})["$lte"] = d_to
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    user_cache = {}
    for order in orders:
        waiter_email = order.get("waiter_name", "")
        if waiter_email not in user_cache:
            user_doc = await db.users.find_one({"email": waiter_email}, {"_id": 0, "name": 1})
            user_cache[waiter_email] = user_doc["name"] if user_doc else waiter_email
        order["waiter_display_name"] = user_cache[waiter_email]

        # Récupérer le nom du caissier depuis la transaction de paiement
        if order.get("payment_status") == "paid":
            transaction = await db.payment_transactions.find_one({"order_id": order.get("id")}, {"_id": 0, "metadata": 1})
            if transaction and transaction.get("metadata", {}).get("cashier_name"):
                cashier_email = transaction["metadata"]["cashier_name"]
                if cashier_email not in user_cache:
                    user_doc = await db.users.find_one({"email": cashier_email}, {"_id": 0, "name": 1})
                    user_cache[cashier_email] = user_doc["name"] if user_doc else cashier_email
                order["cashier_name"] = user_cache[cashier_email]
            else:
                order["cashier_name"] = "—"
        else:
            order["cashier_name"] = "—"

        if isinstance(order.get("created_at"), str): order["created_at"] = datetime.fromisoformat(order["created_at"])
        if isinstance(order.get("updated_at"), str): order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    return orders

@api_router.get("/accounting/export/csv")
async def export_accounting_csv(
    current_user: Dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    if current_user["role"] not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    query = {"payment_status": "paid"}
    d_from = parse_date_param(date_from)
    d_to = parse_date_param(date_to, end_of_day=True)
    if d_from: query.setdefault("created_at", {})["$gte"] = d_from
    if d_to: query.setdefault("created_at", {})["$lte"] = d_to
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    user_cache = {}
    for order in orders:
        waiter_email = order.get("waiter_name", "")
        if waiter_email not in user_cache:
            user_doc = await db.users.find_one({"email": waiter_email}, {"_id": 0, "name": 1})
            user_cache[waiter_email] = user_doc["name"] if user_doc else waiter_email
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Date", "Heure", "N° Commande", "Table", "Serveur", "Nb Couverts", "Articles", "Total KMF", "Total EUR", "Mode paiement", "Statut"])
    total_kmf_sum = 0.0
    for order in orders:
        created_at = order.get("created_at", "")
        if isinstance(created_at, str):
            try:
                dt = datetime.fromisoformat(created_at)
                date_str = dt.strftime("%d/%m/%Y")
                time_str = dt.strftime("%H:%M")
            except Exception:
                date_str = str(created_at)[:10]; time_str = ""
        else:
            date_str = ""; time_str = ""
        waiter_name = user_cache.get(order.get("waiter_name", ""), order.get("waiter_name", ""))
        articles = " | ".join([f"{i.get('menu_item_name','')} x{i.get('quantity',1)}" for i in order.get("items", [])])
        total_kmf = order.get("total", 0)
        total_kmf_sum += total_kmf
        writer.writerow([date_str, time_str, order.get("id","")[:8].upper(), order.get("table_number",""),
                         waiter_name, order.get("guests_count",1), articles,
                         f"{total_kmf:.0f}", fmt_eur(total_kmf),
                         (order.get("payment_method") or "cash").upper(), "PAYÉ"])
    writer.writerow([])
    writer.writerow(["TOTAL", "", "", "", "", len(orders), "", f"{total_kmf_sum:.0f}", fmt_eur(total_kmf_sum), "", ""])
    output.seek(0)
    date_export = datetime.now().strftime("%Y%m%d_%H%M")
    suffix = f"_{date_from[:10]}_{date_to[:10]}" if date_from and date_to else ""
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=compta_nassib{suffix}_{date_export}.csv"}
    )

# ─── PERFORMANCE CUISINE ─────────────────────────────────────────────────────

@api_router.get("/kitchen/performance")
async def get_kitchen_performance(
    current_user: Dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Stats globales de performance cuisine — admin uniquement"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé — admin uniquement")

    query = {"preparation_started_at": {"$exists": True, "$ne": None}}
    d_from = parse_date_param(date_from)
    d_to = parse_date_param(date_to, end_of_day=True)
    if d_from: query.setdefault("created_at", {})["$gte"] = d_from
    if d_to: query.setdefault("created_at", {})["$lte"] = d_to

    orders = await db.orders.find(query, {"_id": 0}).to_list(5000)

    total_orders = len(orders)
    prep_times = []  # temps réel de préparation en minutes
    overtime_count = 0
    fastest = None
    slowest = None

    for order in orders:
        started_str = order.get("preparation_started_at")
        updated_str = order.get("updated_at")
        estimated = order.get("estimated_preparation_time", 15)

        if not started_str or order.get("status") not in ["ready", "served", "completed", "paid"]:
            continue

        try:
            started = datetime.fromisoformat(started_str)
            if started.tzinfo is None: started = started.replace(tzinfo=timezone.utc)

            # Utiliser updated_at comme approximation de la fin de préparation
            updated = datetime.fromisoformat(updated_str) if isinstance(updated_str, str) else datetime.now(timezone.utc)
            if updated.tzinfo is None: updated = updated.replace(tzinfo=timezone.utc)

            real_minutes = round((updated - started).total_seconds() / 60, 1)
            if real_minutes <= 0 or real_minutes > 180:
                continue  # Données aberrantes

            prep_times.append({
                "order_id": order.get("id", "")[:8],
                "table": order.get("table_number"),
                "real_minutes": real_minutes,
                "estimated_minutes": estimated,
                "delta": round(real_minutes - estimated, 1),
                "is_overtime": real_minutes > estimated,
                "date": started_str[:10] if started_str else ""
            })

            if real_minutes > estimated:
                overtime_count += 1

            if fastest is None or real_minutes < fastest["real_minutes"]:
                fastest = {"order_id": order.get("id","")[:8], "table": order.get("table_number"), "minutes": real_minutes}
            if slowest is None or real_minutes > slowest["real_minutes"]:
                slowest = {"order_id": order.get("id","")[:8], "table": order.get("table_number"), "minutes": real_minutes}

        except Exception:
            continue

    measured = len(prep_times)
    avg_real = round(sum(p["real_minutes"] for p in prep_times) / measured, 1) if measured > 0 else 0
    avg_estimated = round(sum(p["estimated_minutes"] for p in prep_times) / measured, 1) if measured > 0 else 0
    overtime_rate = round((overtime_count / measured) * 100, 1) if measured > 0 else 0
    on_time_rate = round(100 - overtime_rate, 1)

    return {
        "total_orders": total_orders,
        "measured_orders": measured,
        "avg_real_minutes": avg_real,
        "avg_estimated_minutes": avg_estimated,
        "avg_delta_minutes": round(avg_real - avg_estimated, 1),
        "overtime_count": overtime_count,
        "overtime_rate": overtime_rate,
        "on_time_rate": on_time_rate,
        "fastest": fastest,
        "slowest": slowest,
        "details": prep_times[-20:]  # 20 dernières commandes
    }

# ─── FACTURE PDF ─────────────────────────────────────────────────────────────

def format_currency_pdf(amount_kmf):
    amount_eur = amount_kmf / EUR_TO_KMF
    return f"{amount_kmf:,.0f} KMF", f"{amount_eur:,.2f} €".replace(".", ",")

@api_router.get("/orders/{order_id}/invoice")
async def generate_order_invoice(order_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "cashier", "accountant", "waiter"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order: raise HTTPException(status_code=404, detail="Commande non trouvée")
    # Résoudre le vrai nom du serveur depuis la base (waiter_id est fiable, pas waiter_name)
    waiter_display = order.get("waiter_name", "N/A")
    waiter_id = order.get("waiter_id", "")
    if waiter_id:
        waiter_doc = await db.users.find_one({"id": waiter_id}, {"_id": 0, "name": 1, "email": 1})
        if waiter_doc:
            waiter_display = waiter_doc.get("name") or waiter_doc.get("email", waiter_display)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor('#E11D48'), alignment=TA_CENTER, spaceAfter=5)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748B'), alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1E293B'), spaceBefore=15, spaceAfter=10)
    contact_style = ParagraphStyle('Contact', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#F59E0B'), alignment=TA_CENTER)
    elements = []
    try:
        import urllib.request
        logo_url = "https://illustrious-success-production-597f.up.railway.app/LOGO%20NASSIB.jpeg"
        logo_data = io.BytesIO(urllib.request.urlopen(logo_url).read())
        from reportlab.platypus import Image as PDFImage
        logo = PDFImage(logo_data, width=3*cm, height=3*cm)
        elements.append(logo)
    except Exception:
        pass
    elements.append(Paragraph("FACTURE", title_style))
    elements.append(Paragraph("Restaurant Nassib - Comores", header_style))
    elements.append(Paragraph("<b>Livraison : +269 3320308</b>", contact_style))
    elements.append(Spacer(1, 15))
    invoice_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    order_date = order.get("created_at", "")
    if isinstance(order_date, str):
        try: order_date = datetime.fromisoformat(order_date).strftime("%d/%m/%Y %H:%M")
        except Exception: order_date = invoice_date
    info_data = [
        ["N° Commande:", order_id[:8].upper(), "Date commande:", str(order_date)],
        ["Table:", str(order.get("table_number", "N/A")), "Serveur:", waiter_display],
        ["Statut paiement:", "PAYÉ" if order.get("payment_status") == "paid" else "NON PAYÉ", "Mode:", (order.get("payment_method") or "N/A").upper()],
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
    elements.append(Paragraph("DÉTAIL DE LA COMMANDE", section_style))
    table_data = [["Article", "Qté", "Prix unit.", "Total KMF", "Total EUR"]]
    for item in order.get("items", []):
        qty = item.get("quantity", 1); price = item.get("price", 0); total = qty * price
        kmf, eur = format_currency_pdf(total); price_kmf, _ = format_currency_pdf(price)
        table_data.append([item.get("menu_item_name", "Article"), str(qty), price_kmf, kmf, eur])
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
    elements.append(Spacer(1, 25))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94A3B8'), alignment=TA_CENTER)
    delivery_style = ParagraphStyle('Delivery', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#E11D48'), alignment=TA_CENTER, spaceBefore=10)
    elements.append(Paragraph("<b>COMMANDE LIVRAISON</b>", delivery_style))
    elements.append(Paragraph("<font size='14' color='#F59E0B'><b>+269 3320308</b></font>", ParagraphStyle('Phone', alignment=TA_CENTER)))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph(f"Taux de conversion: 1 EUR = {EUR_TO_KMF} KMF", footer_style))
    elements.append(Paragraph(f"Facture générée le {invoice_date} | Restaurant Nassib - Comores", footer_style))
    elements.append(Paragraph("Merci de votre visite !", footer_style))
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=facture_nassib_{order_id[:8]}.pdf"})

app.include_router(api_router)
_default_origins = 'https://nassib.rest,https://www.nassib.rest,http://localhost:3000'
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', _default_origins).split(','), allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
