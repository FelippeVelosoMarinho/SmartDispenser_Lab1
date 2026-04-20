# 🐍 Backend — FastAPI Proxy

Servidor de alta performance que faz a ponte entre o Dashboard e o hardware, adicionando logs, segurança e métricas de latência.

## 🛠️ Instalação

1. Certifique-se de ter o Python 3.10+ instalado.
2. Crie um ambiente virtual: `python -m venv .venv`
3. Ative-o: `source .venv/bin/activate`
4. Instale as dependências:
   ```bash
   pip install fastapi uvicorn httpx python-dotenv
   ```

## ⚙️ Configuração

O backend precisa saber o IP do seu ESP32.

1. Crie um arquivo `.env` baseado no `.env.example`.
2. Adicione o IP que você pegou no Monitor Serial:
   ```env
   ESP32_IP=192.168.x.x
   ```

## 🚀 Execução

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🩺 Diagnóstico de Rede

Se o backend iniciar mas a UI mostrar `hardware_reachable: false`:

- Tente `ping [IP_DO_ESP]`.
- Verifique se o PC e o ESP estão no **mesmo** Wi-Fi.
- Redes de roteador móvel (Android/iPhone) podem bloquear a comunicação entre dispositivos.

O backend imprimirá logs detalhados (Timeout ou ConnectError) no terminal para ajudar a identificar o problema.
