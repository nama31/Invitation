import urllib.request
import urllib.parse
import json
import time

API_URL = "http://localhost:8000/api"

def request(method, url, data=None, headers=None):
    if headers is None: headers = {}
    if data is not None:
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            if res_body:
                return response.status, json.loads(res_body)
            return response.status, {}
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

def test_photo_flow():
    print("Testing Photo Gallery Flow...")
    
    status, presign = request("POST", f"{API_URL}/photos/presign", {
        "mime_type": "image/jpeg",
        "file_size_bytes": 100000
    })
    assert status == 200, f"Presign failed: {presign}"
    print("Presign OK:", presign["storage_key"])
    
    status, photo = request("POST", f"{API_URL}/photos/confirm", {
        "storage_key": presign["storage_key"],
        "uploader_name": "Test User",
        "original_filename": "test.jpg",
        "file_size_bytes": 100000,
        "mime_type": "image/jpeg"
    })
    assert status == 200, f"Confirm failed: {photo}"
    photo_id = photo["id"]
    print("Confirm OK, Photo ID:", photo_id)
    
    status, photos = request("GET", f"{API_URL}/photos")
    assert status == 200
    assert any(p["id"] == photo_id for p in photos), "Photo not in public list"
    print("Public get OK")
    
    status, token_resp = request("POST", "http://localhost:8000/auth/login", {
        "email": "admin@gmail.com", 
        "password": "admin"
    })
    assert status == 200, f"Login failed: {token_resp}"
    token = token_resp["access_token"]
    print("Admin login OK")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    status, _ = request("PATCH", f"{API_URL}/admin/photos/{photo_id}/hide", headers=headers)
    assert status == 200
    print("Hide Photo OK")
    
    status, photos = request("GET", f"{API_URL}/photos")
    assert not any(p["id"] == photo_id for p in photos), "Photo should be hidden"
    print("Verify hidden OK")
    
    status, _ = request("DELETE", f"{API_URL}/admin/photos/{photo_id}", headers=headers)
    assert status == 204
    print("Delete Photo OK")

if __name__ == "__main__":
    test_photo_flow()
