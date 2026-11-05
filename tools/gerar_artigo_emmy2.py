#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/artigo-emmy2-wifi.docx — o artigo sobre a LPA2v abstraída em No-Code
aplicada no robô Emmy.

    python3 tools/gerar_artigo_emmy2.py

Por que não usa o docx_comum.Doc: aquele molde foi feito para a documentação do
software (Calibri, títulos coloridos, legenda em cinza). O artigo veste a outra
roupa, a mesma de docs/Dissertação Mestrado.docx — Arial 12, parágrafo
justificado, entrelinha 1,5, margens de 2,5 cm, títulos em caixa alta e negrito
no corpo do texto, legenda "Figura N – ..." seguida da linha de fonte.

O texto é escrito aqui, no fonte, e não editado no .docx: o documento é gerado,
e qualquer correção feita no Word se perde na próxima geração.

Ao final o script confere, e reclama, se alguma obra citada no texto não estiver
nas referências — ou o contrário.
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.shared import Cm, Inches, Pt, RGBColor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RAIZ, 'docs', 'img')
IMG_EMMY = os.path.join(RAIZ, 'docs', 'img_emmy2')
SAIDA = os.path.join(RAIZ, 'docs', 'artigo-emmy2-wifi.docx')

JUST = WD_ALIGN_PARAGRAPH.JUSTIFY
CENTRO = WD_ALIGN_PARAGRAPH.CENTER
PRETO = RGBColor(0, 0, 0)


class Artigo:
    """Documento no padrão da dissertação, com numeração própria de figuras."""

    def __init__(self):
        self.doc = Document()
        self.n_figura = 0
        self.n_tabela = 0
        self.citadas = set()
        self.faltando = []
        self._preparar()

    def _preparar(self):
        for s in self.doc.sections:
            s.left_margin = s.right_margin = Cm(2.5)
            s.top_margin = s.bottom_margin = Cm(2.5)
        n = self.doc.styles['Normal']
        n.font.name = 'Arial'
        n.font.size = Pt(12)
        n.font.color.rgb = PRETO
        pf = n.paragraph_format
        pf.line_spacing = 1.5
        pf.space_after = Pt(0)
        pf.alignment = JUST

    # ---------------- passagens ----------------

    def titulo(self, texto):
        """Título de seção: caixa alta e negrito, no corpo do texto."""
        par = self.doc.add_paragraph()
        par.paragraph_format.space_before = Pt(18)
        par.paragraph_format.space_after = Pt(6)
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = par.add_run(texto.upper())
        r.bold = True
        return par

    def subtitulo(self, texto):
        par = self.doc.add_paragraph()
        par.paragraph_format.space_before = Pt(12)
        par.paragraph_format.space_after = Pt(4)
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = par.add_run(texto)
        r.bold = True
        return par

    def p(self, texto, recuo=True, alinhar=JUST, espaco_depois=0, tam=None,
          negrito=False, italico=False):
        """Parágrafo de corpo. O recuo da primeira linha é o tabulador que ele
        usa no .docx — lá o parágrafo começa com \\t, e não com indentação de
        estilo; aqui se faz igual para o documento abrir idêntico."""
        par = self.doc.add_paragraph()
        par.alignment = alinhar
        par.paragraph_format.space_after = Pt(espaco_depois)
        r = par.add_run(('\t' if recuo else '') + self._marcar(texto))
        if tam:
            r.font.size = Pt(tam)
        r.bold = negrito
        r.italic = italico
        return par

    def _marcar(self, texto):
        """Registra as citações autor-data encontradas, para a conferência."""
        for bloco in re.findall(r'\(([^()]*\d{4}[^()]*)\)', texto):
            for obra in bloco.split(';'):
                obra = obra.strip()
                m = re.match(r'^([A-ZÀ-Ú][^,]*?),?\s*(?:et al\.)?,?\s*(\d{4})', obra)
                if m:
                    self.citadas.add((m.group(1).strip().rstrip(','), m.group(2)))
        for m in re.finditer(r'([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)*)'
                             r'(?: et al\.)? \((\d{4})', texto):
            self.citadas.add((m.group(1).upper(), m.group(2)))
        return texto

    def equacao(self, txt):
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        par.paragraph_format.space_before = Pt(6)
        par.paragraph_format.space_after = Pt(6)
        r = par.add_run(txt)
        r.font.name = 'Cambria Math'
        r.font.size = Pt(12)
        return par

    def figura(self, arquivo, legenda, fonte='Elaborado pelo autor (2026)',
               larg=5.5, base=IMG):
        caminho = os.path.join(base, arquivo)
        self.n_figura += 1
        if not os.path.exists(caminho):
            self.faltando.append('Figura %d (%s)' % (self.n_figura, arquivo))
            par = self.doc.add_paragraph()
            par.alignment = CENTRO
            r = par.add_run('[Figura %d a capturar: %s]' % (self.n_figura, arquivo))
            r.italic = True
        else:
            self.doc.add_picture(caminho, width=Inches(larg))
            self.doc.paragraphs[-1].alignment = CENTRO
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        par.paragraph_format.space_before = Pt(4)
        r = par.add_run('Figura %d – %s' % (self.n_figura, legenda))
        r.font.size = Pt(10)
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        par.paragraph_format.space_after = Pt(12)
        r = par.add_run('Fonte: ' + fonte)
        r.font.size = Pt(10)

    def tabela(self, titulo, cabecalho, linhas,
               fonte='Elaborado pelo autor (2026)'):
        self.n_tabela += 1
        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        par.paragraph_format.space_before = Pt(10)
        r = par.add_run('Tabela %d – %s' % (self.n_tabela, titulo))
        r.font.size = Pt(10)

        tab = self.doc.add_table(rows=1, cols=len(cabecalho))
        tab.style = 'Table Grid'
        tab.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for c, txt in zip(tab.rows[0].cells, cabecalho):
            c.text = ''
            run = c.paragraphs[0].add_run(txt)
            run.bold = True
            run.font.size = Pt(10)
            run.font.name = 'Arial'
            c.paragraphs[0].alignment = CENTRO
            c.paragraphs[0].paragraph_format.space_after = Pt(0)
        for linha in linhas:
            cells = tab.add_row().cells
            for c, txt in zip(cells, linha):
                c.text = ''
                run = c.paragraphs[0].add_run(str(txt))
                run.font.size = Pt(10)
                run.font.name = 'Arial'
                c.paragraphs[0].alignment = CENTRO
                c.paragraphs[0].paragraph_format.space_after = Pt(0)

        par = self.doc.add_paragraph()
        par.alignment = CENTRO
        par.paragraph_format.space_after = Pt(12)
        r = par.add_run('Fonte: ' + fonte)
        r.font.size = Pt(10)

    def referencias(self, itens):
        for it in sorted(itens):
            par = self.doc.add_paragraph()
            par.alignment = WD_ALIGN_PARAGRAPH.LEFT
            par.paragraph_format.space_after = Pt(10)
            par.paragraph_format.line_spacing = 1.0
            par.add_run(it)

    def salvar(self, caminho):
        self.doc.save(caminho)


# ====================================================================== #
# O TEXTO                                                                #
# ====================================================================== #

REFERENCIAS = [
    'AJIMATI, Matthew Oladeji; CARROLL, Noel; MAHER, Mary. Adoption of low-code and '
    'no-code development: a systematic literature review and future research agenda. '
    'The Journal of Systems and Software, v. 222, art. 112300, 2025. '
    'DOI: 10.1016/j.jss.2024.112300.',

    'DA COSTA, Newton C. A. On the theory of inconsistent formal systems. Notre Dame '
    'Journal of Formal Logic, v. 15, n. 4, p. 497-510, out. 1974. '
    'DOI: 10.1305/ndjfl/1093891487.',

    'DA SILVA FILHO, João Inácio. Métodos de aplicações da Lógica Paraconsistente '
    'Anotada de anotação com dois valores – LPA2v. Seleção Documental, Santos: '
    'Ed. Paralogike, ano 1, n. 1, p. 18-25, jan./mar. 2006. ISSN 1809-0648.',

    'DA SILVA FILHO, João Inácio. Algoritmo Paraconsistente Extrator de efeitos da '
    'Contradição – ParaExtrctr. Seleção Documental, Santos: Ed. Paralogike, ano 4, '
    'n. 15, p. 21-25, jul./set. 2009. ISSN 1809-0648.',

    'DA SILVA FILHO, João Inácio; LAMBERT-TORRES, Germano; ABE, Jair Minoro. '
    'Inteligência artificial com as redes de análises paraconsistentes: teoria e '
    'aplicações. Rio de Janeiro: LTC, 2009. 339 p.',

    'DA SILVA FILHO, João Inácio; TORRES, Cláudio Rodrigo; ABE, Jair Minoro. Robô '
    'móvel autônomo Emmy: uma aplicação eficiente da Lógica Paraconsistente Anotada. '
    'Seleção Documental, Santos: Ed. Paralogike, n. 3, p. 19-26, jul./set. 2006. '
    'ISSN 1809-0648.',

    'FRASER, Neil. Ten things we’ve learned from Blockly. In: IEEE BLOCKS AND BEYOND '
    'WORKSHOP, 2015, Atlanta. Proceedings [...]. Piscataway: IEEE, 2015. p. 49-50. '
    'DOI: 10.1109/BLOCKS.2015.7369000.',

    'GOOGLE. Blockly: a JavaScript library for building visual programming editors. '
    'Google for Developers, 2026. Disponível em: '
    'https://developers.google.com/blockly. Acesso em: 29 ago. 2026.',

    'HALIM, Jayanto; EICHLER, Paul; KRUSCHE, Sebastian; BDIWI, Mohamad; IHLENFELDT, '
    'Steffen. No-code robotic programming for agile production: a new '
    'markerless-approach for multimodal natural interaction in a human-robot '
    'collaboration context. Frontiers in Robotics and AI, v. 9, art. 1001955, 2022. '
    'DOI: 10.3389/frobt.2022.1001955.',

    'JAŚKOWSKI, Stanisław. Propositional calculus for contradictory deductive systems. '
    'Studia Logica, v. 24, p. 143-157, 1969. Publicado originalmente em polonês em 1948.',

    'MATIAZZO, Daniel; ALMEIDA, Evair Fernandes Silva; ESQUIVEL, Leonardo Figueiredo; '
    'LOPES, William Aparecido Celestino. Low-code application for optimizing industrial '
    'maintenance in an automotive components company. Revista e-TECH: Tecnologias para '
    'a Competitividade Industrial, v. 18, n. 1, 2025. DOI: 10.18624/etech.v18i1.1432.',

    'SUBRAHMANIAN, V. S. On the semantics of quantitative logic programs. In: IEEE '
    'SYMPOSIUM ON LOGIC PROGRAMMING, 4., 1987, San Francisco. Proceedings [...]. '
    'Washington, DC: IEEE Computer Society Press, 1987. p. 173-182.',

    'SUFI, Fahim. Algorithms in low-code-no-code for research applications: a practical '
    'review. Algorithms, v. 16, n. 2, art. 108, 2023. DOI: 10.3390/a16020108.',

    'WANG, Pengfei; WANG, Zhengwei; DUAN, Jinjun; MIAO, Yunfei; TIAN, Wei. Review of '
    'the development status of low-code programming software for robots. Digital '
    'Engineering, v. 4, art. 100039, 2025. DOI: 10.1016/j.dte.2025.100039.',
]


def montar(a):
    # ---------------- abertura ----------------
    a.p('LÓGICA PARACONSISTENTE ANOTADA COM ANOTAÇÃO DE DOIS VALORES ABSTRAÍDA EM '
        'NO-CODE APLICADO NO ROBÔ EMMY', recuo=False, alinhar=CENTRO, negrito=True,
        espaco_depois=18)
    a.p('[Nome completo do autor]', recuo=False, alinhar=CENTRO, tam=11,
        espaco_depois=2)
    a.p('Universidade Santa Cecília — Programa de Pós-Graduação em Engenharia Mecânica',
        recuo=False, alinhar=CENTRO, tam=11, espaco_depois=18)

    a.subtitulo('RESUMO')
    a.p('Os sistemas de controle de robôs móveis decidem, em geral, por lógica '
        'clássica, e quando duas fontes de leitura discordam entre si a decisão '
        'recorre ao mesmo caminho binário que produziu o impasse. Este trabalho '
        'apresenta a abstração da Lógica Paraconsistente Anotada de anotação com dois '
        'valores em blocos de programação No-Code, no software NoCodeMCU, e a sua '
        'aplicação em um robô móvel autônomo construído sobre um microcontrolador '
        'ESP32, aqui chamado de Emmy 2 por herdar a proposição e o reticulado do robô '
        'Emmy original. Dois sensores de ultrassom montados lado a lado fornecem os '
        'graus de evidência da proposição "existe obstáculo à frente", o algoritmo '
        'Para-Analisador determina o estado lógico e cada estado corresponde a uma '
        'manobra, escrita em um bloco único de movimento. A placa serve a própria '
        'página web, na qual o reticulado é desenhado em tempo real e quatro botões '
        'permitem o comando manual que se sobrepõe à decisão automática enquanto o '
        'toque durar. O ponto exibido na página é o mesmo que decide a manobra, o que '
        'mantém visível o critério da decisão em uma camada de programação que costuma '
        'ser criticada justamente por escondê-lo. O programa completo foi construído '
        'sem escrever linhas de código e o C++ gerado foi compilado para as duas '
        'famílias de microcontroladores suportadas.', espaco_depois=6)
    a.p('Palavras-chave: lógica paraconsistente anotada; LPA2v; programação No-Code; '
        'robótica móvel; microcontroladores.', espaco_depois=12)

    a.subtitulo('ABSTRACT')
    a.p('Mobile robot control systems usually decide through classical logic, and when '
        'two reading sources disagree the decision falls back on the same binary path '
        'that produced the deadlock. This work presents the abstraction of Paraconsistent '
        'Annotated Logic with annotation of two values into No-Code programming blocks, '
        'within the NoCodeMCU software, and its application to an autonomous mobile robot '
        'built on an ESP32 microcontroller, here named Emmy 2 for inheriting the '
        'proposition and the lattice of the original Emmy robot. Two ultrasonic sensors '
        'mounted side by side provide the degrees of evidence for the proposition "there '
        'is an obstacle ahead", the Para-Analyzer algorithm determines the logical state '
        'and each state corresponds to a manoeuvre written in a single movement block. '
        'The board serves its own web page, where the lattice is drawn in real time and '
        'four buttons allow manual command that overrides the automatic decision while '
        'the touch lasts. The point displayed on the page is the same one that decides '
        'the manoeuvre, which keeps the decision criterion visible in a programming layer '
        'usually criticised precisely for hiding it. The complete program was built '
        'without writing code and the generated C++ was compiled for both supported '
        'microcontroller families.', espaco_depois=6)
    a.p('Keywords: paraconsistent annotated logic; PAL2v; No-Code programming; mobile '
        'robotics; microcontrollers.', espaco_depois=12)

    # ---------------- introdução ----------------
    a.titulo('Introdução')
    a.p('Os sistemas de controle embarcados em robôs móveis operam quase sempre sobre '
        'lógica clássica, e por isso reduzem a leitura do ambiente a dois estados, '
        'verdadeiro ou falso, antes mesmo de decidir o que fazer com ela. Quando duas '
        'fontes apontam para o mesmo lugar e discordam entre si, a decisão binária não '
        'tem onde se apoiar, e o mecanismo de defesa acionado nesse impasse costuma '
        'recorrer ao mesmo caminho que levou até ele (DA SILVA FILHO, 2006).')
    a.p('Essa limitação é reconhecida na literatura da área. Para Da Silva Filho '
        '(2006, p. 18), os sistemas de controle utilizados em automação e robótica e os '
        'sistemas especialistas “funcionam em geral com base na Lógica Clássica, onde a '
        'descrição do mundo é considerada por apenas dois estados. Estes Sistemas '
        'Binários não conseguem tratar adequadamente as situações contraditórias”.')
    a.p('Ao mesmo tempo, a forma de escrever esses programas também vem mudando. As '
        'plataformas de baixo código e sem código deslocaram o desenvolvimento de '
        'software para fora do grupo de programadores profissionais, e na robótica esse '
        'deslocamento é apresentado como redução de barreira de entrada e de tempo de '
        'reconfiguração (AJIMATI; CARROLL; MAHER, 2025; WANG et al., 2025; HALIM et '
        'al., 2022). A crítica que acompanha esse ganho é sempre a mesma: o que a '
        'camada visual esconde deixa de poder ser verificado, e Wang et al. (2025, '
        'tradução nossa) observam que, com o programa pronto, “é difícil garantir a '
        'eficácia dos programas que eles escrevem depois de programar”, recomendando '
        'pré-visualização e depuração visual como resposta.')
    a.p('Existe, porém, uma diferença entre esconder o comando e esconder o critério. '
        'Abstrair um acionamento de motor em um bloco não compromete o entendimento de '
        'quem monta a rotina, porque o efeito é imediatamente visível no equipamento. '
        'Abstrair a decisão que escolheu aquele acionamento é outra coisa: se o critério '
        'não aparece, o robô passa a agir por razões que ninguém consegue reconstruir, e '
        'a camada No-Code se torna a caixa-preta que a literatura teme.')
    a.p('Este trabalho apresenta como a Lógica Paraconsistente Anotada de anotação com '
        'dois valores foi abstraída em blocos No-Code no software NoCodeMCU e aplicada a '
        'um robô móvel autônomo montado sobre um microcontrolador ESP32, aqui chamado de '
        'Emmy 2 por herdar a proposição, o reticulado e o repertório de manobras do robô '
        'Emmy original (DA SILVA FILHO; TORRES; ABE, 2006). A contribuição não está '
        'apenas em programar o robô sem escrever código, e sim em manter o critério '
        'exposto enquanto ele decide: a própria placa serve uma página web na qual o '
        'reticulado é desenhado em tempo real, e o ponto que aparece no navegador é o '
        'mesmo que produz a manobra.')

    # ---------------- LCNC ----------------
    a.titulo('Programação em baixo código e sem código')
    a.p('O desenvolvimento em baixo código e sem código, reunido na sigla LCNC, é '
        'definido por Ajimati, Carroll e Maher (2025, p. 1, tradução nossa) como o '
        'conjunto de tecnologias “que permitem o desenvolvimento de aplicações de '
        'software com pouca ou nenhuma experiência em codificação”, associado à prática '
        'de capacitar funcionários não técnicos a construir as próprias soluções. Em '
        'uma revisão sistemática de quarenta estudos primários, os autores registram '
        'ganhos de customização e de tempo, e registram também os limites recorrentes: '
        'dependência do fornecedor da plataforma, baixa escalabilidade e arquitetura '
        'pouco robusta.')
    a.p('Esse limite tem uma forma específica quando o alvo é um microcontrolador. Sufi '
        '(2023, tradução nossa) observa que os desenvolvedores cidadãos “estão limitados '
        'ao arcabouço oferecido pela plataforma LCNC” e que, entre as plataformas '
        'existentes, “nenhuma permite desenvolver software embarcado”, acrescentando que '
        'sistemas críticos e de tempo real continuam a funcionar melhor com linguagens '
        'como C e C++. É exatamente o espaço em que um ambiente autoral se justifica: '
        'não substituir o C++ do microcontrolador, e sim gerá-lo.')
    a.p('Na robótica, Halim et al. (2022, p. 3, tradução nossa) separam os dois '
        'patamares ao afirmar que “nos métodos de programação de baixo código ainda é '
        'exigido conhecimento adequado de uma linguagem de programação de robôs” e que a '
        'programação sem código “elimina as barreiras ao permitir que o usuário interaja '
        'com o robô ou o movimente por meio de interações naturais”, com redução do '
        'esforço de programação de quarenta a cinquenta vezes em tarefas complexas, ao '
        'custo de uma exatidão de seis milímetros que nem todo processo aceita. Wang et '
        'al. (2025, p. 1, tradução nossa) situam o mesmo movimento no chão de fábrica ao '
        'registrar que a programação de baixo código “reduz drasticamente o limiar de '
        'entrada da programação de robôs”, e Matiazzo et al. (2025) mostram o efeito '
        'medido em uma fábrica de componentes automotivos, com redução de 56 % no tempo '
        'médio de aceite das ordens de manutenção.')
    a.p('A programação baseada em blocos é a forma visual mais difundida desse '
        'movimento, e sua vantagem mais citada é a impossibilidade de erro de sintaxe. '
        'Fraser (2015, p. 49, tradução nossa), a partir de quatro anos de '
        'desenvolvimento do Blockly, matiza a promessa ao mostrar um programa com “um '
        'erro de sintaxe invisível”, em que dois blocos apenas não estão conectados, e '
        'trata o ambiente de blocos como etapa de passagem, defendendo que todo ambiente '
        'de ensino tenha “uma saída apropriada aos seus alunos” rumo ao texto. O '
        'NoCodeMCU adota essa recomendação de forma explícita ao manter, lado a lado com '
        'os blocos, o código C++ correspondente e um Modo Literal em que cada bloco '
        'equivale a um comando da linguagem.')

    # ---------------- LPA2v e Emmy ----------------
    a.titulo('A LPA2v e o robô Emmy')
    a.p('A Lógica Paraconsistente admite a contradição sem trivializar o sistema, e sua '
        'formalização é dada por Da Costa (1974, p. 497, tradução nossa), para quem “um '
        'sistema formal (sistema dedutivo, teoria dedutiva, ...) S é dito inconsistente '
        'se existe uma fórmula A de S tal que A e sua negação, ¬A, são ambas teoremas '
        'desse sistema”, sendo trivial apenas o sistema em que todas as fórmulas são '
        'teoremas. Sobre essa base, Subrahmanian (1987) acrescentou as anotações à '
        'programação lógica, e Da Silva Filho formulou a anotação com dois valores e os '
        'algoritmos que a tornaram aplicável em controle, entre eles o Para-Analisador e '
        'o robô Emmy (DA SILVA FILHO, 2006; DA SILVA FILHO; TORRES; ABE, 2006; DA SILVA '
        'FILHO; LAMBERT-TORRES; ABE, 2009).')
    a.p('Na LPA2v, duas fontes de leitura são normalizadas no intervalo fechado de zero '
        'a um, e formam a anotação de uma proposição: o grau de evidência favorável μ e '
        'o grau de evidência desfavorável λ. Desses dois valores saem o Grau de Certeza '
        'e o Grau de Contradição, pela composição de transformações T(x, y) = '
        '(x − y, x + y − 1):')
    a.equacao('Gc  =  μ − λ')
    a.equacao('Gct =  μ + λ − 1')
    a.p('O par ordenado ετ = (Gc, Gct) é um ponto no reticulado, e sua posição no '
        'Quadrado Unitário do Plano Cartesiano indica o estado lógico da proposição '
        '(DA SILVA FILHO, 2006, p. 20-21; DA SILVA FILHO; LAMBERT-TORRES; ABE, 2009). '
        'Nos quatro extremos ficam o Verdadeiro, o Falso, o Inconsistente e o '
        'Paracompleto; entre eles, as regiões não extremas descrevem as situações em que '
        'a evidência é insuficiente ou a contradição já começou a se formar, e é '
        'justamente essa faixa intermediária que a decisão binária não sabe nomear.',
        espaco_depois=6)
    a.figura('fluxo-duas-fontes.png',
             'tratamento de duas fontes pelo caminho binário e pelo caminho '
             'paraconsistente',
             fonte='Elaborado pelo autor (2026), com base em Da Silva Filho (2006)')
    a.figura('fig3-12-estados.png',
             'as doze regiões do reticulado da LPA2v e os valores de controle',
             fonte='Elaborado pelo autor (2026), com base em Da Silva Filho (2006)')
    a.p('O robô Emmy é a aplicação clássica desse aparato em robótica móvel. Descrito '
        'por Da Silva Filho, Torres e Abe (2006), é um robô de plataforma circular com '
        'trinta centímetros de diâmetro, movido por dois motores de corrente contínua '
        'acionados por relés, cujo controle lógico é construído inteiramente em '
        'hardware. O dispositivo chamado Para-Sônico emprega dois sensores de ultrassom '
        'sincronizados e converte o tempo decorrido entre a emissão e o eco em duas '
        'tensões, que são o μ e o λ da proposição “existe obstáculo à frente”. O '
        'Para-Analisador determina então um dos doze estados, e a saída, codificada em '
        'palavra binária, aciona os motores.')
    a.p('Cada estado do Emmy tem uma atitude associada, e os autores a descrevem em '
        'termos humanos antes de programá-la: no Verdadeiro, quando existe obstáculo '
        'próximo, a atitude é o “desvio rápido do obstáculo”; no Falso, quando não '
        'existe obstáculo, é o “avanço rápido com confiança”; e tanto na Inconsistência '
        'quanto na Paracompleteza, quando pode existir ou não obstáculo à frente, a '
        'atitude é “para e procura novo ângulo de captação de informações”. As rotinas '
        'combinam desvios de noventa e de quarenta e cinco graus com avanços por três '
        'tempos, T1 de 0,75 segundo, T2 de 1,5 segundo e T3 de 2 segundos '
        '(DA SILVA FILHO, 2006; DA SILVA FILHO; TORRES; ABE, 2006). A regra geral que '
        'os autores extraem do reticulado é a de que a contradição alta não manda parar '
        'nem desviar bruscamente, e sim diluir a contradição, avançando mais devagar ou '
        'desviando em ângulos parciais.')

    # ---------------- materiais e métodos ----------------
    a.titulo('Materiais e métodos')
    a.subtitulo('O robô Emmy 2')
    a.p('O Emmy 2 mantém a proposição e o reticulado do robô original e troca a base '
        'física. O chassi é o de duas rodas em acrílico, com roda boba traseira e dois '
        'motores de corrente contínua com redução, acionados por uma ponte H L298N cujas '
        'entradas de habilitação permanecem em cinco volts, de modo que a velocidade é '
        'controlada no próprio pino de sentido. O controle lógico, que no Emmy estava em '
        'hardware dedicado, aqui é um programa em um microcontrolador ESP32 DevKit '
        'WROOM-32, alimentado por um porta-pilhas e montado sobre uma protoboard, o que '
        'mantém a montagem ao alcance de um laboratório de ensino.')
    a.p('Os dois sensores de ultrassom HC-SR04 ficam lado a lado na dianteira, '
        'apontados para a frente, e são as duas fontes da anotação. O sensor esquerdo '
        'ocupa os pinos D26 e D27, para disparo e eco, e o direito os pinos D32 e D33; a '
        'ponte H recebe os pinos D2 e D4 no motor esquerdo e D18 e D19 no direito. A '
        'proximidade entre os dois sensores é deliberada, porque é ela que torna a '
        'discordância informativa: olhando quase para o mesmo ponto, uma diferença '
        'grande entre as leituras não é ruído de posição, e sim a assinatura de uma '
        'superfície oblíqua, de uma quina ou de um obstáculo que ocupa só metade do '
        'caminho.', espaco_depois=6)
    a.figura('WhatsApp Image 2026-09-12 at 17.59.37.jpeg',
             'o robô Emmy 2 montado, em vista lateral', base=IMG_EMMY, larg=4.2)
    a.figura('WhatsApp Image 2026-09-12 at 17.59.37 (2).jpeg',
             'os dois sensores de ultrassom lado a lado na dianteira do Emmy 2',
             base=IMG_EMMY, larg=4.2)

    a.subtitulo('Os blocos do NoCodeMCU')
    a.p('O NoCodeMCU é um ambiente autoral construído sobre a biblioteca Blockly '
        '(FRASER, 2015; GOOGLE, 2026), no qual os blocos arrastados para a área de '
        'trabalho são convertidos em C++ exibido em tempo real no painel lateral, '
        'compilado e gravado no microcontrolador pelo próprio ambiente. Dois modos '
        'convivem: no Modo Literal cada bloco corresponde a um comando da linguagem, e '
        'no Modo Abstrato um bloco pode valer vários comandos, desde que a decisão '
        'técnica que ele absorve não seja decisão do aluno. A conversão entre os dois '
        'modos não altera o programa gerado, o que permite ao estudante ver, no mesmo '
        'projeto, a forma simplificada e a forma completa.')
    a.p('Para o Emmy 2 foram acrescentadas duas famílias de blocos ao Modo Abstrato. A '
        'primeira reúne o movimento: um bloco declara em que pinos está a ponte H e um '
        'segundo executa a manobra inteira, escolhida entre ir para frente, dar ré, '
        'girar à esquerda, girar à direita e parar, com a velocidade recebida como '
        'entrada, em porcentagem. A consequência prática aparece na calibração. No '
        'programa equivalente em Modo Literal, cada manobra é uma função com quatro '
        'escritas analógicas, e a velocidade acaba repetida em cada uma delas; na '
        'bancada, o ajuste do avanço e o da marcha lenta convergiram para o mesmo valor, '
        'e essa coincidência ficava escondida em dois lugares diferentes do programa. '
        'Com a velocidade como entrada do bloco, ela passa a morar em uma caixa única, e '
        'mudar o andar do robô é mudar um número.')
    a.p('A segunda família é a página servida pela placa. Um bloco cria uma rede sem '
        'fio aberta ou entra em uma rede existente, outro fixa o endereço, outro abre o '
        'servidor na porta de rede, e os demais tratam do conteúdo: mostrar um valor na '
        'página, desenhar o reticulado com a anotação corrente, atender a página e '
        'esperar um intervalo sem abandoná-la. O botão é um bloco de valor lógico, '
        'verdadeiro enquanto o toque no navegador durar, e o botão correspondente '
        'aparece sozinho na tela do celular. Nenhum desses blocos pede HTML, e nenhum '
        'deles pede ao usuário que escreva o servidor.')
    a.p('A montagem da página não acontece no momento em que o código é gerado, e sim '
        'no momento em que o celular a pede. O programa mantém as listas de botões e de '
        'valores declarados, e a página é construída a partir delas em tempo de '
        'execução. A escolha tem uma razão verificável: como a ordem em que os blocos '
        'são percorridos deixa de influir no arquivo produzido, mover um bloco de lugar '
        'na área de trabalho não altera uma linha do C++ gerado, que é a garantia sobre '
        'a qual os dois modos se apoiam.', espaco_depois=6)
    a.figura('blocos-emmy2.png',
             'os blocos do Emmy 2 na área de trabalho e o código C++ correspondente')

    a.subtitulo('O programa do Emmy 2')
    a.p('O Universo de Discurso adotado vai de oitenta a dez centímetros: a oitenta '
        'centímetros o caminho é considerado livre e o grau de evidência tende a zero, e '
        'a dez centímetros o obstáculo está colado e o grau tende a um. Como o segundo '
        'valor é menor que o primeiro, a valoração já sai invertida em relação à '
        'distância, sem que seja necessário inverter nada depois. A distância lida por '
        'cada sensor é normalizada nesse intervalo, e as duas evidências resultantes '
        'formam a anotação da proposição “existe obstáculo à frente”, com μ vindo do '
        'sensor esquerdo e λ obtido pelo complemento da evidência do sensor direito.')
    a.p('Como a segunda fonte entra pelo complemento, o Grau de Certeza passa a medir '
        'o consenso entre os dois sensores e o Grau de Contradição passa a medir a '
        'discordância entre eles. Com os dois vendo obstáculo a vinte e a vinte e cinco '
        'centímetros, por exemplo, a anotação é P(0,857; 0,214), o que dá Gc = +0,643 e '
        'Gct = +0,071, ponto bem dentro da região do Verdadeiro; com os dois vendo '
        'caminho livre a setenta e a sessenta centímetros, a anotação é P(0,143; 0,714), '
        'com Gc = −0,571 e Gct = −0,143, dentro da região do Falso. Quando o sensor '
        'esquerdo vê obstáculo a vinte centímetros e o direito vê caminho livre a '
        'setenta, a anotação vira P(0,857; 0,857) e o ponto sobe para Gct = +0,714, com '
        'Gc nulo: é o estado Inconsistente. A situação espelhada, com o obstáculo '
        'diante do sensor direito, leva o ponto a Gct = −0,714 e ao estado '
        'Paracompleto.')
    a.p('Os limites de controle adotados no Para-Analisador são os valores usuais de '
        'projeto, com Vscc igual a +0,5 e Vicc igual a −0,5 no eixo da certeza, e Vscct '
        'igual a +0,5 e Vicct igual a −0,5 no eixo da contradição. Cada um dos quatro '
        'estados extremos dispara uma manobra, reunidas na Tabela 1.', espaco_depois=6)
    a.tabela('estados do reticulado e manobras do Emmy 2',
             ['Estado', 'Leitura dos dois sensores', 'Manobra'],
             [['V', 'os dois veem obstáculo',
               'para, recua e gira noventa graus'],
              ['F', 'os dois veem caminho livre', 'avança'],
              ['T', 'obstáculo diante do sensor esquerdo e caminho livre diante do direito',
               'avança devagar, para as leituras desempatarem'],
              ['⊥', 'caminho livre diante do esquerdo e obstáculo diante do direito',
               'recua e gira meia manobra, e volta a medir'],
              ['demais', 'regiões não extremas do reticulado',
               'segue devagar e volta a medir']])
    a.p('A atitude atribuída aos estados de discordância é o ponto em que o Emmy 2 se '
        'afasta do robô original. Em Da Silva Filho, Torres e Abe (2006), a '
        'Inconsistência e a Paracompleteza levam o robô a parar e procurar novo ângulo '
        'de captação. Na bancada, parar mostrou-se uma decisão que não altera a '
        'evidência: imóvel, o robô repete exatamente a mesma leitura discordante no '
        'ciclo seguinte, e permanece no mesmo estado indefinidamente. A manobra '
        'adotada, portanto, muda a geometria antes de medir de novo, avançando devagar '
        'quando a contradição pede aproximação e recuando com meio giro quando ela pede '
        'afastamento, o que preserva a intenção descrita pelos autores — procurar novo '
        'ângulo — sem a imobilidade que a produzia.')
    a.p('Os quatro estados extremos, porém, são a minoria do reticulado, e o programa '
        'precisa dizer o que fazer no restante dele. Uma leitura corriqueira de trinta e '
        'cinco centímetros de um lado e cinquenta do outro produz a anotação '
        'P(0,643; 0,571), com Gc = +0,071 e Gct = +0,214, que o Para-Analisador '
        'classifica como Inconsistente tendendo ao Verdadeiro: nenhum dos quatro '
        'extremos foi atingido. Sem um ramo para esse caso, o robô repetiria '
        'indefinidamente a última manobra, e por isso o programa traz o bloco “nos '
        'demais estados”, no qual a ação é seguir devagar e medir de novo.')
    a.p('Há um argumento formal por trás dessa escolha, e ele também explica a manobra '
        'dos estados de discordância. O Intervalo de Certeza, dado por φ = 1 − |Gct|, '
        'limita a certeza alcançável enquanto a contradição não diminuir: nos dois '
        'casos de discordância descritos acima, φ vale 0,286, de modo que o Grau de '
        'Certeza não pode passar disso sem que a contradição caia primeiro. Pelo Nó de '
        'Análise Paraconsistente, esses mesmos pontos apresentam distância D igual a '
        '1,229, maior que a unidade, o que caracteriza indefinição e anula o Grau de '
        'Certeza Real (DA SILVA FILHO; LAMBERT-TORRES; ABE, 2009). Em outras palavras, '
        'insistir na decisão com aquela anotação é insistir em uma certeza que não '
        'existe; o que o robô pode fazer é alterar a geometria da medição para que a '
        'contradição diminua, que é exatamente o que a manobra faz.')
    a.p('As velocidades são expressas em porcentagem da intensidade máxima e vieram da '
        'calibração na bancada: 29,4 % para o avanço e para a marcha lenta, 43,1 % no '
        'empurrão de oitenta milissegundos que tira o motor da inércia, 35,3 % na ré e '
        '19,6 % no giro, o que corresponde, na escala de oito bits do acionamento, a 75, '
        '110, 90 e 50 respectivamente.')
    a.p('O empurrão inicial não é detalhe de implementação, e sim a diferença entre o '
        'robô andar e não andar. A ponte H empregada consome parte da tensão de '
        'alimentação, e parado o motor não vence o atrito estático na intensidade baixa '
        'em que o robô deve trafegar: sem o empurrão, um ciclo que comece com os motores '
        'parados deixa o robô zumbindo no lugar. Como os estados Verdadeiro e '
        'Paracompleto terminam suas manobras com os motores parados, toda arrancada '
        'posterior passa pelo empurrão, e não apenas a do estado Inconsistente. Essa '
        'correção veio do ensaio na bancada, e é um caso em que o comportamento físico '
        'impõe uma condição que a lógica, sozinha, não revela.')

    a.subtitulo('A página servida pela placa')
    a.p('Concluída a decisão, resta o problema de observá-la. Um robô que anda não '
        'pode ficar preso ao cabo que alimenta o monitor serial, e a leitura do estado '
        'lógico perde sentido quando o robô precisa parar para ser lida. No Emmy 2 a '
        'própria placa cria uma rede sem fio aberta e serve uma página, à qual o celular '
        'se conecta diretamente, sem roteador e sem instalar nada. A página desenha o '
        'Quadrado Unitário do Plano Cartesiano, marca o ponto corrente e mantém o rastro '
        'das últimas leituras, exibe o nome do estado e os valores de μ, λ, Gc e Gct, e '
        'apresenta os quatro botões de comando manual.')
    a.p('A escolha de projeto que sustenta o argumento deste trabalho está na origem '
        'desse ponto: ele não é recalculado para a tela. A anotação enviada à página é a '
        'mesma que entra no Para-Analisador, porque as duas saem das mesmas caixas do '
        'programa, e o nome do estado exibido é o resultado da mesma função que escolhe '
        'a manobra. O que se vê no celular, portanto, é o critério da decisão enquanto '
        'ela acontece, e não uma representação paralela que poderia divergir dela sem '
        'que ninguém percebesse.')
    a.p('O comando manual segue a mesma lógica de transparência. Enquanto o dedo '
        'permanece sobre um botão, o navegador repete o aviso à placa a cada cento e '
        'cinquenta milissegundos, e o programa considera o botão apertado enquanto o '
        'último aviso tiver menos de quatrocentos milissegundos. Soltar o dedo, fechar a '
        'página ou perder o sinal produzem o mesmo efeito, que é o robô voltar a decidir '
        'sozinho no ciclo seguinte, sem que nenhum estado fique preso em lugar nenhum. '
        'Durante as manobras longas, as esperas do programa continuam atendendo a '
        'página, de modo que o robô nunca parece travado para quem o observa.',
        espaco_depois=6)
    a.figura('pagina-emmy2.png',
             'a página servida pelo Emmy 2, com o reticulado e os botões de comando')

    a.subtitulo('Do bloco ao microcontrolador')
    a.p('O programa completo do Emmy 2 é montado com os blocos descritos, sem nenhuma '
        'linha de código escrita à mão, e a cadeia que o leva ao robô é a mesma de '
        'qualquer projeto do ambiente: os blocos são convertidos em C++, exibido em '
        'tempo real ao lado da área de trabalho, o código é compilado e gravado na '
        'memória do microcontrolador pelo próprio NoCodeMCU. É essa exibição contínua '
        'que responde à recomendação de Wang et al. (2025) sobre pré-visualização e '
        'depuração em ambientes de baixo código, e é ela que sustenta a saída para o '
        'texto defendida por Fraser (2015).', espaco_depois=6)
    a.figura('fluxo-cadeia-nocodemcu.png',
             'cadeia de transformação do NoCodeMCU: do bloco ao microcontrolador')

    # ---------------- resultados ----------------
    a.titulo('Resultados')
    a.subtitulo('Procedimento de ensaio')
    a.p('O ensaio proposto verifica se cada estado do reticulado é efetivamente '
        'alcançado pela montagem e se a manobra associada a ele resolve a situação que '
        'o produziu. São cinco cenários, todos com o robô partindo a um metro do '
        'obstáculo e com a página aberta no celular para registro: obstáculo frontal '
        'ocupando toda a largura do robô, que deve produzir o estado Verdadeiro; '
        'corredor livre, que deve produzir o Falso; obstáculo cobrindo apenas o campo do '
        'sensor esquerdo e, em seguida, apenas o do direito, que devem produzir os dois '
        'estados de discordância; e parede oblíqua a quarenta e cinco graus, em que a '
        'diferença entre as duas distâncias cresce continuamente.')
    a.p('Cada cenário é repetido dez vezes. De cada repetição registram-se as duas '
        'distâncias, o par (μ, λ), o estado nomeado na página, a manobra executada e o '
        'desfecho, entendido como o robô ter ou não deixado de ver o obstáculo ao fim da '
        'manobra. O registro é feito a partir da própria página, o que dispensa '
        'instrumentação externa e mantém o dado observado idêntico ao dado que decidiu. '
        'Os tempos de manobra usados são os do programa apresentado, e a calibração das '
        'velocidades permanece a mesma em todos os cenários.', espaco_depois=6)
    a.tabela('registro dos ensaios por cenário',
             ['Cenário', 'Estado esperado', 'Estado observado',
              'Acerto em 10 tentativas', 'Observações'],
             [['Obstáculo frontal', 'V', '[a preencher]', '[a preencher]', ''],
              ['Corredor livre', 'F', '[a preencher]', '[a preencher]', ''],
              ['Obstáculo à esquerda', 'discordância', '[a preencher]', '[a preencher]', ''],
              ['Obstáculo à direita', 'discordância', '[a preencher]', '[a preencher]', ''],
              ['Parede oblíqua', 'V ou discordância', '[a preencher]', '[a preencher]', '']])
    a.p('A tabela permanece com os campos em aberto porque os ensaios ainda não foram '
        'executados com a montagem definitiva. O procedimento está descrito aqui na '
        'forma em que será aplicado, de modo que os resultados possam ser reportados sem '
        'alteração do método.')

    a.subtitulo('Verificação do programa gerado')
    a.p('Independentemente do ensaio com o robô, três propriedades do programa já '
        'foram verificadas. A primeira é que o C++ produzido pelos blocos compila, sem '
        'ajuste manual, tanto para o ESP32 quanto para o ESP8266, com a biblioteca de '
        'rede correta escolhida conforme a arquitetura da placa selecionada. A segunda é '
        'que a conversão do programa entre o Modo Abstrato e o Modo Literal preserva o '
        'arquivo gerado, o que foi verificado por comparação caractere a caractere '
        'entre o código anterior e o posterior à conversão, bloco a bloco e exemplo a '
        'exemplo. A terceira é que os blocos que não possuem forma literal equivalente, '
        'entre eles os da página web, são mantidos como estão e relatados ao usuário, '
        'em vez de convertidos parcialmente.')
    a.p('Essas verificações não substituem o ensaio físico, e não é essa a intenção. '
        'Elas delimitam o que já se pode afirmar sobre a ferramenta antes de afirmar '
        'qualquer coisa sobre o robô, o que importa particularmente em um ambiente de '
        'programação destinado ao ensino, onde um erro silencioso de geração de código '
        'seria atribuído pelo estudante ao próprio raciocínio.')

    # ---------------- considerações ----------------
    a.titulo('Considerações finais')
    a.p('O Emmy 2 mostra que a Lógica Paraconsistente Anotada de anotação com dois '
        'valores pode ser abstraída em blocos No-Code sem que a decisão se torne opaca. '
        'A anotação continua sendo a proposição que o projetista escreveu, os cortes do '
        'Para-Analisador continuam visíveis, e o reticulado servido pela própria placa '
        'mostra, em tempo real, o ponto que produziu a manobra. O que a camada de '
        'abstração retirou do usuário foram as decisões que nunca foram dele, como '
        'declarar pinos, montar o pulso do sensor de ultrassom, escrever o servidor e '
        'repetir quatro escritas analógicas a cada manobra.')
    a.p('A aplicação também sugere uma leitura operacional para a atitude que os '
        'autores do robô original descrevem como parar e procurar novo ângulo de '
        'captação. Nos estados de discordância aqui observados, o Intervalo de Certeza '
        'cai a pouco mais de um quarto e a distância calculada pelo Nó de Análise '
        'Paraconsistente ultrapassa a unidade, o que significa que não existe certeza '
        'real a extrair daquela anotação. A imobilidade, porém, preserva a mesma '
        'discordância no ciclo seguinte, e com ela a mesma indefinição. Substituir a '
        'parada por uma manobra curta que altera a geometria antes de medir de novo '
        'mantém a intenção descrita por Da Silva Filho, Torres e Abe (2006) e é '
        'coerente com a recomendação de diluir a contradição em vez de decidir sob ela.')
    a.p('Os limites são conhecidos e devem ser declarados. A montagem trabalha com duas '
        'fontes de mesma natureza, e sensores de ultrassom apresentam leitura degradada '
        'em superfícies oblíquas e absorventes, o que reduz a confiança justamente nos '
        'cenários de discordância; a página é servida em uma rede aberta e sem '
        'autenticação, condição aceitável em bancada e inadequada fora dela; e os '
        'resultados quantitativos do ensaio ainda não foram levantados.')
    a.p('Como continuidade, pretende-se executar o ensaio descrito e reportar os '
        'resultados, acrescentar uma terceira fonte de leitura de natureza diferente, o '
        'que permitiria tratar a discordância entre modalidades e não apenas entre '
        'sensores iguais, e incorporar o algoritmo extrator de efeitos da contradição '
        '(DA SILVA FILHO, 2009) ao conjunto de blocos, de modo que a contradição deixe '
        'de ser apenas classificada e passe a ser gradativamente extraída.')

    # ---------------- referências ----------------
    a.titulo('Referências')
    a.referencias(REFERENCIAS)


# Palavras que antecedem o sobrenome numa citação no corpo ("Para Fulano (ano)")
# e que o apanhador de citações recolhe junto.
PREFIXOS = ('PARA ', 'SEGUNDO ', 'CONFORME ', 'EM ', 'E ')


def conferir(a):
    """Toda obra citada no texto tem de estar nas referências.

    A conferência aceita o sobrenome de QUALQUER autor da referência, e não só
    o do primeiro: no corpo, a citação de três autores aparece por extenso
    ("Da Silva Filho, Torres e Abe (2006)") e o apanhador recolhe os três.
    """
    chaves = set()
    for ref in REFERENCIAS:
        anos = set(re.findall(r'\b((?:19|20)\d{2})\b', ref))
        autores = ref.split('.')[0]
        for autor in autores.split(';'):
            sobrenome = autor.split(',')[0].strip().upper()
            if sobrenome:
                for ano in anos:
                    chaves.add((sobrenome, ano))
    orfas = []
    for nome, ano in sorted(a.citadas):
        nome = nome.upper().strip()
        for pre in PREFIXOS:
            if nome.startswith(pre):
                nome = nome[len(pre):]
        if not nome:
            continue
        if not any(nome.startswith(k[0][:10]) or k[0].startswith(nome[:10])
                   for k in chaves if k[1] == ano):
            orfas.append('%s (%s)' % (nome, ano))
    return orfas


def main():
    a = Artigo()
    montar(a)
    a.salvar(SAIDA)

    print('✓ ' + os.path.relpath(SAIDA, RAIZ))
    print('  figuras: %d   tabelas: %d' % (a.n_figura, a.n_tabela))
    if a.faltando:
        print('  a capturar ainda: ' + ', '.join(a.faltando))
    orfas = conferir(a)
    if orfas:
        print('  ! citadas no texto e ausentes das referências: ' + ', '.join(orfas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
