'use strict';
/**
 * Categoria VARIÁVEIS E TIPOS.
 *
 * Em C toda variável tem tipo e precisa ser declarada — então a declaração é
 * um bloco explícito. A leitura e a atribuição usam os blocos nativos
 * variables_get / variables_set, que já carregam o nome da variável.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const COR = 330;
    const CONV = 340;

    const TIPOS = [
        ['int', 'int'], ['long', 'long'], ['float', 'float'], ['double', 'double'],
        ['char', 'char'], ['byte', 'byte'], ['bool', 'bool'], ['String', 'String'],
        ['unsigned int', 'unsigned int'], ['unsigned long', 'unsigned long'], ['word', 'word']
    ];

    Blockly.defineBlocksWithJsonArray([

        {
            type: 'ard_var_declare',
            message0: '%1 %2 %3 = %4',
            args0: [
                {
                    type: 'field_dropdown', name: 'QUAL', options: [
                        ['', ''], ['const', 'const'], ['static', 'static'], ['volatile', 'volatile']
                    ]
                },
                { type: 'field_dropdown', name: 'TIPO', options: TIPOS },
                { type: 'field_variable', name: 'VAR', variable: 'valor' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Declara uma variável no ponto em que o bloco está.'
        },
        {
            type: 'ard_var_global',
            message0: 'global %1 %2 %3 = %4',
            args0: [
                {
                    type: 'field_dropdown', name: 'QUAL', options: [
                        ['', ''], ['const', 'const'], ['volatile', 'volatile']
                    ]
                },
                { type: 'field_dropdown', name: 'TIPO', options: TIPOS },
                { type: 'field_variable', name: 'VAR', variable: 'valor' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Declara a variável fora do setup/loop, visível no sketch inteiro.'
        },
        {
            type: 'ard_array_declare',
            message0: 'global %1 %2 [ %3 ] = { %4 }',
            args0: [
                { type: 'field_dropdown', name: 'TIPO', options: TIPOS },
                { type: 'field_variable', name: 'VAR', variable: 'lista' },
                { type: 'field_input', name: 'TAM', text: '3' },
                { type: 'field_input', name: 'VALORES', text: '1, 2, 3' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Declara um vetor global.'
        },
        {
            type: 'ard_array_get',
            message0: '%1 [ %2 ]',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'lista' },
                { type: 'input_value', name: 'INDICE' }
            ],
            output: null, inputsInline: true,
            colour: COR,
            tooltip: 'Lê uma posição do vetor.'
        },
        {
            type: 'ard_array_set',
            message0: '%1 [ %2 ] = %3',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'lista' },
                { type: 'input_value', name: 'INDICE' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Escreve numa posição do vetor.'
        },
        {
            type: 'ard_cast',
            message0: '%1 ( %2 )',
            args0: [
                {
                    type: 'field_dropdown', name: 'TIPO', options: [
                        ['int', 'int'], ['long', 'long'], ['float', 'float'], ['double', 'double'],
                        ['char', 'char'], ['byte', 'byte'], ['word', 'word'], ['String', 'String']
                    ]
                },
                { type: 'input_value', name: 'VALOR' }
            ],
            output: null, inputsInline: true,
            colour: CONV,
            tooltip: 'Converte o valor para outro tipo.'
        },
        {
            type: 'ard_const',
            message0: '%1',
            args0: [{
                type: 'field_dropdown', name: 'CONST', options: [
                    ['HIGH', 'HIGH'], ['LOW', 'LOW'],
                    ['INPUT', 'INPUT'], ['OUTPUT', 'OUTPUT'], ['INPUT_PULLUP', 'INPUT_PULLUP'],
                    ['true', 'true'], ['false', 'false'],
                    ['LED_BUILTIN', 'LED_BUILTIN'],
                    ['MSBFIRST', 'MSBFIRST'], ['LSBFIRST', 'LSBFIRST'],
                    ['WL_CONNECTED', 'WL_CONNECTED']
                ]
            }],
            output: null,
            colour: CONV,
            tooltip: 'Constante da linguagem Arduino.'
        },
        {
            type: 'ard_number',
            message0: '%1',
            args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
            output: 'Number',
            colour: CONV,
            tooltip: 'Número literal.'
        },
        {
            type: 'ard_text',
            message0: '" %1 "',
            args0: [{ type: 'field_input', name: 'TEXTO', text: 'olá' }],
            output: 'String',
            colour: CONV,
            tooltip: 'Texto literal entre aspas.'
        },
        {
            type: 'ard_char',
            message0: "' %1 '",
            args0: [{ type: 'field_input', name: 'CHAR', text: 'A' }],
            output: 'Number',
            colour: CONV,
            tooltip: 'Caractere literal entre aspas simples.'
        }

    ]);
})();
