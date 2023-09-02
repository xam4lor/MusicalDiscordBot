import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import config from "./config.json" assert { type: "json" };

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Declare commands collection
client.commands = new Collection();
const foldersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const promises_commands = [];
for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = "file://" + path.join(commandsPath, file).replace(/\\/g, '//');
        promises_commands.push(import(filePath)
            .then(command => command.default)
            .then(command => {
                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                }
                else {
                    console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            })
            .catch(err => console.warn(`Failed to load command at ${filePath}: ${err}`)));
    }
}
Promise.all(promises_commands).then(() => console.log(`Loaded ${client.commands.size} commands.`));

// Declare events collection
const eventsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
const promises_events = [];
for (const file of eventFiles) {
    const filePath = "file://" + path.join(eventsPath, file).replace(/\\/g, '//');
    promises_events.push(import(filePath)
        .then(event => event.default)
        .then(event => {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            }
            else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        })
        .catch(err => console.warn(`Failed to load command at ${filePath}: ${err}`)));
}
Promise.all(promises_events).then(() => console.log(`Loaded ${eventFiles.length} events.`));

// Log in to Discord
client.login(config.discord_token);
