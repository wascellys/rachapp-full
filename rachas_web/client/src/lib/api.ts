import axios from "axios";
import { getImageUrl } from "./image-utils";
import { formatarNome } from "./format";

// URL base da API
// Usando proxy do Vite para evitar problemas de CORS e mixed content
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:8000/api/auth";

// Instância do Axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Interceptor para normalizar URLs de imagens na resposta
api.interceptors.response.use(
  response => {
    // Se a resposta contém dados, processar campos de imagem
    if (response.data) {
      processImageUrls(response.data);
      processNomes(response.data);
    }
    return response;
  },
  error => Promise.reject(error)
);

// Interceptor para renovar o token se expirar
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Se o erro for 401 (Unauthorized) e não for uma tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          // Se não houver refresh token, redirecionar para login
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Tentar renovar o token
        const response = await axios.post(`${AUTH_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem("access_token", access);

        // Refazer a requisição original com o novo token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Se falhar ao renovar, limpar tokens e redirecionar
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Processa URLs de imagem em objetos de resposta
 * Detecta automaticamente campos de imagem comuns
 */
function processImageUrls(data: any): void {
  const imageFields = [
    "imagem_perfil",
    "jogador_imagem_perfil",
    "foto",
    "image",
    "avatar",
  ];

  if (Array.isArray(data)) {
    // Processar array
    data.forEach(item => {
      if (typeof item === "object" && item !== null) {
        processImageUrls(item);
      }
    });
  } else if (typeof data === "object" && data !== null) {
    // Processar objeto
    imageFields.forEach(field => {
      if (field in data && typeof data[field] === "string") {
        data[field] = getImageUrl(data[field]);
      }
    });

    // Processar campos aninhados recursivamente
    Object.values(data).forEach(value => {
      if (typeof value === "object" && value !== null) {
        processImageUrls(value);
      }
    });
  }
}

/**
 * Padroniza nomes de pessoas vindos da API ("JOÃO DA SILVA" -> "João da Silva").
 * Só toca em campos de pessoa; o "nome" de racha e prêmio fica como está.
 */
const CAMPOS_NOME_PESSOA = ["jogador_nome", "first_name", "last_name"];

function processNomes(data: any): void {
  if (Array.isArray(data)) {
    data.forEach(item => processNomes(item));
  } else if (typeof data === "object" && data !== null) {
    for (const campo of CAMPOS_NOME_PESSOA) {
      if (typeof data[campo] === "string") {
        // Sobrenome pode começar com partícula ("da Silva"), então formata como continuação do nome
        data[campo] = campo === "last_name" ? formatarNome(`x ${data[campo]}`).slice(2) : formatarNome(data[campo]);
      }
    }
    // "nome" só é de pessoa quando vem junto com "username" (jogadores do álbum, dashboard)
    if (typeof data.nome === "string" && typeof data.username === "string") {
      data.nome = formatarNome(data.nome);
    }
    Object.values(data).forEach(valor => {
      if (typeof valor === "object" && valor !== null) processNomes(valor);
    });
  }
}

export const auth = {
  login: async (credentials: any) => {
    const response = await axios.post(`${AUTH_URL}/token/`, credentials);
    return response.data;
  },
  register: async (userData: any) => {
    // Implementar registro se houver endpoint específico ou usar fluxo de login social
    // Por enquanto, assumimos que o registro é via login social ou admin cria
    return Promise.resolve();
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  },
  passwordReset: async (email: string) => {
    const response = await axios.post(`${AUTH_URL}/password/reset/`, { email });
    return response.data;
  },
  passwordResetConfirm: async (data: any) => {
    const response = await axios.post(`${AUTH_URL}/password/reset/confirm/`, data);
    return response.data;
  },
};

export default api;
