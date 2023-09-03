import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('List all of the current tracks in the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        player.queue(interaction);
    },
};
