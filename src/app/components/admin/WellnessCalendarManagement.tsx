import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner@2.0.3';
import { Plus, Trash2, Pencil, RefreshCw, Link as LinkIcon, X, CalendarHeart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import PhotoPicker from './PhotoPicker';
import type { WellnessEvent } from '../../utils/wellnessApi';

type EventForm = Omit<WellnessEvent, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm = (): EventForm => ({
  title: '',
  date: wellnessApi.toDateKey(new Date()),
  startTime: '',
  location: '',
  category: 'Movement',
  description: '',
  link: '',
  image: '',
  partner: ''
});

export default function WellnessCalendarManagement() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickLink, setQuickLink] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await wellnessApi.getEvents();
    setEvents(res.ok && res.data ? wellnessApi.sortEvents(res.data) : []);
    if (!res.ok) toast.error('Could not load events');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: keyof EventForm) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  // Phase 1: paste a link (IG / Eventbrite / Platinumlist) to pre-fill the link field.
  const applyQuickLink = () => {
    const value = quickLink.trim();
    if (!value) return;
    const isUrl = /^https?:\/\//i.test(value);
    setForm((f) => ({
      ...f,
      link: isUrl ? value : f.link,
      description: isUrl ? f.description : value
    }));
    setQuickLink('');
    toast.success(isUrl ? 'Link added. Fill in the title and date below.' : 'Caption added to the description.');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      toast.error('Title and date are required');
      return;
    }
    setSaving(true);
    const res = editingId
      ? await wellnessApi.updateEvent(accessToken, editingId, form)
      : await wellnessApi.createEvent(accessToken, form);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || 'Could not save event');
      return;
    }
    toast.success(editingId ? 'Event updated' : 'Event published');
    resetForm();
    load();
  };

  const handleEdit = (event: WellnessEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title || '',
      date: event.date || '',
      startTime: event.startTime || '',
      location: event.location || '',
      category: event.category || 'Movement',
      description: event.description || '',
      link: event.link || '',
      image: event.image || '',
      partner: event.partner || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (event: WellnessEvent) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const res = await wellnessApi.deleteEvent(accessToken, event.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not delete event');
      return;
    }
    toast.success('Event deleted');
    load();
  };

  const today = wellnessApi.toDateKey(new Date());
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today).reverse();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarHeart className="h-5 w-5" /> {editingId ? 'Edit event' : 'Add to Wellness Calendar'}
          </CardTitle>
          <CardDescription>
            Events you add here appear on the Home page under Wellness Calendar right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick add */}
          <div className="rounded-lg border border-dashed border-border p-3">
            <Label className="text-xs">Quick add from link or caption</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={quickLink}
                onChange={(e) => setQuickLink(e.target.value)}
                placeholder="Paste an Instagram, Eventbrite or Platinumlist link, or a caption"
              />
              <Button type="button" variant="outline" onClick={applyQuickLink}>
                <LinkIcon className="mr-1 h-4 w-4" /> Use
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Coming soon: AI fills in the title, date and location for you.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Sunrise yoga at Kite Beach" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} />
            </div>
            <div>
              <Label>Start time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => set('startTime')(e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => set('location')(e.target.value)} placeholder="Dubai Marina, or Online" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wellnessApi.EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Short description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="What it is and why you recommend it" />
            </div>
            <div>
              <Label>Link (tickets or post)</Label>
              <Input value={form.link} onChange={(e) => set('link')(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Photo (optional)</Label>
              <PhotoPicker accessToken={accessToken} value={form.image ? [form.image] : []} onChange={(urls) => set('image')(urls[0] || '')} />
            </div>
            <div className="sm:col-span-2">
              <Label>Partner / sponsor (optional)</Label>
              <Input value={form.partner} onChange={(e) => set('partner')(e.target.value)} placeholder="Brand name, if this is a partnership" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish event'}
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
          <div>
            <CardTitle>Upcoming ({upcoming.length})</CardTitle>
            <CardDescription>Past events stay listed below for reference.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet. Add your first one above.</p>
          ) : (
            [...upcoming, ...past].map((event) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 rounded-lg border border-border p-3 ${event.date < today ? 'opacity-50' : ''}`}
              >
                <div className="w-16 shrink-0 text-center text-xs">
                  <div className="font-medium">{event.date}</div>
                  <div className="text-muted-foreground">{event.startTime}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.location}</p>
                </div>
                {event.category && <Badge variant="secondary">{event.category}</Badge>}
                {event.partner && <Badge variant="outline">{event.partner}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(event)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
