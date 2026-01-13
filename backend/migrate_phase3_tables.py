#!/usr/bin/env python3
"""
Migration: Create Phase 3 - Academy Platform Learning & Features Tables
Includes: Video chapters, bookmarks, notes, marketplace products, asset library, 
learning features, and quiz/assignment support
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Establish database connection from environment variable"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://neondb_owner:npg_vgy4STuQ8Mja@ep-soft-pond-ag9vm5a4-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')
    
    # Handle psql wrapper prefix
    if db_url.startswith('psql '):
        db_url = db_url.replace('psql ', '')
    
    # Strip quotes if present
    db_url = db_url.strip('"\'')
    
    return psycopg2.connect(db_url)

def migrate():
    """Execute migration"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔄 Creating Phase 3 database tables (Academy Learning Features)...\n")
        
        # 1. Video Chapters Table
        print("Creating video_chapters table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS video_chapters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                video_id TEXT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time DECIMAL(10,2) NOT NULL,
                end_time DECIMAL(10,2),
                duration DECIMAL(10,2),
                thumbnail_url TEXT,
                is_auto_generated BOOLEAN DEFAULT false,
                confidence DECIMAL(3,2),
                tags TEXT[],
                is_visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT video_chapters_valid_times CHECK (start_time >= 0 AND (end_time IS NULL OR end_time > start_time))
            )
        """)
        
        # 2. Video Annotations Table
        print("Creating video_annotations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS video_annotations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                video_id TEXT NOT NULL,
                timestamp DECIMAL(10,2) NOT NULL,
                text TEXT NOT NULL,
                annotation_type VARCHAR(50) DEFAULT 'note',
                color VARCHAR(7),
                coordinates JSONB,
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 3. User Bookmarks Table
        print("Creating user_bookmarks table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_bookmarks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                timestamp DECIMAL(10,2) NOT NULL,
                title VARCHAR(255),
                note TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 4. User Notes Table
        print("Creating user_notes table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_notes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                note_content TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'general',
                tags TEXT[],
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 5. Marketplace Products Table
        print("Creating marketplace_products table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL,
                price DECIMAL(10,2) DEFAULT 0,
                currency VARCHAR(3) DEFAULT 'NOK',
                thumbnail_url TEXT,
                screenshots TEXT[],
                version VARCHAR(20),
                author_id VARCHAR(36) REFERENCES user_profiles(id) ON DELETE SET NULL,
                author_name VARCHAR(255),
                rating DECIMAL(3,2) DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                download_count INTEGER DEFAULT 0,
                install_count INTEGER DEFAULT 0,
                tags TEXT[],
                features TEXT[],
                license VARCHAR(50),
                is_installed BOOLEAN DEFAULT false,
                installed_version VARCHAR(20),
                has_update BOOLEAN DEFAULT false,
                is_favorite BOOLEAN DEFAULT false,
                release_date DATE,
                last_updated TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 6. Marketplace Reviews Table
        print("Creating marketplace_reviews table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                helpful_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 7. Asset Library Items Table
        print("Creating asset_library_items table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS asset_library_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                asset_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                thumbnail_url TEXT,
                model_url TEXT,
                is_system BOOLEAN DEFAULT false,
                metadata JSONB,
                recommended_patterns JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_user_asset UNIQUE(user_id, asset_id)
            )
        """)
        
        # 8. Asset Favorites Table
        print("Creating asset_favorites table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS asset_favorites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                asset_id UUID NOT NULL REFERENCES asset_library_items(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_favorite UNIQUE(user_id, asset_id)
            )
        """)
        
        # 9. User Asset Usage Table
        print("Creating user_asset_usage table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_asset_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                asset_id UUID NOT NULL REFERENCES asset_library_items(id) ON DELETE CASCADE,
                project_id UUID,
                usage_count INTEGER DEFAULT 0,
                last_used TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 10. Quiz Questions Table
        print("Creating quiz_questions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                question_type VARCHAR(50) NOT NULL,
                options JSONB,
                correct_answer VARCHAR(500),
                explanation TEXT,
                difficulty_level VARCHAR(20),
                points INTEGER DEFAULT 1,
                tags TEXT[],
                order_index INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 11. Quiz Submissions Table
        print("Creating quiz_submissions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_submissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                quiz_question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
                answer TEXT,
                is_correct BOOLEAN,
                points_earned INTEGER,
                time_spent INTEGER,
                submitted_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 12. Course Assignments Table
        print("Creating course_assignments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                instructions TEXT,
                due_date TIMESTAMP,
                submission_type VARCHAR(50),
                total_points INTEGER DEFAULT 100,
                rubric JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 13. Assignment Submissions Table
        print("Creating assignment_submissions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                submission_content TEXT,
                submission_url TEXT,
                file_urls TEXT[],
                points_earned INTEGER,
                feedback TEXT,
                status VARCHAR(50) DEFAULT 'submitted',
                submitted_at TIMESTAMP DEFAULT NOW(),
                graded_at TIMESTAMP,
                graded_by VARCHAR(36) REFERENCES user_profiles(id) ON DELETE SET NULL
            )
        """)
        
        # 14. Video Highlights Table
        print("Creating video_highlights table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS video_highlights (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                video_id TEXT NOT NULL,
                start_time DECIMAL(10,2) NOT NULL,
                end_time DECIMAL(10,2) NOT NULL,
                text TEXT,
                color VARCHAR(7),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 15. Learning Certificates Table
        print("Creating learning_certificates table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_certificates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                certificate_number VARCHAR(100) UNIQUE,
                issue_date TIMESTAMP DEFAULT NOW(),
                expiry_date TIMESTAMP,
                certificate_url TEXT,
                is_digital BOOLEAN DEFAULT true,
                signature_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 16. Learning Paths Table
        print("Creating learning_paths table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_paths (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) REFERENCES user_profiles(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                path_type VARCHAR(50),
                courses JSONB,
                prerequisites JSONB,
                estimated_duration INTEGER,
                difficulty_level VARCHAR(20),
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 17. Live Sessions Table
        print("Creating live_sessions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS live_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                instructor_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                meeting_url TEXT,
                max_participants INTEGER,
                recording_url TEXT,
                status VARCHAR(50) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 18. Live Session Participants Table
        print("Creating live_session_participants table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS live_session_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                joined_at TIMESTAMP DEFAULT NOW(),
                left_at TIMESTAMP,
                participation_time INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 19. User Course Progress Table
        print("Creating user_course_progress table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_course_progress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                course_post_id VARCHAR(36) REFERENCES course_posts(id) ON DELETE SET NULL,
                progress_percentage DECIMAL(5,2) DEFAULT 0,
                last_position INTEGER DEFAULT 0,
                last_accessed TIMESTAMP DEFAULT NOW(),
                time_spent INTEGER DEFAULT 0,
                is_completed BOOLEAN DEFAULT false,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_progress UNIQUE(user_id, course_id)
            )
        """)
        
        # 20. Course Resources Table
        print("Creating course_resources table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_resources (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                resource_name VARCHAR(255) NOT NULL,
                resource_type VARCHAR(100),
                resource_url TEXT NOT NULL,
                description TEXT,
                size_bytes BIGINT,
                download_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Create indexes for Phase 3
        print("\nCreating indexes...")
        indexes = [
            ("idx_video_chapters_course_post", "video_chapters", "course_post_id"),
            ("idx_video_chapters_video_id", "video_chapters", "video_id"),
            ("idx_video_annotations_user", "video_annotations", "user_id"),
            ("idx_video_annotations_course_post", "video_annotations", "course_post_id"),
            ("idx_user_bookmarks_user", "user_bookmarks", "user_id"),
            ("idx_user_bookmarks_course", "user_bookmarks", "course_id"),
            ("idx_user_notes_user", "user_notes", "user_id"),
            ("idx_user_notes_course", "user_notes", "course_id"),
            ("idx_marketplace_products_category", "marketplace_products", "category"),
            ("idx_marketplace_products_author", "marketplace_products", "author_id"),
            ("idx_marketplace_reviews_product", "marketplace_reviews", "product_id"),
            ("idx_marketplace_reviews_user", "marketplace_reviews", "user_id"),
            ("idx_asset_library_user", "asset_library_items", "user_id"),
            ("idx_asset_library_category", "asset_library_items", "category"),
            ("idx_asset_favorites_user", "asset_favorites", "user_id"),
            ("idx_user_asset_usage_user", "user_asset_usage", "user_id"),
            ("idx_quiz_questions_course_post", "quiz_questions", "course_post_id"),
            ("idx_quiz_submissions_user", "quiz_submissions", "user_id"),
            ("idx_assignment_submissions_user", "assignment_submissions", "user_id"),
            ("idx_assignment_submissions_assignment", "assignment_submissions", "assignment_id"),
            ("idx_video_highlights_user", "video_highlights", "user_id"),
            ("idx_certificates_user", "learning_certificates", "user_id"),
            ("idx_certificates_course", "learning_certificates", "course_id"),
            ("idx_learning_paths_user", "learning_paths", "user_id"),
            ("idx_live_sessions_instructor", "live_sessions", "instructor_id"),
            ("idx_live_sessions_course", "live_sessions", "course_id"),
            ("idx_live_session_participants_user", "live_session_participants", "user_id"),
            ("idx_course_progress_user", "user_course_progress", "user_id"),
            ("idx_course_progress_course", "user_course_progress", "course_id"),
            ("idx_course_resources_course", "course_resources", "course_id"),
        ]
        
        for idx_name, table_name, column_name in indexes:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name}({column_name})")
            print(f"  ✓ {idx_name}")
        
        conn.commit()
        print("\n✅ Phase 3 migration completed successfully!")
        print("📊 Created 20 tables with 30 indexes for Academy learning features")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    migrate()
