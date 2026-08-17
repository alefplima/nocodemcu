'use strict';
/**
 * Categoria CONTROLE — laços e desvios, na forma literal do C.
 *
 * O `if / else if / else` é o bloco nativo controls_if do Blockly (o mutator
 * dele já dá exatamente os ramos do C); o resto é definido aqui para sair
 * como `for(...;...;...)`, `while`, `do...while` e `switch/case` de verdade.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const COR = 210;

    Blockly.defineBlocksWithJsonArray([

        {
            type: 'ard_for',
            message0: 'for ( int %1 = %2 ; %3 %4 ; %5 %6 )',
            args0: [
                { type: 'field_input', name: 'VAR', text: 'i' },
                { type: 'input_value', name: 'INICIO' },
                { type: 'field_dropdown', name: 'CMP', options: [['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']] },
                { type: 'input_value', name: 'LIMITE' },
                { type: 'field_dropdown', name: 'OP', options: [['+=', '+='], ['-=', '-='], ['*=', '*='], ['/=', '/=']] },
                { type: 'input_value', name: 'PASSO' }
            ],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Laço for com variável de contagem declarada no próprio for.'
        },
        {
            type: 'ard_while',
            message0: 'while ( %1 )',
            args0: [{ type: 'input_value', name: 'COND' }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Repete enquanto a condição for verdadeira (testa antes).'
        },
        {
            type: 'ard_do_while',
            message0: 'do',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            message2: 'while ( %1 )',
            args2: [{ type: 'input_value', name: 'COND' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Executa o corpo e só então testa a condição.'
        },
        {
            type: 'ard_switch',
            message0: 'switch ( %1 )',
            args0: [{ type: 'input_value', name: 'EXPR' }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'CASOS', check: 'ard_case' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Desvia conforme o valor da expressão. Use blocos case e default dentro.'
        },
        {
            type: 'ard_case',
            message0: 'case %1 :',
            args0: [{ type: 'field_input', name: 'VALOR', text: '1' }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            message2: 'break; %1',
            args2: [{ type: 'field_checkbox', name: 'BREAK', checked: true }],
            previousStatement: 'ard_case', nextStatement: 'ard_case',
            colour: COR,
            tooltip: 'Um caso do switch. Desmarque o break para "cair" no caso seguinte.'
        },
        {
            type: 'ard_default',
            message0: 'default :',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: 'ard_case', nextStatement: 'ard_case',
            colour: COR,
            tooltip: 'Caso padrão do switch.'
        },
        {
            type: 'ard_break',
            message0: 'break ;',
            previousStatement: null,
            colour: COR,
            tooltip: 'Sai do laço ou do switch.'
        },
        {
            type: 'ard_continue',
            message0: 'continue ;',
            previousStatement: null,
            colour: COR,
            tooltip: 'Pula para a próxima repetição do laço.'
        }

    ]);
})();
