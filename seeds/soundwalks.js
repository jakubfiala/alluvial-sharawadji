
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('soundwalks').del()
    .then(function () {
      // Inserts seed entries
        return knex('soundwalks').insert([
            {
                name: "southbank",
                lat: 51.5058837,
                lng: -0.0888883,
                heading: 114.39,
                pitch: 2
            },

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
