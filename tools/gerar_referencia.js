'use strict';
/**
 * Gera docs/blocos.md a partir das definições reais: para cada bloco da
 * toolbox, monta o bloco de verdade e mostra o C++ que ele produz.
 *
 *   node tools/gerar_referencia.js
 *
 * Como a referência sai do código, ela não envelhece: bloco novo aparece
 * sozinho, e bloco que mudou de saída mostra a saída nova.
 */
const fs = require('fs');
const path = require('path');
const { carregar, RAIZ } = require('./carregar.js');

const amb = carregar();
const Bk = amb.Blockly;
const Gen = amb.Arduino;
const Boards = amb.Boards;
const Toolbox = amb.Toolbox;

/** Gera o trecho de C++ de um bloco isolado, dentro de void setup(). */
function exemploDeBloco(tipo) {
    const ws = new Bk.Workspace();
    try {
        const setup = ws.newBlock('ard_setup');
        setup.initModel && setup.initModel();
        const b = ws.newBlock(tipo);
        b.initModel && b.initModel();

        if (b.outputConnection) {
            // Bloco de valor: mostra dentro de um Serial.println para dar contexto
            const print = ws.newBlock('ard_serial_println');
            print.initModel && print.initModel();
            print.getInput('VALOR').connection.connect(b.outputConnection);
            setup.getInput('BODY').connection.connect(print.previousConnection);
        } else if (b.previousConnection) {
            setup.getInput('BODY').connection.connect(b.previousConnection);
        } else {
            // Bloco de topo (setup/loop): mostra sozinho
            ws.dispose();
            return null;
        }

        const codigo = Gen.workspaceToCode(ws);
        const corpo = codigo.split('void setup() {')[1].split('}')[0];
        ws.dispose();

        const linhas = corpo.split('\n').map(l => l.replace(/^ {2}/, '')).filter(l => l.trim());
        if (linhas.length) return linhas.join('\n');

        // Blocos como #include e #define não geram linha no corpo: o efeito
        // deles é o cabeçalho do arquivo.
        const cabecalho = codigo.split('void setup() {')[0].trim();
        return cabecalho || '';
    } catch (e) {
        try { ws.dispose(); } catch (e2) { /* já foi */ }
        return '/* ' + e.message + ' */';
    }
}

/** Texto legível do bloco, a partir das mensagens da definição. */
function rotuloDoBloco(tipo) {
    const def = Bk.Blocks[tipo];
    if (!def || !def.init) return tipo;
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
        });
        ws.dispose();
        return partes.join(' ').replace(/\s+/g, ' ').trim() || tipo;
    } catch (e) {
        try { ws.dispose(); } catch (e2) { /* já foi */ }
        return tipo;
    }
}

const linhas = [];
linhas.push('# Referência dos blocos');
linhas.push('');
linhas.push('Gerado por `node tools/gerar_referencia.js` — não edite à mão.');
linhas.push('');
linhas.push('Cada bloco corresponde a **um** comando da linguagem Arduino. O C++ mostrado');
linhas.push('é o que sai com os campos no valor padrão; entradas vazias usam o padrão do');
linhas.push('gerador, indicado na coluna.');
linhas.push('');

const placas = ['uno', 'esp32', 'esp8266'];
const vistos = new Set();

placas.forEach(placaId => {
    Boards.selecionar(placaId);
    const tb = Toolbox.construir();

    tb.contents.forEach(cat => {
        if (!cat.contents) return;
        const tipos = cat.contents.filter(i => i.kind === 'block').map(i => i.type);
        const novos = tipos.filter(t => !vistos.has(t));
        if (!novos.length) return;

        const sufixo = placaId === 'uno' ? '' : ' (' + Boards.get(placaId).nome + ')';
        linhas.push('## ' + cat.name + sufixo);
        linhas.push('');
        linhas.push('| bloco | gera |');
        linhas.push('|---|---|');

        novos.forEach(tipo => {
            vistos.add(tipo);
            const saida = exemploDeBloco(tipo);
            const codigo = saida === null ? '(estrutura do sketch)'
                : saida.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
            linhas.push('| `' + rotuloDoBloco(tipo) + '` | `' + codigo + '` |');
        });
        linhas.push('');
    });
});

linhas.push('---');
linhas.push('');
linhas.push('Total de blocos documentados: **' + vistos.size + '**.');
linhas.push('');

const destino = path.join(RAIZ, 'docs');
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'blocos.md'), linhas.join('\n'), 'utf8');
console.log('✓ docs/blocos.md — ' + vistos.size + ' blocos');
