/*
  # Create itineraries table for user data

  1. New Tables
    - `itineraries`
      - `id` (uuid, primary key) - Unique identifier for each itinerary
      - `user_id` (uuid, foreign key) - References auth.users table
      - `title` (text) - Trip title/name
      - `departure` (text) - Starting location
      - `destination` (text) - Ending location
      - `days` (integer) - Number of days for the trip
      - `budget` (numeric) - Trip budget
      - `interests` (text) - User's points of interest
      - `itinerary_data` (jsonb) - Complete itinerary JSON data
      - `created_at` (timestamptz) - When the itinerary was created
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `itineraries` table
    - Add policy for users to read their own itineraries
    - Add policy for users to insert their own itineraries
    - Add policy for users to update their own itineraries
    - Add policy for users to delete their own itineraries

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  departure text NOT NULL,
  destination text NOT NULL,
  days integer NOT NULL,
  budget numeric NOT NULL,
  interests text DEFAULT '',
  itinerary_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own itineraries"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own itineraries"
  ON itineraries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();