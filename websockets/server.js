import { Server } from "socket.io";

export function serverStart(port) {
    const io = new Server(port, {
        cors: {
            origin: "*",
        }
    });

    io.on("connection", (socket) => {
        console.log("Cliente conectado:", socket.id);
    });

}