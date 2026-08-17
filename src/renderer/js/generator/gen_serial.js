'use strict';
/** forBlock da categoria SERIAL. */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    function porta(block) {
        return block.getFieldValue('PORTA') || 'Serial';
    }

    A.forBlock['ard_serial_begin'] = function (block) {
        return porta(block) + '.begin(' + block.getFieldValue('BAUD') + ');\n';
    };

    A.forBlock['ard_serial_print'] = function (block, gen) {
        return porta(block) + '.print(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '""') + ');\n';
    };

    A.forBlock['ard_serial_println'] = function (block, gen) {
        const v = gen.valueToCode(block, 'VALOR', gen.ORDER_COMMA);
        // println() sem argumento é válido e útil: pula uma linha
        return porta(block) + '.println(' + (v || '') + ');\n';
    };

    A.forBlock['ard_serial_print_format'] = function (block, gen) {
        return porta(block) + '.print(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') +
            ', ' + block.getFieldValue('FORMATO') + ');\n';
    };

    A.forBlock['ard_serial_write'] = function (block, gen) {
        return porta(block) + '.write(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ');\n';
    };

    A.forBlock['ard_serial_available'] = function (block, gen) {
        return [porta(block) + '.available()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_serial_read'] = function (block, gen) {
        return [porta(block) + '.read()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_serial_readstringuntil'] = function (block, gen) {
        const term = block.getFieldValue('TERM');
        return [porta(block) + ".readStringUntil('" + term + "')", gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_serial_parseint'] = function (block, gen) {
        return [porta(block) + '.parseInt()', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['ard_serial_flush'] = function (block) {
        return porta(block) + '.flush();\n';
    };

    A.forBlock['ard_serial_end'] = function (block) {
        return porta(block) + '.end();\n';
    };

})(typeof window !== 'undefined' ? window : global);
