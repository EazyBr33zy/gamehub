# GameHub — Telemetria de Jogos & Backlog

Aplicação web pessoal e privada para gerenciamento de biblioteca de jogos, sessões de jogo, backlog, metas e retrospectiva anual (Wrap-Up).

> **Acesso Restrito:** Este é um site pessoal e privado, de uso exclusivo do administrador/dono da conta (`OWNER_UID`). Usuários não autorizados são desconectados imediatamente com remoção de qualquer cache local.

---

## 🛠️ Tecnologias Principais

- **React 19 + TypeScript + Vite**
- **Tailwind CSS**
- **Firebase Firestore & Firebase Authentication** (sincronização em tempo real via `onSnapshot` e atualizações atômicas via `updateDoc`)
- **Vitest** (suíte de testes automatizados)
- **Lucide React** (iconografia)

---

## 🚀 Comandos de Desenvolvimento

Instale as dependências:
```bash
npm install
```

Inicie o servidor de desenvolvimento local:
```bash
npm run dev
```

Execute a suíte de testes unitários:
```bash
npm test
```

Gere a compilação de produção:
```bash
npm run build
```

Valide a integridade dos tipos e código:
```bash
npm run lint
```

---

## 🔒 Segurança e Dados

- Acesso restrito via autenticação Google.
- Regras de segurança no Firestore bloqueiam leituras e escritas para qualquer usuário diferente do dono.
- As credenciais de API externas opcionais (como Twitch / IGDB para capas em alta definição) ficam salvas exclusivamente no navegador do dono (`localStorage`), podendo ser apagadas a qualquer momento nas configurações ou automaticamente ao encerrar a sessão (logout).
