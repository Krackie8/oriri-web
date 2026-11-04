import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner@2.0.3';
import { Plus, Trash2, Pencil, RefreshCw, X, BookHeart, Pin, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import PhotoPicker from './PhotoPicker';
import type { WellnessGuide } from '../../utils/wellnessApi';

type GuideForm = Omit<WellnessGuide, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm = (): GuideForm => ({
  title: '',
  category: 'Move',
  note: '',
  image: '',
  link: '',
  area: '',
  price: '',
  instagram: '',
  maps: '',
  hidden: false,
  pinned: false
});

export default function WellnessGuideManagement() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [guides, setGuides] = useState<WellnessGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GuideForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await wellnessApi.getGuides();
    setGuides(res.ok && res.data ? wellnessApi.sortGuides(res.data) : []);
    if (!res.ok) toast.error('Could not load places');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!accessToken) return;
    wellnessApi.getBestieWaitlistCount(accessToken).then((res) => {
      if (res.ok && res.data) setWaitlistCount(res.data.count);
    });
  }, [accessToken]);

  const set = (field: keyof GuideForm) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const res = editingId
      ? await wellnessApi.updateGuide(accessToken, editingId, form)
      : await wellnessApi.createGuide(accessToken, form);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || 'Could not save place');
      return;
    }
    toast.success(editingId ? 'Place updated' : 'Place added to the guide');
    resetForm();
    load();
  };

  const handleEdit = (guide: WellnessGuide) => {
    setEditingId(guide.id);
    setForm({
      title: guide.title || '',
      category: guide.category || 'Move',
      note: guide.note || '',
      image: guide.image || '',
      link: guide.link || '',
      area: guide.area || '',
      price: guide.price || '',
      instagram: guide.instagram || '',
      maps: guide.maps || '',
      hidden: !!guide.hidden,
      pinned: !!guide.pinned
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (guide: WellnessGuide) => {
    if (!window.confirm(`Delete "${guide.title}"?`)) return;
    const res = await wellnessApi.deleteGuide(accessToken, guide.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not delete place');
      return;
    }
    toast.success('Place deleted');
    load();
  };

  return (
    <div className="space-y-6">
      {waitlistCount !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
          <Users className="h-4 w-4" /> Wellness Bestie waitlist: <strong>{waitlistCount}</strong> {waitlistCount === 1 ? 'person' : 'people'}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookHeart className="h-5 w-5" /> {editingId ? 'Edit place' : 'Add a place to the Directory'}
          </CardTitle>
          <CardDescription>
            Places you personally recommend. They show on the homepage in their pillar (Move, Meal, Mindset, Meet up) as a list of names; visitors tap a name to see the details. Tea for Two and Stepsisters are always listed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Place name *</Label>
              <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder={wellnessApi.GUIDE_AREAS[form.category || 'Move']?.placeholder} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wellnessApi.GUIDE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c} · {wellnessApi.GUIDE_AREAS[c]?.blurb}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch checked={!!form.pinned} onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: v }))} />
              <Label>Top pick (pin to top)</Label>
            </div>
            <div>
              <Label>Area or type</Label>
              <Input value={form.area} onChange={(e) => set('area')(e.target.value)} placeholder="e.g. Al Quoz · or Book · or Run club" />
            </div>
            <div>
              <Label>Price</Label>
              <Input value={form.price} onChange={(e) => set('price')(e.target.value)} placeholder="e.g. Classes from AED 120 · Free" />
            </div>
            <div className="sm:col-span-2">
              <Label>Why you love it</Label>
              <Textarea rows={4} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="What to book or order, best time to go, your tip" />
            </div>
            <div>
              <Label>Website or booking link</Label>
              <Input value={form.link} onChange={(e) => set('link')(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={(e) => set('instagram')(e.target.value)} placeholder="@handle or link" />
            </div>
            <div>
              <Label>Google Maps link (optional)</Label>
              <Input value={form.maps} onChange={(e) => set('maps')(e.target.value)} placeholder="Paste from Google Maps › Share" />
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch checked={!!form.hidden} onCheckedChange={(v) => setForm((f) => ({ ...f, hidden: v }))} />
              <Label>Hide from the website</Label>
            </div>
            <div>
              <Label>Photo (optional)</Label>
              <PhotoPicker accessToken={accessToken} value={form.image ? [form.image] : []} onChange={(urls) => set('image')(urls[0] || '')} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add place'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>In the guide ({guides.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : guides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No places yet. Add your first one above. Until then the homepage shows the starter picks.</p>
          ) : (
            guides.map((guide) => (
              <div key={guide.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                {guide.pinned && <Pin className="h-4 w-4 shrink-0 text-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{guide.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{[guide.area, guide.price].filter(Boolean).join(' · ') || guide.note}</p>
                </div>
                {guide.hidden && <Badge variant="outline">Hidden</Badge>}
                {guide.category && <Badge variant="secondary">{guide.category}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => handleEdit(guide)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(guide)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
