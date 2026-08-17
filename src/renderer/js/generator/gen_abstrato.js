'use strict';
/**
 * forBlock do MODO ABSTRATO.
 *
 * Cada bloco daqui produz exatamente o mesmo C++ que a sua combinação literal
 * equivalente — a tabela dessas equivalências vive em converter.js, e
 * tools/modo_test.js compara os dois lados caractere a caractere. Se você mudar
 * a saída de um gerador aqui, o teste vai apontar o par que deixou de fechar.
 *
 * Onde um bloco precisa de mais de um comando, o que não é ação do aluno vai
 * para o topo do setup por gen.usarSetup(), e o que é declaração global por
 * gen.usarGlobal() — os mesmos mecanismos que as bibliotecas já usavam.
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    /* ------------------------------------------------------------------ */
    /* Estrutura                                                           */
    /* ------------------------------------------------------------------ */

    A.forBlock['abs_ao_iniciar'] = function (block, gen) {
        if (gen.temSetup_) {
            gen.aviso('Existe mais de um bloco "Ao iniciar"; só o último vale.', block.id);
        }
        gen.temSetup_ = true;
        gen.corpoSetup_ = gen.statementToCode(block, 'BODY');
        return '';
    };

    A.forBlock['abs_sempre'] = function (block, gen) {
        if (gen.temLoop_) {
            gen.aviso('Existe mais de um bloco "Sempre"; só o último vale.', block.id);
        }
        gen.temLoop_ = true;
        gen.corpoLoop_ = gen.statementToCode(block, 'BODY');
        return '';
    };

    /* ------------------------------------------------------------------ */
    /* Entradas e saídas                                                   */
    /* ------------------------------------------------------------------ */

    /** pinMode de um pino, declarado uma vez só por modo. */
    function pino(gen, p, modo) {
        gen.usarSetup('pinmode:' + p + ':' + modo, 'pinMode(' + p + ', ' + modo + ');');
    }

    A.forBlock['abs_escrita_digital'] = function (block, gen) {
        const p = block.getFieldValue('PIN');
        pino(gen, p, 'OUTPUT');
        return 'digitalWrite(' + p + ', ' + block.getFieldValue('VALOR') + ');\n';
    };

    A.forBlock['abs_leitura_digital'] = function (block, gen) {
        const p = block.getFieldValue('PIN');
        pino(gen, p, 'INPUT');
        return ['digitalRead(' + p + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_botao'] = function (block, gen) {
        const p = block.getFieldValue('PIN');
        // Pull-up interno: o botão liga o pino ao GND, então apertado é LOW.
        pino(gen, p, 'INPUT_PULLUP');
        return ['digitalRead(' + p + ') == LOW', gen.ORDER_EQUALITY];
    };

    A.forBlock['abs_escrita_analogica'] = function (block, gen) {
        // analogWrite não precisa de pinMode: nada é injetado aqui.
        const pct = gen.valorOu(block, 'PCT', gen.ORDER_COMMA, '0');
        return 'analogWrite(' + block.getFieldValue('PIN') + ', map(' + pct +
            ', 0, 100, 0, 255));\n';
    };

    A.forBlock['abs_leitura_analogica'] = function (block, gen) {
        return ['map(analogRead(' + block.getFieldValue('PIN') + '), 0, 1023, 0, 100)',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_distancia'] = function (block, gen) {
        const trig = block.getFieldValue('TRIG');
        const echo = block.getFieldValue('ECHO');
        pino(gen, trig, 'OUTPUT');
        pino(gen, echo, 'INPUT');
        gen.usarGlobal('abs:fn:distancia',
            '// Distancia por ultrassom, em centimetros.\n' +
            '// Sem eco o pulseIn devolve 0, que como distancia seria "colado no\n' +
            '// sensor" — o oposto do que aconteceu. Vira 400, o alcance maximo.\n' +
            'float absDistanciaCm(byte trig, byte echo) {\n' +
            '  digitalWrite(trig, LOW);\n' +
            '  delayMicroseconds(2);\n' +
            '  digitalWrite(trig, HIGH);\n' +
            '  delayMicroseconds(10);\n' +
            '  digitalWrite(trig, LOW);\n' +
            '  unsigned long t = pulseIn(echo, HIGH, 30000UL);\n' +
            '  if (t == 0) return 400.0;\n' +
            '  return float(t) / 58.0;\n' +
            '}');
        return ['absDistanciaCm(' + trig + ', ' + echo + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_servo'] = function (block, gen) {
        const p = block.getFieldValue('PIN');
        const obj = 'servo' + gen.identificador(String(p), 'p');
        gen.usarInclude('Servo.h');
        gen.usarGlobal('obj:' + obj, 'Servo ' + obj + ';');
        gen.usarSetup('servo:' + obj, obj + '.attach(' + p + ');');
        return obj + '.write(' + gen.valorOu(block, 'ANGULO', gen.ORDER_COMMA, '90') + ');\n';
    };

    A.forBlock['abs_nota'] = function (block, gen) {
        return 'tone(' + block.getFieldValue('PIN') + ', ' +
            gen.valorOu(block, 'FREQ', gen.ORDER_COMMA, '440') + ', ' +
            gen.valorOu(block, 'DUR', gen.ORDER_COMMA, '500') + ');\n';
    };

    /* ------------------------------------------------------------------ */
    /* Tempo                                                              */
    /* ------------------------------------------------------------------ */

    A.forBlock['abs_esperar'] = function (block, gen) {
        const qtd = gen.valorOu(block, 'QTD', gen.ORDER_MULTIPLICATIVE, '1');
        if (block.getFieldValue('UNI') === 'ms') {
            return 'delay(' + qtd + ');\n';
        }
        return 'delay(' + qtd + ' * 1000);\n';
    };

    A.forBlock['abs_tempo_ligado'] = function (block, gen) {
        if (block.getFieldValue('UNI') === 'ms') {
            return ['millis()', gen.ORDER_UNARY_POSTFIX];
        }
        // Divisão inteira, de propósito: "millis() / 1000.0" não teria par
        // literal exato, porque o bloco de número normaliza 1000.0 para 1000 —
        // e a conversão entre modos não pode mudar uma linha do C++. Segundos
        // inteiros também é o que este bloco promete no rótulo.
        return ['millis() / 1000', gen.ORDER_MULTIPLICATIVE];
    };

    /* ------------------------------------------------------------------ */
    /* Mostrar                                                            */
    /* ------------------------------------------------------------------ */

    function serial(gen) {
        gen.usarSetup('serial:begin', 'Serial.begin(9600);');
    }

    function texto(t) {
        return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    A.forBlock['abs_mostrar'] = function (block, gen) {
        serial(gen);
        const rot = texto(block.getFieldValue('ROTULO'));
        const v = gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0');
        return 'Serial.print("' + rot + ': ");\n' +
            'Serial.println(' + v + ');\n';
    };

    A.forBlock['abs_mostrar_grafico'] = function (block, gen) {
        serial(gen);
        // Sem espaço depois dos dois-pontos: é o formato que o Plotter entende.
        const rot = texto(block.getFieldValue('ROTULO'));
        const v = gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0');
        return 'Serial.print("' + rot + ':");\n' +
            'Serial.println(' + v + ');\n';
    };

    A.forBlock['abs_mostrar_reticulado'] = function (block, gen) {
        serial(gen);
        const mu = gen.valorOu(block, 'MU', gen.ORDER_COMMA, '0.5');
        const lam = gen.valorOu(block, 'LAMBDA', gen.ORDER_COMMA, '0.5');
        return 'Serial.print("mu:");\n' +
            'Serial.print(' + mu + ');\n' +
            'Serial.print(" lambda:");\n' +
            'Serial.println(' + lam + ');\n';
    };

    /* ------------------------------------------------------------------ */
    /* Controle                                                           */
    /* ------------------------------------------------------------------ */

    A.forBlock['abs_se'] = function (block, gen) {
        const c = gen.valueToCode(block, 'COND', gen.ORDER_NONE) || 'false';
        return 'if (' + c + ') {\n' + gen.statementToCode(block, 'ENTAO') + '}\n';
    };

    A.forBlock['abs_se_senao'] = function (block, gen) {
        const c = gen.valueToCode(block, 'COND', gen.ORDER_NONE) || 'false';
        return 'if (' + c + ') {\n' + gen.statementToCode(block, 'ENTAO') + '}\n' +
            'else {\n' + gen.statementToCode(block, 'SENAO') + '}\n';
    };

    A.forBlock['abs_repetir'] = function (block, gen) {
        const vezes = gen.valorOu(block, 'VEZES', gen.ORDER_RELATIONAL, '10');
        return 'for (int i = 0; i < ' + vezes + '; i += 1) {\n' +
            gen.statementToCode(block, 'BODY') + '}\n';
    };

    A.forBlock['abs_enquanto'] = function (block, gen) {
        const c = gen.valueToCode(block, 'COND', gen.ORDER_NONE) || 'false';
        return 'while (' + c + ') {\n' + gen.statementToCode(block, 'BODY') + '}\n';
    };

    /* ------------------------------------------------------------------ */
    /* Operadores e matemática                                            */
    /* ------------------------------------------------------------------ */

    A.forBlock['abs_comparar'] = function (block, gen) {
        const OPS = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
        const op = OPS[block.getFieldValue('OP')] || '==';
        const ordem = (op === '==' || op === '!=') ? gen.ORDER_EQUALITY : gen.ORDER_RELATIONAL;
        const a = gen.valueToCode(block, 'A', ordem) || '0';
        const b = gen.valueToCode(block, 'B', ordem) || '0';
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['abs_logico'] = function (block, gen) {
        const e = block.getFieldValue('OP') === 'AND';
        const op = e ? '&&' : '||';
        const ordem = e ? gen.ORDER_LOGICAL_AND : gen.ORDER_LOGICAL_OR;
        const a = gen.valueToCode(block, 'A', ordem) || (e ? 'true' : 'false');
        const b = gen.valueToCode(block, 'B', ordem) || (e ? 'true' : 'false');
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['abs_conta'] = function (block, gen) {
        const op = block.getFieldValue('OP');
        const ordem = (op === '+' || op === '-') ? gen.ORDER_ADDITIVE : gen.ORDER_MULTIPLICATIVE;
        const a = gen.valorOu(block, 'A', ordem, '0');
        const b = gen.valorOu(block, 'B', ordem, '0');
        return [a + ' ' + op + ' ' + b, ordem];
    };

    A.forBlock['abs_mapear'] = function (block, gen) {
        return ['map(' + gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'DE_MIN', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'DE_MAX', gen.ORDER_COMMA, '1023') + ', ' +
            gen.valorOu(block, 'PARA_MIN', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'PARA_MAX', gen.ORDER_COMMA, '255') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_sorteio'] = function (block, gen) {
        return ['random(' + gen.valorOu(block, 'MIN', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'MAX', gen.ORDER_COMMA, '100') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    /* ------------------------------------------------------------------ */
    /* Variáveis                                                          */
    /* ------------------------------------------------------------------ */

    A.forBlock['abs_criar'] = function (block, gen) {
        // float aceita inteiro e fracionário: no Modo Abstrato o aluno não
        // escolhe tipo, então escolhe-se o que não surpreende.
        const nome = gen.nomeVar(block);
        const valor = gen.valueToCode(block, 'VALOR', gen.ORDER_ASSIGNMENT);
        gen.varsDeclaradas_.add(nome);
        gen.usarGlobal('var:' + nome,
            'float ' + nome + (valor ? ' = ' + valor : '') + ';');
        return '';
    };

    A.forBlock['abs_definir'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return nome + ' = ' + gen.valorOu(block, 'VALOR', gen.ORDER_ASSIGNMENT, '0') + ';\n';
    };

    A.forBlock['abs_ler'] = function (block, gen) {
        const nome = gen.nomeVar(block);
        gen.varsUsadas_.set(nome, block.id);
        return [nome, gen.ORDER_ATOMIC];
    };

    /* ------------------------------------------------------------------ */
    /* Lógica paraconsistente                                             */
    /* ------------------------------------------------------------------ */

    /**
     * O runtime é o mesmo do Modo Literal. Em vez de duplicá-lo, chama-se o
     * gerador literal correspondente por um bloco temporário — assim existe uma
     * única fonte das funções lpa*, e mudar uma delas vale para os dois modos.
     */
    function lpaPrecisa(gen, nomes) {
        // gen_lp.js expõe as definições por meio dos seus próprios forBlock;
        // aqui se reaproveita a função de dependências publicada no gerador.
        if (typeof gen.lpaPrecisa === 'function') {
            nomes.forEach(n => gen.lpaPrecisa(n));
        }
    }

    /** λ pela convenção do complemento: a fonte 2 chega favorável. */
    function anotacao(block, gen) {
        const mu = gen.valorOu(block, 'MU1', gen.ORDER_COMMA, '0.5');
        const mu2 = gen.valorOu(block, 'MU2', gen.ORDER_ADDITIVE, '0.5');
        return { mu: mu, lam: '1.0 - ' + mu2 };
    }

    A.forBlock['abs_evidencia'] = function (block, gen) {
        lpaPrecisa(gen, ['lpaEvidencia']);
        return ['lpaEvidencia(' + gen.valorOu(block, 'X', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'A1', gen.ORDER_COMMA, '0') + ', ' +
            gen.valorOu(block, 'A2', gen.ORDER_COMMA, '1023') + ', 0)',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_caso_estado'] = function (block, gen) {
        return 'case ' + block.getFieldValue('ESTADO') + ':\n' +
            gen.statementToCode(block, 'BODY') + gen.INDENT + 'break;\n';
    };

    A.forBlock['abs_quando_estado'] = function (block, gen) {
        // O parêntese não é enfeite: o Para-Analisador literal escreve
        // "1.0 - (x)" sempre, e a conversão entre modos exige a mesma linha.
        const mu = gen.valorOu(block, 'MU1', gen.ORDER_COMMA, '0.5');
        const lam = '1.0 - (' + gen.valorOu(block, 'MU2', gen.ORDER_NONE, '0.5') + ')';
        const a = { mu: mu, lam: lam };
        const casos = gen.statementToCode(block, 'CASOS');
        if (!casos.trim()) {
            gen.aviso('A análise está sem nenhum estado — ela não faz nada.', block.id);
        }
        // Só agora, e nesta ordem: entradas, corpo dos casos, e por último o
        // runtime. É a mesma sequência do Para-Analisador literal, e é ela que
        // decide em que posição cada definição aparece no .ino. Pedir o runtime
        // antes mudaria o arquivo sem mudar o programa — e a promessa dos dois
        // modos é arquivo idêntico.
        lpaPrecisa(gen, ['lpaEstado']);
        return 'switch (lpaEstado(' + a.mu + ', ' + a.lam +
            ', 0.5, -0.5, 0.5, -0.5)) {\n' + casos + '}\n';
    };

    A.forBlock['abs_grau'] = function (block, gen) {
        const a = anotacao(block, gen);
        const grau = block.getFieldValue('GRAU');
        if (grau === 'GC') {
            lpaPrecisa(gen, ['lpaGc']);
            return ['lpaGc(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'GCT') {
            lpaPrecisa(gen, ['lpaGct']);
            return ['lpaGct(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'PHI') {
            lpaPrecisa(gen, ['lpaGct', 'lpaPhi']);
            return ['lpaPhi(lpaGct(' + a.mu + ', ' + a.lam + '))', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'GCR') {
            lpaPrecisa(gen, ['lpaGcr']);
            return ['lpaGcr(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        lpaPrecisa(gen, ['lpaMuEr']);
        return ['lpaMuEr(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_contradicao'] = function (block, gen) {
        lpaPrecisa(gen, ['lpaIndefinido']);
        const a = anotacao(block, gen);
        return ['lpaIndefinido(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_combinar'] = function (block, gen) {
        lpaPrecisa(gen, ['lpaConectivo']);
        const fn = block.getFieldValue('OP') === 'MIN' ? 'lpaMin' : 'lpaMax';
        return [fn + '(' + gen.valorOu(block, 'A', gen.ORDER_COMMA, '0.5') + ', ' +
            gen.valorOu(block, 'B', gen.ORDER_COMMA, '0.5') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

})(typeof window !== 'undefined' ? window : global);
