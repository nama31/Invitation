import boto3
from app.core.config import settings

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )

def generate_presigned_upload_url(key: str, mime_type: str, expires_in: int = 300) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires_in,
    )

def delete_object(key: str) -> None:
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)
