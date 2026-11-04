import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Copy, Link, Code, FileText, Facebook, Linkedin, MessageSquare, Twitter, Check, Image as ImageIcon, MessageCircle, Instagram } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../hooks/useAuth';
import { QuoteCardShare } from '../social/QuoteCardShare';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  episodeId?: string; // ✅ NEW: Optional episode ID for tracking
}

export function ShareModal({ isOpen, onClose, title, url: rawUrl, episodeId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQuoteCard, setShowQuoteCard] = useState(false);
  const { user } = useAuth();

  // Attribute shares back to the member who made them, so /social/stats can show
  // which listeners are actually driving traffic.
  const url = React.useMemo(() => {
    if (!user?.id) return rawUrl;
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      parsed.searchParams.set('ref', user.id);
      parsed.searchParams.set('utm_source', 'share');
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }, [rawUrl, user?.id]);

  // ✅ Track share action
  const trackShare = async (platform: string) => {
    if (!episodeId) return; // Skip tracking if no episode ID provided
    
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/episode-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          episodeId,
          platform,
          userId: null // Could be enhanced with actual user ID if logged in
        })
      });
      
      console.log('[ShareModal] Share tracked:', { episodeId, platform });
    } catch (error) {
      console.error('[ShareModal] Error tracking share:', error);
      // Don't show error to user - tracking failure shouldn't disrupt UX
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
      
      // ✅ Track share
      await trackShare('copy-link');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyEmbed = async () => {
    const embedCode = `<iframe src="${url}" width="100%" height="400" frameborder="0"></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied to clipboard');
      
      // ✅ Track share
      await trackShare('embed');
    } catch (error) {
      toast.error('Failed to copy embed code');
    }
  };

  const shareOptions = [
    {
      name: 'Share as image',
      icon: ImageIcon,
      action: () => setShowQuoteCard(true),
      description: 'Branded quote card for Stories'
    },
    {
      name: 'Share to WhatsApp',
      icon: MessageCircle,
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${url}`)}`;
        window.open(whatsappUrl, '_blank');
        trackShare('whatsapp');
      },
      description: 'Send to a chat or group'
    },
    {
      name: 'Instagram Story',
      icon: Instagram,
      action: () => {
        // Instagram has no web share intent — the card + copied link is the flow.
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Link copied — add it as a sticker to your Story');
        setShowQuoteCard(true);
        trackShare('instagram-story');
      },
      description: 'Quote card + link sticker'
    },
    {
      name: 'Copy link',
      icon: copied ? Check : Copy,
      action: handleCopyLink,
      description: 'Copy episode URL'
    },
    {
      name: 'Embed',
      icon: Code,
      action: handleCopyEmbed,
      description: 'Copy embed code'
    },
    {
      name: 'Share to Notes',
      icon: FileText,
      action: () => {
        const notesUrl = `https://www.icloud.com/notes/?action=new&text=${encodeURIComponent(`${title}\\n\\n${url}`)}`;
        window.open(notesUrl, '_blank');
        // ✅ Track share
        trackShare('notes');
      },
      description: 'Share to Apple Notes'
    },
    {
      name: 'Share to Facebook',
      icon: Facebook,
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        // ✅ Track share
        trackShare('facebook');
      },
      description: 'Share on Facebook'
    },
    {
      name: 'Share to LinkedIn',
      icon: Linkedin,
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, '_blank', 'width=600,height=400');
        // ✅ Track share
        trackShare('linkedin');
      },
      description: 'Share on LinkedIn'
    },
    {
      name: 'Share to Bluesky',
      icon: MessageSquare,
      action: () => {
        const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title}\\n\\n${url}`)}`;
        window.open(blueskyUrl, '_blank');
        // ✅ Track share
        trackShare('bluesky');
      },
      description: 'Share on Bluesky'
    },
    {
      name: 'Share to X',
      icon: Twitter,
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        // ✅ Track share
        trackShare('twitter');
      },
      description: 'Share on X (Twitter)'
    }
  ];

  return (
    <>
    <Dialog open={isOpen && !showQuoteCard} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {/* URL Display */}
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Input
              value={url}
              readOnly
              className="flex-1 bg-transparent border-none text-sm"
            />
            <Button size="sm" onClick={handleCopyLink} variant="ghost">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Share Options */}
          <div className="space-y-1">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Button
                  key={option.name}
                  variant="ghost"
                  onClick={option.action}
                  className="w-full justify-start h-auto p-3"
                >
                  <IconComponent className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <QuoteCardShare
      isOpen={showQuoteCard}
      onClose={() => setShowQuoteCard(false)}
      episodeTitle={title}
      url={url}
      onShared={(method) => trackShare(`quote-card-${method}`)}
    />
    </>
  );
}