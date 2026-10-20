# Verificação da entrega

## Concluído

- Extração das três planilhas e junção por código escolar.
- 66 códigos distintos, todos com três edições; 198 registros.
- Preservação dos totais da fonte e rastreabilidade por arquivo, aba e linha.
- Oito testes automatizados: integridade da base, totais regionais, zeros e ausentes, limites de classificação, cronologia, pares comparáveis, validação de backups e segurança do CSV.
- Verificação de sintaxe JavaScript.
- Build estático concluído, sem dependências externas.
- Inspeção visual no navegador em tela de computador e celular.
- Em tela pequena, largura do conteúdo igual à largura disponível; sem transbordamento horizontal da página principal. Tabelas possuem rolagem própria.
- Interações conferidas: busca, seleção de duas escolas, abertura de diagnóstico, criação de plano e persistência após recarregar.

## Limites da verificação

A automação do navegador ficou bloqueada ao testar o diálogo nativo de confirmação de exclusão. Foi possível abrir outra prévia e conferir o layout móvel, mas o fluxo de exclusão não teve confirmação automatizada de conclusão. O registro de teste foi criado apenas no armazenamento local da prévia; não está nos arquivos distribuídos.

Exportação/importação têm validação de formato e regras cobertas por testes de código. O ciclo completo de download, seleção de arquivo e importação não foi verificado no navegador. A saída impressa/PDF também não foi validada visualmente.

A configuração da Vercel está incluída, mas esta entrega não foi publicada nem conectada a um repositório remoto. A publicação deve seguir o README.

## Antes de adotar na rotina

Valide os parâmetros de prioridade, a interpretação dos zeros e as metas com a equipe. Defina o público autorizado a acessar a hospedagem. Se os gestores precisarem editar os mesmos planos simultaneamente, acrescente armazenamento compartilhado e autenticação.
