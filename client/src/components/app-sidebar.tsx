import { Home, Plus, User, Sprout, TreePine, Trees, Globe, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useUser } from "@/lib/user-context";
import { Badge } from "@/components/ui/badge";

const tierNames: Record<number, string> = { 1: "Seedling", 2: "Sapling", 3: "Established", 4: "Canopy" };
const tierIcons: Record<number, typeof Sprout> = { 1: Sprout, 2: TreePine, 3: Trees, 4: Globe };

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Plant", url: "/create", icon: Plus },
  { title: "Profile", url: "/profile", icon: User },
];

function SVNLogo() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className="w-8 h-8"
      aria-label="SVN Logo"
    >
      {/* Root/network pattern */}
      <path
        d="M20 38V22M20 22C20 22 12 20 8 24M20 22C20 22 28 20 32 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M20 38C20 38 14 34 10 36M20 38C20 38 26 34 30 36"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Trunk */}
      <line x1="20" y1="24" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Canopy - organic shape */}
      <path
        d="M20 4C14 4 8 8 8 14C8 18 11 20 14 20C14 20 12 16 14 13C16 10 20 8 20 8C20 8 24 10 26 13C28 16 26 20 26 20C29 20 32 18 32 14C32 8 26 4 20 4Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Energy dot */}
      <circle cx="20" cy="14" r="2" fill="hsl(38 70% 50%)" />
    </svg>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { currentUser, logout } = useUser();


  const TierIcon = currentUser ? tierIcons[currentUser.tier] || Sprout : Sprout;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <SVNLogo />
          <div>
            <h2 className="text-sm font-bold tracking-tight">SVN</h2>
            <p className="text-[11px] text-muted-foreground leading-none">Symbiotic Value Network</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <div className="px-3 py-2">
        {currentUser ? (
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium truncate" data-testid="text-username">{currentUser.username}</span>
            <button type="button" className="text-muted-foreground underline" onClick={logout} data-testid="button-logout">Log out</button>
          </div>
        ) : (
          <Link href="/login" className="block text-center rounded-md bg-primary text-primary-foreground text-xs font-medium py-2" data-testid="link-login">
            Sign up / Log in
          </Link>
        )}
      </div>

      {/* Energy display */}
      {currentUser && (
        <div className="px-3 py-2">
          <div className="rounded-md bg-accent/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TierIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">{tierNames[currentUser.tier]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-lg font-bold" data-testid="text-energy-sidebar">{currentUser.energy}</span>
              <span className="text-[11px] text-muted-foreground">energy</span>
            </div>
          </div>
        </div>
      )}

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Biomes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { name: "Plot", icon: Sprout, desc: "Hyperlocal" },
                { name: "Grove", icon: TreePine, desc: "Community" },
                { name: "Forest", icon: Trees, desc: "City/Region" },
                { name: "Biosphere", icon: Globe, desc: "Global" },
              ].map((biome) => (
                <SidebarMenuItem key={biome.name}>
                  <SidebarMenuButton asChild>
                    <Link href={`/?biome=${biome.name.toLowerCase()}`} data-testid={`link-biome-${biome.name.toLowerCase()}`}>
                      <biome.icon className="w-4 h-4" />
                      <span>{biome.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{biome.desc}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <p className="text-[10px] text-muted-foreground text-center">
          SVN Prototype v0.1 — Where ideas prove themselves
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
