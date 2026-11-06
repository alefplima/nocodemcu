'use strict';
/**
 * Verifica a promessa dos dois modos: converter não muda o programa.
 *
 *   node tools/modo_test.js
 *
 * Para cada bloco abstrato e para cada exemplo do aplicativo: gera o C++,
 * converte para o outro modo, gera de novo e compara.
 *
 * A comparação é caractere a caractere em tudo, com UMA tolerância declarada: a
 * ORDEM das linhas de declaração (as globais, e o pinMode/Serial.begin/attach
 * no topo do setup) pode mudar. O conjunto tem de ser o mesmo, e nada mais no
 * arquivo pode diferir.
 *
 * Essa tolerância não é preguiça, é consequência: num programa que fica
 * misturado depois da conversão — porque dois blocos abstratos não têm forma
 * literal — parte das declarações vem do gerador e parte do corpo, e a ordem
 * relativa entre as duas origens não é recuperável. Trocar a ordem de
 * declarações não muda o programa; o teste conta quantos casos ficaram
 * byte-idênticos e quantos precisaram da normalização, para a tolerância ficar
 * visível em vez de escondida.
 */
const fs = require('fs');
const path = require('path');
const { carregar, novoWorkspace, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;

const Converter = require(path.join(RAIZ, 'src/renderer/js/converter.js'));

let passou = 0, falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
    if (cond) { passou++; return true; }
    falhou++;
    falhas.push(nome + (detalhe ? '\n     ' + String(detalhe).replace(/\n/g, '\n     ') : ''));
    return false;
}

/* ------------------------------------------------------------------ */

let bytePerfeito = 0;
let normalizado = 0;
let remanejado = 0;

/** Ordena os blocos de declaração, deixando o resto intacto. */
function normalizar(code) {
    const DECL = /^\s*(pinMode\(|Serial\.begin\(|\w+\.attach\()/;
    const linhas = String(code).split('\n');
    const fora = [];
    let i = 0;

    // globais: o bloco de declarações antes do primeiro "void "
    const inicioFn = linhas.findIndex(l => /^(void|float|int|bool|const char|enum) /.test(l));
    const cabeca = inicioFn > 0 ? linhas.slice(0, inicioFn) : [];
    fora.push(...cabeca.slice().sort());
    i = Math.max(0, inicioFn);

    for (; i < linhas.length; i++) {
        if (/^void setup\(\) \{/.test(linhas[i])) {
            fora.push(linhas[i]);
            const decls = [];
            let j = i + 1;
            while (j < linhas.length && DECL.test(linhas[j])) { decls.push(linhas[j]); j++; }
            fora.push(...decls.sort());
            i = j - 1;
            continue;
        }
        fora.push(linhas[i]);
    }
    return fora.join('\n');
}

/** As linhas de comentário, aparadas, para comparar conteúdo e não posição. */
function comentarios(code) {
    return String(code).split('\n').map(l => l.trim())
        .filter(l => l.indexOf('//') === 0);
}

function semComentarios(code) {
    return String(code).split('\n')
        .filter(l => l.trim().indexOf('//') !== 0).join('\n');
}

/** Compara contando quantos casos foram byte-idênticos. */
function mesmoCodigo(a, b) {
    if (a === b) { bytePerfeito++; return true; }
    if (normalizar(a) === normalizar(b)) { normalizado++; return true; }

    // Terceiro nível, e o limite honesto da garantia: quando dois blocos
    // literais viram um só abstrato (print + println viram "mostrar"), os
    // comentários dos dois passam a morar no mesmo bloco e saem juntos,
    // acima da primeira linha. O código executável não muda e nenhum
    // comentário se perde — só o ponto onde ele aparece. Perder texto,
    // isso continua sendo falha.
    if (normalizar(semComentarios(a)) === normalizar(semComentarios(b))) {
        const antes = comentarios(a);
        const depois = comentarios(b);
        const perdidos = antes.filter(c => depois.indexOf(c) === -1);
        if (!perdidos.length) { remanejado++; return true; }
    }
    return false;
}

function codigoDe(estado, placa) {
    Boards.selecionar(placa || 'uno');
    const ws = new Bk.Workspace();
    Bk.serialization.workspaces.load(estado, ws);
    const code = Gen.workspaceToCode(ws);
    const avisos = (Gen.avisos_ || []).slice();
    ws.dispose();
    return { code: code, avisos: avisos };
}

function estadoDe(specs) {
    const ws = novoWorkspace(Bk, specs);
    const e = Bk.serialization.workspaces.save(ws);
    ws.dispose();
    return e;
}

/** Ida e volta: o C++ tem de sobreviver às duas conversões. */
function idaEVolta(nome, specs, placa) {
    const original = estadoDe(specs);
    const antes = codigoDe(original, placa);

    const ida = Converter.paraLiteral(original);
    const depois = codigoDe(ida.estado, placa);
    if (!ok(mesmoCodigo(antes.code, depois.code),
        nome + ': abstrato → literal preserva o C++',
        'antes:\n' + antes.code + '\ndepois:\n' + depois.code)) return;

    const volta = Converter.paraAbstrato(ida.estado);
    const final = codigoDe(volta.estado, placa);
    ok(mesmoCodigo(antes.code, final.code), nome + ': volta ao abstrato preserva o C++',
        'antes:\n' + antes.code + '\ndepois:\n' + final.code);
}

const N = v => ({ t: 'ard_number', f: { NUM: v } });
const B = v => ({ t: 'logic_boolean', f: { BOOL: v } });

function programa(corpoInicio, corpoSempre) {
    return [
        { t: 'abs_ao_iniciar', s: { BODY: corpoInicio || [] } },
        { t: 'abs_sempre', s: { BODY: corpoSempre || [] } }
    ];
}

/* ================================================================== */
/* 1. Coerência estrutural                                             */
/* ================================================================== */

console.log('\n== 1. Coerência dos blocos abstratos ==');

Boards.selecionar('uno');
const tiposAbs = Object.keys(Bk.Blocks).filter(t => t.indexOf('abs_') === 0).sort();
ok(tiposAbs.length >= 30, 'o conjunto abstrato tem tamanho esperado (' +
    tiposAbs.length + ' ≥ 30)');

tiposAbs.forEach(t => {
    ok(typeof Gen.forBlock[t] === 'function', 'bloco ' + t + ' tem gerador');
});

/* A lista dos literais sem forma abstrata é fechada: se um bloco literal novo
   aparecer sem par nem declaração, o teste avisa. */
const PARES_CONHECIDOS = [
    'ard_setup', 'ard_loop', 'ard_pinmode', 'ard_digitalwrite', 'ard_digitalread',
    'ard_analogwrite', 'ard_analogread', 'ard_delay', 'ard_millis', 'ard_micros',
    'ard_tone_dur', 'ard_map', 'ard_random', 'ard_arith', 'ard_while', 'ard_for',
    'ard_serial_begin', 'ard_serial_print', 'ard_serial_println', 'ard_text',
    'ard_number', 'ard_const', 'ard_char', 'ard_var_global', 'ard_var_declare',
    'ard_comment', 'ard_break', 'ard_continue', 'ard_delaymicroseconds',
    'ard_notone', 'ard_tone', 'ard_constrain', 'ard_minmax', 'ard_math_single',
    'ard_pow', 'ard_random_max', 'ard_randomseed', 'ard_incdec',
    'ard_compound_assign', 'ard_serial_available', 'ard_serial_read',
    'ard_serial_readstringuntil', 'ard_serial_parseint', 'ard_serial_flush',
    'ard_serial_end', 'ard_serial_write', 'ard_serial_print_format',
    'ard_analogreference', 'ard_analogreadresolution', 'ard_do_while',
    'ard_eeprom_begin', 'ard_eeprom_read', 'ard_eeprom_write', 'ard_eeprom_commit',
    'ard_lcd_init', 'ard_lcd_backlight', 'ard_lcd_setcursor', 'ard_lcd_print',
    'ard_lcd_clear', 'ard_servo_attach', 'ard_servo_write', 'ard_servo_read',
    'ard_servo_detach', 'ard_servo_writemicroseconds', 'ard_softserial_begin',
    'ard_softserial_println', 'ard_softserial_available', 'ard_softserial_read',
    'ard_spi_begin', 'ard_spi_transfer', 'ard_wire_begin',
    'ard_wire_begintransmission', 'ard_wire_write', 'ard_wire_endtransmission',
    'ard_wire_requestfrom', 'ard_wire_available', 'ard_wire_read',
    'ard_dht_begin', 'ard_dht_read', 'ard_wifi_begin', 'ard_wifi_status',
    'ard_wifi_localip', 'ard_wifi_rssi', 'ard_wifi_disconnect', 'ard_esp_restart',
    'ard_esp_deepsleep', 'ard_esp_freeheap', 'ard_ledc_attach', 'ard_ledc_write',
    'ard_ledc_detach'
];
const tiposLiterais = Object.keys(Bk.Blocks).filter(t => t.indexOf('ard_') === 0);
const orfaos = tiposLiterais.filter(t =>
    !Converter.SEM_ABSTRATO[t] && PARES_CONHECIDOS.indexOf(t) === -1);
ok(orfaos.length === 0,
    'todo bloco literal está classificado (com par ou declarado sem forma abstrata)',
    'sem classificação: ' + orfaos.join(', '));

/* ================================================================== */
/* 2. Cada bloco abstrato, isolado                                     */
/* ================================================================== */

console.log('== 2. Ida e volta de cada bloco ==');

const CASOS = [
    ['escrita digital', programa([], [{ t: 'abs_escrita_digital', f: { PIN: '13', VALOR: 'HIGH' } }])],
    ['esperar em s', programa([], [{ t: 'abs_esperar', f: { UNI: 's' }, v: { QTD: N(1) } }])],
    ['esperar em ms', programa([], [{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(250) } }])],
    ['leitura digital', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 'botao' },
        v: { VALOR: { t: 'abs_leitura_digital', f: { PIN: '2' } } }
    }])],
    ['botão', programa([], [{
        t: 'abs_se', v: { COND: { t: 'abs_botao', f: { PIN: '2' } } },
        s: { ENTAO: [{ t: 'abs_escrita_digital', f: { PIN: '13', VALOR: 'HIGH' } }] }
    }])],
    ['intensidade', programa([], [{ t: 'abs_escrita_analogica', f: { PIN: '3' }, v: { PCT: N(50) } }])],
    ['leitura analógica', programa([], [{
        t: 'abs_mostrar_grafico', f: { ROTULO: 'luz' },
        v: { VALOR: { t: 'abs_leitura_analogica', f: { PIN: 'A0' } } }
    }])],
    ['nota', programa([], [{ t: 'abs_nota', f: { PIN: '8' }, v: { FREQ: N(440), DUR: N(200) } }])],
    ['tempo ligado ms', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 't' }, v: { VALOR: { t: 'abs_tempo_ligado', f: { UNI: 'ms' } } }
    }])],
    ['tempo ligado s', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 't' }, v: { VALOR: { t: 'abs_tempo_ligado', f: { UNI: 's' } } }
    }])],
    ['mostrar no reticulado', programa([], [{
        t: 'abs_mostrar_reticulado', v: { MU: N(0.86), LAMBDA: N(0.28) }
    }])],
    ['repetir', programa([], [{
        t: 'abs_repetir', v: { VEZES: N(5) },
        s: { BODY: [{ t: 'abs_escrita_digital', f: { PIN: '13', VALOR: 'LOW' } }] }
    }])],
    ['enquanto', programa([], [{
        t: 'abs_enquanto', v: { COND: B('FALSE') },
        s: { BODY: [{ t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(10) } }] }
    }])],
    ['comparar e lógico', programa([], [{
        t: 'abs_se',
        v: {
            COND: {
                t: 'abs_logico', f: { OP: 'AND' },
                v: {
                    A: { t: 'abs_comparar', f: { OP: 'GT' }, v: { A: N(3), B: N(2) } },
                    B: { t: 'abs_comparar', f: { OP: 'LT' }, v: { A: N(1), B: N(9) } }
                }
            }
        },
        s: { ENTAO: [] }
    }])],
    ['conta, mapear, sorteio', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 'x' },
        v: {
            VALOR: {
                t: 'abs_conta', f: { OP: '+' },
                v: {
                    A: { t: 'abs_mapear', v: { VALOR: N(5), DE_MIN: N(0), DE_MAX: N(10), PARA_MIN: N(0), PARA_MAX: N(100) } },
                    B: { t: 'abs_sorteio', v: { MIN: N(0), MAX: N(3) } }
                }
            }
        }
    }])],
    ['variáveis', [
        { t: 'abs_ao_iniciar', s: { BODY: [{ t: 'abs_criar', f: { VAR: 'contador' }, v: { VALOR: N(0) } }] } },
        {
            t: 'abs_sempre', s: {
                BODY: [
                    { t: 'abs_definir', f: { VAR: 'contador' }, v: { VALOR: N(7) } },
                    { t: 'abs_mostrar', f: { ROTULO: 'c' }, v: { VALOR: { t: 'abs_ler', f: { VAR: 'contador' } } } }
                ]
            }
        }
    ]],
    ['evidência e graus', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 'gc' },
        v: {
            VALOR: {
                t: 'abs_grau', f: { GRAU: 'GC' },
                v: {
                    MU1: { t: 'abs_evidencia', v: { X: N(13), A1: N(25), A2: N(12) } },
                    MU2: N(0.8)
                }
            }
        }
    }])],
    ['contradição', programa([], [{
        t: 'abs_se', v: { COND: { t: 'abs_contradicao', v: { MU1: N(0.9), MU2: N(0.1) } } },
        s: { ENTAO: [{ t: 'abs_escrita_digital', f: { PIN: '9', VALOR: 'HIGH' } }] }
    }])],
    ['combinar', programa([], [{
        t: 'abs_mostrar', f: { ROTULO: 'm' },
        v: { VALOR: { t: 'abs_combinar', f: { OP: 'MAX' }, v: { A: N(0.7), B: N(0.4) } } }
    }])],
    ['analisar com casos', programa([], [{
        t: 'abs_quando_estado', v: { MU1: N(0.9), MU2: N(0.8) },
        s: {
            CASOS: [
                { t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: { BODY: [{ t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' } }] } },
                { t: 'abs_caso_estado', f: { ESTADO: 'LPA_T' }, s: { BODY: [{ t: 'abs_mostrar', f: { ROTULO: 'alarme' }, v: { VALOR: N(1) } }] } }
            ]
        }
    }])],
    // Os quatro extremos são a minoria do reticulado: sem o "nos demais estados",
    // uma leitura intermediária não dispara nada. O par literal é o lp_senao.
    ['analisar com o senão', programa([], [{
        t: 'abs_quando_estado', v: { MU1: N(0.64), MU2: N(0.43) },
        s: {
            CASOS: [
                { t: 'abs_caso_estado', f: { ESTADO: 'LPA_V' }, s: { BODY: [{ t: 'abs_escrita_digital', f: { PIN: '7', VALOR: 'HIGH' } }] } },
                { t: 'abs_senao_estado', s: { BODY: [{ t: 'abs_mostrar', f: { ROTULO: 'indefinido' }, v: { VALOR: N(1) } }] } }
            ]
        }
    }])]
];

CASOS.forEach(([nome, specs]) => idaEVolta(nome, specs));

/* servo: só nas placas com a biblioteca */
idaEVolta('servo', programa([], [{ t: 'abs_servo', f: { PIN: '9' }, v: { ANGULO: N(90) } }]));

/*
 * Motores e página web: nenhum destes converte — cada um vale uma função no
 * .ino, e função é recurso do Modo Literal. O que o teste cobra aqui é
 * justamente isso: bloco que não converte tem de sair do outro lado com o
 * arquivo intacto, e não com o programa remendado pela metade.
 */
idaEVolta('motores', programa(
    [{ t: 'abs_motores_pinos', f: { E1: '2', E2: '4', D1: '18', D2: '19' } }],
    [
        { t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: N(30) } },
        { t: 'abs_motores', f: { MANOBRA: 'PARAR' }, v: { VEL: N(0) } }
    ]), 'esp32');

idaEVolta('tarefas', programa([], [
    { t: 'abs_fazer_tarefa', f: { NOME: 'piscar' } },
    { t: 'abs_esperar', f: { UNI: 'ms' }, v: { QTD: N(500) } }
]).concat([{
    t: 'abs_tarefa', f: { NOME: 'piscar' },
    s: { BODY: [{ t: 'abs_escrita_digital', f: { PIN: '13', VALOR: 'HIGH' } }] }
}]));

/* A tarefa fica acima do "Ao iniciar" e é gerada antes dele: os pinos dos
   motores ainda têm de ser os do bloco de configuração, não os da bancada. */
idaEVolta('tarefa com motores antes do Ao iniciar', [{
    t: 'abs_tarefa', f: { NOME: 'avançar' },
    s: { BODY: [{ t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: N(40) } }] }
}].concat(programa(
    [{ t: 'abs_motores_pinos', f: { E1: '5', E2: '6', D1: '7', D2: '8' } }],
    [{ t: 'abs_fazer_tarefa', f: { NOME: 'avançar' } }])), 'esp32');

{
    Boards.selecionar('esp32');
    const ws = novoWorkspace(Bk, [{
        t: 'abs_tarefa', f: { NOME: 'avançar' },
        s: { BODY: [{ t: 'abs_motores', f: { MANOBRA: 'FRENTE' }, v: { VEL: N(40) } }] }
    }].concat(programa(
        [{ t: 'abs_motores_pinos', f: { E1: '5', E2: '6', D1: '7', D2: '8' } }],
        [{ t: 'abs_fazer_tarefa', f: { NOME: 'avançar' } }])));
    const code = Gen.workspaceToCode(ws);
    ws.dispose();
    ok(code.indexOf('void avancar() {\n  absMotores(5, 6, 7, 8, ABS_FRENTE, 40);\n}') !== -1,
        'a tarefa gerada antes do Ao iniciar usa os pinos configurados', code);
    ok(/void loop\(\) \{\n  avancar\(\);\n\}/.test(code), 'o Sempre chama a tarefa', code);
}

/* Uma função literal void sem parâmetros vira tarefa; com parâmetro, não. */
{
    const original = estadoDe([
        { t: 'ard_setup', s: { BODY: [] } },
        { t: 'ard_loop', s: { BODY: [{ t: 'ard_call', f: { NOME: 'piscar' } }, { t: 'ard_call', f: { NOME: 'somar' } }] } },
        { t: 'ard_function_def', f: { TIPO: 'void', NOME: 'piscar', PARAMS: '' }, s: { BODY: [] } },
        { t: 'ard_function_def', f: { TIPO: 'void', NOME: 'somar', PARAMS: 'int a' }, s: { BODY: [] } }
    ]);
    const r = Converter.paraAbstrato(original);
    const tipos = JSON.stringify(r.estado.blocks.blocks.map(b => b.type));
    ok(tipos === JSON.stringify(['abs_ao_iniciar', 'abs_sempre', 'abs_tarefa', 'ard_function_def']),
        'só a função void sem parâmetros vira tarefa', tipos);
    const loop = r.estado.blocks.blocks[1].inputs.BODY.block;
    ok(loop.type === 'abs_fazer_tarefa' && loop.next.block.type === 'ard_call',
        'só a chamada da tarefa vira "fazer a tarefa"', JSON.stringify(loop));
    ok(mesmoCodigo(codigoDe(original).code, codigoDe(r.estado).code),
        'e o C++ não muda');
}

idaEVolta('página web', programa(
    [
        { t: 'abs_wifi_rede_aberta', f: { NOME: 'emmy2' } },
        { t: 'abs_web_servidor', f: { PORTA_REDE: 80 } }
    ],
    [
        { t: 'abs_web_atender' },
        { t: 'abs_web_mostrar', f: { ROTULO: 'esq' }, v: { VALOR: N(12) } },
        { t: 'abs_web_reticulado', v: { MU: N(0.86), LAMBDA: N(0.28) } },
        {
            t: 'abs_se', v: { COND: { t: 'abs_web_botao', f: { NOME: 'frente' } } },
            s: { ENTAO: [{ t: 'abs_escrita_digital', f: { PIN: '13', VALOR: 'HIGH' } }] }
        },
        { t: 'abs_web_esperar', v: { MS: N(100) } }
    ]), 'esp32');

idaEVolta('entrar na rede com IP fixo', programa(
    [
        { t: 'abs_wifi_ip_fixo', f: { IP: '10.140.109.222', GATEWAY: '10.140.109.95', MASCARA: '255.255.255.0' } },
        { t: 'abs_wifi_entrar', f: { SSID: 'minha-rede', SENHA: 'senha123' } }
    ],
    [{ t: 'abs_web_atender' }]), 'esp32');

/* E o relatório tem de dizer que eles ficaram como estavam. */
{
    const estado = estadoDe(programa(
        [{ t: 'abs_web_servidor', f: { PORTA_REDE: 80 } }],
        [{ t: 'abs_web_atender' }]));
    const r = Converter.paraLiteral(estado);
    ok(r.mantidos.some(m => m.tipo === 'abs_web_atender'),
        'o bloco de página entra no relatório de não convertidos',
        JSON.stringify(r.mantidos));
}

/* ================================================================== */
/* 3. Os exemplos do aplicativo                                        */
/* ================================================================== */

console.log('== 3. Ida e volta dos exemplos ==');

fs.readdirSync(path.join(RAIZ, 'exemplos'))
    .filter(f => /\.tbk$/.test(f)).sort()
    .forEach(arq => {
        const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'exemplos', arq), 'utf8'));
        const antes = codigoDe(j.workspace, j.placa);

        const abs = Converter.paraAbstrato(j.workspace);
        const depoisAbs = codigoDe(abs.estado, j.placa);
        ok(mesmoCodigo(antes.code, depoisAbs.code), arq + ': literal → abstrato preserva o C++',
            'convertidos: ' + abs.convertidos + '\nantes:\n' + antes.code +
            '\ndepois:\n' + depoisAbs.code);

        const volta = Converter.paraLiteral(abs.estado);
        const depoisLit = codigoDe(volta.estado, j.placa);
        ok(mesmoCodigo(antes.code, depoisLit.code), arq + ': e a volta ao literal também',
            'antes:\n' + antes.code + '\ndepois:\n' + depoisLit.code);
    });

/* ================================================================== */
/* 4. Relatório honesto                                                */
/* ================================================================== */

console.log('== 4. O que não converte é relatado ==');

{
    const specs = [
        { t: 'ard_setup', s: { BODY: [] } },
        { t: 'ard_loop', s: { BODY: [{ t: 'ard_raw_stmt', f: { CODE: 'PORTB |= 1;' } }] } }
    ];
    const original = estadoDe(specs);
    const antes = codigoDe(original);
    const r = Converter.paraAbstrato(original);
    const depois = codigoDe(r.estado);
    ok(mesmoCodigo(antes.code, depois.code), 'programa com código livre converte sem mudar o C++');
    ok(r.mantidos.some(m => m.tipo === 'ard_raw_stmt'),
        'o código livre entra no relatório', JSON.stringify(r.mantidos));
}
{
    // digitalWrite sem o pinMode correspondente não é uma "escrita digital"
    const specs = [
        { t: 'ard_setup', s: { BODY: [] } },
        {
            t: 'ard_loop', s: {
                BODY: [{
                    t: 'ard_digitalwrite', f: { PIN: '13' },
                    v: { VALOR: { t: 'ard_const', f: { CONST: 'HIGH' } } }
                }]
            }
        }
    ];
    const original = estadoDe(specs);
    const antes = codigoDe(original);
    const r = Converter.paraAbstrato(original);
    ok(mesmoCodigo(antes.code, codigoDe(r.estado).code),
        'digitalWrite sem pinMode fica literal e o C++ não muda');
    ok(r.mantidos.some(m => m.tipo === 'ard_digitalwrite'),
        'e é relatado', JSON.stringify(r.mantidos));
}

/* ================================================================== */

console.log('\ncomparações de C++: ' + bytePerfeito + ' byte-idênticas, ' +
    normalizado + ' idênticas a menos da ordem das declarações, ' +
    remanejado + ' com comentários reagrupados (nenhum perdido)');
console.log('----------------------------------------');
console.log('passou: ' + passou + '   falhou: ' + falhou);
console.log('----------------------------------------\n');
if (falhas.length) {
    falhas.slice(0, 8).forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f + '\n'));
    if (falhas.length > 8) console.log('  … e mais ' + (falhas.length - 8) + '\n');
}
process.exit(falhou ? 1 : 0);
