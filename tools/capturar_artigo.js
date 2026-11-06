'use strict';
/**
 * Prints do exemplo 16 para o artigo, no tema claro.
 *
 *   npx electron tools/capturar_artigo.js
 *
 * Abre o aplicativo de verdade com um perfil de preferências temporário (o do
 * usuário fica intocado), arruma os blocos de topo em colunas pelo tamanho
 * real de cada um, grava essa arrumação de volta no .tbk e salva em
 * docs/img_artigo_tarefas/:
 *
 *   ide-*.png        a janela inteira, como o aluno vê;
 *   bloco-*.png      cada bloco de topo sozinho, exportado do SVG do Blockly
 *                    em 3x — nítido no papel, sem depender do tamanho da tela.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const TBK = path.join(RAIZ, 'exemplos', '16-abstrato-carro4x4-tarefas.tbk');
const SAIDA = path.join(RAIZ, 'docs', 'img_artigo_tarefas');
const ESCALA_PNG = 3;

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'nocodemcu-prints-'));
fs.writeFileSync(path.join(perfil, 'preferencias.json'), JSON.stringify({
    tema: 'claro', modo: 'abstrato', placa: 'esp32s3cam', lateralRecolhida: false,
    janela: { largura: 1600, altura: 960 }
}));
app.setPath('userData', perfil);
process.argv.push(TBK);

require('../src/main/main.js');

const espera = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Código que roda dentro da página                                   */
/* ------------------------------------------------------------------ */

/** Coloca os blocos de topo em colunas, sem sobreposição. */
function arrumar() {
    const ws = App.ws;
    ws.setScale(1);
    const topo = ws.getTopBlocks(false);
    const pega = tipo => topo.filter(b => b.type === tipo);
    const nome = b => b.getFieldValue('NOME');
    const ordem = ['ligar a rede e a câmera', 'medir as distâncias', 'calcular as evidências',
        'dirigir pela LPA2v', 'conferir se está preso', 'desviar', 'arrancar devagar',
        'dirigir pelo operador', 'ver se o operador assumiu', 'mostrar o estado na página'];
    const tarefas = pega('abs_tarefa').sort((a, b) => ordem.indexOf(nome(a)) - ordem.indexOf(nome(b)));

    const colunas = [
        pega('abs_sempre').concat(pega('abs_ao_iniciar')),
        tarefas.filter(t => ['medir as distâncias', 'calcular as evidências', 'ligar a rede e a câmera',
            'ver se o operador assumiu', 'mostrar o estado na página'].includes(nome(t))),
        tarefas.filter(t => ['dirigir pela LPA2v'].includes(nome(t))),
        tarefas.filter(t => ['conferir se está preso', 'desviar', 'arrancar devagar'].includes(nome(t))),
        tarefas.filter(t => ['dirigir pelo operador'].includes(nome(t)))
    ];
    const GAP = 48;
    let x = 40;
    colunas.forEach(col => {
        let y = 40, largura = 0;
        col.forEach(b => {
            const xy = b.getRelativeToSurfaceXY();
            b.moveBy(x - xy.x, y - xy.y);
            const hw = b.getHeightWidth();
            y += hw.height + GAP;
            largura = Math.max(largura, hw.width);
        });
        x += largura + GAP * 1.5;
    });
    const sel = Blockly.common.getSelected && Blockly.common.getSelected();
    if (sel && sel.unselect) sel.unselect();
    return Blockly.serialization.workspaces.save(ws);
}

/** SVG de um bloco de topo, com o CSS do Blockly embutido, rasterizado em PNG. */
async function blocoPng(id, escala) {
    const ws = App.ws;
    const b = ws.getBlockById(id);
    const raiz = b.getSvgRoot();
    const caixa = raiz.getBBox();
    const PAD = 6;
    const clone = raiz.cloneNode(true);
    clone.removeAttribute('transform');

    // Os seletores do Blockly pedem um ancestral com as classes do renderer
    // e do tema (".zelos-renderer.nocodemcu-claro-theme .blocklyText"):
    // a união das classes dos ancestrais reais vai num <g> só.
    const classes = new Set();
    for (let n = raiz.parentNode; n && n.classList; n = n.parentNode) {
        n.classList.forEach(c => classes.add(c));
    }
    const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    // filtros e padrões referenciados por url(#...) moram no <defs> do svg principal
    const defs = ws.getParentSvg().querySelector('defs');

    const w = caixa.width + PAD * 2, h = caixa.height + PAD * 2;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('xmlns', ns);
    svg.setAttribute('width', w * escala);
    svg.setAttribute('height', h * escala);
    svg.setAttribute('viewBox', (caixa.x - PAD) + ' ' + (caixa.y - PAD) + ' ' + w + ' ' + h);
    const estilo = document.createElementNS(ns, 'style');
    estilo.textContent = css;
    svg.appendChild(estilo);
    if (defs) svg.appendChild(defs.cloneNode(true));
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', Array.from(classes).join(' '));
    g.appendChild(clone);
    svg.appendChild(g);

    const texto = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texto);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * escala);
    canvas.height = Math.ceil(h * escala);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
}

/* ------------------------------------------------------------------ */

async function rodar(janela) {
    const js = async (fn, ...args) => {
        const r = await janela.webContents.executeJavaScript(
            '(async () => { try { return { ok: await (' + fn.toString() + ')(' +
            args.map(a => JSON.stringify(a)).join(',') + ') }; } catch (e) { return { erro: String(e && e.stack || e) }; } })()',
            true);
        if (r.erro) throw new Error(fn.name + ': ' + r.erro);
        return r.ok;
    };
    const salvarPng = (nome, base64) => {
        fs.writeFileSync(path.join(SAIDA, nome), Buffer.from(base64, 'base64'));
        console.log('  ' + nome);
    };
    const capturar = async (nome, rect) => {
        const img = await janela.webContents.capturePage(rect);
        fs.writeFileSync(path.join(SAIDA, nome), img.toPNG());
        console.log('  ' + nome + '  ' + JSON.stringify(img.getSize()));
    };

    fs.mkdirSync(SAIDA, { recursive: true });
    await espera(3000);

    // 1. Arrumação, gravada de volta no exemplo.
    const estado = await js(arrumar);
    const tbk = JSON.parse(fs.readFileSync(TBK, 'utf8'));
    tbk.workspace = estado;
    fs.writeFileSync(TBK, JSON.stringify(tbk, null, 2), 'utf8');
    console.log('arrumação gravada em ' + path.relative(RAIZ, TBK));
    // Reabre do disco: a janela volta sem a marca de "modificado" no título.
    await js(caminho => App.abrirProjeto(caminho), TBK);
    // No primeiro uso de um perfil o arduino-cli baixa os índices antes de
    // responder; a barra de status fica em "verificando" até lá.
    for (let i = 0; i < 180; i++) {
        const st = await js(() => document.getElementById('status-toolchain').textContent);
        if (!/verificando/.test(st)) break;
        await espera(500);
    }
    await espera(800);

    // 2. Cada bloco de topo, em PNG.
    console.log('blocos:');
    const topo = await js(() => App.ws.getTopBlocks(true).map(b => ({
        id: b.id, tipo: b.type, nome: b.getField('NOME') ? b.getFieldValue('NOME') : ''
    })));
    for (const b of topo) {
        const base = b.tipo === 'abs_tarefa' ? 'tarefa-' + b.nome : b.tipo.replace('abs_', '');
        const arq = 'bloco-' + base.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() + '.png';
        salvarPng(arq, await js(blocoPng, b.id, ESCALA_PNG));
    }

    // 3. A janela inteira: o Sempre e as primeiras tarefas, com o C++ ao lado
    //    rolado até as funções que as tarefas viraram.
    console.log('janela:');
    await js(() => {
        const ws = App.ws;
        ws.setScale(0.72);
        ws.scroll(0, 0);
        const sempre = ws.getTopBlocks(false).find(b => b.type === 'abs_sempre');
        const xy = sempre.getRelativeToSurfaceXY();
        ws.scroll(-(xy.x - 20) * ws.scale, -(xy.y - 20) * ws.scale);
        const pre = document.getElementById('codigo');
        const linhas = pre.textContent.split('\n');
        const i = linhas.findIndex(l => /^void medir_as_distancias\(\) \{/.test(l));
        const alturaLinha = parseFloat(getComputedStyle(pre).lineHeight) || 18;
        pre.scrollTop = Math.max(0, i - 1) * alturaLinha;
    });
    await espera(800);
    await capturar('ide-visao-geral.png');

    // 4. A categoria "Tarefas" aberta na caixa de ferramentas.
    await js(() => {
        const tb = App.ws.getToolbox();
        const item = tb.getToolboxItems().find(i => i.getName && i.getName() === 'Tarefas');
        tb.setSelectedItem(item);
    });
    await espera(800);
    await capturar('ide-categoria-tarefas.png');
    await js(() => App.ws.getToolbox().clearSelection());
}

app.whenReady().then(async () => {
    let janela = null;
    for (let i = 0; i < 50 && !janela; i++) {
        janela = BrowserWindow.getAllWindows()[0] || null;
        if (!janela) await espera(100);
    }
    try {
        await rodar(janela);
    } catch (e) {
        console.error('falhou: ' + (e && e.stack || e));
        process.exitCode = 1;
    }
    app.quit();
});
