'use strict';
/**
 * Categoria LÓGICA PARACONSISTENTE — LPA2v aplicada.
 *
 * Diferente do resto do TaskArduino, estes blocos não são 1:1 com um comando
 * da linguagem Arduino: são blocos de aplicação. A honestidade fica na saída —
 * cada um gera uma chamada a uma função C++ com nome legível (lpaGc, lpaEstado,
 * lpaMuEr…) que aparece inteira no painel de código, com as equações da LPA2v
 * escritas do jeito que o aluno viu na aula.
 *
 * Base: Lógica Paraconsistente Anotada com anotação de dois valores, na
 * formulação de aplicação de J. I. Da Silva Filho (GLPA/Unisanta).
 *
 *   Gc  = μ − λ        Grau de Certeza      (eixo horizontal do reticulado)
 *   Gct = μ + λ − 1    Grau de Contradição  (eixo vertical)
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const COR = 290;

    /* Os 12 estados do reticulado. O valor é o nome da constante no .ino. */
    const ESTADOS = [
        ['V — Verdadeiro', 'LPA_V'],
        ['F — Falso', 'LPA_F'],
        ['T — Inconsistente', 'LPA_T'],
        ['⊥ — Indeterminado', 'LPA_PC'],
        ['Qv→T — quase-verdadeiro tendendo ao inconsistente', 'LPA_QVT'],
        ['Qv→⊥ — quase-verdadeiro tendendo ao indeterminado', 'LPA_QVPC'],
        ['Qf→T — quase-falso tendendo ao inconsistente', 'LPA_QFT'],
        ['Qf→⊥ — quase-falso tendendo ao indeterminado', 'LPA_QFPC'],
        ['T→v — inconsistente tendendo ao verdadeiro', 'LPA_TV'],
        ['T→f — inconsistente tendendo ao falso', 'LPA_TF'],
        ['⊥→v — indeterminado tendendo ao verdadeiro', 'LPA_PCV'],
        ['⊥→f — indeterminado tendendo ao falso', 'LPA_PCF']
    ];

    /* Funções de valoração no Universo de Discurso. */
    const VALORACAO = [
        ['linear crescente', 'LIN'],
        ['linear decrescente', 'LINI'],
        ['função S', 'S'],
        ['função Z', 'Z']
    ];

    Blockly.defineBlocksWithJsonArray([

        /* ============ evidência: do mundo físico para [0, 1] ============ */

        {
            type: 'lp_evidencia',
            message0: 'evidência de %1 no universo de %2 a %3 , %4',
            args0: [
                { type: 'input_value', name: 'X' },
                { type: 'input_value', name: 'A1' },
                { type: 'input_value', name: 'A2' },
                { type: 'field_dropdown', name: 'FUNC', options: VALORACAO }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Normaliza a leitura de um sensor para um Grau de Evidência entre 0 e 1, ' +
                'dentro do Universo de Discurso escolhido. Fora dos limites satura em 0 ou 1.'
        },
        {
            type: 'lp_complemento',
            message0: 'complemento de %1',
            args0: [{ type: 'input_value', name: 'MU' }],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Devolve 1 − μ. Transforma uma evidência favorável em desfavorável ' +
                'e é também o operador NOT da LPA2v.'
        },

        /* ==================== análise paraconsistente ==================== */

        {
            type: 'lp_grau',
            message0: '%1 de μ %2 λ %3',
            args0: [
                {
                    type: 'field_dropdown', name: 'GRAU', options: [
                        ['Grau de Certeza Gc', 'GC'],
                        ['Grau de Contradição Gct', 'GCT'],
                        ['Intervalo de Certeza φ', 'PHI'],
                        ['Grau de Contradição normalizado μctr', 'MUCTR'],
                        ['distância D', 'D'],
                        ['Grau de Certeza Real Gcr', 'GCR'],
                        ['Grau de Evidência Resultante Real μEr', 'MUER']
                    ]
                },
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Calcula uma das grandezas da LPA2v a partir da anotação (μ, λ). ' +
                'Gcr e μEr já aplicam a guarda de indefinição do NAP.'
        },
        {
            type: 'lp_estado',
            message0: 'estado de μ %1 λ %2 em %3 regiões',
            args0: [
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' },
                {
                    type: 'field_dropdown', name: 'RES', options: [
                        ['12', '12'], ['4', '4']
                    ]
                }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Devolve o estado lógico do reticulado como um código. ' +
                'Em 4 regiões vale o vértice mais próximo; em 12, o Para-Analisador completo.'
        },
        {
            type: 'lp_estado_nome',
            message0: 'nome do estado %1',
            args0: [{ type: 'input_value', name: 'ESTADO' }],
            output: 'String', inputsInline: true,
            colour: COR,
            tooltip: 'Converte o código do estado em texto ("Qv->T"), para o monitor serial.'
        },
        {
            type: 'lp_indefinicao',
            message0: 'indefinição em μ %1 λ %2 ?',
            args0: [
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            output: 'Boolean', inputsInline: true,
            colour: COR,
            tooltip: 'Verdadeiro quando a análise não conclui: φE ≤ 0,25 ou D > 1. ' +
                'Nesse caso Gcr vale 0 e μEr vale 0,5.'
        },
        {
            type: 'lp_nap',
            message0: 'NAP de μ %1 λ %2',
            args0: [
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            message1: 'μEr em %1 , φE em %2',
            args1: [
                { type: 'field_variable', name: 'VAR_MUER', variable: 'muEr' },
                { type: 'field_variable', name: 'VAR_PHIE', variable: 'phiE' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Nó de Análise Paraconsistente: guarda o Grau de Evidência Resultante Real ' +
                'e o Intervalo de Evidência nas duas variáveis. As variáveis precisam existir.'
        },

        /* ========================== decisão ========================== */

        {
            type: 'lp_para_analisador',
            message0: 'Para-Analisador  μ %1  fonte 2 %2 %3',
            args0: [
                { type: 'input_value', name: 'MU' },
                {
                    type: 'field_dropdown', name: 'MODO', options: [
                        ['é evidência favorável (usa 1 − μ2)', 'COMPL'],
                        ['já é o λ', 'DIRETO']
                    ]
                },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            message1: 'em %1 regiões, limites %2 %3 %4 %5',
            args1: [
                {
                    type: 'field_dropdown', name: 'RES', options: [
                        ['12', '12'], ['4', '4']
                    ]
                },
                { type: 'field_input', name: 'C1', text: '0.5' },
                { type: 'field_input', name: 'C2', text: '-0.5' },
                { type: 'field_input', name: 'C3', text: '0.5' },
                { type: 'field_input', name: 'C4', text: '-0.5' }
            ],
            message2: '%1',
            args2: [{ type: 'input_statement', name: 'CASOS', check: 'lp_caso' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Analisa a anotação e desvia para o caso do estado encontrado. ' +
                'Os limites são Vscc, Vicc, Vscct e Vicct, nessa ordem. ' +
                'Use blocos "estado" e "senão" dentro.'
        },
        {
            type: 'lp_para_analisador_simples',
            message0: 'Para-Analisador  sensor 1 %1  sensor 2 %2',
            args0: [
                { type: 'input_value', name: 'S1' },
                { type: 'input_value', name: 'S2' }
            ],
            message1: 'universo de %1 a %2 , em %3 regiões',
            args1: [
                { type: 'input_value', name: 'A1' },
                { type: 'input_value', name: 'A2' },
                {
                    type: 'field_dropdown', name: 'RES', options: [
                        ['12', '12'], ['4', '4']
                    ]
                }
            ],
            message2: '%1',
            args2: [{ type: 'input_statement', name: 'CASOS', check: 'lp_caso' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: COR,
            tooltip: 'Versão direta: normaliza as duas leituras no mesmo Universo de Discurso ' +
                '(linear crescente), toma a segunda como evidência desfavorável e analisa. ' +
                'As duas fontes precisam falar da mesma proposição.'
        },
        {
            type: 'lp_caso',
            message0: 'estado %1',
            args0: [{ type: 'field_dropdown', name: 'ESTADO', options: ESTADOS }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: 'lp_caso', nextStatement: 'lp_caso',
            colour: COR,
            tooltip: 'O que fazer quando a análise cair neste estado do reticulado.'
        },
        {
            type: 'lp_senao',
            message0: 'nos demais estados',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: 'lp_caso', nextStatement: 'lp_caso',
            colour: COR,
            tooltip: 'Caso padrão: vale para todo estado que não tem bloco próprio.'
        },

        /* ====================== rede de análises ====================== */

        {
            type: 'lp_conectivo',
            message0: '%1 entre %2 e %3',
            args0: [
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['OR — maximização', 'MAX'],
                        ['AND — minimização', 'MIN']
                    ]
                },
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Conectivo da LPA2v entre dois Graus de Evidência: ' +
                'OR maximiza, AND minimiza.'
        },
        {
            type: 'lp_extractor',
            message0: 'ParaExtrctr sobre %1 com %2 graus',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'evidencias' },
                { type: 'input_value', name: 'N' }
            ],
            output: 'Number', inputsInline: true,
            colour: COR,
            tooltip: 'Reduz um vetor de Graus de Evidência sobre a mesma proposição a um ' +
                'único Grau de Evidência resultante, extraindo os efeitos da contradição.'
        }

    ]);
})();
