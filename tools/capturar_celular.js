'use strict';
/**
 * Telas do celular para a versão em inglês do artigo do carro 4x4.
 *
 *   npx electron tools/capturar_celular.js
 *
 * As fotos originais (docs/img_artigo_tarefas/cel-*.png) são da página em
 * português servida pela placa. Para a versão em inglês:
 *
 *   1. a página do exemplo em inglês (exemplos/en/16-...) é tirada do .ino
 *      que o gerador produz em inglês e aberta numa janela do tamanho do
 *      celular (360 px de CSS, densidade 2x = 720 px, como as fotos), com a
 *      placa simulada só no que ela responde em /d: a leitura, as distâncias
 *      e os contadores que aparecem em cada foto;
 *   2. por cima dessa página vai o quadro da foto original — o reticulado com
 *      o rastro de verdade, ou o vídeo da câmera com o reticulado no canto —
 *      e a barra do navegador da foto;
 *   3. nas telas com vídeo, o aviso em inglês volta por cima do quadro.
 *
 * Ou seja: o que é dado (rastro, vídeo, números) vem da foto; o que é texto
 * da interface (rótulos, botões, aviso) vem da página em inglês. As duas têm
 * a mesma disposição, porque o CSS é o mesmo — o script confere isso
 * comparando a posição do quadro na página com a da foto.
 *
 * Saída: docs/img_artigo_tarefas_en/cel-*.png
 */
const { app, BrowserWindow, protocol, nativeImage } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const TBK = path.join(RAIZ, 'exemplos', 'en', '16-abstract-4x4-car-tasks.tbk');
const FOTOS = path.join(RAIZ, 'docs', 'img_artigo_tarefas');
const SAIDA = path.join(RAIZ, 'docs', 'img_artigo_tarefas_en');

/* Nas fotos (720 px de largura): barra do navegador até y = 105; quadro da página. */
const BARRA = 105;
const QUADRO = { x: 20, y: 186, width: 680, height: 510 };

/* O que a placa respondia em cada foto (lido na linha de números de cada uma). */
const TELAS = [
    {
        nome: 'cel-lpa2v-qf', mu: 0.29, lambda: 0.64, estado: 'Qf->Indet', camera: null,
        valores: { left: 61, right: 57, swerves: 0, stuck: 0 }
    },
    {
        nome: 'cel-lpa2v-t', mu: 0.79, lambda: 1.00, estado: 'T', camera: null,
        valores: { left: 29, right: 108, swerves: 0, stuck: 0 }
    },
    {
        nome: 'cel-operador-manual', mu: 0.00, lambda: 0.95, estado: 'F',
        camera: 'manual control: tap release to hand back',
        valores: { left: 104, right: 77, swerves: 0, stuck: 1 }
    },
    {
        nome: 'cel-operador-preso', mu: 0.00, lambda: 1.00, estado: 'F',
        camera: 'STUCK: drive with the buttons and tap release',
        valores: { left: 400, right: 400, swerves: 3, stuck: 1 }
    }
];

const espera = ms => new Promise(r => setTimeout(r, ms));

/** .ino do exemplo, gerado em inglês num processo Node à parte. */
function gerarIno() {
    const script = [
        "const fs = require('fs');",
        'const { carregar } = require(' + JSON.stringify(path.join(__dirname, 'carregar.js')) + ');',
        'const a = carregar();',
        'const t = JSON.parse(fs.readFileSync(' + JSON.stringify(TBK) + ", 'utf8'));",
        'a.Boards.selecionar(t.placa);',
        'const ws = new a.Blockly.Workspace();',
        'a.Blockly.serialization.workspaces.load(t.workspace, ws);',
        'process.stdout.write(a.Arduino.workspaceToCode(ws));'
    ].join('\n');
    const env = Object.assign({}, process.env, { NOCODEMCU_LANG: 'en' });
    delete env.ELECTRON_RUN_AS_NODE;
    return execFileSync('node', ['-e', script], { env, encoding: 'utf8', maxBuffer: 32 << 20 });
}

/**
 * O HTML que a função absWebDrivingPage() (absWebPaginaPiloto, em português) imprime: os trechos R"H(...)H" na
 * ordem, com a lista de botões (o laço do C++) no meio, como a placa faria.
 */
function paginaPiloto(ino) {
    const ini = ino.indexOf('void absWebDrivingPage(WiFiClient &c) {');
    const corpo = ino.slice(ini, ino.indexOf('\n}\n', ini));
    const crus = [];
    let m;
    const re = /R"H\(([\s\S]*?)\)H"/g;
    while ((m = re.exec(corpo))) crus.push(m[1]);
    if (crus.length !== 2) throw new Error('esperava 2 trechos da página, achei ' + crus.length);
    const botoes = [];
    const rb = /absWebRegisterButton\("([^"]*)"\)/g;
    while ((m = rb.exec(ino))) botoes.push(m[1]);
    return crus[0] + 'var B=[' + botoes.map(b => JSON.stringify(b)).join(',') + '];' + crus[1];
}

function respostaD(tela) {
    const linhas = ['R,' + tela.mu.toFixed(3) + ',' + tela.lambda.toFixed(3) + ',' + tela.estado];
    linhas.push('C,' + (tela.camera ? 1 : 0) + ',' + (tela.camera || ''));
    Object.keys(tela.valores).forEach(k => linhas.push('V,' + k + ',' + tela.valores[k].toFixed(2)));
    return linhas.join('\n') + '\n';
}

app.whenReady().then(async () => {
    try {
        const pagina = paginaPiloto(gerarIno());
        let resposta = '';
        let video = null;

        // A "placa": a página, os números de /d, os toques e o vídeo da porta 81.
        protocol.handle('http', req => {
            const u = new URL(req.url);
            if (u.port === '81') return new Response(video, { headers: { 'content-type': 'image/jpeg' } });
            if (u.pathname === '/d') return new Response(resposta, { headers: { 'content-type': 'text/plain' } });
            if (u.pathname === '/b') return new Response('.', { headers: { 'content-type': 'text/plain' } });
            return new Response(pagina, { headers: { 'content-type': 'text/html; charset=utf-8' } });
        });

        // 720 px de janela com zoom 2: a página vê 360 px de CSS, como no celular,
        // e a captura sai com 720 px, como as fotos.
        // Fora da tela (offscreen) a janela não é cortada na altura do monitor.
        const janela = new BrowserWindow({
            show: false, width: 720, height: 1300, useContentSize: true,
            webPreferences: { offscreen: true }
        });

        for (const tela of TELAS) {
            // Nas telas com vídeo, o aviso em português da foto é coberto com a
            // cor do aviso antes de tudo: o aviso em inglês vai por cima, e
            // nada do texto antigo aparece nos cantos arredondados.
            const limpa = path.join(SAIDA, '_limpa.png');
            execFileSync('python', ['-c', [
                'import sys',
                'from PIL import Image, ImageDraw',
                'im = Image.open(sys.argv[1]).convert("RGB")',
                'if sys.argv[3] == "1":',
                '    d = ImageDraw.Draw(im)',
                '    d.rounded_rectangle((36, 200, 684, 261), radius=20, fill=im.getpixel((60, 215)))',
                'im.save(sys.argv[2])'
            ].join('\n'), path.join(FOTOS, tela.nome + '.png'), limpa, tela.camera ? '1' : '0']);
            const foto = nativeImage.createFromPath(limpa);
            fs.unlinkSync(limpa);
            const quadroFoto = foto.crop(QUADRO);
            video = tela.camera ? quadroFoto.toJPEG(92) : null;
            resposta = respostaD(tela);

            await janela.loadURL('http://192.168.4.1/');
            janela.webContents.setZoomFactor(2);
            await janela.webContents.insertCSS('::-webkit-scrollbar{display:none}');
            await espera(1200);

            const geo = await janela.webContents.executeJavaScript(`(() => {
                const r = e => { const b = document.getElementById(e).getBoundingClientRect();
                    return { x: b.left * 2, y: b.top * 2, w: b.width * 2, h: b.height * 2 }; };
                return { palco: r('palco'), aviso: r('aviso'), fim: Math.ceil(document.body.scrollHeight) * 2 };
            })()`);
            // A página e a foto têm de ter o quadro do mesmo tamanho e quase no mesmo lugar
            // (a fonte do PC deixa o cabeçalho uns pixels mais alto que no celular).
            if (Math.abs(geo.palco.x - QUADRO.x) > 2 || Math.abs(geo.palco.w - QUADRO.width) > 3 ||
                Math.abs(geo.palco.y + BARRA - QUADRO.y) > 24) {
                throw new Error(tela.nome + ': o quadro da página não bate com o da foto: ' + JSON.stringify(geo.palco));
            }

            // A janela não passa da altura do monitor: a página sai em duas
            // capturas, a de cima e a rolada até o fim, costuradas depois.
            const tmp = n => path.join(SAIDA, '_' + n + '.png');
            fs.writeFileSync(tmp('cima'), (await janela.webContents.capturePage()).toPNG());
            const rolou = await janela.webContents.executeJavaScript(
                'window.scrollTo(0, 1e6); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(window.scrollY))))');
            await espera(300);
            fs.writeFileSync(tmp('baixo'), (await janela.webContents.capturePage()).toPNG());
            execFileSync('python', ['-c', [
                'import sys',
                'from PIL import Image',
                'a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")',
                'dy, fim = int(sys.argv[3]), int(sys.argv[4])',
                'o = Image.new("RGB", (720, fim), "white"); o.paste(b, (0, dy)); o.paste(a, (0, 0))',
                'o.save(sys.argv[5])'
            ].join('\n'), tmp('cima'), tmp('baixo'), String(Math.round(rolou * 2)), String(geo.fim), tmp('pagina')]);
            fs.unlinkSync(tmp('cima')); fs.unlinkSync(tmp('baixo'));
            fs.writeFileSync(tmp('foto'), foto.toPNG());
            const avisoCaixa = tela.camera
                ? [geo.aviso.x - 2, geo.aviso.y - 2, geo.aviso.x + geo.aviso.w + 2, geo.aviso.y + geo.aviso.h + 2].map(Math.round)
                : null;
            execFileSync('python', ['-c', [
                'import sys, json',
                'from PIL import Image',
                'pag = Image.open(sys.argv[1]).convert("RGB")',
                'foto = Image.open(sys.argv[2]).convert("RGB")',
                'B, Q, aviso, fim = int(sys.argv[4]), json.loads(sys.argv[5]), json.loads(sys.argv[6]), int(sys.argv[7])',
                'pag = pag.crop((0, 0, 720, min(fim, pag.size[1])))',
                'out = Image.new("RGB", (720, B + pag.size[1]), "white")',
                'out.paste(pag, (0, B))',
                'out.paste(foto.crop((0, 0, 720, B)), (0, 0))',
                // o quadro da foto vai no lugar do quadro da página
                'py = Q["py"]',
                'out.paste(foto.crop((Q["x"], Q["y"], Q["x"] + Q["w"], Q["y"] + Q["h"])), (Q["x"], B + py))',
                'if aviso: out.paste(pag.crop(tuple(aviso)), (aviso[0], B + aviso[1]))',
                'out.save(sys.argv[3])'
            ].join('\n'),
            tmp('pagina'), tmp('foto'), path.join(SAIDA, tela.nome + '.png'), String(BARRA),
            JSON.stringify({ x: QUADRO.x, y: QUADRO.y, w: QUADRO.width, h: QUADRO.height, py: Math.round(geo.palco.y) }),
            JSON.stringify(avisoCaixa), String(geo.fim)]);
            fs.unlinkSync(tmp('pagina')); fs.unlinkSync(tmp('foto'));
            console.log('  ' + tela.nome + '.png  quadro da página em y=' + Math.round(geo.palco.y + BARRA) +
                ' (foto: ' + QUADRO.y + ')');
        }
    } catch (e) {
        console.error('falhou: ' + (e && e.stack || e));
        process.exitCode = 1;
    }
    app.quit();
});
