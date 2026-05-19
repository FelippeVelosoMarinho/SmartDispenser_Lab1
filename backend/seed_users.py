#!/usr/bin/env python
import os
import sys
import argparse
from pathlib import Path

# Adiciona o diretório atual ao sys.path para permitir importações do pacote 'app'
current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))

# Carrega as variáveis de ambiente do arquivo .env se existir
from dotenv import load_dotenv
load_dotenv(current_dir / ".env")

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.domain import User
from app.crud.user import get_user, create_user

USERS_TO_SEED = [
    {"email": "luis@pillar.br", "username": "luis@pillar.br", "full_name": "Luis Pião"},
    {"email": "josue@pillar.br", "username": "josue@pillar.br", "full_name": "Josué"},
    {"email": "igor@pillar.br", "username": "igor@pillar.br", "full_name": "Igor"},
    {"email": "raissa@pillar.br", "username": "raissa@pillar.br", "full_name": "Rarazinha"},
    {"email": "felippe@pillar.br", "username": "felippe@pillar.br", "full_name": "Felippe: O Gostoso"},
]
DEFAULT_PASSWORD = "123Seguro&"

def seed_database(db: Session, password: str):
    print("=== Iniciando população de usuários no banco de dados ===")
    print(f"URL de Conexão: {engine.url}")
    
    hashed_pwd = get_password_hash(password)
    created_count = 0
    existing_count = 0

    for user_info in USERS_TO_SEED:
        username = user_info["username"]
        email = user_info["email"]
        full_name = user_info["full_name"]
        
        # Verifica se o usuário já existe por username ou email
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        
        if existing_user:
            print(f"[-] Usuário '{username}' já existe no banco de dados (ID: {existing_user.id}). Ignorando.")
            existing_count += 1
        else:
            try:
                new_user = User(
                    username=username,
                    email=email,
                    full_name=full_name,
                    hashed_password=hashed_pwd
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                print(f"[+] Usuário '{username}' cadastrado com sucesso! (ID: {new_user.id})")
                created_count += 1
            except Exception as e:
                db.rollback()
                print(f"[X] Erro ao cadastrar usuário '{username}': {e}")

    print("\n=== Resumo do Seed ===")
    print(f"Total de usuários processados: {len(USERS_TO_SEED)}")
    print(f"Novos usuários cadastrados: {created_count}")
    print(f"Usuários já existentes: {existing_count}")
    print("====================================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Popular banco de dados do Smart Dispenser com usuários padrão.")
    parser.add_argument("--password", type=str, default=DEFAULT_PASSWORD, help="Senha padrão para todos os usuários")
    parser.add_argument("--db-url", type=str, help="URL de conexão do banco de dados (opcional)")
    
    args = parser.parse_args()

    # Se uma URL do banco de dados foi fornecida via CLI, podemos substituir dinamicamente no engine
    if args.db_url:
        os.environ["DATABASE_URL"] = args.db_url
        # Re-importa o engine para aplicar a nova URL caso necessário
        from sqlalchemy import create_engine
        db_url = args.db_url
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        global_engine = create_engine(db_url, pool_pre_ping=True)
        SessionLocal.configure(bind=global_engine)
        print(f"Conectando à URL informada via argumento: {args.db_url}")

    db = SessionLocal()
    try:
        seed_database(db, args.password)
    finally:
        db.close()
