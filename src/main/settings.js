'use strict';
/** Preferências simples em JSON no userData: última placa, porta, baud, janela. */
const fs = require('fs');
const path = require('path');

let arquivo = null;
let dados = {};

const PADRAO = {
    placa: 'uno',
    porta: null,
    baud: 9600,
    terminador: 'nl',
    autoScroll: true,
    tema: 'escuro',
    modo: 'literal',
    idioma: 'pt',
    lateralRecolhida: false,
    janela: { largura: 1280, altura: 800 },
    ultimoProjeto: null
};

function iniciar(dirUsuario) {
    arquivo = path.join(dirUsuario, 'preferencias.json');
    try {
        dados = Object.assign({}, PADRAO, JSON.parse(fs.readFileSync(arquivo, 'utf8')));
    } catch (e) {
        dados = Object.assign({}, PADRAO);
    }
    return dados;
}

function tudo() {
    return Object.assign({}, dados);
}

function definir(chave, valor) {
    dados[chave] = valor;
    salvar();
    return dados[chave];
}

function mesclar(objeto) {
    Object.assign(dados, objeto || {});
    salvar();
    return tudo();
}

function salvar() {
    if (!arquivo) return;
    try {
        fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), 'utf8');
    } catch (e) {
        // preferência não é crítica: seguir sem salvar é melhor do que quebrar
    }
}

module.exports = { iniciar, tudo, definir, mesclar };
