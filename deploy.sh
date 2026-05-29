#!/bin/bash

# Vai para a pasta onde o projeto já está no root
cd /root/SmartDispenser_Lab1 || exit

# Puxa as atualizações do GitHub
git reset --hard HEAD
git pull origin main

# Se for o caso do seu projeto IoT/Firmware ou backend, 
# adicione aqui os comandos de compilação ou reinicialização.
# Exemplo: pm2 restart app / docker-compose restart / etc.

echo "Deploy executado na pasta root em $(date)"