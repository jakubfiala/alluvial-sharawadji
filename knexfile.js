// Update with your config settings.

module.exports = {

    development: {
        client: 'sqlite3',
        connection: {
            filename: './dev.sqlite3'
        },
        migrations: {
            tableName: "migrations"
        },
        seeds: {
            directory: "./seeds/"
        },
        useNullAsDefault: true
    },

    production: {
        client: 'pg',
        connection: {
            host: process.env["DB_HOST"],
            user: process.env["DB_USER"],
            password: process.env["DB_PASSWORD"],
            database: process.env["DB_NAME"]
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            tableName: "migrations"
        },
        seeds: {
            directory: "./seeds"
        }

    }

};
