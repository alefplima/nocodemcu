'use strict';
/**
 * forBlock de OPERADORES, MATEMÁTICA e dos blocos nativos de lógica.
 * Os nativos (logic_compare, logic_operation, logic_negate, logic_boolean,
 * math_number, text) são 1:1 com o C, então ganham gerador aqui.
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    /* ---------- lógica nativa ---------- */

    A.forBlock['logic_compare'] = function (block, gen) {
        const OPS = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
        const op = OPS[block.getFieldValue('OP')] || '==';
        const ordem = (op === '==' || op === '!=') ? gen.ORDER_EQUALITY : gen.ORDER_RELATIONAL;
        const a = gen.valueToCode(block, 'A', ordem) || '0';
        const b = gen.valueToCode(block, 'B', ordem) || '0';
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['logic_operation'] = function (block, gen) {
        const e = block.getFieldValue('OP') === 'AND';
        const op = e ? '&&' : '||';
        const ordem = e ? gen.ORDER_LOGICAL_AND : gen.ORDER_LOGICAL_OR;
        const a = gen.valueToCode(block, 'A', ordem) || (e ? 'true' : 'false');
        const b = gen.valueToCode(block, 'B', ordem) || (e ? 'true' : 'false');
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['logic_negate'] = function (block, gen) {
        const a = gen.valueToCode(block, 'BOOL', gen.ORDER_UNARY_PREFIX) || 'true';
        return ['!' + a, gen.ORDER_UNARY_PREFIX];
    };

    A.forBlock['logic_boolean'] = function (block, gen) {
        return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', gen.ORDER_ATOMIC];
    };

    A.forBlock['math_number'] = function (block, gen) {
        const n = Number(block.getFieldValue('NUM'));
        return [String(n), n < 0 ? gen.ORDER_UNARY_PREFIX : gen.ORDER_ATOMIC];
    };

    A.forBlock['text'] = function (block, gen) {
        return ['"' + String(block.getFieldValue('TEXT')).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"',
            gen.ORDER_ATOMIC];
    };

    /* ---------- operadores ---------- */

    A.forBlock['ard_arith'] = function (block, gen) {
        const op = block.getFieldValue('OP');
        const ordem = (op === '+' || op === '-') ? gen.ORDER_ADDITIVE : gen.ORDER_MULTIPLICATIVE;
        const a = gen.valorOu(block, 'A', ordem, '0');
        const b = gen.valorOu(block, 'B', ordem, '0');
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['ard_compound_assign'] = function (block, gen) {
        const v = gen.nomeVar(block);
        gen.varsUsadas_.set(v, block.id);
        return v + ' ' + block.getFieldValue('OP') + ' ' +
            gen.valorOu(block, 'VALOR', gen.ORDER_ASSIGNMENT, '1') + ';\n';
    };

    A.forBlock['ard_incdec'] = function (block, gen) {
        const v = gen.nomeVar(block);
        gen.varsUsadas_.set(v, block.id);
        return v + block.getFieldValue('OP') + ';\n';
    };

    A.forBlock['ard_bitwise'] = function (block, gen) {
        const op = block.getFieldValue('OP');
        const ORDENS = {
            '&': gen.ORDER_BITWISE_AND, '|': gen.ORDER_BITWISE_OR, '^': gen.ORDER_BITWISE_XOR,
            '<<': gen.ORDER_SHIFT, '>>': gen.ORDER_SHIFT
        };
        const ordem = ORDENS[op];
        const a = gen.valorOu(block, 'A', ordem, '0');
        const b = gen.valorOu(block, 'B', ordem, '0');
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['ard_bitnot'] = function (block, gen) {
        return ['~' + gen.valorOu(block, 'A', gen.ORDER_UNARY_PREFIX, '0'), gen.ORDER_UNARY_PREFIX];
    };

    A.forBlock['ard_bitread'] = function (block, gen) {
        return ['bitRead(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'BIT', gen.ORDER_COMMA, '0') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_bitwrite'] = function (block, gen) {
        const v = gen.nomeVar(block);
        gen.varsUsadas_.set(v, block.id);
        return 'bitWrite(' + v + ', ' + gen.valorOu(block, 'BIT', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'ESTADO', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_bitsetclear'] = function (block, gen) {
        const v = gen.nomeVar(block);
        gen.varsUsadas_.set(v, block.id);
        return block.getFieldValue('FUNC') + '(' + v + ', ' +
            gen.valorOu(block, 'BIT', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_bit'] = function (block, gen) {
        return ['bit(' + gen.valorOu(block, 'N', gen.ORDER_COMMA, '0') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- matemática ---------- */

    A.forBlock['ard_map'] = function (block, gen) {
        const p = ['VALOR', 'DE_MIN', 'DE_MAX', 'PARA_MIN', 'PARA_MAX']
            .map(n => gen.valorOu(block, n, gen.ORDER_COMMA, '0'));
        return ['map(' + p.join(', ') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_constrain'] = function (block, gen) {
        const p = ['VALOR', 'MIN', 'MAX'].map(n => gen.valorOu(block, n, gen.ORDER_COMMA, '0'));
        return ['constrain(' + p.join(', ') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_minmax'] = function (block, gen) {
        return [block.getFieldValue('FUNC') + '(' + gen.valorOu(block, 'A', gen.ORDER_COMMA, '0') +
            ', ' + gen.valorOu(block, 'B', gen.ORDER_COMMA, '0') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_math_single'] = function (block, gen) {
        return [block.getFieldValue('FUNC') + '(' + gen.valorOu(block, 'A', gen.ORDER_COMMA, '0') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_pow'] = function (block, gen) {
        return ['pow(' + gen.valorOu(block, 'BASE', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'EXPO', gen.ORDER_COMMA, '2') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_random'] = function (block, gen) {
        return ['random(' + gen.valorOu(block, 'MIN', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'MAX', gen.ORDER_COMMA, '100') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_random_max'] = function (block, gen) {
        return ['random(' + gen.valorOu(block, 'MAX', gen.ORDER_COMMA, '100') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_randomseed'] = function (block, gen) {
        return 'randomSeed(' + gen.valorOu(block, 'SEMENTE', gen.ORDER_COMMA, 'analogRead(A0)') + ');\n';
    };

})(typeof window !== 'undefined' ? window : global);
