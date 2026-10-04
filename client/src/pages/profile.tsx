import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/lib/user-context";
import { apiRequest } from "@/lib/queryClient";
import {
  Sprout, TreePine, Trees, Globe, Zap, Leaf, ArrowUpRight, ArrowDownRight,
  ShieldCheck, User as UserIcon, Mail, Calendar
} from "lucide-react";
import { Link } from "wouter";
import type { Plant, Contribution } from "@shared/schema";

const tierNames: Record<number, string> = { 1: "Seedling", 2: "Sapling", 3: "Established", 4: "Canopy" };
const tierDescriptions: Record<number, string> = {
  1: "Core identity verified — email + phone. You exist.",
  2: "Social roots visible — AI can cross-reference your history.",
  3: "Deep behavioral history — years of data across platforms.",
  4: "Full canopy — maximum transparency and trust signal.",
};
const tierEnergy: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 8 };
const biomeIcons: Record<string, typeof Sprout> = { plot: Sprout, grove: TreePine, forest: Trees, biosphere: Globe };

function TierVisualizer({ tier }: { tier: number }) {
  const tiers = [1, 2, 3, 4];

  return (
    <div className="flex items-end gap-2">
      {tiers.map((t) => {
        const height = t * 20;
        const isActive = t <= tier;
        return (
          <div key={t} className="flex flex-col items-center gap-1">
            <div
              className={`w-6 rounded-t transition-all ${
                isActive ? "bg-primary" : "bg-muted"
              }`}
              style={{ height: `${height}px` }}
            />
            <span className={`text-[9px] ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
              T{t}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Profile() {
  const { currentUser } = useUser();

  const { data: userPlants } = useQuery<Plant[]>({
    queryKey: ["/api/plants/user", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const res = await apiRequest("GET", `/api/plants/user/${currentUser.id}`);
      return res.json();
    },
    enabled: !!currentUser,
  });

  const { data: userContributions } = useQuery<Contribution[]>({
    queryKey: ["/api/contributions/user", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const res = await apiRequest("GET", `/api/contributions/user/${currentUser.id}`);
      return res.json();
    },
    enabled: !!currentUser,
  });

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground"><Link href="/login" className="underline">Log in or sign up</Link> to see your profile.</p>
      </div>
    );
  }

  const growingPlants = userPlants?.filter(p => p.status === "growing") || [];
  const compostedPlants = userPlants?.filter(p => p.status === "composted") || [];
  const totalEnergyEarned = (userContributions || [])
    .filter(c => c.energyTransferred > 0)
    .reduce((sum, c) => sum + c.energyTransferred, 0);
  const totalEnergySpent = Math.abs(
    (userContributions || [])
      .filter(c => c.energyTransferred < 0)
      .reduce((sum, c) => sum + c.energyTransferred, 0)
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
          {currentUser.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" data-testid="text-username">{currentUser.username}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> {currentUser.email}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Joined {new Date(currentUser.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tier and energy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4" data-testid="card-tier">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{tierNames[currentUser.tier]}</h3>
                <Badge variant="outline" className="text-[10px]">Tier {currentUser.tier}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tierDescriptions[currentUser.tier]}
              </p>
            </div>
          </div>
          <TierVisualizer tier={currentUser.tier} />
          <p className="text-[10px] text-muted-foreground mt-2">
            Base energy from verification: {tierEnergy[currentUser.tier]} units (max 8)
          </p>
        </Card>

        <Card className="p-4" data-testid="card-energy">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Energy Pool</h3>
          </div>
          <p className="text-3xl font-bold mb-3" data-testid="text-energy-pool">{currentUser.energy}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plants growing</span>
              <span className="font-medium text-emerald-500">{growingPlants.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plants composted</span>
              <span className="font-medium text-amber-600">{compostedPlants.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Contributions made</span>
              <span className="font-medium">{(userContributions || []).length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Energy flow summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-3 text-center">
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">+{totalEnergyEarned}</p>
          <p className="text-[10px] text-muted-foreground">Energy contributed to plants</p>
        </Card>
        <Card className="p-3 text-center">
          <ArrowDownRight className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-500">-{totalEnergySpent}</p>
          <p className="text-[10px] text-muted-foreground">Energy consumed</p>
        </Card>
      </div>

      {/* Plants and contributions tabs */}
      <Tabs defaultValue="plants" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="plants" className="text-xs">My Plants ({(userPlants || []).length})</TabsTrigger>
          <TabsTrigger value="contributions" className="text-xs">My Contributions ({(userContributions || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plants">
          {userPlants && userPlants.length > 0 ? (
            <div className="space-y-2">
              {userPlants.map((plant) => {
                const BiomeIcon = biomeIcons[plant.biome] || Sprout;
                const isComposted = plant.status === "composted";
                return (
                  <Link key={plant.id} href={`/plant/${plant.id}`}>
                    <Card
                      className={`p-3 cursor-pointer hover-elevate ${isComposted ? "opacity-60" : ""}`}
                      data-testid={`card-my-plant-${plant.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <BiomeIcon className={`w-4 h-4 shrink-0 ${isComposted ? "text-amber-700" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isComposted ? "line-through text-muted-foreground" : ""}`}>
                            {plant.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span className="text-xs font-mono">{plant.energy}</span>
                        </div>
                        {isComposted && (
                          <Badge variant="secondary" className="text-[10px] py-0 shrink-0">
                            <Leaf className="w-2.5 h-2.5 mr-0.5" /> composted
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sprout className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No plants yet. Go plant an idea.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contributions">
          {userContributions && userContributions.length > 0 ? (
            <div className="space-y-2">
              {userContributions.map((c) => {
                const typeColors: Record<string, string> = {
                  join: "text-emerald-500",
                  expand: "text-green-500",
                  clarify: "text-blue-500",
                  consume: "text-red-500",
                  correct: "text-amber-500",
                };
                return (
                  <Link key={c.id} href={`/plant/${c.plantId}`}>
                    <Card className="p-3 cursor-pointer hover-elevate" data-testid={`card-contribution-${c.id}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={`text-[10px] py-0 shrink-0 ${typeColors[c.type] || ""}`}>
                          {c.type}
                        </Badge>
                        <p className="text-xs text-muted-foreground flex-1 truncate">{c.content}</p>
                        {c.energyTransferred !== 0 && (
                          <span className={`text-[10px] font-mono shrink-0 ${c.energyTransferred > 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {c.energyTransferred > 0 ? "+" : ""}{c.energyTransferred}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No contributions yet. Visit the dashboard and join a plant.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
