'use strict';
/**
 * forBlock da categoria LÓGICA PARACONSISTENTE (LPA2v).
 *
 * Cada bloco puxa para o sketch só as funções C++ de que precisa, via
 * precisa(gen, nome). Como finish() emite as globais na ordem em que foram
 * inseridas, a resolução de dependências é recursiva: quem é chamado entra
 * antes de quem chama, e o .ino sai com definição antes do uso — sem precisar
 * de protótipos.
 *
 * As funções levam os nomes das grandezas da aula (lpaGc, lpaGct, lpaEstado),
 * então o aluno lê no painel de código exatamente as equações da LPA2v.
 */
(function (global) {

    const A = global.ArduinoGen;
    if (!A) return;

    /* ------------------------------------------------------------------ */
    /* Runtime C++                                                         */
    /* ------------------------------------------------------------------ */

    const RT = {

        enum: {
            deps: [],
            codigo:
                '// Estados do reticulado da LPA2v\n' +
                'enum LpaEstado {\n' +
                '  LPA_V, LPA_F, LPA_T, LPA_PC,\n' +
                '  LPA_QVT, LPA_QVPC, LPA_QFT, LPA_QFPC,\n' +
                '  LPA_TV, LPA_TF, LPA_PCV, LPA_PCF\n' +
                '};'
        },

        lpaEvidencia: {
            deps: [],
            codigo:
                '// Grau de Evidencia: leitura -> [0,1] no Universo de Discurso [a1,a2].\n' +
                '// fn: 0 linear crescente, 1 linear decrescente, 2 funcao S, 3 funcao Z\n' +
                'float lpaEvidencia(float x, float a1, float a2, byte fn) {\n' +
                '  if (a2 == a1) return 0.5;\n' +
                '  float t = (x - a1) / (a2 - a1);\n' +
                '  if (t < 0) t = 0;\n' +
                '  if (t > 1) t = 1;\n' +
                '  if (fn == 1) return 1.0 - t;\n' +
                '  if (fn == 2) return (t <= 0.5) ? (2.0 * t * t)\n' +
                '                                 : (1.0 - 2.0 * (1.0 - t) * (1.0 - t));\n' +
                '  if (fn == 3) return (t <= 0.5) ? (1.0 - 2.0 * t * t)\n' +
                '                                 : (2.0 * (1.0 - t) * (1.0 - t));\n' +
                '  return t;\n' +
                '}'
        },

        lpaGc: {
            deps: [],
            codigo:
                '// Grau de Certeza\n' +
                'float lpaGc(float mu, float lam) { return mu - lam; }'
        },

        lpaGct: {
            deps: [],
            codigo:
                '// Grau de Contradicao\n' +
                'float lpaGct(float mu, float lam) { return mu + lam - 1.0; }'
        },

        lpaPhi: {
            deps: [],
            codigo:
                '// Intervalo de Certeza (= Intervalo de Evidencia)\n' +
                'float lpaPhi(float gct) { return 1.0 - fabs(gct); }'
        },

        lpaD: {
            deps: [],
            codigo:
                '// Distancia do estado ao vertice de certeza maxima\n' +
                'float lpaD(float gc, float gct) {\n' +
                '  float a = 1.0 - fabs(gc);\n' +
                '  return sqrt(a * a + gct * gct);\n' +
                '}'
        },

        lpaIndefinido: {
            deps: ['lpaGc', 'lpaGct', 'lpaPhi', 'lpaD'],
            codigo:
                '// A analise nao conclui quando a contradicao come toda a certeza.\n' +
                'bool lpaIndefinido(float mu, float lam) {\n' +
                '  float gct = lpaGct(mu, lam);\n' +
                '  if (lpaPhi(gct) <= 0.25) return true;\n' +
                '  return lpaD(lpaGc(mu, lam), gct) > 1.0;\n' +
                '}'
        },

        lpaGcr: {
            deps: ['lpaGc', 'lpaGct', 'lpaD', 'lpaIndefinido'],
            codigo:
                '// Grau de Certeza Real: a certeza ja descontado o efeito da contradicao.\n' +
                'float lpaGcr(float mu, float lam) {\n' +
                '  if (lpaIndefinido(mu, lam)) return 0.0;\n' +
                '  float gc = lpaGc(mu, lam);\n' +
                '  float d = lpaD(gc, lpaGct(mu, lam));\n' +
                '  if (gc > 0) return 1.0 - d;\n' +
                '  if (gc < 0) return d - 1.0;\n' +
                '  return 0.0;\n' +
                '}'
        },

        lpaMuEr: {
            deps: ['lpaGcr'],
            codigo:
                '// Grau de Evidencia Resultante Real, normalizado em [0,1]\n' +
                'float lpaMuEr(float mu, float lam) { return (lpaGcr(mu, lam) + 1.0) / 2.0; }'
        },

        lpaEstado: {
            deps: ['enum', 'lpaGc', 'lpaGct'],
            codigo:
                '// Para-Analisador: reticulado em 12 regioes.\n' +
                '// c1=Vscc  c2=Vicc  c3=Vscct  c4=Vicct\n' +
                'int lpaEstado(float mu, float lam, float c1, float c2, float c3, float c4) {\n' +
                '  float gc = lpaGc(mu, lam);\n' +
                '  float gct = lpaGct(mu, lam);\n' +
                '  if (gc >= c1) return LPA_V;\n' +
                '  if (gc <= c2) return LPA_F;\n' +
                '  if (gct >= c3) return LPA_T;\n' +
                '  if (gct <= c4) return LPA_PC;\n' +
                '  // As quatro faixas do algoritmo, na mesma ordem: elas se tocam\n' +
                '  // em Gc=0 e Gct=0, e quem vem antes decide o empate.\n' +
                '  if (gc >= 0 && gct >= 0) return (gc >= gct) ? LPA_QVT : LPA_TV;\n' +
                '  if (gc >= 0 && gct <= 0) return (gc >= fabs(gct)) ? LPA_QVPC : LPA_PCV;\n' +
                '  if (gc <= 0 && gct <= 0) return (fabs(gc) >= fabs(gct)) ? LPA_QFPC : LPA_PCF;\n' +
                '  return (fabs(gc) >= gct) ? LPA_QFT : LPA_TF;\n' +
                '}'
        },

        lpaEstado4: {
            deps: ['enum', 'lpaGc', 'lpaGct'],
            codigo:
                '// Reticulado em 4 regioes: o vertice mais proximo do estado.\n' +
                '// E o mesmo que colapsar os 12 estados no vertice de cada um.\n' +
                'int lpaEstado4(float mu, float lam) {\n' +
                '  float gc = lpaGc(mu, lam);\n' +
                '  float gct = lpaGct(mu, lam);\n' +
                '  if (fabs(gc) >= fabs(gct)) return (gc >= 0) ? LPA_V : LPA_F;\n' +
                '  return (gct > 0) ? LPA_T : LPA_PC;\n' +
                '}'
        },

        lpaNomeEstado: {
            deps: ['enum'],
            codigo:
                '// Nome do estado, para o monitor serial\n' +
                'const char *lpaNomeEstado(int e) {\n' +
                '  switch (e) {\n' +
                '    case LPA_V: return "V";\n' +
                '    case LPA_F: return "F";\n' +
                '    case LPA_T: return "T";\n' +
                '    case LPA_PC: return "Indeterminado";\n' +
                '    case LPA_QVT: return "Qv->T";\n' +
                '    case LPA_QVPC: return "Qv->Indet";\n' +
                '    case LPA_QFT: return "Qf->T";\n' +
                '    case LPA_QFPC: return "Qf->Indet";\n' +
                '    case LPA_TV: return "T->v";\n' +
                '    case LPA_TF: return "T->f";\n' +
                '    case LPA_PCV: return "Indet->v";\n' +
                '    case LPA_PCF: return "Indet->f";\n' +
                '  }\n' +
                '  return "?";\n' +
                '}'
        },

        lpaConectivo: {
            deps: [],
            codigo:
                '// Conectivos da LPA2v: OR maximiza, AND minimiza.\n' +
                'float lpaMax(float a, float b) { return (a > b) ? a : b; }\n' +
                'float lpaMin(float a, float b) { return (a < b) ? a : b; }'
        },

        lpaExtractor: {
            deps: ['lpaMuEr'],
            codigo:
                '// ParaExtrctr: reduz n Graus de Evidencia sobre a MESMA proposicao\n' +
                '// a um unico grau resultante, extraindo os efeitos da contradicao.\n' +
                '// Trabalha sobre uma copia, entao o vetor de origem nao e alterado.\n' +
                '#define LPA_EXTRACTOR_MAX 16\n' +
                'float lpaExtractor(const float *g, byte n) {\n' +
                '  if (n == 0) return 0.5;\n' +
                '  if (n > LPA_EXTRACTOR_MAX) n = LPA_EXTRACTOR_MAX;\n' +
                '  float v[LPA_EXTRACTOR_MAX];\n' +
                '  for (byte i = 0; i < n; i++) v[i] = g[i];\n' +
                '  while (n > 1) {\n' +
                '    byte iMax = 0, iMin = 0;\n' +
                '    for (byte i = 1; i < n; i++) {\n' +
                '      if (v[i] > v[iMax]) iMax = i;\n' +
                '      if (v[i] < v[iMin]) iMin = i;\n' +
                '    }\n' +
                '    if (iMax == iMin) iMin = (iMax == 0) ? 1 : 0;\n' +
                '    float r = lpaMuEr(v[iMax], 1.0 - v[iMin]);\n' +
                '    byte alto = (iMax > iMin) ? iMax : iMin;\n' +
                '    byte baixo = (iMax > iMin) ? iMin : iMax;\n' +
                '    v[alto] = v[n - 1]; n--;\n' +
                '    v[baixo] = v[n - 1]; n--;\n' +
                '    v[n] = r; n++;\n' +
                '  }\n' +
                '  return v[0];\n' +
                '}'
        }
    };

    /** Insere a função pedida e, antes dela, tudo de que ela depende. */
    function precisa(gen, nome) {
        const item = RT[nome];
        if (!item) return;
        const chave = 'lpa:' + nome;
        if (gen.temGlobal(chave)) return;
        item.deps.forEach(d => precisa(gen, d));
        gen.usarGlobal(chave, item.codigo);
    }

    /**
     * Publicada no gerador para o Modo Abstrato usar o MESMO runtime.
     * Duas cópias das funções lpa* seriam duas coisas para manter em sincronia,
     * e a primeira divergência apareceria como diferença de C++ entre um modo e
     * o outro — exatamente o que a conversão promete não fazer.
     */
    A.lpaPrecisa = function (nome) {
        precisa(A, nome);
    };

    /* ------------------------------------------------------------------ */
    /* Evidência                                                           */
    /* ------------------------------------------------------------------ */

    const FUNC_VALORACAO = { LIN: '0', LINI: '1', S: '2', Z: '3' };

    A.forBlock['lp_evidencia'] = function (block, gen) {
        precisa(gen, 'lpaEvidencia');
        const x = gen.valorOu(block, 'X', gen.ORDER_COMMA, '0');
        const a1 = gen.valorOu(block, 'A1', gen.ORDER_COMMA, '0');
        const a2 = gen.valorOu(block, 'A2', gen.ORDER_COMMA, '1023');
        const fn = FUNC_VALORACAO[block.getFieldValue('FUNC')] || '0';
        return ['lpaEvidencia(' + x + ', ' + a1 + ', ' + a2 + ', ' + fn + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['lp_complemento'] = function (block, gen) {
        return ['1.0 - ' + gen.valorOu(block, 'MU', gen.ORDER_ADDITIVE, '0.5'),
            gen.ORDER_ADDITIVE];
    };

    /* ------------------------------------------------------------------ */
    /* Análise                                                             */
    /* ------------------------------------------------------------------ */

    /** μ e λ de um bloco, já com o padrão de indefinição (0,5) nas entradas vazias. */
    function anotacao(block, gen) {
        return {
            mu: gen.valorOu(block, 'MU', gen.ORDER_COMMA, '0.5'),
            lam: gen.valorOu(block, 'LAMBDA', gen.ORDER_COMMA, '0.5')
        };
    }

    A.forBlock['lp_grau'] = function (block, gen) {
        const a = anotacao(block, gen);
        const grau = block.getFieldValue('GRAU');

        if (grau === 'GC') {
            precisa(gen, 'lpaGc');
            return ['lpaGc(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'GCT') {
            precisa(gen, 'lpaGct');
            return ['lpaGct(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'PHI') {
            precisa(gen, 'lpaGct');
            precisa(gen, 'lpaPhi');
            return ['lpaPhi(lpaGct(' + a.mu + ', ' + a.lam + '))', gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'MUCTR') {
            return ['(' + a.mu + ' + ' + a.lam + ') / 2.0', gen.ORDER_MULTIPLICATIVE];
        }
        if (grau === 'D') {
            precisa(gen, 'lpaGc');
            precisa(gen, 'lpaGct');
            precisa(gen, 'lpaD');
            return ['lpaD(lpaGc(' + a.mu + ', ' + a.lam + '), lpaGct(' + a.mu + ', ' + a.lam + '))',
                gen.ORDER_UNARY_POSTFIX];
        }
        if (grau === 'GCR') {
            precisa(gen, 'lpaGcr');
            return ['lpaGcr(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
        }
        precisa(gen, 'lpaMuEr');
        return ['lpaMuEr(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
    };

    /** Chamada ao analisador na resolução escolhida. */
    function chamadaEstado(block, gen, mu, lam) {
        if (block.getFieldValue('RES') === '4') {
            precisa(gen, 'lpaEstado4');
            return 'lpaEstado4(' + mu + ', ' + lam + ')';
        }
        precisa(gen, 'lpaEstado');
        const lim = ['C1', 'C2', 'C3', 'C4'].map(function (c) {
            const v = block.getFieldValue(c);
            return v == null || String(v).trim() === '' ? '0' : String(v).trim();
        });
        return 'lpaEstado(' + mu + ', ' + lam + ', ' + lim.join(', ') + ')';
    }

    /** O bloco de estado sem campos C1..C4 usa os limites padrão do reticulado. */
    function chamadaEstadoPadrao(block, gen, mu, lam) {
        if (block.getFieldValue('RES') === '4') {
            precisa(gen, 'lpaEstado4');
            return 'lpaEstado4(' + mu + ', ' + lam + ')';
        }
        precisa(gen, 'lpaEstado');
        return 'lpaEstado(' + mu + ', ' + lam + ', 0.5, -0.5, 0.5, -0.5)';
    }

    A.forBlock['lp_estado'] = function (block, gen) {
        const a = anotacao(block, gen);
        return [chamadaEstadoPadrao(block, gen, a.mu, a.lam), gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['lp_estado_nome'] = function (block, gen) {
        precisa(gen, 'lpaNomeEstado');
        return ['lpaNomeEstado(' + gen.valorOu(block, 'ESTADO', gen.ORDER_COMMA, '0') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['lp_indefinicao'] = function (block, gen) {
        precisa(gen, 'lpaIndefinido');
        const a = anotacao(block, gen);
        return ['lpaIndefinido(' + a.mu + ', ' + a.lam + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['lp_nap'] = function (block, gen) {
        precisa(gen, 'lpaMuEr');
        precisa(gen, 'lpaPhi');
        precisa(gen, 'lpaGct');

        const a = anotacao(block, gen);
        const vMuEr = gen.nomeVar(block, 'VAR_MUER');
        const vPhiE = gen.nomeVar(block, 'VAR_PHIE');
        gen.varsUsadas_.set(vMuEr, block.id);
        gen.varsUsadas_.set(vPhiE, block.id);

        // As entradas entram em temporárias: μ e λ costumam ser leituras de
        // sensor, e ler duas vezes daria dois valores diferentes.
        return '{\n' +
            gen.INDENT + 'float lpaMu = ' + a.mu + ', lpaLam = ' + a.lam + ';\n' +
            gen.INDENT + vMuEr + ' = lpaMuEr(lpaMu, lpaLam);\n' +
            gen.INDENT + vPhiE + ' = lpaPhi(lpaGct(lpaMu, lpaLam));\n' +
            '}\n';
    };

    /* ------------------------------------------------------------------ */
    /* Decisão                                                             */
    /* ------------------------------------------------------------------ */

    A.forBlock['lp_caso'] = function (block, gen) {
        return 'case ' + block.getFieldValue('ESTADO') + ':\n' +
            gen.statementToCode(block, 'BODY') + gen.INDENT + 'break;\n';
    };

    A.forBlock['lp_senao'] = function (block, gen) {
        return 'default:\n' + gen.statementToCode(block, 'BODY') + gen.INDENT + 'break;\n';
    };

    A.forBlock['lp_para_analisador'] = function (block, gen) {
        const mu = gen.valorOu(block, 'MU', gen.ORDER_COMMA, '0.5');
        let lam = gen.valorOu(block, 'LAMBDA', gen.ORDER_COMMA, '0.5');
        if (block.getFieldValue('MODO') === 'COMPL') lam = '1.0 - (' + lam + ')';

        const casos = gen.statementToCode(block, 'CASOS');
        if (!casos.trim()) {
            gen.aviso('O Para-Analisador está sem nenhum estado — a análise não faz nada.',
                block.id);
        }
        return 'switch (' + chamadaEstado(block, gen, mu, lam) + ') {\n' + casos + '}\n';
    };

    A.forBlock['lp_para_analisador_simples'] = function (block, gen) {
        precisa(gen, 'lpaEvidencia');

        const s1 = gen.valorOu(block, 'S1', gen.ORDER_COMMA, '0');
        const s2 = gen.valorOu(block, 'S2', gen.ORDER_COMMA, '0');
        const a1 = gen.valorOu(block, 'A1', gen.ORDER_COMMA, '0');
        const a2 = gen.valorOu(block, 'A2', gen.ORDER_COMMA, '1023');

        const casos = gen.statementToCode(block, 'CASOS');
        if (!casos.trim()) {
            gen.aviso('O Para-Analisador está sem nenhum estado — a análise não faz nada.',
                block.id);
        }

        // Limites do universo em temporárias: cada leitura de sensor entra uma
        // vez só, e a1/a2 não são recalculados para as duas fontes.
        const mu = 'lpaEvidencia(lpaS1, lpaA1, lpaA2, 0)';
        const lam = '1.0 - lpaEvidencia(lpaS2, lpaA1, lpaA2, 0)';

        return '{\n' +
            gen.INDENT + 'float lpaA1 = ' + a1 + ', lpaA2 = ' + a2 + ';\n' +
            gen.INDENT + 'float lpaS1 = ' + s1 + ', lpaS2 = ' + s2 + ';\n' +
            gen.INDENT + 'switch (' + chamadaEstadoPadrao(block, gen, mu, lam) + ') {\n' +
            gen.prefixLines(casos.replace(/\n$/, ''), gen.INDENT) + '\n' +
            gen.INDENT + '}\n' +
            '}\n';
    };

    /* ------------------------------------------------------------------ */
    /* Rede                                                                */
    /* ------------------------------------------------------------------ */

    A.forBlock['lp_conectivo'] = function (block, gen) {
        precisa(gen, 'lpaConectivo');
        const fn = block.getFieldValue('OP') === 'MIN' ? 'lpaMin' : 'lpaMax';
        return [fn + '(' + gen.valorOu(block, 'A', gen.ORDER_COMMA, '0.5') + ', ' +
            gen.valorOu(block, 'B', gen.ORDER_COMMA, '0.5') + ')', gen.ORDER_UNARY_POSTFIX];
    };

    A.forBlock['lp_extractor'] = function (block, gen) {
        precisa(gen, 'lpaExtractor');
        const nome = gen.nomeVar(block, 'VAR');
        gen.varsUsadas_.set(nome, block.id);
        return ['lpaExtractor(' + nome + ', ' + gen.valorOu(block, 'N', gen.ORDER_COMMA, '2') + ')',
            gen.ORDER_UNARY_POSTFIX];
    };

})(typeof window !== 'undefined' ? window : global);
