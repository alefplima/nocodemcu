'use strict';
/**
 * Projetos em disco.
 *
 * O arquivo .tbk é o JSON de serialização do Blockly mais um cabeçalho com a
 * placa e o modo — abrir um projeto restaura o programa, a placa e o modo
 * (literal ou abstrato) em que ele foi feito.
 */
const fs = require('fs');
const path = require('path');

// O identificador gravado em cada .tbk. A leitura NÃO o confere: projeto
// salvo quando o programa se chamava TaskArduino ("taskarduino/1") continua
// abrindo normalmente, e é por isso que renomear não invalidou nenhum arquivo.
const FORMATO = 'nocodemcu/1';

function salvar(caminho, projeto) {
    const conteudo = {
        formato: FORMATO,
        salvoEm: new Date().toISOString(),
        placa: projeto.placa,
        modo: projeto.modo || 'literal',
        nome: projeto.nome || path.basename(caminho, path.extname(caminho)),
        workspace: projeto.workspace
    };
    fs.writeFileSync(caminho, JSON.stringify(conteudo, null, 2), 'utf8');
    return { ok: true, caminho: caminho, nome: conteudo.nome };
}

function abrir(caminho) {
    const bruto = fs.readFileSync(caminho, 'utf8');
    let j;
    try {
        j = JSON.parse(bruto);
    } catch (e) {
        return { ok: false, erro: 'Arquivo não é um projeto do NoCodeMCU (JSON inválido).' };
    }
    if (!j || !j.workspace) {
        return { ok: false, erro: 'Arquivo não tem um programa dentro.' };
    }
    return {
        ok: true,
        caminho: caminho,
        nome: j.nome || path.basename(caminho, path.extname(caminho)),
        placa: j.placa || null,
        // .tbk antigo não tem o campo: quem foi feito antes dos dois modos é
        // literal por definição.
        modo: j.modo === 'abstrato' ? 'abstrato' : 'literal',
        workspace: j.workspace
    };
}

function exportarIno(caminho, codigo) {
    fs.writeFileSync(caminho, codigo, 'utf8');
    return { ok: true, caminho: caminho };
}

module.exports = { salvar, abrir, exportarIno, FORMATO };
