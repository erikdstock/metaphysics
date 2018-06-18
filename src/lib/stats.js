import os from "os"
import _ from "lodash"
import StatsD from "hot-shots"
import config from "config"
import { error } from "./loggers"

const { NODE_ENV, ENABLE_METRICS, STATSD_HOST, STATSD_PORT } = config

const isTest = NODE_ENV === "test"
const enableMetrics = ENABLE_METRICS === "true"
const appMetricsDisable = [
  "http",
  "http-outbound",
  "mongo",
  "socketio",
  "mqlight",
  "postgresql",
  "mqtt",
  "mysql",
  "redis",
  "riak",
  "memcached",
  "oracledb",
  "oracle",
  "strong-oracle",
]

export const statsClient = new StatsD({
  host: STATSD_HOST,
  port: STATSD_PORT,
  globalTags: { service: "metaphysics", hostname: os.hostname() },
  mock: isTest,
  errorHandler: function(err) {
    error(`Statsd client error ${err}`)
  },
})

if (enableMetrics && !isTest) {
  const appmetrics = require("appmetrics")
  appmetrics.configure({
    mqtt: "off",
  })
  const monitoring = appmetrics.monitor()
  _.forEach(appMetricsDisable, (val, idx) => {
    appmetrics.disable(val)
  })

  monitoring.on("loop", loopMetrics => {
    statsClient.timing("loop.count_per_five_seconds", loopMetrics.count)
    statsClient.timing("loop.minimum_loop_duration", loopMetrics.minimum)
    statsClient.timing("loop.maximum_loop_duration", loopMetrics.maximum)
    statsClient.timing("loop.cpu_usage_in_userland", loopMetrics.cpu_user)
    statsClient.timing("loop.cpu_usage_in_system", loopMetrics.cpu_system)
  })

  monitoring.on("eventloop", eventloopMetrics => {
    statsClient.timing("eventloop.latency.min", eventloopMetrics.latency.min)
    statsClient.timing("eventloop.latency.max", eventloopMetrics.latency.max)
    statsClient.timing("eventloop.latency.avg", eventloopMetrics.latency.avg)
  })
}
