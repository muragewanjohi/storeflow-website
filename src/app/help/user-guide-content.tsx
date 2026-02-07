/**
 * User Guide Content Component
 * 
 * Modern help center inspired by Medusa's user guide structure
 * Features: Sticky left sidebar navigation, sticky right sidebar table of contents,
 *           scrollable center content, next/prev navigation, internal article linking
 * 
 * Internal Article Linking:
 *   In the rich text editor (admin), you can link to other articles using:
 *     href="/help?article=ARTICLE_SLUG"
 *   Example: <a href="/help?article=managing-orders">Managing Orders</a>
 *   The public help page will intercept these links and navigate to the article.
 */

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingCartIcon,
  UserIcon,
  UserGroupIcon,
  UsersIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  TruckIcon,
  HeartIcon,
  EnvelopeIcon,
  XMarkIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Bars3Icon,
  HomeIcon,
  PaintBrushIcon,
  CubeIcon,
  FireIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

// Icon mapping
const iconMap: Record<string, typeof UserIcon> = {
  'UserIcon': UserIcon,
  'UserGroupIcon': UserGroupIcon,
  'UsersIcon': UsersIcon,
  'ShoppingCartIcon': ShoppingCartIcon,
  'QuestionMarkCircleIcon': QuestionMarkCircleIcon,
  'CreditCardIcon': CreditCardIcon,
  'TruckIcon': TruckIcon,
  'HeartIcon': HeartIcon,
  'EnvelopeIcon': EnvelopeIcon,
  'BookOpenIcon': BookOpenIcon,
  'HomeIcon': HomeIcon,
  'PaintBrushIcon': PaintBrushIcon,
  'CubeIcon': CubeIcon,
  'FireIcon': FireIcon,
  'DocumentTextIcon': DocumentTextIcon,
  'Cog6ToothIcon': Cog6ToothIcon,
  'ChatBubbleLeftRightIcon': ChatBubbleLeftRightIcon,
  'RocketLaunchIcon': RocketLaunchIcon,
};

interface Article {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  image: string | null;
  image_alt: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_popular: boolean | null;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  articles: Article[];
}

interface UserGuideContentProps {
  tenantName?: string | null;
  categories: Category[];
}

export default function UserGuideContent({ tenantName, categories: dbCategories }: Readonly<UserGuideContentProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Map database categories to component format
  const categories = useMemo(() => {
    return dbCategories.map(cat => ({
      ...cat,
      icon: cat.icon ? (iconMap[cat.icon] || BookOpenIcon) : BookOpenIcon,
    }));
  }, [dbCategories]);

  // Flatten all articles into a sequential list for prev/next navigation
  const allArticles = useMemo(() => {
    const articles: { article: Article; categoryId: string; categoryName: string }[] = [];
    for (const category of categories) {
      for (const article of category.articles) {
        articles.push({ article, categoryId: category.id, categoryName: category.name });
      }
    }
    return articles;
  }, [categories]);

  // Find current article index in the flat list
  const currentArticleIndex = useMemo(() => {
    return allArticles.findIndex(a => a.article.id === selectedArticle);
  }, [allArticles, selectedArticle]);

  // Previous and next articles
  const prevArticle = currentArticleIndex > 0 ? allArticles[currentArticleIndex - 1] : null;
  const nextArticle = currentArticleIndex < allArticles.length - 1 ? allArticles[currentArticleIndex + 1] : null;

  // Navigate to an article by slug
  const navigateToArticleBySlug = useCallback((slug: string) => {
    for (const category of categories) {
      const article = category.articles.find(a => a.slug === slug);
      if (article) {
        setSelectedArticle(article.id);
        setSelectedCategory(category.id);
        const newExpanded = new Set(expandedCategories);
        newExpanded.add(category.id);
        setExpandedCategories(newExpanded);
        // Scroll content to top
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTop = 0;
        }
        return true;
      }
    }
    return false;
  }, [categories, expandedCategories]);

  // Navigate to an article
  const navigateToArticle = useCallback((articleId: string, categoryId: string) => {
    setSelectedArticle(articleId);
    setSelectedCategory(categoryId);
    const newExpanded = new Set(expandedCategories);
    newExpanded.add(categoryId);
    setExpandedCategories(newExpanded);
    // Scroll content to top
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [expandedCategories]);

  // Handle URL query params for direct article linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleSlug = params.get('article');
    if (articleSlug) {
      navigateToArticleBySlug(articleSlug);
    }
  }, [navigateToArticleBySlug]);

  // Set default selected category and article on mount
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      const firstCategory = categories[0];
      setSelectedCategory(firstCategory.id);
      setExpandedCategories(new Set([firstCategory.id]));
      if (firstCategory.articles.length > 0) {
        setSelectedArticle(firstCategory.articles[0].id);
      }
    }
  }, [categories, selectedCategory]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get current article
  const currentArticle = useMemo(() => {
    if (!selectedArticle) return null;
    for (const category of categories) {
      const article = category.articles.find(a => a.id === selectedArticle);
      if (article) return article;
    }
    return null;
  }, [selectedArticle, categories]);

  // Detect if content is HTML
  const isHtmlContent = (content: string) => {
    return /<[a-z][\s\S]*>/i.test(content);
  };

  // Extract headings from content for table of contents (supports both HTML and Markdown)
  const tableOfContents = useMemo(() => {
    if (!currentArticle) return [];
    
    const headings: { id: string; text: string; level: number }[] = [];
    const content = currentArticle.content;

    if (isHtmlContent(content)) {
      const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
      const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
      const allMatches: { text: string; level: number; index: number }[] = [];
      
      let match;
      while ((match = h2Regex.exec(content)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (text) {
          allMatches.push({ text, level: 2, index: match.index });
        }
      }
      while ((match = h3Regex.exec(content)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (text) {
          allMatches.push({ text, level: 3, index: match.index });
        }
      }
      
      allMatches.sort((a, b) => a.index - b.index);
      
      for (const m of allMatches) {
        const id = m.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        headings.push({ id, text: m.text, level: m.level });
      }
    } else {
      const lines = content.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          const text = trimmed.replace('## ', '').replace(/!\[.*?\]\(.*?\)/, '').trim();
          if (text) {
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            headings.push({ id, text, level: 2 });
          }
        } else if (trimmed.startsWith('### ')) {
          const text = trimmed.replace('### ', '').trim();
          if (text) {
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            headings.push({ id, text, level: 3 });
          }
        }
      });
    }
    
    return headings;
  }, [currentArticle]);

  // Filter articles based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const query = searchQuery.toLowerCase();
    return categories
      .map(category => {
        const matchingArticles = category.articles.filter(article =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
        );

        if (category.name.toLowerCase().includes(query) || matchingArticles.length > 0) {
          return {
            ...category,
            articles: matchingArticles.length > 0 ? matchingArticles : category.articles,
          };
        }
        return null;
      })
      .filter((category) => category !== null);
  }, [searchQuery, categories]);

  // Add IDs to HTML headings for table of contents navigation
  const addHeadingIds = (html: string) => {
    return html.replace(/<(h[23])([^>]*)>(.*?)<\/h[23]>/gi, (match, tag, attrs, text) => {
      const plainText = text.replace(/<[^>]*>/g, '').trim();
      const id = plainText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (/id\s*=/.test(attrs)) return match;
      return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
    });
  };

  // Render HTML content with proper styling
  const renderHtmlContent = (content: string) => {
    const styledContent = addHeadingIds(content);
    return (
      <div 
        className="user-guide-html-content"
        dangerouslySetInnerHTML={{ __html: styledContent }}
      />
    );
  };

  // Render markdown content with proper formatting (legacy support)
  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
        const className = currentList.type === 'ul' 
          ? 'list-disc list-inside space-y-2 text-gray-700 ml-4 my-4'
          : 'list-decimal list-inside space-y-2 text-gray-700 ml-4 my-4';
        
        elements.push(
          <ListTag key={key++} className={className}>
            {currentList.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        flushList();
        const text = trimmed.replace('## ', '').replace(/!\[.*?\]\(.*?\)/, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        elements.push(
          <h2 key={key++} id={id} className="text-2xl font-bold text-[#0c0528] mt-8 mb-4 pb-2 border-b border-gray-200">
            {text}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        const text = trimmed.replace('### ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        elements.push(
          <h3 key={key++} id={id} className="text-xl font-semibold text-[#0c0528] mt-6 mb-3">
            {text}
          </h3>
        );
      } else if (trimmed.startsWith('#### ')) {
        flushList();
        const text = trimmed.replace('#### ', '').trim();
        elements.push(
          <h4 key={key++} className="text-lg font-semibold text-[#0c0528] mt-4 mb-2">
            {text}
          </h4>
        );
      }
      else if (trimmed.match(/^!\[.*?\]\(.*?\)$/)) {
        flushList();
        const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, alt, src] = match;
          elements.push(
            <div key={key++} className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={src}
                alt={alt}
                width={1200}
                height={800}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          );
        }
      }
      else if (trimmed.match(/^\d+\.\s/)) {
        const text = trimmed.replace(/^\d+\.\s/, '');
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [text] };
        } else {
          currentList.items.push(text);
        }
      }
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*]\s/, '');
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [text] };
        } else {
          currentList.items.push(text);
        }
      }
      else if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.split('**').length === 3) {
        flushList();
        const text = trimmed.replace(/\*\*/g, '');
        elements.push(
          <p key={key++} className="text-gray-700 mb-4 leading-relaxed">
            <strong className="text-[#0c0528] font-semibold">{text}</strong>
          </p>
        );
      }
      else if (trimmed && !trimmed.startsWith('#')) {
        flushList();
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        if (parts.length > 1) {
          elements.push(
            <p key={key++} className="text-gray-700 mb-4 leading-relaxed">
              {parts.map((part, idx) => 
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={idx} className="text-[#0c0528] font-semibold">
                    {part.replace(/\*\*/g, '')}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        } else {
          elements.push(
            <p key={key++} className="text-gray-700 mb-4 leading-relaxed">
              {trimmed}
            </p>
          );
        }
      } else if (trimmed === '') {
        flushList();
      }
    });

    flushList();
    return elements;
  };

  // Render content - auto-detect HTML vs Markdown
  const renderContent = (content: string) => {
    if (isHtmlContent(content)) {
      return renderHtmlContent(content);
    }
    return renderMarkdownContent(content);
  };

  // Handle internal article links: intercept clicks on /help?article=SLUG links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Handle /help?article=slug links
      if (href.startsWith('/help?article=') || href.startsWith('/help/?article=')) {
        e.preventDefault();
        const url = new URL(href, window.location.origin);
        const articleSlug = url.searchParams.get('article');
        if (articleSlug) {
          navigateToArticleBySlug(articleSlug);
          // Update browser URL without reload
          window.history.pushState({}, '', `/help?article=${articleSlug}`);
        }
      }
    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
      return () => container.removeEventListener('click', handleClick);
    }
  }, [navigateToArticleBySlug]);

  // Handle scroll for table of contents highlighting
  useEffect(() => {
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const headings = scrollContainer.querySelectorAll('h2[id], h3[id]');
      if (!headings || headings.length === 0) return;

      let current = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        // Account for the sticky header offset (~80px)
        if (rect.top <= 120) {
          current = heading.id;
        }
      });

      setActiveHeading(current);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [currentArticle]);

  return (
    <div className="bg-white flex h-full">
      {/* Left Sidebar Navigation - sticky/fixed */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-50 border-r border-gray-200 flex-shrink-0 flex flex-col`}>
        {/* Search - fixed at top */}
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0025cc] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategories.has(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <div key={category.id}>
                <button
                  onClick={() => {
                    if (category.articles.length > 0) {
                      toggleCategory(category.id);
                      setSelectedCategory(category.id);
                      if (category.articles.length > 0) {
                        setSelectedArticle(category.articles[0].id);
                      }
                      // Scroll content to top
                      if (contentScrollRef.current) {
                        contentScrollRef.current.scrollTop = 0;
                      }
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#0025cc] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{category.name}</span>
                </button>

                {/* Articles in category */}
                {isExpanded && category.articles.length > 0 && (
                  <div className="ml-7 mt-1 space-y-1">
                    {category.articles.map((article) => {
                      const isArticleSelected = selectedArticle === article.id;
                      return (
                        <button
                          key={article.id}
                          onClick={() => {
                            navigateToArticle(article.id, category.id);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isArticleSelected
                              ? 'bg-[#0025cc]/10 text-[#0025cc] font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {article.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - scrollable center */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - sticky */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <span>Documentation</span>
                  <ChevronRightIcon className="w-4 h-4" />
                  <span>User Guide</span>
                </div>
                <h1 className="text-2xl font-bold text-[#0c0528]">
                  {currentArticle?.title || 'User Guide'}
                </h1>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bars3Icon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - this is the only scrollable area */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {currentArticle ? (
              <article ref={contentRef} className="prose prose-lg max-w-none">
                <div className="text-gray-700 leading-relaxed">
                  {renderContent(currentArticle.content)}
                </div>
              </article>
            ) : (
              <div className="text-center py-12">
                <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Select an article</h2>
                <p className="text-gray-600">Choose a topic from the sidebar to get started</p>
              </div>
            )}

            {/* Previous / Next Navigation */}
            {currentArticle && (
              <nav className="mt-16 mb-8 border-t border-gray-200 pt-8">
                <div className="flex items-stretch justify-between gap-4">
                  {/* Previous Article */}
                  {prevArticle ? (
                    <button
                      onClick={() => navigateToArticle(prevArticle.article.id, prevArticle.categoryId)}
                      className="flex-1 group text-left p-4 rounded-lg border border-gray-200 hover:border-[#0025cc] hover:bg-[#0025cc]/5 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 group-hover:text-[#0025cc] mb-1">
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </div>
                      <div className="font-medium text-gray-900 group-hover:text-[#0025cc] transition-colors">
                        {prevArticle.article.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{prevArticle.categoryName}</div>
                    </button>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {/* Next Article */}
                  {nextArticle ? (
                    <button
                      onClick={() => navigateToArticle(nextArticle.article.id, nextArticle.categoryId)}
                      className="flex-1 group text-right p-4 rounded-lg border border-gray-200 hover:border-[#0025cc] hover:bg-[#0025cc]/5 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1.5 text-sm text-gray-500 group-hover:text-[#0025cc] mb-1">
                        <span>Next</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="font-medium text-gray-900 group-hover:text-[#0025cc] transition-colors">
                        {nextArticle.article.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{nextArticle.categoryName}</div>
                    </button>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Table of Contents - sticky */}
      {currentArticle && tableOfContents.length > 0 && (
        <aside className="hidden xl:flex w-64 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">On this page</h3>
            <nav className="space-y-2">
              {tableOfContents.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const scrollContainer = contentScrollRef.current;
                    const element = scrollContainer?.querySelector(`#${CSS.escape(heading.id)}`);
                    if (element && scrollContainer) {
                      const elementTop = element.getBoundingClientRect().top;
                      const containerTop = scrollContainer.getBoundingClientRect().top;
                      scrollContainer.scrollTo({
                        top: scrollContainer.scrollTop + (elementTop - containerTop) - 20,
                        behavior: 'smooth',
                      });
                    }
                  }}
                  className={`block text-sm transition-colors ${
                    heading.level === 2
                      ? `pl-0 ${activeHeading === heading.id ? 'text-[#0025cc] font-medium' : 'text-gray-700 hover:text-[#0025cc]'}`
                      : `pl-4 ${activeHeading === heading.id ? 'text-[#0025cc] font-medium' : 'text-gray-600 hover:text-[#0025cc]'}`
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
