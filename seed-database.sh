#!/bin/bash

echo "Seeding database for Volleyball Team Manager App..."
echo

cd server
npm run seed
cd ..

echo
echo "Database seeding completed!"
read -p "Press Enter to continue..."