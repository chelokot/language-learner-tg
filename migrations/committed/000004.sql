--! Previous: sha1:607991197138d06782261955770df968587d2704
--! Hash: sha1:f0a9e3a2454f959489de1b9a25b80fc91877f785

-- Enter migration here
alter table vocabulary add column if not exists level text null;
