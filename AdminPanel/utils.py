import hashlib
import uuid

def hash_word(word: str) -> str:
    return hashlib.sha256(word.encode()).hexdigest()

def generate_uuid() -> str:
    return str(uuid.uuid4())