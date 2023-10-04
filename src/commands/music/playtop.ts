import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';
import join from './join.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('playtop')
        .setDescription('Play or resume a music/playlist.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The music/playlist to play.')
                .setRequired(false)),

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

        // Play music
        const query = interaction.options.getString('query') ?? '';
        if (query !== '') {
            player.play(interaction, query, true);
        }
        else {
            await interaction.editReply('Resuming music.');
        }
    },
};
