import { AudioResource, createAudioResource } from "@discordjs/voice";
import ytdl from "ytdl-core";

type AudioOutput = {
    name: string;
    resource: AudioResource | null;
}
type QueueElement = {
    id: number;
    query: string;
    info_raw: ytdl.videoInfo;

    artist: string;
    title: string;
    url: string;
};

function filter(format: ytdl.videoFormat) {
    return format.codecs === 'opus' &&
        format.container === 'webm' &&
        parseInt(format.audioSampleRate ?? '') == 48000;
}

export class FluxHandler {
    private INDEX = 0;
    private queue: QueueElement[] = [];
    private current: QueueElement | null = null;

    constructor() {}

    /**
     * Add a track to the queue.
     * @param query The query to search for the track.
     * @returns The track that was added to the queue. Null if no track was added.
     */
    async addTrack(query: string): Promise<QueueElement | null> {
        // Search track
        let found = true;
        const songInfo = await ytdl.getInfo(query)
            .catch((err) => { console.warn(err); found = false; });
        if (!found || !songInfo)
            return null;

        // Get song name and artist
        let song = songInfo.videoDetails.media.song || songInfo.videoDetails.title;
        let artist = songInfo.videoDetails.media.artist || '';
        if (song == undefined)
            song = songInfo.videoDetails.title;
        if (artist == undefined)
            artist = songInfo.videoDetails.author.name;

        // Add track to queue
        this.queue.push({
            id: this.INDEX++,
            query: query,
            info_raw: songInfo,

            artist: artist,
            title: song,
            url: query,
        });
        return this.queue[this.queue.length - 1];
    }

    /**
     * Called when the player is ready to play the next resource.
     * @returns The next resource to play. Null if there is no resource to play.
     */
    requestNextResource(): AudioOutput {
        // Get and remove the first element of the queue
        const element = this.queue.shift();
        if (!element) return { name: '', resource: null };

        // Format the name of the song
        const songName = element.artist != '' ? element.title : element.artist + ' - ' + element.title;

        // Extract audio flux
        let options: ytdl.downloadOptions = {
            highWaterMark: 1 << 62,
            liveBuffer: 1 << 62,
            dlChunkSize: 0, //disabling chunking recommended
            quality: "lowestaudio",
        };
        if (element.info_raw.formats.find(filter) && parseInt(element.info_raw.videoDetails.lengthSeconds) != 0)
            options = { ...options, filter };
        else if (parseInt(element.info_raw.videoDetails.lengthSeconds) != 0)
            options = { ...options, filter: 'audioonly' };
        let readableStream = ytdl.downloadFromInfo(element.info_raw, options);

        // Create the audio resource
        const audioResource = createAudioResource(readableStream, { metadata: { title: songName } });
        audioResource.playStream.on('error', error => {
            console.error(`Error: ${error.message}.`);
        });

        // Return the audio resource
        this.current = element;
        return {
            name: songName,
            resource: audioResource,
        };
    }


    // Getters
    getQueue(): QueueElement[] { return this.queue; }
    getCurrent(): QueueElement | null { return this.current; }
    clear() {
        this.queue = [];
        this.current = null;
    }
}
