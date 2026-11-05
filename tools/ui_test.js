'use strict';
/**
 * Testes das partes puras da interface e do disco:
 *   - o interpretador de linhas do plotter (formato do Serial Plotter oficial);
 *   - o vaivém de projeto .tbk (salvar → abrir).
 *
 *   node tools/ui_test.js
 *
 * Não precisa de placa nem de toolchain.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

let passou = 0, falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
    if (cond) { passou++; return; }
    falhou++;
    falhas.push(nome + (detalhe ? '\n      ' + String(detalhe) : ''));
}

function igual(obtido, esperado, nome) {
    const a = JSON.stringify(obtido);
    const b = JSON.stringify(esperado);
    ok(a === b, nome, 'esperado ' + b + ', obtido ' + a);
}

/* ------------------------------------------------------------------ */
/* 1. Plotter                                                          */
/* ------------------------------------------------------------------ */

console.log('\n== plotter: leitura das linhas ==');

global.window = global;
global.document = { createElement: () => ({ appendChild() { }, style: {} }) };
(0, eval)(fs.readFileSync(path.join(RAIZ, 'src/renderer/js/ui_serial.js'), 'utf8'));
const U = global.UISerial;

igual(U.interpretar('512'), [{ nome: 'série 1', valor: 512 }],
    'um número solto vira uma série');

igual(U.interpretar('512, 480'),
    [{ nome: 'série 1', valor: 512 }, { nome: 'série 2', valor: 480 }],
    'números separados por vírgula viram duas séries');

igual(U.interpretar('12 34\t56'),
    [{ nome: 'série 1', valor: 12 }, { nome: 'série 2', valor: 34 }, { nome: 'série 3', valor: 56 }],
    'espaço e tabulação também separam');

igual(U.interpretar('temp:23.5 umid:60'),
    [{ nome: 'temp', valor: 23.5 }, { nome: 'umid', valor: 60 }],
    'rotulo:valor vira série com nome');

igual(U.interpretar('temp=23.5'), [{ nome: 'temp', valor: 23.5 }],
    'rotulo=valor também é aceito');

igual(U.interpretar('luz:-15'), [{ nome: 'luz', valor: -15 }],
    'valor negativo com rótulo');

igual(U.interpretar('-42'), [{ nome: 'série 1', valor: -42 }],
    'valor negativo sem rótulo');

igual(U.interpretar('placa iniciada'), [],
    'texto sem número não vira série');

igual(U.interpretar(''), [], 'linha vazia não vira série');

igual(U.interpretar('sensor A: 100'),
    [{ nome: 'série 1', valor: 100 }],
    'rótulo com espaço antes do valor: o número entra como série anônima');

/* ------------------------------------------------------------------ */
/* 1b. Reticulado da LPA2v                                             */
/* ------------------------------------------------------------------ */

console.log('== reticulado: leitura e classificação ==');

(0, eval)(fs.readFileSync(path.join(RAIZ, 'src/renderer/js/ui_reticulado.js'), 'utf8'));
const R = global.UIReticulado;

/* --- leitura da linha --- */

igual(R.interpretar('mu:0.86 lambda:0.28'),
    { mu: 0.86, lambda: 0.28, gc: 0.86 - 0.28, gct: 0.86 + 0.28 - 1 },
    'mu/lambda viram Gc e Gct');

{
    const p = R.interpretar('gc:0.58 gct:0.14');
    ok(p && Math.abs(p.mu - 0.86) < 1e-9 && Math.abs(p.lambda - 0.28) < 1e-9,
        'gc/gct voltam para mu e lambda pela transformação inversa', JSON.stringify(p));
}

igual(R.interpretar('u:0.9 l:0.2'), { mu: 0.9, lambda: 0.2, gc: 0.9 - 0.2, gct: 0.9 + 0.2 - 1 },
    'apelidos curtos u/l também servem');

ok(R.interpretar('mu:0.5') === null, 'só metade da anotação não move o ponto');
ok(R.interpretar('temp:23.5 umid:60') === null, 'linha do plotter comum é ignorada');
ok(R.interpretar('placa iniciada') === null, 'texto sem número é ignorado');

/* --- classificação nas 12 regiões ---
   Os valores conferidos contra o Para-Analisador do material. */

const casos = [
    [0.90, 0.20, 'V'],
    [0.20, 0.90, 'F'],
    [0.90, 0.90, 'T'],
    [0.10, 0.10, '⊥'],
    [0.70, 0.40, 'Qv→T'],
    [0.675423, 0.2876433, 'Qv→⊥'],
    [0.325, 0.578, 'Qf→⊥'],
    [0.525, 0.525, 'T→v'],
    [0.78, 0.61, 'T→v'],
    [0.50, 0.50, 'Qv→T']
];
casos.forEach(c => {
    const gc = R.gc(c[0], c[1]);
    const gct = R.gct(c[0], c[1]);
    const obtido = R.estado(gc, gct);
    ok(obtido === c[2],
        'estado de (' + c[0] + '; ' + c[1] + ') é ' + c[2],
        'obtido ' + obtido + ' (Gc=' + gc.toFixed(4) + ' Gct=' + gct.toFixed(4) + ')');
});

/* Os 4 vértices, que é onde a leitura tem de ser inequívoca */
ok(R.estado(R.gc(1, 0), R.gct(1, 0)) === 'V', 'P(1;0) é Verdadeiro');
ok(R.estado(R.gc(0, 1), R.gct(0, 1)) === 'F', 'P(0;1) é Falso');
ok(R.estado(R.gc(1, 1), R.gct(1, 1)) === 'T', 'P(1;1) é Inconsistente');
ok(R.estado(R.gc(0, 0), R.gct(0, 0)) === '⊥', 'P(0;0) é Indeterminado');

/* --- guarda de indefinição do NAP --- */

{
    const a = R.analise(R.gc(0.86, 0.28), R.gct(0.86, 0.28));
    ok(!a.indefinido && Math.abs(a.gcr - 0.5572812) < 1e-6,
        'Gcr de (0,86; 0,28) é 0,5572812 — o exemplo 3.9 do material', JSON.stringify(a));
}
{
    const a = R.analise(R.gc(0.525, 0.525), R.gct(0.525, 0.525));
    ok(a.indefinido && a.gcr === 0,
        'D > 1 devolve indefinição em vez de Gcr de sinal trocado', JSON.stringify(a));
}
{
    const a = R.analise(R.gc(0.9, 0.9), R.gct(0.9, 0.9));
    ok(a.indefinido, 'contradição alta (φ ≤ 0,25) é indefinição', JSON.stringify(a));
}

/* --- acumulação de pontos, sem canvas --- */

R.el = {};
R.limpar();
ok(R.alimentar('mu:0.9 lambda:0.2') === true, 'linha com anotação alimenta o reticulado');
ok(R.alimentar('nada aqui') === false, 'linha sem anotação não alimenta');
R.definirRastro(2);
R.alimentar('mu:0.8 lambda:0.3');
R.alimentar('mu:0.7 lambda:0.4');
ok(R._pontos.length === 2, 'o rastro respeita o limite escolhido', R._pontos.length);
ok(Math.abs(R._ultimo.mu - 0.7) < 1e-9, 'o ponto atual é o último recebido');
R.limpar();
ok(R._pontos.length === 0 && R._ultimo === null, 'limpar zera rastro e ponto atual');

/* ------------------------------------------------------------------ */
/* 2. Projeto .tbk                                                     */
/* ------------------------------------------------------------------ */

console.log('== projeto: salvar e abrir ==');

const projects = require(path.join(RAIZ, 'src/main/projects.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nocodemcu-ui-'));
const arquivo = path.join(tmp, 'meu-projeto.tbk');

const workspace = { blocks: { languageVersion: 0, blocks: [{ type: 'ard_setup', x: 10, y: 10 }] } };
const r = projects.salvar(arquivo, { placa: 'esp32', nome: 'Meu Projeto', workspace: workspace });
ok(r.ok, 'salvou sem erro');
ok(fs.existsSync(arquivo), 'arquivo existe no disco');

const lido = projects.abrir(arquivo);
ok(lido.ok, 'abriu sem erro');
ok(lido.placa === 'esp32', 'a placa volta junto com o programa (' + lido.placa + ')');
ok(lido.nome === 'Meu Projeto', 'o nome volta (' + lido.nome + ')');
igual(lido.workspace, workspace, 'o workspace volta idêntico');

const salvoSemNome = projects.salvar(path.join(tmp, 'sem-nome.tbk'), { placa: 'uno', workspace: workspace });
ok(salvoSemNome.nome === 'sem-nome', 'sem nome explícito, usa o nome do arquivo');

fs.writeFileSync(path.join(tmp, 'quebrado.tbk'), 'isso não é json', 'utf8');
const quebrado = projects.abrir(path.join(tmp, 'quebrado.tbk'));
ok(!quebrado.ok && /JSON/.test(quebrado.erro), 'arquivo inválido devolve erro explicado', quebrado.erro);

// De propósito com o identificador ANTIGO: é o teste de que um projeto salvo
// quando o programa se chamava TaskArduino continua abrindo.
fs.writeFileSync(path.join(tmp, 'vazio.tbk'), '{"formato":"taskarduino/1"}', 'utf8');
const vazio = projects.abrir(path.join(tmp, 'vazio.tbk'));
ok(!vazio.ok && /programa/.test(vazio.erro), 'arquivo sem workspace devolve erro explicado', vazio.erro);

const ino = path.join(tmp, 'sketch.ino');
projects.exportarIno(ino, 'void setup() {}\nvoid loop() {}\n');
ok(fs.readFileSync(ino, 'utf8').indexOf('void loop()') !== -1, 'exportação .ino grava o código');

/* ------------------------------------------------------------------ */
/* 3. Preferências                                                     */
/* ------------------------------------------------------------------ */

console.log('== preferências ==');

const settings = require(path.join(RAIZ, 'src/main/settings.js'));
settings.iniciar(tmp);
ok(settings.tudo().placa === 'uno', 'padrão começa no Uno');
settings.definir('placa', 'mega');
settings.mesclar({ baud: 115200 });

// recarrega do zero, como se o app tivesse sido fechado e aberto
settings.iniciar(tmp);
ok(settings.tudo().placa === 'mega', 'placa sobrevive ao reinício');
ok(settings.tudo().baud === 115200, 'baud sobrevive ao reinício');

fs.rmSync(tmp, { recursive: true, force: true });

/* ------------------------------------------------------------------ */

console.log('\n----------------------------------------');
console.log('passou: ' + passou + '   falhou: ' + falhou);
if (falhas.length) {
    console.log('\nFalhas:');
    falhas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
}
console.log('----------------------------------------\n');
process.exit(falhou ? 1 : 0);
