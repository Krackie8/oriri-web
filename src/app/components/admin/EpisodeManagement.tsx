import React, { useState } from 'react';
import { useEpisodeManagement, ManagedEpisode } from '../../contexts/EpisodeManagementContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import EpisodeForm from './EpisodeForm';
import EpisodeAnalyticsOverview from './EpisodeAnalyticsOverview';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Calendar,
  Archive,
  Crown,
  Eye,
  Heart,
  MessageCircle,
  Share,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  BarChart3,
  TrendingUp
} from 'lucide-react';

// ✅ PHASE 3: Add prop interface for parent navigation
interface EpisodeManagementProps {
  onEpisodeSelect?: (episode: { id: string; title: string }) => void;
}

interface EpisodeRowProps {
  episode: ManagedEpisode;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (episode: ManagedEpisode) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onArchive: (id: string) => void;
  onViewAnalytics: (episode: ManagedEpisode) => void;
}

function EpisodeRow({ 
  episode, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete, 
  onDuplicate,
  onPublish,
  onUnpublish,
  onArchive,
  onViewAnalytics
}: EpisodeRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-300';
      case 'draft': return 'bg-gray-500/20 text-gray-300';
      case 'scheduled': return 'bg-blue-500/20 text-blue-300';
      case 'archived': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex items-center space-x-4 p-4 border-b border-border/50 hover:bg-card/50 transition-colors">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(episode.id)}
      />
      
      <ImageWithFallback
        src={episode.image}
        alt={episode.title}
        className="w-16 h-12 object-cover rounded"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="font-medium truncate">{episode.title}</h4>
          {episode.isVipOnly && (
            <Crown className="h-4 w-4 text-purple-500" title={`VIP ${episode.vipTier}`} />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">
          {episode.description}
        </p>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>{episode.views}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Heart className="h-3 w-3" />
            <span>{episode.likes}</span>
          </span>
          <span className="flex items-center space-x-1">
            <MessageCircle className="h-3 w-3" />
            <span>{episode.comments}</span>
          </span>
          <span>{episode.duration}</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-1">
        <Badge className={getStatusColor(episode.status)}>
          {episode.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {episode.status === 'scheduled' && episode.scheduledDate 
            ? formatDate(episode.scheduledDate)
            : formatDate(episode.publishedDate || episode.createdDate)
          }
        </span>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <div>{episode.category}</div>
        <div className="text-xs">{formatDate(episode.updatedDate)}</div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(episode)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(episode.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {episode.status !== 'published' && (
            <DropdownMenuItem onClick={() => onPublish(episode.id)}>
              <Play className="h-4 w-4 mr-2" />
              Publish
            </DropdownMenuItem>
          )}
          {episode.status === 'published' && (
            <DropdownMenuItem onClick={() => onUnpublish(episode.id)}>
              <Pause className="h-4 w-4 mr-2" />
              Unpublish
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onArchive(episode.id)}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete(episode.id)}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewAnalytics(episode)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function EpisodeManagement({ onEpisodeSelect }: EpisodeManagementProps) {
  const {
    filteredEpisodes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    duplicateEpisode,
    publishEpisode,
    unpublishEpisode,
    archiveEpisode,
    bulkUpdateStatus,
    bulkDelete,
    bulkUpdateVipStatus,
    refreshEpisodes,
    clearAllEpisodes
  } = useEpisodeManagement();

  const [selectedEpisodes, setSelectedEpisodes] = useState<string[]>([]);
  const [editingEpisode, setEditingEpisode] = useState<ManagedEpisode | undefined>();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyticsEpisode, setAnalyticsEpisode] = useState<ManagedEpisode | undefined>();

  const handleToggleSelect = (id: string) => {
    setSelectedEpisodes(prev => 
      prev.includes(id) 
        ? prev.filter(episodeId => episodeId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedEpisodes.length === filteredEpisodes.length) {
      setSelectedEpisodes([]);
    } else {
      setSelectedEpisodes(filteredEpisodes.map(ep => ep.id));
    }
  };

  const handleEdit = (episode: ManagedEpisode) => {
    setEditingEpisode(episode);
    setShowCreateForm(true);
  };

  const handleNewEpisode = () => {
    setEditingEpisode(undefined);
    setShowCreateForm(true);
  };

  // ✅ PHASE 3: Enhanced to support navigation to Analytics tab
  const handleViewAnalytics = (episode: ManagedEpisode) => {
    // If parent provided onEpisodeSelect, use it (for Analytics tab navigation)
    if (onEpisodeSelect) {
      onEpisodeSelect({
        id: episode.id,
        title: episode.title
      });
    } else {
      // Otherwise, show local analytics modal
      setAnalyticsEpisode(episode);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingEpisode) {
        await updateEpisode(editingEpisode.id, data);
      } else {
        await createEpisode(data);
      }
      setEditingEpisode(undefined);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setEditingEpisode(undefined);
    setShowCreateForm(false);
  };

  const handleBulkPublish = async () => {
    await bulkUpdateStatus(selectedEpisodes, 'published');
    setSelectedEpisodes([]);
  };

  const handleBulkArchive = async () => {
    await bulkUpdateStatus(selectedEpisodes, 'archived');
    setSelectedEpisodes([]);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedEpisodes.length} episodes?`)) {
      await bulkDelete(selectedEpisodes);
      setSelectedEpisodes([]);
    }
  };

  const handleBulkVipUpdate = async (isVipOnly: boolean, tier?: 'basic' | 'premium' | 'elite') => {
    await bulkUpdateVipStatus(selectedEpisodes, isVipOnly, tier);
    setSelectedEpisodes([]);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading episodes: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Show full-page form when creating or editing
  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-background">
        <EpisodeForm
          episode={editingEpisode}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Episode Management</h2>
          <p className="text-muted-foreground">
            Create, edit, and manage your podcast episodes
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshEpisodes} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              if (confirm('Are you sure you want to clear all episodes? This will remove all mock data and cannot be undone.')) {
                await clearAllEpisodes();
              }
            }} 
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button onClick={handleNewEpisode}>
            <Plus className="h-4 w-4 mr-2" />
            Add Episode
          </Button>
        </div>
      </div>

      {/* Analytics Modal */}
      <Dialog open={!!analyticsEpisode} onOpenChange={() => setAnalyticsEpisode(undefined)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Episode Analytics</span>
            </DialogTitle>
            <DialogDescription>
              Detailed performance insights for "{analyticsEpisode?.title}"
            </DialogDescription>
          </DialogHeader>
          {analyticsEpisode && (
            <EpisodeAnalyticsOverview 
              episodeId={analyticsEpisode.id} 
              episodeTitle={analyticsEpisode.title}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search episodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEpisodes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedEpisodes.length} episode(s) selected
              </span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={handleBulkPublish}>
                  <Play className="h-4 w-4 mr-1" />
                  Publish
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Crown className="h-4 w-4 mr-1" />
                      VIP
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkVipUpdate(false)}>
                      Remove VIP Status
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkVipUpdate(true, 'vip')}>
                      Set VIP Only (AED 20/month)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Episodes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Episodes ({filteredEpisodes.length})</CardTitle>
              <CardDescription>
                Manage your podcast episodes and their settings
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center space-x-2"
            >
              {selectedEpisodes.length === filteredEpisodes.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>Select All</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="w-16 h-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No episodes found matching your criteria.</p>
              <Button
                onClick={handleNewEpisode}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Episode
              </Button>
            </div>
          ) : (
            <div>
              {filteredEpisodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  isSelected={selectedEpisodes.includes(episode.id)}
                  onToggleSelect={handleToggleSelect}
                  onEdit={handleEdit}
                  onDelete={deleteEpisode}
                  onDuplicate={duplicateEpisode}
                  onPublish={publishEpisode}
                  onUnpublish={unpublishEpisode}
                  onArchive={archiveEpisode}
                  onViewAnalytics={handleViewAnalytics}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}