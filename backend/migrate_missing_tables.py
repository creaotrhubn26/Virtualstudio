"""
Migration: Create Missing Database Tables
Adds: courses, enrollments, posts, revenue tracking, user profiles, analytics, and user consents
"""

import os
from virtual_studio_service import get_db_connection

def migrate():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔄 Creating missing database tables...\n")
        
        # 1. User Profiles Table
        print("Creating user_profiles table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(255),
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                avatar_url TEXT,
                bio TEXT,
                user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('student', 'instructor', 'admin')),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ user_profiles created\n")
        
        # 2. Courses Table
        print("Creating courses table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
                price DECIMAL(10, 2) DEFAULT 0,
                thumbnail_url TEXT,
                banner_url TEXT,
                is_published BOOLEAN DEFAULT FALSE,
                is_featured BOOLEAN DEFAULT FALSE,
                total_students INTEGER DEFAULT 0,
                total_revenue DECIMAL(15, 2) DEFAULT 0,
                course_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ courses created\n")
        
        # 3. Course Posts/Content Table
        print("Creating course_posts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_posts (
                id VARCHAR(36) PRIMARY KEY,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                author_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                post_type VARCHAR(50) CHECK (post_type IN ('lesson', 'announcement', 'discussion')),
                video_url TEXT,
                video_duration_seconds INTEGER,
                thumbnail_url TEXT,
                order_index INTEGER DEFAULT 0,
                is_published BOOLEAN DEFAULT FALSE,
                engagement_count INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                like_count INTEGER DEFAULT 0,
                post_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ course_posts created\n")
        
        # 4. Course Enrollments Table
        print("Creating course_enrollments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_enrollments (
                id VARCHAR(36) PRIMARY KEY,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                enrollment_status VARCHAR(50) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'completed', 'dropped', 'paused')),
                enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completion_date TIMESTAMP WITH TIME ZONE,
                progress_percentage INTEGER DEFAULT 0,
                last_accessed TIMESTAMP WITH TIME ZONE,
                certificate_url TEXT,
                enrollment_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(course_id, user_id)
            )
        """)
        print("✅ course_enrollments created\n")
        
        # 5. Instructor Revenue Table
        print("Creating instructor_revenue table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS instructor_revenue (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
                revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('course_sale', 'subscription', 'bonus', 'refund')),
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                student_id VARCHAR(36),
                description TEXT,
                transaction_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
                payment_method VARCHAR(50),
                transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                processed_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ instructor_revenue created\n")
        
        # 6. Analytics Events Table
        print("Creating analytics_events table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analytics_events (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) REFERENCES user_profiles(id) ON DELETE SET NULL,
                event_type VARCHAR(100) NOT NULL,
                event_name VARCHAR(255) NOT NULL,
                course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
                post_id VARCHAR(36) REFERENCES course_posts(id) ON DELETE SET NULL,
                metadata JSONB,
                duration_seconds INTEGER,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ analytics_events created\n")
        
        # 7. User Consents Table (for GDPR/privacy)
        print("Creating casting_user_consents table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS casting_user_consents (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                consent_type VARCHAR(100) NOT NULL,
                granted BOOLEAN DEFAULT FALSE,
                granted_at TIMESTAMP WITH TIME ZONE,
                revoked_at TIMESTAMP WITH TIME ZONE,
                consent_version VARCHAR(50),
                ip_address VARCHAR(50),
                user_agent TEXT,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ casting_user_consents created\n")
        
        # 8. Create Indexes for Performance
        print("Creating indexes...")
        
        indexes = [
            ("idx_user_profiles_email", "CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email)"),
            ("idx_courses_instructor", "CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id)"),
            ("idx_course_posts_course", "CREATE INDEX IF NOT EXISTS idx_course_posts_course ON course_posts(course_id)"),
            ("idx_enrollments_user", "CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id)"),
            ("idx_enrollments_course", "CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id)"),
            ("idx_revenue_instructor", "CREATE INDEX IF NOT EXISTS idx_revenue_instructor ON instructor_revenue(instructor_id)"),
            ("idx_revenue_course", "CREATE INDEX IF NOT EXISTS idx_revenue_course ON instructor_revenue(course_id)"),
            ("idx_analytics_event_type", "CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)"),
            ("idx_analytics_timestamp", "CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp)"),
            ("idx_consents_user", "CREATE INDEX IF NOT EXISTS idx_consents_user ON casting_user_consents(user_id)"),
        ]
        
        for index_name, index_sql in indexes:
            cursor.execute(index_sql)
        
        print(f"✅ Created {len(indexes)} indexes\n")
        
        conn.commit()
        print("✨ Migration completed successfully!")
        print("\n📊 NEW TABLES CREATED:")
        print("  1. ✅ user_profiles")
        print("  2. ✅ courses")
        print("  3. ✅ course_posts")
        print("  4. ✅ course_enrollments")
        print("  5. ✅ instructor_revenue")
        print("  6. ✅ analytics_events")
        print("  7. ✅ casting_user_consents")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
