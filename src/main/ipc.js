'use strict';
/**
 * Canais IPC — a única superfície que o renderer enxerga do sistema.
 * Um handler por operação, sempre devolvendo objeto com {ok} ou dado puro.
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');

const cli = require('./cli');
const serial = require('./serial');
const settings = require('./settings');
const projects = require('./projects');

function registrar(janela) {

    const enviarUI = (canal, dados) => {
        if (janela && !janela.isDestroyed()) janela.webContents.send(canal, dados);
    };
    serial.configurarEmissor(enviarUI);

    /* ---------- preferências ---------- */

    ipcMain.handle('prefs:ler', () => settings.tudo());
    ipcMain.handle('prefs:gravar', (e, objeto) => settings.mesclar(objeto));

    /* ---------- toolchain ---------- */

    ipcMain.handle('cli:versao', async () => await cli.versao());
    ipcMain.handle('cli:cores', async () => await cli.coresInstalados());

    /* ---------- placas e portas ---------- */

    ipcMain.handle('placas:portas', async () => {
        const doCli = await cli.listarPortas();
        if (doCli.length) return { fonte: 'arduino-cli', portas: doCli };
        // Sem arduino-cli utilizável, ainda dá para listar portas cruas — mas só
        // as que podem ser uma placa. No Linux o /dev traz ttyS0..ttyS31 sempre:
        // são UARTs da placa-mãe, existem com ou sem hardware ligado e nenhuma
        // delas tem VID. Listá-las não só enchia o seletor de opções inúteis como
        // fazia a primeira ser escolhida sozinha (app.js), apontando a gravação
        // para uma porta que nunca teve placa. Sem candidata, a lista sai vazia e
        // a interface mostra "nenhuma placa detectada", que é a verdade.
        const cruas = await serial.listar();
        const ehUsb = p => /ttyUSB|ttyACM|usbserial|usbmodem|^COM/i.test(p.porta) || !!p.vid;
        return {
            fonte: 'serialport',
            portas: cruas.filter(ehUsb).map(p => ({
                porta: p.porta,
                rotulo: p.porta,
                fabricante: p.fabricante,
                placaDetectada: null,
                fqbnDetectado: null
            }))
        };
    });

    /* ---------- compilar e gravar ---------- */

    ipcMain.handle('build:compilar', async (e, opcoes) => {
        enviarUI('build:log', { linha: '> compilando para ' + opcoes.fqbn, canal: 'info' });
        const r = await cli.compilar(opcoes, (linha, canal) => {
            enviarUI('build:log', { linha: linha, canal: canal });
        });
        enviarUI('build:log', {
            linha: r.ok ? '> compilação concluída' : '> compilação falhou',
            canal: r.ok ? 'ok' : 'erro'
        });
        return r;
    });

    ipcMain.handle('build:gravar', async (e, opcoes) => {
        const estavaAberta = await serial.suspender();
        enviarUI('build:log', { linha: '> gravando em ' + opcoes.porta, canal: 'info' });

        const r = await cli.gravar(opcoes, (linha, canal) => {
            enviarUI('build:log', { linha: linha, canal: canal });
        });

        enviarUI('build:log', {
            linha: r.ok ? '> gravação concluída' : '> gravação falhou',
            canal: r.ok ? 'ok' : 'erro'
        });

        if (estavaAberta) {
            const reaberta = await serial.retomar();
            if (!reaberta.ok) {
                enviarUI('build:log', { linha: '> monitor serial não reabriu: ' + reaberta.erro, canal: 'erro' });
            }
        }
        return r;
    });

    /* ---------- monitor serial ---------- */

    ipcMain.handle('serial:abrir', async (e, o) => await serial.abrir(o.porta, o.baud));
    ipcMain.handle('serial:fechar', async () => await serial.fechar());
    ipcMain.handle('serial:enviar', async (e, o) => await serial.enviar(o.texto, o.terminador));
    ipcMain.handle('serial:estado', () => serial.estado());

    /* ---------- projetos ---------- */

    ipcMain.handle('projeto:salvar', async (e, o) => {
        let destino = o.caminho;
        if (!destino) {
            const r = await dialog.showSaveDialog(janela, {
                title: 'Salvar projeto',
                defaultPath: (o.nome || 'projeto') + '.tbk',
                filters: [{ name: 'Projeto NoCodeMCU', extensions: ['tbk'] }]
            });
            if (r.canceled) return { ok: false, cancelado: true };
            destino = r.filePath;
        }
        try {
            const res = projects.salvar(destino, o);
            settings.definir('ultimoProjeto', destino);
            return res;
        } catch (err) {
            return { ok: false, erro: String(err.message) };
        }
    });

    ipcMain.handle('projeto:abrir', async (e, o) => {
        let origem = o && o.caminho;
        if (!origem) {
            const r = await dialog.showOpenDialog(janela, {
                title: 'Abrir projeto',
                properties: ['openFile'],
                filters: [{ name: 'Projeto NoCodeMCU', extensions: ['tbk'] }]
            });
            if (r.canceled || !r.filePaths.length) return { ok: false, cancelado: true };
            origem = r.filePaths[0];
        }
        try {
            const res = projects.abrir(origem);
            if (res.ok) settings.definir('ultimoProjeto', origem);
            return res;
        } catch (err) {
            return { ok: false, erro: String(err.message) };
        }
    });

    ipcMain.handle('projeto:exportar-ino', async (e, o) => {
        const r = await dialog.showSaveDialog(janela, {
            title: 'Exportar sketch',
            defaultPath: (o.nome || 'sketch') + '.ino',
            filters: [{ name: 'Sketch Arduino', extensions: ['ino'] }]
        });
        if (r.canceled) return { ok: false, cancelado: true };
        try {
            return projects.exportarIno(r.filePath, o.codigo);
        } catch (err) {
            return { ok: false, erro: String(err.message) };
        }
    });

    ipcMain.handle('serial:exportar-log', async (e, o) => {
        const r = await dialog.showSaveDialog(janela, {
            title: 'Exportar log serial',
            defaultPath: 'serial.txt',
            filters: [{ name: 'Texto', extensions: ['txt'] }]
        });
        if (r.canceled) return { ok: false, cancelado: true };
        try {
            require('fs').writeFileSync(r.filePath, o.texto || '', 'utf8');
            return { ok: true, caminho: r.filePath };
        } catch (err) {
            return { ok: false, erro: String(err.message) };
        }
    });
}

module.exports = { registrar };
