"""
Nassib Restaurant API Tests
Tests for admin dashboard CRUD operations: users, menu, tables
Tests for kitchen dashboard: orders with preparation time and timer
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://illustrious-success-production-597f.up.railway.app').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials from requirements
ADMIN_EMAIL = "administration@nassib.com"
ADMIN_PASSWORD = "password123"
CHEF_EMAIL = "cuisine@nassib.com"
CHEF_PASSWORD = "password123"
WAITER_EMAIL = "serveur@nassib.com"
WAITER_PASSWORD = "password123"

class TestAuthentication:
    """Authentication endpoint tests for role-based redirects"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 401:
            # Admin user doesn't exist, create it
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "name": "Admin Nassib",
                "role": "admin"
            })
            assert reg_response.status_code == 200, f"Failed to register admin: {reg_response.text}"
            data = reg_response.json()
            assert "token" in data
            assert data["user"]["role"] == "admin"
        else:
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            assert data["user"]["role"] == "admin"
    
    def test_chef_login(self):
        """Test chef login with correct credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": CHEF_EMAIL,
            "password": CHEF_PASSWORD
        })
        if response.status_code == 401:
            # Chef user doesn't exist, create it
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": CHEF_EMAIL,
                "password": CHEF_PASSWORD,
                "name": "Chef Nassib",
                "role": "chef"
            })
            assert reg_response.status_code == 200, f"Failed to register chef: {reg_response.text}"
            data = reg_response.json()
            assert data["user"]["role"] == "chef"
        else:
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["role"] == "chef"
    
    def test_waiter_login(self):
        """Test waiter login with correct credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": WAITER_EMAIL,
            "password": WAITER_PASSWORD
        })
        if response.status_code == 401:
            # Waiter user doesn't exist, create it
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": WAITER_EMAIL,
                "password": WAITER_PASSWORD,
                "name": "Serveur Nassib",
                "role": "waiter"
            })
            assert reg_response.status_code == 200, f"Failed to register waiter: {reg_response.text}"
            data = reg_response.json()
            assert data["user"]["role"] == "waiter"
        else:
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["role"] == "waiter"

    def test_invalid_login(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestAdminMenuCRUD:
    """Admin dashboard - Menu CRUD operations including preparation time"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 401:
            # Create admin if not exists
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "name": "Admin Nassib",
                "role": "admin"
            })
            self.token = reg_response.json()["token"]
        else:
            self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_menu(self):
        """Test getting menu items"""
        response = requests.get(f"{API_URL}/menu")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} menu items")
    
    def test_create_menu_item_with_preparation_time(self):
        """Test creating menu item with admin-defined preparation time"""
        timestamp = datetime.now().strftime('%H%M%S')
        menu_item = {
            "name": f"TEST_Plat_{timestamp}",
            "description": "Test dish description",
            "price": 5000,
            "category": "Plats",
            "available": True,
            "preparation_time": 25  # 25 minutes prep time defined by admin
        }
        response = requests.post(f"{API_URL}/menu", json=menu_item, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert data["name"] == menu_item["name"]
        assert data["price"] == 5000
        assert data["preparation_time"] == 25  # Verify prep time is saved
        assert "id" in data
        
        # Store ID for cleanup
        self.created_menu_id = data["id"]
        return data["id"]
    
    def test_update_menu_item_preparation_time(self):
        """Test updating menu item including preparation time"""
        # First create an item
        timestamp = datetime.now().strftime('%H%M%S')
        create_item = {
            "name": f"TEST_Update_{timestamp}",
            "description": "To be updated",
            "price": 3000,
            "category": "Entrées Froides",
            "available": True,
            "preparation_time": 10
        }
        create_response = requests.post(f"{API_URL}/menu", json=create_item, headers=self.headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update the item
        update_data = {
            "name": f"TEST_Updated_{timestamp}",
            "description": "Updated description",
            "price": 4000,
            "category": "Plats",
            "available": True,
            "preparation_time": 30  # Changed from 10 to 30 minutes
        }
        update_response = requests.put(f"{API_URL}/menu/{item_id}", json=update_data, headers=self.headers)
        assert update_response.status_code == 200
        
        updated_item = update_response.json()
        assert updated_item["preparation_time"] == 30
        assert updated_item["price"] == 4000
    
    def test_delete_menu_item(self):
        """Test deleting menu item"""
        # Create an item to delete
        timestamp = datetime.now().strftime('%H%M%S')
        create_item = {
            "name": f"TEST_Delete_{timestamp}",
            "description": "To be deleted",
            "price": 2000,
            "category": "Boissons",
            "available": True,
            "preparation_time": 5
        }
        create_response = requests.post(f"{API_URL}/menu", json=create_item, headers=self.headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Delete the item
        delete_response = requests.delete(f"{API_URL}/menu/{item_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion - item should not be in menu anymore
        menu_response = requests.get(f"{API_URL}/menu")
        menu_items = menu_response.json()
        item_ids = [item["id"] for item in menu_items]
        assert item_id not in item_ids


class TestAdminTablesCRUD:
    """Admin dashboard - Tables CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "name": "Admin Nassib",
                "role": "admin"
            })
            self.token = reg_response.json()["token"]
        else:
            self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_tables(self):
        """Test getting all tables"""
        response = requests.get(f"{API_URL}/tables")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} tables")
    
    def test_create_table(self):
        """Test creating a new table"""
        timestamp = int(datetime.now().timestamp())
        table_number = 900 + (timestamp % 100)  # Unique table number
        
        table_data = {
            "number": table_number,
            "capacity": 4
        }
        response = requests.post(f"{API_URL}/tables", json=table_data, headers=self.headers)
        
        # Might fail if table number exists
        if response.status_code == 400:
            print(f"Table {table_number} already exists, trying different number")
            table_data["number"] = table_number + 1
            response = requests.post(f"{API_URL}/tables", json=table_data, headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["capacity"] == 4
        assert "id" in data
        assert data["status"] == "free"
        
        self.created_table_id = data["id"]
        return data["id"]
    
    def test_delete_table(self):
        """Test deleting a table (without active orders)"""
        # First create a table
        timestamp = int(datetime.now().timestamp())
        table_number = 800 + (timestamp % 100)
        
        create_response = requests.post(f"{API_URL}/tables", json={
            "number": table_number,
            "capacity": 2
        }, headers=self.headers)
        
        if create_response.status_code == 400:
            table_number += 1
            create_response = requests.post(f"{API_URL}/tables", json={
                "number": table_number,
                "capacity": 2
            }, headers=self.headers)
        
        assert create_response.status_code == 200
        table_id = create_response.json()["id"]
        
        # Delete the table
        delete_response = requests.delete(f"{API_URL}/tables/{table_id}", headers=self.headers)
        assert delete_response.status_code == 200


class TestAdminUsersCRUD:
    """Admin dashboard - Users CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "name": "Admin Nassib",
                "role": "admin"
            })
            self.token = reg_response.json()["token"]
            self.admin_id = reg_response.json()["user"]["id"]
        else:
            self.token = response.json()["token"]
            self.admin_id = response.json()["user"]["id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users(self):
        """Test getting all users (admin only)"""
        response = requests.get(f"{API_URL}/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users")
        
        # Check user structure
        for user in data:
            assert "id" in user
            assert "email" in user
            assert "name" in user
            assert "role" in user
    
    def test_create_user_via_register(self):
        """Test creating a new user via registration endpoint"""
        timestamp = datetime.now().strftime('%H%M%S')
        new_user = {
            "email": f"TEST_newuser_{timestamp}@nassib.com",
            "password": "testpass123",
            "name": f"Test User {timestamp}",
            "role": "waiter"
        }
        response = requests.post(f"{API_URL}/auth/register", json=new_user)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == new_user["email"]
        assert data["user"]["role"] == "waiter"
    
    def test_update_user(self):
        """Test updating user (admin only)"""
        # First, get users to find one to update
        users_response = requests.get(f"{API_URL}/users", headers=self.headers)
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find a non-admin user to update (not self)
        target_user = None
        for user in users:
            if user["id"] != self.admin_id and user["role"] != "admin":
                target_user = user
                break
        
        if not target_user:
            # Create a test user first
            timestamp = datetime.now().strftime('%H%M%S')
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": f"TEST_update_{timestamp}@nassib.com",
                "password": "testpass123",
                "name": "User To Update",
                "role": "waiter"
            })
            assert reg_response.status_code == 200
            target_user = reg_response.json()["user"]
        
        # Update the user
        update_data = {
            "name": "Updated Name",
            "role": "chef"
        }
        update_response = requests.put(f"{API_URL}/users/{target_user['id']}", json=update_data, headers=self.headers)
        assert update_response.status_code == 200
        
        updated_user = update_response.json()
        assert updated_user["name"] == "Updated Name"
        assert updated_user["role"] == "chef"
    
    def test_delete_user(self):
        """Test deleting user (admin only)"""
        # Create a user to delete
        timestamp = datetime.now().strftime('%H%M%S')
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": f"TEST_delete_{timestamp}@nassib.com",
            "password": "testpass123",
            "name": "User To Delete",
            "role": "waiter"
        })
        assert reg_response.status_code == 200
        user_id = reg_response.json()["user"]["id"]
        
        # Delete the user
        delete_response = requests.delete(f"{API_URL}/users/{user_id}", headers=self.headers)
        assert delete_response.status_code == 200
    
    def test_non_admin_cannot_get_users(self):
        """Test that non-admin users cannot access users list"""
        # Login as waiter
        waiter_response = requests.post(f"{API_URL}/auth/login", json={
            "email": WAITER_EMAIL,
            "password": WAITER_PASSWORD
        })
        if waiter_response.status_code == 200:
            waiter_token = waiter_response.json()["token"]
            waiter_headers = {"Authorization": f"Bearer {waiter_token}"}
            
            # Try to get users
            response = requests.get(f"{API_URL}/users", headers=waiter_headers)
            assert response.status_code == 403


class TestKitchenDashboard:
    """Kitchen dashboard - Orders with preparation time and timer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        # Login as waiter to create orders
        waiter_response = requests.post(f"{API_URL}/auth/login", json={
            "email": WAITER_EMAIL,
            "password": WAITER_PASSWORD
        })
        if waiter_response.status_code != 200:
            reg_response = requests.post(f"{API_URL}/auth/register", json={
                "email": WAITER_EMAIL,
                "password": WAITER_PASSWORD,
                "name": "Serveur Nassib",
                "role": "waiter"
            })
            self.waiter_token = reg_response.json()["token"]
        else:
            self.waiter_token = waiter_response.json()["token"]
        
        self.waiter_headers = {"Authorization": f"Bearer {self.waiter_token}"}
    
    def test_order_has_preparation_time(self):
        """Test that orders include preparation time from menu items"""
        # Get tables and menu
        tables_response = requests.get(f"{API_URL}/tables")
        menu_response = requests.get(f"{API_URL}/menu")
        
        assert tables_response.status_code == 200
        assert menu_response.status_code == 200
        
        tables = tables_response.json()
        menu_items = menu_response.json()
        
        if not tables or not menu_items:
            pytest.skip("No tables or menu items available")
        
        # Create an order
        table = tables[0]
        menu_item = menu_items[0]
        
        order_data = {
            "table_id": table["id"],
            "items": [{
                "menu_item_id": menu_item["id"],
                "menu_item_name": menu_item["name"],
                "quantity": 2,
                "price": menu_item["price"],
                "notes": "Test order with prep time",
                "preparation_time": menu_item.get("preparation_time", 15)
            }]
        }
        
        order_response = requests.post(f"{API_URL}/orders", json=order_data, headers=self.waiter_headers)
        assert order_response.status_code == 200
        
        order = order_response.json()
        
        # Verify order has estimated_preparation_time
        assert "estimated_preparation_time" in order
        assert order["estimated_preparation_time"] >= 15  # Default min
        print(f"Order created with estimated prep time: {order['estimated_preparation_time']} min")
        
        self.test_order_id = order["id"]
        return order["id"]
    
    def test_start_cooking_sets_timer(self):
        """Test that starting cooking (in_progress) sets preparation_started_at"""
        # Create an order first
        tables = requests.get(f"{API_URL}/tables").json()
        menu_items = requests.get(f"{API_URL}/menu").json()
        
        if not tables or not menu_items:
            pytest.skip("No tables or menu items available")
        
        order_data = {
            "table_id": tables[0]["id"],
            "items": [{
                "menu_item_id": menu_items[0]["id"],
                "menu_item_name": menu_items[0]["name"],
                "quantity": 1,
                "price": menu_items[0]["price"],
                "notes": "",
                "preparation_time": menu_items[0].get("preparation_time", 15)
            }]
        }
        
        create_response = requests.post(f"{API_URL}/orders", json=order_data, headers=self.waiter_headers)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        
        # Start cooking (simulates chef clicking "Commencer")
        update_response = requests.put(f"{API_URL}/orders/{order_id}/status", json={"status": "in_progress"})
        assert update_response.status_code == 200
        
        updated_order = update_response.json()
        
        # Verify preparation_started_at is set
        assert "preparation_started_at" in updated_order
        assert updated_order["preparation_started_at"] is not None
        assert updated_order["status"] == "in_progress"
        
        print(f"Timer started at: {updated_order['preparation_started_at']}")
    
    def test_mark_order_ready(self):
        """Test marking order as ready after cooking"""
        # Create and start an order
        tables = requests.get(f"{API_URL}/tables").json()
        menu_items = requests.get(f"{API_URL}/menu").json()
        
        if not tables or not menu_items:
            pytest.skip("No tables or menu items available")
        
        order_data = {
            "table_id": tables[0]["id"],
            "items": [{
                "menu_item_id": menu_items[0]["id"],
                "menu_item_name": menu_items[0]["name"],
                "quantity": 1,
                "price": menu_items[0]["price"],
                "notes": "",
                "preparation_time": 15
            }]
        }
        
        create_response = requests.post(f"{API_URL}/orders", json=order_data, headers=self.waiter_headers)
        order_id = create_response.json()["id"]
        
        # Start cooking
        requests.put(f"{API_URL}/orders/{order_id}/status", json={"status": "in_progress"})
        
        # Mark as ready
        ready_response = requests.put(f"{API_URL}/orders/{order_id}/status", json={"status": "ready"})
        assert ready_response.status_code == 200
        assert ready_response.json()["status"] == "ready"


class TestPermissions:
    """Test role-based permissions"""
    
    def test_waiter_cannot_delete_menu(self):
        """Waiter should not be able to delete menu items"""
        # Login as waiter
        waiter_response = requests.post(f"{API_URL}/auth/login", json={
            "email": WAITER_EMAIL,
            "password": WAITER_PASSWORD
        })
        if waiter_response.status_code != 200:
            pytest.skip("Waiter user not available")
        
        waiter_token = waiter_response.json()["token"]
        waiter_headers = {"Authorization": f"Bearer {waiter_token}"}
        
        # Get a menu item
        menu_items = requests.get(f"{API_URL}/menu").json()
        if not menu_items:
            pytest.skip("No menu items available")
        
        # Try to delete
        delete_response = requests.delete(f"{API_URL}/menu/{menu_items[0]['id']}", headers=waiter_headers)
        assert delete_response.status_code == 403
    
    def test_chef_cannot_access_users(self):
        """Chef should not be able to access users list"""
        chef_response = requests.post(f"{API_URL}/auth/login", json={
            "email": CHEF_EMAIL,
            "password": CHEF_PASSWORD
        })
        if chef_response.status_code != 200:
            pytest.skip("Chef user not available")
        
        chef_token = chef_response.json()["token"]
        chef_headers = {"Authorization": f"Bearer {chef_token}"}
        
        response = requests.get(f"{API_URL}/users", headers=chef_headers)
        assert response.status_code == 403


# Cleanup fixture to remove TEST_ prefixed data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Login as admin for cleanup
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        return
    
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Clean up test menu items
    menu_items = requests.get(f"{API_URL}/menu").json()
    for item in menu_items:
        if item["name"].startswith("TEST_"):
            requests.delete(f"{API_URL}/menu/{item['id']}", headers=headers)
    
    # Clean up test users
    users = requests.get(f"{API_URL}/users", headers=headers).json()
    for user in users:
        if user["email"].startswith("TEST_") or "test" in user["email"].lower():
            if user["role"] != "admin":  # Don't delete admin
                requests.delete(f"{API_URL}/users/{user['id']}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
