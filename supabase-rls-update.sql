-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read their own account" ON public.accounts;
DROP POLICY IF EXISTS "Users can read their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can read their progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Service role can do everything" ON public.accounts;
DROP POLICY IF EXISTS "Service role can manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Service role can manage progress" ON public.lesson_progress;

-- Create permissive policies for authenticated access
CREATE POLICY "Anyone can read accounts" ON public.accounts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read enrollments" ON public.enrollments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read lesson progress" ON public.lesson_progress
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update lesson progress" ON public.lesson_progress
  FOR UPDATE USING (true) WITH CHECK (true);
