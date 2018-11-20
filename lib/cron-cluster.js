var wrap = require('lodash/wrap')

var OriginCronJob = require('cron').CronJob
var Leader = require('redis-leader')

var logger = require('debug')('cron-cluster')

module.exports = function (redis, leaderOptions) {
  var leader = new Leader(redis, leaderOptions)
  var running = 0

  return {
    CronJob: CronJob
  }

  function CronJob (cronSettings, onTick, onComplete, start, timeZone) {
    if (typeof cronSettings === 'string') {
      cronSettings = {cronTime: cronSettings}
    }
    if (onTick) {
      cronSettings.onTick = onTick
    }
    if (onComplete) {
      cronSettings.onComplete = onComplete
    }
    if (start) {
      cronSettings.start = start
    }
    if (timeZone) {
      cronSettings.timeZone = timeZone
    }
    this.started = false
    // Wrap `onTick` for checking if is leader
    cronSettings.onTick = wrap(cronSettings.onTick, function (fn) {
      logger('On tick')
      setTimeout(function () {
        leader.isLeader(function (err, isLeader) {
          if (err) return fn(err)
          logger('On tick: leader = %s', isLeader)
          if (!isLeader) return
          fn()
        })
      }, 50)
    })

    // Create real CronJob
    var job = new (OriginCronJob.bind([], cronSettings))
    // Wrap `stop` for stopping leader before
    job.stop = wrap(job.stop, function (stop) {
      if (!this.started) return
      stop.call(job)
      // Only stop leader if there is no more job started
      if (running === 1) leader.stop()
      running--
      this.started = false
    })
    // Wrap `start` for starting leader election only for the first starting job
    job.start = wrap(job.start, function (start) {
      if (!this.started) {
        this.started = true
        running++
        // Start leader election only if it is the first running job
        if (running === 1) leader.elect()
      }
      start.call(job)
    })

    return job
  }
}
