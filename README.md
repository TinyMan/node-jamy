# Jamy

[![Greenkeeper badge](https://badges.greenkeeper.io/TinyMan/node-jamy.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/TinyMan/node-jamy.svg?branch=master)](https://travis-ci.org/TinyMan/node-jamy)
[![codecov](https://codecov.io/gh/TinyMan/node-jamy/branch/master/graph/badge.svg)](https://codecov.io/gh/TinyMan/node-jamy)
[![Dependency Status](https://david-dm.org/TinyMan/node-jamy.svg)](https://david-dm.org/TinyMan/node-jamy)
[![devDependencies](https://david-dm.org/TinyMan/node-jamy/dev-status.svg)](https://david-dm.org/TinyMan/node-jamy?type=dev)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/TinyMan/node-jamy/issues)
[![Code Climate](https://codeclimate.com/github/TinyMan/node-jamy/badges/gpa.svg)](https://codeclimate.com/github/TinyMan/node-jamy)
[![npm version](https://badge.fury.io/js/jamy.svg)](https://badge.fury.io/js/jamy)

Jamy is a streaming Audio player for Node.Js aiming to support MSE compatible sources

## Class: Jamy

**playbackOptions**: `PlaybackOptions` , Playback options for the transcoder

**seekable**: `boolean` , True if the stream is seekable

**stream**: `Stream.PassThrough` , The output stream

**currentTime**: `number` , The current time of the presentation, in seconds

**playing**: `boolean` , True if Jamy is playing something

### Jamy.play(infos) 

Plays a media

**Parameters**

**infos**: `MediaInfos`, Describes the media source


### Jamy.stop() 

Stops the playback and kill transcoder


### Jamy.resume() 

Resumes the playback


### Jamy.pause() 

Pauses the playback


### Jamy.seek(time) 

Seeks the given time in seconds
If the media is not seekable, does nothing but emit and error

**Parameters**

**time**: `number`, Timecode in seconds. If negative, timecode will be substracted from the end
