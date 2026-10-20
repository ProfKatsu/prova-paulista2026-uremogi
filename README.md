# Observatório Prova Paulista

Dashboard de acompanhamento pedagógico da URE Mogi das Cruzes, com os resultados reais das 66 escolas nas três edições fornecidas.

## Publicar no GitHub e na Vercel

1. Extraia o ZIP. Abra a pasta `prova-paulista`.
2. Crie um repositório no GitHub e envie **o conteúdo da pasta**, incluindo `data`, `scripts`, `tests`, `package.json` e `vercel.json`. O `index.html` deve ficar na raiz do repositório.
3. Na Vercel, selecione **Add New → Project** e importe o repositório.
4. Use **Framework Preset: Other**, **Build Command: npm run build** e **Output Directory: dist**. O `vercel.json` já define essas opções. Nenhuma variável de ambiente é necessária.
5. Clique em **Deploy**. Atualizações enviadas ao repositório poderão gerar novas publicações.

O projeto é estático, sem dependências externas, sem chaves e sem banco de dados. A pasta `dist` é gerada durante o build e não precisa ser enviada ao GitHub.

**Acesso:** esta versão não implementa login. Os resultados em `data/results.json` serão acessíveis a quem puder acessar a publicação. Para distribuição restrita, configure proteção de acesso na hospedagem antes da divulgação ou acrescente autenticação e armazenamento no servidor.

## Executar no computador

Instale Node.js 20 ou superior e, dentro da pasta do projeto, execute:

```sh
npm run dev
```

Abra `http://127.0.0.1:4173`. Não abra o HTML diretamente por duplo clique, pois o navegador bloqueia a leitura local do JSON.

```sh
npm test
npm run build
```

Não é necessário `npm install`: os scripts usam somente recursos nativos do Node.

## O que está incluído

- Visão da rede com evolução, prioridades, participação e matriz resultado × variação.
- Busca por nome/código e filtro por indicador e prioridade.
- Tabela ordenável e comparação simultânea de até três escolas.
- Mapa de resultados de 13 componentes, com seleção do bimestre.
- Diagnóstico de cada escola, comparação com a Diretoria e histórico por componente.
- Metas individuais, responsáveis, prazos, ações e evidências.
- Critérios editáveis, exportação CSV e impressão/PDF.
- Backup JSON dos planos e importação validada.
- Layout adaptável a computador, tablet e celular, com navegação por teclado.

## Dados e método

A base possui 198 registros escola–bimestre. Os arquivos originais permanecem inalterados; não são necessários para executar o site. `data/results.json` contém os dados numéricos, os códigos das escolas, as linhas de origem e o SHA-256 de cada planilha.

- A rede completa usa a linha **Total**, linha 68 da aba Export em cada arquivo.
- Médias de recortes são **médias simples de escolas**, não resultados oficiais recalculados. A evolução do recorte usa pares com resultados válidos.
- Diferenças são expressas em pontos percentuais.
- Os 114 zeros em componentes do 1º bimestre são preservados. Por padrão, são excluídos de análises por componente por possível ausência de oferta; a gestão pode incluir zeros reais em Dados e critérios. Esse ajuste não altera acertos gerais.
- Não é possível inferir presentes a partir de “Total Alunos”. Os denominadores das taxas e das médias não constam dos arquivos.
- O Farol SARESP não foi convertido em classificação: as fontes trazem formatos distintos e não fornecem legenda.
- As planilhas indicam provas físicas e código de Diretoria 10501. Não informam ano; a interface não o presume a partir do site anterior.
- Variações são descritivas, não estimativas de ganho de aprendizagem: conteúdo, dificuldade, oferta e participantes podem mudar entre as edições.

### Critérios iniciais propostos

Intensiva: resultado do 3º bimestre menor que 45%. Acompanhamento: não intensiva e resultado menor que 60%, queda recente de pelo menos 3 p.p. ou participação menor que 90%. Manutenção: nenhum desses sinais. Sem dado: sem resultado utilizável no indicador do 3º bimestre.

As metas iniciais sugerem +5 p.p. nos acertos gerais, limitados a 100%. Nenhum desses parâmetros é apresentado como meta oficial. Todos são editáveis. Metas individuais salvas não são alteradas ao mudar os parâmetros.

## Planos e uso por vários gestores

Planos e critérios ficam em `localStorage`, por navegador e endereço do site. Fechar a página preserva os registros; limpar dados do navegador ou trocar de endereço pode removê-los. Faça backups em JSON.

**Não há sincronização entre usuários ou computadores.** É possível compartilhar um backup manualmente e importá-lo. Na importação, planos com o mesmo código escolar só são substituídos após confirmação. Para edição simultânea institucional, o próximo passo é acrescentar autenticação, banco de dados, permissões e histórico de alterações.

Textos não salvos no formulário são descartados ao trocar de escola ou de página. Clique em “Salvar plano desta escola” antes de navegar. A impressão/PDF usa o diálogo de impressão do navegador.

## Organização do código

- `index.html`: estrutura e navegação.
- `styles.css`: identidade visual, responsividade e impressão.
- `app.js`: interações, gráficos SVG, exportações e planos.
- `analytics.js`: regras de cálculo, classificação e validação.
- `data/results.json`: resultados e rastreabilidade.
- `scripts/build.mjs`: geração do site publicável.
- `scripts/serve.mjs`: servidor de desenvolvimento local.
- `scripts/import_xlsx.py`: atualização reprodutível da base.
- `tests/analytics.test.mjs`: testes de integridade e regras.

## Atualizar os arquivos de origem

Com Python e `openpyxl` instalados:

```sh
python scripts/import_xlsx.py "CAMINHO/DA/PASTA/COM/AS/PLANILHAS"
npm test
npm run build
```

Mantenha os nomes dos três arquivos fornecidos. O importador valida códigos únicos e faixas numéricas. Uma mudança de estrutura exige adaptar o importador. Os testes com contagens e totais de origem devem ser revisados conscientemente para uma nova base.

## Referências de concepção

A navegação parte do [painel anterior](https://dashpp2026.vercel.app/). A nova estrutura privilegia síntese, comparação e ação, com gráficos diretamente rotulados e cores acompanhadas de texto. Referências consultadas: [Datawrapper — Learn](https://www.datawrapper.de/learn) e [Dashboard Design Patterns](https://arxiv.org/abs/2205.00757).
