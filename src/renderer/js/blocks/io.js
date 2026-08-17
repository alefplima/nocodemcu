'use strict';
/**
 * Categorias de ENTRADA/SAÍDA — digital, analógica, avançada e tempo.
 * Todo pino é campo do bloco: não existe pino implícito em lugar nenhum.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    Blockly.defineBlocksWithJsonArray([

        /* ---------- E/S digital ---------- */
        {
            type: 'ard_pinmode',
            message0: 'pinMode ( %1 , %2 )',
            args0: [
                { type: 'field_pin_digital_in', name: 'PIN' },
                {
                    type: 'field_dropdown', name: 'MODO', options: [
                        ['OUTPUT', 'OUTPUT'], ['INPUT', 'INPUT'], ['INPUT_PULLUP', 'INPUT_PULLUP']
                    ]
                }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 20,
            tooltip: 'Configura o pino como entrada ou saída.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/digital-io/pinmode/'
        },
        {
            type: 'ard_digitalwrite',
            message0: 'digitalWrite ( %1 , %2 )',
            args0: [
                { type: 'field_pin_digital', name: 'PIN' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 20,
            tooltip: 'Escreve HIGH ou LOW num pino digital.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/digital-io/digitalwrite/'
        },
        {
            type: 'ard_digitalread',
            message0: 'digitalRead ( %1 )',
            args0: [{ type: 'field_pin_digital_in', name: 'PIN' }],
            output: 'Number', inputsInline: true,
            colour: 20,
            tooltip: 'Lê o estado de um pino digital: HIGH ou LOW.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/digital-io/digitalread/'
        },

        /* ---------- E/S analógica ---------- */
        {
            type: 'ard_analogread',
            message0: 'analogRead ( %1 )',
            args0: [{ type: 'field_pin_analog', name: 'PIN' }],
            output: 'Number', inputsInline: true,
            colour: 45,
            tooltip: 'Lê a tensão de um pino analógico.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/analog-io/analogread/'
        },
        {
            type: 'ard_analogwrite',
            message0: 'analogWrite ( %1 , %2 )',
            args0: [
                { type: 'field_pin_pwm', name: 'PIN' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 45,
            tooltip: 'Gera PWM num pino que suporte PWM.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/analog-io/analogwrite/'
        },
        {
            type: 'ard_analogreference',
            message0: 'analogReference ( %1 )',
            args0: [{
                type: 'field_dropdown', name: 'TIPO', options: [
                    ['DEFAULT', 'DEFAULT'], ['INTERNAL', 'INTERNAL'], ['EXTERNAL', 'EXTERNAL']
                ]
            }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 45,
            tooltip: 'Define a referência de tensão do conversor A/D.'
        },
        {
            type: 'ard_analogreadresolution',
            message0: 'analogReadResolution ( %1 )',
            args0: [{ type: 'input_value', name: 'BITS' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 45,
            tooltip: 'Muda a resolução do analogRead (ESP32).'
        },

        /* ---------- E/S avançada ---------- */
        {
            type: 'ard_tone',
            message0: 'tone ( %1 , %2 )',
            args0: [
                { type: 'field_pin_digital', name: 'PIN' },
                { type: 'input_value', name: 'FREQ' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 75,
            tooltip: 'Gera uma onda quadrada na frequência indicada, até chamar noTone().'
        },
        {
            type: 'ard_tone_dur',
            message0: 'tone ( %1 , %2 , %3 )',
            args0: [
                { type: 'field_pin_digital', name: 'PIN' },
                { type: 'input_value', name: 'FREQ' },
                { type: 'input_value', name: 'DUR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 75,
            tooltip: 'Gera uma onda quadrada por uma duração em milissegundos.'
        },
        {
            type: 'ard_notone',
            message0: 'noTone ( %1 )',
            args0: [{ type: 'field_pin_digital', name: 'PIN' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 75,
            tooltip: 'Interrompe o tone() do pino.'
        },
        {
            type: 'ard_pulsein',
            message0: 'pulseIn ( %1 , %2 )',
            args0: [
                { type: 'field_pin_digital_in', name: 'PIN' },
                { type: 'field_dropdown', name: 'NIVEL', options: [['HIGH', 'HIGH'], ['LOW', 'LOW']] }
            ],
            output: 'Number', inputsInline: true,
            colour: 75,
            tooltip: 'Mede a duração de um pulso, em microssegundos.'
        },
        {
            type: 'ard_pulsein_timeout',
            message0: 'pulseIn ( %1 , %2 , %3 )',
            args0: [
                { type: 'field_pin_digital_in', name: 'PIN' },
                { type: 'field_dropdown', name: 'NIVEL', options: [['HIGH', 'HIGH'], ['LOW', 'LOW']] },
                { type: 'input_value', name: 'TIMEOUT' }
            ],
            output: 'Number', inputsInline: true,
            colour: 75,
            tooltip: 'pulseIn com tempo limite em microssegundos.'
        },
        {
            type: 'ard_shiftout',
            message0: 'shiftOut ( dados %1 clock %2 %3 , %4 )',
            args0: [
                { type: 'field_pin_digital', name: 'DATA' },
                { type: 'field_pin_digital', name: 'CLOCK' },
                { type: 'field_dropdown', name: 'ORDEM', options: [['MSBFIRST', 'MSBFIRST'], ['LSBFIRST', 'LSBFIRST']] },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 75,
            tooltip: 'Envia um byte bit a bit.'
        },
        {
            type: 'ard_shiftin',
            message0: 'shiftIn ( dados %1 clock %2 %3 )',
            args0: [
                { type: 'field_pin_digital_in', name: 'DATA' },
                { type: 'field_pin_digital', name: 'CLOCK' },
                { type: 'field_dropdown', name: 'ORDEM', options: [['MSBFIRST', 'MSBFIRST'], ['LSBFIRST', 'LSBFIRST']] }
            ],
            output: 'Number', inputsInline: true,
            colour: 75,
            tooltip: 'Lê um byte bit a bit.'
        },

        /* ---------- Tempo ---------- */
        {
            type: 'ard_delay',
            message0: 'delay ( %1 )',
            args0: [{ type: 'input_value', name: 'MS' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 120,
            tooltip: 'Pausa o programa por N milissegundos.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/time/delay/'
        },
        {
            type: 'ard_delaymicroseconds',
            message0: 'delayMicroseconds ( %1 )',
            args0: [{ type: 'input_value', name: 'US' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: 120,
            tooltip: 'Pausa o programa por N microssegundos.'
        },
        {
            type: 'ard_millis',
            message0: 'millis ( )',
            output: 'Number',
            colour: 120,
            tooltip: 'Milissegundos desde que a placa ligou.'
        },
        {
            type: 'ard_micros',
            message0: 'micros ( )',
            output: 'Number',
            colour: 120,
            tooltip: 'Microssegundos desde que a placa ligou.'
        }

    ]);
})();
