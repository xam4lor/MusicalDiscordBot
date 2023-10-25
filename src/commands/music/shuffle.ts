import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        player.shuffle(interaction);
    },
};