-- ============================================================================
-- Daktar Serial — Database Migration 010: Supported MFS Payment Methods
-- Expands payments.method ENUM to include 'rocket' and 'upay' safely
-- ============================================================================

-- Check and modify payments.method column to support all Paymently MFS methods
-- Safe and non-destructive for existing records.
ALTER TABLE payments 
MODIFY COLUMN method ENUM('cash_at_chamber', 'online_payment', 'bkash', 'nagad', 'rocket', 'upay', 'card') NOT NULL DEFAULT 'cash_at_chamber';
