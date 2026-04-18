import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_USERS = [
    {"email": "administration@nassib.com", "name": "Admin Nassib",    "role": "admin",     "password": "password123"},
    {"email": "serveur@nassib.com",        "name": "Serveur Nassib",   "role": "waiter",    "password": "password123"},
    {"email": "cuisine@nassib.com",        "name": "Cuisinier Nassib", "role": "cook",      "password": "password123"},
    {"email": "comptable@nassib.com",      "name": "Comptable Nassib", "role": "accountant","password": "password123"},
    {"email": "caissier@nassib.com",       "name": "Caissier Nassib",  "role": "cashier",   "password": "password123"},
]

async def create_default_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]

    print("👤 Création des comptes par défaut...")
    for u in DEFAULT_USERS:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            print(f"  ⏭  {u['email']} existe déjà")
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "password_hash": pwd_context.hash(u["password"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        print(f"  ✅ {u['email']} ({u['role']}) créé")

    client.close()
    print("🎉 Terminé.")

if __name__ == "__main__":
    asyncio.run(create_default_users())
