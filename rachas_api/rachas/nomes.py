"""Padronização de nomes de pessoas: "JOÃO DA SILVA" / "joão da silva" -> "João da Silva"."""
import re

# Partículas que ficam em minúsculo quando não são a primeira palavra do nome
PARTICULAS = {'da', 'das', 'de', 'do', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von'}


def _capitalizar(palavra):
    # Maiúscula também após hífen e apóstrofo: "ana-maria" -> "Ana-Maria", "d'ávila" -> "D'Ávila"
    return re.sub(r"(^|[-'’])(\w)", lambda m: m.group(1) + m.group(2).upper(), palavra.lower())


def formatar_nome(texto, inicio=True):
    """Formata um nome em "Title Case" respeitando partículas do português.

    `inicio=False` indica que o texto continua um nome (ex.: o sobrenome),
    então a primeira palavra também pode ser partícula ("da Silva").
    """
    if not texto:
        return texto
    palavras = texto.split()
    formatadas = []
    for i, palavra in enumerate(palavras):
        primeira = inicio and i == 0
        if not primeira and palavra.lower() in PARTICULAS:
            formatadas.append(palavra.lower())
        else:
            formatadas.append(_capitalizar(palavra))
    return ' '.join(formatadas)
