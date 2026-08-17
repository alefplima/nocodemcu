'use strict';
/**
 * Ponte entre o renderer (sem Node) e o processo principal.
 * Tudo que a interface pode fazer no sistema passa por aqui — nada mais.
 */
const { contextBridge, ipcRenderer } = require('electron');

const eventos = [
    'serial:linha', 'serial:estado', 'serial:erro',
    'build:log',
    'menu:novo', 'menu:abrir', 'menu:salvar', 'menu:salvar-como', 'menu:exportar',
    'menu:compilar', 'menu:gravar', 'menu:portas', 'menu:monitor', 'menu:diagnostico',
    'menu:tema', 'menu:modo',
    'app:abrir-arquivo'
];

contextBridge.exposeInMainWorld('tb', {

    prefs: {
        ler: () => ipcRenderer.invoke('prefs:ler'),
        gravar: obj => ipcRenderer.invoke('prefs:gravar', obj)
    },

    cli: {
        versao: () => ipcRenderer.invoke('cli:versao'),
        cores: () => ipcRenderer.invoke('cli:cores')
    },

    placas: {
        portas: () => ipcRenderer.invoke('placas:portas')
    },

    build: {
        compilar: o => ipcRenderer.invoke('build:compilar', o),
        gravar: o => ipcRenderer.invoke('build:gravar', o)
    },

    serial: {
        abrir: (porta, baud) => ipcRenderer.invoke('serial:abrir', { porta, baud }),
        fechar: () => ipcRenderer.invoke('serial:fechar'),
        enviar: (texto, terminador) => ipcRenderer.invoke('serial:enviar', { texto, terminador }),
        estado: () => ipcRenderer.invoke('serial:estado'),
        exportarLog: texto => ipcRenderer.invoke('serial:exportar-log', { texto })
    },

    projeto: {
        salvar: o => ipcRenderer.invoke('projeto:salvar', o),
        abrir: o => ipcRenderer.invoke('projeto:abrir', o || {}),
        exportarIno: o => ipcRenderer.invoke('projeto:exportar-ino', o)
    },

    /** Assinatura de eventos vindos do processo principal. */
    ao: (evento, callback) => {
        if (eventos.indexOf(evento) === -1) return () => { };
        const fn = (_e, dados) => callback(dados);
        ipcRenderer.on(evento, fn);
        return () => ipcRenderer.removeListener(evento, fn);
    }
});
