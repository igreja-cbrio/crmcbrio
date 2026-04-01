"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  Church,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  FileText,
  FolderKanban,
  GraduationCap,
  HandHelping,
  Heart,
  LogOut,
  Map,
  MapPin,
  Megaphone,
  Package,
  Palmtree,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Warehouse,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

const sidebarVariants = {
  open: { width: "16rem" },
  closed: { width: "3.5rem" },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut",
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
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
      { label: "Funcionários", path: "/admin/rh?tab=1", icon: UserPlus },
      { label: "Treinamentos", path: "/admin/rh?tab=2", icon: GraduationCap },
      { label: "Férias", path: "/admin/rh?tab=3", icon: Palmtree },
      { label: "Financeiro", path: "/admin/financeiro", icon: DollarSign },
      { label: "Transações", path: "/admin/financeiro?tab=2", icon: Receipt },
      { label: "Contas a Pagar", path: "/admin/financeiro?tab=3", icon: FileText },
      { label: "Reembolsos", path: "/admin/financeiro?tab=4", icon: CreditCard },
      { label: "Logística", path: "/admin/logistica", icon: Truck },
      { label: "Fornecedores", path: "/admin/logistica?tab=1", icon: ShoppingCart },
      { label: "Solicitações", path: "/admin/logistica?tab=2", icon: ClipboardCheck },
      { label: "Pedidos", path: "/admin/logistica?tab=3", icon: Package },
      { label: "Patrimônio", path: "/admin/patrimonio", icon: Tag },
      { label: "Bens", path: "/admin/patrimonio?tab=1", icon: Warehouse },
      { label: "Localizações", path: "/admin/patrimonio?tab=2", icon: MapPin },
      { label: "Inventários", path: "/admin/patrimonio?tab=3", icon: RotateCcw },
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
  const [openGroups, setOpenGroups] = useState<string[]>(["admin", "projetos"]);
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
    <motion.div
      className={cn("sidebar fixed left-0 z-40 h-full shrink-0 border-r border-[#d5e4e6]")}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex text-[#408097] h-full shrink-0 flex-col bg-[#eae3da] transition-all"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            {/* Header */}
            <div className="flex h-[54px] w-full shrink-0 border-b border-[#d5e4e6] p-2">
              <div className="mt-[1.5px] flex w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex w-fit items-center gap-2 px-2 hover:bg-[#d5e4e6]"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#408097]">
                    <Church className="h-3 w-3 text-white" />
                  </div>
                  <motion.li variants={variants} className="flex w-fit items-center gap-2">
                    {!isCollapsed && (
                      <p className="text-sm font-semibold text-[#408097]">CBRio ERP</p>
                    )}
                  </motion.li>
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-1">
                <ScrollArea className="h-16 grow p-2">
                  <div className={cn("flex w-full flex-col gap-0.5")}>
                    {NAV_GROUPS.map((group) => {
                      if (group.roles && !group.roles.includes(role || "")) return null;
                      const isExpanded = openGroups.includes(group.id);

                      return (
                        <React.Fragment key={group.id}>
                          {/* Group header */}
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                              "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-[#d5e4e6]",
                              isCollapsed && "justify-center"
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 shrink-0 transition-transform text-[#70a8b0]",
                                !isExpanded && "-rotate-90"
                              )}
                            />
                            <motion.li variants={variants}>
                              {!isCollapsed && (
                                <p className="ml-1.5 text-[11px] font-bold uppercase tracking-wider text-[#70a8b0]">
                                  {group.label}
                                </p>
                              )}
                            </motion.li>
                          </button>

                          {/* Group items */}
                          {isExpanded &&
                            group.items.map((item) => {
                              if (item.roles && !item.roles.includes(role || "")) return null;
                              const Icon = item.icon;
                              const basePath = item.path.split("?")[0];
                              const isActive = pathname === basePath;

                              return (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  className={cn(
                                    "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-[#d5e4e6] hover:text-[#408097]",
                                    isActive && "bg-[#d5e4e6] text-[#408097] font-medium",
                                    !isActive && "text-[#70a8b0]",
                                  )}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <motion.li variants={variants}>
                                    {!isCollapsed && (
                                      <p className="ml-2 text-sm">{item.label}</p>
                                    )}
                                  </motion.li>
                                </Link>
                              );
                            })}

                          <Separator className="my-1 bg-[#d5e4e6]" />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer - Settings & User */}
              <div className="flex flex-col p-2 border-t border-[#d5e4e6]">
                <div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-[#d5e4e6] hover:text-[#408097]">
                        <Avatar className="size-5 bg-[#408097]">
                          <AvatarFallback className="bg-[#408097] text-white text-[10px] font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <motion.li
                          variants={variants}
                          className="flex w-full items-center gap-2"
                        >
                          {!isCollapsed && (
                            <>
                              <p className="text-sm font-medium text-[#408097] truncate">
                                {profile?.name || "—"}
                              </p>
                              <ChevronsUpDown className="ml-auto h-4 w-4 text-[#70a8b0]/50" />
                            </>
                          )}
                        </motion.li>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5} className="bg-white border-[#d5e4e6]">
                      <div className="flex flex-row items-center gap-2 p-2">
                        <Avatar className="size-6 bg-[#408097]">
                          <AvatarFallback className="bg-[#408097] text-white text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-[#408097]">
                            {profile?.name || "—"}
                          </span>
                          <span className="line-clamp-1 text-xs text-[#70a8b0] capitalize">
                            {profile?.role || ""}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-[#d5e4e6]" />
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-red-500 cursor-pointer hover:text-red-600"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
