// ══════════════════════════════════════
// Sanitização e Validação de inputs
// ══════════════════════════════════════

// Sanitizar string: remove tags HTML e trim
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

// Sanitizar objeto inteiro (recursivo)
const sanitizeObj = (obj) => {
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObj);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      clean[key] = sanitizeObj(val);
    }
    return clean;
  }
  return obj;
};

// Validar UUID v4
const isValidUUID = (str) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Validar data YYYY-MM-DD
const isValidDate = (str) => {
  if (!str) return true; // opcional
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
};

// Validar enum
const isValidEnum = (val, allowed) => {
  return allowed.includes(val);
};

// Log de auditoria
const logActivity = async (db, { userId, action, entityType, entityId, oldValue, newValue }) => {
  await db.query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_value, new_value) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, entityType, entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
  );
};

module.exports = { sanitize, sanitizeObj, isValidUUID, isValidDate, isValidEnum, logActivity };
