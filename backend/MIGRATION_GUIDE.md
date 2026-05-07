## 🔄 Guia de Migração — Estrutura Modular do Backend

### O Que Mudou?

O backend foi refatorado de um monolítico `main.py` para uma **arquitetura em camadas**, seguindo as melhores práticas do FastAPI.

#### Antes (❌ Monolítico)
```
backend/
└── main.py (tudo junto ~ 330 linhas)
```

#### Depois (✅ Modular)
```
backend/
├── app/
│   ├── main.py              (Factory da app)
│   ├── api/endpoints/       (Rotas organizadas)
│   ├── core/                (Config + Segurança)
│   ├── schemas/             (Validação Pydantic)
│   └── crud/                (Acesso a dados)
├── main.py                  (Ponto de entrada)
└── pyproject.toml           (Deps atualizadas)
```

### ✅ Como Usar

#### 1. Instalar Dependências
```bash
cd backend
uv sync
```

#### 2. Rodar Server
```bash
# Opção 1: com uv
uv run uvicorn main:app --reload

# Opção 2: direto (se dep instaladas)
uvicorn main:app --reload
```

#### 3. Testar Endpoints
```bash
# Registrar novo usuário
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123","full_name":"Alice"}'

# Fazer login
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}'

# Health check
curl http://127.0.0.1:8000/api/health
```

### 📖 Documentação por Camada

#### **main.py** (Raiz)
```python
from app.main import app
# Simple entry point para uvicorn
```

#### **app/main.py** (App Factory)
```python
def create_app() -> FastAPI:
    app = FastAPI(...)
    app.add_middleware(CORSMiddleware, ...)
    app.include_router(api_router)
    return app
```

#### **app/core/config.py** (Settings)
```python
ESP32_IP = os.getenv("ESP32_IP", "192.168.109.25")
SECRET_KEY = os.getenv("JWT_SECRET", "...")
CORS_ORIGINS = ["http://localhost:5173", ...]
```

#### **app/core/security.py** (Auth)
```python
def verify_password(plain: str, hashed: str) -> bool
def get_password_hash(password: str) -> str
def create_access_token(data: dict, expires_delta: timedelta) -> str
async def get_current_user(token: str) -> dict  # Dependency
```

#### **app/schemas/user.py** (Validação)
```python
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
```

#### **app/crud/user.py** (Dados)
```python
def create_user(username: str, hashed_password: str, ...) -> dict
def get_user(username: str) -> Optional[dict]
def user_exists(username: str) -> bool
```

#### **app/api/endpoints/auth.py** (Rotas Auth)
```python
@router.post("/register", response_model=UserPublic, status_code=201)
async def register(user: UserCreate):
    
@router.post("/login", response_model=TokenResponse)
async def login(form: LoginRequest):
    
@router.get("/profile", response_model=UserPublic)
async def get_profile(current_user: dict = Depends(get_current_user)):
```

#### **app/api/endpoints/iot.py** (Rotas Hardware)
```python
@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    
@router.get("/led/status", response_model=LedStatusResponse)
async def get_led_status(request: Request):
    
@router.post("/led/toggle", response_model=ToggleResponse)
async def toggle_led(command: LedCommand, request: Request):
```

#### **app/api/api.py** (Agregador de Rotas)
```python
api_router = APIRouter()
api_router.include_router(auth.router)  # /api/auth/*
api_router.include_router(iot.router)   # /api/led/*, /api/health, etc
```

### 🎯 Fluxo de uma Requisição

**POST /api/auth/login**

```
1. main.py (uvicorn)
   └─> app/main.py (create_app)
       └─> CORSMiddleware
       └─> api_router (app/api/api.py)
           └─> endpoints/auth.py (login function)
               ├─> schemas/user.py (LoginRequest validation)
               ├─> crud/user.py (get_user)
               ├─> core/security.py (verify_password)
               ├─> core/security.py (create_access_token)
               └─> schemas/user.py (TokenResponse)
2. Response: {"access_token": "...", "token_type": "bearer"}
```

### 🔐 Segurança

Você tem que proteger as rotas sensíveis com `Depends(get_current_user)`:

```python
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)  # Só usuários autenticados
):
    if current_user["username"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    # ... delete logic
```

### 📝 Adicionar Novo Endpoint

#### Passo 1: Criar Schema (app/schemas/novo_modulo.py)
```python
from pydantic import BaseModel

class NovoSchema(BaseModel):
    campo: str
    valor: int
```

#### Passo 2: Criar Endpoint (app/api/endpoints/novo.py)
```python
from fastapi import APIRouter
from app.schemas.novo_modulo import NovoSchema

router = APIRouter(prefix="/api/novo", tags=["novo"])

@router.post("/", response_model=NovoSchema)
async def criar_novo(data: NovoSchema):
    return data
```

#### Passo 3: Registrar Router (app/api/api.py)
```python
from app.api.endpoints import novo

api_router.include_router(novo.router)
```

#### Passo 4: Rodar
```bash
uv run uvicorn main:app --reload
# Novo endpoint em: POST /api/novo/
```

### 🧪 Testes

```bash
# Rodar testes
uv run pytest tests/

# Com coverage
uv run pytest --cov=app tests/
```

### 🚀 Deploy (Docker)

```bash
docker build -t eco-dispenser-backend .
docker run -e ESP32_IP=192.168.1.100 \
           -e JWT_SECRET=sua-chave-secreta \
           -p 8000:8000 \
           eco-dispenser-backend
```

### 📚 Referências

- [FastAPI Project Structure](https://fastapi.tiangolo.com/deployment/concepts/#deployment-concepts)
- [Pydantic Validation](https://docs.pydantic.dev/latest/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [OWASP Auth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### ❓ Dúvidas Frequentes

**P: Por que separar schemas e crud?**
> R: Schemas validam entrada/saída, crud acessa dados. Assim, você pode testar um sem o outro.

**P: Por que factory pattern em main.py?**
> R: Permite criar múltiplas instâncias da app (útil para testes) e injeta dependências.

**P: Como adicionar banco de dados?**
> R: Use SQLModel em models/, altere crud/ para usar SQLAlchemy/ORM, rode Alembic para migrações.

**P: E se eu tiver muitos endpoints?**
> R: Crie novos arquivos em endpoints/ e registre em api/api.py:
> ```python
> from app.api.endpoints import users, products, orders
> api_router.include_router(users.router)
> api_router.include_router(products.router)
> api_router.include_router(orders.router)
> ```
