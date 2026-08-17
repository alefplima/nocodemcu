'use strict';
/**
 * Categoria SERIAL — cada método da classe Serial em seu próprio bloco.
 * A porta é campo do bloco (Serial, Serial1, ...), filtrada pela placa.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const COR = 195;

    Blockly.defineBlocksWithJsonArray([

        {
            type: 'ard_serial_begin',
            message0: '%1 .begin ( %2 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                {
                    // 9600 primeiro: é o padrão que o Blockly assume ao criar o bloco
                    type: 'field_dropdown', name: 'BAUD', options: [
                        ['9600', '9600'], ['115200', '115200'], ['300', '300'], ['1200', '1200'],
                        ['2400', '2400'], ['4800', '4800'], ['19200', '19200'], ['38400', '38400'],
                        ['57600', '57600'], ['74880', '74880'],
                        ['230400', '230400'], ['250000', '250000'], ['921600', '921600']
                    ]
                }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Abre a comunicação serial na velocidade indicada.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/functions/communication/serial/begin/'
        },
        {
            type: 'ard_serial_print',
            message0: '%1 .print ( %2 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Envia o valor pela serial, sem quebrar linha.'
        },
        {
            type: 'ard_serial_println',
            message0: '%1 .println ( %2 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Envia o valor pela serial e quebra a linha.'
        },
        {
            type: 'ard_serial_print_format',
            message0: '%1 .print ( %2 , %3 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                { type: 'input_value', name: 'VALOR' },
                {
                    type: 'field_dropdown', name: 'FORMATO', options: [
                        ['DEC', 'DEC'], ['HEX', 'HEX'], ['OCT', 'OCT'], ['BIN', 'BIN']
                    ]
                }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Envia o valor numa base numérica específica.'
        },
        {
            type: 'ard_serial_write',
            message0: '%1 .write ( %2 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Envia um byte cru pela serial.'
        },
        {
            type: 'ard_serial_available',
            message0: '%1 .available ( )',
            args0: [{ type: 'field_serial_port', name: 'PORTA' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Quantos bytes chegaram e estão esperando leitura.'
        },
        {
            type: 'ard_serial_read',
            message0: '%1 .read ( )',
            args0: [{ type: 'field_serial_port', name: 'PORTA' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Lê o próximo byte recebido (-1 se não houver nada).'
        },
        {
            type: 'ard_serial_readstringuntil',
            message0: '%1 .readStringUntil ( %2 )',
            args0: [
                { type: 'field_serial_port', name: 'PORTA' },
                {
                    type: 'field_dropdown', name: 'TERM', options: [
                        ["'\\n'", '\\n'], ["'\\r'", '\\r'], ["';'", ';'], ["','", ',']
                    ]
                }
            ],
            output: 'String', inputsInline: true,
            colour: COR,
            tooltip: 'Lê caracteres até encontrar o terminador.'
        },
        {
            type: 'ard_serial_parseint',
            message0: '%1 .parseInt ( )',
            args0: [{ type: 'field_serial_port', name: 'PORTA' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Lê o próximo número inteiro que chegar pela serial.'
        },
        {
            type: 'ard_serial_flush',
            message0: '%1 .flush ( )',
            args0: [{ type: 'field_serial_port', name: 'PORTA' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Espera terminar a transmissão dos dados pendentes.'
        },
        {
            type: 'ard_serial_end',
            message0: '%1 .end ( )',
            args0: [{ type: 'field_serial_port', name: 'PORTA' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Encerra a comunicação serial.'
        }

    ]);
})();
