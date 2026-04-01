"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  ChevronsUpDown,
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
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { label: "Eventos", path: "/eventos", icon: Calendar },
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
      <div className="flex h-full flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/60 shadow-sm">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-3 border-b border-gray-100">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00B39D] shadow-sm">
            <Church className="h-4 w-4 text-white" />
          </div>
          <motion.span
            variants={labelVariants}
            transition={transitionProps}
            className="text-sm font-bold text-gray-800 whitespace-nowrap"
          >
            CBRio ERP
          </motion.span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <div className="flex flex-col gap-1 px-2">
            {NAV_GROUPS.map((group) => {
              if (group.roles && !group.roles.includes(role || "")) return null;
              const isExpanded = openGroups.includes(group.id);

              return (
                <div key={group.id} className="mb-1">
                  {/* Group header */}
                  <button
                    onClick={() => !isCollapsed && toggleGroup(group.id)}
                    className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-gray-100/80"
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200",
                        isExpanded && "rotate-90",
                        isCollapsed && "opacity-0 w-0"
                      )}
                    />
                    <motion.span
                      variants={labelVariants}
                      transition={transitionProps}
                      className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap"
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
                                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 my-0.5 transition-all duration-150",
                                isActive
                                  ? "bg-[#00B39D]/10 text-[#00897B] font-medium"
                                  : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-700"
                              )}
                            >
                              <Icon className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-[#00B39D]" : "text-gray-400"
                              )} />
                              <motion.span
                                variants={labelVariants}
                                transition={transitionProps}
                                className="text-[13px] whitespace-nowrap"
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

        {/* User footer */}
        <div className="border-t border-gray-100 p-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="w-full outline-none">
              <div className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-gray-100/80">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-[#00B39D] text-white text-[11px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <motion.div
                  variants={labelVariants}
                  transition={transitionProps}
                  className="flex flex-1 items-center min-w-0"
                >
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{profile?.name || "—"}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{profile?.role || ""}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                </motion.div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" sideOffset={8} align="start" className="w-56 rounded-xl border-gray-200 shadow-lg">
              <div className="flex items-center gap-2.5 p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#00B39D] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{profile?.name || "—"}</span>
                  <span className="text-xs text-gray-400">{profile?.email || ""}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-500 cursor-pointer rounded-lg mx-1 hover:text-red-600"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.nav>
  );
}
