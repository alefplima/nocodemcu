'use strict';
/**
 * Conversão entre Modo Literal e Modo Abstrato.
 *
 * A promessa: converter não muda o programa. O C++ gerado antes e depois tem de
 * ser idêntico, caractere a caractere — é isso que tools/modo_test.js verifica,
 * bloco por bloco e exemplo por exemplo.
 *
 * Por que os dois sentidos não são simétricos:
 *
 *   Abstrato → Literal sempre funciona, porque cada bloco abstrato tem uma
 *   expansão fixa e conhecida.
 *
 *   Literal → Abstrato não. O literal é mais expressivo: código livre, switch,
 *   operações de bit e casts não têm forma simplificada, e mesmo um
 *   digitalWrite só é uma "escrita digital" se existir o pinMode de saída
 *   correspondente. O que não casa FICA COMO ESTÁ e entra no relatório. É por
 *   não mexer no que não sabe converter que a garantia se mantém.
 *
 * Trabalha sobre o estado serializado do workspace (Blockly.serialization),
 * não sobre blocos vivos: fica testável sem renderização.
 */
(function (global) {

    /* ------------------------------------------------------------------ */
    /* Blocos literais declaradamente sem forma abstrata                   */
    /* ------------------------------------------------------------------ */

    const SEM_ABSTRATO = {
        ard_raw_stmt: 'código C++ escrito à mão não tem forma simplificada',
        ard_raw_expr: 'expressão C++ escrita à mão não tem forma simplificada',
        ard_switch: 'switch/case não tem equivalente no Modo Abstrato',
        ard_case: 'switch/case não tem equivalente no Modo Abstrato',
        ard_default: 'switch/case não tem equivalente no Modo Abstrato',
        ard_bitwise: 'operações de bit são recurso do Modo Literal',
        ard_bitnot: 'operações de bit são recurso do Modo Literal',
        ard_bitread: 'operações de bit são recurso do Modo Literal',
        ard_bitwrite: 'operações de bit são recurso do Modo Literal',
        ard_bitsetclear: 'operações de bit são recurso do Modo Literal',
        ard_bit: 'operações de bit são recurso do Modo Literal',
        ard_cast: 'conversão de tipo é recurso do Modo Literal',
        ard_shiftout: 'shiftOut é recurso do Modo Literal',
        ard_shiftin: 'shiftIn é recurso do Modo Literal',
        ard_pulsein: 'pulseIn cru é recurso do Modo Literal; use "distância em cm"',
        ard_pulsein_timeout: 'pulseIn cru é recurso do Modo Literal',
        ard_attachinterrupt: 'interrupções são recurso do Modo Literal',
        ard_detachinterrupt: 'interrupções são recurso do Modo Literal',
        ard_interrupts: 'interrupções são recurso do Modo Literal',
        ard_function_def: 'funções próprias são recurso do Modo Literal',
        ard_return: 'funções próprias são recurso do Modo Literal',
        ard_call: 'funções próprias são recurso do Modo Literal',
        ard_call_value: 'funções próprias são recurso do Modo Literal',
        ard_include: 'incluir biblioteca à mão é recurso do Modo Literal',
        ard_define: '#define é recurso do Modo Literal',
        ard_array_declare: 'vetores são recurso do Modo Literal',
        ard_array_get: 'vetores são recurso do Modo Literal',
        ard_array_set: 'vetores são recurso do Modo Literal'
    };

    /**
     * A assimetria também existe do outro lado, em dois casos.
     *
     * abs_distancia: medir por ultrassom é uma sequência de comandos (pulso no
     * gatilho, espera, pulseIn, conversão), não uma expressão. No Modo Literal
     * isso se escreve dentro de uma função, e função é recurso literal.
     *
     * abs_servo: a expansão existe e é simples (attach no início, write no
     * lugar), mas ela muda a POSIÇÃO da declaração "Servo servo_9;" entre os
     * globais do .ino — no abstrato ela nasce onde o bloco está, no literal
     * nasce junto do attach. Mesmo programa, arquivo diferente. Como a promessa
     * é arquivo idêntico, este bloco não é convertido; converter e avisar que o
     * texto mudou seria pior do que não converter e dizer por quê.
     *
     * Nos dois casos o bloco fica como está, funcionando, e entra no relatório.
     */
    const SEM_LITERAL = {
        abs_distancia: 'medir distância é uma sequência de comandos; no Modo ' +
            'Literal ela se escreve dentro de uma função',
        abs_servo: 'a forma literal mudaria a posição da declaração do servo no ' +
            'arquivo gerado; o bloco continua funcionando como está'
    };

    /* ------------------------------------------------------------------ */
    /* Utilidades sobre o estado serializado                               */
    /* ------------------------------------------------------------------ */

    const clonar = e => JSON.parse(JSON.stringify(e));

    function num(v) {
        return { type: 'ard_number', fields: { NUM: String(v) } };
    }
    function konst(v) {
        return { type: 'ard_const', fields: { CONST: String(v) } };
    }
    function txt(v) {
        return { type: 'ard_text', fields: { TEXTO: String(v) } };
    }

    /** Percorre a corrente de blocos a partir de um nó, inclusive. */
    function corrente(bloco) {
        const fora = [];
        let b = bloco;
        while (b) {
            fora.push(b);
            b = b.next && b.next.block;
        }
        return fora;
    }

    /**
     * Identidade estrutural de um bloco, ignorando o id.
     * O id é atribuído pelo Blockly e não faz parte do que o bloco significa;
     * compará-lo faria dois pinMode(13, OUTPUT) parecerem diferentes.
     */
    function chaveEstrutural(b) {
        const limpo = clonar(b);
        (function tira(n) {
            if (!n || typeof n !== 'object') return;
            delete n.id;
            delete n.x;
            delete n.y;
            // O comentário é documentação, não estrutura: dois pinMode iguais
            // continuam sendo a MESMA declaração ainda que só um deles esteja
            // comentado. Sem tirar os ícones daqui, comentar um bloco fazia a
            // dedução de declarações falhar e o pinMode aparecia duas vezes no
            // setup depois de trocar de modo.
            delete n.icons;
            Object.keys(n).forEach(k => tira(n[k]));
        })(limpo);
        return JSON.stringify(limpo);
    }

    /** Reconstrói uma corrente a partir de uma lista, devolvendo o primeiro. */
    function encadear(lista) {
        if (!lista.length) return null;
        for (let i = 0; i < lista.length - 1; i++) {
            lista[i].next = { block: lista[i + 1] };
        }
        delete lista[lista.length - 1].next;
        return lista[0];
    }

    /** Todos os blocos de um estado, em profundidade. */
    function todos(no, saida) {
        saida = saida || [];
        if (!no) return saida;
        saida.push(no);
        Object.keys(no.inputs || {}).forEach(k => {
            const i = no.inputs[k];
            if (i.block) todos(i.block, saida);
            if (i.shadow) todos(i.shadow, saida);
        });
        if (no.next && no.next.block) todos(no.next.block, saida);
        return saida;
    }

    /* ------------------------------------------------------------------ */
    /* Abstrato → Literal                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Expansão de um bloco abstrato. Devolve
     *   { corpo: [blocos que ficam no lugar], setup: [blocos para o Ao iniciar] }
     * ou null quando o bloco não é abstrato.
     */
    function expandir(b, ctx) {
        const f = b.fields || {};
        const ent = b.inputs || {};
        const mover = k => (ent[k] && (ent[k].block || ent[k].shadow)) || null;

        switch (b.type) {

            case 'abs_escrita_digital':
                return {
                    setup: [{ type: 'ard_pinmode', fields: { PIN: f.PIN, MODO: 'OUTPUT' } }],
                    corpo: [{
                        type: 'ard_digitalwrite', fields: { PIN: f.PIN },
                        inputs: { VALOR: { block: konst(f.VALOR) } }
                    }]
                };

            case 'abs_leitura_digital':
                return {
                    setup: [{ type: 'ard_pinmode', fields: { PIN: f.PIN, MODO: 'INPUT' } }],
                    corpo: [{ type: 'ard_digitalread', fields: { PIN: f.PIN } }]
                };

            case 'abs_botao':
                return {
                    setup: [{ type: 'ard_pinmode', fields: { PIN: f.PIN, MODO: 'INPUT_PULLUP' } }],
                    corpo: [{
                        type: 'logic_compare', fields: { OP: 'EQ' },
                        inputs: {
                            A: { block: { type: 'ard_digitalread', fields: { PIN: f.PIN } } },
                            B: { block: konst('LOW') }
                        }
                    }]
                };

            case 'abs_escrita_analogica':
                return {
                    setup: [],
                    corpo: [{
                        type: 'ard_analogwrite', fields: { PIN: f.PIN },
                        inputs: {
                            VALOR: {
                                block: {
                                    type: 'ard_map',
                                    inputs: {
                                        VALOR: { block: mover('PCT') || num(0) },
                                        DE_MIN: { block: num(0) }, DE_MAX: { block: num(100) },
                                        PARA_MIN: { block: num(0) }, PARA_MAX: { block: num(255) }
                                    }
                                }
                            }
                        }
                    }]
                };

            case 'abs_leitura_analogica':
                return {
                    setup: [],
                    corpo: [{
                        type: 'ard_map',
                        inputs: {
                            VALOR: { block: { type: 'ard_analogread', fields: { PIN: f.PIN } } },
                            DE_MIN: { block: num(0) }, DE_MAX: { block: num(1023) },
                            PARA_MIN: { block: num(0) }, PARA_MAX: { block: num(100) }
                        }
                    }]
                };

            case 'abs_nota':
                return {
                    setup: [],
                    corpo: [{
                        type: 'ard_tone_dur', fields: { PIN: f.PIN },
                        inputs: {
                            FREQ: { block: mover('FREQ') || num(440) },
                            DUR: { block: mover('DUR') || num(500) }
                        }
                    }]
                };

            case 'abs_esperar': {
                const q = mover('QTD') || num(1);
                const ms = f.UNI === 'ms' ? q : {
                    type: 'ard_arith', fields: { OP: '*' },
                    inputs: { A: { block: q }, B: { block: num(1000) } }
                };
                return { setup: [], corpo: [{ type: 'ard_delay', inputs: { MS: { block: ms } } }] };
            }

            case 'abs_tempo_ligado':
                if (f.UNI === 'ms') {
                    return { setup: [], corpo: [{ type: 'ard_millis' }] };
                }
                return {
                    setup: [], corpo: [{
                        type: 'ard_arith', fields: { OP: '/' },
                        inputs: { A: { block: { type: 'ard_millis' } }, B: { block: num(1000) } }
                    }]
                };

            case 'abs_mostrar':
            case 'abs_mostrar_grafico': {
                const sep = b.type === 'abs_mostrar' ? ': ' : ':';
                return {
                    setup: [{ type: 'ard_serial_begin', fields: { PORTA: 'Serial', BAUD: '9600' } }],
                    corpo: [
                        {
                            type: 'ard_serial_print', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: txt(String(f.ROTULO || '') + sep) } }
                        },
                        {
                            type: 'ard_serial_println', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: mover('VALOR') || num(0) } }
                        }
                    ]
                };
            }

            case 'abs_mostrar_reticulado':
                return {
                    setup: [{ type: 'ard_serial_begin', fields: { PORTA: 'Serial', BAUD: '9600' } }],
                    corpo: [
                        {
                            type: 'ard_serial_print', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: txt('mu:') } }
                        },
                        {
                            type: 'ard_serial_print', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: mover('MU') || num(0.5) } }
                        },
                        {
                            type: 'ard_serial_print', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: txt(' lambda:') } }
                        },
                        {
                            type: 'ard_serial_println', fields: { PORTA: 'Serial' },
                            inputs: { VALOR: { block: mover('LAMBDA') || num(0.5) } }
                        }
                    ]
                };

            case 'abs_se':
                return {
                    setup: [], corpo: [{
                        type: 'controls_if',
                        inputs: {
                            IF0: ent.COND || undefined,
                            DO0: ent.ENTAO || undefined
                        }
                    }]
                };

            case 'abs_repetir':
                return {
                    setup: [], corpo: [{
                        type: 'ard_for',
                        fields: { VAR: 'i', CMP: '<', OP: '+=' },
                        inputs: {
                            INICIO: { block: num(0) },
                            LIMITE: ent.VEZES || { block: num(10) },
                            PASSO: { block: num(1) },
                            BODY: ent.BODY || undefined
                        }
                    }]
                };

            case 'abs_enquanto':
                return {
                    setup: [], corpo: [{
                        type: 'ard_while',
                        inputs: { COND: ent.COND || undefined, BODY: ent.BODY || undefined }
                    }]
                };

            case 'abs_comparar':
                return {
                    setup: [], corpo: [{
                        type: 'logic_compare', fields: { OP: f.OP },
                        inputs: { A: ent.A || undefined, B: ent.B || undefined }
                    }]
                };

            case 'abs_logico':
                return {
                    setup: [], corpo: [{
                        type: 'logic_operation', fields: { OP: f.OP },
                        inputs: { A: ent.A || undefined, B: ent.B || undefined }
                    }]
                };

            case 'abs_conta':
                return {
                    setup: [], corpo: [{
                        type: 'ard_arith', fields: { OP: f.OP },
                        inputs: { A: ent.A || undefined, B: ent.B || undefined }
                    }]
                };

            case 'abs_mapear':
                return {
                    setup: [], corpo: [{
                        type: 'ard_map',
                        inputs: {
                            VALOR: ent.VALOR || undefined, DE_MIN: ent.DE_MIN || undefined,
                            DE_MAX: ent.DE_MAX || undefined, PARA_MIN: ent.PARA_MIN || undefined,
                            PARA_MAX: ent.PARA_MAX || undefined
                        }
                    }]
                };

            case 'abs_sorteio':
                return {
                    setup: [], corpo: [{
                        type: 'ard_random',
                        inputs: { MIN: ent.MIN || undefined, MAX: ent.MAX || undefined }
                    }]
                };

            case 'abs_criar':
                return {
                    setup: [], corpo: [{
                        type: 'ard_var_global',
                        fields: { QUAL: '', TIPO: 'float', VAR: f.VAR },
                        inputs: { VALOR: ent.VALOR || undefined }
                    }]
                };

            case 'abs_definir':
                return {
                    setup: [], corpo: [{
                        type: 'variables_set', fields: { VAR: f.VAR },
                        inputs: { VALUE: ent.VALOR || undefined }
                    }]
                };

            case 'abs_ler':
                return { setup: [], corpo: [{ type: 'variables_get', fields: { VAR: f.VAR } }] };

            case 'abs_evidencia':
                return {
                    setup: [], corpo: [{
                        type: 'lp_evidencia', fields: { FUNC: 'LIN' },
                        inputs: {
                            X: ent.X || undefined, A1: ent.A1 || undefined,
                            A2: ent.A2 || undefined
                        }
                    }]
                };

            case 'abs_grau': {
                const MAPA = { GC: 'GC', GCT: 'GCT', PHI: 'PHI', GCR: 'GCR', MUER: 'MUER' };
                return {
                    setup: [], corpo: [{
                        type: 'lp_grau', fields: { GRAU: MAPA[f.GRAU] || 'GC' },
                        inputs: {
                            MU: ent.MU1 || undefined,
                            LAMBDA: { block: complemento(ent.MU2) }
                        }
                    }]
                };
            }

            case 'abs_contradicao':
                return {
                    setup: [], corpo: [{
                        type: 'lp_indefinicao',
                        inputs: {
                            MU: ent.MU1 || undefined,
                            LAMBDA: { block: complemento(ent.MU2) }
                        }
                    }]
                };

            case 'abs_combinar':
                return {
                    setup: [], corpo: [{
                        type: 'lp_conectivo', fields: { OP: f.OP },
                        inputs: { A: ent.A || undefined, B: ent.B || undefined }
                    }]
                };

            case 'abs_quando_estado':
                return {
                    setup: [], corpo: [{
                        type: 'lp_para_analisador',
                        fields: {
                            MODO: 'COMPL', RES: '12',
                            C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5'
                        },
                        inputs: {
                            MU: ent.MU1 || undefined,
                            LAMBDA: ent.MU2 || undefined,
                            CASOS: ent.CASOS ? { block: converterCasos(ent.CASOS.block, 'lp_caso') } : undefined
                        }
                    }]
                };

            default:
                return null;
        }
    }

    /** `1.0 - x` como bloco, para os graus abstratos que usam o complemento. */
    function complemento(entrada) {
        const alvo = (entrada && (entrada.block || entrada.shadow)) || num(0.5);
        return { type: 'lp_complemento', inputs: { MU: { block: alvo } } };
    }

    /** Troca abs_caso_estado ↔ lp_caso na corrente de casos. */
    function converterCasos(primeiro, destino) {
        const de = destino === 'lp_caso' ? 'abs_caso_estado' : 'abs_caso_estado';
        const lista = corrente(primeiro).map(c => {
            const novo = clonar(c);
            if (c.type === 'abs_caso_estado' && destino === 'lp_caso') novo.type = 'lp_caso';
            else if (c.type === 'lp_caso' && destino === de) novo.type = 'abs_caso_estado';
            else if (c.type === 'lp_senao') novo.type = 'lp_senao';
            delete novo.next;
            return novo;
        });
        return encadear(lista);
    }

    /* ------------------------------------------------------------------ */
    /* Literal → Abstrato: reconhecimento de padrão                         */
    /* ------------------------------------------------------------------ */

    /**
     * Tenta reconhecer um bloco literal (e o que vem depois dele) como um bloco
     * abstrato. Devolve { bloco, consumidos, consome } ou null.
     *
     * `setupChaves` diz quais declarações existem no Ao iniciar. Um digitalWrite
     * só vira "escrita digital" se o pinMode de saída estiver lá — do contrário
     * o bloco abstrato acrescentaria uma linha que o programa não tinha.
     *
     * A declaração NÃO é retirada do Ao iniciar: ela fica onde estava, e o
     * gerador deixa de injetar o que já está escrito (ver finish()). Retirá-la
     * daqui mudaria a ordem das linhas no setup — mesmo conteúdo, texto
     * diferente, e a promessa é texto idêntico.
     */
    function reconhecer(b, seguintes, setupChaves) {
        const f = b.fields || {};
        const ent = b.inputs || {};
        const dentro = k => (ent[k] && (ent[k].block || ent[k].shadow)) || null;

        function valorConst(k) {
            const v = dentro(k);
            return v && v.type === 'ard_const' ? v.fields.CONST : null;
        }

        if (b.type === 'ard_digitalwrite') {
            const nivel = valorConst('VALOR');
            if (nivel !== 'HIGH' && nivel !== 'LOW') return null;
            if (!setupChaves['pin:' + f.PIN + ':OUTPUT']) return null;
            return {
                bloco: {
                    type: 'abs_escrita_digital',
                    fields: { PIN: f.PIN, VALOR: nivel }
                },
                consumidos: 1, consome: ['pin:' + f.PIN + ':OUTPUT']
            };
        }

        if (b.type === 'ard_digitalread' && setupChaves['pin:' + f.PIN + ':INPUT']) {
            return {
                bloco: { type: 'abs_leitura_digital', fields: { PIN: f.PIN } },
                consumidos: 1, consome: ['pin:' + f.PIN + ':INPUT']
            };
        }

        // digitalRead(P) == LOW com pull-up é o bloco "botão apertado?"
        if (b.type === 'logic_compare' && f.OP === 'EQ') {
            const a = dentro('A');
            const bb = dentro('B');
            if (a && a.type === 'ard_digitalread' && bb && bb.type === 'ard_const' &&
                bb.fields.CONST === 'LOW' &&
                setupChaves['pin:' + a.fields.PIN + ':INPUT_PULLUP']) {
                return {
                    bloco: { type: 'abs_botao', fields: { PIN: a.fields.PIN } },
                    consumidos: 1, consome: ['pin:' + a.fields.PIN + ':INPUT_PULLUP']
                };
            }
        }

        // map(analogRead(P), 0, 1023, 0, 100) é a leitura analógica em %
        if (b.type === 'ard_map') {
            const v = dentro('VALOR');
            const lim = ['DE_MIN', 'DE_MAX', 'PARA_MIN', 'PARA_MAX'].map(k => {
                const x = dentro(k);
                return x && x.type === 'ard_number' ? Number(x.fields.NUM) : null;
            });
            if (v && v.type === 'ard_analogread' && String(lim) === '0,1023,0,100') {
                return {
                    bloco: { type: 'abs_leitura_analogica', fields: { PIN: v.fields.PIN } },
                    consumidos: 1, consome: []
                };
            }
        }

        if (b.type === 'ard_millis') {
            return {
                bloco: { type: 'abs_tempo_ligado', fields: { UNI: 'ms' } },
                consumidos: 1, consome: []
            };
        }

        if (b.type === 'ard_delay') {
            const ms = dentro('MS');
            if (!ms) return null;
            if (ms.type === 'ard_arith' && ms.fields && ms.fields.OP === '*') {
                const bb = (ms.inputs && ms.inputs.B &&
                    (ms.inputs.B.block || ms.inputs.B.shadow)) || null;
                if (bb && bb.type === 'ard_number' && Number(bb.fields.NUM) === 1000) {
                    return {
                        bloco: {
                            type: 'abs_esperar', fields: { UNI: 's' },
                            inputs: { QTD: ms.inputs.A }
                        },
                        consumidos: 1, consome: []
                    };
                }
            }
            return {
                bloco: {
                    type: 'abs_esperar', fields: { UNI: 'ms' },
                    inputs: { QTD: ent.MS }
                },
                consumidos: 1, consome: []
            };
        }

        if (b.type === 'ard_analogwrite') {
            const m = dentro('VALOR');
            if (m && m.type === 'ard_map') {
                const lim = ['DE_MIN', 'DE_MAX', 'PARA_MIN', 'PARA_MAX'].map(k => {
                    const v = m.inputs && m.inputs[k] &&
                        (m.inputs[k].block || m.inputs[k].shadow);
                    return v && v.type === 'ard_number' ? Number(v.fields.NUM) : null;
                });
                if (String(lim) === '0,100,0,255') {
                    return {
                        bloco: {
                            type: 'abs_escrita_analogica', fields: { PIN: f.PIN },
                            inputs: { PCT: m.inputs.VALOR }
                        },
                        consumidos: 1, consome: []
                    };
                }
            }
            return null;
        }

        if (b.type === 'ard_tone_dur') {
            return {
                bloco: {
                    type: 'abs_nota', fields: { PIN: f.PIN },
                    inputs: { FREQ: ent.FREQ, DUR: ent.DUR }
                },
                consumidos: 1, consome: []
            };
        }

        if (b.type === 'ard_while') {
            return {
                bloco: {
                    type: 'abs_enquanto',
                    inputs: { COND: ent.COND, BODY: ent.BODY }
                },
                consumidos: 1, consome: []
            };
        }

        if (b.type === 'variables_set') {
            return {
                bloco: {
                    type: 'abs_definir', fields: { VAR: f.VAR },
                    inputs: { VALOR: ent.VALUE }
                },
                consumidos: 1, consome: []
            };
        }

        /* Os blocos de mostrar só podem nascer se o Serial.begin(9600) estiver
           no Ao iniciar: é ele que o bloco abstrato passa a injetar. Sem essa
           checagem a linha apareceria duas vezes no C++. */
        const TEM_SERIAL = !!setupChaves['serial:9600'];

        // Serial.print("mu:") … Serial.println(lam)  →  mostrar no reticulado
        if (TEM_SERIAL && b.type === 'ard_serial_print' && seguintes.length >= 3) {
            const rot = dentro('VALOR');
            const s2 = seguintes[0], s3 = seguintes[1], s4 = seguintes[2];
            const textoDe = x => {
                const v = x && x.inputs && x.inputs.VALOR &&
                    (x.inputs.VALOR.block || x.inputs.VALOR.shadow);
                return v && v.type === 'ard_text' ? String(v.fields.TEXTO) : null;
            };
            if (rot && rot.type === 'ard_text' && rot.fields.TEXTO === 'mu:' &&
                s2 && s2.type === 'ard_serial_print' && textoDe(s2) === null &&
                s3 && s3.type === 'ard_serial_print' && textoDe(s3) === ' lambda:' &&
                s4 && s4.type === 'ard_serial_println') {
                return {
                    bloco: {
                        type: 'abs_mostrar_reticulado',
                        inputs: {
                            MU: s2.inputs && s2.inputs.VALOR,
                            LAMBDA: s4.inputs && s4.inputs.VALOR
                        }
                    },
                    consumidos: 4, consome: ['serial:9600']
                };
            }
        }

        // Serial.print("rot: ") + Serial.println(v)  →  mostrar
        if (TEM_SERIAL && b.type === 'ard_serial_print' && seguintes[0] &&
            seguintes[0].type === 'ard_serial_println') {
            const rot = dentro('VALOR');
            if (rot && rot.type === 'ard_text') {
                const t = String(rot.fields.TEXTO || '');
                const comEspaco = /: $/.test(t);
                const grafico = !comEspaco && /:$/.test(t);
                if (comEspaco || grafico) {
                    return {
                        bloco: {
                            type: grafico ? 'abs_mostrar_grafico' : 'abs_mostrar',
                            fields: { ROTULO: t.replace(/:\s?$/, '') },
                            inputs: { VALOR: seguintes[0].inputs && seguintes[0].inputs.VALOR }
                        },
                        consumidos: 2, consome: ['serial:9600']
                    };
                }
            }
        }

        return null;
    }

    /* ------------------------------------------------------------------ */
    /* Motor                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Converte um estado serializado inteiro.
     * `destino` é 'abstrato' ou 'literal'.
     */
    function converter(estado, destino) {
        const e = clonar(estado || {});
        const mantidos = [];
        let convertidos = 0;

        const blocos = (e.blocks && e.blocks.blocks) || [];

        /* --- Ao iniciar / Sempre ↔ setup / loop --- */
        const TOPO = destino === 'abstrato'
            ? { ard_setup: 'abs_ao_iniciar', ard_loop: 'abs_sempre' }
            : { abs_ao_iniciar: 'ard_setup', abs_sempre: 'ard_loop' };

        /* Declarações disponíveis no Ao iniciar, para o reconhecimento poder
           saber se pode "adotar" uma delas. */
        function chaveSetup(x) {
            if (x.type === 'ard_pinmode') {
                return 'pin:' + x.fields.PIN + ':' + x.fields.MODO;
            }
            if (x.type === 'ard_serial_begin' &&
                (x.fields.PORTA || 'Serial') === 'Serial') {
                return 'serial:' + x.fields.BAUD;
            }
            return null;
        }

        const setupChaves = {};
        if (destino === 'abstrato') {
            blocos.forEach(t => {
                if (t.type !== 'ard_setup') return;
                const corpo = t.inputs && t.inputs.BODY && t.inputs.BODY.block;
                corrente(corpo).forEach(x => {
                    const k = chaveSetup(x);
                    if (k) setupChaves[k] = true;
                });
            });
        }

        const setupExtra = [];

        /**
         * Leva o comentário do bloco original para o que tomou o lugar dele.
         *
         * Sem isto, trocar de modo apagaria em silêncio o que o aluno escreveu
         * no balão do bloco — e o comentário é justamente o que explica a
         * ligação e a intenção, a parte que nenhum dos dois modos deduz.
         * Quando um bloco abstrato vira vários literais, o comentário fica no
         * primeiro: é a linha que descreve a sequência inteira.
         */
        function herdarComentario(origens, alvo) {
            if (!alvo) return alvo;
            const lista = Array.isArray(origens) ? origens : [origens];
            const achados = lista
                .map(o => o && o.icons && o.icons.comment)
                .filter(c => c && String(c.text || '').trim());
            if (!achados.length) return alvo;
            if (alvo.icons && alvo.icons.comment) return alvo;

            // Vários blocos literais podem virar um só abstrato (o par
            // print + println vira "mostrar"). Ficar só com o primeiro
            // comentário jogaria fora o resto: junta todos, na ordem.
            const texto = achados.map(c => String(c.text)).join('\n');
            const base = Object.assign({}, achados[0], { text: texto });
            alvo.icons = Object.assign({}, alvo.icons, { comment: base });
            return alvo;
        }

        /** Converte uma corrente de comandos. */
        function pilha(primeiro) {
            const lista = corrente(primeiro);
            const fora = [];
            for (let i = 0; i < lista.length; i++) {
                const b = lista[i];
                let feito = null;

                if (destino === 'literal') {
                    const exp = expandir(b, null);
                    if (exp) {
                        convertidos++;
                        exp.setup.forEach(s => setupExtra.push(s));
                        exp.corpo.forEach((c, k) => {
                            fora.push(recursivo(k === 0 ? herdarComentario(b, c) : c));
                        });
                        feito = true;
                    }
                } else {
                    const r = reconhecer(b, lista.slice(i + 1), setupChaves);
                    if (r) {
                        convertidos++;
                        /* nada a consumir: ver o comentário em reconhecer() */
                        fora.push(recursivo(
                            herdarComentario(lista.slice(i, i + r.consumidos), r.bloco)));
                        i += r.consumidos - 1;
                        feito = true;
                    }
                }

                if (!feito) {
                    if (destino === 'literal' && SEM_LITERAL[b.type]) {
                        mantidos.push({ tipo: b.type, motivo: SEM_LITERAL[b.type] });
                    } else if (destino === 'abstrato' && SEM_ABSTRATO[b.type]) {
                        mantidos.push({ tipo: b.type, motivo: SEM_ABSTRATO[b.type] });
                    } else if (destino === 'abstrato' && b.type.indexOf('ard_') === 0) {
                        mantidos.push({
                            tipo: b.type,
                            motivo: 'não há bloco simplificado para este comando'
                        });
                    }
                    const copia = clonar(b);
                    delete copia.next;
                    fora.push(recursivo(copia));
                }
            }
            return encadear(fora);
        }

        /** Desce nas entradas de um bloco já convertido. */
        function recursivo(b) {
            Object.keys(b.inputs || {}).forEach(k => {
                const i = b.inputs[k];
                if (!i) { delete b.inputs[k]; return; }
                if (i.block) {
                    // entrada de pilha ou de valor: os dois se resolvem por pilha()
                    i.block = pilha(i.block);
                }
                if (i.shadow) i.shadow = pilha(i.shadow);
            });
            return b;
        }

        /* --- percorre os blocos de topo --- */
        const novosTopo = blocos.map(t => {
            const copia = clonar(t);
            const alvo = TOPO[copia.type];
            if (alvo) copia.type = alvo;
            const nomeCorpo = 'BODY';
            if (copia.inputs && copia.inputs[nomeCorpo] && copia.inputs[nomeCorpo].block) {
                copia.inputs[nomeCorpo].block = pilha(copia.inputs[nomeCorpo].block);
            }
            return copia;
        });

        /* --- o que o abstrato injetava vai para o setup literal --- */
        if (destino === 'literal' && setupExtra.length) {
            let setup = novosTopo.find(t => t.type === 'ard_setup');
            if (!setup) {
                setup = { type: 'ard_setup', x: 40, y: 40 };
                novosTopo.unshift(setup);
            }
            const antigos = (setup.inputs && setup.inputs.BODY && setup.inputs.BODY.block)
                ? corrente(setup.inputs.BODY.block).map(x => {
                    const c = clonar(x); delete c.next; return c;
                }) : [];

            /* Só entra o que ainda não está no Ao iniciar. O bloco literal que
               ficou lá durante a conversão para abstrato continua declarando o
               que precisa; acrescentar de novo daria a linha em dobro. */
            const dedup = [];
            const vistos = {};
            antigos.forEach(x => { vistos[chaveEstrutural(x)] = true; });
            setupExtra.forEach(s => {
                const chave = chaveEstrutural(s);
                if (vistos[chave]) return;
                vistos[chave] = true;
                dedup.push(clonar(s));
            });
            setup.inputs = setup.inputs || {};
            setup.inputs.BODY = { block: encadear(dedup.concat(antigos)) };
        }

        e.blocks = e.blocks || {};
        e.blocks.blocks = novosTopo;
        return { estado: e, convertidos: convertidos, mantidos: mantidos };
    }

    const Converter = {
        SEM_ABSTRATO: SEM_ABSTRATO,
        SEM_LITERAL: SEM_LITERAL,
        paraAbstrato: estado => converter(estado, 'abstrato'),
        paraLiteral: estado => converter(estado, 'literal'),

        /** Tipos que pertencem a cada modo, para a validação avisar. */
        eAbstrato: tipo => String(tipo).indexOf('abs_') === 0,
        eLiteral: tipo => String(tipo).indexOf('ard_') === 0
    };

    global.Converter = Converter;
    if (typeof module !== 'undefined' && module.exports) module.exports = Converter;

})(typeof window !== 'undefined' ? window : global);
