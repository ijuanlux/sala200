import express from 'express';
import http from 'http';
//const https = require('https');
import path from 'node:path';
import killable from 'killable';
import Twilio from 'twilio';
import { Server } from "socket.io";
const __dirname = path.resolve();
import config from './config.json' assert { type: 'json' };
if (process.env.NP_PASSWORD) {
    config = {
        "passwordforserver" : process.env.NP_PASSWORD
    }
}
import Room from './room.js'
let nofusers = 0;

let window;
let server;
/** @type {Room[]} */
global.rooms = [];
let mainserver = true;
let cachedToken = null;
let getNewToken;

if (config.TWILIO_ACCOUNT_SID) {
    const twilio = Twilio(config.TWILIO_ACCOUNT_SID || "", config.TWILIO_AUTH_TOKEN || "");
    getNewToken = function() {
        twilio.tokens.create({}, function(err, token) {
            if (!err && token) {
                cachedToken = token;
            }
        });
    }
} else {
    // sin Twilio: usamos STUN públicos (suficiente en LAN y en la mayoría de conexiones)
    getNewToken = function() {
        cachedToken = { iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" }
        ] };
    }
}
// fetch token initially
getNewToken();
// refetch new token every 15 mins and save to cache
setInterval(getNewToken, 1000*60*10);


/**
 * Get the specified room, or return null if not found
 * @param {string} domain
 * @param {number} game_id
 * @param {string} sessionid
 * @return {Room} 
*/
function getRoom(domain, game_id, sessionid) {
    for (let i=0; i<global.rooms.length; i++) {
        if (global.rooms[i].id === domain + ':' + game_id + ':' + sessionid) {
            return global.rooms[i];
        }
    }
    return null;
}

if (mainserver === true) {
    makeServer(process.env.PORT);
} else if (mainserver === false) {
    makeServer(process.env.PORT, false);
}

/**
 * Check if the authorization is valid
 * @param {string} authorization 
 * @param {string} passwordforserver 
 * @returns {boolean}
 */
function checkAuth(authorization, passwordforserver) {
    if (!authorization) return false;
    const [username, password] = Buffer.from(authorization.replace('Basic ', ''), 'base64').toString().split(':')
    return username === 'admin' && password === passwordforserver;
}

/**
 * Create a server on the specified port
 * @param {number} port
 * @param {boolean} startIO
 */
function makeServer(port, startIO) {
    const app = express();
    server = http.createServer(app);
    app.use(express.urlencoded());
    app.use(express.json());
    app.get('/', (req, res) => {
        const reject = () => {
            res.setHeader('www-authenticate', 'Basic')
            res.sendStatus(401)
        }
        if (!checkAuth(req.headers.authorization, config.passwordforserver)) {
            return reject();
        }
        res.sendFile(path.join(__dirname + '/index.html'));
    });
    app.get('/img/:imageName', function(req, res) {
        const image = req.params['imageName'];
        try {
            res.sendFile(path.join(__dirname + '/img/' + image));
        } catch (err) {
            res.sendStatus(401)
        }
    });
    app.post('/startstop', (req, res) => {
        const reject = () => {
            res.setHeader('www-authenticate', 'Basic');
            res.sendStatus(401);
        }
        if (!checkAuth(req.headers.authorization, config.passwordforserver)) {
            return reject();
        }
        console.log(req.body.function);
        if (req.body.function === "stop") {
            mainserver = false;
            res.end('true');
            server.kill(() => {
                makeServer(process.env.PORT, false);
            });
        } else {
            mainserver = true;
            res.end('true');
            server.kill(function() {
                makeServer(process.env.PORT);
            });
        }
    });
    app.post('/check', (req, res) => {
        const reject = () => {
            res.setHeader('www-authenticate', 'Basic')
            res.sendStatus(401)
        }
        if (!checkAuth(req.headers.authorization, config.passwordforserver)) {
            return reject();
        }
        res.end(mainserver.toString());
    });
    app.post('/numusers', (req, res) => {
        const reject = () => {
            res.setHeader('www-authenticate', 'Basic')
            res.sendStatus(401)
        }
        if (!checkAuth(req.headers.authorization, config.passwordforserver)) {
            return reject();
        }
        res.end('{ "users": ' + nofusers + " }");
    });

    if (startIO !== false) {
        app.get('/webrtc', (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            if (!cachedToken) {
                res.end("[]");
            } else {
                res.json(cachedToken.iceServers);
            }
        });
        app.get('/list', function(req, res) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            let args = transformArgs(req.url)
            if (!args.game_id || !args.domain) {
                res.end('{}');
                return;
            }
            args.game_id = parseInt(args.game_id);
            args.coreVer = args.coreVer === undefined ? null : parseInt(args.coreVer);
            let rv = {};
            if (global.rooms.length)                        // DIAG temporal
                console.log("lista pedida:", args.domain, args.game_id,
                    "| salas:", global.rooms.map(r => r.domain + "/" + r.game_id).join(", "));
            for (let i=0; i<global.rooms.length; i++) {
                //console.log(global.rooms[i].domain, args.domain);
                //console.log(global.rooms[i].game_id, args.game_id);
                if (global.rooms[i].domain !== args.domain ||
                    global.rooms[i].game_id !== args.game_id ||
                    (args.coreVer !== null && !isNaN(args.coreVer) &&
                     !isNaN(global.rooms[i].coreVer) &&
                     global.rooms[i].coreVer !== args.coreVer)) continue;
                rv[global.rooms[i].sessionid] = {
                    owner_name: (global.rooms[i].owner.extra.player_name || global.rooms[i].owner.extra.name || '?'),
                    room_name: global.rooms[i].name,
                    country: 'US',
                    max: global.rooms[i].max,
                    current: global.rooms[i].current,
                    password: (global.rooms[i].password.trim() ? 1 : 0)
                }
            }
            res.end(JSON.stringify(rv));
        })
        // Barrido de salas fantasma: si el socket del anfitrión ya no existe, la
        // sala no debe seguir apareciendo en la lista (la gente se metía en ella
        // y se quedaba esperando a alguien que se fue hace rato).
        setInterval(() => {
            try {
                if (!global.io) return;
                for (let i = global.rooms.length - 1; i >= 0; i--) {
                    const r = global.rooms[i];
                    if (!r.ownerSid) continue;
                    if (!global.io.sockets.sockets.get(r.ownerSid)) {
                        console.log('sala fantasma barrida:', r.name);
                        global.io.to(r.id + ':palco').emit('palco-fin');
                        global.rooms.splice(i, 1);
                    }
                }
            } catch (e) {}
        }, 15000);

        const io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            // El savestate inicial de SNES supera el 1MB por defecto y socket.io
            // desconectaba al anfitrion EN SILENCIO al enviarlo. De ahi las salas fantasma.
            maxHttpBufferSize: 20e6,
            // un salto al wasap no debe matar el socket: 2 min de margen sin pong
            pingTimeout: 120000
        });
        global.io = io;
        io.on('connection', (socket) => {
            nofusers = io.engine.clientsCount;
            let url = socket.handshake.url;
            let args = transformArgs(url);
            let room = null;
            // Una conexion sin "extra" (un sondeo, un reconecte a medias) reventaba
            // JSON.parse y con el se iba el proceso entero, tirando la partida de todos.
            // Puente entre versiones: si la URL no trae los datos, los tomamos del mensaje.
            const dato = (delMensaje, deLaUrl) => (delMensaje !== undefined && delMensaje !== null) ? delMensaje : deLaUrl;
            let extraData = {};
            let miId = undefined, miSesion = undefined;   // identidad real de este socket
            if (args.extra !== undefined) {
                try { extraData = JSON.parse(args.extra) || {}; }
                catch (e) { console.warn('extra ilegible en la conexion:', e.message); extraData = {}; }
            }

            function disconnect(motivo) {
                nofusers = io.engine.clientsCount;
                try {
                    if (room === null) return;
                    console.log('desconexion de', (extraData && extraData.player_name) || miId || '?',
                                'de la sala', room.name, motivo ? '(' + motivo + ')' : '');
                    io.to(room.id).emit('user-disconnected', miId);
                    setTimeout(() => { try { avisarJugadores(io, room); } catch (e) {} }, 50);
                    for (let i=0; i<room.users.length; i++) {
                        if (room.users[i].sid === socket.id || room.users[i].userid === miId) {
                            room.users.splice(i, 1);
                            break;
                        }
                    }
                    if (!room.users[0] || room.ownerSid === socket.id) {
                        for (let i=0; i<global.rooms.length; i++) {
                            if (global.rooms[i].id === room.id) {
                                global.rooms.splice(i, 1);
                            }
                        }
                    } else if (room.owner.userid === miId) {
                        // Si se va el anfitrion la sala muere con el: el traspaso de dueño
                        // dejaba salas zombi (el cliente ni se entera de que ahora es dueño).
                        console.log('el anfitrion se fue: cerrando la sala', room.name);
                        io.to(room.id + ':palco').emit('palco-fin');
                        for (let i=0; i<global.rooms.length; i++) {
                            if (global.rooms[i].id === room.id) {
                                global.rooms.splice(i, 1);
                            }
                        }
                        for (const u of room.users.slice()) {
                            try { u.socket.disconnect(true); } catch (e) {}
                        }
                    } else {
                        room.current = room.users.length;
                    }
                    socket.leave(room.id);
                    room = null;
                } catch (e) {
                    console.warn(e);
                }
            }
            socket.on('disconnect', disconnect);


            socket.on('close-entire-session', function(cb) {
                io.to(room.id).emit('closed-entire-session', miSesion, extraData);
                if (typeof cb === 'function') cb(true);
            })
            socket.on('open-room', function(data, cb) {
                const ses = dato(data.extra && data.extra.sessionid, args.sessionid);
                const uid = dato(data.extra && data.extra.userid, args.userid);
                const maxi = dato(data.maxPlayers, args.maxParticipantsAllowed) || 2;
                const cver = dato(data.extra && data.extra.coreVer, args.coreVer);
                miId = uid; miSesion = ses;
                room = new Room(data.extra.domain, data.extra.game_id, ses, data.extra.room_name, maxi, 1, (data.password || '').trim(), uid, socket, data.extra, cver);
                console.log('sala abierta:', data.extra.room_name, 'de', data.extra.player_name, '| id', ses,
                            '| domain', room.domain, '| game_id', room.game_id);
                room.ownerSid = socket.id;          // identidad que nunca falla
                global.rooms.push(room);
                extraData = data.extra;

                socket.emit('extra-data-updated', null, extraData);
                socket.emit('extra-data-updated', uid, extraData);

                socket.join(room.id);
                cb(null, mapaJugadores(room));      // null = sin error (asi lo espera el cliente)
                avisarJugadores(io, room);
            })


            socket.on('check-presence', function(roomid, cb) {
                cb(getRoom(extraData.domain, extraData.game_id, roomid)!==null, roomid, null);
            })
            socket.on('join-room', function(data, cb) {

                const sesUnir = dato(data.sessionid, data.extra && data.extra.sessionid);
                miId = dato(data.extra && data.extra.userid, args.userid);
                miSesion = sesUnir;
                extraData = data.extra || extraData;
                room = getRoom(data.extra.domain, data.extra.game_id, sesUnir);
                console.log('intento de union a', sesUnir, 'por', data.extra && data.extra.player_name, '->', room ? 'existe' : 'no existe');
                if (room === null) {
                    cb('USERID_NOT_AVAILABLE');
                    return;
                }
                if (room.current >= room.max) {
                    cb('ROOM_FULL');
                    return;
                }
                if (room.hasPassword && !room.checkPassword(data.password)) {
                    cb('INVALID_PASSWORD');
                    return;
                }

                room.users.forEach(user => {
                    socket.to(room.id).emit("netplay", {
                        "remoteUserId": user.userid,
                        "message": {
                            "newParticipationRequest": true,
                            "isOneWay": false,
                            "isDataOnly": true,
                            "localPeerSdpConstraints": {
                                "OfferToReceiveAudio": false,
                                "OfferToReceiveVideo": false
                            },
                            "remotePeerSdpConstraints": {
                                "OfferToReceiveAudio": false,
                                "OfferToReceiveVideo": false
                            }
                        },
                        "sender": miId,
                        "extra": extraData
                    })
                })

                room.addUser({
                    sid: socket.id,
                    userid: miId,
                    socket,
                    extra: data.extra
                });

                socket.to(room.id).emit('user-connected', miId);

                socket.join(room.id);

                cb(null, mapaJugadores(room));      // null = sin error
                avisarJugadores(io, room);
                console.log('sala', room.name, 'ahora con', room.users.length, 'jugadores');
            })
            // El cliente de EmulatorJS manda las jugadas y el estado de la partida por aqui.
            // Este servidor no lo reenviaba: los dos se veian en la sala pero no podian jugar.
            let nJugadas = 0;
            socket.on('data-message', function(msg) {
                if (room === null) return;
                socket.to(room.id).emit('data-message', msg);
                // copia para el palco, con el remitente etiquetado (own = anfitrion)
                io.to(room.id + ':palco').emit('palco-msg', {
                    own: !!(room.owner && room.owner.extra &&
                            room.owner.extra.player_name === (extraData && extraData.player_name)),
                    m: msg
                });
                if (++nJugadas <= 3 || nJugadas % 200 === 0)
                    console.log('jugada retransmitida #' + nJugadas + ' de ' + (extraData.player_name || '?') +
                                ' [' + Object.keys(msg || {}).join(',') + ']');
            })

            // ---- palco: espectadores que ven la partida sin jugar ----
            socket.on('espiar', function(ses, cb) {
                const r = global.rooms.find(x => x.sessionid === ses);
                if (!r) { if (typeof cb === 'function') cb(false); return; }
                socket.join(r.id + ':palco');
                socket._palco = r.id;
                console.log('espectador en el palco de', r.name);
                if (typeof cb === 'function') cb(true);
            });
            socket.on('palco-resync', function() {
                // el espectador necesita un savestate: pide una sincronizacion a la sala
                if (socket._palco) io.to(socket._palco).emit('data-message', { s2: 'resync' });
            });

            socket.on('set-password', function(password, cb) {
                if (room === null) {
                    if (typeof cb === 'function') cb(false);
                    return;
                }
                if (typeof password === 'string' && password.trim()) {
                    room.password = password.trim();
                    room.hasPassword = true;
                } else {
                    room.password = '';
                    room.hasPassword = false;
                }
                if (typeof cb === 'function') cb(true);
            });
            socket.on('changed-uuid', function(newUid, cb) {
                if (room === null) {
                    if (typeof cb === 'function') cb(false);
                    return;
                }
                for (let i=0; i<room.users.length; i++) {
                    if (room.users[i].userid === miId) {
                        room.users[i].userid = newUid;
                        break;
                    }
                }
                if (typeof cb === 'function') cb(true);
            });
            socket.on('disconnect-with', function(userid, cb) {
                //idk
                if (typeof cb === 'function') cb(true);
            })
            socket.on('netplay', function(msg) {
                if (room === null) return;
                const outMsg = JSON.parse(JSON.stringify(msg));
                outMsg.extra = extraData;
                socket.to(room.id).emit('netplay', outMsg);
                if (msg && msg.message && msg.message.userLeft === true) disconnect();
            })
            socket.on('extra-data-updated', function(msg) {
                if (room === null) return;
                let outMsg = JSON.parse(JSON.stringify(msg))
                outMsg.country = 'US';
                extraData = outMsg;

                for (let i=0; i<room.users.length; i++) {
                    if (room.users[i].userid === miId) {
                        room.users[i].extra = extraData;
                        break;
                    }
                }

                io.to(room.id).emit('extra-data-updated', miId, outMsg);
            })
            socket.on('get-remote-user-extra-data', function(id) {
                if (room === null) return;
                for (let i=0; i<room.users.length; i++) {
                    if (room.users[i].userid === id) {
                        socket.emit('extra-data-updated', room.users[i].extra);
                    }
                }
            })
        });
    }


    server.listen(port || 3000, '0.0.0.0', () => {
        console.log('The Main Server is now running on port :' + (port || 3000));
    });
    killable(server);
}

/**
 * Get the arguments from a url
 * @param {string} url 
 * @return {object}
 */
function mapaJugadores(room) {
    const m = {};
    if (!room) return m;
    (room.users || []).forEach(u => { if (u && u.userid) m[u.userid] = u.extra || {}; });
    return m;
}
function avisarJugadores(io, room) {
    if (!room) return;
    io.to(room.id).emit('users-updated', mapaJugadores(room));
}

function transformArgs(url) {
    var args = {}
    var idx = url.indexOf('?')
    if (idx != -1) {
        var s = url.slice(idx + 1)
        var parts = s.split('&')
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i]
            var idx2 = p.indexOf('=')
            args[decodeURIComponent(p.slice(0, idx2))] = decodeURIComponent(p.slice(idx2 + 1, s.length))
        }
    }
    return args
}

// red de seguridad: mejor un error en el registro que dejar a todos sin partida
process.on('uncaughtException', (e) => console.error('[netplay] error no controlado:', e && e.message));
process.on('unhandledRejection', (e) => console.error('[netplay] promesa rechazada:', e && e.message));
