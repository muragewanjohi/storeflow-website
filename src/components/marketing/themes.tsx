'use client';

import { ImageWithFallback } from './image-with-fallback';

const themes = [
  { name: 'Default', description: 'Modern electronics store theme' },
  { name: 'Modern', description: 'Sleek and contemporary design' },
  { name: 'HexFashion', description: 'Fashion-forward retail theme' },
  { name: 'Minimal', description: 'Clean and minimalist aesthetic' },
];

export function Themes() {
  const themeImages = [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', // Default
    'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80', // Modern
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80', // HexFashion
    'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80', // Minimal
  ];

  return (
    <section id="themes" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Amazing Themes</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from beautiful, professionally designed themes for every industry
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {themes.map((theme, index) => (
            <div
              key={index}
              className="p-0 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 text-center overflow-hidden"
            >
              <div className="relative h-48 w-full">
                <ImageWithFallback
                  src={themeImages[index]}
                  alt={theme.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold mb-2">{theme.name}</h3>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
