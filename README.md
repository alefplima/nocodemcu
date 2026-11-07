# NoCodeMCU

**English** | [Português](README.pt-BR.md)

A **desktop** no-code programming app for Arduino: students build the program
from blocks, watch the real `.ino` being written next to it, and **upload it to
the physical board over USB** — Uno, Nano, Mega, Leonardo, ESP32, ESP32-S3 CAM
and ESP8266.

The installer brings everything: the app, `arduino-cli` and the board
compilers. There is no need to install the Arduino IDE or download anything
afterwards.

The app speaks **Portuguese and English**: switch in **Options → Language /
Idioma**. In English, the blocks, menus, messages, the comments in the
generated code and the examples (in `exemplos/en/`) are in English too.

## Installation (Windows)

1. Download the installer
   **[NoCodeMCU-Setup-0.2.0.exe](https://github.com/alefplima/nocodemcu/releases/download/v0.2.0/NoCodeMCU-Setup-0.2.0.exe)**
   (Windows 10 or 11, 64-bit).
2. Run it and choose the install folder. If Windows shows "Windows protected
   your PC", click **More info** and then **Run anyway**.
3. Open NoCodeMCU from the Start menu, plug the board into USB and choose its
   `COM` port in the app. To use the app in English: **Opções → Idioma /
   Language → English**.

## Installation (Linux)

1. Download one of the two files from version 0.1.0 at
   **[Releases](https://github.com/alefplima/nocodemcu/releases/tag/v0.1.0)**
   (the 0.2.0 Linux packages, with the English language, are still to come;
   version 0.1.0 is in Portuguese only):
   - `nocodemcu_0.1.0_amd64.deb`, for Ubuntu, Debian, Mint and derivatives;
   - `NoCodeMCU-0.1.0.AppImage`, for any 64-bit Linux, with no installation.
2. Install:
   - **.deb:** `sudo apt install ./nocodemcu_0.1.0_amd64.deb`. NoCodeMCU shows
     up in the applications menu.
   - **AppImage:** `chmod +x NoCodeMCU-0.1.0.AppImage` and then
     `./NoCodeMCU-0.1.0.AppImage`. On Ubuntu 22.04 or newer, if it does not
     open, first install `sudo apt install libfuse2`.
3. Grant USB access (only once): `sudo usermod -aG dialout $USER`. Then **log
   out and back in**; without this the board shows up, but uploading fails with
   "permission denied".

## Example: 4x4 car with the ESP32-S3 CAM

Example 15 (**4x4 car — PAL2v with camera and operator**) is a four-wheel-drive
car that drives by itself, avoiding obstacles with Paraconsistent Annotated
Logic (PAL2v). When it swerves three times in a row without finding a free
path, it understands it is stuck: it stops, opens the camera on the phone and
hands control to the operator. The operator drives with the page joystick and
returns the car to PAL2v with the **Release** button.

### Parts

| part | quantity |
|---|---|
| ESP32-S3 CAM (ESP32-S3-WROOM-1 N16R8, OV5640 or OV2640 camera) | 1 |
| 4x4 chassis with 4 DC motors | 1 |
| L298N H-bridge | 1 |
| HC-SR04 ultrasonic sensor | 2 |
| 1 kΩ and 2 kΩ (or 2.2 kΩ) resistors | 2 of each |
| Battery for the motors (7 V or more, because of the L298N regulator) | 1 |

### Wiring

| connection | ESP32-S3 CAM GPIO |
|---|---|
| L298N **IN1 / IN2** (right side: OUT1/OUT2) | **1 / 2** |
| L298N **IN3 / IN4** (left side: OUT3/OUT4) | **42 / 41** |
| Left HC-SR04 **TRIG / ECHO** | **14 / 21** |
| Right HC-SR04 **TRIG / ECHO** | **47 / 40** |

- The two motors on each side go **in parallel** on the same L298N channel.
- The L298N **ENA** and **ENB** keep their jumpers.
- The **GND** of the L298N, the sensors and the board are all tied together.
- The sensors are powered with **5 V**.
- **ECHO needs a voltage divider.** The HC-SR04 answers at 5 V and the
  ESP32-S3 only tolerates 3.3 V:

  ```
   HC-SR04 ECHO ──[ 1 kΩ ]──┬── board GPIO (21 or 40)
                            │
                         [ 2 kΩ ]
                            │
                           GND
  ```

  TRIG goes straight, with no resistor. With **HC-SR04P** or **RCWL-1601**
  sensors, which work at 3.3 V, the divider is not needed (their VCC goes to
  3.3 V).
- If turning comes out reversed (joystick left turns the car right), swap the
  pairs in the **motors** block: 42/41 ↔ 1/2.

### Uploading

1. Plug the board into the computer over USB.
2. In NoCodeMCU: **File → Examples → 4x4 car — PAL2v with camera and
   operator**. The board (**ESP32-S3 CAM**) and Abstract Mode come with the
   example.
3. Choose the port (on Linux, `/dev/ttyACM0`) and use **Board → Compile and
   upload** (Ctrl+U). The first compilation takes a few minutes.
4. **Only on the first upload**, if the board still has the factory program
   and the upload does not start: hold the **BOOT** button, press and release
   **RST**, release **BOOT** and upload again. After that, uploads are
   automatic.

### Using it

1. With the car powered by the battery, connect the phone to the **car4x4**
   Wi-Fi network (open, no password). In the Portuguese example the network is
   called **carro4x4**.
2. Open **http://192.168.4.1** in the phone browser.
3. While PAL2v drives, the page shows the lattice with the state of the
   analysis (V, F, T and ⊥ in four colors) and the distances from both sensors.
4. When the car gets stuck, the video appears at the top with the **STUCK**
   notice. Drive with the **joystick** and tap **Release** to give the car back
   to PAL2v.
5. The **Take over** button does the same at any time, without waiting for the
   car to get stuck.

Details:

- **The camera sleeps** while the video is not on the page: the OV5640 gets
  very hot filming for nothing. It wakes up on **Take over** and goes back to
  sleep on **Release**.
- **Video upside down?** In the **turn on the camera** block, switch to
  **rotated 180°** or back to **as the camera gives it**, depending on
  how it is mounted.
- **Black or frozen video?** Tap the video to reconnect. If it happens often,
  it is almost always the battery. The voltage drop when the four motors start
  reaches the board and the camera. A 470–1000 µF capacitor between 5 V and GND
  near the board helps; the most reliable fix is to power the board separately
  from the motors (for example, a power bank on USB), with the GNDs tied
  together.
- **Speeds and turning time** (`SPEED`, `TURN_SPEED`, `TURN_TIME`) are a
  starting point: adjust them in the **On start** block for your floor and
  your battery.

---

NoCodeMCU was born next to the `iot/` module of TaskAI, but with the opposite
premise: there, blocks are device abstractions (*"blink red LED"*, with pin 13
hidden in the generator) and the C++ exists only for display. Here **a block
is a command of the Arduino language**, nothing more.

```
pinMode( 13 , OUTPUT )        →   pinMode(13, OUTPUT);
digitalWrite( 13 , HIGH )     →   digitalWrite(13, HIGH);
delay( 1000 )                 →   delay(1000);
```

No block bundles commands, no pin is implicit, and nothing is injected on its
own: if the student did not add `Serial.begin()`, it does not appear in the
code.

### Literal Mode and Abstract Mode

What is described above is **Literal Mode**, and it is the default. Under
**View → Mode** there is **Abstract Mode**: simplified blocks, with only
parameters, where one block can stand for more than one command.

```
digital write pin [13] [on]   →   pinMode(13, OUTPUT);    (in setup)
                                  digitalWrite(13, HIGH);  (where the block is)
```

Switching modes **converts the program** in both directions, and the conversion
does not change the generated C++ — `tools/modo_test.js` compares before and
after character by character. What has no form in the other mode (free code,
`switch`, bit operations and, on the abstract side, the ultrasonic sensor and
the servo) stays as it is and is reported in the Output tab.

Block comments follow the conversion and become `// ...` in the `.ino`. There
is one stated limit: when two literal blocks become a single abstract one (the
`Serial.print` + `Serial.println` pair becomes *show*), the comments of both
end up in the same block and come out together. No text is lost — only the
line where it appears changes — and the test checks exactly that.

### The only exception to "one block, one command": Paraconsistent Logic

The **Paraconsistent Logic** category is the deliberate exception to the rule
above. It brings PAL2v — Paraconsistent Annotated Logic with two-value
annotation, in J. I. Da Silva Filho's applied formulation — to decide from
evidence that contradicts itself, something that does not exist as an Arduino
command.

The abstraction is honest because the C++ stays in view: each block becomes a
call to a function named after the quantity in the theory, and the whole
function appears in the code panel.

```
Certainty Degree Gc of μ [0.9] λ [0.2]   →   lpaGc(0.9, 0.2)

                                             float lpaGc(float mu, float lam) {
                                               return mu - lam;
                                             }
```

Only what is used goes into the sketch: asking for the Certainty Degree does
not drag in the `sqrt()` of the Real Certainty Degree. See `docs/blocos.md`
for the full list (in Portuguese).

---

## Running

```bash
npm install
npm run toolchain          # downloads arduino-cli + cores (once; 2.5 GB, or 366 MB with --slim)
npm run dev                # on Linux; uses --no-sandbox
# npm start                # on other platforms
```

Open a project directly:

```bash
npm run dev -- exemplos/en/01-blink.tbk
```

> **Linux:** to upload to the board the user must be in the `dialout` group:
> `sudo usermod -aG dialout $USER` and then log out and back in.
> The app warns when this is the problem.

---

## Bundled toolchain

The app **does not depend on an installed Arduino IDE**. `arduino-cli`, the
cores and the libraries live inside the package, in
`resources/toolchain/<os>/`.

```bash
node tools/fetch_toolchain.mjs            # current OS, everything (AVR + ESP32 + ESP8266)
node tools/fetch_toolchain.mjs --slim     # AVR only — small bundle
node tools/fetch_toolchain.mjs --so=win   # Windows bundle, built from Linux
```

When the target is the machine itself, the script uses `arduino-cli core
install`. When it is another OS, it downloads straight from the package
indexes, picking the binaries for the target host — this is what allows
building the Windows installer without a second machine.

Sizes measured on this machine: **366 MB** with AVR only and **2.46 GB** with
ESP32 and ESP8266 — after pruning. Without pruning it would be 6.2 GB: out go
`staging/` (already extracted archives), the RISC-V toolchain (for C3/C6/H2)
and the precompiled libraries of the other SoCs in the family
(`esp32c6-libs`, `esp32p4-libs`…, ~240 MB each). The ones kept are for the
classic ESP32 (`esp32-libs`) and the ESP32-S3 (`esp32s3-libs`, for the
ESP32-S3 CAM), which add ~240 MB to the 2.46 GB measured before the S3 joined
the catalog.

At run time the app does not write inside the bundle: it creates a writable
data directory in `userData` and links `packages/` with a symlink (a junction
on Windows), copying only the indexes and the libraries.

---

## Packaging

```bash
npm run build:linux    # AppImage + .deb
npm run build:win      # NSIS installer
npm run build:slim     # AVR-only toolchain + packaging
npm run build:full     # full toolchain + packaging
```

---

## Structure

```
src/main/         main process (Node)
  cli.js            arduino-cli: detect ports, compile, upload, parse errors
  serial.js         serial monitor (serialport), suspended during upload
  ipc.js            IPC channels — the only surface exposed to the renderer
  projects.js       .tbk (project) and .ino export
  settings.js       preferences in userData
  idioma.js         language of the menus and system dialogs
src/preload/      contextBridge → window.tb.*
src/renderer/     interface, no bundler (classic scripts, as in TaskAI)
  js/i18n.js        Portuguese/English dictionary of the interface and blocks
  js/i18n_codigo.js generated C++ in English: comments and runtime names
  js/boards.js      board catalog: FQBN, pins, PWM, ADC, libs, features
  js/fields.js      pin fields: dropdowns that change with the board
  js/blocks/*.js    block definitions, one file per category
  js/generator/     Arduino generator (subclass of Blockly.Generator)
  js/toolbox.js     toolbox built at run time and filtered by the board
  js/validate.js    revalidation of the program against the selected board
  vendor/blockly/   local Blockly 13.2.1 (same copy used by TaskAI)
tools/            harnesses and build scripts
exemplos/         ready-made .tbk projects (exemplos/en/: in English)
```

### The generator

It is a real subclass of `Blockly.Generator` — not a hand-written walker. That
gives nesting, precedence and variables for free, and allows three things that
matter:

- **Canonical file order**: includes → `#define`s → globals and library
  instances → prototypes → functions → `setup()` → `loop()`.
- **Definitions coming from anywhere**: a `myServo.write(90)` block in the
  middle of `loop()` makes `#include <Servo.h>` and `Servo myServo;` appear at
  the top, only once, even with twenty blocks asking for them.
- **Line → block map**: each statement is marked while the text is built, so
  `sketch.ino:23: error` becomes a warning on the guilty block, selected on
  screen — instead of a raw log the student cannot read.

In English, the comments and the runtime names in the generated C++ are
translated too (`absMotors`, `absWebWait`, `lpaEvidence`…), always keeping the
same lines, so the line → block map stays valid.

### Boards

`boards.js` is the single source. Pin fields are dropdowns derived from the
board, and switching boards revalidates the program: a missing pin,
`analogWrite` on a pin without PWM, `Serial1` on an Uno or `SoftwareSerial` on
an ESP32 become warnings on the block and block the compilation before
spending time on the compiler.

The differences between boards were found by actually compiling, not from
memory — the ones the catalog already holds:

| difference | where |
|---|---|
| `EEPROM.update` does not exist | ESP32 and ESP8266 (EEPROM is emulated: `begin` + `write` + `commit`) |
| the registry `Servo` does not compile | ESP32 with core 3.x (it uses the old LEDC API); the ESP8266 ships Servo in its own core |
| `analogReference` | AVR only |
| `analogReadResolution`, `ledcAttach/Write/Detach` | ESP32 only |
| `SoftwareSerial` | AVR only |
| ADC2 (pins 0, 2, 4, 12–15, 25–27) stops reading with WiFi on | ESP32 — becomes a warning on the `analogRead` block |
| camera and video server (port 81) | ESP32-S3 CAM only; the camera uses LEDC channel 7/timer 3 so it does not clash with `analogWrite` |
| Wire and SPI left out | ESP32-S3 CAM: their default pins (8/9, 10–13) belong to the camera |

---

## Tests

```bash
npm test                  # whole suite
npm run test:gen          # generator only (no toolchain needed)
npm run test:compile      # compiles the fixtures for real, board by board
npm run test:pipeline     # the app's real path: cli.js + temporary userData
node tools/i18n_codigo_test.js   # generated C++ in English, every example
```

| suite | what it guarantees |
|---|---|
| `gen_test.js` | 1994 checks: every block has a generator, precedence, nesting, file order, warnings, line map, validation per board |
| `ui_test.js` | 51 checks: reading plotter and lattice lines, classification into the 12 PAL2v regions, and `.tbk` project / preferences round trips |
| `modo_test.js` | 99 checks: converting between Literal Mode and Abstract Mode does not change the generated C++ — compared character by character, block by block and example by example. It prints how many comparisons were byte-identical, how many differ only in declaration order and how many only regrouped comments (none lost) |
| `doc_test.js` | 200 checks: both documents generate, and the handout answer key is recomputed by an independent implementation |
| `compile_test.js` | 21 fixtures × 7 boards = **~130 real compilations** with `arduino-cli` — if the generator produces invalid C++, it breaks here (takes ~20 min with the ESPs) |
| `pipeline_test.js` | 14 checks: toolchain preparation, compilation through the same module Electron uses, and a compiler error landing on the right block |
| `i18n_codigo_test.js` | in English, every example keeps the same lines and line map, no new name collides with an existing one, and no runtime name or comment is left in Portuguese |

The block reference (`docs/blocos.md`) is also generated from the code, by
`node tools/gerar_referencia.js` — a new block shows up in it by itself, with
the C++ it produces.

Compilation tests are skipped with a warning when the toolchain has not been
built yet, instead of failing the suite.

The harnesses run in plain Node loading the vendored Blockly (the UMD exports
as CommonJS) — the same discipline as the TaskAI harnesses.

---

## Checking with the board in hand

What the automated tests **do not** reach is the upload itself. With the board
plugged in, the checklist is:

1. `npm run dev -- exemplos/en/01-blink.tbk`, choose **Arduino Uno** and check
   that the port shows up by itself in the list (detection runs every 4 s).
2. **Compile and upload** → the board LED blinks every second. The *Output* tab
   shows the program size.
3. Open `exemplos/en/02-potentiometer-plotter.tbk`, upload, go to **Serial
   monitor** → *Connect* at 9600. Turn the potentiometer on A0 and watch the
   numbers scroll; the **Plotter** tab draws the curve.
4. Switch the selector to **ESP32 DevKit** without touching the blocks: the
   *ESP / WiFi* category appears, the pins are revalidated and incompatible
   blocks get a warning. Upload `exemplos/en/05-esp32-wifi.tbk` to a DevKit.
5. Cause an error (a *Free code* block with invalid C++) and check that the
   compiler message shows up **on the block**, selected on screen.
6. Close and reopen: board, port, baud rate and the program being edited come
   back as they were.

## Project format

`.tbk` is JSON: a header with the board and the workspace
`Blockly.serialization`. Opening a project restores the program **and** the
board it was made for. There is also an automatic draft in `localStorage`, so
work is not lost when the window closes without saving.

## License

NoCodeMCU's code is distributed under the [MIT license](LICENSE) —
Copyright (c) 2026 Alessandro Ferreira Paz Lima.

The installers also carry third-party tools, which follow the licenses of their
own projects: [arduino-cli](https://github.com/arduino/arduino-cli)
(GPL-3.0), the board cores (Arduino AVR, [Espressif ESP32](https://github.com/espressif/arduino-esp32),
ESP8266) and [Blockly](https://github.com/google/blockly) (Apache-2.0).
