@echo off
echo Seeding database for Volleyball Team Manager App...
echo.

cd server
call npm run seed
cd ..

echo.
echo Database seeding completed!
pause