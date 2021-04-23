const moment = require('moment-timezone')

require('moment-duration-format')

function getWeekDays () {
  const startOfWeek = moment().startOf('week')
  const endOfWeek = moment().endOf('week')
  let days = []
  let day = startOfWeek

  while (day <= endOfWeek) {
    days.push(day.toDate())
    day = day.clone().add(1, 'd')
  }

  return days
    .filter(date => ['0', '6'].indexOf(moment(date).format('e')) < 0)
    .map(date => moment(date).format('YYYY-MM-DD'))
}

function getWeekPunches (monthPunches, emptyPunches = false, onlyWorkDays = false) {
  const weekDays = getWeekDays()

  return monthPunches
    .filter(entry => {
      if (onlyWorkDays) {
        return weekDays.indexOf(entry.date) > -1 && !entry.holiday
      }

      if (emptyPunches) {
        return weekDays.indexOf(entry.date) > -1
      }

      return weekDays.indexOf(entry.date) > -1 && entry.punches
    })
}

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

function compute (content, workShift = 8) {
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes
  let timeWorkedInCurrentMonth

  workShift = workShift * 60

  dayPunches = getWeekPunches(content.monthPunches)
    .filter(({ date }) => date === moment().format('YYYY-MM-DD'))
    .map(({ punches }) => punches)[0]
  dayMinutes = getDayBalance(dayPunches)
  remainingOfTodayAsMinutes = workShift - dayMinutes < 0 ? 0 : workShift - dayMinutes
  timeWorkedInCurrentMonth = getTimeWorkedInCurrentMonth(content.monthPunches)

  content.statistics = {
    currentTime: moment().format('HH:mm:ss'),
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
    monthBalance: {
      completed: {
        asMinutes: timeWorkedInCurrentMonth,
        asShortTime: getStringTime(timeWorkedInCurrentMonth)
      }
    }
  }

  return content
}

module.exports = { compute, getWorkTime, getStringTime }
