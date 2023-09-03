import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../player/player.js';
import join from './join.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play or resume a music/playlist.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Make sure the player is not paused
        player.resume();

        // Check if player is in a voice channel
        if (!player.hasJoined()) {
            // Join voice channel
            await join.execute(interaction, false);
        }
        else {
            await interaction.reply('Starting playing music.');
        }
        if (!player.isConnecting()) return;

        // Play music
        console.log(interaction.options);
        player.play();
        await interaction.editReply('Playing music (TODO HEHEHEHHEHE).');
    },
};
