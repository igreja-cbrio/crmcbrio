-- ============================================================
-- Migration 034: File Digest (resumo IA incremental)
-- Armazena resumo gerado por IA na hora do upload, evitando
-- re-processar todos os arquivos ao gerar relatório final.
-- ============================================================

ALTER TABLE event_task_attachments ADD COLUMN IF NOT EXISTS file_digest TEXT;

COMMENT ON COLUMN event_task_attachments.file_digest IS 'Resumo gerado por IA (Haiku) na hora do upload — usado no relatório final ao invés de re-baixar o arquivo';
