var test = require('tape')
var redis = require('redis')
var async = require('async')

var CronCluster = require('..')

var removeLeaderKeys = function (client, done) {
  client.keys('leader:*', function (err, keys) {
    if (err) return done(err)

    async.each(keys, client.del.bind(client), function (err) {
      if (err) return done(err)
      done()
    })
  })
}

test('Should execute only 1 CronJob', function (t) {
  t.plan(2)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob1 = CronCluster(client).CronJob
    var CronJob2 = CronCluster(client).CronJob
    var CronJob3 = CronCluster(client).CronJob

    var arrResults = []

    var job1 = new CronJob1('* * * * * *', function () {
      arrResults.push('job1')
    })
    var job2 = new CronJob2('* * * * * *', function () {
      arrResults.push('job2')
    })
    var job3 = new CronJob3('* * * * * *', function () {
      arrResults.push('job3')
    })

    job1.start()
    job2.start()
    job3.start()

    setTimeout(function () {
      job1.stop()
      job2.stop()
      job3.stop()
      t.equal(arrResults.length, 1)
      t.equal(arrResults[0], 'job1')
    }, 1500)
  })
})

test('Should execute 1 job and give the leader to another node', function (t) {
  t.plan(3)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob1 = CronCluster(client).CronJob
    var CronJob2 = CronCluster(client).CronJob

    var arrResults = []

    var job1 = new CronJob1('* * * * * *', function () {
      arrResults.push('job1')
      job1.stop()
    })
    var job2 = new CronJob2('* * * * * *', function () {
      arrResults.push('job2')
    })

    job1.start()
    job2.start()

    setTimeout(function () {
      job1.stop()
      job2.stop()
      t.equal(arrResults.length, 2)
      t.equal(arrResults[0], 'job1')
      t.equal(arrResults[1], 'job2')
    }, 2500)
  })
})
