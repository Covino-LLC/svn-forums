import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/user-context";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Sprout, TreePine, Trees, Globe, Zap, ArrowRight, AlertCircle } from "lucide-react";

const biomeOptions = [
  {
    id: "plot",
    label: "Plot",
    icon: Sprout,
    cost: 1,
    desc: "Hyperlocal — your street, your block, your immediate environment",
    example: "Power lines on Elm Street, drainage issues, neighborhood projects",
  },
  {
    id: "grove",
    label: "Grove",
    icon: TreePine,
    cost: 2,
    desc: "Community — your school district, organizations, local groups",
    example: "PTA spending, community pool repairs, food bank efficiency",
  },
  {
    id: "forest",
    label: "Forest",
    icon: Trees,
    cost: 3,
    desc: "City/Region — infrastructure, policy, systems at city scale",
    example: "Traffic bottlenecks, water infrastructure, zoning laws",
  },
  {
    id: "biosphere",
    label: "Biosphere",
    icon: Globe,
    cost: 5,
    desc: "National/Global — systemic problems, multi-generational issues",
    example: "Prison system loops, energy policy, employment structures",
  },
];

export default function CreatePlant() {
  const { currentUser, refreshUser } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedBiome, setSelectedBiome] = useState("plot");

  const selectedBiomeInfo = biomeOptions.find((b) => b.id === selectedBiome)!;
  const cost = selectedBiomeInfo.cost;
  const canAfford = (currentUser?.energy || 0) >= cost;
  const remainingEnergy = (currentUser?.energy || 0) - cost;

  const plantMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; biome: string }) => {
      const res = await apiRequest("POST", "/api/plants", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants/biome"] });
      refreshUser();
      toast({
        title: "Plant established",
        description: "Your idea has taken root. The AI has evaluated it.",
      });
      setLocation(`/plant/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Planting failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim() || !content.trim()) return;
    plantMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      biome: selectedBiome,
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" data-testid="text-page-title">Plant an Idea</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every plant costs energy to establish. Choose your biome wisely.
        </p>
      </div>

      {!currentUser && (
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-login-to-plant">
          <Link href="/login" className="underline">Log in or sign up</Link> to plant an idea.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs font-medium">Title</Label>
          <Input
            id="title"
            placeholder="Name your plant — what problem are you addressing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
            data-testid="input-plant-title"
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-xs font-medium">Content</Label>
          <Textarea
            id="content"
            placeholder="Plant your idea with evidence and logic. The AI will score your content immediately — rhetoric will be identified, logic will be rewarded. Use data, be specific, cite sources where possible."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-sm min-h-[160px]"
            data-testid="input-plant-content"
          />
          <p className="text-[10px] text-muted-foreground">
            Tip: Logical connectors (therefore, because, evidence) increase your logic score. Rhetorical markers (always, never, everyone knows) flag rhetoric.
          </p>
        </div>

        {/* Biome selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Biome</Label>
          <div className="grid grid-cols-2 gap-2">
            {biomeOptions.map((biome) => {
              const Icon = biome.icon;
              const isSelected = selectedBiome === biome.id;
              return (
                <button
                  key={biome.id}
                  type="button"
                  onClick={() => setSelectedBiome(biome.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`button-biome-${biome.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{biome.label}</span>
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Zap className="w-2.5 h-2.5" />
                      {biome.cost}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{biome.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cost preview */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Your energy</span>
            <span className="text-sm font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {currentUser?.energy || 0}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Planting cost ({selectedBiomeInfo.label})</span>
            <span className="text-sm font-bold text-red-500">-{cost}</span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-xs font-medium">After planting</span>
            <span className={`text-sm font-bold ${canAfford ? "text-foreground" : "text-red-500"}`}>
              {remainingEnergy}
            </span>
          </div>
          {!canAfford && (
            <div className="mt-2 flex items-center gap-1.5 text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[10px]">Not enough energy. Contribute to other plants to earn more.</span>
            </div>
          )}
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full gap-2"
          disabled={!title.trim() || !content.trim() || !canAfford || plantMutation.isPending}
          data-testid="button-submit-plant"
        >
          {plantMutation.isPending ? (
            "Planting..."
          ) : (
            <>
              Plant in {selectedBiomeInfo.label}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
