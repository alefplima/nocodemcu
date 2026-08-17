#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Blocos de construção compartilhados pelos geradores de .docx.

Usado por tools/gerar_doc.py (documentação técnica) e tools/gerar_apostila.py
(apostila didática). Os contadores de figura e tabela vivem na instância, não
em variável de módulo, porque os dois documentos são gerados no mesmo processo
quando se roda `npm run doc` — contador global faria a numeração de um vazar
para o outro.
"""
import os

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RAIZ, 'docs', 'img')

CINZA = RGBColor(0x5A, 0x66, 0x73)
PRETO = RGBColor(0x1B, 0x23, 0x30)
AZUL = RGBColor(0x1F, 0x6F, 0xEB)
AMBAR = RGBColor(0x9A, 0x67, 0x00)
VERDE = RGBColor(0x1A, 0x7F, 0x37)

CENTRO = WD_ALIGN_PARAGRAPH.CENTER


def sombrear(celula, cor):
    sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear')
    sh.set(qn('w:fill'), cor)
    celula._tc.get_or_add_tcPr().append(sh)


def borda_esquerda(celula, cor, largura=18):
    """Filete colorido só à esquerda — a marca visual das caixas da apostila."""
    tcPr = celula._tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for lado in ('top', 'bottom', 'right'):
        e = OxmlElement('w:%s' % lado)
        e.set(qn('w:val'), 'nil')
        borders.append(e)
    e = OxmlElement('w:left')
    e.set(qn('w:val'), 'single')
    e.set(qn('w:sz'), str(largura))
    e.set(qn('w:color'), cor)
    borders.append(e)
    tcPr.append(borders)


class Doc:
    """Documento em construção, com numeração própria de figuras e tabelas."""

    def __init__(self, titulo_fonte='Calibri', corpo=11):
        self.doc = Document()
        self.n_figura = 0
        self.n_tabela = 0
        self._preparar(titulo_fonte, corpo)

    def _preparar(self, fonte_titulo, corpo):
        n = self.doc.styles['Normal']
        n.font.name = 'Calibri'
        n.font.size = Pt(corpo)
        n.paragraph_format.space_after = Pt(8)
        n.paragraph_format.line_spacing = 1.15
        for i, tam in ((1, 20), (2, 15), (3, 12.5)):
            e = self.doc.styles['Heading %d' % i]
            e.font.name = fonte_titulo
            e.font.size = Pt(tam)
            e.font.color.rgb = PRETO
            e.paragraph_format.space_before = Pt(16 if i < 3 else 12)
            e.paragraph_format.space_after = Pt(6)

    # ---------------- passagens ----------------

    def titulo(self, texto, nivel=1):
        return self.doc.add_heading(texto, nivel)

    def quebra(self):
        self.doc.add_page_break()

    def p(self, texto='', negrito=False, italico=False, tam=None, cor=None,
          alinhar=None, espaco=None):
        par = self.doc.add_paragraph()
        r = par.add_run(texto)
        r.bold = negrito
        r.italic = italico
        if tam:
            r.font.size = Pt(tam)
        if cor:
            r.font.color.rgb = cor
        if alinhar:
            par.alignment = alinhar
        if espaco is not None:
            par.paragraph_format.space_after = Pt(espaco)
        return par

    def rico(self, partes, alinhar=None):
        """Parágrafo misto: [(texto, 'b' | 'i' | 'm' | None), …]"""
        par = self.doc.add_paragraph()
        for txt, estilo in partes:
            r = par.add_run(txt)
            if estilo == 'b':
                r.bold = True
            elif estilo == 'i':
                r.italic = True
            elif estilo == 'm':
                r.font.name = 'Consolas'
                r.font.size = Pt(10)
        if alinhar:
            par.alignment = alinhar
        return par

    def lista(self, itens, numerada=False):
        estilo = 'List Number' if numerada else 'List Bullet'
        for it in itens:
            par = self.doc.add_paragraph(style=estilo)
            if isinstance(it, list):
                for txt, e in it:
                    r = par.add_run(txt)
                    if e == 'b':
                        r.bold = True
                    elif e == 'i':
                        r.italic = True
                    elif e == 'm':
                        r.font.name = 'Consolas'
                        r.font.size = Pt(10)
            else:
                par.add_run(it)

    def codigo(self, texto, fundo='F2F4F7'):
        tab = self.doc.add_table(rows=1, cols=1)
        tab.alignment = WD_TABLE_ALIGNMENT.CENTER
        c = tab.cell(0, 0)
        sombrear(c, fundo)
        c.text = ''
        for i, linha in enumerate(str(texto).rstrip().split('\n')):
            par = c.paragraphs[0] if i == 0 else c.add_paragraph()
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.line_spacing = 1.0
            r = par.add_run(linha if linha else ' ')
            r.font.name = 'Consolas'
            r.font.size = Pt(9)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(4)

    def equacao(self, txt, numero=None):
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        r = par.add_run(txt)
        r.font.name = 'Cambria Math'
        r.font.size = Pt(12)
        if numero:
            n = par.add_run('        (%s)' % numero)
            n.font.size = Pt(10)
            n.font.color.rgb = CINZA
        return par

    def figura(self, arquivo, legenda, larg=6.0):
        caminho = os.path.join(IMG, arquivo)
        if not os.path.exists(caminho):
            print('  ! figura ausente, pulando: ' + arquivo)
            return
        self.doc.add_picture(caminho, width=Inches(larg))
        self.doc.paragraphs[-1].alignment = CENTRO
        self.n_figura += 1
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        r = par.add_run('Figura %d — %s' % (self.n_figura, legenda))
        r.font.size = Pt(9.5)
        r.font.color.rgb = CINZA

    def tabela(self, cabecalho, linhas, legenda=None, larguras=None, mono=None,
               tam=9):
        tab = self.doc.add_table(rows=1, cols=len(cabecalho))
        tab.style = 'Table Grid'
        for i, h in enumerate(cabecalho):
            c = tab.rows[0].cells[i]
            c.text = ''
            r = c.paragraphs[0].add_run(h)
            r.bold = True
            r.font.size = Pt(tam + 0.5)
            sombrear(c, 'E8ECF2')
        for linha in linhas:
            cells = tab.add_row().cells
            for i, v in enumerate(linha):
                cells[i].text = ''
                for j, sub in enumerate(str(v).split('\n')):
                    par = cells[i].paragraphs[0] if j == 0 else cells[i].add_paragraph()
                    par.paragraph_format.space_after = Pt(0)
                    r = par.add_run(sub)
                    r.font.size = Pt(tam)
                    if mono and i in mono:
                        r.font.name = 'Consolas'
                        r.font.size = Pt(tam - 0.5)
        if larguras:
            for i, w in enumerate(larguras):
                for row in tab.rows:
                    row.cells[i].width = Inches(w)
        if legenda:
            self.n_tabela += 1
            par = self.doc.add_paragraph()
            r = par.add_run('Tabela %d — %s' % (self.n_tabela, legenda))
            r.font.size = Pt(9.5)
            r.font.color.rgb = CINZA
        return tab

    def caixa(self, rotulo, cor_filete, fundo, linhas):
        """
        Caixa destacada com filete colorido à esquerda.

        `linhas` aceita str (parágrafo simples), ('cod', texto) para código e
        ('eq', texto) para equação centralizada.
        """
        tab = self.doc.add_table(rows=1, cols=1)
        c = tab.cell(0, 0)
        sombrear(c, fundo)
        borda_esquerda(c, cor_filete)
        c.text = ''

        par = c.paragraphs[0]
        par.paragraph_format.space_after = Pt(4)
        r = par.add_run(rotulo)
        r.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor.from_string(cor_filete)

        for item in linhas:
            if isinstance(item, tuple) and item[0] == 'cod':
                for linha in str(item[1]).rstrip().split('\n'):
                    q = c.add_paragraph()
                    q.paragraph_format.space_after = Pt(0)
                    q.paragraph_format.line_spacing = 1.0
                    rr = q.add_run(linha if linha else ' ')
                    rr.font.name = 'Consolas'
                    rr.font.size = Pt(9)
            elif isinstance(item, tuple) and item[0] == 'eq':
                q = c.add_paragraph()
                q.alignment = CENTRO
                q.paragraph_format.space_after = Pt(2)
                rr = q.add_run(item[1])
                rr.font.name = 'Cambria Math'
                rr.font.size = Pt(11.5)
            elif isinstance(item, list):
                q = c.add_paragraph()
                q.paragraph_format.space_after = Pt(2)
                for txt, e in item:
                    rr = q.add_run(txt)
                    if e == 'b':
                        rr.bold = True
                    elif e == 'i':
                        rr.italic = True
                    elif e == 'm':
                        rr.font.name = 'Consolas'
                        rr.font.size = Pt(9.5)
            else:
                q = c.add_paragraph()
                q.paragraph_format.space_after = Pt(2)
                rr = q.add_run(str(item))
                rr.font.size = Pt(10)

        self.doc.add_paragraph().paragraph_format.space_after = Pt(4)
        return tab

    def salvar(self, caminho):
        self.doc.save(caminho)
        return caminho
