'use strict';
/**
 * Roda a suíte inteira: gerador → compilação real → pipeline do app.
 *
 *   node tools/test_all.js
 *   node tools/test_all.js --rapido    # só o gerador (não precisa de toolchain)
 *
 * Os testes que dependem do arduino-cli embutido são pulados com aviso quando
 * a toolchain ainda não foi montada, em vez de reprovar a suíte.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const rapido = process.argv.includes('--rapido');
const soAtual = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const temToolchain = fs.existsSync(path.join(RAIZ, 'resources', 'toolchain', soAtual,
    soAtual === 'win' ? 'arduino-cli.exe' : 'arduino-cli'));

const suites = [
    { nome: 'gerador (headless)', arquivo: 'gen_test.js', precisaToolchain: false },
    { nome: 'plotter e projetos', arquivo: 'ui_test.js', precisaToolchain: false },
    { nome: 'modos e conversão', arquivo: 'modo_test.js', precisaToolchain: false },
    { nome: 'documentos', arquivo: 'doc_test.js', precisaToolchain: false },
    { nome: 'compilação real', arquivo: 'compile_test.js', precisaToolchain: true },
    { nome: 'pipeline do app', arquivo: 'pipeline_test.js', precisaToolchain: true }
];

let falhou = 0;
const resumo = [];
const inicio = Date.now();

for (const s of suites) {
    if (rapido && s.precisaToolchain) {
        resumo.push(['—', s.nome, 'pulado (--rapido)']);
        continue;
    }
    if (s.precisaToolchain && !temToolchain) {
        resumo.push(['—', s.nome, 'pulado (rode node tools/fetch_toolchain.mjs)']);
        continue;
    }

    console.log('\n════ ' + s.nome + ' ════');
    const t = Date.now();
    const r = spawnSync(process.execPath, [path.join(__dirname, s.arquivo)], {
        stdio: 'inherit',
        cwd: RAIZ
    });
    const seg = ((Date.now() - t) / 1000).toFixed(1) + 's';
    if (r.status === 0) {
        resumo.push(['✓', s.nome, seg]);
    } else {
        falhou++;
        resumo.push(['✗', s.nome, seg]);
    }
}

console.log('\n════════════════════════════════════════');
resumo.forEach(l => console.log('  ' + l[0] + '  ' + l[1].padEnd(24) + l[2]));
console.log('  total: ' + ((Date.now() - inicio) / 1000).toFixed(1) + 's');
console.log('════════════════════════════════════════\n');

process.exit(falhou ? 1 : 0);
