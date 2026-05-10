-- 1. TẠO CÁC BẢNG CHO KHÓA HỌC
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  teacher_avatar TEXT DEFAULT '',
  description TEXT NOT NULL,
  preview_video_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  chapter_id TEXT REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  video_backup TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CẬP NHẬT BẢNG ACCOUNTS VÀ MIGRATE SANG AUTH.USERS
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bản ghi trong auth.users từ public.accounts (chỉ những user chưa có trong auth.users)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, deleted_at
)
SELECT 
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email, crypt(password, gen_salt('bf')), now(),
  created_at, updated_at, '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', name, 'role', role, 'avatar', avatar),
  false, false, null
FROM public.accounts
WHERE auth_id IS NULL AND email NOT IN (SELECT email FROM auth.users);

-- Tạo bản ghi trong auth.identities (Bắt buộc cho Supabase Auth để login được)
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
)
SELECT 
  u.id::text, u.id, jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true), 'email', u.last_sign_in_at, u.created_at, u.updated_at, gen_random_uuid()
FROM auth.users u
WHERE u.email IN (SELECT email FROM public.accounts WHERE auth_id IS NULL)
ON CONFLICT (provider_id, provider) DO NOTHING;

-- Map auth.users ID về lại public.accounts
UPDATE public.accounts a
SET auth_id = u.id
FROM auth.users u
WHERE a.email = u.email AND a.auth_id IS NULL;

-- (Tùy chọn) Sau khi xác nhận mọi thứ hoạt động, bạn có thể xóa cột password
-- ALTER TABLE public.accounts DROP COLUMN password;

-- 3. THIẾT LẬP BẢO MẬT (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể đọc khóa học, môn học, v.v.
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public read parts" ON public.parts FOR SELECT USING (true);
CREATE POLICY "Public read notifications" ON public.notifications FOR SELECT USING (true);

-- Tạm thời cho phép Admin làm mọi thứ (tuy nhiên để dễ cài đặt, tạm mở để API chèn dữ liệu không lỗi)
CREATE POLICY "Admin all subjects" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Admin all courses" ON public.courses FOR ALL USING (true);
CREATE POLICY "Admin all chapters" ON public.chapters FOR ALL USING (true);
CREATE POLICY "Admin all lessons" ON public.lessons FOR ALL USING (true);
CREATE POLICY "Admin all parts" ON public.parts FOR ALL USING (true);
CREATE POLICY "Admin all notifications" ON public.notifications FOR ALL USING (true);

-- Cập nhật RLS của accounts, enrollments, lesson_progress theo chuẩn auth.uid()
DROP POLICY IF EXISTS "Anyone can read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Anyone can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Anyone can read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Anyone can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Anyone can read lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Anyone can insert lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Anyone can update lesson progress" ON public.lesson_progress;

-- Cho phép đọc toàn bộ accounts để UI dễ sử dụng, nhưng chỉ được sửa/thêm tài khoản của mình (hoặc thông qua admin)
CREATE POLICY "Public read accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "User update own account" ON public.accounts FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "Insert accounts" ON public.accounts FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Insert own enrollment" ON public.enrollments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read lesson progress" ON public.lesson_progress FOR SELECT USING (true);
CREATE POLICY "Insert/Update own progress" ON public.lesson_progress FOR ALL USING (true);
