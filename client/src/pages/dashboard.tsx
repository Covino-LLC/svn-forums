import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PlantCard } from "@/components/plant-card";
import { useUser } from "@/lib/user-context";
import { Sprout, TreePine, Trees, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Plant, User, Contribution } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const biomes = [
  { id: "plot", label: "Plot", icon: Sprout, desc: "Your street. Your block." },
  { id: "grove", label: "Grove", icon: TreePine, desc: "Your community. Your organizations." },
  { id: "forest", label: "Forest", icon: Trees, desc: "Your city. Your region." },
  { id: "biosphere", label: "Biosphere", icon: Globe, desc: "National. Global." },
];

export default function Dashboard() {
  // Check URL for biome param
  const urlParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const biomeFromUrl = urlParams.get("biome");
  const [selectedBiome, setSelectedBiome] = useState(biomeFromUrl || "biosphere");

  useEffect(() => {
    if (biomeFromUrl) setSelectedBiome(biomeFromUrl);
  }, [biomeFromUrl]);

  const { currentUser } = useUser();

  const { data: plants, isLoading: plantsLoading } = useQuery<Plant[]>({
    queryKey: ["/api/plants/biome", selectedBiome],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/plants/biome/${selectedBiome}`);
      return res.json();
    },
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allContributions } = useQuery<Contribution[]>({
    queryKey: ["/api/contributions/plant", "all"],
    queryFn: async () => {
      // Fetch contributions for visible plants
      if (!plants || plants.length === 0) return [];
      const results = await Promise.all(
        plants.map(async (p) => {
          const res = await apiRequest("GET", `/api/contributions/plant/${p.id}`);
          return res.json();
        })
      );
      return results.flat();
    },
    enabled: !!plants && plants.length > 0,
  });

  const getUserName = (userId: number) => {
    const user = allUsers?.find((u) => u.id === userId);
    return user?.username || "Unknown";
  };

  const getContributionCount = (plantId: number) => {
    return allContributions?.filter((c: Contribution) => c.plantId === plantId).length || 0;
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">The Proving Grounds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Where ideas grow roots or return to soil
          </p>
        </div>
        <Link href="/create">
          <Button data-testid="button-create-plant" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Plant
          </Button>
        </Link>
      </div>

      {/* Biome tabs */}
      <Tabs value={selectedBiome} onValueChange={setSelectedBiome} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4" data-testid="tabs-biome">
          {biomes.map((biome) => (
            <TabsTrigger
              key={biome.id}
              value={biome.id}
              className="gap-1.5 text-xs"
              data-testid={`tab-biome-${biome.id}`}
            >
              <biome.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{biome.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {biomes.map((biome) => (
          <TabsContent key={biome.id} value={biome.id}>
            {/* Biome description */}
            <div className="mb-4 px-1">
              <p className="text-xs text-muted-foreground">{biome.desc}</p>
            </div>

            {/* Plant grid */}
            {plantsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-lg border border-border/50">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/4 mb-3" />
                    <Skeleton className="h-1.5 w-full mb-3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : plants && plants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plants.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    authorName={getUserName(plant.userId)}
                    contributionCount={getContributionCount(plant.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <biome.icon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-medium mb-1">No plants in this biome yet</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                  Be the first to plant an idea in the {biome.label}.
                </p>
                <Link href="/create">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Plant Something
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
