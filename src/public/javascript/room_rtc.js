const APP_ID = "eea444e8bb484713ab5b48a8a2958482";

let uid = sessionStorage.getItem('uid');
if(!uid){
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem('uid', uid);
}

let token = null;
let client;

let rtmClient;
let channel;

//room.html?room=234
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if(!roomId){
    roomId = 'main';
}

let displayName = sessionStorage.getItem('display__name');
if(!displayName){
    window.location = `/event_lobby/${roomId}`;
}

//actual audio and video stream
let localTracks = [];

//other users track (audio & video)
let remoteUsers = {};

// for sharing screen purpose
let localScreenTracks;
let sharingScreen = false;

// for join a room
let joinRoomInit = async () => {
    rtmClient = await AgoraRTM.createInstance(APP_ID);
    await rtmClient.login({uid, token});

    await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName});

    channel = await rtmClient.createChannel(roomId);
    await channel.join();

    channel.on('MemberJoined', handleMemberJoined);
    channel.on('MemberLeft', handleMemberLeft);
    channel.on('ChannelMessage', handleChannelMessage);

    getMembers();
    addBotMessageToDom(`Welcome to the room ${displayName}! 👋`);
    
    client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'});
    await client.join(APP_ID, roomId, token, uid);

    // call handleUserPublished when user published
    client.on('user-published', handleUserPublished);

    // call handleUserLeft when user leave the room
    client.on('user-left', handleUserLeft);
}

// output a stream
let joinStream = async () => {
    document.getElementById('join-btn').style.display = 'none';
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex';

    // can delete the quality camera things.
    // localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {encoderConfig:{
    //     width:{min:640, ideal:1920, max:1920},
    //     height:{min:480, ideal:1080, max:1080}
    // }});

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;
    
    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

    localTracks[1].play(`user-${uid}`);

    // publish remote tracks
    await client.publish([localTracks[0], localTracks[1]]);
}

let switchToCamera = async () => {
    let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;
    
    //document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    displayFrame.insertAdjacentHTML('beforeend', player);

    // [0] is audio track, [1] is camera
    await localTracks[0].setMuted(true);
    await localTracks[1].setMuted(true);

    document.getElementById('mic-btn').classList.remove('active');
    document.getElementById('screen-btn').classList.remove('active');

    localTracks[1].play(`user-${uid}`);
    // republish video tracks
    await client.publish([localTracks[1]]);
}

// handle when new user join the room
let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;

    // subscribe to the user track
    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if(player === null){
        player = `<div class="video__container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                    </div>`;

        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
    }

    if(displayFrame.style.display){
        let videoFrame = document.getElementById(`user-container-${user.uid}`);
        player.style.height = '100px';
        player.style.width = '100px';
    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`);
    }

    if(mediaType === 'audio'){
        user.audioTrack.play();
    }
    
}

// handle when user left the room
let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    let item = document.getElementById(`user-container-${user.uid}`).remove();

    if(item){
        item.remove();
    }

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null;
        
        // if the user left is current on focus will be set back the video frame to 300px
        let videoFrames = document.getElementsByClassName('video__container');

        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '200px';
            videoFrames[i].style.width = '200px';
        }
    }
}

let toggleCamera = async (e) => {
    let button = e.currentTarget;

    if(localTracks[1].muted){
        await localTracks[1].setMuted(false);
        button.classList.add('active');
    }else{
        await localTracks[1].setMuted(true);
        button.classList.remove('active');
    }
}


let toggleMic = async (e) => {
    let button = e.currentTarget;

    if(localTracks[0].muted){
        await localTracks[0].setMuted(false);
        button.classList.add('active');
    }else{
        await localTracks[0].setMuted(true);
        button.classList.remove('active');
    }
}

let toggleScreen = async (e) => {
    let screenButton = e.currentTarget;
    let cameraButton = document.getElementById('camera-btn');

    if(!sharingScreen){
        sharingScreen = true;

        screenButton.classList.add('active');
        cameraButton.classList.remove('active');
        cameraButton.style.display = 'none';

        localScreenTracks = await AgoraRTC.createScreenVideoTrack();

        // remove current video track
        document.getElementById(`user-container-${uid}`).remove();

        displayFrame.style.display = 'block';

        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;

        displayFrame.insertAdjacentHTML('beforeend', player);

        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

        userIdInDisplayFrame = `user-container-${uid}`;

        localScreenTracks.play(`user-${uid}`);

        await client.unpublish([localTracks[1]]);
        await client.publish([localScreenTracks]);
        
        let videoFrames = document.getElementsByClassName('video__container');
        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '100px';
            videoFrames[i].style.width = '100px';
        }

    }else{
        sharingScreen = false;
        cameraButton.style.display = 'block';

        //remove screen container
        document.getElementById(`user-container-${uid}`).remove();
        await client.unpublish([localScreenTracks]);

        switchToCamera();
    }
}

let leaveStream = async (e) => {
    e.preventDefault;

    document.getElementById('join-btn').style.display = 'block';
    document.getElementsByClassName('stream__actions')[0].style.display = 'none';

    for(let i = 0; localTracks.length > i; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.unpublish([localTracks[0], localTracks[1]]);

    if(localScreenTracks){
        await client.unpublish([localScreenTracks]);
    }

    document.getElementById(`user-container-${uid}`).remove();

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null;

        for(let i = 0; videoFrames.length > i; i++){
            videoFrames[i].style.height = '200px';
            videoFrames[i].style.width = '200px';
        }
    }

    channel.sendMessage({text:JSON.stringify({'type':'user_left', 'uid':uid})});
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('screen-btn').addEventListener('click', toggleScreen);
document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveStream);

joinRoomInit();
