import { useCallback, useEffect, useRef, useState } from "react";
import { social, type Feed, type PostSocial } from "@/lib/social";
import { mensagemErro } from "@/lib/format";

interface Params {
  feed?: Feed;
  autor?: string;
  formato?: "POST" | "REEL";
}

/** Lista paginada de posts com rolagem infinita (o sentinela dispara a próxima página). */
export function useFeed(params: Params) {
  const [posts, setPosts] = useState<PostSocial[]>([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chave = JSON.stringify(params);
  const versao = useRef(0);

  const carregar = useCallback(
    async (num: number) => {
      const minha = versao.current;
      setCarregando(true);
      try {
        const res = await social.feed({ ...params, page: num });
        if (minha !== versao.current) return;
        setPosts(atual => (num === 1 ? res.results : [...atual, ...res.results.filter(p => !atual.some(a => a.id === p.id))]));
        setTemMais(!!res.next);
        setPagina(num);
        setErro(null);
      } catch (e) {
        if (minha === versao.current) setErro(mensagemErro(e, "Não foi possível carregar o feed."));
      } finally {
        if (minha === versao.current) setCarregando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );

  useEffect(() => {
    versao.current += 1;
    setPosts([]);
    setTemMais(true);
    carregar(1);
  }, [carregar]);

  const sentinela = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinela.current;
    if (!el || !temMais || carregando) return;
    const obs = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) carregar(pagina + 1);
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [temMais, carregando, pagina, carregar]);

  return {
    posts,
    carregando,
    erro,
    temMais,
    sentinela,
    maisUma: () => carregar(pagina + 1),
    recarregar: () => carregar(1),
    adicionar: (p: PostSocial) => setPosts(atual => [p, ...atual]),
    remover: (id: string) => setPosts(atual => atual.filter(p => p.id !== id && p.original?.id !== id)),
    atualizar: (p: PostSocial) => setPosts(atual => atual.map(x => (x.id === p.id ? p : x))),
  };
}
