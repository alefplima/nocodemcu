#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta docs/apostila-lpa2v.docx a partir do JSON extraído por gerar_apostila.js.

Não chame à mão: use `npm run doc:apostila`, que resolve os exemplos e os
gabaritos com o código do aplicativo antes e aborta se algum não fechar.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docx_comum import Doc, CENTRO, CINZA, AZUL, AMBAR, VERDE, RAIZ  # noqa: E402

SAIDA = os.path.join(RAIZ, 'docs', 'apostila-lpa2v.docx')

# filete / fundo das caixas
C_EXEMPLO = ('1F6FEB', 'EDF3FE')
C_EXERC = ('1A7F37', 'EDF7F0')
C_ATENCAO = ('9A6700', 'FBF5E8')
C_FORM = ('5A6673', 'F2F4F7')


class Apostila:
    def __init__(self, dados):
        self.d = dados
        self.D = Doc()
        self.n_ex = 0          # exemplos resolvidos
        self.n_exc = 0         # exercícios
        self.gabarito = []

    # ---------------- caixas ----------------

    def exemplo(self, titulo, enunciado, linhas):
        self.n_ex += 1
        corpo = [enunciado, ('eq', ' ')]
        corpo = [enunciado]
        for l in linhas:
            corpo.append(('eq', l))
        self.D.caixa('Exemplo resolvido %d — %s' % (self.n_ex, titulo),
                     C_EXEMPLO[0], C_EXEMPLO[1], corpo)

    def exercicio(self, enunciado, resposta_linhas, comentario):
        self.n_exc += 1
        self.D.caixa('Exercício %d' % self.n_exc, C_EXERC[0], C_EXERC[1],
                     [enunciado])
        self.gabarito.append((self.n_exc, enunciado, resposta_linhas, comentario))

    def atencao(self, linhas):
        self.D.caixa('Atenção', C_ATENCAO[0], C_ATENCAO[1], linhas)

    # ---------------- passos de um resultado ----------------

    @staticmethod
    def passos(r, ate=99):
        return r['passos'][:ate] if ate < len(r['passos']) else r['passos']

    # ---------------- o documento ----------------

    def montar(self):
        D = self.D
        d = self.d

        # ================= capa =================
        D.p('TaskArduino', negrito=True, tam=28, alinhar=CENTRO)
        D.p('Lógica Paraconsistente na prática', tam=17, cor=CINZA, alinhar=CENTRO)
        D.p()
        D.p('Apostila — da lógica clássica ao robô que decide '
            'com sensores que se contradizem', italico=True, alinhar=CENTRO)
        D.p()
        D.p()
        D.rico([('Como usar esta apostila. ', 'b'),
                ('As quatro partes se leem em ordem. A Parte I explica por que a '
                 'lógica de sempre não resolve; a Parte II ensina a LPA2v com contas '
                 'feitas passo a passo; a Parte III mostra os blocos; a Parte IV é '
                 'uma prática de bancada do começo ao fim. Os exercícios têm '
                 'gabarito comentado no Apêndice A.', None)], alinhar=None)
        D.p()
        D.p('Todo número desta apostila — exemplos e gabaritos — foi calculado pelo '
            'mesmo código que roda no robô, não digitado à mão.',
            tam=10, cor=CINZA, alinhar=CENTRO)
        D.quebra()

        self.parte_i()
        self.parte_ii()
        self.parte_iii()
        self.parte_iv()
        self.apendices()
        return D

    # ================= PARTE I =================

    def parte_i(self):
        D = self.D
        D.p('PARTE I', negrito=True, tam=13, cor=CINZA)
        D.titulo('Por que a lógica clássica não basta', 1)

        D.titulo('1. Verdadeiro, falso e mais nada', 2)
        D.p('A lógica que aprendemos e que está dentro de todo computador trabalha '
            'com dois valores. Uma proposição — uma afirmação que pode ser julgada — '
            'é verdadeira ou é falsa. Três princípios sustentam isso:')
        D.lista([
            [('Identidade', 'b'), (' — uma coisa é o que é: x = x.', None)],
            [('Terceiro excluído', 'b'),
             (' — ou p é verdadeira, ou ¬p é verdadeira. Não há terceira opção.', None)],
            [('Não-contradição', 'b'),
             (' — p e ¬p não podem ser verdadeiras ao mesmo tempo.', None)],
        ])
        D.p('Isso funciona bem quando a informação é limpa. Um botão está apertado ou '
            'não está. Mas um sensor não é um botão: ele mede, e medida tem ruído, '
            'ângulo, reflexo, calibração.')

        D.titulo('2. O princípio da explosão', 2)
        D.p('O problema não é a contradição existir. É o que a lógica clássica faz '
            'com ela. Suponha que aceitemos ao mesmo tempo p e ¬p. Em três passos se '
            'deduz qualquer coisa, inclusive um absurdo q:')
        D.codigo('1. p              (premissa)\n'
                 '2. p ∨ q          (de 1, por adição — se p vale, "p ou q" vale)\n'
                 '3. ¬p             (premissa)\n'
                 '4. q              (de 2 e 3, por silogismo disjuntivo)')
        D.rico([('Isso é o ', None), ('princípio da explosão', 'b'),
                (', também chamado de trivialização: de uma contradição segue-se '
                 'tudo. Uma teoria que se contradiz prova qualquer coisa — e por '
                 'isso não informa nada.', None)])
        D.p('Num sistema real a explosão não aparece como um teorema absurdo. Ela '
            'aparece como um comportamento errático: o programa às vezes diz uma '
            'coisa, às vezes outra, dependendo de qual leitura chegou primeiro. O '
            'banco de dados guarda dois registros incompatíveis, e cada consulta '
            'devolve o que encontrar antes.')

        D.titulo('3. As três saídas de sempre — e por que falham', 2)
        D.tabela(['saída usual', 'o que se perde'],
                 [['Escolher um sensor como o "bom"',
                   'A discordância inteira. Se o escolhido é justamente o que '
                   'descalibrou, o sistema erra com confiança.'],
                  ['Tirar a média',
                   'A informação de que houve conflito. Média de 0,9 e 0,1 é 0,5 — '
                   'igual à média de 0,5 e 0,5, que é um caso completamente '
                   'diferente.'],
                  ['Ignorar quando discordam',
                   'A oportunidade de detectar falha. Sensores que discordam muito '
                   'costumam ser sensores com problema.']],
                 legenda='o que cada solução improvisada joga fora',
                 larguras=[2.2, 4.1])
        D.rico([('Nas três, o sistema descarta a informação mais valiosa: ', None),
                ('a de que as fontes não concordam', 'b'), ('.', None)])

        D.titulo('4. O que a paraconsistência propõe', 2)
        D.p('Uma lógica é paraconsistente quando aceita contradições sem trivializar '
            '— ou seja, quando revoga o princípio da explosão. A contradição entra no '
            'sistema, é medida, e vira informação para a decisão em vez de veneno.')
        D.tabela(['quem', 'contribuição'],
                 [['N. Vasiliev e S. Jaśkowski', 'precursores, início do século XX'],
                  ['Newton C. A. da Costa', 'sistematiza os cálculos paraconsistentes '
                   '(1974), no Brasil'],
                  ['Jair Minoro Abe', 'fundamenta a Lógica Paraconsistente Anotada '
                   '(1992)'],
                  ['V. S. Subrahmanian', 'lógica anotada em programação lógica'],
                  ['João Inácio Da Silva Filho', 'a LPA2v aplicada: algoritmos, '
                   'circuitos e o robô Emmy']],
                 legenda='de onde vem a LPA2v', larguras=[2.2, 4.1])
        D.p('É a formulação do Prof. Dr. João Inácio Da Silva Filho que esta apostila '
            'segue: ela transforma a teoria em quatro contas de somar e subtrair, mais '
            'uma raiz quadrada — coisa que cabe num Arduino Uno.')
        D.quebra()

    # ================= PARTE II =================

    def parte_ii(self):
        D = self.D
        d = self.d
        ex = {e['cap']: [] for e in d['exemplos']}
        for e in d['exemplos']:
            ex.setdefault(e['cap'], []).append(e)
        exc = {}
        for e in d['exercicios']:
            exc.setdefault(e['cap'], []).append(e)

        D.p('PARTE II', negrito=True, tam=13, cor=CINZA)
        D.titulo('A LPA2v passo a passo', 1)
        D.figura('fig5-pipeline.png',
                 'o caminho que todo sinal percorre nesta apostila', 6.3)

        # ---- 5 ----
        D.titulo('5. A anotação (μ, λ)', 2)
        D.p('Na LPA2v, uma proposição não recebe "verdadeiro" ou "falso". Ela recebe '
            'um par de números, chamado anotação:')
        D.lista([
            [('μ (mi)', 'b'), (' — Grau de Evidência favorável: o quanto se tem de '
                               'razão para afirmar a proposição. Vai de 0 a 1.', None)],
            [('λ (lambda)', 'b'), (' — Grau de Evidência desfavorável: o quanto se '
                                   'tem de razão para negá-la. Também de 0 a 1.', None)],
        ])
        D.rico([('Os dois são ', None), ('independentes', 'b'),
                ('. Esse é o ponto que estranha no começo: μ = 0,9 e λ = 0,9 é '
                 'perfeitamente possível, e significa que há muita razão para '
                 'afirmar E muita razão para negar. Na lógica clássica isso não '
                 'existe; aqui é um estado com nome.', None)])
        D.p('Escreve-se o Sinal Paraconsistente como P(μ; λ). Os quatro cantos do '
            'quadrado de possibilidades são:')
        D.tabela(['(μ, λ)', 'nome', 'leitura'],
                 [['(1; 0)', 'V — Verdadeiro', 'toda razão para afirmar, nenhuma para negar'],
                  ['(0; 1)', 'F — Falso', 'nenhuma para afirmar, toda para negar'],
                  ['(1; 1)', 'T — Inconsistente', 'toda razão para os dois lados'],
                  ['(0; 0)', '⊥ — Indeterminado', 'nenhuma razão para nenhum lado']],
                 legenda='os quatro estados extremos',
                 larguras=[1.0, 1.8, 3.5], mono=[0])
        D.figura('fig1-qupc.png', 'o Quadrado Unitário do Plano Cartesiano', 4.6)
        self.atencao([
            'T e ⊥ são coisas diferentes, e confundi-las é o erro mais comum.',
            [('T é excesso de informação conflitante', 'b'),
             (' — os dois sensores gritam, um diz sim, outro diz não.', None)],
            [('⊥ é ausência de informação', 'b'),
             (' — ninguém tem o que dizer.', None)],
        ])
        for e in ex.get(5, []):
            self.exemplo(e['titulo'], e['enunciado'], self.passos(e['r'], e['ate']))
        for e in exc.get(5, []):
            self.exercicio(e['enunciado'], self.passos(e['r'], 2), e['comentario'])

        # ---- 6 ----
        D.titulo('6. Quando as duas fontes só sabem dizer "sim"', 2)
        D.p('Na prática é raro um sensor entregar evidência contrária. Dois sensores '
            'de distância medem a mesma coisa e cada um produz uma evidência '
            'favorável. A LPA2v resolve isso com uma convenção: toma-se a segunda '
            'fonte e usa-se o complemento dela como evidência desfavorável.')
        D.equacao('μ = μ₁            λ = 1 − μ₂', 'convenção do complemento')
        D.p('Fonte desligada ou especialista sem opinião entrega 0,5 — que com essa '
            'convenção leva o estado exatamente para o centro do reticulado.')
        self.atencao([
            'Essa convenção não é neutra: ela muda o significado de T e ⊥.',
            [('Substituindo λ = 1 − μ₂ nas equações, sai Gc = μ₁ + μ₂ − 1 e '
              'Gct = μ₁ − μ₂. ', None),
             ('O Grau de Contradição vira literalmente a diferença entre os dois '
              'sensores.', 'b')],
            'Logo T significa "sensor 1 muito acima do 2" e ⊥ significa "sensor 2 '
            'muito acima do 1". São a mesma falha vista dos dois lados — e nenhum '
            'dos dois quer dizer "sem leitura".',
        ])

        # ---- 7 ----
        D.titulo('7. Grau de Certeza e Grau de Contradição', 2)
        D.p('O quadrado é bom para entender, mas ruim para decidir: as duas '
            'perguntas que importam — "dá para afirmar?" e "as fontes concordam?" — '
            'estão misturadas nos dois eixos. Girando o quadrado 45° elas se separam. '
            'Formalmente são três transformações (uma mudança de escala, uma rotação '
            'e uma translação), e o resultado é:')
        D.equacao('Gc = μ − λ', '1')
        D.equacao('Gct = μ + λ − 1', '2')
        D.lista([
            [('Grau de Certeza (Gc)', 'b'),
             (' — eixo horizontal. Vai de −1 (falso) a +1 (verdadeiro). Responde '
              '"dá para afirmar?".', None)],
            [('Grau de Contradição (Gct)', 'b'),
             (' — eixo vertical. Vai de −1 (indeterminado) a +1 (inconsistente). '
              'Responde "as fontes concordam?".', None)],
        ])
        D.p('O par ετ = (Gc, Gct) é o estado lógico. A transformação tem volta:')
        D.equacao('μ = (Gc + Gct + 1) / 2        λ = (−Gc + Gct + 1) / 2', '3')
        D.figura('fig2-reticulado.png', 'o reticulado, onde as contas acontecem', 4.6)
        for e in ex.get(7, []):
            self.exemplo(e['titulo'], e['enunciado'], self.passos(e['r'], e['ate']))
        for e in exc.get(7, []):
            self.exercicio(e['enunciado'], self.passos(e['r'], 5), e['comentario'])

        # ---- 8 ----
        D.titulo('8. Por que o reticulado é um losango', 2)
        D.p('Gc e Gct parecem dois números livres, mas não são: vêm do mesmo par '
            '(μ, λ), e μ e λ moram no quadrado de lado 1. Fazendo as contas, a região '
            'que se pode alcançar é:')
        D.equacao('|Gc| + |Gct| ≤ 1', '4')
        D.p('Um par (Gc, Gct) fora desse losango não veio de anotação nenhuma. Isso '
            'tem consequência prática: quanto maior a contradição, menos certeza cabe. '
            'Com Gct = 0,8, o Grau de Certeza não passa de ±0,2 por mais evidência '
            'que se junte — só diminuir a contradição libera espaço.')

        # ---- 9 ----
        D.titulo('9. As 12 regiões', 2)
        D.p('Os quatro cantos são casos ideais que quase nunca acontecem. O útil é '
            'saber para que canto o estado está indo. Para isso o reticulado é '
            'dividido por quatro valores de controle, ajustáveis, normalmente em ±0,5:')
        D.tabela(['valor', 'eixo', 'significado'],
                 [['Vscc', 'Gc', 'a partir daqui, considera-se Verdadeiro'],
                  ['Vicc', 'Gc', 'a partir daqui (negativo), Falso'],
                  ['Vscct', 'Gct', 'a partir daqui, Inconsistente'],
                  ['Vicct', 'Gct', 'a partir daqui (negativo), Indeterminado']],
                 legenda='os valores de controle', larguras=[1.0, 0.8, 4.5], mono=[0])
        D.figura('fig3-12-estados.png', 'as 12 regiões do reticulado', 4.6)
        D.p('Os oito estados do meio são nomeados pelo canto de que estão perto e '
            'pelo canto para onde tendem. Qv→T lê-se "quase-verdadeiro tendendo ao '
            'inconsistente": já dá para afirmar, mas as fontes começam a divergir.')
        for e in exc.get(9, []):
            self.exercicio(e['enunciado'], self.passos(e['r'], 5), e['comentario'])

        # ---- 10 ----
        D.titulo('10. Descontando o efeito da contradição', 2)
        D.p('O Grau de Certeza sozinho engana: 0,3 vindo de duas fontes que concordam '
            'não vale o mesmo que 0,3 vindo de duas fontes que brigam. Três grandezas '
            'corrigem isso.')
        D.equacao('φ = 1 − |Gct|', '5')
        D.p('O Intervalo de Certeza φ diz quanto espaço sobra para a certeza crescer '
            'sem mexer na contradição.')
        D.equacao('D = √( (1 − |Gc|)² + Gct² )', '6')
        D.p('A distância D vai do canto de certeza máxima até o estado. Projetada no '
            'eixo horizontal, dá a certeza já limpa do efeito da contradição:')
        D.equacao('Gcr = 1 − D   se Gc > 0        Gcr = D − 1   se Gc < 0', '7')
        D.equacao('μEr = (Gcr + 1) / 2', '8')
        D.figura('fig4-gcr.png', 'o Grau de Certeza Real', 4.6)
        self.atencao([
            'Antes de calcular Gcr, verifique se a análise conclui alguma coisa:',
            ('eq', 'se  φ ≤ 0,25  ou  D > 1  →  indefinição: Gcr = 0 e μEr = 0,5'),
            [('Esse passo não é opcional. ', 'b'),
             ('Sem ele, um Gc negativo com D > 1 devolve um Gcr positivo — certeza '
              'de que a proposição é verdadeira, calculada a partir de evidência de '
              'que ela é falsa. É conta certa em cima de pergunta sem resposta.',
              None)],
        ])
        for e in ex.get(10, []):
            self.exemplo(e['titulo'], e['enunciado'], self.passos(e['r'], e['ate']))
        for e in exc.get(10, []):
            self.exercicio(e['enunciado'], self.passos(e['r'], 99), e['comentario'])

        # ---- 11 ----
        D.titulo('11. Do sensor para o intervalo [0, 1]', 2)
        D.p('Falta o começo do caminho: o sensor mede em centímetros, volts ou kg/m², '
            'e a LPA2v quer um número entre 0 e 1. A conversão precisa de duas '
            'decisões suas.')
        D.rico([('Primeiro, o ', None), ('Universo de Discurso', 'b'),
                (' — a faixa que interessa, de a₁ a a₂. Abaixo de a₁ a evidência é 0; '
                 'acima de a₂ é 1. Se a₂ for menor que a₁, a evidência cresce quando '
                 'a medida diminui, que é o caso de sensor de distância medindo '
                 'altura de peça.', None)])
        D.rico([('Segundo, a ', None), ('função de valoração', 'b'),
                (' — como a evidência cresce dentro da faixa. Linear é o padrão; as '
                 'funções S e Z crescem devagar nas pontas e rápido no meio, o que '
                 'representa melhor um especialista que só muda de opinião perto do '
                 'limiar.', None)])
        D.figura('fig6-valoracao.png', 'as quatro funções de valoração', 6.0)
        for e in ex.get(11, []):
            linhas = []
            if e.get('norm'):
                linhas.append(e['norm']['passo'])
            if e.get('norm2'):
                linhas += [x['passo'] for x in e['norm2']]
            if e.get('r'):
                linhas += self.passos(e['r'], 6)
            self.exemplo(e['titulo'], e['enunciado'], linhas)
        for e in exc.get(11, []):
            linhas = []
            if e.get('norm'):
                linhas.append(e['norm']['passo'])
            if e.get('norm2'):
                linhas += [x['passo'] for x in e['norm2']]
            if e.get('r'):
                linhas += self.passos(e['r'], 6)
            self.exercicio(e['enunciado'], linhas, e['comentario'])
        D.quebra()

    # ================= PARTE III =================

    def parte_iii(self):
        D = self.D
        d = self.d
        D.p('PARTE III', negrito=True, tam=13, cor=CINZA)
        D.titulo('Os blocos como ferramenta', 1)

        D.titulo('12. O aplicativo em cinco minutos', 2)
        D.lista([
            'Escolha a placa no alto da janela. A lista de blocos muda com ela: o que '
            'não existe na placa não aparece.',
            'Arraste os blocos para a área central. O painel da direita mostra o C++ '
            'sendo escrito, linha por linha.',
            'Arquivo → Exemplos abre os projetos prontos. O da esteira é o desta '
            'apostila.',
            'Compilar confere se o programa é válido. Compilar e gravar manda para a '
            'placa pela USB.',
            'As abas Monitor serial, Plotter e Reticulado mostram o que a placa '
            'responde.',
        ], numerada=True)
        D.figura('exemplo_menu.png',
                 'os blocos à esquerda e o C++ correspondente à direita', 6.3)
        D.rico([('Uma diferença importante para outros ambientes de blocos: aqui ',
                 None),
                ('um bloco é um comando da linguagem Arduino', 'b'),
                ('. Nada é escondido, nada é injetado sozinho. A categoria de Lógica '
                 'Paraconsistente é a única exceção — e mesmo ela mostra no painel de '
                 'código todas as funções que gera.', None)])

        D.titulo('13. Os %d blocos' % d['contagens']['blocosLp'], 2)
        for g in d['grupos']:
            D.titulo(g['nome'], 3)
            D.p(g['quando'], italico=True, cor=CINZA)
            D.tabela(['bloco', 'o que faz', 'gera'],
                     [[b['rotulo'] or b['tipo'], b['tooltip'], b['cpp']]
                      for b in g['blocos']],
                     larguras=[1.9, 2.2, 2.2], mono=[2], tam=8.5)

        D.titulo('14. Vendo a análise acontecer', 2)
        D.p('A aba Reticulado desenha o losango e marca o ponto de cada leitura que '
            'chega pela serial. Para alimentá-la, basta imprimir a anotação no '
            'formato de série do plotter:')
        D.codigo('Serial.print("mu:");      Serial.print(mu);\n'
                 'Serial.print(" lambda:"); Serial.println(lam);')
        D.p('Ou, se preferir mandar os graus já calculados:')
        D.codigo('Serial.print("gc:");   Serial.print(lpaGc(mu, lam));\n'
                 'Serial.print(" gct:"); Serial.println(lpaGct(mu, lam));')
        D.p('Linha sem o par completo não move o ponto — uma linha de texto ou só '
            'metade da anotação são ignoradas de propósito. O rastro mostra por onde '
            'o estado andou, o que é a melhor forma de calibrar o Universo de '
            'Discurso: mexa nos limites e veja o ponto se deslocar.')
        D.figura('ret_v.png', 'as duas fontes concordam: estado V', 6.3)
        D.rico([('Quando a análise não conclui, o ponto e a leitura ficam âmbar e o '
                 'motivo aparece escrito. ', None),
                ('Isso é informação, não erro', 'b'),
                (': μEr = 0,5 sozinho seria ambíguo — poderia ser indefinição ou '
                 'empate legítimo.', None)])
        D.figura('ret_t.png', 'sensores em contradição: estado T, sem conclusão', 6.3)

        D.titulo('15. O que o software não decide por você', 2)
        D.p('Os blocos calculam corretamente qualquer par (μ, λ) que receberem. Se o '
            'par não representa o que você pensa que representa, o resultado sai '
            'preciso e errado. Os quatro casos abaixo são erros reais, cometidos ao '
            'montar a prática da Parte IV.')
        D.tabela(['erro', 'o que acontece', 'como evitar'],
                 [['As duas fontes falam de proposições diferentes',
                   'Gct deixa de significar contradição e vira ruído sem sentido',
                   'Use fontes redundantes sobre a MESMA proposição; para evidências '
                   'diferentes, use uma rede de NAPs ou o ParaExtrctr'],
                  ['Confundir ⊥ com "sem leitura"',
                   'Uma discordância é tratada como ausência de dado',
                   'Lembre que, com λ = 1 − μ₂, T e ⊥ são a mesma discordância '
                   'espelhada'],
                  ['Analisar quando não há sujeito',
                   'Esteira vazia vira F — "peça pequena" — e o braço pega o vazio',
                   'Verifique a presença ANTES de chamar a análise'],
                  ['Não tratar o timeout do sensor',
                   'pulseIn sem eco devolve 0, que vira "peça altíssima"',
                   'Troque o 0 por uma distância grande logo após a leitura']],
                 legenda='os quatro erros de modelagem mais fáceis de cometer',
                 larguras=[1.6, 2.2, 2.5])
        D.quebra()

    # ================= PARTE IV =================

    def parte_iv(self):
        D = self.D
        d = self.d
        D.p('PARTE IV', negrito=True, tam=13, cor=CINZA)
        D.titulo('Prática: esteira, ultrassons e braço', 1)
        D.p('Uma esteira leva peças de dois tamanhos. Dois sensores de ultrassom '
            'medem a altura de cada peça que passa. Um braço de dois servos deposita '
            'as grandes à esquerda e as pequenas à direita. Quando os sensores '
            'discordam demais, o sistema para e chama o operador em vez de arriscar '
            'o braço numa peça mal lida.')

        D.titulo('16. Material e ligações', 2)
        D.tabela(['peça', 'quantidade', 'pinos'],
                 [['Arduino Uno', '1', '—'],
                  ['Sensor HC-SR04', '2', 'S1: trig 2, echo 3  ·  S2: trig 4, echo 8'],
                  ['Servo (base do braço)', '1', '9'],
                  ['Servo (garra)', '1', '10'],
                  ['Módulo relé para a esteira', '1', '7'],
                  ['Fonte externa para os servos', '1', '— (não alimente pelo USB)']],
                 legenda='material da bancada', larguras=[2.0, 1.2, 3.1])
        D.figura('fig7-bancada.png', 'a bancada vista de cima', 6.3)
        self.atencao([
            'Os dois sensores têm de apontar para o MESMO ponto da esteira.',
            'É isso que faz a discordância entre eles significar contradição. Se um '
            'mede a altura e o outro mede a largura, os números continuam saindo, mas '
            'o Grau de Contradição não quer dizer mais nada.',
        ])

        D.titulo('17. Montagem em quatro etapas', 2)
        D.p('Monte e teste uma etapa de cada vez. Cada uma funciona sozinha.')

        D.titulo('Etapa 1 — ler os sensores', 3)
        D.p('O HC-SR04 quer um pulso de 10 microssegundos no gatilho e devolve, no '
            'eco, um pulso proporcional à distância. Dividir por 58 converte para '
            'centímetros.')
        D.codigo(d['sketch']['medirSensores'])
        D.rico([('Repare no ', None), ('if (dist == 0)', 'm'),
                (' no fim: sem eco, pulseIn devolve zero, e zero centímetro seria a '
                 'peça mais alta possível. Troque por uma distância grande.', None)])
        D.p('Teste: imprima dist1 e dist2 no monitor serial e passe a mão na frente '
            'dos sensores. Os dois números devem cair juntos.')

        D.titulo('Etapa 2 — calibrar o Universo de Discurso', 3)
        D.p('Coloque na esteira a menor peça que deve ir para a direita e anote a '
            'distância lida: esse é a₁. Coloque a maior peça e anote: esse é a₂. Na '
            'montagem desta apostila deu 25 cm e 12 cm — a₂ menor que a₁, porque peça '
            'mais alta fica mais perto do sensor.')
        D.p('Teste: use a aba Reticulado. Imprima mu e lambda, ponha as peças e veja '
            'o ponto ir para os lados certos. Se a peça grande não chega perto do '
            'vértice V, aperte o Universo de Discurso.')

        D.titulo('Etapa 3 — decidir', 3)
        D.p('O bloco Para-Analisador recebe a anotação e desvia para o caso do estado '
            'encontrado. É onde a apostila inteira se junta:')
        D.codigo(d['sketch']['loop'])
        D.p('Note o teste de presença antes da análise: a proposição "a peça é '
            'grande" só faz sentido se existir peça.')

        D.titulo('Etapa 4 — acionar o braço', 3)
        D.p('A rotina do braço não sabe nada de lógica paraconsistente: ela recebe um '
            'ângulo já decidido e executa. Manter a decisão separada da mecânica '
            'facilita testar as duas.')
        D.codigo(d['sketch']['depositar'])

        D.titulo('18. O que observar nos testes', 2)
        D.p('Com a aba Reticulado aberta, passe as peças e confira contra a tabela. '
            'Todos os valores abaixo foram calculados com o mesmo código que roda na '
            'placa.')
        D.tabela(['S1 / S2', 'μ', 'λ', 'Gc', 'Gct', 'estado', 'o que significa'],
                 [[('%d / %d cm' % (c['d1'], c['d2'])), c['mu'], c['lambda'],
                   c['gc'], c['gct'], c['estado'],
                   {'peça alta': 'grande → esquerda',
                    'peça rasa': 'pequena → direita',
                    'peça atravessada': 'S1 vê alta, S2 vê rasa: alarme',
                    'atravessada ao contrário': 'S2 vê alta, S1 vê rasa: alarme',
                    'altura na fronteira': 'ambígua: deixa passar'}[c['rotulo']]]
                  for c in d['cenarios']],
                 legenda='cenários da bancada, com os valores conferidos',
                 larguras=[0.9, 0.6, 0.6, 0.7, 0.7, 0.7, 2.1], tam=8.5)
        D.p('Os dois casos de alarme são o motivo de tudo isso existir. Uma média '
            'daria 0,5 nos dois e o sistema seguiria em frente, deixando passar uma '
            'peça mal posicionada ou um sensor descalibrado.')

        D.titulo('19. Para continuar', 2)
        D.lista([
            'Troque a resolução do Para-Analisador para 4 regiões e veja quais casos '
            'deixam de ser distinguidos. Os blocos de estado não-extremo passam a '
            'receber aviso, porque nunca vão rodar.',
            'Mexa nos valores de controle: com Vscc em 0,3, mais peças são aceitas '
            'como grandes. Com 0,7, o sistema fica exigente e manda mais para '
            '"ambígua".',
            'Acrescente um terceiro sensor e use o bloco ParaExtrctr para reduzir as '
            'três evidências a uma só antes de analisar.',
            'Troque a valoração linear pela função S e compare: peças perto do '
            'limiar passam a ser classificadas com mais decisão.',
            'Registre no monitor serial o par (Gc, Gct) de cada peça durante um turno '
            'inteiro. O rastro no reticulado vira um retrato do processo.',
        ])
        D.quebra()

    # ================= apêndices =================

    def apendices(self):
        D = self.D
        D.titulo('Apêndice A — Gabarito comentado', 1)
        D.p('Cada resposta traz as contas na ordem em que devem ser feitas, e um '
            'comentário sobre o que o resultado significa.')
        for numero, enunciado, linhas, comentario in self.gabarito:
            corpo = [enunciado] + [('eq', l) for l in (linhas or [])]
            if comentario:
                corpo.append([('Comentário: ', 'b'), (comentario, 'i')])
            D.caixa('Exercício %d' % numero, C_EXERC[0], C_EXERC[1], corpo)

        D.quebra()
        D.titulo('Apêndice B — Formulário', 1)
        D.caixa('Tudo o que a LPA2v pede', C_FORM[0], C_FORM[1], [
            ('eq', 'anotação:  P(μ; λ)      μ, λ ∈ [0, 1]'),
            ('eq', 'convenção do complemento:  μ = μ₁ ,  λ = 1 − μ₂'),
            ('eq', 'Gc = μ − λ                    (Grau de Certeza)'),
            ('eq', 'Gct = μ + λ − 1               (Grau de Contradição)'),
            ('eq', 'μ = (Gc + Gct + 1) / 2    λ = (−Gc + Gct + 1) / 2'),
            ('eq', 'φ = 1 − |Gct|                 (Intervalo de Certeza)'),
            ('eq', 'D = √( (1 − |Gc|)² + Gct² )'),
            ('eq', 'Gcr = 1 − D  (Gc > 0)     Gcr = D − 1  (Gc < 0)'),
            ('eq', 'μEr = (Gcr + 1) / 2'),
            ('eq', 'indefinição:  φ ≤ 0,25  ou  D > 1'),
            ('eq', 'validade:  |Gc| + |Gct| ≤ 1'),
        ])
        D.p('Normalização no Universo de Discurso [a₁, a₂]:')
        D.caixa('Valoração', C_FORM[0], C_FORM[1], [
            ('eq', 'linear crescente:    μ(x) = (x − a₁) / (a₂ − a₁)'),
            ('eq', 'linear decrescente:  μ(x) = (x − a₂) / (a₁ − a₂)'),
            ('eq', 'função S:  2·t²  se t ≤ ½ ;  1 − 2·(1 − t)²  se t > ½'),
            ('eq', 'função Z:  o complemento da função S'),
            'com t = (x − a₁) / (a₂ − a₁), saturado entre 0 e 1.',
        ])
        D.p('Os 12 estados: V, F, T, ⊥ nos vértices; Qv→T, Qv→⊥, Qf→T, Qf→⊥ '
            'próximos de V e F; T→v, T→f, ⊥→v, ⊥→f próximos de T e ⊥.')

        D.titulo('Apêndice C — Erratas do material de referência', 1)
        D.p('Ao conferir cada exemplo do material da disciplina contra o cálculo, '
            'apareceram divergências. Estão aqui porque o software segue o valor '
            'correto, e quem comparar as duas coisas vai notar a diferença.')
        D.tabela(['local', 'impresso', 'correto'],
                 [['Aula 5, Ex. 3.4', 'GC = 0,85 − 0,55 → 0,2', 'Gc = 0,3'],
                  ['Aula 5, Ex. 3.10', 'GCr = 0,43079003',
                   '−0,43079 (Gc < 0 ⇒ Gcr < 0)'],
                  ['Aula 5, Ex. 3.12', 'Gct = 1 − 0,72; GC negativo',
                   'Gct = 1 − 0,7 = 0,3; Gc positivo'],
                  ['Aula 5, Ex. 3.13', 'enunciado com Gcr = 0,68',
                   'a resolução impressa corresponde a 0,6'],
                  ['Aula 5, §4.2.2', 'D = 1 para (0,25; 0,75)',
                   'D = 1,0607; vale a regra D > 1'],
                  ['Aula 5, §4.3.1 item 8', 'μ + λ > 1 ⇒ φ(−)',
                   'contradiz a eq. (3.5); vale Gct > 0 ⇒ φ(+)'],
                  ['RNAP, célula de decisão', 'VlV = 0,5 − FtD/2',
                   'VlV = 0,5 + FtD/2']],
                 legenda='divergências entre o material impresso e o cálculo conferido',
                 larguras=[1.5, 2.3, 2.5])
        D.p()
        D.p('Referências: Da Silva Filho, J. I. — Métodos de Aplicações da Lógica '
            'Paraconsistente Anotada de anotação com dois valores LPA2v (2006) e '
            'Algoritmo Paraconsistente Extrator de efeitos da Contradição (2009); '
            'Abe, J. M. — Fundamentos da Lógica Anotada (1992); da Costa, N. C. A. — '
            'On the theory of inconsistent formal systems (1974).',
            tam=9.5, cor=CINZA)


def main():
    if len(sys.argv) < 2:
        print('uso: gerar_apostila.py <arquivo.json>')
        return 2
    with open(sys.argv[1], encoding='utf-8') as f:
        dados = json.load(f)

    a = Apostila(dados)
    a.montar()
    a.D.salvar(SAIDA)
    print('✓ ' + os.path.relpath(SAIDA, RAIZ) +
          '  (%d figuras, %d tabelas, %d exemplos, %d exercícios)'
          % (a.D.n_figura, a.D.n_tabela, a.n_ex, a.n_exc))
    return 0


if __name__ == '__main__':
    sys.exit(main())
