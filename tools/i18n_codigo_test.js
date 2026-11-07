'use strict';
/**
 * Confere o C++ gerado em inglês (src/renderer/js/i18n_codigo.js).
 *
 *   node tools/i18n_codigo_test.js
 *
 * Para cada exemplo (os de exemplos/ e os de exemplos/en/), gera o .ino em
 * português e em inglês e verifica:
 *   - mesmo número de linhas e mesmo mapa linha → bloco;
 *   - nenhum nome novo já existia no código em português (senão dois nomes
 *     diferentes virariam um só);
 *   - nenhum nome do runtime em português sobrou fora de strings e comentários;
 *   - nenhum comentário do runtime ficou em português (os comentários que o
 *     aluno escreveu nos blocos ficam como estão e não entram na conta).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const C = require(path.join(RAIZ, 'src/renderer/js/i18n_codigo.js'));

function gerar(arquivo, lang) {
    const script = [
        "const fs = require('fs');",
        'const { carregar } = require(' + JSON.stringify(path.join(__dirname, 'carregar.js')) + ');',
        'const a = carregar();',
        'const t = JSON.parse(fs.readFileSync(' + JSON.stringify(arquivo) + ", 'utf8'));",
        'a.Boards.selecionar(t.placa);',
        'const ws = new a.Blockly.Workspace();',
        'a.Blockly.serialization.workspaces.load(t.workspace, ws);',
        'const ino = a.Arduino.workspaceToCode(ws);',
        'process.stdout.write(JSON.stringify({ ino: ino, mapa: a.Arduino.mapaLinhas }));'
    ].join('\n');
    return JSON.parse(execFileSync(process.execPath, ['-e', script], {
        env: Object.assign({}, process.env, { NOCODEMCU_LANG: lang }),
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    }));
}

/** Nomes fora de strings e comentários. */
function nomes(ino) {
    const limpo = ino
        .replace(/R"(\w*)\([\s\S]*?\)\1"/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/"(\\.|[^"\\\n])*"/g, '')
        .replace(/'(\\.|[^'\\\n])*'/g, '')
        .replace(/\b\d[\w.]*/g, '');
    return new Set(limpo.match(/[A-Za-z_]\w*/g) || []);
}

/** Comentários de linha do código (o texto depois de "//"). */
function comentarios(ino) {
    const sem = ino.replace(/R"(\w*)\([\s\S]*?\)\1"/g, m => m.replace(/[^\n]/g, ' '))
        .replace(/"(\\.|[^"\\\n])*"/g, m => ' '.repeat(m.length));
    const r = [];
    sem.split('\n').forEach((l, i) => {
        const p = l.indexOf('//');
        if (p >= 0) r.push(ino.split('\n')[i].slice(p + 2).trim());
    });
    return r;
}

/** Comentários que o aluno escreveu no .tbk (bloco de comentário e balões). */
function doAluno(tbk) {
    const s = new Set();
    (function andar(no) {
        if (Array.isArray(no)) return no.forEach(andar);
        if (!no || typeof no !== 'object') return;
        if (no.icons && no.icons.comment) no.icons.comment.text.split('\n').forEach(l => s.add(l.trim()));
        if (no.type === 'ard_comment' && no.fields) s.add(String(no.fields.TEXTO || '').replace(/\n/g, ' ').trim());
        Object.keys(no).forEach(k => andar(no[k]));
    })(tbk.workspace.blocks);
    return s;
}

const novos = new Set(Object.values(C.NOMES));
const velhos = new Set(Object.keys(C.NOMES));
const traduzidos = new Set(Object.values(C.COMENTARIOS));
let falhas = 0;
const falha = (ex, msg) => { falhas++; console.log('  ✗ ' + ex + ': ' + msg); };

const pastas = [path.join(RAIZ, 'exemplos'), path.join(RAIZ, 'exemplos', 'en')];
pastas.forEach(pasta => {
    fs.readdirSync(pasta).filter(f => /^\d.*\.tbk$/.test(f)).forEach(f => {
        const arq = path.join(pasta, f);
        const nome = path.relative(RAIZ, arq);
        const tbk = JSON.parse(fs.readFileSync(arq, 'utf8'));
        const pt = gerar(arq, 'pt');
        const en = gerar(arq, 'en');

        if (pt.ino.split('\n').length !== en.ino.split('\n').length) falha(nome, 'número de linhas mudou');
        if (JSON.stringify(pt.mapa) !== JSON.stringify(en.mapa)) falha(nome, 'mapa de linhas mudou');

        const nPt = nomes(pt.ino);
        nPt.forEach(w => { if (novos.has(w) && !velhos.has(w)) falha(nome, 'o nome "' + w + '" já existia em português'); });
        nomes(en.ino).forEach(w => { if (velhos.has(w) && !novos.has(w)) falha(nome, 'sobrou o nome "' + w + '"'); });

        const aluno = doAluno(tbk);
        comentarios(en.ino).forEach(c => {
            if (!c || aluno.has(c) || traduzidos.has(c)) return;
            if (/^(unused value|error generating the code|Own open network): /.test(c)) return;
            falha(nome, 'comentário sem tradução: ' + c);
        });
        console.log('  ' + (falhas ? '·' : '✓') + ' ' + nome);
    });
});

console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nC++ em inglês: tudo certo');
process.exitCode = falhas ? 1 : 0;
