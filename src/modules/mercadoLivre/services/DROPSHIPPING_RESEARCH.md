# Research adapters e proveniência

O módulo define contratos independentes de fornecedor de dados para permitir conectar APIs oficiais, feeds licenciados e verificações manuais sem acoplar o motor de decisão a um único fornecedor.

- Toda evidência carrega fonte, tipo, data de coleta, campo e confiança.
- Candidatos a fornecedor não viram fornecedores validados automaticamente.
- Candidatos de produto não viram campeões por uma pontuação heurística.
- Não há scraping de marketplaces, chamadas externas, persistência ou previsão inventada neste arquivo.
- Cada adapter futuro deve respeitar termos de uso, limites de API, privacidade e regras do marketplace.

Antes de conectar um provedor real, criar adapter específico, testes com fixtures, tratamento de rate limit, deduplicação, auditoria de origem e política de atualização de dados.
