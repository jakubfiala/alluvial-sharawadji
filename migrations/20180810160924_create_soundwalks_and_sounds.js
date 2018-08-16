
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('soundwalks', function(t) {
            t.string('name').notNull();
            t.float("lat").notNull();
            t.float("lng").notNull();
            t.float("heading").notNull();
            t.integer("pitch").notNull();
            t.unique(["name"]);

        }),
        knex.schema.createTable('sounds', function(t) {
            t.string("name").notNull();
            t.string("soundwalk_name").notNull();
            t.dateTime("timestamp").notNull();
            t.float("lat").notNull();
            t.float("lng").notNull();
            t.string("src").notNull();
            t.integer("db").notNull();
            t.boolean("loop").notNull();
            t.unique(["name"]);
            t.foreign('soundwalk_name').references('soundwalks.name').onDelete("NO ACTION");
            t.index(["soundwalk_name"]);
        })

    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('sounds'),
        knex.schema.dropTable('soundwalks')
    ]);
};
