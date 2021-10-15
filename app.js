// Requires
const m_discord = require("discord.js");
const m_ytdl = require("ytdl-core");
const m_ytlist = require('youtube-playlist');
const m_lyricsFinder = require('lyrics-finder');
const m_fetch = require('node-fetch');

const { prefix, token, youtubeKey } = require('./config.json');

// Starts bot
const client = new m_discord.Client();
client.login(token);

// Log basic infos
client.once('ready', () => console.log("Bot ready."));
client.once('reconnecting', () => console.log("Bot reconnecting."));
client.once('disconnect', () => console.log("Bot disconnecting."));


let musicQueue = {
    playing: false,
    channel: undefined,
    connection: undefined,
    songs: [],
    volume: 5
    /* {
        playing: false,
        title: undefined,
        artist : undefined,
        link: undefined
    } */
};


// Handle music messages
client
    .on('message', async message => {
        // Message from the bot
        if (message.author.bot)
            return;

        let success = false;

        // Prints a ping notification
        if (message.content.startsWith(`${prefix}ping`)) {
            message.channel.send("Ping.");

            success = true;
        }

        // Help command
        else if (message.content.startsWith(`${prefix}help`)) {
            message.channel.send(`List of available commands :
   - **play** [*song*] : Add the song to the songs queue list.
   - **playtop** [*song*] : Add the song to the top of playlist.

   - **q** / **queue** / **ls** / **list** : List every song in the queue.
   - **np** : Display the current song playing status.
   - **lyrics** : Logs the current song lyrics.
   
   - **skip** : Skip the current song.
   - **remove** [*integer*] : Remove the nth song in the playlist.
   - **clear** : Clear the next songs in the playlist.
   
   - **join** : The bot will join the audio channel of the user who made the command.
   - **stop** : Stop the current music.
   - **leave** : The bot leave the channel.

   - **volume** [*integer*] : Change the volume level (*default 5*).
   - **ping** : Check the bot status.`);

            success = true;
        }


        // Play music on top of the pile
        else if (message.content.startsWith(`${prefix}playtop`)) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send("You need to be in a voice channel for me to play music.");

            // Join channel
            if (!musicQueue.channel) {
                musicQueue.channel = voiceChannel;
                musicQueue.connection = await voiceChannel.join();
                if (!musicQueue.connection)
                    return message.channel.send("I couldn't connect to your channel.");

                message.channel.send("Joined your channel.");
            }

            // Play song
            playSong(message.channel, message.content.split(' ')[1], true);

            success = true;
        }


        // Play music
        else if (message.content.startsWith(`${prefix}play`)) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send("You need to be in a voice channel for me to play music.");

            // Join channel
            if (!musicQueue.channel) {
                musicQueue.channel = voiceChannel;
                musicQueue.connection = await voiceChannel.join();
                if (!musicQueue.connection)
                    return message.channel.send("I couldn't connect to your channel.");

                message.channel.send("Joined your channel.");
            }

            // Play song
            playSong(message.channel, message.content.split(' ')[1], false);

            success = true;
        }


        // Skip current track
        else if (message.content.startsWith(`${prefix}skip`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("No song is currently playing.");

            // Skip to next song in array
            musicQueue.songs.shift();

            // Play first song
            playFirstSong();

            success = true;
        }


        // Clear next songs
        else if (message.content.startsWith(`${prefix}clear`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("There is no song in the playlist.");

            if (!musicQueue.songs[0].playing)
                musicQueue.songs = [];
            else {
                let s = musicQueue.songs[0];
                musicQueue.songs = [s];
            }

            message.channel.send("Songs cleared.");

            success = true;
        }


        // Force join the current channel
        else if (message.content.startsWith(`${prefix}join`)) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send("You need to be in a voice channel for me to play music.");

            musicQueue.channel = voiceChannel;
            musicQueue.connection = await voiceChannel.join();
            if (!musicQueue.connection)
                return message.channel.send("I couldn't connect to your channel.");

            message.channel.send("Joined your channel.");

            success = true;
        }


        // Remove the nth song
        else if (message.content.startsWith(`${prefix}remove`) || message.content.startsWith(`${prefix}rm`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("There is no song in the playlist.");

            if (!musicQueue.connection || !musicQueue.connection.dispatcher)
                return message.channel.send("No music is currently playing.");

            if (isNaN(message.content.split(' ')[1]) || parseInt(message.content.split(' ')[1]) < 2 || parseInt(message.content.split(' ')[1]) > musicQueue.songs.length)
                return message.channel.send("The track number you set is not a number, is lower than 2 (to remove the first track, use the skip command), or is greater than the number of tracks in the playlist.");

            musicQueue.songs.splice((parseInt(message.content.split(' ')[1] - 1)), 1);
            message.channel.send("Song removed.");

            success = true;
        }


        // List current track
        else if (message.content.startsWith(`${prefix}np`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("No song is currently playing.");

            // Print the current song
            message.channel.send(`Currently playing **${musicQueue.songs[0].title}** by *${musicQueue.songs[0].artist}*.`);
            message.channel.send(`${musicQueue.songs[0].link}`);

            success = true;
        }


        // List every next and current track
        else if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`) || message.content.startsWith(`${prefix}ls`) || message.content.startsWith(`${prefix}list`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("There is no song in the playlist.");

            // Print the current song
            let text = 'List of songs in the queue:';
            for (let i = 0; i < musicQueue.songs.length; i++) {
                text += `\n - #${i + 1}/${musicQueue.songs.length} - *${musicQueue.songs[i].title} by ${musicQueue.songs[i].artist}*`;
            }
            message.channel.send(text);

            success = true;
        }



        // Display the song lyrics
        else if (message.content.startsWith(`${prefix}lyrics`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("There is no song in the playlist.");
            
            let lyrics = await getLyrics(musicQueue.songs[0].artist, musicQueue.songs[0].title);
            message.channel.send(lyrics);

            success = true;
        }



        // Stop music
        else if (message.content.startsWith(`${prefix}stop`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to stop the music.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("There is currently no song playing.");

            musicQueue.songs = [];
            musicQueue.playing = false;
            musicQueue.connection.dispatcher.end();
            message.channel.send("I have successfully ended the music.");
            success = true;
        }


        // Leave channel
        else if (message.content.startsWith(`${prefix}leave`)) {
            let userVoiceChannel = message.member.voice.channel;
            if (!userVoiceChannel) {
                message.channel.send("You have to be in a voice channel to make the bot leave the music channel.");
            }

            let clientVoiceConnection = message.guild.voice;
            if (userVoiceChannel === clientVoiceConnection.channel) {
                clientVoiceConnection.channel.leave();
                message.channel.send("I have successfully left the voice channel.");
                musicQueue.playing = false;
            }
            else
                message.channel.send('You can only execute this command if you share the same voiceChannel as the client.');

            success = true;
        }



        // Change volume
        else if (message.content.startsWith(`${prefix}volume`)) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send("You need to be in a voice channel for me to play music.");

            if (!musicQueue.connection || !musicQueue.connection.dispatcher)
                return message.channel.send("No music is currently playing.");

            if (isNaN(message.content.split(' ')[1]) || parseInt(message.content.split(' ')[1]) < 1)
                return message.channel.send("The volume number you set is not a number, or is lower than 1.");

            message.channel.send(`Changed the volume to ${parseInt(message.content.split(' ')[1])} *(default 5)*.`);
            musicQueue.volume = parseInt(message.content.split(' ')[1]);
            musicQueue.connection.dispatcher.setVolumeLogarithmic(musicQueue.volume / 5);

            success = true;
        }


        // Error
        if (!success && message.content.startsWith(`${prefix}`)) {
            message.channel.send("Please enter a valid command.");
        }
    })
    .on("error", error => "An error occured : " + console.error(error))
;



/**
 * @param {The playlist URL} songInfo 
 * @return {The list of songs URLs in the playlist}
 */
async function findSongsInList(songInfo) {
    let playlistID = songInfo.match(/list=()\w+/)[0].substring(5).replace("&", '');
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistID}&key=${youtubeKey}&part=snippet&maxResults=50`;

    let settings = { method: "Get" };
    let res1 = await m_fetch(url, settings);
    let res = await res1.json();

    let songsInfo = [];
    for (let i = 0; i < res["items"].length; i++) {
        songsInfo.push("https://www.youtube.com/watch?v=" + res["items"][i].snippet.resourceId.videoId);
    }

    return songsInfo;
}


/**
 * Plays a song to a given bot channel
 * @param {The channel of the bot} channel 
 * @param {The informations given by the user of the song} songInfos
 * @param {Should play the song on the top of the others} playTop
 */
async function playSong(channel, songInfos, playTop) {
    musicQueue.channel = channel;

    // Search song
    let songs = await findSongsInList(songInfos);
    channel.send(`Adding ${songs.length} songs to the queue.`);
    
    for (let i = 0; i < songs.length; i++) {
        let found = true;
        const songInfo = await m_ytdl.getInfo(songs[i]).catch((error) => {
                channel.send(`Couldn't find your song.`);
                found = false;
            });
        if (!found)
            return;

        let song = songInfo.videoDetails.media.song || songInfo.videoDetails.title;
        let artist = songInfo.videoDetails.media.artist || '.';
        if (song == undefined)
            song = songInfo.videoDetails.title;


        // Add song to queue
        if (playTop && musicQueue.songs.length != 0) {
            let currentFirst = musicQueue.songs.shift();
            musicQueue.songs.unshift({
                playing: false,
                title: song,
                artist: artist,
                link: songInfo.videoDetails.video_url
            });
            musicQueue.songs.unshift(currentFirst);
            channel.send(`Added *${song} by ${artist}* on top of the queue.`);

        }
        else {
            musicQueue.songs.push({
                playing: false,
                title: song,
                artist: artist,
                link: songInfo.videoDetails.video_url
            });
            channel.send(`Added *${musicQueue.songs[musicQueue.songs.length - 1].title} by ${musicQueue.songs[musicQueue.songs.length - 1].artist}* to the queue (currently at position **${musicQueue.songs.length}** in queue).`);
        }

        // Play first song in queue if first song
        if (musicQueue.songs.length == 1)
            playFirstSong();
    }
}


/**
 * Plays the first song in the queue
 */
async function playFirstSong() {
    if (musicQueue.songs.length == 0)
        return;

    let videoStream = m_ytdl(musicQueue.songs[0].link);

    let error = false;
    const dispatcher = musicQueue.connection
        .play(videoStream)
        .on("finish", () => {
            if (!musicQueue.playing)
                return;

            // Skip to next song in array
            musicQueue.songs.shift();

            // Play first song
            playFirstSong();
        })
        .on("error", error => {
            musicQueue.channel.send(`Error while playing song *${musicQueue.songs[0].title}*.`);
            console.error(error);
            error = true;
        });

    if (error)
        return;

    dispatcher.setVolumeLogarithmic(musicQueue.volume / 5);
    musicQueue.channel.send(`Started playing **${musicQueue.songs[0].title}** by *${musicQueue.songs[0].artist}*.`);

    musicQueue.playing = true;
    musicQueue.songs[0].playing = true;
}


/**
 * Return the song lyrics
 * @param artist 
 * @param title 
 */
async function getLyrics(artist, title) {
    let lyrics = `Lyrics of **${title}** by *${artist}* :\n\n`;

    lyrics += await m_lyricsFinder(artist, title) || "Lyrics not found.";
    if (lyrics.length == 0)
        return "Lyrics not found.";
    return lyrics;
}

