# Referência dos blocos

Gerado por `node tools/gerar_referencia.js` — não edite à mão.

Cada bloco corresponde a **um** comando da linguagem Arduino. O C++ mostrado
é o que sai com os campos no valor padrão; entradas vazias usam o padrão do
gerador, indicado na coluna.

## Estrutura

| bloco | gera |
|---|---|
| `void setup()` | `(estrutura do sketch)` |
| `void loop()` | `(estrutura do sketch)` |
| `#include < Wire.h >` | `#include <Wire.h>` |
| `#define LED_PIN 13` | `#define LED_PIN 13` |
| `// comentário` | `// comentário` |
| `void minhaFuncao ( )` | `(estrutura do sketch)` |
| `return` | `return;` |
| `chamar minhaFuncao ( )` | `minhaFuncao();` |
| `minhaFuncao ( )` | `Serial.println(minhaFuncao());` |

## E/S digital

| bloco | gera |
|---|---|
| `pinMode ( 0 , OUTPUT )` | `pinMode(0, OUTPUT);` |
| `digitalWrite ( 0 , )` | `digitalWrite(0, LOW);` |
| `digitalRead ( 0 )` | `Serial.println(digitalRead(0));` |

## E/S analógica

| bloco | gera |
|---|---|
| `analogRead ( A0 )` | `Serial.println(analogRead(A0));` |
| `analogWrite ( 3 , )` | `analogWrite(3, 0);` |
| `analogReference ( DEFAULT )` | `analogReference(DEFAULT);` |

## E/S avançada

| bloco | gera |
|---|---|
| `tone ( 0 , )` | `tone(0, 440);` |
| `tone ( 0 , , )` | `tone(0, 440, 500);` |
| `noTone ( 0 )` | `noTone(0);` |
| `pulseIn ( 0 , HIGH )` | `Serial.println(pulseIn(0, HIGH));` |
| `pulseIn ( 0 , HIGH , )` | `Serial.println(pulseIn(0, HIGH, 1000000));` |
| `shiftOut ( dados 0 clock 0 MSBFIRST , )` | `shiftOut(0, 0, MSBFIRST, 0);` |
| `shiftIn ( dados 0 clock 0 MSBFIRST )` | `Serial.println(shiftIn(0, 0, MSBFIRST));` |

## Tempo

| bloco | gera |
|---|---|
| `delay ( )` | `delay(1000);` |
| `delayMicroseconds ( )` | `delayMicroseconds(1000);` |
| `millis ( )` | `Serial.println(millis());` |
| `micros ( )` | `Serial.println(micros());` |

## Serial

| bloco | gera |
|---|---|
| `Serial .begin ( 9600 )` | `Serial.begin(9600);` |
| `Serial .print ( )` | `Serial.print("");` |
| `Serial .println ( )` | `Serial.println();` |
| `Serial .print ( , DEC )` | `Serial.print(0, DEC);` |
| `Serial .write ( )` | `Serial.write(0);` |
| `Serial .available ( )` | `Serial.println(Serial.available());` |
| `Serial .read ( )` | `Serial.println(Serial.read());` |
| `Serial .readStringUntil ( '\n' )` | `Serial.println(Serial.readStringUntil('\n'));` |
| `Serial .parseInt ( )` | `Serial.println(Serial.parseInt());` |
| `Serial .flush ( )` | `Serial.flush();` |
| `Serial .end ( )` | `Serial.end();` |

## Controle

| bloco | gera |
|---|---|
| `se faça` | `if (false) {` |
| `for ( int i = ; < ; += )` | `for (int i = 0; i < 10; i += 1) {` |
| `while ( )` | `while (false) {` |
| `do while ( )` | `do {` |
| `switch ( )` | `switch (0) {` |
| `case 1 : break; true` | `case 1:<br>  break;` |
| `default :` | `default:` |
| `break ;` | `break;` |
| `continue ;` | `continue;` |

## Operadores

| bloco | gera |
|---|---|
| `=` | `Serial.println(0 == 0);` |
| `e` | `Serial.println(true && true);` |
| `não` | `Serial.println(!true);` |
| `verdadeiro` | `Serial.println(true);` |
| `+` | `Serial.println(0 + 0);` |
| `contador +=` | `contador += 1;` |
| `contador ++` | `contador++;` |
| `&` | `Serial.println(0 & 0);` |
| `~` | `Serial.println(~0);` |
| `bitRead ( , )` | `Serial.println(bitRead(0, 0));` |
| `bitWrite ( valor , , )` | `bitWrite(valor, 0, 0);` |
| `bitSet ( valor , )` | `bitSet(valor, 0);` |
| `bit ( )` | `Serial.println(bit(0));` |

## Matemática

| bloco | gera |
|---|---|
| `map ( , , , , )` | `Serial.println(map(0, 0, 0, 0, 0));` |
| `constrain ( , , )` | `Serial.println(constrain(0, 0, 0));` |
| `min ( , )` | `Serial.println(min(0, 0));` |
| `abs ( )` | `Serial.println(abs(0));` |
| `pow ( , )` | `Serial.println(pow(0, 2));` |
| `random ( , )` | `Serial.println(random(0, 100));` |
| `random ( )` | `Serial.println(random(100));` |
| `randomSeed ( )` | `randomSeed(analogRead(A0));` |

## Tipos e valores

| bloco | gera |
|---|---|
| `int valor =` | `int valor;` |
| `global int valor =` | `int valor;` |
| `global int lista [ 3 ] = { 1, 2, 3 }` | `int lista[3] = {1, 2, 3};` |
| `lista [ ]` | `Serial.println(lista[0]);` |
| `lista [ ] =` | `lista[0] = 0;` |
| `int ( )` | `Serial.println(int(0));` |
| `HIGH` | `Serial.println(HIGH);` |
| `0` | `Serial.println(0);` |
| `" olá "` | `Serial.println("olá");` |
| `' A '` | `Serial.println('A');` |

## Interrupções

| bloco | gera |
|---|---|
| `attachInterrupt ( digitalPinToInterrupt ( 2 ) , minhaISR , RISING )` | `attachInterrupt(digitalPinToInterrupt(2), minhaISR, RISING);` |
| `detachInterrupt ( digitalPinToInterrupt ( 2 ) )` | `detachInterrupt(digitalPinToInterrupt(2));` |
| `interrupts ( )` | `interrupts();` |

## Bibliotecas

| bloco | gera |
|---|---|
| `meuServo .attach ( 3 )` | `meuServo.attach(3);` |
| `meuServo .write ( )` | `meuServo.write(90);` |
| `meuServo .writeMicroseconds ( )` | `meuServo.writeMicroseconds(1500);` |
| `meuServo .read ( )` | `Serial.println(meuServo.read());` |
| `meuServo .detach ( )` | `meuServo.detach();` |
| `Wire.begin ( )` | `Wire.begin();` |
| `Wire.beginTransmission ( )` | `Wire.beginTransmission(0x27);` |
| `Wire.write ( )` | `Wire.write(0);` |
| `Wire.endTransmission ( )` | `Wire.endTransmission();` |
| `Wire.requestFrom ( , )` | `Wire.requestFrom(0x27, 1);` |
| `Wire.available ( )` | `Serial.println(Wire.available());` |
| `Wire.read ( )` | `Serial.println(Wire.read());` |
| `SPI.begin ( )` | `SPI.begin();` |
| `SPI.transfer ( )` | `Serial.println(SPI.transfer(0));` |
| `EEPROM.read ( )` | `Serial.println(EEPROM.read(0));` |
| `EEPROM.write ( , )` | `EEPROM.write(0, 0);` |
| `lcd : LCD I2C endereço 0x27 16 colunas × 2 linhas — init()` | `lcd.init();` |
| `lcd .backlight ( )` | `lcd.backlight();` |
| `lcd .setCursor ( , )` | `lcd.setCursor(0, 0);` |
| `lcd .print ( )` | `lcd.print("");` |
| `lcd .clear ( )` | `lcd.clear();` |
| `serialSoft : SoftwareSerial RX 0 TX 0 — begin ( 9600 )` | `serialSoft.begin(9600);` |
| `serialSoft .println ( )` | `serialSoft.println("");` |
| `serialSoft .available ( )` | `Serial.println(serialSoft.available());` |
| `serialSoft .read ( )` | `Serial.println(serialSoft.read());` |
| `dht : DHT pino 0 tipo DHT11 — begin ( )` | `dht.begin();` |
| `dht . readTemperature ( )` | `Serial.println(dht.readTemperature());` |

## Lógica Paraconsistente

| bloco | gera |
|---|---|
| `evidência de no universo de a , linear crescente` | `Serial.println(lpaEvidencia(0, 0, 1023, 0));` |
| `complemento de` | `Serial.println(1.0 - 0.5);` |
| `Grau de Certeza Gc de μ λ` | `Serial.println(lpaGc(0.5, 0.5));` |
| `estado de μ λ em 12 regiões` | `Serial.println(lpaEstado(0.5, 0.5, 0.5, -0.5, 0.5, -0.5));` |
| `nome do estado` | `Serial.println(lpaNomeEstado(0));` |
| `indefinição em μ λ ?` | `Serial.println(lpaIndefinido(0.5, 0.5));` |
| `NAP de μ λ μEr em muEr , φE em phiE` | `{<br>  float lpaMu = 0.5, lpaLam = 0.5;<br>  muEr = lpaMuEr(lpaMu, lpaLam);<br>  phiE = lpaPhi(lpaGct(lpaMu, lpaLam));` |
| `Para-Analisador μ fonte 2 é evidência favorável (usa 1 − μ2) em 12 regiões, limites 0.5 -0.5 0.5 -0.5` | `switch (lpaEstado(0.5, 1.0 - (0.5), 0.5, -0.5, 0.5, -0.5)) {` |
| `Para-Analisador sensor 1 sensor 2 universo de a , em 12 regiões` | `{<br>  float lpaA1 = 0, lpaA2 = 1023;<br>  float lpaS1 = 0, lpaS2 = 0;<br>  switch (lpaEstado(lpaEvidencia(lpaS1, lpaA1, lpaA2, 0), 1.0 - lpaEvidencia(lpaS2, lpaA1, lpaA2, 0), 0.5, -0.5, 0.5, -0.5)) {` |
| `estado V — Verdadeiro` | `case LPA_V:<br>  break;` |
| `nos demais estados` | `default:<br>  break;` |
| `OR — maximização entre e` | `Serial.println(lpaMax(0.5, 0.5));` |
| `ParaExtrctr sobre evidencias com graus` | `Serial.println(lpaExtractor(evidencias, 2));` |

## Código livre

| bloco | gera |
|---|---|
| `código C++ // seu código aqui` | `// seu código aqui` |
| `expressão analogRead(A0) * 2` | `Serial.println((analogRead(A0) * 2));` |

## E/S analógica (ESP32 DevKit (WROOM-32))

| bloco | gera |
|---|---|
| `analogReadResolution ( )` | `analogReadResolution(12);` |

## Bibliotecas (ESP32 DevKit (WROOM-32))

| bloco | gera |
|---|---|
| `EEPROM.begin ( )` | `EEPROM.begin(512);` |
| `EEPROM.commit ( )` | `EEPROM.commit();` |

## ESP / WiFi (ESP32 DevKit (WROOM-32))

| bloco | gera |
|---|---|
| `WiFi.begin ( minha-rede , senha123 )` | `WiFi.begin("minha-rede", "senha123");` |
| `WiFi.status ( )` | `Serial.println(WiFi.status());` |
| `WiFi.localIP ( )` | `Serial.println(WiFi.localIP());` |
| `WiFi.RSSI ( )` | `Serial.println(WiFi.RSSI());` |
| `WiFi.disconnect ( )` | `WiFi.disconnect();` |
| `ESP.restart ( )` | `ESP.restart();` |
| `ESP.deepSleep ( )` | `ESP.deepSleep(1000000);` |
| `ESP.getFreeHeap ( )` | `Serial.println(ESP.getFreeHeap());` |
| `ledcAttach ( 2 , freq , bits )` | `ledcAttach(2, 5000, 8);` |
| `ledcWrite ( 2 , )` | `ledcWrite(2, 128);` |
| `ledcDetach ( 2 )` | `ledcDetach(2);` |

---

Total de blocos documentados: **136**.
