# 🔄 Configuração de Proxy Reverso - Rachas App

## 📋 Opções de Implementação

### Opção 1: Nginx (Recomendado para Produção)

#### 1.1 Instalação Local

```bash
# Windows (usar WSL2 ou Docker)
# Linux/Mac
sudo apt-get install nginx
sudo service nginx start
```

#### 1.2 Configurar arquivo `nginx.conf`

- Copie o arquivo `nginx.conf` para `/etc/nginx/sites-available/rachas` (Linux)
- Ou use via Docker (recomendado)

#### 1.3 Verificar e iniciar

```bash
sudo nginx -t  # Testar configuração
sudo systemctl restart nginx
```

---

### Opção 2: Docker Compose (Melhor Solução)

#### 2.1 Pré-requisitos

- Docker instalado
- Docker Compose instalado

#### 2.2 Iniciar tudo

```bash
cd /caminho/para/rachas_web_full_source
docker-compose up -d
```

#### 2.3 Verificar status

```bash
docker-compose ps
docker-compose logs -f
```

#### 2.4 Parar

```bash
docker-compose down
```

---

### Opção 3: Apache com mod_proxy

```apache
<VirtualHost *:80>
    ServerName seu_dominio.com

    # API Django
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:8000/api/
    ProxyPassReverse /api/ http://127.0.0.1:8000/api/

    # Admin Django
    ProxyPass /admin/ http://127.0.0.1:8000/admin/
    ProxyPassReverse /admin/ http://127.0.0.1:8000/admin/

    # Estáticos
    ProxyPass /static/ !
    Alias /static/ /caminho/para/staticfiles/

    # Frontend React
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

---

## 🔧 Configurações Django Necessárias

### Arquivo: `config/settings.py`

```python
# CSRF e Hosts Confiáveis
CSRF_TRUSTED_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
    "https://seu_dominio.com",
]

ALLOWED_HOSTS = ['*']  # Ou especificar domínios

# Estáticos em Produção
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Coletar estáticos antes de iniciar
# python manage.py collectstatic --noinput
```

### Headers do Proxy (Importante!)

O Nginx/Apache precisa passar esses headers:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 🌐 HTTPS/SSL (Produção)

### Com Let's Encrypt (Certbot)

```bash
# Instalar certbot
sudo apt-get install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot certonly --standalone -d seu_dominio.com

# Renovação automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Nginx com HTTPS

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/seu_dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu_dominio.com/privkey.pem;

    # ... resto da configuração
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 Fluxo da Requisição

```
Cliente (navegador)
    ↓
[Nginx na porta 80/443]
    ├─ /api/* → Django (8000)
    ├─ /admin/* → Django (8000)
    ├─ /static/* → Arquivos estáticos
    ├─ /media/* → Upload de perfis
    └─ /* → React (3000)
```

---

## 🚀 Checklist de Produção

- [ ] HTTPS/SSL configurado
- [ ] ALLOWED_HOSTS configurado
- [ ] CSRF_TRUSTED_ORIGINS configurado
- [ ] DEBUG = False em settings.py
- [ ] SECRET_KEY em variável de ambiente
- [ ] staticfiles coletados
- [ ] Media folder com permissões corretas
- [ ] Database em produção (PostgreSQL)
- [ ] Logs configurados
- [ ] Backups automatizados

---

## 🔧 Troubleshooting

### "CSRF token missing"

→ Verificar CSRF_TRUSTED_ORIGINS e X-Forwarded-Proto header

### "Static files not loading"

→ Rodar `python manage.py collectstatic --noinput`

### "API retorna 404 com proxy"

→ Verificar se /api/\* está sendo redirecionado para Django

### "Certificado SSL inválido"

→ Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

---

## 📚 Referências

- [Nginx Proxy Pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
