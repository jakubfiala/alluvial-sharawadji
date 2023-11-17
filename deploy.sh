#!/bin/bash
source .env
npm install
pm2 delete 'alluvial-sharawadji' || true
#knex migrate:latest
#knex seed:run
pm2 start npm --name 'alluvial-sharawadji' -- start
