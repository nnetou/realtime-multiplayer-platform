-- database: database/database.sqlite
select id,
       name,
       email,
       email_verified_at,
       password,
       remember_token,
       created_at,
       updated_at,
       type,
       nickname,
       blocked,
       photo_avatar_filename,
       coins_balance,
       deleted_at,
       custom
  from users;

  SELECT COUNT(*) FROM users;
  