-- Make company field optional for independent contractors
ALTER TABLE hirers ALTER COLUMN company DROP NOT NULL;
