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
        if (!user) {
            console.error(`[Connection] Received a 'join' event with a null user for socket ${socket.id}. Ignoring.`);
            return;
        }
        addUser(socket.id, user)

        console.log(`[Connection] User ${user.name ? user.name : user.nickname} has joined the server`)
        console.log(`[Connection] ${getUserCount()} users online`)
        socket.user = user;
        console.log(`[Connection] Associated user ${socket.user.name} with socket ${socket.id}`);
        socket.join(`user-${user.id}`);
        console.log(`[Connection] Socket ${socket.id} joined room 'user-${user.id}'`);
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
