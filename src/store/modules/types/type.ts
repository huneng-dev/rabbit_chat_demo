export interface Message {
    type: string,
    time: string,
    title: string
    ip: string,
    message: string
}

export interface User{
    token: string
}