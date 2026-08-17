'use strict';
/**
 * MODO ABSTRATO — blocos simplificados, só com parâmetros.
 *
 * A diferença em relação ao Modo Literal não é cosmética: aqui um bloco pode
 * valer mais de um comando. "Escrita digital [13] [liga]" declara o pinMode e
 * escreve o digitalWrite; o aluno não precisa saber que existem dois passos.
 *
 * O que NÃO muda: o painel de código continua mostrando o C++ inteiro, e cada
 * bloco abstrato tem um par literal exato. É isso que permite converter entre
 * os dois modos sem alterar uma linha do programa gerado (src/renderer/js/
 * converter.js), e é isso que tools/modo_test.js verifica.
 *
 * Nenhum bloco daqui pede tipo, modo de pino ou ponteiro. Se um parâmetro
 * precisa de decisão técnica, a decisão é do gerador, não do aluno.
 */
(function () {
    if (typeof Blockly === 'undefined') return;

    const EST = 260;   // estrutura, mesma cor do literal
    const IO = 20;     // entradas e saídas
    const TEMPO = 120;
    const MOSTRA = 195;
    const CTRL = 210;
    const OP = 230;
    const VAR = 330;
    const LP = 290;    // lógica paraconsistente, mesma cor do literal

    const LIGA = [['liga', 'HIGH'], ['desliga', 'LOW']];
    const UNIDADE = [['segundos', 's'], ['milissegundos', 'ms']];

    const ESTADOS = [
        ['V — verdadeiro', 'LPA_V'],
        ['F — falso', 'LPA_F'],
        ['T — inconsistente (as fontes brigam)', 'LPA_T'],
        ['⊥ — indeterminado (brigam ao contrário)', 'LPA_PC'],
        ['Qv→T — quase verdadeiro, começando a divergir', 'LPA_QVT'],
        ['Qv→⊥ — quase verdadeiro, evidência fraca', 'LPA_QVPC'],
        ['Qf→T — quase falso, começando a divergir', 'LPA_QFT'],
        ['Qf→⊥ — quase falso, evidência fraca', 'LPA_QFPC'],
        ['T→v — divergindo, puxando para verdadeiro', 'LPA_TV'],
        ['T→f — divergindo, puxando para falso', 'LPA_TF'],
        ['⊥→v — sem força, puxando para verdadeiro', 'LPA_PCV'],
        ['⊥→f — sem força, puxando para falso', 'LPA_PCF']
    ];

    Blockly.defineBlocksWithJsonArray([

        /* ==================== estrutura ==================== */

        {
            type: 'abs_ao_iniciar',
            message0: 'Ao iniciar',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            colour: EST,
            tooltip: 'Roda uma vez, quando a placa liga. É o void setup() do Modo Literal.'
        },
        {
            type: 'abs_sempre',
            message0: 'Sempre',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            colour: EST,
            tooltip: 'Repete para sempre, enquanto a placa estiver ligada. É o void loop().'
        },

        /* ==================== entradas e saídas ==================== */

        {
            type: 'abs_escrita_digital',
            message0: 'escrita digital pino %1 %2',
            args0: [
                { type: 'field_pin_digital', name: 'PIN' },
                { type: 'field_dropdown', name: 'VALOR', options: LIGA }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Liga ou desliga o pino. O pinMode de saída é declarado sozinho.'
        },
        {
            type: 'abs_leitura_digital',
            message0: 'leitura digital pino %1',
            args0: [{ type: 'field_pin_digital_in', name: 'PIN' }],
            output: 'Number', inputsInline: true,
            colour: IO,
            tooltip: 'Lê se o pino está em nível alto. O pinMode de entrada é declarado sozinho.'
        },
        {
            type: 'abs_botao',
            message0: 'botão no pino %1 apertado ?',
            args0: [{ type: 'field_pin_digital_in', name: 'PIN' }],
            output: 'Boolean', inputsInline: true,
            colour: IO,
            tooltip: 'Verdadeiro quando o botão está apertado. Usa o resistor interno, ' +
                'então o botão vai do pino direto ao GND.'
        },
        {
            type: 'abs_escrita_analogica',
            message0: 'intensidade do pino %1 em %2 %%',
            args0: [
                { type: 'field_pin_pwm', name: 'PIN' },
                { type: 'input_value', name: 'PCT' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Controla a intensidade de 0 a 100 %. Serve para brilho de LED e ' +
                'velocidade de motor.'
        },
        {
            type: 'abs_leitura_analogica',
            message0: 'leitura analógica pino %1 em %%',
            args0: [{ type: 'field_pin_analog', name: 'PIN' }],
            output: 'Number', inputsInline: true,
            colour: IO,
            tooltip: 'Lê o sensor e devolve de 0 a 100 %, em vez do 0 a 1023 do conversor.'
        },
        {
            type: 'abs_distancia',
            message0: 'distância em cm  disparo %1  eco %2',
            args0: [
                { type: 'field_pin_digital', name: 'TRIG' },
                { type: 'field_pin_digital_in', name: 'ECHO' }
            ],
            output: 'Number', inputsInline: true,
            colour: IO,
            tooltip: 'Mede a distância com um sensor de ultrassom HC-SR04. Sem eco, ' +
                'devolve 400 cm em vez de zero.'
        },
        {
            type: 'abs_servo',
            message0: 'servo no pino %1 em %2 graus',
            args0: [
                { type: 'field_pin_pwm', name: 'PIN' },
                { type: 'input_value', name: 'ANGULO' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Move o servo para o ângulo, de 0 a 180. O objeto e o attach são ' +
                'criados sozinhos, um por pino.'
        },
        {
            type: 'abs_nota',
            message0: 'tocar %1 Hz por %2 ms no pino %3',
            args0: [
                { type: 'input_value', name: 'FREQ' },
                { type: 'input_value', name: 'DUR' },
                { type: 'field_pin_digital', name: 'PIN' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Toca uma nota num buzzer ligado ao pino.'
        },

        /* ==================== tempo ==================== */

        {
            type: 'abs_esperar',
            message0: 'esperar %1 %2',
            args0: [
                { type: 'input_value', name: 'QTD' },
                { type: 'field_dropdown', name: 'UNI', options: UNIDADE }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: TEMPO,
            tooltip: 'Para o programa pelo tempo escolhido.'
        },
        {
            type: 'abs_tempo_ligado',
            message0: 'tempo ligado em %1',
            args0: [{ type: 'field_dropdown', name: 'UNI', options: UNIDADE }],
            output: 'Number',
            colour: TEMPO,
            tooltip: 'Quanto tempo passou desde que a placa ligou.'
        },

        /* ==================== mostrar ==================== */

        {
            type: 'abs_mostrar',
            message0: 'mostrar %1 %2',
            args0: [
                { type: 'field_input', name: 'ROTULO', text: 'valor' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: MOSTRA,
            tooltip: 'Escreve no Monitor serial. O Serial.begin é feito sozinho.'
        },
        {
            type: 'abs_mostrar_grafico',
            message0: 'mostrar no gráfico %1 %2',
            args0: [
                { type: 'field_input', name: 'ROTULO', text: 'sensor' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: MOSTRA,
            tooltip: 'Escreve no formato que a aba Plotter entende, virando uma curva.'
        },
        {
            type: 'abs_mostrar_reticulado',
            message0: 'mostrar no reticulado  μ %1  λ %2',
            args0: [
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: MOSTRA,
            tooltip: 'Manda a anotação para a aba Reticulado, que marca o ponto em ' +
                'tempo real.'
        },

        /* ==================== controle ==================== */

        {
            type: 'abs_se',
            message0: 'se %1',
            args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
            message1: 'então %1',
            args1: [{ type: 'input_statement', name: 'ENTAO' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: CTRL,
            tooltip: 'Faz o que está dentro só quando a condição é verdadeira.'
        },
        {
            type: 'abs_se_senao',
            message0: 'se %1',
            args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
            message1: 'então %1',
            args1: [{ type: 'input_statement', name: 'ENTAO' }],
            message2: 'senão %1',
            args2: [{ type: 'input_statement', name: 'SENAO' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: CTRL,
            tooltip: 'Escolhe entre dois caminhos.'
        },
        {
            type: 'abs_repetir',
            message0: 'repetir %1 vezes',
            args0: [{ type: 'input_value', name: 'VEZES' }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: CTRL,
            tooltip: 'Repete um número fixo de vezes.'
        },
        {
            type: 'abs_enquanto',
            message0: 'repetir enquanto %1',
            args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: CTRL,
            tooltip: 'Repete enquanto a condição continuar verdadeira.'
        },

        /* ==================== operadores e matemática ==================== */

        {
            type: 'abs_comparar',
            message0: '%1 %2 %3',
            args0: [
                { type: 'input_value', name: 'A' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['=', 'EQ'], ['≠', 'NEQ'], ['<', 'LT'],
                        ['≤', 'LTE'], ['>', 'GT'], ['≥', 'GTE']
                    ]
                },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Boolean', inputsInline: true,
            colour: OP,
            tooltip: 'Compara dois valores.'
        },
        {
            type: 'abs_logico',
            message0: '%1 %2 %3',
            args0: [
                { type: 'input_value', name: 'A', check: 'Boolean' },
                { type: 'field_dropdown', name: 'OP', options: [['e', 'AND'], ['ou', 'OR']] },
                { type: 'input_value', name: 'B', check: 'Boolean' }
            ],
            output: 'Boolean', inputsInline: true,
            colour: OP,
            tooltip: 'Combina duas condições.'
        },
        {
            type: 'abs_conta',
            message0: '%1 %2 %3',
            args0: [
                { type: 'input_value', name: 'A' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/']
                    ]
                },
                { type: 'input_value', name: 'B' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Uma conta entre dois valores.'
        },
        {
            type: 'abs_mapear',
            message0: 'mapear %1 de %2 a %3 para %4 a %5',
            args0: [
                { type: 'input_value', name: 'VALOR' },
                { type: 'input_value', name: 'DE_MIN' },
                { type: 'input_value', name: 'DE_MAX' },
                { type: 'input_value', name: 'PARA_MIN' },
                { type: 'input_value', name: 'PARA_MAX' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Converte um número de uma faixa para outra.'
        },
        {
            type: 'abs_sorteio',
            message0: 'sorteio de %1 a %2',
            args0: [
                { type: 'input_value', name: 'MIN' },
                { type: 'input_value', name: 'MAX' }
            ],
            output: 'Number', inputsInline: true,
            colour: OP,
            tooltip: 'Um número sorteado na faixa.'
        },

        /* ==================== variáveis ==================== */

        {
            type: 'abs_criar',
            message0: 'criar %1 com %2',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'contador' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: VAR,
            tooltip: 'Cria uma caixa para guardar um número, visível em todo o programa.'
        },
        {
            type: 'abs_definir',
            message0: 'definir %1 para %2',
            args0: [
                { type: 'field_variable', name: 'VAR', variable: 'contador' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: VAR,
            tooltip: 'Guarda um valor novo na caixa.'
        },
        {
            type: 'abs_ler',
            message0: '%1',
            args0: [{ type: 'field_variable', name: 'VAR', variable: 'contador' }],
            output: 'Number',
            colour: VAR,
            tooltip: 'Lê o que está guardado na caixa.'
        },

        /* ==================== lógica paraconsistente ==================== */

        {
            type: 'abs_evidencia',
            message0: 'evidência de %1 entre %2 e %3',
            args0: [
                { type: 'input_value', name: 'X' },
                { type: 'input_value', name: 'A1' },
                { type: 'input_value', name: 'A2' }
            ],
            output: 'Number', inputsInline: true,
            colour: LP,
            tooltip: 'Transforma uma medida em Grau de Evidência entre 0 e 1. O ' +
                'primeiro limite é onde a evidência é nula, o segundo é onde ela é total.'
        },
        {
            type: 'abs_quando_estado',
            message0: 'analisar  fonte 1 %1  fonte 2 %2',
            args0: [
                { type: 'input_value', name: 'MU1' },
                { type: 'input_value', name: 'MU2' }
            ],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'CASOS', check: 'abs_caso_estado' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: LP,
            tooltip: 'Compara duas fontes que falam da MESMA coisa e desvia conforme o ' +
                'resultado. Use blocos "quando o estado for" dentro.'
        },
        {
            type: 'abs_caso_estado',
            message0: 'quando o estado for %1',
            args0: [{ type: 'field_dropdown', name: 'ESTADO', options: ESTADOS }],
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: 'abs_caso_estado', nextStatement: 'abs_caso_estado',
            colour: LP,
            tooltip: 'O que fazer quando a análise cair neste estado.'
        },
        {
            type: 'abs_grau',
            message0: '%1 de  fonte 1 %2  fonte 2 %3',
            args0: [
                {
                    type: 'field_dropdown', name: 'GRAU', options: [
                        ['certeza', 'GC'],
                        ['contradição', 'GCT'],
                        ['espaço para certeza', 'PHI'],
                        ['certeza real', 'GCR'],
                        ['evidência resultante', 'MUER']
                    ]
                },
                { type: 'input_value', name: 'MU1' },
                { type: 'input_value', name: 'MU2' }
            ],
            output: 'Number', inputsInline: true,
            colour: LP,
            tooltip: 'Um dos números da análise paraconsistente entre as duas fontes.'
        },
        {
            type: 'abs_contradicao',
            message0: 'fontes %1 e %2 se contradizem ?',
            args0: [
                { type: 'input_value', name: 'MU1' },
                { type: 'input_value', name: 'MU2' }
            ],
            output: 'Boolean', inputsInline: true,
            colour: LP,
            tooltip: 'Verdadeiro quando a discordância entre as fontes é tão grande ' +
                'que a análise não conclui nada.'
        },
        {
            type: 'abs_combinar',
            message0: 'combinar %1 e %2 pelo %3',
            args0: [
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
                {
                    type: 'field_dropdown', name: 'OP', options: [
                        ['maior', 'MAX'], ['menor', 'MIN']
                    ]
                }
            ],
            output: 'Number', inputsInline: true,
            colour: LP,
            tooltip: 'Junta duas evidências tomando a maior (OR) ou a menor (AND).'
        }

    ]);
})();
