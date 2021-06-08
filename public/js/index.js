const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

$(() => {
  const FADE_TIME = 150;
  const TYPING_TIMER_LENGTH = 400;
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  const $window = $(window);
  const $usernameInput = $('.usernameInput'); // Input for username
  const $messages = $('.messages');           // Messages area
  const $inputMessage = $('.inputMessage');   // Input message input box

  const $loginPage = $('.login.page');        // The login page
  const $chatPage = $('.chat.page');          // The chatroom page

  const socket = io();

  // 유저이름 세팅하기
  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  const addParticipantsMessage = (data) => {
    let message = '';
    if (data.numUsers === 1) {
      message += '1명의 참가자가 있습니다.';
    } else {
      message += `${data.numUsers} 참가자`;
    }

    log(message);
  }

  // 클라이언트에 유저이름 보내기
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      socket.emit('add user', username);
    }
  }

  // 채팅 메세지 보내기
  const sendMessage = () => {
    let message = $inputMessage.val();

    message = cleanInput(message);

    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username, message });

      socket.emit('new message', message);
    }
  }

  // log a message
  const log = (message, options) => {
    const $el = $("<li>").addClass('log').text(message);
    addMessageElement($el, options);
  }

  // 메세지 리스트에 메세지 추가하여 보이기???
  const addChatMessage = (data, options = {}) => {
    const $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const $usernameDiv = $('<span class="username">')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const typingClass = data.typing?'typing':'';
    const $messagDiv = $('<li class="message">')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // 메세지 입력한 (시작화한) 추가
  const addChatTyping = (data) => {
    data.typing =true;
    data.message = '입력중..';
    addChatMessage(data);
  }

  // 시각화한 입력메세지 지우기
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(() => {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // 메세지 추가시 아래로 스크롤 됨
  // el - The element to add as a message
  // el - 메세지 추가 될 요소 (장소???)
  // options.fade - If the element should fade-in (default = true)
  // 감추는 옵션 - 기본값 - 나타나는 요소
  // options.prepend - If the element should prepend
  // 앞에 추가하는 옵션 =
  //   all other messages (default = false)
  // 다른 모든 메세지 기본값 false - > 감추다????
  const addMessageElement = (el, options) => {
    const $el = $(el);

    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }

    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // 마크업? 사용 못하게 방지 입력이
  const cleanInput = (input) => {
    return $('<div>').text(input).html();
  }

  // 입력 이벤트 업데이트
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }

      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  const getTypingMessages = (data) => {
    return $('.typing.message').filter((i) => {
      return $(this).data('username') === data.username;
    });
  }

  const getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }

    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // 키보드 이벤트들 ....
  $window.keydown(event => {
    // 키 입력시 현재 입력에 자동포커스
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // 엔터키 눌럿을때
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('입력 완료!');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // 클릭 이벤트들...
  // 로그인페이지에서 어디든 클릭했을때 입력에 포커스 가기
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // 메세지 입력창 클릭했을때 입력 포커스 가기
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // 소켓 이벤트들...
  // 로그인 서버 보낼때마다. 로그인 메세지 로그 기록
  socket.on('login', (data) => {
    connected = true;
    // 월컴 메세지 화면에 나오기
    const message = '소켓.io 채팅에 오신것을 환영합니다.';
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // 새로운 메세지가 서버에 보낼때마다 채팅창에 업데이트 되기
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  // 유저가 들어올때마다 서버에 보내기 , 채팅창에 로그 기록을
  socket.on('user joined', (data) => {
    log(`${data.username} joined`);
    addParticipantsMessage(data);
  });

  // 유저가 나갈때마다 서버에 보내기, 채팅창에 로그기록
  socket.on('user left', (data) => {
    log(`${data.username} left`);
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // 입력을 할때마다 메세지 입력을 보여주기
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // 입력완료! 할때마다 입력 메세지 종료 하기
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

});
