'use strict';
/**
 * forBlock de VARIÁVEIS, TIPOS e conversões.
 * Declarações registram o nome em varsDeclaradas_; leituras e escritas
 * registram em varsUsadas_ — a diferença entre os dois vira aviso no finish().
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    A.forBlock['ard_var_declare'] = function (block, gen) {
        const qual = block.getFieldValue('QUAL');
        const tipo = block.getFieldValue('TIPO');
        const nome = gen.nomeVar(block);
        const valor = gen.valueToCode(block, 'VALOR', gen.ORDER_ASSIGNMENT);
        gen.varsDeclaradas_.add(nome);
        return (qual ? qual + ' ' : '') + tipo + ' ' + nome +
            (valor ? ' = ' + valor : '') + ';\n';
    };

    A.forBlock['ard_var_global'] = function (block, gen) {
        const qual = block.getFieldValue('QUAL');
        const tipo = block.getFieldValue('TIPO');
        const nome = gen.nomeVar(block);
        const valor = gen.valueToCode(block, 'VALOR', gen.ORDER_ASSIGNMENT);
        gen.varsDeclaradas_.add(nome);
        gen.usarGlobal('var:' + nome,
            (qual ? qual + ' ' : '') + tipo + ' ' + nome + (valor ? ' = ' + valor : '') + ';');
        return '';
    };

    A.forBlock['ard_array_declare'] = function (block, gen) {
        const tipo = block.getFieldValue('TIPO');
        const nome = gen.nomeVar(block);
        const tam = String(block.getFieldValue('TAM') || '').trim();
        const valores = String(block.getFieldValue('VALORES') || '').trim();
        gen.varsDeclaradas_.add(nome);
        gen.usarGlobal('var:' + nome,
            tipo + ' ' + nome + '[' + tam + ']' + (valores ? ' = {' + valores + '}' : '') + ';');
        return '';
    };

    A.forBlock['ard_array_get'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return [nome + '[' + gen.valorOu(block, 'INDICE', gen.ORDER_NONE, '0') + ']',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_array_set'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return nome + '[' + gen.valorOu(block, 'INDICE', gen.ORDER_NONE, '0') + '] = ' +
            gen.valorOu(block, 'VALOR', gen.ORDER_ASSIGNMENT, '0') + ';\n';
    };

    A.forBlock['ard_cast'] = function (block, gen) {
        return [block.getFieldValue('TIPO') + '(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_const'] = function (block, gen) {
        return [block.getFieldValue('CONST'), gen.ORDER_ATOMIC];
    };

    A.forBlock['ard_number'] = function (block, gen) {
        const n = Number(block.getFieldValue('NUM'));
        return [String(n), n < 0 ? gen.ORDER_UNARY_PREFIX : gen.ORDER_ATOMIC];
    };

    A.forBlock['ard_text'] = function (block, gen) {
        const t = String(block.getFieldValue('TEXTO'))
            .replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return ['"' + t + '"', gen.ORDER_ATOMIC];
    };

    A.forBlock['ard_char'] = function (block, gen) {
        let c = String(block.getFieldValue('CHAR') || 'A');
        if (c.length > 1 && c[0] !== '\\') c = c[0];
        c = c.replace(/'/g, "\\'");
        return ["'" + c + "'", gen.ORDER_ATOMIC];
    };

    /* ---------- blocos nativos de variável ---------- */

    A.forBlock['variables_get'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return [nome, gen.ORDER_ATOMIC];
    };

    // Vem no flyout padrão da categoria Variáveis do Blockly.
    A.forBlock['math_change'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return nome + ' += ' + gen.valorOu(block, 'DELTA', gen.ORDER_ASSIGNMENT, '1') + ';\n';
    };

    A.forBlock['variables_set'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return nome + ' = ' + gen.valorOu(block, 'VALUE', gen.ORDER_ASSIGNMENT, '0') + ';\n';
    };

})(typeof window !== 'undefined' ? window : global);
