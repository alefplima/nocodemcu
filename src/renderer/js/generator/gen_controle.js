'use strict';
/**
 * forBlock da categoria CONTROLE.
 * Inclui o controls_if nativo do Blockly, que já tem exatamente a forma
 * if / else if / else do C.
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    A.forBlock['controls_if'] = function (block, gen) {
        let n = 0;
        let codigo = '';
        do {
            const cond = gen.valueToCode(block, 'IF' + n, gen.ORDER_NONE) || 'false';
            const corpo = gen.statementToCode(block, 'DO' + n);
            codigo += (n === 0 ? 'if (' : 'else if (') + cond + ') {\n' + corpo + '}\n';
            n++;
        } while (block.getInput('IF' + n));

        if (block.getInput('ELSE')) {
            codigo += 'else {\n' + gen.statementToCode(block, 'ELSE') + '}\n';
        }
        return codigo;
    };

    A.forBlock['ard_for'] = function (block, gen) {
        const v = gen.identificador(block.getFieldValue('VAR'), 'i');
        const inicio = gen.valorOu(block, 'INICIO', gen.ORDER_ASSIGNMENT, '0');
        const limite = gen.valorOu(block, 'LIMITE', gen.ORDER_RELATIONAL, '10');
        const passo = gen.valorOu(block, 'PASSO', gen.ORDER_ASSIGNMENT, '1');
        const corpo = gen.statementToCode(block, 'BODY');
        return 'for (int ' + v + ' = ' + inicio + '; ' + v + ' ' + block.getFieldValue('CMP') + ' ' +
            limite + '; ' + v + ' ' + block.getFieldValue('OP') + ' ' + passo + ') {\n' + corpo + '}\n';
    };

    A.forBlock['ard_while'] = function (block, gen) {
        const cond = gen.valueToCode(block, 'COND', gen.ORDER_NONE) || 'false';
        return 'while (' + cond + ') {\n' + gen.statementToCode(block, 'BODY') + '}\n';
    };

    A.forBlock['ard_do_while'] = function (block, gen) {
        const cond = gen.valueToCode(block, 'COND', gen.ORDER_NONE) || 'false';
        return 'do {\n' + gen.statementToCode(block, 'BODY') + '} while (' + cond + ');\n';
    };

    A.forBlock['ard_switch'] = function (block, gen) {
        const expr = gen.valorOu(block, 'EXPR', gen.ORDER_NONE, '0');
        const casos = gen.statementToCode(block, 'CASOS');
        return 'switch (' + expr + ') {\n' + casos + '}\n';
    };

    A.forBlock['ard_case'] = function (block, gen) {
        const valor = String(block.getFieldValue('VALOR') || '0').trim();
        const corpo = gen.statementToCode(block, 'BODY');
        const brk = block.getFieldValue('BREAK') === 'TRUE';
        return 'case ' + valor + ':\n' + corpo + (brk ? gen.INDENT + 'break;\n' : '');
    };

    A.forBlock['ard_default'] = function (block, gen) {
        return 'default:\n' + gen.statementToCode(block, 'BODY');
    };

    A.forBlock['ard_break'] = function () {
        return 'break;\n';
    };

    A.forBlock['ard_continue'] = function () {
        return 'continue;\n';
    };

})(typeof window !== 'undefined' ? window : global);
