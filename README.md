# NoCodeMCU

**Português** | [English](README.en.md)

Aplicação **desktop** de programação no-code para Arduino: o aluno monta o
programa com blocos, vê o `.ino` real sendo escrito ao lado, e **grava na placa
física pela USB** — Uno, Nano, Mega, Leonardo, ESP32, ESP32-S3 CAM e ESP8266.

O instalador já traz tudo: o aplicativo, o `arduino-cli` e os compiladores das
placas. Não precisa instalar a IDE do Arduino nem baixar nada depois.

O aplicativo fala **português e inglês**: troque em **Opções → Idioma /
Language**. Em inglês, os blocos, os menus, as mensagens, os comentários do
código gerado e os exemplos (em `exemplos/en/`) também ficam em inglês.

## Instalação (Windows)

1. Baixe o instalador
   **[NoCodeMCU-Setup-0.1.0.exe](https://github.com/alefplima/nocodemcu/releases/download/v0.1.0/NoCodeMCU-Setup-0.1.0.exe)**
   (Windows 10 ou 11, 64 bits).
2. Execute e escolha a pasta de instalação. Se o Windows mostrar "O Windows
   protegeu o computador", clique em **Mais informações** e depois em
   **Executar assim mesmo**.
3. Abra o NoCodeMCU pelo menu Iniciar, ligue a placa na USB e escolha a porta
   `COM` dela no aplicativo.

## Instalação (Linux)

1. Baixe um dos dois arquivos da última versão em
   **[Releases](https://github.com/alefplima/nocodemcu/releases/latest)**:
   - `nocodemcu_0.1.0_amd64.deb`, para Ubuntu, Debian, Mint e derivados;
   - `NoCodeMCU-0.1.0.AppImage`, para qualquer Linux de 64 bits, sem instalar.
2. Instale:
   - **.deb:** `sudo apt install ./nocodemcu_0.1.0_amd64.deb`. O NoCodeMCU
     aparece no menu de aplicativos.
   - **AppImage:** `chmod +x NoCodeMCU-0.1.0.AppImage` e depois
     `./NoCodeMCU-0.1.0.AppImage`. No Ubuntu 22.04 ou mais novo, se não abrir,
     instale antes `sudo apt install libfuse2`.
3. Dê permissão de acesso à USB (uma vez só):
   `sudo usermod -aG dialout $USER`. Depois **saia e entre de novo na sessão**;
   sem isso a placa aparece, mas a gravação falha com "permissão negada".

## Exemplo: carro 4x4 com ESP32-S3 CAM

O exemplo 15 (**Carro 4x4 — LPA2v com câmera e operador**) é um carro de tração
nas quatro rodas que anda sozinho desviando de obstáculos pela Lógica
Paraconsistente Anotada (LPA2v). Quando ele desvia três vezes seguidas sem
achar caminho livre, entende que está preso: para, abre a câmera no celular e
passa o controle para o operador. O operador dirige pelo analógico da página e
devolve o carro à LPA2v com o botão **Liberar**.

### Material

| peça | quantidade |
|---|---|
| ESP32-S3 CAM (ESP32-S3-WROOM-1 N16R8, câmera OV5640 ou OV2640) | 1 |
| Chassi 4x4 com 4 motores DC | 1 |
| Ponte H L298N | 1 |
| Sensor ultrassônico HC-SR04 | 2 |
| Resistores de 1 kΩ e de 2 kΩ (ou 2,2 kΩ) | 2 de cada |
| Bateria para os motores (7 V ou mais, por causa do regulador do L298N) | 1 |

### Ligações

| ligação | GPIO da ESP32-S3 CAM |
|---|---|
| L298N **IN1 / IN2** (lado direito: OUT1/OUT2) | **1 / 2** |
| L298N **IN3 / IN4** (lado esquerdo: OUT3/OUT4) | **42 / 41** |
| HC-SR04 esquerdo **TRIG / ECHO** | **14 / 21** |
| HC-SR04 direito **TRIG / ECHO** | **47 / 40** |

- Os dois motores de cada lado vão **em paralelo** no mesmo canal do L298N.
- **ENA** e **ENB** do L298N ficam com o jumper.
- O **GND** do L298N, dos sensores e da placa vão todos juntos.
- Os sensores são alimentados com **5 V**.
- **O ECHO precisa de divisor de tensão.** O HC-SR04 responde em 5 V e o
  ESP32-S3 só aguenta 3,3 V:

  ```
   HC-SR04 ECHO ──[ 1 kΩ ]──┬── GPIO da placa (21 ou 40)
                            │
                         [ 2 kΩ ]
                            │
                           GND
  ```

  O TRIG vai direto, sem resistor. Com sensores **HC-SR04P** ou **RCWL-1601**,
  que funcionam em 3,3 V, o divisor não é necessário (o VCC deles vai no 3,3 V).
- Se o giro sair invertido (o analógico para a esquerda vira o carro para a
  direita), troque os pares no bloco **motores**: 42/41 ↔ 1/2.

### Gravando

1. Ligue a placa no computador pelo USB.
2. No NoCodeMCU: **Arquivo → Exemplos → Carro 4x4 — LPA2v com câmera e
   operador**. A placa (**ESP32-S3 CAM**) e o Modo Abstrato vêm junto com o
   exemplo.
3. Escolha a porta (no Linux, `/dev/ttyACM0`) e use **Placa → Compilar e
   gravar** (Ctrl+U). A primeira compilação demora alguns minutos.
4. **Só na primeira gravação**, se a placa ainda tiver o programa de fábrica e
   a gravação não começar: segure o botão **BOOT**, aperte e solte o **RST**,
   solte o **BOOT** e grave de novo. Depois disso as gravações são automáticas.

### Usando

1. Com o carro ligado na bateria, conecte o celular na rede Wi-Fi **carro4x4**
   (aberta, sem senha).
2. Abra **http://192.168.4.1** no navegador do celular.
3. Enquanto a LPA2v dirige, a página mostra o reticulado com o estado da análise
   (V, F, T e ⊥ em quatro cores) e as distâncias dos dois sensores.
4. Quando o carro fica preso, o vídeo aparece no alto com o aviso
   **PRESO**. Dirija pelo **analógico** e toque **Liberar** para devolver o
   carro à LPA2v.
5. O botão **Assumir** faz o mesmo a qualquer momento, sem esperar o carro
   ficar preso.

Detalhes:

- **A câmera dorme** enquanto o vídeo não está na página: o OV5640 esquenta
  muito filmando à toa. Ela acorda no **Assumir** e volta a dormir no
  **Liberar**.
- **Vídeo de cabeça para baixo?** No bloco **ligar a câmera**, troque para
  **girada 180°** ou volte para **como sai da câmera**, conforme a montagem.
- **Vídeo preto ou travado?** Toque no vídeo para reconectar. Se acontecer com
  frequência, é quase sempre a bateria. A queda de tensão quando os quatro
  motores arrancam chega à placa e à câmera. Um capacitor de 470–1000 µF entre
  5 V e GND perto da placa ajuda; o mais firme é alimentar a placa separada dos
  motores (por exemplo, um power bank no USB), com os GNDs juntos.
- **Velocidades e tempo de giro** (`VELOCIDADE`, `VEL_GIRO`, `TEMPO_GIRO`) são
  um ponto de partida: ajuste-os no bloco **Ao iniciar** para o seu piso e a sua
  bateria.

---

Nasceu ao lado do módulo `iot/` do TaskAI, mas com uma premissa oposta: lá os
blocos são abstrações de dispositivo (*"piscar LED vermelho"*, com o pino 13
escondido no gerador) e o C++ existe só para exibição. Aqui **um bloco é um
comando da linguagem Arduino**, nada mais.

```
pinMode( 13 , OUTPUT )        →   pinMode(13, OUTPUT);
digitalWrite( 13 , HIGH )     →   digitalWrite(13, HIGH);
delay( 1000 )                 →   delay(1000);
```

Nenhum bloco junta comandos, nenhum pino é implícito, e nada é injetado por
conta própria: se o aluno não colocou `Serial.begin()`, ele não aparece no
código.

### Modo Literal e Modo Abstrato

O que está acima é o **Modo Literal**, e é o padrão. Em **Exibir → Modo** existe
o **Modo Abstrato**: blocos simplificados, só com parâmetros, onde um bloco pode
valer mais de um comando.

```
escrita digital pino [13] [liga]   →   pinMode(13, OUTPUT);    (no setup)
                                       digitalWrite(13, HIGH);  (onde o bloco está)
```

Trocar de modo **converte o programa** nos dois sentidos, e a conversão não muda
o C++ gerado — `tools/modo_test.js` compara antes e depois caractere a
caractere. O que não tem forma no outro modo (código livre, `switch`, bits, e do
lado abstrato o ultrassom e o servo) fica como está e é relatado na aba Saída.

Os comentários dos blocos acompanham a conversão e viram `// ...` no `.ino`. Há
um limite declarado: quando dois blocos literais viram um só abstrato (o par
`Serial.print` + `Serial.println` vira *mostrar*), os comentários dos dois
passam a morar no mesmo bloco e saem juntos. Nenhum texto se perde — só muda a
linha em que aparece —, e o teste cobra exatamente isso.

### A única exceção à regra "um bloco, um comando": Lógica Paraconsistente

A categoria **Lógica Paraconsistente** é a exceção deliberada à regra acima.
Ela traz a LPA2v — Lógica Paraconsistente Anotada com anotação de dois valores,
na formulação de aplicação de J. I. Da Silva Filho — para decidir a partir de
evidências que se contradizem, algo que não existe como comando do Arduino.

A abstração é honesta porque o C++ continua à vista: cada bloco vira uma
chamada a uma função com o nome da grandeza da teoria, e a função inteira
aparece no painel de código.

```
Grau de Certeza Gc de μ [0.9] λ [0.2]   →   lpaGc(0.9, 0.2)

                                            float lpaGc(float mu, float lam) {
                                              return mu - lam;
                                            }
```

Só entra no sketch o que foi usado: pedir o Grau de Certeza não arrasta o
`sqrt()` do Grau de Certeza Real. Ver `docs/blocos.md` para a lista completa.

---

## Rodando

```bash
npm install
npm run toolchain          # baixa arduino-cli + cores (uma vez; 2,5 GB, ou 366 MB com --slim)
npm run dev                # no Linux; usa --no-sandbox
# npm start                # nas demais plataformas
```

Abrir um projeto direto:

```bash
npm run dev -- exemplos/01-blink.tbk
```

> **Linux:** para gravar na placa o usuário precisa estar no grupo `dialout`:
> `sudo usermod -aG dialout $USER` e depois sair e entrar da sessão.
> O app avisa quando esse é o problema.

---

## Toolchain embutida

O aplicativo **não depende de Arduino IDE instalado**. O `arduino-cli`, os cores
e as bibliotecas ficam dentro do pacote, em `resources/toolchain/<so>/`.

```bash
node tools/fetch_toolchain.mjs            # SO atual, tudo (AVR + ESP32 + ESP8266)
node tools/fetch_toolchain.mjs --slim     # só AVR — bundle pequeno
node tools/fetch_toolchain.mjs --so=win   # bundle do Windows, montado do Linux
```

Quando o alvo é a própria máquina, o script usa `arduino-cli core install`.
Quando é outro SO, ele baixa direto dos índices de pacote escolhendo os binários
do host alvo — é o que permite gerar o instalador do Windows sem uma segunda
máquina.

Tamanhos medidos nesta máquina: **366 MB** com só AVR e **2,46 GB** com ESP32 e
ESP8266 — depois da poda. Sem podar seriam 6,2 GB: saem o `staging/` (arquivos
já extraídos), o toolchain RISC-V (para C3/C6/H2) e as bibliotecas
pré-compiladas dos outros SoCs da família (`esp32c6-libs`, `esp32p4-libs`…,
~240 MB cada). Ficam as do ESP32 clássico (`esp32-libs`) e as do ESP32-S3
(`esp32s3-libs`, para a ESP32-S3 CAM), que somam ~240 MB aos 2,46 GB medidos
antes de a S3 entrar no catálogo.

Em tempo de execução o app não escreve dentro do bundle: cria um diretório de
dados gravável no `userData` e liga `packages/` por symlink (junction no
Windows), copiando só os índices e as bibliotecas.

---

## Empacotamento

```bash
npm run build:linux    # AppImage + .deb
npm run build:win      # instalador NSIS
npm run build:slim     # toolchain só AVR + empacotamento
npm run build:full     # toolchain completa + empacotamento
```

---

## Estrutura

```
src/main/         processo principal (Node)
  cli.js            arduino-cli: detectar portas, compilar, gravar, parsear erros
  serial.js         monitor serial (serialport), suspende durante a gravação
  ipc.js            canais IPC — única superfície exposta ao renderer
  projects.js       .tbk (projeto) e exportação .ino
  settings.js       preferências no userData
src/preload/      contextBridge → window.tb.*
src/renderer/     interface, sem bundler (scripts clássicos, como no TaskAI)
  js/boards.js      catálogo de placas: FQBN, pinos, PWM, ADC, libs, recursos
  js/fields.js      campos de pino: dropdowns que mudam com a placa
  js/blocks/*.js    definição dos blocos, um arquivo por categoria
  js/generator/     gerador Arduino (subclasse de Blockly.Generator)
  js/toolbox.js     toolbox montada em runtime e filtrada pela placa
  js/validate.js    revalidação do programa contra a placa selecionada
  vendor/blockly/   Blockly 13.2.1 local (mesma cópia usada pelo TaskAI)
tools/            harnesses e scripts de build
exemplos/         projetos .tbk prontos
```

### O gerador

É uma subclasse de `Blockly.Generator` de verdade — não um walker manual. Isso
dá aninhamento, precedência e variáveis de graça, e permite três coisas que
importam:

- **Ordem canônica do arquivo**: includes → `#define`s → globais e instâncias de
  biblioteca → protótipos → funções → `setup()` → `loop()`.
- **Definições vindas de qualquer lugar**: um bloco `meuServo.write(90)` no meio
  do `loop()` faz aparecer o `#include <Servo.h>` e o `Servo meuServo;` no topo,
  uma única vez, mesmo com vinte blocos pedindo.
- **Mapa linha → bloco**: cada statement é marcado enquanto o texto é montado,
  então `sketch.ino:23: error` vira aviso no bloco culpado, com ele selecionado
  na tela — em vez de um log cru que o aluno não sabe ler.

### Placas

`boards.js` é a fonte única. Os campos de pino são dropdowns derivados da placa,
e trocar de placa revalida o programa: pino inexistente, `analogWrite` em pino
sem PWM, `Serial1` num Uno ou `SoftwareSerial` num ESP32 viram aviso no bloco e
barram a compilação antes de gastar tempo com o compilador.

As diferenças entre placas foram levantadas compilando de verdade, não de
memória — as que o catálogo já carrega:

| diferença | onde |
|---|---|
| `EEPROM.update` não existe | ESP32 e ESP8266 (a EEPROM é emulada: `begin` + `write` + `commit`) |
| a `Servo` do registro não compila | ESP32 com core 3.x (usa a API LEDC antiga); o ESP8266 traz Servo no próprio core |
| `analogReference` | só AVR |
| `analogReadResolution`, `ledcAttach/Write/Detach` | só ESP32 |
| `SoftwareSerial` | só AVR |
| ADC2 (pinos 0, 2, 4, 12–15, 25–27) para de ler com o WiFi ligado | ESP32 — vira aviso no bloco `analogRead` |
| câmera e servidor de vídeo (porta 81) | só ESP32-S3 CAM; a câmera usa o canal 7/timer 3 do LEDC para não brigar com o `analogWrite` |
| Wire e SPI fora da lista | ESP32-S3 CAM: os pinos padrão deles (8/9, 10–13) são da câmera |

---

## Testes

```bash
npm test                  # suíte inteira
npm run test:gen          # só o gerador (não precisa de toolchain)
npm run test:compile      # compila as fixtures de verdade, placa por placa
npm run test:pipeline     # caminho real do app: cli.js + userData temporário
```

| suíte | o que garante |
|---|---|
| `gen_test.js` | 1994 checagens: todo bloco tem gerador, precedência, aninhamento, ordem do arquivo, avisos, mapa de linhas, validação por placa |
| `ui_test.js` | 51 checagens: leitura das linhas do plotter e do reticulado, classificação nas 12 regiões da LPA2v, e vaivém de projeto `.tbk` / preferências |
| `modo_test.js` | 99 checagens: converter entre Modo Literal e Modo Abstrato não muda o C++ gerado — comparado caractere a caractere, bloco por bloco e exemplo por exemplo. Imprime quantas comparações foram byte-idênticas, quantas diferem só na ordem das declarações e quantas só reagruparam comentários (nenhum perdido) |
| `doc_test.js` | 200 checagens: os dois documentos geram, e o gabarito da apostila é recalculado por uma implementação independente |
| `compile_test.js` | 21 fixtures × 7 placas = **~130 compilações reais** com o `arduino-cli` — se o gerador produzir C++ inválido, quebra aqui (leva ~20 min com as ESP) |
| `pipeline_test.js` | 14 checagens: preparação da toolchain, compilação pelo mesmo módulo que o Electron usa, e erro do compilador virando o bloco certo |

A referência dos blocos (`docs/blocos.md`) também é gerada do código, por
`node tools/gerar_referencia.js` — bloco novo aparece nela sozinho, com o C++
que ele produz.

Os testes de compilação são pulados com aviso quando a toolchain ainda não foi
montada, em vez de reprovar a suíte.

Os harnesses rodam em Node puro carregando o Blockly vendorizado (o UMD exporta
em CommonJS) — mesma disciplina dos harnesses do TaskAI.

---

## Verificação com a placa na mão

O que os testes automáticos **não** alcançam é a gravação em si. Com a placa
plugada, o roteiro é:

1. `npm run dev -- exemplos/01-blink.tbk`, escolher **Arduino Uno** e conferir
   que a porta aparece sozinha na lista (a detecção roda a cada 4 s).
2. **Compilar e gravar** → o LED da placa pisca a cada segundo. A aba *Saída*
   mostra o tamanho ocupado do programa.
3. Abrir `exemplos/02-potenciometro-plotter.tbk`, gravar, ir em **Monitor
   serial** → *Conectar* a 9600. Girar o potenciômetro em A0 e ver os números
   correndo; a aba **Plotter** desenha a curva.
4. Trocar o seletor para **ESP32 DevKit** sem mexer nos blocos: a categoria
   *ESP / WiFi* aparece, os pinos são revalidados e blocos incompatíveis ganham
   aviso. Gravar `exemplos/05-esp32-wifi.tbk` numa DevKit.
5. Provocar um erro (bloco *Código livre* com C++ inválido) e conferir que a
   mensagem do compilador aparece **no bloco**, com ele selecionado na tela.
6. Fechar e reabrir: placa, porta, baud e o programa em edição voltam como
   estavam.

## Formato de projeto

`.tbk` é JSON: cabeçalho com a placa e o `Blockly.serialization` do workspace.
Abrir um projeto restaura o programa **e** a placa em que ele foi feito.
Há também um rascunho automático no `localStorage`, para não perder trabalho
quando a janela fecha sem salvar.

## Licença

O código do NoCodeMCU é distribuído sob a [licença MIT](LICENSE) —
Copyright (c) 2026 Alessandro Ferreira Paz Lima.

Os instaladores também levam ferramentas de terceiros, que seguem as licenças
dos seus próprios projetos: o [arduino-cli](https://github.com/arduino/arduino-cli)
(GPL-3.0), os cores das placas (Arduino AVR, [Espressif ESP32](https://github.com/espressif/arduino-esp32),
ESP8266) e o [Blockly](https://github.com/google/blockly) (Apache-2.0).
