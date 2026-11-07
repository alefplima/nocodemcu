'use strict';
/**
 * Monitor serial: abre a porta, quebra em linhas e devolve tudo ao renderer.
 *
 * A gravação usa a mesma porta, então quem grava precisa fechar o monitor
 * antes e reabrir depois — é o que `suspender()` / `retomar()` fazem, guardando
 * a configuração anterior.
 */
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { L } = require('./idioma');

let porta = null;
let atual = null;      // {caminho, baud}
let suspenso = null;   // configuração guardada durante a gravação
let emitir = () => { };

function configurarEmissor(fn) {
    emitir = fn || (() => { });
}

async function listar() {
    try {
        const portas = await SerialPort.list();
        return portas.map(p => ({
            porta: p.path,
            fabricante: p.manufacturer || '',
            serie: p.serialNumber || '',
            vid: p.vendorId || '',
            pid: p.productId || ''
        }));
    } catch (e) {
        return [];
    }
}

function estado() {
    return {
        aberta: !!porta && porta.isOpen,
        porta: atual ? atual.caminho : null,
        baud: atual ? atual.baud : null
    };
}

function abrir(caminho, baud) {
    return new Promise(resolve => {
        if (porta && porta.isOpen) {
            fechar().then(() => abrir(caminho, baud).then(resolve));
            return;
        }
        try {
            porta = new SerialPort({ path: caminho, baudRate: Number(baud) || 9600, autoOpen: false });
        } catch (e) {
            resolve({ ok: false, erro: String(e.message) });
            return;
        }

        porta.open(err => {
            if (err) {
                porta = null;
                let msg = String(err.message);
                if (/access denied|permission/i.test(msg)) {
                    msg += process.platform === 'linux'
                        ? L(' — no Linux o usuário precisa estar no grupo dialout (sudo usermod -aG dialout $USER, depois sair e entrar de novo).',
                            ' — on Linux the user must be in the dialout group (sudo usermod -aG dialout $USER, then log out and back in).')
                        : L(' — feche a IDE do Arduino ou outro programa que esteja usando a porta.',
                            ' — close the Arduino IDE or any other program using the port.');
                }
                resolve({ ok: false, erro: msg });
                return;
            }

            atual = { caminho: caminho, baud: Number(baud) || 9600 };
            const parser = porta.pipe(new ReadlineParser({ delimiter: '\n' }));
            parser.on('data', linha => emitir('serial:linha', {
                texto: String(linha).replace(/\r$/, ''),
                t: Date.now()
            }));
            porta.on('error', e => emitir('serial:erro', { erro: String(e.message) }));
            porta.on('close', () => {
                emitir('serial:estado', { aberta: false, porta: atual && atual.caminho, baud: atual && atual.baud });
            });

            emitir('serial:estado', estado());
            resolve({ ok: true, estado: estado() });
        });
    });
}

function fechar() {
    return new Promise(resolve => {
        if (!porta) { resolve({ ok: true }); return; }
        const p = porta;
        porta = null;
        if (!p.isOpen) { resolve({ ok: true }); return; }
        p.close(() => {
            emitir('serial:estado', { aberta: false, porta: atual && atual.caminho, baud: atual && atual.baud });
            resolve({ ok: true });
        });
    });
}

function enviar(texto, terminador) {
    return new Promise(resolve => {
        if (!porta || !porta.isOpen) { resolve({ ok: false, erro: L('porta fechada', 'port closed') }); return; }
        const fim = terminador === 'nl' ? '\n' : terminador === 'cr' ? '\r'
            : terminador === 'crnl' ? '\r\n' : '';
        porta.write(String(texto) + fim, err => {
            resolve(err ? { ok: false, erro: String(err.message) } : { ok: true });
        });
    });
}

/** Fecha guardando a configuração, para a gravação usar a porta. */
async function suspender() {
    if (porta && porta.isOpen && atual) {
        suspenso = { caminho: atual.caminho, baud: atual.baud };
        await fechar();
        return true;
    }
    suspenso = null;
    return false;
}

/** Reabre o que suspender() fechou. */
async function retomar() {
    if (!suspenso) return { ok: false, erro: L('nada a retomar', 'nothing to resume') };
    const cfg = suspenso;
    suspenso = null;
    // A placa reinicia depois da gravação; um respiro evita abrir no meio do reset.
    await new Promise(r => setTimeout(r, 1200));
    return abrir(cfg.caminho, cfg.baud);
}

module.exports = { configurarEmissor, listar, abrir, fechar, enviar, estado, suspender, retomar };
