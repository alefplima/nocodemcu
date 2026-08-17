'use strict';
/**
 * Gera os projetos de exemplo em exemplos/*.tbk a partir de programas montados
 * em código — assim eles nascem válidos e passam pelo compile_test como
 * qualquer outra fixture.
 *
 *   node tools/gerar_exemplos.js
 *
 * Abrir um exemplo:  npm run dev -- exemplos/01-blink.tbk
 */
const fs = require('fs');
const path = require('path');
const { carregar, novoWorkspace, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Boards = amb.Boards;

const N = v => ({ t: 'ard_number', f: { NUM: v } });
const K = v => ({ t: 'ard_const', f: { CONST: v } });
const T = v => ({ t: 'ard_text', f: { TEXTO: v } });

/**
 * A sequência de pegar e depositar, em Modo Abstrato.
 *
 * No exemplo 08 (literal) isto é a função depositar(), escrita uma vez e
 * chamada nos dois destinos. O Modo Abstrato não tem blocos de função — é
 * justamente o que ele abre mão em troca da simplicidade —, então a sequência
 * aparece inteira em cada caso. Aqui ela é montada por uma função do gerador
 * de exemplos para que os dois lados não possam divergir.
 *
 * A esteira PRECISA parar antes da garra descer: pegar peça em movimento não
 * funciona, e era o que a primeira versão deste exemplo fazia.
 */
const depositarAbs = destino => [
    {
        t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'LOW' },
        c: 'pino 7 = rele da esteira. Para a esteira: a garra nao pega peca em movimento'
    },
    { t: 'abs_servo', f: { PIN: '10' }, v: { ANGULO: N(60) }, c: 'pino 10 = garra. 60 graus = aberta' },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(400) } },
    { t: 'abs_servo', f: { PIN: '9' }, v: { ANGULO: N(90) }, c: 'pino 9 = base. 90 graus = centro, sobre a esteira' },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(600) } },
    { t: 'abs_servo', f: { PIN: '10' }, v: { ANGULO: N(15) }, c: '15 graus = fechada: pegou a peca' },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(500) } },
    {
        t: 'abs_servo', f: { PIN: '9' }, v: { ANGULO: N(destino) },
        c: destino === 170 ? 'gira para a esquerda (170 graus)' : 'gira para a direita (10 graus)'
    },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(800) } },
    { t: 'abs_servo', f: { PIN: '10' }, v: { ANGULO: N(60) }, c: 'abre: soltou a peca no destino' },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(400) } },
    { t: 'abs_servo', f: { PIN: '9' }, v: { ANGULO: N(90) }, c: 'volta ao centro para o proximo ciclo' },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(600) } },
    { t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' }, c: 'religa a esteira' }
];

/** O alarme: para a esteira, espera e religa. Usado em T e em ⊥. */
const alarmeAbs = n => [
    { t: 'abs_mostrar', f: { ROTULO: 'alarme' }, v: { VALOR: N(n) } },
    { t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'LOW' }, c: 'para a esteira ate o operador olhar' },
    { t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(3) } },
    { t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' } }
];

const EXEMPLOS = [

    {
        arquivo: '01-blink.tbk',
        nome: 'Blink',
        placa: 'uno',
        specs: [
            {
                t: 'ard_setup', s: {
                    BODY: [{
                        t: 'ard_pinmode', f: { PIN: '13', MODO: 'OUTPUT' },
                        c: 'pino 13 = LED que ja vem soldado na placa: nao precisa de fio nenhum'
                    }]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delay', v: { MS: N(1000) } },
                        { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_delay', v: { MS: N(1000) } }
                    ]
                }
            }
        ]
    },

    {
        arquivo: '02-potenciometro-plotter.tbk',
        nome: 'Potenciômetro no plotter',
        placa: 'uno',
        specs: [
            {
                t: 'ard_setup', s: {
                    BODY: [{
                        t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' },
                        c: 'Ligacao: pino A0 = cursor (perna do meio) do potenciometro;\n' +
                            'as outras duas pernas vao em 5V e GND.\n' +
                            'O Monitor serial tem de estar no mesmo 9600'
                    }]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('pot:') },
                            c: 'o rotulo "nome:valor" e o que a aba Plotter usa para nomear a curva'
                        },
                        {
                            t: 'ard_serial_println', f: { PORTA: 'Serial' },
                            v: { VALOR: { t: 'ard_analogread', f: { PIN: 'A0' } } },
                            c: 'analogRead devolve 0 a 1023 (0 V a 5 V)'
                        },
                        { t: 'ard_delay', v: { MS: N(50) } }
                    ]
                }
            }
        ]
    },

    {
        arquivo: '03-botao-com-pullup.tbk',
        nome: 'Botão com pull-up interno',
        placa: 'uno',
        specs: [
            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '2', MODO: 'INPUT_PULLUP' },
                            c: 'pino 2 = botao, ligado entre o pino e o GND (so dois fios).\n' +
                                'INPUT_PULLUP usa o resistor de dentro do chip, entao a leitura\n' +
                                'fica invertida: solto le HIGH, apertado le LOW'
                        },
                        { t: 'ard_pinmode', f: { PIN: '13', MODO: 'OUTPUT' }, c: 'pino 13 = LED da placa' }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        {
                            t: 'controls_if',
                            v: {
                                IF0: {
                                    t: 'logic_compare', f: { OP: 'EQ' },
                                    v: { A: { t: 'ard_digitalread', f: { PIN: '2' } }, B: K('LOW') }
                                }
                            },
                            s: {
                                DO0: [
                                    { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } },
                                    { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('apertado') } }
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    },

    {
        arquivo: '04-pwm-com-map.tbk',
        nome: 'PWM controlado por potenciômetro',
        placa: 'uno',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'leitura' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'brilho' }, v: { VALOR: N(0) } },
            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '9', MODO: 'OUTPUT' },
                            c: 'Ligacao: A0 = cursor do potenciometro | pino 9 = LED com resistor\n' +
                                'de 220 ohm para o GND. O 9 e um dos pinos com ~ na placa, os\n' +
                                'unicos que aceitam analogWrite (PWM) na Uno: 3, 5, 6, 9, 10 e 11'
                        }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        { t: 'variables_set', f: { VAR: 'leitura' }, v: { VALUE: { t: 'ard_analogread', f: { PIN: 'A0' } } } },
                        {
                            t: 'variables_set', f: { VAR: 'brilho' },
                            c: 'o potenciometro entrega 0..1023, o PWM aceita 0..255: map converte',
                            v: {
                                VALUE: {
                                    t: 'ard_map',
                                    v: {
                                        VALOR: { t: 'variables_get', f: { VAR: 'leitura' } },
                                        DE_MIN: N(0), DE_MAX: N(1023), PARA_MIN: N(0), PARA_MAX: N(255)
                                    }
                                }
                            }
                        },
                        { t: 'ard_analogwrite', f: { PIN: '9' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'brilho' } } } },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('brilho:') } },
                        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'brilho' } } } },
                        { t: 'ard_delay', v: { MS: N(30) } }
                    ]
                }
            }
        ]
    },

    {
        arquivo: '05-esp32-wifi.tbk',
        nome: 'ESP32 conectando no WiFi',
        placa: 'esp32',
        specs: [
            {
                t: 'ard_setup', s: {
                    BODY: [
                        {
                            t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '115200' },
                            c: 'A ESP32 nao usa pino nenhum aqui: o radio WiFi e interno.\n' +
                                '115200 e o padrao dela — o Monitor serial precisa do mesmo valor,\n' +
                                'senao a tela vem embaralhada'
                        },
                        {
                            t: 'ard_wifi_begin', f: { SSID: 'minha-rede', SENHA: 'senha123' },
                            c: 'troque pelo nome e senha da sua rede (2,4 GHz: a ESP32 nao ve 5 GHz)'
                        },
                        {
                            t: 'ard_while',
                            v: {
                                COND: {
                                    t: 'logic_compare', f: { OP: 'NEQ' },
                                    v: { A: { t: 'ard_wifi_status' }, B: K('WL_CONNECTED') }
                                }
                            },
                            s: {
                                BODY: [
                                    { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('.') } },
                                    { t: 'ard_delay', v: { MS: N(500) } }
                                ]
                            }
                        },
                        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_wifi_localip' } } }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('rssi:') } },
                        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_wifi_rssi' } } },
                        { t: 'ard_delay', v: { MS: N(2000) } }
                    ]
                }
            }
        ]
    },

    /* ------------------------------------------------------------------
     * LPA2v — classificação de peças com dois sensores redundantes.
     *
     * Proposição: "a peça é do tipo A". Os dois sensores medem a MESMA
     * altura, então a discordância entre eles é contradição de verdade —
     * é isso que faz o Grau de Contradição significar alguma coisa.
     *
     * A leitura dos 12 estados não vira 12 destinos: os estados de certeza
     * classificam a peça, e os de contradição/indeterminação diagnosticam
     * o processo (sensor descalibrado, esteira vazia, peça na fronteira).
     * ------------------------------------------------------------------ */
    {
        arquivo: '06-lpa2v-classificacao.tbk',
        nome: 'LPA2v — classificação de peças',
        placa: 'uno',
        specs: [
            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '7', MODO: 'OUTPUT' },
                            c: 'Ligacao: A0 e A1 = dois sensores de altura de SAIDA ANALOGICA\n' +
                                '(0-5 V), medindo a MESMA peca - e por medirem o mesmo que a\n' +
                                'discordancia entre eles e contradicao, e nao ruido.\n' +
                                'A leitura 0..1023 vira milimetros pelo map; o Universo de\n' +
                                'Discurso vai de 20 mm a 60 mm.\n' +
                                'Saidas: pino 7 = desvio para o destino A'
                        },
                        { t: 'ard_pinmode', f: { PIN: '8', MODO: 'OUTPUT' }, c: 'pino 8 = desvio para o destino B' },
                        { t: 'ard_pinmode', f: { PIN: '9', MODO: 'OUTPUT' }, c: 'pino 9 = rejeito (peca fora de especificacao)' }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [{
                        t: 'lp_para_analisador_simples',
                        f: { RES: '12' },
                        v: {
                            // O sensor devolve 0..1023; o Universo de Discurso está
                            // em milímetros, então a leitura é convertida antes.
                            S1: {
                                t: 'ard_map', v: {
                                    VALOR: { t: 'ard_analogread', f: { PIN: 'A0' } },
                                    DE_MIN: N(0), DE_MAX: N(1023), PARA_MIN: N(0), PARA_MAX: N(100)
                                }
                            },
                            S2: {
                                t: 'ard_map', v: {
                                    VALOR: { t: 'ard_analogread', f: { PIN: 'A1' } },
                                    DE_MIN: N(0), DE_MAX: N(1023), PARA_MIN: N(0), PARA_MAX: N(100)
                                }
                            },
                            A1: N(20), A2: N(60)
                        },
                        s: {
                            CASOS: [
                                // certeza de que é do tipo A
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('tipo A') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('tipo A (leve discordancia)') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                // certeza de que não é
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_F' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('tipo B') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '8' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_QFPC' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('tipo B (evidencia fraca)') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '8' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                // contradição alta: os sensores brigam — provável falha
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_T' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ALARME: sensores em contradicao') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                // ⊥ é a mesma contradição de T vista do outro lado:
                                // com λ = 1 − μ2, o Grau de Contradição é μ1 − μ2,
                                // então T é "sensor 1 acima" e ⊥ é "sensor 2 acima".
                                // Nenhum dos dois quer dizer ausência de peça.
                                {
                                    t: 'lp_caso', f: { ESTADO: 'LPA_PC' }, s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ALARME: contradicao invertida') } },
                                            { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('HIGH') } }
                                        ]
                                    }
                                },
                                // o resto do reticulado: medir de novo
                                {
                                    t: 'lp_senao', s: {
                                        BODY: [
                                            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('indefinido — remedir') } }
                                        ]
                                    }
                                }
                            ]
                        },
                        next: [
                            { t: 'ard_delay', v: { MS: N(200) } },
                            { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') } },
                            { t: 'ard_digitalwrite', f: { PIN: '8' }, v: { VALOR: K('LOW') } },
                            { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('LOW') } }
                        ]
                    }]
                }
            }
        ]
    },

    /* ------------------------------------------------------------------
     * LPA2v — desvio de obstáculo no molde do robô Emmy (Da Silva Filho),
     * ADAPTADO para o hardware comum de Arduino.
     *
     * Proposição: "existe obstáculo à frente". Dois sensores apontados para
     * a frente, lado a lado — é por olharem o MESMO obstáculo que a
     * discordância entre eles é contradição, e não ruído.
     *
     * O que foi adaptado em relação à Emmy original: lá os ultrassons
     * entregavam 0–5 V proporcionais à distância, e a evidência saía direto
     * da tensão. O HC-SR04 é digital — dispara um pulso no trigger e mede a
     * largura do eco —, então a medida vira centímetros por software e só
     * depois entra no Universo de Discurso. A lógica, os 12 estados e os
     * tempos T1/T2/T3 são os do artigo.
     *
     * Chassi: o carrinho padrão de dois motores traseiros com roda boba na
     * frente. Sem direção esterçável, curva é diferença entre as rodas: para
     * girar no lugar, uma anda para a frente e a outra para trás.
     * ------------------------------------------------------------------ */
    {
        arquivo: '07-lpa2v-desvio-emmy.tbk',
        nome: 'LPA2v — desvio de obstáculo (Emmy adaptada, HC-SR04)',
        placa: 'uno',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distEsq' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distDir' }, v: { VALOR: N(0) } },

            /* ---- disparo dos dois HC-SR04 e conversão para centímetros ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'medirSensores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('LOW') },
                            c: 'sensor esquerdo: pulso de 10 us no trigger (pino 2), eco no pino 3'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distEsq' },
                            c: 'ida e volta do som: 58 us por centimetro. O cast evita divisao inteira',
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '3', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        {
                            t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('LOW') },
                            c: 'sensor direito: trigger no pino 4, eco no pino 8'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distDir' },
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '8', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        {
                            t: 'controls_if',
                            c: 'sem eco o pulseIn devolve 0. Zero centimetro seria "obstaculo\n' +
                                'colado" - o oposto do que aconteceu. Vira 400 cm, que e o alcance\n' +
                                'maximo do sensor e significa "nao tem nada ai"',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'variables_get', f: { VAR: 'distEsq' } }, B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'distEsq' }, v: { VALUE: N(400) } }] }
                        },
                        {
                            t: 'controls_if',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'variables_get', f: { VAR: 'distDir' } }, B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'distDir' }, v: { VALUE: N(400) } }] }
                        }
                    ]
                }
            },

            /* ---- os quatro movimentos do carrinho ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'pararMotores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '5' }, v: { VALOR: N(0) },
                            c: 'velocidade zero nos dois: ENA (pino 5) e ENB (pino 6) do L298N'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '6' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarFrente', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') },
                            c: 'sentido do motor esquerdo: IN1 alto e IN2 baixo = para a frente'
                        },
                        { t: 'ard_digitalwrite', f: { PIN: '12' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('HIGH') },
                            c: 'sentido do motor direito: IN3 alto e IN4 baixo'
                        },
                        { t: 'ard_digitalwrite', f: { PIN: '10' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_analogwrite', f: { PIN: '5' }, v: { VALOR: N(200) } },
                        { t: 'ard_analogwrite', f: { PIN: '6' }, v: { VALOR: N(200) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarDevagar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') },
                            c: 'mesmo sentido, metade da velocidade: e assim que se dilui contradicao'
                        },
                        { t: 'ard_digitalwrite', f: { PIN: '12' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_digitalwrite', f: { PIN: '10' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_analogwrite', f: { PIN: '5' }, v: { VALOR: N(110) } },
                        { t: 'ard_analogwrite', f: { PIN: '6' }, v: { VALOR: N(110) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'darRe', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') },
                            c: 'os dois invertidos: IN1 baixo e IN2 alto'
                        },
                        { t: 'ard_digitalwrite', f: { PIN: '12' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_digitalwrite', f: { PIN: '10' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_analogwrite', f: { PIN: '5' }, v: { VALOR: N(160) } },
                        { t: 'ard_analogwrite', f: { PIN: '6' }, v: { VALOR: N(160) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'girarDireita', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') },
                            c: 'esquerdo para a frente e direito para tras: o carrinho gira no\n' +
                                'proprio eixo. Com roda boba na frente nao ha o que esterçar,\n' +
                                'entao curva e diferenca entre as duas rodas de tras'
                        },
                        { t: 'ard_digitalwrite', f: { PIN: '12' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_digitalwrite', f: { PIN: '9' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_digitalwrite', f: { PIN: '10' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_analogwrite', f: { PIN: '5' }, v: { VALOR: N(170) } },
                        { t: 'ard_analogwrite', f: { PIN: '6' }, v: { VALOR: N(170) } }
                    ]
                }
            },

            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '2', MODO: 'OUTPUT' },
                            c: 'Robo Emmy adaptado (Da Silva Filho). Proposicao: "existe\n' +
                                'obstaculo a frente". Chassi: carrinho de 2 motores traseiros\n' +
                                'com roda boba na frente.\n' +
                                'Sensores: HC-SR04 esquerdo trig 2 / echo 3, direito trig 4 /\n' +
                                'echo 8, lado a lado apontados para a frente.\n' +
                                'Ponte H L298N: ENA 5 e ENB 6 (velocidade, tem de ser pino PWM),\n' +
                                'IN1 7 / IN2 12 (sentido do motor esquerdo),\n' +
                                'IN3 9 / IN4 10 (sentido do motor direito).\n' +
                                'Alimente os motores pela fonte do L298N, nao pelo 5V do Arduino'
                        },
                        { t: 'ard_pinmode', f: { PIN: '3', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '4', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '8', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '5', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '6', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '7', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '12', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '9', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '10', MODO: 'OUTPUT' } },
                        { t: 'ard_call', f: { NOME: 'pararMotores' }, c: 'nasce parado' }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        { t: 'ard_call', f: { NOME: 'medirSensores' } },
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('esq:') },
                            c: 'as duas distancias no Monitor, para conferir o alinhamento dos sensores'
                        },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'distEsq' } } } },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T(' dir:') } },
                        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'distDir' } } } },
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('mu:') },
                            c: 'A MESMA anotacao que o Para-Analisador vai usar logo abaixo,\n' +
                                'mandada para a aba Reticulado: mu = evidencia do sensor esquerdo,\n' +
                                'lambda = complemento da evidencia do direito. Sao contas sobre as\n' +
                                'distancias ja guardadas, entao nao dispara os sensores de novo e o\n' +
                                'ponto plotado e exatamente o que decide o movimento'
                        },
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' },
                            v: {
                                VALOR: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: { t: 'variables_get', f: { VAR: 'distEsq' } }, A1: N(80), A2: N(10) }
                                }
                            }
                        },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T(' lambda:') } },
                        {
                            t: 'ard_serial_println', f: { PORTA: 'Serial' },
                            v: {
                                VALOR: {
                                    t: 'lp_complemento',
                                    v: {
                                        MU: {
                                            t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                            v: { X: { t: 'variables_get', f: { VAR: 'distDir' } }, A1: N(80), A2: N(10) }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            t: 'lp_para_analisador_simples',
                            f: { RES: '12' },
                            c: 'Universo de Discurso invertido de proposito: 80 cm (longe, sem\n' +
                                'evidencia) a 10 cm (colado, evidencia total). Como a2 < a1, a\n' +
                                'valoracao ja sai invertida sozinha - perto vira evidencia alta',
                            v: {
                                S1: { t: 'variables_get', f: { VAR: 'distEsq' } },
                                S2: { t: 'variables_get', f: { VAR: 'distDir' } },
                                A1: N(80), A2: N(10)
                            },
                            s: {
                                CASOS: [
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('V: obstaculo — recuar e girar 90') },
                                                    c: 'os dois sensores concordam que ha obstaculo: recua e gira no eixo'
                                                },
                                                { t: 'ard_call', f: { NOME: 'pararMotores' } },
                                                { t: 'ard_delay', v: { MS: N(200) } },
                                                { t: 'ard_call', f: { NOME: 'darRe' } },
                                                { t: 'ard_delay', v: { MS: N(500) } },
                                                { t: 'ard_call', f: { NOME: 'girarDireita' } },
                                                { t: 'ard_delay', v: { MS: N(2000) }, c: 'T3 = 2 s: o giro de 90 graus do artigo' },
                                                { t: 'ard_call', f: { NOME: 'pararMotores' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('Qv->T: provavel obstaculo — girar 45') },
                                                    c: 'evidencia alta mas com discordancia: desvio parcial em vez de 90 graus'
                                                },
                                                { t: 'ard_call', f: { NOME: 'girarDireita' } },
                                                { t: 'ard_delay', v: { MS: N(1500) }, c: 'T2 = 1,5 s: meio giro, ~45 graus' },
                                                { t: 'ard_call', f: { NOME: 'pararMotores' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_F' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('F: livre — avancar') },
                                                    c: 'os dois concordam que nao ha nada: toca em frente'
                                                },
                                                { t: 'ard_call', f: { NOME: 'andarFrente' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_T' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('T: contradicao — avancar devagar') },
                                                    c: 'os dois veem coisas incompativeis. Contradicao alta nao manda\n' +
                                                        'parar: manda diluir a contradicao, andando devagar para as\n' +
                                                        'proximas leituras chegarem mais perto e desempatarem'
                                                },
                                                { t: 'ard_call', f: { NOME: 'andarDevagar' } },
                                                { t: 'ard_delay', v: { MS: N(750) }, c: 'T1 = 0,75 s' }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_PC' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('perp: conflito — parar') },
                                                    c: 'o perpendicular e a contradicao espelhada do T (Gct = mu1 - mu2),\n' +
                                                        'nao ausencia de leitura: um sensor ve obstaculo e o outro ve\n' +
                                                        'caminho livre. Um dos dois esta errado - na duvida, para'
                                                },
                                                { t: 'ard_call', f: { NOME: 'pararMotores' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_senao', s: {
                                            BODY: [
                                                {
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('demais estados — avancar devagar') },
                                                    c: 'os outros 7 estados do reticulado: evidencia fraca demais para\n' +
                                                        'decidir, entao anda devagar e mede de novo'
                                                },
                                                { t: 'ard_call', f: { NOME: 'andarDevagar' } }
                                            ]
                                        }
                                    }
                                ]
                            },
                            next: [{ t: 'ard_delay', v: { MS: N(100) }, c: 'respiro entre disparos do ultrassom' }]
                        }
                    ]
                }
            }
        ]
    },

    /* ==================================================================
     * APLICAÇÃO OFICIAL — esteira + dois ultrassons + braço de servos.
     *
     * A esteira roda; dois HC-SR04 montados lado a lado, apontados para o
     * mesmo ponto da esteira, medem a altura da peça que passa. Quanto mais
     * alta a peça, menor a distância lida — por isso o Universo de Discurso
     * vai de 25 cm (peça rasa) a 12 cm (peça alta).
     *
     * Os dois sensores são fontes REDUNDANTES sobre a mesma proposição
     * "a peça é grande" — é isso que faz o Grau de Contradição ter sentido:
     * se um diz alta e o outro diz rasa, não é dúvida, é conflito.
     *
     *   evidência de certeza  → o braço deposita (grande à esquerda,
     *                           pequena à direita)
     *   contradição alta (T)  → peça atravessada ou eco ruim: para a
     *                           esteira e chama o operador, sem arriscar
     *                           o braço numa peça mal lida
     *   indeterminação (⊥)    → nenhum eco: esteira vazia, segue rodando
     *
     * Ligações (Arduino Uno):
     *   2/3   trig/echo do sensor 1        4/8  trig/echo do sensor 2
     *   7     aciona a esteira (relé)      9    servo da base
     *   10    servo da garra
     * ================================================================== */
    {
        arquivo: '08-lpa2v-esteira-braco.tbk',
        nome: 'LPA2v — esteira, ultrassons e braço robótico',
        placa: 'uno',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'dist1' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'dist2' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'anguloDestino' }, v: { VALOR: N(90) } },

            /* ---- disparo dos dois HC-SR04 e conversão para centímetros ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'medirSensores', PARAMS: '' },
                s: {
                    BODY: [
                        // sensor 1: pulso de 10 µs no trigger, depois mede o eco
                        { t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '2' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'dist1' },
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        // o cast é o que evita a divisão inteira
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '3', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        // sensor 2
                        { t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('LOW') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '4' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'dist2' },
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '8', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        // Sem eco, o HC-SR04 estoura o tempo e pulseIn devolve 0.
                        // Zero centímetro seria "peça altíssima" — o oposto do que
                        // aconteceu. Vira distância longe, que é o que 0 significa.
                        {
                            t: 'controls_if',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'variables_get', f: { VAR: 'dist1' } }, B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'dist1' }, v: { VALUE: N(100) } }] }
                        },
                        {
                            t: 'controls_if',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'variables_get', f: { VAR: 'dist2' } }, B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'dist2' }, v: { VALUE: N(100) } }] }
                        }
                    ]
                }
            },

            /* ---- o braço pega a peça e larga no ângulo já decidido ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'depositar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') },
                            c: 'para a esteira: a garra nao pega peca em movimento'
                        },
                        {
                            t: 'ard_servo_write', f: { OBJ: 'garra' }, v: { ANGULO: N(60) },
                            c: 'garra: 60 graus = aberta'
                        },
                        { t: 'ard_delay', v: { MS: N(400) } },
                        {
                            t: 'ard_servo_write', f: { OBJ: 'base' }, v: { ANGULO: N(90) },
                            c: 'base: 90 graus = centro, sobre a esteira'
                        },
                        { t: 'ard_delay', v: { MS: N(600) } },
                        {
                            t: 'ard_servo_write', f: { OBJ: 'garra' }, v: { ANGULO: N(15) },
                            c: '15 graus = fechada: pegou a peca'
                        },
                        { t: 'ard_delay', v: { MS: N(500) } },
                        { t: 'ard_servo_write', f: { OBJ: 'base' }, v: { ANGULO: { t: 'variables_get', f: { VAR: 'anguloDestino' } } } },
                        { t: 'ard_delay', v: { MS: N(800) } },
                        {
                            t: 'ard_servo_write', f: { OBJ: 'garra' }, v: { ANGULO: N(60) },
                            c: 'abre: soltou no destino'
                        },
                        { t: 'ard_delay', v: { MS: N(400) } },
                        {
                            t: 'ard_servo_write', f: { OBJ: 'base' }, v: { ANGULO: N(90) },
                            c: 'volta ao centro para o proximo ciclo'
                        },
                        { t: 'ard_delay', v: { MS: N(600) } },
                        {
                            t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') },
                            c: 'religa a esteira'
                        }
                    ]
                }
            },

            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '9600' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '2', MODO: 'OUTPUT' },
                            c: 'Ligacao: 2/3 = ultrassom 1 (trig/echo) | 4/8 = ultrassom 2 |\n' +
                                'pino 7 = rele da esteira | pino 9 = servo da base |\n' +
                                'pino 10 = servo da garra'
                        },
                        { t: 'ard_pinmode', f: { PIN: '3', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '4', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '8', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '7', MODO: 'OUTPUT' } },
                        { t: 'ard_servo_attach', f: { OBJ: 'base', PIN: '9' } },
                        { t: 'ard_servo_attach', f: { OBJ: 'garra', PIN: '10' } },
                        { t: 'ard_servo_write', f: { OBJ: 'base' }, v: { ANGULO: N(90) } },
                        { t: 'ard_servo_write', f: { OBJ: 'garra' }, v: { ANGULO: N(60) } },
                        { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }     // liga a esteira
                    ]
                }
            },

            {
                t: 'ard_loop', s: {
                    BODY: [
                        { t: 'ard_call', f: { NOME: 'medirSensores' } },
                        // A proposição "a peça é grande" pressupõe que exista peça.
                        // Esteira vazia não é assunto da LPA2v: é ausência de sujeito,
                        // e se entrasse na análise viraria "F — peça pequena", com o
                        // braço tentando pegar o vazio.
                        {
                            t: 'controls_if',
                            v: {
                                IF0: {
                                    t: 'logic_operation', f: { OP: 'OR' },
                                    v: {
                                        A: { t: 'logic_compare', f: { OP: 'LT' }, v: { A: { t: 'variables_get', f: { VAR: 'dist1' } }, B: N(28) } },
                                        B: { t: 'logic_compare', f: { OP: 'LT' }, v: { A: { t: 'variables_get', f: { VAR: 'dist2' } }, B: N(28) } }
                                    }
                                }
                            },
                            s: {
                                DO0: [{
                            t: 'lp_para_analisador',
                            // fonte 2 chega como evidência FAVORÁVEL: o bloco a
                            // converte em desfavorável pelo complemento
                            f: { MODO: 'COMPL', RES: '12', C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5' },
                            v: {
                                MU: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: { t: 'variables_get', f: { VAR: 'dist1' } }, A1: N(25), A2: N(12) }
                                },
                                LAMBDA: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: { t: 'variables_get', f: { VAR: 'dist2' } }, A1: N(25), A2: N(12) }
                                }
                            },
                            s: {
                                CASOS: [
                                    /* --- certeza de peça grande: esquerda --- */
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('peca GRANDE -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('grande (sensores discordam um pouco) -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVPC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('grande (evidencia fraca) -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    /* --- certeza de peça pequena: direita --- */
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_F' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('peca PEQUENA -> direita') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(10) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QFT' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('pequena (sensores discordam um pouco) -> direita') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(10) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QFPC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('pequena (evidencia fraca) -> direita') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(10) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    /* --- contradição: os dois sensores brigam ---
                                     * Com λ = 1 − μ2, o Grau de Contradição é
                                     * exatamente μ1 − μ2. Então T e ⊥ são a MESMA
                                     * falha vista dos dois lados: em T o sensor 1
                                     * vê peça alta e o 2 vê rasa; em ⊥ é o inverso.
                                     * Nenhum dos dois significa "esteira vazia". */
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_T' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ALARME: sensor 1 ve alta, sensor 2 ve rasa') } },
                                                { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') } },
                                                { t: 'ard_delay', v: { MS: N(3000) } },
                                                { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_PC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ALARME: sensor 2 ve alta, sensor 1 ve rasa') } },
                                                { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') } },
                                                { t: 'ard_delay', v: { MS: N(3000) } },
                                                { t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }
                                            ]
                                        }
                                    },
                                    /* --- discordância moderada: deixa a peça seguir --- */
                                    {
                                        t: 'lp_senao', s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('altura ambigua — peca segue sem classificar') } }
                                            ]
                                        }
                                    }
                                ]
                            }
                                }]
                            }
                        },
                        // Nada sob os sensores: a esteira segue rodando.
                        {
                            t: 'controls_if',
                            v: {
                                IF0: {
                                    t: 'logic_operation', f: { OP: 'AND' },
                                    v: {
                                        A: { t: 'logic_compare', f: { OP: 'GTE' }, v: { A: { t: 'variables_get', f: { VAR: 'dist1' } }, B: N(28) } },
                                        B: { t: 'logic_compare', f: { OP: 'GTE' }, v: { A: { t: 'variables_get', f: { VAR: 'dist2' } }, B: N(28) } }
                                    }
                                }
                            },
                            s: { DO0: [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('esteira vazia') } }] }
                        },
                        { t: 'ard_delay', v: { MS: N(150) } }
                    ]
                }
            }
        ]
    },

    /* ==================================================================
     * A MESMA esteira, agora em Modo Abstrato.
     *
     * Existe para comparação lado a lado com o 08: abra os dois e olhe o
     * painel de código. O programa é outro na tela e quase o mesmo no .ino —
     * o que o Modo Abstrato faz é tirar do aluno as decisões que não são
     * dele (declarar pino, abrir a serial, montar o pulso do ultrassom).
     * ================================================================== */
    {
        arquivo: '09-abstrato-esteira-braco.tbk',
        nome: 'Abstrato — esteira, ultrassons e braço',
        placa: 'uno',
        modo: 'abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_mostrar', f: { ROTULO: 'esteira' }, v: { VALOR: N(1) },
                            c: 'Ligacao: pino 7 = rele da esteira | 2/3 = ultrassom 1 (trig/echo) |\n' +
                                '4/8 = ultrassom 2 | 9 = servo da base | 10 = servo da garra'
                        },
                        { t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' }, c: 'liga a esteira' },
                        // As duas evidências viram caixas para serem usadas duas
                        // vezes por ciclo — no reticulado e na análise — sem
                        // disparar os ultrassons de novo. 0,5 é o valor de "sem
                        // informação" da LPA2v: antes da primeira medida, as
                        // caixas já valem exatamente o que significa não saber.
                        { t: 'abs_criar', f: { VAR: 'evidencia1' }, v: { VALOR: N(0.5) } },
                        { t: 'abs_criar', f: { VAR: 'evidencia2' }, v: { VALOR: N(0.5) } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                    // Mede uma vez por ciclo e guarda. Universo de Discurso de
                    // 25 cm (peça rasa) a 12 cm (peça alta): mais alta, mais
                    // perto do sensor.
                    {
                        t: 'abs_definir', f: { VAR: 'evidencia1' },
                        c: 'sensor 1 (trig 2, echo 3). 25 cm = peca rasa, 12 cm = peca alta:\n' +
                            'quanto mais alta a peca, mais perto do sensor e maior a evidencia',
                        v: {
                            VALOR: {
                                t: 'abs_evidencia',
                                v: {
                                    X: { t: 'abs_distancia', f: { TRIG: '2', ECHO: '3' } },
                                    A1: N(25), A2: N(12)
                                }
                            }
                        }
                    },
                    {
                        t: 'abs_definir', f: { VAR: 'evidencia2' },
                        c: 'sensor 2 (trig 4, echo 8), mesmo Universo de Discurso',
                        v: {
                            VALOR: {
                                t: 'abs_evidencia',
                                v: {
                                    X: { t: 'abs_distancia', f: { TRIG: '4', ECHO: '8' } },
                                    A1: N(25), A2: N(12)
                                }
                            }
                        }
                    },
                    // O ponto plotado é o mesmo que decide, porque sai das
                    // caixas. Aqui o λ precisa ser explícito: o bloco do
                    // reticulado recebe a anotação (μ, λ) pronta, enquanto o
                    // "quando o estado for" faz o complemento 1 − μ2 por dentro.
                    {
                        t: 'abs_mostrar_reticulado',
                        v: {
                            MU: { t: 'abs_ler', f: { VAR: 'evidencia1' } },
                            LAMBDA: {
                                t: 'abs_conta', f: { OP: '-' },
                                v: { A: N(1), B: { t: 'abs_ler', f: { VAR: 'evidencia2' } } }
                            }
                        }
                    },
                    // Portão de presença. Sem ele a esteira vazia é analisada:
                    // longe dos dois sensores as evidências valem 0, o que dá
                    // Gc = -1, ou seja F — e o braço passaria o dia depositando
                    // peça nenhuma à direita. A evidência só sai de zero quando
                    // algo entra no Universo de Discurso, então "alguma acima de
                    // zero" é exatamente "tem peça na frente de algum sensor".
                    {
                        t: 'abs_se',
                        c: 'so analisa quando ha peca: esteira vazia daria F (peca pequena)',
                        v: {
                            COND: {
                                t: 'abs_logico', f: { OP: 'OR' },
                                v: {
                                    A: {
                                        t: 'abs_comparar', f: { OP: 'GT' },
                                        v: { A: { t: 'abs_ler', f: { VAR: 'evidencia1' } }, B: N(0) }
                                    },
                                    B: {
                                        t: 'abs_comparar', f: { OP: 'GT' },
                                        v: { A: { t: 'abs_ler', f: { VAR: 'evidencia2' } }, B: N(0) }
                                    }
                                }
                            }
                        },
                        s: {
                            ENTAO: [{
                                t: 'abs_quando_estado',
                                c: 'mu = sensor 1, lambda = 1 - sensor 2 (o bloco faz o complemento)',
                                v: {
                                    MU1: { t: 'abs_ler', f: { VAR: 'evidencia1' } },
                                    MU2: { t: 'abs_ler', f: { VAR: 'evidencia2' } }
                                },
                                s: {
                                    CASOS: [
                                        {
                                            t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: {
                                                BODY: [
                                                    {
                                                        t: 'abs_mostrar', f: { ROTULO: 'peca' }, v: { VALOR: N(1) },
                                                        c: 'V: os dois sensores veem peca alta -> esquerda'
                                                    }
                                                ].concat(depositarAbs(170))
                                            }
                                        },
                                        {
                                            t: 'abs_caso_estado', f: { ESTADO: 'LPA_F' }, s: {
                                                BODY: [
                                                    {
                                                        t: 'abs_mostrar', f: { ROTULO: 'peca' }, v: { VALOR: N(0) },
                                                        c: 'F: os dois veem peca rasa -> direita'
                                                    }
                                                ].concat(depositarAbs(10))
                                            }
                                        },
                                        {
                                            // T e ⊥ são a mesma discordância espelhada:
                                            // sensor discordando é sensor suspeito.
                                            t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' },
                                            s: { BODY: alarmeAbs(1) }
                                        },
                                        {
                                            t: 'abs_caso_estado', f: { ESTADO: 'LPA_PC' },
                                            s: { BODY: alarmeAbs(2) }
                                        }
                                    ]
                                }
                            }]
                        },
                        next: [{
                            t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(150) },
                            c: 'respiro entre leituras do ultrassom'
                        }]
                    }]
                }
            }
        ]
    }
];

const destino = path.join(RAIZ, 'exemplos');
fs.mkdirSync(destino, { recursive: true });

EXEMPLOS.forEach(ex => {
    Boards.selecionar(ex.placa);
    const ws = novoWorkspace(Bk, ex.specs);

    // Posiciona os blocos de topo. Sem renderização não dá para medir altura,
    // então o espaçamento é estimado pela quantidade de blocos dentro de cada um.
    let y = 40;
    ws.getTopBlocks(true).forEach(b => {
        b.moveBy(40, y);
        const dentro = b.getDescendants(false).length;
        y += b.type === 'ard_var_global' ? 70 : (120 + dentro * 42);
    });

    const conteudo = {
        formato: 'taskarduino/1',
        salvoEm: new Date().toISOString(),
        placa: ex.placa,
        modo: ex.modo || 'literal',
        nome: ex.nome,
        workspace: Bk.serialization.workspaces.save(ws)
    };

    const arq = path.join(destino, ex.arquivo);
    fs.writeFileSync(arq, JSON.stringify(conteudo, null, 2), 'utf8');
    console.log('✓ ' + path.relative(RAIZ, arq) + '  (' + Boards.get(ex.placa).nome + ')');
});

console.log('\n' + EXEMPLOS.length + ' exemplos gerados em exemplos/');
