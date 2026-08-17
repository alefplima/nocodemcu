#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/lpa2v-e-o-taskarduino.docx a partir do JSON extraído por gerar_doc.js.

    python3 tools/gerar_doc.py <arquivo.json>

Não é para ser chamado à mão: use `npm run doc`, que extrai o conteúdo do
código antes e falha se alguma contagem não bater.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx_comum import (Doc, CENTRO, CINZA, PRETO, IMG, RAIZ,  # noqa: E402
                        sombrear)
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.shared import Inches, Pt, RGBColor  # noqa: E402

SAIDA = os.path.join(RAIZ, 'docs', 'lpa2v-e-o-taskarduino.docx')

# O corpo do documento (montar) foi escrito com funções livres que recebem o
# Document. Elas viraram adaptadores finos sobre docx_comum.Doc, para os dois
# geradores compartilharem estilo sem reescrever o texto já conferido.
_D = None


def p(doc, texto='', negrito=False, italico=False, tam=None, cor=None, alinhar=None):
    return _D.p(texto, negrito, italico, tam, cor, alinhar)


def rico(doc, partes):
    return _D.rico(partes)


def codigo(doc, texto):
    return _D.codigo(texto)


def equacao(doc, txt, numero=None):
    return _D.equacao(txt, numero)


def figura(doc, arquivo, legenda, larg=6.0):
    return _D.figura(arquivo, legenda, larg)


def tabela(doc, cabecalho, linhas, legenda=None, larguras=None, mono=None):
    return _D.tabela(cabecalho, linhas, legenda, larguras, mono)


def lista(doc, itens):
    return _D.lista(itens)


# ---------------------------------------------------------------------------
# Documento
# ---------------------------------------------------------------------------

def montar(d):
    global _D
    _D = Doc()
    doc = _D.doc
    c = d['contagens']

    # ---------------- capa ----------------
    p(doc, 'TaskArduino', negrito=True, tam=26, alinhar=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, 'A Lógica Paraconsistente Anotada de dois valores em blocos',
      tam=15, cor=CINZA, alinhar=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc)
    p(doc, 'Documentação técnica — como a LPA2v é abstraída em blocos, '
           'o que cada bloco gera em C++ e como a análise aparece em tempo real.',
      italico=True, alinhar=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc)
    p(doc, 'Gerado por  npm run doc  a partir do código-fonte, em %s.'
      % d['gerado'][:10], tam=9, cor=CINZA, alinhar=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_page_break()

    # ---------------- 1 ----------------
    doc.add_heading('1. O problema: decidir com sensores que se contradizem', 1)
    p(doc, 'Um robô com dois sensores apontados para o mesmo ponto às vezes recebe '
           'leituras que discordam, a lógica clássica, binária, 0 ou 1, verdadeiro ou '
           'falso, não trata isso isso. Na lógica binária uma proposição é verdadeira '
           'ou falsa, contradições são descartada ou se deduz qualquer coisa, quando '
           'essa informação divergente entra no sistema ou é persistido em banco de '
           'dados gera o que é conhecido como o princípio da trivialização, '
           'inconsistência ou explosão, que na prática hora informa para o usuário uma '
           'coisa hora informa outra. Na programação essa discordância acaba escolhendo '
           'uma das medições de um dos sensor, tirando a média ou ignorando o conflito, '
           'e o sistema perde justamente a informação mais valiosa: a de que as fontes '
           'não concordam.')
    p(doc, 'As lógicas paraconsistentes revogam o princípio da não-contradição em sua '
           'forma forte e aceitam inconsistências sem trivializar. A Lógica '
           'Paraconsistente Anotada com anotação de dois valores (LPA2v), na '
           'formulação de aplicação do Professor Dr. João Inácio Da Silva Filho, '
           'transforma isso em '
           'aritmética simples, implementável num microcontrolador de 8 bits.')
    rico(doc, [
        ('No TaskArduino a LPA2v é a categoria ', None),
        ('Lógica Paraconsistente', 'b'),
        (': %d blocos que levam o aluno da leitura crua do sensor até uma decisão, '
         'passando pelas mesmas equações do material da disciplina.' % c['blocosLp'],
         None)])

    # ---------------- 2 ----------------
    doc.add_heading('2. Fundamentos da LPA2v', 1)

    doc.add_heading('2.1 A anotação', 2)
    p(doc, 'Cada proposição vem acompanhada de um par ordenado (μ, λ), com ambos os '
           'valores reais entre 0 e 1 e independentes entre si:')
    lista(doc, [
        [('μ', 'b'), (' — Grau de Evidência favorável à proposição', None)],
        [('λ', 'b'), (' — Grau de Evidência desfavorável (contrária)', None)],
    ])
    p(doc, 'O par é representado no Quadrado Unitário do Plano Cartesiano, com μ no '
           'eixo horizontal e λ no vertical. Os quatro cantos são os estados '
           'extremos: V (verdadeiro), F (falso), T (inconsistente — as duas '
           'evidências no máximo) e ⊥ (indeterminado — as duas nulas).')
    figura(doc, 'fig1-qupc.png',
           'o Quadrado Unitário do Plano Cartesiano e os quatro estados extremos', 4.9)

    doc.add_heading('2.2 Grau de Certeza e Grau de Contradição', 2)
    p(doc, 'Uma expansão de escala, uma rotação de 45° e uma translação levam o '
           'quadrado ao reticulado de trabalho. A composição das três transformações '
           'é T(x, y) = (x − y, x + y − 1), de onde saem as duas grandezas centrais:')
    equacao(doc, 'Gc = μ − λ', '1')
    equacao(doc, 'Gct = μ + λ − 1', '2')
    p(doc, 'Gc é o eixo horizontal do reticulado e mede o quanto se pode afirmar ou '
           'negar a proposição. Gct é o eixo vertical e mede o quanto as fontes se '
           'contradizem. O estado lógico é o ponto ετ = (Gc, Gct).')
    figura(doc, 'fig2-reticulado.png',
           'o reticulado da LPA2v, com os eixos Gc e Gct', 4.9)
    p(doc, 'A transformação é invertível, então de um estado se recupera a anotação:')
    equacao(doc, 'μ = (Gc + Gct + 1) / 2        λ = (−Gc + Gct + 1) / 2', '3')

    doc.add_heading('2.3 Por que o reticulado é um losango', 2)
    p(doc, 'Gc e Gct não são independentes. Como ambos vêm do mesmo par (μ, λ) do '
           'quadrado unitário, a região alcançável é o losango:')
    equacao(doc, '|Gc| + |Gct| ≤ 1', '4')
    p(doc, 'Um par (Gc, Gct) fora dele não provém de anotação nenhuma. Esse é um '
           'ponto que costuma escapar: em exercícios de recuperação, valores de '
           'saída escolhidos livremente produzem μ maior que 1, o que é impossível.')

    doc.add_heading('2.4 As 12 regiões', 2)
    p(doc, 'Além dos quatro vértices, o reticulado é dividido por valores de controle '
           'ajustáveis — Vscc e Vicc no eixo de certeza, Vscct e Vicct no de '
           'contradição, tipicamente ±0,5. A resolução 12 é decisão de projeto: o '
           'quadrado pode ser repartido em quantas regiões a aplicação exigir.')
    figura(doc, 'fig3-12-estados.png',
           'as 12 regiões e os valores de controle', 4.9)
    p(doc, 'Os oito estados não-extremos são nomeados pela proximidade com o vértice '
           'correspondente: Qv→T, Qv→⊥, Qf→T, Qf→⊥ (quase-verdadeiro e quase-falso, '
           'tendendo ao inconsistente ou ao indeterminado) e T→v, T→f, ⊥→v, ⊥→f.')

    doc.add_heading('2.5 Intervalo de Certeza, distância e Grau de Certeza Real', 2)
    p(doc, 'Quanto maior a contradição, menos espaço sobra para a certeza. O '
           'Intervalo de Certeza φ mede esse espaço, e a distância D do estado ao '
           'vértice de certeza máxima dá a certeza já descontado o efeito da '
           'contradição:')
    equacao(doc, 'φ = 1 − |Gct|', '5')
    equacao(doc, 'D = √( (1 − |Gc|)² + Gct² )', '6')
    equacao(doc, 'Gcr = 1 − D   se Gc > 0        Gcr = D − 1   se Gc < 0', '7')
    equacao(doc, 'μEr = (Gcr + 1) / 2', '8')
    figura(doc, 'fig4-gcr.png',
           'Gcr como projeção da distância D sobre o eixo de certeza', 4.9)

    doc.add_heading('2.6 A guarda de indefinição', 2)
    p(doc, 'Antes de calcular Gcr, o Nó de Análise Paraconsistente verifica se a '
           'análise conclui alguma coisa. Se φ ≤ 0,25 ou D > 1, o resultado é '
           'indefinição: Gcr vale 0 e μEr vale 0,5.')
    rico(doc, [
        ('Esse passo não é opcional. ', 'b'),
        ('Sem ele, um Gc negativo com D > 1 devolve um Gcr positivo — certeza real '
         'de sinal contrário ao Grau de Certeza, o que não significa nada. O par '
         '(μ = 0,125; λ = 0,178) dá D = 1,176 e cai exatamente nessa armadilha.',
         None)])

    # ---------------- 3 ----------------
    doc.add_heading('3. Como o software abstrai a lógica', 1)

    doc.add_heading('3.1 Uma exceção deliberada', 2)
    rico(doc, [
        ('O TaskArduino tem uma promessa: ', None),
        ('um bloco é um comando da linguagem Arduino', 'b'),
        ('. Nenhum bloco junta comandos, nenhum pino é implícito, nada é injetado '
         'por conta própria. A categoria de Lógica Paraconsistente é a única '
         'exceção, porque a LPA2v não existe como comando do Arduino.', None)])
    p(doc, 'A abstração é honesta porque não esconde o resultado: cada bloco vira uma '
           'chamada a uma função com o nome da grandeza da teoria, e a função inteira '
           'aparece no painel de código, ao lado dos blocos. O aluno pode ler, copiar '
           'e conferir contra o material da disciplina.')
    codigo(doc, d['exemplo']['runtimeGc'] or
           '// Grau de Certeza\nfloat lpaGc(float mu, float lam) { return mu - lam; }')
    figura(doc, 'exemplo_menu.png',
           'blocos à esquerda, o C++ correspondente à direita', 6.2)

    doc.add_heading('3.2 A cadeia bloco → gerador → sketch', 2)
    p(doc, 'A implementação segue a arquitetura que o resto do aplicativo já usava:')
    lista(doc, [
        [('src/renderer/js/blocks/lp.js', 'm'),
         (' — a forma dos blocos: rótulos, entradas, encaixes e cores.', None)],
        [('src/renderer/js/generator/gen_lp.js', 'm'),
         (' — o que cada bloco escreve no .ino, e o runtime C++.', None)],
        [('src/renderer/js/toolbox.js', 'm'),
         (' — a categoria na barra lateral. Sem filtro de placa: LPA2v é software '
          'puro e roda igual no Uno e no ESP32.', None)],
        [('src/renderer/js/validate.js', 'm'),
         (' — as cobranças de coerência, avisadas no próprio bloco.', None)],
    ])

    doc.add_heading('3.3 Runtime emitido sob demanda', 2)
    rico(doc, [
        ('O runtime é organizado em %d entradas. ' % c['runtime'], None),
        ('Nenhuma entra no sketch sem ser pedida', 'b'),
        (': cada gerador chama precisa(gen, nome), que resolve as dependências '
         'recursivamente e insere primeiro quem é chamado. Quem usa só o Grau de '
         'Certeza não arrasta o sqrt() do Grau de Certeza Real.', None)])
    p(doc, 'A dedução da ordem dispensa protótipos: as definições vão para o '
           'repositório de globais do gerador, que preserva a ordem de inserção, e o '
           'arquivo sai com definição antes do uso. As chaves também deduplicam — '
           'vinte blocos pedindo lpaGc emitem a função uma vez só.')
    tabela(doc,
           ['definição', 'papel'],
           [
               ['enum LpaEstado', 'os 12 estados como constantes nomeadas'],
               ['lpaEvidencia', 'normaliza a leitura no Universo de Discurso'],
               ['lpaGc, lpaGct', 'equações (1) e (2)'],
               ['lpaPhi, lpaD', 'Intervalo de Certeza e distância'],
               ['lpaIndefinido', 'a guarda φ ≤ 0,25 ou D > 1'],
               ['lpaGcr, lpaMuEr', 'certeza real e sua forma normalizada'],
               ['lpaEstado, lpaEstado4', 'Para-Analisador em 12 e em 4 regiões'],
               ['lpaNomeEstado', 'nome do estado, para o monitor serial'],
               ['lpaConectivo', 'lpaMax e lpaMin: OR por maximização, AND por minimização'],
               ['lpaExtractor', 'ParaExtrctr sobre um vetor de evidências'],
           ],
           legenda='as %d entradas do runtime C++' % c['runtime'],
           larguras=[2.1, 4.2], mono=[0])

    doc.add_heading('3.4 As 4 regiões são o colapso das 12', 2)
    p(doc, 'A resolução 4 não é obtida zerando os valores de controle — isso degenera '
           'para verdadeiro/falso, e os estados T e ⊥ nunca disparariam. A regra '
           'correta é a do vértice mais próximo: se |Gc| ≥ |Gct| o estado é V ou F, '
           'senão é T ou ⊥.')
    rico(doc, [
        ('Essa regra é ', None),
        ('exatamente', 'b'),
        (' o colapso dos 12 estados em seus vértices. Verificado por varredura de '
         '1.000.000 de pares (μ, λ) no próprio C++ gerado: nenhuma divergência. '
         'Trocar a resolução nunca contradiz.', None)])

    doc.add_heading('3.5 O Para-Analisador reaproveita o switch', 2)
    p(doc, 'O bloco de decisão é um contêiner com blocos de estado dentro, no mesmo '
           'molde que o switch/case do aplicativo já usava. O C++ gerado é um switch '
           'literal sobre o estado do reticulado:')
    codigo(doc, 'switch (lpaEstado(mu, lam, 0.5, -0.5, 0.5, -0.5)) {\n'
                '  case LPA_V:\n'
                '    // ação\n'
                '    break;\n'
                '  default:\n'
                '    // ação\n'
                '    break;\n'
                '}')
    p(doc, 'A validação cobra o que o Blockly sozinho não cobra: dentro do contêiner '
           'só entram blocos de estado, e um caso não-extremo com resolução 4 recebe '
           'aviso porque nunca vai rodar.')

    # ---------------- 4 ----------------
    doc.add_heading('4. Referência dos blocos', 1)
    p(doc, 'A coluna de C++ mostra o que cada bloco produz com os campos no valor '
           'padrão. Blocos de valor aparecem dentro de um Serial.println para dar '
           'contexto.')
    for g in d['grupos']:
        doc.add_heading(g['nome'], 2)
        tabela(doc,
               ['bloco', 'gera'],
               [[b['rotulo'] or b['tipo'], b['cpp']] for b in g['blocos']],
               larguras=[2.6, 3.7], mono=[1])
        for b in g['blocos']:
            if b['tooltip']:
                par = doc.add_paragraph()
                r = par.add_run(b['tipo'] + ' — ')
                r.font.name = 'Consolas'
                r.font.size = Pt(9)
                r.bold = True
                r2 = par.add_run(b['tooltip'])
                r2.font.size = Pt(9)
                r2.font.color.rgb = CINZA
                par.paragraph_format.space_after = Pt(2)

    # ---------------- 5 ----------------
    doc.add_heading('5. A aba Reticulado', 1)
    p(doc, 'A aba desenha o reticulado e marca, em tempo real, o ponto correspondente '
           'a cada linha recebida pela serial. Dois formatos são aceitos, no mesmo '
           'estilo de série do plotter:')
    codigo(doc, 'Serial.print("mu:");      Serial.print(mu);\n'
                'Serial.print(" lambda:"); Serial.println(lam);\n'
                '\n'
                'Serial.print("gc:");      Serial.print(lpaGc(mu, lam));\n'
                'Serial.print(" gct:");    Serial.println(lpaGct(mu, lam));')
    p(doc, 'Linha sem o par completo não move o ponto: meia anotação, ou uma linha de '
           'plotter comum como "temp:23.5 umid:60", são ignoradas de propósito.')
    figura(doc, 'ret_v.png', 'estado V — as duas fontes concordam', 6.2)
    rico(doc, [
        ('Quando a análise não conclui, o ponto e a leitura ficam âmbar e o motivo é '
         'dito — indefinição por φ ≤ 0,25 ou por D > 1. Isso não é enfeite: ', None),
        ('μEr = 0,5 é ambíguo', 'b'),
        (', pode ser indefinição ou empate legítimo, e mostrar um Gcr ali seria '
         'mentira.', None)])
    figura(doc, 'ret_t.png',
           'estado T — sensores em contradição, análise sem conclusão', 6.2)

    # ---------------- 6 ----------------
    doc.add_heading('6. Modelagem: o que o software não decide por você', 1)
    p(doc, 'Os blocos calculam corretamente qualquer par (μ, λ) que receberem. Se o '
           'par não representa o que se pensa que representa, o resultado é preciso e '
           'errado. Os quatro pontos abaixo saíram de erros reais cometidos ao montar '
           'o exemplo oficial.')

    doc.add_heading('6.1 As duas fontes precisam falar da mesma proposição', 2)
    p(doc, 'Dois ultrassons medindo o mesmo vão: a discordância entre eles é '
           'contradição de verdade, e Gct significa alguma coisa. Um sensor de altura '
           'e um indutivo são evidências diferentes — ali Gct não quer dizer nada. '
           'Nesse caso o caminho é uma rede: um NAP por proposição, ou o ParaExtrctr '
           'agregando várias evidências sobre a mesma proposição.')

    doc.add_heading('6.2 Com λ = 1 − μ₂, o Grau de Contradição é a diferença', 2)
    p(doc, 'Quando as duas fontes trazem evidência favorável e a segunda é convertida '
           'pelo complemento, as equações colapsam:')
    equacao(doc, 'Gc = μ₁ + μ₂ − 1        Gct = μ₁ − μ₂', '9')
    rico(doc, [
        ('Ou seja, Gct é literalmente a diferença entre os dois sensores. Disso '
         'decorre uma consequência que engana: ', None),
        ('T e ⊥ são a mesma discordância vista dos dois lados', 'b'),
        (' — em T a fonte 1 está acima, em ⊥ a fonte 2 está acima. ', None),
        ('Nenhum dos dois significa "sem leitura"', 'b'),
        (', porque uma fonte muda entrega μ = 0,5, não 0.', None)])

    doc.add_heading('6.3 Ausência de sujeito não é assunto da LPA2v', 2)
    p(doc, 'A proposição "a peça é grande" pressupõe que exista peça. Com a esteira '
           'vazia, os dois sensores leem longe, μ₁ = μ₂ = 0, e a análise devolve F — '
           '"peça pequena". O braço tentaria pegar o vazio. A presença tem de ser '
           'verificada antes da análise, não dentro dela.')

    doc.add_heading('6.4 Cuidado com o valor de timeout do sensor', 2)
    p(doc, 'O HC-SR04 sem eco estoura o tempo e pulseIn devolve 0. Zero centímetro é '
           'a leitura de "peça altíssima" — exatamente o oposto do que aconteceu. '
           'Sem tratar, uma esteira vazia vira estado V.')
    codigo(doc, 'if (dist1 == 0) {\n  dist1 = 100;\n}')

    # ---------------- 7 ----------------
    doc.add_heading('7. Exemplo comentado: esteira, ultrassons e braço', 1)
    rico(doc, [
        ('O projeto ', None), ('exemplos/08-lpa2v-esteira-braco.tbk', 'm'),
        (' é a aplicação de referência. A esteira roda; dois HC-SR04 lado a lado '
         'medem a altura da peça que passa; conforme o estado do reticulado, um braço '
         'de dois servos deposita a peça à esquerda ou à direita.', None)])
    p(doc, 'A proposição é "a peça é grande". Quanto mais alta a peça, menor a '
           'distância lida — por isso o Universo de Discurso vai de 25 cm (peça rasa) '
           'a 12 cm (peça alta), decrescente.')

    doc.add_heading('7.1 Leitura dos sensores', 2)
    codigo(doc, d['exemplo']['medirSensores'])

    doc.add_heading('7.2 A decisão', 2)
    codigo(doc, d['exemplo']['loop'])

    doc.add_heading('7.3 Comportamento medido', 2)
    tabela(doc,
           ['sensor 1 / 2', 'μ, λ', 'Gc', 'Gct', 'estado', 'ação'],
           [
               ['13 / 14 cm', '0,92 / 0,15', '+0,77', '+0,08', 'V', 'grande → esquerda'],
               ['23 / 24 cm', '0,15 / 0,92', '−0,77', '+0,08', 'F', 'pequena → direita'],
               ['13 / 24 cm', '0,92 / 0,92', '0,00', '+0,85', 'T', 'alarme: sensor 1 acima'],
               ['24 / 13 cm', '0,08 / 0,08', '0,00', '−0,85', '⊥', 'alarme: sensor 2 acima'],
               ['18 / 19 cm', '0,54 / 0,54', '0,00', '+0,08', 'T→v', 'ambígua, segue'],
               ['30 / 30 cm', '—', '—', '—', '—', 'esteira vazia (antes da análise)'],
           ],
           legenda='cenários do exemplo oficial, conferidos contra a referência',
           larguras=[1.0, 1.0, 0.7, 0.7, 0.7, 2.2])
    rico(doc, [
        ('O sketch ocupa ', None), ('5.986 bytes de flash (19%) e 608 bytes de RAM '
                                    '(30%)', 'b'),
        (' num Arduino Uno, e compila limpo também em ESP32 e ESP8266.', None)])
    figura(doc, 'app_final.png', 'compilação do exemplo oficial concluída', 6.2)

    # ---------------- 8 ----------------
    doc.add_heading('8. Como isto é verificado', 1)
    p(doc, 'O projeto tem três harnesses, todos executáveis por npm test:')
    lista(doc, [
        [('gerador (headless)', 'b'),
         (' — compara o C++ gerado caractere a caractere com o esperado, e exige que '
          'todo bloco tenha gerador.', None)],
        [('interface', 'b'),
         (' — o interpretador de linhas do plotter e do reticulado, a classificação '
          'nas 12 regiões e a guarda de indefinição.', None)],
        [('compilação real', 'b'),
         (' — chama o arduino-cli embutido e compila cada fixture em todas as placas '
          'com core instalado.', None)],
    ])
    tabela(doc,
           ['verificação', 'resultado'],
           [
               ['testes do gerador', '1994, sem falhas'],
               ['testes de interface', '51, sem falhas'],
               ['sketches compilados de verdade', '122, sem falhas'],
               ['runtime C++ × referência Python, 1681 pares (μ, λ)',
                'erro máximo em Gcr de 5,6 × 10⁻⁷'],
               ['divergências de estado fora de fronteira de região', 'nenhuma'],
               ['12 regiões × 4 regiões, 1.000.000 de pares', 'nenhuma divergência'],
               ['ocupação no Arduino Uno (exemplo oficial)', '19% da flash, 30% da RAM'],
           ],
           legenda='resultados da verificação',
           larguras=[3.6, 2.7])
    p(doc, 'As 48 divergências de estado que aparecem na comparação entre o C++ e a '
           'referência acontecem todas exatamente sobre fronteiras de região, onde o '
           'float de 32 bits do AVR e o de 64 bits do computador arredondam para '
           'lados diferentes. Na fronteira a escolha é arbitrária por definição.',
      tam=10, cor=CINZA)

    # ---------------- apêndice ----------------
    doc.add_page_break()
    doc.add_heading('Apêndice — erratas no material de referência', 1)
    p(doc, 'Ao conferir cada exemplo do material da disciplina contra o cálculo, '
           'apareceram divergências. Elas estão registradas aqui porque o software '
           'segue o valor correto, e quem comparar as duas coisas vai notar.')
    tabela(doc,
           ['local', 'impresso', 'correto'],
           [
               ['Aula 5, Ex. 3.4', 'GC = 0,85 − 0,55 → 0,2', 'Gc = 0,3'],
               ['Aula 5, Ex. 3.10', 'GCr = 0,43079003', '−0,43079 (Gc < 0 ⇒ Gcr < 0)'],
               ['Aula 5, Ex. 3.12', 'Gct = 1 − 0,72; GC negativo',
                'Gct = 1 − 0,7 = 0,3; Gc positivo'],
               ['Aula 5, Ex. 3.13', 'enunciado com Gcr = 0,68',
                'a resolução impressa corresponde a 0,6'],
               ['Aula 5, §4.2.2', 'D = 1 para (0,25; 0,75)',
                'D = 1,0607; vale a regra D > 1'],
               ['Aula 5, §4.3.1 item 8', 'μ + λ > 1 ⇒ φ(−)',
                'contradiz a eq. (3.5); vale Gct > 0 ⇒ φ(+)'],
               ['RNAP, célula de decisão', 'VlV = 0,5 − FtD/2', 'VlV = 0,5 + FtD/2'],
           ],
           legenda='divergências entre o material impresso e o cálculo conferido',
           larguras=[1.5, 2.3, 2.5])

    p(doc)
    p(doc, 'Referências: Da Silva Filho, J. I. — Métodos de Aplicações da Lógica '
           'Paraconsistente Anotada de anotação com dois valores LPA2v (2006) e '
           'Algoritmo Paraconsistente Extrator de efeitos da Contradição (2009); '
           'Abe, J. M. — Fundamentos da Lógica Anotada (1992); da Costa, N. C. A. — '
           'On the theory of inconsistent formal systems (1974).',
      tam=9.5, cor=CINZA)

    return doc


def main():
    if len(sys.argv) < 2:
        print('uso: gerar_doc.py <arquivo.json>')
        return 2
    with open(sys.argv[1], encoding='utf-8') as f:
        d = json.load(f)

    # As capturas do aplicativo precisam estar em docs/img para o documento
    # poder ser regerado sem depender do diretório temporário.
    os.makedirs(IMG, exist_ok=True)

    doc = montar(d)
    doc.save(SAIDA)
    print('✓ ' + os.path.relpath(SAIDA, RAIZ) +
          '  (%d figuras, %d tabelas)' % (_D.n_figura, _D.n_tabela))
    return 0


if __name__ == '__main__':
    sys.exit(main())
