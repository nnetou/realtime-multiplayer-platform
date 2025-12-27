const users = new Map()
export const addUser = (socket, user) => {
    users.set(socket.id, user)
}
export const removeUser = (socketID) => {
    const userToDelete = { ...users.get(socketID) }
    users.delete(socketID)
    return userToDelete
}
export const getUser = (socketID) => {
    return users.get(socketID)
}
export const getUserByID = (userID) => {
    for (let [socketID, user] of users.entries()) {
        if (user.id == userID) {
            return {
                user,
                socketID,
            }
        }
    }
    return null
}
export const getUserCount = () => {
    return users.size
}

export const handleConnectionEvents = (io, socket) => {
    socket.on("join", (user) => {
        addUser(socket, user)
        console.log(`[Connection] User ${user.name} has joined the server`)
        console.log(`[Connection] ${getUserCount()} users online`)
        io.emit("player-joined", {
            socketID: socket.id,
            userID: user.id,
            userName: user.name,
        })
    })
    socket.on("leave", () => {
        const user = removeUser(socket.id)
        console.log(`[Connection] User ${user.name} has left the server`)
        console.log(`[Connection] ${getUserCount()} users online`)
    })
    socket.on("disconnect", () => {
        console.log("Connection Lost:", socket.id)
        const user = removeUser(socket.id)
        console.log(`[Connection] ${getUserCount()} users online`)
    })
}
