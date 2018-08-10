
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

            }
        ]);
    });
};
