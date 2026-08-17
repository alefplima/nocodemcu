'use strict';
/**
 * Categoria BIBLIOTECAS — um bloco por método, sem agrupar chamadas.
 *
 * Todo bloco carrega o nome do objeto (ex.: "meuServo"), então dá para ter
 * vários servos, vários DHTs. O gerador cuida de emitir o #include e a
 * declaração do objeto uma única vez por nome.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const COR = 160;

    Blockly.defineBlocksWithJsonArray([

        /* ---------- Servo ---------- */
        {
            type: 'ard_servo_attach',
            message0: '%1 .attach ( %2 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'meuServo' },
                { type: 'field_pin_pwm', name: 'PIN' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Liga o objeto Servo a um pino.'
        },
        {
            type: 'ard_servo_write',
            message0: '%1 .write ( %2 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'meuServo' },
                { type: 'input_value', name: 'ANGULO' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Move o servo para o ângulo (0 a 180).'
        },
        {
            type: 'ard_servo_writemicroseconds',
            message0: '%1 .writeMicroseconds ( %2 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'meuServo' },
                { type: 'input_value', name: 'US' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Comanda o servo pela largura de pulso, em microssegundos.'
        },
        {
            type: 'ard_servo_read',
            message0: '%1 .read ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'meuServo' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Último ângulo comandado.'
        },
        {
            type: 'ard_servo_detach',
            message0: '%1 .detach ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'meuServo' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Solta o pino do servo.'
        },

        /* ---------- Wire (I2C) ---------- */
        {
            type: 'ard_wire_begin',
            message0: 'Wire.begin ( )',
            previousStatement: null, nextStatement: null,
            colour: COR,
            tooltip: 'Inicia o barramento I2C como mestre.'
        },
        {
            type: 'ard_wire_begintransmission',
            message0: 'Wire.beginTransmission ( %1 )',
            args0: [{ type: 'input_value', name: 'ENDERECO' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Começa uma transmissão para o dispositivo do endereço.'
        },
        {
            type: 'ard_wire_write',
            message0: 'Wire.write ( %1 )',
            args0: [{ type: 'input_value', name: 'VALOR' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Enfileira um byte para envio.'
        },
        {
            type: 'ard_wire_endtransmission',
            message0: 'Wire.endTransmission ( )',
            previousStatement: null, nextStatement: null,
            colour: COR,
            tooltip: 'Envia os bytes enfileirados e encerra a transmissão.'
        },
        {
            type: 'ard_wire_requestfrom',
            message0: 'Wire.requestFrom ( %1 , %2 )',
            args0: [
                { type: 'input_value', name: 'ENDERECO' },
                { type: 'input_value', name: 'QTD' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Pede N bytes a um dispositivo.'
        },
        {
            type: 'ard_wire_available',
            message0: 'Wire.available ( )',
            output: 'Number',
            colour: COR,
            tooltip: 'Quantos bytes chegaram pelo I2C.'
        },
        {
            type: 'ard_wire_read',
            message0: 'Wire.read ( )',
            output: 'Number',
            colour: COR,
            tooltip: 'Lê o próximo byte recebido pelo I2C.'
        },

        /* ---------- SPI ---------- */
        {
            type: 'ard_spi_begin',
            message0: 'SPI.begin ( )',
            previousStatement: null, nextStatement: null,
            colour: COR,
            tooltip: 'Inicia o barramento SPI.'
        },
        {
            type: 'ard_spi_transfer',
            message0: 'SPI.transfer ( %1 )',
            args0: [{ type: 'input_value', name: 'VALOR' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Envia um byte pelo SPI e devolve o byte recebido.'
        },

        /* ---------- EEPROM ---------- */
        {
            type: 'ard_eeprom_read',
            message0: 'EEPROM.read ( %1 )',
            args0: [{ type: 'input_value', name: 'ENDERECO' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Lê um byte da memória permanente.'
        },
        {
            type: 'ard_eeprom_write',
            message0: '%1 ( %2 , %3 )',
            args0: [
                { type: 'field_dropdown', name: 'FUNC', options: [['EEPROM.write', 'write'], ['EEPROM.update', 'update']] },
                { type: 'input_value', name: 'ENDERECO' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Grava um byte na memória permanente. update só grava se mudou.'
        },

        // Nas placas ESP a EEPROM é emulada na flash: sem begin() nada é lido e
        // sem commit() nada é gravado de verdade.
        {
            type: 'ard_eeprom_begin',
            message0: 'EEPROM.begin ( %1 )',
            args0: [{ type: 'input_value', name: 'TAMANHO' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Reserva N bytes de EEPROM emulada (ESP32 / ESP8266).'
        },
        {
            type: 'ard_eeprom_commit',
            message0: 'EEPROM.commit ( )',
            previousStatement: null, nextStatement: null,
            colour: COR,
            tooltip: 'Grava na flash o que foi escrito na EEPROM emulada (ESP32 / ESP8266).'
        },

        /* ---------- LCD I2C ---------- */
        {
            type: 'ard_lcd_init',
            message0: '%1 : LCD I2C endereço %2 %3 colunas × %4 linhas — init()',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'lcd' },
                { type: 'field_input', name: 'ENDERECO', text: '0x27' },
                { type: 'field_input', name: 'COLS', text: '16' },
                { type: 'field_input', name: 'ROWS', text: '2' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Declara o display e chama init(). Use uma vez, no setup().'
        },
        {
            type: 'ard_lcd_backlight',
            message0: '%1 .backlight ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'lcd' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Liga a luz de fundo do display.'
        },
        {
            type: 'ard_lcd_setcursor',
            message0: '%1 .setCursor ( %2 , %3 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'lcd' },
                { type: 'input_value', name: 'COL' },
                { type: 'input_value', name: 'LIN' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Posiciona o cursor (coluna, linha), contando de 0.'
        },
        {
            type: 'ard_lcd_print',
            message0: '%1 .print ( %2 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'lcd' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Escreve no display a partir do cursor.'
        },
        {
            type: 'ard_lcd_clear',
            message0: '%1 .clear ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'lcd' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Apaga o display.'
        },

        /* ---------- SoftwareSerial ---------- */
        {
            type: 'ard_softserial_begin',
            message0: '%1 : SoftwareSerial RX %2 TX %3 — begin ( %4 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'serialSoft' },
                { type: 'field_pin_digital_in', name: 'RX' },
                { type: 'field_pin_digital', name: 'TX' },
                {
                    type: 'field_dropdown', name: 'BAUD', options: [
                        ['9600', '9600'], ['4800', '4800'], ['19200', '19200'], ['38400', '38400'], ['115200', '115200']
                    ]
                }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Cria uma serial por software em dois pinos quaisquer.'
        },
        {
            type: 'ard_softserial_println',
            message0: '%1 .println ( %2 )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'serialSoft' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Envia texto pela serial de software.'
        },
        {
            type: 'ard_softserial_available',
            message0: '%1 .available ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'serialSoft' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Bytes esperando na serial de software.'
        },
        {
            type: 'ard_softserial_read',
            message0: '%1 .read ( )',
            args0: [{ type: 'field_input', name: 'OBJ', text: 'serialSoft' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Lê um byte da serial de software.'
        },

        /* ---------- DHT ---------- */
        {
            type: 'ard_dht_begin',
            message0: '%1 : DHT pino %2 tipo %3 — begin ( )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'dht' },
                { type: 'field_pin_digital_in', name: 'PIN' },
                { type: 'field_dropdown', name: 'TIPO', options: [['DHT11', 'DHT11'], ['DHT22', 'DHT22'], ['DHT21', 'DHT21']] }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Declara o sensor DHT e chama begin(). Use uma vez, no setup().'
        },
        {
            type: 'ard_dht_read',
            message0: '%1 . %2 ( )',
            args0: [
                { type: 'field_input', name: 'OBJ', text: 'dht' },
                {
                    type: 'field_dropdown', name: 'FUNC', options: [
                        ['readTemperature', 'readTemperature'], ['readHumidity', 'readHumidity']
                    ]
                }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Lê temperatura (°C) ou umidade (%) do DHT.'
        }

    ]);
})();
