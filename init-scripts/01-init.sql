-- Initialize database with proper character set and collation
-- This script runs when the MySQL container starts for the first time

-- Set proper character set and collation for all databases
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create auction user if it doesn't exist (Docker creates the database automatically)
-- The MYSQL_USER and MYSQL_PASSWORD environment variables handle this
-- But we ensure the user has the right permissions

-- Create auction user first, then grant privileges
CREATE USER IF NOT EXISTS 'auction'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON *.* TO 'auction'@'%';
FLUSH PRIVILEGES;

-- Set session variables for better MySQL compatibility
SET sql_mode = '';
SET GLOBAL sql_mode = '';

-- Set timezone
SET time_zone = '+00:00';
