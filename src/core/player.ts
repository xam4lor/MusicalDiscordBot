import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior, PlayerSubscription, VoiceConnection } from '@discordjs/voice';
import { ChatInputCommandInteraction } from 'discord.js';
import { FluxHandler } from './flux_handler.ts';
import lyricsSearcher from 'lyrics-searcher';

/**
 * A class that handles playing music.
 */
class Player {
    private paused: boolean = false;
    private joined: boolean = false;

    private player: AudioPlayer;
    private fluxHandler: FluxHandler;
    private voiceConnection: VoiceConnection | null = null;
    private voiceSubscription: PlayerSubscription | null = null;


    /** Create a new player. */
    constructor() {
        // Create the flux handler
        this.fluxHandler = new FluxHandler();

        // Create the audio player
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
                maxMissedFrames: Math.round(5000 / 20),
            },
        });
        this.player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource}.`);
            this.player.stop();
        });
        this.player.on(AudioPlayerStatus.Idle, () => {
            const res = this.fluxHandler.requestNextResource();
            if (res.resource) this.player.play(res.resource);
        });

        // Pause the player by default
        this.pause();
    }


    /**
     * Play music in the voice channel.
     * @param interaction 
     * @param query Query to search for music.
     * @param top Whether to play the music at the top of the queue.
     */
    async play(interaction: ChatInputCommandInteraction, query: string, top: boolean = false) {
        // Add track to queue
        const track = await this.fluxHandler.addTrack(query, top);

        // If already playing, do nothing
        if (
            this.player.state.status == AudioPlayerStatus.Playing
            || this.player.state.status == AudioPlayerStatus.Buffering
        ) {
            if (track.length == 0) {
                await interaction.editReply('Failed to find music to add to queue.')
            }
            if (track.length == 1) {
                await interaction.editReply(`Added music ${this.fluxHandler.formatElement(track[0])} to queue.`);
            }
            else {
                await interaction.editReply(`Added ${track.length} musics to queue.`);

                let answerText = '';
                for (const element of track) {
                    const text = `- Added music ${this.fluxHandler.formatElement(element)} to queue.\n`;
                    if (answerText.length + text.length > 1800) {
                        answerText += `- ... ${this.fluxHandler.getQueue().length - 1} more tracks in queue.\n`;
                        break;
                    }
                    answerText += text;
                }
                if (answerText != '')
                    await interaction.editReply(answerText);
            }
            return;
        }
        
        // Play next resource
        const res = this.fluxHandler.requestNextResource();
        if (res.resource) {
            this.player.play(res.resource);
            await interaction.editReply(`Playing music ${res.name}.`);
        }
        else {
            await interaction.editReply(`Failed to play music *${query}*.`);
        }
    }


    /** List all of the current tracks in the queue. */
    async queue(interaction: ChatInputCommandInteraction) {
        if ((this.fluxHandler.getQueue().length + (this.fluxHandler.getCurrent() ? 1 : 0)) == 0)
            return await interaction.reply('No tracks in queue.');
        let message = 'Current tracks in queue:\n';

        const current = this.fluxHandler.getCurrent();
        if (current)
            message += `- Currently playing ${this.fluxHandler.formatElement(current)}.\n`;
        for (const element of this.fluxHandler.getQueue()) {
            const text = `- ${this.fluxHandler.formatElement(element)}.\n`;
            if (message.length + text.length > 1800) {
                message += `- ... ${this.fluxHandler.getQueue().length - 1} more tracks in queue.\n`;
                break;
            }
            message += text;
        }

        await interaction.reply(message);
    }
    /** Clear queue */
    clear() {
        this.fluxHandler.clear();
    }
    /** Skip the current song */
    skip(): boolean {
        if (this.player.state.status != AudioPlayerStatus.Playing) return false;

        // If no next song, stop the player
        if (this.fluxHandler.getQueue().length == 0) {
            this.player.stop();
            return true;
        }

        // Request next resource
        const res = this.fluxHandler.requestNextResource();
        if (res.resource) {
            this.player.play(res.resource);
            return true;
        }
        return false;
    }


    /**
     * Find the lyrics of a track by searching on google.
     */
    async lyrics(interaction: ChatInputCommandInteraction) {
        // Check if there is a current track
        const current = this.fluxHandler.getCurrent();
        if (!current)
            return await interaction.reply('No current track.');

        // Find name of the track
        const artist = current.artist != '' ? current.artist : ' ';
        const title = current.title != '' ? current.title : ' ';

        // Search for lyrics
        await interaction.reply(`Searching for lyrics of ${this.fluxHandler.formatElement(current)}...`);
        lyricsSearcher(artist, title)
            .then(async (lyrics) => {
                await interaction.editReply(`Lyrics of ${this.fluxHandler.formatElement(current)}:\n${lyrics}`);
            })
            .catch(async (error) => {
                await interaction.editReply(`Failed to find lyrics of ${this.fluxHandler.formatElement(current)}.`);
                console.warn(error);
            });
    }


    /**
     * Subscribe a voice connection to the audio player.
     * @param voiceConnection The voice connection to subscribe.
     * Note: This function should only be called once when the voice connection is ready.
     */
    subscribe(voiceConnection: VoiceConnection) {
        this.voiceConnection = voiceConnection;
        this.voiceSubscription = voiceConnection.subscribe(this.player) ?? null;
        this.voiceConnection.on('error', error => {
            console.error(`Error: ${error.message}.`);
            this.player.stop();
        });
        if (!this.voiceSubscription) {
            console.error('Failed to subscribe to audio stream.');
        }
        this.joined = true;
    }
    /** Unsubscribe the audio player from the audio stream and disconnect from the voice connection. */
    unsubscribe() {
        // Unsubscribe from audio stream
        if (this.voiceSubscription) {
            this.voiceSubscription.unsubscribe();
            this.voiceSubscription = null;
        }
        if (this.voiceConnection) {
            this.voiceConnection.disconnect();
            this.voiceConnection = null;
        }
        this.joined = false;
    }


    /**
     * Pause the player.
     * @returns Whether the player was paused.
     */
    pause(): boolean {
        if (this.paused) return false;
        this.player.pause();
        this.paused = true;
        return true;
    }
    /**
     * Resume the player.
     * @returns Whether the player was resumed.
     */
    resume(): boolean {
        if (!this.paused) return false;
        this.player.unpause();
        this.paused = false;
        return true;
    }
    /** Stop the player. */
    stop() {
        if (!this.joined) {
            this.player.stop();
            return;
        }
        this.player.stop();
    }

    // Getters
    hasJoined(): boolean { return this.joined; }
    isPaused(): boolean { return this.paused; }
}

// Create audio player
const player = new Player();
export default player;
