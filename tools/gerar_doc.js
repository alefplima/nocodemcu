'use strict';
/**
 * Gera docs/lpa2v-e-o-taskarduino.docx.
 *
 *   npm run doc
 *
 * Mesmo princípio de tools/gerar_referencia.js: os números e os trechos de C++
 * saem do código, montando os blocos de verdade. Documento escrito à mão
 * envelhece calado; este falha quando a contagem não bate.
 *
 * O trabalho é dividido em dois: aqui se extrai o conteúdo para um JSON, e o
 * tools/gerar_doc.py monta o .docx com python-docx.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { carregar, novoWorkspace, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;
const Toolbox = amb.Toolbox;

const DOCS = path.join(RAIZ, 'docs');
const IMG = path.join(DOCS, 'img');

/* ------------------------------------------------------------------ */
/* Coerência: o documento não pode publicar número que não confere      */
/* ------------------------------------------------------------------ */

Boards.selecionar('uno');

const categoria = Toolbox.construir().contents
    .find(c => c.name === 'Lógica Paraconsistente');
if (!categoria) {
    console.error('✗ categoria "Lógica Paraconsistente" não está na toolbox');
    process.exit(1);
}

const tiposLp = Object.keys(Bk.Blocks).filter(t => t.indexOf('lp_') === 0).sort();
const naToolbox = categoria.contents.filter(b => b.kind === 'block').map(b => b.type);

const faltando = tiposLp.filter(t => naToolbox.indexOf(t) === -1);
if (faltando.length) {
    console.error('✗ blocos definidos mas fora da toolbox: ' + faltando.join(', '));
    process.exit(1);
}
tiposLp.forEach(t => {
    if (typeof Gen.forBlock[t] !== 'function') {
        console.error('✗ bloco ' + t + ' não tem gerador');
        process.exit(1);
    }
});

/* ------------------------------------------------------------------ */
/* Rótulo e C++ de cada bloco                                          */
/* ------------------------------------------------------------------ */

/** Texto visível do bloco, montado a partir da definição. */
/** Rótulo visível e dica do bloco — os dois só existem no bloco instanciado. */
function rotuloEDica(tipo) {
    const ws = new Bk.Workspace();
    try {
        const b = ws.newBlock(tipo);
        b.initModel && b.initModel();
        const partes = [];
        (b.inputList || []).forEach(input => {
            (input.fieldRow || []).forEach(f => {
                const t = f.getText ? f.getText() : '';
                if (t) partes.push(t);
            });
            if (input.connection) partes.push('[ ]');
        });
        const dica = typeof b.getTooltip === 'function' ? b.getTooltip() : (b.tooltip || '');
        return {
            rotulo: partes.join(' ').replace(/\s+/g, ' ').trim(),
            dica: String(dica || '')
        };
    } finally {
        ws.dispose();
    }
}

/** C++ que o bloco produz sozinho, dentro de setup(). */
function cppDoBloco(tipo) {
    const ws = new Bk.Workspace();
    try {
        const setup = ws.newBlock('ard_setup');
        setup.initModel && setup.initModel();
        const b = ws.newBlock(tipo);
        b.initModel && b.initModel();

        if (b.outputConnection) {
            const p = ws.newBlock('ard_serial_println');
            p.initModel && p.initModel();
            p.getInput('VALOR').connection.connect(b.outputConnection);
            setup.getInput('BODY').connection.connect(p.previousConnection);
        } else if (b.previousConnection) {
            setup.getInput('BODY').connection.connect(b.previousConnection);
        }
        const code = Gen.workspaceToCode(ws);
        const corpo = (code.split('void setup() {\n')[1] || '').split('\n}')[0];
        return corpo.split('\n').map(l => l.replace(/^ {2}/, '')).join('\n').trim();
    } catch (e) {
        return '(não se aplica isolado)';
    } finally {
        ws.dispose();
    }
}

const GRUPOS = [
    {
        nome: 'Evidência — do mundo físico para [0, 1]',
        tipos: ['lp_evidencia', 'lp_complemento']
    },
    {
        nome: 'Análise — as grandezas da LPA2v',
        tipos: ['lp_grau', 'lp_estado', 'lp_estado_nome', 'lp_indefinicao', 'lp_nap']
    },
    {
        nome: 'Decisão — o Para-Analisador',
        tipos: ['lp_para_analisador', 'lp_para_analisador_simples', 'lp_caso', 'lp_senao']
    },
    {
        nome: 'Rede — conectivos e agregação',
        tipos: ['lp_conectivo', 'lp_extractor']
    }
];

const cobertos = GRUPOS.reduce((a, g) => a.concat(g.tipos), []).sort();
if (JSON.stringify(cobertos) !== JSON.stringify(tiposLp)) {
    console.error('✗ os grupos do documento não cobrem exatamente os blocos lp_');
    console.error('  definidos: ' + tiposLp.join(', '));
    console.error('  no doc   : ' + cobertos.join(', '));
    process.exit(1);
}

const grupos = GRUPOS.map(g => ({
    nome: g.nome,
    blocos: g.tipos.map(t => {
        const r = rotuloEDica(t);
        return { tipo: t, rotulo: r.rotulo, tooltip: r.dica, cpp: cppDoBloco(t) };
    })
}));

/* ------------------------------------------------------------------ */
/* Runtime C++ e o sketch do exemplo oficial                           */
/* ------------------------------------------------------------------ */

function inoDoExemplo(arquivo) {
    const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'exemplos', arquivo), 'utf8'));
    Boards.selecionar(j.placa);
    const ws = new Bk.Workspace();
    Bk.serialization.workspaces.load(j.workspace, ws);
    const code = Gen.workspaceToCode(ws);
    const avisos = (Gen.avisos_ || []).slice();
    ws.dispose();
    Boards.selecionar('uno');
    return { nome: j.nome, placa: j.placa, codigo: code, avisos: avisos };
}

const exemplo = inoDoExemplo('08-lpa2v-esteira-braco.tbk');
if (exemplo.avisos.length) {
    console.error('✗ o exemplo oficial gera avisos: ' + JSON.stringify(exemplo.avisos));
    process.exit(1);
}

/** Nomes das definições do runtime, lidos do próprio gerador. */
const fonteGen = fs.readFileSync(
    path.join(RAIZ, 'src/renderer/js/generator/gen_lp.js'), 'utf8');
const runtime = (fonteGen.match(/^        [a-zA-Z0-9]+: \{$/gm) || [])
    .map(l => l.trim().replace(':', '').replace(' {', ''));

/** Um trecho do sketch, do começo de `marca` até a próxima linha em branco dupla. */
function trecho(codigo, marca, linhas) {
    const i = codigo.indexOf(marca);
    if (i === -1) return '';
    return codigo.slice(i).split('\n').slice(0, linhas).join('\n');
}

const dados = {
    gerado: new Date().toISOString(),
    contagens: {
        blocosLp: tiposLp.length,
        blocosApp: Object.keys(Bk.Blocks).filter(t => /^(ard|lp)_/.test(t)).length,
        runtime: runtime.length,
        categorias: Toolbox.construir().contents.length
    },
    runtime: runtime,
    grupos: grupos,
    exemplo: {
        nome: exemplo.nome,
        placa: Boards.get(exemplo.placa).nome,
        linhas: exemplo.codigo.split('\n').length,
        medirSensores: trecho(exemplo.codigo, 'void medirSensores() {', 21),
        loop: trecho(exemplo.codigo, 'void loop() {', 30),
        runtimeGc: trecho(exemplo.codigo, '// Grau de Certeza\n', 2)
    },
    img: IMG
};

const destinoJson = path.join(os.tmpdir(), 'taskarduino-doc.json');
fs.writeFileSync(destinoJson, JSON.stringify(dados, null, 2), 'utf8');

console.log('conteúdo extraído do código:');
console.log('  ' + dados.contagens.blocosLp + ' blocos da categoria LP');
console.log('  ' + dados.contagens.runtime + ' definições no runtime C++');
console.log('  ' + dados.contagens.blocosApp + ' blocos no aplicativo');
console.log('  exemplo oficial: ' + dados.exemplo.linhas + ' linhas de C++, sem avisos');

const r = spawnSync('python3', [path.join(__dirname, 'gerar_doc.py'), destinoJson], {
    stdio: 'inherit',
    cwd: RAIZ
});
process.exit(r.status === 0 ? 0 : 1);
