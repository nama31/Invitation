from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PresignRequest(BaseModel):
    mime_type: str
    file_size_bytes: int

class PresignResponse(BaseModel):
    photo_id: str
    upload_url: str
    storage_key: str

class ConfirmUpload(BaseModel):
    storage_key: str
    uploader_name: str | None = None
    original_filename: str
    file_size_bytes: int
    mime_type: str

class PhotoRead(BaseModel):
    id: int
    public_url: str
    uploader_name: str | None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)
