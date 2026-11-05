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
    const REDE = 100;  // página web, mesma cor do "ESP / WiFi" do literal

    const LIGA = [['liga', 'HIGH'], ['desliga', 'LOW']];
    const UNIDADE = [['segundos', 's'], ['milissegundos', 'ms']];

    const MANOBRAS = [
        ['ir para frente', 'FRENTE'],
        ['dar ré', 'RE'],
        ['girar à esquerda', 'ESQ'],
        ['girar à direita', 'DIR'],
        ['parar', 'PARAR']
    ];

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

        /* ==================== motores ==================== */

        {
            type: 'abs_motores_pinos',
            message0: 'motores  esquerda %1 %2  direita %3 %4',
            args0: [
                { type: 'field_pin_pwm', name: 'E1' },
                { type: 'field_pin_pwm', name: 'E2' },
                { type: 'field_pin_pwm', name: 'D1' },
                { type: 'field_pin_pwm', name: 'D2' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Diz em que pinos está a ponte H dos dois motores. Vai uma vez ' +
                'no "Ao iniciar"; depois disso os blocos de manobra só falam em ' +
                'frente, ré e giro.'
        },
        {
            type: 'abs_motores',
            message0: 'motores %1 a %2 %%',
            args0: [
                { type: 'field_dropdown', name: 'MANOBRA', options: MANOBRAS },
                { type: 'input_value', name: 'VEL' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: IO,
            tooltip: 'Uma manobra inteira num bloco só, de 0 a 100 %. A velocidade ' +
                'fica aqui, num lugar só: ligue a mesma caixa nas manobras que devem ' +
                'andar igual.'
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

        /* ==================== página web ==================== */
        /*
         * A placa serve a própria página: quem olha é um celular no navegador,
         * sem cabo e sem instalar nada. Nenhum destes blocos pede HTML — a
         * página se monta sozinha com os botões e valores que o programa usa.
         */

        {
            type: 'abs_wifi_rede_aberta',
            message0: 'criar rede WiFi aberta %1',
            args0: [{ type: 'field_input', name: 'NOME', text: 'emmy2' }],
            // O endereço fica escrito na face do bloco porque ele é fixo e porque
            // quem usa o robô sem fio não tem o cabo para ler o Monitor serial.
            message1: 'a página abre em http://192.168.4.1 %1',
            args1: [{ type: 'input_dummy' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'A placa vira o ponto de acesso: o celular se conecta nela ' +
                'direto, sem roteador. O endereço da página é sempre 192.168.4.1, ' +
                'fixado pelo próprio modo ponto de acesso.'
        },
        {
            type: 'abs_wifi_entrar',
            message0: 'entrar na rede WiFi %1 senha %2',
            args0: [
                { type: 'field_input', name: 'SSID', text: 'minha-rede' },
                { type: 'field_input', name: 'SENHA', text: 'senha123' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Entra numa rede que já existe e espera até conectar. O endereço ' +
                'da página aparece no Monitor serial.'
        },
        {
            type: 'abs_wifi_ip_fixo',
            message0: 'usar IP fixo %1  roteador %2  máscara %3',
            args0: [
                { type: 'field_input', name: 'IP', text: '192.168.0.50' },
                { type: 'field_input', name: 'GATEWAY', text: '192.168.0.1' },
                { type: 'field_input', name: 'MASCARA', text: '255.255.255.0' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Fixa o endereço da placa na rede, antes de entrar nela. Sem ' +
                'isto quem escolhe o endereço é o roteador, e ele muda de uma ligação ' +
                'para outra — a página troca de lugar sem avisar.'
        },
        {
            type: 'abs_web_servidor',
            message0: 'servidor web na porta de rede %1',
            args0: [{ type: 'field_number', name: 'PORTA_REDE', value: 80, min: 1, max: 65535, precision: 1 }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Abre a página da placa. Vai no "Ao iniciar", depois da rede. ' +
                'Porta de rede não é pino: é o número que vem depois dos dois-pontos ' +
                'no endereço, e 80 é o que o navegador usa sozinho.'
        },
        {
            type: 'abs_web_botao',
            message0: 'botão %1 da página apertado ?',
            args0: [{ type: 'field_input', name: 'NOME', text: 'frente' }],
            output: 'Boolean', inputsInline: true,
            colour: REDE,
            tooltip: 'Verdadeiro enquanto o dedo está no botão da página. O botão ' +
                'aparece sozinho na tela do celular, com este nome.'
        },
        {
            type: 'abs_web_mostrar',
            message0: 'mostrar %1 %2 na página',
            args0: [
                { type: 'field_input', name: 'ROTULO', text: 'valor' },
                { type: 'input_value', name: 'VALOR' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Escreve um número na página, que se atualiza sozinha.'
        },
        {
            type: 'abs_web_reticulado',
            message0: 'mostrar o reticulado na página  μ %1  λ %2',
            args0: [
                { type: 'input_value', name: 'MU' },
                { type: 'input_value', name: 'LAMBDA' }
            ],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Desenha o reticulado da LPA2v na própria página, com o rastro ' +
                'dos últimos pontos — o mesmo QUPC da aba Reticulado, no celular.'
        },
        {
            type: 'abs_web_atender',
            message0: 'atender a página',
            previousStatement: null, nextStatement: null,
            colour: REDE,
            tooltip: 'Dá uma volta no servidor: recebe os toques e responde. Vai no ' +
                'começo do "Sempre".'
        },
        {
            type: 'abs_web_esperar',
            message0: 'esperar %1 ms atendendo a página',
            args0: [{ type: 'input_value', name: 'MS' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Espera sem abandonar a página: durante uma manobra longa, o ' +
                'celular continua respondendo. É o "esperar" de quem tem servidor.'
        },

        /*
         * Câmera. O vídeo tem servidor próprio, numa tarefa à parte: enquanto
         * alguém assiste, o "Sempre" continua medindo e decidindo no mesmo
         * ritmo. A página da porta 80 só diz ao celular QUANDO abrir o vídeo.
         */
        {
            type: 'abs_camera_ligar',
            message0: 'ligar a câmera  imagem %1  %2',
            args0: [{
                type: 'field_dropdown', name: 'TAMANHO', options: [
                    ['640 × 480', 'FRAMESIZE_VGA'],
                    ['320 × 240 (mais fluida)', 'FRAMESIZE_QVGA'],
                    ['800 × 600', 'FRAMESIZE_SVGA']
                ]
            }, {
                // Depende de como a câmera vai montada: a mesma placa sai de
                // cabeça para baixo num carro e em pé no outro.
                type: 'field_dropdown', name: 'GIRAR', options: [
                    ['como sai da câmera', '0'],
                    ['girada 180°', '1']
                ]
            }],
            message1: 'o vídeo sai na porta 81: http://192.168.4.1:81/video %1',
            args1: [{ type: 'input_dummy' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'Liga a câmera da placa e abre o vídeo na porta 81. Vai no ' +
                '"Ao iniciar", depois da rede. Sozinho ele não põe o vídeo na ' +
                'página: quem decide quando mostrar é o bloco "mostrar a câmera".'
        },
        {
            type: 'abs_web_camera_mostrar',
            message0: 'mostrar a câmera na página com o aviso %1',
            args0: [{ type: 'field_input', name: 'AVISO', text: 'você está no controle' }],
            previousStatement: null, nextStatement: null, inputsInline: true,
            colour: REDE,
            tooltip: 'O vídeo aparece no topo da página do celular, com o aviso ' +
                'em destaque. Fica lá até o bloco "esconder a câmera".'
        },
        {
            type: 'abs_web_camera_esconder',
            message0: 'esconder a câmera da página',
            previousStatement: null, nextStatement: null,
            colour: REDE,
            tooltip: 'Tira o vídeo da página. O celular fecha a conexão do vídeo ' +
                'e a rede fica livre para o resto.'
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
            type: 'abs_senao_estado',
            message0: 'nos demais estados',
            message1: '%1',
            args1: [{ type: 'input_statement', name: 'BODY' }],
            previousStatement: 'abs_caso_estado', nextStatement: 'abs_caso_estado',
            colour: LP,
            tooltip: 'Vale para todo estado que não tem bloco próprio. Os quatro ' +
                'estados extremos são a minoria do reticulado: sem este bloco, uma ' +
                'leitura que caia numa região intermediária não faz nada, e o ' +
                'equipamento fica repetindo a última ação.'
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
