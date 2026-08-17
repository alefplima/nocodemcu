#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Figuras do reticulado da LPA2v para a documentação.

    python3 tools/figuras_reticulado.py [destino]

Desenha em PNG, com fundo branco e traço escuro, para o documento ficar legível
impresso em preto e branco. As quatro figuras acompanham a seção de fundamentos:

    fig1-qupc.png       o Quadrado Unitário do Plano Cartesiano
    fig2-reticulado.png o reticulado com os eixos Gc e Gct
    fig3-12-estados.png as 12 regiões nomeadas
    fig4-gcr.png        Gcr como projeção da distância D

E três para a apostila:

    fig5-pipeline.png   o caminho do sinal, do sensor até a ação
    fig6-valoracao.png  as quatro funções de valoração
    fig7-bancada.png    a bancada da prática, vista de cima
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

L = 1100          # lado da imagem, em pixels
MARGEM = 130
ESCALA = 3        # desenha grande e reduz: antialiasing de pobre, mas funciona

PRETO = (24, 30, 40)
CINZA = (120, 132, 148)
CLARO = (206, 214, 224)
AZUL = (31, 111, 235)
VERDE = (26, 127, 55)
AMBAR = (154, 103, 0)
BRANCO = (255, 255, 255)


def fonte(tam, negrito=False):
    nomes = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if negrito else ''),
        '/usr/share/fonts/truetype/liberation/LiberationSans%s.ttf' % ('-Bold' if negrito else ''),
    ]
    for n in nomes:
        if os.path.exists(n):
            return ImageFont.truetype(n, tam)
    return ImageFont.load_default()


class Tela:
    """Desenho em escala ampliada, reduzido no fim — deixa a linha menos serrilhada."""

    def __init__(self, lado=L, alt=None):
        self.lado = lado
        self.alt = alt or lado
        self.img = Image.new('RGB', (lado * ESCALA, self.alt * ESCALA), BRANCO)
        self.d = ImageDraw.Draw(self.img)

    def _e(self, v):
        return v * ESCALA

    def linha(self, p1, p2, cor=PRETO, larg=2, tracejado=None):
        x1, y1 = self._e(p1[0]), self._e(p1[1])
        x2, y2 = self._e(p2[0]), self._e(p2[1])
        if not tracejado:
            self.d.line([x1, y1, x2, y2], fill=cor, width=larg * ESCALA)
            return
        # tracejado manual: o Pillow não tem
        comp = math.hypot(x2 - x1, y2 - y1)
        if comp == 0:
            return
        passo = tracejado * ESCALA
        n = max(1, int(comp / passo))
        dx, dy = (x2 - x1) / n, (y2 - y1) / n
        for i in range(n):
            if i % 2:
                continue
            self.d.line([x1 + dx * i, y1 + dy * i, x1 + dx * (i + 1), y1 + dy * (i + 1)],
                        fill=cor, width=larg * ESCALA)

    def poligono(self, pontos, contorno=PRETO, preenche=None, larg=2):
        p = [(self._e(x), self._e(y)) for x, y in pontos]
        if preenche:
            self.d.polygon(p, fill=preenche)
        p.append(p[0])
        for i in range(len(p) - 1):
            self.d.line([p[i], p[i + 1]], fill=contorno, width=larg * ESCALA)

    def disco(self, p, r, cor=PRETO):
        x, y = self._e(p[0]), self._e(p[1])
        rr = r * ESCALA
        self.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=cor)

    def texto(self, p, txt, cor=PRETO, tam=22, negrito=False, ancora='mm'):
        self.d.text((self._e(p[0]), self._e(p[1])), txt, fill=cor,
                    font=fonte(tam * ESCALA, negrito), anchor=ancora)

    def texto_vertical(self, p, txt, cor=PRETO, tam=22, negrito=False):
        """Texto girado 90°, para rotular o eixo vertical sem estourar a margem."""
        f = fonte(tam * ESCALA, negrito)
        cx, cy = self.d.textbbox((0, 0), txt, font=f)[2:]
        tira = Image.new('RGBA', (cx + 8, cy + 8), (255, 255, 255, 0))
        ImageDraw.Draw(tira).text((0, 0), txt, fill=cor, font=f)
        tira = tira.rotate(90, expand=True)
        self.img.paste(tira, (int(self._e(p[0]) - tira.width / 2),
                              int(self._e(p[1]) - tira.height / 2)), tira)

    def retangulo(self, p1, p2, contorno=PRETO, preenche=None, larg=2, raio=0):
        c = [self._e(p1[0]), self._e(p1[1]), self._e(p2[0]), self._e(p2[1])]
        if raio:
            self.d.rounded_rectangle(c, radius=raio * ESCALA, fill=preenche,
                                     outline=contorno, width=larg * ESCALA)
        else:
            self.d.rectangle(c, fill=preenche, outline=contorno, width=larg * ESCALA)

    def seta(self, p1, p2, cor=PRETO, larg=2):
        self.linha(p1, p2, cor, larg)
        ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        for lado in (2.6, -2.6):
            self.linha(p2, (p2[0] - 14 * math.cos(ang + lado / 8),
                            p2[1] - 14 * math.sin(ang + lado / 8)), cor, larg)

    def salvar(self, caminho):
        self.img.resize((self.lado, self.alt), Image.LANCZOS).save(caminho)
        print('  ✓ ' + os.path.basename(caminho))


# ---------------------------------------------------------------------------
# Figura 1 — QUPC: μ no eixo x, λ no eixo y
# ---------------------------------------------------------------------------

def fig_qupc(destino):
    t = Tela()
    a, b = MARGEM, L - MARGEM

    def X(mu):
        return a + mu * (b - a)

    def Y(lam):
        return b - lam * (b - a)

    for k in range(1, 10):
        v = k / 10.0
        t.linha((X(v), Y(0)), (X(v), Y(1)), CLARO, 1)
        t.linha((X(0), Y(v)), (X(1), Y(v)), CLARO, 1)

    t.poligono([(X(0), Y(0)), (X(1), Y(0)), (X(1), Y(1)), (X(0), Y(1))], PRETO, None, 2)

    # o segmento perfeitamente definido (V—F) e o perfeitamente indefinido (T—⊥)
    t.linha((X(1), Y(0)), (X(0), Y(1)), AZUL, 2, tracejado=14)
    t.linha((X(0), Y(0)), (X(1), Y(1)), AMBAR, 2, tracejado=14)

    # Rótulos fora do quadrado: dentro, encavalavam no ponto e na grade.
    for mu, lam, rot, sub in [(1, 0, 'V', '(1, 0)'), (0, 1, 'F', '(0, 1)'),
                              (1, 1, 'T', '(1, 1)'), (0, 0, '⊥', '(0, 0)')]:
        t.disco((X(mu), Y(lam)), 9, PRETO)
        dx = -52 if mu == 0 else 52
        dy = -46 if lam == 1 else 46
        t.texto((X(mu) + dx, Y(lam) + dy - 14), rot, PRETO, 30, True)
        t.texto((X(mu) + dx, Y(lam) + dy + 18), sub, CINZA, 18)

    t.texto(((a + b) / 2, b + 76), 'μ — Grau de Evidência favorável', PRETO, 24)
    t.texto_vertical((a - 84, (a + b) / 2), 'λ — Grau de Evidência desfavorável', PRETO, 24)

    t.texto((X(0.26), Y(0.40)), 'perfeitamente definido', AZUL, 19)
    t.texto((X(0.74), Y(0.40)), 'perfeitamente indefinido', AMBAR, 19)
    t.texto((L / 2, MARGEM - 70), 'Quadrado Unitário do Plano Cartesiano', PRETO, 25, True)
    t.salvar(os.path.join(destino, 'fig1-qupc.png'))


# ---------------------------------------------------------------------------
# Base comum das figuras no reticulado ℒ (eixos Gc e Gct)
# ---------------------------------------------------------------------------

def base_reticulado(t, grade=True, nome_eixos=True):
    a, b = MARGEM, L - MARGEM
    cx, cy = (a + b) / 2, (a + b) / 2
    raio = (b - a) / 2

    def X(gc):
        return cx + gc * raio

    def Y(gct):
        return cy - gct * raio

    if grade:
        v = -0.75
        while v < 0.751:
            if abs(v) > 1e-9:
                meia = 1 - abs(v)
                t.linha((X(-meia), Y(v)), (X(meia), Y(v)), CLARO, 1)
                t.linha((X(v), Y(-meia)), (X(v), Y(meia)), CLARO, 1)
            v += 0.25

    t.linha((X(-1), Y(0)), (X(1), Y(0)), CINZA, 1)
    t.linha((X(0), Y(-1)), (X(0), Y(1)), CINZA, 1)
    t.poligono([(X(1), Y(0)), (X(0), Y(1)), (X(-1), Y(0)), (X(0), Y(-1))], PRETO, None, 3)

    t.texto((X(1) + 50, Y(0)), 'V', PRETO, 30, True)
    t.texto((X(-1) - 50, Y(0)), 'F', PRETO, 30, True)
    t.texto((X(0), Y(1) - 48), 'T', PRETO, 30, True)
    t.texto((X(0), Y(-1) + 48), '⊥', PRETO, 30, True)
    t.texto((X(1) + 50, Y(0) + 32), '+1', CINZA, 17)
    t.texto((X(-1) - 50, Y(0) + 32), '−1', CINZA, 17)
    if nome_eixos:
        t.texto((X(0.80), Y(0) - 30), 'Gc →', CINZA, 20)
        t.texto((X(0) + 62, Y(0.78)), 'Gct ↑', CINZA, 20)
    return X, Y


def fig_reticulado(destino):
    t = Tela()
    X, Y = base_reticulado(t)
    t.texto((L / 2, MARGEM - 76),
            'Gc = μ − λ        Gct = μ + λ − 1', PRETO, 25, True)
    t.texto((L / 2, L - MARGEM + 74),
            'a região alcançável é o losango  |Gc| + |Gct| ≤ 1', CINZA, 21)
    t.salvar(os.path.join(destino, 'fig2-reticulado.png'))


# ---------------------------------------------------------------------------
# Figura 3 — as 12 regiões
# ---------------------------------------------------------------------------

def fig_12_estados(destino):
    t = Tela()
    X, Y = base_reticulado(t, grade=False)

    # valores de controle em ±0,5
    for v in (0.5, -0.5):
        meia = 1 - abs(v)
        t.linha((X(v), Y(-meia)), (X(v), Y(meia)), CINZA, 2, tracejado=13)
        t.linha((X(-meia), Y(v)), (X(meia), Y(v)), CINZA, 2, tracejado=13)
    # diagonais |Gc| = |Gct|
    t.linha((X(-0.5), Y(-0.5)), (X(0.5), Y(0.5)), CINZA, 1)
    t.linha((X(-0.5), Y(0.5)), (X(0.5), Y(-0.5)), CINZA, 1)

    # rótulo no centro de cada região
    for gc, gct, rot in [
        (0.72, 0.0, 'V'), (-0.72, 0.0, 'F'), (0.0, 0.72, 'T'), (0.0, -0.72, '⊥'),
        (0.30, 0.10, 'Qv→T'), (0.30, -0.10, 'Qv→⊥'),
        (-0.30, 0.10, 'Qf→T'), (-0.30, -0.10, 'Qf→⊥'),
        (0.10, 0.30, 'T→v'), (-0.10, 0.30, 'T→f'),
        (0.10, -0.30, '⊥→v'), (-0.10, -0.30, '⊥→f'),
    ]:
        extremo = rot in ('V', 'F', 'T', '⊥')
        if extremo:
            continue
        t.texto((X(gc), Y(gct)), rot, PRETO, 19, True)

    # Os valores de controle são limiares sobre Gc e Gct. As quatro linhas
    # tracejadas se encontram nos mesmos quatro cantos, então rotulá-las uma a
    # uma encavala: ficam só os ticks nos eixos, e o rodapé diz quem é quem.
    for gc in (0.5, -0.5):
        t.linha((X(gc), Y(0) - 10), (X(gc), Y(0) + 10), PRETO, 2)
        t.texto((X(gc), Y(0) + 36), ('%+.1f' % gc).replace('.', ','), PRETO, 16)
    for gct in (0.5, -0.5):
        t.linha((X(0) - 10, Y(gct)), (X(0) + 10, Y(gct)), PRETO, 2)
        t.texto((X(0) + 44, Y(gct) - 22), ('%+.1f' % gct).replace('.', ','), PRETO, 16)

    t.texto((L / 2, MARGEM - 76), 'Reticulado em 12 regiões', PRETO, 25, True)
    t.texto((L / 2, L - MARGEM + 68),
            'tracejado: valores de controle, ajustáveis (padrão ±0,5)', CINZA, 20)
    t.texto((L / 2, L - MARGEM + 96),
            'Vscc e Vicc no eixo Gc  ·  Vscct e Vicct no eixo Gct', CINZA, 19)
    t.salvar(os.path.join(destino, 'fig3-12-estados.png'))


# ---------------------------------------------------------------------------
# Figura 4 — Gcr como projeção de D, e a faixa de indefinição
# ---------------------------------------------------------------------------

def fig_gcr(destino):
    t = Tela()
    X, Y = base_reticulado(t, grade=False, nome_eixos=False)

    gc, gct = 0.58, 0.14
    d = math.sqrt((1 - abs(gc)) ** 2 + gct ** 2)
    gcr = 1 - d

    # D vai do vértice V até o estado
    t.linha((X(1), Y(0)), (X(gc), Y(gct)), AZUL, 3)
    t.linha((X(gc), Y(gct)), (X(gcr), Y(0)), AMBAR, 2, tracejado=12)
    t.disco((X(gc), Y(gct)), 10, VERDE)
    t.disco((X(gcr), Y(0)), 8, AMBAR)

    t.texto((X(gc) - 40, Y(gct) - 46), 'ετ = (Gc; Gct)', VERDE, 20, True, ancora='rm')
    t.texto((X(gc) - 40, Y(gct) - 20), '(0,58; 0,14)', CINZA, 17, ancora='rm')
    t.texto((X(0.84), Y(0.14)), 'D', AZUL, 24, True)
    t.texto((X(gcr) - 24, Y(0) + 46), 'Gcr = 1 − D', AMBAR, 20, True, ancora='rm')
    t.texto((X(gcr) - 24, Y(0) + 72), '0,557', CINZA, 17, ancora='rm')

    # zona onde a análise não conclui
    t.texto((L / 2, MARGEM - 76), 'Grau de Certeza Real', PRETO, 25, True)
    t.texto((L / 2, L - MARGEM + 74),
            'se φ ≤ 0,25 ou D > 1, a análise não conclui: Gcr = 0 e μEr = 0,5',
            AMBAR, 20)
    t.salvar(os.path.join(destino, 'fig4-gcr.png'))



# ---------------------------------------------------------------------------
# Figura 5 — o caminho do sinal, do sensor até a ação
# ---------------------------------------------------------------------------

def fig_pipeline(destino):
    t = Tela(1400, 430)
    caixas = [
        ('sensor', '0…1023\nou cm'),
        ('Universo\nde Discurso', 'a₁ … a₂'),
        ('μ, λ', 'em [0, 1]'),
        ('Gc, Gct', 'equações 1 e 2'),
        ('estado', 'V F T ⊥\ne os 8 demais'),
        ('ação', 'desviar,\ndepositar…'),
    ]
    larg, alt, gap = 190, 120, 32
    x = 40
    y = 150
    for i, (titulo, sub) in enumerate(caixas):
        cor = AZUL if i in (2, 3) else (VERDE if i == 4 else PRETO)
        t.retangulo((x, y), (x + larg, y + alt), cor, None, 2, raio=10)
        t.texto((x + larg / 2, y + 40), titulo, cor, 21, True)
        for j, linha in enumerate(sub.split('\n')):
            t.texto((x + larg / 2, y + 72 + j * 24), linha, CINZA, 16)
        if i < len(caixas) - 1:
            t.seta((x + larg + 6, y + alt / 2), (x + larg + gap - 6, y + alt / 2), CINZA, 2)
        x += larg + gap

    t.texto((700, 62), 'O caminho do sinal', PRETO, 26, True)
    t.texto((700, 100), 'cada bloco da categoria cobre um trecho deste caminho',
            CINZA, 19)
    t.texto((700, 330), 'a modelagem é sua: o software calcula certo qualquer par '
                        '(μ, λ) que receber', AMBAR, 19)
    t.texto((700, 362), 'se o par não significa o que você pensa, '
                        'o resultado é preciso e errado', AMBAR, 19)
    t.salvar(os.path.join(destino, 'fig5-pipeline.png'))


# ---------------------------------------------------------------------------
# Figura 6 — as quatro funções de valoração
# ---------------------------------------------------------------------------

def _curva(t, ox, oy, larg, alt, f, titulo, cor):
    t.retangulo((ox, oy), (ox + larg, oy + alt), CLARO, None, 1)
    t.linha((ox, oy + alt), (ox + larg, oy + alt), CINZA, 1)
    t.linha((ox, oy), (ox, oy + alt), CINZA, 1)
    ant = None
    for i in range(0, 101):
        x = i / 100.0
        p = (ox + x * larg, oy + alt - f(x) * alt)
        if ant:
            t.linha(ant, p, cor, 3)
        ant = p
    t.texto((ox + larg / 2, oy - 26), titulo, cor, 19, True)
    t.texto((ox - 16, oy), '1', CINZA, 15)
    t.texto((ox - 16, oy + alt), '0', CINZA, 15)
    t.texto((ox, oy + alt + 26), 'a₁', CINZA, 15)
    t.texto((ox + larg, oy + alt + 26), 'a₂', CINZA, 15)


def fig_valoracao(destino):
    t = Tela(1180, 640)
    s = lambda x: 2 * x * x if x <= 0.5 else 1 - 2 * (1 - x) ** 2
    larg, alt = 430, 200
    _curva(t, 110, 110, larg, alt, lambda x: x, 'linear crescente', AZUL)
    _curva(t, 640, 110, larg, alt, lambda x: 1 - x, 'linear decrescente', AZUL)
    _curva(t, 110, 400, larg, alt, s, 'função S', VERDE)
    _curva(t, 640, 400, larg, alt, lambda x: 1 - s(x), 'função Z', VERDE)
    t.texto((590, 48), 'As quatro funções de valoração', PRETO, 26, True)
    t.salvar(os.path.join(destino, 'fig6-valoracao.png'))


# ---------------------------------------------------------------------------
# Figura 7 — a bancada da prática, vista de cima
# ---------------------------------------------------------------------------

def fig_bancada(destino):
    t = Tela(1240, 700)
    t.texto((620, 52), 'A bancada, vista de cima', PRETO, 26, True)

    # esteira
    t.retangulo((150, 250), (760, 400), PRETO, None, 3)
    t.texto((300, 232), 'esteira  ·  pino 7 (relé)', CINZA, 18)
    for x in range(190, 740, 70):
        t.linha((x, 250), (x - 26, 400), CLARO, 2)
    t.seta((180, 325), (300, 325), CINZA, 3)

    # peças
    t.retangulo((330, 300), (390, 350), VERDE, None, 3, raio=6)
    t.texto((360, 325), 'peça', VERDE, 15)

    # sensores
    for x, rot, pinos in ((520, 'S1', '2 / 3'), (600, 'S2', '4 / 8')):
        t.retangulo((x - 30, 150), (x + 30, 205), AZUL, None, 3, raio=6)
        t.texto((x, 178), rot, AZUL, 19, True)
        t.texto((x, 128), pinos, CINZA, 15)
        t.linha((x, 205), (x, 250), AZUL, 2, tracejado=10)
    t.texto((560, 96), 'HC-SR04, os dois medindo o MESMO ponto', AZUL, 18)

    # braço
    t.disco((880, 325), 26, PRETO)
    t.texto((880, 380), 'braço', PRETO, 19, True)
    t.texto((880, 406), 'base: pino 9', CINZA, 15)
    t.texto((880, 430), 'garra: pino 10', CINZA, 15)
    t.linha((760, 325), (854, 325), CINZA, 2, tracejado=10)

    # caixas de destino
    t.retangulo((1000, 150), (1160, 270), PRETO, None, 3, raio=8)
    t.texto((1080, 200), 'ESQUERDA', PRETO, 18, True)
    t.texto((1080, 228), 'peça grande', CINZA, 16)
    t.texto((1080, 250), 'base 170°', CINZA, 15)
    t.linha((906, 305), (1000, 210), CINZA, 2)

    t.retangulo((1000, 390), (1160, 510), PRETO, None, 3, raio=8)
    t.texto((1080, 440), 'DIREITA', PRETO, 18, True)
    t.texto((1080, 468), 'peça pequena', CINZA, 16)
    t.texto((1080, 490), 'base 10°', CINZA, 15)
    t.linha((906, 345), (1000, 440), CINZA, 2)

    t.texto((620, 600), 'contradição alta (T ou ⊥): para a esteira e chama o operador —',
            AMBAR, 19)
    t.texto((620, 630), 'o braço não se mexe sobre uma peça mal lida', AMBAR, 19)
    t.salvar(os.path.join(destino, 'fig7-bancada.png'))


def main():
    destino = sys.argv[1] if len(sys.argv) > 1 else 'docs/img'
    os.makedirs(destino, exist_ok=True)
    print('figuras do reticulado em ' + destino)
    fig_qupc(destino)
    fig_reticulado(destino)
    fig_12_estados(destino)
    fig_gcr(destino)
    fig_pipeline(destino)
    fig_valoracao(destino)
    fig_bancada(destino)


if __name__ == '__main__':
    main()

