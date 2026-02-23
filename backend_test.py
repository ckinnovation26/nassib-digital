import requests
import sys
from datetime import datetime
import json

class NassibAPITester:
    def __init__(self, base_url="https://nassib-digital.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'orders': [],
            'tables': [],
            'menu_items': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No details')
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Raw response: {response.text}")
                response_data = {}

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_register(self, email, password, name, role):
        """Test user registration"""
        success, response = self.run_test(
            f"Register {role}",
            "POST",
            "auth/register",
            200,
            data={"email": email, "password": password, "name": name, "role": role}
        )
        if success and 'token' in response and 'user' in response:
            if role == "waiter":  # Use waiter as primary test user
                self.token = response['token']
                self.user_id = response['user']['id']
            self.created_resources['users'].append({
                'email': email, 
                'password': password, 
                'role': role,
                'user_id': response.get('user', {}).get('id')
            })
            return True, response
        return False, {}

    def test_auth_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "Login",
            "POST", 
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            old_token = self.token
            self.token = response['token']
            return True, response, old_token
        return False, {}, None

    def test_auth_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get current user",
            "GET",
            "auth/me", 
            200
        )
        return success, response

    def test_get_menu(self):
        """Test get menu items"""
        success, response = self.run_test(
            "Get menu items",
            "GET",
            "menu",
            200
        )
        return success, response

    def test_get_tables(self):
        """Test get tables"""
        success, response = self.run_test(
            "Get tables",
            "GET", 
            "tables",
            200
        )
        return success, response

    def test_create_order(self, table_id, menu_items):
        """Test create order"""
        items = []
        total = 0
        for item in menu_items[:2]:  # Limit to 2 items for testing
            items.append({
                "menu_item_id": item["id"],
                "menu_item_name": item["name"],
                "quantity": 1,
                "price": item["price"],
                "notes": "Test order"
            })
            total += item["price"]

        success, response = self.run_test(
            "Create order",
            "POST",
            "orders",
            200,
            data={
                "table_id": table_id,
                "items": items
            }
        )
        if success and 'id' in response:
            self.created_resources['orders'].append(response['id'])
        return success, response

    def test_get_orders(self):
        """Test get all orders"""
        success, response = self.run_test(
            "Get orders",
            "GET",
            "orders",
            200
        )
        return success, response

    def test_update_order_status(self, order_id, status):
        """Test update order status"""
        success, response = self.run_test(
            f"Update order to {status}",
            "PUT",
            f"orders/{order_id}/status",
            200,
            data={"status": status}
        )
        return success, response

    def test_checkout_session(self, order_id):
        """Test create checkout session"""
        success, response = self.run_test(
            "Create checkout session",
            "POST",
            "checkout/session",
            200,
            data={
                "order_id": order_id,
                "origin_url": self.base_url
            }
        )
        return success, response

    def test_dashboard_stats(self):
        """Test dashboard statistics (accountant role required)"""
        success, response = self.run_test(
            "Get dashboard stats",
            "GET",
            "stats/dashboard",
            200
        )
        return success, response

def main():
    # Setup
    tester = NassibAPITester()
    timestamp = datetime.now().strftime('%H%M%S')
    
    # Test users with different roles
    test_users = [
        {"email": f"waiter_{timestamp}@test.com", "password": "TestPass123!", "name": "Test Waiter", "role": "waiter"},
        {"email": f"chef_{timestamp}@test.com", "password": "TestPass123!", "name": "Test Chef", "role": "chef"},
        {"email": f"accountant_{timestamp}@test.com", "password": "TestPass123!", "name": "Test Accountant", "role": "accountant"},
        {"email": f"admin_{timestamp}@test.com", "password": "TestPass123!", "name": "Test Admin", "role": "admin"}
    ]

    print("=== TESTING NASSIB RESTAURANT API ===")
    
    # Test 1: User Registration
    print("\n📝 Testing User Registration...")
    for user in test_users:
        success, response = tester.test_auth_register(
            user["email"], user["password"], user["name"], user["role"]
        )
        if not success:
            print(f"❌ Registration failed for {user['role']}")

    # Test 2: User Authentication  
    print("\n🔐 Testing Authentication...")
    if not tester.test_auth_me()[0]:
        print("❌ Auth info failed")
        return 1

    # Test 3: Menu and Tables
    print("\n🍽️ Testing Menu and Tables...")
    menu_success, menu_data = tester.test_get_menu()
    tables_success, tables_data = tester.test_get_tables()
    
    if not menu_success or not tables_success:
        print("❌ Menu or Tables API failed")
        return 1

    if not menu_data or not tables_data:
        print("❌ No menu items or tables found - database may not be seeded")
        return 1

    print(f"   Found {len(menu_data)} menu items and {len(tables_data)} tables")

    # Test 4: Order Creation and Management
    print("\n📋 Testing Order Management...")
    if menu_data and tables_data:
        # Use first available table
        table = tables_data[0] if tables_data else None
        if table:
            order_success, order_data = tester.test_create_order(table["id"], menu_data)
            if order_success and order_data:
                order_id = order_data["id"]
                
                # Test order status updates
                tester.test_update_order_status(order_id, "in_progress")
                tester.test_update_order_status(order_id, "ready")
                tester.test_update_order_status(order_id, "served")
                
                # Test checkout session creation
                tester.test_checkout_session(order_id)

    # Test 5: Dashboard Stats (as accountant)
    print("\n📊 Testing Dashboard Stats...")
    # Login as accountant to test stats endpoint
    accountant_user = next((u for u in tester.created_resources['users'] if u['role'] == 'accountant'), None)
    if accountant_user:
        login_success, login_data, old_token = tester.test_auth_login(
            accountant_user['email'], 
            accountant_user['password']
        )
        if login_success:
            tester.test_dashboard_stats()
            tester.token = old_token  # Restore original token

    # Test 6: Get all orders
    print("\n📋 Testing Get All Orders...")
    tester.test_get_orders()

    # Print final results
    print("\n" + "="*50)
    print(f"📊 RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Print summary of created resources
    print(f"\n📦 Created resources:")
    print(f"   Users: {len(tester.created_resources['users'])}")
    print(f"   Orders: {len(tester.created_resources['orders'])}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"   Success rate: {success_rate:.1f}%")
    
    if success_rate < 70:
        print("❌ CRITICAL: Low success rate, major backend issues detected")
        return 1
    elif success_rate < 90:
        print("⚠️  WARNING: Some backend issues detected")
    else:
        print("✅ Backend APIs working well")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())