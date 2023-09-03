import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join the user\'s audio channel.'),

    async execute(interaction: ChatInputCommandInteraction, verbose=true) {
        // Connect to user's voice channel
        if (!interaction.guild || !interaction.member) {
            console.error('Member or guild is null.');
            await interaction.reply('Member is null.');
            return;
        }
        const channel = interaction.guild.members.cache.get(interaction.member.user.id)?.voice.channel;
        if (!channel)
            return await interaction.reply('You must be in a voice channel to play music.');

        // Unsubscribe from previous voice connection
        player.unsubscribe();

        // Join voice channel
        await interaction.reply('Joining voice channel.');
        if (!interaction.guild) {
            console.error('Guild is null.');
            await interaction.editReply('Guild is null.');
            return;
        }
        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
        });
        voiceConnection.rejoin(); // Force rejoin to fix audio issues

        // Handle voice connection state changes
        let firstStateChange = true;
        let firstDisconnect = true;
        voiceConnection.on('stateChange', async (_, newState) => {
            // Disconnected
            if (newState.status == 'disconnected' || newState.status == 'destroyed') {
                if (!firstDisconnect) return;
                if (!player.hasJoined()) player.unsubscribe();
                if (!player.isPaused()) player.stop();
                firstDisconnect = false;
                return;
            }

            // Check if voice connection is ready
            if (newState.status != 'ready') return;
            if (!voiceConnection) {
                console.error('Voice connection is null.');
                await interaction.editReply('Voice connection is null.');
                return;
            }
            if (!firstStateChange) return;
            firstStateChange = false;

            // Subscribe to audio stream
            if (verbose) await interaction.editReply('Subscribing to audio stream.');
            player.subscribe(voiceConnection);
            if (verbose) await interaction.editReply('Connected to audio stream.');
        });
    },
};
