--! Previous: sha1:f0a9e3a2454f959489de1b9a25b80fc91877f785
--! Hash: sha1:2340d6ba826a7dee9c378c93813cc2b8b3ae05ba

-- Enter migration here
-- Rename columns in word table for clarity
ALTER TABLE word RENAME COLUMN front TO goal;
ALTER TABLE word RENAME COLUMN back TO native;
