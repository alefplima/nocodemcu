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
    /* Tarefas                                                             */
    /* ------------------------------------------------------------------ */

    /*
     * O C++ é o mesmo do ard_function_def void sem parâmetros e do ard_call
     * sem argumentos, inclusive o nome padrão: é o que deixa converter.js
     * trocar um pelo outro sem mudar o arquivo.
     */
    function nomeTarefa(block, gen) {
        return gen.identificador(block.getFieldValue('NOME'), 'minhaFuncao');
    }

    /** Nomes de função definidos no workspace, nos dois modos. */
    function tarefasDefinidas(block, gen) {
        const nomes = new Set();
        if (!block.workspace) return nomes;
        block.workspace.getTopBlocks(false).forEach(b => {
            if (!b.isEnabled()) return;
            if (b.type === 'abs_tarefa' || b.type === 'ard_function_def') {
                nomes.add(gen.identificador(b.getFieldValue('NOME'), 'minhaFuncao'));
            }
        });
        return nomes;
    }

    A.forBlock['abs_tarefa'] = function (block, gen) {
        const nome = nomeTarefa(block, gen);
        if (nome === 'setup' || nome === 'loop') {
            gen.aviso('A tarefa não pode se chamar "' + nome + '": esse nome já é do ' +
                (nome === 'setup' ? '"Ao iniciar"' : '"Sempre"') + '.', block.id);
        }
        if (gen.tarefasGeradas_.has(nome)) {
            gen.aviso('Existem duas tarefas chamadas "' + block.getFieldValue('NOME') +
                '"; o programa não compila assim.', block.id);
        }
        gen.tarefasGeradas_.add(nome);

        const corpo = gen.statementToCode(block, 'BODY');
        const assinatura = 'void ' + nome + '()';
        gen.usarPrototipo(nome, assinatura + ';');
        gen.funcoes_.push(assinatura + ' {\n' + corpo + '}');
        return '';
    };

    A.forBlock['abs_fazer_tarefa'] = function (block, gen) {
        const nome = nomeTarefa(block, gen);
        if (!tarefasDefinidas(block, gen).has(nome)) {
            gen.aviso('Não existe tarefa chamada "' + block.getFieldValue('NOME') + '".', block.id);
        }
        return nome + '();\n';
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

    A.forBlock['abs_senao_estado'] = function (block, gen) {
        return 'default:\n' + gen.statementToCode(block, 'BODY') + gen.INDENT + 'break;\n';
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



    /*
     * O runtime da página, em C++ cru.
     *
     * O desenho do reticulado e o laço de atualização são os mesmos que já
     * rodaram na bancada no exemplo 12 — lá escritos à mão em blocos de código
     * livre, aqui escritos uma vez pelo gerador. Os botões chamam de volta a
     * placa em /b?n=<nome>, e a página repete o aviso enquanto o dedo está no
     * botão: soltar o dedo para o robô sozinho, sem estado preso em lugar
     * nenhum. É por isso que absWebApertado() olha a hora do último aviso.
     */
    const RUNTIME_WEB = [
        '// Pagina servida pela propria placa: quem olha e um celular no',
        '// navegador, sem cabo e sem instalar nada. Os botoes e os valores sao',
        '// registrados no inicio do programa e a pagina se monta a partir deles.',
        'static const byte ABS_WEB_MAX = 8;',
        'static const unsigned long ABS_WEB_VALIDADE = 400;  // ms que um toque vale',
        'String absWebBotoes[ABS_WEB_MAX];',
        'byte absWebNBotoes = 0;',
        'String absWebRotulos[ABS_WEB_MAX];',
        'float absWebValores[ABS_WEB_MAX];',
        'byte absWebNValores = 0;',
        'bool absWebTemReticulado = false;',
        'float absWebMu = 0.5, absWebLambda = 0.5;',
        'String absWebEstado = "--";',
        'String absWebToque = "";',
        'unsigned long absWebToqueEm = 0;',
        'bool absWebAberto = false;',
        '// Camera na pagina: o video em si vem da porta 81 (ver absCameraLigar);',
        '// aqui fica so a ordem de abrir ou fechar, que a pagina le junto com os numeros.',
        'bool absWebTemCamera = false;',
        'bool absWebCameraVisivel = false;',
        'String absWebCameraAviso = "";',
        '',
        '// Avisado quando o video entra ou sai da pagina: a camera usa isto para',
        '// dormir enquanto ninguem olha (ver absCameraAcordar).',
        'void (*absWebAoMostrarCamera)(bool) = NULL;',
        '',
        'void absWebCamera(bool visivel, const char *aviso) {',
        '  if (visivel != absWebCameraVisivel && absWebAoMostrarCamera) absWebAoMostrarCamera(visivel);',
        '  absWebCameraVisivel = visivel;',
        '  absWebCameraAviso = aviso;',
        '}',
        '',
        'void absWebRegistrarBotao(const char *nome) {',
        '  for (byte i = 0; i < absWebNBotoes; i++) if (absWebBotoes[i] == nome) return;',
        '  if (absWebNBotoes < ABS_WEB_MAX) absWebBotoes[absWebNBotoes++] = nome;',
        '}',
        '',
        'byte absWebIndice(const char *rotulo) {',
        '  for (byte i = 0; i < absWebNValores; i++) if (absWebRotulos[i] == rotulo) return i;',
        '  if (absWebNValores < ABS_WEB_MAX) {',
        '    absWebRotulos[absWebNValores] = rotulo;',
        '    absWebValores[absWebNValores] = 0;',
        '    return absWebNValores++;',
        '  }',
        '  return 0;',
        '}',
        '',
        'void absWebRegistrarValor(const char *rotulo) { absWebIndice(rotulo); }',
        '',
        'void absWebValor(const char *rotulo, float v) { absWebValores[absWebIndice(rotulo)] = v; }',
        '',
        '// O nome do botao chega da pagina em porcentagem (%C3%A0, +): um nome com',
        '// acento ou espaco nunca casaria com o do bloco sem desfazer isso.',
        'String absWebTexto(String s) {',
        '  String r = "";',
        '  for (unsigned int i = 0; i < s.length(); i++) {',
        '    char c = s[i];',
        '    if (c == \'+\') { r += \' \'; }',
        '    else if (c == \'%\' && i + 2 < s.length()) {',
        '      r += (char) strtol(s.substring(i + 1, i + 3).c_str(), NULL, 16);',
        '      i += 2;',
        '    } else { r += c; }',
        '  }',
        '  return r;',
        '}',
        '',
        '// Verdadeiro enquanto o dedo esta no botao: a pagina repete o aviso a',
        '// cada 150 ms, entao um aviso velho e dedo que ja soltou.',
        'bool absWebApertado(const char *nome) {',
        '  if (absWebToque.length() == 0) return false;',
        '  if (millis() - absWebToqueEm > ABS_WEB_VALIDADE) return false;',
        '  return absWebToque == nome;',
        '}',
        '',
        'void absWebCabecalho(WiFiClient &c, const char *tipo) {',
        '  c.print(F("HTTP/1.1 200 OK\\r\\nContent-Type: "));',
        '  c.print(tipo);',
        '  c.print(F("\\r\\nConnection: close\\r\\n\\r\\n"));',
        '}',
        '',
        '// Os numeros que a pagina le a cada 300 ms, uma linha por coisa.',
        'void absWebDados(WiFiClient &c) {',
        '  absWebCabecalho(c, "text/plain");',
        '  if (absWebTemReticulado) {',
        '    c.print(F("R,")); c.print(absWebMu, 3);',
        '    c.print(\',\');     c.print(absWebLambda, 3);',
        '    c.print(\',\');     c.println(absWebEstado);',
        '  }',
        '  if (absWebTemCamera) {',
        '    c.print(F("C,")); c.print(absWebCameraVisivel ? 1 : 0);',
        '    c.print(\',\');     c.println(absWebCameraAviso);',
        '  }',
        '  for (byte i = 0; i < absWebNValores; i++) {',
        '    c.print(F("V,")); c.print(absWebRotulos[i]);',
        '    c.print(\',\');     c.println(absWebValores[i], 2);',
        '  }',
        '}',
        '',
        'void absWebPagina(WiFiClient &c) {',
        '  absWebCabecalho(c, "text/html; charset=utf-8");',
        '  c.print(R"H(<!doctype html><html lang=pt-br><head><meta charset=utf-8>',
        '<meta name=viewport content="width=device-width,initial-scale=1">',
        '<title>NoCodeMCU</title><style>',
        'body{margin:0;padding:14px;background:#0f1115;color:#e6e6e6;text-align:center;',
        'font:14px ui-monospace,Menlo,monospace}',
        'canvas{max-width:100%}#est{font-size:26px;font-weight:700;margin:10px 0 2px}',
        '.l{color:#8b93a7;font-size:12px;line-height:1.7}',
        '#bt{margin-top:14px}',
        '#bt button{font:600 15px ui-monospace,Menlo,monospace;color:#e6e6e6;',
        'background:#222836;border:1px solid #3a4152;border-radius:10px;',
        'padding:18px 12px;min-width:104px;margin:4px;touch-action:none}',
        '#bt button:active{background:#4da3ff;border-color:#4da3ff;color:#0f1115}',
        '</style></head><body>)H");',
        '  if (absWebTemReticulado) c.print(F("<canvas id=cv width=360 height=360></canvas>"));',
        '  c.print(F("<div id=est>--</div><div class=l id=num></div><div id=bt></div><script>"));',
        '  c.print(F("var TEMR=")); c.print(absWebTemReticulado ? 1 : 0);',
        '  c.print(F(";var B=["));',
        '  for (byte i = 0; i < absWebNBotoes; i++) {',
        '    if (i) c.print(\',\');',
        '    c.print(\'"\'); c.print(absWebBotoes[i]); c.print(\'"\');',
        '  }',
        '  c.print(F("];"));',
        '  if (absWebTemReticulado) {',
        '    c.print(R"H(var cv=document.getElementById("cv"),g=cv.getContext("2d"),R=[];',
        'function X(v){return 180+v*150}function Y(v){return 180-v*150}',
        'function li(a,b,c,d){g.beginPath();g.moveTo(X(a),Y(b));g.lineTo(X(c),Y(d));g.stroke()}',
        'function fundo(){g.clearRect(0,0,360,360);',
        'g.strokeStyle="#2a2f3a";g.lineWidth=1;',
        'for(var v=-0.75;v<0.8;v+=0.25){if(Math.abs(v)<0.01)continue;',
        'var m=1-Math.abs(v);li(-m,v,m,v);li(v,-m,v,m)}',
        'g.strokeStyle="#5a6478";g.lineWidth=2;g.beginPath();',
        'g.moveTo(X(1),Y(0));g.lineTo(X(0),Y(1));g.lineTo(X(-1),Y(0));',
        'g.lineTo(X(0),Y(-1));g.closePath();g.stroke();',
        'g.strokeStyle="#7a8698";g.lineWidth=1;g.setLineDash([4,4]);',
        '[0.5,-0.5].forEach(function(v){var m=1-Math.abs(v);li(v,-m,v,m);li(-m,v,m,v)});',
        'g.setLineDash([]);li(-0.5,-0.5,0.5,0.5);li(-0.5,0.5,0.5,-0.5);',
        'g.strokeStyle="#3a4152";li(-1,0,1,0);li(0,-1,0,1);',
        'g.fillStyle="#e6e6e6";g.font="600 14px monospace";',
        'g.textAlign="center";g.textBaseline="middle";',
        'g.fillText("V",X(1)+14,Y(0));g.fillText("F",X(-1)-14,Y(0));',
        'g.fillText("T",X(0),Y(1)-14);g.fillText("\\u22a5",X(0),Y(-1)+14);}',
        'function pt(a,b,al,cor){g.globalAlpha=al;g.fillStyle=cor;',
        'g.beginPath();g.arc(X(a),Y(b),al>0.9?6:3,0,6.3);g.fill();g.globalAlpha=1}',
        'function pinta(){fundo();for(var i=0;i<R.length;i++)',
        'pt(R[i][0],R[i][1],0.12+0.5*(i+1)/R.length,"#4da3ff");',
        'if(R.length){var u=R[R.length-1];pt(u[0],u[1],1,"#ff5c5c")}}fundo();)H");',
        '  }',
        '  c.print(R"H(var bt=document.getElementById("bt"),atual="",rep=0;',
        'function manda(n){fetch("/b?n="+encodeURIComponent(n)).catch(function(){})}',
        'function solta(){atual="";clearInterval(rep);manda("")}',
        'B.forEach(function(n){var b=document.createElement("button");b.textContent=n;',
        'b.addEventListener("pointerdown",function(e){e.preventDefault();atual=n;manda(n);',
        'clearInterval(rep);rep=setInterval(function(){manda(atual)},150)});',
        '["pointerup","pointercancel","pointerleave"].forEach(function(ev){',
        'b.addEventListener(ev,solta)});bt.appendChild(b)});',
        'function tick(){fetch("/d").then(function(r){return r.text()}).then(function(t){',
        'var vs=[];t.split("\\n").forEach(function(l){var p=l.trim().split(",");',
        'if(p[0]=="R"&&TEMR){var mu=+p[1],lam=+p[2],gc=mu-lam,gct=mu+lam-1;',
        'R.push([gc,gct]);if(R.length>120)R.shift();pinta();',
        'document.getElementById("est").textContent=p[3];',
        'vs.push("mu "+mu.toFixed(3)+"   lambda "+lam.toFixed(3)+',
        '"   Gc "+gc.toFixed(3)+"   Gct "+gct.toFixed(3))}',
        'else if(p[0]=="V")vs.push(p[1]+" "+p[2])});',
        'document.getElementById("num").textContent=vs.join("   |   ")}).catch(function(){',
        'document.getElementById("est").textContent="sem sinal"})}',
        'setInterval(tick,300);tick();</script></body></html>)H");',
        '}',
        '',
        '// Uma volta do servidor: recebe um toque, responde os numeros ou serve a',
        '// pagina. Nao trava esperando: cliente que nao falou em 300 ms fica para',
        '// a proxima volta, e o robo continua andando.',
        '// Qual pagina servir. A da camera (pilotagem) troca este ponteiro no',
        '// inicio do programa; sem camera fica a pagina de sempre.',
        'void (*absWebPaginaFn)(WiFiClient &) = absWebPagina;',
        '',
        'void absWebAtender() {',
        '  if (!absWebAberto) { absWebServidor.begin(); absWebAberto = true; }',
        '  WiFiClient c = absWebServidor.available();',
        '  if (!c) return;',
        '  unsigned long t0 = millis();',
        '  while (c.connected() && !c.available() && millis() - t0 < 300) delay(1);',
        '  String req = c.readStringUntil(\'\\r\');',
        '  while (c.available()) c.read();',
        '',
        '  int p = req.indexOf("GET /b?n=");',
        '  if (p >= 0) {',
        '    int fim = req.indexOf(\' \', p + 9);',
        '    absWebToque = (fim > 0) ? absWebTexto(req.substring(p + 9, fim)) : String("");',
        '    absWebToqueEm = millis();',
        '    absWebCabecalho(c, "text/plain");',
        '    c.print(\'.\');',
        '  } else if (req.indexOf("GET /d") >= 0) {',
        '    absWebDados(c);',
        '  } else {',
        '    absWebPaginaFn(c);',
        '  }',
        '  c.stop();',
        '}',
        '',
        '// Espera sem abandonar a pagina: durante uma manobra longa o celular',
        '// continua respondendo, em vez de parecer travado.',
        'void absWebEsperar(unsigned long ms) {',
        '  unsigned long t0 = millis();',
        '  while (millis() - t0 < ms) { absWebAtender(); delay(2); }',
        '}'
    ].join('\n');

    /* ------------------------------------------------------------------ */
    /* Motores                                                            */
    /* ------------------------------------------------------------------ */

    /*
     * Uma manobra inteira num bloco, e a velocidade numa entrada só.
     *
     * No Modo Literal cada manobra é uma função com quatro analogWrite — e como
     * o Modo Abstrato não tem funções, ela apareceria copiada em cada caso, com
     * a velocidade repetida em cada cópia. Aqui a repetição sai do programa do
     * aluno e vai para uma função que o gerador escreve uma vez.
     */

    const MANOBRA_NUM = { FRENTE: 'ABS_FRENTE', RE: 'ABS_RE', ESQ: 'ABS_ESQ', DIR: 'ABS_DIR', PARAR: 'ABS_PARAR' };

    /** Pinos da ponte H: os do bloco de configuração, ou os da bancada. */
    const MOTOR_PADRAO = { E1: '2', E2: '4', D1: '18', D2: '19' };

    function motorRuntime(gen) {
        gen.usarGlobal('abs:motores:runtime',
            '// Ponte H dos dois motores. O lado que anda recebe a intensidade e o\n' +
            '// outro fica em zero; trocar os dois de papel inverte o sentido.\n' +
            '// Sempre analogWrite nos quatro, nunca digitalWrite: no ESP32 o\n' +
            '// analogWrite prende o pino ao LEDC e a escrita digital nao pegaria.\n' +
            'static const byte ABS_FRENTE = 0, ABS_RE = 1, ABS_ESQ = 2,\n' +
            '                 ABS_DIR = 3, ABS_PARAR = 4;\n' +
            '// A intensidade entra em porcentagem e sai de 0 a 255, arredondada para\n' +
            '// o mais proximo: com casa decimal da para pedir um valor exato da\n' +
            '// bancada (29,4 % = 75 de 255), que o arredondamento para baixo perderia.\n' +
            'void absMotores(byte e1, byte e2, byte d1, byte d2, byte manobra, float pct) {\n' +
            '  int v = (int)(constrain(pct, 0.0, 100.0) * 2.55 + 0.5);\n' +
            '  switch (manobra) {\n' +
            '    case ABS_FRENTE: analogWrite(e1, v); analogWrite(e2, 0);\n' +
            '                     analogWrite(d1, v); analogWrite(d2, 0); break;\n' +
            '    case ABS_RE:     analogWrite(e1, 0); analogWrite(e2, v);\n' +
            '                     analogWrite(d1, 0); analogWrite(d2, v); break;\n' +
            '    case ABS_ESQ:    analogWrite(e1, 0); analogWrite(e2, v);\n' +
            '                     analogWrite(d1, v); analogWrite(d2, 0); break;\n' +
            '    case ABS_DIR:    analogWrite(e1, v); analogWrite(e2, 0);\n' +
            '                     analogWrite(d1, 0); analogWrite(d2, v); break;\n' +
            '    default:         analogWrite(e1, 0); analogWrite(e2, 0);\n' +
            '                     analogWrite(d1, 0); analogWrite(d2, 0); break;\n' +
            '  }\n' +
            '}');
    }

    A.forBlock['abs_motores_pinos'] = function (block, gen) {
        motorRuntime(gen);
        gen.absMotores_ = {
            E1: block.getFieldValue('E1'), E2: block.getFieldValue('E2'),
            D1: block.getFieldValue('D1'), D2: block.getFieldValue('D2')
        };
        // Parar ao ligar: sem isto, uma placa que reinicia no meio de uma
        // manobra volta com o motor no estado em que o driver ficou.
        gen.usarSetup('abs:motores:parar', 'absMotores(' + gen.absMotores_.E1 + ', ' +
            gen.absMotores_.E2 + ', ' + gen.absMotores_.D1 + ', ' + gen.absMotores_.D2 +
            ', ABS_PARAR, 0);');
        return '';
    };

    A.forBlock['abs_motores'] = function (block, gen) {
        motorRuntime(gen);
        // Dentro de uma tarefa, este bloco pode ser gerado antes do "Ao iniciar"
        // que configura os pinos: a configuração é buscada no workspace.
        if (!gen.absMotores_ && block.workspace) {
            const cfg = block.workspace.getAllBlocks(false)
                .find(b => b.type === 'abs_motores_pinos' && b.isEnabled());
            if (cfg) {
                gen.absMotores_ = {
                    E1: cfg.getFieldValue('E1'), E2: cfg.getFieldValue('E2'),
                    D1: cfg.getFieldValue('D1'), D2: cfg.getFieldValue('D2')
                };
            }
        }
        if (!gen.absMotores_) {
            gen.aviso('Falta o bloco que diz em que pinos estão os motores; ' +
                'estou usando os da bancada (2, 4, 18, 19).', block.id);
        }
        const m = gen.absMotores_ || MOTOR_PADRAO;
        const manobra = MANOBRA_NUM[block.getFieldValue('MANOBRA')] || 'ABS_PARAR';
        const vel = gen.valorOu(block, 'VEL', gen.ORDER_COMMA, '0');
        return 'absMotores(' + m.E1 + ', ' + m.E2 + ', ' + m.D1 + ', ' + m.D2 + ', ' +
            manobra + ', ' + vel + ');\n';
    };

    /* ------------------------------------------------------------------ */
    /* Página web servida pela placa                                       */
    /* ------------------------------------------------------------------ */

    /*
     * A página não é montada aqui, em tempo de geração: o C++ guarda listas de
     * botões e de valores, e monta o HTML quando o celular pede.
     *
     * Isso não é rodeio, é o que mantém a promessa dos dois modos. finish()
     * emite as globais na ordem em que foram pedidas, e um bloco de botão pode
     * estar em qualquer canto do programa — se o HTML fosse costurado durante a
     * geração, mudar um bloco de lugar mudaria o arquivo sem mudar o programa.
     * Registrando no setup (usarSetup, que deduplica e preserva a ordem), a
     * ordem de visita dos blocos não muda uma linha do .ino.
     */

    function wifi(gen) {
        if (typeof gen.incluirWifi === 'function') gen.incluirWifi(gen);
        else gen.usarInclude('WiFi.h');
    }

    function webRuntime(gen) {
        wifi(gen);
        gen.usarGlobal('abs:web:servidor', 'WiFiServer absWebServidor(80);');
        gen.usarGlobal('abs:web:runtime', RUNTIME_WEB);
    }

    A.forBlock['abs_wifi_rede_aberta'] = function (block, gen) {
        wifi(gen);
        const nome = texto(block.getFieldValue('NOME'));
        gen.usarSetup('serial:begin', 'Serial.begin(9600);');
        gen.usarSetup('wifi:ap:nota:' + nome,
            '// Rede propria, aberta: o celular conecta em "' + nome + '" e abre');
        gen.usarSetup('wifi:ap:nota2:' + nome,
            '// http://192.168.4.1 — endereco fixo do modo ponto de acesso.');
        gen.usarSetup('wifi:ap:' + nome,
            'WiFi.softAP("' + nome + '");');
        gen.usarSetup('wifi:ap:ip:' + nome,
            'Serial.print("pagina em http://"); Serial.println(WiFi.softAPIP());');
        return '';
    };

    A.forBlock['abs_wifi_entrar'] = function (block, gen) {
        wifi(gen);
        const ssid = texto(block.getFieldValue('SSID'));
        const senha = texto(block.getFieldValue('SENHA'));
        gen.usarSetup('serial:begin', 'Serial.begin(9600);');
        gen.usarSetup('wifi:begin:' + ssid,
            'WiFi.begin("' + ssid + '", "' + senha + '");');
        gen.usarSetup('wifi:espera:' + ssid,
            'while (WiFi.status() != WL_CONNECTED) delay(300);');
        gen.usarSetup('wifi:ip:' + ssid,
            'Serial.print("pagina em http://"); Serial.println(WiFi.localIP());');
        return '';
    };

    A.forBlock['abs_wifi_ip_fixo'] = function (block, gen) {
        wifi(gen);
        gen.usarGlobal('abs:wifi:ipfixo',
            '// Endereco fixo na rede. Sem isto quem escolhe o endereco e o roteador,\n' +
            '// e ele muda de uma ligacao para outra: a pagina troca de lugar sem avisar.\n' +
            '// O DNS fica no proprio roteador, que e o que uma placa dessas precisa.\n' +
            'void absWifiIpFixo(const char *ip, const char *gw, const char *mask) {\n' +
            '  IPAddress a, g, m;\n' +
            '  if (!a.fromString(ip) || !g.fromString(gw) || !m.fromString(mask)) {\n' +
            '    Serial.println("endereco IP invalido");\n' +
            '    return;\n' +
            '  }\n' +
            '  if (!WiFi.config(a, g, m, g)) Serial.println("falha ao fixar o IP");\n' +
            '}');
        const ip = texto(block.getFieldValue('IP'));
        const gw = texto(block.getFieldValue('GATEWAY'));
        const mask = texto(block.getFieldValue('MASCARA'));
        gen.usarSetup('serial:begin', 'Serial.begin(9600);');
        // Antes do WiFi.begin, sempre: configurar depois de conectar nao pega.
        gen.usarSetup('wifi:ipfixo:' + ip,
            'absWifiIpFixo("' + ip + '", "' + gw + '", "' + mask + '");');
        return '';
    };

    A.forBlock['abs_web_servidor'] = function (block, gen) {
        webRuntime(gen);
        const porta = String(block.getFieldValue('PORTA_REDE') || 80);
        // forçar: a declaração já existe com a porta padrão; aqui ela troca de
        // conteúdo sem trocar de lugar no arquivo.
        gen.usarGlobal('abs:web:servidor', 'WiFiServer absWebServidor(' + porta + ');', true);
        return '';
    };

    A.forBlock['abs_web_botao'] = function (block, gen) {
        webRuntime(gen);
        const nome = texto(block.getFieldValue('NOME'));
        gen.usarSetup('web:botao:' + nome, 'absWebRegistrarBotao("' + nome + '");');
        return ['absWebApertado("' + nome + '")', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['abs_web_mostrar'] = function (block, gen) {
        webRuntime(gen);
        const rot = texto(block.getFieldValue('ROTULO'));
        const v = gen.valorOu(block, 'VALOR', gen.ORDER_COMMA, '0');
        gen.usarSetup('web:valor:' + rot, 'absWebRegistrarValor("' + rot + '");');
        return 'absWebValor("' + rot + '", ' + v + ');\n';
    };

    A.forBlock['abs_web_reticulado'] = function (block, gen) {
        webRuntime(gen);
        const mu = gen.valorOu(block, 'MU', gen.ORDER_COMMA, '0.5');
        const lam = gen.valorOu(block, 'LAMBDA', gen.ORDER_COMMA, '0.5');
        gen.usarSetup('web:reticulado', 'absWebTemReticulado = true;');
        lpaPrecisa(gen, ['lpaEstado', 'lpaNomeEstado']);
        gen.usarGlobal('abs:web:reticulado',
            '// O estado sai dos mesmos cortes do Para-Analisador (0,5 e -0,5),\n' +
            '// para a pagina mostrar o nome junto com o ponto no reticulado.\n' +
            'void absWebReticulado(float mu, float lam) {\n' +
            '  absWebMu = mu;\n' +
            '  absWebLambda = lam;\n' +
            '  absWebEstado = lpaNomeEstado(lpaEstado(mu, lam, 0.5, -0.5, 0.5, -0.5));\n' +
            '}');
        return 'absWebReticulado(' + mu + ', ' + lam + ');\n';
    };

    A.forBlock['abs_web_atender'] = function (block, gen) {
        webRuntime(gen);
        return 'absWebAtender();\n';
    };

    A.forBlock['abs_web_esperar'] = function (block, gen) {
        webRuntime(gen);
        return 'absWebEsperar(' + gen.valorOu(block, 'MS', gen.ORDER_COMMA, '0') + ');\n';
    };

    /* ------------------------------------------------------------------ */
    /* Câmera (ESP32-S3 CAM)                                               */
    /* ------------------------------------------------------------------ */

    /*
     * O vídeo NÃO passa pelo servidor da porta 80. Aquele servidor é atendido
     * pelo loop() entre uma medida e outra; um vídeo contínuo ali dentro
     * pararia o robô. Aqui o vídeo tem servidor próprio (esp_http_server, porta
     * 81), que roda numa tarefa do FreeRTOS: enquanto o celular assiste, o
     * "Sempre" continua no mesmo ritmo.
     *
     * Dois detalhes medidos na placa, não de manual:
     *  - canal 7 e timer 3 do LEDC para o relógio da câmera. O analogWrite do
     *    core 3.x pega sempre o canal e o timer livres mais baixos e não sabe
     *    que a câmera existe; no padrão (canal 0, timer 0) o primeiro comando
     *    de motor trocaria a frequência do relógio da câmera e a imagem morria.
     *  - a pinagem é a da ESP32-S3-EYE, que é a das placas ESP32-S3 CAM
     *    genéricas e da Freenove. Conferida com uma OV5640 (PID 0x5640).
     */
    const RUNTIME_CAMERA = [
        '// Pinagem da ESP32-S3 CAM (igual a da ESP32-S3-EYE e da Freenove).',
        '// Quem usa estes pinos e a camera: eles nao aparecem na lista de pinos.',
        'bool absCameraOk = false;',
        'bool absCameraSoNaPagina = false;  // dormir enquanto o video nao esta na pagina',
        '',
        '// O sensor filma sem parar desde que liga, com ou sem alguem olhando, e o',
        '// OV5640 esquenta muito assim. Em espera (bit 6 do registro 0x3008) ele',
        '// para de filmar; acordado, o primeiro quadro sai em ~50 ms (medido).',
        '// So o OV5640 foi testado: com outro sensor a camera fica sempre ligada.',
        'void absCameraAcordar(bool acordada) {',
        '  if (!absCameraOk) return;',
        '  sensor_t *s = esp_camera_sensor_get();',
        '  if (!s || s->id.PID != OV5640_PID) return;',
        '  s->set_reg(s, 0x3008, 0x40, acordada ? 0x00 : 0x40);',
        '}',
        '',
        '// Um quadro atras do outro na mesma conexao (MJPEG): o navegador mostra',
        '// como video numa tag <img>, sem nenhum programa no celular.',
        'static esp_err_t absCameraVideo(httpd_req_t *req) {',
        '  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=quadro");',
        '  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");',
        '  char cab[96];',
        '  int falhas = 0;',
        '  unsigned long ultimo = 0;',
        '  while (true) {',
        '    // No maximo ~10 quadros/s: com o video a toda, os comandos do',
        '    // analogico disputavam o WiFi com ele e o carro respondia atrasado.',
        '    long falta = 100 - (long) (millis() - ultimo);',
        '    if (falta > 0) delay(falta);',
        '    ultimo = millis();',
        '    camera_fb_t *fb = esp_camera_fb_get();',
        '    if (!fb) {',
        '      // Um quadro perdido (queda de tensao, camera acordando) nao encerra',
        '      // o video: so desiste depois de ~2 s sem nenhum quadro.',
        '      if (++falhas > 20) return ESP_FAIL;',
        '      continue;',
        '    }',
        '    falhas = 0;',
        '    int n = snprintf(cab, sizeof cab,',
        '      "\\r\\n--quadro\\r\\nContent-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n",',
        '      (unsigned) fb->len);',
        '    esp_err_t r = httpd_resp_send_chunk(req, cab, n);',
        '    if (r == ESP_OK) r = httpd_resp_send_chunk(req, (const char *) fb->buf, fb->len);',
        '    esp_camera_fb_return(fb);',
        '    if (r != ESP_OK) return r;  // a pagina escondeu a camera: fim do video',
        '  }',
        '}',
        '',
        'void absCameraLigar(framesize_t tamanho, bool girar) {',
        '  camera_config_t c = {};',
        '  c.pin_d0 = 11; c.pin_d1 = 9;  c.pin_d2 = 8;  c.pin_d3 = 10;',
        '  c.pin_d4 = 12; c.pin_d5 = 18; c.pin_d6 = 17; c.pin_d7 = 16;',
        '  c.pin_xclk = 15; c.pin_pclk = 13; c.pin_vsync = 6; c.pin_href = 7;',
        '  c.pin_sccb_sda = 4; c.pin_sccb_scl = 5; c.pin_pwdn = -1; c.pin_reset = -1;',
        '  c.ledc_channel = LEDC_CHANNEL_7;  // longe dos canais que o analogWrite usa',
        '  c.ledc_timer = LEDC_TIMER_3;',
        '  c.xclk_freq_hz = 20000000;',
        '  c.pixel_format = PIXFORMAT_JPEG;',
        '  c.frame_size = tamanho;',
        '  c.jpeg_quality = 14;  // um pouco mais leve: ~20 % menos bytes por quadro',
        '  c.fb_count = psramFound() ? 2 : 1;',
        '  c.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;',
        '  c.grab_mode = CAMERA_GRAB_LATEST;  // sempre o quadro mais novo, sem fila',
        '  esp_err_t e = esp_camera_init(&c);',
        '  if (e != ESP_OK) {',
        '    Serial.printf("camera nao iniciou (erro 0x%x): confira o cabo flat\\n", e);',
        '    return;',
        '  }',
        '  absCameraOk = true;',
        '  if (girar) {  // camera montada de cabeca para baixo: vira e espelha',
        '    sensor_t *s = esp_camera_sensor_get();',
        '    s->set_vflip(s, 1);',
        '    s->set_hmirror(s, 1);',
        '  }',
        '  httpd_config_t h = HTTPD_DEFAULT_CONFIG();',
        '  h.server_port = 81;',
        '  h.ctrl_port = 32769;',
        '  httpd_handle_t srv = NULL;',
        '  httpd_uri_t u = {};',
        '  u.uri = "/video";',
        '  u.method = HTTP_GET;',
        '  u.handler = absCameraVideo;',
        '  if (httpd_start(&srv, &h) == ESP_OK) httpd_register_uri_handler(srv, &u);',
        '  Serial.println("video na porta 81, em /video");',
        '  if (absCameraSoNaPagina) absCameraAcordar(false);  // dorme ate a pagina pedir',
        '}'
    ].join('\n');

    const RUNTIME_PILOTO = [
        '// Pagina de pilotagem: a que entra quando o programa usa a camera. Feita',
        '// para o celular em pe: o video em cima (ou o reticulado, enquanto a LPA2v',
        '// dirige) e, embaixo, numa linha so, o botao Assumir/Liberar e o analogico.',
        '// O analogico manda os mesmos nomes dos botoes de direcao (frente, tras,',
        '// esquerda, direita): o programa nao muda nada para ser pilotado assim.',
        '// Sem "//" no JavaScript: o pre-processador do Arduino (ctags) nao entende a',
        '// string crua e leria aquilo como comentario. Por isso o "http:\\/\\/".',
        'void absWebPaginaPiloto(WiFiClient &c) {',
        '  absWebCabecalho(c, "text/html; charset=utf-8");',
        '  c.print(R"H(<!doctype html><html lang=pt-br><head><meta charset=utf-8>',
        '<meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no">',
        '<title>Pilotagem</title><style>',
        '*{box-sizing:border-box}',
        'body{margin:0 auto;padding:10px;max-width:520px;background:#f4f5f7;color:#1d2330;',
        'font:14px system-ui,-apple-system,sans-serif;-webkit-user-select:none;user-select:none}',
        '#topo{display:flex;justify-content:space-between;align-items:center;padding:0 4px 8px}',
        '#est{font-size:22px;font-weight:700}',
        '#modo{font-size:13px;font-weight:700;padding:4px 12px;border-radius:99px;background:#dce8f8;color:#1a5aa6}',
        '#modo.man{background:#ffe2bf;color:#94470a}',
        '#palco{position:relative;width:100%;aspect-ratio:4/3;background:#fff;border:1px solid #dde1e8;',
        'border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center}',
        '#palco img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}',
        '#cv{height:100%;max-width:100%}',
        '#palco.video #cv{position:absolute;right:8px;bottom:8px;width:34%;height:auto;',
        'background:rgba(255,255,255,.88);border-radius:10px}',
        '#aviso{display:none;position:absolute;left:8px;right:8px;top:8px;background:#ffb020;color:#1d2330;',
        'font-weight:700;padding:8px;border-radius:10px;text-align:center}',
        '#palco.video #aviso{display:block}',
        '#ctl{display:flex;gap:14px;align-items:center;margin-top:12px}',
        '#tg{flex:1;height:150px;border:0;border-radius:18px;background:#1f6feb;color:#fff;',
        'font:700 22px system-ui,sans-serif;touch-action:manipulation}',
        '#tg.lib{background:#2da44e}',
        '#tg:disabled{opacity:.55}',
        '#pad{position:relative;flex:none;width:150px;height:150px;border-radius:50%;background:#fff;',
        'border:2px solid #cfd6e0;touch-action:none}',
        '#pad span{position:absolute;color:#aab3c2;font-size:13px}',
        '#nub{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px;border-radius:50%;',
        'background:#1d2330;box-shadow:0 3px 8px rgba(0,0,0,.25);transition:transform .1s}',
        '#pad.on #nub{transition:none;background:#1f6feb}',
        '.l{color:#5b6475;font-size:12px;line-height:1.6;margin-top:10px;text-align:center}',
        '#bt{text-align:center}',
        '#bt button{font:600 15px system-ui,sans-serif;color:#1d2330;background:#fff;border:1px solid #cfd6e0;',
        'border-radius:12px;padding:14px 12px;min-width:100px;margin:8px 4px 0;touch-action:none}',
        '#bt button:active{background:#1f6feb;color:#fff}',
        '</style></head><body>',
        '<div id=topo><span id=est>--</span><span id=modo>LPA2v</span></div>',
        '<div id=palco><canvas id=cv width=360 height=360></canvas><div id=aviso></div></div>',
        '<div id=ctl><button id=tg>Assumir</button><div id=pad>',
        '<span style="top:6px;left:50%;margin-left:-5px">&#9650;</span>',
        '<span style="bottom:6px;left:50%;margin-left:-5px">&#9660;</span>',
        '<span style="left:8px;top:50%;margin-top:-9px">&#9664;</span>',
        '<span style="right:8px;top:50%;margin-top:-9px">&#9654;</span>',
        '<div id=nub></div></div></div>',
        '<div class=l id=num></div><div id=bt></div><script>)H");',
        '  c.print(F("var B=["));',
        '  for (byte i = 0; i < absWebNBotoes; i++) {',
        '    if (i) c.print(\',\');',
        '    c.print(\'"\'); c.print(absWebBotoes[i]); c.print(\'"\');',
        '  }',
        '  c.print(F("];"));',
        '  c.print(R"H(var DIR=["frente","tras","esquerda","direita"],',
        'temTg=B.indexOf("assumir")>=0&&B.indexOf("liberar")>=0,',
        'temPad=B.some(function(n){return DIR.indexOf(n)>=0}),',
        'atual="",rep=0,vid=null,camOn=0,pedido="",pedT=0;',
        'var cv=document.getElementById("cv"),g=cv.getContext("2d"),R=[];',
        'var tg=document.getElementById("tg"),pad=document.getElementById("pad"),nub=document.getElementById("nub");',
        'if(!temTg)tg.style.display="none";',
        'if(!temPad)pad.style.display="none";',
        'function X(v){return 180+v*150}function Y(v){return 180-v*150}',
        'function poli(ps,cor){g.fillStyle=cor;g.beginPath();g.moveTo(X(ps[0][0]),Y(ps[0][1]));',
        'for(var i=1;i<ps.length;i++)g.lineTo(X(ps[i][0]),Y(ps[i][1]));g.closePath();g.fill()}',
        'function li(a,b,c,d){g.beginPath();g.moveTo(X(a),Y(b));g.lineTo(X(c),Y(d));g.stroke()}',
        'var AREAS=[',
        '[[[0,0],[.5,.5],[1,0],[.5,-.5]],"#d3efd6",[[.5,.5],[1,0],[.5,-.5]],"#8fd19b","V",1.14,0,"#1d7a35"],',
        '[[[0,0],[-.5,.5],[-1,0],[-.5,-.5]],"#f9d6d4",[[-.5,.5],[-1,0],[-.5,-.5]],"#ee9a95","F",-1.14,0,"#b42318"],',
        '[[[0,0],[.5,.5],[0,1],[-.5,.5]],"#fdebc0",[[.5,.5],[0,1],[-.5,.5]],"#f6c766","T",0,1.12,"#9a6400"],',
        '[[[0,0],[.5,-.5],[0,-1],[-.5,-.5]],"#dde1fa",[[.5,-.5],[0,-1],[-.5,-.5]],"#a3adf0","⊥",0,-1.12,"#3b46b8"]];',
        'function fundo(){g.clearRect(0,0,360,360);',
        'AREAS.forEach(function(a){poli(a[0],a[1]);poli(a[2],a[3])});',
        'g.strokeStyle="rgba(29,35,48,.12)";g.lineWidth=1;',
        'for(var v=-0.75;v<0.8;v+=0.25){if(Math.abs(v)<0.01)continue;var m=1-Math.abs(v);li(-m,v,m,v);li(v,-m,v,m)}',
        'g.strokeStyle="rgba(29,35,48,.35)";g.setLineDash([4,4]);',
        'li(-.5,-.5,.5,.5);li(-.5,.5,.5,-.5);g.setLineDash([]);',
        'g.strokeStyle="#5b6475";g.lineWidth=2;g.beginPath();g.moveTo(X(1),Y(0));g.lineTo(X(0),Y(1));',
        'g.lineTo(X(-1),Y(0));g.lineTo(X(0),Y(-1));g.closePath();g.stroke();',
        'g.font="700 16px system-ui,sans-serif";g.textAlign="center";g.textBaseline="middle";',
        'AREAS.forEach(function(a){g.fillStyle=a[7];g.fillText(a[4],X(a[5]),Y(a[6]))})}',
        'function pt(a,b,al,r,cor){g.globalAlpha=al;g.fillStyle=cor;g.beginPath();g.arc(X(a),Y(b),r,0,6.3);g.fill();g.globalAlpha=1}',
        'function pinta(){fundo();for(var i=0;i<R.length;i++)pt(R[i][0],R[i][1],.15+.5*(i+1)/R.length,3,"#1f6feb");',
        'if(R.length){var u=R[R.length-1];pt(u[0],u[1],1,9,"#fff");pt(u[0],u[1],1,6,"#1d2330")}}',
        'fundo();',
        'function manda(n){fetch("/b?n="+encodeURIComponent(n)).catch(function(){})}',
        'function segura(n){if(n==atual)return;atual=n;clearInterval(rep);manda(n);',
        'if(n)rep=setInterval(function(){manda(atual)},150)}',
        'function mexe(e){var r=pad.getBoundingClientRect(),m=r.width/2,x=e.clientX-r.left-m,y=e.clientY-r.top-m,',
        'd=Math.sqrt(x*x+y*y),lim=m-34,k=d>lim?lim/d:1;',
        'nub.style.transform="translate("+x*k+"px,"+y*k+"px)";',
        'var n="";if(d>m*0.3)n=Math.abs(x)>Math.abs(y)?(x<0?"esquerda":"direita"):(y<0?"frente":"tras");',
        'segura(n)}',
        'pad.addEventListener("pointerdown",function(e){e.preventDefault();pad.setPointerCapture(e.pointerId);',
        'pad.className="on";mexe(e)});',
        'pad.addEventListener("pointermove",function(e){if(pad.className)mexe(e)});',
        '["pointerup","pointercancel","lostpointercapture"].forEach(function(v){pad.addEventListener(v,function(){',
        'if(!pad.className)return;pad.className="";nub.style.transform="";segura("")})});',
        'tg.addEventListener("click",function(){pedido=camOn?"liberar":"assumir";pedT=Date.now();',
        'tg.disabled=true;segura(pedido)});',
        'function confere(){if(pedido&&((pedido=="assumir")==(camOn==1)||Date.now()-pedT>3000)){',
        'if(atual==pedido)segura("");pedido="";tg.disabled=false}',
        'tg.textContent=camOn?"Liberar":"Assumir";tg.className=camOn?"lib":"";',
        'var md=document.getElementById("modo");md.textContent=camOn?"operador":"LPA2v";md.className=camOn?"man":""}',
        'function cam(on,av){var p=document.getElementById("palco");document.getElementById("aviso").textContent=av;',
        'if(on&&!vid){vid=document.createElement("img");vid.onerror=function(){setTimeout(reabre,800)};',
        'reabre();p.insertBefore(vid,p.firstChild);p.className="video"}',
        'else if(!on&&vid){vid.src="data:,";p.removeChild(vid);vid=null;p.className=""}',
        'camOn=on?1:0;confere()}',
        'function reabre(){if(vid)vid.src="http:\\/\\/"+location.hostname+":81/video?t="+Date.now()}',
        'document.getElementById("palco").addEventListener("click",reabre);',
        'var bt=document.getElementById("bt");',
        'B.forEach(function(n){if(DIR.indexOf(n)>=0||(temTg&&(n=="assumir"||n=="liberar")))return;',
        'var b=document.createElement("button");b.textContent=n;',
        'b.addEventListener("pointerdown",function(e){e.preventDefault();segura(n)});',
        '["pointerup","pointercancel","pointerleave"].forEach(function(v){b.addEventListener(v,function(){segura("")})});',
        'bt.appendChild(b)});',
        'function tick(){fetch("/d").then(function(r){return r.text()}).then(function(t){',
        'var vs=[];t.split("\\n").forEach(function(l){var p=l.trim().split(",");',
        'if(p[0]=="R"){var mu=+p[1],lam=+p[2],gc=mu-lam,gct=mu+lam-1;',
        'R.push([gc,gct]);if(R.length>80)R.shift();pinta();',
        'document.getElementById("est").textContent=p[3];',
        'vs.push("μ "+mu.toFixed(2)+"  λ "+lam.toFixed(2)+"  Gc "+gc.toFixed(2)+"  Gct "+gct.toFixed(2))}',
        'else if(p[0]=="C")cam(p[1]=="1",p.slice(2).join(","));',
        'else if(p[0]=="V")vs.push(p[1]+" "+(+p[2]).toFixed(0))});',
        'confere();document.getElementById("num").textContent=vs.join("   ·   ")}).catch(function(){',
        'document.getElementById("est").textContent="sem sinal"})}',
        'setInterval(tick,300);tick();</script></body></html>)H");',
        '}'
    ].join('\n');

    function cameraRuntime(gen) {
        gen.usarInclude('esp_camera.h');
        gen.usarInclude('esp_http_server.h');
        gen.usarGlobal('abs:camera:runtime', RUNTIME_CAMERA);
    }

    A.forBlock['abs_camera_ligar'] = function (block, gen) {
        cameraRuntime(gen);
        gen.temCamera_ = true;
        gen.usarSetup('serial:begin', 'Serial.begin(9600);');
        const tam = block.getFieldValue('TAMANHO') || 'FRAMESIZE_VGA';
        // Fica no corpo do "Ao iniciar", e não no topo como a rede: o servidor
        // do vídeo só sobe depois que a rede existe.
        const girar = block.getFieldValue('GIRAR') === '1' ? 'true' : 'false';
        return 'absCameraLigar(' + tam + ', ' + girar + ');\n';
    };

    function cameraNaPagina(block, gen) {
        webRuntime(gen);
        gen.usarGlobal('abs:web:piloto', RUNTIME_PILOTO);
        gen.usarSetup('web:camera', 'absWebTemCamera = true;');
        gen.usarSetup('web:piloto', 'absWebPaginaFn = absWebPaginaPiloto;');
        const tem = block.workspace && block.workspace.getAllBlocks(false)
            .some(b => b.type === 'abs_camera_ligar' && b.isEnabled());
        if (!tem) {
            gen.aviso('A página vai abrir o vídeo, mas nenhum bloco "ligar a câmera" ' +
                'está no programa: o quadro fica vazio.', block.id);
            return;
        }
        // Com a página decidindo quando há vídeo, a câmera só filma nessas horas.
        gen.usarSetup('web:camera:dorme', 'absCameraSoNaPagina = true;');
        gen.usarSetup('web:camera:aviso', 'absWebAoMostrarCamera = absCameraAcordar;');
    }

    A.forBlock['abs_web_camera_mostrar'] = function (block, gen) {
        cameraNaPagina(block, gen);
        return 'absWebCamera(true, "' + texto(block.getFieldValue('AVISO')) + '");\n';
    };

    A.forBlock['abs_web_camera_esconder'] = function (block, gen) {
        cameraNaPagina(block, gen);
        return 'absWebCamera(false, "");\n';
    };

})(typeof window !== 'undefined' ? window : global);
