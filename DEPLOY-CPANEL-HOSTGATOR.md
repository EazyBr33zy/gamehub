# Como publicar no cPanel da HostGator (https://filipeaurelio.com.br/)

Este projeto (**GameHub — Sanctuary OS**) é um **SPA React + Vite + TypeScript** integrado ao **Firebase Firestore Cloud Database**.
Todas as informações cadastradas ou editadas são **salvas diretamente no servidor na nuvem (Firestore)** em tempo real. Quando você acessar pelo computador ou pelo celular, os dados serão sempre sincronizados instantaneamente a partir do servidor.

Depois de compilado, o projeto gera apenas arquivos estáticos otimizados (`index.html`, `.css`, `.js`, `.htaccess`). **Não precisa de Node.js no servidor HostGator**, funcionando 100% no Apache do cPanel através do `public_html`.

---

## 0. Pré-requisitos (no seu computador)

- Node.js 20+ instalado → https://nodejs.org
- Acesso ao **Gerenciador de Arquivos** do cPanel ou FTP (FileZilla) da HostGator para o domínio `filipeaurelio.com.br`

### Gerar a pasta `dist/`:

```bash
npm install --legacy-peer-deps
npm run build
```

Isso gera a pasta `dist/` com:
- `dist/index.html`
- `dist/.htaccess` (configuração do Apache para rotas e cache)
- `dist/assets/...` (scripts e estilos)

---

## 1. Fazer o upload para o cPanel da HostGator

### Opção Recomendada — Gerenciador de Arquivos do cPanel

1. No seu computador, entre na pasta `dist/`, selecione todos os arquivos (`index.html`, `.htaccess`, pasta `assets/`) e compacte em `site.zip`.
2. Acesse o **cPanel da HostGator** > **Arquivos** > **Gerenciador de Arquivos**.
3. Navegue até a pasta raiz do seu domínio `filipeaurelio.com.br`:
   - Geralmente é `public_html/` (ou a pasta configurada para o domínio `filipeaurelio.com.br`).
4. Clique em **Carregar (Upload)** e envie o `site.zip`.
5. Selecione o arquivo enviado no cPanel e clique em **Extrair (Extract)**.
6. A estrutura final dentro de `public_html/` deve ficar exatamente assim:

```
public_html/
├── index.html
├── .htaccess
└── assets/
    ├── index-XXXXX.js
    └── index-XXXXX.css
```

*(Certifique-se de que os arquivos estejam na raiz de `public_html` e não dentro de uma subpasta `dist/`)*

---

## 2. Sincronização Nuvem Servidor (PC + Celular)

- O Firestore Database está provisionado e com as regras ativas no servidor (`ai-studio-gamehubsanctuary-75aae5c2-f3b8-4b9a-919b-8007868b8a75`).
- **Ao abrir no computador**: o site se conecta ao Firestore e carrega os jogos do servidor.
- **Ao cadastrar ou editar um jogo**: a alteração é gravada imediatamente no servidor.
- **Ao abrir no celular (https://filipeaurelio.com.br/)**: o celular se conecta ao mesmo banco na nuvem e puxa todas as edições em tempo real.
- **Indicador no topo do site**: Exibe `🟢 Servidor Ativo` confirmando a sincronização em tempo real.

---

## 3. Autorizar o domínio no Firebase (Para Login Google opcional)

Caso queira usar o botão "Login com Google" com seu email `Filipeaurellio@gmail.com` dentro de `https://filipeaurelio.com.br/`:

1. Acesse o console do Firebase: https://console.firebase.google.com
2. Selecione o projeto `gen-lang-client-0766394879`
3. Vá em **Authentication** > aba **Settings (Configurações)** > **Authorized domains (Domínios autorizados)**.
4. Clique em **Add domain** e adicione:
   - `filipeaurelio.com.br`
   - `www.filipeaurelio.com.br`
5. Salve. Pronto! O login com Google funcionará no seu domínio personalizado.

*(Nota: A sincronização dos jogos no servidor funciona imediatamente entre PC e celular mesmo sem efetuar login, pois a coleção de jogos está conectada diretamente ao Firestore)*.

---

## 4. Regras de cache / SPA (opcional, recomendado)

Como o app não usa rotas (`react-router`), não é obrigatório. Mas se no futuro usar,
crie `.htaccess` em `public_html` (cPanel › Gerenciador de Arquivos › **+ Arquivo**):

```apache
# Arquivos com hash no nome podem ser cacheados por 1 ano
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Reescreve qualquer rota inexistente para o index.html (necessário p/ SPA routing)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 5. Rotina de atualização

```bash
npm run build
# zipar CONTEÚDO de dist/ → subir → extrair em public_html/
```
Dica: mantenha uma cópia de segurança da versão anterior em `public_html/backup-2026-09-29/`.

---

## 6. Alternativa: build direto no servidor (Node.js Selector)

Só se você quiser versionar via Git no cPanel:

1. cPanel › **Software › Aplicação Node.js (Seletor de Aplicativos Node.js)** →
   *Create Application*: App Mode `Production`, Node.js 20+, App URL `seudominio.com`,
   Application Root `/home/USUARIO/gamehub`, Application Startup File deixe vazio/arquivo dummy.
2. No **Terminal** do cPanel:
   ```bash
   cd ~/gamehub
   npm install --legacy-peer-deps
   npm run build
   ```
3. Aponte o documento raiz do domínio para `~/gamehub/dist`
   (cPanel › Domínios › *Document Root*) **ou** copie `dist/*` para `public_html/`.

Observação: na HostGator compartilhada o Node.js Selector costuma reiniciar/dormir; para um
site estático como este, o caminho mais robusto é o **Opção A (upload de `dist/`)**.

---

## 7. Checklist rápido

- [ ] `npm install --legacy-peer-deps && npm run build` rodou sem erros
- [ ] Conteúdo de `dist/` extraído **dentro** de `public_html/` (não em `public_html/dist/`)
- [ ] HTTPS/AutoSSL ativo
- [ ] Domínio adicionado em **Firebase Auth › Domínios autorizados**
- [ ] `firestore.rules` aplicadas no projeto Firebase usado
- [ ] Teste de login Google + leitura/escrita no Firestore funcionando em produção

## Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| Tela branca | arquivos em subpasta | mover `index.html`/`assets` para a raiz de `public_html` |
| 404 em `/assets/*.js` | cache antigo ou caminho errado | limpar cache, conferir estrutura |
| Login Google falha (`auth/unauthorized-domain`) | domínio não autorizado | adicionar domínio no Firebase Auth |
| `permission-denied` no Firestore | regras | ajustar `firestore.rules` |
| Estilo quebrado | CSS não enviado | reenviar pasta `assets/` |
