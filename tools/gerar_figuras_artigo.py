#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/figuras-artigo-carro4x4.docx — as figuras do artigo sobre as tarefas
do Modo Abstrato, aplicadas ao carro 4x4 com LPA2v.

    npx electron tools/capturar_artigo.js     # prints do exemplo 16
    python tools/gerar_figuras_artigo.py

Versão em inglês, em docs/figuras-artigo-carro4x4-en.docx:

    node tools/traduzir_exemplos.js                 # exemplos/en/16-...
    npx electron tools/desenhar_diagramas.js --en   # diagramas
    npx electron tools/capturar_artigo.js --en      # prints da IDE em inglês
    npx electron tools/capturar_celular.js          # telas do celular
    python tools/gerar_figuras_artigo.py --en

Segue o padrão de figuras de Wang et al. (2025), "Review of the development
status of low-code programming software for robots": painéis lado a lado com
subtítulo (a), (b)..., legenda "Fig. N." abaixo, e a interface do software com
números marcando as regiões, explicados na legenda.

Os blocos vêm em PNG 3x exportados do Blockly. Dentro de cada figura todos usam
a mesma escala (cm por pixel do Blockly), para o texto dos blocos sair do mesmo
tamanho em todos os painéis.
"""
import os
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont

INGLES = '--en' in sys.argv

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRINTS_PT = os.path.join(RAIZ, 'docs', 'img_artigo_tarefas')
PRINTS = os.path.join(RAIZ, 'docs', 'img_artigo_tarefas_en' if INGLES else 'img_artigo_tarefas')
FOTOS = os.path.join(RAIZ, 'docs', 'img_emmy_spa_nocode')
SAIDA = os.path.join(RAIZ, 'docs', 'figuras-artigo-carro4x4-en.docx' if INGLES else 'figuras-artigo-carro4x4.docx')


def L(pt, en):
    """Texto no idioma do documento."""
    return en if INGLES else pt

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
    for n, (x, y) in enumerate([(160, 420), (545, 300), (1290, 330), (L(640, 622), 25), (1225, 73)], 1):
        r = 17
        d.ellipse((x - r, y - r, x + r, y + r), fill=(20, 24, 31), outline='white', width=3)
        d.text((x, y + 1), str(n), font=fonte, fill='white', anchor='mm')
    ide.save(os.path.join(PRINTS, 'fig-ide-numerada.png'))

    # Caixa de ferramentas com a categoria Tarefas aberta.
    cat = Image.open(os.path.join(PRINTS, 'ide-categoria-tarefas.png')).convert('RGB')
    cat.crop((0, 48, 400, 200)).save(os.path.join(PRINTS, 'fig-categoria-tarefas.png'))

    if INGLES:
        return

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
        self.par(L('Figuras', 'Figures'), 9, alinhar=WD_ALIGN_PARAGRAPH.LEFT, cor=CINZA)
        self.par(L('Tarefas no Modo Abstrato do NoCodeMCU: o carro 4x4 com LPA2v, câmera e operador',
                   'Tasks in the NoCodeMCU Abstract Mode: the 4x4 car with PAL2v, camera and operator'),
                 16, alinhar=WD_ALIGN_PARAGRAPH.LEFT, antes=4, depois=8)
        self.par(L('Prints da IDE no tema claro, exportados do exemplo 16 '
                   '(exemplos/16-abstrato-carro4x4-tarefas.tbk), fotos do protótipo e telas da '
                   'página de pilotagem no celular. As figuras seguem o padrão de Wang et al. '
                   '(2025): painéis identificados por (a), (b)... e legenda "Fig. N." abaixo.',
                   'IDE screenshots in the light theme with the interface in English, exported from '
                   'example 16 (exemplos/en/16-abstract-4x4-car-tasks.tbk), photos of the prototype '
                   'and screens of the driving page on the phone. The figures follow the style of '
                   'Wang et al. (2025): panels labeled (a), (b)... and a "Fig. N." caption below.'),
                 9, alinhar=WD_ALIGN_PARAGRAPH.JUSTIFY, depois=4, cor=CINZA)
        p = self.par(L('Código-fonte, exemplos e instaladores: ', 'Source code, examples and installers: '),
                     9, alinhar=WD_ALIGN_PARAGRAPH.LEFT, depois=14, cor=CINZA)
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
             L('Diagrama de contexto, em alto nível. No computador, o projetista monta o programa em '
               'blocos e tarefas; o NoCodeMCU gera o C++ e o arduino-cli embutido grava a placa pela USB. '
               'Na ESP32-S3 CAM, o "Sempre" repete o ciclo perceber, decidir, agir e informar; os sensores '
               'leem o trajeto e os motores o alteram, fechando o laço físico. Pela rede WiFi criada pela '
               'própria placa, o celular mostra o reticulado e o vídeo, e o operador pode assumir o '
               'controle. As cores são as das categorias de blocos da IDE.',
               'High-level context diagram. On the computer, the designer builds the program from blocks '
               'and tasks; NoCodeMCU generates the C++ code and the bundled arduino-cli uploads it to the '
               'board over USB. On the ESP32-S3 CAM, "Forever" repeats the perceive, decide, act and inform '
               'cycle; the sensors read the course and the motors change it, closing the physical loop. '
               'Through the WiFi network created by the board itself, the phone shows the lattice and the '
               'video, and the operator can take control. The colors are those of the IDE block categories.'))
    f.figura([[(os.path.join(PRINTS, 'ilustracao-preso.png'), LARGURA_UTIL, None)]],
             L('Cenário de travamento. Depois de três desvios sem achar caminho livre, o carro está diante '
               'da barreira com os dois sensores vendo obstáculo; ele para, acorda a câmera e passa o '
               'controle ao operador, que vê a barreira no celular, conectado à rede "carro4x4", dirige pelo '
               'analógico e devolve o carro à LPA2v com o botão Liberar.',
               'Stuck scenario. After three swerves without finding a free path, the car faces the barrier '
               'with both sensors detecting an obstacle; it stops, wakes the camera and hands control to the '
               'operator, who sees the barrier on the phone connected to the "car4x4" network, drives with '
               'the joystick and returns the car to PAL2v with the Release button.'))
    f.quebra()

    f.figura([
        [(foto('10.54.27'), 8.5, L('Vista superior', 'Top view')), (foto('10.54.27 (1)'), 8.5, L('Vista lateral', 'Side view'))],
        [(foto('10.54.27 (2)'), 8.5, L('Perspectiva', 'Perspective')),
         (os.path.join(PRINTS_PT, 'foto-frontal.jpg'), 8.5, L('Vista frontal', 'Front view'))]
    ], L('Protótipo do carro 4x4: ESP32-S3 CAM (ESP32-S3-WROOM-1 N16R8) sobre a protoboard, ponte H '
         'L298N com os dois motores de cada lado em paralelo e dois sensores ultrassônicos HC-SR04 na '
         'frente, com divisor resistivo no pino de eco. (a) Vista superior. (b) Vista lateral. '
         '(c) Perspectiva. (d) Vista frontal.',
         'Prototype of the 4x4 car: ESP32-S3 CAM (ESP32-S3-WROOM-1 N16R8) on the breadboard, L298N '
         'H-bridge with the two motors on each side in parallel, and two HC-SR04 ultrasonic sensors at '
         'the front, with a resistive divider on the echo pin. (a) Top view. (b) Side view. '
         '(c) Perspective. (d) Front view.'))
    f.quebra()

    f.figura([
        [(os.path.join(PRINTS, 'fig-ide-numerada.png'), LARGURA_UTIL, L('Visão geral', 'Overview'))],
        [(os.path.join(PRINTS, 'fig-categoria-tarefas.png'), 9.0, L('Categoria Tarefas', 'Tasks category'))]
    ], L('Interface do NoCodeMCU no Modo Abstrato, tema claro, com o exemplo 16 aberto. (a) Visão '
         'geral: (1) caixa de ferramentas organizada por categorias; (2) área de montagem, com o bloco '
         '"Sempre" e as tarefas; (3) código C++ gerado em tempo real, aqui nas funções que as tarefas '
         'produzem; (4) escolha da placa e da porta, compilação e gravação pela USB; (5) abas do '
         'monitor serial, do plotter, do reticulado da LPA2v e da saída do compilador. (b) A categoria '
         'Tarefas aberta, com os blocos "tarefa" (define) e "fazer a tarefa" (chama).',
         'NoCodeMCU interface in Abstract Mode, light theme, language set to English (Options → '
         'Language), with example 16 open. (a) Overview: (1) toolbox organized by categories; '
         '(2) workspace, with the "Forever" block and the tasks; (3) C++ code generated in real time, '
         'here at the functions produced by the tasks; (4) board and port selection, compilation and '
         'upload over USB; (5) tabs for the serial monitor, the plotter, the PAL2v lattice and the '
         'compiler output. (b) The Tasks category open, with the "task" (define) and "do the task" '
         '(call) blocks.'))
    f.quebra()

    e = 0.019
    f.figura([[
        (bloco('ao-iniciar'), largura(bloco('ao-iniciar'), e), L('Ao iniciar', 'On start')),
        (bloco('sempre'), largura(bloco('sempre'), e), L('Sempre', 'Forever'))
    ]], L('Estrutura principal do programa. (a) "Ao iniciar": pinos da ponte H, parâmetros guardados '
          'em caixas (universo de discurso, limites e velocidades) e a chamada da tarefa de rede. '
          '(b) "Sempre": o ciclo de controle reduzido a uma linha por etapa; o bloco se/senão decide se '
          'quem dirige é o operador ou a LPA2v.',
          'Main program structure. (a) "On start": H-bridge pins, parameters stored in boxes (universe '
          'of discourse, limits and speeds) and the call to the network task. (b) "Forever": the control '
          'cycle reduced to one line per step; the if/else block decides whether the operator or PAL2v '
          'is driving.'))
    f.quebra()

    f.figura([
        [(bloco('tarefa-ligar-a-rede-e-a-camera'), largura(bloco('tarefa-ligar-a-rede-e-a-camera'), e),
          L('ligar a rede e a câmera', 'start the network and camera'))],
        [(bloco('tarefa-medir-as-distancias'), largura(bloco('tarefa-medir-as-distancias'), e),
          L('medir as distâncias', 'measure the distances'))],
        [(bloco('tarefa-calcular-as-evidencias'), largura(bloco('tarefa-calcular-as-evidencias'), e),
          L('calcular as evidências', 'compute the evidence'))]
    ], L('Tarefas de comunicação e percepção. (a) A placa cria a própria rede WiFi, abre o servidor da '
         'página e liga a câmera. (b) Leitura dos dois sensores ultrassônicos, com intervalo entre os '
         'disparos para evitar eco cruzado, e publicação das distâncias na página. (c) Conversão das '
         'distâncias em graus de evidência entre o universo de discurso UD_LONGE e UD_PERTO, e envio do '
         'ponto (μ, λ) ao reticulado desenhado no celular.',
         'Communication and perception tasks. (a) The board creates its own WiFi network, opens the page '
         'server and turns on the camera. (b) Reading of the two ultrasonic sensors, with an interval '
         'between triggers to avoid cross-echo, and publication of the distances on the page. '
         '(c) Conversion of the distances into evidence degrees over the universe of discourse from '
         'UD_FAR to UD_NEAR, and sending of the point (μ, λ) to the lattice drawn on the phone.'))
    f.quebra()

    f.figura([[(os.path.join(PRINTS, 'diag-lpa2v.png'), LARGURA_UTIL, None)]],
             L('Diagrama da função de que depende a navegação autônoma, a tarefa "dirigir pela LPA2v", '
               'seguida de "conferir se está preso". As distâncias viram graus de evidência; o '
               'Para-Analisador calcula o grau de certeza Gc e o de contradição Gct, localiza o estado '
               'lógico no reticulado (limites ±0,5) e executa a ação daquele estado. Ao fim de cada ciclo, '
               'três desvios sem caminho livre passam o controle ao operador.',
               'Diagram of the function on which autonomous navigation depends, the "drive by PAL2v" task, '
               'followed by "check if stuck". The distances become evidence degrees; the Para-Analyzer '
               'computes the certainty degree Gc and the contradiction degree Gct, locates the logical '
               'state on the lattice (limits ±0.5) and executes the action of that state. At the end of '
               'each cycle, three swerves without a free path hand control to the operator.'))
    f.quebra()

    lpa = bloco('tarefa-dirigir-pela-lpa2v')
    f.figura([[(lpa, largura(lpa, 0.0148), None)]],
             L('Tarefa "dirigir pela LPA2v": o bloco "analisar" compara as evidências dos dois sensores e '
               'desvia para a ação do estado lógico resultante no reticulado: V (os dois veem obstáculo) '
               'chama "desviar"; Qv→T faz meio giro; F (caminho livre) segue em frente e zera a contagem '
               'de desvios; T (contradição) avança devagar para as leituras desempatarem; ⊥ faz meia '
               'manobra e conta o desvio; os demais estados seguem devagar e medem de novo.',
               'The "drive by PAL2v" task: the "analyze" block compares the evidence from the two sensors '
               'and branches to the action of the resulting logical state on the lattice: V (true: both '
               'sensors see an obstacle) calls "swerve"; Qv→T makes a half turn; F (false: free path) goes '
               'forward and resets the swerve count; T (inconsistent) moves forward slowly so the readings '
               'can break the tie; ⊥ (indeterminate) makes a half maneuver and counts the swerve; the '
               'other states move slowly and measure again.'))
    f.quebra()

    e = 0.017
    f.figura([
        [(bloco('tarefa-conferir-se-esta-preso'), largura(bloco('tarefa-conferir-se-esta-preso'), e),
          L('conferir se está preso', 'check if stuck'))],
        [(bloco('tarefa-desviar'), largura(bloco('tarefa-desviar'), e), L('desviar', 'swerve')),
         (bloco('tarefa-arrancar-devagar'), largura(bloco('tarefa-arrancar-devagar'), e),
          L('arrancar devagar', 'start slowly'))]
    ], L('Tarefas de manobra. (a) O seguro contra a indecisão (ciclos demais sem cair em V nem F força um '
         'desvio) e a declaração de travamento: depois de LIMITE_PRESO desvios sem caminho livre, o carro '
         'para e a câmera abre no celular para o operador. (b) Desvio contado: para, dá ré e gira por '
         'TEMPO_GIRO. (c) Partida com impulso de VEL_ARRANQUE antes da velocidade de cruzeiro. Uma tarefa '
         'escrita uma vez é chamada de vários pontos: "desviar" é usada no estado V e no seguro.',
         'Maneuver tasks. (a) The safeguard against indecision (too many cycles without reaching V or F '
         'forces a swerve) and the stuck declaration: after STUCK_LIMIT swerves without a free path, the '
         'car stops and the camera opens on the phone for the operator. (b) Counted swerve: stop, reverse '
         'and turn for TURN_TIME. (c) Start with a START_SPEED impulse before the cruising speed. A task '
         'written once is called from several places: "swerve" is used in state V and in the safeguard.'))
    f.quebra()

    op = bloco('tarefa-dirigir-pelo-operador')
    f.figura([[(op, largura(op, 0.0165), None)]],
             L('Tarefa "dirigir pelo operador": cada botão de direção da página vale enquanto o dedo está '
               'nele; sem toque, o carro para. O botão "liberar" zera os contadores, esconde a câmera e '
               'devolve o controle à LPA2v.',
               'The "drive by operator" task: each direction button on the page holds while the finger is on '
               'it; with no touch, the car stops. The "release" button resets the counters, hides the camera '
               'and returns control to PAL2v.'))
    f.quebra()

    e = 0.019
    f.figura([
        [(bloco('tarefa-ver-se-o-operador-assumiu'), largura(bloco('tarefa-ver-se-o-operador-assumiu'), e),
          L('ver se o operador assumiu', 'check if operator took over'))],
        [(bloco('tarefa-mostrar-o-estado-na-pagina'), largura(bloco('tarefa-mostrar-o-estado-na-pagina'), e),
          L('mostrar o estado na página', 'show the status on the page'))]
    ], L('Tarefas da página de pilotagem. (a) O botão "assumir" passa o controle ao operador a qualquer '
         'momento e mostra o vídeo com o aviso. (b) Contadores publicados na página a cada ciclo.',
         'Driving page tasks. (a) The "take over" button hands control to the operator at any time and '
         'shows the video with the notice. (b) Counters published on the page every cycle.'))

    f.quebra()
    cel = 7.0
    f.figura([
        [(os.path.join(PRINTS, 'cel-lpa2v-qf.png'), cel, L('LPA2v, Qf→⊥', 'PAL2v, Qf→⊥')),
         (os.path.join(PRINTS, 'cel-lpa2v-t.png'), cel, L('LPA2v, T', 'PAL2v, T'))],
        [(os.path.join(PRINTS, 'cel-operador-manual.png'), cel, L('Operador, manual', 'Operator, manual')),
         (os.path.join(PRINTS, 'cel-operador-preso.png'), cel, L('Operador, preso', 'Operator, stuck'))]
    ], L('Página de pilotagem servida pela própria placa (http://192.168.4.1) no navegador do celular. '
          '(a) Modo LPA2v, estado quase falso tendendo ao indeterminado, com o rastro das últimas leituras '
          'no reticulado. (b) Modo LPA2v, estado T (inconsistente): os sensores discordam. (c) O operador '
          'assumiu pelo botão: vídeo da câmera com o aviso e o reticulado no canto. (d) Depois de três '
          'desvios sem caminho livre o carro se declarou preso e passou o controle ao operador.',
          'Driving page served by the board itself (http://192.168.4.1) in the phone browser. The '
          'lattice with its trail, the camera image and the readings come from the test run; the '
          'interface texts are those of the page generated from the English example. (a) PAL2v mode, '
          'quasi-false state tending to indeterminate, with the trail of the latest readings on the '
          'lattice. (b) PAL2v mode, state T (inconsistent): the sensors disagree. (c) The operator took '
          'over with the button: camera video with the notice and the lattice in the corner. (d) After '
          'three swerves without a free path the car declared itself stuck and handed control to the '
          'operator.'))

    f.par(L('Referência', 'Reference'), 9, negrito=True, antes=10, depois=2)
    f.par('WANG, P.; WANG, Z.; DUAN, J.; MIAO, Y.; TIAN, W. Review of the development status of '
          'low-code programming software for robots. Digital Engineering, v. 4, 100039, 2025. '
          'DOI: 10.1016/j.dte.2025.100039.', 8, alinhar=WD_ALIGN_PARAGRAPH.JUSTIFY)
    p = f.par(L('NoCodeMCU, repositório público: ', 'NoCodeMCU, public repository: '), 8,
              alinhar=WD_ALIGN_PARAGRAPH.LEFT, antes=4)
    f.link(p, REPOSITORIO, 8)
    f.salvar()
    print('figuras: ' + str(f.n) + '  ->  ' + os.path.relpath(SAIDA, RAIZ))


if __name__ == '__main__':
    preparar()
    montar()
