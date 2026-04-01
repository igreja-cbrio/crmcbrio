const { supabase } = require('../utils/supabase');

// Mapeamento de roles antigas para novas
const ROLE_MAP = {
  'diretor': 'pmo', 'admin': 'lider_adm', 'assistente': 'membro_marketing',
  'pmo': 'pmo', 'lider_adm': 'lider_adm', 'lider_marketing': 'lider_marketing',
  'lider_area_adm': 'lider_area_adm', 'membro_marketing': 'membro_marketing',
};

const PERMISSIONS = {
  pmo:              { canEditAll: true, canEditMarketing: true, canEditAdm: true, canViewAll: true, canManageBudget: true, label: 'PMO' },
  lider_adm:        { canEditAdm: true, canViewAll: true, label: 'Líder Administrativo' },
  lider_marketing:  { canEditMarketing: true, canViewMarketing: true, label: 'Líder de Marketing' },
  lider_area_adm:   { canViewAdm: true, canMarkChecklist: true, label: 'Líder de Área ADM' },
  membro_marketing: { canViewMarketing: true, canMarkChecklist: true, label: 'Membro de Marketing' },
};

// Verifica token Supabase JWT e injeta req.user
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Busca perfil do usuário (role, name, area etc.)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, area, active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.active) {
    return res.status(403).json({ error: 'Usuário inativo ou sem perfil' });
  }

  const mappedRole = ROLE_MAP[profile.role] || profile.role;

  req.user = {
    userId: user.id,
    email: user.email,
    role: profile.role,
    mappedRole,
    permissions: PERMISSIONS[mappedRole] || {},
    name: profile.name,
    area: profile.area,
  };

  next();
}

// Verifica se o role do usuário está na lista permitida
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado para este perfil' });
    }
    next();
  };
}

// Autoriza por mappedRole (compatível com roles novas e antigas)
function authorizeCycle(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    const mr = ROLE_MAP[req.user.role] || req.user.role;
    if (roles.length > 0 && !roles.includes(mr)) {
      return res.status(403).json({ error: 'Acesso negado para este perfil' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, authorizeCycle, ROLE_MAP, PERMISSIONS };
