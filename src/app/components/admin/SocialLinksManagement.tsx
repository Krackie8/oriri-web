import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { toast } from 'sonner@2.0.3';
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Link as LinkIcon,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as socialApi from '../../utils/socialApi';
import {
  DEFAULT_SOCIAL_CONFIG,
  PLATFORM_META,
  type SocialConfig,
  type SocialPlatformKey,
  type BioLink,
  type ShowcasePost,
} from '../../data/socialConfig';

const PLATFORM_KEYS = Object.keys(PLATFORM_META) as SocialPlatformKey[];

function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function SocialLinksManagement() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [config, setConfig] = useState<SocialConfig>(DEFAULT_SOCIAL_CONFIG);
  const [stats, setStats] = useState<socialApi.SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [configRes, statsRes] = await Promise.all([
      socialApi.getConfig(accessToken),
      socialApi.getStats(accessToken),
    ]);

    if (configRes.ok) {
      setConfig(configRes.data?.config ?? DEFAULT_SOCIAL_CONFIG);
    } else {
      setError(configRes.error ?? 'Could not load the social config');
    }

    if (statsRes.ok && statsRes.data) setStats(statsRes.data);

    setLoading(false);
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const res = await socialApi.saveConfig(accessToken, config);
    setSaving(false);

    if (res.ok) {
      toast.success('Social settings saved');
      if (res.data) setConfig(res.data);
    } else {
      toast.error(`Could not save: ${res.error}`);
    }
  };

  // ---- profiles ----------------------------------------------------------

  const updateProfile = (index: number, patch: Partial<SocialConfig['profiles'][number]>) =>
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const addProfile = () =>
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, { platform: 'website', handle: '', url: '', isVisible: true }],
    }));

  const removeProfile = (index: number) =>
    setConfig((c) => ({ ...c, profiles: c.profiles.filter((_, i) => i !== index) }));

  // ---- links -------------------------------------------------------------

  const updateLink = (index: number, patch: Partial<BioLink>) =>
    setConfig((c) => ({
      ...c,
      links: c.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));

  const addLink = () =>
    setConfig((c) => ({
      ...c,
      links: [
        ...c.links,
        {
          id: `link-${Date.now()}`,
          title: 'New link',
          url: '',
          isFeatured: false,
          isVisible: true,
          order: c.links.length,
        },
      ],
    }));

  const removeLink = (index: number) =>
    setConfig((c) => ({ ...c, links: c.links.filter((_, i) => i !== index) }));

  const reorderLink = (index: number, delta: number) =>
    setConfig((c) => ({
      ...c,
      links: move(c.links, index, delta).map((l, i) => ({ ...l, order: i })),
    }));

  // ---- showcase ----------------------------------------------------------

  const updateShowcase = (index: number, patch: Partial<ShowcasePost>) =>
    setConfig((c) => ({
      ...c,
      showcase: c.showcase.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const addShowcase = () =>
    setConfig((c) => ({
      ...c,
      showcase: [
        ...c.showcase,
        {
          id: `post-${Date.now()}`,
          platform: 'instagram',
          postUrl: '',
          caption: '',
          order: c.showcase.length,
        },
      ],
    }));

  const removeShowcase = (index: number) =>
    setConfig((c) => ({ ...c, showcase: c.showcase.filter((_, i) => i !== index) }));

  const reorderShowcase = (index: number, delta: number) =>
    setConfig((c) => ({
      ...c,
      showcase: move(c.showcase, index, delta).map((p, i) => ({ ...p, order: i })),
    }));

  // ------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const totals = stats?.totals ?? {};
  const totalRows = Object.entries(totals).sort((a, b) => b[1].clicks - a[1].clicks);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => void load()} disabled={saving}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
        <Button onClick={() => void save()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {/* Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Social profiles</CardTitle>
          <CardDescription>
            Shown in the footer, side menu, Home follow bar and the /links page. Spotify and Apple
            Podcasts URLs are filled in automatically from your server secrets when left blank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.profiles.map((profile, index) => (
            <div
              key={`${profile.platform}-${index}`}
              className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-[160px_1fr_1fr_120px_auto_auto] md:items-end"
            >
              <div>
                <Label className="text-xs">Platform</Label>
                <Select
                  value={profile.platform}
                  onValueChange={(value) =>
                    updateProfile(index, { platform: value as SocialPlatformKey })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{PLATFORM_META[key].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Handle</Label>
                <Input
                  value={profile.handle}
                  onChange={(e) => updateProfile(index, { handle: e.target.value })}
                  placeholder="@ren_reset"
                />
              </div>

              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={profile.url}
                  onChange={(e) => updateProfile(index, { url: e.target.value })}
                  placeholder="https://…"
                />
              </div>

              <div>
                <Label className="text-xs">Followers</Label>
                <Input
                  type="number"
                  min={0}
                  value={profile.followerCount ?? ''}
                  onChange={(e) =>
                    updateProfile(index, {
                      followerCount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={profile.isVisible}
                  onCheckedChange={(checked) => updateProfile(index, { isVisible: checked })}
                />
                <span className="text-xs text-muted-foreground">Visible</span>
              </div>

              <Button variant="ghost" size="sm" onClick={() => removeProfile(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={addProfile}>
            <Plus className="mr-2 h-4 w-4" />
            Add profile
          </Button>
        </CardContent>
      </Card>

      {/* Bio links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Link-in-bio (/links)
          </CardTitle>
          <CardDescription>
            Point your Instagram and TikTok bios at oriri.me/links. Use an internal path (e.g.
            /nourish) to keep visitors in the app, or a full URL for external destinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.links.map((link, index) => (
            <div key={link.id} className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="grid gap-3 md:grid-cols-[80px_1fr_1fr]">
                <div>
                  <Label className="text-xs">Emoji</Label>
                  <Input
                    value={link.emoji ?? ''}
                    onChange={(e) => updateLink(index, { emoji: e.target.value })}
                    placeholder="🎧"
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={link.title}
                    onChange={(e) => updateLink(index, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Subtitle</Label>
                  <Input
                    value={link.subtitle ?? ''}
                    onChange={(e) => updateLink(index, { subtitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">External URL</Label>
                  <Input
                    value={link.url ?? ''}
                    onChange={(e) =>
                      updateLink(index, { url: e.target.value, internalPath: undefined })
                    }
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <Label className="text-xs">Internal path</Label>
                  <Input
                    value={link.internalPath ?? ''}
                    onChange={(e) =>
                      updateLink(index, { internalPath: e.target.value, url: undefined })
                    }
                    placeholder="/nourish"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.isVisible}
                    onCheckedChange={(checked) => updateLink(index, { isVisible: checked })}
                  />
                  <span className="text-xs text-muted-foreground">Visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.isFeatured}
                    onCheckedChange={(checked) => updateLink(index, { isFeatured: checked })}
                  />
                  <span className="text-xs text-muted-foreground">Featured</span>
                </div>

                <Badge variant="outline" className="text-xs">
                  {totals[link.id]?.clicks ?? 0} clicks
                </Badge>

                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => reorderLink(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => reorderLink(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeLink(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLink}>
            <Plus className="mr-2 h-4 w-4" />
            Add link
          </Button>
        </CardContent>
      </Card>

      {/* Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Latest from social</CardTitle>
          <CardDescription>
            Curated posts shown on the Home screen. TikTok and YouTube URLs render as playable
            embeds; Instagram posts need a thumbnail URL and open the permalink.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.showcase.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No posts yet — the Home section stays hidden until you add one.
            </p>
          )}

          {config.showcase.map((post, index) => (
            <div key={post.id} className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <div>
                  <Label className="text-xs">Platform</Label>
                  <Select
                    value={post.platform}
                    onValueChange={(value) =>
                      updateShowcase(index, { platform: value as ShowcasePost['platform'] })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Post URL</Label>
                  <Input
                    value={post.postUrl}
                    onChange={(e) => updateShowcase(index, { postUrl: e.target.value })}
                    placeholder="https://www.tiktok.com/@rennnboww/video/123…"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Caption</Label>
                  <Input
                    value={post.caption ?? ''}
                    onChange={(e) => updateShowcase(index, { caption: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Thumbnail URL (Instagram)</Label>
                  <Input
                    value={post.thumbnailUrl ?? ''}
                    onChange={(e) => updateShowcase(index, { thumbnailUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => reorderShowcase(index, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => reorderShowcase(index, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeShowcase(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addShowcase}>
            <Plus className="mr-2 h-4 w-4" />
            Add post
          </Button>
        </CardContent>
      </Card>

      {/* Click stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Click tracking
          </CardTitle>
          <CardDescription>Every tap on a link, profile icon or shared referral.</CardDescription>
        </CardHeader>
        <CardContent>
          {totalRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead>Last source</TableHead>
                  <TableHead>Last click</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalRows.map(([linkId, row]) => (
                  <TableRow key={linkId}>
                    <TableCell className="font-medium">{linkId}</TableCell>
                    <TableCell className="text-right">{row.clicks}</TableCell>
                    <TableCell className="text-muted-foreground">{row.lastSource ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lastClickAt ? new Date(row.lastClickAt).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
