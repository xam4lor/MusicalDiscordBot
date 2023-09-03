import { AudioPlayer, createAudioPlayer, createAudioResource, NoSubscriberBehavior, PlayerSubscription, VoiceConnection } from '@discordjs/voice';
import { fileURLToPath } from 'url';
import path from "path";

/**
 * A class that handles playing music.
 */
class Player {
    private paused: boolean = false;
    private joined: boolean = false;
    private connecting: boolean = false;

    private player: AudioPlayer;
    private voiceConnection: VoiceConnection | null = null;
    private voiceSubscription: PlayerSubscription | null = null;

    /**
     * Create a new player.
     */
    constructor() {
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

        // Pause the player by default
        this.pause();
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

    /**
     * Unsubscribe the audio player from the audio stream and disconnect from the voice connection.
     */
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



    play() {
        // Play music @TODO Remove this
        const audioResourceName = 'poussin_piou.mp3';
        const audioResource = createAudioResource(
            path.join(path.dirname(fileURLToPath(import.meta.url)), '..\\..\\' + audioResourceName), {
            metadata: {
                title: 'Poussin Piou',
            },
        });

        // Catch stream errors
        audioResource.playStream.on('error', error => {
            console.error(`Error: ${error.message}.`);
            this.player.stop();
        });

        // Play music
        console.log('Starting to play new music.');
        this.player.play(audioResource);
    }

    /**
     * Pause the player.
     * @returns Whether the player was paused.
     */
    pause(): boolean {
        if (this.paused) {
            return false;
        }

        this.player.pause();
        this.paused = true;
        return true;
    }

    /**
     * Resume the player.
     * @returns Whether the player was resumed.
     */
    resume(): boolean {
        if (!this.paused) {
            return false;
        }

        this.player.unpause();
        this.paused = false;
        return true;
    }

    /**
     * Stop the player.
     */
    stop() {
        if (!this.joined) {
            this.player.stop();
            return;
        }

        // Stop playing music
        this.player.stop();
    }


    // Getters
    hasJoined(): boolean { return this.joined; }
    isPaused(): boolean { return this.paused; }
    isConnecting(): boolean { return this.connecting; }
    setConnecting(connecting: boolean) { this.connecting = connecting; }
}

// Create audio player
const player = new Player();
export default player;
