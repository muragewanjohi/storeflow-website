/**
 * User Guide Content Component
 * 
 * Modern help center inspired by Medusa's user guide structure
 * Features: Left sidebar navigation, right sidebar table of contents, search
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingCartIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  TruckIcon,
  HeartIcon,
  EnvelopeIcon,
  XMarkIcon,
  BookOpenIcon,
  ChevronRightIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { 
  BookOpenIcon as BookOpenIconSolid,
} from '@heroicons/react/24/solid';

// Icon mapping
const iconMap: Record<string, typeof UserIcon> = {
  'UserIcon': UserIcon,
  'ShoppingCartIcon': ShoppingCartIcon,
  'QuestionMarkCircleIcon': QuestionMarkCircleIcon,
  'CreditCardIcon': CreditCardIcon,
  'TruckIcon': TruckIcon,
  'HeartIcon': HeartIcon,
  'EnvelopeIcon': EnvelopeIcon,
  'BookOpenIcon': BookOpenIcon,
};

interface UserGuideContentProps {
  tenantName?: string | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string | null;
    icon: string | null;
    color: string | null;
    bg_color: string | null;
    sort_order: number | null;
    is_active: boolean | null;
    articles: Array<{
      id: string;
      title: string;
      slug: string | null;
      content: string;
      image: string | null;
      image_alt: string | null;
      sort_order: number | null;
      is_active: boolean | null;
      is_popular: boolean | null;
    }>;
  }>;
}

export default function UserGuideContent({ tenantName, categories: dbCategories }: Readonly<UserGuideContentProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Map database categories to component format
  const categories = useMemo(() => {
    return dbCategories.map(cat => ({
      ...cat,
      icon: cat.icon ? (iconMap[cat.icon] || BookOpenIcon) : BookOpenIcon,
    }));
  }, [dbCategories]);

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

  // Extract headings from content for table of contents
  const tableOfContents = useMemo(() => {
    if (!currentArticle) return [];
    
    const headings: { id: string; text: string; level: number }[] = [];
    const lines = currentArticle.content.split('\n');
    
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

  // Render content with proper formatting
  const renderContent = (content: string) => {
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

      // Headings
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
      // Images
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
      // Numbered lists
      else if (trimmed.match(/^\d+\.\s/)) {
        const text = trimmed.replace(/^\d+\.\s/, '');
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [text] };
        } else {
          currentList.items.push(text);
        }
      }
      // Bullet lists
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*]\s/, '');
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [text] };
        } else {
          currentList.items.push(text);
        }
      }
      // Bold text (standalone)
      else if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.split('**').length === 3) {
        flushList();
        const text = trimmed.replace(/\*\*/g, '');
        elements.push(
          <p key={key++} className="text-gray-700 mb-4 leading-relaxed">
            <strong className="text-[#0c0528] font-semibold">{text}</strong>
          </p>
        );
      }
      // Regular paragraphs
      else if (trimmed && !trimmed.startsWith('#')) {
        flushList();
        // Handle inline bold
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

    flushList(); // Flush any remaining list

    return elements;
  };

  // Handle scroll for table of contents highlighting
  useEffect(() => {
    if (!contentRef.current) return;

    const handleScroll = () => {
      const headings = contentRef.current?.querySelectorAll('h2, h3');
      if (!headings) return;

      let current = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          current = heading.id;
        }
      });

      setActiveHeading(current);
    };

    const container = contentRef.current;
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentArticle]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-50 border-r border-gray-200 flex-shrink-0`}>
        <div className="h-full overflow-y-auto">
          {/* Search */}
          <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
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

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {(selectedCategory ? categories.filter(c => c.id === selectedCategory) : filteredCategories).map((category) => {
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
                              setSelectedArticle(article.id);
                              setSelectedCategory(category.id);
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
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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
          </div>
        </div>
      </div>

      {/* Right Sidebar - Table of Contents */}
      {currentArticle && tableOfContents.length > 0 && (
        <aside className="hidden xl:block w-64 flex-shrink-0 border-l border-gray-200 bg-gray-50">
          <div className="sticky top-0 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">On this page</h3>
            <nav className="space-y-2">
              {tableOfContents.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
