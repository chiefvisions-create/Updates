import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Filter,
  Zap,
  Globe,
  AlertTriangle,
  Sparkles,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useBot } from "@/hooks/use-bot";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category: string;
  assets: string[];
  timestamp: string;
  source: string;
  importance: 'high' | 'medium' | 'low';
  url: string;
  impactScore: number;
  volatilityScore: number;
  biasScore: number;
  reasons?: string[];
}

type NewsBriefing = {
  generatedAt: string;
  asset: string;
  hours: number;
  posture: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactScore: number;
  volatilityScore: number;
  aiUsed: boolean;
  briefing: string;
  strategyHints: string[];
  highImpact: NewsArticle[];
  disclaimer: string;
};

type NewsAlerts = {
  generatedAt: string;
  minutes: number;
  minImpact: number;
  alerts: NewsArticle[];
};

const sentimentColors = {
  bullish: 'text-green-400 bg-green-500/10 border-green-500/20',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
};

const importanceColors = {
  high: 'bg-amber-500/20 text-amber-400',
  medium: 'bg-blue-500/20 text-blue-400',
  low: 'bg-slate-500/20 text-slate-400'
};

export default function News() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<string>('FOR_YOU');
  const [searchText, setSearchText] = useState<string>('');
  const { bot } = useBot();

  const botBaseAsset = useMemo(() => {
    const sym = bot?.symbol || 'BTC/USDT';
    return sym.split('/')[0].toUpperCase();
  }, [bot?.symbol]);
  
  const newsUrl = useMemo(() => {
    const q = searchText.trim();
    const params = new URLSearchParams({
      asset: selectedAsset,
      category: selectedCategory,
      hours: '48',
      limit: '80',
      ...(q ? { q } : {}),
    });
    return `/api/news?${params.toString()}`;
  }, [selectedAsset, selectedCategory, searchText]);

  const briefingUrl = useMemo(() => {
    const params = new URLSearchParams({ asset: selectedAsset, hours: '24' });
    return `/api/news/briefing?${params.toString()}`;
  }, [selectedAsset]);

  const alertsUrl = useMemo(() => {
    const params = new URLSearchParams({ asset: selectedAsset, minutes: '180', minImpact: '75' });
    return `/api/news/alerts?${params.toString()}`;
  }, [selectedAsset]);

  const { data: news = [], isLoading, refetch, isFetching } = useQuery<NewsArticle[]>({
    queryKey: [newsUrl],
    refetchInterval: 60000,
  });

  const { data: briefing } = useQuery<NewsBriefing>({
    queryKey: [briefingUrl],
    refetchInterval: 60000,
    staleTime: 1000 * 30,
  });

  const { data: alerts } = useQuery<NewsAlerts>({
    queryKey: [alertsUrl],
    refetchInterval: 60000,
    staleTime: 1000 * 30,
  });

  const categories = ['all', 'market', 'regulation', 'technology', 'defi', 'security', 'adoption'];

  const assets = useMemo(() => {
    // Coinbase-focused quick filters + "For you"
    return [
      { key: 'FOR_YOU', label: `For you (${botBaseAsset})` },
      { key: 'BTC', label: 'BTC' },
      { key: 'ETH', label: 'ETH' },
      { key: 'XRP', label: 'XRP' },
      { key: 'ALL', label: 'All' },
    ];
  }, [botBaseAsset]);

  const filteredNews = news;

  const bullishCount = news.filter(n => n.sentiment === 'bullish').length;
  const bearishCount = news.filter(n => n.sentiment === 'bearish').length;
  const neutralCount = news.filter(n => n.sentiment === 'neutral').length;

  const sourcesCount = useMemo(() => new Set(news.map(n => n.source)).size, [news]);

  const impactLabel = (a: NewsArticle) => {
    if (a.volatilityScore >= 70) return { text: 'Volatility spike', cls: 'bg-rose-500/20 text-rose-300' };
    if (a.biasScore >= 0.25) return { text: 'Risk-on', cls: 'bg-emerald-500/20 text-emerald-300' };
    if (a.biasScore <= -0.25) return { text: 'Risk-off', cls: 'bg-amber-500/20 text-amber-300' };
    return { text: 'Mixed', cls: 'bg-slate-500/20 text-slate-300' };
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-3">
            <Newspaper className="h-6 w-6 text-primary" />
            Crypto News
          </h1>
          <p className="text-sm text-white/40 mt-1">AI-curated news and market insights</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-white/10"
          data-testid="button-refresh-news"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Market Briefing
              {briefing?.aiUsed && (
                <Badge variant="outline" className="ml-2 text-[10px] border-primary/30 text-primary/70">AI</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary">{briefing?.posture ?? '—'}</Badge>
              <Badge variant="outline" className="border-white/10 text-white/60">Impact {briefing?.impactScore ?? '—'}</Badge>
              <Badge variant="outline" className="border-white/10 text-white/60">Volatility {briefing?.volatilityScore ?? '—'}</Badge>
              <Badge variant="outline" className="border-white/10 text-white/60">Sources {sourcesCount}</Badge>
            </div>

            <pre className="whitespace-pre-wrap text-sm text-white/70 leading-relaxed bg-slate-900/40 border border-white/5 rounded-md p-3">
              {briefing?.briefing ?? 'Loading briefing…'}
            </pre>

            {briefing?.strategyHints?.length ? (
              <div className="text-xs text-white/50 space-y-1">
                <div className="font-medium text-white/70">Risk-aware hints (paper + live)</div>
                <ul className="list-disc pl-5 space-y-1">
                  {briefing.strategyHints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
                <div className="text-[11px] text-white/35 mt-2">{briefing.disclaimer}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              High Impact Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(alerts?.alerts ?? []).slice(0, 6).map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 rounded-md bg-slate-900/40 border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-white/40 mb-1">{a.source} • {formatTimeAgo(a.timestamp)}</div>
                      <div className="text-sm text-white/85 leading-snug">{a.title}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Impact {a.impactScore}</Badge>
                        <Badge className={`${impactLabel(a).cls} text-[10px]`}>{impactLabel(a).text}</Badge>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </div>
                </a>
              ))}

              {alerts?.alerts?.length === 0 ? (
                <div className="text-sm text-white/40">No high-impact alerts in the last {alerts?.minutes ?? 180} minutes.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Total Stories</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-stories">{news.length}</p>
              </div>
              <Newspaper className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Bullish</p>
                <p className="text-2xl font-bold mt-1 text-green-400" data-testid="text-bullish-count">{bullishCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Bearish</p>
                <p className="text-2xl font-bold mt-1 text-red-400" data-testid="text-bearish-count">{bearishCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Neutral</p>
                <p className="text-2xl font-bold mt-1 text-slate-400" data-testid="text-neutral-count">{neutralCount}</p>
              </div>
              <Globe className="h-8 w-8 text-slate-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {assets.map(a => (
          <Button
            key={a.key}
            variant={selectedAsset === a.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedAsset(a.key)}
            className={selectedAsset !== a.key ? "border-white/10 text-white/60" : ""}
            data-testid={`button-asset-${a.key}`}
          >
            {a.label}
          </Button>
        ))}

        <div className="flex-1" />

        <div className="relative w-full md:w-[320px]">
          <Search className="h-4 w-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search headlines…"
            className="pl-9 bg-slate-900/40 border-white/10"
            data-testid="input-search-news"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory !== cat ? "border-white/10 text-white/60" : ""}
            data-testid={`button-filter-${cat}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Button>
        ))}
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Latest Headlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <span className="ml-3 text-white/40">Loading news...</span>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No news articles available</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <AnimatePresence>
                <div className="space-y-4">
                  {filteredNews.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all"
                      data-testid={`card-news-${article.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${importanceColors[article.importance]} text-[10px] uppercase`}>
                              {article.importance === 'high' && <Zap className="h-3 w-3 mr-1" />}
                              {article.importance}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase border-white/10">
                              {article.category}
                            </Badge>
                            <Badge className={`${sentimentColors[article.sentiment]} border text-[10px] uppercase`}>
                              {article.sentiment === 'bullish' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {article.sentiment === 'bearish' && <TrendingDown className="h-3 w-3 mr-1" />}
                              {article.sentiment}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] border-white/10 text-white/70">
                              Impact {article.impactScore}
                            </Badge>
                            <Badge className={`${impactLabel(article).cls} text-[10px]`}>
                              {impactLabel(article).text}
                            </Badge>
                          </div>
                          
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-start gap-2 font-medium text-white/90 mb-2 hover:text-white"
                          >
                            <span>{article.title}</span>
                            <ExternalLink className="h-4 w-4 text-white/30 mt-0.5" />
                          </a>
                          <p className="text-sm text-white/50 leading-relaxed">{article.summary}</p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(article.timestamp)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {article.source}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Vol {article.volatilityScore}
                            </span>
                          </div>
                          
                          {article.assets.length > 0 && (
                            <div className="flex gap-1 mt-3">
                              {article.assets.map(asset => (
                                <Badge 
                                  key={asset} 
                                  variant="outline" 
                                  className="text-[9px] border-primary/30 text-primary/70"
                                >
                                  {asset}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {article.reasons?.length ? (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {article.reasons.slice(0, 4).map((r) => (
                                <Badge key={r} variant="outline" className="text-[9px] border-white/10 text-white/55">
                                  {r}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Market Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${news.length > 0 ? (bullishCount / news.length) * 100 : 0}%` }}
                />
                <div 
                  className="bg-slate-500 transition-all duration-500"
                  style={{ width: `${news.length > 0 ? (neutralCount / news.length) * 100 : 0}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${news.length > 0 ? (bearishCount / news.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {news.length > 0 
                  ? bullishCount > bearishCount 
                    ? 'Bullish Bias' 
                    : bearishCount > bullishCount 
                      ? 'Bearish Bias' 
                      : 'Mixed Sentiment'
                  : 'No Data'}
              </p>
              <p className="text-xs text-white/40">Based on {news.length} articles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
