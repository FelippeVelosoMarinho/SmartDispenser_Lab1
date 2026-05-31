# Configuração e Uso do ngrok para Testes (Web Bluetooth API)

O **ngrok** é utilizado neste projeto para criar um túnel seguro (HTTPS) para o frontend local (que roda em HTTP). Isso é estritamente necessário para testar a **Web Bluetooth API** a partir de um celular ou de outro dispositivo na rede, pois os navegadores modernos só permitem o uso do Bluetooth em conexões seguras (HTTPS) ou em `localhost`.

## 1. Instalação

O ngrok já deve estar instalado no ambiente. Caso precise instalar novamente em uma máquina Linux (Ubuntu/Debian), utilize os comandos abaixo:

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc > /etc/apt/trusted.gpg.d/ngrok.asc
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" > /etc/apt/sources.list.d/ngrok.list
sudo apt-get update
sudo apt-get install -y ngrok
```

## 2. Autenticação (Requisito Obrigatório)

Para utilizar o ngrok, é necessário configurar um Authtoken. Este token é gratuito.

1. Acesse [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) e crie uma conta.
2. No painel, vá em **Tunnels > Authtokens** e copie o seu token.
3. No terminal, execute o comando abaixo para salvar o token:

```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

*Nota: Você só precisa fazer isso uma vez por ambiente/máquina.*

## 3. Como iniciar o ngrok para testes

Sempre que precisar testar o frontend pelo celular via HTTPS, siga estes passos:

1. Certifique-se de que o frontend da aplicação está rodando na porta correta (por padrão, porta `8081` no Docker ou localmente).
2. Abra um novo terminal e execute:

```bash
ngrok http 8081
```

3. Na tela que aparecerá no terminal, procure pela linha **Forwarding**. Ela conterá a sua URL pública temporária.
   - Exemplo: `Forwarding   https://1a2b-3c4d.ngrok-free.app -> http://localhost:8081`

## 4. Realizando o teste

1. Copie a URL `https://...` fornecida pelo ngrok.
2. Abra essa URL no navegador do seu celular (Chrome, por exemplo).
3. Certifique-se de que o Bluetooth do celular está ligado.
4. Acesse as funcionalidades do sistema que exigem Bluetooth. Como a conexão é HTTPS, o navegador irá solicitar as permissões corretamente.

### ⚠️ Importante
Toda vez que você parar o comando do ngrok (`Ctrl+C`) e iniciá-lo novamente, a URL será alterada. É necessário atualizar a página com o novo link no celular a cada nova execução do ngrok. Se quiser deixar o ngrok rodando livre no terminal, execute em uma aba separada do seu ambiente de desenvolvimento.
