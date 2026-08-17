'use strict';
/** forBlock das categorias de E/S (digital, analógica, avançada) e tempo. */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    /* ---------- digital ---------- */

    A.forBlock['ard_pinmode'] = function (block) {
        return 'pinMode(' + block.getFieldValue('PIN') + ', ' + block.getFieldValue('MODO') + ');\n';
    };

    A.forBlock['ard_digitalwrite'] = function (block, gen) {
        const valor = gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, 'LOW');
        return 'digitalWrite(' + block.getFieldValue('PIN') + ', ' + valor + ');\n';
    };

    A.forBlock['ard_digitalread'] = function (block, gen) {
        return ['digitalRead(' + block.getFieldValue('PIN') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- analógica ---------- */

    A.forBlock['ard_analogread'] = function (block, gen) {
        return ['analogRead(' + block.getFieldValue('PIN') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_analogwrite'] = function (block, gen) {
        const valor = gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0');
        return 'analogWrite(' + block.getFieldValue('PIN') + ', ' + valor + ');\n';
    };

    A.forBlock['ard_analogreference'] = function (block) {
        return 'analogReference(' + block.getFieldValue('TIPO') + ');\n';
    };

    A.forBlock['ard_analogreadresolution'] = function (block, gen) {
        return 'analogReadResolution(' + gen.valorOu(block, 'BITS', gen.ORDER_COMMA, '12') + ');\n';
    };

    /* ---------- avançada ---------- */

    A.forBlock['ard_tone'] = function (block, gen) {
        return 'tone(' + block.getFieldValue('PIN') + ', ' +
            gen.valorOu(block, 'FREQ', gen.ORDER_COMMA, '440') + ');\n';
    };

    A.forBlock['ard_tone_dur'] = function (block, gen) {
        return 'tone(' + block.getFieldValue('PIN') + ', ' +
            gen.valorOu(block, 'FREQ', gen.ORDER_COMMA, '440') + ', ' +
            gen.valorOu(block, 'DUR', gen.ORDER_COMMA, '500') + ');\n';
    };

    A.forBlock['ard_notone'] = function (block) {
        return 'noTone(' + block.getFieldValue('PIN') + ');\n';
    };

    A.forBlock['ard_pulsein'] = function (block, gen) {
        return ['pulseIn(' + block.getFieldValue('PIN') + ', ' + block.getFieldValue('NIVEL') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_pulsein_timeout'] = function (block, gen) {
        return ['pulseIn(' + block.getFieldValue('PIN') + ', ' + block.getFieldValue('NIVEL') + ', ' +
            gen.valorOu(block, 'TIMEOUT', gen.ORDER_COMMA, '1000000') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_shiftout'] = function (block, gen) {
        return 'shiftOut(' + block.getFieldValue('DATA') + ', ' + block.getFieldValue('CLOCK') + ', ' +
            block.getFieldValue('ORDEM') + ', ' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_shiftin'] = function (block, gen) {
        return ['shiftIn(' + block.getFieldValue('DATA') + ', ' + block.getFieldValue('CLOCK') + ', ' +
            block.getFieldValue('ORDEM') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    /* ---------- tempo ---------- */

    A.forBlock['ard_delay'] = function (block, gen) {
        return 'delay(' + gen.valorOu(block, 'MS', gen.ORDER_COMMA, '1000') + ');\n';
    };

    A.forBlock['ard_delaymicroseconds'] = function (block, gen) {
        return 'delayMicroseconds(' + gen.valorOu(block, 'US', gen.ORDER_COMMA, '1000') + ');\n';
    };

    A.forBlock['ard_millis'] = function (block, gen) {
        return ['millis()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_micros'] = function (block, gen) {
        return ['micros()', gen.ORDER_UNARY_POSTFIX];
    };

})(typeof window !== 'undefined' ? window : global);
