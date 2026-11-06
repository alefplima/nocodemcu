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
const G = nome => ({ t: 'variables_get', f: { VAR: nome } });
const L = nome => ({ t: 'abs_ler', f: { VAR: nome } });

/**
 * A sequência de pegar e depositar, em Modo Abstrato.
 *
 * No exemplo 08 (literal) isto é a função depositar(), escrita uma vez e
 * chamada nos dois destinos. O Modo Abstrato não tem blocos de função — é
 * justamente o que ele abre mão em troca da simplicidade —, então a sequência
 * aparece inteira em cada caso. Aqui ela é montada por uma função do gerador
 * de exemplos para que os dois lados não possam divergir.
 *
 * A esteira já chega parada aqui: quem a para é o portão de presença, antes
 * de medir, e quem a religa é a linha única no fim do ciclo. Por isso esta
 * sequência não mexe no relé — se mexesse, cada estado teria de lembrar de
 * religar, e o estado que ninguém tratou deixaria a esteira parada para sempre.
 */
const depositarAbs = destino => [
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
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(600) } }
];

/** O alarme: segura a esteira (ja parada) por 3 s. Usado em T e em ⊥. */
const alarmeAbs = n => [
    { t: 'abs_mostrar', f: { ROTULO: 'alarme' }, v: { VALOR: N(n) } },
    {
        t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(3) },
        c: 'esteira ja esta parada: segura 3 s para o operador olhar'
    }
];

/**
 * Emmy no ESP32 — os movimentos em Modo Abstrato, com velocidade por PWM.
 *
 * A ponte H desta montagem só recebe IN1..IN4 (2 / 4 / 18 / 19); ENA e ENB
 * ficam nos jumpers de 5 V, sempre habilitados. Sem os enables, a velocidade
 * é controlada no próprio pino de sentido: o lado que anda recebe PWM e o
 * outro fica em zero. Trocar os dois de papel inverte o sentido.
 *
 * No ESP32 (core 3.x) a intensidade vira LEDC por dentro do analogWrite. Por
 * isso os quatro pinos são SEMPRE escritos por intensidade, nunca por
 * digitalWrite: misturar as duas coisas no mesmo pino deixa o LEDC ligado e a
 * escrita digital sem efeito.
 *
 * O Modo Abstrato não tem blocos de função, então cada movimento aparece
 * inteiro em cada caso; montá-los aqui evita que os casos divirjam.
 */
/*
 * Emmy 2 — o desvio completo (a manobra do estado V), em Modo Abstrato.
 *
 * Aparece em dois lugares: no estado V e no seguro contra travamento. Montado
 * aqui uma vez para os dois não divergirem, como no exemplo 12, onde isso é a
 * função desviar().
 */
const desviarAbs = comentario => [
    { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) }, c: comentario },
    { t: 'abs_web_esperar', v: { MS: N(200) } },
    { t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') } },
    { t: 'abs_web_esperar', v: { MS: N(500) } },
    { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
    {
        t: 'abs_web_esperar', v: { MS: N(2000) },
        c: 'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido\n' +
            'com VEL_GIRO nesta bancada - mexeu na velocidade, remeca o angulo'
    },
    { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
];

/*
 * Emmy 2 — a marcha lenta com empurrão, em Modo Abstrato.
 *
 * Sair do lugar e andar não são a mesma coisa: parado, o L298N não vence o
 * atrito com a intensidade baixa em que o robô deve andar, e o motor fica
 * zumbindo. Por isso a partida passa pelo empurrão de VEL_ARRANQUE e só depois
 * assenta em VELOCIDADE — é o mesmo andarDevagar() do exemplo 12.
 *
 * Onde ele NÃO entra: no estado F. Lá o robô já está rolando e o ciclo se
 * repete várias vezes por segundo; repetir o empurrão a cada volta faz o carro
 * andar aos trancos, em vez de andar. O empurrão é dos estados que arrancam
 * depois de uma manobra que terminou parada.
 */
const arrancarAbs = comentario => [
    {
        t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VEL_ARRANQUE') },
        c: comentario
    },
    { t: 'abs_web_esperar', v: { MS: N(80) } },
    { t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VELOCIDADE') } }
];

/*
 * Carro 4x4 (exemplo 15) — o desvio conta.
 *
 * Mesma manobra da Emmy (para, ré, giro de ~90 graus), com duas diferenças:
 * o tempo do giro é uma caixa (TEMPO_GIRO), porque o giro de um 4x4 arrasta as
 * rodas de lado e varia muito com o piso; e todo desvio soma 1 em "desvios",
 * que é de onde sai a conclusão de que o carro está preso.
 */
const desviar4x4 = comentario => [
    {
        t: 'abs_definir', f: { VAR: 'desvios' },
        c: comentario,
        v: { VALOR: { t: 'abs_conta', f: { OP: '+' }, v: { A: L('desvios'), B: N(1) } } }
    },
    { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } },
    { t: 'abs_web_esperar', v: { MS: N(200) } },
    { t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') } },
    { t: 'abs_web_esperar', v: { MS: N(400) } },
    { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
    { t: 'abs_web_esperar', v: { MS: L('TEMPO_GIRO') } },
    { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
];

/** Um botão de direção da página: enquanto o dedo está em cima, ele manda. */
const botao4x4 = (nome, manobra, vel, comentario) => ({
    t: 'abs_se', c: comentario,
    v: { COND: { t: 'abs_web_botao', f: { NOME: nome } } },
    s: {
        ENTAO: [
            { t: 'abs_motores', f: { MANOBRA: manobra }, v: { VEL: L(vel) } },
            { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(1) } }
        ]
    }
});

/*
 * Modo operador: o carro só anda enquanto há um dedo num botão. Soltou, para —
 * e fica parado, sem a LPA2v voltar sozinha: foi ela que se declarou presa.
 * Quem devolve o volante é o operador, no botão "liberar".
 */
const operador4x4 = () => [
    { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(0) } },
    botao4x4('frente', 'FRENTE', 'VELOCIDADE',
        'os quatro botoes valem enquanto o dedo esta em cima, como na Emmy 2'),
    botao4x4('tras', 'RE', 'VEL_RE'),
    botao4x4('esquerda', 'ESQ', 'VEL_GIRO'),
    botao4x4('direita', 'DIR', 'VEL_GIRO'),
    {
        t: 'abs_se',
        c: 'dedo fora da tela: o carro para e espera o operador',
        v: { COND: { t: 'abs_comparar', f: { OP: 'EQ' }, v: { A: L('manual'), B: N(0) } } },
        s: { ENTAO: [{ t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }] }
    },
    {
        t: 'abs_se',
        c: '"liberar": o operador tirou o carro do canto e devolve o volante.\n' +
            'Os contadores recomecam do zero e o video sai da pagina',
        v: { COND: { t: 'abs_web_botao', f: { NOME: 'liberar' } } },
        s: {
            ENTAO: [
                { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } },
                { t: 'abs_definir', f: { VAR: 'preso' }, v: { VALOR: N(0) } },
                { t: 'abs_definir', f: { VAR: 'desvios' }, v: { VALOR: N(0) } },
                { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } },
                { t: 'abs_web_camera_esconder' }
            ]
        }
    }
];

/*
 * Modo LPA2v: a análise da Emmy 2 (exemplo 13), estado por estado, com o
 * contador de desvios no lugar onde o carro desvia e o portão "preso" no fim.
 */
const lpa4x4 = () => [{
    t: 'abs_quando_estado',
    c: 'mu = sensor esquerdo, lambda = 1 - sensor direito (o bloco faz o\n' +
        'complemento). Gc = consenso dos dois; Gct = discordancia entre eles',
    v: { MU1: L('evidEsq'), MU2: L('evidDir') },
    s: {
        CASOS: [
            {
                t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: {
                    BODY: [{
                        t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) }
                    }].concat(desviar4x4('V: os dois veem obstaculo -> conta o desvio, recua e gira'))
                }
            },
            {
                t: 'abs_caso_estado', f: { ESTADO: 'LPA_QVT' }, s: {
                    BODY: [
                        {
                            t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') },
                            c: 'quase-verdadeiro comecando a divergir: meio giro antes de virar contradicao'
                        },
                        { t: 'abs_web_esperar', v: { MS: N(400) } },
                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
                    ]
                }
            },
            {
                t: 'abs_caso_estado', f: { ESTADO: 'LPA_F' }, s: {
                    BODY: [
                        { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } },
                        {
                            t: 'abs_definir', f: { VAR: 'desvios' }, v: { VALOR: N(0) },
                            c: 'caminho livre: o desvio anterior deu certo, a contagem recomeca'
                        },
                        {
                            t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VELOCIDADE') },
                            c: 'F: os dois veem caminho livre -> toca em frente (sem empurrao,\n' +
                                'para nao andar aos trancos)'
                        }
                    ]
                }
            },
            {
                t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: {
                    BODY: arrancarAbs('T: contradicao -> avanca devagar para as leituras desempatarem')
                        .concat([{ t: 'abs_web_esperar', v: { MS: N(500) } }])
                }
            },
            {
                t: 'abs_caso_estado', f: { ESTADO: 'LPA_PC' }, s: {
                    BODY: [
                        {
                            t: 'abs_definir', f: { VAR: 'desvios' },
                            c: 'um ve obstaculo e o outro ve livre: meia manobra para remedir.\n' +
                                'Tambem e desvio, e tambem conta',
                            v: { VALOR: { t: 'abs_conta', f: { OP: '+' }, v: { A: L('desvios'), B: N(1) } } }
                        },
                        { t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') } },
                        { t: 'abs_web_esperar', v: { MS: N(300) } },
                        { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
                        { t: 'abs_web_esperar', v: { MS: N(400) } },
                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
                    ]
                }
            },
            {
                t: 'abs_senao_estado', s: {
                    BODY: arrancarAbs('regioes intermediarias do reticulado: seguir devagar e remedir')
                        .concat([{ t: 'abs_web_esperar', v: { MS: N(200) } }])
                }
            }
        ]
    },
    next: [
        {
            t: 'abs_se',
            c: 'o seguro da Emmy 2: ciclos demais sem decidir, desvia (e conta)',
            v: { COND: { t: 'abs_comparar', f: { OP: 'GTE' }, v: { A: L('semDecidir'), B: L('LIMITE_TRAVA') } } },
            s: {
                ENTAO: desviar4x4(null).concat([
                    { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } }
                ])
            }
        },
        {
            t: 'abs_definir', f: { VAR: 'semDecidir' },
            v: { VALOR: { t: 'abs_conta', f: { OP: '+' }, v: { A: L('semDecidir'), B: N(1) } } }
        },
        {
            t: 'abs_se',
            c: 'PRESO: desviou LIMITE_PRESO vezes e nunca achou caminho livre.\n' +
                'O carro para, a camera abre no celular e o operador assume',
            v: { COND: { t: 'abs_comparar', f: { OP: 'GTE' }, v: { A: L('desvios'), B: L('LIMITE_PRESO') } } },
            s: {
                ENTAO: [
                    { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } },
                    { t: 'abs_definir', f: { VAR: 'preso' }, v: { VALOR: N(1) } },
                    { t: 'abs_web_camera_mostrar', f: { AVISO: 'PRESO: dirija pelos botoes e toque liberar' } }
                ]
            }
        }
    ]
}];

/* ======================================================================
 * Carro 4x4 em tarefas (exemplo 16).
 *
 * O programa do exemplo 15, o mesmo comportamento, partido em tarefas com
 * nome: o "Sempre" fica com uma linha por etapa do ciclo, e cada etapa cabe
 * numa tela. Sem os comentários do 15, que lá explicam a calibração e aqui
 * só tirariam espaço das figuras do artigo.
 * ====================================================================== */

/** Tira os comentários de uma árvore de specs. */
const semComentario = spec => {
    if (Array.isArray(spec)) return spec.map(semComentario);
    if (!spec || typeof spec !== 'object') return spec;
    const out = {};
    Object.keys(spec).forEach(k => {
        if (k === 'c') return;
        const v = spec[k];
        if (k === 's' || k === 'v') {
            out[k] = {};
            Object.keys(v).forEach(n => { out[k][n] = semComentario(v[n]); });
        } else if (k === 'next') {
            out[k] = semComentario(v);
        } else {
            out[k] = v;
        }
    });
    return out;
};

const fazer = nome => ({ t: 'abs_fazer_tarefa', f: { NOME: nome } });
const tarefa = (nome, corpo) => ({ t: 'abs_tarefa', f: { NOME: nome }, s: { BODY: corpo } });
const somar1 = caixa => ({
    t: 'abs_definir', f: { VAR: caixa },
    v: { VALOR: { t: 'abs_conta', f: { OP: '+' }, v: { A: L(caixa), B: N(1) } } }
});
const parar = () => ({ t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } });

const TAREFAS_4X4 = [
    tarefa('ligar a rede e a câmera', [
        { t: 'abs_wifi_rede_aberta', f: { NOME: 'carro4x4' } },
        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } },
        { t: 'abs_camera_ligar', f: { TAMANHO: 'FRAMESIZE_VGA', GIRAR: '1' } }
    ]),
    tarefa('medir as distâncias', [
        { t: 'abs_definir', f: { VAR: 'distEsq' }, v: { VALOR: { t: 'abs_distancia', f: { TRIG: '14', ECHO: '21' } } } },
        { t: 'abs_web_esperar', v: { MS: N(60) } },
        { t: 'abs_definir', f: { VAR: 'distDir' }, v: { VALOR: { t: 'abs_distancia', f: { TRIG: '47', ECHO: '40' } } } },
        { t: 'abs_web_mostrar', f: { ROTULO: 'esq' }, v: { VALOR: L('distEsq') } },
        { t: 'abs_web_mostrar', f: { ROTULO: 'dir' }, v: { VALOR: L('distDir') } }
    ]),
    tarefa('calcular as evidências', [
        {
            t: 'abs_definir', f: { VAR: 'evidEsq' },
            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distEsq'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
        },
        {
            t: 'abs_definir', f: { VAR: 'evidDir' },
            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distDir'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
        },
        {
            t: 'abs_web_reticulado',
            v: { MU: L('evidEsq'), LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evidDir') } } }
        }
    ]),
    tarefa('dirigir pela LPA2v', [{
        t: 'abs_quando_estado',
        v: { MU1: L('evidEsq'), MU2: L('evidDir') },
        s: {
            CASOS: [
                {
                    t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: {
                        BODY: [{ t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } }, fazer('desviar')]
                    }
                },
                {
                    t: 'abs_caso_estado', f: { ESTADO: 'LPA_QVT' }, s: {
                        BODY: [
                            { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
                            { t: 'abs_web_esperar', v: { MS: N(400) } },
                            parar()
                        ]
                    }
                },
                {
                    t: 'abs_caso_estado', f: { ESTADO: 'LPA_F' }, s: {
                        BODY: [
                            { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } },
                            { t: 'abs_definir', f: { VAR: 'desvios' }, v: { VALOR: N(0) } },
                            { t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VELOCIDADE') } }
                        ]
                    }
                },
                {
                    t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: {
                        BODY: [fazer('arrancar devagar'), { t: 'abs_web_esperar', v: { MS: N(500) } }]
                    }
                },
                {
                    t: 'abs_caso_estado', f: { ESTADO: 'LPA_PC' }, s: {
                        BODY: [
                            somar1('desvios'),
                            { t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') } },
                            { t: 'abs_web_esperar', v: { MS: N(300) } },
                            { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
                            { t: 'abs_web_esperar', v: { MS: N(400) } },
                            parar()
                        ]
                    }
                },
                {
                    t: 'abs_senao_estado', s: {
                        BODY: [fazer('arrancar devagar'), { t: 'abs_web_esperar', v: { MS: N(200) } }]
                    }
                }
            ]
        }
    }]),
    tarefa('conferir se está preso', [
        {
            t: 'abs_se',
            v: { COND: { t: 'abs_comparar', f: { OP: 'GTE' }, v: { A: L('semDecidir'), B: L('LIMITE_TRAVA') } } },
            s: { ENTAO: [fazer('desviar'), { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } }] }
        },
        somar1('semDecidir'),
        {
            t: 'abs_se',
            v: { COND: { t: 'abs_comparar', f: { OP: 'GTE' }, v: { A: L('desvios'), B: L('LIMITE_PRESO') } } },
            s: {
                ENTAO: [
                    parar(),
                    { t: 'abs_definir', f: { VAR: 'preso' }, v: { VALOR: N(1) } },
                    { t: 'abs_web_camera_mostrar', f: { AVISO: 'PRESO: dirija pelos botoes e toque liberar' } }
                ]
            }
        }
    ]),
    tarefa('desviar', semComentario(desviar4x4(null))),
    tarefa('arrancar devagar', semComentario(arrancarAbs(null))),
    tarefa('dirigir pelo operador', semComentario(operador4x4())),
    tarefa('ver se o operador assumiu', [{
        t: 'abs_se',
        v: { COND: { t: 'abs_web_botao', f: { NOME: 'assumir' } } },
        s: {
            ENTAO: [
                { t: 'abs_definir', f: { VAR: 'preso' }, v: { VALOR: N(1) } },
                { t: 'abs_web_camera_mostrar', f: { AVISO: 'controle manual: toque liberar para devolver' } }
            ]
        }
    }]),
    tarefa('mostrar o estado na página', [
        { t: 'abs_web_mostrar', f: { ROTULO: 'desvios' }, v: { VALOR: L('desvios') } },
        { t: 'abs_web_mostrar', f: { ROTULO: 'preso' }, v: { VALOR: L('preso') } }
    ])
];

const motorAbs = (in1, in2, in3, in4, comentario) => [
    { t: 'abs_escrita_analogica', f: { PIN: '2' }, v: { PCT: in1 }, c: comentario },
    { t: 'abs_escrita_analogica', f: { PIN: '4' }, v: { PCT: in2 } },
    { t: 'abs_escrita_analogica', f: { PIN: '18' }, v: { PCT: in3 } },
    { t: 'abs_escrita_analogica', f: { PIN: '19' }, v: { PCT: in4 } }
];

const pararAbs = () => motorAbs(N(0), N(0), N(0), N(0),
    'IN1 2 / IN2 4 = motor esquerdo | IN3 18 / IN4 19 = motor direito.\nOs quatro em 0 %: parado');
const frenteAbs = () => motorAbs(L('VEL_FRENTE'), N(0), L('VEL_FRENTE'), N(0),
    'IN1 com intensidade e IN2 em zero (e IN3/IN4 igual): os dois motores\npara a frente, na velocidade da caixa VEL_FRENTE');
/**
 * Andar devagar tem duas partes: um empurrao curto e depois a marcha lenta.
 * Sair do zero exige mais torque que seguir andando — com VEL_LENTA sozinha o
 * motor so zumbia, e o robo parecia travar toda vez que a analise dava T.
 */
const devagarAbs = () => motorAbs(L('VEL_ARRANQUE'), N(0), L('VEL_ARRANQUE'), N(0),
    'o empurrao: tira o motor da inercia antes de assentar na marcha lenta')
    .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(80) } }])
    .concat(motorAbs(L('VEL_LENTA'), N(0), L('VEL_LENTA'), N(0),
        'assenta na marcha lenta: e assim que se dilui contradicao'));
const reAbs = () => motorAbs(N(0), L('VEL_RE'), N(0), L('VEL_RE'),
    'os dois lados trocados: marcha a re');
const girarDireitaAbs = () => motorAbs(L('VEL_GIRO'), N(0), N(0), L('VEL_GIRO'),
    'esquerdo para a frente e direito para tras: gira no proprio eixo');

/* ======================================================================
 * Peças da bancada de controle de qualidade (exemplo 14).
 *
 * O Modo Abstrato não tem blocos de função — é o que ele abre mão em troca
 * da simplicidade —, então uma sequência usada em cinco estados diferentes
 * apareceria escrita cinco vezes, e cinco cópias divergem na primeira
 * correção. Montá-las aqui é o mesmo recurso já usado em depositarAbs.
 * ====================================================================== */

/** A esteira parada: os dois sentidos da ponte H em zero. */
const pararEsteiraAbs = () => [
    { t: 'abs_escrita_analogica', f: { PIN: '5' }, v: { PCT: N(0) } },
    { t: 'abs_escrita_analogica', f: { PIN: '6' }, v: { PCT: N(0) } }
];

/** A esteira para a frente, na velocidade pedida (em %). */
const esteiraFrenteAbs = pct => [
    { t: 'abs_escrita_analogica', f: { PIN: '6' }, v: { PCT: N(0) } },
    { t: 'abs_escrita_analogica', f: { PIN: '5' }, v: { PCT: N(pct) } }
];

/** A esteira de ré, na velocidade pedida (em %). */
const esteiraReAbs = pct => [
    { t: 'abs_escrita_analogica', f: { PIN: '5' }, v: { PCT: N(0) } },
    { t: 'abs_escrita_analogica', f: { PIN: '6' }, v: { PCT: N(pct) } }
];

/**
 * As três lâmpadas de uma vez.
 *
 * Sempre as três, nunca só a que acende: uma lâmpada que ninguém apaga fica
 * acesa junto com a próxima, e duas acesas não são estado nenhum do
 * reticulado.
 */
const luzesAbs = (verde, amarelo, vermelho) => [
    { t: 'abs_escrita_digital', f: { PIN: '11', VALOR: verde } },
    { t: 'abs_escrita_digital', f: { PIN: '12', VALOR: amarelo } },
    { t: 'abs_escrita_digital', f: { PIN: '13', VALOR: vermelho } }
];

/**
 * O Grau de Evidência de UM sensor para a proposição "a peça mede entre
 * 1,0 e 1,5 cm".
 *
 * A proposição é uma FAIXA, e faixa não sai de uma normalização só: uma
 * rampa crescente diz "não é baixa demais" e cresce sem nunca voltar a
 * cair, de modo que uma peça de 3 cm teria evidência 1. São duas rampas
 * opostas, unidas pelo AND da LPA2v (minimização): a evidência é a menor
 * das duas, e basta um dos lados falhar para ela cair.
 *
 * Os limites trabalham em DISTÂNCIA, não em altura — é o que o ultrassom
 * entrega e é a convenção que a bancada já usa no exemplo 09. Peça mais
 * alta, distância menor.
 */
const evidFaixaAbs = caixa => ({
    t: 'abs_combinar', f: { OP: 'MIN' },
    v: {
        A: {
            t: 'abs_evidencia',
            v: { X: L(caixa), A1: L('UD_MIN1'), A2: L('UD_MIN2') }
        },
        B: {
            t: 'abs_evidencia',
            v: { X: L(caixa), A1: L('UD_MAX1'), A2: L('UD_MAX2') }
        }
    }
});

/**
 * O que fazer quando a análise NÃO conclui — os dez estados que não são
 * V nem F.
 *
 * É a resposta da Emmy à contradição alta, trazida para a esteira: não
 * decidir, diluir. Lá o robô avançava mais devagar e desviava em ângulo
 * parcial; aqui a peça volta alguns centímetros e reentra devagar, porque
 * o que produz a discordância entre os dois ultrassons é a peça passando
 * depressa e trepidando sob os sensores. Medir de novo em melhores
 * condições é barato; decidir errado, não.
 *
 * O contador existe porque diluir nem sempre funciona: sensor descalibrado
 * ou peça de face irregular devolve a mesma contradição para sempre, e a
 * esteira ficaria num vaivém eterno. Na terceira medida contraditória o
 * sistema para de insistir e rejeita — decisão conservadora, e registrada
 * como tal no monitor.
 */
const reavaliarAbs = () => [
    {
        t: 'abs_definir', f: { VAR: 'tentativas' },
        v: { VALOR: { t: 'abs_conta', f: { OP: '+' }, v: { A: L('tentativas'), B: N(1) } } }
    },
    ...luzesAbs('LOW', 'HIGH', 'LOW'),
    {
        t: 'abs_se_senao',
        v: {
            COND: {
                t: 'abs_comparar', f: { OP: 'GTE' },
                v: { A: L('tentativas'), B: N(3) }
            }
        },
        s: {
            ENTAO: [
                {
                    t: 'abs_mostrar', f: { ROTULO: 'contradicao insistente - rejeita por precaucao' },
                    v: { VALOR: N(3) }
                },
                ...luzesAbs('LOW', 'LOW', 'HIGH'),
                ...esteiraReAbs(70),
                {
                    t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(1500) },
                    c: 'de re o bastante para a peca sair pela entrada da esteira e\n' +
                        'cair na caixa de refugo. Se ela ficasse na lona, a esteira a\n' +
                        'traria de volta aos sensores e o ciclo se repetiria sem fim'
                },
                ...pararEsteiraAbs(),
                { t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(1) } },
                { t: 'abs_definir', f: { VAR: 'tentativas' }, v: { VALOR: N(0) } },
                ...esteiraFrenteAbs(100)
            ],
            SENAO: [
                ...esteiraReAbs(60),
                {
                    t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(400) },
                    c: 'recua o suficiente para a peca sair de baixo dos sensores'
                },
                ...pararEsteiraAbs(),
                { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(300) } },
                {
                    t: 'abs_escrita_analogica', f: { PIN: '5' }, v: { PCT: N(35) },
                    c: 'reentra a 35%: devagar, a peca trepida menos e os dois ecos se aproximam'
                },
                { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(500) } },
                ...pararEsteiraAbs()
            ]
        }
    }
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
     * A esteira roda; dois HC-SR04 olham de cima, montados a meio centímetro
     * um do outro ao longo da esteira, e medem a altura da peça que passa.
     * Quanto mais alta a peça, menor a distância lida — daí o Universo de
     * Discurso ser decrescente, de UD_RASA para UD_ALTA.
     *
     * A PROPOSIÇÃO é "a peça sob os sensores é alta". Alta, e não "grande":
     * olhando de cima, o ultrassom mede uma coisa só, a distância ao topo.
     * Largura, volume e massa ele não vê, e afirmá-las seria dizer mais do
     * que a evidência sustenta.
     *
     * Os dois sensores são fontes REDUNDANTES sobre essa proposição — não
     * sobre o mesmo PONTO, que o offset de meio centímetro separa, mas sobre
     * a mesma PEÇA. É o que faz o Grau de Contradição ter sentido, e a álgebra
     * mostra por quê: com λ = 1 − μ2,
     *
     *     Gc  = μ − λ     = μ1 + μ2 − 1   → consenso dos dois sensores
     *     Gct = μ + λ − 1 = μ1 − μ2       → discordância entre eles
     *
     * O Grau de Contradição é literalmente a diferença entre os sensores.
     *
     *   evidência de certeza  → o braço deposita (alta à esquerda,
     *                           rasa à direita)
     *   contradição (T)       → o sensor 1 vê alta e o 2 vê rasa: peça mal
     *                           posicionada, atravessada ou eco ruim. Para a
     *                           esteira e chama o operador, sem arriscar o
     *                           braço numa peça mal lida
     *   indeterminação (⊥)    → a MESMA falha espelhada: o sensor 2 vê alta
     *                           e o 1 vê rasa. Não é esteira vazia — vazia
     *                           nem chega à análise, o portão de presença
     *                           barra antes
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

            /* ---- calibração da bancada: os três números que mudam de esteira
             * para esteira. Ficam aqui, com nome, e não enfiados dentro dos
             * blocos que os usam. O método (normalizar, anotar, analisar) é o
             * mesmo em qualquer bancada; só estes valores são desta.
             *
             * Medidas desta esteira: sensores a 10 cm da lona, peça alta a 6 cm,
             * peça rasa a 8 cm.
             *
             * LIM_PECA responde "tem peça?" e é independente do Universo de
             * Discurso, que responde "a peça é alta ou rasa?". Enquanto os dois
             * eram o mesmo número (o antigo 28), mexer num estragava o outro. */
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'float', VAR: 'LIM_PECA' }, v: { VALOR: N(9) },
                c: 'abaixo disto ha peca sob o sensor; acima e a lona da esteira (10 cm)'
            },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'float', VAR: 'UD_RASA' }, v: { VALOR: N(8.5) },
                c: 'Universo de Discurso, limite inferior: peca rasa (8 cm) -> evidencia ~0'
            },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'float', VAR: 'UD_ALTA' }, v: { VALOR: N(5.5) },
                c: 'limite superior: peca alta (6 cm) -> evidencia ~1. Mais alta, mais perto'
            },

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
                        // O eco do sensor 1 ainda esta viajando pela bancada quando o
                        // 2 dispara. Sem esta pausa o pulseIn do 2 pode cronometrar
                        // o eco do 1 e devolver uma distancia que ninguem mediu —
                        // e os dois sensores estao a meio centimetro um do outro.
                        { t: 'ard_delay', v: { MS: N(60) } },
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
                            t: 'ard_servo_write', f: { OBJ: 'garra' }, v: { ANGULO: N(60) },
                            c: 'garra: 60 graus = aberta. A esteira ja chega parada:\n' +
                                'quem a para e o portao de presenca, antes de medir'
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
                        { t: 'ard_delay', v: { MS: N(600) } }
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
                        // A proposição "a peça é alta" pressupõe que exista peça.
                        // Esteira vazia não é assunto da LPA2v: é ausência de sujeito,
                        // e se entrasse na análise viraria "F — peça rasa", com o
                        // braço tentando pegar o vazio. Por isso a presença é decidida
                        // aqui, na distância crua, e não pelo Grau de Evidência: a
                        // existência do sujeito é pergunta anterior à anotação.
                        {
                            t: 'controls_if',
                            v: {
                                IF0: {
                                    t: 'logic_operation', f: { OP: 'OR' },
                                    v: {
                                        A: { t: 'logic_compare', f: { OP: 'LT' }, v: { A: { t: 'variables_get', f: { VAR: 'dist1' } }, B: G('LIM_PECA') } },
                                        B: { t: 'logic_compare', f: { OP: 'LT' }, v: { A: { t: 'variables_get', f: { VAR: 'dist2' } }, B: G('LIM_PECA') } }
                                    }
                                }
                            },
                            s: {
                                DO0: [
                                // Para ANTES de analisar. A peca e medida parada:
                                // com a esteira andando, os dois sensores leem em
                                // instantes e posicoes diferentes, e a discordancia
                                // que sobra e borrao de movimento, nao geometria.
                                {
                                    t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') },
                                    c: 'para a esteira antes de medir e de a garra descer'
                                },
                                { t: 'ard_delay', v: { MS: N(300) }, c: 'deixa a peca acomodar' },
                                {
                                    t: 'ard_call', f: { NOME: 'medirSensores' },
                                    c: 'remede com tudo parado: e esta leitura que vale'
                                },
                                {
                            t: 'lp_para_analisador',
                            // fonte 2 chega como evidência FAVORÁVEL: o bloco a
                            // converte em desfavorável pelo complemento
                            f: { MODO: 'COMPL', RES: '12', C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5' },
                            v: {
                                MU: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: G('dist1'), A1: G('UD_RASA'), A2: G('UD_ALTA') }
                                },
                                LAMBDA: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: G('dist2'), A1: G('UD_RASA'), A2: G('UD_ALTA') }
                                }
                            },
                            s: {
                                CASOS: [
                                    /* --- certeza de peça alta: esquerda --- */
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('peca ALTA -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('alta (sensores discordam um pouco) -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVPC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('alta (evidencia fraca) -> esquerda') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(170) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    /* --- certeza de peça rasa: direita --- */
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_F' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('peca RASA -> direita') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(10) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QFT' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('rasa (sensores discordam um pouco) -> direita') } },
                                                { t: 'variables_set', f: { VAR: 'anguloDestino' }, v: { VALUE: N(10) } },
                                                { t: 'ard_call', f: { NOME: 'depositar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QFPC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('rasa (evidencia fraca) -> direita') } },
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
                                                { t: 'ard_delay', v: { MS: N(3000) } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_PC' }, s: {
                                            BODY: [
                                                { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ALARME: sensor 2 ve alta, sensor 1 ve rasa') } },
                                                { t: 'ard_delay', v: { MS: N(3000) } }
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
                                },
                                // Religa aqui, e nao dentro de cada caso: o
                                // Para-Analisador tem 12 regioes e o switch trata
                                // 8. Se religar fosse tarefa dos casos, cair numa
                                // regiao nao tratada deixaria a esteira parada
                                // para sempre.
                                {
                                    t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') },
                                    c: 'religa a esteira, tenha sido qual for o estado'
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
                                        A: { t: 'logic_compare', f: { OP: 'GTE' }, v: { A: { t: 'variables_get', f: { VAR: 'dist1' } }, B: G('LIM_PECA') } },
                                        B: { t: 'logic_compare', f: { OP: 'GTE' }, v: { A: { t: 'variables_get', f: { VAR: 'dist2' } }, B: G('LIM_PECA') } }
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
                        // Os três números da bancada, com nome e num lugar só.
                        // Trocar de esteira ou de peça é editar estas três
                        // caixas; o resto do programa não muda uma vírgula.
                        // Medidas desta: lona a 10 cm, peça alta a 6, rasa a 8.
                        {
                            t: 'abs_criar', f: { VAR: 'LIM_PECA' }, v: { VALOR: N(9) },
                            c: 'abaixo de 9 cm ha peca; acima e a lona da esteira, a 10 cm'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_RASA' }, v: { VALOR: N(8.5) },
                            c: 'Universo de Discurso: 8,5 cm = peca rasa, evidencia perto de 0'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_ALTA' }, v: { VALOR: N(5.5) },
                            c: '5,5 cm = peca alta, evidencia perto de 1. Mais alta, mais perto'
                        },
                        // As distâncias cruas viram caixas porque cada uma é usada
                        // duas vezes: para decidir se há peça e para normalizar.
                        // Sem elas o ultrassom seria disparado de novo a cada uso.
                        { t: 'abs_criar', f: { VAR: 'dist1' }, v: { VALOR: N(100) } },
                        { t: 'abs_criar', f: { VAR: 'dist2' }, v: { VALOR: N(100) } },
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
                    // Uma medida barata só para saber se chegou peça. Ela usa a
                    // distância crua, não a evidência: "tem peça?" e "a peça é
                    // alta?" são duas perguntas, e cada uma tem o seu número.
                    {
                        t: 'abs_definir', f: { VAR: 'dist1' },
                        c: 'sensor 1 (trig 2, echo 3): so para ver se chegou peca',
                        v: { VALOR: { t: 'abs_distancia', f: { TRIG: '2', ECHO: '3' } } }
                    },
                    // Portão de presença. Sem ele a esteira vazia é analisada:
                    // a lona fica fora do Universo de Discurso, as evidências
                    // valem 0, o que dá Gc = -1, ou seja F — e o braço passaria
                    // o dia depositando peça nenhuma à direita.
                    {
                        t: 'abs_se',
                        c: 'so analisa quando ha peca: esteira vazia daria F (peca rasa)',
                        v: {
                            COND: {
                                t: 'abs_comparar', f: { OP: 'LT' },
                                v: { A: L('dist1'), B: L('LIM_PECA') }
                            }
                        },
                        s: {
                            ENTAO: [
                            // Para a esteira ANTES de medir para valer. Com ela
                            // andando, os dois sensores leem em instantes e
                            // posições diferentes, e a discordância que sobra é
                            // borrão de movimento, não geometria. Parada, o que
                            // o Para-Analisador vir de contradição é real.
                            {
                                t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'LOW' },
                                c: 'pino 7 = rele. Para a esteira antes de medir e de a garra descer'
                            },
                            { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(300) }, c: 'deixa a peca acomodar' },
                            {
                                t: 'abs_definir', f: { VAR: 'dist1' },
                                c: 'remede parado: e esta leitura que vale',
                                v: { VALOR: { t: 'abs_distancia', f: { TRIG: '2', ECHO: '3' } } }
                            },
                            // O eco do sensor 1 ainda viaja pela bancada quando o
                            // 2 dispara — e eles estão a meio centímetro um do
                            // outro. Sem a pausa, o 2 cronometra o eco do 1.
                            { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(60) }, c: 'evita o eco cruzado entre os dois sensores' },
                            {
                                t: 'abs_definir', f: { VAR: 'dist2' },
                                c: 'sensor 2 (trig 4, echo 8), meio centimetro a frente do 1',
                                v: { VALOR: { t: 'abs_distancia', f: { TRIG: '4', ECHO: '8' } } }
                            },
                            // Só agora as distâncias viram evidência. O Universo
                            // de Discurso é decrescente: quanto mais alta a peça,
                            // mais perto do sensor e maior o Grau de Evidência.
                            {
                                t: 'abs_definir', f: { VAR: 'evidencia1' },
                                c: 'normaliza a distancia do sensor 1 no Universo de Discurso',
                                v: { VALOR: { t: 'abs_evidencia', v: { X: L('dist1'), A1: L('UD_RASA'), A2: L('UD_ALTA') } } }
                            },
                            {
                                t: 'abs_definir', f: { VAR: 'evidencia2' },
                                c: 'sensor 2, mesmo Universo de Discurso',
                                v: { VALOR: { t: 'abs_evidencia', v: { X: L('dist2'), A1: L('UD_RASA'), A2: L('UD_ALTA') } } }
                            },
                            // O ponto plotado é o mesmo que decide, porque sai das
                            // caixas. Aqui o λ precisa ser explícito: o bloco do
                            // reticulado recebe a anotação (μ, λ) pronta, enquanto o
                            // "quando o estado for" faz o complemento 1 − μ2 por dentro.
                            {
                                t: 'abs_mostrar_reticulado',
                                v: {
                                    MU: L('evidencia1'),
                                    LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evidencia2') } }
                                }
                            },
                            {
                                t: 'abs_quando_estado',
                                c: 'mu = sensor 1, lambda = 1 - sensor 2 (o bloco faz o complemento)',
                                v: { MU1: L('evidencia1'), MU2: L('evidencia2') },
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
                            },
                            // Religa aqui, fora do "quando o estado for", e não
                            // dentro de cada caso. O Para-Analisador tem 12
                            // regiões e este switch trata 4: cair numa das outras
                            // 8 deixaria a esteira parada para sempre se religar
                            // fosse tarefa dos casos. Assim a peça ambígua só
                            // segue viagem sem ser classificada.
                            {
                                t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' },
                                c: 'religa a esteira, tenha sido qual for o estado'
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
    },

    /* ==================================================================
     * EMMY NO ESP32 — a mesma decisão do exemplo 07, na placa e na pinagem
     * da bancada atual.
     *
     * Proposição: "existe obstáculo à frente". Duas fontes redundantes
     * (dois HC-SR04 lado a lado, apontados para a frente) e o
     * Para-Analisador decidindo o movimento.
     *
     * Ligações (ESP32 DevKit WROOM-32):
     *   sensor 1 trig/echo   D26 / D27
     *   sensor 2 trig/echo   D32 / D33
     *   ponte H IN1/IN2      D2 / D4    (motor esquerdo)
     *   ponte H IN3/IN4      D18 / D19  (motor direito)
     *
     * ENA e ENB não entram na pinagem: ficam nos jumpers de 5 V, sempre
     * habilitados. A velocidade sai então do próprio pino de sentido — o
     * lado que anda recebe PWM e o outro fica em zero —, e é por isso que
     * os quatro IN são sempre escritos por analogWrite, nunca por
     * digitalWrite: no ESP32 o analogWrite prende o pino ao LEDC, e uma
     * escrita digital depois disso não teria efeito.
     *
     * As quatro velocidades ficam em variáveis com nome, no topo: são os
     * números que mudam de chassi para chassi. Abaixo de ~70 a maioria dos
     * motores com L298N nem sai do lugar (a ponte já come de 1,5 a 2 V);
     * se o carrinho travar em vez de andar devagar, é VEL_LENTA que sobe.
     *
     * O echo do HC-SR04 devolve 5 V e o ESP32 é de 3,3 V: use divisor
     * resistivo (1k / 2k) ou conversor de nível em D27 e D33. O trigger
     * pode ir direto. Alimente os motores pela fonte da ponte H.
     * ================================================================== */
    {
        arquivo: '10-lpa2v-emmy-esp32.tbk',
        nome: 'LPA2v — Emmy no ESP32 (dois HC-SR04 e ponte H)',
        placa: 'esp32',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distEsq' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distDir' }, v: { VALOR: N(0) } },

            /* ---- as velocidades da bancada, num lugar só ---- */
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_FRENTE' }, v: { VALOR: N(150) },
                c: 'PWM de 0 a 255. 150 = ~60 por cento do curso: caminho livre'
            },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_LENTA' }, v: { VALOR: N(110) },
                c: 'a marcha do estado T. Abaixo de ~70 o L298N nao tira o motor do lugar'
            },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_ARRANQUE' }, v: { VALOR: N(210) },
                c: 'o empurrao de 80 ms que tira o motor da inercia antes da marcha lenta'
            },
            { t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_RE' }, v: { VALOR: N(130) } },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_GIRO' }, v: { VALOR: N(140) },
                c: 'o giro precisa vencer o atrito das duas rodas em sentidos opostos'
            },

            /* ---- disparo dos dois HC-SR04 e conversão para centímetros ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'medirSensores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('LOW') },
                            c: 'sensor esquerdo: pulso de 10 us no trigger (D26), eco em D27'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distEsq' },
                            c: 'ida e volta do som: 58 us por centimetro. O cast evita divisao inteira',
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '27', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        {
                            t: 'ard_delay', v: { MS: N(60) },
                            c: 'o eco do sensor 1 ainda viaja quando o 2 dispara: sem esta pausa\n' +
                                'o segundo sensor cronometra o eco do primeiro'
                        },
                        {
                            t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('LOW') },
                            c: 'sensor direito: trigger em D32, eco em D33'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distDir' },
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '33', NIVEL: 'HIGH' } } } },
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

            /* ---- os movimentos do carrinho, só com IN1..IN4 ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'pararMotores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: N(0) },
                            c: 'IN1 D2 / IN2 D4 = motor esquerdo | IN3 D18 / IN4 D19 = direito.\n' +
                                'ENA e ENB estao nos jumpers de 5 V, sempre habilitados: a\n' +
                                'velocidade sai do proprio pino de sentido. Os quatro em 0: parado.\n' +
                                'Sempre analogWrite nestes pinos, nunca digitalWrite - no ESP32 o\n' +
                                'analogWrite prende o pino ao LEDC e a escrita digital nao pegaria'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarFrente', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_FRENTE' } } },
                            c: 'motor esquerdo: IN1 com PWM e IN2 em zero = frente, na velocidade\n' +
                                'de VEL_FRENTE. Trocar os dois de papel inverte o sentido'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        {
                            t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_FRENTE' } } },
                            c: 'motor direito: IN3 com PWM e IN4 em zero'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'darRe', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: N(0) },
                            c: 'os dois lados trocados: o PWM vai para IN2 e IN4'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_RE' } } } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_RE' } } } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'girarDireita', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_GIRO' } } },
                            c: 'esquerdo para a frente e direito para tras: o carrinho gira no\n' +
                                'proprio eixo. Com roda boba na frente nao ha o que estercar,\n' +
                                'entao curva e diferenca entre as duas rodas de tras'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_GIRO' } } } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarDevagar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_ARRANQUE' } } },
                            c: 'o empurrao: sair do zero exige mais torque que seguir andando.\n' +
                                'Sem estes 80 ms o motor so zumbia em VEL_LENTA e o robo parecia\n' +
                                'travar sempre que a analise dava T'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_ARRANQUE' } } } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } },
                        { t: 'ard_delay', v: { MS: N(80) } },
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_LENTA' } } },
                            c: 'assenta na marcha lenta: e assim que se dilui a contradicao -\n' +
                                'aproximar-se devagar ate as duas leituras desempatarem'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'VEL_LENTA' } } } }
                    ]
                }
            },

            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '115200' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '26', MODO: 'OUTPUT' },
                            c: 'Robo Emmy adaptado (Da Silva Filho) no ESP32 DevKit.\n' +
                                'Proposicao: "existe obstaculo a frente".\n' +
                                'Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33.\n' +
                                'Ponte H: IN1/IN2 D2 / D4 (esquerdo), IN3/IN4 D18 / D19 (direito).\n' +
                                'O echo do HC-SR04 sai em 5 V e o ESP32 e de 3,3 V: divisor\n' +
                                'resistivo ou conversor de nivel em D27 e D33.\n' +
                                'Alimente os motores pela fonte da ponte H, nao pelo ESP32'
                        },
                        { t: 'ard_pinmode', f: { PIN: '27', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '32', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '33', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '2', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '4', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '18', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '19', MODO: 'OUTPUT' } },
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
                                                {
                                                    t: 'ard_delay', v: { MS: N(2000) },
                                                    c: 'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido a\n' +
                                                        'velocidade cheia - mexeu em VEL_GIRO, remeca o angulo'
                                                },
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
                                                    t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('perp: conflito — recuar e remedir') },
                                                    c: 'o perpendicular e a contradicao espelhada do T (Gct = mu1 - mu2),\n' +
                                                        'nao ausencia de leitura: um sensor ve obstaculo e o outro ve\n' +
                                                        'caminho livre. Um dos dois esta errado.\n' +
                                                        'Parar aqui era uma decisao que NAO mudava a evidencia: parado,\n' +
                                                        'os sensores repetiam a mesma discordancia, o ciclo seguinte caia\n' +
                                                        'em perpendicular de novo e o robo ficava ali para sempre.\n' +
                                                        'Meia manobra muda a geometria e permite medir outra vez'
                                                },
                                                { t: 'ard_call', f: { NOME: 'darRe' } },
                                                { t: 'ard_delay', v: { MS: N(300) } },
                                                { t: 'ard_call', f: { NOME: 'girarDireita' } },
                                                { t: 'ard_delay', v: { MS: N(600) } },
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
     * A MESMA Emmy do 10, agora em Modo Abstrato.
     *
     * Existe para comparação lado a lado: abra os dois e olhe o painel de
     * código. O programa é outro na tela e quase o mesmo no .ino — o que o
     * Modo Abstrato tira do aluno são as decisões que não são dele
     * (declarar pino, abrir a serial, montar o pulso do ultrassom, tratar
     * o eco ausente). A anotação (μ, λ) e a decisão do Para-Analisador
     * continuam inteiras, porque essas são as decisões dele.
     * ================================================================== */
    {
        arquivo: '11-abstrato-emmy-esp32.tbk',
        nome: 'Abstrato — Emmy no ESP32',
        placa: 'esp32',
        modo: 'abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_criar', f: { VAR: 'UD_LONGE' }, v: { VALOR: N(80) },
                            c: 'Emmy no ESP32. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 |\n' +
                                'ponte H IN1/IN2 D2 / D4 (motor esquerdo), IN3/IN4 D18 / D19 (direito).\n' +
                                'Universo de Discurso: 80 cm = caminho livre, evidencia perto de 0'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_PERTO' }, v: { VALOR: N(10) },
                            c: '10 cm = obstaculo colado, evidencia perto de 1. Como este numero e\n' +
                                'menor que o outro, a valoracao ja sai invertida sozinha'
                        },
                        // As distâncias viram caixas porque cada uma é usada duas
                        // vezes: no Monitor e na normalização. Sem elas o ultrassom
                        // seria disparado de novo a cada uso.
                        { t: 'abs_criar', f: { VAR: 'distEsq' }, v: { VALOR: N(400) } },
                        { t: 'abs_criar', f: { VAR: 'distDir' }, v: { VALOR: N(400) } },
                        // 0,5 é o valor de "sem informação" da LPA2v: antes da
                        // primeira medida as caixas já valem exatamente o que
                        // significa não saber.
                        { t: 'abs_criar', f: { VAR: 'evidEsq' }, v: { VALOR: N(0.5) } },
                        { t: 'abs_criar', f: { VAR: 'evidDir' }, v: { VALOR: N(0.5) } },
                        // As quatro velocidades, em porcentagem: sao os numeros
                        // que mudam de chassi para chassi. Ficam em caixas com
                        // nome, e nao enfiados dentro de cada movimento.
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_FRENTE' }, v: { VALOR: N(60) },
                            c: 'intensidade de 0 a 100 %. 60 % = caminho livre'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_LENTA' }, v: { VALOR: N(43) },
                            c: 'a marcha do estado T. Abaixo de ~28 % a maioria dos motores com\n' +
                                'L298N nao sai do lugar: a ponte ja come de 1,5 a 2 V'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_ARRANQUE' }, v: { VALOR: N(82) },
                            c: 'o empurrao de 80 ms que tira o motor da inercia antes da marcha lenta'
                        },
                        { t: 'abs_criar', f: { VAR: 'VEL_RE' }, v: { VALOR: N(50) } },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_GIRO' }, v: { VALOR: N(55) },
                            c: 'o giro precisa vencer o atrito das duas rodas em sentidos opostos'
                        }
                    ].concat(pararAbs())
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        {
                            t: 'abs_definir', f: { VAR: 'distEsq' },
                            c: 'sensor esquerdo (trig D26, echo D27)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '26', ECHO: '27' } } }
                        },
                        {
                            t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(60) },
                            c: 'evita o eco cruzado: o eco do primeiro sensor ainda esta no ar'
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'distDir' },
                            c: 'sensor direito (trig D32, echo D33)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '32', ECHO: '33' } } }
                        },
                        {
                            t: 'abs_mostrar', f: { ROTULO: 'esq' }, v: { VALOR: L('distEsq') },
                            c: 'as duas distancias no Monitor, para conferir o alinhamento'
                        },
                        { t: 'abs_mostrar', f: { ROTULO: 'dir' }, v: { VALOR: L('distDir') } },
                        // Só agora as distâncias viram evidência, no mesmo Universo
                        // de Discurso decrescente: quanto mais perto o obstáculo,
                        // maior o Grau de Evidência da proposição.
                        {
                            t: 'abs_definir', f: { VAR: 'evidEsq' },
                            c: 'normaliza a distancia do sensor esquerdo no Universo de Discurso',
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distEsq'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'evidDir' },
                            c: 'sensor direito, mesmo Universo de Discurso',
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distDir'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        // O ponto plotado é o mesmo que decide, porque sai das
                        // caixas. Aqui o λ precisa ser explícito: o bloco do
                        // reticulado recebe a anotação (μ, λ) pronta, enquanto o
                        // "quando o estado for" faz o complemento 1 − μ2 por dentro.
                        {
                            t: 'abs_mostrar_reticulado',
                            v: {
                                MU: L('evidEsq'),
                                LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evidDir') } }
                            }
                        },
                        {
                            t: 'abs_quando_estado',
                            c: 'mu = sensor esquerdo, lambda = 1 - sensor direito (o bloco faz o\n' +
                                'complemento). Gc = consenso dos dois; Gct = discordancia entre eles',
                            v: { MU1: L('evidEsq'), MU2: L('evidDir') },
                            s: {
                                CASOS: [
                                    {
                                        t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: {
                                            BODY: [{
                                                t: 'abs_mostrar', f: { ROTULO: 'estado' }, v: { VALOR: N(1) },
                                                c: 'V: os dois veem obstaculo -> recua e gira 90 graus'
                                            }]
                                                .concat(pararAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(200) } }])
                                                .concat(reAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(500) } }])
                                                .concat(girarDireitaAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(2000) }, c: 'T3 = 2 s: o giro de 90 graus do artigo. Este tempo foi medido a\nvelocidade cheia - mexeu em VEL_GIRO, remeça o angulo' }])
                                                .concat(pararAbs())
                                        }
                                    },
                                    {
                                        t: 'abs_caso_estado', f: { ESTADO: 'LPA_F' }, s: {
                                            BODY: [{
                                                t: 'abs_mostrar', f: { ROTULO: 'estado' }, v: { VALOR: N(0) },
                                                c: 'F: os dois veem caminho livre -> toca em frente'
                                            }].concat(frenteAbs())
                                        }
                                    },
                                    {
                                        // T e ⊥ são a mesma discordância espelhada.
                                        // Contradição alta não manda parar: manda
                                        // diluir a contradição, chegando mais perto.
                                        t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: {
                                            BODY: [{
                                                t: 'abs_mostrar', f: { ROTULO: 'estado' }, v: { VALOR: N(2) },
                                                c: 'T: contradicao -> avanca devagar para as leituras desempatarem'
                                            }].concat(devagarAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(750) }, c: 'T1 = 0,75 s' }])
                                        }
                                    },
                                    {
                                        t: 'abs_caso_estado', f: { ESTADO: 'LPA_PC' }, s: {
                                            BODY: [{
                                                t: 'abs_mostrar', f: { ROTULO: 'estado' }, v: { VALOR: N(3) },
                                                c: 'perpendicular: um ve obstaculo e o outro ve livre. Um dos dois esta\n' +
                                                    'errado. Parar aqui era uma decisao que NAO mudava a evidencia:\n' +
                                                    'parado, os sensores repetiam a mesma discordancia e o robo ficava\n' +
                                                    'ali para sempre. Meia manobra muda a geometria e permite remedir'
                                            }]
                                                .concat(reAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(300) } }])
                                                .concat(girarDireitaAbs())
                                                .concat([{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(600) } }])
                                                .concat(pararAbs())
                                        }
                                    }
                                ]
                            },
                            next: [{
                                t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(100) },
                                c: 'respiro entre disparos do ultrassom'
                            }]
                        }
                    ]
                }
            }
        ]
    },

    /* ==================================================================
     * EMMY NO ESP32 COM RETICULADO POR WiFi.
     *
     * O robô solto não tem cabo, e sem cabo a aba Reticulado do NoCodeMCU
     * não recebe nada — ela lê a porta USB. Então o reticulado vem para o
     * robô: o ESP32 sobe um servidor na porta 80 e serve uma página que
     * desenha o QUPC, o ponto (μ, λ), Gc, Gct e o estado por extenso,
     * atualizando sozinha. Abre-se o IP dele no celular e acompanha-se a
     * decisão ao vivo, andando ao lado do carrinho.
     *
     * O IP é fixo, declarado no setup() com WiFi.config() antes do
     * WiFi.begin() (10.140.109.222, na rede "Ale" da bancada). Com DHCP o endereço mudava de
     * uma ligação para outra e só o Monitor Serial dizia qual era — o que
     * exigia o cabo justamente no robô que existe para andar sem ele.
     *
     * A anotação servida é a MESMA que decide: μ e λ são calculados uma vez
     * por ciclo, guardados em variáveis, mostrados na página e entregues ao
     * Para-Analisador. Não há um cálculo "para ver" e outro "para andar".
     *
     * Duas correções em relação ao exemplo 10, e as duas vieram da bancada:
     *
     *   1. O ⊥ não estaciona mais. Parar era uma decisão que não mudava a
     *      evidência: parado, os dois sensores repetiam a mesma leitura
     *      discordante, o ciclo seguinte caía em ⊥ de novo e o robô ficava
     *      ali para sempre. Agora o ⊥ recua e gira um pouco — muda a
     *      geometria e mede outra vez. Continua sendo prudência, mas
     *      prudência que sai do lugar.
     *
     *   2. Toda arrancada leva um empurrão. Sair do zero exige mais torque
     *      que seguir andando, e VEL_LENTA sozinha só fazia o motor zumbir.
     *      Agora andarDevagar() dá um pulso curto em VEL_ARRANQUE antes de
     *      assentar na velocidade baixa.
     *
     * Há ainda um terceiro cuidado, o contador semDecidir: se o robô passar
     * ciclos demais sem cair em V nem em F, ele desvia por conta própria.
     * É o seguro contra qualquer canto do reticulado que a gente não previu.
     *
     * Ligações: idênticas às do exemplo 10.
     *   sensor 1 trig/echo D26 / D27      sensor 2 trig/echo D32 / D33
     *   ponte H IN1/IN2 D2 / D4           IN3/IN4 D18 / D19
     *
     * Aqui tudo isso é Modo Literal, e boa parte em código livre: o HTML, o
     * JavaScript do reticulado e o WiFiServer estão escritos à mão. O exemplo
     * 13 mostra o outro lado — a mesma página, em blocos, depois que o Modo
     * Abstrato ganhou a categoria "Página web".
     * ================================================================== */
    {
        arquivo: '12-lpa2v-emmy-wifi.tbk',
        nome: 'LPA2v — Emmy no ESP32 com reticulado por WiFi',
        placa: 'esp32',
        specs: [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distEsq' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'distDir' }, v: { VALOR: N(0) } },

            /* ---- a anotação corrente: calculada uma vez, usada três ---- */
            {
                t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'muEsq' }, v: { VALOR: N(0.5) },
                c: '0,5 e o valor de "sem informacao" da LPA2v: antes da primeira medida\n' +
                    'as duas ja valem exatamente o que significa nao saber'
            },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'lamDir' }, v: { VALOR: N(0.5) } },
            {
                t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'estadoAtual' }, v: { VALOR: N(0) },
                c: 'codigo do estado no reticulado, o mesmo que a pagina mostra por extenso'
            },
            {
                t: 'ard_var_global', f: { QUAL: '', TIPO: 'byte', VAR: 'semDecidir' }, v: { VALOR: N(0) },
                c: 'ciclos seguidos sem cair em V nem em F. Passou de LIMITE_TRAVA, desvia'
            },

            /* ---- as velocidades da bancada ---- */
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_FRENTE' }, v: { VALOR: N(75) },
                c: 'PWM de 0 a 255. Baixe este primeiro se o carro estiver rapido demais'
            },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_LENTA' }, v: { VALOR: N(75) },
                c: 'a marcha do estado T. Abaixo de ~70 o L298N nao tira o motor do lugar'
            },
            { t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_RE' }, v: { VALOR: N(90) } },
            { t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_GIRO' }, v: { VALOR: N(50) } },
            {
                t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'VEL_ARRANQUE' }, v: { VALOR: N(110) },
                c: 'o empurrao que tira o motor da inercia: 80 ms antes da marcha lenta,\n' +
                    '120 ms antes do giro'
            },
            { t: 'ard_var_global', f: { QUAL: 'const', TIPO: 'byte', VAR: 'LIMITE_TRAVA' }, v: { VALOR: N(8) } },

            /* ---- a página do reticulado, servida pelo próprio robô ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'enviarPagina', PARAMS: 'WiFiClient& c' },
                s: {
                    BODY: [
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'c.print(R"H(<!doctype html><html lang=pt-br><head><meta charset=utf-8>\\n' +
                                    '<meta name=viewport content="width=device-width,initial-scale=1">\\n' +
                                    '<title>Emmy - reticulado</title><style>\\n' +
                                    'body{margin:0;padding:14px;background:#0f1115;color:#e6e6e6;text-align:center;\\n' +
                                    'font:14px ui-monospace,Menlo,monospace}\\n' +
                                    'canvas{max-width:100%}#est{font-size:26px;font-weight:700;margin:10px 0 2px}\\n' +
                                    '.l{color:#8b93a7;font-size:12px;line-height:1.7}\\n' +
                                    '</style></head><body>\\n' +
                                    '<canvas id=cv width=360 height=360></canvas>\\n' +
                                    '<div id=est>--</div><div class=l id=num></div>\\n' +
                                    '<script>)H");'
                            },
                            c: 'a pagina inteira mora no flash do ESP32: sem internet, sem CDN, sem\n' +
                                'nada para instalar no celular. So abrir o IP que o Monitor mostrou'
                        },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'c.print(R"H(var cv=document.getElementById("cv"),g=cv.getContext("2d"),R=[];\\n' +
                                    'function X(v){return 180+v*150}function Y(v){return 180-v*150}\\n' +
                                    'function li(a,b,c,d){g.beginPath();g.moveTo(X(a),Y(b));g.lineTo(X(c),Y(d));g.stroke()}\\n' +
                                    'function fundo(){g.clearRect(0,0,360,360);\\n' +
                                    'g.strokeStyle="#2a2f3a";g.lineWidth=1;\\n' +
                                    'for(var v=-0.75;v<0.8;v+=0.25){if(Math.abs(v)<0.01)continue;\\n' +
                                    'var m=1-Math.abs(v);li(-m,v,m,v);li(v,-m,v,m)}\\n' +
                                    'g.strokeStyle="#5a6478";g.lineWidth=2;g.beginPath();\\n' +
                                    'g.moveTo(X(1),Y(0));g.lineTo(X(0),Y(1));g.lineTo(X(-1),Y(0));\\n' +
                                    'g.lineTo(X(0),Y(-1));g.closePath();g.stroke();)H");'
                            },
                            c: 'o losango e a fronteira do que e alcancavel: |Gc| + |Gct| <= 1'
                        },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'c.print(R"H(g.strokeStyle="#7a8698";g.lineWidth=1;g.setLineDash([4,4]);\\n' +
                                    '[0.5,-0.5].forEach(function(v){var m=1-Math.abs(v);li(v,-m,v,m);li(-m,v,m,v)});\\n' +
                                    'g.setLineDash([]);li(-0.5,-0.5,0.5,0.5);li(-0.5,0.5,0.5,-0.5);\\n' +
                                    'g.strokeStyle="#3a4152";li(-1,0,1,0);li(0,-1,0,1);\\n' +
                                    'g.fillStyle="#e6e6e6";g.font="600 14px monospace";\\n' +
                                    'g.textAlign="center";g.textBaseline="middle";\\n' +
                                    'g.fillText("V",X(1)+14,Y(0));g.fillText("F",X(-1)-14,Y(0));\\n' +
                                    'g.fillText("T",X(0),Y(1)-14);g.fillText("\u22a5",X(0),Y(-1)+14);}\\n' +
                                    ')H");'
                            },
                            c: 'tracejado em +-0,5 = os valores de controle. As diagonais separam os\n' +
                                'nao-extremos. E a mesma geometria da aba Reticulado do NoCodeMCU'
                        },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'c.print(R"H(function pt(a,b,al,cor){g.globalAlpha=al;g.fillStyle=cor;\\n' +
                                    'g.beginPath();g.arc(X(a),Y(b),al>0.9?6:3,0,6.3);g.fill();g.globalAlpha=1}\\n' +
                                    'function pinta(){fundo();for(var i=0;i<R.length;i++)\\n' +
                                    'pt(R[i][0],R[i][1],0.12+0.5*(i+1)/R.length,"#4da3ff");\\n' +
                                    'if(R.length){var u=R[R.length-1];pt(u[0],u[1],1,"#ff5c5c")}}\\n' +
                                    'function tick(){fetch("/d").then(function(r){return r.text()}).then(function(t){\\n' +
                                    'var p=t.split(","),mu=+p[0],lam=+p[1],gc=mu-lam,gct=mu+lam-1;\\n' +
                                    'R.push([gc,gct]);if(R.length>120)R.shift();pinta();\\n' +
                                    'document.getElementById("est").textContent=p[3];\\n' +
                                    'document.getElementById("num").textContent="mu "+mu.toFixed(3)+\\n' +
                                    '"   lambda "+lam.toFixed(3)+"   Gc "+gc.toFixed(3)+"   Gct "+gct.toFixed(3)+\\n' +
                                    '"   |   esq "+p[4]+" cm    dir "+p[5]+" cm"}).catch(function(){\\n' +
                                    'document.getElementById("est").textContent="sem sinal"})}\\n' +
                                    'fundo();setInterval(tick,300);</script></body></html>)H");'
                            },
                            c: 'o rastro guarda os ultimos 120 pontos: da para ver a trajetoria da\n' +
                                'decisao dentro do reticulado, nao so o ponto do instante'
                        }
                    ]
                }
            },

            /* ---- o servidor: uma passada por chamada, sem bloquear o robô ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'atenderWeb', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'static WiFiServer servidor(80);\\n' +
                                    'static bool ligado = false;\\n' +
                                    'if (!ligado) { servidor.begin(); ligado = true; }\\n' +
                                    'WiFiClient c = servidor.available();\\n' +
                                    'if (!c) return;\\n' +
                                    'unsigned long t0 = millis();\\n' +
                                    'while (c.connected() && !c.available() && millis() - t0 < 300) delay(1);\\n' +
                                    'String req = c.readStringUntil(\'\\r\');\\n' +
                                    'while (c.available()) c.read();'
                            },
                            c: 'o servidor e static aqui dentro porque so esta funcao precisa dele -\n' +
                                'nasce na primeira chamada e vive o programa inteiro.\n' +
                                'Sem cliente na fila, a funcao volta na hora: o robo nao espera ninguem'
                        },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'if (req.indexOf("GET /d") >= 0) {\\n' +
                                    '  c.println(F("HTTP/1.1 200 OK"));\\n' +
                                    '  c.println(F("Content-Type: text/plain"));\\n' +
                                    '  c.println(F("Connection: close"));\\n' +
                                    '  c.println();\\n' +
                                    '  c.print(muEsq, 3); c.print(\',\'); c.print(lamDir, 3);\\n' +
                                    '  c.print(\',\'); c.print(estadoAtual);\\n' +
                                    '  c.print(\',\'); c.print(lpaNomeEstado(estadoAtual));\\n' +
                                    '  c.print(\',\'); c.print(distEsq, 1);\\n' +
                                    '  c.print(\',\'); c.print(distDir, 1);\\n' +
                                    '  c.stop();\\n' +
                                    '  return;\\n' +
                                    '}'
                            },
                            c: 'a rota /d devolve a anotacao crua, em uma linha: mu, lambda, codigo do\n' +
                                'estado, nome do estado e as duas distancias. O desenho e do navegador'
                        },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'c.println(F("HTTP/1.1 200 OK"));\\n' +
                                    'c.println(F("Content-Type: text/html; charset=utf-8"));\\n' +
                                    'c.println(F("Connection: close"));\\n' +
                                    'c.println();\\n' +
                                    'enviarPagina(c);\\n' +
                                    'c.stop();'
                            }
                        }
                    ]
                }
            },

            /* ---- esperar sem deixar a página congelada ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'esperarAtendendo', PARAMS: 'unsigned long ms' },
                s: {
                    BODY: [
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'unsigned long t0 = millis();\\n' +
                                    'while (millis() - t0 < ms) { atenderWeb(); delay(2); }'
                            },
                            c: 'delay() puro deixaria a pagina muda durante os 2 s do giro. Esta espera\n' +
                                'atende o navegador enquanto o robo manobra - o ponto continua andando'
                        }
                    ]
                }
            },

            /* ---- disparo dos dois HC-SR04 e conversão para centímetros ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'medirSensores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('LOW') },
                            c: 'sensor esquerdo: pulso de 10 us no trigger (D26), eco em D27'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '26' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distEsq' },
                            c: 'ida e volta do som: 58 us por centimetro. O cast evita divisao inteira',
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '27', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        {
                            t: 'ard_delay', v: { MS: N(60) },
                            c: 'evita o eco cruzado: o eco do primeiro sensor ainda esta no ar'
                        },
                        {
                            t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('LOW') },
                            c: 'sensor direito: trigger em D32, eco em D33'
                        },
                        { t: 'ard_delaymicroseconds', v: { US: N(2) } },
                        { t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('HIGH') } },
                        { t: 'ard_delaymicroseconds', v: { US: N(10) } },
                        { t: 'ard_digitalwrite', f: { PIN: '32' }, v: { VALOR: K('LOW') } },
                        {
                            t: 'variables_set', f: { VAR: 'distDir' },
                            v: {
                                VALUE: {
                                    t: 'ard_arith', f: { OP: '/' },
                                    v: {
                                        A: { t: 'ard_cast', f: { TIPO: 'float' }, v: { VALOR: { t: 'ard_pulsein', f: { PIN: '33', NIVEL: 'HIGH' } } } },
                                        B: N(58)
                                    }
                                }
                            }
                        },
                        {
                            t: 'controls_if',
                            c: 'sem eco o pulseIn devolve 0. Zero centimetro seria "obstaculo colado" -\n' +
                                'o oposto do que aconteceu. Vira 400 cm: "nao tem nada ai"',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: G('distEsq'), B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'distEsq' }, v: { VALUE: N(400) } }] }
                        },
                        {
                            t: 'controls_if',
                            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: G('distDir'), B: N(0) } } },
                            s: { DO0: [{ t: 'variables_set', f: { VAR: 'distDir' }, v: { VALUE: N(400) } }] }
                        }
                    ]
                }
            },

            /* ---- os movimentos ---- */
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'pararMotores', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: N(0) },
                            c: 'IN1 D2 / IN2 D4 = motor esquerdo | IN3 D18 / IN4 D19 = direito.\n' +
                                'Sempre analogWrite nestes quatro, nunca digitalWrite: no ESP32 o\n' +
                                'analogWrite prende o pino ao LEDC e a escrita digital nao pegaria'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarFrente', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: G('VEL_FRENTE') },
                            c: 'IN1 com PWM e IN2 em zero = frente. Trocar os dois inverte o sentido'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: G('VEL_FRENTE') } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'andarDevagar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: G('VEL_ARRANQUE') },
                            c: 'o empurrao: sair do zero exige mais torque que seguir andando.\n' +
                                'Sem estes 80 ms o motor so zumbia em VEL_LENTA e o robo parecia\n' +
                                'travar sempre que a analise dava T'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: G('VEL_ARRANQUE') } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: N(0) } },
                        { t: 'ard_delay', v: { MS: N(80) } },
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: G('VEL_LENTA') },
                            c: 'assenta na marcha lenta: e assim que se dilui a contradicao'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: G('VEL_LENTA') } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'darRe', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: N(0) },
                            c: 'os dois lados trocados: o PWM vai para IN2 e IN4'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: G('VEL_RE') } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: G('VEL_RE') } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'girarDireita', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: G('VEL_ARRANQUE') },
                            c: 'esquerdo para a frente e direito para tras: gira no proprio eixo.\n' +
                                'Comeca com o empurrao, como o andarDevagar: girar parado arrasta as\n' +
                                'rodas de lado e pede mais torque que andar reto. Sem ele o Qv->T,\n' +
                                'que gira a partir do robo parado, so fazia o motor zumbir'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '4' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '18' }, v: { VALOR: N(0) } },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: G('VEL_ARRANQUE') } },
                        { t: 'ard_delay', v: { MS: N(120) } },
                        {
                            t: 'ard_analogwrite', f: { PIN: '2' }, v: { VALOR: G('VEL_GIRO') },
                            c: 'assenta na velocidade de giro'
                        },
                        { t: 'ard_analogwrite', f: { PIN: '19' }, v: { VALOR: G('VEL_GIRO') } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'desviar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_call', f: { NOME: 'pararMotores' },
                            c: 'a manobra do V: para, recua e gira 90 graus'
                        },
                        { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(200) } },
                        { t: 'ard_call', f: { NOME: 'darRe' } },
                        { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(500) } },
                        { t: 'ard_call', f: { NOME: 'girarDireita' } },
                        {
                            t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(2000) },
                            c: 'T3 = 2 s: o giro de 90 graus do artigo. O tempo depende de VEL_GIRO -\n' +
                                'mexeu na velocidade, remeca o angulo com o carro no chao'
                        },
                        { t: 'ard_call', f: { NOME: 'pararMotores' } }
                    ]
                }
            },
            {
                t: 'ard_function_def', f: { TIPO: 'void', NOME: 'desempatar', PARAMS: '' },
                s: {
                    BODY: [
                        {
                            t: 'ard_call', f: { NOME: 'darRe' },
                            c: 'a saida do ⊥: meia manobra. Parar seria uma decisao que nao muda a\n' +
                                'evidencia - parado, os sensores repetem a mesma discordancia e o\n' +
                                'estado se repete para sempre. Recuar e girar muda a geometria'
                        },
                        { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(300) } },
                        { t: 'ard_call', f: { NOME: 'girarDireita' } },
                        { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(600) } },
                        { t: 'ard_call', f: { NOME: 'pararMotores' } }
                    ]
                }
            },

            {
                t: 'ard_setup', s: {
                    BODY: [
                        { t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '115200' } },
                        {
                            t: 'ard_pinmode', f: { PIN: '26', MODO: 'OUTPUT' },
                            c: 'Robo Emmy adaptado (Da Silva Filho) no ESP32 DevKit, com o reticulado\n' +
                                'servido por WiFi. Proposicao: "existe obstaculo a frente".\n' +
                                'Sensor 1 trig/echo D26 / D27 | sensor 2 trig/echo D32 / D33.\n' +
                                'Ponte H: IN1/IN2 D2 / D4 (esquerdo), IN3/IN4 D18 / D19 (direito).\n' +
                                'O echo do HC-SR04 sai em 5 V e o ESP32 e de 3,3 V: divisor resistivo\n' +
                                'ou conversor de nivel em D27 e D33'
                        },
                        { t: 'ard_pinmode', f: { PIN: '27', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '32', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '33', MODO: 'INPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '2', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '4', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '18', MODO: 'OUTPUT' } },
                        { t: 'ard_pinmode', f: { PIN: '19', MODO: 'OUTPUT' } },
                        { t: 'ard_call', f: { NOME: 'pararMotores' }, c: 'nasce parado' },
                        {
                            t: 'ard_raw_stmt',
                            f: {
                                CODE: 'IPAddress ip(10, 140, 109, 222);\\n' +
                                    'IPAddress gateway(10, 140, 109, 95);\\n' +
                                    'IPAddress mascara(255, 255, 255, 0);\\n' +
                                    'IPAddress dns(10, 140, 109, 95);\\n' +
                                    'if (!WiFi.config(ip, gateway, mascara, dns)) Serial.println("falha ao fixar o IP");'
                            },
                            c: 'IP fixo: o robo sempre atende no mesmo endereco, sem precisar do\n' +
                                'Monitor Serial para descobrir qual IP o roteador deu. Os tres\n' +
                                'primeiros numeros tem de ser os da sua rede (veja o IP do celular)\n' +
                                'e o ultimo, um que ninguem use. Gateway e DNS = IP do roteador.\n' +
                                'Tem de vir ANTES do WiFi.begin'
                        },
                        {
                            t: 'ard_wifi_begin', f: { SSID: 'Ale', SENHA: 'alelima12' },
                            c: 'a rede da bancada. A ESP32 nao ve 5 GHz:\n' +
                                'tem de ser a rede de 2,4 GHz'
                        },
                        {
                            t: 'ard_while',
                            c: 'segura aqui ate conectar - com os motores ja parados, entao um erro\n' +
                                'de senha deixa o carro quieto em vez de solto',
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
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('reticulado em http://') },
                            c: 'confirma o IP fixo - e o endereco que voce abre no celular'
                        },
                        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_wifi_localip' } } }
                    ]
                }
            },
            {
                t: 'ard_loop', s: {
                    BODY: [
                        {
                            t: 'ard_call', f: { NOME: 'atenderWeb' },
                            c: 'uma passada no servidor por ciclo, alem das que a espera faz'
                        },
                        { t: 'ard_call', f: { NOME: 'medirSensores' } },
                        {
                            t: 'variables_set', f: { VAR: 'muEsq' },
                            c: 'Universo de Discurso invertido de proposito: 80 cm (longe, sem\n' +
                                'evidencia) a 10 cm (colado, evidencia total). Como a2 < a1, a\n' +
                                'valoracao ja sai invertida sozinha - perto vira evidencia alta',
                            v: {
                                VALUE: {
                                    t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                    v: { X: G('distEsq'), A1: N(80), A2: N(10) }
                                }
                            }
                        },
                        {
                            t: 'variables_set', f: { VAR: 'lamDir' },
                            c: 'lambda = 1 - mu2. Com esse complemento, Gc = mu1 + mu2 - 1 e o\n' +
                                'consenso dos dois sensores e Gct = mu1 - mu2 e a discordancia',
                            v: {
                                VALUE: {
                                    t: 'lp_complemento',
                                    v: {
                                        MU: {
                                            t: 'lp_evidencia', f: { FUNC: 'LIN' },
                                            v: { X: G('distDir'), A1: N(80), A2: N(10) }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            t: 'variables_set', f: { VAR: 'estadoAtual' },
                            c: 'o estado sai da MESMA anotacao que decide logo abaixo: e ele que a\n' +
                                'pagina mostra por extenso',
                            v: { VALUE: { t: 'lp_estado', f: { RES: '12' }, v: { MU: G('muEsq'), LAMBDA: G('lamDir') } } }
                        },
                        {
                            t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('mu:') },
                            c: 'com o cabo plugado, esta linha continua alimentando a aba Reticulado\n' +
                                'do NoCodeMCU. Sem cabo, quem mostra e a pagina do proprio robo'
                        },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: G('muEsq') } },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T(' lambda:') } },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: G('lamDir') } },
                        { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T(' estado:') } },
                        {
                            t: 'ard_serial_println', f: { PORTA: 'Serial' },
                            v: { VALOR: { t: 'lp_estado_nome', v: { ESTADO: G('estadoAtual') } } }
                        },
                        {
                            t: 'lp_para_analisador',
                            f: { MODO: 'DIRETO', RES: '12', C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5' },
                            c: 'MU e LAMBDA entram prontos: e o mesmo par que foi para a pagina e\n' +
                                'para o Monitor. Nao ha um calculo "para ver" e outro "para andar"',
                            v: { MU: G('muEsq'), LAMBDA: G('lamDir') },
                            s: {
                                CASOS: [
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: {
                                            BODY: [
                                                {
                                                    t: 'variables_set', f: { VAR: 'semDecidir' }, v: { VALUE: N(0) },
                                                    c: 'os dois sensores concordam que ha obstaculo: decidiu, zera o contador'
                                                },
                                                { t: 'ard_call', f: { NOME: 'desviar' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_QVT' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_call', f: { NOME: 'girarDireita' },
                                                    c: 'evidencia alta mas com discordancia: desvio parcial, nao 90 graus'
                                                },
                                                { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(1500) }, c: 'T2 = 1,5 s: meio giro, ~45 graus' },
                                                { t: 'ard_call', f: { NOME: 'pararMotores' } }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_F' }, s: {
                                            BODY: [
                                                {
                                                    t: 'variables_set', f: { VAR: 'semDecidir' }, v: { VALUE: N(0) },
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
                                                    t: 'ard_call', f: { NOME: 'andarDevagar' },
                                                    c: 'os dois veem coisas incompativeis. Contradicao alta nao manda parar:\n' +
                                                        'manda diluir a contradicao, chegando mais perto para desempatar'
                                                },
                                                { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(750) }, c: 'T1 = 0,75 s' }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_caso', f: { ESTADO: 'LPA_PC' }, s: {
                                            BODY: [
                                                {
                                                    t: 'ard_call', f: { NOME: 'desempatar' },
                                                    c: 'o perpendicular e a contradicao espelhada do T: um sensor ve\n' +
                                                        'obstaculo e o outro ve caminho livre. Um dos dois esta errado -\n' +
                                                        'e a unica forma de descobrir qual e mudar de lugar e medir de novo'
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        t: 'lp_senao', s: {
                                            BODY: [
                                                {
                                                    t: 'ard_call', f: { NOME: 'andarDevagar' },
                                                    c: 'os demais estados do reticulado: evidencia fraca demais para\n' +
                                                        'decidir, entao anda devagar e mede de novo'
                                                }
                                            ]
                                        }
                                    }
                                ]
                            },
                            next: [
                                {
                                    t: 'controls_if',
                                    c: 'o seguro: ciclos demais sem cair em V nem em F significa que a\n' +
                                        'geometria nao esta mudando sozinha. Desvia por conta propria',
                                    v: {
                                        IF0: {
                                            t: 'logic_compare', f: { OP: 'GTE' },
                                            v: { A: G('semDecidir'), B: G('LIMITE_TRAVA') }
                                        }
                                    },
                                    s: {
                                        DO0: [
                                            { t: 'ard_call', f: { NOME: 'desviar' } },
                                            { t: 'variables_set', f: { VAR: 'semDecidir' }, v: { VALUE: N(0) } }
                                        ]
                                    },
                                    next: [
                                        {
                                            t: 'variables_set', f: { VAR: 'semDecidir' },
                                            c: 'so cresce: V e F zeram o contador nos proprios casos',
                                            v: {
                                                VALUE: {
                                                    t: 'ard_arith', f: { OP: '+' },
                                                    v: { A: G('semDecidir'), B: N(1) }
                                                }
                                            }
                                        },
                                        { t: 'ard_call', f: { NOME: 'esperarAtendendo' }, v: { ARG0: N(100) }, c: 'respiro entre disparos do ultrassom' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    },

    /* ==================================================================
     * 13 — ROBÔ EMMY 2: WiFi COM CONTROLE, EM MODO ABSTRATO
     *
     * A mesma Emmy do 12, com duas diferenças que mudam a aula inteira.
     *
     * A primeira é o modo: aqui não há nenhum bloco de código livre. A página
     * com o reticulado, que no 12 eram quatro blocos de HTML e JavaScript
     * escritos à mão, agora é um bloco só — "mostrar o reticulado na página" —
     * e os botões do celular são o bloco "botão ... apertado ?". Quem escreve o
     * servidor é o gerador; o aluno escreve o programa.
     *
     * A segunda é o dedo. Os quatro botões da página (frente, trás, esquerda,
     * direita) valem enquanto o dedo está em cima, e enquanto valem eles mandam
     * no robô: é a caixa "manual" que desliga a decisão automática por aquele
     * ciclo. Soltou o dedo, a LPA2v volta a decidir sozinha no ciclo seguinte —
     * nenhum estado fica preso, porque a página repete o aviso a cada 150 ms e
     * um aviso velho é dedo que já soltou.
     *
     * Repare que o reticulado continua sendo o MESMO ponto que decide: o (μ, λ)
     * que aparece no celular sai das mesmas caixas que alimentam a análise. É a
     * diferença entre mostrar o robô pensando e desenhar um gráfico à parte.
     *
     * A velocidade, que no 12 estava repetida em VEL_FRENTE e VEL_LENTA — as
     * duas paradas no mesmo 75 depois da calibração na bancada —, aqui é uma
     * caixa só, VELOCIDADE, ligada nos dois lugares. O bloco "motores" recebe a
     * velocidade como entrada, então mudar o andar do robô é mudar um número.
     *
     * Os números estão em porcentagem, e não de 0 a 255: 29 % é o 75 da
     * bancada, 43 % é o empurrão de arranque (110), 35 % a ré (90) e 20 % o
     * giro (50).
     *
     * Rede: a placa cria a PRÓPRIA rede, aberta, chamada "emmy2". O celular se
     * conecta nela e abre http://192.168.4.1 — sem roteador, sem IP fixo para
     * acertar, e o robô pode andar longe da bancada.
     *
     * Ligações: idênticas às do exemplo 10.
     *   sensor 1 trig/echo D26 / D27      sensor 2 trig/echo D32 / D33
     *   ponte H IN1/IN2 D2 / D4           IN3/IN4 D18 / D19
     * ================================================================== */
    {
        arquivo: '13-abstrato-emmy2-wifi-controle.tbk',
        nome: 'Robô Emmy 2 — WiFi com controle',
        placa: 'esp32',
        modo: 'abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_motores_pinos', f: { E1: '2', E2: '4', D1: '18', D2: '19' },
                            c: 'Emmy 2. Sensor 1 trig/echo D26 / D27 | sensor 2 D32 / D33 |\n' +
                                'ponte H IN1/IN2 D2 / D4 (motor esquerdo), IN3/IN4 D18 / D19 (direito).\n' +
                                'Este bloco diz isso uma vez; depois so se fala em frente, re e giro'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_LONGE' }, v: { VALOR: N(80) },
                            c: 'Universo de Discurso: 80 cm = caminho livre, evidencia perto de 0'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_PERTO' }, v: { VALOR: N(10) },
                            c: '10 cm = obstaculo colado, evidencia perto de 1. Como este numero e\n' +
                                'menor que o outro, a valoracao ja sai invertida sozinha'
                        },
                        { t: 'abs_criar', f: { VAR: 'distEsq' }, v: { VALOR: N(400) } },
                        { t: 'abs_criar', f: { VAR: 'distDir' }, v: { VALOR: N(400) } },
                        {
                            t: 'abs_criar', f: { VAR: 'evidEsq' }, v: { VALOR: N(0.5) },
                            c: '0,5 e o valor de "sem informacao" da LPA2v: antes da primeira medida\n' +
                                'as duas caixas ja valem exatamente o que significa nao saber'
                        },
                        { t: 'abs_criar', f: { VAR: 'evidDir' }, v: { VALOR: N(0.5) } },
                        {
                            t: 'abs_criar', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) },
                            c: 'ciclos seguidos sem cair em V nem em F. Passou de LIMITE_TRAVA,\n' +
                                'o robo desvia por conta propria: e o seguro contra qualquer\n' +
                                'canto do reticulado que a gente nao previu'
                        },
                        { t: 'abs_criar', f: { VAR: 'LIMITE_TRAVA' }, v: { VALOR: N(8) } },
                        {
                            t: 'abs_criar', f: { VAR: 'manual' }, v: { VALOR: N(0) },
                            c: 'vale 1 no ciclo em que algum botao da pagina esta apertado.\n' +
                                'E o que faz o dedo passar na frente da decisao automatica'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VELOCIDADE' }, v: { VALOR: N(29.4) },
                            c: 'intensidade de 0 a 100 %. UMA caixa para o andar do robo: a mesma\n' +
                                'velocidade do botao frente e da marcha lenta do estado T.\n' +
                                'Na bancada as duas acabaram no mesmo numero: 29,4 % = 75 de 255'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_ARRANQUE' }, v: { VALOR: N(43.1) },
                            c: '43,1 % = 110 de 255. O empurrao de 80 ms que tira o motor da\n' +
                                'inercia: abaixo de ~100 o L298N nao vence o atrito parado.\n' +
                                'TODA arrancada passa por aqui - sem isso o robo fica zumbindo\n' +
                                'no lugar quando o ciclo anterior terminou com os motores parados'
                        },
                        { t: 'abs_criar', f: { VAR: 'VEL_RE' }, v: { VALOR: N(35.3) } },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_GIRO' }, v: { VALOR: N(19.6) },
                            c: 'o giro precisa vencer o atrito das duas rodas em sentidos opostos'
                        },
                        {
                            t: 'abs_wifi_rede_aberta', f: { NOME: 'emmy2' },
                            c: 'a placa cria a propria rede, aberta e sem senha, chamada "emmy2".\n' +
                                'No celular: conectar na rede emmy2 e abrir http://192.168.4.1\n' +
                                'Esse endereco nao muda - e o padrao do modo ponto de acesso,\n' +
                                'entao nao ha IP para descobrir nem para configurar aqui.\n' +
                                'Sem roteador no meio, e o robo anda longe da bancada'
                        },
                        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        {
                            t: 'abs_web_atender',
                            c: 'primeira coisa do ciclo: recebe os toques e responde o celular'
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'distEsq' },
                            c: 'sensor esquerdo (trig D26, echo D27)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '26', ECHO: '27' } } }
                        },
                        {
                            t: 'abs_web_esperar', v: { MS: N(60) },
                            c: 'evita o eco cruzado: o eco do primeiro sensor ainda esta no ar.\n' +
                                'Esperar "atendendo" e o que mantem a pagina viva durante a espera'
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'distDir' },
                            c: 'sensor direito (trig D32, echo D33)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '32', ECHO: '33' } } }
                        },
                        {
                            t: 'abs_web_mostrar', f: { ROTULO: 'esq' }, v: { VALOR: L('distEsq') },
                            c: 'as duas distancias no celular, para conferir o alinhamento'
                        },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'dir' }, v: { VALOR: L('distDir') } },
                        {
                            t: 'abs_definir', f: { VAR: 'evidEsq' },
                            c: 'normaliza a distancia do sensor esquerdo no Universo de Discurso',
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distEsq'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'evidDir' },
                            c: 'sensor direito, mesmo Universo de Discurso',
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distDir'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        {
                            t: 'abs_web_reticulado',
                            c: 'o ponto que aparece no celular e o MESMO que decide logo abaixo:\n' +
                                'sai destas caixas. Aqui o lambda e explicito (1 - evidDir); no\n' +
                                'bloco de analise o complemento e feito por dentro',
                            v: {
                                MU: L('evidEsq'),
                                LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evidDir') } }
                            }
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(0) },
                            c: 'ninguem apertou nada ate prova em contrario'
                        },
                        {
                            t: 'abs_se',
                            c: 'os quatro botoes da pagina. Cada um vale enquanto o dedo esta em\n' +
                                'cima: soltou, a LPA2v volta a mandar no ciclo seguinte',
                            v: { COND: { t: 'abs_web_botao', f: { NOME: 'frente' } } },
                            s: {
                                ENTAO: [
                                    { t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VELOCIDADE') } },
                                    { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(1) } }
                                ]
                            }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'tras' } } },
                            s: {
                                ENTAO: [
                                    { t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') } },
                                    { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(1) } }
                                ]
                            }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'esquerda' } } },
                            s: {
                                ENTAO: [
                                    { t: 'abs_motores', f: { MANOBRA: 'ESQ' }, v: { VEL: L('VEL_GIRO') } },
                                    { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(1) } }
                                ]
                            }
                        },
                        {
                            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'direita' } } },
                            s: {
                                ENTAO: [
                                    { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
                                    { t: 'abs_definir', f: { VAR: 'manual' }, v: { VALOR: N(1) } }
                                ]
                            }
                        },
                        {
                            t: 'abs_se',
                            c: 'so quando ninguem esta com o dedo na tela e que a analise decide',
                            v: { COND: { t: 'abs_comparar', f: { OP: 'EQ' }, v: { A: L('manual'), B: N(0) } } },
                            s: {
                                ENTAO: [{
                                    t: 'abs_quando_estado',
                                    c: 'mu = sensor esquerdo, lambda = 1 - sensor direito (o bloco faz o\n' +
                                        'complemento). Gc = consenso dos dois; Gct = discordancia entre eles',
                                    v: { MU1: L('evidEsq'), MU2: L('evidDir') },
                                    s: {
                                        CASOS: [
                                            {
                                                t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: {
                                                    BODY: [{
                                                        t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) },
                                                        c: 'V e F sao os estados em que o robo DECIDE: zeram o contador'
                                                    }].concat(desviarAbs(
                                                        'V: os dois veem obstaculo -> recua e gira 90 graus'))
                                                }
                                            },
                                            {
                                                t: 'abs_caso_estado', f: { ESTADO: 'LPA_QVT' }, s: {
                                                    BODY: [
                                                        {
                                                            t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') },
                                                            c: 'quase-verdadeiro comecando a divergir: ja ha obstaculo, mas as\n' +
                                                                'fontes comecaram a discordar. Meio giro resolve antes de virar\n' +
                                                                'contradicao - e o mesmo tratamento do exemplo 12'
                                                        },
                                                        { t: 'abs_web_esperar', v: { MS: N(1500) } },
                                                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
                                                    ]
                                                }
                                            },
                                            {
                                                t: 'abs_caso_estado', f: { ESTADO: 'LPA_F' }, s: {
                                                    BODY: [{
                                                        t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) }
                                                    }, {
                                                        t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: L('VELOCIDADE') },
                                                        c: 'F: os dois veem caminho livre -> toca em frente.\n' +
                                                            'SEM empurrao: este e o estado da maior parte do tempo, e\n' +
                                                            'repetir o empurrao a cada ciclo faria o carro andar aos\n' +
                                                            'trancos. Liga o PWM e deixa rolar; quem precisa de empurrao\n' +
                                                            'e quem arranca do zero, nos estados abaixo'
                                                    }]
                                                }
                                            },
                                            {
                                                t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: {
                                                    BODY: arrancarAbs(
                                                        'T: contradicao -> avanca devagar para as leituras desempatarem.\n' +
                                                        'Mesma arrancada do F, e assenta na mesma VELOCIDADE: uma caixa so')
                                                        .concat([{ t: 'abs_web_esperar', v: { MS: N(750) }, c: 'T1 = 0,75 s' }])
                                                }
                                            },
                                            {
                                                t: 'abs_caso_estado', f: { ESTADO: 'LPA_PC' }, s: {
                                                    BODY: [
                                                        {
                                                            t: 'abs_motores', f: { MANOBRA: 'RE' }, v: { VEL: L('VEL_RE') },
                                                            c: 'perpendicular: um ve obstaculo e o outro ve livre. Um dos dois\n' +
                                                                'esta errado. Parar aqui era uma decisao que NAO mudava a\n' +
                                                                'evidencia: parado, os sensores repetiam a mesma discordancia.\n' +
                                                                'Meia manobra muda a geometria e permite remedir'
                                                        },
                                                        { t: 'abs_web_esperar', v: { MS: N(300) } },
                                                        { t: 'abs_motores', f: { MANOBRA: 'DIR' }, v: { VEL: L('VEL_GIRO') } },
                                                        { t: 'abs_web_esperar', v: { MS: N(600) } },
                                                        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
                                                    ]
                                                }
                                            },
                                            {
                                                t: 'abs_senao_estado', s: {
                                                    BODY: arrancarAbs(
                                                        'os quatro estados acima sao os EXTREMOS do reticulado, e com os\n' +
                                                        'cortes em 0,5 eles sao a minoria das leituras. Uma medida como\n' +
                                                        '35 cm de um lado e 50 do outro cai em Qv->T ou T->v, regiao\n' +
                                                        'intermediaria: sem este ramo o robo ficaria parado no lugar.\n' +
                                                        'A acao e a que a LPA2v indica para contradicao nao resolvida:\n' +
                                                        'seguir devagar e remedir - com empurrao, para sair da inercia')
                                                        .concat([{ t: 'abs_web_esperar', v: { MS: N(200) } }])
                                                }
                                            }
                                        ]
                                    },
                                    next: [
                                        {
                                            t: 'abs_se',
                                            c: 'o seguro: ciclos demais sem decidir nada, desvia e recomeca',
                                            v: {
                                                COND: {
                                                    t: 'abs_comparar', f: { OP: 'GTE' },
                                                    v: { A: L('semDecidir'), B: L('LIMITE_TRAVA') }
                                                }
                                            },
                                            s: {
                                                ENTAO: desviarAbs(null).concat([
                                                    { t: 'abs_definir', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) } }
                                                ])
                                            }
                                        },
                                        {
                                            t: 'abs_definir', f: { VAR: 'semDecidir' },
                                            v: {
                                                VALOR: {
                                                    t: 'abs_conta', f: { OP: '+' },
                                                    v: { A: L('semDecidir'), B: N(1) }
                                                }
                                            }
                                        }
                                    ]
                                }]
                            }
                        },
                        {
                            t: 'abs_web_esperar', v: { MS: N(100) },
                            c: 'respiro entre disparos do ultrassom, sem largar a pagina'
                        }
                    ]
                }
            }
        ]
    }
    ,
    /* ==================================================================
     * Abstrato — controle de qualidade na esteira.
     *
     * Proposição: "A PEÇA MEDE ENTRE 1,0 E 1,5 cm".
     *
     * Dois ultrassons lado a lado, apontados para baixo, medindo a MESMA
     * peça parada sob eles. É por medirem a mesma coisa que a discordância
     * entre os dois é contradição de verdade, e não ruído de um sensor só —
     * a hipótese que faz o Grau de Contradição significar alguma coisa.
     *
     * As três saídas do reticulado, nas três lâmpadas:
     *
     *   V   verde     dentro do padrão                 -> segue na esteira
     *   F   vermelho  fora do padrão (maior OU menor)  -> volta e sai
     *   os outros dez  amarelo                          -> volta e reentra devagar
     *
     * F não distingue peça grande de peça pequena, e não precisa: as duas
     * saem pelo mesmo lado. Quem quiser separá-las lê a distância no
     * monitor — ela está lá justamente para isso.
     *
     * Por que só V e F decidem: aceitar peça ruim e rejeitar peça boa são
     * erros caros, e os dez estados do meio são exatamente as situações em
     * que a evidência não banca nenhum dos dois. O reticulado em 12 regiões
     * não vira 12 destinos; ele vira 3 destinos e 12 diagnósticos, e o
     * diagnóstico vai para o monitor.
     * ================================================================== */
    {
        arquivo: '14-abstrato-qualidade-esteira.tbk',
        nome: 'Abstrato — controle de qualidade na esteira',
        placa: 'uno',
        modo: 'abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_mostrar', f: { ROTULO: 'controle de qualidade' }, v: { VALOR: N(1) },
                            c: 'Ligacao: 2/3 = ultrassom 1 (disparo/eco) | 4/8 = ultrassom 2 |\n' +
                                '5 e 6 = IN1 e IN2 da ponte H do motor da esteira (ENA no jumper\n' +
                                'de 5 V, entao a velocidade sai no proprio pino de sentido) |\n' +
                                '11 = LED verde | 12 = LED amarelo | 13 = LED vermelho'
                        },

                        /* ---- os numeros da bancada, num lugar so ---- */
                        {
                            t: 'abs_criar', f: { VAR: 'LIM_PECA' }, v: { VALOR: N(9.5) },
                            c: 'abaixo de 9,5 cm ha peca; acima e a lona da esteira, a 10 cm.\n' +
                                'Este numero e mais permissivo que o limite de rejeicao de\n' +
                                'proposito: se fosse mais apertado, a peca baixa demais seria\n' +
                                'lida como "esteira vazia" e passaria sem ser analisada'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_MIN1' }, v: { VALOR: N(9.15) },
                            c: 'Rampa do limite de 1,0 cm. Com a lona a 10 cm, peca de 1,0 cm\n' +
                                'esta a 9,0 cm e peca de 0,85 cm esta a 9,15 cm: a 9,15 a\n' +
                                'evidencia e 0 e a 8,95 ja e 1'
                        },
                        { t: 'abs_criar', f: { VAR: 'UD_MIN2' }, v: { VALOR: N(8.95) } },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_MAX1' }, v: { VALOR: N(8.35) },
                            c: 'Rampa do limite de 1,5 cm: peca de 1,5 cm esta a 8,5 cm e peca\n' +
                                'de 1,65 cm esta a 8,35 cm. As duas rampas tem 0,2 cm de largura,\n' +
                                'e e essa largura que poe os limites 1,0 e 1,5 exatamente sobre\n' +
                                'o Grau de Certeza 0,5 - o valor em que a analise decide V'
                        },
                        { t: 'abs_criar', f: { VAR: 'UD_MAX2' }, v: { VALOR: N(8.55) } },

                        /* ---- as caixas do ciclo ---- */
                        {
                            t: 'abs_criar', f: { VAR: 'dist1' }, v: { VALOR: N(100) },
                            c: 'as distancias viram caixas porque cada uma e usada duas vezes:\n' +
                                'para ver se ha peca e para virar evidencia. Sem elas o ultrassom\n' +
                                'seria disparado de novo a cada uso, e daria outro numero'
                        },
                        { t: 'abs_criar', f: { VAR: 'dist2' }, v: { VALOR: N(100) } },
                        { t: 'abs_criar', f: { VAR: 'evid1' }, v: { VALOR: N(0) } },
                        { t: 'abs_criar', f: { VAR: 'evid2' }, v: { VALOR: N(0) } },
                        {
                            t: 'abs_criar', f: { VAR: 'CORTE' }, v: { VALOR: N(0.5) },
                            c: 'o valor de controle da decisao, aplicado ao Grau de Certeza\n' +
                                'REAL. E o mesmo +-0,5 que o Para-Analisador usa no Grau de\n' +
                                'Certeza; a diferenca esta em qual grandeza ele mede'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'tentativas' }, v: { VALOR: N(0) },
                            c: 'quantas vezes esta peca ja voltou sem que a analise concluisse'
                        },

                        ...luzesAbs('LOW', 'LOW', 'LOW'),
                        ...esteiraFrenteAbs(100)
                    ]
                }
            },

            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_definir', f: { VAR: 'dist1' }, v: { VALOR: { t: 'abs_distancia', f: { TRIG: '2', ECHO: '3' } } } },
                        { t: 'abs_definir', f: { VAR: 'dist2' }, v: { VALOR: { t: 'abs_distancia', f: { TRIG: '4', ECHO: '8' } } } },
                        {
                            t: 'abs_se_senao',
                            c: 'Portao de presenca. Sem ele a esteira vazia entraria na analise\n' +
                                'com os dois sensores vendo a lona: evidencia 0 nos dois, Grau de\n' +
                                'Certeza -1, estado F - o sistema rejeitaria uma peca que nao\n' +
                                'existe, de tres em tres segundos, para sempre.\n' +
                                'Basta UM dos dois enxergar a peca: se o outro discorda, isso e\n' +
                                'contradicao para a analise resolver, nao motivo para ignorar',
                            v: {
                                COND: {
                                    t: 'abs_logico', f: { OP: 'OR' },
                                    v: {
                                        A: { t: 'abs_comparar', f: { OP: 'LT' }, v: { A: L('dist1'), B: L('LIM_PECA') } },
                                        B: { t: 'abs_comparar', f: { OP: 'LT' }, v: { A: L('dist2'), B: L('LIM_PECA') } }
                                    }
                                }
                            },
                            s: {
                                SENAO: [
                                    ...luzesAbs('LOW', 'LOW', 'LOW'),
                                    ...esteiraFrenteAbs(100),
                                    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(50) } }
                                ],
                                ENTAO: [
                                    ...pararEsteiraAbs(),
                                    {
                                        t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(400) },
                                        c: 'a peca assenta antes de medir: com a lona andando, os dois\n' +
                                            'ecos discordam por tremor, e essa contradicao nao e da peca'
                                    },
                                    {
                                        t: 'abs_definir', f: { VAR: 'dist1' },
                                        v: { VALOR: { t: 'abs_distancia', f: { TRIG: '2', ECHO: '3' } } },
                                        c: 'a medida que vale e esta, com a esteira parada'
                                    },
                                    { t: 'abs_definir', f: { VAR: 'dist2' }, v: { VALOR: { t: 'abs_distancia', f: { TRIG: '4', ECHO: '8' } } } },

                                    {
                                        t: 'abs_definir', f: { VAR: 'evid1' }, v: { VALOR: evidFaixaAbs('dist1') },
                                        c: 'as duas rampas unidas pelo menor: e o AND da LPA2v'
                                    },
                                    { t: 'abs_definir', f: { VAR: 'evid2' }, v: { VALOR: evidFaixaAbs('dist2') } },

                                    { t: 'abs_mostrar', f: { ROTULO: 'distancia 1' }, v: { VALOR: L('dist1') } },
                                    { t: 'abs_mostrar', f: { ROTULO: 'distancia 2' }, v: { VALOR: L('dist2') } },
                                    {
                                        t: 'abs_mostrar_reticulado',
                                        v: {
                                            MU: L('evid1'),
                                            LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evid2') } }
                                        },
                                        c: 'a segunda fonte entra como evidencia favoravel e vira\n' +
                                            'desfavoravel pelo complemento: lambda = 1 - evid2'
                                    },

                                    {
                                        t: 'abs_mostrar', f: { ROTULO: 'contradicao' },
                                        v: { VALOR: { t: 'abs_grau', f: { GRAU: 'GCT' }, v: { MU1: L('evid1'), MU2: L('evid2') } } },
                                        c: 'o sinal diz quem viu mais: positivo e o sensor 1, negativo\n' +
                                            'e o sensor 2. Nao e ausencia de peca - disso cuida o portao'
                                    },
                                    {
                                        t: 'abs_mostrar', f: { ROTULO: 'certeza real' },
                                        v: { VALOR: { t: 'abs_grau', f: { GRAU: 'GCR' }, v: { MU1: L('evid1'), MU2: L('evid2') } } }
                                    },
                                    {
                                        t: 'abs_se_senao',
                                        c: 'Quem decide aqui e o Grau de Certeza REAL, e nao o Grau de\n' +
                                            'Certeza. A diferenca nao e sutil.\n' +
                                            'O Para-Analisador testa o Grau de Certeza antes do Grau de\n' +
                                            'Contradicao, entao quem passa no teste de V nunca chega ao\n' +
                                            'teste de T. Com evid1 = 1,00 e evid2 = 0,60 saem Gc = +0,6 e\n' +
                                            'Gct = +0,4: os dois sensores discordam em mais da metade da\n' +
                                            'tolerancia da peca, e o algoritmo responde V. A peca passa.\n' +
                                            'O Grau de Certeza Real ja e, por definicao, a certeza livre\n' +
                                            'do efeito da contradicao: Gcr = 1 - D, com\n' +
                                            'D = raiz((1 - |Gc|)^2 + Gct^2). Nesse mesmo caso ele vale\n' +
                                            '+0,434, fica abaixo do corte, e a peca volta para remedir.\n' +
                                            'De brinde vem a guarda de indefinicao do NAP (phi <= 0,25 ou\n' +
                                            'D > 1), que o bloco de certeza real ja aplica por dentro:\n' +
                                            'contradicao alta demais devolve zero, e zero nao aprova nem\n' +
                                            'rejeita. Uma grandeza so, no lugar de uma guarda inventada',
                                        v: {
                                            COND: {
                                                t: 'abs_comparar', f: { OP: 'GTE' },
                                                v: {
                                                    A: { t: 'abs_grau', f: { GRAU: 'GCR' }, v: { MU1: L('evid1'), MU2: L('evid2') } },
                                                    B: L('CORTE')
                                                }
                                            }
                                        },
                                        s: {
                                            ENTAO: [
                                                { t: 'abs_mostrar', f: { ROTULO: 'aprovada - dentro do padrao' }, v: { VALOR: N(1) } },
                                                ...luzesAbs('HIGH', 'LOW', 'LOW'),
                                                { t: 'abs_definir', f: { VAR: 'tentativas' }, v: { VALOR: N(0) } },
                                                ...esteiraFrenteAbs(100),
                                                {
                                                    t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(1) },
                                                    c: 'segura a esteira ligada ate a peca sair da janela de medida'
                                                }
                                            ],
                                            SENAO: [
                                                {
                                                    t: 'abs_se_senao',
                                                    v: {
                                                        COND: {
                                                            t: 'abs_comparar', f: { OP: 'LTE' },
                                                            v: {
                                                                A: { t: 'abs_grau', f: { GRAU: 'GCR' }, v: { MU1: L('evid1'), MU2: L('evid2') } },
                                                                B: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(0), B: L('CORTE') } }
                                                            }
                                                        }
                                                    },
                                                    s: {
                                                        ENTAO: [
                                                            {
                                                                t: 'abs_mostrar', f: { ROTULO: 'rejeitada - fora do padrao' }, v: { VALOR: N(0) },
                                                                c: 'certeza real negativa e forte: os dois sensores concordam\n' +
                                                                    'que a peca esta fora da faixa. Maior ou menor, sai pelo\n' +
                                                                    'mesmo lado - a distancia no monitor diz qual dos dois foi'
                                                            },
                                                            ...luzesAbs('LOW', 'LOW', 'HIGH'),
                                                            ...esteiraReAbs(70),
                                                            {
                                                                t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(1500) },
                                                                c: 'de re ate a peca sair pela entrada e cair na caixa de refugo'
                                                            },
                                                            ...pararEsteiraAbs(),
                                                            { t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(1) } },
                                                            { t: 'abs_definir', f: { VAR: 'tentativas' }, v: { VALOR: N(0) } },
                                                            ...esteiraFrenteAbs(100)
                                                        ],
                                                        SENAO: [
                                                            {
                                                                t: 'abs_mostrar', f: { ROTULO: 'sem certeza real para decidir' }, v: { VALOR: N(2) },
                                                                c: 'a peca esta na fronteira da faixa, ou os sensores discordam\n' +
                                                                    'o bastante para consumir a certeza. Nos dois casos falta\n' +
                                                                    'evidencia, e a saida e a mesma: medir de novo'
                                                            },
                                                            ...reavaliarAbs()
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    }
    ,
    /* ==================================================================
     * 15 — CARRO 4x4 COM CÂMERA: LPA2v DIRIGE, O OPERADOR SOCORRE
     *
     * A Emmy 2 do 13 numa ESP32-S3 CAM, com tração nas quatro rodas e uma
     * divisão de trabalho nova: quem dirige é a LPA2v, e o operador só entra
     * quando ela não consegue sair de onde está.
     *
     * "Preso" aqui não é um sensor: é uma conclusão tirada da própria análise.
     * Cada desvio (V, ⊥, ou o seguro de ciclos sem decidir) soma 1 em
     * "desvios"; caminho livre (F) zera. Desviar várias vezes seguidas sem
     * nunca chegar a caminho livre é o retrato de um canto sem saída — e
     * insistir só gasta bateria. Em LIMITE_PRESO desvios o carro para, a
     * página do celular abre a câmera com o aviso, e quem dirige passa a ser o
     * dedo do operador. O botão "liberar" devolve o volante à LPA2v; o botão
     * "assumir" faz o caminho inverso a qualquer momento.
     *
     * O vídeo só existe na página enquanto o operador precisa dele: no modo
     * automático a câmera fica ligada, mas ninguém está puxando quadros, e a
     * rede fica livre para os números do reticulado.
     *
     * Tração 4x4 com UM L298N: os dois motores de cada lado em paralelo no
     * mesmo canal (esquerdos em OUT1/OUT2, direitos em OUT3/OUT4). Para o
     * programa continua sendo um carro de dois lados — o mesmo bloco
     * "motores" da Emmy. O giro é de esteira (skid steer): as rodas arrastam
     * de lado, e por isso VEL_GIRO e VELOCIDADE são bem maiores que na Emmy.
     * Os números abaixo são o ponto de partida; calibre na bancada.
     *
     * Rede própria e aberta "carro4x4". No celular: conectar nela e abrir
     * http://192.168.4.1 (o vídeo vem sozinho de http://192.168.4.1:81/video).
     *
     * Ligações (ESP32-S3 CAM — a câmera ocupa 4-13 e 15-18):
     *   L298N IN1/IN2 GPIO 1 / 2  (lado direito)    IN3/IN4 GPIO 42 / 41 (esquerdo)
     *   ENA e ENB com o jumper no lugar; GND do L298N junto com o GND da placa
     *   sensor esquerdo trig/echo GPIO 14 / 21
     *   sensor direito  trig/echo GPIO 47 / 40
     *   ATENÇÃO: o echo do HC-SR04 sai em 5 V e a S3 não aguenta 5 V.
     *   Divisor em cada echo: 1 kΩ do echo ao pino, 2 kΩ do pino ao GND.
     * ================================================================== */
    {
        arquivo: '15-abstrato-carro4x4-camera.tbk',
        nome: 'Carro 4x4 — LPA2v com câmera e operador',
        placa: 'esp32s3cam',
        modo: 'abstrato',
        specs: [
            {
                t: 'abs_ao_iniciar', s: {
                    BODY: [
                        {
                            t: 'abs_motores_pinos', f: { E1: '42', E2: '41', D1: '1', D2: '2' },
                            c: 'Carro 4x4, um L298N, dois motores em paralelo por lado.\n' +
                                'Neste carro o lado ESQUERDO ficou em OUT3/OUT4 (IN3/IN4 = GPIO 42 / 41)\n' +
                                'e o DIREITO em OUT1/OUT2 (IN1/IN2 = GPIO 1 / 2): conferido no\n' +
                                'analogico. Se o giro sair trocado no seu, troque os pares aqui'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_LONGE' }, v: { VALOR: N(80) },
                            c: 'Universo de Discurso: 80 cm = caminho livre, evidencia perto de 0'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'UD_PERTO' }, v: { VALOR: N(15) },
                            c: '15 cm = obstaculo colado. Um pouco mais folgado que os 10 da Emmy:\n' +
                                'o 4x4 e mais pesado e demora mais para parar'
                        },
                        { t: 'abs_criar', f: { VAR: 'distEsq' }, v: { VALOR: N(400) } },
                        { t: 'abs_criar', f: { VAR: 'distDir' }, v: { VALOR: N(400) } },
                        {
                            t: 'abs_criar', f: { VAR: 'evidEsq' }, v: { VALOR: N(0.5) },
                            c: '0,5 = "sem informacao" na LPA2v, antes da primeira medida'
                        },
                        { t: 'abs_criar', f: { VAR: 'evidDir' }, v: { VALOR: N(0.5) } },
                        {
                            t: 'abs_criar', f: { VAR: 'semDecidir' }, v: { VALOR: N(0) },
                            c: 'ciclos seguidos sem cair em V nem em F (o seguro da Emmy 2)'
                        },
                        { t: 'abs_criar', f: { VAR: 'LIMITE_TRAVA' }, v: { VALOR: N(8) } },
                        {
                            t: 'abs_criar', f: { VAR: 'desvios' }, v: { VALOR: N(0) },
                            c: 'desvios seguidos sem chegar a caminho livre. O estado F zera'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'LIMITE_PRESO' }, v: { VALOR: N(3) },
                            c: 'tres desvios e ainda nada de caminho livre: o carro esta num canto\n' +
                                'sem saida, e a decisao passa para o operador'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'preso' }, v: { VALOR: N(0) },
                            c: '0 = a LPA2v dirige | 1 = o operador dirige pela pagina'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'manual' }, v: { VALOR: N(0) },
                            c: 'vale 1 no ciclo em que algum botao de direcao esta apertado'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VELOCIDADE' }, v: { VALOR: N(50) },
                            c: 'intensidade de 0 a 100 %. Quatro motores num L298N pedem mais\n' +
                                'que os dois da Emmy: comece em 50 e ajuste na bancada'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_ARRANQUE' }, v: { VALOR: N(75) },
                            c: 'o empurrao de 80 ms que tira o carro da inercia'
                        },
                        { t: 'abs_criar', f: { VAR: 'VEL_RE' }, v: { VALOR: N(55) } },
                        {
                            t: 'abs_criar', f: { VAR: 'VEL_GIRO' }, v: { VALOR: N(70) },
                            c: 'o giro do 4x4 arrasta as rodas de lado (skid steer): precisa de\n' +
                                'bem mais forca que o giro da Emmy'
                        },
                        {
                            t: 'abs_criar', f: { VAR: 'TEMPO_GIRO' }, v: { VALOR: N(800) },
                            c: 'ms girando para dar ~90 graus. CALIBRE: depende do piso e da bateria'
                        },
                        {
                            t: 'abs_wifi_rede_aberta', f: { NOME: 'carro4x4' },
                            c: 'rede propria e aberta. No celular: entrar em "carro4x4" e abrir\n' +
                                'http://192.168.4.1'
                        },
                        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } },
                        {
                            t: 'abs_camera_ligar', f: { TAMANHO: 'FRAMESIZE_VGA', GIRAR: '1' },
                            c: 'a camera dorme enquanto a LPA2v dirige e so acorda quando a\n' +
                                'pagina mostra o video: o OV5640 esquenta muito filmando a toa.\n' +
                                '"girada 180": nesta placa a imagem sai de cabeca para baixo'
                        }
                    ]
                }
            },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_web_atender', c: 'primeira coisa do ciclo: recebe os toques e responde o celular' },
                        {
                            t: 'abs_definir', f: { VAR: 'distEsq' },
                            c: 'sensor esquerdo (trig GPIO 14, echo GPIO 21 com divisor)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '14', ECHO: '21' } } }
                        },
                        {
                            t: 'abs_web_esperar', v: { MS: N(60) },
                            c: 'evita o eco cruzado entre os dois sensores'
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'distDir' },
                            c: 'sensor direito (trig GPIO 47, echo GPIO 40 com divisor)',
                            v: { VALOR: { t: 'abs_distancia', f: { TRIG: '47', ECHO: '40' } } }
                        },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'esq' }, v: { VALOR: L('distEsq') } },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'dir' }, v: { VALOR: L('distDir') } },
                        {
                            t: 'abs_definir', f: { VAR: 'evidEsq' },
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distEsq'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        {
                            t: 'abs_definir', f: { VAR: 'evidDir' },
                            v: { VALOR: { t: 'abs_evidencia', v: { X: L('distDir'), A1: L('UD_LONGE'), A2: L('UD_PERTO') } } }
                        },
                        {
                            t: 'abs_web_reticulado',
                            c: 'o reticulado continua no celular nos dois modos: o operador ve o\n' +
                                'que a LPA2v estaria decidindo enquanto ele dirige',
                            v: {
                                MU: L('evidEsq'),
                                LAMBDA: { t: 'abs_conta', f: { OP: '-' }, v: { A: N(1), B: L('evidDir') } }
                            }
                        },
                        {
                            t: 'abs_se_senao',
                            c: 'quem dirige neste ciclo?',
                            v: { COND: { t: 'abs_comparar', f: { OP: 'EQ' }, v: { A: L('preso'), B: N(1) } } },
                            s: {
                                ENTAO: operador4x4(),
                                SENAO: lpa4x4()
                            }
                        },
                        {
                            t: 'abs_se',
                            c: '"assumir": o operador pega o volante quando quiser, preso ou nao.\n' +
                                'Vale a partir do proximo ciclo',
                            v: { COND: { t: 'abs_web_botao', f: { NOME: 'assumir' } } },
                            s: {
                                ENTAO: [
                                    { t: 'abs_definir', f: { VAR: 'preso' }, v: { VALOR: N(1) } },
                                    { t: 'abs_web_camera_mostrar', f: { AVISO: 'controle manual: toque liberar para devolver' } }
                                ]
                            }
                        },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'desvios' }, v: { VALOR: L('desvios') } },
                        { t: 'abs_web_mostrar', f: { ROTULO: 'preso' }, v: { VALOR: L('preso') } },
                        {
                            t: 'abs_web_esperar', v: { MS: N(60) },
                            c: 'respiro entre disparos do ultrassom, sem largar a pagina'
                        }
                    ]
                }
            }
        ]
    }
];

{
    // Os parâmetros saem do exemplo 15, para os dois carros não divergirem.
    const inicio15 = EXEMPLOS.find(ex => ex.arquivo.indexOf('15-') === 0).specs[0].s.BODY;
    const parametros = semComentario(inicio15.filter(b =>
        b.t === 'abs_motores_pinos' || b.t === 'abs_criar'));

    EXEMPLOS.push({
        arquivo: '16-abstrato-carro4x4-tarefas.tbk',
        nome: 'Carro 4x4 — LPA2v em tarefas',
        placa: 'esp32s3cam',
        modo: 'abstrato',
        specs: [
            { t: 'abs_ao_iniciar', s: { BODY: parametros.concat([fazer('ligar a rede e a câmera')]) } },
            {
                t: 'abs_sempre', s: {
                    BODY: [
                        { t: 'abs_web_atender' },
                        fazer('medir as distâncias'),
                        fazer('calcular as evidências'),
                        {
                            t: 'abs_se_senao',
                            v: { COND: { t: 'abs_comparar', f: { OP: 'EQ' }, v: { A: L('preso'), B: N(1) } } },
                            s: {
                                ENTAO: [fazer('dirigir pelo operador')],
                                SENAO: [fazer('dirigir pela LPA2v'), fazer('conferir se está preso')]
                            }
                        },
                        fazer('ver se o operador assumiu'),
                        fazer('mostrar o estado na página'),
                        { t: 'abs_web_esperar', v: { MS: N(60) } }
                    ]
                }
            }
        ].concat(TAREFAS_4X4)
    });
}

const destino = path.join(RAIZ, 'exemplos');
fs.mkdirSync(destino, { recursive: true });

/*
 * Um filtro opcional pelo nome do arquivo:
 *
 *   node tools/gerar_exemplos.js          # todos
 *   node tools/gerar_exemplos.js 13       # só o que tem "13" no nome
 *
 * Existe porque quem abre um exemplo no aplicativo e arrasta os blocos para
 * outro canto salva uma DISPOSIÇÃO que este arquivo não tem como reproduzir:
 * sem renderização, o gerador só sabe empilhar os blocos de topo um embaixo do
 * outro. O .ino sai igual, a tela não. Gerar um exemplo só é o que permite
 * acrescentar o próximo sem desmanchar a arrumação dos anteriores.
 */
const filtro = process.argv.slice(2).filter(a => a[0] !== '-');
const escolhidos = filtro.length
    ? EXEMPLOS.filter(ex => filtro.some(f => ex.arquivo.indexOf(f) !== -1))
    : EXEMPLOS;

if (!escolhidos.length) {
    console.error('Nenhum exemplo casa com ' + filtro.join(', '));
    process.exit(1);
}

escolhidos.forEach(ex => {
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

    // O campo de variável de cada bloco nasce com um nome padrão ("contador",
    // "valor"), e o initModel cria essa variável no workspace antes de o spec
    // trocá-la pela de verdade. Sobra no mapa uma variável que bloco nenhum usa,
    // e ela ia parar no .tbk e na lista de variáveis da tela.
    const usadas = new Set();
    ws.getAllBlocks(false).forEach(b => b.inputList.forEach(inp => inp.fieldRow.forEach(f => {
        if (typeof f.getVariable === 'function') usadas.add(f.getValue());
    })));
    const mapaVars = ws.getVariableMap();
    mapaVars.getAllVariables().slice().forEach(v => {
        if (!usadas.has(v.getId())) mapaVars.deleteVariable(v);
    });

    const conteudo = {
        formato: 'nocodemcu/1',
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

console.log('\n' + escolhidos.length + ' exemplos gerados em exemplos/');
