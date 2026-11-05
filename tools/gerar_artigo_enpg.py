#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/artigo-enpg-qualidade.docx e .doc — a versão do artigo da esteira
no molde do ENPG (Encontro Nacional de Pós-Graduação).

    python3 tools/gerar_artigo_enpg.py

Não é o artigo longo reformatado. O ENPG dá cinco páginas, e nelas só cabe um
argumento: a ordem em que o Para-Analisador avalia os estados extremos, que
aprova peça com os dois sensores em contradição máxima. A bancada entra como
evidência desse argumento, e não como tema.

Os números vêm de gerar_artigo_qualidade.py, e é de propósito: são os mesmos
que estão no exemplo 14, e importá-los é o que impede os dois artigos de
divergirem na terceira casa decimal sem ninguém perceber.

O molde é o de docs/ModeloENPG-2025.doc — Times New Roman 12, entrelinha 1,5,
margens de 3/2/3/2 cm, resumo de até 800 caracteres, citações Vancouver
numeradas na ordem de aparição, legenda de figura embaixo e de tabela em cima,
sem linha de fonte. Nada disso coincide com o molde da dissertação, então a
classe daqui é nova; só as contas é que são emprestadas.

Ao final o script confere o que a Comissão Técnica de Formatação do ENPG
confere — número de páginas, tamanho do arquivo, limite do resumo, resolução
das figuras — e não declara sucesso se algum estourar.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))

from gerar_artigo_qualidade import (                                # noqa: E402
    LONA, UD_MIN, UD_MAX, LIM_PECA, analisar, conferir_lpa2v,
    desenhar_faixa, preparar_foto, n, ns)

IMG = os.path.join(RAIZ, 'docs', 'img')
IMG_ESTEIRA = os.path.join(RAIZ, 'docs', 'img_fisico_esteira')
SAIDA = os.path.join(RAIZ, 'docs', 'artigo-enpg-qualidade.docx')

JUST = WD_ALIGN_PARAGRAPH.JUSTIFY
CENTRO = WD_ALIGN_PARAGRAPH.CENTER
ESQ = WD_ALIGN_PARAGRAPH.LEFT
PRETO = RGBColor(0, 0, 0)

LIMITE_RESUMO = 800          # caracteres com espaços
LIMITE_ARQUIVO = 1.2 * 1024 * 1024
PAGINAS_MIN, PAGINAS_MAX = 3, 5
DPI_MIN = 300


# ====================================================================== #
# REFERÊNCIAS — Vancouver, na forma dos exemplos do próprio modelo        #
# ====================================================================== #
#
# A chave é o que o texto cita; o número sai da ordem de aparição, e quem o
# atribui é o documento. Escrever "[7]" à mão no texto é o caminho curto para
# uma lista numerada fora de ordem.

FONTES = {
    'mighouar': 'Mighouar Z, Melloui J, Mansouri K, Ech-chhibat MEH, Zahiri L. '
                'A systematic review of deep learning based machine vision for '
                'quality control in industry 4.0. Discover Mechanical '
                'Engineering. 2026;5(1):141. doi: 10.1007/s44245-026-00320-w.',

    'maslanka': 'Maślanka M, Jancarczyk D, Rysiński J. Integration of machine '
                'vision and PLC-based control for scalable quality inspection '
                'in Industry 4.0. Sensors. 2025;25(20):6383. '
                'doi: 10.3390/s25206383.',

    'dacosta': 'Da Costa NCA. On the theory of inconsistent formal systems. '
               'Notre Dame Journal of Formal Logic. 1974;15(4):497-510. '
               'doi: 10.1305/ndjfl/1093891487.',

    'dsf2006': 'Da Silva Filho JI. Métodos de aplicações da Lógica '
               'Paraconsistente Anotada de anotação com dois valores – LPA2v. '
               'Seleção Documental. 2006;1(1):18-25.',

    'emmy': 'Da Silva Filho JI, Torres CR, Abe JM. Robô móvel autônomo Emmy: '
            'uma aplicação eficiente da Lógica Paraconsistente Anotada. '
            'Seleção Documental. 2006;(3):19-26.',

    'nap': 'Da Silva Filho JI, Lambert-Torres G, Abe JM. Inteligência '
           'artificial com as redes de análises paraconsistentes: teoria e '
           'aplicações. Rio de Janeiro: LTC; 2009. 339 p.',

    'correa': 'Corrêa MP, Machado AC, Da Silva Filho JI, Garcia DV, Mario MC, '
              'Sedano CTS. Paraconsistent annotated logic applied to industry '
              'assets condition monitoring and failure prevention based on '
              'vibration signatures. Research, Society and Development. '
              '2022;11(1):e14211125104. doi: 10.33448/rsd-v11i1.25104.',

    'matos': 'Matos SLC, Lorenzo RB. Rede de análise paraconsistente com '
             'compensador de tempo morto aplicado em sintonia de controladores '
             'para um processo industrial. Revista Científica SENAI-SP. '
             '2023;1(1):107-27.',


    'revisao': 'De Carvalho Junior A, Justo JF, De Oliveira AM, Da Silva Filho '
               'JI. A comprehensive review on paraconsistent annotated '
               'evidential logic: algorithms, applications, and perspectives. '
               'Engineering Applications of Artificial Intelligence. '
               '2024;127:107342. doi: 10.1016/j.engappai.2023.107342.',

}


# ====================================================================== #
# O MOLDE DO ENPG                                                        #
# ====================================================================== #

class ArtigoENPG:
    """Documento no molde de submissão do ENPG.

    Nem o Doc de docx_comum.py nem o Artigo de gerar_artigo_emmy2.py servem
    aqui: aquele é Calibri com títulos coloridos, este é Arial com margens de
    2,5 cm e legenda ABNT com linha de fonte. O ENPG é Times New Roman, 3/2/3/2
    e legenda sem fonte. Herdar um dos dois custaria mais em sobrescrita do que
    escrever o molde certo.
    """

    def __init__(self):
        self.doc = Document()
        self.n_figura = 0
        self.n_tabela = 0
        self.numeros = {}        # chave da fonte -> número Vancouver
        self.avisos = []
        self._preparar()

    def _preparar(self):
        for s in self.doc.sections:
            s.page_width, s.page_height = Cm(21), Cm(29.7)
            s.top_margin = s.left_margin = Cm(3)
            s.bottom_margin = s.right_margin = Cm(2)
        est = self.doc.styles['Normal']
        est.font.name = 'Times New Roman'
        est.font.size = Pt(12)
        est.font.color.rgb = PRETO
        pf = est.paragraph_format
        pf.line_spacing = 1.5
        pf.space_after = Pt(3)
        pf.alignment = JUST

    # ------------------------- citações -------------------------

    def _citar(self, texto):
        """Troca {{chave}} e {{chave1,chave2}} pelo número Vancouver.

        A numeração é atribuída na primeira aparição, que é justamente o que a
        norma pede — e é o que nenhum autor consegue manter à mão depois do
        terceiro corte de parágrafo.
        """
        def resolver(m):
            nums = []
            for chave in m.group(1).split(','):
                chave = chave.strip()
                if chave not in FONTES:
                    self.avisos.append('citação sem referência: ' + chave)
                    continue
                if chave not in self.numeros:
                    self.numeros[chave] = len(self.numeros) + 1
                nums.append(self.numeros[chave])
            return '[' + self._compactar(sorted(nums)) + ']'

        return re.sub(r'\{\{([^{}]+)\}\}', resolver, texto)

    @staticmethod
    def _compactar(nums):
        """[1,2,3,7] vira "1-3,7" — a forma abreviada que o modelo usa."""
        if not nums:
            return '?'
        partes, ini, ant = [], nums[0], nums[0]
        for v in nums[1:] + [None]:
            if v == ant + 1:
                ant = v
                continue
            partes.append(str(ini) if ini == ant
                          else ('%d-%d' % (ini, ant) if ant > ini + 1
                                else '%d,%d' % (ini, ant)))
            ini = ant = v
        return ','.join(partes)

    # ------------------------- passagens -------------------------

    def _par(self, alinhar=JUST, simples=False, antes=0, depois=3):
        par = self.doc.add_paragraph()
        par.alignment = alinhar
        pf = par.paragraph_format
        pf.line_spacing = 1.0 if simples else 1.5
        pf.space_before = Pt(antes)
        pf.space_after = Pt(depois)
        return par

    def titulo(self, texto, simples=True):
        par = self._par(JUST, simples=simples, antes=0, depois=6)
        par.add_run(texto).bold = True
        return par

    def secao(self, nome):
        """Subtítulo: maiúsculas e minúsculas, negrito, sem numeração."""
        par = self._par(ESQ, simples=False, antes=10, depois=2)
        par.add_run(nome).bold = True
        return par

    def p(self, texto, simples=False, rotulo=None):
        par = self._par(JUST, simples=simples)
        if rotulo:
            par.add_run(rotulo).bold = True
        par.add_run(self._citar(texto))
        return par

    def autores(self, pessoas, afiliacoes, email):
        par = self._par(JUST, simples=True, depois=2)
        for i, (nome, indices) in enumerate(pessoas):
            if i:
                par.add_run(', ')
            par.add_run(nome)
            par.add_run(indices).font.superscript = True
        for i, af in enumerate(afiliacoes, 1):
            par = self._par(JUST, simples=True, depois=0)
            par.add_run(str(i)).font.superscript = True
            par.add_run(af)
        # E-mail em texto puro: o modelo o traz como hiperlink, e o regulamento
        # proíbe hiperlinks. O python-docx não cria nenhum por conta própria,
        # então basta não pedir.
        par = self._par(JUST, simples=True, antes=2, depois=8)
        par.add_run('E-mail: ' + email)

    def figura(self, arquivo, legenda, larg_cm, base=IMG):
        from PIL import Image as PILImage

        caminho = os.path.join(base, arquivo)
        self.n_figura += 1
        if not os.path.exists(caminho):
            self.avisos.append('figura ausente: ' + arquivo)
            return
        px = PILImage.open(caminho).size[0]
        dpi = px / (larg_cm / 2.54)
        if dpi < DPI_MIN:
            self.avisos.append(
                '%s sai a %d dpi impressa em %.1f cm — o ENPG exige %d'
                % (arquivo, dpi, larg_cm, DPI_MIN))
        self.doc.add_picture(caminho, width=Cm(larg_cm))
        self.doc.paragraphs[-1].alignment = CENTRO
        self.doc.paragraphs[-1].paragraph_format.space_after = Pt(2)
        self._legenda('Figura %d.' % self.n_figura, legenda, antes=0)

    def tabela(self, legenda, cabecalho, linhas):
        """Legenda em cima, ao contrário da figura — é como o modelo faz."""
        self.n_tabela += 1
        self._legenda('Tabela %d.' % self.n_tabela, legenda, antes=8, depois=2)

        tab = self.doc.add_table(rows=1, cols=len(cabecalho))
        tab.style = 'Table Grid'
        tab.alignment = CENTRO
        for celulas, textos, negrito in [(tab.rows[0].cells, cabecalho, True)] + \
                [(tab.add_row().cells, linha, False) for linha in linhas]:
            for c, txt in zip(celulas, textos):
                c.text = ''
                p = c.paragraphs[0]
                p.alignment = CENTRO
                p.paragraph_format.line_spacing = 1.0
                p.paragraph_format.space_after = Pt(0)
                r = p.add_run(str(txt))
                r.bold = negrito
                r.font.name = 'Times New Roman'
                r.font.size = Pt(10)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(4)

    def _legenda(self, rotulo, texto, antes=0, depois=8):
        par = self._par(CENTRO, simples=True, antes=antes, depois=depois)
        r = par.add_run(rotulo + ' ')
        r.bold = True
        r.font.size = Pt(10)
        r = par.add_run(texto)
        r.font.size = Pt(10)

    def referencias(self):
        nao_citadas = [k for k in FONTES if k not in self.numeros]
        for k in nao_citadas:
            self.avisos.append('referência nunca citada: ' + k)
        for chave, num in sorted(self.numeros.items(), key=lambda kv: kv[1]):
            par = self._par(JUST, simples=True, depois=0)
            par.add_run('%d. %s' % (num, FONTES[chave])).font.size = Pt(10)

    def salvar(self, caminho):
        self.doc.save(caminho)


# ====================================================================== #
# O TEXTO                                                                #
# ====================================================================== #

TITULO_PT = ('Controle de qualidade dimensional em esteira transportadora com '
             'Lógica Paraconsistente Anotada: a grandeza que decide')
TITULO_EN = ('Dimensional quality control on a conveyor belt with '
             'Paraconsistent Annotated Logic: the deciding quantity')

RESUMO = (
    'A inspeção dimensional automatizada decide por comparação com um limiar, e '
    'a discordância entre dois sensores que medem a mesma peça costuma ser '
    'eliminada por média antes da decisão. Este trabalho aplica a Lógica '
    'Paraconsistente Anotada de anotação com dois valores a um portão de '
    'qualidade em esteira, com dois ultrassons avaliando a proposição "a peça '
    'mede entre 1,0 e 1,5 cm". A validação numérica mostrou que o algoritmo '
    'Para-Analisador, por testar o Grau de Certeza antes do Grau de '
    'Contradição, aprova peça com os sensores discordando em mais da metade da '
    'tolerância. Decidir pelo Grau de Certeza Real corrige o caso sem limiar '
    'arbitrado.')

CHAVES = ('lógica paraconsistente anotada; LPA2v; controle de qualidade; '
          'inspeção dimensional; Para-Analisador.')

ABSTRACT = (
    'Automated dimensional inspection decides by comparison against a '
    'threshold, and disagreement between two sensors measuring the same part is '
    'usually removed by averaging before the decision. This work applies '
    'Paraconsistent Annotated Logic with annotation of two values to a conveyor '
    'belt quality gate, with two ultrasonic sensors assessing the proposition '
    '"the part measures between 1.0 and 1.5 cm". Numerical validation showed '
    'that the Para-Analyzer algorithm, by testing the Degree of Certainty '
    'before the Degree of Contradiction, approves parts while the sensors '
    'disagree by more than half the tolerance. Deciding by the Real Degree of '
    'Certainty fixes the case with no arbitrary threshold.')

KEYWORDS = ('paraconsistent annotated logic; PAL2v; quality control; '
            'dimensional inspection; Para-Analyzer.')

# Os casos da Tabela 1 — só os que o argumento usa. As alturas são as mesmas
# do artigo longo e do exemplo 14; quem as converte em distância é analisar().
CASOS_ENPG = [
    ('1,25 e 1,25 cm', 1.25, 1.25),
    ('0,80 e 0,80 cm', 0.80, 0.80),
    ('1,70 e 1,70 cm', 1.70, 1.70),
    ('1,25 e 0,97 cm', 1.25, 0.97),
    ('1,25 e 0,95 cm', 1.25, 0.95),
    ('1,25 e 0,90 cm', 1.25, 0.90),
]


def linhas_enpg():
    linhas = []
    for desc, h1, h2 in CASOS_ENPG:
        a = analisar(LONA - h1, LONA - h2)
        linhas.append([desc, n(a['mu']), n(a['lam']), ns(a['Gc']), ns(a['Gct']),
                       ns(a['Gcr'], 3), a['estado'], a['decisao']])
    return linhas


def montar(a):
    a.titulo(TITULO_PT)
    a.autores(
        [('[Autor 1 — nome completo]', '1'),
         ('[Autor 2 — orientador, nome completo]', '1')],
        ['Universidade Santa Cecília (UNISANTA) — Programa de Pós-Graduação em '
         'Engenharia Mecânica, Santos-SP, Brasil'],
        '[e-mail do primeiro autor]')
    a.p(RESUMO, simples=True, rotulo='Resumo: ')
    a.p(CHAVES, simples=True, rotulo='Palavras-chave: ')
    a.titulo(TITULO_EN)
    a.p(ABSTRACT, simples=True, rotulo='Abstract: ')
    a.p(KEYWORDS, simples=True, rotulo='Keywords: ')

    # ------------------------- Introdução -------------------------
    a.secao('Introdução')
    a.p('A inspeção automatizada de peças em linha de produção é hoje tratada '
        'sobretudo por visão computacional, tanto no reconhecimento do defeito '
        '{{mighouar}} quanto na integração com o controle da linha {{maslanka}}. O que '
        'não aparece nesses trabalhos é a situação em que duas fontes de medição, '
        'olhando para a mesma peça, discordam entre si: a arquitetura habitual resolve a '
        'divergência antes de decidir, por média ou por voto, e a discordância some do '
        'registro no instante em que aparece — embora possa significar peça na fronteira '
        'da tolerância, superfície irregular ou sensor descalibrado.')
    a.p('A Lógica Paraconsistente admite a contradição sem que o sistema se torne '
        'trivial {{dacosta}}, e sua versão anotada com dois valores extrai de duas '
        'fontes duas grandezas independentes: o Grau de Certeza, que mede o consenso a '
        'favor da proposição, e o Grau de Contradição, que mede o quanto as fontes se '
        'opõem {{dsf2006}}. Há aplicação industrial em monitoramento de ativos por '
        'vibração {{correa}} e em sintonia de controladores em cascata {{matos}}, e o '
        'baixo custo computacional dos algoritmos os torna adequados a sistemas '
        'embarcados {{revisao}}.')
    a.p('Não se localizou trabalho que aplique a lógica à inspeção dimensional em '
        'esteira. Ao construir uma bancada para isso, apareceu um problema que não é da '
        'montagem e sim do algoritmo de decisão: o Para-Analisador avalia o Grau de '
        'Certeza antes do Grau de Contradição, e por isso aprova peça cujos sensores '
        'discordam em mais da metade da tolerância verificada. Este artigo apresenta o '
        'caso, mostra por que antepor uma guarda de contradição não o resolve, e propõe '
        'decidir pelo Grau de Certeza Real.')

    # ------------------------- Objetivos -------------------------
    a.secao('Objetivos')
    a.p('Verificar se a Lógica Paraconsistente Anotada de anotação com dois valores '
        'pode decidir um portão de qualidade dimensional a partir de duas fontes que '
        'discordam entre si, e examinar se a ordem de avaliação do algoritmo '
        'Para-Analisador é adequada a essa aplicação.')

    # ------------------------- Material e Métodos -------------------------
    a.secao('Material e Métodos')
    a.p('A bancada é uma esteira de lona movida por um motor de corrente contínua sob '
        'ponte H, comandada por um Arduino Uno programado em blocos, sem escrever '
        'código. A dez centímetros da lona, um suporte graduado sustenta dois sensores '
        'de ultrassom HC-SR04 apontados para baixo, e três lâmpadas sinalizam o destino '
        'da peça. Os sensores ficam lado a lado de propósito: apontados para o mesmo '
        'trecho da mesma peça parada, uma diferença grande entre as leituras não pode '
        'ser atribuída à posição de medição, e é isso que torna a discordância '
        'informativa.')
    a.figura('bancada-esteira-enpg.jpg',
             'Bancada, com os dois sensores de ultrassom sobre a lona e a peça na '
             'janela de medição.', larg_cm=8.0, base=IMG_ESTEIRA)
    a.p('A proposição é "a peça mede entre 1,0 e 1,5 cm", e uma faixa não sai de uma '
        'normalização monotônica: uma rampa crescente daria evidência máxima a uma peça '
        'de três centímetros. Usaram-se duas valorações opostas sobre a mesma leitura — '
        'uma por "a peça não é curta demais", outra por "a peça não é comprida demais" — '
        'unidas pelo conectivo AND da própria lógica, que é a minimização entre graus de '
        'evidência {{dsf2006}}. Elas trabalham em distância, que é o que o sensor '
        'entrega, e suas rampas de 0,2 cm põem os limites nominais exatamente sobre o '
        'Grau de Certeza igual a 0,5, o valor de controle adotado. A evidência do '
        'primeiro sensor entra como grau favorável e a do segundo como desfavorável, '
        'pelo complemento.')
    a.figura('fig-faixa-qualidade-300dpi.png',
             'Grau de Evidência da proposição-faixa, pela minimização de duas '
             'valorações opostas.', larg_cm=9.5)

    # ------------------------- Resultados -------------------------
    a.secao('Resultados')
    a.p('A modelagem foi conferida caso a caso pela transformação inversa e pelo '
        'invariante |Gc| + |Gct| ≤ 1, que delimita o reticulado. A Tabela 1 traz lado a '
        'lado o estado que o Para-Analisador aponta e a decisão tomada pelo Grau de '
        'Certeza Real.')
    a.tabela('Validação numérica, com a lona a 10 cm. A primeira coluna traz as alturas '
             'vistas pelos sensores 1 e 2; a penúltima, o estado apontado pelo '
             'Para-Analisador.',
             ['Alturas', 'μ', 'λ', 'Gc', 'Gct', 'Gcr', 'Estado', 'Decisão'],
             linhas_enpg())
    a.p('Nas três primeiras linhas, sem contradição, as duas colunas finais concordam. '
        'A quarta é o resultado central: com um sensor vendo 1,25 cm e o outro 0,97 cm '
        'na mesma peça, a anotação é P(1,00; 0,40), de onde saem Gc = +0,6 e Gct = +0,4. '
        'O Grau de Certeza supera o valor de controle, e a ordem do algoritmo faz com '
        'que o Grau de Contradição sequer seja consultado: o Para-Analisador responde '
        'Verdadeiro, e a peça seria aprovada com os dois sensores discordando em '
        '0,28 cm, mais da metade da tolerância de 0,5 cm que o portão deveria verificar. '
        'O Grau de Certeza Real, na mesma anotação, vale +0,434, fica abaixo do corte e '
        'devolve a peça para nova medição. É a única linha em que as colunas divergem, '
        'e é a que um portão de qualidade não pode errar. Nas duas últimas a contradição '
        'cresce e as colunas voltam a concordar, com o Grau de Certeza Real descendo até '
        'zerar por indefinição {{nap}}.')
    a.p('O programa, montado apenas com blocos, compila para o Arduino Uno sem ajuste '
        'manual e ocupa 20 % da memória de programa e 22 % da de dados {{revisao}}.')

    # ------------------------- Discussão -------------------------
    a.secao('Discussão')
    a.p('O Para-Analisador avalia os estados extremos em ordem fixa: testa o Grau de '
        'Certeza contra os valores de controle e só então examina o Grau de Contradição '
        '{{dsf2006}}. Uma anotação aprovada no primeiro teste nunca chega ao terceiro. '
        'A ordem não está errada; é adequada ao problema para o qual foi escrita. No '
        'robô Emmy, a proposição é "existe obstáculo à frente" e o robô precisa '
        'continuar andando: privilegiar a certeza é o desejável, e a contradição alta '
        'apenas modula a manobra {{emmy}}. Num portão de inspeção a prioridade se '
        'inverte, porque aprovar sob contradição é o erro mais caro: a peça segue '
        'adiante e o registro não guarda sinal de que a evidência era contraditória.')
    a.p('A correção que ocorre primeiro é antepor um teste do Grau de Contradição, '
        'devolvendo a peça sempre que |Gct| ≥ 0,5. Ela é insuficiente, e a quarta linha '
        'da Tabela 1 é o contraexemplo: com Gct = +0,4 a guarda não dispara. O problema '
        'é estrutural, não de ajuste de limiar — pelo invariante |Gc| + |Gct| ≤ 1, um '
        'Grau de Certeza de +0,6 convive com contradição de até 0,4, e qualquer limiar '
        'escolhido deixa descoberta a vizinhança imediata dele.')
    a.p('A resposta está no próprio formulário da lógica. O Grau de Certeza Real é, por '
        'definição, a certeza já descontado o efeito da contradição, obtida pela '
        'distância D do estado ao vértice de certeza máxima, com '
        'D = √((1 − |Gc|)² + Gct²) e Gcr = 1 − D para Gc positivo {{nap}}. Ao contrário '
        'do Grau de Certeza, responde às duas coordenadas ao mesmo tempo e cai '
        'continuamente conforme a contradição cresce: vale +1,000 na peça nominal, '
        '+0,500 na que mede exatamente o limite, onde não há contradição a descontar, e '
        '+0,434 em P(1,00; 0,40). O critério passa a ser um só — Gcr ≥ +0,5 aprova, '
        'Gcr ≤ −0,5 rejeita, e o intervalo entre eles devolve a peça para nova medição. '
        'Vem junto a guarda de indefinição do Nó de Análise Paraconsistente, que anula o '
        'Grau de Certeza Real quando o Intervalo de Evidência cai a 0,25 ou a distância '
        'ultrapassa a unidade {{nap}}: contradição alta demais devolve zero, e zero não '
        'aprova nem rejeita. O reticulado permanece como diagnóstico impresso no '
        'monitor; quem assina a decisão passa a ser o Grau de Certeza Real.')
    a.p('O problema não aparece na literatura de inspeção citada porque nela a '
        'discordância entre fontes não chega a ser representada: não existindo grandeza '
        'que a meça, não existe a questão de qual grandeza deve decidir '
        '{{mighouar,maslanka}}. Quanto aos limites, a resolução dos ultrassons é da '
        'ordem de 0,3 cm, comparável à tolerância de 0,5 cm, o que torna a bancada '
        'adequada ao ensino e inadequada à metrologia; as duas fontes são de mesma '
        'natureza, de modo que falha comum aos dois sensores não produz contradição; e '
        'os ensaios com peças reais ainda não foram executados, de modo que os '
        'resultados são de validação numérica, não de desempenho medido na esteira.')

    # ------------------------- Considerações Finais -------------------------
    a.secao('Considerações Finais')
    a.p('A discordância entre dois sensores pode ser o critério de decisão de um portão '
        'de qualidade, e não um ruído a eliminar antes dele; e a escolha da grandeza que '
        'decide é questão de projeto tão importante quanto a modelagem da proposição, '
        'porque a ordem de avaliação do Para-Analisador, adequada a um robô que precisa '
        'continuar andando, aprova peça com os sensores em franca discordância quando '
        'transposta para um portão de inspeção, antepor uma guarda de contradição não '
        'resolve, e decidir pelo Grau de Certeza Real resolve com uma grandeza já '
        'existente no formulário da lógica. Como continuidade, pretende-se executar os '
        'ensaios com peças reais e substituir um dos ultrassons por sensor de outra '
        'natureza.')

    a.secao('Referências')
    a.referencias()


# ====================================================================== #
# CONVERSÃO E CONFERÊNCIAS                                               #
# ====================================================================== #

def recortar_bancada():
    """Recorta a foto da bancada, deixando só a esteira.

    O enquadramento original é vertical e traz metade da cozinha e o notebook —
    num artigo de cinco páginas, uma figura com proporção de retrato consome o
    espaço de meia página para mostrar sobretudo o que não interessa. O recorte
    sai da foto em resolução plena, e não da versão já reduzida, para sobrar
    pixel suficiente para os 300 dpi que o ENPG exige.
    """
    from PIL import Image, ImageOps

    origem = os.path.join(IMG_ESTEIRA, 'IMG_20260831_175010.jpg')
    destino = os.path.join(IMG_ESTEIRA, 'bancada-esteira-enpg.jpg')
    if not os.path.exists(origem):
        return None
    img = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
    L, A = img.size
    img = img.crop((int(0.04 * L), int(0.19 * A), int(0.91 * L), int(0.58 * A)))
    img.thumbnail((1600, 1600), Image.LANCZOS)
    img.save(destino, 'JPEG', quality=86)
    return destino


def converter(origem, formato, destino_dir):
    """Chama o LibreOffice em modo headless.

    O diretório de saída fica dentro do projeto, e não em /tmp, porque o
    LibreOffice aqui é um pacote snap e o /tmp que ele enxerga não é o mesmo
    que o nosso.
    """
    os.makedirs(destino_dir, exist_ok=True)
    r = subprocess.run(
        ['libreoffice', '--headless', '--convert-to', formato,
         '--outdir', destino_dir, origem],
        capture_output=True, text=True, timeout=300)
    saida = os.path.join(
        destino_dir,
        os.path.splitext(os.path.basename(origem))[0] + '.' + formato)
    if not os.path.exists(saida):
        raise RuntimeError('conversão para .%s falhou: %s'
                           % (formato, (r.stderr or r.stdout).strip()[:300]))
    return saida


def paginas(pdf):
    r = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True)
    m = re.search(r'^Pages:\s+(\d+)', r.stdout, re.M)
    return int(m.group(1)) if m else None


def main():
    problemas = []

    problemas += conferir_lpa2v()

    for nome, texto in (('resumo', RESUMO), ('abstract', ABSTRACT)):
        if len(texto) > LIMITE_RESUMO:
            problemas.append('%s com %d caracteres — o ENPG admite %d'
                             % (nome, len(texto), LIMITE_RESUMO))

    try:
        # 1900 px impressos em 15 cm dão 322 dpi, acima do mínimo do ENPG.
        desenhar_faixa(os.path.join(IMG, 'fig-faixa-qualidade-300dpi.png'),
                       largura_px=1900)
        preparar_foto()
        recortar_bancada()
    except ImportError:
        problemas.append('Pillow ausente: as figuras não foram preparadas')

    a = ArtigoENPG()
    montar(a)
    a.salvar(SAIDA)
    problemas += a.avisos

    tmp = os.path.join(RAIZ, 'docs', '.tmp-enpg')
    doc = pdf = None
    try:
        doc = converter(SAIDA, 'doc', tmp)
        pdf = converter(SAIDA, 'pdf', tmp)
        n_pag = paginas(pdf)
        tam = os.path.getsize(doc)

        if n_pag is None:
            problemas.append('não foi possível contar as páginas do PDF')
        elif not (PAGINAS_MIN <= n_pag <= PAGINAS_MAX):
            problemas.append('%d páginas — o ENPG admite de %d a %d'
                             % (n_pag, PAGINAS_MIN, PAGINAS_MAX))
        if tam > LIMITE_ARQUIVO:
            problemas.append('%.2f MB — o ENPG admite 1,20 MB'
                             % (tam / 1024 / 1024))

        destino_doc = os.path.splitext(SAIDA)[0] + '.doc'
        shutil.move(doc, destino_doc)
        print('✓ ' + os.path.relpath(SAIDA, RAIZ))
        print('✓ ' + os.path.relpath(destino_doc, RAIZ))
        print('  %s páginas · %.0f KB · %d figuras · %d tabelas · %d referências'
              % (n_pag, tam / 1024, a.n_figura, a.n_tabela, len(a.numeros)))
    except (RuntimeError, subprocess.TimeoutExpired, OSError) as e:
        problemas.append(str(e))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if problemas:
        print('\nA Comissão Técnica de Formatação recusaria isto:')
        for p in problemas:
            print('  ! ' + p)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
