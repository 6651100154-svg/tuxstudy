DROP TABLE IF EXISTS public.parts CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.courses (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  teacher_avatar TEXT DEFAULT '',
  description TEXT NOT NULL,
  preview_video_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.lessons (
  id TEXT PRIMARY KEY,
  chapter_id TEXT REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.parts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  video_backup TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bật lại RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public read parts" ON public.parts FOR SELECT USING (true);
CREATE POLICY "Public read notifications" ON public.notifications FOR SELECT USING (true);

CREATE POLICY "Admin all subjects" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Admin all courses" ON public.courses FOR ALL USING (true);
CREATE POLICY "Admin all chapters" ON public.chapters FOR ALL USING (true);
CREATE POLICY "Admin all lessons" ON public.lessons FOR ALL USING (true);
CREATE POLICY "Admin all parts" ON public.parts FOR ALL USING (true);
CREATE POLICY "Admin all notifications" ON public.notifications FOR ALL USING (true);

-- Cập nhật schema cache
NOTIFY pgrst, 'reload schema';
