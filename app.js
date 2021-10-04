// Requires
const m_discord = require("discord.js");
const m_ytdl    = require("ytdl-core");

const { prefix, token } = require('./config.json');

// Starts bot
const client = new m_discord.Client();
client.login(token);

// Log basic infos
client.once('ready',        () => console.log("Bot ready."));
client.once('reconnecting', () => console.log("Bot reconnecting."));
client.once('disconnect',   () => console.log("Bot disconnecting."));


let musicQueue = {
    playing : false,
    channel : undefined,
    connection : undefined,
    songs : [],
    volume : 5
    /* {
        playing: false,
        title: undefined,
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
   - **ping** : Check the bot status.
   - **play** [*song*] : Add the song to the playlist.
   - **skip** : Skip the current song.
   - **np** : Display the current song playing status.
   - **q** / **queue** / **ls** / **list** : List every song in the queue.
   - **clear** : Clear the next songs in the playlist.
   - **stop** : Stop the current music.
   - **volume** [integer] : Change the volume level (*default 5*)
   - **leave** : The bot leave the channel.`);

            success = true;
        }


        // Play music
        else if (message.content.startsWith(`${prefix}play`)) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send("You need to be in a voice channel for me to play music.");

            // Join channel
            if (!musicQueue.channel || voiceChannel.name != musicQueue.channel.name) {
                musicQueue.channel = voiceChannel;
                musicQueue.connection = await voiceChannel.join();
                if (!musicQueue.connection)
                    return message.channel.send("I couldn't connect to your channel.");

                message.channel.send("Joined your channel.");
            }

            // Play song
            playSong(message.channel, message.content.split(' ')[1]);

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


        // List current track
        else if (message.content.startsWith(`${prefix}np`)) {
            if (!message.member.voice.channel)
                return message.channel.send("You have to be in a voice channel to see the current track.");

            if (musicQueue.songs.length == 0)
                return message.channel.send("No song is currently playing.");
            
            // Print the current song
            message.channel.send(`Currently playing **${musicQueue.songs[0].title}**.`);
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
                text += `\n - #${i + 1}/${musicQueue.songs.length} - *${musicQueue.songs[i].title}*`;
            }
            message.channel.send(text);

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
            if (musicQueue.channel == undefined)
                return message.channel.send("I'm currently not in your channel.");

            musicQueue.songs = [];

            if (!musicQueue.connection || !musicQueue.connection.dispatcher)
                return message.channel.send("No music is currently playing.");

            musicQueue.playing = false;
            musicQueue.connection.dispatcher.end();
            musicQueue.channel.leave();
            message.channel.send("I have successfully left the voice channel.");

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
 * Plays a song to a given bot channel
 * @param {The channel of the bot} channel 
 * @param {The informations given by the user of the song} songInfos
 */
async function playSong(channel, songInfos) {
    musicQueue.channel = channel;

    // Search song
    let found = true;
    const songInfo = await m_ytdl.getInfo(songInfos).catch((error) => {
        channel.send(`Couldn't find your song.`);
        found = false;
    });
    if (!found)
        return;


    // Add song to queue
    musicQueue.songs.push({
        playing: false,
        title: songInfo.videoDetails.title,
        link: songInfo.videoDetails.video_url
    });
    channel.send(`Added *${musicQueue.songs[musicQueue.songs.length - 1].title}* to the queue (currently at position **${musicQueue.songs.length}** in queue).`);

    // Play first song in queue if first song
    if (musicQueue.songs.length == 1)
        playFirstSong();
}


/**
 * Plays the first song in the queue
 */
async function playFirstSong() {
    let videoStream = m_ytdl(musicQueue.songs[0].link);

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
        });

    dispatcher.setVolumeLogarithmic(musicQueue.volume / 5);
    musicQueue.channel.send(`Started playing **${musicQueue.songs[0].title}**.`);

    musicQueue.playing = true;
    musicQueue.songs[0].playing = true;
}

