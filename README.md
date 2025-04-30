# Sistema de Controle de Pregação (Território Map)

Este projeto é uma aplicação web desenvolvida em React com Vite, TypeScript/JavaScript, Tailwind CSS e Firebase para gerenciar territórios de pregação.

## Funcionalidades Implementadas

*   **Autenticação:** Login, cadastro e redefinição de senha para usuários.
*   **Gerenciamento de Congregações:** Criação de congregações. O criador é automaticamente definido como Administrador.
*   **Sistema de Membros e Convites:**
    *   Administradores podem convidar outros usuários (por email) para serem Administradores ou Dirigentes da congregação.
    *   Membros podem ter papéis diferentes (Admin, Dirigente).
    *   Gerenciamento básico de membros (visualização de status e papel).
    *   *(Nota: O envio real do email de convite requer implementação de backend, como Firebase Functions)*.
*   **Suporte a Múltiplas Congregações:**
    *   Usuários podem ser membros de múltiplas congregações.
    *   Interface para selecionar a congregação ativa após o login, caso o usuário pertença a mais de uma.
*   **Gerenciamento de Territórios (Dentro do Contexto da Congregação Selecionada):**
    *   CRUD para Bairros.
    *   CRUD para Cartões de Território (vinculados a Bairros), incluindo **upload e armazenamento de imagem (JPG/PNG) do cartão no Firebase Storage**.
    *   CRUD para Ruas (vinculadas a Cartões).
    *   CRUD para Imóveis (vinculados a Ruas), incluindo número e lado (par/ímpar).
*   **Registro de Saídas de Campo:**
    *   Dirigentes podem registrar saídas selecionando data, horário de início (obrigatório) e fim (opcional), bairro e cartão.
    *   **Visualização da imagem do cartão** durante o registro da saída.
    *   Histórico de saídas visível para o dirigente.
*   **Visualização de Rua (Dirigente):** Dirigentes podem visualizar os imóveis de uma rua (separados por lado par/ímpar) e ver o status atual de cada um.
*   **Compartilhamento de Link:** Dirigentes podem copiar links específicos para cada lado da rua (par/ímpar) para compartilhar com publicadores (link inclui token para identificação da rua/face).
*   **Visualização/Atualização (Publicador):** Publicadores acessam o link compartilhado para visualizar os imóveis de um lado da rua e atualizar o status de cada imóvel (Não Trabalhado, Atendido, Revisita, Estudo, Imóvel Fechado, Casa Vazia, Não Bater), adicionando nome do morador e observações quando aplicável.
*   **Relatórios:**
    *   Página de relatórios com gráficos (usando Recharts).
    *   Indicadores de desempenho como: Saídas por Bairro, Saídas por Cartão/Dia da Semana, Saídas por Cartão/Horário.
    *   **Visualização das imagens dos cartões** cadastrados.
*   **Controle de Acesso Baseado em Papel:** Acesso a funcionalidades como gerenciamento de congregações, convites e relatórios é restrito com base no papel do usuário (Admin/Dirigente) na congregação selecionada.
*   **Configuração Segura:** Credenciais do Firebase são carregadas a partir de variáveis de ambiente (`.env`).
*   **Estilização:** Interface estilizada com Tailwind CSS e componentes shadcn/ui.
*   **Documentação:** Modelo de dados UML (PlantUML) atualizado incluído na pasta `docs/uml`.

## Como Executar

1.  **Clone o repositório (ou descompacte o ZIP):**
    *   `git clone https://github.com/leonardoignacio/territorioMap.git`
    *   OU `unzip territorioMap_updated.zip` (ou o nome do ZIP mais recente)
2.  **Navegue até o diretório:** `cd territorioMap`
3.  **Instale as dependências:** `pnpm install` (Certifique-se de ter Node.js e pnpm instalados)
4.  **Configure o Firebase e Variáveis de Ambiente:**
    *   Crie um projeto no Firebase (<https://console.firebase.google.com/>).
    *   Ative os seguintes serviços:
        *   **Firestore Database:** Para armazenamento de dados.
        *   **Authentication:** Para login (ative Email/Senha e Google Sign-In, se desejar).
        *   **Storage:** Para armazenamento das imagens dos cartões.
    *   Obtenha as credenciais de configuração do seu projeto Firebase (apiKey, authDomain, projectId, storageBucket, etc.).
    *   **Copie o arquivo `.env.example` para um novo arquivo chamado `.env`** na raiz do projeto.
    *   **Edite o arquivo `.env`** e preencha as variáveis com as suas credenciais reais do Firebase:
        *   `VITE_FIREBASE_API_KEY`: Sua chave de API.
        *   `VITE_FIREBASE_AUTH_DOMAIN`: Seu domínio de autenticação.
        *   `VITE_FIREBASE_PROJECT_ID`: Seu ID de projeto.
        *   `VITE_FIREBASE_STORAGE_BUCKET`: O nome do seu bucket de armazenamento (ex: `seu-projeto.appspot.com`).
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`: Seu ID de remetente de mensagens.
        *   `VITE_FIREBASE_APP_ID`: Seu ID de aplicativo.
        *   `VITE_FIREBASE_MEASUREMENT_ID`: (Opcional) Seu ID de medição do Google Analytics.
        *   `VITE_FIREBASE_STORAGE_IMAGE_BASE_PATH`: O caminho base público para acessar as imagens no seu bucket. Geralmente no formato `https://storage.googleapis.com/SEU_BUCKET_NAME/cartoes_imagens/`. **Certifique-se de que a pasta `cartoes_imagens` no seu bucket tenha permissões de leitura pública.**
    *   **Importante:** O arquivo `.env` já está incluído no `.gitignore` e não deve ser enviado para o repositório Git.
5.  **Execute o servidor de desenvolvimento:** `pnpm run dev`
6.  Acesse a aplicação no endereço fornecido (geralmente `http://localhost:5173` ou similar).

## Limitações Conhecidas / Problemas Encontrados

*   **Envio de Convites:** A funcionalidade de convite apenas cria o registro no Firestore com status "Pendente". O envio real do email com um link de ativação precisa ser implementado separadamente usando um serviço de backend (ex: Firebase Functions).
*   **Aceitação de Convites:** A interface e lógica para um usuário aceitar um convite (clicando no link do email e vinculando sua conta) não foi implementada.
*   **Erro de Compilação (Build):** Ao tentar executar `pnpm run build`, pode ocorrer um erro relacionado à análise de sintaxe JSX no arquivo `src/main.tsx`. A configuração do Vite (`vite.config.ts`) foi ajustada para tentar resolver isso para o servidor de desenvolvimento (`pnpm run dev`), mas o erro pode persistir na compilação de produção. Isso pode exigir uma investigação mais aprofundada na configuração do Vite/esbuild/TypeScript.
*   **Permissões do Storage:** Certifique-se de configurar corretamente as regras de segurança do Firebase Storage para permitir o upload por usuários autenticados e a leitura pública das imagens na pasta `cartoes_imagens/` (ou ajuste as regras e o `imageBasePath` conforme sua necessidade).
*   **Testes:** Recomenda-se testar localmente após configurar o Firebase, especialmente as funcionalidades que dependem do banco de dados, autenticação e armazenamento.

## Estrutura do Projeto

*   `public/`: Arquivos estáticos.
*   `src/`: Código-fonte da aplicação.
    *   `components/`: Componentes React reutilizáveis (organizados por funcionalidade).
    *   `config/`: Configuração do Firebase (`firebaseConfig.js`).
    *   `contexts/`: Contexto de autenticação (`AuthContext.js`).
    *   `hooks/`: Hooks personalizados.
    *   `lib/`: Utilitários (shadcn/ui).
    *   `pages/`: Componentes de página (rotas).
    *   `assets/`: Imagens e outros assets.
    *   `App.jsx`: Componente principal e rotas.
    *   `index.css`: Estilos globais e Tailwind.
    *   `main.tsx`: Ponto de entrada da aplicação.
*   `docs/`: Documentação do projeto.
    *   `uml/`: Diagramas UML (PlantUML).
*   `.env.example`: Arquivo de exemplo para variáveis de ambiente.
*   `package.json`, `pnpm-lock.yaml`: Gerenciamento de dependências.
*   `tailwind.config.js`, `postcss.config.js`: Configuração do Tailwind CSS.
*   `vite.config.ts`: Configuração do Vite.
*   `tsconfig.json`, `tsconfig.node.json`: Configuração do TypeScript.
*   `.gitignore`: Arquivos ignorados pelo Git.

