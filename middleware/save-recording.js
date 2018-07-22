const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

const SOUND_URL_PREFIX = "https://s3-eu-west-1.amazonaws.com/ebre/";

const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

const Bucket = 'ebre';

const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId,
  secretAccessKey
});

const saveRecording = (req, res) => {
  const Body = req.body;
  const id = uuid();
  const Key = `${req.query.soundwalk}/${id}.mp3`;

  console.log('Body:', Body);

  S3.upload({ Key, Body, Bucket, ACL: 'public-read', ContentType: 'audio/mpeg' }, (err, data) => {
    if (!err) {
      res.send('ok');
    } else {
      console.error(err);
      res.status(500).send(err);
    }
  });

  const dataKey = `${req.query.soundwalk}/sounds.json`;

  S3.getObject({ Bucket, Key: dataKey, ResponseContentType: 'application/json' }, (err, data) => {
    console.log(data.Metadata);

    const newSound = {
      name: id,
      lat: req.query.lat,
      lng: req.query.lng,
      timestamp: ~~req.query.timestamp,
      src: SOUND_URL_PREFIX.concat(Key),
      db: 80,
      loop: true
    };

    const soundData = JSON.parse(data.Body.toString());
    soundData.sounds.push(newSound);

    S3.upload({
      Key: dataKey,
      Body: JSON.stringify(soundData),
      Bucket,
      ACL: 'public-read',
      ContentType: 'application/json'
    }, (err, data) => {
      if (!err) console.log('new sound', newSound);
      else      console.error(err);
    });
  })
};

module.exports = saveRecording;
