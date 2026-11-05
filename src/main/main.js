'use strict';
/** Processo principal: janela, menu e inicialização da toolchain. */
const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const cli = require('./cli');
const settings = require('./settings');
const ipc = require('./ipc');
const serial = require('./serial');

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

    janela.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

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
 * Itens do submenu "Exemplos", lidos da pasta exemplos/ em tempo de execução.
 * O rótulo vem do campo "nome" de dentro do .tbk, não do arquivo — é ele que o
 * aluno vê na barra de título depois de abrir.
 *
 * Vale tanto em desenvolvimento quanto no app instalado: os dois resolvem para
 * a raiz do pacote, e o electron-builder leva exemplos/ junto (ver "files" no
 * package.json). Sem a pasta, o submenu fica desabilitado em vez de sumir —
 * some é pior, porque parece defeito.
 */
function itensDeExemplos() {
    const dir = path.join(__dirname, '..', '..', 'exemplos');
    let arquivos = [];
    try {
        arquivos = fs.readdirSync(dir).filter(f => /\.tbk$/i.test(f)).sort();
    } catch (e) { /* pasta ausente */ }

    if (!arquivos.length) {
        return [{ label: '(nenhum exemplo instalado)', enabled: false }];
    }

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

function montarMenu() {
    const enviar = canal => () => janela && janela.webContents.send(canal);

    const template = [
        {
            label: 'Arquivo',
            submenu: [
                { label: 'Novo', accelerator: 'CmdOrCtrl+N', click: enviar('menu:novo') },
                { label: 'Abrir…', accelerator: 'CmdOrCtrl+O', click: enviar('menu:abrir') },
                { label: 'Exemplos', submenu: itensDeExemplos() },
                { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: enviar('menu:salvar') },
                { label: 'Salvar como…', accelerator: 'CmdOrCtrl+Shift+S', click: enviar('menu:salvar-como') },
                { type: 'separator' },
                { label: 'Exportar .ino…', click: enviar('menu:exportar') },
                { type: 'separator' },
                { role: 'quit', label: 'Sair' }
            ]
        },
        {
            label: 'Placa',
            submenu: [
                { label: 'Compilar', accelerator: 'CmdOrCtrl+R', click: enviar('menu:compilar') },
                { label: 'Compilar e gravar', accelerator: 'CmdOrCtrl+U', click: enviar('menu:gravar') },
                { type: 'separator' },
                { label: 'Atualizar lista de portas', accelerator: 'F5', click: enviar('menu:portas') },
                { label: 'Abrir monitor serial', accelerator: 'CmdOrCtrl+M', click: enviar('menu:monitor') }
            ]
        },
        {
            label: 'Exibir',
            submenu: [
                {
                    label: 'Modo',
                    submenu: [
                        {
                            label: 'Literal — um bloco, um comando', type: 'radio',
                            checked: settings.tudo().modo !== 'abstrato',
                            click: () => trocarModo('literal')
                        },
                        {
                            label: 'Abstrato — blocos simplificados', type: 'radio',
                            checked: settings.tudo().modo === 'abstrato',
                            click: () => trocarModo('abstrato')
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Tema',
                    submenu: [
                        {
                            label: 'Escuro', type: 'radio',
                            checked: settings.tudo().tema !== 'claro',
                            click: () => trocarTema('escuro')
                        },
                        {
                            label: 'Claro', type: 'radio',
                            checked: settings.tudo().tema === 'claro',
                            click: () => trocarTema('claro')
                        }
                    ]
                },
                { type: 'separator' },
                { role: 'reload', label: 'Recarregar' },
                { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom normal' },
                { role: 'zoomIn', label: 'Aumentar zoom' },
                { role: 'zoomOut', label: 'Diminuir zoom' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Tela cheia' }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Referência da linguagem Arduino',
                    click: () => shell.openExternal('https://www.arduino.cc/reference/pt/')
                },
                { label: 'Diagnóstico da toolchain', click: enviar('menu:diagnostico') }
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
