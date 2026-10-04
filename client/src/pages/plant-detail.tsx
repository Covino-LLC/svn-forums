import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/user-context";
import { apiRequest } from "@/lib/queryClient";
import {
  Sprout, TreePine, Trees, Globe, Zap, ArrowLeft, Leaf,
  ShieldCheck, AlertTriangle, Clock, Brain, Search, Target, Lightbulb,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Plant, User, Contribution, AIScore } from "@shared/schema";

const biomeIcons: Record<string, typeof Sprout> = { plot: Sprout, grove: TreePine, forest: Trees, biosphere: Globe };
const biomeLabels: Record<string, string> = { plot: "Plot", grove: "Grove", forest: "Forest", biosphere: "Biosphere" };
const tierNames: Record<number, string> = { 1: "Seedling", 2: "Sapling", 3: "Established", 4: "Canopy" };

const contributionTypes = [
  { value: "join", label: "Join", desc: "Add your energy to this plant (costs 1 energy)", icon: "🌱" },
  { value: "expand", label: "Expand", desc: "Build on this idea (costs 1 energy)", icon: "🌿" },
  { value: "clarify", label: "Clarify", desc: "Sharpen the reasoning (costs 1 energy)", icon: "💧" },
  { value: "consume", label: "Consume", desc: "Challenge with logic (costs 2 energy)", icon: "🔥" },
  { value: "correct", label: "Correct", desc: "Fix an error (costs 1 energy)", icon: "⚡" },
];

function AIScorePanel({ aiScore }: { aiScore: AIScore }) {
  const categories = [
    { key: "logic", label: "Logic", value: aiScore.logic, color: "text-emerald-500", bgColor: "bg-emerald-500", icon: Brain, type: "positive" },
    { key: "rhetoric", label: "Rhetoric", value: aiScore.rhetoric, color: "text-red-500", bgColor: "bg-red-500", icon: AlertTriangle, type: "negative" },
    { key: "nostalgia", label: "Nostalgia", value: aiScore.nostalgia, color: "text-amber-600", bgColor: "bg-amber-600", icon: Clock, type: "negative" },
    { key: "emotionalAppeal", label: "Emotional Appeal", value: aiScore.emotionalAppeal, color: "text-yellow-500", bgColor: "bg-yellow-500", icon: Target, type: "flagged" },
    { key: "novelty", label: "Novelty", value: aiScore.novelty, color: "text-blue-500", bgColor: "bg-blue-500", icon: Lightbulb, type: "score" },
    { key: "verifiability", label: "Verifiability", value: aiScore.verifiability, color: "text-cyan-500", bgColor: "bg-cyan-500", icon: Search, type: "score" },
    { key: "scope", label: "Scope", value: aiScore.scope, color: "text-purple-500", bgColor: "bg-purple-500", icon: ShieldCheck, type: "score" },
  ];

  return (
    <Card className="p-4" data-testid="panel-ai-score">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        AI First Response
      </h3>

      <div className="space-y-2.5 mb-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.key} className="flex items-center gap-3">
              <Icon className={`w-3.5 h-3.5 ${cat.color} shrink-0`} />
              <span className="text-xs w-28 shrink-0">{cat.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.bgColor}`}
                  style={{ width: `${cat.value * 10}%`, opacity: cat.value > 0 ? 1 : 0.2 }}
                />
              </div>
              <span className={`text-xs font-mono w-4 text-right ${cat.color}`}>{cat.value}</span>
              {cat.type === "positive" && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
              {cat.type === "negative" && <ArrowDownRight className="w-3 h-3 text-red-500" />}
              {cat.type === "flagged" && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
              {cat.type === "score" && <Minus className="w-3 h-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-md bg-accent/50 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-ai-assessment">
          {aiScore.assessment}
        </p>
      </div>
    </Card>
  );
}

function ContributionThread({ contributions, users }: { contributions: Contribution[], users: User[] }) {
  const getUserName = (userId: number) => users.find(u => u.id === userId)?.username || "Unknown";
  const getUserTier = (userId: number) => users.find(u => u.id === userId)?.tier || 1;

  const typeColors: Record<string, string> = {
    join: "text-emerald-500 bg-emerald-500/10",
    expand: "text-green-500 bg-green-500/10",
    clarify: "text-blue-500 bg-blue-500/10",
    consume: "text-red-500 bg-red-500/10",
    correct: "text-amber-500 bg-amber-500/10",
  };

  if (contributions.length === 0) {
    return (
      <div className="text-center py-8">
        <Sprout className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No contributions yet. Be the first to join this plant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contributions.map((c) => (
        <div
          key={c.id}
          className="flex gap-3 grow-in"
          data-testid={`contribution-${c.id}`}
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {getUserName(c.userId)[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{getUserName(c.userId)}</span>
              <Badge variant="secondary" className={`text-[10px] py-0 ${typeColors[c.type] || ""}`}>
                {c.type}
              </Badge>
              {c.energyTransferred !== 0 && (
                <span className={`text-[10px] flex items-center gap-0.5 ${c.energyTransferred > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  <Zap className="w-2.5 h-2.5" />
                  {c.energyTransferred > 0 ? "+" : ""}{c.energyTransferred}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlantDetail() {
  const [, params] = useRoute("/plant/:id");
  const plantId = parseInt(params?.id || "0");
  const { currentUser, refreshUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contributionContent, setContributionContent] = useState("");
  const [contributionType, setContributionType] = useState("join");

  const { data: plant, isLoading: plantLoading } = useQuery<Plant>({
    queryKey: ["/api/plants", plantId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/plants/${plantId}`);
      return res.json();
    },
    enabled: plantId > 0,
  });

  const { data: contributions } = useQuery<Contribution[]>({
    queryKey: ["/api/contributions/plant", plantId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/contributions/plant/${plantId}`);
      return res.json();
    },
    enabled: plantId > 0,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const contributeMutation = useMutation({
    mutationFn: async (data: { plantId: number; content: string; type: string }) => {
      const res = await apiRequest("POST", "/api/contributions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/contributions/plant", plantId] });
      refreshUser();
      setContributionContent("");
      toast({
        title: "Contribution planted",
        description: "Your energy has been transferred.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to contribute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleContribute = () => {
    if (!currentUser || !contributionContent.trim()) return;
    contributeMutation.mutate({
      plantId,
      content: contributionContent.trim(),
      type: contributionType,
    });
  };

  if (plantLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto text-center py-16">
        <Leaf className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-sm font-medium mb-1">Plant not found</h2>
        <p className="text-xs text-muted-foreground mb-4">This plant may have been fully composted.</p>
        <Link href="/">
          <Button variant="outline" size="sm">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const BiomeIcon = biomeIcons[plant.biome] || Sprout;
  const aiScore: AIScore = JSON.parse(plant.aiScore);
  const author = allUsers?.find(u => u.id === plant.userId);
  const isComposted = plant.status === "composted";

  // Energy flow calculation
  const totalEnergyIn = (contributions || []).filter(c => c.energyTransferred > 0).reduce((sum, c) => sum + c.energyTransferred, 0);
  const totalEnergyOut = Math.abs((contributions || []).filter(c => c.energyTransferred < 0).reduce((sum, c) => sum + c.energyTransferred, 0));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Back nav */}
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Grounds
        </Button>
      </Link>

      {/* Plant header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className={`text-xl font-bold ${isComposted ? "line-through text-muted-foreground" : ""}`} data-testid="text-plant-title">
            {plant.title}
          </h1>
          <Badge variant="outline" className="gap-1 shrink-0">
            <BiomeIcon className="w-3 h-3" />
            {biomeLabels[plant.biome]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {author && (
            <span>
              planted by <span className="font-medium text-foreground">{author.username}</span>
              {" "}({tierNames[author.tier]})
            </span>
          )}
          <span>{new Date(plant.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Status badges */}
      {isComposted && (
        <div className="mb-4 rounded-md bg-amber-950/20 border border-amber-900/30 p-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-amber-600" />
          <span className="text-xs text-amber-600">This plant has been composted. Its energy has returned to the soil.</span>
        </div>
      )}

      {/* Energy overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold" data-testid="text-current-energy">{plant.energy}</p>
          <p className="text-[10px] text-muted-foreground">Current Energy</p>
        </Card>
        <Card className="p-3 text-center">
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">+{totalEnergyIn}</p>
          <p className="text-[10px] text-muted-foreground">Energy Gained</p>
        </Card>
        <Card className="p-3 text-center">
          <ArrowDownRight className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-500">-{totalEnergyOut}</p>
          <p className="text-[10px] text-muted-foreground">Energy Lost</p>
        </Card>
      </div>

      {/* Plant content */}
      <Card className="p-4 mb-6">
        <p className="text-sm leading-relaxed" data-testid="text-plant-content">{plant.content}</p>
      </Card>

      {/* AI Score */}
      <div className="mb-6">
        <AIScorePanel aiScore={aiScore} />
      </div>

      {!isComposted && !currentUser && (
        <p className="text-sm text-muted-foreground mb-6" data-testid="text-login-to-contribute">
          <Link href="/login" className="underline">Log in or sign up</Link> to contribute to this plant.
        </p>
      )}

      {/* Contribution form */}
      {!isComposted && currentUser && (
        <Card className="p-4 mb-6" data-testid="form-contribute">
          <h3 className="text-sm font-semibold mb-3">Contribute to this Plant</h3>
          <div className="space-y-3">
            <Select value={contributionType} onValueChange={setContributionType}>
              <SelectTrigger className="text-xs" data-testid="select-contribution-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contributionTypes.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <span className="flex items-center gap-2">
                      <span>{ct.icon}</span>
                      <span>{ct.label}</span>
                      <span className="text-muted-foreground">— {ct.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Add your contribution — logic grows, rhetoric withers..."
              value={contributionContent}
              onChange={(e) => setContributionContent(e.target.value)}
              className="text-sm min-h-[80px]"
              data-testid="input-contribution-content"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Your energy: {currentUser.energy} | Cost: {contributionType === "consume" ? 2 : 1}
              </span>
              <Button
                size="sm"
                onClick={handleContribute}
                disabled={!contributionContent.trim() || contributeMutation.isPending}
                data-testid="button-submit-contribution"
              >
                {contributeMutation.isPending ? "Transferring..." : "Contribute"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Contributions thread */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Contributions ({(contributions || []).length})
        </h3>
        <ContributionThread
          contributions={contributions || []}
          users={allUsers || []}
        />
      </div>
    </div>
  );
}
