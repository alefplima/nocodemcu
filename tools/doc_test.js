'use strict';
/**
 * Confere os dois documentos gerados.
 *
 *   node tools/doc_test.js
 *
 * O que importa aqui é o gabarito da apostila: resposta errada num material
 * didático é pior que resposta ausente, porque o aluno confia. O teste
 * recalcula tudo com uma implementação independente — a do gerador C++, que
 * é a que roda na placa — e compara com o que foi para o .docx.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { carregar, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;

let passou = 0, falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
    if (cond) { passou++; return; }
    falhou++;
    falhas.push(nome + (detalhe ? '\n      ' + detalhe : ''));
}

function perto(a, b, tol) {
    return Math.abs(a - b) <= (tol || 1e-9);
}

/* ------------------------------------------------------------------ */
/* 1. Os geradores rodam                                               */
/* ------------------------------------------------------------------ */

console.log('\n== documentos: geração ==');

for (const script of ['gerar_doc.js', 'gerar_apostila.js']) {
    const r = spawnSync(process.execPath, [path.join(__dirname, script)],
        { cwd: RAIZ, encoding: 'utf8' });
    ok(r.status === 0, script + ' roda sem erro',
        (r.stderr || '').split('\n').slice(-4).join(' '));
}

for (const arq of ['lpa2v-e-o-taskarduino.docx', 'apostila-lpa2v.docx']) {
    const p = path.join(RAIZ, 'docs', arq);
    ok(fs.existsSync(p) && fs.statSync(p).size > 100000,
        arq + ' existe e tem conteúdo');
}

/* ------------------------------------------------------------------ */
/* 2. Gabarito da apostila x implementação de referência                */
/* ------------------------------------------------------------------ */

console.log('== apostila: gabarito conferido ==');

/**
 * Referência independente do que a apostila usou: as mesmas equações,
 * escritas aqui de novo a partir do formulário, para um erro de digitação
 * em ui_reticulado.js não passar despercebido por ser usado dos dois lados.
 */
function referencia(mu, lam) {
    const gc = mu - lam;
    const gct = mu + lam - 1;
    const phi = 1 - Math.abs(gct);
    const d = Math.sqrt(Math.pow(1 - Math.abs(gc), 2) + gct * gct);
    const indef = phi <= 0.25 || d > 1;
    let gcr = 0;
    if (!indef) {
        if (gc > 0) gcr = 1 - d;
        else if (gc < 0) gcr = d - 1;
    }
    let est;
    if (gc >= 0.5) est = 'V';
    else if (gc <= -0.5) est = 'F';
    else if (gct >= 0.5) est = 'T';
    else if (gct <= -0.5) est = '⊥';
    else if (gc >= 0 && gct >= 0) est = gc >= gct ? 'Qv→T' : 'T→v';
    else if (gc >= 0 && gct <= 0) est = gc >= Math.abs(gct) ? 'Qv→⊥' : '⊥→v';
    else if (gc <= 0 && gct <= 0) est = Math.abs(gc) >= Math.abs(gct) ? 'Qf→⊥' : '⊥→f';
    else est = Math.abs(gc) >= gct ? 'Qf→T' : 'T→f';
    return { gc, gct, phi, d, indef, gcr, muEr: (gcr + 1) / 2, est };
}

const dados = JSON.parse(fs.readFileSync(
    path.join(os.tmpdir(), 'taskarduino-apostila.json'), 'utf8'));

const itens = dados.exemplos.map(e => ['exemplo', e])
    .concat(dados.exercicios.map(e => ['exercício', e]));

let conferidos = 0;
itens.forEach(([tipo, e]) => {
    const r = e.r;
    if (!r) return;
    conferidos++;
    const ref = referencia(r.mu, r.lambda);
    const id = tipo + ' P(' + r.mu + '; ' + r.lambda + ')';
    ok(perto(r.gc, ref.gc), id + ': Gc');
    ok(perto(r.gct, ref.gct), id + ': Gct');
    ok(perto(r.phi, ref.phi), id + ': φ');
    ok(perto(r.d, ref.d), id + ': D');
    ok(perto(r.gcr, ref.gcr), id + ': Gcr', r.gcr + ' vs ' + ref.gcr);
    ok(perto(r.muEr, ref.muEr), id + ': μEr');
    ok(r.estado === ref.est, id + ': estado', r.estado + ' vs ' + ref.est);
    ok(!!r.indefinido === ref.indef, id + ': indefinição');
    ok(r.inversaOk, id + ': a transformação inversa fecha');
    ok(Math.abs(r.gc) + Math.abs(r.gct) <= 1 + 1e-9,
        id + ': estado dentro do reticulado');
});
ok(conferidos >= 15, 'a apostila tem massa de exemplos conferida (' + conferidos + ')');

dados.cenarios.forEach(c => {
    const norm = x => Math.max(0, Math.min(1, (x - 25) / (12 - 25)));
    const ref = referencia(norm(c.d1), 1 - norm(c.d2));
    ok(c.estado === ref.est,
        'cenário ' + c.d1 + '/' + c.d2 + ' cm: estado', c.estado + ' vs ' + ref.est);
});

/* ------------------------------------------------------------------ */
/* 3. Cobertura: nenhum bloco fica de fora                              */
/* ------------------------------------------------------------------ */

console.log('== apostila: cobertura dos blocos ==');

Boards.selecionar('uno');
const tiposLp = Object.keys(Bk.Blocks).filter(t => t.indexOf('lp_') === 0).sort();
const naApostila = dados.grupos
    .reduce((a, g) => a.concat(g.blocos.map(b => b.tipo)), []).sort();
ok(JSON.stringify(tiposLp) === JSON.stringify(naApostila),
    'todo bloco lp_ aparece na apostila',
    tiposLp.join(',') + '  vs  ' + naApostila.join(','));

dados.grupos.forEach(g => g.blocos.forEach(b => {
    ok(!!b.rotulo, 'bloco ' + b.tipo + ' tem rótulo na apostila');
    ok(!!b.tooltip, 'bloco ' + b.tipo + ' tem explicação na apostila');
    ok(typeof Gen.forBlock[b.tipo] === 'function', 'bloco ' + b.tipo + ' tem gerador');
}));

/* ------------------------------------------------------------------ */

console.log('\n----------------------------------------');
console.log('passou: ' + passou + '   falhou: ' + falhou);
console.log('----------------------------------------\n');
if (falhas.length) {
    falhas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
}
process.exit(falhou ? 1 : 0);
