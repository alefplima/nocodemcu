'use strict';
/**
 * Carregador comum dos harnesses: monta em Node o mesmo ambiente que o
 * renderer tem no Electron (Blockly + blocos + gerador), sem navegador.
 *
 * Os arquivos do renderer são scripts globais clássicos — o mesmo truque dos
 * harnesses do TaskAI: define window = global e avalia cada arquivo na ordem.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const ARQUIVOS = [
    'src/renderer/js/i18n_codigo.js',
    'src/renderer/js/i18n.js',
    'src/renderer/js/boards.js',
    'src/renderer/js/fields.js',
    'src/renderer/js/blocks/estrutura.js',
    'src/renderer/js/blocks/io.js',
    'src/renderer/js/blocks/serial.js',
    'src/renderer/js/blocks/controle.js',
    'src/renderer/js/blocks/operadores.js',
    'src/renderer/js/blocks/variaveis.js',
    'src/renderer/js/blocks/libs.js',
    'src/renderer/js/blocks/avancado.js',
    'src/renderer/js/blocks/lp.js',
    'src/renderer/js/blocks/abstrato.js',
    'src/renderer/js/generator/arduino_generator.js',
    'src/renderer/js/generator/gen_estrutura.js',
    'src/renderer/js/generator/gen_io.js',
    'src/renderer/js/generator/gen_serial.js',
    'src/renderer/js/generator/gen_controle.js',
    'src/renderer/js/generator/gen_operadores.js',
    'src/renderer/js/generator/gen_variaveis.js',
    'src/renderer/js/generator/gen_libs.js',
    'src/renderer/js/generator/gen_avancado.js',
    'src/renderer/js/generator/gen_lp.js',
    'src/renderer/js/generator/gen_abstrato.js',
    'src/renderer/js/toolbox.js',
    'src/renderer/js/validate.js'
];

function carregar() {
    global.window = global;
    const Blockly = require(path.join(RAIZ, 'src/renderer/vendor/blockly/blockly_compressed.js'));
    global.Blockly = Blockly;
    require(path.join(RAIZ, 'src/renderer/vendor/blockly/blocks_compressed.js'));

    // Sem as mensagens, os blocos nativos (variables_set etc.) não interpolam.
    // O idioma vem de NOCODEMCU_LANG (ver src/renderer/js/i18n.js); o padrão é português.
    const ingles = (global.NOCODEMCU_LANG || process.env.NOCODEMCU_LANG) === 'en';
    const msgs = require(path.join(RAIZ, 'src/renderer/vendor/blockly/msg/' + (ingles ? 'en' : 'pt-br') + '.js'));
    Object.keys(msgs).forEach(k => { Blockly.Msg[k] = msgs[k]; });

    // Sem DOM, o evento BlockCreate tenta serializar em XML e quebra.
    // Nada aqui depende de eventos, então desliga de uma vez.
    Blockly.Events.disable();

    ARQUIVOS.forEach(rel => {
        const p = path.join(RAIZ, rel);
        if (!fs.existsSync(p)) return;
        const src = fs.readFileSync(p, 'utf8');
        try {
            (0, eval)(src + '\n//# sourceURL=' + rel);
        } catch (e) {
            console.error('Falha ao carregar ' + rel + ': ' + e.message);
            throw e;
        }
    });

    return {
        Blockly: Blockly,
        Arduino: global.ArduinoGen,
        Boards: global.Boards,
        Toolbox: global.Toolbox,
        Validate: global.Validate,
        RAIZ: RAIZ
    };
}

/* ------------------------------------------------------------------ */
/* Construtor compacto de workspace para as fixtures                   */
/* ------------------------------------------------------------------ */

/**
 * spec = { t: 'tipo', f: {CAMPO: valor}, v: {ENTRADA: spec}, s: {ENTRADA: [spec,...]},
 *          next: [spec, ...] }
 */
function montarBloco(ws, spec) {
    const bloco = ws.newBlock(spec.t);
    bloco.initModel && bloco.initModel();

    // spec.c vira comentário do bloco: aparece no balão na tela e o gerador o
    // reemite como "// ..." acima da linha (arduino_generator.js scrub_).
    // É o que permite documentar o exemplo uma vez só e ter o efeito nos dois
    // lugares onde o aluno olha.
    if (spec.c) bloco.setCommentText(String(spec.c));

    if (spec.f) {
        Object.keys(spec.f).forEach(campo => {
            const field = bloco.getField(campo);
            if (!field) throw new Error('Campo ' + campo + ' não existe em ' + spec.t);
            if (field instanceof global.Blockly.FieldVariable) {
                const nome = String(spec.f[campo]);
                const mapa = ws.getVariableMap();
                let v = mapa.getVariable(nome);
                if (!v) v = mapa.createVariable(nome);
                field.setValue(v.getId());
            } else {
                field.setValue(String(spec.f[campo]));
            }
        });
    }

    if (spec.v) {
        Object.keys(spec.v).forEach(entrada => {
            const alvo = montarBloco(ws, spec.v[entrada]);
            const input = bloco.getInput(entrada);
            if (!input) throw new Error('Entrada ' + entrada + ' não existe em ' + spec.t);
            input.connection.connect(alvo.outputConnection);
        });
    }

    if (spec.s) {
        Object.keys(spec.s).forEach(entrada => {
            const input = bloco.getInput(entrada);
            if (!input) throw new Error('Entrada de pilha ' + entrada + ' não existe em ' + spec.t);
            encadear(ws, input.connection, spec.s[entrada]);
        });
    }

    if (spec.next && spec.next.length) {
        encadear(ws, bloco.nextConnection, spec.next);
    }

    return bloco;
}

function encadear(ws, conexao, lista) {
    let atual = conexao;
    (lista || []).forEach(spec => {
        const b = montarBloco(ws, spec);
        atual.connect(b.previousConnection);
        atual = b.nextConnection;
    });
}

function novoWorkspace(Blockly, specs) {
    const ws = new Blockly.Workspace();
    (specs || []).forEach(s => montarBloco(ws, s));
    return ws;
}

module.exports = { carregar, novoWorkspace, montarBloco, RAIZ };
