import { format, addMinutes, intervalToDuration } from 'date-fns'

function getStringTime (minutes = 0, allowNegative = false) {
  let interval

  if (!allowNegative && minutes <= 0) {
    return '00:00'
  }

  interval = intervalToDuration(
    { start: 0, end: (minutes * 1000) * 60 }
  )

  interval.hours = String(interval.hours).padStart(2, '0')
  interval.minutes = String(interval.minutes).padStart(2, '0')

  return `${interval.hours}:${interval.minutes}`
}

function getTimeWorked (punches = []) {
  if (punches.length % 2 !== 0) {
    punches.push(format(new Date(), 'HH:mm'))
  }

  return punches.reduce((acc, punch, index, arr) => {
    const [ currHour, currMinute ] = punch.split(':')
    const [ prevHour, prevMinute ] = index > 0
      ? arr[index - 1].split(':')
      : [ 0 , 0 ]

    if (index % 2 !== 0) {
      const { hours, minutes } = intervalToDuration(
        {
          start: new Date(0, 0, 0, parseInt(prevHour), parseInt(prevMinute), 0),
          end: new Date(0, 0, 0, parseInt(currHour), parseInt(currMinute), 0)
        }
      )

      acc += hours * 60 + minutes
    }

    return acc
  }, 0)
}

function getTimeWorkedInCurrentMonth (monthPunches = []) {
  return monthPunches.reduce((acc, entry) => {
    const { punches } = entry
    const workTime = getTimeWorked(punches)

    acc += workTime

    return acc
  }, 0)
}

function getHourBank (monthPunches, workShift, includeToday = false) {
  let totals

  if (!includeToday) monthPunches = monthPunches.slice(0, -1)

  totals = monthPunches.reduce((acc, { punches }) => {
    acc.est = acc.est + workShift
    acc.worked = acc.worked + getTimeWorked(punches)

    return acc
  }, { est: 0, worked: 0 })

  return totals.est - totals.worked
}

function getDayClosureEstimate (minutesRemaining, hourBalance = 0) {
  const hourBankIsNeutral = minutesRemaining + hourBalance <= 0
  const estimate = addMinutes(new Date(), minutesRemaining + hourBalance)

  if (hourBankIsNeutral) return null

  return minutesRemaining > 0
    ? format(estimate, 'HH:mm')
    : null
}

export function compute (monthPunches = [], workShift = 8) {
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes
  let timeWorkedInCurrentMonth
  let hourBank

  if (!monthPunches.length) {
    return null
  }

  monthPunches = JSON.parse(JSON.stringify(monthPunches))
  workShift = workShift * 60
  dayPunches = monthPunches.find(e => e.date === format(new Date(), 'yyyy-MM-dd'))
  dayPunches = dayPunches ? dayPunches.punches : []
  dayMinutes = getTimeWorked(dayPunches)
  remainingOfTodayAsMinutes = workShift - dayMinutes < 0 ? 0 : workShift - dayMinutes
  timeWorkedInCurrentMonth = getTimeWorkedInCurrentMonth(monthPunches)
  hourBank = getHourBank(monthPunches, workShift)

  return {
    currentTime: format(new Date(), 'HH:mm:ss'),
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
        asMinutes: hourBank,
        asShortTime: getStringTime(-hourBank, true).replace('-', ''),
        isPositive: -hourBank >= 0
      }
    }
  }
}
