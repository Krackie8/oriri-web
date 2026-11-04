import React, { useState, useRef, useEffect } from 'react';
import { Share2, Link, Code, FileText, Facebook, Linkedin, Twitter, Hash } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface ShareDropdownProps {
  episode: {
    title: string;
    description: string;
  };
  url?: string;
}

export function ShareDropdown({ episode, url = window.location.href }: ShareDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const shareOptions = [
    {
      icon: Link,
      label: 'Copy link',
      action: () => copyToClipboard(url, 'Link')
    },
    {
      icon: Code,
      label: 'Embed',
      action: () => {
        const embedCode = `<iframe src="${url}" width="100%" height="400" frameborder="0"></iframe>`;
        copyToClipboard(embedCode, 'Embed code');
      }
    },
    {
      icon: FileText,
      label: 'Share to Notes',
      action: () => {
        const noteText = `${episode.title}\n\n${episode.description}\n\n${url}`;
        copyToClipboard(noteText, 'Note');
      }
    },
    {
      icon: Facebook,
      label: 'Share to Facebook',
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      icon: Linkedin,
      label: 'Share to LinkedIn',
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      icon: Hash,
      label: 'Share to Bluesky',
      action: () => {
        const blueskyText = `${episode.title} ${url}`;
        const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(blueskyText)}`;
        window.open(blueskyUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      icon: Twitter,
      label: 'Share to X',
      action: () => {
        const tweetText = `${episode.title} ${url}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
      }
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </Button>

      {isOpen && (
        <Card className="absolute bottom-full mb-2 left-0 z-50 w-56 shadow-lg border">
          <CardContent className="p-2">
            {copyStatus && (
              <div className="px-3 py-2 text-xs text-green-600 dark:text-green-400 border-b border-border mb-2">
                {copyStatus}
              </div>
            )}
            
            <div className="space-y-1">
              {shareOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    option.action();
                    if (!option.label.includes('Share to')) {
                      setIsOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-sm transition-colors"
                >
                  <option.icon className="w-4 h-4 text-muted-foreground" />
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ShareDropdown;