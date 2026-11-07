'use strict';
/**
 * Idioma do processo principal (menu e diálogos do sistema).
 *
 * O renderer tem o próprio dicionário (src/renderer/js/i18n.js); aqui só
 * ficam os textos que nascem no processo principal. L('Abrir…', 'Open…')
 * devolve o texto do idioma escolhido em Opções → Idioma.
 */
const settings = require('./settings');

function atual() {
    return settings.tudo().idioma === 'en' ? 'en' : 'pt';
}

function L(pt, en) {
    return atual() === 'en' ? en : pt;
}

module.exports = { atual, L };
