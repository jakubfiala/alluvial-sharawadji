# Alluvial Sharawadji

Web application for 'Alluvial Sharawadji', a piece by [Tim Cowlishaw](https://github.com/timcowlishaw) and [Jakub Fiala](https://github.com/jakubfiala).

Consists of two parts:

- **/recorder** lets the user make a recording on their phone and automatically uploads it to an S3 store, saving the user's location as metadata with the recording
- **/viewer** plays back the soundwalk with audio spatialisation over an embedded Google Street View


## Setup

create an `.env` file in the app directory with your AWS credentials:

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
```

Then you can start the app locally by running `./local_start.sh`



