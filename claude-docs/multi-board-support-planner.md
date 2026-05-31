# Plano de Integração: Suporte a Múltiplas Placas ESP32

## 1. Objetivo
Permitir que o mesmo código fonte (`eco-dispenser.ino` e bibliotecas) seja compilado para diferentes variações físicas do ESP32 (ex: ESP32 Clássico / WROOM, ESP32-C3 SuperMini, ESP32-S3, etc.) sem precisar modificar os pinos manualmente a cada vez.

## 2. Estratégia de Arquitetura
A melhor forma de resolver isso em C++ para sistemas embarcados é utilizando **Diretivas de Pré-processador (`#ifdef`, `#elif`, `#endif`)**. 

A ideia é remover as definições fixas de pinos do `config.h` e transformá-lo num "Roteador de Configurações" que puxa o arquivo correto baseado na placa que foi selecionada na IDE no momento de compilar.

## 3. Estrutura de Pastas Proposta
Deveremos criar uma sub-pasta chamada `boards` dentro da pasta do firmware, contendo as especificações de cada hardware:

```text
firmware/eco-dispenser/
├── eco-dispenser.ino
├── config.h               <-- "Roteador"
└── boards/
    ├── config_wroom32.h   <-- Pinos do ESP32 Padrão
    └── config_c3_supermini.h <-- Pinos do C3
```

## 4. O Novo `config.h` (Exemplo Prático)
O arquivo `config.h` passará a ter esta estrutura inteligente:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// Descomente apenas a placa que você está usando agora:
// #define BOARD_ESP32_WROOM
#define BOARD_ESP32_C3_SUPERMINI

#if defined(BOARD_ESP32_C3_SUPERMINI)
  #include "boards/config_c3_supermini.h"
#elif defined(BOARD_ESP32_WROOM)
  #include "boards/config_wroom32.h"
#else
  #error "Nenhuma placa foi selecionada no config.h!"
#endif

// ── Configurações Comuns (Software) ─────────
const int SERVER_PORT = 80;
const int TOTAL_SLOTS = 21;
const int DEBOUNCE_MS = 50;

#endif
```

## 5. Cuidados Especiais (Mapeamento)
Ao criarmos os arquivos específicos das placas, além dos pinos, precisaremos mapear **Comportamentos Específicos de Hardware**:

* **Lógica do LED Invertida:** No C3, `LOW` liga o LED e `HIGH` apaga. No WROOM, costuma ser o inverso.
* **Timers do Servo Motor:** O C3 exige `ESP32PWM::allocateTimer(0)` antes do `.attach()`. O WROOM não.
* **Quantidade de Pinos:** O C3 tem menos pinos. Funções que pedem muitos pinos podem precisar de multiplexação ou adaptação.

## 6. Passos para Implementação Futura
Quando for o momento de executar esta adaptação, o fluxo será:
1. [ ] Criar o diretório `boards`.
2. [ ] Copiar o mapeamento atual do C3 para `config_c3_supermini.h`.
3. [ ] Criar o mapeamento para o ESP do seu colega em `config_wroom32.h`.
4. [ ] Atualizar o `config.h` raiz para utilizar as diretivas `#if defined()`.
5. [ ] Passar as exceções lógicas (como inicialização do timer do Servo) para dentro de blocos de checagem condicional no próprio código (`#ifdef BOARD_ESP32_C3_SUPERMINI ... #endif`).
