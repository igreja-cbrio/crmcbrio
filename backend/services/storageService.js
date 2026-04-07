/**
 * Storage Service — abstrai upload/download de arquivos.
 * Fase A: Supabase Storage (bucket eventos-anexos)
 * Fase B: SharePoint via Microsoft Graph API (quando configurado)
 */
const { supabase } = require('../utils/supabase');

const BUCKET = 'eventos-anexos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Sanitiza nome para usar como path de arquivo
function sanitizePath(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_\-. ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

function buildPath(eventName, phaseName, fileName) {
  const ev = sanitizePath(eventName);
  const ph = sanitizePath(phaseName || 'geral');
  const fn = sanitizePath(fileName);
  return `${ev}/${ph}/${Date.now()}_${fn}`;
}

/**
 * Upload de arquivo para storage
 * @returns {{ url: string, path: string, provider: 'supabase' | 'sharepoint' }}
 */
async function uploadFile(eventName, phaseName, fileName, fileBuffer, mimeType) {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`Arquivo excede o limite de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // TODO Fase B: se SharePoint configurado, usar Graph API aqui
  // if (process.env.SHAREPOINT_SITE_ID) { return uploadToSharePoint(...); }

  const path = buildPath(eventName, phaseName, fileName);
  const { error } = await supabase.storage.from(BUCKET).upload(path, fileBuffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Erro no upload: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl, path, provider: 'supabase' };
}

/**
 * Download conteúdo do arquivo (para IA ler)
 * @returns {Buffer}
 */
async function downloadFile(supabasePath) {
  if (!supabasePath) throw new Error('Path não fornecido');

  const { data, error } = await supabase.storage.from(BUCKET).download(supabasePath);
  if (error) throw new Error(`Erro ao baixar: ${error.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Deletar arquivo do storage
 */
async function deleteFile(supabasePath) {
  if (!supabasePath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([supabasePath]);
  if (error) console.error('[Storage] Delete error:', error.message);
}

/**
 * Gerar URL assinada temporária (para download seguro)
 * @returns {string} URL válida por 1 hora
 */
async function getSignedUrl(supabasePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(supabasePath, 3600);
  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}

module.exports = { uploadFile, downloadFile, deleteFile, getSignedUrl, MAX_FILE_SIZE };
