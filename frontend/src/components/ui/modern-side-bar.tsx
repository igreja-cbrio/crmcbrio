"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Church,
  DollarSign,
  FolderKanban,
  HandHelping,
  Heart,
  LogOut,
  Map,
  Megaphone,
  Tag,
  Truck,
  UserCheck,
  Users,
  UsersRound,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

const sidebarVariants = {
  open: { width: "15rem" },
  closed: { width: "3.5rem" },
};

const labelVariants = {
  open: { opacity: 1, x: 0, display: "block" },
  closed: { opacity: 0, x: -10, transitionEnd: { display: "none" } },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut",
  duration: 0.2,
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  roles?: string[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "admin",
    label: "Administrativo",
    roles: ["admin", "diretor"],
    items: [
      { label: "RH", path: "/admin/rh", icon: Users },
      { label: "Financeiro", path: "/admin/financeiro", icon: DollarSign },
      { label: "Logística", path: "/admin/logistica", icon: Truck },
      { label: "Patrimônio", path: "/admin/patrimonio", icon: Tag },
    ],
  },
  {
    id: "projetos",
    label: "Projetos e Eventos",
    items: [
      { label: "Eventos", path: "/eventos", icon: CalendarDays },
      { label: "Calendário", path: "/calendario", icon: CalendarDays },
      { label: "Projetos", path: "/projetos", icon: FolderKanban, roles: ["admin", "diretor"] },
      { label: "Expansão", path: "/expansao", icon: Map, roles: ["admin", "diretor"] },
    ],
  },
  {
    id: "ministerial",
    label: "Ministerial",
    roles: ["admin", "diretor"],
    items: [
      { label: "Integração", path: "/ministerial/integracao", icon: UserCheck },
      { label: "Grupos", path: "/ministerial/grupos", icon: UsersRound },
      { label: "Cuidados", path: "/ministerial/cuidados", icon: Heart },
      { label: "Voluntariado", path: "/ministerial/voluntariado", icon: HandHelping },
      { label: "Membresia", path: "/ministerial/membresia", icon: BookOpen },
    ],
  },
  {
    id: "criativo",
    label: "Criativo",
    roles: ["admin", "diretor"],
    items: [
      { label: "Marketing", path: "/criativo/marketing", icon: Megaphone },
    ],
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openGroups, setOpenGroups] = useState<string[]>(["admin", "projetos", "ministerial", "criativo"]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [notificationCount] = useState(3); // TODO: fetch from Supabase notifications table

  const pathname = location.pathname;

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const initials = (profile?.name || "??")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.nav
      className="fixed left-0 top-0 z-40 h-screen"
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="flex h-full flex-col bg-[#111111] border-r border-[#262626]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-[#262626]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00B39D] shadow-sm shadow-[#00B39D]/20">
            <Church className="h-4 w-4 text-[#0a0a0a]" />
          </div>
          <motion.span
            variants={labelVariants}
            transition={transitionProps}
            className="text-sm font-bold text-white whitespace-nowrap"
          >
            CBRio ERP
          </motion.span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <div className="flex flex-col gap-1 px-2.5">
            {NAV_GROUPS.map((group) => {
              if (group.roles && !group.roles.includes(role || "")) return null;
              const isExpanded = openGroups.includes(group.id);

              return (
                <div key={group.id} className="mb-1">
                  {/* Group header */}
                  <button
                    onClick={() => !isCollapsed && toggleGroup(group.id)}
                    className={cn(
                      "flex h-7 w-full items-center gap-1.5 rounded-md transition-colors hover:bg-[#1e1e1e]",
                      isCollapsed ? "justify-center px-0" : "pl-4 pr-2"
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 shrink-0 text-[#525252] transition-transform duration-200",
                        isExpanded && "rotate-90",
                        isCollapsed && "opacity-0 w-0"
                      )}
                    />
                    <motion.span
                      variants={labelVariants}
                      transition={transitionProps}
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#525252] whitespace-nowrap"
                    >
                      {group.label}
                    </motion.span>
                  </button>

                  {/* Group items */}
                  <AnimatePresence initial={false}>
                    {(isExpanded || isCollapsed) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        {group.items.map((item) => {
                          if (item.roles && !item.roles.includes(role || "")) return null;
                          const Icon = item.icon;
                          const basePath = item.path.split("?")[0];
                          const isActive = pathname.startsWith(basePath);

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={cn(
                                "flex h-9 items-center gap-2.5 rounded-lg my-0.5 transition-all duration-150",
                                isCollapsed ? "justify-center px-0" : "pl-6 pr-3",
                                isActive
                                  ? "bg-[#00B39D]/10 text-[#00B39D]"
                                  : "text-[#737373] hover:bg-[#1e1e1e] hover:text-[#a3a3a3]"
                              )}
                            >
                              <Icon className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-[#00B39D]" : "text-[#525252]"
                              )} />
                              <motion.span
                                variants={labelVariants}
                                transition={transitionProps}
                                className={cn("text-[13px] whitespace-nowrap", isActive && "font-medium")}
                              >
                                {item.label}
                              </motion.span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Notifications */}
        <div className="px-2.5 pb-1">
          <button className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-lg transition-colors hover:bg-[#1e1e1e] text-[#737373] hover:text-[#a3a3a3]",
            isCollapsed ? "justify-center px-0" : "pl-6 pr-3"
          )}>
            <div className="relative shrink-0">
              <Bell className="h-4 w-4 text-[#525252]" />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00B39D] px-1 text-[9px] font-bold text-[#0a0a0a]">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
            <motion.span variants={labelVariants} transition={transitionProps} className="text-[13px] whitespace-nowrap">
              Notificações
            </motion.span>
          </button>
        </div>

        {/* User footer */}
        <div className="border-t border-[#262626] px-2.5 py-3 space-y-2">
          {/* User info */}
          <div className="flex items-center gap-2.5 rounded-lg px-2">
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#00B39D] text-[#0a0a0a] text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white border-2 border-[#111111]">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
                <motion.div
                  variants={labelVariants}
                  transition={transitionProps}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium text-[#e5e5e5] truncate">{profile?.name || "—"}</p>
                  <p className="text-[10px] text-[#525252] capitalize">{profile?.role || ""}</p>
                </motion.div>
            </div>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg h-9 transition-colors text-[#737373] hover:bg-red-500/10 hover:text-red-400",
              isCollapsed ? "justify-center px-0" : "pl-6 pr-3"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <motion.span variants={labelVariants} transition={transitionProps} className="text-[13px] whitespace-nowrap">
              Sair
            </motion.span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
