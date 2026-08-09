-- ====================================================================
-- EDUHUB GAME PLATFORM - DATABASE SCHEMA & RLS MIGRATION
-- Chạy 1-click trong Supabase SQL Editor
-- ====================================================================

-- 1. BẬT TIỆN ÍCH EXTENSION THƯ VIỆN CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TẠO CÁC BẢNG DỮ LIỆU CHÍNH (TABLES)

-- Bảng Hồ sơ người dùng (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Lớp học (Classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    code TEXT UNIQUE NOT NULL,
    subject TEXT DEFAULT '',
    grade TEXT DEFAULT '',
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Thành viên lớp học (Class Members)
CREATE TABLE IF NOT EXISTS public.class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
);

-- Bảng Học liệu & Trò chơi (Materials & Games)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('document', 'video', 'game_iframe', 'game_html5')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT true,
    subject TEXT DEFAULT '',
    grade TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Giao bài tập (Assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    instructions TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng Tiến độ & Điểm số của Học sinh (Student Progress)
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    score NUMERIC DEFAULT 0,
    completion_time_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

-- 3. TẠO INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(code);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student_id ON public.class_members(student_id);
CREATE INDEX IF NOT EXISTS idx_materials_author_id ON public.materials(author_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_is_public ON public.materials(is_public);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_material_id ON public.assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_assignment_id ON public.student_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);

-- 4. AUTOTRIGGER TỰ ĐỘNG TẠO BẢN GHI PROFILES KHI ĐĂNG KÝ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. BẬT ROW LEVEL SECURITY (RLS) TRÊN TẤT CẢ CÁC BẢNG
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- 6. HÀM TRỢ GIÚP CHECK ROLE BẢO MẬT (HELPER FUNCTIONS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. THIẾT LẬP RLS POLICIES CỤ THỂ

-- POLICIES FOR profiles
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin full control profiles" ON public.profiles;
CREATE POLICY "Admin full control profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- POLICIES FOR classes
DROP POLICY IF EXISTS "Read accessible classes" ON public.classes;
CREATE POLICY "Read accessible classes" ON public.classes FOR SELECT USING (
    teacher_id = auth.uid() 
    OR public.is_admin() 
    OR EXISTS (
        SELECT 1 FROM public.class_members 
        WHERE class_id = public.classes.id AND student_id = auth.uid()
    )
    OR true -- Cho phép mọi user search class theo join code
);

DROP POLICY IF EXISTS "Teachers and Admins create classes" ON public.classes;
CREATE POLICY "Teachers and Admins create classes" ON public.classes FOR INSERT WITH CHECK (
    auth.uid() = teacher_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Teachers and Admins update own classes" ON public.classes;
CREATE POLICY "Teachers and Admins update own classes" ON public.classes FOR UPDATE USING (
    teacher_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Teachers and Admins delete own classes" ON public.classes;
CREATE POLICY "Teachers and Admins delete own classes" ON public.classes FOR DELETE USING (
    teacher_id = auth.uid() OR public.is_admin()
);

-- POLICIES FOR class_members
DROP POLICY IF EXISTS "Read class members" ON public.class_members;
CREATE POLICY "Read class members" ON public.class_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Join or add class members" ON public.class_members;
CREATE POLICY "Join or add class members" ON public.class_members FOR INSERT WITH CHECK (
    student_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Remove class members" ON public.class_members;
CREATE POLICY "Remove class members" ON public.class_members FOR DELETE USING (
    student_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
);

-- POLICIES FOR materials
DROP POLICY IF EXISTS "Read materials" ON public.materials;
CREATE POLICY "Read materials" ON public.materials FOR SELECT USING (
    is_public = true 
    OR author_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.class_members cm ON cm.class_id = a.class_id
        WHERE a.material_id = public.materials.id AND cm.student_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers and Admins insert materials" ON public.materials;
CREATE POLICY "Teachers and Admins insert materials" ON public.materials FOR INSERT WITH CHECK (
    author_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Authors and Admins update materials" ON public.materials;
CREATE POLICY "Authors and Admins update materials" ON public.materials FOR UPDATE USING (
    author_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Authors and Admins delete materials" ON public.materials;
CREATE POLICY "Authors and Admins delete materials" ON public.materials FOR DELETE USING (
    author_id = auth.uid() OR public.is_admin()
);

-- POLICIES FOR assignments
DROP POLICY IF EXISTS "Read assignments" ON public.assignments;
CREATE POLICY "Read assignments" ON public.assignments FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.class_members 
        WHERE class_id = public.assignments.class_id AND student_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers assign materials" ON public.assignments;
CREATE POLICY "Teachers assign materials" ON public.assignments FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers update assignments" ON public.assignments;
CREATE POLICY "Teachers update assignments" ON public.assignments FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers delete assignments" ON public.assignments;
CREATE POLICY "Teachers delete assignments" ON public.assignments FOR DELETE USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.classes 
        WHERE id = class_id AND teacher_id = auth.uid()
    )
);

-- POLICIES FOR student_progress
DROP POLICY IF EXISTS "Read progress" ON public.student_progress;
CREATE POLICY "Read progress" ON public.student_progress FOR SELECT USING (
    student_id = auth.uid() 
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.classes c ON c.id = a.class_id
        WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Insert/Update progress" ON public.student_progress;
CREATE POLICY "Insert/Update progress" ON public.student_progress FOR INSERT WITH CHECK (
    student_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Update own progress" ON public.student_progress;
CREATE POLICY "Update own progress" ON public.student_progress FOR UPDATE USING (
    student_id = auth.uid() OR public.is_admin()
);

-- ====================================================================
-- HƯỚNG DẪN TẠO STORAGE BUCKET TRÊN SUPABASE CONSOLE:
-- 1. Vào mục Storage -> Create Bucket tên là: materials
-- 2. Tích chọn "Public Bucket" (Cho phép đọc file công khai)
-- ====================================================================
