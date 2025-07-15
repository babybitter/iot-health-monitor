const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化时间为HH:mm格式，用于图表时间轴
const formatTimeHHMM = date => {
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${formatNumber(hour)}:${formatNumber(minute)}`
}

module.exports = {
  formatTime,
  formatTimeHHMM
}
