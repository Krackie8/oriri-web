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
    if (!res.ok) toast.error('Could not load guide posts');
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
      toast.error(res.error || 'Could not save post');
      return;
    }
    toast.success(editingId ? 'Post updated' : 'Post published');
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
      pinned: !!guide.pinned
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (guide: WellnessGuide) => {
    if (!window.confirm(`Delete "${guide.title}"?`)) return;
    const res = await wellnessApi.deleteGuide(accessToken, guide.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not delete post');
      return;
    }
    toast.success('Post deleted');
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
            <BookHeart className="h-5 w-5" /> {editingId ? 'Edit guide post' : 'Add to Wellness Guide'}
          </CardTitle>
          <CardDescription>
            Your daily recommendations. Tip: post the same pick you share on Instagram and paste the IG link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder={wellnessApi.GUIDE_AREAS[form.category || 'Move']?.placeholder} />
            </div>
            <div>
              <Label>Area</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wellnessApi.GUIDE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c} · {wellnessApi.GUIDE_AREAS[c].blurb}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-2">
              <Switch checked={!!form.pinned} onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: v }))} />
              <Label>Pin to top</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Your note</Label>
              <Textarea rows={4} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="Why you recommend it: what to book, order or listen to" />
            </div>
            <div>
              <Label>Link (website, booking, IG post, podcast…)</Label>
              <Input value={form.link} onChange={(e) => set('link')(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
            <div>
              <Label>Photo (optional)</Label>
              <PhotoPicker accessToken={accessToken} value={form.image ? [form.image] : []} onChange={(urls) => set('image')(urls[0] || '')} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish post'}
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
          <CardTitle>Published ({guides.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : guides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet. Add your first pick above.</p>
          ) : (
            guides.map((guide) => (
              <div key={guide.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                {guide.pinned && <Pin className="h-4 w-4 shrink-0 text-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{guide.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{guide.note}</p>
                </div>
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
