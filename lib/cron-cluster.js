
var _ = require('lodash')
var OriginCronJob = require('cron').CronJob
var Leader = require('redis-leader')

module.exports = function (redis) {
  var leader = new Leader(redis)

  return {
    CronJob: CronJob
  }

  function CronJob (cronTime, onTick) {
    if (typeof cronTime !== 'string' && arguments.length === 1) {
      onTick = cronTime.onTick
    }

    onTick = _.wrap(onTick, function (fn) {
      leader.isLeader(function (isLeader) {
        if (!isLeader) return
        fn()
      })
    })

    return new (OriginCronJob.bind.apply(OriginCronJob, arguments))
  }
}
