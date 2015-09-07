
var _ = require('lodash')

var OriginCronJob = require('cron').CronJob
var Leader = require('redis-leader')

module.exports = function (redis, leaderOptions) {
  var leader = new Leader(redis, leaderOptions)

  return {
    CronJob: CronJob
  }

  function CronJob (cronTime, onTick) {
    if (typeof cronTime !== 'string' && arguments.length === 1) {
      onTick = cronTime.onTick
    }

    // Wrap `onTick` for checking if is leader
    onTick = _.wrap(onTick, function (fn) {
      leader.elect()
      leader.isLeader(function (err, isLeader) {
        if (err) return fn(err)
        if (!isLeader) return
        fn()
      })
    })

    // Create real CronJob
    var args = _.toArray(arguments)
    args.unshift({})
    var job = new (Function.bind.apply(OriginCronJob, args))

    // Wrap `stop` for stopping leader before
    job.stop = _.wrap(job.stop, function (stop) {
      stop.call(job)
      leader.stop()
    })

    return job
  }
}
