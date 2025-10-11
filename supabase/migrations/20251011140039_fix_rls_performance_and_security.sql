/*
  # Fix RLS Performance and Security Issues

  This migration addresses several security and performance issues:

  1. RLS Performance Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in all policies
    - This prevents re-evaluation of auth function for each row, improving query performance at scale

  2. Function Security
    - Add `SECURITY DEFINER` and set search_path for `update_updated_at_column` function
    - This prevents search_path manipulation attacks

  3. Index Optimization
    - Remove unused indexes that are not being utilized by queries
    - Keep the user_id index as it's needed for RLS policy filtering

  ## Changes Made:
  - Drop and recreate all RLS policies with optimized auth.uid() calls
  - Update function security settings
  - Remove unused created_at index (not currently used by application queries)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can insert own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can update own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can delete own itineraries" ON itineraries;

-- Recreate policies with optimized auth.uid() calls (wrapped in select)
CREATE POLICY "Users can view own itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own itineraries"
  ON itineraries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own itineraries"
  ON itineraries FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop unused index on created_at (not currently used by application queries)
DROP INDEX IF EXISTS idx_itineraries_created_at;

-- Update function with security definer and safe search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;