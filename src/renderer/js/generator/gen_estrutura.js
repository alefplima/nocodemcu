'use strict';
/** forBlock da categoria ESTRUTURA + funções. */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    A.forBlock['ard_setup'] = function (block, gen) {
        if (gen.temSetup_) gen.aviso('Existe mais de um bloco void setup(); só o último vale.', block.id);
        gen.temSetup_ = true;
        gen.corpoSetup_ = gen.statementToCode(block, 'BODY');
        return '';
    };

    A.forBlock['ard_loop'] = function (block, gen) {
        if (gen.temLoop_) gen.aviso('Existe mais de um bloco void loop(); só o último vale.', block.id);
        gen.temLoop_ = true;
        gen.corpoLoop_ = gen.statementToCode(block, 'BODY');
        return '';
    };

    A.forBlock['ard_include'] = function (block, gen) {
        const lib = String(block.getFieldValue('LIB') || '').trim();
        if (lib) gen.usarInclude(lib);
        return '';
    };

    A.forBlock['ard_define'] = function (block, gen) {
        const nome = gen.identificador(block.getFieldValue('NOME'), 'CONSTANTE');
        gen.usarDefine(nome, String(block.getFieldValue('VALOR') || '').trim());
        return '';
    };

    A.forBlock['ard_comment'] = function (block) {
        return '// ' + String(block.getFieldValue('TEXTO') || '').replace(/\n/g, ' ') + '\n';
    };

    A.forBlock['ard_function_def'] = function (block, gen) {
        const tipo = block.getFieldValue('TIPO');
        const nome = gen.identificador(block.getFieldValue('NOME'), 'minhaFuncao');
        const params = String(block.getFieldValue('PARAMS') || '').trim();
        const corpo = gen.statementToCode(block, 'BODY');
        const assinatura = tipo + ' ' + nome + '(' + params + ')';

        gen.usarPrototipo(nome, assinatura + ';');
        gen.funcoes_.push(assinatura + ' {\n' + corpo + '}');
        return '';
    };

    A.forBlock['ard_return'] = function (block, gen) {
        const valor = gen.valueToCode(block, 'VALOR', gen.ORDER_NONE);
        return valor ? 'return ' + valor + ';\n' : 'return;\n';
    };

    function argumentos(block, gen) {
        const args = [];
        for (let i = 0; i < 3; i++) {
            const v = gen.valueToCode(block, 'ARG' + i, gen.ORDER_COMMA);
            if (v !== '' && v != null) args.push(v);
        }
        return args.join(', ');
    }

    A.forBlock['ard_call'] = function (block, gen) {
        const nome = gen.identificador(block.getFieldValue('NOME'), 'minhaFuncao');
        return nome + '(' + argumentos(block, gen) + ');\n';
    };

    A.forBlock['ard_call_value'] = function (block, gen) {
        const nome = gen.identificador(block.getFieldValue('NOME'), 'minhaFuncao');
        return [nome + '(' + argumentos(block, gen) + ')', gen.ORDER_UNARY_POSTFIX];
    };

})(typeof window !== 'undefined' ? window : global);
