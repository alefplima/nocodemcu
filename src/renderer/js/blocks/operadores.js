'use strict';
/**
 * Categorias OPERADORES e MATEMÁTICA.
 *
 * Comparação e lógica booleana usam os blocos nativos (logic_compare,
 * logic_operation, logic_negate) — eles já são 1:1 com ==, !=, <, &&, ||, !.
 * Aqui ficam os operadores que o Blockly não tem: compostos, incremento,
 * bitwise, e as funções matemáticas do Arduino.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const OP = 230;
    const MAT = 250;

    Blockly.defineBlocksWithJsonArray([

        /* ---------- operadores ---------- */
        {
            type: 'ard_arith',
            message0: '%1 %2 %3',
            args0: [
                { type: 'input_value', name: 'A' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['+', '+'], ['-', '-'], ['*', '*'], ['/', '/'], ['%', '%']
                    ]
                },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Operação aritmética. O % é o resto da divisão inteira.'
        },
        {
            type: 'ard_compound_assign',
            message0: '%1 %2 %3',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'contador' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['+=', '+='], ['-=', '-='], ['*=', '*='], ['/=', '/='], ['%=', '%=']
                    ]
                },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: OP,
            tooltip: 'Atribuição composta: x += 1 é o mesmo que x = x + 1.'
        },
        {
            type: 'ard_incdec',
            message0: '%1 %2',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'contador' },
                { type: 'field_dropdown', name: 'OP', options: [['++', '++'], ['--', '--']] }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: OP,
            tooltip: 'Incrementa ou decrementa a variável em 1.'
        },
        {
            type: 'ard_bitwise',
            message0: '%1 %2 %3',
            args0: [
                { type: 'input_value', name: 'A' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['&', '&'], ['|', '|'], ['^', '^'], ['<<', '<<'], ['>>', '>>']
                    ]
                },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Operação bit a bit.'
        },
        {
            type: 'ard_bitnot',
            message0: '~ %1',
            args0: [{ type: 'input_value', name: 'A' }],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Inverte todos os bits.'
        },
        {
            type: 'ard_bitread',
            message0: 'bitRead ( %1 , %2 )',
            args0: [
                { type: 'input_value', name: 'VALOR' },
                { type: 'input_value', name: 'BIT' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Lê um bit de um número.'
        },
        {
            type: 'ard_bitwrite',
            message0: 'bitWrite ( %1 , %2 , %3 )',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'valor' },
                { type: 'input_value', name: 'BIT' },
                { type: 'input_value', name: 'ESTADO' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: OP,
            tooltip: 'Escreve um bit numa variável.'
        },
        {
            type: 'ard_bitsetclear',
            message0: '%1 ( %2 , %3 )',
            args0: [
                { type: 'field_dropdown', name: 'FUNC', options: [['bitSet', 'bitSet'], ['bitClear', 'bitClear']] },
                { type: 'field_variable', name: 'VAR', variable: 'valor' },
                { type: 'input_value', name: 'BIT' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: OP,
            tooltip: 'Liga (bitSet) ou desliga (bitClear) um bit da variável.'
        },
        {
            type: 'ard_bit',
            message0: 'bit ( %1 )',
            args0: [{ type: 'input_value', name: 'N' }],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Valor do bit N: bit(3) é 8.'
        },

        /* ---------- matemática ---------- */
        {
            type: 'ard_map',
            message0: 'map ( %1 , %2 , %3 , %4 , %5 )',
            args0: [
                { type: 'input_value', name: 'VALOR' },
                { type: 'input_value', name: 'DE_MIN' },
                { type: 'input_value', name: 'DE_MAX' },
                { type: 'input_value', name: 'PARA_MIN' },
                { type: 'input_value', name: 'PARA_MAX' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Converte um número de uma faixa para outra.'
        },
        {
            type: 'ard_constrain',
            message0: 'constrain ( %1 , %2 , %3 )',
            args0: [
                { type: 'input_value', name: 'VALOR' },
                { type: 'input_value', name: 'MIN' },
                { type: 'input_value', name: 'MAX' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Limita o número entre um mínimo e um máximo.'
        },
        {
            type: 'ard_minmax',
            message0: '%1 ( %2 , %3 )',
            args0: [
                { type: 'field_dropdown', name: 'FUNC', options: [['min', 'min'], ['max', 'max']] },
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Menor ou maior entre dois valores.'
        },
        {
            type: 'ard_math_single',
            message0: '%1 ( %2 )',
            args0: [
                {
                    type: 'field_dropdown', name: 'FUNC', options: [
                        ['abs', 'abs'], ['sqrt', 'sqrt'], ['sq', 'sq'],
                        ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'],
                        ['log', 'log'], ['exp', 'exp']
                    ]
                },
                { type: 'input_value', name: 'A' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Funções matemáticas de um argumento.'
        },
        {
            type: 'ard_pow',
            message0: 'pow ( %1 , %2 )',
            args0: [
                { type: 'input_value', name: 'BASE' },
                { type: 'input_value', name: 'EXPO' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Potência: base elevada ao expoente.'
        },
        {
            type: 'ard_random',
            message0: 'random ( %1 , %2 )',
            args0: [
                { type: 'input_value', name: 'MIN' },
                { type: 'input_value', name: 'MAX' }
            ],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Número aleatório de mín (inclusive) até máx (exclusive).'
        },
        {
            type: 'ard_random_max',
            message0: 'random ( %1 )',
            args0: [{ type: 'input_value', name: 'MAX' }],
            output: 'Number', inputsInline: true,
            colour: MAT,
            tooltip: 'Número aleatório de 0 até máx (exclusive).'
        },
        {
            type: 'ard_randomseed',
            message0: 'randomSeed ( %1 )',
            args0: [{ type: 'input_value', name: 'SEMENTE' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: MAT,
            tooltip: 'Inicializa o gerador de números aleatórios.'
        }

    ]);
})();
