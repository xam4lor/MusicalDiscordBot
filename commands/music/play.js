import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import path from "path";
import { fileURLToPath } from 'url';

const audioPlayer = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: Math.round(5000 / 20),
    },
});
audioPlayer.on('error', error => {
    console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
    audioPlayer.stop();
});

function playMusic(audioResource) {
    // Catch errors
    audioResource.playStream.on('error', error => {
        console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        audioPlayer.stop();
    });

    // Play music
    console.log('Starting to play new music');
    audioPlayer.play(audioResource);
}

const audioResourceName = 'poussin_piou.mp3';
playMusic(createAudioResource(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..\\..\\' + audioResourceName), {
    metadata: {
        title: 'Poussin Piou',
    },
}));


export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Join the user\'s audio channel.'),

    async execute(interaction) {
        // Connect to user's voice channel
        const channel = interaction.member.voice.channel;
        if (!channel)
            return await interaction.reply('You must be in a voice channel to play music.');

        // Join voice channel
        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
        });
        voiceConnection.rejoin(); // Force rejoin to fix audio issues

        // Play music
        await interaction.reply('Starting to play music.');

        // Handle voice connection state changes
        let firstStateChange = true;
        voiceConnection.on('stateChange', (_, newState) => {
            // Check if voice connection is ready
            if (newState.status != "ready") return;
            if (!voiceConnection) {
                console.error("Voice connection is null");
                return;
            }
            if (!firstStateChange) return;
            firstStateChange = false;

            // Subscribe to audio stream
            console.log("Subscribing to audio stream");
            voiceConnection.subscribe(audioPlayer);
        });
    },
};
