import { AudioResource, createAudioResource } from "@discordjs/voice";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import ytsr from "ytsr";

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
    async addTrack(query: string): Promise<QueueElement[]> {
        // Find url
        let url = ytdl.validateURL(query) ? query : '';
        if (url == '') {
            // Search for the first result
            const ysrResult = await ytsr(query, { limit: 10 })
                .catch((err) => { console.warn(err); return null; });
            if (!ysrResult) return [];
            const results: any = ysrResult.items.filter((item) => item.type == 'video');
            if (results.length == 0) return [];
            url = results[0].url;
        }

        // If it is a playlist, find the playlist index
        const newTracks: QueueElement[] = [];
        const playlistIndex = url.includes('list=') ? url.split('list=')[1].split('&')[0] : '';
        if (playlistIndex != '') {
            // Add all tracks of the playlist to the queue
            const playlist = await ytpl(playlistIndex, { limit: 50 });
            for (const item of playlist.items) {
                let found = true;
                const songInfo = await ytdl.getInfo(item.url)
                    .catch((err) => { console.warn(err); found = false; });
                if (!found || !songInfo)
                    continue;
                
                // Format url to remove playlist index
                item.url = item.url.split('&list=')[0];

                // Get song name and artist
                let songDetails: any = await ytsr(item.url, { limit: 1 });
                let title = songDetails.items[0].title;
                let artist = songDetails.items[0].author.name;

                // Add track to queue
                this.queue.push({
                    id: this.INDEX++,
                    query: item.url, info_raw: songInfo,
                    artist, title, url: item.url,
                });
                newTracks.push(this.queue[this.queue.length - 1]);
            }
        }
        else {
            // Just add the track to the queue

            // Search for track url
            let found = true;
            const songInfo = await ytdl.getInfo(url)
                .catch((err) => { console.warn(err); found = false; });
            if (!found || !songInfo)
                return [];

            // Get song name and artist
            let songDetails: any = await ytsr(url, { limit: 1 })
                .catch((err) => { console.warn(err); found = false; });
            console.log(songDetails);
            if (!found || !songDetails || songDetails.items.length == 0)
                return [];
            let title = songDetails.items[0].title;
            let artist = songDetails.items[0].author.name;

            // Add track to queue
            this.queue.push({
                id: this.INDEX++,
                query, info_raw: songInfo,
                artist, title, url,
            });
            newTracks.push(this.queue[this.queue.length - 1]);
        }

        
        return newTracks;
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
        const songName = this.formatElement(element);

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
    formatElement(element: QueueElement): string {
        if (element.artist == '') return `**${element.title}**`;
        return `**${element.title}** by *${element.artist}*`;
    }
}
