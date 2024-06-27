// Initialize necessary variables and elements
const socket = io('/');
const videoContainer = document.getElementById('video-container');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');

// Function to add video streams to the video container
function addVideoStream(videoElement, stream) {
    videoElement.srcObject = stream;
    videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play();
    });
    videoContainer.appendChild(videoElement);
}

// Initialize PeerJS for peer-to-peer connections
const myPeer = new Peer(undefined, {
    host: '/',
    port: 8383, // Your PeerJS server port
});

let myStream; // Define myStream variable

// Get user's media stream (audio and video)
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    // Assign user's media stream to myStream variable
    myStream = stream;

    // Add user's own video stream to the video container
    const myVideo = document.createElement('video');
    myVideo.muted = true;
    addVideoStream(myVideo, stream);

    // Event listener for incoming calls from other peers
    myPeer.on('call', call => {
        call.answer(stream); // Answer the call with user's own stream
        const video = document.createElement('video');
        // Add the caller's video stream to the video container
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    // Function to connect to a new user
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});


toggleMicBtn.addEventListener('click', () => {
    console.log('Mic button clicked'); // Debugging statement
    const enabled = myStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myStream.getAudioTracks()[0].enabled = false;
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        myStream.getAudioTracks()[0].enabled = true;
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
});

// Event listener for user's video toggle button
toggleVideoBtn.addEventListener('click', () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myStream.getVideoTracks()[0].enabled = false;
        toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    } else {
        myStream.getVideoTracks()[0].enabled = true;
        toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
    }
});

// Function to connect to a new user
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream); // Call the new user with user's own stream
    const video = document.createElement('video');
    // Add the new user's video stream to the video container
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
}

// Event listener for user disconnection
socket.on('user-disconnected', userId => {
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.remove();
    }
});

