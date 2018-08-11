
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('soundwalks').del()
    .then(function () {
      // Inserts seed entries
        return knex('soundwalks').insert([
            {

                name: "test",
                lat: 51.561327,
                lng: -0.076107,
                heading: 267.04,
                pitch: 12

            }
        ]);
    });
};
