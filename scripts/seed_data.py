import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

async def seed_database():
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    print("🌱 Début du seeding...")
    
    # Clear existing data
    await db.tables.delete_many({})
    await db.menu_items.delete_many({})
    
    # Seed Tables
    tables = []
    for i in range(1, 13):
        tables.append({
            "id": str(uuid.uuid4()),
            "number": i,
            "capacity": 4 if i <= 8 else 6,
            "status": "free",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.tables.insert_many(tables)
    print(f"✅ {len(tables)} tables créées")
    
    # Seed Menu Items
    menu_items = [
        # Plats principaux
        {
            "id": str(uuid.uuid4()),
            "name": "Poisson Grillé",
            "description": "Poisson frais du jour grillé aux épices",
            "price": 1250,
            "category": "Plats",
            "image_url": "https://images.pexels.com/photos/28843593/pexels-photo-28843593.jpeg",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Poulet Yassa",
            "description": "Poulet mariné aux oignons et citron",
            "price": 1000,
            "category": "Plats",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Langouste à la Vanille",
            "description": "Langouste locale avec sauce vanille",
            "price": 2500,
            "category": "Plats",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brochettes de Boeuf",
            "description": "Brochettes marinées avec légumes",
            "price": 1100,
            "category": "Plats",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Entrées
        {
            "id": str(uuid.uuid4()),
            "name": "Salade Comorienne",
            "description": "Salade fraîche avec coco râpé",
            "price": 500,
            "category": "Entrées",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Samosas",
            "description": "3 samosas viande ou légumes",
            "price": 450,
            "category": "Entrées",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Accompagnements
        {
            "id": str(uuid.uuid4()),
            "name": "Riz au Coco",
            "description": "Riz parfumé à la noix de coco",
            "price": 350,
            "category": "Accompagnements",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mataba",
            "description": "Feuilles de manioc aux épices",
            "price": 400,
            "category": "Accompagnements",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Boissons
        {
            "id": str(uuid.uuid4()),
            "name": "Jus de Coco Frais",
            "description": "Jus de noix de coco naturel",
            "price": 300,
            "category": "Boissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Thé à la Vanille",
            "description": "Thé infusé avec vanille locale",
            "price": 250,
            "category": "Boissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Desserts
        {
            "id": str(uuid.uuid4()),
            "name": "Gâteau de Coco",
            "description": "Gâteau traditionnel à la noix de coco",
            "price": 450,
            "category": "Desserts",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bananes Flambées",
            "description": "Bananes flambées au rhum et vanille",
            "price": 5.50,
            "category": "Desserts",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.menu_items.insert_many(menu_items)
    print(f"✅ {len(menu_items)} items de menu créés")
    
    print("🎉 Seeding terminé avec succès!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
