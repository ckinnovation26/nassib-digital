import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

async def import_new_menu():
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    print("📋 Importation du nouveau menu Nassib...")
    
    # Menu complet extrait des images
    menu_items = [
        # M2 MENU - POISSONS
        {
            "id": str(uuid.uuid4()),
            "name": "Filet de daurade + sauce provençale",
            "description": "Filet de daurade avec sauce provençale",
            "price": 5000,
            "category": "Poissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Steack de thon poêlé + sauce provençale",
            "description": "Steack de thon poêlé avec sauce provençale",
            "price": 5000,
            "category": "Poissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Poisson entier frit et oignons caramélisés + sauce provençale",
            "description": "Poisson entier frit avec oignons caramélisés et sauce provençale",
            "price": 5500,
            "category": "Poissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Curry de poisson",
            "description": "Curry de poisson maison",
            "price": 5000,
            "category": "Poissons",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M2 MENU - FRUITS DE MER
        {
            "id": str(uuid.uuid4()),
            "name": "Crevettes sautées à l'ail",
            "description": "Crevettes sautées à l'ail",
            "price": 5000,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brochettes de crevettes",
            "description": "Brochettes de crevettes grillées",
            "price": 6000,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Langoustes grillées au beurre citronné + sauce vanille",
            "description": "Langoustes grillées au beurre citronné avec sauce vanille",
            "price": 7500,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Langoustes sautées au gingembre + sauce vanille",
            "description": "Langoustes sautées au gingembre avec sauce vanille",
            "price": 8000,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brochettes de poulpes",
            "description": "Brochettes de poulpes grillées",
            "price": 4000,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vinday de poulpe",
            "description": "Vinday de poulpe traditionnel",
            "price": 3500,
            "category": "Fruits de mer",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M2 MENU - DESSERTS
        {
            "id": str(uuid.uuid4()),
            "name": "Salade de fruits/assiettes de fruits",
            "description": "Salade de fruits frais ou assiette de fruits",
            "price": 1500,
            "category": "Desserts",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Crème caramel",
            "description": "Crème caramel maison",
            "price": 1000,
            "category": "Desserts",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M1 MENU - ENTRÉES FROIDES
        {
            "id": str(uuid.uuid4()),
            "name": "Éventail espadon fumé",
            "description": "Éventail d'espadon fumé",
            "price": 2500,
            "category": "Entrées Froides",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Couronne de langouste",
            "description": "Couronne de langouste",
            "price": 3000,
            "category": "Entrées Froides",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Crudités de saison",
            "description": "Crudités de saison fraîches",
            "price": 2500,
            "category": "Entrées Froides",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M1 MENU - ENTRÉES CHAUDES
        {
            "id": str(uuid.uuid4()),
            "name": "Assiettes de croquettes de manioc au fromage",
            "description": "Croquettes de manioc au fromage",
            "price": 1500,
            "category": "Entrées Chaudes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Assiettes de beignets de crevettes",
            "description": "Beignets de crevettes croustillants",
            "price": 2500,
            "category": "Entrées Chaudes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Accras de poisson",
            "description": "Accras de poisson maison",
            "price": 2000,
            "category": "Entrées Chaudes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ailerons de poulet marinés",
            "description": "Ailerons de poulet marinés",
            "price": 2000,
            "category": "Entrées Chaudes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Potage de légumes de saison",
            "description": "Potage de légumes de saison",
            "price": 2000,
            "category": "Entrées Chaudes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M1 MENU - VIANDES
        {
            "id": str(uuid.uuid4()),
            "name": "Spaghetti bolognaise",
            "description": "Spaghetti à la bolognaise",
            "price": 3000,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Émincé de bœuf",
            "description": "Émincé de bœuf tendre",
            "price": 4000,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Filet de bœuf au poivre noir",
            "description": "Filet de bœuf au poivre noir",
            "price": 6500,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brochettes de viande + sauce poivre",
            "description": "Brochettes de viande avec sauce poivre",
            "price": 6500,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Côte d'agneau à l'ail et au persil",
            "description": "Côte d'agneau à l'ail et au persil",
            "price": 6500,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "T-Bone steack aux fines herbes",
            "description": "T-Bone steack aux fines herbes",
            "price": 7500,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Curry de bœuf à la comorienne",
            "description": "Curry de bœuf à la comorienne",
            "price": 6000,
            "category": "Viandes",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # M1 MENU - VOLAILLES
        {
            "id": str(uuid.uuid4()),
            "name": "Mysao de poulet",
            "description": "Mysao de poulet traditionnel",
            "price": 2500,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cuisse de poulet",
            "description": "Cuisse de poulet grillée",
            "price": 3500,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brochettes de poulet",
            "description": "Brochettes de poulet marinées",
            "price": 3500,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Poulet KFC",
            "description": "Poulet façon KFC",
            "price": 3000,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Émincé de poulet au citron et gingembre",
            "description": "Émincé de poulet au citron et gingembre",
            "price": 3500,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Spaghetti poulet champignon",
            "description": "Spaghetti au poulet et champignons",
            "price": 3500,
            "category": "Volailles",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # PIZZA MENU
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Napolitaine",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym",
            "price": 4000,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Végétarienne",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, chochote, haricot vert, carotte",
            "price": 4750,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza 3 fromages",
            "description": "Fromage, sauce pizza, oignon, poivron, thym, fromages burger",
            "price": 4750,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Poulet",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, poulet émincé",
            "price": 5250,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Bolognaise",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, viande bolognaise",
            "price": 5500,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza au Thon",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, thon rouge",
            "price": 6000,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Espadon",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, espadon fumé",
            "price": 6500,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Poulet Champignon",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, poulet, champignons, ketchup",
            "price": 5750,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Merguez",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, Merguez",
            "price": 5750,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza fruits de mer",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, crevettes, poulpes",
            "price": 6500,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Select",
            "description": "Fromage, sauce pizza, oignon, olive, poivron, thym, poulet, bolognaise, poisson thon rouge",
            "price": 6500,
            "category": "Pizzas",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # ACCOMPAGNEMENT (Note spéciale)
        {
            "id": str(uuid.uuid4()),
            "name": "Supplément de garniture",
            "description": "Frites, Pommes Sautées, Légumes sautés, Riz blanc, Riz aux légumes, Riz jaune, Spaghettis, Légumes locaux (selon saison)",
            "price": 1250,
            "category": "Accompagnements",
            "image_url": "",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Insérer tous les items
    await db.menu_items.insert_many(menu_items)
    
    print(f"\n✅ {len(menu_items)} items de menu importés avec succès!")
    print("\n📊 Répartition par catégorie:")
    
    # Compter par catégorie
    categories = {}
    for item in menu_items:
        cat = item["category"]
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in sorted(categories.items()):
        print(f"   • {cat}: {count} items")
    
    print("\n🎉 Menu Nassib complet importé!")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_new_menu())
