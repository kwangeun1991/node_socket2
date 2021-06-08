const express = require('express');
const app = express();
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const logger = require('./lib/logger');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

dotenv.config();

app.set('port', process.env.PORT || 3001);
app.set('view engine', 'html');
nunjucks.configure('views', {
  express : app,
  watch : true,
});

if (process.env.NODE_ENV == 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended:false }));

app.get('/', (req, res, next) => {
  res.render('index');
});

// chatroom
let numUsers = 0;

io.on('connection', (socket) => {
  let addedUser = false;

  //console.log('a user connected');

  socket.on('new message', (data) => {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  socket.on('add user', (username) => {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });

    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.in('typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', () => {
    //console.log('user disconnected');
    if (addedUser) {
      --numUsers;

    socket.broadcast.emit('user left', {
      username: socket.username,
      numUsers: numUsers
    });
    }
  });
});

// 없는 페이지 미들웨어
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url}은 없는 페이지 입니다.`);
  error.status = 404;
  next(error);
});

// 에러처리 미들웨어
app.use((err, req, res, next) => {
  err.status = err.status || 500;
  const message = `${err.status} ${err.message}`;
  logger(err.message, 'error');
  logger(err.stack, 'error');

  if (process.env.NODE_ENV == 'production') err.stack = {};

  res.locals.error = err;
  res.status(err.status).render('error');
  //res.json(err);
});

app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기중');
});
