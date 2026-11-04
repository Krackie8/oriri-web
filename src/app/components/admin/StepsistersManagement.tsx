import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { Plus, Trash2, Pencil, RefreshCw, X, HeartHandshake, CalendarDays, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { StepsistersMoment } from '../../utils/wellnessApi';
import PhotoPicker from './PhotoPicker';

type MomentForm = Omit<StepsistersMoment, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm = (type: 'upcoming' | 'recap' = 'upcoming'): MomentForm => ({
  title: '',
  type,
  date: wellnessApi.toDateKey(new Date()),
  startTime: '',
  location: '',
  description: '',
  link: '',
  photos: []
});

export default function StepsistersManagement() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [moments, setMoments] = useState<StepsistersMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MomentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await wellnessApi.getMoments();
    const list = res.ok && res.data ? res.data : [];
    setMoments([...list].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    if (!res.ok) toast.error('Could not load Stepsisters posts');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: keyof MomentForm) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const isRecap = form.type === 'recap';

  const resetForm = (type: 'upcoming' | 'recap' = form.type || 'upcoming') => {
    setForm(emptyForm(type));
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Give it a title');
      return;
    }
    setSaving(true);
    const res = editingId
      ? await wellnessApi.updateMoment(accessToken, editingId, form)
      : await wellnessApi.createMoment(accessToken, form);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || 'Could not save');
      return;
    }
    toast.success(editingId ? 'Updated' : 'Posted to Stepsisters');
    resetForm();
    load();
  };

  const handleEdit = (m: StepsistersMoment) => {
    setEditingId(m.id);
    setForm({
      title: m.title || '',
      type: m.type || 'upcoming',
      date: m.date || '',
      startTime: m.startTime || '',
      location: m.location || '',
      description: m.description || '',
      link: m.link || '',
      photos: m.photos || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (m: StepsistersMoment) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    const res = await wellnessApi.deleteMoment(accessToken, m.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not delete');
      return;
    }
    toast.success('Deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5" /> {editingId ? 'Edit post' : 'Post to Stepsisters'}
          </CardTitle>
          <CardDescription>Share an upcoming meetup, or photos from one you've hosted. It shows on Home straight away.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* What are you posting? */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: 'upcoming', label: 'Upcoming meetup', icon: CalendarDays },
              { type: 'recap', label: 'Photo recap', icon: Camera }
            ] as const).map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type }))}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  form.type === type ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => set('title')(e.target.value)}
                placeholder={isRecap ? 'Sunset walk & matcha, Kite Beach' : 'Pilates & brunch morning'}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} />
            </div>
            {!isRecap && (
              <div>
                <Label>Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => set('startTime')(e.target.value)} />
              </div>
            )}
            <div className={isRecap ? '' : 'sm:col-span-2'}>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => set('location')(e.target.value)} placeholder="Studio / café / area" />
            </div>
            <div className="sm:col-span-2">
              <Label>{isRecap ? 'A few words' : 'Details'}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
                placeholder={isRecap ? 'Thank you to everyone who came…' : "What we'll do, what to bring, price if any"}
              />
            </div>
            {!isRecap && (
              <div className="sm:col-span-2">
                <Label>RSVP link (WhatsApp group, form, tickets)</Label>
                <Input value={form.link} onChange={(e) => set('link')(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>{isRecap ? 'Photos (up to 12)' : 'Cover photo (optional)'}</Label>
              <PhotoPicker
                accessToken={accessToken}
                value={form.photos || []}
                onChange={(photos) => setForm((f) => ({ ...f, photos }))}
                max={isRecap ? 12 : 1}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={() => resetForm()}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Posted ({moments.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : moments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Post your next meetup above.</p>
          ) : (
            moments.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                {m.photos?.[0] ? (
                  <img src={m.photos[0]} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.date} {m.location ? `· ${m.location}` : ''} {m.photos?.length ? `· ${m.photos.length} photos` : ''}
                  </p>
                </div>
                <Badge variant="secondary">{m.type === 'recap' ? 'Recap' : 'Upcoming'}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
