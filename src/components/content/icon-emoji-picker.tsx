/**
 * Icon/Emoji Picker Component
 * 
 * Searchable picker for emojis and icons
 */

'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as LucideIcons from 'lucide-react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Popular emojis organized by category
const EMOJI_CATEGORIES = {
  'Popular': ['✨', '🚀', '💡', '🎯', '⭐', '🔥', '💎', '🎨', '🌟', '⚡', '🎉', '💪', '🏆', '🎁', '💯'],
  'Objects': ['📱', '💻', '⌚', '🎧', '📷', '🎮', '📺', '🔊', '📦', '📊', '💳', '🔑', '📝', '📌', '📎'],
  'Nature': ['🌱', '🌿', '🌳', '🌸', '🌺', '🌻', '🌷', '🌹', '🌵', '🍀', '🌲', '🌴', '🌾', '🌼', '🌷'],
  'Food': ['🍎', '🍌', '🍇', '🍓', '🍊', '🍋', '🍉', '🍑', '🥝', '🍒', '🥑', '🍅', '🥕', '🌽', '🥔'],
  'Symbols': ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💗', '💓', '💕', '💞', '💟', '❣️', '💝'],
  'Hands': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️'],
  'Faces': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🏋️', '🚴', '🏊', '🧘'],
};

// Popular Lucide icons
const POPULAR_ICONS = [
  'Sparkles', 'Rocket', 'Lightbulb', 'Target', 'Star', 'Flame', 'Gem', 'Palette', 'Zap', 'PartyPopper',
  'Trophy', 'Gift', 'CheckCircle', 'Heart', 'ShoppingCart', 'Package', 'Truck', 'CreditCard', 'Shield',
  'Lock', 'Unlock', 'Key', 'Bell', 'Settings', 'Home', 'User', 'Users', 'Mail', 'Phone', 'MessageSquare',
  'Camera', 'Image', 'Video', 'Music', 'Headphones', 'Monitor', 'Smartphone', 'Tablet', 'Laptop',
  'Coffee', 'Utensils', 'ShoppingBag', 'TrendingUp', 'BarChart', 'PieChart', 'FileText', 'Folder',
  'Search', 'Filter', 'Download', 'Upload', 'Share', 'Link', 'ExternalLink', 'Copy', 'Check', 'X',
];

interface IconEmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

export function IconEmojiPicker({ 
  value, 
  onChange, 
  label = 'Icon/Emoji',
  description 
}: IconEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'emoji' | 'icon'>('emoji');

  // Filter emojis by search
  const filteredEmojis = useMemo(() => {
    if (!searchQuery) {
      return EMOJI_CATEGORIES;
    }
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, string[]> = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matched = emojis.filter(emoji => 
        emoji.includes(query) || category.toLowerCase().includes(query)
      );
      if (matched.length > 0) {
        filtered[category] = matched;
      }
    });
    return filtered;
  }, [searchQuery]);

  // Filter icons by search
  const filteredIcons = useMemo(() => {
    if (!searchQuery) {
      return POPULAR_ICONS;
    }
    const query = searchQuery.toLowerCase();
    return POPULAR_ICONS.filter(iconName => 
      iconName.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectEmoji = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelectIcon = (iconName: string) => {
    // Store icon name with a prefix to distinguish from emojis
    onChange(`icon:${iconName}`);
    setOpen(false);
    setSearchQuery('');
  };

  const displayValue = value?.startsWith('icon:') 
    ? value.replace('icon:', '') 
    : value;

  const isIcon = value?.startsWith('icon:');

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
            >
              {isIcon ? (
                <span className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = (LucideIcons as any)[displayValue];
                    return IconComponent ? <IconComponent className="h-4 w-4" /> : <span>Select icon</span>;
                  })()}
                  {displayValue}
                </span>
              ) : (
                <span className="text-2xl">{displayValue || 'Select icon/emoji'}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'emoji' | 'icon')} className="w-full">
              <div className="p-3 border-b">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <TabsList className="grid w-full grid-cols-2 mx-3 mt-3">
                <TabsTrigger value="emoji">Emojis</TabsTrigger>
                <TabsTrigger value="icon">Icons</TabsTrigger>
              </TabsList>
              <TabsContent value="emoji" className="mt-0 p-3 max-h-64 overflow-y-auto">
                {Object.keys(filteredEmojis).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No emojis found</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(filteredEmojis).map(([category, emojis]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">{category}</h4>
                        <div className="grid grid-cols-8 gap-2">
                          {emojis.map((emoji, idx) => (
                            <button
                              key={`${category}-${idx}`}
                              type="button"
                              onClick={() => handleSelectEmoji(emoji)}
                              className="text-2xl hover:bg-muted rounded p-2 transition-colors"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="icon" className="mt-0 p-3 max-h-64 overflow-y-auto">
                {filteredIcons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No icons found</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {filteredIcons.map((iconName) => {
                      const IconComponent = (LucideIcons as any)[iconName];
                      if (!IconComponent) return null;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => handleSelectIcon(iconName)}
                          className="flex flex-col items-center gap-1 p-3 hover:bg-muted rounded transition-colors"
                          title={iconName}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span className="text-xs text-muted-foreground truncate w-full">{iconName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            title="Clear"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
