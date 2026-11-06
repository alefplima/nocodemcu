#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/figuras-artigo-carro4x4.docx — as figuras do artigo sobre as tarefas
do Modo Abstrato, aplicadas ao carro 4x4 com LPA2v.

    npx electron tools/capturar_artigo.js     # prints do exemplo 16
    python tools/gerar_figuras_artigo.py

Segue o padrão de figuras de Wang et al. (2025), "Review of the development
status of low-code programming software for robots": painéis lado a lado com
subtítulo (a), (b)..., legenda "Fig. N." abaixo, e a interface do software com
números marcando as regiões, explicados na legenda.

Os blocos vêm em PNG 3x exportados do Blockly. Dentro de cada figura todos usam
a mesma escala (cm por pixel do Blockly), para o texto dos blocos sair do mesmo
tamanho em todos os painéis.
"""
import os

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRINTS = os.path.join(RAIZ, 'docs', 'img_artigo_tarefas')
FOTOS = os.path.join(RAIZ, 'docs', 'img_emmy_spa_nocode')
SAIDA = os.path.join(RAIZ, 'docs', 'figuras-artigo-carro4x4.docx')

REPOSITORIO = 'https://github.com/alefplima/nocodemcu'
LARGURA_UTIL = 17.4  # cm, A4 com margens de 1,8 cm
FONTE = 'Times New Roman'
CINZA = RGBColor(0x40, 0x40, 0x40)


def foto(nome):
    return os.path.join(FOTOS, 'WhatsApp Image 2026-11-06 at ' + nome + '.jpeg')


def bloco(nome):
    return os.path.join(PRINTS, 'bloco-' + nome + '.png')


# ---------------------------------------------------------------- imagens

def preparar():
    """Imagens derivadas: interface numerada, recortes do celular e da foto."""
    fonte = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)

    # Interface com as regiões numeradas, como a Fig. 8 do artigo de referência.
    ide = Image.open(os.path.join(PRINTS, 'ide-visao-geral.png')).convert('RGB')
    d = ImageDraw.Draw(ide)
    for n, (x, y) in enumerate([(160, 420), (545, 300), (1290, 330), (640, 25), (1225, 73)], 1):
        r = 17
        d.ellipse((x - r, y - r, x + r, y + r), fill=(20, 24, 31), outline='white', width=3)
        d.text((x, y + 1), str(n), font=fonte, fill='white', anchor='mm')
    ide.save(os.path.join(PRINTS, 'fig-ide-numerada.png'))

    # Caixa de ferramentas com a categoria Tarefas aberta.
    cat = Image.open(os.path.join(PRINTS, 'ide-categoria-tarefas.png')).convert('RGB')
    cat.crop((0, 48, 400, 200)).save(os.path.join(PRINTS, 'fig-categoria-tarefas.png'))

    # Celular: sem a barra de status do aparelho e sem o fundo vazio de baixo.
    for nome, saida in [('10.55.10', 'cel-lpa2v-qf'), ('10.55.09 (1)', 'cel-lpa2v-t'),
                        ('10.55.09 (2)', 'cel-operador-manual'), ('10.55.09', 'cel-operador-preso')]:
        Image.open(foto(nome)).convert('RGB').crop((0, 100, 720, 1150)).save(
            os.path.join(PRINTS, saida + '.png'))

    # A vista frontal é retrato; recortada em 4:3 para o quadro 2x2 ficar regular.
    Image.open(foto('10.54.28')).convert('RGB').crop((0, 380, 1200, 1280)).save(
        os.path.join(PRINTS, 'foto-frontal.jpg'), quality=92)


# ---------------------------------------------------------------- documento

def sem_bordas(tabela):
    tblPr = tabela._tbl.tblPr
    bordas = OxmlElement('w:tblBorders')
    for lado in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + lado)
        e.set(qn('w:val'), 'nil')
        bordas.append(e)
    tblPr.append(bordas)


def nao_quebrar(linha):
    trPr = linha._tr.get_or_add_trPr()
    e = OxmlElement('w:cantSplit')
    trPr.append(e)


class Figuras:
    def __init__(self):
        self.doc = Document()
        self.n = 0
        s = self.doc.sections[0]
        s.page_width, s.page_height = Cm(21), Cm(29.7)
        s.left_margin = s.right_margin = Cm(1.8)
        s.top_margin = s.bottom_margin = Cm(2)
        normal = self.doc.styles['Normal']
        normal.font.name = FONTE
        normal.element.rPr.rFonts.set(qn('w:eastAsia'), FONTE)
        normal.font.size = Pt(10)
        normal.paragraph_format.space_after = Pt(0)

    def par(self, texto='', tam=10, negrito=False, italico=False, alinhar=None, antes=0, depois=0, cor=None):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(antes)
        p.paragraph_format.space_after = Pt(depois)
        if alinhar is not None:
            p.alignment = alinhar
        if texto:
            r = p.add_run(texto)
            r.font.size = Pt(tam)
            r.bold = negrito
            r.italic = italico
            if cor:
                r.font.color.rgb = cor
        return p

    def cabecalho(self):
        self.par('Figuras', 9, alinhar=WD_ALIGN_PARAGRAPH.LEFT, cor=CINZA)
        self.par('Tarefas no Modo Abstrato do NoCodeMCU: o carro 4x4 com LPA2v, câmera e operador',
                 16, alinhar=WD_ALIGN_PARAGRAPH.LEFT, antes=4, depois=8)
        self.par('Prints da IDE no tema claro, exportados do exemplo 16 '
                 '(exemplos/16-abstrato-carro4x4-tarefas.tbk), fotos do protótipo e telas da '
                 'página de pilotagem no celular. As figuras seguem o padrão de Wang et al. '
                 '(2025): painéis identificados por (a), (b)... e legenda "Fig. N." abaixo.',
                 9, alinhar=WD_ALIGN_PARAGRAPH.JUSTIFY, depois=4, cor=CINZA)
        p = self.par('Código-fonte, exemplos e instaladores: ', 9, alinhar=WD_ALIGN_PARAGRAPH.LEFT,
                     depois=14, cor=CINZA)
        self.link(p, REPOSITORIO, 9)

    def link(self, paragrafo, url, tam):
        """Hiperlink clicável no .docx (o python-docx não tem API para isso)."""
        rid = self.doc.part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
                                      is_external=True)
        h = OxmlElement('w:hyperlink')
        h.set(qn('r:id'), rid)
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        for tag, val in (('w:color', '1F5FBF'), ('w:u', 'single'), ('w:sz', str(tam * 2))):
            e = OxmlElement(tag)
            e.set(qn('w:val'), val)
            rPr.append(e)
        r.append(rPr)
        t = OxmlElement('w:t')
        t.text = url
        r.append(t)
        h.append(r)
        paragrafo._p.append(h)

    def quebra(self):
        self.doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    def figura(self, linhas, legenda):
        """
        linhas: lista de linhas; cada linha é uma lista de painéis
        (caminho, largura_cm, subtítulo ou None).
        """
        self.n += 1
        letra = 0
        for paineis in linhas:
            t = self.doc.add_table(rows=2 if any(p[2] for p in paineis) else 1, cols=len(paineis))
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            sem_bordas(t)
            for linha in t.rows:
                nao_quebrar(linha)
            for i, (caminho, largura, sub) in enumerate(paineis):
                c = t.cell(0, i)
                p = c.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.keep_with_next = True
                p.paragraph_format.space_before = Pt(4)
                p.add_run().add_picture(caminho, width=Cm(largura))
                if sub:
                    s = t.cell(1, i).paragraphs[0]
                    s.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    s.paragraph_format.keep_with_next = True
                    s.paragraph_format.space_after = Pt(4)
                    r = s.add_run('(' + 'abcdefgh'[letra] + ') ' + sub)
                    r.font.size = Pt(8)
                    letra += 1
        p = self.par(alinhar=WD_ALIGN_PARAGRAPH.JUSTIFY, antes=6, depois=16)
        r = p.add_run('Fig. ' + str(self.n) + '. ')
        r.bold = True
        r.font.size = Pt(8)
        r = p.add_run(legenda)
        r.font.size = Pt(8)

    def salvar(self):
        self.doc.save(SAIDA)


def largura(caminho, escala):
    """Largura em cm de um bloco exportado em 3x, na escala dada (cm por px do Blockly)."""
    return Image.open(caminho).size[0] / 3 * escala


def montar():
    f = Figuras()
    f.cabecalho()

    f.figura([[(os.path.join(PRINTS, 'diag-contexto.png'), LARGURA_UTIL, None)]],
             'Diagrama de contexto, em alto nível. No computador, o projetista monta o programa em '
             'blocos e tarefas; o NoCodeMCU gera o C++ e o arduino-cli embutido grava a placa pela USB. '
             'Na ESP32-S3 CAM, o "Sempre" repete o ciclo perceber, decidir, agir e informar; os sensores '
             'leem o trajeto e os motores o alteram, fechando o laço físico. Pela rede WiFi criada pela '
             'própria placa, o celular mostra o reticulado e o vídeo, e o operador pode assumir o '
             'controle. As cores são as das categorias de blocos da IDE.')
    f.figura([[(os.path.join(PRINTS, 'ilustracao-preso.png'), LARGURA_UTIL, None)]],
             'Cenário de travamento. Depois de três desvios sem achar caminho livre, o carro está diante '
             'da barreira com os dois sensores vendo obstáculo; ele para, acorda a câmera e passa o '
             'controle ao operador, que vê a barreira no celular, conectado à rede "carro4x4", dirige pelo '
             'analógico e devolve o carro à LPA2v com o botão Liberar.')
    f.quebra()

    f.figura([
        [(foto('10.54.27'), 8.5, 'Vista superior'), (foto('10.54.27 (1)'), 8.5, 'Vista lateral')],
        [(foto('10.54.27 (2)'), 8.5, 'Perspectiva'),
         (os.path.join(PRINTS, 'foto-frontal.jpg'), 8.5, 'Vista frontal')]
    ], 'Protótipo do carro 4x4: ESP32-S3 CAM (ESP32-S3-WROOM-1 N16R8) sobre a protoboard, ponte H '
       'L298N com os dois motores de cada lado em paralelo e dois sensores ultrassônicos HC-SR04 na '
       'frente, com divisor resistivo no pino de eco. (a) Vista superior. (b) Vista lateral. '
       '(c) Perspectiva. (d) Vista frontal.')
    f.quebra()

    f.figura([
        [(os.path.join(PRINTS, 'fig-ide-numerada.png'), LARGURA_UTIL, 'Visão geral')],
        [(os.path.join(PRINTS, 'fig-categoria-tarefas.png'), 9.0, 'Categoria Tarefas')]
    ], 'Interface do NoCodeMCU no Modo Abstrato, tema claro, com o exemplo 16 aberto. (a) Visão '
       'geral: (1) caixa de ferramentas organizada por categorias; (2) área de montagem, com o bloco '
       '"Sempre" e as tarefas; (3) código C++ gerado em tempo real, aqui nas funções que as tarefas '
       'produzem; (4) escolha da placa e da porta, compilação e gravação pela USB; (5) abas do '
       'monitor serial, do plotter, do reticulado da LPA2v e da saída do compilador. (b) A categoria '
       'Tarefas aberta, com os blocos "tarefa" (define) e "fazer a tarefa" (chama).')
    f.quebra()

    e = 0.019
    f.figura([[
        (bloco('ao-iniciar'), largura(bloco('ao-iniciar'), e), 'Ao iniciar'),
        (bloco('sempre'), largura(bloco('sempre'), e), 'Sempre')
    ]], 'Estrutura principal do programa. (a) "Ao iniciar": pinos da ponte H, parâmetros guardados '
        'em caixas (universo de discurso, limites e velocidades) e a chamada da tarefa de rede. '
        '(b) "Sempre": o ciclo de controle reduzido a uma linha por etapa; o bloco se/senão decide se '
        'quem dirige é o operador ou a LPA2v.')
    f.quebra()

    f.figura([
        [(bloco('tarefa-ligar-a-rede-e-a-camera'), largura(bloco('tarefa-ligar-a-rede-e-a-camera'), e),
          'ligar a rede e a câmera')],
        [(bloco('tarefa-medir-as-distancias'), largura(bloco('tarefa-medir-as-distancias'), e),
          'medir as distâncias')],
        [(bloco('tarefa-calcular-as-evidencias'), largura(bloco('tarefa-calcular-as-evidencias'), e),
          'calcular as evidências')]
    ], 'Tarefas de comunicação e percepção. (a) A placa cria a própria rede WiFi, abre o servidor da '
       'página e liga a câmera. (b) Leitura dos dois sensores ultrassônicos, com intervalo entre os '
       'disparos para evitar eco cruzado, e publicação das distâncias na página. (c) Conversão das '
       'distâncias em graus de evidência entre o universo de discurso UD_LONGE e UD_PERTO, e envio do '
       'ponto (μ, λ) ao reticulado desenhado no celular.')
    f.quebra()

    f.figura([[(os.path.join(PRINTS, 'diag-lpa2v.png'), LARGURA_UTIL, None)]],
             'Diagrama da função de que depende a navegação autônoma, a tarefa "dirigir pela LPA2v", '
             'seguida de "conferir se está preso". As distâncias viram graus de evidência; o '
             'Para-Analisador calcula o grau de certeza Gc e o de contradição Gct, localiza o estado '
             'lógico no reticulado (limites ±0,5) e executa a ação daquele estado. Ao fim de cada ciclo, '
             'três desvios sem caminho livre passam o controle ao operador.')
    f.quebra()

    lpa = bloco('tarefa-dirigir-pela-lpa2v')
    f.figura([[(lpa, largura(lpa, 0.0148), None)]],
             'Tarefa "dirigir pela LPA2v": o bloco "analisar" compara as evidências dos dois sensores e '
             'desvia para a ação do estado lógico resultante no reticulado: V (os dois veem obstáculo) '
             'chama "desviar"; Qv→T faz meio giro; F (caminho livre) segue em frente e zera a contagem '
             'de desvios; T (contradição) avança devagar para as leituras desempatarem; ⊥ faz meia '
             'manobra e conta o desvio; os demais estados seguem devagar e medem de novo.')
    f.quebra()

    e = 0.017
    f.figura([
        [(bloco('tarefa-conferir-se-esta-preso'), largura(bloco('tarefa-conferir-se-esta-preso'), e),
          'conferir se está preso')],
        [(bloco('tarefa-desviar'), largura(bloco('tarefa-desviar'), e), 'desviar'),
         (bloco('tarefa-arrancar-devagar'), largura(bloco('tarefa-arrancar-devagar'), e), 'arrancar devagar')]
    ], 'Tarefas de manobra. (a) O seguro contra a indecisão (ciclos demais sem cair em V nem F força um '
       'desvio) e a declaração de travamento: depois de LIMITE_PRESO desvios sem caminho livre, o carro '
       'para e a câmera abre no celular para o operador. (b) Desvio contado: para, dá ré e gira por '
       'TEMPO_GIRO. (c) Partida com impulso de VEL_ARRANQUE antes da velocidade de cruzeiro. Uma tarefa '
       'escrita uma vez é chamada de vários pontos: "desviar" é usada no estado V e no seguro.')
    f.quebra()

    op = bloco('tarefa-dirigir-pelo-operador')
    f.figura([[(op, largura(op, 0.0165), None)]],
             'Tarefa "dirigir pelo operador": cada botão de direção da página vale enquanto o dedo está '
             'nele; sem toque, o carro para. O botão "liberar" zera os contadores, esconde a câmera e '
             'devolve o controle à LPA2v.')
    f.quebra()

    e = 0.019
    f.figura([
        [(bloco('tarefa-ver-se-o-operador-assumiu'), largura(bloco('tarefa-ver-se-o-operador-assumiu'), e),
          'ver se o operador assumiu')],
        [(bloco('tarefa-mostrar-o-estado-na-pagina'), largura(bloco('tarefa-mostrar-o-estado-na-pagina'), e),
          'mostrar o estado na página')]
    ], 'Tarefas da página de pilotagem. (a) O botão "assumir" passa o controle ao operador a qualquer '
       'momento e mostra o vídeo com o aviso. (b) Contadores publicados na página a cada ciclo.')

    f.quebra()
    cel = 7.0
    f.figura([
        [(os.path.join(PRINTS, 'cel-lpa2v-qf.png'), cel, 'LPA2v, Qf→⊥'),
         (os.path.join(PRINTS, 'cel-lpa2v-t.png'), cel, 'LPA2v, T')],
        [(os.path.join(PRINTS, 'cel-operador-manual.png'), cel, 'Operador, manual'),
         (os.path.join(PRINTS, 'cel-operador-preso.png'), cel, 'Operador, preso')]
    ], 'Página de pilotagem servida pela própria placa (http://192.168.4.1) no navegador do celular. '
        '(a) Modo LPA2v, estado quase falso tendendo ao indeterminado, com o rastro das últimas leituras '
        'no reticulado. (b) Modo LPA2v, estado T (inconsistente): os sensores discordam. (c) O operador '
        'assumiu pelo botão: vídeo da câmera com o aviso e o reticulado no canto. (d) Depois de três '
        'desvios sem caminho livre o carro se declarou preso e passou o controle ao operador.')

    f.par('Referência', 9, negrito=True, antes=10, depois=2)
    f.par('WANG, P.; WANG, Z.; DUAN, J.; MIAO, Y.; TIAN, W. Review of the development status of '
          'low-code programming software for robots. Digital Engineering, v. 4, 100039, 2025. '
          'DOI: 10.1016/j.dte.2025.100039.', 8, alinhar=WD_ALIGN_PARAGRAPH.JUSTIFY)
    p = f.par('NoCodeMCU, repositório público: ', 8, alinhar=WD_ALIGN_PARAGRAPH.LEFT, antes=4)
    f.link(p, REPOSITORIO, 8)
    f.salvar()
    print('figuras: ' + str(f.n) + '  ->  ' + os.path.relpath(SAIDA, RAIZ))


if __name__ == '__main__':
    preparar()
    montar()
