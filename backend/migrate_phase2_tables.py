"""
Migration: Create Additional Missing Tables - Phase 2
Adds: Payments, Notifications, Storyboards, Integrations, Settings, Reviews, Media, etc.
"""

import os
from virtual_studio_service import get_db_connection

def migrate():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔄 Creating Phase 2 missing tables...\n")
        
        # 1. Payment Methods Table
        print("Creating payment_methods table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_methods (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('stripe', 'paypal', 'bank', 'google_pay')),
                is_primary BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                stripe_customer_id VARCHAR(255),
                stripe_payment_method_id VARCHAR(255),
                paypal_email VARCHAR(255),
                bank_account_number VARCHAR(50),
                bank_account_name VARCHAR(255),
                bank_code VARCHAR(10),
                last_four VARCHAR(4),
                expiry_date DATE,
                billing_address JSONB,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ payment_methods created\n")
        
        # 2. Payment Transactions Table
        print("Creating payment_transactions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id VARCHAR(36) PRIMARY KEY,
                payment_method_id VARCHAR(36) REFERENCES payment_methods(id) ON DELETE SET NULL,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'subscription')),
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
                payment_gateway VARCHAR(50),
                gateway_transaction_id VARCHAR(255),
                receipt_url TEXT,
                failure_reason TEXT,
                metadata JSONB,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ payment_transactions created\n")
        
        # 3. Invoices Table
        print("Creating invoices table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(36) PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                transaction_id VARCHAR(36) REFERENCES payment_transactions(id) ON DELETE SET NULL,
                course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
                amount DECIMAL(15, 2) NOT NULL,
                tax_amount DECIMAL(15, 2) DEFAULT 0,
                total_amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
                invoice_date DATE NOT NULL,
                due_date DATE,
                paid_date DATE,
                pdf_url TEXT,
                notes TEXT,
                items JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ invoices created\n")
        
        # 4. Split Sheet Invoices Table
        print("Creating split_sheet_invoices table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS split_sheet_invoices (
                id VARCHAR(36) PRIMARY KEY,
                split_sheet_id VARCHAR(36) NOT NULL REFERENCES split_sheets(id) ON DELETE CASCADE,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                contributor_id VARCHAR(36),
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'NOK',
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
                invoice_date DATE NOT NULL,
                due_date DATE,
                paid_date DATE,
                recipient_email VARCHAR(255),
                pdf_url TEXT,
                fiken_invoice_id VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ split_sheet_invoices created\n")
        
        # 5. Payout Requests Table
        print("Creating payout_requests table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payout_requests (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
                payout_method VARCHAR(50),
                bank_account_id VARCHAR(36) REFERENCES payment_methods(id) ON DELETE SET NULL,
                stripe_payout_id VARCHAR(255),
                requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP WITH TIME ZONE,
                completed_at TIMESTAMP WITH TIME ZONE,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ payout_requests created\n")
        
        # 6. Payout History Table
        print("Creating payout_history table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payout_history (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                payout_request_id VARCHAR(36) REFERENCES payout_requests(id) ON DELETE SET NULL,
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) DEFAULT 'completed',
                payout_method VARCHAR(50),
                payout_date DATE,
                reference_number VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ payout_history created\n")
        
        # 7. Instructor Payment Settings Table
        print("Creating instructor_payment_settings table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS instructor_payment_settings (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
                stripe_connect_id VARCHAR(255),
                stripe_bank_account_id VARCHAR(255),
                bank_name VARCHAR(255),
                bank_account_number VARCHAR(50),
                bank_account_name VARCHAR(255),
                organization_number VARCHAR(50),
                tax_id VARCHAR(50),
                preferred_payout_method VARCHAR(50) DEFAULT 'stripe_connect',
                minimum_payout_threshold DECIMAL(15, 2) DEFAULT 50,
                auto_payout_enabled BOOLEAN DEFAULT FALSE,
                fiken_account_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ instructor_payment_settings created\n")
        
        # 8. Subscription Plans Table
        print("Creating subscription_plans table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                price_per_month DECIMAL(10, 2) NOT NULL,
                price_per_year DECIMAL(10, 2),
                currency VARCHAR(3) DEFAULT 'USD',
                features JSONB,
                max_courses INTEGER,
                max_students INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                stripe_product_id VARCHAR(255),
                stripe_price_id_monthly VARCHAR(255),
                stripe_price_id_yearly VARCHAR(255),
                display_order INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ subscription_plans created\n")
        
        # 9. User Subscriptions Table
        print("Creating user_subscriptions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                subscription_plan_id VARCHAR(36) NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
                billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                current_period_start DATE,
                current_period_end DATE,
                renewal_date DATE,
                cancelled_at TIMESTAMP WITH TIME ZONE,
                cancellation_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ user_subscriptions created\n")
        
        # 10. Notifications Table
        print("Creating notifications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                notification_type VARCHAR(100),
                related_entity_type VARCHAR(50),
                related_entity_id VARCHAR(36),
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP WITH TIME ZONE,
                action_url TEXT,
                priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE
            )
        """)
        print("✅ notifications created\n")
        
        # 11. Messages Table
        print("Creating messages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(36) PRIMARY KEY,
                sender_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                recipient_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                subject VARCHAR(255),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP WITH TIME ZONE,
                message_thread_id VARCHAR(36),
                attachments JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ messages created\n")
        
        # 12. Storyboards Table
        print("Creating storyboards table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS storyboards (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                project_id VARCHAR(36),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
                thumbnail_url TEXT,
                frame_count INTEGER DEFAULT 0,
                total_duration_seconds INTEGER,
                storyboard_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ storyboards created\n")
        
        # 13. Storyboard Frames Table
        print("Creating storyboard_frames table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS storyboard_frames (
                id VARCHAR(36) PRIMARY KEY,
                storyboard_id VARCHAR(36) NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
                frame_number INTEGER NOT NULL,
                title VARCHAR(255),
                description TEXT,
                image_url TEXT,
                duration_seconds INTEGER,
                camera_notes TEXT,
                audio_notes TEXT,
                props_list JSONB,
                talent_list JSONB,
                frame_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ storyboard_frames created\n")
        
        # 14. Fiken Integrations Table
        print("Creating fiken_integrations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fiken_integrations (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
                fiken_api_key VARCHAR(500),
                fiken_user_uuid VARCHAR(255),
                fiken_company_id VARCHAR(255),
                is_connected BOOLEAN DEFAULT FALSE,
                auto_sync_invoices BOOLEAN DEFAULT FALSE,
                sync_frequency VARCHAR(20),
                last_synced_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ fiken_integrations created\n")
        
        # 15. Stripe Accounts Table
        print("Creating stripe_accounts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stripe_accounts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
                stripe_account_id VARCHAR(255) UNIQUE,
                stripe_customer_id VARCHAR(255),
                is_connected BOOLEAN DEFAULT FALSE,
                charges_enabled BOOLEAN DEFAULT FALSE,
                payouts_enabled BOOLEAN DEFAULT FALSE,
                verification_status VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ stripe_accounts created\n")
        
        # 16. User Settings Table
        print("Creating user_settings table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
                theme VARCHAR(20) DEFAULT 'light',
                language VARCHAR(10) DEFAULT 'en',
                timezone VARCHAR(100) DEFAULT 'UTC',
                email_notifications_enabled BOOLEAN DEFAULT TRUE,
                marketing_emails_enabled BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_method VARCHAR(50),
                privacy_level VARCHAR(50) DEFAULT 'private',
                show_profile BOOLEAN DEFAULT FALSE,
                notifications_enabled BOOLEAN DEFAULT TRUE,
                push_notifications_enabled BOOLEAN DEFAULT TRUE,
                preferences JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ user_settings created\n")
        
        # 17. Instructor Plans Table
        print("Creating instructor_plans table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS instructor_plans (
                id VARCHAR(36) PRIMARY KEY,
                instructor_id VARCHAR(36) NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
                plan_name VARCHAR(100),
                plan_tier VARCHAR(50) DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'enterprise')),
                max_courses_allowed INTEGER,
                max_students_allowed INTEGER,
                max_storage_gb INTEGER,
                revenue_share_percentage DECIMAL(5, 2),
                features JSONB,
                active_since TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ instructor_plans created\n")
        
        # 18. Course Ratings Table
        print("Creating course_ratings table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_ratings (
                id VARCHAR(36) PRIMARY KEY,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                rating_value DECIMAL(3, 2) NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
                title VARCHAR(255),
                comment TEXT,
                is_verified_purchase BOOLEAN DEFAULT FALSE,
                helpful_count INTEGER DEFAULT 0,
                unhelpful_count INTEGER DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(course_id, user_id)
            )
        """)
        print("✅ course_ratings created\n")
        
        # 19. Course Reviews Table
        print("Creating course_reviews table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_reviews (
                id VARCHAR(36) PRIMARY KEY,
                course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                reviewer_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                review_type VARCHAR(50) CHECK (review_type IN ('content', 'instructor', 'pacing', 'value')),
                comment TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                moderation_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ course_reviews created\n")
        
        # 20. Course Comments Table
        print("Creating course_comments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_comments (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL REFERENCES course_posts(id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                parent_comment_id VARCHAR(36) REFERENCES course_comments(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('published', 'pending_moderation', 'rejected')),
                like_count INTEGER DEFAULT 0,
                helpful_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ course_comments created\n")
        
        # 21. Media Files Table
        print("Creating media_files table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS media_files (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
                post_id VARCHAR(36) REFERENCES course_posts(id) ON DELETE SET NULL,
                file_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_size BIGINT,
                file_url TEXT NOT NULL,
                thumbnail_url TEXT,
                duration_seconds INTEGER,
                width INTEGER,
                height INTEGER,
                media_type VARCHAR(50) CHECK (media_type IN ('video', 'image', 'audio', 'document', 'other')),
                storage_provider VARCHAR(50),
                storage_key VARCHAR(500),
                is_public BOOLEAN DEFAULT FALSE,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ media_files created\n")
        
        # Create Indexes
        print("Creating indexes...")
        
        indexes = [
            ("idx_payment_methods_user", "CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)"),
            ("idx_payment_trans_user", "CREATE INDEX IF NOT EXISTS idx_payment_trans_user ON payment_transactions(user_id)"),
            ("idx_payment_trans_status", "CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON payment_transactions(status)"),
            ("idx_invoices_user", "CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)"),
            ("idx_split_invoices_sheet", "CREATE INDEX IF NOT EXISTS idx_split_invoices_sheet ON split_sheet_invoices(split_sheet_id)"),
            ("idx_payout_requests_user", "CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON payout_requests(instructor_id)"),
            ("idx_payout_requests_status", "CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status)"),
            ("idx_notifications_user", "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)"),
            ("idx_notifications_read", "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)"),
            ("idx_messages_recipient", "CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)"),
            ("idx_storyboards_user", "CREATE INDEX IF NOT EXISTS idx_storyboards_user ON storyboards(user_id)"),
            ("idx_storyboard_frames_board", "CREATE INDEX IF NOT EXISTS idx_storyboard_frames_board ON storyboard_frames(storyboard_id)"),
            ("idx_course_ratings_course", "CREATE INDEX IF NOT EXISTS idx_course_ratings_course ON course_ratings(course_id)"),
            ("idx_course_comments_post", "CREATE INDEX IF NOT EXISTS idx_course_comments_post ON course_comments(post_id)"),
            ("idx_media_files_user", "CREATE INDEX IF NOT EXISTS idx_media_files_user ON media_files(user_id)"),
            ("idx_media_files_course", "CREATE INDEX IF NOT EXISTS idx_media_files_course ON media_files(course_id)"),
        ]
        
        for index_name, index_sql in indexes:
            cursor.execute(index_sql)
        
        print(f"✅ Created {len(indexes)} indexes\n")
        
        conn.commit()
        print("✨ Phase 2 Migration completed successfully!")
        print("\n📊 NEW TABLES CREATED:")
        print("  1. ✅ payment_methods")
        print("  2. ✅ payment_transactions")
        print("  3. ✅ invoices")
        print("  4. ✅ split_sheet_invoices")
        print("  5. ✅ payout_requests")
        print("  6. ✅ payout_history")
        print("  7. ✅ instructor_payment_settings")
        print("  8. ✅ subscription_plans")
        print("  9. ✅ user_subscriptions")
        print(" 10. ✅ notifications")
        print(" 11. ✅ messages")
        print(" 12. ✅ storyboards")
        print(" 13. ✅ storyboard_frames")
        print(" 14. ✅ fiken_integrations")
        print(" 15. ✅ stripe_accounts")
        print(" 16. ✅ user_settings")
        print(" 17. ✅ instructor_plans")
        print(" 18. ✅ course_ratings")
        print(" 19. ✅ course_reviews")
        print(" 20. ✅ course_comments")
        print(" 21. ✅ media_files")
        print("\n🎉 Total: 21 NEW TABLES + 16 INDEXES")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
