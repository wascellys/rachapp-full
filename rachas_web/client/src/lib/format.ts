/**
 * Helpers de formatação e tratamento de erros usados nas páginas.
 */

export const POSICOES: { value: string; label: string; sigla: string }[] = [
  { value: "GOLEIRO", label: "Goleiro", sigla: "GOL" },
  { value: "ZAGUEIRO", label: "Zagueiro", sigla: "ZAG" },
  { value: "LATERAL", label: "Lateral", sigla: "LAT" },
  { value: "VOLANTE", label: "Volante", sigla: "VOL" },
  { value: "MEIA", label: "Meia", sigla: "MEI" },
  { value: "ATACANTE", label: "Atacante", sigla: "ATA" },
];

export function posicaoLabel(posicao?: string | null): string {
  if (!posicao) return "Jogador";
  if (posicao === "DEFENSOR") return "Defensor";
  return POSICOES.find(p => p.value === posicao)?.label ?? posicao;
}

export function posicaoSigla(posicao?: string | null): string {
  if (!posicao) return "JOG";
  if (posicao === "DEFENSOR") return "DEF";
  return POSICOES.find(p => p.value === posicao)?.sigla ?? posicao.slice(0, 3).toUpperCase();
}

interface PessoaLike {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}

// Partículas que ficam em minúsculo no meio do nome (mesma regra do backend, rachas/nomes.py)
const PARTICULAS = new Set(["da", "das", "de", "do", "dos", "e", "di", "du", "del", "della", "van", "von"]);

/** "JOÃO DA SILVA" / "joão da silva" -> "João da Silva". */
export function formatarNome(nome?: string | null): string {
  const palavras = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  return palavras
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (i > 0 && PARTICULAS.has(minuscula)) return minuscula;
      // Maiúscula também após hífen e apóstrofo: "ana-maria" -> "Ana-Maria"
      return minuscula.replace(/(^|[-'’])([^-'’])/g, (_, sep: string, letra: string) => sep + letra.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

/** Nome curto para telas pequenas: primeiro e último nome ("Leonardo do Nascimento Silva" -> "Leonardo Silva"). */
export function nomeCurto(nome?: string | null): string {
  const palavras = formatarNome(nome).split(" ").filter(Boolean);
  if (palavras.length <= 2) return palavras.join(" ");
  const ultimo = [...palavras].reverse().find(p => !PARTICULAS.has(p)) ?? palavras[palavras.length - 1];
  return `${palavras[0]} ${ultimo}`;
}

export function nomeCompleto(p?: PessoaLike | null): string {
  if (!p) return "Anônimo";
  const nome = formatarNome(`${p.first_name ?? ""} ${p.last_name ?? ""}`);
  return nome || p.username || "Jogador";
}

export function primeiroNome(p?: PessoaLike | null): string {
  if (!p) return "Anônimo";
  return formatarNome(p.first_name).split(" ")[0] || p.username || "Jogador";
}

export function iniciais(nome?: string | null): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

/** Data da partida: usa a data do jogo; cai para a data de criação. */
export function dataPartida(p: { data_inicio?: string | null; criado_em?: string | null }): Date | null {
  const valor = p.data_inicio || p.criado_em;
  if (!valor) return null;
  const data = new Date(valor);
  return isNaN(data.getTime()) ? null : data;
}

export function formatarData(data?: Date | string | null, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", ...opts });
}

export function formatarDataCurta(data?: Date | string | null): string {
  return formatarData(data, { year: undefined, day: "2-digit", month: "short" }).replace(".", "").replace(" de ", " ");
}

export function formatarHora(data?: Date | string | null): string {
  if (!data) return "";
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const CAMPOS: Record<string, string> = {
  username: "Usuário",
  email: "E-mail",
  password: "Senha",
  first_name: "Nome",
  last_name: "Sobrenome",
  nome: "Nome",
  administradores_ids: "Administradores",
  jogador_gol_id: "Autor do gol",
  jogador_assistencia_id: "Assistência",
  jogador_id: "Jogador",
};

/**
 * Extrai uma mensagem legível de um erro do axios/DRF.
 * Ex.: {"username": ["A user with that username already exists."]}
 */
export function mensagemErro(error: any, padrao = "Algo deu errado. Tente novamente."): string {
  const data = error?.response?.data;
  if (!error?.response) {
    return "Sem conexão com o servidor. Verifique sua internet.";
  }
  if (!data) return padrao;
  if (typeof data === "string") return padrao;
  if (data.erro) return String(data.erro);
  if (data.detail) return String(data.detail);
  if (data.mensagem) return String(data.mensagem);
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(" ");

  for (const [campo, valor] of Object.entries(data)) {
    const texto = Array.isArray(valor) ? valor.join(" ") : typeof valor === "string" ? valor : null;
    if (texto) {
      const rotulo = CAMPOS[campo];
      return rotulo ? `${rotulo}: ${traduzir(texto)}` : traduzir(texto);
    }
  }
  return padrao;
}

function traduzir(texto: string): string {
  const mapa: [RegExp, string][] = [
    [/A user with that username already exists\./i, "este nome de usuário já está em uso."],
    [/This password is too short.*/i, "senha muito curta (mínimo de 8 caracteres)."],
    [/This password is too common\./i, "senha muito comum, escolha outra."],
    [/This password is entirely numeric\./i, "a senha não pode ter apenas números."],
    [/The password is too similar to the .*/i, "a senha está muito parecida com seus dados."],
    [/Enter a valid email address\./i, "informe um e-mail válido."],
    [/This field is required\./i, "campo obrigatório."],
    [/Enter a valid username.*/i, "use apenas letras, números e @/./+/-/_."],
  ];
  for (const [re, pt] of mapa) if (re.test(texto)) return pt;
  return texto;
}
