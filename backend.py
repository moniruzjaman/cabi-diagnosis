
# নির্দেশাবলী: 
# ১. ইনস্টল করুন: pip install fastapi uvicorn supabase python-dotenv
# ২. আপনার .env ফাইলে SUPABASE_URL এবং SUPABASE_KEY যুক্ত করুন
# ৩. কমান্ড চালান: uvicorn backend:app --reload

import os
import json
import base64
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client

app = FastAPI()

# CORS settings to allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
LOCAL_STORE = "./data_store"
IMAGES_DIR = os.path.join(LOCAL_STORE, "images")
RECORDS_FILE = os.path.join(LOCAL_STORE, "records.json")

# Supabase Credentials (Placeholder - update with your credentials)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase connected successfully.")
    except Exception as e:
        print(f"Supabase connection failed: {e}")

# Ensure local directories exist
os.makedirs(IMAGES_DIR, exist_ok=True)
if not os.path.exists(RECORDS_FILE):
    with open(RECORDS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

class SyncData(BaseModel):
    cropName: str
    diseaseName: str
    category: str
    confidence: float
    imageData: str  # Base64 string
    symptoms: List[str]
    isBiotic: bool

@app.post("/record")
async def store_record(data: SyncData):
    record_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    # 1. Store Image Locally
    image_filename = f"{record_id}.jpg"
    image_path = os.path.join(IMAGES_DIR, image_filename)
    try:
        header, encoded = data.imageData.split(",", 1) if "," in data.imageData else ("", data.imageData)
        with open(image_path, "wb") as f:
            f.write(base64.b64decode(encoded))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local image save failed: {str(e)}")

    # 2. Store Metadata Locally
    record = {
        "id": record_id,
        "timestamp": timestamp,
        "crop": data.cropName,
        "disease": data.diseaseName,
        "category": data.category,
        "confidence": data.confidence,
        "isBiotic": data.isBiotic,
        "symptoms": data.symptoms,
        "local_image_path": image_path
    }
    
    try:
        with open(RECORDS_FILE, "r+", encoding="utf-8") as f:
            records = json.load(f)
            records.append(record)
            f.seek(0)
            json.dump(records, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Local JSON save failed: {e}")

    # 3. Store to Supabase
    supabase_status = "Not Connected"
    if supabase:
        try:
            # We insert data into 'diagnoses' table. 
            # Make sure you have created this table in Supabase.
            db_data = {
                "crop_name": data.cropName,
                "disease_name": data.diseaseName,
                "category": data.category,
                "confidence": data.confidence,
                "is_biotic": data.isBiotic,
                "symptoms": ",".join(data.symptoms),
                "timestamp": timestamp
            }
            res = supabase.table("diagnoses").insert(db_data).execute()
            supabase_status = "Success"
        except Exception as e:
            supabase_status = f"Failed: {str(e)}"

    return {
        "status": "Success",
        "record_id": record_id,
        "local_storage": "Ok",
        "supabase_sync": supabase_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
