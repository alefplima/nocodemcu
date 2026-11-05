'use strict';
/**
 * Catálogo de placas — fonte única de verdade sobre hardware.
 *
 * Cada placa descreve o que o gerador e a UI precisam saber: FQBN para o
 * arduino-cli, quais pinos existem, quais aceitam PWM/interrupção, resolução
 * do ADC e quais categorias de blocos fazem sentido.
 *
 * Um pino é sempre um par [rótulo, código]: o código é o texto que sai no .ino
 * (ex.: "13", "A0", "D5" no ESP8266).
 */
(function (global) {

    function range(a, b) {
        const out = [];
        for (let i = a; i <= b; i++) out.push(i);
        return out;
    }

    // Pinos numéricos viram [["13","13"], ...]
    function num(list) {
        return list.map(n => [String(n), String(n)]);
    }

    const AVR_LIBS = ['Servo', 'Wire', 'SPI', 'EEPROM', 'LiquidCrystal_I2C', 'SoftwareSerial', 'DHT'];
    // O ESP8266 traz o Servo no próprio core; o ESP32 não — e a Servo do
    // registro só funciona até o core 2.x (usa a API LEDC antiga).
    const ESP8266_LIBS = ['Servo', 'Wire', 'SPI', 'EEPROM', 'LiquidCrystal_I2C', 'DHT'];
    const ESP32_LIBS = ['Wire', 'SPI', 'EEPROM', 'LiquidCrystal_I2C', 'DHT'];

    const BOARDS = {

        uno: {
            id: 'uno',
            nome: 'Arduino Uno',
            fqbn: 'arduino:avr:uno',
            arch: 'avr',
            core: 'arduino:avr',
            digital: num(range(0, 13)).concat(num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'])),
            analog: num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5']),
            pwm: num([3, 5, 6, 9, 10, 11]),
            interrupt: num([2, 3]),
            adcBits: 10,
            pwmMax: 255,
            ledBuiltin: '13',
            seriais: ['Serial'],
            i2c: 'A4 (SDA) / A5 (SCL)',
            libs: AVR_LIBS,
            recursos: ['tone', 'analogReference', 'shift', 'pulseIn', 'eepromUpdate'],
            uploadReset: true
        },

        nano: {
            id: 'nano',
            nome: 'Arduino Nano (bootloader novo)',
            fqbn: 'arduino:avr:nano:cpu=atmega328',
            arch: 'avr',
            core: 'arduino:avr',
            digital: num(range(0, 13)).concat(num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])),
            analog: num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']),
            pwm: num([3, 5, 6, 9, 10, 11]),
            interrupt: num([2, 3]),
            adcBits: 10,
            pwmMax: 255,
            ledBuiltin: '13',
            seriais: ['Serial'],
            i2c: 'A4 (SDA) / A5 (SCL)',
            libs: AVR_LIBS,
            recursos: ['tone', 'analogReference', 'shift', 'pulseIn', 'eepromUpdate'],
            uploadReset: true
        },

        nano_old: {
            id: 'nano_old',
            nome: 'Arduino Nano (bootloader antigo)',
            fqbn: 'arduino:avr:nano:cpu=atmega328old',
            arch: 'avr',
            core: 'arduino:avr',
            digital: num(range(0, 13)).concat(num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])),
            analog: num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']),
            pwm: num([3, 5, 6, 9, 10, 11]),
            interrupt: num([2, 3]),
            adcBits: 10,
            pwmMax: 255,
            ledBuiltin: '13',
            seriais: ['Serial'],
            i2c: 'A4 (SDA) / A5 (SCL)',
            libs: AVR_LIBS,
            recursos: ['tone', 'analogReference', 'shift', 'pulseIn', 'eepromUpdate'],
            uploadReset: true
        },

        mega: {
            id: 'mega',
            nome: 'Arduino Mega 2560',
            fqbn: 'arduino:avr:mega:cpu=atmega2560',
            arch: 'avr',
            core: 'arduino:avr',
            digital: num(range(0, 53)).concat(num(range(0, 15).map(i => 'A' + i))),
            analog: num(range(0, 15).map(i => 'A' + i)),
            pwm: num(range(2, 13).concat([44, 45, 46])),
            interrupt: num([2, 3, 18, 19, 20, 21]),
            adcBits: 10,
            pwmMax: 255,
            ledBuiltin: '13',
            seriais: ['Serial', 'Serial1', 'Serial2', 'Serial3'],
            i2c: '20 (SDA) / 21 (SCL)',
            libs: AVR_LIBS,
            recursos: ['tone', 'analogReference', 'shift', 'pulseIn', 'eepromUpdate'],
            uploadReset: true
        },

        leonardo: {
            id: 'leonardo',
            nome: 'Arduino Leonardo',
            fqbn: 'arduino:avr:leonardo',
            arch: 'avr',
            core: 'arduino:avr',
            digital: num(range(0, 13)).concat(num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'])),
            analog: num(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11']),
            pwm: num([3, 5, 6, 9, 10, 11, 13]),
            interrupt: num([0, 1, 2, 3, 7]),
            adcBits: 10,
            pwmMax: 255,
            ledBuiltin: '13',
            seriais: ['Serial', 'Serial1'],
            i2c: '2 (SDA) / 3 (SCL)',
            libs: AVR_LIBS,
            recursos: ['tone', 'analogReference', 'shift', 'pulseIn', 'eepromUpdate'],
            uploadReset: true
        },

        esp32: {
            id: 'esp32',
            nome: 'ESP32 DevKit (WROOM-32)',
            fqbn: 'esp32:esp32:esp32',
            arch: 'esp32',
            core: 'esp32:esp32',
            // 34..39 são somente entrada — ficam fora da lista de saída digital
            digital: num([2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]),
            entradaSomente: num([34, 35, 36, 39]),
            analog: num([32, 33, 34, 35, 36, 39, 25, 26, 27, 14, 12, 13, 4, 2, 15]),
            pwm: num([2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]),
            interrupt: num([2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]),
            adcBits: 12,
            pwmMax: 255,
            ledBuiltin: '2',
            seriais: ['Serial', 'Serial1', 'Serial2'],
            i2c: '21 (SDA) / 22 (SCL)',
            libs: ESP32_LIBS,
            recursos: ['tone', 'pulseIn', 'shift', 'ledc', 'analogReadResolution', 'wifi', 'esp', 'eepromEmulada'],
            uploadReset: true
        },

        /*
         * ESP32-S3 com câmera (WROOM-1 N16R8, OV2640/OV5640 no conector).
         * Conferida na bancada em 2026-11-05: OV5640 respondeu com PID 0x5640
         * e 8 MB de PSRAM octal.
         *
         * A câmera ocupa 4-13 e 15-18, a PSRAM octal 35-37 e o USB 19/20 — por
         * isso a lista de pinos é curta. Ficam fora também 0, 45 e 46 (strapping
         * da partida) e 48, onde a maioria dessas placas tem o LED RGB.
         *
         * Wire e SPI ficam fora da lista de bibliotecas de propósito: os pinos
         * padrão deles no S3 (8/9 e 10-13) são pinos de dados da câmera.
         *
         * CDCOnBoot=cdc põe o Serial no USB nativo (o mesmo cabo que grava);
         * PSRAM=opi guarda os quadros da câmera; huge_app dá 3 MB para o
         * programa, que com WiFi e câmera passa de 1 MB.
         */
        esp32s3cam: {
            id: 'esp32s3cam',
            nome: 'ESP32-S3 CAM (WROOM-1, câmera)',
            fqbn: 'esp32:esp32:esp32s3:CDCOnBoot=cdc,PSRAM=opi,PartitionScheme=huge_app',
            arch: 'esp32',
            core: 'esp32:esp32',
            digital: num([1, 2, 3, 14, 21, 38, 39, 40, 41, 42, 47]),
            analog: num([1, 2, 3]),
            pwm: num([1, 2, 3, 14, 21, 38, 39, 40, 41, 42, 47]),
            interrupt: num([1, 2, 3, 14, 21, 38, 39, 40, 41, 42, 47]),
            adcBits: 12,
            pwmMax: 255,
            ledBuiltin: 'LED_BUILTIN',
            seriais: ['Serial', 'Serial1'],
            i2c: 'sem I2C livre: os pinos padrão são da câmera',
            libs: ['EEPROM', 'DHT'],
            recursos: ['tone', 'pulseIn', 'shift', 'ledc', 'analogReadResolution', 'wifi', 'esp',
                'eepromEmulada', 'camera'],
            uploadReset: true
        },

        esp8266: {
            id: 'esp8266',
            nome: 'NodeMCU ESP8266',
            fqbn: 'esp8266:esp8266:nodemcuv2',
            arch: 'esp8266',
            core: 'esp8266:esp8266',
            digital: [
                ['D0 (GPIO16)', 'D0'], ['D1 (GPIO5)', 'D1'], ['D2 (GPIO4)', 'D2'],
                ['D3 (GPIO0)', 'D3'], ['D4 (GPIO2)', 'D4'], ['D5 (GPIO14)', 'D5'],
                ['D6 (GPIO12)', 'D6'], ['D7 (GPIO13)', 'D7'], ['D8 (GPIO15)', 'D8']
            ],
            analog: [['A0', 'A0']],
            pwm: [
                ['D1 (GPIO5)', 'D1'], ['D2 (GPIO4)', 'D2'], ['D3 (GPIO0)', 'D3'],
                ['D4 (GPIO2)', 'D4'], ['D5 (GPIO14)', 'D5'], ['D6 (GPIO12)', 'D6'],
                ['D7 (GPIO13)', 'D7'], ['D8 (GPIO15)', 'D8']
            ],
            interrupt: [
                ['D1 (GPIO5)', 'D1'], ['D2 (GPIO4)', 'D2'], ['D3 (GPIO0)', 'D3'],
                ['D4 (GPIO2)', 'D4'], ['D5 (GPIO14)', 'D5'], ['D6 (GPIO12)', 'D6'],
                ['D7 (GPIO13)', 'D7'], ['D8 (GPIO15)', 'D8']
            ],
            adcBits: 10,
            pwmMax: 1023,
            ledBuiltin: 'LED_BUILTIN',
            seriais: ['Serial', 'Serial1'],
            i2c: 'D2 (SDA) / D1 (SCL)',
            libs: ESP8266_LIBS,
            recursos: ['tone', 'pulseIn', 'shift', 'wifi', 'esp', 'eepromEmulada'],
            uploadReset: true
        }
    };

    const ORDEM = ['uno', 'nano', 'nano_old', 'mega', 'leonardo', 'esp32', 'esp32s3cam', 'esp8266'];

    let atual = 'uno';

    const Boards = {
        TODAS: BOARDS,
        ORDEM: ORDEM,

        lista() {
            return ORDEM.map(id => ({ id: id, nome: BOARDS[id].nome, fqbn: BOARDS[id].fqbn }));
        },

        get(id) {
            return BOARDS[id] || null;
        },

        atual() {
            return BOARDS[atual];
        },

        atualId() {
            return atual;
        },

        selecionar(id) {
            if (!BOARDS[id]) throw new Error('Placa desconhecida: ' + id);
            atual = id;
            return BOARDS[id];
        },

        /** FQBN sugerido a partir do VID/PID que o arduino-cli reportou. */
        // O arduino-cli reporta o FQBN sem as opções de menu ("esp32:esp32:esp32s3"),
        // então a comparação também aceita só as três primeiras partes.
        porFqbn(fqbn) {
            const base = f => String(f || '').split(':').slice(0, 3).join(':');
            const placas = ORDEM.map(id => BOARDS[id]);
            return placas.find(b => b.fqbn === fqbn) ||
                placas.find(b => base(b.fqbn) === base(fqbn)) || null;
        },

        /**
         * Opções de dropdown para um tipo de pino da placa ativa.
         * tipo: 'digital' | 'digitalIn' | 'analog' | 'pwm' | 'interrupt'
         */
        pinos(tipo) {
            const b = BOARDS[atual];
            let lista;
            if (tipo === 'digitalIn') {
                lista = b.digital.concat(b.entradaSomente || []);
            } else if (tipo === 'analog') {
                lista = b.analog;
            } else if (tipo === 'pwm') {
                lista = b.pwm;
            } else if (tipo === 'interrupt') {
                lista = b.interrupt;
            } else {
                lista = b.digital;
            }
            return lista.length ? lista.map(p => [p[0], p[1]]) : [['--', '0']];
        },

        /** Um valor de pino é aceitável para este tipo nesta placa? */
        pinoValido(tipo, valor) {
            return this.pinos(tipo).some(p => p[1] === String(valor));
        },

        /** A placa ativa tem este recurso? (tone, ledc, wifi, esp, ...) */
        tem(recurso) {
            return (BOARDS[atual].recursos || []).indexOf(recurso) !== -1;
        },

        temLib(lib) {
            return (BOARDS[atual].libs || []).indexOf(lib) !== -1;
        }
    };

    global.Boards = Boards;
    if (typeof module !== 'undefined' && module.exports) module.exports = Boards;

})(typeof window !== 'undefined' ? window : global);
