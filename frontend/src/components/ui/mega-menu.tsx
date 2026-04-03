import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export type MegaMenuItem = {
  id: number;
  label: string;
  path?: string;
  subMenus?: {
    title: string;
    items: {
      label: string;
      description: string;
      icon: React.ElementType;
      path: string;
    }[];
  }[];
};

export interface MegaMenuProps {
  items: MegaMenuItem[];
  role: string | null;
}

export default function MegaMenu({ items, role }: MegaMenuProps) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isHover, setIsHover] = React.useState<number | null>(null);
  const location = useLocation();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenu(label);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenMenu(null), 150);
  };

  return (
    <ul className="relative flex items-center gap-6">
      {items.map((navItem) => {
        // Filter by role at group level
        const hasAccess = !navItem.subMenus || navItem.subMenus.some(sub =>
          sub.items.some(item => !item.path.includes('/admin/') && !item.path.includes('/ministerial/') && !item.path.includes('/criativo/'))
          || (role && ['admin', 'diretor'].includes(role))
        );
        if (!hasAccess) return null;

        // Simple link (no submenu)
        if (navItem.path && !navItem.subMenus) {
          const isActive = location.pathname.startsWith(navItem.path);
          return (
            <li key={navItem.id}>
              <Link
                to={navItem.path}
                className={`relative flex items-center px-3.5 py-2 text-sm rounded-full transition-colors duration-200 ${
                  isActive ? "text-[#00B39D]" : "hover:text-[var(--cbrio-text)]"
                }`}
                style={{ color: isActive ? '#00B39D' : 'var(--cbrio-text2)' }}
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                {navItem.label}
                {(isHover === navItem.id) && (
                  <motion.div
                    layoutId="hover-bg"
                    className="absolute inset-0"
                    style={{ background: 'var(--cbrio-border)', borderRadius: 99, opacity: 0.5 }}
                  />
                )}
              </Link>
            </li>
          );
        }

        return (
          <li
            key={navItem.id}
            className="relative"
            onMouseEnter={() => handleEnter(navItem.label)}
            onMouseLeave={handleLeave}
          >
            <button
              className="relative flex cursor-pointer items-center gap-1 py-2 px-3.5 text-sm transition-colors duration-200 rounded-full"
              style={{ color: openMenu === navItem.label ? 'var(--cbrio-text)' : 'var(--cbrio-text2)' }}
              onMouseEnter={() => setIsHover(navItem.id)}
              onMouseLeave={() => setIsHover(null)}
              onClick={() => { if (navItem.path) { window.location.href = navItem.path; } }}
            >
              <span className="relative z-10">{navItem.label}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 relative z-10 transition-transform duration-200 ${
                  openMenu === navItem.label ? "rotate-180" : ""
                }`}
              />
              {(isHover === navItem.id || openMenu === navItem.label) && (
                <motion.div
                  layoutId="hover-bg"
                  className="absolute inset-0"
                  style={{ background: 'var(--cbrio-border)', borderRadius: 99, opacity: 0.5 }}
                />
              )}
            </button>

            <AnimatePresence>
              {openMenu === navItem.label && navItem.subMenus && (
                <div className="absolute left-0 top-full w-auto pt-2 z-50">
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="w-max p-7 shadow-2xl"
                    style={{
                      background: 'var(--cbrio-card)',
                      border: '1px solid var(--cbrio-border)',
                      borderRadius: 16,
                    }}
                  >
                    <div className="flex shrink-0 gap-12">
                      {navItem.subMenus.map((sub) => (
                        <div className="min-w-[220px]" key={sub.title}>
                          <h3
                            className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
                            style={{ color: 'var(--cbrio-text3)' }}
                          >
                            {sub.title}
                          </h3>
                          <ul className="space-y-0.5">
                            {sub.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = location.pathname.startsWith(item.path);
                              return (
                                <li key={item.path}>
                                  <Link
                                    to={item.path}
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-center gap-3.5 rounded-xl px-3 py-3.5 transition-colors duration-150 group"
                                    style={{
                                      background: isActive ? '#00B39D10' : undefined,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isActive) (e.currentTarget.style.background = 'var(--cbrio-border)');
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isActive) (e.currentTarget.style.background = 'transparent');
                                    }}
                                  >
                                    <div
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150"
                                      style={{
                                        borderColor: isActive ? '#00B39D' : 'var(--cbrio-border)',
                                        color: isActive ? '#00B39D' : 'var(--cbrio-text2)',
                                        background: isActive ? '#00B39D15' : undefined,
                                      }}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p
                                        className="text-sm font-medium leading-tight"
                                        style={{ color: isActive ? '#00B39D' : 'var(--cbrio-text)' }}
                                      >
                                        {item.label}
                                      </p>
                                      <p
                                        className="text-xs leading-snug mt-0.5"
                                        style={{ color: 'var(--cbrio-text3)' }}
                                      >
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
