-- ==============================================================================
-- [풀어 DREAM] Supabase 데이터베이스 & 스토리지 RLS 설정 SQL
-- 테이블: users, textbook_problems, questions, answers
-- 스토리지 버킷: images
-- ==============================================================================

-- 1. 테이블 RLS(행 단위 보안) 전체 접근 허용 정책 (anon 키로 회원가입/조회/등록/수정/삭제 가능하도록 설정)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Public Access users') THEN
    CREATE POLICY "Public Access users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'textbook_problems' AND policyname = 'Public Access textbook_problems') THEN
    CREATE POLICY "Public Access textbook_problems" ON public.textbook_problems FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Public Access questions') THEN
    CREATE POLICY "Public Access questions" ON public.questions FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'answers' AND policyname = 'Public Access answers') THEN
    CREATE POLICY "Public Access answers" ON public.answers FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Storage 버킷(images) 공개 및 업로드 허용 정책
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for images') THEN
    CREATE POLICY "Public Access for images" ON storage.objects FOR ALL TO public USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
