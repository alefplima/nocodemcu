'use strict';
/**
 * Portão de qualidade de verdade: compila o C++ gerado com o arduino-cli.
 *
 *   node tools/compile_test.js                 # todas as placas com core instalado
 *   node tools/compile_test.js --placa=uno     # uma só
 *   node tools/compile_test.js --lista         # mostra as fixtures e sai
 *
 * O gen_test.js garante que o texto gerado é o esperado; este garante que o
 * texto é C++ válido de verdade. Placa cujo core não está instalado é pulada,
 * com aviso — não vira falha.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { carregar, novoWorkspace, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;

const args = process.argv.slice(2);
const soAtual = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const somentePlaca = (args.find(a => a.startsWith('--placa=')) || '').replace('--placa=', '');

/* ------------------------------------------------------------------ */
/* Fixtures — uma por área da linguagem                                */
/* ------------------------------------------------------------------ */

const N = v => ({ t: 'ard_number', f: { NUM: v } });
const K = v => ({ t: 'ard_const', f: { CONST: v } });
const T = v => ({ t: 'ard_text', f: { TEXTO: v } });

function setupLoop(s, l) {
    return [{ t: 'ard_setup', s: { BODY: s || [] } }, { t: 'ard_loop', s: { BODY: l || [] } }];
}

/**
 * placas: 'todas' | ['uno', ...]   (por padrão, todas)
 * Pinos usam nomes que existem em toda placa suportada, salvo fixtures
 * declaradamente específicas.
 */
const FIXTURES = [

    {
        nome: 'vazio',
        specs: setupLoop([], [])
    },

    {
        nome: 'blink',
        specs: setupLoop(
            [{ t: 'ard_pinmode', f: { PIN: 'LED', MODO: 'OUTPUT' } }],
            [
                { t: 'ard_digitalwrite', f: { PIN: 'LED' }, v: { VALOR: K('HIGH') } },
                { t: 'ard_delay', v: { MS: N(500) } },
                { t: 'ard_digitalwrite', f: { PIN: 'LED' }, v: { VALOR: K('LOW') } },
                { t: 'ard_delay', v: { MS: N(500) } }
            ]
        ),
        pino: 'LED'
    },

    {
        nome: 'serial e leitura analógica',
        specs: setupLoop(
            [{ t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } }],
            [
                { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('luz:') } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_analogread', f: { PIN: 'ADC' } } } },
                { t: 'ard_serial_print_format', f: { PORTA: 'Serial', FORMATO: 'HEX' }, v: { VALOR: N(255) } },
                { t: 'ard_delay', v: { MS: N(100) } }
            ]
        ),
        pinoAnalog: 'ADC'
    },

    {
        nome: 'variáveis, tipos e conversões',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'contador' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'float', VAR: 'fator' }, v: { VALOR: N(2) } },
            { t: 'ard_array_declare', f: { TIPO: 'int', VAR: 'leituras', TAM: '3', VALORES: '0, 0, 0' } },
            ...setupLoop([], [
                { t: 'ard_incdec', f: { VAR: 'contador', OP: '++' } },
                { t: 'ard_compound_assign', f: { VAR: 'contador', OP: '+=' }, v: { VALOR: N(2) } },
                { t: 'ard_array_set', f: { VAR: 'leituras' }, v: { INDICE: N(0), VALOR: { t: 'variables_get', f: { VAR: 'contador' } } } },
                {
                    t: 'ard_var_declare', f: { QUAL: '', TIPO: 'float', VAR: 'media' },
                    v: {
                        VALOR: {
                            t: 'ard_arith', f: { OP: '*' },
                            v: { A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_array_get', f: { VAR: 'leituras' }, v: { INDICE: N(0) } } } }, B: { t: 'variables_get', f: { VAR: 'fator' } } }
                        }
                    }
                },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'media' } } } }
            ])
        ]
    },

    {
        nome: 'controle: if, for, while, do-while, switch',
        specs: setupLoop([], [
            {
                t: 'ard_for', f: { VAR: 'i', CMP: '<', OP: '+=' },
                v: { INICIO: N(0), LIMITE: N(5), PASSO: N(1) },
                s: {
                    BODY: [
                        { t: 'ard_delay', v: { MS: N(1) } },
                        {
                            t: 'controls_if',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'GT' }, v: { A: { t: 'ard_millis' }, B: N(1000) } } },
                            s: { DO0: [{ t: 'ard_break' }] }
                        },
                        { t: 'ard_continue' }
                    ]
                }
            },
            {
                t: 'ard_while', v: { COND: { t: 'logic_boolean', f: { BOOL: 'FALSE' } } },
                s: { BODY: [{ t: 'ard_delay', v: { MS: N(1) } }] }
            },
            {
                t: 'ard_do_while', v: { COND: { t: 'logic_boolean', f: { BOOL: 'FALSE' } } },
                s: { BODY: [{ t: 'ard_delay', v: { MS: N(1) } }] }
            },
            {
                t: 'ard_switch', v: { EXPR: { t: 'ard_cast', f: { TIPO: 'int' }, v: { VALOR: { t: 'ard_millis' } } } },
                s: {
                    CASOS: [
                        { t: 'ard_case', f: { VALOR: '0', BREAK: 'TRUE' }, s: { BODY: [{ t: 'ard_delay', v: { MS: N(1) } }] } },
                        { t: 'ard_case', f: { VALOR: '1', BREAK: 'FALSE' }, s: { BODY: [] } },
                        { t: 'ard_default', s: { BODY: [{ t: 'ard_delay', v: { MS: N(2) } }] } }
                    ]
                }
            }
        ])
    },

    {
        nome: 'operadores e bits',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'byte', VAR: 'flags' }, v: { VALOR: N(0) } },
            ...setupLoop([], [
                { t: 'ard_bitsetclear', f: { FUNC: 'bitSet', VAR: 'flags' }, v: { BIT: N(2) } },
                { t: 'ard_bitwrite', f: { VAR: 'flags' }, v: { BIT: N(1), ESTADO: N(1) } },
                {
                    t: 'ard_serial_println', f: { PORTA: 'Serial' },
                    v: {
                        VALOR: {
                            t: 'ard_bitwise', f: { OP: '<<' },
                            v: { A: { t: 'ard_bitread', v: { VALOR: { t: 'variables_get', f: { VAR: 'flags' } }, BIT: N(2) } }, B: N(3) }
                        }
                    }
                },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_bitnot', v: { A: { t: 'variables_get', f: { VAR: 'flags' } } } } } }
            ])
        ]
    },

    {
        nome: 'matemática',
        specs: setupLoop([], [
            {
                t: 'ard_serial_println', f: { PORTA: 'Serial' },
                v: {
                    VALOR: {
                        t: 'ard_map',
                        v: { VALOR: { t: 'ard_analogread', f: { PIN: 'ADC' } }, DE_MIN: N(0), DE_MAX: N(1023), PARA_MIN: N(0), PARA_MAX: N(255) }
                    }
                }
            },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_constrain', v: { VALOR: N(300), MIN: N(0), MAX: N(255) } } } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_minmax', f: { FUNC: 'max' }, v: { A: N(1), B: N(2) } } } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_math_single', f: { FUNC: 'sqrt' }, v: { A: N(16) } } } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_pow', v: { BASE: N(2), EXPO: N(8) } } } },
            { t: 'ard_randomseed', v: { SEMENTE: { t: 'ard_analogread', f: { PIN: 'ADC' } } } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_random', v: { MIN: N(0), MAX: N(10) } } } }
        ]),
        pinoAnalog: 'ADC'
    },

    {
        nome: 'funções e interrupção',
        specs: [
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'contarPulso', PARAMS: '' },
                s: { BODY: [{ t: 'ard_incdec', f: { VAR: 'pulsos', OP: '++' } }] }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'int', NOME: 'dobro', PARAMS: 'int v' },
                s: { BODY: [{ t: 'ard_return', v: { VALOR: { t: 'ard_arith', f: { OP: '*' }, v: { A: { t: 'ard_raw_expr', f: { CODE: 'v' } }, B: N(2) } } } }] }
            },
            { t: 'ard_var_global', f: { QUAL: 'volatile', TIPO: 'int', VAR: 'pulsos' }, v: { VALOR: N(0) } },
            ...setupLoop(
                [{ t: 'ard_attachinterrupt', f: { PIN: 'IRQ', FUNC: 'contarPulso', MODO: 'RISING' } }],
                [
                    { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_call_value', f: { NOME: 'dobro' }, v: { ARG0: { t: 'variables_get', f: { VAR: 'pulsos' } } } } } },
                    { t: 'ard_interrupts', f: { FUNC: 'noInterrupts' } },
                    { t: 'ard_interrupts', f: { FUNC: 'interrupts' } },
                    { t: 'ard_detachinterrupt', f: { PIN: 'IRQ' } }
                ]
            )
        ],
        pinoIrq: 'IRQ'
    },

    {
        nome: 'tempo e E/S avançada',
        specs: setupLoop(
            [{ t: 'ard_pinmode', f: { PIN: 'LED', MODO: 'OUTPUT' } }],
            [
                { t: 'ard_tone', f: { PIN: 'LED' }, v: { FREQ: N(440) } },
                { t: 'ard_tone_dur', f: { PIN: 'LED' }, v: { FREQ: N(880), DUR: N(100) } },
                { t: 'ard_notone', f: { PIN: 'LED' } },
                { t: 'ard_delaymicroseconds', v: { US: N(50) } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_micros' } } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: 'LED', NIVEL: 'HIGH' } } } },
                { t: 'ard_shiftout', f: { DATA: 'LED', CLOCK: 'LED', ORDEM: 'MSBFIRST' }, v: { VALOR: N(170) } }
            ]
        ),
        pino: 'LED'
    },

    {
        nome: 'PWM',
        specs: setupLoop([], [
            { t: 'ard_analogwrite', f: { PIN: 'PWM' }, v: { VALOR: N(128) } }
        ]),
        pinoPwm: 'PWM'
    },

    {
        nome: 'servo',
        specs: setupLoop(
            [{ t: 'ard_servo_attach', f: { OBJ: 'meuServo', PIN: 'PWM' } }],
            [
                { t: 'ard_servo_write', f: { OBJ: 'meuServo' }, v: { ANGULO: N(90) } },
                { t: 'ard_servo_writemicroseconds', f: { OBJ: 'meuServo' }, v: { US: N(1500) } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_servo_read', f: { OBJ: 'meuServo' } } } },
                { t: 'ard_servo_detach', f: { OBJ: 'meuServo' } }
            ]
        ),
        pinoPwm: 'PWM',
        placas: ['uno', 'nano', 'nano_old', 'mega', 'leonardo', 'esp8266']
    },

    {
        nome: 'I2C, LCD e EEPROM',
        specs: setupLoop(
            [
                { t: 'ard_wire_begin' },
                { t: 'ard_lcd_init', f: { OBJ: 'lcd', ENDERECO: '0x27', COLS: '16', ROWS: '2' } },
                { t: 'ard_lcd_backlight', f: { OBJ: 'lcd' } }
            ],
            [
                { t: 'ard_lcd_clear', f: { OBJ: 'lcd' } },
                { t: 'ard_lcd_setcursor', f: { OBJ: 'lcd' }, v: { COL: N(0), LIN: N(0) } },
                { t: 'ard_lcd_print', f: { OBJ: 'lcd' }, v: { VALOR: T('ola') } },
                { t: 'ard_wire_begintransmission', v: { ENDERECO: N(39) } },
                { t: 'ard_wire_write', v: { VALOR: N(1) } },
                { t: 'ard_wire_endtransmission' },
                { t: 'ard_eeprom_write', f: { FUNC: 'write' }, v: { ENDERECO: N(0), VALOR: N(42) } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_eeprom_read', v: { ENDERECO: N(0) } } } }
            ]
        ),
        lib: 'LiquidCrystal_I2C'
    },

    {
        nome: 'DHT',
        specs: setupLoop(
            [{ t: 'ard_dht_begin', f: { OBJ: 'dht', PIN: 'LED', TIPO: 'DHT11' } }],
            [
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_dht_read', f: { OBJ: 'dht', FUNC: 'readTemperature' } } } },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_dht_read', f: { OBJ: 'dht', FUNC: 'readHumidity' } } } }
            ]
        ),
        pino: 'LED',
        lib: 'DHT'
    },

    {
        nome: 'código livre',
        specs: setupLoop([], [
            { t: 'ard_raw_stmt', f: { CODE: 'static unsigned long ultimo = 0;\\nif (millis() - ultimo > 1000) { ultimo = millis(); }' } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_raw_expr', f: { CODE: '(int)(millis() / 1000)' } } } }
        ])
    },

    {
        nome: 'WiFi (só ESP)',
        placas: ['esp32', 'esp8266'],
        specs: setupLoop(
            [{ t: 'ard_wifi_begin', f: { SSID: 'rede', SENHA: 'senha' } }],
            [
                {
                    t: 'controls_if',
                    v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'ard_wifi_status' }, B: K('WL_CONNECTED') } } },
                    s: {
                        DO0: [
                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_wifi_localip' } } },
                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_wifi_rssi' } } }
                        ]
                    }
                },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_esp_freeheap' } } }
            ]
        )
    },

    {
        nome: 'LEDC (só ESP32)',
        placas: ['esp32'],
        specs: setupLoop(
            [{ t: 'ard_ledc_attach', f: { PIN: 'PWM' }, v: { FREQ: N(5000), RES: N(8) } }],
            [
                { t: 'ard_ledc_write', f: { PIN: 'PWM' }, v: { DUTY: N(200) } },
                { t: 'ard_analogreadresolution', v: { BITS: N(12) } },
                { t: 'ard_ledc_detach', f: { PIN: 'PWM' } }
            ]
        ),
        pinoPwm: 'PWM'
    },

    {
        nome: 'SoftwareSerial (só AVR)',
        placas: ['uno', 'nano', 'mega', 'leonardo'],
        specs: setupLoop(
            [{ t: 'ard_softserial_begin', f: { OBJ: 'gps', RX: '10', TX: '11', BAUD: '9600' } }],
            [
                {
                    t: 'controls_if',
                    v: { IF0: { t: 'logic_compare', f: { OP: 'GT' }, v: { A: { t: 'ard_softserial_available', f: { OBJ: 'gps' } }, B: N(0) } } },
                    s: { DO0: [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_softserial_read', f: { OBJ: 'gps' } } } }] }
                }
            ]
        )
    },

    {
        nome: 'EEPROM.update (só AVR)',
        placas: ['uno', 'nano', 'nano_old', 'mega', 'leonardo'],
        specs: setupLoop([], [
            { t: 'ard_eeprom_write', f: { FUNC: 'update' }, v: { ENDERECO: N(0), VALOR: N(42) } }
        ])
    },

    {
        nome: 'EEPROM emulada (só ESP)',
        placas: ['esp32', 'esp8266'],
        specs: setupLoop(
            [{ t: 'ard_eeprom_begin', v: { TAMANHO: N(512) } }],
            [
                { t: 'ard_eeprom_write', f: { FUNC: 'write' }, v: { ENDERECO: N(0), VALOR: N(42) } },
                { t: 'ard_eeprom_commit' },
                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_eeprom_read', v: { ENDERECO: N(0) } } } }
            ]
        )
    },

    {
        nome: 'analogReference (só AVR)',
        placas: ['uno', 'nano', 'mega', 'leonardo'],
        specs: setupLoop([{ t: 'ard_analogreference', f: { TIPO: 'DEFAULT' } }], [])
    },

    // Puxa o runtime inteiro da LPA2v de uma vez: as sete grandezas, os dois
    // analisadores, o NAP, os conectivos e o ParaExtrctr. É aqui que se
    // descobre se o C++ gerado sobrevive ao compilador do AVR.
    {
        nome: 'lógica paraconsistente (LPA2v)',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'evidResultante' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'intervalo' }, v: { VALOR: N(0) } },
            { t: 'ard_array_declare', f: { TIPO: 'float', VAR: 'graus', TAM: '4', VALORES: '0.8, 0.65, 0.4, 0.9' } },
            ...setupLoop(
                [{ t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } }],
                [
                    // as sete grandezas do formulário
                    ...['GC', 'GCT', 'PHI', 'MUCTR', 'D', 'GCR', 'MUER'].map(g => ({
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: {
                            VALOR: {
                                t: 'lp_grau', f: { GRAU: g },
                                v: {
                                    MU: { t: 'lp_evidencia', f: { FUNC: 'S' }, v: { X: { t: 'ard_analogread', f: { PIN: 'ADC' } }, A1: N(0), A2: N(1023) } },
                                    LAMBDA: { t: 'lp_complemento', v: { MU: N(0.42) } }
                                }
                            }
                        }
                    })),
                    // estado, nome do estado e indefinição
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_estado_nome', v: { ESTADO: { t: 'lp_estado', f: { RES: '12' }, v: { MU: N(0.9), LAMBDA: N(0.2) } } } } }
                    },
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_estado', f: { RES: '4' }, v: { MU: N(0.9), LAMBDA: N(0.9) } } }
                    },
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_indefinicao', v: { MU: N(0.525), LAMBDA: N(0.525) } } }
                    },
                    // conectivos e ParaExtrctr
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_conectivo', f: { OP: 'MAX' }, v: { A: N(0.7), B: N(0.4) } } }
                    },
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_conectivo', f: { OP: 'MIN' }, v: { A: N(0.7), B: N(0.4) } } }
                    },
                    {
                        t: 'ard_serial_println', f: { PORTA: 'Serial' },
                        v: { VALOR: { t: 'lp_extractor', f: { VAR: 'graus' }, v: { N: N(4) } } }
                    },
                    // NAP com saída em duas variáveis
                    { t: 'lp_nap', f: { VAR_MUER: 'evidResultante', VAR_PHIE: 'intervalo' }, v: { MU: N(0.86), LAMBDA: N(0.28) } },
                    // Para-Analisador nas duas formas
                    {
                        t: 'lp_para_analisador',
                        f: { MODO: 'COMPL', RES: '12', C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5' },
                        v: { MU: N(0.9), LAMBDA: N(0.8) },
                        s: {
                            CASOS: [
                                { t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: 'LED' }, v: { VALOR: K('HIGH') } }] } },
                                { t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: { BODY: [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('quase') } }] } },
                                { t: 'lp_senao', s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: 'LED' }, v: { VALOR: K('LOW') } }] } }
                            ]
                        }
                    },
                    {
                        t: 'lp_para_analisador_simples',
                        f: { RES: '4' },
                        v: {
                            S1: { t: 'ard_analogread', f: { PIN: 'ADC' } },
                            S2: { t: 'ard_analogread', f: { PIN: 'ADC' } },
                            A1: N(0), A2: N(1023)
                        },
                        s: {
                            CASOS: [
                                { t: 'lp_caso', f: { ESTADO: 'LPA_T' }, s: { BODY: [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('contradicao') } }] } },
                                { t: 'lp_senao', s: { BODY: [] } }
                            ]
                        }
                    }
                ]
            )
        ],
        pino: 'LED',
        pinoAnalog: 'ADC'
    },

    // Modo Abstrato: um bloco pode valer mais de um comando, e o pinMode vem
    // do gerador em vez do aluno. Se a injeção em setup sair errada, é aqui que
    // o compilador reclama.
    {
        nome: 'modo abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        { t: 'abs_mostrar', f: { ROTULO: 'pronto' }, v: { VALOR: N(1) } },
                        { t: 'abs_criar', f: { VAR: 'passos' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_escrita_digital', f: { PIN: 'LED', VALOR: 'HIGH' } },
                        { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(200) } },
                        { t: 'abs_escrita_digital', f: { PIN: 'LED', VALOR: 'LOW' } },
                        { t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(1) } },
                        { t: 'abs_definir', f: { VAR: 'passos' }, v: { VALOR: { t: 'abs_ler', f: { VAR: 'passos' } } } },
                        {
                            t: 'abs_mostrar_grafico', f: { ROTULO: 'luz' },
                            v: { VALOR: { t: 'abs_leitura_analogica', f: { PIN: 'ADC' } } }
                        },
                        {
                            t: 'abs_mostrar_reticulado',
                            v: {
                                MU: { t: 'abs_evidencia', v: { X: N(13), A1: N(25), A2: N(12) } },
                                LAMBDA: N(0.2)
                            }
                        },
                        {
                            t: 'abs_se_senao',
                            v: { COND: { t: 'abs_contradicao', v: { MU1: N(0.9), MU2: N(0.1) } } },
                            s: {
                                ENTAO: [{ t: 'abs_mostrar', f: { ROTULO: 'alarme' }, v: { VALOR: N(1) } }],
                                SENAO: [{ t: 'abs_mostrar', f: { ROTULO: 'ok' }, v: { VALOR: N(1) } }]
                            }
                        },
                        {
                            t: 'abs_repetir', v: { VEZES: N(3) },
                            s: { BODY: [{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(10) } }] }
                        },
                        {
                            t: 'abs_quando_estado', v: { MU1: N(0.9), MU2: N(0.8) },
                            s: {
                                CASOS: [
                                    { t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: { BODY: [{ t: 'abs_escrita_digital', f: { PIN: 'LED', VALOR: 'HIGH' } }] } },
                                    { t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: { BODY: [] } }
                                ]
                            }
                        },
                        {
                            t: 'abs_mostrar', f: { ROTULO: 'dist' },
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: 'LED', ECHO: 'LED' } } }
                        }
                    ]
                }
            }
        ],
        pino: 'LED',
        pinoAnalog: 'ADC'
    },

    // Modo Abstrato com página web: o servidor, o HTML e o JavaScript do
    // reticulado saem inteiros do gerador, e são a maior porção de C++ que um
    // bloco só produz no projeto. Rádio e String de sobra: só nas placas com
    // WiFi.
    {
        nome: 'abstrato com página web',
        placas: ['esp32', 'esp32s3cam', 'esp8266'],
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        { t: 'abs_motores_pinos', f: { E1: 'PWM', E2: 'PWM', D1: 'PWM', D2: 'PWM' } },
                        { t: 'abs_criar', f: { VAR: 'velocidade' }, v: { VALOR: N(29) } },
                        { t: 'abs_wifi_rede_aberta', f: { NOME: 'emmy2' } },
                        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_web_atender' },
                        {
                            t: 'abs_web_mostrar', f: { ROTULO: 'esq' },
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: 'LED', ECHO: 'LED' } } }
                        },
                        {
                            t: 'abs_web_reticulado',
                            v: {
                                MU: { t: 'abs_evidencia', v: { X: N(13), A1: N(25), A2: N(12) } },
                                LAMBDA: N(0.2)
                            }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'frente' } } },
                            s: {
                                ENTAO: [{
                                    t: 'abs_motores', f: { MANOBRA: 'FRENTE' },
                                    v: { VEL: { t: 'abs_ler', f: { VAR: 'velocidade' } } }
                                }]
                            }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'tras' } } },
                            s: { ENTAO: [{ t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: N(35) } }] }
                        },
                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } },
                        { t: 'abs_web_esperar', v: { MS: N(100) } }
                    ]
                }
            }
        ],
        pino: 'LED',
        pinoPwm: 'PWM'
    },

    // O outro jeito de entrar na rede: em vez de criar a própria, entrar numa
    // que já existe. Muda o setup inteiro, então compila à parte.
    // Câmera na ESP32-S3 CAM: o servidor do vídeo (esp_http_server, porta
    // 81) e a câmera no canal 7 do LEDC, ao lado dos motores no analogWrite.
    // A página tem JavaScript dentro de string crua do C++, que o ctags do
    // Arduino lê mal: esta fixture é a que pega um protótipo inventado.
    {
        nome: 'abstrato com câmera',
        placas: ['esp32s3cam'],
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        { t: 'abs_motores_pinos', f: { E1: '1', E2: '2', D1: '42', D2: '41' } },
                        { t: 'abs_wifi_rede_aberta', f: { NOME: 'carro4x4' } },
                        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } },
                        { t: 'abs_camera_ligar', f: { TAMANHO: 'FRAMESIZE_QVGA', GIRAR: '1' } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_web_atender' },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'ver' } } },
                            s: { ENTAO: [{ t: 'abs_web_camera_mostrar', f: { AVISO: 'olhando' } }] }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'fechar' } } },
                            s: { ENTAO: [{ t: 'abs_web_camera_esconder' }] }
                        },
                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } },
                        { t: 'abs_web_esperar', v: { MS: N(100) } }
                    ]
                }
            }
        ]
    },

    {
        nome: 'abstrato entrando numa rede',
        placas: ['esp32', 'esp32s3cam', 'esp8266'],
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_wifi_ip_fixo',
                            f: { IP: '10.140.109.222', GATEWAY: '10.140.109.95', MASCARA: '255.255.255.0' }
                        },
                        { t: 'abs_wifi_entrar', f: { SSID: 'minha-rede', SENHA: 'senha123' } },
                        { t: 'abs_web_servidor', f: { PORTA_REDE: 8080 } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_web_atender' },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'ciclo' }, v: { VALOR: N(1) } }
                    ]
                }
            }
        ],
        pino: 'LED'
    }
];

/* ------------------------------------------------------------------ */
/* Substituição de pinos simbólicos pelos reais da placa               */
/* ------------------------------------------------------------------ */

function pinoReal(placaId, papel) {
    const b = Boards.get(placaId);
    const primeiro = lista => (lista && lista.length ? lista[lista.length > 3 ? 3 : 0][1] : '0');
    if (papel === 'pinoAnalog') return primeiro(b.analog);
    if (papel === 'pinoPwm') return primeiro(b.pwm);
    if (papel === 'pinoIrq') return primeiro(b.interrupt);
    return primeiro(b.digital);
}

function trocarPinos(specs, mapa) {
    const json = JSON.stringify(specs);
    let saida = json;
    Object.keys(mapa).forEach(simbolo => {
        saida = saida.split('"' + simbolo + '"').join('"' + mapa[simbolo] + '"');
    });
    return JSON.parse(saida);
}

/* ------------------------------------------------------------------ */
/* Compilação                                                          */
/* ------------------------------------------------------------------ */

const toolchain = path.join(RAIZ, 'resources', 'toolchain', soAtual);
const bin = path.join(toolchain, soAtual === 'win' ? 'arduino-cli.exe' : 'arduino-cli');
const cfg = path.join(toolchain, 'arduino-cli.build.yaml');

if (!fs.existsSync(bin)) {
    console.error('\n✗ arduino-cli embutido não encontrado em ' + bin);
    console.error('  rode primeiro:  node tools/fetch_toolchain.mjs\n');
    process.exit(2);
}
if (!fs.existsSync(cfg)) {
    console.error('\n✗ configuração de build não encontrada: ' + cfg + '\n');
    process.exit(2);
}

/**
 * O fetch_toolchain grava caminhos absolutos no arquivo de configuração. Se a
 * pasta do projeto for movida depois, o arduino-cli passa a procurar os cores
 * onde eles não estão mais, não acha nenhum, e a suíte pula tudo em silêncio —
 * reportando sucesso sem ter compilado uma linha. Aqui os caminhos são
 * reescritos a partir de onde o arquivo realmente está.
 */
function corrigirCaminhos() {
    const original = fs.readFileSync(cfg, 'utf8');
    const corrigido = original
        .replace(/^(\s*data:\s*).*$/m, '$1' + path.join(toolchain, 'data'))
        .replace(/^(\s*downloads:\s*).*$/m, '$1' + path.join(toolchain, 'data', 'staging'))
        .replace(/^(\s*user:\s*).*$/m, '$1' + path.join(toolchain, 'user'));
    if (corrigido !== original) {
        fs.writeFileSync(cfg, corrigido, 'utf8');
        console.log('· caminhos do arduino-cli.build.yaml reapontados para ' + toolchain);
    }
}
corrigirCaminhos();

function coresInstalados() {
    const r = spawnSync(bin, ['--config-file', cfg, 'core', 'list', '--format', 'json'], { encoding: 'utf8' });
    try {
        const j = JSON.parse(r.stdout.slice(r.stdout.search(/[[{]/)));
        const lista = Array.isArray(j) ? j : (j.platforms || []);
        return lista.map(p => p.id).filter(Boolean);
    } catch (e) {
        return [];
    }
}

const tmpRaiz = fs.mkdtempSync(path.join(os.tmpdir(), 'nocodemcu-compile-'));
const buildRaiz = path.join(tmpRaiz, 'build');

function compilar(nomeSketch, codigo, fqbn) {
    const pasta = path.join(tmpRaiz, nomeSketch);
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, nomeSketch + '.ino'), codigo, 'utf8');

    // Sem vírgula: ver caminhoBuild() em src/main/cli.js.
    const build = path.join(buildRaiz, fqbn.replace(/[:=,]/g, '_'));
    fs.mkdirSync(build, { recursive: true });

    const r = spawnSync(bin, [
        '--config-file', cfg, 'compile', '--fqbn', fqbn, '--build-path', build, pasta
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

    return { ok: r.status === 0, saida: (r.stdout || '') + (r.stderr || '') };
}

/* ------------------------------------------------------------------ */

const instalados = coresInstalados();
console.log('\nNoCodeMCU — compilação real com arduino-cli');
console.log('cores instalados: ' + (instalados.join(', ') || 'nenhum'));

let passou = 0, falhou = 0, pulado = 0;
const falhas = [];

const placas = Boards.ORDEM.filter(id => !somentePlaca || id === somentePlaca);

for (const placaId of placas) {
    const placa = Boards.get(placaId);
    if (instalados.indexOf(placa.core) === -1) {
        console.log('\n— ' + placa.nome + ': core ' + placa.core + ' não instalado, pulando');
        pulado += FIXTURES.length;
        continue;
    }

    console.log('\n— ' + placa.nome + ' (' + placa.fqbn + ')');
    Boards.selecionar(placaId);

    for (const fx of FIXTURES) {
        if (fx.placas && fx.placas.indexOf(placaId) === -1) { pulado++; continue; }

        const mapa = {};
        if (fx.pino) mapa[fx.pino] = pinoReal(placaId, 'pino');
        if (fx.pinoAnalog) mapa[fx.pinoAnalog] = pinoReal(placaId, 'pinoAnalog');
        if (fx.pinoPwm) mapa[fx.pinoPwm] = pinoReal(placaId, 'pinoPwm');
        if (fx.pinoIrq) mapa[fx.pinoIrq] = pinoReal(placaId, 'pinoIrq');

        let specs = trocarPinos(fx.specs, mapa);
        let codigo;
        try {
            const ws = novoWorkspace(Bk, specs);
            codigo = Gen.workspaceToCode(ws);
        } catch (e) {
            falhou++;
            falhas.push(placaId + ' / ' + fx.nome + ': erro ao gerar — ' + e.message);
            console.log('   ✗ ' + fx.nome + ' (geração)');
            continue;
        }

        const nomeSketch = ('t_' + placaId + '_' + fx.nome).replace(/[^A-Za-z0-9_]/g, '_');
        const r = compilar(nomeSketch, codigo, placa.fqbn);

        if (r.ok) {
            passou++;
            console.log('   ✓ ' + fx.nome);
        } else {
            falhou++;
            const linhasErro = r.saida.split('\n').filter(l => /error|erro/i.test(l)).slice(0, 6);
            falhas.push(placaId + ' / ' + fx.nome + '\n' +
                linhasErro.map(l => '      ' + l.trim()).join('\n') + '\n' +
                '      --- código ---\n' +
                codigo.split('\n').map((l, i) => '      ' + String(i + 1).padStart(3) + ' | ' + l).join('\n'));
            console.log('   ✗ ' + fx.nome);
        }
    }
}

console.log('\n----------------------------------------');
console.log('compilou: ' + passou + '   falhou: ' + falhou + '   pulado: ' + pulado);
if (falhas.length) {
    console.log('\nFalhas:');
    falhas.forEach((f, i) => console.log('\n  ' + (i + 1) + '. ' + f));
}
console.log('----------------------------------------\n');

fs.rmSync(tmpRaiz, { recursive: true, force: true });
process.exit(falhou ? 1 : 0);
