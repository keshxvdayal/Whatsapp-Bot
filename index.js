const { hidePrivateData } = require('./utils')
const makeWASocket = require('@whiskeysockets/baileys').default
const {
    DisconnectReason,
    useMultiFileAuthState

} = require('@whiskeysockets/baileys')

const store = {};
const getMessage = key => {
    const { id } = key
    if (store[id]) return store[id].message;
}

async function WhatsappBot() {

    // For Authentication Purposes
    const { state, saveCreds } = await useMultiFileAuthState("auth")

    // Creating a Socket
    const Sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        getMessage // This message is taking to long to receive cause u have not supplied this get msg function, to retrive sending the msgs if there is some issue

    })

    // GETTING TEXT MESSAGE FROM BOT
    const getText = message => {
        try {
            return (
                message.conversation || message.extendedTextMessage.text
            );
        }
        catch {
            return " ";
        }
    }

    const sendMessage = async (jid, content, ...args) => {
        try {
            const sent = await Sock.sendMessage(jid, content, ...args);
            store[sent.key.id] = sent;
        }
        catch (err) {
            console.log("Error Sending msg: ", err);
        }
    }

    const handleMirror = async (msg) => {
        const { key, message } = msg;
        const text = getText(message);

        const prefix = "@jarvis";
        if (!text.startsWith(prefix)) return;

        const reply = text.slice(prefix.length);

        sendMessage(key.remoteJid, { text: reply }, {quoted: msg})
    }

    const handleAll = async (msg) => {
        const {key, message} = msg;
        const text = getText(message)

        if(!text.toLowerCase().includes('@all')) return

        // 1. get all group members
        // 2. tag them and reply

        const group = await Sock.groupMetadata(key.remoteJid);
        const members = group.participants;

        const mentions = [];
        const items = [];

        members.forEach(({id, admin}) => {
            mentions.push(id);
            items.push(`@${id.slice(0, 12)} ${admin ? "🥰": " "}`)
            // console.log('id', hidePrivateData(id))
        }
    )
    sendMessage(
        key.remoteJid, 
        {text: "[all] " + items.join(", "),
        mentions
    }, {quoted: msg})

    }

    Sock.ev.process(async events => {
        if (events['connection.update']) {
            const { connection, lastDisconnect } = events['connection.update']
            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    WhatsappBot();
                } else {
                    console.log("Disconnected because you logged out");
                }
            }
        }

        if (events['creds.update']) {
            await saveCreds();
        }

        if (events["messages.upsert"]) {
            const { messages } = events["messages.upsert"];
            messages.forEach(msg => {
                if (!msg.message) return;
                //MIRROR COMMAND for example - !mirror Hello
                // HELLO 
                // console.log(hidePrivateData(message))
                handleMirror(msg);
                handleAll(msg);
            })
        }
    })
}


WhatsappBot()

// YOUR SOCKET CONNECTION IS READY


