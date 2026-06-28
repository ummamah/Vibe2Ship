"""
Database layer: Firestore + Cloud Storage abstraction.
Falls back to in-memory storage when running outside GCP (GOOGLE_CLOUD_PROJECT missing).
"""
from datetime import datetime
import os
import uuid
from typing import Optional, List, Dict, Any

# --- Firestore / Cloud Storage flags ---
FIRESTORE_AVAILABLE = False
STORAGE_AVAILABLE = False

# In-memory fallback (same as before)
_tasks_db: Dict[str, dict] = {}
_plans_db: Dict[str, dict] = {}
_collections_db: Dict[str, dict] = {}
_documents_db: Dict[str, dict] = {}
_study_materials_db: Dict[str, dict] = {}
_chat_history_db: Dict[str, List[Dict]] = {}
_session_history: List[dict] = {}


def _init_firestore():
    global FIRESTORE_AVAILABLE
    try:
        # Check if we're on GCP
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
        if not project_id:
            return
        import google.cloud.firestore
        FIRESTORE_AVAILABLE = True
    except ImportError:
        pass

_init_firestore()


def get_firestore_db():
    if not FIRESTORE_AVAILABLE:
        return None
    import google.cloud.firestore as firestore
    return firestore.Client()


def is_firestore() -> bool:
    return FIRESTORE_AVAILABLE

# --- General helpers ---

def get_collection_ref(collection_name: str):
    db = get_firestore_db()
    if db is None:
        return None
    return db.collection(collection_name)


from google.cloud.firestore_v1.document import DocumentReference


def _fs_dict_to_py(doc_ref) -> dict:
    """Convert a Firestore DocumentSnapshot to plain dict with 'id' included."""
    data = doc_ref.to_dict() or {}
    data["id"] = doc_ref.id
    return data


def db_get_all(collection_name: str) -> List[Dict]:
    """Get all documents from a Firestore collection. Falls back to local dict if offline."""
    ref = get_collection_ref(collection_name)
    if ref is None:
        if collection_name == "tasks":
            return list(_tasks_db.values())
        elif collection_name == "plans":
            return list(_plans_db.values())
        elif collection_name == "collections":
            return list(_collections_db.values())
        elif collection_name == "documents":
            return list(_documents_db.values())
        elif collection_name == "study_materials":
            return list(_study_materials_db.values())
        elif collection_name == "session_history":
            return list(_session_history.values())
        return []
    docs = ref.stream()
    return [_fs_dict_to_py(d) for d in docs]


def db_get(collection_name: str, doc_id: str) -> Optional[Dict]:
    """Get a single document by ID."""
    ref = get_collection_ref(collection_name)
    if ref is None:
        source = {
            "tasks": _tasks_db,
            "plans": _plans_db,
            "collections": _collections_db,
            "documents": _documents_db,
            "study_materials": _study_materials_db,
            "session_history": _session_history,
        }
        return source.get(collection_name, {}).get(doc_id)
    doc = ref.document(doc_id).get()
    return _fs_dict_to_py(doc) if doc.exists else None


def db_set(collection_name: str, doc_id: str, data: Dict):
    """Set/overwrite a document in Firestore."""
    ref = get_collection_ref(collection_name)
    if ref is None:
        if collection_name == "tasks":
            _tasks_db[doc_id] = data
        elif collection_name == "plans":
            _plans_db[doc_id] = data
        elif collection_name == "collections":
            _collections_db[doc_id] = data
        elif collection_name == "documents":
            _documents_db[doc_id] = data
        elif collection_name == "study_materials":
            _study_materials_db[doc_id] = data
        elif collection_name == "session_history":
            _session_history[doc_id] = data
        return
    # Firestore write
    ref.document(doc_id).set(data)


def db_delete(collection_name: str, doc_id: str):
    """Delete a document."""
    ref = get_collection_ref(collection_name)
    if ref is None:
        source = {
            "tasks": _tasks_db,
            "plans": _plans_db,
            "collections": _collections_db,
            "documents": _documents_db,
            "study_materials": _study_materials_db,
            "session_history": _session_history,
        }
        d = source.get(collection_name)
        if d and doc_id in d:
            del d[doc_id]
        return
    ref.document(doc_id).delete()


# --- Cloud Storage Bucket ---

def get_storage_bucket():
    global STORAGE_available
    if not STORAGE_AVAILABLE:
        try:
            import google.cloud.storage
            STORAGE_AVAILABLE = True
        except ImportError:
            return None
    if STORAGE_AVAILABLE:
        import google.cloud.storage
        try:
            client = google.cloud.storage.Client()
        except EnvironmentError:
            return None
        bucket_name = os.environ.get("GCS_BUCKET_NAME", "")
        if not bucket_name:
            return None
        return client.bucket(bucket_name)
    return None
