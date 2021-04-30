const moment = require('moment-timezone')

require('moment-duration-format')

function getWorkTime (punches = [], live = true) {
  const momentPunches = punches.map(punch => {
    const [ hour, minute ] = punch.split(':')
    const timeObject = {
      hours: parseInt(hour),
      minutes: parseInt(minute)
    }

    return moment.duration(timeObject).asMinutes()
  })
  const workMinutes = momentPunches.reduce((acc, punch, index) => {
    let currentMinutes = moment.duration(moment().format('HH:mm')).asMinutes()

    if (index % 2 !== 0) {
      acc += momentPunches[index] - momentPunches[index - 1]
    } else {
      if (index === momentPunches.length - 1 && live) {
        acc += currentMinutes - momentPunches[index]
      }
    }

    return acc
  }, 0)

  return moment.duration({ minutes: workMinutes }).asMinutes()
}

function getStringTime (minutes = 0, allowNegative = false) {
  if (!allowNegative && minutes <= 0) {
    return '00:00'
  }

  return moment.duration({ minutes }).format('HH:mm', { trim: false })
}

function getWeekMinutes (weekPunches = [], live = true) {
  const weekMinutes = weekPunches
    .map(entry => getWorkTime(entry, live))
    .reduce((a, b) => a + b, 0)

  return weekMinutes < 0 ? 0 : weekMinutes
}

function getDayBalance (dayPunches = [], live = true) {
  return getWeekMinutes([dayPunches], live)
}

function getTimeWorkedInCurrentMonth (monthPunches = []) {
  return monthPunches.reduce((acc, entry) => {
    const { punches } = entry
    const workTime = getWorkTime(punches)

    acc += workTime

    return acc
  }, 0)
}

function getHourBank (monthPunches, workShift, includeToday = false) {
  let totals

  if (!includeToday) monthPunches = monthPunches.slice(0, -1)

  totals = monthPunches.reduce((acc, { punches }) => {
    acc.est = acc.est + workShift
    acc.worked = acc.worked + getWorkTime(punches)

    return acc
  }, { est: 0, worked: 0 })

  return totals.est - totals.worked
}

function getDayClosureEstimate (minutesRemaining, hourBalance = 0) {
  const hourBankIsNeutral = minutesRemaining + hourBalance <= 0
  const estimate = moment()
    .add(minutesRemaining + hourBalance, 'minutes')

  if (hourBankIsNeutral) return null

  return minutesRemaining > 0
    ? estimate.format('HH:mm')
    : null
}

function compute (content, workShift = 8) {
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes
  let timeWorkedInCurrentMonth
  let hourBank

  if (!content) {
    return null
  }

  workShift = workShift * 60

  dayPunches = content.monthPunches.find(e => e.date === moment().format('YYYY-MM-DD'))
  dayPunches = dayPunches ? dayPunches.punches : []
  dayMinutes = getDayBalance(dayPunches)
  remainingOfTodayAsMinutes = workShift - dayMinutes < 0 ? 0 : workShift - dayMinutes
  timeWorkedInCurrentMonth = getTimeWorkedInCurrentMonth(content.monthPunches)
  hourBank = getHourBank(content.monthPunches, workShift)

  content.statistics = {
    currentTime: moment().format('HH:mm:ss'),
    dayClosureEstimate: {
      workShiftBased: getDayClosureEstimate(remainingOfTodayAsMinutes),
      hourBankBased: getDayClosureEstimate(remainingOfTodayAsMinutes, hourBank)
    },
    dayBalance: {
      completed: {
        asMinutes: dayMinutes,
        asShortTime: getStringTime(dayMinutes)
      },
      remaining: {
        asMinutes: remainingOfTodayAsMinutes,
        asShortTime: getStringTime(remainingOfTodayAsMinutes)
      },
      extra: {
        asMinutes: dayMinutes > workShift ? dayMinutes - workShift : 0,
        asShortTime: dayMinutes > workShift ? getStringTime(dayMinutes - workShift) : '00:00'
      }
    },
    weekBalance: {
      completed: {
        asMinutes: 0,
        asShortTime: '00:00'
      },
      remaining: {
        asMinutes: 0,
        asShortTime: '00:00'
      }
    },
    monthBalance: {
      completed: {
        asMinutes: timeWorkedInCurrentMonth,
        asShortTime: getStringTime(timeWorkedInCurrentMonth)
      },
      extra: {
        asMinutes: -hourBank,
        asShortTime: getStringTime(-hourBank, true).replace('-', ''),
        isPositive: -hourBank >= 0
      }
    }
  }

  return content
}

module.exports = { compute, getWorkTime, getStringTime }
