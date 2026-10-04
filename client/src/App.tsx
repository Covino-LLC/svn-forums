import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import PlantDetail from "@/pages/plant-detail";
import CreatePlant from "@/pages/create-plant";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { UserProvider, useUser } from "@/lib/user-context";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function EnergyDisplay() {
  const { currentUser } = useUser();
  if (!currentUser) return null;
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="gap-1 text-amber-500 dark:text-amber-400 border-amber-500/30"
      >
        <Zap className="w-3 h-3" />
        <span data-testid="text-energy-header">{currentUser.energy}</span>
      </Badge>
    </div>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/plant/:id" component={PlantDetail} />
      <Route path="/create" component={CreatePlant} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Auth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <Router hook={useHashLocation}>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <EnergyDisplay />
            </header>
            <main className="flex-1 overflow-y-auto">
              <AppRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
