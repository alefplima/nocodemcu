'use strict';
/**
 * Categoria ESTRUTURA — o esqueleto do sketch e a definição de funções.
 * Um bloco = um elemento da linguagem. Nada é injetado por conta própria.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    Blockly.defineBlocksWithJsonArray([

        {
            type: 'ard_setup',
            message0: 'void setup()',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            colour: 260,
            tooltip: 'Executa uma única vez, ao ligar ou resetar a placa.',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/structure/sketch/setup/'
        },

        {
            type: 'ard_loop',
            message0: 'void loop()',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            colour: 260,
            tooltip: 'Executa repetidamente, para sempre, depois do setup().',
            helpUrl: 'https://www.arduino.cc/reference/pt/language/structure/sketch/loop/'
        },

        {
            type: 'ard_include',
            message0: '#include <%1>',
            args0: [{ type: 'field_input', name: 'LIB', text: 'Wire.h' }],
            previousStatement: null,
            nextStatement: null,
            colour: 260,
            tooltip: 'Inclui uma biblioteca. Vai para o topo do arquivo, esteja o bloco onde estiver.'
        },

        {
            type: 'ard_define',
            message0: '#define %1 %2',
            args0: [
                { type: 'field_input', name: 'NOME', text: 'LED_PIN' },
                { type: 'field_input', name: 'VALOR', text: '13' }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 260,
            tooltip: 'Cria uma constante de pré-processador. Vai para o topo do arquivo.'
        },

        {
            type: 'ard_comment',
            message0: '// %1',
            args0: [{ type: 'field_input', name: 'TEXTO', text: 'comentário' }],
            previousStatement: null,
            nextStatement: null,
            colour: 260,
            tooltip: 'Comentário de uma linha.'
        },

        {
            type: 'ard_function_def',
            message0: '%1 %2 ( %3 )',
            args0: [
                {
                    type: 'field_dropdown', name: 'TIPO', options: [
                        ['void', 'void'], ['int', 'int'], ['long', 'long'], ['float', 'float'],
                        ['double', 'double'], ['char', 'char'], ['byte', 'byte'],
                        ['bool', 'bool'], ['String', 'String'], ['unsigned int', 'unsigned int'],
                        ['unsigned long', 'unsigned long']
                    ]
                },
                { type: 'field_input', name: 'NOME', text: 'minhaFuncao' },
                { type: 'field_input', name: 'PARAMS', text: '' }
            ],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            colour: 290,
            tooltip: 'Define uma função. Parâmetros com tipo, ex.: int a, int b'
        },

        {
            type: 'ard_return',
            message0: 'return %1',
            args0: [{ type: 'input_value', name: 'VALOR' }],
            previousStatement: null,
            colour: 290,
            inputsInline: true,
            tooltip: 'Retorna da função. Sem valor conectado, gera return;'
        },

        {
            type: 'ard_call',
            message0: 'chamar %1 ( %2 %3 %4 )',
            args0: [
                { type: 'field_input', name: 'NOME', text: 'minhaFuncao' },
                { type: 'input_value', name: 'ARG0' },
                { type: 'input_value', name: 'ARG1' },
                { type: 'input_value', name: 'ARG2' }
            ],
            previousStatement: null,
            nextStatement: null,
            inputsInline: true,
            colour: 290,
            tooltip: 'Chama uma função sem usar o retorno. Argumentos vazios são ignorados.'
        },

        {
            type: 'ard_call_value',
            message0: '%1 ( %2 %3 %4 )',
            args0: [
                { type: 'field_input', name: 'NOME', text: 'minhaFuncao' },
                { type: 'input_value', name: 'ARG0' },
                { type: 'input_value', name: 'ARG1' },
                { type: 'input_value', name: 'ARG2' }
            ],
            output: null,
            inputsInline: true,
            colour: 290,
            tooltip: 'Chama uma função e usa o valor retornado.'
        }

    ]);
})();
