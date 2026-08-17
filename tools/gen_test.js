'use strict';
/**
 * Harness do gerador — roda em Node puro, sem placa e sem Electron.
 *
 *   node tools/gen_test.js
 *
 * Cobre três frentes:
 *   1. coerência estrutural (todo bloco tem gerador, toda placa tem pinos);
 *   2. o C++ gerado, comparado caractere a caractere com o esperado;
 *   3. os avisos (variável não declarada, falta de setup/loop, bloco solto).
 *
 * O que este harness NÃO faz é garantir que o C++ compila — isso é
 * tools/compile_test.js, que chama o arduino-cli de verdade.
 */
const { carregar, novoWorkspace } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;
const Toolbox = amb.Toolbox;
const Validate = amb.Validate;

let passou = 0;
let falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
    if (cond) { passou++; return true; }
    falhou++;
    falhas.push(nome + (detalhe ? '\n     ' + String(detalhe).replace(/\n/g, '\n     ') : ''));
    return false;
}

function igual(obtido, esperado, nome) {
    if (obtido === esperado) { passou++; return true; }
    falhou++;
    falhas.push(nome + '\n     esperado:\n' + indentar(esperado) + '\n     obtido:\n' + indentar(obtido));
    return false;
}

function indentar(s) {
    return String(s).split('\n').map(l => '       | ' + l).join('\n');
}

function gerar(specs, placa) {
    Boards.selecionar(placa || 'uno');
    const ws = novoWorkspace(Bk, specs);
    const code = Gen.workspaceToCode(ws);
    return { code: code, avisos: Gen.avisos_.slice(), mapa: Object.assign({}, Gen.mapaLinhas), ws: ws };
}

/** Esqueleto mínimo: setup e loop vazios, para comparar só o miolo. */
function programa(corpoSetup, corpoLoop, cabecalho) {
    return (cabecalho ? cabecalho + '\n\n' : '') +
        'void setup() {\n' + corpoSetup + '}\n\n' +
        'void loop() {\n' + corpoLoop + '}\n';
}

function setupLoop(setupBody, loopBody) {
    return [
        { t: 'ard_setup', s: { BODY: setupBody || [] } },
        { t: 'ard_loop', s: { BODY: loopBody || [] } }
    ];
}

const N = v => ({ t: 'ard_number', f: { NUM: v } });
const K = v => ({ t: 'ard_const', f: { CONST: v } });
const T = v => ({ t: 'ard_text', f: { TEXTO: v } });

/* ================================================================== */
/* 1. Coerência estrutural                                             */
/* ================================================================== */

console.log('\n== 1. Coerência estrutural ==');

const tiposDefinidos = Object.keys(Bk.Blocks).filter(t => /^(ard|lp)_/.test(t));
ok(tiposDefinidos.length >= 90, 'conjunto de blocos tem tamanho esperado (' + tiposDefinidos.length + ' >= 90)');

tiposDefinidos.forEach(tipo => {
    ok(typeof Gen.forBlock[tipo] === 'function', 'bloco ' + tipo + ' tem gerador');
});

Boards.ORDEM.forEach(id => {
    Boards.selecionar(id);
    const oferecidos = Toolbox.tiposOferecidos();
    oferecidos.forEach(tipo => {
        ok(!!Bk.Blocks[tipo], 'toolbox[' + id + ']: bloco ' + tipo + ' está definido');
        ok(typeof Gen.forBlock[tipo] === 'function', 'toolbox[' + id + ']: bloco ' + tipo + ' tem gerador');
    });
    ok(oferecidos.length > 50, 'toolbox[' + id + '] oferece blocos suficientes (' + oferecidos.length + ')');
});

// Toda placa precisa de pinos utilizáveis em cada papel
Boards.ORDEM.forEach(id => {
    Boards.selecionar(id);
    ['digital', 'digitalIn', 'analog', 'pwm', 'interrupt'].forEach(tipo => {
        const lista = Boards.pinos(tipo);
        const vazio = lista.length === 1 && lista[0][0] === '--';
        ok(lista.length > 0 && !vazio,
            'placa ' + id + ' tem pinos para ' + tipo + ' (' + lista.length + ')');
    });
    const p = Boards.get(id);
    ok(/^[a-z0-9]+:[a-z0-9]+:/.test(p.fqbn), 'placa ' + id + ' tem FQBN plausível: ' + p.fqbn);
});

// Categorias condicionais aparecem só onde devem
Boards.selecionar('uno');
const nomesUno = Toolbox.construir().contents.map(c => c.name);
ok(nomesUno.indexOf('ESP / WiFi') === -1, 'categoria ESP não aparece no Uno');
ok(Toolbox.tiposOferecidos().indexOf('ard_analogreference') !== -1, 'analogReference aparece no Uno');
ok(Toolbox.tiposOferecidos().indexOf('ard_ledc_write') === -1, 'ledcWrite não aparece no Uno');

Boards.selecionar('esp32');
const nomesEsp = Toolbox.construir().contents.map(c => c.name);
ok(nomesEsp.indexOf('ESP / WiFi') !== -1, 'categoria ESP aparece no ESP32');
ok(Toolbox.tiposOferecidos().indexOf('ard_ledc_write') !== -1, 'ledcWrite aparece no ESP32');
ok(Toolbox.tiposOferecidos().indexOf('ard_softserial_begin') === -1, 'SoftwareSerial não aparece no ESP32');
ok(Toolbox.tiposOferecidos().indexOf('ard_analogreference') === -1, 'analogReference não aparece no ESP32');

Boards.selecionar('esp8266');
ok(Toolbox.tiposOferecidos().indexOf('ard_wifi_begin') !== -1, 'WiFi aparece no ESP8266');

/* ================================================================== */
/* 2. Código gerado                                                    */
/* ================================================================== */

console.log('== 2. Código gerado ==');

// --- 2.1 Blink literal ---------------------------------------------------
{
    const r = gerar(setupLoop(
        [{ t: 'ard_pinmode', f: { PIN: '13', MODO: 'OUTPUT' } }],
        [
            { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } },
            { t: 'ard_delay', v: { MS: N(1000) } },
            { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('LOW') } },
            { t: 'ard_delay', v: { MS: N(1000) } }
        ]
    ));
    igual(r.code, programa(
        '  pinMode(13, OUTPUT);\n',
        '  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n'
    ), 'blink literal');
    ok(r.avisos.length === 0, 'blink não gera avisos', JSON.stringify(r.avisos));
}

// --- 2.2 Nada é injetado sozinho ----------------------------------------
{
    const r = gerar(setupLoop([], []));
    igual(r.code, programa('', ''), 'programa vazio não inventa Serial.begin nem delay');
}

// --- 2.3 Precedência -----------------------------------------------------
{
    const soma = { t: 'ard_arith', f: { OP: '+' }, v: { A: N(1), B: N(2) } };
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_arith', f: { OP: '*' }, v: { A: soma, B: N(3) } } } }
    ]));
    ok(r.code.indexOf('Serial.println((1 + 2) * 3);') !== -1,
        'soma dentro de multiplicação ganha parênteses', r.code);
}
{
    const mult = { t: 'ard_arith', f: { OP: '*' }, v: { A: N(2), B: N(3) } };
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_arith', f: { OP: '+' }, v: { A: mult, B: N(1) } } } }
    ]));
    ok(r.code.indexOf('Serial.println(2 * 3 + 1);') !== -1,
        'multiplicação dentro de soma não ganha parênteses inúteis', r.code);
}
{
    // && dentro de || precisa de parênteses só quando a ordem exige
    const cmpA = { t: 'logic_compare', f: { OP: 'GT' }, v: { A: { t: 'ard_analogread', f: { PIN: 'A0' } }, B: N(100) } };
    const cmpB = { t: 'logic_compare', f: { OP: 'LT' }, v: { A: { t: 'ard_analogread', f: { PIN: 'A1' } }, B: N(900) } };
    const e = { t: 'logic_operation', f: { OP: 'AND' }, v: { A: cmpA, B: cmpB } };
    const r = gerar(setupLoop([], [
        { t: 'ard_while', v: { COND: e }, s: { BODY: [{ t: 'ard_delay', v: { MS: N(10) } }] } }
    ]));
    ok(r.code.indexOf('while (analogRead(A0) > 100 && analogRead(A1) < 900) {') !== -1,
        'comparações dentro de && sem parênteses supérfluos', r.code);
}

// --- 2.4 if / else if / else --------------------------------------------
{
    const ws = new Bk.Workspace();
    const iff = ws.newBlock('controls_if');
    iff.initModel && iff.initModel();
    // dois ramos extras: else if + else
    if (iff.elseifCount_ !== undefined) {
        iff.elseifCount_ = 1;
        iff.elseCount_ = 1;
        iff.updateShape_ && iff.updateShape_();
    }
    ok(!!iff.getInput('IF1') && !!iff.getInput('ELSE'), 'controls_if aceita else if e else');
}
{
    const r = gerar(setupLoop([], [
        {
            t: 'controls_if',
            v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'ard_digitalread', f: { PIN: '2' } }, B: K('HIGH') } } },
            s: { DO0: [{ t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } }] }
        }
    ]));
    igual(r.code, programa('',
        '  if (digitalRead(2) == HIGH) {\n' +
        '    digitalWrite(13, HIGH);\n' +
        '  }\n'
    ), 'if simples com corpo indentado');
}

// --- 2.5 for / while / do-while / switch --------------------------------
{
    const r = gerar(setupLoop([], [
        {
            t: 'ard_for', f: { VAR: 'i', CMP: '<', OP: '+=' },
            v: { INICIO: N(0), LIMITE: N(10), PASSO: N(1) },
            s: { BODY: [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_raw_expr', f: { CODE: 'i' } } } }] }
        }
    ]));
    ok(r.code.indexOf('for (int i = 0; i < 10; i += 1) {') !== -1, 'for em forma literal do C', r.code);
}
{
    const r = gerar(setupLoop([], [
        { t: 'ard_do_while', v: { COND: { t: 'ard_raw_expr', f: { CODE: 'Serial.available() == 0' } } }, s: { BODY: [{ t: 'ard_delay', v: { MS: N(10) } }] } }
    ]));
    ok(r.code.indexOf('do {\n    delay(10);\n  } while (Serial.available() == 0);') !== -1,
        'do...while sai na ordem certa', r.code);
}
{
    const r = gerar(setupLoop([], [
        {
            t: 'ard_switch', v: { EXPR: { t: 'ard_raw_expr', f: { CODE: 'modo' } } },
            s: {
                CASOS: [
                    { t: 'ard_case', f: { VALOR: '1', BREAK: 'TRUE' }, s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } }] } },
                    { t: 'ard_case', f: { VALOR: '2', BREAK: 'FALSE' }, s: { BODY: [] } },
                    { t: 'ard_default', s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('LOW') } }] } }
                ]
            }
        }
    ]));
    ok(r.code.indexOf('switch (modo) {') !== -1, 'switch abre corretamente', r.code);
    ok(r.code.indexOf('case 1:') !== -1 && r.code.indexOf('break;') !== -1, 'case com break', r.code);
    ok(/case 2:\s*\n\s*default:/.test(r.code), 'case sem break cai no próximo', r.code);
    ok(r.code.indexOf('default:') !== -1, 'default presente', r.code);
}

// --- 2.6 Variáveis -------------------------------------------------------
{
    const r = gerar([
        { t: 'ard_var_global', f: { QUAL: '', TIPO: 'int', VAR: 'contador' }, v: { VALOR: N(0) } },
        ...setupLoop([], [
            { t: 'ard_incdec', f: { VAR: 'contador', OP: '++' } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'variables_get', f: { VAR: 'contador' } } } }
        ])
    ]);
    igual(r.code, programa('',
        '  contador++;\n  Serial.println(contador);\n',
        'int contador = 0;'
    ), 'variável global declarada fora do setup/loop');
    ok(r.avisos.length === 0, 'variável declarada não gera aviso', JSON.stringify(r.avisos));
}
{
    const r = gerar(setupLoop([], [
        { t: 'variables_set', f: { VAR: 'x' }, v: { VALUE: N(5) } }
    ]));
    ok(r.avisos.some(a => /nunca foi declarada/.test(a.mensagem)),
        'variável usada sem declaração vira aviso', JSON.stringify(r.avisos));
}
{
    const r = gerar(setupLoop([
        { t: 'ard_var_declare', f: { QUAL: 'const', TIPO: 'byte', VAR: 'pino' }, v: { VALOR: N(13) } }
    ], []));
    ok(r.code.indexOf('  const byte pino = 13;') !== -1, 'declaração local com qualificador', r.code);
}

// --- 2.7 Includes e instâncias, uma vez só ------------------------------
{
    const r = gerar(setupLoop(
        [{ t: 'ard_servo_attach', f: { OBJ: 'meuServo', PIN: '9' } }],
        [
            { t: 'ard_servo_write', f: { OBJ: 'meuServo' }, v: { ANGULO: N(0) } },
            { t: 'ard_delay', v: { MS: N(500) } },
            { t: 'ard_servo_write', f: { OBJ: 'meuServo' }, v: { ANGULO: N(180) } }
        ]
    ));
    ok((r.code.match(/#include <Servo.h>/g) || []).length === 1, 'include do Servo aparece uma vez', r.code);
    ok((r.code.match(/Servo meuServo;/g) || []).length === 1, 'instância do Servo aparece uma vez', r.code);
    ok(r.code.indexOf('#include <Servo.h>') < r.code.indexOf('Servo meuServo;'), 'include vem antes da instância');
    ok(r.code.indexOf('Servo meuServo;') < r.code.indexOf('void setup()'), 'instância vem antes do setup');
}
{
    const r = gerar(setupLoop(
        [{ t: 'ard_servo_attach', f: { OBJ: 'garra', PIN: '9' } }, { t: 'ard_servo_attach', f: { OBJ: 'base', PIN: '10' } }],
        []
    ));
    ok(r.code.indexOf('Servo garra;') !== -1 && r.code.indexOf('Servo base;') !== -1,
        'dois servos geram duas instâncias', r.code);
}
{
    // O bloco init do LCD manda nos parâmetros, mesmo gerado depois do print
    const r = gerar([
        { t: 'ard_loop', s: { BODY: [{ t: 'ard_lcd_print', f: { OBJ: 'lcd' }, v: { VALOR: T('oi') } }] } },
        { t: 'ard_setup', s: { BODY: [{ t: 'ard_lcd_init', f: { OBJ: 'lcd', ENDERECO: '0x3F', COLS: '20', ROWS: '4' } }] } }
    ]);
    ok(r.code.indexOf('LiquidCrystal_I2C lcd(0x3F, 20, 4);') !== -1,
        'init do LCD sobrescreve a instância padrão', r.code);
    ok((r.code.match(/LiquidCrystal_I2C lcd/g) || []).length === 1, 'uma instância de LCD', r.code);
}

// --- 2.8 Funções ---------------------------------------------------------
{
    const r = gerar([
        {
            t: 'ard_function_def', f: { TIPO: 'int', NOME: 'dobro', PARAMS: 'int v' },
            s: { BODY: [{ t: 'ard_return', v: { VALOR: { t: 'ard_raw_expr', f: { CODE: 'v * 2' } } } }] }
        },
        ...setupLoop([], [
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_call_value', f: { NOME: 'dobro' }, v: { ARG0: N(21) } } } }
        ])
    ]);
    ok(r.code.indexOf('int dobro(int v);') !== -1, 'protótipo da função é emitido', r.code);
    ok(r.code.indexOf('int dobro(int v) {\n  return v * 2;\n}') !== -1, 'corpo da função', r.code);
    ok(r.code.indexOf('Serial.println(dobro(21));') !== -1, 'chamada com argumento', r.code);
    ok(r.code.indexOf('int dobro(int v);') < r.code.indexOf('int dobro(int v) {'),
        'protótipo antes da definição');
}
{
    const r = gerar(setupLoop([], [
        { t: 'ard_call', f: { NOME: 'piscar' }, v: { ARG0: N(13), ARG2: N(3) } }
    ]));
    ok(r.code.indexOf('piscar(13, 3);') !== -1, 'argumentos vazios são ignorados na chamada', r.code);
}

// --- 2.9 Serial ----------------------------------------------------------
{
    const r = gerar(setupLoop(
        [{ t: 'ard_serial_begin', f: { PORTA: 'Serial', BAUD: '115200' } }],
        [
            { t: 'ard_serial_print', f: { PORTA: 'Serial' }, v: { VALOR: T('luz: ') } },
            { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_analogread', f: { PIN: 'A0' } } } },
            { t: 'ard_serial_print_format', f: { PORTA: 'Serial', FORMATO: 'HEX' }, v: { VALOR: N(255) } }
        ]
    ));
    igual(r.code, programa(
        '  Serial.begin(115200);\n',
        '  Serial.print("luz: ");\n  Serial.println(analogRead(A0));\n  Serial.print(255, HEX);\n'
    ), 'sequência serial completa');
}
{
    const r = gerar(setupLoop([], [{ t: 'ard_serial_println', f: { PORTA: 'Serial' } }]));
    ok(r.code.indexOf('Serial.println();') !== -1, 'println sem argumento é válido', r.code);
}

// --- 2.10 Texto com aspas ------------------------------------------------
{
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: T('ele disse "oi"') } }
    ]));
    ok(r.code.indexOf('Serial.println("ele disse \\"oi\\"");') !== -1, 'aspas no texto são escapadas', r.code);
}

// --- 2.11 ESP32 ----------------------------------------------------------
{
    const r = gerar(setupLoop(
        [
            { t: 'ard_wifi_begin', f: { SSID: 'rede', SENHA: 'senha' } },
            { t: 'ard_ledc_attach', f: { PIN: '5' }, v: { FREQ: N(5000), RES: N(8) } }
        ],
        [
            {
                t: 'controls_if',
                v: { IF0: { t: 'logic_compare', f: { OP: 'EQ' }, v: { A: { t: 'ard_wifi_status' }, B: K('WL_CONNECTED') } } },
                s: { DO0: [{ t: 'ard_ledc_write', f: { PIN: '5' }, v: { DUTY: N(200) } }] }
            }
        ]
    ), 'esp32');
    ok(r.code.indexOf('#include <WiFi.h>') === 0, 'ESP32 inclui WiFi.h no topo', r.code.slice(0, 60));
    ok(r.code.indexOf('WiFi.begin("rede", "senha");') !== -1, 'WiFi.begin literal', r.code);
    ok(r.code.indexOf('ledcAttach(5, 5000, 8);') !== -1, 'ledcAttach da API 3.x', r.code);
    ok(r.code.indexOf('if (WiFi.status() == WL_CONNECTED) {') !== -1, 'comparação com WL_CONNECTED', r.code);
}
{
    const r = gerar(setupLoop([{ t: 'ard_wifi_begin', f: { SSID: 'r', SENHA: 's' } }], []), 'esp8266');
    ok(r.code.indexOf('#include <ESP8266WiFi.h>') !== -1, 'ESP8266 usa o cabeçalho próprio', r.code);
}

// --- 2.12 Código livre ---------------------------------------------------
{
    const r = gerar(setupLoop([], [
        { t: 'ard_raw_stmt', f: { CODE: 'volatile int x = 0;\\nx = analogRead(A0);' } }
    ]));
    // statementToCode indenta todas as linhas do bloco, inclusive as do código livre
    ok(r.code.indexOf('  volatile int x = 0;\n  x = analogRead(A0);') !== -1,
        'código livre entra literalmente, com \\n virando quebra de linha', r.code);
}

// --- 2.13 Interrupções ---------------------------------------------------
{
    const r = gerar([
        { t: 'ard_function_def', f: { TIPO: 'void', NOME: 'contar', PARAMS: '' }, s: { BODY: [] } },
        ...setupLoop([{ t: 'ard_attachinterrupt', f: { PIN: '2', FUNC: 'contar', MODO: 'RISING' } }], [])
    ]);
    ok(r.code.indexOf('attachInterrupt(digitalPinToInterrupt(2), contar, RISING);') !== -1,
        'attachInterrupt literal', r.code);
}

// --- 2.14 Lógica Paraconsistente: equações da LPA2v -----------------------
{
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', v: { VALOR: { t: 'lp_grau', f: { GRAU: 'GC' }, v: { MU: N(0.9), LAMBDA: N(0.2) } } } }
    ]));
    ok(r.code.indexOf('float lpaGc(float mu, float lam) { return mu - lam; }') !== -1,
        'lp_grau puxa a definição de lpaGc para o sketch', r.code);
    ok(r.code.indexOf('Serial.println(lpaGc(0.9, 0.2));') !== -1,
        'lp_grau(Gc) vira chamada literal', r.code);
    ok(r.code.indexOf('lpaD(') === -1 && r.code.indexOf('sqrt') === -1,
        'lp_grau(Gc) não arrasta sqrt nem funções que não usa', r.code);
}

// --- 2.15 Dependências entram antes de quem as chama ----------------------
{
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', v: { VALOR: { t: 'lp_grau', f: { GRAU: 'MUER' }, v: { MU: N(0.86), LAMBDA: N(0.28) } } } }
    ]));
    // Sem protótipos, o que garante o C++ é a ordem: cada função precisa estar
    // definida antes da primeira função que a chama.
    const antes = [
        ['float lpaGc(', 'bool lpaIndefinido('],
        ['float lpaGct(', 'bool lpaIndefinido('],
        ['float lpaPhi(', 'bool lpaIndefinido('],
        ['float lpaD(', 'bool lpaIndefinido('],
        ['bool lpaIndefinido(', 'float lpaGcr('],
        ['float lpaGcr(', 'float lpaMuEr(']
    ];
    antes.forEach(par => {
        const a = r.code.indexOf(par[0]);
        const b = r.code.indexOf(par[1]);
        ok(a !== -1 && b !== -1 && a < b,
            'runtime: "' + par[0] + '" é definido antes de "' + par[1] + '"', r.code);
    });
}

// --- 2.16 Para-Analisador vira switch sobre os estados --------------------
{
    const r = gerar(setupLoop([], [{
        t: 'lp_para_analisador',
        f: { MODO: 'DIRETO', RES: '12', C1: '0.5', C2: '-0.5', C3: '0.5', C4: '-0.5' },
        v: { MU: N(0.9), LAMBDA: N(0.2) },
        s: {
            CASOS: [
                { t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('HIGH') } }] } },
                { t: 'lp_senao', s: { BODY: [{ t: 'ard_digitalwrite', f: { PIN: '7' }, v: { VALOR: K('LOW') } }] } }
            ]
        }
    }]));
    const corpoLoop = r.code.split('void loop() {\n')[1];
    igual(corpoLoop,
        '  switch (lpaEstado(0.9, 0.2, 0.5, -0.5, 0.5, -0.5)) {\n' +
        '    case LPA_V:\n' +
        '      digitalWrite(7, HIGH);\n' +
        '      break;\n' +
        '    default:\n' +
        '      digitalWrite(7, LOW);\n' +
        '      break;\n' +
        '  }\n' +
        '}\n',
        'Para-Analisador vira switch com os casos do reticulado');
}

// --- 2.17 Fonte 2 favorável vira λ pelo complemento -----------------------
{
    const r = gerar(setupLoop([], [{
        t: 'lp_para_analisador',
        f: { MODO: 'COMPL', RES: '4' },
        v: { MU: N(0.9), LAMBDA: N(0.8) },
        s: { CASOS: [{ t: 'lp_caso', f: { ESTADO: 'LPA_T' }, s: { BODY: [] } }] }
    }]));
    ok(r.code.indexOf('lpaEstado4(0.9, 1.0 - (0.8))') !== -1,
        'fonte 2 favorável entra como 1 − μ2, e a resolução 4 usa lpaEstado4', r.code);
}

// --- 2.18 Versão simples lê cada sensor uma vez só ------------------------
{
    const r = gerar(setupLoop([], [{
        t: 'lp_para_analisador_simples',
        f: { RES: '12' },
        v: {
            S1: { t: 'ard_analogread', f: { PIN: 'A0' } },
            S2: { t: 'ard_analogread', f: { PIN: 'A1' } },
            A1: N(20), A2: N(60)
        },
        s: { CASOS: [{ t: 'lp_caso', f: { ESTADO: 'LPA_V' }, s: { BODY: [] } }] }
    }]));
    ok((r.code.match(/analogRead\(A0\)/g) || []).length === 1 &&
        (r.code.match(/analogRead\(A1\)/g) || []).length === 1,
        'cada sensor é lido uma vez só — duas leituras dariam valores diferentes', r.code);
    ok(r.code.indexOf('float lpaS1 = analogRead(A0), lpaS2 = analogRead(A1);') !== -1,
        'as leituras vão para temporárias antes da análise', r.code);
}

// --- 2.19 NAP grava as duas saídas em variáveis ---------------------------
{
    const r = gerar(setupLoop(
        [
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'evid' }, v: { VALOR: N(0) } },
            { t: 'ard_var_global', f: { QUAL: '', TIPO: 'float', VAR: 'inter' }, v: { VALOR: N(0) } }
        ],
        [{ t: 'lp_nap', f: { VAR_MUER: 'evid', VAR_PHIE: 'inter' }, v: { MU: N(0.86), LAMBDA: N(0.28) } }]
    ));
    ok(r.code.indexOf('evid = lpaMuEr(lpaMu, lpaLam);') !== -1 &&
        r.code.indexOf('inter = lpaPhi(lpaGct(lpaMu, lpaLam));') !== -1,
        'NAP escreve μEr e φE nas variáveis escolhidas', r.code);
    ok(r.avisos.length === 0, 'NAP com variáveis declaradas não gera aviso', JSON.stringify(r.avisos));
}

// --- 2.20 Normalização e conectivos --------------------------------------
{
    const r = gerar(setupLoop([], [
        { t: 'ard_serial_println', v: { VALOR: { t: 'lp_evidencia', f: { FUNC: 'S' }, v: { X: N(35.3), A1: N(20), A2: N(40) } } } },
        { t: 'ard_serial_println', v: { VALOR: { t: 'lp_conectivo', f: { OP: 'MIN' }, v: { A: N(0.7), B: N(0.4) } } } },
        { t: 'ard_serial_println', v: { VALOR: { t: 'lp_complemento', v: { MU: N(0.39) } } } }
    ]));
    ok(r.code.indexOf('Serial.println(lpaEvidencia(35.3, 20, 40, 2));') !== -1,
        'função S vira lpaEvidencia com o código 2', r.code);
    ok(r.code.indexOf('Serial.println(lpaMin(0.7, 0.4));') !== -1,
        'conectivo AND vira minimização', r.code);
    ok(r.code.indexOf('Serial.println(1.0 - 0.39);') !== -1,
        'complemento sai literal', r.code);
}

// --- 2.21 Para-Analisador vazio avisa ------------------------------------
{
    const r = gerar(setupLoop([], [{
        t: 'lp_para_analisador', f: { MODO: 'DIRETO', RES: '12' },
        v: { MU: N(0.5), LAMBDA: N(0.5) }, s: { CASOS: [] }
    }]));
    ok(r.avisos.some(a => /sem nenhum estado/.test(a.mensagem)),
        'Para-Analisador sem casos vira aviso', JSON.stringify(r.avisos));
}

/* ================================================================== */
/* 3. Avisos                                                           */
/* ================================================================== */

console.log('== 3. Avisos ==');

{
    const r = gerar([{ t: 'ard_loop', s: { BODY: [] } }]);
    ok(r.avisos.some(a => /setup/.test(a.mensagem)), 'falta de setup vira aviso', JSON.stringify(r.avisos));
}
{
    const r = gerar([{ t: 'ard_setup', s: { BODY: [] } }]);
    ok(r.avisos.some(a => /loop/.test(a.mensagem)), 'falta de loop vira aviso', JSON.stringify(r.avisos));
}
{
    const r = gerar([
        ...setupLoop([], []),
        { t: 'ard_digitalwrite', f: { PIN: '13' }, v: { VALOR: K('HIGH') } }
    ]);
    ok(r.avisos.some(a => /fora de void setup/.test(a.mensagem)),
        'bloco solto fora de setup/loop vira aviso', JSON.stringify(r.avisos));
    ok(r.code.indexOf('digitalWrite') === -1, 'bloco solto não entra no programa', r.code);
}
{
    const r = gerar([
        { t: 'ard_setup', s: { BODY: [] } },
        { t: 'ard_setup', s: { BODY: [] } },
        { t: 'ard_loop', s: { BODY: [] } }
    ]);
    ok(r.avisos.some(a => /mais de um bloco void setup/.test(a.mensagem)),
        'dois setups viram aviso', JSON.stringify(r.avisos));
}

/* ================================================================== */
/* 4. Mapa linha → bloco                                               */
/* ================================================================== */

console.log('== 4. Mapa linha → bloco ==');

{
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, setupLoop(
        [{ t: 'ard_pinmode', f: { PIN: '13', MODO: 'OUTPUT' } }],
        [{ t: 'ard_delay', v: { MS: N(500) } }]
    ));
    const code = Gen.workspaceToCode(ws);
    const linhas = code.split('\n');
    const mapa = Gen.mapaLinhas;

    const linhaPinMode = linhas.findIndex(l => l.indexOf('pinMode') !== -1) + 1;
    const linhaDelay = linhas.findIndex(l => l.indexOf('delay(500)') !== -1) + 1;

    ok(!!mapa[linhaPinMode], 'linha do pinMode está mapeada');
    ok(!!mapa[linhaDelay], 'linha do delay está mapeada');

    const idPinMode = mapa[linhaPinMode];
    const bloco = ws.getBlockById(idPinMode);
    ok(bloco && bloco.type === 'ard_pinmode', 'o id mapeado é mesmo o bloco pinMode',
        bloco && bloco.type);
    ok(code.indexOf('@blk:') === -1, 'nenhum marcador sobra no código final');
}

/* ================================================================== */
/* 5. Validação por placa                                              */
/* ================================================================== */

console.log('== 5. Validação por placa ==');

{
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, setupLoop(
        [{ t: 'ard_analogwrite', f: { PIN: '3' }, v: { VALOR: N(128) } }], []
    ));
    ok(Validate.revalidar(ws).length === 0, 'pino 3 é PWM válido no Uno');

    Boards.selecionar('esp8266');
    const probs = Validate.revalidar(ws);
    ok(probs.length > 0 && /não serve como PWM/.test(probs[0].mensagem),
        'o mesmo pino 3 é acusado no ESP8266', JSON.stringify(probs));
}
{
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, setupLoop([{ t: 'ard_ledc_write', f: { PIN: '3' }, v: { DUTY: N(10) } }], []));
    const probs = Validate.revalidar(ws);
    ok(probs.some(p => /não existe na/.test(p.mensagem)), 'ledcWrite é acusado no Uno', JSON.stringify(probs));
}
{
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, setupLoop([{ t: 'ard_serial_begin', f: { PORTA: 'Serial1', BAUD: '9600' } }], []));
    const probs = Validate.revalidar(ws);
    ok(probs.some(p => /não tem Serial1/.test(p.mensagem)), 'Serial1 é acusado no Uno', JSON.stringify(probs));

    Boards.selecionar('mega');
    ok(Validate.revalidar(ws).length === 0, 'Serial1 é aceito no Mega');
}
{
    Boards.selecionar('esp32');
    const ws = novoWorkspace(Bk, setupLoop([{ t: 'ard_softserial_begin', f: { OBJ: 's', RX: '2', TX: '3', BAUD: '9600' } }], []));
    const probs = Validate.revalidar(ws);
    ok(probs.some(p => /SoftwareSerial/.test(p.mensagem)), 'SoftwareSerial é acusado no ESP32', JSON.stringify(probs));
}
{
    // ADC2 do ESP32 morre com o WiFi ligado — a validação tem de avisar
    Boards.selecionar('esp32');
    const semWifi = novoWorkspace(Bk, setupLoop([], [
        { t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_analogread', f: { PIN: '25' } } } }
    ]));
    ok(Validate.revalidar(semWifi).length === 0, 'pino do ADC2 sozinho não gera aviso');

    const comWifi = novoWorkspace(Bk, setupLoop(
        [{ t: 'ard_wifi_begin', f: { SSID: 'r', SENHA: 's' } }],
        [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_analogread', f: { PIN: '25' } } } }]
    ));
    const probsAdc = Validate.revalidar(comWifi);
    ok(probsAdc.some(p => /ADC2/.test(p.mensagem)),
        'ADC2 junto com WiFi é acusado', JSON.stringify(probsAdc));

    const adc1 = novoWorkspace(Bk, setupLoop(
        [{ t: 'ard_wifi_begin', f: { SSID: 'r', SENHA: 's' } }],
        [{ t: 'ard_serial_println', f: { PORTA: 'Serial' }, v: { VALOR: { t: 'ard_analogread', f: { PIN: '34' } } } }]
    ));
    ok(Validate.revalidar(adc1).length === 0, 'ADC1 com WiFi não gera aviso');
}
{
    // O Blockly deixa encaixar bloco comum dentro do switch (checagem de tipo
    // permissiva); quem tem de acusar é a validação.
    Boards.selecionar('uno');
    const ws = novoWorkspace(Bk, setupLoop([], [
        {
            t: 'ard_switch', v: { EXPR: N(1) },
            s: { CASOS: [{ t: 'ard_case', f: { VALOR: '1', BREAK: 'TRUE' }, s: { BODY: [] } }] }
        }
    ]));
    ok(Validate.revalidar(ws).length === 0, 'switch só com case não gera problema');

    const switchBlock = ws.getAllBlocks(false).find(b => b.type === 'ard_switch');
    const intruso = ws.newBlock('ard_delay');
    intruso.initModel && intruso.initModel();
    switchBlock.getInput('CASOS').connection.targetBlock().nextConnection.connect(intruso.previousConnection);

    const probs = Validate.revalidar(ws);
    ok(probs.some(p => /só entram blocos case e default/.test(p.mensagem)),
        'bloco comum dentro do switch é acusado', JSON.stringify(probs));
}

/* ================================================================== */

console.log('\n----------------------------------------');
console.log('passou: ' + passou + '   falhou: ' + falhou);
if (falhas.length) {
    console.log('\nFalhas:');
    falhas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
}
console.log('----------------------------------------\n');
process.exit(falhou ? 1 : 0);
