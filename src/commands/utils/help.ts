import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { commands_list } from "../../bot.ts";

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all of my commands.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const commands = commands_list.filter(command => command.data.name !== 'help');
        const formatted_text = "List of commands:\n" + commands.map(command => {
            return "- **" + command.data.name + "**: " + command.data.description;
        }).join("\n");
        await interaction.reply(formatted_text);
    },
};
