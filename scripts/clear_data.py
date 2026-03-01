import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def clear_all_data():
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    print("🗑️  Suppression de toutes les données...")
    
    # Supprimer tous les items du menu
    result_menu = await db.menu_items.delete_many({})
    print(f"✅ {result_menu.deleted_count} items de menu supprimés")
    
    # Supprimer toutes les commandes
    result_orders = await db.orders.delete_many({})
    print(f"✅ {result_orders.deleted_count} commandes supprimées")
    
    # Supprimer toutes les transactions de paiement
    result_transactions = await db.payment_transactions.delete_many({})
    print(f"✅ {result_transactions.deleted_count} transactions supprimées")
    
    # Réinitialiser le statut de toutes les tables à "free"
    result_tables = await db.tables.update_many(
        {},
        {"$set": {"status": "free"}}
    )
    print(f"✅ {result_tables.modified_count} tables réinitialisées à 'Libre'")
    
    print("\n🎉 Toutes les données ont été supprimées!")
    print("ℹ️  Les tables et utilisateurs sont conservés")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_all_data())
