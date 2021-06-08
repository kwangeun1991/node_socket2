const winston = require('winston');

module.exports = function(message, mode) {
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  month = (month < 10)?"0"+month:month;
  let day = date.getDate();
  day = (day < 10)?"0"+day:day;
  const dateStr = `${year}${month}${day}`;

  mode = mode || 'info';

  let hours = date.getHours();
  hours = (hours < 10)?"0"+hours:hours;
  let minutes = date.getMinutes();
  minutes = (minutes < 10)?"0"+minutes:minutes;
  let seconds = date.getSeconds();
  seconds = (seconds < 10)?"0"+seconds:seconds;
  const time = `${hours}:${minutes}:${seconds}`;
  message = `[${dateStr}][${time}]${message}`;

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'general' },
    transports: [
      new winston.transports.File({ filename: `logs/${dateStr}.log`}),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
    }));
  }

  logger.log(mode, message);
};
