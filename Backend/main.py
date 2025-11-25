# main.py — Your Ideal (FastAPI Backend) — DB version (Async SQLAlchemy, no auto-create)
# Python 3.10+
import os, json, uuid, calendar, bcrypt
from datetime import datetime, date
from typing import Optional, Dict, List

from fastapi import FastAPI, HTTPException, Header, APIRouter, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from dotenv import load_dotenv
from pydantic import BaseModel

# PDF / CSV
from io import BytesIO, StringIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# SQLAlchemy Async
from sqlalchemy import (
    Column, String, Integer, Date, Boolean, DateTime, Text, text, Numeric,
    ForeignKey, func, and_, update, select, delete
)
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from fastapi.responses import JSONResponse
import traceback
from fastapi.responses import Response
import io, csv

# -------------------------------------------------------------------
# App & CORS
# -------------------------------------------------------------------
app = FastAPI(title="Your Ideal API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

api = APIRouter(prefix="/api")

# -------------------------------------------------------------------
# DB Setup (no auto-create)
# -------------------------------------------------------------------
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# -------------------------------------------------------------------
# ORM Models (match your JSON keys / exact col names)
# -------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'yi'}
    # primary key = username (TEXT)
    username = Column(String, primary_key=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    emp_id = Column(String, nullable=True)
    role = Column(String, nullable=False, default="STAFF")
    enabled = Column(Boolean, nullable=False, default=True)
    permissions = Column(JSONB, nullable=True)  # same JSON as users.json

class Council(Base):
    __tablename__ = "councils"
    __table_args__ = {'schema': 'yi'}
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    postcode = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Enabled")
    createdAt = Column(DateTime, nullable=True)  # stores ISO timestamp


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {'schema': 'yi'}
    id = Column(String, primary_key=True)  # "0000045562"
    title = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    councilId = Column(Integer, ForeignKey("councils.id", ondelete="SET NULL"), nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    disabilities = Column(JSONB, nullable=True)      # list
    ethnicity_type = Column(String, nullable=True)
    ethnicity = Column(String, nullable=True)
    language = Column(String, nullable=True)
    status = Column(String, nullable=True)
    optional_fields = Column(JSONB, nullable=True)   # list
    profileImg = Column(String, nullable=True)
    created_by = Column(String, nullable=True)

class ClientAddress(Base):
    __tablename__ = "client_address"  # ✅ fixed
    __table_args__ = {'schema': 'yi'}
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"))
    house_no = Column(String)
    street = Column(String)
    city = Column(String)
    country = Column(String)
    postcode = Column(String)
    is_current = Column(Boolean, default=True)  # ✅ removed stray comma
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClientKin(Base):
    __tablename__ = "client_kin"  # ✅ fixed
    __table_args__ = {'schema': 'yi'}
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"))  # ✅ fixed extra ]
    kin_name = Column(String)
    kin_relationship = Column(String)
    house_no = Column(String)
    street = Column(String)
    city = Column(String)
    country = Column(String)
    postcode = Column(String)
    email = Column(String)
    is_current = Column(Boolean, default=True)  # ✅ removed stray comma
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
class Service(Base):
    __tablename__ = "services"
    __table_args__ = {'schema': 'yi'}
    # exact camelCase PK
    serviceId = Column(String, primary_key=True)  # "SV-<clientId>-0001"
    clientId = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    reference = Column(String, nullable=True)
    serviceType = Column(String, nullable=True)
    setupFee = Column(String, nullable=True)
    setupBudget = Column(Numeric, nullable=True)
    startDate = Column(Date, nullable=True)
    endDate = Column(Date, nullable=True)
    referredBy = Column(String, nullable=True)
    insurance = Column(String, nullable=True)
    monthlyFee = Column(Numeric, nullable=True)
    initialFee = Column(Numeric, nullable=True)
    pensionSetup = Column(Numeric, nullable=True)
    pensionFee = Column(Numeric, nullable=True)
    annualFee = Column(Numeric, nullable=True)
    yearEndFee = Column(Numeric, nullable=True)
    carerBudget = Column(Numeric, nullable=True)
    agencyBudget = Column(Numeric, nullable=True)
    carers = Column(JSONB, nullable=True)    # list
    agency = Column(JSONB, nullable=True)    # list
    pa = Column(JSONB, nullable=True)        # list
    optional = Column(JSONB, nullable=True)  # list
    created_by = Column(String, nullable=True)

class Statement(Base):
    __tablename__ = "statements"
    __table_args__ = {'schema': 'yi'}
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    serviceId = Column(String, ForeignKey("services.serviceId"), nullable=False)
    date = Column(Date)
    description = Column(Text)
    credit = Column(Numeric(12, 2), default=0)
    debit = Column(Numeric(12, 2), default=0)
    enteredBy = Column("enteredBy", String)  # ✅ exact field name retained
    created_at = Column(DateTime, default=datetime.utcnow)

class ServiceNote(Base):
    __tablename__ = "notes"
    __table_args__ = {'schema': 'yi'}
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    service_id = Column(String, ForeignKey("services.serviceId", ondelete="CASCADE"), nullable=False)
    note_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'schema': 'yi'}
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID string
    user = Column(String, nullable=True)
    action = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=True)

# -----------------------------
# Pydantic Models for Notes API
# -----------------------------
class NoteCreate(BaseModel):
    note_date: date
    description: str
    created_by: str

class NoteUpdate(BaseModel):
    note_date: date | None = None
    description: str | None = None
    created_by: str | None = None
    
# -------------------------------------------------------------------
# SUPER ADMINS from .env (in addition to DB users)
# -------------------------------------------------------------------
SUPER_ADMINS: List[Dict] = []

def _load_super_admins_from_env() -> List[Dict]:
    raw = os.getenv("SUPERADMINS", "").strip()
    if not raw:
        return []
    items = json.loads(raw)
    out = []
    for itm in items:
        username = (itm.get("username") or "").strip()
        password = itm.get("password") or ""
        name     = (itm.get("name") or username).strip()
        if not username or not password:
            continue
        pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        out.append({
            "username": username,
            "display_name": name,
            "role": "SUPER_ADMIN",
            "enabled": True,
            "password_hash": pw_hash,
            "emp_id": None,
            "permissions": {
                "council": True, "client": True, "service": True, "statement": True, "notes": True,
            },
        })
    return out

# -------------------------------------------------------------------
# Auth helpers
# -------------------------------------------------------------------
def _make_token(username: str) -> str:
    return f"demo_token_{username}"

def _username_from_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    t = auth_header.replace("Bearer ", "", 1)
    if t.startswith("demo_token_"):
        return t.replace("demo_token_", "", 1)
    return None

async def _find_user_by_username(db: AsyncSession, username: str) -> Optional[Dict]:
    # check SUPER_ADMIN first (in-memory)
    for u in SUPER_ADMINS:
        if u["username"].lower() == username.lower():
            return u
    # then DB
    row = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
    u = row.scalar_one_or_none()
    if not u:
        return None
    return {
        "username": u.username,
        "password_hash": u.password_hash,
        "display_name": u.display_name,
        "emp_id": u.emp_id,
        "role": u.role or "STAFF",
        "enabled": bool(u.enabled),
        "permissions": u.permissions or {},
    }

def _is_enabled(user: Dict) -> bool:
    return user.get("enabled", True) is True

def _role(user: Dict) -> str:
    return user.get("role", "STAFF")

def _check_password(user: Dict, plain_password: str) -> bool:
    stored_hash = user.get("password_hash")
    if stored_hash is None:
        return False
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode("utf-8")
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash)
    except Exception:
        return False

async def ensure_monthly_debits(db: AsyncSession):
    """
    Ensures that every active service has a monthly fee statement
    for each month between its startDate and endDate (or current date).
    """
    print("🔁 Running monthly fee auto-debit check...")

    today = date.today()
    res = await db.execute(select(Service))
    services = res.scalars().all()
    created = 0

    for svc in services:
        if not svc.monthlyFee or svc.monthlyFee == 0:
            continue

        start = svc.startDate or today
        end = svc.endDate or today
        if end < start:
            continue

        # iterate months from start → end/current
        year, month = start.year, start.month
        while (year < end.year) or (year == end.year and month <= end.month):
            month_date = date(year, month, 1)

            # skip future months
            if month_date > today:
                break

            # check if monthly fee already exists for this month
            res2 = await db.execute(
                select(func.count())
                .select_from(Statement)
                .where(
                    and_(
                        Statement.serviceId == svc.serviceId,
                        func.date_part("year", Statement.date) == year,
                        func.date_part("month", Statement.date) == month,
                        Statement.description.ilike("%monthly fee%"),
                    )
                )
            )
            already = res2.scalar_one()
            if not already:
                stmt = Statement(
                    id=str(uuid.uuid4()),
                    serviceId=svc.serviceId,
                    date=month_date,
                    description=f"Monthly Fee - {calendar.month_abbr[month]} {year}",
                    credit=0,
                    debit=float(svc.monthlyFee),
                    enteredBy="System",
                    created_at=datetime.utcnow(),
                )
                db.add(stmt)
                created += 1

            # next month
            if month == 12:
                year += 1
                month = 1
            else:
                month += 1

    await db.commit()
    print(f"✅ Auto-debit complete: {created} new monthly entries added.")

# -------------------------------------------------------------------
# LOGGING & NOTIFICATIONS (DB)
# -------------------------------------------------------------------
async def log_activity(db: AsyncSession, username: str, action: str, category: str = "general"):
    entry = Notification(
        user=username or "Unknown",
        action=action,
        category=category,
        timestamp=datetime.now(),
    )
    db.add(entry)
    await db.commit()

def get_username_from_request(request: Optional[Request]) -> str:
    if not request:
        return "System"
    auth = request.headers.get("Authorization")
    if not auth:
        return "System"
    if auth.startswith("Bearer "):
        token = auth.replace("Bearer ", "")
        # we only encode username in token; return it raw for logs
        user = _username_from_token(f"Bearer {token}")
        if user:
            return user
    return "System"


@app.exception_handler(Exception)
async def catch_all_exceptions(request: Request, exc: Exception):
    print("\n🔥 ERROR:", request.url)
    traceback.print_exc()
    return JSONResponse({"detail": "Internal Server Error"}, status_code=500)
    
# -------------------------------------------------------------------
# AUTH routes
# -------------------------------------------------------------------
@api.post("/auth/login")
async def login(payload: Dict, db: AsyncSession = Depends(get_db)):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    user = await _find_user_by_username(db, username)
    if not user or not _is_enabled(user) or not _check_password(user, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _make_token(user["username"])
    perms = user.get("permissions", {})
    public = {
        "username": user["username"],
        "display_name": user.get("display_name") or user["username"],
        "role": _role(user),
        "enabled": _is_enabled(user),
        "permissions": {
            "council": perms.get("council", False),
            "client": perms.get("client", False),
            "service": perms.get("service", False),
            "statement": perms.get("statement", False),
            "notes": perms.get("notes", False),
        },
        "emp_id": user.get("emp_id"),
    }
    return {"token": token, "user": public}


@api.get("/user/profile")
async def profile(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    username = _username_from_token(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Missing/Invalid token")
    user = await _find_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    perms = user.get("permissions", {})
    return {
        "username": user["username"],
        "display_name": user.get("display_name") or user["username"],
        "role": _role(user),
        "enabled": _is_enabled(user),
        "permissions": {
            "council": perms.get("council", False),
            "client": perms.get("client", False),
            "service": perms.get("service", False),
            "statement": perms.get("statement", False),
            "notes": perms.get("notes", False),
        },
        "emp_id": user.get("emp_id"),
    }

# -------------------------------------------------------------------
# COUNCILS
# -------------------------------------------------------------------
@api.get("/councils")
async def get_councils(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Council))
    rows = res.scalars().all()
    rows_sorted = sorted(rows, key=lambda c: (c.name or "").lower())
    return [
        {
            "id": c.id,
            "name": c.name,
            "address": c.address,
            "city": c.city,
            "postcode": c.postcode,
            "status": c.status or "Enabled",
            "createdAt": (c.createdAt.isoformat(timespec="seconds") if c.createdAt else None),
        } for c in rows_sorted
    ]

@api.get("/councils/enabled")
async def get_enabled_councils(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Council).where(Council.status == "Enabled"))
    rows = res.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "address": c.address,
            "city": c.city,
            "postcode": c.postcode,
            "status": c.status or "Enabled",
            "createdAt": (c.createdAt.isoformat(timespec="seconds") if c.createdAt else None),
        } for c in rows
    ]

@api.post("/councils")
async def create_council(data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Council name is required")
    existing = await db.execute(select(Council).where(func.lower(Council.name) == name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Council already exists")

    # compute new id like your JSON increment
    res = await db.execute(select(func.coalesce(func.max(Council.id), 0)))
    new_id = (res.scalar_one() or 0) + 1

    item = Council(
        id=new_id,
        name=name,
        address=(data.get("address") or "").strip(),
        city=(data.get("city") or "").strip(),
        postcode=(data.get("postcode") or "").strip(),
        status=data.get("status") or "Enabled",
        createdAt=datetime.now(),
    )
    db.add(item)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Council '{name}' created", "council")
    return {"message": "Council created", "council": {
        "id": item.id, "name": item.name, "address": item.address, "city": item.city,
        "postcode": item.postcode, "status": item.status, "createdAt": item.createdAt.isoformat(timespec="seconds"),
    }}

@api.put("/councils/{cid}")
async def update_council(cid: int, data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    row = await db.get(Council, cid)
    if not row:
        raise HTTPException(status_code=404, detail="Council not found")
    if "name" in data:
        nm = (data["name"] or "").strip()
        if not nm:
            raise HTTPException(status_code=400, detail="Council name is required")
        exists = await db.execute(
            select(Council).where(Council.id != cid).where(func.lower(Council.name) == nm.lower())
        )
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Council already exists")
        row.name = nm
    for k in ("address", "city", "postcode", "status"):
        if k in data:
            v = data[k]
            setattr(row, k, (v or "").strip() if isinstance(v, str) else v)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Council '{row.name}' update", "council")
    return {"message": "Council updated", "council": {
        "id": row.id, "name": row.name, "address": row.address, "city": row.city,
        "postcode": row.postcode, "status": row.status, "createdAt": row.createdAt.isoformat(timespec="seconds") if row.createdAt else None
    }}

@api.patch("/councils/{cid}/status")
async def set_council_status(cid: int, data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    row = await db.get(Council, cid)
    if not row:
        raise HTTPException(status_code=404, detail="Council not found")
    status = data.get("status")
    if status not in ("Enabled", "Disabled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    row.status = status
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Council '{row.name}' status changed to '{status}'", "council")
    return {"message": "Status updated", "council": {
        "id": row.id, "name": row.name, "address": row.address, "city": row.city,
        "postcode": row.postcode, "status": row.status, "createdAt": row.createdAt.isoformat(timespec="seconds") if row.createdAt else None
    }}

@api.delete("/councils/{cid}")
async def delete_council(cid: int, request: Request, db: AsyncSession = Depends(get_db)):
    row = await db.get(Council, cid)
    if not row:
        raise HTTPException(status_code=404, detail="Council not found")
    await db.delete(row)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Council '{cid}'deleted", "council")
    return {"message": "Council deleted"}

# -------------------------------------------------------------------
# CLIENT HELPERS
# -------------------------------------------------------------------
def _parse_date_any(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    return None


def _format_address_parts(house_no: Optional[str], street: Optional[str],
                          city: Optional[str], country: Optional[str],
                          postcode: Optional[str]) -> str:
    parts = [house_no, street, city, country, postcode]
    parts = [p for p in parts if p]
    return ", ".join(parts)


async def _get_latest_address(db: AsyncSession, client_id: str) -> Optional[ClientAddress]:
    res = await db.execute(
        select(ClientAddress)
        .where(ClientAddress.client_id == client_id)
        .order_by(ClientAddress.created_at.desc())
        .limit(1)
    )
    return res.scalars().first()


async def _get_latest_kin(db: AsyncSession, client_id: str) -> Optional[ClientKin]:
    res = await db.execute(
        select(ClientKin)
        .where(ClientKin.client_id == client_id)
        .order_by(ClientKin.created_at.desc())
        .limit(1)
    )
    return res.scalars().first()


async def _client_to_json(db: AsyncSession, c: Client) -> Dict:
    council = await db.get(Council, c.councilId) if c.councilId else None
    addr = await _get_latest_address(db, c.id)
    kin = await _get_latest_kin(db, c.id)

    address_str = _format_address_parts(
        getattr(addr, "house_no", None),
        getattr(addr, "street", None),
        getattr(addr, "city", None),
        getattr(addr, "country", None),
        getattr(addr, "postcode", None),
    ) if addr else ""

    kin_address_str = _format_address_parts(
        getattr(kin, "house_no", None),
        getattr(kin, "street", None),
        getattr(kin, "city", None),
        getattr(kin, "country", None),
        getattr(kin, "postcode", None),
    ) if kin else ""

    return {
        "id": c.id,
        "title": c.title,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "dob": c.dob.isoformat() if c.dob else None,
        "gender": c.gender,
        "councilId": c.councilId,
        "phone": c.phone,
        "email": c.email,
        "address": address_str,                 # computed latest address
        "disabilities": c.disabilities or [],
        "kin_name": kin.kin_name if kin else None,
        "kin_relation": kin.kin_relationship if kin else None,
        "kin_relation_other": None,            # handled by frontend via free-text relationship
        "kin_address": kin_address_str,
        "kin_email": kin.email if kin else None,
        "ethnicity_type": c.ethnicity_type,
        "ethnicity": c.ethnicity,
        "language": c.language,
        "status": c.status,
        "optional_fields": c.optional_fields or [],
        "profileImg": c.profileImg or "../images/profile.png",
        "council": (council.name if council else "Unknown"),
        "created_by": c.created_by,
    }

# -------------------------------------------------------------------
# CLIENT ROUTES
# -------------------------------------------------------------------
@api.get("/clients")
async def get_clients(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Client))
    rows = res.scalars().all()
    out = []
    for c in rows:
        out.append(await _client_to_json(db, c))
    return out


@api.get("/clients/{client_id}")
async def get_client_by_id(client_id: str, db: AsyncSession = Depends(get_db)):
    c = await db.get(Client, client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return await _client_to_json(db, c)


# ========= Addresses (All) =========
@api.get("/clients/{client_id}/addresses")
async def get_client_addresses(client_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ClientAddress)
        .where(ClientAddress.client_id == client_id)
        .order_by(ClientAddress.created_at.desc())
    )
    rows = res.scalars().all()
    return [
        {
            "id": str(a.id),
            "client_id": a.client_id,
            "house_no": a.house_no,
            "street": a.street,
            "city": a.city,
            "country": a.country,
            "postcode": a.postcode,
            "is_current": a.is_current,
            "created_by": a.created_by,
            "created_at": a.created_at.isoformat(timespec="seconds") if a.created_at else None,
        }
        for a in rows
    ]


# ========= Current / History Addresses =========
@api.get("/clients/{client_id}/addresses/current")
async def get_current_address(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClientAddress)
        .where(ClientAddress.client_id == client_id)
        .where(ClientAddress.is_current == True)
        .order_by(ClientAddress.created_at.desc())
        .limit(1)
    )
    addr = result.scalar_one_or_none()
    if not addr:
        return {}
    return {
        "id": str(addr.id),
        "client_id": addr.client_id,
        "house_no": addr.house_no,
        "street": addr.street,
        "city": addr.city,
        "country": addr.country,
        "postcode": addr.postcode,
        "created_at": addr.created_at.isoformat() if addr.created_at else None,
        "is_current": addr.is_current,
    }


@api.get("/clients/{client_id}/addresses/history")
async def get_address_history(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClientAddress)
        .where(ClientAddress.client_id == client_id)
        .where(ClientAddress.is_current == False)
        .order_by(ClientAddress.created_at.desc())
    )
    addresses = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "client_id": a.client_id,
            "house_no": a.house_no,
            "street": a.street,
            "city": a.city,
            "country": a.country,
            "postcode": a.postcode,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "is_current": a.is_current,
        }
        for a in addresses
    ]


# ========= Add address (move old current to history) =========
@api.post("/clients/{client_id}/addresses")
async def add_client_address(client_id: str, data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    username = get_username_from_request(request)

    # 1. Move previous current to history
    await db.execute(
        update(ClientAddress)
        .where(ClientAddress.client_id == client_id)
        .where(ClientAddress.is_current == True)
        .values(is_current=False)
    )

    # 2. Insert new address as current
    addr = ClientAddress(
        client_id=client_id,
        house_no=(data.get("house_no") or data.get("house_number")),
        street=(data.get("street") or data.get("street_name")),
        city=data.get("city"),
        country=data.get("country"),
        postcode=data.get("postcode"),
        is_current=True,
        created_by=username,
        created_at=datetime.utcnow(),
    )

    db.add(addr)
    await db.commit()
    await db.refresh(addr)

    return {
        "message": "New address set as current",
        "address": {
            "id": str(addr.id),
            "client_id": addr.client_id,
            "house_no": addr.house_no,
            "street": addr.street,
            "city": addr.city,
            "country": addr.country,
            "postcode": addr.postcode,
            "is_current": addr.is_current,
            "created_at": addr.created_at.isoformat() if addr.created_at else None,
        },
    }


# ========= Kins (All) =========
@api.get("/clients/{client_id}/kins")
async def get_client_kins(client_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ClientKin)
        .where(ClientKin.client_id == client_id)
        .order_by(ClientKin.created_at.desc())
    )
    rows = res.scalars().all()
    return [
        {
            "id": str(k.id),
            "client_id": k.client_id,
            "kin_name": k.kin_name,
            "kin_relationship": k.kin_relationship,
            "house_no": k.house_no,
            "street": k.street,
            "city": k.city,
            "country": k.country,
            "postcode": k.postcode,
            "email": k.email,
            "is_current": k.is_current,
            "created_by": k.created_by,
            "created_at": k.created_at.isoformat(timespec="seconds") if k.created_at else None,
        }
        for k in rows
    ]


# ========= Current / History Kin =========
@api.get("/clients/{client_id}/kins/current")
async def get_current_kin(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClientKin)
        .where(ClientKin.client_id == client_id)
        .where(ClientKin.is_current == True)
        .order_by(ClientKin.created_at.desc())
        .limit(1)
    )
    kin = result.scalar_one_or_none()
    if not kin:
        return {}
    return {
        "id": str(kin.id),
        "client_id": kin.client_id,
        "kin_name": kin.kin_name,
        "kin_relationship": kin.kin_relationship,
        "house_no": kin.house_no,
        "street": kin.street,
        "city": kin.city,
        "country": kin.country,
        "postcode": kin.postcode,
        "email": kin.email,
        "created_at": kin.created_at.isoformat() if kin.created_at else None,
        "is_current": kin.is_current,
    }


@api.get("/clients/{client_id}/kins/history")
async def get_kin_history(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClientKin)
        .where(ClientKin.client_id == client_id)
        .where(ClientKin.is_current == False)
        .order_by(ClientKin.created_at.desc())
    )
    kins = result.scalars().all()
    return [
        {
            "id": str(k.id),
            "client_id": k.client_id,
            "kin_name": k.kin_name,
            "kin_relationship": k.kin_relationship,
            "house_no": k.house_no,
            "street": k.street,
            "city": k.city,
            "country": k.country,
            "postcode": k.postcode,
            "email": k.email,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "is_current": k.is_current,
        }
        for k in kins
    ]


# ========= Add kin (move old current to history) =========
@api.post("/clients/{client_id}/kins")
async def add_client_kin(client_id: str, data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    username = get_username_from_request(request)

    # 1. Move previous current kin to history
    await db.execute(
        update(ClientKin)
        .where(ClientKin.client_id == client_id)
        .where(ClientKin.is_current == True)
        .values(is_current=False)
    )

    # 2. Insert new kin as current
    kin = ClientKin(
        client_id=client_id,
        kin_name=(data.get("kin_name") or data.get("name")),
        kin_relationship=(data.get("kin_relationship") or data.get("relationship")),
        house_no=(data.get("house_no") or data.get("house_number")),
        street=(data.get("street") or data.get("street_name")),
        city=data.get("city"),
        country=data.get("country"),
        postcode=data.get("postcode"),
        email=data.get("email"),
        is_current=True,
        created_by=username,
        created_at=datetime.utcnow(),
    )

    db.add(kin)
    await db.commit()
    await db.refresh(kin)

    return {
        "message": "Next of kin updated",
        "kin": {
            "id": str(kin.id),
            "client_id": kin.client_id,
            "kin_name": kin.kin_name,
            "kin_relationship": kin.kin_relationship,
            "house_no": kin.house_no,
            "street": kin.street,
            "city": kin.city,
            "country": kin.country,
            "postcode": kin.postcode,
            "email": kin.email,
            "is_current": kin.is_current,
            "created_at": kin.created_at.isoformat() if kin.created_at else None,
        },
    }


# ========= Add client (with initial address & kin) =========
@api.post("/clients")
async def add_client(data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    cid = data.get("id")
    if not cid:
        res = await db.execute(select(Client.id))
        ids = res.scalars().all()
        numeric = [int(x) for x in ids if x.isdigit()]
        next_id = (max(numeric) + 1) if numeric else 1
        cid = f"{next_id:010d}"
        data["id"] = cid
    else:
        exists = await db.get(Client, cid)
        if exists:
            raise HTTPException(status_code=400, detail="Client ID already exists")

    username = get_username_from_request(request)

    c = Client(
        id=cid,
        title=data.get("title"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        dob=_parse_date_any(data.get("dob")),
        gender=data.get("gender"),
        councilId=data.get("councilId"),
        phone=data.get("phone"),
        email=data.get("email"),
        disabilities=data.get("disabilities") or [],
        ethnicity_type=data.get("ethnicity_type"),
        ethnicity=data.get("ethnicity"),
        language=data.get("language"),
        status=data.get("status"),
        optional_fields=data.get("optional_fields") or [],
        profileImg=data.get("profileImg") or "../images/profile.png",
        created_by=username,
    )
    db.add(c)
    await db.commit()

    # initial address
    addr_house = (data.get("address_house_number") or "").strip()
    addr_street = (data.get("address_street_name") or "").strip()
    addr_city = (data.get("address_city") or "").strip()
    addr_country = (data.get("address_country") or "").strip()
    addr_postcode = (data.get("address_postcode") or "").strip()

    if any([addr_house, addr_street, addr_city, addr_country, addr_postcode]):
        addr = ClientAddress(
            client_id=cid,
            house_no=addr_house or None,
            street=addr_street or None,
            city=addr_city or None,
            country=addr_country or None,
            postcode=addr_postcode or None,
            is_current=True,
            created_by=username,
            created_at=datetime.utcnow(),
        )
        db.add(addr)

    # initial kin
    kin_name = (data.get("kin_name") or "").strip()
    kin_rel = (data.get("kin_relationship") or "").strip()
    kin_house = (data.get("kin_house_number") or "").strip()
    kin_street = (data.get("kin_street_name") or "").strip()
    kin_city = (data.get("kin_city") or "").strip()
    kin_country = (data.get("kin_country") or "").strip()
    kin_postcode = (data.get("kin_postcode") or "").strip()
    kin_email = (data.get("kin_email") or "").strip()

    if any([kin_name, kin_rel, kin_house, kin_street, kin_city, kin_country, kin_postcode, kin_email]):
        kin = ClientKin(
            client_id=cid,
            kin_name=kin_name or None,
            kin_relationship=kin_rel or None,
            house_no=kin_house or None,
            street=kin_street or None,
            city=kin_city or None,
            country=kin_country or None,
            postcode=kin_postcode or None,
            email=kin_email or None,
            is_current=True,
            created_by=username,
            created_at=datetime.utcnow(),
        )
        db.add(kin)

    await db.commit()
    await log_activity(
        db,
        username,
        f"Client '{data.get('first_name','')} {data.get('last_name','')}' added",
        "client",
    )

    client_json = await _client_to_json(db, c)
    return {"message": "Client added successfully", "client": client_json}


# ========= Update client (basic fields) =========
@api.put("/clients/{client_id}")
async def update_client(client_id: str, data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    c = await db.get(Client, client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")

    for k in (
        "title",
        "first_name",
        "last_name",
        "gender",
        "councilId",
        "phone",
        "email",
        "ethnicity_type",
        "ethnicity",
        "language",
        "status",
        "profileImg",
    ):
        if k in data:
            setattr(c, k, data.get(k))
    if "dob" in data:
        c.dob = _parse_date_any(data.get("dob"))
    if "disabilities" in data:
        c.disabilities = data.get("disabilities") or []
    if "optional_fields" in data:
        c.optional_fields = data.get("optional_fields") or []

    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Client '{client_id}' updated", "client")

    merged = await _client_to_json(db, c)
    return {"message": "Client updated successfully", "client": merged}


# ========= Edit a specific address row (current or history) =========
@api.put("/clients/{client_id}/addresses/{addr_id}")
async def update_client_address(
    client_id: str,
    addr_id: str,
    data: Dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        addr_uuid = uuid.UUID(addr_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid address id")

    addr = await db.get(ClientAddress, addr_uuid)
    if not addr or addr.client_id != client_id:
        raise HTTPException(status_code=404, detail="Address not found")

    if "house_no" in data or "house_number" in data:
        addr.house_no = (data.get("house_no") or data.get("house_number") or "").strip() or None
    if "street" in data or "street_name" in data:
        addr.street = (data.get("street") or data.get("street_name") or "").strip() or None
    if "city" in data:
        addr.city = (data.get("city") or "").strip() or None
    if "country" in data:
        addr.country = (data.get("country") or "").strip() or None
    if "postcode" in data:
        addr.postcode = (data.get("postcode") or "").strip() or None

    await db.commit()
    await db.refresh(addr)

    await log_activity(
        db,
        get_username_from_request(request),
        f"Address '{addr_id}' updated for client '{client_id}'",
        "client",
    )

    return {
        "message": "Address updated",
        "address": {
            "id": str(addr.id),
            "client_id": addr.client_id,
            "house_no": addr.house_no,
            "street": addr.street,
            "city": addr.city,
            "country": addr.country,
            "postcode": addr.postcode,
            "is_current": addr.is_current,
            "created_by": addr.created_by,
            "created_at": addr.created_at.isoformat(timespec="seconds") if addr.created_at else None,
        },
    }


# ========= Edit a specific kin row (current or history) =========
@api.put("/clients/{client_id}/kins/{kin_id}")
async def update_client_kin(
    client_id: str,
    kin_id: str,
    data: Dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        kin_uuid = uuid.UUID(kin_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid kin id")

    kin = await db.get(ClientKin, kin_uuid)
    if not kin or kin.client_id != client_id:
        raise HTTPException(status_code=404, detail="Kin not found")

    if "kin_name" in data or "name" in data:
        kin.kin_name = (data.get("kin_name") or data.get("name") or "").strip() or None
    if "kin_relationship" in data or "relationship" in data:
        kin.kin_relationship = (data.get("kin_relationship") or data.get("relationship") or "").strip() or None
    if "house_no" in data or "house_number" in data:
        kin.house_no = (data.get("house_no") or data.get("house_number") or "").strip() or None
    if "street" in data or "street_name" in data:
        kin.street = (data.get("street") or data.get("street_name") or "").strip() or None
    if "city" in data:
        kin.city = (data.get("city") or "").strip() or None
    if "country" in data:
        kin.country = (data.get("country") or "").strip() or None
    if "postcode" in data:
        kin.postcode = (data.get("postcode") or "").strip() or None
    if "email" in data:
        kin.email = (data.get("email") or "").strip() or None

    await db.commit()
    await db.refresh(kin)

    await log_activity(
        db,
        get_username_from_request(request),
        f"Kin '{kin_id}' updated for client '{client_id}'",
        "client",
    )

    return {
        "message": "Kin updated",
        "kin": {
            "id": str(kin.id),
            "client_id": kin.client_id,
            "kin_name": kin.kin_name,
            "kin_relationship": kin.kin_relationship,
            "house_no": kin.house_no,
            "street": kin.street,
            "city": kin.city,
            "country": kin.country,
            "postcode": kin.postcode,
            "email": kin.email,
            "is_current": kin.is_current,
            "created_by": kin.created_by,
            "created_at": kin.created_at.isoformat(timespec="seconds") if kin.created_at else None,
        },
    }


@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    c = await db.get(Client, client_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(c)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Client '{client_id}' deleted", "client")
    return {"message": "Client deleted successfully"}
# -------------------------------------------------------------------
# SERVICES
# -------------------------------------------------------------------
def _norm(s: str) -> str:
    return (s or "").strip().lower()

async def validate_reference(db: AsyncSession, client_id: str, category: str, reference: str, ignore_service_id: Optional[str] = None):
    if not reference:
        return
    q = select(Service).where(func.lower(Service.reference) == reference.lower())
    res = await db.execute(q)
    services = res.scalars().all()
    for s in services:
        if ignore_service_id and s.serviceId == ignore_service_id:
            continue
        if _norm(s.clientId) != _norm(client_id):
            raise HTTPException(status_code=400, detail="YI Reference is already used by another client")
        if _norm(s.referredBy) != _norm(category):
            raise HTTPException(status_code=400, detail="YI Reference already exists for this client under a different category.")

def _ddmmyyyy(d: Optional[date]) -> str:
    return d.strftime("%d/%m/%Y") if d else ""

def _to_date_or_none(s: Optional[str]) -> Optional[date]:
    return _parse_date_any(s)

def _service_to_json(svc: Service) -> Dict:
    return {
        "serviceId": svc.serviceId,
        "clientId": svc.clientId,
        "reference": svc.reference,
        "serviceType": svc.serviceType,
        "setupFee": svc.setupFee,
        "setupBudget": float(svc.setupBudget) if svc.setupBudget is not None else 0,
        "startDate": _ddmmyyyy(svc.startDate),
        "endDate": _ddmmyyyy(svc.endDate),
        "referredBy": svc.referredBy,
        "insurance": svc.insurance,
        "monthlyFee": float(svc.monthlyFee) if svc.monthlyFee is not None else 0,
        "initialFee": float(svc.initialFee) if svc.initialFee is not None else 0,
        "pensionSetup": float(svc.pensionSetup) if svc.pensionSetup is not None else 0,
        "pensionFee": float(svc.pensionFee) if svc.pensionFee is not None else 0,
        "annualFee": float(svc.annualFee) if svc.annualFee is not None else 0,
        "yearEndFee": float(svc.yearEndFee) if svc.yearEndFee is not None else 0,
        "carerBudget": float(svc.carerBudget) if svc.carerBudget is not None else 0,
        "agencyBudget": float(svc.agencyBudget) if svc.agencyBudget is not None else 0,
        "carers": svc.carers or [],
        "agency": svc.agency or [],
        "pa": svc.pa or [],
        "optional": svc.optional or [],
        # snake mirrors (for your frontend helpers)
        "service_id": svc.serviceId,
        "client_id": svc.clientId,
        "service_type": svc.serviceType,
        "setup_fee": svc.setupFee,
        "setup_budget": float(svc.setupBudget) if svc.setupBudget is not None else 0,
        "start_date": _ddmmyyyy(svc.startDate),
        "end_date": _ddmmyyyy(svc.endDate),
        "referred_by": svc.referredBy,
    }

def month_iter(start: date, end: date):
    cur = date(start.year, start.month, 1)
    last = date(end.year, end.month, 1)
    while cur <= last:
        yield cur
        if cur.month == 12:
            cur = date(cur.year + 1, 1, 1)
        else:
            cur = date(cur.year, cur.month + 1, 1)

def label_month(d: date) -> str:
    return f"{d.strftime('%b')} {d.strftime('%y')}"

def get_service_start_date_dict(service: Dict) -> date:
    s = service.get("startDate") or service.get("start_date")
    d = _parse_date_any(s)
    if not d:
        d = date.today()
    return d

def generate_one_time_entries_raw(service: Dict, entered_by="System"):
    start_dt = get_service_start_date_dict(service)
    start_str = start_dt.strftime("%d/%m/%Y")
    start_year = start_dt.year
    end_year = start_year + 1
    setup_name = service.get("setupFee") or ""
    out = []

    def push(desc, debit):
        if debit and float(debit) > 0:
            out.append({
                "date": start_str,
                "description": desc,
                "credit": 0.0,
                "debit": float(debit),
                "enteredBy": entered_by,
            })

    if service.get("initialFee"):
        push(f"{setup_name}", service["initialFee"])

    if "Payroll" in (setup_name or ""):
        if service.get("pensionSetup"): push("Pension Setup Fee", service["pensionSetup"])
        if service.get("pensionFee"):   push(f"Annual Pension Fee {start_year}-{end_year}", service["pensionFee"])
        if service.get("yearEndFee"):   push(f"Annual Year End Fee {start_year}-{end_year}", service["yearEndFee"])
    return out

def generate_monthly_entries_to_now_raw(service: Dict, entered_by="System"):
    mf = float(service.get("monthlyFee") or 0)
    if mf <= 0:
        return []
    start_d = get_service_start_date_dict(service).replace(day=1)
    today = date.today()
    out = []
    for m1 in month_iter(start_d, today):
        out.append({
            "date": f"{m1.strftime('%Y-%m')}-01",
            "description": f"Monthly Fee - {label_month(m1)}",
            "credit": 0.0,
            "debit": mf,
            "enteredBy": entered_by,
        })
    return out

@api.post("/services")
async def add_service(data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    client_id = data.get("clientId")
    if not client_id:
        raise HTTPException(status_code=400, detail="Missing clientId")

    # ensure client exists
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    referred_by = data.get("referredBy") or ""
    client_reference = data.get("reference", "")

    await validate_reference(db, client_id=client_id, category=referred_by, reference=client_reference)

    # determine sequence number for serviceId
    res = await db.execute(select(Service.serviceId).where(Service.clientId == client_id))
    existing_ids = [r for (r,) in res.all()] if hasattr(res, "all") else res.scalars().all()
    seq = 1
    if existing_ids:
        # find max suffix ####
        suffixes = []
        for sid in existing_ids:
            try:
                suffixes.append(int(sid.split("-")[-1]))
            except Exception:
                pass
        seq = (max(suffixes) + 1) if suffixes else (len(existing_ids) + 1)
    new_service_id = f"SV-{client_id}-{seq:04d}"

    svc = Service(
        serviceId=new_service_id,
        clientId=client_id,
        reference=client_reference or None,
        serviceType=data.get("serviceType"),
        setupFee=data.get("setupFee"),
        setupBudget=data.get("setupBudget"),
        startDate=_to_date_or_none(data.get("startDate")) or date.today(),
        endDate=_to_date_or_none(data.get("endDate")),
        referredBy=referred_by or None,
        insurance=data.get("insurance") or None,
        monthlyFee=data.get("monthlyFee"),
        initialFee=data.get("initialFee"),
        pensionSetup=data.get("pensionSetup"),
        pensionFee=data.get("pensionFee"),
        annualFee=data.get("annualFee"),
        yearEndFee=data.get("yearEndFee"),
        carerBudget=data.get("carerBudget"),
        agencyBudget=data.get("agencyBudget"),
        carers=data.get("carers") or [],
        agency=data.get("agency") or [],
        pa=data.get("pa") or [],
        optional=data.get("optional") or [],
        created_by=get_username_from_request(request),
    )
    db.add(svc)
    await db.commit()

    # Seed statements (like your JSON logic)
    seed_dict = {
        "serviceId": svc.serviceId,
        "clientId": svc.clientId,
        "serviceType": svc.serviceType,
        "setupFee": svc.setupFee,
        "setupBudget": float(svc.setupBudget or 0),
        "startDate": svc.startDate.strftime("%Y-%m-%d") if svc.startDate else "",
        "endDate": svc.endDate.strftime("%Y-%m-%d") if svc.endDate else "",
        "referredBy": svc.referredBy,
        "insurance": svc.insurance,
        "monthlyFee": float(svc.monthlyFee or 0),
        "initialFee": float(svc.initialFee or 0),
        "pensionSetup": float(svc.pensionSetup or 0),
        "pensionFee": float(svc.pensionFee or 0),
        "annualFee": float(svc.annualFee or 0),
        "yearEndFee": float(svc.yearEndFee or 0),
        "carerBudget": float(svc.carerBudget or 0),
        "agencyBudget": float(svc.agencyBudget or 0),
    }
    initial_rows = generate_one_time_entries_raw(seed_dict, "System") + generate_monthly_entries_to_now_raw(seed_dict, "System")

    if initial_rows:
        for s in initial_rows:
            stmt = Statement(
                id=str(uuid.uuid4()),
                serviceId=svc.serviceId,
                date=_parse_date_any(s.get("date")),
                description=s.get("description") or "",
                credit=float(s.get("credit") or 0),
                debit=float(s.get("debit") or 0),
                enteredBy="System",
            )
            db.add(stmt)
        await db.commit()

    await log_activity(db, get_username_from_request(request), f"Service '{svc.serviceId}' added for client {svc.clientId}", "service")
    return {"message": "Service created", "service": _service_to_json(svc)}

@api.get("/services")
async def get_services(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Service))
    rows = res.scalars().all()
    return [_service_to_json(r) for r in rows]

@api.get("/services/{service_id}")
async def get_service(service_id: str, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return _service_to_json(svc)

@api.put("/services/{service_id}")
async def update_service(service_id: str, data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    new_ref = data.get("reference", svc.reference)
    new_cat = data.get("referredBy", svc.referredBy)
    await validate_reference(db, client_id=svc.clientId, category=new_cat, reference=new_ref, ignore_service_id=service_id)

    # map updates
    fields = [
        "reference","serviceType","setupFee","setupBudget","referredBy","insurance",
        "monthlyFee","initialFee","pensionSetup","pensionFee","annualFee","yearEndFee",
        "carerBudget","agencyBudget","carers","agency","pa","optional"
    ]
    for f in fields:
        if f in data:
            setattr(svc, f, data.get(f))
    if "startDate" in data:
        svc.startDate = _to_date_or_none(data.get("startDate"))
    if "endDate" in data:
        svc.endDate = _to_date_or_none(data.get("endDate"))

    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Service '{service_id}' updated", "service")
    return {"message": "Service updated", "service": _service_to_json(svc)}

@api.delete("/services/{service_id}")
async def delete_service(service_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.delete(svc)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Service '{service_id}' deleted", "service")
    return {"message": "Service deleted"}

# -------------------------------------------------------------------
# USER MANAGEMENT (SUPER ADMIN ONLY)
# -------------------------------------------------------------------
async def require_super_admin(authorization: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_db)):
    username = _username_from_token(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Missing/Invalid token")
    user = await _find_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    if _role(user) != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Access denied")
    return user

class PermissionCRUD(BaseModel):
    view: bool = False
    add: bool = False
    edit: bool = False
    delete: bool = False

class UserCreate(BaseModel):
    emp_name: str
    emp_id: str
    username: str
    password: str
    enabled: bool = True
    permissions: Optional[Dict[str, PermissionCRUD]] = {}

class UserUpdate(BaseModel):
    username: Optional[str] = None
    emp_name: Optional[str] = None
    emp_id: Optional[str] = None
    password: Optional[str] = None
    enabled: Optional[bool] = None
    permissions: Optional[Dict[str, PermissionCRUD]] = None

@api.get("/users")
async def list_users(user=Depends(require_super_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User))
    users = res.scalars().all()
    public_users = []
    for u in users:
        perms = u.permissions or {}
        public_users.append({
            "username": u.username,
            "display_name": u.display_name or u.username,
            "emp_id": u.emp_id,
            "role": u.role or "STAFF",
            "enabled": bool(u.enabled),
            "permissions": {
                "council": (perms.get("council", False) if isinstance(perms.get("council"), bool) else perms.get("council", {}).get("view", False)) or perms.get("council", False),
                "client":  (perms.get("client", False)  if isinstance(perms.get("client"), bool)  else perms.get("client", {}).get("view", False))  or perms.get("client", False),
                "service": (perms.get("service", False) if isinstance(perms.get("service"), bool) else perms.get("service", {}).get("view", False)) or perms.get("service", False),
                "statement": (perms.get("statement", False) if isinstance(perms.get("statement"), bool) else perms.get("statement", {}).get("view", False)) or perms.get("statement", False),
                "notes": (perms.get("notes", False) if isinstance(perms.get("notes"), bool) else perms.get("notes", {}).get("view", False)) or perms.get("notes", False),
            },
        })
    return public_users

@api.post("/users")
async def create_user(new_user: UserCreate, user=Depends(require_super_admin), db: AsyncSession = Depends(get_db)):
    username = new_user.username.strip().lower()
    exists = await db.get(User, username)
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    pw_hash = bcrypt.hashpw(new_user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # flatten PermissionCRUD -> dict
    raw_perms = {}
    for module, perm in (new_user.permissions or {}).items():
        if isinstance(perm, PermissionCRUD):
            raw_perms[module] = perm.dict()
        elif isinstance(perm, dict):
            raw_perms[module] = perm
        else:
            raw_perms[module] = {"view": False, "add": False, "edit": False, "delete": False}

    try:
        is_admin = all(all(v for v in section.values()) for section in raw_perms.values())
    except Exception:
        is_admin = False
    role = "ADMIN" if is_admin else "STAFF"

    record = User(
        username=username,
        password_hash=pw_hash,
        display_name=new_user.emp_name.strip(),
        emp_id=new_user.emp_id.strip(),
        role=role,
        enabled=new_user.enabled,
        permissions=raw_perms,
    )
    db.add(record)
    await db.commit()
    return {"message": "User created successfully", "user": {
        "username": record.username, "display_name": record.display_name, "emp_id": record.emp_id,
        "role": record.role, "enabled": record.enabled, "permissions": record.permissions
    }}

@api.put("/users/{username}")
async def update_user(username: str, data: UserUpdate, user=Depends(require_super_admin), db: AsyncSession = Depends(get_db)):
    target = await db.get(User, username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    new_username = data.username.strip().lower() if getattr(data, "username", None) else username
    if new_username != username:
        conflict = await db.get(User, new_username)
        if conflict:
            raise HTTPException(status_code=400, detail="New username already exists")
        # change PK: create new row then delete old
        new_user_row = User(
            username=new_username,
            password_hash=target.password_hash,
            display_name=target.display_name,
            emp_id=target.emp_id,
            role=target.role,
            enabled=target.enabled,
            permissions=target.permissions,
        )
        db.add(new_user_row)
        await db.flush()
        await db.delete(target)
        target = new_user_row

    if data.emp_name is not None:
        target.display_name = data.emp_name.strip()
    if data.emp_id is not None:
        target.emp_id = data.emp_id.strip()
    if data.enabled is not None:
        target.enabled = bool(data.enabled)
    if data.permissions is not None:
        new_perms = {}
        for module, perm in data.permissions.items():
            if isinstance(perm, PermissionCRUD):
                new_perms[module] = perm.dict()
            elif isinstance(perm, dict):
                new_perms[module] = perm
            else:
                new_perms[module] = {"view": False, "add": False, "edit": False, "delete": False}
        target.permissions = new_perms
        try:
            is_admin = all(all(v for v in section.values()) for section in new_perms.values())
        except Exception:
            is_admin = False
        target.role = "ADMIN" if is_admin else "STAFF"
    if data.password:
        target.password_hash = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    await db.commit()
    return {"message": "User updated successfully", "user": {
        "username": target.username, "display_name": target.display_name, "emp_id": target.emp_id,
        "role": target.role, "enabled": target.enabled, "permissions": target.permissions
    }}

@api.patch("/users/{username}/status")
async def toggle_user_status(username: str, data: dict, user=Depends(require_super_admin), db: AsyncSession = Depends(get_db)):
    target = await db.get(User, username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.enabled = bool(data.get("enabled", True))
    await db.commit()
    return {"message": "User status updated", "enabled": target.enabled}

@api.delete("/users/{username}")
async def delete_user(username: str, user=Depends(require_super_admin), db: AsyncSession = Depends(get_db)):
    target = await db.get(User, username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(target)
    await db.commit()
    return {"message": f"User '{username}' deleted"}

# -------------------------------------------------------------------
# Statement helpers (PDF/CSV + budget log)
# -------------------------------------------------------------------
def first_day_of_month(d: date) -> date:
    return date(d.year, d.month, 1)

def last_day_of_month(d: date) -> date:
    return date(d.year, d.month, calendar.monthrange(d.year, d.month)[1])

def month_bounds_for(service: Dict, context_d: date):
    svc_start = get_service_start_date_dict(service)
    month_start = first_day_of_month(context_d)
    month_end   = last_day_of_month(context_d)
    if svc_start.year == context_d.year and svc_start.month == context_d.month:
        window_start = max(svc_start, month_start)
    else:
        window_start = month_start
    return (window_start, month_end)

async def check_and_log_budget_exceed(db: AsyncSession, service_id: str, triggered_by: str, context_date_str: Optional[str] = None):
    svc = await db.get(Service, service_id)
    if not svc:
        return
    budget = float(svc.setupBudget or 0)
    if budget <= 0:
        return

    ctx_d = _parse_date_any(context_date_str) if context_date_str else date.today()
    if not ctx_d:
        ctx_d = date.today()
    window_start, window_end = month_bounds_for({
        "startDate": svc.startDate.strftime("%Y-%m-%d") if svc.startDate else None,
        "setupFee": svc.setupFee
    }, ctx_d)

    res = await db.execute(select(Statement).where(Statement.serviceId == service_id))
    stmts = res.scalars().all()
    total_debit = 0.0
    for s in stmts:
        sd = s.date
        if not sd:
            continue
        if window_start <= sd <= window_end:
            total_debit += float(s.debit or 0)

    if total_debit > budget:
        month_tag = f"{ctx_d.year:04d}-{ctx_d.month:02d}"
        msg = f"Monthly expenses for service {service_id} exceeded setup budget for {month_tag} (£{total_debit:.2f} > £{budget:.2f})"
        await log_activity(db, triggered_by or "System", msg, "budget")

def parse_date_for_pdf(s: Optional[str]) -> str:
    if not s:
        return ""
    d = _parse_date_any(s)
    return d.strftime("%d/%m/%Y") if d else s

# -------------------------------------------------------------------
# STATEMENTS
# -------------------------------------------------------------------
@api.get("/services/{service_id}/statements")
async def get_statements(service_id: str, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    res = await db.execute(select(Statement).where(Statement.serviceId == service_id))
    stmts = res.scalars().all()

    # Ensure order by (date, FIFO per insert order) in response
    indexed = list(enumerate(stmts))
    indexed.sort(key=lambda item: (item[1].date or date.max, item[0]))
    out = []
    for _, s in indexed:
        out.append({
            "id": s.id,
            "date": s.date.strftime("%Y-%m-%d") if s.date else "",
            "description": s.description or "",
            "credit": float(s.credit or 0),
            "debit": float(s.debit or 0),
            "enteredBy": s.enteredBy or "System"
        })
    return out

@api.post("/services/{service_id}/statements")
async def add_statement(
    service_id: str,
    stmt: Dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # ✅ Ensure service exists
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    # ✅ Validate statement date
    stmt_date = stmt.get("date")
    if stmt_date:
        stmt_d = _parse_date_any(stmt_date)
        start_d = svc.startDate or date.today()
        if stmt_d and stmt_d < start_d:
            raise HTTPException(status_code=400, detail="Statement date before service start date")

    # ✅ Determine username from request header
    username = get_username_from_request(request) or "System"

    # ✅ Create new statement record
    new_stmt = Statement(
        id=stmt.get("id") or str(uuid.uuid4()),
        serviceId=service_id,
        date=_parse_date_any(stmt.get("date")),
        description=stmt.get("description") or "",
        credit=float(stmt.get("credit") or 0),
        debit=float(stmt.get("debit") or 0),
        enteredBy=username or "System",  # 🟢 dynamically from user
        created_at=datetime.utcnow(),
    )

    db.add(new_stmt)
    await db.commit()
    await db.refresh(new_stmt)

    # ✅ Log and check budget after commit
    await log_activity(
        db,
        username,
        f"Statement added in service '{service_id}' by {username}",
        "statement"
    )

    await check_and_log_budget_exceed(db, service_id, username, stmt.get("date"))

    # ✅ Return all statements for that service
    result = await db.execute(select(Statement).where(Statement.serviceId == service_id))
    statements = result.scalars().all()

    return {"message": "Statement added", "statements": statements}

@api.put("/services/{service_id}/statements/{stmt_id}")
async def update_statement_by_id(service_id: str, stmt_id: str, data: Dict, request: Request, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    st = await db.get(Statement, stmt_id)
    if not st or st.serviceId != service_id:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Validate new date
    if data.get("date"):
        stmt_d = _parse_date_any(data.get("date"))
        start_d = svc.startDate or date.today()
        if stmt_d and stmt_d < start_d:
            raise HTTPException(status_code=400, detail="Statement date before service start date")

    # update
    for k in ("description", "enteredBy"):
        if k in data:
            setattr(st, k, data.get(k) or "")
    if "date" in data:
        st.date = _parse_date_any(data.get("date"))
    if "credit" in data:
        st.credit = float(data.get("credit") or 0)
    if "debit" in data:
        st.debit = float(data.get("debit") or 0)

    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Statement '{stmt_id}' updated in service '{service_id}'", "statement")
    await check_and_log_budget_exceed(db, service_id, "System", data.get("date"))
    return {"message": "Statement updated", "statement": {
        "id": st.id, "date": st.date.strftime("%Y-%m-%d") if st.date else "", "description": st.description or "",
        "credit": float(st.credit or 0), "debit": float(st.debit or 0), "enteredBy": st.enteredBy or "System"
    }, "statements": await get_statements(service_id, db)}

@api.delete("/services/{service_id}/statements/{stmt_id}")
async def delete_statement_by_id(service_id: str, stmt_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    st = await db.get(Statement, stmt_id)
    if not st or st.serviceId != service_id:
        raise HTTPException(status_code=404, detail="Statement not found")
    await db.delete(st)
    await db.commit()
    await log_activity(db, get_username_from_request(request), f"Statement '{stmt_id}' deleted in service '{service_id}'", "statement")
    await check_and_log_budget_exceed(db, service_id, "System")
    return {"message": "Statement deleted successfully", "statements": await get_statements(service_id, db)}

# -------------------------------------------------------------------
# BULK STATEMENT UPLOAD (CSV)
# -------------------------------------------------------------------
@api.post("/services/statements/upload-csv")
async def upload_statements_csv(
    file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a CSV with columns:
      serviceId, date, description, credit, debit

    Rules:
    - enteredBy = current logged-in user (from Authorization header)
    - Skip rows whose description contains 'monthly fee' (case-insensitive)
      (because monthly fee is auto-generated by system)
    - Detect duplicates per service:
        same serviceId + date + description + credit + debit
      -> skip those as duplicates
    - If date is before service.startDate -> row is invalid and skipped
    - Partially process file: insert all valid, non-duplicate, non-monthly rows
    - Return summary with counts.
    """
    # ---- Basic file checks ----
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    try:
        raw_bytes = await file.read()
        text = raw_bytes.decode("utf-8-sig")  # handle BOM if present
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read CSV file.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    reader = csv.DictReader(io.StringIO(text))
    # Normalize fieldnames (strip + lower)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row.")

    header_map = {h.strip().lower(): h for h in reader.fieldnames}
    required = ["serviceid", "date", "description", "credit", "debit"]
    missing_cols = [col for col in required if col not in header_map]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV: {', '.join(missing_cols)}",
        )

    username = get_username_from_request(request) or "System"

    # Collect raw rows from CSV
    parsed_rows: list[dict] = []
    row_errors: list[str] = []
    monthly_skipped = 0

    for idx, row in enumerate(reader, start=2):  # 2 = data row (header is 1)
        try:
            service_id = (row.get(header_map["serviceid"]) or "").strip()
            date_str = (row.get(header_map["date"]) or "").strip()
            desc = (row.get(header_map["description"]) or "").strip()
            credit_str = (row.get(header_map["credit"]) or "").strip()
            debit_str = (row.get(header_map["debit"]) or "").strip()

            if not service_id or not date_str or not desc:
                row_errors.append(f"Row {idx}: Missing serviceId/date/description")
                continue

            # Exclude any 'monthly fee' rows (case-insensitive)
            if "monthly fee" in desc.lower():
                monthly_skipped += 1
                continue

            try:
                credit = float(credit_str) if credit_str else 0.0
            except ValueError:
                row_errors.append(f"Row {idx}: Invalid credit value '{credit_str}'")
                continue

            try:
                debit = float(debit_str) if debit_str else 0.0
            except ValueError:
                row_errors.append(f"Row {idx}: Invalid debit value '{debit_str}'")
                continue

            d = _parse_date_any(date_str)
            if not d:
                row_errors.append(f"Row {idx}: Invalid date '{date_str}'")
                continue

            parsed_rows.append(
                {
                    "csv_row": idx,
                    "serviceId": service_id,
                    "date": d,
                    "description": desc,
                    "credit": credit,
                    "debit": debit,
                }
            )
        except Exception as e:
            row_errors.append(f"Row {idx}: {str(e)}")
            continue

    if not parsed_rows and not monthly_skipped:
        raise HTTPException(status_code=400, detail="No valid rows found in CSV.")

    # Group rows by serviceId to reduce DB work
    rows_by_service: dict[str, list[dict]] = {}
    for r in parsed_rows:
        rows_by_service.setdefault(r["serviceId"], []).append(r)

    inserted_count = 0
    duplicate_count = 0
    invalid_before_start = 0
    services_not_found: set[str] = set()

    # Process each service separately
    for service_id, rows in rows_by_service.items():
        svc = await db.get(Service, service_id)
        if not svc:
            services_not_found.add(service_id)
            continue

        # Load existing statements once for this service
        res = await db.execute(select(Statement).where(Statement.serviceId == service_id))
        existing = res.scalars().all()

        # Build a set for duplicate detection: (date, desc, credit, debit)
        existing_keys = set()
        for s in existing:
            key = (
                s.date.isoformat() if s.date else "",
                (s.description or "").strip().lower(),
                float(s.credit or 0),
                float(s.debit or 0),
            )
            existing_keys.add(key)

        for r in rows:
            # Validate date is not before service.startDate
            if svc.startDate and r["date"] < svc.startDate:
                invalid_before_start += 1
                row_errors.append(
                    f"Row {r['csv_row']}: Date {r['date']} is before service start date {svc.startDate}"
                )
                continue

            key = (
                r["date"].isoformat(),
                r["description"].strip().lower(),
                float(r["credit"] or 0),
                float(r["debit"] or 0),
            )
            if key in existing_keys:
                # exact duplicate of existing (date + description + credit + debit)
                duplicate_count += 1
                row_errors.append(
                    f"Row {r['csv_row']}: Duplicate statement already exists for service {service_id}"
                )
                continue

            # Create new Statement
            new_stmt = Statement(
                id=str(uuid.uuid4()),
                serviceId=service_id,
                date=r["date"],
                description=r["description"],
                credit=r["credit"],
                debit=r["debit"],
                enteredBy=username,
                created_at=datetime.utcnow(),
            )
            db.add(new_stmt)
            inserted_count += 1
            # Add to existing_keys so further rows in the same file are checked
            existing_keys.add(key)

        # After processing rows for this service, run budget check (context date = today)
        await check_and_log_budget_exceed(db, service_id, username)

    await db.commit()

    # Build response summary
    detail_parts = [
        f"Inserted: {inserted_count}",
        f"Skipped monthly-fee rows: {monthly_skipped}",
        f"Skipped duplicates: {duplicate_count}",
        f"Skipped before service start date: {invalid_before_start}",
    ]
    if services_not_found:
        detail_parts.append(
            f"Unknown services in CSV: {', '.join(sorted(services_not_found))}"
        )

    return {
        "message": "Statement CSV processed",
        "summary": " | ".join(detail_parts),
        "inserted": inserted_count,
        "skipped_monthly_fee": monthly_skipped,
        "skipped_duplicates": duplicate_count,
        "skipped_before_start": invalid_before_start,
        "services_not_found": sorted(services_not_found),
        "row_errors": row_errors,  # list of per-row issues for UI display if needed
        "uploaded_by": username,
    }

# -------------------------------------------------------------------
# PDF export
# -------------------------------------------------------------------
@api.get("/services/{service_id}/statements/download")
async def download_statements(service_id: str, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    client_id = (svc.clientId or "").strip()
    client = await db.get(Client, client_id) if client_id else None
    client_name = f"{(client.first_name if client else '')}_{(client.last_name if client else '')}".strip("_") or client_id

    res = await db.execute(select(Statement).where(Statement.serviceId == service_id))
    stmts = res.scalars().all()
    if not stmts:
        raise HTTPException(status_code=404, detail="No statements found")

    indexed = list(enumerate(stmts))
    indexed.sort(key=lambda item: (item[1].date or date.max, item[0]))
    data = [r for _, r in indexed]

    total_credit = sum(float(s.credit or 0) for s in data)
    total_debit  = sum(float(s.debit or 0)  for s in data)
    balance = total_credit - total_debit

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=1*cm, rightMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm
    )
    styles = getSampleStyleSheet()
    elements = []

    center_title = ParagraphStyle("CenterTitle", parent=styles["Title"], alignment=1)
    center_subtitle = ParagraphStyle("CenterSubtitle", parent=styles["Heading2"], alignment=1)
    elements.append(Paragraph("<b>Your Ideal</b>", center_title))
    elements.append(Paragraph("<b>Statement of Account</b>", center_subtitle))
    elements.append(Spacer(1, 0.4 * cm))

    address = Paragraph(
        """<para alignment='right'><font size=7>
        Unit 7, 1 The Parade<br/>
        Monarch Way, Newbury Park<br/>
        London IG2 7HT<br/>
        Phone: 020-8611-2508<br/>
        Email – finance@yourideals.co.uk
        </font></para>""",
        styles["Normal"]
    )

    try:
        logo_path = os.path.join(BASE_DIR, "static", "logo.png")
        logo = Image(logo_path, width=3.2 * cm, height=3.2 * cm)
    except Exception:
        logo = Paragraph("<b>Your Ideal</b>", styles["Title"])

    right_block = Table([[logo], [Spacer(1, 0.2 * cm)], [address]], colWidths=[7 * cm])
    right_block.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    today = datetime.now().strftime("%d-%b-%Y")
    right_align_bold = ParagraphStyle(name="RightAlignBold", parent=styles["Normal"], alignment=2, fontName="Helvetica-Bold")
    info_data = [
        ["Date", Paragraph(today, right_align_bold)],
        ["Client ID", client_id],
        ["Total Amount Paid", f"£ {total_debit:,.2f}"],
        ["Total Remittance Amount", f"£ {total_credit:,.2f}"],
        ["Credit / Overdrawn", f"£ {abs(balance):,.2f}"],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 5 * cm])
    info_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#FFFCE5")),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#00C146")),
        ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#DA4711")),
    ]))

    top_section = Table([[info_table, right_block]], colWidths=[10 * cm, 7 * cm])
    top_section.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(top_section)
    elements.append(Spacer(1, 0.05 * cm))

    note_text = f"<b>Note:</b> {'Credit' if balance >= 0 else 'Overdrawn'} of £{abs(balance):,.2f}"
    elements.append(Paragraph(note_text, styles["Normal"]))
    elements.append(Spacer(1, 0.3 * cm))

    headers = ["S.No", "Date", "Description", "Credit (£)", "Debit (£)", "Balance (£)"]
    table_data = [headers]
    running = 0.0
    for i, s in enumerate(data, 1):
        credit = float(s.credit or 0)
        debit = float(s.debit or 0)
        running += credit - debit
        table_data.append([
            str(i),
            s.date.strftime("%d/%m/%Y") if s.date else "",
            s.description or "",
            f"{credit:,.2f}" if credit else "",
            f"{debit:,.2f}" if debit else "",
            f"{running:,.2f}",
        ])

    col_widths = [1.2 * cm, 2.4 * cm, 8.0 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm]
    table = Table(table_data, colWidths=col_widths)
    style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.25, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#91BEE5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
    ])
    for i in range(1, len(table_data)):
        bg = colors.whitesmoke if i % 2 == 0 else colors.white
        style.add("BACKGROUND", (0, i), (-1, i), bg)
        style.add("BACKGROUND", (3, i), (3, i), colors.HexColor("#00C456"))
        style.add("BACKGROUND", (4, i), (4, i), colors.HexColor("#FFAD85"))
        style.add("BACKGROUND", (5, i), (5, i), colors.HexColor("#FFEE9B"))
        style.add("ALIGN", (3, i), (5, i), "RIGHT")
    table.setStyle(style)
    elements.append(table)
    elements.append(Spacer(1, 0.5 * cm))

    footer = Table([[
        Paragraph(
            """<font size=8><b>Your Ideal</b> | Unit 7, 1 The Parade, Monarch Way, Newbury Park, London IG2 7HT |
            Phone: 020 8518 2536 | Email: finance@yourideal.co.uk | Web: www.yourideal.co.uk</font>""",
            styles["Normal"]
        )
    ]])
    footer.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0070C0")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 4)
    ]))
    elements.append(footer)

    doc.build(elements)
    buf.seek(0)
    filename = str(client_name).replace(" ", "_").replace("/", "_") + ".pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(buf, media_type="application/pdf", headers=headers)

# -------------------------------------------------------------------
# CSV export
# -------------------------------------------------------------------
@api.get("/services/{service_id}/statements/report/csv")
async def download_statements_csv(service_id: str, start: Optional[str] = None, end: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    client_id = (svc.clientId or "").strip()
    client = await db.get(Client, client_id) if client_id else None
    client_name = (f"{(client.first_name if client else '')} {(client.last_name if client else '')}".strip()) or client_id

    res = await db.execute(select(Statement).where(Statement.serviceId == service_id))
    stmts = res.scalars().all()
    if not stmts:
        raise HTTPException(status_code=404, detail="No statements found")

    indexed = list(enumerate(stmts))
    indexed.sort(key=lambda item: ((item[1].date or date.max), item[0]))
    rows = [r for _, r in indexed]

    total_credit = sum(float(x.credit or 0) for x in rows)
    total_debit  = sum(float(x.debit or 0)  for x in rows)
    balance_up_to_date = total_credit - total_debit

    running_vals = []
    running = 0.0
    for r in rows:
        running += (float(r.credit or 0) - float(r.debit or 0))
        running_vals.append(running)

    start_d = _parse_date_any(start) if start else None
    end_d   = _parse_date_any(end)   if end   else None

    filtered = []
    for i, r in enumerate(rows):
        d = r.date
        if start_d and d and d < start_d: continue
        if end_d   and d and d > end_d:   continue
        filtered.append((i, r))
    if not (start or end):
        filtered = list(enumerate(rows))

    out = StringIO()
    def w(line): out.write(line + "\n")
    w(f"Client ID,{client_id}")
    w(f"Client Name,{client_name}")
    w(f"Balance Up To Date,£{balance_up_to_date:.2f}")
    w("")
    w("S.No,Date,Description,Credit,Debit,Balance")
    for idx, (abs_i, r) in enumerate(filtered, 1):
        cr = float(r.credit or 0); dbv = float(r.debit or 0)
        desc = (r.description or "").replace(",", " ")
        w(f'{idx},{r.date.strftime("%d/%m/%Y") if r.date else ""},"{desc}",{cr if cr else ""},{dbv if dbv else ""},{running_vals[abs_i]:.2f}')
    csv_bytes = out.getvalue().encode("utf-8-sig")
    fn = f"Statement_Report_{client_name.replace(' ','_')}_{service_id}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{fn}"'}
    return StreamingResponse(BytesIO(csv_bytes), media_type="text/csv", headers=headers)
# -------------------------------------------------------------------
# Address CSV export
# -------------------------------------------------------------------
@api.get("/clients/{client_id}/addresses/csv")
async def download_client_addresses_csv(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClientAddress).where(ClientAddress.client_id == client_id))
    addresses = result.scalars().all()

    if not addresses:
        raise HTTPException(status_code=404, detail="No address history found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["House Number", "Street", "City", "Country", "Postcode", "Created At"])

    for a in addresses:
        writer.writerow(
            [
                a.house_no,
                a.street,
                a.city,
                a.country,
                a.postcode,
                a.created_at.isoformat(timespec="seconds") if a.created_at else "",
            ]
        )

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=client_{client_id}_address_history.csv",
        },
    )

# -------------------------------------------------------------------
# KIN CSV export
# -------------------------------------------------------------------
@api.get("/clients/{client_id}/kins/csv")
async def download_client_kins_csv(client_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClientKin).where(ClientKin.client_id == client_id))
    kins = result.scalars().all()

    if not kins:
        raise HTTPException(status_code=404, detail="No kin history found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Name",
            "Relationship",
            "House Number",
            "Street",
            "City",
            "Country",
            "Postcode",
            "Email",
            "Created At",
        ]
    )

    for k in kins:
        writer.writerow(
            [
                k.kin_name,
                k.kin_relationship,
                k.house_no,
                k.street,
                k.city,
                k.country,
                k.postcode,
                k.email,
                k.created_at.isoformat(timespec="seconds") if k.created_at else "",
            ]
        )

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=client_{client_id}_kin_history.csv",
        },
    )

notes_router = APIRouter(prefix="/api/services", tags=["Notes"])
# ============================================
# NOTES API (FULL + EXPLICIT IDs)
# ============================================
def note_to_json(n: ServiceNote):
    return {
        "id": str(n.id),
        "service_id": n.service_id,
        "note_date": n.note_date,
        "description": n.description,
        "created_by": n.created_by,
        "created_at": n.created_at
    }
@notes_router.post("/{service_id}/notes")
async def create_note(service_id: str, payload: NoteCreate, db: AsyncSession = Depends(get_db)):
    new_note = ServiceNote(
        service_id=service_id,
        note_date=payload.note_date,
        description=payload.description,
        created_by=payload.created_by
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    return {"message": "note created", "note": note_to_json(new_note)}

@notes_router.get("/{service_id}/notes")
async def list_notes(service_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            ServiceNote.id,
            ServiceNote.service_id,
            ServiceNote.note_date,
            ServiceNote.description,
            ServiceNote.created_by,
            ServiceNote.created_at,
        )
        .where(ServiceNote.service_id == service_id)
        .order_by(ServiceNote.note_date.desc(), ServiceNote.created_at.desc())
    )

    result = await db.execute(stmt)
    notes = result.fetchall()

    return [
        {
            "id": str(n.id),
            "service_id": n.service_id,
            "note_date": n.note_date,
            "description": n.description,
            "created_by": n.created_by,
            "created_at": n.created_at,
        }
        for n in notes
    ]


@notes_router.put("/{service_id}/notes/{note_id}")
async def update_note(
    service_id: str,
    note_id: str,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        update(ServiceNote)
        .where(ServiceNote.id == note_id, ServiceNote.service_id == service_id)
        .values(
            note_date=payload.note_date,
            description=payload.description,
            created_by=payload.created_by,
        )
        .returning(ServiceNote.id,
                   ServiceNote.service_id,
                   ServiceNote.note_date,
                   ServiceNote.description,
                   ServiceNote.created_by,
                   ServiceNote.created_at)
    )

    result = await db.execute(stmt)
    updated = result.fetchone()
    await db.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="Note not found")

    return {
        "message": "Note updated",
        "note": {
            "id": str(updated.id),
            "service_id": updated.service_id,
            "note_date": updated.note_date,
            "description": updated.description,
            "created_by": updated.created_by,
            "created_at": updated.created_at,
        },
    }


@notes_router.delete("/{service_id}/notes/{note_id}")
async def delete_note(service_id: str, note_id: str, db: AsyncSession = Depends(get_db)):
    stmt = delete(ServiceNote).where(
        ServiceNote.id == note_id,
        ServiceNote.service_id == service_id,
    )

    result = await db.execute(stmt)
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Note not found")

    return {"message": "Note deleted", "id": note_id}
    
@notes_router.get("/{service_id}/notes/csv")
async def export_notes_csv(service_id: str, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    client_id = svc.clientId

    result = await db.execute(
        select(ServiceNote).where(ServiceNote.service_id == service_id)
    )
    notes = result.scalars().all()

    if not notes:
        raise HTTPException(status_code=404, detail="No notes found")

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Client ID", client_id])
    writer.writerow([])
    writer.writerow(["Note Date", "Description", "Created By", "Created At"])

    for n in notes:
        writer.writerow([
            n.note_date.strftime("%Y-%m-%d"),
            n.description.replace(",", " "),
            n.created_by,
            n.created_at.strftime("%Y-%m-%d %H:%M:%S") if n.created_at else "",
        ])

    csv_bytes = output.getvalue().encode("utf-8-sig")
    filename = f"Notes_{client_id}_{service_id}.csv"

    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )    
    
# -------------------------------------------------------------------
# Notifications
# -------------------------------------------------------------------
@api.get("/notifications")
async def get_notifications(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Notification))
    items = res.scalars().all()
    items_sorted = sorted(items, key=lambda x: x.timestamp or datetime.min, reverse=True)
    return [
        {
            "id": n.id, "user": n.user, "action": n.action, "category": n.category,
            "timestamp": n.timestamp.strftime("%Y-%m-%d %H:%M:%S") if n.timestamp else None
        } for n in items_sorted
    ]

# -------------------------------------------------------------------
# Startup
# -------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    try:
        async with engine.begin() as conn:
            await conn.execute(select(func.now()))
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database connected and tables verified/created.")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

    global SUPER_ADMINS
    SUPER_ADMINS = _load_super_admins_from_env()
    if not SUPER_ADMINS:
        print("⚠ No SUPER ADMINS configured in .env (SUPERADMINS=[...]); relying on DB users only.")

    # ✅ Auto-run monthly debit generator
    async with AsyncSessionLocal() as db:
        await ensure_monthly_debits(db)

app.include_router(api)
app.include_router(notes_router)