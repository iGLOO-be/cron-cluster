# Cron-cluster
Ensure that a cron is launched only for a node app when it was clustered

## Install
```bash
npm install cron-cluster
```

## Usage
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
