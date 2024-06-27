// Initialize necessary variables and elements
const socket = io('/');
const videoGrid = document.getElementById('video-container');
const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '8383'
});
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};
let myStream;

// Get display name from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const userName = urlParams.get('displayName') || '';

// Get user's media stream (audio and video)
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;

    // Initially turn off the video and audio
    myStream.getVideoTracks()[0].enabled = false;
    myStream.getAudioTracks()[0].enabled = false;

    addVideoStream(myVideo, stream);

    // Event listener for incoming calls from other peers
    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        // Add the caller's video stream to the video container
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    // Function to connect to a new user
    socket.on('user-connected', (userId, userName) => {
        connectToNewUser(userId, stream);
        addParticipant(userName); // This should trigger the addParticipant function
    });

    // Function to handle incoming chat messages
    socket.on('createMessage', (message, userName) => {
        addChatMessage(userName, message);
    });
});

// Event listener for user disconnection
socket.on('user-disconnected', (userId, userName) => {
    if (peers[userId]) peers[userId].close();
    removeParticipant(userName);
});

// Event listener for PeerJS connection open
myPeer.on('open', id => {
    const roomId = window.location.pathname.split('/').pop();
    socket.emit('join-room', roomId, id, displayName);
    console.log("hi, i have joined the video conferences");
    console.log(roomId, id, displayName);
    addParticipant(displayName);
});



// Function to connect to a new user
function connectToNewUser(userId, stream, userName) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    // Add the new user's video stream to the video container
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });
    peers[userId] = call;

    // Add participant to the participant list
    addParticipant(userName);
}

// Function to add video streams to the video container
function addVideoStream(videoElement, stream) {
    videoElement.srcObject = stream;
    videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play();
    });
    videoGrid.append(videoElement);
}

// Function to add a participant to the participant list
function addParticipant(userName) {
    console.log(userName); // Corrected from username to userName
    console.log(`participants triggered`);
    const participantList = document.getElementById('participant-list');
    const participant = document.createElement('li');
    participant.textContent = userName;
    participant.setAttribute('data-username', userName);
    participantList.appendChild(participant);
}


// Function to remove a participant from the participant list
function removeParticipant(userName) {
    const participantList = document.getElementById('participant-list');
    const participant = participantList.querySelector(`[data-username="${userName}"]`);
    if (participant) participant.remove();
}

// Function to add a chat message to the chat box
function addChatMessage(userName, message) {
    const chatBox = document.getElementById('chat-box');
    const chatMessage = document.createElement('div');
    chatMessage.textContent = `${userName}: ${message}`;
    chatBox.appendChild(chatMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Toggle video on/off
document.getElementById('toggle-video-btn').addEventListener('click', () => {
    const videoTrack = myStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    const icon = document.querySelector('#toggle-video-btn i');
    if (videoTrack.enabled) {
        icon.classList.remove('fa-video-slash');
        icon.classList.add('fa-video');
    } else {
        icon.classList.remove('fa-video');
        icon.classList.add('fa-video-slash');
    }
});

// Toggle audio on/off
document.getElementById('toggle-mic-btn').addEventListener('click', () => {
    const audioTrack = myStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    const icon = document.querySelector('#toggle-mic-btn i');
    if (audioTrack.enabled) {
        icon.classList.remove('fa-microphone-slash');
        icon.classList.add('fa-microphone');
    } else {
        icon.classList.remove('fa-microphone');
        icon.classList.add('fa-microphone-slash');
    }
});

// Handle sending chat messages
document.getElementById('chat-send-btn').addEventListener('click', () => {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value;
    if (message.trim()) {
        socket.emit('message', message, userName);
        chatInput.value = '';
        addChatMessage(userName, message);
    }
});

const chatBox = document.getElementById('chat-box');

// Create a MutationObserver instance
const observer = new MutationObserver(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Configure and start observing changes to the chat box
const config = { childList: true };
observer.observe(chatBox, config);

