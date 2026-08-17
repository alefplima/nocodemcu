# TaskArduino

Aplicação **desktop** de programação no-code para Arduino: o aluno monta o
programa com blocos, vê o `.ino` real sendo escrito ao lado, e **grava na placa
física pela USB** — Uno, Nano, Mega, Leonardo, ESP32 e ESP8266.

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
pré-compiladas dos outros SoCs da família (`esp32s3-libs`, `esp32c6-libs`…,
~240 MB cada), já que o app só oferece o DevKit clássico.

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
