#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/artigo-qualidade-esteira.docx — o artigo sobre controle de qualidade
dimensional em esteira com a LPA2v programada em No-Code.

    python3 tools/gerar_artigo_qualidade.py

A classe Artigo vem de gerar_artigo_emmy2.py: é o mesmo molde da dissertação
(Arial 12, justificado, entrelinha 1,5, margens de 2,5 cm, títulos em caixa alta
no corpo do texto) e a mesma conferência de citações órfãs ao final. Importar em
vez de copiar é o que garante que os dois artigos abram iguais.

Como no outro, o texto é escrito aqui, no fonte: correção feita no Word se perde
na próxima geração.

Os números da Tabela de validação não foram digitados à mão. Saíram do
calculador da LPA2v, e a função conferir_lpa2v() os recalcula a cada geração —
se alguma linha da tabela divergir da fórmula, o script reclama e não salva.
"""
import math
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))

from gerar_artigo_emmy2 import Artigo, CENTRO, IMG            # noqa: E402

IMG_ESTEIRA = os.path.join(RAIZ, 'docs', 'img_fisico_esteira')
SAIDA = os.path.join(RAIZ, 'docs', 'artigo-qualidade-esteira.docx')

# ---------------------------------------------------------------------- #
# Os números da bancada, num lugar só — os mesmos do exemplo 14           #
# ---------------------------------------------------------------------- #
LONA = 10.00        # distância dos sensores à lona da esteira, em cm
FAIXA = (1.00, 1.50)                # a peça boa, em cm
UD_MIN = (9.15, 8.95)               # rampa do limite inferior, em distância
UD_MAX = (8.35, 8.55)               # rampa do limite superior, em distância
LIM_PECA = 9.50                     # portão de presença
C1, C2, C3, C4 = 0.5, -0.5, 0.5, -0.5


def evidencia(x, a1, a2):
    """Valoração linear no Universo de Discurso [a1, a2], saturando nas pontas.

    É a mesma conta do lpaEvidencia() gerado pelo NoCodeMCU, inclusive para
    a2 < a1, caso em que a valoração já sai invertida.
    """
    t = (x - a1) / (a2 - a1)
    return 0.0 if t < 0 else (1.0 if t > 1 else t)


def evid_faixa(d):
    """O Grau de Evidência de um sensor para a proposição-faixa: as duas rampas
    unidas pelo AND da LPA2v, que é a minimização."""
    return min(evidencia(d, *UD_MIN), evidencia(d, *UD_MAX))


def analisar(d1, d2):
    """A análise completa de uma peça, a partir das duas distâncias lidas.

    Devolve um dicionário com a anotação, os graus, o estado que o
    Para-Analisador apontaria sozinho e a decisão que o programa toma. São
    coisas diferentes de propósito: o reticulado diagnostica, o Grau de Certeza
    Real decide, e é a distância entre as duas respostas que este artigo trata.

    As fórmulas são as do lpaGcr() que o NoCodeMCU gera em C++, guarda de
    indefinição inclusive — o documento e a placa não podem discordar.
    """
    mu = evid_faixa(d1)
    lam = 1.0 - evid_faixa(d2)
    gc = mu - lam
    gct = mu + lam - 1.0
    phi = 1.0 - abs(gct)

    d = math.sqrt((1.0 - abs(gc)) ** 2 + gct ** 2)
    phi_e = 1.0 - abs(2.0 * ((mu + lam) / 2.0) - 1.0)
    indefinido = phi_e <= 0.25 or d > 1.0
    if indefinido or gc == 0:
        gcr = 0.0
    else:
        gcr = 1.0 - d if gc > 0 else d - 1.0

    # O estado que o Para-Analisador apontaria, na ordem original do algoritmo:
    # os extremos primeiro, e o Grau de Certeza antes do Grau de Contradição.
    if gc >= C1:
        estado = 'V'
    elif gc <= C2:
        estado = 'F'
    elif gct >= C3:
        estado = 'T'
    elif gct <= C4:
        estado = '⊥'
    elif gc >= 0 and gct >= 0:
        estado = 'Qv→T' if gc >= gct else 'T→v'
    elif gc >= 0 and gct <= 0:
        estado = 'Qv→⊥' if gc >= abs(gct) else '⊥→v'
    elif gc <= 0 and gct <= 0:
        estado = 'Qf→⊥' if abs(gc) >= abs(gct) else '⊥→f'
    else:
        estado = 'Qf→T' if abs(gc) >= gct else 'T→f'

    if gcr >= C1:
        decisao, luz = 'aprova', 'verde'
    elif gcr <= C2:
        decisao, luz = 'rejeita', 'vermelha'
    else:
        decisao, luz = 'remede', 'amarela'

    return {'mu': mu, 'lam': lam, 'Gc': gc, 'Gct': gct, 'phi': phi, 'D': d,
            'Gcr': gcr, 'indefinido': indefinido, 'estado': estado,
            'decisao': decisao, 'luz': luz}


def n(v, casas=2):
    """Número no padrão brasileiro, com vírgula decimal e sem sinal."""
    return ('%.*f' % (casas, v)).replace('.', ',')


def ns(v, casas=2):
    """O mesmo, com sinal explícito — só para Gc e Gct, que vão de −1 a +1.

    O zero sai sem sinal: quando as duas fontes concordam, Gct é zero a menos do
    resíduo da aritmética de ponto flutuante, e imprimir "−0,00" sugeriria uma
    contradição negativa que não existe.
    """
    if abs(v) < 5 * 10 ** -(casas + 1):
        return ('%.*f' % (casas, 0)).replace('.', ',')
    return ('%+.*f' % (casas, v)).replace('.', ',').replace('-', '\u2212')


# Os casos da validação: (descrição, altura vista pelo sensor 1, pelo sensor 2)
CASOS = [
    ('Peça de 1,25 cm, os dois sensores de acordo', 1.25, 1.25),
    ('Peça de 1,05 cm, dentro da faixa', 1.05, 1.05),
    ('Peça de 1,45 cm, dentro da faixa', 1.45, 1.45),
    ('Peça de 1,00 cm, sobre o valor de controle', 1.00, 1.00),
    ('Peça de 1,50 cm, sobre o valor de controle', 1.50, 1.50),
    ('Peça de 0,95 cm, logo abaixo do limite', 0.95, 0.95),
    ('Peça de 1,55 cm, logo acima do limite', 1.55, 1.55),
    ('Peça de 0,80 cm, curta demais', 0.80, 0.80),
    ('Peça de 1,70 cm, comprida demais', 1.70, 1.70),
    ('Sensor 1 vê 1,25 cm e sensor 2 vê 0,97 cm', 1.25, 0.97),
    ('Sensor 1 vê 1,25 cm e sensor 2 vê 0,95 cm', 1.25, 0.95),
    ('Sensor 1 vê 0,95 cm e sensor 2 vê 1,25 cm', 0.95, 1.25),
    ('Sensor 1 vê 1,25 cm e sensor 2 vê 0,90 cm', 1.25, 0.90),
]


def linhas_validacao():
    linhas = []
    for desc, h1, h2 in CASOS:
        a = analisar(LONA - h1, LONA - h2)
        linhas.append([desc, n(a['mu']), n(a['lam']), ns(a['Gc']), ns(a['Gct']),
                       ns(a['Gcr'], 3), a['estado'], a['decisao']])
    return linhas


def conferir_lpa2v():
    """Confere as identidades da LPA2v em cada linha da tabela, antes de salvar.

    Verifica a transformação inversa (μ e λ têm de voltar aos originais) e o
    invariante |Gc| + |Gct| ≤ 1, que é o losango do reticulado: um par fora
    dele não vem de nenhuma anotação possível.
    """
    erros = []
    for desc, h1, h2 in CASOS:
        a = analisar(LONA - h1, LONA - h2)
        mu, lam, gc, gct = a['mu'], a['lam'], a['Gc'], a['Gct']
        if abs((gc + gct + 1) / 2 - mu) > 1e-9 or abs((-gc + gct + 1) / 2 - lam) > 1e-9:
            erros.append('transformação inversa não fecha em: ' + desc)
        if abs(gc) + abs(gct) > 1 + 1e-9:
            erros.append('|Gc| + |Gct| > 1 em: ' + desc)
        if abs(a['Gcr']) > abs(gc) + 1e-9:
            erros.append('Gcr maior que Gc (a contradição não pode aumentar a '
                         'certeza) em: ' + desc)
    return erros


# ====================================================================== #
# A FIGURA DA MODELAGEM EM FAIXA                                         #
# ====================================================================== #

def desenhar_faixa(destino, largura_px=1000):
    """As duas rampas e a evidência resultante, ao longo da altura da peça.

    Desenhada aqui, e não à mão, porque os quatro números das rampas são os
    mesmos do programa: mudar a calibração muda a figura junto.

    `largura_px` só muda o tamanho do arquivo final — o desenho já é feito
    grande e reduzido no fim, então pedir mais pixels não reamostra nada para
    cima. Serve para o artigo do ENPG, que exige 300 dpi no tamanho impresso e
    não aceitaria os 1000 px que bastam para o documento longo.
    """
    from PIL import Image, ImageDraw, ImageFont

    W, H, M, E = 1000, 560, 90, 3
    PRETO, CINZA, CLARO = (24, 30, 40), (120, 132, 148), (206, 214, 224)
    AZUL, VERDE, AMBAR, VERM = (31, 111, 235), (26, 127, 55), (154, 103, 0), (176, 32, 42)

    def fonte(t, b=False):
        for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf',
                  '/usr/share/fonts/truetype/liberation/LiberationSans%s.ttf'):
            try:
                return ImageFont.truetype(p % ('-Bold' if b else ''), t)
            except OSError:
                continue
        return ImageFont.load_default()

    img = Image.new('RGB', (W * E, H * E), (255, 255, 255))
    d = ImageDraw.Draw(img)
    f10, f11b = fonte(10 * E), fonte(11 * E, True)

    x0, x1 = 0.70, 1.80          # eixo das alturas, em cm
    px = lambda h: int((M + (h - x0) / (x1 - x0) * (W - 2 * M)) * E)
    py = lambda v: int((H - M - v * (H - 2 * M)) * E)

    # faixas de fundo: o que cada região da altura produz
    for a, b, cor in ((x0, 0.85, (252, 235, 236)), (0.85, 1.00, (255, 247, 229)),
                      (1.00, 1.50, (233, 246, 236)), (1.50, 1.65, (255, 247, 229)),
                      (1.65, x1, (252, 235, 236))):
        d.rectangle([px(a), py(1.06), px(b), py(-0.02)], fill=cor)

    d.line([px(x0), py(0), px(x1), py(0)], fill=PRETO, width=E)
    d.line([px(x0), py(0), px(x0), py(1.06)], fill=PRETO, width=E)

    for v in (0.0, 0.25, 0.5, 0.75, 1.0):
        d.line([px(x0), py(v), px(x1), py(v)], fill=CLARO, width=E)
        d.text((px(x0) - 42 * E, py(v) - 7 * E), n(v).replace(',00', ',0'), font=f10, fill=CINZA)
    for h in (0.80, 1.00, 1.25, 1.50, 1.70):
        d.line([px(h), py(0), px(h), py(-0.02)], fill=CINZA, width=E)
        d.text((px(h) - 16 * E, py(-0.10)), n(h), font=f10, fill=CINZA)

    def curva(fn, cor, larg):
        pts = []
        p = x0
        while p <= x1 + 1e-9:
            pts.append((px(p), py(fn(LONA - p))))
            p += 0.005
        d.line(pts, fill=cor, width=larg * E, joint='curve')

    curva(lambda dd: evidencia(dd, *UD_MIN), CLARO, 2)
    curva(lambda dd: evidencia(dd, *UD_MAX), CLARO, 2)
    curva(evid_faixa, AZUL, 3)

    d.line([px(x0), py(0.75), px(x1), py(0.75)], fill=AMBAR, width=E)
    d.text((px(1.62), py(0.79)), 'μ = 0,75  →  Gc = 0,5', font=f10, fill=AMBAR)

    d.text((px(0.72), py(1.14)), 'Grau de Evidência μ', font=f11b, fill=PRETO)
    d.text((px(1.46), py(-0.20)), 'altura da peça (cm)', font=f11b, fill=PRETO)
    d.text((px(1.12), py(0.40)), 'aprova', font=f11b, fill=VERDE)
    d.text((px(0.865), py(0.20)), 'remede', font=f10, fill=AMBAR)
    d.text((px(1.515), py(0.20)), 'remede', font=f10, fill=AMBAR)
    d.text((px(0.72), py(0.20)), 'rejeita', font=f10, fill=VERM)
    d.text((px(1.68), py(0.20)), 'rejeita', font=f10, fill=VERM)

    alvo = (largura_px, round(H * largura_px / W))
    img.resize(alvo, Image.LANCZOS).save(destino)
    return destino


def preparar_foto():
    """Reescreve a foto da bancada em JPEG limpo, sem EXIF.

    O python-docx lê o cabeçalho da imagem por conta própria e para no EXIF que
    a câmera do celular grava: o arquivo original abre em qualquer visualizador
    e quebra na hora de entrar no documento. Reescrever também aplica a rotação
    que estava só no EXIF e reduz a imagem, que entra com menos de dez
    centímetros de largura e não precisa de quatro mil pixels.
    """
    from PIL import Image, ImageOps

    origem = os.path.join(IMG_ESTEIRA, 'IMG_20260831_175010.jpg')
    destino = os.path.join(IMG_ESTEIRA, 'bancada-esteira.jpg')
    if not os.path.exists(origem):
        return None
    img = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
    img.thumbnail((1400, 1400), Image.LANCZOS)
    img.save(destino, 'JPEG', quality=88)
    return destino


# ====================================================================== #
# REFERÊNCIAS                                                            #
# ====================================================================== #

REFERENCIAS = [
    'CORRÊA, Márcio Pereira; MACHADO, Ayslan Cuzzuol; DA SILVA FILHO, João Inácio; '
    'GARCIA, Dorotéa Vilanova; MARIO, Mauricio Conceição; SEDANO, Carlos Teofilo '
    'Salinas. Paraconsistent annotated logic applied to industry assets condition '
    'monitoring and failure prevention based on vibration signatures. Research, '
    'Society and Development, v. 11, n. 1, e14211125104, 2022. '
    'DOI: 10.33448/rsd-v11i1.25104.',

    'DA COSTA, Newton C. A. On the theory of inconsistent formal systems. Notre Dame '
    'Journal of Formal Logic, v. 15, n. 4, p. 497-510, out. 1974. '
    'DOI: 10.1305/ndjfl/1093891487.',

    'DA SILVA FILHO, João Inácio. Métodos de aplicações da Lógica Paraconsistente '
    'Anotada de anotação com dois valores – LPA2v. Seleção Documental, Santos: '
    'Ed. Paralogike, ano 1, n. 1, p. 18-25, jan./mar. 2006. ISSN 1809-0648.',

    'DA SILVA FILHO, João Inácio. Algoritmo Paraconsistente Extrator de efeitos da '
    'Contradição – ParaExtrctr. Seleção Documental, Santos: Ed. Paralogike, ano 4, '
    'n. 15, p. 21-25, jul./set. 2009. ISSN 1809-0648.',

    'DA SILVA FILHO, João Inácio; ABE, Jair Minoro; MARREIRO, Alessandro de Lima; '
    'MARTINEZ, Angel Antonio Gonzalez; TORRES, Cláudio Rodrigo; ROCCO, Alexandre; '
    'CÔRTES, Hyghor Miranda; MARIO, Mauricio Conceição; PACHECO, Marcos Tadeu '
    'Tavares; GARCIA, Dorotéa Vilanova; BLOS, Maurício Fontoura. Paraconsistent '
    'annotated logic algorithms applied in management and control of communication '
    'network routes. Sensors, v. 21, n. 12, art. 4219, 2021. DOI: 10.3390/s21124219.',

    'DA SILVA FILHO, João Inácio; LAMBERT-TORRES, Germano; ABE, Jair Minoro. '
    'Inteligência artificial com as redes de análises paraconsistentes: teoria e '
    'aplicações. Rio de Janeiro: LTC, 2009. 339 p.',

    'DA SILVA FILHO, João Inácio; TORRES, Cláudio Rodrigo; ABE, Jair Minoro. Robô '
    'móvel autônomo Emmy: uma aplicação eficiente da Lógica Paraconsistente Anotada. '
    'Seleção Documental, Santos: Ed. Paralogike, n. 3, p. 19-26, jul./set. 2006. '
    'ISSN 1809-0648.',

    'DE CARVALHO JUNIOR, Arnaldo; CRUZ, Diego Oliveira da; ALVES, Bruno da Silva; '
    'PAULO JUNIOR, Fernando da Silva; DA SILVA FILHO, João Inácio. '
    'Paraconsistent-Lib: an intuitive PAL2v algorithm Python library. arXiv, '
    'preprint arXiv:2511.20700, nov. 2025. DOI: 10.48550/arXiv.2511.20700.',

    'DE CARVALHO JUNIOR, Arnaldo; JUSTO, João Francisco; DE OLIVEIRA, Alexandre '
    'Maniçoba; DA SILVA FILHO, João Inácio. A comprehensive review on paraconsistent '
    'annotated evidential logic: algorithms, applications, and perspectives. '
    'Engineering Applications of Artificial Intelligence, v. 127, art. 107342, 2024. '
    'DOI: 10.1016/j.engappai.2023.107342.',

    'FRASER, Neil. Ten things we’ve learned from Blockly. In: IEEE BLOCKS AND BEYOND '
    'WORKSHOP, 2015, Atlanta. Proceedings [...]. Piscataway: IEEE, 2015. p. 49-50. '
    'DOI: 10.1109/BLOCKS.2015.7369000.',

    'MAŚLANKA, Maksymilian; JANCARCZYK, Daniel; RYSIŃSKI, Jacek. Integration of '
    'machine vision and PLC-based control for scalable quality inspection in '
    'Industry 4.0. Sensors, v. 25, n. 20, art. 6383, 2025. DOI: 10.3390/s25206383.',

    'MATOS, Sérgio Luiz da Conceição; LORENZO, Roberto Blanco. Rede de análise '
    'paraconsistente com compensador de tempo morto aplicado em sintonia de '
    'controladores para um processo industrial. Revista Científica SENAI-SP: '
    'Educação, Tecnologia e Inovação, v. 1, n. 1, p. 107-127, 2023.',

    'MIGHOUAR, Zakaria; MELLOUI, Jihane; MANSOURI, Khalifa; ECH-CHHIBAT, Moulay El '
    'Houssine; ZAHIRI, Laidi. A systematic review of deep learning based machine '
    'vision for quality control in Industry 4.0. Discover Mechanical Engineering, '
    'v. 5, n. 1, art. 141, 2026. DOI: 10.1007/s44245-026-00320-w.',

    'SUBRAHMANIAN, V. S. On the semantics of quantitative logic programs. In: IEEE '
    'SYMPOSIUM ON LOGIC PROGRAMMING, 4., 1987, San Francisco. Proceedings [...]. '
    'Washington, DC: IEEE Computer Society Press, 1987. p. 173-182.',

    'SUFI, Fahim. Algorithms in low-code-no-code for research applications: a '
    'practical review. Algorithms, v. 16, n. 2, art. 108, 2023. '
    'DOI: 10.3390/a16020108.',
]


# ====================================================================== #
# O TEXTO                                                                #
# ====================================================================== #

def montar(a):
    # ---------------- abertura ----------------
    a.p('CONTROLE DE QUALIDADE DIMENSIONAL EM ESTEIRA TRANSPORTADORA COM LÓGICA '
        'PARACONSISTENTE ANOTADA DE ANOTAÇÃO COM DOIS VALORES PROGRAMADA EM NO-CODE',
        recuo=False, alinhar=CENTRO, negrito=True, espaco_depois=18)
    a.p('[Nome completo do autor]', recuo=False, alinhar=CENTRO, tam=11,
        espaco_depois=2)
    a.p('Universidade Santa Cecília — Programa de Pós-Graduação em Engenharia Mecânica',
        recuo=False, alinhar=CENTRO, tam=11, espaco_depois=18)

    a.subtitulo('RESUMO')
    a.p('A inspeção dimensional automatizada decide, em geral, por comparação com um '
        'limiar, e quando dois sensores discordam a respeito da mesma peça a '
        'divergência é resolvida por média, por voto ou pelo descarte de uma das '
        'leituras, sem que a discordância chegue a ser registrada. Este trabalho '
        'apresenta uma bancada de controle de qualidade em esteira transportadora na '
        'qual a decisão é tomada pela Lógica Paraconsistente Anotada de anotação com '
        'dois valores, programada sem escrever código no software NoCodeMCU. A '
        'proposição analisada é "a peça mede entre 1,0 e 1,5 cm"; dois sensores de '
        'ultrassom montados sobre a esteira medem a mesma peça parada e fornecem os '
        'dois graus de evidência; e o resultado da análise aciona três lâmpadas e um '
        'motor de corrente contínua por ponte H. A peça dentro do padrão segue, a peça '
        'fora do padrão retorna pela entrada, e os estados de contradição e de '
        'indeterminação devolvem a peça para uma nova medição em marcha lenta, em vez '
        'de forçar uma decisão que a evidência não sustenta. Por ser a proposição uma '
        'faixa, e não um limiar, o grau de evidência de cada sensor é obtido pela '
        'minimização de duas valorações opostas, que é o conectivo AND da própria '
        'lógica. A validação numérica da modelagem revelou que a ordem de avaliação do '
        'algoritmo Para-Analisador, que testa o Grau de Certeza antes do Grau de '
        'Contradição, aprova peças com os sensores em contradição máxima, e o programa '
        'inverte essa precedência de forma explícita. O C++ gerado pelos blocos foi '
        'compilado sem ajuste manual e a conversão entre os modos de programação foi '
        'verificada caractere a caractere.', espaco_depois=6)
    a.p('Palavras-chave: lógica paraconsistente anotada; LPA2v; controle de qualidade; '
        'inspeção dimensional; programação No-Code.', espaco_depois=12)

    a.subtitulo('ABSTRACT')
    a.p('Automated dimensional inspection usually decides by comparison against a '
        'threshold, and when two sensors disagree about the same part the divergence is '
        'settled by averaging, by voting or by discarding one of the readings, without '
        'the disagreement ever being recorded. This work presents a conveyor belt '
        'quality control workbench in which the decision is taken by Paraconsistent '
        'Annotated Logic with annotation of two values, programmed without writing code '
        'in the NoCodeMCU software. The analysed proposition is "the part measures '
        'between 1.0 and 1.5 cm"; two ultrasonic sensors mounted above the belt measure '
        'the same stopped part and provide the two degrees of evidence; and the outcome '
        'of the analysis drives three lamps and a direct current motor through an '
        'H-bridge. A part within specification moves on, a part out of specification is '
        'returned through the entrance, and the contradictory and undetermined states '
        'send the part back for a new measurement at low speed, instead of forcing a '
        'decision the evidence does not support. Since the proposition is a band rather '
        'than a threshold, each sensor degree of evidence is obtained by minimising two '
        'opposite valuations, which is the AND connective of the logic itself. Numerical '
        'validation of the model revealed that the evaluation order of the Para-Analyzer '
        'algorithm, which tests the Degree of Certainty before the Degree of '
        'Contradiction, approves parts while the sensors are in maximum contradiction, '
        'and the program explicitly reverses that precedence. The C++ generated from the '
        'blocks compiled without manual adjustment and the conversion between the '
        'programming modes was verified character by character.', espaco_depois=6)
    a.p('Keywords: paraconsistent annotated logic; PAL2v; quality control; dimensional '
        'inspection; No-Code programming.', espaco_depois=12)

    # ---------------- introdução ----------------
    a.titulo('Introdução')
    a.p('A inspeção automatizada de peças em linha de produção é hoje um problema '
        'tratado sobretudo por visão computacional. Mighouar et al. (2026), em revisão '
        'sistemática da aprendizagem profunda aplicada à visão de máquina para controle '
        'de qualidade na Indústria 4.0, e Maślanka, Jancarczyk e Rysiński (2025), ao '
        'integrarem um sistema de visão a um controlador lógico programável, descrevem '
        'um campo maduro quanto à detecção do defeito e quanto à sincronização com a '
        'linha. O que nenhum desses trabalhos trata é a situação em que duas fontes de '
        'medição, olhando para a mesma peça, discordam entre si: a arquitetura habitual '
        'resolve a divergência antes de decidir, por média, por voto majoritário ou pela '
        'confiança atribuída pelo modelo, e a discordância desaparece do registro no '
        'mesmo instante em que aparece.')
    a.p('Descartar a discordância tem um custo que não é apenas de informação. Numa '
        'inspeção dimensional, duas leituras que divergem podem significar peça na '
        'fronteira da tolerância, superfície irregular, sensor descalibrado ou peça '
        'trepidando sob o sensor — quatro diagnósticos distintos que a média reduz a um '
        'único número, indistinguível de uma medição tranquila que tivesse dado aquele '
        'mesmo valor. A decisão binária, além disso, obriga a escolher entre aprovar e '
        'rejeitar mesmo quando a evidência não sustenta nenhuma das duas coisas.')
    a.p('A Lógica Paraconsistente foi formulada justamente para admitir a contradição '
        'sem que o sistema se torne trivial (DA COSTA, 1974), e sua versão anotada com '
        'dois valores tem histórico de aplicação industrial: monitoramento de condição '
        'de ativos por assinaturas de vibração (CORRÊA et al., 2022), sintonia de '
        'controladores em cascata com compensação de tempo morto (MATOS; LORENZO, 2023) '
        'e gestão de rotas em redes de comunicação (DA SILVA FILHO et al., 2021). A '
        'revisão de De Carvalho Junior et al. (2024) reúne esse conjunto e observa que a '
        'baixa complexidade matemática e o consumo reduzido de recursos computacionais '
        'dos algoritmos da lógica os tornam adequados a sistemas especialistas e a '
        'computação de borda — o que inclui o microcontrolador de oito bits usado nesta '
        'bancada.')
    a.p('Não se localizou, porém, trabalho que aplique a LPA2v à inspeção dimensional '
        'de peças em esteira transportadora. Existe a literatura que sabe inspecionar e '
        'não trata contradição, e existe a literatura que trata contradição e não '
        'inspeciona: é entre as duas que este trabalho se coloca. A contribuição está em '
        'mostrar que a discordância entre dois sensores pode ser o próprio critério de '
        'decisão de um portão de qualidade, e não um ruído a eliminar antes dele.')
    a.p('O trabalho tem ainda uma segunda frente, herdada do ambiente em que o programa '
        'foi construído. A bancada é programada sem escrever código, no software '
        'NoCodeMCU, e a crítica corrente a esse tipo de ambiente é a de que a camada '
        'visual esconde o que deveria ser verificável (SUFI, 2023; FRASER, 2015). '
        'Abstrair o acionamento de um motor em um bloco não compromete o entendimento de '
        'quem monta a rotina, porque o efeito é imediatamente visível no equipamento; '
        'abstrair o critério que escolheu aquele acionamento é outra coisa. Aqui o '
        'critério permanece exposto: a anotação, o Universo de Discurso e os valores de '
        'controle do reticulado estão todos em blocos visíveis, e o monitor recebe, a '
        'cada peça, o par de distâncias, a anotação e o estado que decidiu.')

    # ---------------- inspeção ----------------
    a.titulo('Inspeção automatizada e o tratamento da discordância')
    a.p('Mighouar et al. (2026, tradução nossa) organizam a literatura recente de visão '
        'de máquina para controle de qualidade em torno das arquiteturas de detecção e '
        'segmentação e das técnicas de fusão de características em múltiplas escalas, '
        'que permitem inspecionar a imagem em várias resoluções ao mesmo tempo e '
        'detectar tanto defeitos grandes quanto defeitos que exigem alta resolução. A '
        'fusão descrita é de características extraídas da mesma imagem, e não de fontes '
        'independentes que possam discordar entre si; a saída do modelo é uma '
        'classificação acompanhada de uma medida de confiança, e é essa medida que '
        'arbitra os casos difíceis.')
    a.p('Maślanka, Jancarczyk e Rysiński (2025) tratam do lado que faltava, que é o '
        'acoplamento entre o sistema de visão e o controle da linha, com ênfase na '
        'sincronização em tempo real e na implantação industrial efetiva. O modelo de '
        'decisão, porém, permanece binário: a peça passa ou não passa, e o caso em que o '
        'sistema não tem elementos para decidir é tratado como exceção de engenharia, '
        'não como estado previsto.')
    a.p('A diferença que a LPA2v introduz não está na exatidão da medida, e sim no que '
        'o sistema faz quando as medidas discordam. Em vez de reduzir duas leituras a '
        'uma antes de decidir, a lógica conserva as duas e produz dois números '
        'independentes: um que mede o quanto as fontes concordam a favor da proposição e '
        'outro que mede o quanto elas se contradizem. O segundo número não existe na '
        'formulação binária, e é ele que permite distinguir a peça que está claramente '
        'fora do padrão da peça sobre a qual não se conseguiu medir direito.')

    # ---------------- LPA2v ----------------
    a.titulo('A LPA2v e suas aplicações industriais')
    a.p('A Lógica Paraconsistente admite a contradição sem trivializar o sistema, e sua '
        'formalização é dada por Da Costa (1974, p. 497, tradução nossa), para quem “um '
        'sistema formal (sistema dedutivo, teoria dedutiva, ...) S é dito inconsistente '
        'se existe uma fórmula A de S tal que A e sua negação, ¬A, são ambas teoremas '
        'desse sistema”, sendo trivial apenas o sistema em que todas as fórmulas são '
        'teoremas. Sobre essa base, Subrahmanian (1987) acrescentou as anotações à '
        'programação lógica, e Da Silva Filho formulou a anotação com dois valores e os '
        'algoritmos que a tornaram aplicável em controle (DA SILVA FILHO, 2006; DA SILVA '
        'FILHO; LAMBERT-TORRES; ABE, 2009).')
    a.p('Na LPA2v, duas fontes de leitura são normalizadas no intervalo fechado de zero '
        'a um e formam a anotação de uma proposição: o grau de evidência favorável μ e o '
        'grau de evidência desfavorável λ. Desses dois valores saem o Grau de Certeza e '
        'o Grau de Contradição, pela composição de transformações '
        'T(x, y) = (x − y, x + y − 1):')
    a.equacao('Gc  =  μ − λ')
    a.equacao('Gct =  μ + λ − 1')
    a.p('O par ordenado ετ = (Gc, Gct) é um ponto no reticulado, e sua posição no '
        'Quadrado Unitário do Plano Cartesiano indica o estado lógico da proposição '
        '(DA SILVA FILHO, 2006, p. 20-21). Nos quatro extremos ficam o Verdadeiro, o '
        'Falso, o Inconsistente e o Paracompleto; entre eles, as regiões não extremas '
        'descrevem as situações em que a evidência é insuficiente ou a contradição já '
        'começou a se formar, e é justamente essa faixa intermediária que a decisão '
        'binária não sabe nomear.', espaco_depois=6)
    a.figura('fluxo-duas-fontes.png',
             'tratamento de duas fontes pelo caminho binário e pelo caminho '
             'paraconsistente',
             fonte='Elaborado pelo autor (2026), com base em Da Silva Filho (2006)')
    a.figura('fig3-12-estados.png',
             'as doze regiões do reticulado da LPA2v e os valores de controle',
             fonte='Elaborado pelo autor (2026), com base em Da Silva Filho (2006)')
    a.p('Os dois graus não são independentes entre si. Como μ e λ pertencem ao '
        'intervalo de zero a um, o par (Gc, Gct) fica confinado ao losango definido por '
        '|Gc| + |Gct| ≤ 1, e daí sai o Intervalo de Certeza φ = 1 − |Gct|, que é o '
        'teto da certeza alcançável enquanto a contradição não diminuir. A consequência '
        'para um sistema de decisão é direta: com contradição alta, insistir na análise '
        'é insistir numa certeza que o reticulado não comporta, e o caminho é diminuir a '
        'contradição antes de decidir.')
    a.p('As aplicações industriais da lógica seguem esse desenho. Corrêa et al. (2022) '
        'aplicam a LPA2v ao monitoramento de condição de ativos a partir de assinaturas '
        'de vibração, com a metodologia construindo padrões e comparando-os para '
        'identificar falhas mecânicas. Matos e Lorenzo (2023) montam uma rede de Nós de '
        'Análise Paraconsistente integrada a um compensador de tempo morto em malha de '
        'controle em cascata, situação em que os desequilíbrios entre os controladores e '
        'o atraso de transporte produzem diferenças que, nas palavras dos autores, podem '
        'inviabilizar a qualidade do produto final. Da Silva Filho et al. (2021) levam '
        'os mesmos algoritmos à gestão de rotas em redes de comunicação. Em todos os '
        'casos, as duas fontes descrevem a mesma grandeza e a discordância entre elas é '
        'o dado de interesse — que é exatamente a hipótese de trabalho desta bancada.')
    a.p('O ferramental também vem se consolidando fora do hardware dedicado. De '
        'Carvalho Junior et al. (2025) publicam uma biblioteca aberta em Python que '
        'implementa o Para-Analisador, o ParaExtrctr, o filtro LPA2v e as redes '
        'paraconsistentes, isolados ou em rede, e a revisão de De Carvalho Junior et al. '
        '(2024) registra que o baixo custo computacional desses algoritmos os torna '
        'atraentes para sistemas embarcados. É o que sustenta a escolha feita aqui de '
        'executar a análise no próprio microcontrolador da bancada, e não em um '
        'computador acoplado a ele.')

    # ---------------- materiais e métodos ----------------
    a.titulo('Materiais e métodos')

    a.subtitulo('A bancada')
    a.p('A bancada é uma esteira transportadora de lona acionada por um único motor de '
        'corrente contínua com redução, comandado por uma ponte H cujas entradas de '
        'habilitação permanecem em cinco volts, de modo que a velocidade é controlada no '
        'próprio pino de sentido. O controle é um Arduino Uno montado sobre protoboard '
        'na lateral da esteira, o que mantém a montagem ao alcance de um laboratório de '
        'ensino. Sobre a lona, um suporte vertical graduado sustenta dois sensores de '
        'ultrassom HC-SR04 apontados para baixo, e as peças são blocos de madeira de '
        'seção retangular.', espaco_depois=6)
    a.figura('bancada-esteira.jpg',
             'a bancada montada, com os dois sensores de ultrassom sobre a lona e a '
             'peça de madeira posicionada na janela de medição',
             base=IMG_ESTEIRA, larg=3.6)
    a.p('Os dois sensores ocupam os pinos 2 e 3, para disparo e eco, e os pinos 4 e 8; '
        'a ponte H recebe os pinos 5 e 6, ambos com saída modulada por largura de pulso; '
        'e as três lâmpadas de sinalização ocupam os pinos 11, 12 e 13, respectivamente '
        'verde, amarela e vermelha. A lona fica a dez centímetros dos sensores, medida '
        'que é a referência de todo o resto: a altura da peça é a diferença entre essa '
        'distância e a leitura do sensor.')
    a.p('A proximidade entre os dois sensores é deliberada, e é ela que torna a '
        'discordância informativa. Apontados para o mesmo trecho da mesma peça parada, '
        'uma diferença grande entre as duas leituras não pode ser atribuída à posição de '
        'medição: é assinatura de face irregular, de peça mal assentada ou de sensor '
        'descalibrado. Fosse cada sensor colocado em um ponto diferente da esteira, a '
        'diferença entre eles seria esperada, e o Grau de Contradição perderia '
        'significado.')

    a.subtitulo('A proposição e a modelagem em faixa')
    a.p('A proposição analisada é “a peça mede entre 1,0 e 1,5 cm”, e ela impõe uma '
        'dificuldade que as aplicações clássicas da LPA2v não enfrentam. Em “existe '
        'obstáculo à frente”, do robô Emmy, a evidência cresce monotonicamente conforme '
        'o obstáculo se aproxima, e uma única normalização linear no Universo de '
        'Discurso resolve o problema (DA SILVA FILHO; TORRES; ABE, 2006). Uma faixa não '
        'se comporta assim: a evidência precisa crescer até o limite inferior, '
        'permanecer no máximo dentro da faixa e voltar a cair depois do limite superior. '
        'Uma rampa crescente, sozinha, atribuiria evidência máxima a uma peça de três '
        'centímetros.')
    a.p('A solução adotada não recorre a nada externo à lógica. São duas valorações '
        'opostas sobre a mesma leitura — uma que responde por “a peça não é curta '
        'demais” e outra por “a peça não é comprida demais” — unidas pelo conectivo AND '
        'da LPA2v, que é a minimização entre graus de evidência (DA SILVA FILHO, 2006). '
        'A evidência do sensor é a menor das duas, de modo que basta um dos lados falhar '
        'para ela cair, que é precisamente o comportamento de uma tolerância bilateral.')
    a.p('As duas valorações trabalham em distância, e não em altura, porque distância é '
        'o que o sensor entrega. Com a lona a dez centímetros, a peça de 1,0 cm está a '
        '9,0 cm e a de 1,5 cm está a 8,5 cm. As rampas têm 0,2 cm de largura, e essa '
        'largura não é arbitrária: é ela que faz os dois limites nominais caírem '
        'exatamente sobre o Grau de Certeza igual a 0,5, que é o valor de controle em '
        'que o Para-Analisador reconhece o estado Verdadeiro. Uma peça de exatamente '
        '1,0 cm, medida por dois sensores concordantes, produz μ = 0,75 e λ = 0,25, '
        'logo Gc = +0,5, que é o próprio ponto de virada da decisão. A calibração, '
        'portanto, não coloca os limites nominais dentro da região do Verdadeiro: '
        'coloca-os sobre a fronteira dela, e é uma escolha, não um descuido. A peça '
        'que mede exatamente o limite fica sobre o corte — e nesta calibração o '
        'arredondamento da aritmética de ponto flutuante a põe logo abaixo dele, de '
        'modo que ela volta para nova medição —, enquanto qualquer peça claramente '
        'dentro da faixa é aprovada de imediato; '
        'com uma tolerância de 0,5 cm medida por um sensor de resolução 0,3 cm, gastar '
        'uma nova medição na fronteira é mais barato que decidir sobre ela.',
        espaco_depois=6)
    a.tabela('Universos de Discurso da bancada, em distância aos sensores',
             ['Valoração', 'a₁', 'a₂', 'Responde por', 'Altura correspondente'],
             [['Crescente', n(UD_MIN[0]) + ' cm', n(UD_MIN[1]) + ' cm',
               'a peça não é curta demais', '0,85 a 1,05 cm'],
              ['Crescente', n(UD_MAX[0]) + ' cm', n(UD_MAX[1]) + ' cm',
               'a peça não é comprida demais', '1,65 a 1,45 cm'],
              ['AND (mínimo)', '—', '—', 'a peça mede entre 1,0 e 1,5 cm', '—']])
    a.p('A figura a seguir mostra o resultado da composição ao longo da altura da peça. '
        'As duas rampas aparecem em traço claro e a evidência resultante em traço cheio; '
        'a linha horizontal marca o valor 0,75, que é onde a decisão muda quando os dois '
        'sensores concordam.', espaco_depois=6)
    a.figura('fig-faixa-qualidade.png',
             'o Grau de Evidência da proposição-faixa, obtido pela minimização de duas '
             'valorações opostas')
    a.p('A montagem tem uma consequência que precisa ser dita com clareza. Com rampas '
        'de 0,2 cm e tolerância de 0,5 cm, a resolução do HC-SR04, da ordem de 0,3 cm, é '
        'maior que a largura da rampa e comparável à própria tolerância. Numa bancada de '
        'ensino isso é aceitável, e até conveniente, porque garante que os estados de '
        'contradição sejam efetivamente visitados e possam ser observados; numa '
        'aplicação metrológica seria inadmissível, e o sensor teria de ser trocado antes '
        'de qualquer discussão sobre a lógica. O que a LPA2v oferece nesse quadro não é '
        'exatidão que o sensor não tem, e sim o registro explícito de que ela falta.')

    a.subtitulo('Os blocos do NoCodeMCU e o Modo Abstrato')
    a.p('O NoCodeMCU é um ambiente autoral construído sobre a biblioteca Blockly '
        '(FRASER, 2015), no qual os blocos arrastados para a área de trabalho são '
        'convertidos em C++ exibido em tempo real no painel lateral, compilado e gravado '
        'no microcontrolador pelo próprio ambiente. Dois modos convivem: no Modo Literal '
        'cada bloco corresponde a um comando da linguagem, e no Modo Abstrato um bloco '
        'pode valer vários comandos, desde que a decisão técnica que ele absorve não '
        'seja decisão do aluno. A conversão entre os dois modos não altera o programa '
        'gerado.')
    a.p('O programa desta bancada foi escrito no Modo Abstrato, e a escolha tem '
        'consequências que aparecem no texto do programa. O bloco de distância absorve o '
        'pulso de disparo, a espera pelo eco e a conversão do tempo em centímetros, '
        'inclusive o tratamento do eco ausente, que devolveria zero centímetro — leitura '
        'que significaria “peça colada no sensor”, o oposto do que aconteceu. O bloco de '
        'evidência absorve a normalização no Universo de Discurso com saturação nas '
        'pontas. O bloco de análise absorve o Para-Analisador inteiro e oferece um ramo '
        'por estado do reticulado. Nenhum desses blocos absorve a escolha do Universo de '
        'Discurso, da proposição ou dos valores de controle, que continuam expostos.')
    a.p('Uma limitação do Modo Abstrato merece registro porque afetou o desenho do '
        'programa: nele os valores de controle do Para-Analisador são fixos em +0,5 e '
        '−0,5 nos dois eixos, ao passo que o Modo Literal permite editá-los. A bancada '
        'foi construída dentro dessa restrição, o que obrigou a acomodar a calibração '
        'das rampas aos limites fixos em vez de ajustar os limites à calibração — e foi '
        'essa restrição que trouxe à tona o problema de precedência descrito adiante.',
        espaco_depois=6)
    a.figura('blocos-qualidade.png',
             'o programa da bancada no Modo Abstrato e o C++ correspondente')

    a.subtitulo('O portão de presença')
    a.p('Antes de qualquer análise, o programa verifica se há peça sob os sensores, e '
        'esse teste não é uma conveniência. Sem ele, a esteira vazia entraria na análise '
        'com os dois sensores enxergando a lona a dez centímetros, o que produz '
        'evidência nula nas duas fontes, Gc = −1 e estado Falso: o sistema rejeitaria, '
        'indefinidamente, uma peça que não existe. O portão fica em 9,5 cm, e a escolha '
        'desse valor obedece a uma ordem que precisa ser respeitada — ele tem de ser '
        'mais permissivo que o limite de rejeição, que está em 9,15 cm. Fosse o portão '
        'mais apertado, a peça curta demais seria lida como ausência de peça e passaria '
        'sem ser analisada, que é exatamente o erro que o portão deveria impedir.')
    a.p('O teste aceita a peça quando qualquer um dos dois sensores a enxerga, e não '
        'quando ambos a enxergam. A razão é a mesma que rege o resto do programa: se um '
        'sensor vê peça e o outro não vê, isso é contradição a ser analisada pela '
        'lógica, e não motivo para ignorar a peça.')
    a.p('Confirmada a presença, a esteira para e espera quatrocentos milissegundos '
        'antes de medir, e só então as duas distâncias são lidas de novo. Com a lona em '
        'movimento, a peça trepida sob os sensores e os dois ecos discordam por uma razão '
        'que não é a peça — seria contradição introduzida pelo próprio procedimento de '
        'medição, e não pela grandeza medida.')

    a.subtitulo('Por que a decisão não sai do Grau de Certeza')
    a.p('O algoritmo Para-Analisador avalia os estados extremos em ordem fixa: primeiro '
        'testa se o Grau de Certeza atingiu o valor superior de controle, depois se '
        'atingiu o inferior, e só então examina o Grau de Contradição (DA SILVA FILHO, '
        '2006). A consequência dessa ordem é que uma anotação aprovada no primeiro teste '
        'nunca chega ao terceiro — o Grau de Contradição não é consultado.')
    a.p('Com os valores de controle em ±0,5, isso abre uma situação concreta e nada '
        'excepcional. Suponha-se que o primeiro sensor produza evidência 1,00 e o '
        'segundo 0,60, o que nesta bancada corresponde a um sensor vendo 1,25 cm e o '
        'outro vendo 0,97 cm na mesma peça. A anotação é P(1,00; 0,40), de onde saem '
        'Gc = +0,6 e Gct = +0,4. O algoritmo responde Verdadeiro e a peça é aprovada, '
        'embora os dois sensores discordem em 0,28 cm — mais da metade da tolerância '
        'que o portão deveria verificar.')
    a.p('A ordem do algoritmo não está errada; ela é adequada ao problema para o qual '
        'foi escrita. Num robô móvel, que precisa continuar andando, privilegiar a '
        'certeza é o comportamento desejável, e a contradição alta apenas modula a '
        'manobra (DA SILVA FILHO; TORRES; ABE, 2006). Num portão de inspeção a '
        'prioridade se inverte: aprovar sob contradição é o erro mais caro do processo, '
        'porque a peça segue adiante e o registro não guarda sinal de que a evidência '
        'era contraditória.')
    a.p('A primeira tentativa de correção foi antepor à análise um teste do Grau de '
        'Contradição contra os mesmos valores de controle, devolvendo a peça sempre que '
        '|Gct| ≥ 0,5. Ela se mostrou insuficiente, e o caso acima é o contraexemplo: com '
        'Gct = +0,4 a guarda não dispara, e a peça é aprovada do mesmo jeito. O problema '
        'é estrutural, e não de ajuste de limiar — pelo invariante |Gc| + |Gct| ≤ 1, um '
        'Grau de Certeza de +0,6 convive com contradição de até 0,4, e qualquer limiar '
        'escolhido para a guarda deixa de fora a vizinhança imediata dele.')
    a.p('A resposta está no próprio formulário da lógica, e não precisa ser inventada. '
        'O Grau de Certeza Real é, por definição, a certeza já descontado o efeito da '
        'contradição (DA SILVA FILHO; LAMBERT-TORRES; ABE, 2009):')
    a.equacao('D = √((1 − |Gc|)² + Gct²)')
    a.equacao('Gcr = 1 − D,  para Gc > 0;   Gcr = D − 1,  para Gc < 0')
    a.p('Na anotação P(1,00; 0,40), D vale 0,566 e o Grau de Certeza Real cai a +0,434: '
        'abaixo do valor de controle, a peça volta para nova medição. Na anotação sem '
        'contradição alguma de uma peça nominal, P(1,00; 0,00), D é zero e Gcr vale '
        '+1,000. E na peça que mede exatamente o limite, P(0,75; 0,25), Gcr vale +0,500, '
        'porque ali não há contradição a descontar — a certeza real coincide com a '
        'certeza. O programa, portanto, não usa guarda alguma: ele troca a grandeza que '
        'decide, e passa a exigir Gcr ≥ +0,5 para aprovar e Gcr ≤ −0,5 para rejeitar.')
    a.p('A troca traz de brinde a guarda de indefinição do Nó de Análise '
        'Paraconsistente, que anula o Grau de Certeza Real quando o Intervalo de '
        'Evidência cai a 0,25 ou a distância D ultrapassa a unidade (DA SILVA FILHO; '
        'LAMBERT-TORRES; ABE, 2009). Contradição alta demais devolve zero, e zero não '
        'aprova nem rejeita. Uma grandeza só, tirada do formulário, no lugar de um '
        'limiar arbitrado por fora dele.')
    a.p('O reticulado não sai de cena: ele continua sendo o diagnóstico. O monitor '
        'recebe, a cada peça, as duas distâncias, a anotação, o Grau de Contradição com '
        'o sinal — que informa qual dos dois sensores leu mais — e o Grau de Certeza '
        'Real que decidiu. O que mudou é a divisão de trabalho: o reticulado descreve a '
        'situação, e o Grau de Certeza Real é que a resolve.')

    a.subtitulo('Os três destinos e a reavaliação')
    a.p('A regra do Grau de Certeza Real resolve a análise em três destinos físicos. '
        'Gcr ≥ +0,5 acende a lâmpada verde e mantém a esteira à frente por um segundo, '
        'tempo suficiente para a peça sair da janela de medição. Gcr ≤ −0,5 acende a '
        'vermelha e inverte a esteira por um segundo e meio, devolvendo a peça pela '
        'entrada, onde ela cai na caixa de refugo; sem essa inversão a peça permaneceria '
        'na lona e seria trazida de volta aos sensores, e o ciclo se repetiria sem fim. '
        'Entre os dois cortes está tudo o mais — peça na fronteira da faixa, evidência '
        'fraca, contradição consumindo a certeza e indefinição declarada pelo Nó de '
        'Análise Paraconsistente —, e tudo isso acende a amarela e dispara a '
        'reavaliação.')
    a.p('A reavaliação recua a peça por quatrocentos milissegundos, para que ela saia '
        'de baixo dos sensores, e a faz reentrar a 35 % da velocidade, parando em '
        'seguida para a próxima medição. A intenção é a mesma que Da Silva Filho, Torres '
        'e Abe (2006) descrevem para o robô Emmy diante da contradição alta: não decidir, '
        'e sim diluir a contradição, avançando mais devagar em vez de forçar uma escolha. '
        'Na esteira, o que produz boa parte da discordância entre os dois ultrassons é a '
        'peça chegando depressa e mal assentada, de modo que medir de novo em melhores '
        'condições é barato, ao passo que decidir errado não é.')
    a.p('Diluir a contradição, porém, nem sempre funciona: sensor descalibrado ou peça '
        'de face irregular devolvem a mesma discordância indefinidamente, e a esteira '
        'entraria num vaivém perpétuo. Por isso a reavaliação conta as tentativas, e na '
        'terceira medição contraditória o sistema deixa de insistir e rejeita a peça, '
        'registrando no monitor que a rejeição foi por precaução e não por medida. É uma '
        'decisão conservadora, tomada deliberadamente fora da lógica, e ela está '
        'declarada como tal no programa.', espaco_depois=6)
    a.tabela('critério de decisão, sinalização e ação sobre a esteira',
             ['Grau de Certeza Real', 'Leitura dos dois sensores', 'Lâmpada', 'Ação'],
             [['Gcr ≥ +0,5', 'os dois concordam que a peça está na faixa', 'Verde',
               'segue na esteira'],
              ['Gcr ≤ −0,5', 'os dois concordam que a peça está fora da faixa',
               'Vermelha', 'retorna pela entrada'],
              ['−0,5 < Gcr < +0,5', 'peça na fronteira, ou a contradição consumiu a '
               'certeza', 'Amarela', 'recua e reentra devagar'],
              ['Gcr = 0 por indefinição', 'φE ≤ 0,25 ou D > 1', 'Amarela',
               'recua e reentra devagar'],
              ['—', 'três reavaliações seguidas sem conclusão', 'Vermelha',
               'rejeita por precaução']])

    # ---------------- resultados ----------------
    a.titulo('Resultados')

    a.subtitulo('Validação numérica da modelagem')
    a.p('Antes do ensaio físico, a modelagem foi verificada caso a caso contra as '
        'equações da lógica. Para cada par de alturas, calcularam-se os dois graus de '
        'evidência pela composição das valorações, a anotação, o Grau de Certeza, o Grau '
        'de Contradição e o Intervalo de Certeza, e conferiu-se o resultado por dois '
        'caminhos independentes: a transformação inversa, que tem de devolver μ e λ '
        'originais, e o invariante |Gc| + |Gct| ≤ 1, que delimita o reticulado. Os '
        'valores da Tabela 3 não foram transcritos à mão; são recalculados a cada '
        'geração do documento a partir dos mesmos números que estão no programa.',
        espaco_depois=6)
    a.tabela('validação numérica da modelagem, com a lona a 10 cm',
             ['Situação', 'μ', 'λ', 'Gc', 'Gct', 'Gcr', 'Para-Analisador', 'Decisão'],
             linhas_validacao())
    a.p('A penúltima coluna traz o estado que o Para-Analisador apontaria sozinho, e '
        'a última, a decisão que o programa toma pelo Grau de Certeza Real. Na maior '
        'parte das linhas as duas concordam, e é por isso que a discordância entre elas '
        'chama atenção onde aparece.')
    a.p('As três primeiras linhas confirmam o ajuste das rampas: a peça nominal e as '
        'peças folgadamente dentro da faixa produzem certeza real máxima e são '
        'aprovadas. As duas seguintes são as peças que medem exatamente os limites, com '
        'Gcr = +0,500 sobre o valor de controle, devolvidas para nova medição — '
        'comportamento pretendido pela calibração, e não acidente. As duas depois dessas '
        'mostram o efeito da faixa cinzenta, com peças a meio milímetro dos limites '
        'caindo abaixo do corte em vez de serem aprovadas ou rejeitadas por uma '
        'diferença menor que a resolução do sensor. As duas seguintes verificam a '
        'rejeição, simétrica nos dois sentidos, e confirmam que ela não distingue a peça '
        'curta da comprida — distinção que fica por conta das distâncias impressas no '
        'monitor.')
    a.p('As quatro últimas linhas são as de contradição, e nelas está o resultado '
        'central deste trabalho. Na primeira, com um sensor vendo 1,25 cm e o outro '
        '0,97 cm, o Para-Analisador aponta Verdadeiro: Gc = +0,6 supera o valor de '
        'controle, e a ordem do algoritmo faz com que o Grau de Contradição de +0,4 '
        'sequer seja consultado. O Grau de Certeza Real, porém, cai a +0,434, e a peça '
        'volta para nova medição. É a única linha da tabela em que as duas últimas '
        'colunas divergem, e é exatamente a linha que um portão de qualidade não pode '
        'errar.')
    a.p('Nas três linhas seguintes a contradição cresce e as duas colunas voltam a '
        'concordar, por caminhos diferentes: o Para-Analisador chega ao Inconsistente e '
        'ao Paracomplete porque o Grau de Certeza já não alcança o valor de controle, ao '
        'passo que o Grau de Certeza Real desce continuamente — +0,293 nas duas de '
        'contradição igual a 0,5 e zero na última, em que a distância D ultrapassa a '
        'unidade e o Nó de Análise Paraconsistente declara indefinição (DA SILVA FILHO; '
        'LAMBERT-TORRES; ABE, 2009). A diferença de comportamento importa: o estado do '
        'reticulado muda em degraus, nos limites de controle, e o Grau de Certeza Real '
        'muda de forma contínua, o que é a propriedade desejável em um critério de '
        'aceitação.')
    a.p('Uma observação de leitura. As peças exatamente nos limites e as peças a meio '
        'milímetro deles caem sobre a origem ou sobre a fronteira do reticulado, pontos '
        'em que o nome do estado depende do critério de desempate do algoritmo e pode '
        'alternar entre regiões vizinhas. Como a decisão não sai mais do nome do estado, '
        'e sim do Grau de Certeza Real, o desempate deixou de ter efeito sobre a ação '
        'executada — o que é, em si, um argumento a favor da troca.')

    a.subtitulo('Verificação do programa gerado')
    a.p('Três propriedades do programa foram verificadas independentemente do ensaio '
        'com a esteira. A primeira é que o C++ produzido pelos blocos compila para o '
        'Arduino Uno sem ajuste manual, ocupando cerca de 20 % da memória de programa e '
        '22 % da memória de dados da placa, o que confirma na prática a observação de De '
        'Carvalho Junior et al. (2024) sobre o custo computacional reduzido dos '
        'algoritmos da lógica. A segunda é que a conversão do programa entre o Modo '
        'Abstrato e o Modo Literal preserva o arquivo gerado, verificada por comparação '
        'caractere a caractere. A terceira é que a análise, o cálculo dos graus e a '
        'valoração no Universo de Discurso são executados pelas mesmas funções, de modo '
        'que o número impresso no monitor é o mesmo que decidiu a ação.')
    a.p('Essas verificações não substituem o ensaio físico, e não é essa a intenção. '
        'Elas delimitam o que já se pode afirmar sobre a ferramenta antes de afirmar '
        'qualquer coisa sobre a bancada, o que importa particularmente em um ambiente de '
        'programação destinado ao ensino, onde um erro silencioso de geração de código '
        'seria atribuído pelo estudante ao próprio raciocínio.')

    a.subtitulo('Procedimento de ensaio')
    a.p('O ensaio proposto verifica se cada destino é efetivamente alcançado pela '
        'montagem e se a ação associada a ele resolve a situação que o produziu. São '
        'cinco cenários, todos com a peça entrando pela extremidade da esteira e com o '
        'monitor aberto para registro: peça de 1,25 cm, que deve ser aprovada; peça de '
        '0,80 cm e peça de 1,70 cm, que devem ser rejeitadas; peça de 1,55 cm, na faixa '
        'cinzenta, que deve ser devolvida para nova medição; e peça de 1,25 cm com uma '
        'face inclinada, montada de modo que os dois sensores leiam alturas diferentes, '
        'que deve produzir contradição.')
    a.p('Cada cenário é repetido dez vezes. De cada repetição registram-se as duas '
        'distâncias, o par (μ, λ), o estado, a lâmpada acesa, a ação executada e o '
        'desfecho, entendido como a peça ter ou não terminado no destino correto. No '
        'cenário de contradição registra-se ainda quantas reavaliações foram necessárias '
        'até a análise concluir, ou se ela chegou à rejeição por precaução, que é o dado '
        'que permite avaliar se diluir a contradição funciona nesta montagem.',
        espaco_depois=6)
    a.tabela('registro dos ensaios por cenário',
             ['Cenário', 'Destino esperado', 'Destino observado',
              'Acerto em 10 tentativas', 'Reavaliações'],
             [['Peça de 1,25 cm', 'Aprovada', '[a preencher]', '[a preencher]', '—'],
              ['Peça de 0,80 cm', 'Rejeitada', '[a preencher]', '[a preencher]', '—'],
              ['Peça de 1,70 cm', 'Rejeitada', '[a preencher]', '[a preencher]', '—'],
              ['Peça de 1,55 cm', 'Nova medição', '[a preencher]', '[a preencher]',
               '[a preencher]'],
              ['Peça com face inclinada', 'Contradição', '[a preencher]',
               '[a preencher]', '[a preencher]']])
    a.p('A tabela permanece com os campos em aberto porque os ensaios ainda não foram '
        'executados com a montagem definitiva. O procedimento está descrito aqui na '
        'forma em que será aplicado, de modo que os resultados possam ser reportados sem '
        'alteração do método.')

    # ---------------- considerações ----------------
    a.titulo('Considerações finais')
    a.p('A bancada mostra que a discordância entre dois sensores pode ser o critério de '
        'decisão de um portão de qualidade, e não um ruído a eliminar antes dele. Os '
        'três destinos físicos da esteira correspondem a três situações que a inspeção '
        'binária não separa: a peça que está no padrão, a peça que está fora dele e a '
        'peça sobre a qual não se conseguiu medir com segurança. A terceira é a que a '
        'lógica acrescenta, e ela não é rara — é o que acontece sempre que a tolerância '
        'se aproxima da resolução do instrumento.')
    a.p('Dois resultados de método merecem destaque. O primeiro é a modelagem de uma '
        'proposição em faixa pela minimização de duas valorações opostas, que resolve '
        'com o conectivo AND da própria LPA2v um caso que as aplicações monotônicas da '
        'lógica não precisam enfrentar, e que é a forma típica de uma especificação '
        'dimensional. O segundo é a escolha da grandeza que decide: a ordem de '
        'avaliação do Para-Analisador, que testa o Grau de Certeza antes do Grau de '
        'Contradição, é adequada a um robô que precisa continuar andando e inadequada a '
        'um portão que não deve aprovar sob evidência contraditória. A correção não é '
        'antepor uma guarda de contradição, que se mostrou insuficiente porque sempre '
        'sobra a vizinhança do limiar escolhido, e sim decidir pelo Grau de Certeza '
        'Real, que já desconta o efeito da contradição por construção e traz consigo a '
        'guarda de indefinição do Nó de Análise Paraconsistente. O reticulado continua '
        'no programa, como diagnóstico impresso no monitor; o que mudou foi quem assina '
        'a decisão.')
    a.p('Os limites são conhecidos e devem ser declarados. A resolução dos sensores de '
        'ultrassom é da ordem de 0,3 cm, comparável à tolerância de 0,5 cm da peça, o '
        'que torna a bancada adequada ao ensino e inadequada à metrologia; as duas '
        'fontes são de mesma natureza, de modo que uma falha sistemática comum aos dois '
        'sensores não produz contradição alguma e passa despercebida; a esteira tem um '
        'único motor e nenhum desviador, de modo que a peça rejeitada retorna pela '
        'entrada em vez de ser separada em linha; os valores de controle do '
        'Para-Analisador estão fixos em ±0,5 no Modo Abstrato; e os resultados '
        'quantitativos do ensaio ainda não foram levantados.')
    a.p('Como continuidade, pretende-se executar o ensaio descrito e reportar os '
        'resultados, substituir um dos ultrassons por um sensor de natureza diferente, o '
        'que permitiria tratar a discordância entre modalidades e não apenas entre '
        'instrumentos iguais, tornar editáveis no Modo Abstrato os valores de controle do '
        'reticulado, e incorporar o algoritmo extrator de efeitos da contradição (DA '
        'SILVA FILHO, 2009) ao conjunto de blocos, de modo que a contradição deixe de '
        'ser apenas classificada e passe a ser gradativamente extraída.')

    # ---------------- referências ----------------
    a.titulo('Referências')
    a.referencias(REFERENCIAS)


def main():
    erros = conferir_lpa2v()
    if erros:
        for e in erros:
            print('  ! ' + e)
        print('As identidades da LPA2v não fecham — documento não gerado.')
        return 1

    try:
        desenhar_faixa(os.path.join(IMG, 'fig-faixa-qualidade.png'))
        preparar_foto()
    except ImportError:
        print('  ! Pillow ausente: a figura da faixa não foi redesenhada')

    a = Artigo()
    montar(a)
    a.salvar(SAIDA)

    print('✓ ' + os.path.relpath(SAIDA, RAIZ))
    print('  figuras: %d   tabelas: %d' % (a.n_figura, a.n_tabela))
    if a.faltando:
        print('  a capturar ainda: ' + ', '.join(a.faltando))

    from gerar_artigo_emmy2 import conferir as conferir_citacoes
    import gerar_artigo_emmy2 as m
    refs_originais = m.REFERENCIAS
    m.REFERENCIAS = REFERENCIAS
    try:
        orfas = conferir_citacoes(a)
    finally:
        m.REFERENCIAS = refs_originais
    if orfas:
        print('  ! citadas no texto e ausentes das referências: ' + ', '.join(orfas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
