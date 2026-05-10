-- Create accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  avatar TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW()
);

-- Create lesson_progress table (track completed lessons)
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own account
CREATE POLICY "Users can read their own account" ON public.accounts
  FOR SELECT USING (true);

CREATE POLICY "Users can read their enrollments" ON public.enrollments
  FOR SELECT USING (true);

CREATE POLICY "Users can read their progress" ON public.lesson_progress
  FOR SELECT USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON public.accounts
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role can manage enrollments" ON public.enrollments
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role can manage progress" ON public.lesson_progress
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
