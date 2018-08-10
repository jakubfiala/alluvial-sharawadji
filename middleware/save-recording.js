const AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const dbConfig = require("../knexfile.js")[process.env["NODE_ENV"]];
const knex = require("knex")(dbConfig);

const SOUND_URL_PREFIX = "https://s3-eu-west-1.amazonaws.com/ebre/";

const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

const Bucket = 'ebre';

const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId,
  secretAccessKey
});

const saveRecording = async (req, res) => {
  const Body = req.body;
  const id = uuid();
  const soundwalk = req.query.soundwalk;
  const Key = `${soundwalk}/${id}.mp3`;
    try {
        await new Promise(function(resolve, reject) {
            S3.upload({ Key, Body, Bucket, ACL: 'public-read', ContentType: 'audio/mpeg' }, (err, data) => {
                if (!err) {
                    resolve(data);
                } else {
                    reject(err);
                }
            });
        });
        await knex("sounds").insert({
            name: id,
            soundwalk_name: soundwalk,
            lat: req.query.lat,
            lng: req.query.lng,
            timestamp: ~~req.query.timestamp,
            src: SOUND_URL_PREFIX.concat(Key),
            db: 80,
            loop: true
        });
        res.send({status: "Ok", id: id});
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }




};

module.exports = saveRecording;
