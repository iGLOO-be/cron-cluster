
var wrap = require('lodash.wrap')
var toArray = require('lodash.toarray')

var OriginCronJob = require('cron').CronJob
var Leader = require('redis-leader')

var logger = require('debug')('cron-cluster')

module.exports = function (redis, leaderOptions) {
  var leader = new Leader(redis, leaderOptions)
  var running = 0

  return {
    CronJob: CronJob
  }

  function CronJob (cronTime, onTick) {
    if (typeof cronTime !== 'string' && arguments.length === 1) {
      onTick = cronTime.onTick
    }
    this.started = false
    // Wrap `onTick` for checking if is leader
    onTick = wrap(onTick, function (fn) {
      logger('On tick')
      leader.isLeader(function (err, isLeader) {
        if (err) return fn(err)
        logger('On tick: leader = %s', isLeader)
        if (!isLeader) return
        fn()
      })
    })

    // Create real CronJob
    var args = toArray(arguments)
    args.unshift({})
    var job = new (Function.bind.apply(OriginCronJob, args))
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
