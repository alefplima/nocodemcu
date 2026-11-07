'use strict';
/** Processo principal: janela, menu e inicialização da toolchain. */
const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const cli = require('./cli');
const settings = require('./settings');
const ipc = require('./ipc');
const serial = require('./serial');
const idioma = require('./idioma');
const { L } = idioma;

let janela = null;

function criarJanela() {
    const prefs = settings.tudo();

    janela = new BrowserWindow({
        width: (prefs.janela && prefs.janela.largura) || 1280,
        height: (prefs.janela && prefs.janela.altura) || 800,
        minWidth: 1024,
        minHeight: 640,
        title: 'NoCodeMCU',
        backgroundColor: '#11151c',
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    carregarPagina();

    // Modo de verificação: TA_DEBUG espelha o console do renderer no terminal e
    // TA_SMOKE=<ms> fecha o app sozinho — é assim que tools/app_test.js roda.
    if (process.env.TA_DEBUG) {
        janela.webContents.on('console-message', det => {
            console.log('[renderer ' + (det.level || 'log') + '] ' + det.message +
                (det.sourceId ? '  (' + det.sourceId + ':' + (det.lineNumber || 0) + ')' : ''));
        });
        janela.webContents.on('render-process-gone', (e, d) => {
            console.log('[renderer MORREU] ' + JSON.stringify(d));
        });
    }
    if (process.env.TA_SMOKE) {
        const ms = Number(process.env.TA_SMOKE) || 8000;
        setTimeout(async () => {
            if (process.env.TA_SHOT) {
                try {
                    const img = await janela.webContents.capturePage();
                    require('fs').writeFileSync(process.env.TA_SHOT, img.toPNG());
                    console.log('[smoke] captura em ' + process.env.TA_SHOT);
                } catch (e) {
                    console.log('[smoke] falha na captura: ' + e.message);
                }
            }
            app.quit();
        }, ms);
    }

    // Abrir um .tbk pela linha de comando (ou por associação de arquivo do SO).
    const arquivoInicial = process.argv.slice(1).find(a => /\.tbk$/i.test(a));
    if (arquivoInicial) {
        janela.webContents.once('did-finish-load', () => {
            janela.webContents.send('app:abrir-arquivo', { caminho: path.resolve(arquivoInicial) });
        });
    }

    janela.on('resize', () => {
        if (!janela) return;
        const [l, a] = janela.getSize();
        settings.definir('janela', { largura: l, altura: a });
    });

    janela.on('closed', () => { janela = null; });
}

/**
 * Itens de exemplos de uma pasta, lidos em tempo de execução. O rótulo vem do
 * campo "nome" de dentro do .tbk, não do arquivo — é ele que o aluno vê na
 * barra de título depois de abrir.
 *
 * Vale tanto em desenvolvimento quanto no app instalado: os dois resolvem para
 * a raiz do pacote, e o electron-builder leva exemplos/ junto (ver "files" no
 * package.json). Sem a pasta, o submenu fica desabilitado em vez de sumir —
 * some é pior, porque parece defeito.
 */
function exemplosDe(dir) {
    let arquivos = [];
    try {
        arquivos = fs.readdirSync(dir).filter(f => /\.tbk$/i.test(f)).sort();
    } catch (e) { /* pasta ausente */ }

    return arquivos.map(arquivo => {
        const caminho = path.join(dir, arquivo);
        let rotulo = arquivo.replace(/\.tbk$/i, '');
        try {
            const nome = JSON.parse(fs.readFileSync(caminho, 'utf8')).nome;
            if (nome) rotulo = nome;
        } catch (e) { /* .tbk ilegível: fica o nome do arquivo */ }
        return {
            label: rotulo,
            click: () => janela && janela.webContents.send('app:abrir-arquivo', { caminho: caminho })
        };
    });
}

/**
 * Submenu "Exemplos". Em inglês vêm primeiro os exemplos traduzidos
 * (exemplos/en/), e os em português ficam num submenu à parte.
 */
function itensDeExemplos() {
    const dir = path.join(__dirname, '..', '..', 'exemplos');
    const pt = exemplosDe(dir);
    const vazio = [{ label: L('(nenhum exemplo instalado)', '(no examples installed)'), enabled: false }];

    if (idioma.atual() !== 'en') return pt.length ? pt : vazio;

    const en = exemplosDe(path.join(dir, 'en'));
    const itens = en.slice();
    if (pt.length) {
        if (itens.length) itens.push({ type: 'separator' });
        itens.push({ label: 'In Portuguese', submenu: pt });
    }
    return itens.length ? itens : vazio;
}

/**
 * O renderer é quem aplica o tema; aqui só se guarda a escolha e se avisa.
 * Gravar no processo principal mantém a marcação do rádio correta ao remontar
 * o menu, mesmo que a janela ainda não tenha respondido.
 */
function trocarTema(nome) {
    settings.definir('tema', nome);
    if (janela) janela.webContents.send('menu:tema', { tema: nome });
}

/**
 * O renderer é quem converte o programa e remonta a paleta; aqui só se guarda a
 * escolha e se avisa.
 */
function trocarModo(nome) {
    settings.definir('modo', nome);
    if (janela) janela.webContents.send('menu:modo', { modo: nome });
}

/**
 * Os blocos são definidos uma vez, quando a página carrega; trocar o idioma
 * recarrega a janela. O renderer salva o rascunho no beforeunload, então o
 * programa aberto volta igual, só com os blocos no outro idioma.
 */
function trocarIdioma(nome) {
    if (nome === idioma.atual()) return;
    settings.definir('idioma', nome);
    montarMenu();
    if (janela) carregarPagina();
}

function carregarPagina() {
    janela.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'),
        { query: { lang: idioma.atual() } });
}

function montarMenu() {
    const enviar = canal => () => janela && janela.webContents.send(canal);
    const prefs = settings.tudo();

    const template = [
        {
            label: L('Arquivo', 'File'),
            submenu: [
                { label: L('Novo', 'New'), accelerator: 'CmdOrCtrl+N', click: enviar('menu:novo') },
                { label: L('Abrir…', 'Open…'), accelerator: 'CmdOrCtrl+O', click: enviar('menu:abrir') },
                { label: L('Exemplos', 'Examples'), submenu: itensDeExemplos() },
                { label: L('Salvar', 'Save'), accelerator: 'CmdOrCtrl+S', click: enviar('menu:salvar') },
                { label: L('Salvar como…', 'Save as…'), accelerator: 'CmdOrCtrl+Shift+S', click: enviar('menu:salvar-como') },
                { type: 'separator' },
                { label: L('Exportar .ino…', 'Export .ino…'), click: enviar('menu:exportar') },
                { type: 'separator' },
                { role: 'quit', label: L('Sair', 'Quit') }
            ]
        },
        {
            label: L('Placa', 'Board'),
            submenu: [
                { label: L('Compilar', 'Compile'), accelerator: 'CmdOrCtrl+R', click: enviar('menu:compilar') },
                { label: L('Compilar e gravar', 'Compile and upload'), accelerator: 'CmdOrCtrl+U', click: enviar('menu:gravar') },
                { type: 'separator' },
                { label: L('Atualizar lista de portas', 'Refresh port list'), accelerator: 'F5', click: enviar('menu:portas') },
                { label: L('Abrir monitor serial', 'Open serial monitor'), accelerator: 'CmdOrCtrl+M', click: enviar('menu:monitor') }
            ]
        },
        {
            label: L('Exibir', 'View'),
            submenu: [
                {
                    label: L('Modo', 'Mode'),
                    submenu: [
                        {
                            label: L('Literal — um bloco, um comando', 'Literal — one block, one command'), type: 'radio',
                            checked: prefs.modo !== 'abstrato',
                            click: () => trocarModo('literal')
                        },
                        {
                            label: L('Abstrato — blocos simplificados', 'Abstract — simplified blocks'), type: 'radio',
                            checked: prefs.modo === 'abstrato',
                            click: () => trocarModo('abstrato')
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: L('Tema', 'Theme'),
                    submenu: [
                        {
                            label: L('Escuro', 'Dark'), type: 'radio',
                            checked: prefs.tema !== 'claro',
                            click: () => trocarTema('escuro')
                        },
                        {
                            label: L('Claro', 'Light'), type: 'radio',
                            checked: prefs.tema === 'claro',
                            click: () => trocarTema('claro')
                        }
                    ]
                },
                { type: 'separator' },
                { role: 'reload', label: L('Recarregar', 'Reload') },
                { role: 'toggleDevTools', label: L('Ferramentas de desenvolvedor', 'Developer tools') },
                { type: 'separator' },
                { role: 'resetZoom', label: L('Zoom normal', 'Actual size') },
                { role: 'zoomIn', label: L('Aumentar zoom', 'Zoom in') },
                { role: 'zoomOut', label: L('Diminuir zoom', 'Zoom out') },
                { type: 'separator' },
                { role: 'togglefullscreen', label: L('Tela cheia', 'Full screen') }
            ]
        },
        {
            label: L('Opções', 'Options'),
            submenu: [
                {
                    // O nome de cada idioma fica na própria língua, e o título
                    // nas duas: quem caiu no idioma errado acha o caminho de volta.
                    label: L('Idioma / Language', 'Language / Idioma'),
                    submenu: [
                        {
                            label: 'Português', type: 'radio',
                            checked: idioma.atual() === 'pt',
                            click: () => trocarIdioma('pt')
                        },
                        {
                            label: 'English', type: 'radio',
                            checked: idioma.atual() === 'en',
                            click: () => trocarIdioma('en')
                        }
                    ]
                }
            ]
        },
        {
            label: L('Ajuda', 'Help'),
            submenu: [
                {
                    label: L('Referência da linguagem Arduino', 'Arduino language reference'),
                    click: () => shell.openExternal(L('https://www.arduino.cc/reference/pt/',
                        'https://www.arduino.cc/reference/en/'))
                },
                { label: L('Diagnóstico da toolchain', 'Toolchain diagnostics'), click: enviar('menu:diagnostico') }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
    const dirUsuario = app.getPath('userData');
    settings.iniciar(dirUsuario);

    try {
        cli.iniciar({
            raizApp: path.join(__dirname, '..', '..'),
            dirUsuario: dirUsuario,
            empacotado: app.isPackaged
        });
    } catch (e) {
        console.error('Falha ao preparar a toolchain:', e.message);
    }

    criarJanela();
    montarMenu();
    ipc.registrar(janela);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) criarJanela();
    });
});

app.on('window-all-closed', async () => {
    await serial.fechar();
    if (process.platform !== 'darwin') app.quit();
});
