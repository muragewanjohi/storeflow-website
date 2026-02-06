-- Create User Guide Categories table
CREATE TABLE IF NOT EXISTS user_guide_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(50),
  bg_color VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

-- Create User Guide Articles table
CREATE TABLE IF NOT EXISTS user_guide_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES user_guide_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  content TEXT NOT NULL,
  image VARCHAR(255),
  image_alt VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_guide_categories_slug ON user_guide_categories(slug);
CREATE INDEX IF NOT EXISTS idx_user_guide_categories_sort_order ON user_guide_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_guide_articles_category_id ON user_guide_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_user_guide_articles_slug ON user_guide_articles(slug);
CREATE INDEX IF NOT EXISTS idx_user_guide_articles_sort_order ON user_guide_articles(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_guide_articles_is_active ON user_guide_articles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_guide_articles_is_popular ON user_guide_articles(is_popular);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_guide_categories_updated_at BEFORE UPDATE ON user_guide_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_guide_articles_updated_at BEFORE UPDATE ON user_guide_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
