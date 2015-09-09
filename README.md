# Cron-cluster
[![Build Status](https://travis-ci.org/iGLOO-be/cron-cluster.svg?branch=master)](https://travis-ci.org/iGLOO-be/cron-cluster)

Cron cluster is designed to prevent a job which must be launched only once to be launched many times while
an app is scaling accross a cluster with the same task scripts.

Cron cluster is based on node-cron and redis-leader to prevent a cron job to be launched if
his process has not been elected as leader on redis.

## Requirement

Redis

## Install
```bash
npm install cron-cluster
```

## Usage

Cron cluster use the same API as the original CronJob.

```js
var redis = require('redis').createClient()
var CronJob = require('cron-cluster')(redis).CronJob

function doCron () {
  var job = new CronJob('* * * * * *', function () {
    // Do some stuff here
  })
  job.start()
}
```

All you need is to provide a redis client to the cron-cluster module.

## Example

Usage with Kue:

```js
var kue = require('kue'),
    queue = kue.createQueue()
var redis = require('redis').createClient()
var CronJob = require('cron-cluster')(redis).CronJob

new CronJob('* * * * * *', function () {
  queue.create('log', {
    text: 'this is a log'
  }).save()
}, null, true)

queue.process('log', function (job, done) {
  console.log(job.data.text)
  done()
})
```
