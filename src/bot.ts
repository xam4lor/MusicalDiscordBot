import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import config from "../config.json" assert { type: "json" };

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Declare commands collection
const commands_list: Collection<string, any> = new Collection();
const foldersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const promises_commands: Promise<void>[] = [];
for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = "file://" + path.join(commandsPath, file).replace(/\\/g, '//');
        const promise = import(filePath)
            .then(command => command.default)
            .then(command => {
                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if ('data' in command && 'execute' in command) {
                    commands_list.set(command.data.name, command);
                }
                else {
                    console.warn(`The command at ${filePath} is missing a required "data" or "execute" property. It will not be loaded.`);
                }
            })
            .catch(err => console.warn(`Failed to load command at ${filePath}: ${err}`));
        promises_commands.push(promise);
    }
}
Promise.all(promises_commands).then(() => console.log(`Loaded ${commands_list.size} commands.`));

// Declare events collection
const eventsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'));
const promises_events: Promise<void>[] = [];
for (const file of eventFiles) {
    const filePath = "file://" + path.join(eventsPath, file).replace(/\\/g, '//');
    const promise = import(filePath)
        .then(event => event.default)
        .then(event => {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            }
            else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        })
        .catch(err => console.warn(`Failed to load command at ${filePath}: ${err}`));
    promises_events.push(promise);
}
Promise.all(promises_events).then(() => console.log(`Loaded ${eventFiles.length} events.`));

// Log in to Discord
client.login(config.discord_token);

// Export commands
export { commands_list };
