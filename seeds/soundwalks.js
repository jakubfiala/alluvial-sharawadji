
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
                name: "south-hackney",
                lat: 51.5348,
                lng: -0.0571874,
                heading: 0,
                pitch: 1
            },

            {
                name: "test",
                lat: 51.512764,
                lng: -0.2252838,
                heading: 252.16,
                pitch: 1
            },
            {
                name: 'white-city',
                lat: 51.512764,
                lng: -0.2252838,
                heading: 252.16,
                pitch: 1
            },
            {
                name: 'eufonic',
                lat: 40.6165052,
                lng: 0.5911836,
                heading: 120.15,
                pitch: 1
            },
            {
              name: 'barcelona',
              lat: 41.377476,
              lng: 2.1760804,
              heading: 223.66,
              pitch: 5
            }

        ]);
    });
};
