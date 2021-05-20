import { format, addMinutes, intervalToDuration } from 'date-fns'

function cloneObj (obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : null
}

export function getStringTime (minutes = 0, allowNegative = false) {
  let interval

  if (!allowNegative && minutes <= 0) {
    return '00:00'
  }

  interval = intervalToDuration(
    { start: 0, end: (minutes * 1000) * 60 }
  )

  interval.hours += interval.days * 24

  interval.hours = String(interval.hours).padStart(2, '0')
  interval.minutes = String(interval.minutes).padStart(2, '0')

  return `${interval.hours}:${interval.minutes}`
}

export function getTimeWorked (punches = []) {
  punches = cloneObj(punches)

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

export function getTimeWorkedInCurrentMonth (monthPunches = []) {
  return cloneObj(monthPunches).reduce((acc, entry) => {
    const { punches } = entry
    const workTime = getTimeWorked(punches)

    acc += workTime

    return acc
  }, 0)
}

export function getHourBank (monthPunches, workShift, includeToday = false) {
  const currentDayHavePunches = Boolean(
    monthPunches.find(e => e.date === format(new Date(), 'yyyy-MM-dd'))
  )
  let totals

  monthPunches = cloneObj(monthPunches)
  if (!includeToday && currentDayHavePunches) {
    monthPunches = monthPunches.slice(0, -1)
  }

  totals = monthPunches.reduce((acc, { punches }) => {
    acc.est = acc.est + workShift
    acc.worked = acc.worked + getTimeWorked(punches)

    return acc
  }, { est: 0, worked: 0 })

  return - (totals.est - totals.worked)
}

export function getDayClosureEstimate (minutesRemaining, hourBalance = 0) {
  const hourBankIsNeutral = minutesRemaining - hourBalance <= 0
  const estimate = addMinutes(new Date(), minutesRemaining - hourBalance)

  if (hourBankIsNeutral) return null

  return minutesRemaining > 0
    ? format(estimate, 'HH:mm')
    : null
}

export function compute (monthPunches = [], workShift = 8, hourBank = null) {
  let dayPunches
  let dayMinutes
  let remainingOfTodayAsMinutes
  let timeWorkedInCurrentMonth

  if (!monthPunches.length) {
    return null
  }

  monthPunches = cloneObj(monthPunches).filter(e => e.punches && e.punches.length > 0)
  workShift = workShift * 60
  dayPunches = monthPunches.find(e => e.date === format(new Date(), 'yyyy-MM-dd'))
  dayPunches = dayPunches ? dayPunches.punches : []
  dayMinutes = getTimeWorked(dayPunches)
  remainingOfTodayAsMinutes = workShift - dayMinutes < 0 ? 0 : workShift - dayMinutes
  timeWorkedInCurrentMonth = getTimeWorkedInCurrentMonth(monthPunches)
  hourBank = hourBank || getHourBank(monthPunches, workShift)

  return {
    currentTime: format(new Date(), 'HH:mm:ss'),
    serverTime: format(new Date(), 'HH:mm:ss'), // kept for compatibility
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
    weekBalance: { // kept for compatibility
      total: {
        asMinutes: 0,
        asShortTime: '00:00'
      },
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
        asShortTime: getStringTime(hourBank, true).replace('-', ''),
        isPositive: hourBank >= 0
      }
    }
  }
}
