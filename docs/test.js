var apiKey = 'ce16d9aa-4119-4097-a8a5-3a5016c6a81c';
var token = Math.random().toString(36).substr(2);
var socket, pc, myId;
fetch(`https://skyway.io/${apiKey}/id?ts=${Date.now()}${Math.random()}`).then(res => res.text()).then(id => {
  myIdDisp.textContent = myId = id;
  socket = new WebSocket(`wss://skyway.io/peerjs?key=${apiKey}&id=${myId}&token=${token}`);
  socketSetup(socket);
  btnStart.style.display = '';
});

btnStart.onclick = evt => {
  pcSetup(callTo.value);
}

function socketSetup() {
  socket.onopen = function () {
    console.log('socket on open');
  }
  socket.onmessage = function (evt) {
    var msg = JSON.parse(evt.data);
    console.log('msg', JSON.stringify(msg));
    if (!pc && msg.src) {
      console.log('pcSetup', 'remoteId:' + msg.src, msg);
      pcSetup(msg.src);
    }
    if (msg.type === 'OFFER') {
      console.log('%cRecieve offer', 'color: red', msg.ofr);
      pc.setRemoteDescription(new RTCSessionDescription(msg.ofr))
        .then(_ => {
          console.log('%cCreate answer', 'color: red');
          return pc.createAnswer();
        })
        .then(answer => {
          console.log('%csetLocalDescription(answer)', 'color: red', answer);
          return pc.setLocalDescription(answer);
        })
        .then(_ => {
          console.log('%cSend answer', 'color: red', 'dst:' + pc.remoteId, pc.localDescription);
          socket.send(JSON.stringify({
            type: 'ANSWER',
            ans: pc.localDescription,
            dst: pc.remoteId
          }));
        })
        .catch(ex => {
          console.log('Recieve Offer error.', ex);
        });
    } else if (msg.type === 'ANSWER') {
      console.log('%cRecieve answer', msg.ans);
      pc.setRemoteDescription(new RTCSessionDescription(msg.ans))
        .catch(ex => {
          console.log('Recieve Answer error.', ex);
        });
    } else if (msg.type === 'CANDIDATE' && msg.cnd) {
      console.log('%cRecieve candidate', 'color: red', msg.cnd);
      pc.addIceCandidate(new RTCIceCandidate(msg.cnd))
        .catch(ex => {
          console.log('Recieve Candidate error.', ex);
        });
    } else if (msg.type === 'PING') {
      socket.send(JSON.stringify({ type: 'PONG' }));
    }
  }
}

function pcSetup(remoteId) {
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.skyway.io:3478' }] });
  pc.remoteId = remoteId;
  pc.onicecandidate = function (evt) {
    console.log('%cpc onicecandidate', 'background: #79b74a; font-weight: bold; padding: 1px;');
    socket.send(JSON.stringify({
      type: 'CANDIDATE',
      cnd: evt.candidate,
      dst: this.remoteId
    }));
  }
  pc.onnegotiationneeded = function (evt) {
    console.log('%cpc onnegotiationneeded', 'background: #5d76a7; color: white; font-weight: bold; padding: 1px;');
    pc.createOffer()
      .then(offer => {
        return pc.setLocalDescription(offer);
      })
      .then(_ => {
        socket.send(JSON.stringify({
          type: 'OFFER',
          ofr: pc.localDescription,
          dst: pc.remoteId
        }));
      });
  }
  if('onaddtrack' in pc) {
    pc.onaddtrack = function(evt) {
      if(!remoteView.srcObject) {
        console.log('%cpc onaddtrack', 'background: #ea4335, font-weight: bold; padding: 1px;');
        remoteView.srcObject = evt.stream;
      }
    }
  }
  pc.onaddstream = function (evt) {
    console.log('%cpc onaddstream', 'background: #ea4335, font-weight: bold; padding: 1px;');
    remoteView.srcObject = evt.stream;
  }
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  }).then(stream => {
    selfView.srcObject = stream;
    if ('addStream' in pc) {
      pc.addStream(stream);
    } else {
      stream.getTracks().forEach(track => pc.addTrack(track));
    }
  }).catch(ex => console.log('getUserMedia error.', ex));
}
