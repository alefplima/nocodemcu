'use strict';
/**
 * Versões em inglês dos exemplos, em exemplos/en/.
 *
 *   node tools/traduzir_exemplos.js
 *
 * Troca só o que o aluno escreveu: nome do exemplo, caixas, nomes de funções
 * e de tarefas, rótulos, botões, avisos, mensagens, comentários dos blocos e,
 * no código livre, os textos e nomes listados. Os blocos em si não precisam
 * de tradução — o aplicativo mostra cada um no idioma escolhido em
 * Opções → Idioma. As traduções ficam em tools/exemplos_en.js.
 *
 * Conferência: o programa em inglês gera sem avisos e com o mesmo C++ do
 * original (gerado também em inglês), tirando os comentários e trocando os
 * nomes traduzidos; senão o script para.
 */
const fs = require('fs');
const path = require('path');
const { EXEMPLOS, CAIXAS, TEXTOS, COMENTARIOS } = require('./exemplos_en');

const RAIZ = path.join(__dirname, '..');

/** Campos que guardam texto do aluno; os demais (pinos, estados, manobras) são valores do código. */
const CAMPOS_DE_TEXTO = ['NOME', 'ROTULO', 'AVISO', 'TEXTO', 'SSID', 'SENHA', 'OBJ'];

const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const compacto = s => s.replace(/\s+/g, ' ').trim();

/** Quebra o texto em linhas de até 70 colunas; texto de uma linha só continua numa linha. */
function quebrar(texto, original) {
    if (!/\n/.test(original)) return texto;
    const linhas = [];
    let atual = '';
    texto.split(' ').forEach(p => {
        if (atual && (atual + ' ' + p).length > 70) { linhas.push(atual); atual = p; } else atual = atual ? atual + ' ' + p : p;
    });
    if (atual) linhas.push(atual);
    return linhas.join('\n');
}

/** Troca palavras inteiras (caixas e funções) dentro do código livre. */
function trocarNomes(codigo) {
    const nomes = Object.assign({}, CAIXAS);
    // nomes de função e de tarefa (a tarefa "medir as distâncias" vira medir_as_distancias)
    const id = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '_');
    Object.keys(TEXTOS).forEach(k => { if (/^[\wÀ-ú ]+$/.test(k) && /^[\w ]+$/.test(TEXTOS[k])) nomes[id(k)] = id(TEXTOS[k]); });
    // "\n" escrito no campo é quebra de linha: o "n" não é começo de nome
    return codigo.replace(/\\[a-z]|[A-Za-z_]\w*/g, w => tem(nomes, w) ? nomes[w] : w);
}

function traduzirArvore(no, ex, faltando) {
    if (Array.isArray(no)) return no.forEach(n => traduzirArvore(n, ex, faltando));
    if (!no || typeof no !== 'object') return;
    if (no.fields) {
        CAMPOS_DE_TEXTO.forEach(campo => {
            const v = no.fields[campo];
            if (typeof v !== 'string' || v === '') return;
            if (tem(TEXTOS, v)) no.fields[campo] = TEXTOS[v];
            else faltando.add(campo + ' = ' + JSON.stringify(v));
        });
        if (typeof no.fields.CODE === 'string') {
            let c = no.fields.CODE;
            (ex.codigo || []).forEach(([de, para]) => { c = typeof de === 'string' ? c.split(de).join(para) : c.replace(de, para); });
            no.fields.CODE = trocarNomes(c);
        }
    }
    if (no.icons && no.icons.comment) {
        const t = no.icons.comment.text;
        const k = compacto(t);
        if (tem(COMENTARIOS, k)) no.icons.comment.text = quebrar(COMENTARIOS[k], t);
        else faltando.add('comentário: ' + JSON.stringify(k));
    }
    Object.keys(no).forEach(k => { if (k !== 'fields') traduzirArvore(no[k], ex, faltando); });
}

/** C++ de um .tbk, no idioma pedido. Cada idioma num processo à parte: o i18n lê o idioma ao carregar. */
function gerarIno(arquivo, lang) {
    const { execFileSync } = require('child_process');
    const script = [
        "const fs = require('fs');",
        "const { carregar } = require(" + JSON.stringify(path.join(__dirname, 'carregar.js')) + ');',
        'const a = carregar();',
        'const t = JSON.parse(fs.readFileSync(' + JSON.stringify(arquivo) + ", 'utf8'));",
        'a.Boards.selecionar(t.placa);',
        'const ws = new a.Blockly.Workspace();',
        'a.Blockly.serialization.workspaces.load(t.workspace, ws);',
        'const ino = a.Arduino.workspaceToCode(ws);',
        'process.stdout.write(JSON.stringify({ ino: ino, avisos: (a.Arduino.avisos_ || []).map(x => x.mensagem) }));'
    ].join('\n');
    return JSON.parse(execFileSync(process.execPath, ['-e', script], {
        env: Object.assign({}, process.env, { NOCODEMCU_LANG: lang }),
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    }));
}

/** O C++ sem comentários e sem strings, para comparar a estrutura. */
function estrutura(ino) {
    return ino
        .replace(/R"(\w*)\([\s\S]*?\)\1"/g, 'R""')
        .replace(/"(\\.|[^"\\\n])*"/g, '""')
        .replace(/\/\/.*$/gm, '')
        .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

const destino = path.join(RAIZ, 'exemplos', 'en');
fs.mkdirSync(destino, { recursive: true });
const so = process.argv.slice(2);

EXEMPLOS.filter(ex => !so.length || so.some(s => ex.de.startsWith(s))).forEach(ex => {
    const origem = path.join(RAIZ, 'exemplos', ex.de);
    const saida = path.join(destino, ex.para);
    // O 16 em inglês foi rearrumado para as figuras do artigo (tools/capturar_artigo.js --en):
    // não é sobrescrito, só conferido. Para refazê-lo: node tools/traduzir_exemplos.js 16
    if (ex.manter && fs.existsSync(saida) && !so.length) return conferir(ex, origem, saida);
    const tbk = JSON.parse(fs.readFileSync(origem, 'utf8'));

    tbk.nome = ex.nome;
    tbk.salvoEm = new Date().toISOString();
    (tbk.workspace.variables || []).forEach(v => {
        if (!tem(CAIXAS, v.name)) throw new Error(ex.de + ': caixa sem tradução: ' + v.name);
        v.name = CAIXAS[v.name];
    });
    const faltando = new Set();
    traduzirArvore(tbk.workspace.blocks, ex, faltando);
    if (faltando.size) {
        throw new Error(ex.de + ': sem tradução:\n  ' + Array.from(faltando).join('\n  '));
    }

    fs.writeFileSync(saida, JSON.stringify(tbk, null, 2), 'utf8');
    conferir(ex, origem, saida);
});

/** Mesmo programa, só com os nomes em inglês. */
function conferir(ex, origem, saida) {
    const pt = gerarIno(origem, 'en');
    const en = gerarIno(saida, 'en');
    if (en.avisos.length) throw new Error(ex.para + ': avisos:\n  ' + en.avisos.join('\n  '));
    let a = trocarNomes(estrutura(pt.ino));
    (ex.codigo || []).forEach(([de, para]) => { if (typeof de !== 'string') a = a.replace(de, para); });
    const b = estrutura(en.ino);
    if (a !== b) {
        const la = a.split('\n'), lb = b.split('\n');
        const i = la.findIndex((l, k) => l !== lb[k]);
        throw new Error(ex.para + ': o C++ mudou além dos nomes, linha ' + i + ':\n  ' + la[i] + '\n  ' + lb[i]);
    }
    console.log('✓ ' + path.relative(RAIZ, saida));
}
