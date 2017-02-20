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

function wait (ms, fn) {
  setTimeout(fn, ms)
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

    var job1 = new CronJob1({
      cronTime: '* * * * * *',
      onTick: function () {
        arrResults.push('job1')
      }
    })
    var job2 = new CronJob2({
      cronTime: '* * * * * *',
      onTick: function () {
        arrResults.push('job2')
      }
    })
    var job3 = new CronJob3({
      cronTime: '* * * * * *',
      onTick: function () {
        arrResults.push('job3')
      }
    })

    job1.start()
    job2.start()
    job3.start()
    wait(1500, function () {
      job1.stop()
      job2.stop()
      job3.stop()

      t.equal(arrResults.length, 1, 'Array length must be 1')
      t.equal(arrResults[0], 'job1', 'First must be job1')
    })
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

    var job1 = new CronJob1({
      cronTime: '* * * * * *',
      onTick: function () {
        arrResults.push('job1')
      }
    })
    var job2 = new CronJob2({
      cronTime: '* * * * * *',
      onTick: function () {
        arrResults.push('job2')
      }
    })

    job1.start()
    wait(1500, function () {
      job1.stop()
      wait(1500, function () {
        job2.start()
        wait(1500, function () {
          job2.stop()
          wait(500, function () {
            t.equal(arrResults.length, 2, 'Array length should be 2')
            t.equal(arrResults[0], 'job1', 'First must be job1')
            t.equal(arrResults[1], 'job2', 'Second must be job2')
          })
        })
      })
    })
  })
})

test('Should execute multiple job only once', function (t) {
  t.plan(4)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob1 = CronCluster(client).CronJob
    var CronJob2 = CronCluster(client).CronJob

    var arrRes1 = []
    var arrRes2 = []

    var job1 = new CronJob1({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes1.push('job1')
      }
    })
    var job2 = new CronJob1({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes1.push('job2')
      }
    })
    var job3 = new CronJob2({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes2.push('job1')
      }
    })
    var job4 = new CronJob2({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes2.push('job2')
      }
    })

    job1.start()
    job2.start()
    wait(100, function () {
      job3.start()
      job4.start()
      wait(1400, function () {
        job1.stop()
        job2.stop()
        job3.stop()
        job4.stop()
        wait(1500, function () {
          t.equal(arrRes1.length, 2, 'Array1 must have 2 elements')
          t.equal(arrRes2.length, 0, 'Array2 must be empty')
          t.equal(arrRes1.indexOf('job1') >= 0, true, 'Array must contain job1')
          t.equal(arrRes1.indexOf('job2') >= 0, true, 'Array must contain job2')
        })
      })
    })
  })
})

test('Should not remove leader for other Cron when a CronJob is stopped', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      }
    })
    var job2 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job2')
      }
    })
    job1.start()
    job2.start()
    wait(1200, function () {
      job1.stop()
      wait(1200, function () {
        job2.stop()
        wait(1500, function () {
          t.equal(arrRes.length, 3, 'Array must have 3 elements')
        })
      })
    })
  })
})

test('Should not fail with a non running job', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      }
    })
    var job2 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job2')
      }
    })
    job2.start()
    console.log(job1)
    wait(1200, function () {
      wait(1200, function () {
        job2.stop()
        wait(1500, function () {
          t.equal(arrRes.length, 2, 'Array must have 2 elements')
        })
      })
    })
  })
})

test('Should not fail if stop called on a non running job', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      }
    })
    var job2 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job2')
      }
    })
    job2.start()
    job1.stop()
    wait(1200, function () {
      job2.stop()
      wait(1500, function () {
        t.equal(arrRes.length, 1, 'Array must have 1 elements')
      })
    })
  })
})

test('Should run job with CronJob base options', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      }
    }, null, null, false)
    var job2 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job2')
      }
    }, null, null, true)
    job1.stop()
    wait(1200, function () {
      job2.stop()
      wait(1500, function () {
        t.equal(arrRes.length, 1, 'Array must have 1 elements')
      })
    })
  })
})

test('Should not fail when a job is stopped and restarted', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      }
    })
    job1.start()
    wait(1200, function () {
      job1.stop()
      wait(1200, function () {
        job1.start()
        wait(1500, function () {
          job1.stop()
          wait(500, function () {
            t.equal(arrRes.length, 2, 'Array must have 2 elements')
          })
        })
      })
    })
  })
})

test('Should run job with CronJob base options', function (t) {
  t.plan(1)

  var client = redis.createClient()

  removeLeaderKeys(client, function (err) {
    if (err) throw err

    client.unref()

    var CronJob = CronCluster(client).CronJob

    var arrRes = []

    var job1 = new CronJob({
      cronTime: '* * * * * *',
      onTick: function () {
        arrRes.push('job1')
      },
      runOnInit: true
    })
    job1.start()
    wait(1300, function () {
      t.equal(arrRes.length, 2, 'Array must have 2 elements')
    })
  })
})
