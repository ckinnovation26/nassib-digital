import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def divide_prices():
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    print("🔄 Division des prix par 100 (enlever 2 zéros)...")
    
    # Récupérer tous les items du menu
    menu_items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
    
    for item in menu_items:
        old_price = item.get("price", 0)
        new_price = old_price / 100
        
        await db.menu_items.update_one(
            {"id": item["id"]},
            {"$set": {"price": new_price}}
        )
        print(f"✅ {item['name']}: {old_price} KMF → {new_price} KMF")
    
    print(f"\n🎉 {len(menu_items)} prix mis à jour!")
    client.close()

if __name__ == "__main__":
    asyncio.run(divide_prices())
